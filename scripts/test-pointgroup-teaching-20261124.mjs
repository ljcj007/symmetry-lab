import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Container,Element} from './test-material-research-ui.mjs';
const english=process.argv.includes('--english'),prefix=english?'../dist/en/':'../dist/';
const {
  identity,matVec,matMul,transpose,operationSetModel,coordinateModel,coordinateOperations,
  crystalRotationModel,guidedGroupModel,representationModel,reductionModel,reductionPresets,
  c4vIrreps,projectionFamilies,projectionModel,propertyModel,propertyGroups,
  bindPointgroupLessonInteraction
}=await import(prefix+'pointgroup-lessons-interactive.js');

const E=identity(3),close=(a,b)=>assert.deepEqual(a,b);
const trace=a=>a.reduce((s,row,i)=>s+row[i],0);

// Compare actual actions, rather than accepting status text as evidence.
const incomplete=operationSetModel('incomplete',[1,1,0]);
assert.equal(incomplete.closure,false);assert.equal(incomplete.inverseLabel,null);
assert.match(incomplete.productLabel,/R²/);
const c4=operationSetModel('c4',[1,1,2]);
assert.equal(c4.closure,true);assert.equal(c4.inverseLabel,'R³');
assert.equal(c4.groupOrder,4);assert.equal(c4.order,4);
assert.equal(operationSetModel('c4',[2,1,0]).order,2);
assert.equal(c4.originFixedByAll,true);
for(const [a,b,c]of [[1,4,2],[4,1,7],[3,6,5],[0,2,4]]){
  const m=operationSetModel('square',[a,b,c]);
  assert.equal(m.closure,true);assert.equal(m.groupOrder,8);
  close(m.left.matrix,m.right.matrix);close(m.leftGrouped,m.steps[3]);close(m.rightGrouped,m.steps[3]);
}
const mirrorTurn=operationSetModel('square',[1,4,2]);
assert.match(mirrorTurn.set.label,/C₄ᵥ/,'The explicit 3D action is C4v, despite its abstract dihedral multiplication');
assert.ok(mirrorTurn.set.operations.every(g=>matVec(g.matrix,[0,0,1]).every((x,i)=>x===[0,0,1][i])),'Every listed operation preserves the z direction');
assert.notDeepEqual(mirrorTurn.productPoint,mirrorTurn.reversePoint);
const translations=operationSetModel('translations',[3,4,1]);
assert.equal(translations.closure,true);assert.equal(translations.order,Infinity);
assert.equal(translations.groupOrder,Infinity);assert.equal(translations.originFixedByAll,false);
close(translations.leftGrouped,translations.rightGrouped);

const probe=[1,.5,.8];
close(coordinateModel(1,probe).after,[-1,-.5,.8]);
close(coordinateModel(4,probe).after,[-1,-.5,-.8]);
close(coordinateModel(2,probe).after,[1,-.5,.8]);
close(coordinateModel(3,probe).after,[1,.5,-.8]);
close(coordinateModel(4,[1,.5,0]).after,coordinateModel(1,[1,.5,0]).after);
close(matMul(coordinateOperations[5].matrix,coordinateOperations[6].matrix),E);
for(const n of [1,2,3,4,6])assert.equal(crystalRotationModel(n).allowed,true);
for(const n of [5,8])assert.equal(crystalRotationModel(n).integral,false);
assert.equal(guidedGroupModel(0).maxRotation,2);assert.equal(guidedGroupModel(0).mirrors,0);
assert.equal(guidedGroupModel(1).maxRotation,1);assert.equal(guidedGroupModel(1).mirrors,1);
assert.equal(guidedGroupModel(2).inversion,true);
assert.equal(guidedGroupModel(3).order,4);assert.equal(guidedGroupModel(3).mirrors,0);
assert.equal(guidedGroupModel(4).order,4);assert.equal(guidedGroupModel(4).mirrors,2);
assert.equal(guidedGroupModel(6).order,8);assert.equal(guidedGroupModel(6).horizontal,false);
assert.equal(guidedGroupModel(7).order,16);assert.equal(guidedGroupModel(7).horizontal,true);

const plane=representationModel('plane',0,[2,1]),space=representationModel('space',0,[2,1,3]);
close(plane.columns,[[0,1],[-1,0]]);close(plane.result,[-1,2]);assert.equal(plane.trace,0);
close(space.result,[-1,2,3]);assert.equal(space.trace,1);
close(representationModel('water',1,[2,1]).result,[1,2]);
assert.equal(representationModel('water',1).trace,0);assert.equal(representationModel('water',2).trace,2);

const expected={vector:[1,0,0,0,1],vertices:[1,0,0,1,1],quadratic:[2,0,1,1,1],product:[2,1,1,1,2]};
for(const preset of reductionPresets){
  const m=reductionModel(preset.characters);assert.equal(m.valid,true);
  close(m.rows.map(r=>r.multiplicity),expected[preset.id]);
  close(m.reconstructed,preset.characters);assert.equal(m.dimension,preset.characters[0]);
}
assert.equal(reductionModel([3,0,0,0,0]).valid,false);
assert.equal(reductionModel([1,3,1,1,1]).valid,false);

// Cross-check representations and projectors against multiplication, expected
// characters and all seeds. This catches class swaps and a dead dropdown.
const operations=projectionFamilies[0].matrices;
const classIndices=[0,1,2,1,3,4,3,4],representative=[0,1,2,4,5];
for(const family of projectionFamilies){
  const preset=reductionPresets.find(p=>p.id===family.id);
  close(representative.map(i=>trace(family.matrices[i])),preset.characters);
  for(let a=0;a<8;a++)for(let b=0;b<8;b++){
    const product=matMul(operations[a],operations[b]);
    const k=operations.findIndex(m=>JSON.stringify(m)===JSON.stringify(product));
    assert.ok(k>=0);close(matMul(family.matrices[a],family.matrices[b]),family.matrices[k]);
  }
  for(const ir of c4vIrreps){
    const m=projectionModel(family.id,ir.id,0);
    assert.equal(m.rank,expected[family.id][c4vIrreps.indexOf(ir)]*ir.dimension);
    close(matMul(m.projector,m.projector),m.projector);
    for(const seed of family.seeds){
      const contributions=family.matrices.map((matrix,i)=>matVec(matrix,seed.v).map(x=>x*ir.dimension*ir.characters[classIndices[i]]/8));
      const sum=seed.v.map((_,i)=>contributions.reduce((s,v)=>s+v[i],0));
      close(matVec(m.projector,seed.v),sum);
    }
  }
}
close(projectionModel('vector','A1',0).result,[0,0,1]);
assert.equal(projectionModel('vector','E',0).zero,true);
assert.equal(projectionModel('vector','E',0).rank,2);
close(projectionModel('vector','E',1).result,[1,0,0]);
assert.equal(projectionModel('vector','A2',1).rank,0);
close(projectionModel('quadratic','A1',0).result,[.5,.5,0,0,0,0]);
assert.equal(projectionModel('quadratic','A1',0).multiplicity,2);
close(projectionModel('quadratic','B1',0).result,[.5,-.5,0,0,0,0]);
close(projectionModel('quadratic','B2',2).result,[0,0,0,1,0,0]);

const p=[1,2,3],tensor=[[1,1,2],[1,2,3],[2,3,4]];
const polar=propertyModel(0,p,tensor),nonpolar=propertyModel(1,p,tensor),orthorhombic=propertyModel(3,p,tensor),inverted=propertyModel(4,p,tensor);
close(polar.vectorAverage,[0,0,3]);close(nonpolar.vectorAverage,[0,0,0]);
close(polar.tensorAverage,[[1.5,0,0],[0,1.5,0],[0,0,4]]);
close(orthorhombic.tensorAverage,[[1,0,0],[0,2,0],[0,0,4]]);
close(inverted.tensorAverage,tensor);close(inverted.vectorAverage,[0,0,0]);
for(let i=0;i<propertyGroups.length;i++){
  const m=propertyModel(i,p,tensor);
  for(const r of m.group.matrices){
    close(matVec(r,m.vectorAverage),m.vectorAverage);
    close(matMul(matMul(r,m.tensorAverage),transpose(r)),m.tensorAverage);
  }
}

// Run the actual event handlers, including selection changes and stale events.
const states=new Map(),page=new Container();let current=true,dispose=()=>{};
const mount=id=>{dispose();current=true;dispose=bindPointgroupLessonInteraction({root:page,lessonId:id,stateStore:states,isCurrent:()=>current});};
const change=(id,value)=>{const node=page.querySelector('#'+id);assert.ok(node,id);node.value=String(value);node.onchange({target:node});};
const message=(zh,en)=>assert.match(page.innerHTML.replace(/\s+/g,' '),english?en:zh);
mount('group-basics');change('pgl-basic-set','incomplete');message(/还不是群/,/not yet a group/);
change('pgl-basic-set','square');message(/不能交换/,/need not commute/);message(/群阶 \|G\|=8/,/group order \|G\|=8/);
change('pgl-basic-set','translations');message(/不存在所有操作共有的不动点/,/no point is fixed by all operations/);
mount('operations-notation');change('pgl-coordinate-op',4);assert.match(page.innerHTML,/−0.8/);
change('pgl-coordinate-probe','plane');message(/恰在 xy 面内/,/probe lies in xy/);
mount('thirty-two');change('pgl-rotation-n',5);message(/迹不是整数/,/trace is not an integer/);
change('pgl-identify-case',4);change('pgl-identify-answer','222');page.querySelector('#pgl-identify-check').onclick();message(/不吻合/,/does not agree/);
change('pgl-identify-answer','mm2');page.querySelector('#pgl-identify-check').onclick();message(/名称与完整操作吻合/,/name agrees with the complete operation/);
mount('representations');change('pgl-rep-family','space');change('pgl-rep-operation',4);assert.match(page.innerHTML,/−3<\/strong>/);
change('pgl-rep-family','water');change('pgl-rep-operation',1);message(/完整九维/,/full nine-dimensional/);
mount('character-reduction');change('pgl-reduce-preset','quadratic');assert.match(page.innerHTML,/2A₁/);
change('pgl-character-0',3);message(/不是一个普通/,/not the character of an ordinary/);
mount('projection');change('pgl-proj-irrep','E');message(/这次种子投影为零/,/seed projects to zero/);message(/空间含有所选对称性/,/space contains the selected symmetry/);
change('pgl-proj-seed',1);message(/得到了 E/,/nonzero function of E/);
change('pgl-proj-family','quadratic');change('pgl-proj-irrep','A1');message(/两份一维 A₁/,/two copies of one-dimensional A₁/);
mount('selection-rules');const before=page.innerHTML;change('pgl-property-group',1);assert.notEqual(page.innerHTML,before);
change('pgl-property-group',4);message(/两个负号抵消/,/two minus signs cancel/);
const stale=page.querySelector('#pgl-property-p-0');dispose();const html=page.innerHTML;stale.onchange({target:{value:'99'}});assert.equal(page.innerHTML,html);
mount('projection');assert.equal(page.querySelector('#pgl-proj-family').value,'quadratic','Returning to a lesson retains its selected object');
current=false;const old=page.querySelector('#pgl-proj-irrep'),stopped=page.innerHTML;old.onchange({target:{value:'E'}});assert.equal(page.innerHTML,stopped);

// Verify the actual host mounts every lesson while preserving saved quiz data.
const read=name=>JSON.parse(fs.readFileSync(new URL(prefix+'data/'+name+'.json',import.meta.url),'utf8'));
const lessons=read('pointgroup-lessons'),atlas=read('pointgroup-atlas');
globalThis.localStorage={getItem:()=>JSON.stringify({'group-basics:0':{selected:1,checked:true}}),setItem:()=>assert.fail('Changing a lesson must not overwrite quiz progress')};
globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('lessons')?lessons:atlas});
globalThis.document={compatMode:'CSS1Compat',createElement:tag=>new Element(tag)};
const host=await import(prefix+'pointgroup-ui.js?teaching-20261124-test');
for(const lesson of lessons.lessons.slice(0,7)){
  const container=new Container();const cleanup=await host.renderPointgroupView({container,selection:{tab:'learn',lesson:lesson.id}});
  assert.ok(container.querySelector('[data-pgl-workshop]'),'Mounted live lesson '+lesson.id);
  assert.doesNotMatch(container.querySelector('[data-pointgroup-lesson-interaction]').innerHTML,/NaN|undefined|PASS|Python核对|JSON自检|残差/);
  if(english)assert.doesNotMatch(container.querySelector('[data-pointgroup-lesson-interaction]').innerHTML,/[\u3400-\u9fff]/u,'English interaction contains no Chinese display text');
  cleanup();
}
console.log('Pointgroup teaching ('+(english?'English':'Chinese')+'): action-level axioms; coordinates; rotation restrictions; column matrices; weighted characters; all projection spaces/irreps; tensor invariance; actual controls, stale events, host mounting and quiz retention passed.');
