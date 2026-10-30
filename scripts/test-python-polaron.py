"""Physical limits and independent checks for the one-electron Holstein dimer."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import polaron_lab as p


def direct_basis_matrix(params, cutoff):
    basis = [(site, n0, n1) for site in range(2) for n0 in range(cutoff+1) for n1 in range(cutoff+1)]
    lookup = {state: i for i, state in enumerate(basis)}
    result = np.zeros((len(basis), len(basis)))
    for col, state in enumerate(basis):
        site, n0, n1 = state
        result[col, col] = params['phononEnergy']*(n0+n1) + params['siteBias']*(.5 if site == 0 else -.5)
        result[lookup[(1-site, n0, n1)], col] = -params['hopping']
        occupied_phonons = state[site+1]
        if occupied_phonons < cutoff:
            dest = list(state)
            dest[site+1] += 1
            row = lookup[tuple(dest)]
            result[row, col] = result[col, row] = params['coupling']*math.sqrt(occupied_phonons+1)
    return result


class PolaronTests(unittest.TestCase):
    def test_hamiltonian_against_explicit_basis_actions(self):
        params = p.parameters({'hopping': .71, 'coupling': .83, 'phononEnergy': 1.21, 'siteBias': -.34, 'cutoff': 3})
        actual, _ = p.hamiltonian(params)
        np.testing.assert_allclose(actual, direct_basis_matrix(params, 3), atol=2e-15)

    def test_uncoupled_complete_spectrum(self):
        params = p.parameters({'coupling': 0, 'siteBias': .6, 'hopping': .9, 'phononEnergy': 1.3, 'cutoff': 4})
        splitting = math.hypot(.9, .3)
        expected = sorted(sign*splitting+1.3*(n0+n1) for sign in (-1, 1) for n0 in range(5) for n1 in range(5))
        result = p.solve(params)
        np.testing.assert_allclose(result['eigenvalues'], expected, atol=2e-14)
        self.assertAlmostEqual(result['ground']['electronicPurity'], 1, places=12)
        np.testing.assert_allclose(result['ground']['phononOccupation'], [0, 0], atol=1e-14)
        self.assertAlmostEqual(result['ground']['density'][0], (1-.3/splitting)/2, places=12)

    def test_atomic_displaced_oscillator_energy_and_poisson_law(self):
        params = p.parameters({'hopping': 0, 'coupling': .7, 'phononEnergy': 1, 'siteBias': .8, 'cutoff': 10})
        ground = p.solve(params)['ground']
        self.assertAlmostEqual(ground['energy'], -.4-.49, places=9)
        np.testing.assert_allclose(ground['density'], [0, 1], atol=1e-13)
        np.testing.assert_allclose(ground['displacement'], [0, -1.4], atol=2e-8)
        np.testing.assert_allclose(ground['phononOccupation'], [0, .49], atol=1e-8)
        poisson = [math.exp(-.49)*.49**n/math.factorial(n) for n in range(11)]
        np.testing.assert_allclose(ground['phononDistributions'][1], poisson, atol=4e-9)
        self.assertEqual(ground['conditionalDisplacement'][0], [None, None])

    def test_symmetric_atomic_degeneracy_is_averaged(self):
        ground = p.solve(p.parameters({'hopping': 0, 'siteBias': 0, 'coupling': .5, 'cutoff': 8}))['ground']
        self.assertEqual(ground['degeneracy'], 2)
        np.testing.assert_allclose(ground['density'], [.5, .5], atol=1e-13)
        np.testing.assert_allclose(ground['electronicDensityMatrix'], np.eye(2)*.5, atol=1e-13)
        np.testing.assert_allclose(ground['conditionalDisplacement'], [[-1, 0], [0, -1]], atol=1e-8)

    def test_bias_reversal_swaps_sites(self):
        params = p.parameters({'siteBias': .7, 'cutoff': 5})
        a = p.solve(params)['ground']
        b = p.solve({**params, 'siteBias': -.7})['ground']
        self.assertAlmostEqual(a['energy'], b['energy'], places=12)
        for key in ('density', 'phononOccupation', 'displacement'):
            np.testing.assert_allclose(a[key], b[key][::-1], atol=2e-13)
        np.testing.assert_allclose(a['densityDisplacement'], np.array(b['densityDisplacement'])[::-1, ::-1], atol=2e-13)

    def test_symmetric_entangled_ground_has_local_cloud(self):
        ground = p.solve(p.parameters({'coupling': 1, 'cutoff': 8}))['ground']
        np.testing.assert_allclose(ground['density'], [.5, .5], atol=1e-12)
        self.assertEqual(ground['degeneracy'], 1)
        self.assertLess(ground['electronicPurity'], .99)
        self.assertLess(ground['conditionalDisplacement'][0][0], ground['conditionalDisplacement'][0][1])
        self.assertGreater(ground['phononOccupation'][0], .1)

    def test_hellmann_feynman_coupling_and_bias(self):
        params = p.parameters({'coupling': .8, 'siteBias': .4, 'cutoff': 5})
        ground = p.solve(params)['ground']
        eps = 1e-5
        for key, expected in [('coupling', np.trace(ground['densityDisplacement'])),
                              ('siteBias', (ground['density'][0]-ground['density'][1])/2)]:
            plus = p.solve({**params, key: params[key]+eps})['ground']['energy']
            minus = p.solve({**params, key: params[key]-eps})['ground']['energy']
            self.assertAlmostEqual((plus-minus)/(2*eps), expected, places=8)

    def test_variational_energy_and_reported_convergence(self):
        params = p.parameters({'coupling': .8, 'cutoff': 2})
        energies = [p.solve(params, cut)['ground']['energy'] for cut in (2, 3, 4, 5)]
        self.assertTrue(all(a >= b-1e-12 for a, b in zip(energies, energies[1:])))
        small = p.calculate({**params, 'scanPoints': 1})
        self.assertFalse(small['convergence']['converged'])
        self.assertTrue(small['checks']['passed'])
        good = p.calculate({'coupling': .5, 'cutoff': 6, 'scanPoints': 1})
        self.assertTrue(good['convergence']['converged'])

    def test_large_coupling_is_flagged_not_hidden(self):
        result = p.calculate({'coupling': 2, 'phononEnergy': .2, 'cutoff': 2, 'scanPoints': 1})
        self.assertFalse(result['convergence']['converged'])
        self.assertGreater(max(result['ground']['topLevelProbability']), .01)
        self.assertTrue(any('未通过' in warning for warning in result['warnings']))

    def test_energy_scaling_preserves_states(self):
        params = p.parameters({'hopping': .6, 'coupling': .4, 'phononEnergy': .7, 'siteBias': .3, 'cutoff': 3})
        scaled = {**params, **{key: params[key]*2 for key in ('hopping', 'coupling', 'phononEnergy', 'siteBias')}}
        a, b = p.solve(params), p.solve(scaled)
        np.testing.assert_allclose(np.array(a['eigenvalues'])*2, b['eigenvalues'], atol=1e-14)
        np.testing.assert_allclose(a['ground']['densityDisplacement'], b['ground']['densityDisplacement'], atol=1e-14)

    def test_json_output_and_probability_checks(self):
        result = p.calculate({'scanPoints': 3})
        json.dumps(result, allow_nan=False)
        self.assertTrue(result['checks']['passed'])
        self.assertEqual(len(result['scan']), 3)
        self.assertEqual(result['scan'][0]['coupling'], 0)
        self.assertEqual(result['scan'][-1]['coupling'], 1.6)
        self.assertEqual(result['convergence']['comparisonCutoff'], 7)
        self.assertTrue(all(abs(sum(row)-1)<1e-12 for row in result['ground']['phononDistributions']))

    def test_invalid_inputs(self):
        for payload in (None, [], {'hopping': True}, {'coupling': float('nan')}, {'siteBias': '1'},
                        {'phononEnergy': 0}, {'cutoff': 3.2}, {'cutoff': 11}, {'scanPoints': 10}, {'temperature': 20}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                p.calculate(payload)

    def test_teaching_catalog_and_real_presets(self):
        data = json.loads((ROOT / 'dist/data/polaron-content.json').read_text(encoding='utf-8'))
        self.assertEqual(data['module']['action'], 'polaron_lab')
        self.assertEqual(len(data['lessons']), 3)
        self.assertEqual(sum(len(row['steps']) for row in data['exercises']), 12)
        self.assertEqual(len(data['cases']), 3)
        source_ids = {row['id'] for row in data['sources']}
        presets = {row['id']: row for row in data['module']['presets']}
        lessons = {row['id'] for row in data['lessons']}
        for lesson in data['lessons']:
            self.assertIn(lesson['preset'], presets)
            self.assertTrue(set(lesson['references']) <= source_ids)
        for exercise in data['exercises']:
            self.assertIn(exercise['lesson'], lessons)
            for step in exercise['steps']:
                self.assertTrue(0 <= step['answer'] < len(step['choices']))
        for case in data['cases']:
            self.assertIn(case['preset'], presets)
        for preset in presets.values():
            result = p.calculate(preset['input'])
            self.assertTrue(result['checks']['passed'], preset['id'])
            json.dumps(result, allow_nan=False)
            plot_ids = {row['id'] for row in result['plots']}
            self.assertTrue(all(link['plot'] in plot_ids for link in result['formulaLinks']))


if __name__ == '__main__':
    unittest.main()
