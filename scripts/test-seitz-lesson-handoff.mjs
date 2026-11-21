import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {buildClassroomHash,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
const {renderZeroStart}=await import(new URL('zero-start.js',edition));
Element.prototype.focus=function(){};
Element.prototype.checkValidity=function(){return true;};
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.fetch=async resource=>({
  ok:true,
  json:async()=>JSON.parse(readFileSync(new URL(String(resource).split('?')[0],edition),'utf8'))
});

const routes=[],calls=[];
async function run(tool,input){
  assert.equal(tool,'teaching_labs');
  const python=process.env.SYMMETRY_LAB_PYTHON||'python';
  const result=spawnSync(python,['-c',
    'import json, sys; sys.path.insert(0,"dist/python"); from teaching_labs import run; print(json.dumps(run(json.load(sys.stdin))))'
  ],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',input:JSON.stringify(input)});
  assert.equal(result.status,0,result.error?.message||result.stderr);
  const calculated=JSON.parse(result.stdout);
  calls.push({input,result:calculated});
  return calculated;
}
async function openCourse(route,visit){
  const source=await import(new URL('symmetry-course-ui.js?seitz-handoff='+visit,edition));
  const selection=parseClassroomRoute(route);
  const container=new Container();
  const dispose=await source.renderSymmetryCourseView({
    container,selection,run,
    onNavigate:patch=>routes.push(buildClassroomHash({...selection,...patch}))
  });
  return {container,dispose};
}
const preset=container=>container.querySelector('#sc-preset');
const click=(container,id)=>container.querySelector('#'+id).onclick();
const guide=new Container();
await renderZeroStart({container:guide,selection:parseClassroomRoute('#classroom/start?lesson=next')});
const crystal=guide.querySelectorAll('a').find(link=>link.getAttribute('href')==='#classroom/crystal?track=space');
assert.ok(crystal);

const {container:intro,dispose:closeIntro}=await openCourse(crystal.getAttribute('href'),'intro');
const explanation=intro.querySelector('#sc-content').innerHTML;
assert.ok(explanation.includes('P4₁')&&explanation.includes('P4₃'));
click(intro,'sc-lesson-lab');
assert.equal(preset(intro).value,'screw41');
const lessonLab=routes.at(-1),lessonSelection=parseClassroomRoute(lessonLab);
assert.equal(lessonSelection.lesson,'space-01');
assert.equal(lessonSelection.experiment,'seitz');
assert.equal(lessonSelection.preset,'screw41');
assert.equal(calls.length,0,'Opening the lesson preset does not run it');
await intro.querySelector('#sc-lab-form').onsubmit({preventDefault(){}});
assert.equal(calls.length,1,intro.querySelector('#sc-lab-output').textContent);
assert.equal(calls[0]?.input.preset,'screw41');
assert.deepEqual(calls[0].result.frames[1].translation,[0,0,.25]);
assert.equal(calls[0].result.closure.rotationOrder,4);
assert.deepEqual(calls[0].result.closure.translation,[0,0,1]);

const control=preset(intro),form=intro.querySelector('#sc-lab-form');
control.value='glide';
intro.querySelector('#sc-point-0').value='.37';
intro.querySelector('#sc-steps').value='';
form.oninput();
control.onchange({target:control});
const editedLab=routes.at(-1);
assert.equal(parseClassroomRoute(editedLab).preset,'glide','Changing the Seitz model updates the shareable route');
click(intro,'sc-tab-learn');
click(intro,'sc-tab-lab');
assert.equal(preset(intro).value,'glide');
assert.equal(intro.querySelector('#sc-point-0').value,'.37');
assert.equal(intro.querySelector('#sc-steps').value,'','An incomplete draft survives ordinary tabs');
closeIntro();

const generic='#classroom/crystal?tab=lab&experiment=seitz';
const cases=[
  [lessonLab,'screw41'],
  [editedLab,'glide'],
  [generic,'screw21'],
  [generic+'&lesson=space-01','screw41'],
  [generic+'&lesson=space-01&preset=screw21','screw21'],
  [generic+'&lesson=space-01&preset=constructor','screw41'],
  [generic+'&lesson=space-03&preset=glide','glide'],
  [generic+'&preset=translation','translation'],
  [generic+'&preset=screw43','screw21'],
  ['#classroom/crystal?tab=lab&experiment=constructor','screw21']
];
for(const [index,[route,expected]] of cases.entries()){
  const {container,dispose}=await openCourse(route,index);
  assert.equal(preset(container).value,expected,route);
  dispose();
}
const spinor=await openCourse('#classroom/crystal?tab=lab&experiment=spinor','shared-tab');
assert.ok(spinor.container.querySelector('#sc-axis'));
spinor.dispose();
const shortLink=await openCourse('#classroom/crystal?tab=lab&preset=glide','shared-tab');
assert.equal(preset(shortLink.container).value,'glide','A Seitz preset without an experiment parameter works after visiting another lab');
shortLink.dispose();
assert.equal(calls.length,1,'Only the explicit form submit runs Python');
console.log(`Seitz lesson handoff (${english?'English':'Chinese'}): matching 4₁ calculation, validated shared models, generic 2₁ entry and live drafts passed.`);
