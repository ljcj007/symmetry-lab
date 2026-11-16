import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Container,Element} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog,catalogFiles,localeRoot} from './english-catalog.mjs';
import {waterActionsModel as model,waterActionsResultHTML as render,waterActionsDrawingHTML as drawing,bindWaterActionsLesson as bind} from '../dist/water-actions-ui.js';

// Simulate browser NodeLists rather than relying on the array-only adapter.
const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const list=queryAll.call(this,selector);if(parsing)return list;return Object.assign({length:list.length,forEach:fn=>list.forEach(fn),[Symbol.iterator]:function*(){yield* list;}},Object.fromEntries(list.map((n,i)=>[i,n])));};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let gradeWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>gradeWrites++};
const clone=structuredClone,json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const refs=json('./fixtures/water-actions.json');
assert.equal(refs.schema,'symmetry-lab-water-actions-fixture-1');assert.match(refs.method,/Actual browser_api\.run/);assert.equal(refs.cases.length,1);
const genuine=refs.cases[0],r=genuine.result;
assert.equal(genuine.action,'water_actions');assert.deepEqual(genuine.input,{});
const core='dist/python/water_actions.py';assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+core,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),refs.sourceHashes[core]);
assert.equal(model(r).status,'available');assert.match(render({}),/role="alert"/);assert.equal(drawing({}),'');
const pristine=clone(r);
for(const operation of r.operations)for(const column of r.basis){
 for(let stage=1;stage<=5;stage++)assert.doesNotMatch(render(r,{operation:operation.id,column:column.label,stage,details:{matrix:true,reductions:true}}),/katex-error|\bNaN\b|\bundefined\b|\bInfinity\b/);
 for(const after of [false,true])for(const width of [200,260,340,680]){
  const svg=drawing(r,{operation:operation.id,column:column.label,after,width});assert.match(svg,new RegExp('viewBox="0 0 '+width+' 302"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined/);assert.equal((svg.match(/class="wax-site/g)||[]).length,3);assert.match(svg,after?/class="wax-arrow-final"/:/class="wax-arrow-initial"/);
 }
}
assert.deepEqual(r,pristine,'Rendering never mutates the actual Python result');
const operationHeaders=new Element('section');operationHeaders.innerHTML=render(r,{stage:4});
const annotations=Array.from(operationHeaders.querySelectorAll('annotation')).map(n=>n.textContent);
assert.ok(annotations.includes('C_2(z)'));assert.ok(annotations.includes(String.raw`\sigma(xz)`));assert.ok(annotations.includes(String.raw`\sigma(yz)`),'Mirror-operation headers retain real Greek mathematical symbols and plane labels');
assert.doesNotMatch(render(r,{stage:1}),/九个基矢的对角账本|当前通道逐模检验|逐项约化：/,'First observe atom maps before revealing the trace and reduction');
assert.match(render(r,{stage:2}),/H1x → −H2x/);assert.match(render(r,{stage:3}),/固定反例/);assert.match(render(r,{stage:4}),/两个等价副本/);assert.match(render(r,{stage:5}),/对称许可/);
const depth=drawing(r,{operation:'E',column:'Oy'}).match(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" class="wax-arrow-initial"/);
assert.ok(depth);assert.notEqual(depth[1],depth[3],'The y arrow is not hidden along the view direction');assert.notEqual(depth[2],depth[4]);

function mount({store=new Map(),calculate,active=()=>true,binder=bind,bodyRoot=false}={}){
 const page=new Container();page.innerHTML='<section><div data-water-actions-body></div></section>';
 const calls=[],cancels=[],exports=[];
 const run=calculate||((action,input)=>{calls.push({action,input:clone(input)});assert.equal(action,'water_actions');assert.deepEqual(input,{});return Promise.resolve(clone(r));});
 const cleanup=binder({root:bodyRoot?page.querySelector('[data-water-actions-body]'):page.firstElementChild,stateStore:store,isCurrent:active,run,cancelRun:()=>cancels.push(true),download:(body,name,type)=>exports.push({body:JSON.parse(body),name,type})});
 return {page,store,calls,cancels,exports,cleanup,$:name=>page.querySelector('#wax-'+name)};
}
const choose=(v,name,value)=>{const n=v.$(name);assert.ok(n,name);n.value=String(value);return n.onchange?.({target:n});};
const click=(v,name)=>{const n=v.$(name);assert.ok(n,name);return n.onclick?.();};
const note=(v,value)=>{v.$('note').value=value;v.$('note').oninput({target:v.$('note')});};
const submit=v=>v.$('form').onsubmit({preventDefault(){}});
for(const bodyRoot of [false,true]){
 const v=mount({bodyRoot});assert.equal(v.calls.length,0);assert.equal(v.$('export'),null);await submit(v);assert.deepEqual(v.calls,[{action:'water_actions',input:{}}]);assert.equal(v.$('error').hidden,true);assert.equal(v.$('operation').value,'C2');assert.equal(v.$('column').value,'H1x');
 for(let i=0;i<4;i++)click(v,'next');assert.equal(v.$('stage-status').textContent,'水分子位移步骤 5 / 5 步');assert.equal(v.$('next').disabled,true);
 for(const o of r.operations){choose(v,'operation',o.id);for(const b of r.basis)choose(v,'column',b.label);}
 for(const ch of r.selectionChannels)choose(v,'channel',ch.id);assert.equal(v.calls.length,1,'All 36 columns and four optical channels are local result choices');
 const d=v.page.querySelector('[data-wax-native="matrix"]');assert.ok(!d.innerHTML.includes('<table'));d.open=true;d.ontoggle();assert.ok(v.page.querySelector('[data-wax-native="matrix"]').innerHTML.includes('<table'));
 const restoredOpen=v.page.querySelector('[data-wax-native="matrix"]');restoredOpen.ontoggle();assert.equal(v.page.querySelector('[data-wax-native="matrix"]'),restoredOpen,'Queued native open restoration does not redraw recursively');
 const reductions=v.page.querySelector('[data-wax-native="reductions"]');reductions.open=true;reductions.ontoggle();note(v,'The returned H1x coefficient is off diagonal.');choose(v,'predict-oxygen','right');click(v,'check-oxygen');
 click(v,'export');assert.deepEqual(v.exports[0],{body:{kind:'water-actions-teaching',input:{},result:r},name:'water-actions-ledger.json',type:'application/json'});
 const saved=v.cleanup.snapshot();v.cleanup();const back=mount({store:v.store,bodyRoot});assert.equal(back.calls.length,0);assert.equal(back.$('note').value,saved.note);assert.equal(back.$('operation').value,'sigma-yz');assert.equal(back.$('column').value,'H2z');assert.equal(back.$('channel').value,'raman-xz');assert.equal(back.$('stage-status').textContent,'水分子位移步骤 5 / 5 步');assert.equal(back.page.querySelector('[data-wax-native="matrix"]').open,true);assert.equal(back.page.querySelector('[data-wax-native="reductions"]').open,true);assert.equal(back.$('feedback-oxygen').textContent,v.$('feedback-oxygen').textContent);back.cleanup();
}
const predictions=mount();for(const name of ['oxygen','hydrogen','copies']){choose(predictions,'predict-'+name,'wrong');click(predictions,'check-'+name);const wrong=predictions.$('feedback-'+name).textContent;choose(predictions,'predict-'+name,'right');assert.equal(predictions.$('feedback-'+name).textContent,'');click(predictions,'check-'+name);assert.notEqual(predictions.$('feedback-'+name).textContent,wrong);}assert.equal(predictions.calls.length,0);predictions.cleanup();
const v=mount();await submit(v);const staleNext=v.$('next').onclick,staleExport=v.$('export').onclick;click(v,'next');const currentStage=v.cleanup.snapshot().stage;staleNext();staleExport();assert.equal(v.cleanup.snapshot().stage,currentStage);assert.equal(v.exports.length,0,'Detached result controls cannot export or change the current view');v.cleanup();
const escaped=clone(r);escaped.sources[0].title='<img src=x onerror=x>';escaped.sources[0].scope='<script>unsafe</script>';const escapedView=mount({calculate:async()=>escaped});await submit(escapedView);assert.doesNotMatch(escapedView.$('result').innerHTML,/<img|<script>/);assert.match(escapedView.$('result').innerHTML,/&lt;img/);escapedView.cleanup();

const damaged=[
 x=>x.schema='wrong',x=>x.input={operation:'C2'},x=>delete x.conventions,x=>x.conventions.plane='yz',x=>x.conventions.active=false,x=>x.operationOrder.reverse(),x=>x.basis.pop(),x=>x.basis[0].label='wrong',x=>x.atoms[0].position[0]=NaN,x=>x.operations.pop(),x=>x.operations[1].atomPermutation=[0,0,0],x=>x.operations[1].atomMaps[1].targetAtomId='H1',x=>x.operations[1].columns.pop(),x=>x.operations[1].columns[3].sourceLabel='H2x',x=>x.operations[1].columns[3].targetLabel='H1x',x=>x.operations[1].columns[3].vector[6]=1,x=>x.operations[1].columns[3].outputArrow=[1,0,0],x=>x.operations[1].matrix[6][3]=1,x=>x.operations[1].diagonal[0]=1,x=>x.operations[1].traceTerms[0].coefficient=1,x=>x.characters.displacement[1]=1,x=>x.reductions.vibration.components.pop(),x=>x.reductions.vibration.characters[0]=4,x=>x.selectionChannels[0].modeRows.pop(),x=>x.selectionChannels[0].modeRows[0].allowed=false,x=>x.counterexample.exampleColumn=0,x=>x.multiplicationTable[0][0]=8,x=>x.checks[0].passed=false,x=>x.sources[0].url='javascript:alert(1)'
];
for(const damage of damaged){const broken=clone(r);damage(broken);assert.equal(model(broken).status,'invalid',String(damage));assert.match(render(broken),/role="alert"/);}
let attempt=0;const broken=clone(r);broken.operations.pop();const recovery=mount({calculate:async()=>clone(attempt++?r:broken)});await assert.doesNotReject(submit(recovery));assert.equal(recovery.$('error').hidden,false);assert.equal(recovery.$('fieldset').disabled,false);assert.equal(recovery.$('export'),null);await submit(recovery);assert.equal(recovery.$('error').hidden,true);assert.ok(recovery.$('export'));recovery.cleanup();
const absent=mount({calculate:undefined});absent.cleanup();
let firstResolve,secondResolve;const racing=mount({calculate:()=>new Promise(resolve=>{if(!firstResolve)firstResolve=resolve;else secondResolve=resolve;})});const first=submit(racing),oldCancel=racing.$('cancel').onclick;click(racing,'cancel');assert.equal(racing.cancels.length,1);const second=submit(racing);firstResolve(clone(r));await first;assert.equal(racing.$('fieldset').disabled,true);oldCancel();assert.equal(racing.cancels.length,1);secondResolve(clone(r));await second;assert.equal(racing.$('fieldset').disabled,false);racing.cleanup();
let finishLate,active=true,scoped=0;const task=new Promise(resolve=>{finishLate=resolve;});task.cancel=()=>{scoped++;return true;};const leaving=mount({calculate:()=>task,active:()=>active}),pending=submit(leaving);active=false;leaving.cleanup();assert.equal(scoped,1);assert.equal(leaving.cancels.length,0);finishLate(clone(r));await pending;assert.equal(leaving.$('export'),null);
const ownerPage=new Container();ownerPage.innerHTML='<section><div data-water-actions-body></div></section>';let finishOwner,ownerCancels=0;const ownerTask=new Promise(resolve=>{finishOwner=resolve;});ownerTask.cancel=()=>{ownerCancels++;return true;};const older=bind({root:ownerPage.firstElementChild,run:()=>ownerTask}),olderPending=ownerPage.querySelector('#wax-form').onsubmit({preventDefault(){}});const newer=bind({root:ownerPage.firstElementChild,run:async()=>clone(r)});older();assert.equal(ownerCancels,1);finishOwner(clone(r));await olderPending;assert.equal(ownerPage.querySelector('#wax-export'),null);await ownerPage.querySelector('#wax-form').onsubmit({preventDefault(){}});assert.equal(ownerPage.querySelector('#wax-error').hidden,true);newer();

// The actual shared Python client supplies task-scoped cancellation handles.
const previousWorker=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}reply(result){this.onmessage({data:{id:this.message.id,result}});}};
const client=await import('../dist/python-client.js?water-ui-ownership'),oldView=mount({calculate:client.runPythonTask}),oldPending=submit(oldView);client.cancelPython();const fresh=client.runPythonTask('water_actions',{}),freshWorker=workers.at(-1);oldView.cleanup();assert.equal(freshWorker.terminated,false);freshWorker.reply(clone(r));await fresh;await oldPending;assert.equal(fresh.cancel(),false);globalThis.Worker=previousWorker;

const source=fs.readFileSync(new URL('../dist/water-actions-ui.js',import.meta.url),'utf8'),locale=json('../locales/en-water-actions-ui.json'),translations={...loadEnglishCatalog(),...locale},units=new Set();
const oldCatalog=Object.assign({},...catalogFiles.filter(name=>!/^en-water-actions-/.test(name)&&fs.existsSync(path.join(localeRoot,name))).map(name=>JSON.parse(fs.readFileSync(path.join(localeRoot,name),'utf8'))));
for(const [key,value] of Object.entries(locale))if(Object.hasOwn(oldCatalog,key))assert.equal(value,oldCatalog[key],'Water translations must preserve every old global meaning: '+key);
for(const s of jsStrings(source))for(const unit of textUnits(s.value))if(HAN.test(unit))units.add(unit.trim());
for(const unit of units)assert.ok(translations[unit],'Missing water-workshop translation: '+unit);
for(const [s,t] of Object.entries(locale)){assert.ok(units.has(s),'Unused water-workshop translation: '+s);assert.ok(t.trim()&&!HAN.test(t));}
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage|sympify|Math\.(?:sin|cos)/);
const css=fs.readFileSync(new URL('../dist/water-actions.css',import.meta.url),'utf8');assert.match(css,/font-size:max\(18px,1rem\)/);assert.match(css,/\.wax-scroll\{[^}]*overflow-x:auto/);assert.match(css,/@container water-actions \(min-width:760px\)/);assert.match(css,/@media\(max-width:600px\)/);

// Translate the production strings and run all five effective English stages.
// Prefer the actual built English module when the site build has produced it.
const edits=[];for(const item of jsStrings(source)){const value=replaceUnits(item.value,s=>translations[s.trim()]??s);if(value!==item.value){assert.equal(item.type,'literal');edits.push({...item,value:JSON.stringify(value)});}}
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.value+englishSource.slice(edit.end);
englishSource=englishSource.replace(/'\.\/math-display\.js\?[^']*'/,JSON.stringify(new URL('../dist/math-display.js',import.meta.url).href));
const actualEnglish=new URL('../dist/en/water-actions-ui.js',import.meta.url),english=fs.existsSync(actualEnglish)?await import(actualEnglish.href+'?water-ui-test'):await import('data:text/javascript;base64,'+Buffer.from(englishSource).toString('base64'));
assert.equal(english.waterActionsModel(clone(r)).status,'available');const en=mount({binder:english.bindWaterActionsLesson});await submit(en);for(let i=0;i<4;i++)click(en,'next');choose(en,'column','H1y');choose(en,'channel','raman-xz');choose(en,'predict-copies','right');click(en,'check-copies');
assert.match(en.$('stage-status').textContent,/Water-displacement step\s+5\s*\/\s*5/);assert.match(en.$('feedback-copies').textContent,/dimension 1/);assert.ok(!HAN.test(en.page.querySelector('[data-water-actions-body]').innerHTML));assert.ok(!HAN.test(en.$('result').innerHTML));click(en,'export');assert.deepEqual(en.exports[0].body.result,r);assert.deepEqual(en.exports[0].body.input,{});en.cleanup();assert.equal(gradeWrites,0);
console.log('Water actions UI: genuine complete Python reply; all36 operation-columns and four optical channels; five stages, full diagonal and reduction ledgers, visible y arrows, optional matrices, independent exports, three predictions, page memory, scoped cancellation/late ownership, actual shared client, strict schema rejection, enlarged type, local scrolling and effective English DOM passed.');
