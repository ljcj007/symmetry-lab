import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/coupled-materials.json',import.meta.url),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/coupled-materials/contracts.json',import.meta.url),'utf8'));
const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
globalThis.document={createElement:tag=>new Element(tag)};
const animationQueue=[];globalThis.requestAnimationFrame=callback=>{animationQueue.push(callback);return animationQueue.length;};
globalThis.fetch=async url=>({ok:true,json:async()=>structuredClone(data),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});
const ui=await import('../dist/coupled-materials-ui.js');
const notebook=await import('../dist/material-notebook.js?v=20261029-math2');
const {parseClassroomRoute,buildClassroomHash,classroomPathways}=await import('../dist/classroom-ui.js');
const {knownTool}=await import('../dist/navigation-ui.js');
const calls=[];
const calculate=async(action,input)=>{
 calls.push({action,input:structuredClone(input)});let key;
 if(action==='distortion_lab')key=input.landau?.c < -2?'distortionUnbounded':input.preset==='srtio3'?'distortionSr':input.amplitudes?.every(x=>x===0)?'distortionRebuilt':input.preset==='custom'?'distortionCustom':'distortion';
 else if(action==='magnon_lab')key=input.model==='afm'?(Math.abs(input.field)>=2?'magnonsUnstable':input.anisotropy===1&&input.q===0?'magnonsSoft':input.branch===1?'magnonsAFMBranch':'magnonsAFM'):'magnons';
 else if(action==='qha_lab')key=input.source==='matrix'?'qhaMatrix':input.source==='thermal'?'qhaThermal':input.pressure>=100?'qhaBoundary':'qha';
 else throw Error('Unexpected action '+action);
 return structuredClone(fixtures.results[key]);
};
const mount=async(selection={},run=calculate)=>{const container=new Container(),downloads=[],navigations=[],locations=[],cancelled=[];await ui.renderCoupledMaterialsView({container,selection,run,download:(body,name,type)=>downloads.push({body,name,type}),cancelRun:()=>cancelled.push(true),onNavigate:r=>navigations.push(r),onLocation:r=>locations.push(r)});return {container,downloads,navigations,locations,cancelled,$:selector=>container.querySelector(selector)};};
const submit=async view=>{view.$('#cm-form').onsubmit({preventDefault(){}});await flush();};
const change=(view,id,value)=>{const control=view.$('#'+id);assert.ok(control,'Missing control '+id);control.value=String(value);view.$('#cm-form').oninput({target:control});};
const select=async(view,id,value)=>{const control=view.$('#'+id);control.value=String(value);if(control.onchange)control.onchange({target:control});else view.$('#cm-form').oninput({target:control});await flush();};
const get=()=>ui.getCoupledMaterialsResult();
assert.equal(fixtures.format,'real-python-coupled-materials-fixtures');
assert.equal(fixtures.results.distortion.parent.natom,5);
assert.equal(fixtures.results.distortionSr.parent.natom,40);
assert.equal(classroomPathways.length,7,'The seven existing classroom pathways must remain');
for(const module of data.modules){
 assert.ok(knownTool('compute/'+module.route));
 assert.equal(ui.coupledCourseRoute(module.id),'#classroom/'+module.pathway+'?module='+module.id);
 const parsed=parseClassroomRoute('compute/'+module.route+'?material=batio3');
 assert.equal(parsed.section,'coupled-materials');assert.equal(parsed.module,module.id);assert.equal(parsed.pathway,module.pathway);assert.equal(parsed.calculationOnly,true);
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(parsed)),parsed);
 const overridden=parseClassroomRoute('compute/'+module.route+'?module=thermo&tab=derive');
 assert.equal(overridden.module,module.id);assert.equal(overridden.tab,'lab');
 const course=parseClassroomRoute(ui.coupledCourseRoute(module.id,'tab=derive&material=srtio3'));
 assert.equal(course.module,module.id);assert.equal(course.material,'srtio3');assert.deepEqual(parseClassroomRoute(buildClassroomHash(course)),course);
}
for(const slug of ['phase','diffraction','phonopy','phonons','tensors'])assert.equal(parseClassroomRoute('compute/'+slug+'?module=magnons').module,undefined);
assert.doesNotMatch(ui.landauSVG(fixtures.results.distortion.landau),/NaN|Infinity/);
assert.match(ui.landauSVG(fixtures.results.distortion.landau),/全局极小/);
assert.doesNotMatch(ui.spinWaveSVG(fixtures.results.magnons.animation,0,1),/NaN|Infinity/);
assert.match(ui.spinWaveSVG({available:false,reason:'<script>x</script>'}),/&lt;script&gt;/);

const distortion=await mount({calculationOnly:true,module:'distortion'});await submit(distortion);
assert.equal(get().tool,'distortion_lab');assert.match(distortion.$('#cm-result').innerHTML,/0.22/);
assert.ok(distortion.$('#cm-structure').querySelector('svg'));
distortion.$('#cm-poscar').onclick();distortion.$('#cm-cif').onclick();distortion.$('#cm-download').onclick();
assert.equal(distortion.downloads[0].body,fixtures.results.distortion.reconstruction.exports.poscar);
assert.equal(distortion.downloads[1].body,fixtures.results.distortion.reconstruction.exports.cif);
assert.equal(JSON.parse(distortion.downloads[2].body).input.preset,'batio3');
distortion.$('#cm-record').onclick();assert.equal(notebook.latestCalculation().action,'distortion_lab');
for(const angle of [-180,0,180]){const slider=distortion.$('#cm-yaw');slider.value=String(angle);slider.oninput({target:slider});assert.doesNotMatch(distortion.$('#cm-structure').innerHTML,/NaN|Infinity/);}
change(distortion,'cm-amplitudes','[0,0]');assert.equal(get(),null);assert.equal(distortion.$('#cm-poscar'),null);await submit(distortion);
assert.deepEqual(get().input.amplitudes,[0,0]);assert.deepEqual(get().result.reconstruction.amplitudes,[0,0]);
const mode=distortion.$('#cm-mode-0');mode.value='.1';mode.onchange({target:mode});await flush();assert.deepEqual(get().input.amplitudes,[.1,0]);
await select(distortion,'cm-preset','srtio3');await submit(distortion);assert.equal(get().result.parent.natom,40);assert.equal(get().input.amplitudes,undefined);
await select(distortion,'cm-preset','custom');distortion.$('#cm-demo').onclick();await flush();assert.match(distortion.$('#cm-json').value,/"parent"/);await submit(distortion);
assert.equal(get().input.preset,'custom');assert.ok(get().input.parent&&get().input.distorted);assert.equal(get().input.content,undefined);
change(distortion,'cm-json',JSON.stringify({...fixtures.requests.distortionCustom.input,amplitudes:[.8,.9]}));change(distortion,'cm-amplitudes','');await submit(distortion);assert.equal(get().input.amplitudes,undefined,'A blank reconstruction field uses projected amplitudes even when the imported JSON had old amplitudes');
change(distortion,'cm-json','<malformed>');await submit(distortion);assert.equal(get(),null);assert.match(distortion.$('#cm-result').innerHTML,/role="alert"/);
await select(distortion,'cm-preset','batio3');await submit(distortion);for(const key of ['parent','distorted','modes','data','content'])assert.equal(Object.hasOwn(get().input,key),false,'Built-in source clears '+key);
change(distortion,'cm-c',-3);await submit(distortion);assert.equal(get().result.landau.boundedness.boundedBelow,false);assert.match(distortion.$('#cm-result').innerHTML,/无下界/);

ui.setCoupledMaterialsInput('distortion',fixtures.requests.distortionCustom.input);
const handed=await mount({calculationOnly:true,module:'distortion'});await submit(handed);
assert.equal(get()?.input.preset,'custom','Direct object handoff is editable and calculable');assert.ok(handed.$('#cm-json').value.includes('parent'));
assert.equal(get().input.landau.b1,1,'Partial handoff Landau parameters retain the other physical defaults');
await select(handed,'cm-preset','srtio3');await submit(handed);assert.equal(get().input.parent,undefined);assert.equal(get().input.modes,undefined);

const magnons=await mount({calculationOnly:true,module:'magnons'});await submit(magnons);
assert.equal(get().tool,'magnon_lab');assert.ok(magnons.$('#cm-spins').querySelector('svg'));
const first=magnons.$('#cm-spins').innerHTML,frame=magnons.$('#cm-frame');frame.value='5';frame.oninput({target:frame});assert.notEqual(magnons.$('#cm-spins').innerHTML,first);
const yaw=magnons.$('#cm-spin-yaw');yaw.value='90';yaw.oninput({target:yaw});assert.doesNotMatch(magnons.$('#cm-spins').innerHTML,/NaN|Infinity/);
magnons.$('#cm-play').onclick();assert.match(magnons.$('#cm-play').textContent,/暂停/);animationQueue.shift()(120);assert.ok(animationQueue.length);magnons.$('#cm-play').onclick();assert.match(magnons.$('#cm-play').textContent,/播放/);animationQueue.shift()(240);assert.equal(animationQueue.length,0);
change(magnons,'cm-q',.8);await select(magnons,'cm-model','afm');assert.equal(magnons.$('#cm-q').value,'0.5');assert.equal(magnons.$('#cm-q').attributes.max,'0.5');await submit(magnons);
assert.equal(get().result.bands.length,2);await select(magnons,'cm-branch',1);await submit(magnons);assert.equal(get().input.branch,1);assert.equal(get().result.selection.branch,1);
change(magnons,'cm-field',2);await submit(magnons);assert.equal(get().result.stability.energeticallyStable,false);assert.equal(magnons.$('#cm-play'),null);assert.equal(magnons.$('#cm-frame'),null);assert.match(magnons.$('#cm-spins').innerHTML,/关闭稳定进动/);
change(magnons,'cm-field',0);change(magnons,'cm-anisotropy',1);change(magnons,'cm-q',0);await submit(magnons);assert.equal(get().result.animation.available,false);assert.match(magnons.$('#cm-spins').innerHTML,/零频/);
await select(magnons,'cm-model','fm');await submit(magnons);assert.equal(get().input.branch,0);

const qha=await mount({calculationOnly:true,module:'qha'});await submit(qha);
assert.equal(get().tool,'qha_lab');assert.ok(qha.$('#cm-free-energy').querySelector('svg'));assert.match(qha.$('#cm-thermal-point').innerHTML,/温度端点缺少两侧数据/);
assert.doesNotMatch(qha.$('#cm-thermal-point').innerHTML,/endpoint-not-reported|interior-minimum|three-point-interior/);
const plotSpan=view=>{const coordinates=[...view.$('#cm-thermal-plot').innerHTML.matchAll(/<polyline points="([^"]+)"/g)].flatMap(x=>x[1].split(' ').map(p=>Number(p.split(',')[1])));return Math.max(...coordinates)-Math.min(...coordinates);};
assert.ok(plotSpan(qha)>150,'Small equilibrium volume variations should fill the plot rather than share a zero-origin axis');
await select(qha,'cm-quantity','bulkModulus');assert.ok(plotSpan(qha)>150,'Bulk modulus variations use their own vertical extent');
await select(qha,'cm-quantity','gibbsEnergy');assert.ok(plotSpan(qha)>150,'Gibbs free-energy curves do not force an arbitrary energy zero into view');
const temperature=qha.$('#cm-temperature');temperature.value='2';temperature.oninput({target:temperature});assert.match(qha.$('#cm-thermal-point').innerHTML,/T = 200 K/);
await select(qha,'cm-quantity','heatCapacity');assert.match(qha.$('#cm-thermal-plot').innerHTML,/mol输入胞/);assert.match(qha.$('#cm-thermal-plot').innerHTML,/Cp/);
change(qha,'cm-pressure',100);await submit(qha);assert.equal(get().result.summary.validCount,0);assert.match(qha.$('#cm-thermal-point').innerHTML,/空值/);assert.match(qha.$('#cm-thermal-plot').innerHTML,/没有这个物理量/);
change(qha,'cm-pressure',0);await select(qha,'cm-source','matrix');qha.$('#cm-demo').onclick();await flush();await submit(qha);assert.equal(get().input.source,'matrix');assert.ok(get().input.data.freeEnergy);
await select(qha,'cm-source','thermal');qha.$('#cm-demo').onclick();await flush();await submit(qha);assert.equal(get().input.source,'thermal');assert.ok(get().input.data.thermalFiles);
await select(qha,'cm-source','preset');await submit(qha);assert.equal(get().input.data,undefined);assert.equal(get().input.content,undefined);
ui.setCoupledMaterialsInput('qha',fixtures.requests.qhaMatrix.input);const imported=await mount({calculationOnly:true,module:'qha'});await submit(imported);assert.ok(get()?.input.data.freeEnergy,'QHA object handoff must reach the selected importer');
const segmented=await mount({calculationOnly:true,module:'qha'},async()=>{const value=structuredClone(fixtures.results.qha);value.rows[2].volume=null;return value;});await submit(segmented);
assert.equal((segmented.$('#cm-thermal-plot').innerHTML.match(/<polyline/g)||[]).length,2,'A missing equilibrium point must break the plotted curve');

let finish;const stale=await mount({calculationOnly:true,module:'magnons'},()=>new Promise(resolve=>finish=resolve));stale.$('#cm-form').onsubmit({preventDefault(){}});assert.equal(stale.$('#cm-form').querySelector('button[type="submit"]').disabled,true);change(stale,'cm-field',2);finish(fixtures.results.magnons);await flush();assert.equal(get(),null);
const detached=await mount({calculationOnly:true,module:'qha'},()=>new Promise(resolve=>finish=resolve));detached.$('#cm-form').onsubmit({preventDefault(){}});detached.container.innerHTML='<p>another route</p>';finish(fixtures.results.qha);await flush();assert.equal(get(),null);
const courseStale=await mount({module:'magnons',tab:'lab'},()=>new Promise(resolve=>finish=resolve));courseStale.$('#cm-form').onsubmit({preventDefault(){}});courseStale.$('[data-cm-tab="learn"]').onclick();finish(fixtures.results.magnons);await flush();assert.equal(get(),null);assert.ok(courseStale.$('#cm-to-lab'));
const cancel=await mount({calculationOnly:true,module:'magnons'},()=>new Promise(resolve=>finish=resolve));cancel.$('#cm-form').onsubmit({preventDefault(){}});cancel.$('#cm-cancel').onclick();assert.equal(cancel.cancelled.length,1);finish(fixtures.results.magnons);await flush();assert.equal(get(),null,'A late successful response after cancellation must be ignored');
const failure=await mount({calculationOnly:true,module:'qha'},async()=>{throw Error('<img src=x onerror=alert(1)>');});await submit(failure);assert.match(failure.$('#cm-result').innerHTML,/&lt;img/);assert.equal(failure.$('#cm-result').querySelector('img'),null);assert.equal(get(),null);

let resolveFile;const fileStale=await mount({calculationOnly:true,module:'qha'});await select(fileStale,'cm-source','matrix');fileStale.$('#cm-file').onchange({target:{files:[{name:'older.json',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});await select(fileStale,'cm-source','thermal');resolveFile(JSON.stringify(fixtures.requests.qhaMatrix.input.data));await flush();assert.equal(fileStale.$('#cm-json').value,'','An old source file must not populate the new source');
fileStale.$('#cm-file').onchange({target:{files:[{name:'older.json',size:100,text:()=>new Promise(resolve=>resolveFile=resolve)}]}});change(fileStale,'cm-json','{"newer":true}');resolveFile(JSON.stringify(fixtures.requests.qhaThermal.input.data));await flush();assert.equal(fileStale.$('#cm-json').value,'{"newer":true}','Typing while a file loads preserves the newer text');
const fileBig=await mount({calculationOnly:true,module:'distortion'});await select(fileBig,'cm-preset','custom');fileBig.$('#cm-file').onchange({target:{files:[{name:'large.json',size:9*1024*1024,text:async()=>{throw Error('Must not read oversized input');}}]}});await flush();assert.match(fileBig.$('#cm-result').textContent,/8 MiB/);

for(const exercise of data.exercises){
 const module=data.lessons.find(x=>x.id===exercise.lesson).module,practice=await mount({module,tab:'derive',exercise:exercise.id});
 let step=practice.$('#cm-steps').children[0];step.querySelector(`[data-cm-answer="${(exercise.steps[0].answer+1)%exercise.steps[0].choices.length}"]`).onclick();assert.equal(practice.$('#cm-steps').children.length,1);assert.match(step.querySelector('.obs-feedback').textContent,/再想/);
 for(let i=0;i<exercise.steps.length;i++){step=practice.$('#cm-steps').children[i];step.querySelector(`[data-cm-answer="${exercise.steps[i].answer}"]`).onclick();}
 assert.equal(JSON.parse(storage.get('symmetry-lab.coupled-materials.progress.v1'))[exercise.id],true);assert.match(practice.$('#cm-progress').textContent,/推导完成/);
}
assert.equal(Object.keys(notebook.progressSnapshot()['symmetry-lab.coupled-materials.progress.v1']).length,9,'New exercise progress belongs in the cross-site notebook backup');
const lesson=await mount({module:'magnons',lesson:'magnon-antiferromagnet'});lesson.$('#cm-to-lab').onclick();assert.equal(lesson.$('#cm-model').value,'afm');await submit(lesson);assert.equal(get().result.model,'afm');
const atlas=await mount({atlasOnly:true,material:'srtio3'});assert.ok(atlas.$('.obs-case-grid'));assert.equal(atlas.$('[data-cm-tab]'),null);assert.match(atlas.$('#cm-content').innerHTML,/#atlas\/notebook/);
const contextView=await mount({calculationOnly:true,module:'distortion',material:'srtio3',preset:'srtio3'});await submit(contextView);
const links=contextView.container.querySelectorAll('a').map(a=>a.getAttribute('href')?.replace(/&amp;/g,'&'));
const courseLink=links.find(h=>h?.startsWith('#classroom/structure-dynamics?module=distortion'));
assert.equal(new URLSearchParams(courseLink.split('?')[1]).get('material'),'srtio3');assert.equal(new URLSearchParams(courseLink.split('?')[1]).get('preset'),'srtio3');
const atlasLink=links.find(h=>h?.startsWith('#atlas/mechanisms?'));assert.equal(new URLSearchParams(atlasLink.split('?')[1]).get('module'),'distortion');assert.equal(new URLSearchParams(atlasLink.split('?')[1]).get('preset'),'srtio3');
contextView.$('#cm-record').onclick();const recorded=notebook.latestCalculation();assert.equal(recorded.material,'srtio3');assert.equal(new URLSearchParams(recorded.route.split('?')[1]).get('preset'),'srtio3');
const contextualCourse=await mount(parseClassroomRoute(courseLink));assert.equal(contextualCourse.$('#cm-lesson').value,'distortion-projection');contextualCourse.$('#cm-to-lab').onclick();assert.equal(contextualCourse.$('#cm-preset').value,'srtio3');

const parsedInput=await mount({calculationOnly:true,module:'qha'});await select(parsedInput,'cm-source','matrix');
for(const text of ['null','[]','{"data":[]}','{"data":null}','{"note":"'+'中'.repeat(3*1024*1024)+'"}']){const before=calls.length;change(parsedInput,'cm-json',text);await submit(parsedInput);assert.equal(calls.length,before,'Invalid or oversized pasted JSON never reaches Python');assert.match(parsedInput.$('#cm-result').innerHTML,/必须为对象|最多 8 MiB/);}
const oversizedDistortion=await mount({calculationOnly:true,module:'distortion'});await select(oversizedDistortion,'cm-preset','custom');change(oversizedDistortion,'cm-json','{"note":"'+'a'.repeat(8*1024*1024)+'"}');const beforeOversize=calls.length;await submit(oversizedDistortion);assert.equal(calls.length,beforeOversize);assert.match(oversizedDistortion.$('#cm-result').innerHTML,/最多 8 MiB/);
ui.setCoupledMaterialsInput('magnons',{model:'fm',q:'0.25" onfocus="alert(1)'});const safeRange=await mount({calculationOnly:true,module:'magnons'});assert.equal(safeRange.$('#cm-q').getAttribute('onfocus'),null);assert.match(safeRange.$('#cm-q').getAttribute('value'),/&quot;/);
const escapedLabel=await mount({calculationOnly:true,module:'distortion'},async()=>{const value=structuredClone(fixtures.results.distortion);value.decomposition.modes[0].label='<img src=x onerror=alert(1)>';return value;});await submit(escapedLabel);assert.equal(escapedLabel.$('#cm-result').querySelector('img'),null);
const notesDefault=await mount({calculationOnly:true,module:'magnons'});await submit(notesDefault);assert.ok(notesDefault.$('.cm-model-notes'));assert.equal(notesDefault.$('.cm-model-notes').getAttribute('open'),null);
const visibleText=element=>{if(['details','pre'].includes(element.tag))return '';return (element.children?.length?element.children.map(visibleText).join(' '):element.textContent)||'';};
const diagnose=await mount({calculationOnly:true,module:'magnons'},async()=>structuredClone(fixtures.results.magnonsUnstable));await submit(diagnose);assert.match(visibleText(diagnose.$('#cm-result')),/不是全局经典基态/);assert.match(visibleText(diagnose.$('#cm-result')),/最低分支出现负值/);
const unbounded=await mount({calculationOnly:true,module:'distortion'},async()=>structuredClone(fixtures.results.distortionUnbounded));await submit(unbounded);assert.match(visibleText(unbounded.$('#cm-result')),/无下界/);
const invalidQha=await mount({calculationOnly:true,module:'qha'},async()=>structuredClone(fixtures.results.qhaBoundary));await submit(invalidQha);assert.match(visibleText(invalidQha.$('#cm-result')),/没有受采样区间|采样边界/);assert.doesNotMatch(visibleText(invalidQha.$('#cm-result')),/boundary-minimum|unavailable/);
const partialData=structuredClone(data);partialData.lessons.find(l=>l.id==='landau-coupling').lab.landau={a1:-1,b1:1,a2:-1,b2:1,c:1};
const savedFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(partialData)});
const partialUI=await import('../dist/coupled-materials-ui.js?partial-landau-test');
for(const tab of ['learn','lab']){const container=new Container();await partialUI.renderCoupledMaterialsView({container,selection:{module:'distortion',lesson:'landau-coupling',tab},run:calculate,download(){}});if(tab==='learn')container.querySelector('#cm-to-lab').onclick();for(const id of ['cm-range','cm-q1','cm-q2'])assert.ok(Number.isFinite(Number(container.querySelector('#'+id).value)),'Partial lesson preserves '+id);container.querySelector('#cm-form').onsubmit({preventDefault(){}});await flush();const value=partialUI.getCoupledMaterialsResult();assert.ok(value,'Partial Landau lesson must calculate from button and deep link');assert.equal(value.input.landau.c,1);assert.equal(value.input.landau.range,1.5);assert.equal(value.input.landau.q1,.4);assert.equal(value.input.landau.q2,.2);}
globalThis.fetch=savedFetch;
assert.ok(calls.some(x=>x.action==='distortion_lab')&&calls.some(x=>x.action==='magnon_lab')&&calls.some(x=>x.action==='qha_lab'));
console.log('Coupled materials UI: real Python fixtures, structure exports, Landau diagnostics, spin animation/stability, QHA imports and plot gaps, 36 exercise steps, notebook progress, source changes, cancellation and stale results passed.');
