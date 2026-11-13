import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
import {LEARNING_BRIDGE_HOOKS} from '../dist/learning-bridge-host.js';

const catalogues=Object.fromEntries(['material-research','connections-materials'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'))]));
let requests=0,runs=0,writes=0;
globalThis.fetch=async url=>{requests++;const name=String(url).match(/data\/([^/?]+)\.json/)?.[1];assert.ok(catalogues[name],url);return{ok:true,json:async()=>structuredClone(catalogues[name])};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
const research=await import('../dist/material-research-ui.js?thermal-onsager-integration');
const connections=await import('../dist/connections-ui.js?thermal-onsager-integration');
const settle=async view=>{const until=Date.now()+5000;while(Date.now()<until){if(view.container.querySelectorAll('[data-learning-bridge]').every(node=>node.getAttribute('aria-busy')==='false'))return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Teaching bridge failed to settle');};
const mount=async(render,selection)=>{const container=new Container(),navigations=[];await render({container,selection,onNavigate:patch=>navigations.push(patch),run:()=>{runs++;throw Error('Learning actions must not run Python');}});const view={container,navigations,$:s=>container.querySelector(s)};await settle(view);return view;};
const tab=async(view,prefix,id)=>{view.$('[data-'+prefix+'-tab="'+id+'"]').onclick();await settle(view);};
const controlState=host=>host.querySelectorAll('select').map(el=>[el.id,el.value]);
const contexts=[
 [research.renderMaterialResearchView,{module:'thermo',lesson:'thermal-oscillator'},'mr','thermal'],
 ...LEARNING_BRIDGE_HOOKS.onsager.map(lesson=>[connections.renderConnectionsView,{module:'reciprocity',lesson},'pw','onsager'])
];
for(const[render,selection,prefix,family]of contexts){
 const view=await mount(render,selection),host=view.$('[data-learning-bridge="'+family+'"]');assert.ok(host,selection.lesson);
 const original=view.$('#'+prefix+'-content').innerHTML;assert.ok(original.indexOf('data-learning-bridge')<original.indexOf('class="obs-formula"'),selection.lesson);
 const first=host.querySelector('select');assert.ok(first,selection.lesson);const alternate=first.querySelectorAll('option').find(el=>el.value!==first.value);assert.ok(alternate);
 first.value=alternate.value;first.onchange({target:first});
 const detail=host.querySelector('details');assert.ok(detail);detail.open=true;
 const before=controlState(host),stale=first.onchange,fetchBefore=requests;
 await tab(view,prefix,'lab');assert.equal(view.$('[data-learning-bridge]'),null);
 const input=view.container.querySelectorAll('input').find(el=>el.type==='number');assert.ok(input);input.value='';view.$('#'+prefix+'-form').oninput({target:input});
 await tab(view,prefix,'learn');const restored=view.$('[data-learning-bridge]');assert.deepEqual(controlState(restored),before,'Local choices survive ordinary tabs');
 assert.notEqual(restored.querySelector('details').getAttribute('open'),null,'Native open state survives queued toggle timing');
 stale({target:first});assert.deepEqual(controlState(restored),before,'Retired controls do not modify restored panels');
 await tab(view,prefix,'lab');assert.equal(view.$('#'+input.id).value,'','Original incomplete calculator input remains a draft');
 assert.equal(requests,fetchBefore,'Optional controls and tabs make no extra data requests');
}
const thermalCopy=await mount(research.renderMaterialResearchView,{module:'thermo',lesson:'thermal-oscillator'});
thermalCopy.$('#thb-thermal-oscillator-texact').onclick();
const natom=thermalCopy.$('#thb-thermal-oscillator-natom');natom.value='1';natom.onchange({target:natom});
await thermalCopy.$('#thb-thermal-oscillator-copy').onclick();
assert.equal(thermalCopy.$('#mr-source').value,'einstein');
assert.equal(Number(thermalCopy.$('#mr-natom').value),1);
assert.equal(Number(thermalCopy.$('#mr-theta-e').value),400);
assert.equal(Number(thermalCopy.$('#mr-tmin').value),400/Math.LN2);
assert.equal(Number(thermalCopy.$('#mr-tmax').value),400/Math.LN2);
assert.equal(thermalCopy.$('#mr-tmin').getAttribute('step'),'any');
assert.equal(runs,0,'An explicit complete-model copy still waits for manual calculation');
const forceCopy=await mount(connections.renderConnectionsView,{module:'reciprocity',lesson:'reciprocity-dissipation'});
const direction=forceCopy.$('#osb-dissipation-directions-forceAngle');direction.value='17.3';direction.oninput({target:direction});
await forceCopy.$('#osb-dissipation-directions-copy').onclick();
const rad=17.3*Math.PI/180;
assert.equal(Number(forceCopy.$('#pw-forceX').value),Math.cos(rad));
assert.equal(Number(forceCopy.$('#pw-forceY').value),Math.sin(rad));
assert.equal(forceCopy.$('#pw-forceX').getAttribute('step'),'any');
assert.equal(forceCopy.$('#pw-forceY').getAttribute('step'),'any');
assert.equal(forceCopy.$('#pw-preset').value,'','A copied continuous direction is editable custom input');
assert.equal(runs,0,'Copying continuous forces does not submit the experiment');
for(const[render,selection]of [[research.renderMaterialResearchView,{module:'thermo',calculationOnly:true}],[connections.renderConnectionsView,{module:'reciprocity',calculationOnly:true}],[research.renderMaterialResearchView,{module:'bands'}],[connections.renderConnectionsView,{module:'statistics'}]]){
 const view=await mount(render,selection);assert.equal(view.$('[data-learning-bridge]'),null,'Expert or unrelated views have no teaching panel');
}
assert.equal(runs,0);assert.equal(writes,0);
console.log('Thermal/Onsager integration: four exact lessons, optional lazy panels before original formulas, real control/native-state retention, incomplete original lab drafts, retired events, expert-view isolation and zero automatic calculation/mastery writes passed.');
