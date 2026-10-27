import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool,searchEntries,toolsIndex} from '../dist/navigation-ui.js';
import {heatmapSVG,orbitalSVG,quantumCurveSVG} from '../dist/quantum-plots.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/quantum-materials.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/quantum-materials.json',import.meta.url),'utf8'));
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(data),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});
const ui=await import('../dist/quantum-materials-ui.js');
const calls=[];
const calculate=async(action,input)=>{calls.push({action,input:structuredClone(input)});let key;
 if(action==='crystal_field_lab')key=input.mode==='jahn_teller'?'jt':input.coordination==='tetrahedral'?'tetrahedral':'orbitals';
 else if(action==='quantum_geometry_lab')key=input.model==='ssh'?'ssh':input.mass===-2?'qwzCritical':'qwz';
 else if(action==='electron_transport_lab')key=input.source==='import'?'transportImport':input.chemicalPotential===-10?'transportEmpty':input.tauFs===10?'transportTau':input.dimension===3?'transport3d':'transport';
 else throw Error(action);return structuredClone(fixtures.results[key]);};
const mount=async(selection={},run=calculate)=>{const container=new Container(),downloads=[],navigations=[],cancelled=[];await ui.renderQuantumMaterialsView({container,selection,run,download:(body,name)=>downloads.push({body,name}),cancelRun:()=>cancelled.push(true),onNavigate:r=>navigations.push(r)});return {container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#qm-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,id,value)=>{const e=v.$('#qm-'+id);assert.ok(e,id);e.value=String(value);v.$('#qm-form').oninput({target:e});};
const select=async(v,id,value)=>{const e=v.$('#qm-'+id);assert.ok(e,id);e.value=String(value);await e.onchange?.({target:e});await flush();};
const safe=s=>assert.doesNotMatch(s,/NaN|Infinity|undefined/);
const broken=quantumCurveSVG([{label:'gap',points:[[0,0],[1,1],[2,null],[3,1],[4,0]]}]);
assert.equal((broken.match(/<polyline /g)||[]).length,2,'Undefined response must break the line');
safe(broken);assert.match(quantumCurveSVG([{label:'huge',points:[[0,1e18],[1,2e18]]}]),/e\+18/);

assert.equal(classroomPathways.length,7);
for(const [module,pathway,route]of [['orbitals','spin','crystal-field-lab'],['geometry','crystal','quantum-geometry-lab'],['transport','observables','electron-transport-lab']]){
 assert.ok(knownTool('compute/'+route));const parsed=parseClassroomRoute('compute/'+route+'?module=wrong&tab=derive&material=sample');
 assert.equal(parsed.module,module);assert.equal(parsed.pathway,pathway);assert.equal(parsed.section,'quantum-materials');assert.equal(parsed.tab,'lab');assert.equal(parsed.calculationOnly,true);
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed);
 assert.equal(parseClassroomRoute(ui.quantumCourseRoute(module)).module,module);
 assert.ok(searchEntries(toolsIndex,module==='orbitals'?'晶场':module==='geometry'?'量子 度规':'电子 输运').some(x=>x.route==='compute/'+route));
}
assert.throws(()=>ui.parseQuantumData('[]'),/对象/);assert.throws(()=>ui.parseQuantumData('bad'));assert.throws(()=>ui.parseQuantumData('{"s":"'+'x'.repeat(4_000_001)+'"}'),/4 MB/);
safe(heatmapSVG([0,1],[0,1],[[null,0],[-1,1]],{signed:true,title:'<script>'}));
assert.match(heatmapSVG([0],[0],[[1]],{title:'<script>'}),/&lt;script&gt;/);
for(const orbital of ['density','xy','yz','xz','x2-y2','z2'])safe(orbitalSVG(fixtures.results.orbitals,{orbital}));
const cf=await mount({module:'orbitals',calculationOnly:true});await submit(cf);
assert.equal(calls.at(-1).action,'crystal_field_lab');assert.equal(calls.at(-1).input.soc,.1);
assert.ok(cf.$('#qm-orbital').querySelector('svg'));const old=cf.$('#qm-orbital').innerHTML;
cf.$('#qm-yaw').oninput({target:{value:'80',nextElementSibling:{}}});assert.notEqual(cf.$('#qm-orbital').innerHTML,old);
await select(cf,'orbital-choice','xy');assert.ok(ui.getQuantumMaterialsResult());
cf.$('#qm-export').onclick();assert.equal(JSON.parse(cf.downloads[0].body).module,'orbitals');
await select(cf,'mode','jahn_teller');assert.equal(ui.getQuantumMaterialsResult(),null);await submit(cf);assert.ok(cf.$('#qm-jt-map').querySelector('svg'));safe(cf.$('#qm-jt-map').innerHTML);
await select(cf,'surface','upper');safe(cf.$('#qm-jt-map').innerHTML);
const geo=await mount({module:'geometry',calculationOnly:true});await submit(geo);assert.equal(calls.at(-1).input.mesh,31);assert.ok(geo.$('#qm-geometry-map').querySelector('svg'));
await select(geo,'field','berryCurvature');safe(geo.$('#qm-geometry-map').innerHTML);
change(geo,'mass',-2);await submit(geo);assert.match(geo.$('#qm-result').innerHTML,/不定义/);assert.equal(ui.getQuantumMaterialsResult().result.topology.value,null);
await select(geo,'model','ssh');await submit(geo);assert.match(geo.$('#qm-result').innerHTML,/Zak/);safe(geo.$('#qm-result').innerHTML);
const tr=await mount({module:'transport',calculationOnly:true});await submit(tr);assert.equal(calls.at(-1).input.hopping,.25);assert.equal(calls.at(-1).input.chemicalPotential,.3);safe(tr.$('#qm-transport-curves').innerHTML);
await select(tr,'axis','1');assert.match(tr.$('#qm-transport-curves').innerHTML,/y 方向/);
await select(tr,'dimension','3');assert.equal(tr.$('#qm-mesh').value,'24');await submit(tr);await select(tr,'axis','2');safe(tr.$('#qm-result').innerHTML);
change(tr,'chemicalPotential',-10);await submit(tr);assert.match(tr.$('#qm-transport-tensors').innerHTML,/未定义/);
await select(tr,'source','import');await tr.$('#qm-template').onclick();await flush();await submit(tr);assert.equal(calls.at(-1).input.data.sampling,'full-uniform-bz');safe(tr.$('#qm-result').innerHTML);
for(const module of data.modules)for(const preset of module.presets){const v=await mount({module:module.id,preset:preset.id,calculationOnly:true});for(const c of v.container.querySelectorAll('input'))if(['range','number'].includes(c.type)&&c.value!==''){if(c.attributes.min!==undefined)assert.ok(+c.value>=+c.attributes.min,preset.id+' '+c.id+' below min');if(c.attributes.max!==undefined)assert.ok(+c.value<=+c.attributes.max,preset.id+' '+c.id+' above max');}await submit(v);for(const [key,value]of Object.entries(preset.input))assert.deepEqual(calls.at(-1).input[key],value,preset.id+' '+key);if(preset.input.tauFs)assert.match(v.$('#qm-transport-tensors').innerHTML,/给定 τ 下的 σ/);}
// Every lesson opens its own actual calculation preset; every exercise gates all four steps.
for(const lesson of data.lessons){const v=await mount({module:lesson.module,lesson:lesson.id});v.$('#qm-to-lab').onclick();await submit(v);const p=data.modules.find(m=>m.id===lesson.module).presets.find(p=>p.id===lesson.preset);for(const [key,value]of Object.entries(p.input))if(key!=='data')assert.deepEqual(calls.at(-1).input[key],value,key);}
for(const exercise of data.exercises){const v=await mount({module:exercise.module,tab:'derive',exercise:exercise.id});for(const step of exercise.steps){const buttons=v.container.querySelectorAll('[data-qm-answer]').filter(b=>!b.disabled);const wrong=buttons.find(b=>+b.dataset.qmAnswer!==step.answer);wrong.onclick();assert.equal(buttons.some(b=>b.disabled),false);buttons.find(b=>+b.dataset.qmAnswer===step.answer).onclick();}assert.match(v.$('#qm-progress').textContent,/推导完成/);}
assert.equal(Object.keys(JSON.parse(saved.get('symmetry-lab.quantum-materials.progress.v1'))).length,9);
const atlas=await mount({module:'orbitals',atlasOnly:true});assert.equal(atlas.container.querySelectorAll('.obs-tabs').length,0);for(const m of data.modules)assert.ok(atlas.$('#qm-content').innerHTML.includes('#compute/'+m.route));
// Stale responses, cancellation, failures and in-flight file reads cannot replace newer inputs.
let resolve;const late=await mount({module:'geometry',calculationOnly:true},()=>new Promise(r=>{resolve=r;}));late.$('#qm-form').onsubmit({preventDefault(){}});assert.equal(late.$('#qm-run').disabled,true);change(late,'mass',0);assert.equal(late.cancelled.length,1);resolve(fixtures.results.qwz);await flush();assert.equal(ui.getQuantumMaterialsResult(),null);assert.match(late.$('#qm-result').innerHTML,/参数已改变/);
let readFile;const pending=await mount({module:'transport',calculationOnly:true});await select(pending,'source','import');pending.$('#qm-file').onchange({target:{files:[{size:20,text:()=>new Promise(r=>{readFile=r;})}]}});assert.equal(pending.$('#qm-run').disabled,true);const n=calls.length;await submit(pending);assert.equal(calls.length,n);pending.$('#qm-cancel').onclick();readFile('{"old":true}');await flush();assert.equal(pending.$('#qm-content-json').value,'');
const fail=await mount({module:'orbitals',calculationOnly:true},async()=>{throw Error('expected error');});await submit(fail);assert.equal(fail.$('#qm-run').disabled,false);assert.match(fail.$('#qm-result').textContent,/expected error/);
console.log('Quantum UI: real Python fixtures, 3 route families, 3D orbitals, heatmaps, transport tensors, all lessons and 36 gated steps, notebook export and async isolation passed.');
