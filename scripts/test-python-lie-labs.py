"""Independent group identities and boundary checks for Lie classroom APIs."""
import cmath
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import lie_labs as labs


def z(value):
    return complex(value['re'], value['im'])


def matrix(value):
    return [[z(x) for x in row] for row in value]


def multiply(left, right):
    return [[sum(left[i][k] * right[k][j] for k in range(len(right)))
             for j in range(len(right))] for i in range(len(left))]


def commutator(left, right):
    ab, ba = multiply(left, right), multiply(right, left)
    return [[a - b for a, b in zip(x, y)] for x, y in zip(ab, ba)]


def identity(n, scalar=1):
    return [[scalar if i == j else 0 for j in range(n)] for i in range(n)]


def rotate(group, **options):
    return labs.run({'lab': 'lie', 'experiment': group, **options})


def bracket(group, a, b):
    return labs.run({'lab': 'lie', 'experiment': 'commutator', 'group': group, 'a': a, 'b': b})


class LieLabsTests(unittest.TestCase):
    def assert_vector(self, actual, expected, places=11):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assertAlmostEqual(a, b, places=places)

    def assert_matrix(self, actual, expected, places=11):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assert_vector(a, b, places)

    def test_su2_bloch_orientation_and_complex_conjugation(self):
        cases = [
            ('x', 'up', [0, -1, 0]),
            ('y', 'up', [1, 0, 0]),
            ('z', 'plus', [0, 1, 0]),
        ]
        for axis, state, expected in cases:
            result = rotate('su2', axis=axis, angle=math.pi / 2, state=state)
            self.assert_vector(result['blochVector'], expected)
            self.assertAlmostEqual(sum(x * x for x in result['blochVector']), 1)
        state = rotate('su2', axis='y', angle=math.pi / 2)['state']
        self.assert_vector([z(x) for x in state], [1 / math.sqrt(2)] * 2)

    def test_su2_double_cover_retains_global_sign(self):
        for axis in 'xyz':
            for state in ('up', 'plus'):
                start = rotate('su2', axis=axis, state=state, angle=0)
                half = rotate('su2', axis=axis, state=state, angle=2 * math.pi)
                full = rotate('su2', axis=axis, state=state, angle=4 * math.pi)
                self.assert_matrix(matrix(half['matrix']), identity(2, -1))
                self.assert_matrix(matrix(full['matrix']), identity(2))
                self.assert_vector(half['blochVector'], start['blochVector'])
                self.assertAlmostEqual(z(half['overlap']), -1)
                self.assertAlmostEqual(z(full['overlap']), 1)
                self.assertEqual(half['period'], 4 * math.pi)

    def test_all_generator_normalization_and_hermiticity(self):
        for group, count, dim in [('su2', 3, 2), ('su3', 8, 3)]:
            generators = [matrix(bracket(group, i, i)['generatorA']) for i in range(1, count + 1)]
            for i, a in enumerate(generators):
                self.assertAlmostEqual(sum(a[k][k] for k in range(dim)), 0)
                self.assert_matrix(a, [[a[c][r].conjugate() for c in range(dim)] for r in range(dim)])
                for j, b in enumerate(generators):
                    product = multiply(a, b)
                    self.assertAlmostEqual(sum(product[k][k] for k in range(dim)), 0.5 if i == j else 0)

    def test_all_commutators_against_independent_structure_constants(self):
        tables = {
            'su2': {(1, 2, 3): 1},
            'su3': {(1, 2, 3): 1, (1, 4, 7): 0.5, (1, 5, 6): -0.5,
                    (2, 4, 6): 0.5, (2, 5, 7): 0.5, (3, 4, 5): 0.5,
                    (3, 6, 7): -0.5, (4, 5, 8): math.sqrt(3) / 2,
                    (6, 7, 8): math.sqrt(3) / 2},
        }
        for group, entries in tables.items():
            count = 3 if group == 'su2' else 8
            full = {}
            for triple, value in entries.items():
                for perm in itertools.permutations(triple):
                    inversions = sum(perm[i] > perm[j] for i in range(3) for j in range(i + 1, 3))
                    full[perm] = value * (-1) ** inversions
            for a in range(1, count + 1):
                for b in range(1, count + 1):
                    result = bracket(group, a, b)
                    self.assert_vector(result['coefficients'], [full.get((a, b, c), 0) for c in range(1, count + 1)])
                    self.assertTrue(all(x < 1e-13 for x in result['residuals'].values()))
                    self.assertEqual(len(result['nonzeroTerms']), sum(abs(x) > 1e-12 for x in result['coefficients']))
                    if a == b:
                        self.assertEqual(result['commutatorNorm'], 0)
                        self.assertTrue(result['expansion'].endswith('= 0'))

    def test_su3_embedded_two_state_rotations_and_spectators(self):
        # Active pairs for six off-diagonal matrices. At pi the selected
        # basis state is transferred completely; the third state is fixed.
        for generator, first, second, amplitude in [(1, 1, 2, -1j), (2, 1, 2, 1),
                                                   (4, 1, 3, -1j), (5, 1, 3, 1),
                                                   (6, 2, 3, -1j), (7, 2, 3, 1)]:
            result = rotate('su3', generator=generator, state=first, angle=math.pi)
            self.assert_vector([z(x) for x in result['state']], [amplitude if i == second else 0 for i in (1, 2, 3)])
            third = ({1, 2, 3} - {first, second}).pop()
            spectator = rotate('su3', generator=generator, state=third, angle=2.75)
            self.assert_vector([z(x) for x in spectator['state']], [int(i == third) for i in (1, 2, 3)])
        diagonal = rotate('su3', generator=3, angle=math.pi)
        self.assert_matrix(matrix(diagonal['matrix']), [[-1j, 0, 0], [0, 1j, 0], [0, 0, 1]])

    def test_su3_lambda8_distinct_period_and_nontrivial_center(self):
        period = 4 * math.pi * math.sqrt(3)
        central = rotate('su3', generator=8, angle=period / 3)
        self.assert_matrix(matrix(central['matrix']), identity(3, cmath.exp(-2j * math.pi / 3)))
        self.assert_matrix(matrix(rotate('su3', generator=8, angle=period)['matrix']), identity(3))
        self.assertAlmostEqual(central['period'], period)
        not_identity = matrix(rotate('su3', generator=8, angle=4 * math.pi)['matrix'])
        self.assertGreater(abs(not_identity[0][0] - 1), 0.1)
        embedded = matrix(rotate('su3', generator=1, angle=2 * math.pi)['matrix'])
        self.assert_matrix(embedded, [[-1, 0, 0], [0, -1, 0], [0, 0, 1]])

    def test_probabilities_unitarity_determinant_and_json_are_finite(self):
        for group, count, states in [('su2', 3, ('up', 'plus')), ('su3', 8, (1, 2, 3))]:
            for generator in range(1, count + 1):
                for state in states:
                    for angle in (-8 * math.pi, -5.43, 0, 0.321, 8 * math.pi):
                        options = {'axis': 'xyz'[generator - 1]} if group == 'su2' else {'generator': generator}
                        result = rotate(group, angle=angle, state=state, **options)
                        self.assertAlmostEqual(sum(result['probabilities']), 1)
                        self.assertTrue(all(p >= 0 for p in result['probabilities']))
                        self.assertAlmostEqual(result['stateNorm'], 1)
                        self.assertTrue(all(x < 1e-13 for x in result['residuals'].values()))
                        self.assertAlmostEqual(z(result['determinant']), 1)
                        json.dumps(result, allow_nan=False)

    def test_one_parameter_group_law_and_inverse(self):
        for group, count in [('su2', 3), ('su3', 8)]:
            for generator in range(1, count + 1):
                options = {'axis': 'xyz'[generator - 1]} if group == 'su2' else {'generator': generator}
                a = matrix(rotate(group, angle=2.134, **options)['matrix'])
                b = matrix(rotate(group, angle=-0.817, **options)['matrix'])
                ab = matrix(rotate(group, angle=2.134 - 0.817, **options)['matrix'])
                inverse = matrix(rotate(group, angle=-2.134, **options)['matrix'])
                self.assert_matrix(multiply(a, b), ab)
                self.assert_matrix(multiply(a, inverse), identity(len(a)))

    def test_su3_cartan_weights_and_expectation_are_distinct_concepts(self):
        result = rotate('su3', generator=1, state=1, angle=math.pi / 2)
        weights = result['cartanWeights']
        self.assert_vector(weights[0]['weight'], [0.5, 1 / (2 * math.sqrt(3))])
        self.assert_vector(weights[1]['weight'], [-0.5, 1 / (2 * math.sqrt(3))])
        self.assert_vector(weights[2]['weight'], [0, -1 / math.sqrt(3)])
        self.assert_vector(result['cartanExpectation'], [0, 1 / (2 * math.sqrt(3))])
        self.assertNotIn(result['cartanExpectation'], [entry['weight'] for entry in weights])
        self.assertEqual(bracket('su3', 3, 8)['commutatorNorm'], 0)

    def test_infinitesimal_generator_has_the_declared_sign_and_half_factor(self):
        delta = 1e-5
        for group, count in [('su2', 3), ('su3', 8)]:
            for generator in range(1, count + 1):
                options = {'axis': 'xyz'[generator - 1]} if group == 'su2' else {'generator': generator}
                plus = rotate(group, angle=delta, **options)
                minus = rotate(group, angle=-delta, **options)
                a, b, t = matrix(plus['matrix']), matrix(minus['matrix']), matrix(plus['generatorMatrix'])
                derivative = [[(x - y) / (2 * delta) for x, y in zip(rowa, rowb)] for rowa, rowb in zip(a, b)]
                self.assert_matrix(derivative, [[-1j * x for x in row] for row in t], places=9)

    def test_hostile_invalid_and_oversized_inputs_are_rejected(self):
        bad = [None, [], 'lie', {}, {'lab': 'spinor'}, {'lab': 'lie', 'experiment': 'x' * 100000},
               {'lab': 'lie', 'axis': []}, {'lab': 'lie', 'axis': 'x' * 100000},
               {'lab': 'lie', 'state': {'nested': [1] * 10000}},
               {'lab': 'lie', 'unexpected': 'x' * 1000000},
               {'lab': 'lie', **{str(i): i for i in range(100)}}]
        for value in (True, False, None, '0', [], {}, float('nan'), float('inf'), -float('inf'), 10 ** 1000, 8 * math.pi + 1e-8):
            bad.append({'lab': 'lie', 'angle': value})
        for value in (True, 0, 9, 1.0, '1', [], None):
            bad.append({'lab': 'lie', 'experiment': 'su3', 'generator': value})
            bad.append({'lab': 'lie', 'experiment': 'commutator', 'a': value})
        for value in (True, 0, 4, 1.0, '1', [], None):
            bad.append({'lab': 'lie', 'experiment': 'su3', 'state': value})
        for payload in bad:
            with self.assertRaises(ValueError):
                labs.run(payload)
        self.assertEqual(rotate('su2')['angle'], 0)
        self.assertEqual(rotate('su3')['generator'], 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
