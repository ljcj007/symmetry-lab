import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute,buildClassroomHash,classroomPathways} from '../dist/classroom-ui.js';
import {knownTool} from '../dist/navigation-ui.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/pathways-materials.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/pathways.json.gz',import.meta.url))));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={createElement:t=>new Element(t)};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(data)});
const ui=await import('../dist/pathways-ui.js');
let chosen=data.modules[0].presets[0].id;const calls=[];
const run=async(action,input)=>{calls.push({action,input:structuredClone(input)});return structuredClone(fixtures.results[chosen]);};
const mount=async(selection={},runner=run)=>{const container=new Container(),downloads=[],navigations=[],cancelled=[];await ui.renderPathwaysView({container,selection,run:runner,download:(body,name)=>downloads.push({body,name}),cancelRun:()=>cancelled.push(true),onNavigate:p=>navigations.push(p)});return{container,downloads,navigations,cancelled,$:s=>container.querySelector(s)};};
const submit=async v=>{v.$('#pw-form').onsubmit({preventDefault(){}});await flush();};
const change=(v,id,value)=>{const el=v.$('#pw-'+id);el.value=String(value);v.$('#pw-form').oninput({target:el});};
assert.equal(classroomPathways.length,7);
for(const c of data.cases)for(const [,href]of c.links||[]){if(href.startsWith('#compute/'))assert.ok(knownTool(href.slice(1).split('?')[0]),href);if(href.startsWith('#classroom/')){const route=parseClassroomRoute(href.slice(1));assert.ok(classroomPathways.some(p=>p.id===href.slice(11).split('?')[0]),href);assert.ok(route.section,href);}}
for(const m of data.modules){
 assert.ok(knownTool('compute/'+m.route));const route=parseClassroomRoute('compute/'+m.route+'?module=wrong&tab=derive');assert.equal(route.module,m.id);assert.equal(route.section,'pathways');assert.equal(route.tab,'lab');assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 for(const p of m.presets){chosen=p.id;const v=await mount({module:m.id,calculationOnly:true,preset:p.id});await submit(v);assert.equal(calls.at(-1).action,m.action);for(const [k,value]of Object.entries(p.input))assert.deepEqual(calls.at(-1).input[k],value,p.id+':'+k);assert.doesNotMatch(v.$('#pw-result').innerHTML,/\b(?:NaN|Infinity|undefined)\b/);assert.ok(v.$('#pw-result').querySelector('svg'),p.id);v.$('#pw-export').onclick();assert.equal(JSON.parse(v.downloads[0].body).module,m.id);}
 const v=await mount({module:m.id});v.container.querySelector('[data-pw-tab="lab"]').onclick();assert.ok(v.$('#pw-form'));v.container.querySelector('[data-pw-tab="cases"]').onclick();assert.equal(v.$('#pw-content').querySelectorAll('article').length,data.cases.filter(c=>c.module===m.id).length);
}
chosen='screw-boundary';let v=await mount({module:'bandrep',calculationOnly:true,preset:chosen});await submit(v);v.$('#pw-yaw').value='100';v.$('#pw-yaw').oninput();assert.match(v.$('#pw-orbit').innerHTML,/位点/);
chosen='scattering-diatomic';v=await mount({module:'scattering',calculationOnly:true,preset:chosen});await submit(v);v.$('#pw-heat-scale').value='linear';v.$('#pw-heat-scale').onchange();assert.match(v.$('#pw-heatmap').innerHTML,/svg/);
const before=calls.length;change(v,'temperature','');await submit(v);assert.equal(calls.length,before);assert.match(v.$('#pw-result').textContent,/不能留空/);
let finish;v=await mount({module:'bandrep',calculationOnly:true},()=>new Promise(resolve=>finish=resolve));v.$('#pw-form').onsubmit({preventDefault(){}});v.$('#pw-cancel').onclick();finish(fixtures.results['screw-boundary']);await flush();assert.equal(ui.getPathwaysResult(),null);assert.match(v.$('#pw-result').innerHTML,/取消/);
v=await mount({module:'bandrep',calculationOnly:true},()=>new Promise(resolve=>finish=resolve));v.$('#pw-form').onsubmit({preventDefault(){}});change(v,'kz',.1);finish(fixtures.results['screw-boundary']);await flush();assert.equal(ui.getPathwaysResult(),null);assert.ok(v.cancelled.length);
for(const e of data.exercises){v=await mount({module:e.module,exercise:e.id,tab:'derive'});for(const [i,s]of e.steps.entries()){const el=v.$('#pw-steps').querySelectorAll('.obs-exercise-step')[i];assert.ok(el);el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)!==s.answer).onclick();assert.equal(v.$('#pw-steps').querySelectorAll('.obs-exercise-step').length,i+1);el.querySelectorAll('[data-pw-answer]').find(b=>Number(b.dataset.pwAnswer)===s.answer).onclick();}assert.match(v.$('#pw-progress').textContent,/完成/);}
console.log('Pathways UI: all real presets, four route families, plots, gated derivations, exports, cancellation and stale result guards passed.');
