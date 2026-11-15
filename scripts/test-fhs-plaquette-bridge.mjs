import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Container,Element} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';
import {FHS_PLAQUETTE_REFERENCE as reference} from '../dist/fhs-plaquette-reference.js';
import {FHS_PLAQUETTE_BRIDGE_HOOKS,fhsPlaquetteLedger,fhsPlaquetteLabRequest,fhsPlaquetteBridgeHTML,bindFhsPlaquetteBridge,fhsPlaquetteResultHTML,bindFhsPlaquetteResult} from '../dist/fhs-plaquette-bridge.js';
const near=(a,b,tol=2e-14)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const multiply=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conjugate=z=>[z[0],-z[1]],equalPair=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
assert.deepEqual(FHS_PLAQUETTE_BRIDGE_HOOKS,{'geometry-topology':['oriented-plaquette']});
assert.equal(reference.cases.length,4);assert.equal(reference.sourceHashNormalization,'utf8-lf-v1');
for(const[file,hash]of Object.entries(reference.sourceHashes)){const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n?/g,'\n');assert.equal(createHash('sha256').update(text,'utf8').digest('hex'),hash);}
let cases=0;
for(const row of reference.cases)for(const cellId of ['interior','boundary-xy'])for(const frame of ['before','after']){
 const result=structuredClone(row.result),snapshot=JSON.stringify(result),ledger=fhsPlaquetteLedger(result,{cellId,frame}),cell=result.fhsReplay.cells.find(c=>c.id===cellId),stage=cell[frame];
 assert.equal(ledger.mesh,9);assert.equal(ledger.convergenceIndex,0);
 const units=stage.rawForwardOverlaps.map(z=>{const n=Math.sqrt(z[0]*z[0]+z[1]*z[1]);return[z[0]/n,z[1]/n];});
 units.forEach((u,i)=>equalPair(u,ledger.current.units[i]));
 const factors=units.map((u,i)=>i<2?u:conjugate(u));factors.forEach((u,i)=>equalPair(u,ledger.current.factors[i]));
 if(result.topology.defined){let product=[1,0];for(let i=0;i<4;i++){product=multiply(product,factors[i]);equalPair(product,ledger.current.products[i]);}equalPair(product,stage.loop);near(-Math.atan2(product[1],product[0]),stage.fluxRad);near(ledger.current.flux,stage.fluxRad);near(ledger.loopDifference,0);near(ledger.endpointPhaseSum,0);for(const residual of ledger.covariance)near(residual,0);}
 else{assert.equal(ledger.current.valid,false);assert.equal(ledger.current.loop,null);assert.equal(ledger.current.flux,null);assert.deepEqual(ledger.current.products,[]);}
 if(cellId==='boundary-xy'){near(cell.corners[1].k[0],-Math.PI);near(cell.corners[1].unwrappedK[0],Math.PI);near(cell.corners[2].unwrappedK[1],Math.PI);}
 assert.equal(JSON.stringify(result),snapshot,'The replay does not mutate Python results');cases++;
 const request=fhsPlaquetteLabRequest({caseId:row.id});assert.equal(request.action,'quantum_geometry_lab');assert.equal(request.module,'geometry');assert.deepEqual(request.input,row.input);assert.ok(!Object.hasOwn(request.input,'plaquette'));request.input.mass=5;assert.equal(fhsPlaquetteLabRequest({caseId:row.id}).input.mass,row.input.mass);
}
assert.equal(fhsPlaquetteLedger({model:'ssh',fhsReplay:null}),null);
const bad=structuredClone(reference.cases[0].result);bad.fhsReplay.cells[0].before.loop[0]+=.01;assert.throws(()=>fhsPlaquetteLedger(bad),/differs/);
const wrongSewing=structuredClone(reference.cases[0].result);wrongSewing.fhsReplay.sewing='minus-I';assert.throws(()=>fhsPlaquetteLedger(wrongSewing),/metadata/);
// Pure finite arithmetic counterexample: principal edge angles need not sum
// to Arg of their product. This is not a tool input or a displayed reference.
const phases=[Math.PI-.1,Math.PI-.1,.2,.2],product=phases.map(x=>[Math.cos(x),Math.sin(x)]).reduce(multiply,[1,0]);
near(Math.atan2(product[1],product[0]),.2);near(phases.reduce((a,b)=>a+b,0)-Math.atan2(product[1],product[0]),2*Math.PI);

class NodeListView{constructor(items){this.length=items.length;items.forEach((x,i)=>this[i]=x);}item(i){return this[i]??null;}*[Symbol.iterator](){for(let i=0;i<this.length;i++)yield this[i];}forEach(fn){for(let i=0;i<this.length;i++)fn(this[i],i,this);}}
const query=Element.prototype.querySelectorAll,html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){parsing++;try{html.set.call(this,value);}finally{parsing--;}}});
Element.prototype.querySelectorAll=function(selector){const result=query.call(this,selector);return parsing?result:new NodeListView(Array.from(result));};
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return this._open??Object.hasOwn(this.attributes,'open');},set(v){this._open=!!v;}});
globalThis.localStorage={getItem(){throw Error('No bridge storage');},setItem(){throw Error('No bridge storage');}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};Element.prototype.focus=function(){document.activeElement=this;};
const mount=({stateStore=new Map(),onOpenLab,isCurrent}={})=>{const root=new Container();root.innerHTML=fhsPlaquetteBridgeHTML('geometry-topology');const cleanup=bindFhsPlaquetteBridge({root,lessonId:'geometry-topology',stateStore,onOpenLab,isCurrent});return{root,cleanup,stateStore,$:name=>root.querySelector('#fpb-geometry-topology-'+name),detail:root.querySelector('[data-fpb-bridge]')};};
const change=(v,name,value)=>{v.$(name).value=value;v.$(name).onchange({target:v.$(name)});};
assert.equal(fhsPlaquetteBridgeHTML('geometry-rays'),'');
const v=mount(),strength=v.$('frame'),note=v.$('note');assert.equal(v.detail.open,false);assert.ok(!(v.root.querySelectorAll('button') instanceof Array));
v.detail.open=true;v.root.querySelector('[data-fpb-native="proof"]').open=true;note.value='unsubmitted: conjugate reverse links';v.$('q0').value='forward';
strength.focus();change(v,'frame','after');assert.equal(v.$('frame'),strength);assert.equal(document.activeElement,strength);assert.equal(v.$('note'),note);
v.$('check0').onclick();assert.match(v.$('feedback0').textContent,/复共轭/);change(v,'q0','conjugate');assert.equal(v.$('feedback0').textContent,'');v.$('check0').onclick();assert.match(v.$('feedback0').textContent,/正确/);
for(let i=0;i<8;i++)v.$('step').onclick();assert.match(v.$('gauge').textContent,/端点/);assert.match(v.$('ledger').textContent,/2π/);
const phaseTable=Array.from(v.$('ledger').querySelectorAll('table')).find(t=>t.querySelector('caption')?.textContent==='四条定向边的主值相位');assert.ok(phaseTable);
const displayedPhases=Array.from(phaseTable.querySelectorAll('tr')).filter(tr=>tr.querySelector('td')).map(tr=>({path:tr.querySelector('th').textContent,value:Number(tr.querySelector('td').textContent)}));
assert.deepEqual(displayedPhases.map(row=>row.path),['A→B','B→C','C→D','D→A']);
const actualPhases=fhsPlaquetteLedger(reference.cases.find(row=>row.id==='qwz-minus-one').result,{frame:'after'}).current.edgePhases;displayedPhases.forEach((row,i)=>assert.equal(row.value,Number(actualPhases[i].toPrecision(7))));
const branchTable=Array.from(v.$('ledger').querySelectorAll('table')).find(t=>t.querySelector('caption')?.textContent==='主值分支：先乘复数，再取一次 Arg');assert.ok(branchTable);const branchUnits=Array.from(branchTable.querySelectorAll('tr')).filter(tr=>tr.querySelector('td')).map(tr=>Array.from(tr.querySelectorAll('td')).at(-1).textContent);assert.deepEqual(branchUnits,['rad','rad','rad','1']);
change(v,'cell','boundary-xy');assert.match(v.$('coordinates').textContent,/3.141593/);assert.equal(v.$('step-number').textContent,'0/8');
const retired=v.$('step').onclick;v.cleanup();retired();
const revived=mount({stateStore:v.stateStore});assert.equal(revived.detail.open,true);assert.equal(revived.$('note').value,'unsubmitted: conjugate reverse links');assert.equal(revived.$('q0').value,'conjugate');assert.equal(revived.root.querySelector('[data-fpb-native="proof"]').open,true);
const modelControl=revived.$('case');modelControl.focus();assert.equal(revived.$('parameters').textContent,'QWZ · m=-1 · N=9 · s=2');
change(revived,'case','qwz-trivial');assert.equal(revived.$('parameters').textContent,'QWZ · m=3 · N=9 · s=2');assert.equal(revived.$('case'),modelControl);assert.equal(document.activeElement,modelControl);assert.equal(revived.$('note').value,'unsubmitted: conjugate reverse links');
change(revived,'case','qwz-closing');assert.equal(revived.$('parameters').textContent,'QWZ · m=-2 · N=9 · s=2');assert.equal(revived.$('case'),modelControl);assert.equal(document.activeElement,modelControl);assert.equal(revived.$('step').disabled,true);assert.match(revived.$('ledger').textContent,/未定义/);assert.match(revived.$('total').textContent,/—/);
const oldOwner=mount(),oldClick=oldOwner.$('step').onclick,newOwner=bindFhsPlaquetteBridge({root:oldOwner.root,lessonId:'geometry-topology'}),newClick=oldOwner.$('step').onclick;oldOwner.cleanup();oldClick();assert.equal(oldOwner.$('step').onclick,newClick);assert.equal(newOwner.snapshot().step,0);newOwner();
let resolve;const copied=[],copy=mount({onOpenLab:request=>{copied.push(request);return new Promise(yes=>resolve=yes);}});change(copy,'case','qwz-trivial');const pending=copy.$('copy').onclick();assert.equal(copy.$('copy').disabled,true);assert.deepEqual(copied[0].input,reference.cases.find(r=>r.id==='qwz-trivial').input);change(copy,'cell','boundary-xy');resolve(true);await pending;assert.equal(copy.$('copy-status').textContent,'');assert.equal(copy.$('copy').disabled,false);
const rejected=copy.$('copy').onclick();resolve(false);await rejected;assert.match(copy.$('copy-status').textContent,/重试/);
const late=copy.$('copy').onclick();copy.cleanup();resolve(true);await late;assert.doesNotMatch(copy.$('copy-status').textContent,/完整输入已复制/);
const thrown=mount({onOpenLab:async()=>{throw Error('private transport detail');}});await thrown.$('copy').onclick();assert.match(thrown.$('copy-status').textContent,/重试/);assert.doesNotMatch(thrown.$('copy-status').textContent,/private/);
const resultRoot=new Container(),actual=reference.cases.find(r=>r.id==='qwz-plus-one').result;resultRoot.innerHTML=fhsPlaquetteResultHTML(actual);const resultCleanup=bindFhsPlaquetteResult({root:resultRoot,result:actual});assert.equal(resultRoot.querySelector('#fpb-result-parameters').textContent,'QWZ · m=1 · N=9 · s=2');assert.equal(resultRoot.querySelector('#fpb-result-case'),null);assert.equal(resultRoot.querySelector('#fpb-result-copy'),null);assert.match(resultRoot.querySelector('#fpb-result-total').textContent,/-1/);resultCleanup();
assert.match(fhsPlaquetteResultHTML({model:'qwz'}),/重新运行/);assert.match(fhsPlaquetteResultHTML({model:'ssh'}),/Zak/);
const locale={...loadEnglishCatalog(),...JSON.parse(fs.readFileSync(new URL('../locales/en-fhs-plaquette-bridge.json',import.meta.url),'utf8'))};let units=0;
for(const name of ['fhs-plaquette-bridge.js','quantum-materials-ui.js']){const source=fs.readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');for(const literal of jsStrings(source)){for(const unit of textUnits(literal.value)){assert.ok(locale[unit],`Missing English: ${unit}`);assert.ok(!HAN.test(locale[unit]));units++;}assert.ok(!HAN.test(replaceUnits(literal.value,text=>locale[text]??text)),name+' leaves Han text');}}
const css=fs.readFileSync(new URL('../dist/fhs-plaquette-bridge.css',import.meta.url),'utf8'),formula=css.match(/\.fpb-formula\{([^}]+)\}/)[1];for(const item of ['font-size:22px','overflow-x:auto','min-width:0','box-sizing:border-box'])assert.ok(formula.split(';').includes(item));assert.match(css,/font-size:18px/);assert.match(css,/\.fpb-table-wrap\{[^}]*overflow-x:auto/);
const root=fileURLToPath(new URL('../',import.meta.url)),bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe'),python=process.env.PYTHON||process.env.PYTHON_EXE||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const checked=spawnSync(python,['scripts/check-fhs-plaquette-reference.py','--check'],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'},maxBuffer:2e6});assert.equal(checked.error,undefined,checked.error?.message);assert.equal(checked.status,0,checked.stdout+'\n'+checked.stderr);
console.log(`FHS bridge: ${cases} independent four-link cases, branch/null/boundary checks, actual binder/NodeList/native/RAM/copy ownership, English coverage and current Python reference passed (${units} source units inspected).`);
