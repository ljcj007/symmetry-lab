import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';
import {segmentFormula} from '../dist/math-notation.js';
import katex from '../dist/vendor/katex/katex.mjs';
import {connectionsAssignments} from '../dist/connections-projects.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const hash=t=>createHash('sha256').update(t.replace(/\r\n?/g,'\n')).digest('hex');
const data=JSON.parse(read('../dist/data/connections-materials.json'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/connections.json.gz',import.meta.url))));
assert.equal(fixture.catalogSHA256,hash(read('../dist/data/connections-materials.json')));
for(const [file,digest] of Object.entries(fixture.sourceHashes))assert.equal(hash(read('../dist/python/'+file)),digest);
for(const formula of [...data.lessons.flatMap(l=>l.sections.map(s=>s.formula)),...Object.values(fixture.results).flatMap(r=>r.formulas)]){
 const parts=segmentFormula(formula);assert.equal(parts.map(s=>s.source).join(''),formula);
 for(const p of parts)if(p.type==='math')katex.renderToString(p.tex,{throwOnError:true,strict:'ignore',trust:false});else assert.doesNotMatch(p.source,/[_^]/,formula);
}
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/connections-ui.js');
const canonical=x=>JSON.stringify(Object.keys(x).sort().map(k=>[k,x[k]]));
const run=async(action,input)=>{
 if(action==='symmetry_audit'){assert.deepEqual(input,fixture.audit.input);return structuredClone(fixture.audit.result);}
 if(action==='symbolic_step_grade'){const g=fixture.grading.find(g=>canonical(g.input)===canonical(input));assert.ok(g,'genuine grading request');return structuredClone(g.result);}
 const id=Object.keys(fixture.requests).find(k=>fixture.requests[k].action===action&&canonical(fixture.requests[k].input)===canonical(input));assert.ok(id,'genuine preset '+JSON.stringify(input));return structuredClone(fixture.results[id]);
};
const mount=async selection=>{const container=new Container(),downloads=[];await ui.renderConnectionsView({container,selection,run,download:(...x)=>downloads.push(x)});return {container,downloads,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#pw-form').onsubmit({preventDefault(){}});await flush();};
for(const m of data.modules){
 const route=parseClassroomRoute('compute/'+m.route);assert.equal(route.module,m.id);assert.equal(route.section,'connections');assert.ok(knownTool('compute/'+m.route));assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 for(const p of m.presets){const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);assert.equal(ui.getConnectionsResult().module,m.id);assert.ok(v.$('#pw-result').querySelector('svg'));assert.doesNotMatch(v.$('#pw-result').innerHTML,/\b(?:NaN|Infinity|undefined)\b/);for(let i=0;i<fixture.results[p.id].replay.length;i++){v.$('#cn-frame').value=String(i);v.$('#cn-frame').oninput();assert.ok(v.$('#cn-frame-result').innerHTML.includes(fixture.results[p.id].replay[i].title));}}
}
for(const m of data.modules)for(const p of m.predictions){const w=await mount({module:m.id,calculationOnly:true});w.$('#br-prediction-select').onchange({target:{value:p.id}});assert.ok(w.$('#pw-run').disabled);w.container.querySelector(`[data-br-predict="${p.answer}"]`).onclick();await submit(w);assert.ok(ui.getConnectionsResult().result.learningEvidence.prediction.correct);}
const v=await mount({module:'statistics',calculationOnly:true,preset:'pauli-singlet'});await submit(v);
v.$('#cn-answer').value='1/2';await v.$('#cn-grade').onclick();assert.match(v.$('#cn-grade-result').innerHTML,/恒等式成立/);assert.ok(ui.getConnectionsResult().result.learningEvidence.symbolic.result.correct);
v.$('#cn-answer').value='1/3';v.$('#cn-answer').oninput();assert.equal(ui.getConnectionsResult().result.learningEvidence.symbolic,undefined);await v.$('#cn-grade').onclick();assert.match(v.$('#cn-grade-result').innerHTML,/尚不相等/);
await v.$('#cn-audit').onclick();assert.ok(ui.getConnectionsResult().result.learningEvidence.audit.result.forcedZero);
v.$('#cn-pin').onclick();v.$('#cn-explanation').value='相同结果重复性检验';v.$('#cn-compare').onclick();const paired=ui.getConnectionsResult().result.learningEvidence.comparison;assert.deepEqual(paired.A.input,paired.B.input);assert.deepEqual(paired.A.result,paired.B.result);
v.$('#pw-export').onclick();assert.match(v.downloads.at(-1)[0],/comparison/);
v.$('#cn-clear').onclick();assert.equal(ui.getConnectionsResult().result.learningEvidence.comparison,undefined);
const ch=v.container.querySelector('[data-cn-challenge="1"]');ch.onclick();assert.equal(ui.getConnectionsResult().result.learningEvidence.counterexample.correct,true);
v.$('#cn-pin').onclick();v.$('#pw-preset').onchange({target:{value:'pauli-forbidden'}});await submit(v);v.$('#cn-explanation').value='只比较两个明示预设的统计条件';v.$('#cn-compare').onclick();const different=ui.getConnectionsResult().result.learningEvidence.comparison;assert.equal(different.A.result.summary[1].value,1);assert.equal(different.B.result.summary[1].value,0);assert.notDeepEqual(different.A.input,different.B.input);
for(const lesson of data.lessons){const w=await mount({module:lesson.module,lesson:lesson.id,tab:'derive'});const exercise=data.exercises.find(e=>e.lesson===lesson.id);for(const step of exercise.steps){const buttons=w.container.querySelectorAll(`[data-pw-answer="${step.answer}"]`);buttons.at(-1).onclick();}assert.match(w.$('#pw-progress').textContent,/推导完成/);}
for(const c of data.cases){const m=data.modules.find(m=>m.id===c.module);assert.ok(m.presets.some(p=>p.id===c.preset));for(const [,href]of c.links)assert.ok(parseClassroomRoute(href),'case route '+href);}
const projects=await import('../dist/response-projects.js?v=20261031-entry1');
const notebook=await import('../dist/material-notebook.js?v=20261031-entry1');
assert.equal(projects.assignmentTemplates.length,26);
for(const t of connectionsAssignments){assert.ok(new Set(t.steps.map(s=>s.action)).size>=2);let p=notebook.makeProject({title:t.title});p.assignment={id:t.id,steps:{},conclusion:''};notebook.validateProject(p);for(const step of t.steps){assert.ok(parseClassroomRoute(step.route));const f=fixture.projects[t.id+'/'+step.id];notebook.captureCalculation(f.action,f.input,f.result,{route:step.route.slice(1),title:step.title});const record=notebook.latestCalculation();assert.ok(projects.assignmentAcceptance(step,record).ok);p=projects.collectAssignmentRecord(p,t,step.id,record);}assert.equal(p.records.length,3);notebook.validateProject(notebook.importProject(JSON.stringify(p)));assert.match(projects.assignmentReport(p,t),/输入参数/);}
const au=await mount({module:'audit',calculationOnly:true});au.$('#audit-form').onsubmit({preventDefault(){}});await flush();assert.ok(ui.getConnectionsResult().result.forcedZero);assert.match(au.$('#audit-result').innerHTML,/模型 H/);assert.ok(knownTool('compute/symmetry-audit'));
console.log('Connections: 19 real Python presets, 9 lessons/36 steps, symbols, three-layer audit, A/B evidence, routes and 23 retained projects passed.');
