"""Independent finite-action, character-projector and spectroscopy checks.

Oracles use exact Fraction arithmetic, a separately constructed permutation
Kronecker action, and independent rank elimination; no adapter self-check flag
or hardcoded decomposition alone serves as the test oracle.
"""
from fractions import Fraction as F
from pathlib import Path
import copy
import json
import math
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run


def mm(a,b):
    return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]


def transpose(a):
    return [list(row) for row in zip(*a)]


def eye(n):
    return [[int(i==j) for j in range(n)] for i in range(n)]


def kron(a,b):
    return [[a[i][j]*b[k][l] for j in range(len(a[0])) for l in range(len(b[0]))]
            for i in range(len(a)) for k in range(len(b))]


def rank(a):
    rows = [[F(x) for x in row] for row in a]
    pivot = 0
    for column in range(len(rows[0])):
        index = next((i for i in range(pivot,len(rows)) if rows[i][column]),None)
        if index is None:continue
        rows[pivot],rows[index] = rows[index],rows[pivot]
        scale = rows[pivot][column]
        rows[pivot] = [x/scale for x in rows[pivot]]
        for i in range(len(rows)):
            if i != pivot:
                c = rows[i][column]
                rows[i] = [a-c*b for a,b in zip(rows[i],rows[pivot])]
        pivot += 1
        if pivot == len(rows):break
    return pivot


class WaterActionLedger(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = run('water_actions',{})
        # Independent geometry with a different angle, but the same bent xz
        # orbit. It proves integer matrices are not derived from drawing floats.
        sites = [(0,0,0),(2,0,3),(-2,0,3)]
        diagonals = [(1,1,1),(-1,-1,1),(1,-1,1),(-1,1,1)]
        cls.rotations = [[[int(i==j)*d[i] for j in range(3)] for i in range(3)] for d in diagonals]
        cls.permutations = []
        cls.matrices = []
        for d,r in zip(diagonals,cls.rotations):
            perm = [sites.index(tuple(d[i]*p[i] for i in range(3))) for p in sites]
            p = [[int(perm[j]==i) for j in range(3)] for i in range(3)]
            cls.permutations.append(perm)
            cls.matrices.append(kron(p,r))

    def test_01_public_entry_and_strict_empty_input(self):
        r = self.result
        self.assertEqual(r['schema'],'symmetry-lab-water-actions-1')
        self.assertEqual(r['input'],{})
        self.assertEqual([b['label'] for b in r['basis']],['Ox','Oy','Oz','H1x','H1y','H1z','H2x','H2y','H2z'])
        for invalid in (None,[],True,False,0,1,'{}',{'operation':'C2'},{'column':3},{'angle':104.5},{'lab':'water_actions'}):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):run('water_actions',invalid)

    def test_02_all_four_permutation_kronecker_matrices_and_36_columns(self):
        for oi,op in enumerate(self.result['operations']):
            with self.subTest(operation=op['id']):
                expected = self.matrices[oi]
                self.assertEqual(op['atomPermutation'],self.permutations[oi])
                self.assertEqual(op['polar']['matrix'],self.rotations[oi])
                self.assertEqual(op['matrix'],expected)
                self.assertEqual(len(op['columns']),9)
                self.assertTrue(all(type(x) is int for row in op['matrix'] for x in row))
                self.assertEqual(mm(transpose(expected),expected),eye(9))
                for j,col in enumerate(op['columns']):
                    image = [row[j] for row in expected]
                    target = next(i for i,x in enumerate(image) if x)
                    self.assertEqual(col['vector'],image)
                    self.assertEqual(col['targetBasisIndex'],target)
                    self.assertEqual(col['targetAtomIndex'],target//3)
                    self.assertEqual(col['targetAxis'],('x','y','z')[target%3])
                    self.assertEqual(col['coefficient'],image[target])
                    self.assertEqual(col['diagonalContribution'],image[j])
                    expected_arrow = [sum(self.rotations[oi][k][l]*int(l==j%3) for l in range(3)) for k in range(3)]
                    self.assertEqual(col['outputArrow'],expected_arrow)
                for ri,right in enumerate(self.rotations):
                    product_index = self.rotations.index(mm(self.rotations[oi],right))
                    self.assertEqual(mm(expected,self.matrices[ri]),self.matrices[product_index])
                    self.assertEqual(self.result['multiplicationTable'][oi][ri],product_index)

    def test_03_trace_ledger_and_axial_cross_product_rule(self):
        u,v = [1,2,3],[2,-1,1]
        cross = lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
        act = lambda m,x:[sum(a*b for a,b in zip(row,x)) for row in m]
        for op,expected in zip(self.result['operations'],self.matrices):
            diagonal = [expected[i][i] for i in range(9)]
            self.assertEqual(op['diagonal'],diagonal)
            self.assertEqual([x['coefficient'] for x in op['traceTerms']],diagonal)
            self.assertEqual(op['trace'],sum(diagonal))
            self.assertEqual(op['trace'],op['fixedAtomCount']*sum(op['polar']['matrix'][i][i] for i in range(3)))
            self.assertEqual(act(op['axial']['matrix'],cross(u,v)),cross(act(op['polar']['matrix'],u),act(op['polar']['matrix'],v)))
        self.assertEqual(self.result['characters'],{'fixedAtoms':[3,1,3,1],'polar':[3,-1,1,1],
            'axial':[3,-1,-1,-1],'displacement':[9,-1,3,1],
            'translation':[3,-1,1,1],'rotation':[3,-1,-1,-1],'vibration':[3,1,3,1]})

    def test_04_character_projector_ranks_and_all_cross_orthogonality(self):
        irreps = {'A1':[1,1,1,1],'A2':[1,1,-1,-1],'B1':[1,-1,1,-1],'B2':[1,-1,-1,1]}
        projectors = {name:[[sum(F(c)*m[i][j]/4 for c,m in zip(row,self.matrices)) for j in range(9)]
                            for i in range(9)] for name,row in irreps.items()}
        expected_ranks = {'A1':3,'A2':1,'B1':3,'B2':2}
        for name,p in projectors.items():
            self.assertEqual(p,transpose(p))
            self.assertEqual(mm(p,p),p)
            self.assertEqual(rank(p),expected_ranks[name])
            for other,q in projectors.items():
                self.assertEqual(mm(p,q),p if name==other else [[0]*9 for _ in range(9)])
        self.assertEqual([[sum(p[i][j] for p in projectors.values()) for j in range(9)] for i in range(9)],eye(9))

    def test_05_reduction_terms_and_rigid_motion_character_subtraction(self):
        r = self.result
        expected = {'displacement':{'A1':3,'A2':1,'B1':3,'B2':2},
            'translation':{'A1':1,'A2':0,'B1':1,'B2':1},
            'rotation':{'A1':0,'A2':1,'B1':1,'B2':1},
            'vibration':{'A1':2,'A2':0,'B1':1,'B2':0}}
        for role,row in r['reductions'].items():
            for component in row['components']:
                products = [a*b for a,b in zip(r['characters'][role],component['irrepCharacters'])]
                self.assertEqual(component['weightedProducts'],products)
                self.assertEqual(component['sum'],sum(products))
                self.assertEqual(F(component['sum'],row['groupOrder']),expected[role][component['irrep']])
                self.assertEqual(component['multiplicity'],expected[role][component['irrep']])
            self.assertEqual(row['dimension'],row['dimensionSum'])
        self.assertEqual(r['reductions']['vibration']['latex'],'2A_1+B_1')
        self.assertEqual(r['vibrations']['dimension'],3*len(r['atoms'])-6)
        self.assertEqual(r['characters']['vibration'],[a-b-c for a,b,c in zip(r['characters']['displacement'],r['characters']['translation'],r['characters']['rotation'])])

    def test_06_fixed_oxygen_counterexample_and_spectroscopic_permission(self):
        c = self.result['counterexample']
        self.assertEqual(c['incorrectScalarGuess'],1)
        self.assertEqual(c['oxygenDiagonal'],[-1,-1,1])
        self.assertEqual(c['hydrogenDiagonal'],[0]*6)
        self.assertEqual(c['actualDisplacementCharacter'],-1)
        self.assertEqual((c['sourceLabel'],c['targetLabel'],c['coefficient']),('H1x','H2x',-1))
        expected = {'ir-z':[True,True,False],'ir-x':[False,False,True],
                    'raman-xx':[True,True,False],'raman-xz':[False,False,True]}
        axis = {'x':0,'y':1,'z':2}
        irrep_rows = {r['irrep']:r['characters'] for r in self.result['characterTable']['rows']}
        for channel in self.result['selectionChannels']:
            # Derive each linear/quadratic probe character from its Cartesian
            # monomial, independently of the adapter's named operator irrep.
            operator_characters = []
            for operation in self.rotations:
                coefficient = 1
                for symbol in channel['operator']:
                    coefficient *= operation[axis[symbol]][axis[symbol]]
                operator_characters.append(coefficient)
            self.assertEqual(channel['operatorCharacters'],operator_characters)
            self.assertEqual([m['allowed'] for m in channel['modeRows']],expected[channel['id']])
            for row in channel['modeRows']:
                self.assertEqual(row['weightedProducts'],[f*o for f,o in zip(irrep_rows[row['finalIrrep']],operator_characters)])
                self.assertEqual(row['multiplicity'],F(sum(row['weightedProducts']),4))
                self.assertEqual(row['allowed'],row['multiplicity']>0)
        self.assertNotIn('frequencies',self.result)
        self.assertNotIn('intensities',self.result)

    def test_07_drawing_geometry_and_returned_tree_isolation(self):
        r = self.result
        positions = [a['position'] for a in r['atoms']]
        v,w = positions[1],positions[2]
        angle = math.degrees(math.acos(sum(a*b for a,b in zip(v,w))/math.sqrt(sum(x*x for x in v)*sum(x*x for x in w))))
        self.assertEqual(r['drawing']['coordinateDecimalPlaces'],12)
        self.assertAlmostEqual(angle,104.5,places=9)
        original = copy.deepcopy(r)
        changed = run('water_actions',{})
        changed['operations'][1]['matrix'][0][0] = 999
        changed['operations'][1]['columns'][3]['vector'][6] = 999
        changed['characterTable']['rows'][0]['characters'][0] = 999
        self.assertEqual(run('water_actions',{}),original)
        json.dumps(original,allow_nan=False)


if __name__ == '__main__':
    unittest.main()
