import assert from 'node:assert/strict';
import {
  createStructureDiffractionHandoff,
  validateStructureDiffractionHandoff,
} from '../dist/structure-diffraction-handoff.js';

function conversion(count = 2) {
  return {
    group_number: 2,
    input_cell: {
      label: 'Input cell',
      lattice: [[4, 0, 0], [2.5, 4.33, 0], [0, 0, 6]],
      positions: Array.from({length: count}, (_, i) => [(i + 0.125) / count, .2, .3]),
      species: Array(count).fill('C'),
      atom_count: count,
    },
    bc_primitive: {lattice: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], positions: [[0, 0, 0]], species: ['Si']},
    input_metadata: {source_tags: {raw: 'private input'}},
  };
}

const result = conversion();
const digest = 'a489'.repeat(16);
const draft = createStructureDiffractionHandoff(result, {
  format: ' CIF ', filename: 'file #1.cif', sha256: digest.toUpperCase(), text: 'private input', bytes: [1, 2],
});
assert.deepEqual(draft, {
  custom: {cell: [[4, 0, 0], [2.5, 4.33, 0], [0, 0, 6]], atoms: [
    {species: 'C', fractional: [.0625, .2, .3]},
    {species: 'C', fractional: [.5625, .2, .3]},
  ]},
  source: {format: 'cif', filename: 'file #1.cif', sha256: digest, atomCount: 2},
});
const replay = validateStructureDiffractionHandoff(draft);
assert.deepEqual(replay, draft);
result.input_cell.lattice[0][0] = 9;
result.input_cell.positions[0][0] = .75;
result.input_cell.species[0] = 'Si';
assert.deepEqual(draft, replay);
draft.custom.cell[1][1] = 1;
draft.custom.atoms[0].fractional[1] = .8;
draft.source.filename = 'other.cif';
assert.deepEqual(replay.custom.cell[0], [4, 0, 0]);
assert.deepEqual(replay.custom.cell[1], [2.5, 4.33, 0]);
assert.deepEqual(replay.custom.atoms[0], {species: 'C', fractional: [.0625, .2, .3]});
assert.equal(replay.source.filename, 'file #1.cif');

assert.deepEqual(createStructureDiffractionHandoff(conversion(1)).source,
  {format: '', filename: '', sha256: '', atomCount: 1});
assert.deepEqual(createStructureDiffractionHandoff(conversion(128), {
  format: 'VASP', filename: '../POSCAR', sha256: `${digest}\n`,
}).source, {format: 'poscar', filename: '', sha256: '', atomCount: 128});

for (const bad of [null, {}, {bc_primitive: result.bc_primitive}, conversion(0), conversion(129)]) {
  assert.equal(createStructureDiffractionHandoff(bad), null);
}
for (const modify of [
  cell => { cell.atom_count = 9; },
  cell => { cell.positions.length = 1; },
  cell => { delete cell.species[1]; },
  cell => { cell.species[0] = ' '; },
  cell => { cell.species[0] = 'X'.repeat(33); },
  cell => { cell.positions[0] = [0, .2]; },
  cell => { cell.positions[0] = [true, .2, .3]; },
  cell => { cell.positions[0] = [, .2, .3]; },
  cell => { cell.positions[0][2] = 1000.0001; },
  cell => { cell.lattice[0][0] = '4'; },
  cell => { cell.lattice[0][0] = Infinity; },
  cell => { cell.lattice[0][0] = -1001; },
  cell => { delete cell.lattice[1]; },
  cell => { cell.lattice[2] = [...cell.lattice[1]]; },
  cell => { cell.lattice = [[1, 0, 0], [0, 1, 0], [0, 0, 1e-7]]; },
]) {
  const bad = conversion();
  modify(bad.input_cell);
  assert.equal(createStructureDiffractionHandoff(bad), null, String(modify));
}

const leftHanded = conversion(1);
leftHanded.input_cell.lattice = [[-1000, 0, 0], [0, 10, 0], [0, 0, 10]];
leftHanded.input_cell.positions[0] = [-1000, 0, 1000];
assert.deepEqual(createStructureDiffractionHandoff(leftHanded).custom.cell, leftHanded.input_cell.lattice);
const minimumVolume = conversion(1);
minimumVolume.input_cell.lattice = [[1, 0, 0], [0, 1, 0], [0, 0, 1e-6]];
assert.ok(createStructureDiffractionHandoff(minimumVolume));

for (const modify of [
  input => { input.symmetry = 227; },
  input => { input.custom.reflection = [1, 0, 0]; },
  input => { input.custom.atoms[0].factor = 1; },
  input => { delete input.custom.atoms[1]; },
  input => { input.source.atomCount = 1; },
  input => { input.source.sha256 = 'not-a-digest'; },
  input => { input.source.filename = 'C:\\secrets\\POSCAR'; },
  input => { input.source.format = 'xyz'; },
  input => { input.source.text = 'private input'; },
]) {
  const bad = structuredClone(replay);
  modify(bad);
  assert.equal(validateStructureDiffractionHandoff(bad), null, String(modify));
}

console.log('Input-cell diffraction handoff: original basis, atom order, validation, metadata and copy verified.');
