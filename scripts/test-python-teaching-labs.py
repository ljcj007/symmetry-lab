"""Independent algebraic and boundary-case checks for the teaching experiments."""
import cmath
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import teaching_labs as labs


def z(value):
    return complex(value['re'], value['im'])


def mat(value):
    return [[z(x) for x in row] for row in value]


def product(left, right):
    return [[sum(a * b for a, b in zip(row, column)) for column in zip(*right)] for row in left]


def apply(matrix, vector):
    return [sum(a * b for a, b in zip(row, vector)) for row in matrix]


def adjoint(matrix):
    return [[x.conjugate() for x in column] for column in zip(*matrix)]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


class TeachingLabsTests(unittest.TestCase):
    def assert_vector(self, actual, expected, places=11):
        self.assertEqual(len(actual), len(expected))
        for left, right in zip(actual, expected):
            self.assertAlmostEqual(left, right, places=places)

    def assert_matrix(self, actual, expected):
        self.assertEqual(len(actual), len(expected))
        for left, right in zip(actual, expected):
            self.assert_vector(left, right)

    def test_seitz_trajectories_and_unwrapped_translations(self):
        # Component formulae independently express each geometric operation.
        operations = {
            'translation': lambda p: [p[0], p[1], p[2] + 1],
            'screw21': lambda p: [-p[0], -p[1], p[2] + 0.5],
            'screw41': lambda p: [-p[1], p[0], p[2] + 0.25],
            'glide': lambda p: [p[0] + 0.5, p[1], -p[2]],
        }
        for preset, operation in operations.items():
            for point in ([0.2, 0.3, 0.1], [-0.3, 1.2, -0.75], [0, 0, 0]):
                result = labs.run({'lab': 'seitz', 'preset': preset, 'point': point, 'steps': 12})
                current = list(point)
                for frame in result['frames']:
                    self.assert_vector(frame['unwrapped'], current)
                    expected = [math.floor(v + 1e-12) for v in current]
                    self.assertEqual(frame['cellTranslation'], expected)
                    self.assertTrue(all(0 <= x < 1 for x in frame['wrapped']))
                    self.assert_vector([a + b for a, b in zip(frame['wrapped'], expected)], current)
                    affine = [a + b for a, b in zip(apply(frame['rotation'], point), frame['translation'])]
                    self.assert_vector(affine, current)
                    current = operation(current)
                closure = result['closure']
                self.assertTrue(closure['isPureTranslation'])
                self.assertFalse(closure['isIdentity'])
                self.assertEqual(closure['translation'], [1.0, 0.0, 0.0] if preset == 'glide' else [0.0, 0.0, 1.0])

    def test_seitz_phase_uses_rotated_k_not_an_arbitrary_eigenvalue(self):
        coordinate = [0.17, -0.43, 0.29]
        k = [0.2, 0.1, 0.35]
        for preset in ('screw21', 'screw41', 'glide'):
            result = labs.run({'lab': 'seitz', 'preset': preset, 'k': k, 'steps': 6})
            for frame in result['frames']:
                r = frame['rotation']
                inverse = [list(row) for row in zip(*r)]
                pullback = apply(inverse, [a - b for a, b in zip(coordinate, frame['translation'])])
                lhs = cmath.exp(2j * math.pi * sum(a * b for a, b in zip(k, pullback)))
                rhs = z(frame['blochPhase']) * cmath.exp(2j * math.pi * sum(a * b for a, b in zip(frame['transformedK'], coordinate)))
                self.assertAlmostEqual(lhs, rhs, places=11)
                expected_little = all(abs(a - b - round(a - b)) < 1e-12 for a, b in zip(frame['transformedK'], k))
                self.assertEqual(frame['isLittleGroup'], expected_little)
        # Zone-boundary screw and glide powers acquire -1 on translation.
        for preset, step, boundary_k in (('screw21', 2, [0, 0, .5]), ('screw41', 4, [0, 0, .5]), ('glide', 2, [.5, 0, 0])):
            result = labs.run({'lab': 'seitz', 'preset': preset, 'steps': step, 'k': boundary_k})
            self.assertAlmostEqual(z(result['frames'][step]['blochPhase']), -1)
        # Large finite momentum reduces exactly before trigonometry.
        result = labs.run({'lab': 'seitz', 'k': [0, 0, 1000000], 'steps': 12})
        self.assertAlmostEqual(z(result['frames'][-1]['blochPhase']), 1)

    def test_seitz_multiplication_is_noncommutative(self):
        rotation = ([[0, -1, 0], [1, 0, 0], [0, 0, 1]], [0, 0, 0])
        translation = ([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 0, 0])
        rt = labs._compose(rotation, translation)
        tr = labs._compose(translation, rotation)
        self.assertEqual(rt[1], [0, 1, 0])
        self.assertEqual(tr[1], [1, 0, 0])
        self.assertNotEqual(rt, tr)

    def test_su2_unitarity_homomorphism_and_double_cover(self):
        identity = [[1, 0], [0, 1]]
        for axis in ('x', 'y', 'z'):
            result = labs.run({'lab': 'spinor', 'axis': axis})
            frames = result['frames']
            self.assertEqual([frame['angle'] for frame in frames], list(range(0, 721, 15)))
            for frame in frames:
                matrix = mat(frame['matrix'])
                self.assert_matrix(product(adjoint(matrix), matrix), identity)
                self.assertAlmostEqual(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0], 1)
                self.assertAlmostEqual(sum(frame['probabilities']), 1)
                self.assertAlmostEqual(sum(x * x for x in frame['blochVector']), 1)
            for i, j in ((1, 3), (6, 11), (12, 24), (24, 24)):
                self.assert_matrix(product(mat(frames[i]['matrix']), mat(frames[j]['matrix'])), mat(frames[i + j]['matrix']))
            self.assert_matrix(mat(frames[24]['matrix']), [[-1, 0], [0, -1]])
            self.assert_matrix(mat(frames[48]['matrix']), identity)
            self.assertAlmostEqual(z(frames[24]['overlap']), -1)
            self.assertAlmostEqual(z(frames[48]['overlap']), 1)
            self.assert_vector(frames[24]['blochVector'], frames[0]['blochVector'])

    def test_spinor_observable_rotation_and_antilinear_time_reversal(self):
        axes = {'x': [1, 0, 0], 'y': [0, 1, 0], 'z': [0, 0, 1]}
        for axis, n in axes.items():
            for initial, v in (('up', [0, 0, 1]), ('plus', [1, 0, 0])):
                result = labs.run({'lab': 'spinor', 'axis': axis, 'initialState': initial})
                for frame in result['frames']:
                    angle = math.radians(frame['angle'])
                    nv = sum(a * b for a, b in zip(n, v))
                    nxv = cross(n, v)
                    expected = [v[i] * math.cos(angle) + nxv[i] * math.sin(angle) + n[i] * nv * (1 - math.cos(angle)) for i in range(3)]
                    self.assert_vector(frame['blochVector'], expected)
        psi = [complex(.2, .3), complex(-.4, .5)]
        theta_psi = labs._time_reverse(psi)
        self.assert_vector(labs._time_reverse(theta_psi), [-x for x in psi])
        self.assertAlmostEqual(sum(a.conjugate() * b for a, b in zip(psi, theta_psi)), 0)
        scale = complex(.7, .9)
        self.assert_vector(labs._time_reverse([scale * x for x in psi]), [scale.conjugate() * x for x in theta_psi])

    def test_axial_vector_covariance_and_time_parity(self):
        a, b = [.2, .3, -.5], [.7, -.8, .1]
        moment = cross(a, b)
        for operation in ('E', 'inversion', 'mirror_z', 'C2z'):
            for time_reversal in (False, True):
                result = labs.run({'lab': 'magnetic', 'operation': operation, 'moment': moment, 'position': a, 'timeReversal': time_reversal})
                r = result['rotation']
                expected = cross(apply(r, a), apply(r, b))
                if time_reversal:
                    expected = [-x for x in expected]
                self.assert_vector(result['transformedMoment'], expected)
                self.assert_vector(result['transformedPosition'], apply(r, a))
                again = labs.run({'lab': 'magnetic', 'operation': operation, 'moment': result['transformedMoment'], 'position': result['transformedPosition'], 'timeReversal': time_reversal})
                self.assert_vector(again['transformedMoment'], moment)
                self.assert_vector(again['transformedPosition'], a)
        inversion = labs.run({'lab': 'magnetic', 'operation': 'inversion', 'moment': [1, 2, 3]})
        self.assertEqual(inversion['transformedMoment'], [1, 2, 3])
        self.assertEqual(inversion['polarVectorTransform'], [-1, -2, -3])

    def test_antiferro_square_from_antiunitary_action_on_bloch_chain(self):
        # Evaluate A twice on arbitrary complex sublattice amplitudes. The
        # intermediate state has momentum -k; treating A as an ordinary matrix
        # would lose this complex conjugation and yield the wrong square.
        for spinful in (False, True):
            for k in (0, .125, .25, .5, -.5, 1, 1.5):
                result = labs.run({'lab': 'antiferro', 'k': k, 'spinful': spinful})
                amplitudes = [[.3 + .2j, -.1 + .7j], [.4 - .6j, .8 + .9j]]
                def psi(n):
                    return [cmath.exp(2j * math.pi * k * (n // 2)) * x for x in amplitudes[n % 2]]
                def theta(v):
                    return [-v[1].conjugate(), v[0].conjugate()] if spinful else [x.conjugate() for x in v]
                def first(n):
                    return theta(psi(n - 1))
                for n in range(-3, 4):
                    twice = theta(first(n - 1))
                    self.assert_vector(twice, [z(result['square']) * x for x in psi(n)])
                self.assertEqual(result['momentumImage'], -k)
                self.assertEqual([test['preservesPattern'] for test in result['symmetryTests']], [False, False, True])

    def test_kramers_condition_requires_same_momentum_and_minus_square(self):
        for k, spinful, eligible in ((0, True, True), (.5, True, False), (.25, True, False), (0, False, False), (.5, False, True), (1, True, True)):
            result = labs.run({'lab': 'antiferro', 'k': k, 'spinful': spinful})
            self.assertEqual(result['kramersEligible'], eligible)
        # Near a TRIM is not exactly a TRIM, regardless of display precision.
        self.assertFalse(labs.run({'lab': 'antiferro', 'k': 1e-13})['isTrim'])

    def test_invalid_inputs_rejected_and_outputs_strict_json(self):
        invalid = [None, [], {}, {'lab': 'unknown'}, {'lab': []},
                   {'lab': 'seitz', 'steps': 0}, {'lab': 'seitz', 'steps': 13},
                   {'lab': 'seitz', 'steps': 2.0}, {'lab': 'seitz', 'steps': True},
                   {'lab': 'seitz', 'point': [0, 0]}, {'lab': 'seitz', 'k': [0, 0, True]},
                   {'lab': 'seitz', 'preset': 'arbitrary'}, {'lab': 'spinor', 'axis': 'xy'},
                   {'lab': 'spinor', 'initialState': 'custom'},
                   {'lab': 'magnetic', 'timeReversal': 'false'}, {'lab': 'magnetic', 'operation': 'rotate'},
                   {'lab': 'antiferro', 'spinful': 1}]
        for value in (math.inf, -math.inf, math.nan, 1_000_001, 10 ** 1000, True, '0'):
            invalid += [{'lab': 'antiferro', 'k': value}, {'lab': 'magnetic', 'moment': [0, value, 0]}]
        for payload in invalid:
            with self.subTest(payload=str(payload)[:100]), self.assertRaises(ValueError):
                labs.run(payload)
        for name in ('seitz', 'spinor', 'magnetic', 'antiferro'):
            encoded = json.dumps(labs.run({'lab': name}), allow_nan=False)
            self.assertEqual(json.loads(encoded)['lab'], name)


if __name__ == '__main__':
    unittest.main(verbosity=2)
