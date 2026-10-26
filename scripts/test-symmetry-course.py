"""Consistency tests for the complete teaching catalog and lesson links."""
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf8'))

ATLAS = read('dist/data/symmetry-course-atlas.json')


class AcademyCatalog(unittest.TestCase):
    def test_all_group_types_are_present_once(self):
        self.assertEqual([g['number'] for g in ATLAS['spaceGroups']], list(range(1, 231)))
        self.assertEqual(len({g['id'] for g in ATLAS['magneticGroups']}), 1651)
        self.assertEqual(len({g['id'] for g in ATLAS['magneticPointGroups']}), 122)
        self.assertEqual(Counter(g['type'] for g in ATLAS['magneticGroups']), {1:230, 2:230, 3:674, 4:517})
        self.assertEqual(Counter(g['type'] for g in ATLAS['magneticPointGroups']), {1:32, 2:32, 3:58})
        self.assertEqual(Counter(g['system'] for g in ATLAS['spaceGroups']),
                         {'三斜':2, '单斜':13, '正交':59, '四方':68, '三方':25, '六方':27, '立方':36})

    def test_catalog_preserves_source_identifiers_and_antiunitary_counts(self):
        source = read('dist/data/magnetic-groups.json')['groups']
        for row, original in zip(ATLAS['magneticGroups'], source):
            self.assertEqual(row['id'], original['id'])
            for key in ('symbol', 'type', 'family', 'ogId', 'ogSymbol'):
                self.assertEqual(row[key], original[key])
            self.assertEqual(row['unitarySpaceGroup'], original['unitarySG'])
            n = sum(bool(o['antiunitary']) for o in original['operations'])
            self.assertEqual(row['antiunitaryOrder'], n)
            self.assertEqual(row['order'], len(original['operations']))
            self.assertEqual(row['unitaryOrder'] + n, row['order'])
            self.assertEqual(n, 0 if row['type'] == 1 else row['unitaryOrder'])
        identifiers = {g['id'] for g in ATLAS['magneticGroups']}
        for row in ATLAS['magneticPointGroups']:
            self.assertIn(row['representativeMSG'], identifiers)

    def test_ordinary_orders_agree_with_independent_point_group_atlas(self):
        points = {g['schoenflies']:g for g in read('dist/data/pointgroup-atlas.json')['groups']}
        for g in ATLAS['spaceGroups']:
            self.assertEqual(g['order'], points[g['pointGroup']]['order'])
            self.assertIn(g['number'], range(1, 231))
            self.assertGreater(len(g['examples']), 0)
            self.assertLessEqual(len(g['examples']), 4)

    def test_build_is_reproducible_and_sources_are_unchanged(self):
        for name, digest in ATLAS['sourceFiles'].items():
            self.assertEqual(hashlib.sha256((ROOT / 'dist/data' / name).read_bytes()).hexdigest(), digest)
        spec=importlib.util.spec_from_file_location('academy_builder', ROOT / 'scripts/build-symmetry-course.py')
        builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
        fresh=json.loads(json.dumps(builder.build()))
        self.assertEqual(fresh, ATLAS)

    def test_complete_lesson_schema_and_workbench_links(self):
        course=read('dist/data/symmetry-course-lessons.json')
        lessons=course['lessons'];sources={s['id'] for s in course['sources']}
        self.assertEqual(len(lessons), 24)
        self.assertEqual(len({l['id'] for l in lessons}), 24)
        self.assertEqual(Counter(l['track'] for l in lessons), {'space':6, 'double':6, 'magnetic':5, 'color':3, 'spin':4})
        lab_presets={'double_group':{'c2_point','d2_point','screw21_space'},
                     'color_group':{'c3_point','translation3_space'},
                     'spin_group':{'c2_point','af_space','triangular_point','helix3_space'}}
        ids={'sg':{str(g['number']) for g in ATLAS['spaceGroups']},
             'msg':{g['id'] for g in ATLAS['magneticGroups']},
             'mpg':{g['id'] for g in ATLAS['magneticPointGroups']}}
        for lesson in lessons:
            with self.subTest(lesson=lesson['id']):
                self.assertTrue(lesson['objectives'] and lesson['sections'] and lesson['references'])
                self.assertTrue(lesson['example']['steps'] and lesson['example']['result'])
                self.assertTrue(lesson['pitfall'])
                self.assertEqual(len(lesson['quiz']), 2)
                for q in lesson['quiz']:
                    self.assertEqual(type(q['answer']), int)
                    self.assertTrue(0 <= q['answer'] < len(q['choices']))
                    self.assertTrue(q['question'] and q['explanation'])
                    self.assertEqual(len(set(q['choices'])), len(q['choices']))
                for ref in lesson['references']:
                    self.assertIn(ref['sourceId'], sources)
                if 'lab' in lesson:
                    self.assertIn(lesson['lab'], ('seitz','spinor','magnetic','antiferro',*lab_presets))
                if 'labPreset' in lesson:
                    self.assertIn(lesson['labPreset'], lab_presets[lesson['lab']])
                if 'workbench' in lesson:
                    link=lesson['workbench'];self.assertIn(str(link['id']), ids[link['mode']])
                    self.assertEqual(len(link['k']), 3)
                    self.assertEqual(type(link['doubleValued']), bool)

    def test_extended_routes_cover_points_and_three_dimensional_space(self):
        course=read('dist/data/symmetry-course-lessons.json')
        by_id={lesson['id']:lesson for lesson in course['lessons']}
        # Retain the established progress keys when extending the catalog.
        for prefix,count in [('space',6),('double',4),('magnetic',5)]:
            for index in range(1,count+1):
                self.assertIn(f'{prefix}-{index:02}',by_id)
        for track in ('double','color','spin'):
            levels={l.get('symmetryLevel') for l in by_id.values() if l['track']==track}
            self.assertIn('point',levels)
            self.assertIn('space',levels)
        self.assertEqual(sum(len(l['quiz']) for l in by_id.values()),48)
        self.assertEqual({t['id'] for t in course['tracks']},{'space','double','magnetic','color','spin'})


if __name__ == '__main__':
    unittest.main(verbosity=2)
