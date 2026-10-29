"""Independent small-cluster spectra, fermionic signs and analytic limits."""
import json
import math
from itertools import combinations
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import hubbard_lab as h


def one_particle(sites,boundary,t,delta):
    matrix=np.diag([(-1)**i*delta/2 for i in range(sites)])
    for i in range(sites-1):
        matrix[i,i+1]=matrix[i+1,i]=-t
    if boundary=='periodic' and sites>2:
        matrix[0,-1]=matrix[-1,0]=-t
    return matrix


def jordan_wigner(orbitals,index):
    # Independent full tensor-product construction; binary bit 0 is rightmost.
    z=np.diag([1.,-1.]); c=np.array([[0.,1.],[0.,0.]])
    result=np.array([[1.]])
    for i in reversed(range(orbitals)):
        result=np.kron(result,c if i==index else z if i<index else np.eye(2))
    return result


class HubbardTests(unittest.TestCase):
    def test_full_jordan_wigner_hamiltonian_and_spin_operators(self):
        p=h.parameters({'sites':3,'nUp':2,'nDown':1,'boundary':'periodic',
                        'hopping':.7,'interactionU':3.1,'alternatingPotential':.6})
        c=[jordan_wigner(6,i) for i in range(6)]
        number=[a.T@a for a in c]
        expected=np.zeros((64,64))
        for i,j in [(0,1),(1,2),(2,0)]:
            for off in (0,3):
                expected-=p['hopping']*(c[i+off].T@c[j+off]+c[j+off].T@c[i+off])
        for i in range(3):
            expected+=p['interactionU']*number[i]@number[i+3]
            expected+=(-1)**i*p['alternatingPotential']/2*(number[i]+number[i+3])
        actual,ops=h.hamiltonian(p)
        idx=np.ix_(ops['basis'],ops['basis'])
        np.testing.assert_allclose(actual,expected[idx],atol=1e-14)
        for i in range(3):
            for j in range(3):
                szi=(number[i]-number[i+3])/2; szj=(number[j]-number[j+3])/2
                plusi=c[i].T@c[i+3]; plusj=c[j].T@c[j+3]
                dot=szi@szj+.5*(plusi@plusj.T+plusi.T@plusj)
                np.testing.assert_allclose(ops['spin'][i,j],dot[idx],atol=1e-14)

    def test_noninteracting_entire_spectrum_equals_fermionic_filling(self):
        for sites in (2,3,4):
            for boundary in ('open','periodic'):
                for delta in (0.,.7):
                    single=np.linalg.eigvalsh(one_particle(sites,boundary,.8,delta))
                    for nup in range(sites+1):
                        for ndown in range(sites+1):
                            p=h.parameters({'sites':sites,'nUp':nup,'nDown':ndown,'boundary':boundary,
                                            'hopping':.8,'interactionU':0.,'alternatingPotential':delta})
                            many,_=h.hamiltonian(p)
                            expected=sorted(sum(single[list(u)])+sum(single[list(d)])
                                            for u in combinations(range(sites),nup)
                                            for d in combinations(range(sites),ndown))
                            np.testing.assert_allclose(np.linalg.eigvalsh(many),expected,atol=8e-14)

    def test_two_site_periodic_bond_is_not_counted_twice(self):
        p=h.parameters({})
        one,_=h.hamiltonian(p)
        two,_=h.hamiltonian({**p,'boundary':'periodic'})
        self.assertEqual(h.bonds(2,'periodic'),((0,1),))
        np.testing.assert_array_equal(one,two)
        for size,count in ((3,3),(4,4)):
            self.assertEqual(len(set(h.bonds(size,'periodic'))),count)

    def test_periodic_two_fermions_have_exchange_sign(self):
        p=h.parameters({'sites':3,'nUp':2,'nDown':0,'interactionU':0,'boundary':'periodic'})
        matrix,_=h.hamiltonian(p)
        # Ring one-particle levels (-2,1,1); Pauli filling gives (-1,-1,2).
        # Treating the particles as signless hard-core bosons gives the wrong set.
        np.testing.assert_allclose(np.linalg.eigvalsh(matrix),[-1,-1,2],atol=1e-14)

    def test_atomic_limit_diagonal_spectrum_and_equal_degenerate_ensemble(self):
        p=h.parameters({'hopping':0,'interactionU':4})
        r=h.sector_result(p)
        np.testing.assert_array_equal(r['eigenvalues'],[0,0,4,4])
        self.assertEqual(r['ground']['degeneracy'],2)
        np.testing.assert_allclose(r['ground']['density'],[1,1],atol=1e-14)
        np.testing.assert_array_equal(r['ground']['doubleOccupancy'],[0,0])
        self.assertAlmostEqual(r['ground']['spinCorrelations'][0][1],-.25)
        self.assertAlmostEqual(r['ground']['totalSpinSquared'],1)
        self.assertEqual(h.dimer_singlet_triplet(p)['gap'],0.)
        # The next *distinct* energy in fixed Sz=0 is U, not the zero S/T split.
        self.assertEqual(r['sectorGap'],4.)

    def test_atomic_ionic_energy_counting(self):
        p=h.parameters({'sites':4,'nUp':2,'nDown':1,'hopping':0,
                        'interactionU':3,'alternatingPotential':1.4})
        expected=[]
        for up in combinations(range(4),2):
            for down in combinations(range(4),1):
                expected.append(3*len(set(up)&set(down))+.7*sum((-1)**i for i in up+down))
        np.testing.assert_allclose(h.sector_result(p)['eigenvalues'],sorted(expected),atol=1e-14)

    def test_dimer_exact_energy_double_occupancy_and_spin_correlations(self):
        for u in (0.,1.,4.,20.):
            for t in (.3,1.):
                p=h.parameters({'hopping':t,'interactionU':u})
                g=h.sector_result(p)['ground']; d=h.dimer_singlet_triplet(p)
                root=math.sqrt(u*u+16*t*t)
                e=(u-root)/2; double=(1-u/root)/2
                self.assertAlmostEqual(g['energy'],e,places=12)
                self.assertAlmostEqual(g['totalDoubleOccupancy'],double,places=12)
                self.assertAlmostEqual(g['spinCorrelations'][0][1],-.75*(1-double),places=12)
                self.assertAlmostEqual(g['totalSpinSquared'],0,places=12)
                self.assertAlmostEqual(d['gap'],-e,places=12)
                self.assertAlmostEqual(d['tripletEnergy'],0,places=12)

    def test_large_u_superexchange_is_asymptotic_not_equal(self):
        p=h.parameters({'hopping':.2,'interactionU':20})
        d=h.dimer_singlet_triplet(p)
        estimate=4*.2**2/20
        self.assertTrue(d['estimateApplicable'])
        self.assertLess(d['gap'],estimate)
        self.assertAlmostEqual(d['gap']/estimate,1,delta=.0005)
        self.assertFalse(h.dimer_singlet_triplet(h.parameters({}))['estimateApplicable'])

    def test_ionic_dimer_against_independent_three_by_three_singlet_matrix(self):
        for delta in (-6.,.7,6.):
            p=h.parameters({'alternatingPotential':delta,'hopping':.8,'interactionU':4.})
            # Basis: double at site 0, singly occupied singlet, double at site 1.
            coupling=-math.sqrt(2)*.8
            singlet=np.array([[4+delta,coupling,0.],[coupling,0.,coupling],[0.,coupling,4-delta]])
            expected=np.linalg.eigvalsh(singlet)[0]
            d=h.dimer_singlet_triplet(p)
            self.assertAlmostEqual(d['singletEnergy'],expected,places=12)
            self.assertAlmostEqual(d['gap'],-expected,places=12)
            self.assertIsNone(d['symmetricExactGap'])
            self.assertFalse(d['estimateApplicable'])

    def test_singlet_triplet_result_does_not_depend_on_selected_sz(self):
        base=h.parameters({'nUp':1,'nDown':1})
        polarized={**base,'nUp':2,'nDown':0}
        r=h.sector_result(polarized)
        self.assertEqual(r['ground']['energy'],0.)
        self.assertEqual(r['ground']['totalSpinSquared'],2.)
        self.assertIsNone(r['sectorGap'])
        gp=h.gaps(polarized,r)
        self.assertAlmostEqual(gp['dimerSingletTriplet']['gap'],h.dimer_singlet_triplet(base)['gap'],places=14)
        self.assertGreater(gp['selectedGroundAboveGlobal'],.8)

    def test_charge_gap_minimizes_all_sz_and_has_finite_size_gap_at_u_zero(self):
        for nup,ndown in ((1,1),(2,0),(0,2)):
            p=h.parameters({'interactionU':0,'nUp':nup,'nDown':ndown})
            g=h.gaps(p,h.sector_result(p))
            self.assertAlmostEqual(g['totalNumberGround']['energy'],-2.)
            self.assertAlmostEqual(g['chargeGap'],2.)
        for nup,ndown in ((0,0),(2,2)):
            p=h.parameters({'nUp':nup,'nDown':ndown})
            self.assertIsNone(h.gaps(p,h.sector_result(p))['chargeGap'])

    def test_hellmann_feynman_and_spin_sum_rules(self):
        p=h.parameters({'sites':4,'nUp':2,'nDown':2,'interactionU':3.2,'alternatingPotential':.7})
        r=h.sector_result(p);g=r['ground'];eps=1e-5
        for parameter,expected in [('interactionU',g['totalDoubleOccupancy']),
                                   ('alternatingPotential',sum((-1)**i*v/2 for i,v in enumerate(g['density'])))]:
            plus=h.sector_result({**p,parameter:p[parameter]+eps})['ground']['energy']
            minus=h.sector_result({**p,parameter:p[parameter]-eps})['ground']['energy']
            self.assertAlmostEqual((plus-minus)/(2*eps),expected,delta=2e-9)
        self.assertAlmostEqual(np.array(g['spinCorrelations']).sum(),g['totalSpinSquared'],places=12)
        np.testing.assert_allclose(np.diag(g['spinCorrelations']),
                                   .75*(np.array(g['density'])-2*np.array(g['doubleOccupancy'])),atol=1e-13)

    def test_spin_exchange_invariance_and_complete_sector_levels(self):
        p=h.parameters({'sites':4,'nUp':2,'nDown':1,'interactionU':2.1,'alternatingPotential':.3,'boundary':'periodic'})
        first=h.sector_result(p);second=h.sector_result({**p,'nUp':1,'nDown':2})
        np.testing.assert_allclose(first['eigenvalues'],second['eigenvalues'],atol=1e-13)
        np.testing.assert_allclose(first['ground']['density'],second['ground']['density'],atol=1e-13)
        np.testing.assert_allclose(first['ground']['localSz'],-np.array(second['ground']['localSz']),atol=1e-13)
        self.assertEqual(sum(g['degeneracy'] for g in first['levels']),24)

    def test_public_contract_bounds_finite_json_and_scan(self):
        for payload in ({},{'sites':4,'nUp':2,'nDown':2,'boundary':'periodic','scanPoints':41},
                        {'nUp':0,'nDown':0},{'nUp':2,'nDown':2},{'hopping':1e-323,'interactionU':0,'scanMaxU':0}):
            r=h.calculate(payload)
            json.dumps(r,allow_nan=False)
            self.assertTrue(r['checks']['passed'])
            self.assertLessEqual(r['sector']['dimension'],36)
            self.assertEqual(len(r['scan']),r['parameters']['scanPoints'] if r['parameters']['scanMaxU'] else 1)
            for plot in r['plots']:
                self.assertTrue(plot['xLabel']);self.assertTrue(plot['yLabel'])
                self.assertTrue(all(len(s['points'])==len(r['scan']) for s in plot['series']))
            for table in r['tables']:
                self.assertTrue(all(len(row)==len(table['columns']) for row in table['rows']))

    def test_invalid_inputs_are_rejected(self):
        for payload in ([],{'sites':1},{'sites':5},{'sites':2.5},{'nUp':3},{'nDown':-1},
                        {'nUp':True},{'interactionU':-1},{'hopping':float('nan')},
                        {'boundary':'twisted'},{'scanPoints':10},{'scanMaxU':31},{'temperature':0}):
            with self.subTest(payload=payload),self.assertRaises(ValueError):
                h.calculate(payload)

    def test_teaching_catalog_and_presets(self):
        data=json.loads((ROOT/'dist/data/hubbard-content.json').read_text(encoding='utf8'))
        self.assertEqual(data['module']['id'],'hubbard')
        self.assertEqual(data['module']['action'],'hubbard_lab')
        self.assertGreaterEqual(len(data['lessons']),3)
        self.assertGreaterEqual(len(data['cases']),3)
        self.assertGreaterEqual(len(data['exercises']),3)
        for exercise in data['exercises']:
            self.assertEqual(len(exercise['steps']),4)
        presets={p['id']:p for p in data['module']['presets']}
        self.assertGreaterEqual(len(presets),3)
        for preset in presets.values():
            r=h.calculate(preset['input'])
            self.assertTrue(r['checks']['passed'])
            json.dumps(r,allow_nan=False)
        for item in data['lessons']+data['cases']:
            self.assertIn(item['preset'],presets)


if __name__=='__main__':
    unittest.main(verbosity=2)
