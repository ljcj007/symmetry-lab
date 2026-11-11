"""Independent group, representation and metric checks for the theorem workshop."""
from pathlib import Path
from itertools import product
import json
import math
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from group_theorems import run


def transpose(a):return [list(x) for x in zip(*a)]
def mm(a,b):return [[sum(x*y for x,y in zip(r,c)) for c in transpose(b)] for r in a]
def eye(n):return [[int(i==j) for j in range(n)] for i in range(n)]
def rank(a):
    a=[list(row) for row in a];r=0
    for c in range(len(a[0])):
        pivot=next((i for i in range(r,len(a)) if abs(a[i][c])>1e-9),None)
        if pivot is None:continue
        a[r],a[pivot]=a[pivot],a[r];q=a[r][c];a[r]=[x/q for x in a[r]]
        for i in range(len(a)):
            if i!=r:
                q=a[i][c];a[i]=[x-q*y for x,y in zip(a[i],a[r])]
        r+=1
        if r==len(a):break
    return r


class TheoremTests(unittest.TestCase):
    def assertMatrixNear(self,a,b):
        for r,s in zip(a,b):
            for x,y in zip(r,s):self.assertAlmostEqual(x,y,places=10)

    def test_rearrangement_bijections_inverse_maps_and_associativity(self):
        table=run()["multiplicationTable"]
        for a,b,c in product(range(6),repeat=3):self.assertEqual(table[table[a][b]][c],table[a][table[b][c]])
        for side,h in product(["left","right"],range(6)):
            r=run({"experiment":"rearrangement","h":h,"side":side})
            self.assertEqual(sorted(r["images"]),list(range(6)))
            for g,image in enumerate(r["images"]):self.assertEqual(table[r["inverse"]][image] if side=="left" else table[image][r["inverse"]],g)

    def test_conjugacy_classes_and_order(self):
        for g,h in product(range(6),repeat=2):
            r=run({"experiment":"conjugacy","g":g,"h":h})
            self.assertIn(r["conjugate"],r["classes"][r["classIndex"]])
            self.assertEqual(sum(r["selectedMatrix"][i][i] for i in range(3)),sum(r["conjugateMatrix"][i][i] for i in range(3)))
        self.assertEqual([len(run({"experiment":"conjugacy","g":g})["classes"][run({"experiment":"conjugacy","g":g})["classIndex"]]) for g in [0,1,4]],[1,3,2])

    def test_normality_is_a_global_condition(self):
        trivial=run({"experiment":"normal","subgroup":"H12","h":0})
        self.assertEqual(trivial["conjugated"],trivial["subgroup"])
        self.assertFalse(trivial["normal"])
        self.assertNotEqual(run({"experiment":"normal","subgroup":"H12","h":2})["conjugated"],trivial["subgroup"])
        for h in range(6):self.assertTrue(run({"experiment":"normal","subgroup":"A3","h":h})["normal"])

    def test_quotient_product_independent_of_representatives_only_when_normal(self):
        table=run()["multiplicationTable"]
        for subgroup in ["A3","H12"]:
            r=run({"experiment":"normal","subgroup":subgroup})
            cosets=r["leftCosets"]
            def coset_of(g):return next(i for i,c in enumerate(cosets) if g in c)
            outputs=[{coset_of(table[a][b]) for a in left for b in right} for left,right in product(cosets,repeat=2)]
            if r["normal"]:self.assertTrue(all(len(o)==1 for o in outputs));self.assertEqual(r["quotientTable"],[[0,1],[1,0]])
            else:self.assertTrue(any(len(o)>1 for o in outputs));self.assertIsNone(r["quotientTable"])

    def test_character_self_inner_product_and_common_invariant_projector(self):
        for name,expected in [("A1",1),("A2",1),("E",1),("permutation",2)]:
            r=run({"experiment":"irreducible","representation":name})
            self.assertAlmostEqual(r["characterNorm"],expected)
            self.assertEqual(r["irreducible"],expected==1)
        r=run({"experiment":"irreducible","representation":"permutation"})
        p=r["invariantA1Projector"];self.assertMatrixNear(mm(p,p),p)
        for g in range(6):
            d=run({"experiment":"irreducible","g":g})["selectedMatrix"]
            self.assertMatrixNear(mm(d,p),mm(p,d))

    def test_schur_commutant_dimension_from_independent_linear_constraints(self):
        for name,n,dimension in [("E",2,1),("permutation",3,2)]:
            equations=[]
            for g in range(6):
                d=run({"experiment":"irreducible","representation":name,"g":g})["selectedMatrix"]
                for i,j in product(range(n),repeat=2):
                    equations.append([int(i==k)*d[l][j]-d[i][k]*int(l==j) for k,l in product(range(n),repeat=2)])
            self.assertEqual(n*n-rank(equations),dimension)
        r=run({"experiment":"schur","representation":"permutation","a":.2,"b":1.})
        self.assertFalse(r["scalar"]);self.assertLess(r["commutatorResidual"],1e-10)

    def test_metric_invariance_and_actual_unitarization(self):
        for scale,shear,metric in product([.5,1.,2.],[-.8,0.,.7],["average","similarity"]):
            for g in range(6):
                r=run({"experiment":"unitarity","scale":scale,"shear":shear,"metric":metric,"g":g})
                d=r["nonunitary"];m=r["chosenMetric"];u=r["unitary"]
                self.assertMatrixNear(mm(mm(transpose(d),m),d),m)
                self.assertMatrixNear(mm(transpose(u),u),eye(2))
                self.assertMatrixNear(mm(transpose(r["factor"]),r["factor"]),m)
                self.assertTrue(r["checks"]["positiveMetric"])
        self.assertGreater(run({"experiment":"unitarity"})["ordinaryResidual"],.1)

    def test_all_matrix_element_orthogonality_relations(self):
        elements=[(name,i,j) for name,d in [("A1",1),("A2",1),("E",2)] for i,j in product(range(d),repeat=2)]
        for (alpha,i,j),(beta,k,l) in product(elements,repeat=2):
            r=run({"experiment":"orthogonality","alpha":alpha,"beta":beta,"i":i,"j":j,"k":k,"l":l})
            expected=6/(2 if alpha=="E" else 1) if alpha==beta and i==k and j==l else 0.
            self.assertAlmostEqual(r["total"],expected)
            self.assertAlmostEqual(r["characterInner"],int(alpha==beta))

    def test_reduction_weights_regular_representation_and_invalid_guess(self):
        r=run({"experiment":"reduction"})
        self.assertEqual(r["multiplicities"],{"A1":1.,"A2":0.,"E":1.})
        regular=run({"experiment":"reduction","preset":"regular"})
        self.assertEqual(regular["multiplicities"],{"A1":1.,"A2":1.,"E":2.})
        self.assertEqual(regular["dimensionSquaredSum"],6)
        invalid=run({"experiment":"reduction","preset":"custom","chiE":3,"chiT":1,"chiC":1})
        self.assertFalse(invalid["validCharacter"])
        self.assertTrue(invalid["checks"]["dimensionCheck"])
        self.assertFalse(invalid["checks"]["passed"])

    def test_protected_versus_accidental_degeneracy(self):
        symmetric=run({"experiment":"degeneracy"});self.assertTrue(symmetric["protectedE"])
        self.assertEqual(sorted(x["degeneracy"] for x in symmetric["energyGroups"]),[1,2])
        accidental=run({"experiment":"degeneracy","a":.4,"b":.4})
        self.assertTrue(accidental["accidentalThreefold"]);self.assertEqual(accidental["energyGroups"][0]["degeneracy"],3)
        broken=run({"experiment":"degeneracy","epsilon":.2})
        self.assertFalse(broken["fullSymmetry"]);self.assertFalse(broken["protectedE"])
        self.assertGreater(broken["commutatorResidual"],.1)

    def test_json_finite_and_validation(self):
        for experiment in ["rearrangement","conjugacy","normal","irreducible","schur","unitarity","orthogonality","reduction","degeneracy"]:
            json.dumps(run({"experiment":experiment}),allow_nan=False)
        for invalid in [[],{"experiment":"x"},{"h":True},{"h":1.5},{"experiment":"unitarity","scale":0.},{"experiment":"orthogonality","alpha":"A1","i":1},{"experiment":"degeneracy","a":float("nan")}]:
            with self.assertRaises(ValueError):run(invalid)


if __name__=="__main__":unittest.main()
