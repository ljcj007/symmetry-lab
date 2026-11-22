import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderClassroomView,parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
const read=name=>JSON.parse(fs.readFileSync(new URL(name,edition),'utf8'));
const runs=[],predictions=[];
const cases=[
 ['principles','exchange','spin','exchange-symmetry-lab','exchange-classical-quantum','exchange-plane',
  ['exchange-heisenberg','exchange-plane'],'dz','0.48',[/J=1.*D=0/,/0\.6/]],
 ['principles','conservation','continuous','conservation-lab','conservation-open','conservation-bath',
  ['conservation-mixed-xyz','conservation-bath-sz','conservation-bath-relaxation'],'gamma1','0.17',[/XYZ/,/S_z/,/S_z/]],
 ['construction','salc','foundations','salc-lab','salc-selection','salc-polarization',
  ['salc-polarization-x','salc-polarization'],'polarizationAngle','20',[/\bx\b/,/45°/]],
 ['construction','wavevector','structure-dynamics','wavevector-lab','wavevector-satellites','wavevector-double',
  ['wavevector-stripe','wavevector-double','wavevector-checker','wavevector-checker-phase90'],'phaseDegrees','35',[/N=4/,/N=4/,/0°/,/90°/]],
 ['construction','nonsymmorphic','crystal','nonsymmorphic-lab','nonsymmorphic-partner','nonsymmorphic-hourglass',
  ['nonsymmorphic-hourglass','nonsymmorphic-glide-quarter','nonsymmorphic-spinless'],'spinOrbit','0.83',[/滑移|glide/,/1\/4/,/\bX\b/]]
];
const fixtures=Object.fromEntries(['principles','construction'].map(name=>[name,
 JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/'+name+'.json.gz',import.meta.url))))]));
globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('?')[0])});
globalThis.localStorage={getItem:()=>null,setItem:()=>assert.fail('Navigation must not complete an exercise')};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
Object.defineProperty(Element.prototype,'firstElementChild',{configurable:true,get(){return this.children[0]||null;}});
Element.prototype.insertAdjacentHTML=function(position,html){
 const fragment=new Element();
 fragment.innerHTML=html;
 const parent=position==='afterbegin'?this:this.parentNode;
 const index=position==='afterbegin'?0:parent.children.indexOf(this)+1;
 for(const child of fragment.children)child.parentNode=parent;
 parent.children.splice(index,0,...fragment.children);
};
const submitEvent={preventDefault(){}};
const progress={progressionForSelection:()=>({})};
async function mount(route){
 const page=new Container(),history=[];
 await renderClassroomView({container:page,route,onNavigate:hash=>history.push(hash),loadProgression:async()=>progress,
  run:async(action,input)=>{runs.push({action,input});throw Error('Captured for CPython replay');}});
 const ctl=name=>page.querySelector('#pw-'+name);
 return {history,ctl,page,
  tab:name=>page.querySelector('[data-pw-tab="'+name+'"]').onclick(),
  update(name,value){const target=ctl(name);target.value=value;ctl('form').oninput({target});},
  async submit(){ctl('form').onsubmit(submitEvent);await flush();}
 };
}

for(const [family,module,pathway,tool,lesson,lecturePreset,stages,draftField,edit,labels] of cases){
 const catalog=read('data/'+family+'-materials.json');
 const material=catalog.cases.find(item=>item.module===module).id;
 const href='#classroom/'+pathway+'?'+new URLSearchParams({module,lesson,material});
 const view=await mount(href),getPreset=()=>view.ctl('preset').value;
 const before=runs.length;
 await view.ctl('to-lab').onclick();
 assert.equal(getPreset(),lecturePreset,lesson+' retains the ordinary lecture preset');
 assert.equal(view.page.querySelectorAll('[data-course-flow-stage]').length,0);
 assert.equal(runs.length,before);
 await view.submit();
 assert.deepEqual(runs.at(-1),fixtures[family].requests[lecturePreset]);

 view.update(draftField,edit);
 view.tab('learn');
 view.tab('lab');
 assert.equal(view.ctl(draftField).value,edit);
 const custom={...fixtures[family].requests[lecturePreset].input,[draftField]:Number(edit)};
 await view.submit();
 assert.deepEqual(runs.at(-1),{action:fixtures[family].requests[lecturePreset].action,input:custom});
 view.update(draftField,'');
 view.tab('learn');
 view.tab('lab');
 assert.equal(view.ctl(draftField).value,'');
 const afterEdit=runs.length;
 await view.submit();
 assert.equal(runs.length,afterEdit,'An incomplete number never reaches Python');
 assert.match(view.ctl('result').textContent,english?/number|value|valid|enter|finite|blank|empty/i:/有效|输入|数值|填写|留空/);

 view.tab('learn');
 view.ctl('to-derive').onclick();
 const exercise=view.ctl('exercise').value;
 assert.equal(view.page.querySelectorAll('[data-course-flow-stage]').length,stages.length-1);
 for(const [index,preset] of stages.entries()){
  const button=view.ctl(index===0?'flow-lab':'flow-stage-'+index);
  const label=button.textContent.trim();
  assert.match(label,labels[index],preset);
  if(english)assert.doesNotMatch(label,/\p{Script=Han}/u);
  const beforeStage=runs.length;
  await button.onclick();
  assert.equal(runs.length,beforeStage,'A stage loads controls without running Python');
  assert.equal(getPreset(),preset);
  const route=parseClassroomRoute(view.history.at(-1));
  assert.equal(route.tab,'lab');
  for(const [key,value] of Object.entries({module,lesson,material,preset}))assert.equal(route[key],value,key);
  await button.onclick();
  assert.equal(runs.length,beforeStage,'Detached stages never run or reinitialize the current pane');
  await view.submit();
  assert.equal(runs.length,beforeStage+1);
  assert.deepEqual(runs.at(-1),fixtures[family].requests[preset],preset);
  predictions.push({preset,...runs.at(-1)});
  view.tab('derive');
  assert.equal(view.ctl('exercise').value,exercise,'Returning to compare keeps the current exercise');
 }
 const legacy=await mount('#compute/'+tool+'?'+new URLSearchParams({preset:lecturePreset,material}));
 assert.equal(legacy.ctl('preset').value,lecturePreset);
 assert.equal(legacy.page.querySelectorAll('[data-course-flow-stage]').length,0);
 await legacy.submit();
 assert.deepEqual(runs.at(-1),fixtures[family].requests[lecturePreset]);
}
assert.equal(runs.length,29);
assert.equal(predictions.length,14);
if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',['-B','scripts/test-python-principles-construction-exercise-stages.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(predictions),encoding:'utf8'
 });
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--requests'))process.stdout.write(JSON.stringify(predictions)+'\n');
else console.log((english?'English':'Chinese')+' classroom: five legacy lecture routes, five legacy direct-tool routes, 14 stage requests, five valid drafts and five blank-field guards.');
