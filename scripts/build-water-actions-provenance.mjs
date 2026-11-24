import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(bytes('scripts/fixtures/water-actions.json'));
assert.equal(fixture.schema,'symmetry-lab-water-actions-fixture-1');
assert.match(fixture.method,/Actual browser_api\.run/);
assert.equal(fixture.cases.length,1);
for(const [name,hash]of Object.entries(fixture.sourceHashes))assert.equal(sha(bytes(name)),hash,name);
const r=fixture.cases[0].result;
assert.deepEqual(fixture.cases[0].input,{});assert.equal(fixture.cases[0].action,'water_actions');
assert.equal(r.schema,'symmetry-lab-water-actions-1');assert.equal(r.action,'water_actions');
assert.deepEqual(r.input,{});
assert.deepEqual(r.operationOrder,['E','C2','sigma-xz','sigma-yz']);
assert.equal(r.basis.length,9);assert.equal(r.atoms.length,3);
assert.equal(r.operations.length,4);
for(const op of r.operations){
 assert.equal(op.matrix.length,9);assert.ok(op.matrix.every(row=>row.length===9&&row.every(Number.isInteger)));
 assert.equal(op.columns.length,9);assert.equal(op.traceTerms.length,9);
 assert.deepEqual(op.diagonal,op.matrix.map((row,i)=>row[i]));
 assert.equal(op.trace,op.diagonal.reduce((a,b)=>a+b,0));
 for(const col of op.columns){
  assert.deepEqual(col.vector,op.matrix.map(row=>row[col.index]));
  assert.equal(col.diagonalContribution,col.vector[col.index]);
  assert.equal(col.vector[col.targetBasisIndex],col.coefficient);
 }
}
assert.deepEqual(r.characters.displacement,[9,-1,3,1]);
assert.deepEqual(r.characters.translation,[3,-1,1,1]);
assert.deepEqual(r.characters.rotation,[3,-1,-1,-1]);
assert.deepEqual(r.characters.vibration,[3,1,3,1]);
assert.equal(r.reductions.vibration.latex,'2A_1+B_1');
assert.equal(r.counterexample.actualDisplacementCharacter,-1);
assert.deepEqual(r.counterexample.oxygenDiagonal,[-1,-1,1]);
assert.equal(r.selectionChannels.length,4);
assert.ok(r.selectionChannels.every(c=>c.modeRows.length===3));
assert.equal(r.checks.length,33);assert.ok(r.checks.every(c=>c.passed===true&&c.residual===0));
// The 2026-11-24 classroom revision makes its two A1 trial motions
// mass-orthogonal. The independent water_actions ledger and its 36 columns
// remain bit-for-bit unchanged (build-water-actions-reference.py --check).
assert.equal(sha(bytes('dist/python/foundations_demos.py')),'5182b29528b981c6e58ff20ff8215e9be36f5641515c2c8cde38a8c9e3588454');
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const locales=['en-water-actions-ui.json','en-water-actions-host.json','en-water-actions-docs.json'];
const previous=Object.assign({},...catalogFiles.filter(n=>!locales.includes(n)).map(n=>JSON.parse(bytes('locales/'+n))));
for(const name of locales){
 assert.ok(catalogFiles.includes(name));
 const map=JSON.parse(bytes('locales/'+name));
 assert.ok(Object.keys(map).length);assert.ok(Object.values(map).every(x=>typeof x==='string'&&x.trim()));
 for(const [source,value]of Object.entries(map))if(Object.hasOwn(previous,source))
  assert.equal(value,previous[source],name+': cannot redefine an existing global translation');
}
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/foundations-demos.js','dist/foundations-demos.css',
 'dist/water-actions-ui.js','dist/water-actions.css','dist/docs/water-actions.md',
 'dist/python-client.js','dist/python-worker.js','dist/python/browser_api.py','dist/python/water_actions.py',
 'dist/python/foundations_demos.py','dist/math-display.js','dist/math-notation.js','dist/english-results.js',
 'dist/zero-start.js','dist/pointgroup-ui.js','dist/data/pointgroup-lessons.json',
 'dist/data/search-index.json','scripts/build-search-index.mjs','scripts/search-catalog-source.mjs',
 'dist/lesson-progression.js','dist/lesson-progression-index.js',
 'scripts/build-water-actions-provenance.mjs','scripts/build-water-actions-reference.py','scripts/test-python-water-actions.py',
 'scripts/test-water-actions-ui.mjs','scripts/test-water-actions-host.mjs','scripts/test-water-actions-worker.mjs',
 'scripts/test-foundations-demos.mjs','scripts/test-foundations-routing.mjs','scripts/test-classroom-disposal.mjs',
 'scripts/test-request-scoped-wrapper.mjs','scripts/test-python-client.mjs','scripts/test-material-research-ui.mjs',
 'scripts/fixtures/water-actions.json','scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/fixtures/spin-actions.json','scripts/fixtures/antitranslation.json','scripts/fixtures/composition.json',
 'scripts/fixtures/su3-basis.json','scripts/fixtures/su3-copy.json',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/refresh-english-provenance.py',
 'scripts/package-source.py','scripts/test-source-package.py',...catalogFiles.map(n=>'locales/'+n)];
const document={schemaVersion:1,release:'20261116-water1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional operation-to-character replay in the existing water demonstration; original molecular preview and computation remain separate.',
 counts:{indexedLessons:197,optionalEdges:259,newLessonIds:0,newGraphEdges:0,realAPIReferences:1,
  operations:4,displacementDimension:9,returnedColumns:36,stages:5,opticalChannels:4,selectionChecks:12,
  exactInternalChecks:33,newLocaleFiles:3,extractedSourceNodeBuilders:19},
 contract:{action:'water_actions',input:'Strict empty JSON object; local operation/column/channel choices browse one complete Python reply.',
  basis:'O,H1,H2 atom-major, x,y,z direction-minor; active column-vector displacement, fixed bent xz molecule and z twofold axis.',
  action:'The atom permutation and Cartesian polar-vector action construct each exact nine-dimensional matrix and signed column image.',
  trace:'Only diagonal entries count. C2 fixes O but reverses Ox and Oy, producing -1 rather than the scalar fixed-atom guess +1.',
  subtraction:'Translations use R; rotations use det(R)R. Exact characters, subtraction and each weighted irreducible-reduction contribution are returned.',
  selection:'The three existing vibrational symmetry types compare against the same four IR/Raman channels. Permissions are distinct from measured intensities.',
  lifecycle:'Disclosure imports the interface only when opened; manual Run starts standard-library Python. Native open state, local choices, predictions, notes and complete results have separate page memory and export.',
  isolation:'Legacy animation, parameters, Python status/result and application capture remain associated with their own input. Late imports, rejected/old tasks, cancellation and parent detach cannot take over newer tasks.'},
 verification:['Real shared public API fixture and strict frozen-reference regeneration.',
  'Independent integer geometry/Kronecker actions, all sixteen group products, axial cross products and exact rational character-projector rank/orthogonality tests.',
  'Production UI and host events check local browsing, state restoration, disclosure retry, asynchronous ownership, immutable source/export and existing-preview isolation.',
  'Real Worker dependency selector loads only browser_api and water_actions, without numpy, sympy, crystallographic databases or unrelated optional modules.',
  'Historical fixtures are regenerated through original builders and compared strictly before provenance updates; extracted source replays its registered builders.'],
 boundaries:['One fixed nonlinear bent H2O symmetry model, not a general molecular point-group or normal-mode solver.',
  'Drawing coordinates are twelve-decimal numerical aids; all matrix, character and reduction entries are exact integers.',
  'No force constants, frequencies, fitted material spectrum or absolute optical intensity is inferred.',
  'Two A1 copies do not require equal frequencies; prediction feedback does not establish measured learning gains.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=bytes(name);return[name,{normalization:'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/water-actions-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Water action provenance is stale');
else fs.writeFileSync(target,body);
console.log('Water action teaching:',JSON.stringify(document.counts));
