import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element} from './test-material-research-ui.mjs';
import {createResultLocalizer} from '../dist/english-results.js';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const resultLocalizer=english?createResultLocalizer({
  ...JSON.parse(readFileSync(new URL('data/python-messages.json',edition),'utf8')),nativeAnnotations:true
}):null;
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
  const raw=JSON.parse(result.stdout);
  const calculated=resultLocalizer?resultLocalizer.result(raw):raw;
  calls.push({input,result:calculated});
  return calculated;
}
async function openCourse(route,visit,calculate=run){
  const source=await import(new URL('symmetry-course-ui.js?seitz-handoff='+visit,edition));
  const selection=parseClassroomRoute(route);
  const container=new Container();
  const dispose=await source.renderSymmetryCourseView({
    container,selection,run:calculate,
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
  [generic+'&preset=unlisted-model','screw21'],
  [generic+'&preset=rotation4','rotation4'],
  [generic+'&preset=screw43','screw43'],
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

const lessonRoute='#classroom/crystal?track=space&lesson=space-01';
const comparison=await openCourse(lessonRoute,'fourfold-comparison');
const $=selector=>comparison.container.querySelector(selector);
const compareForm=$('#sc-seitz-comparison-form');
const compareOutput=$('#sc-seitz-comparison-result');
const kField=$('#sc-seitz-comparison-k');
const submit=()=>compareForm.onsubmit({preventDefault(){}});
const rowCells=(host,id)=>host.querySelector(`[data-seitz-row="${id}"]`).querySelectorAll('td').map(cell=>cell.textContent);
assert.equal(kField.value,'0.25');
assert.equal(compareOutput.innerHTML,'');
await submit();
const models=['rotation4','screw41','screw43'];
assert.deepEqual(calls.slice(1).map(x=>x.input),models.map(preset=>({
  lab:'seitz',preset,point:[.2,.3,.1],k:[0,0,.25],steps:4
})));
assert.deepEqual(models.map(id=>rowCells(compareOutput,id)),[['0','0','1'],['1/4','1','−i'],['3/4','3','i']]);
if(english){
  assert.deepEqual(calls.slice(1).map(call=>call.result.title),[
    'Fourfold rotation 4: follow a Seitz operation',
    'Fourfold screw 4₁: follow a Seitz operation',
    'Fourfold screw 4₃: follow a Seitz operation'
  ]);
  for(const call of [calls[1],calls[3]]) assert.match(call.result.notes.at(-1),/translations along the axis/);
}
const traceButton=$('[data-seitz-detail="screw43"]');
traceButton.onclick();
assert.equal(traceButton.getAttribute('aria-pressed'),'true');
assert.deepEqual(rowCells($('#sc-seitz-comparison-trace'),'4'),['3.1','0.1']);
assert.equal(calls.length,4,'Browsing the computed steps does not run Python');
kField.value='0';
compareForm.oninput();
assert.equal(compareOutput.innerHTML,'','Editing the input clears results for the old wavevector');
assert.equal(calls.length,4,'Editing the wavevector waits for submit');
await submit();
assert.deepEqual(models.map(id=>rowCells(compareOutput,id)),[['0','0','1'],['1/4','1','1'],['3/4','3','1']]);
comparison.dispose();

for (const [id, translation] of [['rotation4',0],['screw43',3]]) {
  const view=await openCourse(generic+'&preset='+id,'fourfold-single-'+id);
  await view.container.querySelector('#sc-lab-form').onsubmit({preventDefault(){}});
  assert.equal(calls.at(-1).input.preset,id);
  assert.equal(calls.at(-1).result.closure.translation[2],translation);
  view.dispose();
}

for (const interrupt of ['edit','cancel','leave']) {
  let resolve,cancelled=0,requests=0;
  const pending=new Promise(finish=>{resolve=finish;});
  pending.cancel=()=>{cancelled++;};
  const view=await openCourse(lessonRoute,'fourfold-'+interrupt,()=>{requests++;return pending;});
  const form=view.container.querySelector('#sc-seitz-comparison-form');
  const output=view.container.querySelector('#sc-seitz-comparison-result');
  const running=form.onsubmit({preventDefault(){}});
  if(interrupt==='edit')form.oninput();
  if(interrupt==='cancel')click(view.container,'sc-seitz-comparison-cancel');
  if(interrupt==='leave')click(view.container,'sc-tab-lab');
  resolve(calls[1].result);
  await running;
  assert.equal(cancelled,1,interrupt);
  assert.equal(requests,1,'An interrupted comparison must not start the next model');
  assert.equal(output.innerHTML,'','An interrupted comparison must not render a late result');
  view.dispose();
}
console.log(`Seitz lesson handoff (${english?'English':'Chinese'}): shared models, live drafts, fourfold comparison, and interrupted calculations passed.`);
