import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {lessonProgressionEdges,lessonProgressionInventory} from '../dist/lesson-progression.js';
const root=new URL('../',import.meta.url),read=name=>fs.readFileSync(new URL(name,root));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normalized=name=>Buffer.from(read(name).toString('utf8').replace(/\r\n?/g,'\n'));
const refs=JSON.parse(read('scripts/fixtures/antitranslation.json'));
assert.equal(refs.schema,'symmetry-lab-antitranslation-fixture-1');assert.equal(refs.cases.length,10);
assert.match(refs.method,/Actual browser_api\.run/);
for(const [name,expected]of Object.entries(refs.sourceHashes))assert.equal(hash(normalized(name)),expected,name);
for(const row of refs.cases){
 assert.equal(row.input.lab,'antitranslation');assert.equal(row.result.schema,'symmetry-lab-antitranslation-1');
 assert.equal(row.result.exact,true);assert.deepEqual(row.result.input,row.input);
 assert.ok(row.result.checks.length&&row.result.checks.every(c=>c.passed===true),row.id);
}
const connected=new Set(lessonProgressionEdges.flatMap(e=>[e.from,e.to]));
assert.deepEqual([lessonProgressionInventory.length,connected.size,lessonProgressionEdges.length],[197,197,259]);
assert.equal(hash(JSON.stringify(lessonProgressionEdges.slice(0,172))),'80a0d817d5688490afb96d0767eb5f871c2f8bc362ea102cc307e073fad95e34');
assert.equal(hash(JSON.stringify(lessonProgressionEdges.slice(172))),'92e6f642924a938a528d42871d27077c0cb93788655ddf4013c71de5987c361f');
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/classroom.css','dist/lesson-progression.js','dist/lesson-progression-index.js',
 'dist/symmetry-course-ui.js','dist/symmetry-course.css','dist/spin-actions-ui.js','dist/spin-actions.css','dist/spincolor-viewer.js','dist/antitranslation-ui.js',
 'dist/python-worker.js','dist/python-client.js','dist/english-results.js','dist/math-display.js','dist/math-notation.js',
 'dist/python/browser_api.py','dist/python/teaching_labs.py','dist/python/spin_actions_lab.py','dist/python/antitranslation_lab.py','dist/docs/antitranslation.md',
 'locales/en-lesson-progression.json','locales/en-momentum-navigation.json','locales/en-spincolor-responsive.json','locales/en-antitranslation-ui.json','locales/en-antitranslation-python.json','locales/en-antitranslation-docs.json',
 'scripts/build-momentum-teaching-provenance.mjs','scripts/build-antitranslation-reference.py','scripts/test-python-antitranslation.py','scripts/test-antitranslation-ui.mjs','scripts/test-spincolor-responsive.mjs','scripts/test-progression-stability.mjs','scripts/test-lesson-progression.mjs','scripts/test-spin-actions-worker.mjs','scripts/test-spin-actions-ui.mjs','scripts/test-spin-course-connections.mjs',
 'scripts/fixtures/antitranslation.json','scripts/fixtures/spin-actions.json','scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/build-english.mjs','scripts/test-english-edition.mjs','scripts/test-english-results.mjs','scripts/audit-english-results.mjs','scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py',
 'scripts/build-learning-routes-provenance.mjs','scripts/build-spin-actions-provenance.mjs','scripts/build-tensor-teaching-provenance.mjs','scripts/build-derivation-teaching-provenance.mjs','scripts/package-source.py','scripts/test-source-package.py'];
const data={schemaVersion:1,release:'20261115-momentum1',sourceHashNormalization:'utf8-lf-v1',
 scope:'A manually calculated three-dimensional half-translation/Bloch-fiber workshop, responsive shared three-dimensional diagrams, stable native recommendation targets, and 87 further reviewed optional relationships.',
 countsScope:'Original momentum1 feature counts; current source hashes and extracted-source registrations may include subsequent compatible releases.',
 counts:{indexedLessons:197,reviewedConnectedLessons:197,optionalEdges:259,newOptionalEdges:87,newlyConnectedLessons:49,realNewAPIReferences:10,newWorkshopPlacements:1,independentPythonTestGroups:12},
 contract:{action:'teaching_labs',lab:'antitranslation',schema:'symmetry-lab-antitranslation-1',lesson:'spin-02',
  loading:'The new interface loads only when its disclosure is opened. SymPy and the optional Python module load only on manual calculation. Direct expert entries keep their existing resource plans.',
  gauge:'The orthogonal unit lattice uses a two-site periodic orbital Bloch basis with exp(+2 pi i k dot R); integer translations have eigenvalue exp(-2 pi i k dot n). The half translation is +z/2. Exact reduced k is not silently folded.',
  composition:'A=T_half Theta maps H_k to H_-k. Returning to the initial fiber uses B(-k) conjugate(B(k)); ordinary squaring and B(k) conjugate(B(k)) are displayed only as wrong comparison products.',
  criterion:'All three components of 2k must be integers before the same-k antiunitary square-minus-one condition can imply a pair, conditional on Hamiltonian symmetry. The actual material Hamiltonian is not tested.',
  counterexamples:'The two fixed four-dimensional spin-half Gamma/Z Hamiltonians are explicitly separate from the selected input. Their dimensionless nondegenerate spectra distinguish a unitary square-minus-one from an antiunitary square-plus-one.',
  copy:'Only the old one-dimensional antiferromagnetic form\'s complete supported axial k/spinful inputs transfer. Both k units are reciprocal fractions; its range and 0.05 step remain enforced. Copy waits for manual Run and never drops transverse components.',
  diagram:'All returned frames, reference positions, unwrapped displacements, arrow endpoints and axes share a fitting envelope. Pixel-sized labels, a full label table and local zoom/pan preserve reading and keyboard access without changing physical coordinates.',
  navigation:'Unchanged recommendations retain their native nodes across hydration and tab updates. Multiline titles occupy complete minimum-44-pixel click blocks, and a single recommendation column uses the available width.'},
 compatibility:{baselineCommit:'54fd8d303ad6244bb48d9c4f2598fe0e613f71d9',oldOptionalEdgesPreserved:172,
  originalProjectRequestsGenuinelyRecomputed:24,projectNumericLeavesExactlyUnchanged:148575,projectOtherLeavesExactlyUnchanged:3447,
  originalSpinRequestsGenuinelyRecomputed:39,spinNumericLeavesExactlyUnchanged:12151,spinOtherLeavesExactlyUnchanged:12187,
  oldTeachingDispatcher:'The existing hash-verified historical source comparison remains a required same-host test for 126 old inputs, independently of archived cross-platform numeric mirrors.'},
 verification:['The public Python API generates all ten new complete reference results. Exact strings and source hashes remain strict; display mirrors use the declared tight numerical replay tolerance.',
  'Independent finite periodic real-space constructions and random complex vectors check the cross-fiber composition, three-dimensional momentum condition, fixed Hamiltonians and old copy boundaries.',
  'Actual renderer handlers exercise matrix/vector output, invalid drafts, explicit copy/Run, local notes, cancellation, stale ownership and malformed-result recovery.',
  'Responsive rendering checks all frames of 49 genuine existing Python scenarios at narrow and wide sizes, with independent returned data, resize/destruction and multiple-viewer isolation.',
  'All 197 native lesson targets, 142 real shell contexts and 46 expert entrances are checked without automatic computation or mastery I/O.',
  'Momentum1 originally registered fourteen Node provenance builders and the English verifier. The current extracted-source command list is maintained in scripts/test-source-package.py.'],
 boundaries:['A background alternating-arrow pattern is independent of the chosen Bloch coefficients and wavevector. It is not a local expectation value of the arbitrary coefficient state and cannot show its Bloch or spinor phase.',
  'The finite examples do not enumerate magnetic space groups, compute material bands, test a material Hamiltonian, or diagnose topology.',
  'Connecting every catalogued lesson is a navigation milestone; substantive instructional depth, targeted diagnosis and authentic workflows across all tool families remain active work. No measured student learning gains are inferred.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const bytes=normalized(name);return [name,{normalization:'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/momentum-teaching-provenance.json',root),body=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Momentum teaching provenance is stale');else fs.writeFileSync(target,body);
console.log('Momentum teaching:',JSON.stringify(data.counts));
