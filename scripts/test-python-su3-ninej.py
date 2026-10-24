"""Independent S4, trace, character and outer-multiplicity checks for SU(3) 9j."""
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np
import sympy as sp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import su3_ninej as ninej
import su3_racah as racah
from lie_applications import _weyl_character


def request(factors=None, target=None, **kwargs):
    data = dict(lab='lie', experiment='su3_ninej', **kwargs)
    if factors is not None:
        data['factors'] = [list(pair) for pair in factors]
    if target is not None:
        data['target'] = list(target)
    return data


def matrix(rows):
    # Generated trusted algebraic strings, never user-supplied expressions.
    return sp.Matrix([[sp.sympify(x) for x in row] for row in rows])


def vector(rows):
    return sp.Matrix([sp.sympify(z['re']) + sp.I * sp.sympify(z['im']) for z in rows])


class SU3NineJ(unittest.TestCase):
    def assert_exact(self, actual, expected):
        self.assertTrue(ninej._zero(sp.Matrix(actual) - sp.Matrix(expected)))

    def assert_result(self, result):
        m = result['multiplicity']
        self.assertEqual(len(result['leftPaths']), m)
        self.assertEqual(len(result['rightPaths']), m)
        self.assertEqual(set(result['exactChecks'].values()), {'0'})
        self.assertLess(max(result['checks'].values()), 3e-12)
        r, s = matrix(result['exactRecouplingMatrix']), matrix(result['exactNineJMatrix'])
        self.assert_exact(r.T * r, sp.eye(m))
        dl = sp.diag(*[ninej._path_dimension(path) for path in result['leftPaths']])
        dr = sp.diag(*[ninej._path_dimension(path) for path in result['rightPaths']])
        self.assert_exact(s.T * dr * s, dl.inv())
        self.assert_exact(s * dl * s.T, dr.inv())
        for side, letters in (('leftPaths', ('α', 'β', 'γ')), ('rightPaths', ('δ', 'ε', 'ζ'))):
            for path in result[side]:
                for letter, key in zip(letters, ('firstCopy', 'secondCopy', 'finalCopy')):
                    self.assertIn(f"{letter}={path[key]}", path['label'])
        json.dumps(result, allow_nan=False)

    def test_default_four_quarks_independent_s4_highest_vectors(self):
        # Independent product states (uuud,uudu,uduu,duuu), with no CG helper.
        # The 15(2,1) highest space is the sum-zero subspace.  Symmetric and
        # antisymmetric first pairs fix three normalized paired-tree vectors.
        l = sp.Matrix([[sp.Rational(1, 2), 1 / sp.sqrt(2), 0],
                       [sp.Rational(1, 2), -1 / sp.sqrt(2), 0],
                       [-sp.Rational(1, 2), 0, 1 / sp.sqrt(2)],
                       [-sp.Rational(1, 2), 0, -1 / sp.sqrt(2)]])
        # Explicit B↔C in ABCD makes the crossing permutation nontrivial.
        permutation = sp.eye(4)[[0, 2, 1, 3], :]
        right = permutation * l
        result = ninej.run(request())
        self.assert_result(result)
        self.assertEqual(result['dimension'], 81)
        self.assertEqual((result['target']['p'], result['target']['q']), (2, 1))
        self.assertEqual(result['multiplicity'], 3)
        self.assert_exact(matrix(result['exactRecouplingMatrix']), right.T * l)
        self.assert_exact(matrix(result['exactNineJMatrix']),
                          [[0, sp.Rational(1, 36), sp.Rational(1, 36)],
                           [sp.Rational(1, 36), sp.Rational(1, 36), -sp.Rational(1, 36)],
                           [sp.Rational(1, 36), -sp.Rational(1, 36), sp.Rational(1, 36)]])
        self.assertEqual([x['firstSwapParity'] for x in result['leftPaths']], [1, 1, -1])
        self.assertEqual([x['secondSwapParity'] for x in result['leftPaths']], [1, -1, 1])
        self.assertEqual(result['leftPaths'][0]['finalSwapParity'], -1)
        self.assertEqual(result['exactOutputProbabilities'], ['0', '1/2', '1/2'])

    def test_four_quarks_all_targets(self):
        expected = {(4, 0): 1, (2, 1): 3, (0, 2): 2, (1, 0): 3}
        targets = ninej._decomposition(((1, 0),) * 4)
        self.assertEqual({(x['p'], x['q']): x['multiplicity'] for x in targets}, expected)
        for target in targets:
            result = ninej.run(request(target=(target['p'], target['q'])))
            self.assert_result(result)
        self.assertEqual(ninej.run(request(target=(4, 0)))['exactRecouplingMatrix'], [['1']])

    def test_mixed_singlet_independent_trace_contractions(self):
        # In 3⊗bar3⊗3⊗bar3 let X_ijkl=δijδkl and Y_ijkl=δilδkj.
        # X·X=Y·Y=9, X·Y=3; the left singlets are (Y-X/3)/sqrt8,X/3.
        # Crossing quark pairs gives the symmetric/antisymmetric contractions
        # (X+Y)/sqrt24,(X-Y)/sqrt12 with this site's positive GT phases.
        x = sp.Matrix([int(i == j and k == l) for i, j, k, l in itertools.product(range(3), repeat=4)])
        y = sp.Matrix([int(i == l and k == j) for i, j, k, l in itertools.product(range(3), repeat=4)])
        left = sp.Matrix.hstack((y - x / 3) / sp.sqrt(8), x / 3)
        right = sp.Matrix.hstack((x + y) / sp.sqrt(24), (x - y) / sp.sqrt(12))
        result = ninej.run(request(((1, 0), (0, 1), (1, 0), (0, 1)), (0, 0)))
        self.assert_result(result)
        self.assert_exact(matrix(result['exactRecouplingMatrix']), right.T * left)
        self.assertEqual([ninej._path_dimension(x) for x in result['leftPaths']], [64, 1])
        self.assertEqual([ninej._path_dimension(x) for x in result['rightPaths']], [36, 9])

    def test_mixed_octet_final_root_outer_copy(self):
        result = ninej.run(request(((1, 0), (0, 1), (1, 0), (0, 1)), (1, 1)))
        self.assert_result(result)
        self.assertEqual(result['multiplicity'], 4)
        octets = [x for x in result['leftPaths'] if x['firstIntermediate']['dimension'] == x['secondIntermediate']['dimension'] == 8]
        self.assertEqual([x['finalCopy'] for x in octets], [1, 2])
        self.assertEqual([x['finalSwapParity'] for x in octets], [1, -1])

    def test_complex_exact_roundtrip_and_interference(self):
        forward = ninej.run(request(state={'amplitudes': [{'re': 'sqrt(2)/2', 'im': '0'},
                                                         {'re': '0', 'im': 'sqrt(2)/2'},
                                                         {'re': '0', 'im': '0'}]}))
        self.assert_result(forward)
        self.assert_exact(vector(forward['exactOutputAmplitudes']),
                          [sp.I / 2, sp.Rational(1, 2) + sp.I * sp.sqrt(2) / 4,
                           sp.Rational(1, 2) - sp.I * sp.sqrt(2) / 4])
        self.assertEqual(forward['exactOutputProbabilities'], ['1/4', '3/8', '3/8'])
        backward = ninej.run(request(direction='right_to_left', state={'amplitudes': forward['exactOutputAmplitudes']}))
        self.assert_result(backward)
        self.assert_exact(vector(backward['exactOutputAmplitudes']), vector(forward['exactInputAmplitudes']))

    def test_identity_third_factor_reduces_to_racah(self):
        # ((A B)E (1 D)D)T versus ((A 1)A (B D)H)T is exactly the
        # established three-factor associator, with an extra sqrt(dimA dimD)
        # in the project's dimension-reduced nine-j convention.
        for factors, target in [(((1, 0),) * 3, (1, 1)),
                                (((2, 0), (1, 0), (0, 1)), (2, 0))]:
            a, b, d = factors
            result = ninej.run(request((a, b, (0, 0), d), target))
            triple = racah.run({'lab': 'lie', 'experiment': 'su3_racah',
                                'factors': [list(x) for x in factors], 'target': list(target)})
            self.assert_result(result)
            self.assert_exact(matrix(result['exactRecouplingMatrix']), matrix(triple['exactFMatrix']))
            self.assert_exact(matrix(result['exactNineJMatrix']),
                              matrix(triple['exactSixJMatrix']) / sp.sqrt(ninej._dimension(*a) * ninej._dimension(*d)))

    def test_octets_keep_first_and_final_vertex_copies(self):
        result = ninej.run(request(((1, 1), (1, 1), (0, 0), (1, 1)), (1, 1)))
        self.assert_result(result)
        self.assertEqual(result['dimension'], 512)
        self.assertEqual(result['multiplicity'], 8)
        paths = [x for x in result['leftPaths'] if x['firstIntermediate']['dimension'] == 8]
        self.assertEqual([(x['firstCopy'], x['secondCopy'], x['finalCopy']) for x in paths],
                         [(1, 1, 1), (1, 1, 2), (2, 1, 1), (2, 1, 2)])
        triple = racah.run({'lab': 'lie', 'experiment': 'su3_racah', 'factors': [[1, 1]] * 3, 'target': [1, 1]})
        self.assert_exact(matrix(result['exactRecouplingMatrix']), matrix(triple['exactFMatrix']))

    def test_first_vertex_outer_multiplicity_with_distinct_factors(self):
        result = ninej.run(request(((1, 1), (1, 1), (1, 0), (0, 0)), (1, 0)))
        self.assert_result(result)
        paths = [x for x in result['leftPaths'] if x['firstIntermediate']['dimension'] == 8]
        self.assertEqual([x['firstCopy'] for x in paths], [1, 2])
        self.assertEqual([x['firstSwapParity'] for x in paths], [1, -1])

    def test_432_dimensional_mixed_selected_target(self):
        result = ninej.run(request(((1, 1), (2, 0), (1, 0), (1, 0)), (2, 1)))
        self.assert_result(result)
        self.assertEqual(result['dimension'], 432)
        self.assertEqual(result['multiplicity'], 7)

    def test_all_1296_supported_characters_and_both_paired_path_counts(self):
        count, channels = 0, 0
        for factors in itertools.product(ninej.FACTORS, repeat=4):
            dimension = math.prod(ninej._dimension(*x) for x in factors)
            if dimension > ninej.MAX_DIMENSION:
                continue
            targets = ninej._decomposition(factors)
            self.assertEqual(sum(x['multiplicity'] * x['dimension'] for x in targets), dimension)
            character = np.prod([_weyl_character(*pair, (.31, .83)) for pair in factors])
            decomposed = sum(x['multiplicity'] * _weyl_character(x['p'], x['q'], (.31, .83)) for x in targets)
            self.assertLess(abs(character - decomposed), 3e-8)
            for side in (0, 1):
                order = (0, 1, 2, 3) if side == 0 else (0, 2, 1, 3)
                first = ninej._decomposition(tuple(factors[i] for i in order[:2]))
                second = ninej._decomposition(tuple(factors[i] for i in order[2:]))
                path_counts = {}
                for e, f in itertools.product(first, second):
                    for out in ninej._decomposition(((e['p'], e['q']), (f['p'], f['q']))):
                        key = out['p'], out['q']
                        path_counts[key] = path_counts.get(key, 0) + e['multiplicity'] * f['multiplicity'] * out['multiplicity']
                self.assertEqual(path_counts, {(x['p'], x['q']): x['multiplicity'] for x in targets})
            count += 1
            channels += len(targets)
        self.assertEqual(count, 1296)
        self.assertEqual(channels, 8472)

    def test_4096_dimensional_four_octets_all_final_targets_and_cycle_character(self):
        # For four identical factors, crossing is literally P23.  Its trace
        # character is independently χ8(g²)χ8(g)² (cycle type 2,1,1), so all
        # thirteen recoupling blocks together must reproduce that character.
        factors = ((1, 1),) * 4
        traces = {}
        for target in ninej._decomposition(factors):
            label = target['p'], target['q']
            result = ninej.run(request(factors, label))
            self.assert_result(result)
            self.assertEqual(result['dimension'], 4096)
            r = matrix(result['exactRecouplingMatrix'])
            self.assert_exact(r, r.T)
            self.assert_exact(r * r, sp.eye(result['multiplicity']))
            traces[label] = ninej._simp(sp.trace(r))
            self.assertTrue(traces[label].is_Integer)
            if label == (1, 1):
                self.assertEqual(result['multiplicity'], 32)
                for side in ('leftPaths', 'rightPaths'):
                    octet_pairs = [path for path in result[side]
                                   if path['firstIntermediate']['dimension'] == path['secondIntermediate']['dimension'] == 8]
                    copies = {(x['firstCopy'], x['secondCopy'], x['finalCopy']) for x in octet_pairs}
                    self.assertEqual(copies, set(itertools.product((1, 2), repeat=3)))
            if label == (2, 2):
                self.assertEqual(result['multiplicity'], 33)
                for side in ('leftPaths', 'rightPaths'):
                    largest_pairs = [path for path in result[side]
                                     if path['firstIntermediate']['dimension'] == path['secondIntermediate']['dimension'] == 27]
                    self.assertEqual([(x['finalCopy'], x['finalSwapParity']) for x in largest_pairs],
                                     [(1, 1), (2, 1), (3, -1)])
        self.assertEqual(len(traces), 13)
        self.assertEqual([traces[x] for x in ((0, 0), (1, 1), (2, 2))], [0, 0, 1])
        for angles in ((.31, .83), (.57, -.23)):
            actual = sum(int(trace) * _weyl_character(*label, angles) for label, trace in traces.items())
            expected = _weyl_character(1, 1, tuple(2 * x for x in angles)) * _weyl_character(1, 1, angles) ** 2
            self.assertLess(abs(actual - expected), 3e-8)

    def test_four_octets_singlet_independent_invariant_channel_dimensions(self):
        # Normalized invariant tensors δabδcd/8 and δacδbd/8 overlap by 1/8.
        # Resolving the crossed tensor with the orthogonal 8⊗8 projectors
        # gives d/64 per irrep copy, with the two inequivalent octet copies
        # contributing a combined16/64.  This test does not use CG entries to
        # determine the expected probabilities.
        factors = ((1, 1),) * 4
        basis = ninej.run(request(factors, (0, 0)))
        index = next(path['index'] for path in basis['leftPaths']
                     if ninej._path_dimension(path) == 1)
        self.assertEqual(index, 7)
        result = ninej.run(request(factors, (0, 0), state={'index': index}))
        self.assert_result(result)
        self.assertEqual(result['exactRecouplingMatrix'][index][index], '1/8')
        probabilities = {}
        for path, probability in zip(result['rightPaths'], result['exactOutputProbabilities']):
            label = path['firstIntermediate']['p'], path['firstIntermediate']['q']
            probabilities[label] = probabilities.get(label, 0) + sp.sympify(probability)
            if path['firstIntermediate']['dimension'] == path['secondIntermediate']['dimension'] == 8:
                if path['firstCopy'] != path['secondCopy']:
                    self.assertEqual(probability, '0')
        self.assertEqual(probabilities, {(2, 2): sp.Rational(27, 64), (3, 0): sp.Rational(10, 64),
                                         (0, 3): sp.Rational(10, 64), (1, 1): sp.Rational(16, 64),
                                         (0, 0): sp.Rational(1, 64)})

    def test_four_octets_32_channel_exact_complex_roundtrip(self):
        factors = ((1, 1),) * 4
        amplitudes = [{'re': 'sqrt(2)/2', 'im': '0'}, {'re': '0', 'im': 'sqrt(2)/2'}]
        amplitudes += [{'re': '0', 'im': '0'}] * 30
        forward = ninej.run(request(factors, (1, 1), state={'amplitudes': amplitudes}))
        self.assert_result(forward)
        self.assertEqual(forward['multiplicity'], 32)
        self.assertEqual(forward['exactInputNorm'], '1')
        self.assertEqual(forward['exactOutputNorm'], '1')
        reverse = ninej.run(request(factors, (1, 1), direction='right_to_left',
                                   state={'amplitudes': forward['exactOutputAmplitudes']}))
        self.assert_result(reverse)
        self.assert_exact(vector(reverse['exactOutputAmplitudes']), vector(forward['exactInputAmplitudes']))

    def test_3072_dimensional_asymmetric_middle_factors_crossing_inverse(self):
        # Swapping the named B,C factors exchanges the two paired trees.
        # The inverse problem must therefore return exactly Rᵀ, including
        # the ordering of every vertex copy.  Unlike8^4, this exercises two
        # genuinely different natural paired-tree embeddings.
        factors = ((1, 1), (2, 0), (1, 1), (1, 1))
        forward = ninej.run(request(factors, (2, 0)))
        crossed = ninej.run(request((factors[0], factors[2], factors[1], factors[3]), (2, 0)))
        self.assert_result(forward)
        self.assert_result(crossed)
        self.assertEqual(forward['dimension'], 3072)
        self.assertEqual(forward['multiplicity'], 16)
        self.assertFalse(forward['computation']['middleFactorPermutationReuse'])
        self.assert_exact(matrix(forward['exactRecouplingMatrix']).T, matrix(crossed['exactRecouplingMatrix']))
        def vertices(paths):
            return [(x['firstIntermediate']['p'], x['firstIntermediate']['q'],
                     x['secondIntermediate']['p'], x['secondIntermediate']['q'],
                     x['firstCopy'], x['secondCopy'], x['finalCopy']) for x in paths]
        self.assertEqual(vertices(forward['leftPaths']), vertices(crossed['rightPaths']))
        self.assertEqual(vertices(forward['rightPaths']), vertices(crossed['leftPaths']))

    def test_selected_sparse_lowering_matches_direct_product_action(self):
        factors, target = ((1, 1),) * 4, (1, 1)
        lowering, outrows, rows, norm = ninej._lowering(factors, target)
        self.assertIsInstance(lowering, sp.SparseMatrix)
        self.assertEqual(norm, 1)
        self.assertLess(lowering.nnz(), len(rows) * 8)
        # Inspect every input column directly in the four product indices;
        # this independent tensor action checks cached selected row indexing.
        generators = [ninej._irrep(*pair)['generators'][1] for pair in factors]
        for column, source in enumerate(rows):
            indices = np.unravel_index(source, (8, 8, 8, 8))
            expected = {}
            for axis, generator in enumerate(generators):
                for destination in range(8):
                    amplitude = generator[destination, indices[axis]]
                    if amplitude:
                        final = list(indices)
                        final[axis] = destination
                        row = int(np.ravel_multi_index(tuple(final), (8, 8, 8, 8)))
                        expected[row] = expected.get(row, 0) + amplitude
            actual = {outrows[row]: lowering[row, column] for row in range(len(outrows)) if lowering[row, column]}
            self.assertEqual(actual, expected)

    def test_neutral_factors_in_all_positions(self):
        for pair in ninej.FACTORS:
            for position in range(4):
                factors = [(0, 0)] * 4
                factors[position] = pair
                result = ninej.run(request(tuple(factors), pair))
                self.assert_result(result)
                self.assertEqual(result['exactRecouplingMatrix'], [['1']])

    def test_input_bounds_and_safe_symbolic_parser(self):
        invalid = [dict(factors=[]), dict(factors=[[1, 0]] * 3),
                   dict(factors=[[3, 0]] + [[1, 0]] * 3), dict(factors=[[True, 0]] + [[1, 0]] * 3),
                   dict(target=[1, 1]), dict(target=[-1, 0]), dict(direction='product_to_coupled'),
                   dict(arithmetic='numeric'), dict(state={'index': 3}),
                   dict(state={'amplitudes': [{'re': '0', 'im': '0'}] * 3}),
                   dict(state={'amplitudes': [{'re': '__import__("os")', 'im': '0'}] * 3}),
                   dict(state={'amplitudes': [{'re': 'sqrt(-1)', 'im': '0'}] * 3}),
                   dict(state={'amplitudes': [{'re': None, 'im': '0'}] * 3}),
                   dict(state={'amplitudes': [{'re': '10**9', 'im': '0'}] * 3})]
        for kwargs in invalid:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                ninej.run(request(**kwargs))

    def test_small_and_large_exact_norm_roundtrip(self):
        for amplitude in ('1/1000000000000', '1000000'):
            result = ninej.run(request(state={'amplitudes': [{'re': amplitude, 'im': '0'},
                                                            {'re': '0', 'im': '0'}, {'re': '0', 'im': '0'}]}))
            reverse = ninej.run(request(direction='right_to_left', state={'amplitudes': result['exactOutputAmplitudes']}))
            self.assert_result(result)
            self.assert_result(reverse)
            self.assert_exact(vector(reverse['exactOutputAmplitudes']), vector(result['exactInputAmplitudes']))

    def test_omitted_target_uses_actual_available_representations(self):
        neutral = ninej.run(request(((0, 0),) * 4))
        self.assertEqual((neutral['target']['p'], neutral['target']['q']), (0, 0))
        self.assert_result(neutral)
        octet = ninej.run(request(((1, 0), (0, 1), (1, 0), (0, 1))))
        self.assertEqual((octet['target']['p'], octet['target']['q']), (1, 1))
        self.assert_result(octet)
        highest = ninej.run(request(((1, 0), (1, 0), (0, 0), (0, 0))))
        self.assertEqual((highest['target']['p'], highest['target']['q']), (2, 0))
        self.assert_result(highest)


if __name__ == '__main__':
    unittest.main()
