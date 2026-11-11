import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseClassroomRoute,buildClassroomHash,isClassroomView} from '../dist/classroom-ui.js';
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../dist/python-worker.js',import.meta.url),'utf8');
for(const [module,section,tool,experiments] of [
 ['demos','foundations-demos','foundations_demos',['water','characters','projection','splitting','jt','macro']],
 ['mini','symmetry-mini-demos','symmetry_mini_demos',['polyhedra','vibrations','bands','manybody','time-reversal','double-soc']],
 ['theorems','group-theorems','group_theorems',['rearrangement','conjugacy','normal','irreducible','schur','unitarity','orthogonality','reduction','degeneracy']]
]){
 assert.ok(isClassroomView(section));
 assert.ok(app.includes("'"+section+"'"),'A new classroom section needs an app title');
 assert.ok(worker.includes(tool+': ['));
 assert.ok(worker.includes('_result = '+tool+'.run('));
 for(const experiment of experiments){
  const route=parseClassroomRoute('classroom/foundations?module='+module+'&experiment='+experiment);
  assert.equal(route.section,section);assert.equal(route.pathway,'foundations');
  assert.equal(route.experiment,experiment);
  assert.deepEqual(parseClassroomRoute(buildClassroomHash(route)),route);
 }
 const compute=parseClassroomRoute('compute/'+section+'?experiment='+experiments[0]);
 assert.equal(compute.section,section);assert.equal(compute.calculationOnly,true);
 assert.deepEqual(parseClassroomRoute(buildClassroomHash(compute)),compute);
}
console.log('Twenty-one demo routes, application registration, Python dispatch, and calculation links passed.');
