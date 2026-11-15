import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import * as chiralityBridge from '../dist/chirality-actions-bridge.js';
import {LEARNING_BRIDGE_HOOKS} from '../dist/learning-bridge-host.js';

assert.deepEqual(LEARNING_BRIDGE_HOOKS.chiralityActions,Object.keys(chiralityBridge.CHIRALITY_ACTIONS_BRIDGE_HOOKS));
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/frontiers-materials.json',import.meta.url),'utf8'));
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/frontiers.json.gz',import.meta.url))));
const schema=data.modules.find(module=>module.id==='chirality');
let fetches=0,runs=0,writes=0;
globalThis.fetch=async url=>{fetches++;assert.match(String(url),/data\/frontiers-materials\.json/);return{ok:true,json:async()=>structuredClone(data)};};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
Element.prototype.focus=function(){document.activeElement=this;};
// A real NodeList has no Array map/find/filter. Keep arrays only inside the
// adapter's HTML parser, then expose native-style iterable query results.
const originalQuery=Element.prototype.querySelectorAll,descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
const list=nodes=>Object.assign({length:nodes.length,item:i=>nodes[i]??null,forEach:fn=>nodes.forEach(fn),[Symbol.iterator]:function*(){yield*nodes;}},Object.fromEntries(nodes.map((node,i)=>[i,node])));
Element.prototype.querySelectorAll=function(selector){const nodes=originalQuery.call(this,selector);return parsing?nodes:list(nodes);};
Object.defineProperty(Element.prototype,'innerHTML',{get:descriptor.get,set(value){parsing++;try{descriptor.set.call(this,value);}finally{parsing--;}}});
const {renderFrontiersView,getFrontiersResult}=await import('../dist/frontiers-ui.js?chirality-actions-integration');
const settle=async view=>{const until=Date.now()+5000;while(Date.now()<until){if([...view.container.querySelectorAll('[data-learning-bridge]')].every(host=>host.getAttribute('aria-busy')==='false'))return;await flush();}throw Error('Optional bridge did not settle');};
const defaultRun=()=>{runs++;throw Error('A teaching action must wait for manual calculation');};
async function mount(selection={module:'chirality',lesson:'chiral-mirror'},extra={}){
 const container=extra.container??new Container(),navigations=[];
 await renderFrontiersView({container,selection,run:defaultRun,onNavigate:patch=>navigations.push(patch),...extra});
 const view={container,navigations,$:selector=>container.querySelector(selector)};if(!extra.skipSettle)await settle(view);return view;
}
const choose=(view,id,value)=>{const node=view.$('#'+id);assert.ok(node,id);node.value=String(value);node.onchange({target:node});};
const tab=async(view,id)=>{view.$('[data-pw-tab="'+id+'"]').onclick();await settle(view);};
const local=(view,lesson,name)=>view.$('#chab-'+lesson+'-'+name);
const request=caseId=>chiralityBridge.chiralityActionsLabRequest({caseId});

for(const lesson of ['chiral-mirror','chiral-polarity']){
 const view=await mount({module:'chirality',lesson}),$=name=>local(view,lesson,name);
 assert.equal(Array.isArray(view.container.querySelectorAll('button')),false);assert.ok(view.$('[data-learning-bridge="chiralityActions"]'));assert.equal(view.$('[data-learning-bridge="layerActions"]'),null);assert.equal(view.$('[data-learning-bridge="quantum"]'),null);assert.equal($('details').open,false);
 assert.ok(view.$('#pw-content').innerHTML.indexOf('data-learning-bridge="chiralityActions"')<view.$('#pw-content').innerHTML.indexOf('class="obs-formula"'));
 const first=$('caseId');first.focus();choose(view,first.id,'tetra');choose(view,$('components').id,'passive');choose(view,$('q0').id,lesson==='chiral-mirror'?'proper':'all');$('next').onclick();$('next').onclick();$('next').onclick();assert.equal($('caseId'),first);assert.equal(document.activeElement,first);
 $('details').open=true;$('conventions').open=true;$('note').value='Unsubmitted '+lesson;$('note').oninput();
 choose(view,$('q1').id,lesson==='chiral-mirror'?'roles':'zero');
 const oldCase=first.onchange,oldCopy=$('copy').onclick,oldTopic=view.$('#pw-lesson').onchange,oldDerive=view.$('#pw-to-derive').onclick,beforeFetches=fetches;
 await tab(view,'lab');view.$('#pw-noise').value='';view.$('#pw-form').oninput({target:view.$('#pw-noise')});view.$('#pw-angle').value='7';view.$('#pw-form').oninput({target:view.$('#pw-angle')});await tab(view,'learn');
 assert.equal($('details').open,true);assert.equal($('conventions').open,true);assert.equal($('caseId').value,'tetra');assert.equal($('components').value,'passive');assert.equal($('note').value,'Unsubmitted '+lesson);assert.equal($('q1').value,lesson==='chiral-mirror'?'roles':'zero');assert.equal($('feedback1').textContent,'');
 oldCase({target:first});await oldCopy();oldTopic({target:{value:'chiral-tolerance'}});oldDerive();assert.equal(view.$('#pw-lesson').value,lesson);assert.equal(view.$('#pw-form'),null);
 await tab(view,'lab');assert.equal(view.$('#pw-noise').value,'');assert.equal(view.$('#pw-angle').value,'7');await tab(view,'learn');
 await $('copy').onclick();assert.ok(view.$('#pw-form'));assert.equal(view.$('[data-learning-bridge]'),null);assert.equal(view.$('#pw-preset').value,'');
 for(const field of schema.fields){const control=view.$('#pw-'+field.key);assert.equal(control.value,String(request('tetra').input[field.key]));assert.equal(control.disabled,false);}
 assert.equal(view.$('#pw-form').querySelector('[role="alert"]'),null);assert.equal(view.$('#pw-angle').getAttribute('step'),'any');assert.equal(getFrontiersResult(),null);assert.equal(fetches,beforeFetches);assert.equal(runs,0);
 view.$('#pw-angle').value='12.5';view.$('#pw-form').oninput({target:view.$('#pw-angle')});await tab(view,'learn');await tab(view,'lab');assert.equal(view.$('#pw-angle').value,'12.5');
}
// Both lessons retain their own RAM values rather than sharing a single state.
const pair=await mount();choose(pair,'chab-chiral-mirror-caseId','tetra');local(pair,'chiral-mirror','note').value='Mirror note';local(pair,'chiral-mirror','note').oninput();
choose(pair,'pw-lesson','chiral-polarity');await settle(pair);assert.equal(local(pair,'chiral-polarity','caseId').value,'pyramid');choose(pair,'chab-chiral-polarity-caseId','octahedron');local(pair,'chiral-polarity','note').value='Polar note';local(pair,'chiral-polarity','note').oninput();
choose(pair,'pw-lesson','chiral-mirror');await settle(pair);assert.equal(local(pair,'chiral-mirror','caseId').value,'tetra');assert.equal(local(pair,'chiral-mirror','note').value,'Mirror note');choose(pair,'pw-lesson','chiral-polarity');await settle(pair);assert.equal(local(pair,'chiral-polarity','caseId').value,'octahedron');assert.equal(local(pair,'chiral-polarity','note').value,'Polar note');

let handoff;
const recording={...chiralityBridge,bindChiralityActionsBridge:args=>{handoff=args.onOpenLab;return chiralityBridge.bindChiralityActionsBridge(args);}};
const guarded=await mount(undefined,{loadBridgeModule:async()=>recording});
for(const invalid of [{...request('d3'),action:'layer_symmetry_lab'},{...request('d3'),module:'layers'},
 {...request('d3'),input:{...request('d3').input,fitOperationIndex:1}},
 {...request('d3'),input:{...request('d3').input,motif:'arbitrary'}},
 {...request('d3'),input:{...request('d3').input,noise:-.1}},
 {...request('d3'),input:{motif:'d3'}}])assert.equal(await handoff(invalid),false);
assert.equal(guarded.$('#pw-form'),null);
const retired=handoff;await tab(guarded,'lab');assert.equal(await retired(request('d3')),false);await tab(guarded,'learn');assert.equal(await retired(request('d3')),false);
const previousLesson=handoff;choose(guarded,'pw-lesson','chiral-polarity');await settle(guarded);assert.equal(await previousLesson(request('d3')),false);
const currentLesson=handoff;choose(guarded,'pw-lesson','chiral-tolerance');await settle(guarded);assert.equal(await currentLesson(request('d3')),false);assert.equal(guarded.$('[data-learning-bridge="chiralityActions"]'),null);
const oldModule=await mount(undefined,{loadBridgeModule:async()=>recording}),moduleHandoff=handoff;await mount({module:'layers',lesson:'layer-periodicity'},{container:oldModule.container});assert.equal(await moduleHandoff(request('pyramid')),false);

let releaseLoad,bound=0;const delayed={...chiralityBridge,bindChiralityActionsBridge:args=>{bound++;return chiralityBridge.bindChiralityActionsBridge(args);}};
const loading=await mount(undefined,{skipSettle:true,loadBridgeModule:()=>new Promise(resolve=>{releaseLoad=resolve;})});const oldHost=loading.$('[data-learning-bridge="chiralityActions"]');await tab(loading,'lab');releaseLoad(delayed);await flush();assert.equal(bound,0);assert.equal(oldHost.querySelector('details'),null);assert.ok(loading.$('#pw-form'));
let releaseCopy;const pendingModule={...chiralityBridge,bindChiralityActionsBridge:args=>chiralityBridge.bindChiralityActionsBridge({...args,onOpenLab:async payload=>{await new Promise(resolve=>{releaseCopy=resolve;});return args.onOpenLab(payload);}})};
const copying=await mount(undefined,{loadBridgeModule:async()=>pendingModule}),oldJob=local(copying,'chiral-mirror','copy').onclick();assert.equal(local(copying,'chiral-mirror','copy').disabled,true);await tab(copying,'lab');copying.$('#pw-angle').value='43';copying.$('#pw-form').oninput({target:copying.$('#pw-angle')});await tab(copying,'learn');releaseCopy();await oldJob;assert.equal(copying.$('#pw-form'),null);assert.equal(local(copying,'chiral-mirror','copy').disabled,false);await tab(copying,'lab');assert.equal(copying.$('#pw-angle').value,'43');
let attempts=0;const retry=await mount(undefined,{loadBridgeModule:async()=>{if(++attempts===1)throw Error('temporary');return chiralityBridge;}});retry.$('[data-learning-bridge-retry]').onclick();await settle(retry);assert.ok(local(retry,'chiral-mirror','details'));assert.equal(attempts,2);
let staleAttempts=0;const failed=await mount(undefined,{loadBridgeModule:async()=>{staleAttempts++;throw Error('temporary');}}),oldRetry=failed.$('[data-learning-bridge-retry]').onclick;await tab(failed,'lab');oldRetry();await flush();assert.equal(staleAttempts,1);

// Existing layer and quantum bridges keep their independent hooks and state.
for(const selection of [{module:'layers',lesson:'layer-periodicity'},{module:'spt',lesson:'spt-schmidt'},{module:'spt',lesson:'spt-aklt-parent'}]){
 const view=await mount(selection),family=selection.module==='layers'?'layerActions':'quantum',host=view.$('[data-learning-bridge="'+family+'"]');assert.ok(host);assert.equal(view.$('[data-learning-bridge="chiralityActions"]'),null);
 const note=host.querySelector('textarea');if(note){note.value='Independent '+family;note.oninput?.({target:note});}await tab(view,'lab');await tab(view,'learn');assert.ok(view.$('[data-learning-bridge="'+family+'"]'));if(note)assert.equal(view.$('[data-learning-bridge="'+family+'"] textarea')?.value??view.$('[data-learning-bridge="'+family+'"]')?.querySelector('textarea')?.value,'Independent '+family);
}
for(const selection of [{module:'chirality',lesson:'chiral-mirror',calculationOnly:true},{module:'chirality',atlasOnly:true},{module:'chirality',lesson:'chiral-tolerance'}]){const view=await mount(selection);assert.equal(view.$('[data-learning-bridge="chiralityActions"]'),null);}
assert.equal(runs,0);assert.equal(writes,0);

const calls=[],manual=await mount(undefined,{run:async(action,input)=>{runs++;calls.push({action,input:structuredClone(input)});return structuredClone(fixture.results['chiral-polar']);}});choose(manual,'chab-chiral-mirror-caseId','pyramid');await local(manual,'chiral-mirror','copy').onclick();assert.equal(runs,0);manual.$('#pw-form').onsubmit({preventDefault(){}});await flush();assert.equal(runs,1);assert.deepEqual(calls,[{action:'chirality_polarity_lab',input:request('pyramid').input}]);assert.equal(getFrontiersResult().module,'chirality');assert.equal(getFrontiersResult().result.summary[2].value,1);assert.ok(manual.$('#ft-geometry').querySelector('svg'));
console.log('Chirality integration: two real learn hooks, non-Array NodeLists, independent native/RAM state, ordinary lab drafts, full six-field editable/manual copy, stale lesson/tab/module/load/copy/retry guards and existing quantum/layer preservation passed.');
