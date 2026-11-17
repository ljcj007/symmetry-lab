import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';
import {toolsIndex} from '../dist/navigation-ui.js';
import {PROJECT_INPUT_TARGETS} from '../dist/project-input.js';
const root=new URL('../',import.meta.url),read=name=>fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(read('scripts/fixtures/phonopy-derivation.json'));
assert.equal(fixture.schema,'symmetry-lab-phonopy-derivation-fixture-1');
assert.equal(fixture.cases.length,12);assert.equal(fixture.rejections.length,10);
for(const [name,expected]of Object.entries(fixture.sourceHashes))assert.equal(sha(read(name)),expected,name);
for(const c of fixture.cases){
 assert.equal(c.action,'phonopy_derivation');const r=c.result;
 assert.match(r.fingerprint,/^[a-f0-9]{64}$/);assert.equal(r.points.length,2);assert.equal(r.tasks.length,19);
 assert.ok(r.checks.bothCoreChecksPassed&&r.checks.sameSourceIdentity&&r.checks.sameQ);
 assert.equal(r.points[0].input.channel,'creation');assert.equal(r.points[1].input.channel,'creation');
 assert.equal(r.contrasts.length,4);
 for(const p of r.points)assert.equal(p.result.schema,'symmetry-lab-phonopy-scattering-1');
 if(c.input.mode==='grade')assert.equal(c.input.forFingerprint,r.fingerprint);
}
assert.equal(toolsIndex.length,75);assert.equal(Object.keys(PROJECT_INPUT_TARGETS).length,34);
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const localeNames=['en-phonopy-derivation-ui.json','en-phonopy-derivation-host.json','en-phonopy-derivation-python.json','en-phonopy-derivation-docs.json'];
const previous=Object.assign({},...catalogFiles.filter(name=>!localeNames.includes(name)).map(name=>JSON.parse(read('locales/'+name))));
for(const name of localeNames){assert.ok(catalogFiles.includes(name));for(const [source,value]of Object.entries(JSON.parse(read('locales/'+name)))){
 assert.equal(typeof value,'string');assert.ok(value.trim());if(Object.hasOwn(previous,source))assert.equal(value,previous[source],name+': preserve established translation');
}}
const files=new Set(['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/pathways-ui.js','dist/pathways-views.js','dist/structure-dynamics-ui.js','dist/material-research-ui.js',
 'dist/phonopy-scattering-handoff.js','dist/phonopy-scattering-ui.js','dist/phonopy-scattering.css','dist/material-notebook.js','dist/project-input.js','dist/project-input-fields.js',
 'dist/navigation-ui.js','dist/tool-directory.js','dist/tool-capabilities.js','dist/python-client.js','dist/python-worker.js',
 'dist/python/browser_api.py','dist/python/phonopy_scattering.py','dist/python/phonopy_import.py','dist/python/symmetry_grading.py','dist/python/phonopy_derivation.py',
 'dist/math-display.js','dist/math-notation.js','dist/english-results.js','dist/lesson-progression.js','dist/lesson-progression-index.js',
 'dist/data/pathways-materials.json','dist/data/scattering-content.json','dist/data/search-index.json',
 'dist/docs/phonopy-derivation.md','dist/docs/phonopy-scattering.md','dist/docs/dynamic-scattering.md','dist/docs/scattering-amplitudes.md',
 'dist/data/examples/phonopy-zno-source.json','dist/data/examples/phonopy-zno-scattering-source.json',
 'scripts/test-phonopy-scattering-ui.mjs','scripts/test-phonopy-scattering-host.mjs','scripts/test-phonopy-scattering-worker.mjs',
 'scripts/test-project-input.mjs','scripts/test-request-scoped-wrapper.mjs','scripts/test-classroom-disposal.mjs','scripts/test-pathways-ui.mjs',
 'scripts/build-phonopy-scattering-reference.py','scripts/fixtures/phonopy-scattering.json','scripts/fixtures/phonopy-scattering-synthetic.json','scripts/fixtures/phonopy-scattering-official.json',
 'scripts/test-python-phonopy-scattering.py','scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/refresh-english-provenance.py','scripts/package-source.py','scripts/test-source-package.py',
 ...catalogFiles.map(name=>'locales/'+name)]);
for(const directory of ['dist','scripts','locales','scripts/fixtures'])for(const name of fs.readdirSync(new URL(directory+'/',root)))
 if(/phonopy.derivation/.test(name)&&/\.(?:js|mjs|css|json|py)$/.test(name))files.add(directory+'/'+name);
const material=JSON.parse(read('dist/data/examples/phonopy-zno-source.json'));
for(const name of [material.localFile,material.licenseFile,material.generator.script,material.companion.localFile,...material.inputs.map(x=>x.localFile)])files.add('dist/data/examples/'+name);
const rawInputIdentities=[{path:'dist/data/examples/'+material.localFile,bytes:material.byteCount,sha256:material.sha256},
 {path:'dist/data/examples/'+material.companion.localFile,bytes:material.companion.bytes,sha256:material.companion.sha256}];
for(const row of rawInputIdentities){const raw=fs.readFileSync(new URL(row.path,root));assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);}
const document={schemaVersion:1,release:'20261117-derive1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional source-bound two-point numerical derivation and correction inside existing scattering lessons, with complete explicit copies to the unchanged general expert tool.',
 counts:{indexedLessons:197,optionalEdges:259,newLessonIds:0,newDirectoryEntries:0,expertTools:75,projectAdapters:34,
  numericalTasksPerReference:19,finiteWrongFormulaCandidates:4,validAPIReferences:12,rejectedAPIReferences:10,newLocaleFiles:4,extractedSourceCommands:24},
 contract:{
  source:'Two actual calls to the existing supplied-mode creation calculation. The same original files, q, branch, atom order, masses, lengths and thermal conditions are retained; only integer G changes.',
  fingerprint:'Schema plus the complete original scientific input, comparison G, branch and atom. Grade recomputes its own target and rejects a stale fingerprint or client reference; learner answers are not scientific input.',
  amplitude:'Component-preserving real or complex matrix residuals in the provided gauge, not a projector or subspace comparison. The projection Q dot e conjugate has not divided by sqrt(m); the atomic term applies that factor once.',
  exclusions:'Zero, negative and sub-cutoff modes never acquire a fabricated inverse energy or Bose value. Thermal tasks are unavailable; targets above the bounded matrix parser range are separately unavailable while their original scientific result remains intact.',
  counterexamples:'Four deliberately wrong algebraic candidates are evaluated at both actual points. All compatible candidates and actual distinguishing power are retained; accidental agreement, equal G and zero projection do not establish unique correctness.',
  teaching:'Predictions precede calculation. Small numeric fields, progressive hints, guided point A and initially unrevealed point B support practice. Answer access, hints, independent draft and numeric feedback remain separate; no mastery or learning-effect claims are inferred.',
  identity:'Practice exports and immutable scientific reference exports remain separate. Target-bound RAM teaching copies retain a full original expert request with a teaching notice and manual Run, never pretending to be an existing notebook/project record.',
  integration:'The original scattering-phase disclosure is lazy. Existing mode, source-import and ZnO material routes point to that lesson. Obsolete whole-site no-Phonopy claims are corrected while the one-dimensional model and all old exercises remain intact.'},
 verification:['Independent nonorthogonal-coordinate, phase-convention, complex-arithmetic, mass, thermal-tensor, cutoff and finite-candidate tests accompany actual derivation and source-bound grade replies.',
  'Mixed boolean/numeric answers, forged references, stale source fingerprints, malformed complex matrices and unsupported science conventions are explicitly exercised.',
  'The actual UI and application host verify partial drafts, both-point copies, assisted reference access, manual Run, raw export identity, request ownership and detached/late callbacks.',
  'Legacy numerical references are genuinely recomputed before source identities change; English, formulas, source extraction and published bytes are separate release gates.'],
 boundaries:['The classroom default is a fixed sourced harmonic ZnO mode, not a measured spectrum, generated force constants, full thermal mesh or convergence certification.',
  'Changing G changes Cartesian projection and structural phase together. A finite pair refutes only the named candidates under the declared source and conventions.',
  'The numerical grader checks fixed-gauge components with explicit tolerances; it does not certify arbitrary proofs, material identity, unique reasoning or course mastery.',
  'The general expert tool retains its separate creation/annihilation, full-Q, supplied-thermal-tensor and custom-source contract.'],rawInputIdentities,
 files:Object.fromEntries([...files].sort().map(name=>{const binary=/\.gz$/.test(name)||!/[.](?:js|mjs|py|json|html|css|md|txt|yaml|yml)$/.test(name),raw=binary?fs.readFileSync(new URL(name,root)):Buffer.from(read(name));
  return[name,{normalization:binary?'binary':'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/phonopy-derivation-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(read('dist/data/phonopy-derivation-provenance.json'),body,'Phonopy derivation provenance is stale');else fs.writeFileSync(target,body);
console.log('Source-bound scattering derivation:',JSON.stringify(document.counts));
