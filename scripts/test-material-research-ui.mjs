import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

// The existing classroom tests use a small DOM adapter. Keep browser event
// behavior here, including disabled controls and disconnected result roots.
const camel=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
const decode=value=>String(value).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export class Element{
 constructor(tag='div',attributes={},parentNode=null){this.tag=tag;this.attributes=attributes;this.parentNode=parentNode;this.children=[];this.dataset={};for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[camel(key.slice(5))]=decode(value);this.value=decode(attributes.value||'');this.disabled=Object.hasOwn(attributes,'disabled');this.checked=Object.hasOwn(attributes,'checked');this.hidden=Object.hasOwn(attributes,'hidden');}
 get type(){return this.attributes.type||'';}
 get id(){return this.attributes.id||'';}
 get isConnected(){return !!this.parentNode&&this.parentNode.isConnected!==false;}
 get nextElementSibling(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)+1]||null;}
 set textContent(value){this._text=String(value);this.html=this._text.replace(/&/g,'&amp;').replace(/</g,'&lt;');for(const child of this.children)child.parentNode=null;this.children=[];}
 get textContent(){return this._text??decode((this.html||'').replace(/<[^>]*>/g,''));}
 set innerHTML(value){delete this._text;for(const child of this.children)child.parentNode=null;this.html=String(value);this.children=[];const stack=[this],voids=new Set(['input','br','hr','img','meta','link','source','wbr','area','base','col','embed','param','track']);for(const match of this.html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)){const tag=match[2].toLowerCase();if(match[1]){while(stack.length>1){const closed=stack.pop();if(closed.tag===tag)break;}continue;}const attrs={};for(const attr of match[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g))if(!Object.hasOwn(attrs,attr[1]))attrs[attr[1]]=attr[2]??'';const parent=stack.at(-1),child=new Element(tag,attrs,parent);parent.children.push(child);const end=this.html.indexOf('</'+tag,match.index+match[0].length);if(end>=0)child.html=this.html.slice(match.index+match[0].length,end);if(tag==='textarea')child.value=decode(child.html||'');if(!voids.has(tag)&&!match[3].endsWith('/'))stack.push(child);}for(const select of this.querySelectorAll('select')){const items=select.querySelectorAll('option');select.value=(items.find(x=>Object.hasOwn(x.attributes,'selected'))||items[0])?.value||'';}}
 get innerHTML(){return this.html||'';}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 appendChild(child){child.parentNode=this;this.children.push(child);return child;}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return String(this.attributes.class||this.className||'').split(/\s+/).includes(selector.slice(1));if(/^[a-z][\w-]*$/.test(selector))return this.tag===selector;const match=selector.match(/^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/);return !!match&&(!match[1]||match[1]===this.tag)&&Object.hasOwn(this.attributes,match[2])&&(match[3]===undefined||this.attributes[match[2]]===match[3]);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
export class Container{
 constructor(){this.isConnected=true;}
 set innerHTML(value){if(this.firstElementChild)this.firstElementChild.parentNode=null;this.html=value;this.firstElementChild=new Element('div',{},this);this.firstElementChild.innerHTML=value;}
 get innerHTML(){return this.html||'';}
 querySelector(selector){return this.firstElementChild.querySelector(selector);}
 querySelectorAll(selector){return this.firstElementChild.querySelectorAll(selector);}
}
export const flush=()=>new Promise(resolve=>setImmediate(resolve));

async function runUITests(){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/material-research.json',import.meta.url),'utf8'));
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/material-research.json',import.meta.url),'utf8'));
 const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.document={createElement:tag=>new Element(tag)};
 globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(data),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});
 const ui=await import('../dist/material-research-ui.js');
 const notebook=await import('../dist/material-notebook.js?v=20261030-construction1');
 const {parseClassroomRoute,buildClassroomHash,classroomPathways}=await import('../dist/classroom-ui.js');
 const {knownTool}=await import('../dist/navigation-ui.js');
 const calls=[];
 const calculate=async(action,input)=>{
  calls.push({action,input:structuredClone(input)});
  let key;
  if(action==='phonon_modes')key=input.length_unit==='unknown'?'modesUnknownUnit':input.data?.natom===1?'modesCharacters':input.data?.physical_unit?.length==='bohr'?'modesBohr':input.data?.phonon?.[0]?.['q-position']?.[0]===.5?'modesFiniteQ':input.phase>1?'modesPhase':input.preset==='gaas'?'modesGaAs':input.selected_band===0?'modesAcoustic':'modes';
  else if(action==='band_connectivity')key=input.model==='rashba'?(input.zeeman?'rashbaBroken':'rashba'):(input.mixing?'bandsBroken':'bands');
  else if(action==='phonon_thermo')key=({mesh:'thermoMesh',thermal:'thermoThermal',dos:'thermoDOS'})[input.source]||'thermoCompare';
  else throw Error('Unexpected action '+action);
  return structuredClone(fixtures.results[key]);
 };
 const mount=async(selection={},run=calculate)=>{const container=new Container(),downloads=[],navigations=[],locations=[],cancelled=[];await ui.renderMaterialResearchView({container,selection,run,download:(body,name,type)=>downloads.push({body,name,type}),cancelRun:()=>cancelled.push(true),onNavigate:r=>navigations.push(r),onLocation:r=>locations.push(r)});return {container,downloads,navigations,locations,cancelled,$:selector=>container.querySelector(selector)};};
 const submit=async view=>{view.$('#mr-form').onsubmit({preventDefault(){}});await flush();};
 const change=(view,id,value)=>{const control=view.$('#'+id);control.value=String(value);view.$('#mr-form').oninput({target:control});};
 const select=async(view,id,value)=>{const control=view.$('#'+id);control.value=value;await control.onchange({target:control});await flush();};
 assert.equal(fixtures.format,'real-python-material-research-fixtures');
 assert.equal(fixtures.results.modes.modeGroups[1].classification.label,'T2g');
 assert.equal(fixtures.results.bands.compatibility.activeRows[0].dimensionSum,2);
 assert.equal(ui.researchCourseRoute('bands'),'#classroom/crystal?module=bands');
 assert.equal(classroomPathways.length,7,'Existing classroom pathways remain intact');
 for(const [slug,module,pathway]of [['phonon-modes','modes','structure-dynamics'],['band-connectivity','bands','crystal'],['phonon-thermo','thermo','observables']]){
  assert.ok(knownTool('compute/'+slug));
  const parsed=parseClassroomRoute('compute/'+slug+'?material=silicon');
  assert.equal(parsed.module,module);assert.equal(parsed.pathway,pathway);assert.equal(parsed.calculationOnly,true);
  assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed);
  assert.equal(parseClassroomRoute('compute/'+slug+'?module=wrong&tab=derive').module,module);
  const course=parseClassroomRoute(ui.researchCourseRoute(module,'tab=derive&material=gaas'));
  assert.equal(course.section,'material-research');assert.equal(course.module,module);assert.equal(course.material,'gaas');
  assert.deepEqual(parseClassroomRoute(buildClassroomHash(course)),course);
 }
 assert.match(ui.multiCurveSVG([{label:'<script>',points:[[0,0],[1,1],[2,NaN]]}]),/&lt;script&gt;/);
 assert.doesNotMatch(ui.multiCurveSVG([{label:'zero',points:[[0,0],[0,0]]}]),/NaN|Infinity/);
 assert.match(ui.multiCurveSVG([{label:'missing',points:[[0,null]]}]),/没有这个物理量/);
 const smallChange=[{label:'V(T)',points:[[0,40],[300,40.01]]}];
 const defaultChart=ui.multiCurveSVG(smallChange),expandedChart=ui.multiCurveSVG(smallChange,{includeZero:false});
 const plottedPoints=svg=>svg.match(/<polyline points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
 assert.equal(defaultChart,ui.multiCurveSVG(smallChange,{includeZero:true}),'The default retains a zero-inclusive scale');
 const defaultPoints=plottedPoints(defaultChart),expandedPoints=plottedPoints(expandedChart);
 assert.ok(Math.abs(defaultPoints[0][1]-defaultPoints[1][1])<1,'The original zero-inclusive scale is unchanged');
 assert.ok(Math.abs(expandedPoints[0][1]-expandedPoints[1][1])>150,'Data-range scaling makes small volume changes visible');
 assert.ok(expandedPoints.every(p=>p[1]>45&&p[1]<255),'Data-range scaling retains vertical padding');
 for(const points of [[[300,40]],[[0,40],[300,40]],[[0,0],[300,0]],[[0,-40],[300,-39.99]],[[0,null],[1,undefined],[2,NaN]]]){
  assert.doesNotMatch(ui.multiCurveSVG([{label:'bounded',points}],{includeZero:false}),/NaN|Infinity|undefined/);
 }
 const single=ui.multiCurveSVG([{label:'single',points:[[300,40]]}],{includeZero:false});
 assert.match(single,/<circle cx="365" cy="150" r="4"/,'A single valid point is visibly centered rather than an invisible polyline');
 assert.match(ui.multiCurveSVG([{label:'empty',points:[null,[],[0,null]]}],{includeZero:false}),/没有这个物理量/);

 const modes=await mount({calculationOnly:true,module:'modes'});await submit(modes);
 assert.equal(ui.getMaterialResearchResult().tool,'phonon_modes');
 assert.match(modes.$('#mr-result').innerHTML,/T2g/);
 assert.ok(modes.$('#mr-frozen-view').querySelector('svg'));
 assert.equal(modes.$('#mr-poscar').disabled,false);
 modes.$('#mr-poscar').onclick();modes.$('#mr-cif').onclick();modes.$('#mr-download').onclick();
 assert.equal(modes.downloads[0].body,fixtures.results.modes.exports.poscar);
 assert.match(modes.downloads[1].body,/_symmetry_Int_Tables_number 1/);
 assert.equal(JSON.parse(modes.downloads[2].body).input.selected_band,3);
 modes.$('#mr-record').onclick();assert.equal(notebook.latestCalculation().action,'phonon_modes');
 assert.equal(notebook.latestCalculation().input.selected_band,3);
 for(const yaw of [-180,0,180]){modes.$('#mr-yaw').oninput({target:{value:String(yaw)}});assert.doesNotMatch(modes.$('#mr-frozen-view').innerHTML,/NaN|Infinity/);}
 change(modes,'mr-phase',Math.PI/2);assert.equal(ui.getMaterialResearchResult(),null);assert.equal(modes.$('#mr-poscar'),null);
 await submit(modes);assert.ok(ui.getMaterialResearchResult().result.frozen.maxDisplacement<1e-12);
 assert.equal(ui.getMaterialResearchResult().input.phase,Math.PI/2);
 change(modes,'mr-phase',0);await submit(modes);await modes.$('[data-mr-mode="0"]').onclick();
 assert.equal(ui.getMaterialResearchResult().input.selected_band,0);
 assert.equal(modes.$('#mr-bi').value,'0');
 await select(modes,'mr-preset','gaas');assert.equal(ui.getMaterialResearchResult(),null);await submit(modes);
 assert.equal(ui.getMaterialResearchResult().result.symmetry.pointGroup,'-43m');
 await select(modes,'mr-preset','custom');
 assert.ok(modes.$('#mr-file-text'));
 await modes.$('#mr-file').onchange({target:{files:[{name:'<imported>.json',size:123,text:async()=>'{"custom":true}'}]}});
 assert.equal(modes.$('#mr-file-text').value,'{"custom":true}');
 await submit(modes);assert.equal(ui.getMaterialResearchResult().input.filename,'<imported>.json');
 await select(modes,'mr-preset','silicon');await submit(modes);
 for(const key of ['content','filename','structure_content','data'])assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,key),false,'Built-in mode clears imported '+key);
 change(modes,'mr-supercell','{broken');await submit(modes);assert.equal(ui.getMaterialResearchResult(),null);assert.match(modes.$('#mr-result').innerHTML,/role="alert"/);

 ui.setMaterialResearchInput('modes',fixtures.requests.modesFiniteQ.input);
 const finite=await mount({calculationOnly:true,module:'modes'});await submit(finite);
 assert.equal(ui.getMaterialResearchResult().result.frozen.atoms.length,4);
 assert.equal(ui.getMaterialResearchResult().input.preset,'custom');
 assert.match(finite.$('#mr-result').innerHTML,/非 Γ 点/);
 const replacement=JSON.stringify(fixtures.requests.modesUnknownUnit.input.data);
 await finite.$('#mr-file').onchange({target:{files:[{name:'replacement.json',size:replacement.length,text:async()=>replacement}]}});
 await submit(finite);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'data'),false,'Uploaded text supersedes a prior hidden handoff data object');
 assert.equal(ui.getMaterialResearchResult().input.content,replacement);
 ui.setMaterialResearchInput('modes',fixtures.requests.modesUnknownUnit.input);
 const unknown=await mount({calculationOnly:true,module:'modes'});await submit(unknown);
 assert.equal(unknown.$('#mr-poscar').disabled,true);assert.equal(unknown.$('#mr-cif').disabled,true);
 ui.setMaterialResearchInput('modes',fixtures.requests.modesBohr.input);
 const bohr=await mount({calculationOnly:true,module:'modes'});
 assert.equal(bohr.$('#mr-length').value,'auto');await submit(bohr);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'length_unit'),false,'Automatic length units must preserve input metadata');
 assert.equal(ui.getMaterialResearchResult().result.frozen.lengthUnit,'bohr');
 ui.setMaterialResearchInput('modes',fixtures.requests.modesCharacters.input);
 const characters=await mount({calculationOnly:true,module:'modes'});await submit(characters);
 assert.equal(ui.getMaterialResearchResult().result.modeGroups[0].classification.status,'characters-only');
 assert.match(characters.$('#mr-result').innerHTML,/THz/);
 assert.ok(characters.$('#mr-result').querySelectorAll('tbody').some(body=>body.querySelectorAll('tr').length===8),'Uncovered mmm labels must still display all eight operation characters');

 const bands=await mount({calculationOnly:true,module:'bands'});await submit(bands);
 assert.equal(ui.getMaterialResearchResult().result.summary.mirrorActive,true);
 assert.match(bands.$('#mr-result').innerHTML,/C2v → Cs/);
 assert.doesNotMatch(bands.$('#mr-result').innerHTML,/<th><\/th>/);
 assert.equal((bands.$('#mr-band-plot').innerHTML.match(/<polyline/g)||[]).length,2);
 const start=bands.$('#mr-band-point').innerHTML;
 bands.$('#mr-k-cursor').oninput({target:{value:'30'}});
 assert.notEqual(bands.$('#mr-band-point').innerHTML,start);
 assert.match(bands.$('#mr-band-point').innerHTML,/A&#39;/);
 const expectedEnergy=Number(fixtures.results.bands.bands[0].energies[30].toPrecision(6));
 assert.ok(bands.$('#mr-band-point').innerHTML.includes(String(expectedEnergy)));
 change(bands,'mr-mixing',.2);await submit(bands);
 assert.equal(ui.getMaterialResearchResult().result.summary.perturbationGap,.4);
 assert.match(bands.$('#mr-result').innerHTML,/虚线仅作母相参考/);
 assert.match(bands.$('#mr-band-point').innerHTML,/混合态/);
 await select(bands,'mr-model','rashba');await submit(bands);
 assert.equal(ui.getMaterialResearchResult().result.model,'rashba');
 assert.match(bands.$('#mr-band-point').innerHTML,/i ×/);
 assert.match(bands.$('#mr-result').innerHTML,/double C2v → double Cs/);
 change(bands,'mr-zeeman',.2);await submit(bands);
 assert.equal(ui.getMaterialResearchResult().result.summary.timeReversal,false);
 assert.equal(bands.$('#mr-samples').attributes.min,'21');
 assert.equal(bands.$('#mr-samples').attributes.max,'501');

 const thermo=await mount({calculationOnly:true,module:'thermo'});await submit(thermo);
 assert.equal(ui.getMaterialResearchResult().result.series.length,2);
 assert.equal((thermo.$('#mr-thermal-plot').innerHTML.match(/<polyline/g)||[]).length,2);
 assert.match(thermo.$('#mr-result').innerHTML,/模型原胞/);
 thermo.$('#mr-temperature').oninput({target:{value:'5'}});
 assert.match(thermo.$('#mr-temperature-values').innerHTML,/T = 100 K/);
 await select(thermo,'mr-quantity','freeEnergy');
 assert.match(thermo.$('#mr-thermal-plot').innerHTML,/kJ\/mol/);
 assert.match(thermo.$('#mr-thermal-plot').innerHTML,/F \/ /);
 await select(thermo,'mr-source','mesh');assert.equal(ui.getMaterialResearchResult(),null);
 assert.equal(thermo.$('#mr-natom'),null,'Mesh atom count is defined by the imported file');
 await thermo.$('#mr-demo').onclick();assert.match(thermo.$('#mr-file-text').value,/weight: 6/);
 await submit(thermo);assert.equal(ui.getMaterialResearchResult().result.source,'mesh');
 assert.equal(ui.getMaterialResearchResult().result.summary.natom,1);
 assert.equal(ui.getMaterialResearchResult().input.filename,'thermo-mesh-demo.yaml');
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'natom'),false);
 assert.match(thermo.$('#mr-result').innerHTML,/输入计算胞/);
 await select(thermo,'mr-source','thermal');await thermo.$('#mr-demo').onclick();await submit(thermo);
 assert.equal(thermo.$('#mr-natom'),null);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'natom'),false);
 assert.equal(ui.getMaterialResearchResult().result.source,'thermal');
 thermo.$('#mr-temperature').oninput({target:{value:'3'}});
 assert.match(thermo.$('#mr-temperature-values').innerHTML,/T = 300 K/);
 await select(thermo,'mr-source','compare');await submit(thermo);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'content'),false);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'filename'),false);
 await select(thermo,'mr-source','dos');thermo.$('#mr-file-text').value=fixtures.requests.thermoDOS.input.dos_content;thermo.$('#mr-dos-complete').checked=true;await submit(thermo);
 assert.equal(ui.getMaterialResearchResult().input.dos_complete,true);
 assert.equal(ui.getMaterialResearchResult().input.dos_content,fixtures.requests.thermoDOS.input.dos_content);
 assert.equal(Object.hasOwn(ui.getMaterialResearchResult().input,'content'),false);

 let finish;const stale=await mount({calculationOnly:true,module:'bands'},()=>new Promise(resolve=>finish=resolve));
 stale.$('#mr-form').onsubmit({preventDefault(){}});assert.equal(stale.$('#mr-form').querySelector('button[type="submit"]').disabled,true);
 change(stale,'mr-mixing',.2);finish(fixtures.results.bands);await flush();assert.equal(ui.getMaterialResearchResult(),null);
 const detached=await mount({calculationOnly:true,module:'bands'},()=>new Promise(resolve=>finish=resolve));
 detached.$('#mr-form').onsubmit({preventDefault(){}});detached.container.innerHTML='<p>another route</p>';finish(fixtures.results.bands);await flush();assert.equal(ui.getMaterialResearchResult(),null);
 const failure=await mount({calculationOnly:true,module:'bands'},async()=>{throw Error('<img src=x onerror=alert(1)>');});await submit(failure);
 assert.match(failure.$('#mr-result').innerHTML,/&lt;img/);assert.equal(failure.$('#mr-result').querySelector('img'),null);assert.equal(ui.getMaterialResearchResult(),null);
 let cancelReject;const cancel=await mount({calculationOnly:true,module:'thermo'},()=>new Promise((_,reject)=>cancelReject=reject));
 cancel.$('#mr-form').onsubmit({preventDefault(){}});cancel.$('#mr-cancel').onclick();assert.equal(cancel.cancelled.length,1);cancelReject(Error('cancelled'));await flush();assert.equal(ui.getMaterialResearchResult(),null);
 const staleFile=await mount({calculationOnly:true,module:'thermo'});await select(staleFile,'mr-source','mesh');
 let resolveFile;const pendingFile=staleFile.$('#mr-file').onchange({target:{files:[{name:'old-mesh.yaml',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});
 await select(staleFile,'mr-source','thermal');const priorContent=staleFile.$('#mr-file-text').value;
 resolveFile('OLD MESH DATA');await pendingFile;
 assert.equal(staleFile.$('#mr-file-text').value,priorContent,'Slow old-source file reads must not replace the current source');
 const editFile=await mount({calculationOnly:true,module:'thermo'});await select(editFile,'mr-source','mesh');
 const pendingEditFile=editFile.$('#mr-file').onchange({target:{files:[{name:'older.yaml',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});
 change(editFile,'mr-file-text','new user content');resolveFile('STALE FILE');await pendingEditFile;
 assert.equal(editFile.$('#mr-file-text').value,'new user content','Typing while a file is loading wins over the earlier read');
 const staleDemo=await mount({module:'thermo',tab:'lab'});await select(staleDemo,'mr-source','mesh');
 const savedFetch=globalThis.fetch;let resolveDemo;
 globalThis.fetch=()=>new Promise(resolve=>resolveDemo=resolve);
 const pendingDemo=staleDemo.$('#mr-demo').onclick();staleDemo.$('[data-mr-tab="learn"]').onclick();
 resolveDemo({ok:true,text:async()=>fixtures.requests.thermoMesh.input.content});await pendingDemo;globalThis.fetch=savedFetch;
 staleDemo.$('[data-mr-tab="lab"]').onclick();
 assert.equal(staleDemo.$('#mr-file-text').value,'','A demo requested on an old tab does not repopulate the lab later');

 const exercise=data.exercises.find(x=>x.lesson==='band-restriction'),practice=await mount({module:'bands',tab:'derive',exercise:exercise.id});
 let step=practice.$('#mr-steps').children[0];step.querySelector(`[data-mr-answer="${(exercise.steps[0].answer+1)%exercise.steps[0].choices.length}"]`).onclick();
 assert.equal(practice.$('#mr-steps').children.length,1);assert.match(step.querySelector('.obs-feedback').textContent,/再想/);
 for(let i=0;i<exercise.steps.length;i++){step=practice.$('#mr-steps').children[i];step.querySelector(`[data-mr-answer="${exercise.steps[i].answer}"]`).onclick();}
 assert.equal(JSON.parse(storage.get('symmetry-lab.material-research.progress.v1'))[exercise.id],true);
 assert.match((await mount({module:'bands',tab:'derive',exercise:exercise.id})).$('#mr-content').innerHTML,/✓/);
 const lesson=await mount({module:'bands',lesson:'band-spin'});lesson.$('#mr-to-lab').onclick();assert.equal(lesson.$('#mr-model').value,'rashba');await submit(lesson);
 assert.equal(ui.getMaterialResearchResult().result.model,'rashba');
 const atlas=await mount({atlasOnly:true,material:'gaas'});assert.ok(atlas.$('.obs-case-grid'));assert.equal(atlas.$('[data-mr-tab]'),null);assert.match(atlas.$('#mr-content').innerHTML,/#atlas\/notebook/);
 assert.ok(calls.some(x=>x.action==='phonon_modes')&&calls.some(x=>x.action==='band_connectivity')&&calls.some(x=>x.action==='phonon_thermo'));
 console.log('Material research UI: real Python fixtures, frozen structures and exports, character branches, Rashba labels, temperature/k-point controls, imported-source transitions, stale result guards and persisted stepwise exercises passed.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runUITests();
