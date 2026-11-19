import assert from 'node:assert/strict';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderStructureView,getStructureResult}=await import(new URL('structure-ui.js',edition));
const {cifSettingCases,cifInputSettingHTML}=await import(new URL('cif-setting-practice.js',edition));
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){
 return selector.includes(',')?selector.split(',').flatMap(item=>queryAll.call(this,item.trim())):queryAll.call(this,selector);
};
globalThis.document={activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.fetch=()=>assert.fail('The CIF teaching samples need no fetch');

const metricError='CIF symmetry rotations do not preserve the declared cell metric at this tolerance';
const identity=[[1,0,0],[0,1,0],[0,0,1]];
const base={
 tool:'structure_bc',complete:true,group_number:4,international:'P2_1',hall_number:6,bz_type:'MonoPrim',verified:true,
 input_cell:{atom_count:4},bc_primitive:{lattice:identity,positions:[[0,0,0]],species:['Na']},
 transform:{coordinate_matrix:identity,origin_shift:[0,0,0]},warnings:[],exports:{bc_poscar:'BC',bc_cif:'CIF',standard_poscar:'ITA',unidealized_poscar:'RAW'},
 verification:{original_BC_generators:true,integral_rotations:true,input_operation_transport_verified:true,atoms_per_volume_preserved:true,atom_covariance_max_error_angstrom:0,idealization_max_atom_displacement_angstrom:0}
};
const container=new Container();container.dataset={researchView:'structure'};
const calls=[],downloads=[];
let pendingConversion,holdConversion=false,nextError;
const workbench={
 container,toast(){},download:(...values)=>downloads.push(values),openGroup(){},
 async run(action,payload){
  calls.push({action,payload});
  if(holdConversion){holdConversion=false;await new Promise(resolve=>{pendingConversion=resolve;});}
  if(nextError){const message=nextError;nextError=null;throw Error(message);}
  const example=cifSettingCases.find(item=>item.text===payload.text);
  if(example?.id==='unique-b')throw Error(metricError);
  const result={...structuredClone(base),symprec:payload.symprec,angle_tolerance:payload.angle_tolerance,k_input:payload.k,k_bc:payload.k};
  if(example){
   const inferred=example.id==='number-only';
   result.input_metadata={declared_symmetry_operation_count:2,cif_symmetry_setting:{
    method:inferred?'metadata_hall':'explicit_hall',
    selected_hall:{number:7,symbol:'P 2c',choice:'c'},
    compatible_hall_count:inferred?1:null,ambiguous:false
   }};
  }
  return result;
 }
};
const $=selector=>container.querySelector(selector);
const view=(structureQuery='')=>{container.dataset.researchView='structure';renderStructureView({...workbench,structureQuery});};
const panel=()=>$('#structure-cif-practice');
const status=()=>$('#structure-cif-practice-status');
const example=id=>$('#structure-cif-practice-'+id);
const evidence=()=>$('#structure-cif-setting-evidence');
const convert=() => $('#structure-run').onclick();

view();
assert.equal(panel().open,false);
const draft='data_private\n# local draft <x> & unsubmitted';
$('#structure-text').oninput({target:{value:draft}});
$('#structure-k-0').oninput({target:{value:'0.75'}});
for(const query of ['cif-setting=wrong','cif-setting=practice&cif-setting=practice','si-k=x-001']){
 view(query);
 assert.equal(panel().open,false,query);
 assert.equal($('#structure-text').value,draft);
}
assert.ok($('#structure-si-fold-note'),'The existing Si handoff route still works');
view('cif-setting=practice');
assert.equal(panel().open,true);
assert.equal($('#structure-text').value,draft);
assert.equal($('#structure-k-0').value,'0.75');
assert.equal(calls.length,0);
assert.equal(status().hidden,true);
assert.match(panel().textContent,english?/Space group 4 · CIF setting exercise/:/空间群 4 · CIF 设置练习/);
assert.equal(example('number-only').textContent,english?'Load the number-only CIF':'载入仅编号的 CIF');

const stale=example('unique-b');
view();
panel().open=true;
stale.onclick();
assert.equal($('#structure-text').value,draft,'A button from the departed view cannot replace the draft');
example('number-only').onclick();
assert.equal(panel().open,true,'An open plain-route panel survives loading a case');
assert.equal(document.activeElement,status());
assert.equal(status().hidden,false);
assert.equal($('#structure-format').value,'cif');
assert.equal($('#structure-text').value,cifSettingCases[0].text);
assert.equal($('#structure-k-2').value,'1/4');
assert.equal(calls.length,0,'Loading the example leaves calculation to the existing Run button');
holdConversion=true;
const converting=convert();
assert.ok(example('unique-b').disabled);
example('unique-b').onclick();
assert.equal($('#structure-text').value,cifSettingCases[0].text);
pendingConversion();
await converting;
assert.deepEqual(calls[0],{action:'structure_bc',payload:{format:'cif',text:cifSettingCases[0].text,symprec:1e-5,angle_tolerance:-1,k:[0,0,.25]}});
assert.match($('#structure-result').querySelector('.structure-summary').textContent,/Hall 6/);
assert.match(evidence().textContent,/Hall 7 · P 2c · c/);
assert.match(evidence().textContent,english?/compatible with the input cell metric · 1/:/与输入晶胞度量相容的候选数 · 1/);
$('#structure-json').onclick();
assert.deepEqual(JSON.parse(downloads.at(-1)[0]).input_metadata,getStructureResult().input_metadata);

example('unique-c').onclick();
await convert();
assert.match(evidence().textContent,english?/declared explicitly/:/明确声明/);
assert.doesNotMatch(evidence().textContent,english?/compatible with the input cell metric/:/相容的候选数/);
const plainSetting=structuredClone(getStructureResult().input_metadata.cif_symmetry_setting);
const countBeforeDotted=calls.length;
assert.equal(example('dotted-c').textContent,english?'Load the dotted P 2c CIF':'载入点号 P 2c CIF');
example('dotted-c').onclick();
assert.equal(calls.length,countBeforeDotted,'Dotted input also waits for manual conversion');
const dottedInput=$('#structure-text').value;
assert.match(dottedInput,/_cell\.length_a 3[\s\S]*_space_group\.name_Hall 'P 2c'[\s\S]*_atom_site\.fract_z/);
assert.equal($('#structure-k-2').value,'1/4');
await convert();
assert.equal(calls.at(-1).payload.text,dottedInput);
assert.deepEqual(getStructureResult().input_metadata.cif_symmetry_setting,plainSetting);

const duplicateInput=dottedInput.replace('_cell.length_a 3','_cell.length_a 3\n_cell_length_a 5');
$('#structure-text').oninput({target:{value:duplicateInput}});
nextError='Repeated CIF data item: _cell.length_a aliases _cell_length_a';
await convert();
assert.equal(calls.at(-1).payload.text,duplicateInput);
assert.equal(getStructureResult(),null);
assert.equal($('#structure-error').textContent,english
 ?'CIF fields _cell.length_a and _cell_length_a refer to the same data item. Keep one spelling.'
 :'CIF 字段 _cell.length_a 和 _cell_length_a 指向同一个数据项。请保留一种写法。');
assert.equal(evidence(),null);
const literalTag='_item<img>$&';
nextError='Repeated CIF data item: '+literalTag+' aliases _cell_length_a';
await convert();
assert.ok($('#structure-error').textContent.includes(literalTag),'A dynamic field remains literal text');
assert.ok($('#structure-error').innerHTML.includes('_item&lt;img&gt;$&amp;'));
assert.equal($('#structure-error').querySelector('img'),null);

const conflictingNumbers=dottedInput.replace("_space_group.name_Hall 'P 2c'",'_space_group_IT_number 4\n_symmetry_Int_Tables_number 3');
$('#structure-text').oninput({target:{value:conflictingNumbers}});
nextError='Conflicting CIF International Tables space-group numbers in _space_group_IT_number and _symmetry_Int_Tables_number';
await convert();
assert.equal(calls.at(-1).payload.text,conflictingNumbers);
assert.equal(getStructureResult(),null);
assert.equal($('#structure-error').textContent,english
 ?'CIF fields _space_group_IT_number and _symmetry_Int_Tables_number give different space-group numbers. Check the original structure.'
 :'CIF 中的 _space_group_IT_number 和 _symmetry_Int_Tables_number 给出了不同的空间群编号。请核对原始结构。');

example('unique-b').onclick();
await convert();
assert.equal(getStructureResult(),null);
assert.equal(evidence(),null);
assert.match($('#structure-error').textContent,english?/do not preserve the input cell metric/:/与输入晶胞度量不相容/);
example('unique-c').onclick();
assert.equal($('#structure-error').textContent,'');
await convert();
assert.equal(getStructureResult().group_number,4);

let completeRead;
const reading=$('#structure-file').onchange({target:{files:[{name:'sg4_number_only.cif',size:15,text:()=>new Promise(resolve=>{completeRead=resolve;})}]}});
assert.ok(example('number-only').disabled);
example('number-only').onclick();
assert.equal($('#structure-text').value,cifSettingCases[1].text);
completeRead('data_own_structure');
await reading;
assert.equal(panel().open,true);
assert.equal(status().hidden,true,'A user file never inherits the practice source, even with the same filename');
await convert();
assert.equal(evidence(),null,'The UI makes no claim when the Python evidence is absent');

assert.equal(cifInputSettingHTML({method:'unknown'}),'');
assert.equal(cifInputSettingHTML({method:'metadata_hall',selected_hall:null}),'');
assert.match(cifInputSettingHTML({method:'explicit_hall',selected_hall:{number:7,symbol:'<input>',choice:'<b>'}}),/&lt;input&gt;.*&lt;b&gt;/);
assert.doesNotMatch(cifInputSettingHTML({method:'explicit_operations',selected_hall:null}),/Hall [0-9]/);
console.log('CIF setting exercise ('+(english?'English':'Chinese')+'): draft and disclosure persistence, manual conversion, separate input/output Hall evidence, raw JSON, errors and stale guards passed.');
