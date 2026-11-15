"""Public optional replay, independent exact tensor maps, and old-output checks."""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import itertools
import json
import struct
import sys
import types
import unittest
import numpy as np
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run

spec = importlib.util.spec_from_file_location('tensor_replay_references', ROOT/'scripts/build-tensor-replay-reference.py')
references = importlib.util.module_from_spec(spec)
spec.loader.exec_module(references)
BASELINE_SHA256 = '41059b1cddf48262a2830d182e46fbc608d8f32a23036f93fb602c195fec015a'
baseline_text = gzip.decompress((ROOT/'scripts/fixtures/tensor-source-baseline.py.gz').read_bytes())
assert hashlib.sha256(baseline_text).hexdigest() == BASELINE_SHA256
baseline = types.ModuleType('immutable_tensor_baseline')
exec(compile(baseline_text.decode('utf8'), '<verified-pre-replay-tensor-source>', 'exec'), baseline.__dict__)
COUNTS = {'numericLeaves': 0, 'otherLeaves': 0, 'legacyInputs': 0, 'legacyComparisons': 0}


def strict_equal(a, b, path='result'):
    assert type(a) is type(b), path + ': type changed'
    if isinstance(a, dict):
        assert list(a) == list(b), path + ': keys/order changed'
        for key in a:
            strict_equal(a[key], b[key], path + '.' + key)
    elif isinstance(a, list):
        assert len(a) == len(b), path + ': length changed'
        for index, (x, y) in enumerate(zip(a, b)):
            strict_equal(x, y, path + '[' + str(index) + ']')
    elif type(a) is float:
        assert struct.pack('!d', a) == struct.pack('!d', b), path + ': floating value changed'
        COUNTS['numericLeaves'] += 1
    elif type(a) is int:
        assert a == b, path + ': integer changed'
        COUNTS['numericLeaves'] += 1
    else:
        assert a == b, path + ': leaf changed'
        COUNTS['otherLeaves'] += 1


def matrix(raw):
    return sp.Matrix([[sp.sympify(value) for value in row] for row in raw])


def zero(m):
    return all(sp.simplify(value) == 0 for value in m)


def independent_basis(kind):
    pairs = list(itertools.combinations_with_replacement(range(3), 2)) if kind == 'dielectric' else list(itertools.product(range(3), repeat=2))
    tensors = []
    for i, j in pairs:
        b = sp.zeros(3)
        b[i, j] = 1
        if kind == 'dielectric':
            b[j, i] = 1
        tensors.append(b)
    return pairs, tensors


def independent_action(kind, rotation, primed):
    pairs, tensors = independent_basis(kind)
    parity = ((-1 if primed else 1) * rotation.det()) if kind == 'magnetoelectric' else 1
    # Explicit Cartesian index contraction, separate from the implementation's
    # matrix-conjugation construction and from its generator-nullspace solver.
    return sp.Matrix([[sp.simplify(parity * sum(rotation[i, a] * rotation[j, b] * tensor[a, b]
                         for a in range(3) for b in range(3)))
                       for tensor in tensors] for i, j in pairs])


def signed_permutations(proper_only):
    result = []
    for p in itertools.permutations(range(3)):
        for signs in itertools.product((-1, 1), repeat=3):
            r = sp.zeros(3)
            for row in range(3):
                r[row, p[row]] = signs[row]
            if not proper_only or r.det() == 1:
                result.append(r)
    return result


def expected_operations(case_id):
    I = sp.eye(3)
    if case_id == 'cubic-dielectric':
        return [(r, False) for r in signed_permutations(True)]
    if case_id == 'gray-cubic-96-dielectric':
        return [(r, time) for r in signed_permutations(False) for time in (False, True)]
    if case_id in ('inversion-magnetoelectric', 'time-magnetoelectric', 'antiinversion-magnetoelectric'):
        return [(I, False), (-I if case_id != 'time-magnetoelectric' else I, case_id != 'inversion-magnetoelectric')]
    rotation = {'c2-dielectric': matrix(references.C2), 'c4-dielectric': matrix(references.C4),
                'trigonal-dielectric': matrix(references.TRIGONAL),
                'tilted-c2-dielectric': matrix(references.TILTED_C2)}[case_id]
    order = {'c4-dielectric': 4, 'trigonal-dielectric': 3}.get(case_id, 2)
    return [((rotation**n).applyfunc(sp.simplify), False) for n in range(order)]


class TensorReplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.actual = {case_id: run('tensors', payload) for case_id, payload in references.CASES}

    def test_all_legacy_presets_and_custom_values_are_bitwise_unchanged(self):
        inputs = [{'preset': preset, 'tensor': kind, 'samples': 12}
                  for preset in ('cubic_m3m', 'zincblende_td', 'tetragonal_4mm', 'magnetic_minus3mprime', 'gray_triclinic')
                  for kind in ('dielectric', 'elasticity', 'piezoelectric', 'magnetoelectric')]
        inputs += [
            {'preset': 'custom', 'tensor': 'dielectric', 'samples': 12,
             'generators': [{'rotation': references.IDENTITY}], 'orientation_deg': 37,
             'parameters': {'a1': 2, 'a2': .25, 'a3': -.4, 'a4': 4, 'a5': .75, 'a6': 6}, 'field': [1, 2, -.5]},
            {'preset': 'custom', 'tensor': 'magnetoelectric', 'samples': 12,
             'generators': [{'rotation': references.INVERSION, 'time_reversal': True}],
             'orientation_deg': 19, 'parameters': {'a1': -.5, 'a4': .25, 'a9': 3}, 'field': [1, -.5, 2]},
            {'preset': 'custom', 'tensor': 'dielectric', 'samples': 12,
             'generators': [{'rotation': references.TRIGONAL}], 'parameters': {'a1': 2, 'a2': 5}, 'orientation_deg': 23},
            {'preset': 'custom', 'tensor': 'dielectric', 'samples': 12,
             'generators': [{'rotation': references.RATIONAL_ROTATION}], 'orientation_deg': 41},
        ]
        for payload in inputs:
            expected = baseline.run_tensors(payload)
            for mode in (None, False, True):
                request = {**payload, **({} if mode is None else {'replay': mode})}
                answer = run('tensors', request)
                if mode is True:
                    self.assertIn('replay', answer)
                    answer = {key: value for key, value in answer.items() if key != 'replay'}
                else:
                    self.assertNotIn('replay', answer)
                strict_equal(answer, expected)
                COUNTS['legacyComparisons'] += 1
            COUNTS['legacyInputs'] += 1

    def test_replay_option_is_a_strict_boolean(self):
        for value in (None, 0, 1, 'true', [], {}):
            with self.assertRaisesRegex(ValueError, 'replay'):
                run('tensors', {'samples': 12, 'replay': value})
        with self.assertRaises(ValueError):
            run('tensors', {'preset': 'custom', 'replay': True, 'generators': [{'rotation': [[1, 1, 0], [0, 1, 0], [0, 0, 1]]}]})

    def test_every_supported_reference_has_independent_maps_and_exact_projector(self):
        for case_id, answer in self.actual.items():
            replay = answer['replay']
            if not replay['available']:
                continue
            with self.subTest(case=case_id):
                kind = answer['tensor']['symbol']
                kind = 'dielectric' if kind == 'chi' else 'magnetoelectric'
                pairs, tensors = independent_basis(kind)
                coordinates = replay['coordinates']
                self.assertEqual(coordinates['order'], ['xyz'[i] + 'xyz'[j] for i, j in pairs])
                self.assertEqual(coordinates['dimension'], len(pairs))
                for raw, expected in zip(coordinates['basis'], tensors):
                    self.assertEqual(matrix(raw['matrix']), expected)
                    np.testing.assert_allclose(raw['matrixNumeric'], np.array(expected, dtype=float), atol=0, rtol=0)
                metric = sp.Matrix(len(tensors), len(tensors), lambda i, j: sp.trace(tensors[i].T * tensors[j]))
                self.assertEqual(matrix(coordinates['metric']), metric)
                n = len(pairs)
                independent_blocks = []
                for operation in replay['generators']:
                    r = matrix(operation['rotation'])
                    d = independent_action(kind, r, operation['timeReversal'])
                    self.assertTrue(zero(matrix(operation['action']) - d))
                    self.assertTrue(zero(matrix(operation['constraint']) - (d - sp.eye(n))))
                    np.testing.assert_allclose(operation['actionNumeric'], np.array(d, dtype=float), atol=1e-15, rtol=1e-15)
                    np.testing.assert_allclose(operation['rotationNumeric'], np.array(r, dtype=float), atol=1e-15, rtol=1e-15)
                    self.assertTrue(zero(d.T * metric * d - metric))
                    independent_blocks.append(d - sp.eye(n))
                a = sp.Matrix.vstack(*independent_blocks)
                self.assertTrue(zero(a - matrix(replay['constraints']['matrix'])))
                reduced, pivots = a.rref()
                self.assertTrue(zero(reduced - matrix(replay['constraints']['rref'])))
                self.assertEqual(list(pivots), replay['constraints']['pivots'])
                self.assertEqual(a.rank(), replay['constraints']['rank'])
                self.assertEqual(a.rank(), answer['constraint_rank'])
                expected_group = expected_operations(case_id)
                actual_set = {(tuple(matrix(o['rotation'])), o['timeReversal']) for o in replay['finiteGroup']['operations']}
                self.assertEqual(actual_set, {(tuple(r), t) for r, t in expected_group})
                self.assertTrue(replay['finiteGroup']['certified'])
                self.assertEqual(replay['finiteGroup']['order'], len(expected_group))
                average = sum((independent_action(kind, r, t) for r, t in expected_group), sp.zeros(n)) / len(expected_group)
                p = matrix(replay['projector'])
                self.assertTrue(zero(p - average))
                self.assertTrue(zero(p * p - p))
                self.assertTrue(zero(a * p))
                self.assertTrue(zero(p.T * metric - metric * p))
                self.assertEqual(p.rank(), answer['independent_count'])
                for operation in replay['finiteGroup']['operations']:
                    d = independent_action(kind, matrix(operation['rotation']), operation['timeReversal'])
                    self.assertTrue(zero(matrix(operation['action']) - d))
                    np.testing.assert_allclose(operation['actionNumeric'], np.array(d, dtype=float), atol=1e-15, rtol=1e-15)
                np.testing.assert_allclose(replay['projectorNumeric'], np.array(p, dtype=float), atol=1e-15, rtol=1e-15)
                basis_vectors = [sp.Matrix(vector) for vector in replay['constraints']['nullspace']]
                b = sp.Matrix.hstack(*basis_vectors) if basis_vectors else sp.zeros(n, 0)
                self.assertTrue(zero(a * b))
                self.assertEqual(sp.Matrix.hstack(p, b).rank(), p.rank())
                self.assertEqual(b.cols, answer['independent_count'])
                self.assertTrue(all(replay['checks'].values()))

    def test_c2_c4_cubic_branch_dimensions(self):
        for case_id, count, order in [('c2-dielectric', 4, 2), ('c4-dielectric', 2, 4), ('cubic-dielectric', 1, 24)]:
            self.assertEqual(self.actual[case_id]['independent_count'], count)
            self.assertEqual(self.actual[case_id]['replay']['finiteGroup']['order'], order)

    def test_axial_time_parities_use_nine_general_components(self):
        for case_id, dim, sign in [('inversion-magnetoelectric', 0, -1), ('time-magnetoelectric', 0, -1), ('antiinversion-magnetoelectric', 9, 1)]:
            answer = self.actual[case_id]
            self.assertEqual(answer['intrinsic_count'], 9)
            self.assertEqual(answer['independent_count'], dim)
            self.assertEqual(matrix(answer['replay']['generators'][0]['action']), sign * sp.eye(9))
        # No transpose symmetry is introduced for a general magnetoelectric tensor.
        self.assertNotEqual(self.actual['antiinversion-magnetoelectric']['form'][0][1], self.actual['antiinversion-magnetoelectric']['form'][1][0])

    def test_nonorthonormal_coordinate_metric_is_essential(self):
        replay = self.actual['tilted-c2-dielectric']['replay']
        p, g = matrix(replay['projector']), matrix(replay['coordinates']['metric'])
        d = matrix(replay['generators'][0]['action'])
        self.assertFalse(zero(p.T - p))
        self.assertFalse(zero(d.T * d - sp.eye(6)))
        self.assertTrue(zero(p.T * g - g * p))
        self.assertTrue(zero(d.T * g * d - g))
        b = sp.Matrix.hstack(*(sp.Matrix(v) for v in replay['constraints']['nullspace']))
        euclidean_projector = b * (b.T * b).inv() * b.T
        self.assertFalse(zero(p - euclidean_projector))
        # Both select the invariant space, but only the Reynolds/Frobenius
        # projector is orthogonal in the physical tensor metric.
        seed = sp.Matrix([1, 2, 3, 4, 5, 6])
        self.assertTrue(zero(b.T * g * (seed - p * seed)))

    def test_partial_average_need_not_be_a_projector(self):
        operations = self.actual['c4-dielectric']['replay']['finiteGroup']['operations']
        partial = (matrix(operations[0]['action']) + matrix(operations[1]['action'])) / 2
        self.assertFalse(zero(partial * partial - partial))

    def test_exact_96_element_boundary_and_unclosed_attempt(self):
        largest = self.actual['gray-cubic-96-dielectric']['replay']
        self.assertTrue(largest['available'])
        self.assertEqual(largest['finiteGroup']['order'], 96)
        self.assertEqual(len(largest['finiteGroup']['operations']), 96)
        failed = self.actual['closure-bound-dielectric']
        self.assertEqual(failed['independent_count'], 2)
        self.assertFalse(failed['replay']['available'])
        self.assertFalse(failed['replay']['finiteGroup']['certified'])
        self.assertIsNone(failed['replay']['finiteGroup']['order'])
        self.assertEqual(failed['replay']['finiteGroup']['discoveredOperationCount'], 96)
        self.assertIsNone(failed['replay']['projector'])
        self.assertIn('不是无限群的证明', failed['replay']['reason'])

    def test_unsupported_kinds_keep_their_original_calculation(self):
        for case_id in ('unsupported-piezoelectric', 'unsupported-elasticity'):
            replay = self.actual[case_id]['replay']
            self.assertEqual(set(replay), {'schema', 'available', 'reason'})
            self.assertFalse(replay['available'])
            self.assertTrue(replay['reason'])
            self.assertGreater(self.actual[case_id]['independent_count'], 0)

    def test_replay_results_do_not_share_mutable_state(self):
        payload = references.CASES[0][1]
        first = run('tensors', payload)
        first['replay']['projector'][0][0] = 'edited'
        first['replay']['generators'][0]['actionNumeric'][0][0] = 123
        second = run('tensors', payload)
        self.assertNotEqual(second['replay']['projector'][0][0], 'edited')
        self.assertNotEqual(second['replay']['generators'][0]['actionNumeric'][0][0], 123)


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TensorReplayTests)
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
    print('Exact tensor replay legacy compatibility:', json.dumps(COUNTS), 'all leaves strictly unchanged.')
