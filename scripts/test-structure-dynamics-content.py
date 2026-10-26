"""Validate new course links and independently check its worked science examples."""

import cmath
import itertools
import json
import math
from pathlib import Path
import unittest
from urllib.parse import parse_qs


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'dist/data/structure-dynamics.json').read_text(encoding='utf-8'))
LESSONS = {item['id']: item for item in DATA['lessons']}
EXERCISES = {item['id']: item for item in DATA['exercises']}
CASES = {item['id']: item for item in DATA['cases']}
SOURCES = {item['id']: item for item in DATA['sources']}


def phase_sum(atoms, hkl):
    """Brute-force sum over actual sites, independent of lattice-factor shortcuts."""
    return sum(weight * cmath.exp(2j * math.pi * sum(h * x for h, x in zip(hkl, site)))
               for site, weight in atoms)


def fcc_basis_atoms(basis):
    translations = ((0, 0, 0), (0, .5, .5), (.5, 0, .5), (.5, .5, 0))
    return [(tuple((a + b) % 1 for a, b in zip(translation, offset)), weight)
            for translation in translations for offset, weight in basis]


def selected(exercise_id, step):
    entry = EXERCISES[exercise_id]['steps'][step]
    return entry['choices'][entry['answer']]


class CourseIntegrity(unittest.TestCase):
    def test_unique_ids_and_expected_scope(self):
        self.assertEqual(DATA['schemaVersion'], 1)
        self.assertEqual(len(LESSONS), 8)
        self.assertEqual(len(EXERCISES), 8)
        self.assertEqual(set(CASES), {'batio3', 'silicon', 'nacl', 'gaas'})
        for name, index in (('lessons', LESSONS), ('exercises', EXERCISES),
                            ('cases', CASES), ('sources', SOURCES)):
            self.assertEqual(len(DATA[name]), len(index), f'duplicate {name} ID')
        self.assertGreaterEqual(len(DATA['scope']), 4)

    def test_lesson_tool_and_material_links(self):
        self.assertEqual({lesson['tool'] for lesson in LESSONS.values()},
                         {'phase', 'diffraction', 'phonopy'})
        for lesson in LESSONS.values():
            with self.subTest(lesson=lesson['id']):
                self.assertTrue(lesson['title'].strip())
                self.assertTrue(lesson['summary'].strip())
                self.assertFalse(lesson['title'][0].isdigit())
                self.assertGreaterEqual(len(lesson['sections']), 3)
                self.assertTrue(lesson['examples'])
                self.assertTrue(lesson['exerciseIds'])
                for material in lesson['materialIds']:
                    self.assertIn(material, CASES)
                for exercise_id in lesson['exerciseIds']:
                    self.assertEqual(EXERCISES[exercise_id]['lesson'], lesson['id'])
                for section in lesson['sections']:
                    self.assertTrue(section['title'] and section['text'])
                for example in lesson['examples']:
                    self.assertTrue(example['title'] and example['result'])
                    self.assertGreaterEqual(len(example['steps']), 2)

    def test_exercises_have_four_usable_steps(self):
        count = 0
        for exercise in EXERCISES.values():
            with self.subTest(exercise=exercise['id']):
                self.assertIn(exercise['id'], LESSONS[exercise['lesson']]['exerciseIds'])
                self.assertEqual(len(exercise['steps']), 4)
                self.assertTrue(exercise['prompt'] and exercise['title'])
                for step in exercise['steps']:
                    count += 1
                    self.assertIs(type(step['answer']), int)
                    self.assertLess(step['answer'], len(step['choices']))
                    self.assertGreaterEqual(step['answer'], 0)
                    self.assertGreaterEqual(len(step['choices']), 3)
                    self.assertEqual(len(step['choices']), len(set(step['choices'])))
                    for field in ('prompt', 'hint', 'explanation'):
                        self.assertTrue(step[field].strip())
        self.assertEqual(count, 32)

    def test_all_references_resolve(self):
        for kind in ('lessons', 'exercises', 'cases'):
            for item in DATA[kind]:
                self.assertTrue(item['references'])
                for reference in item['references']:
                    self.assertIn(reference, SOURCES, (kind, item['id'], reference))
        for source in SOURCES.values():
            self.assertTrue(source['url'].startswith('https://'))
            self.assertTrue(source['title'] and source['note'])

    def test_case_routes_and_backlinks(self):
        for case in CASES.values():
            with self.subTest(material=case['id']):
                self.assertTrue(case['limitations'])
                self.assertTrue(case['question'] and case['answer'])
                for lesson_id in case['lessonIds']:
                    self.assertIn(case['id'], LESSONS[lesson_id]['materialIds'])
                for exercise_id in case['exerciseIds']:
                    self.assertIn(EXERCISES[exercise_id]['lesson'], case['lessonIds'])
                for tool, route in case['routes'].items():
                    path, query = route.split('?', 1)
                    self.assertEqual(parse_qs(query)['material'], [case['id']])
                    expected_path = {'classroom': '#classroom/structure-dynamics',
                                     'atlas': '#atlas/dynamics'}.get(tool, '#compute/' + tool)
                    self.assertEqual(path, expected_path)
                lesson = parse_qs(case['routes']['classroom'].split('?', 1)[1])['lesson'][0]
                self.assertIn(lesson, case['lessonIds'])

    def test_model_limits_are_explicit(self):
        scope = ' '.join(DATA['scope'])
        self.assertIn('合成', scope)
        self.assertIn('无量纲', scope)
        self.assertIn('恒定', scope)
        self.assertIn('不运行第一性原理', scope)
        bt_limits = ' '.join(CASES['batio3']['limitations'])
        self.assertIn('真实软模', bt_limits)
        self.assertIn('畴壁', bt_limits)
        self.assertIn('单分量', bt_limits)


class WorkedScience(unittest.TestCase):
    def assertComplexAlmostEqual(self, actual, expected, places=10):
        self.assertAlmostEqual(actual.real, expected.real, places=places)
        self.assertAlmostEqual(actual.imag, expected.imag, places=places)

    def test_landau_stationarity_curvature_and_energy(self):
        model = CASES['batio3']['expected']['landau']
        a, b, c, h = (model[key] for key in ('a', 'b', 'c', 'h'))
        q0 = math.sqrt(model['minimumQSquared'])
        for q in (-q0, q0):
            first = 2*a*q + 4*b*q**3 + 6*c*q**5 - h
            curvature = 2*a + 12*b*q*q + 30*c*q**4
            energy = a*q*q + b*q**4 + c*q**6 - h*q
            self.assertAlmostEqual(first, 0)
            self.assertAlmostEqual(curvature, model['minimumCurvature'])
            self.assertAlmostEqual(energy, model['minimumEnergy'])
            self.assertGreater(curvature, 0)
            self.assertLess(energy, 0)
        self.assertLess(2*a, 0)
        self.assertIn('±1/√2', selected('landau-minima', 1))
        self.assertIn('−1/4', selected('landau-minima', 3))

    def test_six_domains_from_full_cubic_group(self):
        # Orthogonal signed permutation matrices are the complete 48-element Oh.
        vector = (0, 0, 1)
        orbit = set()
        stabilizer = 0
        group_order = 0
        for permutation in itertools.permutations(range(3)):
            for signs in itertools.product((-1, 1), repeat=3):
                result = tuple(signs[row] * vector[permutation[row]] for row in range(3))
                orbit.add(result)
                stabilizer += result == vector
                group_order += 1
        expected = CASES['batio3']['expected']
        self.assertEqual(group_order, expected['parentPointGroupOrder'])
        self.assertEqual(stabilizer, expected['domainStabilizerOrder'])
        self.assertEqual(len(orbit), expected['domainCount'])
        self.assertEqual(orbit, {tuple(direction) for direction in expected['directions']})
        self.assertEqual(group_order // stabilizer, len(orbit))
        self.assertEqual(selected('count-polar-domains', 1), str(len(orbit)))

    def test_explicit_atom_sums_match_all_case_reflections(self):
        offsets = {'silicon': (0.25, 0.25, 0.25), 'gaas': (0.25, 0.25, 0.25),
                   'nacl': (0.5, 0.5, 0.5)}
        elements = {'silicon': ('Si', 'Si'), 'gaas': ('Ga', 'As'), 'nacl': ('Na', 'Cl')}
        for material, offset in offsets.items():
            expected = CASES[material]['expected']
            first, second = elements[material]
            weights = expected['scatteringFactors']
            atoms = fcc_basis_atoms([((0, 0, 0), weights[first]), (offset, weights[second])])
            self.assertEqual(len(atoms), 8)
            for reflection in expected['reflections']:
                with self.subTest(material=material, hkl=reflection['hkl']):
                    amplitude = phase_sum(atoms, reflection['hkl'])
                    self.assertComplexAlmostEqual(amplitude,
                                                  complex(reflection['real'], reflection['imag']))
                    self.assertAlmostEqual(abs(amplitude)**2, reflection['intensity'])
            self.assertEqual(expected['phononBranches'], 3 * expected['primitiveAtoms'])

    def test_centering_is_independent_of_basis_weights(self):
        for wa, wb in ((1, 1), (1, 2), (31, 33)):
            atoms = fcc_basis_atoms([((0, 0, 0), wa), ((.25, .25, .25), wb)])
            self.assertComplexAlmostEqual(phase_sum(atoms, (1, 0, 0)), 0j)
            self.assertComplexAlmostEqual(phase_sum(atoms, (2, 0, 0)), complex(4*(wa-wb)))
        expected = CASES['gaas']['expected']
        equal_atoms = fcc_basis_atoms([((0, 0, 0), 1), ((.25, .25, .25), 1)])
        self.assertAlmostEqual(abs(phase_sum(equal_atoms, (2, 0, 0)))**2,
                               expected['equalWeight200Intensity'])
        self.assertEqual(expected['equalWeight200Origin'], 'accidental')

    def test_screw_and_glide_scope(self):
        x, y, z = (.137, .223, .319)
        screw = [((x, y, z), 1), ((-x, -y, z+.5), 1)]
        glide = [((x, y, z), 1), ((-x, y, z+.5), 1)]
        for odd in (1, 3, 5):
            self.assertComplexAlmostEqual(phase_sum(screw, (0, 0, odd)), 0j)
            for k in (0, 1, 2):
                self.assertComplexAlmostEqual(phase_sum(glide, (0, k, odd)), 0j)
        self.assertGreater(abs(phase_sum(screw, (1, 0, 1))), .1)
        self.assertGreater(abs(phase_sum(glide, (1, 0, 1))), .1)
        self.assertAlmostEqual(abs(phase_sum(screw, (0, 0, 2))), 2)
        self.assertEqual(selected('nonsymmorphic-extinction', 0), '00l')
        self.assertEqual(selected('nonsymmorphic-extinction', 2), '0kl，l 偶数')

    def test_origin_shift_changes_only_phase(self):
        atoms = fcc_basis_atoms([((0, 0, 0), 1), ((.25, .25, .25), 2)])
        shift = (.113, -.219, .037)
        shifted = [(tuple(x+d for x, d in zip(site, shift)), weight) for site, weight in atoms]
        for hkl in ((1, 1, 1), (2, 2, 0), (2, 0, 0)):
            amplitude = phase_sum(atoms, hkl)
            moved = phase_sum(shifted, hkl)
            global_phase = cmath.exp(2j*math.pi*sum(h*d for h, d in zip(hkl, shift)))
            self.assertComplexAlmostEqual(moved, global_phase * amplitude)
            self.assertAlmostEqual(abs(amplitude)**2, abs(moved)**2)

    def test_two_atom_phase_exercise(self):
        atoms = [((0, 0, 0), 1), ((.5, 0, 0), 1)]
        self.assertComplexAlmostEqual(phase_sum(atoms, (1, 0, 0)), 0j)
        self.assertComplexAlmostEqual(phase_sum(atoms, (2, 0, 0)), 2+0j)
        self.assertEqual(selected('phasor-sum', 1), '(0,0)')
        self.assertEqual(selected('phasor-sum', 2), '(2,4)')

    def test_mass_weighted_acoustic_and_relative_vectors(self):
        masses = (1, 4)
        acoustic_e = tuple(value/math.sqrt(5) for value in (1, 2))
        optical_e = tuple(value/math.sqrt(5) for value in (2, -1))
        acoustic_u = tuple(e/math.sqrt(m) for e, m in zip(acoustic_e, masses))
        optical_u = tuple(e/math.sqrt(m) for e, m in zip(optical_e, masses))
        self.assertAlmostEqual(acoustic_u[0], acoustic_u[1])
        self.assertAlmostEqual(sum(a*b for a, b in zip(acoustic_e, optical_e)), 0)
        self.assertAlmostEqual(sum(m*u for m, u in zip(masses, optical_u)), 0)
        self.assertEqual(selected('mass-weighted-motion', 1), '(1,1)/√5')
        self.assertEqual(selected('validate-phonopy-data', 0), '6')


if __name__ == '__main__':
    unittest.main(verbosity=2)
