import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container} from './test-material-research-ui.mjs';

const english=process.argv.includes('--english');
const prefix=english?'../dist/en/':'../dist/';
const {renderAdvancedView,selectAdvancedTool,validateAdvancedPreset,getAdvancedResult}=
 await import(prefix+'advanced-ui.js?shared-examples');
const cases=[
 ['carat_integral','noncyclic-affine','integral-affine-noncyclic-6d.json'],
 ['integral_normalizer','glued6','normalizer-glued6.json'],
 ['arithmetic_centralizer','a5','centralizer-a5.json'],
 ['symbolic_spacegroups','magnetic','symbolic-sg-magnetic.json']
];
const readExample=filename=>JSON.parse(fs.readFileSync(new URL(prefix+'examples/'+filename,import.meta.url),'utf8'));
const response=payload=>({ok:true,json:async()=>payload});
const loadedMessage=english?/This example is loaded/:/已载入此示例/;
const draftMessage=english?/Loading replaces the current JSON/:/载入会替换当前 JSON/;

for(const [tool,id] of cases)assert.ok(validateAdvancedPreset(tool,id));
assert.ok(validateAdvancedPreset('carat_integral','involution'));
for(const [tool,id] of [
 ['integral_normalizer','a5'],['unknown','magnetic'],['symbolic_spacegroups','../magnetic'],
 ['symbolic_spacegroups','magnetic.json'],['symbolic_spacegroups','%6dagnetic'],
 ['constructor','magnetic'],['symbolic_spacegroups',null]
])assert.equal(validateAdvancedPreset(tool,id),false);

const container=new Container();
container.dataset={researchView:'advanced'};
const changes=[],loads=[],runs=[],downloads=[],toasts=[];
let current=true,resolveResult=null;
globalThis.fetch=(url,{signal})=>new Promise(resolve=>loads.push({url,signal,resolve}));
const $=id=>container.querySelector('#'+id);
const text=id=>$(id).textContent;
function enter(tool,id=null){
 assert.ok(selectAdvancedTool(tool));
 return renderAdvancedView({
  container,
  isCurrent:()=>current,
  sharedPreset:id===null?null:{tool,id},
  onToolChange:(...args)=>changes.push(args),
  toast:message=>toasts.push(message),
  download:(...args)=>downloads.push(args),
  run:(tool,payload)=>{
   runs.push({tool,payload:structuredClone(payload)});
   return new Promise(resolve=>{resolveResult=resolve;});
  }
 });
}
function edit(payload){
 const element=$('exact-input');
 element.value=JSON.stringify(payload);
 element.oninput({target:element});
}
const formInput=()=>JSON.parse($('exact-input').value);
function loadLinked(){
 assert.ok($('exact-load-shared'));
 return $('exact-load-shared').onclick();
}
function checkURL(url,filename){
 assert.equal(url,'examples/'+filename+'?v=20261120-advanced1');
}

for(const [tool,id,filename] of cases){
 enter(tool);
 const existing={userDraft:tool,keepTheseParameters:true};
 edit(existing);
 const numberOfLoads=loads.length,numberOfRuns=runs.length;
 enter(tool,id);
 assert.deepEqual(changes.at(-1),[tool,id]);
 assert.equal(loads.length,numberOfLoads,'A shared route only offers an example before an explicit load');
 assert.deepEqual(formInput(),existing);
 assert.match(text('exact-shared-status'),draftMessage);
 const pending=loadLinked();
 const request=loads.at(-1);
 checkURL(request.url,filename);
 assert.ok(request.signal instanceof AbortSignal);
 assert.ok($('exact-run').disabled&&$('exact-load').disabled&&$('exact-load-shared').disabled);
 assert.deepEqual(formInput(),existing);
 await $('exact-run').onclick();
 assert.equal(runs.length,numberOfRuns);
 const expected=readExample(filename);
 request.resolve(response(expected));
 await pending;
 assert.deepEqual(formInput(),expected);
 assert.equal($('exact-example').value,id);
 assert.equal($('exact-run').disabled,false);
 assert.match(text('exact-shared-status'),loadedMessage);
 assert.equal(runs.length,numberOfRuns,'Loading a linked example never starts Python');
 const manualRun=$('exact-run').onclick();
 assert.deepEqual(runs.at(-1),{tool,payload:expected});
 const result={expression:'explicitly run'};
 resolveResult(result);
 await manualRun;
 assert.deepEqual(getAdvancedResult(),result);
 $('exact-json').onclick();
 assert.deepEqual(JSON.parse(downloads.at(-1)[0]),result);
 assert.match(downloads.at(-1)[1],new RegExp('^'+tool));
 const draft={...expected,fixtureIsNowUserEdited:true};
 edit(draft);
 assert.match(text('exact-shared-status'),draftMessage);
 assert.deepEqual(changes.at(-1),[tool,id],'The link continues to offer its original example after editing a draft');
 assert.deepEqual(formInput(),draft);
}
if(english)assert.doesNotMatch(container.innerHTML,/[\u3400-\u9fff]/u);

enter('carat_integral','noncyclic-affine');
const saved={typed:'retain after aborted and unsuccessful loads'};
edit(saved);
const canceled=loadLinked(),canceledRead=loads.at(-1);
const cancel=$('exact-cancel-load').onclick;
cancel();
assert.ok(canceledRead.signal.aborted);
assert.deepEqual(formInput(),saved);
canceledRead.resolve(response({unexpected:'stale'}));
await canceled;
assert.deepEqual(formInput(),saved);
assert.equal($('exact-run').disabled,false);

const failed=loadLinked();
loads.at(-1).resolve({ok:false,status:503});
await failed;
assert.match(container.querySelector('[role="alert"]').textContent,english?/sample loading failed/i:/示例加载失败/);
assert.deepEqual(formInput(),saved);
assert.equal($('exact-run').disabled,false);
const malformed=loadLinked();
loads.at(-1).resolve(response(['not a record']));
await malformed;
assert.match(container.querySelector('[role="alert"]').textContent,english?/JSON object/:/JSON 对象/);
assert.deepEqual(formInput(),saved);
assert.equal(toasts.length,2);

const oldLoad=loadLinked(),oldRead=loads.at(-1);
enter('carat_integral','noncyclic');
assert.equal(oldRead.signal.aborted,true,'Another link for the same tool owns a new view');
assert.deepEqual(changes.at(-1),['carat_integral','noncyclic']);
assert.deepEqual(formInput(),saved);
oldRead.resolve(response({stale:'same-tool route switch'}));
await oldLoad;
assert.deepEqual(formInput(),saved);

const ordinary=$('exact-example');
ordinary.value='involution';
ordinary.onchange({target:ordinary});
const beforeOrdinaryRunCount=runs.length;
await $('exact-load').onclick();
assert.deepEqual(changes.at(-1),['carat_integral',null]);
assert.equal($('exact-shared-preset'),null);
assert.equal(formInput().action,'affine_classes');
assert.equal(runs.length,beforeOrdinaryRunCount);

const staleRun=$('exact-run').onclick();
const settleOldRun=resolveResult;
const dispose=enter('carat_integral','noncyclic-affine');
edit(saved);
const currentRun=$('exact-run').onclick(),settleCurrentRun=resolveResult;
settleOldRun({expression:'stale calculation'});
await staleRun;
assert.equal(getAdvancedResult(),null);
assert.equal($('exact-run').disabled,true,'Old run cannot release the newer run lock');
settleCurrentRun({expression:'current calculation'});
await currentRun;
assert.deepEqual(getAdvancedResult(),{expression:'current calculation'});

const pendingLeave=loadLinked(),readAtLeave=loads.at(-1);
current=false;
dispose();
assert.equal(readAtLeave.signal.aborted,true);
container.innerHTML='<p>Another page</p>';
readAtLeave.resolve(response({stale:'left page'}));
await pendingLeave;
assert.equal(container.innerHTML,'<p>Another page</p>');

current=true;
enter('carat_integral','noncyclic-affine');
assert.deepEqual(formInput(),saved);
const tabLoad=loadLinked(),tabRead=loads.at(-1);
container.querySelectorAll('[data-exact-tool]').find(button=>button.dataset.exactTool==='integral_normalizer').onclick();
assert.deepEqual(changes.at(-1),['integral_normalizer',null]);
assert.equal(tabRead.signal.aborted,true);
assert.equal($('exact-shared-preset'),null);
tabRead.resolve(response({stale:'other tool'}));
await tabLoad;
assert.notDeepEqual(formInput(),{stale:'other tool'});
enter('symbolic_spacegroups','unknown');
assert.deepEqual(changes.at(-1),['symbolic_spacegroups',null]);
assert.equal($('exact-shared-preset'),null);

console.log('Advanced shared presets ('+(english?'English':'Chinese')+
 '): four real inputs, manual load and Run, draft isolation, retries, abort, stale result and plain handoff passed.');
