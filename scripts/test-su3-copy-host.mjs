import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import * as copyUI from '../dist/su3-copy-ui.js';
import * as basisUI from '../dist/su3-basis-ui.js';

// Use the same small DOM as the existing classroom integration tests. Queries
// outside parsing behave like native NodeLists, so host code cannot rely on
// Array-only methods that happen to work in a test adapter.
const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const originalQuery=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const nodes=originalQuery.call(this,selector);if(parsing)return nodes;return Object.assign({length:nodes.length,forEach:fn=>nodes.forEach(fn),[Symbol.iterator]:function*(){yield* nodes;}},Object.fromEntries(nodes.map((n,i)=>[i,n])));};
Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(where,text){this.innerHTML=where==='afterbegin'?text+this.innerHTML:this.innerHTML+text;};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let gradeWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>gradeWrites++};
const observed=[];globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observed.push(this);}observe(target){this.target=target;}disconnect(){this.disconnected=true;}};
const clone=x=>structuredClone(x),json=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const lessons=json('../dist/data/lie-group-lessons.json'),derivations=json('../dist/data/lie-derivations.json');
const copies=json('./fixtures/su3-copy.json'),bases=json('./fixtures/su3-basis.json');
assert.equal(copies.schema,'symmetry-lab-su3-copy-fixture-1');assert.equal(copies.cases.length,12);
const replies=new Map(copies.cases.map(c=>[JSON.stringify(c.input),c.result]));
const basic=copies.cases.find(c=>c.input.angle===45&&c.input.phase==='1');
const complex=copies.cases.find(c=>c.input.angle===45&&c.input.phase==='i');
const fundamental=bases.cases.find(c=>c.input.p===1&&c.input.q===0);
const legacy=json('./fixtures/su3-cg-extended-ui.json').exactTen;
const fetchCourse=async url=>({ok:true,json:async()=>clone(String(url).includes('derivations')?derivations:lessons)});
globalThis.fetch=fetchCourse;
const prevent={preventDefault(){}};
const submit=(page,prefix='s3c')=>page.querySelector('#'+prefix+'-form').onsubmit(prevent);
const change=(page,id,value)=>{const node=page.querySelector('#'+id);assert.ok(node,id);node.value=String(value);return node.onchange?.({target:node});};
const note=(page,id,value)=>{const node=page.querySelector('#'+id);assert.ok(node,id);node.value=value;node.oninput();};
const open=async(page,kind='copy')=>{const entry=page.querySelector('[data-su3-'+kind+'-entry]');assert.ok(entry,kind+' entry');entry.open=true;await entry.ontoggle();return entry;};
const close=(page,kind='copy')=>{const entry=page.querySelector('[data-su3-'+kind+'-entry]');assert.ok(entry);entry.open=false;return entry.ontoggle();};
let scenario=0;
const freshHost=label=>import('../dist/lie-group-ui.js?su3-copy-host-'+label+'-'+(++scenario));

// Real host and both real binders: neither disclosure triggers a calculation,
// their in-memory states are independent, and the old CG result/input/export
// remain owned by the original experiment rather than either optional lab.
{
 const host=await freshHost('legacy-and-gt'),page=new Container(),calls=[],downloads=[];let copyLoads=0,basisLoads=0;
 const run=async(action,input)=>{calls.push({action,input:clone(input)});assert.equal(action,'teaching_labs');if(input.lab==='su3_copy'){const r=replies.get(JSON.stringify(input));assert.ok(r);return clone(r);}if(input.lab==='su3_basis')return clone(fundamental.result);assert.equal(input.lab,'lie');assert.equal(input.experiment,'su3_cg');return clone(legacy);};
 const options={container:page,selection:{tab:'lab',lesson:'su3-cg-change-basis',experiment:'su3_cg',preset:'cg-exact-ten-three'},run,cancelRun:()=>{throw Error('No request is pending');},download:(body,name)=>downloads.push({body:JSON.parse(body),name}),loadSu3Basis:async()=>{basisLoads++;return basisUI;},loadSu3Copy:async()=>{copyLoads++;return copyUI;}};
 const dispose=await host.renderLieGroupView(options);
 assert.equal(copyLoads,0);assert.equal(basisLoads,0);assert.equal(calls.length,0);
 await page.querySelector('#lg-lab-form').onsubmit(prevent);
 assert.equal(calls.length,1);const oldRequest=clone(calls[0]),oldResult=clone(host.getLieGroupResult());
 page.querySelector('#lg-export').onclick();assert.equal(downloads[0].body.experiment.result.exactCGMatrix.length,30);
 await page.querySelector('#lg-tab-learn').onclick();
 assert.equal(copyLoads,0);assert.equal(basisLoads,0);assert.equal(calls.length,1);
 assert.ok(page.querySelector('[data-su3-copy-entry]'));assert.ok(page.querySelector('[data-su3-basis-entry]'));
 await open(page);assert.equal(copyLoads,1);assert.equal(calls.length,1);assert.ok(page.querySelector('#s3c-form'));assert.equal(page.querySelector('#s3b-form'),null);
 await open(page,'basis');assert.equal(basisLoads,1);assert.equal(calls.length,1);
 note(page,'s3c-note','Copy lesson A');note(page,'s3b-note','Independent GT note');
 change(page,'s3c-phase','i');await submit(page);assert.deepEqual(calls[1],{action:'teaching_labs',input:complex.input});
 for(let i=0;i<4;i++)page.querySelector('#s3c-next').onclick();change(page,'s3c-mu',4);
 const staleCopyExport=page.querySelector('#s3c-export').onclick;
 await submit(page,'s3b');assert.deepEqual(calls[2],{action:'teaching_labs',input:fundamental.input});
 page.querySelector('#s3c-export').onclick();assert.deepEqual(downloads[1].body,{kind:'su3-copy-teaching',input:complex.input,result:complex.result});
 assert.deepEqual(host.getLieGroupResult(),oldResult);assert.deepEqual(calls[0],oldRequest);
 close(page,'basis');assert.ok(page.querySelector('#s3c-export'));assert.equal(page.querySelector('#s3b-form'),null);
 await open(page,'basis');assert.equal(page.querySelector('#s3b-note').value,'Independent GT note');assert.ok(page.querySelector('#s3b-export'));
 close(page);assert.equal(page.querySelector('#s3c-form'),null);assert.ok(page.querySelector('#s3b-export'));
 staleCopyExport();assert.equal(downloads.length,2,'A detached optional export cannot run');
 await open(page);assert.equal(page.querySelector('#s3c-note').value,'Copy lesson A');assert.equal(page.querySelector('#s3c-phase').value,'i');assert.equal(page.querySelector('#s3c-mu').value,'4');assert.equal(page.querySelector('#s3c-stage-status').textContent,'副本换基步骤 5 / 5 步');
 const staleNote=page.querySelector('#s3c-note').oninput;
 const chapter=page.querySelector('#lg-chapter-select');chapter.value=String(lessons.lessons.findIndex(l=>l.id==='su3-cg-multiplicity'));chapter.onchange({target:chapter});await flush();
 assert.equal(page.querySelector('[data-su3-basis-entry]'),null);assert.ok(page.querySelector('[data-su3-copy-entry]'));assert.equal(page.querySelector('#s3c-form'),null);
 await open(page);assert.equal(page.querySelector('#s3c-note').value,'');assert.equal(page.querySelector('#s3c-phase').value,'1');note(page,'s3c-note','Copy lesson B');staleNote();assert.equal(page.querySelector('#s3c-note').value,'Copy lesson B');
 const back=page.querySelector('#lg-chapter-select');back.value=String(lessons.lessons.findIndex(l=>l.id==='su3-cg-change-basis'));back.onchange({target:back});await flush();
 assert.equal(page.querySelector('#s3c-note').value,'Copy lesson A');assert.equal(page.querySelector('#s3b-note').value,'Independent GT note');
 await page.querySelector('#lg-tab-lab').onclick();page.querySelector('#lg-export').onclick();assert.deepEqual(downloads.at(-1),downloads[0]);assert.deepEqual(host.getLieGroupResult(),oldResult);
 assert.equal(calls.length,3,'Restoring disclosures, lessons, and the old experiment never recalculates');dispose();
}

// A controlled Worker supplies genuine precomputed Python replies. The actual
// shared Python client and request.cancel are used for all ownership tests.
const previousWorker=globalThis.Worker,workers=[];
globalThis.Worker=class{constructor(){this.messages=[];this.terminated=false;workers.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}reply(result,id=this.messages.at(-1)?.id){this.onmessage({data:{id,result}});}};
const client=await import('../dist/python-client.js');
async function ownedView(label,{lesson='su3-cg-change-basis',loadSu3Copy=async()=>copyUI}={}){
 client.cancelPython();globalThis.fetch=fetchCourse;const host=await freshHost(label),page=new Container();let fallback=0;
 const dispose=await host.renderLieGroupView({container:page,selection:{tab:'learn',lesson},run:client.runPythonTask,cancelRun:()=>{fallback++;client.cancelPython();},download:()=>{},loadSu3Copy,loadSu3Basis:async()=>basisUI});
 return{host,page,dispose,fallback:()=>fallback};
}
for(const action of ['collapse','tab','lesson','dispose']){
 const v=await ownedView('cancel-'+action);await open(v.page);const pending=submit(v.page);await flush();const worker=workers.at(-1);assert.equal(worker.terminated,false);assert.equal(worker.messages.at(-1).payload.lab,'su3_copy');
 if(action==='collapse')close(v.page);
 else if(action==='tab')await v.page.querySelector('#lg-tab-quiz').onclick();
 else if(action==='lesson'){const chapter=v.page.querySelector('#lg-chapter-select');chapter.value=String(lessons.lessons.findIndex(l=>l.id==='su3-cg-multiplicity'));chapter.onchange({target:chapter});}
 else v.dispose();
 await pending;assert.equal(worker.terminated,true,action+' cancels the exact copy request');assert.equal(v.fallback(),0,'The actual client uses scoped cancel rather than global fallback');
 worker.reply(clone(basic.result));await flush();assert.equal(v.page.querySelector('#s3c-export'),null,'Late copy result is not installed after '+action);v.dispose();
}
{
 const v=await ownedView('independent-pending');await open(v.page);await open(v.page,'basis');
 const copyPending=submit(v.page);const copyWorker=workers.at(-1);close(v.page,'basis');assert.equal(copyWorker.terminated,false,'Closing the idle GT workshop does not cancel copy');copyWorker.reply(clone(basic.result));await copyPending;assert.ok(v.page.querySelector('#s3c-export'));
 await open(v.page,'basis');const gtPending=submit(v.page,'s3b');const gtWorker=workers.at(-1);close(v.page);assert.equal(gtWorker.terminated,false,'Closing idle copy does not cancel the GT request');gtWorker.reply(clone(fundamental.result));await gtPending;assert.ok(v.page.querySelector('#s3b-export'));assert.equal(v.page.querySelector('#s3c-form'),null);v.dispose();
}
{
 const v=await ownedView('stale-disposer');await open(v.page);const oldPending=submit(v.page);const oldWorker=workers.at(-1);client.cancelPython();await oldPending;
 const expert=client.runPythonTask('analyze',{}),fresh=workers.at(-1);assert.notEqual(fresh,oldWorker);v.dispose();assert.equal(fresh.terminated,false,'A stale host disposer cannot cancel a newer owner');oldWorker.reply(clone(basic.result));assert.equal(fresh.terminated,false);fresh.reply({newOwner:true});assert.deepEqual(await expert,{newOwner:true});
}

// Optional import failure/retry, a late import after navigation, and an older
// open operation resolving after close/reopen must all stay behind host tickets.
{
 let attempts=0;const v=await ownedView('optional-retry',{loadSu3Copy:async()=>{if(!attempts++)throw Error('Temporary optional import failure');return copyUI;}});
 await open(v.page);assert.ok(v.page.querySelector('[data-su3-copy-retry]'));assert.equal(workers.at(-1)?.terminated??true,true);
 await v.page.querySelector('[data-su3-copy-retry]').onclick();assert.equal(attempts,2);assert.ok(v.page.querySelector('#s3c-form'));assert.equal(v.page.querySelector('#s3c-export'),null);v.dispose();
}
{
 let release,bindings=0;const v=await ownedView('late-optional',{loadSu3Copy:()=>new Promise(resolve=>{release=resolve;})});
 const opening=open(v.page),body=v.page.querySelector('[data-su3-copy-body]');assert.equal(typeof release,'function');await v.page.querySelector('#lg-tab-quiz').onclick();release({bindSu3CopyLesson:()=>{bindings++;return()=>{};}});await opening;
 assert.equal(bindings,0);assert.equal(v.page.querySelector('[data-su3-copy-body]'),null);assert.match(body.innerHTML,/正在载入/);v.dispose();
}
{
 const releases=[];let staleBindings=0;const v=await ownedView('import-reopen',{loadSu3Copy:()=>new Promise(resolve=>releases.push(resolve))});const first=open(v.page);close(v.page);const second=open(v.page);assert.equal(releases.length,2);
 releases[0]({bindSu3CopyLesson:()=>{staleBindings++;return()=>{};}});await first;assert.equal(staleBindings,0);assert.equal(v.page.querySelector('#s3c-form'),null);releases[1](copyUI);await second;assert.ok(v.page.querySelector('#s3c-form'));v.dispose();
}

// Extract actual application lifecycle declarations, as the established GT
// test does, so the nested classroom's stable cleanup—not an invented shell—
// releases optional work when the whole application route is replaced.
const appSource=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ast=parse(appSource,{sourceType:'module',ecmaVersion:'latest'});
const declarations=['runPythonTask','clearRenderedView','retainRenderedViewCleanup','render'].map(name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,name);return appSource.slice(node.start,node.end);}).join('\n');
const {renderClassroomView}=await import('../dist/classroom-ui.js');
async function outerScenario({label,fail=false,replacementBeforeCleanup=false}){
 client.cancelPython();let failed=false,copyLoads=0;
 globalThis.fetch=async url=>{if(fail&&!failed){failed=true;throw Error('Temporary initial course failure');}return fetchCourse(url);};
 const host=await freshHost(label),app=new Container();app.dataset={};const shellState={view:'lie',route:'classroom/coupling',courseRoute:'#classroom/coupling?tab=learn&track=cg&lesson=su3-cg-change-basis'},noop=()=>{};
 document.querySelector=selector=>selector==='#page-title'?{textContent:'Lie classroom'}:app.querySelector(selector);
 const context={state:shellState,renderTicket:0,dictionaryController:null,renderedViewCleanup:null,Promise,Object,Error,structuredClone,executePythonTask:client.runPythonTask,cancelPython:client.cancelPython,document,mathSourceText:()=>'',captureCalculation:noop,structureHandoffForCalculation:()=>null,$:s=>s==='#app'?app:app.querySelector(s),optionalViews:{peek:()=>true,get:async()=>null},groupLoader:{peek:()=>true},databases:{},isClassroomView:view=>view==='lie',syncCourseRoute:noop,updateBreadcrumb:noop,setView:noop,toast:noop,download:noop,openWorkbench:noop,openProjectLab:noop,canOpenProjectInput:()=>false,projectNavigation:{consumeInput:noop},esc:x=>String(x),renderNavigationHub:async({container})=>{container.innerHTML='<section>A different tool owns the application.</section>';},renderClassroomView:opts=>renderClassroomView({...opts,loadProgression:async()=>({renderLessonProgression:()=>''}),courseRenderers:{lie:opts=>host.renderLieGroupView({...opts,loadSu3Copy:async()=>{copyLoads++;return copyUI;},loadSu3Basis:async()=>basisUI})}})};
 vm.createContext(context);vm.runInContext(declarations,context);await context.render();await flush();
 const stable=context.renderedViewCleanup;assert.equal(typeof stable,'function');assert.equal(copyLoads,0);
 if(fail){assert.ok(app.querySelector('#lg-retry'));await app.querySelector('#lg-retry').onclick();assert.equal(context.renderedViewCleanup,stable,'The original stable disposer delegates the successfully retried child');assert.equal(copyLoads,0);}
 const course=app.querySelector('#classroom-course');assert.ok(course);assert.notEqual(course,app);
 await open(app);assert.equal(copyLoads,1,'The injected loader is preserved across initial-load retry');const pending=submit(app);await flush();const ownedWorker=workers.at(-1);assert.equal(ownedWorker.terminated,false);assert.ok(observed.some(o=>o.target===course));
 let newer,newerWorker;if(replacementBeforeCleanup){client.cancelPython();newer=client.runPythonTask('analyze',{});newerWorker=workers.at(-1);}
 shellState.view='home';shellState.courseRoute=null;await context.render();await pending;assert.equal(ownedWorker.terminated,true);assert.equal(course.isConnected,false);assert.match(app.firstElementChild.textContent,/different tool/);
 if(newer){assert.equal(newerWorker.terminated,false,'A delayed retried disposer cannot cancel a new Python owner');ownedWorker.reply(clone(basic.result));newerWorker.reply({afterRetry:true});assert.deepEqual(await newer,{afterRetry:true});}
 const expert=client.runPythonTask('analyze',{}),fresh=workers.at(-1),newDisposer=()=>{};context.retainRenderedViewCleanup(newDisposer,context.renderTicket);context.retainRenderedViewCleanup(stable,context.renderTicket-1);assert.equal(context.renderedViewCleanup,newDisposer);assert.equal(fresh.terminated,false);fresh.reply({after:true});await expert;context.clearRenderedView();client.cancelPython();
}
await outerScenario({label:'outer-shell'});
await outerScenario({label:'outer-initial-retry',fail:true});
await outerScenario({label:'outer-retry-new-owner',fail:true,replacementBeforeCleanup:true});

// Even initial fetch/retry can finish after its parent has already left.
{
 let release;globalThis.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>clone(lessons)});});const host=await freshHost('late-initial'),page=new Container();let imports=0;
 const pending=host.renderLieGroupView({container:page,selection:{tab:'learn',lesson:'su3-cg-change-basis'},loadSu3Copy:async()=>{imports++;return copyUI;}});page.innerHTML='<section>A later route remains visible.</section>';release();const dispose=await pending;assert.equal(typeof dispose,'function');dispose();assert.equal(imports,0);assert.match(page.firstElementChild.textContent,/later route/);
}
{
 let failed=false,release;globalThis.fetch=()=>{if(!failed){failed=true;return Promise.reject(Error('Initial failed fetch'));}return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>clone(lessons)});});};
 const host=await freshHost('late-retry'),page=new Container();let imports=0;const dispose=await host.renderLieGroupView({container:page,selection:{tab:'learn',lesson:'su3-cg-change-basis'},loadSu3Copy:async()=>{imports++;return copyUI;}}),start=observed.length-1;
 const pending=page.querySelector('#lg-retry').onclick();dispose();page.innerHTML='<section>Replacement route remains.</section>';release();await pending;assert.equal(imports,0);assert.ok(observed.slice(start).every(o=>o.disconnected));assert.match(page.firstElementChild.textContent,/Replacement route/);
}
client.cancelPython();globalThis.Worker=previousWorker;delete globalThis.MutationObserver;
assert.equal(gradeWrites,0,'Optional workshops never write course grades or mastery');
console.log('SU3 copy actual host passed: optional lazy load/manual Run, independent GT/copy/lesson state and cleanup, unchanged legacy CG input/result/export, scoped cancel on collapse/tab/lesson/outer route, stale loaders/replies/disposers, stable initial-failure retry delegation, and native NodeLists.');
