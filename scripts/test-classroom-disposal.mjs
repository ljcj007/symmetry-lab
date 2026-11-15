import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {Container,Element,flush} from './test-material-research-ui.mjs';

Element.prototype.focus=function(){};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(where,text){this.innerHTML=where==='afterbegin'?text+this.innerHTML:this.innerHTML+text;};
const observed=[];
globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observed.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const json=name=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+name,import.meta.url),'utf8'));
const lessons=json('pointgroup-lessons.json'),atlas=json('pointgroup-atlas.json');
globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas});
const transports=[];
globalThis.Worker=class{constructor(){this.messages=[];this.terminated=false;transports.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}reply(data){this.onmessage({data});}};
const {runPythonTask:executePythonTask,cancelPython}=await import('../dist/python-client.js');
const {renderPointgroupView}=await import('../dist/pointgroup-ui.js?actual-shell-disposal');
const composition=await import('../dist/composition-ui.js');
const {renderClassroomView}=await import('../dist/classroom-ui.js');
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ast=parse(source,{sourceType:'module',ecmaVersion:'latest'});
const names=['runPythonTask','clearRenderedView','retainRenderedViewCleanup','render'];
const declarations=names.map(name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);}).join('\n');
const app=new Container();app.dataset={};
document.querySelector=selector=>selector==='#page-title'?{textContent:'Foundations'}:app.querySelector(selector);
const state={view:'pointgroups',route:'classroom/foundations',courseRoute:'#classroom/foundations?tab=learn&lesson=group-basics'};
const noop=()=>{};
const context={state,renderTicket:0,dictionaryController:null,renderedViewCleanup:null,
 Promise,Object,Error,structuredClone,executePythonTask,cancelPython,document,
 mathSourceText:()=>'',captureCalculation:noop,structureHandoffForCalculation:()=>null,
 $:selector=>selector==='#app'?app:app.querySelector(selector),
 optionalViews:{peek:()=>true,get:async()=>null},groupLoader:{peek:()=>true},databases:{},
 isClassroomView:view=>view==='pointgroups',syncCourseRoute:noop,updateBreadcrumb:noop,
 setView:noop,toast:noop,download:noop,openWorkbench:noop,openProjectLab:noop,canOpenProjectInput:()=>false,
 projectNavigation:{consumeInput:noop},esc:x=>String(x),
 renderNavigationHub:async({container})=>{container.innerHTML='<section><h2>A different tool owns the application</h2></section>';},
 renderClassroomView:options=>renderClassroomView({...options,
  loadProgression:async()=>({renderLessonProgression:()=>''}),
  courseRenderers:{pointgroups:opts=>renderPointgroupView({...opts,loadComposition:async()=>composition})}})};
vm.createContext(context);vm.runInContext(declarations,context);
await context.render();await flush();
const course=app.querySelector('#classroom-course');assert.ok(course,app.innerHTML);
assert.notEqual(course,app,'The renderer container is genuinely nested inside the classroom shell');
assert.equal(typeof context.renderedViewCleanup,'function','The actual app retains the classroom disposer');
const firstCleanup=context.renderedViewCleanup;
const entry=app.querySelector('[data-composition-entry]');assert.ok(entry);
entry.open=true;await entry.ontoggle();
const submit=app.querySelector('#cpx-form').onsubmit({preventDefault(){}});await flush();
const old=transports.at(-1);assert.ok(old,app.querySelector('[data-composition-body]').innerHTML);assert.equal(old.terminated,false);
assert.ok(observed.some(observer=>observer.target===course),'The old observer watches the nested course, not the whole application');
state.view='home';state.courseRoute=null;await context.render();await submit;
assert.equal(old.terminated,true,'Replacing the whole classroom shell cancels its exact active request without requiring a nested child mutation');
assert.equal(course.isConnected,false);assert.match(app.firstElementChild.textContent,/different tool/);
const expert=executePythonTask('analyze',{}),fresh=transports.at(-1);
const newerDisposer=()=>{};context.retainRenderedViewCleanup(newerDisposer,context.renderTicket);
let staleCalled=0;context.retainRenderedViewCleanup(()=>{staleCalled++;firstCleanup();},context.renderTicket-1);
assert.equal(staleCalled,1);assert.equal(context.renderedViewCleanup,newerDisposer,'A late awaited classroom disposer does not replace a newer owner');
assert.equal(fresh.terminated,false);
fresh.reply({id:fresh.messages.at(-1).id,result:{expert:true}});assert.deepEqual(await expert,{expert:true});
context.clearRenderedView();assert.equal(context.renderedViewCleanup,null);cancelPython();

// An initial resource failure returns through the application before retry is
// clicked. The browser ignores the retry handler's returned Promise/disposer,
// so the original application-owned cleanup must delegate to the retried view.
const retryPG=await import('../dist/pointgroup-ui.js?actual-shell-retry-disposal');
let firstFetch=true;
globalThis.fetch=async url=>{if(firstFetch){firstFetch=false;throw Error('temporary initial course failure');}return{ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas};};
context.renderClassroomView=options=>renderClassroomView({...options,
 loadProgression:async()=>({renderLessonProgression:()=>''}),
 courseRenderers:{pointgroups:opts=>retryPG.renderPointgroupView({...opts,loadComposition:async()=>composition})}});
state.view='pointgroups';state.courseRoute='#classroom/foundations?tab=learn&lesson=group-basics';
await context.render();await flush();assert.ok(app.querySelector('.pg-retry'));
assert.equal(typeof context.renderedViewCleanup,'function','Even a failed initial course load must return an application-owned cleanup');
const retryParentCleanup=context.renderedViewCleanup;
await app.querySelector('.pg-retry').onclick();await flush();
assert.equal(context.renderedViewCleanup,retryParentCleanup,'Retry is handled through the original stable lifecycle');
const retriedEntry=app.querySelector('[data-composition-entry]');assert.ok(retriedEntry);
retriedEntry.open=true;await retriedEntry.ontoggle();
const retrySubmit=app.querySelector('#cpx-form').onsubmit({preventDefault(){}});await flush();
const retryWorker=transports.at(-1);assert.equal(retryWorker.terminated,false);
state.view='home';state.courseRoute=null;await context.render();await retrySubmit;
assert.equal(retryWorker.terminated,true,'Outer navigation after a successful resource retry cancels the retried owner');
const retryExpert=executePythonTask('analyze',{}),retryFresh=transports.at(-1);
retryFresh.reply({id:retryFresh.messages.at(-1).id,result:{afterRetry:true}});
assert.deepEqual(await retryExpert,{afterRetry:true});cancelPython();
console.log('Actual app + nested classroom shell + pointgroup renderer + composition binder: normal and initially failed/retried outer routes release their exact Python owner; late awaited cleanup cannot replace or cancel a newer owner.');
