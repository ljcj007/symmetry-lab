import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Container,Element} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,replaceUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog,catalogFiles,localeRoot} from './english-catalog.mjs';
import {createResultLocalizer} from '../dist/english-results.js';
import {su3CopyRequest as request,su3CopyModel as model,su3CopyResultHTML as render,bindSu3CopyLesson as bind} from '../dist/su3-copy-ui.js';

// Exercise the production module with native-NodeList behavior, without a
// browser or a third-party DOM package. The algebraic oracle is real Python.
const originalHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...originalHTML,set(value){parsing++;try{originalHTML.set.call(this,value);}finally{parsing--;}}});
const queryAll=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const list=queryAll.call(this,selector);if(parsing)return list;return Object.assign({length:list.length,forEach:fn=>list.forEach(fn),[Symbol.iterator]:function*(){yield* list;}},Object.fromEntries(list.map((node,i)=>[i,node])));};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let gradeWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>gradeWrites++};
const clone=x=>structuredClone(x),json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function assertCanonicalText(canonical){
 assert.equal(canonical.serialization,'python-json-utf8-sorted-v1');
 assert.equal(typeof canonical.serialized,'string');
 assert.equal(crypto.createHash('sha256').update(canonical.serialized,'utf8').digest('hex'),canonical.sha256,'The digest must cover the exact original Python JSON text, retained across browser export.');
 assert.deepEqual(JSON.parse(canonical.serialized),canonical.reply,'The original JSON text and the public reply retain the same mathematical data.');
}
const fixturePath=new URL('./fixtures/su3-copy.json',import.meta.url);
assert.ok(fs.existsSync(fixturePath),'Generate scripts/fixtures/su3-copy.json from the actual public Python API before running this test.');
const refs=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
assert.equal(refs.cases.length,12);assert.match(refs.method,/actual|public|browser_api/i);
const core='dist/python/su3_copy_lab.py';
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+core,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),refs.sourceHashes[core]);
const replies=new Map(refs.cases.map(c=>[JSON.stringify(c.input),c.result]));
assert.equal(new Set(refs.cases.map(c=>c.input.angle+'|'+c.input.phase)).size,12);
const basic=refs.cases.find(c=>c.input.angle===45&&c.input.phase==='1'),complexCase=refs.cases.find(c=>c.input.angle===45&&c.input.phase==='i');
assert.ok(basic&&complexCase);
const rawFor=input=>({angle:String(input.angle),phase:input.phase});

for(const c of refs.cases){
 assertCanonicalText(c.result.canonical);
 assert.deepEqual(request(rawFor(c.input)),c.input);
 assert.equal(model(c.result).status,'available',JSON.stringify(c.input));
 const before=clone(c.result);
 for(let stage=1;stage<=5;stage++)assert.doesNotMatch(render(c.result,{stage,mu:3}),/katex-error|\b(?:NaN|undefined|Infinity)\b/);
 assert.doesNotMatch(render(c.result,{stage:1}),/s3c-matrix|<mfrac|沿用旧 E|固定态在新副本基底/,'The initial stage reads complete labels before exposing amplitude matrices and answers.');
 assert.match(render(c.result,{stage:5}),/改号后的基底仍合法/);
 assert.match(render(c.result,{stage:4}),/不等于交换 −1/);
 assert.deepEqual(c.result,before,'Rendering cannot change the complete canonical or derived reply.');
}
for(const mu of complexCase.result.pairs.map(p=>p.mu)){
 assert.doesNotMatch(render(complexCase.result,{stage:5,mu}),/katex-error|undefined|NaN/);
 const p=complexCase.result.pairs[mu],html=render(complexCase.result,{stage:2,mu});
 assert.match(html,new RegExp('μ='+mu));
 assert.ok(html.includes(String(p.s.canonicalColumn))&&html.includes(String(p.a.canonicalColumn)));
}
const zeroPairs=complexCase.result.pairs.filter(p=>p.weight.every(x=>x===0));
assert.equal(zeroPairs.length,2);assert.notDeepEqual(zeroPairs[0].pattern,zeroPairs[1].pattern);
assert.equal(new Set(zeroPairs.flatMap(p=>[p.s.canonicalColumn,p.a.canonicalColumn])).size,4);
assert.match(render(complexCase.result,{stage:3}),/\\otimes I_8/,'The production KaTeX annotation retains the tensor-product formula.');
assert.match(render(complexCase.result,{stage:4}),/\\dagger/,'The actual MathML/annotation contains conjugate-transpose notation.');
const zeroAngle=refs.cases.find(c=>c.input.angle===0&&c.input.phase==='1').result,zeroProse=new Element('div');zeroProse.innerHTML=render(zeroAngle,{stage:4});assert.ok(zeroProse.querySelector('[data-s3c-narrative="stage-4"]').innerHTML.includes('新坐标概率为 (1, 0)'),'A matching integer tuple later in the probability explanation is not replaced as a coordinate matrix.');
const escaped=clone(complexCase.result);escaped.steps[3].text='<img src=x onerror=x> '+escaped.steps[3].text;escaped.counterexample.notes[0]='<script>unsafe</script> '+escaped.counterexample.notes[0];const safeProse=render(escaped,{stage:5});assert.doesNotMatch(safeProse,/<img|<script>/);assert.match(safeProse,/&lt;img/);assert.match(safeProse,/&lt;script/);
assert.match(render({}),/role="alert"/);
for(const raw of [{angle:''},{angle:'45 '},{angle:45},{angle:'1.5'},{angle:'180'},{angle:'45;alert(1)'},{phase:''},{phase:'I'},{phase:'exp(i)'},{phase:'<img onerror=x>'}])assert.throws(()=>request(raw));

function mount({raw={},store=new Map(),lessonId='su3-cg-change-basis',calculate,active=()=>true,binder=bind}={}){
 const page=new Container();page.innerHTML='<section><div data-su3-copy-body></div></section>';
 store.set('copy-panel:'+lessonId,{raw,...(store.get('copy-panel:'+lessonId)||{})});
 const calls=[],cancels=[],exports=[];
 const run=calculate||((action,input)=>{calls.push({action,input:clone(input)});const reply=replies.get(JSON.stringify(input));assert.ok(reply,'Use a genuine public reply: '+JSON.stringify(input));return Promise.resolve(clone(reply));});
 const cleanup=binder({root:page.firstElementChild,lessonId,stateStore:store,isCurrent:active,run,cancelRun:()=>cancels.push(true),download:(body,name,type)=>exports.push({body:JSON.parse(body),name,type})});
 return{page,store,calls,cancels,exports,cleanup,$:name=>page.querySelector('#s3c-'+name)};
}
const choose=(v,name,value)=>{const n=v.$(name);assert.ok(n,name);n.value=String(value);return n.onchange?.({target:n});};
const click=(v,name)=>{const n=v.$(name);assert.ok(n,name);return n.onclick?.();};
const submit=v=>v.$('form').onsubmit({preventDefault(){}});
function assertExactNarratives(v,result,mu){
 const narratives=Array.from(v.page.querySelectorAll('[data-s3c-narrative]'));assert.ok(narratives.length>=6);
 for(const node of narratives)assert.doesNotMatch(node.innerHTML,/sqrt\(|\*I\b/,'Explanatory prose must display returned LaTeX rather than SymPy machine notation.');
 const coordinates=v.page.querySelector('[data-s3c-narrative="stage-4"]'),counterexample=v.page.querySelector('[data-s3c-narrative="stage-5"]');
 assert.ok(coordinates.innerHTML.includes(result.fixed.states[mu].coordinates.latex),'The prose uses the complete returned coordinate matrix, including its complex phase.');
 assert.ok(counterexample.innerHTML.includes(result.counterexample.oldE12MaxAbs.latex),'The prose uses the returned exact residual LaTeX.');
 const note=narratives.find(node=>node.dataset.s3cNarrative.startsWith('counterexample-')&&node.innerHTML.includes(result.counterexample.oldE12MaxAbs.latex));assert.ok(note,'The counterexample note also displays its exact residual through the returned scalar pack.');
}
for(const c of refs.cases){
 const v=mount({raw:rawFor(c.input)});assert.equal(v.calls.length,0);await submit(v);
 assert.deepEqual(v.calls,[{action:'teaching_labs',input:c.input}]);assert.equal(v.$('error').hidden,true);
 for(let i=0;i<4;i++)click(v,'next');assert.equal(v.$('stage-status').textContent,'副本换基步骤 5 / 5 步');assert.equal(v.$('next').disabled,true);assertExactNarratives(v,c.result,3);
 click(v,'export');assert.deepEqual(v.exports[0].body,{kind:'su3-copy-teaching',input:c.input,result:c.result});assert.equal(v.exports[0].body.result.canonical.serialized,c.result.canonical.serialized);assertCanonicalText(v.exports[0].body.result.canonical);
 for(const p of c.result.pairs)choose(v,'mu',p.mu);
 assertExactNarratives(v,c.result,7);
 assert.equal(v.calls.length,1,'Browsing all eight internal-state pairs never recalculates.');
 const term=v.page.querySelector('[data-s3c-term]');assert.ok(term);term.onclick();assert.equal(v.calls.length,1);assert.ok(v.cleanup.snapshot().term);
 const amplitude=v.page.querySelector('[data-s3c-native="amplitude-s"]');amplitude.open=true;amplitude.ontoggle();
 v.$('note').value='Distinguish internal μ from copy α and exchange probability.';v.$('note').oninput();choose(v,'predict-probability','right');click(v,'check-probability');
 const saved=v.cleanup.snapshot();v.cleanup();
 const restored=mount({store:v.store});assert.equal(restored.calls.length,0);assert.equal(restored.$('note').value,saved.note);assert.equal(restored.$('mu').value,'7');assert.equal(restored.$('stage-status').textContent,'副本换基步骤 5 / 5 步');assert.equal(restored.page.querySelector('[data-s3c-native="amplitude-s"]').open,true);assert.deepEqual(restored.cleanup.snapshot().term,saved.term);restored.cleanup();
}
const v=mount();assert.equal(v.$('angle').value,'45');assert.equal(v.$('phase').value,'1');await submit(v);
const oldExport=v.$('export').onclick;choose(v,'phase','i');assert.equal(v.$('export'),null);oldExport();assert.equal(v.exports.length,0);assert.equal(v.calls.length,1);await submit(v);assert.equal(v.calls.length,2);
const staleTerm=v.page.querySelector('[data-s3c-term]');assert.equal(staleTerm,null,'Stage one has no amplitude selectors.');
click(v,'next');const priorTerm=v.page.querySelector('[data-s3c-term]').onclick;choose(v,'mu',4);const priorSelection=v.cleanup.snapshot().term;priorTerm();assert.deepEqual(v.cleanup.snapshot().term,priorSelection,'Detached amplitude buttons cannot select another internal state.');
const lazy=v.page.querySelector('[data-s3c-native="vector-s"]');assert.ok(!lazy.innerHTML.includes('katex-display'));lazy.open=true;lazy.ontoggle();assert.ok(v.page.querySelector('[data-s3c-native="vector-s"]').innerHTML.includes('katex-display'));
const restoredLazy=v.page.querySelector('[data-s3c-native="vector-s"]');restoredLazy.ontoggle();assert.equal(v.page.querySelector('[data-s3c-native="vector-s"]'),restoredLazy,'A queued native toggle for restored open details cannot trigger a render loop.');
v.cleanup();
const predictions=mount();for(const key of ['labels','probability','sign']){choose(predictions,'predict-'+key,'wrong');click(predictions,'check-'+key);const wrong=predictions.$('feedback-'+key).textContent;choose(predictions,'predict-'+key,'right');assert.equal(predictions.$('feedback-'+key).textContent,'');click(predictions,'check-'+key);assert.notEqual(predictions.$('feedback-'+key).textContent,wrong);}assert.equal(predictions.calls.length,0);predictions.cleanup();
const separate=new Map();const lessonA=mount({store:separate});lessonA.$('note').value='Lesson A';lessonA.$('note').oninput();lessonA.cleanup();const lessonB=mount({store:separate,lessonId:'su3-cg-multiplicity'});assert.equal(lessonB.$('note').value,'');lessonB.cleanup();const lessonAgain=mount({store:separate});assert.equal(lessonAgain.$('note').value,'Lesson A');lessonAgain.cleanup();

const damaged=[
 r=>delete r.canonical.serialization,r=>r.canonical.serialization='unknown',r=>delete r.canonical.serialized,r=>r.canonical.serialized='',
 r=>r.pairs.pop(),r=>r.pairs[0].s.canonicalColumn=r.pairs[0].a.canonicalColumn,r=>r.pairs[0].pattern=[0,0,0],r=>r.pairs[0].s.vector.exact[0][0]='changed',r=>r.pairs[0].s.amplitudeMatrix.numeric[0][0].re=7,r=>r.pairs[0].s.terms.pop(),r=>r.pairs[0].a.terms[0].coefficient.exact='changed',r=>r.fixed.reconstructed.exact[0][0]='changed',r=>r.fixed.states.pop(),r=>r.rotation.U.shape=[2,2],r=>r.rotation.phase='wrong',r=>r.generators[0].standardUnchangedResidual.exact='1',r=>r.checks[0].passed=false,r=>r.counterexample.oldE12MaxAbs.numeric.re=0,r=>r.counterexample.generators[0].repairedResidual.exact='1',r=>r.projector.transformed.entries.pop(),r=>r.steps.pop(),r=>r.dimensions.outer=1,r=>r.request.extra='unexpected'
];
for(const damage of damaged){const bad=clone(basic.result);damage(bad);assert.equal(model(bad).status,'invalid',damage.toString());assert.match(render(bad),/role="alert"/);}
let attempt=0;const badReply=clone(basic.result);badReply.pairs.pop();const recovery=mount({calculate:async()=>clone(attempt++?basic.result:badReply)});await assert.doesNotReject(submit(recovery));assert.equal(recovery.$('error').hidden,false);assert.equal(recovery.$('fieldset').disabled,false);assert.equal(recovery.$('export'),null);await submit(recovery);assert.equal(recovery.$('error').hidden,true);assert.ok(recovery.$('export'));recovery.cleanup();
const mismatched=mount({calculate:async()=>clone(complexCase.result)});await submit(mismatched);assert.equal(mismatched.$('error').hidden,false);assert.equal(mismatched.$('export'),null);mismatched.cleanup();
let resolveFirst,resolveSecond;const racing=mount({calculate:()=>new Promise(resolve=>{if(!resolveFirst)resolveFirst=resolve;else resolveSecond=resolve;})});const first=submit(racing),oldCancel=racing.$('cancel').onclick;click(racing,'cancel');assert.equal(racing.cancels.length,1);const second=submit(racing);resolveFirst(clone(basic.result));await first;assert.equal(racing.$('fieldset').disabled,true);oldCancel();assert.equal(racing.cancels.length,1);resolveSecond(clone(basic.result));await second;assert.equal(racing.$('fieldset').disabled,false);racing.cleanup();
let resolveLate,active=true,scoped=0;const task=new Promise(resolve=>{resolveLate=resolve;});task.cancel=()=>{scoped++;return true;};const leaving=mount({calculate:()=>task,active:()=>active}),pending=submit(leaving);active=false;leaving.cleanup();assert.equal(scoped,1);assert.equal(leaving.cancels.length,0);resolveLate(clone(basic.result));await pending;assert.equal(leaving.$('export'),null);
const ownerPage=new Container();ownerPage.innerHTML='<div data-su3-copy-body></div>';let resolveOwner,ownerCancels=0;const ownerTask=new Promise(resolve=>{resolveOwner=resolve;});ownerTask.cancel=()=>{ownerCancels++;return true;};const older=bind({root:ownerPage.firstElementChild,run:()=>ownerTask}),olderPending=ownerPage.querySelector('#s3c-form').onsubmit({preventDefault(){}});const newer=bind({root:ownerPage.firstElementChild,run:async()=>clone(basic.result)});older();assert.equal(ownerCancels,1);resolveOwner(clone(basic.result));await olderPending;assert.equal(ownerPage.querySelector('#s3c-export'),null);await ownerPage.querySelector('#s3c-form').onsubmit({preventDefault(){}});assert.equal(ownerPage.querySelector('#s3c-error').hidden,true);newer();

// Actual shared-client ownership: disposing an old workshop cannot terminate
// a newer worker task that acquired the same Python client in the meantime.
const previousWorker=globalThis.Worker,workers=[];
globalThis.Worker=class{constructor(){workers.push(this);this.terminated=false;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}reply(result){this.onmessage({data:{id:this.message.id,result}});}};
const client=await import('../dist/python-client.js');
const oldView=mount({calculate:client.runPythonTask}),oldViewPending=submit(oldView);client.cancelPython();const fresh=client.runPythonTask('teaching_labs',basic.input),freshWorker=workers.at(-1);oldView.cleanup();assert.equal(freshWorker.terminated,false);freshWorker.reply(clone(basic.result));await fresh;await oldViewPending;assert.equal(fresh.cancel(),false);globalThis.Worker=previousWorker;

const source=fs.readFileSync(new URL('../dist/su3-copy-ui.js',import.meta.url),'utf8'),locale=json('../locales/en-su3-copy-ui.json'),translations={...loadEnglishCatalog(),...locale},units=new Set();
const oldCatalog=Object.assign({},...catalogFiles.filter(name=>!/^en-su3-copy-/.test(name)&&fs.existsSync(path.join(localeRoot,name))).map(name=>JSON.parse(fs.readFileSync(path.join(localeRoot,name),'utf8'))));
for(const [key,value] of Object.entries(locale))if(Object.hasOwn(oldCatalog,key))assert.equal(value,oldCatalog[key],'Copy-workshop translations must preserve every pre-existing global translation byte for byte: '+key);
for(const s of jsStrings(source))for(const unit of textUnits(s.value))if(HAN.test(unit))units.add(unit.trim());
for(const unit of units)assert.ok(translations[unit],'Missing copy-workshop translation: '+unit);
for(const [s,t] of Object.entries(locale)){assert.ok(units.has(s),'Unused copy-workshop translation: '+s);assert.ok(t.trim()&&!HAN.test(t));}
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage|sympify|exactNumber/);
assert.doesNotMatch(source,/canonicalColumn\s*(?:===|:|=)\s*(?:50|51|58|59)\b/,'Canonical column indices must be read from metadata.');
const css=fs.readFileSync(new URL('../dist/su3-copy.css',import.meta.url),'utf8');assert.match(css,/font-size:max\(18px,1rem\)/);assert.match(css,/\.s3c-scroll\{[^}]*overflow-x:auto/);assert.match(css,/@media\(max-width:600px\)/);

// Run effective English controls and result DOM, retaining untouched canonical
// bytes and symbolic strings. Prefer the actual packaged English module.
const edits=[];for(const item of jsStrings(source)){const value=replaceUnits(item.value,s=>translations[s.trim()]??s);if(value!==item.value){assert.equal(item.type,'literal');edits.push({...item,value:JSON.stringify(value)});}}
let englishSource=source;for(const edit of edits.sort((a,b)=>b.start-a.start))englishSource=englishSource.slice(0,edit.start)+edit.value+englishSource.slice(edit.end);
englishSource=englishSource.replace(/'\.\/math-display\.js\?[^']*'/,JSON.stringify(new URL('../dist/math-display.js',import.meta.url).href));
const actualEnglish=new URL('../dist/en/su3-copy-ui.js',import.meta.url),english=fs.existsSync(actualEnglish)?await import(actualEnglish.href+'?copy-ui-test'):await import('data:text/javascript;base64,'+Buffer.from(englishSource).toString('base64'));
const messages=json('../dist/en/data/python-messages.json'),pythonLocale=json('../locales/en-su3-copy-python.json');
const localizer=createResultLocalizer({...messages,translations:{...messages.translations,...translations,...pythonLocale},templates:[...messages.templates,...Object.keys(pythonLocale).filter(s=>/ZXQD\d+DQXZ/.test(s))],nativeAnnotations:true});
const englishResult=localizer.result(clone(complexCase.result));
assert.equal(digest(englishResult.canonical),digest(complexCase.result.canonical),'English presentation must keep the complete original canonical reply and its digest unchanged.');
assert.equal(englishResult.canonical.serialized,complexCase.result.canonical.serialized);assertCanonicalText(englishResult.canonical);
assert.equal(english.su3CopyModel(englishResult).status,'available');
for(const field of ['serialization','serialized']){const incomplete=clone(englishResult);delete incomplete.canonical[field];assert.equal(english.su3CopyModel(incomplete).status,'invalid','The packaged English model must require the original canonical JSON contract: '+field);}
const en=mount({binder:english.bindSu3CopyLesson,raw:rawFor(complexCase.input),calculate:async()=>clone(englishResult)});await submit(en);for(let i=0;i<4;i++)click(en,'next');choose(en,'mu',4);choose(en,'predict-sign','right');click(en,'check-sign');
assertExactNarratives(en,englishResult,4);
assert.match(en.$('stage-status').textContent,/Step\s+5\s*\/\s*5/);assert.match(en.$('feedback-sign').textContent,/intertwin|orthogonality/i);
assert.ok(!HAN.test(en.page.querySelector('[data-su3-copy-body]').innerHTML),'English controls contain no untranslated Chinese.');
assert.ok(!HAN.test(en.$('result').innerHTML),'All five effective English result stages contain no untranslated Chinese.');
click(en,'export');assert.deepEqual(en.exports[0].body.result.canonical,complexCase.result.canonical);assert.equal(en.exports[0].body.result.canonical.serialized,complexCase.result.canonical.serialized);assertCanonicalText(en.exports[0].body.result.canonical);assert.deepEqual(en.exports[0].body.result.rotation.R,complexCase.result.rotation.R);
assert.deepEqual(en.exports[0].body.input,complexCase.input);en.cleanup();assert.equal(gradeWrites,0);
console.log('SU3 copy workshop: 12 genuine exact replies, five stages, all8 internal-state pairs, returned term/transposed-partner selection, local matrix scrolling, full-label/coordinate-probability distinction, immutable canonical exports, predictions, per-lesson memory, cancellation and late-reply ownership, actual shared Python client, and effective English DOM passed.');
