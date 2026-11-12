"""Independent checks of the material structures, references and guided exercises."""
from pathlib import Path
import json
import runpy
import unittest

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT / 'dist/data' / name).read_text(encoding='utf8'))


class MaterialsCourseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.materials = read('symmetry-materials.json')
        cls.derivations = read('symmetry-derivations.json')
        cls.course = read('symmetry-course-lessons.json')

    def test_six_materials_have_traceable_phase_and_model_assumptions(self):
        data = self.materials
        items = data['materials']
        self.assertEqual(len(items), 6)
        self.assertEqual(len({m['id'] for m in items}), 6)
        sources = {s['id'] for s in data['sources']}
        for s in data['sources']:
            self.assertTrue(s['url'].startswith('https://'))
            self.assertTrue(s['title'])
        for m in items:
            with self.subTest(material=m['id']):
                for field in ('phase', 'summary', 'limitations', 'sourceIds', 'model'):
                    self.assertTrue(m[field])
                self.assertTrue(set(m['sourceIds']) <= sources)
                self.assertEqual(len({a['id'] for a in m['model']['atoms']}), len(m['model']['atoms']))
                self.assertEqual(len({o['id'] for o in m['model']['operations']}), len(m['model']['operations']))

    def test_parent_space_groups_with_independent_spglib(self):
        import numpy as np
        import spglib
        # Teaching cells may be conventional or magnetic supercells. Discarding
        # the model moments must recover the stated chemical parent group.
        for m in self.materials['materials']:
            with self.subTest(material=m['id']):
                model = m['model']
                elements = sorted({a['element'] for a in model['atoms']})
                cell = (np.array(model['cell'], dtype=float).T,
                        [a['frac'] for a in model['atoms']],
                        [elements.index(a['element']) + 1 for a in model['atoms']])
                dataset = spglib.get_symmetry_dataset(cell, symprec=1e-6)
                self.assertIsNotNone(dataset)
                self.assertEqual(dataset.number, m['spaceGroup']['number'])

    def test_guided_derivations_are_complete_and_have_unambiguous_checks(self):
        exercises = self.derivations['exercises']
        materials = {m['id'] for m in self.materials['materials']}
        self.assertEqual(len(exercises), 22)
        self.assertEqual(len({e['id'] for e in exercises}), len(exercises))
        self.assertEqual({e['track'] for e in exercises}, {'space', 'double', 'magnetic', 'color', 'spin'})
        sources={s['id'] for s in self.materials['sources']}|{s['id'] for s in self.course['sources']}
        lab_presets={'double_group':{'c2_point','d2_point','screw21_space'},
                     'color_group':{'c3_point','translation3_space'},
                     'spin_group':{'c2_point','af_space','triangular_point','helix3_space'}}
        # These conceptual examples intentionally have no corresponding lab.
        # Keep the original exercises' strict material/preset checks intact.
        conceptual={'space-pminus1-orbit-stabilizer','color-swap-antilinear-time-reversal'}
        for e in exercises:
            with self.subTest(exercise=e['id']):
                if 'materialId' in e:
                    self.assertIn(e['materialId'], materials)
                elif e['id'] in conceptual:
                    self.assertTrue(e['modelLabel'])
                    self.assertNotIn('lab', e)
                    self.assertNotIn('labPreset', e)
                else:
                    self.assertTrue(e['modelLabel'])
                    self.assertIn(e['labPreset'], lab_presets[e['lab']])
                self.assertTrue(set(e['sourceIds']) <= sources)
                for field in ('title', 'prompt', 'givens', 'hint', 'answer', 'pitfall'):
                    self.assertTrue(e[field])
                self.assertGreaterEqual(len(e['steps']), 3)
                for step in e['steps']:
                    self.assertTrue(step['title'] and step['explanation'])
                check = e['check']
                self.assertEqual(type(check['answer']), int)
                self.assertTrue(0 <= check['answer'] < len(check['choices']))
                self.assertEqual(len(set(check['choices'])), len(check['choices']))
                self.assertTrue(check['question'] and check['explanation'])

    def test_lesson_continuations_match_reviewed_source_and_existing_exercises(self):
        builder = runpy.run_path(str(ROOT / 'scripts/build-course-continuations.py'))
        _, expected = builder['continuation_data']()
        self.assertEqual(self.course, expected)
        by_id = {item['id']: item for item in self.derivations['exercises']}
        for lesson in self.course['lessons']:
            self.assertIsInstance(lesson['derivationIds'], list)
            for exercise_id in lesson['derivationIds']:
                self.assertIn(exercise_id, by_id)
                self.assertEqual(by_id[exercise_id]['track'], lesson['track'])
        mapping = {item['id']: item['derivationIds'] for item in self.course['lessons']}
        self.assertEqual(mapping['double-04'], ['double-gaas-kramers'])
        self.assertEqual(mapping['magnetic-05'], ['magnetic-nio-square'])
        self.assertEqual(mapping['spin-04'], ['spin-soc-lock'])
        self.assertEqual(mapping['space-04'], ['space-pminus1-orbit-stabilizer'])
        self.assertEqual(mapping['color-03'], ['color-swap-antilinear-time-reversal'])
        self.assertEqual(mapping['magnetic-03'], [])
        self.assertEqual(sum(bool(ids) for ids in mapping.values()), 23)


if __name__ == '__main__':
    unittest.main(verbosity=2)
