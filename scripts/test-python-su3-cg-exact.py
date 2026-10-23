"""Independent exact radicals, high-dimensional embeddings and safe roundtrips."""
import itertools
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import numpy as np
import sympy as sp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import su3_cg as cg
import su3_cg_exact as exact
from lie_applications import _weyl_character


def request(labels=(1, 0, 0, 1), **kwargs):
    return dict(lab='lie', experiment='su3_cg', arithmetic='exact',
                **dict(zip(('p1', 'q1', 'p2', 'q2'), labels)), **kwargs)


def values(rows):
    return sp.Matrix([exact._real(value['re']) + sp.I * exact._real(value['im']) for value in rows])


class SU3ExactClebschGordan(unittest.TestCase):
    def assert_zero(self, value):
        if isinstance(value, sp.MatrixBase):
            self.assertTrue(exact._zero(value))
        else:
            self.assertEqual(exact._simp(value), 0)

    def test_analytic_fundamental_and_singlet_radicals(self):
        data = exact._coupling(1, 0, 1, 0)
        c = data['matrix']
        self.assertEqual(c[1, 1], sp.sqrt(2) / 2)
        self.assertEqual(c[3, 1], sp.sqrt(2) / 2)
        self.assertEqual(c[1, 6], sp.sqrt(2) / 2)
        self.assertEqual(c[3, 6], -sp.sqrt(2) / 2)
        result = cg.run(request(state={'index': 2}))
        self.assertEqual([result['exactCGMatrix'][i][8] for i in (2, 4, 6)],
                         ['sqrt(3)/3', '-sqrt(3)/3', 'sqrt(3)/3'])
        self.assertTrue(all(value == '0' for value in result['exactChecks'].values()))
        self.assertEqual(result['exactInputNorm'], '1')
        self.assertEqual(result['exactOutputNorm'], '1')
        self.assertEqual(result['exactOutputProbabilities'][8], '1/3')

    def test_analytic_ten_times_three_first_lowered_weight(self):
        # Tensor-product E21 gives sqrt(3)|lower,u> + |highest,d>.
        # Its unit norm is 2, hence these CG coefficients are fixed without
        # using the CG solver. Orthogonality fixes the other 15-plet HW.
        data = exact._coupling(3, 0, 1, 0)
        c = data['matrix']
        self.assertEqual([(b['p'], b['q'], b['dimension']) for b in data['blocks']], [(4, 0, 15), (2, 1, 15)])
        self.assertEqual(c[1, 1], sp.Rational(1, 2))
        self.assertEqual(c[3, 1], sp.sqrt(3) / 2)
        self.assertEqual(c[1, 15], sp.sqrt(3) / 2)
        self.assertEqual(c[3, 15], -sp.Rational(1, 2))

    def test_complex_exact_amplitudes_and_serialized_inverse(self):
        state = [{'re': '0', 'im': '0'} for _ in range(9)]
        state[1] = {'re': '1/sqrt(2)', 'im': '0'}
        state[3] = {'re': '0', 'im': '1/sqrt(2)'}
        result = json.loads(json.dumps(cg.run(request((1, 0, 1, 0), state={'amplitudes': state})), allow_nan=False))
        self.assertEqual(result['exactOutputAmplitudes'][1], {'re': '1/2', 'im': '1/2'})
        self.assertEqual(result['exactOutputAmplitudes'][6], {'re': '1/2', 'im': '-1/2'})
        inverse = cg.run(request((1, 0, 1, 0), direction='coupled_to_product',
                                 state={'amplitudes': result['exactOutputAmplitudes']}))
        self.assert_zero(values(inverse['exactOutputAmplitudes']) - values(state))
        self.assertEqual(inverse['exactOutputNorm'], '1')
        self.assertTrue(all(value == '0' for value in inverse['exactChecks'].values()))

    def test_exact_branch_does_not_discover_coefficients_from_floats(self):
        with patch.object(cg, '_coupling', side_effect=AssertionError('numeric CG forbidden')), \
                patch('numpy.linalg.svd', side_effect=AssertionError('numeric SVD forbidden')), \
                patch('numpy.linalg.lstsq', side_effect=AssertionError('numeric fit forbidden')):
            result = cg.run(request((2, 0, 1, 0), state={'index': 1}))
        self.assertEqual(result['arithmetic'], 'exact')
        self.assertFalse(exact._coupling(2, 0, 1, 0)['matrix'].atoms(sp.Float))
        self.assertEqual(result['exactOutputNorm'], '1')

    def test_exact_gt_generators_full_lie_algebra_and_casimir(self):
        rep = exact._irrep(2, 2)
        e12, e21, e23, e32, e13, e31, h1, h2 = rep['generators']
        e11, e22, e33 = (2 * h1 + h2) / 3, (h2 - h1) / 3, -(h1 + 2 * h2) / 3
        generators = {(0, 0): e11, (1, 1): e22, (2, 2): e33,
                      (0, 1): e12, (1, 0): e21, (1, 2): e23,
                      (2, 1): e32, (0, 2): e13, (2, 0): e31}
        for (i, j), (k, ell) in itertools.product(generators, repeat=2):
            expected = sp.zeros(rep['dimension'])
            if j == k: expected += generators[i, ell]
            if i == ell: expected -= generators[k, j]
            self.assert_zero(generators[i, j] * generators[k, ell] - generators[k, ell] * generators[i, j] - expected)
        casimir = ((h1 * h1 + h2 * h2 + h1 * h2) / 3
                   + (e12 * e21 + e21 * e12 + e23 * e32 + e32 * e23 + e13 * e31 + e31 * e13) / 2)
        self.assert_zero(casimir - 8 * sp.eye(27))

    def test_high_dimension_27_times_three_and_independent_character(self):
        data = exact._coupling(2, 2, 1, 0)
        self.assertEqual(data['matrix'].shape, (81, 81))
        self.assertFalse(data['matrix'].atoms(sp.Float))
        self.assertEqual([(b['p'], b['q'], b['dimension']) for b in data['blocks']],
                         [(3, 2, 42), (1, 3, 24), (2, 1, 15)])
        for angles in ((.31, .83), (.83, -1.19)):
            product = _weyl_character(2, 2, angles) * _weyl_character(1, 0, angles)
            total = sum(_weyl_character(b['p'], b['q'], angles) for b in data['blocks'])
            self.assertLess(abs(product - total), 1e-9)
        numeric = cg._coupling(2, 2, 1, 0)['matrix']
        self.assertLess(np.max(np.abs(np.array(data['matrix'].evalf().tolist(), dtype=float) - numeric)), 1e-11)
        for x in set(data['matrix']):
            # Every serialized coefficient is accepted by the safe parser.
            self.assert_zero(exact._real(str(x)) - x)

    def test_high_dimension_ten_times_octet_and_exact_casimir(self):
        data = exact._coupling(3, 0, 1, 1)
        self.assertEqual(data['matrix'].shape, (80, 80))
        self.assertEqual([(b['p'], b['q'], b['dimension']) for b in data['blocks']],
                         [(4, 1, 35), (2, 2, 27), (3, 0, 10), (1, 1, 8)])
        # Independently construct the quadratic Casimir in the product basis.
        e12, e21, e23, e32, e13, e31, h1, h2 = data['generators']
        casimir = ((h1 * h1 + h2 * h2 + h1 * h2) / 3
                   + (e12 * e21 + e21 * e12 + e23 * e32 + e32 * e23 + e13 * e31 + e31 * e13) / 2)
        for block in data['blocks']:
            p, q = block['p'], block['q']
            expected = sp.Rational(p * p + q * q + p * q + 3 * p + 3 * q, 3)
            c = data['matrix'][:, block['start']:block['end']]
            self.assert_zero(casimir * c - expected * c)

    def test_large_denominators_and_multiple_radicals_survive_serialized_inverse(self):
        state = [{'re': '(sqrt(2)+sqrt(3))/999983', 'im': 'sqrt(5)/999979'} for _ in range(9)]
        state[4] = {'re': '1/999983', 'im': '-sqrt(7)/999979'}
        result = json.loads(json.dumps(cg.run(request(state={'amplitudes': state}))))
        inverse = cg.run(request(direction='coupled_to_product', state={'amplitudes': result['exactOutputAmplitudes']}))
        self.assert_zero(values(inverse['exactOutputAmplitudes']) - values(state))
        self.assertEqual(result['exactInputNorm'], inverse['exactOutputNorm'])
        # Multiplying an accepted large radicand by the CG sqrt(2) must not
        # make an otherwise valid output fail the reverse input parser.
        state = [{'re': '0', 'im': '0'} for _ in range(9)]
        state[1] = {'re': 'sqrt(999999999989)/1000000', 'im': '0'}
        result = json.loads(json.dumps(cg.run(request((1, 0, 1, 0), state={'amplitudes': state}))))
        self.assertIn('sqrt(1999999999978)', result['exactOutputAmplitudes'][1]['re'])
        inverse = cg.run(request((1, 0, 1, 0), direction='coupled_to_product', state={'amplitudes': result['exactOutputAmplitudes']}))
        self.assert_zero(values(inverse['exactOutputAmplitudes']) - values(state))

    def test_outer_multiplicity_matches_numerical_phase_convention(self):
        data = exact._coupling(1, 1, 1, 1)
        blocks = data['blocks']
        self.assertEqual([(b['p'], b['q'], b['copy'], b['swapParity']) for b in blocks],
                         [(2, 2, 1, 1), (3, 0, 1, -1), (0, 3, 1, -1), (1, 1, 1, 1), (1, 1, 2, -1), (0, 0, 1, 1)])
        self.assert_zero(data['matrix'][:, 47:55].T * data['matrix'][:, 55:63])
        numeric = cg._coupling(1, 1, 1, 1)['matrix']
        self.assertLess(np.max(np.abs(np.array(data['matrix'].evalf().tolist(), dtype=float) - numeric)), 1e-11)
        for x in set(data['matrix']):
            self.assert_zero(exact._real(str(x)) - x)

    def test_safe_parser_and_resource_bounds(self):
        for bad in ('__import__("os")', 'sqrt(-1)', 'sqrt(2.0)', 'I', 'pi', 'sin(1)', '1/0',
                    '[1]', 'True', '1**2', 'sqrt(1,2)', 'sqrt(x=2)', '1e-3', '',
                    '1' * 70000, '0x' + 'f' * 1100):
            with self.subTest(bad=bad[:40]):
                with self.assertRaises(ValueError): exact._real(bad)
        for value in (True, None, float('nan'), float('inf'), {}, []):
            with self.assertRaises(ValueError): exact._real(value)
        self.assertEqual(exact._real('1/1000000000000000000000000000'), sp.Rational(1, 10**27))
        self.assertEqual(exact._real('sqrt(3000000)/1000000'), sp.sqrt(3) / 1000)
        self.assertEqual(exact._real(.1), sp.Rational(1, 10))
        with self.assertRaises(ValueError): cg.run(request((2, 2, 1, 1)))
        with self.assertRaises(ValueError): cg.run(request((4, 1, 0, 0)))
        with self.assertRaises(ValueError): cg.run(request(state={'amplitudes': [{'re': '0', 'im': '0'}] * 9}))


if __name__ == '__main__':
    unittest.main()
