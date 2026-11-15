import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {geometryActionsLabRequest} from '../dist/geometry-actions-bridge.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=2e-14,`${actual} != ${expected}`);
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/quantum-materials.json',import.meta.url),'utf8'));
const expected=geometryActionsLabRequest({k:.6,strength:4,delta:2});
// The manual Run below returns a current, complete production API calculation,
// not a synthetic geometry result or an unrelated historical capture.
const bundled=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.PYTHON||process.env.PYTHON_EXE||(fs.existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
const program="import json,sys;sys.path.insert(0,'.openai/local-python-deps');sys.path.insert(0,'dist/python');from browser_api import run;print(json.dumps(run('quantum_geometry_lab',json.loads(sys.argv[1])),allow_nan=False))";
const execution=spawnSync(python,['-c',program,JSON.stringify(expected.input)],{cwd:ROOT,encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'},maxBuffer:8e6});
assert.equal(execution.error,undefined,execution.error?.message);assert.equal(execution.status,0,execution.stderr);
const actual=JSON.parse(execution.stdout);near(actual.selection.gxx,.25);

// Run actual application bindings against browser-like iterable NodeLists.
class NodeListView{constructor(items){this.length=items.length;items.forEach((x,i)=>this[i]=x);}item(i){return this[i]??null;}*[Symbol.iterator](){for(let i=0;i<this.length;i++)yield this[i];}forEach(fn){for(let i=0;i<this.length;i++)fn(this[i],i,this);}}
const query=Element.prototype.querySelectorAll,html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){parsing++;try{html.set.call(this,value);}finally{parsing--;}}});
Element.prototype.querySelectorAll=function(selector){const items=query.call(this,selector);return parsing?items:new NodeListView(Array.from(items));};
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return this._nativeOpen??Object.hasOwn(this.attributes,'open');},set(value){this._nativeOpen=!!value;}});
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.document={compatMode:'CSS1Compat',activeElement:null,createElement:tag=>new Element(tag)};
let requests=0,writes=0,workers=0;const calls=[],writtenKeys=[];
globalThis.fetch=async url=>{requests++;assert.match(String(url),/^data\/quantum-materials\.json\?/);return{ok:true,json:async()=>structuredClone(catalog)};};
globalThis.localStorage={getItem:()=>null,setItem:key=>{writes++;writtenKeys.push(key);}};
globalThis.Worker=class{constructor(){workers++;throw Error('Teaching integration must not start a worker');}};
const ui=await import('../dist/quantum-materials-ui.js?geometry-actions-integration');
const run=async(action,input)=>{calls.push({action,input:structuredClone(input)});assert.equal(action,expected.action);assert.deepEqual(input,expected.input);return structuredClone(actual);};
const settle=async view=>{for(let i=0;i<300;i++){const hosts=Array.from(view.container.querySelectorAll('[data-learning-bridge]'));if(hosts.every(host=>host.getAttribute('aria-busy')==='false'))return;await flush();}throw Error('The real lazy geometry bridge did not settle');};
async function mount(selection={},container=new Container()){
 const navigations=[];await ui.renderQuantumMaterialsView({container,selection,run,onNavigate:value=>navigations.push(value)});
 const view={container,navigations,$:s=>container.querySelector(s)};await settle(view);return view;
}
const tab=async(view,name)=>{view.$('[data-qm-tab="'+name+'"]').onclick();await settle(view);};
const cardId='#gab-geometry-rays-',card=(view,name)=>view.$(cardId+name);
const changeCard=(view,name,value)=>{const node=card(view,name);node.value=String(value);node.onchange({target:node});};
const lesson=async(view,id)=>{const node=view.$('#qm-lesson');node.value=id;node.onchange({target:node});await settle(view);};

const v=await mount({module:'geometry',lesson:'geometry-rays'}),host=v.$('[data-learning-bridge="geometryActions"]');
assert.ok(host);assert.equal(host.dataset.learningBridgeLesson,'geometry-rays');assert.equal(host.querySelector('details').open,false);
assert.ok(!(v.container.querySelectorAll('button') instanceof Array));
const content=v.$('#qm-content').innerHTML;assert.ok(content.indexOf('data-learning-bridge')<content.indexOf('class="obs-formula"'));
changeCard(v,'k',.6);changeCard(v,'strength',4);changeCard(v,'delta',2);
const strength=card(v,'strength');strength.focus();changeCard(v,'strength',0);assert.equal(card(v,'strength'),strength);assert.equal(document.activeElement,strength);changeCard(v,'strength',4);
const outer=host.querySelector('details'),proof=host.querySelector('[data-gab-native="proof"]'),reference=host.querySelector('[data-gab-native="reference"]');
outer.open=true;proof.open=true;reference.open=true; // no toggle events dispatched
card(v,'note').value='Unsubmitted: conjugate the phase in the bra.';
card(v,'q0').value='same'; // no change event dispatched
const retiredCopy=card(v,'copy').onclick,retiredStep=card(v,'step').onclick,retiredLesson=v.$('#qm-lesson').onchange,retiredDerive=v.$('#qm-to-derive').onclick;
await tab(v,'lab');
const oldForm=v.$('#qm-form'),oldSubmit=oldForm.onsubmit,oldInput=oldForm.oninput,oldPreset=v.$('#qm-preset').onchange;
v.$('#qm-mass').value='2.3';v.$('#qm-energyScale').value='2.4';v.$('#qm-mesh').value='';v.$('#qm-kx').value='-1.7';v.$('#qm-ky').value='0.7';
oldForm.oninput({target:v.$('#qm-mesh')});await tab(v,'learn');
assert.equal(card(v,'note').value,'Unsubmitted: conjugate the phase in the bra.');assert.equal(card(v,'q0').value,'same');assert.equal(card(v,'feedback0').textContent,'');
assert.equal(card(v,'k').value,'0.6');assert.equal(card(v,'strength').value,'4');assert.equal(card(v,'delta').value,'2');
for(const selector of ['details','[data-gab-native="proof"]','[data-gab-native="reference"]'])assert.equal(v.$('[data-learning-bridge="geometryActions"]').querySelector(selector).open,true);
const unchanged=v.$('#qm-content');await retiredCopy();retiredStep();retiredLesson({target:{value:'geometry-topology'}});retiredDerive();assert.equal(v.$('#qm-content'),unchanged);
await tab(v,'lab');assert.equal(v.$('#qm-mesh').value,'');assert.equal(v.$('#qm-mass').value,'2.3');assert.equal(v.$('#qm-energyScale').value,'2.4');assert.equal(v.$('#qm-kx').value,'-1.7');assert.equal(v.$('#qm-ky').value,'0.7');
await tab(v,'learn');const activeCopy=card(v,'copy').onclick;
await activeCopy();assert.equal(v.$('[data-learning-bridge]'),null);
assert.equal(v.$('#qm-model').value,'ssh');assert.equal(v.$('#qm-t1').value,'0');assert.equal(v.$('#qm-t2').value,'1');assert.equal(v.$('#qm-kx').value,'0.6');assert.equal(v.$('#qm-gaugeStrength').value,'4');assert.equal(v.$('#qm-mesh').value,'9');assert.equal(v.$('#qm-preset').value,'');
assert.equal(v.navigations.at(-1).tab,'lab');assert.equal(v.navigations.at(-1).preset,'');
assert.equal(calls.length,0,'Copying changes the form but waits for manual Run');assert.equal(writes,0);assert.equal(workers,0);assert.equal(requests,1);
// Retired lab owners cannot overwrite the freshly copied form or submit it.
const copiedForm=v.$('#qm-form');oldSubmit({preventDefault(){}});oldInput({target:{type:'number',id:'qm-mass',value:'99'}});oldPreset({target:{value:'geometry-qwz-trivial'}});await activeCopy();
assert.equal(v.$('#qm-form'),copiedForm);assert.equal(v.$('#qm-model').value,'ssh');assert.equal(calls.length,0);
copiedForm.onsubmit({preventDefault(){}});for(let i=0;i<30&&!ui.getQuantumMaterialsResult();i++)await flush();
assert.equal(calls.length,1);assert.deepEqual(calls[0],{action:expected.action,input:expected.input});
assert.deepEqual(ui.getQuantumMaterialsResult().input,expected.input);
near(ui.getQuantumMaterialsResult().result.selection.gxx,.25);assert.match(v.$('#qm-status').textContent,/计算完成/);
assert.ok(!Object.hasOwn(calls[0].input,'delta'));assert.ok(!Object.hasOwn(calls[0].input,'phase'));
await tab(v,'learn');assert.equal(card(v,'note').value,'Unsubmitted: conjugate the phase in the bra.');
const lateCopy=card(v,'copy').onclick,lateStep=card(v,'step').onclick;
await lesson(v,'geometry-topology');assert.equal(v.$('[data-learning-bridge]'),null);const topologyContent=v.$('#qm-content');await lateCopy();lateStep();assert.equal(v.$('#qm-content'),topologyContent);
await lesson(v,'geometry-rays');assert.equal(card(v,'q0').value,'same');assert.equal(card(v,'strength').value,'4');
const replacedCopy=card(v,'copy').onclick,replacedSubmit=copiedForm.onsubmit;
const newer=await mount({module:'orbitals'},v.container),newerContent=newer.$('#qm-content');await replacedCopy();replacedSubmit({preventDefault(){}});assert.equal(newer.$('#qm-content'),newerContent);assert.equal(newer.$('[data-learning-bridge="geometryActions"]'),null);assert.equal(calls.length,1);
for(const selection of [{module:'geometry',lesson:'geometry-rays',calculationOnly:true},{module:'geometry',lesson:'geometry-rays',atlasOnly:true},{module:'geometry',lesson:'geometry-topology'},{module:'transport'},{module:'orbitals'}])assert.equal((await mount(selection)).$('[data-learning-bridge="geometryActions"]'),null);
assert.equal(requests,1);assert.equal(workers,0);assert.ok(!writtenKeys.includes('symmetry-lab.quantum-materials.progress.v1'),'The bridge never marks a classroom exercise complete');
console.log('Geometry actions integration: actual lazy classroom hook, non-Array NodeLists, stable focus, native/RAM/unsubmitted state, ordinary draft retention, fresh complete-schema copy, manual current Python result, retired controls/owners, lesson/expert isolation passed.');
