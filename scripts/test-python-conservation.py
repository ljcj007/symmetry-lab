"""Independent analytic and covariance checks for finite-spin symmetry lessons."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import conservation_lab as lab


def decode(x):
    return np.array(x['re'])+1j*np.array(x['im'])


class ConservationTests(unittest.TestCase):
    def result(self,**kw):
        return lab.calculate({'points':17,'duration':2,**kw})

    def proof(self,r,key):
        return next(x for x in r['conservation']['proofs'] if x['id']==key)

    def test_isotropic_spectrum_and_all_generators(self):
        r=self.result()
        np.testing.assert_allclose(r['conservation']['degeneracy']['eigenvalues'],[-.75,.25,.25,.25],atol=1e-14)
        self.assertTrue(all(self.proof(r,key)['conserved'] for key in ('sx','sy','sz','s2','energy')))
        self.assertTrue(r['conservation']['degeneracy']['globalSU2'])

    def test_nonzero_term_contributions_cancel(self):
        r=self.result(observable='sx'); proof=self.proof(r,'sx')
        by={x['term']:x for x in proof['contributions']}
        self.assertGreater(by['jy']['norm'],.1)
        self.assertGreater(by['jz']['norm'],.1)
        np.testing.assert_allclose(decode(by['jy']['commutator'])+decode(by['jz']['commutator']),0,atol=1e-14)
        self.assertLess(proof['hamiltonianNorm'],1e-14)

    def test_xxz_conserves_z_not_x(self):
        r=self.result(jz=1.7)
        self.assertTrue(self.proof(r,'sz')['conserved'])
        self.assertFalse(self.proof(r,'sx')['conserved'])
        self.assertFalse(self.proof(r,'sy')['conserved'])

    def test_xyz_pi_rotation_is_not_generator_conservation(self):
        p=lab.parameters({'jx':1,'jy':.4,'jz':1.7}); h,_,q,_=lab.model(p)
        rz=np.diag([-1,1,1,-1]).astype(complex) # exp(-i pi total Sz)
        np.testing.assert_allclose(rz@h-h@rz,0,atol=1e-14)
        self.assertGreater(lab.norm(h@q['sz']-q['sz']@h),.1)
        np.testing.assert_allclose(h@q['s2']-q['s2']@h,0,atol=1e-14)

    def test_field_gradient_breaks_total_spin_squared(self):
        uniform=self.result(fieldZ=.8); gradient=self.result(gradientZ=.8)
        self.assertTrue(self.proof(uniform,'s2')['conserved'])
        self.assertFalse(self.proof(gradient,'s2')['conserved'])
        self.assertTrue(self.proof(gradient,'sz')['conserved'])

    def test_exact_local_dephasing_adjoint(self):
        p=lab.parameters({'gammaPhi':.23});h,_,qs,channels=lab.model(p);cs=[c for _,c in channels]
        for key in ('sx','sy'):
            np.testing.assert_allclose(lab.adjoint(h,cs,qs[key]),-.23*qs[key],atol=1e-14)
        np.testing.assert_allclose(lab.adjoint(h,cs,qs['sz']),0,atol=1e-14)

    def test_exact_relaxation_adjoint(self):
        for mode,n in [('single',1),('pair',2)]:
            p=lab.parameters({'experiment':mode,'gamma1':.4});h,_,q,channels=lab.model(p)
            expected=-.4*(q['sz']+n*np.eye(len(h))/2)
            np.testing.assert_allclose(lab.adjoint(h,[c for _,c in channels],q['sz']),expected,atol=1e-14)

    def test_direct_master_adjoint_duality(self):
        p=lab.parameters({'jx':.4,'jy':.8,'jz':1.2,'fieldX':.2,'gradientZ':.3,'gamma1':.12,'gammaPhi':.21})
        h,_,qs,channels=lab.model(p);cs=[c for _,c in channels]
        rng=np.random.default_rng(192);a=rng.normal(size=(4,4))+1j*rng.normal(size=(4,4));rho=a@a.conj().T;rho/=np.trace(rho)
        drho=-1j*(h@rho-rho@h)
        for c in cs:
            cc=c.conj().T@c;drho+=c@rho@c.conj().T-(cc@rho+rho@cc)/2
        for q in qs.values():
            self.assertLess(abs(np.trace(q@drho)-np.trace(lab.adjoint(h,cs,q)@rho)),1e-13)
        np.testing.assert_allclose(lab.liouvillian(h,cs)@rho.reshape(-1,order='F'),drho.reshape(-1,order='F'),atol=1e-13)

    def test_single_spin_analytic_precession_and_damping(self):
        r=self.result(experiment='single',fieldZ=.7,gammaPhi=.2,gamma1=.3,initialState='plus_x')
        for s in r['conservation']['trajectory']:
            t=s['time'];e=s['expectations'];d=math.exp(-.35*t)
            self.assertAlmostEqual(e['sx'],d*math.cos(.7*t)/2,places=12)
            self.assertAlmostEqual(e['sy'],d*math.sin(.7*t)/2,places=12)
            self.assertAlmostEqual(e['sz'],(math.exp(-.3*t)-1)/2,places=12)

    def test_flat_trajectory_does_not_prove_conservation(self):
        r=self.result(jy=.4,initialState='mixed',observable='sz')
        self.assertFalse(self.proof(r,'sz')['conserved'])
        self.assertLess(max(abs(s['expectations']['sz']) for s in r['conservation']['trajectory']),1e-13)

    def test_kramers_conditions_and_pair_square(self):
        single=self.result(experiment='single')['conservation']['degeneracy']
        field=self.result(experiment='single',fieldZ=.6)['conservation']['degeneracy']
        pair=self.result()['conservation']['degeneracy']
        self.assertEqual(single['timeReversalSquare'],-1);self.assertTrue(single['kramersProtected'])
        self.assertFalse(field['kramersProtected']);self.assertFalse(field['timeReversalSymmetric'])
        np.testing.assert_allclose(field['eigenvalues'],[-.3,.3],atol=1e-14)
        self.assertEqual(pair['timeReversalSquare'],1);self.assertFalse(pair['kramersProtected'])
        self.assertTrue(pair['timeReversalSymmetric'])

    def test_time_reversal_even_without_degeneracy(self):
        r=self.result(jx=.2,jy=.7,jz=1.3)['conservation']['degeneracy']
        self.assertTrue(r['timeReversalSymmetric']);self.assertFalse(r['kramersProtected'])
        self.assertEqual([x['multiplicity'] for x in r['levels']],[1,1,1,1])

    def test_consistent_basis_rotation_with_nontrivial_bath(self):
        r=self.result(jx=.2,jy=.8,jz=-.5,fieldX=.4,fieldZ=.7,gradientZ=.3,gamma1=.2,gammaPhi=.4,basisAngle=73,observable='sy')
        c=r['conservation']['convention']
        for key in ('energyResidual','expectationResidual','stateResidual','adjointResidual','antiunitarySquareResidual','antiunitaryCovarianceResidual'):
            self.assertLess(c[key],2e-12,key)
        self.assertGreater(lab.norm(decode(c['originalHamiltonian'])-decode(c['transformedHamiltonian'])),.1)

    def test_closed_evolution_matches_independent_eigensolution(self):
        args={'jx':.4,'jy':-.2,'jz':.7,'fieldX':.4,'fieldZ':-.3,'initialState':'antiparallel'}
        r=self.result(**args);p=lab.parameters(args);h,*_=lab.model(p);vals,vecs=np.linalg.eigh(h);rho0=lab.initial_density(p)
        for s in r['conservation']['trajectory']:
            u=(vecs*np.exp(-1j*vals*s['time']))@vecs.conj().T
            np.testing.assert_allclose(decode(s['rho']),u@rho0@u.conj().T,atol=2e-13)

    def test_zero_duration_and_sampling_consistency(self):
        r=self.result(duration=0)
        np.testing.assert_allclose(decode(r['conservation']['trajectory'][0]['rho']),decode(r['conservation']['trajectory'][-1]['rho']),atol=1e-14)
        a=self.result(gammaPhi=.2,fieldX=.3,points=17);b=self.result(gammaPhi=.2,fieldX=.3,points=33)
        np.testing.assert_allclose(decode(a['conservation']['trajectory'][-1]['rho']),decode(b['conservation']['trajectory'][-1]['rho']),atol=2e-13)

    def test_validation(self):
        bad=[None,[],{'bogus':1},{'experiment':'x'},{'observable':'unknown'},{'jx':True},{'gamma1':-.1},
             {'fieldX':float('nan')},{'points':2.5},{'basisAngle':181},{'experiment':'single','initialState':'singlet'}]
        for p in bad:
            with self.subTest(p=p),self.assertRaises(ValueError):lab.calculate(p)

    def test_catalog_presets_and_exercises(self):
        c=json.loads((ROOT/'dist/data/conservation-content.json').read_text(encoding='utf-8'))
        self.assertEqual(len(c['lessons']),3);self.assertEqual(sum(len(e['steps']) for e in c['exercises']),12)
        refs={s['id'] for s in c['sources']}
        for lesson in c['lessons']:self.assertTrue(set(lesson['references'])<=refs)
        ids={p['id'] for p in c['module']['presets']}
        for p in c['module']['predictions']:self.assertIn(p['preset'],ids)
        for p in c['module']['presets']:
            r=lab.calculate(p['input']);self.assertTrue(r['checks']['passed'],p['id']);json.dumps(r,allow_nan=False)
        for e in c['exercises']:
            for s in e['steps']:self.assertIn(s['answer'],range(len(s['choices'])))


if __name__=='__main__':unittest.main(verbosity=2)
