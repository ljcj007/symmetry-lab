import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {bindZnOSatellite,znOSatelliteGeometry}=await import(prefix+'zno-satellite-ui.js');
const {validateStructureDiffractionHandoff}=await import(prefix+'structure-diffraction-handoff.js');
const fixturePath='data/examples/zno-mode-quadrature.json';
const bytes=readFileSync(new URL(prefix+fixturePath,import.meta.url));
const digest=createHash('sha256').update(bytes).digest('hex');
const data=JSON.parse(bytes);
assert.equal(bytes.length,34241);
assert.equal(digest,'e2186db63054497d22d25f2203739d9cf195733978505afe45bd7294ccbfcacc');
const near=(a,b,atol=1e-9)=>assert.ok(Math.abs(a-b)<atol,a+' ≠ '+b);

const expectedGeometry={
 parent:znOSatelliteGeometry(data,'parent'),
 full:znOSatelliteGeometry(data,'full'),
 half:znOSatelliteGeometry(data,'half'),
};
const {parent,full,half}=expectedGeometry;
assert.deepEqual(parent.cell,data.parent.lattice);
assert.deepEqual(full.cell,parent.cell);
assert.deepEqual(half.cell,parent.cell);
assert.deepEqual(parent.atoms.map(atom=>atom.fractional),data.parent.atoms.map(atom=>atom.coordinates));
assert.deepEqual(full.atoms.map(atom=>atom.fractional),data.distorted.atoms.map(atom=>atom.coordinates));
const shortest=x=>x-Math.round(x);
for(const [i,atom] of half.atoms.entries()){
 assert.equal(atom.species,parent.atoms[i].species);
 assert.ok(atom.fractional.every(value=>value>=0&&value<1));
 atom.fractional.forEach((value,axis)=>{
  const original=parent.atoms[i].fractional[axis];
  near(shortest(value-original),shortest(full.atoms[i].fractional[axis]-original)/2);
 });
}
const boundary=structuredClone(data);
boundary.parent.atoms[0].coordinates=[.98,.02,.98];
boundary.distorted.atoms[0].coordinates=[.02,.98,.02];
znOSatelliteGeometry(boundary,'half').atoms[0].fractional.forEach(value=>near(shortest(value),0));
assert.throws(()=>znOSatelliteGeometry(data,'unknown'),RangeError);

// Independently sum equal-weight phases at the default supercell H.
function intensity({atoms}){
 const phase=atoms.map(({fractional:[x,,z]})=>2*Math.PI*(x+z));
 const real=phase.reduce((sum,p)=>sum+Math.cos(p),0);
 const imag=phase.reduce((sum,p)=>sum+Math.sin(p),0);
 return real*real+imag*imag;
}
near(intensity(parent),0);
near(intensity(full),.5285224161470846);
near(intensity(half),.1322078912019354);
near(intensity(full)/intensity(half),4,.005);

const requests=[],presets=[],page=new Container(),state={};
let mode='tamper',current=true,accept=true;
globalThis.document={activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.fetch=(url,{signal})=>{
 const address=new URL(url);
 assert.ok(address.pathname.endsWith('/'+fixturePath));
 assert.equal(address.searchParams.get('v'),'20261120-zno-satellite1');
 const request={signal};
 requests.push(request);
 if(mode==='pending')return new Promise(resolve=>{request.finish=()=>resolve(new Response(bytes));});
 if(mode==='unavailable')return Promise.resolve(new Response(null,{status:503}));
 const candidate=Uint8Array.from(bytes);
 if(mode==='tamper')candidate[candidate.length-2]^=1;
 return Promise.resolve(new Response(candidate));
};
const mount=(stored=state)=>bindZnOSatellite({root:page,isCurrent:()=>current,state:stored,onLoad:value=>{
 if(!accept)return false;
 presets.push(value);
 return true;
}});
const $=id=>page.querySelector('#zsat-'+id);
function predict(id,v){
 const field=$('predict-'+id);
 field.value=v;
 field.onchange();
}
let cleanup=mount();
assert.match(page.innerHTML,english?/Predict first/:/先预测/);
assert.match(page.innerHTML,/<var>H<\/var> = \(1, 0, 1\)/);
assert.match(page.innerHTML,/<var>f<\/var><sub>j<\/sub> = 1/);
assert.equal(requests.length,0);
assert.equal(page.querySelector('a').getAttribute('href'),'docs/structure-dynamics.md#zno-satellite');
predict('parent','zero');
predict('half','quarter');
assert.equal(requests.length,0,'Predicting never loads the data');
await $('parent').onclick();
assert.equal($('error').hidden,false);
assert.match($('error').textContent,english?/could not be read or verified/:/读取或核验/);
assert.equal(presets.length,0);
mode='unavailable';
await $('full').onclick();
assert.equal($('error').hidden,false);
assert.equal(presets.length,0);

mode='pending';
const canceled=$('half').onclick(),request=requests.at(-1);
assert.ok($('parent').disabled&&$('full').disabled&&$('half').disabled);
assert.equal($('cancel').hidden,false);
$('cancel').onclick();
assert.ok(request.signal.aborted);
request.finish();
await canceled;
assert.equal(presets.length,0);
assert.equal($('predict-parent').value,'zero');
assert.equal($('predict-half').value,'quarter');

mode='ok';
accept=false;
await $('parent').onclick();
assert.equal(presets.length,0);
assert.match($('error').textContent,english?/could not accept the preset/:/无法接收预设/);
const fetches=requests.length;
accept=true;
for(const key of ['parent','full','half']){
 await $(key).onclick();
 const enabled=presets.at(-1);
 assert.equal(enabled.stateKey,key);
 assert.deepEqual(enabled.hkl,[1,0,1]);
 assert.deepEqual(enabled.scatteringFactors,{Zn:1,O:1});
 assert.deepEqual(enabled.handoff,validateStructureDiffractionHandoff(enabled.handoff));
 assert.deepEqual(enabled.handoff.custom,expectedGeometry[key]);
 assert.deepEqual(enabled.handoff.source,{format:'cell',filename:'zno-mode-quadrature.json',sha256:digest,atomCount:64});
 assert.deepEqual(enabled.sourceEvidence,{
  kind:'zno-satellite',datasetSHA256:digest,stateKey:key,fractionOfFrozenDisplacement:{parent:0,full:1,half:.5}[key],
  source:data.source,settings:data.settings,
 });
 enabled.sourceEvidence.settings.phase=1234;
 assert.equal($('error').hidden,true);
}
assert.equal(requests.length,fetches,'All choices share the same verified bytes in this view');
assert.equal(presets.length,3);
assert.match($('status').textContent,/ZnO 示例数据已载入|ZnO example data are loaded/);
assert.doesNotMatch($('status').textContent,/SHA-?256|[0-9a-f]{64}/i);
cleanup();
cleanup=mount();
assert.equal(requests.length,fetches);
assert.equal($('predict-parent').value,'zero');
assert.equal($('predict-half').value,'quarter');
if(english)assert.doesNotMatch(page.innerHTML,/[\u3400-\u9fff]/u);
cleanup();

cleanup=mount({});
mode='pending';
const late=$('parent').onclick(),stale=requests.at(-1);
current=false;
cleanup();
page.innerHTML='<p>Other view</p>';
assert.ok(stale.signal.aborted);
stale.finish();
await late;
assert.equal(presets.length,3);
assert.equal(page.innerHTML,'<p>Other view</p>');
console.log(`ZnO diffraction satellite (${english?'English':'Chinese'}): actual pinned geometry, periodic half-amplitude interpolation, default equal weights, optional predictions, verification, and stale guards passed.`);
