import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {validateAdvancedPreset} from '../dist/advanced-ui.js';
import {catalogFiles} from './english-catalog.mjs';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const text = name => read(name).toString('utf8').replace(/\r\n?/g, '\n');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const cases = [
  ['carat_integral', 'noncyclic-affine', 'integral-affine-noncyclic-6d.json'],
  ['integral_normalizer', 'glued6', 'normalizer-glued6.json'],
  ['arithmetic_centralizer', 'a5', 'centralizer-a5.json'],
  ['symbolic_spacegroups', 'magnetic', 'symbolic-sg-magnetic.json']
];
const check = process.argv.includes('--check');
const examples = cases.map(([tool, id, file]) => {
  assert.ok(validateAdvancedPreset(tool, id), `${tool}/${id}`);
  const input = `dist/examples/${file}`;
  const original = read(input);
  const parsed = JSON.parse(original);
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), input);
  if (check) assert.deepEqual(read(`dist/en/examples/${file}`), original, `English copy of ${file}`);
  return {route: `compute/advanced/${tool}?preset=${id}`, input};
});
const localeFiles = ['ui', 'directory', 'docs'].map(kind => `en-advanced-shared-presets-${kind}.json`);
for (const file of localeFiles) assert.ok(catalogFiles.includes(file), file);
const paths = [
  'GOAL-ROADMAP.md', 'package.json', 'dist/index.html', 'dist/app.js', 'dist/advanced-ui.js',
  'dist/navigation-ui.js', 'dist/navigation.css', 'dist/material-research.css', 'dist/tool-capabilities.js', 'dist/tool-finder.js',
  'dist/docs/advanced-example-links.md', 'dist/docs/integral-classification.md', 'dist/docs/integral-normalizer.md',
  'dist/docs/arithmetic-centralizer.md', 'dist/docs/symbolic-spacegroups.md',
  'scripts/build-advanced-presets-provenance.mjs', 'scripts/test-advanced-preset-host.mjs',
  'scripts/test-advanced-preset-directory.mjs', 'scripts/test-advanced-shared-presets-ui.mjs', 'scripts/test-source-package.py',
  'scripts/english-catalog.mjs', ...examples.map(item => item.input), ...localeFiles.map(file => `locales/${file}`)
];
const files = Object.fromEntries(paths.sort().map(path => {
  const bytes = Buffer.from(text(path));
  return [path, {normalization: 'utf8-lf-v1', bytes: bytes.length, sha256: sha256(bytes)}];
}));
const manifest = {
  schemaVersion: 1, release: '20261120-advanced1', examples,
  scope: 'A named URL selects an existing example. Loading explicitly copies the JSON to the form, and execution remains manual. The scientific algorithms and existing example inputs are unchanged.',
  files
};
const filename = 'dist/data/advanced-presets-provenance.json';
if (check) {
  assert.deepEqual(JSON.parse(text(filename)), manifest, 'Advanced presets provenance is stale.');
} else {
  writeFileSync(new URL(filename, root), JSON.stringify(manifest, null, 2) + '\n');
}
console.log('Verified four named advanced routes and their example inputs.');
