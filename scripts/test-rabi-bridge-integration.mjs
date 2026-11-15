import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.PYTHON||process.env.PYTHON_EXE||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
// Actual current Python results and an actual historical Python capture;
// no state, probability, propagator or Bloch trajectory is synthesized in JS.
const program=`import json,runpy,sys
m=runpy.run_path(sys.argv[1])
run=m['current'].run
print(json.dumps({'pi':m['RESULTS']['pi'],'detuned':m['RESULTS']['detuned'],'zero':m['RESULTS']['time-zero'],'legacy':m['load_baseline_capture']()['cases']['pi']['result'],'coupled':run({'lab':'lie','experiment':'su2_coupling','twoJ1':1,'twoJ2':1,'twoM1':1,'twoM2':-1,'coupling':1})},allow_nan=False,separators=(',',':')))
`;
const execution=spawnSync(python,['-c',program,path.join(ROOT,'scripts/test-python-rabi-state-bridge.py')],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(execution.error,undefined,execution.error?.message);assert.equal(execution.status,0,execution.stderr);
const actual=JSON.parse(execution.stdout),copy=x=>structuredClone(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(actual);const actualSnapshot=JSON.stringify(actual);
const fmt=x=>Math.abs(x)<1e-10?'0':Number(x.toFixed(6)).toString();
const ledgerFmt=x=>Math.abs(x)<1e-12?'0':Number(x.toPrecision(7)).toString();
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const camel=s=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());

// Shared Element/Container shape used by the UI tests, including reflected
// native details.open and node identity. Browser layout is checked separately.
class Element{
 constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[camel(key.slice(5))]=value;this.value=decode(attributes.value??'');this.disabled=Object.hasOwn(attributes,'disabled');this.checked=Object.hasOwn(attributes,'checked');}
 get isConnected(){return this.parentNode?.isConnected===true;}
 set innerHTML(value){
  this.html=String(value);for(const child of this.children)child.parentNode=null;this.children=[];
  const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);
  for(const match of this.html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){
   const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}
   const attributes={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';
   const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);
   if(tag==='textarea'){const start=match.index+match[0].length,end=this.html.indexOf('</textarea>',start);child.value=decode(this.html.slice(start,end));}
   if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push(child);
  }
  for(const select of this.querySelectorAll('select')){const options=select.querySelectorAll('option');select.value=(options.find(x=>Object.hasOwn(x.attributes,'selected'))||options[0])?.value||'';}
 }
 get innerHTML(){return this.html||'';}
 set textContent(value){for(const child of this.children)child.parentNode=null;this.children=[];this.html=String(value);}
 get textContent(){return decode(this.innerHTML.replace(/<[^>]*>/g,''));}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return Object.hasOwn(this.attributes,key)?this.attributes[key]:null;}
 removeAttribute(key){delete this.attributes[key];}
 get open(){return Object.hasOwn(this.attributes,'open');}
 set open(value){if(value)this.attributes.open='';else delete this.attributes.open;}
 appendChild(child){child.parentNode=this;this.children.push(child);return child;}
 contains(node){for(let current=node;current;current=current.parentNode)if(current===this)return true;return false;}
 matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){}scrollIntoView(){}
}
class Container{
 constructor(){this.isConnected=true;}
 set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=String(value);this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}
 get innerHTML(){return this.html||'';}
 querySelector(selector){return this.firstElementChild?.querySelector(selector)||null;}
}
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
const sideEffects={fetch:0,worker:0,storage:0,compute:0};
globalThis.fetch=()=>{sideEffects.fetch++;throw Error('Integration must not fetch application data.');};
globalThis.Worker=class{constructor(){sideEffects.worker++;throw Error('Integration must not start a worker.');}};
globalThis.localStorage={getItem(){sideEffects.storage++;return null;},setItem(){sideEffects.storage++;},removeItem(){sideEffects.storage++;}};
const {physicsOutput,bindPhysicsOutput}=await import('../dist/lie-physics-ui.js');
const run=()=>{sideEffects.compute++;throw Error('Inspecting a returned Rabi trajectory must not run another calculation.');};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function render(result=copy(actual.pi)){
 freeze(result);const container=new Container();container.innerHTML='<div id="physics-output"></div>';
 const root=container.querySelector('#physics-output');root.innerHTML=physicsOutput(result);
 return{container,root,result,$:selector=>root.querySelector(selector)};
}
function assertSample(view,index,{ledger=true}={}){
 const row=view.result.trajectory[index],sample=view.$('#lg-rabi-sample').innerHTML;
 assert.equal(Number(view.$('#lg-trajectory-index').value),index);
 assert.ok(sample.includes(`t = <strong>${fmt(row.time)}</strong>`),'Outer display uses the same Python time');
 assert.ok(sample.includes(`P↓ = <strong>${fmt(row.probability)}</strong>`),'Outer probability is the selected Python sample');
 assert.ok(sample.includes(`Bloch 向量 = (${row.blochVector.map(fmt).join(', ')})`),'Outer Bloch vector is the selected Python sample');
 if(ledger)assert.ok(view.$('#rsb-ledger').innerHTML.includes(`t = ${ledgerFmt(row.time)}</p>`),'Complex ledger and trajectory select the same sample');
}

// Production default loader: genuine lazy import, no injected module or math.
const normal=render(),normalCleanup=bindPhysicsOutput(normal.root,normal.result,()=>true,run);
assert.ok(normalCleanup.ready instanceof Promise);await normalCleanup.ready;
assert.equal(normal.$('#lg-rabi-state-host').getAttribute('aria-busy'),'false');assertSample(normal,240);
const slider=normal.$('#lg-trajectory-index'),host=normal.$('#lg-rabi-state-host');
slider.value='60';slider.oninput();assertSample(normal,60);
normal.$('#rsb-mid').onclick();assertSample(normal,120);assert.equal(normal.$('#lg-trajectory-index'),slider);assert.equal(normal.$('#lg-rabi-state-host'),host);
normal.$('#rsb-step').onclick();normal.$('#rsb-step').onclick();assert.match(normal.$('#rsb-ledger').innerHTML,/第二步：/);
normal.$('#rsb-note').value='The bra conjugates both amplitudes <saved>';normal.$('#rsb-note').oninput();
normal.$('[data-rsb-detail="phase"]').open=true;normal.$('[data-rsb-detail="phase"]').ontoggle();
normal.$('[data-rsb-detail="unitary"]').open=true;normal.$('[data-rsb-detail="unitary"]').ontoggle();
const oldScrub=slider.oninput,oldMid=normal.$('#rsb-mid').onclick,oldStep=normal.$('#rsb-step').onclick;
normal.root.innerHTML=physicsOutput(normal.result);
const rebound=bindPhysicsOutput(normal.root,normal.result,()=>true,run);await rebound.ready;
assertSample(normal,120);assert.match(normal.$('#rsb-ledger').innerHTML,/第二步：/);
assert.equal(normal.$('#rsb-note').value,'The bra conjugates both amplitudes <saved>');
assert.equal(normal.$('[data-rsb-detail="phase"]').open,true);assert.equal(normal.$('[data-rsb-detail="unitary"]').open,true);
const restoredLedger=normal.$('#rsb-ledger').innerHTML;slider.value='0';oldScrub();oldMid();oldStep();normalCleanup();
assert.equal(normal.$('#rsb-ledger').innerHTML,restoredLedger,'Old callbacks and late cleanup leave the rebound result intact');
assert.equal(typeof normal.$('#lg-trajectory-index').oninput,'function');rebound();

// Inject only loading timing. The resolved module and all returned physics are
// actual production code/results, not synthetic binder or dynamics substitutes.
const bridge=await import('../dist/rabi-state-bridge.js?v=20261115-precision1');
const pending=render(copy(actual.detuned)),gate=deferred();let loads=0;
const pendingCleanup=bindPhysicsOutput(pending.root,pending.result,()=>true,run,{loadRabiModule:()=>{loads++;return gate.promise;}});
const pendingSlider=pending.$('#lg-trajectory-index');
for(const index of [13,57,173]){pendingSlider.value=String(index);pendingSlider.oninput();assertSample(pending,index,{ledger:false});}
assert.equal(loads,1);assert.equal(pending.$('#rsb-ledger'),null);gate.resolve(bridge);await pendingCleanup.ready;
assertSample(pending,173);assert.equal(pending.$('#lg-trajectory-index'),pendingSlider);pending.$('#rsb-mid').onclick();assertSample(pending,120);pendingCleanup();

// Failed dynamic-import promise leaves existing probability readable. Repeated
// retry clicks share one promise; an older replaced retry button stays inert.
const failed=render(),attempts=[];
const failedCleanup=bindPhysicsOutput(failed.root,failed.result,()=>true,run,{loadRabiModule:()=>{const attempt=deferred();attempts.push(attempt);return attempt.promise;}});
failed.$('#lg-trajectory-index').value='33';failed.$('#lg-trajectory-index').oninput();attempts[0].reject(Error('simulated native import rejection'));await failedCleanup.ready;
assert.match(failed.$('#lg-rabi-state-host').innerHTML,/role="alert"/);assertSample(failed,33,{ledger:false});
const firstRetry=failed.$('#lg-rabi-state-retry'),oldRetry=firstRetry.onclick;
firstRetry.onclick();const retryReady=failedCleanup.ready;firstRetry.onclick();firstRetry.onclick();
assert.equal(attempts.length,2);assert.equal(failedCleanup.ready,retryReady,'Pending retry is deduplicated');
attempts[1].reject(Error('second rejected import'));await failedCleanup.ready;
const secondRetry=failed.$('#lg-rabi-state-retry');assert.notEqual(secondRetry,firstRetry);oldRetry();assert.equal(attempts.length,2,'Detached retry callbacks cannot issue another request');
secondRetry.onclick();assert.equal(attempts.length,3);attempts[2].resolve(bridge);await failedCleanup.ready;assertSample(failed,33);
oldRetry();assert.equal(attempts.length,3);assert.equal(failed.$('#lg-rabi-state-host').getAttribute('aria-busy'),'false');failedCleanup();

// Switch away before the lazy import arrives; its late success and the old
// scrubber cannot put a Rabi host into a non-Rabi experiment.
const switched=render(),late=deferred();let current=true;
const switchedCleanup=bindPhysicsOutput(switched.root,switched.result,()=>current,run,{loadRabiModule:()=>late.promise});
const retiredScrub=switched.$('#lg-trajectory-index').oninput;
current=false;switched.root.innerHTML=physicsOutput(actual.coupled);
bindPhysicsOutput(switched.root,actual.coupled,()=>true,run);const coupledHTML=switched.root.innerHTML;
late.resolve(bridge);await switchedCleanup.ready;retiredScrub();switchedCleanup();
assert.equal(switched.root.innerHTML,coupledHTML);assert.equal(switched.$('#lg-rabi-state-host'),null);assert.equal(switched.$('#rsb-ledger'),null);

// A newer Rabi result in the same root owns its own pending selection.
const newer=render(),lateOld=deferred();let firstCurrent=true;
const firstCleanup=bindPhysicsOutput(newer.root,newer.result,()=>firstCurrent,run,{loadRabiModule:()=>lateOld.promise});
const firstSlider=newer.$('#lg-trajectory-index'),firstCallback=firstSlider.oninput;
firstSlider.value='7';firstCallback();firstCurrent=false;
newer.result=freeze(copy(actual.detuned));newer.root.innerHTML=physicsOutput(newer.result);
const latestCleanup=bindPhysicsOutput(newer.root,newer.result,()=>true,run);await latestCleanup.ready;assertSample(newer,240);
lateOld.resolve(bridge);await firstCleanup.ready;firstCallback();firstCleanup();assertSample(newer,240);latestCleanup();

// Detached parent and rejected pending imports likewise remain silent.
const detached=render(),detachedGate=deferred();
const detachedCleanup=bindPhysicsOutput(detached.root,detached.result,()=>true,run,{loadRabiModule:()=>detachedGate.promise});
const detachedHTML=detached.root.innerHTML;detached.container.isConnected=false;detachedGate.reject(Error('late load failure'));await detachedCleanup.ready;
assert.equal(detached.root.innerHTML,detachedHTML);detachedCleanup();

// Actual historical output: no invented intermediate state, honest guidance;
// selecting its final point may use its real legacy terminal state and U.
const legacy=render(copy(actual.legacy)),legacyCleanup=bindPhysicsOutput(legacy.root,legacy.result,()=>true,run);await legacyCleanup.ready;
legacy.$('#lg-trajectory-index').value='60';legacy.$('#lg-trajectory-index').oninput();assertSample(legacy,60,{ledger:false});
assert.match(legacy.$('#rsb-ledger').innerHTML,/旧记录没有/);assert.equal(legacy.$('#rsb-step').disabled,true);
legacy.$('#lg-trajectory-index').value='240';legacy.$('#lg-trajectory-index').oninput();assertSample(legacy,240);assert.equal(legacy.$('#rsb-step').disabled,false);legacyCleanup();
const zero=render(copy(actual.zero)),zeroCleanup=bindPhysicsOutput(zero.root,zero.result,()=>true,run);await zeroCleanup.ready;
assert.equal(zero.$('#lg-trajectory-index').disabled,true);assertSample(zero,0);zero.$('#rsb-mid').onclick();assertSample(zero,0);zeroCleanup();
assert.equal(JSON.stringify(actual),actualSnapshot,'Integration leaves all supplied scientific results unchanged');
assert.deepEqual(sideEffects,{fetch:0,worker:0,storage:0,compute:0});
console.log('Rabi integration: actual physicsOutput/bindPhysicsOutput, default lazy import, same-sample probability/Bloch/state, stable scrubber, rerender memory, latest pending index, retry deduplication, stale loaders/callbacks, legacy guidance and zero-time passed; no automatic worker, application fetch, storage or calculation. Native browser QA is separate.');
