import {analyzeOperation} from './pointgroup-identify-core.js?v=20261119-pointgroups1';

const denominator = 12;
const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const latticeOrigin = [0, 0, 0];
const key = rotation => rotation.flat().join(',');
const identityKey = key(identity);
const integerVector = vector => Array.isArray(vector) && vector.length === 3 && [...vector].every(Number.isSafeInteger);
const mod4 = value => ((value % 4) + 4) % 4;

function toTwelfths(translation) {
  if (!Array.isArray(translation) || translation.length !== 3) {
    throw new TypeError('Expected three BC primitive fractional translation coordinates.');
  }
  return [...translation].map(value => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('The supplied BC representative translation must lie in [0,1).');
    }
    const numerator = Math.round(denominator * value);
    if (value !== numerator / denominator) {
      throw new RangeError('The supplied BC representative translation must round-trip exactly in twelfths.');
    }
    return numerator;
  });
}

function scalarProduct(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function applyRotation(rotation, vector) {
  return rotation.map(row => scalarProduct(row, vector));
}

function transpose(matrix) {
  return [0, 1, 2].map(column => matrix.map(row => row[column]));
}

function multiplyRotations(left, right) {
  const columns = transpose(right);
  return left.map(row => columns.map(column => scalarProduct(row, column)));
}

function affineProduct(left, right, byRotation) {
  // Active column coordinates. The right operation acts first.
  const rotation = multiplyRotations(left.rotation, right.rotation);
  const representative = byRotation.get(key(rotation));
  if (!representative) throw new RangeError('The supplied linear parts are not closed.');
  const acted = applyRotation(left.rotation, right.translationTwelfths);
  const translationTwelfths = left.translationTwelfths.map((value, index) => value + acted[index]);
  const latticeShift = translationTwelfths.map((value, index) => {
    const difference = value - representative.translationTwelfths[index];
    if (difference % denominator !== 0) throw new RangeError('The supplied Seitz representatives are not closed modulo the lattice.');
    return difference / denominator;
  });
  return {representativeIndex: representative.index, rotation: representative.rotation, translationTwelfths, latticeShift};
}

/** Prepare one ordinary BC group. The table records the exact product
 * g h = {I|L} representative(gh), with integer primitive-lattice shift L.
 * The supplied BC representative set has one selected row per linear part.
 */
export function analyzeSeitzGroup(group) {
  if (!group || !Number.isInteger(group.number) || group.number < 1 || group.number > 230 ||
       typeof group.symbol !== 'string' || !group.symbol || typeof group.pointGroup !== 'string' || !group.pointGroup ||
       !Number.isInteger(group.pointGroupNumber) || group.pointGroupNumber < 1 || group.pointGroupNumber > 32 ||
       !Array.isArray(group.operations) || group.operations.length < 1 || group.operations.length > 48) {
    throw new TypeError('Expected an ordinary BC space-group row with 1 to 48 primitive representatives.');
  }

  const operations = [...group.operations].map((row, index) => {
    if (!row || (row.antiunitary !== undefined && row.antiunitary !== false) || typeof row.name !== 'string' || !row.name) {
      throw new TypeError('Expected a named ordinary point operation.');
    }
    analyzeOperation(row.rotation);
    return {index, name: row.name, rotation: row.rotation.map(axis => axis.slice()), translationTwelfths: toTwelfths(row.translation)};
  });
  const byRotation = new Map(operations.map(op => [key(op.rotation), op]));
  if (byRotation.size !== operations.length) throw new RangeError('BC representatives must have distinct linear parts.');
  const identityOperation = byRotation.get(identityKey);
  if (!identityOperation || identityOperation.translationTwelfths.some(value => value !== 0)) {
    throw new RangeError('The exact identity {I|0} is required.');
  }

  let nonzeroShiftCount = 0;
  const table = operations.map(left => operations.map(right => {
    const product = affineProduct(left, right, byRotation);
    if (product.latticeShift.some(value => value !== 0)) nonzeroShiftCount++;
    return {leftIndex: left.index, rightIndex: right.index, ...product};
  }));
  return {groupNumber: group.number, symbol: group.symbol, pointGroup: group.pointGroup,
    pointGroupNumber: group.pointGroupNumber, denominator, identityIndex: identityOperation.index,
    operations, table, orderedPairCount: operations.length ** 2, nonzeroShiftCount};
}

/** Evaluate the active translation T_L on a Bloch fibre with k in quarters. */
export function phaseForShift(latticeShift, kQuarter) {
  if (!integerVector(latticeShift) || !integerVector(kQuarter)) {
    throw new TypeError('Expected an integer lattice shift and a reciprocal fractional vector in quarters.');
  }
  const quarterTurns = mod4(-scalarProduct(latticeShift.map(mod4), kQuarter.map(mod4)));
  const [re, im] = [[1, 0], [0, 1], [-1, 0], [0, -1]][quarterTurns];
  return {quarterTurns, re, im};
}

/** Reciprocal k is fixed modulo integers exactly when R^T k equals k modulo 1. */
export function fixesMomentum(rotation, kQuarter) {
  if (!integerVector(kQuarter)) throw new TypeError('Expected a reciprocal fractional vector in quarters.');
  analyzeOperation(rotation);
  const point = kQuarter.map(mod4);
  return applyRotation(transpose(rotation), point).every((value, index) => mod4(value - point[index]) === 0);
}

function operationAt(analysis, index) {
  if (!Number.isInteger(index) || index < 0 || index >= analysis.operations.length) {
    throw new RangeError('Operation index is outside the selected BC table.');
  }
  return analysis.operations[index];
}

/** Inspect a left/right product. The phase is on the declared k fibre.
 * Treat it as a fixed-k multiplication factor when both factors fix momentum.
 */
export function inspectPair(analysis, leftIndex, rightIndex, {kQuarter = null} = {}) {
  const left = operationAt(analysis, leftIndex);
  const right = operationAt(analysis, rightIndex);
  const product = analysis.table[leftIndex][rightIndex];
  const phase = kQuarter === null ? null : phaseForShift(product.latticeShift, kQuarter);
  const atFixedMomentum = kQuarter === null ? null : fixesMomentum(left.rotation, kQuarter) && fixesMomentum(right.rotation, kQuarter);
  return {...product, phase, fixesMomentum: atFixedMomentum};
}

/** Accumulate actual affine powers without wrapping at any intermediate step. */
export function traceSeitzPower(analysis, operationIndex, {kQuarter = null} = {}) {
  const operation = operationAt(analysis, operationIndex);
  const {order} = analyzeOperation(operation.rotation);
  const byRotation = new Map(analysis.operations.map(item => [key(item.rotation), item]));
  let current = {rotation: identity, translationTwelfths: latticeOrigin};
  const steps = [];
  for (let power = 1; power <= order; power++) {
    const product = affineProduct(operation, current, byRotation);
    const phase = kQuarter === null ? null : phaseForShift(product.latticeShift, kQuarter);
    const atFixedMomentum = kQuarter === null ? null : fixesMomentum(product.rotation, kQuarter);
    steps.push({power, ...product, phase, fixesMomentum: atFixedMomentum});
    current = product;
  }
  const atFixedMomentum = kQuarter === null ? null : fixesMomentum(operation.rotation, kQuarter);
  return {operationIndex, order, steps, fixesMomentum: atFixedMomentum};
}
