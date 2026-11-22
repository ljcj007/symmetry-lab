// Manufactured scalar controls only. These are not Si scientific evidence.
import assert from 'node:assert/strict';
import {verifyInfiniteReceipt,infiniteProjectionHash} from '../dist/end-to-end/verify-infinite.js';
const hash='a'.repeat(64),stages=['field','hessian','force','source','occupation'],proofs=['actual_run','actual_native_identity','energy_composition','target_contract','complete_response'];
const r={schema:'symmetry-lab.public-infinite-SCF-scalar-receipt.r72i',status:'RECEIVED_COMPLETE_FRESH_SOURCE_INFINITE_OCCUPIED_SCF_EXISTS',target_identity_sha256:hash,actual_job_id:'manufactured-unit-control',native_mathematical_files:79,canonical_k_points:72,charge_grid:[48,48,48],energy_normalization:'Ephysical/4',orbital_space:'complete infinite reciprocal lattice',equation_family:'source-bound UPF-node C1 extension and analytic reference PBE',accepted_stage_receipt_sha256:Object.fromEntries(stages.map(k=>[k,hash])),proof_pins:Object.fromEntries(proofs.map(k=>[k,{bytes:1,sha256:hash}])),scope:{infinite_orbital_nonlinear_occupied_SCF_exists:true,complete_infinite_response_invertible:true,all72_and_whole_chart_ball_received:true,uniqueness:false,continuous_charge_grid_or_k_integration_limit:false,global_ground_state:false,arbitrary_native_input:false,literal_unexported_QE_infinite_generator:false},exact:{radius:'1/10',alpha_lower:'1/2',eta_upper:'1/100',source_Hessian_change_upper:'1/10',source_gradient_change_upper:'1/100',fresh_boundary_margin_lower:'1/50'},replay_scope:'Manufactured unit controls; no material result.'};
async function run(x){return verifyInfiniteReceipt(x,{projectionSha256:await infiniteProjectionHash(x),targetIdentitySha256:hash});}
assert.equal((await run(r)).exact.freshBoundaryMargin,'1/50');
const negatives=[
 ['boundary equality',x=>{x.exact.eta_upper='3/100';x.exact.fresh_boundary_margin_lower='0';}],
 ['negative gradient bound',x=>{x.exact.eta_upper='-1/100';}],
 ['insufficient source Hessian',x=>{x.exact.source_Hessian_change_upper='1/2';}],
 ['false radius margin',x=>{x.exact.fresh_boundary_margin_lower='1/100';}],
 ['missing force',x=>{delete x.accepted_stage_receipt_sha256.force;}],
 ['missing response',x=>{delete x.proof_pins.complete_response;}],
 ['incomplete response',x=>{x.scope.complete_infinite_response_invertible=false;}],
 ['unsupported global ground state',x=>{x.scope.global_ground_state=true;}],
 ['missing k point',x=>{x.canonical_k_points=71;}],
 ['different target',x=>{x.target_identity_sha256='b'.repeat(64);}],
 ['unsafe denominator',x=>{x.exact.radius='1/0';}],
 ['expanded unexported QE scope',x=>{x.scope.literal_unexported_QE_infinite_generator=true;}]
];
for(const[label,change]of negatives){const x=structuredClone(r);change(x);await assert.rejects(()=>run(x),label);}
await assert.rejects(()=>verifyInfiniteReceipt(r,{projectionSha256:'b'.repeat(64),targetIdentitySha256:hash}));
const translated=structuredClone(r);
translated.schema='symmetry-lab.public-infinite-SCF-scalar-receipt.r72p';
translated.coordinate_region={kind:'translated H1 ball contained in the received parent chart',parent_chart_target_identity_sha256:hash,translated_center_receipt_sha256:hash};
translated.exact.parent_chart_radius_lower='1/5';
translated.exact.translated_centre_norm_upper='1/20';
assert.equal((await run(translated)).status,'VERIFIED_PUBLISHED_INFINITE_SCF_SCALAR_COMPOSITION');
const translatedNegatives=[
 ['parent boundary equality',x=>{x.exact.translated_centre_norm_upper='1/10';}],
 ['outside parent chart',x=>{x.exact.parent_chart_radius_lower='1/8';}],
 ['negative centre norm',x=>{x.exact.translated_centre_norm_upper='-1/20';}],
 ['missing actual centre',x=>{delete x.coordinate_region.translated_center_receipt_sha256;}]
];
for(const[label,change]of translatedNegatives){const x=structuredClone(translated);change(x);await assert.rejects(()=>run(x),label);}
console.log(JSON.stringify({status:'PASS_MANUFACTURED_INFINITE_SCALAR_CONTROLS',positive:2,negative:negatives.length+translatedNegatives.length+1,material_certificate_inferred:false}));
