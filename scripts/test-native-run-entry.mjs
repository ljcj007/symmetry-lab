import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const page=new URL('../dist/end-to-end/',import.meta.url);
const html=readFileSync(new URL('index.html',page),'utf8');
const app=readFileSync(new URL('app.js',page),'utf8');
const run=JSON.parse(readFileSync(new URL('data/one-click-reference-run-v3.public.json',page),'utf8'));
const release=JSON.parse(readFileSync(new URL('data/local-companion-release.json',page),'utf8'));
assert.equal(run.overall_status,'UNRESOLVED');
assert.equal(run.full_chain_certified,false);
assert.equal(run.infinite_orbital_nonlinear_scf_root_received,false);
assert.equal(run.native_execution.calculation,'nscf');
assert.equal(run.native_execution.fresh_scf_executed,false);
assert.equal(run.finite_reference_symmetric_scf_root_received,true);
assert.equal(run.all_BZ_infinite_frozen_spectrum_at_that_potential_received,true);
assert.equal(run.conservative_global_gap_lower_eV,'0.081');
assert.deepEqual(run.stages.map(s=>s.state),['SUCCEEDED','SUCCEEDED','SUCCEEDED','SUCCEEDED','UNRESOLVED']);
assert.deepEqual(run.stages.slice(0,4).map(s=>s.reexecution),['fresh_compute','fresh_compute','received_proof_composition','received_proof_composition']);
assert.ok(!run.accepted_claims.includes('infinite_orbital_nonlinear_scf_root_enclosed'));
assert.equal(release.full_scientific_inputs_included,false);
const archive=new URL('downloads/'+release.filename,page),bytes=readFileSync(archive);
assert.equal(bytes.length,release.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),release.sha256);
assert.equal(release.filename,'dft-local-companion-v12-r72t.zip');
const actual=JSON.parse(readFileSync(new URL('data/one-click-complete-infinite-r72p.public.json',page),'utf8'));
assert.equal(actual.full_chain_certified,true);
assert.equal(actual.full_chain_recomputed,false);
assert.equal(actual.native_mathematical_files,79);
assert.equal(actual.native_scf_executed,true);
assert.equal(actual.infinite_nonlinear_SCF_certified,true);
assert.equal(actual.complete_infinite_response_received,true);
assert.deepEqual(actual.stages.map(s=>s.state),['SUCCEEDED','SUCCEEDED','SUCCEEDED']);
assert.deepEqual(actual.remaining_obligations,[]);
const fresh=JSON.parse(readFileSync(new URL('data/one-click-fresh-scf-run-v5.public.json',page),'utf8'));
assert.equal(fresh.overall_status,'UNRESOLVED');
assert.equal(fresh.full_chain_certified,false);
assert.equal(fresh.native_execution.fresh_scf_executed,true);
assert.equal(fresh.native_execution.scf_numerical_convergence,true);
assert.equal(fresh.native_execution.new_scf_parent_copied_from_old_run,false);
assert.equal(fresh.complete_finite_NC_source_received,true);
assert.equal(fresh.operator_identity_bridge.received,false);
assert.equal(fresh.operator_identity_bridge.compared_points,72);
assert.equal(fresh.operator_identity_bridge.changed_points,72);
for(const key of ['finite_reference_symmetric_scf_root_received','all_BZ_infinite_frozen_spectrum_at_that_potential_received','infinite_orbital_nonlinear_scf_root_received','old_reference_proofs_inherited','current_source_gap_certified'])assert.equal(fresh[key],false,key);
assert.deepEqual(fresh.stages.map(s=>s.state),['SUCCEEDED','UNRESOLVED','NOT_RUN','NOT_RUN','NOT_RUN']);
assert.ok(fresh.accepted_claims.includes('native_scf_executed'));
assert.ok(!fresh.accepted_claims.includes('operator_identity_bridge'));
const progressBytes=readFileSync(new URL('data/infinite-scf-progress.public.json',page));
assert.equal(createHash('sha256').update(progressBytes).digest('hex'),'d6b667ba5864349bd95af18c6660bf18e2a93324b0bae5f4fb0ce7d870474c13');
const progress=JSON.parse(progressBytes);
assert.equal(progress.schema,'public-infinite-SCF-progress.v1');
assert.equal(progress.status,'INFINITE_NONLINEAR_SCF_UNRESOLVED');
assert.equal(progress.orbital_cutoff_Ry,1024);
assert.equal(progress.irreducible_k_points,72);
assert.equal(progress.complete_potential_dimension,2618);
assert.equal(progress.numerical_iterations,5);
assert.equal(progress.numerical_final_iteration,4);
assert.equal(progress.numerical_target_met,true);
for(const key of ['finite_nonlinear_SCF_certified','infinite_nonlinear_SCF_certified','true_infinite_occupied_density_received_all72'])assert.equal(progress[key],false,key);
for(const key of ['source_all72_carriers_received','source_all72_C1_and_kinetic_factors_received','final_center_frozen_infinite_gap_received','complete_ball_frozen_infinite_gap_received'])assert.equal(progress[key],true,key);
assert.match(progress.reference_model,/Variational restricted L=S E P/);
for(const [name,value,unit,direction] of [
 ['numerical_residual_sup','1.047','nRy','upper'],
 ['actual_F1024_at_old_256_center_sup','0.395','mRy','upper'],
 ['final_center_frozen_gap','41.782','meV','lower'],
 ['complete_ball_frozen_gap','5.585','meV','lower'],
 ['ball_grid_L2_radius','4.000','microRy','lower']
]){
 assert.equal(progress.display[name].value,value,name);
 assert.equal(progress.display[name].unit,unit,name);
 assert.equal(progress.display[name].direction,direction,name);
 assert.match(value,/^\d+\.\d{3}$/);
}
assert.match(progress.display.numerical_residual_sup.scope,/not a rigorous SCF residual/);
for(const row of Object.values(progress.receipts))assert.match(row.sha256,/^[a-f0-9]{64}$/);
assert.equal(Object.keys(progress.receipts).length,8);
assert.equal(progress.receipts.numerical_run.status,'NUMERICAL_RESIDUAL_TARGET_MET');
assert.equal(progress.receipts.final_iteration.status,'NUMERICAL_PROPOSAL_NOT_CERTIFICATE');
assert.equal(progress.receipts.exact_center.status,'CERTIFIED_EXACT_INVARIANT_GAUGE_CENTER_WITH_INFINITE_FROZEN_GAP');
assert.equal(progress.receipts.uniform_ball_gap.status,'CERTIFIED_INFINITE_RANK4_GAP_UNIFORM_ON_COMPLETE_POTENTIAL_L2_BALL');
assert.ok(progress.remaining_obligations.some(s=>/all72 true infinite occupied/.test(s)));
assert.ok(progress.remaining_obligations.some(s=>/full2618-direction/.test(s)));
assert.ok(progress.remaining_obligations.some(s=>/self-mapping or contraction/.test(s)));
assert.match(progress.scope_note,/Neither establishes existence or uniqueness/);
const history256=JSON.parse(readFileSync(new URL('data/infinite-scf-progress-256-history.public.json',page),'utf8'));
assert.equal(history256.overall_status,'UNRESOLVED');
assert.equal(history256.infinite_orbital_nonlinear_SCF_certified,false);
assert.equal(history256.reference_model.orbital_cutoff_Ry,256);
assert.equal(history256.numerical_proposal.anderson_iterations,6);
assert.equal(history256.numerical_proposal.potential_residual_sup_Ry_display,'1.933e-09');
assert.equal(history256.exact_center_frozen_spectrum.conservative_gap_lower_meV,'45.737');
assert.equal(history256.complete_potential_ball_frozen_spectrum.conservative_gap_lower_meV,'9.540');
assert.match(history256.scope,/Separate 256Ry/);
const publicRecords=[JSON.stringify(actual),JSON.stringify(history256),JSON.stringify(progress),JSON.stringify(fresh),JSON.stringify(run),JSON.stringify(release),readFileSync(new URL('downloads/server-profile.example.json',page),'utf8'),readFileSync(new URL('downloads/local-run-guide.md',page),'utf8')].join('\n');
assert.doesNotMatch(publicRecords,/(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})|C:\\\\Users|\/home\//);
assert.doesNotMatch(JSON.stringify(run),/capability|command|python_executable|source_root|server_profile/);
const config=JSON.parse(readFileSync(new URL('downloads/server-profile.example.json',page),'utf8'));
assert.equal(config.host,'<your-server>');
assert.ok(!('password' in config));
assert.equal(config.schema,'native-QE-SSH-profile.v1');
assert.deepEqual(JSON.parse(readFileSync(new URL('downloads/server-profile-inputs.example.json',page),'utf8')),['server_profile.json']);
assert.deepEqual(JSON.parse(readFileSync(new URL('downloads/server-profile-infinite-inputs.example.json',page),'utf8')),['server_profile.json','infinite_recipe.json']);
for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
 const ref=match[1];if(/^[a-z]+:|^\?/.test(ref))continue;
 const url=new URL(ref,page);url.search='';url.hash='';
 assert.ok(existsSync(url),ref);
}
const translations=Object.assign({},...Array.from(app.matchAll(/Object.assign\(messages,(\{[\s\S]+?\})\);/g),m=>JSON.parse(m[1])));
for(const key of ['nativeTitle','nativeOverall','nativeLead','launchIntro','setupStart','actualIntro','actualNativeDetail','actualInfiniteDetail','actualScope','infiniteIntro','completeMapTitle','completeResponseTitle','completeBallTitle','modelScope','infiniteReplayScope']){
 assert.ok(html.includes('data-i18n="'+key+'"'),key+' Chinese');
 assert.ok(translations[key]&&!/[\u4e00-\u9fff]/.test(translations[key]),key+' English');
}
assert.match(html,/href="#native-run"/);
assert.match(html,/id="verify"/);
assert.match(html,/id="run"/);
assert.match(html,/id="reference-history"/);
assert.match(html,/id="infinite-verify"/);
assert.match(html,/id="run-infinite"/);
assert.match(html,/72 \/ 72 个求积点/);
assert.match(html,/2618 <small/);
assert.match(html,/整球存在性与完整响应接收器，全部通过/);
assert.match(html,/大型证明按同源身份接收/);
const scan=spawnSync('python',['-B','-c',
 "import sys,zipfile,re,json,hashlib;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;names=z.namelist();assert len(names)==len(set(names))==26;assert all('/jobs/' not in n and '/profiles/' not in n and '/qa/' not in n and not n.endswith('server_profile.json') for n in names);m=json.loads(z.read('dft-local-companion/MANIFEST.json'));assert len(m['files'])==25;assert all(len(z.read('dft-local-companion/'+r['path']))==r['bytes'] and hashlib.sha256(z.read('dft-local-companion/'+r['path'])).hexdigest()==r['sha256'] for r in m['files']);text='\\n'.join(z.read(n).decode('utf8') for n in names);assert re.search(r'\\b10\\.(?:[0-9]{1,3}\\.){2}[0-9]{1,3}\\b',text) is None and '/home/' not in text and 'C:\\\\Users' not in text;print('public code archive checked')",
 fileURLToPath(archive)],{encoding:'utf8'});
assert.equal(scan.status,0,scan.stderr);
const extracted=await mkdtemp(join(tmpdir(),'dft-companion-'));
try{
 const unpack=spawnSync('python',['-B','-c',"import sys,zipfile,re;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])",fileURLToPath(archive),extracted],{encoding:'utf8'});
 assert.equal(unpack.status,0,unpack.stderr);
 const control=spawnSync('python',['-B',join(extracted,'dft-local-companion/web/tests/test_portal.py')],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,env:{...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(control.status,0,control.stdout+'\n'+control.stderr);
 const gates=spawnSync('python',['-B',join(extracted,'dft-local-companion/web/tests/test_energy_response_gate.py')],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024,env:{...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'}});
 assert.equal(gates.status,0,gates.stdout+'\n'+gates.stderr);
 const companionJS=readFileSync(join(extracted,'dft-local-companion/web/site/app.js'),'utf8');
 const stageFunction=companionJS.slice(companionJS.indexOf('function renderStages('),companionJS.indexOf('function renderJob('));
 const node=()=>({children:[],textContent:'',append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},setAttribute(){}});
 const list=node();const context={$:()=>list,document:{createElement:node},names:{UNRESOLVED:'尚未完成'},icons:{},labels:{}};
 vm.runInNewContext(stageFunction+`;renderStages([{id:'construction-rounding',label:'source construction',state:'UNRESOLVED',reason:'The scientific receiver did not accept this stage',reexecution:'received_proof_composition'}],true);`,context);
 const content=n=>String(n.textContent||'')+(n.children||[]).map(content).join(' ');
 assert.match(content(list),/尚未通过算符恒等桥/);
 assert.doesNotMatch(content(list),/本次接收已有证明包|The scientific receiver/);

 assert.match(control.stdout,/"status": "PASS"/);
}finally{
 assert.equal(resolve(extracted).startsWith(resolve(tmpdir())+requireSeparator()),true);
 await rm(extracted,{recursive:true,force:true});
}
function requireSeparator(){return process.platform==='win32'?'\\':'/';}
console.log(JSON.stringify({status:'PASS',nativeRunSummaryScope:true,NSCFParentBoundary:true,freshSCFChangedSourceStopsReuse:true,localizedUnresolvedReason:true,historical1024And256RecordsPreserved:true,actualInfiniteSCFAndCompleteResponseAccepted:true,largeProofsReceived:true,companionBytesAndSha256:true,publicCodeOnly:true,bilingualEntryAndDownloads:true,extractedCompanionProtocolAndEnergyResponseControlsExecuted:true}));
