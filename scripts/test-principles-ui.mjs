import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const normalizedHash=text=>createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('hex');
const data=JSON.parse(read('../dist/data/principles-materials.json'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/principles.json.gz',import.meta.url))));
const files=['order_parameter_lab.py','exchange_symmetry_lab.py','conservation_lab.py','density_matrix_lab.py'];
assert.equal(fixture.format,'real-python-principles-fixtures');
assert.equal(fixture.sourceHashNormalization,'utf8-lf-v1');
assert.equal(fixture.release,data.release);
assert.deepEqual(Object.keys(fixture.sourceHashes).sort(),[...files].sort());
for(const name of files)assert.equal(fixture.sourceHashes[name],normalizedHash(read('../dist/python/'+name)),name+': regenerate genuine principles fixtures after core changes');
assert.equal(fixture.catalogSHA256,normalizedHash(read('../dist/data/principles-materials.json')),'Catalogue changed; regenerate genuine fixtures');
assert.equal(normalizedHash('a\r\nb\r'),normalizedHash('a\nb\n'),'Checkout line endings alone do not stale a fixture');
assert.notEqual(normalizedHash('a\nb\n'),normalizedHash('a\nb \n'),'Whitespace/content changes are still detected');
const requests={};
for(const m of data.modules)for(const p of m.presets)requests[p.id]={action:m.action,input:{...Object.fromEntries(m.fields.map(f=>[f.key,f.default])),...p.input}};
assert.deepEqual(fixture.requests,requests);
assert.deepEqual(Object.keys(fixture.results).sort(),Object.keys(requests).sort());
assert.equal(data.modules.length,3);assert.equal(Object.keys(requests).length,data.modules.reduce((n,m)=>n+m.presets.length,0));
assert.equal(data.lessons.length,9);assert.equal(data.exercises.reduce((n,e)=>n+e.steps.length,0),36);
assert.equal(data.modules.reduce((n,m)=>n+(m.predictions||[]).length,0),6);

// Extend only this test's adapter with focus/ancestor operations used by the new
// accessible visual controls. The established shared adapter is not modified.
Element.prototype.closest=function(selector){let e=this;while(e instanceof Element){if(e.matches(selector))return e;e=e.parentNode;}return null;};
Element.prototype.focus=function(options){this.focusOptions=options;this.focused=true;};
Element.prototype.scrollIntoView=function(options){this.scrollOptions=options;};
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/principles-ui.js');
const views=await import('../dist/principles-views.js');
const calls=[];
const canonical=v=>JSON.stringify(v,Object.keys(v).sort());
const run=async(action,input)=>{
 calls.push({action,input:structuredClone(input)});
 const key=Object.keys(requests).find(k=>requests[k].action===action&&canonical(requests[k].input)===canonical(input));
 assert.ok(key,'UI must execute an actual recorded preset: '+action+' '+JSON.stringify(input));
 return structuredClone(fixture.results[key]);
};
const mount=async(selection={},runner=run)=>{
 const container=new Container(),downloads=[],navigations=[],cancelled=[];
 await ui.renderPrinciplesView({container,selection,run:runner,download:(body,name,type)=>downloads.push({body,name,type}),cancelRun:()=>cancelled.push(true),onNavigate:r=>navigations.push(r)});
 return{container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};
};
const submit=async v=>{v.$('#pw-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,key,value)=>{const el=v.$('#pw-'+key);assert.ok(el,key);el.value=String(value);v.$('#pw-form').oninput({target:el});};
const select=async(v,id,value)=>{const el=v.$(id);assert.ok(el,id);el.value=String(value);el.onchange({target:el});await flush();};
const finiteHTML=el=>assert.doesNotMatch(el.innerHTML,/\b(?:NaN|Infinity|undefined)\b/);

assert.equal(classroomPathways.length,7);
for(const c of data.cases){
 const m=data.modules.find(m=>m.id===c.module);assert.ok(m.presets.some(p=>p.id===c.preset),c.id);
 for(const [,href]of c.links||[]){
  if(href.startsWith('#compute/'))assert.ok(knownTool(href.slice(1).split('?')[0]),href);
  if(href.startsWith('#classroom/')){const route=parseClassroomRoute(href);assert.ok(classroomPathways.some(p=>p.id===href.slice(11).split('?')[0]),href);assert.ok(route.section,href);}
 }
}
for(const m of data.modules){
 assert.ok(knownTool('compute/'+m.route));
 const route=parseClassroomRoute('compute/'+m.route+'?module=wrong&tab=derive');
 assert.equal(route.module,m.id);assert.equal(route.section,'principles');assert.equal(route.tab,'lab');
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 const course=parseClassroomRoute(ui.principlesCourseRoute(m.id,'tab=derive&material=example'));
 assert.equal(course.section,'principles');assert.equal(course.module,m.id);assert.equal(course.material,'example');
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(course)),course);
 for(const p of m.presets){
  const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);
  assert.deepEqual(calls.at(-1),requests[p.id]);assert.equal(ui.getPrinciplesResult().module,m.id);
  finiteHTML(v.$('#pw-result'));assert.ok(v.$('#pw-result').querySelector('svg'),p.id);
  assert.ok(v.$('#br-prediction-panel'),'Prediction panel is discoverable by ID');
  const result=fixture.results[p.id],plotIds=new Set(result.plots.map(p=>p.id));
  assert.equal(plotIds.size,result.plots.length);
  for(const link of result.formulaLinks){
   assert.ok(plotIds.has(link.plot),p.id+':'+link.id);
   const button=v.$('[data-br-focus="'+link.plot+'"]');assert.ok(button);button.onclick();
   const target=v.$('[data-br-plot="'+link.plot+'"]');assert.equal(target.getAttribute('data-highlighted'),'true');assert.ok(target.focused&&target.scrollOptions);
   assert.equal(v.container.querySelectorAll('[data-br-plot]').filter(e=>e.getAttribute('data-highlighted')==='true').length,1);
   const card=v.$('[data-formula-context="'+link.id+'"]');assert.ok(card);
   card.onclick({target:new Element('span',{'data-fd-trigger':''},card)});
   assert.equal(target.getAttribute('data-highlighted'),'true');
  }
  v.$('#pw-export').onclick();const exported=JSON.parse(v.downloads[0].body);
  assert.deepEqual(exported.input,requests[p.id].input);assert.deepEqual(exported.result,JSON.parse(JSON.stringify(result)));
  assert.equal(v.downloads[0].type,'application/json');
 }
 const v=await mount({module:m.id});v.$('[data-pw-tab="lab"]').onclick();assert.ok(v.$('#pw-form'));
 v.$('[data-pw-tab="cases"]').onclick();assert.equal(v.$('#pw-content').querySelectorAll('article').length,data.cases.filter(c=>c.module===m.id).length);
}

// Both input directions stay synchronized, and changing a slider invalidates
// the old export instead of silently presenting a stale calculation.
for(const m of data.modules){
 const v=await mount({module:m.id,calculationOnly:true,preset:m.presets[0].id});await submit(v);
 const slider=v.container.querySelector('[data-pr-control]'),key=slider.dataset.prControl;
 slider.value='0.2';slider.oninput();
 assert.equal(v.$('#pw-'+key).value,'0.2');assert.equal(ui.getPrinciplesResult(),null);assert.equal(v.$('#pw-export'),null);
 assert.match(v.$('#pw-status').textContent,/参数已改变/);
 change(v,key,.3);assert.equal(slider.value,'0.3');
}

let v;
for(const m of data.modules){
 v=await mount({module:m.id,calculationOnly:true,preset:m.presets[0].id});await submit(v);
 assert.ok(v.$('#pr-proof-info'));assert.ok(v.$('#pr-convention'));
 const options=v.$('#pr-proof').querySelectorAll('option');assert.ok(options.length>0);
 await select(v,'#pr-proof',options.length-1);finiteHTML(v.$('#pr-proof-info'));
 if(m.id==='order'){const before=v.$('#pr-vector').innerHTML;await select(v,'#pr-operation',1);assert.ok(v.$('#pr-vector').innerHTML.includes('<svg'));assert.ok(v.$('#pr-operation-info').innerHTML.length>0);}
 if(m.id==='exchange')assert.ok(v.$('#pr-spin').innerHTML.includes('<svg'));
 if(m.id==='conservation')assert.ok(v.$('#pr-degeneracy').innerHTML.length>100);
}
// Every lesson handoff uses a genuine preset; all 52 steps remain gated.
for(const lesson of data.lessons){
 v=await mount({module:lesson.module,lesson:lesson.id});v.$('#pw-to-lab').onclick();await submit(v);
 assert.deepEqual(calls.at(-1),requests[lesson.preset]);
}
for(const exercise of data.exercises){
 v=await mount({module:exercise.module,exercise:exercise.id,tab:'derive'});
 for(const [index,step]of exercise.steps.entries()){
  const el=v.$('#pw-steps').querySelectorAll('.obs-exercise-step')[index];assert.ok(el);
  el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)!==step.answer).onclick();
  assert.equal(v.$('#pw-steps').querySelectorAll('.obs-exercise-step').length,index+1);
  el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)===step.answer).onclick();
 }
 assert.match(v.$('#pw-progress').textContent,/完成/);
}
assert.equal(Object.keys(JSON.parse(storage.get('symmetry-lab.principles.progress.v1'))).length,9);

// Invalid controls, failed calculations and stale results cannot be exported.
v=await mount({module:'order',calculationOnly:true,preset:data.modules[0].presets[0].id});await submit(v);
const callCount=calls.length;change(v,'etaX','');await submit(v);assert.equal(calls.length,callCount);assert.match(v.$('#pw-result').textContent,/不能留空/);assert.equal(v.$('#pw-export'),null);assert.equal(ui.getPrinciplesResult(),null);
let finish;
v=await mount({module:'order',calculationOnly:true,preset:data.modules[0].presets[0].id},()=>new Promise(resolve=>finish=resolve));
v.$('#pw-form').onsubmit({preventDefault(){}});v.$('#pw-cancel').onclick();finish(structuredClone(fixture.results[data.modules[0].presets[0].id]));await flush();
assert.equal(ui.getPrinciplesResult(),null);assert.equal(v.$('#pw-export'),null);assert.match(v.$('#pw-result').innerHTML,/取消/);
v=await mount({module:'order',calculationOnly:true,preset:data.modules[0].presets[0].id},()=>new Promise(resolve=>finish=resolve));
v.$('#pw-form').onsubmit({preventDefault(){}});change(v,'etaX',.8);finish(structuredClone(fixture.results[data.modules[0].presets[0].id]));await flush();assert.equal(ui.getPrinciplesResult(),null);assert.ok(v.cancelled.length);assert.equal(v.$('#pw-export'),null);
v=await mount({module:'order',calculationOnly:true,preset:data.modules[0].presets[0].id},()=>new Promise(resolve=>finish=resolve));
v.$('#pw-form').onsubmit({preventDefault(){}});v.container.innerHTML='<p>Another route</p>';finish(structuredClone(fixture.results[data.modules[0].presets[0].id]));await flush();assert.equal(ui.getPrinciplesResult(),null);
v=await mount({module:'order',calculationOnly:true,preset:data.modules[0].presets[0].id},async()=>{throw Error('Physical input rejected');});await submit(v);assert.match(v.$('#pw-result').textContent,/Physical input rejected/);assert.equal(v.$('#pw-export'),null);

// Each controlled prediction is recorded before computation, uses its preset,
// and only acquires a verdict after the actual fixture result is received.
const predictionKey='symmetry-lab.principles.predictions.v1';
for(const module of data.modules)for(const question of module.predictions){
 v=await mount({module:module.id,tab:'lab'});await select(v,'#br-prediction-select',question.id);
 assert.ok(v.$('#pw-run').disabled);assert.doesNotMatch(v.$('#br-prediction-feedback').textContent,/预测与结论一致|需要修正/);
 const count=calls.length;await submit(v);assert.equal(calls.length,count);
 const wrong=(question.answer+1)%question.choices.length;
 v.$('[data-br-predict="'+wrong+'"]').onclick();assert.equal(v.$('#pw-run').disabled,false);
 assert.match(v.$('#br-prediction-feedback').textContent,/预测已记录/);
 await submit(v);assert.deepEqual(calls.at(-1),requests[question.preset]);
 assert.match(v.$('#br-prediction-feedback').textContent,/需要修正/);
 const report=ui.getPrinciplesResult().result.learningEvidence;
 assert.equal(report.id,question.id);assert.equal(report.correct,false);assert.equal(report.choice,question.choices[wrong]);
 assert.ok(Number.isFinite(Date.parse(report.predictedAt))&&Date.parse(report.verifiedAt)>=Date.parse(report.predictedAt));
 v.$('#pw-export').onclick();assert.deepEqual(JSON.parse(v.downloads.at(-1).body).result.learningEvidence,report);
 assert.deepEqual(JSON.parse(storage.get(predictionKey))[question.id],report);
 v.$('[data-pw-tab="learn"]').onclick();v.$('[data-pw-tab="lab"]').onclick();assert.ok(v.$('#pw-form'),'Returning after a judged prediction must not dereference a cleared result');
}
assert.equal(Object.keys(JSON.parse(storage.get(predictionKey))).length,6);
const question=data.modules[0].predictions[0];
v=await mount({module:'order',tab:'lab'});await select(v,'#br-prediction-select',question.id);v.$('[data-br-predict="'+question.answer+'"]').onclick();await submit(v);assert.equal(ui.getPrinciplesResult().result.learningEvidence.correct,true);
change(v,'etaX',.8);assert.equal(ui.getPrinciplesResult(),null);assert.equal(v.$('#pw-export'),null);assert.equal(v.$('#br-prediction-select').value,'');assert.equal(v.$('#br-prediction-feedback'),null);
for(const mode of ['cancel','change','disconnect']){
 const saved=storage.get(predictionKey);
 v=await mount({module:'order',tab:'lab'},()=>new Promise(resolve=>finish=resolve));await select(v,'#br-prediction-select',question.id);v.$('[data-br-predict="'+question.answer+'"]').onclick();v.$('#pw-form').onsubmit({preventDefault(){}});
 if(mode==='cancel')v.$('#pw-cancel').onclick();else if(mode==='change')change(v,'etaX',.7);else v.container.innerHTML='<p>Elsewhere</p>';
 finish(structuredClone(fixture.results[question.preset]));await flush();assert.equal(ui.getPrinciplesResult(),null);assert.equal(storage.get(predictionKey),saved,'No verdict for '+mode+' result');
}

console.log('Principles UI: actual Python presets, three route families, constraint/convention/degeneracy views, 36 gated steps, six predictions, exports and cancellation guards passed.');
