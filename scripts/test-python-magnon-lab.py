"""Independent finite-chain, classical-energy and animation checks."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from magnon_lab import run, HBAR_MEV_PS, PLANCK_MEV_PS


def classical_energy(spins, model, j, delta, h):
    # Direct bond sum: neither dispersion nor magnon_lab.dynamic_matrix used.
    sign = -1 if model == 'fm' else 1
    next_spins = np.roll(spins, -1, axis=0)
    return sign * j * np.sum(spins[:, 0] * next_spins[:, 0] + spins[:, 1] * next_spins[:, 1]
                              + delta * spins[:, 2] * next_spins[:, 2]) - h * np.sum(spins[:, 2])


def ll_rhs(spins, model, j, delta, h):
    sign = -1 if model == 'fm' else 1
    gradient = sign * j * (np.roll(spins, -1, axis=0) + np.roll(spins, 1, axis=0))
    gradient[:, 2] *= delta
    gradient[:, 2] -= h
    return np.cross(gradient, spins)


class MagnonLabTests(unittest.TestCase):
    def test_fm_dispersion_against_exact_one_magnon_hamiltonian(self):
        n, j, s, delta, h = 12, 1.3, .5, 1.42, .23
        matrix = np.diag(np.full(n, 2*j*s*delta+h))
        for i in range(n):
            matrix[i, (i+1) % n] = -j*s
            matrix[(i+1) % n, i] = -j*s
        expected = sorted(run({'model': 'fm', 'exchange': j, 'spin': s, 'anisotropy': delta,
                               'field': h, 'q': 2*m/n if m <= n//2 else 2*m/n-2})['selection']['energy']
                          for m in range(n))
        np.testing.assert_allclose(np.linalg.eigvalsh(matrix), expected, atol=3e-15)

    def test_fm_goldstone_and_quadratic_limit(self):
        result = run({'anisotropy': 1, 'q': 0, 'spin': 2.5, 'exchange': 1.7})
        self.assertTrue(result['validation']['goldstoneExpected'])
        self.assertTrue(result['validation']['goldstoneCheckPassed'])
        self.assertEqual(result['stability']['gap'], 0)
        self.assertFalse(result['animation']['available'])
        small = run({'anisotropy': 1, 'q': 1e-4, 'spin': 2.5, 'exchange': 1.7})
        self.assertAlmostEqual(small['selection']['energy']/(math.pi*1e-4)**2, 1.7*2.5, places=6)

    def test_afm_goldstone_and_linear_limit(self):
        r = run({'model': 'afm', 'anisotropy': 1, 'q': 0, 'spin': 2.5, 'exchange': 1.7})
        self.assertTrue(r['validation']['goldstoneCheckPassed'])
        self.assertFalse(r['animation']['available'])
        self.assertFalse(r['stability']['dynamicallyOscillatory'])
        small = run({'model': 'afm', 'anisotropy': 1, 'q': 1e-5, 'spin': 2.5, 'exchange': 1.7})
        self.assertAlmostEqual(small['selection']['energy']/(math.pi*1e-5), 2*1.7*2.5, places=7)

    def test_afm_zero_field_degeneracy_and_linear_zeeman_splitting(self):
        r = run({'model': 'afm', 'anisotropy': 1.4, 'field': .24})
        a, b = r['bands']
        np.testing.assert_allclose(np.array(b['energies']) - a['energies'], .48, atol=1e-14)
        r0 = run({'model': 'afm'})
        np.testing.assert_equal(r0['bands'][0]['energies'], r0['bands'][1]['energies'])

    def test_afm_branch_polarizations_at_zone_boundary(self):
        low = run({'model': 'afm', 'q': .5, 'branch': 0})
        high = run({'model': 'afm', 'q': .5, 'branch': 1})
        np.testing.assert_allclose(low['selection']['sublatticeCoefficients'], [0, 1], atol=1e-15)
        np.testing.assert_allclose(high['selection']['sublatticeCoefficients'], [1, 0], atol=1e-15)
        self.assertLess(low['selection']['signedSplusFrequencyEnergy'], 0)
        self.assertGreater(high['selection']['signedSplusFrequencyEnergy'], 0)

    def test_modes_satisfy_independent_real_space_linearized_landau_lifshitz(self):
        n = 16
        for model, branch in [('fm', 0), ('afm', 0), ('afm', 1)]:
            r = run({'model': model, 'exchange': 1.3, 'spin': 1.5, 'anisotropy': 1.37,
                     'field': .2, 'q': .25, 'branch': branch, 'sites': n})
            p = r['parameters']
            background = np.array([site['equilibrium'] for site in r['animation']['sites']])
            coeff = r['selection']['sublatticeCoefficients']
            transverse = np.array([coeff[0 if model == 'fm' else i % 2] * np.exp(1j*math.pi*.25*i) for i in range(n)])
            perturbation = np.column_stack([transverse.real, transverse.imag, np.zeros(n)])
            eps = 1e-6
            derivative = (ll_rhs(background+eps*perturbation, model, p['exchange'], p['anisotropy'], p['field'])
                          - ll_rhs(background-eps*perturbation, model, p['exchange'], p['anisotropy'], p['field']))/(2*eps)
            splus_derivative = derivative[:, 0] + 1j*derivative[:, 1]
            expected = -1j*r['selection']['signedSplusFrequencyEnergy']*transverse
            np.testing.assert_allclose(splus_derivative, expected, atol=1e-13)

    def test_classical_spin_flop_threshold_from_direct_competing_energies(self):
        j, s, delta = 1.7, 1.5, 1.6
        critical = 2*j*s*math.sqrt(delta*delta-1)
        for scale in [.8, 1, 1.2]:
            h = scale*critical
            r = run({'model': 'afm', 'exchange': j, 'spin': s, 'anisotropy': delta, 'field': h})
            c = h/(2*j*s*(delta+1))
            neel = np.array([[0, 0, s], [0, 0, -s]])
            canted = np.array([[s*math.sqrt(1-c*c), 0, s*c], [-s*math.sqrt(1-c*c), 0, s*c]])
            e_neel = classical_energy(neel, 'afm', j, delta, h)/2
            e_canted = classical_energy(canted, 'afm', j, delta, h)/2
            self.assertAlmostEqual(r['stability']['spinFlopField'], critical)
            self.assertAlmostEqual(e_neel, r['stability']['classicalEnergiesPerSite']['reference'])
            self.assertAlmostEqual(e_canted, r['stability']['classicalEnergiesPerSite']['cantedOrSaturated'])
            self.assertEqual(r['stability']['classicalGroundState'], scale <= 1)
            if scale == 1:
                self.assertAlmostEqual(e_neel, e_canted)
                self.assertTrue(r['stability']['marginal'])
            else:
                self.assertEqual(e_neel < e_canted, scale < 1)

    def test_afm_spin_flop_is_not_reported_as_neel_ground_state(self):
        r = run({'model': 'afm', 'anisotropy': 1.1, 'field': 2})
        self.assertFalse(r['stability']['classicalGroundState'])
        self.assertFalse(r['stability']['energeticallyStable'])
        self.assertTrue(r['stability']['dynamicallyOscillatory'])
        self.assertLess(r['stability']['gap'], 0)
        self.assertLess(r['stability']['minimumHessianEigenvalue'], 0)
        self.assertTrue(any(x < 0 for x in r['bands'][0]['energies']))
        self.assertFalse(r['animation']['available'])
        self.assertEqual(r['animation']['frames'], [])

    def test_local_energy_hessian_against_finite_difference(self):
        j, s, delta = 1.3, 1.5, 1.4
        for model, h in [('fm', .2), ('fm', -2), ('afm', .2), ('afm', 4)]:
            r = run({'model': model, 'exchange': j, 'spin': s, 'anisotropy': delta, 'field': h})
            def energy(x):
                first = [x[0], 0, math.sqrt(s*s-x[0]**2)]
                second = [x[1], 0, (1 if model == 'fm' else -1)*math.sqrt(s*s-x[1]**2)]
                return classical_energy(np.array([first, second]), model, j, delta, h)
            step = 1e-4
            e0 = energy([0, 0])
            hessian = np.zeros((2, 2))
            for i in range(2):
                direction = np.eye(2)[i]*step
                hessian[i, i] = (energy(direction)+energy(-direction)-2*e0)/step**2
            hessian[0, 1] = hessian[1, 0] = (energy([step, step])-energy([step, -step])
                                            -energy([-step, step])+energy([-step, -step]))/(4*step**2)
            self.assertAlmostEqual(np.linalg.eigvalsh(hessian)[0], r['stability']['minimumHessianEigenvalue'], places=6)

    def test_fm_metastability_and_local_instability_are_distinct(self):
        metastable = run({'anisotropy': 1.5, 'field': -.3})
        self.assertTrue(metastable['stability']['energeticallyStable'])
        self.assertFalse(metastable['stability']['classicalGroundState'])
        self.assertTrue(metastable['animation']['available'])
        unstable = run({'anisotropy': 1.5, 'field': -1.1})
        self.assertFalse(unstable['stability']['energeticallyStable'])
        self.assertFalse(unstable['animation']['available'])

    def test_afm_reversing_field_swaps_two_branches(self):
        plus = run({'model': 'afm', 'field': .5})
        minus = run({'model': 'afm', 'field': -.5})
        for i in (0, 1):
            np.testing.assert_allclose(plus['bands'][i]['energies'], minus['bands'][1-i]['energies'])
        self.assertEqual(plus['stability']['gap'], minus['stability']['gap'])

    def test_zero_field_gap_and_boundary_energies(self):
        for model in ('fm', 'afm'):
            r = run({'model': model, 'exchange': 2, 'spin': 1.5, 'anisotropy': 1.25,
                     'q': 1 if model == 'fm' else .5})
            gap = 6*.25 if model == 'fm' else 6*math.sqrt(1.25**2-1)
            edge = 6*2.25 if model == 'fm' else 6*1.25
            self.assertAlmostEqual(r['stability']['gap'], gap)
            self.assertAlmostEqual(r['selection']['energy'], edge)

    def test_bz_conventions_and_even_sampling_retain_gamma(self):
        for model, length, limit in [('fm', 1, 1), ('afm', 2, .5)]:
            r = run({'model': model, 'samples': 100})
            self.assertEqual(r['path']['magneticCellLength'], length)
            self.assertEqual(r['path']['range'], [-limit, limit])
            self.assertIn(0, r['path']['coordinates'])
            self.assertEqual(r['path']['sampleCount'], 101)
            self.assertTrue(all(len(b['energies']) == len(r['path']['coordinates']) for b in r['bands']))

    def test_animation_is_small_angle_fixed_length_and_correct_period(self):
        for model, branch in [('fm', 0), ('afm', 0), ('afm', 1)]:
            r = run({'model': model, 'branch': branch, 'amplitude': .2, 'spin': 2.5})
            a = r['animation']
            self.assertTrue(a['available'])
            self.assertFalse(a['nonlinearDynamics'])
            self.assertAlmostEqual(a['periodPs']*r['selection']['energy'], PLANCK_MEV_PS)
            for frame in a['frames']:
                np.testing.assert_allclose(np.linalg.norm(frame['spins'], axis=1), 2.5, atol=1e-14)
                self.assertLessEqual(np.max(np.linalg.norm(np.array(frame['spins'])[:, :2], axis=1)), .5+1e-14)
            self.assertLess(r['validation']['normalizedSpinLengthResidual'], 1e-14)
            self.assertLess(r['validation']['eigenvectorResidual'], 1e-14)
            self.assertLess(r['validation']['spectrumResidual'], 1e-14)

    def test_selected_mode_zero_amplitude_and_time_units(self):
        r = run({'amplitude': 0})
        for frame in r['animation']['frames']:
            self.assertEqual(frame['spins'], [site['equilibrium'] for site in r['animation']['sites']])
        last = r['animation']['frames'][-1]
        self.assertAlmostEqual(last['timePs'], last['phase']*HBAR_MEV_PS/r['selection']['energy'])
        self.assertAlmostEqual(r['selection']['frequencyTHz']*r['animation']['periodPs'], 1)

    def test_small_spin_warning_and_exchange_anisotropy_not_single_ion(self):
        r = run({'model': 'afm', 'spin': .5})
        self.assertTrue(any('一维小 S' in w for w in r['warnings']))
        self.assertTrue(any('S=1/2 是常数' in w for w in r['warnings']))
        self.assertTrue(r['synthetic'])
        self.assertIn('不是 MnF₂', r['warnings'][0])

    def test_validation_rejects_unphysical_or_unsupported_inputs(self):
        for payload in [{'model': 'spiral'}, {'exchange': 0}, {'exchange': True}, {'spin': .7},
                        {'anisotropy': .9}, {'field': float('nan')}, {'q': 1.1}, {'model': 'afm', 'q': .7},
                        {'samples': 1001}, {'sites': 1000}, {'model': 'afm', 'sites': 5}, {'frames': 1000},
                        {'amplitude': .3}, {'branch': 1}, {'dmi': 0}, {'single_ion': 1}, {'temperature': 300}]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)

    def test_json_finite_at_boundaries(self):
        for payload in [{}, {'model': 'afm', 'q': 0, 'anisotropy': 1},
                        {'model': 'afm', 'field': 1000}, {'field': -1000},
                        {'model': 'afm', 'spin': 10, 'exchange': 100, 'anisotropy': 5, 'q': 0}]:
            json.dumps(run(payload), allow_nan=False)

    def test_shipped_examples_are_runnable_and_marked_as_models(self):
        examples = Path(__file__).resolve().parents[1]/'dist'/'data'/'examples'
        files = sorted(examples.glob('magnon-*.json'))
        self.assertEqual(len(files), 3)
        for file in files:
            payload = json.loads(file.read_text(encoding='utf-8'))
            self.assertTrue(payload['synthetic'])
            r = run(payload)
            json.dumps(r, allow_nan=False)
            self.assertEqual(r['animation']['available'], 'instability' not in file.stem)


if __name__ == '__main__':
    unittest.main()
