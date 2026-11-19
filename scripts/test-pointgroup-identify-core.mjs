import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {analyzeEvidence, analyzeOperation, operationCategories} from '../dist/pointgroup-identify-core.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8').replace(/\r\n?/g, '\n');
const digest = text => createHash('sha256').update(text, 'utf8').digest('hex');
const data = JSON.parse(read('dist/data/pointgroup-identify.json'));
const {groups, exercises, sources} = data;
const [{groups: spaceGroups, source}, {groups: atlas}] = ['spaceGroups', 'atlas'].map(key => {
  const text = read(sources[key].path);
  assert.equal(digest(text), sources[key].sha256);
  return JSON.parse(text);
});
assert.equal(sources.upstreamCommit, source.commit);
assert.equal(data.schemaVersion, 1);
assert.equal(groups.length, 32);
assert.equal(new Set(groups.map(group => group.id)).size, 32);
assert.equal(exercises.length, 32);
assert.equal(new Set(exercises.map(exercise => exercise.id)).size, 32);
assert.deepEqual(exercises.map(exercise => exercise.groupId).sort((a, b) => a - b), groups.map(group => group.id));

// Independent analytic oracle: for det +1, tr(R)=1+2 cos(theta).
// For det -1, tr(-R) has the same relation to the proper rotation part.
const traceOrders = new Map([[3, 1], [-1, 2], [0, 3], [1, 4], [2, 6]]);
function expectedType(m) {
  const [first, second, third] = m;
  const cross = second.map((value, i) => {
    const j = (i + 1) % 3, k = (i + 2) % 3;
    return second[j] * third[k] - second[k] * third[j];
  });
  const determinant = first.reduce((sum, value, i) => sum + value * cross[i], 0);
  assert([1, -1].includes(determinant));
  const trace = m[0][0] + m[1][1] + m[2][2];
  const rotationOrder = traceOrders.get(determinant * trace);
  assert(rotationOrder, 'Crystallographic proper part determines a crystallographic trace');
  const order = determinant === -1 && rotationOrder % 2 === 1 ? 2 * rotationOrder : rotationOrder;
  return {determinant, trace, order, rotationOrder,
    category: `${determinant === 1 ? 'proper' : 'improper'}-${rotationOrder}`};
}

const byName = Object.fromEntries(groups.map(group => [group.hm, group]));
const signature = group => operationCategories.map(category => group.counts[category]).join(',');
const idBySignature = new Map();
for (const group of groups) {
  const sameAtlas = atlas.find(row => row.id === group.id);
  const sameSource = spaceGroups[group.representativeSG - 1];
  assert.equal(group.hm, sameAtlas.hm);
  assert.equal(group.schoenflies, sameAtlas.schoenflies);
  assert.equal(group.order, sameSource.operations.length);
  assert(sameSource.operations.every(record => record.translation.every(value => value === 0)));
  assert.deepEqual(group.operations.map(row => row.matrix.flat().join(',')).sort(),
    sameSource.operations.map(row => row.rotation.flat().join(',')).sort());
  const counts = Object.fromEntries(operationCategories.map(category => [category, 0]));
  for (const operation of group.operations) {
    assert(/^op-\d{2}$/.test(operation.id));
    const atlasOperation = sameAtlas.operations.find(record => record.fractionalMatrix.flat().join(',') === operation.matrix.flat().join(','));
    assert.deepEqual(operation.cartesianMatrix, atlasOperation.matrix);
    const expected = expectedType(operation.matrix);
    assert.deepEqual(analyzeOperation(operation.matrix), expected, `${group.hm} ${operation.id}`);
    counts[expected.category]++;
  }
  assert.deepEqual(group.counts, counts);
  assert(!idBySignature.has(signature(group)), `Unexpected common signature for ${group.hm}`);
  idBySignature.set(signature(group), group.id);

  const entireSet = analyzeEvidence(groups, group.operations, {complete: true, groupOrder: group.order});
  assert(entireSet.validComplete && entireSet.containsIdentity && entireSet.closed);
  assert.deepEqual(entireSet.counts, counts);
  assert.deepEqual(entireSet.candidateIds, [group.id]);
  assert.deepEqual(analyzeEvidence(groups, group.operations.slice().reverse(), {complete: true}).candidateIds, [group.id]);
  const changedBasis = group.operations.map(({id, matrix}) => {
    // This evaluates S R S^-1 with shear S taking x' = x + y.
    const [x, y, z] = matrix;
    const [a, b, c] = x.map((value, i) => value + y[i]);
    return {id, matrix: [[a, b - a, c], [y[0], y[1] - y[0], y[2]], [z[0], z[1] - z[0], z[2]]]};
  });
  assert.deepEqual(analyzeEvidence(groups, changedBasis, {complete:true}).candidateIds, [group.id]);
}

assert.equal(spaceGroups.length, 230);
for (const group of spaceGroups) {
  // Classify all exact BC linear parts, independent of translations and atlas order.
  const distinct = [...new Map(group.operations.map(({rotation}) => [rotation.flat().join(','), rotation])).values()];
  const observed = distinct.map((matrix, index) => ({id:`row-${index}`,matrix}));
  const analysis = analyzeEvidence(groups, observed, {complete: true});
  assert.deepEqual(analysis.candidateIds, [group.pointGroupNumber], group.symbol);
}

const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const inversion = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]];
const mirror = [[1, 0, 0], [0, 1, 0], [0, 0, -1]];
assert.equal(analyzeOperation(inversion).category, 'improper-1');
assert.equal(analyzeOperation(mirror).category, 'improper-2');
assert.equal(analyzeOperation(inversion).order, analyzeOperation(mirror).order);
const improperThree = byName['-3'].operations.find(row => analyzeOperation(row.matrix).category === 'improper-3');
const improperSix = byName['-6'].operations.find(row => analyzeOperation(row.matrix).category === 'improper-6');
assert.equal(analyzeOperation(improperThree.matrix).order, 6);
assert.equal(analyzeOperation(improperSix.matrix).order, 6);
assert.notEqual(analyzeOperation(improperThree.matrix).trace, analyzeOperation(improperSix.matrix).trace);

// Closed partial observations can embed in several candidates even when their own
// exact matrix set is a subgroup. Matrix count is restricted only by an explicit clue.
const partial = byName.mm2.operations.slice(0, 2);
const subset = analyzeEvidence(groups, partial, {groupOrder: 4});
assert(subset.closed && subset.containsIdentity && !subset.validComplete);
assert.deepEqual(subset.candidateIds, ['2/m','222','mm2','4','-4'].map(name => byName[name].id));
assert.deepEqual(analyzeEvidence(groups, partial, {complete:true}).candidateIds, [byName['2'].id]);
assert.deepEqual(analyzeEvidence(groups, partial, {complete:true, groupOrder:4}).candidateIds, []);
assert.deepEqual(analyzeEvidence(groups, byName.mm2.operations, {complete:true}).candidateIds, [byName.mm2.id]);
const unclosed = analyzeEvidence(groups, byName['4'].operations.filter(row => analyzeOperation(row.matrix).category !== 'proper-2'), {complete:true});
assert(unclosed.containsIdentity && !unclosed.closed && !unclosed.validComplete);
assert.deepEqual(unclosed.candidateIds, []);
const missingIdentity = analyzeEvidence(groups, [{id:'i',matrix:inversion}], {complete:true});
assert(!missingIdentity.containsIdentity && !missingIdentity.validComplete);
assert.deepEqual(analyzeEvidence(groups, [], {}).candidateIds, groups.map(group => group.id));
assert.deepEqual(analyzeEvidence(groups, [{id:'i',matrix:inversion}], {groupOrder:2}).candidateIds, [byName['-1'].id]);
assert.deepEqual(analyzeEvidence(groups, [{id:'s',matrix:mirror}], {groupOrder:2}).candidateIds, [byName.m.id]);
assert.throws(() => analyzeEvidence(groups, [{id:'first',matrix:I}, {id:'second',matrix:I}]), /same operation/);
assert.throws(() => analyzeEvidence(groups, [{id:'a',matrix:I}, {id:'a',matrix:mirror}]), /distinct/);
assert.throws(() => analyzeEvidence(groups, [], {groupOrder:2.5}), /integer/);
assert.throws(() => analyzeOperation([[1,1,0],[0,1,0],[0,0,1]]), /finite order/);
assert.throws(() => analyzeOperation([[1,0,0],[0,2,0],[0,0,1]]), /determinant/);
assert.throws(() => analyzeOperation([[1,0,0],[0,1,0],[0,.5,1]]), /integer/);

for (const exercise of exercises) {
  assert(/^case-\d{2}$/.test(exercise.id));
  const group = groups.find(row => row.id === exercise.groupId);
  assert(exercise.initialCount >= 1 && exercise.initialCount <= group.order);
  let previousCandidates = groups.map(candidate => candidate.id);
  for (let revealed = 1; revealed <= group.order; revealed++) {
    const {candidateIds} = analyzeEvidence(groups, group.operations.slice(0,revealed));
    assert(candidateIds.includes(group.id));
    assert(candidateIds.every(id => previousCandidates.includes(id)));
    previousCandidates = candidateIds;
  }
}
console.log('Point-group evidence: 32 exact signatures, 230 BC comparisons, basis changes, incomplete and invalid observations.');
