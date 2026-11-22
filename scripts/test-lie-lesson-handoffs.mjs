import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const emitPayloads=process.argv.includes('--payloads');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,edition),'utf8'));
const {renderClassroomView,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
const {lessonProgressionInventory}=await import(new URL('lesson-progression.js',edition));
const exercises=json('data/lie-derivations.json').exercises;
const lessons=json('data/lie-group-lessons.json').lessons;
const cases=[
 {id:'rabi-qubit-control',preset:'rabi-detuned-first-peak',old:'pi',exercise:'rabi-pi-pulse',
  experiment:'rabi',input:{omega:2,delta:2,time:Math.PI/(2*Math.SQRT2)},
  exercisePreset:'pi',exerciseInput:{omega:1,delta:0,time:Math.PI}},
 {id:'su2-coupling-representations',preset:'spin-one-by-half',old:'half-pair',exercise:'su2-spin-addition',
  experiment:'su2_coupling',input:{twoJ1:2,twoJ2:1,twoM1:2,twoM2:-1,coupling:1}},
 {id:'singlet-triplet-exchange',preset:'half-pair',old:'half-one',exercise:'exchange-splitting',
  experiment:'su2_coupling',input:{twoJ1:1,twoJ2:1,twoM1:1,twoM2:-1,coupling:1},
  exercisePreset:'exchange-half-pair-kappa-two',exerciseInput:{twoJ1:1,twoJ2:1,twoM1:1,twoM2:-1,coupling:2}},
 {id:'su3-dynkin-representations',preset:'dynkin-fifteen-by-singlet',old:'three-bar',exercise:'su3-dynkin-dimension',
  experiment:'su3_tensor',input:{p1:2,q1:1,p2:0,q2:0},
  exercisePreset:'dynkin-twentyseven-by-singlet',exerciseInput:{p1:2,q1:2,p2:0,q2:0}},
 {id:'su3-flavor-color',preset:'three-bar',old:'eight-eight',exercise:'meson-singlet',
  experiment:'su3_tensor',input:{p1:1,q1:0,p2:0,q2:1}},
 {id:'su3-octet-selection',preset:'octet-by-singlet',old:'eight-eight',exercise:'octet-multiplicity',
  experiment:'su3_tensor',input:{p1:1,q1:1,p2:0,q2:0},
  exercisePreset:'eight-eight',exerciseInput:{p1:1,q1:1,p2:1,q2:1}}
];

// The normal classroom shell and lab handlers are used with inert DOM and Python adapters.
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Navigation must not record learning progress')};
globalThis.fetch=async url=>{
 const name=String(url).split('/').at(-1).split('?')[0];
 assert.ok(['lie-group-lessons.json','lie-derivations.json'].includes(name),name);
 return {ok:true,json:async()=>json('data/'+name)};
};

const payloads={lessons:{},derivations:{}};
for(const task of cases){
 const {renderLieGroupView}=await import(new URL(`lie-group-ui.js?lesson-handoff=${task.id}`,edition));
 const lesson=lessons.find(row=>row.id===task.id);
 assert.equal(lesson.labPreset,task.preset);
 const course=lessonProgressionInventory.find(row=>row.catalog==='lie-group-lessons'&&row.lessonId===task.id);
 assert.ok(course,task.id);
 const container=new Container(),$=selector=>container.querySelector(selector),visited=[],runs=[];
 const calculator='#compute/lie/'+task.experiment;
 const run=async(action,payload)=>{assert.equal(action,'teaching_labs');runs.push(payload);throw Error('Manual input capture');};
 const expected={lab:'lie',experiment:task.experiment,...task.input};
 const exercisePreset=task.exercisePreset??task.preset;
 const expectedExercise={lab:'lie',experiment:task.experiment,...(task.exerciseInput??task.input)};
 let cleanup=()=>{};
 async function open(route){
  cleanup();
  cleanup=(await renderClassroomView({container,route,run,onNavigate:hash=>visited.push(hash),courseRenderers:{lie:renderLieGroupView}}))||(()=>{});
  await flush();
 }
 async function submit(){
  const prior=runs.length;
  await $('#lg-lab-form').onsubmit({preventDefault(){}});
  assert.equal(runs.length,prior+1);
  return runs.at(-1);
 }
 async function verifyLesson(){
  const before=runs.length;
  await open(course.route);
  assert.equal(typeof $('#lg-lesson-lab').onclick,'function');
  await $('#lg-lesson-lab').onclick();
  assert.ok($('#lg-run'));
  assert.equal(parseClassroomRoute(visited.at(-1)).preset,task.preset);
  assert.equal(runs.length,before,'Opening does not run Python');
  const captured=await submit();
  assert.deepEqual(captured,expected,task.id);
  return captured;
 }

 payloads.lessons[task.id]=await verifyLesson();
 await open(calculator+'?preset='+task.old);
 assert.ok($('#lg-run'));
 assert.notDeepEqual(await submit(),expected,task.id+' must replace a different real input');
 await verifyLesson();

 // Leave either the worked example or the unrelated old values in the shared calculator.
 if(exercisePreset===task.preset)await open(calculator+'?preset='+task.old);
 await open(course.route);
 await $('#lg-chapter-derive').onclick();
 const selected=exercises[Number($('#lg-derivation-select').value)];
 assert.equal(selected.id,task.exercise);
 assert.equal(selected.labPreset,exercisePreset);
 assert.ok($('#lg-next-derivation-step')&&$('#lg-derivation-lab'));
 await $('#lg-derivation-lab').onclick();
 assert.ok($('#lg-run'));
 assert.equal(runs.length,3,'The existing derivation experiment also requires manual Run');
 assert.equal(parseClassroomRoute(visited.at(-1)).preset,exercisePreset);
 payloads.derivations[task.exercise]=await submit();
 assert.deepEqual(payloads.derivations[task.exercise],expectedExercise);

 await open(calculator+'?preset='+task.preset);
 assert.equal(runs.length,4,'A shared exact calculator route only fills the input');
 assert.deepEqual(await submit(),expected);
 cleanup();
}

if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',
  ['-B','scripts/test-python-lie-lesson-handoffs.py'],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(payloads),encoding:'utf8'});
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(emitPayloads)console.log(JSON.stringify(payloads));
else console.log(`Lie lesson handoffs (${english?'English':'Chinese'}): six lessons and six derivations open their own inputs, restore from stale values, preserve shared presets and require manual Run.`);
