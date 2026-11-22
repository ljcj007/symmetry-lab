// Exact public scalar composition. Matrix and orbital proofs are received premises.
import {canonicalJSON} from './verify.js';
const need=(v,s)=>{if(!v)throw new Error(s);};
const gcd=(a,b)=>{a=a<0n?-a:a;while(b)[a,b]=[b,a%b];return a;};
function q(s){
 need(typeof s==='string'&&s.length<=1000&&/^-?\d+(\/\d+)?$/.test(s),'Invalid exact scalar');
 let[n,d=1n]=s.split('/').map(BigInt);need(d>0n,'Nonpositive denominator');const g=gcd(n,d);return[n/g,d/g];
}
const add=(a,b)=>q(`${a[0]*b[1]+b[0]*a[1]}/${a[1]*b[1]}`);
const neg=a=>[-a[0],a[1]];
const sub=(a,b)=>add(a,neg(b));
const mul=(a,b)=>q(`${a[0]*b[0]}/${a[1]*b[1]}`);
const cmp=(a,b)=>{const x=a[0]*b[1],y=b[0]*a[1];return x<y?-1:x>y?1:0;};
const str=a=>a[1]===1n?`${a[0]}`:`${a[0]}/${a[1]}`;
export async function infiniteProjectionHash(r){
 const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJSON(r)));
 return Array.from(new Uint8Array(h),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function verifyInfiniteReceipt(r,pinned){
 need(/^[0-9a-f]{64}$/.test(pinned?.projectionSha256??'')&&/^[0-9a-f]{64}$/.test(pinned?.targetIdentitySha256??''),'An approved fixed public projection is required');
 need(['symmetry-lab.public-infinite-SCF-scalar-receipt.r72i','symmetry-lab.public-infinite-SCF-scalar-receipt.r72p'].includes(r?.schema)&&r.status==='RECEIVED_COMPLETE_FRESH_SOURCE_INFINITE_OCCUPIED_SCF_EXISTS','Wrong complete energy receipt');
 need(r.target_identity_sha256===pinned.targetIdentitySha256,'Different chart or equation target');
 need(r.native_mathematical_files===79&&r.canonical_k_points===72&&canonicalJSON(r.charge_grid)==='[48,48,48]'&&r.energy_normalization==='Ephysical/4','Different complete native/model scope');
 need(r.orbital_space==='complete infinite reciprocal lattice'&&r.equation_family==='source-bound UPF-node C1 extension and analytic reference PBE','Different infinite equation family');
 for(const key of ['infinite_orbital_nonlinear_occupied_SCF_exists','complete_infinite_response_invertible','all72_and_whole_chart_ball_received'])need(r.scope?.[key]===true,'A complete premise is missing: '+key);
 for(const key of ['uniqueness','continuous_charge_grid_or_k_integration_limit','global_ground_state','arbitrary_native_input','literal_unexported_QE_infinite_generator'])need(r.scope?.[key]===false,'Unsupported expanded claim: '+key);
 for(const key of ['field','hessian','force','source','occupation'])need(/^[0-9a-f]{64}$/.test(r.accepted_stage_receipt_sha256?.[key]??''),'Missing accepted theorem stage: '+key);
 for(const key of ['actual_run','actual_native_identity','energy_composition','target_contract','complete_response']){
  const p=r.proof_pins?.[key];need(Number.isSafeInteger(p?.bytes)&&p.bytes>0&&/^[0-9a-f]{64}$/.test(p.sha256),'Missing original proof pin: '+key);
 }
 const e=r.exact,R=q(e.radius),a=q(e.alpha_lower),eta=q(e.eta_upper),da=q(e.source_Hessian_change_upper),de=q(e.source_gradient_change_upper),zero=q('0');
 need(cmp(R,zero)>0&&cmp(da,zero)>=0&&cmp(de,zero)>=0&&cmp(eta,zero)>=0&&cmp(a,da)>0,'Invalid energy, norm or source signs');
 if(r.schema==='symmetry-lab.public-infinite-SCF-scalar-receipt.r72p'){
  const region=r.coordinate_region;
  need(region?.kind==='translated H1 ball contained in the received parent chart','Missing translated coordinate region');
  for(const key of ['parent_chart_target_identity_sha256','translated_center_receipt_sha256'])need(/^[0-9a-f]{64}$/.test(region[key]??''),'Missing actual parent or centre identity');
  const parent=q(e.parent_chart_radius_lower),shift=q(e.translated_centre_norm_upper);
  need(cmp(shift,zero)>=0&&cmp(add(shift,R),parent)<0,'Translated ball leaves the received parent chart');
 }
 const referenceMargin=sub(mul(a,R),eta),freshMargin=sub(mul(sub(a,da),R),add(eta,de));
 need(cmp(referenceMargin,zero)>0&&cmp(freshMargin,zero)>0,'Strict whole-ball boundary inequality failed');
 need(cmp(freshMargin,q(e.fresh_boundary_margin_lower))===0,'Fresh boundary margin mismatch');
 need(await infiniteProjectionHash(r)===pinned.projectionSha256,'Published infinite scalar projection changed');
 return {status:'VERIFIED_PUBLISHED_INFINITE_SCF_SCALAR_COMPOSITION',checks:[{id:'source',passed:true},{id:'whole-chart',passed:true},{id:'fresh-boundary',passed:true},{id:'occupation-response',passed:true},{id:'projection',passed:true}],exact:{referenceBoundaryMargin:str(referenceMargin),freshBoundaryMargin:str(freshMargin)},targetIdentitySha256:r.target_identity_sha256,projectionSha256:pinned.projectionSha256,scope:r.scope,replayScope:r.replay_scope};
}
