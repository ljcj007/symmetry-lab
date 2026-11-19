import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const english = process.argv.includes('--english');
const prefix = english ? '../dist/en/' : '../dist/';
const {toolsIndex} = await import(prefix + 'navigation-ui.js');
const {finderResults} = await import(prefix + 'tool-finder.js');
const atlas = JSON.parse(readFileSync(new URL(prefix + 'data/search-index.json', import.meta.url), 'utf8')).entries;
for (const filename of ['Graphene_hr.dat', 'wt.in-bands']) {
  assert.equal(finderResults(toolsIndex, filename)[0]?.route, 'magnetictb');
}
const materials = finderResults(atlas, english ? 'graphene Wannier' : '石墨烯 Wannier', {scope: 'materials'});
assert.ok(materials.some(item => item.route === 'atlas/research?material=graphene-wannier'));
console.log('Both upstream filenames locate the existing calculator and the material case is searchable.');
