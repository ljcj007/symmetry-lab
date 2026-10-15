"""Scientific regression and negative tests for the Python CrystKit port."""
from fractions import Fraction as F
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("crystkit_browser", ROOT / "dist/python/crystkit_browser.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
DB = json.loads((ROOT / "dist/data/space-groups.json").read_text(encoding="utf-8"))


def ops(number):
    return list(map(c.operation, DB["groups"][number-1]["operations"]))


class CrystKitTests(unittest.TestCase):
    def test_finite_orders_match_crystallographic_restriction(self):
        self.assertEqual(c.phipn_inverse(1), [2])
        self.assertEqual(c.phipn_inverse(2), [3, 4])
        self.assertEqual(c.phipn_inverse(4), [5, 8])
        self.assertEqual(c.new_finite_orders_glz(1), [])
        self.assertEqual(c.new_finite_orders_glz(2), [3, 4, 6])
        self.assertEqual(c.new_finite_orders_glz(3), [])
        self.assertEqual(c.new_finite_orders_glz(4), [5, 8, 10, 12])
        self.assertEqual(c.finite_orders_glz(3), [1, 2, 3, 4, 6])
        self.assertEqual(c.finite_orders_glz(4), [1, 2, 3, 4, 5, 6, 8, 10, 12])

    def test_orders_independent_cyclotomic_dynamic_program(self):
        # Independently combine rational cyclotomic blocks and compare every
        # realizable order through dimension 12, not merely stored examples.
        from math import lcm
        from sympy import totient
        max_dimension = 12
        states = [{1}]+[set() for _ in range(max_dimension)]
        for d in range(1, max_dimension+1):
            for order in range(1, 181):
                degree = int(totient(order))
                if degree <= d:
                    states[d].update(lcm(old, order) for old in states[d-degree])
            self.assertEqual(set(c.finite_orders_glz(d)), states[d])

    def test_affine_inverse_basis_and_composition(self):
        b = c.matrix([[2, 1, 0], [0, 3, 1], [1, 0, 2]])
        origin = [F(2, 7), F(-3, 11), F(5, 13)]
        group = ops(19)
        transform = b, tuple(origin)
        transformed = c.change_basis(group, b, origin)
        inverse = c.inverse_operation(transform)
        recovered = c.change_basis(transformed, inverse[0], inverse[1])
        self.assertEqual(recovered, group)
        for a in group:
            self.assertEqual(c.compose(a, c.inverse_operation(a)), c.affine_identity(3))
        for a in group:
            for h in group:
                self.assertEqual(c.change_basis([c.compose(a, h)], b, origin)[0],
                                 c.compose(c.change_basis([a], b, origin)[0], c.change_basis([h], b, origin)[0]))

    def test_all_230_database_closures_and_gram_invariance(self):
        for entry in DB["groups"]:
            group = list(map(c.operation, entry["operations"]))
            closed = c.affine_closure(group)
            normalized = {(r, tuple(x % 1 for x in t)) for r, t in group}
            self.assertEqual(set(closed), normalized, entry["number"])
            gram = c.invariant_gram([r for r, _ in group])
            for r, _ in group:
                self.assertEqual(c.matmul(c.matmul(c.transpose(r), gram), r), gram)

    def test_generators_solvability_and_orbit(self):
        for number, count in [(1, 0), (2, 1), (19, 2), (75, 1), (225, 2)]:
            result = c.run({"group_number": number, "point": ["1/7", "2/11", "3/13"]}, DB)
            self.assertEqual(result["quotient"]["minimumGeneratorCount"], count)
            self.assertTrue(result["quotient"]["solvable"])
            self.assertTrue(result["orbit"]["orbitStabilizerVerified"])
            self.assertTrue(result["gramInvariantVerified"])
            self.assertIn(number, [m["number"] for m in result["identification"]["matches"]])
        special = c.point_orbit(ops(2), [0, 0, 0])
        self.assertEqual(special["multiplicity"], 1)
        self.assertEqual(special["stabilizerOrder"], 2)

    def test_exact_origin_matching_and_screw_nonmatch(self):
        for number in [2, 19, 76, 144, 212, 225, 227]:
            source = ops(number)
            moved = c.affine_closure(c.change_basis(source, c.identity(3), [F(2, 17), F(-3, 19), F(7, 23)]))
            target = c.affine_closure(source)
            result = c.affine_equivalence(moved, target, [c.identity(3)])
            self.assertEqual(result["status"], "verified", number)
        self.assertIsNone(c._origin_solution(c.affine_closure(ops(75)), c.affine_closure(ops(76))))

    def test_normalizer_orbit_and_symmorphic_classification(self):
        reflection = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]
        result = c.orbit_space_group_by_normalizers(ops(76), [reflection])
        self.assertEqual(result["orbitSize"], 2)
        self.assertEqual(c.orbit_space_group_by_normalizers(ops(75), [reflection])["orbitSize"], 1)
        with self.assertRaises(ValueError):
            c.orbit_space_group_by_normalizers(ops(76), [[[1, 1, 0], [0, 1, 0], [0, 0, 1]]])
        symmorphic = []
        for entry in DB["groups"]:
            group = ops(entry["number"])
            zero = [(r, (F(0),)*3) for r, _ in group]
            if c._origin_solution(group, zero) is not None:
                symmorphic.append(entry["number"])
        self.assertEqual(len(symmorphic), 73)
        self.assertIn(225, symmorphic)
        self.assertNotIn(227, symmorphic)

    def test_enantiomorphs_orientation_and_basis_certificate(self):
        for a, b in [(76, 78), (144, 145), (212, 213)]:
            result = c.affine_equivalence(c.affine_closure(ops(a)), c.affine_closure(ops(b)))
            self.assertEqual(result["status"], "verified")
            self.assertLess(result["determinant"], 0)
            positive = c.affine_equivalence(c.affine_closure(ops(a)), c.affine_closure(ops(b)), positive_only=True)
            self.assertEqual(positive["status"], "no_match_in_search")
        result = c.run({"group_number": 76}, DB)
        self.assertEqual(result["enantiomorphicPartner"], 78)

    def test_simplification_recovers_arbitrary_rational_setting(self):
        for number in [1, 2, 19, 76, 212, 227]:
            group = ops(number)
            b = c.matrix([[2, 1, 0], [0, 3, 1], [1, 0, 2]])
            origin = [F(1, 7), F(2, 11), F(3, 13)]
            inverse = c.inverse_operation((b, tuple(origin)))
            transformed = c.change_basis(group, inverse[0], inverse[1])
            result = c.simplify_affine_generators(transformed, b)
            self.assertEqual(result["pointGroupOrder"], len(group), number)
            self.assertTrue(result["orientationPreserved"])
            self.assertTrue(result["denominatorBoundVerified"])
            normalized_original = c.affine_closure(c.change_basis(transformed, result["basis"], result["origin"]))
            self.assertEqual(normalized_original, result["operations"])

    def test_upstream_readme_nonstandard_sg227(self):
        # Literal two generators from CrystKit README. The translation lattice
        # is inferred from the group; no integer translations are adjoined.
        generators = [
            [[0, -1, 0, "1/2"], [0, 0, -1, "1/2"], [-1, 0, 0, "1/2"], [0, 0, 0, 1]],
            [["-15/4", "29/4", "-15/4", "-15/16"], ["-33/8", "55/8", "-25/8", "-25/32"],
             ["-25/8", "55/8", "-33/8", "-41/32"], [0, 0, 0, 1]]]
        result = c.simplify_affine_generators(list(map(c.operation, generators)))
        self.assertEqual(result["pointGroupOrder"], 48)
        self.assertEqual(result["translationLatticeRank"], 3)
        self.assertTrue(result["denominatorBoundVerified"])
        self.assertTrue(result["orientationPreserved"])

    def test_rational_matrix_conjugacy_and_negative(self):
        left = [r for r, _ in ops(19)]
        basis = c.matrix([[2, 1, 0], [0, 3, 1], [1, 0, 2]])
        right = [c.matmul(c.matmul(c.inverse(basis), r), basis) for r in left]
        result = c.conjugator_matrix_groups(left, right)
        self.assertEqual(result["status"], "verified")
        self.assertTrue(result["identityVerified"])
        # C4 and C2xC2 have equal orders but cannot be conjugate.
        negative = c.conjugator_matrix_groups([r for r, _ in ops(75)], left)
        self.assertEqual(negative["status"], "not_conjugate")

    def test_contiguous_blocks_reconstruct_rectangular_matrix(self):
        for data in [[[2, 0, 0], [0, 3, 1], [0, 1, 4]], [[1, 0, 0], [0, 0, 0]], [[1], [0], [0]], [[0, 0], [0, 0]]]:
            blocks = c.direct_sum_decomposition_matrix(data)
            rebuilt = [[F(0)]*len(data[0]) for _ in data]
            for block in blocks:
                for i, row in enumerate(block["matrix"], block["rows"][0]):
                    for j, value in enumerate(row, block["columns"][0]):
                        rebuilt[i][j] = value
            self.assertEqual(rebuilt, data)

    def test_invalid_nonfinite_and_noncrystallographic_inputs(self):
        for value in [float("nan"), float("inf"), "__import__('os')", True]:
            with self.assertRaises(ValueError):
                c.rational(value)
        with self.assertRaises(ValueError):
            c.affine_closure([c.operation({"rotation": [[2, 0], [0, 1]]})])
        with self.assertRaises(c.SearchLimitError):
            c.finite_matrix_closure([[[1, 1], [0, 1]]], max_order=16)
        with self.assertRaises(ValueError):
            c.simplify_affine_generators([c.affine_identity(3)])
        with self.assertRaises(ValueError):
            c.run({"action": "finite_orders", "dimension": -1})
        with self.assertRaises(ValueError):
            c.run({"operations": [{"rotation": [[1]], "antiunitary": True}]})


if __name__ == "__main__":
    unittest.main(verbosity=2)
