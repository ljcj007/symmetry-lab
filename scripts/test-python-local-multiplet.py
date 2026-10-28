"""Independent Fock identities, analytic atomic multiplets and spin limits."""
import itertools
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from local_multiplet_lab import run, spectrum, apply_fermions, block_operators, orbital_energies


class LocalMultipletTests(unittest.TestCase):
    def test_fermion_canonical_anticommutators(self):
        def action(state,ops):
            out=apply_fermions(state,ops)
            return {} if out is None else {out[0]:out[1]}
        for state in range(1024):
            for i,j in [(0,0),(3,3),(9,9),(0,9),(1,4),(6,2)]:
                terms=action(state,[(False,i),(True,j)])
                for key,value in action(state,[(True,j),(False,i)]).items():
                    terms[key]=terms.get(key,0)+value
                terms={k:v for k,v in terms.items() if v}
                self.assertEqual(terms,{state:1} if i==j else {})

    def test_all_fixed_n_dimensions_and_spin_commutators(self):
        for n in range(11):
            groups,ground,checks=spectrum(n,'octahedral',1.31,4,.61)
            self.assertEqual(sum(g['degeneracy'] for g in groups),math.comb(10,n))
            self.assertEqual(checks['dimension'],math.comb(10,n))
            self.assertLessEqual(checks['maxBlockDimension'],100)
            for key in ['hermiticityResidual','spinCommutatorResidual','eigenResidual','spinResidual','occupationResidual','multipletCountResidual']:
                self.assertLess(checks[key],1e-9,(n,key,checks[key]))
            for g in groups:
                self.assertAlmostEqual(sum(g['orbitalOccupations']),n)
                self.assertTrue(all(-1e-10<=x<=2+1e-10 for x in g['orbitalOccupations']))
                self.assertAlmostEqual(g['S2'],g['spin']*(g['spin']+1))
                self.assertAlmostEqual(g['spinMultiplets'],round(g['spinMultiplets']))

    def test_empty_and_full_atomic_limits(self):
        empty,_,_=spectrum(0,'tetrahedral',5,4,.6)
        full,ground,_=spectrum(10,'octahedral',7,4,.6)
        self.assertEqual(len(empty),1)
        self.assertEqual(empty[0]['energy'],0)
        self.assertEqual(empty[0]['spin'],0)
        self.assertEqual(empty[0]['orbitalOccupations'],[0]*5)
        self.assertEqual(len(full),1)
        self.assertAlmostEqual(full[0]['energy'],45*4-100*.6)
        self.assertEqual(full[0]['orbitalOccupations'],[2]*5)
        self.assertEqual(full[0]['spin'],0)
        self.assertIsNone(ground['gap'])

    def test_single_electron_cubic_levels_and_hole_correspondence(self):
        for coord,expected,degs in [('octahedral',[-.8,1.2],[6,4]),('tetrahedral',[-1.2,.8],[4,6])]:
            groups,_,_=spectrum(1,coord,2,4,.6)
            np.testing.assert_allclose([g['energy'] for g in groups],expected)
            self.assertEqual([g['degeneracy'] for g in groups],degs)
            self.assertTrue(all(g['spin']==.5 for g in groups))
            holes,_,_=spectrum(9,coord,2,4,.6)
            np.testing.assert_allclose([g['energy'] for g in holes],sorted(36*4-80*.6-np.array(expected)))

    def test_two_electron_analytic_five_orbital_kanamori_spectrum(self):
        # Ten antisymmetric orbital pairs times triplet =30; fourteen singlets
        # at U-J; the equal-amplitude doublon singlet at U+(M-1)J.
        u,j=4,.6
        groups,_,_=spectrum(2,'octahedral',0,u,j)
        np.testing.assert_allclose([g['energy'] for g in groups],[u-3*j,u-j,u+4*j],atol=1e-12)
        self.assertEqual([g['degeneracy'] for g in groups],[30,14,1])
        self.assertEqual([g['spin'] for g in groups],[1,0,0])
        for g in groups:
            np.testing.assert_allclose(g['orbitalOccupations'],[.4]*5,atol=1e-12)

    def test_pair_hopping_equal_amplitude_doublon_state(self):
        basis,occ,jmat,s2=block_operators(1,1)
        state=np.array([1/math.sqrt(5) if s in [3<<(2*m) for m in range(5)] else 0 for s in basis])
        np.testing.assert_allclose(jmat@state,4*state,atol=1e-14)
        np.testing.assert_allclose(s2@state,0,atol=1e-14)
        # Orthogonal doublon combinations have J coefficient -1.
        v=np.zeros(len(basis));v[basis.index(3)]=1/math.sqrt(2);v[basis.index(12)]=-1/math.sqrt(2)
        np.testing.assert_allclose(jmat@v,-v,atol=1e-14)

    def test_spin_flip_restores_triplet_partner(self):
        basis,_,jmat,s2=block_operators(1,1)
        # Construct S^- acting on the |m up,n up> determinant using the
        # physical lowering operator, not an assumed basis-vector phase.
        both_up=(1<<0)|(1<<2)
        v=np.zeros(len(basis))
        for m in range(5):
            result=apply_fermions(both_up,[(True,2*m+1),(False,2*m)])
            if result is not None:v[basis.index(result[0])]+=result[1]/math.sqrt(2)
        np.testing.assert_allclose(s2@v,2*v,atol=1e-14)
        np.testing.assert_allclose(jmat@v,-3*v,atol=1e-14)

    def test_noninteracting_many_electron_spectrum_by_combinations(self):
        energies=np.repeat(orbital_energies('octahedral',1.7),2)
        for n in [2,4,6]:
            expected=sorted(sum(energies[list(ids)]) for ids in itertools.combinations(range(10),n))
            groups,_,_=spectrum(n,'octahedral',1.7,0,0)
            actual=sorted(g['energy'] for g in groups for _ in range(g['degeneracy']))
            np.testing.assert_allclose(actual,expected,atol=1e-12)

    def test_fixed_n_u_is_only_common_shift(self):
        first,ground1,_=spectrum(6,'octahedral',2.3,4,.6)
        second,ground2,_=spectrum(6,'octahedral',2.3,5.1,.6)
        self.assertEqual(len(first),len(second))
        for a,b in zip(first,second):
            self.assertAlmostEqual(b['energy']-a['energy'],1.1*15)
            self.assertAlmostEqual(a['relativeEnergy'],b['relativeEnergy'])
            self.assertEqual(a['spin'],b['spin'])
            np.testing.assert_allclose(a['orbitalOccupations'],b['orbitalOccupations'])
        self.assertEqual(ground1['spins'],ground2['spins'])

    def test_d6_high_and_low_spin_limits(self):
        _,high,_=spectrum(6,'octahedral',.5,4,.6)
        _,low,_=spectrum(6,'octahedral',6,4,.6)
        self.assertEqual(high['spins'],[2.])
        self.assertAlmostEqual(high['S2'],6)
        self.assertEqual(low['spins'],[0.])
        self.assertAlmostEqual(low['S2'],0)
        self.assertGreater(sum(low['orbitalOccupations'][:3]),5.9)
        _,jzero,_=spectrum(6,'octahedral',6,0,0)
        np.testing.assert_allclose(jzero['orbitalOccupations'],[2,2,2,0,0],atol=1e-14)

    def test_d8_octahedral_background(self):
        _,ground,_=spectrum(8,'octahedral',1,4,.6)
        self.assertEqual(ground['spins'],[1.])
        self.assertAlmostEqual(ground['S2'],2)
        np.testing.assert_allclose(ground['orbitalOccupations'],[2,2,2,1,1],atol=1e-12)

    def test_accidental_degeneracies_keep_distinct_spin_sectors(self):
        groups,ground,_=spectrum(6,'octahedral',0,0,0)
        self.assertEqual(ground['degeneracy'],210)
        self.assertEqual(ground['spins'],[0,1,2])
        self.assertEqual(len(groups),3)
        self.assertTrue(all(g['relativeEnergy']==0 for g in groups))
        self.assertTrue(0<ground['S2']<6)

    def test_scan_selection_and_pure_json(self):
        result=run({'electrons':6,'splitting':1.13,'scanMax':5,'scanPoints':7})
        self.assertIn(1.13,result['scan']['splittings'])
        row=next(x for x in result['scan']['rows'] if x['splitting']==1.13)
        self.assertEqual(row['spins'],result['ground']['spins'])
        self.assertEqual(row['relativeEnergy'],0)
        self.assertTrue(result['checks']['passed'])
        self.assertEqual(result['selection'],result['groups'][0])
        json.dumps(result,allow_nan=False)

    def test_content_presets_and_examples_share_valid_contract(self):
        root=Path(__file__).resolve().parents[1]
        content=json.loads((root/'dist/data/local-multiplet-content.json').read_text(encoding='utf8'))
        presets=content['modules'][0]['presets']
        self.assertEqual(len(content['lessons']),3)
        self.assertEqual(len(content['exercises']),3)
        self.assertEqual(len(content['cases']),3)
        for preset in presets:
            result=run(preset['input'])
            self.assertTrue(result['checks']['passed'],preset['id'])
            json.dumps(result,allow_nan=False)
        for path in (root/'dist/examples').glob('local-multiplet-*.json'):
            self.assertIn(json.loads(path.read_text(encoding='utf8')),[p['input'] for p in presets])
        for exercise in content['exercises']:
            self.assertEqual(len(exercise['steps']),4)
            for step in exercise['steps']:
                self.assertTrue(0<=step['answer']<len(step['choices']))

    def test_selected_group_bounds_and_unsupported_physics(self):
        for value in [{'selectedGroup':251},{'soc':.1},{'electrons':0,'selectedGroup':1},{'coordination':'square-planar'}]:
            with self.assertRaises(ValueError):run(value)

    def test_invalid_and_unbounded_inputs(self):
        for key in ['splitting','coulombU','hundJ','scanMax']:
            for value in [True,float('nan'),float('inf'),-1,'1',None]:
                with self.subTest(key=key,value=value),self.assertRaises(ValueError):run({key:value})
        for key,value in [('electrons',11),('electrons',2.),('scanPoints',42),('scanPoints',2),('scanPoints',3.),('selectedGroup',.2),('hundJ',2.1),('splitting',11),('coulombU',21),('scanMax',11)]:
            with self.subTest(key=key,value=value),self.assertRaises(ValueError):run({key:value})
        with self.assertRaises(ValueError):run({'coulombU':1,'hundJ':.6})
        with self.assertRaises(ValueError):run([])


if __name__=='__main__':unittest.main(verbosity=2)
