import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {jsStrings,textUnits,HAN,replaceUnits} from './english-source.mjs';
import {Element,Container} from './test-material-research-ui.mjs';
import * as bridge from '../dist/order-actions-bridge.js';
import {ORDER_ACTIONS_REFERENCE as actual} from '../dist/order-actions-reference.js';
const {ORDER_ACTIONS_BRIDGE_HOOKS:hooks,orderIsotropyReference:iso,orderReynoldsReference:reynolds,orderFieldReference:field,orderConventionReference:convention,orderActionsLabRequest:request}=bridge;
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-12,`${a} != ${b}`),array=(a,b)=>{assert.equal(a.length,b.length);a.forEach((x,i)=>Array.isArray(x)?array(x,b[i]):near(x,b[i]));};
const apply=(a,v)=>a.map(row=>row.reduce((s,x,i)=>s+x*v[i],0));
const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[v,...p])):[[]];
function signedGroup(n){const result=[];for(const p of permutations([...Array(n).keys()]))for(let mask=0;mask<2**n;mask++)result.push(p.map((j,i)=>[...Array(n).keys()].map(k=>k===j?(mask>>i&1?1:-1):0)));return result;}
const key=a=>JSON.stringify(a),normalized=s=>s.replace(/\r\n?/g,'\n');
assert.equal(actual.coreSHA256,createHash('sha256').update(normalized(fs.readFileSync(new URL('../dist/python/order_parameter_lab.py',import.meta.url),'utf8'))).digest('hex'));
for(const kind of ['axis','zero']){
 const r=iso(kind),independent=signedGroup(3);assert.deepEqual(new Set(r.record.order.operations.map(x=>key(x.matrix))),new Set(independent.map(key)));
 const buckets=new Map();for(const g of independent){const k=key(apply(g,r.record.order.vector));buckets.set(k,(buckets.get(k)||0)+1);}
 assert.equal(r.buckets.length,kind==='axis'?6:1);assert.deepEqual(new Set(r.buckets.map(b=>key([b.vector,b.operations.length]))),new Set([...buckets].map(([v,n])=>key([JSON.parse(v),n]))));
 for(const op of r.record.order.operations){const selected=iso(kind,String(op.id));array(op.image,apply(op.matrix,r.record.order.vector));selected.products.forEach((row,i)=>near(row.reduce((a,b)=>a+b,0),op.image[i]));}
}
assert.equal(iso().buckets.every(b=>b.operations.length===8),true);assert.equal(iso('zero').record.order.stabilizerOrder,48);
let polynomialCases=0;
for(const seed of ['x2','xy','x4'])for(const eta of ['axis','diagonal','zero'])for(const coefficient of ['-2','2']){
 const r=reynolds({seed,eta,coefficient}),n=seed==='x4'?4:2,expected=seed==='xy'?0:(r.vector[0]**n+r.vector[1]**n)/2;
 near(r.average,expected);near(r.energy,r.primitiveEnergy);assert.equal(r.terms.length,8);
 assert.deepEqual(new Set(r.terms.map(x=>key(x.matrix))),new Set(signedGroup(2).map(key)));
 for(const t of r.terms)near(t.value,t.sign*t.powers.reduce((v,p,i)=>v*r.vector[i]**p,1));
 const copied=request('order-invariants',{seed,eta,coefficient});if(seed==='xy')assert.equal(copied,null);else{assert.equal(copied.input[r.basis.id],Number(coefficient)/2);assert.equal(copied.input.etaY,r.vector[1]);assert.equal(copied.input.c4,0);assert.equal(copied.input.d6,0);}polynomialCases++;
}
for(const toggle of ['off','on']){const r=field(toggle);assert.equal(r.rows.length,6);for(const row of r.rows){near(row.F0,.1);near(row.fieldEnergy,-r.field[0]*row.vector[0]);near(row.F,row.F0+row.fieldEnergy);}}
const f=field().rows;near(f.find(r=>r.vector[0]===1).F,-.2);near(f.find(r=>r.vector[0]===-1).F,.4);near(f.find(r=>r.vector[1]===1).F,.1);
for(const op of actual.records.convention.order.operations){const r=convention(String(op.id));array(r.matrixPrime,r.record.order.convention.operations[op.id]);array(r.left,r.right);array(r.etaPrime,r.record.order.convention.vector);near(r.fieldEnergy,r.fieldEnergyPrime);assert.deepEqual(r.counts,r.transformedCounts);assert.deepEqual(r.counts,{group:48,state:1,field:8,intersection:1,fieldOrbit:8});near(r.naiveEnergy,.3758680136551086);assert.ok(Math.abs(r.naiveEnergy-r.record.energy)>.1);}
// The retained default g1 rotates about z and commutes with the 37° z basis
// rotation: conjugation rewrites a matrix without necessarily changing entries.
assert.equal(convention().operation.id,1);array(convention().matrixPrime,convention().operation.matrix);
for(const [lesson,s,record]of [['order-isotropy',{},'axis'],['order-isotropy',{case:'zero'},'zero'],['order-field-convention',{},'field'],['order-field-convention',{field:'off'},'fieldZero'],['order-field-convention',{stage:'coordinates'},'convention']]){const a=request(lesson,s);assert.deepEqual(a,{action:'order_parameter_lab',module:'order',input:actual.records[record].input});a.input.fieldX=5;assert.notEqual(request(lesson,s).input.fieldX,5);}
for(const x of ['__proto__','unknown']){assert.equal(bridge.orderActionsBridgeHTML(x),'');assert.throws(()=>request(x));assert.throws(()=>iso(x));assert.throws(()=>reynolds({seed:x}));}assert.throws(()=>iso('axis','99'));
assert.deepEqual(Object.keys(hooks),['order-isotropy','order-invariants','order-field-convention']);
const catalogue=JSON.parse(fs.readFileSync(new URL('../dist/data/principles-materials.json',import.meta.url),'utf8'));for(const id of Object.keys(hooks))assert.ok(catalogue.lessons.some(l=>l.id===id&&l.module==='order'));

// Real iterable NodeList semantics: no array-specific find/map/filter/flatMap.
const all=Element.prototype.querySelectorAll,html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
const nodeList=items=>Object.assign({length:items.length,item:i=>items[i]??null,forEach:fn=>items.forEach(fn),[Symbol.iterator]:function*(){yield*items;}},Object.fromEntries(items.map((x,i)=>[i,x])));
// The adapter need not parse KaTeX's thousands of layout spans to test controls.
// Keep the exact rendered source for science/English assertions, and parse the
// real enclosing disclosures/tables/formula containers without layout spans.
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){parsing++;try{const scientific=this.id.endsWith('-output'),parse=scientific?String(value).replace(/<math\b[\s\S]*?<\/math>/g,'').replace(/<\/?span\b[^>]*>/g,''):value;html.set.call(this,parse);if(scientific)this.html=String(value);}finally{parsing--;}}});
Element.prototype.querySelectorAll=function(selector){const result=all.call(this,selector);return parsing?result:nodeList(result);};
Object.defineProperty(Element.prototype,'open',{configurable:true,get(){return this._nativeOpen??this.getAttribute('open')!==null;},set(value){this._nativeOpen=!!value;}});
let network=0,workers=0,writes=0;globalThis.fetch=()=>{network++;throw Error('Unexpected network');};globalThis.Worker=class{constructor(){workers++;}};globalThis.localStorage={getItem(){writes++;},setItem(){writes++;}};globalThis.document={activeElement:null};Element.prototype.focus=function(){document.activeElement=this;};
function mount(id='order-isotropy',store=new Map(),onOpenLab,api=bridge,existingRoot){const root=existingRoot||new Container();if(!existingRoot)root.innerHTML=api.orderActionsBridgeHTML(id);let active=true;const cleanup=api.bindOrderActionsBridge({root,lessonId:id,stateStore:store,onOpenLab,isCurrent:()=>active}),$=k=>root.querySelector('#oab-'+id+'-'+k);return{root,cleanup,store,$,leave:()=>{active=false;},choose(k,v){const node=$(k);node.value=v;node.onchange();},click(k){const node=$(k);assert.equal(node.disabled,false,k);return node.onclick();}};}
const reveal=(v,a)=>{v.choose('q0',a);v.click('observe');v.click('next');v.click('next');assert.equal(v.$('next').disabled,true);assert.doesNotMatch(v.$('output').innerHTML,/katex-error|NaN|undefined|Infinity/);};
const a=mount();assert.equal(a.root.querySelector('details').open,false);assert.equal(a.$('observe').disabled,true);assert.equal(Array.isArray(a.root.querySelectorAll('select')),false);assert.equal(a.root.querySelectorAll('select').flatMap,undefined);
a.choose('q0','fortyeight');a.click('observe');a.click('check0');assert.match(a.$('feedback0').textContent,/合并等像桶/);a.choose('q0','six');a.click('check0');assert.match(a.$('feedback0').getAttribute('class'),/oab-correct/);a.click('next');a.click('next');assert.match(a.$('output').innerHTML,/48/);
const control=a.$('operation');control.focus();a.choose('operation','2');assert.equal(a.$('operation'),control);assert.equal(document.activeElement,control);assert.ok(a.$('output').querySelector('.oab-formula'));
a.choose('q1','minimum');a.click('check1');assert.match(a.$('feedback1').textContent,/另外求解/);a.choose('case','zero');reveal(a,'six');assert.match(a.$('output').innerHTML,/48/);
// Keep direct native changes and drafts even before queued toggle/change events.
const native=a.root.querySelector('[data-oab-native="operations"]');native.open=true;a.root.querySelector('details').open=true;a.$('note').value='unfinished <img> reasoning';a.$('q1').value='full';a.leave();const snap=a.cleanup.snapshot()['orbit-actions'];assert.equal(snap.native.operations,true);assert.equal(snap.open,true);assert.equal(snap.choices[1],'full');assert.equal(snap.checked[1],false);assert.equal(snap.note,'unfinished <img> reasoning');const stale=a.$('reset').onclick;a.cleanup();stale();const back=mount('order-isotropy',a.store);assert.equal(back.$('note').value,snap.note);assert.equal(back.root.querySelector('img'),null);assert.equal(back.root.querySelector('details').open,true);assert.equal(back.root.querySelector('[data-oab-native]').open,true);const out=back.cleanup.snapshot();out['orbit-actions'].note='mutated';assert.equal(back.cleanup.snapshot()['orbit-actions'].note,snap.note);
const oldCleanup=back.cleanup,newOwner=mount('order-isotropy',back.store,undefined,bridge,back.root);oldCleanup();assert.equal(typeof newOwner.$('observe').onclick,'function');reveal(newOwner,'six');newOwner.cleanup();
const safe=mount('order-invariants',new Map([['oab:order-invariants',{note:'<img>',seed:'__proto__',choices:['<script>'],native:null}]]));assert.equal(safe.$('seed').value,'x2');assert.equal(safe.$('q0').value,'');safe.cleanup();
const copies=[];const b=mount('order-invariants',new Map(),r=>{copies.push(r);return true;});reveal(b,'half');b.choose('q1','inverse');b.click('check1');assert.match(b.$('feedback1').getAttribute('class'),/oab-correct/);b.choose('seed','xy');reveal(b,'half');assert.match(b.$('output').innerHTML,/零多项式/);assert.equal(b.$('copy').disabled,true);b.choose('seed','x4');b.choose('eta','diagonal');b.choose('coefficient','-2');await b.click('copy');assert.deepEqual(copies[0],request('order-invariants',{seed:'x4',eta:'diagonal',coefficient:'-2'}));assert.match(b.$('copy-status').textContent,/手动运行/);assert.equal(b.$('copy').disabled,false);
const c=mount('order-field-convention');reveal(c,'plus');assert.match(c.$('output').innerHTML,/-0.2/);c.choose('field','off');reveal(c,'plus');c.choose('stage','coordinates');reveal(c,'plus');c.choose('q1','bare');c.click('check1');assert.match(c.$('feedback1').textContent,/另一个物理态/);c.choose('q1','joint');c.click('check1');assert.match(c.$('feedback1').getAttribute('class'),/oab-correct/);assert.match(c.$('output').innerHTML,/0.37586801/);assert.match(c.$('output').innerHTML,/0.4872896/);assert.equal(c.$('field').disabled,true);assert.equal(c.$('operation').disabled,false);
let finish;const pending=mount('order-isotropy',new Map(),()=>new Promise(r=>finish=r));const task=pending.click('copy');assert.equal(pending.$('copy').disabled,true);pending.choose('case','zero');finish(true);await task;assert.equal(pending.$('copy-status').textContent,'');assert.equal(pending.$('copy').disabled,false);
let finishOld;const retired=mount('order-isotropy',new Map(),()=>new Promise(r=>finishOld=r));const oldTask=retired.click('copy');retired.cleanup();retired.root.innerHTML='<p>New page</p>';finishOld(true);await oldTask;assert.equal(retired.root.querySelector('button'),null);
const rejected=mount('order-isotropy',new Map(),()=>Promise.reject(Error('No')));await rejected.click('copy');assert.match(rejected.$('copy-status').textContent,/未完成/);assert.equal(rejected.$('copy').disabled,false);
const noCopy=mount();assert.equal(noCopy.$('copy'),null);
for(const v of [b,c,pending,rejected,noCopy])v.cleanup();assert.equal(network,0);assert.equal(workers,0);assert.equal(writes,0);

const source=fs.readFileSync(new URL('../dist/order-actions-bridge.js',import.meta.url),'utf8'),locale=JSON.parse(fs.readFileSync(new URL('../locales/en-order-actions-bridge.json',import.meta.url),'utf8'));
const units=[...new Set(jsStrings(source).flatMap(s=>textUnits(s.value)).map(x=>x.trim()).filter(x=>HAN.test(x)))];for(const unit of units)assert.equal(typeof locale[unit],'string','Missing English unit: '+unit);assert.ok(Object.values(locale).every(s=>typeof s==='string'&&s.trim()&&!HAN.test(s)));
for(const unit of units)assert.deepEqual(locale[unit].match(/\d+(?:\.\d+)?/g)||[],unit.match(/\d+(?:\.\d+)?/g)||[],'English preserves original numeric tokens: '+unit);
let english=source;for(const item of jsStrings(source).filter(s=>HAN.test(s.value)).sort((a,b)=>b.start-a.start))english=english.slice(0,item.start)+JSON.stringify(replaceUnits(item.value,s=>locale[s.trim()]))+english.slice(item.end);
// A data: module has no directory for relative imports. Resolve the complete
// specifier, including any release query, instead of matching a pinned URL.
const absoluteImports=text=>text.replace(/\bfrom\s+(['"])(\.\/[^'"]+)\1/g,(_all,_quote,specifier)=>'from '+JSON.stringify(new URL('../dist/'+specifier.slice(2),import.meta.url).href));
for(const quote of ["'",'"'])for(const query of ['','?v=20261115-actions1','?v=next-release']){
 const specifier='./order-actions-reference.js'+query,rewritten=absoluteImports('import {x} from '+quote+specifier+quote+';');assert.equal(rewritten,'import {x} from '+JSON.stringify(new URL('../dist/'+specifier.slice(2),import.meta.url).href)+';');
}
english=absoluteImports(english);assert.doesNotMatch(english,/\bfrom\s+['"]\.\//,'Every data-module dependency is absolute');
const en=await import('data:text/javascript;base64,'+Buffer.from(english).toString('base64'));
for(const [id,options]of [['order-isotropy',[['case',['axis','zero']]]],['order-invariants',[['seed',['x2','xy','x4']],['eta',['axis','diagonal','zero']],['coefficient',['-2','2']]]],['order-field-convention',[['field',['off','on']],['stage',['field','coordinates']]]]]){
 const v=mount(id,new Map(),undefined,en);for(const [k,values]of options)for(const value of values){v.choose(k,value);reveal(v,{'order-isotropy':'six','order-invariants':'half','order-field-convention':'plus'}[id]);for(let i=0;i<2;i++)for(const option of Array.from(v.$('q'+i).querySelectorAll('option')).slice(1)){v.choose('q'+i,option.value);v.click('check'+i);assert.equal(HAN.test(v.$('feedback'+i).textContent),false);}const content=[v.root.innerHTML,v.root.querySelector('#oab-'+id+'-body').innerHTML,v.$('output').innerHTML,...[0,1].map(i=>v.$('feedback'+i).textContent)].join(' ');assert.equal(HAN.test(content),false,'English rendering must contain no Chinese');assert.doesNotMatch(content,/katex-error/);}v.cleanup();
 assert.deepEqual(en.orderActionsLabRequest(id),request(id),'Translation preserves request numbers/enums');
}
for(const seed of ['x2','xy','x4'])for(const eta of ['axis','diagonal','zero'])for(const coefficient of ['-2','2'])assert.deepEqual(en.orderActionsLabRequest('order-invariants',{seed,eta,coefficient}),request('order-invariants',{seed,eta,coefficient}));
assert.deepEqual(en.orderActionsLabRequest('order-field-convention',{stage:'coordinates'}),request('order-field-convention',{stage:'coordinates'}));
const css=fs.readFileSync(new URL('../dist/order-actions-bridge.css',import.meta.url),'utf8');assert.match(css,/font-size:18px/);assert.match(css,/\.oab-formula\{[^}]*font-size:22px[^}]*overflow-x:auto/);assert.match(css,/@media\(max-width:620px\)/);
console.log(`Order actions bridge: 48 independently enumerated Oh actions; ${polynomialCases} Reynolds cases; real reference energies and all 48 coordinate transforms; actual NodeList/native disclosure/prediction/focus/ownership/async-copy handlers; ${units.length} complete English units; zero automatic network/worker/storage writes passed.`);
