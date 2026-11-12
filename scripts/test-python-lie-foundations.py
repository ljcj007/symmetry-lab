"""Independent analytic checks for the introductory continuous-group experiments."""
import cmath
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from teaching_labs import run


def calc(experiment, **parameters):
    return run({'lab': 'lie', 'experiment': experiment, **parameters})


def z(value):
    return complex(value['re'], value['im'])


class Foundations(unittest.TestCase):
    def vector(self, actual, expected):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assertAlmostEqual(a, b, places=11)

    def test_u1_subgroup_and_infinite_discrete_translation(self):
        four = calc('u1', order=4, angle=math.pi/4, translation=.001)
        self.assertFalse(four['inFiniteSubgroup'])
        self.assertFalse(four['inIntegerTranslations'])
        self.assertEqual(len(four['circlePoints']), 4)
        self.assertEqual(four['realDimension'], 1)
        self.assertEqual(four['representationDimension'], 1)
        eight = calc('u1', order=8, angle=math.pi/4, translation=-2)
        self.assertTrue(eight['inFiniteSubgroup'])
        self.assertTrue(eight['inIntegerTranslations'])
        self.vector(four['selectedPoint'], [1/math.sqrt(2), 1/math.sqrt(2)])
        for order in (1, 4, 8, 24):
            for m in range(order):
                result = calc('u1', order=order, angle=2*math.pi*m/order, translation=(m%12)/2)
                self.assertTrue(result['inFiniteSubgroup'])
                self.assertLess(max(result['residuals'].values()), 1e-12)

    def test_same_group_distinct_representations_and_characters(self):
        for axis in 'xyz':
            result = calc('representations', axis=axis, angle=2*math.pi)
            self.assertTrue(result['spinorIsNegativeIdentity'])
            self.assertTrue(result['sameVectorAsIdentity'])
            self.assertAlmostEqual(z(result['spinorCharacter']), -2)
            self.assertAlmostEqual(result['vectorCharacter'], 3)
            for i, row in enumerate(result['vectorMatrix']):
                self.vector(row, [int(i == j) for j in range(3)])
        # An independent right-handed z rotation, not a second Pauli conjugation.
        for theta in (-2.15, 0, math.pi/2, 4.3):
            result = calc('representations', axis='z', angle=theta)
            expected = [[math.cos(theta), -math.sin(theta), 0], [math.sin(theta), math.cos(theta), 0], [0, 0, 1]]
            for row, target in zip(result['vectorMatrix'], expected):
                self.vector(row, target)
            self.assertAlmostEqual(z(result['spinorCharacter']), 2*math.cos(theta/2))
            self.assertAlmostEqual(result['vectorCharacter'], 1+2*math.cos(theta))
            self.assertLess(max(result['residuals'].values()), 1e-12)

    def test_interference_global_and_relative_signs(self):
        for axis in 'xyz':
            for state in ('up', 'plus', 'plus_i'):
                self.vector(calc('interferometer', axis=axis, state=state, angle=2*math.pi)['portProbabilities'], [0, 1])
                self.vector(calc('interferometer', axis=axis, state=state, angle=4*math.pi)['portProbabilities'], [1, 0])
                self.vector(calc('interferometer', axis=axis, state=state, angle=2*math.pi, branches='both')['portProbabilities'], [1, 0])
        # Path order is a-up,a-down,b-up,b-down; U acts on b in single mode.
        result = calc('interferometer', axis='z', state='up', angle=2*math.pi)
        self.vector([z(v) for v in result['pathState']], [1/math.sqrt(2), 0, -1/math.sqrt(2), 0])
        self.vector([z(v) for v in result['portStates'][1]], [1, 0])
        for phase in (-1.2, 0, .71, math.pi):
            for theta in (-2.1, math.pi/2, 2*math.pi):
                single = calc('interferometer', axis='z', state='up', angle=theta, phase=phase)
                # Branch b gets exp(i phi) exp(-i theta/2) on |up>.
                expected = (1+math.cos(phase-theta/2))/2
                self.vector(single['portProbabilities'], [expected, 1-expected])
                both = calc('interferometer', axis='z', state='plus_i', angle=theta, phase=phase, branches='both')
                self.vector(both['portProbabilities'], [(1+math.cos(phase))/2, (1-math.cos(phase))/2])
                for result in (single, both):
                    self.assertLess(max(result['residuals'].values()), 1e-12)
                    json.dumps(result, allow_nan=False)

    def test_su3_coherence_records_information_missing_from_weights(self):
        for theta in (-1.6, 0, math.pi/2, 3.1):
            result = calc('su3', generator=3, state='plus12', angle=theta)
            self.vector([z(v) for v in result['state']], [cmath.exp(-1j*theta/2)/math.sqrt(2), cmath.exp(1j*theta/2)/math.sqrt(2), 0])
            self.vector(result['probabilities'], [.5, .5, 0])
            self.vector(result['cartanExpectation'], [0, 1/(2*math.sqrt(3))])
            self.vector([result['generatorExpectations'][i] for i in (0, 1, 2, 7)], [math.cos(theta)/2, math.sin(theta)/2, 0, 1/(2*math.sqrt(3))])
        result = calc('su3', generator=3, state='plus_i12', angle=0)
        self.vector(result['generatorExpectations'][:3], [0, .5, 0])
        for initial in (1, 2, 3, 'plus12', 'plus_i12'):
            for generator in range(1, 9):
                result = calc('su3', generator=generator, state=initial, angle=.517)
                self.assertLess(max(result['residuals'].values()), 1e-12)
                self.assertAlmostEqual(sum(result['probabilities']), 1)
        result = calc('su2', axis='y', state='plus_i', angle=math.pi/2)
        self.vector(result['blochVector'], [0, 1, 0])

    def test_invalid_inputs_fail_before_result(self):
        for experiment, key, values in [
            ('u1', 'order', (True, 0, 25, '4', 4.0)),
            ('u1', 'translation', (float('nan'), float('inf'), 9, 10**1000, True, '0')),
            ('interferometer', 'branches', ('left', {}, True)),
            ('interferometer', 'phase', (float('nan'), 9*math.pi, '0')),
            ('representations', 'axis', ('a', None)),
            ('su3', 'state', ('plus', '1', [1, 1, 0], True))]:
            for value in values:
                with self.assertRaises(ValueError, msg=(experiment, key, str(value)[:40])):
                    calc(experiment, **{key:value})
        for experiment in ('u1', 'representations', 'interferometer'):
            with self.assertRaises(ValueError):
                calc(experiment, unknown=True)

    def test_ui_fixtures_match_the_actual_public_dispatcher(self):
        fixtures = json.loads((ROOT/'scripts/fixtures/lie-foundations-ui.json').read_text(encoding='utf8'))
        def compare(a, b):
            if isinstance(a, dict):
                self.assertEqual(set(a), set(b))
                for key in a:
                    compare(a[key], b[key])
            elif isinstance(a, list):
                self.assertEqual(len(a), len(b))
                for left, right in zip(a, b):
                    compare(left, right)
            elif isinstance(a, (int, float)) and not isinstance(a, bool):
                self.assertAlmostEqual(a, b, places=11)
            else:
                self.assertEqual(a, b)
        for fixture in fixtures.values():
            compare(fixture['result'], run(fixture['input']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
