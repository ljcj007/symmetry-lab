"""Independent finite-basis and antiunitary checks for the Bloch replay."""
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
import json
import math
import sys
import unittest
import numpy as np
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from antitranslation_lab import run


def matrix(value):
    return sp.Matrix([[sp.sympify(cell) for cell in row] for row in value['exact']])


def vector(value):
    return sp.Matrix([sp.sympify(cell) for cell in value['exact']])


def zero(value):
    return all(sp.simplify(x) == 0 for x in value)


def numeric(value):
    return np.array(value['numeric']['re'])+1j*np.array(value['numeric']['im'])


class AntitranslationTests(unittest.TestCase):
    def test_translation_columns_from_real_space(self):
        # Build each column by sending an orbital position to its destination
        # and extracting the integer cell shift, rather than copying S(k).
        for kz in (0, sp.Rational(1, 2), sp.Rational(1, 4), sp.Rational(1, 7)):
            result = run({'k': [0, 0, str(kz)]})
            expected = sp.zeros(2)
            sites = [sp.Rational(0), sp.Rational(1, 2)]
            for source, z in enumerate(sites):
                moved = z+sp.Rational(1, 2)
                destination = next(i for i, target in enumerate(sites) if (moved-target).is_Integer)
                shift = moved-sites[destination]
                expected[destination, source] = sp.exp(-2*sp.pi*sp.I*kz*shift)
                mapping = result['translation']['siteMappings'][source]
                self.assertEqual(mapping['cellShift'], [0, 0, int(shift)])
                self.assertEqual(vector(mapping['unwrappedPosition'])[2], moved)
            self.assertTrue(zero(matrix(result['translation']['atK'])-expected))
            self.assertTrue(zero(expected*expected-sp.exp(-2*sp.pi*sp.I*kz)*sp.eye(2)))

    def test_two_step_action_from_each_complex_basis_vector(self):
        # Use an independently assembled map on orbital/spin indices.
        rng = np.random.default_rng(81343)
        for spinful in (False, True):
            for k in ([0, 0, 0], [0, 0, '1/2'], [0, 0, '1/4'], ['1/4', '1/3', '1/7']):
                result = run({'k': k, 'spinful': spinful})
                kz = float(Fraction(str(k[2])))
                size = 4 if spinful else 2
                state = rng.normal(size=size)+1j*rng.normal(size=size)
                def apply(input_state, wavevector):
                    output = np.zeros(size, complex)
                    for orbital in (0, 1):
                        target = 1-orbital
                        shift = orbital
                        phase = np.exp(+2j*math.pi*wavevector*shift)
                        if spinful:
                            output[2*target] += -phase*input_state[2*orbital+1].conjugate()
                            output[2*target+1] += phase*input_state[2*orbital].conjugate()
                        else:
                            output[target] += phase*input_state[orbital].conjugate()
                    return output
                first = apply(state, kz)
                second = apply(first, -kz)
                expected = (-1 if spinful else 1)*np.exp(-2j*math.pi*kz)*state
                np.testing.assert_allclose(second, expected, rtol=1e-13, atol=1e-13)
                np.testing.assert_allclose(numeric(result['antiunitary']['atK'])@state.conjugate(), first, rtol=1e-13, atol=1e-13)
                np.testing.assert_allclose(numeric(result['antiunitary']['returnSquare'])@state, expected, rtol=1e-13, atol=1e-13)

    def test_exact_same_k_all_three_components(self):
        for spinful in (False, True):
            for values in ([0, 0, 0], [0, 0, '1/2'], ['1/4', 0, 0], [0, '1/3', 0], ['1/2', '1/2', 0], [1, -1, '3/2']):
                result = run({'k': values, 'spinful': spinful})
                k = [Fraction(str(x)) for x in values]
                same = all((2*x).denominator == 1 for x in k)
                square_minus = k[2].denominator == 1 if spinful else (2*k[2]).denominator == 1 and k[2].denominator != 1
                self.assertEqual(result['decision']['sameK'], same)
                self.assertEqual(result['decision']['squareIsMinusOne'], square_minus)
                self.assertEqual(result['decision']['kramersConditional'], same and square_minus)
                self.assertEqual(result['momentum']['axisInvariant'], [(2*x).denominator == 1 for x in k])
                self.assertEqual(result['decision']['hamiltonianSymmetry'], 'not-evaluated')
                if same:
                    self.assertEqual(vector(result['momentum']['sewingShift']), 2*sp.Matrix([sp.Rational(x.numerator, x.denominator) for x in k]))
                else:
                    self.assertIsNone(result['momentum']['sewingShift'])
                    self.assertIsNone(result['antiunitary']['sameKOverlap'])
                    self.assertIsNone(result['antiunitary']['sameKOrthogonal'])
        transverse = run({'k': ['1/4', 0, 0]})
        self.assertEqual(transverse['antiunitary']['squareScalar']['exact'], '-1')
        self.assertFalse(transverse['decision']['kramersConditional'])

    def test_correct_fiber_and_conjugation_are_both_needed(self):
        result = run({'k': [0, 0, '1/4']})
        anti = result['antiunitary']
        correct = matrix(anti['returnSquare'])
        self.assertTrue(zero(correct-sp.I*sp.eye(4)))
        self.assertFalse(zero(matrix(anti['wrongOrdinarySquare'])-correct))
        self.assertFalse(zero(matrix(anti['wrongSameFiberProduct'])-correct))
        initial = vector(result['basis']['initialState'])
        self.assertTrue(zero(vector(anti['firstConjugate'])-initial.conjugate()))
        self.assertTrue(zero(vector(anti['secondConjugate'])-vector(anti['firstState']).conjugate()))
        self.assertTrue(zero(vector(anti['secondState'])-sp.I*initial))

    def test_periodic_orbital_gauge_and_exact_fraction_equivalence(self):
        first = run({'k': ['1/4', '1/3', '1/7']})
        shifted = run({'k': ['5/4', '-2/3', '8/7']})
        for field in ('atK', 'atPartner', 'squareAtK'):
            self.assertTrue(zero(matrix(first['translation'][field])-matrix(shifted['translation'][field])))
        self.assertTrue(zero(matrix(first['antiunitary']['returnSquare'])-matrix(shifted['antiunitary']['returnSquare'])))
        self.assertEqual(first['momentum']['axisInvariant'], shifted['momentum']['axisInvariant'])
        half = run({'k': [0, 0, '2/4']})
        self.assertTrue(half['decision']['sameK'])
        self.assertEqual(half['momentum']['k']['exact'], ['0', '0', '1/2'])
        self.assertEqual(half['input']['k'], [0, 0, '2/4'])

    def test_unitary_and_antiunitary_complex_scalar_laws(self):
        result = run({'k': [0, 0, '1/4']})
        psi = vector(result['basis']['initialState'])
        b = matrix(result['antiunitary']['atK'])
        g = matrix(result['unitaryContrast']['matrix'])
        first = b*psi.conjugate()
        self.assertTrue(zero(b*(sp.I*psi).conjugate()+sp.I*first))
        self.assertTrue(zero(g*(sp.I*psi)-sp.I*g*psi))
        self.assertTrue(zero(matrix(result['unitaryContrast']['square'])-matrix(result['antiunitary']['returnSquare'])))
        self.assertTrue(result['unitaryContrast']['sameK'])
        self.assertFalse(result['momentum']['sameK'])

    def test_kramers_orthogonality_is_conditional(self):
        for spinful, k in [(True, [0, 0, 0]), (True, ['1/2', '1/2', 0]), (False, [0, 0, '1/2'])]:
            for state in ('basis', 'complex'):
                result = run({'k': k, 'spinful': spinful, 'statePreset': state})
                self.assertTrue(result['decision']['kramersConditional'])
                self.assertTrue(result['antiunitary']['sameKOrthogonal'])
                self.assertEqual(result['antiunitary']['sameKOverlap']['exact'], '0')

    def test_two_distinct_no_degeneracy_counterexamples(self):
        examples = run({})['counterexamples']
        for example in examples:
            h = numeric(example['hamiltonian'])
            b = numeric(example['symmetryMatrix'])
            np.testing.assert_allclose(h, h.conjugate().T, atol=1e-14)
            transformed = b@(h.conjugate() if example['antiunitary'] else h)@b.conjugate().T
            np.testing.assert_allclose(transformed, h, atol=1e-14)
            np.testing.assert_allclose(np.linalg.eigvalsh(h), [-3, -1, 1, 3], atol=1e-13)
            self.assertEqual(example['spectrum']['multiplicities'], [1, 1, 1, 1])
            self.assertFalse(example['spectrum']['hasDegeneracy'])
        np.testing.assert_allclose(numeric(examples[0]['operatorSquare']), -np.eye(4), atol=1e-14)
        np.testing.assert_allclose(numeric(examples[1]['operatorSquare']), np.eye(4), atol=1e-14)
        self.assertFalse(examples[0]['comparisonAntiunitaryPreservesHamiltonian'])

    def test_pattern_and_original_copy_boundaries(self):
        result = run({'k': [0, 0, '1/4']})
        self.assertEqual([frame['preservesPattern'] for frame in result['pattern']['frames']], [True, False, False, True, True])
        self.assertEqual(result['pattern']['frames'][3]['sites'][1]['position'], [0, 0, 1])
        self.assertEqual(result['legacyCopy']['payload'], {'lab': 'antiferro', 'k': .25, 'spinful': True})
        for k in (['1/4', 0, 0], [0, '1/2', 0], [0, 0, '1/3'], [0, 0, '3/2']):
            copy = run({'k': k})['legacyCopy']
            self.assertFalse(copy['available'])
            self.assertNotIn('payload', copy)
        spinless = run({'spinful': False})
        self.assertFalse(spinless['unitaryContrast']['available'])
        self.assertEqual(len(spinless['pattern']['frames']), 4)

    def test_legacy_copy_preserves_longitudinal_units_and_conditions(self):
        import teaching_labs
        for spinful in (False, True):
            for kz in ('0', '1/4', '1/2', '-1/4', '19/20'):
                result = run({'k': [0, 0, kz], 'spinful': spinful})
                copy = result['legacyCopy']
                self.assertTrue(copy['available'])
                old = teaching_labs.run(copy['payload'])
                self.assertEqual(old['k'], float(Fraction(kz)))
                np.testing.assert_allclose([old['square']['re'], old['square']['im']],
                                           [result['antiunitary']['squareScalar']['re'], result['antiunitary']['squareScalar']['im']],
                                           rtol=1e-13, atol=1e-13)
                self.assertEqual(old['isTrim'], result['decision']['sameK'])
                self.assertEqual(old['kramersEligible'], result['decision']['kramersConditional'])

    def test_input_validation_and_immutability(self):
        payload = {'lab': 'antitranslation', 'k': ['1/4', -.5, 0], 'spinful': True, 'statePreset': 'basis'}
        before = deepcopy(payload)
        result = run(payload)
        self.assertEqual(payload, before)
        self.assertEqual(result['input'], before)
        result['input']['k'][0] = 0
        self.assertEqual(payload, before)
        for invalid in (None, [], {'lab': 'other'}, {'spinful': 1}, {'statePreset': 'other'}, {'extra': 1},
                        {'k': [0, 0]}, {'k': [True, 0, 0]}, {'k': [float('nan'), 0, 0]},
                        {'k': [float('inf'), 0, 0]}, {'k': ['sqrt(2)', 0, 0]}, {'k': ['1/0', 0, 0]},
                        {'k': ['1/1000001', 0, 0]}, {'k': [9, 0, 0]}, {'k': ['__import__("os")', 0, 0]}):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                run(invalid)

    def test_all_references_and_public_dispatch(self):
        fixture = json.loads((ROOT/'scripts/fixtures/antitranslation.json').read_text(encoding='utf8'))
        self.assertEqual(len(fixture['cases']), 10)
        self.assertTrue(fixture['method'].startswith('Actual browser_api.run'))
        from browser_api import run as public
        for row in fixture['cases']:
            result = public('teaching_labs', row['input'])
            self.assertEqual(result['schema'], 'symmetry-lab-antitranslation-1')
            self.assertTrue(all(item['passed'] for item in result['checks']))
            self.assertEqual(result['input'], row['input'])


if __name__ == '__main__':
    unittest.main()
