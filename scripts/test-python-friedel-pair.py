"""Check the constant-scalar Friedel comparison against independent CIF phase sums."""

from collections import defaultdict
from cmath import exp
from hashlib import sha256
from itertools import product
import json
import math
from pathlib import Path
import sys
import unittest


SITE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SITE / 'dist' / 'python'))
from diffraction import run
from quartz_friedel import run as quartz_study
from structure_bc import parse_cif


_CIF_SHA = '09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6'
_CIF = SITE / 'dist' / 'data' / 'examples' / 'quartz-298k' / '9005017.cif'
_COMPLEX = {'Si': {'re': 14, 'im': 1}, 'O': 8}


def _independent_orbits():
    # Published coordinates and six operations as transcribed from COD 9005017.
    # Keep out-of-cell coordinates in this reference, since their phases are periodic.
    u = .46970
    silicon = [(u, 0, 0), (0, u, 2 / 3), (-u, -u, 1 / 3)]
    x, y, z = .41330, .26720, .11880
    oxygen = [
        (x, y, z), (y, x, 2 / 3 - z), (-y, x - y, 2 / 3 + z),
        (-x, -x + y, 1 / 3 - z), (-x + y, -x, 1 / 3 + z), (x - y, -y, -z),
    ]
    return silicon, oxygen


def _reference(hkl, f_si=14 + 1j, f_o=8):
    def terms(orbit):
        return sum(exp(1j * math.tau * sum(h * x for h, x in zip(hkl, site, strict=True)))
                   for site in orbit)

    silicon, oxygen = _independent_orbits()
    return f_si * terms(silicon) + f_o * terms(oxygen)


def _geometry_key(hkl):
    h, k, l = hkl
    # Metric of the reported hexagonal axes with gamma=120 degrees.
    return h * h + h * k + k * k, l * l


def _d_spacing(key):
    planar, axial = key
    return 1 / math.sqrt(4 * planar / (3 * 4.9137 ** 2) + axial / 5.4047 ** 2)


class FriedelPairTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = _CIF.read_bytes()
        assert len(raw) == 2384 and sha256(raw).hexdigest() == _CIF_SHA, 'Use the pinned quartz CIF'
        structure = parse_cif(raw.decode('utf-8'))
        cls.quartz = {
            'preset': 'custom', 'cell': structure['lattice'].tolist(), 'maxIndex': 2,
            'atoms': [
                {'species': species, 'fractional': coord.tolist()}
                for species, coord in zip(structure['species'], structure['positions'], strict=True)
            ],
        }

    def test_legacy_numeric_shapes(self):
        presets = ['silicon', 'gaas', 'nacl', 'fcc', 'bcc', 'screw21']
        examples = [{'preset': preset, 'maxIndex': 2} for preset in presets]
        examples += [
            {'preset': 'silicon', 'max_index': 2, 'hkl': [-1, 1, 1], 'factors': {'Si': 1}},
            {'preset': 'gaas', 'maxIndex': 1, 'hkl': [2, 0, 0], 'scatteringFactors': {'Ga': 1, 'As': 1}},
            {'preset': 'bcc', 'maxIndex': 2, 'wavelength': 10.0},
            {**self.quartz, 'hkl': [1, 1, 0], 'scatteringFactors': {'Si': 14, 'O': 8}},
            {
                'preset': 'custom', 'hkl': [1, 1, 1], 'maxIndex': 1,
                'cell': [[2, 0, 0], [1, 3, 0], [0, 0, 4]],
                'atoms': [
                    {'species': 'O', 'fractional': [.1, .2, .3], 'factor': -2, 'occupancy': .3},
                    {'species': 'O', 'fractional': [.3, .2, .7], 'factor': 9},
                ],
            },
        ]
        for args in examples:
            with self.subTest(args=args):
                result = run(args)
                self.assertEqual(set(result), {
                    'kind', 'parameters', 'structure', 'reflection', 'selected', 'reflections',
                    'powder', 'statistics', 'formulas', 'steps', 'limitations', 'sources',
                })
                self.assertEqual(len(result['reflections']), ((2 * result['parameters']['maxIndex'] + 1) ** 3 - 1) // 2)
                self.assertTrue(all(row['multiplicity'] == 2 * len(row['hkls']) for row in result['powder']))
                self.assertTrue(all(isinstance(atom['factor'], (int, float)) for atom in result['structure']['atoms']))
                json.dumps(result, allow_nan=False)

    def test_explicit_pair_for_real_scalars_adds_only_the_pair(self):
        request = {**self.quartz, 'hkl': [-1, -1, 0], 'scatteringFactors': {'Si': 14, 'O': 8}}
        legacy = run(request)
        actual = run({**request, 'compareFriedel': True})
        pair = actual.pop('friedelPair')
        self.assertEqual(actual, legacy)
        forward, reverse = pair['forward'], pair['reverse']
        self.assertEqual(forward['hkl'], [-1, -1, 0])
        self.assertEqual(reverse['hkl'], [1, 1, 0])
        self.assertEqual(forward['real'], reverse['real'])
        self.assertEqual(forward['imag'], -reverse['imag'])
        self.assertEqual(pair['normalizedContrast'], 0)

    def test_quartz_pair_contrast_negative_control_and_mirror(self):
        def calculate(hkl, atoms=self.quartz['atoms']):
            return run({**self.quartz, 'atoms': atoms, 'hkl': hkl, 'scatteringFactors': _COMPLEX})

        for hkl in ([1, 1, 0], [1, 0, 1], [0, 0, 3], [0, 0, 1]):
            with self.subTest(hkl=hkl):
                powder_result = calculate(hkl)
                pair = powder_result['friedelPair']
                fwd, rev = pair['forward'], pair['reverse']
                plus, minus = _reference(hkl), _reference([-i for i in hkl])
                for observed, expected in ((fwd, plus), (rev, minus)):
                    self.assertAlmostEqual(observed['real'], expected.real, places=10)
                    self.assertAlmostEqual(observed['imag'], expected.imag, places=10)
                    self.assertAlmostEqual(observed['intensity'], abs(expected) ** 2, places=8)
                self.assertAlmostEqual(pair['intensityDifference'], abs(plus) ** 2 - abs(minus) ** 2, places=8)
                if hkl == [1, 1, 0]:
                    self.assertAlmostEqual(fwd['intensity'], 746.039310537363, places=8)
                    self.assertAlmostEqual(rev['intensity'], 634.2148200176586, places=8)
                    self.assertAlmostEqual(pair['normalizedContrast'], .081017319958853, places=12)
                    mirror = [{**atom, 'fractional': [-v for v in atom['fractional']]}
                              for atom in self.quartz['atoms']]
                    swapped = calculate(hkl, mirror)['friedelPair']
                    self.assertAlmostEqual(swapped['forward']['intensity'], rev['intensity'], places=8)
                    self.assertAlmostEqual(swapped['reverse']['intensity'], fwd['intensity'], places=8)
                    self.assertAlmostEqual(swapped['normalizedContrast'], -pair['normalizedContrast'], places=10)
                elif hkl == [0, 0, 1]:
                    self.assertEqual(pair['intensitySum'], 0)
                    self.assertIsNone(pair['normalizedContrast'])
                else:
                    self.assertAlmostEqual(pair['intensityDifference'], 0, places=8)
                    self.assertGreater(pair['intensitySum'], 0)
                json.dumps(powder_result, allow_nan=False)

    def test_powder_against_all_signed_members(self):
        request = {**self.quartz, 'hkl': [1, 1, 0], 'scatteringFactors': _COMPLEX}
        result = run(request)
        self.assertEqual(len(result['reflections']), 5 ** 3 - 1)
        self.assertEqual(result['statistics']['friedelPairs'], (5 ** 3 - 1) // 2)
        expected = defaultdict(dict)
        for hkl in product(range(-2, 3), repeat=3):
            if hkl == (0, 0, 0):
                continue
            key = _geometry_key(hkl)
            intensity = abs(_reference(hkl)) ** 2
            if result['parameters']['wavelength'] <= 2 * _d_spacing(key) and intensity > 1e-12:
                expected[key][hkl] = intensity
        self.assertEqual(len(result['powder']), len(expected))
        for key, observed in zip(sorted(expected, key=_d_spacing, reverse=True), result['powder'], strict=True):
            intended = expected[key]
            self.assertAlmostEqual(_d_spacing(key), observed['dSpacing'], places=9)
            self.assertAlmostEqual(sum(intended.values()), observed['intensity'], places=7)
            self.assertEqual(len(intended), observed['multiplicity'])
            self.assertEqual(set(intended), {tuple(hkl) for hkl in observed['hkls']})

        mirror = [{**atom, 'fractional': [-value for value in atom['fractional']]}
                  for atom in self.quartz['atoms']]
        mirrored = run({**request, 'atoms': mirror})
        # Inversion swaps each pair. The angular grouping then hides that swap.
        for original, inverted in zip(result['powder'], mirrored['powder'], strict=True):
            self.assertAlmostEqual(original['twoTheta'], inverted['twoTheta'], places=10)
            self.assertAlmostEqual(original['intensity'], inverted['intensity'], places=7)
            self.assertEqual(original['multiplicity'], inverted['multiplicity'])

    def test_complex_weight_alone_does_not_ensure_contrast(self):
        proportional = run({**self.quartz, 'hkl': [1, 1, 0], 'scatteringFactors': {
            'Si': {'re': 14, 'im': 1.75}, 'O': {'re': 8, 'im': 1},
        }})
        self.assertAlmostEqual(proportional['friedelPair']['intensityDifference'], 0, places=8)
        self.assertGreater(proportional['friedelPair']['intensitySum'], 0)

        real_request = {**self.quartz, 'hkl': [1, 1, 0]}
        real = run({**real_request, 'scatteringFactors': {'Si': 14, 'O': 8}})
        explicit = run({**real_request, 'scatteringFactors': {'Si': {'re': 14, 'im': 0}, 'O': 8}})
        self.assertEqual(explicit['powder'], real['powder'])
        self.assertEqual(explicit['friedelPair']['intensityDifference'], 0)

    def test_one_friedel_member_may_vanish(self):
        result = run({
            'preset': 'custom', 'cell': [[4, 0, 0], [0, 2, 0], [0, 0, 1]],
            'hkl': [1, 0, 0], 'maxIndex': 1,
            'atoms': [
                {'species': 'X', 'fractional': [0, 0, 0]},
                {'species': 'Y', 'fractional': [.25, 0, 0], 'factor': {'re': 0, 'im': -2}, 'occupancy': .5},
            ],
        })
        pair = result['friedelPair']
        self.assertEqual(pair['forward']['components'][1]['weight'], {'re': 0, 'im': -1})
        self.assertEqual(pair['forward']['intensity'], 4)
        self.assertEqual(pair['reverse']['intensity'], 0)
        self.assertEqual(pair['normalizedContrast'], 1)
        first = result['powder'][0]
        self.assertEqual(first['dSpacing'], 4)
        self.assertEqual(first['hkls'], [[1, 0, 0]])
        self.assertEqual(first['multiplicity'], 1)
        self.assertEqual(first['intensity'], 4)

    def test_malformed_complex_object_and_pair_switch(self):
        invalid = [
            {'re': 1}, {'im': 2}, {'re': 1, 'im': 0, 'extra': 0},
            {'re': True, 'im': 0}, {'re': 1, 'im': '2'}, {'re': 1, 'im': float('inf')},
            {'re': float('nan'), 'im': 1}, {'re': 1000.1, 'im': -1}, '1+2j', [1, 2],
        ]
        for factor in invalid:
            with self.subTest(factor=factor), self.assertRaises(ValueError):
                run({**self.quartz, 'scatteringFactors': {'Si': factor}})
        for value in ('false', None, 1):
            with self.subTest(switch=value), self.assertRaises(ValueError):
                run({**self.quartz, 'compareFriedel': value})

    def test_explicit_pair_off_keeps_complex_powder(self):
        request = {**self.quartz, 'hkl': [1, 1, 0], 'scatteringFactors': _COMPLEX}
        enabled = run(request)
        disabled = run({**request, 'compareFriedel': False})
        self.assertIn('friedelPair', enabled)
        self.assertNotIn('friedelPair', disabled)
        del enabled['friedelPair']
        self.assertEqual(enabled, disabled)

    def test_authenticated_classroom_comparisons(self):
        content = _CIF.read_bytes().decode('utf-8')
        data = quartz_study({'content': content})
        self.assertEqual(data['model'], 'kinematic-constant-scalar')
        self.assertEqual(data['source']['sha256'], _CIF_SHA)
        self.assertEqual(data['atomCount'], 9)
        pairs = data['comparisons']
        self.assertEqual(pairs['real110']['normalizedContrast'], 0)
        self.assertGreater(pairs['illustrative110']['intensityDifference'], 111)
        self.assertAlmostEqual(pairs['illustrative110']['intensityDifference'],
                               -pairs['mirrored110']['intensityDifference'], places=8)
        self.assertAlmostEqual(pairs['illustrative101']['normalizedContrast'], 0, places=10)
        self.assertIsNone(pairs['illustrative001']['normalizedContrast'])
        self.assertGreater(pairs['illustrative003']['intensitySum'], 300)
        self.assertAlmostEqual(pairs['illustrative003']['normalizedContrast'], 0, places=10)
        with self.assertRaisesRegex(ValueError, 'COD 9005017'):
            quartz_study({'content': content.replace('4.9137', '4.9138', 1)})

    def test_classroom_fixture_matches_native_results(self):
        recorded = json.loads((SITE / 'scripts/fixtures/quartz-friedel.json').read_bytes())
        actual = quartz_study({'content': _CIF.read_bytes().decode('utf-8')})

        def check_numbers(expected, observed):
            if isinstance(expected, dict):
                self.assertEqual(set(expected), set(observed))
                for key in expected:
                    check_numbers(expected[key], observed[key])
            elif isinstance(expected, list):
                self.assertEqual(len(expected), len(observed))
                for e, o in zip(expected, observed, strict=True):
                    check_numbers(e, o)
            elif isinstance(expected, float):
                self.assertAlmostEqual(expected, observed, places=8)
            else:
                self.assertEqual(expected, observed)

        check_numbers(recorded, actual)


if __name__ == '__main__':
    unittest.main()
