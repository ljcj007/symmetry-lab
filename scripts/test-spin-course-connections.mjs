import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {jsStrings,textUnits,jsonTexts,HAN} from './english-source.mjs';
import {loadEnglishCatalog} from './english-catalog.mjs';

Element.prototype.focus=function(){};
Element.prototype.scrollIntoView=function(){};
Element.prototype.checkValidity=function(){
 if(this.type!=='number')return true;
 const n=Number(this.value),min=this.getAttribute('min'),max=this.getAttribute('max'),step=this.getAttribute('step');
 if(this.value.trim()===''||!Number.isFinite(n)||min!==null&&n<Number(min)||max!==null&&n>Number(max))return false;
 return !step||step==='any'||Math.abs((n-Number(min||0))/Number(step)-Math.round((n-Number(min||0))/Number(step)))<1e-9;
};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.document={createElement:tag=>new Element(tag)};
const catalogs=Object.fromEntries(['symmetry-course-lessons','symmetry-course-atlas','symmetry-materials','symmetry-derivations'].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8'))]));
globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(catalogs[String(url).split('/').at(-1).split('?')[0].replace('.json','')])});
const ui=await import('../dist/symmetry-course-ui.js?spin-connections');
// Every reply comes from the unchanged scientific engine. The Python helper
// also checks the stored exact cases independently with SymPy, before UI use.
const replies=JSON.parse(execFileSync(process.env.PYTHON||'python',[fileURLToPath(new URL('./spin-course-science-check.py',import.meta.url))],{input:JSON.stringify(ui.antiunitaryReplayCases),encoding:'utf8',maxBuffer:8e6}));
const runCalls=[],routes=[],workbenches=[],downloads=[];
let pendingResolve=null;
const calculate=async(action,payload)=>{
 runCalls.push({action,payload:structuredClone(payload)});
 if(pendingResolve==='wait')return new Promise(resolve=>{pendingResolve=resolve;});
 if(payload.lab==='spinor')return structuredClone(replies[payload.initialState]);
 if(payload.lab==='double_group')return structuredClone(replies.c2);
 if(payload.lab==='magnetic')return structuredClone(replies.magnetic);
 if(payload.lab==='antiferro')return structuredClone(replies[payload.spinful?'af'+Number(payload.k):'af-spinless']);
 throw Error('Unexpected lab');
};
const page=new Container(),$=selector=>page.querySelector(selector),submit=()=>$('#sc-lab-form').onsubmit({preventDefault(){}});
const mount=lesson=>ui.renderSymmetryCourseView({container:page,selection:{pathway:'spin',tab:'learn',lesson},run:calculate,onNavigate:r=>routes.push(r),openGroup:r=>workbenches.push(r),download:body=>downloads.push(JSON.parse(body))});
const input=(id,value)=>{$('#'+id).value=String(value);$('#sc-lab-form').oninput();};
const allLessons=catalogs['symmetry-course-lessons'].lessons;
for(const id of ['double-01','double-02','double-03','double-04','magnetic-04','magnetic-05']){
 await mount(id);const lesson=allLessons.find(x=>x.id===id),before=runCalls.length;
 assert.match($('#sc-lesson-lab').textContent,/重置为示例参数/);
 $('#sc-lesson-lab').onclick();
 assert.equal(runCalls.length,before,'Opening '+id+' initializes a finite example without running Python');
 assert.equal(routes.at(-1).lesson,id);assert.equal(routes.at(-1).experiment,lesson.lab);
 assert.ok($('#sc-lab-connection'),id+' has concrete operational guidance');
 if(lesson.lab==='spinor'){assert.equal($('#sc-axis').value,'z');assert.equal($('#sc-initial-state').value,'up');}
 if(lesson.lab==='double_group'){assert.equal($('#sc-group-preset').value,'c2_point');assert.equal($('#sc-group-steps').value,'4');assert.equal($('#sc-group-kz').value,'0');}
 if(lesson.lab==='magnetic'){assert.equal($('#sc-operation').value,'E');assert.equal($('#sc-time-reversal').checked,true);assert.ok($('#sc-antiunitary-replay'));}
 if(lesson.lab==='antiferro'){assert.equal($('#sc-af-k').value,'0');assert.equal($('#sc-spinful').checked,true);assert.match($('#sc-lab-form').textContent,/没有横向|没有.*横向|没有可调横向|此控件没有横向/);}
 await submit();
 assert.equal(runCalls.at(-1).action,'teaching_labs');
 assert.deepEqual(runCalls.at(-1).payload,{lab:lesson.lab,...lesson.labInputs});
 assert.ok(ui.getSymmetryCourseResult().experiment);
 if(lesson.lab==='spinor')assert.ok($('#sc-time-reversal'),'Live Python time-reversal results are actually visible');
 if(lesson.lab==='double_group')assert.match($('#sc-lab-output').innerHTML,/4 个元素/);
 for(const [i,spec]of (lesson.labConnection.workbenches||[]).entries()){
  $('[data-sc-connection-workbench="'+i+'"]').onclick();
  assert.deepEqual(workbenches.at(-1),{mode:spec.mode,id:spec.id,k:spec.k,doubleValued:spec.doubleValued});
 }
}

await mount('double-01');$('#sc-lesson-lab').onclick();
input('sc-initial-state','plus');await submit();assert.equal(ui.getSymmetryCourseResult().experiment.input.initialState,'plus');
$('[data-sc-angle="360"]').onclick();assert.match($('#sc-lab-output').textContent,/360°/);
const overlap=replies.plus.frames.find(f=>f.angle===180).overlap;assert.equal(overlap.re,0);
$('#sc-tab-learn').onclick();$('#sc-tab-lab').onclick();assert.equal($('#sc-initial-state').value,'plus','Ordinary tabs preserve the alternative initial state');
$('#sc-tab-learn').onclick();$('#sc-lesson-lab').onclick();assert.equal($('#sc-initial-state').value,'up','Explicit lesson entry resets the example');
$('#sc-tab-learn').onclick();const sameLessonOldEntry=$('#sc-lesson-lab');$('#sc-tab-lab').onclick();$('#sc-tab-learn').onclick();
sameLessonOldEntry.onclick();assert.ok($('#sc-lesson-lab'),'Detached entry buttons stay inert even when the lesson is unchanged');$('#sc-lesson-lab').onclick();
await submit();
for(const [step,text]of [[0,'(1, 0)'],[1,'(0, 1)'],[2,'(−1, 0)']]){
 $('[data-sc-theta-step="'+step+'"]').onclick();
 assert.ok($('#sc-theta-state').textContent.replaceAll('-','−').includes(text));
}
const staleTheta=$('[data-sc-theta-step="1"]');$('[data-sc-theta-step="2"]').onclick();staleTheta.onclick();assert.match($('#sc-theta-state').textContent,/两次/,'Detached replay controls cannot change the live step');
$('#sc-export-lab').onclick();assert.deepEqual(downloads.at(-1).result.timeReversal,replies.up.timeReversal,'The original Python result is retained in export');

await mount('magnetic-04');$('#sc-lesson-lab').onclick();
for(const basis of ['standard','rotated'])for(const value of ['one','i','phase']){
 const b=$('#sc-anti-basis');b.value=basis;b.onchange({target:b});const v=$('#sc-anti-value');v.value=value;v.onchange({target:v});
 assert.equal($('#sc-anti-next').disabled,false);
 const old=$('#sc-anti-next');old.onclick();const first=$('#sc-antiunitary-replay').innerHTML;old.onclick();assert.equal($('#sc-antiunitary-replay').innerHTML,first,'Detached finite-example controls are inert');
 $('#sc-anti-next').onclick();$('#sc-anti-next').onclick();
 const row=ui.antiunitaryReplayCases.find(r=>r.basis===basis&&r.value===value);
 assert.ok($('#sc-antiunitary-replay').textContent.includes('A²z′ = '+row.twice));
 assert.equal($('#sc-anti-next').disabled,true);
 const before=$('#sc-antiunitary-replay').innerHTML;$('#sc-anti-next').onclick();assert.equal($('#sc-antiunitary-replay').innerHTML,before,'The final step is a boundary');
 $('#sc-anti-reset').onclick();assert.equal($('#sc-anti-next').disabled,false);
}
const v=$('#sc-anti-value'),beforeInvalid=$('#sc-antiunitary-replay').innerHTML;v.onchange({target:{value:'not-a-case'}});assert.equal($('#sc-antiunitary-replay').innerHTML,beforeInvalid,'Only listed exact cases may be selected');

await mount('magnetic-05');$('#sc-lesson-lab').onclick();
for(const value of ['', '-1.05', '1.05', '0.03']){input('sc-af-k',value);const n=runCalls.length;await submit();assert.equal(runCalls.length,n,'Invalid '+JSON.stringify(value)+' must not reach Python');assert.match($('#sc-lab-output').textContent,/有效数值/);}
input('sc-af-k','');$('#sc-spinful').checked=false;$('#sc-lab-form').oninput();
const oldAfForm=$('#sc-lab-form');$('[data-sc-lab="spinor"]').onclick();$('[data-sc-lab="antiferro"]').onclick();
assert.equal($('#sc-af-k').value,'','Changing lab models preserves the unfinished raw draft');
const callsBeforeOldForm=runCalls.length;await oldAfForm.onsubmit({preventDefault(){}});assert.equal(runCalls.length,callsBeforeOldForm,'Detached forms cannot run a calculation after returning to the same lab');
$('#sc-tab-learn').onclick();$('#sc-tab-lab').onclick();assert.equal($('#sc-af-k').value,'','Incomplete raw input survives ordinary tabs');assert.equal($('#sc-spinful').checked,false);
$('#sc-tab-learn').onclick();$('#sc-lesson-lab').onclick();assert.equal($('#sc-af-k').value,'0');assert.equal($('#sc-spinful').checked,true);
for(const [value,eligible]of [[-1,true],[0,true],[0.25,false],[0.5,false],[1,true]]){input('sc-af-k',value);await submit();assert.equal(ui.getSymmetryCourseResult().experiment.result.kramersEligible,eligible);}
input('sc-af-k',0.5);$('#sc-spinful').checked=false;$('#sc-lab-form').oninput();await submit();assert.equal(ui.getSymmetryCourseResult().experiment.result.kramersEligible,true,'The spinless mathematical comparison uses its own square');
assert.match($('#sc-lab-connection').textContent,/三维反例须另行手算/);
assert.match($('#sc-lab-connection').textContent,/不能用它验证这个横向反例/);

pendingResolve='wait';input('sc-af-k',0);const computing=submit();const lateForm=$('#sc-lab-form');$('#sc-tab-learn').onclick();pendingResolve(replies.af0);pendingResolve=null;await computing;
assert.equal(ui.getSymmetryCourseResult().experiment,null,'A late result cannot populate an inactive lesson or export');
const learn=$('#sc-content').innerHTML;lateForm.oninput();assert.equal($('#sc-content').innerHTML,learn);
const staleOpen=$('#sc-lesson-lab');await mount('double-01');staleOpen.onclick();assert.ok($('#sc-lesson-lab'),'A detached lesson-entry button cannot reset the new lesson');

const locale=JSON.parse(fs.readFileSync(new URL('../locales/en-spin-course-connections.json',import.meta.url),'utf8'));
const translations={...loadEnglishCatalog(),...locale},units=new Set();
for(const item of jsStrings(fs.readFileSync(new URL('../dist/symmetry-course-ui.js',import.meta.url),'utf8')))for(const unit of textUnits(item.value))if(HAN.test(unit))units.add(unit.trim());
jsonTexts(catalogs['symmetry-course-lessons'],text=>{units.add(text.trim());return text;});
for(const [key,value]of Object.entries(locale)){assert.ok(units.has(key),'Locale unit exists in the actual source: '+key);assert.ok(value.trim()&&!HAN.test(value),'Locale text is an English translation');}
for(const unit of units)assert.ok(translations[unit],'Every real UI and lesson unit is covered: '+unit);

// Exercise the production classroom loader and route callback with NodeList
// semantics. Array-returning adapters cannot expose flatMap(NodeList) mistakes.
class NodeListView{
 constructor(items){this.nodes=items;this.length=items.length;items.forEach((item,i)=>{this[i]=item;});}
 item(i){return this.nodes[i]??null;}
 forEach(callback,thisArg){this.nodes.forEach((node,i)=>callback.call(thisArg,node,i,this));}
 [Symbol.iterator](){return this.nodes[Symbol.iterator]();}
}
const htmlDescriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');let parsingHTML=0;
Object.defineProperty(Element.prototype,'innerHTML',{...htmlDescriptor,set(value){parsingHTML++;try{htmlDescriptor.set.call(this,value);}finally{parsingHTML--;}}});
Object.defineProperty(Element.prototype,'firstElementChild',{get(){return this.children[0]||null;}});
Element.prototype.querySelectorAll=function(selector){const found=[];const visit=node=>{for(const child of node.children){if(child.matches(selector))found.push(child);visit(child);}};visit(this);return parsingHTML?found:new NodeListView(found);};
Element.prototype.insertAdjacentHTML=function(position,value){const fragment=new Element();fragment.innerHTML=value;const target=position==='afterend'?this.parentNode:this;for(const child of fragment.children)child.parentNode=target;if(position==='afterbegin')target.children.unshift(...fragment.children);else if(position==='afterend')target.children.splice(target.children.indexOf(this)+1,0,...fragment.children);else throw Error('Unsupported insertion position');};
const {renderClassroomView,parseClassroomRoute}=await import('../dist/classroom-ui.js');
const shell=new Container(),s=selector=>shell.querySelector(selector),shellNavigation=[],shellCalls=[];
let shellRoute='#classroom/spin?tab=learn&lesson=magnetic-05&track=magnetic';
await renderClassroomView({container:shell,route:parseClassroomRoute(shellRoute),onNavigate:(hash,options)=>{shellRoute=hash;shellNavigation.push({hash,options});},run:async(action,payload)=>{shellCalls.push({action,payload:structuredClone(payload)});assert.equal(payload.lab,'antiferro');assert.equal(payload.k,0.25);return structuredClone(replies['af0.25']);}});
s('#sc-lesson-lab').onclick();
const nativeFields=s('#sc-lab-form').querySelectorAll('input');
assert.equal(Array.isArray(nativeFields),false);assert.equal(typeof nativeFields.item,'function');assert.equal(typeof nativeFields[Symbol.iterator],'function');assert.equal(nativeFields.map,undefined);
assert.equal(['input','select'].flatMap(tag=>s('#sc-lab-form').querySelectorAll(tag)).length,2,'A NodeList is one flatMap result, not an array of its nodes');
s('#sc-af-k').value='0.25';s('#sc-lab-form').oninput({target:s('#sc-af-k')});await s('#sc-lab-form').onsubmit({preventDefault(){}});
assert.equal(shellCalls.length,1);assert.equal(s('#sc-af-k').value,'0.25');
for(let repeat=0;repeat<2;repeat++){
 s('#sc-af-k').value='';s('#sc-spinful').checked=false;s('#sc-lab-form').oninput({target:s('#sc-af-k')});
 assert.equal(s('#sc-af-k').checkValidity(),false);
 s('#sc-tab-learn').onclick();assert.equal(parseClassroomRoute(shellRoute).tab,'learn');
 s('#sc-tab-lab').onclick();assert.equal(parseClassroomRoute(shellRoute).tab,'lab');
 assert.equal(s('#sc-af-k').value,'','The real classroom route preserves an empty draft after a completed calculation');
 assert.equal(s('#sc-spinful').checked,false,'The same NodeList capture preserves an unchecked checkbox');
}
s('[data-sc-lab="spinor"]').onclick();s('#sc-axis').value='y';s('#sc-initial-state').value='';s('#sc-lab-form').oninput({target:s('#sc-initial-state')});
s('#sc-tab-learn').onclick();s('#sc-tab-lab').onclick();
assert.equal(s('#sc-axis').value,'y','A nondefault select value survives the classroom route');
assert.equal(s('#sc-initial-state').value,'','A select with no selection remains an unfinished raw draft');
s('[data-sc-lab="antiferro"]').onclick();assert.equal(s('#sc-af-k').value,'');assert.equal(s('#sc-spinful').checked,false);
s('#sc-tab-learn').onclick();s('#sc-lesson-lab').onclick();assert.equal(s('#sc-af-k').value,'0');assert.equal(s('#sc-spinful').checked,true,'Only the explicit lesson action restores the example');
assert.equal(shellCalls.length,1,'Shell route changes and raw draft restoration never run Python');
assert.ok(shellNavigation.length>5&&shellNavigation.every(item=>item.options.render===false),'Production classroom callbacks retain local route navigation without remounting');
console.log('Production classroom shell with iterable, non-Array NodeLists: calculated .25 → invalid empty input, repeated tab round trips, select/no-selection/checkbox drafts, explicit reset and zero automatic calculations passed.');
console.log('Spin course connections: six real lessons, explicit preset resets/manual runs, raw drafts, full 6-case semilinear replay, live Theta states, C2 tensor reduction, 1D/3D Kramers boundaries, workbench routes, exports, stale events/results and complete locale units passed.');
