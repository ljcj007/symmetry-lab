"""Landau analytic limits, geometric stabilizers and invalid input checks."""
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from phase_domains import run


def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def key(matrix):
    return tuple(tuple(row) for row in matrix)


class PhaseDomainsTests(unittest.TestCase):
    def test_quartic_exact_double_well(self):
        result = run({'a': -1, 'b': 1, 'c': 0, 'h': 0})
        roots = result['landau']['stationary']
        for root, expected in zip(roots, (-1 / math.sqrt(2), 0, 1 / math.sqrt(2))):
            self.assertAlmostEqual(root['q'], expected)
            self.assertAlmostEqual(root['derivativeResidual'], 0)
        self.assertEqual([p['kind'] for p in roots], ['minimum', 'maximum', 'minimum'])
        self.assertEqual(len(result['landau']['globalMinima']), 2)
        self.assertAlmostEqual(result['landau']['globalMinimumEnergy'], -0.25)

    def test_sextic_first_order_coexistence(self):
        # F = Q²(Q² - 1/2)² has exactly three degenerate global minima.
        result = run({'a': 0.25, 'b': -1, 'c': 1, 'h': 0})['landau']
        self.assertEqual(len(result['stationary']), 5)
        self.assertEqual(len(result['globalMinima']), 3)
        self.assertAlmostEqual(result['globalMinimumEnergy'], 0)
        for root, expected in zip(result['globalMinima'], (-math.sqrt(0.5), 0, math.sqrt(0.5))):
            self.assertAlmostEqual(root['q'], expected)

    def test_field_lifts_sign_degeneracy(self):
        positive = run({'a': -1, 'b': 1, 'h': 0.2})['landau']
        negative = run({'a': -1, 'b': 1, 'h': -0.2})['landau']
        self.assertEqual(len(positive['stationary']), 3)
        self.assertEqual(len(positive['globalMinima']), 1)
        self.assertGreater(positive['globalMinima'][0]['q'], 0)
        self.assertAlmostEqual(positive['globalMinima'][0]['q'], -negative['globalMinima'][0]['q'])
        for root in positive['stationary']:
            q = root['q']
            self.assertAlmostEqual(4 * q ** 3 - 2 * q - 0.2, 0, places=10)

    def test_small_nonzero_energy_scale_is_not_flat(self):
        small_quadratic = run({'a': 1e-10, 'b': 0})['landau']
        self.assertEqual(small_quadratic['stationary'][0]['kind'], 'minimum')
        self.assertEqual(len(small_quadratic['globalMinima']), 1)
        weak_field = run({'a': -1, 'b': 1, 'h': 1e-10})['landau']
        self.assertEqual(len(weak_field['globalMinima']), 1)
        self.assertGreater(weak_field['globalMinima'][0]['q'], 0)

    def test_shallow_double_well_still_has_unstable_origin(self):
        result = run({'a': -1e-10, 'b': 1})['landau']
        self.assertEqual([p['kind'] for p in result['stationary']], ['minimum', 'maximum', 'minimum'])
        self.assertEqual(len(result['globalMinima']), 2)
        self.assertAlmostEqual(result['globalMinima'][1]['q'], math.sqrt(5e-11), places=14)

    def test_exact_spinodal_double_root_is_stationary_inflection(self):
        # F' = 4(Q+2)(Q-1)^2. At Q=1, F''=0 and F'''=24>0.
        result = run({'a': -6, 'b': 1, 'h': -8})['landau']
        self.assertEqual(len(result['stationary']), 2)
        self.assertEqual([p['q'] for p in result['stationary']], [-2, 1])
        root = result['stationary'][1]
        self.assertEqual(root['kind'], 'stationary_inflection')
        self.assertEqual(root['stationaryMultiplicity'], 2)
        self.assertEqual(root['firstNonzeroDerivativeOrder'], 3)
        self.assertEqual(root['curvature'], 0)

    def test_zero_field_sextic_spinodal_keeps_double_roots(self):
        # F' = 6Q(Q²-1)² has double roots at ±1 and a simple minimum at 0.
        result = run({'a': 3, 'b': -3, 'c': 1})['landau']
        self.assertEqual([p['q'] for p in result['stationary']], [-1, 0, 1])
        self.assertEqual([p['stationaryMultiplicity'] for p in result['stationary']], [2, 1, 2])
        self.assertEqual([p['kind'] for p in result['stationary']], ['stationary_inflection', 'minimum', 'stationary_inflection'])

    def test_critical_higher_derivatives(self):
        for args, order in [({'a': 0, 'b': 1, 'c': 0}, 4), ({'a': 0, 'b': 0, 'c': 1}, 6)]:
            root = run(args)['landau']['stationary'][0]
            self.assertEqual(root['kind'], 'minimum')
            self.assertEqual(root['firstNonzeroDerivativeOrder'], order)
            self.assertTrue(root['isGlobalMinimum'])

    def test_unbounded_and_flat_are_not_fabricated_equilibria(self):
        for args in ({'a': 1, 'b': -1}, {'a': 0, 'b': 0, 'c': 0, 'h': 1}, {'c': -1}):
            result = run(args)['landau']
            self.assertFalse(result['boundedBelow'])
            self.assertIsNone(result['globalMinimumEnergy'])
            self.assertEqual(result['globalMinima'], [])
        flat = run({'a': 0, 'b': 0, 'c': 0, 'h': 0})['landau']
        self.assertTrue(flat['boundedBelow'])
        self.assertTrue(flat['flat'])
        self.assertEqual(flat['globalMinimumSet'], 'all_real_Q')

    def test_global_minima_not_limited_by_plot_window(self):
        result = run({'a': -8, 'b': 1, 'qMax': 0.1})['landau']
        self.assertEqual(result['stationaryOutsidePlot'], 2)
        self.assertAlmostEqual(result['globalMinima'][1]['q'], 2)
        self.assertAlmostEqual(result['globalMinimumEnergy'], -16)

    def test_all_axes_and_signs_have_expected_orbit_stabilizer(self):
        for axis in 'xyz':
            for q in (-1, 0.01, 1):
                result = run({'q': q, 'axis': axis})
                symmetry = result['symmetry']
                self.assertEqual((symmetry['parentOrder'], symmetry['retainedOrder'], symmetry['lostOrder']), (48, 8, 40))
                self.assertEqual(symmetry['domainCount'], 6)
                transformed = {tuple(op['transformedDirection']) for op in symmetry['operations']}
                domains = {tuple(domain['direction']) for domain in symmetry['domains']}
                self.assertEqual(transformed, domains)
        zero = run({'q': 0})
        self.assertEqual(zero['symmetry']['retainedOrder'], 48)
        self.assertEqual(zero['symmetry']['domainCount'], 1)

    def test_retained_operations_map_species_and_positions(self):
        result = run({'q': 0.8, 'axis': 'x'})
        atoms = result['structure']['atoms']
        for op in result['operations']:
            compatible = True
            for atom in atoms:
                transformed = [sum(op['rotation'][i][j] * atom['fractional'][j] for j in range(3)) for i in range(3)]
                matches = [other for other in atoms if other['species'] == atom['species'] and
                           all(abs((transformed[i] - other['fractional'][i]) - round(transformed[i] - other['fractional'][i])) < 1e-10 for i in range(3))]
                compatible = compatible and bool(matches)
            self.assertEqual(op['retained'], compatible)

    def test_parent_and_stabilizer_are_closed_groups(self):
        operations = run({'q': 1})['operations']
        for chosen in (operations, [op for op in operations if op['retained']]):
            lookup = {key(op['rotation']) for op in chosen}
            self.assertEqual(len(lookup), len(chosen))
            for left in chosen:
                self.assertIn(left['determinant'], (-1, 1))
                for right in chosen:
                    self.assertIn(key(mm(left['rotation'], right['rotation'])), lookup)

    def test_json_and_selected_model_coordinates(self):
        result = run({'Q': -2, 'axis': 'y', 'displacementScale': 0.1, 'latticeConstant': 4})
        self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)
        ti = next(atom for atom in result['structure']['atoms'] if atom['species'] == 'Ti')
        self.assertEqual(ti['fractional'], [0.5, 0.3, 0.5])
        self.assertEqual(ti['cartesian'], [2, 1.2, 2])

    def test_invalid_inputs(self):
        invalid = [[], {'a': float('nan')}, {'b': float('inf')}, {'c': True}, {'a': 1e-12},
                   {'q': 4}, {'axis': 'a'}, {'axis': []}, {'samples': 31}, {'samples': 51.0},
                   {'displacementScale': 0}, {'qMax': 100}, {'latticeConstant': 0}]
        for args in invalid:
            with self.subTest(args=args), self.assertRaises(ValueError):
                run(args)


if __name__ == '__main__':
    unittest.main()
