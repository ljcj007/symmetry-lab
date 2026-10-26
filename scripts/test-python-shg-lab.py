"""Physical checks for frequency-degenerate SHG without Kleinman symmetry."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist" / "python"))
from shg_lab import run


def tensor_from(result):
    return np.array([[[complex(x["re"], x["im"]) for x in row] for row in plane]
                     for plane in result["tensor"]["crystal"]])


def amplitude_from(result, channel):
    return np.array([complex(x["re"], x["im"]) for x in result["scan"]["channels"][channel]["amplitudes"]])


def explicit_rotate(tensor, matrix):
    # Independent index-loop reference, deliberately not the implementation einsum.
    out = np.zeros((3, 3, 3), dtype=complex)
    for i, j, k in np.ndindex(3, 3, 3):
        out[i, j, k] = sum(matrix[i, a] * matrix[j, b] * matrix[k, c] * tensor[a, b, c]
                           for a, b, c in np.ndindex(3, 3, 3))
    return out


class ShgLabTests(unittest.TestCase):
    def test_gaas_001_four_channels_against_analytic_formula(self):
        # From direct Cartesian contractions for Q=Rz(phi), a=chi_xyz.
        angle, a = 37., .7 + .4j
        r = run({"incidence": angle, "coefficients": {"xyz": {"re": a.real, "im": a.imag}}})
        phi = np.radians(r["scan"]["angles"])
        s, c = math.sin(math.radians(angle)), math.cos(math.radians(angle))
        expected = {"PP": -a * c*c*s * np.sin(2*phi),
                    "PS": 2*a*c*s * np.cos(2*phi),
                    "SP": -a*s * np.sin(2*phi), "SS": np.zeros(len(phi))}
        for channel, values in expected.items():
            np.testing.assert_allclose(amplitude_from(r, channel), values, atol=8e-16)
            np.testing.assert_allclose(r["scan"]["channels"][channel]["intensities"], abs(values)**2, atol=8e-16)
        self.assertGreater(max(r["scan"]["channels"]["PP"]["intensities"]), .01)

    def test_gaas_generators_covariance(self):
        tensor = tensor_from(run())
        c3 = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]])
        mirror = np.array([[0, 1, 0], [1, 0, 0], [0, 0, 1]])
        c2 = np.diag([-1., -1., 1.])
        for op in (c3, mirror, c2):
            np.testing.assert_equal(explicit_rotate(tensor, op), tensor)
        self.assertEqual(run()["symmetry"]["order"], 24)

    def test_4mm_only_last_two_indices_symmetric(self):
        r = run({"model": "batio3", "coefficients": {"xxz": 2, "zxx": 3, "zzz": 5}})
        tensor = tensor_from(r)
        np.testing.assert_equal(tensor, tensor.swapaxes(1, 2))
        self.assertEqual(tensor[0, 0, 2], 2)
        self.assertEqual(tensor[0, 2, 0], 2)
        self.assertEqual(tensor[2, 0, 0], 3)
        self.assertFalse(np.array_equal(tensor, tensor.swapaxes(0, 1)))
        c4 = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]])
        mirror = np.diag([1, -1, 1])
        for op in (c4, mirror):
            np.testing.assert_equal(explicit_rotate(tensor, op), tensor)

    def test_4mm_001_analytic_amplitudes(self):
        r = run({"model": "batio3", "incidence": 51,
                 "coefficients": {"xxz": 2, "zxx": 3, "zzz": 5}})
        s, c = math.sin(math.radians(51)), math.cos(math.radians(51))
        for channel, value in {"PP": 4*c*c*s - s*(3*c*c+5*s*s), "PS": 0, "SP": -3*s, "SS": 0}.items():
            np.testing.assert_allclose(amplitude_from(r, channel), value, atol=2e-15)

    def test_bulk_centrosymmetric_zero_for_any_orientation(self):
        r = run({"model": "centrosymmetric", "orientation": [37, 72, -41]})
        self.assertEqual(r["tensor"]["dimension"], 0)
        self.assertEqual(r["tensor"]["nonzero"], [])
        self.assertEqual(r["symmetry"]["order"], 48)
        self.assertTrue(r["symmetry"]["inversionPresent"])
        self.assertTrue(r["symmetry"]["inversionZeroCheckPassed"])
        for channel in ("PP", "PS", "SP", "SS"):
            np.testing.assert_array_equal(r["scan"]["channels"][channel]["intensities"], 0)

    def test_normal_incidence_gaas_001_zero_does_not_imply_inversion(self):
        r = run({"incidence": 0})
        self.assertEqual(r["scan"]["maxIntensity"], 0)
        self.assertFalse(r["symmetry"]["inversionPresent"])
        self.assertEqual(r["tensor"]["dimension"], 1)

    def test_amplitude_and_intensity_scale_in_common_units(self):
        first = run({"cut": "111", "coefficients": {"xyz": 1}})
        second = run({"cut": "111", "coefficients": {"xyz": {"re": 0, "im": 3}}})
        for channel in ("PP", "PS", "SP", "SS"):
            np.testing.assert_allclose(amplitude_from(second, channel), 3j*amplitude_from(first, channel), atol=2e-15)
            np.testing.assert_allclose(second["scan"]["channels"][channel]["intensities"],
                                       9*np.array(first["scan"]["channels"][channel]["intensities"]), atol=4e-15)

    def test_complex_coefficients_interfere_before_squaring(self):
        first = run({"model": "batio3", "coefficients": {"xxz": 1, "zxx": 1, "zzz": 0}})
        second = run({"model": "batio3", "coefficients": {"xxz": 1, "zxx": {"re": 0, "im": 1}, "zzz": 0}})
        self.assertNotAlmostEqual(first["selection"]["intensity"], second["selection"]["intensity"])
        self.assertAlmostEqual(first["selection"]["intensity"], .125)
        self.assertAlmostEqual(second["selection"]["intensity"], .625)

    def test_global_chi_sign_not_recoverable_from_intensity_alone(self):
        positive = run({"model": "batio3", "cut": "111", "coefficients": {"xxz": 1, "zxx": .7, "zzz": 1.5}})
        negative = run({"model": "batio3", "cut": "111", "coefficients": {"xxz": -1, "zxx": -.7, "zzz": -1.5}})
        for channel in ("PP", "PS", "SP", "SS"):
            np.testing.assert_equal(positive["scan"]["channels"][channel]["intensities"], negative["scan"]["channels"][channel]["intensities"])
            np.testing.assert_equal(amplitude_from(positive, channel), -amplitude_from(negative, channel))

    def test_cut_111_and_tetragonal_surface_normal(self):
        r = run({"model": "batio3", "cut": "111", "cOverA": 1.07})
        normal = np.array([1, 1, 1/1.07])
        normal /= np.linalg.norm(normal)
        matrix = np.array(r["geometry"]["initialCrystalToLab"])
        np.testing.assert_allclose(matrix @ normal, [0, 0, 1], atol=2e-16)
        np.testing.assert_allclose(matrix @ matrix.T, np.eye(3), atol=3e-16)
        self.assertAlmostEqual(np.linalg.det(matrix), 1)

    def test_geometric_contraction_equals_explicit_rotated_tensor(self):
        r = run({"model": "batio3", "orientation": [13, 51, -21], "azimuth": 76, "incidence": 29})
        tensor = explicit_rotate(tensor_from(r), np.array(r["geometry"]["crystalToLab"]))
        for channel in ("PP", "PS", "SP", "SS"):
            ein = np.array(r["geometry"]["incidentP" if channel[0] == "P" else "S"])
            eout = np.array(r["geometry"]["outgoingP" if channel[1] == "P" else "S"])
            expected = sum(eout[i]*tensor[i, j, k]*ein[j]*ein[k] for i, j, k in np.ndindex(3, 3, 3))
            actual = r["selection"]["allChannels"][channel]["amplitude"]
            self.assertAlmostEqual(abs(expected-complex(actual["re"], actual["im"])), 0., places=14)

    def test_360_period_and_basis_validation(self):
        for model, dimension in [("gaas", 1), ("batio3", 3), ("centrosymmetric", 0)]:
            r = run({"model": model, "cut": "111"})
            self.assertEqual(r["symmetry"]["dimensionFromGroupProjector"], dimension)
            self.assertLess(r["symmetry"]["basisCovarianceResidual"], 1e-14)
            self.assertLess(r["symmetry"]["permutationResidual"], 1e-14)
            self.assertLess(r["symmetry"]["covarianceResidual"], 1e-14)
            self.assertLess(r["symmetry"]["periodicityResidual"], 1e-14)
        first = run({"azimuth": 19})
        last = run({"azimuth": 379})
        self.assertAlmostEqual(first["selection"]["intensity"], last["selection"]["intensity"], places=14)

    def test_json_safe_and_bounds(self):
        json.dumps(run({"model": "batio3", "samples": 721, "coefficients": {"xxz": 10000, "zxx": -10000, "zzz": {"re": 10000, "im": 10000}}}), allow_nan=False)
        invalid = [[], {"model": []}, {"model": "32"}, {"incidence": float("nan")}, {"incidence": True},
                   {"incidence": 86}, {"incidence": 10**400}, {"samples": 722}, {"samples": 37.5}, {"samples": True},
                   {"orientation": [1, 2]}, {"orientation": [1, 2, float("inf")]},
                   {"cut": "110"}, {"channel": []}, {"channel": "pP"}, {"cOverA": 0}, {"cOverA": 1.1},
                   {"coefficients": {"xyz": {"re": 1}}}, {"coefficients": {"xyz": 10001}},
                   {"coefficients": {"xyz": "1+2j"}}, {"coefficients": {"zxx": 2}},
                   {"model": "centrosymmetric", "coefficients": {"xyz": 1}}, {"unexpected": 1}]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)


if __name__ == "__main__":
    unittest.main(verbosity=2)
