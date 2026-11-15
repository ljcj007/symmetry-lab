import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {compositionRequest as request,compositionModel as model,compositionResultHTML as render,compositionDrawingHTML as drawing,bindCompositionLesson as bind,COMPOSITION_PRESETS as presets} from '../dist/composition-ui.js';

const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const list=queryAll.call(this,selector);if(parsing)return list;return Object.assign({length:list.length,forEach:fn=>list.forEach(fn),[Symbol.iterator]:function*(){yield* list;}},Object.fromEntries(list.map((n,i)=>[i,n])));};
Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let masteryWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>masteryWrites++};
const clone=x=>structuredClone(x),json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const refs=json('./fixtures/composition.json'),rawFor=p=>({preset:'',first:p.first,second:p.second,px:String(p.point[0]),py:String(p.point[1]),candidateSet:p.candidateSet.slice()});
assert.equal(refs.cases.length,8);assert.match(refs.method,/Actual browser_api\.run/);
const core='dist/python/composition_lab.py';assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+core,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),refs.sourceHashes[core]);
const replies=new Map(refs.cases.map(c=>[JSON.stringify(c.input),c.result]));
for(const c of refs.cases){
 assert.equal(model(c.result).status,'available',c.id);assert.deepEqual(request(rawFor(c.input)),c.input);const before=clone(c.result);
 for(const stage of [1,2,3,4])for(const frame of [0,1,2])assert.doesNotMatch(render(c.result,{stage,frame}),/katex-error|\b(?:NaN|undefined|Infinity)\b/);
 assert.doesNotMatch(render(c.result,{stage:1}),/最终操作编号|完整操作矩阵/,'Observe the paths before revealing the matrix-column interpretation');
 assert.deepEqual(c.result,before);const final=render(c.result,{stage:4});assert.match(final,/固定反例不随/);assert.match(final,/C4v/);assert.match(final,/proper D4/);assert.match(final,/最右因子先作用/);
 assert.ok(final.includes(c.result.group.closure.convention),'Generated subgroup construction displays its returned identity-insertion convention');
 for(const path of ['forward','swapped'])for(const frame of c.result.paths[path].frames)for(const width of [160,228,390,640]){const svg=drawing(frame,{width,title:'Returned frame'});assert.match(svg,new RegExp('viewBox="0 0 '+width+' 300"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.equal((svg.match(/class="cpx-basis /g)||[]).length,2);}
}
assert.match(render({}),/role="alert"/);assert.equal(drawing({}), '');
for(const bad of [{px:''},{py:'-'},{px:'0.5'},{py:'NaN'},{px:'3'},{first:'__proto__'},{second:'unknown'},{candidateSet:[]},{candidateSet:['R','R']}])assert.throws(()=>request(bad));
function mount({raw={},store=new Map(),calculate,active=()=>true}={}){
 const page=new Container();page.innerHTML='<section><div data-composition-body></div></section>';
 store.set('panel:group-basics',{raw,...(store.get('panel:group-basics')||{})});const calls=[],cancels=[],exports=[];
 const run=calculate||(async(action,input)=>{calls.push({action,input:clone(input)});const response=replies.get(JSON.stringify(input));assert.ok(response,'Request needs a genuine API fixture: '+JSON.stringify(input));return clone(response);});
 const cleanup=bind({root:page.firstElementChild,stateStore:store,isCurrent:active,run,cancelRun:()=>cancels.push(true),download:(body,name,type)=>exports.push({body:JSON.parse(body),name,type})});
 return{page,store,calls,cancels,exports,cleanup,$:name=>page.querySelector('#cpx-'+name)};
}
const set=(v,name,value,event='oninput')=>{const n=v.$(name);assert.ok(n,name);n.value=String(value);return n[event]?.({target:n});};
const choose=(v,name,value)=>set(v,name,value,'onchange'),click=(v,name)=>{const n=v.$(name);assert.ok(n,name);return n.onclick?.();},submit=v=>v.$('form').onsubmit({preventDefault(){}});
for(const c of refs.cases){
 const v=mount({raw:rawFor(c.input)});assert.equal(v.calls.length,0);await submit(v);assert.deepEqual(v.calls,[{action:'teaching_labs',input:c.input}]);
 for(let i=0;i<3;i++)click(v,'next');assert.equal(v.$('stage-status').textContent,'第 4 / 4 步');assert.equal(v.$('next').disabled,true);
 choose(v,'frame','2');assert.equal(v.calls.length,1,'Frames do not calculate again');assert.ok(v.$('drawing-forward').querySelector('svg'));assert.ok(v.$('drawing-swapped').querySelector('svg'));
 click(v,'export');assert.deepEqual(v.exports[0].body,{kind:'composition-teaching',input:c.input,result:c.result});
 const detail=v.page.querySelector('[data-cpx-native="table"]');detail.open=true;detail.ontoggle();set(v,'note','Check the action space and both independent arrows.');choose(v,'predict-order','right');click(v,'check-order');assert.match(v.$('feedback-order').textContent,/先做 R/);
 const snapshot=v.cleanup.snapshot();v.cleanup();const restored=mount({store:v.store});assert.equal(restored.calls.length,0);assert.equal(restored.$('note').value,snapshot.note);assert.equal(restored.$('frame').value,'2');assert.equal(restored.$('stage-status').textContent,'第 4 / 4 步');assert.equal(restored.page.querySelector('[data-cpx-native="table"]').open,true);restored.cleanup();
}
const v=mount();for(const p of presets){choose(v,'preset',p.id);assert.equal(v.calls.length,0);await submit(v);assert.equal(v.calls.length,1);v.calls.length=0;}choose(v,'preset','noncommuting');await submit(v);
const staleExport=v.$('export').onclick;set(v,'px','-');assert.equal(v.$('export'),null);staleExport();assert.equal(v.exports.length,0);await submit(v);assert.equal(v.calls.length,1);assert.equal(v.$('error').hidden,false);assert.equal(v.$('px').value,'-');const draftStore=v.store;v.cleanup();const draft=mount({store:draftStore});assert.equal(draft.$('px').value,'-');assert.equal(draft.calls.length,0);set(draft,'px','1');assert.equal(draft.$('error').hidden,true);await submit(draft);assert.ok(draft.$('export'));draft.cleanup();
const feedback=mount();for(const name of ['order','probe','closure']){choose(feedback,'predict-'+name,'wrong');click(feedback,'check-'+name);const wrong=feedback.$('feedback-'+name).textContent;choose(feedback,'predict-'+name,'right');assert.equal(feedback.$('feedback-'+name).textContent,'');click(feedback,'check-'+name);assert.notEqual(feedback.$('feedback-'+name).textContent,wrong);}assert.equal(feedback.calls.length,0);feedback.cleanup();
const damaged=[r=>{r.operators[0]=null;},r=>{r.basis.order='xy';},r=>delete r.paths.forward.frames[1].basis,r=>{r.group.multiplication.entries[0][0]='wrong';},r=>{r.group.closure.complete=false;},r=>delete r.group.inverses[0].leftMatrix,r=>delete r.fixedProbeCounterexample.basis[1].right,r=>{r.embedding.fixedZ.group='D4';},r=>delete r.steps[0].formula,r=>{r.paths.forward.frames[0].point.numeric[0]=NaN;},r=>{r.paths.forward.frames[0].point.numeric[0]=2;},r=>{r.paths.forward.frames[0].basis[1].exact[1]=0;},r=>{r.operators[0].matrix.numeric[0][0]=0;},r=>{r.embedding.fixedZ.mirror.numeric[2][2]=-1;},r=>delete r.group.closure.convention];
for(const damage of damaged){const broken=clone(refs.cases[0].result);damage(broken);assert.equal(model(broken).status,'invalid');assert.match(render(broken),/role="alert"/);let count=0;const view=mount({calculate:async()=>clone(count++?refs.cases[0].result:broken)});await assert.doesNotReject(submit(view));assert.equal(view.$('fieldset').disabled,false);assert.equal(view.$('error').hidden,false);assert.equal(view.$('export'),null);await submit(view);assert.equal(view.$('error').hidden,true);assert.ok(view.$('export'));view.cleanup();}
const mismatched=clone(refs.cases[0].result);mismatched.normalizedInput.point=[0,0];const mismatch=mount({calculate:async()=>mismatched});await submit(mismatch);assert.equal(mismatch.$('error').hidden,false);assert.equal(mismatch.$('export'),null);mismatch.cleanup();
let finishOld,finishNew,current=true,scopedCancels=0;const oldTask=new Promise(resolve=>{finishOld=resolve;});Object.defineProperty(oldTask,'cancel',{value:()=>{scopedCancels++;return true;}});
const leaving=mount({calculate:()=>oldTask,active:()=>current}),oldPending=submit(leaving);current=false;leaving.cleanup();assert.equal(scopedCancels,1,'Detached cleanup uses only the exact pending handle');assert.equal(leaving.cancels.length,0,'Detached cleanup never cancels a shared client blindly');finishOld(clone(refs.cases[0].result));await oldPending;assert.equal(leaving.$('export'),null);
let resolveA,resolveB,owned='A',scopedStopped=[];const taskA=new Promise(resolve=>{resolveA=resolve;});taskA.cancel=()=>{if(owned!=='A')return false;scopedStopped.push('A');owned=null;return true;};const sharing=mount({calculate:()=>taskA});const staleJob=submit(sharing);owned='B';sharing.cleanup();assert.deepEqual(scopedStopped,[],'A late old cancellation cannot stop a newer task');resolveA(clone(refs.cases[0].result));await staleJob;
let firstResolve,secondResolve;const racing=mount({calculate:()=>new Promise(resolve=>{if(!firstResolve)firstResolve=resolve;else secondResolve=resolve;})});const first=submit(racing),oldCancel=racing.$('cancel').onclick;click(racing,'cancel');assert.equal(racing.cancels.length,1);const second=submit(racing);firstResolve(clone(refs.cases[0].result));await first;assert.equal(racing.$('fieldset').disabled,true);oldCancel();assert.equal(racing.cancels.length,1);secondResolve(clone(refs.cases[0].result));await second;assert.equal(racing.$('fieldset').disabled,false);racing.cleanup();

// The real shared client provides scoped cancellation. A task cancelled outside
// this panel may already have been replaced before its old panel is detached.
const previousWorker=globalThis.Worker,workers=[];
globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}};
const client=await import('../dist/python-client.js?composition-client-ownership');
const oldView=mount({calculate:client.runPythonTask}),oldViewPending=submit(oldView);assert.equal(workers.length,1);
client.cancelPython();const nextTask=client.runPythonTask('teaching_labs',refs.cases[0].input),newWorker=workers.at(-1);
assert.equal(workers.length,2);oldView.cleanup();assert.equal(newWorker.terminated,false,'Real stale Promise.cancel cannot terminate a replacement worker');
const rejected=client.runPythonTask('teaching_labs',refs.cases[0].input);assert.equal(rejected.cancel(),false);await assert.rejects(rejected,/已有 Python/);assert.equal(newWorker.terminated,false);
newWorker.onmessage({data:{id:newWorker.message.id,result:clone(refs.cases[0].result)}});assert.deepEqual(await nextTask,refs.cases[0].result);await oldViewPending;assert.equal(nextTask.cancel(),false);globalThis.Worker=previousWorker;

// Exercise the real lesson host, not a substitute entry markup.
const lessons=json('../dist/data/pointgroup-lessons.json'),atlas=json('../dist/data/pointgroup-atlas.json');
globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas});
const pg=await import('../dist/pointgroup-ui.js?composition-host'),page=new Container();let loads=0,runs=0;
const options={container:page,selection:{tab:'learn',lesson:'group-basics'},loadComposition:async()=>{loads++;return{bindCompositionLesson:bind};},run:(action,input)=>{runs++;assert.equal(action,'teaching_labs');return Promise.resolve(clone(replies.get(JSON.stringify(input))));},cancelRun:()=>{}};
await pg.renderPointgroupView(options);assert.equal(loads,0,'Closed first-lesson entry does not import the optional interface');assert.equal(runs,0);assert.ok(page.querySelector('[data-composition-entry]'));
let entry=page.querySelector('[data-composition-entry]');entry.open=true;await entry.ontoggle();assert.equal(loads,1);assert.equal(runs,0,'Opening the interface does not load Python or calculate');
page.querySelector('#cpx-note').value='Retain on ordinary tab and lesson returns.';page.querySelector('#cpx-note').oninput();await page.querySelector('#cpx-form').onsubmit({preventDefault(){}});assert.equal(runs,1);
const before=pg.getPointgroupResult();page.querySelector('#pg-lesson-lab').onclick();assert.equal(page.querySelector('[data-composition-body]'),null);page.querySelector('#pg-return-lesson').onclick();await flush();assert.equal(runs,1);assert.equal(page.querySelector('#cpx-note').value,'Retain on ordinary tab and lesson returns.');assert.ok(page.querySelector('#cpx-export'));assert.deepEqual(pg.getPointgroupResult().experiment,before.experiment,'The optional panel preserves the old pointgroup experiment');
const oldFrame=page.querySelector('#cpx-next').onclick;page.querySelector('#pg-chapter-select').value='1';page.querySelector('#pg-chapter-select').onchange({target:page.querySelector('#pg-chapter-select')});assert.equal(page.querySelector('[data-composition-entry]'),null);oldFrame();assert.equal(runs,1);page.querySelector('#pg-chapter-select').value='0';page.querySelector('#pg-chapter-select').onchange({target:page.querySelector('#pg-chapter-select')});await flush();assert.ok(page.querySelector('#cpx-export'));assert.equal(runs,1);
entry=page.querySelector('[data-composition-entry]');entry.open=false;entry.ontoggle();assert.equal(page.querySelector('#cpx-form'),null);entry.open=true;await entry.ontoggle();assert.ok(page.querySelector('#cpx-export'));assert.equal(runs,1);
await pg.renderPointgroupView({...options,selection:{tab:'learn',lesson:'operations-notation'}});assert.equal(page.querySelector('[data-composition-entry]'),null);assert.equal(runs,1);

// Optional-interface load failure is recoverable without re-running a result.
let loadAttempts=0;await pg.renderPointgroupView({...options,loadComposition:async()=>{if(!loadAttempts++)throw Error('temporary workshop import failure');return{bindCompositionLesson:bind};}});await flush();assert.ok(page.querySelector('[data-composition-retry]'));await page.querySelector('[data-composition-retry]').onclick();assert.ok(page.querySelector('#cpx-export'));assert.equal(runs,1);
// A real outer container replacement triggers the host's observer cleanup.
const observed=[];globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observed.push(this);}observe(){}disconnect(){this.disconnected=true;}};
let finishDetached,cancelDetached=0;const detachedTask=new Promise(resolve=>{finishDetached=resolve;});detachedTask.cancel=()=>{cancelDetached++;return true;};
await pg.renderPointgroupView({...options,run:()=>detachedTask});await flush();const detachedRun=page.querySelector('#cpx-form').onsubmit({preventDefault(){}});const oldHost=page.firstElementChild;page.innerHTML='<section><p>A different tool owns the page.</p></section>';observed.at(-1).fn();assert.equal(cancelDetached,1);assert.equal(observed.at(-1).disconnected,true);finishDetached(clone(refs.cases[0].result));await detachedRun;assert.match(page.firstElementChild.textContent,/different tool/);assert.notEqual(page.firstElementChild,oldHost);delete globalThis.MutationObserver;
// First resource-load retry retains the calculation interfaces and lazy loader.
let failedFetch=false;globalThis.fetch=async url=>{if(!failedFetch){failedFetch=true;throw Error('temporary lesson fetch failure');}return{ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas};};
const retryPG=await import('../dist/pointgroup-ui.js?composition-course-retry'),retryPage=new Container();let retryRuns=0,retryLoads=0;
const retryWorkers=[];globalThis.Worker=class{constructor(){retryWorkers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}};
client.cancelPython();
const retryDispose=await retryPG.renderPointgroupView({container:retryPage,selection:{tab:'learn',lesson:'group-basics'},loadComposition:async()=>{retryLoads++;return{bindCompositionLesson:bind};},run:(action,input)=>{retryRuns++;return client.runPythonTask(action,input);},cancelRun:client.cancelPython});
assert.equal(typeof retryDispose,'function','An initial fetch failure still returns the stable outer disposer');
assert.ok(retryPage.querySelector('.pg-retry'));await retryPage.querySelector('.pg-retry').onclick();assert.equal(retryLoads,0);const retryEntry=retryPage.querySelector('[data-composition-entry]');retryEntry.open=true;await retryEntry.ontoggle();assert.equal(retryLoads,1);
const retryPending=retryPage.querySelector('#cpx-form').onsubmit({preventDefault(){}}),retryWorker=retryWorkers.at(-1);assert.equal(retryRuns,1);assert.equal(retryWorker.terminated,false);retryDispose();assert.equal(retryWorker.terminated,true,'Original error-view disposer delegates to the successful retry child and cancels its in-flight request');await retryPending;
const afterRetry=client.runPythonTask('teaching_labs',refs.cases[0].input),afterRetryWorker=retryWorkers.at(-1);retryDispose();assert.equal(afterRetryWorker.terminated,false,'Stable outer disposer is idempotent and cannot cancel a later request');afterRetryWorker.onmessage({data:{id:afterRetryWorker.message.id,result:clone(refs.cases[0].result)}});await afterRetry;

// The same proxy must be safe when an external cancellation has already let a
// different request acquire the shared client before the first outer disposal.
let failedAgain=false;globalThis.fetch=async url=>{if(!failedAgain){failedAgain=true;throw Error('temporary fetch failure again');}return{ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas};};
const isolationPG=await import('../dist/pointgroup-ui.js?composition-retry-isolation'),isolationPage=new Container();
const isolationDispose=await isolationPG.renderPointgroupView({container:isolationPage,selection:{tab:'learn',lesson:'group-basics'},loadComposition:async()=>({bindCompositionLesson:bind}),run:client.runPythonTask,cancelRun:client.cancelPython});
await isolationPage.querySelector('.pg-retry').onclick();const isolationEntry=isolationPage.querySelector('[data-composition-entry]');isolationEntry.open=true;await isolationEntry.ontoggle();const isolationPending=isolationPage.querySelector('#cpx-form').onsubmit({preventDefault(){}});
client.cancelPython();const newerRequest=client.runPythonTask('teaching_labs',refs.cases[0].input),newerWorker=retryWorkers.at(-1);isolationDispose();assert.equal(newerWorker.terminated,false,'A retry proxy cannot cancel a newer task after its own request was cancelled elsewhere');newerWorker.onmessage({data:{id:newerWorker.message.id,result:clone(refs.cases[0].result)}});await newerRequest;await isolationPending;

// Reaching a stale loading path also returns a callable disposer.
const fetchWaiters=[];globalThis.fetch=url=>new Promise(resolve=>fetchWaiters.push(()=>resolve({ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas})));
const stalePG=await import('../dist/pointgroup-ui.js?composition-stale-load'),stalePage=new Container(),staleLoading=stalePG.renderPointgroupView({container:stalePage,selection:{tab:'learn',lesson:'group-basics'}});
assert.equal(fetchWaiters.length,2);stalePage.innerHTML='<section>A later route owns this container.</section>';for(const done of fetchWaiters)done();const staleDispose=await staleLoading;assert.equal(typeof staleDispose,'function');staleDispose();assert.match(stalePage.firstElementChild.textContent,/later route/);

// Disposal while the retry itself is still loading must immediately dispose
// its eventual child, rather than installing that child into a dead proxy.
let initialFailure=false,deferRetry=false;const delayedRetryFetches=[],retryObservers=[];
globalThis.fetch=url=>{if(!initialFailure){initialFailure=true;return Promise.reject(Error('initial delayed retry failure'));}const response={ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas};return deferRetry?new Promise(resolve=>delayedRetryFetches.push(()=>resolve(response))):Promise.resolve(response);};
globalThis.MutationObserver=class{constructor(){retryObservers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
const pendingRetryPG=await import('../dist/pointgroup-ui.js?composition-pending-retry'),pendingRetryPage=new Container(),pendingRetryDispose=await pendingRetryPG.renderPointgroupView({container:pendingRetryPage,selection:{tab:'learn',lesson:'group-basics'}});
deferRetry=true;const pendingRetryRender=pendingRetryPage.querySelector('.pg-retry').onclick();assert.equal(delayedRetryFetches.length,2);pendingRetryDispose();pendingRetryPage.innerHTML='<section>A replacement route remains visible.</section>';for(const done of delayedRetryFetches)done();await pendingRetryRender;assert.equal(retryObservers.length,2);assert.ok(retryObservers.every(observer=>observer.disconnected),'The stable proxy disposes a child that resolves after the proxy was disposed');assert.match(pendingRetryPage.firstElementChild.textContent,/replacement route/);delete globalThis.MutationObserver;

// An old retry proxy and its child cannot stop playback in a newer pointgroup
// render sharing the same module state. Only that newer render owns its timer.
let playbackFetchFailed=false;globalThis.fetch=async url=>{if(!playbackFetchFailed){playbackFetchFailed=true;throw Error('temporary playback lesson failure');}return{ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas};};
const playbackPG=await import('../dist/pointgroup-ui.js?composition-retry-playback'),playbackPage=new Container();
const playbackProxy=await playbackPG.renderPointgroupView({container:playbackPage,selection:{tab:'learn',lesson:'group-basics'},loadComposition:async()=>({bindCompositionLesson:bind}),run:client.runPythonTask,cancelRun:client.cancelPython});await playbackPage.querySelector('.pg-retry').onclick();
const currentPlaybackPage=new Container(),currentPlaybackDispose=await playbackPG.renderPointgroupView({container:currentPlaybackPage,selection:{tab:'lab',lesson:'group-basics'}});
const originalTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout,playbackTimers=[],clearedPlayback=[];
globalThis.setTimeout=(fn,delay)=>{const token={fn,delay};playbackTimers.push(token);return token;};globalThis.clearTimeout=token=>clearedPlayback.push(token);
try{currentPlaybackPage.querySelector('#pg-play').onclick();assert.equal(playbackTimers.length,1);playbackProxy();assert.equal(clearedPlayback.includes(playbackTimers[0]),false,'An obsolete error/retry disposer cannot stop newer pointgroup playback');currentPlaybackDispose();assert.equal(clearedPlayback.includes(playbackTimers[0]),true);}finally{globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClearTimeout;globalThis.Worker=previousWorker;}
assert.equal(masteryWrites,0,'Optional predictions, diagrams and notes never write mastery or student records');
const source=fs.readFileSync(new URL('../dist/composition-ui.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage/);
const locale=json('../locales/en-composition-ui.json'),hostLocale=json('../locales/en-composition-host.json'),translations={...loadEnglishCatalog(),...locale,...hostLocale},units=new Set();for(const s of jsStrings(source))for(const u of textUnits(s.value))if(HAN.test(u))units.add(u.trim());for(const u of units)assert.ok(translations[u],'Missing composition UI translation: '+u);for(const [s,t]of Object.entries(locale)){assert.ok(units.has(s),s);assert.ok(t.trim()&&!HAN.test(t));}
console.log('Composition workshop:8 genuine Python replies at all stages/frames, complete point/basis paths, fixed-probe and closure distinctions, pixel-sized diagrams, manual requests, presets, invalid drafts, immutable export, native NodeLists, malformed/mismatched recovery, scoped cancellation, stale owners, real first-lesson lazy host, stable failed-fetch/retry disposal, newer-request/playback isolation and ordinary tab/lesson preservation passed.');
