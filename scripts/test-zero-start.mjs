import assert from 'node:assert/strict';
import {Container} from './test-material-research-ui.mjs';
import {ZERO_START_KEY,ZERO_START_STEPS,rotateQuarter,cartesianQuarterMatrix,matrixTrace,zeroStartExpectedAnswer,normalizeZeroStartProgress,updateZeroStartProgress,renderZeroStart,getZeroStartResult} from '../dist/zero-start.js';

const steps=ZERO_START_STEPS.map(step=>step.id);
assert.deepEqual(steps,['objects','repeat','coordinates','matrix','trace','next']);
for(const point of [[1,0],[2,-1],[0,0],[1,0,1],[0,0,1]]){
 assert.deepEqual(rotateQuarter(point,4),point);
 assert.deepEqual(rotateQuarter(rotateQuarter(point,1),-1),point);
 const image=rotateQuarter(point);
 assert.equal(image.reduce((s,x)=>s+x*x,0),point.reduce((s,x)=>s+x*x,0));
}
assert.deepEqual(rotateQuarter([2,-1]),[1,2]);
assert.deepEqual(rotateQuarter([0,0,1]),[0,0,1]);
for(const [point,turns] of [[[Infinity,0],1],[[1],1],[[1,0],.5],[[1,0,2,3],1]])assert.throws(()=>rotateQuarter(point,turns));
const multiply=(matrix,point)=>matrix.map(row=>row.reduce((sum,x,i)=>sum+x*point[i],0));
for(const space of ['xy','xyz']){
 const matrix=cartesianQuarterMatrix(space),dimension=matrix.length;
 for(let i=0;i<dimension;i++){const seed=Array.from({length:dimension},(_,j)=>i===j?1:0);assert.deepEqual(multiply(matrix,seed).map(x=>Object.is(x,-0)?0:x),rotateQuarter(seed));}
 assert.equal(matrixTrace(matrix),space==='xy'?0:1);
}
assert.notDeepEqual(cartesianQuarterMatrix('xy'),[[0,0],[0,0]],'Zero trace must not be conflated with zero action');
for(const marked of [false,true])for(const turns of [1,2,3,4])assert.equal(zeroStartExpectedAnswer('objects',{marked,turns}),marked&&turns!==4?'changed':'same');
assert.equal(zeroStartExpectedAnswer('repeat',{point:'axis',turns:1}),'4,1');
assert.equal(zeroStartExpectedAnswer('repeat',{point:'general',turns:1}),'4,4');
for(const [step,context] of [['objects',{marked:false,turns:0}],['matrix',{shown:'x'}],['coordinates',{x:99,y:0,applied:true}],['trace',{space:'xy',applied:false}],['next',{goal:'unknown'}]])assert.equal(zeroStartExpectedAnswer(step,context),null);

let record={version:1,answers:{}};
const valid={objects:{marked:true,turns:1},repeat:{point:'axis',turns:1},coordinates:{x:2,y:-1,applied:true},matrix:{shown:'both'},trace:{space:'xy',applied:true},next:{goal:'tools'}};
for(const step of steps)record=updateZeroStartProgress(record,step,valid[step],zeroStartExpectedAnswer(step,valid[step]));
assert.equal(Object.keys(record.answers).length,6);
assert.deepEqual(normalizeZeroStartProgress(JSON.stringify(record)),record);
const changed=updateZeroStartProgress(record,'trace',valid.trace,'1');
assert.equal(Object.keys(changed.answers).length,5);
assert.ok(!changed.answers.trace,'A wrong answer removes an earlier completion');
assert.ok(record.answers.trace,'Record updates must not mutate earlier exports');
for(const invalid of ['{broken',null,[],{version:2,answers:record.answers},{version:1,answers:{trace:{choice:'0',context:{space:'xyz',applied:true}}}},{version:1,answers:{trace:true}},{version:1,answers:{trace:{choice:'0',context:{space:'xy',applied:true,checked:true}}}}])assert.deepEqual(normalizeZeroStartProgress(invalid),{version:1,answers:{}});
const unknown=structuredClone(record);unknown.answers.unknown={choice:'whatever',context:{}};assert.deepEqual(normalizeZeroStartProgress(unknown),record);

const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const mount=(selection={})=>{const container=new Container(),routes=[],downloads=[];renderZeroStart({container,selection,onNavigate:r=>routes.push(r),download:(body,name,type)=>downloads.push({body,name,type})});return {container,$:s=>container.querySelector(s),routes,downloads};};
const choose=(view,id,value)=>{const input=view.$('#'+id);input.value=value;input.onchange({target:input});};
const check=(view,value)=>{choose(view,'zs-answer',value);view.$('#zs-check').onclick();};
let view=mount();
assert.match(view.container.firstElementChild.innerHTML,/无需先学矩阵/);
assert.equal(getZeroStartResult().checkedSteps.length,0);
check(view,'same');assert.equal(getZeroStartResult().checkedSteps.length,0,'An unperformed observation cannot be marked checked');
view.$('#zs-action').onclick();check(view,'same');assert.deepEqual(getZeroStartResult().checkedSteps,['objects']);
choose(view,'zs-marked','different');assert.deepEqual(getZeroStartResult().checkedSteps,[],'Changing the object clears the old checked answer');
view.$('#zs-action').onclick();check(view,'changed');assert.deepEqual(getZeroStartResult().checkedSteps,['objects']);
view.$('#zs-next').onclick();assert.deepEqual(view.routes.at(-1),{lesson:'repeat'});
choose(view,'zs-point','axis');view.$('#zs-action').onclick();check(view,'4,1');
assert.equal(getZeroStartResult().checkedSteps.length,2);
check(view,'1,1');assert.equal(getZeroStartResult().checkedSteps.length,1);
assert.match(view.$('#zs-feedback').textContent,/仍是 4/);
view=mount({lesson:'repeat'});assert.deepEqual(getZeroStartResult().checkedSteps,['objects'],'Refreshing restores validated records only');
choose(view,'zs-point','axis');view.$('#zs-action').onclick();check(view,'4,1');
view=mount({lesson:'coordinates'});choose(view,'zs-x','2');choose(view,'zs-y','-1');view.$('#zs-action').onclick();check(view,'ccw');assert.ok(getZeroStartResult().checkedSteps.includes('coordinates'));
choose(view,'zs-y','1');assert.ok(!getZeroStartResult().checkedSteps.includes('coordinates'));
view.$('#zs-action').onclick();check(view,'ccw');
view=mount({lesson:'matrix'});check(view,'correct');assert.ok(!getZeroStartResult().checkedSteps.includes('matrix'));
choose(view,'zs-basis','both');check(view,'correct');assert.ok(getZeroStartResult().checkedSteps.includes('matrix'));
view=mount({lesson:'trace'});view.$('#zs-action').onclick();check(view,'0');assert.ok(getZeroStartResult().checkedSteps.includes('trace'));
choose(view,'zs-space','xyz');assert.ok(!getZeroStartResult().checkedSteps.includes('trace'));view.$('#zs-action').onclick();check(view,'1');
view=mount({lesson:'next'});choose(view,'zs-goal','tools');check(view,'compute');assert.equal(getZeroStartResult().checkedSteps.length,6);
assert.match(view.container.firstElementChild.innerHTML,/#classroom\/foundations\?module=theorems/);
view.$('#zs-export').onclick();const exported=JSON.parse(view.downloads[0].body);assert.equal(exported.schemaVersion,1);assert.equal(exported.checkedSteps.length,6);assert.deepEqual(exported.answers,getZeroStartResult().answers);assert.match(exported.note,/not a grade/);
assert.equal(view.downloads[0].type,'application/json');
// Unvalidated writes and unrelated course progress must not be inherited or erased.
storage.set('symmetry-lab.pointgroups.progress.v1','retained');view.$('#zs-clear').onclick();assert.equal(getZeroStartResult().checkedSteps.length,0);assert.equal(storage.get('symmetry-lab.pointgroups.progress.v1'),'retained');
storage.set(ZERO_START_KEY,JSON.stringify({version:1,answers:{trace:{choice:'0',context:{space:'xyz',applied:true}},next:{choice:'<script>',context:{goal:'tools'}}}}));
view=mount({lesson:'<script>'});assert.equal(getZeroStartResult().checkedSteps.length,0);assert.match(view.$('#zs-heading').textContent,/先动手/);assert.ok(!view.container.firstElementChild.innerHTML.includes('href="<script>'));
// Blocked browser storage retains this session's work without breaking the UI.
globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
view=mount();view.$('#zs-action').onclick();check(view,'same');assert.deepEqual(getZeroStartResult().checkedSteps,['objects']);
view=mount();assert.deepEqual(getZeroStartResult().checkedSteps,['objects']);
const stale=view.$('#zs-action');view.container.innerHTML='<p>Another page</p>';stale.onclick();assert.equal(view.container.innerHTML,'<p>Another page</p>');
console.log('Zero-start: exact actions, traces, whole-object checks, six-step validation, persistence, revocation, export, storage fallback, and stale-view safety passed.');
