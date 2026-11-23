import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const live=process.argv.includes('--live');
const prefix=english?'../dist/en/':'../dist/';
const {GRAPHENE_REFERENCE:{hr,settings}}=await import(prefix+'wannier-graphene-source.js');
const {renderResearchView,setResearchInput,getResearchResult}=await import(prefix+'research-ui.js?graphene-test');
const arrayBuffer=bytes=>Uint8Array.from(bytes).buffer;
let hrBytes,settingsBytes;
if(live){
 [hrBytes,settingsBytes]=await Promise.all([hr,settings].map(async file=>{
  const response=await fetch(file.rawURL,{signal:AbortSignal.timeout(20_000)});
  assert.ok(response.ok);
  return new Uint8Array(await response.arrayBuffer());
 }));
}else{
 // Invented fixture data and a digest double for offline UI behavior.
 // The original files and SHA-256 checks are covered by the source tests.
 const inputSettings=`&TB_FILE
Hrfile = 'Graphene_hr.dat'
/
&SYSTEM
SOC=0
E_FERMI = 0.5
/
&PARAMETERS
Nk1 = 101
/
LATTICE
Angstrom
3 0 0
0 4 0
0 0 20
ATOM_POSITIONS
KPATH_BULK
3
M .5 0 0 K .3 .2 0
K .3 .2 0 G 0 0 0
G 0 0 0 M .5 0 0
`;
 hrBytes=new Uint8Array(hr.bytes).fill(97);
 settingsBytes=new TextEncoder().encode(inputSettings.padEnd(settings.bytes,' '));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const fixtureHashes=new Map([[hash(hrBytes),hr.sha256],[hash(settingsBytes),settings.sha256]]);
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{async digest(algorithm,bytes){
  assert.equal(algorithm,'SHA-256');
  const reference=fixtureHashes.get(hash(bytes));
  return reference?arrayBuffer(Buffer.from(reference,'hex')):webcrypto.subtle.digest(algorithm,bytes);
 }}}});
}

const reference=new Map([[hr.rawURL,hrBytes],[settings.rawURL,settingsBytes]]);
const runs=[],downloads=[],requests=[],toasts=[];
const container=new Container(),controller={current:true},$=id=>container.querySelector('#'+id);
container.dataset={};
const userDraft={action:'bands',lattice:[[7,0,0],[0,8,0],[0,0,9]],note:'Retain the editable draft'};
const settledBands=input=>({
 model:{orbital_count:2,hoppings:[]},
 bands:{
  distance:[0,1,2,3],
  kpoints:input.path.map(point=>point.k),
  ticks:input.path.map((point,index)=>({index,label:point.label})),
  energies:[[-3.56,.428],[-1.2621987299,-1.2592532701],[-8.31,10.16],[-3.56,.428]]
 }
});
let fetchMode='resolve',wrongK=false;
globalThis.fetch=(url,options)=>{
 requests.push({url,signal:options?.signal});
 if(!reference.has(url))return Promise.resolve(new Response(JSON.stringify({action:'model',fromLegacy:url})));
 if(fetchMode==='pending')return new Promise(resolve=>{requests.at(-1).finish=()=>resolve(new Response(reference.get(url)));});
 if(fetchMode==='unavailable'&&url===settings.rawURL)return Promise.resolve(new Response(null,{status:404}));
 return Promise.resolve(new Response(reference.get(url)));
};
function mount(view='magnetictb'){
 return renderResearchView(view,{container,isCurrent:()=>controller.current,toast:value=>toasts.push(value),
  download:(...values)=>downloads.push(values),context:{mode:'sg',group:{number:19,operations:[]}},
  run:async(tool,input)=>{
   runs.push({tool,input});
   if(input.path?.length!==4)return {manualInput:true};
   const result=settledBands(input);
   result.sourceIdentity={sha256:hr.sha256,hashBasis:'file-bytes'};
   result.hasHessian=true;
   result.fingerprint=[1,0,1];
   if(wrongK)result.bands.kpoints[1]=[.5,.5,0];
   return result;
  }
 });
}
function edit(payload){
 const el=$('research-json');
 el.value=JSON.stringify(payload);
 el.oninput({target:el});
}
const input=()=>JSON.parse($('research-json').value);
const load=()=>$('graphene-download-pair').onclick();
function chooseFiles(hrContent=hrBytes,settingsContent=settingsBytes){
 const hrInput=$('graphene-local-hr'),settingsInput=$('graphene-local-settings');
 hrInput.files=[new File([hrContent],hr.fileName)];
 hrInput.onchange();
 settingsInput.files=[new File([settingsContent],settings.fileName)];
 settingsInput.onchange();
}

setResearchInput('magnetictb',userDraft);
mount();
assert.equal(requests.length,0);
assert.equal(runs.length,0);
assert.equal($('graphene-source').getAttribute('open'),null);
for(const file of [hr,settings]){
 const link=$('graphene-source').querySelectorAll('a').find(link=>link.getAttribute('href')===file.rawURL);
 assert.equal(link?.querySelector('code')?.textContent,file.fileName,'Display the literal filename outside math enhancement.');
}
assert.deepEqual(input(),userDraft);
assert.ok($('tb-hr-file'));

fetchMode='unavailable';
await load();
assert.deepEqual(input(),userDraft,'One failed file cannot replace anything in the current draft');
assert.equal($('graphene-source-error').hidden,false);
assert.match($('graphene-source-error').textContent,english?/Could not verify/:/无法核验/);
assert.equal(runs.length,0);

fetchMode='pending';
const canceled=load(),pending=requests.slice(-2);
assert.deepEqual(pending.map(item=>item.url),[hr.rawURL,settings.rawURL]);
assert.equal($('graphene-cancel').hidden,false);
$('graphene-cancel').onclick();
assert.ok(pending.every(request=>request.signal.aborted));
pending.forEach(request=>request.finish());
await canceled;
assert.deepEqual(input(),userDraft);

const beforeEdit=load(),editRequests=requests.slice(-2);
const newerDraft={...userDraft,moreRecent:true};
edit(newerDraft);
editRequests.forEach(request=>request.finish());
await beforeEdit;
assert.ok(editRequests.every(request=>request.signal.aborted));
assert.deepEqual(input(),newerDraft);

const staleSameView=load(),sameViewRequests=requests.slice(-2);
mount();
sameViewRequests.forEach(request=>request.finish());
await staleSameView;
assert.ok(sameViewRequests.every(request=>request.signal.aborted));
assert.deepEqual(input(),newerDraft);

const dispose=mount();
const staleLeave=load(),leaveRequests=requests.slice(-2);
controller.current=false;
dispose();
container.innerHTML='<p>Different view</p>';
leaveRequests.forEach(request=>request.finish());
await staleLeave;
assert.ok(leaveRequests.every(request=>request.signal.aborted));
assert.equal(container.innerHTML,'<p>Different view</p>');
controller.current=true;
mount();

assert.equal($('graphene-verify-local').disabled,true);
const modified=hrBytes.slice();
modified[0]^=1;
chooseFiles(modified,settingsBytes);
assert.equal($('graphene-verify-local').disabled,false);
const requestsBeforeLocal=requests.length;
await $('graphene-verify-local').onclick();
assert.equal($('graphene-source-error').hidden,false);
assert.deepEqual(input(),newerDraft);

chooseFiles();
await $('graphene-verify-local').onclick();
const verified=input();
assert.equal(requests.length,requestsBeforeLocal);
assert.equal(runs.length,0);
assert.equal(verified.action,'hr_import');
assert.equal(verified.hr_text,new TextDecoder().decode(hrBytes));
assert.equal(verified.points_per_segment,101);
assert.deepEqual(verified.path.map(point=>point.label),['M','K','Γ','M']);
assert.deepEqual(verified.path[1].k,live?[.33333333,.33333333,0]:[.3,.2,0]);
assert.match($('graphene-source-status').textContent,english?/Loaded the original lattice and band path/:/已载入原始晶格和能带路径/);
assert.doesNotMatch($('graphene-source-status').textContent,/SHA-?256|[0-9a-f]{64}/i);
assert.equal($('graphene-k-diagnostic'),null);

await $('run-research').onclick();
assert.deepEqual(runs.at(-1),{tool:'magnetictb',input:verified});
assert.match($('graphene-k-diagnostic').textContent,/2\.94546 meV/);
assert.match($('graphene-k-diagnostic').textContent,/-1\.26219873 eV/);
assert.match(container.querySelector('.band-chart').textContent,english?/Energy \/ eV/:/能量 \/ eV/);
assert.equal($('graphene-k-diagnostic').querySelectorAll('sub').length,4);
assert.match($('graphene-k-diagnostic').querySelector('a').getAttribute('href'),/#classroom\/crystal\?module=bands/);
assert.equal(getResearchResult('magnetictb').model.orbital_count,2);
assert.doesNotMatch(container.querySelector('.json-output').innerHTML,/sha[-_]?256|[0-9a-f]{64}/i);
assert.match(container.querySelector('.json-output').innerHTML,/hasHessian/);
assert.match(container.querySelector('.json-output').innerHTML,/fingerprint/);
assert.equal(getResearchResult('magnetictb').sourceIdentity.sha256,hr.sha256);
assert.equal(container.querySelector('svg').tag,'svg');
if(english)assert.doesNotMatch(container.innerHTML,/[\u3400-\u9fff]/u);

wrongK=true;
await $('run-research').onclick();
assert.equal($('graphene-k-diagnostic'),null,'A K label alone is insufficient without the verified coordinate');
wrongK=false;

edit({...verified,points_per_segment:41});
await $('run-research').onclick();
assert.equal($('graphene-k-diagnostic'),null,'Edits retire source-specific attribution');
assert.doesNotMatch($('graphene-source-status').textContent,english?/Both originals match/:/SHA-256 已核验/);

fetchMode='resolve';
const beforeDownload=runs.length;
await load();
assert.deepEqual(input(),verified,'Remote and local byte paths yield exactly the same editable input');
assert.equal(runs.length,beforeDownload,'Remote load also waits for a manual run');

const legacyFile=new File(['generic user HR'],'demo.dat');
await $('tb-hr-file').onchange({target:{files:[legacyFile]}});
assert.deepEqual(input().path.map(point=>point.label),['Γ','X']);
assert.equal(input().hr_text,'generic user HR');
await $('load-research-example').onclick();
assert.match(input().fromLegacy,/magnetictb-graphene\.json$/);

mount('crystkit');
assert.equal($('graphene-source'),null);
assert.ok($('cryst-use-number'));

// The initial bundled demo is read automatically on a blank workbench. The
// explicit original-data load takes priority even if the demo arrives first.
const another=await import(prefix+'research-ui.js?graphene-initial-race');
let resolveDefault;
const fixtureFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>url.startsWith('examples/')
 ?new Promise(resolve=>{resolveDefault=()=>resolve(new Response(JSON.stringify({action:'model'})));})
 :fixtureFetch(url,options);
another.renderResearchView('magnetictb',{container,context:{},toast:value=>toasts.push(value)});
fetchMode='pending';
const superseding=load(),grapheneRequests=requests.slice(-2);
resolveDefault();
await new Promise(resolve=>setImmediate(resolve));
assert.equal($('research-json').value,'');
grapheneRequests.forEach(request=>request.finish());
await superseding;
assert.deepEqual(input(),verified);

console.log(`Graphene import (${english?'English':'Chinese'}, ${live?'pinned bytes':'synthetic bytes'}): manual loading and Run, local parity, stale navigation, K-point diagnosis, and existing tools passed.`);
