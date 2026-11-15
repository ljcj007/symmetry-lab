import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Container,Element} from './test-material-research-ui.mjs';
import {HAN,jsStrings,textUnits,replaceUnits} from './english-source.mjs';
import {GEOMETRY_ACTIONS_REFERENCE as saved} from '../dist/geometry-actions-reference.js';
import {GEOMETRY_ACTIONS_BRIDGE_HOOKS,geometryActionsReference,geometryActionsLabRequest,geometryActionsBridgeHTML,bindGeometryActionsBridge} from '../dist/geometry-actions-bridge.js';

const near=(a,b,tol=4e-13)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=z=>[z[0],-z[1]],norm=z=>z[0]**2+z[1]**2;
const cmatrix=(a,b)=>a.forEach((row,i)=>row.forEach((z,j)=>{near(z[0],b[i][j][0]);near(z[1],b[i][j][1]);}));
assert.deepEqual(GEOMETRY_ACTIONS_BRIDGE_HOOKS,{'geometry-rays':['ket-projector-distance']});
assert.equal(saved.selections.length,30);
assert.equal(saved.sourceHashAlgorithm,'sha256');assert.equal(saved.sourceHashNormalization,'utf8-lf-v1');
assert.deepEqual(saved.outputComparison,{absoluteTolerance:2e-14,relativeTolerance:2e-14,scope:'Numeric selection output only; field structure, inputs and provenance are exact.'});
assert.match(saved.eigenvectorScope,/Only these 30 nonnegative-k SSH selections/);
for(const[file,hash]of Object.entries(saved.sourceHashes)){
 const normalized=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n?/g,'\n');
 assert.equal(createHash('sha256').update(normalized,'utf8').digest('hex'),hash,file+' normalized SHA-256');
}
for(const k of [0,.6])for(const strength of [0,2,4])for(const delta of [.02,.1,.5,2]){
 const r=geometryActionsReference({k,strength,delta}),a=strength*(Math.cos(k)-.74*Math.sin(2*k));
 const expected=[[[.5,0],[-Math.cos(k)/2,Math.sin(k)/2]],[[-Math.cos(k)/2,-Math.sin(k)/2],[.5,0]]];
 cmatrix(r.P,expected);cmatrix(r.P,r.base.selection.projector);
 for(let i=0;i<2;i++){near(r.bra[i][0],r.v[i][0]);near(r.bra[i][1],-r.v[i][1]);}
 near(r.metric,.25);near(r.ordinaryNorm,.5+a+a*a);near(r.parallelNorm,(.5+a)**2);near(r.connection,-.5-a);
 near(r.fidelity,Math.cos(delta/2)**2);near(r.distance,Math.sin(delta/2)**2);
 near(r.approximation,delta*delta/4);near(r.finiteMetric,Math.sin(delta/2)**2/delta**2,2e-12);
 near(r.metric,r.base.selection.gxx);
 // Independently derive dP by central differences of the closed projector.
 const e=1e-5,P=x=>[[[.5,0],[-Math.cos(x)/2,Math.sin(x)/2]],[[-Math.cos(x)/2,-Math.sin(x)/2],[.5,0]]];
 const plus=P(k+e),minus=P(k-e);
 for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let z=0;z<2;z++)near(r.projectorDerivative[i][j][z],(plus[i][j][z]-minus[i][j][z])/(2*e),2e-11);
 let overlap=[0,0];for(let i=0;i<2;i++)overlap=add(overlap,mul(conj(r.base.selection.transformedEigenvector[i]),r.neighbor.selection.transformedEigenvector[i]));
 near(norm(overlap),r.fidelity);
 const request=geometryActionsLabRequest({k,strength,delta});
 assert.equal(request.action,'quantum_geometry_lab');assert.equal(request.module,'geometry');
 assert.deepEqual(Object.keys(request.input).sort(),['model','mass','energyScale','t1','t2','mesh','pathSamples','gaugeStrength','kx','ky'].sort());
 assert.equal(request.input.kx,k);assert.equal(request.input.gaugeStrength,strength);assert.equal(request.input.t1,0);assert.equal(request.input.t2,1);
 assert.ok(!Object.hasOwn(request.input,'delta'));request.input.t1=3;assert.equal(geometryActionsLabRequest({k,strength,delta}).input.t1,0);
}
assert.ok(geometryActionsReference({delta:2}).relativeError>.4);
assert.ok(geometryActionsReference({delta:.02}).relativeError<.00004);
for(const input of [{k:.7},{strength:1},{delta:.3},{k:NaN}])assert.throws(()=>geometryActionsReference(input));
assert.equal(geometryActionsBridgeHTML('not-a-lesson'),'');

// Native details.open can differ from its attribute (e.g. just before toggle).
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return this._nativeOpen??Object.hasOwn(this.attributes,'open');},set(value){this._nativeOpen=!!value;}});
// Match the browser's iterable NodeList, not Array methods. Preserve the old
// parser's internal array assumption solely while it parses markup.
class NodeListView{constructor(items){this.length=items.length;items.forEach((x,i)=>this[i]=x);}item(i){return this[i]??null;}*[Symbol.iterator](){for(let i=0;i<this.length;i++)yield this[i];}forEach(fn){for(let i=0;i<this.length;i++)fn(this[i],i,this);}}
const nativeQuery=Element.prototype.querySelectorAll,html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){parsing++;try{html.set.call(this,value);}finally{parsing--;}}});
Element.prototype.querySelectorAll=function(selector){const result=nativeQuery.call(this,selector);return parsing?result:new NodeListView(Array.from(result));};
globalThis.localStorage={getItem(){throw Error('Must not read storage');},setItem(){throw Error('Must not write storage');}};
globalThis.sessionStorage=globalThis.localStorage;
const mount=({store=new Map(),onOpenLab,isCurrent}={})=>{const root=new Container();root.innerHTML=geometryActionsBridgeHTML('geometry-rays');const cleanup=bindGeometryActionsBridge({root,lessonId:'geometry-rays',stateStore:store,onOpenLab,isCurrent});return{root,cleanup,$:n=>root.querySelector('#gab-geometry-rays-'+n),detail:root.querySelector('[data-gab-bridge]'),store};};
const change=(v,name,value)=>{v.$(name).value=String(value);v.$(name).onchange();};
const v=mount(),snapshot=()=>v.cleanup.snapshot()['ket-projector-distance'];
assert.equal(v.detail.open,false);assert.ok(!(v.root.querySelectorAll('button') instanceof Array));
const stable=v.$('strength'),note=v.$('note'),proof=v.root.querySelector('[data-gab-native="proof"]');
v.detail.open=true;proof.open=true;v.root.querySelector('[data-gab-native="reference"]').open=true;
note.value='my unsent explanation';v.$('q0').value='same';
change(v,'strength',4);assert.equal(v.$('strength'),stable);assert.equal(v.$('note'),note);assert.equal(v.$('note').value,'my unsent explanation');assert.equal(proof.open,true);
assert.equal(snapshot().choices[0],'same');assert.equal(snapshot().checked[0],false);
v.$('check0').onclick();assert.match(v.$('feedback0').textContent,/e²/);
change(v,'q0','conjugate');assert.equal(v.$('feedback0').textContent,'');v.$('check0').onclick();assert.match(v.$('feedback0').textContent,/正确/);
for(let i=0;i<4;i++)v.$('step').onclick();assert.match(v.$('action').innerHTML,/P₁₂/);
change(v,'delta',2);assert.match(v.$('distance').textContent,/0.7080734/);
const staleButton=v.$('step').onclick;v.cleanup();staleButton();assert.equal(snapshot().step,4);
const remount=mount({store:v.store});assert.equal(remount.detail.open,true);assert.equal(remount.$('note').value,'my unsent explanation');assert.equal(remount.$('q0').value,'conjugate');assert.equal(remount.root.querySelector('[data-gab-native="proof"]').open,true);assert.equal(remount.root.querySelector('[data-gab-native="reference"]').open,true);
const closed=mount({store:v.store});closed.detail.open=false;closed.cleanup();assert.equal(mount({store:v.store}).detail.open,false);
// A replacement binder owns existing DOM; old cleanup must retain its handlers.
const owned=mount(),oldClick=owned.$('step').onclick;const newer=bindGeometryActionsBridge({root:owned.root,lessonId:'geometry-rays'}),newClick=owned.$('step').onclick;owned.cleanup();assert.equal(owned.$('step').onclick,newClick);oldClick();assert.equal(newer.snapshot()['ket-projector-distance'].step,0);owned.$('step').onclick();assert.equal(newer.snapshot()['ket-projector-distance'].step,1);newer();
// A failed copy remains retryable and a late result cannot touch newer input.
let calls=[],accept;const c=mount({onOpenLab:request=>{calls.push(request);return new Promise(resolve=>accept=resolve);}});
change(c,'k',.6);change(c,'strength',4);const pending=c.$('copy').onclick();assert.equal(c.$('copy').disabled,true);assert.deepEqual(calls[0],geometryActionsLabRequest({k:.6,strength:4}));
change(c,'strength',0);accept(true);await pending;assert.equal(c.$('copy-status').textContent,'');assert.equal(c.$('copy').disabled,false);
const reject=c.$('copy').onclick();accept(false);await reject;assert.match(c.$('copy-status').textContent,/重试/);assert.equal(c.$('copy').disabled,false);
const late=c.$('copy').onclick(),oldStatus=c.$('copy-status');c.cleanup();accept(true);await late;assert.doesNotMatch(oldStatus.textContent,/完整输入已复制/);
const success=mount({onOpenLab:async()=>true});await success.$('copy').onclick();assert.match(success.$('copy-status').textContent,/手动运行/);
const thrown=mount({onOpenLab:async()=>{throw Error('private transport failure');}});await thrown.$('copy').onclick();assert.match(thrown.$('copy-status').textContent,/重试/);assert.doesNotMatch(thrown.$('copy-status').textContent,/private/);
let live=true;const dated=mount({isCurrent:()=>live});live=false;dated.$('step').onclick();assert.equal(dated.cleanup.snapshot()['ket-projector-distance'].step,0);dated.cleanup();
assert.equal(mount().$('copy'),null);
const unsupported=bindGeometryActionsBridge({lessonId:'unknown'});assert.deepEqual(unsupported.snapshot(),{});unsupported();

const source=fs.readFileSync(new URL('../dist/geometry-actions-bridge.js',import.meta.url),'utf8'),locale=JSON.parse(fs.readFileSync(new URL('../locales/en-geometry-actions-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(x=>textUnits(x.value)))];
for(const unit of units){assert.ok(locale[unit],`Missing English unit: ${unit}`);assert.ok(!HAN.test(locale[unit]));}
for(const part of jsStrings(source)){const translated=replaceUnits(part.value,text=>locale[text]??text);assert.ok(!HAN.test(translated),`Untranslated text: ${translated}`);}
const css=fs.readFileSync(new URL('../dist/geometry-actions-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/font-size:22px/);assert.match(css,/\.gab-table-wrap\{[^}]*overflow-x:auto/);
const formulaCSS=css.match(/\.gab-formula\{([^}]+)\}/)?.[1];assert.ok(formulaCSS);
for(const declaration of ['overflow-x:auto','min-width:0','box-sizing:border-box','max-width:100%','font-size:22px'])assert.ok(formulaCSS.split(';').includes(declaration),'The formula scroll container must retain '+declaration);
assert.doesNotMatch(source,/localStorage|sessionStorage|new Worker|fetch\(/);

// Recompute all 30 selections through the real Python API, not old fixtures.
const root=fileURLToPath(new URL('../',import.meta.url)),bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.PYTHON||process.env.PYTHON_EXE||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const checked=spawnSync(python,['scripts/check-geometry-actions-reference.py','--check'],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'},maxBuffer:2e6});
assert.equal(checked.status,0,String(checked.error||'')+'\n'+checked.stdout+'\n'+checked.stderr);assert.equal(JSON.parse(checked.stdout.trim()).apiSelections,30);
console.log(`Geometry actions bridge: 24 independent algebra cases, 30 current production API selections, native-details/NodeList/state/copy lifecycle, ${units.length} English units passed.`);
