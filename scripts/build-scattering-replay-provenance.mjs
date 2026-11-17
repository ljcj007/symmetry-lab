import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {catalogFiles} from './english-catalog.mjs';
import {lessonProgressionInventory,lessonProgressionEdges} from '../dist/lesson-progression.js';

const root=new URL('../',import.meta.url);
const bytes=name=>Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'));
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const fixture=JSON.parse(bytes('scripts/fixtures/scattering-replay.json'));
assert.equal(fixture.schema,'symmetry-lab-scattering-replay-fixture-1');
assert.match(fixture.method,/actual browser_api\.run/);
assert.deepEqual(fixture.cases.map(c=>c.id),['default','unequal-gamma','folded-even','folded-odd','zero-projection','signed-weights','degenerate-edge']);
for(const [name,expected]of Object.entries(fixture.sourceHashes))assert.equal(sha(bytes(name)),expected,name);
for(const c of fixture.cases){
 assert.equal(c.action,'dynamic_scattering_lab');assert.equal(c.input.includeAmplitudeReplay,true);
 const r=c.result,replay=r.data.amplitudeReplay;
 assert.equal(replay.schema,'symmetry-lab-scattering-amplitude-replay-1');
 assert.deepEqual(replay.parameters,r.parameters);assert.equal(replay.branches.length,2);assert.equal(replay.atoms.length,2);
 assert.equal(replay.checks.passed,true);assert.equal(r.checks.passed,true);
 assert.equal(replay.groups.length,r.data.selection.groups.length);
 for(const b of replay.branches){assert.equal(b.terms.length,2);assert.equal(b.individualStrengths.length,2);}
 for(const g of replay.groups){
  if(g.excluded){assert.equal(g.energyDenominator,null);assert.equal(g.occupation,null);assert.equal(g.stokesWeight,0);assert.equal(g.antiStokesWeight,0);}
 }
 if(c.id==='zero-projection'){
  assert.equal(replay.momentum.QParallel,0);assert.ok(replay.branches.every(b=>b.normalizedStrength===null));
 }
 if(c.id==='degenerate-edge')assert.ok(replay.degenerateMixing);
 else assert.equal(replay.degenerateMixing,null);
}
assert.equal(fixture.regressionCases.length,1);
assert.equal(fixture.regressionCases[0].result.data.amplitudeReplay.groups[0].degeneracy,2);
assert.equal(fixture.regressionCases[0].result.data.amplitudeReplay.degenerateMixing,null);
assert.equal(lessonProgressionInventory.length,197);assert.equal(lessonProgressionEdges.length,259);
const localeNames=['en-scattering-replay-ui.json','en-scattering-replay-host.json','en-scattering-replay-docs.json'];
const previous=Object.assign({},...catalogFiles.filter(name=>!localeNames.includes(name)).map(name=>JSON.parse(bytes('locales/'+name))));
for(const name of localeNames){
 assert.ok(catalogFiles.includes(name));const mapping=JSON.parse(bytes('locales/'+name));assert.ok(Object.keys(mapping).length);
 for(const [source,value]of Object.entries(mapping)){
  assert.equal(typeof value,'string');assert.ok(value.trim());
  if(Object.hasOwn(previous,source))assert.equal(value,previous[source],name+': must preserve existing translations');
 }
}
const files=new Set(['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','package-lock.json',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/pathways-ui.js','dist/pathways-views.js','dist/pathways.css',
 'dist/project-input-fields.js','dist/project-input.js','dist/course-flow.js','dist/python-client.js','dist/python-worker.js',
 'dist/python/browser_api.py','dist/python/dynamic_scattering_lab.py','dist/math-display.js','dist/math-notation.js',
 'dist/english-results.js','dist/lesson-progression.js','dist/lesson-progression-index.js','dist/data/pathways-materials.json',
 'dist/data/search-index.json','dist/docs/scattering-amplitudes.md','dist/docs/dynamic-scattering.md',
 'scripts/build-search-index.mjs','scripts/search-catalog-source.mjs','scripts/test-project-input.mjs','scripts/test-pathways-ui.mjs',
 'scripts/test-python-dynamic-scattering.py','scripts/test-classroom-disposal.mjs','scripts/test-request-scoped-wrapper.mjs',
 'scripts/build-pathways-fixtures.py','scripts/build-pathways-project-fixtures.py','scripts/build-bridges-project-fixtures.py',
 'scripts/fixtures/pathways.json.gz','scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json',
 'scripts/english-catalog.mjs','scripts/english-source.mjs','scripts/build-english.mjs',
 'scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/refresh-english-provenance.py',
 'scripts/package-source.py','scripts/test-source-package.py',...catalogFiles.map(name=>'locales/'+name)]);
for(const directory of ['dist','scripts','locales'])for(const name of fs.readdirSync(new URL(directory+'/',root)))
 if(/scattering-replay/.test(name)&&/\.(?:js|mjs|css|json|py)$/.test(name))files.add(directory+'/'+name);
files.add('scripts/fixtures/scattering-replay.json');files.add('scripts/fixtures/scattering-source-baseline.py.gz');
const document={schemaVersion:1,release:'20261117-scattering1',sourceHashNormalization:'utf8-lf-v1',
 scope:'Optional atomic-amplitude replay of the actual selected point in the existing longitudinal diatomic chain calculation, and identical renderers for seven classroom references.',
 counts:{indexedLessons:197,optionalEdges:259,newLessonIds:0,newGraphEdges:0,classroomPlacements:2,
  selectedPointReplay:1,realAPIReferences:8,teachingReferences:7,regressionReferences:1,atoms:2,branches:2,stages:5,newLocaleFiles:3,extractedSourceNodeBuilders:21},
 contract:{optIn:'A strict boolean includeAmplitudeReplay. Absent or false preserves the complete original result; true adds data.amplitudeReplay only.',
  provenance:'Selected energies, eigenvectors and physical groups are those of the same existing eigensolve. Opening or browsing the replay cannot calculate another spectrum.',
  factors:'Full Q, chain projection, folded q and reciprocal order; mass-normalized eigenvectors, relative displacements, conjugation, structural phase and signed atomic weights.',
  interference:'Python returns both complex atomic terms, partial sums, individual squared magnitudes, the cross term and coherent total.',
  normalization:'Zone comparisons separate the QParallel squared prefactor; its normalized strength is null when QParallel is zero.',
  thermal:'Returned physical groups retain their original cutoff, bare and Bose weights. Excluded modes retain their amplitude ledger but never divide by energy or obtain a Bose occupation.',
  gauge:'A common eigenvector phase changes amplitude phase but preserves strength. A phase on atom B alone can change relative displacement; pure-atom vectors can be common-phase equivalent. Overlap and eigen-equation residuals distinguish these claims.',
  degeneracy:'Original grouping within 1e-8 meV is distinct from the stricter 64 machine-eps energy-spread gate for a returned mixing comparison. Individual strengths depend on basis; the complete degenerate-subspace sum remains invariant.',
  identity:'Classroom references, calculator results, project copies and exports retain their own complete input identity. Copying waits for manual Run; old results do not acquire invented replay data.'},
 verification:['Independent atomic-factor, interference, phase, degeneracy and strict same-host old-core compatibility tests accompany seven complete actual public API replies.',
  'The actual renderer and host exercise optional loading, prediction feedback, state restoration, scoped request ownership, manual copies and raw export isolation.',
  'Bilingual generation, source provenance, existing calculation tests and actual extracted-download checks are separate release gates.'],
 boundaries:['A relative one-dimensional longitudinal harmonic-chain model, not imported Phonopy dynamic structure factors or material cross sections.',
  'No Debye-Waller factor, magnetic or multiphonon scattering, elastic contribution or calculated lifetime is introduced.',
  'Complex-plane arrows are amplitude coordinates rather than atomic trajectories; displacement scale is arbitrary.',
  'The finite examples do not establish measured learning gains or complete instructional depth across the full site.'],
 files:Object.fromEntries([...files].sort().map(name=>{const raw=name.endsWith('.gz')?fs.readFileSync(new URL(name,root)):bytes(name);return[name,{normalization:name.endsWith('.gz')?'binary':'utf8-lf-v1',bytes:raw.length,sha256:sha(raw)}];}))};
const target=new URL('dist/data/scattering-replay-provenance.json',root),body=JSON.stringify(document,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Scattering replay provenance is stale');
else fs.writeFileSync(target,body);
console.log('Atomic scattering replay:',JSON.stringify(document.counts));
