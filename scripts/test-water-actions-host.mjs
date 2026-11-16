import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import * as waterUI from '../dist/water-actions-ui.js';

// Keep native-style NodeLists outside the adapter's parser. Legacy theme
// controls bubble to their real host listeners, rather than an invented shell.
const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const originalQuery=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const nodes=originalQuery.call(this,selector);if(parsing)return nodes;return Object.assign({length:nodes.length,forEach:fn=>nodes.forEach(fn),[Symbol.iterator]:function*(){yield* nodes;}},Object.fromEntries(nodes.map((n,i)=>[i,n])));};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'tagName',{configurable:true,get(){return this.tag.toUpperCase();}});
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Element.prototype.addEventListener=function(type,listener){this.listeners??={};(this.listeners[type]??=[]).push(listener);};
Element.prototype.closest=function(selector){for(let node=this;node&&node instanceof Element;node=node.parentNode)if(node.matches(selector))return node;return null;};
Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let storageWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>storageWrites++};
const observers=[];globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}};
const clone=x=>structuredClone(x),prevent={preventDefault(){}};
let count=0;const freshHost=label=>import('../dist/foundations-demos.js?water-host-'+label+'-'+(++count));
async function bubble(node,type){const event={...prevent,target:node};if(typeof node['on'+type]==='function')await node['on'+type](event);for(let parent=node;parent instanceof Element;parent=parent.parentNode)for(const fn of parent.listeners?.[type]||[])await fn(event);}
async function click(page,selector){const node=page.querySelector(selector);assert.ok(node,selector);return bubble(node,'click');}
async function change(page,selector,value,type='change'){const node=page.querySelector(selector);assert.ok(node,selector);node.value=String(value);await bubble(node,type);}
async function open(page){const detail=page.querySelector('[data-water-actions-entry]');assert.ok(detail);detail.open=true;await detail.ontoggle();return detail;}
function close(page){const detail=page.querySelector('[data-water-actions-entry]');assert.ok(detail);detail.open=false;return detail.ontoggle();}

// A bounded stand-in makes loader ownership and the host's opaque state-store
// contract testable even without relying on the scientific renderer's markup.
function controlledBinder(bindings=[]){return{bindWaterActionsLesson(options){
 const {root,stateStore,isCurrent,run,cancelRun,download}=options;assert.ok(root.matches('[data-water-actions-body]'));assert.ok(stateStore instanceof Map);assert.equal(typeof run,'function');assert.equal(typeof download,'function');
 const state=clone(stateStore.get('panel:water-actions')||{note:'',stage:1,result:null}),record={options,state,cleanupCount:0};bindings.push(record);
 let active=true,pending=null;const current=()=>active&&isCurrent()&&root.isConnected!==false;
 function save(){stateStore.set('panel:water-actions',clone(state));}
 function draw(){root.innerHTML='<label>Note<input id="fake-note"></label><button type="button" id="fake-run">Run</button><button type="button" id="fake-next">Next</button><p id="fake-stage"></p><p id="fake-result"></p><button type="button" id="fake-export">Export</button>';root.querySelector('#fake-note').value=state.note;root.querySelector('#fake-stage').textContent=String(state.stage);root.querySelector('#fake-result').textContent=JSON.stringify(state.result);
  root.querySelector('#fake-note').oninput=()=>{if(current()){state.note=root.querySelector('#fake-note').value;save();}};
  root.querySelector('#fake-next').onclick=()=>{if(current()){state.stage++;save();draw();}};
  root.querySelector('#fake-export').onclick=()=>{if(current()&&state.result)download(JSON.stringify(state),'water-host-test.json','application/json');};
  root.querySelector('#fake-run').onclick=async()=>{if(!current()||pending)return;const owned={pending:true,promise:run('water_actions',{})};pending=owned;try{const result=await owned.promise;owned.pending=false;if(current()&&pending===owned){state.result=clone(result);save();draw();}}catch{}finally{owned.pending=false;if(pending===owned)pending=null;}};
 }
 draw();function cleanup(){if(!active)return;active=false;record.cleanupCount++;save();const owned=pending;pending=null;if(owned?.pending){if(typeof owned.promise.cancel==='function')owned.promise.cancel();else cancelRun?.();}}
 cleanup.snapshot=()=>clone(state);return cleanup;
}};}

{
 const host=await freshHost('restoration'),page=new Container(),bindings=[],calls=[],downloads=[],routes=[];let loads=0,fallback=0;
 const options={container:page,run:async(action,input)=>{calls.push({action,input:clone(input)});return {action,checks:{passed:true},marker:17};},cancelRun:()=>fallback++,download:(body,name)=>downloads.push({body:JSON.parse(body),name}),onNavigate:r=>routes.push(r),loadWaterActions:async()=>{loads++;return controlledBinder(bindings);}};
 const dispose=await host.renderFoundationsDemosView(options);assert.equal(typeof dispose,'function');assert.equal(loads,0);assert.equal(calls.length,0);assert.equal(page.querySelector('[data-water-actions-entry]').open,false);
 assert.ok(page.firstElementChild.innerHTML.indexOf('data-water-actions-entry')<page.firstElementChild.innerHTML.indexOf('class="fd-workspace"'),'The optional first-use explanation is visible immediately after the water topic navigation');
 await change(page,'[data-param="mode"]','antisymmetric');await change(page,'[data-param="phase"]',90,'input');const legacyPreview=clone(host.getFoundationsDemosResult());assert.equal(legacyPreview.input.mode,'antisymmetric');
 await open(page);assert.equal(loads,1);assert.equal(calls.length,0);await change(page,'#fake-note','Keep my water explanation','input');await click(page,'#fake-next');await click(page,'#fake-run');assert.deepEqual(calls,[{action:'water_actions',input:{}}]);assert.deepEqual(host.getFoundationsDemosResult(),legacyPreview,'Optional output does not replace the old export source');await click(page,'#fake-export');assert.equal(downloads.length,1);const staleExport=page.querySelector('#fake-export').onclick;
 close(page);assert.equal(bindings[0].cleanupCount,1);assert.equal(fallback,0);assert.equal(page.querySelector('#fake-note'),null);staleExport();assert.equal(downloads.length,1);
 await open(page);assert.equal(page.querySelector('#fake-note').value,'Keep my water explanation');assert.equal(page.querySelector('#fake-stage').textContent,'2');assert.match(page.querySelector('#fake-result').textContent,/17/);assert.equal(calls.length,1);
 await click(page,'[data-theme="characters"]');assert.equal(page.querySelector('[data-water-actions-entry]'),null);assert.doesNotMatch(page.firstElementChild.innerHTML,/水的特征标 −1 是怎样算出的/);assert.deepEqual(routes.at(-1),{experiment:'characters'});await click(page,'[data-theme="water"]');await flush();assert.equal(page.querySelector('[data-water-actions-entry]').open,true);assert.equal(page.querySelector('#fake-note').value,'Keep my water explanation');assert.equal(page.querySelector('#fake-stage').textContent,'2');assert.equal(calls.length,1);
 // The original Python handler updates only its own status/data. It must not
 // rebuild or cancel the independent optional workshop.
 await change(page,'[data-param="mode"]','bend');await click(page,'[data-action="python"]');await flush();assert.equal(calls.length,2);assert.equal(calls[1].action,'foundations_demos');assert.equal(calls[1].input.mode,'bend');assert.equal(host.getFoundationsDemosResult().tool,'foundations_demos');assert.equal(page.querySelector('#fake-note').value,'Keep my water explanation');assert.equal(fallback,0);
 dispose();const outside=new Container();const otherDispose=await host.renderFoundationsDemosView({...options,container:outside,selection:{experiment:'characters'}});assert.equal(outside.querySelector('[data-water-actions-entry]'),null);otherDispose();const returned=new Container();const returnedDispose=await host.renderFoundationsDemosView({...options,container:returned});await flush();assert.equal(returned.querySelector('[data-water-actions-entry]').open,true);assert.equal(returned.querySelector('#fake-note').value,'Keep my water explanation');assert.equal(returned.querySelector('#fake-stage').textContent,'2');assert.equal(calls.length,2);returnedDispose();assert.equal(fallback,0,'Idle teardown never cancels the shared client');
}

// The complete actual renderer and a genuine Python reply exercise every
// retained learner field through ordinary theme switches and full host returns.
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/water-actions.json',import.meta.url),'utf8'));
assert.equal(fixture.schema,'symmetry-lab-water-actions-fixture-1');const waterReply=fixture.cases[0].result;assert.equal(waterUI.waterActionsModel(waterReply).status,'available');
{
 const host=await freshHost('real-binder'),page=new Container(),calls=[],downloads=[];let imports=0,cancels=0;
 const options={container:page,run:async(action,input)=>{calls.push({action,input:clone(input)});return action==='water_actions'?clone(waterReply):{checks:{passed:true},legacyOnly:true};},cancelRun:()=>cancels++,download:(body,name)=>downloads.push({body:JSON.parse(body),name}),loadWaterActions:async()=>{imports++;return waterUI;}};
 const dispose=await host.renderFoundationsDemosView(options);assert.equal(imports,0);await open(page);assert.equal(calls.length,0);await page.querySelector('#wax-form').onsubmit(prevent);assert.deepEqual(calls,[{action:'water_actions',input:{}}]);
 await change(page,'#wax-note','A fixed atom is not three fixed displacement directions.','input');await change(page,'#wax-predict-oxygen','wrong');await click(page,'#wax-check-oxygen');assert.match(page.querySelector('#wax-feedback-oxygen').textContent,/固定原子只决定/);for(let i=0;i<4;i++)await click(page,'#wax-next');await change(page,'#wax-operation','sigma-yz');await change(page,'#wax-column','H2y');await change(page,'#wax-channel','raman-xz');
 let matrix=page.querySelector('[data-wax-native="matrix"]');matrix.open=true;matrix.ontoggle();assert.ok(page.querySelector('.wax-column'));assert.equal(page.querySelector('#wax-stage-status').textContent,'水分子位移步骤 5 / 5 步');await click(page,'#wax-export');assert.deepEqual(downloads[0],{body:{kind:'water-actions-teaching',input:{},result:waterReply},name:'water-actions-ledger.json'});
 const retainedForm=page.querySelector('#wax-form'),retainedResult=page.querySelector('#wax-result'),beforeLegacy=clone(host.getFoundationsDemosResult());await click(page,'[data-action="python"]');assert.equal(page.querySelector('#wax-form'),retainedForm);assert.equal(page.querySelector('#wax-result'),retainedResult);assert.equal(calls.length,2);assert.equal(calls[1].input.mode,beforeLegacy.input.mode);assert.equal(host.getFoundationsDemosResult().result.legacyOnly,true);await click(page,'#wax-export');assert.deepEqual(downloads[1],downloads[0]);
 const verify=target=>{assert.equal(target.querySelector('[data-water-actions-entry]').open,true);assert.equal(target.querySelector('#wax-operation').value,'sigma-yz');assert.equal(target.querySelector('#wax-column').value,'H2y');assert.equal(target.querySelector('#wax-channel').value,'raman-xz');assert.equal(target.querySelector('#wax-stage-status').textContent,'水分子位移步骤 5 / 5 步');assert.equal(target.querySelector('#wax-note').value,'A fixed atom is not three fixed displacement directions.');assert.equal(target.querySelector('#wax-predict-oxygen').value,'wrong');assert.match(target.querySelector('#wax-feedback-oxygen').textContent,/固定原子只决定/);assert.equal(target.querySelector('[data-wax-native="matrix"]').open,true);assert.ok(target.querySelector('.wax-column'));};
 await click(page,'[data-theme="projection"]');await click(page,'[data-theme="water"]');await flush();verify(page);assert.equal(calls.length,2);dispose();const returned=new Container();const returnedDispose=await host.renderFoundationsDemosView({...options,container:returned});await flush();verify(returned);assert.equal(calls.length,2);close(returned);returnedDispose();const collapsed=new Container();const collapsedDispose=await host.renderFoundationsDemosView({...options,container:collapsed});assert.equal(collapsed.querySelector('[data-water-actions-entry]').open,false);assert.equal(collapsed.querySelector('#wax-form'),null);await open(collapsed);verify(collapsed);assert.equal(calls.length,2);collapsedDispose();assert.equal(cancels,0);
}

// Retry and late imports stay behind a per-mount ticket, including two opens
// resolved in the opposite order and an ancestor disappearing from the DOM.
{
 const host=await freshHost('retry'),page=new Container();let attempts=0;const bindings=[];
 const dispose=await host.renderFoundationsDemosView({container:page,run:async()=>({}),loadWaterActions:()=>{if(!attempts++)throw Error('Temporary load failure');return controlledBinder(bindings);}});
 await open(page);assert.ok(page.querySelector('[data-water-actions-retry]'));assert.equal(bindings.length,0);await click(page,'[data-water-actions-retry]');assert.equal(attempts,2);assert.equal(bindings.length,1);dispose();
}
for(const route of ['theme','replacement','detach','dispose']){
 const host=await freshHost('late-'+route),page=new Container(),bindings=[];let release;
 const dispose=await host.renderFoundationsDemosView({container:page,run:async()=>({}),loadWaterActions:()=>new Promise(resolve=>{release=resolve;})});
 const opening=open(page);await flush();const observer=observers.at(-1);assert.equal(typeof release,'function');
 if(route==='theme')await click(page,'[data-theme="characters"]');else if(route==='replacement')page.innerHTML='<section>New route owns this page.</section>';else if(route==='detach')page.isConnected=false;else dispose();
 if(route==='replacement'||route==='detach')observer.fn();release(controlledBinder(bindings));await opening;assert.equal(bindings.length,0,route);assert.equal(page.querySelector('#fake-note'),null);dispose();assert.equal(observer.disconnected,true);
}
{
 const host=await freshHost('opposite-imports'),page=new Container(),releases=[],bindings=[];
 const dispose=await host.renderFoundationsDemosView({container:page,run:async()=>({}),loadWaterActions:()=>new Promise(resolve=>releases.push(resolve))});
 const first=open(page);await flush();close(page);const second=open(page);await flush();assert.equal(releases.length,2);releases[0](controlledBinder(bindings));await first;assert.equal(bindings.length,0);releases[1](controlledBinder(bindings));await second;assert.equal(bindings.length,1);dispose();
}

// The actual shared Python client's scoped cancellation must protect a newer
// request from completed, rejected, replaced and detached workshop owners.
const previousWorker=globalThis.Worker,workers=[];
globalThis.Worker=class{constructor(){this.messages=[];this.terminated=false;workers.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}reply(result,id=this.messages.at(-1)?.id){this.onmessage({data:{id,result}});}};
const client=await import('../dist/python-client.js');
for(const target of ['optional','legacy'])for(const reason of ['collapse','theme','replacement','detach','dispose']){
 if(target==='legacy'&&reason==='collapse')continue;
 client.cancelPython();const host=await freshHost('cancel-'+target+'-'+reason),page=new Container();let fallback=0;
 const dispose=await host.renderFoundationsDemosView({container:page,run:client.runPythonTask,cancelRun:()=>{fallback++;client.cancelPython();},loadWaterActions:async()=>controlledBinder()});if(target==='optional')await open(page);
 const pending=click(page,target==='optional'?'#fake-run':'[data-action="python"]');await flush();const worker=workers.at(-1);assert.equal(worker.terminated,false);assert.equal(worker.messages.at(-1).action,target==='optional'?'water_actions':'foundations_demos');
 if(reason==='collapse')close(page);else if(reason==='theme')await click(page,'[data-theme="characters"]');else if(reason==='replacement'){page.innerHTML='<section>New route</section>';observers.at(-1).fn();}else if(reason==='detach'){page.isConnected=false;observers.at(-1).fn();}else dispose();
 await pending;assert.equal(worker.terminated,true,target+' '+reason);assert.equal(fallback,0,'Scoped cancellation takes precedence over the global fallback');worker.reply({late:true});await flush();assert.equal(page.querySelector('#fake-result')?.textContent?.includes('late')||false,false);dispose();
}
for(const completion of ['success','rejected']){
 client.cancelPython();const host=await freshHost('stale-'+completion),page=new Container();let fallback=0;
 const dispose=await host.renderFoundationsDemosView({container:page,run:client.runPythonTask,cancelRun:()=>{fallback++;client.cancelPython();},loadWaterActions:async()=>controlledBinder()});await open(page);
 let pending;if(completion==='success'){pending=click(page,'[data-action="python"]');await flush();workers.at(-1).reply({checks:{passed:true}});await pending;await flush();}else{const expert=client.runPythonTask('analyze',{});pending=click(page,'#fake-run');await pending;assert.equal(workers.at(-1).terminated,false);workers.at(-1).reply({expert:true});await expert;}
 const newer=client.runPythonTask('analyze',{}),worker=workers.at(-1);dispose();assert.equal(worker.terminated,false,'A '+completion+' owner cannot cancel newer work');assert.equal(fallback,0);worker.reply({newer:true});assert.deepEqual(await newer,{newer:true});
}
{
 const host=await freshHost('unscoped-legacy'),page=new Container();let release,fallback=0;
 const dispose=await host.renderFoundationsDemosView({container:page,run:()=>new Promise(resolve=>{release=resolve;}),cancelRun:()=>fallback++});const pending=click(page,'[data-action="python"]');await flush();dispose();assert.equal(fallback,0,'Automatic teardown must not blindly cancel a newer shared task when the old promise lacks a scoped handle');const before=clone(host.getFoundationsDemosResult());release({lateUnscoped:true});await pending;assert.deepEqual(host.getFoundationsDemosResult(),before);
}

// Both actual optional and legacy handlers share one Worker. An attempt while
// the other owns it may fail, but must never stop that other calculation.
for(const pendingOwner of ['optional','legacy']){
 client.cancelPython();const host=await freshHost('real-independent-'+pendingOwner),page=new Container();let fallback=0;
 const dispose=await host.renderFoundationsDemosView({container:page,run:client.runPythonTask,cancelRun:()=>{fallback++;client.cancelPython();},loadWaterActions:async()=>waterUI});await open(page);
 const optional=()=>page.querySelector('#wax-form').onsubmit(prevent),legacy=()=>click(page,'[data-action="python"]');const pending=pendingOwner==='optional'?optional():legacy();await flush();const worker=workers.at(-1);assert.equal(worker.messages.at(-1).action,pendingOwner==='optional'?'water_actions':'foundations_demos');
 if(pendingOwner==='optional'){await legacy();assert.equal(worker.terminated,false);assert.match(page.querySelector('.fd-status').textContent,/已有 Python 任务/);worker.reply(clone(waterReply));await pending;assert.ok(page.querySelector('#wax-export'));}
 else{await optional();assert.equal(worker.terminated,false);assert.match(page.querySelector('#wax-error').textContent,/已有 Python 任务/);close(page);assert.equal(worker.terminated,false,'Closing the rejected optional owner does not stop legacy Python');worker.reply({checks:{passed:true},legacyOwner:true});await pending;assert.equal(host.getFoundationsDemosResult().result.legacyOwner,true);}
 const newer=client.runPythonTask('analyze',{}),fresh=workers.at(-1);dispose();assert.equal(fresh.terminated,false);fresh.reply({newer:true});assert.deepEqual(await newer,{newer:true});assert.equal(fallback,0);
}

// Re-rendering the same module disposes its predecessor even if a caller has
// not retained the returned cleanup; stale event listeners cannot write back.
{
 client.cancelPython();const host=await freshHost('module-replacement'),old=new Container(),next=new Container();const opts={run:client.runPythonTask,cancelRun:()=>{throw Error('Unexpected global cancellation');},loadWaterActions:async()=>controlledBinder()};const oldDispose=await host.renderFoundationsDemosView({...opts,container:old});await open(old);const pending=click(old,'#fake-run');await flush();const oldWorker=workers.at(-1),oldEvent=old.firstElementChild.listeners.click[0];const dispose=await host.renderFoundationsDemosView({...opts,container:next,selection:{experiment:'characters'}});await pending;assert.equal(oldWorker.terminated,true);const before=clone(host.getFoundationsDemosResult());await oldEvent({target:old.querySelector('[data-theme="water"]')});assert.deepEqual(host.getFoundationsDemosResult(),before);oldDispose();dispose();
}
{
 const originalSet=globalThis.setInterval,originalClear=globalThis.clearInterval,timers=new Map();let timerId=1000;
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,65);const id=++timerId;timers.set(id,fn);return id;};globalThis.clearInterval=id=>timers.delete(id);
 try{const host=await freshHost('animation-cleanup'),page=new Container();const dispose=await host.renderFoundationsDemosView({container:page});await click(page,'[data-action="animate"]');assert.equal(timers.size,1);const tick=[...timers.values()][0];tick();assert.equal(host.getFoundationsDemosResult().input.phase,35);dispose();assert.equal(timers.size,0);const final=clone(host.getFoundationsDemosResult());tick();assert.deepEqual(host.getFoundationsDemosResult(),final,'A detached animation cannot overwrite another result');}
 finally{globalThis.setInterval=originalSet;globalThis.clearInterval=originalClear;}
}
client.cancelPython();globalThis.Worker=previousWorker;delete globalThis.MutationObserver;
assert.equal(storageWrites,0,'Optional actions do not create course scores or mastery records');
console.log('Water action host passed: lazy disclosure/manual calculation, opaque state restoration, old preview/Python/export isolation, native NodeLists, scoped request cancellation, retry, stale imports and parent/module replacement.');
