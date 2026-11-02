"""DFT refinement of C4 branch-order reversals; no band interpolation.

The prefix can be unresolved when its outer gap is below 1 meV. Refinement
therefore follows resolved whole-cluster C4 labels and the energy order of the
two exchanged branches, never relaxing the prefix acceptance threshold.
"""
from pathlib import Path
from fractions import Fraction
import argparse
import json
import numpy as np
from analyze_fe import sha, write_json, TOL
from prepare_fe import prepare
from run_fe import run_stage, density_files


def row_eligible(row):
    value = row.get('energy_covariance_eV')
    return isinstance(value, (float, int)) and np.isfinite(value) and value <= TOL['energy_covariance_eV']


def boundary_branch(row, band):
    if not row_eligible(row):
        return None
    for cluster in row['clusters']:
        if cluster['band_start_one_based'] <= band <= cluster['band_stop_one_based']:
            counts = cluster['multiplicities']
            if cluster['status'] != 'ASSIGNED_NUMERICALLY' or counts is None:
                return None
            present = [phase for phase, n in zip(cluster['phase_eighths'], counts) if n]
            if len(present) == 1:
                return present[0]
    return None


def signed_branch_gap(row, phase_a, phase_b):
    if not row_eligible(row):
        return None
    energies = {}
    for band in (18, 19):
        for cluster in row['clusters']:
            if cluster['band_start_one_based'] <= band <= cluster['band_stop_one_based']:
                if cluster['status'] != 'ASSIGNED_NUMERICALLY' or cluster['multiplicities'] is None:
                    return None
                present = [phase for phase, n in zip(cluster['phase_eighths'], cluster['multiplicities']) if n]
                if len(present) != 1:
                    return None  # A mixed degenerate cluster has no chosen energy order.
                energies[present[0]] = row['energies_eV'][band-1]
    if phase_a not in energies or phase_b not in energies:
        return None
    return float(energies[phase_b]-energies[phase_a])


def initialize_brackets(report):
    rows = report['rows']
    result = []
    for bracket in report['crossing_brackets']:
        left, right = [min(rows, key=lambda r: abs(r['t']-t)) for t in bracket['t_interval']]
        a, b = boundary_branch(left, 18), boundary_branch(right, 18)
        if a is None or b is None or a == b:
            raise ValueError('A crossing bracket lacks two distinct resolved boundary branches')
        dl, dr = signed_branch_gap(left, a, b), signed_branch_gap(right, a, b)
        if dl is None or dr is None or dl <= 0 or dr >= 0:
            raise ValueError('Initial branch-energy order does not reverse')
        result.append({'left': left, 'right': right, 'phase_a': a, 'phase_b': b,
                       'left_signed_gap_eV': dl, 'right_signed_gap_eV': dr})
    return result


def validate_initial_binding(initial, report, scf_source):
    run_path = Path(initial).parent/'RUN.json'
    run_record = json.loads(run_path.read_text(encoding='utf-8'))
    if report.get('execution_record_sha256') != sha(run_path) or run_record['status'] != 'QE_COMPLETED':
        raise ValueError('Initial analysis is not bound to its completed execution record')
    if run_record['source_scf_density_sha256'] != density_files(scf_source):
        raise ValueError('Initial path and refinement use different SCF Hamiltonian densities')
    for name, expected in report['source_metadata']['hashes'].items():
        if sha(Path(report['source'])/name) != expected:
            raise ValueError('Initial raw XML/wavefunction/pseudopotential changed: '+name)
    return run_record


def refine(initial, output, executable, scf_source, width=1e-5, max_rounds=9, threads=4, convergence_study=False):
    initial, output = Path(initial).resolve(), Path(output).resolve()
    if output.exists():
        raise ValueError('Refinement output must be a fresh directory')
    output.mkdir(parents=True)
    report = json.loads(initial.read_text(encoding='utf-8'))
    if not report.get('new_DFT_execution_claimed_by_analyzer'):
        raise ValueError('Use actual executed DFT path data to initialize refinement')
    run_record = validate_initial_binding(initial, report, scf_source)
    brackets = initialize_brackets(report)
    if not brackets:
        raise ValueError('No resolved branch-order crossing brackets')
    rounds = []
    for round_index in range(max_rounds):
        active = [b for b in brackets if b['right']['t']-b['left']['t'] > width]
        if not active:
            break
        parameters = set()
        for item in active:
            a = Fraction(str(item['left']['t'])).limit_denominator(10**8)
            b = Fraction(str(item['right']['t'])).limit_denominator(10**8)
            parameters.update(a+(b-a)*Fraction(j,4) for j in (1,2,3))
        folder = output/f'round_{round_index+1:02d}'
        prepare(folder, parameters=[str(t) for t in sorted(parameters)])
        execution = run_stage(folder, 'path', executable, threads, scf_source, convergence_study)
        path_report = json.loads((folder/'path/ANALYSIS.json').read_text(encoding='utf-8'))
        candidates = path_report['rows']
        for item in active:
            lo, hi = item['left']['t'], item['right']['t']
            known = [(item['left'], item['left_signed_gap_eV']), (item['right'], item['right_signed_gap_eV'])]
            for row in candidates:
                if lo < row['t'] < hi:
                    gap = signed_branch_gap(row, item['phase_a'], item['phase_b'])
                    if gap is not None and abs(gap) > 1e-10:
                        known.append((row, gap))
            known.sort(key=lambda x: x[0]['t'])
            reversals = [(a,b) for a,b in zip(known[:-1], known[1:]) if a[1] > 0 and b[1] < 0]
            if len(reversals) != 1:
                raise ValueError('Refinement has ambiguous or multiple branch reversals; inspect before continuing')
            a, b = reversals[0]
            item.update({'left': a[0], 'right': b[0], 'left_signed_gap_eV': a[1], 'right_signed_gap_eV': b[1]})
        rounds.append({'round': round_index+1, 'input_path_parameters': [str(t) for t in sorted(parameters)],
                       'analysis_sha256': sha(folder/'path/ANALYSIS.json'),
                       'execution_sha256': sha(folder/'path/RUN.json'), 'wall_seconds': execution['wall_seconds']})
        write_json(output/'PROGRESS.json', {'rounds': rounds, 'brackets': brackets})
    summary = {'status': 'BRANCH_ORDER_REVERSALS_REFINED' if all(b['right']['t']-b['left']['t'] <= width for b in brackets) else 'REFINEMENT_RESOLUTION_NOT_REACHED',
               'initial_analysis': str(initial), 'initial_analysis_sha256': sha(initial),
               'refiner_sha256': sha(__file__), 'source_scf_density_sha256': density_files(scf_source),
               'purpose': 'SCF_MESH_CONVERGENCE_NOT_SOURCE_REPRODUCTION' if convergence_study else 'PUBLISHED_4MESH_PROFILE_REPRODUCTION',
               'target_t_width': width, 'rounds': rounds,
               'new_DFT_points': sum(len(r['input_path_parameters']) for r in rounds),
               'prefix_gap_tolerance_not_relaxed': True, 'interpolated': False,
               'is_rigorous_DFT_error_enclosure': False,
               'interpretation': 'Resolved C4 branch energies reverse order across every retained interval. Continuity and persistent symmetry imply a crossing for the numerical Hamiltonian under the stated hypotheses.',
               'brackets': [{'t_interval': [b['left']['t'], b['right']['t']],
                             't_width': b['right']['t']-b['left']['t'],
                             'C4_phase_eighths_a_b': [b['phase_a'], b['phase_b']],
                             'endpoint_plane_wave_counts': [b['left'].get('plane_wave_count'), b['right'].get('plane_wave_count')],
                             'endpoint_G_sets_identical': b['left'].get('miller_vector_set_sha256') == b['right'].get('miller_vector_set_sha256'),
                             'continuity_of_finite_cutoff_matrix_not_proved': True,
                             'signed_gap_Eb_minus_Ea_eV': [b['left_signed_gap_eV'], b['right_signed_gap_eV']],
                             'left': b['left'], 'right': b['right']} for b in brackets]}
    write_json(output/'RESULT.json', summary)
    print(json.dumps({'status': summary['status'], 'new_DFT_points': summary['new_DFT_points'],
                      'intervals': [b['t_interval'] for b in summary['brackets']]}))
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--initial', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--pw', type=Path, required=True)
    ap.add_argument('--scf-source', type=Path, required=True)
    ap.add_argument('--width', type=float, default=1e-5)
    ap.add_argument('--max-rounds', type=int, default=9)
    ap.add_argument('--convergence-study', action='store_true')
    args = ap.parse_args()
    if args.width <= 0 or args.max_rounds < 1:
        ap.error('Positive resolution and round count required')
    refine(args.initial, args.out, args.pw, args.scf_source, args.width, args.max_rounds, convergence_study=args.convergence_study)


if __name__ == '__main__':
    main()
