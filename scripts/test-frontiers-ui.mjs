import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';
import {segmentFormula} from '../dist/math-notation.js';
import katex from '../dist/vendor/katex/katex.mjs';
import {frontiersAssignments} from '../dist/frontiers-projects.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const hash=t=>createHash('sha256').update(t.replace(/\r\n?/g,'\n')).digest('hex');
const data=JSON.parse(read('../dist/data/frontiers-materials.json'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/frontiers.json.gz',import.meta.url))));
assert.equal(fixture.catalogSHA256,hash(read('../dist/data/frontiers-materials.json')));
for(const [file,digest]of Object.entries(fixture.sourceHashes))assert.equal(hash(read('../dist/python/'+file)),digest);
for(const formula of [...data.lessons.flatMap(l=>l.sections.map(s=>s.formula)),...Object.values(fixture.results).flatMap(r=>r.formulas)]){
 const parts=segmentFormula(formula);assert.equal(parts.map(s=>s.source).join(''),formula);
 for(const p of parts)if(p.type==='math')katex.renderToString(p.tex,{throwOnError:true,strict:'ignore',trust:false});else assert.doesNotMatch(p.source,/[_^]/,formula);
}
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/frontiers-ui.js');
const canonical=x=>JSON.stringify(Object.keys(x).sort().map(k=>[k,x[k]]));
const run=async(action,input)=>{
 if(action==='symmetry_linked'||action==='frontier_inverse'){
  const g=fixture[action==='symmetry_linked'?'linked':'inverse'].find(g=>canonical(g.input)===canonical(input));assert.ok(g,'genuine auxiliary request '+JSON.stringify(input));return structuredClone(g.result);
 }
 const id=Object.keys(fixture.requests).find(k=>fixture.requests[k].action===action&&canonical(fixture.requests[k].input)===canonical(input));assert.ok(id,'genuine preset '+JSON.stringify(input));return structuredClone(fixture.results[id]);
};
const mount=async(selection,runner=run)=>{const container=new Container(),downloads=[];await ui.renderFrontiersView({container,selection,run:runner,download:(...x)=>downloads.push(x)});return {container,downloads,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#pw-form').onsubmit({preventDefault(){}});await flush();};
for(const m of data.modules){
 const route=parseClassroomRoute('compute/'+m.route);assert.equal(route.module,m.id);assert.equal(route.section,'frontiers');assert.ok(knownTool('compute/'+m.route));assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 for(const p of m.presets){
  const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);assert.equal(ui.getFrontiersResult().module,m.id);
  assert.ok(v.$('#ft-geometry').querySelector('svg'));assert.doesNotMatch(v.$('#pw-result').innerHTML,/\b(?:NaN|Infinity|undefined)\b/);
  for(let i=0;i<fixture.results[p.id].replay.length;i++){v.$('#ft-frame').value=String(i);v.$('#ft-frame').oninput();assert.ok(v.$('#ft-frame-result').innerHTML.includes(fixture.results[p.id].replay[i].title));}
  v.$('#ft-path').value=String(fixture.results[p.id].path.length-1);v.$('#ft-path').oninput();assert.equal(ui.getFrontiersResult().result.learningEvidence.path.index,fixture.results[p.id].path.length-1);
  await v.$('#ft-link').onclick();assert.ok(ui.getFrontiersResult().result.learningEvidence.linked);assert.ok(v.$('#ft-linked-result').querySelector('svg'));
 }
 for(const p of m.predictions){const v=await mount({module:m.id,calculationOnly:true});v.$('#br-prediction-select').onchange({target:{value:p.id}});assert.ok(v.$('#pw-run').disabled);v.container.querySelector(`[data-br-predict="${p.answer}"]`).onclick();await submit(v);assert.ok(ui.getFrontiersResult().result.learningEvidence.prediction.correct);}
 const v=await mount({module:m.id,calculationOnly:true,preset:m.presets[0].id});await submit(v);
 await v.$('#ft-observe').onclick();assert.match(v.$('#ft-observations').innerHTML,/已获得的检验/);
 await v.$('#ft-inverse-grade').onclick();assert.equal(ui.getFrontiersResult().result.learningEvidence.inverse.result.correct,false);
 const expected=fixture.inverse.find(g=>g.input.domain===fixture.results[m.presets[0].id].inverseDomain&&g.input.revealed.length&&g.input.grade).result.remaining;
 for(const c of v.container.querySelectorAll('[data-ft-candidate]')){c.checked=expected.includes(c.dataset.ftCandidate);c.onchange();}
 assert.equal(ui.getFrontiersResult().result.learningEvidence.inverse,undefined);await v.$('#ft-inverse-grade').onclick();assert.ok(ui.getFrontiersResult().result.learningEvidence.inverse.result.correct);
 v.$('#ft-pin').onclick();v.$('#ft-explanation').value='固定模型与边界，重复计算';v.$('#ft-compare').onclick();assert.deepEqual(ui.getFrontiersResult().result.learningEvidence.comparison.A.input,ui.getFrontiersResult().result.learningEvidence.comparison.B.input);
 v.$('#pw-export').onclick();assert.match(v.downloads.at(-1)[0],/comparison/);
 v.$('#ft-explanation').oninput();assert.equal(ui.getFrontiersResult().result.learningEvidence.comparison,undefined);
 v.$('#ft-clear').onclick();
}
for(const lesson of data.lessons){const v=await mount({module:lesson.module,lesson:lesson.id,tab:'derive'});const ex=data.exercises.find(e=>e.lesson===lesson.id);for(const step of ex.steps){v.container.querySelectorAll(`[data-pw-answer="${step.answer}"]`).at(-1).onclick();}assert.match(v.$('#pw-progress').textContent,/推导完成/);}
const v=await mount({module:'layers',calculationOnly:true,preset:'layer-square'});await submit(v);v.$('#ft-pin').onclick();v.$('#pw-preset').onchange({target:{value:'layer-surface'}});await submit(v);v.$('#ft-explanation').value='只改变上表面元素标签';v.$('#ft-compare').onclick();const pair=ui.getFrontiersResult().result.learningEvidence.comparison;assert.equal(pair.A.result.summary[3].value,8);assert.equal(pair.B.result.summary[3].value,0);
// Disconnected and superseded asynchronous results must not capture new evidence.
let release;const pending=new Promise(r=>release=r);const w=await mount({module:'layers',calculationOnly:true,preset:'layer-square'},async(a,p)=>a==='symmetry_linked'?pending:run(a,p));await submit(w);const clicking=w.$('#ft-link').onclick();w.$('#ft-position-0').value='.8';w.$('#ft-position-0').oninput();release(fixture.linked[0].result);await clicking;assert.equal(ui.getFrontiersResult().result.learningEvidence.linked,undefined);
const projects=await import('../dist/response-projects.js?v=20261031-entry1');
const notebook=await import('../dist/material-notebook.js?v=20261031-entry1');
assert.equal(projects.assignmentTemplates.length,26);
for(const t of frontiersAssignments){assert.ok(new Set(t.steps.map(s=>s.action)).size>=2);let p=notebook.makeProject({title:t.title});p.assignment={id:t.id,steps:{},conclusion:''};notebook.validateProject(p);for(const step of t.steps){assert.ok(parseClassroomRoute(step.route));const f=fixture.projects[t.id+'/'+step.id];notebook.captureCalculation(f.action,f.input,f.result,{route:step.route.slice(1),title:step.title});const record=notebook.latestCalculation();assert.ok(projects.assignmentAcceptance(step,record).ok);const wrong={...record,input:{...record.input,...(step.requires.sites?{sites:3}:{_unexpected:1})}};if(step.requires.sites)assert.equal(projects.assignmentAcceptance(step,wrong).ok,false);p=projects.collectAssignmentRecord(p,t,step.id,record);}assert.equal(p.records.length,3);notebook.validateProject(notebook.importProject(JSON.stringify(p)));assert.match(projects.assignmentReport(p,t),/输入参数/);}
console.log('Frontiers: 18 genuine Python presets, 9 lessons/36 steps, linked vectors, inverse experiments, path evidence, A/B records and 26 projects passed.');
