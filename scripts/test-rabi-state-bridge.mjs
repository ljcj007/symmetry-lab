import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {rabiStateLedger,rabiPhaseComparison,bindRabiStateBridge} from '../dist/rabi-state-bridge.js';

// One real Python invocation validates spectral identities and executes the
// immutable old source on the same host for strict preservation. The retained
// Windows output capture is legacy data, not a cross-platform bitwise oracle.
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.PYTHON||process.env.PYTHON_EXE||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const execution=spawnSync(python,[path.join(ROOT,'scripts/test-python-rabi-state-bridge.py'),'--emit-json'],{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
assert.equal(execution.error,undefined,execution.error?.message);
assert.equal(execution.status,0,execution.stderr);
const captured=JSON.parse(execution.stdout),results=captured.results;
assert.match(captured.source,/actual .*lie_applications/);
assert.equal(captured.baseline,'e8978ee80a41a7303adf54230cfc24bac3177390');
assert.equal(captured.baselineExecution,'same-host immutable historical source');
assert.equal(captured.baselineSourceSHA256,'d48fb45d1ea3e7fdde6720feddd3440a024f26d52bcc449c34e2adda81d5b3b9');
assert.deepEqual(captured.unchangedBaselineLeaves,{numeric:19585,other:184});
const copy=x=>structuredClone(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const near=(a,b,tol=2e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} ≠ ${b}`);
const equalComplex=(a,b)=>{near(a.re,b.re);near(a.im,b.im);};
const equalMatrix=(a,b)=>a.forEach((row,i)=>row.forEach((z,j)=>equalComplex(z,b[i][j])));
let ledgerCount=0;
for(const result of Object.values(results)){
 const original=JSON.stringify(result);freeze(result);
 for(let index=0;index<result.trajectory.length;index++){
  const ledger=rabiStateLedger(result,index),row=result.trajectory[index];ledgerCount++;
  assert.equal(ledger.index,index);near(ledger.time,row.time);assert.equal(ledger.hasPythonDensity,true);
  equalMatrix(ledger.rho,row.densityMatrix);equalMatrix(ledger.U,row.matrix);
  ledger.state.forEach((z,i)=>equalComplex(z,row.state[i]));
  ledger.bloch.forEach((v,i)=>near(v,row.blochVector[i]));near(ledger.probabilities[1],row.probability);
  Object.values(ledger.checks).forEach(x=>assert.ok(Number.isFinite(x)&&x<=1e-8));
 }
 assert.equal(JSON.stringify(result),original,'Read-only ledgers leave Python output unchanged');
}
const half=results['half-pi'],final=rabiStateLedger(half,half.trajectory.length-1);
near(final.rho[0][1].im,.5);near(final.rho[1][0].im,-.5);near(final.bloch[1],-1);
for(const kind of ['global','relative'])for(let quarterTurns=0;quarterTurns<4;quarterTurns++){
 const view=rabiPhaseComparison(final.state,{kind,quarterTurns});
 view.probabilities.forEach((v,i)=>near(v,final.probabilities[i]));
 if(kind==='global'||quarterTurns===0){equalMatrix(view.rho,final.rho);near(view.densityChange,0);view.bloch.forEach((v,i)=>near(v,final.bloch[i]));}
 else assert.ok(view.densityChange>.49,'Relative phase changes coherence although each population is unchanged');
}
const imaginaryPhase=rabiPhaseComparison(final.state,{kind:'relative',quarterTurns:1});
near(imaginaryPhase.bloch[0],1);near(imaginaryPhase.bloch[1],0);
for(const name of ['zero','time-zero','pi','two-pi']){
 const result=results[name],ledger=rabiStateLedger(result,result.trajectory.length-1);
 near(rabiPhaseComparison(ledger.state,{kind:'relative',quarterTurns:1}).densityChange,0);
}
for(const result of Object.values(results)){
 const ledger=rabiStateLedger(result,result.trajectory.length-1);
 const global=rabiPhaseComparison(ledger.state,{kind:'global',quarterTurns:3});equalMatrix(global.rho,ledger.rho);
 const relative=rabiPhaseComparison(ledger.state,{kind:'relative',quarterTurns:1});
 relative.probabilities.forEach((v,i)=>near(v,ledger.probabilities[i]));
 near(relative.bloch[0],-ledger.bloch[1]);near(relative.bloch[1],ledger.bloch[0]);near(relative.bloch[2],ledger.bloch[2]);
}
for(const index of [-1,.5,half.trajectory.length,NaN])assert.throws(()=>rabiStateLedger(half,index));
assert.throws(()=>rabiStateLedger({...half,experiment:'other'},0));
assert.throws(()=>rabiPhaseComparison([{re:NaN,im:0},{re:0,im:0}]));
assert.throws(()=>rabiPhaseComparison(final.state,{kind:'unregistered'}));
assert.throws(()=>rabiPhaseComparison(final.state,{quarterTurns:4}));
const legacy=copy(half);delete legacy.densityMatrix;
for(const row of legacy.trajectory)for(const field of ['state','matrix','densityMatrix'])delete row[field];
assert.equal(rabiStateLedger(legacy,0),null,'Old intermediate samples honestly have no complex state');
assert.equal(rabiStateLedger(legacy,120),null);
const legacyLast=rabiStateLedger(legacy,legacy.trajectory.length-1);
assert.equal(legacyLast.hasPythonDensity,false);equalMatrix(legacyLast.rho,final.rho);
const noStates=copy(legacy);delete noStates.state;delete noStates.matrix;
assert.equal(rabiStateLedger(noStates,noStates.trajectory.length-1),null);
const inconsistent=copy(half);inconsistent.trajectory[0].probability=.3;
assert.throws(()=>rabiStateLedger(inconsistent,0),/不一致/);
const nonfinite=copy(half);nonfinite.trajectory[0].state[0].im=Infinity;
assert.throws(()=>rabiStateLedger(nonfinite,0),/有限/);

// Inert DOM adapter executing the real production binder. Native details.open
// is reflected as a boolean attribute; this is not a browser rendering claim.
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const camel=s=>s.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element{
 constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[camel(key.slice(5))]=value;this.value=decode(attributes.value??'');this.disabled=Object.hasOwn(attributes,'disabled');}
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
  for(const node of this.querySelectorAll('select')){const options=node.querySelectorAll('option');node.value=(options.find(x=>Object.hasOwn(x.attributes,'selected'))||options[0])?.value||'';}
 }
 get innerHTML(){return this.html||'';}
 set textContent(value){for(const child of this.children)child.parentNode=null;this.children=[];this.html=String(value);}
 get textContent(){return decode(this.innerHTML.replace(/<[^>]*>/g,''));}
 getAttribute(key){return Object.hasOwn(this.attributes,key)?this.attributes[key]:null;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 removeAttribute(key){delete this.attributes[key];}
 get open(){return Object.hasOwn(this.attributes,'open');}
 set open(value){if(value)this.attributes.open='';else delete this.attributes.open;}
 matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function mount(result=copy(half),options={}){
 freeze(result);
 const shell=new Element('main',{}, {isConnected:true});shell.innerHTML='<input id="outer-range" type="range" min="0" max="240" step="1" value="240"><div id="bridge"></div>';
 const root=shell.querySelector('#bridge'),slider=shell.querySelector('#outer-range'),calls=[];
 const binding=bindRabiStateBridge({root,result,onIndex:index=>{calls.push(index);slider.value=String(index);},...options});
 slider.oninput=()=>binding.update(Number(slider.value));
 return{shell,root,slider,calls,binding,$:selector=>root.querySelector(selector),result};
}
const live=mount(),{$,binding,slider}=live;
const stable=Object.fromEntries(['#rsb-mid','#rsb-step','#rsb-phase-kind','#rsb-phase','#rsb-note','#rsb-q0','#rsb-check0','#rsb-q1','#rsb-check1'].map(id=>[id,$(id)]));
const assertStable=()=>{for(const [id,node]of Object.entries(stable))assert.equal($(id),node,`Painting retains ${id}`);assert.equal(live.shell.querySelector('#outer-range'),slider);};
assert.doesNotMatch($('#rsb-ledger').innerHTML,/第一步：/);
for(const [step,text]of [[1,/第一步：/],[2,/第二步：/],[3,/第三步：/]]){$('#rsb-step').onclick();assert.equal(binding.snapshot().step,step);assert.match($('#rsb-ledger').innerHTML,text);assertStable();}
$('#rsb-step').onclick();assert.equal(binding.snapshot().step,0);assert.doesNotMatch($('#rsb-ledger').innerHTML,/第一步：/);
const nativePhase=$('[data-rsb-detail="phase"]');nativePhase.open=true;nativePhase.ontoggle();
let nativeU=$('[data-rsb-detail="unitary"]');nativeU.open=true;nativeU.ontoggle();
$('#rsb-note').value='bra needs a complex conjugate <not HTML>';$('#rsb-note').oninput();
slider.value='0';slider.oninput();assert.equal(binding.index(),0);assert.equal(live.calls.length,0);assertStable();
assert.equal($('[data-rsb-detail="phase"]'),nativePhase);assert.equal(nativePhase.open,true);assert.equal($('[data-rsb-detail="unitary"]').open,true);
assert.equal($('#rsb-note').value,'bra needs a complex conjugate <not HTML>');
nativeU=$('[data-rsb-detail="unitary"]');nativeU.open=false;nativeU.ontoggle();binding.update(120);assert.equal($('[data-rsb-detail="unitary"]').open,false,'User closing a disclosure survives repaint');
$('#rsb-mid').onclick();assert.equal(binding.index(),Math.floor((half.trajectory.length-1)/2));assert.deepEqual(live.calls,[120]);assert.equal(slider.value,'120');assertStable();
$('#rsb-q0').value='negative';$('#rsb-q0').onchange();assert.equal($('#rsb-feedback0').textContent,'');assert.equal($('#rsb-check0').disabled,false);
$('#rsb-check0').onclick();assert.match($('#rsb-feedback0').textContent,/这是 ρ↓↑/);assert.doesNotMatch($('#rsb-feedback0').textContent,/^✓/);
$('#rsb-q0').value='positive';$('#rsb-q0').onchange();assert.equal($('#rsb-feedback0').textContent,'');$('#rsb-check0').onclick();assert.match($('#rsb-feedback0').textContent,/^✓/);
$('#rsb-q1').value='matrix';$('#rsb-q1').onchange();$('#rsb-check1').onclick();assert.match($('#rsb-feedback1').textContent,/共轭相位/);
$('#rsb-q1').value='ray';$('#rsb-q1').onchange();$('#rsb-check1').onclick();assert.match($('#rsb-feedback1').textContent,/^✓/);
$('#rsb-phase-kind').value='relative';$('#rsb-phase-kind').onchange();$('#rsb-phase').value='2';$('#rsb-phase').onchange();assert.equal(binding.snapshot().kind,'relative');assert.equal(binding.snapshot().phase,2);assertStable();
assert.match($('#rsb-phase-result').innerHTML,/max \|Δρ\|/);
$('#rsb-phase-kind').value='invalid';$('#rsb-phase-kind').onchange();assert.equal(binding.snapshot().kind,'relative');
const retiredStep=$('#rsb-step').onclick,retiredNote=$('#rsb-note').oninput,retiredDetail=nativePhase.ontoggle;
binding();binding();const saved=binding.snapshot();retiredStep();retiredNote();retiredDetail();binding.update(0);assert.deepEqual(binding.snapshot(),saved,'Cleaned-up events and updates stay retired');
const restored=bindRabiStateBridge({root:live.root,result:live.result});
assert.equal(restored.snapshot().index,120);assert.equal(restored.snapshot().kind,'relative');assert.equal(restored.snapshot().phase,2);
assert.equal(live.$('#rsb-note').value,'bra needs a complex conjugate <not HTML>');assert.equal(live.$('[data-rsb-detail="phase"]').open,true);assert.equal(live.$('[data-rsb-detail="unitary"]').open,false);
assert.match(live.$('#rsb-feedback0').textContent,/^✓/);assert.match(live.$('#rsb-feedback1').textContent,/^✓/);restored();

const missing=mount(noStates,{initialIndex:0});assert.match(missing.$('#rsb-ledger').innerHTML,/旧记录没有/);assert.equal(missing.$('#rsb-step').disabled,true);assert.equal(missing.$('#rsb-phase-result').innerHTML,'');missing.binding();
const older=mount(legacy,{initialIndex:0});older.binding.update(legacy.trajectory.length-1);assert.equal(older.$('#rsb-step').disabled,false);assert.doesNotMatch(older.$('#rsb-ledger').innerHTML,/旧记录没有/);older.binding();
const bad=mount(inconsistent,{initialIndex:0});assert.match(bad.$('#rsb-ledger').innerHTML,/role="alert"/);assert.equal(bad.$('#rsb-step').disabled,true);bad.binding();
const detached=mount();const detachedHTML=detached.$('#rsb-ledger').innerHTML,detachedStep=detached.$('#rsb-step').onclick;detached.shell.parentNode.isConnected=false;detachedStep();detached.binding.update(0);assert.equal(detached.$('#rsb-ledger').innerHTML,detachedHTML);detached.binding();

// Ownership regression: a late old cleanup/snapshot must not retire or revert
// a newer binder sharing the root and the same immutable scientific result.
const crossingResult=copy(half);let oldCurrent=true;
const crossing=mount(crossingResult,{isCurrent:()=>oldCurrent});
const oldToggle=crossing.$('[data-rsb-detail="phase"]').ontoggle;
oldCurrent=false;
const newer=bindRabiStateBridge({root:crossing.root,result:crossingResult});
crossing.$('#rsb-step').onclick();assert.equal(newer.snapshot().step,1);
crossing.binding();assert.equal(typeof crossing.$('#rsb-step').onclick,'function','Late old cleanup must not unbind the new root owner');
crossing.binding.snapshot();oldToggle();
crossing.$('#rsb-step').onclick();assert.equal(newer.snapshot().step,2);
newer();const third=bindRabiStateBridge({root:crossing.root,result:crossingResult});assert.equal(third.snapshot().step,2,'Retired snapshots cannot overwrite the newer memory');third();
assert.equal(JSON.stringify(live.result),JSON.stringify(half),'The DOM binder never mutates scientific result data');
console.log(`Rabi state bridge: ${ledgerCount} actual Python ledgers; ${captured.unchangedBaselineLeaves.numeric} same-host old numeric leaves unchanged; spectral checks, phase observables, honest legacy null, real binder steps, prediction feedback, native-detail state, notes, stable controls, retirement and ownership guards passed. Native browser QA is separate.`);
