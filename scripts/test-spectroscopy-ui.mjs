import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool,toolsIndex,searchEntries} from '../dist/navigation-ui.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/spectroscopy-materials.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/spectroscopy.json',import.meta.url),'utf8'));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/spectroscopy-ui.js');
const views=await import('../dist/spectroscopy-views.js?v=20261031-frontiers1');
const projects=await import('../dist/response-projects.js?v=20261031-frontiers1');
const notebook=await import('../dist/material-notebook.js?v=20261031-frontiers1');
const templates=(await import('../dist/spectroscopy-projects.js?v=20261031-frontiers1')).spectroscopyAssignments;
let chosen=data.modules[0].presets[0].id;const calls=[];
const run=async(action,input)=>{calls.push({action,input:structuredClone(input)});return structuredClone(fixtures.results[chosen]);};
const mount=async(selection={},runner=run)=>{const container=new Container(),downloads=[],navigations=[],cancelled=[];await ui.renderSpectroscopyView({container,selection,run:runner,download:(body,name)=>downloads.push({body,name}),cancelRun:()=>cancelled.push(true),onNavigate:p=>navigations.push(p)});return{container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#spx-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,id,value)=>{const el=v.$('#spx-'+id);el.value=String(value);v.$('#spx-form').oninput({target:el});};
const safe=html=>assert.doesNotMatch(html,/\b(?:NaN|Infinity|undefined)\b/);
assert.equal(classroomPathways.length,7);
assert.equal(projects.assignmentTemplates.length,26);
for(const m of data.modules){
 assert.ok(knownTool('compute/'+m.route));const route=parseClassroomRoute('compute/'+m.route+'?module=wrong&tab=derive');assert.equal(route.module,m.id);assert.equal(route.section,'spectroscopy');assert.equal(route.tab,'lab');assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 for(const p of m.presets){chosen=p.id;const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);assert.equal(calls.at(-1).action,m.action);for(const [k,value]of Object.entries(p.input))assert.deepEqual(calls.at(-1).input[k],value,p.id+':'+k);safe(v.$('#spx-result').innerHTML);assert.ok(v.$('#spx-result').querySelector('svg'));v.$('#spx-export').onclick();assert.equal(JSON.parse(v.downloads[0].body).module,m.id);}
 const v=await mount({module:m.id});v.container.querySelector('[data-spx-tab="lab"]').onclick();assert.ok(v.$('#spx-form'));assert.equal(v.navigations.at(-1).tab,'lab');v.container.querySelector('[data-spx-tab="cases"]').onclick();assert.equal(v.$('#spx-content').querySelectorAll('article').length,3,'Classroom filters cases to the active topic');
}
chosen='resonance-spin1';let v=await mount({module:'resonance',calculationOnly:true,preset:chosen});await submit(v);v.$('#spx-level-count').value='36';v.$('#spx-level-count').onchange();safe(v.$('#spx-levels').innerHTML);
change(v,'field','');const before=calls.length;await submit(v);assert.equal(calls.length,before);assert.match(v.$('#spx-result').textContent,/不能留空/);
chosen='spectra-project-x';v=await mount({module:'spectra',calculationOnly:true,preset:chosen});await submit(v);for(const mode of ['circular','difference']){v.$('#spx-spectrum-view').value=mode;v.$('#spx-spectrum-view').onchange();safe(v.$('#spx-spectrum-detail').innerHTML);}change(v,'tenDq',2);assert.equal(ui.getSpectroscopyResult(),null);
v=await mount({module:'andreev',calculationOnly:true});change(v,'sites',2);assert.equal(Number(v.$('#spx-barrierStart').value),1);
let finish;v=await mount({module:'resonance',calculationOnly:true},()=>new Promise(resolve=>finish=resolve));v.$('#spx-form').onsubmit({preventDefault(){}});v.$('#spx-cancel').onclick();finish(fixtures.results['resonance-spin1']);await flush();assert.equal(ui.getSpectroscopyResult(),null);assert.match(v.$('#spx-result').innerHTML,/取消/);
v=await mount({module:'resonance',calculationOnly:true},()=>new Promise(resolve=>finish=resolve));v.$('#spx-form').onsubmit({preventDefault(){}});change(v,'field',.1);finish(fixtures.results['resonance-spin1']);await flush();assert.equal(ui.getSpectroscopyResult(),null);assert.ok(v.cancelled.length);
for(const e of data.exercises){v=await mount({module:e.module,exercise:e.id,tab:'derive'});for(const [i,s]of e.steps.entries()){const el=v.$('#spx-steps').querySelectorAll('.obs-exercise-step')[i];assert.ok(el);el.querySelectorAll('[data-spx-answer]').find(b=>Number(b.dataset.spxAnswer)!==s.answer).onclick();assert.equal(v.$('#spx-steps').querySelectorAll('.obs-exercise-step').length,i+1);el.querySelectorAll('[data-spx-answer]').find(b=>Number(b.dataset.spxAnswer)===s.answer).onclick();}assert.match(v.$('#spx-progress').textContent,/完成/);}
const mapping={'spin-resonance':{ion:'old-ion',isotropic:'resonance-spin1-isotropic',split:'resonance-spin1'},'normal-andreev':{normal:'old-device',delta0:'andreev-project-normal',paired:'andreev-project-paired'},'multiplet-xas':{kanamori:'old-ion',linearx:'spectra-project-x',linearz:'spectra-project-z'}};
const ordinary=notebook.makeProject({title:'Existing material record'});await notebook.saveProject(ordinary);
for(const template of templates){let project=notebook.makeProject({title:template.title});project.assignment={id:template.id,steps:{},conclusion:'参数和模型边界均须说明。'};
 for(const step of template.steps){const key=mapping[template.id][step.id],request=fixtures.requests[key],record=notebook.captureCalculation(request.action,request.input,fixtures.results[key],{title:key,route:step.route.slice(1)});assert.ok(projects.assignmentAcceptance(step,record).ok,template.id+'/'+step.id);for(const [field,value]of Object.entries(step.requires)){const bad=structuredClone(record);bad.input[field]=typeof value==='number'?value+Math.max(.01,Math.abs(value)*.1):value+'-changed';assert.equal(projects.assignmentAcceptance(step,bad).ok,false,field);}project=projects.collectAssignmentRecord(project,template,step.id,record);project.assignment.steps[step.id].interpretation='基于计算证据的解释 <script>alert(1)</script>';safe(projects.evidenceSummary(record));}
 await notebook.saveProject(project);const container=new Container(),downloads=[];await projects.renderResponseProjects({container,selection:{project:template.id},download:(body,name)=>downloads.push({body,name})});assert.match(container.firstElementChild.innerHTML,/3 \/ 3 阶段/);assert.doesNotMatch(container.firstElementChild.innerHTML,/<script>alert/);assert.match(container.firstElementChild.innerHTML,/&lt;script&gt;/);
 await container.querySelector('#pj-json').onclick();const exported=JSON.parse(downloads.at(-1).body);assert.deepEqual(exported.assignment,project.assignment);assert.equal(exported.records.length,3);await container.querySelector('#pj-report').onclick();assert.ok(downloads.at(-1).body.includes(project.assignment.conclusion));const copy=notebook.importProject(JSON.stringify(project));assert.notEqual(copy.id,project.id);assert.deepEqual(copy.assignment,project.assignment);await notebook.saveProject(copy);assert.ok((await notebook.listProjects()).some(p=>p.id===ordinary.id));
}
assert.ok(searchEntries(toolsIndex,'Andreev').some(x=>x.route==='compute/andreev-lab'));
for(const file of ['spin_resonance_lab.py','andreev_lab.py','atomic_spectra_lab.py'])assert.ok(fs.existsSync(new URL('../dist/python/'+file,import.meta.url)));
console.log('Spectroscopy UI: all real presets, routes, plots, 36 gated steps, cancellation, 9 cross-module stages and preserved project exports passed.');
