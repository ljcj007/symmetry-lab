"""Analytic reference cases for displacement, matching, reconstruction and Landau theory."""
import copy
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from distortion_lab import run, preset_data, landau_model, _Images, _assignment, _assignment_gap


def custom(positions, displacement, modes, lattice=None, symbols=None):
    lattice = np.eye(3)*4 if lattice is None else np.array(lattice, dtype=float)
    positions = np.array(positions, dtype=float)
    symbols = symbols or ['H', 'He', 'Li', 'Be'][:len(positions)]
    target = positions + np.asarray(displacement) @ np.linalg.inv(lattice)
    make = lambda pos: {'lattice': lattice.tolist(), 'lengthUnit': 'angstrom',
                        'atoms': [{'symbol': s, 'coordinates': list(p)} for s, p in zip(symbols, pos)]}
    return {'preset': 'custom', 'parent': make(positions), 'distorted': make(target),
            'modes': [{'id': f'm{i}', 'vectors': np.asarray(m).tolist()} for i, m in enumerate(modes)],
            'remove_translation': False}


class DistortionLabTests(unittest.TestCase):
    def test_batio3_known_amplitudes_and_strain(self):
        result = run()
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.22, .07], atol=1e-13)
        self.assertLess(result['decomposition']['residualNorm'], 1e-13)
        self.assertTrue(result['decomposition']['orthonormal'])
        self.assertEqual(result['parent']['natom'], 5)
        self.assertAlmostEqual(result['strain']['volumeRatio'], 1.012)
        self.assertAlmostEqual(result['strain']['greenLagrange'][2][2], (1.012**2-1)/2)
        self.assertTrue(result['synthetic'])
        self.assertTrue(all(m['standardIrrep'] is None for m in result['decomposition']['modes']))

    def test_srtio3_compatible_supercell_and_antiphase_pattern(self):
        data = preset_data('srtio3')
        result = run({'preset': 'srtio3'})
        self.assertEqual(result['parent']['natom'], 40)
        np.testing.assert_allclose(data['parent']['lattice'], np.eye(3)*7.81)
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.12, .55], atol=1e-13)
        self.assertEqual(data['waveVector'], [.5, .5, .5])
        vector = np.array(data['modes'][1]['vectors'])
        np.testing.assert_allclose(np.sum(vector, axis=0), 0, atol=1e-14)
        # The O on x-facing and y-facing faces follows z cross (r_O-r_Ti).
        np.testing.assert_allclose(vector[2], [0, -.25, 0])
        np.testing.assert_allclose(vector[3], [.25, 0, 0])
        np.testing.assert_allclose(vector[7], -vector[2])  # neighbouring cell along z
        np.testing.assert_allclose(vector[4], 0)  # axial oxygen does not move

    def test_true_oblique_shortest_image_beats_fractional_rounding(self):
        lattice = np.array([[1, 0, 0], [.9, .1, 0], [0, 0, 1]])
        delta = np.array([.49, .49, 0])
        actual, shift, ambiguous = _Images(lattice).closest(delta)
        brute = [(np.linalg.norm((delta-np.array(n)) @ lattice), n)
                 for n in itertools.product(range(-4, 5), repeat=3)]
        distance, reference = min(brute)
        self.assertLess(distance, .07)
        self.assertGreater(np.linalg.norm(delta @ lattice), .9)
        np.testing.assert_array_equal(shift, reference)
        self.assertAlmostEqual(np.linalg.norm(actual @ lattice), distance)
        self.assertFalse(ambiguous)

    def test_skew_random_closest_images_against_brute_force(self):
        rng = np.random.default_rng(321)
        for _ in range(20):
            lattice = np.array([[1, 0, 0], [rng.uniform(-.95, .95), .4, 0],
                                [rng.uniform(-.8, .8), rng.uniform(-.3, .3), .7]])
            delta = rng.uniform(-.5, .5, 3)
            actual, _, _ = _Images(lattice).closest(delta)
            minimum = min(np.linalg.norm((delta-np.array(n)) @ lattice)
                          for n in itertools.product(range(-3, 4), repeat=3))
            self.assertAlmostEqual(np.linalg.norm(actual @ lattice), minimum, places=12)

    def test_global_assignment_and_second_cost_vs_all_permutations(self):
        rng = np.random.default_rng(123)
        for size in (2, 3, 4, 5, 6):
            for _ in range(4):
                cost = rng.random((size, size)) * 5
                scores = sorted(sum(cost[i, j] for i, j in enumerate(p))
                                for p in itertools.permutations(range(size)))
                chosen = _assignment(cost)
                self.assertAlmostEqual(sum(cost[i, j] for i, j in enumerate(chosen)), scores[0])
                self.assertAlmostEqual(_assignment_gap(cost, chosen), scores[1]-scores[0])
        # A row-by-row nearest-neighbour choice is provably suboptimal here.
        np.testing.assert_array_equal(_assignment(np.array([[1., 4.], [2., 100.]])), [1, 0])

    def test_permuted_atoms_preserve_known_coefficients(self):
        data = preset_data()
        permutation = [4, 3, 1, 0, 2]
        data['distorted']['atoms'] = [data['distorted']['atoms'][i] for i in permutation]
        result = run(data)
        self.assertEqual(result['mapping']['indices'], [permutation.index(i) for i in range(5)])
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.22, .07], atol=1e-13)

    def test_ambiguous_atom_matching_requires_explicit_map(self):
        data = custom([[0, 0, 0], [.5, 0, 0]], [[.25, 0, 0], [.25, 0, 0]],
                      [[[1, 0, 0], [1, 0, 0]]], lattice=np.eye(3), symbols=['Si', 'Si'])
        with self.assertRaisesRegex(ValueError, 'atom_mapping'):
            run(data)
        result = run(dict(data, atom_mapping=[0, 1]))
        self.assertEqual(result['mapping']['method'], 'explicit')
        self.assertAlmostEqual(result['decomposition']['amplitudes'][0], math.sqrt(2)/4)

    def test_periodic_image_tie_requires_explicit_image(self):
        data = custom([[0, 0, 0]], [[.5, 0, 0]], [[[1, 0, 0]]], lattice=np.eye(3))
        with self.assertRaisesRegex(ValueError, 'image_shifts'):
            run(data)
        self.assertAlmostEqual(run(dict(data, image_shifts=[[0, 0, 0]]))['decomposition']['amplitudes'][0], .5)
        self.assertAlmostEqual(run(dict(data, image_shifts=[[1, 0, 0]]))['decomposition']['amplitudes'][0], -.5)

    def test_translation_removal_and_restore_reconstruction(self):
        data = custom([[0, 0, 0], [.5, .5, .5]], [[.13, .2, .3], [.07, .2, .3]],
                      [[[1, 0, 0], [-1, 0, 0]]])
        data['remove_translation'] = True
        result = run(data)
        np.testing.assert_allclose(result['displacement']['removedTranslation'], [.1, .2, .3], atol=1e-14)
        self.assertAlmostEqual(result['decomposition']['amplitudes'][0], .03*math.sqrt(2))
        self.assertFalse(result['reconstruction']['translationRestored'])
        restored = run(dict(data, restore_translation=True))
        np.testing.assert_allclose([a['coordinates'] for a in restored['reconstruction']['atoms']],
                                   [a['coordinates'] for a in data['distorted']['atoms']], atol=1e-14)

    def test_pure_homogeneous_strain_has_no_internal_displacement(self):
        data = preset_data()
        data['distorted']['atoms'] = copy.deepcopy(data['parent']['atoms'])
        result = run(data)
        np.testing.assert_allclose(result['displacement']['internal'], 0)
        np.testing.assert_allclose(result['decomposition']['amplitudes'], 0)
        self.assertGreater(result['strain']['greenLagrange'][2][2], .01)

    def test_rigid_cell_rotation_is_not_strain(self):
        data = preset_data()
        angle = .7
        rotation = np.array([[math.cos(angle), -math.sin(angle), 0], [math.sin(angle), math.cos(angle), 0], [0, 0, 1]])
        data['distorted']['lattice'] = (np.array(data['parent']['lattice']) @ rotation.T).tolist()
        result = run(data)
        np.testing.assert_allclose(result['strain']['greenLagrange'], 0, atol=1e-14)
        np.testing.assert_allclose(result['strain']['rotation'], rotation, atol=1e-14)
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.22, .07], atol=1e-13)

    def test_nonorthogonal_mode_basis_needs_least_squares(self):
        root = math.sqrt(2)
        data = custom([[.1, .2, .3]], [[.1+.2/root, .2/root, 0]],
                      [[[1, 0, 0]], [[1, 1, 0]]])
        result = run(data)
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.1, .2], atol=1e-14)
        self.assertFalse(result['decomposition']['orthonormal'])
        self.assertLess(result['decomposition']['normalEquationResidual'], 1e-13)

    def test_rank_deficient_basis_warns_and_returns_minimum_norm(self):
        data = custom([[.1, .2, .3]], [[.3, 0, 0]], [[[1, 0, 0]], [[2, 0, 0]]])
        result = run(data)
        self.assertEqual(result['decomposition']['rank'], 1)
        self.assertFalse(result['decomposition']['fullColumnRank'])
        self.assertIsNone(result['decomposition']['conditionNumber'])
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.15, .15], atol=1e-14)
        self.assertTrue(any('不是唯一' in w for w in result['warnings']))

    def test_incomplete_mode_basis_reports_residual(self):
        data = custom([[.1, .2, .3]], [[.3, .4, 0]], [[[1, 0, 0]]])
        result = run(data)
        self.assertAlmostEqual(result['decomposition']['residualNorm'], .4)
        self.assertAlmostEqual(result['decomposition']['relativeResidual'], .8)
        np.testing.assert_allclose(result['decomposition']['residual'], [[0, .4, 0]], atol=1e-14)

    def test_independent_reconstruction_amplitudes_and_cell(self):
        result = run({'amplitudes': [0, 0], 'reconstruction_lattice': 'parent'})
        np.testing.assert_allclose(result['reconstruction']['lattice'], result['parent']['lattice'])
        np.testing.assert_allclose([a['coordinates'] for a in result['reconstruction']['atoms']],
                                   [a['coordinates'] for a in result['parent']['atoms']])
        np.testing.assert_allclose(result['decomposition']['amplitudes'], [.22, .07], atol=1e-14)

    def test_export_atom_order_and_roundtrip(self):
        from structure_bc import parse_poscar, parse_cif
        result = run()
        exports = result['reconstruction']['exports']
        for format in ('poscar', 'cif'):
            parsed = parse_poscar(exports[format]) if format == 'poscar' else parse_cif(exports[format])
            order = exports['poscarAtomOrder'] if format == 'poscar' else list(range(5))
            np.testing.assert_allclose(parsed['positions'],
                                       [result['reconstruction']['atoms'][i]['coordinates'] for i in order], atol=2e-12)
            self.assertEqual(parsed['species'], [result['reconstruction']['atoms'][i]['symbol'] for i in order])

    def test_left_handed_export_preserves_cartesian_structure(self):
        from structure_bc import parse_poscar
        data = preset_data()
        for name in ('parent', 'distorted'):
            data[name]['lattice'][0][0] *= -1
            for atom in data[name]['atoms']:
                atom['coordinates'][0] *= -1
        result = run(data)
        self.assertTrue(result['reconstruction']['exports']['basisHandednessCorrected'])
        parsed = parse_poscar(result['reconstruction']['exports']['poscar'])
        self.assertGreater(np.linalg.det(parsed['lattice']), 0)
        # Distances and chirality are preserved by changing basis and coordinate together.
        original = np.array(result['reconstruction']['lattice'])
        np.testing.assert_allclose(np.array(parsed['lattice']), np.diag([-1, 1, 1]) @ original, atol=1e-12)
        for i, atom in enumerate(result['reconstruction']['atoms']):
            j = result['reconstruction']['exports']['poscarAtomOrder'].index(i)
            delta = parsed['positions'][j] @ parsed['lattice'] - np.array(atom['coordinates']) @ original
            np.testing.assert_allclose(delta @ np.linalg.inv(original), np.rint(delta @ np.linalg.inv(original)), atol=1e-12)

    def test_input_validation_rejects_missing_or_unphysical_data(self):
        invalid = [dict(preset='unknown'), dict(preset='custom'), dict(amplitudes=[1]), dict(remove_translation='false'),
                   dict(landau={'b1': 0}), dict(landau={'resolution': 10}), dict(landau={'resolution': 21.5})]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)
        data = preset_data()
        for key, value in [('lengthUnit', 'bohr'), ('lattice', [[1, 0, 0]]*3)]:
            bad = copy.deepcopy(data)
            bad['parent'][key] = value
            with self.assertRaises(ValueError):
                run(bad)
        for mutation in ('species', 'occupancy', 'mapping', 'handedness', 'zero_mode'):
            bad = copy.deepcopy(data)
            if mutation == 'species': bad['distorted']['atoms'][0]['symbol'] = 'Sr'
            if mutation == 'occupancy': bad['parent']['atoms'][0]['occupancy'] = .5
            if mutation == 'mapping': bad['atom_mapping'] = [0, 0, 2, 3, 4]
            if mutation == 'handedness': bad['distorted']['lattice'][0][0] *= -1
            if mutation == 'zero_mode': bad['modes'][0]['vectors'] = np.zeros((5, 3)).tolist()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                run(bad)

    def test_json_output_contains_no_nan_or_numpy_objects(self):
        for preset in ('batio3', 'srtio3'):
            text = json.dumps(run({'preset': preset}), allow_nan=False, ensure_ascii=False)
            self.assertIn('distortion-lab', text)


class LandauTests(unittest.TestCase):
    def test_uncoupled_double_wells_have_four_exact_minima(self):
        result = landau_model({'a1': -2, 'a2': -8, 'b1': 1, 'b2': 1, 'c': 0, 'range': 3})
        self.assertEqual(len(result['stationaryPoints']), 9)
        self.assertEqual(len(result['globalMinima']), 4)
        for point in result['globalMinima']:
            self.assertAlmostEqual(abs(point['q1']), 1)
            self.assertAlmostEqual(abs(point['q2']), 2)
            self.assertEqual(point['kind'], 'minimum')
        self.assertAlmostEqual(result['globalMinimumEnergy'], -17)

    def test_mixed_solution_matches_closed_form(self):
        result = landau_model()
        minimum = result['globalMinima'][0]
        self.assertAlmostEqual(minimum['q1']**2, 1.65/3.75)
        self.assertAlmostEqual(minimum['q2']**2, .9/3.75)
        for point in result['stationaryPoints']:
            self.assertLess(point['gradientResidual'], 1e-12)
        self.assertEqual(sum(p['kind'] == 'saddle' for p in result['stationaryPoints']), 4)

    def test_competing_positive_coupling_is_bounded_with_axis_minima(self):
        result = landau_model({'a1': -1, 'a2': -1, 'c': 4})
        self.assertTrue(result['boundedness']['boundedBelow'])
        self.assertTrue(result['boundedness']['coercive'])
        self.assertEqual(len(result['globalMinima']), 4)
        self.assertTrue(all(p['branch'] in ('q1-axis', 'q2-axis') for p in result['globalMinima']))
        self.assertTrue(all(p['kind'] == 'saddle' for p in result['stationaryPoints'] if p['branch'] == 'mixed'))

    def test_ellipse_continuum_is_not_lost_at_singular_mixed_equation(self):
        result = landau_model({'a1': -2, 'a2': -4, 'b1': 1, 'b2': 4, 'c': 4})
        family = result['stationaryFamilies'][0]
        self.assertTrue(family['compact'])
        self.assertTrue(family['globalMinimum'])
        self.assertEqual(family['energy'], -1)
        for point in family['samples']:
            self.assertAlmostEqual(point['q1']**2+2*point['q2']**2, 1)

    def test_irrational_boundary_does_not_round_a_flat_minimum_into_saddle(self):
        result = landau_model({'a1': -1, 'a2': -math.sqrt(2), 'b1': 1, 'b2': 2, 'c': 2*math.sqrt(2)})
        self.assertEqual(len(result['stationaryFamilies']), 1)
        self.assertTrue(all(p['kind'] == 'minimum' for p in result['stationaryPoints'] if p['branch'] != 'origin'))

    def test_negative_coupling_below_threshold_is_unbounded(self):
        result = landau_model({'a1': 3, 'a2': 4, 'c': -3})
        self.assertFalse(result['boundedness']['boundedBelow'])
        self.assertIsNone(result['globalMinimumEnergy'])
        self.assertEqual(result['globalMinima'], [])
        self.assertTrue(any('有限绘图区' in w for w in result['warnings']))

    def test_negative_quartic_boundary_unbounded_or_coercive(self):
        unstable = landau_model({'a1': -1, 'a2': -1, 'c': -2})
        self.assertFalse(unstable['boundedness']['boundedBelow'])
        stable = landau_model({'a1': -1, 'a2': 2, 'c': -2})
        self.assertTrue(stable['boundedness']['coercive'])
        self.assertAlmostEqual(stable['globalMinimumEnergy'], -.25)
        self.assertEqual(len(stable['globalMinima']), 2)

    def test_noncompact_degenerate_global_valley_at_negative_boundary(self):
        result = landau_model({'a1': -2, 'a2': 2, 'c': -2})
        self.assertTrue(result['boundedness']['boundedBelow'])
        self.assertFalse(result['boundedness']['coercive'])
        family = result['stationaryFamilies'][0]
        self.assertFalse(family['compact'])
        self.assertAlmostEqual(result['globalMinimumEnergy'], -1)
        for point in family['samples']:
            self.assertAlmostEqual(point['q1']**2-point['q2']**2, 1)

    def test_near_boundary_not_misclassified_as_flat_or_unbounded(self):
        result = landau_model({'a1': -1, 'a2': -1, 'c': -2+1e-10})
        self.assertTrue(result['boundedness']['coercive'])
        self.assertTrue(result['boundedness']['boundedBelow'])
        self.assertFalse(result['boundedness']['quarticBoundary'])
        self.assertLess(result['globalMinimumEnergy'], -1e9)
        self.assertEqual(result['stationaryFamilies'], [])

    def test_near_boundary_quadratic_sign_is_not_rounded_away(self):
        result = landau_model({'a1': -1, 'a2': 1-1e-12, 'c': -2})
        self.assertFalse(result['boundedness']['boundedBelow'])
        self.assertEqual(result['stationaryFamilies'], [])

    def test_degenerate_axis_requires_fourth_order_analysis(self):
        minimum = landau_model({'a1': -2, 'a2': -1, 'c': 1})
        axis = [p for p in minimum['stationaryPoints'] if p['branch'] == 'q1-axis']
        self.assertTrue(all(p['kind'] == 'minimum' and p['degenerate'] for p in axis))
        saddle = landau_model({'a1': -2, 'a2': -3, 'c': 3})
        axis = [p for p in saddle['stationaryPoints'] if p['branch'] == 'q1-axis']
        self.assertTrue(all(p['kind'] == 'saddle' and p['degenerate'] for p in axis))

    def test_tiny_negative_soft_curvature_is_still_a_saddle(self):
        result = landau_model({'a1': -2, 'a2': -1-1e-12, 'c': 1})
        self.assertTrue(all(p['kind'] == 'saddle' for p in result['stationaryPoints'] if p['branch'] == 'q1-axis'))

    def test_quartic_origin_stability_and_zero_quadratic_terms(self):
        stable = landau_model({'a1': 0, 'a2': 0, 'c': 1})
        self.assertEqual(stable['stationaryPoints'][0]['kind'], 'minimum')
        self.assertTrue(stable['stationaryPoints'][0]['degenerate'])
        unstable = landau_model({'a1': 0, 'a2': 0, 'c': -3})
        self.assertEqual(unstable['stationaryPoints'][0]['kind'], 'saddle')

    def test_grid_and_selection_use_same_formula(self):
        result = landau_model({'a1': -2, 'b1': 3, 'a2': 4, 'b2': 5, 'c': -1, 'q1': .3, 'q2': -.4, 'resolution': 11})
        energy = lambda x, y: -2*x*x+3*x**4+4*y*y+5*y**4-x*x*y*y
        self.assertAlmostEqual(result['selection']['energy'], energy(.3, -.4))
        self.assertAlmostEqual(result['grid']['energy'][2][7], energy(result['grid']['q1'][7], result['grid']['q2'][2]))
        self.assertEqual(result['units']['orderParameter'], 'dimensionless reduced Q')

    def test_global_analytic_minimum_never_above_dense_grid(self):
        rng = np.random.default_rng(912)
        for _ in range(20):
            a1, a2 = rng.uniform(-3, 3, 2)
            b1, b2 = rng.uniform(.5, 2, 2)
            c = rng.uniform(-1, 4)
            result = landau_model(dict(a1=a1, a2=a2, b1=b1, b2=b2, c=c, range=3, resolution=81))
            self.assertTrue(result['boundedness']['boundedBelow'])
            self.assertLessEqual(result['globalMinimumEnergy'], np.min(result['grid']['energy'])+1e-10)


if __name__ == '__main__':
    unittest.main()
