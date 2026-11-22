import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderClassroomView,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
const {lessonProgression}=await import(new URL('lesson-progression.js',edition));
const cases=[
 {lesson:'resonance-interactions',exercise:'resonance-interaction-steps',tool:'spin-resonance-lab',action:'spin_resonance_lab',
  lecture:'resonance-hyperfine',worked:'resonance-axial-zero-field',comparison:'resonance-hyperfine-zero-field',
  lectureInput:{spin:.5,nuclearSpin:.5,hyperfineParallel:.3,field:.34},
  workedInput:{spin:1,nuclearSpin:0,zeroFieldD:2.87,zeroFieldE:0,field:0},
  comparisonInput:{spin:.5,nuclearSpin:.5,hyperfineParallel:.3,hyperfinePerp:.3,field:0},
  draft:{temperature:'11',field:''}},
 {lesson:'andreev-barriers',exercise:'andreev-normal-steps',tool:'andreev-lab',action:'andreev_lab',
  lecture:'andreev-barrier',worked:'andreev-project-normal',
  lectureInput:{gap:.3,barrier:1.5,energy:.2},
  workedInput:{gap:0,barrier:0,energy:.2,chemicalPotential:0,gate:0,hopping:1,contactLeft:1,contactRight:1},
  draft:{energy:'.25',barrier:''}},
 {lesson:'spectra-audit',exercise:'spectra-integral-steps',tool:'atomic-spectra-lab',action:'atomic_spectra_lab',
  lecture:'spectra-d9-limit',worked:'spectra-d8-cubic',
  lectureInput:{configuration:'d9',polarization:'x',width:.35},
  workedInput:{configuration:'d8',polarization:'x',width:.35},
  draft:{width:'.45',temperature:''}}
];

Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();
 fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Opening a lab must not check off lessons')};
globalThis.fetch=async url=>{
 const name=String(url).split('?')[0].split('/').at(-1);
 assert.equal(name,'spectroscopy-materials.json');
 const data=JSON.parse(readFileSync(new URL('data/'+name,edition),'utf8'));
 return {ok:true,json:async()=>data};
};
async function mount(route){
 const page=new Container(),runs=[],routes=[];
 await renderClassroomView({container:page,route,onNavigate:hash=>routes.push(hash),
  run:async(action,input)=>{
   runs.push({action,input:structuredClone(input)});
   throw Error('Parameter capture only');
  }});
 await flush();
 return {runs,routes,$:name=>page.querySelector('#spx-'+name),
  tab:name=>page.querySelector('[data-spx-tab="'+name+'"]')};
}
async function submit(view,action,expected){
 const before=view.runs.length;
 view.$('form').onsubmit({preventDefault(){}});
 await flush();
 assert.equal(view.runs.length,before+1,'Manual submit sends one request');
 const request=view.runs.at(-1);
 assert.equal(request.action,action);
 for(const [key,value] of Object.entries(expected))assert.deepEqual(request.input[key],value,key);
 return request;
}
function change(view,field,value){
 const control=view.$(field);
 assert.ok(control,field);
 control.value=value;
 view.$('form').oninput({target:control});
}

const payloads={};
for(const test of cases){
 const route=lessonProgression({catalog:'spectroscopy-materials',lessonId:test.lesson}).current.route;
 const view=await mount(route);
 const currentPreset=()=>view.$('preset').value;
 const launch=async(button,preset)=>{
  const before=view.runs.length;
  await button.onclick();
  await flush();
  assert.equal(view.runs.length,before,'Opening a preset does not submit');
  assert.equal(currentPreset(),preset);
  const next=parseClassroomRoute(view.routes.at(-1));
  assert.equal(next.lesson,test.lesson);
  assert.equal(next.tab,'lab');
  assert.equal(next.preset,preset);
 };
 await launch(view.$('to-lab'),test.lecture);
 const lecture=await submit(view,test.action,test.lectureInput);
 for(const [field,value] of Object.entries(test.draft))change(view,field,value);
 view.tab('learn').onclick();
 view.tab('lab').onclick();
 for(const [field,value] of Object.entries(test.draft))assert.equal(view.$(field).value,value,'Ordinary tab keeps '+field);
 assert.equal(view.runs.length,1);
 view.tab('learn').onclick();
 view.$('to-derive').onclick();
 assert.equal(view.$('exercise').value,test.exercise);
 const comparison=view.$('flow-comparison');
 if(test.comparison){
  assert.match(view.$('flow-lab').textContent,english?/Axial zero-field splitting/:/轴向零场劈裂/u);
  assert.match(comparison.textContent,english?/Zero-field hyperfine multiplets/:/零场超精细/u);
 }else{
  assert.equal(view.$('flow-lab').textContent,english?'Test the exercise conditions':'用本题条件检验');
  assert.equal(comparison,null);
 }
 await launch(view.$('flow-lab'),test.worked);
 const derived=await submit(view,test.action,test.workedInput);
 payloads[test.lesson]={lecture,derived};
 if(test.comparison){
  comparison.onclick();
  assert.equal(currentPreset(),test.worked,'Detached comparison cannot replace the open lab');
  view.tab('derive').onclick();
  await launch(view.$('flow-comparison'),test.comparison);
  payloads[test.lesson].comparison=await submit(view,test.action,test.comparisonInput);
 }
 const compute='#compute/'+test.tool+'?preset=';
 for(const [preset,request] of [[test.lecture,lecture],[test.worked,derived],
   ...(test.comparison?[[test.comparison,payloads[test.lesson].comparison]]:[])]){
  const shared=await mount(compute+preset);
  assert.equal(shared.runs.length,0);
  assert.equal(shared.$('preset').value,preset);
  assert.deepEqual(await submit(shared,test.action,request.input),request);
 }
}
if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',['-B','scripts/test-python-spectroscopy-handoffs.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(payloads),encoding:'utf8'
 });
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--payloads'))console.log(JSON.stringify(payloads));
else console.log('Spectroscopy handoffs ('+(english?'English':'Chinese')+'): exact exercises, independent comparison, legacy routes, ordinary drafts and manual requests passed.');
