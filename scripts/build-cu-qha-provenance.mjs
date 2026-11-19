import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory, lessonProgressionEdges} from '../dist/lesson-progression.js';
import {toolsIndex} from '../dist/navigation-ui.js';
import {PROJECT_INPUT_TARGETS} from '../dist/project-input.js';

const root = new URL('../', import.meta.url);
const directory = 'dist/data/examples/phonopy-cu-qha/';
const read = name => readFileSync(new URL(name, root));
const normalized = name => read(name).toString('utf8').replace(/\r\n?/g, '\n');
const digest = text => createHash('sha256').update(text).digest('hex');
const metadata = JSON.parse(normalized(directory + 'source.json'));
assert.equal(metadata.commit, '18cad919af8fe8aad349e04f101887fa19b051a0');
assert.equal(metadata.volumeCount, 11);
assert.equal(metadata.temperatureCount, 251);
assert.equal(metadata.natom, 4);
assert.equal(metadata.thermalFiles.length, 11);
assert.equal(metadata.license, 'BSD-3-Clause');
const payload = read(directory + 'payload.json');
assert.equal(digest(payload), metadata.payload.sha256);
assert.equal(payload.length, metadata.payload.bytes);
assert.equal(lessonProgressionInventory.length, 197);
assert.equal(lessonProgressionEdges.length, 259);
assert.equal(toolsIndex.length, 75);
assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length, 34);

const locales = ['en-cu-qha-source-ui.json', 'en-cu-qha-host.json', 'en-cu-qha-docs.json'];
for (const locale of locales) assert.ok(catalogFiles.includes(locale), locale);
const paths = [
  '.github/workflows/pages.yml', 'GOAL-ROADMAP.md', 'package.json', 'dist/index.html', 'dist/app.js', 'dist/classroom-ui.js',
  'dist/coupled-materials-ui.js', 'dist/coupled-materials.css', 'dist/data/coupled-materials.json',
  'dist/cu-qha-source-ui.js', 'dist/cu-qha-source.css', 'dist/docs/cu-qha-example.md', 'dist/docs/cu-thermal-example.md',
  'dist/python/qha_lab.py', 'dist/python/phonopy_import.py', 'dist/data/search-index.json', 'dist/navigation-ui.js',
  'dist/data/examples/phonopy-cu-thermal-index05.yaml.xz', 'dist/data/examples/phonopy-cu-thermal-index05.yaml',
  'dist/data/examples/phonopy-cu-thermal-source.json',
  'scripts/build-cu-qha-source.py', 'scripts/build-cu-qha-provenance.mjs', 'scripts/test-python-cu-qha-source.py',
  'scripts/test-cu-qha-source-ui.mjs', 'scripts/test-cu-qha-host.mjs',
  'scripts/test-coupled-materials-ui.mjs', 'scripts/test-python-coupled-content.py',
  'scripts/build-search-index.mjs', 'scripts/english-catalog.mjs', 'scripts/build-english.mjs',
  'scripts/refresh-english-provenance.py', 'scripts/package-source.py', 'scripts/test-source-package.py',
  ...readdirSync(new URL(directory, root)).map(name => directory + name),
  ...locales.map(name => 'locales/' + name)
];
const files = Object.fromEntries(paths.sort().map(path => {
  const binary = /\.(?:dat|xz)$/.test(path);
  const blob = binary ? read(path) : Buffer.from(normalized(path));
  return [path, {normalization: binary ? 'binary' : 'utf8-lf-v1', bytes: blob.length, sha256: digest(blob)}];
}));
const manifest = {
  schemaVersion: 1, release: '20261119-cu-qha1',
  course: 'classroom/observables?module=qha&lesson=qha-free-energy',
  tool: 'compute/qha-lab',
  source: {revision: metadata.commit, manifest: directory + 'source.json', license: metadata.license},
  counts: {volumeSamples: 11, temperatureSamples: 251, inputCellAtoms: 4, totalFreeEnergySamples: 2761},
  verification: 'Archive verification reproduces the exact decoded source order and browser payload. An independent scientific check recomputes every total-free-energy sample, fitted minima at six temperatures and derivatives at 300 K.',
  scope: 'Official Cu reference files for the existing local polynomial QHA calculation. The confirmed preview applies the data to the editable calculator and execution remains manual.',
  files
};
const filename = 'dist/data/cu-qha-provenance.json';
const expected = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(normalized(filename), expected, 'Cu QHA provenance is stale.');
} else {
  writeFileSync(new URL(filename, root), expected);
}
console.log('Cu QHA data:', JSON.stringify(manifest.counts));
