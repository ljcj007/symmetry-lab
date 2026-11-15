import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import * as layerBridge from '../dist/layer-actions-bridge.js';
import {LEARNING_BRIDGE_HOOKS} from '../dist/learning-bridge-host.js';

assert.deepEqual(LEARNING_BRIDGE_HOOKS.layerActions,Object.keys(layerBridge.LAYER_ACTIONS_BRIDGE_HOOKS));
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/frontiers-materials.json',import.meta.url),'utf8'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/frontiers.json.gz',import.meta.url))));
const layerSchema=data.modules.find(module=>module.id==='layers');
let fetches=0,runs=0,writes=0;
globalThis.fetch=async url=>{fetches++;assert.match(String(url),/data\/frontiers-materials\.json/);return{ok:true,json:async()=>structuredClone(data)};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
Element.prototype.focus=function(){document.activeElement=this;};

// The adapter's parser needs arrays internally. Outside parsing, every actual
// Element query exposes an iterable, non-Array NodeList with native forEach.
const originalQuery=Element.prototype.querySelectorAll,htmlDescriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
let parsing=0;
const nodeList=items=>Object.assign({length:items.length,item:i=>items[i]??null,forEach:fn=>items.forEach(fn),[Symbol.iterator]:function*(){yield*items;}},Object.fromEntries(items.map((node,i)=>[i,node])));
Element.prototype.querySelectorAll=function(selector){const nodes=originalQuery.call(this,selector);return parsing?nodes:nodeList(nodes);};
Object.defineProperty(Element.prototype,'innerHTML',{get:htmlDescriptor.get,set(value){parsing++;try{htmlDescriptor.set.call(this,value);}finally{parsing--;}}});
const {renderFrontiersView,getFrontiersResult}=await import('../dist/frontiers-ui.js?layer-actions-integration');
const settle=async view=>{const until=Date.now()+5000;while(Date.now()<until){if([...view.container.querySelectorAll('[data-learning-bridge]')].every(host=>host.getAttribute('aria-busy')==='false'))return;await flush();}throw Error('Layer bridge did not settle');};
const defaultRun=()=>{runs++;throw Error('Teaching and input copying must wait for a manual run');};
async function mount(selection={module:'layers',lesson:'layer-periodicity'},extra={}){
 const container=extra.container??new Container(),navigations=[];
 await renderFrontiersView({container,selection,run:defaultRun,onNavigate:patch=>navigations.push(patch),...extra});
 const view={container,navigations,$:selector=>container.querySelector(selector)};
 if(!extra.skipSettle)await settle(view);return view;
}
const choose=(view,id,value)=>{const node=view.$('#'+id);assert.ok(node,id);node.value=String(value);node.onchange({target:node});};
const tab=async(view,id)=>{const node=view.$('[data-pw-tab="'+id+'"]');assert.ok(node,id);node.onclick();await settle(view);};
const lyab=(view,name)=>view.$('#lyab-layer-periodicity-'+name);
const request=caseId=>layerBridge.layerActionsLabRequest({caseId});

const initial=await mount();
assert.equal(Array.isArray(initial.container.querySelectorAll('button')),false);
assert.ok(initial.$('[data-learning-bridge="layerActions"]'));
assert.equal(initial.$('[data-learning-bridge="quantum"]'),null);
assert.equal(lyab(initial,'details').open,false);
const learnHTML=initial.$('#pw-content').innerHTML;assert.ok(learnHTML.indexOf('data-learning-bridge="layerActions"')<learnHTML.indexOf('class="obs-formula"'));
const fetchBefore=fetches;
choose(initial,'lyab-layer-periodicity-caseId','marker');choose(initial,'lyab-layer-periodicity-operation','mirror');choose(initial,'lyab-layer-periodicity-planeShift',1);choose(initial,'lyab-layer-periodicity-atom',3);
choose(initial,'lyab-layer-periodicity-q0','same');lyab(initial,'next').onclick();lyab(initial,'next').onclick();
lyab(initial,'details').open=true;lyab(initial,'normal').open=true;
lyab(initial,'note').value='Unfinished boundary explanation.';lyab(initial,'note').oninput();
const staleControl=lyab(initial,'caseId').onchange,oldCaseControl=lyab(initial,'caseId'),staleCopy=lyab(initial,'copy').onclick,oldTopic=initial.$('#pw-lesson'),staleTopic=oldTopic.onchange,staleDerive=initial.$('#pw-to-derive').onclick;
await tab(initial,'lab');
const draft=initial.$('#pw-layers');draft.value='';initial.$('#pw-form').oninput({target:draft});
initial.$('#pw-registry').value='.23';initial.$('#pw-form').oninput({target:initial.$('#pw-registry')});
await tab(initial,'learn');
assert.equal(lyab(initial,'details').open,true);assert.equal(lyab(initial,'normal').open,true);assert.equal(lyab(initial,'caseId').value,'marker');assert.equal(lyab(initial,'planeShift').value,'1');assert.equal(lyab(initial,'atom').value,'3');assert.equal(lyab(initial,'note').value,'Unfinished boundary explanation.');assert.equal(lyab(initial,'q0').value,'same');assert.equal(lyab(initial,'feedback0').textContent,'','An unsent prediction has no invented grading');
oldCaseControl.value='symmetric';staleControl({target:oldCaseControl});await staleCopy();staleTopic({target:{value:'layer-termination'}});staleDerive();
assert.equal(lyab(initial,'caseId').value,'marker');assert.equal(initial.$('#pw-lesson').value,'layer-periodicity');assert.equal(initial.$('#pw-form'),null);
await tab(initial,'lab');assert.equal(initial.$('#pw-layers').value,'');assert.equal(initial.$('#pw-registry').value,'.23');
await tab(initial,'learn');
await lyab(initial,'copy').onclick();
assert.equal(initial.$('[data-learning-bridge]'),null);assert.ok(initial.$('#pw-form'));assert.equal(initial.$('#pw-preset').value,'');
for(const field of layerSchema.fields){const control=initial.$('#pw-'+field.key);assert.ok(control,field.key);assert.equal(control.value,String(request('marker').input[field.key]));assert.equal(control.disabled,false);}
assert.equal(initial.$('#pw-form').querySelector('[role="alert"]'),null,'Explicit complete input discards the old incomplete draft');
assert.equal(getFrontiersResult(),null);assert.equal(runs,0);assert.equal(fetches,fetchBefore);
// The copied experiment remains editable and ordinary tabs retain edits.
initial.$('#pw-registry').value='.125';initial.$('#pw-form').oninput({target:initial.$('#pw-registry')});await tab(initial,'learn');await tab(initial,'lab');assert.equal(initial.$('#pw-registry').value,'.125');

// Capture the real handoff callback through the actual module binder. Invalid
// fields, missing schema fields and retired learn roots must be rejected.
let handoff;
const recording={...layerBridge,bindLayerActionsBridge:args=>{handoff=args.onOpenLab;return layerBridge.bindLayerActionsBridge(args);}};
const guarded=await mount(undefined,{loadBridgeModule:async()=>recording});
for(const bad of [{...request('marker'),action:'chirality_polarity_lab'},{...request('marker'),module:'chirality'},
 {...request('marker'),input:{...request('marker').input,selectedOperationIndex:7}},
 {...request('marker'),input:{...request('marker').input,face:'arbitrary'}},
 {...request('marker'),input:{...request('marker').input,layers:4.5}},
 {...request('marker'),input:{termination:'marker'}}])assert.equal(await handoff(bad),false);
assert.equal(guarded.$('#pw-form'),null);assert.equal(runs,0);
const retiredHandoff=handoff;await tab(guarded,'lab');assert.equal(await retiredHandoff(request('marker')),false);await tab(guarded,'learn');assert.equal(await retiredHandoff(request('marker')),false);
const currentHandoff=handoff;choose(guarded,'pw-lesson','layer-termination');assert.equal(guarded.$('[data-learning-bridge="layerActions"]'),null);assert.equal(await currentHandoff(request('marker')),false);
const beforeOther=await mount(undefined,{loadBridgeModule:async()=>recording});const previousModuleHandoff=handoff;
await mount({module:'chirality',lesson:data.lessons.find(lesson=>lesson.module==='chirality').id},{container:beforeOther.container});
assert.equal(await previousModuleHandoff(request('marker')),false);

// Delayed imports cannot attach to a retired lesson, and delayed input copies
// cannot replace the form of a different tab or a fresh mount of the same lesson.
let resolveLoad,loads=0,bound=0;
const delayedModule={...layerBridge,bindLayerActionsBridge:args=>{bound++;return layerBridge.bindLayerActionsBridge(args);}};
const loading=await mount(undefined,{skipSettle:true,loadBridgeModule:()=>{loads++;return new Promise(resolve=>{resolveLoad=resolve;});}});
const retiredHost=loading.$('[data-learning-bridge="layerActions"]');assert.equal(retiredHost.getAttribute('aria-busy'),'true');await tab(loading,'lab');resolveLoad(delayedModule);await flush();assert.equal(bound,0);assert.equal(loading.$('[data-learning-bridge]'),null);assert.equal(retiredHost.querySelector('details'),null);assert.equal(loads,1);
let releaseCopy;const delayedCopy={...layerBridge,bindLayerActionsBridge:args=>layerBridge.bindLayerActionsBridge({...args,onOpenLab:async payload=>{await new Promise(resolve=>{releaseCopy=resolve;});return args.onOpenLab(payload);}})};
const copying=await mount(undefined,{loadBridgeModule:async()=>delayedCopy}),oldCopyJob=lyab(copying,'copy').onclick();assert.equal(lyab(copying,'copy').disabled,true);
await tab(copying,'lab');copying.$('#pw-registry').value='.4';copying.$('#pw-form').oninput({target:copying.$('#pw-registry')});await tab(copying,'learn');
releaseCopy();await oldCopyJob;assert.ok(lyab(copying,'copy'));assert.equal(copying.$('#pw-form'),null);assert.equal(lyab(copying,'copy').disabled,false);await tab(copying,'lab');assert.equal(copying.$('#pw-registry').value,'.4');

// A failed optional load can retry, while a retired retry button cannot start
// work or navigate after the parent UI has moved on.
let attempts=0;const retry=await mount(undefined,{loadBridgeModule:async()=>{attempts++;if(attempts===1)throw Error('temporary module failure');return layerBridge;}});
const retryButton=retry.$('[data-learning-bridge-retry]');assert.ok(retryButton);retryButton.onclick();await settle(retry);assert.ok(lyab(retry,'details'));assert.equal(attempts,2);
let staleAttempts=0;const failed=await mount(undefined,{loadBridgeModule:async()=>{staleAttempts++;throw Error('temporary module failure');}}),oldRetry=failed.$('[data-learning-bridge-retry]').onclick;
await tab(failed,'lab');oldRetry();await flush();assert.equal(staleAttempts,1);assert.ok(failed.$('#pw-form'));

// Existing quantum panels keep their independent state/disposer and remain
// available only on the established SPT teaching hooks.
for(const lesson of ['spt-schmidt','spt-aklt-parent']){
 const spin=await mount({module:'spt',lesson});assert.ok(spin.$('[data-learning-bridge="quantum"]'));assert.equal(spin.$('[data-learning-bridge="layerActions"]'),null);
 const note=spin.$('[data-learning-bridge="quantum"]').querySelector('textarea');if(note){note.value='SPT-only note';note.oninput?.({target:note});}
 await tab(spin,'lab');await tab(spin,'learn');assert.ok(spin.$('[data-learning-bridge="quantum"]'));if(note)assert.equal(spin.$('[data-learning-bridge="quantum"]').querySelector('textarea').value,'SPT-only note');
}
for(const selection of [{module:'layers',lesson:'layer-periodicity',calculationOnly:true},{module:'layers',atlasOnly:true},{module:'layers',lesson:'layer-termination'},{module:'chirality'}]){const view=await mount(selection);assert.equal(view.$('[data-learning-bridge="layerActions"]'),null);}
assert.equal(runs,0);assert.equal(writes,0,'Optional learning and copying do not write mastery or notebook records');

// One manual submit uses the complete copied schema and the existing real API
// fixture. No selected operation, representative or local teaching state leaks.
const manualCalls=[],manual=await mount(undefined,{run:async(action,input)=>{runs++;manualCalls.push({action,input:structuredClone(input)});assert.equal(action,'layer_symmetry_lab');return structuredClone(fixture.results['layer-surface']);}});
choose(manual,'lyab-layer-periodicity-caseId','marker');await lyab(manual,'copy').onclick();assert.equal(runs,0);manual.$('#pw-form').onsubmit({preventDefault(){}});await flush();
assert.equal(runs,1);assert.deepEqual(manualCalls,[{action:'layer_symmetry_lab',input:request('marker').input}]);assert.equal(getFrontiersResult().module,'layers');assert.ok(manual.$('#ft-geometry').querySelector('svg'));
assert.equal(getFrontiersResult().result.summary[2].value,8);assert.equal(getFrontiersResult().result.summary[3].value,0);
console.log('Layer actions integration: exact learning hook, real UI with non-Array NodeLists, independent quantum state, native/RAM/incomplete-draft retention, complete editable schema copy, stale lesson/tab/module/load/copy/retry guards, and one explicit real-fixture manual run passed.');
