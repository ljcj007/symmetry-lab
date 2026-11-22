import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const edition=new URL(english?'../dist/en/':'../dist/',import.meta.url);
const {renderSymmetryCourseView}=await import(new URL('symmetry-course-ui.js',edition));
const {parseClassroomRoute}=await import(new URL('classroom-ui.js',edition));
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL(String(url).split('?')[0],edition),'utf8'))});
Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};

const lecture='#classroom/crystal?track=space&tab=learn&lesson=space-02';
const halfX=['1/2',0,0],halfZ=[0,0,'1/2'];
const rotation=[[-1,0,0],[0,-1,0],[0,0,1]],identity=[[1,0,0],[0,1,0],[0,0,1]];
const A={rotation,translation:[0,0,0]},B=translation=>({rotation:identity,translation});
const container=new Container(),calls=[],moves=[];
let delay=false,finish,cancellations=0;
const $=selector=>container.querySelector(selector);
function run(action,input){
 calls.push({action,input:structuredClone(input)});
 assert.equal(action,'symbolic_interfaces');
 const [first,second]=input.operations;
 const reverse=first.rotation[0][0]===1;
 const alongX=(reverse?first:second).translation[0]==='1/2';
 const phase=alongX&&input.k[0]==='1/2'?(reverse?'-I':'I'):'1';
 const response={action:'seitz',operation:'multiply',verified:true,antiunitary:false,rotation:rotation.map(row=>row.map(String)),
  translation:alongX?[reverse?'1/2':'-1/2','0','0']:['0','0','1/2'],translation_phase:{expression:phase}};
 if(!delay)return Promise.resolve(response);
 const pending=new Promise(resolve=>{finish=()=>resolve(response);});
 Object.defineProperty(pending,'cancel',{value:()=>{cancellations++;return true;}});
 return pending;
}

await renderSymmetryCourseView({container,selection:parseClassroomRoute(lecture),run,onNavigate:patch=>moves.push(patch)});
assert.equal(calls.length,0);
const panel=$('#sc-seitz-pair');
assert.ok(panel);
assert.match(panel.querySelector('summary').textContent,english?/Swap the order/:/交换旋转和平移的次序/);
assert.ok($('a[href="#classroom/crystal?tab=learn&amp;lesson=space-01&amp;track=space"]'),'The catalogue comparison remains separate');
const form=$('#sc-seitz-pair-form');
const change=(id,value)=>{
 const control=$('#sc-seitz-pair-'+id);
 control.value=value;
 control.onchange();
};
const submit=()=>form.onsubmit({preventDefault(){}});

async function solve(label,axis,k,guess,translation,folded,cells,phases,difference){
 const start=calls.length;
 change('axis',axis);
 change('k',k);
 change('prediction',guess);
 assert.equal(calls.length,start,'Changing a condition never calculates');
 assert.equal($('[data-seitz-pair-product]'),null);
 await submit();
 assert.equal(calls.length,start+2);
 const B0=B(axis==='x'?halfX:halfZ);
 assert.deepEqual(calls.slice(start),[[A,B0],[B0,A]].map(operations=>({
  action:'symbolic_interfaces',input:{action:'seitz',operation:'multiply',operations,k:[k,0,0]}
 })));
 for(const [i,product] of ['AB','BA'].entries()){
  const row=$(`[data-seitz-pair-product="${product}"]`);
  assert.equal(row.querySelector('[data-pair-translation]').dataset.pairTranslation,translation[i]);
  assert.equal(row.querySelector('[data-pair-folded]').dataset.pairFolded,folded);
  assert.equal(row.querySelector('[data-pair-cell]').dataset.pairCell,cells[i]);
  assert.equal(row.querySelector('[data-pair-phase]').dataset.pairPhase,phases[i]);
 }
 assert.equal($('[data-pair-difference]').dataset.pairDifference,difference);
 return {label,requests:calls.slice(start)};
}

const captured=[];
captured.push(await solve('transverse-gamma','x','0','same',['-1/2,0,0','1/2,0,0'],'1/2,0,0',['-1,0,0','0,0,0'],['1','1'],'1,0,0'));
assert.match($('#sc-seitz-pair-result').textContent,english?/before folding again/:/再比较折回之前/);
captured.push(await solve('transverse-half','x','1/2','different',['-1/2,0,0','1/2,0,0'],'1/2,0,0',['-1,0,0','0,0,0'],['i','-i'],'1,0,0'));
assert.match($('#sc-seitz-pair-result').textContent,english?/prediction matches/:/预测与结果一致/);
captured.push(await solve('parallel-half','z','1/2','same',['0,0,1/2','0,0,1/2'],'0,0,1/2',['0,0,0','0,0,0'],['1','1'],'0,0,0'));

await $('#sc-seitz-pair-derive').onclick();
assert.equal($('#sc-derive-select').value,'space-seitz-pair-folding');
assert.equal(moves.at(-1).lesson,'space-02');
assert.equal(moves.at(-1).exercise,'space-seitz-pair-folding');
assert.equal(moves.at(-1).tab,'derive');
assert.equal($('#sc-derive-lab'),null,'The lesson uses the exact product panel instead of a one-operation preset');
const option=container.querySelector('[data-sc-exercise="space-si-compose"]');
assert.ok(option,'The previous Si exercise remains in the bank');
assert.equal($('#sc-derive-answer').disabled,true);
for(let step=0;step<4;step++)$('#sc-derive-next').onclick();
assert.equal($('#sc-derive-answer').disabled,false);
$('#sc-derive-answer').onclick();
assert.match($('#sc-derive-conclusion').textContent,/\(1,0,0\)/);
assert.equal(calls.length,6,'Studying the derivation does not rerun the calculator');

await $('#sc-return-lesson').onclick();
await $('#sc-chapter-derive').onclick();
assert.equal($('#sc-derive-select').value,'space-seitz-pair-folding','The normal lesson continuation selects the exact example');
await $('#sc-return-lesson').onclick();
delay=true;
const pending=$('#sc-seitz-pair-form').onsubmit({preventDefault(){}});
assert.equal(calls.length,7);
await $('#sc-next-lesson').onclick();
assert.equal($('#sc-seitz-pair'),null);
assert.equal(cancellations,1);
finish();await pending;await flush();
assert.equal(calls.length,7,'The detached comparison never requests its second product');
assert.equal($('[data-seitz-pair-product]'),null);
assert.equal(moves.at(-1).lesson,'space-03');

if(process.argv.includes('--python')){
 const replay=spawnSync(process.env.SYMMETRY_LAB_PYTHON||'python',['-B','scripts/test-python-seitz-pair-practice.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(captured),encoding:'utf8'
 });
 assert.equal(replay.status,0,replay.error?.message||replay.stderr);
 process.stderr.write(replay.stdout);
}
if(process.argv.includes('--emit-requests'))console.log(JSON.stringify(captured));
else console.log(`Space-02 Seitz orders (${english?'English':'Chinese'}): exact named requests, both placements, phase comparison, derivation and detached calculation passed.`);
