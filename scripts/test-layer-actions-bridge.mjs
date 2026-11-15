import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Element,Container} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {LAYER_ACTIONS_BRIDGE_HOOKS,LAYER_ACTIONS_REFERENCE,layerActionReference,
 layerNormalBoundaryCounterexample,layerActionsLabRequest,layerActionsBridgeHTML,bindLayerActionsBridge} from '../dist/layer-actions-bridge.js';

const reference=LAYER_ACTIONS_REFERENCE;
assert.deepEqual(LAYER_ACTIONS_BRIDGE_HOOKS,{'layer-periodicity':['atom-layer-map']});
assert.equal(layerActionsBridgeHTML('unknown'),'');
assert.equal(reference.format,'real-python-layer-actions-reference-v1');
assert.equal(reference.sourceHashNormalization,'utf8-lf-v1');
const sourceHash=text=>crypto.createHash('sha256').update(text.replace(/\r\n?/g,'\n'),'utf8').digest('hex');
for(const[path,hash]of Object.entries(reference.sourceHashes)){
 const text=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),lf=text.replace(/\r\n?/g,'\n');
 assert.equal(sourceHash(text),hash);assert.equal(sourceHash(lf.replace(/\n/g,'\r\n')),hash);assert.equal(sourceHash(lf.replace(/\n/g,'\r')),hash);
}
assert.deepEqual(reference.cases.symmetric.positions,[[0,0,-1.5],[0,0,-.5],[0,0,.5],[0,0,1.5]]);
assert.deepEqual(reference.cases.symmetric.lattice,[[1,0,0],[0,1,0],[0,0,1]]);
assert.deepEqual(reference.cases.symmetric.labels,['A','A','A','A']);
assert.deepEqual(reference.cases.marker.labels,['A','A','A','surface-C']);
// Independent four-site matching: exhaustive permutations, direct Cartesian
// plane translations, and no normal reduction. No production matcher is used.
const permutations=values=>values.length?values.flatMap((value,i)=>permutations(values.filter((_v,j)=>i!==j)).map(tail=>[value,...tail])):[[]];
const matches=(positions,labels,R,t,keepLabels)=>permutations([0,1,2,3]).filter(perm=>positions.every((x,i)=>{
 const y=R.map((row,k)=>row.reduce((s,r,j)=>s+r*x[j],t[k]));
 const d=y.map((v,k)=>v-positions[perm[i]][k]);
 return(!keepLabels||labels[i]===labels[perm[i]])&&Math.abs(d[2])<1e-9&&d.slice(0,2).every(v=>Math.abs(v-Math.round(v))<1e-9);
}));
let independentMaps=0;
for(const caseId of ['symmetric','marker'])for(const operation of ['mirror','identity','quarter','inversion'])for(const planeShift of [0,1]){
 const result=layerActionReference({caseId,operation,planeShift}),data=reference.cases[caseId];
 const geometry=matches(data.positions,data.labels,result.matrix,result.translation,false),labelled=matches(data.positions,data.labels,result.matrix,result.translation,true);
 assert.equal(geometry.length,1);assert.deepEqual(result.permutation,geometry[0]);assert.equal(result.geometryMatch,true);assert.equal(result.bijective,true);
 assert.equal(result.labelMatch,labelled.length===1);assert.equal(result.retained,labelled.length===1);
 assert.ok(result.rows.every(row=>row.normalDifference===0&&row.distance===0));
 assert.deepEqual(result.rows.map(row=>row.wrap),Array.from({length:4},()=>[planeShift,0]));
 independentMaps++;
}
const mirror=layerActionReference();assert.equal(mirror.actualOperationIndex,7);assert.deepEqual(mirror.permutation,[3,2,1,0]);assert.equal(mirror.operationCount,16);assert.equal(mirror.normalFlipCount,8);
const marked=layerActionReference({caseId:'marker'});assert.equal(marked.geometryMatch,true);assert.equal(marked.labelMatch,false);assert.equal(marked.retained,false);assert.equal(marked.operationCount,8);assert.equal(marked.normalFlipCount,0);
assert.deepEqual(marked.rows.map(r=>r.labelMatch),[false,true,true,false]);
assert.equal(layerActionReference({caseId:'marker',operation:'quarter'}).retained,true);
const counter=layerNormalBoundaryCounterexample();assert.deepEqual(counter.translation,[0,0,4]);assert.equal(counter.correctAccepted,false);assert.equal(counter.incorrectAccepted,true);
assert.equal(matches(reference.cases.symmetric.positions,reference.cases.symmetric.labels,[[1,0,0],[0,1,0],[0,0,1]],[0,0,4],true).length,0);
assert.ok(counter.rows.every(row=>row.normalDifference===4&&row.incorrectWrappedNormalDifference===0));
for(const args of [{caseId:'arbitrary'},{operation:'arbitrary'},{planeShift:2},{planeShift:NaN}])assert.throws(()=>layerActionReference(args));
assert.throws(()=>layerActionsLabRequest({caseId:'arbitrary'}));
for(const caseId of ['symmetric','marker']){
 const request=layerActionsLabRequest({caseId});assert.equal(request.action,'layer_symmetry_lab');assert.equal(request.module,'layers');
 assert.deepEqual(request.input,{bulk:'mono',cut:0,face:'001',interface:'same',layers:4,pathEnd:.5,registry:0,termination:caseId==='marker'?'marker':'same'});
 assert.equal(Object.hasOwn(request.input,'operation'),false);assert.equal(Object.hasOwn(request.input,'selectedOperationIndex'),false);
 request.input.layers=99;assert.equal(layerActionsLabRequest({caseId}).input.layers,4);
}

let fetches=0,workers=0,writes=0,focus=null;
globalThis.fetch=()=>{fetches++;throw Error('Unexpected teaching-card fetch');};
globalThis.Worker=class{constructor(){workers++;throw Error('Unexpected worker');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
Element.prototype.focus=function(){focus=this;};
const nodeList=items=>Object.assign({length:items.length,item:i=>items[i]??null,[Symbol.iterator]:function*(){yield*items;}},Object.fromEntries(items.map((v,i)=>[i,v])));
function mount({root=new Container(),store=new Map(),onOpenLab=async()=>true}={}){
 root.innerHTML=layerActionsBridgeHTML('layer-periodicity');let alive=true;
 // Real querySelectorAll returns an iterable NodeList, not an Array.
 const original=root.querySelectorAll.bind(root);root.querySelectorAll=s=>nodeList(Array.from(original(s)));
 const cleanup=bindLayerActionsBridge({root,lessonId:'layer-periodicity',isCurrent:()=>alive,stateStore:store,onOpenLab});
 const $=name=>root.querySelector('#lyab-layer-periodicity-'+name);
 return{root,store,cleanup,$,leave(){alive=false;},choose(name,value){const n=$(name);n.value=String(value);n.onchange();},click(name){const n=$(name);assert.equal(n.disabled,false,name+' must be enabled');return n.onclick();}};
}
const calls=[],v=mount({onOpenLab:async payload=>{calls.push(structuredClone(payload));return true;}});
assert.equal(Array.isArray(v.root.querySelectorAll('button')),false);assert.equal(v.$('details').open,false);assert.equal(v.$('next').disabled,true);
v.$('details').open=true; // Native property without a synthetic toggle.
v.$('normal').open=true;
v.choose('q0','different');v.click('check0');assert.match(v.$('feedback0').textContent,/同一个 j/);
v.choose('q0','same');assert.equal(v.$('feedback0').textContent,'');v.click('check0');assert.match(v.$('feedback0').textContent,/正确/);
const atomControl=v.$('atom');atomControl.focus();v.choose('atom',3);v.click('next');v.click('next');v.click('next');
assert.equal(v.$('atom'),atomControl);assert.equal(focus,atomControl);assert.match(v.$('output').innerHTML,/\[3,2,1,0\]/);assert.equal(v.$('next').disabled,true);
assert.match(v.$('output').innerHTML,/<th scope="col">未取模 Δz \/ a₀<\/th>/);assert.doesNotMatch(v.$('output').innerHTML,/Δz \/ a₀（不取模）/);
v.choose('planeShift',1);assert.match(v.$('output').innerHTML,/\(1, 0\)/);
v.choose('caseId','marker');assert.match(v.$('output').innerHTML,/surface-C/);assert.match(v.$('output').innerHTML,/不通过/);
for(const[i,choice]of [[1,'geometry'],[1,'labels'],[2,'periodic'],[2,'finite']]){v.choose('q'+i,choice);v.click('check'+i);assert.ok(v.$('feedback'+i).textContent.length>30);}
v.choose('normalMode','wrong');assert.match(v.$('normal-output').innerHTML,/伪造/);v.choose('normalMode','correct');assert.match(v.$('normal-output').innerHTML,/拒绝/);
v.$('note').value='自己记录：法向不取模 <script>';v.$('note').oninput();
await v.click('copy');assert.equal(calls.length,1);assert.deepEqual(calls[0],layerActionsLabRequest({caseId:'marker'}));assert.match(v.$('copy-status').textContent,/手动运行/);
const before=v.cleanup.snapshot()['atom-layer-map'];assert.equal(before.open,true);assert.equal(before.normalOpen,true);assert.equal(before.atom,3);assert.equal(before.planeShift,1);assert.equal(before.checked[1],true);assert.equal(before.note,'自己记录：法向不取模 <script>');
v.cleanup();assert.equal(v.$('copy').onclick,null);const restored=mount({store:v.store});assert.equal(restored.$('details').open,true);assert.equal(restored.$('normal').open,true);assert.equal(restored.$('note').value,before.note);assert.equal(restored.$('atom').value,'3');assert.equal(restored.$('q0').value,'same');assert.match(restored.$('feedback1').textContent,/正确/);
// Unsubmitted predictions are retained, without manufacturing feedback.
restored.choose('q1','counts');const store=restored.store;restored.cleanup();const unsubmitted=mount({store});assert.equal(unsubmitted.$('q1').value,'counts');assert.equal(unsubmitted.$('feedback1').textContent,'');
// Old button references and an old cleanup cannot affect a new owner.
const oldCopy=unsubmitted.$('copy').onclick,sharedRoot=unsubmitted.root;
const replacement=bindLayerActionsBridge({root:sharedRoot,lessonId:'layer-periodicity',stateStore:store,onOpenLab:async p=>{calls.push(p);return true;}});
unsubmitted.cleanup();assert.equal(typeof sharedRoot.querySelector('#lyab-layer-periodicity-copy').onclick,'function');await oldCopy();assert.equal(calls.length,1);replacement();
// Leaving while copy is pending suppresses success and further actions.
let resolvePending;const pending=mount({onOpenLab:()=>new Promise(resolve=>{resolvePending=resolve;})}),pendingClick=pending.click('copy');assert.equal(pending.$('copy').disabled,true);const oldNext=pending.$('next').onclick;pending.leave();resolvePending(true);await pendingClick;assert.equal(pending.$('copy-status').textContent,'');oldNext();pending.cleanup();
// Rejected handoffs retry, and reset/new input isolate an older in-flight job.
let attempts=0;const error=mount({onOpenLab:async()=>{attempts++;if(attempts===1)throw Error('temporary');return true;}});await error.click('copy');assert.match(error.$('copy-status').textContent,/重新尝试/);assert.equal(error.$('copy').disabled,false);await error.click('copy');assert.match(error.$('copy-status').textContent,/已复制/);
let resolveOld;const race=mount({onOpenLab:()=>new Promise(resolve=>{resolveOld=resolve;})});const oldJob=race.click('copy');race.click('reset');assert.equal(race.$('copy').disabled,false);race.choose('caseId','marker');resolveOld(false);await oldJob;assert.equal(race.$('copy-status').textContent,'');assert.equal(race.$('caseId').value,'marker');
const falseCopy=mount({onOpenLab:async()=>false});await falseCopy.click('copy');assert.match(falseCopy.$('copy-status').textContent,/未完成/);
const emptyRoot=new Container();emptyRoot.innerHTML='';const invalid=bindLayerActionsBridge({root:emptyRoot,lessonId:'unknown'});assert.equal(typeof invalid,'function');assert.deepEqual(invalid.snapshot(),{});invalid();
for(const view of [restored,unsubmitted,error,race,falseCopy])view.cleanup();
assert.deepEqual({fetches,workers,writes},{fetches:0,workers:0,writes:0});

const source=fs.readFileSync(new URL('../dist/layer-actions-bridge.js',import.meta.url),'utf8'),locale=JSON.parse(fs.readFileSync(new URL('../locales/en-layer-actions-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(item=>textUnits(item.value)))];
assert.ok(units.length>90);assert.deepEqual(units.filter(unit=>!locale[unit]),[]);
assert.ok(units.includes('未取模 Δz / a₀'));assert.equal(units.includes('Δz / a₀（不取模）'),false);assert.equal(Object.hasOwn(locale,'Δz / a₀（不取模）'),false);assert.equal(locale['未取模 Δz / a₀'],'Unwrapped Δz / a₀');
for(const unit of units){assert.equal(HAN.test(locale[unit]),false);assert.ok(locale[unit].trim());}
for(const item of jsStrings(source)){const english=replaceUnits(item.value,text=>{assert.ok(locale[text],text);return locale[text];});assert.equal(HAN.test(english),false);if(!HAN.test(item.value))assert.equal(english,item.value);}
const css=fs.readFileSync(new URL('../dist/layer-actions-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/\.lyab-formula\{[^}]*font-size:22px/);assert.match(css,/\.lyab-scroll\{[^}]*overflow-x:auto/);assert.doesNotMatch(source,/localStorage|sessionStorage|new Worker|fetch\(/);
console.log(`Layer action bridge: ${independentMaps} independent atom maps, real source hashes, finite-normal counterexample, native open and unsent RAM state, stable controls, NodeList, ownership/stale/error/copy guards and ${units.length} actual English units passed.`);
