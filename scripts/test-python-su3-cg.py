"""Independent algebra, analytic coefficients and all bounded SU(3) products."""
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import su3_cg as cg
from lie_applications import _weyl_character


REPS = [(0, 0), (1, 0), (0, 1), (2, 0), (0, 2), (1, 1)]


def complex_values(rows):
    return np.array([complex(x['re'], x['im']) for x in rows])


def request(labels=(1, 0, 0, 1), **kwargs):
    return dict(lab='lie', experiment='su3_cg', **dict(zip(('p1', 'q1', 'p2', 'q2'), labels)), **kwargs)


def casimir(generators):
    ep1, em1, ep2, em2, ep3, em3, h1, h2 = generators
    return ((h1 @ h1 + h2 @ h2 + h1 @ h2) / 3
            + (ep1 @ em1 + em1 @ ep1 + ep2 @ em2 + em2 @ ep2 + ep3 @ em3 + em3 @ ep3) / 2)


class SU3ClebschGordan(unittest.TestCase):
    def assert_close(self, actual, expected, tolerance=1e-10):
        self.assertLessEqual(float(np.max(np.abs(np.asarray(actual) - np.asarray(expected)))), tolerance)

    def test_gt_generators_obey_full_sl3_algebra_and_casimir(self):
        # This checks formulas independently of CG recursion. Include all target
        # highest weights reachable from the bounded inputs, plus larger reps.
        for p in range(5):
            for q in range(5 - p):
                rep = cg._irrep(p, q)
                generators = rep['generators']
                ep1, em1, ep2, em2, ep3, em3, h1, h2 = generators
                dim = rep['dimension']
                self.assertEqual(dim, (p + 1) * (q + 1) * (p + q + 2) // 2)
                e11, e22, e33 = (2 * h1 + h2) / 3, (h2 - h1) / 3, -(h1 + 2 * h2) / 3
                matrices = {(0, 0): e11, (1, 1): e22, (2, 2): e33,
                            (0, 1): ep1, (1, 0): em1, (1, 2): ep2,
                            (2, 1): em2, (0, 2): ep3, (2, 0): em3}
                for (i, j), (k, ell) in itertools.product(matrices, repeat=2):
                    expected = np.zeros((dim, dim))
                    if j == k:
                        expected += matrices[i, ell]
                    if i == ell:
                        expected -= matrices[k, j]
                    self.assert_close(matrices[i, j] @ matrices[k, ell] - matrices[k, ell] @ matrices[i, j], expected)
                eigenvalue = (p * p + q * q + p * q + 3 * p + 3 * q) / 3
                self.assert_close(casimir(generators), eigenvalue * np.eye(dim))

    def test_all_36_products_independent_weyl_characters(self):
        phases = [(0.31, 0.83), (0.83, -1.19), (-0.27, 1.83)]
        for left, right in itertools.product(REPS, repeat=2):
            data = cg._coupling(*left, *right)
            n = data['matrix'].shape[0]
            self.assertEqual(sum(b['dimension'] for b in data['blocks']), n)
            for residual in data['checks'].values():
                self.assertLess(residual, 1e-10)
            for angles in phases:
                product = _weyl_character(*left, angles) * _weyl_character(*right, angles)
                decomposition = sum(_weyl_character(b['p'], b['q'], angles) for b in data['blocks'])
                self.assertLess(abs(product - decomposition), 1e-9)

    def test_all_coupled_columns_have_expected_quadratic_casimir(self):
        # Independent spectral identity in the original tensor-product basis.
        for left, right in itertools.product(REPS, repeat=2):
            data = cg._coupling(*left, *right)
            operator = casimir(data['generators'])
            for block in data['blocks']:
                p, q = block['p'], block['q']
                eigenvalue = (p * p + q * q + p * q + 3 * p + 3 * q) / 3
                vectors = data['matrix'][:, block['start']:block['end']]
                self.assert_close(operator @ vectors, eigenvalue * vectors)

    def test_fundamental_matches_standard_generators(self):
        fund = cg._irrep(1, 0)['generators']
        e12, e23 = np.zeros((3, 3)), np.zeros((3, 3))
        e12[0, 1], e23[1, 2] = 1, 1
        self.assert_close(fund[0], e12)
        self.assert_close(fund[2], e23)
        # Anti-triplet GT basis is (sbar, -dbar, ubar), explicitly compare the
        # conjugate matrices in the physical (ubar,dbar,sbar) basis.
        change = np.array([[0, 0, 1], [0, -1, 0], [1, 0, 0]])
        anti = cg._irrep(0, 1)['generators']
        self.assert_close(anti[0], change.T @ (-e12.T) @ change)
        self.assert_close(anti[2], change.T @ (-e23.T) @ change)

    def test_3_times_3_analytic_symmetric_and_antisymmetric_coefficients(self):
        data = cg._coupling(1, 0, 1, 0)
        c = data['matrix']
        self.assertEqual([(b['p'], b['q'], b['swapParity']) for b in data['blocks']], [(2, 0, 1), (0, 1, -1)])
        # Every sextet column has equal positive amplitudes on symmetric pairs.
        expected_symmetric = []
        for i, j in ((0, 0), (0, 1), (0, 2), (1, 1), (1, 2), (2, 2)):
            v = np.zeros(9)
            if i == j:
                v[3 * i + j] = 1
            else:
                v[3 * i + j] = v[3 * j + i] = 1 / math.sqrt(2)
            expected_symmetric.append(v)
        self.assert_close(c[:, :6], np.column_stack(expected_symmetric))
        expected_antisymmetric = []
        for i, j in ((0, 1), (0, 2), (1, 2)):
            v = np.zeros(9)
            v[3 * i + j], v[3 * j + i] = 1 / math.sqrt(2), -1 / math.sqrt(2)
            expected_antisymmetric.append(v)
        self.assert_close(c[:, 6:], np.column_stack(expected_antisymmetric))

    def test_3_times_3bar_analytic_singlet_and_zero_weight_octet(self):
        data = cg._coupling(1, 0, 0, 1)
        c = data['matrix']
        singlet = np.zeros(9)
        singlet[[2, 4, 6]] = np.array([1, -1, 1]) / math.sqrt(3)
        self.assert_close(c[:, 8], singlet)
        # Octet zero-weight states span the traceless diagonal matrices, with
        # definite standard isospin I=1 and I=0 (independent physical oracle).
        expected_triplet = np.zeros(9)
        expected_triplet[[2, 4]] = np.array([1, 1]) / math.sqrt(2)
        expected_isosinglet = np.zeros(9)
        expected_isosinglet[[2, 4, 6]] = np.array([1, -1, -2]) / math.sqrt(6)
        # Overall signs are fixed by the highest-weight phase, not individually.
        self.assert_close(abs(np.vdot(expected_triplet, c[:, 3])), 1)
        self.assert_close(abs(np.vdot(expected_isosinglet, c[:, 4])), 1)

    def test_8_times_8_resolves_outer_multiplicity_and_exchange(self):
        data = cg._coupling(1, 1, 1, 1)
        blocks = data['blocks']
        self.assertEqual([(b['p'], b['q'], b['copy'], b['swapParity']) for b in blocks],
                         [(2, 2, 1, 1), (3, 0, 1, -1), (0, 3, 1, -1), (1, 1, 1, 1), (1, 1, 2, -1), (0, 0, 1, 1)])
        self.assertEqual(sum(b['dimension'] for b in blocks if b['swapParity'] == 1), 36)
        self.assertEqual(sum(b['dimension'] for b in blocks if b['swapParity'] == -1), 28)
        for block in blocks:
            for j in range(block['start'], block['end']):
                reshaped = data['matrix'][:, j].reshape(8, 8)
                self.assert_close(reshaped.T, block['swapParity'] * reshaped)
        # Distinct octets have identical representation generators yet
        # orthogonal embeddings, not merely duplicated labels.
        symmetric = data['matrix'][:, 47:55]
        antisymmetric = data['matrix'][:, 55:63]
        self.assert_close(symmetric.T @ antisymmetric, np.zeros((8, 8)))

    def test_complex_bidirectional_serialized_roundtrip_all_products(self):
        for left, right in itertools.product(REPS, repeat=2):
            n = cg._dimension(*left) * cg._dimension(*right)
            vector = np.array([complex(math.sin(i + .3), math.cos(i + .7)) for i in range(n)]) * 2.3
            payload = request((*left, *right), state={'amplitudes': [cg._z(z) for z in vector]})
            forward = json.loads(json.dumps(cg.run(payload), allow_nan=False))
            self.assert_close(forward['inputNorm'], float(np.vdot(vector, vector).real))
            self.assert_close(sum(forward['outputProbabilities']), 1)
            inverse = cg.run(request((*left, *right), direction='coupled_to_product',
                                     state={'amplitudes': forward['outputAmplitudes']}))
            self.assert_close(complex_values(inverse['outputAmplitudes']), vector)
            self.assertLess(forward['checks']['roundtrip'], 1e-10)

    def test_small_amplitudes_survive_serialization(self):
        vector = np.array([1e-12 + 0j, 1e-15 + 2e-16j] + [0j] * 7)
        forward = json.loads(json.dumps(cg.run(request(state={'amplitudes': [cg._z(z) for z in vector]})), allow_nan=False))
        self.assertEqual(complex_values(forward['inputAmplitudes'])[1], vector[1])
        inverse = json.loads(json.dumps(cg.run(request(direction='coupled_to_product',
                     state={'amplitudes': forward['outputAmplitudes']})), allow_nan=False))
        self.assertLess(np.linalg.norm(complex_values(inverse['outputAmplitudes']) - vector) / np.linalg.norm(vector), 1e-12)

    def test_coherent_amplitudes_are_not_probabilities(self):
        # Coherent equal product amplitudes add into the symmetric irrep and
        # cancel the antisymmetric irrep; an incoherent mixture would not.
        vector = np.zeros(9, dtype=complex)
        vector[1] = vector[3] = 1 / math.sqrt(2)
        result = cg.run(request((1, 0, 1, 0), state={'amplitudes': [cg._z(z) for z in vector]}))
        self.assert_close(sum(result['outputProbabilities'][6:]), 0)
        vector[3] *= -1
        result = cg.run(request((1, 0, 1, 0), state={'amplitudes': [cg._z(z) for z in vector]}))
        self.assert_close(sum(result['outputProbabilities'][6:]), 1)

    def test_norm_bound_is_closed_under_serialized_basis_changes(self):
        for scale in (1e-12, 1e6):
            # The coherent GT singlet saturates the norm boundary and becomes
            # one large/small coupled amplitude. It must be accepted in reverse.
            vector = np.zeros(9)
            vector[[2, 4, 6]] = scale * np.array([1, -1, 1]) / math.sqrt(3)
            forward = json.loads(json.dumps(cg.run(request(state={'amplitudes': [cg._z(z) for z in vector]})), allow_nan=False))
            inverse = cg.run(request(direction='coupled_to_product', state={'amplitudes': forward['outputAmplitudes']}))
            self.assertLess(np.linalg.norm(complex_values(inverse['outputAmplitudes']) - vector) / scale, 1e-12)
        with self.assertRaises(ValueError):
            cg.run(request((1, 1, 1, 1), state={'amplitudes': [{'re': 1e6, 'im': 0}] * 64}))
        for left, right in itertools.product(REPS, repeat=2):
            n = cg._dimension(*left) * cg._dimension(*right)
            vector = np.array([complex(math.sin(i + .3), math.cos(i + .7)) for i in range(n)])
            vector *= 1e6 / np.linalg.norm(vector)
            forward = json.loads(json.dumps(cg.run(request((*left, *right), state={'amplitudes': [cg._z(z) for z in vector]})), allow_nan=False))
            inverse = cg.run(request((*left, *right), direction='coupled_to_product', state={'amplitudes': forward['outputAmplitudes']}))
            self.assertLess(np.linalg.norm(complex_values(inverse['outputAmplitudes']) - vector) / 1e6, 1e-12)

    def test_deterministic_reconstruction_and_full_generator_exponentials(self):
        first = cg._coupling(1, 1, 1, 1)['matrix'].copy()
        cg._coupling.cache_clear()
        data = cg._coupling(1, 1, 1, 1)
        self.assert_close(first, data['matrix'])
        generators = data['generators']
        hamiltonian = .37 * (generators[0] + generators[1]) + .23j * (generators[2] - generators[3]) + .19 * generators[6]
        eig, vectors = np.linalg.eigh(hamiltonian)
        evolution = (vectors * np.exp(-.83j * eig)) @ vectors.conj().T
        # A generic finite group element must preserve every resolved copy.
        transformed = data['matrix'].T @ evolution @ data['matrix']
        for block in data['blocks']:
            outside = list(range(block['start'])) + list(range(block['end'], 64))
            self.assert_close(transformed[np.ix_(outside, range(block['start'], block['end']))], 0)

    def test_strict_bounds_and_invalid_states(self):
        valid = request()
        invalid = [None, [], {}, dict(valid, unexpected=1), dict(valid, lab='other'),
                   dict(valid, experiment='su3_tensor'), dict(valid, p1=True), dict(valid, p1=3),
                   dict(valid, p1=2, q1=1), dict(valid, q2=-1), dict(valid, p1=1.0),
                   dict(valid, direction='guess'), dict(valid, state=None),
                   dict(valid, state={'index': True}), dict(valid, state={'index': -1}),
                   dict(valid, state={'index': 9}), dict(valid, state={'index': 0, 'amplitudes': []}),
                   dict(valid, state={'amplitudes': []})]
        for bad_number in (True, float('nan'), float('inf'), -float('inf'), 1e7, '1'):
            amplitudes = [{'re': 0, 'im': 0} for _ in range(9)]
            amplitudes[0]['re'] = bad_number
            invalid.append(dict(valid, state={'amplitudes': amplitudes}))
        invalid.append(dict(valid, state={'amplitudes': [{'re': 0, 'im': 0}] * 9}))
        invalid.append(dict(valid, state={'amplitudes': [{'re': 1e-13, 'im': 0}] * 9}))
        invalid.append(dict(valid, state={'amplitudes': [{'re': 1, 'im': 0, 'extra': 0}] * 9}))
        for payload in invalid:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    cg.run(payload)


if __name__ == '__main__':
    unittest.main()
