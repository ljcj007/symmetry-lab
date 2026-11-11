"""Independent invariants for the introductory interactive teaching models."""
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from foundations_demos import run,water_demo,d3_demo,splitting_demo,jahn_teller_demo,macro_demo


def dot(a,b):return sum(x*y for x,y in zip(a,b))
def mv(a,v):return [dot(row,v) for row in a]
def mm(a,b):return [[sum(a[i][k]*b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


class FoundationTests(unittest.TestCase):
    def test_water_displacement_reduction_and_selection(self):
        r=water_demo()
        self.assertEqual(r["characters"]["displacement"],[9,-1,3,1])
        self.assertEqual(r["characters"]["vibration"],[3,1,3,1])
        self.assertEqual(r["decomposition"]["vibration"],{"A1":2,"A2":0,"B1":1,"B2":0})
        self.assertEqual(r["selection"]["irPolarizations"],["z"])
        self.assertEqual(water_demo({"mode":"antisymmetric"})["selection"]["ramanComponents"],["xz","zx"])
        self.assertTrue(r["checks"]["passed"])

    def test_water_displacement_vectors_transform_as_declared(self):
        r=water_demo()
        # Independently apply C2z and the two mirrors, including atom permutation.
        actions=[([0,2,1],[-1,-1,1]),([0,1,2],[1,-1,1]),([0,2,1],[-1,1,1])]
        for mode,pattern in r["patterns"].items():
            signs=[1,1,1] if mode!="antisymmetric" else [-1,1,-1]
            for (perm,diag),sign in zip(actions,signs):
                image=[[0.,0.,0.] for _ in pattern]
                for j,v in enumerate(pattern):image[perm[j]]=[x*d for x,d in zip(v,diag)]
                for a,b in zip(image,pattern):
                    for x,y in zip(a,b):self.assertAlmostEqual(x,sign*y,places=12)

    def test_characters_distinguish_full_space_and_xy(self):
        r=run({"experiment":"characters"})
        self.assertEqual((r["fullTrace"],r["xyTrace"]),(1,0))
        self.assertEqual(r["order"],4)
        self.assertEqual(mm(r["xyMatrix"],r["xyMatrix"]),[[-1,0],[0,-1]])
        self.assertEqual(run({"theme":"characters","basis":"xy"})["character"],0)

    def test_d3_exact_permutation_group_and_character_table(self):
        r=d3_demo()
        matrices=[o["matrix"] for o in r["operations"]]
        self.assertEqual([sum(m[i][i] for i in range(3)) for m in matrices],[3,0,0,1,1,1])
        for i,a in enumerate(matrices):
            for j,b in enumerate(matrices):self.assertEqual(mm(a,b),matrices[r["multiplicationTable"][i][j]])
        for row in r["characterTable"]["rows"].values():
            self.assertEqual(sum(n*x*x for n,x in zip([1,2,3],row)),6)
        self.assertTrue(r["checks"]["passed"])

    def test_d3_projectors_and_row_partners(self):
        r=d3_demo()
        u,v=r["basis"]["E"]
        self.assertAlmostEqual(dot(u,v),0.)
        self.assertAlmostEqual(dot(u,u),1.)
        for key,projector in r["projectors"].items():
            square=mm(projector,projector)
            for a,b in zip(square,projector):
                for x,y in zip(a,b):self.assertAlmostEqual(x,y)
        e0=[1,0,0]
        for row,target in zip(r["rowProjectors"],[u,v]):
            p=mv(row,e0); norm=math.sqrt(dot(p,p))
            for x,y in zip(p,target):self.assertAlmostEqual(x/norm,y)
        self.assertTrue(d3_demo({"irrep":"A2"})["selected"]["isZero"])
        self.assertIsNone(d3_demo({"irrep":"A2"})["selected"]["normalizedProjection"])

    def test_d3_e_matrix_is_actual_noncommuting_representation(self):
        r=d3_demo()
        rot=r["operations"][1]["eMatrix"];half=r["operations"][3]["eMatrix"]
        self.assertAlmostEqual(rot[0][0],-.5)
        self.assertAlmostEqual(rot[1][0],math.sqrt(3)/2)
        self.assertGreater(abs(mm(rot,half)[0][1]-mm(half,rot)[0][1]),1.)

    def test_crystal_splitting_barycenter_and_proper_group_branches(self):
        r=splitting_demo({"delta":2.,"ds":.1,"dt":.03})
        expected={"A1":1.2-.2-.18,"B1":1.2+.2-.03,"B2":-.8+.2-.03,"E":-.8-.1+.12}
        for o in r["orbitals"]:self.assertAlmostEqual(o["energy"],expected[o["irrep"]])
        self.assertAlmostEqual(sum(o["energy"]*o["degeneracy"] for o in r["orbitals"]),0.)
        self.assertEqual(r["branching"]["O_to_D4"],{"E":["A1","B1"],"T2":["B2","E"]})
        self.assertTrue(r["checks"]["passed"])
        self.assertTrue(all("g" not in o["irrep"] for o in r["orbitals"]))

    def test_jt_minima_and_filled_counterexamples(self):
        for occ,imbalance in [(1,1),(2,0),(3,1),(4,0)]:
            r=jahn_teller_demo({"g":.8,"k":1.3,"occupancy":occ})
            self.assertAlmostEqual(r["minRadius"],imbalance*.8/1.3)
            self.assertAlmostEqual(r["stabilization"],imbalance*.8**2/(2*1.3))
            at_min=jahn_teller_demo({"g":.8,"k":1.3,"occupancy":occ,"qtheta":r["minRadius"],"qepsilon":0.})
            self.assertAlmostEqual(at_min["potential"],-r["stabilization"])
        a=jahn_teller_demo({"qtheta":.3,"qepsilon":.4})
        b=jahn_teller_demo({"qtheta":.5,"qepsilon":0.})
        self.assertAlmostEqual(a["potential"],b["potential"])

    def test_crystallographic_restriction_and_translation_quotient(self):
        for n in range(1,13):
            r=macro_demo({"n":n,"translation":[.25,.5,.75]})
            self.assertEqual(r["allowed"],n in (1,2,3,4,6))
            self.assertEqual(r["macroscopic"]["rotation"],r["seitz"]["rotation"])
            self.assertEqual(r["seitz"]["translation"],[.25,.5,.75])
            self.assertTrue(r["checks"]["passed"])

    def test_json_serialization_and_invalid_inputs(self):
        for theme in ["water","characters","projection","splitting","jt","macro"]:
            json.dumps(run({"experiment":theme}),allow_nan=False)
        for invalid in [{"experiment":"missing"},{"theme":"d3","seedSite":True},{"theme":"water","amplitude":float("nan")},{"theme":"jt","k":0},{"theme":"macro","n":2.5},{"theme":"characters","basis":"f"}]:
            with self.assertRaises(ValueError):run(invalid)
        with self.assertRaises(ValueError):run([])


if __name__=="__main__":unittest.main()
