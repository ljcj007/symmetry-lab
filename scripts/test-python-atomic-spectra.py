"""Independent limits and sum rules for atomic Slater/SOC/polarized XAS."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'dist/python'))
import atomic_spectra_lab as a


class AtomicSpectraTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.default=a.run({})

    def test_wigner_against_independent_sympy(self):
        from sympy.physics.wigner import wigner_3j
        for l,lp in [(2,2),(1,1),(2,1),(1,2)]:
            for k in range(5):
                for m in range(-l,l+1):
                    for mp in range(-lp,lp+1):
                        q=m-mp
                        if abs(q)<=k:
                            self.assertAlmostEqual(a.wigner3j(l,k,lp,-m,q,mp),float(wigner_3j(l,k,lp,-m,q,mp)),places=13)

    def test_rank_zero_and_dipole_parity(self):
        for l in (1,2):
            for m in range(-l,l+1):
                for mp in range(-l,l+1):
                    self.assertAlmostEqual(a.spherical_element(l,m,0,0,l,mp),float(m==mp),places=14)
                    for q in (-1,0,1):
                        self.assertEqual(a.spherical_element(l,m,1,q,l,mp),0)
        for md in range(-2,3):
            for mp in range(-1,2):
                for q in (-1,0,1):
                    if md!=mp+q:
                        self.assertEqual(a.spherical_element(2,md,1,q,1,mp),0)

    def test_known_d2_racah_terms_and_degeneracies(self):
        # Analytic free-ion d2 energies: 3F,3P,1D,1G,1S.
        f0,f2,f4=4.,10.,6.
        _,op=a.configuration_operators(2,0)
        h=f0*op['F0']+f2*op['F2']+f4*op['F4']
        expected=[(f0-8*f2/49-f4/49,21,12,2),
                  (f0+f2/7-4*f4/21,9,2,2),
                  (f0-3*f2/49+4*f4/49,5,6,0),
                  (f0+4*f2/49+f4/441,9,20,0),
                  (f0+2*(f2+f4)/7,1,0,0)]
        energies,v=np.linalg.eigh(h)
        for energy,deg,l2,s2 in expected:
            ix=np.flatnonzero(abs(energies-energy)<1e-10)
            self.assertEqual(len(ix),deg)
            np.testing.assert_allclose(a._expect(op['L2'],v[:,ix]),l2,atol=2e-12)
            np.testing.assert_allclose(a._expect(op['S2'],v[:,ix]),s2,atol=2e-12)

    def test_hole_equivalence_d8_d2(self):
        def relative(nd):
            _,op=a.configuration_operators(nd,0)
            e=np.linalg.eigvalsh(10*op['F2']+6*op['F4'])
            return e-e[0]
        np.testing.assert_allclose(relative(8),relative(2),atol=3e-13)

    def test_monopole_counts(self):
        for nd,npc in [(8,6),(9,5),(9,6),(10,5)]:
            b,op=a.configuration_operators(nd,npc)
            eye=np.eye(len(b))
            np.testing.assert_allclose(op['F0'],nd*(nd-1)/2*eye,atol=1e-12)
            np.testing.assert_allclose(op['pdF0'],nd*npc*eye,atol=1e-12)

    def test_every_coulomb_term_rotational_and_spin_invariant(self):
        _,op=a.configuration_operators(9,5)
        for key in a.COULOMB_KEYS:
            h=op[key]
            np.testing.assert_allclose(h,h.conj().T,atol=1e-13)
            for label in ('Lx','Ly','Lz','Sx','Sy','Sz'):
                g=op[label+'d']+op[label+'p']
                np.testing.assert_allclose(h@g,g@h,atol=1e-12)

    def test_core_and_valence_hole_soc_sign(self):
        _,op=a.configuration_operators(10,5)
        e=np.linalg.eigvalsh(op['socP'])
        np.testing.assert_allclose(e,[-.5]*4+[1]*2,atol=1e-14)
        _,op=a.configuration_operators(9,6)
        e=np.linalg.eigvalsh(op['socD'])
        np.testing.assert_allclose(e,[-1]*6+[1.5]*4,atol=1e-14)

    def test_dipole_completeness_for_every_initial_state(self):
        for nd in (8,9):
            ds=a.dipole_operators(nd)
            closure=sum(d.conj().T@d for d in ds.values())
            np.testing.assert_allclose(closure,.4*(10-nd)*np.eye(len(closure)),atol=1e-14)

    def test_closed_d_shell_final_core_branching_ratio(self):
        p={k:0 for k in a.COULOMB_KEYS}
        p.update(configuration='d9',socD=0,socP=10,tenDq=0,tetragonal=0,temperature=0)
        r=a.run(p)
        self.assertEqual([g['degeneracy'] for g in r['finalLevels']],[4,2])
        np.testing.assert_allclose([g['energy'] for g in r['finalLevels']],[-5,10],atol=1e-13)
        lines=sorted(r['transitions'],key=lambda row:row['energy'])
        self.assertEqual(len(lines),2)
        self.assertAlmostEqual(lines[0]['strength']/lines[1]['strength'],2,places=12)

    def test_cubic_zero_field_isotropic_and_time_reversal(self):
        r=self.default
        for name in ('y','z','plus','minus','isotropic'):
            np.testing.assert_allclose(r['spectrum']['x'],r['spectrum'][name],atol=5e-12)
        self.assertLess(r['checks']['zeroFieldCircularDifference'],1e-11)
        self.assertAlmostEqual(sum(r['ground']['orbitalOccupations']),8,places=12)

    def test_axial_dichroism_and_linear_angle(self):
        x=a.run({'tetragonal':.3,'polarization':'x'})
        z=a.run({'tetragonal':.3,'polarization':'z'})
        angle=a.run({'tetragonal':.3,'polarization':'linear','polarizationAngle':45})
        self.assertGreater(np.max(abs(np.array(x['spectrum']['xld']))),.001)
        np.testing.assert_allclose(angle['spectrum']['selected'],
                                   (np.array(x['spectrum']['selected'])+np.array(z['spectrum']['selected']))/2,atol=5e-12)
        np.testing.assert_allclose(x['spectrum']['xmcd'],0,atol=5e-12)

    def test_field_reversal_interchanges_circular_polarizations(self):
        pos=a.run({'fieldTesla':20,'temperature':2,'polarization':'plus'})
        neg=a.run({'fieldTesla':-20,'temperature':2,'polarization':'minus'})
        np.testing.assert_allclose(pos['spectrum']['selected'],neg['spectrum']['selected'],atol=2e-11)
        self.assertGreater(np.max(abs(np.array(pos['spectrum']['xmcd']))),.005)
        self.assertAlmostEqual(pos['thermal']['magneticMomentMuB'],-neg['thermal']['magneticMomentMuB'],places=9)

    def test_f0_recalibration_and_full_slater_f4_effect(self):
        changed=a.run({'F0':15,'pdF0':20})
        np.testing.assert_allclose(self.default['spectrum']['selected'],changed['spectrum']['selected'],atol=2e-11)
        changed=a.run({'F4':1})
        self.assertGreater(abs(self.default['initialLevels'][-1]['energy']-changed['initialLevels'][-1]['energy']),.1)

    def test_boltzmann_and_degenerate_trace(self):
        e=np.array([0,0,.1]);w=a._weights(e,0)
        np.testing.assert_array_equal(w,[.5,.5,0])
        w=a._weights(e,1000)
        self.assertAlmostEqual(w[2]/w[0],math.exp(-.1/(a.KB*1000)),places=14)
        warm=a.run({'temperature':2000})
        self.assertAlmostEqual(sum(g['population'] for g in warm['initialLevels']),1,places=12)
        self.assertGreater(1-warm['initialLevels'][0]['population'],.001)

    def test_boltzmann_uses_degenerate_group_energy_at_positive_temperature(self):
        energies=np.array([0.,2e-13,4e-13,.1,.1+1e-12])
        for temperature in (1e-10,1000.):
            w=a._weights(energies,temperature)
            self.assertEqual(w[0],w[1]); self.assertEqual(w[1],w[2])
            self.assertEqual(w[3],w[4])
            self.assertAlmostEqual(w.sum(),1,places=14)
        centers=[np.mean(energies[:3]),np.mean(energies[3:])]
        w=a._weights(energies,1000.)
        self.assertAlmostEqual(w[3]/w[0],math.exp(-(centers[1]-centers[0])/(a.KB*1000)),places=14)

    def test_extreme_low_temperature_preserves_zero_field_time_reversal(self):
        for configuration in ('d8','d9'):
            reference=a.run({'configuration':configuration,'temperature':0.,'samples':101})
            for temperature in (1e-8,1e-10,1e-300,1e-323):
                with self.subTest(configuration=configuration,temperature=temperature), np.errstate(all='raise'):
                    r=a.run({'configuration':configuration,'temperature':temperature,'samples':101})
                    json.dumps(r,allow_nan=False)
                    self.assertTrue(r['checks']['passed'])
                    self.assertLess(r['checks']['zeroFieldCircularDifference'],1e-10)
                    self.assertLess(abs(r['thermal']['Sz']),1e-10)
                    self.assertLess(abs(r['thermal']['Lz']),1e-10)
                    self.assertAlmostEqual(r['checks']['populationSum'],1,places=14)
                    np.testing.assert_allclose(r['spectrum']['selected'],reference['spectrum']['selected'],atol=1e-12)

    def test_positive_spectra_linewidth_and_finite_window(self):
        r=self.default
        for key in ('selected','x','y','z','plus','minus','isotropic'):
            self.assertGreaterEqual(min(r['spectrum'][key]),0)
        c=r['checks']
        self.assertLess(c['windowQuadratureDifference'],1e-6)
        self.assertGreater(c['selectedIntegratedStrength'],c['exactWindowStrength'])
        narrow=a.run({'width':.02,'samples':101})
        self.assertFalse(narrow['checks']['gridResolved'])

    def test_input_validation_and_pure_json(self):
        json.dumps(self.default,allow_nan=False)
        for p in ({'configuration':'d6'},{'temperature':float('nan')},{'socD':-1},{'width':0},
                  {'samples':101.5},{'F2':True},{'energyMin':20,'energyMax':10},{'polarization':'bad'},
                  {'rixs':True},{'configuration':[]}):
            with self.subTest(p=p),self.assertRaises(ValueError):
                a.run(p)
        self.assertTrue(self.default['checks']['passed'])


if __name__=='__main__':
    unittest.main(verbosity=2)
