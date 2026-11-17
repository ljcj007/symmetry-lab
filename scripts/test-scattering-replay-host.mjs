import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import * as replayUI from '../dist/scattering-replay-ui.js';
import {SCATTERING_REPLAY_REFERENCE as reference} from '../dist/scattering-replay-reference.js';
import {bindScatteringReplayHost,scatteringReplayLessonHTML,scatteringReplayResultHTML} from '../dist/scattering-replay-host.js';

const json=x=>JSON.parse(JSON.stringify(x));
const clone=x=>structuredClone(x),prevent={preventDefault(){}},catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/pathways-materials.json',import.meta.url),'utf8'));
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/scattering-replay.json',import.meta.url),'utf8'));
const byId=id=>fixture.cases.find(row=>row.id===id),fetchCatalog=async()=>({ok:true,json:async()=>clone(catalog)});
const storage=new Map();let progressWrites=0;
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>{if(String(key).includes('progress'))progressWrites++;storage.set(key,value);}};
globalThis.document={createElement:tag=>new Element(tag)};
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return Object.hasOwn(this.attributes,'open');},set(value){if(value)this.attributes.open='';else delete this.attributes.open;}});
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
globalThis.fetch=fetchCatalog;
const observed=[];
globalThis.MutationObserver=class{constructor(fn){this.fn=fn;this.disconnected=false;observed.push(this);}observe(){}disconnect(){this.disconnected=true;}};
const settle=async()=>{for(let i=0;i<4;i++)await flush();};
let serial=0;
const fresh=label=>import('../dist/pathways-ui.js?scattering-host='+encodeURIComponent(label)+'-'+(++serial));
const click=(page,id)=>page.querySelector('#'+id).onclick(prevent);
const set=(page,id,value,event='onchange')=>{const n=page.querySelector('#'+id);assert.ok(n,id);n.value=String(value);n[event]?.({target:n});};
const tab=(page,name)=>page.querySelector('[data-pw-tab="'+name+'"]').onclick();
const open=async page=>{const d=page.querySelector('[data-sar-disclosure]');assert.ok(d);d.open=true;d.ontoggle();await settle();};
const selectLesson=(page,id)=>set(page,'pw-lesson',id);
async function mount({label='mount',selection={module:'scattering',lesson:'scattering-chain'},run=async()=>clone(byId('default').result),...extra}={}){
 const ui=await fresh(label),container=new Container(),downloads=[],calls=[],imports=[],fallback=[];
 const cleanup=await ui.renderPathwaysView({container,selection,run:(action,input)=>{calls.push({action,input:clone(input)});return run(action,input);},download:(body,name)=>downloads.push({body:JSON.parse(body),name}),cancelRun:()=>fallback.push(true),loadScatteringReplay:async()=>{imports.push('ui');return replayUI;},loadScatteringReferences:async()=>{imports.push('reference');return {SCATTERING_REPLAY_REFERENCE:reference};},...extra});
 return{ui,container,downloads,calls,imports,fallback,cleanup,$:s=>container.querySelector(s)};
}
assert.deepEqual(reference.cases.map(x=>x.id),fixture.cases.map(x=>x.id));
for(const row of reference.cases){assert.deepEqual(row.input,byId(row.id).input);assert.deepEqual(row.replay,byId(row.id).result.data.amplitudeReplay);}
assert.equal(scatteringReplayLessonHTML('scattering-temperature'),'');
assert.match(scatteringReplayResultHTML({data:{}}),/没有保存/);

// Real UI, real Python references and ordinary course handlers retain independent
// per-lesson and per-reference state without calling the calculation engine.
{
 const v=await mount();assert.equal(v.imports.length,0);assert.equal(v.$('[data-sar-disclosure]').open,false);
 await open(v.container);assert.deepEqual(v.imports,['ui','reference']);assert.equal(v.calls.length,0);assert.equal(v.$('#sar-host-case').value,'unequal-gamma');
 set(v.container,'sar-lesson-view-note','Mass normalization is not equal displacement.','oninput');click(v.container,'sar-lesson-view-next');click(v.container,'sar-lesson-view-next');
 set(v.container,'sar-lesson-view-predict-coherent','wrong');click(v.container,'sar-lesson-view-check-coherent');const feedback=v.$('#sar-lesson-view-feedback-coherent').textContent;assert.ok(feedback.length>20);
 const checks=v.$('[data-sar-native="checks"]');checks.open=true;checks.ontoggle();
 click(v.container,'sar-lesson-view-export');assert.deepEqual(v.downloads[0].body.replay,json(byId('unequal-gamma').result.data.amplitudeReplay));const staleExport=v.$('#sar-lesson-view-export').onclick;
 set(v.container,'sar-host-case','folded-odd');assert.equal(v.$('#sar-lesson-view-note').value,'');set(v.container,'sar-lesson-view-note','Odd zone uses the full Q phase.','oninput');
 set(v.container,'sar-host-case','unequal-gamma');assert.equal(v.$('#sar-lesson-view-note').value,'Mass normalization is not equal displacement.');assert.match(v.$('#sar-lesson-view-stage-status').textContent,/3 \/ 5/);assert.equal(v.$('#sar-lesson-view-feedback-coherent').textContent,feedback);assert.equal(v.$('[data-sar-native="checks"]').open,true);
 selectLesson(v.container,'scattering-phase');assert.equal(v.$('#sar-lesson-view-note'),null);await open(v.container);assert.equal(v.$('#sar-host-case').value,'folded-even');assert.equal(v.$('#sar-lesson-view-note').value,'');set(v.container,'sar-lesson-view-note','Phase lesson is independent.','oninput');
 staleExport();assert.equal(v.downloads.length,1);selectLesson(v.container,'scattering-chain');await settle();assert.equal(v.$('#sar-lesson-view-note').value,'Mass normalization is not equal displacement.');assert.equal(v.calls.length,0);
 tab(v.container,'lab');assert.equal(v.$('#pw-includeAmplitudeReplay').checked,false);set(v.container,'pw-temperature','', 'oninput');v.$('#pw-form').oninput({target:v.$('#pw-temperature')});
 tab(v.container,'learn');await settle();tab(v.container,'lab');assert.equal(v.$('#pw-temperature').value,'');assert.match(v.$('#pw-form').querySelector('[role="alert"]').textContent,/不能留空/);assert.equal(v.calls.length,0);
 tab(v.container,'learn');await settle();set(v.container,'sar-host-case','folded-even');click(v.container,'sar-host-copy');assert.equal(v.$('#pw-includeAmplitudeReplay').checked,true);assert.equal(v.$('#pw-selectedQ').value,String(byId('folded-even').input.selectedQ));assert.equal(v.$('#pw-form').querySelectorAll('[role="alert"]').length,0);assert.equal(v.calls.length,0,'Copy fills a complete supported input and waits for Run');v.cleanup();
}

// Unselected replay preserves the old request. A loaded explicit false retains
// its identity, while true results keep replay state and original export separate.
for(const flag of [undefined,false,true]){
 const row=byId('default'),input={...clone(row.input)};delete input.includeAmplitudeReplay;if(flag!==undefined)input.includeAmplitudeReplay=flag;
 const result=clone(row.result);if(flag!==true)delete result.data.amplitudeReplay;
 const v=await mount({label:'identity-'+flag,selection:{module:'scattering',tab:'lab',projectInput:{action:'dynamic_scattering_lab',input}},run:async()=>clone(result)});
 assert.equal(v.$('#pw-includeAmplitudeReplay').checked,flag===true);
 await v.$('#pw-form').onsubmit(prevent);await settle();
 assert.deepEqual(v.calls[0].input,input);assert.equal(v.imports.length,0);assert.deepEqual(v.ui.getPathwaysResult(),{module:'scattering',input,result});
 click(v.container,'pw-export');assert.deepEqual(v.downloads[0].body,json({module:'scattering',input,result}));
 if(flag===true){
  await open(v.container);assert.equal(v.imports.includes('reference'),false);set(v.container,'sar-result-view-note','This belongs to the manually calculated result.','oninput');click(v.container,'sar-result-view-next');
  tab(v.container,'learn');await settle();tab(v.container,'lab');await settle();assert.equal(v.calls.length,1);assert.equal(v.$('#sar-result-view-note').value,'This belongs to the manually calculated result.');assert.match(v.$('#sar-result-view-stage-status').textContent,/2 \/ 5/);assert.deepEqual(v.ui.getPathwaysResult(),{module:'scattering',input,result});
  click(v.container,'sar-result-view-export');assert.deepEqual(v.downloads.at(-1).body.replay,json(row.result.data.amplitudeReplay));
 }else assert.match(v.$('#pw-result').innerHTML,/没有保存逐原子振幅/);
 v.$('#pw-temperature').value='120';v.$('#pw-form').oninput({target:v.$('#pw-temperature')});await v.$('#pw-form').onsubmit(prevent);await settle();assert.equal(Object.hasOwn(v.calls.at(-1).input,'includeAmplitudeReplay'),flag!==undefined);if(flag!==undefined)assert.equal(v.calls.at(-1).input.includeAmplitudeReplay,flag);
 const staleForm=v.$('#pw-form'),staleCancel=v.$('#pw-cancel').onclick,before=v.calls.length;
 v.cleanup();staleForm.onsubmit(prevent);staleForm.oninput({target:staleForm.querySelector('input')});staleCancel();await settle();assert.equal(v.calls.length,before,'Disposed input handlers cannot start another calculation');
}

// Both loader error forms can retry; a delayed module never binds to a replaced
// lesson, tab or parent. Exercise native details using an actual NodeList-like
// iterator, without automatic Python work.
for(const synchronous of [true,false]){
 let tries=0;const v=await mount({label:'retry-'+synchronous,loadScatteringReplay:()=>{if(!tries++){if(synchronous)throw Error('temporary');return Promise.reject(Error('temporary'));}return Promise.resolve(replayUI);}});
 await open(v.container);assert.ok(v.$('[data-sar-retry]'));await v.$('[data-sar-retry]').onclick();await settle();assert.ok(v.$('#sar-lesson-view-note'));assert.equal(v.calls.length,0);v.cleanup();
}
for(const leave of ['tab','lesson','replacement','ancestor','dispose']){
 let release,bindings=0;const v=await mount({label:'late-'+leave,loadScatteringReplay:()=>new Promise(resolve=>release=resolve)});
 await open(v.container);assert.equal(typeof release,'function');
 if(leave==='tab')tab(v.container,'lab');else if(leave==='lesson')selectLesson(v.container,'scattering-phase');else if(leave==='replacement'){v.container.innerHTML='<section>Replacement content.</section>';observed.at(-1).fn();}else if(leave==='ancestor'){v.container.isConnected=false;observed.at(-1).fn();}else v.cleanup();
 release({...replayUI,bindScatteringReplay:o=>{bindings++;return replayUI.bindScatteringReplay(o);}});await settle();assert.equal(bindings,0,leave);assert.equal(v.calls.length,0);v.cleanup();
}

// Own-request cancellation is verified through the real shared client and the
// actual app capture wrapper: obsolete cleanup cannot stop a newer task.
const previousWorker=globalThis.Worker,workers=[];
globalThis.Worker=class{constructor(){this.messages=[];this.terminated=false;workers.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}reply(result,id=this.messages.at(-1)?.id){this.onmessage({data:{id,result}});}};
const client=await import('../dist/python-client.js');
const appSource=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),ast=parse(appSource,{ecmaVersion:'latest',sourceType:'module'});
const runNode=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='runPythonTask');assert.ok(runNode);
const shell={state:{route:'compute/dynamic-scattering-lab',view:'pathways',courseRoute:null},renderTicket:1,executePythonTask:client.runPythonTask,structuredClone,document:{querySelector:()=>({textContent:'Scattering'})},mathSourceText:node=>node.textContent,captureCalculation:()=>{}};
vm.createContext(shell);vm.runInContext(appSource.slice(runNode.start,runNode.end),shell);
for(const leave of ['input','tab','cancel','dispose','replacement']){
 client.cancelPython();const v=await mount({label:'scoped-'+leave,selection:{module:'scattering',tab:'lab'},run:shell.runPythonTask});
 v.$('#pw-form').onsubmit(prevent);await settle();const owned=workers.at(-1);assert.equal(owned.terminated,false);
 if(leave==='input'){v.$('#pw-temperature').value='120';v.$('#pw-form').oninput({target:v.$('#pw-temperature')});}else if(leave==='tab')tab(v.container,'learn');else if(leave==='cancel')click(v.container,'pw-cancel');else if(leave==='dispose')v.cleanup();else{v.container.innerHTML='<section>New owner</section>';observed.at(-1).fn();}
 await settle();assert.equal(owned.terminated,true,leave);assert.equal(v.fallback.length,0);owned.reply(clone(byId('default').result));await settle();assert.equal(v.ui.getPathwaysResult(),null);v.cleanup();
}
for(const outcome of ['completed','externally-cancelled','already-busy']){
 client.cancelPython();const v=await mount({label:'new-owner-'+outcome,selection:{module:'scattering',tab:'lab'},run:shell.runPythonTask});
 if(outcome==='already-busy'){const unrelated=client.runPythonTask('analyze',{});v.$('#pw-form').onsubmit(prevent);await settle();const worker=workers.at(-1);assert.equal(worker.terminated,false);v.cleanup();assert.equal(worker.terminated,false);worker.reply({unrelated:true});await unrelated;}
 else{v.$('#pw-form').onsubmit(prevent);await settle();if(outcome==='completed')workers.at(-1).reply(clone(byId('default').result));else client.cancelPython();await settle();const next=client.runPythonTask('analyze',{}),worker=workers.at(-1);v.cleanup();assert.equal(worker.terminated,false,outcome);worker.reply({next:true});await next;}
 assert.equal(v.fallback.length,0);
}
const {renderClassroomView}=await import('../dist/classroom-ui.js');
const appDeclarations=['runPythonTask','clearRenderedView','retainRenderedViewCleanup','render'].map(name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node);return appSource.slice(node.start,node.end);}).join('\n');
async function nestedApp(label,{newerBeforeCleanup=false,deferCatalog=false,failedCatalog=false}={}){
 client.cancelPython();let release;
 globalThis.fetch=deferCatalog?()=>new Promise(resolve=>release=()=>resolve({ok:true,json:async()=>clone(catalog)})):failedCatalog?async()=>{throw Error('Temporary catalogue failure');}:fetchCatalog;
 const host=await fresh(label),page=new Container();page.dataset={};const state={view:'pathways',route:'compute/dynamic-scattering-lab',courseRoute:'compute/dynamic-scattering-lab'},noop=()=>{};
 document.querySelector=selector=>selector==='#page-title'?{textContent:'Scattering course'}:page.querySelector(selector);
 const context={state,renderTicket:0,dictionaryController:null,renderedViewCleanup:null,Promise,Object,Error,structuredClone,executePythonTask:client.runPythonTask,cancelPython:client.cancelPython,document,mathSourceText:()=>'',captureCalculation:noop,structureHandoffForCalculation:()=>null,$:s=>s==='#app'?page:page.querySelector(s),optionalViews:{peek:()=>true,get:async()=>null},groupLoader:{peek:()=>true},databases:{},isClassroomView:view=>view==='pathways',syncCourseRoute:noop,updateBreadcrumb:noop,setView:noop,toast:noop,download:noop,openWorkbench:noop,openProjectLab:noop,canOpenProjectInput:()=>false,projectNavigation:{consumeInput:noop},esc:x=>String(x),renderNavigationHub:async({container})=>{container.innerHTML='<section>Another application page owns the container.</section>';},renderClassroomView:opts=>renderClassroomView({...opts,loadProgression:async()=>({renderLessonProgression:()=>''}),courseRenderers:{pathways:opts=>host.renderPathwaysView({...opts,loadScatteringReplay:async()=>replayUI,loadScatteringReferences:async()=>reference})}})};
 vm.createContext(context);vm.runInContext(appDeclarations,context);
 const opening=context.render();await settle();
 if(deferCatalog){assert.equal(typeof release,'function');state.view='home';state.courseRoute=null;await context.render();release();await opening;assert.match(page.firstElementChild.textContent,/Another application/);assert.equal(observed.at(-1).disconnected,true);return;}
 await opening;assert.equal(typeof context.renderedViewCleanup,'function',label+': '+page.firstElementChild.textContent);
 if(failedCatalog){assert.match(page.querySelector('[role="alert"]').textContent,/Temporary catalogue failure/);state.view='home';state.courseRoute=null;await context.render();assert.equal(observed.at(-1).disconnected,true);return;}
 page.querySelector('#pw-form').onsubmit(prevent);await settle();const owned=workers.at(-1);assert.equal(owned.terminated,false);let newer,newWorker;
 if(newerBeforeCleanup){client.cancelPython();newer=client.runPythonTask('analyze',{});newWorker=workers.at(-1);}
 state.view='home';state.courseRoute=null;await context.render();await settle();assert.equal(owned.terminated,true);assert.match(page.firstElementChild.textContent,/Another application/);if(newer){assert.equal(newWorker.terminated,false);newWorker.reply({newer:true});await newer;}
}
await nestedApp('nested-app-live');await nestedApp('nested-app-new-owner',{newerBeforeCleanup:true});await nestedApp('nested-app-late-catalog',{deferCatalog:true});await nestedApp('nested-app-failed-catalog',{failedCatalog:true});
globalThis.fetch=fetchCatalog;
client.cancelPython();globalThis.Worker=previousWorker;delete globalThis.MutationObserver;
assert.equal(progressWrites,0,'Opening, browsing and predictions do not write course grades.');
console.log('Scattering replay host passed: genuine references and live-result identity, opt-in and explicit-false drafts, two independent lessons, full copy/manual Run, result tab restoration, loader retry/late ownership, real app/client scoped cancellation and unchanged complete export.');
