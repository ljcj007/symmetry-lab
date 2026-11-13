import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Element,Container} from './test-material-research-ui.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../dist/data/response-materials.json',import.meta.url),'utf8'));
const lessons=data.lessons.filter(lesson=>lesson.module==='hall');
assert.deepEqual(lessons.map(x=>x.id),['hall-occupation','hall-entropy','hall-diagnostics']);
let fetches=0,runs=0,writes=0,cancellations=0;
const saved=new Map();
globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>{writes++;saved.set(key,String(value));}};
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag),activeElement:null};
Element.prototype.focus=function(){document.activeElement=this;};
globalThis.fetch=async url=>{fetches++;assert.match(String(url),/response-materials\.json/);return{ok:true,json:async()=>structuredClone(data)};};
const ui=await import('../dist/response-materials-ui.js?prerequisite-integration');
const mount=async(selection,container=new Container())=>{
 const navigations=[];
 await ui.renderResponseMaterialsView({container,selection,onNavigate:patch=>navigations.push(patch),run:()=>{runs++;throw Error('Inline prerequisites and normal tabs must not run Python');},cancelRun:()=>{cancellations++;}});
 return{container,navigations,$:selector=>container.querySelector(selector)};
};
const tab=(view,id)=>{const button=view.$('[data-rp-tab="'+id+'"]');assert.ok(button,'Tab '+id);button.onclick();};
const choose=(view,id,value)=>{const control=view.$('#'+id);assert.ok(control,id);control.value=String(value);control.onchange({target:control});};
const click=(view,id)=>{const button=view.$('#'+id);assert.ok(button,id);assert.equal(button.disabled,false,id+' is available');button.onclick();};
const changeLab=(view,key,value)=>{const control=view.$('#rp-'+key);assert.ok(control,key);control.value=String(value);view.$('#rp-form').oninput({target:control});};
const checkPhase=view=>{choose(view,'hb-phase-rays-choice','invariant');click(view,'hb-phase-rays-run');click(view,'hb-phase-rays-check');assert.match(view.$('#hb-phase-rays-feedback').attributes.class,/hb-correct/);};
const checkEntropy=view=>{choose(view,'hb-fermi-weights-kernel','entropy');choose(view,'hb-fermi-weights-temperature','5000');choose(view,'hb-fermi-weights-choice','zero');click(view,'hb-fermi-weights-run');click(view,'hb-fermi-weights-check');assert.match(view.$('#hb-fermi-weights-feedback').attributes.class,/hb-correct/);};
const bridgeState=view=>({phaseChoice:view.$('#hb-phase-rays-choice').value,phaseStep:view.$('#hb-phase-rays-step').value,phaseFeedback:view.$('#hb-phase-rays-feedback').textContent,entropyChoice:view.$('#hb-fermi-weights-choice').value,temperature:view.$('#hb-fermi-weights-temperature').value,entropyFeedback:view.$('#hb-fermi-weights-feedback').textContent});

for(const lesson of lessons){
 const view=await mount({module:'hall',lesson:lesson.id});
 assert.equal(view.$('#rp-lesson').value,lesson.id);
 assert.equal(view.container.querySelectorAll('[data-hb-bridge]').length,2);
 const source=view.$('#rp-content').innerHTML;
 assert.ok(source.indexOf('class="hb-prerequisites"')>=0);
 assert.ok(source.indexOf('class="hb-prerequisites"')<source.indexOf('class="obs-formula"'),'Prerequisites precede the first original Hall formula: '+lesson.id);
 for(const detail of view.container.querySelectorAll('[data-hb-bridge]')){
  assert.equal(detail.tag,'details');assert.equal(detail.getAttribute('open'),null,'Optional explanations start closed');assert.equal(detail.querySelector('summary').onkeydown,undefined,'Native keyboard disclosure semantics are retained');
 }
 checkPhase(view);choose(view,'hb-phase-rays-step','small');checkPhase(view);checkEntropy(view);
 const before=bridgeState(view),oldBridgeRun=view.$('#hb-phase-rays-run').onclick;
 // A native details toggle can have happened before its queued toggle event.
 // A fast tab change must remember that actual open state at disposal time.
 const nativeDetail=view.$('[data-hb-bridge="phase-rays"]');nativeDetail.open=true;
 const nativeVariant=view.$('[data-hb-body="phase-rays"]').querySelector('.hb-variant');nativeVariant.open=true;
 const pendingToggle=nativeDetail.ontoggle,pendingVariantToggle=nativeVariant.ontoggle;
 click(view,'rp-to-derive');
 assert.equal(view.container.querySelectorAll('[data-hb-bridge]').length,0);
 const exercise=data.exercises.find(item=>item.lesson===lesson.id);
 assert.equal(view.$('#rp-exercise').value,exercise.id);
 let steps=view.$('#rp-steps').querySelectorAll('.obs-exercise-step');assert.equal(steps.length,1);
 const originalFirst=steps[0].querySelectorAll('[data-rp-answer]').find(button=>Number(button.dataset.rpAnswer)===exercise.steps[0].answer);
 originalFirst.onclick();steps=view.$('#rp-steps').querySelectorAll('.obs-exercise-step');assert.equal(steps.length,2,'One original derivation step advances without marking completion');
 assert.equal(view.$('#rp-progress').textContent,'');
 tab(view,'learn');
 assert.deepEqual(bridgeState(view),before,'Both local experiments survive the original derivation roundtrip: '+lesson.id);
 assert.notEqual(view.$('[data-hb-bridge="phase-rays"]').getAttribute('open'),null,'Queued native top-level toggle is captured before disposal');
 assert.notEqual(view.$('[data-hb-body="phase-rays"]').querySelector('.hb-variant').getAttribute('open'),null,'Queued native variant toggle is captured before disposal');
 const restored=bridgeState(view);oldBridgeRun();pendingToggle();pendingVariantToggle();assert.deepEqual(bridgeState(view),restored,'Retired bridge controls and delayed toggles cannot alter the remounted lesson');
 tab(view,'derive');assert.equal(view.$('#rp-steps').querySelectorAll('.obs-exercise-step').length,2,'Original intermediate derivation remains at the second step');
 assert.ok(view.$('#rp-steps').querySelectorAll('.obs-exercise-step')[0].querySelectorAll('[data-rp-answer]').every(button=>button.disabled));
 tab(view,'lab');
 changeLab(view,'mass',-.75);changeLab(view,'temperature',321);changeLab(view,'chemicalPotential',.23);
 tab(view,'learn');assert.deepEqual(bridgeState(view),before,'A custom full-lab draft does not replace either prerequisite experiment');
 tab(view,'lab');assert.equal(view.$('#rp-mass').value,'-0.75');assert.equal(view.$('#rp-temperature').value,'321');assert.equal(view.$('#rp-chemicalPotential').value,'0.23');
 changeLab(view,'mass','');
 tab(view,'learn');assert.deepEqual(bridgeState(view),before);
 tab(view,'lab');assert.equal(view.$('#rp-mass').value,'','An incomplete numeric input remains incomplete rather than silently becoming a preset');assert.ok(view.$('#rp-form').querySelector('[role="alert"]'),'Restored incomplete draft explains how to correct it');
 tab(view,'derive');assert.equal(view.$('#rp-steps').querySelectorAll('.obs-exercise-step').length,2,'Visiting bridges and complete/incomplete lab drafts does not reset original derivation progress');
 assert.equal(view.navigations.at(-1).lesson,lesson.id);assert.equal(view.navigations.at(-1).exercise,exercise.id);
}

// Switching between Hall lessons inside the real course keeps independent
// bridge choices while leaving the original course selection authoritative.
const switched=await mount({module:'hall',lesson:'hall-occupation'});
checkPhase(switched);choose(switched,'hb-phase-rays-step','large');checkPhase(switched);
const phaseFirst=bridgeState(switched),obsoleteCheck=switched.$('#hb-phase-rays-check').onclick;
choose(switched,'rp-lesson','hall-entropy');assert.equal(switched.$('#hb-phase-rays-choice').value,'');assert.equal(switched.$('#hb-phase-rays-step').value,'medium');
checkEntropy(switched);const entropySecond=bridgeState(switched);obsoleteCheck();assert.deepEqual(bridgeState(switched),entropySecond,'An old Hall lesson cannot check the newly selected lesson');
choose(switched,'rp-lesson','hall-occupation');assert.deepEqual(bridgeState(switched),phaseFirst);
choose(switched,'rp-lesson','hall-entropy');assert.deepEqual(bridgeState(switched),entropySecond);
assert.equal(switched.navigations.at(-1).lesson,'hall-entropy');

// Non-Hall teaching remains unchanged, including invalid cross-module lesson
// requests which must resolve to a lesson actually owned by that module.
for(const module of ['device','multiplet']){
 const other=await mount({module,lesson:'hall-occupation'});
 assert.equal(other.container.querySelectorAll('[data-hb-bridge]').length,0);
 assert.ok(data.lessons.some(lesson=>lesson.module===module&&lesson.id===other.$('#rp-lesson').value));
 tab(other,'derive');assert.equal(other.container.querySelectorAll('[data-hb-bridge]').length,0);
}
const oldView=await mount({module:'hall',lesson:'hall-diagnostics'}),staleReset=oldView.$('#hb-fermi-weights-reset').onclick;
await mount({module:'device'},oldView.container);const newRoot=oldView.container.firstElementChild;
staleReset();assert.equal(oldView.container.firstElementChild,newRoot);assert.equal(oldView.container.querySelectorAll('[data-hb-bridge]').length,0);
assert.equal(fetches,1,'All inline actions reuse the production course load');
assert.equal(runs,0);assert.equal(cancellations,0);assert.equal(writes,0,'Bridge checks and intermediate original steps never write mastery or project evidence');
assert.equal(ui.getResponseMaterialsResult(),null);
console.log('Response prerequisites: all three real Hall lessons place two optional bridges before original formulas; bridge checks/native open states, original intermediate steps, custom and incomplete lab drafts survive ordinary tabs; lesson states isolate and stale controls cannot affect new lessons; no false device/multiplet hooks and no Python/progress writes passed.');
