"""Geometric and quantum invariants, with no optional scientific packages."""
from pathlib import Path
import json
import math
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from symmetry_mini_demos import run


def dot(a,b):return sum(x*y for x,y in zip(a,b))
def mv(a,v):return [dot(row,v) for row in a]


class MiniTests(unittest.TestCase):
    def test_five_regular_polyhedra_vertices_edges_and_euler(self):
        for name,v,e,f in [("tetra",4,6,4),("cube",8,12,6),("octa",6,12,8),("dodeca",20,30,12),("icosa",12,30,20)]:
            r=run({"polyhedron":name})
            self.assertEqual((len(r["vertices"]),len(r["edges"])),(v,e))
            self.assertEqual(v-e+f,2)
            self.assertTrue(r["coincident"])
            self.assertTrue(r["checks"]["passed"])

    def test_known_axes_and_noncrystallographic_counterexample(self):
        for name in ["tetra","cube","octa","dodeca","icosa"]:
            self.assertTrue(run({"polyhedron":name,"order":2})["coincident"])
            self.assertTrue(run({"polyhedron":name,"order":3})["coincident"])
            self.assertEqual(run({"polyhedron":name,"order":4})["coincident"],name in ("cube","octa"))
            self.assertEqual(run({"polyhedron":name,"order":5})["coincident"],name in ("dodeca","icosa"))
        self.assertFalse(run({"polyhedron":"icosa"})["crystallographic"])
        self.assertEqual(run({"polyhedron":"tetra"})["fullGroup"],"Td")

    def test_rodrigues_rotation_preserves_distances(self):
        r=run({"polyhedron":"dodeca","order":5,"fraction":.37})
        self.assertFalse(r["coincident"])
        for a,b in zip(r["vertices"],r["transformed"]):self.assertAlmostEqual(dot(a,a),dot(b,b))
        for i,j in r["edges"]:
            before=sum((x-y)**2 for x,y in zip(r["vertices"][i],r["vertices"][j]))
            after=sum((x-y)**2 for x,y in zip(r["transformed"][i],r["transformed"][j]))
            self.assertAlmostEqual(before,after)

    def test_vibration_exact_modes_and_unbroken_mixing(self):
        for mix in [0,31,90,149]:
            r=run({"experiment":"vibrations","mix":mix})
            self.assertTrue(r["isEigenvector"])
            self.assertAlmostEqual(r["rayleigh"],2.5)
        r=run({"experiment":"vibrations","delta":.4,"mix":45})
        self.assertFalse(r["isEigenvector"])
        self.assertAlmostEqual(r["eigenResidual"],.2)
        for basis,lam in zip([r["basis"]["A1"],r["basis"]["u"],r["basis"]["v"]],r["eigenvalues"]):
            for a,b in zip(mv(r["stiffness"],basis),basis):self.assertAlmostEqual(a,lam*b)

    def test_negative_stiffness_is_not_silently_a_real_frequency(self):
        r=run({"experiment":"vibrations","k0":.1,"k":0.,"delta":-1.})
        self.assertFalse(r["stable"])
        self.assertIsNone(r["frequencies"][1])

    def test_rashba_trim_only_and_zeeman_gap(self):
        for k in [0,math.pi,-math.pi]:
            r=run({"experiment":"bands","k":k,"B":0.})
            self.assertTrue(r["sameKDegenerate"])
        generic=run({"experiment":"bands","kpi":.5,"alpha":.4})
        self.assertFalse(generic["sameKDegenerate"])
        self.assertAlmostEqual(generic["energies"][1]-generic["energies"][0],1.6)
        for b in [-.3,.3]:
            r=run({"experiment":"bands","B":b,"k":0.})
            self.assertAlmostEqual(r["energies"][1]-r["energies"][0],.6)
            self.assertFalse(r["timeReversal"])

    def test_rashba_even_spectrum_does_not_prove_time_reversal(self):
        plus=run({"experiment":"bands","kpi":.27,"B":.4})
        minus=run({"experiment":"bands","kpi":-.27,"B":.4})
        self.assertEqual(plus["energies"],minus["energies"])
        self.assertGreater(plus["trResidual"],0.)

    def test_two_spin_singlet_triplet_and_swap(self):
        for j in [-1.2,0.,.7]:
            for state in ["singlet","triplet0","triplet+","triplet-"]:
                r=run({"experiment":"manybody","J":j,"state":state})
                sign=-1 if state=="singlet" else 1
                self.assertAlmostEqual(r["exchangeEigenvalue"],sign)
                for a,b in zip(r["swapped"],r["wavefunction"]):self.assertAlmostEqual(a,sign*b)
                for a,b in zip(mv(r["hamiltonian"],r["wavefunction"]),r["wavefunction"]):self.assertAlmostEqual(a,r["energy"]*b)
                self.assertAlmostEqual(sum(row[i] for i,row in enumerate(r["hamiltonian"])),0.)

    def test_time_reversal_antiunitary_square_and_orthogonal_partner(self):
        for theta in [0,37,90,180]:
            for phi in [0,53,180,295]:
                r=run({"experiment":"time-reversal","theta":theta,"phi":phi})
                psi=[complex(*x) for x in r["spinor"]]
                t=[complex(*x) for x in r["Tspinor"]]
                self.assertAlmostEqual(abs(sum(a.conjugate()*b for a,b in zip(psi,t))),0.)
                for a,b in zip(r["spinor"],r["T2spinor"]):
                    for x,y in zip(a,b):self.assertAlmostEqual(x,-y)
                self.assertEqual(r["spinor"],r["K2spinor"])

    def test_spin_double_cover_and_soc_angular_momentum_formula(self):
        at_zero=run({"experiment":"double-soc","angle":0})["spinor"]
        at_2pi=run({"experiment":"double-soc","angle":360})["spinor"]
        at_4pi=run({"experiment":"double-soc","angle":720})["spinor"]
        for a,b,c in zip(at_zero,at_2pi,at_4pi):
            for x,y,z in zip(a,b,c):self.assertAlmostEqual(x,-y);self.assertAlmostEqual(x,z)
        for coupling in [-1.,0.,.8]:
            r=run({"experiment":"double-soc","coupling":coupling})
            for level in r["levels"]:
                j=level["j"]
                self.assertAlmostEqual(level["energy"],coupling/2*(j*(j+1)-2-.75))
                self.assertEqual(level["degeneracy"],int(2*j+1))
            self.assertAlmostEqual(r["checks"]["weightedEnergySum"],0.)

    def test_json_finite_and_invalid_inputs(self):
        for experiment in ["polyhedra","vibrations","bands","manybody","time-reversal","double-soc"]:
            json.dumps(run({"experiment":experiment}),allow_nan=False)
        for invalid in [[],{"experiment":"unknown"},{"order":2.5},{"experiment":"bands","B":float("nan")},{"experiment":"vibrations","k0":True}]:
            with self.assertRaises(ValueError):run(invalid)


if __name__=="__main__":unittest.main()
