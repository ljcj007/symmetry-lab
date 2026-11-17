import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(bytes('scripts/fixtures/phonopy-scattering.json'));
assert.equal(fixture.cases.length,8);
assert.equal(fixture.rejections.length,8);
for(const [name,expected]of Object.entries(fixture.sourceHashes))assert.equal(sha(bytes(name)),expected,name);
for(const c of fixture.cases){assert.equal(c.action,'phonopy_scattering');assert.equal(c.result.checks.passed,true);}
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const localeNames=catalogFiles.filter(name=>/^en-phonopy-scattering-/.test(name));
assert.equal(localeNames.length,4);
const previous=Object.assign({},...catalogFiles.filter(name=>!localeNames.includes(name)).map(name=>JSON.parse(bytes('locales/'+name))));
for(const name of localeNames)for(const [source,value]of Object.entries(JSON.parse(bytes('locales/'+name)))){
 assert.equal(typeof value,'string');assert.ok(value.trim());
 if(Object.hasOwn(previous,source))assert.equal(value,previous[source],name+': preserve established translations');
}
const files=new Set(['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/pathways-ui.js','dist/navigation-ui.js','dist/structure-dynamics-ui.js',
 'dist/project-input.js','dist/project-input-fields.js','dist/material-notebook.js','dist/tool-directory.js','dist/tool-capabilities.js',
 'dist/python-client.js','dist/python-worker.js','dist/python/browser_api.py','dist/python/phonopy_import.py','dist/python/phonopy_scattering.py',
 'dist/math-display.js','dist/math-notation.js','dist/english-results.js','dist/lesson-progression.js','dist/lesson-progression-index.js',
 'dist/data/search-index.json','dist/docs/phonopy-scattering.md','dist/docs/phonopy-import.md','dist/docs/scattering-amplitudes.md','dist/docs/dynamic-scattering.md',
 'dist/data/examples/phonopy-zno-scattering-source.json','dist/data/examples/phonopy-zno-source.json',
 'dist/data/examples/phonopy-zno-qpoints.yaml','dist/data/examples/phonopy-zno-structure.yaml',
 'scripts/test-project-input.mjs','scripts/test-tool-directory.mjs','scripts/test-tool-capabilities.mjs','scripts/test-tool-finder.mjs',
 'scripts/test-classroom-disposal.mjs','scripts/test-request-scoped-wrapper.mjs','scripts/test-python-phonopy-import.py','scripts/test-python-zno-phonopy-example.py',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs','scripts/collect-fixture-messages.mjs',
 'scripts/extract-python-messages.py','scripts/refresh-english-provenance.py','scripts/package-source.py','scripts/test-source-package.py',
 ...catalogFiles.map(name=>'locales/'+name)]);
for(const directory of ['dist','scripts','locales','scripts/fixtures'])for(const name of fs.readdirSync(new URL(directory+'/',root)))
 if(/phonopy.scattering/.test(name)&&/\.(?:js|mjs|css|json|py)$/.test(name))files.add(directory+'/'+name);
// Include every raw dependency declared by the original supplied-material manifest.
const material=JSON.parse(bytes('dist/data/examples/phonopy-zno-source.json'));
const scatteringSource=JSON.parse(bytes('dist/data/examples/phonopy-zno-scattering-source.json'));
const rawInputIdentities=[
 {path:'dist/data/examples/'+material.localFile,bytes:material.byteCount,sha256:material.sha256},
 {path:'dist/data/examples/'+material.companion.localFile,bytes:material.companion.bytes,sha256:material.companion.sha256}
];
for(const row of rawInputIdentities){const raw=fs.readFileSync(new URL(row.path,root));assert.equal(sha(raw),row.sha256,row.path);assert.equal(raw.length,row.bytes,row.path);}
for(const [row,source]of rawInputIdentities.map((row,i)=>[row,i?scatteringSource.structure:scatteringSource.primary])){
 assert.equal(row.sha256,source.sha256);assert.equal(row.bytes,source.bytes);
}
for(const name of [material.localFile,material.licenseFile,material.generator?.script,material.companion?.localFile,
 ...material.inputs.map(row=>row.localFile)].filter(Boolean)){
 const resolved='dist/data/examples/'+name;assert.ok(fs.existsSync(new URL(resolved,root)),resolved);files.add(resolved);
}
const document={schemaVersion:1,release:'20261117-phonopy1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Manual three-dimensional coherent nuclear neutron one-phonon scattering from complete supplied Phonopy modes and the same ordered primitive cell.',
 counts:{indexedLessons:197,optionalEdges:259,newLessonIds:0,newGraphEdges:0,realAPIReferences:16,validAPIReferences:8,rejectedAPIReferences:8,realZnOReferences:4,labelledSyntheticReferences:4,newLocaleFiles:4},
 contract:{
  modes:'All 3N supplied complex eigenvectors at each required original q point. No inference of missing time-reversed vectors, force-constant interpolation or amplitude from an arbitrary animation scale.',
  coordinates:'Primitive row lattice in angstrom; fractional Q uses 2 pi times the reciprocal basis. Explicit Cartesian Q is in inverse angstrom. Creation matches Q-q and annihilation Q+q to integer reciprocal vectors.',
  phase:'Phonopy atom-phase convention, explicit creation conjugation and Q-q phase versus annihilation raw eigenvector and Q+q phase. Full vector contractions precede coherent summation and squared magnitude.',
  units:'Declared frequency, primitive length, mass and real coherent neutron lengths in fm. Conflicting declarations fail. Default k-prime/k is one; per-primitive-cell integrated weights in fm squared and broadened density in fm squared per meV.',
  thermal:'Explicit omitted-Debye-Waller approximation or supplied same-temperature symmetric positive-semidefinite Cartesian displacement tensors in angstrom squared. No thermal grid or zero-point displacement tensor is generated.',
  energies:'Excluded zero, negative and sub-cutoff modes never divide by energy or acquire a Bose occupation. Numerical groups sum actual branch strengths and physical weights without replacing member energies by their mean.',
  identity:'Raw main and companion inputs, ordered primitive, convention confirmations, material constants, actual q identity and approximation travel together. Manual Run, scoped cancellation, stale-result isolation, explicit downloads and source hashes preserve evidence.',
  integration:'One additional lazy expert route plus explicit existing Phonopy-import and material handoffs; existing classroom, importer animation, frozen-mode and one-dimensional scattering workflows remain independent.'},
 verification:['Eight complete actual shared-API replies include real ZnO, nonorthogonal Cartesian momentum, both energy channels, explicit thermal tensors and an annihilation-only negative-q regression.',
  'Independent physical invariants, invalid-input rejection, official Phonopy same-condition comparisons, actual renderer/host restoration, English generation and extracted-source checks are separate release gates.'],
 boundaries:['Not a measured ZnO spectrum, X-ray form-factor calculation, incoherent or magnetic scattering model.',
  'No missing q points, full force-constant calculation, generated thermal-grid Debye-Waller factors, elastic line, multiphonon contribution or measured lifetime is added.',
  'A complete orthonormal supplied mode basis is checked; optional serialized dynamical matrices add a residual check, not a certificate for unknown source calculations.'],
 rawInputIdentities,
 files:Object.fromEntries([...files].sort().map(name=>{const binary=/\.gz$/.test(name)||!/[.](?:js|mjs|py|json|html|css|md|txt|yaml|yml)$/.test(name),raw=binary?fs.readFileSync(new URL(name,root)):bytes(name);
  return[name,{normalization:binary?'binary':'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/phonopy-scattering-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Phonopy scattering provenance is stale');
else fs.writeFileSync(target,body);
console.log('Supplied Phonopy scattering:',JSON.stringify(document.counts));
