"""Independent physical limits for the small two-terminal transport lab."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'dist/python'))
import device_transport_lab as d


class DeviceTransportTests(unittest.TestCase):
    def point(self, energy=.3, full=True, **kwargs):
        p = d.parameters({'eta': 1e-9, 'energy': energy, **kwargs})
        matrix, _, _ = d.hamiltonian(p)
        return d.evaluate(energy, p, matrix, full=full)

    def test_retarded_surface_green_and_dyson_equation(self):
        for hopping in (.05, .7, 2):
            for relative in (-8, -2, -1.8, -.2, 0, .2, 1.8, 2, 8):
                energy = 0.3 + hopping*relative
                g = d.lead_surface_green(energy, hopping, .3)
                self.assertLessEqual(g.imag, 0)
                self.assertAlmostEqual(abs((energy-.3-hopping**2*g)*g-1), 0, delta=1e-12)
        self.assertAlmostEqual(d.lead_surface_green(1e8, 1).real*1e8, 1, places=12)

    def test_uniform_chain_transmission_and_bulk_ldos(self):
        for n in (2, 7, 24, 40):
            for energy in (-1.6, 0, .4, 1.7):
                r = self.point(energy, sites=n)
                self.assertAlmostEqual(r['transmission'], 1, delta=2e-7)
                self.assertLess(r['reflection'], 1e-12)
                # Exact infinite-chain DOS per site is 1/(pi sqrt(4t²-E²)).
                exact = 1/(math.pi*math.sqrt(4-energy**2))
                np.testing.assert_allclose(r['ldos'], exact, rtol=2e-7)
                np.testing.assert_allclose(r['bondTransmission'], 1, rtol=2e-7)

    def test_single_impurity_matches_independent_scattering_formula(self):
        for barrier in (-2, .4, 1.8):
            for energy in (-1.2, .1, 1.1):
                expected = (4-energy**2)/(4-energy**2+barrier**2)
                for position in (0, 4, 11):
                    r = self.point(energy, barrier=barrier, barrierStart=position)
                    self.assertAlmostEqual(r['transmission'], expected, delta=2e-7)

    def test_zero_contact_has_no_transmission(self):
        for contacts in ({'contactLeft': 0}, {'contactRight': 0}, {'contactLeft': 0, 'contactRight': 0}):
            r = d.run({**contacts, 'samples': 41})
            self.assertEqual(r['selection']['transmission'], 0)
            self.assertTrue(all(t == 0 for t in r['scan']['transmission']))
            self.assertGreaterEqual(min(r['selection']['ldos']), 0)

    def test_lead_band_edges_and_outside_band(self):
        for energy in (-3, -2, 2, 3):
            r = self.point(energy)
            self.assertFalse(r['leadOpen'])
            self.assertEqual(r['transmission'], 0)
            self.assertIsNone(r['reflection'])
            self.assertEqual(r['gammaLeft'], 0)
            self.assertTrue(np.all(np.isfinite(r['ldos'])))

    def test_uniform_shift_is_a_gauge_of_energy_zero(self):
        r = self.point(.31, gate=.2, leadOnsite=.2, barrier=.7)
        s = self.point(2.81, gate=2.7, leadOnsite=2.7, barrier=.7)
        self.assertAlmostEqual(r['transmission'], s['transmission'], places=13)
        np.testing.assert_allclose(r['ldos'], s['ldos'], atol=1e-13)

    def test_left_right_reversal(self):
        p = d.parameters({'model': 'ssh', 'sites': 11, 'contactLeft': .4,
                          'contactRight': .9, 'barrier': .6, 'barrierStart': 3, 'eta': 1e-8})
        h, _, _ = d.hamiltonian(p)
        r = d.evaluate(.43, p, h, True)
        reverse = {**p, 'contactLeft': p['contactRight'], 'contactRight': p['contactLeft']}
        s = d.evaluate(.43, reverse, h[::-1, ::-1], True)
        self.assertAlmostEqual(r['transmission'], s['transmission'], places=13)
        np.testing.assert_allclose(r['ldos'], s['ldos'][::-1], atol=1e-12)
        np.testing.assert_allclose(r['leftInjectivity'], s['rightInjectivity'][::-1], atol=1e-12)

    def test_two_site_contact_resonance(self):
        # At E=0, each surface self energy is -i*c²/t0.  Inverting a 2x2
        # device analytically gives T=4 a² t²/(a²+t²)² as eta tends to zero.
        for contact in (.1, .3, .7, 1.3):
            a = contact**2
            expected = 4*a*a/(1+a*a)**2
            r = self.point(0, sites=2, barrierStart=0, contactLeft=contact, contactRight=contact)
            self.assertAlmostEqual(r['transmission'], expected, delta=5e-9)

    def test_unitarity_green_identity_and_local_continuity(self):
        rng = np.random.default_rng(127)
        for _ in range(14):
            r = self.point(float(rng.uniform(-1.8, 1.8)), model='ssh',
                           dimerRatio=float(rng.uniform(.25, 2)), gate=float(rng.uniform(-.3, .3)),
                           barrier=float(rng.uniform(-2, 2)), contactLeft=float(rng.uniform(.1, 2)),
                           contactRight=float(rng.uniform(.1, 2)), eta=1e-5)
            self.assertGreaterEqual(r['transmission'], 0)
            self.assertLessEqual(r['transmission'], 1+1e-10)
            self.assertAlmostEqual(r['transmission']+r['reflection']+r['regulatorAbsorption'], 1, delta=1e-10)
            self.assertLess(r['continuityResidual'], 1e-10)
            self.assertLess(r['greenIdentityResidual'], 1e-10)
            self.assertLess(r['reciprocityResidual'], 1e-10)
            self.assertGreaterEqual(r['minimumLDOS'], -1e-12)

    def test_artificial_absorption_has_reported_eta_dependence(self):
        a = self.point(.2, eta=1e-3)
        b = self.point(.2, eta=1e-7)
        self.assertGreater(a['regulatorAbsorption'], b['regulatorAbsorption'])
        self.assertLess(a['transmission'], b['transmission'])
        self.assertGreater(a['bondTransmission'][0], a['bondTransmission'][-1])
        np.testing.assert_allclose(np.diff(a['bondTransmission']), -np.array(a['siteRegulatorLoss'])[1:-1], atol=1e-12)

    def test_spin_factor_only_multiplies_conductance(self):
        a = self.point(.2, spinDegeneracy=1)
        b = self.point(.2, spinDegeneracy=2)
        self.assertEqual(a['transmission'], b['transmission'])
        self.assertEqual(2*a['conductanceSiemens'], b['conductanceSiemens'])
        np.testing.assert_array_equal(a['ldos'], b['ldos'])
        self.assertAlmostEqual(d.G_QUANTUM, 3.8740458649318244e-5, delta=1e-18)

    def test_ssh_gap_and_weak_contact_local_weight(self):
        top = d.run({'model': 'ssh', 'dimerRatio': .5, 'sites': 12,
                     'contactLeft': .05, 'contactRight': .05, 'energy': 0, 'samples': 41})
        e = np.asarray(top['device']['closedEnergies'])
        self.assertEqual(np.sum(np.abs(e) < .05), 2)
        self.assertGreater(top['selection']['ldos'][0], top['selection']['ldos'][5])
        # Endpoint weight alone does not enforce unit transmission.
        self.assertLess(top['selection']['transmission'], .5)

    def test_scan_and_json_are_finite_and_bounded(self):
        r = d.run({'model': 'ssh', 'sites': 40, 'samples': 301, 'energy': 0,
                   'dimerRatio': .1, 'contactLeft': 0, 'contactRight': 0})
        self.assertEqual(len(r['scan']['energies']), 301)
        self.assertEqual(len(r['device']['bonds']), 39)
        self.assertLessEqual(r['checks']['maxTransmission'], 1+1e-10)
        json.dumps(r, allow_nan=False)

    def test_strict_validation(self):
        bad = [{'model': 'arbitrary'}, {'sites': 1}, {'sites': 41}, {'sites': True},
               {'sites': 4.0}, {'samples': 302}, {'samples': 11}, {'eta': 0},
               {'eta': float('nan')}, {'energy': float('inf')}, {'energy': '0'},
               {'hopping': 0}, {'contactLeft': -1}, {'spinDegeneracy': 3},
               {'barrierStart': 12}, {'barrierStart': 11, 'barrierWidth': 2},
               {'energyMin': 2, 'energyMax': -2}, {'dimerRatio': None}]
        for payload in bad:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    d.run(payload)
        for payload in (None, [], 3):
            with self.assertRaises(ValueError):
                d.run(payload)


if __name__ == '__main__':
    unittest.main(verbosity=2)
