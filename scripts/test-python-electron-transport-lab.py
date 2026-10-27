"""Independent moment, Drude-limit, symmetry, SI normalization and input checks."""
import copy
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from electron_transport_lab import run, model_data, transport_moments, fermi_kernel, EV, KB, HBAR


def imported_fixture():
    m = model_data(2, .25, .5, 1., 4., 8, 2)
    return {'schema':'symmetry-lab-electron-transport-1', 'sampling':'full-uniform-bz',
            'dimension':2, 'energyUnit':'eV', 'velocityUnit':'m/s', 'cellMeasure':16,
            'spinDegeneracy':2, 'meshShape':m['meshShape'], 'meshShift':m['meshShift'],
            'kPoints':m['kPoints'].tolist(), 'weights':m['weights'].tolist(),
            'energies':m['energies'].tolist(), 'velocities':m['velocities'].tolist()}


class ElectronTransportTests(unittest.TestCase):
    def test_stable_fermi_function_and_derivative(self):
        x = np.array([-1000., -50., -1., 0., 1., 50., 1000.])
        f, holes, g = fermi_kernel(x)
        np.testing.assert_allclose(f+holes, 1, atol=1e-16)
        np.testing.assert_allclose(g, g[::-1], atol=1e-30)
        self.assertEqual(g[3], .25)
        self.assertEqual(f[0], 1)
        self.assertEqual(f[-1], 0)
        self.assertGreater(g[1], 0, 'Negative-energy derivative must not suffer 1-f cancellation')

    def test_half_filling_particle_hole_symmetry(self):
        r = run({'chemicalPotential':.75, 'muSamples':3})
        self.assertAlmostEqual(r['selection']['fillingPerCell'], 1, places=13)
        np.testing.assert_allclose(r['selection']['seebeckMicroV'], 0, atol=1e-11)
        self.assertLess(r['checks']['occupationSumMaxError'], 1e-13)

    def test_electron_hole_seebeck_sign_and_weight_symmetry(self):
        a = run({'chemicalPotential':.2, 'temperature':600, 'muSamples':3})['selection']
        b = run({'chemicalPotential':1.3, 'temperature':600, 'muSamples':3})['selection']
        self.assertLess(a['seebeckMicroV'][0][0], 0)
        self.assertGreater(b['seebeckMicroV'][0][0], 0)
        np.testing.assert_allclose(a['seebeckMicroV'], -np.array(b['seebeckMicroV']), atol=3e-12)
        self.assertAlmostEqual(a['fillingPerCell']+b['fillingPerCell'], 2, places=13)

    def test_isotropic_tensors_and_positive_heat_conductivity(self):
        r = run({'dimension':3, 'mesh':20, 'anisotropy':1, 'temperature':600, 'muSamples':3})
        s, k = np.array(r['selection']['sigmaOverTau']), np.array(r['selection']['kappaOverTau'])
        np.testing.assert_allclose(np.diag(s), s[0,0], rtol=1e-13)
        self.assertLess(np.max(np.abs(s-np.diag(np.diag(s))))/np.max(s), 1e-14)
        self.assertGreaterEqual(np.min(np.linalg.eigvalsh(k)), 0)

    def test_tau_scales_sigma_and_kappa_but_not_seebeck(self):
        a = run({'tauFs':10, 'muSamples':3})['selection']
        b = run({'tauFs':30, 'muSamples':3})['selection']
        np.testing.assert_allclose(b['sigma'], np.array(a['sigma'])*3, rtol=2e-15)
        np.testing.assert_allclose(b['kappa'], np.array(a['kappa'])*3, rtol=2e-15)
        np.testing.assert_allclose(a['seebeckMicroV'], b['seebeckMicroV'])
        np.testing.assert_allclose(a['sigma'], np.array(a['sigmaOverTau'])*1e-14)
        self.assertIsNone(run({'muSamples':3})['selection']['sigma'])

    def test_2d_sheet_3d_volume_scaling(self):
        for d in [2,3]:
            a = run({'dimension':d,'latticeConstant':4,'mesh':16,'temperature':600,'muSamples':3})
            b = run({'dimension':d,'latticeConstant':8,'mesh':16,'temperature':600,'muSamples':3})
            np.testing.assert_allclose(b['selection']['sigmaOverTau'], np.array(a['selection']['sigmaOverTau'])*2**(2-d), atol=10, rtol=1e-13)
            self.assertAlmostEqual(b['selection']['electronDensity']/a['selection']['electronDensity'], 2**(-d))
            self.assertEqual(a['summary']['normalization'], 'sheet' if d==2 else 'volume')

    def test_spin_factor_counted_once(self):
        a = run({'spinDegeneracy':1,'muSamples':3})['selection']
        b = run({'spinDegeneracy':2,'muSamples':3})['selection']
        self.assertAlmostEqual(b['fillingPerCell'], 2*a['fillingPerCell'])
        np.testing.assert_allclose(b['sigmaOverTau'], 2*np.array(a['sigmaOverTau']))
        np.testing.assert_allclose(b['seebeckMicroV'], a['seebeckMicroV'])

    def test_two_energy_transport_distribution_exact_moments(self):
        de, temp, volume, velocity = .03, 300., 1e-28, 1000.
        data={'dimension':2,'energies':np.array([[-de],[de],[-de],[de]]),
              'velocities':np.array([[[velocity,0]],[[-velocity,0]],[[0,velocity]],[[0,-velocity]]]),
              'weights':np.full(4,.25),'cellMeasureSI':volume,'spin':2}
        r=transport_moments(data,temp,0)
        x=de*EV/(KB*temp)
        g=math.exp(-x)/(1+math.exp(-x))**2
        expected_sigma=2/volume*EV**2*velocity**2*.5*g/(KB*temp)
        np.testing.assert_allclose(r['sigmaOverTau'],np.eye(2)*expected_sigma,rtol=1e-15)
        np.testing.assert_allclose(r['seebeckMicroV'],0,atol=1e-13)
        np.testing.assert_allclose(r['lorenzDiagonal'],[(de/temp)**2]*2,rtol=1e-14)

    def test_classical_parabolic_band_drude_limit(self):
        # Independent continuum parabolic band sampled in a reciprocal cube;
        # no tight-binding energy or velocity helper is used.
        mass, a, n, temp, mu = 9.1093837139e-31, 1e-9, 41, 300., -.2
        k=(np.arange(n)+.5-n/2)*2*math.pi/(n*a)
        ks=np.stack(np.meshgrid(k,k,k,indexing='ij'),axis=-1).reshape(-1,3)
        es=HBAR**2*np.sum(ks**2,axis=1)/(2*mass)/EV
        data={'dimension':3,'energies':es[:,None],'velocities':(HBAR*ks/mass)[:,None,:],
              'weights':np.full(len(ks),1/len(ks)),'cellMeasureSI':a**3,'spin':2}
        r=transport_moments(data,temp,mu)
        drude=r['electronDensity']*EV**2/mass
        self.assertAlmostEqual(r['sigmaOverTau'][0][0]/drude,1,delta=2e-5)
        classical_s=-KB/EV*(2.5-mu*EV/(KB*temp))*1e6
        self.assertAlmostEqual(r['seebeckMicroV'][0][0],classical_s,delta=.03)
        classical_l=2.5*(KB/EV)**2
        self.assertAlmostEqual(r['lorenzDiagonal'][0]/classical_l,1,delta=2e-4)

    def test_low_density_and_singular_direction_return_null(self):
        for mu in [-100, -15, 16.5, 100]:
            # Include nonzero exponential tails whose squared contributions
            # underflow, as well as fully underflowed occupations.
            result=run({'chemicalPotential':mu,'muSamples':3})
            json.dumps(result,allow_nan=False)
            r=result['selection']
            self.assertIsNone(r['seebeckMicroV']);self.assertIsNone(r['kappaOverTau'])
            self.assertTrue(r['diagnostics']['illConditioned'])
        data=model_data(mesh=8)
        data['velocities'][:,:,1]=0
        r=transport_moments(data,600,.5)
        self.assertGreater(r['sigmaOverTau'][0][0],0)
        self.assertIsNone(r['seebeckMicroV'])

    def test_grid_comparison_reports_refinement(self):
        coarse=run({'mesh':8,'temperature':10,'muSamples':3})
        self.assertTrue(coarse['checks']['convergence']['needsRefinement'])
        refined=run({'hopping':.15,'chemicalPotential':.18,'mesh':48,'temperature':300,'muSamples':3})
        self.assertFalse(refined['checks']['convergence']['needsRefinement'])

    def test_import_reproduces_model_moments(self):
        direct=run({'mesh':8,'muSamples':3})
        imported=run({'source':'import','data':imported_fixture(),'muSamples':3})
        np.testing.assert_allclose(direct['selection']['sigmaOverTau'],imported['selection']['sigmaOverTau'],rtol=1e-14)
        np.testing.assert_allclose(direct['selection']['seebeckMicroV'],imported['selection']['seebeckMicroV'],atol=1e-12)
        self.assertFalse(imported['checks']['convergence']['available'])

    def test_import_rejects_path_missing_mesh_wrong_units_and_weights(self):
        for field,value in [('sampling','high-symmetry-path'),('energyUnit','Hartree'),('velocityUnit','eV Angstrom'),
                            ('meshShape',[2,32]),('weights',[1/64]*63+[0]),('weights',[2/64]+[1/64]*63),
                            ('spinDegeneracy',True),('dimension',1)]:
            data=imported_fixture();data[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):run({'source':'import','data':data,'muSamples':3})
        data=imported_fixture();data['kPoints'][1]=data['kPoints'][0]
        with self.assertRaisesRegex(ValueError,'重复'):run({'source':'import','data':data,'muSamples':3})
        data=imported_fixture();del data['velocities']
        with self.assertRaises(ValueError):run({'source':'import','data':data,'muSamples':3})
        for invalid in [True, [[[0]]], float('inf')]:
            data=imported_fixture();data['velocities'][0][0][0]=invalid
            with self.assertRaises(ValueError):run({'source':'import','data':data,'muSamples':3})

    def test_finite_json_and_resource_bounds(self):
        for p in [{'temperature':0},{'dimension':4},{'mesh':122},{'dimension':3,'mesh':52},
                  {'tauFs':0},{'anisotropy':0},{'muSamples':102},{'muMin':2,'muMax':1},
                  {'temperature':True},{'hopping':10**400},{'x':'a'*4_000_001},
                  {'chemicalPotential':float('nan')}]:
            with self.subTest(payload=str(p)[:70]),self.assertRaises(ValueError):run(p)
        json.dumps(run({'chemicalPotential':1000,'muMin':-1000,'muMax':1000,'muSamples':3}),allow_nan=False)

    def test_examples_and_content_presets(self):
        for path in (ROOT/'dist/examples').glob('electron-transport-*.json'):
            json.dumps(run(json.loads(path.read_text(encoding='utf8'))),allow_nan=False)
        content=ROOT/'dist/data/electron-transport-content.json'
        if content.exists():
            doc=json.loads(content.read_text(encoding='utf8'))
            for module in doc['modules']:
                for preset in module['presets']:
                    json.dumps(run(preset['input']),allow_nan=False)


if __name__=='__main__':
    unittest.main(verbosity=2)
