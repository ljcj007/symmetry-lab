import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeGroup, buildMultiplicationTable, decomposeCharacters, decomposeCorepresentationCharacters, directProduct, reciprocalAction, computeStar } from '../dist/engine.js';

const base = new URL('../dist/data/', import.meta.url);
const sg = JSON.parse(fs.readFileSync(new URL('space-groups.json', base))).groups;
const msg = JSON.parse(fs.readFileSync(new URL('magnetic-groups.json', base))).groups;
const mpg = JSON.parse(fs.readFileSync(new URL('points.json', base))).points;
const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const identity = { rotation: I, translation: [0, 0, 0] };
const invert = { rotation: I.map(row => row.map(v => -v)), translation: [0, 0, 0] };
const analyze = (group, k = [0, 0, 0], doubleValued = false) => analyzeGroup({ operations: group.operations, basis: group.basis, k, doubleValued });
let checks = 0;
function check(name, callback) { callback(); checks++; console.log(`PASS ${name}`); }
function close(a, b, tolerance = 2e-6) { assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`); }
function dims(result) { return result.irreps.map(r => r.dimension).sort((a, b) => a - b); }

check('primitive reciprocal inverse transpose, nonorthogonal coordinates', () => {
  const r = [[0, -1, 0], [1, -1, 0], [0, 0, 1]];
  assert.deepEqual(reciprocalAction({ rotation: r }, [1 / 3, 2 / 3, 0]), [-1, 1 / 3, 0]);
});
check('antiunitary k reversal and star modulo reciprocal translations', () => {
  assert.equal(computeStar([identity, { ...identity, antiunitary: true }], [0.2, 0, 0]).length, 2);
  assert.equal(computeStar([identity, { ...identity, antiunitary: true }], [0.5, 0, 0]).length, 1);
});
check('nonclosed and duplicate operation inputs are rejected', () => {
  assert.throws(() => buildMultiplicationTable([identity, identity]), /Duplicate/);
  assert.throws(() => buildMultiplicationTable([identity, { rotation: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], translation: [0, 0, 0] }]), /not closed/);
});
check('P1 and inversion exact characters', () => {
  assert.deepEqual(dims(analyzeGroup({ operations: [identity] })), [1]);
  const result = analyzeGroup({ operations: [identity, invert] });
  assert.deepEqual(dims(result), [1, 1]);
  assert.deepEqual(result.irreps.map(r => Math.round(r.characters[1].re)).sort(), [-1, 1]);
});
check('C3v nonabelian irrep dimensions and verified matrix products', () => {
  const result = analyze(sg.find(g => g.number === 156));
  assert.deepEqual(dims(result), [1, 1, 2]);
  assert.ok(result.validation.productError < 1e-8);
});
check('nonsymmorphic SG19 R gives one projective two-dimensional irrep', () => {
  const result = analyze(sg.find(g => g.number === 19), [0.5, 0.5, 0.5]);
  assert.deepEqual(dims(result), [2]);
  assert.ok(result.littleGroup.unitaryFactors.some(row => row.some(z => z.re < -0.99)));
});
check('spinful D2 has one two-dimensional projective irrep', () => {
  const result = analyze(sg.find(g => g.number === 16), [0, 0, 0], true);
  assert.deepEqual(dims(result), [2]);
});
check('spinful cubic Oh irreps are 2,2,2,2,4,4', () => {
  const result = analyze(sg.find(g => g.number === 221), [0, 0, 0], true);
  assert.deepEqual(dims(result), [2, 2, 2, 2, 4, 4]);
});
check('spinless time reversal is Wigner a, spinful time reversal is Wigner b', () => {
  const gray = { operations: [identity, { ...identity, antiunitary: true }] };
  const single = analyze(gray), double = analyze(gray, [0, 0, 0], true);
  assert.deepEqual(single.corepresentations.map(r => [r.type, r.dimension]), [['a', 1]]);
  assert.deepEqual(double.corepresentations.map(r => [r.type, r.dimension]), [['b', 2]]);
  assert.ok(double.corepresentations[0].validation.productError < 1e-8);
});
check('gray C3 conjugate irreps form Wigner c', () => {
  const group = sg.find(g => g.number === 143);
  const gray = { ...group, operations: [...group.operations, ...group.operations.map(op => ({ ...op, antiunitary: true }))] };
  const result = analyze(gray);
  assert.deepEqual(result.corepresentations.map(r => [r.type, r.dimension]).sort(), [['a', 1], ['c', 2]]);
});
check('antiunitary half translation changes Wigner type at zone boundary', () => {
  const group = { operations: [identity, { ...identity, translation: [0, 0, 0.5], antiunitary: true }] };
  assert.equal(analyze(group).corepresentations[0].type, 'a');
  assert.equal(analyze(group, [0, 0, 0.5]).corepresentations[0].type, 'b');
  assert.equal(analyze(group, [0, 0, 0.5], true).corepresentations[0].type, 'a');
});
check('same-factor band decomposition and incompatible input rejection', () => {
  const result = analyze(sg.find(g => g.number === 156));
  const characters = result.irreps[0].characters.map((z, i) => ({ re: z.re + 2 * result.irreps[2].characters[i].re, im: z.im + 2 * result.irreps[2].characters[i].im }));
  const decomposition = decomposeCharacters(characters, result.irreps);
  assert.equal(decomposition.dimension, 5);
  assert.deepEqual(decomposition.terms.map(t => t.multiplicity), [1, 2]);
  assert.throws(() => decomposeCharacters(characters.map(z => ({ re: z.re / 3, im: z.im / 3 })), result.irreps), /nonnegative integral/);
});
check('C3v E⊗E = A1 + A2 + E with phase-system validation', () => {
  const result = analyze(sg.find(g => g.number === 156));
  const rep = result.irreps.find(r => r.dimension === 2);
  const f = result.littleGroup.unitaryFactors;
  const product = directProduct({ left: rep, right: rep, targetIrreps: result.irreps, leftFactors: f, rightFactors: f, targetFactors: f });
  assert.equal(product.dimension, 4);
  assert.deepEqual(product.terms.map(t => t.multiplicity), [1, 1, 1]);
});
check('spinor⊗spinor uses single-valued target and conserves dimension', () => {
  const group = sg.find(g => g.number === 16), spin = analyze(group, [0, 0, 0], true), single = analyze(group);
  const args = { left: spin.irreps[0], right: spin.irreps[0], targetIrreps: single.irreps, leftFactors: spin.littleGroup.unitaryFactors, rightFactors: spin.littleGroup.unitaryFactors, targetFactors: single.littleGroup.unitaryFactors };
  assert.equal(directProduct(args).dimension, 4);
  assert.throws(() => directProduct({ ...args, targetIrreps: spin.irreps, targetFactors: spin.littleGroup.unitaryFactors }), /factor system differs/);
});
check('threefold screw at fractional kz has nonreal Bloch factors', () => {
  const result = analyze(sg.find(g => g.number === 144), [0, 0, 1 / 3]);
  assert.deepEqual(dims(result), [1, 1, 1]);
  assert.ok(result.littleGroup.unitaryFactors.some(row => row.some(z => Math.abs(z.im) > 0.5)));
  assert.ok(result.validation.productError < 1e-8);
});
check('magnetic band decomposition divides by corep restriction norm', () => {
  const gray = { operations: [identity, { ...identity, antiunitary: true }] };
  const result = analyze(gray, [0, 0, 0], true);
  const complete = decomposeCorepresentationCharacters([4], result.corepresentations);
  assert.equal(complete.terms[0].multiplicity, 2);
  assert.equal(complete.dimension, 4);
  assert.throws(() => decomposeCorepresentationCharacters([1], result.corepresentations), /complete antiunitary/);
  const group = sg.find(g => g.number === 143);
  const resultC = analyze({ ...group, operations: [...group.operations, ...group.operations.map(op => ({ ...op, antiunitary: true }))] });
  const rep = resultC.corepresentations.find(c => c.type === 'c');
  assert.equal(decomposeCorepresentationCharacters(rep.unitaryCharacters, resultC.corepresentations).terms[0].multiplicity, 1);
});

if (process.argv.includes('--all')) {
  const failures = [], started = Date.now();
  let jobs = 0, maxProductError = 0, maxCocycleError = 0;
  for (const [kind, groups] of [['SG', sg], ['MSG', msg], ['MPG', mpg]]) {
    for (const [index, group] of groups.entries()) {
      const ks = kind !== 'MPG' && process.argv.includes('--boundaries') ? [[0, 0, 0], [0.5, 0.5, 0.5], [0.173, 0.271, 0.389]] : [[0, 0, 0]];
      for (const k of ks) for (const doubleValued of [false, true]) {
        try {
          const result = analyze(group, k, doubleValued);
          maxProductError = Math.max(maxProductError, result.validation.productError, ...result.corepresentations.map(r => r.validation.productError));
          maxCocycleError = Math.max(maxCocycleError, result.validation.cocycleError);
          jobs++;
        } catch (error) {
          failures.push({ group: `${kind}:${group.number || group.id}`, k, doubleValued, message: error.message });
          console.error('FAIL', JSON.stringify(failures[failures.length - 1]));
        }
      }
      if ((index + 1) % 100 === 0 || index === groups.length - 1) console.log(`${kind}: ${index + 1}/${groups.length} groups; ${jobs} calculations; elapsed ${((Date.now() - started) / 1000).toFixed(1)} s`);
    }
  }
  const report = { checkedAt: new Date().toISOString(), engine: 'engine.js', jobs, unitTests: checks, groups: { ordinary: sg.length, magnetic: msg.length, magneticPoint: mpg.length }, momenta: process.argv.includes('--boundaries') ? ['Γ', '(1/2,1/2,1/2)', '(0.173,0.271,0.389)'] : ['Γ'], magneticPointMomenta: ['Γ'], spins: ['single-valued', 'double-valued'], maxProductError, maxCocycleError, elapsedSeconds: (Date.now() - started) / 1000, failures };
  fs.writeFileSync(fileURLToPath(new URL('../dist/data/engine-validation.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
  console.log(JSON.stringify(report));
}
console.log(`${checks} targeted engine tests passed.`);
