import assert from 'node:assert/strict';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {renderClassroomView,parseClassroomRoute} from '../dist/classroom-ui.js';
import * as progression from '../dist/lesson-progression.js';

Element.prototype.insertAdjacentHTML=function(position,value){
 const fragment=new Element();fragment.innerHTML=value;
 const parent=position==='afterend'?this.parentNode:this;
 for(const child of fragment.children)child.parentNode=parent;
 if(position==='afterbegin')parent.children.unshift(...fragment.children);
 else if(position==='afterend')parent.children.splice(parent.children.indexOf(this)+1,0,...fragment.children);
 else throw Error('Unsupported insertion');
};
let currentCourse,fail=false,calculations=0,storageReads=0,storageWrites=0;
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>{storageReads++;return null;},setItem:()=>{storageWrites++;}};
const container=new Container(),moves=[];
renderClassroomView({container,route:parseClassroomRoute('#classroom/spin?track=color&lesson=color-01&tab=learn'),
 courseRenderers:{academy:options=>{currentCourse=options;options.container.innerHTML='<p>Course hydration placeholder</p>';}},
 onNavigate:route=>moves.push(route),run:()=>{calculations++;},
 loadProgression:async()=>{if(fail)throw Error('temporary loading failure');return progression;}});
await flush();
const host=container.querySelector('#classroom-progression');
const link=host.querySelector('[data-lesson-progression-link]');
assert.ok(link?.isConnected);
link.setAttribute('data-observed-native-focus','retained');
// This child update is the real renderer-to-shell callback. It is deliberately
// later than the first graph result, as when lazy course hydration completes.
currentCourse.onNavigate({lesson:'color-01',tab:'learn'});await flush();
assert.equal(host.querySelector('[data-lesson-progression-link]'),link,'Equivalent hydrated selection must retain the exact native anchor');
assert.equal(link.getAttribute('data-observed-native-focus'),'retained');
assert.equal(link.onclick,undefined,'A retained anchor remains a native destination');
currentCourse.onNavigate({preset:'c3_point'});await flush();
assert.equal(host.querySelector('[data-lesson-progression-link]'),link,'A laboratory preset does not rebuild unchanged recommendations');
currentCourse.onNavigate({tab:'lab'});await flush();assert.equal(host.hidden,true);
currentCourse.onNavigate({tab:'learn'});await flush();assert.equal(host.hidden,false);
assert.equal(host.querySelector('[data-lesson-progression-link]'),link,'Ordinary tab return keeps the native link and its disclosure subtree');
currentCourse.onNavigate({lesson:'color-03'});await flush();
const different=host.querySelector('[data-lesson-progression-link]');
assert.notEqual(different,link,'A genuinely different lesson replaces its recommendations');
assert.equal(link.isConnected,false);assert.match(host.innerHTML,/color-03/);
fail=true;currentCourse.onNavigate({tab:'learn'});await flush();assert.match(host.innerHTML,/重试学习衔接/);
fail=false;host.querySelector('[data-progression-retry]').onclick();await flush();
assert.match(host.innerHTML,/color-03/,'Retry restores recommendations even if their prior canonical markup was identical');
assert.notEqual(host.querySelector('[data-lesson-progression-link]'),different);
assert.equal(calculations,0);assert.equal(storageReads,0);assert.equal(storageWrites,0);
assert.ok(moves.length>=6);
console.log('Progression stability: actual lazy course callbacks retain native anchor identity across equivalent selection, presets and tab returns; changed lessons and retry replace only their own content, without calculation or mastery I/O.');
