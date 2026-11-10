/** Full space-group induction and arbitrary k-star tensor products.
 * All operations use BC primitive fractions, exp(-2π i k·t), and the same
 * SU(2) section as engine.js. D1, D2, ... labels remain numerical labels.
 * Magnetic matrices represent U(g) K^a(g), with K complex conjugation.
 */
import { analyzeGroup, computeStar, reciprocalAction, inverse3, multiply3, apply3,
  buildMultiplicationTable, decomposeCharacters, decomposeCorepresentationCharacters } from './engine.js';

const TAU = 2 * Math.PI;
const z = (re=0,im=0) => ({re,im});
const C = a => typeof a==='number' ? z(a) : Array.isArray(a) ? z(...a) : z(a.re,a.im);
const add = (a,b) => z(a.re+b.re,a.im+b.im);
const mul = (a,b) => z(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const conj = a => z(a.re,-a.im);
const scale = (a,s) => z(a.re*s,a.im*s);
const phase = t => z(Math.cos(t),Math.sin(t));
const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
const equivalent = (a,b,tol=2e-7) => a.every((v,i)=>Math.abs(v-b[i]-Math.round(v-b[i]))<tol);
const rotationKey = R => R.flat().map(Math.round).join(',');
const operationKey = op => `${op.antiunitary?1:0}:${rotationKey(op.rotation)}`;
const zeroMatrix = n => Array.from({length:n},()=>Array.from({length:n},()=>z()));
const identity = n => Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>z(i===j?1:0)));
const dagger = A => A[0].map((_,j)=>A.map(row=>conj(C(row[j]))));
const cmul = (A,B) => A.map(row=>B[0].map((_,j)=>row.reduce((s,x,k)=>add(s,mul(C(x),C(B[k][j]))),z())));
const matrixScale = (A,s) => A.map(row=>row.map(x=>mul(C(x),s)));
const conjugateMatrix = A => A.map(row=>row.map(x=>conj(C(x))));
const trace = A => A.reduce((s,row,i)=>add(s,C(row[i])),z());
const matrixError = (A,B) => Math.max(...A.flatMap((row,i)=>row.map((x,j)=>Math.hypot(x.re-B[i][j].re,x.im-B[i][j].im))));
const assert = (condition,message) => {if(!condition) throw new Error(message);};

function spin(op) {
  assert(op.spinRotation,'Double-valued induction needs the upstream spinRotation on every operation.');
  const U=op.spinRotation.map(row=>row.map(C));
  // The published text database rounds SU(2) entries to six decimals.
  // Normalize that harmless common scale before determining a section sign.
  const norm=Math.sqrt(U.flat().reduce((s,x)=>s+x.re*x.re+x.im*x.im,0)/2);
  return U.map(row=>row.map(x=>scale(x,1/norm)));
}
function sectionSign(U,V) {
  const overlap = U.flat().reduce((s,x,i)=>add(s,mul(conj(C(V.flat()[i])),C(x))),z());
  assert(Math.abs(Math.abs(overlap.re)-2)<2e-6 && Math.abs(overlap.im)<2e-6,'Inconsistent SU(2) lifts in induction.');
  return overlap.re>0?1:-1;
}
const TIME_REVERSAL=[[z(),z(-1)],[z(1),z()]];
function spinSemi(op) {
  return {matrix:op.antiunitary?cmul(spin(op),TIME_REVERSAL):spin(op),anti:Boolean(op.antiunitary)};
}
function semiProduct(a,b) {
  return {matrix:cmul(a.matrix,a.anti?conjugateMatrix(b.matrix):b.matrix),anti:a.anti!==b.anti};
}
function semiInverse(a) {return {matrix:a.anti?conjugateMatrix(dagger(a.matrix)):dagger(a.matrix),anti:a.anti};}

/**
 * induceRepresentation({group,k,analysis?,irrepIndex=0,irrep?,doubleValued=false})
 * returns full matrices/characters ordered by group.operations, the k star,
 * coset representatives, sparse block form, and representation-law residual.
 * `analysis` is the result of analyzeGroup; its matrices must be included.
 */
export function induceRepresentation({group,k,analysis,irrepIndex=0,irrep,doubleValued=false,validate=true}) {
  assert(group && Array.isArray(group.operations),'A space group with operations is required.');
  assert(Array.isArray(k) && k.length===3 && k.every(Number.isFinite),'k must have three finite coordinates.');
  analysis ??= analyzeGroup({operations:group.operations,k,basis:group.basis,doubleValued,includeMatrices:true});
  doubleValued=analysis.doubleValued;
  assert(analysis.k.every((x,i)=>Math.abs(x-k[i])<2e-7),'Little-group analysis and induction must use identical k coordinates, including the reciprocal-lattice gauge.');
  const hasLittleAnti=analysis.corepresentations.length>0;
  const local=irrep ?? (hasLittleAnti?analysis.corepresentations:analysis.irreps)[irrepIndex];
  assert(local && local.matrices,'Select a valid little-group irrep with matrices.');
  const ops=group.operations, little=hasLittleAnti?analysis.littleGroup.operations:analysis.littleGroup.unitaryOperations;
  const star=computeStar(ops,k), cosetIndices=star.map(arm=>arm.operationIndices[0]);
  const reps=cosetIndices.map(i=>ops[i]), invReps=reps.map(op=>inverse3(op.rotation));
  const hMap=new Map();
  little.forEach((op,i)=>{const key=operationKey(op);hMap.set(key,[...(hMap.get(key)||[]),i]);});
  const d=local.dimension,n=star.length,D=d*n;
  assert(n*little.length===ops.length,'Coset orbit-stabilizer identity failed.');

  function blocksFor(op) {
    const out=[];
    for(let j=0;j<n;j++) {
      const moved=reciprocalAction(op,star[j].k);
      const i=star.findIndex(arm=>equivalent(arm.k,moved));
      assert(i>=0,'Operation does not preserve the induced k star.');
      const Rh=multiply3(multiply3(invReps[i],op.rotation),reps[j].rotation);
      const th=apply3(invReps[i],apply3(op.rotation,reps[j].translation).map((x,a)=>x+op.translation[a]-reps[i].translation[a]));
      const ah=(Boolean(reps[i].antiunitary)!==Boolean(op.antiunitary))!==Boolean(reps[j].antiunitary);
      const hi=(hMap.get(operationKey({rotation:Rh,antiunitary:ah}))||[]).find(index=>equivalent(th,little[index].translation));
      assert(hi!==undefined,'Coset conjugation did not land in the little group.');
      const delta=th.map((x,a)=>x-little[hi].translation[a]);
      assert(delta.every(x=>Math.abs(x-Math.round(x))<2e-6),'Induction translation is not a primitive lattice vector.');
      let factor=phase(-TAU*dot(k,delta));
      if(doubleValued) {
        const Uh=semiProduct(semiProduct(semiInverse(spinSemi(reps[i])),spinSemi(op)),spinSemi(reps[j]));
        factor=scale(factor,sectionSign(Uh.matrix,spinSemi(little[hi]).matrix));
      }
      let matrix=matrixScale(local.matrices[hi],factor);
      if(reps[i].antiunitary)matrix=conjugateMatrix(matrix);
      out.push({rowArm:i,columnArm:j,littleOperation:hi,matrix});
    }
    return out;
  }
  function dense(blocks) {
    const M=zeroMatrix(D);
    for(const block of blocks) for(let a=0;a<d;a++) for(let b=0;b<d;b++) M[block.rowArm*d+a][block.columnArm*d+b]=block.matrix[a][b];
    return M;
  }
  const blocks=ops.map(blocksFor),matrices=blocks.map(dense),characters=matrices.map(trace);
  let lawError=0,translationError=0;
  if(validate) {
    const product=buildMultiplicationTable(ops);
    for(let a=0;a<ops.length;a++) for(let b=0;b<ops.length;b++) {
      const c=product.table[a][b],L=product.translationDefects[a][b];
      const spinSign=doubleValued?sectionSign(semiProduct(spinSemi(ops[a]),spinSemi(ops[b])).matrix,spinSemi(ops[c]).matrix):1;
      for(let j=0;j<n;j++) {
        const first=blocks[b][j],second=blocks[a][first.rowArm],expected=blocks[c][j];
        assert(second.rowArm===expected.rowArm,'Induced arm permutations failed composition.');
        const result=cmul(second.matrix,ops[a].antiunitary?conjugateMatrix(first.matrix):first.matrix);
        const fac=scale(phase(-TAU*dot(star[expected.rowArm].k,L)),spinSign);
        lawError=Math.max(lawError,matrixError(result,matrixScale(expected.matrix,fac)));
      }
    }
    const I=[[1,0,0],[0,1,0],[0,0,1]];
    for(const L of [[1,0,0],[0,1,0],[0,0,1]]) {
      const translation=blocksFor({rotation:I,translation:L,spinRotation:[[1,0],[0,1]],antiunitary:false});
      for(let j=0;j<n;j++) translationError=Math.max(translationError,matrixError(translation[j].matrix,matrixScale(identity(d),phase(-TAU*dot(star[j].k,L)))));
    }
    assert(lawError<3e-5 && translationError<3e-5,`Induced representation law failed (${lawError}, ${translationError}).`);
  }
  return {id:`Star(${local.id})`,label:`*${local.label}`,dimension:D,littleDimension:d,
    littleIrrepId:local.id,littleCorepType:local.type??null,k:k.slice(),doubleValued,magnetic:analysis.magnetic,star,cosetIndices,
    operations:ops,matrices,characters,unitaryCharacters:characters.filter((_,i)=>!ops[i].antiunitary),antiunitaryFlags:ops.map(op=>Boolean(op.antiunitary)),blocks,
    validation:{multiplicationError:lawError,translationError,passed:lawError<3e-5&&translationError<3e-5},
    conventions:['Matrices are induced from the selected numerical little-group irrep/corepresentation.','All primitive translations act diagonally as exp(-2π i k_arm·t).','For antiunitary operations each matrix acts as U K; its matrix trace is basis dependent and is not a character.']};
}

/** Full matrices for a lattice-translated canonical SG operation. */
export function inducedOperationMatrix(induced,operationIndex,latticeTranslation=[0,0,0]) {
  assert(Number.isInteger(operationIndex)&&operationIndex>=0&&operationIndex<induced.matrices.length,'Invalid SG operation index.');
  assert(latticeTranslation.length===3&&latticeTranslation.every(Number.isInteger),'Translation must contain three integers in the primitive basis.');
  return induced.matrices[operationIndex].map((row,i)=> {
    const factor=phase(-TAU*dot(induced.star[Math.floor(i/induced.littleDimension)].k,latticeTranslation));
    return row.map(x=>mul(C(x),factor));
  });
}

/**
 * Decompose TWO FULL SG irreps induced from arbitrary k1 and k2 stars.
 * Each output term is itself an induced SG irrep at one resulting star.
 * Translation sectors are resolved before little-group character projection;
 * therefore inequivalent k stars are never falsely treated as a finite group.
 */
export function decomposeStarProduct({group,k1,k2,analysis1,analysis2,irrepIndex1=0,irrepIndex2=0,double1=false,double2=false}) {
  const left=induceRepresentation({group,k:k1,analysis:analysis1,irrepIndex:irrepIndex1,doubleValued:double1});
  const right=induceRepresentation({group,k:k2,analysis:analysis2,irrepIndex:irrepIndex2,doubleValued:double2});
  const targetDouble=left.doubleValued!==right.doubleValued;
  const sectors=[];
  for(let i=0;i<left.star.length;i++) for(let j=0;j<right.star.length;j++) {
    const sum=left.star[i].k.map((x,a)=>x+right.star[j].k[a]);
    let sector=sectors.find(s=>equivalent(s.k,sum));
    if(!sector){sector={k:sum.map(x=>x-Math.round(x)),pairs:[]};sectors.push(sector);}
    sector.pairs.push([i,j]);
  }
  const seen=[],outputs=[];
  for(const sector of sectors) {
    if(seen.some(k=>equivalent(k,sector.k)))continue;
    const target=analyzeGroup({operations:group.operations,k:sector.k,basis:group.basis,doubleValued:targetDouble,includeMatrices:true});
    seen.push(...target.star.map(arm=>arm.k));
    const chars=target.littleGroup.unitaryIndices.map(localIndex=>target.littleGroup.sourceIndices[localIndex]).map(sourceIndex=> {
      let total=z();
      for(const [i,j] of sector.pairs) {
        const a=left.blocks[sourceIndex][i],b=right.blocks[sourceIndex][j];
        if(a.rowArm===i && b.rowArm===j) total=add(total,mul(trace(a.matrix),trace(b.matrix)));
      }
      return total;
    });
    const reduction=target.corepresentations.length?decomposeCorepresentationCharacters(chars,target.corepresentations):decomposeCharacters(chars,target.irreps);
    outputs.push({k:sector.k,star:target.star,doubleValued:targetDouble,sectorDimension:sector.pairs.length*left.littleDimension*right.littleDimension,
      characters:chars,littleOperations:target.littleGroup.unitaryOperations,
      terms:reduction.terms.map(term=>({...term,littleDimension:term.dimension,dimension:term.dimension*target.star.length})),
      validation:{reconstructionError:reduction.reconstructionError,passed:reduction.passed}});
  }
  const productDimension=left.dimension*right.dimension;
  const decomposedDimension=outputs.reduce((sum,o)=>sum+o.terms.reduce((s,t)=>s+t.dimension*t.multiplicity,0),0);
  assert(decomposedDimension===productDimension,`Full SG tensor-product dimension mismatch: ${decomposedDimension} vs ${productDimension}.`);
  return {left:{k:k1,id:left.id,dimension:left.dimension},right:{k:k2,id:right.id,dimension:right.dimension},
    doubleValued:targetDouble,magnetic:group.operations.some(op=>op.antiunitary),productDimension,decomposedDimension,outputs,validation:{dimensionConserved:true,passed:true},
    conventions:['k-star tensor product is decomposed after resolving primitive translation eigenspaces.','Output D labels are numerical labels local to each resulting little group.']};
}

