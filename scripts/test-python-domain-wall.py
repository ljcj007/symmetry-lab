"""Independent variational, continuum and finite-chain checks for domain walls."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import domain_wall_lab as d


def energy(field,dx,k,b,v):
    return k/(2*dx)*np.sum(np.diff(field)**2)+dx*b/4*np.sum((field[1:-1]**2-v*v)**2)


def homogeneous_ssh_energies(sites,t,delta):
    """Open-chain standing-wave quantization, independent of matrix eigh.

    Strong intracell termination, delta>0: t1 sin[(M+1)q]+t2 sin(Mq)=0.
    Exclude the spurious sin(q)=0 roots at the interval endpoints.
    """
    m=sites//2;t1=t*(1+delta);t2=t*(1-delta)
    f=lambda q:t1*math.sin((m+1)*q)+t2*math.sin(m*q)
    grid=np.linspace(1e-9,math.pi-1e-9,4001)
    roots=[]
    for left,right in zip(grid[:-1],grid[1:]):
        fl,fr=f(left),f(right)
        if fl*fr<0:
            for _ in range(45):
                mid=(left+right)/2;fm=f(mid)
                if fl*fm<=0:
                    right=mid
                else:
                    left=mid;fl=fm
            roots.append((left+right)/2)
    assert len(roots)==m
    positive=[math.sqrt(t1*t1+t2*t2+2*t1*t2*math.cos(q)) for q in roots]
    return np.sort(np.r_[positive,-np.array(positive)])


class DomainWallTests(unittest.TestCase):
    def test_phi4_analytic_equation_first_integral_and_tension(self):
        for k,b,v in [(1.,1.,1.),(.2,3.,.7),(4.,.6,2.)]:
            xi=math.sqrt(2*k/(b*v*v))
            x=np.linspace(-14*xi,14*xi,20001)
            z=x/xi;phi=v*np.tanh(z)
            first=v/xi/np.cosh(z)**2
            second=-2*v/xi**2*np.tanh(z)/np.cosh(z)**2
            np.testing.assert_allclose(k*second,b*phi*(phi*phi-v*v),atol=2e-13)
            potential=b/4*(phi*phi-v*v)**2
            np.testing.assert_allclose(k*first*first/2,potential,atol=2e-13)
            sigma=np.trapezoid(k*first*first/2+potential,x)
            self.assertAlmostEqual(sigma,2*math.sqrt(2*k*b)*v**3/3,places=11)

    def test_phi4_discrete_variation_and_reported_energy(self):
        r=d.calculate({'gridPoints':81})
        x=np.array(r['profile']['x']);field=np.array(r['profile']['orderParameter']);dx=x[1]-x[0]
        self.assertAlmostEqual(energy(field,dx,1,1,1),r['wall']['tension'],places=13)
        trial=field.copy();trial[20:25]+=.03
        # Direct finite differences of the energy, independently of solver force.
        expected=(2*trial[1:-1]-trial[:-2]-trial[2:])/dx+dx*trial[1:-1]*(trial[1:-1]**2-1)
        eps=1e-6
        for i in (1,20,22,40,55,79):
            plus=trial.copy();minus=trial.copy();plus[i]+=eps;minus[i]-=eps
            derivative=(energy(plus,dx,1,1,1)-energy(minus,dx,1,1,1))/(2*eps)
            self.assertAlmostEqual(derivative,expected[i-1],delta=2e-10)
        residual=(2*field[1:-1]-field[:-2]-field[2:])/dx**2+field[1:-1]*(field[1:-1]**2-1)
        self.assertAlmostEqual(np.max(abs(residual)),r['checks']['stationaryResidual'],places=13)
        self.assertLess(np.max(abs(residual)),1e-9)

    def test_phi4_mesh_convergence_is_second_order(self):
        results=[d.calculate({'gridPoints':n,'extent':8}) for n in (41,81,161)]
        energy_errors=[abs(r['wall']['tension']-r['wall']['continuumTension']) for r in results]
        profile_errors=[r['checks']['continuumProfileMaxError'] for r in results]
        for errors in (energy_errors,profile_errors):
            self.assertLess(errors[2],errors[1]);self.assertLess(errors[1],errors[0])
            self.assertGreater(errors[2]/errors[1],.22)
            self.assertLess(errors[2]/errors[1],.28)
        self.assertAlmostEqual(results[0]['wall']['fineTension'],results[1]['wall']['tension'],places=13)
        self.assertLess(profile_errors[-1],.0006)

    def test_phi4_kappa_scaling_and_fixed_boundary(self):
        one=d.calculate({'kappa':1});four=d.calculate({'kappa':4})
        self.assertAlmostEqual(four['wall']['width']/one['wall']['width'],2)
        self.assertAlmostEqual(four['wall']['tension']/one['wall']['tension'],2,places=12)
        np.testing.assert_allclose(four['profile']['x'],2*np.array(one['profile']['x']),atol=1e-13)
        np.testing.assert_allclose(four['profile']['orderParameter'],one['profile']['orderParameter'],atol=1e-13)
        r=d.calculate({'extent':4})
        self.assertEqual(r['profile']['orderParameter'][0],-1)
        self.assertEqual(r['profile']['orderParameter'][-1],1)
        # Exact finite Dirichlet values differ from infinite-domain tanh tails.
        self.assertGreater(abs(r['profile']['analytic'][0]+1),.0006)

    def test_phi4_parameter_corners_remain_stationary(self):
        for k,b,v,extent,count in [(.05,8,3,16,41),(8,.05,.2,4,161),(8,8,3,4,161),(.05,.05,.2,16,41)]:
            x,y,_,_,_,res=d.wall_profile(k,b,v,extent,count)
            self.assertLess(res,1e-8)
            np.testing.assert_allclose(y,-y[::-1],atol=1e-13)
            self.assertTrue(np.all(np.diff(y)>-1e-12))

    def test_coarse_pinned_wall_has_detectable_unconstrained_negative_direction(self):
        r=d.calculate({'extent':16,'gridPoints':41})
        c=r['checks'];self.assertTrue(c['pinnedLocallyStable']);self.assertFalse(c['unconstrainedLocallyStable'])
        self.assertLess(c['minimumUnconstrainedHessianEigenvalue'],-.09)
        self.assertGreater(c['minimumPinnedHessianEigenvalue'],1.)
        x=np.array(r['profile']['x']);y=np.array(r['profile']['orderParameter']);dx=x[1]-x[0]
        n=len(y)-2
        hessian=np.diag(2/dx+dx*(3*y[1:-1]**2-1))+np.diag(np.full(n-1,-1/dx),1)+np.diag(np.full(n-1,-1/dx),-1)
        ev,vectors=np.linalg.eigh(hessian)
        trial=y.copy();trial[1:-1]+=.001*vectors[:,0]
        self.assertLess(energy(trial,dx,1,1,1),energy(y,dx,1,1,1))
        # Orthonormal antisymmetric variations reproduce the restricted Hessian.
        restriction=np.zeros((n,n//2))
        for i in range(n//2):
            restriction[i,i]=1/math.sqrt(2);restriction[n-1-i,i]=-1/math.sqrt(2)
        pin=np.linalg.eigvalsh(restriction.T@hessian@restriction)[0]
        self.assertAlmostEqual(pin,c['minimumPinnedHessianEigenvalue'],places=12)
        self.assertTrue(any('负' in text for text in r['warnings']))
        self.assertTrue(any('稳定性' in row['label'] for row in r['summary']))
        fine=d.calculate({'extent':16,'gridPoints':161})
        self.assertGreater(fine['checks']['minimumUnconstrainedHessianEigenvalue'],ev[0])

    def test_uniform_ssh_matches_open_chain_standing_wave_quantization(self):
        for n,t,delta in [(20,1.,.4),(60,.7,.2),(20,2.,.8)]:
            matrix,_=d.ssh_matrix(n,t,delta,2,0,False)
            np.testing.assert_allclose(np.linalg.eigvalsh(matrix),homogeneous_ssh_energies(n,t,delta),atol=8e-14)
        # The helper permits the exact zero-dimerization limit, even though the
        # classroom restricts delta>0 to maintain a reference bulk gap.
        n=20;t=.7;matrix,_=d.ssh_matrix(n,t,0,2,0,False)
        expected=-2*t*np.cos(np.arange(1,n+1)*math.pi/(n+1))
        np.testing.assert_allclose(np.linalg.eigvalsh(matrix),expected,atol=4e-15)

    def test_chiral_anticommutation_and_spectral_pairing(self):
        for interface in (False,True):
            h,_=d.ssh_matrix(60,1,.4,2,0,interface)
            gamma=np.diag((-1.)**np.arange(60))
            np.testing.assert_array_equal(gamma@h+h@gamma,np.zeros_like(h))
            e=np.linalg.eigvalsh(h)
            np.testing.assert_allclose(e,-e[::-1],atol=2e-14)

    def test_selected_subspace_projector_is_unitary_basis_invariant(self):
        r=d.calculate({'experiment':'ssh'})
        h,_=d.ssh_matrix(60,1,.4,2,0,True);e,u=np.linalg.eigh(h)
        sub=u[:,abs(e)<.4];self.assertEqual(sub.shape[1],2)
        rotation=np.array([[1,1j],[1j,1]])/math.sqrt(2)
        rotated=sub@rotation
        expected=np.sum(abs(rotated)**2,axis=1)
        np.testing.assert_allclose(r['chain']['subspaceDensity'],expected,atol=2e-15)
        projector=sub@sub.T
        np.testing.assert_allclose(projector@projector,projector,atol=2e-15)
        self.assertAlmostEqual(expected.sum(),r['chain']['subspaceCount'],places=13)

    def test_ldos_matches_resolvent_and_lorentz_sum_rules(self):
        r=d.calculate({'experiment':'ssh','sites':20,'onsite':.4,'probeEnergy':.17,'eta':.03})
        h,_=d.ssh_matrix(20,1,.4,2,.4,True)
        green=np.linalg.inv((.17+.03j)*np.eye(20)-h)
        np.testing.assert_allclose(r['chain']['ldos'],-np.diag(green).imag/math.pi,atol=1e-13)
        e=np.array(r['spectrum']['energies']);densities=np.array(r['spectrum']['siteDensities'])
        np.testing.assert_allclose(densities.sum(axis=1),1,atol=3e-15)
        np.testing.assert_allclose(densities.sum(axis=0),1,atol=3e-15)
        energies=np.linspace(-12,12,24001);eta=.03
        spectrum=densities@(eta/math.pi/((energies[None,:]-e[:,None])**2+eta**2))
        integrated=np.trapezoid(spectrum,energies,axis=1)
        exact=densities@((np.arctan((12-e)/eta)-np.arctan((-12-e)/eta))/math.pi)
        np.testing.assert_allclose(integrated,exact,atol=3e-11)
        self.assertTrue(np.all(integrated<1)) # finite window omits Lorentz tails
        infinite=densities@((np.arctan((1e6-e)/eta)-np.arctan((-1e6-e)/eta))/math.pi)
        np.testing.assert_allclose(infinite,1,atol=3e-8)

    def test_central_pair_potential_breaks_chiral_symmetry_and_moves_spectrum(self):
        zero=d.calculate({'experiment':'ssh','onsite':0})
        pos=d.calculate({'experiment':'ssh','onsite':.4})
        neg=d.calculate({'experiment':'ssh','onsite':-.4})
        h,_=d.ssh_matrix(60,1,.4,2,.4,True)
        self.assertEqual(np.count_nonzero(np.diag(h)),2)
        np.testing.assert_array_equal(np.diag(h)[29:31],[.4,.4])
        self.assertEqual(pos['checks']['chiralResidual'],.8)
        ez=np.array(zero['spectrum']['energies']);ep=np.array(pos['spectrum']['energies']);en=np.array(neg['spectrum']['energies'])
        self.assertGreater(np.max(abs(ep-ez)),.05)
        self.assertGreater(np.max(abs(ep+ep[::-1])),.05)
        np.testing.assert_allclose(ep,-en[::-1],atol=3e-14)
        self.assertAlmostEqual(ep.sum(),.8,places=12)

    def test_interface_and_edge_localization_are_distinct(self):
        wall=d.calculate({'experiment':'ssh'})
        uniform=d.calculate({'experiment':'ssh','interface':'uniform'})
        self.assertEqual(uniform['chain']['subspaceCount'],0)
        density=np.array(wall['chain']['subspaceDensity'])
        self.assertEqual(wall['chain']['subspaceCount'],2)
        self.assertGreater(density[wall['regions']['centerSites']].sum(),.9)
        self.assertGreater(density[:3].sum(),.9)
        self.assertLess(density[-3:].sum(),1e-6)
        # Opposite uniform termination gives two end contributions, not an interface.
        h,_=d.ssh_matrix(60,1,-.4,2,0,False);e,u=np.linalg.eigh(h)
        ends=np.sum(abs(u[:,abs(e)<.4])**2,axis=1)
        self.assertGreater(ends[:3].sum(),.9);self.assertGreater(ends[-3:].sum(),.9)
        self.assertLess(ends[26:34].sum(),1e-6)

    def test_wide_interface_region_overlap_and_missing_asymptote_are_reported(self):
        r=d.calculate({'experiment':'ssh','sites':20,'sshWidth':10})
        self.assertEqual(r['checks']['centerEdgeOverlapCount'],6)
        self.assertEqual(r['regions']['centerSites'],list(range(20)))
        self.assertEqual(set(r['regions']['overlapSites']),set(r['regions']['edgeSites']))
        self.assertAlmostEqual(r['checks']['endpointDimerizationFraction'],math.tanh(.9))
        self.assertTrue(any('重叠' in text for text in r['warnings']))
        self.assertTrue(any('渐近' in text for text in r['warnings']))

    def test_inputs_and_resource_limits(self):
        for payload in (None,[],{'experiment':'bad'},{'kappa':0},{'beta':True},{'amplitude':float('nan')},
                        {'extent':17},{'gridPoints':80},{'gridPoints':163},{'gridPoints':81.5},
                        {'sites':19},{'sites':21},{'sites':102},{'hopping':0},{'dimerization':0},
                        {'sshWidth':0},{'onsite':3},{'probeEnergy':7},{'eta':0},{'interface':'periodic'}):
            with self.subTest(payload=payload),self.assertRaises(ValueError):
                d.calculate(payload)

    def test_public_contract_and_catalog_presets(self):
        catalog=json.loads((ROOT/'dist/data/domainwall-content.json').read_text(encoding='utf8'))
        self.assertEqual(catalog['module']['action'],'domain_wall_lab')
        for preset in catalog['module']['presets']:
            r=d.calculate(preset['input']);json.dumps(r,allow_nan=False)
            self.assertTrue(r['warnings']);self.assertTrue(r['summary'])
            for plot in r['plots']:
                self.assertTrue(all(all(len(p)==2 for p in s['points']) for s in plot['series']))
            for table in r['tables']:
                self.assertTrue(all(len(row)==len(table['columns']) for row in table['rows']))
        self.assertEqual(catalog['module']['fields'][0]['default'],'landau')


if __name__=='__main__':
    unittest.main(verbosity=2)
