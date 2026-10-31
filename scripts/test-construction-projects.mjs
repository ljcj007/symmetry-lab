import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {constructionAssignments,constructionEvidence} from '../dist/construction-projects.js?v=20261031-connections1';
import {parseClassroomRoute} from '../dist/classroom-ui.js?v=20261031-connections1';

const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const modules=['salc','wavevector','nonsymmorphic','bandrep'].map(id=>read('dist/data/'+id+'-content.json').module);
const requests={};
assert.equal(constructionAssignments.length,3);
assert.equal(new Set(constructionAssignments.map(p=>p.id)).size,3);
assert.deepEqual(new Set(constructionAssignments.map(p=>p.module)),new Set(['salc','wavevector','nonsymmorphic']));
for(const project of constructionAssignments){
 assert.equal(project.steps.length,3);assert.equal(new Set(project.steps.map(s=>s.id)).size,3);
 assert.ok(new Set(project.steps.map(s=>s.action)).size>=2);assert.ok(project.rubric.length>=4);assert.ok(project.question.length>30);
 for(const step of project.steps){
  assert.ok(step.prompt.length>65);
  const url=new URL(step.route.slice(1),'https://example.test/'),module=modules.find(m=>m.action===step.action);
  assert.ok(module);assert.ok(parseClassroomRoute(step.route.slice(1)));assert.equal(url.pathname,'/compute/'+module.route);
  const preset=module.presets.find(p=>p.id===url.searchParams.get('preset'));
  assert.ok(preset,'actual preset '+step.route);
  const input={...Object.fromEntries(module.fields.map(f=>[f.key,f.default])),...preset.input};
  assert.deepEqual(input,step.requires,'lock every actual input: '+project.id+'/'+step.id);
  requests[project.id+'/'+step.id]={action:step.action,input};
 }
}
const changed=(a,b)=>Object.keys({...a,...b}).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
const input=(project,stage)=>requests[project+'/'+stage].input;
assert.deepEqual(changed(input('order-to-nonsymmorphic-mass','unbroken'),input('order-to-nonsymmorphic-mass','mass')),['mass']);
assert.deepEqual(changed(input('site-to-spinful-screw','single'),input('site-to-spinful-screw','double')),['spinful']);
if(process.argv.includes('--requests')){process.stdout.write(JSON.stringify(requests));process.exit(0);}

const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/construction-projects.json.gz',import.meta.url))));
assert.equal(fixture.format,'real-python-construction-project-fixtures');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');assert.deepEqual(fixture.requests,requests);
for(const [name,hash]of Object.entries(fixture.sourceHashes)){
 const text=fs.readFileSync(new URL('../dist/python/'+name,import.meta.url),'utf8').replace(/\r\n?/g,'\n');
 assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),hash,'regenerate fixtures after '+name+' changes');
}
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const closeArray=(a,b,tol=1e-9)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>Array.isArray(v)?closeArray(v,b[i],tol):close(v,b[i],tol));};
const result=(project,stage)=>fixture.results[project+'/'+stage];
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)));
const trace=a=>a.reduce((sum,row,i)=>sum+row[i],0);
const complexProduct=(a,b)=>({re:multiply(a.re,b.re).map((row,i)=>row.map((v,j)=>v-multiply(a.im,b.im)[i][j])),im:multiply(a.re,b.im).map((row,i)=>row.map((v,j)=>v+multiply(a.im,b.re)[i][j]))});
const identity=(n,sign=1)=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?sign:0));
for(const [key,request]of Object.entries(requests)){
 const output=fixture.results[key];assert.equal(output.checks.passed,true);
 const evidence=constructionEvidence({...request,result:output});
 if(request.action==='band_rep_lab'){assert.equal(evidence,null);continue;}
 assert.equal(typeof evidence,'string');assert.ok(evidence.length>30);assert.doesNotMatch(evidence,/NaN|Infinity|undefined|null/);
 assert.ok(output.replay.length>=4);
 assert.equal(fixture.grading[key].equivalent.passed,true);
 assert.equal(fixture.grading[key].wrong.passed,false);
}
assert.equal(constructionEvidence({action:'unrelated',result:{}}),null);
const local=result('salc-to-fourier-star','local'),copies=result('salc-to-fourier-star','copies'),star=result('salc-to-fourier-star','star');
close(trace(local.salc.projector.re),2);close(trace(copies.salc.projector.re),4);
const he=copies.salc.blockedHamiltonian.re.slice(4).map(row=>row.slice(4));
closeArray(he,[[0,0,.6,0],[0,0,0,.6],[.6,0,.8,0],[0,.6,0,.8]]);
assert.equal(star.wavevector.realDimension,4);assert.equal(star.wavevector.translationIndex,4);
const b=star.wavevector.basis.re,operators=star.grading.tasks[0].operators;
const c4=multiply(multiply(transpose(b),operators[2].re),b),mirror=multiply(multiply(transpose(b),operators[3].re),b);
close(trace(c4),0);close(trace(mirror),2);close(trace(multiply(c4,c4)),0);close(trace(multiply(c4,mirror)),0);
assert.ok(Math.abs(trace(multiply(multiply(transpose(b),operators[0].re),b))-4)>1,'translations are not identity on the full star');
const pattern=result('order-to-nonsymmorphic-mass','pattern').wavevector;
closeArray(pattern.field,[1,-1,1,-1]);assert.equal(pattern.translationIndex,2);assert.equal(pattern.translationDomainCount,2);
const unbroken=result('order-to-nonsymmorphic-mass','unbroken'),mass=result('order-to-nonsymmorphic-mass','mass');
const h0=unbroken.nonsymmorphic.selectedHamiltonian,hm=mass.nonsymmorphic.selectedHamiltonian;
closeArray(hm.re.map((row,i)=>row.map((x,j)=>x-h0.re[i][j])),[[.3,0,0,0],[0,.3,0,0],[0,0,-.3,0],[0,0,0,-.3]]);
closeArray(hm.im,h0.im);assert.ok(mass.nonsymmorphic.spatialResidual>.1);assert.ok(mass.nonsymmorphic.timeReversalResidual<1e-9);
assert.equal(unbroken.nonsymmorphic.partnerSwitchProtected,true);assert.equal(mass.nonsymmorphic.partnerSwitchProtected,false);
const series=mass.plots.find(p=>p.id==='nonsymmorphic-bands').series;
close(Math.min(...series[2].points.map((p,i)=>p[1]-series[1].points[i][1])),.6);
assert.ok(mass.nonsymmorphic.endpoints.every(ep=>ep.kramersProtected));
const induced=result('site-to-spinful-screw','induced'),single=result('site-to-spinful-screw','single'),double=result('site-to-spinful-screw','double');
assert.equal(induced.orbitDimension,2);close(induced.checks.screwSquareResidual,0);
const sm=induced.representation.matrices[induced.screw.operationIndex];
const s={re:sm.map(row=>row.map(v=>v.re)),im:sm.map(row=>row.map(v=>v.im))};
closeArray(complexProduct(s,s).re,identity(2,-1));
closeArray(complexProduct(single.nonsymmorphic.selectedOperation,single.nonsymmorphic.selectedOperation).re,identity(2,-1));
closeArray(complexProduct(double.nonsymmorphic.selectedOperation,double.nonsymmorphic.selectedOperation).re,identity(4,1));
for(const [record,expected]of [[single,1],[double,-1]]){
 const t=record.nonsymmorphic.timeReversalUnitary,tc={re:t.re,im:t.im.map(row=>row.map(v=>-v))};
 closeArray(complexProduct(t,tc).re,identity(t.re.length,expected));
}
assert.ok(single.nonsymmorphic.endpoints.every(ep=>!ep.kramersProtected));
assert.ok(double.nonsymmorphic.endpoints.every(ep=>ep.kramersProtected));
assert.equal(double.grading.tasks[0].reference.re[0].length,2);

// Exercise actual project collection, storage, report and import handlers.
const {Container,Element,flush}=await import('./test-material-research-ui.mjs');
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.document={createElement:tag=>new Element(tag)};globalThis.location={hash:''};
const projects=await import('../dist/response-projects.js?v=20261031-connections1');
const notebook=await import('../dist/material-notebook.js?v=20261031-connections1');
const clone=x=>JSON.parse(JSON.stringify(x));
assert.equal(projects.assignmentTemplates.length,23);
assert.equal(projects.assignmentTemplates.filter(t=>!constructionAssignments.some(p=>p.id===t.id)).length,20);
const original=notebook.makeProject({title:'旧研究记录',notes:'不得覆盖'});await notebook.saveProject(original);
const mount=async(template,byModule=false)=>{const container=new Container(),downloads=[];await projects.renderResponseProjects({container,selection:byModule?{module:template.module}:{project:template.id},download:(body,name,type)=>downloads.push({body,name,type})});return{container,downloads,$:s=>container.querySelector(s)};};
let constraints=0;
for(const template of constructionAssignments){
 assert.deepEqual(projects.assignmentTemplates.find(t=>t.id===template.id),template);
 const filtered=await mount(template,true);
 assert.equal(filtered.$('#pj-template').value,template.id,'classroom/module link selects its assignment');
 assert.equal(filtered.$('#pj-template').querySelectorAll('option').length,23,'all projects remain selectable');
 let view=await mount(template),before=await notebook.listProjects();await view.$('#pj-new').onclick();
 const project=(await notebook.listProjects()).find(p=>!before.some(v=>v.id===p.id));assert.ok(project);
 for(const step of template.steps){
  const key=template.id+'/'+step.id,request=requests[key];
  const record=notebook.captureCalculation(request.action,request.input,fixture.results[key],{title:key,route:step.route.slice(1)});
  assert.ok(record);assert.equal(projects.assignmentAcceptance(step,record).ok,true);
  for(const [name,value]of Object.entries(step.requires)){
   const wrong=clone(record);wrong.input[name]=typeof value==='number'?value+.1:value+'-wrong';
   assert.equal(projects.assignmentAcceptance(step,wrong).ok,false,key+' rejects '+name);
   delete wrong.input[name];assert.equal(projects.assignmentAcceptance(step,wrong).ok,false);constraints++;
  }
  view=await mount(template);assert.equal(view.$(`[data-pj-collect="${step.id}"]`).disabled,false);
  view.$('#pj-note-'+step.id).value='计算、回放、子空间与模型边界：'+step.title;
  await view.$(`[data-pj-collect="${step.id}"]`).onclick();
  const stored=(await notebook.listProjects()).find(p=>p.id===project.id),saved=stored.records.find(r=>r.id===stored.assignment.steps[step.id].recordId);
  assert.deepEqual(saved.result,clone(fixture.results[key]));assert.deepEqual(saved.input,request.input);
  assert.ok(projects.evidenceSummary(saved).length>20);
 }
 view=await mount(template);view.$('#pj-conclusion').value='根据真实矩阵与模型假设给出结论。';await view.$('#pj-save').onclick();
 view=await mount(template);assert.match(view.container.firstElementChild.innerHTML,/3 \/ 3 阶段已具备计算与解释/);
 await view.$('#pj-json').onclick();const exported=view.downloads.at(-1),body=JSON.parse(exported.body);
 assert.equal(body.records.length,3);notebook.validateProject(body);
 await view.$('#pj-report').onclick();const report=view.downloads.at(-1).body;
 for(const step of template.steps)assert.ok(report.includes(step.prompt));
 assert.ok(report.includes('根据真实矩阵与模型假设给出结论。'));
 before=await notebook.listProjects();view.$('#pj-import').onchange({target:{files:[{size:Buffer.byteLength(exported.body),text:async()=>exported.body}]}});await flush();
 const all=await notebook.listProjects(),imported=all.find(p=>!before.some(v=>v.id===p.id));
 assert.ok(imported);assert.notEqual(imported.id,project.id);assert.deepEqual(imported.records,body.records);assert.deepEqual(imported.assignment,body.assignment);
 assert.match(view.$('#pj-status').textContent,/独立副本/);
}
assert.deepEqual((await notebook.listProjects()).find(p=>p.id===original.id),original);
console.log(`Construction projects: 3 assignments, 9 real Python stages, 8 grading pairs, ${constraints} locked inputs, algebra and real project import/export passed.`);
