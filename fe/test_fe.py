"""Positive controls and deliberately invalid spinor/branch examples."""
from pathlib import Path
import json
import uuid
import unittest
from unittest.mock import patch
import numpy as np
from analyze_fe import (ROOTS, SZ, RZ, TOL, analyze_frame, assign_block, change_brackets,
                        path_audit, analyze_save, compare_baseline, PHASE9, pseudopotential_identity)
from prepare_fe import input_text, prepare
from source_data import source_directory
from refine_fe import signed_branch_gap, boundary_branch, validate_initial_binding
from analyze_fe import sha, write_json


def crossing(t):
    # 17 permanently lower bands; the 18th/19th pair have distinct C4 roots.
    labels = [0]*4+[1]*4+[2]*4+[3]*5+[2, 1]+[i % 4 for i in range(13)]
    energy = np.array(list(np.arange(17)-20)+[t, -t]+list(np.arange(13)+2), float)
    order = np.argsort(energy, kind='stable')
    frame = np.eye(32, dtype=complex)[:, order]
    image = np.diag(ROOTS[np.array(labels)]) @ frame
    return energy[order], frame, image


class FeTests(unittest.TestCase):
    def test_path_is_z_and_default_win_is_x(self):
        a = np.array([[1,1,1],[-1,1,1],[-1,-1,1]])*2.71175
        report = path_audit(a)
        self.assertTrue(report['same_endpoint_mod_reciprocal_lattice'])
        self.assertFalse(report['same_Gamma_to_H_path'])
        self.assertLess(abs(report['target_H_cartesian_inverse_bohr'][0]), 1e-12)
        self.assertLess(abs(report['source_win_H_cartesian_inverse_bohr'][2]), 1e-12)

    def test_spinor_double_cover(self):
        self.assertTrue(np.allclose(np.linalg.matrix_power(SZ, 4), -np.eye(2)))

    def test_opposite_spin_lift_is_not_same_active_rotation(self):
        a = np.array([[1,1,1],[-1,1,1],[-1,-1,1]])*2.71175
        with patch('analyze_fe.SZ', SZ.conj()):
            with self.assertRaises(ValueError):
                path_audit(a)

    def test_real_crossing_changes_prefix_labels(self):
        left = analyze_frame(*crossing(-0.1))
        right = analyze_frame(*crossing(0.1))
        self.assertEqual(left['prefix']['multiplicities'], [4,4,5,5])
        self.assertEqual(right['prefix']['multiplicities'], [4,5,4,5])
        left['t'], right['t'] = .2, .3
        brackets = change_brackets([left, right])
        self.assertEqual(brackets[0]['t_interval'], [.2, .3])
        self.assertFalse(brackets[0]['is_rigorous_DFT_error_enclosure'])

    def test_closed_gap_prefix_is_unresolved(self):
        report = analyze_frame(*crossing(0.0))
        self.assertEqual(report['prefix']['status'], 'UNRESOLVED_SMALL_OR_CLOSED_OUTER_GAP')
        self.assertIsNone(report['prefix']['multiplicities'])
        pair = next(c for c in report['clusters'] if c['band_start_one_based'] == 18)
        self.assertEqual(pair['multiplicities'], [0,1,1,0])

    def test_gauge_mix_in_degenerate_cluster(self):
        energy, frame, image = crossing(0)
        u = np.eye(32, dtype=complex)
        u[17:19, 17:19] = np.array([[1, 1j], [1j, 1]])/np.sqrt(2)
        report = analyze_frame(energy, frame@u, image@u)
        pair = next(c for c in report['clusters'] if c['band_start_one_based'] == 18)
        self.assertEqual(pair['multiplicities'], [0,1,1,0])

    def test_spinless_operator_rejected(self):
        energy, frame, _ = crossing(-.1)
        report = analyze_frame(energy, frame, frame)
        self.assertEqual(report['prefix']['status'], 'UNRESOLVED')
        self.assertGreater(report['prefix']['spinful_fourth_power_error'], 1)

    def test_missing_plane_wave_weight_rejected(self):
        energy, frame, image = crossing(-.1)
        missing = np.zeros(32)
        missing[0] = .01
        report = analyze_frame(energy, frame, image, missing)
        self.assertIsNone(report['prefix']['multiplicities'])

    def test_unoccupied_rotation_across_energy_rejected(self):
        energy, frame, image = crossing(-.1)
        image = image.copy()
        image[:, [0,18]] = image[:, [18,0]]
        report = analyze_frame(energy, frame, image)
        self.assertEqual(report['prefix']['status'], 'UNRESOLVED_ENERGY_COVARIANCE')

    def test_nan_and_unsorted_rejected(self):
        energy, frame, image = crossing(-.1)
        energy[0] = np.nan
        with self.assertRaises(ValueError):
            analyze_frame(energy, frame, image)
        energy, frame, image = crossing(-.1)
        with self.assertRaises(ValueError):
            analyze_frame(energy[::-1], frame, image)

    def test_same_labels_do_not_claim_global_gap(self):
        left = analyze_frame(*crossing(-.2))
        right = analyze_frame(*crossing(-.1))
        left['t'], right['t'] = 0, .5
        self.assertEqual(change_brackets([left, right]), [])

    def test_reference_cutoffs_and_path_input(self):
        # Retain test artifacts under this research line; the host's OS temp
        # directory has restrictive inherited ACLs and is not a reliable fixture.
        dest = Path(__file__).resolve().parent/'test_artifacts'/uuid.uuid4().hex
        manifest = prepare(dest, samples=17)
        self.assertEqual(manifest['path_parameter_exact'][-1], '1/2')
        self.assertEqual(manifest['scf_mesh'], [4,4,4])
        self.assertIn('ecutwfc=120.0', (dest/'scf/pw.in').read_text())
        self.assertIn('4 4 4 0 0 0', (dest/'scf/pw.in').read_text())
        self.assertEqual(len(manifest['input_files_sha256']), 6)
        with self.assertRaises(ValueError):
            prepare(dest)

    def test_real_published_endpoints_from_raw_coefficients(self):
        report = analyze_save(source_directory()/'Fe.save')
        self.assertEqual(report['rows'][0]['prefix']['multiplicities'], [4,4,5,5])
        self.assertEqual(report['rows'][7]['prefix']['multiplicities'], [4,5,4,5])
        self.assertAlmostEqual(report['minimum_sampled_delta18_eV'], .855786475933, places=10)
        comparison = compare_baseline(report, report)
        self.assertEqual(comparison['status'], 'REPRODUCED_WITHIN_DECLARED_NUMERICAL_PROFILE')
        self.assertFalse(comparison['same_original_SCF_Hamiltonian_proved'])

    def test_baseline_change_detected(self):
        report = analyze_save(source_directory()/'Fe.save')
        changed = json.loads(json.dumps(report))
        changed['rows'][0]['energies_eV'][0] += .1
        self.assertEqual(compare_baseline(report, changed)['status'], 'BASELINE_MISMATCH_REQUIRES_REVIEW')

    def test_old_cube_is_not_a_path_import(self):
        with self.assertRaises(ValueError):
            analyze_save(source_directory()/'Fe.save', on_path=True)

    def test_CRLF_is_only_permitted_pseudopotential_change(self):
        data = (source_directory()/'Fe.save/Fe.jry.pbe.UPF').read_bytes()
        original = pseudopotential_identity(data)
        windows = pseudopotential_identity(data.replace(b'\n', b'\r\n'))
        self.assertEqual(original['LF_sha256'], windows['LF_sha256'])
        self.assertTrue(windows['CRLF_only_normalization'])
        with self.assertRaises(ValueError):
            pseudopotential_identity(data+b' ')
        with self.assertRaises(ValueError):
            pseudopotential_identity(data.replace(b'PBE', b'LDA', 1))

    def test_signed_branch_energy_order_reverses(self):
        a, b = analyze_frame(*crossing(-.1)), analyze_frame(*crossing(.1))
        self.assertGreater(signed_branch_gap(a, 3, 1), 0)
        self.assertLess(signed_branch_gap(b, 3, 1), 0)
        self.assertIsNone(signed_branch_gap(analyze_frame(*crossing(0)), 3, 1))

    def test_refinement_rejects_bad_or_missing_energy_covariance(self):
        row = analyze_frame(*crossing(-.1))
        row['energy_covariance_eV'] = TOL['energy_covariance_eV']*2
        self.assertIsNone(signed_branch_gap(row, 3, 1))
        self.assertIsNone(boundary_branch(row, 18))
        del row['energy_covariance_eV']
        self.assertIsNone(signed_branch_gap(row, 3, 1))

    def test_initial_refinement_rejects_other_density_and_changed_raw_input(self):
        folder = Path(__file__).resolve().parent/'test_artifacts'/uuid.uuid4().hex
        folder.mkdir(parents=True)
        a, b = folder/'density_a', folder/'density_b'
        a.mkdir(); b.mkdir()
        (a/'charge-density.dat').write_bytes(b'density A')
        (b/'charge-density.dat').write_bytes(b'density B')
        (folder/'raw.dat').write_bytes(b'raw data')
        write_json(folder/'RUN.json', {'status': 'QE_COMPLETED', 'source_scf_density_sha256':
                                     {'charge-density.dat': sha(a/'charge-density.dat')}})
        report = {'execution_record_sha256': sha(folder/'RUN.json'), 'source': str(folder),
                  'source_metadata': {'hashes': {'raw.dat': sha(folder/'raw.dat')}}}
        validate_initial_binding(folder/'ANALYSIS.json', report, a)
        with self.assertRaises(ValueError):
            validate_initial_binding(folder/'ANALYSIS.json', report, b)
        (folder/'raw.dat').write_bytes(b'altered raw data')
        with self.assertRaises(ValueError):
            validate_initial_binding(folder/'ANALYSIS.json', report, a)


if __name__ == '__main__':
    unittest.main(verbosity=2)
