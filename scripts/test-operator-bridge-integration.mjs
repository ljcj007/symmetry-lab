import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {LEARNING_BRIDGE_HOOKS} from '../dist/learning-bridge-host.js';
import {HUBBARD_BRIDGE_HOOKS} from '../dist/hubbard-learning-bridge.js';
import {QUANTUM_STATE_BRIDGE_HOOKS} from '../dist/quantum-state-bridge.js';
assert.deepEqual(LEARNING_BRIDGE_HOOKS.hubbard,Object.keys(HUBBARD_BRIDGE_HOOKS));
assert.deepEqual(LEARNING_BRIDGE_HOOKS.quantum,Object.keys(QUANTUM_STATE_BRIDGE_HOOKS));
const catalog=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'));
const catalogues={'pathways-materials':catalog('pathways-materials'),'bridges-materials':catalog('bridges-materials'),
 'frontiers-materials':catalog('frontiers-materials'),'lie-group-lessons':catalog('lie-group-lessons')};
let fetches=0,runs=0,writes=0;
globalThis.fetch=async url=>{fetches++;const name=String(url).match(/data\/([^/?]+)\.json/)?.[1];assert.ok(catalogues[name],'Only a real course catalogue may be fetched: '+url);return{ok:true,json:async()=>structuredClone(catalogues[name])};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
const pathways=await import('../dist/pathways-ui.js?operator-integration');
const bridges=await import('../dist/bridges-ui.js?operator-integration');
const frontiers=await import('../dist/frontiers-ui.js?operator-integration');
const lie=await import('../dist/lie-group-ui.js?operator-integration');
const settle=async view=>{const end=Date.now()+5000;while(Date.now()<end){const hosts=view.container.querySelectorAll('[data-learning-bridge]');if(hosts.every(h=>h.getAttribute('aria-busy')==='false'))return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Optional bridge did not settle');};
const mount=async(render,selection)=>{const container=new Container(),navigations=[];await render({container,selection,onNavigate:patch=>navigations.push(patch),run:()=>{runs++;throw Error('Learning and explicit input copying must not run Python');}});const view={container,navigations,$:s=>container.querySelector(s)};await settle(view);return view;};
const controls=host=>host.querySelectorAll('select').map(x=>[x.attributes.id,x.value]);
const choose=(view,id,value)=>{const node=view.$('#'+id);assert.ok(node,id);node.value=String(value);node.onchange({target:node});};
const topicTab=async(view,id)=>{const b=view.$('[data-pw-tab="'+id+'"]');assert.ok(b);b.onclick();await settle(view);};
const cases=[
 [pathways.renderPathwaysView,{module:'hubbard',lesson:'hubbard-basis'},1],
 [bridges.renderBridgesView,{module:'manybody',lesson:'manybody-lehmann'},1],
 [bridges.renderBridgesView,{module:'density',lesson:'density-pure-mixed'},2],
 [bridges.renderBridgesView,{module:'density',lesson:'density-exchange'},1],
 [frontiers.renderFrontiersView,{module:'spt',lesson:'spt-schmidt'},3],
 [frontiers.renderFrontiersView,{module:'spt',lesson:'spt-aklt-parent'},1]
];
for(const[render,selection,count]of cases){
 const view=await mount(render,selection),host=view.$('[data-learning-bridge]');
 assert.ok(host,selection.lesson);assert.equal(host.querySelectorAll('details').filter(x=>x.attributes['data-hub-bridge']||x.attributes['data-qsb-panel']).length,count);
 const original=view.$('#pw-content').innerHTML;assert.ok(original.indexOf('data-learning-bridge')<original.indexOf('class="obs-formula"'),'Bridge precedes original formulas: '+selection.lesson);
 const beforeFetches=fetches,first=host.querySelector('select'),options=first.querySelectorAll('option');
 const next=options.find(x=>x.value&&x.value!==first.value);assert.ok(next);choose(view,first.attributes.id,next.value);
 const actualHost=view.$('[data-learning-bridge]'),before=controls(actualHost),detail=actualHost.querySelector('details');detail.open=true;
 const stale=actualHost.querySelector('select').onchange;
 await topicTab(view,'lab');assert.equal(view.$('[data-learning-bridge]'),null);
 const numeric=view.container.querySelectorAll('input').find(x=>x.attributes.type==='number');assert.ok(numeric);
 numeric.value='';view.$('#pw-form').oninput({target:numeric});
 await topicTab(view,'learn');assert.deepEqual(controls(view.$('[data-learning-bridge]')),before,'Control state survives an incomplete lab draft');
 assert.notEqual(view.$('[data-learning-bridge]').querySelector('details').getAttribute('open'),null,'Actual queued native open state survives');
 const restored=controls(view.$('[data-learning-bridge]'));stale();assert.deepEqual(controls(view.$('[data-learning-bridge]')),restored,'Retired handlers cannot change the restored lesson');
 await topicTab(view,'lab');assert.equal(view.$('#'+numeric.attributes.id).value,'','Bridge navigation preserves the incomplete numeric input');
 assert.equal(fetches,beforeFetches,'Local optional panels make no catalogue/worker requests');
}

const copy=await mount(bridges.renderBridgesView,{module:'manybody',lesson:'manybody-lehmann'});
choose(copy,'hub-manybody-lehmann-probe','phase');
const phase=copy.$('#hub-manybody-lehmann-phi');phase.value=String(Math.PI/2);phase.oninput({target:phase});
await copy.$('#hub-manybody-lehmann-copy').onclick();
assert.equal(copy.$('[data-learning-bridge]'),null);assert.equal(copy.$('#pw-probe').value,'momentum');
assert.equal(copy.$('#pw-q').value,'0.5');assert.equal(copy.$('#pw-interactionU').value,'0');assert.equal(copy.$('#pw-chemicalPotential').value,'0');
assert.equal(copy.$('#pw-q').getAttribute('step'),'any','The rendered Fourier probe accepts continuous q without a native step mismatch');
assert.equal(copy.$('#pw-preset').value,'','An explicit model copy is editable rather than mislabeled as a preset');
assert.equal(runs,0,'Input handoff waits for manual calculation');
await topicTab(copy,'learn');assert.equal(copy.$('#hub-manybody-lehmann-probe').value,'phase');
assert.equal(Number(copy.$('#hub-manybody-lehmann-phi').value),Math.PI/2);

const nonGridCopy=await mount(bridges.renderBridgesView,{module:'manybody',lesson:'manybody-lehmann'});
choose(nonGridCopy,'hub-manybody-lehmann-probe','phase');
const nonGridPhase=nonGridCopy.$('#hub-manybody-lehmann-phi');nonGridPhase.value='0.37';nonGridPhase.oninput({target:nonGridPhase});
await nonGridCopy.$('#hub-manybody-lehmann-copy').onclick();
const nonGridQ=nonGridCopy.$('#pw-q');
assert.equal(nonGridCopy.$('#pw-probe').value,'momentum');
assert.equal(nonGridQ.getAttribute('step'),'any','Continuous phase input is rendered with an unrestricted numeric step');
assert.equal(nonGridQ.value,String(.37/Math.PI),'Copying a non-grid phase preserves the original q without string rounding');
assert.equal(Number(nonGridQ.value),.37/Math.PI,'Copying a non-grid phase does not quantize q to a preset grid');
assert.equal(runs,0,'A non-grid phase handoff also waits for a manual calculation');

const spin=await mount(lie.renderLieGroupView,{pathway:'coupling',track:'representations',lesson:'su2-coupling-representations',tab:'learn'});
assert.equal(spin.container.querySelectorAll('[data-qsb-panel]').length,1);
const representation=spin.$('#qsb-triplet-virtual-representation');assert.ok(representation);representation.value='physical';representation.onchange({target:representation});
spin.$('[data-qsb-panel]').open=true;spin.$('[data-lg-tab="quiz"]').onclick();
assert.equal(spin.$('[data-learning-bridge]'),null);spin.$('[data-lg-tab="learn"]').onclick();await settle(spin);
assert.equal(spin.$('#qsb-triplet-virtual-representation').value,'physical');assert.notEqual(spin.$('[data-qsb-panel]').getAttribute('open'),null);
assert.equal(runs,0);assert.equal(writes,0,'Optional bridge checks do not claim original course mastery');
console.log('Operator bridge integration: seven exact lesson hooks, ten panels, lazy loading, native disclosure/control retention, incomplete lab drafts, retired events, continuous-q spectrum input copying without quantization, SU(2) quiz return and zero automatic calculation/mastery writes passed.');
