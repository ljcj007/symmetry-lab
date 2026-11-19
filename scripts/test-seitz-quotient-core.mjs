import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  analyzeSeitzGroup, fixesMomentum, inspectPair, phaseForShift, traceSeitzPower,
} from '../dist/seitz-quotient-core.js';

const data = JSON.parse(readFileSync(new URL('../dist/data/space-groups.json', import.meta.url), 'utf8'));
const pointgroupData = JSON.parse(readFileSync(new URL('../dist/data/pointgroup-identify.json', import.meta.url), 'utf8'));
const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const origin = [0, 0, 0];
const denominator = 12;

// Apply the literal source operators sequentially to the origin and all
// three unit offsets in twelfth-cell units. This checks the product table
// via action rather than using the module's Seitz multiplication formula.
function act(sourceOperation, point) {
  const {rotation, translation} = sourceOperation;
  return rotation.map((row, i) => row.reduce((value, element, j) => value + element * point[j], Math.round(translation[i] * denominator)));
}

const controls = new Map();
let rowCount = 0, pairCount = 0, nonzeroShiftCount = 0;
assert.equal(data.groups.length, 230);
for (const sourceGroup of data.groups) {
  const group = analyzeSeitzGroup(sourceGroup);
  rowCount += group.operations.length;
  pairCount += group.orderedPairCount;
  nonzeroShiftCount += group.nonzeroShiftCount;
  assert.equal(group.denominator, denominator);
  const atlasGroup = pointgroupData.groups.find(pointGroup => pointGroup.id === group.pointGroupNumber);
  assert.equal(atlasGroup.order, group.operations.length);
  assert.equal(atlasGroup.schoenflies, group.pointGroup);
  assert.deepEqual(group.operations[group.identityIndex].rotation, identity);
  assert.deepEqual(group.operations[group.identityIndex].translationTwelfths, origin);
  for (const [i, products] of group.table.entries()) {
    for (const [j, product] of products.entries()) {
      assert.equal(product.leftIndex, i);
      assert.equal(product.rightIndex, j);
      const a = sourceGroup.operations[i], b = sourceGroup.operations[j];
      const chosen = sourceGroup.operations[product.representativeIndex];
      const resultAtOrigin = act(a, act(b, origin));
      assert.deepEqual(product.translationTwelfths, resultAtOrigin);
      const expectedTranslation = act(chosen, origin);
      assert.deepEqual(product.latticeShift.map(value => value * denominator),
        resultAtOrigin.map((value, axis) => value - expectedTranslation[axis]));
      assert(product.latticeShift.every(Number.isInteger));
      for (const [axis, offset] of identity.entries()) {
        const resultAtOffset = act(a, act(b, offset));
        assert.deepEqual(product.rotation.map(row => row[axis]), resultAtOffset.map((value, row) => value - resultAtOrigin[row]));
      }
      assert.deepEqual(product.rotation, chosen.rotation);
    }
  }
  if ([3, 4, 6, 7, 19, 75, 76, 77, 78, 144, 169, 227].includes(group.groupNumber)) controls.set(group.groupNumber, group);
}
assert.equal(rowCount, 2609);
assert.equal(pairCount, 52381);
assert.equal(nonzeroShiftCount, 15636);

const index = (number, name) => {
  const operation = controls.get(number).operations.find(op => op.name === name);
  assert(operation, `${number} ${name}`);
  return operation.index;
};
const trace = (number, name, kQuarter) => traceSeitzPower(controls.get(number), index(number, name), {kQuarter});
const pair = (number, left, right, kQuarter) => inspectPair(controls.get(number), index(number, left), index(number, right), {kQuarter});
const atGamma = [0, 0, 0], halfZ = [0, 0, 2], quarterZ = [0, 0, 1];
const unit = {quarterTurns: 0, re: 1, im: 0}, negative = {quarterTurns: 2, re: -1, im: 0};
const negativeI = {quarterTurns: 3, re: 0, im: -1}, positiveI = {quarterTurns: 1, re: 0, im: 1};

// #3 P2 and #4 P21 use equal BC linear parts in the same basis.
assert.deepEqual(controls.get(3).operations.map(op => op.rotation), controls.get(4).operations.map(op => op.rotation));
assert.deepEqual(pair(3, 'C2z', 'C2z', halfZ).latticeShift, origin);
assert.deepEqual(pair(4, 'C2z', 'C2z', halfZ).latticeShift, [0, 0, 1]);
assert.deepEqual(pair(3, 'C2z', 'C2z', halfZ).phase, unit);
assert.deepEqual(pair(4, 'C2z', 'C2z', halfZ).phase, negative);
assert.deepEqual(pair(4, 'C2z', 'C2z', atGamma).phase, unit);
assert.deepEqual(pair(4, 'C2z', 'C2z', quarterZ).phase, negativeI);
assert.equal(pair(4, 'C2z', 'C2z').phase, null);
assert.equal(pair(4, 'C2z', 'C2z').fixesMomentum, null);
assert.deepEqual(trace(4, 'C2z', quarterZ).steps.map(step => step.translationTwelfths), [[0, 0, 6], [0, 0, 12]]);

// #6 Pm and #7 Pc share the mirror linear part. The latter's square gives a primitive x shift.
assert.deepEqual(controls.get(6).operations.map(op => op.rotation), controls.get(7).operations.map(op => op.rotation));
assert.deepEqual(pair(6, 'mz', 'mz', [2, 0, 0]).latticeShift, origin);
assert.deepEqual(pair(7, 'mz', 'mz', [2, 0, 0]).latticeShift, [1, 0, 0]);
assert.deepEqual(pair(7, 'mz', 'mz', [2, 0, 0]).phase, negative);
assert.deepEqual(pair(7, 'mz', 'mz', [1, 0, 0]).phase, negativeI);

// The full affine path continues accumulating through representatives with wraparound.
assert.equal(trace(76, 'C4z+', quarterZ).order, 4);
assert.deepEqual(trace(76, 'C4z+', quarterZ).steps.map(step => step.translationTwelfths[2]), [3, 6, 9, 12]);
assert.deepEqual(trace(77, 'C4z+', quarterZ).steps.map(step => step.translationTwelfths[2]), [6, 12, 18, 24]);
assert.deepEqual(trace(77, 'C4z+', quarterZ).steps.map(step => step.latticeShift[2]), [0, 1, 1, 2]);
assert.deepEqual(trace(78, 'C4z+', quarterZ).steps.map(step => step.translationTwelfths[2]), [9, 18, 27, 36]);
assert.deepEqual(trace(75, 'C4z+', quarterZ).steps.at(-1).phase, unit);
assert.deepEqual(trace(76, 'C4z+', halfZ).steps.at(-1).phase, negative);
assert.deepEqual(trace(77, 'C4z+', halfZ).steps.at(-1).phase, unit);
assert.deepEqual(trace(144, 'C3+', halfZ).steps.map(step => step.translationTwelfths[2]), [4, 8, 12]);
assert.deepEqual(trace(169, 'C6+', halfZ).steps.map(step => step.translationTwelfths[2]), [2, 4, 6, 8, 10, 12]);

// #19 P212121 has commuting linear parts for these two rotations but distinct affine products.
const xAfterY = pair(19, 'C2x', 'C2y', halfZ), yAfterX = pair(19, 'C2y', 'C2x', halfZ);
assert.equal(xAfterY.representativeIndex, index(19, 'C2z'));
assert.equal(yAfterX.representativeIndex, xAfterY.representativeIndex);
assert.deepEqual(xAfterY.translationTwelfths, [-6, 12, 6]);
assert.deepEqual(yAfterX.translationTwelfths, [6, 0, -6]);
assert.deepEqual(xAfterY.latticeShift, [-1, 1, 0]);
assert.deepEqual(yAfterX.latticeShift, [0, 0, -1]);
assert(xAfterY.fixesMomentum && yAfterX.fixesMomentum);
assert.deepEqual(xAfterY.phase, unit);
assert.deepEqual(yAfterX.phase, negative);
assert.deepEqual(pair(19, 'C2y', 'C2x', quarterZ).phase, positiveI);
assert.equal(pair(19, 'C2y', 'C2x', quarterZ).fixesMomentum, false);
assert.equal(pair(19, 'C2y', 'C2x', atGamma).fixesMomentum, true);

// An off-axis 3D k changes under R. The translation still acts on the
// selected k fibre and the completed power with identity linear part fixes it.
const offAxis = [1, 2, 1];
const C4z = controls.get(76).operations[index(76, 'C4z+')].rotation;
assert.equal(fixesMomentum(C4z, offAxis), false);
assert.equal(fixesMomentum(C4z, [2, 2, 1]), true);
assert.equal(fixesMomentum(C4z, [1, 2, 5]), false);
assert.equal(fixesMomentum(C4z, quarterZ), true);
const offAxisTrace = trace(76, 'C4z+', offAxis);
assert.equal(offAxisTrace.fixesMomentum, false);
assert.equal(offAxisTrace.steps[0].fixesMomentum, false);
assert.equal(offAxisTrace.steps.at(-1).fixesMomentum, true);
assert.deepEqual(offAxisTrace.steps.at(-1).phase, negativeI);

// #227 contains a nonzero representative t even though this inversion has a fixed point.
const displacedInversion = trace(227, 'I', quarterZ);
assert.deepEqual(displacedInversion.steps[0].translationTwelfths, [3, 3, 3]);
assert.deepEqual(displacedInversion.steps.at(-1).translationTwelfths, origin);
assert.deepEqual(displacedInversion.steps.at(-1).latticeShift, origin);
assert.deepEqual(displacedInversion.steps.at(-1).phase, unit);

assert.deepEqual(phaseForShift([0, 1, 0], [8, -1, -8]), positiveI);
assert.throws(() => phaseForShift([1, 0, 0], [1/2, 0, 0]), /quarters/);
assert.throws(() => inspectPair(controls.get(4), 2, 1), /index/);
const badSource = edit => {
  const group = structuredClone(data.groups[3]);
  edit(group.operations);
  return group;
};
assert.throws(() => analyzeSeitzGroup(badSource(rows => { rows[1].translation[2] = .5000000000000001; })), /round-trip/);
assert.throws(() => analyzeSeitzGroup(badSource(rows => { rows[1].translation[2] = 1/4; })), /closed modulo/);
assert.throws(() => analyzeSeitzGroup(badSource(rows => { rows[1].rotation = rows[0].rotation; })), /distinct linear parts/);
assert.throws(() => analyzeSeitzGroup(badSource(rows => { rows[1].antiunitary = true; })), /ordinary/);
assert.throws(() => analyzeSeitzGroup(badSource(rows => { rows.shift(); })), /identity/);

console.log('Seitz quotient: 230 groups, 2,609 representatives, all 52,381 ordered affine products; screw, glide and exact Bloch controls.');
