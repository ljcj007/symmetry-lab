"""Independent GT enumeration, fundamental/dual and complete Lie-algebra checks."""
from copy import deepcopy
from itertools import product
from pathlib import Path
import importlib.util
import json
import math
import re
import sys
import unittest

import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run as public_run
from su3_basis_lab import run
import su3_cg_exact as old_exact
import su3_cg as old_numeric

PAIRS = [(p, total-p) for total in range(5) for p in range(total, -1, -1)]
RESULTS = {}


def result(p, q):
    if (p, q) not in RESULTS:
        RESULTS[p, q] = public_run('teaching_labs', {'lab': 'su3_basis', 'p': p, 'q': q})
    return RESULTS[p, q]


def matrices(reply):
    return {op['id']: sp.Matrix([[sp.sympify(v) for v in row] for row in op['matrix']['exact']])
            for op in reply['operators']}


def zero(matrix):
    return all(sp.simplify(value) == 0 for value in matrix)


class CanonicalSU3Basis(unittest.TestCase):
    def test_independent_interlacing_enumeration_all_fifteen(self):
        dimensions = []
        for p, q in PAIRS:
            r = result(p, q)
            # Enumerate a cube and filter inequalities, independently of the core loops.
            allowed = {(a, b, c) for a, b, c in product(range(p+q+1), repeat=3)
                       if p+q >= a >= q >= b >= 0 and a >= c >= b}
            expected_dimension = (p+1)*(q+1)*(p+q+2)//2
            dimensions.append(expected_dimension)
            self.assertEqual(len(allowed), expected_dimension)
            self.assertEqual({tuple(s['pattern']) for s in r['basis']['states']}, allowed)
            self.assertEqual(r['basis']['order'], list(range(expected_dimension)))
            self.assertTrue(all(check['passed'] for check in r['checks']))
            order_keys = [(*[sum(s['weight']), s['weight'][0]], *s['pattern'])
                          for s in r['basis']['states']]
            self.assertEqual(order_keys, sorted(order_keys, reverse=True))
        self.assertEqual(len(PAIRS), 15)
        self.assertEqual(max(dimensions), 27)

    def test_content_cartan_and_complete_weight_groups(self):
        for p, q in PAIRS:
            r = result(p, q)
            g = matrices(r)
            seen = []
            for group in r['weightGroups']:
                self.assertGreater(len(group['members']), 0)
                for index in group['members']:
                    seen.append(index)
                    self.assertEqual(r['basis']['states'][index]['weight'], group['weight'])
            self.assertEqual(sorted(seen), list(range(r['representation']['dimension'])))
            for s in r['basis']['states']:
                a, b, c = s['pattern']
                row_sums = [0, c, a+b, p+2*q]
                n = [row_sums[i+1]-row_sums[i] for i in range(3)]
                self.assertEqual(s['content']['n'], n)
                self.assertEqual(sum(n), p+2*q)
                h1, h2 = n[0]-n[1], n[1]-n[2]
                self.assertEqual(s['weight'], [h1, h2])
                expected = {'H1': h1, 'H2': h2, 'T3': sp.Rational(h1, 2),
                            'T8': (h1+2*h2)/(2*sp.sqrt(3))}
                for key, value in expected.items():
                    self.assertEqual(sp.simplify(sp.sympify(s['cartan'][key]['exact'])-value), 0)
                self.assertEqual(g['H1'][s['index'], s['index']], h1)
                self.assertEqual(g['H2'][s['index'], s['index']], h2)
                self.assertEqual(s['twoI'], a-b)
                self.assertEqual(s['twoI3'], h1)
                self.assertEqual(s['threeY'], h1+2*h2)

    def test_full_gl3_traceless_lie_algebra_and_casimir_all_fifteen(self):
        for p, q in PAIRS:
            r = result(p, q)
            g = matrices(r)
            n = r['representation']['dimension']
            h1, h2 = g['H1'], g['H2']
            e = {(0, 0): (2*h1+h2)/3, (1, 1): (h2-h1)/3, (2, 2): -(h1+2*h2)/3,
                 (0, 1): g['E12'], (1, 0): g['E21'], (1, 2): g['E23'],
                 (2, 1): g['E32'], (0, 2): g['E13'], (2, 0): g['E31']}
            for (i, j), (k, ell) in product(e, repeat=2):
                expected = sp.zeros(n)
                if j == k:
                    expected += e[i, ell]
                if i == ell:
                    expected -= e[k, j]
                self.assertTrue(zero(e[i, j]*e[k, ell]-e[k, ell]*e[i, j]-expected), (p, q, i, j, k, ell))
            for up, down in [('E12', 'E21'), ('E23', 'E32'), ('E13', 'E31')]:
                self.assertEqual(g[up].T, g[down])
            c = ((h1*h1+h2*h2+h1*h2)/3
                 +sum((g[a]*g[b]+g[b]*g[a] for a, b in [('E12', 'E21'), ('E23', 'E32'), ('E13', 'E31')]), sp.zeros(n))/2)
            self.assertTrue(zero(c-sp.Rational(p*p+p*q+q*q+3*p+3*q, 3)*sp.eye(n)))

    def test_fundamental_gell_mann_and_conjugate_phase(self):
        fundamental = matrices(result(1, 0))
        dual = matrices(result(0, 1))
        self.assertEqual([s['label'] for s in result(1, 0)['basis']['states']], ['u', 'd', 's'])
        self.assertEqual([s['label'] for s in result(0, 1)['basis']['states']], ['s̄', '−d̄', 'ū'])
        for i in range(3):
            for j in range(3):
                if i != j:
                    expected = sp.zeros(3)
                    expected[i, j] = 1
                    self.assertEqual(fundamental[f'E{i+1}{j+1}'], expected)
        self.assertEqual(fundamental['H1']/2, sp.diag(sp.Rational(1, 2), -sp.Rational(1, 2), 0))
        self.assertTrue(zero((fundamental['H1']+2*fundamental['H2'])/(2*sp.sqrt(3))
                             -sp.diag(1, 1, -2)/(2*sp.sqrt(3))))
        # Anti-fundamental generators -E^T in dual basis (ubar,dbar,sbar),
        # changed to the explicitly documented (sbar,-dbar,ubar) basis.
        u = sp.Matrix([[0, 0, 1], [0, -1, 0], [1, 0, 0]])
        for key in fundamental:
            self.assertEqual(dual[key], u.T*(-fundamental[key].T)*u)

    def test_all_columns_root_shifts_and_packs_share_values(self):
        def scalar(pack):
            self.assertRegex(pack['exact'], r'^[0-9+*/() sqrt.\-]+$')
            self.assertNotIn('**', pack['exact'])
            exact = sp.sympify(pack['exact'])
            self.assertFalse(exact.atoms(sp.Float))
            self.assertEqual(pack['latex'], sp.latex(exact))
            self.assertTrue(math.isfinite(pack['numeric']))
            self.assertEqual(pack['numeric'], float(exact))
        for p, q in PAIRS:
            r = result(p, q)
            g = matrices(r)
            states = r['basis']['states']
            for op in r['operators']:
                matrix = g[op['id']]
                self.assertEqual(op['matrix']['latex'], sp.latex(matrix))
                for row in range(matrix.rows):
                    for col in range(matrix.cols):
                        self.assertEqual(op['matrix']['numeric'][row][col], float(matrix[row, col]))
                for index, action in enumerate(op['columns']):
                    vector = matrix[:, index]
                    self.assertEqual(action['sourceIndex'], index)
                    self.assertEqual(action['vector']['exact'], [str(v) for v in vector])
                    self.assertEqual(action['vector']['latex'], sp.latex(vector))
                    self.assertEqual(action['vector']['numeric'], [float(v) for v in vector])
                    self.assertEqual(action['zero'], vector == sp.zeros(matrix.rows, 1))
                    scalar(action['normSquared'])
                    self.assertEqual(sp.sympify(action['normSquared']['exact']), sp.simplify((vector.T*vector)[0]))
                    self.assertEqual([t['targetIndex'] for t in action['terms']], [i for i, v in enumerate(vector) if v != 0])
                    for term in action['terms']:
                        target = term['targetIndex']
                        scalar(term['coefficient'])
                        self.assertEqual(sp.sympify(term['coefficient']['exact']), vector[target])
                        self.assertEqual([states[target]['weight'][i]-states[index]['weight'][i] for i in range(2)], op['weightShift'])
            for state in states:
                for pack in [*state['cartan'].values(), *state['isospin'].values()]:
                    scalar(pack)

    def test_fixed_adjoint_zero_weight_states_are_distinct(self):
        f = result(1, 0)['fixedOctet']
        self.assertEqual(f, result(2, 2)['fixedOctet'])
        self.assertEqual(f['indices'], [3, 4])
        first, second = f['rows']
        self.assertEqual([f['basis'][i]['pattern'] for i in f['indices']], [[2, 0, 1], [1, 1, 1]])
        self.assertEqual([f['basis'][i]['weight'] for i in f['indices']], [[0, 0], [0, 0]])
        self.assertEqual(first['actions']['E12']['terms'], [{'targetIndex': 1, 'coefficient': {'exact': 'sqrt(2)', 'latex': r'\sqrt{2}', 'numeric': math.sqrt(2)}}])
        self.assertTrue(second['actions']['E12']['zero'])
        self.assertEqual(first['actions']['E23']['normSquared']['exact'], '1/2')
        self.assertEqual(second['actions']['E23']['normSquared']['exact'], '3/2')

    def test_cached_cores_and_previous_cg_are_unchanged(self):
        snapshots = {(p, q): deepcopy(old_exact._irrep(p, q)) for p, q in PAIRS}
        requests = [dict(lab='lie', experiment='su3_cg', p1=1, q1=0, p2=1, q2=0,
                         arithmetic=arithmetic, state={'index': 1}) for arithmetic in ['numeric', 'exact']]
        requests.append(dict(lab='lie', experiment='su3_cg', p1=0, q1=1, p2=1, q2=0,
                             arithmetic='exact', state={'index': 2}))
        before = [deepcopy(public_run('teaching_labs', request)) for request in requests]
        for p, q in PAIRS:
            reply = run({'lab': 'su3_basis', 'p': p, 'q': q})
            reply['basis']['states'][0]['pattern'][0] = -900
            reply['operators'][0]['matrix']['exact'][0][0] = '900'
            reply['operators'][0]['columns'][0]['vector']['exact'][0] = '900'
            reply['fixedOctet']['basis'][0]['content']['n'][0] = -900
            self.assertEqual(run({'lab': 'su3_basis', 'p': p, 'q': q}), result(p, q))
        for pair, snapshot in snapshots.items():
            self.assertEqual(old_exact._irrep(*pair), snapshot)
        self.assertEqual([public_run('teaching_labs', request) for request in requests], before)

    def test_reject_malformed_and_out_of_scope_requests(self):
        for value in [True, False, 1.0, 0.0, '1', None, [], {}, float('nan'), float('inf'), -1, 5]:
            for key in ['p', 'q']:
                with self.assertRaises(ValueError, msg=(key, value)):
                    run({'lab': 'su3_basis', 'p': 1, 'q': 0, key: value})
        for request in [[], None, {'lab': 'wrong'}, {'p': 3, 'q': 2},
                        {'p': 1, 'q': 0, 'state': 0}, {'p': 1, 'q': 0, 'generator': 'E12'}]:
            with self.assertRaises(ValueError, msg=request):
                run(request)
        self.assertEqual(run({})['normalizedInput'], {'lab': 'su3_basis', 'p': 1, 'q': 0})

    def test_actual_public_api_fixture_matches_all_fifteen(self):
        path = ROOT/'scripts/build-su3-basis-reference.py'
        spec = importlib.util.spec_from_file_location('su3_basis_reference', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        document = module.build(True)
        self.assertEqual(len(document['cases']), 15)
        for case in document['cases']:
            self.assertEqual(case['result'], result(case['input']['p'], case['input']['q']))


if __name__ == '__main__':
    unittest.main()
