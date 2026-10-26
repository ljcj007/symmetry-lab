import assert from 'node:assert/strict';
import fs from 'node:fs';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/material-observables.json',import.meta.url),'utf8'));
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
globalThis.fetch=async url=>{assert.match(url,/data\/material-observables\.json/);return {ok:true,json:async()=>data};};
const {renderObservablesView,getObservablesResult,curveSVG,formatDecomposition}=await import('../dist/observables-ui.js');
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
class Element{
 constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [name,value]of Object.entries(attributes))if(name.startsWith('data-'))this.dataset[camel(name.slice(5))]=value;this.value=decode(attributes.value||'');this.disabled=Object.hasOwn(attributes,'disabled');}
 get isConnected(){return !!this.parentNode&&this.parentNode.isConnected!==false;}
 get id(){return this.attributes.id||'';}
 get nextElementSibling(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)+1]||null;}
 set innerHTML(value){for(const child of this.children)child.parentNode=null;this.html=value;this.children=[];const stack=[this],voidTags=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);for(const match of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}const attributes={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))attributes[attr[1]]=attr[2]??'';const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);if(tag==='textarea'){const start=match.index+match[0].length,end=value.indexOf('</textarea>',start);child.value=decode(value.slice(start,end));}if(!voidTags.has(tag)&&!match[3].endsWith('/'))stack.push(child);}for(const select of this.querySelectorAll('select')){const options=select.querySelectorAll('option');select.value=(options.find(item=>Object.hasOwn(item.attributes,'selected'))||options[0])?.value||'';}}
 get innerHTML(){return this.html||'';}
 setAttribute(key,value){this.attributes[key]=String(value);}
 appendChild(child){child.parentNode=this;this.children.push(child);return child;}
 matches(selector){if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||this.className||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
globalThis.document={createElement:tag=>new Element(tag)};
class Container{constructor(){this.isConnected=true;}set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}querySelector(selector){return this.firstElementChild.querySelector(selector);}}
const answer={material:{name:'Si · 金刚石结构'},decomposition:{mechanical:[{irrep:'T1u',multiplicity:1},{irrep:'T2g',multiplicity:1}],acoustic:[{irrep:'T1u',multiplicity:1}],optical:[{irrep:'T2g',multiplicity:1,dimension:3,ir:false,raman:true}]},classes:[{label:'E',size:1,mechanical:6,acoustic:3,optical:3}],polarization:{intensity:1,channel:'raman',pattern:[{angle:0,intensity:0},{angle:45,intensity:1},{angle:90,intensity:0}]},spectrum:{assumedFrequencyCm1:300,fwhmCm1:20,points:[{wavenumber:0,intensity:0},{wavenumber:300,intensity:1},{wavenumber:600,intensity:0}]},derivation:[{title:'真实位点置换',formula:'chi=Nfixed trR',explanation:'在原胞中计算。'}],scope:['不计算 Born 电荷或 LO-TO 分裂。'],selectedMode:'sum',animatedMode:'z',sources:[],sites:[{id:'0',species:'Si',cartesian:[0,0,0]},{id:'1',species:'Si',cartesian:[.25,.25,.25]}],frames:[{sites:[{id:'0',species:'Si',cartesian:[0,0,0]},{id:'1',species:'Si',cartesian:[.25,.25,.25]}]},{sites:[{id:'0',species:'Si',cartesian:[0,0,.1]},{id:'1',species:'Si',cartesian:[.25,.25,.15]}]}],cellVertices:[[0,0,0],[.5,.5,0],[.5,0,.5],[0,.5,.5],[1,.5,.5],[.5,1,.5],[.5,.5,1],[1,1,1]],cellEdges:[[0,1],[0,2],[0,3],[1,4],[1,5],[2,4],[2,6],[3,5],[3,6],[4,7],[5,7],[6,7]]};
const clone=()=>structuredClone(answer);
const submit=container=>container.querySelector('#obs-form').onsubmit({preventDefault(){}});
const mount=async(selection={},run=async()=>clone())=>{const container=new Container(),downloads=[],navigations=[];await renderObservablesView({container,selection,run,download:(body,name)=>downloads.push({body,name}),onNavigate:route=>navigations.push(route)});return {container,downloads,navigations};};

assert.equal(formatDecomposition([{irrep:'T2',multiplicity:2}]),'2 T2');
assert.equal(curveSVG([],'angle','intensity'),'');
assert.equal(curveSVG([[NaN,1],[0,Infinity]],'angle','intensity'),'');
const curve=curveSVG([[0,0],[90,1],[180,0],[null,1]],'<angle>','a & b');
assert.match(curve,/&lt;angle&gt;/);assert.match(curve,/a &amp; b/);assert.doesNotMatch(curve,/(?:NaN|Infinity)/);
assert.match(curveSVG([[0,0],[360,0]],'angle','zero'),/max 0</,'Forbidden responses must be labeled max 0, not a plotting-axis epsilon');

const calls=[],lab=await mount({calculationOnly:true,experiment:'phonons',material:'silicon'},async(action,input)=>{calls.push({action,input});return clone();});
assert.equal(lab.container.querySelector('[data-obs-tab]'),null,'Calculator mode does not create nested course tabs');
lab.container.querySelector('#obs-angle').value='45';lab.container.querySelector('#obs-frequency').value='400';
await submit(lab.container);
assert.equal(calls[0].action,'phonons');assert.equal(calls[0].input.preset,'silicon');assert.equal(calls[0].input.frequency_cm1,400);
assert.equal(getObservablesResult().input.frequency_cm1,400);
assert.match(lab.container.querySelector('#obs-output').innerHTML,/T2g/);
assert.match(lab.container.querySelector('#obs-output').innerHTML,/用户假设峰位/);
assert.match(lab.container.querySelector('#obs-output').innerHTML,/LO-TO/);
assert.equal(lab.container.querySelector('#obs-output').querySelectorAll('.obs-curve').length,2);
lab.container.querySelector('#obs-download').onclick();
assert.equal(JSON.parse(lab.downloads[0].body).input.frequency_cm1,400);
assert.match(lab.downloads[0].name,/phonons-silicon\.json$/);
lab.container.querySelector('#obs-frame').oninput({target:{value:'1'}});
assert.match(lab.container.querySelector('#obs-motion-svg').innerHTML,/marker-end/);
for(const yaw of [-180,-90,0,90,180]){lab.container.querySelector('#obs-yaw').oninput({target:{value:String(yaw)}});for(const line of lab.container.querySelector('#obs-motion-svg').querySelectorAll('line'))for(const coord of ['x1','x2','y1','y2']){const n=Number(line.attributes[coord]);assert.ok(Number.isFinite(n)&&n>=0&&n<=(coord.startsWith('x')?640:360),'3D projection remains inside the canvas');}}
lab.container.querySelector('#obs-angle').value='90';
lab.container.querySelector('#obs-form').oninput({target:lab.container.querySelector('#obs-angle')});
assert.equal(lab.container.querySelector('#obs-angle').nextElementSibling.textContent,'90°');
assert.equal(getObservablesResult(),null,'Changing input must clear exportable results');
assert.match(lab.container.querySelector('#obs-output').innerHTML,/参数已改变/);
assert.equal(lab.container.querySelector('#obs-download'),null);
await submit(lab.container);
assert.ok(getObservablesResult());
await mount({calculationOnly:true,experiment:'phonons',material:'nacl'});
assert.equal(getObservablesResult(),null,'A fresh route cannot export a previous material calculation');

let resolvePending;
const pending=await mount({tab:'lab',material:'silicon'},()=>new Promise(resolve=>{resolvePending=resolve;}));
const pendingRequest=submit(pending.container);
pending.container.querySelector('#obs-material').onchange({target:{value:'nacl'}});
resolvePending(clone());await pendingRequest;
assert.equal(getObservablesResult(),null,'A response for the previous material cannot overwrite current context');
assert.equal(pending.container.querySelector('#obs-preset').value,'nacl');
assert.equal(pending.container.querySelector('#obs-channel').value,'ir');
assert.equal(pending.container.querySelector('#obs-fields').disabled,false);

let resolveChangedTab;
const changedTab=await mount({tab:'lab'},()=>new Promise(resolve=>{resolveChangedTab=resolve;}));
const tabRequest=submit(changedTab.container);
changedTab.container.querySelector('[data-obs-tab="learn"]').onclick();
resolveChangedTab(clone());await tabRequest;
assert.ok(changedTab.container.querySelector('#obs-lesson'),'A late request cannot remove the newly selected lesson');

let resolveDetached;
const detached=await mount({tab:'lab'},()=>new Promise(resolve=>{resolveDetached=resolve;}));
const detachedRequest=submit(detached.container);detached.container.isConnected=false;resolveDetached(clone());await detachedRequest;
assert.equal(getObservablesResult(),null,'Detached views cannot publish a late response');

const failing=await mount({tab:'lab'},async()=>{throw new Error('<invalid input>');});
await submit(failing.container);assert.match(failing.container.querySelector('#obs-output').innerHTML,/&lt;invalid input&gt;/);assert.equal(getObservablesResult(),null);
const exercise=data.exercises[0],practice=await mount({tab:'derive',exercise:exercise.id});
assert.equal(practice.container.querySelector('#obs-steps').children.length,1);
let step=practice.container.querySelector('#obs-steps').children[0];
step.querySelector(`[data-answer="${(exercise.steps[0].answer+1)%exercise.steps[0].choices.length}"]`).onclick();
assert.equal(practice.container.querySelector('#obs-steps').children.length,1,'Wrong answer gives a hint without advancing');
for(let index=0;index<exercise.steps.length;index++){step=practice.container.querySelector('#obs-steps').children[index];step.querySelector(`[data-answer="${exercise.steps[index].answer}"]`).onclick();}
assert.equal(JSON.parse(storage.get('symmetry-lab.observables.progress.v1'))[exercise.id],true);
assert.match(practice.container.querySelector('#obs-progress').textContent,/全部步骤完成/);
const restored=await mount({tab:'derive',exercise:exercise.id});
assert.match(restored.container.querySelector('#obs-content').innerHTML,/✓ /,'Exercise completion survives remounting');
console.log('Observables UI: exact result schema, two curves, safe formatting, 3D viewport, input/export invalidation, stale material and detached responses, changing tabs while running, and stepwise persisted exercises passed.');
