import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const fromApp=name=>{
 const match=source.match(new RegExp("from '(\\./"+name.replaceAll('.','\\.')+"[^']*)'"));
 assert.ok(match,'Production app import '+name);
 return import(new URL('../dist/'+match[1].slice(2),import.meta.url));
};
const notebook=await fromApp('material-notebook.js'),classroom=await fromApp('classroom-ui.js');
const {createProjectNavigator,prepareProjectNavigation}=await fromApp('project-navigation.js');
const {supportsProjectInput,projectInputFor}=await fromApp('project-input.js');
const {projectWorkbenchSelection,canRestoreProjectWorkbench}=await fromApp('project-workbench.js');
const {buildWorkbenchRoute,parseWorkbenchSelection}=await fromApp('workbench-route.js');
const {knownTool}=await fromApp('navigation-ui.js');
const {createResourceLoader}=await fromApp('resource-loader.js');
const projectSpecifier=source.match(/projects:\(\)=>import\('([^']+)'\)/)?.[1];
assert.ok(projectSpecifier,'Discover the production optional-project module rather than choosing a different instance');
const projectModule=()=>import(new URL('../dist/'+projectSpecifier.slice(2),import.meta.url));
const projectsUI=await projectModule();

Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Object.defineProperty(Element.prototype,'classList',{configurable:true,get(){const element=this;return {toggle(name,force){const names=new Set((element.attributes.class||'').split(/\s+/).filter(Boolean)),add=force??!names.has(name);if(add)names.add(name);else names.delete(name);element.attributes.class=[...names].join(' ');return add;},add(name){this.toggle(name,true);},remove(name){this.toggle(name,false);}};}});
Element.prototype.removeAttribute=function(key){delete this.attributes[key];};
Element.prototype.focus=function(){document.activeElement=this;};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(position,html){const fragment=new Element();fragment.innerHTML=html;const parent=position==='afterend'?this.parentNode:this;for(const child of fragment.children)child.parentNode=parent;if(position==='afterbegin')parent.children.unshift(...fragment.children);else if(position==='afterend')parent.children.splice(parent.children.indexOf(this)+1,0,...fragment.children);else throw Error('Unsupported test insertion position');};
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){return selector.includes(',')?[...new Set(selector.split(',').flatMap(part=>queryAll.call(this,part.trim())))]:queryAll.call(this,selector);};
const localStorage=new Map();
globalThis.localStorage={getItem:key=>localStorage.get(key)||null,setItem:(key,value)=>localStorage.set(key,value)};
globalThis.indexedDB=undefined;
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});

const host=new Container(),shell={isConnected:true,children:[]};host.dataset={};
const nodes=new Map(['page-title','page-subtitle','export-top','view-context'].map(id=>[id,new Element('div',{id},shell)]));
nodes.set('app',host);
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag),querySelector:selector=>nodes.get(selector.slice(1))||host.querySelector(selector)};
const appState={view:'home',route:'home',primary:'home',courseRoute:null,returnCourse:null,mode:'sg',group:null,k:[0,0,0],doubleValued:false,bzType:'',labelK:null};
const location={hash:''},historyWrites=[],engineCalls=[],downloads=[],groups=read('../dist/data/space-groups.json').groups;
const fixtures=read('./fixtures/spectroscopy.json'),deviceInput=structuredClone(fixtures.requests['old-device'].input),deviceResult=structuredClone(fixtures.results['old-device']);
const originalFixture=structuredClone({input:deviceInput,result:deviceResult});
const analyzeFixture=read('./fixtures/pathways-projects.json'),analyzeRequest=analyzeFixture.requests['site-bloch-little-group/little'],analyzeResult=analyzeFixture.results['site-bloch-little-group/little'];
const cloned=value=>structuredClone(value);
// This UI fixture applies the exact independent-copy convention, not a new
// scattering calculation: spin copies leave T/R and per-spin LDOS unchanged.
// The scientific identity is separately tested against production Python.
const withSpinCopies=spin=>{const result=cloned(deviceResult);result.parameters.spinDegeneracy=spin;result.selection.conductanceQuantum*=spin;result.selection.conductanceSiemens*=spin;result.scan.conductanceQuantum=result.scan.conductanceQuantum.map(value=>value*spin);return result;};
let holdNextResult=false,releaseHeldResult=null;
const executePythonTask=async(action,input)=>{
 engineCalls.push({action,input:cloned(input)});
 if(action==='device_transport_lab'){
  const result=withSpinCopies(input.spinDegeneracy);
  if(holdNextResult){holdNextResult=false;return new Promise(resolve=>{releaseHeldResult=()=>resolve(result);});}
  return result;
 }
 if(action==='analyze')return cloned(analyzeResult);
 throw Error('Unexpected engine action '+action);
};
const navigator=createProjectNavigator(),renderJobs=[];
const appContext={
 state:appState,location,history:{pushState(value,_title,hash){historyWrites.push({value,hash});location.hash=hash;},replaceState(value,_title,hash){historyWrites.push({value,hash});location.hash=hash;}},
 URLSearchParams,structuredClone,Object,Promise,console,document:globalThis.document,projectNavigation:navigator,prepareProjectNavigation,supportsProjectInput,projectInputFor,projectWorkbenchSelection,canRestoreProjectWorkbench,
 $:selector=>nodes.get(selector.slice(1))||host.querySelector(selector),$$:()=>[],
 labels:Object.fromEntries(['home','projects','notebook','response-materials','spectroscopy','workbench'].map(key=>[key,[key,'']])),knownTool,esc:value=>String(value??''),rememberRoute:()=>{},updateBreadcrumb:()=>{},
 parseClassroomRoute:classroom.parseClassroomRoute,withClassroomNavigationContext:classroom.withClassroomNavigationContext,isClassroomView:classroom.isClassroomView,
 renderClassroomView:options=>{const job=classroom.renderClassroomView(options);renderJobs.push(job);return job;},
 optionalViews:createResourceLoader(key=>{assert.equal(key,'projects');return projectModule();}),
 databases:{sg:{groups}},groupLoader:{peek:mode=>mode==='sg'?{groups}:null},ensureGroups:async mode=>{assert.equal(mode,'sg');return {groups};},
 executePythonTask,captureCalculation:notebook.captureCalculation,renderMaterialNotebook:notebook.renderMaterialNotebook,
 mathSourceText:node=>node?.textContent||'',cancelPython:()=>{},toast:()=>{},download:(body,name)=>downloads.push({body,name}),openWorkbench:()=>{throw Error('This flow must use project navigation');},
 buildWorkbenchRoute,parseWorkbenchSelection,parseNumber:value=>Number(value),list:mode=>mode==='sg'?groups:[],gid:(group=appState.group)=>String(group?.number??group?.id),
 renderWorkbench:()=>{throw Error('Workbench control rendering is covered by its dedicated production-route suite');}
};
const section=(start,end)=>{const i=source.indexOf(start),j=source.indexOf(end,i);assert.ok(i>=0&&j>i,start);return source.slice(i,j);};
const functions=[
 section('async function runPythonTask(','\nconst optionalViews='),
 section('const canOpenProjectInput=','\nlet databases='),
 section('function setView(','\nfunction updateBreadcrumb('),
 section('function syncCourseRoute(','\nfunction resultMatches('),
 section('async function render(){','\nfunction renderWorkbench(){')
].join('\n');
vm.createContext(appContext);vm.runInContext('let renderTicket=0,dictionaryController=null;\n'+functions,appContext);
const productionOpenProjectLab=appContext.openProjectLab,expectedNotesAtOpen=new Map(),openEvents=[];
// Observe the local save at callback entry, then delegate the unmodified
// production function. Checking only after navigation would miss late saves.
appContext.openProjectLab=async request=>{
 const saved=(await notebook.listProjects()).find(project=>project.id===request.projectId);
 if(expectedNotesAtOpen.has(request.projectId))assert.equal(saved?.assignment.steps[request.stepId]?.interpretation,expectedNotesAtOpen.get(request.projectId),'Notes must already be saved when production openProjectLab starts');
 openEvents.push({projectId:request.projectId,stepId:request.stepId,mode:request.mode});
 return productionOpenProjectLab(request);
};
const settle=async()=>{for(let i=0;i<5;i++){await flush();await Promise.all(renderJobs.splice(0));}const retry=host.querySelector('#resource-retry');assert.equal(retry,null,retry?.parentNode?.textContent?.slice(0,400));};
const $=selector=>host.querySelector(selector),currentReturn=()=>nodes.get('view-context').querySelector('[data-project-return]');

const template=projectsUI.assignmentTemplates.find(t=>t.id==='normal-andreev');
const oldRecord=notebook.captureCalculation('device_transport_lab',deviceInput,deviceResult,{route:'compute/device-transport-lab',title:'Original numerical fixture'});
function makeAssignment(id,title,updated){let project=notebook.makeProject({title});project.id=id;project.assignment={id:template.id,steps:{normal:{recordId:'',interpretation:'saved '+title}},conclusion:'saved conclusion '+title};project=notebook.addRecord(project,oldRecord);project.assignment.steps.normal.recordId=project.records[0].id;project.updated=updated;return notebook.validateProject(project);}
const first=makeAssignment('project-copy-first','First local copy','2026-11-13T02:00:00.000Z'),second=makeAssignment('project-copy-second','Second local copy','2026-11-13T01:00:00.000Z');
await notebook.saveProject(first);await notebook.saveProject(second);
const firstBefore=cloned(first),secondOriginalRecord=cloned(second.records[0]);
await appContext.runPythonTask('device_transport_lab',{...deviceInput,spinDegeneracy:2});
assert.equal(notebook.latestCalculation().input.spinDegeneracy,2,'The actual app capture and project page use the same notebook singleton');

const projectRoute='atlas/projects?project=normal-andreev&projectInstance='+second.id+'&projectStep=normal';
await appContext.setView(projectRoute);await settle();
assert.equal($('#pj-project').value,second.id,'An explicit older second copy wins over first matching/newest template');
assert.ok($('[data-pj-current="normal"]'),'The real project UI sees the app-captured recent calculation');
assert.equal($('[data-pj-collect="normal"]').disabled,true,'Two independent spin copies do not silently satisfy the one-copy comparison');
assert.match($('#pj-stage-normal').innerHTML,/独立自旋通道数/);
$('#pj-note-normal').value='Notes edited before opening the current calculation';$('#pj-conclusion').value='Conclusion edited before leaving';
expectedNotesAtOpen.set(second.id,'Notes edited before opening the current calculation');
const oldOpen=$('[data-pj-current="normal"]');const callsBeforeOpen=engineCalls.length;
await oldOpen.onclick({preventDefault(){}});await settle();
assert.equal(appState.view,'response-materials');assert.equal($('#rp-spinDegeneracy').value,'2');
assert.equal(engineCalls.length,callsBeforeOpen,'Opening the copy does not calculate');
assert.ok(currentReturn());assert.equal(navigator.snapshot().hasInput,false);
assert.equal(appState.courseRoute.projectInput,undefined,'Successful render consumes the cached course selection too');
const savedAfterLeave=(await notebook.listProjects()).find(p=>p.id===second.id);
assert.equal(savedAfterLeave.assignment.steps.normal.interpretation,'Notes edited before opening the current calculation');
assert.equal(savedAfterLeave.assignment.conclusion,'Conclusion edited before leaving');assert.deepEqual(savedAfterLeave.records[0],secondOriginalRecord);

const detachedHeader=currentReturn();$('#rp-spinDegeneracy').value='1';$('#rp-form').oninput({target:$('#rp-spinDegeneracy')});
await appContext.syncCourseRoute('#compute/device-transport-lab?tab=lab',{render:false});await settle();
assert.equal($('#rp-spinDegeneracy').value,'1','Internal parameter synchronization does not reapply the old spin-2 snapshot');assert.ok(currentReturn());
const afterSync=appState.route;await detachedHeader.onclick({preventDefault(){}});await settle();assert.equal(appState.route,afterSync,'A detached return cannot consume the replacement visit');
$('#rp-form').onsubmit({preventDefault(){}});await settle();
assert.equal(engineCalls.length,callsBeforeOpen+1);assert.equal(engineCalls.at(-1).input.spinDegeneracy,1);
assert.equal(notebook.latestCalculation().input.spinDegeneracy,1,'The manual result is visible through the actual shared notebook instance');
const consumedReturn=currentReturn();await consumedReturn.onclick({preventDefault(){}});await settle();
assert.equal(appState.route,projectRoute);assert.equal($('#pj-project').value,second.id);assert.equal(document.activeElement?.id,'pj-stage-normal');
assert.equal($('#pj-note-normal').value,'Notes edited before opening the current calculation');assert.equal(currentReturn(),null);assert.equal(navigator.snapshot(),null);
const returnedRoute=appState.route;await consumedReturn.onclick({preventDefault(){}});await oldOpen.onclick({preventDefault(){}});await settle();assert.equal(appState.route,returnedRoute,'Consumed and detached controls cannot reopen a visit');
assert.equal(openEvents.length,1,'A stale project control cannot call the app opening function');
assert.equal($('[data-pj-collect="normal"]').disabled,false);await $('[data-pj-collect="normal"]').onclick();await settle();
const savedAfterCollect=(await notebook.listProjects()).find(p=>p.id===second.id);assert.equal(savedAfterCollect.records.length,2);assert.deepEqual(savedAfterCollect.records[0],secondOriginalRecord);assert.deepEqual((await notebook.listProjects()).find(p=>p.id===first.id),firstBefore);

const beforePreset=engineCalls.length;await $('[data-pj-open="normal"]').onclick({preventDefault(){}});await settle();
assert.equal($('#rp-preset').value,'device-perfect');assert.equal($('#rp-spinDegeneracy').value,'1');assert.equal(engineCalls.length,beforePreset,'The explicit stage-preset action also waits for manual calculation');assert.ok(currentReturn());
const outsideReturn=currentReturn();await appContext.setView(appState.route,{history:false});await settle();
assert.equal(currentReturn(),null);assert.equal(navigator.snapshot(),null);const externalRoute=appState.route;await outsideReturn.onclick({preventDefault(){}});await settle();assert.equal(appState.route,externalRoute);

// The embedded project tab exercises the actual app -> classroom -> response
// UI -> project UI callback chain, including its asynchronous local save.
await appContext.runPythonTask('device_transport_lab',{...deviceInput,spinDegeneracy:2});
await appContext.setView('classroom/crystal?module=device&tab=project&project=normal-andreev&projectInstance='+second.id+'&projectStep=normal');await settle();
assert.equal($('#pj-project').value,second.id);$('#pj-note-normal').value='Embedded project notes';
expectedNotesAtOpen.set(second.id,'Embedded project notes');
const embeddedOpen=$('[data-pj-current="normal"]'),beforeEmbedded=engineCalls.length;
await embeddedOpen.onclick({preventDefault(){}});await settle();assert.equal($('#rp-spinDegeneracy').value,'2');assert.equal(engineCalls.length,beforeEmbedded);assert.ok(currentReturn());
const beforeDeep=currentReturn();await appContext.setView('compute/device-transport-lab');await settle();
assert.equal(currentReturn(),null);assert.equal($('#rp-spinDegeneracy').value,'1','A new deep link cannot inherit the prior raw input');const freshRoute=appState.route;await beforeDeep.onclick({preventDefault(){}});await settle();assert.equal(appState.route,freshRoute);
assert.equal((await notebook.listProjects()).find(p=>p.id===second.id).assignment.steps.normal.interpretation,'Embedded project notes');

const latestBeforeStale=notebook.latestCalculation();holdNextResult=true;
$('#rp-form').onsubmit({preventDefault(){}});await flush();assert.equal(typeof releaseHeldResult,'function');
await appContext.setView(projectRoute);await settle();releaseHeldResult();await settle();
assert.deepEqual(notebook.latestCalculation(),latestBeforeStale,'A calculation finishing after navigation cannot replace the project page\'s recent evidence');

// Analyze uses only the app capture path, so this catches singleton splits
// which topic views' redundant capture might otherwise conceal.
await appContext.runPythonTask(analyzeRequest.action,cloned(analyzeRequest.input));
assert.equal(notebook.latestCalculation().action,'analyze');assert.deepEqual(notebook.latestCalculation().input,analyzeRequest.input);
await appContext.setView('atlas/projects?project=site-bloch-little-group');await settle();
await $('#pj-new').onclick();await settle();
assert.ok($('[data-pj-current="little"]'),'The actual project page sees the app-only workbench capture');assert.equal($('[data-pj-collect="little"]').disabled,false);

// Recomputing inside the actual notebook must update the same recent-record
// singleton as calculator runs. Capturing the ephemeral latest result does not
// itself append durable evidence; notebook rerun appends exactly one new record.
const beforeNotebookCalls=engineCalls.length,latestBeforeNotebook=notebook.latestCalculation();
assert.equal(latestBeforeNotebook.action,'analyze');
await appContext.setView('atlas/notebook');await settle();
assert.equal(engineCalls.length,beforeNotebookCalls,'Entering the notebook never recomputes saved evidence');
$('#nb-project').value=second.id;await $('#nb-project').onchange({target:$('#nb-project')});await settle();
assert.equal($('#nb-project').value,second.id);
const notebookBefore=(await notebook.listProjects()).find(project=>project.id===second.id),notebookSource=cloned(notebookBefore.records.at(-1));
const editedNotebookInput={...cloned(notebookSource.input),spinDegeneracy:2};
$('#nb-rerun-input').value=JSON.stringify(editedNotebookInput,null,2);
const beforeNotebookRun=engineCalls.length;await $('#nb-rerun').onclick();await settle();
assert.equal(engineCalls.length,beforeNotebookRun+1,'Only the explicit notebook rerun starts one calculation');
assert.deepEqual(engineCalls.at(-1),{action:'device_transport_lab',input:editedNotebookInput});
const notebookLatest=notebook.latestCalculation();
assert.equal(notebookLatest.action,'device_transport_lab','Notebook rerun replaces the prior analyze record in the canonical recent singleton');
assert.deepEqual(notebookLatest.input,editedNotebookInput);assert.deepEqual(notebookLatest.result,withSpinCopies(2));
const notebookAfter=(await notebook.listProjects()).find(project=>project.id===second.id);
assert.equal(notebookAfter.records.length,notebookBefore.records.length+1,'App capture does not create a second durable notebook record');
const retainedSource=notebookAfter.records.find(record=>record.id===notebookSource.id);
assert.ok(retainedSource);assert.deepEqual(retainedSource.input,notebookSource.input);assert.deepEqual(retainedSource.result,notebookSource.result);
assert.equal(retainedSource.notes,notebookSource.notes);assert.equal(retainedSource.draftInput,JSON.stringify(editedNotebookInput,null,2),'Only the explicitly edited rerun draft is saved on its source');
assert.deepEqual(notebookAfter.records[0],secondOriginalRecord);assert.deepEqual(notebookAfter.assignment,notebookBefore.assignment,'Rerunning does not automatically replace a project-stage evidence link');
assert.deepEqual(notebookAfter.records.at(-1).input,editedNotebookInput);assert.deepEqual(notebookAfter.records.at(-1).result,withSpinCopies(2));
assert.deepEqual((await notebook.listProjects()).find(project=>project.id===first.id),firstBefore,'Another local copy stays untouched by notebook rerun');
await appContext.setView(projectRoute);await settle();
assert.equal($('#pj-project').value,second.id);assert.ok($('[data-pj-current="normal"]'),'The real project page sees notebook rerun as its latest same-tool calculation');
assert.equal($('[data-pj-collect="normal"]').disabled,true,'The notebook spin-2 result still requires the existing spin-1 stage convention');
assert.match($('#pj-stage-normal').innerHTML,/独立自旋通道数/);
assert.deepEqual({input:deviceInput,result:deviceResult},originalFixture,'All original numerical fixture data remain unchanged');
assert.ok(historyWrites.every(entry=>entry.value===null));
assert.ok(historyWrites.every(entry=>!/(?:projectInput|spinDegeneracy|operations=|input=|%7B|\{)/i.test(entry.hash)),'Inputs never enter URL/history');
assert.equal(localStorage.size,0,'Navigation and local evidence do not claim course mastery');
console.log('Project app navigation: real setView/sync/render/capture and classroom/topic/project/notebook modules; exact second-instance return and stage focus, saved notes, current-input editing, manual compute/capture, strict collect, explicit preset without auto-run, consumed/detached/external/deep-link and late-result isolation, app-only analyze and notebook-rerun capture visibility, one durable rerun record with source preserved, immutable fixtures and no raw inputs in URL/history passed.');
