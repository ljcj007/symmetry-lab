import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Element,Container,flush} from './test-material-research-ui.mjs';
const course=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-group-lessons.json',import.meta.url),'utf8'));
const exercises=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-derivations.json',import.meta.url),'utf8'));
globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(String(url).includes('lie-derivations')?exercises:course)});
let storageWrites=0;globalThis.localStorage={getItem:()=>null,setItem(){storageWrites++;}};
let focused=null;Element.prototype.focus=function(){focused=this;};Element.prototype.scrollIntoView=function(){};
const ui=await import('../dist/lie-group-ui.js?stage-navigation');
const byId=new Map(course.lessons.map((l,index)=>[l.id,index]));
const expected={
 continuous:[0,1,2,3,4,5,6,7,8,12],
 representations:[5,9,10,11,13],cg:[14,15,16,17,18,19],racah:[20,21,22],ninej:[23,24,25,26,27,28,29,30,31]
};
expected.all=course.lessons.map((_,i)=>i);expected.coupling=[5,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
const allIndices=Array.from({length:32},(_,i)=>i);
const moves=[],calls=[];
const root=new Container();
const $=s=>root.querySelector(s),all=s=>root.querySelectorAll(s);
const currentIndices=()=>all('[data-lg-lesson]').map(button=>Number(button.dataset.lgLesson));
const otherIndices=()=>all('[data-lg-other-lesson]').map(button=>Number(button.dataset.lgOtherLesson));
const chosen=()=>Number($('#lg-chapter-select').value);
const change=(selector,value)=>{const control=$(selector);control.value=value;return control.onchange({target:control});};
const chooseOther=id=>{const index=byId.get(id),button=all('[data-lg-other-lesson]').find(b=>Number(b.dataset.lgOtherLesson)===index);assert.ok(button,id);button.onclick();};
const mount=async(track='continuous',lesson)=>ui.renderLieGroupView({container:root,selection:{pathway:track==='continuous'?'continuous':'coupling',track,tab:'learn',lesson},run:async(...args)=>{calls.push(args);throw Error('Stage navigation must not start Python');},onNavigate:patch=>moves.push(patch)});

for(const track of ['continuous','representations','cg','racah','ninej','coupling','all']){
 await mount(track);assert.equal($('#lg-track-select').value,track);
 assert.deepEqual(currentIndices(),expected[track],track+' sidebar lists only the selected stage');
 assert.deepEqual($('#lg-chapter-select').querySelectorAll('option').map(o=>Number(o.value)),expected[track],track+' chapter picker agrees with sidebar');
 assert.deepEqual([...currentIndices(),...otherIndices()].sort((a,b)=>a-b),allIndices,'Every original lesson remains available exactly once');
 assert.match($('.lg-stage-context').innerHTML,new RegExp(ui.lieStagePrerequisites[track].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.equal($('#lg-return-stage'),null,'A new render does not inherit a previous stage return');
 const catalog=$('.lg-other-stages');
 if(track==='all')assert.equal(catalog,null);
 else{
  assert.equal(catalog.tag,'details');assert.equal(catalog.getAttribute('open'),null);assert.ok(catalog.querySelector('summary'));assert.equal(catalog.querySelector('summary').onkeydown,undefined,'Use native keyboard disclosure behavior');
  for(let parent=catalog.parentNode;parent;parent=parent.parentNode)assert.equal(parent.matches?.('.lg-lesson-nav')||false,false,'The other-stage catalog must not live inside a responsive-hidden sidebar');
  const layout=$('.lg-learn-layout'),picker=$('.classroom-chapter-picker');assert.equal(catalog.parentNode,layout.parentNode,'The catalog is a full-width sibling of the lesson layout');assert.equal(catalog.parentNode,picker.parentNode);assert.ok(layout.parentNode.children.indexOf(picker)<layout.parentNode.children.indexOf(catalog),'The catalog follows the chapter picker');assert.ok(layout.parentNode.children.indexOf(catalog)<layout.parentNode.children.indexOf(layout),'The catalog precedes the lesson layout');
 }
 change('#lg-chapter-select',String(expected[track][0]));assert.equal(chosen(),expected[track][0]);
 $('#lg-next-lesson').onclick();assert.equal(chosen(),expected[track][1]);assert.equal(moves.at(-1).track,track);
 change('#lg-chapter-select',String(expected[track].at(-1)));assert.equal($('#lg-next-lesson'),null,'The final visible lesson cannot silently advance into a different stage');
 const count=moves.length,chapter=$('#lg-chapter-select');chapter.value='999';chapter.onchange({target:chapter});assert.equal(moves.length,count,'An invalid chapter is ignored');
 const control=$('#lg-track-select');control.value='unregistered';control.onchange({target:control});assert.equal(moves.length,count,'Unknown stages are ignored');
}

await mount('continuous','unitary-matrices');const oldSidebar=all('[data-lg-lesson]')[0],oldOther=all('[data-lg-other-lesson]')[0],oldTrack=$('#lg-track-select');
chooseOther('su3-cg-change-basis');assert.equal($('#lg-track-select').value,'cg');assert.equal(chosen(),14);assert.match($('.lg-stage-transition').innerHTML,/生成元、权图与物理应用/);assert.ok($('.lg-stage-context').innerHTML.includes(ui.lieStagePrerequisites.cg));assert.ok($('#lg-return-stage'));
const beforeStale=moves.length;oldSidebar.onclick();oldOther.onclick();oldTrack.onchange({target:oldTrack});assert.equal(moves.length,beforeStale,'Obsolete sidebar, catalog and dropdown controls cannot change the stage');
$('#lg-next-lesson').onclick();assert.equal(chosen(),15);assert.ok($('#lg-return-stage'),'The previous stage remains available while reading within the new stage');
const firstReturn=$('#lg-return-stage');chooseOther('su3-ninej-paired-trees');assert.equal(chosen(),23);assert.equal($('#lg-track-select').value,'ninej');assert.ok($('.lg-stage-context').innerHTML.includes(ui.lieStagePrerequisites.ninej));
const recentReturn=$('#lg-return-stage');recentReturn.onclick();assert.equal($('#lg-track-select').value,'cg');assert.equal(chosen(),15,'Only the most recent previous stage and its exact lesson are restored');assert.equal($('#lg-return-stage'),null,'Returning consumes the single slot rather than creating a back-and-forth stack');
const noReturnMoves=moves.length;recentReturn.onclick();firstReturn.onclick();assert.equal(moves.length,noReturnMoves);

await mount('continuous','unitary-matrices');chooseOther('su3-racah-coupling-paths');$('#lg-return-stage').onclick();assert.equal($('#lg-track-select').value,'continuous');assert.equal(chosen(),1,'The initial lesson is restored, not the first lesson in its stage');
change('#lg-track-select','cg');assert.equal($('#lg-track-select').value,'cg');assert.equal(chosen(),14);assert.ok($('#lg-return-stage'));assert.equal(focused,$('#lg-track-select'),'Stage transitions preserve a useful keyboard focus');$('#lg-return-stage').onclick();assert.equal(chosen(),1);assert.equal($('#lg-track-select').value,'continuous');
chooseOther('su3-ninej-27-input-exact');await $('#lg-chapter-derive').onclick();assert.equal($('#lg-derivation-select').value,String(exercises.exercises.findIndex(e=>e.id==='su3-ninej-27-weighted-entry')),'Existing exact related exercise survives the stage change');await $('#lg-return-lesson').onclick();assert.equal(chosen(),31);assert.equal($('#lg-track-select').value,'ninej');$('#lg-return-stage').onclick();assert.equal(chosen(),1);assert.equal($('#lg-track-select').value,'continuous');

chooseOther('su3-cg-change-basis');assert.ok($('#lg-return-stage'));await mount('continuous','su3-ninej-27-input-exact');assert.equal($('#lg-track-select').value,'ninej','An explicit out-of-stage deep link selects its actual stage');assert.equal(chosen(),31);assert.ok($('.lg-stage-context').innerHTML.includes(ui.lieStagePrerequisites.ninej));assert.equal($('#lg-return-stage'),null,'Direct links do not leak a prior render’s origin');
assert.ok(moves.every(patch=>!Object.keys(patch).some(key=>/return|origin|previous/i.test(key))),'Transient stage origins are not written into deep-link parameters');
assert.equal(storageWrites,0,'Navigation does not claim additional course mastery');assert.equal(calls.length,0);
const afterLeave=$('#lg-track-select'),nextCatalog=all('[data-lg-other-lesson]')[0],snapshot=moves.length;root.innerHTML='<p>Another course</p>';afterLeave.onchange({target:afterLeave});nextCatalog.onclick();assert.equal(moves.length,snapshot,'Controls cannot affect another mounted course');
console.log('Lie stage navigation: seven consistent filters/sidebar/next sets, 32 accessible lessons, native other-stage catalog, explicit prerequisites, single-use exact return, deep-link isolation, keyboard focus, existing derivation binding and zero Python/progress calls passed.');

// Exercise the production app -> canonical classroom -> Lie remount chain.
// A captured onNavigate patch alone cannot expose the remount that lost origin.
const classroom=await import('../dist/classroom-ui.js');
const {createProjectNavigator}=await import('../dist/project-navigation.js');
Object.defineProperty(Element.prototype,'firstElementChild',{get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(position,value){const fragment=new Element();fragment.innerHTML=value;const parent=position==='afterend'?this.parentNode:this;for(const child of fragment.children)child.parentNode=parent;if(position==='afterbegin')parent.children.unshift(...fragment.children);else if(position==='afterend')parent.children.splice(parent.children.indexOf(this)+1,0,...fragment.children);else throw Error('Unsupported test insertion position');};
Object.defineProperty(Element.prototype,'classList',{get(){const element=this;return {toggle(name,force){const names=new Set((element.attributes.class||'').split(/\s+/).filter(Boolean)),add=force??!names.has(name);if(add)names.add(name);else names.delete(name);element.attributes.class=[...names].join(' ');return add;},add(name){this.toggle(name,true);},remove(name){this.toggle(name,false);}};}});
const appSource=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const setViewSource=appSource.slice(appSource.indexOf('function setView('),appSource.indexOf('\nfunction updateBreadcrumb('));
const syncSource=appSource.slice(appSource.indexOf('function syncCourseRoute('),appSource.indexOf('\nfunction resultMatches('));
const renderSource=appSource.slice(appSource.indexOf('async function render(){'),appSource.indexOf('\nfunction renderWorkbench(){'));
const host=new Container(),nodes=new Map(['page-title','page-subtitle','export-top','view-context'].map(id=>[id,new Element('div',{id})]));
host.dataset={};
nodes.set('app',host);
const appState={view:'home',route:'home',primary:'home',courseRoute:null,returnCourse:null},location={hash:''},historyWrites=[],renderJobs=[];
let mounts=0;
const appContext={
 projectNavigation:createProjectNavigator(),openProjectLab:()=>assert.fail('Stage navigation must not open a project calculator'),canOpenProjectInput:()=>false,
 state:appState,location,history:{pushState(_state,_title,hash){location.hash=hash;historyWrites.push(hash);},replaceState(_state,_title,hash){location.hash=hash;historyWrites.push(hash);}},
 URLSearchParams,structuredClone,Object,Promise,console,
 $:selector=>nodes.get(selector.slice(1))||host.querySelector(selector),$$:()=>[],
 labels:{home:['Home',''],classroom:['Classroom',''],lie:['Lie groups','']},knownTool:()=>null,esc:value=>String(value??''),rememberRoute:()=>{},updateBreadcrumb:()=>{},
 parseClassroomRoute:classroom.parseClassroomRoute,withClassroomNavigationContext:classroom.withClassroomNavigationContext,isClassroomView:classroom.isClassroomView,
 renderClassroomView:options=>{mounts++;const job=classroom.renderClassroomView({...options,courseRenderers:{lie:ui.renderLieGroupView}});renderJobs.push(job);return job;},
 runPythonTask:async()=>{throw Error('Navigation must not start Python');},cancelPython:()=>{},toast:()=>{},download:()=>{},openWorkbench:()=>{}
};
vm.createContext(appContext);
vm.runInContext('let renderTicket=0,dictionaryController=null;\n'+setViewSource+'\n'+syncSource+'\n'+renderSource,appContext);
const settle=async()=>{for(let i=0;i<4;i++){await flush();await Promise.all(renderJobs.splice(0));}assert.equal(host.querySelector('#resource-retry'),null,'Production app render must succeed');};
const $app=selector=>host.querySelector(selector),chosenApp=()=>Number($app('#lg-chapter-select').value);
const openOther=index=>{const button=host.querySelectorAll('[data-lg-other-lesson]').find(item=>Number(item.dataset.lgOtherLesson)===index);assert.ok(button,'Other-stage lesson '+index);button.onclick();return settle();};
await appContext.setView('classroom/continuous?track=continuous&lesson=unitary-matrices');await settle();
assert.equal(chosenApp(),1);assert.equal(mounts,1);
const originalPage=host.firstElementChild;
await openOther(20);
assert.notEqual(host.firstElementChild,originalPage,'Changing continuous -> coupling really remounts the classroom shell');
assert.equal(mounts,2);assert.match(appState.route,/^classroom\/coupling\?/);assert.equal(appState.courseRoute.track,'racah');assert.equal(chosenApp(),20);
assert.ok($app('.lg-stage-context').innerHTML.includes(ui.lieStagePrerequisites.racah));assert.match($app('.lg-stage-transition').innerHTML,/生成元、权图与物理应用/);assert.ok($app('#lg-return-stage'));
assert.deepEqual(appState.courseRoute.lieStageReturn,{track:'continuous',lesson:1},'Origin survives only in the RAM course-route object');
assert.doesNotMatch(appState.route,/return|origin|previous/i);assert.ok(historyWrites.every(hash=>!/return|origin|previous/i.test(hash)),'Transient origin is never serialized into browser history');
const returnFromRacah=$app('#lg-return-stage');returnFromRacah.onclick();await settle();
assert.equal(mounts,3);assert.equal(appState.courseRoute.track,'continuous');assert.equal(chosenApp(),1);assert.equal($app('#lg-return-stage'),null);assert.equal(appState.courseRoute.lieStageReturn,undefined,'Returning consumes origin during the canonical remount');
const consumedMounts=mounts;returnFromRacah.onclick();await settle();assert.equal(mounts,consumedMounts,'A consumed detached return control cannot reopen a stage');

await openOther(20);await openOther(23);
assert.equal(appState.courseRoute.track,'ninej');assert.deepEqual(appState.courseRoute.lieStageReturn,{track:'racah',lesson:20},'A second crossing replaces the single slot');
await appContext.render();await settle();
assert.ok($app('#lg-return-stage'),'An internal rerender restores the most recent origin');$app('#lg-return-stage').onclick();await settle();
assert.equal(appState.courseRoute.track,'racah');assert.equal(chosenApp(),20);assert.equal($app('#lg-return-stage'),null);
await openOther(1);assert.ok($app('#lg-return-stage'));const freshUrl=appState.route;
await appContext.setView(freshUrl,{history:false});await settle();
assert.equal(appState.courseRoute.track,'continuous');assert.equal(chosenApp(),1);assert.equal($app('#lg-return-stage'),null,'A fresh external setView of even the same URL cannot inherit origin');
await openOther(20);assert.ok($app('#lg-return-stage'));
await appContext.setView('classroom/continuous?track=continuous&lesson=su3-ninej-27-input-exact&lieStageReturn=continuous');await settle();
assert.equal($app('#lg-track-select').value,'ninej');assert.equal(chosenApp(),31);assert.equal($app('#lg-return-stage'),null,'A new deep link clears RAM origin and ignores query-string origin injection');

const target='#classroom/coupling?track=racah',selection=classroom.parseClassroomRoute(target);
assert.equal(classroom.withClassroomNavigationContext(selection,{route:'#classroom/continuous',lieStageReturn:{track:'continuous',lesson:1}},target).lieStageReturn,undefined,'A context cannot be replayed onto a different navigation target');
for(const origin of [{track:'unknown',lesson:1},{track:'continuous',lesson:-1},{track:'continuous',lesson:1.5},{track:'continuous',lesson:Infinity},null])assert.equal(classroom.withClassroomNavigationContext(selection,{route:target,lieStageReturn:origin},target).lieStageReturn,undefined);
assert.equal(classroom.withClassroomNavigationContext({...selection,lieStageReturn:{track:'continuous',lesson:1}},undefined,target).lieStageReturn,undefined,'Absent explicit navigation context clears old metadata');
const storedOrigin=classroom.withClassroomNavigationContext(selection,{route:target,lieStageReturn:{track:'continuous',lesson:1}},target);
assert.deepEqual(classroom.parseClassroomRoute(classroom.buildClassroomHash(storedOrigin)),selection,'Ordinary deep-link roundtrips omit RAM context');
for(const origin of [{track:'continuous',lesson:9999},{track:'continuous',lesson:20},{track:'racah',lesson:20}]){
 await ui.renderLieGroupView({container:host,selection:{...selection,tab:'learn',lesson:course.lessons[20].id,lieStageReturn:origin}});
 assert.equal($app('#lg-return-stage'),null,'Actual lesson data rejects missing, out-of-stage or same-stage origins');
}
assert.equal(storageWrites,0);assert.equal(calls.length,0);
console.log('Lie canonical app routing: real setView/syncCourseRoute/classroom remount, RAM-only target-bound origin, exact single-use return, replacement, rerender persistence, external/deep-link isolation and invalid-origin rejection passed.');
