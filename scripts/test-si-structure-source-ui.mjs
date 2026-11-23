import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {validateStructureHandoff,structureHandoffForCalculation} from '../dist/structure-provenance.js';

const english=process.argv.includes('--english');
const {renderStructureView,getStructureResult}=await import(english?'../dist/en/structure-ui.js':'../dist/structure-ui.js');
const mismatch=english?/could not be read/:/暂时无法读取/;
const verified=english?/original official Si file is verified/:/已核对官方 Si 原文件/;
const predict=english?/Make a prediction/:/先预测/;
const compare=english?/Compare the star-arm counts/:/比较两次计算的星臂数/;
const asset=name=>fs.readFileSync(new URL('../dist/data/examples/phonopy-si-structure/'+name,import.meta.url));
const manifest=JSON.parse(asset('source.json'));
const original=asset('POSCAR-0');
const utf8Text=original.toString('utf8');
const nativeFetch=globalThis.fetch;
const fetches=[],observers=[];
let provide=async()=>response();
function response(bytes=original){return {ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};}
globalThis.fetch=async(url,{signal}={})=>{
  assert.equal(new URL(url).pathname.split('/').at(-1),manifest.structureFile.path);
  assert.equal(new URL(url).searchParams.get('v'),'20261119-si1');
  fetches.push({url,signal});
  return provide(signal);
};
globalThis.MutationObserver=class{
  constructor(callback){this.callback=callback;observers.push(this);}
  observe(node){this.node=node;}
  disconnect(){this.disconnected=true;}
};
globalThis.document={compatMode:'CSS1Compat',activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
  return selector.includes(',')?[...new Set(selector.split(',').flatMap(part=>queryAll.call(this,part.trim())))]:queryAll.call(this,selector);
};

const page=new Container();
page.dataset={researchView:'structure'};
const $=selector=>page.querySelector(selector);
const calls=[],handoffs=[],downloads=[];
const transform=[[-1,1,1],[1,-1,1],[1,1,-1]],origin=[-.375,.625,.625];
const inverseTranspose=[[0,.5,.5],[.5,0,.5],[.5,.5,0]];
const exercise=manifest.input,reference=manifest.reference;
const mount=(structureQuery='')=>renderStructureView({container:page,structureQuery,toast(){},download:(...args)=>downloads.push(args),openGroup:(...args)=>handoffs.push(args),
  run:async(action,input)=>{
    calls.push({action,input});
    const k=inverseTranspose.map(row=>row.reduce((sum,value,index)=>sum+value*input.k[index],0));
    return {
      tool:'structure_bc',complete:true,verified:true,group_number:reference.spaceGroupNumber,international:reference.international,
      hall_number:reference.hallNumber,bravais:reference.bravais,bz_type:reference.bravais,symprec:input.symprec,angle_tolerance:input.angle_tolerance,
      input_cell:{atom_count:exercise.natom},atom_count:reference.bcAtomCount,k_input:[...input.k],k_bc:k,
      bc_primitive:{lattice:[[0,2.73,2.73],[2.73,0,2.73],[2.73,2.73,0]],positions:[[0,0,0],[.25,.25,.25]],species:['Si','Si']},
      transform:{coordinate_matrix:transform,origin_shift:origin},
      verification:{original_BC_generators:true,integral_rotations:true,input_operation_transport_verified:true,atoms_per_volume_preserved:true,
        atom_covariance_max_error_angstrom:0,idealization_max_atom_displacement_angstrom:0},
      certificate:{method:'Test adapter',spglib_version:'test',scope:'The separate Python regression verifies the numerical conversion.'},
      warnings:[],exports:{bc_poscar:'verified teaching output',bc_cif:'BC CIF',standard_poscar:'ITA',unidealized_poscar:'BC raw'}
    };
  }});
function change(selector,value){const input=$(selector);input.value=value;input.oninput({target:input});}
const officialButton=()=>$('#structure-si-example');
const officialStatus=()=>$('#structure-si-source');

mount();
assert.match($('#structure-text').value,/NaCl/);
assert.equal(fetches.length,0);
assert.equal(officialStatus().hidden,true);
change('#structure-k-0','3/8');
change('#structure-symprec','0.00002');
const prior=$('#structure-text').value;
const changed=Buffer.from(original);
changed[changed.length-2]^=1;
provide=async()=>response(changed);
await officialButton().onclick();
assert.match(officialStatus().textContent,mismatch);
assert.equal($('#structure-text').value,prior);
assert.equal($('#structure-k-0').value,'3/8');
assert.equal($('#structure-symprec').value,'0.00002');
assert.equal(officialButton().disabled,false);
assert.deepEqual(calls,[]);

provide=async()=>response();
await officialButton().onclick();
assert.equal($('#structure-text').value,utf8Text);
assert.equal($('#structure-format').value,exercise.format);
assert.deepEqual([$('#structure-k-0').value,$('#structure-k-1').value,$('#structure-k-2').value],['1/2','0','0']);
assert.equal(Number($('#structure-symprec').value),exercise.symprec);
assert.equal(Number($('#structure-angle').value),exercise.angleTolerance);
assert.equal(document.activeElement,officialStatus());
assert.match(officialStatus().textContent,verified);
assert.match(officialStatus().textContent,predict);
assert.doesNotMatch(officialStatus().textContent,compare);
assert.equal($('#structure-open-group'),null);
assert.deepEqual(calls,[],'Verifying and filling the form do not call the converter');

await $('#structure-run').onclick();
assert.equal(calls.length,1);
assert.deepEqual(calls[0],{action:'structure_bc',input:{text:utf8Text,format:'poscar',symprec:exercise.symprec,angle_tolerance:exercise.angleTolerance,k:exercise.conventionalK}});
assert.equal(getStructureResult().group_number,227);
assert.match(officialStatus().textContent,compare);
assert.match($('#structure-result').textContent,english?/2 atoms/:/2 个原子/);
assert.equal($('#structure-open-group').disabled,false);
$('#structure-poscar').onclick();
assert.equal(downloads.at(-1)[1],'POSCAR_BC');
await $('#structure-open-group').onclick();
assert.equal(calls.length,1,'The source-bound handoff keeps the workbench computation manual');
const [group,k,bz,source]=handoffs.at(-1);
assert.equal(group,227);
assert.deepEqual(k,reference.bcK);
assert.equal(bz,'CubiFace');
assert.deepEqual(validateStructureHandoff(source).source,{kind:'teaching-example',filename:manifest.structureFile.path,format:'poscar',
  sha256:manifest.structureFile.sha256,byteCount:manifest.structureFile.bytes,hashBasis:'utf8-text',textSHA256:manifest.structureFile.sha256,textByteCount:manifest.structureFile.bytes});
assert.equal(source.doubleValued,false);
assert.equal(Object.hasOwn(source.source,'text'),false);
assert.ok(structureHandoffForCalculation(source,{input:{group_number:227,k,doubleValued:false,bz_type:bz}}));
assert.equal(structureHandoffForCalculation(source,{input:{group_number:227,k:exercise.conventionalK,doubleValued:false,bz_type:bz}}),null);

const stale= $('#structure-open-group').onclick;
change('#structure-symprec','0.00002');
assert.match(officialStatus().textContent,verified);
assert.doesNotMatch(officialStatus().textContent,predict);
assert.doesNotMatch(officialStatus().textContent,compare);
await stale();
assert.equal(handoffs.length,1);
await $('#structure-run').onclick();
await $('#structure-open-group').onclick();
assert.equal(handoffs.at(-1)[3].source.sha256,manifest.structureFile.sha256,'Changing the tolerance does not change a verified source file');
assert.equal(handoffs.at(-1)[3].settings.symprec,.00002);
change('#structure-text',utf8Text+'\n');
assert.equal(officialStatus().hidden,true);
assert.equal(getStructureResult(),null);

let respond;
provide=()=>new Promise(resolve=>{respond=resolve;});
const editRace=officialButton().onclick();
await flush();
const abortOnEdit=fetches.at(-1).signal;
change('#structure-text','Newer user draft');
assert.equal(abortOnEdit.aborted,true);
respond(response());
await editRace;
assert.equal($('#structure-text').value,'Newer user draft');
assert.equal(officialStatus().hidden,true);

const leaveRace=officialButton().onclick();
await flush();
const abortOnLeave=fetches.at(-1).signal,leaveObserver=observers.at(-1);
page.dataset.researchView='docs';
page.innerHTML='<section>Other tool</section>';
leaveObserver.callback();
assert.equal(abortOnLeave.aborted,true);
respond(response());
await leaveRace;
assert.match(page.innerHTML,/Other tool/);
page.dataset.researchView='structure';
mount();
assert.equal($('#structure-text').value,'Newer user draft');
$('#structure-poscar-example').onclick();
assert.match($('#structure-text').value,/NaCl/);
$('#structure-cif-example').onclick();
assert.match($('#structure-text').value,/data_CsCl/);
assert.equal(officialStatus().hidden,true);
assert.ok(observers.every(observer=>observer.disconnected));

const coordinates=()=>[0,1,2].map(i=>$('#structure-k-'+i).value);
const foldingCases=[
 ['gamma',[0,0,0],[0,0,0]],
 ['x-100',[1,0,0],[0,.5,.5]],
 ['x-010',[0,1,0],[.5,0,.5]],
 ['x-001',[0,0,1],[.5,.5,0]]
];
for(const [id,inputK,bcK] of foldingCases){
 const draft=coordinates(),text=$('#structure-text').value,readCount=fetches.length,runCount=calls.length;
 mount('si-k='+id);
 assert.deepEqual(coordinates(),draft,'Navigation alone keeps the prior coordinates');
 assert.equal($('#structure-text').value,text);
 assert.equal(fetches.length,readCount);
 assert.equal(calls.length,runCount);
 assert.match($('#structure-si-fold-note').textContent,english?/reciprocal fractional coordinates/:/倒易分数坐标/);

 provide=async()=>response(changed);
 await officialButton().onclick();
 assert.match(officialStatus().textContent,mismatch);
 assert.deepEqual(coordinates(),draft,'A refused file cannot change the draft');
 assert.equal($('#structure-text').value,text);
 provide=async()=>response();
 await officialButton().onclick();
 assert.deepEqual(coordinates(),inputK.map(String));
 assert.equal($('#structure-text').value,utf8Text);
 assert.equal(calls.length,runCount);
 await $('#structure-run').onclick();
 assert.deepEqual(calls.at(-1).input.k,inputK);
 assert.deepEqual(getStructureResult().k_bc,bcK);
 await $('#structure-open-group').onclick();
 const [number,k,bzType,foldSource]=handoffs.at(-1);
 assert.equal(number,227);
 assert.deepEqual(k,bcK);
 assert.equal(foldSource.source.sha256,manifest.structureFile.sha256);
 assert.deepEqual(foldSource.coordinates.inputK,inputK);
 assert.ok(structureHandoffForCalculation(foldSource,{input:{group_number:227,k,doubleValued:false,bz_type:bzType}}));
 assert.equal(calls.length,runCount+1);
}

for(const query of ['si-k=bad-value','si-k=gamma&si-k=x-100','si-k=gamma&si-k=gamma','si-k=constructor']){
 mount(query);
 assert.equal($('#structure-si-fold-note'),null);
 await officialButton().onclick();
 assert.deepEqual(coordinates(),['1/2','0','0']);
}

globalThis.fetch=nativeFetch;
console.log('Official Si structure UI passed byte verification, four explicit Γ/X source-bound conversions, draft safety, manual handoff, and legacy examples.');
