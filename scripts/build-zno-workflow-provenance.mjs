import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {lessonProgressionEdges,lessonProgressionInventory} from '../dist/lesson-progression.js';
const root=new URL('../',import.meta.url);
const examples=new URL('dist/data/examples/',root);
const example=JSON.parse(fs.readFileSync(new URL('phonopy-zno-source.json',examples),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const file of [...example.inputs,{localFile:example.localFile,sha256:example.sha256,bytes:example.byteCount},{localFile:example.licenseFile,sha256:example.licenseSha256,bytes:example.licenseByteCount}]){
 const bytes=fs.readFileSync(new URL(file.localFile,examples));assert.equal(hash(bytes),file.sha256);assert.equal(bytes.length,file.bytes);
}
assert.equal(example.generator.settings.is_nac,false);
assert.equal(example.generator.versions.phonopy,'4.10.0');
assert.deepEqual([example.counts.atoms,example.counts.qpointOccurrences,example.counts.bandsPerQ,example.counts.eigenvectors,example.defaultSelection.frozenAtoms],[4,4,12,48,64]);
const quadratureFile='zno-mode-quadrature.json';
const quadrature=JSON.parse(fs.readFileSync(new URL(quadratureFile,examples),'utf8'));
assert.equal(quadrature.schema,'symmetry-lab.zno-mode-quadrature.v1');
assert.equal(quadrature.source.commit,example.commit);
assert.equal(quadrature.source.qpoints.sha256,example.sha256);
assert.equal(quadrature.source.structure.sha256,example.companion.sha256);
assert.equal(quadrature.source.nonAnalyticCorrection,false);
assert.deepEqual(quadrature.settings.q,[0.25,0,0.25]);
assert.deepEqual([quadrature.parent.atoms.length,quadrature.distorted.atoms.length,quadrature.modes.length],[64,64,2]);
assert.ok(Math.abs(quadrature.checks.oneDirection.relativeResidual-Math.sqrt(3)/2)<1e-8);
assert.equal(quadrature.checks.compareTolerance,1e-9);
assert.equal(quadrature.checks.twoDirections.residualNorm,0);
const polarizationFile='zno-ir-polarization.json';
const polarizationBytes=fs.readFileSync(new URL(polarizationFile,examples));
const polarization=JSON.parse(polarizationBytes);
assert.equal(polarization.schema,'symmetry-lab.zno-ir-polarization.v1');
assert.equal(polarizationBytes.length,6283);
assert.equal(hash(polarizationBytes),'7faf5a93b7590f44d81e6fd7acd9ff4e7fe4f6e7a65d1e04e8177bf52a49666b');
assert.equal(polarization.source.qpoints.sha256,example.sha256);
assert.equal(polarization.source.nonAnalyticCorrection,false);
for(const source of [polarization.source.structure,polarization.source.born,polarization.source.license]){
 const bytes=fs.readFileSync(new URL(source.file,examples));
 assert.equal(bytes.length,source.byteCount);assert.equal(hash(bytes),source.sha256);
}
const reviewed=new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to]));
assert.equal(lessonProgressionInventory.length,197);
assert.ok(reviewed.size>=65&&lessonProgressionEdges.length>=82);
assert.equal(hash(Buffer.from(JSON.stringify(lessonProgressionEdges.slice(0,82)))),'998a4da95dc3a201e64ed830c2a4f5f58306477fec8aa66cbd6f27d6ee5dfff8');
const files=['.gitattributes','.github/workflows/pages.yml','README.md','NOTICE.txt','GOAL-ROADMAP.md','package.json','scripts/english-catalog.mjs',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/lesson-progression.js','dist/material-notebook.js','dist/material-research-ui.js','dist/structure-dynamics-ui.js','dist/tool-capabilities.js','dist/python-client.js','dist/python-worker.js',
 'dist/python/phonopy_import.py','dist/python/phonon_modes.py','dist/docs/phonopy-import.md','dist/docs/material-research.md',
 'scripts/build-zno-workflow-provenance.mjs','scripts/build-learning-routes-provenance.mjs','scripts/test-lesson-progression.mjs','scripts/test-tool-directory.mjs','scripts/test-material-notebook.mjs','scripts/test-mode-frequency-confirmation.mjs','scripts/test-zno-phonopy-example.mjs','scripts/test-python-zno-phonopy-example.py',
 'scripts/fixtures/phonopy-zno.json','scripts/fixtures/phonopy-source-baseline.py.gz','scripts/package-source.py','scripts/test-source-package.py',
 'locales/en-lesson-progression.json','locales/en-mode-frequency-confirmation.json','locales/en-zno-phonopy-example.json','locales/en-zno-navigation.json',
 'dist/data/examples/'+quadratureFile,'dist/coupled-materials-ui.js','dist/docs/coupled-materials.md','dist/python/distortion_lab.py',
 'scripts/build-zno-mode-quadrature.py','scripts/test-zno-mode-quadrature-ui.mjs',
 'locales/en-zno-mode-quadrature-ui.json','locales/en-zno-mode-quadrature-docs.json',
 'dist/data/examples/'+polarizationFile,'dist/zno-ir-polarization-ui.js','dist/optional-panel.js','dist/observables-ui.js',
 'scripts/build-zno-ir-polarization.py','scripts/test-zno-ir-polarization-ui.mjs',
 'dist/navigation-ui.js','dist/tool-search.js','dist/tool-directory.js','dist/tool-finder.js','scripts/test-zno-ir-search.mjs','scripts/test-tool-finder.mjs','locales/en-zno-ir-search.json',
 'locales/en-zno-ir-polarization-ui.json','locales/en-zno-ir-polarization-docs.json','locales/en-zno-ir-polarization-host.json',
 'scripts/test-gamma-translations-ui.mjs','locales/en-gamma-translations.json',
 'dist/zno-satellite-ui.js','dist/structure-diffraction-handoff.js','dist/python/diffraction.py','dist/docs/structure-dynamics.md',
 'scripts/test-zno-satellite-ui.mjs','scripts/test-zno-satellite-host.mjs','scripts/test-python-zno-satellite.py',
 'locales/en-zno-satellite-ui.json','locales/en-zno-satellite-host.json','locales/en-zno-satellite-docs.json',
 'dist/zno-gamma-nac-ui.js','dist/python/zno_gamma_nac.py','dist/learning-activity-search.js','dist/learning-activity-aliases.js',
 'scripts/test-zno-gamma-nac-ui.mjs','scripts/test-zno-gamma-nac-routes.mjs',
 'scripts/test-python-zno-gamma-nac.py','scripts/check-zno-gamma-nac-official.py',
 'scripts/fixtures/zno-gamma-nac-official.json',
 'locales/en-zno-gamma-nac-routes.json','locales/en-zno-gamma-nac-ui.json',
 ...fs.readdirSync(examples).filter(name=>name.startsWith('phonopy-zno-')).map(name=>'dist/data/examples/'+name)];
const data={schemaVersion:1,release:'20261115-zno1',sourceHashNormalization:'utf8-lf-v1 for registered text dependencies; original-byte dataset identities are recorded separately',
 scope:'Reviewed cross-course links and one authentic unequal-mass phonon input-to-frozen-export workflow. Browser calculations read supplied eigenvectors; Phonopy force-data postprocessing is reproducible offline.',
 counts:{indexedLessons:197,reviewedLessons:65,optionalEdges:82,newlyConnectedReadLessons:21,newOptionalEdges:34,primitiveAtoms:4,qpoints:4,bandsPerQ:12,eigenvectors:48,commensurateFrozenAtoms:64},
 countsScope:'Original ZnO-release snapshot. Later reviewed connections are recorded separately in currentGraph.',
 currentGraph:{indexedLessons:lessonProgressionInventory.length,reviewedLessons:reviewed.size,optionalEdges:lessonProgressionEdges.length},
 sourceByteIdentities:{qpoints:{file:example.localFile,sha256:example.sha256,bytes:example.byteCount,newline:example.newline},companion:example.companion,upstreamInputs:example.inputs,license:{file:example.licenseFile,sha256:example.licenseSha256,bytes:example.licenseByteCount}},
 generation:{classification:example.classification,commit:example.commit,generator:example.generator},
 phaseBasisExample:{file:quadratureFile,settings:quadrature.settings,checks:quadrature.checks},
 opticalPolarizationExample:{file:polarizationFile,settings:polarization.settings,checks:polarization.checks},
 directionalGammaExample:{
  action:'zno_gamma_nac',route:'compute/phonon-modes?preset=zno-gamma-nac',
  provenance:'Pinned qpoints dynamical matrix, companion primitive cell and original BORN. The independent Phonopy 4.10.0 Wang-method comparison starts from FORCE_SETS.',
  officialComparison:'scripts/fixtures/zno-gamma-nac-official.json',
  directions:['Cartesian','primitive reciprocal fractional'],corrections:['neutralized','raw','off'],
  quantities:['frequency in THz','parent-subspace norm','longitudinal mode dipole','rigid-translation residual'],
  boundary:'Long-range term in the directional Gamma limit. The imported-phonon workflow above still uses the supplied NAC-off eigenpairs.'
 },
 satelliteComparison:{file:quadratureFile,basis:'same 64-site supercell for all three inputs',hkl:[1,0,1],scatteringFactors:{Zn:1,O:1}},
 verification:['All 48 supplied modes have independently checked orthogonality, Hermitian dynamical matrices and eigenpair/frequency residuals. The selected nondegenerate complex mode has independently checked mass unweighting, spatial phases and all exported 64-atom coordinates.',
  'The exact distributed primary and companion text identities are checked separately. Browser textarea newline normalization preserves an unedited raw input; an explicit text edit or independent source replacement retires the old match and unit confirmation.',
  'The existing importer has one additive exact-source reference branch. Eleven historical requests execute the hash-verified old source and current code on the same host, retaining 6000 numeric and 896 other leaves exactly.',
  'A visible custom-mode frequency selector retains an explicit handoff choice, defaults to unknown and changes labels without rescaling input frequencies. Ordinary tabs retain drafts; replacing the source clears stale unit/companion state and cannot reuse hidden object data.',
  'New captures and rerun records distinguish verified imported identity, unknown imported files and the currently selected synthetic preset. Original records and user-written project labels remain unchanged.',
  'The 34 new optional course links have resolved native destinations and a combined acyclic graph. Direct expert tools load no prerequisite graph or calculation automatically.',
  'The downloadable archive includes every registered provenance dependency and is checked after extraction through eleven Node provenance builders and the English provenance verifier without Git or checkout-local dependencies. Full scientific tests still require their declared dependencies.'],
 boundaries:['The ZnO example is offline postprocessing of fixed official calculated forces, with NAC disabled. It is not a new DFT calculation, experimental spectrum, directional LO-TO prediction, or convergence certification.',
  'Four independent q points are not a dispersion path or full Brillouin-zone mesh. Complex components alone do not establish chirality or topology. Frequency confirmation is a declaration, not a numerical conversion.',
  'Frozen exports are compatible P1 snapshots, not relaxed structures or a derived child space group. C6v labels remain outside the current table; validated operation characters are retained.',
  'A reviewed connection does not certify complete operation-level derivations, targeted remediation or authentic workflows in all 197 lessons or all tool families. No student learning gains are inferred.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=fs.readFileSync(new URL(name,root)),binary=name.endsWith('.gz')||!/[.](?:js|mjs|py|json|html|css|md|txt|yaml|yml)$/.test(name)&&!['.gitattributes'].includes(name),bytes=binary?raw:Buffer.from(raw.toString('utf8').replace(/\r\n?/g,'\n'));return[name,{normalization:binary?'raw-bytes':'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/zno-workflow-provenance.json',root),body=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check'))assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),data,'ZnO workflow provenance is stale');else fs.writeFileSync(target,body);
console.log('ZnO workflow:',JSON.stringify(data.counts));
