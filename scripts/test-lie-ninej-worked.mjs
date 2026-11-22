import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const readJSON=name=>JSON.parse(readFileSync(new URL('data/'+name,edition),'utf8'));
const course=readJSON('lie-group-lessons.json');
const exercises=readJSON('lie-derivations.json');
const {parseClassroomRoute,renderClassroomView}=await import(new URL('classroom-ui.js',edition));
const {renderLieGroupView}=await import(new URL('lie-group-ui.js',edition));
const {lessonProgressionEdges}=await import(new URL('lesson-progression.js',edition));
const compute='#compute/lie/su3_ninej';

Object.defineProperty(Element.prototype,'firstElementChild',{get(){return this.children[0]||null;}});
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();
 fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('These actions must not mark learning progress')};
globalThis.fetch=async url=>{
 const name=String(url).split('/').at(-1).split('?')[0];
 const data={'lie-group-lessons.json':course,'lie-derivations.json':exercises}[name];
 assert.ok(data,name);
 return {ok:true,json:async()=>structuredClone(data)};
};

const container=new Container(),$=selector=>container.querySelector(selector),moves=[],runs=[];
const run=async(action,input)=>{
 assert.equal(action,'teaching_labs');
 runs.push(input);
 throw Error('Manual request captured');
};
let cleanup=()=>{};
async function open(route){
 const previous=runs.length;
 cleanup();
 cleanup=(await renderClassroomView({container,route,run,onNavigate:hash=>moves.push(hash),
  courseRenderers:{lie:renderLieGroupView}}))||(()=>{});
 await flush();
 assert.equal(runs.length,previous,'Opening a route must wait for manual Run');
}
async function submit(){
 const previous=runs.length;
 await $('#lg-lab-form').onsubmit({preventDefault(){}});
 assert.equal(runs.length,previous+1);
 return runs.at(-1);
}
function staged(lesson,track){
 return '#classroom/coupling?tab=learn&lesson='+lesson+'&track='+track;
}
function nativeHref(selector){
 const link=$(selector);
 assert.equal(link?.tag,'a');
 assert.equal(link.onclick,undefined);
 return link.getAttribute('href').replaceAll('&amp;','&');
}

const cases=[
 {key:'fundamentals',lesson:'su3-ninej-color-complex',worked:'su3-ninej-four-fundamentals',
  primary:'su3-ninej-color-octet',derivation:'su3-ninej-color-octet-phase-paths',
  factors:[[1,0],[1,0],[1,0],[1,0]],target:[2,1],index:0},
 {key:'octetsSinglet',lesson:'su3-ninej-adjoint-observables',worked:'su3-ninej-four-octets-singlet',
  primary:'su3-ninej-four-octets-adjoint',derivation:'su3-ninej-adjoint-32-casimir-spectrum',
  factors:[[1,1],[1,1],[1,1],[1,1]],target:[0,0],index:7}
];
const workedRequests={};
for(const task of cases){
 const lessonRoute=staged(task.lesson,'ninej');
 await open(lessonRoute);
 const exactHref=nativeHref('#lg-worked-calculator');
 assert.equal(exactHref,compute+'?preset='+task.worked);
 assert.match($('#lg-worked-calculator').textContent,english?/^Open this 9j example/:/^在 9j 计算器打开本例/);
 assert.match($('.lg-worked').textContent,english?/weighted|Weight the/:/加权和|各乘/);

 // The extra worked action and the original lesson/derivation actions remain distinct.
 const before=runs.length;
 await $('#lg-lesson-lab').onclick();
 assert.ok($('#lg-run'));
 assert.equal(parseClassroomRoute(moves.at(-1)).preset,task.primary);
 await open(lessonRoute);
 await $('#lg-chapter-derive').onclick();
 const exercise=exercises.exercises[Number($('#lg-derivation-select').value)];
 assert.equal(exercise.id,task.derivation);
 assert.equal(exercise.labPreset,task.primary);
 await $('#lg-derivation-lab').onclick();
 assert.equal(parseClassroomRoute(moves.at(-1)).preset,task.primary);
 assert.equal(runs.length,before);

 await open(exactHref);
 const expected={lab:'lie',experiment:'su3_ninej',factors:task.factors,target:task.target,
  direction:'left_to_right',state:{index:task.index}};
 workedRequests[task.key]=await submit();
 assert.deepEqual(workedRequests[task.key],expected);

 // An accepted ordinary form value survives a lesson visit and a preset-free return.
 const editedIndex=task.index===0?1:0;
 $('#lg-ninej-index').value=String(editedIndex);
 $('#lg-ninej-index').oninput();
 const edited={...expected,state:{index:editedIndex}};
 assert.deepEqual(await submit(),edited);
 await open(lessonRoute);
 await open(compute);
 assert.deepEqual(await submit(),edited);
 await open(exactHref);
 assert.equal(Number($('#lg-ninej-index').value),task.index);
}

for(const [from,track,to,nextTrack] of [
 ['su3-cg-exact-complex-states','cg','su3-racah-coupling-paths','racah'],
 ['su3-racah-complex-observables','racah','su3-ninej-paired-trees','ninej']
]){
 await open(staged(from,track));
 assert.equal($('#lg-next-lesson'),null);
 const href=nativeHref('#lg-next-stage');
 assert.equal(href,staged(to,nextTrack));
 assert.match($('#lg-next-stage').textContent,english?/^Next stage/:/^下一阶段/);
 await open(href);
 assert.equal($('#lg-track-select').value,nextTrack);
 assert.equal(course.lessons[Number($('#lg-chapter-select').value)].id,to);

 // The broader catalog still uses its ordinary next lesson control.
 await open(staged(from,'coupling'));
 assert.equal($('#lg-next-stage'),null);
 await $('#lg-next-lesson').onclick();
 assert.equal(course.lessons[Number($('#lg-chapter-select').value)].id,to);
}
for(const [from,to] of [
 ['su3-cg-multiplicity','su3-racah-coupling-paths'],
 ['su3-racah-coupling-paths','su3-ninej-paired-trees']
]){
 assert.ok(lessonProgressionEdges.some(edge=>edge.from==='lie-group-lessons::'+from&&
  edge.to==='lie-group-lessons::'+to));
}
cleanup();

if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',
  ['-B','scripts/test-python-lie-ninej-worked.py'],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(workedRequests),encoding:'utf8'});
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--payloads'))console.log(JSON.stringify(workedRequests));
else console.log(`SU(3) 9j worked routes (${english?'English':'Chinese'}): two exact actions and two stage continuations; existing lesson, derive and ordinary input verified.`);
