"""Independent analytic, character and multiplicity checks for SU(3) Racah."""
import itertools
import json
from pathlib import Path
import sys
import unittest

import numpy as np
import sympy as sp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import su3_racah as racah
from lie_applications import _weyl_character


def request(factors=None, target=None, **kwargs):
    data = dict(lab='lie', experiment='su3_racah', **kwargs)
    if factors is not None:
        data['factors'] = [list(pair) for pair in factors]
    if target is not None:
        data['target'] = list(target)
    return data


def exact_matrix(rows):
    # These are trusted generated algebraic strings, not user expressions.
    return sp.Matrix([[sp.sympify(x) for x in row] for row in rows])


def exact_vector(rows):
    return sp.Matrix([sp.sympify(z['re']) + sp.I * sp.sympify(z['im']) for z in rows])


class SU3Racah(unittest.TestCase):
    def assert_exact(self, actual, expected):
        self.assertTrue(racah._zero(sp.Matrix(actual) - sp.Matrix(expected)))

    def assert_result(self, result):
        m = result['multiplicity']
        self.assertEqual(len(result['leftPaths']), m)
        self.assertEqual(len(result['rightPaths']), m)
        self.assertEqual(set(result['exactChecks'].values()), {'0'})
        self.assertLess(max(result['checks'].values()), 2e-12)
        f = exact_matrix(result['exactFMatrix'])
        s = exact_matrix(result['exactSixJMatrix'])
        self.assert_exact(f.T * f, sp.eye(m))
        dl = sp.diag(*[path['intermediate']['dimension'] for path in result['leftPaths']])
        dr = sp.diag(*[path['intermediate']['dimension'] for path in result['rightPaths']])
        self.assert_exact(s.T * dr * s, dl.inv())
        self.assert_exact(s * dl * s.T, dr.inv())
        json.dumps(result, allow_nan=False)

    def test_default_three_quarks_independent_young_vectors(self):
        # Work directly in |uud>, |udu>, |duu>, independently of all GT code.
        l = sp.Matrix([[2 / sp.sqrt(6), 0], [-1 / sp.sqrt(6), 1 / sp.sqrt(2)],
                       [-1 / sp.sqrt(6), -1 / sp.sqrt(2)]])
        r = sp.Matrix([[1 / sp.sqrt(6), 1 / sp.sqrt(2)], [1 / sp.sqrt(6), -1 / sp.sqrt(2)],
                       [-2 / sp.sqrt(6), 0]])
        result = racah.run(request())
        self.assert_result(result)
        self.assertEqual(result['dimension'], 27)
        self.assertEqual(result['multiplicity'], 2)
        self.assert_exact(exact_matrix(result['exactFMatrix']), r.T * l)
        self.assertEqual([(path['intermediate']['p'], path['intermediate']['q']) for path in result['leftPaths']],
                         [(2, 0), (0, 1)])
        self.assertEqual([path['firstSwapParity'] for path in result['leftPaths']], [1, -1])
        self.assert_exact(exact_matrix(result['exactSixJMatrix']),
                          [[sp.Rational(1, 12), sp.sqrt(6) / 12], [sp.sqrt(6) / 12, -sp.Rational(1, 6)]])

    def test_three_quark_singlet_and_decuplet_scalar(self):
        # Epsilon is invariant under the cyclic associator; the completely
        # symmetric highest state is |uuu> in both coupling orders.
        singlet = racah.run(request(target=(0, 0)))
        decuplet = racah.run(request(target=(3, 0)))
        self.assert_result(singlet)
        self.assert_result(decuplet)
        self.assertEqual(singlet['exactFMatrix'], [['1']])
        self.assertEqual(singlet['exactSixJMatrix'], [['1/3']])
        self.assertEqual(decuplet['exactFMatrix'], [['1']])
        self.assertEqual(decuplet['exactSixJMatrix'], [['1/6']])

    def test_quark_antiquark_trace_identity(self):
        # Two normalized trace contractions have overlap 1/3.  Orthogonal
        # traceless complements then have magnitude sqrt(1-1/9)=2sqrt(2)/3.
        result = racah.run(request(((1, 0), (0, 1), (1, 0)), (1, 0)))
        self.assert_result(result)
        self.assert_exact(exact_matrix(result['exactFMatrix']),
                          [[-sp.Rational(1, 3), 2 * sp.sqrt(2) / 3],
                           [2 * sp.sqrt(2) / 3, sp.Rational(1, 3)]])
        self.assertEqual([path['intermediate']['dimension'] for path in result['leftPaths']], [8, 1])

    def test_complex_radical_roundtrip_and_norm(self):
        state = {'amplitudes': [{'re': 'sqrt(2)/3', 'im': '1/7'}, {'re': '-2/5', 'im': 'sqrt(3)/11'}]}
        forward = racah.run(request(state=state))
        backward = racah.run(request(direction='right_to_left',
                                     state={'amplitudes': forward['exactOutputAmplitudes']}))
        self.assert_result(forward)
        self.assert_result(backward)
        self.assert_exact(exact_vector(backward['exactOutputAmplitudes']), exact_vector(forward['exactInputAmplitudes']))
        self.assertEqual(forward['exactInputNorm'], forward['exactOutputNorm'])
        self.assertNotEqual(forward['exactInputNorm'], '1')
        self.assertAlmostEqual(sum(forward['outputProbabilities']), 1.)

    def test_octet_all_targets_and_both_vertex_outer_labels(self):
        factors = ((1, 1),) * 3
        targets = racah._decomposition(factors)
        expected = {(3, 3): 1, (4, 1): 2, (1, 4): 2, (2, 2): 6,
                    (3, 0): 4, (0, 3): 4, (1, 1): 8, (0, 0): 2}
        self.assertEqual({(x['p'], x['q']): x['multiplicity'] for x in targets}, expected)
        for target in targets:
            result = racah.run(request(factors, (target['p'], target['q'])))
            self.assert_result(result)
            self.assertEqual(result['dimension'], 512)
        result = racah.run(request(factors, (1, 1)))
        for side in ('leftPaths', 'rightPaths'):
            octets = [path for path in result[side] if path['intermediate']['dimension'] == 8]
            self.assertEqual([(x['firstCopy'], x['secondCopy']) for x in octets], [(1, 1), (1, 2), (2, 1), (2, 2)])
            self.assertEqual([(x['firstSwapParity'], x['secondSwapParity']) for x in octets],
                             [(1, 1), (1, -1), (-1, 1), (-1, -1)])
        # Independent 1↔1 trace contraction in the adjoint has overlap 1/8.
        self.assertEqual(result['exactFMatrix'][-1][-1], '1/8')
        self.assertEqual(result['exactFMatrix'][0][0], '7/40')

    def test_all_216_characters_and_path_count(self):
        # This tests every supported ordered triple without expensive complete
        # CG recomputation. Integer characters and torus Weyl determinants are
        # independent of the exact highest-weight kernels used by Racah.
        count = 0
        for factors in itertools.product(racah.FACTORS, repeat=3):
            targets = racah._decomposition(factors)
            dimension = np.prod([racah._dimension(*pair) for pair in factors])
            self.assertEqual(sum(row['multiplicity'] * row['dimension'] for row in targets), dimension)
            product = np.prod([_weyl_character(*pair, (.31, .83)) for pair in factors])
            decomposed = sum(row['multiplicity'] * _weyl_character(row['p'], row['q'], (.31, .83)) for row in targets)
            self.assertLess(abs(product - decomposed), 2e-8)
            # Both associativity trees must have the same outer path count.
            for target in targets:
                for side in (0, 1):
                    binary = racah._decomposition(factors[:2] if side == 0 else factors[1:])
                    paths = 0
                    for middle in binary:
                        pair = ((middle['p'], middle['q']), factors[2]) if side == 0 else (factors[0], (middle['p'], middle['q']))
                        paths += middle['multiplicity'] * next((row['multiplicity'] for row in racah._decomposition(pair)
                                    if (row['p'], row['q']) == (target['p'], target['q'])), 0)
                    self.assertEqual(paths, target['multiplicity'])
            count += 1
        self.assertEqual(count, 216)

    def test_neutral_factors_and_mixed_nonidentical_vertices(self):
        # All six representation types occur in all three factor positions.
        for rep in racah.FACTORS:
            for position in range(3):
                factors = [(0, 0)] * 3
                factors[position] = rep
                result = racah.run(request(tuple(factors), rep))
                self.assert_result(result)
                self.assertEqual(result['exactFMatrix'], [['1']])
        examples = [(((2, 0), (1, 0), (1, 0)), (2, 1)),
                    (((0, 2), (0, 1), (0, 1)), (1, 2)),
                    (((2, 0), (1, 1), (0, 2)), (1, 1)),
                    (((1, 1), (0, 1), (2, 0)), (1, 0)),
                    (((0, 1), (2, 0), (1, 1)), (1, 0))]
        for factors, target in examples:
            self.assert_result(racah.run(request(factors, target)))

    def test_selected_highest_matches_complete_cg_conventions(self):
        for labels in ((1, 0, 1, 0), (1, 0, 0, 1), (1, 1, 1, 1), (2, 0, 1, 0)):
            full = racah._coupling(*labels)
            for block in full['blocks']:
                seeds = racah._highest(*labels, block['p'], block['q'])
                seed = seeds[block['copy'] - 1]
                self.assertEqual(seed['swapParity'], block['swapParity'])
                self.assert_exact(full['matrix'][seed['indices'], [block['start']]], seed['seed'])

    def test_input_rejection_and_safe_symbolic_parser(self):
        invalid = [dict(factors=[]), dict(factors=[[3, 0], [1, 0], [1, 0]]),
                   dict(factors=[[True, 0], [1, 0], [1, 0]]), dict(target=[2, 2]),
                   dict(target=[-1, 0]), dict(direction='product_to_coupled'),
                   dict(arithmetic='numeric'), dict(state={'index': 2}),
                   dict(state={'amplitudes': [{'re': '0', 'im': '0'}] * 2}),
                   dict(state={'amplitudes': [{'re': '__import__("os")', 'im': '0'}] * 2}),
                   dict(state={'amplitudes': [{'re': 'sqrt(-1)', 'im': '0'}] * 2}),
                   dict(state={'amplitudes': [{'re': None, 'im': '0'}] * 2}),
                   dict(state={'amplitudes': [{'re': '10**9', 'im': '0'}] * 2})]
        for kwargs in invalid:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                racah.run(request(**kwargs))

    def test_omitted_target_selects_existing_representation(self):
        neutral = racah.run(request(((0, 0),) * 3))
        self.assertEqual((neutral['target']['p'], neutral['target']['q']), (0, 0))
        self.assert_result(neutral)
        high = racah.run(request(((2, 0), (1, 0), (1, 0))))
        self.assertEqual((high['target']['p'], high['target']['q']), (4, 0))
        self.assert_result(high)
        octet = racah.run(request())
        self.assertEqual((octet['target']['p'], octet['target']['q']), (1, 1))

    def test_small_exact_amplitudes_and_boundary_roundtrip(self):
        result = racah.run(request(state={'amplitudes': [{'re': '1/1000000000000', 'im': '0'},
                                                       {'re': '0', 'im': '0'}]}))
        self.assertNotEqual(result['exactOutputAmplitudes'][0]['re'], '0')
        self.assertEqual(result['exactInputNorm'], '1/1000000000000000000000000')
        backward = racah.run(request(direction='right_to_left',
                                     state={'amplitudes': result['exactOutputAmplitudes']}))
        self.assert_exact(exact_vector(backward['exactOutputAmplitudes']), exact_vector(result['exactInputAmplitudes']))
        # At the upper bound every returned component remains inside the safe
        # exact parser's amplitude bound and is reusable without normalizing.
        upper = racah.run(request(state={'amplitudes': [{'re': '1000000', 'im': '0'},
                                                      {'re': '0', 'im': '0'}]}))
        back_upper = racah.run(request(direction='right_to_left',
                                       state={'amplitudes': upper['exactOutputAmplitudes']}))
        self.assert_result(upper)
        self.assert_result(back_upper)
        self.assertEqual(back_upper['exactOutputAmplitudes'], upper['exactInputAmplitudes'])


if __name__ == '__main__':
    unittest.main()
