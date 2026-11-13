import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {HAN,jsStrings,textUnits,replaceUnits} from './english-source.mjs';
import {THERMAL_BRIDGE_HOOKS,THERMAL_CONSTANTS,THERMAL_EXACT_TEMPERATURE,
 thermalOscillatorReference,thermalBridgeReference,thermalSlopeReference,thermalBridgeLabRequest,
 thermalBridgeHTML,bindThermalLearningBridge} from '../dist/thermal-learning-bridge.js';

const K=1.380649e-23,N=6.02214076e23,E=1.602176634e-19,H=6.62607015e-34,C=299792458,eps=400*K;
const near=(actual,expected,relative=3e-13)=>{if(expected===0)assert.equal(actual,0);else assert.ok(Math.abs(actual/expected-1)<=relative,`${actual} versus ${expected}`);};
const sum=values=>{let result=0,correction=0;for(const value of values){const adjusted=value-correction,next=result+adjusted;correction=(next-result)-adjusted;result=next;}return result;};
// Independent finite number-state sum and energy variance. log1p of the
// excited-state sum retains the leading entropy term even when Z rounds to 1.
function independent(T){
 if(T===0)return{n:0,SoverK:0,CoverK:0,thermalU:0,shiftedF:0};
 const x=400/T,weights=Array.from({length:1024},(_,m)=>m===0?1:Math.exp(-m*x));
 const excited=sum(weights.slice(1)),z=1+excited,mean=sum(weights.map((w,m)=>m*w))/z;
 const variance=sum(weights.map((w,m)=>w*(m-mean)**2))/z;
 return{n:mean,SoverK:Math.log1p(excited)+x*mean,CoverK:x*x*variance,
  thermalU:eps*mean,shiftedF:-K*T*Math.log1p(excited)};
}
let comparisons=0;
for(const T of [0,1,2,5,10,20,100,399,400,401,THERMAL_EXACT_TEMPERATURE,800,1000]){
 const expected=independent(T),absolute=thermalOscillatorReference({temperature:T}),shifted=thermalOscillatorReference({temperature:T,reference:'shifted'});
 near(absolute.occupation,expected.n);near(absolute.entropy/K,expected.SoverK);near(absolute.heatCapacity/K,expected.CoverK);
 near(shifted.internalEnergy,expected.thermalU);near(shifted.freeEnergy,expected.shiftedF);
 near(absolute.internalEnergy,eps/2+expected.thermalU);near(absolute.freeEnergy,eps/2+expected.shiftedF);
 near(shifted.entropy,absolute.entropy);near(shifted.heatCapacity,absolute.heatCapacity);
 assert.deepEqual(shifted.levels.map(x=>x.probability),absolute.levels.map(x=>x.probability));
 near(absolute.visibleProbability+absolute.tailProbability,1);
 for(const level of absolute.levels){near(level.energyJ,eps*(level.m+.5));near(level.occupationContribution,level.m*level.probability);}
 for(const natom of [1,2])for(const degeneracy of [1,3]){
  const r=thermalBridgeReference({temperature:T,natom,degeneracy});
  near(r.local.heatCapacityOverKB,degeneracy*absolute.heatCapacityOverKB);
  near(r.local.occupation,degeneracy*absolute.occupation);assert.equal(r.complete.modes,3*natom);
  near(r.complete.occupation,3*natom*absolute.occupation);
  near(r.complete.energyMolar,3*natom*absolute.internalEnergy*N/1000);
  near(r.complete.energyCellEV,3*natom*absolute.internalEnergy/E);
  near(r.complete.heatCapacityMolar,3*natom*absolute.heatCapacity*N);
  near(r.complete.heatCapacityPerMoleAtoms,r.complete.heatCapacityMolar/natom);
  near(r.complete.highTemperatureLimit,3*natom*K*N);comparisons++;
 }
}
const exact=thermalOscillatorReference({temperature:THERMAL_EXACT_TEMPERATURE});
assert.equal(exact.exactGeometricHalf,true);assert.equal(exact.occupation,1);
assert.deepEqual(exact.levels.map(x=>x.probability),[.5,.25,.125,.0625,.03125,.015625]);
assert.equal(exact.tailProbability,1/64);assert.equal(exact.visibleProbability,63/64);
near(exact.heatCapacityOverKB,2*Math.LN2**2);
for(const temperature of [0,.37,10,100,400,THERMAL_EXACT_TEMPERATURE,1000])for(const natom of [1,2]){
 const request=thermalBridgeLabRequest({temperature,natom,reference:'shifted',degeneracy:1});
 assert.deepEqual(request,{action:'phonon_thermo',module:'thermo',input:{source:'einstein',natom,theta_e:400,t_min:temperature,t_max:temperature,t_step:20}});
}
const at400=thermalBridgeReference(),slope=thermalSlopeReference();
near(at400.complete.energyMolar,21.590531719146142);near(at400.complete.heatCapacityMolar,45.92943709536885);
near(slope.centralSlope,45.9294151027656);near(slope.centralSlope,slope.analyticHeatCapacity,5e-7);
near(thermalSlopeReference({natom:1}).centralSlope,slope.centralSlope/2);
near(thermalSlopeReference({reference:'shifted'}).centralSlope,slope.centralSlope,1e-12);
near(at400.single.frequency.THz,eps/H/1e12);near(at400.single.frequency['cm^-1'],eps/(H*C*100));near(at400.single.frequency.meV,eps/E*1000);
const cold=thermalOscillatorReference({temperature:10,reference:'shifted'});
assert.ok(cold.internalEnergy>0&&cold.freeEnergy<0,'Small thermal terms must survive subtracting the energy reference');
near(cold.entropy/K/Math.exp(-40),41,2e-13);
for(const T of [Number.MIN_VALUE,.37]){
 const r=thermalOscillatorReference({temperature:T});assert.equal(r.numericalUnderflow,true);assert.equal(r.occupation,0);assert.equal(r.heatCapacity,0);
 const visit=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(visit);};visit(r);
}
assert.equal(thermalOscillatorReference({temperature:Number.MIN_VALUE}).ratioOverflow,true);
for(const temperature of [-1,1001,NaN,Infinity,'400'])assert.throws(()=>thermalOscillatorReference({temperature}),/temperature/);
for(const reference of ['unknown',0,null])assert.throws(()=>thermalOscillatorReference({reference}),/reference/);
for(const natom of [0,1/3,3,'2'])assert.throws(()=>thermalBridgeLabRequest({natom}),/integer/);
assert.throws(()=>thermalBridgeReference({degeneracy:2}),/integer/);
const mutated=thermalOscillatorReference();mutated.levels[0].probability=99;assert.notEqual(thermalOscillatorReference().levels[0].probability,99);
assert.ok(Object.isFrozen(THERMAL_CONSTANTS));
assert.deepEqual(THERMAL_BRIDGE_HOOKS,{'thermal-oscillator':['oscillator-probabilities']});
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/material-research.json',import.meta.url),'utf8'));
assert.ok(catalog.lessons.some(l=>l.id==='thermal-oscillator'&&l.module==='thermo'));
assert.equal(thermalBridgeHTML('thermal-data'),'');assert.equal(thermalBridgeHTML('__proto__'),'');

let fetches=0,workers=0,writes=0,focused=null;
globalThis.fetch=()=>{fetches++;throw Error('Local bridge must not fetch');};
globalThis.Worker=class{constructor(){workers++;throw Error('Local bridge must not start Python');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
Element.prototype.focus=function(){focused=this;};
function mount(store=new Map(),onOpenLab,implementation={thermalBridgeHTML,bindThermalLearningBridge}){
 const root=new Container();root.innerHTML=implementation.thermalBridgeHTML('thermal-oscillator');let alive=true;
 const cleanup=implementation.bindThermalLearningBridge({root,lessonId:'thermal-oscillator',stateStore:store,isCurrent:()=>alive,onOpenLab});
 const $=name=>root.querySelector('#thb-thermal-oscillator-'+name);
 return{root,$,cleanup,store,leave(){alive=false;},choose(name,value){const node=$(name);assert.ok(node,name);node.value=String(value);node.onchange();},
  input(name,value){const node=$(name);node.value=String(value);node.oninput();},click(name){const node=$(name);assert.ok(node,name);assert.equal(node.disabled,false);return node.onclick();}};
}
const copied=[],view=mount(new Map(),request=>{copied.push(request);});
assert.equal(copied.length,0,'Binding does not copy or run');assert.equal(view.root.querySelector('[data-thb-bridge]').getAttribute('open'),null);
assert.equal(view.$('temperature').getAttribute('step'),'any');assert.equal(view.root.querySelectorAll('.thb-stage').length,5);
assert.ok(view.root.querySelectorAll('a').some(a=>a.getAttribute('href')==='#classroom/observables?tab=learn&lesson=acoustic-optical'));
for(let i=0;i<3;i++)assert.equal(view.$('check'+i).disabled,true);
const choices=[['energy','heat','half'],['add','frequency','one'],['same','half','zero']];
for(let i=0;i<3;i++){
 const messages=[];
 for(const choice of choices[i]){view.choose('q'+i,choice);assert.equal(view.$('feedback'+i).textContent,'');view.click('check'+i);messages.push(view.$('feedback'+i).textContent);assert.equal(view.$('feedback'+i).getAttribute('class').includes('thb-correct'),choice===choices[i][0]);}
 assert.equal(new Set(messages).size,3,'Each option has a targeted explanation');
 view.choose('q'+i,choices[i][0]);view.click('check'+i);
}
const detail=view.root.querySelector('[data-thb-bridge]');detail.open=true;
const derivation=view.root.querySelector('[data-thb-native="derivation"]');derivation.open=true;
const nativeSlope=view.root.querySelector('[data-thb-native="slope"]');nativeSlope.open=true;
const slider=view.$('temperature'),sliderEvent=slider.oninput;
view.input('temperature',.37);assert.equal(view.$('temperature'),slider,'Range input must preserve its live node while dragging');
assert.equal(view.root.querySelector('[data-thb-native="derivation"]'),derivation,'Local updates retain real native disclosures');
assert.equal(view.cleanup.snapshot()['oscillator-probabilities'].temperature,.37);
view.click('texact');assert.equal(Number(slider.value),THERMAL_EXACT_TEMPERATURE);assert.ok(view.root.querySelector('.thb-exact'));
assert.match(view.$('probabilities').textContent,/63\/64/);assert.match(view.$('probabilities').textContent,/1\/64/);
view.choose('reference','shifted');assert.match(view.$('energy').textContent,/既有实验仍保留零点能/);
view.choose('unit','meV');assert.equal(view.$('temperature'),slider);
view.choose('natom',1);view.choose('degeneracy',3);assert.match(view.$('units').textContent,/3 个模式/);
view.input('temperature',.37);
const note=view.$('note');view.input('note','未提交解释 <img src=x onerror=alert(1)>');assert.equal(view.$('note'),note);
await view.click('copy');assert.equal(copied.length,1);assert.deepEqual(copied[0],thermalBridgeLabRequest({temperature:.37,natom:1}));
assert.match(view.$('copy-status').textContent,/手动运行/);copied[0].input.theta_e=999;assert.equal(thermalBridgeLabRequest().input.theta_e,400);
view.choose('q1','frequency');assert.equal(view.$('feedback1').textContent,'','An unsubmitted prediction remains unsubmitted');
// Capture the actual native .open state even before queued toggle events.
detail.open=false;const snapshot=view.cleanup.snapshot()['oscillator-probabilities'];
assert.equal(snapshot.open,false);assert.equal(snapshot.derivationOpen,true);assert.equal(snapshot.slopeOpen,true);
snapshot.temperature=999;assert.equal(view.cleanup.snapshot()['oscillator-probabilities'].temperature,.37);
const retiredToggle=derivation.ontoggle,retiredReset=view.$('reset').onclick;
view.cleanup();sliderEvent();retiredToggle();retiredReset();
const back=mount(view.store,()=>{});
assert.equal(back.$('note').value,'未提交解释 <img src=x onerror=alert(1)>');assert.equal(back.root.querySelector('img'),null);
assert.equal(back.$('q1').value,'frequency');assert.equal(back.$('feedback1').textContent,'');assert.match(back.$('feedback0').getAttribute('class'),/thb-correct/);
assert.equal(back.$('reference').value,'shifted');assert.equal(back.$('natom').value,'1');assert.equal(back.$('unit').value,'meV');
assert.equal(Number(back.$('temperature').value),.37);assert.match(back.$('copy-status').textContent,/已复制/);
assert.equal(back.root.querySelector('[data-thb-bridge]').getAttribute('open'),null);
assert.notEqual(back.root.querySelector('[data-thb-native="derivation"]').getAttribute('open'),null);
assert.notEqual(back.root.querySelector('[data-thb-native="slope"]').getAttribute('open'),null);
const obsolete=back.$('reset').onclick;back.click('reset');const resetState=back.cleanup.snapshot();obsolete();assert.deepEqual(back.cleanup.snapshot(),resetState);
assert.equal(back.$('note').value,'');assert.equal(focused,back.$('natom'));
back.click('t0');assert.match(back.$('probabilities').textContent,/零温/);assert.doesNotMatch(back.$('probabilities').innerHTML,/NaN|Infinity/);
const noCallback=mount();assert.equal(noCallback.$('copy'),null);assert.ok(noCallback.root.querySelectorAll('a').some(a=>a.getAttribute('href')==='#compute/phonon-thermo'));
assert.match(noCallback.root.querySelector('[data-thb-body]').textContent,/普通链接不传递这里的温度/);
const stale=back.$('reset').onclick;back.leave();const before=back.cleanup.snapshot();stale();assert.deepEqual(back.cleanup.snapshot(),before);back.cleanup();

let resolveCopy;const waiting=mount(new Map(),()=>new Promise(resolve=>{resolveCopy=resolve;}));
const opening=waiting.click('copy');assert.equal(waiting.$('copy').disabled,true);waiting.cleanup();waiting.root.innerHTML='<p>Another lesson</p>';resolveCopy();await opening;
assert.equal(waiting.$('copy-status'),null,'Retired asynchronous handoff must not update a replacement lesson');
const declined=mount(new Map(),()=>false);await declined.click('copy');assert.match(declined.$('copy-status').textContent,/暂未复制/);
const rejecting=mount(new Map(),()=>{throw Error('<img src=x>');});await rejecting.click('copy');assert.equal(rejecting.$('copy-status').textContent,'<img src=x>');assert.equal(rejecting.root.querySelector('img'),null);
const poisoned=mount(new Map([['thermal-oscillator:oscillator-probabilities',{temperature:Infinity,natom:1/3,reference:'__proto__',unit:'<script>',choices:['<img>'],note:'<img src=x>',copyOutcome:'error',copyError:'<img src=x>'}]]));
assert.equal(poisoned.$('temperature').value,'400');assert.equal(poisoned.$('natom').value,'2');assert.equal(poisoned.$('q0').value,'');assert.equal(poisoned.root.querySelector('img'),null);
for(const item of [noCallback,declined,rejecting,poisoned])item.cleanup();

// Apply the actual production translation extraction/replacement rules in
// memory. The parent owns catalog registration and generated English output.
const sourceURL=new URL('../dist/thermal-learning-bridge.js',import.meta.url),source=fs.readFileSync(sourceURL,'utf8');
const locale=JSON.parse(fs.readFileSync(new URL('../locales/en-thermal-learning-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(s=>textUnits(s.value)))];
assert.deepEqual(units.filter(unit=>!Object.hasOwn(locale,unit.trim())),[],'All source prose units need reviewed translations in the owned locale');
assert.deepEqual(Object.keys(locale).filter(key=>!units.map(x=>x.trim()).includes(key)),[],'Locale entries match actual source units');
for(const translated of Object.values(locale))assert.equal(HAN.test(translated),false);
const translate=text=>{if(!HAN.test(text))return text;const key=text.trim();assert.ok(Object.hasOwn(locale,key),key);return locale[key];};
const escapeTemplate=text=>text.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
const edits=jsStrings(source).flatMap(item=>{const translated=replaceUnits(item.value,translate);return translated===item.value?[]:[{...item,replacement:item.type==='literal'?JSON.stringify(translated):escapeTemplate(translated)}];});
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.replacement+englishSource.slice(edit.end);
englishSource=englishSource.replace(/from '(\.\/math-display\.js\?[^']+)'/,(_m,part)=>'from '+JSON.stringify(new URL(part,sourceURL).href));
const english=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(englishSource));
assert.deepEqual(english.thermalBridgeLabRequest({temperature:.37,natom:1}),thermalBridgeLabRequest({temperature:.37,natom:1}));
const en=mount(new Map(),()=>{},english);en.click('texact');en.choose('reference','shifted');en.choose('q0','half');en.click('check0');await en.click('copy');
assert.equal(HAN.test(en.root.querySelector('[data-thb-body]').textContent),false,'Bound English UI contains no untranslated Chinese prose');
assert.match(en.$('feedback0').textContent,/number operator/);assert.match(en.$('copy-status').textContent,/manually/);en.cleanup();
assert.equal(fetches,0);assert.equal(workers,0);assert.equal(writes,0);
const css=fs.readFileSync(new URL('../dist/thermal-learning-bridge.css',import.meta.url),'utf8');
assert.match(css,/font-size:18px/);assert.match(css,/\.thb-formula\{[^}]*overflow-x:auto[^}]*font-size:22px/);
assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/\.thb-formula\{font-size:21px/);assert.match(css,/summary:focus-visible/);
console.log(`Thermal bridge passed: ${comparisons} independent mode/cell ledgers, finite number-state probabilities and variance, low-temperature relative checks, exact tail, units/slope/reference shifts, actual handlers and native state retention, unrounded manual handoff, stale events/async protection, ${Object.keys(locale).length} complete English units, and zero worker/network/mastery writes.`);
