"""Ensure every public lesson has a usable exercise, lab and source path."""
import json
from collections import Counter
from fractions import Fraction
from functools import lru_cache
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]


@lru_cache(maxsize=None)
def tableaux_tensor(left, right):
    """Independent LR tableaux count; no GT weights or coupling code imported."""
    base=(left[0]+left[1],left[1],0)
    content=(right[0]+right[1],right[1],0)
    boxes=sum(base)+sum(content)
    answer=Counter()
    for first in range(boxes,-1,-1):
        for second in range(min(first,boxes-first),-1,-1):
            third=boxes-first-second
            shape=(first,second,third)
            if not 0<=third<=second or any(a<b for a,b in zip(shape,base)):
                continue
            cells=[(r,c) for r in range(3)
                   for c in range(shape[r]-1,base[r]-1,-1)]
            filled={};used=[0,0,0]
            def fill(index):
                if index==len(cells):
                    return 1
                row,col=cells[index];count=0
                for value in range(1,4):
                    k=value-1
                    if used[k]>=content[k]:
                        continue
                    if (row,col+1) in filled and value>filled[row,col+1]:
                        continue
                    if (row-1,col) in filled and value<=filled[row-1,col]:
                        continue
                    used[k]+=1
                    if used[0]>=used[1]>=used[2]:
                        filled[row,col]=value
                        count+=fill(index+1)
                        del filled[row,col]
                    used[k]-=1
                return count
            copies=fill(0)
            if copies:
                answer[first-second,second-third]+=copies
    return tuple(sorted(answer.items()))


class LieCourse(unittest.TestCase):
    def test_complete_course(self):
        course=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text(encoding='utf8'))
        lessons=course['lessons'];sources={s['id']:s for s in course['sources']}
        self.assertEqual(len(lessons),29)
        self.assertEqual(sum(len(lesson['quiz']) for lesson in lessons),58)
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
                    self.assertIn(lesson['lab'],('su2','su3','commutator','rabi','su2_coupling','su3_tensor','su3_cg','su3_racah','su3_ninej'))
                    labs.add(lesson['lab'])
        self.assertEqual(labs,{'su2','su3','commutator','rabi','su2_coupling','su3_tensor','su3_cg','su3_racah','su3_ninej'})

    def test_guided_derivations(self):
        course=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text(encoding='utf8'))
        data=json.loads((ROOT/'dist/data/lie-derivations.json').read_text(encoding='utf8'))
        exercises=data['exercises'];sources={s['id'] for s in course['sources']}
        self.assertEqual(len(exercises),28)
        self.assertEqual(len({e['id'] for e in exercises}),28)
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
                self.assertIn(exercise['lab'],('rabi','su2_coupling','su3_tensor','su3_cg','su3_racah','su3_ninej'))

    def test_four_octets_independent_counts(self):
        # The curriculum's high-dimensional numbers have a second combinatorial
        # derivation, independent of the runtime's GT character subtraction.
        pair=dict(tableaux_tensor((1,1),(1,1)))
        self.assertEqual(pair,{(0,0):1,(1,1):2,(3,0):1,(0,3):1,(2,2):1})
        fourth=Counter()
        for left,nleft in pair.items():
            for right,nright in pair.items():
                for label,copies in tableaux_tensor(left,right):
                    fourth[label]+=nleft*nright*copies
        self.assertEqual(fourth,{(4,4):1,(5,2):3,(2,5):3,(6,0):2,(3,3):12,
                                 (0,6):2,(4,1):15,(1,4):15,(2,2):33,(3,0):20,
                                 (0,3):20,(1,1):32,(0,0):8})
        dimension=lambda label:(label[0]+1)*(label[1]+1)*(sum(label)+2)//2
        self.assertEqual(sum(dimension(label)*copies for label,copies in fourth.items()),4096)
        # Symmetric/antisymmetric BC sectors determine the traces of P_23.
        plus={(2,2):1,(1,1):1,(0,0):1}
        minus={(3,0):1,(0,3):1,(1,1):1}
        def sectors(sector,target):
            return sum(nleft*nright*dict(tableaux_tensor(left,right)).get(target,0)
                       for left,nleft in sector.items() for right,nright in pair.items())
        for target,expected in [((0,0),(4,4)),((1,1),(16,16)),((2,2),(17,16))]:
            self.assertEqual((sectors(plus,target),sectors(minus,target)),expected)

    def test_four_octets_invariant_and_energy_examples(self):
        # Delta contraction leaves one free adjoint index. Projector ranks give
        # grouped probabilities independently of all CG phase choices.
        overlap=Fraction(8,64)
        self.assertEqual(overlap,Fraction(1,8))
        probabilities=list(map(lambda n:Fraction(n,64),(27,10,10,16,1)))
        self.assertEqual(sum(probabilities),1)
        self.assertEqual(probabilities[-1],overlap**2)
        energies=(Fraction(1),Fraction(0),Fraction(0),Fraction(-3,2),Fraction(-3))
        self.assertEqual(sum(p*e for p,e in zip(probabilities,energies)),0)
        self.assertEqual(sum(p*e*e for p,e in zip(probabilities,energies)),Fraction(9,8))
        lessons=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text('utf8'))['lessons']
        exercises=json.loads((ROOT/'dist/data/lie-derivations.json').read_text('utf8'))['exercises']
        self.assertEqual({x['labPreset'] for x in lessons[-3:]},
                         {'su3-ninej-four-octets-singlet','su3-ninej-four-octets-adjoint','su3-ninej-four-octets-27'})
        self.assertEqual({x['labPreset'] for x in exercises[-4:]},
                         {'su3-ninej-four-octets-singlet','su3-ninej-four-octets-27','su3-ninej-four-octets-complex'})

if __name__=='__main__':unittest.main(verbosity=2)
