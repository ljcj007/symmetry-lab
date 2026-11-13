import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/structure-dynamics.json',import.meta.url),'utf8'));
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.fetch=async url=>({ok:true,json:async()=>data,text:async()=>fs.readFileSync(new URL('../dist/data/examples/phonopy-demo.yaml',import.meta.url),'utf8')});
const {renderStructureDynamicsView,getStructureDynamicsResult,phononBandSVG,phasorSVG,phonopyUnitSummary,phonopySourceHTML}=await import('../dist/structure-dynamics-ui.js');
const {parseClassroomRoute,buildClassroomHash}=await import('../dist/classroom-ui.js');
const {knownTool}=await import('../dist/navigation-ui.js');
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/structure-dynamics.json',import.meta.url),'utf8'));
const calculate=async(action,input)=>structuredClone(fixtures[action==='phase'?(input.q===0?'phaseZero':input.q<0?'phaseNegative':'phase'):action==='diffraction'?(input.hkl[1]===0?'diffraction200':'diffraction220'):input.selected_q===1?'phonopyQ1':'phonopy']);
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

const mount=async(selection={},run=calculate)=>{const container=new Container(),downloads=[],navigations=[];await renderStructureDynamicsView({container,selection,run,download:(body,name)=>downloads.push({body,name}),onNavigate:r=>navigations.push(r)});return {container,downloads,navigations};};
const submit=lab=>lab.container.querySelector('#dyn-form').onsubmit({preventDefault(){}});
for(const name of ['phase','diffraction','phonopy']){const path='compute/'+name+'?material=silicon';assert.deepEqual(parseClassroomRoute(buildClassroomHash(parseClassroomRoute(path))),parseClassroomRoute(path));assert.equal(parseClassroomRoute(path).material,'silicon');assert.ok(knownTool('compute/'+name));}
assert.equal(phononBandSVG({qpoints:[]}), '');
assert.doesNotMatch(phasorSVG([{real:0,imag:0}]),/NaN|Infinity/);
const phase=await mount({calculationOnly:true,experiment:'phase'});await submit(phase);
assert.ok(getStructureDynamicsResult(),phase.container.querySelector('#dyn-output').innerHTML);
assert.equal(getStructureDynamicsResult().result.symmetry.retainedOrder,8);
assert.equal(phase.container.firstElementChild.querySelectorAll('[data-domain]').length,6);
phase.container.querySelector('#dyn-download').onclick();assert.equal(JSON.parse(phase.downloads[0].body).tool,'phase');
await phase.container.querySelector('[data-domain="1"]').onclick();assert.equal(getStructureDynamicsResult().input.axis,'x');assert.ok(getStructureDynamicsResult().input.q<0);
phase.container.querySelector('#dyn-q').value='0';phase.container.querySelector('#dyn-form').oninput({target:phase.container.querySelector('#dyn-q')});assert.equal(getStructureDynamicsResult(),null);await submit(phase);
assert.equal(getStructureDynamicsResult().result.symmetry.retainedOrder,48);await phase.container.querySelector('[data-domain="0"]').onclick();assert.equal(getStructureDynamicsResult().input.q,0);
for(const yaw of [-180,-90,0,90,180]){phase.container.querySelector('#dyn-yaw').oninput({target:{value:String(yaw)}});for(const line of phase.container.querySelector('#dyn-motion').querySelectorAll('line'))for(const coord of ['x1','x2','y1','y2']){const n=Number(line.attributes[coord]);assert.ok(Number.isFinite(n)&&n>=0&&n<=(coord.startsWith('x')?680:390));}}
const diffraction=await mount({calculationOnly:true,experiment:'diffraction',material:'silicon'});diffraction.container.querySelector('#dyn-hkl').value='[2,0,0]';await submit(diffraction);assert.equal(getStructureDynamicsResult().result.reflection.extinction.kind,'diamond_basis');assert.match(diffraction.container.querySelector('#dyn-output').innerHTML,/金刚石基底消光/);
diffraction.container.querySelector('#dyn-hkl').value='[2,2,0]';await submit(diffraction);assert.ok(getStructureDynamicsResult().result.reflection.intensity>0);
const ph=await mount({calculationOnly:true,experiment:'phonopy'});await ph.container.querySelector('#dyn-demo').onclick();await submit(ph);assert.equal(getStructureDynamicsResult().result.kind,'phonon-data');assert.ok(ph.container.querySelector('#dyn-motion'));assert.match(ph.container.querySelector('#dyn-output').innerHTML,/合成/);
const band=getStructureDynamicsResult().result;assert.equal(band.segments.length,2);const svg=phononBandSVG(band);assert.equal((svg.match(/<polyline/g)||[]).length,band.summary.bandCount*2,'Each branch has a separate line per path segment');
await ph.container.querySelector('#dyn-q-select').onchange({target:{value:'1'}});assert.equal(getStructureDynamicsResult().input.selected_q,1);
ph.container.querySelector('#dyn-frame').oninput({target:{value:'1'}});assert.doesNotMatch(ph.container.querySelector('#dyn-motion').innerHTML,/NaN|Infinity/);
let finish;const pending=await mount({tab:'lab',experiment:'phase'},()=>new Promise(r=>finish=r));const request=submit(pending);pending.container.querySelector('#dyn-material').onchange({target:{value:'silicon'}});finish(await calculate('phase',{}));await request;assert.equal(getStructureDynamicsResult(),null,'Late responses cannot change material context');
const failure=await mount({tab:'lab'},async()=>{throw Error('<bad data>')});await submit(failure);assert.match(failure.container.querySelector('#dyn-output').innerHTML,/&lt;bad data&gt;/);assert.equal(getStructureDynamicsResult(),null);
const exercise=data.exercises[0],practice=await mount({tab:'derive',exercise:exercise.id});let step=practice.container.querySelector('#dyn-steps').children[0];step.querySelector(`[data-answer="${(exercise.steps[0].answer+1)%exercise.steps[0].choices.length}"]`).onclick();assert.equal(practice.container.querySelector('#dyn-steps').children.length,1);
for(let i=0;i<exercise.steps.length;i++){step=practice.container.querySelector('#dyn-steps').children[i];step.querySelector(`[data-answer="${exercise.steps[i].answer}"]`).onclick();}assert.ok(JSON.parse(storage.get('symmetry-lab.structure-dynamics.progress.v1'))[exercise.id]);
assert.match((await mount({tab:'derive',exercise:exercise.id})).container.querySelector('#dyn-content').innerHTML,/✓/);
const atlas=await mount({atlasOnly:true,material:'batio3'});assert.ok(atlas.container.querySelector('.obs-case-grid'));assert.equal(atlas.container.querySelector('[data-dyn-tab]'),null);
const lessonLab=await mount({lesson:'screw-glide'});await lessonLab.container.querySelector('#dyn-to-lab').onclick();assert.equal(lessonLab.container.querySelector('#dyn-preset').value,'screw21');assert.equal(lessonLab.container.querySelector('#dyn-hkl').value,'[0,0,1]');
const lessonSwitch=await mount();lessonSwitch.container.querySelector('#dyn-lesson').onchange({target:{value:'centering-basis'}});lessonSwitch.container.querySelector('[data-dyn-tab="derive"]').onclick();assert.equal(lessonSwitch.container.querySelector('#dyn-exercise').value,data.exercises.find(e=>e.lesson==='centering-basis').id);
const nacl=await mount({calculationOnly:true,experiment:'diffraction',material:'nacl'});assert.equal(nacl.container.querySelector('#dyn-hkl').value,'[1,1,1]');assert.deepEqual(JSON.parse(nacl.container.querySelector('#dyn-factors').value),{Na:1,Cl:2});

// File reads and demo fetches may resolve after a user changes the tab,
// changes the tool, or edits the file. They must never write into new controls.
let resolveFile,rejectFile;
const slowFile=await mount({tab:'lab',experiment:'phonopy',material:'gaas'});
const fileRequest=slowFile.container.querySelector('#dyn-file').onchange({target:{files:[{name:'old.yaml',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});
slowFile.container.querySelector('[data-dyn-tab="learn"]').onclick();
slowFile.container.querySelector('[data-dyn-tab="lab"]').onclick();
resolveFile('old-file-content');await fileRequest;
assert.equal(slowFile.container.querySelector('#dyn-file-text').value,'','Returning to the same tab must not revive an older read');
const badRead=slowFile.container.querySelector('#dyn-structure-file').onchange({target:{files:[{name:'missing.yaml',size:100,text:()=>new Promise((resolve,reject)=>rejectFile=reject)}]}});
slowFile.container.querySelector('[data-dyn-tab="derive"]').onclick();rejectFile(Error('late-file-error'));await badRead;
assert.equal(slowFile.container.querySelector('#dyn-output'),null,'Late file errors must not write into a lesson or throw on missing DOM');

const editedFile=await mount({tab:'lab',experiment:'phonopy'});
const oldDOS=editedFile.container.querySelector('#dyn-dos-file').onchange({target:{files:[{name:'old.dat',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});
editedFile.container.querySelector('#dyn-dos').value='new DOS text';
editedFile.container.querySelector('#dyn-form').oninput({target:editedFile.container.querySelector('#dyn-dos')});
resolveFile('stale DOS text');await oldDOS;
assert.equal(editedFile.container.querySelector('#dyn-dos').value,'new DOS text');

const normalFetch=globalThis.fetch;
let resolveDemo,rejectDemo;
globalThis.fetch=async()=>({ok:true,text:()=>new Promise(resolve=>resolveDemo=resolve)});
const slowDemo=await mount({tab:'lab',experiment:'phonopy'}),demoRequest=slowDemo.container.querySelector('#dyn-demo').onclick();
await Promise.resolve();
slowDemo.container.querySelector('[data-dyn-tool="phase"]').onclick();resolveDemo('stale demo');await demoRequest;
assert.ok(slowDemo.container.querySelector('#dyn-q'));
slowDemo.container.querySelector('[data-dyn-tool="phonopy"]').onclick();
assert.equal(slowDemo.container.querySelector('#dyn-file-text').value,'');
globalThis.fetch=async()=>({ok:true,text:()=>new Promise((resolve,reject)=>rejectDemo=reject)});
const rejectedDemo=slowDemo.container.querySelector('#dyn-demo').onclick();await Promise.resolve();
slowDemo.container.querySelector('[data-dyn-tab="cases"]').onclick();rejectDemo(Error('late-demo-error'));await rejectedDemo;
assert.ok(slowDemo.container.querySelector('.obs-case-grid'));

globalThis.fetch=async()=>({ok:true,text:()=>new Promise(resolve=>resolveDemo=resolve)});
const lessonAuto=await mount({lesson:'phonopy-files'}),autoRequest=lessonAuto.container.querySelector('#dyn-to-lab').onclick();await Promise.resolve();
assert.ok(lessonAuto.container.querySelector('#dyn-file-text'),'Lesson opens the lab while its optional example is loading');
lessonAuto.container.querySelector('#dyn-file-text').value='user file wins';
lessonAuto.container.querySelector('#dyn-form').oninput({target:lessonAuto.container.querySelector('#dyn-file-text')});
resolveDemo('stale lesson example');await autoRequest;
assert.equal(lessonAuto.container.querySelector('#dyn-file-text').value,'user file wins');
globalThis.fetch=normalFetch;

// Transfer the completed input, not later control text, and preserve material
// context while leaving physical length units to the actual file metadata.
const transfer=await mount({calculationOnly:true,experiment:'phonopy',material:'gaas'});
transfer.container.querySelector('#dyn-file-text').value='completed input';await submit(transfer);
const freeze=transfer.container.querySelector('#dyn-freeze');
assert.equal(freeze.attributes.href,'#compute/phonon-modes?material=gaas');
transfer.container.querySelector('#dyn-file-text').value='unsubmitted control edit';freeze.onclick();
const researchData=JSON.parse(fs.readFileSync(new URL('../dist/data/material-research.json',import.meta.url),'utf8'));
globalThis.fetch=async url=>String(url).includes('material-research.json')?{ok:true,json:async()=>researchData}:normalFetch(url);
// Follow the production handoff target, including its cache query. Loading an
// unrelated version creates a second module-local handoff slot in Node as well
// as in a browser, and would not exercise the actual connected workflow.
const dynamicsModuleURL=new URL('../dist/structure-dynamics-ui.js',import.meta.url);
const handoffSpecifier=fs.readFileSync(dynamicsModuleURL,'utf8').match(/import \{setMaterialResearchInput\} from '([^']+)'/)[1];
const {renderMaterialResearchView}=await import(new URL(handoffSpecifier,dynamicsModuleURL).href);
const handoffContainer=new Container();let handoffInput;
await renderMaterialResearchView({container:handoffContainer,selection:{calculationOnly:true,module:'modes',material:'gaas'},run:async(action,input)=>{handoffInput=input;throw Error('Input captured for transfer regression');},download:()=>{}});
assert.equal(handoffContainer.querySelector('#mr-preset').value,'custom');
assert.equal(handoffContainer.querySelector('#mr-length').value,'auto');
assert.equal(handoffContainer.querySelector('#mr-file-text').value,'completed input');
handoffContainer.querySelector('#mr-form').onsubmit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
assert.equal(handoffInput.content,'completed input');
assert.equal(Object.hasOwn(handoffInput,'length_unit'),false);
globalThis.fetch=normalFetch;
// The official example loads exact source text, explicitly chooses THz, and
// waits for manual submission. Unit and provenance rendering are tested here;
// Python tests independently compare every q/frequency with the original file.
const officialText=fs.readFileSync(new URL('../dist/data/examples/phonopy-al-abacus-band.yaml',import.meta.url),'utf8');
const officialSource=JSON.parse(fs.readFileSync(new URL('../dist/data/examples/phonopy-al-abacus-source.json',import.meta.url),'utf8'));
globalThis.fetch=async url=>String(url).includes('phonopy-al-abacus-band.yaml')?{ok:true,text:async()=>officialText}:normalFetch(url);
let officialInput,officialCalls=0;
const official=await mount({calculationOnly:true,experiment:'phonopy'},async(action,input)=>{officialInput=input;officialCalls++;throw Error('Captured manual official-file submission');});
assert.ok(official.container.querySelector('#dyn-demo'),'Synthetic example remains available');
await official.container.querySelector('#dyn-official-al').onclick();
assert.equal(officialCalls,0,'Loading a reference file must not trigger Python automatically');
assert.equal(official.container.querySelector('#dyn-file-text').value,officialText);
assert.equal(official.container.querySelector('#dyn-unit').value,'THz');
await submit(official);
assert.equal(officialCalls,1);
assert.equal(officialInput.filename,'phonopy-al-abacus-band.yaml');
assert.equal(officialInput.content,officialText);
assert.equal(officialInput.frequency_unit,'THz');
const units=phonopyUnitSummary({frequencyUnit:'THz',frequencyUnitSource:'user.frequency_unit',structure:{lengthUnit:'au',lengthUnitSource:'length_unit',reciprocalLengthUnit:'1 / au'}});
assert.match(units,/用户明确确认/);assert.match(units,/文件长度字段/);assert.match(units,/1 \/ au/);assert.match(units,/不执行/);
const referenceHTML=phonopySourceHTML({sourceIdentity:{sha256:officialSource.sha256,byteCount:officialSource.byteCount,reference:{commit:officialSource.commit,path:officialSource.path,url:officialSource.url}}});
assert.match(referenceHTML,/不是实验数据/);assert.match(referenceHTML,/未声明频率单位/);
assert.match(referenceHTML,/相对复相位/);assert.doesNotMatch(referenceHTML,/虚部均为零/);
assert.match(referenceHTML,new RegExp(officialSource.sha256));assert.match(referenceHTML,/BSD 三条款/);
assert.equal(phonopySourceHTML({sourceIdentity:{sha256:'a different input'}}),'');
globalThis.fetch=async()=>({ok:true,text:()=>new Promise(resolve=>resolveDemo=resolve)});
const slowOfficial=await mount({calculationOnly:true,experiment:'phonopy'});
const officialLoad=slowOfficial.container.querySelector('#dyn-official-al').onclick();await Promise.resolve();
slowOfficial.container.querySelector('#dyn-file-text').value='new local input';
slowOfficial.container.querySelector('#dyn-unit').value='meV';
slowOfficial.container.querySelector('#dyn-form').oninput({target:slowOfficial.container.querySelector('#dyn-unit')});
resolveDemo(officialText);await officialLoad;
assert.equal(slowOfficial.container.querySelector('#dyn-file-text').value,'new local input');
assert.equal(slowOfficial.container.querySelector('#dyn-unit').value,'meV','Late example cannot overwrite a user unit choice');
globalThis.fetch=normalFetch;
// Actual deferred HTTP and body reads reproduce the public loading/Run race.
// We bypass native disabled controls through submit() as Enter or a retained
// handler could otherwise reach the form; the controller must guard itself.
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const demoText=fs.readFileSync(new URL('../dist/data/examples/phonopy-demo.yaml',import.meta.url),'utf8');
const responseFor=body=>({ok:true,text:()=>body.promise});
let pendingFetch=deferred(),pendingBody=deferred(),loadingFetches=0,loadingRuns=0,loadingSignal;
globalThis.fetch=(url,options)=>{loadingFetches++;loadingSignal=options?.signal;return pendingFetch.promise;};
const loading=await mount({calculationOnly:true,experiment:'phonopy'},async()=>{loadingRuns++;throw Error('manual run captured after loading');});
const loadingRequest=loading.container.querySelector('#dyn-official-al').onclick();
assert.equal(loading.container.querySelector('#dyn-run').disabled,true,'Run is disabled before the HTTP response arrives');
assert.equal(loading.container.querySelector('#dyn-fields').disabled,false,'File loading leaves editing and replacement controls usable');
assert.equal(loading.container.querySelector('#dyn-official-al').disabled,true);
assert.equal(loading.container.querySelector('#dyn-demo').disabled,false,'Another sample can supersede the current request');
assert.equal(loading.container.querySelector('#dyn-input-status').hidden,false);
assert.match(loading.container.querySelector('#dyn-input-status').textContent,/手动点击/);
assert.equal(loading.container.querySelector('#dyn-cancel').hidden,false);
await submit(loading);await submit(loading);
await loading.container.querySelector('#dyn-official-al').onclick();
assert.equal(loadingRuns,0,'Immediate and repeated submit events cannot compute an empty form or cancel the incoming sample');
assert.equal(loadingFetches,1,'Repeated current-example clicks do not launch duplicate requests');
assert.equal(loadingSignal?.aborted,false,'Blocked Run does not cancel the incoming request');
assert.match(loading.container.querySelector('#dyn-output').innerHTML,/正在载入官方/);
pendingFetch.resolve(responseFor(pendingBody));await Promise.resolve();
await submit(loading);
assert.equal(loading.container.querySelector('#dyn-run').disabled,true,'Run stays disabled while the response body is pending');
assert.equal(loadingRuns,0);
pendingBody.resolve(officialText);await loadingRequest;
assert.equal(loading.container.querySelector('#dyn-file-text').value,officialText);
assert.equal(loading.container.querySelector('#dyn-run').disabled,false);
assert.equal(loading.container.querySelector('#dyn-input-status').hidden,true);
assert.equal(loading.container.querySelector('#dyn-cancel').hidden,true);
assert.equal(loading.container.querySelector('#dyn-output').attributes['aria-busy'],'false');
assert.equal(loadingRuns,0,'Completing a file read still waits for manual calculation');
await submit(loading);assert.equal(loadingRuns,1);

// HTTP, network and body-read failures release only their own pending state
// and expose an explicit retry without losing earlier editable input.
for(const failure of ['http','network','body']){
 let attempts=0;
 globalThis.fetch=async()=>{attempts++;if(attempts>1)return {ok:true,text:async()=>officialText};if(failure==='network')throw Error('<network failed>');return {ok:failure!=='http',text:async()=>{throw Error('<body failed>');}};};
 const failed=await mount({calculationOnly:true,experiment:'phonopy'});
 failed.container.querySelector('#dyn-file-text').value='earlier local input';
 failed.container.querySelector('#dyn-form').oninput({target:failed.container.querySelector('#dyn-file-text')});
 await failed.container.querySelector('#dyn-official-al').onclick();
 assert.equal(failed.container.querySelector('#dyn-run').disabled,false);
 assert.equal(failed.container.querySelector('#dyn-official-al').disabled,false);
 assert.equal(failed.container.querySelector('#dyn-file-text').value,'earlier local input');
 assert.equal(failed.container.querySelector('#dyn-input-status').hidden,true);
 assert.match(failed.container.querySelector('#dyn-output').innerHTML,/载入失败/);
 assert.doesNotMatch(failed.container.querySelector('#dyn-output').innerHTML,/<network failed>|<body failed>/);
 const retry=failed.container.querySelector('#dyn-retry-input');assert.ok(retry);
 await retry.onclick();
 assert.equal(attempts,2);assert.equal(failed.container.querySelector('#dyn-file-text').value,officialText);
 assert.equal(failed.container.querySelector('#dyn-run').disabled,false);
}

// Editing cancels a pending source. A superseded success or error cannot
// restore its old content, report an error, or change the new control state.
for(const staleFails of [false,true]){
 const read=deferred();let signal;
 globalThis.fetch=(url,options)=>{signal=options?.signal;return read.promise;};
 const edited=await mount({calculationOnly:true,experiment:'phonopy'});
 const request=edited.container.querySelector('#dyn-official-al').onclick();
 edited.container.querySelector('#dyn-file-text').value='replacement local input';
 edited.container.querySelector('#dyn-unit').value='meV';
 edited.container.querySelector('#dyn-form').oninput({target:edited.container.querySelector('#dyn-file-text')});
 assert.equal(signal?.aborted,true);
 assert.equal(edited.container.querySelector('#dyn-run').disabled,false);
 assert.equal(edited.container.querySelector('#dyn-input-status').hidden,true);
 const message=edited.container.querySelector('#dyn-output').innerHTML;
 if(staleFails)read.reject(Error('obsolete sample failure'));else read.resolve({ok:true,text:async()=>officialText});
 await request;
 assert.equal(edited.container.querySelector('#dyn-file-text').value,'replacement local input');
 assert.equal(edited.container.querySelector('#dyn-unit').value,'meV');
 assert.equal(edited.container.querySelector('#dyn-output').innerHTML,message);
 assert.equal(edited.container.querySelector('#dyn-run').disabled,false);
}

// Changing to a local file keeps Run blocked until that newer read, rather
// than an older example, succeeds. Other Phonopy inputs use the same gate.
for(const target of ['dyn-file','dyn-structure-file','dyn-dos-file']){
 const remote=deferred(),local=deferred();
 globalThis.fetch=()=>remote.promise;
 const swapped=await mount({calculationOnly:true,experiment:'phonopy'});
 const example=swapped.container.querySelector('#dyn-official-al').onclick();
 const localRead=swapped.container.querySelector('#'+target).onchange({target:{files:[{name:'new-local.yaml',size:25,text:()=>local.promise}]}});
 assert.equal(swapped.container.querySelector('#dyn-run').disabled,true);
 remote.resolve({ok:true,text:async()=>officialText});await example;
 assert.equal(swapped.container.querySelector('#dyn-run').disabled,true,'An older example cannot release a newer local-file read');
 local.resolve('new local file content');await localRead;
 assert.equal(swapped.container.querySelector('#dyn-run').disabled,false);
 assert.equal(swapped.container.querySelector(target==='dyn-file'?'#dyn-file-text':target==='dyn-structure-file'?'#dyn-structure-text':'#dyn-dos').value,'new local file content');
 assert.equal(swapped.container.querySelector('#dyn-unit').value,'unknown','The abandoned example cannot impose THz on another file');
}

// Switching samples invalidates the first request. Even an error from the old
// sample cannot unlock the active sample or overwrite its final placeholder.
let firstSample=deferred(),secondSample=deferred(),sampleFetches=0;
globalThis.fetch=()=>++sampleFetches===1?firstSample.promise:secondSample.promise;
const switched=await mount({calculationOnly:true,experiment:'phonopy'});
const firstSampleRequest=switched.container.querySelector('#dyn-official-al').onclick();
const secondSampleRequest=switched.container.querySelector('#dyn-demo').onclick();
assert.equal(sampleFetches,2);assert.equal(switched.container.querySelector('#dyn-run').disabled,true);
assert.equal(switched.container.querySelector('#dyn-demo').disabled,true);
assert.equal(switched.container.querySelector('#dyn-official-al').disabled,false);
firstSample.reject(Error('old official error'));await firstSampleRequest;
assert.equal(switched.container.querySelector('#dyn-run').disabled,true);
secondSample.resolve({ok:true,text:async()=>demoText});await secondSampleRequest;
assert.equal(switched.container.querySelector('#dyn-file-text').value,demoText);
assert.equal(switched.container.querySelector('#dyn-run').disabled,false);
assert.doesNotMatch(switched.container.querySelector('#dyn-output').innerHTML,/old official error/);

// A new visit to the same lab gets fresh controls. The first visit's request
// cannot unlock a newer pending request after the user returns to the lab.
let visitOne=deferred(),visitTwo=deferred(),visitFetches=0;
globalThis.fetch=()=>++visitFetches===1?visitOne.promise:visitTwo.promise;
const visits=await mount({tab:'lab',experiment:'phonopy'});
const oldVisit=visits.container.querySelector('#dyn-official-al').onclick();
visits.container.querySelector('[data-dyn-tab="learn"]').onclick();
visits.container.querySelector('[data-dyn-tab="lab"]').onclick();
assert.equal(visits.container.querySelector('#dyn-run').disabled,false);
const newVisit=visits.container.querySelector('#dyn-official-al').onclick();
visitOne.resolve({ok:true,text:async()=>officialText});await oldVisit;
assert.equal(visits.container.querySelector('#dyn-run').disabled,true);
assert.equal(visits.container.querySelector('#dyn-file-text').value,'');
visitTwo.resolve({ok:true,text:async()=>officialText});await newVisit;
assert.equal(visits.container.querySelector('#dyn-run').disabled,false);

// Replacing the owning view and retaining an old button handler must not
// start a read or write into the newly mounted calculator.
const detachedRead=deferred();let detachedFetches=0;
globalThis.fetch=()=>{detachedFetches++;return detachedRead.promise;};
const detached=await mount({calculationOnly:true,experiment:'phonopy'});
const detachedButton=detached.container.querySelector('#dyn-official-al');
const detachedRequest=detachedButton.onclick();
await renderStructureDynamicsView({container:detached.container,selection:{calculationOnly:true,experiment:'phase'},run:calculate,download:()=>{}});
await detachedButton.onclick();assert.equal(detachedFetches,1);
detachedRead.resolve({ok:true,text:async()=>officialText});await detachedRequest;
assert.ok(detached.container.querySelector('#dyn-q'));
assert.equal(detached.container.querySelector('#dyn-run').disabled,false);
assert.equal(detached.container.querySelector('#dyn-file-text'),null);

// Explicit cancel releases the pending gate and preserves the previous form.
const canceledRead=deferred();let cancelSignal;
globalThis.fetch=(url,options)=>{cancelSignal=options?.signal;return canceledRead.promise;};
const canceled=await mount({calculationOnly:true,experiment:'phonopy'});
canceled.container.querySelector('#dyn-file-text').value='retained input';
canceled.container.querySelector('#dyn-form').oninput({target:canceled.container.querySelector('#dyn-file-text')});
const canceledRequest=canceled.container.querySelector('#dyn-official-al').onclick();
canceled.container.querySelector('#dyn-cancel').onclick();
assert.equal(cancelSignal?.aborted,true);
assert.equal(canceled.container.querySelector('#dyn-run').disabled,false);
assert.equal(canceled.container.querySelector('#dyn-file-text').value,'retained input');
canceledRead.resolve({ok:true,text:async()=>officialText});await canceledRequest;
assert.equal(canceled.container.querySelector('#dyn-file-text').value,'retained input');

// An explicit successful sample action replaces a saved raw form draft;
// ordinary tab navigation still retains that draft until the action succeeds.
globalThis.fetch=async()=>({ok:true,text:async()=>officialText});
const drafted=await mount({tab:'lab',experiment:'phonopy'});
drafted.container.querySelector('#dyn-file-text').value='draft from the previous visit';
drafted.container.querySelector('#dyn-form').oninput({target:drafted.container.querySelector('#dyn-file-text')});
drafted.container.querySelector('[data-dyn-tab="learn"]').onclick();
drafted.container.querySelector('[data-dyn-tab="lab"]').onclick();
assert.equal(drafted.container.querySelector('#dyn-file-text').value,'draft from the previous visit');
await drafted.container.querySelector('#dyn-official-al').onclick();
assert.equal(drafted.container.querySelector('#dyn-file-text').value,officialText);
let localAttempts=0;
const retryFile={name:'retry-file.yaml',size:50,text:async()=>{if(++localAttempts===1)throw Error('temporary local read failure');return 'recovered local input';}};
await drafted.container.querySelector('#dyn-file').onchange({target:{files:[retryFile]}});
assert.equal(drafted.container.querySelector('#dyn-run').disabled,false);
assert.equal(drafted.container.querySelector('#dyn-input-status').hidden,true);
await drafted.container.querySelector('#dyn-retry-input').onclick();
assert.equal(localAttempts,2);
assert.equal(drafted.container.querySelector('#dyn-file-text').value,'recovered local input');
assert.equal(drafted.container.querySelector('#dyn-run').disabled,false);

// A canceled read cannot clear the busy state of a subsequent Python job.
const obsoleteRead=deferred(),newPython=deferred();let busyFetches=0,busyRuns=0,localReads=0;
globalThis.fetch=()=>{busyFetches++;return obsoleteRead.promise;};
const busyAfterEdit=await mount({calculationOnly:true,experiment:'phonopy'},()=>{busyRuns++;return newPython.promise;});
const obsoleteRequest=busyAfterEdit.container.querySelector('#dyn-official-al').onclick();
busyAfterEdit.container.querySelector('#dyn-file-text').value='manual input';
busyAfterEdit.container.querySelector('#dyn-form').oninput({target:busyAfterEdit.container.querySelector('#dyn-file-text')});
const newJob=submit(busyAfterEdit);await submit(busyAfterEdit);
await busyAfterEdit.container.querySelector('#dyn-demo').onclick();
await busyAfterEdit.container.querySelector('#dyn-file').onchange({target:{files:[{name:'ignored.yaml',size:1,text:async()=>{localReads++;return 'ignored';}}]}});
assert.equal(busyRuns,1);assert.equal(busyFetches,1);assert.equal(localReads,0);
obsoleteRead.resolve({ok:true,text:async()=>officialText});await obsoleteRequest;
assert.equal(busyAfterEdit.container.querySelector('#dyn-run').disabled,true);
assert.equal(busyAfterEdit.container.querySelector('#dyn-fields').disabled,true);
assert.equal(busyAfterEdit.container.querySelector('#dyn-output').attributes['aria-busy'],'true');
newPython.reject(Error('new Python job failed'));await newJob;
assert.equal(busyAfterEdit.container.querySelector('#dyn-run').disabled,false);

// Conversely, an obsolete Python finally cannot release a newer file read.
const oldPython=deferred(),laterRead=deferred();
globalThis.fetch=()=>laterRead.promise;
const readAfterCancel=await mount({calculationOnly:true,experiment:'phonopy'},()=>oldPython.promise);
readAfterCancel.container.querySelector('#dyn-file-text').value='manual source';
const oldJob=submit(readAfterCancel);
readAfterCancel.container.querySelector('#dyn-cancel').onclick();
const laterRequest=readAfterCancel.container.querySelector('#dyn-official-al').onclick();
oldPython.reject(Error('obsolete canceled Python job'));await oldJob;
assert.equal(readAfterCancel.container.querySelector('#dyn-run').disabled,true);
assert.equal(readAfterCancel.container.querySelector('#dyn-input-status').hidden,false);
assert.equal(readAfterCancel.container.querySelector('#dyn-cancel').hidden,false);
assert.equal(readAfterCancel.container.querySelector('#dyn-output').attributes['aria-busy'],'true');
assert.doesNotMatch(readAfterCancel.container.querySelector('#dyn-output').innerHTML,/obsolete canceled Python job/);
laterRead.resolve({ok:true,text:async()=>officialText});await laterRequest;
assert.equal(readAfterCancel.container.querySelector('#dyn-run').disabled,false);

// The same job identity also keeps a canceled calculation's finally from
// enabling Run while a later calculation is still running.
const oldRun=deferred(),currentRun=deferred();let identityRuns=0;
const jobs=await mount({calculationOnly:true,experiment:'phonopy'},()=>++identityRuns===1?oldRun.promise:currentRun.promise);
jobs.container.querySelector('#dyn-file-text').value='manual source';
const oldRunRequest=submit(jobs);jobs.container.querySelector('#dyn-cancel').onclick();
const currentRunRequest=submit(jobs);
oldRun.reject(Error('old run error'));await oldRunRequest;
assert.equal(identityRuns,2);assert.equal(jobs.container.querySelector('#dyn-run').disabled,true);
assert.equal(jobs.container.querySelector('#dyn-output').attributes['aria-busy'],'true');
currentRun.reject(Error('current run error'));await currentRunRequest;
assert.equal(jobs.container.querySelector('#dyn-run').disabled,false);
assert.match(jobs.container.querySelector('#dyn-output').innerHTML,/current run error/);
globalThis.fetch=normalFetch;
console.log('Structure dynamics UI: real Python schemas, six-domain and origin interaction, reflection selection, band segmentation, mode selection, 3D projection, snapshot handoff, pending sample/file Run gates, HTTP/body/local-file retry, editable replacement, canceled/detached reads, obsolete Python completion isolation, routes and persisted stepwise exercises passed.');
