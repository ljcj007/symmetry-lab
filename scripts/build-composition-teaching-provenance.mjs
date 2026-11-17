import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {toolInputFormats} from '../dist/tool-capabilities.js';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const normalized=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const refs=JSON.parse(normalized('scripts/fixtures/composition.json'));
assert.equal(refs.schema,'symmetry-lab-composition-fixture-1');
assert.equal(refs.cases.length,8);assert.match(refs.method,/Actual browser_api\.run/);
for(const [name,sha] of Object.entries(refs.sourceHashes))assert.equal(hash(normalized(name)),sha,name);
for(const row of refs.cases){
 assert.equal(row.input.lab,'composition');assert.equal(row.result.schema,'symmetry-lab-composition-1');
 assert.equal(row.result.exact,true);assert.deepEqual(row.result.input,row.input);
 assert.equal(row.result.basis.dimension,2);assert.equal(row.result.group.order,8);
 assert.ok(row.result.checks.length&&row.result.checks.every(check=>check.passed===true));
}
const formatNames=new Set(Object.values(toolInputFormats).flatMap(rows=>rows.flatMap(row=>row.files)));
assert.equal(Object.keys(toolInputFormats).length,5);
assert.deepEqual([...formatNames].sort(),['band.yaml','mesh.yaml','partial_dos.dat','phonopy.yaml','phonopy_disp.yaml','projected_dos.dat','qpoints.yaml','thermal_properties.yaml','total_dos.dat'].sort());
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
assert.equal(new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to])).size,197);
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','dist/index.html','dist/app.js',
 'dist/pointgroup-ui.js','dist/composition-ui.js','dist/composition.css','dist/classroom-ui.js','dist/zero-start.js',
 'dist/tool-capabilities.js','dist/tool-search.js','dist/navigation-ui.js','dist/tool-finder.js',
 'dist/python-client.js','dist/python-worker.js','dist/python/browser_api.py','dist/python/teaching_labs.py',
 'dist/python/composition_lab.py','dist/docs/composition.md','dist/lesson-progression.js',
 'scripts/test-composition-ui.mjs','scripts/test-python-composition.py','scripts/build-composition-reference.py',
 'scripts/test-file-search.mjs','scripts/test-python-client.mjs','scripts/test-request-scoped-wrapper.mjs','scripts/test-classroom-disposal.mjs',
 'scripts/test-workbench-routes.mjs','scripts/test-project-navigation.mjs','scripts/test-lie-stage-navigation.mjs','scripts/test-structure-workflow.mjs',
 'scripts/test-spin-actions-worker.mjs','scripts/build-composition-teaching-provenance.mjs',
 'scripts/fixtures/composition.json','scripts/fixtures/antitranslation.json','scripts/fixtures/spin-actions.json',
 'scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/test-english-results.mjs','scripts/audit-english-results.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/build-english.mjs',
 'scripts/refresh-english-provenance.py','scripts/package-source.py','scripts/test-source-package.py',
 'locales/en-composition-ui.json','locales/en-composition-host.json','locales/en-composition-python.json',
 'locales/en-composition-docs.json','locales/en-file-search.json'];
const document={schemaVersion:1,release:'20261116-composition1',sourceHashNormalization:'utf8-lf-v1',
 scope:'A first-lesson exact operation-order workshop and scientific-filename discovery across existing tools.',
 counts:{indexedLessons:197,reviewedConnectedLessons:197,optionalEdges:259,newOptionalEdges:0,
  newWorkshopPlacements:1,realNewAPIReferences:8,independentPythonTestGroups:9,
  supportedFilenameAliases:9,inputPurposeToolFamilies:5,extractedSourceChecks:16},
 contract:{action:'teaching_labs',lab:'composition',schema:'symmetry-lab-composition-1',lesson:'group-basics',
  space:'Active Cartesian column vectors in a fixed two-dimensional plane. The rightmost written factor acts first.',
  mathematics:'Python exact bounded integers supply all eight operations, both chronological paths, point/basis/corner frames, equality tests, inverses,64 products, missing closure witnesses and finite closure rounds.',
  teaching:'Prediction and targeted feedback precede explicit manual calculation. Stage and frame changes select existing returned data; the interface does not solve group algebra.',
  probe:'M and E agree on a nonzero x-axis probe but differ as maps. The selected MR and RM agree only at the planar origin. The fixed counterexample is separate from selected inputs.',
  embedding:'The planar dihedral D4 action extended with fixedz is C4v, not the proper three-dimensional rotation group D4.',
  loading:'Only group-basics can lazily import the workshop on opening its native disclosure. Manual Run loads the stdlib-only optional core, without new numerical libraries.',
  state:'Independent drafts, predictions, notes, stage and disclosures survive normal returns. Normal and initially failed/retried classroom loads return stable cleanup that delegates to the latest retry child. Detached owners cannot render, export or cancel a later task. Original pointgroup lab and quiz state retain their existing behavior.',
  cancellation:'The application capture wrapper preserves the client request-scoped Promise.cancel handle. Rejected, completed and stale requests cannot terminate another request; timeout callbacks carry the same ownership guard.',
  search:'One immutable input-format metadata owner supplies filenames, purpose and conditions to the existing directory, home and quick finder. Literal supported filenames, pasted paths and case variants rank appropriate existing destinations.',
  searchScope:'Filename matches guide navigation only; parsers still validate content. Discrete paths are not bulk thermal quadrature, projected DOS is not complete total DOS, and a single thermal table is not complete QHA input.'},
 compatibility:{baselineCommit:'abef4d78ec71c91687b05920654732e9f2abb903',
  originalProjectStagesGenuinelyRecomputed:24,projectNumericLeavesExactlyUnchanged:148575,projectOtherLeavesExactlyUnchanged:3447,
  originalSpinReferencesGenuinelyRecomputed:39,spinNumericLeavesExactlyUnchanged:12151,spinOtherLeavesExactlyUnchanged:12187,
  originalAntitranslationReferencesGenuinelyRecomputed:10,antitranslationNumericLeavesExactlyUnchanged:8183,antitranslationOtherLeavesExactlyUnchanged:5163},
 verification:['Independent corner-permutation and complex-plane oracles check all64 products,512 associative triples,255 nonempty subsets and both basis arrows for bounded points.',
  'The actual host, shared client and application wrapper exercise lazy imports, manual runs, rejected/late owners, cancellation and unchanged capture rules.',
  'Genuine reference results render at all four stages, including malformed-response retry, immutable export, raw drafts and native NodeList behavior.',
  'Both language editions exercise real finder/directory handlers for supported files and parser input boundaries. All original74 tool routes remain available.',
  'The distributed archive runs fifteen Node provenance builders and the English provenance check without Git or checkout-local dependencies.'],
 boundaries:['This is a finite eight-operation teaching model, not arbitrary group closure or a crystallographic classifier.',
  'It does not add space translations, spinor lifts, Bloch phases or magnetic-group classification.',
  'Local feedback is not measured learning improvement or a new course score. Complete prerequisite depth, targeted remediation and authentic workflows across all tool families remain active work.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const bytes=normalized(name);return[name,{normalization:'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/composition-teaching-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Composition teaching provenance is stale');
else fs.writeFileSync(target,body);
console.log('Composition teaching:',JSON.stringify(document.counts));
