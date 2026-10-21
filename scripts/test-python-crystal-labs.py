"""Independent geometric, magnetic and matching checks for material models."""
import copy
import itertools
import json
import math
from pathlib import Path
import random
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
import crystal_labs as labs


I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


def apply(matrix, vector):
    return [sum(a * b for a, b in zip(row, vector)) for row in matrix]


def length(vector):
    return math.sqrt(sum(x * x for x in vector))


def make_model(atoms=None, rotation=None, translation=None, time_reversal=False, cell=None):
    return {
        'cell': cell or copy.deepcopy(I3),
        'atoms': atoms or [{'id': 'a', 'element': 'Fe', 'frac': [.2, .3, .4], 'moment': [1, 2, 3]}],
        'operations': [{'id': 'test', 'label': '测试操作', 'rotation': rotation or copy.deepcopy(I3),
                        'translation': translation or [0, 0, 0], 'timeReversal': time_reversal}],
    }


def calculate(model):
    return labs.run({'lab': 'crystal', 'model': model, 'operationId': 'test'})


class CrystalLabsTests(unittest.TestCase):
    def assert_vector(self, actual, expected, places=10):
        self.assertEqual(len(actual), len(expected))
        for a, b in zip(actual, expected):
            self.assertAlmostEqual(a, b, places=places)

    def test_cartesian_geometry_and_unwrapped_periodic_translation(self):
        cell = [[2, .6, .2], [0, 3, .1], [0, 0, 4]]
        result = calculate(make_model(cell=cell, translation=[1, -2, 1]))
        self.assertTrue(result['chemicalSymmetry'])
        self.assertTrue(result['magneticSymmetry'])
        atom = result['atoms'][0]
        self.assert_vector(atom['cartesian'], [.66, .94, 1.6])
        self.assert_vector(atom['transformed']['unwrapped'], [1.2, -1.7, 1.4])
        self.assert_vector(atom['transformed']['wrapped'], [.2, .3, .4])
        self.assertEqual(atom['transformed']['cellTranslation'], [1, -2, 1])
        self.assert_vector(atom['transformed']['cartesianUnwrapped'], [1.66, -4.96, 5.6])
        self.assertEqual(result['chemicalMapping'][0]['periodicShift'], [1, -2, 1])
        self.assertEqual(len(result['cellVertices']), 8)
        self.assertEqual(len(result['cellEdges']), 12)
        self.assert_vector(result['cellVertices'][7], [2.8, 3.1, 4])
        self.assertEqual(result['latticeAxes'][1]['end'], [.6, 3, 0])

    def test_mirror_inversion_and_time_reversal_act_on_axial_moments(self):
        mirror = [[1, 0, 0], [0, 1, 0], [0, 0, -1]]
        result = calculate(make_model(rotation=mirror))
        self.assert_vector(result['atoms'][0]['transformed']['unwrapped'], [.2, .3, -.4])
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [-1, -2, 3])
        inverse = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
        result = calculate(make_model(rotation=inverse))
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [1, 2, 3])
        result = calculate(make_model(rotation=mirror, time_reversal=True))
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [1, 2, -3])
        result = calculate(make_model(time_reversal=True))
        self.assertTrue(result['chemicalSymmetry'])
        self.assertFalse(result['magneticSymmetry'])
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [-1, -2, -3])
        self.assert_vector(result['atoms'][0]['transformed']['unwrapped'], [.2, .3, .4])

    def test_nonorthogonal_fractional_rotation_becomes_cartesian_rotation(self):
        # a=(1,0,0), b=(-1/2,sqrt(3)/2,0); R represents a +120° rotation.
        cell = [[1, -.5, 0], [0, math.sqrt(3) / 2, 0], [0, 0, 2]]
        rotation = [[0, -1, 0], [1, -1, 0], [0, 0, 1]]
        atoms = [{'id': 'a', 'element': 'Mn', 'frac': [0, 0, 0], 'moment': [1, 0, 0]}]
        result = calculate(make_model(cell=cell, rotation=rotation, atoms=atoms))
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [-.5, math.sqrt(3) / 2, 0])
        self.assertTrue(result['chemicalSymmetry'])
        self.assertFalse(result['magneticSymmetry'])
        self.assertLess(result['operation']['metricError'], 1e-12)
        # Reflection z in this cell still preserves the Euclidean metric.
        result = calculate(make_model(cell=cell, rotation=[[1, 0, 0], [0, 1, 0], [0, 0, -1]]))
        self.assert_vector(result['atoms'][0]['transformed']['moment'], [-1, -2, 3])

    def test_nearest_image_in_skew_cell_matches_independent_exhaustive_search(self):
        cell = [[1, .9, .1], [0, .2, .05], [0, 0, 1]]
        upper = labs._qr_upper(cell)
        rng = random.Random(20261021)
        for delta in [[.49, .49, 0]] + [[rng.uniform(-.9, .9) for _ in range(3)] for _ in range(30)]:
            result, shift = labs._nearest_periodic_image(delta, cell, upper, [0])
            distances = [length(apply(cell, [a - b for a, b in zip(delta, n)]))
                         for n in itertools.product(range(-4, 5), repeat=3)]
            self.assertAlmostEqual(result, min(distances), places=11)
            self.assertAlmostEqual(result, length(apply(cell, [a - b for a, b in zip(delta, shift)])), places=11)
        delta = [.49, .49, 0]
        result, shift = labs._nearest_periodic_image(delta, cell, upper, [0])
        self.assertNotEqual(shift, [round(x) for x in delta])
        self.assertLess(result, .12)

    def test_species_and_magnetic_symmetries_are_distinguished(self):
        # The half translation swaps the two magnetic sublattices.
        atoms = [{'id': 'up', 'element': 'Mn', 'frac': [0, 0, 0], 'moment': [0, 0, 1]},
                 {'id': 'down', 'element': 'Mn', 'frac': [.5, 0, 0], 'moment': [0, 0, -1]}]
        model = make_model(atoms=atoms, translation=[.5, 0, 0])
        result = calculate(model)
        self.assertTrue(result['chemicalSymmetry'])
        self.assertFalse(result['magneticSymmetry'])
        model['operations'][0]['timeReversal'] = True
        result = calculate(model)
        self.assertTrue(result['magneticSymmetry'])
        self.assertEqual({(m['sourceId'], m['targetId']) for m in result['magneticMapping']},
                         {('up', 'down'), ('down', 'up')})
        # Chemistry cannot be discarded even when the geometry coincides.
        model['atoms'][1]['element'] = 'O'
        self.assertFalse(calculate(model)['chemicalSymmetry'])
        self.assertFalse(calculate(model)['magneticSymmetry'])

    def test_matching_uses_augmenting_paths_and_independent_magnetic_graph(self):
        # Near-tolerance adversary: source 0 can match either site, source 1 only
        # site 0. A nearest-first greedy matcher incorrectly reports failure.
        atoms = [{'id': 'a', 'element': 'X', 'frac': [0, 0, 0]},
                 {'id': 'b', 'element': 'X', 'frac': [1.4e-7, 0, 0]}]
        model = make_model(atoms=atoms, rotation=[[-1, 0, 0], [0, -1, 0], [0, 0, -1]],
                           translation=[.6e-7, 0, 0])
        result = calculate(model)
        self.assertTrue(result['chemicalSymmetry'])
        self.assertEqual([(m['sourceId'], m['targetId']) for m in result['chemicalMapping']],
                         [('a', 'b'), ('b', 'a')])
        # Coincident test labels isolate matching logic (not a physical crystal).
        atoms = [{'id': str(i), 'element': 'X', 'frac': [0, 0, 0], 'moment': [0, 0, m]}
                 for i, m in enumerate([1, -1, 0])]
        result = calculate(make_model(atoms=atoms, time_reversal=True))
        self.assertTrue(result['chemicalSymmetry'])
        self.assertTrue(result['magneticSymmetry'])
        chemical_pairs = [(m['sourceId'], m['targetId']) for m in result['chemicalMapping']]
        magnetic_pairs = [(m['sourceId'], m['targetId']) for m in result['magneticMapping']]
        self.assertNotEqual(chemical_pairs, magnetic_pairs)
        self.assertEqual(magnetic_pairs, [('0', '1'), ('1', '0'), ('2', '2')])

    def test_non_symmetry_diagnostics_do_not_infer_a_group(self):
        result = calculate(make_model(translation=[.25, 0, 0]))
        self.assertFalse(result['chemicalSymmetry'])
        self.assertFalse(result['magneticSymmetry'])
        self.assertEqual(result['unmatched'], {'chemical': ['a'], 'magnetic': ['a']})
        self.assertAlmostEqual(result['diagnostics'][0]['nearestSameSpecies']['positionError'], .25)
        self.assertEqual(result['atomMapping'], [])
        self.assertNotIn('spaceGroup', result)
        self.assertNotIn('magneticSpaceGroup', result)

    def test_invalid_and_resource_excessive_inputs_fail_explicitly(self):
        model = make_model()
        mutations = [
            lambda m: m.update(cell=[[1, 0, 0], [0, 0, 0], [0, 0, 1]]),
            lambda m: m.update(cell=[[1, 0, 0], [0, 1e-10, 0], [0, 0, 1]]),
            lambda m: m.update(cell=[[1, 0, 0], [0, 1e-6, 0], [0, 0, 1]]),
            lambda m: m['cell'][0].__setitem__(0, True),
            lambda m: m['cell'][0].__setitem__(0, float('nan')),
            lambda m: m['atoms'][0]['frac'].__setitem__(0, float('inf')),
            lambda m: m['atoms'][0]['moment'].__setitem__(1, True),
            lambda m: m['atoms'][0]['frac'].__setitem__(0, 1_000_001),
            lambda m: m.update(atoms=[]),
            lambda m: m.update(atoms=m['atoms'] * 33),
            lambda m: m.update(atoms=m['atoms'] * 2),
            lambda m: m.update(operations=m['operations'] * 13),
            lambda m: m.update(operations=m['operations'] * 2),
            lambda m: m['operations'][0].update(rotation=[[2, 0, 0], [0, 1, 0], [0, 0, 1]]),
            lambda m: m['operations'][0].update(rotation=[[1, 1, 0], [0, 1, 0], [0, 0, 1]]),
            lambda m: m['operations'][0].update(rotation=[[.5, 0, 0], [0, 2, 0], [0, 0, 1]]),
            lambda m: m['operations'][0].update(timeReversal=1),
            lambda m: m.update(extra='x' * 200_000),
        ]
        for mutation in mutations:
            bad = copy.deepcopy(model)
            mutation(bad)
            with self.assertRaises(ValueError):
                calculate(bad)
        for operation_id in ('missing', [], None):
            with self.assertRaises(ValueError):
                labs.run({'model': model, 'operationId': operation_id})
        with self.assertRaises(ValueError):
            labs.run({'lab': 'arbitrary', 'model': model, 'operationId': 'test'})
        with self.assertRaises(ValueError):
            labs.run([])

    def test_material_catalog_models_and_expected_operations(self):
        path = ROOT / 'dist' / 'data' / 'symmetry-materials.json'
        self.assertTrue(path.exists(), 'Material catalog must accompany the lesson release')
        catalog = json.loads(path.read_text(encoding='utf-8'))
        materials = catalog['materials']
        self.assertEqual({material['id'] for material in materials},
                         {'nacl', 'silicon', 'gaas', 'iron', 'nio', 'mnf2'})
        tested = 0
        for material in materials:
            model = material['model']
            for operation in model['operations']:
                with self.subTest(material=material['id'], operation=operation['id']):
                    result = labs.run({'lab': 'crystal', 'model': model, 'operationId': operation['id']})
                    self.assertEqual(result['chemicalSymmetry'], operation['expectedChemicalSymmetry'])
                    self.assertEqual(result['magneticSymmetry'], operation['expectedMagneticSymmetry'])
                    self.assertTrue(all(math.isfinite(v) for atom in result['atoms']
                                        for v in atom['transformed']['cartesianUnwrapped']))
                    json.dumps(result, allow_nan=False)
                    tested += 1
        self.assertGreaterEqual(tested, 18)


if __name__ == '__main__':
    unittest.main(verbosity=2)
