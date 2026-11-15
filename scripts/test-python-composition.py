"""Independent permutation and complex-coordinate oracles for the square model."""
from copy import deepcopy
from itertools import combinations, product as cartesian
from pathlib import Path
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from composition_lab import run, path, closure

IDS = ('E', 'R', 'R2', 'R3', 'M', 'RM', 'R2M', 'R3M')
# Independent corner labels: (-1,-1),(1,-1),(1,1),(-1,1).
# Quarter-turn advances the label; reflection maps i -> 3-i.
PERMS = {name: tuple(((3-i if mirror else i)+turns) % 4 for i in range(4))
         for name, (turns, mirror) in zip(IDS, [(a, False) for a in range(4)]+[(a, True) for a in range(4)])}
ID_BY_PERM = {value: key for key, value in PERMS.items()}
PARAMS = dict(zip(IDS, [(a, False) for a in range(4)]+[(a, True) for a in range(4)]))


def pcompose(a, b):
    return tuple(a[b[i]] for i in range(4))


def pid(a, b):
    return ID_BY_PERM[pcompose(PERMS[a], PERMS[b])]


def zaction(identifier, point):
    turns, mirror = PARAMS[identifier]
    z = complex(*point)
    moved = (1j**turns)*(z.conjugate() if mirror else z)
    return [int(moved.real), int(moved.imag)]


def generated_by_permutations(ids):
    selected = {PERMS[x] for x in ids} | {tuple(range(4))}
    while True:
        extended = selected | {pcompose(a, b) for a in selected for b in selected}
        if extended == selected:
            return {ID_BY_PERM[x] for x in selected}
        selected = extended


def assert_packs(test, value):
    if isinstance(value, dict):
        if 'exact' in value and 'latex' in value and ('shape' in value or 'dimension' in value):
            test.assertEqual(value['exact'], value['numeric'])
            text = value['latex']
            test.assertTrue(text.startswith(r'\begin{pmatrix}') and text.endswith(r'\end{pmatrix}'))
            body = text[len(r'\begin{pmatrix}'):-len(r'\end{pmatrix}')]
            rows = [[int(cell) for cell in row.split('&')] for row in body.split(r'\\')]
            expected = value['exact'] if 'shape' in value else [[x] for x in value['exact']]
            test.assertEqual(rows, expected)
            test.assertTrue(all(type(x) is int for row in rows for x in row))
        for item in value.values():
            assert_packs(test, item)
    elif isinstance(value, list):
        for item in value:
            assert_packs(test, item)


class CompositionTests(unittest.TestCase):
    def test_all_64_products_and_512_associative_triples(self):
        result = run({})
        table = result['group']['multiplication']
        self.assertEqual(table['ids'], list(IDS))
        returned = {a: dict(zip(IDS, row)) for a, row in zip(IDS, table['entries'])}
        for a, b in cartesian(IDS, repeat=2):
            self.assertEqual(returned[a][b], pid(a, b))
        for a, b, c in cartesian(IDS, repeat=3):
            actual_left = returned[returned[a][b]][c]
            actual_right = returned[a][returned[b][c]]
            self.assertEqual(actual_left, actual_right)
            self.assertEqual(PERMS[actual_left], pcompose(pcompose(PERMS[a], PERMS[b]), PERMS[c]))

    def test_every_path_basis_and_25_points_by_complex_actions(self):
        for first, second in cartesian(IDS, repeat=2):
            for point in cartesian(range(-2, 3), repeat=2):
                actual = path(first, second, list(point))
                first_point = zaction(first, point)
                self.assertEqual(actual['frames'][0]['point']['exact'], list(point))
                self.assertEqual(actual['frames'][1]['point']['exact'], first_point)
                self.assertEqual(actual['frames'][2]['point']['exact'], zaction(second, first_point))
                self.assertEqual(actual['productId'], pid(second, first))
                for j, unit in enumerate(([1, 0], [0, 1])):
                    expected = zaction(second, zaction(first, unit))
                    self.assertEqual(actual['frames'][2]['basis'][j]['exact'], expected)
                    self.assertEqual([row[j] for row in actual['matrix']['exact']], expected)

    def test_independent_corner_permutation_for_all_frames(self):
        corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
        for first, second in cartesian(IDS, repeat=2):
            result = path(first, second, [1, 2])
            for frame, identifier in zip(result['frames'], ('E', first, pid(second, first))):
                self.assertEqual([v['exact'] for v in frame['corners']], [corners[i] for i in PERMS[identifier]])

    def test_all_255_nonempty_candidate_sets_and_witnesses(self):
        for length in range(1, 9):
            for selected in combinations(IDS, length):
                result = closure(list(selected))
                missing = [(a, b, pid(a, b)) for a in selected for b in selected if pid(a, b) not in selected]
                self.assertEqual(result['closed'], not missing)
                self.assertEqual(result['containsIdentity'], 'E' in selected)
                inverse_in_set = all(any(pid(a, b) == pid(b, a) == 'E' for b in selected) for a in selected)
                self.assertEqual(result['containsInverses'], inverse_in_set)
                self.assertEqual(result['isSubgroup'], not missing and 'E' in selected and inverse_in_set)
                self.assertEqual(set(result['generatedClosure']), generated_by_permutations(selected))
                if missing:
                    witness = result['missingProduct']
                    self.assertEqual((witness['left'], witness['right'], witness['productId']), missing[0])
                else:
                    self.assertIsNone(result['missingProduct'])
                previous = set()
                for stage in result['generationStages']:
                    current = set(stage['members'])
                    self.assertEqual(current, previous | set(stage['added']))
                    if stage['index']:
                        for witness in stage['witnesses']:
                            self.assertIn(witness['left'], previous)
                            self.assertIn(witness['right'], previous)
                            self.assertEqual(witness['productId'], pid(witness['left'], witness['right']))
                            self.assertIn(witness['productId'], stage['added'])
                    previous = current
                self.assertTrue(result['complete'])
                self.assertEqual(result['generationStages'][-1]['added'], [])

    def test_inverse_orders_and_embedding(self):
        result = run({})
        for operator, inverse in zip(result['operators'], result['group']['inverses']):
            identifier = operator['id']
            self.assertEqual(pid(identifier, inverse['inverseId']), 'E')
            self.assertEqual(pid(inverse['inverseId'], identifier), 'E')
            accumulated = PERMS['E']
            for n in range(1, 9):
                accumulated = pcompose(PERMS[identifier], accumulated)
                if accumulated == PERMS['E']:
                    self.assertEqual(operator['order'], n)
                    break
            self.assertEqual(inverse['leftMatrix']['exact'], [[1, 0], [0, 1]])
            self.assertEqual(inverse['rightMatrix']['exact'], [[1, 0], [0, 1]])
        embedding = result['embedding']
        self.assertEqual(embedding['fixedZ']['mirror']['exact'], [[1,0,0],[0,-1,0],[0,0,1]])
        self.assertEqual(embedding['properMirrorAlternative']['matrix']['exact'], [[1,0,0],[0,-1,0],[0,0,-1]])
        self.assertEqual(embedding['fixedZ']['group'], 'C4v')
        self.assertEqual(embedding['properMirrorAlternative']['group'], 'D4')

    def test_single_probe_counterexample_and_noncommuting_origin(self):
        for x, y in cartesian(range(-2, 3), repeat=2):
            result = path('R', 'M', [x, y])
            swapped = path('M', 'R', [x, y])
            same = result['frames'][2]['point']['exact'] == swapped['frames'][2]['point']['exact']
            self.assertEqual(same, x == y == 0)
        selected = run({'first':'R', 'second':'M', 'point':[0,0]})
        self.assertTrue(selected['comparison']['pointEqual'])
        self.assertFalse(selected['comparison']['matrixEqual'])
        self.assertEqual(selected['comparison']['basisEqual'], [False, False])
        fixed = selected['fixedProbeCounterexample']
        self.assertTrue(fixed['pointEqual'])
        self.assertFalse(fixed['matrixEqual'])
        self.assertEqual([b['equal'] for b in fixed['basis']], [True, False])

    def test_same_object_latex_and_complete_normalized_identity(self):
        payload = {'lab':'composition','first':'R2M','second':'R3','point':[-2,2],
                   'candidateSet':['M','R'],'privateNote':'kept original'}
        before = deepcopy(payload)
        result = run(payload)
        self.assertEqual(payload, before)
        self.assertEqual(result['input'], before)
        self.assertIsNot(result['input'], payload)
        self.assertEqual(result['normalizedInput'], {k:before[k] for k in ('lab','first','second','point','candidateSet')})
        assert_packs(self, result)
        result['input']['point'][0] = 42
        self.assertEqual(payload, before)
        self.assertEqual(run({})['normalizedInput'], {'lab':'composition','first':'R','second':'M','point':[1,2],'candidateSet':['E','R']})

    def test_invalid_inputs_do_not_coerce(self):
        bad = [None, [], 1, 'composition', {'lab':'other'}, {'lab':True},
               {'first':True}, {'first':[]}, {'first':'r'}, {'second':'MR'},
               {'point':(1,2)}, {'point':[True,1]}, {'point':[1.0,2]}, {'point':['1',2]},
               {'point':[0,float('nan')]}, {'point':[float('inf'),0]}, {'point':[3,0]},
               {'point':[-3,0]}, {'point':[1]}, {'point':[1,2,0]}, {'candidateSet':[]},
               {'candidateSet':['E','E']}, {'candidateSet':['MR']}, {'candidateSet':['E',True]},
               {'candidateSet':['E',[]]}, {'candidateSet':'R'}, {'candidateSet':list(IDS)+['E']}]
        for payload in bad:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    run(payload)

    def test_genuine_public_api_reference_identity_and_checks(self):
        from browser_api import run as public
        fixture = json.loads((ROOT/'scripts/fixtures/composition.json').read_text(encoding='utf-8'))
        self.assertEqual(len(fixture['cases']), 8)
        self.assertIn('Actual browser_api.run', fixture['method'])
        for row in fixture['cases']:
            fresh = public('teaching_labs', row['input'])
            self.assertEqual(fresh, row['result'])
            self.assertTrue(all(check['passed'] for check in fresh['checks']))
            assert_packs(self, fresh)
            self.assertEqual(fresh, run(row['input']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
