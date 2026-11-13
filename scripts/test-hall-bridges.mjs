import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';
import {HALL_BRIDGE_HOOKS,hallBridgeHTML,bindHallBridges,closedOverlapLoop,qwzLowerState,hallPhaseReference,HALL_BRIDGE_KB_EV as KB,fermiReference,hallOccupationReference} from '../dist/hall-bridges.js';

const near=(actual,expected,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected} within ${tolerance}`);
// Independent complex matrix algebra for projectors; it does not construct
// eigenvectors or call the production overlap implementation a second time.
const z=(re,im=0)=>[re,im],plus=(a,b)=>z(a[0]+b[0],a[1]+b[1]),times=(a,b)=>z(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]);
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>plus(sum,times(v,b[k][j])),z(0))));
const trace=a=>a.reduce((sum,row,i)=>plus(sum,row[i]),z(0));
const analyticProjector=(x,y,m)=>{const dx=Math.sin(x),dy=Math.sin(y),dz=m+Math.cos(x)+Math.cos(y),r=Math.hypot(dx,dy,dz);return [[z((1-dz/r)/2),z(-dx/(2*r),dy/(2*r))],[z(-dx/(2*r),-dy/(2*r)),z((1+dz/r)/2)]];};
for(const m of [-1,3])for(const [x,y]of [[0,0],[.1,.2],[1,0],[-Math.PI,Math.PI],[2,2]]){
 const actual=qwzLowerState(x,y,m),expected=analyticProjector(x,y,m);
 actual.projector.forEach((row,i)=>row.forEach((value,j)=>value.forEach((v,k)=>near(v,expected[i][j][k]))));
 near(actual.state.reduce((sum,value)=>sum+value[0]**2+value[1]**2,0),1);
}
assert.throws(()=>qwzLowerState(0,0,-2),/degenerate/);
assert.throws(()=>qwzLowerState(Infinity,0,-1),/finite/);

// Four explicit latitude states have raw Bargmann product (7+24i)/64.
// Its finite polygon is not the smooth latitude's full-circle Berry phase.
const latitude=[0,Math.PI/2,Math.PI,3*Math.PI/2].map(phi=>[z(Math.sqrt(3)/2),z(.5*Math.cos(phi),.5*Math.sin(phi))]);
const latitudeLoop=closedOverlapLoop(latitude);
near(latitudeLoop.rawProduct[0],7/64);near(latitudeLoop.rawProduct[1],24/64);
near(latitudeLoop.phase,-Math.atan2(24,7));
assert.ok(Math.abs(latitudeLoop.phase+Math.PI/2)>.1);
const latitudeReverse=closedOverlapLoop([latitude[0],latitude[3],latitude[2],latitude[1]]);
near(latitudeReverse.phase,-latitudeLoop.phase);
assert.throws(()=>closedOverlapLoop([[[1,0],[0,0]],[[0,0],[1,0]],[[1,0],[0,0]]]),/overlap vanishes/);
assert.throws(()=>closedOverlapLoop([[[0,0],[0,0]],[[1,0],[0,0]],[[1,0],[0,0]]]),/nonzero/);
assert.throws(()=>closedOverlapLoop([[[NaN,0],[0,0]],latitude[1],latitude[2]]),/finite/);

for(const mass of [-1,3])for(const step of [Math.PI/3,Math.PI/6,Math.PI/12,.001]){
 const actual=hallPhaseReference({mass,step}),points=[[0,0],[step,0],[step,step],[0,step]],product=points.map(([x,y])=>analyticProjector(x,y,mass)).reduce(mm,[[z(1),z(0)],[z(0),z(1)]]),raw=trace(product);
 near(actual.base.phase,-Math.atan2(raw[1],raw[0]));near(actual.base.phase,actual.changed.phase);
 assert.ok(actual.projectorResidual<1e-14);
 const reversed=hallPhaseReference({mass,step,reverse:true});
 assert.deepEqual(reversed.cornerOrder,[1,4,3,2]);
 near(reversed.changed.phase,-actual.changed.phase);near(reversed.signedArea,-actual.signedArea);near(reversed.estimate,actual.estimate);
}
near(hallPhaseReference({step:.001}).estimate,.5,1e-6);
near(hallPhaseReference({step:.001,mass:3}).estimate,1/50,1e-8);
near(hallPhaseReference({mass:3}).originCurvature,1/50);
assert.equal(hallPhaseReference({mass:3}).fullZoneChernReference,0);
const ray=hallPhaseReference().ray;
near(ray.squaredOverlap,1);near(ray.relativeSquaredOverlap,0);
ray.probabilities.forEach(value=>near(value,.5));
assert.notDeepEqual(ray.projector,ray.relativeProjector);
for(let n=0;n<61;n++){
 const gauge=[.17*n,-.29*n,.31*n,1.1-.07*n],actual=hallPhaseReference({gauge});
 near(actual.base.phase,actual.changed.phase);assert.ok(actual.projectorResidual<1e-14);
}
assert.throws(()=>hallPhaseReference({gauge:[0,0,NaN,0]}),/Unsupported/);
assert.throws(()=>hallPhaseReference({mass:0}),/Unsupported/);

// Occupation/entropy benchmarks computed from elementary analytic values.
const analyticTemperature=1/(KB*Math.log(3)),quarter=fermiReference(1,0,analyticTemperature);
near(quarter.f,.25);near(quarter.binaryEntropy,Math.log(4)-.75*Math.log(3));
near(hallOccupationReference({temperature:analyticTemperature}).occupiedWeight,.25);
for(const [energy,mu,expected]of [[-1,0,1],[1,0,0],[1,1,.5]])near(fermiReference(energy,mu,0).f,expected);
assert.equal(fermiReference(1,1,0).threshold,true);near(fermiReference(1,1,0).binaryEntropy,Math.LN2);assert.equal(fermiReference(1,1,0).transportEntropy,0);
near(hallOccupationReference().occupiedWeight,.5);assert.equal(hallOccupationReference().entropyWeight,0);
for(const mu of [-4,4]){
 const zero=hallOccupationReference({chemicalPotential:mu,temperature:0});assert.equal(zero.occupiedWeight,0);assert.equal(zero.entropyWeight,0);
 const warm=hallOccupationReference({chemicalPotential:mu,temperature:300});assert.ok(warm.occupiedWeight>0&&warm.occupiedWeight<1e-40,'Finite-temperature tails do not become a false exact cancellation');
}
for(const T of [1,300,5000,analyticTemperature])for(const mu of [0,.1,1,4]){
 const positive=hallOccupationReference({chemicalPotential:mu,temperature:T}),negative=hallOccupationReference({chemicalPotential:-mu,temperature:T});
 near(positive.occupiedWeight,negative.occupiedWeight,1e-14);near(positive.entropyWeight,-negative.entropyWeight,1e-14);
 if(mu===0)assert.equal(positive.entropyWeight,0);
 for(const item of [positive.lower,positive.upper])assert.ok(item.f>=0&&item.f<=1&&item.binaryEntropy>=0&&item.binaryEntropy<=Math.LN2+1e-15);
}
for(const energy of [-1e300,1e300]){const tail=fermiReference(energy,0,1e-300);assert.ok(Number.isFinite(tail.binaryEntropy));assert.equal(tail.binaryEntropy,0);}
assert.throws(()=>fermiReference(1,0,-1),/negative/);assert.throws(()=>fermiReference(1,'0',300),/finite/);

const lessons=JSON.parse(fs.readFileSync(new URL('../dist/data/hall-response-content.json',import.meta.url),'utf8')).lessons;
assert.deepEqual(Object.keys(HALL_BRIDGE_HOOKS),['hall-occupation','hall-entropy','hall-diagnostics']);
for(const id of Object.keys(HALL_BRIDGE_HOOKS))assert.ok(lessons.some(lesson=>lesson.id===id));
assert.equal(hallBridgeHTML('unknown-future'), '');assert.equal(hallBridgeHTML('__proto__'),'');
let network=0,workers=0,storage=0,focused=null;
globalThis.fetch=()=>{network++;throw Error('The prerequisite must not fetch');};globalThis.Worker=class{constructor(){workers++;throw Error('The prerequisite must not start Python');}};
globalThis.localStorage={getItem:()=>null,setItem:()=>{storage++;}};Element.prototype.focus=function(){focused=this;};
function mount(lessonId='hall-occupation',stateStore=new Map()){
 const root=new Container();root.innerHTML=hallBridgeHTML(lessonId);let current=true;
 const cleanup=bindHallBridges({root,lessonId,stateStore,isCurrent:()=>current});
 return {root,cleanup,stateStore,leave(){current=false;}};
}
function controls(view,id){const $=suffix=>view.root.querySelector('#hb-'+id+'-'+suffix);return{$,choose(suffix,value){const control=$(suffix);assert.ok(control,suffix);control.value=value;control.onchange();},click(suffix){const control=$(suffix);assert.ok(control,suffix);assert.equal(control.disabled,false,suffix+' is disabled');control.onclick();}};}
const host=mount(),p=controls(host,'phase-rays');
assert.equal(host.root.querySelectorAll('[data-hb-bridge]').length,2);
for(const detail of host.root.querySelectorAll('[data-hb-bridge]')){assert.equal(detail.tag,'details');assert.ok(detail.querySelector('summary'));assert.equal(detail.getAttribute('open'),null);assert.equal(detail.querySelector('summary').onkeydown,undefined);}
assert.equal(p.$('run').disabled,true);assert.equal(p.$('check').disabled,true);
p.choose('choice','all');p.click('run');p.click('check');assert.match(p.$('feedback').textContent,/单边重叠/);assert.doesNotMatch(p.$('feedback').attributes.class,/hb-correct/);
assert.equal(focused,p.$('check'));
const oldRun=p.$('run'),oldHandler=oldRun.onclick;p.choose('choice','invariant');const waiting=host.root.querySelector('[data-hb-body="phase-rays"]').innerHTML;oldHandler();assert.equal(host.root.querySelector('[data-hb-body="phase-rays"]').innerHTML,waiting);
p.click('run');p.click('check');assert.match(p.$('feedback').attributes.class,/hb-correct/);assert.match(host.root.querySelector('[data-hb-body="phase-rays"]').innerHTML,/投影算子/);
assert.ok(host.root.querySelector('[data-hb-body="phase-rays"]').querySelector('.hb-choice-reading'),'Long selected choices remain readable outside native select clipping');
p.choose('step','small');assert.equal(p.$('check').disabled,true);assert.equal(p.$('feedback').textContent,'');p.click('run');p.click('check');
const detail=host.root.querySelector('[data-hb-bridge="phase-rays"]');detail.open=true;detail.ontoggle();
let variant=host.root.querySelector('[data-hb-body="phase-rays"]').querySelector('.hb-variant');variant.open=true;variant.ontoggle();
p.choose('variant-choice','reverse');p.click('variant-run');p.click('variant-check');assert.match(p.$('variant-feedback').attributes.class,/hb-correct/);assert.notEqual(host.root.querySelector('[data-hb-body="phase-rays"]').querySelector('.hb-variant').getAttribute('open'),null);
variant.open=false;variant.ontoggle();assert.equal(host.cleanup.snapshot()['phase-rays'].variantOpen,true,'An obsolete native toggle cannot alter the current disclosure');
p.choose('variant-mode','relative');assert.equal(p.$('variant-choice').value,'');assert.equal(p.$('variant-check').disabled,true);p.choose('variant-choice','changed');p.click('variant-run');p.click('variant-check');assert.match(p.$('variant-feedback').attributes.class,/hb-correct/);assert.match(p.$('variant-feedback').textContent,/非对角元改变/);
p.choose('variant-mode','trivial');p.choose('variant-choice','flat');p.click('variant-run');p.click('variant-check');assert.doesNotMatch(p.$('variant-feedback').attributes.class,/hb-correct/);p.choose('variant-choice','local');p.click('variant-run');p.click('variant-check');assert.match(p.$('variant-feedback').attributes.class,/hb-correct/);
let ids=host.root.querySelectorAll('[id]').map(node=>node.id);assert.equal(ids.length,new Set(ids).size,'Main and variant SVG markers and controls have unique IDs');
const phaseSnapshot=host.cleanup.snapshot();phaseSnapshot['phase-rays'].choice='all';assert.equal(host.cleanup.snapshot()['phase-rays'].choice,'invariant','Snapshots cannot mutate live state');
const retainedMap=host.stateStore,priorKeys=retainedMap.size,oldReset=p.$('reset').onclick;host.cleanup();oldReset();assert.equal(retainedMap.size,priorKeys);
const back=mount('hall-occupation',retainedMap),b=controls(back,'phase-rays');assert.equal(b.$('step').value,'small');assert.equal(b.$('choice').value,'invariant');assert.match(b.$('variant-feedback').attributes.class,/hb-correct/);assert.notEqual(back.root.querySelector('[data-hb-bridge="phase-rays"]').getAttribute('open'),null);
const another=mount('hall-entropy',retainedMap);assert.equal(controls(another,'phase-rays').$('choice').value,'','Different origin lessons retain independent local experiments');

const o=controls(back,'fermi-weights');o.choose('choice','positive');o.click('run');o.click('check');assert.match(o.$('feedback').attributes.class,/hb-correct/);
o.choose('kernel','entropy');assert.equal(o.$('check').disabled,true);o.choose('choice','zero');o.click('run');o.click('check');assert.match(o.$('feedback').attributes.class,/hb-correct/);assert.match(o.$('feedback').textContent,/零温输运/);
o.choose('temperature','5000');o.choose('mu','0');o.click('run');o.click('check');assert.match(o.$('feedback').attributes.class,/hb-correct/);assert.match(o.$('feedback').textContent,/熵加权逐点抵消/);
o.choose('mu','1');o.choose('choice','negative');o.click('run');o.click('check');assert.match(o.$('feedback').attributes.class,/hb-correct/);
o.choose('variant-choice','cancel');o.click('variant-run');o.click('variant-check');assert.match(o.$('variant-feedback').attributes.class,/hb-correct/);
o.choose('variant-mode','empty');o.choose('variant-choice','cancel');o.click('variant-run');o.click('variant-check');assert.match(o.$('variant-feedback').attributes.class,/hb-correct/);
o.choose('variant-mode','symmetric');o.choose('variant-choice','entropy');o.click('variant-run');o.click('variant-check');assert.match(o.$('variant-feedback').attributes.class,/hb-correct/);
o.choose('mu','4');assert.equal(o.$('variant-check').disabled,true,'Changing shared physical inputs revokes the variant check');o.choose('temperature','300');o.choose('kernel','occupation');o.choose('choice','zero');o.click('run');o.click('check');assert.doesNotMatch(o.$('feedback').attributes.class,/hb-correct/,'A tiny finite-T tail is not falsely graded as exact zero');
o.click('reset');assert.equal(o.$('choice').value,'');assert.equal(o.$('temperature').value,'0');assert.equal(focused,o.$('choice'));
const stale=controls(another,'fermi-weights').$('reset').onclick;another.leave();const untouched=another.root.innerHTML;stale();assert.equal(another.root.innerHTML,untouched);
const staleElement=b.$('reset'),beforeReplace=retainedMap.get('hall-occupation:phase-rays');back.root.innerHTML='<p>Different course</p>';staleElement.onclick();assert.deepEqual(retainedMap.get('hall-occupation:phase-rays'),beforeReplace);
const polluted=new Map([['hall-occupation:phase-rays',{choice:'<img src=x onerror=alert(1)>',gauge:'__proto__',step:'Infinity',open:true,variantMode:'__proto__'}]]),safe=mount('hall-occupation',polluted);assert.equal(controls(safe,'phase-rays').$('choice').value,'');assert.equal(safe.root.querySelector('img'),null);
safe.cleanup();back.cleanup();another.cleanup();
assert.equal(network,0);assert.equal(workers,0);assert.equal(storage,0,'No original progress or persistent preference writes');
const css=fs.readFileSync(new URL('../dist/hall-bridges.css',import.meta.url),'utf8');
assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/\.hb-formula\{[^}]*font-size:22px/);assert.match(css,/\.hb-formula\{[^}]*overflow-x:auto/);assert.match(css,/font-size:21px/);assert.match(css,/summary:focus-visible/);
console.log('Hall prerequisites: independent projector/Bargmann checks, 61 local gauge choices, oriented QWZ loop limit, relative-state counterexample, stable finite-T occupation/entropy, zero-T threshold convention, both empty/full and symmetric entropy cases; actual prediction/variation handlers, state retention, native disclosures, stale guards and zero worker/network/progress writes passed.');
