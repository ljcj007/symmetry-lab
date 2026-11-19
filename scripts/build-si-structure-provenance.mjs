import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {catalogFiles} from './english-catalog.mjs';

const root = new URL('../', import.meta.url);
const source = 'dist/data/examples/phonopy-si-structure/';
const read = name => readFileSync(new URL(name, root));
const text = name => read(name).toString('utf8').replace(/\r\n?/g, '\n');
const digest = (algorithm, data) => createHash(algorithm).update(data).digest('hex');
const metadata = JSON.parse(text(source + 'source.json'));
assert.equal(metadata.commit, '18cad919af8fe8aad349e04f101887fa19b051a0');
assert.equal(metadata.license, 'BSD-3-Clause');
assert.equal(metadata.structureFile.path, 'POSCAR-0');
assert.equal(metadata.licenseFile.path, 'LICENSE.txt');

const originals = [metadata.structureFile, metadata.licenseFile];
for (const file of originals) {
  const bytes = read(source + file.path);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(digest('sha256', bytes), file.sha256, file.path);
  assert.equal(digest('sha1', Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])), file.gitBlobSha1, file.path);
  if (process.argv.includes('--check')) {
    assert.deepEqual(read(source.replace('dist/', 'dist/en/') + file.path), bytes, `English copy of ${file.path}`);
  }
}

const locales = ['en-si-structure-import.json', 'en-si-structure-links.json', 'en-si-structure-docs.json'];
for (const locale of locales) assert.ok(catalogFiles.includes(locale), locale);
const binary = new Set(originals.map(file => source + file.path));
const paths = [
  'GOAL-ROADMAP.md', 'package.json', 'dist/index.html', 'dist/app.js', 'dist/classroom-ui.js',
  'dist/structure-ui.js', 'dist/structure-provenance.js', 'dist/structure-handoff.js',
  'dist/pointgroup-ui.js', 'dist/symmetry-course-ui.js', 'dist/docs/si-structure-example.md',
  'dist/tool-finder.js', 'dist/tool-search.js', 'dist/tool-directory.js', 'dist/tool-capabilities.js',
  'dist/navigation-ui.js', 'dist/data/search-index.json', 'dist/python/structure_bc.py',
  'scripts/build-si-structure-provenance.mjs', 'scripts/test-python-si-structure-source.py',
  'scripts/test-si-structure-source-ui.mjs', 'scripts/test-file-search.mjs', 'scripts/test-symmetry-course-ui.mjs',
  'scripts/test-pointgroup-learning-support.mjs', 'scripts/english-catalog.mjs', 'scripts/test-source-package.py',
  source + 'source.json', ...binary, ...locales.map(name => 'locales/' + name)
];

const files = Object.fromEntries(paths.sort().map(path => {
  const original = binary.has(path);
  const bytes = original ? read(path) : Buffer.from(text(path));
  return [path, {normalization: original ? 'binary' : 'utf8-lf-v1', bytes: bytes.length, sha256: digest('sha256', bytes)}];
}));
const manifest = {
  schemaVersion: 1, release: '20261119-si1',
  lesson: 'classroom/crystal?track=space&lesson=space-06', tool: 'structure',
  source: {revision: metadata.commit, manifest: source + 'source.json', license: metadata.license},
  input: metadata.input, reference: metadata.reference,
  negativeControl: {bcK: [0.5, 0, 0], starArmCount: 4, littleGroupOrder: 12},
  verification: 'The archive checks both original Git blobs and their exact English copies. The numerical test independently verifies the primitive-cell transform, reciprocal phase, operation transport, and both little-group inputs.',
  files
};
const filename = 'dist/data/si-structure-provenance.json';
const expected = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  assert.deepEqual(JSON.parse(text(filename)), manifest, 'Si structure provenance is stale.');
} else {
  writeFileSync(new URL(filename, root), expected);
}
console.log('Original Si structure and license verified in both language editions.');
