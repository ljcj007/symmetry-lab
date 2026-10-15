"""Analytical and covariance tests for the browser NumPy TB implementation."""
import importlib.util
import json
import math
from pathlib import Path
import unittest

import numpy as np

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("magnetictb_browser",ROOT/"dist/python/magnetictb_browser.py")
tb=importlib.util.module_from_spec(spec);spec.loader.exec_module(tb)


def load(name):
    return json.loads((ROOT/f"dist/examples/magnetictb-{name}.json").read_text(encoding="utf-8"))


def complex_output(value):
    return np.array([[complex(*v) for v in row] for row in value])


class TightBindingTests(unittest.TestCase):
    def test_chain_cosine_and_time_reversal(self):
        payload={"lattice":np.eye(3).tolist(),"sites":[{"position":[0,0,0],"orbitals":["s"]}],
            "periodic":[True,False,False],"operations":[{"rotation":np.eye(3).tolist(),"antiunitary":a} for a in [False,True]],
            "shell_count":2,"parameters":[.3,-.7],"kpoints":[[0,0,0],[.25,0,0],[.5,0,0]]}
        result=tb.run(payload)
        self.assertEqual(result["model"]["parameter_count"],2)
        np.testing.assert_allclose(np.array(result["bands"]["energies"]).ravel(),[-1.1,.3,1.7],atol=1e-12)
        self.assertLess(result["diagnostics"]["covariance_residual"],1e-12)

    def test_graphene_analytic_and_real_space(self):
        result=tb.run(load("graphene"))
        self.assertEqual(result["model"]["parameter_count"],2)
        self.assertEqual(result["model"]["orbital_count"],2)
        hoppings=tb._hopping_dict(result["model"]["hoppings"])[0]
        np.testing.assert_allclose(np.linalg.eigvalsh(tb.bloch_hamiltonian(hoppings,[0,0,0])),[-3,3],atol=1e-10)
        np.testing.assert_allclose(np.linalg.eigvalsh(tb.bloch_hamiltonian(hoppings,[1/3,1/3,0])),[0,0],atol=1e-10)
        self.assertLess(result["diagnostics"]["covariance_residual"],1e-10)
        self.assertEqual(result["diagnostics"]["operation_count"],48)
        # Selected all-space-group orbit must give exactly the two carbon sites.
        self.assertEqual(len(result["model"]["sites"]),2)

    def test_spinful_kramers_chain(self):
        result=tb.run(load("spinful-chain"))
        self.assertEqual(result["model"]["parameter_count"],2)
        for energy in result["bands"]["energies"]: self.assertAlmostEqual(energy[0],energy[1],places=11)
        self.assertLess(result["diagnostics"]["representation_residual"],1e-11)
        self.assertLess(result["diagnostics"]["covariance_residual"],1e-11)

    def test_half_translation_antiunitary(self):
        E=np.eye(3).tolist()
        request={"lattice":E,"sites":[{"position":[0,0,0],"orbitals":["s"]}],
            "periodic":[True,False,False],"operations":[{"rotation":E},{"rotation":E,"translation":[.5,0,0],"antiunitary":True}],
            "shell_count":3,"character_k":[.5,0,0]}
        result=tb.run(request)
        self.assertEqual(len(result["model"]["sites"]),2)
        self.assertLess(result["diagnostics"]["covariance_residual"],1e-10)
        self.assertEqual(result["band_characters"]["operation_indices"],[0])

    def test_closed_p_and_d_orbitals(self):
        rotation=np.array([[0,-1,0],[1,0,0],[0,0,1]])
        for labels in [["px","py","pz"],["dxy","dyz","dxz","dx2-y2","dz2"]]:
            D=tb.orbital_matrix(labels,rotation)
            np.testing.assert_allclose(np.linalg.matrix_power(D,4),np.eye(len(labels)),atol=1e-12)
        with self.assertRaisesRegex(ValueError,"subset is not closed"):
            tb.orbital_matrix(["px"],rotation)

    def test_spin_lift(self):
        U=tb.spin_matrix(np.diag([-1,-1,1]))
        np.testing.assert_allclose(U@U,-np.eye(2),atol=1e-12)
        # Inversion leaves an axial spin unchanged.
        np.testing.assert_allclose(tb.spin_matrix(-np.eye(3)),np.eye(2),atol=1e-12)

    def test_custom_representations(self):
        E=np.eye(3).tolist();I=(-np.eye(3)).tolist()
        req={"lattice":E,"periodic":[True,False,False],"shell_count":1,
            "sites":[{"position":[0,0,0],"orbitals":["a","b"]}],
            "operations":[{"rotation":E,"orbital_matrix":[[1,0],[0,1]]},{"rotation":I,"orbital_matrix":[[1,0],[0,-1]]}]}
        result=tb.run(req)
        self.assertEqual(result["model"]["parameter_count"],2)
        req["operations"][1]["orbital_matrix"]=[[1,0],[0,[0,1]]]
        with self.assertRaisesRegex(ValueError,"consistent"):
            tb.run(req)

    def test_hr_roundtrip_and_degeneracy(self):
        raw=load("ssh");h=tb._input_hoppings(raw)
        imported=tb.read_hr(tb.export_hr(h))
        for R in h:np.testing.assert_allclose(imported[R],h[R],atol=1e-12)
        h1={(0,0,0):np.array([[2.+0j]])}
        lines=tb.export_hr(h1).splitlines();lines[3]="2"
        self.assertEqual(tb.read_hr("\n".join(lines))[(0,0,0)][0,0],1)
        with self.assertRaisesRegex(ValueError,"record count"):
            tb.read_hr("\n".join(lines[:-1]))

    def test_ssh_bands_and_berry_phase(self):
        h=tb._input_hoppings(load("ssh"))
        for k in [0,.1,.5]:
            expected=abs(.5+np.exp(2j*np.pi*k))
            np.testing.assert_allclose(np.linalg.eigvalsh(tb.bloch_hamiltonian(h,[k,0,0])),[-expected,expected],atol=1e-12)
        path=np.column_stack([np.linspace(0,1,101),np.zeros(101),np.zeros(101)])
        result=tb.wilson_loop(h,path,1)
        self.assertAlmostEqual(abs(result["berry_phase"]),math.pi,places=10)
        self.assertLess(result["unitarity_residual"],1e-12)

    def test_wilson_phase_center_correspondence(self):
        # Two independent Rice–Mele chains have opposite nonquantized phases;
        # sorting the phases and centers separately would break row pairing.
        hopping=tb._input_hoppings(load("ssh"))
        h={R:np.kron(np.eye(2),matrix) for R,matrix in hopping.items()}
        h[(0,0,0)]+=np.diag([.3,-.3,-.3,.3])
        path=np.column_stack([np.linspace(0,1,51),np.zeros(51),np.zeros(51)])
        result=tb.wilson_loop(h,path,2)
        np.testing.assert_allclose(np.mod(np.array(result["phases"])/(2*np.pi),1),result["wannier_centers"],atol=1e-12)

    def test_slab_ssh_edge_states(self):
        h=tb._input_hoppings(load("ssh"))
        H=tb.slab_hamiltonian(h,[0,0,0],20,0)
        energies=np.linalg.eigvalsh(H)
        self.assertLess(abs(energies[19]),1e-5)
        self.assertLess(abs(energies[20]),1e-5)
        self.assertGreater(abs(energies[18]),.5)

    def test_finite_ring(self):
        h={(1,0,0):np.ones((1,1)),(-1,0,0):np.ones((1,1))}
        result=tb.run({"action":"finite","hoppings":tb._serialize_hoppings(h),"size":[7,1,1],"boundary_periodic":[True,False,False]})
        np.testing.assert_allclose(result["energies"],np.sort(2*np.cos(2*np.pi*np.arange(7)/7)),atol=1e-12)

    def test_surface_chain_analytic(self):
        h={(1,0,0):np.ones((1,1)),(-1,0,0):np.ones((1,1))}
        result=tb.surface_green(h,[0,0,0],.7,axis=0,eta=.05)
        z=.7+.05j;root=np.sqrt(z*z-4);expected=(z-root)/2
        if expected.imag>0:expected=(z+root)/2
        self.assertAlmostEqual(complex(*result["green"][0][0]).real,expected.real,places=10)
        self.assertAlmostEqual(complex(*result["green"][0][0]).imag,expected.imag,places=10)
        self.assertLess(result["dyson_residual"],1e-10)

    def test_chern_qwz_oriented_and_converged(self):
        h=tb._input_hoppings(load("chern"))
        a=tb.chern_number(h,1,15);b=tb.chern_number(h,1,23)
        self.assertAlmostEqual(a["chern"],1,places=10)
        self.assertAlmostEqual(b["chern"],1,places=10)
        self.assertAlmostEqual(tb.chern_number(h,1,15,axes=[1,0])["chern"],-1,places=10)

    def test_kubo_curvature_integrates_to_chern(self):
        h=tb._input_hoppings(load("chern"));mesh=29
        integral=sum(tb.berry_curvature(h,[(i+.5)/mesh,(j+.5)/mesh,0],1)["curvature"]
                     for i in range(mesh) for j in range(mesh))/(mesh*mesh*2*np.pi)
        self.assertAlmostEqual(integral,1,places=6)

    def test_multiple_spinful_noncommuting_rotations(self):
        # Proper D2 rotations generate the projective quaternion spin group.
        rots=[np.eye(3),np.diag([1,-1,-1]),np.diag([-1,1,-1]),np.diag([-1,-1,1])]
        req={"lattice":np.eye(3).tolist(),"sites":[{"position":[0,0,0],"orbitals":["sup","sdn"]}],
            "operations":[{"rotation":r.tolist(),"antiunitary":a} for a in [False,True] for r in rots],"shell_count":2}
        result=tb.run(req)
        self.assertEqual(result["model"]["parameter_count"],7)
        # D2 + T allows one scalar onsite and independent scalar and SOC
        # nearest-neighbour amplitudes along x/y/z (seven real parameters).
        self.assertLess(result["diagnostics"]["covariance_residual"],1e-10)

    def test_gap_and_nonclosed_group_rejected(self):
        h={(0,0,0):np.zeros((2,2))}
        with self.assertRaisesRegex(ValueError,"gap closes"):tb.chern_number(h,1,7)
        req=load("graphene");req["operations"]=req["operations"][:2]
        with self.assertRaisesRegex(ValueError,"not closed"):tb.run(req)

    def test_hr_and_nonhermitian_invalid_rejected(self):
        with self.assertRaisesRegex(ValueError,"not Hermitian"):
            tb._hopping_dict([{"cell":[1,0,0],"matrix":[[1]]}])
        with self.assertRaisesRegex(ValueError,"Duplicate"):
            tb._hopping_dict([{"cell":[0,0,0],"matrix":[[1]]}]*2)

    def test_representative_sg_msg_database_integration(self):
        sgs=json.loads((ROOT/"dist/data/space-groups.json").read_text())["groups"]
        msgs=json.loads((ROOT/"dist/data/magnetic-groups.json").read_text())["groups"]
        selected=[sgs[n-1] for n in [2,19,62,76,142,166,191,194,198,225,227,230]]
        selected += [next(g for g in msgs if g["id"]==name) for name in ["1.3","3.3","4.10","19.27","62.448","166.101"]]
        for group in selected:
            with self.subTest(group=group.get("id",group.get("number"))):
                result=tb.run({"lattice":group["basis"],"operations":group["operations"],
                    "sites":[{"position":[0,0,0],"orbitals":["sup","sdn"]}],"shell_count":2,
                    "kpoints":[[0,0,0],[.13,.21,.17]]})
                self.assertLess(result["diagnostics"]["covariance_residual"],1e-11)
                self.assertGreater(result["model"]["parameter_count"],0)


if __name__=="__main__":unittest.main(verbosity=2)
