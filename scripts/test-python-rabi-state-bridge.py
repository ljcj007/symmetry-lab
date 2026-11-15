"""Independent spectral checks and exact old-output preservation for Rabi states.

--emit-json runs the same tests, then supplies real Python results to the Node
bridge test. No hand-written trajectory is used as a physics fixture.
"""
import cmath
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'e8978ee80a41a7303adf54230cfc24bac3177390'
BASELINE_CORE_SHA256 = 'd48fb45d1ea3e7fdde6720feddd3440a024f26d52bcc449c34e2adda81d5b3b9'
BASELINE_FIXTURE_SHA256 = 'b0610d01158f3c8cde08e01fa5d619d8a07aac2aab26e5a8462c650cfb1aac31'
BASELINE_FIXTURE = ROOT / 'scripts/fixtures/rabi-state-bridge-baseline.json.gz'
spec = importlib.util.spec_from_file_location('rabi_current', ROOT / 'dist/python/lie_applications.py')
current = importlib.util.module_from_spec(spec)
spec.loader.exec_module(current)
CASES = {
    'zero': dict(omega=0, delta=0, time=7),
    'time-zero': dict(omega=8, delta=-3, time=0),
    'diagonal-positive': dict(omega=0, delta=3, time=1.37),
    'diagonal-negative': dict(omega=0, delta=-3, time=1.37),
    'half-pi': dict(omega=1, delta=0, time=math.pi / 2),
    'pi': dict(omega=1, delta=0, time=math.pi),
    'two-pi': dict(omega=1, delta=0, time=2 * math.pi),
    'detuned': dict(omega=3, delta=4, time=math.pi / 5),
    'negative-detuning': dict(omega=1.7, delta=-0.9, time=0.73),
    'fractional': dict(omega=0.37, delta=0.81, time=2.31),
    'maximum': dict(omega=10, delta=-10, time=20),
    'subnormal': dict(omega=1e-320, delta=0, time=20),
}
RESULTS = {key: current.run({'lab': 'lie', 'experiment': 'rabi', **request})
           for key, request in CASES.items()}
BASELINE_COUNTS = {}
SIGMA = (((0, 1), (1, 0)), ((0, -1j), (1j, 0)), ((1, 0), (0, -1)))


def z(value):
    return complex(value['re'], value['im'])


def spectral_u(omega, delta, time):
    """Real orthonormal eigenbasis of H; exponential of its two eigenvalues.

    Independent of the production cosine/sine polynomial in the Pauli matrix.
    """
    gap = math.hypot(omega, delta)
    if gap == 0:
        return [[1 + 0j, 0j], [0j, 1 + 0j]]
    angle = math.atan2(omega, delta) / 2
    a, b = math.cos(angle), math.sin(angle)
    basis = ((a, -b), (b, a))
    phases = (cmath.exp(-0.5j * gap * time), cmath.exp(0.5j * gap * time))
    return [[sum(basis[i][k] * phases[k] * basis[j][k] for k in range(2))
             for j in range(2)] for i in range(2)]


def outer(state):
    return [[a * b.conjugate() for b in state] for a in state]


def expectation(state, operator):
    return sum(state[i].conjugate() * operator[i][j] * state[j]
               for i in range(2) for j in range(2))


def baseline_source():
    git = shutil.which('git')
    if not git:
        bundled = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe'
        if bundled.exists():
            git = str(bundled)
    if not git:
        raise RuntimeError('Git is required to compare the immutable e8978ee core.')
    return subprocess.check_output([git, 'show', BASELINE + ':dist/python/lie_applications.py'], cwd=ROOT)


def old_core():
    source = baseline_source()
    if hashlib.sha256(source).hexdigest() != BASELINE_CORE_SHA256:
        raise AssertionError('Immutable old core source hash does not match.')
    module = types.ModuleType('rabi_immutable_baseline')
    exec(compile(source.decode('utf-8'), BASELINE + '/lie_applications.py', 'exec'), module.__dict__)
    return module


def load_baseline_capture():
    """Actual old dispatcher capture also works in shallow CI checkouts."""
    raw = BASELINE_FIXTURE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != BASELINE_FIXTURE_SHA256:
        raise AssertionError('Immutable old Rabi fixture hash does not match.')
    capture = json.loads(gzip.decompress(raw))
    if capture['baseline'] != BASELINE or capture['coreSHA256'] != BASELINE_CORE_SHA256:
        raise AssertionError('Immutable old Rabi provenance does not match.')
    return capture


def compare_old_leaves(old, new, path='', counts=None):
    """Every old field must survive unchanged; additions are narrowly scoped."""
    if counts is None:
        counts = {'numeric': 0, 'other': 0}
    if isinstance(old, dict):
        if not isinstance(new, dict):
            raise AssertionError(path)
        additions = set(new) - set(old)
        allowed = {'densityMatrix'} if not path else (
            {'state', 'matrix', 'densityMatrix'} if path.startswith('/trajectory/')
            and path.count('/') == 2 else set())
        if not additions <= allowed or set(old) - set(new):
            raise AssertionError((path, additions, set(old) - set(new)))
        for key in old:
            compare_old_leaves(old[key], new[key], path + '/' + key, counts)
    elif isinstance(old, list):
        if not isinstance(new, list) or len(old) != len(new):
            raise AssertionError(path)
        for index, (a, b) in enumerate(zip(old, new)):
            compare_old_leaves(a, b, path + '/' + str(index), counts)
    else:
        if type(old) is not type(new) or old != new:
            raise AssertionError((path, old, new))
        counts['numeric' if isinstance(old, (int, float)) and not isinstance(old, bool) else 'other'] += 1
    return counts


class RabiStateBridgeTests(unittest.TestCase):
    def close(self, actual, expected, tolerance=2e-12):
        self.assertLessEqual(abs(actual - expected), tolerance)

    def test_old_all_numeric_and_text_leaves_unchanged(self):
        baseline = load_baseline_capture()
        self.assertEqual(set(baseline['cases']), set(CASES))
        totals = {'numeric': 0, 'other': 0}
        for key, options in CASES.items():
            with self.subTest(case=key):
                record = baseline['cases'][key]
                self.assertEqual(record['request'], {'lab': 'lie', 'experiment': 'rabi', **options})
                old = record['result']
                count = compare_old_leaves(old, RESULTS[key])
                for name in totals:
                    totals[name] += count[name]
        self.assertGreater(totals['numeric'], 15000)
        self.assertGreater(totals['other'], 100)
        BASELINE_COUNTS.update(totals)

    def test_every_sample_spectral_unitary_state_density_and_pauli_expectations(self):
        for key, result in RESULTS.items():
            json.dumps(result, allow_nan=False)
            self.assertEqual(len(result['trajectory']), result['sampleCount'])
            for index, row in enumerate(result['trajectory']):
                with self.subTest(case=key, sample=index):
                    expected_u = spectral_u(result['omega'], result['delta'], row['time'])
                    self.assertEqual(len(row['state']), 2)
                    self.assertEqual([len(line) for line in row['matrix']], [2, 2])
                    self.assertEqual([len(line) for line in row['densityMatrix']], [2, 2])
                    actual_u = [[z(item) for item in line] for line in row['matrix']]
                    state = list(map(z, row['state']))
                    rho = [[z(item) for item in line] for line in row['densityMatrix']]
                    expected_rho = outer(state)
                    for i in range(2):
                        self.close(state[i], expected_u[i][0])
                        self.close(state[i], actual_u[i][0])  # U|up>
                        for j in range(2):
                            self.close(actual_u[i][j], expected_u[i][j])
                            self.close(rho[i][j], expected_rho[i][j])
                            self.close(rho[i][j], rho[j][i].conjugate())
                            product = sum(actual_u[k][i].conjugate() * actual_u[k][j] for k in range(2))
                            self.close(product, int(i == j))
                    self.close(sum(abs(a) ** 2 for a in state), 1)
                    self.close(row['probability'], abs(state[1]) ** 2)
                    for actual, operator in zip(row['blochVector'], SIGMA):
                        value = expectation(state, operator)
                        self.close(value.imag, 0)
                        self.close(actual, value.real)
            last = result['trajectory'][-1]
            for name in ('state', 'matrix', 'densityMatrix', 'blochVector'):
                # Existing t*n/n sampling can differ from t by one ulp.
                def compare(a, b):
                    if isinstance(a, dict):
                        for field in a:
                            compare(a[field], b[field])
                    elif isinstance(a, list):
                        for x, y in zip(a, b):
                            compare(x, y)
                    else:
                        self.close(a, b)
                compare(result[name], last[name])

    def test_pulses_sigma_y_sign_and_phase_observables(self):
        half, pi, two = (RESULTS[name] for name in ('half-pi', 'pi', 'two-pi'))
        state = list(map(z, half['state']))
        self.close(state[0], 1 / math.sqrt(2))
        self.close(state[1], -1j / math.sqrt(2))
        self.close(z(half['densityMatrix'][0][1]), 0.5j)
        self.close(half['blochVector'][1], -1)
        self.close(z(pi['state'][1]), -1j)
        self.close(z(two['state'][0]), -1)
        self.close(two['transitionProbability'], 0)
        for phase in (1, 1j, -1, -1j):
            whole = [phase * a for a in state]
            relative = [state[0], phase * state[1]]
            for i in range(2):
                self.close(abs(whole[i]) ** 2, abs(state[i]) ** 2)
                self.close(abs(relative[i]) ** 2, abs(state[i]) ** 2)
                for j in range(2):
                    self.close(outer(whole)[i][j], outer(state)[i][j])
            if phase != 1:
                self.assertGreater(abs(outer(relative)[0][1] - outer(state)[0][1]), 0.49)
        for name in ('zero', 'time-zero'):
            self.assertEqual(RESULTS[name]['state'], [{'re': 1.0, 'im': 0.0}, {'re': 0.0, 'im': 0.0}])


if __name__ == '__main__':
    if '--capture-baseline' in sys.argv:
        # Explicit reproducibility path: execute the actual historical source;
        # do not derive the baseline by deleting fields from the new output.
        baseline = old_core()
        capture = {'baseline': BASELINE, 'coreSHA256': BASELINE_CORE_SHA256,
                   'capture': 'Actual e8978ee Python run outputs; no physics values synthesized or rounded.',
                   'cases': {key: {'request': {'lab': 'lie', 'experiment': 'rabi', **options},
                                   'result': baseline.run({'lab': 'lie', 'experiment': 'rabi', **options})}
                             for key, options in CASES.items()}}
        raw = gzip.compress(json.dumps(capture, ensure_ascii=False, allow_nan=False,
                                       separators=(',', ':')).encode('utf-8'), mtime=0)
        if hashlib.sha256(raw).hexdigest() != BASELINE_FIXTURE_SHA256:
            raise AssertionError('Recomputed historical fixture differs; no file was overwritten.')
        BASELINE_FIXTURE.write_bytes(raw)
        print('Actual e8978ee capture reproduced with the expected SHA256.')
        raise SystemExit(0)
    emit = '--emit-json' in sys.argv
    if emit:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(RabiStateBridgeTests)
        outcome = unittest.TextTestRunner(stream=sys.stderr, verbosity=1).run(suite)
        if not outcome.wasSuccessful():
            raise SystemExit(1)
        print(json.dumps({'source': 'actual dist/python/lie_applications.py dispatcher',
                          'baseline': BASELINE,
                          'unchangedBaselineLeaves': BASELINE_COUNTS,
                          'results': {name: RESULTS[name] for name in
                                      ('zero', 'time-zero', 'half-pi', 'pi', 'two-pi', 'detuned', 'negative-detuning')}},
                         allow_nan=False, separators=(',', ':')))
    else:
        unittest.main()
