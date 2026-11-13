import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {jsStrings,textUnits,HAN,replaceUnits} from './english-source.mjs';
import {Element,Container} from './test-material-research-ui.mjs';
import * as bridge from '../dist/onsager-learning-bridge.js';

const {ONSAGER_BRIDGE_HOOKS,onsagerResponseReference,onsagerTransformReference,onsagerDissipationReference,onsagerKelvinReference,onsagerBridgeLabRequest}=bridge;
const near=(x,y,t=2e-12)=>assert.ok(Math.abs(x-y)<=t,`${x} differs from ${y}`);
const nearArray=(x,y)=>{assert.equal(x.length,y.length);x.forEach((v,i)=>Array.isArray(v)?nearArray(v,y[i]):near(v,y[i]));};
const mul=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const tr=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const apply=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
const fnorm=a=>Math.sqrt(a.flat().reduce((s,v)=>s+v*v,0));
const minus=(a,b)=>a.map((row,i)=>row.map((v,j)=>v-b[i][j]));

// Independent direct formulas for the three production model families.
function independent(p,B=p.field,M=p.magnetization){
 const {model,space,a,b,cross:c,odd:d,violation:v}=p,t=B+M;
 if(model==='hall')return space==='c4'?[[.5*(a+b),d*t+v],[-d*t,.5*(a+b)]]:[[a,d*t+v],[-d*t,b]];
 return model==='thermo'?[[a,c+d*t+v],[c-d*t,b]]:[[a,c*t+d+v],[c*t-d,b]];
}
let grid=0;
for(const model of ['hall','thermo','mixed'])for(const space of ['c1','c4','mirror'])for(const reverseM of ['yes','no'])for(const B of [-2.1,0,1.7])for(const M of [-.4,0,.9]){
 const r=onsagerResponseReference({model,space,reverseM,field:B,magnetization:M,a:.7,b:1.8,cross:-.3,odd:.6,violation:.13,forceX:.81,forceY:-.27}),p=r.input,L=independent(p),LR=independent(p,-B,reverseM==='yes'?-M:M),full=independent(p,-B,-M),E=model==='mixed'?[[1,0],[0,-1]]:[[1,0],[0,1]],S=L.map((row,i)=>row.map((v,j)=>(v+L[j][i])/2));
 nearArray(r.L,L);nearArray(r.LR,LR);nearArray(r.fullReverse,full);nearArray(r.J,apply(L,r.X));near(r.entropy,dot(r.X,apply(L,r.X)));near(r.terms.reduce((s,v)=>s+v,0),r.entropy);
 near(r.selectedResidual,fnorm(minus(L,mul(mul(E,tr(LR)),E))));near(r.canonicalResidual,fnorm(minus(L,mul(mul(E,tr(full)),E))));
 const ev=r.eigenvalues;near(ev[0]+ev[1],S[0][0]+S[1][1]);near(ev[0]*ev[1],S[0][0]*S[1][1]-S[0][1]**2);
 if(r.spatial){const R=r.spatial.R,sign=space==='mirror'?-1:1;near(r.spatial.covariance,fnorm(minus(independent(p,sign*B,sign*M),mul(mul(R,L),tr(R)))));}
 grid++;
}
assert.equal(grid,162);
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/connections.json.gz',import.meta.url))));
for(const [key,req]of Object.entries(fixture.requests).filter(([,r])=>r.action==='reciprocity_lab')){
 const r=onsagerResponseReference(req.input),actual=fixture.results[key];
 nearArray(r.L,actual.plot.matrix);nearArray(r.LR,actual.plot.reversed);nearArray(r.J,actual.plot.flux);near(r.entropy,actual.checks.entropy);near(r.eigenvalues[0],actual.summary[2].value);near(r.selectedResidual,actual.summary[0].value);near(r.canonicalResidual,actual.summary[1].value);
 const copy=onsagerBridgeLabRequest({preset:key});assert.equal(copy.module,'reciprocity');assert.equal(copy.action,req.action);assert.deepEqual(copy.input,req.input);copy.input.a=3;assert.equal(onsagerBridgeLabRequest({preset:key}).input.a,req.input.a);
}
assert.throws(()=>onsagerBridgeLabRequest({preset:'__proto__'}),/existing/);
assert.throws(()=>onsagerBridgeLabRequest({forceX:Infinity}),/finite/);
for(const input of [{model:'unknown'},{space:'__proto__'},{reverseM:'maybe'},{field:4},{forceY:NaN},{a:-1}])assert.throws(()=>onsagerResponseReference(input));

for(const kind of ['space','dual','force-only'])for(const angleDegrees of [-180,-37.7,0,30,91,180])for(const scale of [.5,1,1.7320508075688772,3]){
 const r=onsagerTransformReference({kind,angleDegrees,scale});nearArray(apply(r.LPrime,r.XPrime),r.JPrime);near(r.responseResidual,0);near(r.entropy,dot(r.J,r.X));near(r.correctEntropy,r.entropy);
 if(kind==='space'){const angle=angleDegrees*Math.PI/180,Q=[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]];nearArray(r.map,Q);nearArray(r.XPrime,apply(Q,r.X));nearArray(r.JPrime,apply(Q,r.J));nearArray(r.LPrime,mul(mul(Q,r.L),tr(Q)));}
 if(kind==='dual'){nearArray(r.XPrime,[r.X[0]/scale,r.X[1]*scale]);nearArray(r.JPrime,[r.J[0]*scale,r.J[1]/scale]);nearArray(r.LPrime,[[r.L[0][0]*scale*scale,r.L[0][1]],[r.L[1][0],r.L[1][1]/scale/scale]]);near(r.naiveTransposeResidual,0);}
 if(kind==='force-only'){nearArray(r.XPrime,[r.X[0],scale*r.X[1]]);nearArray(r.JPrime,r.J);nearArray(r.LPrime,[[r.L[0][0],r.L[0][1]/scale],[r.L[1][0],r.L[1][1]/scale]]);nearArray(r.entropyMetric,[[1,0],[0,1/scale]]);}
}
const forceOnly=onsagerTransformReference({kind:'force-only'});nearArray(forceOnly.LPrime,[[1,.125],[.25,.7]]);near(forceOnly.correctEntropy,1.024);near(forceOnly.naiveEntropy,1.148);assert.ok(forceOnly.naiveTransposeResidual>.17);
near(onsagerResponseReference({reverseM:'no'}).selectedResidual,.24*Math.SQRT2);near(onsagerResponseReference({reverseM:'no'}).canonicalResidual,0);
assert.equal(onsagerResponseReference({space:'mirror'}).spatial.controlsRetained,false);near(onsagerResponseReference({space:'mirror'}).spatial.covariance,0);assert.ok(onsagerResponseReference({space:'mirror'}).spatial.sameState>1);
near(onsagerDissipationReference({forcePreset:'axis'}).entropy,1);near(onsagerDissipationReference({forcePreset:'negative'}).entropy,-1.6);
for(const model of ['active','hall'])for(const angleDegrees of [-180,-89,-45,0,31.12,90,180])for(const amplitude of [.25,.93751,2]){
 const r=onsagerDissipationReference({model,angleDegrees,amplitude});near(r.entropy,r.symmetricEntropy);near(r.antisymmetricEntropy,0);near(r.antisymmetricTerms.flat().reduce((s,v)=>s+v,0),0);
 if(model==='active')near(r.eigenvalues[0],1.2-Math.sqrt(4.04));else near(r.entropy,1.2*amplitude**2);
}
for(const T of [.1,.271,1,2,7.33,10]){const r=onsagerKelvinReference(T);near(r.Pi,T*r.S);near(r.openFlux[0],0);near(r.isothermalFlux[1]/r.isothermalFlux[0],r.Pi);}
for(const input of [{kind:'bad'},{scale:0},{angleDegrees:181}])assert.throws(()=>onsagerTransformReference(input));
assert.throws(()=>onsagerDissipationReference({amplitude:3}));assert.throws(()=>onsagerKelvinReference(0));

const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/connections-materials.json',import.meta.url),'utf8'));
assert.deepEqual(Object.values(ONSAGER_BRIDGE_HOOKS),[['force-flux'],['dual-transform'],['dissipation-directions']]);
for(const id of Object.keys(ONSAGER_BRIDGE_HOOKS))assert.ok(catalog.lessons.some(l=>l.id===id&&l.module==='reciprocity'));
for(const id of ['unknown','__proto__','neumann'])assert.equal(bridge.onsagerBridgeHTML(id),'');
let network=0,workers=0,storage=0;
globalThis.fetch=()=>{network++;throw Error('Unexpected network');};globalThis.Worker=class{constructor(){workers++;}};globalThis.localStorage={getItem(){storage++;},setItem(){storage++;}};
Element.prototype.focus=function(){};
function mount(lessonId='reciprocity-onsager',stateStore=new Map(),onOpenLab,api=bridge){
 const root=new Container();root.innerHTML=api.onsagerBridgeHTML(lessonId);let active=true;
 const cleanup=api.bindOnsagerLearningBridge({root,lessonId,stateStore,isCurrent:()=>active,onOpenLab});const id=ONSAGER_BRIDGE_HOOKS[lessonId]?.[0];
 const $=key=>root.querySelector('#osb-'+id+'-'+key);
 return{root,cleanup,stateStore,$,leave:()=>active=false,choose(key,value){const node=$(key);node.value=value;node.onchange();},click(key){const node=$(key);assert.equal(node.disabled,false);return node.onclick();},slide(key,value){const node=$(key);node.value=String(value);node.oninput();}};
}
function reveal(v,answer){v.choose('q0',answer);v.click('observe');v.click('next');v.click('next');assert.equal(v.$('next').disabled,true);}
const A=mount();assert.equal(A.$('observe').disabled,true);assert.equal(A.$('check0').disabled,true);
A.choose('q0','zero');A.click('observe');A.click('check0');assert.match(A.$('feedback0').getAttribute('class'),/osb-retry/);assert.match(A.$('feedback0').textContent,/额外指标/);
A.choose('q0','allowed');A.click('check0');assert.match(A.$('feedback0').getAttribute('class'),/osb-correct/);
A.click('next');A.click('next');assert.match(A.$('output').innerHTML,/partial s|状态变量|热力学/);assert.doesNotMatch(A.$('output').innerHTML,/katex-error/);
A.choose('q1','odd');A.click('check1');A.choose('q2','temperature');A.click('check2');assert.match(A.$('feedback1').getAttribute('class'),/osb-correct/);assert.match(A.$('feedback2').getAttribute('class'),/osb-correct/);
const angleNode=A.$('forceAngle');A.slide('forceAngle',31.127);assert.equal(A.$('forceAngle'),angleNode);assert.equal(A.$('feedback0').textContent,'');assert.ok(A.$('output').querySelector('.osb-formula'),'Continuous adjustments keep revealed reference visible');
A.choose('actionSpace','static');assert.equal(A.$('output').querySelector('.osb-formula'),null);A.click('observe');A.click('next');assert.match(A.$('output').innerHTML,/P·E 不是/);assert.doesNotMatch(A.$('output').innerHTML,/熵产生逐项相加/);
A.choose('actionSpace','thermo');reveal(A,'allowed');assert.match(A.$('output').innerHTML,/标量通道/);
const B=mount('reciprocity-spatial-response');reveal(B,'conjugacy');B.choose('q1','states');B.click('check1');B.choose('q2','all');B.click('check2');
B.choose('kind','force-only');reveal(B,'conjugacy');assert.match(B.$('output').innerHTML,/1\.148/);const scaleNode=B.$('scale');B.slide('scale',1.7320508075688772);assert.equal(B.$('scale'),scaleNode);assert.ok(B.$('output').querySelector('.osb-formula'));B.choose('reversal','field');assert.match(B.$('magnetic-output').innerHTML,/0\.339411/);B.choose('reversal','both');assert.ok(B.$('magnetic-output'));
const C=mount('reciprocity-dissipation');reveal(C,'no');C.click('negative');assert.match(C.$('output').innerHTML,/-1\.6/);assert.match(C.$('output').innerHTML,/<svg/);C.choose('model','hall');reveal(C,'no');C.click('negative');C.choose('q1','zero');C.click('check1');assert.match(C.$('feedback1').getAttribute('class'),/osb-correct/);assert.match(C.$('output').innerHTML,/0\.36/);C.slide('forceAngle',-37.1234567);assert.equal(C.cleanup.snapshot()['dissipation-directions'].forceAngle,-37.1234567);

// Capture native state and uncommitted inputs even before queued native events.
const native=A.root.querySelector('[data-osb-native="kelvin"]'),outer=A.root.querySelector('[data-osb-panel]');native.open=true;outer.open=true;A.$('note').value='my variable convention';A.$('q2').value='equal';A.leave();const snap=A.cleanup.snapshot()['force-flux'];assert.equal(snap.open,true);assert.equal(snap.native.kelvin,true);assert.equal(snap.note,'my variable convention');assert.equal(snap.choices[2],'equal');assert.equal(snap.checked[2],false);
const oldReset=A.$('reset').onclick;A.cleanup();oldReset();const back=mount('reciprocity-onsager',A.stateStore);assert.equal(back.$('note').value,'my variable convention');assert.equal(back.$('q2').value,'equal');assert.equal(back.root.querySelector('[data-osb-panel]').open,true);assert.notEqual(back.root.querySelector('[data-osb-native="kelvin"]').getAttribute('open'),null);
const snapshot=back.cleanup.snapshot();snapshot['force-flux'].note='mutated';assert.equal(back.cleanup.snapshot()['force-flux'].note,'my variable convention');
const stale=back.$('reset').onclick,before=back.cleanup.snapshot();back.root.innerHTML='<p>Different lesson</p>';stale();assert.deepEqual(back.cleanup.snapshot(),before);back.cleanup();
const cleared=mount();cleared.choose('q0','allowed');cleared.choose('q0','');assert.equal(cleared.$('observe').disabled,true);cleared.cleanup();
const safe=mount('reciprocity-onsager',new Map([['reciprocity-onsager:force-flux',{open:true,note:'<img src=x>',actionSpace:'__proto__',choices:['<script>'],forceAngle:NaN}]]));assert.equal(safe.root.querySelector('img'),null);assert.equal(safe.$('q0').value,'');assert.equal(safe.$('actionSpace').value,'hall');safe.cleanup();

// No automatic handoff; exact preset inputs, continuous force precision, and
// async stale completions are checked through actual bound controls.
const copies=[];const copy=mount('reciprocity-spatial-response',new Map(),async r=>{copies.push(r);return true;});assert.equal(copies.length,0);
copy.choose('kind','force-only');copy.slide('scale',2.923);copy.choose('preset','onsager-mixed');await copy.click('copy');assert.deepEqual(copies[0],onsagerBridgeLabRequest({preset:'onsager-mixed'}));assert.match(copy.$('copy-status').textContent,/手动运行/);
const copiesC=[];const copyC=mount('reciprocity-dissipation',new Map(),r=>{copiesC.push(r);});copyC.slide('forceAngle',31.123456789);copyC.slide('amplitude',1.137);await copyC.click('copy');const expected=onsagerDissipationReference({angleDegrees:31.123456789,amplitude:1.137});assert.equal(copiesC[0].input.forceX,expected.X[0]);assert.equal(copiesC[0].input.forceY,expected.X[1]);assert.notEqual(copiesC[0].input.forceX,Number(copiesC[0].input.forceX.toFixed(1)));assert.equal(copiesC[0].input.model,'thermo');assert.equal(copiesC[0].input.cross,2);assert.equal(copiesC[0].input.field,0);
let finish;const pending=mount('reciprocity-onsager',new Map(),()=>new Promise(resolve=>{finish=resolve;}));const task=pending.click('copy');assert.equal(pending.$('copy').disabled,true);pending.choose('preset','onsager-domain');finish(true);await task;assert.equal(pending.$('copy-status').textContent,'');assert.equal(pending.$('copy').disabled,false);
let finishRetired;const retired=mount('reciprocity-onsager',new Map(),()=>new Promise(resolve=>{finishRetired=resolve;}));const oldTask=retired.click('copy');retired.cleanup();retired.root.innerHTML='<p>New page</p>';finishRetired(true);await oldTask;assert.equal(retired.root.querySelector('[role="status"]'),null);
const rejection=mount('reciprocity-onsager',new Map(),()=>false);await rejection.click('copy');assert.match(rejection.$('copy-status').textContent,/未完成/);assert.equal(rejection.$('copy').disabled,false);
const noCopy=mount();assert.equal(noCopy.$('copy'),null);assert.ok(noCopy.root.querySelector('a').getAttribute('href').includes('module=reciprocity&lesson=reciprocity-onsager&tab=lab'));
for(const view of [B,C,copy,copyC,pending,rejection,noCopy])view.cleanup();assert.equal(network,0);assert.equal(workers,0);assert.equal(storage,0);

const source=fs.readFileSync(new URL('../dist/onsager-learning-bridge.js',import.meta.url),'utf8'),locale=JSON.parse(fs.readFileSync(new URL('../locales/en-onsager-learning-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(s=>textUnits(s.value)).map(x=>x.trim()).filter(x=>HAN.test(x)))];for(const unit of units)assert.ok(locale[unit],'Missing translation: '+unit);assert.ok(Object.values(locale).every(s=>typeof s==='string'&&s.trim()&&!HAN.test(s)));
// Load the actually translated module without writing generated English files.
let english=source;
for(const item of jsStrings(source).filter(s=>HAN.test(s.value)).sort((a,b)=>b.start-a.start))english=english.slice(0,item.start)+JSON.stringify(replaceUnits(item.value,s=>locale[s.trim()]))+english.slice(item.end);
english=english.replace("'./math-display.js?v=20261113-prose2'",JSON.stringify(pathToFileURL(new URL('../dist/math-display.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')).href));
const en=await import('data:text/javascript;base64,'+Buffer.from(english).toString('base64'));
for(const lessonId of Object.keys(ONSAGER_BRIDGE_HOOKS)){
 const v=mount(lessonId,new Map(),undefined,en),id=ONSAGER_BRIDGE_HOOKS[lessonId][0];reveal(v,{'force-flux':'allowed','dual-transform':'conjugacy','dissipation-directions':'no'}[id]);
 for(const [field,values]of id==='force-flux'?[['actionSpace',['hall','static','thermo']]]:id==='dual-transform'?[['kind',['space','dual','force-only']],['reversal',['both','field']]]:[['model',['active','hall']]])for(const value of values){v.choose(field,value);v.click('observe');v.click('next');v.click('next');for(let i=0;i<3;i++){const node=v.$('q'+i);node.value=node.querySelectorAll('option')[1].value;node.onchange();v.click('check'+i);}const contents=[v.root.innerHTML,...v.root.querySelectorAll('div').map(n=>n.innerHTML),...v.root.querySelectorAll('p').map(n=>n.textContent)].join(' ');assert.equal(HAN.test(contents),false,'English render and feedback contain no Chinese');assert.doesNotMatch(contents,/katex-error/);}
 v.cleanup();
}
const css=fs.readFileSync(new URL('../dist/onsager-learning-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/\.osb-formula\{[^}]*font-size:22px[^}]*overflow-x:auto/);assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/font-size:21px/);assert.match(css,/summary:focus-visible/);
console.log(`Onsager bridge: ${grid} independent response checks, seven genuine Python fixtures, dual and spatial transformations, force-only metric, negative directions, Kelvin conditions, three exact lesson hooks, real prediction/slider/copy handlers, preserved controls/native disclosures/drafts, stale async guards and ${units.length} English units passed; zero network/worker/storage writes.`);
