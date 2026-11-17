import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Container,Element} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog,catalogFiles,localeRoot} from './english-catalog.mjs';
import {representationActionsRequest as request,representationActionsModel as model,representationActionsResultHTML as render,representationActionsDrawingHTML as drawing,bindRepresentationActionsLesson as bind} from '../dist/representation-actions-ui.js';

const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const a=queryAll.call(this,selector);if(parsing)return a;return Object.assign({length:a.length,forEach:fn=>a.forEach(fn),[Symbol.iterator]:function*(){yield* a;}},Object.fromEntries(a.map((n,i)=>[i,n])));};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let gradeWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>gradeWrites++};
const clone=structuredClone,json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const fixture=json('./fixtures/representation-actions.json');
assert.equal(fixture.schema,'symmetry-lab-representation-actions-fixture-1');assert.match(fixture.method,/actual browser_api\.run/i);assert.equal(fixture.cases.length,5);
const refs=new Map(fixture.cases.map(c=>[JSON.stringify(c.input),c.result])),r=refs.get(JSON.stringify({point:[1,2]})),origin=refs.get(JSON.stringify({point:[0,0]}));
assert.ok(r&&origin);
for(const [name,sha]of Object.entries(fixture.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),sha,name);
for(const c of fixture.cases){assert.equal(model(c.result).status,'available');assert.deepEqual(request({px:String(c.input.point[0]),py:String(c.input.point[1])}),c.input);}
const pristine=clone(r);
for(let stage=1;stage<=5;stage++)assert.doesNotMatch(render(r,{stage,details:{matrices:true,products:true}}),/katex-error|\bNaN\b|\bundefined\b|\bInfinity\b/);
for(const f of r.families)for(const p of f.pairs)assert.doesNotMatch(render(r,{stage:2,family:f.id,left:p.g,right:p.h}),/katex-error|\bNaN\b|\bundefined\b|\bInfinity\b/);
assert.deepEqual(r,pristine,'All 256 selectable product records remain unchanged by rendering');
assert.doesNotMatch(render(r,{stage:1}),/按群乘法比较两条路径|两反射的乘积|混用表中的/);
assert.match(render(r,{stage:4}),/18 对乘法不成立/);assert.match(render(r,{stage:5}),/辅助二维空间/);assert.match(render(r,{stage:5}),/在复数域可对角化，在实数域不能对角化/);
const badOrigin=render(origin,{stage:2,family:'mixed',left:'R',right:'R2'});
assert.match(badOrigin,/完整矩阵<\/th><td>否/);assert.match(badOrigin,/输入点的结果<\/th><td>是/);assert.match(badOrigin,/两个单位基矢的结果<\/th><td>否/,'An unchanged zero probe must not certify a failed matrix product');
const common=render(r,{stage:2,family:'common'});assert.match(common,/图以旧物理坐标绘制/);assert.match(common,/下表给出当前基底的坐标/);assert.match(common,/e&#x27;_1|e'_1/,'The current new basis has explicit prime labels');
for(const family of ['original','common','mixed','trivial'])for(const frameIndex of [0,1,2])for(const width of [200,340,680]){
 const svg=drawing(r,{family,frameIndex,width});assert.match(svg,new RegExp('viewBox="0 0 '+width+' 290"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined|<polygon/);assert.match(svg,family==='common'?/1′/:/>1</);
 assert.match(svg,family==='original'||family==='common'?/返回的物理点与基矢图/:/返回的代数坐标演算图/);
}
assert.equal(model({}).status,'invalid');assert.match(render({}),/role="alert"/);assert.equal(drawing({}),'');
for(const raw of [{px:'',py:'1'},{px:'1.0',py:'2'},{px:'1e0',py:'2'},{px:'3',py:'2'},{px:1,py:'2'},{px:'1',py:null},{px:'1;alert(1)',py:'2'}])assert.throws(()=>request(raw));

function mount({store=new Map(),lessonId='representations',calculate,active=()=>true,binder=bind,bodyRoot=false}={}){
 const page=new Container();page.innerHTML='<section><div data-representation-actions-body></div></section>';const calls=[],cancels=[],exports=[];
 const run=calculate||((action,input)=>{calls.push({action,input:clone(input)});assert.equal(action,'representation_actions');const found=refs.get(JSON.stringify(input));assert.ok(found,'Use an actual public API fixture');return Promise.resolve(clone(found));});
 const cleanup=binder({root:bodyRoot?page.querySelector('[data-representation-actions-body]'):page.firstElementChild,lessonId,stateStore:store,isCurrent:active,run,cancelRun:()=>cancels.push(true),download:(body,name,type)=>exports.push({body:JSON.parse(body),name,type})});
 return{page,store,lessonId,calls,cancels,exports,cleanup,$:name=>page.querySelector('#rpa-'+name)};
}
const choose=(v,name,value)=>{const n=v.$(name);assert.ok(n,name);n.value=String(value);return n.onchange?.({target:n});};
const edit=(v,name,value)=>{const n=v.$(name);n.value=value;return n.oninput?.({target:n});};
const click=(v,name)=>{const n=v.$(name);assert.ok(n,name);return n.onclick?.();};
const submit=v=>v.$('form').onsubmit({preventDefault(){}});
for(const bodyRoot of [false,true]){
 const v=mount({bodyRoot});assert.equal(v.calls.length,0);assert.equal(v.$('export'),null);assert.ok(v.page.querySelector('[href="docs/representation-actions.md"]'));
 await submit(v);assert.deepEqual(v.calls,[{action:'representation_actions',input:{point:[1,2]}}]);assert.equal(v.$('error').hidden,true);
 click(v,'next');for(const f of r.families){choose(v,'family',f.id);for(let i=0;i<8;i++){choose(v,'operation-left',r.group.operationIds[i]);choose(v,'operation-right',r.group.operationIds[7-i]);}}
 assert.equal(v.calls.length,1,'Family and product choices only browse the one complete reply');
 for(let i=0;i<3;i++)click(v,'next');assert.equal(v.$('stage-status').textContent,'表示核验步骤 5 / 5 步');assert.equal(v.$('next').disabled,true);
 choose(v,'family','mixed');choose(v,'operation-left','R');choose(v,'operation-right','R2');choose(v,'frame','1');
 for(const name of ['matrices','products']){const d=v.page.querySelector('[data-rpa-native="'+name+'"]');assert.ok(d);d.open=true;d.ontoggle();}
 const d=v.page.querySelector('[data-rpa-native="products"]');d.ontoggle();assert.equal(v.page.querySelector('[data-rpa-native="products"]'),d,'Restoring native open state cannot recurse into a redraw');
 edit(v,'note','Same trace does not establish the multiplication law.');choose(v,'predict-trace','right');click(v,'check-trace');click(v,'export');
 assert.deepEqual(v.exports[0],{body:{kind:'representation-actions-teaching',lessonId:'representations',input:{point:[1,2]},result:r},name:'representation-actions-ledger.json',type:'application/json'});
 const saved=v.cleanup.snapshot();v.cleanup();const back=mount({store:v.store,bodyRoot});assert.equal(back.calls.length,0);assert.equal(back.$('note').value,saved.note);assert.equal(back.$('family').value,'mixed');assert.equal(back.$('operation-left').value,'R');assert.equal(back.$('operation-right').value,'R2');assert.equal(back.$('frame').value,'1');assert.equal(back.$('stage-status').textContent,'表示核验步骤 5 / 5 步');assert.equal(back.page.querySelector('[data-rpa-native="matrices"]').open,true);assert.equal(back.page.querySelector('[data-rpa-native="products"]').open,true);assert.match(back.$('feedback-trace').textContent,/18 对/);
 const staleExport=back.$('export').onclick;edit(back,'px','-');assert.equal(back.$('export'),null);await submit(back);assert.equal(back.$('px').value,'-');assert.equal(back.$('error').hidden,false);assert.equal(back.calls.length,0);staleExport();assert.equal(back.exports.length,0);back.cleanup();
 const incomplete=mount({store:v.store});assert.equal(incomplete.$('px').value,'-');assert.equal(incomplete.$('export'),null);edit(incomplete,'px','0');edit(incomplete,'py','0');await submit(incomplete);assert.deepEqual(incomplete.calls[0].input,{point:[0,0]});click(incomplete,'export');assert.deepEqual(incomplete.exports[0].body.input,{point:[0,0]});assert.deepEqual(incomplete.exports[0].body.result,origin);incomplete.cleanup();
}
const separate=new Map(),a=mount({store:separate});edit(a,'px','-');edit(a,'note','representation lesson');a.cleanup();const b=mount({store:separate,lessonId:'character-reduction'});assert.equal(b.$('px').value,'1');assert.equal(b.$('note').value,'');await submit(b);edit(b,'note','reduction lesson');b.cleanup();const a2=mount({store:separate});assert.equal(a2.$('px').value,'-');assert.equal(a2.$('note').value,'representation lesson');assert.equal(a2.$('export'),null);a2.cleanup();
const corruptStore=new Map([['representation-panel:representations',{raw:{px:'0',py:'0'},input:{point:[1,2]},result:r}]]),corrupt=mount({store:corruptStore});assert.equal(corrupt.$('export'),null,'Saved results must match the editable coordinate draft');corrupt.cleanup();
const predicted=mount();for(const name of ['trace','repeat','diagonal']){choose(predicted,'predict-'+name,'wrong');click(predicted,'check-'+name);const wrong=predicted.$('feedback-'+name).textContent;choose(predicted,'predict-'+name,'right');assert.equal(predicted.$('feedback-'+name).textContent,'');click(predicted,'check-'+name);assert.notEqual(predicted.$('feedback-'+name).textContent,wrong);}assert.equal(predicted.calls.length,0);predicted.cleanup();
const escaped=clone(r);escaped.sources[0].title='<img src=x onerror=x>';const escapeView=mount({calculate:async()=>escaped});await submit(escapeView);assert.doesNotMatch(escapeView.$('result').innerHTML,/<img|<script>/);assert.match(escapeView.$('result').innerHTML,/&lt;img/);escapeView.cleanup();

const damage=[x=>x.schema='wrong',x=>x.input.point=[3,0],x=>x.group.operationIds.reverse(),x=>x.group.multiplicationTable[0][0]='unknown',x=>x.basisChange.reconstructedPoint.vector=[0,0],x=>x.families.reverse(),x=>x.families[2].physicalGeometry=true,x=>x.families[3].space='physical-xy',x=>x.families[2].law.isRepresentation=true,x=>x.families[2].law.failedPairs=0,x=>x.families[0].operations.pop(),x=>x.families[0].operations[0].trace=99,x=>x.families[0].pairs.pop(),x=>x.families[0].pairs[0].productId='R',x=>x.families[0].pairs[0].frames[0].point.vector=[2,2],x=>x.families[0].pairs[0].pointEqual=false,x=>x.families[2].pairs[0].frames[0].physicalPoint={vector:[1,2],latex:'x'},x=>x.families[0].formalCharacterNorm.denominator=0,x=>x.commonReconstruction[0].operatorEqual=false,x=>x.diagonalization.noCommonDiagonalBasis=false,x=>x.diagonalization.rotationField.realDiagonalizable=true,x=>x.checks[0].passed=false,x=>x.sources[0].url='javascript:alert(1)'];
for(const fn of damage){const bad=clone(r);fn(bad);assert.equal(model(bad).status,'invalid',String(fn));assert.match(render(bad),/role="alert"/);}
let attempt=0;const bad=clone(r);bad.families.pop();const recovery=mount({calculate:async()=>clone(attempt++?r:bad)});await submit(recovery);assert.equal(recovery.$('error').hidden,false);assert.equal(recovery.$('export'),null);await submit(recovery);assert.equal(recovery.$('error').hidden,true);assert.ok(recovery.$('export'));recovery.cleanup();
let finishOld,finishNew,scopedCancels=0;const tasks=[];const racing=mount({calculate:()=>{const task=new Promise(resolve=>{if(!finishOld)finishOld=resolve;else finishNew=resolve;});task.cancel=()=>{scopedCancels++;return true;};tasks.push(task);return task;}});const oldRun=submit(racing);click(racing,'cancel');assert.equal(scopedCancels,1);const newRun=submit(racing);finishOld(clone(r));await oldRun;assert.equal(racing.$('fieldset').disabled,true);finishNew(clone(r));await newRun;assert.equal(racing.$('fieldset').disabled,false);racing.cleanup();
let late,active=true;const scopedTask=new Promise(resolve=>{late=resolve;});scopedTask.cancel=()=>{scopedCancels++;return true;};const leaving=mount({calculate:()=>scopedTask,active:()=>active}),leftRun=submit(leaving);active=false;leaving.cleanup();assert.equal(scopedCancels,2);assert.equal(leaving.cancels.length,0);late(clone(r));await leftRun;assert.equal(leaving.$('export'),null);
let finishUnscoped;const unscoped=mount({calculate:()=>new Promise(resolve=>{finishUnscoped=resolve;})}),unscopedRun=submit(unscoped);unscoped.cleanup();assert.equal(unscoped.cancels.length,0,'Automatic cleanup cannot blindly cancel an unrelated global task');finishUnscoped(clone(r));await unscopedRun;

const previousWorker=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}reply(result){this.onmessage({data:{id:this.message.id,result}});}};
const client=await import('../dist/python-client.js?representation-ui-ownership'),oldView=mount({calculate:client.runPythonTask}),pending=submit(oldView);client.cancelPython();const newer=client.runPythonTask('representation_actions',{point:[1,2]}),newWorker=workers.at(-1);oldView.cleanup();assert.equal(newWorker.terminated,false);newWorker.reply(clone(r));await newer;await pending;assert.equal(newer.cancel(),false);globalThis.Worker=previousWorker;

const source=fs.readFileSync(new URL('../dist/representation-actions-ui.js',import.meta.url),'utf8'),locale=json('../locales/en-representation-actions-ui.json'),translations={...loadEnglishCatalog(),...locale},units=new Set();
const oldCatalog=Object.assign({},...catalogFiles.filter(name=>!/^en-representation-actions-/.test(name)&&fs.existsSync(path.join(localeRoot,name))).map(name=>JSON.parse(fs.readFileSync(path.join(localeRoot,name),'utf8'))));
for(const [key,value]of Object.entries(locale))if(Object.hasOwn(oldCatalog,key))assert.equal(value,oldCatalog[key],'Preserve old global translations: '+key);
for(const item of jsStrings(source))for(const unit of textUnits(item.value))if(HAN.test(unit))units.add(unit.trim());
for(const unit of units)assert.ok(translations[unit],'Missing representation translation: '+unit);
for(const [s,t]of Object.entries(locale)){assert.ok(units.has(s),'Unused representation translation: '+s);assert.ok(t.trim()&&!HAN.test(t));}
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage|sympify|Math\.(?:sin|cos)/);
const css=fs.readFileSync(new URL('../dist/representation-actions.css',import.meta.url),'utf8');assert.match(css,/font-size:max\(18px,1rem\)/);assert.match(css,/\.rpa-scroll\{[^}]*overflow-x:auto/);assert.match(css,/@container representation-actions \(min-width:760px\)/);
const edits=[];for(const item of jsStrings(source)){const value=replaceUnits(item.value,s=>translations[s.trim()]??s);if(value!==item.value){assert.equal(item.type,'literal');edits.push({...item,value:JSON.stringify(value)});}}
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.value+englishSource.slice(edit.end);
englishSource=englishSource.replace(/'\.\/math-display\.js\?[^']*'/,JSON.stringify(new URL('../dist/math-display.js',import.meta.url).href));
const actualEnglish=new URL('../dist/en/representation-actions-ui.js',import.meta.url),english=fs.existsSync(actualEnglish)?await import(actualEnglish.href+'?representation-ui-test'):await import('data:text/javascript;base64,'+Buffer.from(englishSource).toString('base64'));
const en=mount({binder:english.bindRepresentationActionsLesson});await submit(en);for(let i=0;i<4;i++)click(en,'next');choose(en,'family','mixed');choose(en,'predict-diagonal','right');click(en,'check-diagonal');assert.match(en.$('stage-status').textContent,/Representation-check step\s+5\s*\/\s*5/);assert.match(en.$('feedback-diagonal').textContent,/nonzero commutator/);assert.ok(!HAN.test(en.page.querySelector('[data-representation-actions-body]').innerHTML));assert.doesNotMatch(en.$('result').innerHTML,/katex-error/);click(en,'export');assert.deepEqual(en.exports[0].body.result,r);assert.deepEqual(en.exports[0].body.input,{point:[1,2]});en.cleanup();assert.equal(gradeWrites,0);
console.log('Representation UI: genuine five-point references, all256 product selections, five stages, origin counterexample, basis/physical-coordinate distinctions, separate lesson drafts, immutable exports, predictions, native disclosures, task ownership and English display passed.');
