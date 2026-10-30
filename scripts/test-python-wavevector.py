"""Independent finite-group, Fourier and real-subspace checks for finite q."""
from pathlib import Path
import json
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from wavevector_lab import calculate, group_data, wave_star, fourier_basis


def matrix(value):
    return np.array(value['re']) + 1j*np.array(value['im'])


class WavevectorTests(unittest.TestCase):
    def test_exact_group_and_action(self):
        for n in (2, 3, 4):
            sites, rotations, ops, mul = group_data(n)
            size = 8*n*n
            self.assertEqual(len(ops), size)
            self.assertEqual(len({tuple(r.ravel()) for r in rotations}), 8)
            np.testing.assert_array_equal(mul[0], np.arange(size))
            np.testing.assert_array_equal(mul[:, 0], np.arange(size))
            for a in range(size):
                self.assertTrue(np.any(mul[a] == 0))
                self.assertEqual(len(set(mul[a])), size)
                for b in range(size):
                    # Action homomorphism independent of the point-index lookup.
                    np.testing.assert_array_equal(ops[a]['matrix'] @ ops[b]['matrix'], ops[int(mul[a, b])]['matrix'])
                    # Associativity against all c, vectorized.
                    np.testing.assert_array_equal(mul[int(mul[a, b])], mul[a, mul[b]])
            for op in ops:
                p = op['matrix']
                np.testing.assert_array_equal(p.T@p, np.eye(n*n))
            self.assertEqual(len(sites), n*n)

    def test_star_real_dimensions_and_fourier_projector(self):
        for n in (2, 3, 4):
            sites, rots, _, _ = group_data(n)
            for qx in range(n):
                for qy in range(n):
                    star, pairs = wave_star((qx, qy), n, rots)
                    b = fourier_basis(sites, pairs, n)
                    self.assertEqual(b.shape[1], len(star))
                    self.assertEqual(sum(len(p) for p in pairs), len(star))
                    for arm in star:
                        self.assertIn(tuple(-np.array(arm) % n), star)
                    # Independent complex Fourier basis gives the same projector.
                    f = np.column_stack([np.exp(2j*np.pi*(sites@arm)/n)/n for arm in star])
                    np.testing.assert_allclose(b.T@b, np.eye(len(star)), atol=1e-12)
                    np.testing.assert_allclose(b@b.T, f@f.conj().T, atol=1e-12)

    def test_known_patterns_and_domain_counts(self):
        fixtures = [
            ({}, 16, 8, 4, [4, 1]),
            ({'pattern': 'multi'}, 8, 16, 16, [4, 4]),
            ({'period': 2, 'qx': 1, 'qy': 1}, 16, 2, 2, [2, 2]),
            ({'period': 3, 'phaseDegrees': 20}, 6, 12, 3, [3, 1]),
            ({'pattern': 'multi', 'transverseRatio': .5, 'relativePhaseDegrees': 90}, 4, 32, 16, [4, 4]),
            ({'period': 3, 'qx': 1, 'qy': 1}, 12, 6, 3, [3, 3])]
        for payload, h, domains, tdomains, rectangular in fixtures:
            r = calculate(payload)
            w = r['wavevector']
            self.assertEqual(w['stabilizerOrder'], h)
            self.assertEqual(w['domainCount'], domains)
            self.assertEqual(w['translationDomainCount'], tdomains)
            self.assertEqual(w['translationIndex'], tdomains)
            self.assertEqual(w['rectangularPeriod'], rectangular)
            self.assertTrue(r['checks']['passed'])

    def test_stabilizer_from_direct_coordinate_action_and_cosets(self):
        for payload in ({}, {'period': 3, 'qx': 1, 'qy': 1, 'phaseDegrees': 23}, {'pattern': 'multi', 'transverseRatio': .7}):
            w = calculate(payload)['wavevector']
            n = w['period']
            field = np.array(w['field'])
            retained = []
            for op in w['operations']:
                r = np.array(op['pointMatrix'])
                translated = np.empty(n*n)
                for y in range(n):
                    for x in range(n):
                        source = r.T @ (np.array([x, y])-op['translation']) % n
                        translated[y*n+x] = field[source[1]*n+source[0]]
                if np.max(np.abs(translated-field)) < 1e-10:
                    retained.append(op['id'])
            self.assertEqual(retained, w['retained'])
            _, _, _, mul = group_data(n)
            h = set(retained)
            cosets = {frozenset(int(mul[g, k]) for k in h) for g in range(8*n*n)}
            self.assertEqual(len(cosets), w['domainCount'])

    def test_dft_against_direct_sum_and_parseval(self):
        for payload in ({'phaseDegrees': 37}, {'pattern': 'multi', 'transverseRatio': .6, 'relativePhaseDegrees': 19}, {'period': 2, 'qx': 1, 'qy': 1}):
            w = calculate(payload)['wavevector']
            n = w['period']
            sites = np.array(w['sites'])[:, :2]
            field = np.array(w['field'])
            for row in w['spectrum']:
                direct = sum(field*np.exp(-2j*np.pi*(sites@row['q'])/n))/(n*n)
                self.assertAlmostEqual(direct.real, row['re'])
                self.assertAlmostEqual(direct.imag, row['im'])
                self.assertAlmostEqual(abs(direct)**2, row['intensity'])
            self.assertAlmostEqual(sum(s['intensity'] for s in w['spectrum']), np.mean(field**2))

    def test_nonself_phase_and_translation_change_phase_not_intensity(self):
        ref = calculate({})['wavevector']
        for angle in (0, 20, 90, 180, 270):
            w = calculate({'phaseDegrees': angle})['wavevector']
            spectrum = {tuple(s['q']): s for s in w['spectrum']}
            self.assertAlmostEqual(spectrum[(1, 0)]['intensity'], .25)
            self.assertAlmostEqual(spectrum[(3, 0)]['intensity'], .25)
            expected = .5*np.exp(1j*np.deg2rad(angle))
            self.assertAlmostEqual(spectrum[(1, 0)]['re'], expected.real)
            self.assertAlmostEqual(spectrum[(1, 0)]['im'], expected.imag)
        _, _, ops, _ = group_data(4)
        translated = ops[1]['matrix']@np.array(ref['field'])
        np.testing.assert_allclose(translated, calculate({'phaseDegrees': -90})['wavevector']['field'], atol=1e-12)

    def test_selfconjugate_and_zero_state(self):
        for n, q in ((2, (1, 1)), (4, (2, 0)), (4, (0, 0))):
            w = calculate({'period': n, 'qx': q[0], 'qy': q[1], 'phaseDegrees': 90})['wavevector']
            np.testing.assert_array_equal(w['field'], np.zeros(n*n))
            self.assertEqual(w['stabilizerOrder'], 8*n*n)
            self.assertEqual(w['domainCount'], 1)
            self.assertEqual(w['rectangularPeriod'], [1, 1])
        for amplitude in (1, 1e-20):
            w = calculate({'amplitude': amplitude})['wavevector']
            self.assertEqual(w['domainCount'], 8)
            self.assertEqual(w['translationIndex'], 4)
        self.assertFalse(calculate({'period': 2})['wavevector']['faithfulSiteAction'])

    def test_subgroup_graph_is_real_inclusion_and_selected_is_h(self):
        for payload in ({}, {'amplitude': 0}, {'period': 2, 'qx': 1, 'qy': 1}):
            r = calculate(payload)
            graph = r['subgroupGraph']
            nodes = {node['id']: node for node in graph['nodes']}
            for edge in graph['edges']:
                self.assertTrue(set(nodes[edge['to']]['members']) < set(nodes[edge['from']]['members']))
            self.assertEqual(set(nodes[graph['selected']]['members']), set(r['wavevector']['retained']))
            self.assertEqual(len({frozenset(node['members']) for node in nodes.values()}), len(nodes))

    def test_grading_internal_basis_changes_and_replay(self):
        r = calculate({'period': 3, 'qx': 1, 'qy': 1})
        task = r['grading']['tasks'][0]
        b = matrix(task['reference'])
        p = b@b.conj().T
        m = np.diag(np.arange(1, b.shape[1]+1)) + .2j*np.ones((b.shape[1], b.shape[1]))
        changed = b@m
        np.testing.assert_allclose(changed@np.linalg.pinv(changed), p, atol=1e-12)
        for item in task['operators']:
            d = matrix(item)
            np.testing.assert_allclose((np.eye(len(p))-p)@d@b, 0, atol=1e-12)
        np.testing.assert_allclose(matrix(r['replay'][-1]['vector']), r['wavevector']['field'], atol=1e-12)
        self.assertLessEqual(len(b), 16)

    def test_periodic_q_equivalence(self):
        a = calculate({'period': 4, 'qx': -1, 'qy': 0})['wavevector']
        b = calculate({'period': 4, 'qx': 3, 'qy': 4})['wavevector']
        np.testing.assert_allclose(a['field'], b['field'])
        self.assertEqual(a['star'], b['star'])

    def test_presets_content_and_json(self):
        content = json.loads((ROOT/'dist/data/wavevector-content.json').read_text(encoding='utf-8'))
        self.assertEqual(len(content['module']['presets']), 7)
        self.assertEqual(len(content['module']['predictions']), 2)
        self.assertEqual(len(content['lessons']), 3)
        self.assertEqual(len(content['cases']), 3)
        for exercise in content['exercises']:
            self.assertEqual(len(exercise['steps']), 4)
            for step in exercise['steps']:
                self.assertIn(step['answer'], range(len(step['choices'])))
        for preset in content['module']['presets']:
            result = calculate(preset['input'])
            self.assertTrue(result['checks']['passed'], preset['id'])
            json.dumps(result, allow_nan=False)

    def test_validation(self):
        for payload in (None, [], {'period': 1}, {'period': 5}, {'period': 2.1}, {'qx': 1.2}, {'qy': True},
                        {'amplitude': float('nan')}, {'phaseDegrees': float('inf')}, {'pattern': 'magnetic'},
                        {'transverseRatio': 4}, {'unknown': 1}):
            with self.assertRaises(ValueError):
                calculate(payload)


if __name__ == '__main__':
    unittest.main(verbosity=2)
