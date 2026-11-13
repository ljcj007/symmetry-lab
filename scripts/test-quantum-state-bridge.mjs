import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {jsStrings,textUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {Element,Container} from './test-material-research-ui.mjs';
import {QUANTUM_STATE_BRIDGE_HOOKS,quantumStateBridgeHTML,bindQuantumStateBridge,
 coefficientStateReference,pureTwoSpinReference,twoSpinStateReference,partialTraceReference,tripletProjectionReference} from '../dist/quantum-state-bridge.js';
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
const z=(re=0,im=0)=>[re,im],plus=(a,b)=>z(a[0]+b[0],a[1]+b[1]),times=(a,b)=>z(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]),conj=a=>z(a[0],-a[1]);
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>plus(s,times(x,b[k][j])),z())));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const dagger=a=>transpose(a).map(row=>row.map(conj));
const trace=a=>a.reduce((s,row,i)=>plus(s,row[i]),z());
const flatNear=(a,b)=>{assert.equal(a.length,b.length);a.forEach((row,i)=>{assert.equal(row.length,b[i].length);row.forEach((v,j)=>v.forEach((x,k)=>near(x,b[i][j][k])));});};
const rhoA=rho=>Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>plus(rho[2*i][2*j],rho[2*i+1][2*j+1])));
const rhoB=rho=>Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>plus(rho[i][j],rho[2+i][2+j])));
const half=[[z(.5),z()],[z(),z(.5)]];
for(const [kind,purity,total,neg]of [['singlet',1,0,.5],['classical',.5,1,0],['mixed',.25,2,0]]){
 const r=twoSpinStateReference(kind);flatNear(r.rhoA,half);flatNear(r.rhoB,half);
 flatNear(r.rhoA,rhoA(r.rho));flatNear(r.rhoB,rhoB(r.rho));near(r.globalPurity,purity);near(r.globalEntropyBits,total);near(r.negativity,neg);near(r.entropyBits,1);near(r.entropyNats,Math.LN2);
 for(const subsystem of ['A','B'])for(let i=0;i<2;i++)for(let j=0;j<2;j++){
  const p=partialTraceReference(r.rho,subsystem,i,j),expected=(subsystem==='A'?rhoA:rhoB)(r.rho);
  flatNear(p.matrix,expected);assert.equal(p.terms.length,2);
  near(p.sum[0],i===j?.5:0);near(p.sum[1],0);
  for(const term of p.terms){assert.equal(term.row,subsystem==='A'?2*i+term.ignoredIndex:2*term.ignoredIndex+i);assert.equal(term.column,subsystem==='A'?2*j+term.ignoredIndex:2*term.ignoredIndex+j);}
 }
 if(kind!=='singlet'){assert.equal(r.C,null);assert.equal(r.schmidtProbabilities,null);}
}
assert.throws(()=>twoSpinStateReference('__proto__'),/Unknown/);
assert.throws(()=>partialTraceReference([[z()]],'A'),/matrix/);
assert.throws(()=>partialTraceReference(twoSpinStateReference().rho,'C'),/subsystem/);
assert.throws(()=>coefficientStateReference([[z(1),z(1)],[z(),z()]]),/normalized/);

// A genuinely complex off-diagonal rho_B distinguishes C^T C* from C^dagger C.
const generic=coefficientStateReference([[z(.5),z(0,.5)],[z(.5),z(.5)]]);
flatNear(generic.rhoA,[[z(.5),z(.25,.25)],[z(.25,-.25),z(.5)]]);
flatNear(generic.rhoB,[[z(.5),z(.25,-.25)],[z(.25,.25),z(.5)]]);
flatNear(generic.rhoB,rhoB(generic.rho));
assert.notDeepEqual(generic.rhoB,mm(dagger(generic.C),generic.C));
near(generic.schmidtProbabilities[0],.5+Math.SQRT2/4);near(generic.negativity,1/(2*Math.SQRT2));
for(let n=1;n<=43;n++){
 const raw=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>z(Math.sin(n*(i+1)+j),Math.cos(n+(j+1)*2+i))));
 const norm=Math.sqrt(raw.flat().reduce((s,x)=>s+x[0]**2+x[1]**2,0)),C=raw.map(row=>row.map(x=>x.map(v=>v/norm))),r=coefficientStateReference(C);
 flatNear(r.rhoA,rhoA(r.rho));flatNear(r.rhoB,rhoB(r.rho));
 near(trace(r.rhoA)[0],1);near(trace(r.rhoB)[0],1);near(r.schmidtProbabilities.reduce((a,b)=>a+b),1);
 near(r.entropyNats,r.entropyBits*Math.LN2);
}
for(const theta of [0,Math.PI/8,Math.PI/4,Math.PI/3,Math.PI/2])for(const phi of [-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI]){
 const r=pureTwoSpinReference({theta,phi}),p=theta===Math.PI/2?0:Math.cos(theta)**2,q=1-p;
 near(r.rhoA[0][0][0],p);near(r.rhoB[0][0][0],q);near(r.rhoA[0][1][0],0);near(r.rhoB[0][1][1],0);
 near(r.negativity,Math.sqrt(Math.max(0,p*q)),2e-8);near(r.correlationXX,Math.sin(2*theta)*Math.cos(phi));
 near(r.entropyBits,-[p,q].reduce((s,x)=>s+(x>0?x*Math.log2(x):0),0));
}
const singlet=pureTwoSpinReference(),triplet=pureTwoSpinReference({phi:0});
assert.notDeepEqual(singlet.rho,triplet.rho);flatNear(singlet.rhoA,triplet.rhoA);near(singlet.entropyBits,triplet.entropyBits);near(singlet.correlationXX,-1);near(triplet.correlationXX,1);
assert.throws(()=>pureTwoSpinReference({theta:NaN}),/finite/);assert.throws(()=>pureTwoSpinReference({theta:2}),/finite/);

// Genuine saved Python density results supply a separate public-core cross-check.
const bridgeFixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/bridges.json.gz',import.meta.url))));
for(const kind of ['singlet','classical']){
 const key=Object.keys(bridgeFixture.requests).find(k=>bridgeFixture.requests[k].action==='density_matrix_lab'&&bridgeFixture.requests[k].input.initialState===kind);
 assert.ok(key);const s=bridgeFixture.results[key].stateSnapshots[0],r=twoSpinStateReference(kind);
 flatNear(r.rho,s.rho.re.map((row,i)=>row.map((x,j)=>z(x,s.rho.im[i][j]))));near(r.entropyBits,s.entropyA);near(r.negativity,s.negativity);
}
const projection=tripletProjectionReference();
for(const value of Object.values(projection.checks))assert.ok(value<1e-12);
flatNear(projection.W,[[z(1),z(),z(),z()],[z(),z(1/Math.sqrt(2)),z(1/Math.sqrt(2)),z()],[z(),z(),z(),z(1)]]);

// Independent periodic AKLT tensor contraction and Gram-matrix moments verify
// the finite-cut reference without calling the bridge or Python eigensolver.
const rt=Math.sqrt(2/3),a0=[[rt*0,rt],[0,0]],a1=[[-1/Math.sqrt(3),0],[0,1/Math.sqrt(3)]],a2=[[0,0],[-rt,0]];
const realMM=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>s+x*b[k][j],0)));
for(const ref of projection.periodicReferences){
 const coefficients=[];
 for(let index=0;index<3**ref.sites;index++){
  let q=index;const digits=Array(ref.sites).fill(0);for(let j=ref.sites-1;j>=0;j--){digits[j]=q%3;q=Math.floor(q/3);}
  const product=digits.reduce((m,d)=>realMM(m,[a0,a1,a2][d]),[[1,0],[0,1]]);coefficients.push(product[0][0]+product[1][1]);
 }
 const norm=Math.hypot(...coefficients),rows=3**ref.cut[0],columns=3**ref.cut[1];
 const C=Array.from({length:rows},(_,i)=>coefficients.slice(i*columns,(i+1)*columns).map(v=>v/norm));
 const gram=realMM(C,transpose(C));let power=Array.from({length:rows},(_,i)=>Array.from({length:rows},(_,j)=>Number(i===j)));
 for(let k=1;k<=rows;k++){power=realMM(power,gram);near(power.reduce((s,row,i)=>s+row[i],0),ref.probabilities.reduce((s,p)=>s+p**k,0),2e-12);}
 assert.equal(ref.rank,ref.probabilities.length);assert.notEqual(ref.rank,ref.bondVirtualDimension);
}

const density=JSON.parse(fs.readFileSync(new URL('../dist/data/density-content.json',import.meta.url),'utf8')).lessons;
const frontiers=JSON.parse(fs.readFileSync(new URL('../dist/data/frontiers-materials.json',import.meta.url),'utf8')).lessons;
const lie=JSON.parse(fs.readFileSync(new URL('../dist/data/lie-group-lessons.json',import.meta.url),'utf8')).lessons;
for(const id of Object.keys(QUANTUM_STATE_BRIDGE_HOOKS))assert.ok([...density,...frontiers,...lie].some(l=>l.id===id));
for(const id of ['unknown','__proto__','density-assumptions'])assert.equal(quantumStateBridgeHTML(id),'');
let network=0,workers=0,storage=0,focused=null;
globalThis.fetch=()=>{network++;throw Error('Unexpected network');};globalThis.Worker=class{constructor(){workers++;}};globalThis.localStorage={setItem(){storage++;},getItem(){storage++;return null;}};
Element.prototype.focus=function(){focused=this;};
function mount(lessonId='spt-schmidt',stateStore=new Map()){
 const root=new Container();root.innerHTML=quantumStateBridgeHTML(lessonId);let active=true;
 const cleanup=bindQuantumStateBridge({root,lessonId,stateStore,isCurrent:()=>active});
 return {root,cleanup,stateStore,leave:()=>active=false};
}
const controls=(view,id)=>{const $=key=>view.root.querySelector('#qsb-'+id+'-'+key);return {$,choose(key,value){const el=$(key);el.value=value;el.onchange();},click(key){const el=$(key);assert.equal(el.disabled,false);el.onclick();},slide(key,value){const el=$(key);el.value=String(value);el.oninput();}};};
const view=mount(),p=controls(view,'partial-trace'),s=controls(view,'schmidt-pure'),v=controls(view,'triplet-virtual');
assert.equal(view.root.querySelectorAll('[data-qsb-panel]').length,3);
assert.equal(p.$('observe').disabled,true);assert.equal(p.$('check').disabled,true);
p.choose('choice','one');p.click('observe');p.click('check');assert.match(p.$('feedback').textContent,/高亮两项/);assert.match(p.$('feedback').getAttribute('class'),/qsb-retry/);
p.choose('choice','half');p.click('observe');assert.equal(focused,p.$('check'));p.click('check');assert.match(p.$('feedback').getAttribute('class'),/qsb-correct/);
assert.equal(p.$('source').querySelectorAll('.qsb-term').length,2);
p.choose('subsystem','B');p.click('cell-01');assert.equal(p.$('check').disabled,true);p.choose('choice','zero');p.click('observe');p.click('check');assert.match(p.$('feedback').getAttribute('class'),/qsb-correct/);
p.choose('secondChoice','always');p.click('check-second');assert.match(p.$('second-feedback').getAttribute('class'),/qsb-retry/);p.choose('secondChoice','insufficient');p.click('check-second');assert.match(p.$('second-feedback').getAttribute('class'),/qsb-correct/);
for(const kind of ['classical','mixed','singlet']){p.choose('kind',kind);assert.equal(p.$('check').disabled,true);p.click('observe');p.click('check');assert.match(p.$('feedback').getAttribute('class'),/qsb-correct/);}
s.choose('choice','unsquared');s.click('observe');s.click('check');assert.match(s.$('feedback').getAttribute('class'),/qsb-retry/);
s.choose('choice','squared');s.choose('secondChoice','convert');s.click('observe');s.click('check');s.click('check-second');assert.match(s.$('second-feedback').getAttribute('class'),/qsb-correct/);
const thetaNode=s.$('theta');s.slide('theta','30');assert.equal(s.$('theta'),thetaNode,'Range nodes stay attached while dragging');assert.equal(s.$('check').disabled,true);s.click('observe');s.click('check');
s.click('triplet');assert.equal(s.$('theta').value,'45');assert.equal(s.$('phi').value,'0');s.click('product');assert.equal(s.$('theta').value,'0');s.click('singlet');assert.equal(s.$('phi').value,'180');
v.choose('choice','phase');v.choose('secondChoice','cut');v.click('observe');v.click('check');v.click('check-second');assert.match(v.$('feedback').getAttribute('class'),/qsb-correct/);
v.choose('representation','physical');assert.equal(v.$('check').disabled,true);v.choose('choice','same');v.click('observe');v.click('check');assert.match(v.$('feedback').textContent,/物理整数自旋/);v.choose('order','zx');v.choose('finite','four');v.click('observe');v.click('check');v.click('check-second');assert.match(v.$('output').innerHTML,/4\/21/);
for(const detail of view.root.querySelectorAll('[data-qsb-panel]')){assert.ok(detail.querySelector('summary'));assert.equal(detail.querySelector('summary').onkeydown,undefined);}
const detail=view.root.querySelector('[data-qsb-panel="partial-trace"]'),notes=detail.querySelector('[data-qsb-notes]');detail.open=true;notes.open=true;
// Capture native disclosures even if their queued toggle event has not fired.
p.$('secondChoice').value='never';view.leave();const before=view.cleanup.snapshot();assert.equal(before['partial-trace'].open,true);assert.equal(before['partial-trace'].notesOpen,true);assert.equal(before['partial-trace'].secondChoice,'never');assert.equal(before['partial-trace'].secondChecked,false);
const oldHandler=p.$('reset').onclick;view.cleanup();oldHandler();
const back=mount('spt-schmidt',view.stateStore),b=controls(back,'partial-trace');assert.equal(b.$('cell-01').getAttribute('aria-pressed'),'true');assert.equal(b.$('secondChoice').value,'never');assert.match(b.$('feedback').getAttribute('class'),/qsb-correct/);assert.equal(back.root.querySelector('[data-qsb-panel="partial-trace"]').open,true);assert.equal(back.root.querySelector('[data-qsb-notes="partial-trace"]').open,true);
const copy=back.cleanup.snapshot();copy['partial-trace'].kind='mixed';assert.equal(back.cleanup.snapshot()['partial-trace'].kind,'singlet');
const retainedVirtual=controls(back,'triplet-virtual');assert.equal(retainedVirtual.$('representation').value,'physical');assert.equal(retainedVirtual.$('order').value,'zx');assert.equal(retainedVirtual.$('finite').value,'four');assert.match(retainedVirtual.$('feedback').getAttribute('class'),/qsb-correct/);
const retainedSchmidt=controls(back,'schmidt-pure');assert.equal(retainedSchmidt.$('choice').value,'squared');assert.equal(retainedSchmidt.$('secondChoice').value,'convert');assert.equal(retainedSchmidt.$('phi').value,'180');
const other=mount('density-pure-mixed',view.stateStore);assert.equal(controls(other,'partial-trace').$('choice').value,'','Different lesson origins have independent state');
const stale=b.$('reset').onclick,stored=cloneRecord(back.stateStore.get('spt-schmidt:partial-trace'));back.root.innerHTML='<p>Another course</p>';stale();assert.deepEqual(back.stateStore.get('spt-schmidt:partial-trace'),stored);back.cleanup();other.cleanup();
const safe=mount('density-pure-mixed',new Map([['density-pure-mixed:partial-trace',{kind:'<img src=x>',choice:'<script>',subsystem:'__proto__',open:true}]]));assert.equal(safe.root.querySelector('img'),null);assert.equal(controls(safe,'partial-trace').$('choice').value,'');safe.cleanup();
const draft=mount('density-exchange'),draftControls=controls(draft,'schmidt-pure');draftControls.choose('choice','squared');draftControls.click('observe');draftControls.click('check');draftControls.$('phi').value='90';draft.leave();draft.cleanup();
const draftBack=mount('density-exchange',draft.stateStore),draftRestored=controls(draftBack,'schmidt-pure');assert.equal(draftRestored.$('phi').value,'90');assert.equal(draftRestored.$('choice').value,'squared');assert.equal(draftRestored.$('feedback').textContent,'');assert.equal(draftRestored.$('check').disabled,true);draftBack.cleanup();
assert.equal(network,0);assert.equal(workers,0);assert.equal(storage,0);
const css=fs.readFileSync(new URL('../dist/quantum-state-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/@container\(max-width:560px\)/);assert.match(css,/\.qsb-formula\{[^}]*overflow-x:auto/);assert.match(css,/summary:focus-visible/);
const locale=JSON.parse(fs.readFileSync(new URL('../locales/en-quantum-state-bridge.json',import.meta.url),'utf8')),catalog={...loadEnglishCatalog(),...locale};
for(const text of jsStrings(fs.readFileSync(new URL('../dist/quantum-state-bridge.js',import.meta.url),'utf8')).flatMap(s=>textUnits(s.value)).map(s=>s.trim()).filter(s=>HAN.test(s)))assert.ok(catalog[text],'Missing English bridge text: '+text);
assert.ok(Object.values(locale).every(text=>typeof text==='string'&&text.trim()&&!HAN.test(text)));
console.log('Quantum-state bridge: complex partial traces (including nonreal rhoB), pure/mixed counterexamples, 43 general coefficient matrices, phase and entropy conventions, real density fixtures, CG projection, independent finite AKLT tensor moments; actual prediction handlers, preserved range controls/disclosures/drafts/feedback, stale guards and zero network/worker/storage writes passed.');
function cloneRecord(x){return JSON.parse(JSON.stringify(x));}
