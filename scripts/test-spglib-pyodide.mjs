// Optional integration test with an existing Pyodide 314.0.7 runtime directory.
// node scripts/test-spglib-pyodide.mjs /path/to/pyodide/full
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSpglibBridge} from '../dist/vendor/spglib/bridge.mjs';
if (!process.argv[2]) throw new Error('Supply the Pyodide 314.0.7 full runtime directory');
const directory = path.resolve(process.argv[2]);
const {loadPyodide} = await import(pathToFileURL(path.join(directory, 'pyodide.mjs')));
const runtime = await loadPyodide({indexURL: directory + path.sep});
await runtime.loadPackage('numpy');
globalThis.symmetryLabSpglib = await createSpglibBridge();
runtime.FS.writeFile('/home/pyodide/spglib_runtime.py', await fs.readFile(new URL('../dist/python/spglib_runtime.py', import.meta.url), 'utf8'));
const output = runtime.runPython(`
import sys, json
sys.path.insert(0, '/home/pyodide')
import spglib_runtime, spglib
import numpy as np
assert spglib is spglib_runtime
cell = (np.eye(3), [[0, 0, 0]], [1])
ds = spglib.get_symmetry_dataset(cell)
assert ds.number == 221 and ds['number'] == 221
assert ds.rotations.shape == (48, 3, 3)
assert ds.std_lattice.dtype == np.dtype('float64')
assert spglib.get_spacegroup_type(439).hall_symbol == 'P 3 2"'
assert spglib.get_symmetry_from_database(517)['rotations'].shape == (48, 3, 3)
assert spglib.standardize_cell(cell, to_primitive=True)[1].shape == (1, 3)
assert spglib.get_symmetry_dataset((np.eye(3), [[0,0,0], [0,0,0]], [1,1])) is None
assert spglib.get_error_message() != 'no error'
assert spglib.get_symmetry_dataset(cell).number == 221
json.dumps({'spglib': spglib.__version__, 'python': sys.version.split()[0], 'group': ds.number, 'operations': len(ds.rotations)})
`);
assert.equal(JSON.parse(output).spglib, '2.8.0');
console.log('Pyodide → Python adapter → JavaScript → WebAssembly → Python passed:', output);
runtime.FS.writeFile('/home/pyodide/structure_bc.py', await fs.readFile(new URL('../dist/python/structure_bc.py', import.meta.url), 'utf8'));
for (const [name, group] of [['structure-silicon', 227], ['structure-screw-cif', 4]]) {
  runtime.globals.set('_structure_request_json', await fs.readFile(new URL(`../dist/examples/${name}.json`, import.meta.url), 'utf8'));
  runtime.globals.set('_expected_group', group);
  console.log(name, runtime.runPython(`
import structure_bc
structure = structure_bc.run(json.loads(_structure_request_json))
assert structure['group_number'] == _expected_group
assert structure['verified'] and structure['complete']
json.dumps({'group': structure['group_number'], 'verified': structure['verified']})
`));
}
