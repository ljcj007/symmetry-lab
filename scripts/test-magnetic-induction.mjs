import fs from 'node:fs';
import assert from 'node:assert/strict';
import {induceRepresentation,decomposeStarProduct} from '../dist/induction.js';
import {analyzeGroup} from '../dist/engine.js';
const groups=JSON.parse(fs.readFileSync(new URL('../dist/data/magnetic-groups.json',import.meta.url),'utf8')).groups;
const ids=['1.2','1.3','2.6','2.7','3.3','3.4','19.26','19.27','19.28','62.442','62.448','62.451','194.264','194.265','194.272','225.117','225.118','225.121'];
let count=0,error=0;
for(const id of ids) for(const k of [[0,0,0],[.173,.217,.319],[0,0,.5]]) for(const doubleValued of [false,true]) {
 const group=groups.find(g=>g.id===id);
 const analysis=analyzeGroup({operations:group.operations,k,basis:group.basis,doubleValued});
 const reps=analysis.corepresentations.length?analysis.corepresentations:analysis.irreps;
 for(let irrepIndex=0;irrepIndex<reps.length;irrepIndex++) {
  const result=induceRepresentation({group,k,analysis,irrepIndex});
  assert.ok(result.validation.passed);
  error=Math.max(error,result.validation.multiplicationError,result.validation.translationError);count++;
 }
 console.log(`MSG ${id} k=${k} ${doubleValued?'double':'single'}: ${reps.length} full coreps pass`);
}
let products=0;
for(const id of ['1.2','1.3','2.6','19.26','19.28','194.264']) for(const [k1,k2,double1,double2] of [
 [[0,0,0],[0,0,0],true,true],[[.173,.217,.319],[.113,.229,.337],false,false],[[0,0,.5],[0,0,.5],true,false]]) {
 const result=decomposeStarProduct({group:groups.find(g=>g.id===id),k1,k2,double1,double2});
 assert.equal(result.productDimension,result.decomposedDimension);products++;
 console.log(`MSG ${id} tensor ${double1}×${double2} dim=${result.productDimension}: pass`);
}
console.log(JSON.stringify({fullMagneticCoreps:count,products,maxError:error,passed:true}));
