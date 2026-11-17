import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(bytes('scripts/fixtures/representation-actions.json'));
assert.equal(fixture.schema,'symmetry-lab-representation-actions-fixture-1');
assert.match(fixture.method,/actual browser_api\.run/);
assert.deepEqual(fixture.cases.map(c=>c.input),[[1,2],[0,0],[1,0],[0,1],[-2,-1]].map(point=>({point})));
for(const [name,hash]of Object.entries(fixture.sourceHashes))assert.equal(sha(bytes(name)),hash,name);
const counts={original:[64,0],common:[64,0],mixed:[46,18],trivial:[64,0]};
for(const c of fixture.cases){
 const r=c.result;assert.equal(c.action,'representation_actions');
 assert.equal(r.schema,'symmetry-lab-representation-actions-1');assert.deepEqual(r.input,c.input);
 assert.equal(r.group.id,'C4v');assert.equal(r.group.order,8);assert.equal(r.group.dimension,2);
 assert.deepEqual(r.group.operationIds,['E','R','R2','R3','M','RM','R2M','R3M']);
 assert.equal(r.group.operations.length,8);assert.equal(r.group.multiplicationTable.length,8);
 assert.deepEqual(r.families.map(f=>f.id),['original','common','mixed','trivial']);
 for(const f of r.families){
  assert.equal(f.operations.length,8);assert.equal(f.pairs.length,64);
  assert.deepEqual([f.law.passedPairs,f.law.failedPairs],counts[f.id]);
  assert.equal(f.pairs.filter(p=>p.equal).length,f.law.passedPairs);
  assert.equal(f.law.isRepresentation,f.id!=='mixed');
  assert.ok(f.operations.every(o=>o.orthogonal===true));
  for(const p of f.pairs){assert.equal(p.frames.length,3);assert.equal(p.direct.id,'direct-gh');
   for(const frame of [...p.frames,p.direct])assert.equal(frame.basisImages.length,2);}
 }
 const [a,b,m,t]=r.families;
 assert.deepEqual(a.characters,b.characters);assert.deepEqual(a.characters,m.characters);
 assert.deepEqual(a.coeffGram,m.coeffGram);
 assert.equal(m.formalCharacterNorm.exact,'1');assert.equal(m.law.faithful,null);
 assert.equal(t.formalCharacterNorm.exact,'4');assert.equal(t.law.faithful,false);
 assert.equal(t.law.distinctMatrices,1);assert.equal(t.law.kernelIds.length,8);
 assert.equal(r.basisChange.equal,true);assert.equal(r.commonReconstruction.length,8);
 assert.ok(r.commonReconstruction.every(q=>q.equal&&q.operatorEqual));
 assert.equal(r.diagonalization.noCommonDiagonalBasis,true);
 assert.equal(r.diagonalization.mixedProductEqual,false);
 assert.equal(r.diagonalization.rotationField.realDiagonalizable,false);
 assert.equal(r.diagonalization.rotationField.complexDiagonalizable,true);
 assert.equal(r.checks.length,11);assert.ok(r.checks.every(q=>q.passed===true));
}
assert.equal(sha(bytes('dist/python/composition_lab.py')),'990de6b6327eee01e8d9b3cb14cc9ab421c895375942313464c3d4d2fc74fc0f');
assert.equal(sha(bytes('dist/python/water_actions.py')),'79f8d2c6278b227e5ac65f8f7475bb3b1b2894ac93a0281ddfae2d1179acd415');
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const locales=['en-representation-actions-ui.json','en-representation-actions-host.json','en-representation-actions-docs.json'];
const previous=Object.assign({},...catalogFiles.filter(n=>!locales.includes(n)).map(n=>JSON.parse(bytes('locales/'+n))));
for(const name of locales){
 assert.ok(catalogFiles.includes(name));const map=JSON.parse(bytes('locales/'+name));
 assert.ok(Object.keys(map).length);assert.ok(Object.values(map).every(x=>typeof x==='string'&&x.trim()));
 for(const [source,value]of Object.entries(map))if(Object.hasOwn(previous,source))
  assert.equal(value,previous[source],name+': cannot redefine an existing global translation');
}
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/pointgroup-ui.js','dist/pointgroup.css',
 'dist/representation-actions-ui.js','dist/representation-actions.css','dist/docs/representation-actions.md',
 'dist/python-client.js','dist/python-worker.js','dist/python/browser_api.py','dist/python/representation_actions.py',
 'dist/python/composition_lab.py','dist/python/water_actions.py','dist/composition-ui.js','dist/water-actions-ui.js',
 'dist/math-display.js','dist/math-notation.js','dist/english-results.js','dist/zero-start.js',
 'dist/data/pointgroup-lessons.json','dist/lesson-progression.js','dist/lesson-progression-index.js',
 'dist/data/search-index.json','scripts/build-search-index.mjs','scripts/search-catalog-source.mjs',
 'scripts/build-representation-actions-provenance.mjs','scripts/build-representation-actions-reference.py',
 'scripts/test-python-representation-actions.py','scripts/test-representation-actions-ui.mjs',
 'scripts/test-representation-actions-host.mjs','scripts/test-representation-actions-worker.mjs',
 'scripts/test-pointgroup-ui.mjs','scripts/test-composition-ui.mjs','scripts/test-classroom-disposal.mjs',
 'scripts/test-request-scoped-wrapper.mjs','scripts/test-python-client.mjs','scripts/test-material-research-ui.mjs',
 'scripts/fixtures/representation-actions.json','scripts/fixtures/water-actions.json',
 'scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/fixtures/spin-actions.json','scripts/fixtures/antitranslation.json','scripts/fixtures/composition.json',
 'scripts/fixtures/su3-basis.json','scripts/fixtures/su3-copy.json',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/refresh-english-provenance.py',
 'scripts/package-source.py','scripts/test-source-package.py',...catalogFiles.map(n=>'locales/'+n)];
const document={schemaVersion:1,release:'20261117-rep1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional finite representation-law and common-basis workshop in two existing foundations lessons.',
 counts:{indexedLessons:197,optionalEdges:259,newLessonIds:0,newGraphEdges:0,placements:2,realAPIReferences:5,
  supportedIntegerPoints:25,groupElements:8,orderedPairsPerFamily:64,families:4,stages:5,newLocaleFiles:3,
  independentPythonTests:8,exactCorrectnessChecksPerReply:11,extractedSourceNodeBuilders:20},
 contract:{action:'representation_actions',input:'Exactly point: two strict integers in [-2,2]. Manual calculation returns all four families and all64 pairs for that probe.',
  labels:'C4v planar action and fixed-z mirror embedding, ordered E,R,R2,R3,M,RM,R2M,R3M. Normal form R^k M agrees with the earlier composition workshop.',
  algebra:'For every family and pair, Python returns D(g)D(h),D(gh),their difference, chronological h-then-g frames, and both unit-basis images. Local selectors browse, never calculate scientific results.',
  passive:'One common S transforms every matrix and every coordinate; returned reconstruction identities prove the physical action is unchanged.',
  counterexample:'Changing only R preserves individual orthogonality,traces and even the matrix-coefficient Gram, but fails18/64 products. It is an inconsistent matrix collection, not a representation.',
  repeated:'All elements mapping to I2 form a legitimate nonfaithful representation on an auxiliary space. Repetition alone does not invalidate a representation and is not the geometric action on xy arrows.',
  diagonalization:'Two real reflections each diagonalize separately, but have a nonzero commutator and no common diagonal basis. A quarter rotation diagonalizes over C, not R.',
  lifecycle:'Only opening a native disclosure imports the optional interface. Inputs, local choices, predictions, notes, disclosures and complete results have per-lesson memory and independent export; task-scoped cancellation protects newer work.'},
 verification:['Five complete real API references, with independent integer/rational checks across all25 supported points and every ordered product.',
  'Production renderer and actual host tests distinguish intentional counterexample failures from calculation errors, preserve old lesson/quiz/experiment state and check asynchronous cleanup.',
  'Actual Worker loader retains isolated standard-library dependencies and unchanged earlier water/composition dependency plans.',
  'Original historical fixture builders are genuinely recomputed before source identities change; global bilingual and extracted-source checks remain separate.'],
 boundaries:['A fixed eight-element teaching model and bounded integer probe input; not a general representation classifier.',
  'Mixed and abstract-trivial coordinate ledgers do not describe the same physical xy rotations as the original action.',
  'Character orthogonality assumes a representation; a formal norm does not independently certify the multiplication law or infer protected levels.',
  'Exact examples and prediction feedback do not establish measured learning gains or whole-curriculum completeness.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=bytes(name);return[name,{normalization:'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/representation-actions-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Representation action provenance is stale');
else fs.writeFileSync(target,body);
console.log('Representation action teaching:',JSON.stringify(document.counts));
