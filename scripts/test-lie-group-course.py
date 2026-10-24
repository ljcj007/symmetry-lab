"""Ensure every public lesson has a usable exercise, lab and source path."""
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class LieCourse(unittest.TestCase):
    def test_complete_course(self):
        course=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text(encoding='utf8'))
        lessons=course['lessons'];sources={s['id']:s for s in course['sources']}
        self.assertEqual(len(lessons),23)
        self.assertEqual(sum(len(lesson['quiz']) for lesson in lessons),46)
        self.assertEqual(len({l['id'] for l in lessons}),len(lessons))
        self.assertGreaterEqual(len(sources),3)
        for source in sources.values():
            self.assertTrue(source['title'])
            self.assertTrue(source['url'].startswith('https://'))
        labs=set()
        for lesson in lessons:
            with self.subTest(lesson=lesson['id']):
                for key in ('title','summary','objectives','sections','pitfall','references'):
                    self.assertTrue(lesson[key])
                self.assertGreaterEqual(len(lesson['example']['steps']),3)
                self.assertTrue(lesson['example']['result'])
                for section in lesson['sections']:
                    self.assertTrue(section['title'] and section['paragraphs'])
                self.assertGreaterEqual(len(lesson['quiz']),2)
                for quiz in lesson['quiz']:
                    self.assertEqual(type(quiz['answer']),int)
                    self.assertTrue(0<=quiz['answer']<len(quiz['choices']))
                    self.assertEqual(len(set(quiz['choices'])),len(quiz['choices']))
                    self.assertTrue(quiz['question'] and quiz['explanation'])
                for reference in lesson['references']:
                    self.assertIn(reference['sourceId'],sources)
                if lesson.get('lab'):
                    self.assertIn(lesson['lab'],('su2','su3','commutator','rabi','su2_coupling','su3_tensor','su3_cg','su3_racah'))
                    labs.add(lesson['lab'])
        self.assertEqual(labs,{'su2','su3','commutator','rabi','su2_coupling','su3_tensor','su3_cg','su3_racah'})

    def test_guided_derivations(self):
        course=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text(encoding='utf8'))
        data=json.loads((ROOT/'dist/data/lie-derivations.json').read_text(encoding='utf8'))
        exercises=data['exercises'];sources={s['id'] for s in course['sources']}
        self.assertEqual(len(exercises),20)
        self.assertEqual(len({e['id'] for e in exercises}),20)
        self.assertEqual({e['group'] for e in exercises},{'su2','su3'})
        for exercise in exercises:
            with self.subTest(exercise=exercise['id']):
                for field in ('title','prompt','givens','hint','answer','pitfall','references'):
                    self.assertTrue(exercise[field])
                self.assertGreaterEqual(len(exercise['steps']),3)
                for step in exercise['steps']:
                    self.assertTrue(step['title'] and step['explanation'])
                check=exercise['check']
                self.assertEqual(type(check['answer']),int)
                self.assertTrue(0<=check['answer']<len(check['choices']))
                self.assertEqual(len(check['choices']),len(set(check['choices'])))
                self.assertTrue(check['question'] and check['explanation'])
                for reference in exercise['references']:
                    self.assertIn(reference['sourceId'],sources)
                self.assertIn(exercise['lab'],('rabi','su2_coupling','su3_tensor','su3_cg','su3_racah'))

if __name__=='__main__':unittest.main(verbosity=2)
