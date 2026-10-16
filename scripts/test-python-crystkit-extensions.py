"""Independent classification/infinite-lattice tests for CrystKit extensions."""
import json
from pathlib import Path
import sys
import unittest
from fractions import Fraction as F

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import crystkit_browser as c
import crystkit_extensions as e

DB = json.loads((ROOT / "dist/data/space-groups.json").read_text(encoding="utf-8"))


def sg(number):
    return c.affine_closure(c._input_operations({"group_number": number}, DB))


class ExtensionTests(unittest.TestCase):
    def test_all_17_wallpaper_types_from_13_integral_pointgroups(self):
        # Independent standard lattice representatives, not precomputed
        # extension records: the Smith algorithm must recover all 17 types.
        I = [[1, 0], [0, 1]]
        minus = [[-1, 0], [0, -1]]
        r3 = [[0, -1], [1, -1]]
        r4 = [[0, -1], [1, 0]]
        r6 = [[0, -1], [1, 1]]
        swap = [[0, 1], [1, 0]]
        mirror = [[1, 0], [0, -1]]
        groups = [([I], 1), ([minus], 1), ([r3], 1), ([r4], 1), ([r6], 1),
                  ([mirror], 2), ([swap], 1), ([minus, mirror], 3),
                  ([minus, swap], 1), ([r3, swap], 1),
                  ([r3, [[-1, 0], [-1, 1]]], 1), ([r4, mirror], 2), ([r6, swap], 1)]
        total = 0
        for generators, expected in groups:
            result = e.run({"action": "extension_orbits", "point_generators": generators})
            self.assertTrue(result["classificationCompleteForIntegralPointGroup"])
            self.assertEqual(result["orbitCount"], expected)
            total += result["orbitCount"]
            for representative in result["representatives"]:
                operations = [c.operation(op) for op in representative["operations"]]
                self.assertEqual(set(c.affine_closure(operations)), set(operations))
        self.assertEqual(total, 17)

    def test_screw_axis_extension_orders(self):
        rotations = [(3, [[0, -1, 0], [1, -1, 0], [0, 0, 1]]),
                     (4, [[0, -1, 0], [1, 0, 0], [0, 0, 1]]),
                     (6, [[0, -1, 0], [1, 1, 0], [0, 0, 1]])]
        for order, rotation in rotations:
            result = e.run({"action": "extensions", "rotations": [rotation]})
            self.assertEqual(result["cohomologyInvariants"], [order])
            self.assertEqual(result["extensionCount"], order)
            self.assertTrue(result["complete"])

    def test_six_dimensional_cohomology(self):
        # C3 acts on a triangular 2D block and fixes four independent axes.
        # H²(C3,L) = L^C3 / (1+R+R²)L = (Z/3)^4.
        rotation = [list(row) for row in c.identity(6)]
        rotation[0][:2], rotation[1][:2] = [0, -1], [1, -1]
        result = e.run({"action": "extensions", "rotations": [rotation], "include_operations": False})
        self.assertEqual(result["cohomologyInvariants"], [3, 3, 3, 3])
        self.assertEqual(result["extensionCount"], 81)

    def test_infinite_normalizer_orbit_not_truncated_metric_group(self):
        rotation = [[-1, 0, 0, 0], [0, -1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
        result = e.run({"action": "extension_orbits", "rotations": [rotation]})
        self.assertTrue(result["normalizerComplete"])
        self.assertFalse(result["normalizer"]["finite"])
        self.assertEqual(result["cohomologyInvariants"], [2, 2])
        self.assertEqual(result["orbitCount"], 2)
        self.assertEqual(sorted(len(o["extensionIndices"]) for o in result["orbits"]), [1, 3])

    def test_nonorthogonal_integral_setting_has_full_character_normalizer(self):
        group = c.finite_matrix_closure([[[1, 0], [0, -1]]])
        b = c.matrix([[1, 3], [0, 1]])
        transformed = [c.matmul(c.matmul(c.inverse(b), g), b) for g in group]
        result = e.integral_normalizer(transformed)
        self.assertTrue(result["complete"])
        self.assertEqual(result["normalizerOrder"], 4)
        self.assertGreater(max(abs(x) for n in result["generators"] for row in n for x in row), 1)

    def test_unique_form_normalizer_and_incomplete_scope(self):
        r4 = c.finite_matrix_closure([[[0, -1], [1, 0]]])
        result = e.integral_normalizer(r4)
        self.assertTrue(result["complete"])
        self.assertEqual(result["normalizerOrder"], 8)
        axis = c.finite_matrix_closure([[[0, -1, 0], [1, 0, 0], [0, 0, 1]]])
        result = e.integral_normalizer(axis)
        self.assertFalse(result["complete"])
        self.assertIn("not established", result["scope"])

    def test_exact_origin_solution_and_cohomology_invariance(self):
        operations = sg(227)
        origin = [F(1, 1009), F(-2, 1013), F(3, 1019)]
        target = c.change_basis(operations, c.identity(3), origin)
        solved = e.exact_origin_conjugator(operations, target)
        self.assertIsNotNone(solved)
        transformed = c.change_basis(operations, c.identity(3), solved)
        self.assertEqual({(r, tuple(x % 1 for x in t)) for r, t in transformed},
                         {(r, tuple(x % 1 for x in t)) for r, t in target})
        data = e.extension_data([r for r, _ in operations])
        self.assertEqual(e._class_label(data, operations), e._class_label(data, target))
        self.assertIsNone(e.exact_origin_conjugator(sg(75), sg(76)))

    def test_class_representatives_distinct_under_all_origins(self):
        group = c.finite_matrix_closure([[[0, -1, 0], [1, 0, 0], [0, 0, 1]]])
        data = e.extension_data(group)
        for i, (label, x) in enumerate(data["classes"]):
            left = e._class_operations(data, x)
            self.assertEqual(e._class_label(data, left), label)
            for _, y in data["classes"][i+1:]:
                self.assertIsNone(e.exact_origin_conjugator(left, e._class_operations(data, y)))

    def test_every_existing_230_spacegroup_has_verified_cohomology_representative(self):
        cached = {}
        for record in DB["groups"]:
            operations = sg(record["number"])
            group = tuple(r for r, _ in operations)
            if group not in cached:
                cached[group] = e.extension_data(list(group))
            data = cached[group]
            label = e._class_label(data, operations)
            representative = e._class_operations(data, dict(data["classes"])[label])
            self.assertIsNotNone(e.exact_origin_conjugator(operations, representative), record["number"])
        self.assertEqual(len(cached), 73)

    def test_orientation_cover_retains_handedness_evidence(self):
        result = e.run({"action": "extension_orbits", "group_number": 76}, DB)
        screw = next(o for o in result["orbits"] if len(o["extensionIndices"]) == 2)
        self.assertFalse(screw["improperStabilizerFound"])
        self.assertEqual(len(screw["positiveOrbit"]), 1)
        self.assertEqual(len(screw["negativeOrbit"]), 1)
        # A finite metric normalizer is not silently declared the full one.
        self.assertIsNone(screw["enantiomorphicPair"])

    def test_infinite_group_minimum_is_not_finite_quotient_minimum(self):
        for number, minimum, torsion, rank in [(1, 3, [], 3), (2, 4, [2, 2, 2, 2], 0),
                                              (19, 2, [4, 4], 0), (76, 2, [2], 1), (227, 2, [2, 2], 0)]:
            result = e.run({"action": "spacegroup_generators", "group_number": number}, DB)
            self.assertTrue(result["minimumCertified"], number)
            self.assertEqual(result["minimumGeneratorCount"], minimum, number)
            self.assertEqual(result["abelianization"]["torsionInvariants"], torsion, number)
            self.assertEqual(result["abelianization"]["freeRank"], rank, number)
            self.assertTrue(result["generationCertificate"]["generates"])
            self.assertEqual(result["generationCertificate"]["translationIndex"], 1)

    def test_literal_upstream_sg227_readme_two_generators(self):
        matrices = [
            [[0, -1, 0, "1/2"], [0, 0, -1, "1/2"], [-1, 0, 0, "1/2"], [0, 0, 0, 1]],
            [["-15/4", "29/4", "-15/4", "-15/16"], ["-33/8", "55/8", "-25/8", "-25/32"],
             ["-25/8", "55/8", "-33/8", "-41/32"], [0, 0, 0, 1]]]
        original = [c.operation(g) for g in matrices]
        simplified = c.simplify_affine_generators(original)
        transformed = c.change_basis(original, simplified["basis"], simplified["origin"])
        cert = e.generation_certificate(transformed, simplified["operations"])
        self.assertTrue(cert["generates"])
        result = e.infinite_generators(simplified["operations"], [c.operation_json(g) for g in transformed])
        self.assertEqual(result["minimumGeneratorCount"], 2)

    def test_lattice_index_detects_missing_translations(self):
        target = [(c.identity(2), (F(0), F(0)))]
        candidates = [(c.identity(2), (F(2), F(0))), (c.identity(2), (F(0), F(3)))]
        result = e.generation_certificate(candidates, target)
        self.assertFalse(result["generates"])
        self.assertEqual(result["translationIndex"], 6)
        outside = [(c.identity(2), (F(1, 2), F(0)))]
        self.assertFalse(e.generation_certificate(outside, target)["generates"])

    def test_comparison_certificate_and_unestablished_search(self):
        result = e.run({"action": "affine_compare", "left": {"group_number": 76}, "right": {"group_number": 78},
                        "bases": [[[-1, 0, 0], [0, 1, 0], [0, 0, 1]]]}, DB)
        self.assertTrue(result["identityVerified"])
        self.assertFalse(result["orientationPreserved"])
        result = e.run({"action": "affine_compare", "left": {"group_number": 76}, "right": {"group_number": 78}}, DB)
        self.assertIsNone(result["equivalent"])

    def test_limits_and_invalid_input_are_explicit(self):
        with self.assertRaises(c.SearchLimitError):
            e.run({"action": "extensions", "rotations": [[[-1, 0], [0, 1]]], "max_classes": 1})
        with self.assertRaises(ValueError):
            e.run({"action": "extension_orbits", "rotations": [[[-1, 0], [0, 1]]], "normalizers": [[[1, 1], [0, 1]]]})
        with self.assertRaises(ValueError):
            e.run({"rotations": [[[2, 0], [0, 1]]]})
        limited = e.run({"action": "spacegroup_generators", "group_number": 227, "max_trials": 0}, DB)
        self.assertFalse(limited["minimumCertified"])
        self.assertIsNone(limited["minimumGeneratorCount"])
        self.assertTrue(limited["generationCertificate"]["generates"])
        for invalid in [True, -1, 1.5, float("inf"), 120001]:
            with self.assertRaises(ValueError):
                e.run({"action": "extensions", "rotations": [[[1, 0], [0, 1]]], "max_order": invalid})
        with self.assertRaises(c.SearchLimitError):
            e.run({"action": "extensions", "rotations": [[[2, 1], [1, 1]]], "max_order": 120000})


if __name__ == "__main__":
    unittest.main()
