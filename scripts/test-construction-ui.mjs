import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';
import katex from '../dist/vendor/katex/katex.mjs';
import {segmentFormula} from '../dist/math-notation.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const hash=text=>createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('hex');
const data=JSON.parse(read('../dist/data/construction-materials.json'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/construction.json.gz',import.meta.url))));
const files=['salc_lab.py','wavevector_lab.py','nonsymmorphic_lab.py','symmetry_grading.py'];
assert.equal(fixture.format,'real-python-construction-fixtures');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');
assert.equal(fixture.release,data.release);
assert.deepEqual(Object.keys(fixture.sourceHashes).sort(),files.sort());
for(const file of files)assert.equal(fixture.sourceHashes[file],hash(read('../dist/python/'+file)),file+': rebuild genuine fixtures after core changes');
assert.equal(fixture.catalogSHA256,hash(read('../dist/data/construction-materials.json')),'Rebuild genuine fixtures after catalogue changes');
const requests={};
for(const m of data.modules)for(const p of m.presets)requests[p.id]={action:m.action,input:{...Object.fromEntries(m.fields.map(f=>[f.key,f.default])),...p.input}};
assert.deepEqual(fixture.requests,requests);
assert.deepEqual(Object.keys(fixture.results).sort(),Object.keys(requests).sort());
assert.equal(data.modules.length,3);assert.equal(Object.keys(requests).length,21);
assert.equal(data.lessons.length,9);assert.equal(data.exercises.reduce((n,e)=>n+e.steps.length,0),36);
assert.equal(data.modules.reduce((n,m)=>n+m.predictions.length,0),6);
assert.equal(data.cases.length,9);

// Validate the exact formula strings rendered by lessons and actual Python
// results. Conjugation is a superscript, not a baseline multiplication star.
const formulas=[...data.lessons.flatMap(l=>l.sections.map(s=>s.formula).filter(Boolean)),...Object.values(fixture.results).flatMap(r=>r.formulaLinks.map(f=>f.formula))];
for(const formula of new Set(formulas)){
 assert.doesNotMatch(formula,/\)\*|D⁽[ᴱᴼ]⁾/,'Use explicit superscript conjugation/representation labels: '+formula);
 const parts=segmentFormula(formula);assert.equal(parts.map(p=>p.source).join(''),formula);
 for(const part of parts){
  if(part.type==='math'){
   const html=katex.renderToString(part.tex,{throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'});
   assert.match(html,/<math /);assert.doesNotMatch(html,/katex-error/);
   if(part.source.includes('^*'))assert.match(part.tex,/\^\{\*\}/,'Conjugate star stays superscript');
  }else assert.doesNotMatch(part.source,/[_^]/,'No raw script notation may silently fall back to text');
 }
}

Element.prototype.closest=function(selector){let e=this;while(e instanceof Element){if(e.matches(selector))return e;e=e.parentNode;}return null;};
Element.prototype.focus=function(options){this.focusOptions=options;this.focused=true;};
Element.prototype.scrollIntoView=function(options){this.scrollOptions=options;};
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/construction-ui.js');
const canonical=v=>JSON.stringify(v&&typeof v==='object'?(Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))]))):v);
const gradingLookup=new Map();
for(const exchange of Object.values(fixture.grading))for(const mode of ['example','grade'])gradingLookup.set(canonical(exchange[mode].request),exchange[mode].response);
const calls=[],gradeCalls=[];
const run=async(action,input)=>{
 if(action==='symmetry_grading'){
  gradeCalls.push(structuredClone(input));const response=gradingLookup.get(canonical(input));
  assert.ok(response,'Grade request must match a genuine Python exchange: '+canonical(input));return structuredClone(response);
 }
 calls.push({action,input:structuredClone(input)});
 const id=Object.keys(requests).find(k=>requests[k].action===action&&canonical(requests[k].input)===canonical(input));
 assert.ok(id,'Must execute a genuine recorded preset: '+action+' '+JSON.stringify(input));return structuredClone(fixture.results[id]);
};
const mount=async(selection={},runner=run)=>{
 const container=new Container(),downloads=[],navigations=[],cancelled=[];
 await ui.renderConstructionView({container,selection,run:runner,download:(body,name,type)=>downloads.push({body,name,type}),cancelRun:()=>cancelled.push(true),onNavigate:r=>navigations.push(r)});
 return {container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};
};
const submit=async v=>{v.$('#pw-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,key,value)=>{const el=v.$('#pw-'+key);assert.ok(el,key);el.value=String(value);v.$('#pw-form').oninput({target:el});};
const select=async(v,id,value)=>{const el=v.$(id);assert.ok(el,id);el.value=String(value);await el.onchange({target:el});await flush();};
const finiteHTML=el=>assert.doesNotMatch(el.innerHTML,/\b(?:NaN|Infinity|undefined)\b/);
assert.equal(classroomPathways.length,7);
for(const c of data.cases){
 const m=data.modules.find(m=>m.id===c.module);assert.ok(m.presets.some(p=>p.id===c.preset),c.id);
 for(const [,href] of c.links||[])if(href.startsWith('#compute/'))assert.ok(knownTool(href.slice(1).split('?')[0]),href);
}
for(const m of data.modules){
 assert.ok(knownTool('compute/'+m.route));
 const route=parseClassroomRoute('compute/'+m.route+'?module=wrong&tab=derive');
 assert.equal(route.module,m.id);assert.equal(route.section,'construction');assert.equal(route.tab,'lab');
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 const course=parseClassroomRoute(ui.constructionCourseRoute(m.id,'tab=derive&material=example'));
 assert.equal(course.section,'construction');assert.equal(course.module,m.id);assert.equal(course.material,'example');
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(course)),course);
 for(const p of m.presets){
  const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);
  assert.deepEqual(calls.at(-1),requests[p.id]);assert.equal(ui.getConstructionResult().module,m.id);
  const result=fixture.results[p.id];finiteHTML(v.$('#pw-result'));assert.ok(v.$('#pw-result').querySelector('svg'));
  if(['salc','nonsymmorphic'].includes(m.id))assert.ok(result.breaking,'A real breaking challenge is required for '+m.id);
  assert.ok(v.$('#br-prediction-panel'));
  // Every construction frame, complex component and graph node is reachable.
  for(let i=0;i<result.replay.length;i++){
   v.$('#ct-replay-step').value=String(i);v.$('#ct-replay-step').oninput();
   assert.ok(v.$('#ct-replay-info').textContent.includes(result.replay[i].title));finiteHTML(v.$('#ct-replay-info'));
  }
  assert.ok(v.$('#ct-replay-next').disabled);v.$('#ct-replay-prev').onclick();
  assert.equal(Number(v.$('#ct-replay-step').value),result.replay.length-2);
  await select(v,'#ct-component','im');finiteHTML(v.$('#ct-replay-info'));
  for(const node of result.subgroupGraph.nodes){await select(v,'#ct-graph-select',node.id);assert.ok(v.$('#ct-graph-info').textContent.includes(node.label));}
  const graphNode=v.$('[data-ct-node="'+result.subgroupGraph.nodes[0].id+'"]');graphNode.onkeydown({key:'Enter',preventDefault(){}});
  assert.equal(v.$('#ct-graph-select').value,result.subgroupGraph.nodes[0].id);
  // Every challenge verdict must equal its actual Python candidate evidence.
  for(const candidate of result.breaking?.candidates||[]){
   for(const el of v.container.querySelectorAll('[data-ct-break]')){el.checked=candidate.removed.includes(el.dataset.ctBreak);el.onchange();}
   v.$('#ct-challenge-check').onclick();const feedback=v.$('#ct-challenge-feedback').textContent;
   assert.ok(feedback.includes(candidate.reason));assert.match(feedback,candidate.achieved?/目标达成/:/尚未达成/);
   if(candidate.achieved&&candidate.removed.length===result.breaking.minimalCount)assert.match(feedback,/选择数最少/);
   const evidence=ui.getConstructionResult().result.learningEvidence.breaking;
   assert.deepEqual(evidence.selected,[...candidate.removed].sort());assert.equal(evidence.achieved,candidate.achieved);
   assert.equal(evidence.minimal,candidate.achieved&&candidate.removed.length===result.breaking.minimalCount);
  }
  const plotIds=new Set(result.plots.map(p=>p.id));
  for(const formula of result.formulaLinks){
   assert.ok(plotIds.has(formula.plot),p.id+':'+formula.id);const button=v.$('[data-br-focus="'+formula.plot+'"]');assert.ok(button);button.onclick();
   const target=v.$('[data-br-plot="'+formula.plot+'"]');assert.equal(target.getAttribute('data-highlighted'),'true');assert.ok(target.focused&&target.scrollOptions);
  }
  // Full precision candidates originate in Python, including complex phase and
  // internal basis rotations; the UI must not manufacture a success verdict.
  for(const task of result.grading.tasks){
   await select(v,'#ct-grade-task',task.id);
   for(const kind of ['subspace','projector']){
    await select(v,'#ct-grade-kind',kind);
    for(const example of ['reference','equivalent','wrong']){
     await v.$('#ct-grade-'+example).onclick();await flush();
     assert.deepEqual(JSON.parse(v.$('#ct-grade-answer').value),fixture.grading[p.id+'/'+task.id+'/'+kind+'/'+example].example.response.candidate);
     await v.$('#ct-grade-check').onclick();await flush();
     const expected=fixture.grading[p.id+'/'+task.id+'/'+kind+'/'+example].grade.response;
     assert.ok(v.$('#ct-grade-feedback').textContent.includes(expected.feedback));finiteHTML(v.$('#ct-grade-feedback'));
     const evidence=ui.getConstructionResult().result.learningEvidence.matrix;
     assert.equal(evidence.passed,expected.passed);assert.equal(evidence.kind,kind);assert.equal(evidence.referenceExampleUsed,true);
     assert.deepEqual(evidence.answer,fixture.grading[p.id+'/'+task.id+'/'+kind+'/'+example].example.response.candidate);
    }
   }
  }
  v.$('#pw-export').onclick();const exported=JSON.parse(v.downloads.at(-1).body);
  assert.deepEqual(exported.input,requests[p.id].input);assert.equal(exported.result.module,result.module);assert.deepEqual(exported.result.plots,result.plots);
  assert.deepEqual(exported.result.learningEvidence,JSON.parse(JSON.stringify(ui.getConstructionResult().result.learningEvidence)));
  assert.equal(v.downloads.at(-1).type,'application/json');
 }
 const v=await mount({module:m.id});v.$('[data-pw-tab="lab"]').onclick();assert.ok(v.$('#pw-form'));
 v.$('[data-pw-tab="cases"]').onclick();assert.equal(v.$('#pw-content').querySelectorAll('article').length,3);
}

// All lessons lead to their real preset, and every derivation remains gated.
for(const lesson of data.lessons){const v=await mount({module:lesson.module,lesson:lesson.id});v.$('#pw-to-lab').onclick();await submit(v);assert.deepEqual(calls.at(-1),requests[lesson.preset]);}
for(const exercise of data.exercises){
 const v=await mount({module:exercise.module,exercise:exercise.id,tab:'derive'});
 for(const [index,step] of exercise.steps.entries()){
  const el=v.$('#pw-steps').querySelectorAll('.obs-exercise-step')[index];assert.ok(el);
  el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)!==step.answer).onclick();
  assert.equal(v.$('#pw-steps').querySelectorAll('.obs-exercise-step').length,index+1);
  el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)===step.answer).onclick();
 }
 assert.match(v.$('#pw-progress').textContent,/完成/);
}
assert.equal(Object.keys(JSON.parse(storage.get('symmetry-lab.construction.progress.v1'))).length,9);
for(const m of data.modules){
 const v=await mount({module:m.id,calculationOnly:true,preset:m.presets[0].id});await submit(v);
 const slider=v.container.querySelector('[data-pr-control]'),key=slider.dataset.prControl;
 slider.value='0.2';slider.oninput();assert.equal(v.$('#pw-'+key).value,'0.2');
 assert.equal(ui.getConstructionResult(),null);assert.equal(v.$('#pw-export'),null);assert.match(v.$('#pw-status').textContent,/参数已改变/);
 change(v,key,.3);assert.equal(slider.value,'0.3');
}

// Prediction verdicts are only stored after a real matching calculation.
const predictionKey='symmetry-lab.construction.predictions.v1';
for(const module of data.modules)for(const question of module.predictions){
 const v=await mount({module:module.id,tab:'lab'});await select(v,'#br-prediction-select',question.id);
 assert.ok(v.$('#pw-run').disabled);const count=calls.length;await submit(v);assert.equal(calls.length,count);
 const wrong=(question.answer+1)%question.choices.length;
 v.$('[data-br-predict="'+wrong+'"]').onclick();assert.match(v.$('#br-prediction-feedback').textContent,/预测已记录/);
 await submit(v);assert.deepEqual(calls.at(-1),requests[question.preset]);assert.match(v.$('#br-prediction-feedback').textContent,/需要修正/);
 const report=ui.getConstructionResult().result.learningEvidence.prediction;assert.equal(report.id,question.id);assert.equal(report.correct,false);
 assert.ok(Number.isFinite(Date.parse(report.predictedAt))&&Date.parse(report.verifiedAt)>=Date.parse(report.predictedAt));
 assert.deepEqual(JSON.parse(storage.get(predictionKey))[question.id],report);
 v.$('[data-pw-tab="learn"]').onclick();v.$('[data-pw-tab="lab"]').onclick();assert.ok(v.$('#pw-form'));
}
assert.equal(Object.keys(JSON.parse(storage.get(predictionKey))).length,6);

// Empty input, computation failure, cancellation and disconnected results must
// not create exports, stale feedback, or predicted evidence.
const module=data.modules[0],preset=module.presets[0],numeric=module.fields.find(f=>f.type==='number').key;
let v=await mount({module:module.id,calculationOnly:true,preset:preset.id});await submit(v);
const count=calls.length;change(v,numeric,'');await submit(v);assert.equal(calls.length,count);assert.equal(ui.getConstructionResult(),null);assert.equal(v.$('#pw-export'),null);
let finish;
for(const mode of ['cancel','change','disconnect']){
 const saved=storage.get(predictionKey),question=module.predictions[0];
 v=await mount({module:module.id,tab:'lab'},()=>new Promise(resolve=>finish=resolve));
 await select(v,'#br-prediction-select',question.id);v.$('[data-br-predict="'+question.answer+'"]').onclick();v.$('#pw-form').onsubmit({preventDefault(){}});
 if(mode==='cancel')v.$('#pw-cancel').onclick();else if(mode==='change')change(v,numeric,.7);else v.container.innerHTML='<p>Elsewhere</p>';
 finish(structuredClone(fixture.results[question.preset]));await flush();assert.equal(ui.getConstructionResult(),null);assert.equal(storage.get(predictionKey),saved);assert.equal(v.$('#pw-export'),null);
}
v=await mount({module:module.id,calculationOnly:true,preset:preset.id},async()=>{throw Error('Physical input rejected');});await submit(v);assert.match(v.$('#pw-result').textContent,/Physical input rejected/);assert.equal(v.$('#pw-export'),null);

// Matrix work is a separate async operation: stale replies cannot overwrite a
// new answer, switched task/kind, changed physical parameters or another route.
for(const mode of ['answer','kind','parameters','disconnect']){
 let resolveGrade,gradeOutput;
 const deferred=async(action,input)=>{
  const output=await run(action,input);
  if(action==='symmetry_grading'&&input.mode==='grade'){gradeOutput=output;return new Promise(resolve=>resolveGrade=resolve);}
  return output;
 };
 v=await mount({module:module.id,calculationOnly:true,preset:preset.id},deferred);await submit(v);
 await v.$('#ct-grade-equivalent').onclick();await flush();
 const pending=v.$('#ct-grade-check').onclick();await flush();assert.ok(resolveGrade);
 const saved=storage.get('symmetry-lab.construction.assignments.v1');
 if(mode==='answer'){v.$('#ct-grade-answer').value='[]';v.$('#ct-grade-answer').oninput();}
 else if(mode==='kind')await select(v,'#ct-grade-kind','projector');
 else if(mode==='parameters')change(v,numeric,.7);
 else v.container.innerHTML='<p>Elsewhere</p>';
 resolveGrade(gradeOutput);await pending;await flush();
 assert.equal(storage.get('symmetry-lab.construction.assignments.v1'),saved,'Late grading response must not store evidence after '+mode);
 if(mode==='answer'||mode==='kind'){
  assert.equal(ui.getConstructionResult().result.learningEvidence.matrix,undefined);
  assert.match(v.$('#ct-grade-feedback').textContent,/答案已改变/);
 }
}

// Playback advances a real frame, then parameter changes dispose its timer.
const originalInterval=globalThis.setInterval,originalClear=globalThis.clearInterval;
const timers=new Map();let timerId=0;
globalThis.setInterval=fn=>{timers.set(++timerId,fn);return timerId;};globalThis.clearInterval=id=>timers.delete(id);
try{
 v=await mount({module:module.id,calculationOnly:true,preset:preset.id});await submit(v);
 v.$('#ct-replay-play').onclick();assert.equal(timers.size,1);timers.values().next().value();
 assert.equal(Number(v.$('#ct-replay-step').value),1);change(v,numeric,.7);assert.equal(timers.size,0);
}finally{globalThis.setInterval=originalInterval;globalThis.clearInterval=originalClear;}
console.log('Construction UI: '+Object.keys(requests).length+' actual Python presets; '+Object.keys(fixture.grading).length+' phase/basis/projector grading exchanges; replay, graph, full-line breaking challenges; 36 gated steps; six predictions; route, export and stale-result guards passed.');
