import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const asset=file=>readFileSync(new URL(prefix+file,import.meta.url));
const sample=asset('data/examples/zno-mode-quadrature.json'),data=JSON.parse(sample);
const fixture=JSON.parse(readFileSync(new URL('fixtures/structure-dynamics.json',import.meta.url))).diffraction220;
const {parseClassroomRoute}=await import(prefix+'classroom-ui.js');
const {renderStructureDynamicsView,getStructureDynamicsResult}=await import(prefix+'structure-dynamics-ui.js');
const moduleURL=prefix+'zno-satellite-ui.js?v=20261120-zno-satellite1';
Object.defineProperty(Element.prototype,'open',{
 configurable:true,get(){return Object.hasOwn(this.attributes,'open');},
 set(value){if(value)this.attributes.open='';else delete this.attributes.open;}
});
globalThis.document={compatMode:'CSS1Compat'};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Optional diffraction may not record mastery')};
const requests=[],runs=[],downloads=[];
globalThis.fetch=async url=>{
 const name=String(url).split('?')[0].split('/').at(-1);
 if(name==='structure-dynamics.json')return {ok:true,json:async()=>JSON.parse(asset('data/'+name))};
 assert.equal(name,'zno-mode-quadrature.json');
 requests.push(url);
 return new Response(sample);
};
const page=new Container(),$=selector=>page.querySelector(selector);
const result=()=>getStructureDynamicsResult();
const submit=()=>$('form').onsubmit({preventDefault(){}});
const stop=await renderStructureDynamicsView({container:page,
 selection:parseClassroomRoute('compute/diffraction?preset=zno-satellite'),
 run:async(action,input)=>{runs.push({action,input});return structuredClone(fixture);},
 download:text=>downloads.push(JSON.parse(text))});
await import(moduleURL);
await flush();
assert.equal($('[data-dyn-zno-satellite]').open,true);
assert.equal($('#dyn-preset').value,'silicon');
assert.equal(requests.length,0,'Direct route may only open the explanation');
const load=async state=>{await $('#zsat-'+state).onclick();await flush();};

for(const state of ['parent','full','half']){
 const previous=runs.length;
 await load(state);
 assert.equal(runs.length,previous,'Only the diffraction form can run Python');
 assert.equal($('#dyn-preset').value,'custom');
 assert.equal($('#dyn-material').value,'');
 assert.equal($('#dyn-hkl').value,'[1,0,1]');
 assert.deepEqual(JSON.parse($('#dyn-factors').value),{Zn:1,O:1});
 assert.match($('#dyn-diffraction-source').textContent,english?/verified ZnO supercell/:/核验后的 ZnO 超胞/);
 assert.deepEqual(JSON.parse($('#dyn-custom').value).cell,data.parent.lattice);
 assert.equal(JSON.parse($('#dyn-custom').value).atoms.length,64);
 await submit();
 assert.equal(runs.at(-1).action,'diffraction');
 assert.equal(Object.hasOwn(runs.at(-1).input,'sourceEvidence'),false);
 assert.equal(Object.hasOwn(runs.at(-1).input,'latticeConstant'),false);
 assert.equal(result().sourceEvidence.stateKey,state);
 assert.equal(result().sourceEvidence.datasetSHA256,result().diffractionSource.sha256);
 $('#dyn-download').onclick();
 assert.deepEqual(downloads.at(-1).sourceEvidence,result().sourceEvidence);
}
assert.equal(requests.length,1,'The three choices reuse the same checked source bytes');
const edited=JSON.parse($('#dyn-custom').value);
edited.atoms[0].fractional[0]+=1e-5;
const geometry=$('#dyn-custom');
geometry.value=JSON.stringify(edited);
$('form').oninput({target:geometry});
assert.equal($('#dyn-diffraction-source').hidden,true);
await submit();
assert.equal(Object.hasOwn(result(),'sourceEvidence'),false);
stop();
assert.equal($('[data-dyn-zno-satellite]').ontoggle,null);

console.log(`ZnO satellite host (${english?'English':'Chinese'}): deep link, three inputs, manual worker entry and attributable results passed.`);
