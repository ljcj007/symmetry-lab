import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {lessonProgressionEdges,lessonProgressionInventory} from '../dist/lesson-progression.js';
const root=new URL('../',import.meta.url);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const refs=JSON.parse(fs.readFileSync(new URL('scripts/fixtures/tensor-replay.json',root),'utf8'));
assert.equal(refs.schema,'symmetry-lab-tensor-replay-references-1');
for(const[name,expected]of Object.entries(refs.sourceHashes))assert.equal(hash(Buffer.from(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n?/g,'\n'))),expected,name);
assert.equal(refs.cases.length,12);
assert.equal(refs.cases.filter(x=>x.result.replay.available).length,9);
const find=id=>{const r=refs.cases.find(x=>x.id===id);assert.ok(r,id);return r.result;};
for(const[id,dimension,order]of [['c2-dielectric',4,2],['c4-dielectric',2,4],['cubic-dielectric',1,24],['tilted-c2-dielectric',4,2],['inversion-magnetoelectric',0,2],['time-magnetoelectric',0,2],['antiinversion-magnetoelectric',9,2],['gray-cubic-96-dielectric',1,96]]){
 const r=find(id);assert.equal(r.independent_count,dimension);assert.equal(r.replay.finiteGroup.order,order);assert.ok(Object.values(r.replay.checks).every(Boolean));
}
const reviewed=new Set(lessonProgressionEdges.flatMap(x=>[x.from,x.to]));
assert.deepEqual([lessonProgressionInventory.length,reviewed.size,lessonProgressionEdges.length],[197,112,130]);
const files=['.github/workflows/pages.yml','GOAL-ROADMAP.md','package.json','dist/index.html','dist/app.js','dist/classroom-ui.js','dist/lesson-progression.js','dist/observables-ui.js','dist/observables.css','dist/tensor-replay-ui.js','dist/tensor-replay.css','dist/python-client.js','dist/python-worker.js','dist/material-notebook.js','dist/python/property_tensors.py','dist/python/browser_api.py','dist/data/material-observables.json','dist/docs/material-observables.md','locales/en-lesson-progression.json','locales/en-tensor-replay.json','locales/en-tensor-replay-docs.json','scripts/english-catalog.mjs','scripts/test-lesson-progression.mjs','scripts/test-tensor-replay-ui.mjs','scripts/test-observables-ui.mjs','scripts/test-python-property-tensors.py','scripts/test-python-tensor-replay.py','scripts/build-tensor-replay-reference.py','scripts/fixtures/tensor-replay.json','scripts/fixtures/tensor-source-baseline.py.gz','scripts/fixtures/pathways-projects.json','scripts/fixtures/bridges-projects.json','scripts/build-learning-routes-provenance.mjs','scripts/build-zno-workflow-provenance.mjs','scripts/build-tensor-teaching-provenance.mjs','scripts/package-source.py','scripts/test-source-package.py'];
files.push('dist/english-results.js','scripts/test-english-results.mjs','scripts/audit-english-results.mjs','scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','locales/en-python-sources.json','locales/en-python-templates.json');
files.push('scripts/build-english.mjs','scripts/test-english-edition.mjs');
const manifest={schemaVersion:1,release:'20261115-tensor1',sourceHashNormalization:'utf8-lf-v1; gzip files retain raw bytes',
 scope:'Reviewed optional course relationships and a manually requested exact rank-two tensor constraint replay in the existing classroom, calculator and materials routes.',
 counts:{indexedLessons:197,reviewedConnectedLessons:112,optionalEdges:130,newOptionalEdges:48,newlyConnectedLessons:47,realAPIReferences:12,availableFiniteReplays:9,lessonPlacements:2,fixedCopyReferences:7},
 coreContract:{action:'tensors',optIn:'replay: true',default:'No replay result key is added when omitted or false. Existing numerical and descriptive fields remain unchanged.',
 supported:['static symmetric dielectric rank-two tensor, six intrinsic coordinates','static general magnetoelectric rank-two tensor, nine intrinsic coordinates'],
 solver:'Exact generator-invariance nullspace; explicit action/constraint matrices and RREF describe the same subspace. A separately closed finite group supplies a Reynolds average.',
 closure:'At most 96 time-tagged operations are retained. Certification requires exhausting the entire closure queue. Exceeding the bound does not prove infinitude.',
 metric:'The symmetric six-component basis has Frobenius metric diag(1,2,2,1,2,1). The invariant projector is G-self-adjoint and need not have a symmetric coordinate matrix.',
 seed:'Frontend projection uses numeric mirrors of the exact result for editable numerical seeds. It does not change the source result or infer material constants.'},
 compatibility:{baselineCommit:'519e3e849cdef9083d55ce3690f425c0dd162204',baselineSourceSHA256:'41059b1cddf48262a2830d182e46fbc608d8f32a23036f93fb602c195fec015a',oldInputs:24,flagComparisons:72,numericLeavesBitwiseUnchanged:11496,otherLeavesExactlyUnchanged:13701,projectRequestsGenuinelyRecomputed:24,projectNumericLeavesExactlyUnchanged:148575,projectOtherLeavesExactlyUnchanged:3447},
 verification:['The public API generates all 12 complete references. Independent Cartesian index contractions and independently enumerated finite operations check each displayed matrix, exact projector, invariant subspace, metric and 96-operation boundary.',
  'The preceding 82 course edges retain their content and order. All 197 factual lesson destinations resolve; new reasons preserve units, representation spaces, model differences and optional expert entry.',
  'Actual UI handlers use the returned replay; old or unsupported records retain guidance rather than an invented trace. Ordinary tabs preserve raw calculator drafts and optional local notes; source changes retire the old result, and copying waits for manual Run.',
  'The distributed source archive includes registered dependencies and replays twelve Node provenance builders plus the English provenance check after extraction.'],
 boundaries:['Finite rank-two replay does not add elastic or piezoelectric operation replays, dissipative transport rules, frequency-dependent response or material-property fitting.',
  'Symmetry permission does not require a coefficient to be nonzero, nor guarantee dielectric stability. A laboratory orientation control does not add crystal symmetry.',
  'A recommended connection is not complete instruction in all prerequisites. The remaining curriculum depth, diagnosis and authentic-workflow review stays active. No educational learning gains are inferred.'],
 files:Object.fromEntries([...new Set(files)].sort().map(name=>{const raw=fs.readFileSync(new URL(name,root));const bytes=name.endsWith('.gz')?raw:Buffer.from(raw.toString('utf8').replace(/\r\n?/g,'\n'));return[name,{normalization:name.endsWith('.gz')?'raw-bytes':'utf8-lf-v1',bytes:bytes.length,sha256:hash(bytes)}];}))};
const target=new URL('dist/data/tensor-teaching-provenance.json',root),body=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8').replace(/\r\n?/g,'\n'),body,'Tensor teaching provenance is stale');else fs.writeFileSync(target,body);
console.log('Tensor teaching:',JSON.stringify(manifest.counts));
