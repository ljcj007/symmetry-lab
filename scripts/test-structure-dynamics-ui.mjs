import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/structure-dynamics.json',import.meta.url),'utf8'));
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.fetch=async url=>({ok:true,json:async()=>data,text:async()=>fs.readFileSync(new URL('../dist/data/examples/phonopy-demo.yaml',import.meta.url),'utf8')});
const {renderStructureDynamicsView,getStructureDynamicsResult,phononBandSVG,phasorSVG}=await import('../dist/structure-dynamics-ui.js');
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
const {renderMaterialResearchView}=await import('../dist/material-research-ui.js?v=20261029-crystal1');
const handoffContainer=new Container();let handoffInput;
await renderMaterialResearchView({container:handoffContainer,selection:{calculationOnly:true,module:'modes',material:'gaas'},run:async(action,input)=>{handoffInput=input;throw Error('Input captured for transfer regression');},download:()=>{}});
assert.equal(handoffContainer.querySelector('#mr-preset').value,'custom');
assert.equal(handoffContainer.querySelector('#mr-length').value,'auto');
assert.equal(handoffContainer.querySelector('#mr-file-text').value,'completed input');
handoffContainer.querySelector('#mr-form').onsubmit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
assert.equal(handoffInput.content,'completed input');
assert.equal(Object.hasOwn(handoffInput,'length_unit'),false);
globalThis.fetch=normalFetch;
console.log('Structure dynamics UI: real Python schemas, six-domain and origin interaction, reflection selection, band segmentation, mode selection, 3D projection, stale calculation/file/demo guards, snapshot handoff with automatic units and material deep links, routes and persisted stepwise exercises passed.');
