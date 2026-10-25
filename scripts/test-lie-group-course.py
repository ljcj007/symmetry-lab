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
        self.assertEqual(len(lessons),32)
        self.assertEqual(sum(len(lesson['quiz']) for lesson in lessons),64)
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
        self.assertEqual(len(exercises),32)
        self.assertEqual(len({e['id'] for e in exercises}),32)
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
        octet_lessons={'su3-ninej-four-octets-channels','su3-ninej-adjoint-invariants','su3-ninej-adjoint-observables'}
        octet_exercises={'su3-ninej-four-octets-count','su3-ninej-octet-singlet-contractions',
                         'su3-ninej-octet-weighted-complex','su3-ninej-octet-pair-casimir'}
        self.assertEqual({x['labPreset'] for x in lessons if x['id'] in octet_lessons},
                         {'su3-ninej-four-octets-singlet','su3-ninej-four-octets-adjoint','su3-ninej-four-octets-27'})
        self.assertEqual({x['labPreset'] for x in exercises if x['id'] in octet_exercises},
                         {'su3-ninej-four-octets-singlet','su3-ninej-four-octets-27','su3-ninej-four-octets-complex'})

    def test_high_external_input_examples_independent_lr(self):
        # These complete products and both paired path counts use only LR
        # tableaux, independently of the exact runtime's GT construction.
        dimension=lambda label:(label[0]+1)*(label[1]+1)*(sum(label)+2)//2
        cases=[
            (((3,0),(1,0),(1,0),(0,1)),(2,1),270,4,
             {(5,1):1,(4,0):3,(3,2):2,(2,1):4,(1,3):1,(1,0):1,(0,2):1}),
            (((2,1),(1,0),(0,1),(1,0)),(3,1),405,5,
             {(5,0):1,(4,2):1,(3,1):5,(2,3):2,(2,0):4,(1,2):5,(0,4):1,(0,1):2}),
            (((2,2),(1,0),(0,1),(1,0)),(3,2),729,5,
             {(5,1):1,(4,3):1,(4,0):2,(3,2):5,(2,4):2,(2,1):5,(1,3):5,
              (1,0):1,(0,5):1,(0,2):2})
        ]
        for factors,target,total_dimension,multiplicity,expected in cases:
            with self.subTest(factors=factors):
                decomposition=Counter({factors[0]:1})
                for factor in factors[1:]:
                    result=Counter()
                    for left,nleft in decomposition.items():
                        for right,copies in tableaux_tensor(left,factor):
                            result[right]+=nleft*copies
                    decomposition=result
                self.assertEqual(decomposition,expected)
                self.assertEqual(sum(dimension(t)*n for t,n in decomposition.items()),total_dimension)
                self.assertEqual(decomposition[target],multiplicity)
                for pair1,pair2 in [(factors[:2],factors[2:]),
                                    ((factors[0],factors[2]),(factors[1],factors[3]))]:
                    paths=[]
                    for e,ne in tableaux_tensor(*pair1):
                        for f,nf in tableaux_tensor(*pair2):
                            root=dict(tableaux_tensor(e,f)).get(target,0)
                            if root:
                                paths.append((e,f,ne,nf,root))
                    self.assertEqual(sum(ne*nf*root for _,_,ne,nf,root in paths),multiplicity)
                # One doubled root vertex in the left tree, none in the right
                # tree for 15 and 27 inputs (10 has identical middle inputs).
                root_counts=[]
                for pair1,pair2 in [(factors[:2],factors[2:]),
                                    ((factors[0],factors[2]),(factors[1],factors[3]))]:
                    root_counts.append(sorted(root for e,_ in tableaux_tensor(*pair1)
                                              for f,_ in tableaux_tensor(*pair2)
                                              if (root:=dict(tableaux_tensor(e,f)).get(target,0))))
                self.assertEqual(root_counts[0],[1,1,2] if factors[0]==(3,0) else [1,1,1,2])
                self.assertEqual(root_counts[1],[1,1,2] if factors[0]==(3,0) else [1,1,1,1,1])

    def test_high_input_s3_weights_and_casimirs(self):
        dimension=lambda label:(label[0]+1)*(label[1]+1)*(sum(label)+2)//2
        casimir=lambda label:Fraction(label[0]**2+label[1]**2+label[0]*label[1]+3*sum(label),3)
        self.assertEqual((dimension((2,1)),dimension((4,0))),(15,15))
        self.assertEqual((casimir((2,1)),casimir((4,0))),(Fraction(16,3),Fraction(28,3)))
        self.assertEqual(len([(p,q) for p in range(5) for q in range(5-p)]),15)
        self.assertGreater(10**4,4096)
        self.assertGreater(27**4,4096)
        # The 10 x 3^3 -> 8 multiplicity space comes only from the BCD
        # standard S3 sector. Its 3-cycle trace gives a=-1/2, b^2=3/4.
        self.assertNotIn((1,1),dict(tableaux_tensor((3,0),(3,0))))
        self.assertEqual(dict(tableaux_tensor((3,0),(1,1))).get((1,1)),1)
        triples=Counter()
        for pair,n in tableaux_tensor((1,0),(1,0)):
            for final,k in tableaux_tensor(pair,(1,0)):
                triples[final]+=n*k
        self.assertEqual(triples,{(3,0):1,(1,1):2,(0,0):1})
        a=Fraction(-1,2);b_squared=1-a*a
        self.assertEqual(b_squared,Fraction(3,4))
        self.assertEqual(a*a+b_squared,1)
        # Single-cell 9j normalization and the 27 x bar3 pair Casimirs.
        self.assertEqual(42*1*24*3,12**2*21)
        external=casimir((2,2))+casimir((0,1))
        self.assertEqual(external,Fraction(28,3))
        energies=[(casimir(g)-external)/2 for g in [(2,3),(3,1),(1,2)]]
        self.assertEqual(energies,[Fraction(1),Fraction(-1,2),Fraction(-2)])
        # Check the whole weight multisets for the 27-input final 42.
        factors=((2,2),(1,0),(0,1),(1,0));target=(3,2)
        weights=[]
        for pair1,pair2 in [(factors[:2],factors[2:]),
                            ((factors[0],factors[2]),(factors[1],factors[3]))]:
            values=[]
            for e,ne in tableaux_tensor(*pair1):
                for f,nf in tableaux_tensor(*pair2):
                    values.extend([dimension(e)*dimension(f)]*(ne*nf*dict(tableaux_tensor(e,f)).get(target,0)))
            weights.append(sorted(values))
        self.assertEqual(weights,[sorted([42,336,336,192,120]),sorted([252,126,144,72,90])])

    def test_high_input_teaching_links(self):
        lessons=json.loads((ROOT/'dist/data/lie-group-lessons.json').read_text('utf8'))['lessons']
        exercises=json.loads((ROOT/'dist/data/lie-derivations.json').read_text('utf8'))['exercises']
        self.assertEqual({x['labPreset'] for x in lessons[-3:]},
                         {'su3-ninej-decuplet-four','su3-ninej-fifteen-four','su3-ninej-27-four'})
        self.assertEqual({x['labPreset'] for x in exercises[-4:]},
                         {'su3-ninej-decuplet-standard','su3-ninej-fifteen-four',
                          'su3-ninej-27-four','su3-ninej-high-complex'})

if __name__=='__main__':unittest.main(verbosity=2)
