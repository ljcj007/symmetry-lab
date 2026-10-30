from pathlib import Path
import itertools
import json
import math
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from exchange_symmetry_lab import calculate, hamiltonian, antisymmetric, decompose, classical


class ExchangeSymmetryTests(unittest.TestCase):
    def test_dmi_sign_is_cross_product(self):
        a, b, d = np.array([.3, -.7, .1]), np.array([.2, .4, -.3]), np.array([.6, -.2, .7])
        self.assertAlmostEqual(float(a@antisymmetric(d)@b), float(d@np.cross(a,b)))

    def test_input_decomposition_complete(self):
        p = dict(mirrorXY=0,isotropic=.9,anisotropyX=.2,anisotropyY=-.3,
                 symmetricXY=.7,symmetricXZ=-.4,symmetricYZ=.5,dx=.2,dy=-.6,dz=.8)
        r = calculate(p)['exchange']
        j = np.array(r['tensor'])
        np.testing.assert_allclose(j, [[1.1,1.5,.2],[-.1,.6,.7],[-1.,.3,1.0]], atol=1e-12)
        self.assertAlmostEqual(np.trace(r['symmetric']),0)
        np.testing.assert_allclose(r['D'],[.2,-.6,.8])
        self.assertEqual(r['rank'],0)

    def test_midpoint_inversion_removes_all_dmi(self):
        r = calculate(dict(inversion=1,mirrorXY=0,dx=.2,dy=.3,dz=.6,symmetricXY=.4))
        j=np.array(r['exchange']['tensor'])
        np.testing.assert_allclose(j,j.T,atol=1e-12)
        np.testing.assert_allclose(r['exchange']['D'],[0,0,0],atol=1e-12)
        self.assertEqual(r['exchange']['rank'],3)
        self.assertTrue(r['exchange']['constraints'][0]['swapsSites'])

    def test_in_plane_mirror_normal_dmi(self):
        p=dict(mirrorXY=1,dx=.2,dy=.3,dz=.6)
        np.testing.assert_allclose(calculate(p)['exchange']['D'],[0,0,.6],atol=1e-12)
        p.update(mirrorXY=0,mirrorXZ=1)
        np.testing.assert_allclose(calculate(p)['exchange']['D'],[0,.3,0],atol=1e-12)

    def test_perpendicular_mirror_endpoint_exchange(self):
        r=calculate(dict(mirrorXY=0,mirrorYZ=1,dx=.2,dy=.3,dz=.6))
        np.testing.assert_allclose(r['exchange']['D'],[0,.3,.6],atol=1e-12)
        self.assertTrue(r['exchange']['constraints'][0]['swapsSites'])

    def test_fourfold_bond_axis(self):
        r=calculate(dict(mirrorXY=0,rotationOrder=4,dx=.2,dy=.3,dz=.6,anisotropyX=.3,anisotropyY=.7,symmetricYZ=.4))
        j=np.array(r['exchange']['tensor'])
        np.testing.assert_allclose(r['exchange']['D'],[.2,0,0],atol=1e-12)
        self.assertAlmostEqual(j[1,1],j[2,2])
        self.assertAlmostEqual(j[1,2],-j[2,1])
        self.assertEqual(9-r['exchange']['rank'],3)

    def test_generator_closure_and_independent_spin_energy(self):
        rng=np.random.default_rng(218)
        keys=['inversion','mirrorXY','mirrorXZ','mirrorYZ']
        a,b=rng.normal(size=(2,3))
        for flags in itertools.product([0,1],repeat=4):
            for rotation in [0,2,4]:
                p=dict(zip(keys,flags),rotationOrder=rotation,dx=.2,dy=.3,dz=.6,
                       anisotropyX=.3,anisotropyY=.7,symmetricXY=.23,symmetricXZ=-.4,symmetricYZ=.6)
                r=calculate(p)
                j=np.array(r['exchange']['tensor'])
                group=[np.array(g) for g in r['exchange']['closureMatrices']]
                hashes={tuple(g.ravel()) for g in group}
                for g in group:
                    self.assertAlmostEqual(abs(np.linalg.det(g)),1)
                    axial=np.linalg.det(g)*g
                    ag,bg=axial@a,axial@b
                    if g[0,0]<0:ag,bg=bg,ag
                    self.assertAlmostEqual(float(a@j@b),float(ag@j@bg),places=11)
                    for h in group:self.assertIn(tuple((g@h).ravel()),hashes)
                self.assertTrue(r['checks']['passed'])
                json.dumps(r,allow_nan=False)

    def test_isotropic_quantum_singlet_triplet(self):
        r=calculate(dict(dz=0))['exchange']
        np.testing.assert_allclose(r['levels'],[-.75,.25,.25,.25],atol=1e-12)
        np.testing.assert_allclose(r['groundCorrelations'],-np.eye(3)/4,atol=1e-12)
        np.testing.assert_allclose(r['groundSpin1'],[0,0,0],atol=1e-12)
        self.assertEqual(r['groundDegeneracy'],1)

    def test_dmi_quantum_closed_form(self):
        for j,d in [(1,.6),(-1,.8),(.2,-.9),(0,.4)]:
            r=calculate(dict(isotropic=j,dz=d))['exchange']
            expected=sorted([j/4,j/4,-j/4-.5*math.hypot(j,d),-j/4+.5*math.hypot(j,d)])
            np.testing.assert_allclose(r['levels'],expected,atol=1e-12)

    def test_classical_exact_bound_and_canting(self):
        r=calculate({})
        self.assertAlmostEqual(r['classical']['energy'],-math.hypot(1,.6))
        self.assertAlmostEqual(r['classical']['angleDegrees'],math.degrees(math.acos(-1/math.hypot(1,.6))))
        rng=np.random.default_rng(91)
        j=rng.normal(size=(3,3)); c=classical(j)
        a,b=np.array(c['spin1']),np.array(c['spin2'])
        self.assertAlmostEqual(np.linalg.norm(a),1);self.assertAlmostEqual(np.linalg.norm(b),1)
        self.assertLess(np.linalg.norm(j@b-(a@j@b)*a),1e-12)
        self.assertLess(np.linalg.norm(j.T@a-(a@j@b)*b),1e-12)
        for _ in range(100):
            v,w=rng.normal(size=(2,3));v/=np.linalg.norm(v);w/=np.linalg.norm(w)
            self.assertGreaterEqual(float(v@j@w)+1e-12,c['energy'])

    def test_coordinate_and_endpoint_covariance_unitary(self):
        p=dict(mirrorXY=0,dx=.2,dy=.3,dz=.6,anisotropyX=.3,anisotropyY=.7,
               symmetricXY=.23,symmetricXZ=-.4,symmetricYZ=.6,conventionAngle=37)
        swap=np.eye(4)[[0,2,1,3]]
        theta=math.radians(37)
        u=np.kron(np.diag(np.exp(np.array([-1j,1j])*theta/2)),np.diag(np.exp(np.array([-1j,1j])*theta/2)))
        for s in [0,1]:
            r=calculate(dict(p,swapSites=s));j=np.array(r['exchange']['tensor']);converted=np.array(r['convention']['tensor'])
            h=hamiltonian(j)
            if s:h=swap@h@swap
            np.testing.assert_allclose(hamiltonian(converted),u.conj().T@h@u,atol=1e-12)
            q=np.array(r['convention']['rotation'])
            np.testing.assert_allclose(r['convention']['D'],(-1 if s else 1)*q.T@r['exchange']['D'],atol=1e-12)
            self.assertLess(r['convention']['energyResidual'],1e-12)

    def test_degenerate_ground_uses_projector_average(self):
        r=calculate(dict(isotropic=-1,dz=0))['exchange']
        self.assertEqual(r['groundDegeneracy'],3)
        np.testing.assert_allclose(r['groundCorrelations'],np.eye(3)/12,atol=1e-12)
        np.testing.assert_allclose(r['groundSpin1'],[0,0,0],atol=1e-12)
        z=calculate(dict(isotropic=0,dz=0))['exchange']
        self.assertEqual(z['groundDegeneracy'],4)
        np.testing.assert_allclose(z['groundRho']['re'],np.eye(4)/4,atol=1e-12)

    def test_quantum_time_reversal_does_not_claim_kramers(self):
        r=calculate(dict(mirrorXY=0,dx=.3,dy=.7,anisotropyX=.2,anisotropyY=-.1))
        self.assertEqual(r['checks']['twoSpinTimeReversalSquare'],1)
        self.assertLess(r['checks']['timeReversalResidual'],1e-12)
        self.assertTrue(all(v['multiplicity']==1 for v in r['exchange']['multiplets']))

    def test_constraint_proofs_match_reported_operations(self):
        r=calculate(dict(inversion=1,rotationOrder=4))
        raw=np.array(r['exchange']['inputTensor']);j=np.array(r['exchange']['tensor'])
        for proof in r['exchange']['constraints']:
            a=np.array(proof['axialMatrix'])
            expected=a.T@(j.T if proof['swapsSites'] else j)@a
            np.testing.assert_allclose(j,expected,atol=1e-12)
            for relation in proof['relations']:
                labels=['J_'+a+b for a in 'xyz' for b in 'xyz']
                self.assertAlmostEqual(sum(term['factor']*j.flat[labels.index(term['coefficient'])] for term in relation),0)

    def test_invalid_inputs(self):
        for p in [None,[],{'rotationOrder':3},{'inversion':True},{'dx':float('nan')},
                  {'dz':11},{'conventionAngle':181},{'isotropic':'1'},{'typo':0}]:
            with self.subTest(p=p),self.assertRaises(ValueError):calculate(p)

    def test_catalog_presets_and_exercises(self):
        content=json.loads((ROOT/'dist/data/exchange-content.json').read_text(encoding='utf8'))
        module=content['module'];ids={p['id'] for p in module['presets']}
        defaults={f['key']:f['default'] for f in module['fields']}
        self.assertEqual(set(defaults),set(calculate({})['parameters']))
        for p in module['presets']:
            r=calculate(dict(defaults,**p['input']))
            self.assertTrue(r['checks']['passed']);json.dumps(r,allow_nan=False)
        self.assertEqual(len(content['lessons']),3)
        self.assertEqual(sum(len(e['steps']) for e in content['exercises']),12)
        for prediction in module['predictions']:self.assertIn(prediction['preset'],ids)


if __name__=='__main__':unittest.main(verbosity=2)
