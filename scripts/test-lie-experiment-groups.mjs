import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {foundationNames} from '../dist/lie-foundations-ui.js';
import {physicsNames} from '../dist/lie-physics-ui.js';

Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
const lessons=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-group-lessons.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/lie-foundations-ui.json',import.meta.url),'utf8'));
const names={...foundationNames,su2:'SU(2)',su3:'SU(3)',commutator:'Commutator',...physicsNames};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(lessons)});
const ui=await import('../dist/lie-group-ui.js?experiment-group-tests');

const groups=ui.groupLieExperiments(names,'u1');
assert.deepEqual(groups.map(group=>group.id),['foundation','dynamics','coupling']);
assert.deepEqual(groups.map(group=>group.entries.length),[6,1,5]);
const all=groups.flatMap(group=>group.entries.map(([key])=>key));
assert.equal(new Set(all).size,12);assert.deepEqual(new Set(all),new Set(Object.keys(names)));
for(const key of Object.keys(names)){
 const open=ui.groupLieExperiments(names,key).filter(group=>group.open);
 assert.equal(open.length,1,key);assert.ok(open[0].entries.some(([entry])=>entry===key));
}
const future=ui.groupLieExperiments({...names,'future-experiment':'A future tool'},'future-experiment');
assert.deepEqual(future.at(-1).entries,[['future-experiment','A future tool']]);
assert.equal(future.at(-1).id,'other');assert.equal(future.at(-1).open,true);
assert.equal(future.flatMap(group=>group.entries).length,13,'Unknown future keys remain discoverable');

const container=new Container(),calls=[],moves=[];
await ui.renderLieGroupView({container,selection:{calculationOnly:true,experiment:'u1',preset:'u1-circle-quarter'},run:async(action,input)=>{calls.push({action,input});return structuredClone(fixtures.u1.result);},onNavigate:patch=>moves.push(patch)});
const $=selector=>container.querySelector(selector);
const buttons=()=>container.querySelectorAll('[data-lg-experiment]');
const details=()=>container.querySelectorAll('[data-lg-experiment-group]');
const currentGroups=()=>details().filter(element=>Object.hasOwn(element.attributes,'open')).map(element=>element.dataset.lgExperimentGroup);
const choose=key=>buttons().find(button=>button.dataset.lgExperiment===key).onclick();
assert.equal(buttons().length,12);assert.equal(new Set(buttons().map(button=>button.dataset.lgExperiment)).size,12);
assert.deepEqual(currentGroups(),['foundation']);
for(const detail of details()){
 assert.equal(detail.tag,'details');const summary=detail.querySelector('summary');assert.ok(summary);
 assert.notEqual(summary.attributes.tabindex,'-1','The native disclosure remains keyboard reachable');
 assert.equal(summary.onkeydown,undefined,'No script suppresses the native Enter/Space toggle');
 assert.equal(summary.attributes.role,undefined,'Use native summary semantics');
}
assert.equal(calls.length,0,'Rendering or classifying controls must not start Python');
await $('#lg-lab-form').onsubmit({preventDefault(){}});assert.equal(calls.length,1);
assert.ok($('#lg-lab-output').querySelector('svg'));assert.equal(ui.getLieGroupResult().experiment.result.experiment,'u1');
const oldU1=buttons().find(button=>button.dataset.lgExperiment==='u1');
choose('rabi');assert.deepEqual(currentGroups(),['dynamics']);assert.equal(buttons().length,12);
assert.equal(calls.length,1);assert.equal(ui.getLieGroupResult().experiment,null);
oldU1.onclick();assert.deepEqual(currentGroups(),['dynamics'],'A detached old control cannot reactivate an earlier experiment');
choose('su3_cg');assert.deepEqual(currentGroups(),['coupling']);assert.ok($('#lg-cg-arithmetic'));assert.equal(calls.length,1);
choose('u1');assert.deepEqual(currentGroups(),['foundation']);assert.equal(ui.getLieGroupResult().experiment,null,'Returning does not restore an invalid old result');
assert.equal(calls.length,1);assert.equal(moves.at(-1).experiment,'u1');
const css=fs.readFileSync(new URL('../dist/lie-group.css',import.meta.url),'utf8');
assert.match(css,/\.lg-experiment-group>summary\{[^}]*font-size:18px/);
assert.match(css,/\.lg-experiment-group \.lg-experiments button\{[^}]*min-width:0[^}]*white-space:normal[^}]*overflow-wrap:anywhere/);
assert.match(css,/\.lg-experiment-group>summary:focus-visible/);
console.log('Lie experiment groups: 6/1/5 native disclosures, every experiment exactly once, current group open, future keys retained, keyboard semantics, readable wrapping, no extra computation and stale-control/result isolation passed.');
