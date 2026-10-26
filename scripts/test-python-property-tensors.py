"""Independent component counts, parity, contraction and covariance checks."""
import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist" / "python"))
from property_tensors import run_tensors, _solve


IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
INVERSION = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]


def compute(preset="cubic_m3m", tensor="dielectric", **kwargs):
    return run_tensors({"preset": preset, "tensor": tensor, "samples": 12, **kwargs})


def custom(rotation=IDENTITY, primed=False, tensor="magnetoelectric", **kwargs):
    return compute("custom", tensor, generators=[{"rotation": rotation, "time_reversal": primed}], **kwargs)


class PropertyTensorTests(unittest.TestCase):
    def test_cubic_dielectric_is_isotropic(self):
        result = compute()
        self.assertEqual(result["independent_count"], 1)
        self.assertEqual(result["form"], [["a1", "0", "0"], ["0", "a1", "0"], ["0", "0", "a1"]])

    def test_cubic_elasticity_has_three_constants(self):
        result = compute(tensor="elasticity")
        self.assertEqual(result["independent_count"], 3)
        self.assertEqual(result["form"][0][0], result["form"][1][1])
        self.assertEqual(result["form"][0][1], result["form"][1][2])
        self.assertEqual(result["form"][3][3], result["form"][5][5])
        self.assertNotEqual(result["form"][0][0], result["form"][0][1])

    def test_inversion_forbids_piezoelectricity(self):
        self.assertEqual(custom(INVERSION, tensor="piezoelectric")["independent_count"], 0)
        self.assertEqual(compute(tensor="piezoelectric")["independent_count"], 0)

    def test_zincblende_piezoelectric_standard_form(self):
        result = compute("zincblende_td", "piezoelectric")
        self.assertEqual(result["independent_count"], 1)
        self.assertEqual(result["form"], [["0", "0", "0", "a1", "0", "0"], ["0", "0", "0", "0", "a1", "0"], ["0", "0", "0", "0", "0", "a1"]])

    def test_tetragonal_standard_counts(self):
        for kind, count in [("dielectric", 2), ("elasticity", 6), ("piezoelectric", 3)]:
            with self.subTest(kind=kind):
                self.assertEqual(compute("tetragonal_4mm", kind)["independent_count"], count)
        self.assertEqual(compute("tetragonal_4mm", "piezoelectric")["form"],
                         [["0", "0", "0", "0", "a1", "0"], ["0", "0", "0", "a1", "0", "0"], ["a2", "a2", "a3", "0", "0", "0"]])

    def test_magnetoelectric_is_forbidden_by_inversion_alone(self):
        self.assertEqual(custom(INVERSION)["independent_count"], 0)

    def test_magnetoelectric_is_forbidden_by_time_reversal_alone(self):
        self.assertEqual(custom(IDENTITY, True)["independent_count"], 0)

    def test_antiinversion_allows_all_nine_me_components(self):
        result = custom(INVERSION, True)
        self.assertEqual(result["independent_count"], 9)
        self.assertNotEqual(result["form"][0][1], result["form"][1][0])

    def test_gray_presets_cannot_have_static_me(self):
        for preset in ("cubic_m3m", "zincblende_td", "tetragonal_4mm", "gray_triclinic"):
            with self.subTest(preset=preset):
                self.assertEqual(compute(preset, "magnetoelectric")["independent_count"], 0)

    def test_chromia_form_and_domain_sign(self):
        result = compute("magnetic_minus3mprime", "magnetoelectric", parameters={"a1": 2, "a2": 3}, field=[1, 2, 3])
        reverse = compute("magnetic_minus3mprime", "magnetoelectric", parameters={"a1": -2, "a2": -3}, field=[1, 2, 3])
        self.assertEqual(result["group"]["magnetic_group"], "−3′m′")
        self.assertEqual(result["form"], [["a1", "0", "0"], ["0", "a1", "0"], ["0", "0", "a2"]])
        self.assertEqual(result["response"]["output"], [2, 4, 9])
        self.assertEqual(reverse["response"]["output"], [-2, -4, -9])

    def test_intrinsic_counts_without_point_constraints(self):
        for kind, count in [("dielectric", 6), ("elasticity", 21), ("piezoelectric", 18), ("magnetoelectric", 9)]:
            with self.subTest(kind=kind):
                self.assertEqual(custom(tensor=kind)["independent_count"], count)

    def test_exact_trigonal_generator(self):
        rotation = [["-1/2", "-sqrt(3)/2", 0], ["sqrt(3)/2", "-1/2", 0], [0, 0, 1]]
        result = custom(rotation, tensor="dielectric")
        self.assertEqual(result["independent_count"], 2)
        self.assertEqual(result["form"], [["a1", "0", "0"], ["0", "a1", "0"], ["0", "0", "a2"]])

    def test_rank_two_rotation_covariance(self):
        result = custom(tensor="dielectric", parameters={"a1": 2, "a2": 0, "a3": 0, "a4": 4, "a5": 0, "a6": 6}, orientation_deg=45, field=[1, 0, 0])
        for actual, expected in zip(result["response"]["output"], [3, -1, 0]):
            self.assertAlmostEqual(actual, expected)

    def test_engineering_shear_factor(self):
        result = compute("zincblende_td", "piezoelectric", parameters={"a1": 2}, strain=[0, 0, 0, 0, 0, 0.2])
        self.assertEqual(result["response"]["output"], [0, 0, 0.4])
        # epsilon_xy = epsilon_yx = 0.1: Pz = e_zxy*0.1 + e_zyx*0.1.
        self.assertAlmostEqual(result["response"]["output"][2], 2 * 0.1 + 2 * 0.1)

    def test_rotating_rank_three_tensor_changes_sign(self):
        result = compute("zincblende_td", "piezoelectric", parameters={"a1": 2}, strain=[0, 0, 0, 0, 0, 0.2], orientation_deg=90)
        self.assertEqual(result["response"]["output"], [0, 0, -0.4])

    def test_rotated_cubic_elastic_constants(self):
        # At 45 degrees about z: C'11=(C11+C12+2*C44)/2,
        # C'12=(C11+C12-2*C44)/2, C'66=(C11-C12)/2.
        result = compute(tensor="elasticity", parameters={"a1": 2, "a2": 10, "a3": 3}, orientation_deg=45)
        form = result["response"]["rotated_form"]
        self.assertAlmostEqual(form[0][0], 9)
        self.assertAlmostEqual(form[0][1], 3)
        self.assertAlmostEqual(form[5][5], 4)
        self.assertAlmostEqual(form[2][2], 10)

    def test_time_even_piezo_under_prime_operations(self):
        self.assertEqual(custom(IDENTITY, True, "piezoelectric")["independent_count"], 18)
        self.assertEqual(custom(INVERSION, True, "piezoelectric")["independent_count"], 0)

    def test_generator_constraints_do_not_require_explicit_closure(self):
        # This rational rotation is not a finite crystallographic point-group
        # operation. Its invariant elastic tensor is transversely isotropic;
        # the engine accepts generators without claiming a group classifier.
        rotation = [["3/5", "-4/5", 0], ["4/5", "3/5", 0], [0, 0, 1]]
        result = custom(rotation, tensor="elasticity")
        self.assertEqual(result["independent_count"], 5)
        self.assertIsNone(result["group"]["point_group"])

    def test_elastic_isotropic_default_and_frobenius_norm(self):
        result = compute(tensor="elasticity", strain=[1, 0, 0, 0, 0, 0])
        self.assertEqual(result["response"]["output"], [3, 1, 1, 0, 0, 0])
        shear = compute(tensor="elasticity", strain=[0, 0, 0, 0, 0, 2])
        self.assertEqual(shear["response"]["output"], [0, 0, 0, 0, 0, 2])
        self.assertAlmostEqual(shear["response"]["magnitude"], math.sqrt(8))
        self.assertTrue(all(abs(item["longitudinal"] - 3) < 1e-10 for item in result["azimuth_curve"]))

    def test_piezo_angular_response_matches_sine_two_theta(self):
        result = compute("zincblende_td", "piezoelectric", parameters={"a1": 3}, samples=36)
        for item in result["azimuth_curve"]:
            self.assertAlmostEqual(item["output"][2], 3 * math.sin(2 * math.radians(item["angle_deg"])))
        self.assertEqual(result["azimuth_curve"][0]["output"], result["azimuth_curve"][-1]["output"])

    def test_xz_scan_distinguishes_chromia_coefficients(self):
        result = compute("magnetic_minus3mprime", "magnetoelectric", parameters={"a1": 2, "a2": 3}, plane="xz")
        self.assertEqual(result["azimuth_curve"][0]["output"], [2, 0, 0])
        self.assertEqual(result["azimuth_curve"][3]["output"], [0, 0, 3])

    def test_cache_reuses_symbolic_solution_for_interaction(self):
        compute("tetragonal_4mm", "elasticity")
        before = _solve.cache_info().hits
        compute("tetragonal_4mm", "elasticity", orientation_deg=71, strain=[0, 1, 0, 0, 0, 0])
        self.assertGreater(_solve.cache_info().hits, before)

    def test_json_exact_basis_and_constraints(self):
        result = compute("magnetic_minus3mprime", "elasticity")
        self.assertEqual(json.loads(json.dumps(result, ensure_ascii=False))["form"], result["form"])
        self.assertEqual(result["constraint_rank"] + result["independent_count"], result["intrinsic_count"])
        self.assertEqual(len(result["basis"]), result["independent_count"])
        self.assertTrue(result["exact"])
        self.assertIn("a1 - 2*a6", result["form"][0])

    def test_reject_nonorthogonal_fractional_matrix(self):
        with self.assertRaisesRegex(ValueError, "正交"):
            custom([[0, -1, 0], [1, -1, 0], [0, 0, 1]])

    def test_reject_unsafe_or_oversized_input(self):
        for value in ["__import__('os').getcwd()", "x", "1/0", "sqrt(1000000)", "2**1000000", True, float("nan")]:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    custom([[value, 0, 0], [0, 1, 0], [0, 0, 1]])
        for kwargs in [{"samples": 10000}, {"field": [True, 0, 0]}, {"parameters": {"bogus": 1}}, {"orientation_deg": float("inf")}, {"plane": "abc"}]:
            with self.subTest(kwargs=kwargs):
                with self.assertRaises(ValueError):
                    compute(**kwargs)
        with self.assertRaises(ValueError):
            compute("custom", generators=[{"rotation": IDENTITY}] * 9)


if __name__ == "__main__":
    unittest.main()
