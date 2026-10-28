"""Independent scattering limits and matrix identities for the NS lab."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'dist/python'))
import andreev_lab as a


class AndreevTests(unittest.TestCase):
    def point(self, energy=0., **kw):
        p = a.parameters({'eta': 1e-9, **kw})
        return a.evaluate(energy, p, full=True)

    def test_scalar_retarded_branches_and_dyson(self):
        for z in (-5., -2., -1., 0., .7, 2., 5., .3+1j*.2, -.5+1j*.001):
            for onsite in (0., -.7):
                g = a.lead_surface_green(z, 1., onsite)
                self.assertLessEqual(g.imag, 0.)
                self.assertLess(abs((z-onsite-g)*g-1), 3e-13)
        self.assertAlmostEqual((1e9*a.lead_surface_green(1e9, 1)).real, 1., places=14)

    def test_superconducting_retarded_dyson_and_spectral_positivity(self):
        for mu in (0., .6, 3.):
            h = np.array([[-mu, .15], [.15, mu]])
            hop = -a.TAUZ
            for energy in (-3., -2., -.4, -.1, 0., .1, .4, 2., 3.):
                g = a.superconducting_surface(energy, 1., mu, .15)
                np.testing.assert_allclose((energy*np.eye(2)-h-hop@g@hop)@g, np.eye(2), atol=2e-12)
                self.assertGreaterEqual(np.min(np.linalg.eigvalsh(1j*(g-g.conj().T))), -1e-12)
                if abs(energy)<.15:
                    np.testing.assert_allclose(g, g.conj().T, atol=1e-13)

    def test_surface_matches_independent_finite_chain_inside_gap(self):
        # Direct spectral quadrature of the semi-infinite surface sine states.
        # No call to scalar-resolvent partial-fraction implementation.
        k = np.pi*(np.arange(40000)+.5)/40000
        weight = 2*np.sin(k)**2/40000
        for energy, mu in ((0., 0.), (.09, .4), (-.1, -.7)):
            xi = -mu-2*np.cos(k)
            den = energy**2-xi**2-.15**2
            expected = np.array([[np.sum(weight*(energy+xi)/den), np.sum(weight*.15/den)],
                                 [np.sum(weight*.15/den), np.sum(weight*(energy-xi)/den)]])
            np.testing.assert_allclose(a.superconducting_surface(energy, 1., mu, .15), expected, atol=3e-13)

    def test_normal_limit_matches_single_impurity_formula(self):
        for n in (2, 8, 20):
            for energy in (-1.2, 0., .7):
                for barrier in (0., .5, 2.):
                    out = self.point(energy, sites=n, gap=0, barrier=barrier)
                    transmission = (4-energy**2)/(4-energy**2+barrier**2)
                    self.assertAlmostEqual(out['quasiparticleTransmission'], transmission, delta=1e-7)
                    self.assertEqual(out['andreevReflection'], 0.)
                    self.assertAlmostEqual(out['conductanceQuantum'], 2*transmission, delta=1e-7)

    def test_normal_limit_matches_existing_public_device_contract(self):
        import device_transport_lab as normal
        p = dict(sites=12, hopping=1, chemicalPotential=0, gate=0, barrier=0,
                 barrierStart=6, contactLeft=1, contactRight=1, gap=0, energy=.2, eta=1e-7)
        ns = a.run({**p, 'samples': 41})
        old = normal.run({'sites':12, 'hopping':1, 'leadHopping':1, 'leadOnsite':0,
                          'gate':0, 'barrier':0, 'barrierStart':6, 'barrierWidth':1,
                          'contactLeft':1, 'contactRight':1, 'energy':.2, 'spinDegeneracy':1,
                          'eta':1e-7, 'samples':41})
        # Exactly equal in the zero-regulator limit; the reflection conductance
        # differs from transmitted G only by the explicitly reported absorption.
        self.assertAlmostEqual(ns['selection']['conductanceQuantum']/2,
                               old['selection']['conductanceQuantum']+old['selection']['regulatorAbsorption'], delta=2e-13)

    def test_exact_zero_energy_transparent_lattice_interface(self):
        # Exact matched interface at mu=E=0: RA=4t²/(4t²+Delta²).
        for gap in (.03, .15, .6):
            for n in (2, 9, 32):
                out = self.point(0., sites=n, gap=gap)
                exact = 4/(4+gap*gap)
                self.assertAlmostEqual(out['andreevReflection'], exact, delta=1e-7)
                self.assertAlmostEqual(out['normalReflection'], 1-exact, delta=1e-7)
                self.assertEqual(out['quasiparticleTransmission'], 0.)
                self.assertAlmostEqual(out['conductanceQuantum'], 4*exact, delta=2e-7)

    def test_andreev_small_gap_barrier_limit(self):
        # Beenakker/BTK zero-energy relation for an energy-independent scatterer.
        for barrier in (.5, 1., 2.):
            transmission = 4/(4+barrier*barrier)
            exact = transmission**2/(2-transmission)**2
            out = self.point(0., barrier=barrier, barrierStart=7, gap=1e-5)
            self.assertAlmostEqual(out['andreevReflection'], exact, delta=1e-5)

    def test_flux_and_particle_hole_for_asymmetric_contacts(self):
        for energy in (-.7, -.12, 0., .12, .7):
            kw = {'chemicalPotential':.6, 'gate':.2, 'barrier':1.2,
                  'contactLeft':.4, 'contactRight':.8}
            out = self.point(energy, **kw)
            rev = self.point(-energy, **kw)
            self.assertAlmostEqual(out['normalReflection']+out['andreevReflection']+
                                   out['quasiparticleTransmission']+out['regulatorAbsorption'], 1., delta=1e-12)
            self.assertAlmostEqual(out['normalReflection'], rev['holeNormalReflection'], delta=1e-12)
            self.assertAlmostEqual(out['andreevReflection'], rev['holeAndreevReflection'], delta=1e-12)
            self.assertLess(out['greenSolveResidual'], 1e-12)

    def test_ldos_normal_infinite_chain(self):
        out = self.point(.3, gap=0)
        exact = 1/(math.pi*math.sqrt(4-.3**2))
        np.testing.assert_allclose(out['electronLDOS'], exact, atol=1e-8)
        np.testing.assert_allclose(out['holeLDOS'], exact, atol=1e-8)

    def test_closed_channels_and_missing_contacts(self):
        out = self.point(4.)
        self.assertFalse(out['electronOpen'])
        self.assertIsNone(out['normalReflection'])
        self.assertEqual(out['conductanceQuantum'], 0.)
        for contacts in ({'contactLeft':0}, {'contactRight':0}):
            out = self.point(.1, **contacts)
            self.assertEqual(out['quasiparticleTransmission'], 0.)
            self.assertEqual(out['andreevReflection'], 0.)
            self.assertAlmostEqual(out['normalReflection']+out['regulatorAbsorption'], 1., delta=1e-12)

    def test_one_hole_channel_can_close(self):
        out = self.point(-.4, chemicalPotential=1.8)
        self.assertTrue(out['electronOpen'])
        self.assertFalse(out['holeOpen'])
        self.assertEqual(out['andreevReflection'], 0.)
        self.assertLess(out['fluxResidual'], 1e-12)

    def test_threshold_points_are_missing_not_zero(self):
        result = a.run({'energy':.15, 'gap':.15, 'samples':61, 'energyMin':-.3, 'energyMax':.3})
        self.assertFalse(result['selection']['defined'])
        self.assertIsNone(result['selection']['conductanceQuantum'])
        self.assertEqual(result['selection']['electronLDOS'], [])
        self.assertEqual(result['checks']['undefinedScanPoints'], 2)
        self.assertTrue(result['normalReference']['defined'])
        json.dumps(result, allow_nan=False)

    def test_eta_diagnostic_resolves_physical_limit(self):
        coarse = a.run({'eta':1e-3, 'samples':41})
        fine = a.run({'eta':1e-8, 'samples':41})
        self.assertFalse(coarse['selection']['numericallyResolved'])
        self.assertTrue(fine['selection']['numericallyResolved'])
        self.assertGreater(coarse['selection']['regulatorAbsorption'], fine['selection']['regulatorAbsorption'])
        self.assertLess(coarse['checks']['maxScanFluxResidual'], 1e-10)

    def test_teaching_catalog_presets_and_references(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root/'dist/data/andreev-content.json').read_text(encoding='utf8'))
        self.assertEqual([len(data[k]) for k in ('lessons','exercises','cases')], [3,3,3])
        self.assertEqual(sum(len(e['steps']) for e in data['exercises']), 12)
        presets = {p['id']:p for p in data['modules'][0]['presets']}
        self.assertEqual(len(presets), 5)
        for item in data['lessons']+data['cases']:
            self.assertIn(item['preset'], presets)
        for preset in presets.values():
            result = a.run(preset['input'])
            json.dumps(result, allow_nan=False)
        one, two = presets['andreev-project-normal']['input'], presets['andreev-project-paired']['input']
        self.assertEqual({k:v for k,v in one.items() if k!='gap'}, {k:v for k,v in two.items() if k!='gap'})
        self.assertEqual((one['sites'],one['energy'],one['gap'],two['gap']), (12,.2,0,.3))

    def test_inputs_and_resource_bounds(self):
        invalid = [{'sites':1}, {'sites':33}, {'sites':3.0}, {'sites':True}, {'gap':-1},
                   {'energy':float('nan')}, {'hopping':0}, {'eta':0}, {'barrierStart':10},
                   {'samples':300}, {'energyMin':2, 'energyMax':1}, {'temperature':0},
                   {'spinDegeneracy':2}, {'phase':0}, {'bias':0}, {'soc':0}]
        for payload in invalid:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError): a.parameters(payload)

    def test_public_output_finite_json_and_units(self):
        result = a.run({'sites':12, 'energy':.2, 'gap':.3, 'samples':41})
        json.dumps(result, allow_nan=False)
        self.assertEqual(len(result['scan']['rows']), 41)
        self.assertEqual(len(result['selection']['electronLDOS']), 12)
        self.assertEqual(result['units']['conductanceSiemens'], 'S')
        self.assertLess(result['checks']['maxScanFluxResidual'], 1e-10)
        self.assertEqual(result['checks']['hamiltonianParticleHoleResidual'], 0.)
        self.assertAlmostEqual(result['selection']['conductanceSiemens'],
                               result['selection']['conductanceQuantum']*a.G_QUANTUM, places=18)


if __name__ == '__main__':
    unittest.main(verbosity=2)
