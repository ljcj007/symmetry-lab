"""Independent order, arithmetic-unit, conjugacy and normalizer certificates."""
import json
import gzip
from pathlib import Path
import sys
import unittest
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import arithmetic_centralizer as ac
import crystkit_browser as c
import crystkit_extensions as ext
import integral_normalizer as n


def group(*generators):
    return ext._point_input({"rotations": [c._from_sympy(g) for g in generators]})


def quaternion_generators():
    return [sp.Matrix([[0, -1, 0, 0], [1, 0, 0, 0], [0, 0, 0, -1], [0, 0, 1, 0]]),
            sp.Matrix([[0, 0, -1, 0], [0, 0, 0, 1], [1, 0, 0, 0], [0, -1, 0, 0]])]


def example(name):
    return json.loads((ROOT / "dist/examples" / name).read_text(encoding="utf-8"))


class ArithmeticTests(unittest.TestCase):
    def test_raw_integer_a4_automorphism_cosets(self):
        catalog = json.loads(gzip.decompress((ROOT / "dist/data/carat/q3.json.gz").read_bytes()))
        entry = next(x for x in catalog["entries"] if x["name"] == "min.14")
        exact_group = ext._point_input({"rotations": entry["generators"]})
        integer_group = [tuple(tuple(int(x) for x in row) for row in g) for g in exact_group]
        generators, images, _ = ac.automorphism_images(integer_group)
        cosets = ac._outer_representatives(integer_group, generators, images)
        self.assertEqual(sum(size for _, size, _ in cosets), len(images))
        result = ac.arithmetic_normalizer(integer_group)
        self.assertTrue(result["complete"])
        self.assertTrue(result["finite"])

    def test_saturated_commutant_order_and_multiplication(self):
        g = ext._point_input(example("centralizer-order.json"))
        result, basis, _ = ac.order_data(g)
        self.assertEqual(result["orderRank"], 4)
        self.assertEqual(result["centerDimension"], 1)
        from sympy.matrices.normalforms import smith_normal_form
        vectors = sp.Matrix.hstack(*(sp.Matrix(list(b)) for b in basis))
        diagonal = smith_normal_form(vectors, domain=sp.ZZ)
        self.assertTrue(all(abs(diagonal[i, i]) == 1 for i in range(4)))
        for i, a in enumerate(basis):
            for j, b in enumerate(basis):
                rebuilt = sum((x*z for x, z in zip(result["multiplicationConstants"][i][j], basis)), sp.zeros(4))
                self.assertEqual(rebuilt, a*b)
        self.assertTrue(all(c._sympy_matrix(gx)*b == b*c._sympy_matrix(gx) for gx in g for b in basis))

    def test_center_crt_separates_distinct_number_fields(self):
        g = group(sp.diag(n._companion(3), n._companion(4)))
        result, _, center = ac.order_data(g, False)
        self.assertEqual(result["centerDimension"], 4)
        self.assertEqual(sorted(p["fieldDegree"] for p in center["components"]), [2, 2])
        projectors = [p["projector"] for p in center["components"]]
        self.assertEqual(sum(projectors, sp.zeros(4)), sp.eye(4))
        self.assertEqual(projectors[0]*projectors[1], sp.zeros(4))

    def test_glued_split_module_congruence_centralizer(self):
        result = ac.run(example("centralizer-glued.json"))
        self.assertTrue(result["unitGroupComplete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["latticeOrbitSize"], 4)
        self.assertEqual(result["ambientLatticeIndex"], 3)
        self.assertEqual(result["splitComponents"], [{"irreducibleDimension": 2, "multiplicity": 2}])
        self.assertTrue(result["everyGeneratorVerified"])

    def test_labelled_split_equivalence_and_exhaustive_negative(self):
        direct = example("centralizer-order.json")["rotations"]
        glued = example("centralizer-glued.json")["rotations"]
        decision = ac.labelled_integral_equivalence(direct, glued)
        self.assertTrue(decision["complete"])
        self.assertFalse(decision["equivalent"])
        B = sp.eye(4)
        B[0, 3] = 7
        transformed = [c._from_sympy(B*sp.Matrix(g)*B.inv()) for g in glued]
        decision = ac.labelled_integral_equivalence(glued, transformed)
        self.assertTrue(decision["equivalent"])
        self.assertEqual(abs(c.determinant(decision["conjugator"])), 1)

    def test_full_glued_split_normalizer(self):
        g = ext._point_input(example("centralizer-glued.json"))
        result = ac.split_normalizer(g)
        self.assertTrue(result["complete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["integralAutomorphismCount"], 6)
        self.assertEqual(result["outerCosetsChecked"], 1)

    def test_lipschitz_and_hurwitz_units_are_exhaustive(self):
        result = ac.centralizer(group(*quaternion_generators()))
        self.assertEqual(result["centralizerOrder"], 8)
        self.assertEqual(len(c.finite_matrix_closure(result["generators"])), 8)
        result = ac.run(example("centralizer-hurwitz.json"))
        self.assertTrue(result["quaternionOrderCertified"])
        self.assertEqual(result["centralizerOrder"], 24)
        self.assertEqual(len(c.finite_matrix_closure(result["generators"])), 24)
        self.assertEqual(result["centerDimension"], 1)

    def test_quaternion_and_infinite_scalar_component(self):
        result = ac.run(example("centralizer-quaternion-mixed.json"))
        self.assertTrue(result["unitGroupComplete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["algorithm"], "central-idempotent-glue-schreier")
        self.assertEqual(result["centerDimension"], 2)

    def test_pell_units_include_nonmaximal_orders_and_negative_norm(self):
        for discriminant, expected_x, expected_b, expected_norm in ((5, 1, 1, -1), (8, 2, 1, -1),
                (12, 4, 1, 1), (20, 4, 1, -1), (45, 7, 1, 1), (61, 39, 5, -1)):
            trace = discriminant % 2
            field_norm = (trace*trace-discriminant)//4
            T = sp.Matrix([[0, -field_norm], [1, trace]])
            # Exercise the actual arbitrary quadratic integer order, independently
            # of the group classification/known cyclotomic special cases.
            result = ac.quadratic_order_units(group(-sp.eye(2)), [sp.eye(2), T])
            self.assertTrue(result["unitGroupComplete"])
            self.assertEqual(result["fundamentalUnitRadical"]["rationalNumerator"], expected_x)
            self.assertEqual(result["fundamentalUnitRadical"]["radicalNumerator"], expected_b)
            self.assertEqual(result["fundamentalUnitFieldNorm"], expected_norm)
            cert = result["pellCertificate"]
            self.assertEqual(cert["p"]**2-discriminant*cert["q"]**2, 1)
        # D=61 has an enormous integer Pell solution, but the certified least
        # order unit requires only five coefficients, not that whole bound.
        self.assertGreater(result["pellCertificate"]["coefficientBound"], 100000000)
        self.assertEqual(result["pellCertificate"]["coefficientsChecked"], 5)

    def test_six_dimensional_a5_real_quadratic_nonmaximal_order(self):
        result = ac.run(example("centralizer-a5.json"))
        self.assertEqual(result["pointGroupOrder"], 60)
        self.assertEqual(result["orderRank"], 2)
        self.assertEqual(result["orderDiscriminant"], 20)
        self.assertEqual(result["fundamentalUnitFieldNorm"], -1)
        self.assertTrue(result["unitGroupComplete"])
        self.assertEqual(result["algorithm"], "quadratic-order-pell-units")

    def test_quadratic_intertwiner_conjugacy_certificate(self):
        left = example("centralizer-a5.json")["rotations"]
        B = sp.eye(6)
        B[0, 5] = 3
        right = [c._from_sympy(B*sp.Matrix(g)*B.inv()) for g in left]
        result = ac.quadratic_integral_equivalence(left, right)
        self.assertTrue(result["complete"])
        self.assertTrue(result["equivalent"])
        witness = c._sympy_matrix(result["conjugator"])
        self.assertTrue(all(witness*sp.Matrix(g) == c._sympy_matrix(h)*witness for g, h in zip(left, right)))
        self.assertLess(result["candidatesBound"], 10000)

    def test_a5_normalizer_exhausts_outer_cosets(self):
        result = ac.run(example("centralizer-a5-normalizer.json"))
        self.assertTrue(result["complete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["rationalAutomorphismCount"], 120)
        self.assertEqual(result["integralAutomorphismCount"], 120)
        self.assertEqual(result["outerCosetsChecked"], 2)
        self.assertTrue(result["everyGeneratorVerified"])

    def test_sign_shortcut_preserves_high_multiplicity(self):
        decomposition = ac.split_decomposition(group(sp.diag(-1, 1, 1, 1, 1, 1)))
        self.assertTrue(decomposition["complete"])
        self.assertEqual(sorted(p["multiplicity"] for p in decomposition["components"]), [1, 5])

    def test_resource_failures_and_bad_inputs_do_not_claim_completeness(self):
        with self.assertRaises(c.SearchLimitError):
            ac.run({**example("centralizer-glued.json"), "max_orbit": 1})
        with self.assertRaises(c.SearchLimitError):
            ac.definite_units(group(*quaternion_generators()), max_vectors=1)
        T = sp.Matrix([[0, 15], [1, 1]])  # discriminant 61
        with self.assertRaises(c.SearchLimitError):
            ac.quadratic_order_units(group(-sp.eye(2)), [sp.eye(2), T], max_unit_candidates=1)
        with self.assertRaises(c.SearchLimitError):
            ac.quadratic_order_units(group(-sp.eye(2)), [sp.eye(2), T], max_pell_steps=1)
        with self.assertRaises(ValueError):
            ac.run({"action": "__import__", "rotations": [[[1]]]})
        with self.assertRaises(ValueError):
            ac.run({"action": "centralizer", "rotations": [[[1]]], "max_orbit": True})

    def test_all_public_examples_execute(self):
        for path in sorted((ROOT / "dist/examples").glob("centralizer-*.json")):
            result = ac.run(json.loads(path.read_text(encoding="utf-8")))
            self.assertTrue(result["complete"], path.name)
            if result["action"] != "order":
                self.assertTrue(result["everyGeneratorVerified"], path.name)


if __name__ == "__main__":
    unittest.main()
