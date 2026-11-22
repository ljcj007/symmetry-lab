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
 {catalog:'electronic-materials',prefix:'em',lesson:'shg-geometry',exercise:'shg-geometry-exercise',
  module:'shg',tool:'shg-lab',action:'shg_lab',lecture:'gaas-001-pp-worked',worked:'gaas-001-pp-worked',
  legacy:'gaas-001',field:'coefficients',incomplete:'{ incomplete JSON',
  expected:{model:'gaas',cut:'001',incidence:45,azimuth:45,samples:361,channel:'PP',coefficients:{xyz:1}},
  legacyValues:{azimuth:30,samples:181}},
 {catalog:'electronic-materials',prefix:'em',lesson:'unfold-projection',exercise:'unfold-projection-exercise',
  module:'unfold',tool:'unfold-lab',action:'unfold_lab',lecture:'chain-two-site-gamma',worked:'chain-two-site-gamma',
  legacy:'chain-perfect',field:'band',incomplete:'',
  expected:{mode:'model',model:'perfect',size:2,hopping:1,q:0,band:0},legacyValues:{size:4,q:.25}},
 {catalog:'response-materials',prefix:'rp',lesson:'device-scattering',exercise:'device-barrier-steps',
  module:'device',tool:'device-transport-lab',action:'device_transport_lab',lecture:'device-barrier',worked:'device-barrier-half-transmission',
  legacy:'device-barrier',field:'barrier',incomplete:'',
  expected:{model:'uniform',energy:0,barrier:2,hopping:1,leadHopping:1,contactLeft:1,contactRight:1,barrierWidth:1},
  legacyValues:{energy:.2,barrier:1.5}}
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
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Opening a lab should not mark exercise progress')};
globalThis.fetch=async url=>{
 const name=String(url).split('?')[0].split('/').at(-1);
 assert.ok(cases.some(test=>test.catalog+'.json'===name),'Unexpected fetch: '+name);
 const data=JSON.parse(readFileSync(new URL('data/'+name,edition),'utf8'));
 return {ok:true,json:async()=>data};
};

async function mount(route,prefix){
 const page=new Container(),runs=[],routes=[];
 await renderClassroomView({container:page,route,onNavigate:hash=>routes.push(hash),
  run:async(action,input)=>{
   runs.push({action,input:structuredClone(input)});
   throw Error('Parameter capture only');
  }});
 await flush();
 return {page,runs,routes,$:name=>page.querySelector('#'+prefix+'-'+name),
  tab:name=>page.querySelector('[data-'+prefix+'-tab="'+name+'"]')};
}

async function submit(view,action,expected){
 const count=view.runs.length;
 view.$('form').onsubmit({preventDefault(){}});
 await flush();
 assert.equal(view.runs.length,count+1,'Manual submit sends one request');
 const request=view.runs.at(-1);
 assert.equal(request.action,action);
 for(const [key,value] of Object.entries(expected))assert.deepEqual(request.input[key],value,key);
 return request;
}

function change(view,field,value){
 const control=view.$(field);
 assert.ok(control,field);
 control.value=String(value);
 view.$('form').oninput({target:control});
}

const payloads={};
for(const test of cases){
 const route=lessonProgression({catalog:test.catalog,lessonId:test.lesson}).current.route;
 const view=await mount(route,test.prefix);
 const launchPreset=async(button,preset)=>{
  const count=view.runs.length;
  await view.$(button).onclick();
  await flush();
  assert.equal(view.runs.length,count,'Explicit navigation should not submit');
  assert.equal(view.$('preset').value,preset);
  const next=parseClassroomRoute(view.routes.at(-1));
  assert.equal(next.lesson,test.lesson);
  assert.equal(next.tab,'lab');
  assert.equal(next.preset,preset);
 };
 await launchPreset('to-lab',test.lecture);
 const lecture=await submit(view,test.action,test.lecture===test.worked?test.expected:test.legacyValues);
 if(test.module==='shg'){
  const azimuth=view.$('azimuth');
  const [start,step]=['min','step'].map(key=>Number(azimuth.getAttribute(key)));
  assert.equal((45-start)%step,0,'Browser range step must admit 45°');
 }

 const stale=view.$('preset');
 stale.value=test.legacy;
 stale.onchange({target:stale});
 assert.equal(view.$('preset').value,test.legacy);
 await submit(view,test.action,test.legacyValues);
 change(view,test.field,test.incomplete);
 view.tab('learn').onclick();
 view.tab('lab').onclick();
 assert.equal(view.$(test.field).value,test.incomplete,'Ordinary tab roundtrip retains incomplete input');
 assert.equal(view.runs.length,2);
 view.tab('learn').onclick();
 view.$('to-derive').onclick();
 assert.equal(view.$('exercise').value,test.exercise);
 assert.equal(view.$('flow-lab').textContent,english?'Test the exercise conditions':'用本题条件检验');
 await launchPreset('flow-lab',test.worked);
 const derived=await submit(view,test.action,test.expected);
 payloads[test.lesson]={lecture,derived};

 if(test.module==='unfold'){
  change(view,'band',1);
  payloads[test.lesson].upper=await submit(view,test.action,{...test.expected,band:1});
 }
 const compute='#compute/'+test.tool+'?preset=';
 const shared=await mount(compute+test.worked,test.prefix);
 assert.equal(shared.runs.length,0);
 assert.equal(shared.$('preset').value,test.worked);
 assert.deepEqual(await submit(shared,test.action,test.expected),derived);
 const legacy=await mount(compute+test.legacy,test.prefix);
 assert.equal(legacy.runs.length,0);
 assert.equal(legacy.$('preset').value,test.legacy);
 payloads[test.lesson].legacy=await submit(legacy,test.action,test.legacyValues);
}

if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',
  ['-B','scripts/test-python-electronic-response-handoffs.py'],
  {cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(payloads),encoding:'utf8'});
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--payloads'))console.log(JSON.stringify(payloads));
else console.log('Electronic and device lesson handoffs ('+(english?'English':'Chinese')+'): exact controls, draft preservation, route replay and manual requests passed.');
