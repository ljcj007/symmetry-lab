"""Independent operator/pointwise checks and same-host legacy API comparison."""
from copy import deepcopy
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json
import math
import struct
import sys
import types
import unittest
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run
import teaching_labs

reference_spec = importlib.util.spec_from_file_location('spin_actions_reference_builder', ROOT/'scripts/build-spin-actions-reference.py')
reference_builder = importlib.util.module_from_spec(reference_spec)
reference_spec.loader.exec_module(reference_builder)

FIXTURE = json.loads((ROOT/'scripts/fixtures/spin-actions.json').read_text(encoding='utf8'))
CASES = {row['id']: row for row in FIXTURE['cases']}
X = sp.Matrix([[0, 1], [1, 0]])
Y = sp.Matrix([[0, -sp.I], [sp.I, 0]])
Z = sp.diag(1, -1)
J = sp.Matrix([[0, -1], [1, 0]])
COUNTS = {'legacyInputs': 0, 'legacyComparisons': 0, 'numericLeaves': 0, 'otherLeaves': 0}


def matrix(pack):
    return sp.Matrix(*pack['shape'], [sp.sympify(x) for row in pack['exact'] for x in row])


def vector(pack):
    return sp.Matrix([sp.sympify(x) for x in pack['exact']])


def zero(value):
    return all(sp.simplify(x) == 0 for x in value)


def strict_equal(actual, expected, path='result'):
    assert type(actual) is type(expected), path+': type changed'
    if isinstance(actual, dict):
        assert list(actual) == list(expected), path+': key/order changed'
        for key in actual:
            strict_equal(actual[key], expected[key], path+'.'+key)
    elif isinstance(actual, list):
        assert len(actual) == len(expected), path+': length changed'
        for i, (left, right) in enumerate(zip(actual, expected)):
            strict_equal(left, right, path+'['+str(i)+']')
    elif isinstance(actual, float):
        assert struct.pack('!d', actual) == struct.pack('!d', expected), path+': float bits changed'
        COUNTS['numericLeaves'] += 1
    elif isinstance(actual, int):
        assert actual == expected, path+': integer changed'
        COUNTS['numericLeaves'] += 1
    else:
        assert actual == expected, path+': leaf changed'
        COUNTS['otherLeaves'] += 1


def public(experiment, **parameters):
    return run('teaching_labs', {'lab': 'spin_actions', 'experiment': experiment, **parameters})


def independent_bloch_action(quantum):
    part = matrix(quantum['unitaryPart'])
    ps = (X, Y, Z)
    return sp.Matrix([[sp.simplify(sp.trace(ps[i]*part*(ps[j].conjugate() if quantum['antiunitary'] else ps[j])*part.conjugate().T)/2)
                       for j in range(3)] for i in range(3)])


def verify_numeric_packs(value):
    if isinstance(value, dict):
        if 'exact' in value and isinstance(value['exact'], list) and 'numeric' in value:
            exact = matrix(value) if 'shape' in value else vector(value)
            reals, imags = value['numeric']['re'], value['numeric']['im']
            if 'shape' in value:
                assert value['shape'] == [exact.rows, exact.cols]
                for i in range(exact.rows):
                    for j in range(exact.cols):
                        assert math.isclose(reals[i][j], float(sp.re(exact[i, j])), rel_tol=1e-14, abs_tol=0)
                        assert math.isclose(imags[i][j], float(sp.im(exact[i, j])), rel_tol=1e-14, abs_tol=0)
            else:
                assert value['dimension'] == len(exact)
                for i in range(len(exact)):
                    assert math.isclose(reals[i], float(sp.re(exact[i])), rel_tol=1e-14, abs_tol=0)
                    assert math.isclose(imags[i], float(sp.im(exact[i])), rel_tol=1e-14, abs_tol=0)
        for child in value.values():
            verify_numeric_packs(child)
    elif isinstance(value, list):
        for child in value:
            verify_numeric_packs(child)


class SpinActionsTests(unittest.TestCase):
    def test_actual_api_fixtures_and_source_hashes(self):
        for name, expected in FIXTURE['sourceHashes'].items():
            self.assertEqual(hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest(), expected, name)
        for row in FIXTURE['cases']+FIXTURE['legacyCases']:
            with self.subTest(row=row['id']):
                saved = deepcopy(row['input'])
                result = run('teaching_labs', row['input'])
                reference_builder.same_reference(result, row['result'])
                self.assertEqual(row['input'], saved)
                self.assertEqual(result, json.loads(json.dumps(result, allow_nan=False)))
                self.assertTrue(all(item['passed'] for item in result['checks']))
                verify_numeric_packs(result)

    def test_cross_platform_preview_tolerance_does_not_relax_exact_or_input_data(self):
        compare = reference_builder.same_reference
        self.assertEqual(reference_builder.REFERENCE_FLOAT_REL_TOL, 1e-13)
        self.assertEqual(reference_builder.REFERENCE_FLOAT_ABS_TOL, 1e-13)
        expected = {'input': {'angle': 1.0}, 'sourceHashes': {'core': 'abc'},
                    'matrix': {'exact': [['1/2']], 'numeric': {'re': [[.5]], 'im': [[0.0]]}}}
        preview = deepcopy(expected)
        preview['matrix']['numeric']['re'][0][0] += 5e-15
        compare(preview, expected)
        for branch, changed in [('numeric', .50000001), ('input', 1.0+5e-15),
                                ('exact', '0.5'), ('source', 'abd'), ('nonfinite', float('nan'))]:
            value = deepcopy(expected)
            if branch in ('numeric', 'nonfinite'):
                value['matrix']['numeric']['re'][0][0] = changed
            elif branch == 'input':
                value['input']['angle'] = changed
            elif branch == 'exact':
                value['matrix']['exact'][0][0] = changed
            else:
                value['sourceHashes']['core'] = changed
            with self.subTest(branch=branch), self.assertRaises(AssertionError):
                compare(value, expected)

    def test_color_linear_antilinear_vectors_and_squares_independently(self):
        for row in FIXTURE['cases']:
            if row['input']['experiment'] != 'color_theta':
                continue
            r = row['result']; states = {key: vector(value) for key, value in r['states'].items()}
            psi = states['initial']; scalar = sp.sympify(r['scalar']['exact'])
            phase = sp.sympify(r['operatorPhase']['exact'])
            self.assertEqual(sp.simplify((psi.conjugate().T*psi)[0]), 1)
            expected = {'conjugated': psi.conjugate(), 'swap': X*psi, 'theta': J*psi.conjugate(),
                'swapTwice': psi, 'thetaConjugated': (J*psi.conjugate()).conjugate(), 'thetaTwice': -psi,
                'scaledInitial': scalar*psi, 'swapScaled': X*(scalar*psi), 'scalarTimesSwap': scalar*X*psi,
                'thetaScaled': J*(scalar*psi).conjugate(), 'conjugateScalarTimesTheta': sp.conjugate(scalar)*J*psi.conjugate(),
                'scalarTimesTheta': scalar*J*psi.conjugate(), 'phasedTheta': phase*J*psi.conjugate(), 'phasedThetaTwice': -psi}
            for key, value in expected.items():
                self.assertTrue(zero(states[key]-value), (row['id'], key))
            self.assertTrue(zero(matrix(r['matrices']['thetaSquare'])+sp.eye(2)))
            self.assertTrue(zero(matrix(r['matrices']['phasedThetaSquare'])+sp.eye(2)))
            self.assertEqual(sp.simplify((psi.conjugate().T*J*psi.conjugate())[0]), 0)
            self.assertTrue(zero(matrix(r['matrices']['thetaHamiltonian'])+X))
            self.assertEqual(r['hamiltonian']['eigenvalues'], ['-1', '1'])

    def test_color_coincidence_orthogonal_counterexample_and_phase_i(self):
        circular, plus = CASES['color-circular']['result'], CASES['color-plus']['result']
        self.assertTrue(circular['comparison']['sameComponents'])
        self.assertTrue(circular['comparison']['sameRay'])
        self.assertFalse(plus['comparison']['sameRay'])
        self.assertEqual(plus['comparison']['overlapAbsSquared']['exact'], '0')
        self.assertFalse(zero(vector(circular['states']['thetaScaled'])-vector(circular['states']['scalarTimesTheta'])))
        phase_i = CASES['color-phase-i']['result']
        self.assertTrue(zero(matrix(phase_i['matrices']['phasedThetaOrdinarySquare'])-sp.eye(2)))
        self.assertTrue(zero(matrix(phase_i['matrices']['phasedThetaSquare'])+sp.eye(2)))
        generic = CASES['color-generic']['result']
        self.assertTrue(zero(vector(generic['states']['initial'])-sp.Matrix([sp.Rational(3, 5), sp.Rational(12, 25)+sp.I*sp.Rational(16, 25)])))

    def test_rank_and_stabilizer_projection_independently(self):
        for row in FIXTURE['cases']:
            if row['input']['experiment'] != 'spin_stabilizer':
                continue
            d = row['result']['spinOnly']; m, w = matrix(d['momentMatrix']), matrix(d['operation'])
            self.assertEqual(d['rank'], m.rank())
            self.assertEqual(d['classification']['complementDimension'], 3-m.rank())
            b, n, p = matrix(d['spanBasis']), matrix(d['complementBasis']), matrix(d['projector'])
            self.assertTrue(zero(p*p-p))
            self.assertTrue(zero(p.T-p))
            self.assertTrue(zero(b*b.T+n*n.T-sp.eye(3)))
            self.assertTrue(zero(p*m-m))
            self.assertEqual(d['preservesAll'], zero(w*m-m))
            for index, item in enumerate(d['sitewise']):
                self.assertTrue(zero(vector(item['transformed'])-w*m[:, index]))
                self.assertTrue(zero(vector(item['difference'])-(w-sp.eye(3))*m[:, index]))
                self.assertEqual(item['fixed'], zero((w-sp.eye(3))*m[:, index]))
        self.assertEqual(CASES['custom-tiny-noncoplanar']['result']['spinOnly']['rank'], 3)
        self.assertEqual(CASES['zero-time-reversal']['result']['spinOnly']['rank'], 0)
        self.assertTrue(CASES['triangular-plane_xy']['result']['spinOnly']['preservesAll'])
        self.assertFalse(CASES['triangular-rotation-120']['result']['spinOnly']['preservesAll'])
        self.assertFalse(CASES['collinear-plane-xy']['result']['spinOnly']['preservesAll'])
        self.assertTrue(CASES['collinear-plane-xz']['result']['spinOnly']['preservesAll'])

    def test_spinor_lifts_and_improper_action_not_a_unitary_spin_rotation(self):
        for row in FIXTURE['cases']:
            r = row['result']
            if 'spinOnly' in r:
                pairs = [(matrix(r['spinOnly']['operation']), r['spinOnly']['quantum'])]
            elif 'locking' in r:
                d = r['locking']; pairs = [(matrix(d['inputSpin']), d['original']['quantum'])]
                pairs += [(matrix(x['matrix']), x['quantum']) for x in d['candidates']]
            else:
                continue
            for w, quantum in pairs:
                self.assertEqual(quantum['antiunitary'], w.det() == -1)
                self.assertTrue(zero(matrix(quantum['properRotation'])-w.det()*w))
                b = matrix(quantum['unitaryPart'])
                self.assertTrue(zero(b.conjugate().T*b-sp.eye(2)))
                squared = b*b.conjugate() if quantum['antiunitary'] else b*b
                self.assertTrue(zero(matrix(quantum['square'])-squared))
                self.assertTrue(zero(independent_bloch_action(quantum)-w))
        mirror = CASES['triangular-plane_xy']['result']['spinOnly']['quantum']
        self.assertTrue(mirror['antiunitary'])
        self.assertTrue(zero(matrix(mirror['classicalSquare'])-sp.eye(3)))
        self.assertTrue(zero(matrix(mirror['square'])-sp.eye(2)))
        reversal = CASES['zero-time-reversal']['result']['spinOnly']['quantum']
        self.assertTrue(zero(matrix(reversal['classicalSquare'])-sp.eye(3)))
        self.assertTrue(zero(matrix(reversal['square'])+sp.eye(2)))

    def test_soc_both_time_branches_and_original_operation_identity(self):
        expected = {'c2_point': [False, True], 'af_space': [False, True],
                    'triangular_point': [True, False], 'helix3_space': [False, False]}
        for name, pattern in expected.items():
            d = CASES['soc-'+name]['result']['locking']
            self.assertEqual([x['preservesPattern'] for x in d['candidates']], pattern)
            self.assertTrue(d['original']['preservesPattern'])
            self.assertEqual(d['originalSatisfiesEitherLock'], name == 'triangular_point')
            self.assertEqual(d['hamiltonianSymmetry'], 'not-evaluated')
        for row in FIXTURE['cases']:
            if 'locking' not in row['result']:
                continue
            d = row['result']['locking']; r, u = matrix(d['rotation']), matrix(d['inputSpin'])
            for candidate in d['candidates']:
                w = (-1)**int(candidate['timeReversal'])*r.det()*r
                self.assertTrue(zero(matrix(candidate['matrix'])-w))
                self.assertEqual(candidate['matchesInputSpin'], zero(w-u))
                for item in candidate['sitewise']:
                    m = vector(item['initial'])
                    self.assertTrue(zero(vector(item['polarRotated'])-r*m))
                    self.assertTrue(zero(vector(item['axialRotated'])-r.det()*r*m))
                    self.assertTrue(zero(vector(item['transformed'])-w*m))
                    if item['target'] is not None:
                        self.assertEqual(item['momentMatches'], zero(w*m-vector(item['target'])))
        inv = CASES['soc-custom-inversion']['result']['locking']
        self.assertEqual(inv['determinant'], -1)
        self.assertTrue(zero(matrix(inv['candidates'][0]['matrix'])-sp.eye(3)))
        chemical = CASES['soc-custom-chemical-counterexample']['result']['locking']
        self.assertFalse(chemical['structurePreserved'])
        self.assertTrue(all(not x['preservesPattern'] for x in chemical['candidates']))

    def test_custom_non_pi_axis_lift_and_non_involutory_improper_square(self):
        # 120 degrees about (1,1,1), independently specified by q=(1,1,1,1)/2.
        r = sp.Matrix([[0, 0, 1], [1, 0, 0], [0, 1, 0]])
        d = (sp.eye(2)-sp.I*(X+Y+Z))/2
        for sign in (1, -1):
            result = public('spin_stabilizer', momentPreset='custom', moments=[[1, 1, 1]],
                operationPreset='custom', operation=[[int(x) for x in row] for row in (sign*r).tolist()])
            q = result['spinOnly']['quantum']
            part = d if sign == 1 else d*J
            self.assertTrue(zero(matrix(q['unitaryPart'])-part))
            expected_square = d*d if sign == 1 else (d*J)*(d*J).conjugate()
            self.assertTrue(zero(matrix(q['square'])-expected_square))
            self.assertTrue(zero(independent_bloch_action(q)-sign*r))
            self.assertEqual(result['spinOnly']['preservesAll'], sign == 1)
            self.assertFalse(zero(matrix(q['classicalSquare'])-sp.eye(3)))

    def test_reject_unsafe_invalid_and_unbounded_inputs(self):
        inputs = [None, [], {'lab': 'wrong'}, {'experiment': 'wrong'},
            {'experiment': 'color_theta', 'statePreset': 'custom', 'state': [[0, 0], [0, 0]]},
            {'experiment': 'color_theta', 'operatorPhase': [0, 0]},
            {'experiment': 'color_theta', 'scalar': [True, 0]},
            {'experiment': 'color_theta', 'scalar': ['__import__("os")', 0]},
            {'experiment': 'color_theta', 'scalar': ['sqrt(3)', 0]},
            {'experiment': 'color_theta', 'scalar': ['1/0', 0]},
            {'experiment': 'color_theta', 'scalar': ['1e99', 0]},
            {'experiment': 'color_theta', 'scalar': [float('inf'), 0]},
            {'experiment': 'color_theta', 'state': [[1, 0], [1, 0]]},
            {'experiment': 'spin_stabilizer', 'operationPreset': 'custom', 'operation': [[1, 0, 0], [0, 1, 0], [0, 0, 2]]},
            {'experiment': 'spin_stabilizer', 'operationPreset': 'rotation_z', 'angle': 30.0},
            {'experiment': 'spin_stabilizer', 'operationPreset': 'rotation_z', 'angle': True},
            {'experiment': 'spin_stabilizer', 'operationPreset': 'plane_xy', 'angle': float('nan')},
            {'experiment': 'spin_stabilizer', 'momentPreset': 'custom', 'moments': [[1, 0, 0]]*13},
            {'experiment': 'soc_locking', 'modelPreset': 'custom', 'periodic': 'false', 'sites': []},
            {'experiment': 'soc_locking', 'modelPreset': 'custom', 'sites': [{'position': [0, 0, 0], 'moment': [0, 0, 1]}]*2}]
        for value in inputs:
            with self.subTest(value=value):
                from spin_actions_lab import run as direct
                with self.assertRaises(ValueError):
                    direct(value)

    def test_all_legacy_api_results_against_verified_gzip_source_same_host(self):
        raw = gzip.decompress((ROOT/'scripts/fixtures/spin-source-baseline.py.gz').read_bytes())
        self.assertEqual(hashlib.sha256(raw).hexdigest(), '87749a79da15aeb4b831745b8571c47a7bcf268d31c5280a2510c9cae92442f2')
        old = types.ModuleType('immutable_spin_teaching_baseline')
        exec(compile(raw.decode('utf8'), '<verified-pre-spin-actions-source>', 'exec'), old.__dict__)
        inputs = []
        for preset in ('screw21', 'screw41', 'glide', 'translation'):
            inputs.append({'lab': 'seitz', 'preset': preset})
        for axis in ('x', 'y', 'z'):
            for state in ('up', 'plus'):
                inputs.append({'lab': 'spinor', 'axis': axis, 'initialState': state})
        for operation in ('E', 'inversion', 'mirror_z', 'C2z'):
            for reverse in (False, True):
                inputs.append({'lab': 'magnetic', 'operation': operation, 'timeReversal': reverse})
        for k in (0, .25, .5):
            for spinful in (False, True):
                inputs.append({'lab': 'antiferro', 'k': k, 'spinful': spinful})
        for lab, presets in {'double_group': ('c2_point', 'd2_point', 'screw21_space'),
                             'color_group': ('c3_point', 'translation3_space'),
                             'spin_group': ('c2_point', 'af_space', 'triangular_point', 'helix3_space')}.items():
            for preset in presets:
                for steps in (1, 6, 12):
                    if lab == 'double_group':
                        for kz in ('0', '1/4', '1/2'):
                            inputs.append({'lab': lab, 'preset': preset, 'steps': steps, 'kz': kz})
                    else:
                        for variant in ('combined', 'spatial_only', 'internal_only'):
                            inputs.append({'lab': lab, 'preset': preset, 'steps': steps, 'variant': variant})
        for experiment in ('su2', 'su3', 'commutator', 'u1', 'representations', 'interferometer',
                           'rabi', 'su2_coupling', 'su3_tensor', 'su3_cg', 'su3_racah', 'su3_ninej'):
            inputs.append({'lab': 'lie', 'experiment': experiment})
        for rotation, reverse in [([[1, 0, 0], [0, 1, 0], [0, 0, 1]], False),
                                  ([[-1, 0, 0], [0, -1, 0], [0, 0, -1]], False),
                                  ([[1, 0, 0], [0, 1, 0], [0, 0, -1]], False),
                                  ([[1, 0, 0], [0, 1, 0], [0, 0, -1]], True)]:
            inputs.append({'lab': 'crystal', 'model': {'cell': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                'atoms': [{'id': 'a', 'element': 'Fe', 'frac': [.2, .3, .4], 'moment': [1, 2, 3]}],
                'operations': [{'id': 'test', 'rotation': rotation, 'timeReversal': reverse}]}, 'operationId': 'test'})
        inputs.extend(row['input'] for row in FIXTURE['legacyCases'])
        for payload in inputs:
            saved = sys.modules['teaching_labs']
            try:
                sys.modules['teaching_labs'] = old
                expected = run('teaching_labs', payload)
                sys.modules['teaching_labs'] = teaching_labs
                actual = run('teaching_labs', payload)
            finally:
                sys.modules['teaching_labs'] = saved
            strict_equal(actual, expected)
            COUNTS['legacyInputs'] += 1
            COUNTS['legacyComparisons'] += 1


if __name__ == '__main__':
    program = unittest.main(exit=False)
    print(json.dumps(COUNTS))
    sys.exit(0 if program.result.wasSuccessful() else 1)
