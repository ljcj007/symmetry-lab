import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Container, Element, flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {renderStructureView}=await import(prefix+'structure-ui.js');
const {validateStructureDiffractionHandoff}=await import(prefix+'structure-diffraction-handoff.js');
const {cases}=JSON.parse(readFileSync(new URL('./fixtures/structure-handoff.json',import.meta.url),'utf8'));
const {request,conversion}=cases['nacl-published-geometry'];
const inputCell=conversion.input_cell;
assert.equal(inputCell.atom_count,8);
assert.equal(conversion.bc_primitive.atom_count,2);
assert.notDeepEqual(inputCell.lattice,conversion.bc_primitive.lattice);

globalThis.document={compatMode:'CSS1Compat',activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 return selector.includes(',')?[...new Set(selector.split(',').flatMap(value=>queryAll.call(this,value.trim())))]:queryAll.call(this,selector);
};

const container=new Container(),calls=[],opened=[],downloads=[];
container.dataset={researchView:'structure'};
const $=id=>container.querySelector('#'+id);
const diffractionButton=()=>$('structure-open-diffraction');
let result=conversion;
const options={
 container,
 run:async(action,input)=>{
  calls.push({action,input});
  return {...structuredClone(result),k_input:input.k,symprec:input.symprec,angle_tolerance:input.angle_tolerance};
 },
 toast:()=>{},
 download:(...args)=>downloads.push(args),
 openGroup:()=>{},
 openDiffraction:handoff=>opened.push(handoff)
};
renderStructureView(options);
assert.equal(diffractionButton(),null,'The route appears after a conversion');

const name='original-nacl.vasp';
const bytes=new TextEncoder().encode(request.text);
const file=new File([bytes],name);
await $('structure-file').onchange({target:{files:[file]}});
assert.equal($('structure-text').value,request.text);

let releaseDigest;
const digestBlocked=new Promise(resolve=>{releaseDigest=resolve;});
Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{async digest(...args){
 await digestBlocked;
 return webcrypto.subtle.digest(...args);
}}}});
const activeRun=$('structure-run').onclick();
await flush();
assert.match($('structure-handoff-card').textContent,english?/Preparing the structure record/i:/整理结构记录/);
assert.doesNotMatch($('structure-handoff-card').textContent,/sha[-_]?256|fingerprint|指纹/i);
const beforeHash=diffractionButton();
assert.ok(beforeHash);
assert.equal(beforeHash.disabled,false);
assert.equal($('structure-open-group').disabled,true);
assert.equal(beforeHash.getAttribute('aria-describedby'),'structure-diffraction-scope');
assert.match(beforeHash.textContent,english?/diffraction from the input cell/:/用输入晶胞计算衍射/);
assert.match($('structure-diffraction-scope').textContent,/\(h,k,l\)/);
beforeHash.onclick();
const unbound=opened.at(-1);
assert.deepEqual(unbound.source,{format:'poscar',filename:name,sha256:'',atomCount:8});
assert.deepEqual(unbound.custom,{
 cell:inputCell.lattice,
 atoms:inputCell.species.map((species,index)=>({species,fractional:inputCell.positions[index]}))
});
assert.deepEqual(validateStructureDiffractionHandoff(unbound),unbound);
assert.equal(JSON.stringify(unbound).includes(request.text),false);
assert.equal(calls.length,1,'Opening diffraction transfers geometry, without starting another calculation');

beforeHash.focus();
releaseDigest();
await activeRun;
assert.equal(document.activeElement,diffractionButton());
assert.notEqual(diffractionButton(),beforeHash);
beforeHash.onclick();
assert.equal(opened.length,1,'A detached button cannot send a stale transfer');
diffractionButton().onclick();
assert.deepEqual(opened.at(-1).source,{...unbound.source,sha256:createHash('sha256').update(bytes).digest('hex')});
assert.equal($('structure-open-group').disabled,false);
$('structure-poscar').onclick();
assert.equal(downloads.at(-1)[1],'POSCAR_BC');

const previous=diffractionButton();
$('structure-text').oninput({target:{value:request.text+'\n'}});
assert.equal(diffractionButton(),null);
previous.onclick();
assert.equal(opened.length,2);

result={...conversion,verified:false,group_number:undefined,international:''};
await $('structure-run').onclick();
assert.equal($('structure-open-group').disabled,true);
assert.equal(diffractionButton().disabled,false,'The geometry can transfer without a space-group label or digest');
diffractionButton().onclick();
assert.deepEqual(opened.at(-1).source,{format:'poscar',filename:'',sha256:'',atomCount:8});

for(const malformed of [
 {...inputCell,lattice:[[0,0,0],inputCell.lattice[1],inputCell.lattice[2]]},
 {...inputCell,positions:Array.from({length:129},()=>[0,0,0]),species:Array(129).fill('Na'),atom_count:129}
]){
 result={...conversion,input_cell:malformed};
 await $('structure-run').onclick();
 assert.equal(diffractionButton().disabled,true);
 assert.match($('structure-diffraction-scope').textContent,/128/);
 diffractionButton().onclick();
 assert.equal(opened.length,3);
 $('structure-cif').onclick();
 assert.equal(downloads.at(-1)[1],'structure_BC.cif');
}

result=conversion;
$('structure-cif-example').onclick();
await $('structure-run').onclick();
diffractionButton().onclick();
assert.equal(opened.at(-1).source.format,'cif');
assert.equal(opened.at(-1).source.filename,'CsCl_example.cif');
const stale=diffractionButton();
container.dataset.researchView='docs';
container.innerHTML='<p>Different view</p>';
stale.onclick();
assert.equal(opened.length,4);
assert.ok(calls.every(call=>call.action==='structure_bc'));
console.log(`Input cell → diffraction (${english?'English':'Chinese'}): original geometry, optional source hash, focus, stale/invalid guards, and unchanged representation and download paths passed.`);
