import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {GRAPHENE_REFERENCE} from '../dist/wannier-graphene-source.js';
import {catalogFiles} from './english-catalog.mjs';

const root = new URL('../', import.meta.url);
const text = name => readFileSync(new URL(name, root), 'utf8').replace(/\r\n?/g, '\n');
const check = process.argv.includes('--check');
const source = GRAPHENE_REFERENCE;
assert.equal(source.commit, '362171ce35450118828c6960a882e3a6d08c73f5');
assert.equal(source.hr.bytes, 64657);
assert.equal(source.settings.bytes, 955);
assert.equal(source.hr.sha256, '4caf86edf7341709413383542280b132195bcb71526d5313bad331526a50f75e');
assert.equal(source.settings.sha256, '55dcb2f584260496e29530874a019042cc68bc9a5acdd547478af3312cdff3da');
const rawNames = new Set([source.hr.fileName, source.settings.fileName]);
for (const entry of readdirSync(new URL('dist/', root), {recursive: true, withFileTypes: true})) {
  assert.ok(!entry.isFile() || !rawNames.has(entry.name), `Unexpected repackaged upstream file ${entry.name}`);
}

const localeFiles = ['source', 'ui', 'lesson', 'docs'].map(kind => `en-wannier-graphene-${kind}.json`);
for (const file of localeFiles) assert.ok(catalogFiles.includes(file), file);
const paths = [
  'GOAL-ROADMAP.md', 'package.json', 'dist/index.html', 'dist/app.js', 'dist/classroom-ui.js',
  'dist/research-ui.js', 'dist/wannier-graphene-source.js', 'dist/wannier-graphene.css',
  'dist/material-research-ui.js', 'dist/data/material-research.json', 'dist/data/search-index.json',
  'dist/navigation-ui.js', 'dist/tool-capabilities.js', 'dist/tool-finder.js',
  'dist/docs/wannier-graphene-example.md', 'dist/examples/magnetictb-graphene.json',
  'dist/python/magnetictb_browser.py', 'scripts/english-catalog.mjs', 'scripts/test-source-package.py',
  'scripts/build-wannier-graphene-provenance.mjs', 'scripts/test-wannier-graphene-source.mjs',
  'scripts/test-wannier-graphene-ui.mjs', 'scripts/test-wannier-graphene-lesson.mjs',
  'scripts/test-wannier-graphene-search.mjs', 'scripts/test-material-research-content.py',
  ...localeFiles.map(file => `locales/${file}`)
];
const files = Object.fromEntries(paths.sort().map(path => {
  const bytes = Buffer.from(text(path));
  return [path, {normalization: 'utf8-lf-v1', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}];
}));
const manifest = {
  schemaVersion: 1, release: '20261120-wannier1', source,
  routes: {tool: 'magnetictb', lesson: 'classroom/crystal?module=bands&tab=learn&lesson=band-crossing', atlas: 'atlas/research?material=graphene-wannier'},
  checks: {energyUnit: 'eV', orbitals: 2, translations: 315, pathSamples: 304, suppliedK: [0.33333333, 0.33333333, 0], splittingMeVApproximate: '2.94546'},
  scope: 'Two revision-pinned upstream files are verified together before filling the existing HR import. Python execution is manual. The K separation describes these inputs and coordinates.',
  files
};
const filename = 'dist/data/wannier-graphene-provenance.json';
if (check) {
  assert.deepEqual(JSON.parse(text(filename)), manifest, 'Graphene Wannier provenance is stale.');
} else {
  writeFileSync(new URL(filename, root), JSON.stringify(manifest, null, 2) + '\n');
}
console.log('Graphene source pins, case dependencies and absence of bundled original files verified.');
