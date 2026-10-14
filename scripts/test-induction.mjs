import fs from 'node:fs';
import assert from 'node:assert/strict';
import {induceRepresentation,decomposeStarProduct,inducedOperationMatrix} from '../dist/induction.js';
import {analyzeGroup} from '../dist/engine.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/space-groups.json',import.meta.url),'utf8'));
const groups=data.groups;
const cases=[
  [2,[.173,.217,.319],false],[19,[.173,.217,.319],false],
  [62,[0,.5,0],false],[194,[-1/3,2/3,.5],false],
  [225,[.5,0,.5],false],[230,[.5,-.5,.5],false],
  [2,[.173,.217,.319],true],[19,[0,0,0],true],
  [62,[0,.5,0],true],[194,[-1/3,2/3,.5],true],
  [225,[.5,0,.5],true],[230,[.5,-.5,.5],true],
];
let count=0,maxError=0;
for(const [number,k,doubleValued] of cases) {
  const group=groups[number-1];
  const analysis=analyzeGroup({operations:group.operations,k,basis:group.basis,doubleValued,includeMatrices:true});
  for(let i=0;i<analysis.irreps.length;i++) {
    const r=induceRepresentation({group,k,analysis,irrepIndex:i});
    assert.equal(r.dimension,r.littleDimension*r.star.length);
    assert.ok(r.validation.passed);
    assert.equal(inducedOperationMatrix(r,0,[1,-1,2]).length,r.dimension);
    maxError=Math.max(maxError,r.validation.multiplicationError,r.validation.translationError);count++;
  }
  console.log(`SG ${number} ${doubleValued?'double':'single'}: ${analysis.irreps.length} induced irreps pass`);
}
const products=[
  [2,[.173,.217,.319],[.113,.229,.337],false,false],
  [19,[.173,.217,.319],[.113,.229,.337],false,false],
  [19,[0,0,0],[0,0,0],true,true],
  [62,[0,.5,0],[0,.5,0],false,false],
  [194,[-1/3,2/3,.5],[-1/3,2/3,.5],true,false],
  [225,[.5,0,.5],[.5,0,.5],false,false],
];
for(const [number,k1,k2,double1,double2] of products) {
  const r=decomposeStarProduct({group:groups[number-1],k1,k2,double1,double2});
  assert.equal(r.productDimension,r.decomposedDimension);
  console.log(`SG ${number} tensor product: dimension ${r.productDimension}; ${r.outputs.length} resulting stars`);
}
console.log(JSON.stringify({inducedRepresentations:count,products:products.length,maxMultiplicationOrTranslationError:maxError,passed:true}));
