import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element,flush} from './test-material-research-ui.mjs';
import {parseClassroomRoute} from '../dist/classroom-ui.js';
import {courseFlowRoute,courseFlowActions,bindCourseFlowActions,createCourseFlowDrafts} from '../dist/course-flow.js';

const saved=new Map();
globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};
globalThis.document={createElement:tag=>new Element(tag)};
const fetchFile=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')),text:async()=>fs.readFileSync(new URL('../dist/'+String(url).split('?')[0],import.meta.url),'utf8')});
globalThis.fetch=fetchFile;
let calculationCalls=0;
const noCalculation=async()=>{calculationCalls++;throw Error('Navigation must never run the calculation engine');};
const controls=page=>Object.fromEntries(['input','select','textarea'].flatMap(tag=>page.querySelectorAll(tag)).filter(el=>el.id&&el.type!=='file').map(el=>[el.id,el.value]));
// The adapter stores raw attributes; browsers decode escaped query separators.
const href=link=>link.getAttribute('href').replace(/&amp;/g,'&');
const families=[
 ['material-observables','observables','obs','observables','obs-learn-exercise','obs-learn-lab'],
 ['structure-dynamics','structure-dynamics','dyn','structure-dynamics','dyn-to-exercise','dyn-to-lab'],
 ['material-research','material-research','mr',null,'mr-to-derive','mr-to-lab'],
 ['coupled-materials','coupled-materials','cm',null,'cm-to-derive','cm-to-lab'],
 ['electronic-materials','electronic-materials','em',null,'em-to-derive','em-to-lab'],
 ['quantum-materials','quantum-materials','qm',null,'qm-to-derive','qm-to-lab'],
 ['response-materials','response-materials','rp',null,'rp-to-derive','rp-to-lab'],
 ['spectroscopy-materials','spectroscopy','spx',null,'spx-to-derive','spx-to-lab'],
 ...['pathways','bridges','principles','construction','connections','frontiers'].map(id=>[id+'-materials',id,'pw',null,'pw-to-derive','pw-to-lab'])
];
let checked=0,routeChecks=0,draftChecks=0,incompleteDraftChecks=0;
for(const [catalog,ui,prefix,basePath,deriveId,labId]of families){
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/'+catalog+'.json',import.meta.url),'utf8'));
 const namespace=await import('../dist/'+ui+'-ui.js'),render=namespace[Object.keys(namespace).find(key=>/^render.*View$/.test(key))];
 const mount=async selection=>{const page=new Container(),routes=[];await render({container:page,selection,run:noCalculation,onNavigate:route=>routes.push(route)});return {page,routes,$:selector=>page.querySelector(selector)};};
 for(const group of data.modules||[{id:basePath}]){
  const lessons=data.lessons.filter(lesson=>!data.modules||lesson.module===group.id);
  for(const lesson of lessons.slice(1)){
   const selection={...(data.modules?{module:group.id}:{}),lesson:lesson.id,tab:'learn'};
   const exercise=data.exercises.find(item=>item.lesson===lesson.id),view=await mount(selection),attribute=['obs','dyn'].includes(prefix)?'data-answer':'data-'+prefix+'-answer';
   const tab=name=>view.$('[data-'+prefix+'-tab="'+name+'"]');
   await view.$('#'+deriveId).onclick();
   assert.equal(view.$('#'+prefix+'-exercise').value,exercise.id,lesson.id+' opens its dedicated exercise');
   const first=view.page.querySelectorAll('.obs-exercise-step')[0],oldChoice=first.querySelectorAll('['+attribute+']').find(button=>Number(button.getAttribute(attribute))===exercise.steps[0].answer);
   oldChoice.onclick();
   assert.equal(view.page.querySelectorAll('.obs-exercise-step').length,2);
   const oldLab=view.$('#'+prefix+'-flow-lab'),oldLearn=view.$('#'+prefix+'-flow-learn'),oldSelect=view.$('#'+prefix+'-exercise');
   await oldLearn.onclick();
   assert.equal(view.$('#'+prefix+'-lesson').value,lesson.id,'Returning to explanation retains the lesson');
   const routeCount=view.routes.length,unchanged=view.page.firstElementChild.innerHTML;
   await oldLab.onclick();await oldLearn.onclick();oldChoice.onclick();oldSelect.onchange({target:{value:data.exercises[0].id}});
   assert.equal(view.routes.length,routeCount,'Detached lesson actions cannot navigate');
   assert.equal(view.page.firstElementChild.innerHTML,unchanged,'Detached controls cannot redraw the explanation');
   await view.$('#'+deriveId).onclick();
   assert.equal(view.page.querySelectorAll('.obs-exercise-step').length,2,'Answered intermediate steps survive the explanation round trip');
   assert.ok(view.page.querySelectorAll('.obs-exercise-step')[0].querySelectorAll('['+attribute+']').every(button=>button.disabled));
   const courseLink=view.page.querySelectorAll('a').find(link=>link.textContent.trim()==='回到本课讲解 →');
   if(data.modules){
    assert.ok(courseLink,lesson.id+' has an explicit current-lesson route');
    const parsed=parseClassroomRoute(href(courseLink));
    assert.equal(parsed.lesson,lesson.id);assert.equal(parsed.exercise,exercise.id);assert.equal(parsed.module,group.id);assert.equal(parsed.tab,'learn');
    const returned=await mount(parsed);assert.equal(returned.$('#'+prefix+'-lesson').value,lesson.id);routeChecks++;
    const beforeModifier=view.routes.length;courseLink.onclick({ctrlKey:true});assert.equal(view.routes.length,beforeModifier,'Modified clicks retain native new-tab behavior');
    let prevented=0;await courseLink.onclick({preventDefault(){prevented++;},stopPropagation(){}});
    assert.equal(prevented,1);assert.equal(view.$('#'+prefix+'-lesson').value,lesson.id);
    await view.$('#'+deriveId).onclick();assert.equal(view.page.querySelectorAll('.obs-exercise-step').length,2,'The explicit in-page return link also retains intermediate steps');
   }else{
    const materialRoute=view.page.querySelectorAll('a').find(link=>link.textContent.trim()==='浏览材料学习路线 →');
    assert.ok(materialRoute,'Material browsing keeps its separate meaning');
    assert.ok(new URLSearchParams(href(materialRoute).split('?')[1]).get('material'));
   }
   await view.$('#'+prefix+'-flow-lab').onclick();
   assert.equal(view.routes.at(-1).lesson,lesson.id);assert.equal(view.routes.at(-1).exercise,exercise.id);
   assert.equal(view.routes.at(-1).tab,'lab');
   const reference=await mount(exercise.labPreset?{...selection,tab:'lab',preset:exercise.labPreset}:selection);
   if(!exercise.labPreset)await reference.$('#'+labId).onclick();
   assert.deepEqual(controls(view.page),controls(reference.page),lesson.id+' initializes the registered exercise conditions or its existing lesson experiment');
   const targetPreset=exercise.labPreset||lesson.preset;
   if(targetPreset)assert.equal(view.$('#'+prefix+'-preset').value,targetPreset,'The registered exercise/lesson preset is selected, not the first preset');
   if(exercise.labPreset){assert.equal(exercise.id,'resonance-intensity-steps');assert.equal(Number(view.$('#spx-spin').value),.5);assert.equal(Number(view.$('#spx-zeroFieldD').value),0);assert.equal(Number(view.$('#spx-zeroFieldE').value),0);}
   const form=view.$('#'+prefix+'-form'),field=form.querySelectorAll('input').find(input=>['number','range'].includes(input.type)&&input.value!==''&&Number.isFinite(Number(input.value)))||form.querySelector('textarea')||form.querySelectorAll('select').find(select=>select.id!==prefix+'-preset'&&select.querySelectorAll('option').length>1);
   assert.ok(field,lesson.id+' has an editable parameter or JSON input');
   if(['number','range'].includes(field.type)){
    const oldValue=Number(field.value),step=Number(field.getAttribute('step'))||.125,max=Number(field.getAttribute('max'));
    let value=oldValue+step;if(field.getAttribute('max')!==null&&value>max)value=oldValue-step;field.value=String(value);
   }else if(field.tag==='select')field.value=field.querySelectorAll('option').find(option=>option.value!==field.value).value;
   else field.value+='\n ';
   form.oninput?.({target:field});const fieldId=field.id,custom=field.value;
   await tab('learn').onclick();assert.equal(view.$('#'+prefix+'-lesson').value,lesson.id);await tab('lab').onclick();
   assert.equal(view.$('#'+fieldId).value,custom,'Ordinary tabs preserve custom parameter text');
   const currentForm=view.$('#'+prefix+'-form'),blank=currentForm.querySelectorAll('input').find(input=>input.type==='number')||currentForm.querySelector('textarea');
   if(blank){
    const incomplete=blank.type==='number'?'':'{ incomplete JSON',incompleteId=blank.id;
    blank.value=incomplete;currentForm.oninput?.({target:blank});
    await tab('learn').onclick();await tab('lab').onclick();
    assert.equal(view.$('#'+incompleteId).value,incomplete,'Incomplete input remains editable after an ordinary tab round trip');incompleteDraftChecks++;
   }
   draftChecks++;
   const staleTab=tab('learn');view.page.innerHTML='<p>Left the classroom</p>';const exited=view.page.innerHTML;
   staleTab.onclick();assert.equal(view.page.innerHTML,exited,'Detached ordinary tabs cannot resurrect a classroom');
   checked++;
  }
 }
}
assert.equal(checked,93);assert.equal(routeChecks,79);assert.equal(draftChecks,93);
assert.ok(incompleteDraftChecks>=80,'Incomplete text is exercised wherever the form provides a free-text or numeric control');

// Restoring an ordinary tab draft is a one-shot operation. A later scientific
// update or imported input must not be overwritten by that consumed draft.
const drafts=createCourseFlowDrafts(),draftSource=new Container(),draftTarget=new Container();
draftSource.innerHTML='<form id="draft-source"><input id="draft-preset" value="silicon"></form>';
draftTarget.innerHTML='<form id="draft-target"><input id="draft-preset" value="gaas"></form>';
drafts.remember(draftSource.querySelector('#draft-source'),'phonons');drafts.restore(draftTarget.querySelector('#draft-target'),'phonons');
assert.equal(draftTarget.querySelector('#draft-preset').value,'silicon');
draftTarget.querySelector('#draft-preset').value='custom';drafts.restore(draftTarget.querySelector('#draft-target'),'phonons');
assert.equal(draftTarget.querySelector('#draft-preset').value,'custom','A consumed draft cannot overwrite a subsequent scientific update');

// Explicit material changes initialize a new case and supersede an older draft;
// merely switching course tabs continues to preserve the edited case input.
const materialObservables=await import('../dist/observables-ui.js'),materialPage=new Container();
await materialObservables.renderObservablesView({container:materialPage,selection:{material:'silicon',tab:'lab'},run:noCalculation});
materialPage.querySelector('[data-obs-tab="learn"]').onclick();
materialPage.querySelector('#obs-material').onchange({target:{value:'gaas'}});
materialPage.querySelector('[data-obs-tab="lab"]').onclick();
assert.equal(materialPage.querySelector('#obs-preset').value,'gaas','An explicit GaAs case selection supersedes the saved Si controls');
const materialDynamics=await import('../dist/structure-dynamics-ui.js'),diffractionPage=new Container();
await materialDynamics.renderStructureDynamicsView({container:diffractionPage,selection:{material:'silicon',experiment:'diffraction',tab:'lab'},run:noCalculation});
diffractionPage.querySelector('#dyn-hkl').value='[3,1,1]';diffractionPage.querySelector('#dyn-form').oninput({target:diffractionPage.querySelector('#dyn-hkl')});
diffractionPage.querySelector('[data-dyn-tab="learn"]').onclick();
diffractionPage.querySelector('#dyn-material').onchange({target:{value:'gaas'}});
diffractionPage.querySelector('[data-dyn-tab="lab"]').onclick();
assert.equal(diffractionPage.querySelector('#dyn-preset').value,'gaas');
assert.equal(diffractionPage.querySelector('#dyn-hkl').value,'[2,0,0]','A material initializer also supersedes the old reflection draft');

// Choice-specific remediation is independent of the original exercise progress.
const tensorData=JSON.parse(fs.readFileSync(new URL('../dist/data/material-observables.json',import.meta.url),'utf8'));
const tensorExercise=tensorData.exercises.find(exercise=>exercise.id==='tensor-constraints'),tensorStep=tensorExercise.steps[0];
const observables=await import('../dist/observables-ui.js'),tensorPage=new Container();
await observables.renderObservablesView({container:tensorPage,selection:{lesson:'neumann',tab:'derive'},run:noCalculation});
const tensorFirst=tensorPage.querySelectorAll('.obs-exercise-step')[0];
tensorFirst.querySelectorAll('[data-answer]').find(button=>Number(button.getAttribute('data-answer'))===0).onclick();
const feedback=tensorPage.querySelector('.learning-feedback'),remediation=tensorStep.feedback[0].remediation;
assert.ok(feedback&&remediation,'The first tensor misconception exposes its own repair check');
const repairChoice=feedback.querySelectorAll('[data-feedback-choice]').find(input=>Number(input.dataset.feedbackChoice)===remediation.answer);
repairChoice.onchange();feedback.querySelector('[data-feedback-check]').onclick();
assert.equal(tensorPage.querySelectorAll('.obs-exercise-step').length,1,'A correct repair check never advances the original question');
tensorFirst.querySelectorAll('[data-answer]').find(button=>Number(button.getAttribute('data-answer'))===tensorStep.answer).onclick();
assert.equal(tensorPage.querySelectorAll('.obs-exercise-step').length,2,'Only the original correct answer advances the exercise');

// Route context is encoded, and only recognized continuation fields are merged.
const route=courseFlowRoute('#classroom/spin?module=resonance&preset=old&group=3',{lesson:'a b',exercise:'e&1',material:'Si',preset:'new',ignored:'x'}),params=new URLSearchParams(route.split('?')[1]);
assert.equal(params.get('lesson'),'a b');assert.equal(params.get('exercise'),'e&1');assert.equal(params.get('module'),'resonance');assert.equal(params.get('group'),'3');assert.equal(params.get('preset'),'new');assert.equal(params.has('ignored'),false);
assert.throws(()=>courseFlowRoute('https://example.org/'),/Invalid/);

// A failed preset does not fall back to the first one; stale async failures do not
// overwrite a new panel. These are action guards, not simulated calculations.
const host=new Container();host.innerHTML=courseFlowActions('guard');let calls=0;
bindCourseFlowActions({root:host.firstElementChild,prefix:'guard',isCurrent:()=>true,onLearn:()=>{},onLab:()=>{calls++;throw Error('<invalid preset>');}});
await host.querySelector('#guard-flow-lab').onclick();assert.equal(calls,1);assert.equal(host.querySelector('#guard-flow-status').textContent,'<invalid preset>');assert.doesNotMatch(host.querySelector('#guard-flow-status').innerHTML,/<invalid preset>/);
let rejectAction;bindCourseFlowActions({root:host.firstElementChild,prefix:'guard',isCurrent:()=>true,onLearn:()=>{},onLab:()=>new Promise((_,reject)=>{rejectAction=reject;})});
const pending=host.querySelector('#guard-flow-lab').onclick();host.innerHTML='<p>New content</p>';rejectAction(Error('late failure'));await pending;assert.equal(host.innerHTML,'<p>New content</p>');

// Missing real metadata is reported in place, with no default-preset substitution.
const responseData=JSON.parse(fs.readFileSync(new URL('../dist/data/response-materials.json',import.meta.url),'utf8'));
responseData.lessons.find(lesson=>lesson.id==='hall-entropy').preset='missing-lesson-preset';
globalThis.fetch=async()=>({ok:true,json:async()=>responseData});
const missing=await import('../dist/response-materials-ui.js?course-flow-missing'),missingPage=new Container();
await missing.renderResponseMaterialsView({container:missingPage,selection:{module:'hall',lesson:'hall-entropy',tab:'derive'},run:noCalculation});
await missingPage.querySelector('#rp-flow-lab').onclick();assert.ok(missingPage.querySelector('#rp-exercise'));assert.equal(missingPage.querySelector('#rp-form'),null);assert.match(missingPage.querySelector('#rp-flow-status').textContent,/本课预设暂不可用/);

// The Phonopy lesson action may load its existing example, but leaving the lab
// before that file arrives must invalidate the pending transfer.
globalThis.fetch=fetchFile;
const dynamics=await import('../dist/structure-dynamics-ui.js?course-flow-example-race'),dynamicsPage=new Container();
await dynamics.renderStructureDynamicsView({container:dynamicsPage,selection:{lesson:'soft-modes',tab:'derive'},run:noCalculation});
let resolveExample;globalThis.fetch=url=>String(url).includes('phonopy-demo.yaml')?new Promise(resolve=>{resolveExample=resolve;}):fetchFile(url);
const examplePending=dynamicsPage.querySelector('#dyn-flow-lab').onclick();await flush();assert.equal(typeof resolveExample,'function');
dynamicsPage.querySelector('[data-dyn-tab="learn"]').onclick();const lecture=dynamicsPage.firstElementChild.innerHTML;
resolveExample({ok:true,text:async()=>fs.readFileSync(new URL('../dist/data/examples/phonopy-demo.yaml',import.meta.url),'utf8')});await examplePending;
assert.equal(dynamicsPage.firstElementChild.innerHTML,lecture,'A late lesson example cannot overwrite a lecture');
assert.equal(calculationCalls,0,'Every continuation and preset action initializes controls without computing');
console.log(`Course continuation:93 non-first lessons across14 families;79 explicit return routes; registered/inline/conditional experiment initialization;93 custom drafts and${incompleteDraftChecks} incomplete drafts; intermediate steps, independent remediation, stale controls, missing presets and late example isolation; zero automatic calculations passed.`);
