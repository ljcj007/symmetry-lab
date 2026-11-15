import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const normalized=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const refs=JSON.parse(normalized('scripts/fixtures/su3-basis.json'));
assert.equal(refs.schema,'symmetry-lab-su3-basis-fixture-1');
assert.equal(refs.cases.length,15);assert.match(refs.method,/Actual browser_api\.run/);
for(const [name,sha] of Object.entries(refs.sourceHashes))assert.equal(hash(normalized(name)),sha,name);
// Freeze the canonical pre-existing CG conventions independently of the new
// reference file, which must not authorize changing both a core and its oracle.
assert.equal(hash(normalized('dist/python/su3_cg.py')),'201e06fe4ee0f168813e23fcf7819f087b70b3912ae16ac94a12b4b14791b794');
assert.equal(hash(normalized('dist/python/su3_cg_exact.py')),'7742e5b74e053023955865f6f18e94461b284ab06fa04c353bb19c02cabeb7f2');
const expectedPairs=[];
for(let total=0;total<=4;total++)for(let p=total;p>=0;p--)expectedPairs.push([p,total-p]);
assert.deepEqual(refs.cases.map(row=>[row.input.p,row.input.q]),expectedPairs);
let states=0,columns=0;
const ids=['E12','E21','E23','E32','E13','E31','H1','H2'];
for(const row of refs.cases){
 const {input,result:r}=row,d=(input.p+1)*(input.q+1)*(input.p+input.q+2)/2;
 assert.equal(input.lab,'su3_basis');assert.deepEqual(Object.keys(input).sort(),['lab','p','q']);
 assert.equal(r.schema,'symmetry-lab-su3-basis-1');assert.equal(r.exact,true);
 assert.deepEqual(r.input,input);assert.deepEqual(r.normalizedInput,input);
 assert.equal(r.representation.dimension,d);assert.equal(r.basis.dimension,d);
 assert.equal(r.basis.states.length,d);assert.deepEqual(r.basis.order,Array.from({length:d},(_,i)=>i));
 assert.deepEqual(r.operators.map(op=>op.id),ids);
 for(const op of r.operators){assert.deepEqual(op.matrix.shape,[d,d]);assert.equal(op.columns.length,d);columns+=d;}
 assert.deepEqual(r.weightGroups.flatMap(group=>group.members).sort((a,b)=>a-b),r.basis.order);
 assert.deepEqual(r.fixedOctet.indices,[3,4]);assert.equal(r.fixedOctet.dimension,8);
 assert.ok(r.checks.length&&r.checks.every(check=>check.passed===true));states+=d;
}
const locales=['en-su3-basis-ui.json','en-su3-basis-host.json','en-su3-basis-python.json','en-su3-basis-docs.json'];
for(const name of locales){
 assert.ok(catalogFiles.includes(name),'English catalog must register '+name);
 const map=JSON.parse(normalized('locales/'+name));assert.ok(Object.keys(map).length,name);
 for(const translation of Object.values(map))assert.ok(typeof translation==='string'&&translation.trim(),name);
}
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
assert.equal(new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to])).size,197);
// This list includes the builder's local import closure (catalog + progression
// index) and the actual runtime/UI/test/export dependencies. It deliberately
// excludes its generated manifest and the generated English provenance, keeping
// the dependency graph acyclic and replayable without Git or node_modules.
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/lie-group-ui.js','dist/lie-group.css',
 'dist/su3-basis-ui.js','dist/su3-basis.css','dist/python-client.js','dist/python-worker.js',
 'dist/python/browser_api.py','dist/python/teaching_labs.py','dist/python/lie_labs.py','dist/python/lie_applications.py',
 'dist/python/crystal_labs.py','dist/python/group_extensions.py',
 'dist/python/su3_basis_lab.py','dist/python/su3_cg.py','dist/python/su3_cg_exact.py',
 'dist/docs/su3-basis.md','dist/data/lie-group-lessons.json','dist/math-display.js','dist/math-notation.js',
 'dist/lesson-progression.js','dist/lesson-progression-index.js','dist/english-results.js',
 'scripts/build-su3-basis-provenance.mjs','scripts/build-su3-basis-reference.py',
 'scripts/test-python-su3-basis.py','scripts/test-su3-basis-ui.mjs','scripts/test-spin-actions-worker.mjs',
 'scripts/test-python-su3-cg.py','scripts/test-python-su3-cg-exact.py',
 'scripts/test-lie-group-ui.mjs','scripts/test-classroom-disposal.mjs','scripts/test-request-scoped-wrapper.mjs',
 'scripts/test-material-research-ui.mjs','scripts/test-python-client.mjs','scripts/test-workbench-routes.mjs',
 'scripts/fixtures/su3-basis.json','scripts/fixtures/su3-cg-extended-ui.json',
 'scripts/fixtures/composition.json','scripts/fixtures/antitranslation.json','scripts/fixtures/spin-actions.json',
 'scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py',
 'scripts/test-english-results.mjs','scripts/audit-english-results.mjs','scripts/test-english-edition.mjs',
 'scripts/refresh-english-provenance.py','scripts/package-source.py','scripts/test-source-package.py',
 ...locales.map(name=>'locales/'+name)];
const document={schemaVersion:1,release:'20261116-gt1',sourceHashNormalization:'utf8-lf-v1',
 scope:'An optional canonical SU(3) GT-to-Cartan-to-generator-column teaching workshop in two existing lessons.',
 counts:{indexedLessons:197,reviewedConnectedLessons:197,optionalEdges:259,newOptionalEdges:0,
  newWorkshopPlacements:2,supportedRepresentations:15,maximumRepresentationDimension:27,
  realNewAPIReferences:15,returnedBasisRowsAcrossReferences:states,returnedOperatorsAcrossReferences:120,
  returnedColumnsAcrossReferences:columns,independentPythonTestGroups:9,newLocaleFiles:4,extractedSourceNodeBuilders:16},
 contract:{action:'teaching_labs',lab:'su3_basis',schema:'symmetry-lab-su3-basis-1',
  lessons:['su3-dynkin-representations','su3-cg-change-basis'],
  input:'Only lab,p,q; genuine nonnegative integers with p+q<=4. State and generator selectors browse the complete result locally. A representation change retires the result and requires manual Run.',
  canonical:'Existing exact su3_cg_exact._irrep matrices and su3_cg._basis/_name metadata are copied without mutating cached objects. The original basis order, positive adjacent raising phases and conjugate-triplet signs are retained.',
  ledger:'Every GT row, all six interlacing inequalities, contents n1,n2,n3, integer H1,H2, exact T3,T8,I,I3,Y and every member index of each weight point are returned.',
  columns:'All eight canonical generator matrices and every raw column are returned with exact/numeric/LaTeX mirrors, nonzero target terms, squared norms and zero-vector flags. Ladder operators are not finite unitary operations and raw norms are not transition probabilities.',
  counterexample:'A separately labelled fixed adjoint octet compares its two internal zero-weight states through E12 and E23, independently of the selected input. It does not compare outer 8s/8a copies.',
  loading:'Opening either native workshop disclosure lazily imports the interface. Only manual su3_basis calculation loads its three canonical Python modules and numpy+sympy; other finite, CG, Racah and 9j plans retain their own dependencies.',
  state:'Independent lesson drafts, predictions, notes, stage, native disclosures and local row/generator views survive ordinary returns. Raw drafts, stale results, immutable exports, request-scoped cancellation and initially failed/retried parent cleanup are tested through actual handlers.',
  scope:'Fifteen SU(3) irreps with p+q<=4; no generic SU(N) solver, new CG basis transformation, automatic physical flavor interpretation or energy-degeneracy diagnosis.'},
 compatibility:{baselineCommit:'78b920bd3f763bfa8466d791ace69cc3bf5f8600',
  originalNumericCGSourceSHA256:'201e06fe4ee0f168813e23fcf7819f087b70b3912ae16ac94a12b4b14791b794',
  originalExactCGSourceSHA256:'7742e5b74e053023955865f6f18e94461b284ab06fa04c353bb19c02cabeb7f2',
  originalCGRule:'Same-host public numeric and exact CG requests are compared strictly before/after all fifteen new inputs and reply-mutation attempts; cached canonical data remain unchanged.',
  graph:'No new lesson or recommendation edge is introduced; the existing197 lessons and259 optional edges retain their current inventory.'},
 verification:['The public Python API generates all fifteen complete reference replies; exact strings, structures, original inputs and declared source hashes are checked strictly.',
  'Independent cube enumeration, fundamental matrix units/Gell-Mann diagonals, the explicit conjugate-basis transformation, full traceless gl(3) commutators, transpose pairs, Casimir and every nonzero root shift check the mathematics.',
  'Actual UI, native NodeList, shared client, application wrapper and nested classroom handlers exercise all returned states, six ladders, five stages, malformed replies, drafts, immutable exports, cancellation and stale/failed-retry owner cleanup.',
  'The actual Worker loader verifies precisely numpy+sympy and the three SU(3) basis modules for this request, with unchanged finite, numeric/exact CG, Racah and 9j plans.',
  'Four registered English maps cover the interface, host, Python result messages and documentation. The downloadable archive replays this builder with its local import closure without Git or checkout-local dependencies.'],
 boundaries:['Cartan coordinates are eigenvalue labels, not real-space, momentum-space or energy coordinates. Coincident weights retain distinct basis states.',
  'A zero operator output is distinct from a zero-weight input. I,Y,u,d,s acquire physical meanings only after specifying a model.',
  'Local predictions, notes and feedback do not record course grades or establish measured learning improvement.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const bytes=normalized(name);return[name,{normalization:'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/su3-basis-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'SU(3) basis provenance is stale');
else if(!process.argv.includes('--dry-run'))fs.writeFileSync(target,body);
console.log('SU(3) basis teaching:',JSON.stringify(document.counts));
