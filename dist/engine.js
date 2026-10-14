/**
 * Symmetry Lab: numerical little-group representation engine, entirely in ES2022.
 *
 * Coordinates: rotation acts on a column of primitive direct-lattice fractions;
 * k is a column of primitive reciprocal fractions (without a factor of 2π).
 * An operation is {rotation:number[3][3], translation:number[3],
 * antiunitary?:boolean, name?:string, spinRotation?:complex[2][2]}.
 * Complex inputs accept [re,im], {re,im}, or a real number; outputs are {re,im}.
 * `basis`, when supplied, consists of three Cartesian primitive lattice ROWS.
 *
 * D(g) K^a(g) D(h) K^a(h) = factor(g,h) D(gh) K^a(gh).
 * Factors combine exp(-2π i k·latticeDefect), the spatial SU(2) section sign,
 * and (for spinful antiunitary products) time reversal squared = -1.
 * Numerical D1, D2, ... labels are NOT BC/CDML/Bilbao labels. Irrep bases and
 * matrices are numerical and need not equal a published gauge.
 */

const EPS = 1e-8;
const TWO_PI = 2 * Math.PI;
export const IDENTITY3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const Z = (re = 0, im = 0) => ({ re: Math.abs(re) < 1e-14 ? 0 : re, im: Math.abs(im) < 1e-14 ? 0 : im });
const C = z => typeof z === 'number' ? Z(z) : Array.isArray(z) ? Z(z[0], z[1]) : Z(z.re, z.im);
const add = (a, b) => Z(a.re + b.re, a.im + b.im);
const sub = (a, b) => Z(a.re - b.re, a.im - b.im);
const mul = (a, b) => Z(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const conj = a => Z(a.re, -a.im);
const scale = (a, b) => Z(a.re * b, a.im * b);
const abs = a => Math.hypot(a.re, a.im);
const div = (a, b) => scale(mul(a, conj(b)), 1 / (b.re * b.re + b.im * b.im));
const phase = angle => Z(Math.cos(angle), Math.sin(angle));
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const mod1 = x => { const v = x - Math.floor(x); return v < EPS || 1 - v < EPS ? 0 : v; };
const centered = x => { const v = x - Math.round(x); return Math.abs(v) < EPS ? 0 : v; };
const near = (a, b, tolerance = EPS) => Math.abs(a - b) < tolerance;
const equivalentK = (a, b) => a.every((v, i) => near(v - b[i], Math.round(v - b[i])));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function finiteVector(v, name) {
  assert(Array.isArray(v) && v.length === 3 && v.every(Number.isFinite), `${name} must contain three finite numbers.`);
  return v.slice();
}
export function determinant3(a) {
  return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
}
export function transpose3(a) { return a[0].map((_, j) => a.map(row => row[j])); }
export function multiply3(a, b) { return a.map(row => b[0].map((_, j) => dot(row, b.map(r => r[j])))); }
export function apply3(a, v) { return a.map(row => dot(row, v)); }
export function inverse3(a) {
  const det = determinant3(a);
  assert(Math.abs(det) > 1e-12, 'Singular lattice/rotation matrix.');
  return [
    [a[1][1] * a[2][2] - a[1][2] * a[2][1], a[0][2] * a[2][1] - a[0][1] * a[2][2], a[0][1] * a[1][2] - a[0][2] * a[1][1]],
    [a[1][2] * a[2][0] - a[1][0] * a[2][2], a[0][0] * a[2][2] - a[0][2] * a[2][0], a[0][2] * a[1][0] - a[0][0] * a[1][2]],
    [a[1][0] * a[2][1] - a[1][1] * a[2][0], a[0][1] * a[2][0] - a[0][0] * a[2][1], a[0][0] * a[1][1] - a[0][1] * a[1][0]],
  ].map(row => row.map(v => v / det));
}

function normalizeOperations(operations) {
  assert(Array.isArray(operations) && operations.length > 0, 'A nonempty finite set of Seitz representatives is required.');
  assert(operations.length <= 384, 'At most 384 representatives are supported in one browser calculation.');
  return operations.map((op, index) => {
    assert(Array.isArray(op.rotation) && op.rotation.length === 3 && op.rotation.every(row => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite)), `Invalid rotation at operation ${index + 1}.`);
    assert(op.rotation.flat().every(x => near(x, Math.round(x), 2e-6)), 'Rotations must be expressed in a primitive fractional lattice basis with integer entries.');
    const rotation = op.rotation.map(row => row.map(Math.round));
    assert(near(Math.abs(determinant3(rotation)), 1), `Rotation ${index + 1} is not unimodular.`);
    return { ...op, rotation, translation: finiteVector(op.translation ?? [0, 0, 0], 'Translation').map(mod1), antiunitary: Boolean(op.antiunitary), name: op.name || `g${index + 1}` };
  });
}

/** Seitz product without reducing the resulting translation. */
export function seitzProduct(g, h) {
  return { rotation: multiply3(g.rotation, h.rotation), translation: apply3(g.rotation, h.translation).map((v, i) => v + g.translation[i]), antiunitary: Boolean(g.antiunitary) !== Boolean(h.antiunitary) };
}
export function reciprocalAction(operation, k) {
  const sign = operation.antiunitary ? -1 : 1;
  return apply3(transpose3(inverse3(operation.rotation)), k).map(x => sign * x);
}
/** k-star arms use fractions in [-1/2,1/2); operationIndices refer to input. */
export function computeStar(operations, k) {
  finiteVector(k, 'k');
  const star = [];
  operations.forEach((op, index) => {
    const v = reciprocalAction(op, k);
    const previous = star.find(arm => equivalentK(v, arm.k));
    if (previous) previous.operationIndices.push(index);
    else star.push({ k: v.map(centered), operationIndices: [index] });
  });
  return star;
}
function operationKey(op) { return `${op.antiunitary ? 1 : 0}:${op.rotation.flat().map(x => Math.round(x)).join(',')}`; }

/** Quotient by primitive integer translations; throws on duplicates/nonclosure. */
export function buildMultiplicationTable(input) {
  const operations = normalizeOperations(input), n = operations.length;
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const key = operationKey(operations[i]);
    const bucket = buckets.get(key) || [];
    assert(!bucket.some(j => equivalentK(operations[i].translation, operations[j].translation)), `Duplicate Seitz representatives ${bucket.find(j => equivalentK(operations[i].translation, operations[j].translation)) + 1} and ${i + 1}.`);
    bucket.push(i); buckets.set(key, bucket);
  }
  const table = Array.from({ length: n }, () => new Array(n));
  const translationDefects = Array.from({ length: n }, () => new Array(n));
  for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) {
    const product = seitzProduct(operations[g], operations[h]);
    const match = (buckets.get(operationKey(product)) || []).find(j => equivalentK(product.translation, operations[j].translation));
    assert(match !== undefined, `Operations are not closed modulo primitive translations: ${g + 1} × ${h + 1}. Check lattice coordinates.`);
    table[g][h] = match;
    translationDefects[g][h] = product.translation.map((x, i) => Math.round(x - operations[match].translation[i]));
  }
  const identity = operations.findIndex(op => !op.antiunitary && op.rotation.every((row, i) => row.every((v, j) => v === (i === j ? 1 : 0))) && op.translation.every(v => near(v, 0)));
  assert(identity >= 0, 'The quotient group has no identity representative.');
  const inverses = table.map(row => row.indexOf(identity));
  assert(inverses.every(x => x >= 0), 'A representative has no inverse.');
  return { operations, table, multiplicationTable: table, translationDefects, identity, inverses };
}

function zeroMatrix(n, m = n) { return Array.from({ length: n }, () => Array.from({ length: m }, () => Z())); }
function identityMatrix(n) { const a = zeroMatrix(n); for (let i = 0; i < n; i++) a[i][i] = Z(1); return a; }
function matrixMultiply(a, b) {
  const out = zeroMatrix(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b[0].length; j++) {
    let re = 0, im = 0;
    for (let k = 0; k < b.length; k++) { re += a[i][k].re * b[k][j].re - a[i][k].im * b[k][j].im; im += a[i][k].re * b[k][j].im + a[i][k].im * b[k][j].re; }
    out[i][j] = Z(re, im);
  }
  return out;
}
function matrixScale(a, z) { return a.map(row => row.map(v => mul(v, z))); }
function matrixConjugate(a) { return a.map(row => row.map(conj)); }
function adjoint(a) { return a[0].map((_, j) => a.map(row => conj(row[j]))); }
function matrixError(a, b) { let error = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j < a[0].length; j++) error = Math.max(error, abs(sub(a[i][j], b[i][j]))); return error; }
function trace(a) { return a.reduce((sum, row, i) => add(sum, row[i]), Z()); }
function blockDiagonal(a, b) {
  const c = zeroMatrix(a.length + b.length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) c[i][j] = a[i][j];
  for (let i = 0; i < b.length; i++) for (let j = 0; j < b.length; j++) c[a.length + i][a.length + j] = b[i][j];
  return c;
}

/** SU(2) section from Cartesian proper rotations; improper R uses det(R)R. */
function spatialSpinMatrix(operation, basis) {
  if (operation.spinRotation) {
    assert(operation.spinRotation.length === 2 && operation.spinRotation.every(row => row.length === 2), 'Invalid supplied spatial spin matrix.');
    const m = operation.spinRotation.map(row => row.map(C));
    assert(matrixError(matrixMultiply(m, adjoint(m)), identityMatrix(2)) < 2e-4, 'Supplied spatial spin matrix is not unitary.');
    return m;
  }
  const cartBasis = transpose3(basis || IDENTITY3);
  let r = multiply3(multiply3(cartBasis, operation.rotation), inverse3(cartBasis));
  const orthogonal = multiply3(transpose3(r), r);
  assert(orthogonal.every((row, i) => row.every((v, j) => near(v, i === j ? 1 : 0, 2e-5))), 'Double-valued calculation needs Cartesian primitive basis vectors or supplied spatial spinRotation matrices.');
  const det = determinant3(r); r = r.map(row => row.map(x => x * det));
  let w, x, y, z;
  const tr = r[0][0] + r[1][1] + r[2][2];
  if (tr > 0) { const s = Math.sqrt(1 + tr) * 2; w = s / 4; x = (r[2][1] - r[1][2]) / s; y = (r[0][2] - r[2][0]) / s; z = (r[1][0] - r[0][1]) / s; }
  else if (r[0][0] > r[1][1] && r[0][0] > r[2][2]) { const s = Math.sqrt(1 + r[0][0] - r[1][1] - r[2][2]) * 2; w = (r[2][1] - r[1][2]) / s; x = s / 4; y = (r[0][1] + r[1][0]) / s; z = (r[0][2] + r[2][0]) / s; }
  else if (r[1][1] > r[2][2]) { const s = Math.sqrt(1 + r[1][1] - r[0][0] - r[2][2]) * 2; w = (r[0][2] - r[2][0]) / s; x = (r[0][1] + r[1][0]) / s; y = s / 4; z = (r[1][2] + r[2][1]) / s; }
  else { const s = Math.sqrt(1 + r[2][2] - r[0][0] - r[1][1]) * 2; w = (r[1][0] - r[0][1]) / s; x = (r[0][2] + r[2][0]) / s; y = (r[1][2] + r[2][1]) / s; z = s / 4; }
  const first = [w, x, y, z].find(v => Math.abs(v) > 1e-8);
  if (first < 0) { w *= -1; x *= -1; y *= -1; z *= -1; }
  // S = w I - i(x σx + y σy + z σz), conventional up/down basis.
  return [[Z(w, -z), Z(-y, -x)], [Z(y, -x), Z(w, z)]];
}

function makeFactors(group, k, doubleValued, basis) {
  const { operations, table, translationDefects } = group, n = operations.length;
  const spin = doubleValued ? operations.map(op => spatialSpinMatrix(op, basis)) : null;
  return Array.from({ length: n }, (_, g) => Array.from({ length: n }, (_, h) => {
    let sign = 1;
    if (spin) {
      const prod = matrixMultiply(spin[g], spin[h]);
      const plusError = matrixError(prod, spin[table[g][h]]);
      const minusError = matrixError(prod, matrixScale(spin[table[g][h]], Z(-1)));
      assert(Math.min(plusError, minusError) < 2e-4, `Spatial spin sections are inconsistent at ${g + 1} × ${h + 1}.`);
      sign = plusError < minusError ? 1 : -1;
      if (operations[g].antiunitary && operations[h].antiunitary) sign *= -1;
    }
    return scale(phase(-TWO_PI * dot(k, translationDefects[g][h])), sign);
  }));
}

function validateCocycle(table, factors, operations) {
  const n = table.length;
  let error = 0;
  for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) for (let l = 0; l < n; l++) {
    const lhs = mul(factors[g][h], factors[table[g][h]][l]);
    const rhs = mul(operations[g].antiunitary ? conj(factors[h][l]) : factors[h][l], factors[g][table[h][l]]);
    error = Math.max(error, abs(sub(lhs, rhs)));
  }
  assert(error < 2e-6, `The factor system fails the (antiunitary) cocycle law (${error}). Check k and primitive-lattice coordinates.`);
  return error;
}

function randomGenerator(seed) { let state = seed >>> 0; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; }; }

/** Complex Hermitian cyclic Jacobi eigensolver, with column eigenvectors. */
function hermitianEigen(realInput, imagInput, n) {
  const re = Float64Array.from(realInput), im = Float64Array.from(imagInput);
  const vr = new Float64Array(n * n), vi = new Float64Array(n * n);
  for (let i = 0; i < n; i++) vr[i * n + i] = 1;
  let converged = n <= 1, maxOff = 0;
  for (let sweep = 0; sweep < 80 && !converged; sweep++) {
    maxOff = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const pq = p * n + q, pp = p * n + p, qq = q * n + q;
      const b = Math.hypot(re[pq], im[pq]); maxOff = Math.max(maxOff, b);
      if (b < 1e-13) continue;
      const tau = (re[qq] - re[pp]) / (2 * b);
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c, er = re[pq] / b, ei = im[pq] / b;
      re[pp] -= t * b; re[qq] += t * b; re[pq] = 0; im[pq] = 0; re[q * n + p] = 0; im[q * n + p] = 0;
      for (let k = 0; k < n; k++) {
        if (k !== p && k !== q) {
          const kp = k * n + p, kq = k * n + q;
          const ar = re[kp], ai = im[kp], br = re[kq], bi = im[kq];
          re[kp] = c * ar - s * (er * br + ei * bi); im[kp] = c * ai - s * (er * bi - ei * br);
          re[kq] = s * (er * ar - ei * ai) + c * br; im[kq] = s * (er * ai + ei * ar) + c * bi;
          re[p * n + k] = re[kp]; im[p * n + k] = -im[kp]; re[q * n + k] = re[kq]; im[q * n + k] = -im[kq];
        }
        const kp = k * n + p, kq = k * n + q;
        const ar = vr[kp], ai = vi[kp], br = vr[kq], bi = vi[kq];
        vr[kp] = c * ar - s * (er * br + ei * bi); vi[kp] = c * ai - s * (er * bi - ei * br);
        vr[kq] = s * (er * ar - ei * ai) + c * br; vi[kq] = s * (er * ai + ei * ar) + c * bi;
      }
    }
    converged = maxOff < 1e-11;
  }
  assert(converged, `Hermitian diagonalization did not converge (off-diagonal residual ${maxOff}).`);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => re[a * n + a] - re[b * n + b]);
  return { values: order.map(i => re[i * n + i]), vectors: order.map(j => Array.from({ length: n }, (_, i) => Z(vr[i * n + j], vi[i * n + j]))), residual: maxOff };
}

function characterInner(a, b) { return scale(a.reduce((sum, v, i) => add(sum, mul(conj(C(v)), C(b[i]))), Z()), 1 / a.length); }
function projectedRegularMatrices(vectors, table, factors) {
  const n = table.length, d = vectors.length;
  return table.map((row, g) => {
    const out = zeroMatrix(d);
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) {
      let re = 0, im = 0;
      for (let h = 0; h < n; h++) {
        const left = vectors[a][row[h]], right = vectors[b][h], factor = factors[g][h];
        const r = factor.re * right.re - factor.im * right.im, i = factor.re * right.im + factor.im * right.re;
        re += left.re * r + left.im * i; im += left.re * i - left.im * r;
      }
      out[a][b] = Z(re, im);
    }
    return out;
  });
}

function validateRepresentation(matrices, table, factors, operations) {
  let productError = 0, unitarityError = 0;
  const d = matrices[0].length, identity = identityMatrix(d);
  for (let g = 0; g < table.length; g++) {
    unitarityError = Math.max(unitarityError, matrixError(matrixMultiply(matrices[g], adjoint(matrices[g])), identity));
    for (let h = 0; h < table.length; h++) {
      const lhs = matrixMultiply(matrices[g], operations?.[g]?.antiunitary ? matrixConjugate(matrices[h]) : matrices[h]);
      const rhs = matrixScale(matrices[table[g][h]], factors[g][h]);
      productError = Math.max(productError, matrixError(lhs, rhs));
    }
  }
  assert(productError < 2e-6 && unitarityError < 2e-6, `Representation validation failed (product ${productError}, unitarity ${unitarityError}).`);
  return { productError, unitarityError };
}

/**
 * Decompose a twisted regular representation of a UNITARY finite little group.
 * Arguments: {table, factors, identity}. Output: {irreps, validation}.
 * matrices[g] and characters[g] use the supplied table's operation ordering.
 */
export function calculateIrreps({ table, factors, identity = 0 }) {
  const n = table.length;
  assert(n > 0 && n <= 192, 'Unitary little group order must be between 1 and 192.');
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const rng = randomGenerator(173205 + attempt * 7919);
      const hr = new Float64Array(n * n), hi = new Float64Array(n * n);
      // Right multiplication commutes with the left twisted regular action.
      for (let h = 0; h < n; h++) {
        const ar = (rng() - 0.5) / Math.sqrt(n), ai = (rng() - 0.5) / Math.sqrt(n);
        for (let g = 0; g < n; g++) {
          const row = table[g][h], f = factors[g][h];
          const re = ar * f.re - ai * f.im, im = ar * f.im + ai * f.re;
          hr[row * n + g] += re; hi[row * n + g] += im;
          hr[g * n + row] += re; hi[g * n + row] -= im;
        }
      }
      const eig = hermitianEigen(hr, hi, n), blocks = [];
      for (let i = 0; i < n; i++) {
        const previous = blocks[blocks.length - 1];
        if (previous && Math.abs(eig.values[i] - previous.value) < 1e-7) previous.vectors.push(eig.vectors[i]);
        else blocks.push({ value: eig.values[i], vectors: [eig.vectors[i]] });
      }
      const irreps = [];
      for (const block of blocks) {
        const matrices = projectedRegularMatrices(block.vectors, table, factors);
        const characters = matrices.map(trace), dimension = block.vectors.length;
        assert(abs(sub(characterInner(characters, characters), Z(1))) < 2e-6, 'An accidental eigenspace degeneracy needs another commutant.');
        const equivalent = irreps.find(rep => abs(sub(characterInner(rep.characters, characters), Z(1))) < 2e-6);
        if (equivalent) equivalent.regularMultiplicity++;
        else irreps.push({ dimension, characters, matrices, regularMultiplicity: 1 });
      }
      assert(irreps.every(rep => rep.regularMultiplicity === rep.dimension), 'Twisted regular multiplicities do not equal dimensions.');
      const dimensionSquaredSum = irreps.reduce((s, rep) => s + rep.dimension ** 2, 0);
      assert(dimensionSquaredSum === n, `Incomplete irrep decomposition: Σd²=${dimensionSquaredSum}, expected ${n}.`);
      let characterOrthogonalityError = 0, productError = 0, unitarityError = 0;
      for (let a = 0; a < irreps.length; a++) {
        for (let b = 0; b < irreps.length; b++) characterOrthogonalityError = Math.max(characterOrthogonalityError, abs(sub(characterInner(irreps[a].characters, irreps[b].characters), Z(a === b ? 1 : 0))));
        const v = validateRepresentation(irreps[a].matrices, table, factors);
        productError = Math.max(productError, v.productError); unitarityError = Math.max(unitarityError, v.unitarityError);
      }
      assert(characterOrthogonalityError < 2e-6, 'Irrep character orthogonality failed.');
      irreps.sort((a, b) => {
        if (a.dimension !== b.dimension) return a.dimension - b.dimension;
        const trivialA = a.characters.every(z => abs(sub(z, Z(1))) < EPS), trivialB = b.characters.every(z => abs(sub(z, Z(1))) < EPS);
        if (trivialA !== trivialB) return trivialA ? -1 : 1;
        for (let i = 0; i < n; i++) { if (Math.abs(a.characters[i].re - b.characters[i].re) > 1e-7) return b.characters[i].re - a.characters[i].re; if (Math.abs(a.characters[i].im - b.characters[i].im) > 1e-7) return b.characters[i].im - a.characters[i].im; }
        return 0;
      });
      irreps.forEach((rep, i) => { rep.id = `D${i + 1}`; rep.label = rep.id; });
      return { irreps, validation: { groupOrder: n, dimensionSquaredSum, characterOrthogonalityError, productError, unitarityError, diagonalizationResidual: eig.residual, commutantAttempt: attempt + 1, passed: true } };
    } catch (error) { lastError = error; }
  }
  throw new Error(`Could not obtain a verified irrep decomposition: ${lastError?.message}`);
}

function findIntertwiner(a, b) {
  const d = a[0].length, rng = randomGenerator(314159);
  for (let trial = 0; trial < 8; trial++) {
    const seed = Array.from({ length: d }, () => Array.from({ length: d }, () => Z(rng() - 0.5, rng() - 0.5)));
    const sum = zeroMatrix(d);
    for (let h = 0; h < a.length; h++) {
      const term = matrixMultiply(matrixMultiply(a[h], seed), adjoint(b[h]));
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) sum[i][j] = add(sum[i][j], term[i][j]);
    }
    const norm = Math.sqrt(sum.flat().reduce((s, z) => s + z.re ** 2 + z.im ** 2, 0) / d);
    if (norm < 1e-7) continue;
    const u = matrixScale(sum, Z(1 / norm));
    if (matrixError(matrixMultiply(u, adjoint(u)), identityMatrix(d)) < 2e-6) return u;
  }
  throw new Error('Failed to construct a unitary intertwiner for a type-a corepresentation.');
}

function calculateCorepresentations(group, unitaryIndices, irreps, factors) {
  const { operations, table, inverses } = group;
  const antiIndices = operations.map((op, i) => op.antiunitary ? i : -1).filter(i => i >= 0);
  if (!antiIndices.length) return [];
  const n = unitaryIndices.length, a = antiIndices[0], ainv = inverses[a], square = table[a][a];
  const local = new Map(unitaryIndices.map((index, i) => [index, i]));
  const completed = new Set(), result = [];
  for (let index = 0; index < irreps.length; index++) {
    if (completed.has(index)) continue;
    const rep = irreps[index], d = rep.dimension;
    let indicator = Z();
    for (const anti of antiIndices) indicator = add(indicator, mul(factors[anti][anti], rep.characters[local.get(table[anti][anti])]));
    indicator = scale(indicator, 1 / n);
    const rounded = Math.round(indicator.re);
    assert(Math.abs(indicator.im) < 2e-6 && Math.abs(indicator.re - rounded) < 2e-6 && [-1, 0, 1].includes(rounded), `Wigner indicator is not 0 or ±1 (${formatComplex(indicator)}).`);
    const type = rounded === 1 ? 'a' : rounded === -1 ? 'b' : 'c';
    const partnerMatrices = unitaryIndices.map(h => {
      const conjugated = table[table[ainv][h]][a];
      const c = div(factors[h][a], factors[a][conjugated]);
      return matrixScale(matrixConjugate(rep.matrices[local.get(conjugated)]), c);
    });
    const partnerCharacters = partnerMatrices.map(trace);
    const partner = irreps.findIndex(candidate => abs(sub(characterInner(candidate.characters, partnerCharacters), Z(1))) < 2e-6);
    assert(partner >= 0, 'The antiunitary partner irrep was not found.');
    assert(type === 'c' ? partner !== index : partner === index, 'Wigner classification disagrees with antiunitary partner matching.');
    const x = matrixScale(rep.matrices[local.get(square)], factors[a][a]);
    let unitaryMatrices, antiGenerator;
    if (type === 'a') {
      unitaryMatrices = rep.matrices;
      antiGenerator = findIntertwiner(rep.matrices, partnerMatrices);
      assert(matrixError(matrixMultiply(antiGenerator, matrixConjugate(antiGenerator)), x) < 2e-6, 'Type-a antiunitary square failed.');
    } else {
      unitaryMatrices = rep.matrices.map((m, h) => blockDiagonal(m, partnerMatrices[h]));
      antiGenerator = zeroMatrix(2 * d);
      for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) { antiGenerator[i][d + j] = x[i][j]; antiGenerator[d + i][j] = Z(i === j ? 1 : 0); }
    }
    const matrices = operations.map((op, g) => {
      if (!op.antiunitary) return unitaryMatrices[local.get(g)];
      const h = table[g][ainv];
      return matrixScale(matrixMultiply(unitaryMatrices[local.get(h)], antiGenerator), div(Z(1), factors[h][a]));
    });
    const validation = validateRepresentation(matrices, table, factors, operations);
    result.push({ id: `C${result.length + 1}`, label: `C${result.length + 1}`, type, wignerIndicator: rounded, dimension: matrices[0].length, unitaryIrrep: rep.id, partnerIrrep: irreps[partner].id, unitaryCharacters: unitaryMatrices.map(trace), matrices, antiunitaryFlags: operations.map(op => op.antiunitary), validation });
    completed.add(index); if (type === 'c') completed.add(partner);
  }
  return result;
}

/**
 * Main API. All magnetic little-group representatives are retained. Irrep
 * character/matrix indices follow littleGroup.unitaryOperations. Corep matrix
 * indices follow littleGroup.operations, with antiunitaryFlags marking U K.
 */
export function analyzeGroup({ operations: input, k = [0, 0, 0], basis, doubleValued = false, includeMatrices = true }) {
  k = finiteVector(k, 'k');
  const full = buildMultiplicationTable(input), operations = full.operations;
  const star = computeStar(operations, k);
  const sourceIndices = operations.map((op, i) => equivalentK(reciprocalAction(op, k), k) ? i : -1).filter(i => i >= 0);
  const group = buildMultiplicationTable(sourceIndices.map(i => operations[i]));
  assert(star.length * group.operations.length === operations.length, 'Orbit–stabilizer identity failed.');
  const factors = makeFactors(group, k, doubleValued, basis);
  const cocycleError = validateCocycle(group.table, factors, group.operations);
  const unitaryIndices = group.operations.map((op, i) => !op.antiunitary ? i : -1).filter(i => i >= 0);
  const antiunitaryIndices = group.operations.map((op, i) => op.antiunitary ? i : -1).filter(i => i >= 0);
  const local = new Map(unitaryIndices.map((g, i) => [g, i]));
  const table = unitaryIndices.map(g => unitaryIndices.map(h => local.get(group.table[g][h])));
  const unitaryFactors = unitaryIndices.map(g => unitaryIndices.map(h => factors[g][h]));
  const calculation = calculateIrreps({ table, factors: unitaryFactors, identity: local.get(group.identity) });
  const corepresentations = calculateCorepresentations(group, unitaryIndices, calculation.irreps, factors);
  const littleGroup = { order: group.operations.length, unitaryOrder: unitaryIndices.length, operations: group.operations, sourceIndices, unitaryOperations: unitaryIndices.map(i => group.operations[i]), unitaryIndices, antiunitaryIndices, multiplicationTable: group.table, translationDefects: group.translationDefects, factors, unitaryMultiplicationTable: table, unitaryFactors, identity: group.identity };
  if (!includeMatrices) { calculation.irreps.forEach(rep => delete rep.matrices); corepresentations.forEach(rep => delete rep.matrices); }
  return { schemaVersion: 1, k, groupOrder: operations.length, magnetic: operations.some(op => op.antiunitary), doubleValued: Boolean(doubleValued), star, littleGroup, irreps: calculation.irreps, corepresentations, validation: { ...calculation.validation, cocycleError, orbitStabilizer: true, corepresentationsVerified: corepresentations.length }, conventions: [
    'Primitive fractional direct/reciprocal coordinates; phase exp(−2π i k·t).',
    'D1, D2, … and C1, C2, … are numerical labels, not BC/CDML/Bilbao labels.',
    'Matrices are numerical in a reproducible computed gauge; antiunitary matrices act as U K.',
    doubleValued ? 'Spinful double-valued factor system includes T² = −1.' : 'Single-valued factor system uses spinless T² = +1.',
  ] };
}

/** Decompose characters on the SAME ordered unitary little group and factor system. */
export function decomposeCharacters(charactersOrOptions, maybeIrreps) {
  const { characters, irreps } = Array.isArray(charactersOrOptions) ? { characters: charactersOrOptions, irreps: maybeIrreps } : charactersOrOptions;
  assert(Array.isArray(irreps) && irreps.length > 0, 'Target irreps are required.');
  assert(Array.isArray(characters) && characters.length === irreps[0].characters.length, 'Character vector length must equal the unitary little-group order.');
  const values = characters.map(C);
  assert(values.every(z => Number.isFinite(z.re) && Number.isFinite(z.im)), 'Characters must be finite complex numbers.');
  const multiplicities = irreps.map(rep => {
    const coefficient = characterInner(rep.characters, values), multiplicity = Math.round(coefficient.re);
    assert(multiplicity >= 0 && Math.abs(coefficient.re - multiplicity) < 2e-5 && Math.abs(coefficient.im) < 2e-5, `Input is not a nonnegative integral character combination in this factor system (${rep.id}: ${formatComplex(coefficient)}).`);
    return { id: rep.id, label: rep.label, dimension: rep.dimension, multiplicity, coefficient };
  });
  const reconstruction = values.map((_, g) => irreps.reduce((sum, rep, i) => add(sum, scale(rep.characters[g], multiplicities[i].multiplicity)), Z()));
  const residual = Math.max(...values.map((v, g) => abs(sub(v, reconstruction[g]))));
  assert(residual < 2e-5, `The supplied character is outside the span of these irreps (residual ${residual}).`);
  return { terms: multiplicities.filter(term => term.multiplicity > 0), multiplicities, dimension: multiplicities.reduce((s, term) => s + term.dimension * term.multiplicity, 0), reconstructionError: residual, passed: true };
}

/**
 * Decompose a magnetic representation using its UNITARY character restriction.
 * Corep restrictions have norm 1 (a), 4 (b), or 2 (c), so ordinary character
 * inner products alone are not multiplicities. An incomplete Kramers pair or
 * missing conjugate partner is rejected instead of assigned a half label.
 */
export function decomposeCorepresentationCharacters(charactersOrOptions, maybeCorepresentations) {
  const { characters, corepresentations } = Array.isArray(charactersOrOptions) ? { characters: charactersOrOptions, corepresentations: maybeCorepresentations } : charactersOrOptions;
  assert(Array.isArray(corepresentations) && corepresentations.length > 0, 'Target magnetic corepresentations are required.');
  assert(Array.isArray(characters) && characters.length === corepresentations[0].unitaryCharacters.length, 'Character vector length must equal the unitary little-group order.');
  const values = characters.map(C);
  assert(values.every(z => Number.isFinite(z.re) && Number.isFinite(z.im)), 'Characters must be finite complex numbers.');
  const multiplicities = corepresentations.map(rep => {
    const norm = characterInner(rep.unitaryCharacters, rep.unitaryCharacters);
    const coefficient = div(characterInner(rep.unitaryCharacters, values), norm), multiplicity = Math.round(coefficient.re);
    assert(multiplicity >= 0 && Math.abs(coefficient.re - multiplicity) < 2e-5 && Math.abs(coefficient.im) < 2e-5, `The character is not a nonnegative integral magnetic corepresentation combination (${rep.id}: ${formatComplex(coefficient)}). Include complete antiunitary/Kramers partners.`);
    return { id: rep.id, label: rep.label, dimension: rep.dimension, type: rep.type, multiplicity, coefficient };
  });
  const reconstruction = values.map((_, g) => corepresentations.reduce((sum, rep, i) => add(sum, scale(rep.unitaryCharacters[g], multiplicities[i].multiplicity)), Z()));
  const residual = Math.max(...values.map((v, g) => abs(sub(v, reconstruction[g]))));
  assert(residual < 2e-5, `The supplied character is outside the span of these magnetic corepresentations (residual ${residual}).`);
  return { terms: multiplicities.filter(term => term.multiplicity > 0), multiplicities, dimension: multiplicities.reduce((s, term) => s + term.dimension * term.multiplicity, 0), reconstructionError: residual, passed: true };
}

/**
 * Pointwise tensor-product character decomposition. Pass target irreps computed
 * for the product factor system: k_target = k_left + k_right, and spin parity
 * is XOR. If factors are supplied, compatibility is checked explicitly.
 */
export function directProduct({ left, right, targetIrreps, leftFactors, rightFactors, targetFactors }) {
  const a = left.characters ?? left, b = right.characters ?? right;
  assert(a.length === b.length, 'Tensor factors must use the same ordered unitary subgroup.');
  if (leftFactors || rightFactors || targetFactors) {
    assert(leftFactors && rightFactors && targetFactors, 'Supply all three factor systems for compatibility validation.');
    assert(leftFactors.length === a.length && rightFactors.length === a.length && targetFactors.length === a.length, 'Factor-system dimensions differ.');
    let error = 0;
    for (let g = 0; g < a.length; g++) for (let h = 0; h < a.length; h++) error = Math.max(error, abs(sub(mul(C(leftFactors[g][h]), C(rightFactors[g][h])), C(targetFactors[g][h]))));
    assert(error < 2e-6, 'Tensor-product factor system differs from the target. Use k_left + k_right and the correct spin parity, on a common little subgroup.');
  }
  const characters = a.map((v, g) => mul(C(v), C(b[g])));
  return { ...decomposeCharacters(characters, targetIrreps), characters };
}

export function formatComplex(input, digits = 5) {
  const z = C(input), tolerance = 0.5 * 10 ** -digits;
  const number = x => Math.abs(x) < tolerance ? '0' : Number(x.toFixed(digits)).toString();
  if (Math.abs(z.im) < tolerance) return number(z.re);
  const imag = Math.abs(Math.abs(z.im) - 1) < tolerance ? 'i' : `${number(Math.abs(z.im))}i`;
  if (Math.abs(z.re) < tolerance) return `${z.im < 0 ? '−' : ''}${imag}`;
  return `${number(z.re)} ${z.im < 0 ? '−' : '+'} ${imag}`;
}
