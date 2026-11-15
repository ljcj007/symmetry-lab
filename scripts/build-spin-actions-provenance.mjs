import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {lessonProgressionEdges,lessonProgressionInventory} from '../dist/lesson-progression.js';
const root=new URL('../',import.meta.url);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFileSync(new URL(name,root));
const normalized=name=>Buffer.from(read(name).toString('utf8').replace(/\r\n?/g,'\n'));
const refs=JSON.parse(read('scripts/fixtures/spin-actions.json'));
assert.equal(refs.schema,'symmetry-lab-spin-actions-fixture-1');
assert.equal(refs.cases.length,34);assert.equal(refs.legacyCases.length,5);
for(const [name,expected]of Object.entries(refs.sourceHashes))assert.equal(hash(normalized(name)),expected,name);
const kinds={};
for(const row of refs.cases){
 assert.equal(row.input.lab,'spin_actions');assert.equal(row.result.schema,'symmetry-lab-spin-actions-1');
 assert.equal(row.result.exact,true);assert.equal(row.result.experiment,row.input.experiment);
 assert.ok(row.result.checks.length&&row.result.checks.every(x=>x.passed===true),row.id);
 kinds[row.input.experiment]=(kinds[row.input.experiment]||0)+1;
}
assert.deepEqual(kinds,{color_theta:8,spin_stabilizer:20,soc_locking:6});
assert.equal(hash(gunzipSync(read('scripts/fixtures/spin-source-baseline.py.gz'))),'87749a79da15aeb4b831745b8571c47a7bcf268d31c5280a2510c9cae92442f2');
const reviewed=new Set(lessonProgressionEdges.flatMap(e=>[e.from,e.to]));
assert.deepEqual([lessonProgressionInventory.length,reviewed.size,lessonProgressionEdges.length],[197,148,172]);
assert.equal(hash(Buffer.from(JSON.stringify(lessonProgressionEdges.slice(0,130)))),'cb75b4d8a2ed525110a0de080b53c5c41de8372477c12968d1c06451a07e387f');
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/symmetry-course-ui.js','dist/spin-actions-ui.js','dist/spin-actions.css','dist/spincolor-viewer.js','dist/lesson-progression.js','dist/python-worker.js','dist/python-client.js','dist/material-notebook.js','dist/english-results.js',
 'dist/python/browser_api.py','dist/python/teaching_labs.py','dist/python/group_extensions.py','dist/python/spin_actions_lab.py',
 'dist/data/symmetry-course-lessons.json','dist/data/symmetry-derivations.json','dist/docs/spin-actions.md',
 'locales/en-lesson-progression.json','locales/en-spin-actions.json','locales/en-spin-actions-python.json','locales/en-spin-actions-docs.json',
 'scripts/build-spin-actions-reference.py','scripts/build-spin-actions-provenance.mjs','scripts/test-python-spin-actions.py','scripts/test-spin-actions-ui.mjs','scripts/test-spin-actions-worker.mjs','scripts/test-spin-course-connections.mjs','scripts/test-symmetry-course-ui.mjs','scripts/test-lesson-progression.mjs',
 'scripts/fixtures/spin-actions.json','scripts/fixtures/spin-source-baseline.py.gz','scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/build-english.mjs','scripts/extract-python-messages.py','scripts/collect-fixture-messages.mjs','scripts/audit-english-results.mjs','scripts/test-english-results.mjs','scripts/test-english-edition.mjs','scripts/build-learning-routes-provenance.mjs','scripts/build-tensor-teaching-provenance.mjs','scripts/build-derivation-teaching-provenance.mjs','scripts/package-source.py','scripts/test-source-package.py'];
const data={schemaVersion:1,release:'20261115-spin1',sourceHashNormalization:'utf8-lf-v1; gzip retains raw bytes',
 scope:'Three optional, manually calculated operation workshops in the existing color and spin-group lessons, plus 42 reviewed optional course links.',
 counts:{indexedLessons:197,reviewedConnectedLessons:148,optionalEdges:172,newOptionalEdges:42,newlyConnectedLessons:36,workshops:3,realNewAPIReferences:34,realLegacyCopyReferences:5},
 placements:{'color-03':'color_theta','spin-03':'spin_stabilizer','spin-04':'soc_locking'},
 contract:{action:'teaching_labs',lab:'spin_actions',schema:'symmetry-lab-spin-actions-1',
  loading:'The panel loads on explicit expansion. The optional exact Python module and SymPy load only for a manually requested spin_actions calculation; existing finite teaching experiments keep their dependency plan.',
  arithmetic:'Bounded rational/decimal inputs; exact normalization, RREF, orthogonal complements, matrix products and pointwise matching. Exact strings and display-only numeric mirrors have separate roles.',
  color:'The formal linear extension of a two-label exchange is compared with a separately declared spin-half antiunitary Theta=-i sigma_y K. Complex scalar action, repeated conjugation, operator phase, state rays and a nondegenerate swap-symmetric Hamiltonian are displayed.',
  stabilizer:'Fixed-position moment span of exact rank r has classical pointwise stabilizer O(3-r); the proper unitary part is separate. Improper W is implemented through a proper V=-W and D(V)Theta. Classical W squared does not determine the spinor square.',
  locking:'The original independent spin operation is compared separately with plus/minus det(R)R. Equality to the supplied operation and preservation of the labelled moment pattern are distinct tests. Periodic matching retains unwrapped coordinates.',
  copies:'Complete supported original geometric inputs are initialized explicitly and wait for manual Run. The three-color comparison is identified as another model. Custom states and matrices are not silently transferred to unsupported original fields.'},
 compatibility:{baselineCommit:'89a445adec9634f3020db44c76abdc125e5f9364',baselineSourceSHA256:'87749a79da15aeb4b831745b8571c47a7bcf268d31c5280a2510c9cae92442f2',
  oldAPIInputs:126,sameHostNumericLeavesBitwiseUnchanged:31759,sameHostOtherLeavesExactlyUnchanged:30668,
  originalProjectRequestsGenuinelyRecomputed:24,projectNumericLeavesExactlyUnchanged:148575,projectOtherLeavesExactlyUnchanged:3447,
  archivedReferenceRule:'Exact strings, structure, source hashes and original inputs are strict. Display numeric mirrors permit rtol=atol=1e-13 for cross-platform reference replay; same-host historical compatibility remains bitwise strict.'},
 verification:['Independent Pauli actions, conjugated products, span/projector identities, moment matching and negative controls verify the returned teaching results.',
  'Actual panel and classroom handlers exercise all genuine references, explicit copy/Run, incomplete result rejection and recovery, raw drafts, notes, disclosures, cancellation, stale owners and non-Array NodeList behavior.',
  'The previous 130 course edges retain their exact content and order. All native lesson destinations, new reasoning and expert-entry isolation are tested.',
  'The source archive replays thirteen Node provenance builders and the English provenance check after extraction, without Git or checkout-local dependencies.'],
 boundaries:['The two formal color amplitudes are not automatically electron spin states. State-vector equality or an overall sign alone does not establish Kramers energy degeneracy.',
  'Spin-factor squares omit spatial-orbital and Bloch actions. Spin-only classification uses exact supplied moments, not experimental tolerances or a complete spin-space-group search.',
  'SOC pattern matching does not verify a material Hamiltonian, actual coupling strength or band degeneracy. Custom periodic structures use the declared unit orthogonal lattice.',
  '148 connected lessons do not establish full instructional depth or targeted diagnosis. Remaining curriculum review and authentic scientific workflows across all tool families stay active; no measured learning gains are inferred.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const bytes=name.endsWith('.gz')?read(name):normalized(name);return [name,{normalization:name.endsWith('.gz')?'raw-bytes':'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/spin-actions-provenance.json',root),body=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Spin operation provenance is stale');else fs.writeFileSync(target,body);
console.log('Spin operations:',JSON.stringify(data.counts));
