import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {assignmentTemplates,assignmentAcceptance,collectAssignmentRecord,renderResponseProjects} from '../dist/response-projects.js';
import {projectConditionDescriptor,projectConditionValue,renderProjectConditionFeedback} from '../dist/project-conditions.js?v=20261113-support1';
import * as notebook from '../dist/material-notebook.js?v=20261113-route1';

const originals=structuredClone(assignmentTemplates),stored=new Map(),moves=[];
globalThis.localStorage={getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
globalThis.document={createElement:tag=>new Element(tag),activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.location={hash:''};
const copy=structuredClone,setPath=(object,path,value)=>{const keys=path.split('.');let node=object;keys.slice(0,-1).forEach((key,index)=>{node=node[key]??=(/^\d+$/.test(keys[index+1])?[]:{});});node[keys.at(-1)]=value;};
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
let requirements=0;const actions=new Set(),pairs=new Set();
for(const template of assignmentTemplates)for(const step of template.steps){
 const input={};for(const [path,value]of Object.entries(step.requires))setPath(input,path,value);
 const record={action:step.action,input,result:{}};actions.add(step.action);
 const accepted=assignmentAcceptance(step,record);assert.equal(accepted.ok,true,template.id+'/'+step.id);
 assert.equal(accepted.mismatches.length,0);
 assert.equal(assignmentAcceptance(step,null).status,'missing');
 assert.equal(assignmentAcceptance(step,{...record,action:'wrong'}).status,'tool');
 for(const [path,value]of Object.entries(step.requires)){
  requirements++;pairs.add(step.action+'/'+path);
  const descriptor=projectConditionDescriptor(step.action,path);assert.equal(descriptor.covered,true,step.action+'/'+path+' has a registered human label');
  assert.ok(descriptor.label.length>1);assert.ok(fs.existsSync(new URL('../'+descriptor.source.split('#')[0],import.meta.url)),descriptor.source);
  const mismatch=copy(record),changed=typeof value==='number'?value+Math.max(Math.abs(value)*.1,1e-5):typeof value==='boolean'?!value:value+'-different';
  setPath(mismatch.input,path,changed);const rejected=assignmentAcceptance(step,mismatch);
  assert.equal(rejected.ok,false,step.action+'/'+path);assert.equal(rejected.mismatches.length,1);assert.equal(rejected.mismatches[0].path,path);assert.ok(rejected.reason.includes(path),'Legacy API consumers retain the parameter path');
  const absent=copy(record);setPath(absent.input,path,undefined);assert.equal(assignmentAcceptance(step,absent).ok,false);
  if(typeof value==='number'){
   for(const bad of [String(value),NaN,Infinity,-Infinity]){const wrongType=copy(record);setPath(wrongType.input,path,bad);assert.equal(assignmentAcceptance(step,wrongType).ok,false,'Reject nonfinite/wrong numeric type '+path);}
   const threshold=1e-10*Math.max(Math.abs(value),1e-9),roundoff=copy(record);setPath(roundoff.input,path,value+threshold/2);assert.equal(assignmentAcceptance(step,roundoff).ok,true,'Preserve original relative tolerance '+path);
   const changedTiny=copy(record);setPath(changedTiny.input,path,value+threshold*100);assert.equal(assignmentAcceptance(step,changedTiny).ok,false,'Preserve tight tiny-value comparison '+path);
  }
 }
}
assert.equal(assignmentTemplates.length,26);assert.equal(assignmentTemplates.reduce((n,t)=>n+t.steps.length,0),78);assert.equal(requirements,735);assert.equal(actions.size,33);assert.equal(pairs.size,312);
assert.deepEqual(assignmentTemplates,originals,'Templates and required values are unchanged');
for(const action of ['quantum_geometry_lab','hall_response_lab'])assert.match(projectConditionDescriptor(action,'mass').label,/无量纲/);
assert.match(projectConditionDescriptor('quantum_geometry_lab','energyScale').label,/模型单位/);
assert.doesNotMatch(projectConditionDescriptor('quantum_geometry_lab','energyScale').label,/eV|kg/);
assert.match(projectConditionDescriptor('hall_response_lab','energyScale').label,/eV/);
assert.match(projectConditionDescriptor('device_transport_lab','energy').label,/eV/);
assert.match(projectConditionDescriptor('band_connectivity','hopping').label,/模型能量单位/);
const descriptor=projectConditionDescriptor('device_transport_lab','spinDegeneracy');descriptor.options[0][1]='mutated';assert.notEqual(projectConditionDescriptor('device_transport_lab','spinDegeneracy').options[0][1],'mutated');
assert.equal(projectConditionDescriptor('constructor','prototype').covered,false);
assert.equal(projectConditionDescriptor('future','newCondition').label,'附加比较条件');
assert.equal(projectConditionValue('1'), '文本“1”');assert.equal(projectConditionValue(undefined),'未提供');

const spectra=read('./fixtures/spectroscopy.json'),template=assignmentTemplates.find(t=>t.id==='normal-andreev'),step=template.steps.find(s=>s.id==='normal');
const request=spectra.requests['old-device'],result=spectra.results['old-device'];
const capture=input=>notebook.captureCalculation(request.action,input,result,{title:'真实正常器件参照',route:'compute/device-transport-lab?preset=device-perfect'});
const good=capture(request.input);assert.equal(assignmentAcceptance(step,good).ok,true);
const unusual=copy(request.input);unusual.energy=.3;unusual.spinDegeneracy=2;
const recent=capture(unusual),beforeRecord=copy(recent),accept=assignmentAcceptance(step,recent);
assert.match(assignmentAcceptance(step,recent,{templateId:'normal-andreev'}).mismatches.find(x=>x.path==='spinDegeneracy').explanation,/NS 电导/);
assert.doesNotMatch(assignmentAcceptance(step,recent,{templateId:'ssh-device'}).mismatches.find(x=>x.path==='spinDegeneracy').explanation,/NS 电导/,'The SSH contact comparison must not acquire an unrelated NS comparison purpose');
assert.deepEqual(accept.mismatches.map(x=>x.path),['energy','spinDegeneracy']);
assert.match(accept.mismatches[1].label,/独立自旋通道数/);assert.match(accept.mismatches[1].currentText,/2/);assert.match(accept.mismatches[1].requiredText,/1/);
const feedback=renderProjectConditionFeedback(step,accept);
assert.match(feedback,/当前记录/);assert.match(feedback,/本阶段要求/);assert.match(feedback,/不会自动加入 SOC/);assert.match(feedback,/不据此判定/);
assert.doesNotMatch(feedback.split('<details>')[0],/spinDegeneracy|device_transport_lab/,'Technical paths stay outside the primary comparison');
assert.match(feedback,/<code>spinDegeneracy<\/code>/);
const hostile=assignmentAcceptance(step,{...recent,input:{...unusual,model:'<script>alert(1)</script>'}});
assert.doesNotMatch(renderProjectConditionFeedback(step,hostile),/<script>/);assert.match(renderProjectConditionFeedback(step,hostile),/&lt;script&gt;/);
assert.deepEqual(recent,beforeRecord,'Comparison never rewrites a recorded request or result');

const make=async title=>{let p=notebook.makeProject({title});p.assignment={id:template.id,steps:{normal:{recordId:'',interpretation:title+' stored note'}},conclusion:title+' conclusion'};p=collectAssignmentRecord(p,template,step.id,good);await notebook.saveProject(p);return p;};
const first=await make('first independent project'),second=await make('second independent project');
first.title=second.title=template.title;first.updated=second.updated='2026-11-13T09:25:42.000Z';await notebook.saveProject(first);await notebook.saveProject(second);
const firstBefore=copy((await notebook.listProjects()).find(p=>p.id===first.id));
const mount=async(selection={},callbacks={})=>{const container=new Container(),downloads=[];await renderResponseProjects({container,selection:{project:template.id,...selection},download:(body,name)=>downloads.push({body,name}),...callbacks});return{container,downloads,$:selector=>container.querySelector(selector)};};
const active=await mount({projectInstance:second.id,projectStep:'normal'},{canOpenCurrent:(action,input)=>action==='device_transport_lab'&&input.spinDegeneracy===2,onOpenLab:async navigation=>moves.push(navigation)});
assert.equal(active.$('#pj-project').value,second.id,'Select the exact saved instance, not the first template match');
const copyLabels=active.$('#pj-project').querySelectorAll('option').map(option=>option.textContent);assert.equal(new Set(copyLabels).size,2,'Default copies with the same name and saved second have distinguishable labels');assert.ok(copyLabels.every(label=>label.includes('09:25:42')&&label.includes('副本')));assert.ok(copyLabels.every(label=>!label.includes(first.id)&&!label.includes(second.id)),'Copy labels use short stable disambiguators, not full internal identifiers');
assert.equal(active.$('#pj-title').value,template.title);
assert.equal(active.$('#pj-note-normal').value,'second independent project stored note');
assert.equal(document.activeElement,active.$('#pj-stage-normal'));
assert.ok(active.$('#pj-stage-normal').getAttribute('aria-current')==='step');
assert.ok(active.$('[data-pj-current="normal"]'));assert.equal(active.$('[data-pj-current="normal"]').tag,'button');
assert.equal(active.$('[data-pj-collect="normal"]').disabled,true,'Comparison mismatch cannot enter stage evidence');
active.$('#pj-note-normal').value='unsaved note before tool navigation';
const renamed='My two-spin comparison <draft>';active.$('#pj-title').value='  '+renamed+'  ';
const preset=active.$('[data-pj-open="normal"]'),current=active.$('[data-pj-current="normal"]');
let prevented=0;
for(const key of ['ctrlKey','metaKey','shiftKey','altKey'])await preset.onclick({[key]:true,preventDefault(){prevented++;}});
await preset.onclick({button:1,preventDefault(){prevented++;}});assert.equal(prevented,0);assert.equal(moves.length,0,'Modified preset links preserve native navigation');
await current.onclick({preventDefault(){prevented++;}});
assert.equal(moves.length,1);assert.equal(moves[0].mode,'current');assert.equal(moves[0].projectId,second.id);assert.equal(moves[0].stepId,'normal');assert.equal(moves[0].templateId,template.id);assert.equal(moves[0].route,step.route);assert.deepEqual(moves[0].record,recent);assert.notEqual(moves[0].record,recent);
assert.equal((await notebook.listProjects()).find(p=>p.id===second.id).assignment.steps.normal.interpretation,'unsaved note before tool navigation','Save notes before handing off');
assert.equal(moves[0].templateTitle,template.title);assert.equal(moves[0].stepTitle,step.title,'Navigation context includes readable names without replacing stable IDs');
assert.equal(moves[0].projectTitle,renamed,'The source badge receives the current edited copy name after saving');
let named=(await notebook.listProjects()).find(p=>p.id===second.id);assert.equal(named.title,renamed);assert.equal(named.assignment.id,template.id);assert.equal(active.$('#pj-title').value,renamed);assert.doesNotMatch(active.container.firstElementChild.innerHTML,/<draft>/,'Copy names remain escaped in fields and picker labels');
await active.$('#pj-json').onclick();const namedExport=JSON.parse(active.downloads.at(-1).body);assert.equal(namedExport.title,renamed);assert.equal(namedExport.assignment.id,template.id);assert.deepEqual(namedExport.assignment.steps,named.assignment.steps);await active.$('#pj-report').onclick();assert.ok(active.downloads.at(-1).body.startsWith('# '+renamed+'\n'),'The research report preserves the edited copy name');
const currentAgain=active.$('[data-pj-current="normal"]');const count=moves.length;await current.onclick({preventDefault(){}});assert.equal(moves.length,count,'Detached controls cannot reopen tools');
await active.$('[data-pj-open="normal"]').onclick({preventDefault(){}});assert.equal(moves.at(-1).mode,'preset');assert.equal(moves.at(-1).record,undefined,'Preset action never silently borrows arbitrary current inputs');
const nProjects=(await notebook.listProjects()).length,recordsBefore=copy((await notebook.listProjects()).find(p=>p.id===second.id).records);
await active.$('#pj-keep-exploration').onclick();const projects=await notebook.listProjects();assert.equal(projects.length,nProjects+1);const independent=projects.find(p=>!p.assignment&&p.records.some(r=>r.input.spinDegeneracy===2));assert.ok(independent);assert.deepEqual(independent.records[0].input,recent.input);assert.deepEqual(independent.records[0].result,recent.result);assert.notEqual(independent.records[0].id,recent.id);assert.deepEqual(projects.find(p=>p.id===second.id).records,recordsBefore);assert.deepEqual(projects.find(p=>p.id===first.id),firstBefore,'Opening or saving another instance preserves the first instance');
const noAdapter=await mount({projectInstance:second.id},{onOpenLab:()=>{throw Error('Not used');}});assert.equal(noAdapter.$('[data-pj-current]'),null,'Do not pretend current-input restoration exists without an adapter');
const missing=await mount({projectInstance:'missing-saved-copy',projectStep:'normal'});assert.match(missing.$('#pj-status').textContent,/没有自动打开另一份副本/);assert.equal(missing.$('#pj-project').value,'','The picker also has no visually selected fallback copy');assert.equal(missing.$('#pj-save'),null,'Missing exact project does not fall back to another instance');
const fallback=await mount({projectInstance:second.id});await fallback.$('[data-pj-open="normal"]').onclick({preventDefault(){}});assert.equal(location.hash,step.route,'Standalone old consumer retains preset navigation');
const stale=fallback.$('[data-pj-open="normal"]').onclick;fallback.container.innerHTML='<p>another page</p>';location.hash='#unchanged';await stale({preventDefault(){}});assert.equal(location.hash,'#unchanged');
const invalidName=await mount({projectInstance:second.id});invalidName.$('#pj-title').value='   ';invalidName.$('#pj-note-normal').value='note retained while correcting the copy name';await invalidName.$('#pj-save').onclick();assert.match(invalidName.$('#pj-status').textContent,/非空名称/);assert.equal((await notebook.listProjects()).find(p=>p.id===second.id).title,renamed);assert.equal(invalidName.$('#pj-note-normal').value,'note retained while correcting the copy name');invalidName.$('#pj-title').value='x'.repeat(161);await invalidName.$('#pj-save').onclick();assert.match(invalidName.$('#pj-status').textContent,/最多160/);assert.equal((await notebook.listProjects()).find(p=>p.id===second.id).title,renamed);invalidName.$('#pj-title').value='x'.repeat(160);await invalidName.$('#pj-save').onclick();const maximumName=(await notebook.listProjects()).find(p=>p.id===second.id);assert.equal(maximumName.title.length,160);assert.equal(maximumName.assignment.id,template.id);assert.deepEqual((await notebook.listProjects()).find(p=>p.id===first.id),firstBefore);
assert.deepEqual(recent,beforeRecord);
console.log('Project condition explanations: 26 projects / 78 stages / 735 strict requirements / 312 human descriptors / 33 actions; all mismatches, units, tiny tolerances, nonfinite inputs, safe output, exact project/step, notes, modified links, independent exploration, guarded current-input handoff and stale controls passed.');
