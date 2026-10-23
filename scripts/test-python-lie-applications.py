"""Physics identities and independent oracles for the Lie applications labs."""
import cmath
from collections import Counter
from fractions import Fraction
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

from sympy import Rational
from sympy.physics.wigner import clebsch_gordan

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import lie_applications as labs


def run(experiment, **options):
    return labs.run({'lab': 'lie', 'experiment': experiment, **options})


def z(entry):
    return complex(entry['re'], entry['im'])


def matrix(entries):
    return [[z(entry) for entry in row] for row in entries]


def multiply(left, right):
    return [[sum(a * b for a, b in zip(row, column)) for column in zip(*right)] for row in left]


def weight_counter(rows):
    return Counter({tuple(row['dynkin']): row['multiplicity'] for row in rows})


def det_permutations(rows):
    result = 0j
    for permutation in itertools.permutations(range(3)):
        inversions = sum(permutation[i] > permutation[j] for i in range(3) for j in range(i + 1, 3))
        result += (-1) ** inversions * math.prod(rows[i][permutation[i]] for i in range(3))
    return result


def schur_character(p, q, alpha, beta):
    """Weyl determinant independent of the module's integer GT enumeration."""
    eigenvalues = [cmath.exp(1j * phase) for phase in (alpha, beta, -alpha - beta)]
    partition = (p + q, q, 0)
    numerator = [[x ** (partition[j] + 2 - j) for j in range(3)] for x in eigenvalues]
    denominator = [[x ** (2 - j) for j in range(3)] for x in eigenvalues]
    return det_permutations(numerator) / det_permutations(denominator)


class LieApplicationTests(unittest.TestCase):
    def assert_close(self, actual, expected, tolerance=2e-11):
        self.assertLessEqual(abs(actual - expected), tolerance)

    def assert_vector(self, actual, expected, tolerance=2e-11):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assert_close(a, b, tolerance)

    def assert_checks(self, result, tolerance=2e-10):
        for name, residual in result['checks'].items():
            with self.subTest(check=name):
                self.assertIsInstance(residual, (float, int))
                self.assertGreaterEqual(residual, 0)
                self.assertLess(residual, tolerance)

    def test_resonant_pi_pulse_and_detuning_envelope(self):
        pulse = run('rabi', omega=2, delta=0, time=math.pi / 2)
        self.assert_close(pulse['transitionProbability'], 1)
        self.assert_vector(pulse['blochVector'], [0, 0, -1])
        self.assert_vector([z(v) for v in pulse['state']], [0, -1j])
        self.assert_close(pulse['periodProbability'], math.pi)
        detuned = run('rabi', omega=3, delta=4, time=math.pi / 5)
        self.assert_close(detuned['omegaEffective'], 5)
        self.assert_close(detuned['transitionProbability'], 9 / 25)
        self.assert_close(detuned['maxTransitionProbability'], 9 / 25)
        opposite = run('rabi', omega=3, delta=-4, time=math.pi / 5)
        self.assert_close(opposite['transitionProbability'], detuned['transitionProbability'])
        self.assert_close(opposite['blochVector'][0], -detuned['blochVector'][0])
        for item in (pulse, detuned, opposite):
            self.assert_checks(item)

    def test_zero_field_zero_time_and_long_trajectory(self):
        for options in ({'omega': 0, 'delta': 0, 'time': 20},
                        {'omega': 0, 'delta': 7, 'time': 10},
                        {'omega': 10, 'delta': -10, 'time': 0}):
            result = run('rabi', **options)
            self.assert_close(result['transitionProbability'], 0)
            self.assert_vector(result['blochVector'], [0, 0, 1])
            self.assert_checks(result)
            if options['time'] == 0:
                self.assertEqual(len(result['trajectory']), 1)
            else:
                self.assertGreaterEqual(len(result['trajectory']), 241)
        self.assertIsNone(run('rabi', omega=0, delta=0)['periodProbability'])
        self.assertIsNone(run('rabi', omega=0, delta=7)['periodProbability'])
        self.assertIsNone(run('rabi', omega=1e-320, delta=0)['periodProbability'])
        json.dumps(run('rabi', omega=1e-320, delta=0), allow_nan=False)
        result = run('rabi', omega=10, delta=10, time=20)
        self.assert_close(result['trajectory'][-1]['time'], 20)
        self.assert_close(result['trajectory'][-1]['probability'], result['transitionProbability'])
        phase_step = result['omegaEffective'] * result['time'] / (len(result['trajectory']) - 1)
        self.assertLessEqual(phase_step, 2 * math.pi / 32)
        for point in result['trajectory']:
            self.assert_close(sum(x * x for x in point['blochVector']), 1)
            self.assertTrue(-1e-14 <= point['probability'] <= result['maxTransitionProbability'] + 1e-14)
        # Output must be valid JSON even at all numerical degeneracies.
        json.dumps(result, allow_nan=False)

    def test_rabi_satisfies_schrodinger_equation_and_group_composition(self):
        omega, delta, time, step = 1.7, -0.9, 0.73, 1e-6
        plus = [z(x) for x in run('rabi', omega=omega, delta=delta, time=time + step)['state']]
        minus = [z(x) for x in run('rabi', omega=omega, delta=delta, time=time - step)['state']]
        state = [z(x) for x in run('rabi', omega=omega, delta=delta, time=time)['state']]
        derivative = [(x - y) / (2 * step) for x, y in zip(plus, minus)]
        expected = [-1j * (delta * state[0] + omega * state[1]) / 2,
                    -1j * (omega * state[0] - delta * state[1]) / 2]
        self.assert_vector(derivative, expected, 2e-9)
        u = matrix(run('rabi', omega=omega, delta=delta, time=time)['matrix'])
        v = matrix(run('rabi', omega=omega, delta=delta, time=1.19)['matrix'])
        total = matrix(run('rabi', omega=omega, delta=delta, time=time + 1.19)['matrix'])
        for actual, correct in zip(multiply(u, v), total):
            self.assert_vector(actual, correct)

    def test_spin_half_singlet_triplet_signs_and_exchange(self):
        result = run('su2_coupling')
        self.assertEqual(result['dimension'], 4)
        self.assertEqual([x['twoJ'] for x in result['decomposition']], [2, 0])
        self.assert_vector([x['energy'] for x in result['decomposition']], [0.25, -0.75])
        triplet, singlet = result['selected']['expansion']
        self.assert_vector([triplet['coefficient'], singlet['coefficient']], [1 / math.sqrt(2)] * 2)
        self.assert_vector([x['coefficient'] for x in triplet['terms']], [1 / math.sqrt(2)] * 2)
        self.assert_vector([x['coefficient'] for x in singlet['terms']], [1 / math.sqrt(2), -1 / math.sqrt(2)])
        self.assertEqual([x['probabilityExact'] for x in result['selected']['expansion']], ['1/2', '1/2'])
        flipped = run('su2_coupling', twoM1=-1, twoM2=1, coupling=-2)
        self.assert_vector([x['energy'] for x in flipped['decomposition']], [-0.5, 1.5])
        self.assert_close(flipped['selected']['expansion'][1]['coefficient'], -1 / math.sqrt(2))
        polarized = run('su2_coupling', twoM1=1, twoM2=1)
        self.assertEqual(len(polarized['selected']['expansion']), 1)
        self.assertEqual(polarized['selected']['expansion'][0]['probability'], 1)
        self.assert_checks(result)

    def test_all_clebsch_gordan_coefficients_against_independent_sympy(self):
        # SymPy is only the native-test oracle. The browser module imports
        # standard-library modules exclusively.
        checked = 0
        for j1, j2 in itertools.product(range(7), repeat=2):
            for m1 in range(-j1, j1 + 1, 2):
                for m2 in range(-j2, j2 + 1, 2):
                    for j in range(abs(j1 - j2), j1 + j2 + 1, 2):
                        coefficient, exact_square = labs._cg(j1, m1, j2, m2, j)
                        expected = clebsch_gordan(Rational(j1, 2), Rational(j2, 2), Rational(j, 2),
                                                 Rational(m1, 2), Rational(m2, 2), Rational(m1 + m2, 2))
                        self.assert_close(coefficient, float(expected), 5e-14)
                        self.assertEqual(Rational(exact_square.numerator, exact_square.denominator), expected ** 2)
                        checked += 1
        self.assertGreater(checked, 2500)

    def test_full_coupled_bases_at_every_supported_spin_pair(self):
        for j1, j2 in itertools.product(range(7), repeat=2):
            result = run('su2_coupling', twoJ1=j1, twoJ2=j2)
            self.assert_checks(result)
            self.assertEqual(sum(row['dimension'] for row in result['decomposition']), (j1 + 1) * (j2 + 1))
            self.assertEqual(sum(Fraction(row['probabilityExact']) for row in result['selected']['expansion']), 1)
            self.assertEqual(result['decomposition'][0]['twoJ'], j1 + j2)
            self.assertEqual(result['decomposition'][-1]['twoJ'], abs(j1 - j2))
            for component in result['selected']['expansion']:
                self.assertEqual(sum(Fraction(term['probabilityExact']) for term in component['terms']), 1)
        scalar = run('su2_coupling', twoJ1=0, twoJ2=0)
        self.assertEqual(scalar['selected']['expansion'][0]['coefficient'], 1)
        self.assertEqual(scalar['decomposition'][0]['energy'], 0)

    def test_su3_fundamental_adjoint_weights_and_casimirs(self):
        result = run('su3_tensor')
        fundamental, antifundamental = result['factors']
        self.assertEqual(weight_counter(fundamental['weights']), Counter({(1, 0): 1, (-1, 1): 1, (0, -1): 1}))
        self.assertEqual(weight_counter(antifundamental['weights']), Counter({(-a, -b): n for (a, b), n in weight_counter(fundamental['weights']).items()}))
        adjoint = next(row for row in result['decomposition'] if (row['p'], row['q']) == (1, 1))
        self.assertEqual(weight_counter(adjoint['weights']), Counter({(2, -1): 1, (-1, 2): 1, (1, 1): 1,
                                                                    (-2, 1): 1, (1, -2): 1, (-1, -1): 1, (0, 0): 2}))
        self.assert_close(fundamental['casimir'], 4 / 3)
        self.assertEqual(adjoint['casimir'], 3)
        for row in fundamental['weights']:
            a, b = row['dynkin']
            self.assert_vector(row['cartan'], [a / 2, (a + 2 * b) / (2 * math.sqrt(3))])
        self.assert_checks(result)

    def test_known_su3_tensor_products_with_outer_multiplicity(self):
        cases = [((1, 0, 1, 0), {(2, 0): 1, (0, 1): 1}),
                 ((1, 0, 0, 1), {(1, 1): 1, (0, 0): 1}),
                 ((1, 1, 1, 1), {(2, 2): 1, (3, 0): 1, (0, 3): 1, (1, 1): 2, (0, 0): 1}),
                 ((2, 0, 1, 0), {(3, 0): 1, (1, 1): 1}),
                 ((0, 0, 2, 2), {(2, 2): 1})]
        for (p1, q1, p2, q2), expected in cases:
            result = run('su3_tensor', p1=p1, q1=q1, p2=p2, q2=q2)
            self.assertEqual({(r['p'], r['q']): r['multiplicity'] for r in result['decomposition']}, expected)
            self.assert_checks(result)
            self.assertEqual(result['steps'][-1]['remainingDimension'], 0)
            remaining = result['dimension']
            for step, component in zip(result['steps'], result['decomposition']):
                remaining -= component['multiplicity'] * component['dimension']
                self.assertEqual(step['remainingDimension'], remaining)
            json.dumps(result, allow_nan=False)

    def test_every_supported_su3_product_against_weyl_characters(self):
        irreps = [(p, q) for p in range(5) for q in range(5 - p)]
        alpha, beta = 0.47, -1.23
        characters = {label: schur_character(*label, alpha, beta) for label in irreps}
        for p, q in irreps:
            # Convert Dynkin weights to the trace-zero diagonal angle basis:
            # content differences give a*alpha + b*(alpha+beta).
            from_weights = sum(count * cmath.exp(1j * (a * alpha + b * (alpha + beta)))
                               for (a, b), count in labs._weight_items(p, q))
            self.assert_close(from_weights, characters[(p, q)], 2e-10)
        for first, second in itertools.product(irreps, repeat=2):
            result = run('su3_tensor', p1=first[0], q1=first[1], p2=second[0], q2=second[1])
            self.assert_checks(result)
            reduced = sum(row['multiplicity'] * schur_character(row['p'], row['q'], alpha, beta) for row in result['decomposition'])
            self.assert_close(characters[first] * characters[second], reduced, 2e-10)
            self.assertEqual(sum(row['multiplicity'] for row in result['tensorWeights']), result['dimension'])
            self.assertLessEqual(result['dimension'], 729)

    def test_su3_conjugation_and_character_multiplication_are_not_dimension_only(self):
        first = run('su3_tensor', p1=3, q1=0, p2=0, q2=2)
        conjugate = run('su3_tensor', p1=0, q1=3, p2=2, q2=0)
        self.assertEqual({(r['p'], r['q']): r['multiplicity'] for r in first['decomposition']},
                         {(r['q'], r['p']): r['multiplicity'] for r in conjugate['decomposition']})
        self.assertNotEqual(first['decompositionText'], conjugate['decompositionText'])
        weights = weight_counter(first['tensorWeights'])
        self.assertEqual(weight_counter(conjugate['tensorWeights']), Counter({(-a, -b): n for (a, b), n in weights.items()}))

    def test_invalid_inputs_and_resource_bounds(self):
        for bad in (None, [], 'rabi', 3):
            with self.assertRaises(ValueError):
                labs.run(bad)
        for bad in ('unknown', None, [], {'bad': 1}):
            with self.assertRaises(ValueError):
                run(bad)
        for experiment in ('rabi', 'su2_coupling', 'su3_tensor'):
            for options in ({'extra': 1}, {'lab': 'crystal'}, {'lab': None},
                            {str(index): index for index in range(10)}):
                with self.assertRaises(ValueError):
                    run(experiment, **options)
        with self.assertRaises(ValueError):
            labs.run({'experiment': 'rabi'})
        # The public parent dispatcher must not drop unknown keys before
        # delegating the new experiments.
        import lie_labs
        with self.assertRaises(ValueError):
            lie_labs.run({'lab': 'lie', 'experiment': 'rabi', 'omeag': 2})
        for key in ('omega', 'delta', 'time'):
            for bad in (True, False, None, '1', math.inf, -math.inf, math.nan, 10 ** 1000):
                with self.assertRaises(ValueError):
                    run('rabi', **{key: bad})
        for options in ({'omega': -1}, {'delta': 11}, {'time': -0.01}, {'time': 21}):
            with self.assertRaises(ValueError):
                run('rabi', **options)
        for options in ({'twoJ1': True}, {'twoJ2': 1.0}, {'twoJ1': 7}, {'twoJ2': -1},
                        {'twoM1': 0}, {'twoM2': 2}, {'twoM1': False}, {'coupling': math.nan},
                        {'coupling': True}, {'coupling': -11}):
            with self.assertRaises(ValueError):
                run('su2_coupling', **options)
        for options in ({'p1': True}, {'q1': 1.0}, {'p2': -1}, {'q2': 5},
                        {'p1': 3, 'q1': 2}, {'p2': 4, 'q2': 1}, {'q1': None}):
            with self.assertRaises(ValueError):
                run('su3_tensor', **options)


if __name__ == '__main__':
    unittest.main(verbosity=2)
