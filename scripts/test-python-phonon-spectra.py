"""Independent Gamma-mode, representation, and optical selection checks."""
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from phonon_spectra import run_phonons


def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b)))
             for j in range(len(b[0]))] for i in range(len(a))]


def transpose(a):
    return [list(row) for row in zip(*a)]


def matrix_key(a):
    return tuple(tuple(row) for row in a)


class PhononSpectraTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.results = {preset: run_phonons({'preset': preset}) for preset in ('silicon', 'gaas', 'nacl')}

    def test_known_primitive_gamma_decompositions(self):
        expected = {'silicon': ({'T1u': 1, 'T2g': 1}, 'T1u', 'T2g'),
                    'gaas': ({'T2': 2}, 'T2', 'T2'),
                    'nacl': ({'T1u': 2}, 'T1u', 'T1u')}
        for preset, result in self.results.items():
            with self.subTest(preset=preset):
                mechanical, acoustic, optical = expected[preset]
                self.assertEqual({row['irrep']: row['multiplicity'] for row in result['decomposition']['mechanical']}, mechanical)
                self.assertEqual(result['formulas']['acoustic'], acoustic)
                self.assertEqual(result['formulas']['optical'], optical)
                self.assertEqual([result['dimensions'][key] for key in ('mechanical', 'acoustic', 'optical')], [6, 3, 3])
                self.assertTrue(all(item['passed'] for item in result['checks']))
                self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)

    def test_group_orders_classes_and_character_orthogonality(self):
        for preset, result in self.results.items():
            sizes = [row['size'] for row in result['classes']]
            self.assertEqual(sizes, [1, 8, 3, 6, 6] if preset == 'gaas' else [1, 8, 6, 6, 3, 1, 8, 6, 6, 3])
            table = result['characterTable']
            for i, row in enumerate(table):
                for j, other in enumerate(table):
                    inner = sum(size * a * b for size, a, b in zip(sizes, row['characters'], other['characters']))
                    self.assertEqual(inner, result['group']['order'] if i == j else 0)

    def test_mechanical_matrices_form_a_representation(self):
        # Independent matrix multiplication for every group-element pair.
        for preset, result in self.results.items():
            operations = result['operations']
            lookup = {matrix_key(op['rotation']): op for op in operations}
            self.assertEqual(len(lookup), result['group']['order'])
            for left in operations:
                self.assertEqual(sum(left['displacementMatrix'][i][i] for i in range(6)), left['mechanical'])
                self.assertEqual(mm(left['rotation'], transpose(left['rotation'])), [[1,0,0],[0,1,0],[0,0,1]])
                for right in operations:
                    combined = lookup[matrix_key(mm(left['rotation'], right['rotation']))]
                    self.assertEqual(mm(left['displacementMatrix'], right['displacementMatrix']), combined['displacementMatrix'])

    def test_inversion_distinguishes_same_and_different_species(self):
        inversion = [[-1,0,0],[0,-1,0],[0,0,-1]]
        silicon = next(op for op in self.results['silicon']['operations'] if op['rotation'] == inversion)
        nacl = next(op for op in self.results['nacl']['operations'] if op['rotation'] == inversion)
        self.assertEqual((silicon['permutation'], silicon['mechanical'], silicon['optical']), ([1,0], 0, 3))
        self.assertEqual((nacl['permutation'], nacl['mechanical'], nacl['optical']), ([0,1], -6, -3))
        self.assertFalse(any(op['rotation'] == inversion for op in self.results['gaas']['operations']))

    def test_selection_rules_and_mutual_exclusion(self):
        for preset, expected in {'silicon': (False, True), 'gaas': (True, True), 'nacl': (True, False)}.items():
            result = self.results[preset]
            for mode in result['modes']:
                self.assertEqual((mode['ir'], mode['raman']), expected)
            self.assertEqual(result['dimensions']['vector'], 3)
            self.assertEqual(result['dimensions']['symmetricSquare'], 6)
        self.assertEqual(self.results['silicon']['formulas']['symmetricSquare'], 'A1g + Eg + T2g')
        self.assertEqual(self.results['gaas']['formulas']['symmetricSquare'], 'A1 + E + T2')

    def test_raman_tensors_transform_like_relative_displacements(self):
        # Cartesian tensor covariance independently ties displayed mode labels
        # to their actual site-permutation representation, including Si inversion.
        for preset in ('silicon', 'gaas'):
            result = self.results[preset]
            tensors = [mode['ramanTensor'] for mode in result['modes']]
            for op in result['operations']:
                rotation = op['rotation']
                sign = 1 if op['permutation'] == [0,1] else -1
                for mode in range(3):
                    transformed = mm(mm(rotation, tensors[mode]), transpose(rotation))
                    expected = [[sum(sign * rotation[nu][mode] * tensors[nu][i][j] for nu in range(3))
                                 for j in range(3)] for i in range(3)]
                    self.assertEqual(transformed, expected)

    def test_parallel_crossed_angular_selection(self):
        for angle in (0, 13, 45, 91, 180, 319):
            parallel = run_phonons({'angle': angle, 'mode': 'z', 'polarization': 'parallel'})['polarization']
            crossed = run_phonons({'angle': angle, 'mode': 'z', 'polarization': 'crossed'})['polarization']
            self.assertAlmostEqual(parallel['intensity'], math.sin(2 * math.radians(angle)) ** 2)
            self.assertAlmostEqual(crossed['intensity'], math.cos(2 * math.radians(angle)) ** 2)
            self.assertAlmostEqual(parallel['intensity'] + crossed['intensity'], 1)
            summed = run_phonons({'angle': angle, 'mode': 'sum'})['polarization']['intensity']
            individual = sum(run_phonons({'angle': angle, 'mode': mode})['polarization']['intensity'] for mode in ('x','y','z'))
            self.assertAlmostEqual(summed, individual)

    def test_infrared_channel_and_forbidden_raman(self):
        for angle in (0, 17, 45, 90):
            nacl = run_phonons({'preset': 'nacl', 'angle': angle, 'mode': 'sum', 'channel': 'ir'})
            self.assertAlmostEqual(nacl['polarization']['intensity'], 1)
            self.assertEqual(nacl['polarization']['ramanIntensity'], 0)
            silicon = run_phonons({'preset': 'silicon', 'angle': angle, 'mode': 'sum', 'channel': 'ir'})
            self.assertEqual(silicon['polarization']['intensity'], 0)
            crossed = run_phonons({'preset': 'nacl', 'angle': angle, 'mode': 'x', 'channel': 'ir', 'polarization': 'crossed'})
            self.assertAlmostEqual(crossed['polarization']['intensity'], math.cos(math.radians(angle)) ** 2)

    def test_explicit_assumed_spectrum_fwhm_and_scaling(self):
        result = run_phonons({'preset': 'silicon', 'angle': 45, 'frequency_cm1': 400, 'width_cm1': 30})
        spectrum = result['spectrum']
        lookup = {point['wavenumber']: point['intensity'] for point in spectrum['points']}
        self.assertFalse(spectrum['predictedFrequency'])
        self.assertFalse(spectrum['absoluteIntensity'])
        self.assertAlmostEqual(lookup[400], 1)
        self.assertAlmostEqual(lookup[385], 0.5)
        self.assertAlmostEqual(lookup[415], 0.5)
        forbidden = run_phonons({'preset': 'nacl', 'channel': 'raman', 'angle': 45})
        self.assertTrue(all(point['intensity'] == 0 for point in forbidden['spectrum']['points']))

    def test_animation_periodicity_and_relative_coordinate_basis(self):
        for preset in ('silicon', 'gaas', 'nacl'):
            result = run_phonons({'preset': preset, 'mode': 'x', 'steps': 16, 'amplitude': 0.1})
            self.assertEqual(len(result['frames']), 17)
            self.assertEqual(len(result['cellVertices']), 8)
            self.assertEqual(len(result['cellEdges']), 12)
            for initial, final in zip(result['frames'][0]['sites'], result['frames'][-1]['sites']):
                for x, y in zip(initial['cartesian'], final['cartesian']):
                    self.assertAlmostEqual(x, y)
            peak = result['frames'][4]['sites']
            self.assertAlmostEqual(peak[0]['cartesian'][0] - result['sites'][0]['cartesian'][0], 0.1)
            self.assertAlmostEqual(peak[1]['cartesian'][0] - result['sites'][1]['cartesian'][0], -0.1)

    def test_input_validation(self):
        invalid = [None, [], {'preset':'missing'}, {'angle':float('nan')}, {'angle':True},
                   {'angle':361}, {'steps':4}, {'steps':12.0}, {'steps':True}, {'amplitude':-1},
                   {'frequency_cm1':0}, {'width_cm1':0}, {'channel':'neutron'},
                   {'polarization':'circular'}, {'mode':'a'}, {'frequency_cm1':'300'}]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run_phonons(payload)


if __name__ == '__main__':
    unittest.main()
