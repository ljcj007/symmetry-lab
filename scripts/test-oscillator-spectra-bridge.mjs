import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {HAN,jsStrings,textUnits,replaceUnits} from './english-source.mjs';
import {OSCILLATOR_SPECTRA_BRIDGE_HOOKS,OSCILLATOR_SPECTRA_REFERENCE,OSCILLATOR_HALF_RATIO_TEMPERATURE,
 oscillatorLadderAction,oscillatorLadderMatrix,oscillatorScatteringReference,oscillatorVacuumReference,
 oscillatorFiniteBoundary,oscillatorSpectraLabRequest,oscillatorSpectraBridgeHTML,bindOscillatorSpectraBridge} from '../dist/oscillator-spectra-bridge.js';

const near=(actual,expected,tolerance=4e-13)=>{
 if(expected===0)assert.equal(actual,0);
 else assert.ok(Math.abs(actual/expected-1)<=tolerance,`${actual} versus ${expected}`);
};
const sum=values=>{let total=0,error=0;for(const value of values){const adjusted=value-error,next=total+adjusted;error=(next-total)-adjusted;total=next;}return total;};
const multiply=(a,b)=>a.map(row=>b[0].map((_v,j)=>sum(row.map((v,k)=>v*b[k][j]))));
const transpose=a=>a[0].map((_v,j)=>a.map(row=>row[j]));
// Construct by hand from its number-state action, independently of the module.
const numberOperators=N=>{
 const b=Array.from({length:N+1},()=>Array(N+1).fill(0));
 for(let j=1;j<=N;j++)b[j-1][j]=Math.sqrt(j);
 return{b,c:transpose(b)};
};
assert.deepEqual(OSCILLATOR_SPECTRA_BRIDGE_HOOKS,{
 'scattering-temperature':['ladder-weights'],'polaron-hamiltonian':['vacuum-motion'],'polaron-truncation':['finite-boundary']});
assert.ok(Object.isFrozen(OSCILLATOR_SPECTRA_REFERENCE));
near(OSCILLATOR_HALF_RATIO_TEMPERATURE,565.202556547,1e-12);
for(let m=0;m<=10;m++)for(const create of [false,true]){
 const action=oscillatorLadderAction({m,create}),strength=create?m+1:m;
 near(action.amplitude,Math.sqrt(strength));assert.equal(action.strength,strength);
 assert.equal(action.target,strength?m+(create?1:-1):null);
 assert.equal(action.deltaQuanta,strength?(create?1:-1):null);
}
for(const create of [false,true]){
 const rectangular=oscillatorLadderMatrix({create});
 assert.equal(rectangular.matrix.length,7);assert.ok(rectangular.matrix.every(row=>row.length===6));
 for(let m=0;m<6;m++)for(let target=0;target<=6;target++){
  const nonzero=target===m+(create?1:-1);
  near(rectangular.matrix[target][m],nonzero?Math.sqrt(create?m+1:m):0);
 }
}
const lastCreation=oscillatorLadderMatrix().matrix[6][5];near(lastCreation,Math.sqrt(6));
// Finite sums of unnormalized Boltzmann weights, with compensated summation.
// They do not call the module's geometric tail or Bose-occupation expressions.
let independentLedgers=0;
for(const T of [0,.37,5,10,20,100,300,OSCILLATOR_HALF_RATIO_TEMPERATURE,1500]){
 const eps=33.76000230359114,kB=.08617333262145,W=.014377525835849128;
 const weights=Array.from({length:4096},(_,m)=>T===0?(m===0?1:0):Math.exp(-m*eps/(kB*T)));
 const z=sum(weights),probabilities=weights.map(value=>value/z);
 const downward=sum(probabilities.map((p,m)=>p*m)),upward=sum(probabilities.map((p,m)=>p*(m+1)));
 for(let m=0;m<6;m++)for(const create of [false,true]){
  const ref=oscillatorScatteringReference({temperature:T,m,create});
  near(ref.occupation,downward);near(ref.total.annihilation,downward);near(ref.total.creation,upward);
  near(ref.visible.probability,sum(probabilities.slice(0,6)));
  near(ref.visible.annihilation,sum(probabilities.slice(0,6).map((p,j)=>j*p)));
  near(ref.visible.creation,sum(probabilities.slice(0,6).map((p,j)=>(j+1)*p)));
  near(ref.tails.probability,sum(probabilities.slice(6)));
  near(ref.tails.annihilation,sum(probabilities.slice(6).map((p,j)=>(j+6)*p)));
  near(ref.tails.creation,sum(probabilities.slice(6).map((p,j)=>(j+7)*p)));
  near(ref.visible.probability+ref.tails.probability,1);
  near(ref.visible.annihilation+ref.tails.annihilation,downward);
  near(ref.visible.creation+ref.tails.creation,upward);
  near(ref.selectedProbability,probabilities[m]);
  near(ref.selectedWeightedStrength,probabilities[m]*(create?m+1:m));
  near(ref.pair.forward,probabilities[m]*(m+1));near(ref.pair.reverse,probabilities[m+1]*(m+1));
  if(ref.pair.forward>0)near(ref.pair.rowRatio,probabilities[m+1]/probabilities[m]);
  else assert.equal(ref.pair.rowRatio,null);
  assert.equal(ref.action.transferEnergyMeV,create?eps:m===0?null:-eps);
  near(ref.peaks.stokes.weight,W*upward);near(ref.peaks.antiStokes.weight,W*downward);
  near(ref.meanX2,upward+downward);assert.equal(ref.meanX,0);independentLedgers++;
 }
}
const exact=oscillatorScatteringReference({temperature:OSCILLATOR_HALF_RATIO_TEMPERATURE});
assert.equal(exact.exactGeometricHalf,true);assert.equal(exact.occupation,1);assert.equal(exact.r,.5);
assert.deepEqual(exact.rows.map(x=>x.probability),[.5,.25,.125,.0625,.03125,.015625]);
assert.deepEqual(exact.tails,{probability:1/64,annihilation:7/64,creation:8/64});
assert.deepEqual(exact.total,{annihilation:1,creation:2});
const finiteNumbers=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finiteNumbers);};
for(const T of [Number.MIN_VALUE,1e-300,.37]){
 const cold=oscillatorScatteringReference({temperature:T});finiteNumbers(cold);
 if(T!==.37){assert.equal(cold.numericalUnderflow,true);assert.equal(cold.coreColdApproximation,true);assert.equal(cold.r,0);}
}
assert.equal(oscillatorScatteringReference({temperature:Number.MIN_VALUE}).ratioOverflow,true);
for(let m=0;m<6;m++){
 const {b,c}=numberOperators(8),X=b.map((row,i)=>row.map((value,j)=>value+c[i][j])),XX=multiply(X,X),ref=oscillatorVacuumReference({m});
 assert.equal(ref.meanX,X[m][m]);near(ref.meanX2,XX[m][m]);near(ref.varianceX,XX[m][m]-X[m][m]**2);
}
for(const cutoff of [2,6,10])for(let m=0;m<=cutoff;m++){
 const {b,c}=numberOperators(cutoff),bc=multiply(b,c),cb=multiply(c,b),ref=oscillatorFiniteBoundary({cutoff,m});
 assert.deepEqual(ref.annihilation,b);assert.deepEqual(ref.creation,c);
 near(ref.bbdag,bc[m][m]);near(ref.bdagb,cb[m][m]);near(ref.commutator,bc[m][m]-cb[m][m]);
 for(let j=0;j<=cutoff;j++)near(ref.commutatorDiagonal[j],bc[j][j]-cb[j][j]);
 assert.equal(ref.finiteCreationTarget,m<cutoff?m+1:null);assert.equal(ref.infiniteCreationTarget,m+1);
 assert.equal(ref.topBoundary,m===cutoff);near(ref.infiniteCreationAmplitude,Math.sqrt(m+1));
}
for(const T of [0,.37,300,OSCILLATOR_HALF_RATIO_TEMPERATURE,1500]){
 const request=oscillatorSpectraLabRequest({temperature:T,m:5,create:false});
 assert.deepEqual(request,{action:'dynamic_scattering_lab',module:'scattering',input:{
  lattice:4,massA:23,massB:35.45,springIntra:2,springInter:2,basisFraction:.5,scatterA:1,scatterB:1,
  angle:0,selectedQ:1.8,temperature:T,sigma:.5,qMin:0,qMax:4,energyMin:-50,energyMax:50,
  energyCutoff:.25,qPoints:81,energyPoints:401,channel:'both'}});
}
for(const bad of [-1,1501,NaN,Infinity,'300',null]){
 assert.throws(()=>oscillatorScatteringReference({temperature:bad}),/temperature/);
 assert.throws(()=>oscillatorSpectraLabRequest({temperature:bad}),/temperature/);
}
for(const m of [-1,.1,11,NaN,Infinity,'0'])assert.throws(()=>oscillatorLadderAction({m}),/integer/);
assert.throws(()=>oscillatorScatteringReference({m:6}),/integer/);
assert.throws(()=>oscillatorVacuumReference({m:6}),/integer/);
assert.throws(()=>oscillatorFiniteBoundary({cutoff:5}),/cutoff/);
assert.throws(()=>oscillatorFiniteBoundary({cutoff:2,m:3}),/integer/);
assert.throws(()=>oscillatorLadderAction({create:1}),/boolean/);
assert.throws(()=>oscillatorLadderMatrix({create:1}),/boolean/);
const changed=oscillatorFiniteBoundary();changed.annihilation[0][1]=99;
assert.notEqual(oscillatorFiniteBoundary().annihilation[0][1],99,'Returned numerical references are independent copies');
for(const unknown of ['thermal-oscillator','future','__proto__'])assert.equal(oscillatorSpectraBridgeHTML(unknown),'');
const pathways=JSON.parse(fs.readFileSync(new URL('../dist/data/pathways-materials.json',import.meta.url),'utf8'));
const bridges=JSON.parse(fs.readFileSync(new URL('../dist/data/bridges-materials.json',import.meta.url),'utf8'));
for(const [data,moduleId,lessonId,presets]of [[pathways,'scattering','scattering-temperature',['scattering-warm','scattering-transverse']],
 [bridges,'polaron','polaron-hamiltonian',['uncoupled']],[bridges,'polaron','polaron-truncation',['truncation-warning']]]){
 assert.ok(data.lessons.some(lesson=>lesson.id===lessonId&&lesson.module===moduleId),'The card hook belongs to an existing lesson');
 const module=data.modules.find(module=>module.id===moduleId);assert.ok(module);
 for(const preset of presets)assert.ok(module.presets.some(item=>item.id===preset),'The ordinary link opens an existing preset');
}

let fetches=0,workers=0,writes=0,focused;
globalThis.fetch=()=>{fetches++;throw Error('Local oscillator card must not fetch');};
globalThis.Worker=class{constructor(){workers++;throw Error('Local oscillator card must not start Python');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{writes++;}};
Element.prototype.focus=function(){focused=this;};
function mount(lessonId='scattering-temperature',store=new Map(),onOpenLab,impl={oscillatorSpectraBridgeHTML,bindOscillatorSpectraBridge}){
 const root=new Container();root.innerHTML=impl.oscillatorSpectraBridgeHTML(lessonId);let alive=true;
 const cleanup=impl.bindOscillatorSpectraBridge({root,lessonId,stateStore:store,onOpenLab,isCurrent:()=>alive});
 const $=name=>root.querySelector('#osb-'+lessonId+'-'+name);
 return{root,$,cleanup,store,leave(){alive=false;},choose(name,value){const node=$(name);assert.ok(node,name);node.value=String(value);node.onchange();},
  input(name,value){const node=$(name);assert.ok(node,name);node.value=String(value);node.oninput();},click(name){const node=$(name);assert.ok(node,name);assert.equal(node.disabled,false,name);return node.onclick();}};
}
const copied=[],view=mount('scattering-temperature',new Map(),request=>{copied.push(request);});
assert.equal(copied.length,0);assert.equal(view.root.querySelector('[data-osb-bridge]').getAttribute('open'),null);
assert.equal(view.root.querySelectorAll('.osb-stage').length,6);assert.equal(view.$('temperature').getAttribute('step'),'any');
assert.equal(view.$('matrix').querySelectorAll('tr').length,8,'Seven target rows plus a header retain the |6> creation target');
for(let i=0;i<3;i++)assert.equal(view.$('check'+i).disabled,true);
for(const [i,choices]of [['sqrt','three','unit','down'],['positive','none','negative','half'],['weighted','same','normalize','clip']].entries()){
 const messages=[];
 for(const choice of choices){view.choose('q'+i,choice);assert.equal(view.$('feedback'+i).textContent,'');view.click('check'+i);messages.push(view.$('feedback'+i).textContent);assert.equal(view.$('feedback'+i).getAttribute('class').includes('osb-correct'),choice===choices[0]);}
 assert.equal(new Set(messages).size,4,'Each prediction option has its own explanation');
 view.choose('q'+i,choices[0]);view.click('check'+i);
}
const detail=view.root.querySelector('[data-osb-bridge]');detail.open=true;
const nativeMatrix=view.root.querySelector('[data-osb-native="matrix"]');nativeMatrix.open=true;
const nativeBoundary=view.root.querySelector('[data-osb-native="boundary"]');nativeBoundary.open=true;
view.click('m2');view.click('step');view.click('step');view.click('step');
assert.match(view.$('action').textContent,/Stokes/);assert.equal(view.cleanup.snapshot()['ladder-weights'].actionStep,3);
view.choose('direction','annihilate');assert.equal(view.cleanup.snapshot()['ladder-weights'].actionStep,0);
view.choose('m',0);for(let i=0;i<3;i++)view.click('step');assert.match(view.$('action').textContent,/零矩阵元/);
const slider=view.$('temperature'),sliderEvent=slider.oninput;
view.input('temperature',.37);assert.equal(view.$('temperature'),slider,'A range drag retains its live input node');
assert.equal(view.root.querySelector('[data-osb-native="matrix"]'),nativeMatrix);
assert.equal(view.root.querySelector('[data-osb-native="boundary"]'),nativeBoundary);
view.click('thalf');assert.equal(Number(slider.value),OSCILLATOR_HALF_RATIO_TEMPERATURE);
assert.match(view.$('tails').textContent,/7\/64/);assert.match(view.$('tails').textContent,/8\/64/);
view.input('note','未提交解释 <img src=x onerror=alert(1)>');assert.equal(view.root.querySelector('img'),null);
view.choose('q1','negative');assert.equal(view.$('feedback1').textContent,'');
await view.click('copy');assert.equal(copied.length,1);assert.deepEqual(copied[0],oscillatorSpectraLabRequest({temperature:OSCILLATOR_HALF_RATIO_TEMPERATURE}));
assert.match(view.$('copy-status').textContent,/手动运行/);
// Capture native state before the queued toggle event and preserve RAM drafts.
detail.open=false;const snapshot=view.cleanup.snapshot()['ladder-weights'];
assert.equal(snapshot.open,false);assert.equal(snapshot.matrixOpen,true);assert.equal(snapshot.boundaryOpen,true);
snapshot.temperature=999;assert.equal(view.cleanup.snapshot()['ladder-weights'].temperature,OSCILLATOR_HALF_RATIO_TEMPERATURE);
const retiredToggle=nativeMatrix.ontoggle,retiredReset=view.$('reset').onclick;view.cleanup();sliderEvent();retiredToggle();retiredReset();
const back=mount('scattering-temperature',view.store,()=>{});
assert.equal(back.$('note').value,'未提交解释 <img src=x onerror=alert(1)>');assert.equal(back.root.querySelector('img'),null);
assert.equal(back.$('q1').value,'negative');assert.equal(back.$('feedback1').textContent,'');assert.match(back.$('feedback0').getAttribute('class'),/osb-correct/);
assert.equal(back.root.querySelector('[data-osb-bridge]').getAttribute('open'),null);
assert.notEqual(back.root.querySelector('[data-osb-native="matrix"]').getAttribute('open'),null);
assert.notEqual(back.root.querySelector('[data-osb-native="boundary"]').getAttribute('open'),null);
assert.equal(Number(back.$('temperature').value),OSCILLATOR_HALF_RATIO_TEMPERATURE);
const staleReset=back.$('reset').onclick;back.click('reset');const resetSnapshot=back.cleanup.snapshot();staleReset();assert.deepEqual(back.cleanup.snapshot(),resetSnapshot);
assert.equal(back.$('note').value,'');assert.equal(focused,back.$('m'));
back.click('t0');assert.doesNotMatch(back.$('ledger').innerHTML,/NaN|Infinity/);assert.match(back.$('pair').textContent,/零温/);
const noCallback=mount();assert.equal(noCallback.$('copy'),null);
assert.ok(noCallback.root.querySelectorAll('a').some(a=>a.getAttribute('href')==='#compute/dynamic-scattering-lab?preset=scattering-warm'));
assert.match(noCallback.root.querySelector('[data-osb-body]').textContent,/普通链接不传递当前温度/);

const vacuum=mount('polaron-hamiltonian',new Map(),()=>{throw Error('Holstein cards cannot copy a thermal input');});
assert.equal(vacuum.$('copy'),null);assert.equal(vacuum.$('temperature'),null);vacuum.choose('m',0);assert.match(vacuum.$('vacuum').textContent,/真空/);
vacuum.choose('m',5);assert.match(vacuum.$('vacuum').textContent,/激发数态/);assert.equal(vacuum.cleanup.snapshot()['vacuum-motion'].m,5);
const finite=mount('polaron-truncation',new Map(),()=>{throw Error('The finite card does not alter the core');});
assert.equal(finite.$('copy'),null);assert.equal(finite.$('temperature'),null);
finite.choose('cutoff',2);assert.equal(finite.$('m').value,'2');finite.choose('m',2);assert.match(finite.$('finite').textContent,/最高层/);
finite.choose('m',1);assert.match(finite.$('finite').textContent,/不在最高层/);
finite.choose('cutoff',10);assert.equal(focused,finite.$('cutoff'));finite.click('top');assert.equal(finite.$('m').value,'10');
assert.equal(finite.$('finite-matrix').querySelectorAll('tr').length,12);
let resolveCopy;const waiting=mount('scattering-temperature',new Map(),()=>new Promise(resolve=>{resolveCopy=resolve;}));
const inFlight=waiting.click('copy');assert.equal(waiting.$('copy').disabled,true);waiting.cleanup();waiting.root.innerHTML='<p>Another lesson</p>';resolveCopy();await inFlight;
assert.equal(waiting.$('copy-status'),null,'Late handoff completion cannot write into a replacement lesson');
let resolveChanged;const changing=mount('scattering-temperature',new Map(),()=>new Promise(resolve=>{resolveChanged=resolve;}));
const changedCopy=changing.click('copy');changing.input('temperature',400);resolveChanged();await changedCopy;
assert.equal(changing.$('copy-status').textContent,'','Changing a copied parameter invalidates the old success message');
assert.equal(changing.$('copy').disabled,false);
const declined=mount('scattering-temperature',new Map(),()=>false);await declined.click('copy');assert.match(declined.$('copy-status').textContent,/暂未复制/);
const rejecting=mount('scattering-temperature',new Map(),()=>{throw Error('<img src=x>');});await rejecting.click('copy');assert.equal(rejecting.$('copy-status').textContent,'<img src=x>');assert.equal(rejecting.root.querySelector('img'),null);
const poisoned=mount('scattering-temperature',new Map([['scattering-temperature:ladder-weights',{temperature:Infinity,m:99,cutoff:99,choices:['<img>'],note:'<img src=x>',copyOutcome:'error',copyError:'<img src=x>'}]]));
assert.equal(poisoned.$('temperature').value,'300');assert.equal(poisoned.$('m').value,'0');assert.equal(poisoned.$('q0').value,'');assert.equal(poisoned.root.querySelector('img'),null);
const retired=finite.$('top').onclick;finite.leave();const finiteBefore=finite.cleanup.snapshot();retired();assert.deepEqual(finite.cleanup.snapshot(),finiteBefore);
const unknownRoot=new Container(),unknown=bindOscillatorSpectraBridge({root:unknownRoot,lessonId:'future'});assert.deepEqual(unknown.snapshot(),{});unknown();
for(const item of [back,noCallback,vacuum,finite,changing,declined,rejecting,poisoned])item.cleanup();

// Use the production prose extraction and replacement rules, while leaving
// registration and generated English assets to the owning integration task.
const sourceURL=new URL('../dist/oscillator-spectra-bridge.js',import.meta.url),source=fs.readFileSync(sourceURL,'utf8');
const locale=JSON.parse(fs.readFileSync(new URL('../locales/en-oscillator-spectra-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(s=>textUnits(s.value)))];
assert.deepEqual(units.filter(unit=>!Object.hasOwn(locale,unit.trim())),[],'All prose and accessibility units need reviewed English');
assert.deepEqual(Object.keys(locale).filter(key=>!units.map(x=>x.trim()).includes(key)),[],'Locale keys correspond to current prose');
for(const translated of Object.values(locale))assert.equal(HAN.test(translated),false);
const translate=text=>{if(!HAN.test(text))return text;assert.ok(Object.hasOwn(locale,text.trim()),text);return locale[text.trim()];};
const escapeTemplate=text=>text.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
const edits=jsStrings(source).flatMap(item=>{const translated=replaceUnits(item.value,translate);return translated===item.value?[]:[{...item,replacement:item.type==='literal'?JSON.stringify(translated):escapeTemplate(translated)}];});
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.replacement+englishSource.slice(edit.end);
englishSource=englishSource.replace(/from '(\.\/math-display\.js\?[^']+)'/,(_m,part)=>'from '+JSON.stringify(new URL(part,sourceURL).href));
const english=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(englishSource));
assert.deepEqual(english.oscillatorSpectraLabRequest({temperature:.37}),oscillatorSpectraLabRequest({temperature:.37}));
for(const lesson of Object.keys(OSCILLATOR_SPECTRA_BRIDGE_HOOKS)){
 const en=mount(lesson,new Map(),()=>{},english);
 if(lesson==='scattering-temperature'){en.click('thalf');en.choose('q0','unit');en.click('check0');await en.click('copy');assert.match(en.$('copy-status').textContent,/manually/);assert.match(en.$('feedback0').textContent,/norm/);}
 else if(lesson==='polaron-hamiltonian')en.choose('m',3);
 else{en.choose('cutoff',10);en.click('top');}
 const body=en.root.querySelector('[data-osb-body]');
 // The adapter caches parent HTML; every currently live leaf is checked too.
 assert.equal(HAN.test(body.textContent),false,'English body starts with no untranslated prose');
 for(const name of ['action','ledger','tails','pair','peaks','vacuum','finite','finite-matrix','copy-status'])if(en.$(name))assert.equal(HAN.test(en.$(name).textContent),false,name);
 en.cleanup();
}
assert.equal(fetches,0);assert.equal(workers,0);assert.equal(writes,0);
const css=fs.readFileSync(new URL('../dist/oscillator-spectra-bridge.css',import.meta.url),'utf8');
assert.match(css,/font-size:18px/);assert.match(css,/\.osb-formula\{[^}]*overflow-x:auto[^}]*font-size:22px/);
assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/\.osb-formula\{font-size:21px/);assert.match(css,/summary:focus-visible/);
console.log(`Oscillator cards passed: ${independentLedgers} independent thermal ledgers; rectangular ladder and finite commutator matrices; zero-point fluctuation and exact tails; actual controls, native disclosures and RAM drafts; unrounded manual handoff and stale events/async guards; ${Object.keys(locale).length} complete English units; zero worker, network or mastery writes.`);
