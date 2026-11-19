import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory, lessonProgressionEdges} from '../dist/lesson-progression.js';
import {toolsIndex} from '../dist/navigation-ui.js';
import {PROJECT_INPUT_TARGETS} from '../dist/project-input.js';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8').replace(/\r\n?/g, '\n');
const catalogue = JSON.parse(read('dist/data/pointgroup-identify.json'));
const atlas = JSON.parse(read('dist/data/pointgroup-atlas.json'));
const searchIndex = JSON.parse(read('dist/data/search-index.json'));
const learnerRoute = 'classroom/foundations?lesson=thirty-two';
assert.equal(catalogue.groups.length, 32);
assert.equal(atlas.groups.length, 32);
assert.equal(new Set(catalogue.groups.map(group => JSON.stringify(group.counts))).size, 32);
assert.deepEqual(new Set(catalogue.exercises.map(exercise => exercise.groupId)), new Set(atlas.groups.map(group => group.id)));
assert.match(searchIndex.entries.find(entry => entry.route === learnerRoute)?.keywords, /point group identification/);
assert.equal(lessonProgressionInventory.length, 197);
assert.equal(lessonProgressionEdges.length, 259);
assert.equal(toolsIndex.length, 75);
assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length, 34);

const localeFiles = ['en-pointgroup-identify-ui.json', 'en-pointgroup-identify-host.json', 'en-pointgroup-identify-docs.json'];
for (const file of localeFiles) assert.ok(catalogFiles.includes(file), file);

const paths = [
  '.github/workflows/pages.yml', 'GOAL-ROADMAP.md', 'package.json', 'package-lock.json',
  'dist/index.html', 'dist/app.js', 'dist/classroom-ui.js', 'dist/pointgroup-ui.js', 'dist/pointgroup.css',
  'dist/navigation-ui.js', 'dist/tool-finder.js', 'scripts/test-tool-finder.mjs',
  'dist/pointgroup-identify-core.js', 'dist/pointgroup-identify-ui.js', 'dist/pointgroup-identify.css',
  'dist/crystal-notation.js', 'dist/math-display.js', 'dist/lesson-progression.js',
  'dist/data/pointgroup-atlas.json', 'dist/data/pointgroup-lessons.json', 'dist/data/space-groups.json',
  'dist/data/pointgroup-identify.json', 'dist/data/search-index.json', 'dist/docs/pointgroup-course.md',
  'scripts/build-pointgroup-course.py', 'scripts/test-pointgroup-course.py',
  'scripts/build-pointgroup-identify-data.mjs', 'scripts/build-pointgroup-identify-provenance.mjs',
  'scripts/test-pointgroup-identify-core.mjs', 'scripts/test-pointgroup-identify-ui.mjs', 'scripts/test-pointgroup-identify-host.mjs',
  'scripts/test-pointgroup-ui.mjs', 'scripts/test-pointgroup-learning-support.mjs', 'scripts/build-search-index.mjs',
  'scripts/search-catalog-source.mjs', 'scripts/english-catalog.mjs', 'scripts/build-english.mjs',
  'scripts/refresh-english-provenance.py', 'scripts/package-source.py', 'scripts/test-source-package.py',
  ...localeFiles.map(file => 'locales/' + file)
];
const files = Object.fromEntries(paths.sort().map(path => {
  const buffer = Buffer.from(read(path));
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return [path, {normalization: 'utf8-lf-v1', bytes: buffer.length, sha256}];
}));

const provenance = {
  schemaVersion: 1,
  release: '20261119-pointgroups1',
  route: learnerRoute,
  scope: 'Optional reverse identification from operation evidence across the 32 ordinary three-dimensional crystallographic point-group types.',
  counts: {
    pointGroupTypes: catalogue.groups.length,
    exactOperations: catalogue.groups.reduce((total, group) => total + group.operations.length, 0),
    blindPracticeCases: catalogue.exercises.length,
    indexedLessons: lessonProgressionInventory.length,
    optionalCourseRelationships: lessonProgressionEdges.length,
    expertTools: toolsIndex.length,
    projectAdapters: Object.keys(PROJECT_INPUT_TARGETS).length
  },
  method: {
    source: 'Existing BC space-group integer linear operations and existing atlas Cartesian actions of 32 representative space groups.',
    classification: 'A positive determinant uses the order of R. A negative determinant uses the order of -R. The resulting complete operation-count vectors are distinct among the 32 references.',
    incompleteEvidence: 'Observed counts provide lower bounds. The compatibility filter can retain candidates still underdetermined by the evidence, even if the observed subset is a group.'
  },
  sources: [
    {title: 'International Tables for Crystallography, Volume A, Section 3.2.1 and Table 3.2.1.1', url: 'https://onlinelibrary.wiley.com/iucr/itc/Ac/ch3o2v0001/sec3o2o1/'},
    {title: 'An introduction to crystal physics, Tables 2 and 3', url: 'https://www.iucr.org/what-we-do/education/pamphlets/introduction-crystal-physics'}
  ],
  files
};
const target = new URL('dist/data/pointgroup-identify-provenance.json', root);
const expected = JSON.stringify(provenance, null, 2) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(read('dist/data/pointgroup-identify-provenance.json'), expected, 'Point-group identification provenance is stale.');
} else {
  fs.writeFileSync(target, expected);
}
console.log('Point-group identification:', JSON.stringify(provenance.counts));
