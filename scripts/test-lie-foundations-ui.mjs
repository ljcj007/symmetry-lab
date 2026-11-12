import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {foundationPresets,lieGroupLabel} from '../dist/lie-foundations-ui.js';

Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
const course=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-group-lessons.json',import.meta.url),'utf8'));
const exercises=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-derivations.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/lie-foundations-ui.json',import.meta.url),'utf8'));
const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('lie-derivations')?exercises:course});
assert.equal(lieGroupLabel('u1'),'U(1)');assert.equal(lieGroupLabel('su2'),'SU(2)');assert.equal(lieGroupLabel('su3'),'SU(3)');
const ui=await import('../dist/lie-group-ui.js?foundational-tests'),container=new Container(),moves=[],calls=[],downloads=[];
const $=selector=>container.querySelector(selector);
let reply=fixtures.u1.result;
const run=async(action,input)=>{calls.push({action,input});return structuredClone(reply);};
await ui.renderLieGroupView({container,run,selection:{pathway:'continuous',track:'continuous',lesson:'continuous-symmetry'},onNavigate:patch=>moves.push(patch),download:(text,name)=>downloads.push({name,data:JSON.parse(text)})});
const starts=container.querySelector('#lg-chapter-select').querySelectorAll('option').slice(0,8).map(item=>Number(item.value));
assert.deepEqual(starts,[0,1,2,3,4,5,6,7],'Continuous course preserves the complete first-eight-lesson sequence');
await $('#lg-chapter-derive').onclick();assert.match($('#lg-content').innerHTML,/U\(1\) · 分步推导/);
assert.equal(ui.getLieGroupResult().derivations.selected,'continuous-c4-in-u1');
$('#lg-derivation-lab').onclick();assert.equal($('#lg-angle').value,'45');assert.equal($('#lg-translation').value,'0.001');assert.equal(moves.at(-1).preset,'u1-circle-quarter');
assert.match($('#lg-lab-output').innerHTML,/z\(φ\)=exp\(\+iφ\)/,'The U1 placeholder retains the same positive-phase convention as the problem and core');
assert.match($('#lg-lab-form').innerHTML,/相位角 φ/);assert.equal(calls.length,0,'Restoring a teaching preset is lazy until the learner computes');
await $('#lg-lab-form').onsubmit({preventDefault(){}});assert.deepEqual(calls.at(-1),{action:'teaching_labs',input:fixtures.u1.input});
assert.match($('#lg-lab-output').innerHTML,/U\(1\)|有限循环子群|整数平移/);assert.ok($('#lg-lab-output').querySelector('svg'));
$('#lg-export').onclick();assert.deepEqual(downloads.at(-1).data.experiment.input,fixtures.u1.input);assert.deepEqual(downloads.at(-1).data.experiment.result.selectedPoint,fixtures.u1.result.selectedPoint);
const oldExport=$('#lg-export');$('#lg-translation').value='2';$('#lg-translation').oninput();assert.equal(ui.getLieGroupResult().experiment,null,'Changing a foundational input invalidates its result/export');
oldExport.onclick();assert.equal(downloads.length,1,'A stale export button cannot export invalidated results');
await $('#lg-tab-learn').onclick();assert.equal($('#lg-chapter-select').value,'0','The lab retains its originating lesson');
await $('#lg-chapter-derive').onclick();assert.equal(ui.getLieGroupResult().derivations.selected,'continuous-c4-in-u1');$('#lg-derivation-lab').onclick();assert.equal($('#lg-translation').value,'0.001','Reopening the matched exercise restores the given preset instead of old manual input');

const cases=[
 ['representations','representations','su2-center-actions','representations-center-two-actions'],
 ['su2-double-cover','interferometer','su2-phase-single','su2-double-cover-path-phase'],
 ['su3-weights','su3','su3-weight-phase','su3-weights-roots-phase-record']
];
for(const [lesson,experiment,preset,exercise] of cases){
 await ui.renderLieGroupView({container,run,selection:{pathway:'continuous',track:'continuous',lesson},onNavigate:patch=>moves.push(patch),download:(text,name)=>downloads.push({name,data:JSON.parse(text)})});
 assert.equal($('#lg-track-select').value,'continuous');await $('#lg-chapter-derive').onclick();assert.equal(ui.getLieGroupResult().derivations.selected,exercise);
 $('#lg-derivation-lab').onclick();assert.equal(moves.at(-1).experiment,experiment);assert.equal(moves.at(-1).preset,preset);assert.equal(moves.at(-1).lesson,lesson);
 reply=fixtures[experiment==='su3'?'superposition':experiment].result;
 await $('#lg-lab-form').onsubmit({preventDefault(){}});assert.deepEqual(calls.at(-1).input,fixtures[experiment==='su3'?'superposition':experiment].input);
 if(experiment==='su3'){assert.equal($('#lg-state').value,'plus12');assert.match($('#lg-lab-output').innerHTML,/相位与生成元期望|T₁、T₂/);}
 if(experiment==='interferometer'){assert.equal($('#lg-branches').value,'single');assert.match($('#lg-lab-output').innerHTML,/端口|第一、第二路径/);assert.equal($('#lg-lab-output').querySelectorAll('progress').length,2);}
 if(experiment==='representations')assert.match($('#lg-lab-output').innerHTML,/旋量表示 · 2 维|向量表示 · 3 维/);
}

// Full calculation mode restores real presets and keeps its truthful category.
const labels=[];await ui.renderLieGroupView({container,run,selection:{calculationOnly:true,experiment:'interferometer',preset:'su2-phase-single'},onLocation:label=>labels.push(label)});
assert.equal($('#lg-axis').value,foundationPresets['su2-phase-single'].input.axis);
$('#lg-angle').value='Infinity';await $('#lg-lab-form').onsubmit({preventDefault(){}});assert.match($('#lg-lab-output').innerHTML,/有效参数/);

// A route selecting another experiment without a preset cannot retain an old preset ID.
await ui.renderLieGroupView({container,run,selection:{calculationOnly:true,experiment:'u1',preset:'u1-circle-quarter'},onNavigate:patch=>moves.push(patch)});
await ui.renderLieGroupView({container,run,selection:{pathway:'continuous',track:'continuous',tab:'lab',lesson:'representations',experiment:'representations'},onNavigate:patch=>moves.push(patch)});
await $('#lg-tab-learn').onclick();
assert.equal(moves.at(-1).preset,null);

// A pending foundational job cannot populate a newly chosen advanced/base view.
let finish;const race=await import('../dist/lie-group-ui.js?foundational-race'),racePage=new Container();
await race.renderLieGroupView({container:racePage,selection:{calculationOnly:true,experiment:'interferometer',preset:'su2-phase-single'},run:()=>new Promise(resolve=>{finish=resolve;})});
const race$=selector=>racePage.querySelector(selector);const pending=race$('#lg-lab-form').onsubmit({preventDefault(){}});
racePage.querySelectorAll('[data-lg-experiment]').find(button=>button.dataset.lgExperiment==='su3').onclick();finish(fixtures.interferometer.result);await pending;
assert.ok(race$('#lg-generator'));assert.equal(race.getLieGroupResult().experiment,null);
console.log('Lie foundations UI: first-eight sequence, U1 label/positive phase, lazy exact-preset handoff, lesson return, input invalidation, original JSON exports, spinor/vector, double-path ports, SU3 coherences and stale-job isolation passed.');
