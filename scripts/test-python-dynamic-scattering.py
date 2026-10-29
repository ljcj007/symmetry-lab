"""Independent analytic and invariance checks for one-phonon chain scattering."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist/python'))
import dynamic_scattering_lab as d


class DynamicScatteringTests(unittest.TestCase):
    def test_units_from_independent_atomic_constants(self):
        # hbar^2/(2 u)=2.090... meV Angstrom^2; oscillator conversion ~64.65 meV.
        self.assertAlmostEqual(d.ENERGY_FACTOR, 64.65415133595566, places=5)
        self.assertAlmostEqual(d.RECOIL_FACTOR, 2.090079640248361, places=6)
        self.assertAlmostEqual(d.ENERGY_FACTOR**2 / d.RECOIL_FACTOR, 2000, places=10)

    def test_diatomic_analytic_dispersion(self):
        p = d.parameters({'massA': 13, 'massB': 51, 'springIntra': 2.3, 'springInter': .7})
        for q in np.linspace(-math.pi/p['lattice'], math.pi/p['lattice'], 27):
            energies, vectors, matrix = d.chain_modes(p, q)
            total = (p['springIntra']+p['springInter'])*(1/p['massA']+1/p['massB'])
            determinant = 4*p['springIntra']*p['springInter']*math.sin(q*p['lattice']/2)**2/(p['massA']*p['massB'])
            values = np.array([(total-math.sqrt(total**2-4*determinant))/2,
                               (total+math.sqrt(total**2-4*determinant))/2])
            np.testing.assert_allclose((energies/d.ENERGY_FACTOR)**2, values, atol=2e-15)
            np.testing.assert_allclose(matrix@vectors, vectors*values, atol=2e-15)

    def test_acoustic_translation_and_optical_gamma(self):
        p = d.parameters({})
        energies, vectors, matrix = d.chain_modes(p, 0.)
        acoustic = np.sqrt([p['massA'],p['massB']]); acoustic /= np.linalg.norm(acoustic)
        np.testing.assert_allclose(matrix@acoustic, 0, atol=1e-16)
        self.assertEqual(energies[0], 0)
        np.testing.assert_allclose(abs(vectors[:,0]), acoustic, atol=1e-15)
        self.assertAlmostEqual(energies[1],d.ENERGY_FACTOR*math.sqrt(4*(1/23+1/35.45)), places=12)

    def test_monoatomic_folded_dispersion(self):
        p = d.parameters({'massA':20,'massB':20,'springIntra':3,'springInter':3})
        for q in np.linspace(0,math.pi/p['lattice'],9):
            energies,_,_=d.chain_modes(p,q)
            scale=2*d.ENERGY_FACTOR*math.sqrt(3/20)
            np.testing.assert_allclose(energies,[scale*math.sin(q*p['lattice']/4),scale*math.cos(q*p['lattice']/4)],atol=1e-12)

    def test_alternating_zone_extinction_catches_phase_conjugation(self):
        p=d.parameters({'massA':20,'massB':20,'springIntra':3,'springInter':3,'basisFraction':.5})
        reciprocal=2*math.pi/p['lattice']; q=.23*reciprocal
        energies,vectors,_=d.chain_modes(p,q)
        even,_=d.mode_weights(p,q+2*reciprocal,energies,vectors)
        odd,_=d.mode_weights(p,q+reciprocal,energies,vectors)
        self.assertLess(even[1]['bareWeight'],1e-25)
        self.assertLess(odd[0]['bareWeight'],1e-25)
        self.assertGreater(even[0]['bareWeight'],.01)
        self.assertGreater(odd[1]['bareWeight'],.01)

    def test_phonopy_atom_phase_gauge_equivalence(self):
        p=d.parameters({'basisFraction':.37,'scatterA':2,'scatterB':-1.2,'springInter':.8})
        Q=2.1;q=d.fold_q(Q,p['lattice'])
        energies,vectors,matrix=d.chain_modes(p,q)
        tau=np.array([0,p['lattice']*p['basisFraction']]);U=np.diag(np.exp(1j*q*tau))
        atom_matrix=U.conj().T@matrix@U
        atom_vectors=U.conj().T@vectors
        np.testing.assert_allclose(atom_matrix@atom_vectors,atom_vectors*(energies/d.ENERGY_FACTOR)**2,atol=1e-15)
        b=np.array([p['scatterA'],p['scatterB']])/np.sqrt([p['massA'],p['massB']])
        periodic=vectors.conj().T@(b*np.exp(1j*Q*tau))
        atom=atom_vectors.conj().T@(b*np.exp(1j*(Q-q)*tau))
        np.testing.assert_allclose(periodic,atom,atol=1e-15)

    def test_global_phase_and_degenerate_rotation(self):
        p=d.parameters({'massA':20,'massB':20,'springIntra':2,'springInter':2})
        q=-math.pi/p['lattice'];energies,vectors,_=d.chain_modes(p,q)
        groups,error=d.mode_weights(p,q,energies,vectors)
        self.assertEqual(len(groups),1);self.assertEqual(groups[0]['degeneracy'],2)
        rotation=np.array([[1,1j],[1j,1]])/math.sqrt(2)
        changed,_=d.mode_weights(p,q,energies,vectors@rotation)
        self.assertAlmostEqual(groups[0]['bareWeight'],changed[0]['bareWeight'],places=15)
        self.assertLess(error,1e-15)
        q=.31;energies,vectors,_=d.chain_modes(p,q)
        initial,_=d.mode_weights(p,q,energies,vectors)
        changed,_=d.mode_weights(p,q,energies,vectors*np.exp(1j*np.array([.7,2.1])))
        np.testing.assert_allclose([g['bareWeight'] for g in initial],[g['bareWeight'] for g in changed],atol=1e-15)

    def test_mass_weighted_closure_and_weight_scaling(self):
        p=d.parameters({'scatterA':1.3,'scatterB':-2.1});Q=.7
        energies,vectors,_=d.chain_modes(p,Q)
        groups,error=d.mode_weights(p,Q,energies,vectors)
        self.assertLess(error,1e-14)
        expected=Q**2*(1.3**2/p['massA']+2.1**2/p['massB'])
        self.assertAlmostEqual(sum(g['amplitudeStrength'] for g in groups),expected,places=14)
        p['scatterA']*=3;p['scatterB']*=3
        changed,_=d.mode_weights(p,Q,energies,vectors)
        np.testing.assert_allclose([g['bareWeight'] for g in changed],9*np.array([g['bareWeight'] for g in groups]),atol=1e-15)

    def test_bose_detailed_balance_and_low_temperature(self):
        for t in (0,5e-324,1e-12,100,1500):
            n=d.bose(12,t)
            ratio=math.exp(-12/(d.KB_MEV_K*t)) if t>1e-10 else 0
            self.assertAlmostEqual(n/(n+1),ratio,places=15)
        self.assertAlmostEqual(d.bose(12,12/d.KB_MEV_K),1/math.expm1(1),places=15)
        r=d.calculate({'temperature':0,'channel':'antiStokes','qPoints':31,'energyPoints':101})
        self.assertEqual(float(np.max(r['heatmap']['z'])),0)
        json.dumps(r,allow_nan=False)

    def test_transverse_projection_and_gamma_exclusion(self):
        r=d.calculate({'angle':90,'qPoints':31,'energyPoints':101})
        self.assertEqual(np.max(r['heatmap']['z']),0)
        self.assertEqual(r['data']['selection']['QParallel'],0)
        q=2*math.pi/4
        r=d.calculate({'selectedQ':q,'qPoints':31,'energyPoints':101})
        g=r['data']['selection']['groups'][0]
        self.assertTrue(g['excluded']);self.assertEqual(g['energy'],0)
        self.assertIsNone(g['occupation'])
        self.assertEqual(g['stokesWeight'],0)

    def test_time_reversal_q_inversion(self):
        p=d.parameters({'basisFraction':.31,'scatterB':-2,'springInter':.6})
        grid=np.linspace(-60,60,241)
        pos=d._point(p,1.21,grid);neg=d._point(p,-1.21,grid)
        np.testing.assert_allclose(pos['stokes'],neg['stokes'],atol=1e-13)
        np.testing.assert_allclose(pos['antiStokes'],neg['antiStokes'],atol=1e-13)

    def test_gaussian_normalization_and_spectral_integral(self):
        grid=np.linspace(-20,20,20001)
        values=d.gaussian(grid,2,.7)
        area=np.sum((values[:-1]+values[1:])*np.diff(grid)/2)
        self.assertAlmostEqual(float(area),1,places=12)
        p=d.parameters({'energyMin':-50,'energyMax':50,'energyPoints':401})
        r=d.calculate(p)
        c=r['checks']
        self.assertTrue(c['gridResolved']);self.assertLess(c['windowQuadratureError'],1e-10)
        self.assertAlmostEqual(c['windowFraction'],1,places=10)

    def test_sampling_channels_shapes_and_json(self):
        r=d.calculate({});p=r['parameters'];h=r['heatmap']
        self.assertEqual(np.array(h['z']).shape,(p['energyPoints'],p['qPoints']))
        self.assertTrue(r['checks']['passed']);json.dumps(r,allow_nan=False)
        bad=d.calculate({'sigma':.05,'energyPoints':101,'qPoints':31})
        self.assertFalse(bad['checks']['gridResolved'])
        s=r['data']['selection']['spectrum']
        np.testing.assert_allclose(s['selected'],np.array(s['stokes'])+s['antiStokes'],atol=0)

    def test_parameter_validation(self):
        for p in ({'massA':0},{'temperature':float('nan')},{'qPoints':31.5},{'sigma':False},
                  {'channel':'elastic'},{'qMin':1,'qMax':1},{'energyMin':10,'energyMax':0},
                  {'phonopy':{}},{'springInter':0},{'basisFraction':1}):
            with self.subTest(p=p),self.assertRaises(ValueError):d.calculate(p)


if __name__=='__main__':
    unittest.main(verbosity=2)
