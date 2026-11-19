import assert from 'node:assert/strict';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const base=english?'../dist/en/':'../dist/';
const {renderClassroomView,parseClassroomRoute}=await import(base+'classroom-ui.js');
const progression=await import(base+'lesson-progression.js');
const label=english?/Find lessons in this topic/:/在本主题查课/;

Element.prototype.insertAdjacentHTML=function(position,value){
 const fragment=new Element();fragment.innerHTML=value;
 const parent=position==='afterend'?this.parentNode:this;
 for(const child of fragment.children)child.parentNode=parent;
 if(position==='afterbegin')parent.children.unshift(...fragment.children);
 else if(position==='afterend')parent.children.splice(parent.children.indexOf(this)+1,0,...fragment.children);
 else throw Error('Unsupported insertion');
};
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>assert.fail('Lesson lookup does not read course progress'),setItem:()=>assert.fail('Lesson lookup does not record course progress')};
const button='[data-lesson-topic-search]';
let options,activeFailure=false,opened=[];
function mount(route){
 const container=new Container(),selection=parseClassroomRoute(route);
 assert.ok(selection,route);
 renderClassroomView({container,route:selection,
  courseRenderers:{[selection.section]:input=>{options=input;input.container.innerHTML='<p>Lesson body</p>';}},
  loadProgression:async()=>{if(activeFailure)throw Error('temporary');return progression;},
  run:()=>assert.fail('Lesson lookup cannot run Python'),
  onOpenLessonTopic:(context,trigger)=>opened.push({context,trigger})});
 return container;
}

for(const lesson of progression.lessonProgressionInventory){
 const view=mount(lesson.route);
 await flush();
 const trigger=view.querySelector(button);
 assert.ok(trigger,lesson.key);
 assert.match(trigger.textContent,label);
 assert.equal(trigger.getAttribute('aria-haspopup'),'dialog');
 trigger.onclick();
 assert.deepEqual(opened.at(-1),{context:{route:lesson.route},trigger},lesson.key);
}
assert.equal(opened.length,197);

const view=mount('#classroom/spin?track=color&lesson=color-01&tab=learn');
await flush();
const trigger=view.querySelector(button);
options.onNavigate({lesson:'color-01',tab:'learn',preset:'something-else'});await flush();
assert.equal(view.querySelector(button),trigger,'Equivalent updates may not replace the focus target');
options.onNavigate({tab:'lab'});await flush();
assert.equal(view.querySelector('#classroom-progression').hidden,true);
const count=opened.length;
trigger.onclick();assert.equal(opened.length,count,'A hidden trigger cannot open the finder');
options.onNavigate({tab:'learn',lesson:'color-03'});await flush();
const next=view.querySelector(button);
assert.notEqual(next,trigger);
trigger.onclick();assert.equal(opened.length,count,'A retired trigger cannot use an old topic');
next.onclick();assert.match(opened.at(-1).context.route,/lesson=color-03/);

activeFailure=true;options.onNavigate({tab:'learn'});await flush();
assert.equal(view.querySelector(button),null);
activeFailure=false;view.querySelector('[data-progression-retry]').onclick();await flush();
assert.ok(view.querySelector(button));

for(const path of ['#classroom/start','#compute/phonons','#classroom/observables?lesson=unknown-teaching-id']){
 const page=mount(path);await flush();
 assert.equal(page.querySelector(button),null,path);
}

console.log(`Lesson topic host (${english?'English':'Chinese'}): all 197 native routes, current focus targets, retries, and scoped visibility passed.`);
