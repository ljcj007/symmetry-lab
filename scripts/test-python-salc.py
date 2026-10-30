"""Independent algebra/physics regression checks for the C4v teaching model."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist" / "python"))
import salc_lab as salc


def unpack(value):
    return np.asarray(value["re"], dtype=float) + 1j * np.asarray(value["im"], dtype=float)


class SalcTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.group = salc.group_closure([salc.C4, salc.MIRROR])
        cls.content = json.loads((ROOT / "dist/data/salc-content.json").read_text(encoding="utf-8"))

    def test_group_is_d4_and_has_correct_generator_relations(self):
        self.assertEqual(len(self.group), 8)
        np.testing.assert_array_equal(np.linalg.matrix_power(salc.C4, 4), np.eye(2))
        np.testing.assert_array_equal(salc.MIRROR @ salc.MIRROR, np.eye(2))
        np.testing.assert_array_equal(salc.MIRROR @ salc.C4 @ salc.MIRROR, salc.C4.T)

    def test_explicit_site_action_and_representation_product(self):
        expected = np.array([[0, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]])
        np.testing.assert_array_equal(salc.permutation(salc.C4), expected)
        np.testing.assert_array_equal(salc.permutation(salc.MIRROR), np.eye(4)[:, [0, 3, 2, 1]])
        for g in self.group:
            d = salc.permutation(g)
            np.testing.assert_array_equal(d.T @ d, np.eye(4))
            for h in self.group:
                np.testing.assert_array_equal(salc.permutation(g @ h), d @ salc.permutation(h))

    def test_character_table_orthogonality_and_multiplicities(self):
        chars = np.array([[salc.character(ir, g) for g in self.group] for ir in salc.IRREPS])
        np.testing.assert_array_equal(chars @ chars.T, 8 * np.eye(5))
        reducible = np.array([np.trace(salc.permutation(g)) for g in self.group])
        np.testing.assert_array_equal(chars @ reducible / 8, [1, 0, 1, 0, 1])

    def test_projector_algebra_in_four_and_eight_dimensions(self):
        for copies in (1, 2):
            ps = [salc.projector(ir, self.group, copies) for ir in salc.IRREPS]
            np.testing.assert_allclose(sum(ps), np.eye(4 * copies), atol=1e-14)
            for i, p in enumerate(ps):
                np.testing.assert_allclose(p, p.T, atol=1e-14)
                for j, q in enumerate(ps):
                    np.testing.assert_allclose(p @ q, p if i == j else np.zeros_like(p), atol=1e-14)
            self.assertEqual([round(np.trace(p)) for p in ps], [copies, 0, copies, 0, 2 * copies])

    def test_matrix_element_projector_multiplication(self):
        for copies in (1, 2):
            p = {(m, n): salc.matrix_projector(m, n, self.group, copies) for m in range(2) for n in range(2)}
            np.testing.assert_allclose(p[0, 0] + p[1, 1], salc.projector("E", self.group, copies), atol=1e-14)
            for m, n in p:
                for r, s in p:
                    expected = p[m, s] if n == r else np.zeros_like(p[m, s])
                    np.testing.assert_allclose(p[m, n] @ p[r, s], expected, atol=1e-14)

    def test_constructed_salc_matches_analytic_vectors(self):
        expected = np.array([[0.5, 0.5, 1 / math.sqrt(2), 0],
                             [0.5, -0.5, 0, 1 / math.sqrt(2)],
                             [0.5, 0.5, -1 / math.sqrt(2), 0],
                             [0.5, -0.5, 0, -1 / math.sqrt(2)]])
        basis, _, _ = salc.construct_basis()
        np.testing.assert_allclose(basis, expected, atol=1e-14)
        np.testing.assert_allclose(basis.T @ basis, np.eye(4), atol=1e-14)

    def test_partners_share_cartesian_irrep_and_copies_are_independent(self):
        for copies in (1, 2):
            basis, sectors, _ = salc.construct_basis(copies)
            np.testing.assert_allclose(basis.T @ basis, np.eye(4 * copies), atol=1e-14)
            for ir, vectors in sectors.items():
                np.testing.assert_allclose(vectors @ vectors.T, salc.projector(ir, self.group, copies), atol=1e-14)
            for g in self.group:
                e = sectors["E"]
                np.testing.assert_allclose(e.T @ salc.permutation(g, copies) @ e, np.kron(np.eye(copies), g), atol=1e-14)

    def test_schur_structure_with_repeated_irreps(self):
        result = salc.calculate(dict(copies=2, crossHop=0.6, copyOffset=0.8))
        h = unpack(result["salc"]["blockedHamiltonian"])
        copy = np.array([[0, 0.6], [0.6, 0.8]])
        np.testing.assert_allclose(h[:2, :2], copy - 2 * np.eye(2), atol=1e-14)
        np.testing.assert_allclose(h[2:4, 2:4], copy + 2 * np.eye(2), atol=1e-14)
        np.testing.assert_allclose(h[4:, 4:], np.kron(copy, np.eye(2)), atol=1e-14)
        np.testing.assert_allclose(h[:4, 4:], 0, atol=1e-14)

    def test_unbroken_energy_levels_against_closed_form(self):
        result = salc.calculate(dict(copies=2, hop=-0.7, crossHop=0.6, copyOffset=0.8))
        shift = [0.4 - math.sqrt(0.4 ** 2 + 0.6 ** 2), 0.4 + math.sqrt(0.4 ** 2 + 0.6 ** 2)]
        expected = sorted([e + s for e in (-1.4, 0, 0, 1.4) for s in shift])
        np.testing.assert_allclose(result["salc"]["eigenvalues"], expected, atol=1e-13)

    def test_broken_energy_levels_against_closed_form(self):
        delta, hop = 0.7, -0.9
        result = salc.calculate(dict(retainC4=0, retainMirror=1, anisotropy=delta, hop=hop))
        outer = math.sqrt((2 * hop) ** 2 + delta ** 2)
        np.testing.assert_allclose(result["salc"]["eigenvalues"], sorted([-outer, outer, -delta, delta]), atol=1e-13)
        h = unpack(result["salc"]["blockedHamiltonian"])
        self.assertAlmostEqual(h[0, 1].real, delta)
        self.assertGreater(result["checks"]["motherGroupCommutator"], 0.5)
        self.assertLess(result["checks"]["retainedCommutatorResidual"], 1e-13)

    def test_operator_covariance_from_actual_matrices(self):
        for copies in (1, 2):
            ops = salc.operator_matrices(copies)
            for g in self.group:
                d = salc.permutation(g, copies)
                for j, key in enumerate(("X", "Y")):
                    expected = g[0, j] * ops["X"] + g[1, j] * ops["Y"]
                    np.testing.assert_allclose(d @ ops[key] @ d.T, expected, atol=1e-14)
                for key, ir in (("scalar", "A1"), ("quadrupole", "B1"), ("axial", "A2")):
                    np.testing.assert_allclose(d @ ops[key] @ d.T, salc.character(ir, g) * ops[key], atol=1e-14)
                    np.testing.assert_allclose(ops[key].conj().T, ops[key], atol=1e-14)

    def test_finite_group_tensor_products_not_su2_rules(self):
        self.assertEqual([salc.selection_multiplicity("E", "E", ir) for ir in salc.IRREPS], [1, 1, 1, 1, 0])
        self.assertEqual(salc.selection_multiplicity("A1", "E", "B1"), 0)
        self.assertEqual(salc.selection_multiplicity("A1", "B1", "B1"), 1)
        self.assertEqual(salc.selection_multiplicity("E", "A2", "E"), 1)

    def test_all_forbidden_blocks_vanish_and_axial_has_imaginary_elements(self):
        for copies in (1, 2):
            for kind in ("dipole", "scalar", "quadrupole", "axial"):
                r = salc.calculate(dict(copies=copies, operatorType=kind, polarizationAngle=37))
                for item in r["salc"]["selection"]:
                    if not item["multiplicity"]:
                        self.assertLess(item["strength"], 1e-24)
                if kind == "axial":
                    eblock = unpack(r["salc"]["blockedOperator"])[2 * copies:, 2 * copies:]
                    np.testing.assert_allclose(eblock, np.kron(np.eye(copies), [[0, -1j], [1j, 0]]), atol=1e-14)

    def test_polarization_strength_and_allowed_zero(self):
        for angle in (0, 21, 45, 90):
            r = salc.calculate(dict(polarizationAngle=angle))
            o = unpack(r["salc"]["blockedOperator"])
            theta = math.radians(angle)
            self.assertAlmostEqual(abs(o[2, 0]) ** 2, math.cos(theta) ** 2 / 2)
            self.assertAlmostEqual(abs(o[3, 0]) ** 2, math.sin(theta) ** 2 / 2)
            self.assertAlmostEqual(sum(abs(o[2:, 0]) ** 2), 0.5)
        r = salc.calculate(dict(operatorScale=0))
        allowed = next(x for x in r["salc"]["selection"] if x["initial"] == "A1" and x["final"] == "E")
        self.assertEqual(allowed["multiplicity"], 1)
        self.assertEqual(allowed["strength"], 0)

    def test_subgroup_closure_and_minimal_breaking_are_real_constraints(self):
        expected = {(1, 1): (8, "C4v"), (1, 0): (4, "C4"), (0, 1): (2, "Cs"), (0, 0): (1, "C1")}
        for (c4, mirror), (order, label) in expected.items():
            r = salc.calculate(dict(retainC4=c4, retainMirror=mirror))
            self.assertEqual(r["salc"]["retainedOrder"], order)
            self.assertEqual(r["subgroupGraph"]["selected"], label)
            for edge in r["subgroupGraph"]["edges"]:
                self.assertIn("from", edge)
            self.assertLess(r["checks"]["retainedCommutatorResidual"], 1e-13)
        challenge = salc.calculate({})["breaking"]
        self.assertEqual(challenge["minimalCount"], 1)
        outcomes = {tuple(x["removed"]): x["achieved"] for x in challenge["candidates"]}
        self.assertEqual(outcomes, {(): False, ("c4",): True, ("mirror",): False, ("c4", "mirror"): True})

    def test_group_average_is_orthogonal_projection(self):
        rng = np.random.default_rng(88)
        raw = rng.normal(size=(4, 4))
        raw = raw + raw.T
        for generators in ([salc.C4, salc.MIRROR], [salc.C4], [salc.MIRROR], []):
            group = salc.group_closure(generators)
            avg = salc.reynolds(raw, group)
            np.testing.assert_allclose(salc.reynolds(avg, group), avg, atol=1e-13)
            for g in group:
                d = salc.permutation(g)
                np.testing.assert_allclose(avg @ d, d @ avg, atol=1e-13)

    def test_replay_converges_to_selected_projected_seed(self):
        for target in ("A1", "B1", "E"):
            for seed in range(4):
                r = salc.calculate(dict(copies=2, targetIrrep=target, seedSite=seed))
                replay = r["replay"]
                projected = unpack(r["salc"]["projector"]) @ np.eye(8)[:, seed]
                np.testing.assert_allclose(unpack(replay[8]["vector"]), projected, atol=1e-14)
                np.testing.assert_allclose(unpack(replay[9]["vector"]), projected / np.linalg.norm(projected), atol=1e-14)
                self.assertEqual(len(replay[9]["points"]), 8)

    def test_grading_references_are_full_invariant_isotypic_spaces(self):
        rng = np.random.default_rng(111)
        for copies in (1, 2):
            for ir in ("A1", "B1", "E"):
                r = salc.calculate(dict(copies=copies, targetIrrep=ir))
                task = r["grading"]["tasks"][0]
                q = unpack(task["reference"])
                self.assertEqual(q.shape, (4 * copies, salc.DIMENSIONS[ir] * copies))
                expected_p = salc.projector(ir, self.group, copies)
                np.testing.assert_allclose(q @ q.conj().T, expected_p, atol=1e-14)
                transform = rng.normal(size=(q.shape[1], q.shape[1])) + 1j * rng.normal(size=(q.shape[1], q.shape[1])) + 3 * np.eye(q.shape[1])
                changed = q @ transform
                np.testing.assert_allclose(changed @ np.linalg.pinv(changed), expected_p, atol=1e-13)
                for operator in task["operators"]:
                    d = unpack(operator)
                    np.testing.assert_allclose((np.eye(q.shape[0]) - expected_p) @ d @ q, 0, atol=1e-14)

    def test_output_serializes_complex_operators_and_all_presets(self):
        for preset in self.content["module"]["presets"]:
            result = salc.calculate(preset["input"])
            self.assertTrue(result["checks"]["passed"])
            json.dumps(result, allow_nan=False)
            self.assertEqual(result["release"], self.content["release"])
            self.assertTrue(result["warnings"])

    def test_content_references_and_course_structure(self):
        c = self.content
        self.assertEqual(len(c["lessons"]), 3)
        self.assertEqual(len(c["exercises"]), 3)
        self.assertEqual(len(c["cases"]), 3)
        self.assertEqual(len(c["module"]["presets"]), 6)
        self.assertEqual(len(c["module"]["predictions"]), 2)
        sources = {s["id"] for s in c["sources"]}
        presets = {s["id"] for s in c["module"]["presets"]}
        for lesson in c["lessons"]:
            self.assertEqual(len(lesson["sections"]), 4)
            self.assertTrue(set(lesson["references"]) <= sources)
            self.assertIn(lesson["preset"], presets)
        for exercise in c["exercises"]:
            self.assertEqual(len(exercise["steps"]), 4)
            for step in exercise["steps"]:
                self.assertTrue(0 <= step["answer"] < len(step["choices"]))

    def test_invalid_inputs_fail_explicitly(self):
        invalid = [None, [], {"unknown": 1}, {"copies": 3}, {"copies": 1.5}, {"copies": True},
                   {"seedSite": -1}, {"seedSite": 4}, {"retainC4": 0.5}, {"retainMirror": "1"},
                   {"operatorType": "magical"}, {"targetIrrep": "A2"}, {"targetIrrep": []},
                   {"hop": float("nan")}, {"copyOffset": float("inf")}, {"operatorScale": 6}]
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    salc.calculate(value)


if __name__ == "__main__":
    unittest.main()
