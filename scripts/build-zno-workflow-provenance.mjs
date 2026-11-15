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
const reviewed=new Set(lessonProgressionEdges.flatMap(edge=>[edge.from,edge.to]));
assert.deepEqual([lessonProgressionInventory.length,reviewed.size,lessonProgressionEdges.length],[197,65,82]);
const files=['.gitattributes','.github/workflows/pages.yml','README.md','NOTICE.txt','GOAL-ROADMAP.md','package.json','scripts/english-catalog.mjs',
 'dist/index.html','dist/app.js','dist/classroom-ui.js','dist/lesson-progression.js','dist/material-notebook.js','dist/material-research-ui.js','dist/structure-dynamics-ui.js','dist/tool-capabilities.js','dist/python-client.js','dist/python-worker.js',
 'dist/python/phonopy_import.py','dist/python/phonon_modes.py','dist/docs/phonopy-import.md','dist/docs/material-research.md',
 'scripts/build-zno-workflow-provenance.mjs','scripts/build-learning-routes-provenance.mjs','scripts/test-lesson-progression.mjs','scripts/test-tool-directory.mjs','scripts/test-material-notebook.mjs','scripts/test-mode-frequency-confirmation.mjs','scripts/test-zno-phonopy-example.mjs','scripts/test-python-zno-phonopy-example.py',
 'scripts/fixtures/phonopy-zno.json','scripts/fixtures/phonopy-source-baseline.py.gz','scripts/package-source.py','scripts/test-source-package.py',
 'locales/en-lesson-progression.json','locales/en-mode-frequency-confirmation.json','locales/en-zno-phonopy-example.json','locales/en-zno-navigation.json',
 ...fs.readdirSync(examples).filter(name=>name.startsWith('phonopy-zno-')).map(name=>'dist/data/examples/'+name)];
const data={schemaVersion:1,release:'20261115-zno1',sourceHashNormalization:'utf8-lf-v1 for registered text dependencies; original-byte dataset identities are recorded separately',
 scope:'Reviewed cross-course links and one authentic unequal-mass phonon input-to-frozen-export workflow. Browser calculations read supplied eigenvectors; Phonopy force-data postprocessing is reproducible offline.',
 counts:{indexedLessons:197,reviewedLessons:65,optionalEdges:82,newlyConnectedReadLessons:21,newOptionalEdges:34,primitiveAtoms:4,qpoints:4,bandsPerQ:12,eigenvectors:48,commensurateFrozenAtoms:64},
 sourceByteIdentities:{qpoints:{file:example.localFile,sha256:example.sha256,bytes:example.byteCount,newline:example.newline},companion:example.companion,upstreamInputs:example.inputs,license:{file:example.licenseFile,sha256:example.licenseSha256,bytes:example.licenseByteCount}},
 generation:{classification:example.classification,commit:example.commit,generator:example.generator},
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
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'ZnO workflow provenance is stale');else fs.writeFileSync(target,body);
console.log('ZnO workflow:',JSON.stringify(data.counts));
