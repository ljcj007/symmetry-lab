import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyReceipt,PINNED_PROJECTION_SHA256} from '../dist/end-to-end/verify.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const receiptPath=join(root,'dist/end-to-end/data/si-reference-receipt.json');
const pyPath=join(root,'dist/end-to-end/downloads/verify.py');
const r=JSON.parse(await readFile(receiptPath,'utf8'));
const result=await verifyReceipt(r);
assert.equal(result.status,'VERIFIED_PUBLISHED_SCALAR_COMPOSITION');
assert.equal(result.checks.length,5);
assert.ok(result.checks.every(x=>x.passed));
assert.equal(result.projectionSha256,PINNED_PROJECTION_SHA256);
assert.equal(result.metrics.gapLowerEV,'> 0.081 eV');
assert.equal(result.scope.infinite_orbital_nonlinear_SCF_root,false);
const python=spawnSync('python',[pyPath,receiptPath],{cwd:root,encoding:'utf8'});
assert.equal(python.status,0,python.stderr);
const independent=JSON.parse(python.stdout);
assert.equal(independent.status,result.status);
assert.deepEqual(independent.exact,result.exact,'Independent Python and BigInt exact results');

const negativeCases=[
  ['radii inequality', x=>{x.scf.R_Ry='1/1000000000000000';}],
  ['arithmetic bound', x=>{x.bridge.raw_to_saved_continuous_upper_Ry='1';}],
  ['missing predecessor',x=>{delete x.original_receipt_pins.finite_scf;}],
  ['wrong predecessor identity',x=>{x.original_receipt_pins.infinite_frozen.sha256='0'.repeat(64);}],
  ['unresolved predecessor',x=>{x.received_parent_status.infinite_frozen='UNRESOLVED';}],
  ['wrong target',x=>{x.distinct_frozen_target.raw48_sha256='0'.repeat(64);}],
  ['potential endpoint mismatch',x=>{x.bridge.saved_endpoint.sha256='0'.repeat(64);}],
  ['missing closed domain',x=>{x.frozen.accepted_closed_domains=924;}],
  ['finite to nonlinear scope inflation',x=>{x.scope.infinite_orbital_nonlinear_SCF_root=true;}],
  ['continuous integration scope inflation',x=>{x.scope.continuous_density_grid_or_BZ_integration_limit=true;}],
  ['generic-source scope inflation',x=>{x.scope.arbitrary_VASP_QE_output=true;}],
  ['changed projection metadata',x=>{x.profile+=' changed';}]
];
const temp=await mkdtemp(join(tmpdir(),'si-public-scalars-'));
try {
  for(const [label,mutate] of negativeCases){
    const altered=structuredClone(r);mutate(altered);
    await assert.rejects(()=>verifyReceipt(altered),undefined,label);
    const input=join(temp,'changed.json');await writeFile(input,JSON.stringify(altered));
    const p=spawnSync('python',[pyPath,input],{cwd:root,encoding:'utf8'});
    assert.equal(p.status,2,label+' Python');
    assert.equal(JSON.parse(p.stderr).status,'REJECTED_PUBLIC_SCALAR_RECEIPT');
  }
  const out=join(temp,'output.json');await writeFile(out,'preserve me');
  const p=spawnSync('python',[pyPath,receiptPath,'--out',out],{encoding:'utf8'});
  assert.equal(p.status,2);assert.equal(await readFile(out,'utf8'),'preserve me');
  const archive=join(root,'dist/end-to-end/downloads/si-reference-scalar-replay.zip');
  const unpack=spawnSync('python',['-c',"import sys,zipfile;from pathlib import Path;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert set(z.namelist())=={'si-reference-receipt.json','manifest.json','verify.py','README.txt','verify.cmd','LICENSE'};z.extractall(sys.argv[2])",archive,temp],{encoding:'utf8'});
  assert.equal(unpack.status,0,unpack.stderr);
  const replay=spawnSync('python',[join(temp,'verify.py')],{cwd:tmpdir(),encoding:'utf8'});
  assert.equal(replay.status,0,replay.stderr);
  assert.deepEqual(JSON.parse(replay.stdout).exact,result.exact,'Extracted package runs outside workspace');
} finally { await rm(temp,{recursive:true,force:true}); }
assert.doesNotMatch(JSON.stringify(r),/C:\\\\Users|10\.20\.160\.50|ljcj007|password|token/i,'Public projection excludes local account/path/secrets');
console.log(JSON.stringify({status:'PASS',exactJSAndPythonParity:true,negativeCases:negativeCases.length,archiveExtractedAndExecuted:true,outputOverwriteRejected:true,projectionSha256:PINNED_PROJECTION_SHA256}));
await import('./test-qe-si-navigation.mjs');
