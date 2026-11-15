import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';

// Keep the parser's internal arrays, but give actual handlers iterable native
// NodeList behavior without Array.map/filter/find/flatMap shortcuts.
const html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsing=0;
Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){parsing++;try{html.set.call(this,value);}finally{parsing--;}}});
const all=Element.prototype.querySelectorAll;
Element.prototype.querySelectorAll=function(selector){const nodes=all.call(this,selector);if(parsing)return nodes;return Object.assign({length:nodes.length,forEach:fn=>nodes.forEach(fn),[Symbol.iterator]:function*(){yield* nodes;}},Object.fromEntries(nodes.map((x,i)=>[i,x])));};
Element.prototype.focus=function(){};Element.prototype.scrollIntoView=function(){};
Element.prototype.checkValidity=function(){return this.type!=='number'||String(this.value).trim()!==''&&Number.isFinite(Number(this.value));};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
let storageWrites=0;globalThis.localStorage={getItem:()=>null,setItem:()=>{storageWrites++;}};
const clone=x=>structuredClone(x),json=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const refs=json('./fixtures/spin-actions.json');
assert.equal(refs.cases.length,34);assert.equal(refs.legacyCases.length,5);
for(const[name,sha]of Object.entries(refs.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n?/g,'\n')).digest('hex'),sha,'Refresh genuine spin references after '+name+' changes');
const ui=await import('../dist/spin-actions-ui.js');
const {spinActionsRequest:request,spinActionsModel:model,spinActionsResultHTML:resultHTML,spinActionsLegacyRequest:legacy,bindSpinActionsLesson:bind,SPIN_ACTION_LESSONS:hooks}=ui;
const lessonFor=experiment=>Object.keys(hooks).find(id=>hooks[id]===experiment);
function rawFor(input){const raw={};for(const[key,value]of Object.entries(input)){if(['lab','experiment'].includes(key))continue;raw[key]=Array.isArray(value)?JSON.stringify(value):key==='angle'?String(value):value;}return raw;}
const full=input=>request(input.experiment,rawFor(input));
const replies=new Map(refs.cases.map(x=>[JSON.stringify(full(x.input)),x]));
assert.equal(replies.size,refs.cases.length,'Each fixture covers a different actual supported input');
for(const row of refs.cases){
 assert.equal(model(row.result).status,'available',row.id);const before=JSON.stringify(row.result);
 for(const stage of [1,2,3,4])for(const candidate of [0,1]){
  const value=resultHTML(row.result,{stage,candidate});assert.doesNotMatch(value,/katex-error|(?:[>\s])(?:NaN|Infinity|undefined)(?:[<\s])/u,row.id);
 }
 assert.equal(JSON.stringify(row.result),before,'Rendering never modifies a Python result');
}
assert.match(resultHTML({},{}),/没有完整/);
const corrupt=clone(refs.cases[0].result);corrupt.matrices.swap.numeric.re[0][0]=NaN;assert.equal(model(corrupt).status,'invalid');
// A matching schema is insufficient: reject incomplete nested scientific data
// before any stage or native viewer can dereference it.
const incompleteReplies=[
 ['color_theta',r=>delete r.comparison],
 ['color_theta',r=>delete r.states.thetaConjugated],
 ['color_theta',r=>delete r.hamiltonian.eigenvalues],
 ['spin_stabilizer',r=>delete r.spinOnly.classification],
 ['spin_stabilizer',r=>delete r.spinOnly.rref],
 ['spin_stabilizer',r=>delete r.spinOnly.quantum.scope],
 ['soc_locking',r=>delete r.locking.candidates[1].sitewise],
 ['soc_locking',r=>{r.viewer.frames[3].sites[0].spin=[0,NaN,1];}]
].map(([experiment,damage])=>{const reply=clone(refs.cases.find(x=>x.result.experiment===experiment).result);damage(reply);assert.equal(model(reply).status,'invalid');for(const stage of [1,2,3,4])assert.match(resultHTML(reply,{stage}),/role="alert"/);return {experiment,reply};});
const renderedVectors=resultHTML(refs.cases[0].result,{stage:3});assert.match(renderedVectors,/class="sax-exact-inline"><span class="katex"/);assert.doesNotMatch(renderedVectors,/<code[^>]*data-math-ignore[^>]*>[^<]*\\(?:sqrt|left|,)/);
for(const experiment of Object.values(hooks))assert.equal(request(experiment).lab,'spin_actions');
for(const[id,preset]of [['color_theta','ignored'],['spin_stabilizer','af_space'],['soc_locking','c2_point']]){const a=legacy(id,preset);a.steps=99;assert.notEqual(legacy(id,preset).steps,99);}
assert.throws(()=>request('unknown'));assert.throws(()=>request('color_theta',{statePreset:'custom',state:'['}));assert.throws(()=>request('spin_stabilizer',{operationPreset:'rotation_z',angle:''}));assert.throws(()=>legacy('soc_locking','custom'));

function mount(experiment,{store=new Map(),raw={},calculate,active=()=>true,onCopy,download}={}){
 const page=new Container();page.innerHTML='<section><div data-sax-body></div></section>';
 store.set('panel:'+lessonFor(experiment),{raw,...(store.get('panel:'+lessonFor(experiment))||{})});
 const calls=[],cancels=[],exports=[];
 const run=calculate||(async(action,input)=>{calls.push({action,input:clone(input)});const row=replies.get(JSON.stringify(input));assert.ok(row,'Actual submitted request has a genuine reference: '+JSON.stringify(input));return clone(row.result);});
 const cleanup=bind({root:page.firstElementChild,lessonId:lessonFor(experiment),isCurrent:active,stateStore:store,run,cancelRun:()=>cancels.push(true),onCopy,download:download||((body,name)=>exports.push({body:JSON.parse(body),name}))});
 return {page,store,calls,cancels,exports,cleanup,$:selector=>page.querySelector(selector)};
}
const set=(v,id,value,event='oninput')=>{const node=v.$('#sax-'+id);assert.ok(node,id);node.value=String(value);return node[event]?.({target:node});};
const choose=(v,id,value)=>set(v,id,value,'onchange');
const click=(v,id)=>{const node=v.$('#sax-'+id);assert.ok(node,id);return node.onclick?.();};
const submit=v=>v.$('#sax-form').onsubmit({preventDefault(){}});
const reveal=v=>{for(let i=0;i<3;i++)click(v,'next');};
for(const {experiment,reply}of incompleteReplies){
 const valid=refs.cases.find(x=>x.result.experiment===experiment).result;let tries=0;
 const v=mount(experiment,{calculate:async()=>clone(tries++?valid:reply)});
 await assert.doesNotReject(submit(v));assert.equal(v.$('fieldset').disabled,false);assert.ok(v.$('[role="alert"]'));assert.equal(v.$('#sax-export'),null);
 await assert.doesNotReject(submit(v));assert.equal(v.$('fieldset').disabled,false);assert.equal(v.$('[role="alert"]'),null);reveal(v);click(v,'export');assert.deepEqual(v.exports[0].body.result,valid);v.cleanup();
}
for(const row of refs.cases){
 const v=mount(row.result.experiment,{raw:rawFor(row.input)});assert.equal(v.calls.length,0);assert.equal(Array.isArray(v.$('[data-sax-body]').querySelectorAll('select')),false);
 await submit(v);assert.equal(v.calls.length,1);assert.equal(v.calls[0].action,'teaching_labs');assert.deepEqual(v.calls[0].input,full(row.input));
 reveal(v);assert.equal(v.$('#sax-stage-status').textContent,'第 4 / 4 步');assert.equal(v.$('#sax-next').disabled,true);assert.doesNotMatch(v.$('#sax-ledger').innerHTML,/katex-error/);
 click(v,'export');assert.deepEqual(v.exports[0].body.input,full(row.input));assert.deepEqual(v.exports[0].body.result,row.result);
 if(row.result.viewer){const detail=v.$('[data-sax-native="viewer"]');detail.open=true;detail.ontoggle();assert.ok(v.$('[data-gx="stage"]'));choose(v,'frame',0);const yaw=v.$('[data-gx="yaw"]');yaw.value='47';yaw.oninput();assert.equal(v.$('[data-gx="yaw-value"]').textContent,'47°');}
 v.cleanup();
}

// The comparison distinguishes output rays from the independent Kramers
// inner product, and shows the second conjugation and phase-invariant square.
const c=mount('color_theta');await submit(c);reveal(c);assert.match(c.$('#sax-result').innerHTML,/⟨Pψ\|Θψ⟩/);assert.match(c.$('#sax-result').innerHTML,/⟨ψ\|Θψ⟩/);assert.match(c.$('#sax-result').innerHTML,/第二次施加/);assert.match(c.$('#sax-result').innerHTML,/带相位算符/);
set(c,'note','A phase changes the displayed vector, not the operator square.');choose(c,'prediction','conjugate');click(c,'check');assert.match(c.$('#sax-feedback').textContent,/判断相符/);
const saved=c.cleanup.snapshot();assert.equal(saved.stage,4);assert.equal(saved.note,'A phase changes the displayed vector, not the operator square.');c.cleanup();
const remounted=mount('color_theta',{store:c.store});assert.equal(remounted.$('#sax-note').value,saved.note);assert.equal(remounted.$('#sax-stage-status').textContent,'第 4 / 4 步');assert.equal(remounted.calls.length,0);assert.match(remounted.$('#sax-feedback').textContent,/判断相符/);
const oldExport=remounted.$('#sax-export').onclick;set(remounted,'scalar','');assert.equal(remounted.$('#sax-export'),null);assert.equal(remounted.$('#sax-next'),null);oldExport();assert.equal(remounted.exports.length,0);await submit(remounted);assert.equal(remounted.calls.length,0);assert.match(remounted.$('[role="alert"]').textContent,/JSON/);
const incomplete=remounted.cleanup.snapshot();remounted.cleanup();const restored=mount('color_theta',{store:remounted.store});assert.equal(restored.$('#sax-scalar').value,'');assert.equal(restored.cleanup.snapshot().raw.scalar,incomplete.raw.scalar);restored.cleanup();

// A canceled old request cannot clear the busy state of a newer owner, and a
// detached event cannot submit or export into a later calculation.
let releaseOld,releaseNew;
const race=mount('color_theta',{calculate:()=>new Promise(resolve=>{if(!releaseOld)releaseOld=resolve;else releaseNew=resolve;})});
const first=submit(race),oldCancel=race.$('#sax-cancel');click(race,'cancel');assert.equal(race.cancels.length,1);const second=submit(race);assert.equal(race.$('fieldset').disabled,true);releaseOld(clone(refs.cases[0].result));await first;assert.equal(race.$('fieldset').disabled,true);oldCancel.onclick?.();assert.equal(race.cancels.length,1);releaseNew(clone(refs.cases[0].result));await second;assert.equal(race.$('fieldset').disabled,false);race.cleanup();
let finish;let current=true;
const gone=mount('spin_stabilizer',{calculate:()=>new Promise(resolve=>{finish=resolve;}),active:()=>current});const pending=submit(gone);const before=gone.page.innerHTML;current=false;gone.cleanup();finish(clone(refs.cases.find(x=>x.result.experiment==='spin_stabilizer').result));await pending;assert.equal(gone.page.innerHTML,before);
let sharedOld,sharedNew,cancelShared=0;const shared=new Container();shared.innerHTML='<section><div data-sax-body></div></section>';
const cleanupOld=bind({root:shared.firstElementChild,lessonId:'color-03',run:()=>new Promise(resolve=>{sharedOld=resolve;}),cancelRun:()=>{cancelShared++;}});
const sharedPendingOld=shared.querySelector('#sax-form').onsubmit({preventDefault(){}});
const cleanupNew=bind({root:shared.firstElementChild,lessonId:'color-03',run:()=>new Promise(resolve=>{sharedNew=resolve;}),cancelRun:()=>{cancelShared++;}});
const sharedPendingNew=shared.querySelector('#sax-form').onsubmit({preventDefault(){}});cleanupOld();assert.equal(cancelShared,0,'Cleaning the superseded binding cannot cancel the new owner');sharedOld(clone(refs.cases[0].result));await sharedPendingOld;assert.equal(shared.querySelector('fieldset').disabled,true);sharedNew(clone(refs.cases[0].result));await sharedPendingNew;assert.equal(shared.querySelector('fieldset').disabled,false);cleanupNew();
assert.equal(storageWrites,0,'Optional work does not write the original mastery records');

// Exercise the production lesson host and its explicit old-model copy path.
const catalogues=Object.fromEntries(['symmetry-course-lessons','symmetry-course-atlas','symmetry-materials','symmetry-derivations'].map(n=>[n,json('../dist/data/'+n+'.json')]));
globalThis.fetch=async url=>{const name=String(url).split('/').at(-1).split('?')[0].replace('.json','');assert.ok(catalogues[name]);return{ok:true,json:async()=>clone(catalogues[name])};};
const course=await import('../dist/symmetry-course-ui.js?spin-actions-test');
const page=new Container(),$=selector=>page.querySelector(selector),calls=[],routes=[],exports=[];let loads=0,cancels=0;
const run=async(action,input)=>{calls.push({action,input:clone(input)});if(input.lab==='spin_actions'){const row=replies.get(JSON.stringify(input));assert.ok(row);return clone(row.result);}const row=refs.legacyCases.find(x=>JSON.stringify(x.input)===JSON.stringify(input));assert.ok(row,'Legacy run uses a complete actual input '+JSON.stringify(input));return clone(row.result);};
const render=(lesson,extra={})=>course.renderSymmetryCourseView({container:page,selection:{pathway:'spin',tab:'learn',lesson,...extra},run,cancelRun:()=>{cancels++;},download:(body,name)=>exports.push({body:JSON.parse(body),name}),onNavigate:r=>routes.push(r),loadSpinActionsModule:async()=>{loads++;return ui;}});
const open=async()=>{const detail=$('[data-sax-details]');detail.open=true;await detail.ontoggle();};
await render('color-03');assert.equal(loads,0);assert.equal(calls.length,0);await open();assert.equal(loads,1);assert.equal(calls.length,0);assert.match($('#sc-lesson-lab').textContent,/另一个模型/);await $('#sax-form').onsubmit({preventDefault(){}});assert.equal(calls.at(-1).input.experiment,'color_theta');assert.equal(course.getSymmetryCourseResult().experiment,null,'Optional results do not masquerade as the original lab result');
$('#sax-note').value='Keep the action space explicit';$('#sax-note').oninput();$('#sax-scalar').value='';$('#sax-scalar').oninput();
$('#sc-tab-lab').onclick();$('#sc-tab-learn').onclick();await flush();assert.equal($('#sax-scalar').value,'');assert.equal($('#sax-note').value,'Keep the action space explicit');assert.equal($('#sax-export'),null);assert.equal($('[data-sax-details]').open,true);
// The native course must preserve its own unfinished form independently.
$('#sc-tab-lab').onclick();$('#sc-steps').value='';$('#sc-lab-form').oninput();$('#sc-tab-learn').onclick();await flush();$('#sc-tab-lab').onclick();assert.equal($('#sc-steps').value,'');$('#sc-tab-learn').onclick();await flush();
for(const [lesson,preset]of [['color-03','c3_point'],['spin-03','triangular_point'],['spin-04','c2_point']]){
 await render(lesson);if(!$('#sax-copy'))await open();const before=calls.length;await $('#sax-copy').onclick();assert.equal(calls.length,before);assert.equal($('#sc-group-preset').value,preset);assert.equal($('#sc-group-variant').value,'combined');assert.equal($('#sc-group-steps').value,String(preset==='c3_point'||preset==='triangular_point'?3:4));await $('#sc-lab-form').onsubmit({preventDefault(){}});const r=course.getSymmetryCourseResult();assert.equal(r.experiment.input.preset,preset);$('#sc-export-lab').onclick();assert.deepEqual(exports.at(-1).body.result,r.experiment.result);
}
for(const preset of ['c2_point','af_space','triangular_point','helix3_space']){
 await render('spin-04');await flush();if(!$('#sax-copy'))await open();const node=$('#sax-legacy-preset');node.value=preset;node.onchange();const before=calls.length;await $('#sax-copy').onclick();assert.equal(calls.length,before);await $('#sc-lab-form').onsubmit({preventDefault(){}});assert.deepEqual(calls.at(-1).input,legacy('soc_locking',preset));
}
await render('double-01');const beforeExpertLoads=loads;await render('spin-04',{tab:'lab',embeddedOnly:true,experiment:'spin_group',preset:'c2_point'});assert.equal($('[data-sax-details]'),null);assert.equal(loads,beforeExpertLoads);assert.equal(storageWrites,0);

// An old lazy import cannot mount into a later lesson; retry is explicit and
// becomes inert after leaving its original owner.
let finishLoad;const late=await import('../dist/symmetry-course-ui.js?spin-actions-late');const detached=new Container();
await late.renderSymmetryCourseView({container:detached,selection:{pathway:'spin',tab:'learn',lesson:'spin-03'},loadSpinActionsModule:()=>new Promise(resolve=>{finishLoad=resolve;})});
const detail=detached.querySelector('[data-sax-details]');detail.open=true;const loading=detail.ontoggle();detached.querySelector('#sc-tab-quiz').onclick();finishLoad(ui);await loading;assert.equal(detached.querySelector('#sax-form'),null);assert.ok(detached.querySelector('.sc-quizzes'));
let fails=0;const retry=await import('../dist/symmetry-course-ui.js?spin-actions-retry');const rp=new Container();await retry.renderSymmetryCourseView({container:rp,selection:{pathway:'spin',tab:'learn',lesson:'color-03'},loadSpinActionsModule:async()=>{if(!fails++)throw Error('offline');return ui;}});const rd=rp.querySelector('[data-sax-details]');rd.open=true;await rd.ontoggle();assert.match(rp.querySelector('[role="alert"]').textContent,/重试/);await rp.querySelector('[data-sax-retry]').onclick();assert.ok(rp.querySelector('#sax-form'));

const locale=json('../locales/en-spin-actions.json'),translations={...loadEnglishCatalog(),...locale},units=new Set();
for(const file of ['spin-actions-ui.js','symmetry-course-ui.js'])for(const item of jsStrings(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8')))for(const unit of textUnits(item.value))if(HAN.test(unit))units.add(unit.trim());
for(const [source,translated]of Object.entries(locale)){assert.ok(units.has(source),source);assert.ok(translated.trim()&&!HAN.test(translated));}
for(const unit of units)assert.ok(translations[unit],'Missing translated UI unit: '+unit);
const source=fs.readFileSync(new URL('../dist/spin-actions-ui.js',import.meta.url),'utf8');assert.doesNotMatch(source,/\beval\s*\(|new\s+Function|localStorage|sessionStorage/);
const css=fs.readFileSync(new URL('../dist/spin-actions.css',import.meta.url),'utf8');assert.match(css,/overflow-x:auto/);assert.match(css,/font-size:18px/);assert.match(css,/minmax\(0,1fr\)/);
console.log('Spin operation workshops: 34 genuine replies, exact matrix/state rendering, distinct rays and Kramers inner products, O(3)/quantum lift and both SOC candidates, 3 real lazy lesson hosts, 5 actual legacy-copy inputs, manual runs, exports, invalid drafts, notes/disclosures, native NodeLists, cancel/late-owner isolation, retry and English units passed.');
