"""Validate cross-site teaching metadata and independently check its worked math."""
from fractions import Fraction
from itertools import permutations, product
from math import cos, pi, sin
from pathlib import Path
import json
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((ROOT / 'dist/data' / name).read_text(encoding='utf8'))


def matmul(a, b):
    return [[sum(x*y for x, y in zip(row, col)) for col in zip(*b)] for row in a]


def transpose(a):
    return list(map(list, zip(*a)))


def trace(a):
    return sum(a[i][i] for i in range(len(a)))


def symmetric_square_character(rotation):
    return Fraction(trace(rotation)**2 + trace(matmul(rotation, rotation)), 2)


class MaterialObservablesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load('material-observables.json')
        cls.lessons = {x['id']: x for x in cls.data['lessons']}
        cls.exercises = {x['id']: x for x in cls.data['exercises']}
        cls.cases = {x['id']: x for x in cls.data['cases']}
        cls.materials = {x['id']: x for x in load('symmetry-materials.json')['materials']}

    def test_original_course_and_sources_are_complete(self):
        self.assertEqual(self.data['schemaVersion'], 1)
        self.assertEqual(len(self.lessons), 8)
        self.assertEqual(len(self.lessons), len(self.data['lessons']))
        self.assertEqual(len(self.exercises), 8)
        self.assertGreaterEqual(len(self.data['scope']), 3)
        source_ids = {x['id'] for x in self.data['sources']}
        self.assertEqual(len(source_ids), len(self.data['sources']))
        for source in self.data['sources']:
            self.assertTrue(source['url'].startswith('https://'))
            self.assertTrue(source['title'] and source['note'])
        for lesson in self.lessons.values():
            with self.subTest(lesson=lesson['id']):
                self.assertTrue(lesson['title'] and lesson['summary'])
                self.assertGreaterEqual(len(lesson['sections']), 3)
                self.assertTrue(all(s['title'] and s['text'] for s in lesson['sections']))
                self.assertTrue(lesson['examples'])
                for example in lesson['examples']:
                    self.assertGreaterEqual(len(example['steps']), 3)
                    self.assertTrue(example['result'])
                self.assertTrue(set(lesson['references']) <= source_ids)
                self.assertTrue(set(lesson['materialIds']) <= self.materials.keys())
                self.assertTrue(lesson['exerciseIds'])
                for exercise_id in lesson['exerciseIds']:
                    self.assertEqual(self.exercises[exercise_id]['lesson'], lesson['id'])

    def test_stepwise_exercises_have_unique_checkable_choices(self):
        sources = {s['id'] for s in self.data['sources']}
        for exercise in self.exercises.values():
            with self.subTest(exercise=exercise['id']):
                self.assertIn(exercise['lesson'], self.lessons)
                self.assertEqual(len(exercise['steps']), 4)
                self.assertTrue(exercise['title'] and exercise['prompt'])
                self.assertTrue(set(exercise['references']) <= sources)
                for step in exercise['steps']:
                    self.assertTrue(step['prompt'] and step['hint'] and step['explanation'])
                    self.assertEqual(len(step['choices']), len(set(step['choices'])))
                    self.assertGreaterEqual(len(step['choices']), 3)
                    self.assertIs(type(step['answer']), int)
                    self.assertIn(step['answer'], range(len(step['choices'])))

    def test_cases_link_the_same_material_across_all_surfaces(self):
        self.assertEqual(set(self.cases), {'silicon', 'gaas', 'nacl'})
        for case in self.cases.values():
            with self.subTest(material=case['id']):
                self.assertEqual(case['phononPreset'], case['id'])
                self.assertTrue(case['phase'] and case['question'] and case['answer'])
                self.assertGreaterEqual(len(case['limitations']), 2)
                self.assertEqual(case['expected']['spaceGroup'], self.materials[case['id']]['spaceGroup']['number'])
                self.assertTrue(set(case['lessonIds']) <= self.lessons.keys())
                self.assertTrue(set(case['exerciseIds']) <= self.exercises.keys())
                for kind, path in [('classroom', 'classroom/observables'), ('phonons', 'compute/phonons'), ('tensors', 'compute/tensors'), ('atlas', 'atlas/materials')]:
                    route = urlsplit(case['routes'][kind][1:])
                    self.assertEqual(route.path, path)
                    params = parse_qs(route.query)
                    self.assertEqual(params['material'], [case['id']])
                    if kind == 'classroom':
                        self.assertIn(params['lesson'][0], case['lessonIds'])

    def test_case_dimensions_and_optical_selection_rules(self):
        # Independent representation-type sets: polar vector and symmetric
        # second-rank Cartesian functions at the cubic Gamma point.
        ir = {'Oh': {'T1u'}, 'Td': {'T2'}}
        raman = {'Oh': {'A1g', 'Eg', 'T2g'}, 'Td': {'A1', 'E', 'T2'}}
        dimensions = {'T1u': 3, 'T2g': 3, 'T2': 3}
        for name, case in self.cases.items():
            expected = case['expected']
            n = expected['primitiveAtoms']
            self.assertEqual(expected['mechanicalDimension'], 3*n)
            self.assertEqual(expected['acousticDimension'], 3)
            self.assertEqual(expected['opticalDimension'], 3*n-3)
            self.assertEqual(dimensions[expected['opticalIrrep']], 3*n-3)
            group = 'Td' if name == 'gaas' else 'Oh'
            self.assertEqual(expected['irAllowed'], expected['opticalIrrep'] in ir[group])
            self.assertEqual(expected['ramanAllowed'], expected['opticalIrrep'] in raman[group])

    def test_rocksalt_inversion_really_fixes_both_primitive_sites(self):
        # In conventional cubic coordinates, FCC lattice vectors have
        # half-integer components whose doubled sum is even.
        sites = [(Fraction(0),)*3, (Fraction(1, 2),)*3]
        fixed = 0
        for position in sites:
            shift = tuple(-2*x for x in position)
            doubled = [2*x for x in shift]
            is_fcc_translation = all(x.denominator == 1 for x in doubled) and sum(doubled) % 2 == 0
            fixed += is_fcc_translation
        self.assertEqual(fixed, 2)
        self.assertEqual(-3*fixed, self.cases['nacl']['expected']['inversionMechanicalCharacter'])

    def test_raman_values_come_from_matrix_contraction(self):
        tensor = [[0, 1, 0], [1, 0, 0], [0, 0, 0]]
        for degrees, expected in [(0, (0, 1)), (22.5, (.5, .5)), (45, (1, 0))]:
            theta = degrees*pi/180
            incoming = [cos(theta), sin(theta), 0]
            crossed = [-sin(theta), cos(theta), 0]
            transformed = [sum(a*b for a, b in zip(row, incoming)) for row in tensor]
            strengths = [sum(a*b for a, b in zip(outgoing, transformed))**2 for outgoing in [incoming, crossed]]
            for value, target in zip(strengths, expected):
                self.assertAlmostEqual(value, target, places=13)
        self.assertEqual(self.cases['silicon']['expected']['ramanParallelRelative'], 1)

    def test_gaas_shear_answer_uses_full_tensor_contraction(self):
        data = self.cases['gaas']['expected']
        coefficient = Fraction(data['piezoCoefficient'])
        shear = Fraction(data['shearTensorYZ'])
        strain = [[Fraction(0) for _ in range(3)] for _ in range(3)]
        strain[1][2] = strain[2][1] = shear
        polarization = [sum(coefficient*strain[j][k] for j, k in product(range(3), repeat=2) if len({i, j, k}) == 3) for i in range(3)]
        self.assertEqual(polarization, [Fraction(x) for x in data['polarization']])
        self.assertEqual(polarization, [Fraction(1, 50), 0, 0])

    def test_allowed_tensor_counts_from_independent_group_character_average(self):
        # Character averaging counts invariant tensors without solving the
        # component equations used by the calculation engine. Elasticity is
        # Sym^2(Sym^2 V); strain-form piezoelectricity is V x Sym^2 V.
        groups = {'Oh': [], 'Td': []}
        for perm in permutations(range(3)):
            for signs in product((-1, 1), repeat=3):
                rotation = [[signs[i] if j == perm[i] else 0 for j in range(3)] for i in range(3)]
                groups['Oh'].append(rotation)
                if signs[0]*signs[1]*signs[2] == 1:
                    # Preserve the tetrahedron whose vertices have xyz>0.
                    groups['Td'].append(rotation)
        self.assertEqual([len(groups[g]) for g in ('Oh', 'Td')], [48, 24])
        for name, case in self.cases.items():
            group = groups['Td' if name == 'gaas' else 'Oh']
            dielectric = elastic = piezo = Fraction(0)
            for rotation in group:
                symmetric = symmetric_square_character(rotation)
                dielectric += symmetric
                piezo += trace(rotation)*symmetric
                squared = matmul(rotation, rotation)
                elastic += (symmetric**2 + symmetric_square_character(squared))/2
            expected = case['expected']
            self.assertEqual(dielectric/len(group), expected['dielectricParameters'])
            self.assertEqual(elastic/len(group), expected['elasticParameters'])
            self.assertEqual(piezo/len(group), expected['piezoParameters'])

    def test_magnetoelectric_prime_signs_on_all_nine_basis_tensors(self):
        identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
        inversion = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
        for rotation, time, determinant, expected_dimension in [(inversion, 1, -1, 0), (identity, -1, 1, 0), (inversion, -1, -1, 9)]:
            preserved = 0
            for i, j in product(range(3), repeat=2):
                alpha = [[int(a == i and b == j) for b in range(3)] for a in range(3)]
                rotated = matmul(matmul(rotation, alpha), transpose(rotation))
                transformed = [[time*determinant*x for x in row] for row in rotated]
                preserved += transformed == alpha
            self.assertEqual(preserved, expected_dimension)
        answers = [step['choices'][step['answer']] for step in self.exercises['magnetic-parity']['steps']]
        self.assertEqual(answers[-1], '9')


if __name__ == '__main__':
    unittest.main(verbosity=2)
