// Exact scalar receiver for the published QE-Si case. No DFT/matrix replay.
export const PINNED_PROJECTION_SHA256 = '883d321f7723fe6421a6623b7c03f6f2bdc1e58d8425fc67bea1d16dff76bfdf';
const PINNED_ORIGINALS = {
  finite_scf: '57caef8609b878ce7b544dea40783245e251b4989836e95383a91ba1bd9b1172',
  infinite_frozen: 'e31bf5f774d4872bf24e98b99110b1eb95749546311f95258e5fd296a8554ac6',
  continuous_bridge: 'd35a4ae588ad17d1d759a4a0f9e62ed6b2ecd9b66a5a270329510115d6c5aca0',
  final_composition: '4a2f177851aaacdfe84247e573422ea3df13c527a1b1069939b293646cb348c0',
  independent_acceptance: '190f5d780d2cf5b2f6dd13bf135378e2cf9c0424497e7103d05199d399f6f38b'
};
const RECEIVED_STATUS = {
  finite_scf:'CERTIFIED_FINITE_C1_REFERENCE_SCF_FIXED_POINT_IN_IDEAL_SYMMETRIC_SECTOR',
  infinite_frozen:'CERTIFIED_SYMMETRIZED_IDEAL48_C1_INFINITE_ALL_BZ_RANK4_GAP_UNDER_RECORDED_ARITHMETIC_PREMISES',
  continuous_bridge:'CERTIFIED_CONTINUOUS_SYMMETRIZED_POTENTIAL_CHANGE_UNDER_RECORDED_IEEE_PREMISES',
  final_composition:'CERTIFIED_INFINITE_GLOBAL_RANK4_GAP_AT_AN_ENCLOSED_FINITE_REFERENCE_SCF_POTENTIAL',
  independent_acceptance:'INDEPENDENTLY_ACCEPTED_FINITE_REFERENCE_SCF_AND_SAME_POTENTIAL_INFINITE_GLOBAL_RANK4_GAP'
};
const require = (x, msg) => { if (!x) throw new Error(msg); };
const gcd = (a,b) => { a=a<0n?-a:a; while(b){[a,b]=[b,a%b];} return a; };
function Q(value) {
  require(typeof value==='string' && /^-?\d+(\/\d+)?$/.test(value) && value.length<=10000,'Invalid exact rational');
  let [n,d=1n]=value.split('/').map(BigInt); require(d>0n,'Positive denominator required');
  const g=gcd(n,d); return [n/g,d/g];
}
const add=(a,b)=>Q(`${a[0]*b[1]+b[0]*a[1]}/${a[1]*b[1]}`);
const mul=(a,b)=>Q(`${a[0]*b[0]}/${a[1]*b[1]}`);
const neg=a=>[-a[0],a[1]];
const sub=(a,b)=>add(a,neg(b));
const cmp=(a,b)=>a[0]*b[1]<b[0]*a[1]?-1:a[0]*b[1]>b[0]*a[1]?1:0;
const exact=a=>a[1]===1n?`${a[0]}`:`${a[0]}/${a[1]}`;
function isqrt(n) { require(n>=0n,'Nonnegative radicand'); if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));while(true){let y=(x+n/x)/2n;if(y>=x)return x;x=y;} }
function sqrtUpperInteger(n) { const scale=1n<<128n;const a=BigInt(n)*scale*scale;let v=isqrt(a);if(v*v<a)v++;return Q(`${v}/${scale}`); }
export function canonicalJSON(x) {
  if(Array.isArray(x))return '['+x.map(canonicalJSON).join(',')+']';
  if(x!==null && typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(x[k])).join(',')+'}';
  return JSON.stringify(x);
}
async function sha256(text) { const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''); }
export async function verifyReceipt(r) {
  require(r && r.schema==='symmetry-lab.public-scalar-receipt.v1','Unsupported receipt schema');
  const checks=[];const pass=(id,label)=>checks.push({id,label,passed:true});
  for(const [role,pin] of Object.entries(PINNED_ORIGINALS))require(r.original_receipt_pins?.[role]?.sha256===pin && Number.isSafeInteger(r.original_receipt_pins[role].bytes) && r.original_receipt_pins[role].bytes>0,'Missing or wrong original receipt identity: '+role);
  for(const [role,status] of Object.entries(RECEIVED_STATUS))require(r.received_parent_status?.[role]===status,'Unexpected received parent status: '+role);
  require(r.scope?.finite_reference_symmetric_SCF_root===true,'Finite reference scope contract');
  require(r.scope.infinite_frozen_Bloch_spectrum_at_that_potential===true,'Frozen spectrum scope');
  for(const key of ['infinite_orbital_nonlinear_SCF_root','continuous_density_grid_or_BZ_integration_limit','global_ground_state','arbitrary_VASP_QE_output'])require(r.scope[key]===false,'Unsupported expanded claim: '+key);
  const model=r.model;require(model.carrier_cutoff_Ry===80 && canonicalJSON(model.charge_grid)==='[48,48,48]' && canonicalJSON(model.canonical_k_mesh)==='[12,12,12]' && model.irreducible_k_points===72,'Reference model changed');
  const ctx=r.source_context,t=r.distinct_frozen_target;
  require(await sha256(canonicalJSON(t))===r.distinct_frozen_target_sha256 && r.distinct_frozen_target_sha256==='ac4be1ee467e9088d41fbce0d44a926ab8834fb66964b30a138005c113de1d2a','Wrong distinct frozen target');
  require(ctx.C1_model.sha256===t.radial_C1_model_sha256 && ctx.ideal_geometry_receipt.sha256===t.affine_group_receipt_sha256 && canonicalJSON(ctx.ideal_atom_positions_alat)===canonicalJSON(t.ideal_atom_positions_alat),'Operator or geometry identity mismatch');
  require(ctx.reference_frozen48_source.sha256===t.raw48_sha256 && r.bridge.raw_endpoint.sha256===t.raw48_sha256 && canonicalJSON(ctx.reference_frozen48_source)===canonicalJSON(r.bridge.raw_endpoint),'Raw source endpoint mismatch');
  require(canonicalJSON(r.scf.saved_potential)===canonicalJSON(r.bridge.saved_endpoint),'Saved-potential endpoint mismatch');
  pass('source','源、算符与冻结势身份一致');
  const s=r.scf,eta=Q(s.eta_Ry),q=Q(s.q),R=Q(s.R_Ry),zero=Q('0'),one=Q('1');
  require(cmp(eta,zero)>=0 && cmp(q,zero)>=0 && cmp(q,one)<0 && cmp(R,zero)>0,'Invalid contraction parameters');
  const lhs=add(eta,mul(q,R)),slack=sub(R,lhs);
  require(cmp(slack,zero)>0 && cmp(lhs,Q(s.eta_plus_qR_Ry))===0,'Strict Banach radius inequality failed');
  pass('scf','精确复算 η + qR < R');
  const grid=Q(s.complete_grid_potential_L2_radius_Ry);require(cmp(grid,zero)>=0,'Negative grid radius');
  const rootDelta=mul(sqrtUpperInteger(48**3),grid),sourceDelta=Q(r.bridge.raw_to_saved_continuous_upper_Ry);require(cmp(sourceDelta,zero)>=0,'Negative source transfer error');
  const delta=add(rootDelta,sourceDelta),e=r.expected;
  require(cmp(rootDelta,Q(e.continuous_saved_to_root_potential_upper_Ry))===0 && cmp(delta,Q(e.continuous_total_potential_operator_difference_upper_Ry))===0,'Continuous transfer mismatch');
  pass('transfer','重算完整势误差及连续势传递');
  const f=r.frozen;require(f.accepted_closed_domains===925 && f.required_closed_wedge_obligations===960 && f.reconstructed_partition_cells===4096 && f.affine_actions===48 && f.occupied_rank===4,'Incomplete declared domain obligations');
  const [lo,hi]=f.common_cuts_Ry.map(Q);require(cmp(sub(hi,lo),Q(f.common_gap_Ry))===0 && cmp(hi,lo)>0,'Frozen window mismatch');
  require(cmp(Q(r.Ry_to_eV),Q('6802846561497/500000000000'))===0,'Energy conversion constant changed');
  const newlo=add(lo,delta),newhi=sub(hi,delta),gap=sub(newhi,newlo),gapEV=mul(gap,Q('13605693122994/1000000000000'));
  require(cmp(newlo,Q(e.common_exact_cuts_Ry[0]))===0 && cmp(newhi,Q(e.common_exact_cuts_Ry[1]))===0 && cmp(gap,Q(e.exact_global_indirect_gap_lower_Ry))===0 && cmp(gapEV,Q(e.exact_global_indirect_gap_lower_eV))===0,'Final gap composition mismatch');
  require(cmp(gapEV,Q('81/1000'))>0,'Strict published 0.081 eV gap was not preserved');
  require(cmp(q,Q('408/100000'))<0 && cmp(grid,Q('5426/1000000000000'))<0 && cmp(delta,Q('1047/100000000'))<0 && cmp(lhs,Q('2151/100000000000000'))<0,'Outward display bounds failed');
  pass('gap','全域共同能窗扣除两侧误差后仍为正');
  const digest=await sha256(canonicalJSON(r));require(digest===PINNED_PROJECTION_SHA256,'Published scalar projection hash mismatch');
  pass('projection','公开标量输入与固定版本一致');
  return {
    status:'VERIFIED_PUBLISHED_SCALAR_COMPOSITION', checks,
    metrics:{gapLowerEV:'> 0.081 eV',qUpper:'< 4.080 × 10^-3',gridPotentialRadiusUpperRy:'< 5.426 × 10^-9 Ry',totalPotentialErrorUpperRy:'< 1.047 × 10^-5 Ry',etaPlusQRUpperRy:'< 2.151 × 10^-11 Ry',radiusRy:'5 × 10^-11 Ry',acceptedDomains:925,irreducibleKPoints:72,occupiedRank:4},
    exact:{etaPlusQR_Ry:exact(lhs),radiiSlack_Ry:exact(slack),continuousSavedToRootUpper_Ry:exact(rootDelta),totalPotentialErrorUpper_Ry:exact(delta),commonCuts_Ry:[exact(newlo),exact(newhi)],gapLower_Ry:exact(gap),gapLower_eV:exact(gapEV)},
    scope:r.scope, sourcePins:r.original_receipt_pins, projectionSha256:digest,
    replayScope:'Published scalar projection identity, source-endpoint consistency, exact rational contraction and potential-error/gap composition. Parent DFT, response matrices, domain matrices and original parent bytes are not reexecuted or verified here.'
  };
}
