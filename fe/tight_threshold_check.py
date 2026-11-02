"""Recompute retained crossing endpoints at a stricter NSCF threshold."""
from pathlib import Path
from fractions import Fraction
import argparse
import json
import numpy as np
from analyze_fe import sha, write_json
from prepare_fe import prepare
from run_fe import run_stage
from refine_fe import signed_branch_gap

HERE = Path(__file__).resolve().parent


def check(mesh):
    result_path = HERE/f'experiments/refined_{mesh}mesh/RESULT.json'
    original = json.loads(result_path.read_text(encoding='utf-8'))
    parameters = sorted({Fraction(str(t)).limit_denominator(10**9)
                         for b in original['brackets'] for t in b['t_interval']})
    folder = HERE/f'experiments/strict_{mesh}mesh'
    prepare(folder, parameters=[str(x) for x in parameters], nscf_conv_thr='1.0e-12')
    source = HERE/'experiments'/('reference_17' if mesh == 4 else f'convergence_{mesh}mesh')/'scf/scratch/Fe.save'
    run_stage(folder, 'path', HERE/'software/qe-7.5/bin/pw.exe', 4, source, mesh != 4)
    analysis_path = folder/'path/ANALYSIS.json'
    analysis = json.loads(analysis_path.read_text(encoding='utf-8'))
    comparisons = []
    for bracket in original['brackets']:
        a, b = bracket['C4_phase_eighths_a_b']
        gaps, differences, rows = [], [], []
        for t, old in zip(bracket['t_interval'], [bracket['left'], bracket['right']]):
            row = min(analysis['rows'], key=lambda r: abs(r['t']-t))
            if abs(row['t']-t) > 1e-10:
                raise ValueError('Strict endpoint missing')
            gaps.append(signed_branch_gap(row, a, b))
            differences.append(float(np.max(abs(np.array(row['energies_eV'])-old['energies_eV']))))
            rows.append(row)
        preserved = gaps[0] is not None and gaps[1] is not None and gaps[0] > 0 and gaps[1] < 0
        comparisons.append({'t_interval': bracket['t_interval'], 'phase_eighths_a_b': [a,b],
                            'old_signed_gap_eV': bracket['signed_gap_Eb_minus_Ea_eV'],
                            'strict_signed_gap_eV': gaps, 'opposite_signs_preserved': preserved,
                            'maximum_all_band_energy_change_eV': max(differences),
                            'endpoint_plane_wave_counts': [r['plane_wave_count'] for r in rows],
                            'endpoint_G_sets_identical': rows[0]['miller_vector_set_sha256'] == rows[1]['miller_vector_set_sha256'],
                            'strict_endpoint_rows': rows})
    report = {'status': 'ALL_BRANCH_ORDER_SIGNS_PRESERVED' if all(b['opposite_signs_preserved'] for b in comparisons) else 'NUMERICAL_STABILITY_REQUIRES_REVIEW',
              'SCF_mesh': mesh, 'old_nscf_conv_thr_Ry': 1e-10, 'strict_nscf_conv_thr_Ry': 1e-12,
              'same_SCF_density': True, 'no_tolerance_relaxation': True,
              'original_refinement_sha256': sha(result_path), 'strict_analysis_sha256': sha(analysis_path),
              'strict_run_sha256': sha(folder/'path/RUN.json'), 'comparisons': comparisons,
              'not_a_rigorous_eigenvalue_error_bound': True}
    write_json(folder/'COMPARISON.json', report)
    print(json.dumps({'mesh': mesh, 'status': report['status'],
                      'max_energy_change_eV': max(b['maximum_all_band_energy_change_eV'] for b in comparisons)}))
    return report


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--meshes', nargs='+', type=int, default=[4,8,12])
    args = ap.parse_args()
    for mesh in args.meshes:
        if mesh not in (4,8,12):
            ap.error('This comparison covers the three declared SCF meshes only')
        check(mesh)
