import assert from 'node:assert/strict';
import {Element,Container} from './test-material-research-ui.mjs';
import {LEARNING_BRIDGE_HOOKS,learningBridgeHTML,bindLearningBridge} from '../dist/learning-bridge-host.js';
let loads=0,bindings=0,disposals=0,launches=0,storeWrites=0;
const store=new Map();
const fake={hubbardBridgeHTML:id=>'<details data-host-test><summary>'+id+'</summary></details>',
 bindHubbardLearningBridge:options=>{bindings++;assert.equal(options.isCurrent(),true);assert.equal(options.stateStore,store);const cleanup=()=>{assert.equal(options.isCurrent(),true,'Native-state disposal runs before host retirement');disposals++;};cleanup.snapshot=()=>({saved:true});return cleanup;}};
const mount=(family='hubbard',lessonId='manybody-lehmann')=>{const root=new Container();root.innerHTML=learningBridgeHTML(family,lessonId);return root;};
assert.equal(learningBridgeHTML('unknown','manybody-lehmann'),'');
assert.equal(learningBridgeHTML('hubbard','future'),'');
assert.deepEqual(Object.values(LEARNING_BRIDGE_HOOKS).map(x=>x.length),[2,5,1,3]);
const never=bindLearningBridge({root:mount('hubbard','future'),family:'hubbard',lessonId:'future',loadModule:()=>{throw Error('Unknown hooks stay unloaded');}});await never.ready;never();
let release;const wait=new Promise(resolve=>{release=resolve;});
const first=mount(),retired=bindLearningBridge({root:first,family:'hubbard',lessonId:'manybody-lehmann',stateStore:store,loadModule:()=>{loads++;return wait;}});
assert.equal(loads,1);retired();release(fake);await retired.ready;
assert.equal(bindings,0,'A retired load cannot render or bind a panel');assert.equal(first.querySelector('[data-host-test]'),null);
const second=mount(),live=bindLearningBridge({root:second,family:'hubbard',lessonId:'manybody-lehmann',stateStore:store,onOpenLab:()=>{launches++;},loadModule:async()=>{loads++;return fake;}});
await live.ready;assert.equal(bindings,1);assert.equal(second.querySelector('[data-learning-bridge]').getAttribute('aria-busy'),'false');assert.deepEqual(live.snapshot(),{saved:true});
assert.equal(launches,0,'Loading a teaching panel cannot run or open a calculator');live();live();assert.equal(disposals,1);
const third=mount();let attempts=0,finish;const retryWait=new Promise(resolve=>{finish=resolve;});
const retry=bindLearningBridge({root:third,family:'hubbard',lessonId:'manybody-lehmann',stateStore:store,loadModule:()=>{attempts++;return attempts===1?Promise.reject(Error('temporary')):retryWait;}});
await retry.ready;const retryButton=third.querySelector('[data-learning-bridge-retry]');assert.ok(retryButton);
retryButton.onclick();const waiting=retry.ready;retryButton.onclick();assert.equal(attempts,2,'Repeated retry shares one module request');finish(fake);await waiting;assert.equal(bindings,2);retry();assert.equal(disposals,2);
const fourth=mount();let resolveDetached;const detachedWait=new Promise(resolve=>{resolveDetached=resolve;});
const detached=bindLearningBridge({root:fourth,family:'hubbard',lessonId:'manybody-lehmann',stateStore:store,loadModule:()=>detachedWait});
fourth.isConnected=false;resolveDetached(fake);await detached.ready;assert.equal(bindings,2,'Detached views cannot bind late modules');detached();
for(const [family,lessonId,htmlName,bindName]of [
 ['thermal','thermal-oscillator','thermalBridgeHTML','bindThermalLearningBridge'],
 ['onsager','reciprocity-onsager','onsagerBridgeHTML','bindOnsagerLearningBridge']
]){
 let requested=null,bound=false;
 const root=mount(family,lessonId),module={
  [htmlName]:id=>'<details data-host-test><summary>'+id+'</summary></details>',
  [bindName]:options=>{bound=true;assert.equal(options.lessonId,lessonId);assert.equal(options.stateStore,store);return()=>{};}
 };
 const cleanup=bindLearningBridge({root,family,lessonId,stateStore:store,loadModule:async key=>{requested=key;return module;}});
 await cleanup.ready;assert.equal(requested,family);assert.ok(bound);cleanup();
}
assert.equal(learningBridgeHTML('thermal','reciprocity-onsager'),'');
assert.equal(learningBridgeHTML('onsager','thermal-oscillator'),'');
console.log('Learning bridge host: scoped lazy hooks, deduplicated retries, async tab/detach isolation, state disposal order and zero automatic calculation passed.');
