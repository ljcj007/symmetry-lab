"""Publish a scalar projection of preserved research receipts; never alter them."""
from pathlib import Path
from fractions import Fraction as Q
import hashlib
import json
import zipfile

SITE = Path(__file__).resolve().parents[1]
TASK = SITE.parents[1] / 'paper/work/qe_si_end_to_end_20261117'
PUBLIC = SITE / 'dist/end-to-end'

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()

def load(rel):
    p = TASK / rel
    return json.loads(p.read_text(encoding='utf-8-sig')), {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}

def main():
    s, sp = load('root/finite_scf_finalization_v2/finite_scf/RESULTS.json')
    f, fp = load('root/frozen_retarget_received_v2/symmetrized_ideal_all925/RESULTS.json')
    b, bp = load('root/refined_potential_transfer_v1/RESULTS.json')
    z, zp = load('root/scf_infinite_gap_final_v1/RESULTS.json')
    a, ap = load('root/FINAL_ACCEPTANCE_CONTINUUM_v1/RESULTS.json')
    assert zp['sha256'] == '4a2f177851aaacdfe84247e573422ea3df13c527a1b1069939b293646cb348c0'
    assert sp['sha256'] == '57caef8609b878ce7b544dea40783245e251b4989836e95383a91ba1bd9b1172'
    assert fp['sha256'] == 'e31bf5f774d4872bf24e98b99110b1eb95749546311f95258e5fd296a8554ac6'
    assert bp['sha256'] == 'd35a4ae588ad17d1d759a4a0f9e62ed6b2ecd9b66a5a270329510115d6c5aca0'
    assert ap['sha256'] == '190f5d780d2cf5b2f6dd13bf135378e2cf9c0424497e7103d05199d399f6f38b'
    assert a['actual_total_closed_domains'] == f['raw_composition']['accepted_actual_closed_domains'] == 925
    assert a['independently_reconstructed_original_partition'] == 4096
    assert a['required_closed_wedge_obligations'] == 960
    assert a['complete48_group_and_closed_boundary_cover_checked'] is True
    assert a['distinct_target_sha256'] == z['distinct_frozen_target_sha256'] == f['distinct_target_sha256']
    assert all(Q(a[k]) == Q(z[v]) for k,v in [('finite_SCF_eta','eta_A'),('finite_SCF_q','q'),('finite_SCF_R','R'),('full_grid_potential_radius_Ry','complete_grid_potential_L2_radius_Ry'),('final_global_gap_lower_eV','exact_global_indirect_gap_lower_eV')])
    pins = b['source_inputs_before_after']
    raw = pins['root\\nscf48_frozen_v1\\ncs_native_k00001.bin']
    saved = pins['root\\refined_center_received_v1\\actual_scf_v1\\potential_final.npy']
    receipt = {
        'schema': 'symmetry-lab.public-scalar-receipt.v1',
        'profile': 'QE-Si finite-reference-SCF / infinite-frozen-spectrum',
        'projection_role': 'Exact scalar projection of executed parent receipts. Original parent bytes, native DFT, 72 response calculations and 925 matrix receivers are not included or reexecuted by this public scalar receiver.',
        'scope': {'finite_reference_symmetric_SCF_root': True, 'infinite_frozen_Bloch_spectrum_at_that_potential': True, 'infinite_orbital_nonlinear_SCF_root': False, 'continuous_density_grid_or_BZ_integration_limit': False, 'global_ground_state': False, 'arbitrary_VASP_QE_output': False},
        'model': {'material': 'Si', 'DFT_source': 'Quantum ESPRESSO', 'carrier_cutoff_Ry': 80, 'charge_grid': [48,48,48], 'canonical_k_mesh': [12,12,12], 'irreducible_k_points': 72, 'active_invariant_potential_directions': 663, 'full_invariant_grid_directions': 2618, 'symmetry': 'Exact ideal affine symmetry; fixed mean-potential gauge', 'PBE': 'Analytic reference PBE', 'radial_model': 'C1 Hermite interpolation of exact UPF radial nodes', 'ionic_potential': 'P_sym(exact native input vrs minus exact input Hxc)'},
        'original_receipt_pins': {'finite_scf': sp, 'infinite_frozen': fp, 'continuous_bridge': bp, 'final_composition': zp, 'independent_acceptance': ap},
        'received_parent_status': {'finite_scf': s['status'], 'infinite_frozen': f['status'], 'continuous_bridge': b['status'], 'final_composition': z['status'], 'independent_acceptance': a['status']},
        'source_context': s['source_context'],
        'distinct_frozen_target': f['distinct_target'],
        'distinct_frozen_target_sha256': f['distinct_target_sha256'],
        'scf': {'eta_Ry': s['eta_A'], 'q': s['q'], 'R_Ry': s['R'], 'eta_plus_qR_Ry': s['eta_plus_qR'], 'complete_grid_potential_L2_radius_Ry': z['complete_grid_potential_L2_radius_Ry'], 'saved_potential': s['saved_final_potential']},
        'frozen': {'common_cuts_Ry': f['common_cuts_Ry'], 'common_gap_Ry': f['common_gap_Ry'], 'accepted_closed_domains': f['raw_composition']['accepted_actual_closed_domains'], 'required_closed_wedge_obligations': a['required_closed_wedge_obligations'], 'reconstructed_partition_cells': a['independently_reconstructed_original_partition'], 'affine_actions': 48, 'occupied_rank': z['rank']},
        'bridge': {'raw_endpoint': raw, 'saved_endpoint': saved, 'raw_to_saved_continuous_upper_Ry': b['continuous_multiplication_operator_difference_upper_Ry'], 'extension': b['extension']},
        'expected': {k: z[k] for k in ['continuous_saved_to_root_potential_upper_Ry', 'continuous_total_potential_operator_difference_upper_Ry', 'common_exact_cuts_Ry', 'exact_global_indirect_gap_lower_Ry', 'exact_global_indirect_gap_lower_eV']},
        'Ry_to_eV': '6802846561497/500000000000',
    }
    # Crosscheck extracted values against the actually accepted final composition.
    assert Q(receipt['Ry_to_eV']) == Q('13.605693122994')
    assert Q(receipt['scf']['eta_Ry']) + Q(receipt['scf']['q']) * Q(receipt['scf']['R_Ry']) == Q(s['eta_plus_qR'])
    for role, pin in [('scf', sp), ('frozen', fp), ('bridge', bp)]:
        assert all(z['received_parent_receipts'][role][k] == pin[k] for k in ('sha256', 'bytes'))
    out = PUBLIC / 'data/si-reference-receipt.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False)+'\n', encoding='utf-8', newline='\n')
    digest = hashlib.sha256(canonical(receipt)).hexdigest()
    manifest = {'schema': 'symmetry-lab.public-scalar-projection-manifest.v1', 'canonicalization': 'Recursive sorted object keys, JSON compact separators, UTF-8; array order retained', 'receipt': 'si-reference-receipt.json', 'canonical_sha256': digest, 'file_sha256': hashlib.sha256(out.read_bytes()).hexdigest(), 'original_receipt_pins': receipt['original_receipt_pins'], 'scope': receipt['projection_role']}
    (PUBLIC / 'data/manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8', newline='\n')
    for rel in ['verify.js', 'downloads/verify.py']:
        p = PUBLIC / rel
        text = p.read_text(encoding='utf-8')
        import re
        text, changed = re.subn(r"(PINNED_PROJECTION_SHA256\s*=\s*)['\"][A-Za-z0-9_]+['\"]", lambda m: m.group(1)+repr(digest), text)
        assert changed == 1, 'Exactly one pinned projection constant'
        p.write_text(text, encoding='utf-8', newline='\n')
    # Stable archive bytes support byte-for-byte publication checks.
    files = {'si-reference-receipt.json': out, 'manifest.json': PUBLIC/'data/manifest.json', 'verify.py': PUBLIC/'downloads/verify.py', 'README.txt': PUBLIC/'downloads/README.txt', 'verify.cmd': PUBLIC/'downloads/verify.cmd', 'LICENSE': SITE/'source-bound-workbench/LICENSE'}
    with zipfile.ZipFile(PUBLIC/'downloads/si-reference-scalar-replay.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, p in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026,11,6,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED; info.external_attr=0o644 << 16
            archive.writestr(info, p.read_bytes())
    print(json.dumps({'canonical_sha256': digest, 'receipt_bytes': out.stat().st_size, 'archive_bytes': (PUBLIC/'downloads/si-reference-scalar-replay.zip').stat().st_size}))

if __name__ == '__main__':
    main()
