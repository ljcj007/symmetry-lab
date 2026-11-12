import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lieLessonDerivations,resolveLieDerivation} from '../dist/lie-learning-links.js';
import {foundationPresets} from '../dist/lie-foundations-ui.js';
const lessons=JSON.parse(readFileSync(new URL('../dist/data/lie-group-lessons.json',import.meta.url),'utf8')).lessons;
const exercises=JSON.parse(readFileSync(new URL('../dist/data/lie-derivations.json',import.meta.url),'utf8')).exercises;
const selected=lesson=>{const found=resolveLieDerivation(lesson,exercises);return {...found,id:exercises[found.index]?.id};};
for(const [lesson,id]of Object.entries(lieLessonDerivations)){
 const source=lessons.find(item=>item.id===lesson),target=exercises.find(item=>item.id===id);
 assert.ok(source,lesson);assert.ok(target,id);assert.equal(source.lab,target.lab,lesson);
 assert.equal(selected(source).id,id);
}
for(const [lesson,id]of [
 ['su3-cg-multiplicity','su3-cg-octet-rotation'],
 ['su3-cg-exact-radicals','su3-cg-ten-three-lowering'],
 ['su3-racah-exact-sixj','su3-racah-three-exact-matrix'],
 ['su3-ninej-27-input-exact','su3-ninej-27-weighted-entry']
])assert.equal(selected(lessons.find(item=>item.id===lesson)).id,id);
const introductoryBindings=[
 ['continuous-symmetry','continuous-c4-in-u1'],
 ['unitary-matrices','unitary-special-two-checks'],
 ['generators-commutators','generators-pauli-normalization'],
 ['su2-spinor','su2-y-quarter-turn-bloch'],
 ['su2-double-cover','su2-double-cover-path-phase'],
 ['representations','representations-center-two-actions'],
 ['su3-generators','su3-eight-directions-embedded-rotation'],
 ['su3-weights','su3-weights-roots-phase-record']
];
for(const [lesson,id] of introductoryBindings){
 const found=selected(lessons.find(item=>item.id===lesson));
 assert.equal(found.id,id);assert.equal(found.matchedBy,'lesson');
}
const originalExercises=exercises.filter(item=>!introductoryBindings.some(([,id])=>id===item.id));
assert.equal(originalExercises.length,32,'All existing application and recoupling tasks remain');
for(const lesson of lessons.slice(8)){
 const original=resolveLieDerivation(lesson,originalExercises);
 assert.equal(selected(lesson).id,originalExercises[original.index]?.id,'New foundations must not redirect '+lesson.id);
}
const presetInputs=[
 ['u1-circle-quarter','u1',{order:4,degrees:45,translation:.001}],
 ['unitary-z-quarter','su2',{axis:'z',degrees:90,state:'up'}],
 ['generators-xy','commutator',{group:'su2',a:1,b:2}],
 ['spinor-y-quarter','su2',{axis:'y',degrees:90,state:'up'}],
 ['su2-phase-single','interferometer',{axis:'z',degrees:360,state:'up',branches:'single',phaseDegrees:0}],
 ['su2-center-actions','representations',{axis:'z',degrees:360}],
 ['su3-t1-half','su3',{generator:1,degrees:180,state:1}],
 ['su3-weight-phase','su3',{generator:3,degrees:90,state:'plus12'}]
];
for(const [index,[preset,lab,input]] of presetInputs.entries()){
 const exercise=exercises.find(item=>item.id===introductoryBindings[index][1]);
 assert.equal(exercise.lab,lab);assert.equal(exercise.labPreset,preset);
 assert.deepEqual(foundationPresets[preset],{experiment:lab,input},'Linked experiment must start with the actual problem values');
}
assert.equal(lessons.filter(lesson=>selected(lesson).index>=0).length,28,'Eight introductory bindings augment the existing twenty');
assert.deepEqual(lessons.filter(lesson=>selected(lesson).index<0).map(lesson=>lesson.id),['su3-racah-coupling-paths','su3-ninej-color-complex','su3-ninej-adjoint-observables','su3-ninej-high-input-labels'],'Advanced lessons without a direct task still expose the unselected bank');
assert.equal(selected({id:'unknown',lab:'su3_cg',labPreset:'unknown-preset'}).index,-1,'A missing exact preset cannot select an unrelated CG example');
assert.equal(selected({id:'unknown',lab:'su3_tensor'}).index,-1,'Several same-lab problems are not a justified lesson association');
assert.equal(selected({id:'unknown',lab:'rabi'}).id,'rabi-pi-pulse','A unique same-lab task is an unambiguous fallback');
assert.equal(resolveLieDerivation({id:'test'},[{id:'first',lessonId:'other'},{id:'bound',lessonIds:['test']}]).index,1);
assert.equal(resolveLieDerivation({id:'test'},[{id:'first',lessonIds:{}}]).index,-1,'Malformed optional associations are ignored safely');
assert.equal(resolveLieDerivation({id:'su2-coupling-representations'},[{id:'authored',lessonId:'su2-coupling-representations'},{id:'su2-spin-addition'}]).index,0,'Authored catalogue associations override legacy default bindings');
assert.equal(resolveLieDerivation({id:'test',derivationId:'missing'},[{id:'other',lessonId:'test'}]).index,-1,'An invalid explicit association is exposed rather than silently replaced');
console.log('Lie learning links: existing lesson bindings, exact-preset precedence, and honest no-match/ambiguous-bank behavior passed.');
