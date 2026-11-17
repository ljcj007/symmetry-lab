import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {PROJECT_INPUT_TARGETS} from '../dist/project-input.js';
import {toolsIndex,knownTool} from '../dist/navigation-ui.js';
import {createProjectNavigator} from '../dist/project-navigation.js';
import {parseClassroomRoute,withClassroomNavigationContext,isClassroomView} from '../dist/classroom-ui.js';
import {jsStrings,textUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'),json=name=>JSON.parse(read(name)),clone=structuredClone,serialized=x=>JSON.parse(JSON.stringify(x));
const pathwaySource=read('dist/pathways-ui.js'),app=read('dist/app.js');
const importFrom=(source,name)=>{const spec=source.match(new RegExp("(?:from |import\\()'(\\./"+name.replaceAll('.','\\.')+"[^']*)'"))?.[1];assert.ok(spec,name);return import(new URL('../dist/'+spec.slice(2),import.meta.url));};
const host=await importFrom(pathwaySource,'phonopy-derivation-host.js'),handoff=await importFrom(read('dist/phonopy-derivation-host.js'),'phonopy-scattering-handoff.js');
const reference=json('scripts/fixtures/phonopy-scattering.json').cases[0],payload={action:'phonopy_scattering',input:clone(reference.input),referenceId:'host-test-teaching-reference',fingerprint:'a'.repeat(64),point:'A',sourceKind:'teaching-reference'};
const catalog=json('dist/data/pathways-materials.json'),source=json('dist/data/scattering-content.json');
const translations={...loadEnglishCatalog(),...json('locales/en-phonopy-derivation-host.json')};
for(const file of ['dist/phonopy-derivation-host.js','dist/phonopy-scattering-handoff.js'])for(const literal of jsStrings(read(file)))for(const unit of textUnits(literal.value)){assert.equal(typeof translations[unit],'string','English host text: '+unit);assert.equal(HAN.test(translations[unit]),false);}
if(fs.existsSync(new URL('../dist/en/phonopy-derivation-host.js',import.meta.url)))for(const literal of jsStrings(read('dist/en/phonopy-derivation-host.js')))assert.equal(HAN.test(literal.value),false,'The actual generated English host contains no untranslated teaching text');
const prevent={preventDefault(){}},route='compute/phonopy-scattering';
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'classList',{configurable:true,get(){return {toggle(){},add(){},remove(){}};}});
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
const progress=new Map();let progressWrites=0;
globalThis.localStorage={getItem:key=>progress.get(key)||null,setItem:(key,value)=>{progressWrites++;progress.set(key,value);}};
globalThis.fetch=async url=>{const raw=fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url));return{ok:true,json:async()=>JSON.parse(raw),text:async()=>raw.toString(),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};};
const observers=[];globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
const settle=async()=>{for(let i=0;i<4;i++)await flush();};
const toggle=async(page,open=true)=>{const detail=page.querySelector('[data-pdh-disclosure]');assert.ok(detail);detail.open=open;await detail.ontoggle?.();await settle();};
const calls=[],mounted=[],closed=[],moves=[];
function fakeModule(){return{bindPhonopyDerivationLesson(options){const {root,stateStore,stateKey}=options;mounted.push(options);root.innerHTML='<label>Draft<input id="fake-draft"></label><button id="fake-copy">Copy</button>';
 const node=root.querySelector('#fake-draft');node.value=stateStore.get(stateKey)?.note||'';node.oninput=()=>stateStore.set(stateKey,{note:node.value});root.querySelector('#fake-copy').onclick=()=>options.onCopyTeaching(clone(payload));
 const cleanup=()=>closed.push(options);cleanup.snapshot=()=>clone(stateStore.get(stateKey)||{});return cleanup;}};}
function mount({store=new Map(),loadModule=async()=>{calls.push('import');return fakeModule();},lesson='scattering-phase'}={}){const container=new Container();container.innerHTML=host.phonopyDerivationLessonHTML(lesson);const cleanup=host.bindPhonopyDerivationHost({root:container.firstElementChild,lessonId:lesson,stateStore:store,run:()=>{throw Error('Opening must never run Python');},loadModule,onNavigateTeaching:target=>moves.push(target)});return{container,cleanup,store};}

assert.equal(host.phonopyDerivationLessonHTML('scattering-chain'),'');
assert.equal(host.phonopyDerivationLessonHTML('scattering-temperature'),'');
assert.equal(parseClassroomRoute(host.PHONOPY_DERIVATION_ROUTE).lesson,'scattering-phase');
assert.equal(parseClassroomRoute(host.PHONOPY_DERIVATION_ROUTE).module,'scattering');
{
 const v=mount();assert.equal(v.container.querySelector('[data-pdh-disclosure]').open,false);assert.equal(calls.length,0);
 await toggle(v.container);assert.equal(calls.length,1);assert.equal(mounted.length,1);assert.equal(progressWrites,0);
 const input=v.container.querySelector('#fake-draft');input.value='Unfinished Cartesian calculation';input.oninput();
 await toggle(v.container,false);assert.equal(closed.length,1);await toggle(v.container);assert.equal(calls.length,1);assert.equal(v.container.querySelector('#fake-draft').value,'Unfinished Cartesian calculation');
 const staleCopy=v.container.querySelector('#fake-copy').onclick;staleCopy();assert.deepEqual(moves,[ '#compute/phonopy-scattering' ]);const copy=handoff.phonopyScatteringVisit(route);assert.deepEqual(copy,payload);copy.input.G[0]=99;assert.equal(payload.input.G[0],1);
 v.cleanup();staleCopy();assert.equal(moves.length,1);assert.equal(handoff.phonopyScatteringVisit(route),null);v.cleanup();
 const returned=mount({store:v.store});await settle();assert.equal(returned.container.querySelector('[data-pdh-disclosure]').open,true);assert.equal(returned.container.querySelector('#fake-draft').value,'Unfinished Cartesian calculation');returned.cleanup();
}
// Actual retry handles even a synchronously throwing importer, and stale retry
// controls cannot revive an unmounted classroom or replace a newer view.
{
 let attempts=0;const v=mount({loadModule:()=>{attempts++;if(attempts===1)throw Error('temporary module failure');return fakeModule();}});await toggle(v.container);const retry=v.container.querySelector('[data-pdh-retry]');assert.ok(retry);await retry.onclick();await settle();assert.equal(attempts,2);assert.ok(v.container.querySelector('#fake-draft'));v.cleanup();retry.onclick();assert.equal(attempts,2);
}
{
 let resolve;const count=mounted.length,v=mount({loadModule:()=>new Promise(done=>resolve=done)});await toggle(v.container);await toggle(v.container,false);resolve(fakeModule());await settle();assert.equal(mounted.length,count);await toggle(v.container);assert.equal(mounted.length,count+1);v.cleanup();
}
{
 let resolve;const count=mounted.length,v=mount({loadModule:()=>new Promise(done=>resolve=done)});await toggle(v.container);v.cleanup();v.container.innerHTML='<section>Another tool owns this container</section>';resolve(fakeModule());await settle();assert.equal(mounted.length,count);assert.match(v.container.innerHTML,/Another tool/);
}
{
 const v=mount();await toggle(v.container);const count=closed.length;v.container.innerHTML='<section>Detached classroom parent</section>';for(const observer of observers)if(!observer.disconnected)observer.fn();assert.equal(closed.length,count+1);v.cleanup();
}

// Complete teaching copies and incomplete importer drafts are different intents.
// Either is consumed by one exact target, and neither is an original record.
assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length,34);assert.equal(toolsIndex.length,75);
assert.equal(PROJECT_INPUT_TARGETS.phonopy_derivation,undefined);assert.equal(toolsIndex.some(tool=>tool.route.includes('phonopy-derivation')),false,'The classroom workshop is not a new isolated expert tool');
for(const patch of [{sourceKind:'project-record'},{point:'C'},{fingerprint:'bad'},{referenceId:''},{input:{...payload.input,primitiveOrderConfirmed:false}},{input:{...payload.input,channel:'both'}},{input:{...payload.input,Q:[1,1,1]}}])assert.throws(()=>handoff.phonopyScatteringTeachingInput({...payload,...patch}));
handoff.setPhonopyScatteringTeachingInput(payload);assert.equal(handoff.phonopyScatteringVisit('home'),null);assert.equal(handoff.phonopyScatteringVisit(route),null);
const importer={content:payload.input.content,structure_content:payload.input.structure_content,filename:payload.input.filename,frequency_unit:payload.input.frequency_unit,selected_q:2};
handoff.setPhonopyScatteringInput(importer);const draft=handoff.phonopyScatteringVisit(route);assert.equal(draft.input.primitiveOrderConfirmed,false);assert.equal(draft.sourceKind,undefined);assert.equal(draft.input.coherentLengths,undefined);
handoff.setPhonopyScatteringTeachingInput(payload);handoff.setPhonopyScatteringInput(importer);assert.equal(handoff.phonopyScatteringVisit(route).sourceKind,undefined,'A new deliberate importer copy retires the prior teaching intent');

// The real pathways renderer owns and retires the optional host across tabs and
// topic changes, preserving original lesson exercises and ideal-chain controls.
let serial=0;
async function mountCourse(extra={}){const ui=await import('../dist/pathways-ui.js?derivation-host='+serial++),container=new Container(),runs=[];const cleanup=await ui.renderPathwaysView({container,selection:{module:'scattering',lesson:'scattering-phase'},run:(...args)=>{runs.push(args);throw Error('Course navigation must not calculate');},loadPhonopyDerivation:async()=>fakeModule(),onNavigateTeaching:target=>moves.push(target),...extra});return{container,cleanup,runs};}
{
 const v=await mountCourse();assert.equal(v.container.querySelector('[data-pdh-disclosure]').open,false);await toggle(v.container);const field=v.container.querySelector('#fake-draft');field.value='Course draft';field.oninput();v.container.querySelector('[data-pw-tab="derive"]').onclick();assert.equal(v.container.querySelector('[data-pdh-host]'),null);v.container.querySelector('[data-pw-tab="learn"]').onclick();await settle();assert.equal(v.container.querySelector('#fake-draft').value,'Course draft');
 const select=v.container.querySelector('#pw-lesson');select.value='scattering-temperature';select.onchange({target:select});assert.equal(v.container.querySelector('[data-pdh-host]'),null);assert.ok(v.container.querySelector('[data-learning-bridge="oscillator"]')||v.container.innerHTML.includes('learning-bridge'));
 v.container.querySelector('[data-pw-tab="lab"]').onclick();assert.ok(v.container.querySelector('#pw-includeAmplitudeReplay'));assert.equal(v.container.querySelector('#pw-includeAmplitudeReplay').checked,false);assert.equal(v.runs.length,0);v.cleanup();
}
{
 let resolve;const v=await mountCourse({loadPhonopyDerivation:()=>new Promise(done=>resolve=done)});await toggle(v.container);const count=mounted.length;v.container.querySelector('[data-pw-tab="lab"]').onclick();resolve(fakeModule());await settle();assert.equal(mounted.length,count);assert.ok(v.container.querySelector('#pw-form'));assert.equal(v.runs.length,0);v.cleanup();
}
assert.deepEqual(source.exercises,catalog.exercises.filter(x=>x.module==='scattering'));
assert.deepEqual(source.exercises.map(e=>e.steps.map(s=>s.answer)),[[0,1,2,1],[0,1,2,0],[1,0,2,1]],'All three original exercise answer sequences are retained');
for(const d of [source,catalog]){const text=JSON.stringify(d);assert.doesNotMatch(text,/本版不接收真实Phonopy|本版散射计算只运行双原子模型/);const bridge=d.cases.find(c=>c.id==='scattering-phonopy-bridge');assert.ok(bridge.links.some(([,url])=>url===host.PHONOPY_DERIVATION_ROUTE));assert.ok(bridge.links.some(([,url])=>url==='#compute/phonopy-scattering'));}
for(const d of [source,catalog]){const paragraph=d.lessons.find(lesson=>lesson.id==='scattering-phase').sections[1].text;assert.match(paragraph,/本题规范的创建振幅使用 e 的复共轭/);assert.match(paragraph,/可能改变振幅、强度和消光/);assert.match(paragraph,/个别测点仍可能碰巧强度相同，需检验中间复数与其它测点/);assert.doesNotMatch(paragraph,/都会改变消光/);assert.equal(typeof translations[paragraph],'string','The complete revised paragraph has an English translation');}
const dynamics=await import('../dist/structure-dynamics-ui.js');assert.match(dynamics.phonopyZnOEntryHTML(),/lesson=scattering-phase/);assert.match(dynamics.phonopyZnOTeachingHTML(),/lesson=scattering-phase/);
const research=await import('../dist/material-research-ui.js');
for(const lesson of ['mode-audit','mode-subspaces','mode-freezing']){const container=new Container();const cleanup=await research.renderMaterialResearchView({container,selection:{module:'modes',lesson,tab:'learn'},run:()=>{throw Error('A mode lesson link must not calculate');}});const link=container.querySelectorAll('a').find(a=>a.getAttribute('href')===host.PHONOPY_DERIVATION_ROUTE);assert.ok(link,'The actual mode lesson reaches the same scattering workshop: '+lesson);assert.equal(parseClassroomRoute(link.getAttribute('href')).lesson,'scattering-phase');cleanup?.();}

// Real new UI behind the real lazy host: actual paired files, genuine API
// reference, partial numeric text, complete point-B copy and scoped cancellation.
{
 const ui=await import('../dist/phonopy-derivation-ui.js'),fixture=json('scripts/fixtures/phonopy-derivation.json'),row=fixture.cases.find(c=>c.id==='zno-two-G'),container=new Container(),store=new Map(),runs=[],targets=[];
 let cancelled=0,held=null,hold=false;container.innerHTML=host.phonopyDerivationLessonHTML('scattering-phase');
 const run=(action,input)=>{runs.push({action,input:clone(input)});assert.equal(action,'phonopy_derivation');const differences=Object.keys({...input.input,...row.input.input}).filter(key=>JSON.stringify(input.input[key])!==JSON.stringify(row.input.input[key]));assert.deepEqual(differences,[],'Actual lesson/source fixture fields differ: '+differences.join(', '));assert.deepEqual({...input,mode:undefined},{...row.input,mode:undefined},'The actual lesson sends the complete source-bound genuine fixture request');if(!hold)return Promise.resolve(clone(row.result));const task=new Promise(resolve=>held=resolve);Object.defineProperty(task,'cancel',{value:()=>{cancelled++;return true;}});return task;};
 const cleanup=host.bindPhonopyDerivationHost({root:container.firstElementChild,lessonId:'scattering-phase',stateStore:store,run,loadModule:async()=>ui,onNavigateTeaching:target=>targets.push(target)});
 assert.equal(container.querySelector('#pd-load'),null);await toggle(container);assert.equal(runs.length,0);assert.equal(container.querySelector('#pd-derive').disabled,true);
 await container.querySelector('#pd-load').onclick();assert.equal(runs.length,0);assert.equal(container.querySelector('#pd-confirm').checked,false);
 for(const id of ['confirm','approximation']){const node=container.querySelector('#pd-'+id);node.checked=true;node.onchange();}assert.equal(runs.length,0);
 await container.querySelector('#pd-derive').onclick();assert.equal(runs.length,1);assert.ok(container.querySelector('#pd-A-QCartesian-re-0-0'),container.querySelector('#pd-status')?.textContent);
 let field=container.querySelector('#pd-A-QCartesian-re-0-0');field.value='2.389';container.querySelector('#pd-answer-form').oninput({target:field});await toggle(container,false);await toggle(container);field=container.querySelector('#pd-A-QCartesian-re-0-0');assert.equal(field.value,'2.389');assert.equal(runs.length,1);
 container.querySelector('#pd-point-B').onclick();container.querySelector('#pd-copy').onclick();assert.deepEqual(targets,['#compute/phonopy-scattering']);const copied=handoff.phonopyScatteringVisit(route);assert.deepEqual(copied.input,row.result.points.find(p=>p.id==='B').input);assert.equal(copied.point,'B');assert.equal(copied.fingerprint,row.result.fingerprint);assert.equal(copied.sourceKind,'teaching-reference');
 hold=true;const pending=container.querySelector('#pd-derive').onclick();await flush();await toggle(container,false);assert.equal(cancelled,1,'Collapsing the classroom cancels only its actual UI request');held(clone(row.result));await pending;await toggle(container);assert.equal(container.querySelector('#pd-A-QCartesian-re-0-0'),null,'The late request cannot reset the restored point-B view');assert.ok(container.querySelector('#pd-B-QCartesian-re-0-0'));
 const detached=container.querySelector('#pd-derive').onclick();await flush();container.innerHTML='<section>A newer tool owns the parent</section>';for(const observer of observers)if(!observer.disconnected)observer.fn();assert.equal(cancelled,2,'Parent detachment invokes the actual child disposer and its scoped cancellation');held(clone(row.result));await detached;assert.match(container.innerHTML,/A newer tool owns/);cleanup();assert.equal(cancelled,2);
}

// Run the actual app route/render wrapper with the actual expert UI. Its teaching
// copy is complete and editable, but only manual expert Run creates a new record.
const expert=await importFrom(app,'phonopy-scattering-ui.js'),notebook=await importFrom(app,'material-notebook.js');
const page=new Container();page.dataset={};const shell={isConnected:true},nodes=new Map(['app','page-title','page-subtitle','export-top','view-context'].map(id=>[id,id==='app'?page:new Element('div',{id},shell)]));
globalThis.document.querySelector=s=>nodes.get(s.slice(1))||page.querySelector(s);
const state={view:'home',route:'home',primary:'home',courseRoute:null},location={hash:''},engine=[],captures=[],historyWrites=[],projectNavigation=createProjectNavigator(),noop=()=>{};
const context={state,location,renderTicket:0,dictionaryController:null,renderedViewCleanup:null,URLSearchParams,structuredClone,Object,Promise,document:globalThis.document,projectNavigation,phonopyScatteringVisit:handoff.phonopyScatteringVisit,parseClassroomRoute,withClassroomNavigationContext,isClassroomView,labels:{home:['Home',''],['phonopy-scattering']:['Phonopy scattering','']},knownTool,esc:String,validateStructureHandoff:()=>null,$:s=>nodes.get(s.slice(1))||page.querySelector(s),$$:()=>[],history:{pushState:(x,t,url)=>{historyWrites.push(url);location.hash=url;},replaceState:(x,t,url)=>{historyWrites.push(url);location.hash=url;}},rememberRoute:noop,updateBreadcrumb:noop,optionalViews:{get:async()=>expert,peek:()=>expert},groupLoader:{peek:()=>true},databases:{},captureCalculation:(...args)=>{captures.push(args);return notebook.captureCalculation(...args);},latestCalculationStatus:notebook.latestCalculationStatus,mathSourceText:n=>n?.textContent||'',executePythonTask:async(action,input)=>{engine.push({action,input:clone(input)});return clone(reference.result);},toast:noop,download:noop,renderNavigationHub:async({container})=>container.innerHTML='<section>Home</section>'};
const ast=parse(app,{ecmaVersion:'latest',sourceType:'module'}),functions=['runPythonTask','setView','clearRenderedView','retainRenderedViewCleanup','render'].map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(n);return app.slice(n.start,n.end);}).join('\n');vm.createContext(context);vm.runInContext(functions,context);
handoff.setPhonopyScatteringTeachingInput(payload);await context.setView(route);assert.deepEqual(serialized(state.courseRoute.teachingInput),serialized(payload));assert.equal(state.courseRoute.importerInput,undefined);assert.equal(state.courseRoute.projectInput,undefined);assert.equal(engine.length,0);
assert.ok(page.querySelector('.teaching-input-notice'),'The actual expert UI labels a teaching copy separately from a record');assert.equal(page.querySelector('.project-input-notice'),null);
await page.querySelector('#ps-form').onsubmit(prevent);assert.deepEqual(engine,[{action:'phonopy_scattering',input:payload.input}]);assert.equal(captures.length,1);assert.deepEqual(serialized(notebook.latestCalculation().input),serialized(payload.input));
await context.runPythonTask('phonopy_derivation',{mode:'grade',answers:{some:[[1]]}});assert.equal(captures.length,1,'A training derivation/grade never overwrites the last material calculation');
const visit={kind:'project-calculation',targetRoute:route,action:'phonopy_scattering',mode:'current',source:{templateId:'custom',projectId:'record',stepId:'phonopy'},projectInput:{action:'phonopy_scattering',input:clone(reference.input)}};
handoff.setPhonopyScatteringTeachingInput(payload);await context.setView(route,{projectContext:visit});assert.equal(state.courseRoute.teachingInput,undefined);assert.ok(page.querySelector('.project-input-notice'));assert.equal(page.querySelector('.teaching-input-notice'),null);assert.equal(page.querySelector('#ps-content').value,reference.input.content,'The original record wins before the app consumes its one-visit projectInput');
assert.ok(historyWrites.every(url=>!url.includes('content')&&!url.includes('fingerprint')&&!url.includes('referenceId')));await context.setView('home');assert.equal(expert.getPhonopyScatteringResult(),null);
assert.equal(progressWrites,0,'Workshop references, answer drafts and training results never write mastery or the existing exercise records');
console.log('Phonopy derivation host passed: native optional lazy disclosure, retry/close/late-load/parent ownership, independent partial drafts, real scattering lesson tabs, preserved exercises/Bose/replay inputs, existing ZnO/mode routes, strict complete teaching RAM copies, actual expert route/manual Run/record priority, training capture exclusion, 75 tools and 34 adapters.');
