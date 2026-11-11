import assert from 'node:assert/strict';
import {charactersPreview,projectionPreview,splittingPreview,jtPreview,waterPreview,foundationsDemoThemes} from '../dist/foundations-demos.js';
assert.equal(foundationsDemoThemes.length,6);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
assert.equal(charactersPreview({operation:'C4',basis:'xyz'}).trace,1);
assert.equal(charactersPreview({operation:'C4',basis:'xy'}).trace,0);
const id=projectionPreview({operation:0,seedSite:0,irrep:'E',row:0});
close(id.normalized[0],2/Math.sqrt(6));close(id.normalized[1],-1/Math.sqrt(6));
const partner=projectionPreview({operation:1,seedSite:0,irrep:'E',row:1});
close(partner.normalized[0],0);close(partner.normalized[1],1/Math.sqrt(2));
for(let operation=0;operation<6;operation++){
 const r=projectionPreview({operation,seedSite:0,irrep:'E',row:0});
 close(r.eMatrix[0][0]+r.eMatrix[1][1],[2,-1,-1,0,0,0][operation]);
}
close(projectionPreview({operation:0,seedSite:0,irrep:'A2',row:0}).norm,0);
for(const delta of [0,1,2])for(const ds of [-.3,0,.3])for(const dt of [-.1,0,.1])close(splittingPreview({delta,ds,dt}).barycenter,0);
const jt=jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:1});close(jt.lower,-.5);close(jt.minRadius,1);close(jt.stabilization,.5);
assert.equal(jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:2}).linearActive,false);
close(jtPreview({qtheta:1,qepsilon:0,g:1,k:1,occupancy:2}).minRadius,0);
for(const mode of ['symmetric','bend','antisymmetric']){
 const w=waterPreview({mode,phase:90,amplitude:.3}),mass=[16,1,1];
 for(const j of [0,1])close(w.displacements.reduce((sum,u,i)=>sum+mass[i]*u[j],0),0);
}
console.log('Foundations demo preview invariants passed.');
