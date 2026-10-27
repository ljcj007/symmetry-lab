"""Independent angular algebra, analytic atomic limits and JT stationary sets."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from crystal_field_lab import (run, angular_momentum, angular_values, crystal_hamiltonian,
                               orbital_energies, jahn_teller_matrix, _reduced_density)


class CrystalFieldTests(unittest.TestCase):
    def test_cubic_analytic_splitting_and_barycenter(self):
        for coordination, expected, degeneracies in [("octahedral", [-.8, 1.2], [6,4]), ("tetrahedral", [-1.2,.8], [4,6])]:
            r = run({"coordination":coordination,"splitting":2,"soc":0})
            np.testing.assert_allclose([g["energy"] for g in r["groups"]],expected)
            self.assertEqual([g["degeneracy"] for g in r["groups"]],degeneracies)
            self.assertAlmostEqual(sum(l["energy"] for l in r["levels"]),0.)
            self.assertTrue(r["checks"]["passed"])
        td = run({"coordination":"tetrahedral","soc":0})
        self.assertEqual({o["parent_label"] for o in td["orbitals"]},{"e","t₂"})

    def test_tetragonal_levels_match_Dq_Ds_Dt_equations(self):
        dq, ds, dt = .17, -.11, .037
        expected = [-4*dq+2*ds-dt, -4*dq-ds+4*dt, -4*dq-ds+4*dt,
                    6*dq+2*ds-dt, 6*dq-2*ds-6*dt]
        np.testing.assert_allclose(orbital_energies("octahedral",10*dq,ds,dt),expected,atol=1e-15)
        self.assertAlmostEqual(sum(expected),0.)
        r = run({"splitting":10*dq,"ds":ds,"dt":dt,"soc":0})
        np.testing.assert_allclose([o["crystal_field_energy"] for o in r["orbitals"]],expected)
        np.testing.assert_allclose([l["energy"] for l in r["levels"]],np.sort(np.repeat(expected,2)))

    def test_angular_momentum_matches_cartesian_differential_operator(self):
        # L=-i r x grad, evaluated independently on the five homogeneous
        # quadratic polynomials. This also checks phase conventions in U.
        rng=np.random.default_rng(421)
        a=math.sqrt(15/(4*math.pi)); b=math.sqrt(5/(16*math.pi))
        for r in rng.normal(size=(10,3)):
            r=r/np.linalg.norm(r);x,y,z=r
            yvalues=angular_values(x,y,z)
            gradients=np.array([[a*y,a*x,0],[0,a*z,a*y],[a*z,0,a*x],
                                [a*x,-a*y,0],[-2*b*x,-2*b*y,4*b*z]])
            derivative=-1j*np.cross(r,gradients)
            for axis,L in enumerate(angular_momentum()):
                np.testing.assert_allclose(yvalues@L,derivative[:,axis],atol=1e-14)

    def test_su2_algebra_and_l_squared(self):
        l=angular_momentum()
        for i,j,k in [(0,1,2),(1,2,0),(2,0,1)]:
            np.testing.assert_allclose(l[i]@l[j]-l[j]@l[i],1j*l[k],atol=1e-14)
        np.testing.assert_allclose(sum(x@x for x in l),6*np.eye(5),atol=1e-14)

    def test_free_ion_soc_both_signs_and_multiplicities(self):
        for coupling in [.32,-.32]:
            r=run({"splitting":0,"soc":coupling})
            pairs=sorted([(-1.5*coupling,4,-1.5),(coupling,6,1.)])
            self.assertEqual([g["degeneracy"] for g in r["groups"]],[p[1] for p in pairs])
            np.testing.assert_allclose([g["energy"] for g in r["groups"]],[p[0] for p in pairs],atol=1e-14)
            np.testing.assert_allclose([g["l_dot_s"] for g in r["groups"]],[p[2] for p in pairs],atol=1e-14)
            self.assertLess(r["checks"]["kramers_pair_residual"],1e-12)

    def test_full_zero_limit_density_is_isotropic(self):
        r=run({"splitting":0,"soc":0})
        self.assertEqual(r["groups"][0]["degeneracy"],10)
        np.testing.assert_allclose(r["angular_map"]["density"],1/(4*math.pi),atol=1e-14)
        np.testing.assert_allclose(r["selection"]["orbital_density_real"],np.eye(5)/5,atol=1e-14)

    def test_projector_average_invariant_under_degenerate_change_of_basis(self):
        h,_=crystal_hamiltonian("octahedral",1.,0.,0.,.21)
        e,v=np.linalg.eigh(h)
        frame=v[:,abs(e-e[0])<1e-10]
        rng=np.random.default_rng(23)
        q,_=np.linalg.qr(rng.normal(size=(frame.shape[1],frame.shape[1]))+1j*rng.normal(size=(frame.shape[1],frame.shape[1])))
        np.testing.assert_allclose(_reduced_density(frame),_reduced_density(frame@q),atol=1e-14)
        r=run({"soc":.21})
        np.testing.assert_allclose(r["selection"]["orbital_density_real"],_reduced_density(frame).real,atol=1e-14)

    def test_general_fields_time_reversal_and_normalization(self):
        r=run({"coordination":"tetrahedral","splitting":1.7,"ds":-.11,"dt":.03,"soc":-.21,"selected_level":7})
        h=np.array(r["hamiltonian"]["real"])+1j*np.array(r["hamiltonian"]["imag"])
        t=np.kron(np.eye(5),np.array([[0,1],[-1,0]]))
        np.testing.assert_allclose(t@h.conj()@t.conj().T,h,atol=1e-14)
        np.testing.assert_allclose(t@t.conj(),-np.eye(10))
        for group in r["groups"]:
            self.assertEqual(group["degeneracy"]%2,0)
            self.assertAlmostEqual(sum(group["orbital_weights"]),1.)
        self.assertGreaterEqual(np.min(r["angular_map"]["density"]),0.)
        self.assertAlmostEqual(np.trace(r["selection"]["orbital_density_real"]),1.)

    def test_shapes_are_orthonormal_and_share_cartesian_axes(self):
        z,w=np.polynomial.legendre.leggauss(10)
        phi=2*math.pi*np.arange(19)/19
        zz,pp=np.meshgrid(z,phi,indexing="ij")
        f=angular_values(np.sqrt(1-zz*zz)*np.cos(pp),np.sqrt(1-zz*zz)*np.sin(pp),zz)
        gram=np.einsum("a,abi,abj->ij",w,f,f)*(2*math.pi/19)
        np.testing.assert_allclose(gram,np.eye(5),atol=1e-14)
        np.testing.assert_allclose(angular_values(0.,0.,1.)[:4],0.)
        self.assertGreater(angular_values(0.,0.,1.)[4],0)
        self.assertGreater(angular_values(1.,0.,0.)[3],0)
        self.assertLess(angular_values(0.,1.,0.)[3],0)

    def test_ligand_geometry_is_ideal_and_not_inferred_from_ds_dt(self):
        for coord,n in [("octahedral",6),("tetrahedral",4)]:
            r=run({"coordination":coord,"ds":.7,"dt":-.2})
            lig=np.array(r["ligands"]["positions"])
            self.assertEqual(len(lig),n)
            np.testing.assert_allclose(np.linalg.norm(lig,axis=1),1.)
            np.testing.assert_allclose(lig.sum(axis=0),0.,atol=1e-15)
            if coord=="tetrahedral":np.testing.assert_allclose((lig@lig.T)[~np.eye(4,dtype=bool)],-1/3)

    def test_soc_scan_endpoint_matches_full_diagonalization(self):
        r=run({"soc":-.31,"ds":.04,"dt":-.02,"scan_points":11})
        self.assertEqual(r["soc_scan"]["soc"][-1],-.31)
        np.testing.assert_allclose(r["soc_scan"]["energies"][-1],[l["energy"] for l in r["levels"]])

    def test_jt_surfaces_analytic_eigenvalues(self):
        r=run({"mode":"jahn_teller","coupling":-1.3,"stiffness":2.7,"q2":.2,"q3":-.41,"grid":11})
        for i,q3 in enumerate(r["surfaces"]["q3"]):
            for j,q2 in enumerate(r["surfaces"]["q2"]):
                expected=np.linalg.eigvalsh(jahn_teller_matrix(q2,q3,-1.3,2.7))
                np.testing.assert_allclose([r["surfaces"]["lower"][i][j],r["surfaces"]["upper"][i][j]],expected,atol=1e-14)
        self.assertTrue(r["checks"]["passed"])

    def test_jt_global_circle_and_radial_stability(self):
        for g in [1.2,-1.2]:
            spring=2.4;r=run({"mode":"jahn_teller","coupling":g,"stiffness":spring})
            rho=r["minimum"]["radius"]
            self.assertAlmostEqual(rho,abs(g)/spring)
            self.assertEqual(r["minimum"]["kind"],"circle")
            for angle in np.linspace(0,2*math.pi,13):
                point=np.array([math.sin(angle),math.cos(angle)])*rho
                value=np.linalg.eigvalsh(jahn_teller_matrix(*point,g,spring))[0]
                self.assertAlmostEqual(value,-g*g/(2*spring))
                displaced=point*(1+.02/rho)
                raised=np.linalg.eigvalsh(jahn_teller_matrix(*displaced,g,spring))[0]
                self.assertAlmostEqual(raised-value,spring*.02**2/2)

    def test_jt_conical_point_and_zero_coupling_are_distinguished(self):
        origin=run({"mode":"jahn_teller","q2":0,"q3":0})
        self.assertTrue(origin["summary"]["conical_intersection"])
        self.assertFalse(origin["selection"]["state_defined"])
        self.assertEqual(origin["selection"]["lower_orbital_weights"],[.5,.5])
        zero=run({"mode":"jahn_teller","coupling":0})
        self.assertFalse(zero["summary"]["conical_intersection"])
        self.assertEqual(zero["minimum"]["kind"],"point")
        self.assertEqual(zero["minimum"]["radius"],0.)
        np.testing.assert_array_equal(zero["surfaces"]["lower"],zero["surfaces"]["upper"])

    def test_jt_coupling_sign_changes_orbital_not_energy(self):
        plus=run({"mode":"jahn_teller","coupling":1.,"q2":0,"q3":.4})
        minus=run({"mode":"jahn_teller","coupling":-1.,"q2":0,"q3":.4})
        np.testing.assert_allclose(plus["selection"]["energies"],minus["selection"]["energies"])
        np.testing.assert_allclose(plus["selection"]["lower_orbital_weights"],[0,1])
        np.testing.assert_allclose(minus["selection"]["lower_orbital_weights"],[1,0])

    def test_jt_minimum_outside_window_is_not_clipped(self):
        r=run({"mode":"jahn_teller","coupling":5,"stiffness":.05,"q_extent":1})
        self.assertEqual(r["minimum"]["radius"],100)
        self.assertFalse(r["minimum"]["any_minimum_in_plot"])
        self.assertGreater(max(r["radial"]["rho"]),100)

    def test_inputs_json_finiteness_and_inactive_fields(self):
        for p in [{},{"mode":"jahn_teller"},{"soc":-.5,"coupling":2.1},{"mode":"jahn_teller","soc":.4}]:
            r=run(p);json.dumps(r,allow_nan=False);self.assertTrue(r["checks"]["passed"])
        self.assertEqual(run({"coupling":2.1})["inactive_parameters"],{"coupling":2.1})
        invalid=[None,[],{"mode":[]},{"coordination":{}},{"splitting":-1},{"soc":True},{"soc":complex(1,2)},
                 {"soc":float("nan")},{"ds":float("inf")},{"grid":10.5},{"selected_level":10},
                 {"angular_grid":1000},{"stiffness":0},{"coupling":10**400},{"q2":".2"},{"temperature":300}]
        for p in invalid:
            with self.subTest(p=p),self.assertRaises(ValueError):run(p)


if __name__=="__main__":unittest.main()
