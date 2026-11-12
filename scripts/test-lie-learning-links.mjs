import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lieLessonDerivations,resolveLieDerivation} from '../dist/lie-learning-links.js';
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
assert.equal(selected(lessons[0]).index,-1,'An introductory lesson with no derivation has no arbitrary fallback');
assert.equal(selected({id:'unknown',lab:'su3_cg',labPreset:'unknown-preset'}).index,-1,'A missing exact preset cannot select an unrelated CG example');
assert.equal(selected({id:'unknown',lab:'su3_tensor'}).index,-1,'Several same-lab problems are not a justified lesson association');
assert.equal(selected({id:'unknown',lab:'rabi'}).id,'rabi-pi-pulse','A unique same-lab task is an unambiguous fallback');
assert.equal(resolveLieDerivation({id:'test'},[{id:'first',lessonId:'other'},{id:'bound',lessonIds:['test']}]).index,1);
assert.equal(resolveLieDerivation({id:'test'},[{id:'first',lessonIds:{}}]).index,-1,'Malformed optional associations are ignored safely');
assert.equal(resolveLieDerivation({id:'su2-coupling-representations'},[{id:'authored',lessonId:'su2-coupling-representations'},{id:'su2-spin-addition'}]).index,0,'Authored catalogue associations override legacy default bindings');
assert.equal(resolveLieDerivation({id:'test',derivationId:'missing'},[{id:'other',lessonId:'test'}]).index,-1,'An invalid explicit association is exposed rather than silently replaced');
console.log('Lie learning links: existing lesson bindings, exact-preset precedence, and honest no-match/ambiguous-bank behavior passed.');
