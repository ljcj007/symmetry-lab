const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotationOrders = [1, 2, 3, 4, 6];
const maxGroupOrder = 48;

export const operationCategories = Object.freeze([
  ...rotationOrders.map(order => `proper-${order}`),
  ...rotationOrders.map(order => `improper-${order}`),
]);

const matrixKey = matrix => matrix.flat().join(',');
const identityKey = matrixKey(identity);

function multiply(left, right) {
  return left.map(row => [0, 1, 2].map(column =>
    row[0] * right[0][column] + row[1] * right[1][column] + row[2] * right[2][column],
  ));
}

function determinantOf([[a, b, c], [d, e, f], [g, h, i]]) {
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function orderOf(matrix) {
  let power = identity;
  for (let order = 1; order <= 6; order++) {
    power = multiply(power, matrix);
    if (matrixKey(power) === identityKey) return order;
  }
  return null;
}

/** Analyze the integer fractional-basis matrix of one ordinary point operation. */
export function analyzeOperation(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 3 || ![...matrix].every(row =>
    Array.isArray(row) && row.length === 3 && [...row].every(n => Number.isInteger(n) && Math.abs(n) <= 16),
  )) {
    throw new TypeError('Expected a 3×3 integer operation with entries from −16 to 16.');
  }
  // The entry bound keeps all products through the sixth power exact as JS integers.
  const determinant = determinantOf(matrix);
  if (Math.abs(determinant) !== 1) throw new RangeError('Operation determinant must be +1 or −1.');
  const order = orderOf(matrix);
  const properPart = determinant === 1 ? matrix : matrix.map(row => row.map(value => -value));
  const rotationOrder = determinant === 1 ? order : orderOf(properPart);
  if (!rotationOrders.includes(order) || !rotationOrders.includes(rotationOrder)) {
    throw new RangeError('Operation must have crystallographic finite order.');
  }
  const trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
  const category = `${determinant === 1 ? 'proper' : 'improper'}-${rotationOrder}`;
  return {determinant, trace, order, rotationOrder, category};
}

/** Compare a collection of distinct observed operations with the fixed 32-type catalog.
 * Incomplete observations constrain minimum counts only, even if the subset itself closes.
 * Complete observations must close, contain the identity and match all counts.
 * A compatible type for incomplete evidence is not a realized embedding of the observed matrices.
 */
export function analyzeEvidence(groups, operations, {complete = false, groupOrder = null} = {}) {
  if (!Array.isArray(operations) || operations.length > maxGroupOrder || typeof complete !== 'boolean') {
    throw new TypeError('Expected at most 48 observed operations and a boolean completeness claim.');
  }
  if (groupOrder !== null && (!Number.isInteger(groupOrder) || groupOrder < 1 || groupOrder > maxGroupOrder)) {
    throw new RangeError('Known group order must be an integer from 1 to 48.');
  }
  const matrices = new Set();
  const ids = new Set();
  const counts = Object.fromEntries(operationCategories.map(category => [category, 0]));
  const entries = operations.map(({id, matrix}) => {
    if (typeof id !== 'string' || !id || ids.has(id)) throw new TypeError('Observation IDs must be distinct.');
    ids.add(id);
    const result = analyzeOperation(matrix);
    const key = matrixKey(matrix);
    if (matrices.has(key)) throw new RangeError('Repeated matrices are the same operation.');
    matrices.add(key);
    counts[result.category]++;
    return {id, matrix, ...result};
  });
  const observedOrder = entries.length;
  const containsIdentity = matrices.has(identityKey);
  const closed = observedOrder > 0 && entries.every(a => entries.every(b =>
    matrices.has(matrixKey(multiply(a.matrix, b.matrix))),
  ));
  const validComplete = complete && containsIdentity && closed && (groupOrder === null || observedOrder === groupOrder);
  const candidateIds = groups.filter(group => {
    if (group.order < observedOrder || (groupOrder !== null && group.order !== groupOrder)) return false;
    if (complete) {
      return validComplete && group.order === observedOrder &&
        operationCategories.every(category => group.counts[category] === counts[category]);
    }
    return operationCategories.every(category => group.counts[category] >= counts[category]);
  }).map(group => group.id);
  return {counts, entries, candidateIds, complete, validComplete, groupOrder, observedOrder, closed, containsIdentity};
}
