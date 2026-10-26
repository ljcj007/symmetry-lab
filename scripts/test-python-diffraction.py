"""Analytic structure factors, extinction distinctions and reciprocal geometry."""
import cmath
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from diffraction import run


class DiffractionTests(unittest.TestCase):
    def calculate(self, preset, hkl, **kwargs):
        return run({'preset': preset, 'hkl': hkl, 'maxIndex': 1, **kwargs})['reflection']

    def test_diamond_structure_factors_and_distinct_extinctions(self):
        factors = {'Si': 1}
        expectations = [([1, 0, 0], 0, 0, 'centering'), ([2, 0, 0], 0, 0, 'diamond_basis'),
                        ([1, 1, 1], 4, -4, 'allowed'), ([2, 2, 0], 8, 0, 'allowed')]
        for hkl, re, im, kind in expectations:
            result = self.calculate('silicon', hkl, scatteringFactors=factors)
            self.assertAlmostEqual(result['real'], re)
            self.assertAlmostEqual(result['imag'], im)
            self.assertAlmostEqual(result['intensity'], re ** 2 + im ** 2)
            self.assertEqual(result['extinction']['kind'], kind)

    def test_gaas_weight_difference_and_accidental_equality(self):
        unequal = self.calculate('gaas', [2, 0, 0], scatteringFactors={'Ga': 3, 'As': 5})
        self.assertAlmostEqual(unequal['real'], -8)
        self.assertEqual(unequal['extinction']['kind'], 'allowed')
        equal = self.calculate('gaas', [2, 0, 0], scatteringFactors={'Ga': 1, 'As': 1})
        self.assertEqual(equal['intensity'], 0)
        self.assertEqual(equal['extinction']['kind'], 'accidental')
        self.assertFalse(equal['extinction']['systematicForModel'])

    def test_nacl_sum_and_difference(self):
        odd = self.calculate('nacl', [1, 1, 1], scatteringFactors={'Na': 2, 'Cl': 3})
        even = self.calculate('nacl', [2, 0, 0], scatteringFactors={'Na': 2, 'Cl': 3})
        self.assertAlmostEqual(odd['real'], -4)
        self.assertAlmostEqual(even['real'], 20)

    def test_fcc_and_bcc_conditions(self):
        for hkl, allowed_f, allowed_i in [([1, 1, 0], False, True), ([1, 1, 1], True, False), ([2, 0, 0], True, True)]:
            fcc, bcc = self.calculate('fcc', hkl), self.calculate('bcc', hkl)
            self.assertEqual(fcc['intensity'] > 0, allowed_f)
            self.assertEqual(bcc['intensity'] > 0, allowed_i)

    def test_screw_condition_only_applied_on_invariant_reciprocal_line(self):
        odd = self.calculate('screw21', [0, 0, 1])
        even = self.calculate('screw21', [0, 0, 2])
        off_axis = self.calculate('screw21', [1, 0, 1])
        self.assertEqual(odd['extinction']['kind'], 'screw_axis')
        self.assertAlmostEqual(odd['intensity'], 0)
        self.assertAlmostEqual(even['intensity'], 4)
        self.assertNotEqual(off_axis['extinction']['kind'], 'screw_axis')
        self.assertGreater(off_axis['intensity'], 0)

    def test_friedel_conjugation_and_factor_scale(self):
        plus = self.calculate('gaas', [1, 1, 1])
        minus = self.calculate('gaas', [-1, -1, -1])
        self.assertAlmostEqual(plus['real'], minus['real'])
        self.assertAlmostEqual(plus['imag'], -minus['imag'])
        self.assertAlmostEqual(plus['intensity'], minus['intensity'])
        scaled = self.calculate('gaas', [1, 1, 1], scatteringFactors={'Ga': 62, 'As': 66})
        self.assertAlmostEqual(scaled['intensity'], 4 * plus['intensity'])

    def test_origin_translation_changes_phase_not_intensity(self):
        atoms = [{'species': 'X', 'fractional': [0.1, 0.2, 0.3], 'factor': 2},
                 {'species': 'Y', 'fractional': [0.2, 0.3, 0.4], 'factor': 3}]
        cell = [[3, 0, 0], [0, 3, 0], [0, 0, 3]]
        original = self.calculate('custom', [2, 1, 0], cell=cell, atoms=atoms)
        shift = [0.17, 0.13, 0.07]
        moved_atoms = [{**a, 'fractional': [a['fractional'][i] + shift[i] for i in range(3)]} for a in atoms]
        moved = self.calculate('custom', [2, 1, 0], cell=cell, atoms=moved_atoms)
        expected = complex(original['real'], original['imag']) * cmath.exp(2j * math.pi * (2 * shift[0] + shift[1]))
        self.assertAlmostEqual(moved['real'], expected.real)
        self.assertAlmostEqual(moved['imag'], expected.imag)
        self.assertAlmostEqual(original['intensity'], moved['intensity'])

    def test_nonorthogonal_metric_uses_reciprocal_dual(self):
        # a=(2,0,0), b=(1,3,0), c=(0,0,4). For (110),
        # g=(1/2,1/6,0) follows a.g=b.g=1 and c.g=0.
        result = self.calculate('custom', [1, 1, 0], cell=[[2, 0, 0], [1, 3, 0], [0, 0, 4]],
                                atoms=[{'fractional': [0, 0, 0]}])
        self.assertAlmostEqual(result['dSpacing'], 1 / math.sqrt(0.25 + 1 / 36))
        self.assertAlmostEqual(result['reciprocalVector'][0], 0.5)
        self.assertAlmostEqual(result['reciprocalVector'][1], 1 / 6)

    def test_bragg_angle_reachability_and_undefined_phase(self):
        allowed = self.calculate('fcc', [2, 0, 0], latticeConstant=4, wavelength=2)
        self.assertAlmostEqual(allowed['dSpacing'], 2)
        self.assertAlmostEqual(allowed['twoTheta'], 60)
        unreachable = self.calculate('fcc', [2, 0, 0], latticeConstant=4, wavelength=5)
        self.assertFalse(unreachable['accessible'])
        self.assertIsNone(unreachable['twoTheta'])
        self.assertIsNone(self.calculate('fcc', [1, 0, 0])['phaseDeg'])

    def test_powder_multiplicity_counts_full_friedel_sphere(self):
        result = run({'preset': 'fcc', 'maxIndex': 2, 'wavelength': 1})
        self.assertEqual(len(result['reflections']), (5 ** 3 - 1) // 2)
        first = result['powder'][0]
        self.assertEqual(first['multiplicity'], 8)  # {111}
        self.assertAlmostEqual(first['intensity'], 8 * 16)
        self.assertEqual(result['powder'][1]['multiplicity'], 6)  # {200}
        bcc = run({'preset': 'bcc', 'maxIndex': 2})['powder'][0]
        self.assertEqual(bcc['multiplicity'], 12)  # {110}

    def test_custom_zero_not_mislabelled_as_identified_systematic_absence(self):
        result = self.calculate('custom', [1, 0, 0], cell=[[2, 0, 0], [0, 2, 0], [0, 0, 2]],
                                atoms=[{'fractional': [0, 0, 0]}, {'fractional': [0.5, 0, 0]}])
        self.assertEqual(result['intensity'], 0)
        self.assertEqual(result['extinction']['kind'], 'model_cancellation')
        self.assertFalse(result['extinction']['systematicForModel'])

    def test_occupancy_and_component_sum(self):
        result = self.calculate('custom', [1, 0, 0], cell=[[2, 0, 0], [0, 2, 0], [0, 0, 2]],
                                atoms=[{'fractional': [0, 0, 0], 'factor': 2, 'occupancy': 0.5},
                                       {'fractional': [0.25, 0, 0], 'factor': -3}])
        self.assertAlmostEqual(result['real'], 1)
        self.assertAlmostEqual(result['imag'], -3)
        self.assertAlmostEqual(result['intensity'], 10)
        self.assertAlmostEqual(sum(row['real'] for row in result['components']), result['real'])
        self.assertAlmostEqual(sum(row['imag'] for row in result['components']), result['imag'])

    def test_json_serialization_presets(self):
        for preset in ('silicon', 'gaas', 'nacl', 'fcc', 'bcc', 'screw21'):
            result = run({'preset': preset, 'maxIndex': 1})
            self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)

    def test_invalid_inputs(self):
        good_custom = {'preset': 'custom', 'cell': [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 'atoms': [{'fractional': [0, 0, 0]}]}
        invalid = [[], {'preset': []}, {'hkl': [0, 0, 0]}, {'hkl': [1.0, 0, 0]}, {'hkl': [True, 0, 0]},
                   {'hkl': [33, 0, 0]}, {'hkl': [1, 2]}, {'maxIndex': 7}, {'wavelength': 0},
                   {'scatteringFactors': {'Si': float('nan')}}, {'scatteringFactors': []},
                   {'preset': 'custom'}, {**good_custom, 'cell': [[1, 0, 0]] * 3},
                   {**good_custom, 'atoms': []}, {**good_custom, 'atoms': [{'fractional': [0, 0]}]},
                   {**good_custom, 'atoms': [{'fractional': [0, 0, 0], 'occupancy': 2}]},
                   {**good_custom, 'atoms': [{'fractional': [0, 0, 0]}] * 129}]
        for args in invalid:
            with self.subTest(args=args), self.assertRaises(ValueError):
                run(args)


if __name__ == '__main__':
    unittest.main()
