"""Independent stdlib scalar receiver for the published QE-Si projection.

This verifies the fixed public projection and exact scalar implications only.
Original receipt hashes identify preserved parents; their bytes are not in this
bundle. DFT, response and closed-domain matrix computations are not replayed.
"""
from fractions import Fraction as Q
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys

PINNED_PROJECTION_SHA256 = '883d321f7723fe6421a6623b7c03f6f2bdc1e58d8425fc67bea1d16dff76bfdf'
PINS = {
    'finite_scf': '57caef8609b878ce7b544dea40783245e251b4989836e95383a91ba1bd9b1172',
    'infinite_frozen': 'e31bf5f774d4872bf24e98b99110b1eb95749546311f95258e5fd296a8554ac6',
    'continuous_bridge': 'd35a4ae588ad17d1d759a4a0f9e62ed6b2ecd9b66a5a270329510115d6c5aca0',
    'final_composition': '4a2f177851aaacdfe84247e573422ea3df13c527a1b1069939b293646cb348c0',
    'independent_acceptance': '190f5d780d2cf5b2f6dd13bf135378e2cf9c0424497e7103d05199d399f6f38b'
}
RECEIVED_STATUS = {
    'finite_scf':'CERTIFIED_FINITE_C1_REFERENCE_SCF_FIXED_POINT_IN_IDEAL_SYMMETRIC_SECTOR',
    'infinite_frozen':'CERTIFIED_SYMMETRIZED_IDEAL48_C1_INFINITE_ALL_BZ_RANK4_GAP_UNDER_RECORDED_ARITHMETIC_PREMISES',
    'continuous_bridge':'CERTIFIED_CONTINUOUS_SYMMETRIZED_POTENTIAL_CHANGE_UNDER_RECORDED_IEEE_PREMISES',
    'final_composition':'CERTIFIED_INFINITE_GLOBAL_RANK4_GAP_AT_AN_ENCLOSED_FINITE_REFERENCE_SCF_POTENTIAL',
    'independent_acceptance':'INDEPENDENTLY_ACCEPTED_FINITE_REFERENCE_SCF_AND_SAME_POTENTIAL_INFINITE_GLOBAL_RANK4_GAP'
}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def canonical(data):
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')

def sha(data):
    return hashlib.sha256(canonical(data)).hexdigest()

def sqrt_upper_integer(n):
    scale = 1 << 128
    a = n * scale * scale
    v = math.isqrt(a)
    return Q(v + (v*v < a), scale)

def verify_receipt(r):
    require(r['schema'] == 'symmetry-lab.public-scalar-receipt.v1', 'Unsupported schema')
    for key, expected in PINS.items():
        require(r['original_receipt_pins'][key]['sha256'] == expected and type(r['original_receipt_pins'][key]['bytes']) is int and r['original_receipt_pins'][key]['bytes'] > 0, 'Original parent identity: '+key)
    for key, expected in RECEIVED_STATUS.items():
        require(r['received_parent_status'][key] == expected, 'Unexpected received parent status: '+key)
    require(r['scope']['finite_reference_symmetric_SCF_root'] is True and r['scope']['infinite_frozen_Bloch_spectrum_at_that_potential'] is True, 'Finite-reference / frozen-spectrum scope')
    for key in ('infinite_orbital_nonlinear_SCF_root', 'continuous_density_grid_or_BZ_integration_limit', 'global_ground_state', 'arbitrary_VASP_QE_output'):
        require(r['scope'][key] is False, 'Unsupported claim: '+key)
    m = r['model']
    require(m['carrier_cutoff_Ry'] == 80 and m['charge_grid'] == [48]*3 and m['canonical_k_mesh'] == [12]*3 and m['irreducible_k_points'] == 72, 'Reference model changed')
    ctx,t = r['source_context'],r['distinct_frozen_target']
    require(sha(t) == r['distinct_frozen_target_sha256'] == 'ac4be1ee467e9088d41fbce0d44a926ab8834fb66964b30a138005c113de1d2a', 'Distinct frozen target identity')
    require(ctx['C1_model']['sha256'] == t['radial_C1_model_sha256'] and ctx['ideal_geometry_receipt']['sha256'] == t['affine_group_receipt_sha256'] and ctx['ideal_atom_positions_alat'] == t['ideal_atom_positions_alat'], 'Operator / geometry mismatch')
    require(ctx['reference_frozen48_source']['sha256'] == t['raw48_sha256'] == r['bridge']['raw_endpoint']['sha256'] and ctx['reference_frozen48_source'] == r['bridge']['raw_endpoint'], 'Raw source endpoint mismatch')
    require(r['scf']['saved_potential'] == r['bridge']['saved_endpoint'], 'Saved potential endpoint mismatch')
    s,b,e,f = r['scf'],r['bridge'],r['expected'],r['frozen']
    eta,q,R = map(Q, (s['eta_Ry'],s['q'],s['R_Ry']))
    lhs = eta+q*R
    require(eta >= 0 and 0 <= q < 1 and R > 0 and lhs < R and lhs == Q(s['eta_plus_qR_Ry']), 'Strict Banach radius inequality')
    grid = Q(s['complete_grid_potential_L2_radius_Ry'])
    source_delta = Q(b['raw_to_saved_continuous_upper_Ry'])
    require(grid >= 0 and source_delta >= 0, 'Nonnegative error bounds')
    root_delta = sqrt_upper_integer(48**3)*grid
    delta = root_delta+source_delta
    require(root_delta == Q(e['continuous_saved_to_root_potential_upper_Ry']) and delta == Q(e['continuous_total_potential_operator_difference_upper_Ry']), 'Continuous transfer mismatch')
    require((f['accepted_closed_domains'],f['required_closed_wedge_obligations'],f['reconstructed_partition_cells'],f['affine_actions'],f['occupied_rank']) == (925,960,4096,48,4), 'Domain obligations changed')
    lo,hi = map(Q,f['common_cuts_Ry'])
    require(Q(r['Ry_to_eV']) == Q('13.605693122994'), 'Energy conversion constant changed')
    require(hi>lo and hi-lo == Q(f['common_gap_Ry']), 'Frozen window mismatch')
    newlo,newhi = lo+delta,hi-delta
    gap = newhi-newlo
    ev = gap*Q('13.605693122994')
    require([newlo,newhi] == list(map(Q,e['common_exact_cuts_Ry'])) and gap == Q(e['exact_global_indirect_gap_lower_Ry']) and ev == Q(e['exact_global_indirect_gap_lower_eV']) and ev > Q('0.081'), 'Final positive gap composition')
    require(q<Q('0.004080') and grid<Q('5.426e-9') and delta<Q('1.047e-5') and lhs<Q('2.151e-11'), 'Outward display bounds')
    require(sha(r) == PINNED_PROJECTION_SHA256, 'Published scalar projection hash mismatch')
    return {'status':'VERIFIED_PUBLISHED_SCALAR_COMPOSITION', 'projection_sha256':sha(r), 'gap_lower_eV_display':'> 0.081 eV', 'exact':{'etaPlusQR_Ry':str(lhs),'radiiSlack_Ry':str(R-lhs),'continuousSavedToRootUpper_Ry':str(root_delta),'totalPotentialErrorUpper_Ry':str(delta),'commonCuts_Ry':[str(newlo),str(newhi)],'gapLower_Ry':str(gap),'gapLower_eV':str(ev)}, 'scope':r['scope'], 'replay_scope':'Pinned published scalar projection and exact rational composition only; no original parent byte verification, DFT, response-matrix or domain-matrix replay.'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('receipt', nargs='?', type=Path, default=Path(__file__).resolve().with_name('si-reference-receipt.json'))
    parser.add_argument('--out', type=Path, help='Write result JSON to a new file')
    args = parser.parse_args()
    try:
        result = verify_receipt(json.loads(args.receipt.read_text(encoding='utf-8-sig')))
        if args.out:
            with args.out.open('x', encoding='utf-8', newline='\n') as stream:
                stream.write(json.dumps(result, indent=2)+'\n')
        print(json.dumps(result))
    except (OSError,ValueError,TypeError,KeyError) as error:
        print(json.dumps({'status':'REJECTED_PUBLIC_SCALAR_RECEIPT','reason':str(error)}), file=sys.stderr)
        return 2
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
