import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {principlesAssignments,principlesEvidence,HBAR_MEV_NS} from '../dist/principles-projects.js?v=20261031-entry2';
import {parseClassroomRoute} from '../dist/classroom-ui.js?v=20261031-entry2';

const json=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const modules=['order','exchange','conservation','density'].map(id=>json('dist/data/'+id+'-content.json').module);
const requests={};
assert.equal(principlesAssignments.length,3);
assert.equal(new Set(principlesAssignments.map(p=>p.id)).size,3);
assert.deepEqual(new Set(principlesAssignments.map(p=>p.module)),new Set(['order','exchange','conservation']));
for(const project of principlesAssignments){
 assert.equal(project.steps.length,3);assert.equal(new Set(project.steps.map(s=>s.id)).size,3);
 assert.ok(new Set(project.steps.map(s=>s.action)).size>=2);assert.ok(project.rubric.length>=4);assert.ok(project.question.length>30);
 for(const step of project.steps){
  assert.ok(step.prompt.length>65);
  const url=new URL(step.route.slice(1),'https://example.test/'),module=modules.find(m=>m.action===step.action);
  assert.ok(module);assert.ok(parseClassroomRoute(step.route.slice(1)));assert.equal(url.pathname,'/compute/'+module.route);
  const preset=module.presets.find(p=>p.id===url.searchParams.get('preset'));
  assert.ok(preset,'actual preset '+step.route);
  const input={...Object.fromEntries(module.fields.map(f=>[f.key,f.default])),...preset.input};
  assert.deepEqual(input,step.requires,'every actual input field must be locked by project '+project.id+'/'+step.id);
  requests[project.id+'/'+step.id]={action:step.action,input};
 }
}
const changed=(a,b)=>Object.keys({...a,...b}).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
const input=(project,stage)=>requests[project+'/'+stage].input;
assert.deepEqual(changed(input('order-to-bond-constraints','bond'),input('order-to-bond-constraints','convention')),['conventionAngle','swapSites']);
assert.deepEqual(changed(input('bond-to-conserved-spin','dmi'),input('bond-to-conserved-spin','inversion')),['inversion']);
assert.deepEqual(changed(input('generator-to-dephasing','unitary'),input('generator-to-dephasing','bath')),['gammaPhi']);
if(process.argv.includes('--requests')){process.stdout.write(JSON.stringify(requests));process.exit(0);}

const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/principles-projects.json.gz',import.meta.url))));
assert.equal(fixture.format,'real-python-principles-project-fixtures');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');assert.deepEqual(fixture.requests,requests);
for(const [name,hash]of Object.entries(fixture.sourceHashes)){
 const text=fs.readFileSync(new URL('../dist/python/'+name,import.meta.url),'utf8').replace(/\r\n?/g,'\n');
 assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),hash,'regenerate fixtures after '+name+' changes');
}
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const closeArray=(a,b,tol=1e-9)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>Array.isArray(v)?closeArray(v,b[i],tol):close(v,b[i],tol));};
const result=(project,stage)=>fixture.results[project+'/'+stage];
for(const [key,request]of Object.entries(requests)){
 const output=fixture.results[key];assert.ok(output&&typeof output==='object');
 if(request.action==='density_matrix_lab'){
  assert.ok(output.checks['最大迹误差']<1e-9);assert.ok(output.checks['最大厄米误差']<1e-9);assert.ok(output.checks['全轨迹最小本征值']>=-1e-9);
 }else assert.equal(output.checks.passed,true);
 const evidence=principlesEvidence({...request,result:output});
 if(request.action==='density_matrix_lab'){assert.equal(evidence,null);continue;}
 assert.equal(typeof evidence,'string');assert.ok(evidence.length>30);assert.doesNotMatch(evidence,/NaN|Infinity|undefined|null/);
}
assert.equal(principlesEvidence({action:'unrelated',result:{}}),null);
const order=result('order-to-bond-constraints','direction').order;
assert.equal(order.groupOrder,8);assert.equal(order.stabilizerOrder,2);assert.equal(order.domains.length,4);
const retained=order.operations.filter(g=>g.retained).map(g=>g.matrix);
assert.ok(retained.some(m=>JSON.stringify(m)===JSON.stringify([[1,0],[0,-1]])),'polar xz mirror is retained');
const bond=result('order-to-bond-constraints','bond'),convention=result('order-to-bond-constraints','convention');
closeArray(bond.exchange.D,[0,.4,0]);closeArray(bond.exchange.tensor,convention.exchange.tensor);
closeArray(bond.exchange.levels,convention.convention.levels);close(bond.classical.energy,convention.classical.energy);
const q=convention.convention.rotation;
closeArray(convention.convention.D,[0,1,2].map(i=>-q.reduce((sum,row,j)=>sum+row[i]*bond.exchange.D[j],0)));
const dmi=result('bond-to-conserved-spin','dmi'),inv=result('bond-to-conserved-spin','inversion'),charges=result('bond-to-conserved-spin','generators').conservation;
closeArray(dmi.exchange.D,[0,0,.6*HBAR_MEV_NS],1e-14);closeArray(inv.exchange.D,[0,0,0],1e-14);
closeArray(inv.exchange.tensor,[[HBAR_MEV_NS,0,0],[0,HBAR_MEV_NS,0],[0,0,HBAR_MEV_NS]],1e-14);
closeArray(inv.exchange.levels.map(e=>e/HBAR_MEV_NS),charges.degeneracy.eigenvalues);
assert.ok(charges.proofs.slice(0,3).every(p=>p.conserved));assert.equal(charges.degeneracy.globalSU2,true);
assert.equal(charges.degeneracy.timeReversalSquare,1);assert.equal(charges.degeneracy.kramersProtected,false);
const unitary=result('generator-to-dephasing','unitary').conservation,bath=result('generator-to-dephasing','bath').conservation,density=result('generator-to-dephasing','density');
for(const c of [unitary,bath])assert.equal(c.proofs.find(p=>p.id==='sz').conserved,true);
assert.ok(bath.proofs.find(p=>p.id==='sx').dissipatorNorm>0);
assert.equal(bath.trajectory.length,density.stateSnapshots.length);
for(const [i,row]of bath.trajectory.entries()){
 const other=density.stateSnapshots[i];close(row.time,other.time);close(row.purity,other.purity);
 close(row.purity,(1+Math.exp(-.5*row.time))/2);close(unitary.trajectory[i].purity,1);
 closeArray(row.rho.re,other.rho.re);closeArray(row.rho.im,other.rho.im);
 closeArray(['sx','sy','sz'].map(k=>2*row.expectations[k]),other.blochA);
}

// The rest exercises actual collection/import/export handlers, not a parallel UI.
const {Container,Element,flush}=await import('./test-material-research-ui.mjs');

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.location={hash:''};
const projects=await import('../dist/response-projects.js?v=20261031-entry2');
const notebook=await import('../dist/material-notebook.js?v=20261031-entry2');
const normalize=value=>JSON.parse(JSON.stringify(value));
const saved=async id=>(await notebook.listProjects()).find(p=>p.id===id);
const mount=async(template)=>{
 const container=new Container(),downloads=[];
 await projects.renderResponseProjects({container,selection:{project:template.id},download:(body,name,type)=>downloads.push({body,name,type})});
 return{container,downloads,$:selector=>container.querySelector(selector)};
};
const capture=(template,step,input=null)=>{
 const key=template.id+'/'+step.id,request=fixture.requests[key];
 assert.ok(request,key+' has a genuine Python fixture');
 return notebook.captureCalculation(request.action,input||request.input,fixture.results[key],{title:key,route:step.route.slice(1)});
};
const setPath=(object,path,value,remove=false)=>{
 const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((o,k)=>o[k],object);
 if(remove)delete parent[last];else parent[last]=value;
};
const stageRecord=(project,step)=>project.records.find(r=>r.id===project.assignment.steps[step.id]?.recordId);
const safeSummary=record=>{const summary=projects.evidenceSummary(record);assert.equal(typeof summary,'string');assert.doesNotMatch(summary,/NaN|Infinity|undefined/);return summary;};
const importFile=body=>({size:Buffer.byteLength(body),text:async()=>body});

for(const template of principlesAssignments)assert.deepEqual(projects.assignmentTemplates.find(t=>t.id===template.id),template);
// Preserve all seventeen other assignment kinds and an ordinary material notebook
// while creating/importing new projects through the actual project UI.
assert.equal(projects.assignmentTemplates.length,26);
assert.equal(projects.assignmentTemplates.filter(t=>!principlesAssignments.some(p=>p.id===t.id)).length,23);
const originals=new Map();
for(const template of projects.assignmentTemplates.filter(t=>!principlesAssignments.some(p=>p.id===t.id))){
 const project=notebook.makeProject({title:'已有项目 · '+template.title,notes:'保留旧记录。'});
 project.assignment={id:template.id,steps:{},conclusion:'原结论'};
 await notebook.saveProject(project);originals.set(project.id,normalize(project));
}
const ordinary=notebook.makeProject({title:'普通材料记录',notes:'不可覆盖。'});
await notebook.saveProject(ordinary);originals.set(ordinary.id,normalize(ordinary));
const completed=new Map(),copies=new Map();
let checkedConstraints=0;

for(const template of principlesAssignments){
 let view=await mount(template);
 assert.equal(view.$('#pj-template').value,template.id);
 assert.equal(view.$('#pj-template').querySelectorAll('option').length,26);
 assert.equal(view.$('#pj-save'),null,'no project exists before the UI creates it');
 const beforeNew=await notebook.listProjects();
 await view.$('#pj-new').onclick();
 assert.match(view.$('#pj-status').textContent,/已建立独立项目/);
 assert.ok(view.$('#pj-save'),'notebook validation must accept the new assignment id');
 const project=(await notebook.listProjects()).find(p=>!beforeNew.some(old=>old.id===p.id));
 assert.ok(project);assert.equal(project.assignment.id,template.id);
 assert.match(view.container.firstElementChild.innerHTML,/0 \/ 3 阶段/);
 const notes=Object.fromEntries(template.steps.map((s,i)=>[s.id,`${template.id} / 第${i+1}阶段：<script>原始解释</script> & 参数、单位、模型边界。`]));

 for(const [stageIndex,step]of template.steps.entries()){
  const record=capture(template,step),key=template.id+'/'+step.id;
  assert.ok(record,key+' action is allowed by the notebook');
  assert.equal(projects.assignmentAcceptance(step,record).ok,true,key+' accepts its real request');
  assert.equal(projects.assignmentAcceptance(step,null).ok,false);
  assert.equal(projects.assignmentAcceptance(step,{...record,action:'wrong_action'}).ok,false);
  // Exercise every required parameter in the production matcher.
  // A same-tool calculation with different inputs is invalid.
  for(const [path,value]of Object.entries(step.requires)){
   const mismatch=structuredClone(record);
   setPath(mismatch.input,path,typeof value==='number'?value+Math.max(.01,Math.abs(value)*.1):typeof value==='boolean'?!value:value+'-changed');
   const rejection=projects.assignmentAcceptance(step,mismatch);
   assert.equal(rejection.ok,false,key+' rejects changed '+path);assert.ok(rejection.reason.includes(path));
   const absent=structuredClone(record);setPath(absent.input,path,null,true);
   assert.equal(projects.assignmentAcceptance(step,absent).ok,false,key+' rejects missing '+path);
   if(typeof value==='number'){
    const string=structuredClone(record);setPath(string.input,path,String(value));
    assert.equal(projects.assignmentAcceptance(step,string).ok,false,key+' rejects textual '+path);
   }
   checkedConstraints++;
  }
  const [path,value]=Object.entries(step.requires).at(-1),badInput=structuredClone(record.input);
  setPath(badInput,path,typeof value==='number'?value+.1:typeof value==='boolean'?!value:value+'-wrong');
  capture(template,step,badInput);view=await mount(template);
  assert.equal(view.$(`[data-pj-collect="${step.id}"]`).disabled,true,key+' disables mismatched collection');
  const unchanged=await saved(project.id);
  // Also check the handler's validation if invoked programmatically: rejection
  // cannot add a misleading result even if a disabled button event is forced.
  await view.$(`[data-pj-collect="${step.id}"]`).onclick();
  assert.deepEqual(await saved(project.id),unchanged);
  assert.match(view.$('#pj-status').textContent,/本阶段要求/);

  const fresh=capture(template,step);view=await mount(template);
  assert.equal(view.$(`[data-pj-collect="${step.id}"]`).disabled,false);
  view.$('#pj-note-'+step.id).value=notes[step.id];
  await view.$(`[data-pj-collect="${step.id}"]`).onclick();
  assert.match(view.$('#pj-status').textContent,/已保存完整输入/);
  const stored=await saved(project.id),evidence=stageRecord(stored,step);
  assert.equal(stored.records.length,stageIndex+1);
  assert.notEqual(evidence.id,fresh.id,'collection copies a record into the project');
  assert.deepEqual(evidence.input,normalize(fixture.requests[key].input));
  assert.deepEqual(evidence.result,normalize(fixture.results[key]),key+' preserves full matrices, eigenvectors and spectra');
  assert.equal(evidence.created,fresh.created);assert.equal(evidence.release,notebook.RELEASE);
  assert.equal(stored.assignment.steps[step.id].interpretation,notes[step.id]);
  safeSummary(evidence);
  // Separate re-render verifies restoration rather than merely reading the
  // input element that the test has just assigned.
  view=await mount(template);
  assert.equal(view.$('#pj-note-'+step.id).value,notes[step.id]);
  assert.match(view.container.firstElementChild.innerHTML,/&lt;script&gt;原始解释/);
  assert.doesNotMatch(view.container.firstElementChild.innerHTML,/<script>原始解释/);
 }

 const conclusion=template.question+'\n根据完整证据解释；不等同于真实材料拟合。';
 view.$('#pj-conclusion').value=conclusion;await view.$('#pj-save').onclick();
 view=await mount(template);
 assert.equal(view.$('#pj-conclusion').value,conclusion);
 assert.match(view.container.firstElementChild.innerHTML,/3 \/ 3 阶段已具备计算与解释/);
 assert.match(view.container.firstElementChild.innerHTML,/不代表解释已被自动判为正确/);
 for(const step of template.steps)assert.equal(view.$('#pj-note-'+step.id).value,notes[step.id]);

 await view.$('#pj-json').onclick();
 const exportItem=view.downloads.at(-1),exported=JSON.parse(exportItem.body);
 assert.equal(exportItem.name,template.id+'-project.json');
 assert.deepEqual(exported,await saved(project.id));notebook.validateProject(exported);
 assert.equal(exported.records.length,3);
 await view.$('#pj-report').onclick();
 const report=view.downloads.at(-1);
 assert.equal(report.name,template.id+'-report.md');
 assert.ok(report.body.includes(conclusion));
 for(const step of template.steps){
  const evidence=stageRecord(exported,step);
  for(const text of [step.prompt,notes[step.id],safeSummary(evidence),JSON.stringify(evidence.input,null,2),evidence.release])assert.ok(report.body.includes(text),template.id+' report retains '+text.slice(0,35));
 }
 for(const criterion of template.rubric)assert.ok(report.body.includes(criterion));
 completed.set(template.id,exported);

 // Import via its real file-input handler. Unsaved current notes are first
 // persisted; the imported JSON restores a separate copy of the exported state.
 const first=template.steps[0],unsaved='导入前的新草稿 · '+template.id;
 view.$('#pj-note-'+first.id).value=unsaved;
 const beforeImport=await notebook.listProjects();
 view.$('#pj-import').onchange({target:{files:[importFile(exportItem.body)]}});await flush();
 assert.match(view.$('#pj-status').textContent,/独立副本/);
 const afterImport=await notebook.listProjects(),copy=afterImport.find(p=>!beforeImport.some(old=>old.id===p.id));
 assert.equal(afterImport.length,beforeImport.length+1);assert.ok(copy);assert.notEqual(copy.id,project.id);
 assert.deepEqual(copy.records,exported.records);assert.deepEqual(copy.assignment,exported.assignment);
 assert.equal((await saved(project.id)).assignment.steps[first.id].interpretation,unsaved);
 assert.deepEqual((await saved(project.id)).records,exported.records);
 assert.equal(view.$('#pj-note-'+first.id).value,notes[first.id]);
 assert.equal(view.$('#pj-conclusion').value,conclusion);
 assert.equal(view.$('#pj-project').value,copy.id);
 view.$('#pj-note-'+first.id).value='只编辑副本 · '+template.id;await view.$('#pj-save').onclick();
 assert.equal((await saved(copy.id)).assignment.steps[first.id].interpretation,'只编辑副本 · '+template.id);
 assert.equal((await saved(project.id)).assignment.steps[first.id].interpretation,unsaved);
 copies.set(template.id,copy.id);

 const broken=normalize(exported);broken.assignment.steps[first.id].recordId='nonexistent-record';
 for(const invalid of ['{malformed',JSON.stringify(ordinary),JSON.stringify(broken)]){
  const snapshot=await notebook.listProjects();
  view.$('#pj-import').onchange({target:{files:[importFile(invalid)]}});await flush();
  assert.deepEqual(await notebook.listProjects(),snapshot,'invalid import cannot overwrite any saved project');
  assert.equal(view.$('#pj-note-'+first.id).value,'只编辑副本 · '+template.id);
  assert.equal(view.$('#pj-save').disabled,false);
 }
}

// Re-collect one stage through the UI and ensure earlier raw evidence and the
// student's interpretation survive as history, rather than being overwritten.
const template=principlesAssignments[0],first=template.steps[0],copyId=copies.get(template.id);
capture(template,first);const revisit=await mount(template);
if(revisit.$('#pj-project').value!==copyId){revisit.$('#pj-project').value=copyId;revisit.$('#pj-project').onchange({target:{value:copyId}});await flush();}
const previous=await saved(copyId);
await revisit.$(`[data-pj-collect="${first.id}"]`).onclick();
const recollected=await saved(copyId);
assert.equal(recollected.records.length,4);assert.deepEqual(recollected.records.slice(0,3),previous.records);
assert.notEqual(recollected.assignment.steps[first.id].recordId,previous.assignment.steps[first.id].recordId);
assert.equal(recollected.assignment.steps[first.id].interpretation,previous.assignment.steps[first.id].interpretation);
assert.equal((await saved(completed.get(template.id).id)).records.length,3,'copy recollection leaves the original intact');
for(const [id,original]of originals)assert.deepEqual(await saved(id),original,'existing assignments and ordinary notebooks remain intact');
assert.equal((await notebook.listProjects()).length,originals.size+6);
console.log(`Principles projects: 3 projects / 9 genuine Python stages, ${checkedConstraints} strict input constraints; matched physics, source hashes, collection/history, restored notes, JSON/Markdown exports, independent copy imports, 17 other assignments and ordinary notebook preserved.`);
