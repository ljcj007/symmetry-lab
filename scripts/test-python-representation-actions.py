"""Independent exact oracles for the whole finite representation ledger.

The public API is tested at all 25 inputs.  The oracle acts on coordinates by
quarter turns and reflection and multiplies abstract R^k M^s labels separately;
it does not import the adapter's matrix helpers or trust its self-check flags.
"""
from fractions import Fraction as F
from itertools import product
from pathlib import Path
import copy
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run

IDS = ('E', 'R', 'R2', 'R3', 'M', 'RM', 'R2M', 'R3M')
POINTS = tuple(product(range(-2, 3), repeat=2))
I = [[1, 0], [0, 1]]
SWAP = [[0, 1], [1, 0]]
BASIS = ([1, 0], [0, 1])


def geometric_action(index, vector):
    # Independent coordinate oracle: M first if present, then k quarter turns.
    k, reflected = index % 4, index // 4
    x, y = vector
    if reflected:
        y = -y
    for _ in range(k):
        x, y = -y, x
    return [x, y]


def abstract_product(left, right):
    # R^k M^s R^l M^t = R^(k+(-1)^s*l) M^(s+t).
    k, s = left % 4, left // 4
    ell, t = right % 4, right // 4
    return (k + (-1 if s else 1)*ell) % 4 + 4*((s+t) % 2)


def mm(a, b):
    return [[sum(a[i][k]*b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def act(a, v):
    return [sum(a[i][j]*v[j] for j in range(len(v))) for i in range(len(a))]


def transpose(a):
    return [list(row) for row in zip(*a)]


def difference(a, b):
    return [[a[i][j]-b[i][j] for j in range(len(a[0]))] for i in range(len(a))]


def raw(pack):
    return pack['matrix']


def rational_matrix(pack):
    return [[F(value) for value in row] for row in raw(pack)]


def columns(a):
    return [act(a, v) for v in BASIS]


class RepresentationActionLedger(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.results = {}
        for point in POINTS:
            request = {'point': list(point)}
            before = copy.deepcopy(request)
            cls.results[point] = run('representation_actions', request)
            if request != before:
                raise AssertionError('Public API changed its request')
        cls.original = [transpose([geometric_action(i, v) for v in BASIS]) for i in range(8)]
        cls.common = [mm(mm(SWAP, a), SWAP) for a in cls.original]
        cls.mixed = copy.deepcopy(cls.original)
        cls.mixed[1] = cls.common[1]
        cls.families = {'original': cls.original, 'common': cls.common,
                        'mixed': cls.mixed, 'trivial': [I for _ in IDS]}

    def test_01_strict_public_input_and_all_twenty_five_points(self):
        self.assertEqual(len(self.results), 25)
        for point, result in self.results.items():
            self.assertEqual(result['schema'], 'symmetry-lab-representation-actions-1')
            self.assertEqual(result['input'], {'point': list(point)})
            self.assertEqual(result['group']['operationIds'], list(IDS))
            self.assertEqual([f['id'] for f in result['families']], list(self.families))
        invalid = (None, [], True, False, 0, '', {}, {'point': [1, 2], 'g': 'R'},
                   {'point': [1, 2], 'point2': [0, 0]}, {'point': None},
                   {'point': (1, 2)}, {'point': [1]}, {'point': [1, 2, 0]},
                   {'point': [True, 0]}, {'point': [0, False]}, {'point': [1.0, 2]},
                   {'point': [1, 2.0]}, {'point': ['1', 2]}, {'point': [3, 0]},
                   {'point': [0, -3]}, {'point': [10**100, 0]}, {'point': [0, float('nan')]},
                   {'point': [float('inf'), 0]}, {'lab': 'representation_actions', 'point': [0, 0]})
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run('representation_actions', payload)

    def test_02_complete_group_and_four_families_against_independent_action(self):
        expected_counts = {'original': (64, 0), 'common': (64, 0), 'mixed': (46, 18), 'trivial': (64, 0)}
        for point, result in self.results.items():
            for gi, row in enumerate(result['group']['multiplicationTable']):
                self.assertEqual(row, [IDS[abstract_product(gi, hi)] for hi in range(8)])
            for oi, operation in enumerate(result['group']['operations']):
                self.assertEqual(raw(operation['matrix']), self.original[oi])
            for family in result['families']:
                expected = self.families[family['id']]
                for oi, operation in enumerate(family['operations']):
                    a = raw(operation['matrix'])
                    self.assertEqual(operation['id'], IDS[oi])
                    self.assertEqual(a, expected[oi])
                    self.assertTrue(all(type(v) is int for row in a for v in row))
                    self.assertEqual(mm(transpose(a), a), I)
                    self.assertIs(operation['orthogonal'], True)
                    self.assertEqual(operation['diagonal'], [a[0][0], a[1][1]])
                    self.assertEqual(operation['trace'], a[0][0]+a[1][1])
                    self.assertEqual([v['vector'] for v in operation['basisImages']], columns(a))
                pairs = family['pairs']
                self.assertEqual(len(pairs), 64)
                actual_pass = 0
                for gi, hi in product(range(8), repeat=2):
                    pair = pairs[8*gi+hi]
                    target = abstract_product(gi, hi)
                    lhs, rhs = mm(expected[gi], expected[hi]), expected[target]
                    self.assertEqual((pair['g'], pair['h'], pair['productId']), (IDS[gi], IDS[hi], IDS[target]))
                    self.assertEqual(raw(pair['lhs']), lhs)
                    self.assertEqual(raw(pair['rhs']), rhs)
                    self.assertEqual(raw(pair['difference']), difference(lhs, rhs))
                    self.assertIs(pair['equal'], lhs == rhs)
                    actual_pass += lhs == rhs
                self.assertEqual((actual_pass, 64-actual_pass), expected_counts[family['id']])
                self.assertEqual((family['law']['passedPairs'], family['law']['failedPairs']), expected_counts[family['id']])
                self.assertIs(family['law']['isRepresentation'], actual_pass == 64)

    def test_03_every_point_path_and_both_basis_vectors_all_pairs(self):
        for point, result in self.results.items():
            for family in result['families']:
                fid = family['id']
                matrices = self.families[fid]
                initial = act(SWAP, point) if fid == 'common' else list(point)
                physical_basis = SWAP if fid == 'common' else I if fid == 'original' else None
                self.assertEqual(family['initialPoint']['vector'], initial)
                self.assertIs(family['physicalGeometry'], physical_basis is not None)
                for oi, operation in enumerate(family['operations']):
                    self.assertEqual(operation['pointImage']['vector'], act(matrices[oi], initial))
                for gi, hi in product(range(8), repeat=2):
                    pair = family['pairs'][8*gi+hi]
                    path_matrices = [I, matrices[hi], mm(matrices[gi], matrices[hi])]
                    frames = pair['frames']
                    self.assertEqual([frame['id'] for frame in frames], ['initial', 'after-h', 'after-g'])
                    self.assertEqual([frame['appliedId'] for frame in frames], [None, IDS[hi], IDS[gi]])
                    direct_matrix = matrices[abstract_product(gi, hi)]
                    for frame, a in zip(frames+[pair['direct']], path_matrices+[direct_matrix]):
                        self.assertEqual(frame['point']['vector'], act(a, initial))
                        self.assertEqual([v['vector'] for v in frame['basisImages']], columns(a))
                        if physical_basis is None:
                            self.assertIsNone(frame['physicalPoint'])
                            self.assertIsNone(frame['physicalBasisImages'])
                        else:
                            self.assertEqual(frame['physicalPoint']['vector'], act(physical_basis, act(a, initial)))
                            self.assertEqual([v['vector'] for v in frame['physicalBasisImages']], columns(mm(physical_basis, a)))
                    self.assertEqual(pair['direct']['appliedId'], IDS[abstract_product(gi, hi)])
                    self.assertIs(pair['pointEqual'], frames[-1]['point']['vector'] == pair['direct']['point']['vector'])
                    self.assertIs(pair['basisEqual'], pair['equal'])
        bad_origin = self.results[(0, 0)]['families'][2]['pairs']
        self.assertEqual(sum(not pair['equal'] and pair['pointEqual'] for pair in bad_origin), 18)
        self.assertTrue(all(pair['pointEqual'] for pair in bad_origin))
        self.assertEqual(sum(not pair['basisEqual'] for pair in bad_origin), 18)

    def test_04_uniform_passive_coordinate_change_preserves_physical_vectors(self):
        for point, result in self.results.items():
            basis = result['basisChange']
            self.assertEqual(raw(basis['S']), SWAP)
            self.assertEqual(raw(basis['inverseS']), SWAP)
            self.assertEqual(basis['oldPoint']['vector'], list(point))
            self.assertEqual(basis['newPoint']['vector'], list(reversed(point)))
            self.assertEqual(basis['reconstructedPoint']['vector'], list(point))
            for oi, row in enumerate(result['commonReconstruction']):
                new_point = act(SWAP, point)
                new_image = act(self.common[oi], new_point)
                old_image = geometric_action(oi, point)
                self.assertEqual(row['newImage']['vector'], new_image)
                self.assertEqual(row['oldImage']['vector'], old_image)
                self.assertEqual(row['reconstructedImage']['vector'], old_image)
                self.assertEqual(act(SWAP, new_image), old_image)
                self.assertEqual(raw(row['rebuiltOperator']), self.original[oi])
                self.assertIs(row['operatorEqual'], True)
                self.assertIs(row['equal'], True)
            original, common = result['families'][:2]
            for old_pair, new_pair in zip(original['pairs'], common['pairs']):
                for old_frame, new_frame in zip(old_pair['frames'], new_pair['frames']):
                    self.assertEqual(old_frame['physicalPoint'], new_frame['physicalPoint'])

    def test_05_trace_and_full_gram_do_not_replace_the_homomorphism_law(self):
        result = self.results[(1, 2)]
        families = result['families']
        expected_gram = [[4*int(i == j) for j in range(4)] for i in range(4)]
        for family in families:
            matrices = self.families[family['id']]
            traces = [a[0][0]+a[1][1] for a in matrices]
            self.assertEqual(family['characters'], traces)
            norm = family['formalCharacterNorm']
            self.assertEqual(F(norm['numerator'], norm['denominator']), F(sum(x*x for x in traces), 8))
            flat = [sum(a, []) for a in matrices]
            gram = [[sum(v[i]*v[j] for v in flat) for j in range(4)] for i in range(4)]
            self.assertEqual(family['coeffGram']['matrix'], gram)
            if family['id'] != 'trivial':
                self.assertEqual(gram, expected_gram)
                self.assertEqual(F(norm['exact']), 1)
        self.assertEqual(families[0]['characters'], families[2]['characters'])
        self.assertFalse(families[2]['law']['isRepresentation'])
        self.assertIsNone(families[2]['law']['faithful'])
        self.assertIsNone(families[2]['law']['kernelIds'])
        example = next(p for p in families[2]['pairs'] if p['id'] == 'R|R2')
        self.assertEqual(raw(example['lhs']), self.original[1])
        self.assertEqual(raw(example['rhs']), self.original[3])
        by_left = {name: sum(not p['equal'] and p['g'] == name for p in families[2]['pairs']) for name in IDS}
        self.assertEqual(by_left, dict(zip(IDS, [0, 6, 2, 2, 2, 2, 2, 2])))

    def test_06_repeated_matrices_are_allowed_for_a_nonfaithful_representation(self):
        family = self.results[(1, 2)]['families'][3]
        self.assertEqual([raw(op['matrix']) for op in family['operations']], [I]*8)
        self.assertEqual(family['characters'], [2]*8)
        self.assertEqual(F(family['formalCharacterNorm']['exact']), 4)
        self.assertEqual(family['law']['kernelIds'], list(IDS))
        self.assertEqual(family['law']['distinctMatrices'], 1)
        self.assertIs(family['law']['isRepresentation'], True)
        self.assertIs(family['law']['faithful'], False)
        self.assertIs(family['physicalGeometry'], False)
        self.assertEqual(family['space'], 'auxiliary-trivial-2d')
        self.assertTrue(all(p['equal'] for p in family['pairs']))

    def test_07_individual_diagonalization_commutator_and_scalar_field(self):
        d = self.results[(1, 2)]['diagonalization']
        a, b, q, qi = (rational_matrix(d[key]) for key in ('A', 'B', 'Q', 'inverseQ'))
        self.assertEqual(d['AId'], 'M')
        self.assertEqual(d['BId'], 'RM')
        self.assertEqual(a, self.original[4])
        self.assertEqual(b, self.original[5])
        self.assertEqual(mm(q, qi), I)
        self.assertEqual(mm(qi, q), I)
        self.assertEqual(mm(mm(qi, b), q), a)
        self.assertEqual(mm(mm(qi, a), q), b)
        self.assertEqual(raw(d['AInQ']), b)
        self.assertEqual(raw(d['BInQ']), a)
        commutator = difference(mm(a, b), mm(b, a))
        self.assertEqual(raw(d['commutator']), [[0, 2], [-2, 0]])
        self.assertEqual(raw(d['commutator']), commutator)
        self.assertEqual(raw(d['commutatorInQ']), mm(mm(qi, commutator), q))
        self.assertIs(d['noCommonDiagonalBasis'], True)
        self.assertNotEqual(commutator, [[0, 0], [0, 0]])
        self.assertEqual(raw(d['physicalProduct']), mm(a, b))
        self.assertEqual(raw(d['mixedIndividualDiagonalProduct']), I)
        self.assertIs(d['mixedProductEqual'], False)
        rotation = d['rotationField']
        r = raw(rotation['matrix'])
        self.assertEqual(r[0][0]+r[1][1], 0)
        self.assertEqual(r[0][0]*r[1][1]-r[0][1]*r[1][0], 1)
        self.assertEqual(raw(rotation['square']), [[-1, 0], [0, -1]])
        # Characteristic polynomial is lambda^2+1: no real root, so no real
        # diagonalizer. Distinct roots +/-i and the exact independent vectors
        # (1,-i),(1,i) give a complex eigenbasis. Gaussian integer pairs below
        # avoid floating-point complex arithmetic.
        add = lambda x, y: (x[0]+y[0], x[1]+y[1])
        scale = lambda c, z: (c*z[0], c*z[1])
        mul = lambda x, y: (x[0]*y[0]-x[1]*y[1], x[0]*y[1]+x[1]*y[0])
        vectors = (((1, 0), (0, -1)), ((1, 0), (0, 1)))
        eigenvalues = ((0, 1), (0, -1))
        for v, eigenvalue in zip(vectors, eigenvalues):
            self.assertEqual(tuple(add(scale(row[0], v[0]), scale(row[1], v[1])) for row in r), tuple(mul(eigenvalue, z) for z in v))
        self.assertNotEqual(add(mul(vectors[0][0], vectors[1][1]), scale(-1, mul(vectors[1][0], vectors[0][1]))), (0, 0))
        self.assertIs(rotation['realDiagonalizable'], False)
        self.assertIs(rotation['complexDiagonalizable'], True)

    def test_08_output_isolation_and_exact_json_types(self):
        result = self.results[(1, 2)]
        changed = run('representation_actions', {'point': [1, 2]})
        changed['families'][2]['pairs'][0]['frames'][0]['point']['vector'][0] = 999
        changed['families'][0]['operations'][0]['matrix']['matrix'][0][0] = 999
        changed['diagonalization']['inverseQ']['matrix'][0][0] = '999/2'
        self.assertEqual(run('representation_actions', {'point': [1, 2]}), result)
        def walk(value):
            self.assertIsNot(type(value), float)
            self.assertNotIsInstance(value, F)
            if isinstance(value, dict):
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(result)
        json.dumps(result, allow_nan=False)
        # Correctness flags remain true while intended pedagogical failures
        # stay false. Neither category is collapsed into one all-boolean test.
        self.assertTrue(all(row['passed'] for row in result['checks']))
        self.assertFalse(result['families'][2]['law']['isRepresentation'])


if __name__ == '__main__':
    unittest.main()
