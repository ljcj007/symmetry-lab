import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool,searchEntries,toolsIndex} from '../dist/navigation-ui.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/response-materials.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/response-materials.json',import.meta.url),'utf8'));
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};globalThis.document={createElement:tag=>new Element(tag)};
globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/response-materials-ui.js');
const views=await import('../dist/response-views.js?v=20261029-pathways1b');
const projectUI=await import('../dist/response-projects.js?v=20261029-pathways1b');
const notebook=await import('../dist/material-notebook.js?v=20261029-pathways1b');
const safe=html=>assert.doesNotMatch(html,/NaN|Infinity|undefined/);
const calls=[];let selectedFixture='hall-qwz-plateau';
const run=async(action,input)=>{calls.push({action,input:structuredClone(input)});return structuredClone(fixtures.results[selectedFixture]);};
const mount=async(selection={},runner=run)=>{const container=new Container(),downloads=[],navigations=[],cancelled=[];await ui.renderResponseMaterialsView({container,selection,run:runner,download:(body,name)=>downloads.push({body,name}),cancelRun:()=>cancelled.push(true),onNavigate:p=>navigations.push(p)});return {container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#rp-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,id,value)=>{const e=v.$('#rp-'+id);e.value=String(value);v.$('#rp-form').oninput({target:e});};
assert.equal(classroomPathways.length,7);
for(const m of data.modules){
 assert.ok(knownTool('compute/'+m.route));const parsed=parseClassroomRoute('compute/'+m.route+'?module=wrong&tab=derive');assert.equal(parsed.module,m.id);assert.equal(parsed.tab,'lab');assert.equal(parsed.section,'response-materials');assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed);
 assert.equal(parseClassroomRoute(ui.responseCourseRoute(m.id)).module,m.id);
 for(const p of m.presets){selectedFixture=p.id;const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);assert.equal(calls.at(-1).action,m.action);for(const [k,value]of Object.entries(p.input))assert.deepEqual(calls.at(-1).input[k],value,p.id+':'+k);safe(v.$('#rp-result').innerHTML);assert.ok(v.$('#rp-result').querySelector('svg'));v.$('#rp-export').onclick();assert.equal(JSON.parse(v.downloads[0].body).module,m.id);}
}
selectedFixture='hall-closing';const closed=await mount({module:'hall',calculationOnly:true,preset:'hall-closing'});await submit(closed);assert.match(closed.$('#rp-result').innerHTML,/未定义/);
closed.$('#rp-field').value='entropyCurvature';closed.$('#rp-field').onchange();safe(closed.$('#rp-map').innerHTML);
selectedFixture='multiplet-d6-high';const multi=await mount({module:'multiplet',calculationOnly:true});await submit(multi);multi.$('#rp-group').value='1';multi.$('#rp-group').onchange();safe(multi.$('#rp-occupations').innerHTML);
change(multi,'splitting',6);assert.equal(ui.getResponseMaterialsResult(),null);change(multi,'splitting','');const count=calls.length;await submit(multi);assert.equal(calls.length,count);assert.match(multi.$('#rp-result').textContent,/不能留空/);
selectedFixture='device-perfect';const device=await mount({module:'device',calculationOnly:true});change(device,'sites',3);assert.equal(Number(device.$('#rp-barrierStart').value),2);assert.equal(Number(device.$('#rp-barrierWidth').value),1);
let release;const pending=await mount({module:'hall',calculationOnly:true},()=>new Promise(resolve=>release=resolve));pending.$('#rp-form').onsubmit({preventDefault(){}});pending.$('#rp-cancel').onclick();release(fixtures.results['hall-qwz-plateau']);await flush();assert.equal(ui.getResponseMaterialsResult(),null);assert.match(pending.$('#rp-result').innerHTML,/取消/);
for(const e of data.exercises){const v=await mount({module:e.module,exercise:e.id,tab:'derive'});for(const [i,s]of e.steps.entries()){const sections=v.$('#rp-steps').querySelectorAll('.obs-exercise-step'),el=sections[i];assert.ok(el);const wrong=el.querySelectorAll('[data-rp-answer]').find(b=>Number(b.dataset.rpAnswer)!==s.answer);wrong.onclick();assert.equal(v.$('#rp-steps').querySelectorAll('.obs-exercise-step').length,i+1);el.querySelectorAll('[data-rp-answer]').find(b=>Number(b.dataset.rpAnswer)===s.answer).onclick();}assert.match(v.$('#rp-progress').textContent,/完成/);}
for(const m of data.modules){const v=await mount({module:m.id});v.container.querySelector('[data-rp-tab="lab"]').onclick();assert.ok(v.$('#rp-form'));assert.equal(v.navigations.at(-1).tab,'lab');}
// Each project must collect real outputs for all three stages, while holding
// the physical controls of its comparison fixed. Fixtures retain full arrays.
const stageFixtures={
 'geometry-hall':{geometry:'project-geometry',plateau:'hall-qwz-plateau',metal:'hall-project-metal'},
 'ssh-device':{bulk:'project-ssh',weak:'device-ssh-weak',strong:'device-ssh-strong'},
 'orbital-multiplet':{orbitals:'project-orbitals',high:'multiplet-d6-high',low:'multiplet-d6-low'}
};
const captureFixture=key=>{const request=fixtures.requests[key];return notebook.captureCalculation(request.action,request.input,fixtures.results[key],{title:key,route:'compute/'+request.action.replaceAll('_','-')});};
const projectMount=async template=>{const container=new Container(),downloads=[];await projectUI.renderResponseProjects({container,selection:{project:template.id},download:(body,name)=>downloads.push({body,name})});return {container,downloads,$:s=>container.querySelector(s)};};
const savedProject=async id=>(await notebook.listProjects()).find(p=>p.id===id);
const stages=projectUI.assignmentTemplates.filter(t=>Object.hasOwn(stageFixtures,t.id)).flatMap(t=>t.steps.map(step=>({template:t,step,key:stageFixtures[t.id][step.id]})));
assert.equal(stages.length,9);
for(const {template,step,key}of stages){
 const record=captureFixture(key),label=template.id+'/'+step.id;
 assert.ok(record,label+' fixture produces a valid notebook record');
 assert.equal(projectUI.assignmentAcceptance(step,record).ok,true,label+' accepts its fixture');
 assert.equal(projectUI.assignmentAcceptance(step,null).ok,false,label+' requires evidence');
 assert.equal(projectUI.assignmentAcceptance(step,{...record,action:'analyze'}).ok,false,label+' rejects another tool');
 for(const [field,value]of Object.entries(step.requires)){
  const mismatch=structuredClone(record);mismatch.input[field]=typeof value==='number'?value+Math.max(Math.abs(value)*.1,.01):value+'-changed';
  const acceptance=projectUI.assignmentAcceptance(step,mismatch);assert.equal(acceptance.ok,false,label+' rejects changed '+field);assert.ok(acceptance.reason.includes(field));
  const absent=structuredClone(record);delete absent.input[field];assert.equal(projectUI.assignmentAcceptance(step,absent).ok,false,label+' rejects missing '+field);
  if(typeof value==='number'){const text=structuredClone(record);text.input[field]=String(value);assert.equal(projectUI.assignmentAcceptance(step,text).ok,false,label+' requires numeric '+field);}
 }
 const preset=new URL(step.route.slice(1),'https://example.test/').searchParams.get('preset');
 if(!['quantum_geometry_lab','crystal_field_lab'].includes(step.action))assert.ok(data.modules.some(m=>m.presets.some(x=>x.id===preset)),label+' links to a live preset');
}
// These constraints are explicit to catch accidental removal from templates.
const hallTemplate=projectUI.assignmentTemplates.find(t=>t.id==='geometry-hall');
for(const step of hallTemplate.steps)assert.equal(step.requires.energyScale,1,'Hall comparison keeps the same energy scale');
const deviceTemplate=projectUI.assignmentTemplates.find(t=>t.id==='ssh-device');
for(const step of deviceTemplate.steps.slice(1)){
 for(const [field,value]of Object.entries({model:'ssh',sites:12,hopping:1,dimerRatio:.6,gate:0,barrier:0,leadHopping:1,leadOnsite:0,spinDegeneracy:1,eta:1e-7,energy:.05}))assert.equal(step.requires[field],value,'Contact comparison fixes '+field);
 const record=captureFixture(stageFixtures['ssh-device'][step.id]);
 record.input.eta=1e-7*(1+5e-11);assert.equal(projectUI.assignmentAcceptance(step,record).ok,true,'Float roundoff is accepted relative to tiny eta');
 record.input.eta=1e-7*(1+1e-5);assert.equal(projectUI.assignmentAcceptance(step,record).ok,false,'An absolute 1e-8 tolerance must not hide a changed eta');
}
// Reports must distinguish a defined but unresolved response from a genuinely
// undefined degeneracy, and carry both numerical grid differences with units.
for(const [key,defined,resolved]of [['hall-qwz-plateau',true,true],['hall-unresolved',true,false],['hall-closing',false,false]]){
 const record=captureFixture(key),summary=projectUI.evidenceSummary(record),r=record.result;
 assert.equal(r.selection.defined,defined);assert.equal(r.selection.numericallyResolved,resolved);
 assert.ok(summary.includes('有效性='+(defined?'已定义':'未定义')));
 assert.ok(summary.includes('网格状态='+(resolved?'两网格比较已稳定':'需要加密核验')));
 assert.ok(summary.includes('σ网格差='+views.num(r.checks.sigmaAbsoluteDifference)+' S'));
 assert.ok(summary.includes('α网格差='+views.num(r.checks.alphaAbsoluteDifference)+' A/K'));
 assert.doesNotMatch(summary,/NaN|Infinity|undefined/);
}
const completedProjects=new Map();
for(const template of projectUI.assignmentTemplates.filter(t=>Object.hasOwn(stageFixtures,t.id))){
 const empty=notebook.makeProject({title:template.title});empty.assignment={id:template.id,steps:{},conclusion:''};await notebook.saveProject(empty);
 const explanations=Object.fromEntries(template.steps.map((s,i)=>[s.id,`${template.id} 第 ${i+1} 步：<script>原始解释</script>；参数与诊断一起记录。`]));
 for(const step of template.steps){
  const key=stageFixtures[template.id][step.id],record=captureFixture(key),view=await projectMount(template),button=view.$('[data-pj-collect="'+step.id+'"]');
  assert.equal(button.disabled,false,template.id+'/'+step.id+' enables matching evidence');
  await button.onclick();view.$('#pj-note-'+step.id).value=explanations[step.id];await view.$('#pj-save').onclick();
  const stored=await savedProject(empty.id),evidence=stored.records.find(r=>r.id===stored.assignment.steps[step.id].recordId);
  assert.deepEqual(evidence.input,fixtures.requests[key].input);assert.deepEqual(evidence.result,JSON.parse(JSON.stringify(fixtures.results[key])),'JSON evidence preserves all arrays (signed zero normalizes in JSON)');
  assert.equal(evidence.release,notebook.RELEASE);assert.notEqual(evidence.id,record.id,'Project owns a copied evidence record');
 }
 const view=await projectMount(template);view.$('#pj-conclusion').value=template.question+'\n仍须解释模型边界。';await view.$('#pj-save').onclick();
 const restored=await projectMount(template);
 assert.match(restored.container.firstElementChild.innerHTML,/3 \/ 3 阶段已具备计算与解释/);
 for(const step of template.steps)assert.equal(restored.$('#pj-note-'+step.id).value,explanations[step.id],'Re-render restores '+template.id+'/'+step.id);
 assert.equal(restored.$('#pj-conclusion').value,template.question+'\n仍须解释模型边界。');
 assert.doesNotMatch(restored.container.firstElementChild.innerHTML,/<script>原始解释/);assert.match(restored.container.firstElementChild.innerHTML,/&lt;script&gt;/);
 await restored.$('#pj-json').onclick();const exported=JSON.parse(restored.downloads.at(-1).body),stored=await savedProject(empty.id);
 assert.deepEqual(exported,stored);assert.equal(exported.records.length,3);notebook.validateProject(exported);
 await restored.$('#pj-report').onclick();const report=restored.downloads.at(-1);assert.match(report.name,/\.md$/);
 for(const step of template.steps){const evidence=exported.records.find(r=>r.id===exported.assignment.steps[step.id].recordId);assert.ok(report.body.includes(projectUI.evidenceSummary(evidence)));assert.ok(report.body.includes(explanations[step.id]));assert.ok(report.body.includes(JSON.stringify(evidence.input,null,2)));}
 assert.ok(report.body.includes(exported.assignment.conclusion));completedProjects.set(template.id,await savedProject(empty.id));
}
// Re-collecting a stage retains its explanation and the earlier raw result.
let project=completedProjects.get(hallTemplate.id);const previous=structuredClone(project),firstStep=hallTemplate.steps[0];
project=projectUI.collectAssignmentRecord(project,hallTemplate,firstStep.id,captureFixture('project-geometry'));
assert.equal(project.records.length,4);assert.deepEqual(project.records.slice(0,3),previous.records);assert.deepEqual(previous,completedProjects.get(hallTemplate.id));
assert.notEqual(project.assignment.steps.geometry.recordId,previous.assignment.steps.geometry.recordId);assert.equal(project.assignment.steps.geometry.interpretation,previous.assignment.steps.geometry.interpretation);
const bad=structuredClone(project);bad.assignment.steps.geometry.recordId='missing';assert.throws(()=>notebook.validateProject(bad),/记录/);
const wrong=captureFixture('device-perfect');assert.throws(()=>projectUI.collectAssignmentRecord(project,hallTemplate,'geometry',wrong),/其他工具/);
assert.deepEqual(project.records.slice(0,3),previous.records,'Rejected collection leaves old evidence unchanged');
const ordinary=notebook.makeProject({title:'Existing ordinary material project',notes:'Keep this notebook unchanged.'});await notebook.saveProject(ordinary);
// Import through the UI, including unsaved notes in the current project. The
// source, destination and unrelated notebook must remain separate records.
const importing=await projectMount(hallTemplate),source=completedProjects.get(deviceTemplate.id),beforeImport=await notebook.listProjects();
importing.$('#pj-note-geometry').value='导入前尚未保存的几何笔记。';
const sourceJSON=JSON.stringify(source),importFile={size:Buffer.byteLength(sourceJSON),text:async()=>sourceJSON};
importing.$('#pj-import').onchange({target:{files:[importFile]}});await flush();
assert.match(importing.$('#pj-status').textContent,/独立副本/);
assert.equal(importing.$('#pj-save').disabled,false,'Import restores usable controls even with an ordinary notebook present');
const afterImport=await notebook.listProjects(),copy=afterImport.find(p=>!beforeImport.some(old=>old.id===p.id));
assert.equal(afterImport.length,beforeImport.length+1);assert.ok(copy);assert.notEqual(copy.id,source.id);assert.deepEqual(copy.assignment,source.assignment);assert.deepEqual(copy.records,source.records);
assert.deepEqual(await savedProject(source.id),source,'Import leaves the original SSH project untouched');assert.deepEqual(await savedProject(ordinary.id),ordinary,'Import leaves unrelated material projects untouched');
assert.equal((await savedProject(previous.id)).assignment.steps.geometry.interpretation,'导入前尚未保存的几何笔记。');
importing.$('#pj-note-weak').value='只修改导入副本的接触解释。';await importing.$('#pj-save').onclick();
assert.equal((await savedProject(copy.id)).assignment.steps.weak.interpretation,'只修改导入副本的接触解释。');assert.deepEqual(await savedProject(source.id),source,'Editing an imported copy cannot mutate its source');
for(const invalidText of ['{broken JSON',JSON.stringify(ordinary),JSON.stringify(bad)]){
 const snapshot=await notebook.listProjects();importing.$('#pj-import').onchange({target:{files:[{size:Buffer.byteLength(invalidText),text:async()=>invalidText}]}});await flush();
 assert.deepEqual(await notebook.listProjects(),snapshot,'Invalid/inapplicable imports do not overwrite saved projects');
 assert.ok(importing.$('#pj-status').textContent);assert.equal(importing.$('#pj-note-weak').value,'只修改导入副本的接触解释。');
}
const newView=await projectMount(hallTemplate),oldProjects=await notebook.listProjects();await newView.$('#pj-new').onclick();
assert.equal(newView.$('#pj-note-geometry').value,'');assert.equal((await notebook.listProjects()).length,oldProjects.length+1);
assert.equal(newView.$('#pj-save').disabled,false,'New assignment is usable alongside ordinary material notebooks');
assert.equal((await savedProject(previous.id)).assignment.steps.geometry.interpretation,'导入前尚未保存的几何笔记。','New assignment preserves the previous project');
assert.ok(searchEntries(toolsIndex,'Landauer').some(t=>t.route==='compute/device-transport-lab'));
console.log('Response UI: 17 presets, 36 gated steps, 9 project stages with strict parameter checks, Hall diagnostic reports, restored notes and non-destructive project import passed.');
