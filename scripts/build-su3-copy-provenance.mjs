import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(bytes('scripts/fixtures/su3-copy.json'));
assert.equal(fixture.schema,'symmetry-lab-su3-copy-fixture-1');
assert.equal(fixture.cases.length,12);
assert.match(fixture.method,/browser_api\.run/);
for(const [name,hash]of Object.entries(fixture.sourceHashes))assert.equal(sha(bytes(name)),hash,name);
assert.equal(sha(bytes('dist/python/su3_cg.py')),'201e06fe4ee0f168813e23fcf7819f087b70b3912ae16ac94a12b4b14791b794');
assert.equal(sha(bytes('dist/python/su3_cg_exact.py')),'7742e5b74e053023955865f6f18e94461b284ab06fa04c353bb19c02cabeb7f2');
const presets=[0,45,90].flatMap(angle=>['1','i','-1','-i'].map(phase=>({lab:'su3_copy',angle,phase})));
assert.deepEqual(fixture.cases.map(x=>x.input),presets);
for(const {input,result:r}of fixture.cases){
 assert.equal(r.schema,'symmetry-lab-su3-copy-1');assert.equal(r.lab,'su3_copy');assert.deepEqual(r.request,input);
 assert.deepEqual(r.dimensions,{product:64,inner:8,outer:2,isotypic:16,zeroWeightPerCopy:2,zeroWeightBothCopies:4});
 assert.equal(r.pairs.length,8);assert.deepEqual(r.pairs.map(p=>p.mu),[0,1,2,3,4,5,6,7]);
 assert.deepEqual(r.canonicalEmbedding.shape,[64,16]);assert.deepEqual(r.rotation.embedding.shape,[64,16]);
 assert.deepEqual(r.rotation.U.shape,[16,16]);assert.deepEqual(r.rotation.exchange.shape,[16,16]);
 assert.equal(r.fixed.states.length,8);assert.equal(r.generators.length,8);assert.equal(r.steps.length,5);
 assert.ok(r.checks.length===36&&r.checks.every(c=>c.passed===true&&c.residual.exact==='0'));
 assert.equal(r.canonical.sha256,'d19ea8629a6a28e7829e2f5e1e2ee1d9a8802ccd6febcdd4083574a95920dec8');
 assert.equal(r.canonical.serialization,'python-json-utf8-sorted-v1');
 assert.equal(typeof r.canonical.serialized,'string');
 assert.equal(sha(Buffer.from(r.canonical.serialized,'utf8')),r.canonical.sha256);
 assert.deepEqual(JSON.parse(r.canonical.serialized),r.canonical.reply);
 assert.equal(r.canonical.reply.dimension,64);assert.equal(r.canonical.reply.arithmetic,'exact');
 const zero=r.pairs.filter(p=>p.weight.every(x=>x===0));
 assert.equal(zero.length,2);assert.deepEqual(zero.flatMap(p=>[p.s.canonicalColumn,p.a.canonicalColumn]),[50,58,51,59]);
 assert.ok(r.generators.every(g=>g.canonicalResidual.exact==='0'&&g.rotatedResidual.exact==='0'&&g.standardUnchangedResidual.exact==='0'));
 assert.equal(r.counterexample.oldE12MaxAbs.exact,'2*sqrt(15)/5');
 assert.ok(r.counterexample.generators.every(g=>g.repairedResidual.exact==='0'));
}
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const locales=['en-su3-copy-ui.json','en-su3-copy-host.json','en-su3-copy-python.json','en-su3-copy-docs.json'];
const oldTranslations=Object.assign({},...catalogFiles.filter(name=>!locales.includes(name)).map(name=>JSON.parse(bytes('locales/'+name))));
for(const name of locales){
 assert.ok(catalogFiles.includes(name));const map=JSON.parse(bytes('locales/'+name));
 assert.ok(Object.keys(map).length);assert.ok(Object.values(map).every(x=>typeof x==='string'&&x.trim()));
 for(const [source,value]of Object.entries(map))if(Object.hasOwn(oldTranslations,source))
  assert.equal(value,oldTranslations[source],name+' must not change an existing global translation: '+source);
}
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/lie-group-ui.js',
 'dist/su3-copy-ui.js','dist/su3-copy.css','dist/su3-basis-ui.js','dist/su3-cg-ui.js',
 'dist/python-client.js','dist/python-worker.js','dist/python/browser_api.py','dist/python/teaching_labs.py',
 'dist/python/su3_copy_lab.py','dist/python/su3_cg.py','dist/python/su3_cg_exact.py',
 'dist/docs/su3-copy.md','dist/data/lie-group-lessons.json','dist/math-display.js','dist/math-notation.js',
 'dist/english-results.js','dist/lesson-progression.js','dist/lesson-progression-index.js',
 'scripts/build-su3-copy-provenance.mjs','scripts/build-su3-copy-reference.py','scripts/test-python-su3-copy.py',
 'scripts/test-su3-copy-ui.mjs','scripts/test-su3-copy-host.mjs','scripts/test-spin-actions-worker.mjs',
 'scripts/test-su3-basis-ui.mjs','scripts/test-lie-group-ui.mjs','scripts/test-classroom-disposal.mjs',
 'scripts/test-request-scoped-wrapper.mjs','scripts/test-material-research-ui.mjs','scripts/test-python-client.mjs',
 'scripts/fixtures/su3-copy.json','scripts/fixtures/su3-basis.json','scripts/fixtures/su3-cg-extended-ui.json',
 'scripts/fixtures/spin-actions.json','scripts/fixtures/antitranslation.json','scripts/fixtures/composition.json',
 'scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py',
 'scripts/test-english-results.mjs','scripts/audit-english-results.mjs','scripts/test-english-edition.mjs',
 'scripts/refresh-english-provenance.py','scripts/package-source.py','scripts/test-source-package.py',
 ...catalogFiles.map(name=>'locales/'+name)];
const document={schemaVersion:1,release:'20261116-copy1',sourceHashNormalization:'utf8-lf-v1',
 scope:'An optional exact 8x8 SU(3) octet-copy embedding, exchange and consistent basis-change workshop in two existing CG lessons.',
 counts:{indexedLessons:197,optionalEdges:259,newOptionalEdges:0,newWorkshopPlacements:2,
  realNewAPIReferences:12,internalStatesPerReply:8,outerCopies:2,productDimension:64,isotypicDimension:16,
  completeGeneratorChecksPerReply:8,teachingStages:5,newLocaleFiles:4,extractedSourceNodeBuilders:18},
 contract:{action:'teaching_labs',lab:'su3_copy',schema:'symmetry-lab-su3-copy-1',
  lessons:['su3-cg-change-basis','su3-cg-multiplicity'],
  input:'Only lab, angle=0/45/90 and phase=1/i/-1/-i. All8 internal states returned; changing local mu only browses that complete result.',
  canonical:'The original exact 64x64 CG request and complete reply retain their identity, ordering and phases. The original sorted Python JSON text is also retained, so its UTF8 SHA256 can be verified after browser JSON serialization. Canonical data are copied; the old numerical/exact CG cores are immutable.',
  paired:'Full(p,q), copy parity, localIndex and GT metadata pair two64D embeddings for every mu. Two internal zero weights remain four independent columns across both copies.',
  transform:'R=Rtheta diag(1,zeta), U=R tensor I8, C8prime=C8 U, Bprime=Udagger B, Pprime=Udagger P U. All16 columns and all8 generators use the same transformation.',
  physical:'The eight original symmetric physical states, norms, octet projector and exchange expectation are invariant. New-copy coordinate probabilities are distinct from physical exchange-projector probabilities.',
  counterexample:'One selected internal column changes sign. The basis remains orthonormal, but the unchanged standard generators fail intertwining. Qdagger D Q repairs all8 generators.',
  localization:'Only fresh registered display fields translate. The canonical subtree stays opaque, including its original prose and digest; all inputs/raw/export values remain protected.',
  lifecycle:'Native disclosure loads the UI only when opened; manual Run starts Python. Independent lesson drafts, prediction feedback, notes, local selections and stages persist. Request-scoped cancellation and parent/retry disposal isolate old tasks.'},
 verification:['Twelve actual public API results have exact symbolic fields, complete original CG replies and source identities; same-host cache and mutation checks are strict.',
  'Independent SymPy constructions verify all pairs,64x16 embeddings,16x16 transforms,64x64 projectors, eight physical states and all eight intertwiners.',
  'Production UI and host handlers exercise both languages, all stages, local pairing, input identities, immutable exports, native disclosure behavior and stale/retried parent cleanup.',
  'The real Worker loader checks its precise numpy+sympy/three-core plan and preserves finite, old GT, numerical/exact CG,Racah and9j plans.',
  'The distributed source includes this builder and its import closure, replayable without Git,node_modules or local dependencies.'],
 boundaries:['Finite 8 tensor 8 teaching presets; no general U(2) parser or changed CG solver.',
  'Copy-basis changes are passive, not dynamics or transitions. New copies are not exchange eigenstates unless the transformed exchange matrix is diagonal.',
  'CG amplitudes alone do not determine energies, rates, reduced matrix elements or complete identical-particle statistics.',
  'Prediction feedback and implementation tests do not establish student learning gains.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=bytes(name);return[name,{normalization:'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/su3-copy-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'SU(3) copy provenance is stale');
else fs.writeFileSync(target,body);
console.log('SU(3) copy teaching:',JSON.stringify(document.counts));
