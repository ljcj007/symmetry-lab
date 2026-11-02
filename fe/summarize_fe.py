"""Assemble small publication-facing evidence from frozen, real QE outputs."""
from pathlib import Path
import datetime
import json
import xml.etree.ElementTree as ET
import numpy as np
from analyze_fe import HARTREE_EV, compare_baseline, sha, write_json
from refine_fe import validate_initial_binding, signed_branch_gap

HERE = Path(__file__).resolve().parent


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def ref(path):
    path = Path(path)
    return {'path': path.relative_to(HERE).as_posix(), 'sha256': sha(path)}


def summarize():
    profiles, bindings = [], []
    old = load(HERE/'reports/OLD_8_POINT_ANALYSIS.json')
    baselines = {}
    for mesh, name in [(4,'reference_17'), (8,'convergence_8mesh'), (12,'convergence_12mesh')]:
        base = HERE/'experiments'/name
        fine = HERE/'experiments/fine_101/path' if mesh == 4 else base/'path'
        refined_path = HERE/f'experiments/refined_{mesh}mesh/RESULT.json'
        strict_folder = HERE/f'experiments/strict_{mesh}mesh'
        refined, strict = load(refined_path), load(strict_folder/'COMPARISON.json')
        scf_save = base/'scf/scratch/Fe.save'
        initial_path = fine/'ANALYSIS.json'
        initial = load(initial_path)
        validate_initial_binding(initial_path, initial, scf_save)
        scf_run = load(base/'scf/RUN.json')
        source_hash = scf_run['saved_density_sha256']
        xml = ET.parse(scf_save/'data-file-schema.xml').getroot()
        ef = float(xml.findtext('output/band_structure/fermi_energy'))*HARTREE_EV
        moment = np.fromstring(xml.findtext('output/magnetization/total_vec'), sep=' ').tolist()
        baselines[mesh] = load(base/'baseline8/ANALYSIS.json')
        entries = []
        for bracket, check in zip(refined['brackets'], strict['comparisons']):
            if bracket['t_interval'] != check['t_interval'] or not check['opposite_signs_preserved']:
                raise ValueError('Strict recomputation does not preserve a reported crossing interval')
            rows = check['strict_endpoint_rows']
            for row, expected in zip(rows, check['strict_signed_gap_eV']):
                if abs(signed_branch_gap(row, *bracket['C4_phase_eighths_a_b'])-expected) > 1e-12:
                    raise ValueError('Strict branch-energy summary mismatch')
            entries.append({'t_interval': bracket['t_interval'], 't_width': bracket['t_width'],
                            'phase_eighths_a_b': bracket['C4_phase_eighths_a_b'],
                            'signed_gap_Eb_minus_Ea_eV': bracket['signed_gap_Eb_minus_Ea_eV'],
                            'strict_signed_gap_Eb_minus_Ea_eV': check['strict_signed_gap_eV'],
                            'strict_energy_change_max_eV': check['maximum_all_band_energy_change_eV'],
                            'endpoint_prefix_status': [r['prefix']['status'] for r in rows],
                            'endpoint_plane_wave_counts': check['endpoint_plane_wave_counts'],
                            'endpoint_G_sets_identical': check['endpoint_G_sets_identical'],
                            'endpoint_G_set_sha256': [r['miller_vector_set_sha256'] for r in rows],
                            'max_endpoint_energy_covariance_eV': max(r['energy_covariance_eV'] for r in rows),
                            'approximate_crossing_energy_absolute_eV': float(np.mean(rows[0]['energies_eV'][17:19])),
                            'approximate_crossing_energy_relative_to_EF_eV': float(np.mean(rows[0]['energies_eV'][17:19])-ef)})
        for round_record in refined['rounds']:
            folder = refined_path.parent/f"round_{round_record['round']:02d}"/'path'
            run = load(folder/'RUN.json')
            if run['source_scf_density_sha256'] != source_hash:
                raise ValueError('Refinement mixes Hamiltonian densities')
            if sha(folder/'RUN.json') != round_record['execution_sha256'] or sha(folder/'ANALYSIS.json') != round_record['analysis_sha256']:
                raise ValueError('Refinement evidence changed after summary')
        profiles.append({'SCF_mesh': [mesh]*3, 'SCF_moment_Bohr_magneton': moment,
                         'SCF_fermi_energy_eV': ef, 'SCF_charge_density_sha256': source_hash,
                         'SCF_execution': ref(base/'scf/RUN.json'),
                         'baseline8_execution': ref(base/'baseline8/RUN.json'),
                         'baseline8_comparison_to_published': load(base/'baseline8/BASELINE_COMPARISON.json'),
                         'fine_path_execution': ref(fine/'RUN.json'), 'fine_path_analysis': ref(initial_path),
                         'fine_path_points': len(initial['rows']),
                         'fine_path_minimum_sampled_delta18_eV': initial['minimum_sampled_delta18_eV'],
                         'refinement': ref(refined_path), 'refinement_points': refined['new_DFT_points'],
                         'strict_endpoint_recomputation': ref(strict_folder/'COMPARISON.json'),
                         'crossings': entries})
    run_paths = sorted((HERE/'experiments').rglob('RUN.json'))
    runs = []
    for path in run_paths:
        run = load(path)
        folder = path.parent
        if run['status'] != 'QE_COMPLETED' or run['stdout_sha256'] != sha(folder/'pw.out'):
            raise ValueError('Changed or incomplete QE execution')
        if run['input_sha256'] != sha(folder/'pw.in') or run['executable_sha256'] != sha(run['executable']):
            raise ValueError('Input or executable binding mismatch')
        entry = {'execution': ref(path), 'stage': run['stage'], 'wall_seconds': run['wall_seconds'],
                 'input': ref(folder/'pw.in'), 'stdout': ref(folder/'pw.out'),
                 'input_pseudopotential': ref(folder/'Fe.jry.pbe.UPF'),
                 'source_density_sha256': run['source_scf_density_sha256'],
                 'saved_density_sha256': run['saved_density_sha256']}
        analysis_path = folder/'ANALYSIS.json'
        if analysis_path.exists():
            analysis = load(analysis_path)
            entry['k_points'] = len(analysis['rows'])
            entry['analysis'] = ref(analysis_path)
            raw = {'path': str(Path(analysis['source']).relative_to(HERE)).replace('\\','/'), 'files_sha256': {}}
            for name, expected in analysis['source_metadata']['hashes'].items():
                if sha(Path(analysis['source'])/name) != expected:
                    raise ValueError('Raw evidence file changed: '+name)
                raw['files_sha256'][name] = expected
            entry['source_metadata'] = raw
        bindings.append(entry)
        runs.append(run)
    write_json(HERE/'reports/RAW_BINDINGS.json', {'schema': 'symmetry-lab.fe-frozen-run-bindings.v1', 'runs': bindings})
    comparisons = []
    for first, second in [(4,8),(8,12)]:
        comparison = compare_baseline(baselines[first], baselines[second])
        comparisons.append({'from_mesh': first, 'to_mesh': second,
                            'absolute_max_all_eight_point_band_energy_change_eV': comparison['absolute_max_energy_difference_eV'],
                            'C4_endpoint_prefix_multiplicities_preserved': comparison['c4_prefix_multiplicities_match'],
                            'crossing_midpoint_shifts': [float(np.mean(b['t_interval'])-np.mean(a['t_interval']))
                                for a,b in zip(profiles[(4,8,12).index(first)]['crossings'], profiles[(4,8,12).index(second)]['crossings'])]})
    result = {'schema': 'symmetry-lab.fe-numerical-closure.v1',
              'status': 'REAL_DFT_BRANCH_ORDER_REVERSALS_WITH_MESH_SENSITIVITY',
              'created_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'source_manifest': ref(HERE/'SOURCE_MANIFEST.json'),
              'software_acquisition': ref(HERE/'software/ACQUISITION.json'),
              'pw_executable_sha256': runs[0]['executable_sha256'], 'QE_version': '7.5',
              'published_source_QE_version': '7.3.1', 'published_source_sha256_inventory_preserved': True,
              'selected_spectral_prefix_rank': 18, 'occupied_bundle_claimed': False,
              'path': 'q(t)=(t,t,t), 0<=t<=1/2, Cartesian z',
              'C4_eigenvalue_phase_eighths': [7,1,3,5],
              'real_QE_run_count': len(runs), 'SCF_runs': sum(r['stage']=='scf' for r in runs),
              'NSCF_runs': sum(r['stage']!='scf' for r in runs),
              'NSCF_k_point_evaluations': sum(r.get('k_points',0) for r in bindings),
              'sum_QE_stage_wall_seconds': sum(r['wall_seconds'] for r in runs),
              'k_point_count_includes_repeated_endpoints_and_repeated_mesh_profiles': True,
              'profiles': profiles, 'mesh_changes': comparisons,
              'all_raw_bindings': ref(HERE/'reports/RAW_BINDINGS.json'),
              'findings': ['The published eight-point spectrum is reproduced without an energy shift to 2.51e-7 eV.',
                           'Three C4 branch-energy order reversals occur for each of the 4^3, 8^3 and 12^3 SCF grids.',
                           'Each final short interval has opposite signed branch gaps, rechecked at a stricter NSCF threshold.',
                           'Crossing locations move with the SCF grid, much more than the local refinement widths.'],
              'not_proved': ['A rigorously enclosed DFT eigenvalue error or exact real-material root',
                             'Physical convergence of crossing positions to the reported local t widths',
                             'Global continuity of the finite-cutoff matrices merely from endpoint G-set agreement',
                             'An occupied-band topological invariant or a Fermi-level material prediction',
                             'No additional crossings outside the three observed branch-order reversals'],
              'unchanged': ['published Phase 1-12 source data', 'website', 'original 0.05 eV reproduction gate', '1 meV prefix resolution guard'],
              'raw_data_retained_locally': True, 'interpolation_used_for_claimed_points': False}
    write_json(HERE/'reports/NUMERICAL_CLOSURE.json', result)
    print(json.dumps({'status': result['status'], 'runs': len(runs), 'NSCF_points': result['NSCF_k_point_evaluations'],
                      'mesh_changes': comparisons}))
    return result


if __name__ == '__main__':
    summarize()
