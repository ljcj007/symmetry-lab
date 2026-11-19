import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {analyzeSeitzGroup} from '../dist/seitz-quotient-core.js';
import {lessonProgressionInventory, lessonProgressionEdges} from '../dist/lesson-progression.js';
import {toolsIndex} from '../dist/navigation-ui.js';
import {PROJECT_INPUT_TARGETS} from '../dist/project-input.js';
import {catalogFiles} from './english-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8').replace(/\r\n?/g, '\n');
const upstream = 'dist/data/space-groups.json';
const data = JSON.parse(read(upstream));
const counts = {spaceGroups: data.groups.length, representatives: 0, products: 0, nonzeroShifts: 0};
for (const group of data.groups) {
  const product = analyzeSeitzGroup(group);
  counts.representatives += product.operations.length;
  counts.products += product.orderedPairCount;
  counts.nonzeroShifts += product.nonzeroShiftCount;
}
assert.deepEqual(counts, {spaceGroups: 230, representatives: 2609, products: 52381, nonzeroShifts: 15636});
assert.equal(lessonProgressionInventory.length, 197);
assert.equal(lessonProgressionEdges.length, 259);
assert.equal(toolsIndex.length, 75);
assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length, 34);
const courseRoute = 'classroom/crystal?lesson=space-01&track=space';
const search = JSON.parse(read('dist/data/search-index.json'));
assert.match(search.entries.find(entry => entry.route === courseRoute)?.keywords, /Seitz product/);
const locales = ['en-seitz-quotient-ui.json', 'en-seitz-quotient-host.json', 'en-seitz-quotient-docs.json'];
for (const locale of locales) assert.ok(catalogFiles.includes(locale), locale);

const dependencies = [
  '.github/workflows/pages.yml', 'GOAL-ROADMAP.md', 'package.json',
  'dist/index.html', 'dist/app.js', 'dist/classroom-ui.js', 'dist/symmetry-course-ui.js',
  'dist/seitz-quotient-core.js', 'dist/seitz-quotient-ui.js', 'dist/seitz-quotient.css',
  'dist/pointgroup-identify-core.js', 'dist/data/pointgroup-identify.json', 'dist/resource-loader.js',
  'dist/crystal-notation.js', 'dist/math-display.js', 'dist/workbench-route.js',
  'dist/navigation-ui.js', 'dist/tool-finder.js', 'dist/data/search-index.json',
  'dist/lesson-progression.js', 'dist/data/symmetry-course-lessons.json', upstream,
  'dist/docs/seitz-quotient.md',
  'scripts/build-seitz-quotient-provenance.mjs', 'scripts/test-seitz-quotient-core.mjs',
  'scripts/test-seitz-quotient-ui.mjs', 'scripts/test-seitz-quotient-host.mjs',
  'scripts/test-workbench-routes.mjs', 'scripts/test-tool-finder.mjs',
  'scripts/build-search-index.mjs', 'scripts/search-catalog-source.mjs',
  'scripts/build-english.mjs', 'scripts/english-catalog.mjs', 'scripts/refresh-english-provenance.py',
  'scripts/package-source.py', 'scripts/test-source-package.py',
  ...locales.map(name => 'locales/' + name)
];
const files = Object.fromEntries(dependencies.sort().map(name => {
  const raw = Buffer.from(read(name));
  return [name, {normalization: 'utf8-lf-v1', bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex')}];
}));
const evidence = {
  schemaVersion: 1,
  release: '20261119-seitz1',
  source: {file: upstream, upstreamCommit: data.source.commit},
  courseRoute,
  counts,
  conventions: {
    basis: 'BC primitive direct fractional coordinates, active column-vector action. The right factor acts first.',
    data: 'Exact integer linear parts and translations in twelfths from the ordinary space-group table. The group product returns the full translation, the chosen representative and their integer lattice shift.',
    momentum: 'The active translation phase on a specified output Bloch state is exp(-2 pi i k dot L). The workshop uses exact quarter-grid coordinates and can test preservation modulo a reciprocal lattice vector.',
    scope: 'A finite quotient workshop using the fixed BC representatives. A listed fractional offset alone cannot diagnose symmorphicity. The optional calculator transfer opens the chosen ordinary space group and wave vector for manual calculation.'
  },
  sources: [
    {title: 'Seitz symbols for crystallographic symmetry operations', url: 'https://journals.iucr.org/a/issues/2014/03/00/es0405/index.html'},
    {title: 'Crystallographic shelves: space-group hierarchy explained', url: 'https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html'}
  ],
  files
};
const name = 'dist/data/seitz-quotient-provenance.json';
const body = JSON.stringify(evidence, null, 2) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(read(name), body, 'Seitz quotient provenance is stale.');
} else {
  writeFileSync(new URL(name, root), body);
}
console.log('Seitz quotient:', JSON.stringify(counts));
