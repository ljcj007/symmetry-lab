import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderStructureView,getStructureResult}=await import(new URL('structure-ui.js',edition));
const {cifSettingCases,cifInputSettingHTML}=await import(new URL('cif-setting-practice.js',edition));
const {cifOrbitCases}=await import(new URL('cif-orbit-practice.js',edition));
const {quartzStructureCases}=await import(new URL('quartz-structure-practice.js',edition));
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
let pendingConversion,holdConversion=false,nextError,nextWarning,nextHallCheck;
const workbench={
 container,toast(){},download:(...values)=>downloads.push(values),openGroup(){},
 async run(action,payload){
  calls.push({action,payload});
  if(holdConversion){holdConversion=false;await new Promise(resolve=>{pendingConversion=resolve;});}
  if(nextError){const message=nextError;nextError=null;throw Error(message);}
  const example=cifSettingCases.find(item=>item.text===payload.text);
  if(example?.id==='unique-b')throw Error(metricError);
  const result={...structuredClone(base),symprec:payload.symprec,angle_tolerance:payload.angle_tolerance,k_input:payload.k,k_bc:payload.k};
  if(nextWarning){result.warnings.push(nextWarning);nextWarning=null;}
  if(example){
   const inferred=example.id==='number-only';
   result.input_metadata={declared_symmetry_operation_count:2,cif_symmetry_setting:{
    method:inferred?'metadata_hall':'explicit_hall',
    selected_hall:{number:7,symbol:'P 2c',choice:'c'},
    compatible_hall_count:inferred?1:null,ambiguous:false
   }};
  }
  if(nextHallCheck){
   result.input_metadata={declared_symmetry_operation_count:3,cif_symmetry_setting:{method:'explicit_operations',selected_hall:null,compatible_hall_count:null,ambiguous:false},cif_explicit_hall_check:nextHallCheck};
   nextHallCheck=null;
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

nextError='CIF atom-site row 1 (Si1) declares multiplicity 3, but symmetry expansion gives 6 distinct periodic sites at 1e-05 Angstrom. Check the symmetry setting, multiplicity field and site coordinates.';
await convert();
assert.equal(getStructureResult(),null);
assert.equal(evidence(),null);
assert.equal($('#structure-error').textContent,english
 ?'CIF atom-site row 1 (Si1) declares multiplicity 3. Symmetry expansion gives 6 distinct periodic sites at a deduplication tolerance of 1e-05 Å. Check the symmetry setting, multiplicity field, and site coordinates.'
 :'CIF 原子位点第 1 行 (Si1)声明重数为 3。对称展开使用 1e-05 Å 的去重容差，得到 6 个不同的周期位点。请核对对称设置、重数字段和位点坐标。');

nextError='CIF atom-site row 2 multiplicity must be an integer from 1 to 192';
await convert();
assert.equal($('#structure-error').textContent,english
 ?'The multiplicity in CIF atom-site row 2 must be an integer from 1 to 192.'
 :'CIF 原子位点第 2 行的重数必须是 1 至 192 的整数。');

const literalSite='Si (split)<img>$&{4}';
nextError='CIF atom-site row 3 ('+literalSite+') declares multiplicity 1, but symmetry expansion gives 2 distinct periodic sites at 2.5e-06 Angstrom. Check the symmetry setting, multiplicity field and site coordinates.';
await convert();
assert.ok($('#structure-error').textContent.includes(literalSite));
assert.ok($('#structure-error').textContent.includes('2.5e-06 Å'));
assert.ok($('#structure-error').innerHTML.includes('&lt;img&gt;$&amp;{4}'));
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

const orbitPanel=()=>$('#structure-cif-orbit-practice');
const orbitStatus=()=>$('#structure-cif-orbit-practice-status');
const loadOrbit=id=>$('#structure-cif-orbit-practice-'+id).onclick();
for(const query of ['', 'cif-orbit=practice&cif-orbit=practice', 'cif-orbit=unknown']){
 view(query);
 assert.equal(orbitPanel().open,false);
 assert.equal($('#structure-text').value,'data_own_structure');
}
view('cif-orbit=practice');
assert.equal(orbitPanel().open,true);
assert.equal(panel().open,false);
assert.equal(orbitStatus().hidden,true);
const countBeforeOrbit=calls.length;
loadOrbit('rounded');
assert.equal(orbitPanel().open,true);
assert.equal(document.activeElement,orbitStatus());
assert.equal($('#structure-text').value,cifOrbitCases[0].text);
assert.match(orbitStatus().textContent,english?/Run the conversion manually/:/请手动转换/);
assert.equal($('#structure-k-2').value,'0');
assert.equal(calls.length,countBeforeOrbit);
loadOrbit('exact');
assert.equal(orbitPanel().open,true);
assert.equal($('#structure-text').value,cifOrbitCases[1].text);
await convert();
assert.deepEqual(calls.at(-1),{action:'structure_bc',payload:{format:'cif',text:cifOrbitCases[1].text,symprec:1e-5,angle_tolerance:-1,k:[0,0,0]}});
assert.equal(calls.length,countBeforeOrbit+1);

nextWarning='CIF atom-site row 1 (Na1) expands to multiplicity 2. Deprecated _atom_site_symmetry_multiplicity records 1, consistent with the site symmetry order. The source value is retained.';
await convert();
const legacyWarning=$('#structure-result').querySelectorAll('.warning').find(item=>item.textContent.includes('_atom_site_symmetry_multiplicity'));
assert.equal(legacyWarning?.textContent,english
 ?'CIF atom-site row 1 (Na1) expands to multiplicity 2. The value 1 in the legacy field _atom_site_symmetry_multiplicity agrees with the site-symmetry order. The source value is retained.'
 :'CIF 原子位点第 1 行 (Na1)展开后的重数为 2。旧字段 _atom_site_symmetry_multiplicity 中的值 1 与位点稳定子阶一致，已保留源值。');

const comparison=()=>$('#structure-cif-explicit-hall-check');
assert.equal(comparison(),null,'Earlier results without check metadata keep their existing presentation');
const hallWarning="The Hall catalogue and the explicit CIF operations differ in the input basis and origin. The explicit operations were used.";
const candidate=(hall_number,group_number,operation_count,status)=>({hall_number,group_number,operation_count,status});
for(const [hall,status,candidates,expected] of [
 ['P 2c','match',[candidate(7,4,2,'match')],english?'Match in the input setting':'在输入设置中匹配'],
 ['P 2','different_in_input_setting',[candidate(4,3,2,'translations')],english?'Difference in the input setting':'在输入设置中不同'],
 ['P 2yb','different_in_input_setting',[candidate(6,4,2,'rotations')],english?'Difference in the input setting':'在输入设置中不同'],
 ['P 1','different_in_input_setting',[candidate(1,1,1,'operation_count')],english?'Difference in the input setting':'在输入设置中不同'],
 ['P 2c (0 0 1) <img src=x> &','catalogue_unresolved',[],english?'Unresolved in the catalogue used':'所用目录中未解析']
]){
 const metadata={declared_hall_symbol:hall,status,explicit_operation_count:2,translation_tolerance_fractional:1e-6,candidates};
 nextHallCheck=metadata;
 if(status==='different_in_input_setting')nextWarning=hallWarning;
 await convert();
 const card=comparison();
 assert.ok(card);
 assert.equal(card.open,false);
 assert.match(card.innerHTML,english?/same input lattice basis and origin/:/同一输入晶胞基底和原点/);
 assert.match(card.innerHTML,english?/fractional coordinates/:/分数坐标/);
 assert.match(card.innerHTML,/1e-6/);
 assert.ok(card.querySelector('summary').textContent.includes(expected));
 assert.equal(card.querySelector('code').textContent,hall);
 assert.equal(card.querySelector('img'),null,'User-supplied Hall symbols are displayed as literal text');
 assert.equal(card.querySelector('tbody')?.querySelectorAll('tr').length??0,candidates.length);
 assert.match($('#structure-result').querySelector('.structure-summary').textContent,/Hall 6/);
 assert.match(evidence().innerHTML,english?/Uses the operations listed explicitly in the CIF/:/采用 CIF 中明确列出的操作/);
 const warnings=$('#structure-result').querySelectorAll('.warning');
 if(status==='different_in_input_setting'){
  assert.equal(warnings.at(-1)?.textContent,english?hallWarning:"Hall 目录操作与显式 CIF 操作在输入基底和原点中不同。转换采用显式操作。");
 }else assert.equal(warnings.length,0);
 if(candidates.length){
  const row=card.querySelector('tbody').querySelector('tr');
  const labels=english?{match:'Full operation sets match',translations:'Different translation parts',rotations:'Different rotation parts',operation_count:'Different operation counts'}
   :{match:'完整操作集匹配',translations:'平移部分不同',rotations:'旋转部分不同',operation_count:'操作数不同'};
  assert.deepEqual(row.querySelectorAll('td').map(cell=>cell.textContent),[
   ...['hall_number','group_number','operation_count'].map(key=>String(candidates[0][key])),labels[candidates[0].status]
  ]);
 }
 card.open=true;
 $('#structure-spin').onchange();
 assert.equal(comparison().open,true,'The same result keeps its disclosure open on redraw');
 $('#structure-json').onclick();
 const exported=JSON.parse(downloads.at(-1)[0]);
 assert.deepEqual(exported.input_metadata.cif_explicit_hall_check,metadata);
 if(warnings.length)assert.ok(exported.warnings.includes(hallWarning));
}
await convert();
assert.equal(comparison(),null,'A later conversion cannot inherit an earlier comparison');

const fetchedQuartz=[];
let tamperQuartz=true;
globalThis.fetch=async url=>{
 const name=new URL(url).pathname.split('/').at(-1);
 const entry=quartzStructureCases.find(item=>item.filename===name);
 assert.ok(entry,'Only the selected structure should be fetched');
 fetchedQuartz.push(name);
 const bytes=Uint8Array.from(readFileSync(new URL(`data/examples/quartz-298k/${name}`,edition)));
 if(tamperQuartz)bytes[0]^=1;
 return {ok:true,arrayBuffer:async()=>bytes.buffer};
};
for(const query of ['', 'quartz-hand=wrong', 'quartz-hand=practice&quartz-hand=practice']){
 view(query);
 assert.equal($('#structure-quartz-hand').open,false);
}
view('quartz-hand=practice');
assert.equal($('#structure-quartz-hand').open,true);
assert.equal($('#structure-text').value,cifOrbitCases[1].text);
assert.deepEqual(fetchedQuartz,[],'Opening the activity neither replaces a draft nor fetches');
const beforeQuartzRun=calls.length;
await $('#structure-quartz-original').onclick();
assert.match($('#structure-quartz-status').textContent,english?/could not be read/:/暂时无法读取/);
assert.doesNotMatch($('#structure-quartz-status').textContent,/SHA-?256|[0-9a-f]{64}/i);
assert.equal($('#structure-text').value,cifOrbitCases[1].text);
tamperQuartz=false;
for(const entry of quartzStructureCases){
 await $('#structure-quartz-'+entry.id).onclick();
 const bytes=readFileSync(new URL(`data/examples/quartz-298k/${entry.filename}`,edition));
 assert.equal($('#structure-text').value,bytes.toString('utf8'));
 assert.equal($('#structure-format').value,entry.format);
 assert.equal($('#structure-quartz-hand').open,true);
 assert.equal(document.activeElement,$('#structure-quartz-status'));
 assert.equal(calls.length,beforeQuartzRun,'The quartz source load keeps conversion manual');
}
assert.deepEqual(fetchedQuartz,['9005017.cif',...quartzStructureCases.map(x=>x.filename)]);
console.log('CIF exercises ('+(english?'English':'Chinese')+'): draft and disclosure persistence, manual conversion, separate input/output Hall evidence, raw JSON, errors and stale guards passed.');
