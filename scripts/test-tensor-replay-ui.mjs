import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Container,Element,flush} from './test-material-research-ui.mjs';

// The parser keeps its arrays; actual production handlers receive browser-like
// iterable NodeLists that deliberately have no Array.find/map/filter methods.
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...descriptor,set(value){parsing++;try{descriptor.set.call(this,value);}finally{parsing--;}}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const rows=queryAll.call(this,selector);if(parsing)return rows;return Object.assign({length:rows.length,forEach:fn=>rows.forEach(fn),[Symbol.iterator]:function*(){yield* rows;}},Object.fromEntries(rows.map((row,i)=>[i,row])));};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let storageReads=0,storageWrites=0;
globalThis.localStorage={getItem:()=>{storageReads++;return null;},setItem:()=>{storageWrites++;}};
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/material-observables.json',import.meta.url),'utf8'));
globalThis.fetch=async url=>{assert.match(String(url),/data\/material-observables\.json/);return {ok:true,json:async()=>structuredClone(catalog)};};
const refs=JSON.parse(fs.readFileSync(new URL('./fixtures/tensor-replay.json',import.meta.url),'utf8'));
for(const [name,expected]of Object.entries(refs.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),expected,'Regenerate real Python tensor references after changing '+name);
const byId=new Map(refs.cases.map(item=>[item.id,item]));
const {tensorReplayTeachingInputs,tensorReplayTeachingRequest,tensorReplayModel,tensorReplayResultHTML,bindTensorReplayResult,tensorReplayLessonHTML,bindTensorReplayLesson,parseTensorSeed}=await import('../dist/tensor-replay-ui.js');
const {renderObservablesView,getObservablesResult}=await import('../dist/observables-ui.js');
const clone=value=>structuredClone(value);
const safe=html=>assert.doesNotMatch(html,/katex-error|(?:^|[>\s])(?:NaN|Infinity|undefined)(?:[<\s]|$)/);

assert.equal(refs.schema,'symmetry-lab-tensor-replay-references-1');
assert.equal(refs.cases.length,12);
assert.equal(tensorReplayTeachingInputs().length,7);
for(const input of tensorReplayTeachingInputs()){
 const captured=byId.get(input.id);assert.ok(captured);assert.equal(input.input.replay,true);
 assert.equal(input.input.tensor,captured.input.tensor);assert.deepEqual(input.input.generators,captured.input.generators);
 assert.deepEqual(input.input.field,[1,0,0]);assert.deepEqual(input.input.parameters,{});
 const request=tensorReplayTeachingRequest(input.id);request.parameters.a1=99;
 assert.deepEqual(tensorReplayTeachingRequest(input.id).parameters,{},'Each explicit copy starts from a fresh complete input');
 assert.equal(captured.result.independent_count,input.count);
}
assert.throws(()=>tensorReplayTeachingRequest('unknown'));
assert.deepEqual(parseTensorSeed('[1/2, -2e-3, 3]',3),[.5,-.002,3]);
for(const text of ['1/0,2,3','sqrt(2),2,3','1,2','1,2,Infinity','1,2,1/2/3','1,2,globalThis.x=1','1,2,1e999'])assert.throws(()=>parseTensorSeed(text,3));

function replayView(result,{store=new Map(),key='same',active=()=>true}={}){
 const container=new Container();container.innerHTML=tensorReplayResultHTML(result);
 const cleanup=bindTensorReplayResult({root:container.firstElementChild,result,isCurrent:active,stateStore:store,stateKey:key});
 return {container,cleanup,$:s=>container.querySelector(s),store};
}
const click=(view,id)=>view.$('#'+id).onclick();
const choose=(view,id,value)=>{const control=view.$('#'+id);control.value=String(value);control.onchange();};
const input=(view,id,value)=>{const control=view.$('#'+id);control.value=value;control.oninput();};
const reveal=view=>{for(let j=0;j<3;j++)click(view,'tr-step');};

for(const reference of refs.cases){
 const model=tensorReplayModel(reference.result),sourceResult=clone(reference.result),sourceSnapshot=JSON.stringify(sourceResult),view=replayView(sourceResult);
 if(!reference.result.replay.available){assert.equal(model.status,'unavailable');assert.match(view.container.innerHTML,/本次回放范围/);assert.equal(view.$('#tr-operation'),null);continue;}
 assert.equal(model.status,'available',reference.id);assert.equal(Array.isArray(view.$('[data-tr-result-body]').querySelectorAll('select')),false);
 reveal(view);assert.equal(view.$('#tr-stage-status').textContent,'第 4 / 4 步');
 assert.match(view.$('#tr-ledger').innerHTML,/D\(g\)−I/);assert.match(view.$('#tr-ledger').innerHTML,/RREF/);
 const n=model.dimension;
 choose(view,'tr-operation','group:'+(model.replay.finiteGroup.order-1));choose(view,'tr-column',n-1);choose(view,'tr-row',model.replay.constraints.shape[0]-1);
 safe(view.$('#tr-ledger').innerHTML);safe(view.$('#tr-average-output').innerHTML);safe(view.$('#tr-seed-output').innerHTML);
 click(view,'tr-average-first');assert.equal(view.$('#tr-average').value,'1');
 assert.match(view.$('#tr-average-output').innerHTML,/部分平均|完整有限群平均/);
 if(model.replay.finiteGroup.order>1){click(view,'tr-average-next');assert.equal(view.$('#tr-average').value,'2');}
 input(view,'tr-average','');assert.match(view.$('#tr-average-output').innerHTML,/须为范围内的整数/);
 input(view,'tr-average',String(model.replay.finiteGroup.order));
 input(view,'tr-seed','1,2');assert.match(view.$('#tr-seed-output').innerHTML,/种子分量数/);
 click(view,'tr-seed-zero');assert.match(view.$('#tr-seed-output').innerHTML,/零种子：投影严格为零/);
 choose(view,'tr-prediction','nonzero');click(view,'tr-check');assert.match(view.$('#tr-seed-output').innerHTML,/修改解释/);
 choose(view,'tr-prediction','zero');click(view,'tr-check');assert.match(view.$('#tr-seed-output').innerHTML,/预测与当前数值判断相容/);
 click(view,'tr-seed-rational');assert.match(view.$('#tr-seed').value,/1\/2/);safe(view.$('#tr-seed-output').innerHTML);
 if(reference.id==='tilted-c2-dielectric')assert.match(view.$('#tr-average-output').innerHTML,/max \|Pᵀ−P\| ≈ 0\.[1-9]/,'Tilted C2 visibly provides a non-Euclidean-symmetry counterexample');
 assert.equal(JSON.stringify(sourceResult),sourceSnapshot,'Replay controls never mutate the supplied exact/numeric result');view.cleanup();
}
// Numerical zero tests use seed-relative machine precision, not an absolute
// floor. The identity keeps arbitrarily small representable components, and
// changing scale preserves the same resolved/nonresolved classification.
const identitySeed=replayView(clone(byId.get('antiinversion-magnetoelectric').result));reveal(identitySeed);
for(const value of [1e-12,1e-20,1,1e6,-1e-20]){
 input(identitySeed,'tr-seed',[value,...Array(8).fill(0)].join(', '));
 assert.equal(identitySeed.$('[data-tr-seed-status]').getAttribute('data-tr-seed-status'),'resolved-nonzero');
 choose(identitySeed,'tr-prediction','zero');click(identitySeed,'tr-check');assert.doesNotMatch(identitySeed.$('#tr-seed-output').innerHTML,/预测与当前数值判断相容/);
 if(value===1e-20)assert.ok(identitySeed.$('#tr-seed-output').innerHTML.includes('1\\times10^{-20}'),'A small nonzero component is rendered in scientific notation, not as zero');
}
identitySeed.cleanup();
const kernelView=replayView(clone(byId.get('tilted-c2-dielectric').result));reveal(kernelView);
// T = n v^T+v n^T with n=(1,2,2), v=(2,-1,0), n.v=0.
const trueKernel=[4,3,4,-4,-2,0],withAllowed=trueKernel.map((x,i)=>x+([0,3,5].includes(i)?.01:0));
for(const scale of [1,1e-12,1e-20,1e6]){
 input(kernelView,'tr-seed',trueKernel.map(x=>x*scale).join(', '));assert.equal(kernelView.$('[data-tr-seed-status]').getAttribute('data-tr-seed-status'),'compatible-zero');assert.match(kernelView.$('#tr-seed-output').innerHTML,/不是精确零的证明/);
 input(kernelView,'tr-seed',withAllowed.map(x=>x*scale).join(', '));assert.equal(kernelView.$('[data-tr-seed-status]').getAttribute('data-tr-seed-status'),'resolved-nonzero');
}
kernelView.cleanup();
// Invalid average count text is an unfinished draft, including an empty one.
for(const raw of ['', '0', '1.5', '99', 'abc']){
 const store=new Map();let draft=replayView(clone(byId.get('c4-dielectric').result),{store});reveal(draft);input(draft,'tr-average',raw);assert.match(draft.$('#tr-average-output').innerHTML,/须为范围内的整数/);draft.cleanup();
 draft=replayView(clone(byId.get('c4-dielectric').result),{store});assert.equal(draft.$('#tr-average').value,raw);assert.match(draft.$('#tr-average-output').innerHTML,/须为范围内的整数/);assert.equal(draft.$('#tr-average-next').disabled,true);
 input(draft,'tr-average','2');assert.match(draft.$('#tr-average-output').innerHTML,/已纳入 2/);draft.cleanup();
}
const old=clone(byId.get('c4-dielectric').result);delete old.replay;
assert.equal(tensorReplayModel(old).status,'absent');assert.match(tensorReplayResultHTML(old),/旧结果继续显示/);
const invalid=clone(byId.get('c4-dielectric').result);invalid.replay.projectorNumeric[0][0]='1/2';
assert.equal(tensorReplayModel(invalid).status,'invalid');assert.match(tensorReplayResultHTML(invalid),/格式暂不支持/);
assert.equal(tensorReplayLessonHTML('mechanical-modes'),'');

// Save unfinished seed/prediction/notes and actual native detail state across
// ordinary remounts. A different result owner starts a fresh replay.
const stateStore=new Map(),c4=clone(byId.get('c4-dielectric').result);
let view=replayView(c4,{store:stateStore});reveal(view);
choose(view,'tr-column',3);input(view,'tr-average','3');input(view,'tr-seed','[1/2,');input(view,'tr-note','Keep my unfinished derivation');choose(view,'tr-prediction','nonzero');
view.$('#tr-metric').open=true;view.$('#tr-metric').ontoggle();view.$('#tr-checks').open=true;view.$('#tr-checks').ontoggle();const retiredStep=view.$('#tr-step').onclick;view.cleanup();
view=replayView(c4,{store:stateStore});assert.equal(view.$('#tr-column').value,'3');assert.equal(view.$('#tr-average').value,'3');assert.equal(view.$('#tr-seed').value,'[1/2,');assert.equal(view.$('#tr-note').value,'Keep my unfinished derivation');assert.equal(view.$('#tr-prediction').value,'nonzero');assert.equal(view.$('#tr-metric').open,true);assert.equal(view.$('#tr-checks').open,true);assert.equal(view.$('#tr-stage-status').textContent,'第 4 / 4 步');
retiredStep();assert.equal(view.$('#tr-stage-status').textContent,'第 4 / 4 步');view.cleanup();
const fresh=replayView(c4,{store:stateStore,key:'new-result'});assert.equal(fresh.$('#tr-stage-status').textContent,'第 1 / 4 步');fresh.cleanup();

const calls=[];
const runner=async(action,payload)=>{
 assert.equal(action,'tensors');calls.push({action,input:clone(payload)});
 const matched=refs.cases.find(item=>item.input.tensor===payload.tensor&&item.input.preset===payload.preset&&JSON.stringify(item.input.generators||[])===JSON.stringify(payload.generators||[]));
 assert.ok(matched,'Use an actual captured tensor result for the complete selected representation');
 const result=clone(matched.result);if(payload.replay!==true)delete result.replay;return result;
};
const mount=async(selection={},run=runner)=>{const container=new Container(),navigations=[],downloads=[],cancels=[];await renderObservablesView({container,selection,run,onNavigate:x=>navigations.push(x),download:(body,name)=>downloads.push({body,name}),cancelRun:()=>cancels.push(true)});return {container,navigations,downloads,cancels,$:s=>container.querySelector(s)};};
const submit=async v=>{await v.$('#obs-form').onsubmit({preventDefault(){}});await flush();};
const edit=(v,id,value)=>{const node=v.$('#'+id);node.value=value;v.$('#obs-form').oninput({target:node});};
const tab=(v,value)=>v.$('[data-obs-tab="'+value+'"]').onclick();

// Direct experts keep the optional payload and all mastery I/O off by default.
const beforeReads=storageReads,direct=await mount({calculationOnly:true,experiment:'tensors',material:'silicon'});
assert.equal(storageReads,beforeReads);assert.equal(calls.length,0);assert.equal(direct.$('#obs-tensor-replay').checked,false);
const directKind=direct.$('#obs-tensor');directKind.value='dielectric';direct.$('#obs-form').oninput({target:directKind});
await submit(direct);assert.equal(Object.hasOwn(calls.at(-1).input,'replay'),false);assert.equal(direct.$('[data-tr-result-body]'),null);
const replayToggle=direct.$('#obs-tensor-replay');replayToggle.checked=true;direct.$('#obs-form').oninput({target:replayToggle});await submit(direct);
assert.equal(calls.at(-1).input.replay,true);assert.ok(direct.$('[data-tr-result-body]'));
assert.equal(storageReads,beforeReads);assert.equal(storageWrites,0);
direct.$('#obs-download').onclick();assert.equal(JSON.parse(direct.downloads.at(-1).body).result.replay.finiteGroup.order,96);

// Explicit teaching-copy retires the GaAs piezo draft and uses a fresh complete
// reference. The copy itself never starts the Python calculator.
const course=await mount({tab:'learn',lesson:'neumann',material:'gaas'});
course.$('[data-tr-lesson-details]').open=true;course.$('[data-tr-lesson-details]').ontoggle();
course.$('#tr-lesson-case').value='tilted-c2-dielectric';course.$('#tr-lesson-case').onchange();course.$('#tr-lesson-prediction').value='4';course.$('#tr-lesson-prediction').oninput();course.$('#tr-lesson-note').value='Weights on xy, xz and yz';course.$('#tr-lesson-note').oninput();
const beforeCopy=calls.length;course.$('#tr-lesson-copy').onclick();
assert.equal(calls.length,beforeCopy);assert.equal(course.$('#obs-preset').value,'custom');assert.equal(course.$('#obs-tensor').value,'dielectric');assert.equal(course.$('#obs-tensor-replay').checked,true);assert.equal(course.$('#obs-parameters').value,'{}');assert.match(course.$('#obs-output').innerHTML,/手动计算/);
await submit(course);assert.deepEqual(calls.at(-1).input,tensorReplayTeachingRequest('tilted-c2-dielectric'));
reveal(course);input(course,'tr-note','Result note');input(course,'tr-seed','1/2,1,3/2,2,5/2,3');
edit(course,'obs-field','[1,');assert.equal(getObservablesResult(),null);assert.equal(course.$('[data-tr-result-body]'),null,'Editing real inputs retires replay and export immediately');
tab(course,'learn');assert.equal(course.$('#tr-lesson-case').value,'tilted-c2-dielectric');assert.equal(course.$('#tr-lesson-prediction').value,'4');assert.equal(course.$('#tr-lesson-note').value,'Weights on xy, xz and yz');assert.equal(course.$('[data-tr-lesson-details]').open,true);
tab(course,'lab');assert.equal(course.$('#obs-field').value,'[1,');assert.equal(course.$('#obs-tensor-replay').checked,true);assert.match(course.$('#obs-form').querySelector('[role="alert"]').textContent,/原输入已保留/);assert.equal(calls.length,beforeCopy+1);
edit(course,'obs-field','[1,0,0]');await submit(course);reveal(course);input(course,'tr-note','Retain complete result note');input(course,'tr-seed','1/2,1,3/2,2,5/2,3');
input(course,'tr-average','');tab(course,'learn');tab(course,'lab');assert.equal(course.$('#tr-average').value,'');assert.match(course.$('#tr-average-output').innerHTML,/须为范围内的整数/);assert.equal(course.$('#tr-note').value,'Retain complete result note');assert.equal(course.$('#tr-stage-status').textContent,'第 4 / 4 步');assert.equal(course.$('#tr-seed').value,'1/2,1,3/2,2,5/2,3');
const oldExport=course.$('#obs-download').onclick;edit(course,'obs-field','[0,1,0]');assert.equal(course.$('#obs-download'),null);assert.equal(getObservablesResult(),null);const beforeRetiredDownload=course.downloads.length;oldExport();assert.equal(course.downloads.length,beforeRetiredDownload,'Retired download handlers cannot export null or a different result');

// Separate static magnetoelectric lesson uses the nine-dimensional input and
// keeps all old material case fields and original piezo links intact.
const me=await mount({tab:'learn',lesson:'magnetoelectricity'});me.$('#tr-lesson-case').value='antiinversion-magnetoelectric';me.$('#tr-lesson-case').onchange();me.$('#tr-lesson-copy').onclick();await submit(me);assert.equal(getObservablesResult().result.replay.coordinates.dimension,9);assert.equal(getObservablesResult().result.independent_count,9);
const cases=await mount({tab:'cases'});assert.match(cases.$('#obs-content').innerHTML,/教学对照，非材料常数/);assert.match(cases.$('#obs-content').innerHTML,/GaAs/);assert.match(cases.$('#obs-content').innerHTML,/物性张量 →/);

// Old and unsupported results get scope guidance without reconstructed traces.
const unsupported=await mount({calculationOnly:true,experiment:'tensors'},async()=>clone(byId.get('unsupported-piezoelectric').result));await submit(unsupported);assert.equal(unsupported.$('[data-tr-result-body]'),null);assert.match(unsupported.$('#obs-output').innerHTML,/本次回放范围/);

// Every complete teaching input takes the same visible copy -> manual submit path.
for(const preset of tensorReplayTeachingInputs()){
 const item=await mount({tab:'learn',lesson:preset.lesson,material:'gaas'});
 item.$('#tr-lesson-case').value=preset.id;item.$('#tr-lesson-case').onchange();
 const before=calls.length;item.$('#tr-lesson-copy').onclick();assert.equal(calls.length,before);
 await submit(item);assert.deepEqual(calls.at(-1).input,tensorReplayTeachingRequest(preset.id));
 assert.equal(getObservablesResult().result.independent_count,preset.count);
}

// Actual cancellation/owner callbacks: late old completions cannot unlock or
// publish into a newer request, changed lesson, or detached view.
let releaseOld,releaseNew;
const race=await mount({tab:'lab',experiment:'tensors'},()=>new Promise(resolve=>{if(!releaseOld)releaseOld=resolve;else releaseNew=resolve;}));
const pending=race.$('#obs-form').onsubmit({preventDefault(){}});race.$('#obs-cancel').onclick();assert.equal(race.cancels.length,1);assert.equal(getObservablesResult(),null);
const next=race.$('#obs-form').onsubmit({preventDefault(){}});assert.equal(race.$('#obs-fields').disabled,true);releaseOld(clone(byId.get('c4-dielectric').result));await pending;assert.equal(race.$('#obs-fields').disabled,true);assert.equal(getObservablesResult(),null);
releaseNew(clone(byId.get('c4-dielectric').result));await next;assert.ok(getObservablesResult());assert.equal(race.$('#obs-fields').disabled,false);
let releaseTab;const leave=await mount({tab:'lab',experiment:'tensors'},()=>new Promise(resolve=>{releaseTab=resolve;}));const oldPending=leave.$('#obs-form').onsubmit({preventDefault(){}});tab(leave,'learn');assert.equal(leave.cancels.length,1);releaseTab(clone(byId.get('c4-dielectric').result));await oldPending;assert.equal(getObservablesResult(),null);assert.ok(leave.$('#obs-lesson'));

const source=fs.readFileSync(new URL('../dist/tensor-replay-ui.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage/);
const css=fs.readFileSync(new URL('../dist/tensor-replay.css',import.meta.url),'utf8');assert.match(css,/minmax\(0,1fr\)/);assert.match(css,/overflow-x:auto/);assert.match(css,/font-size:18px/);
console.log('Tensor replay UI: 12 genuine API references, seven full manual-copy inputs, exact/mirrored matrix separation, G-metric counterexample, finite partial averages, rational numeric seeds, old/unsupported scope, native NodeLists, draft/result/lesson persistence, explicit cancellation, late-owner isolation and expert mastery-I/O boundaries passed.');
