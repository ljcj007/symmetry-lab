"""Independent checks of restriction, covariance, gaps and Kramers claims."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist" / "python"))
from band_connectivity import run, hamiltonian, _representations, SX, SY, SZ, I2


def scalar(value):
    return complex(value["re"], value["im"]) if isinstance(value, dict) else complex(value)


class BandConnectivityTests(unittest.TestCase):
    def test_c4v_restrictions_from_characters(self):
        result = run({})
        rows = {row["parent"]: row for row in result["compatibility"]["rows"]}
        self.assertEqual({name: row["multiplicities"] for name, row in rows.items()},
                         {"A1": [1, 0], "A2": [0, 1], "B1": [1, 0], "B2": [0, 1], "E": [1, 1]})
        self.assertEqual(rows["E"]["restrictedCharacters"], [{"re": 2., "im": 0.}, {"re": 0., "im": 0.}])
        self.assertTrue(result["compatibility"]["dimensionConserved"])

    def test_double_cover_has_all_seven_irreps(self):
        table = run({"model": "rashba"})["compatibility"]
        self.assertEqual(table["parentOrder"], 16)
        self.assertEqual(len(table["parentIrreps"]), 7)
        self.assertEqual(sum(rep["dimension"] ** 2 for rep in table["parentIrreps"]), 16)
        rows = {row["parent"]: row for row in table["rows"]}
        self.assertEqual(rows["E1/2"]["multiplicities"], [0, 0, 1, 1])
        self.assertEqual(rows["E3/2"]["multiplicities"], [0, 0, 1, 1])
        self.assertEqual(rows["E"]["multiplicities"], [1, 1, 0, 0])
        self.assertEqual([scalar(rep["mirrorEigenvalue"]) for rep in table["lineIrreps"]], [1, -1, 1j, -1j])

    def test_character_inner_product_orthogonality_and_integrality(self):
        for model in ("c4v", "rashba"):
            table = run({"model": model})["compatibility"]
            chars = np.array([[scalar(x) for x in row["characters"]] for row in table["parentIrreps"]])
            np.testing.assert_allclose(chars.conj() @ chars.T / table["parentOrder"], np.eye(len(chars)), atol=2e-14)
            for row in table["rows"]:
                restricted = np.array([scalar(x) for x in row["restrictedCharacters"]])
                for i, line in enumerate(table["lineIrreps"]):
                    line_chars = np.array([scalar(x) for x in line["characters"]])
                    self.assertAlmostEqual(np.vdot(line_chars, restricted).real / table["lineOrder"], row["multiplicities"][i])
                    self.assertGreaterEqual(row["multiplicities"][i], 0)
                self.assertEqual(row["dimensionSum"], row["dimension"])

    def test_representation_generator_relations(self):
        for double in (False, True):
            n = 8 if double else 4
            for rep in _representations(double):
                r, m = rep["matrices"][1], rep["matrices"][n]
                identity = np.eye(rep["dimension"])
                np.testing.assert_allclose(m @ r @ m.conj().T, r.conj().T, atol=2e-14)
                np.testing.assert_allclose(np.linalg.matrix_power(r, n), identity, atol=2e-14)
                np.testing.assert_allclose(m @ m, np.linalg.matrix_power(r, 4) if double else identity, atol=2e-14)

    def test_X_endpoint_restrictions_determine_right_connections(self):
        for model, expected in (("c4v", {"B1": [1, 0], "B2": [0, 1]}),
                                ("rashba", {"X spinor": [0, 0, 1, 1]})):
            result = run({"model": model})
            endpoint = result["endpointCompatibility"]
            self.assertEqual({row["parent"]: row["multiplicities"] for row in endpoint["activeRows"]}, expected)
            for row in endpoint["activeRows"]:
                self.assertEqual(row["dimension"], row["dimensionSum"])
            self.assertEqual(len(result["connections"]["edges"]), 4)
            self.assertTrue(all(edge["multiplicity"] == 1 for edge in result["connections"]["edges"]))

    def test_spinless_2d_covariance_is_not_just_a_line_fit(self):
        result = run({"beta": -1.7, "gamma": .31, "eta": .42, "hopping": 1.3})
        p = result["parameters"]
        r = np.array([[0, -1], [1, 0]])
        for kx, ky in ((.72, -.41), (2.14, 1.03), (-.21, 1.7)):
            h = hamiltonian("c4v", kx, ky, p)
            np.testing.assert_allclose(r @ h @ r.T, hamiltonian("c4v", -ky, kx, p), atol=1e-14)
            np.testing.assert_allclose(SZ @ h @ SZ, hamiltonian("c4v", kx, -ky, p), atol=1e-14)
            np.testing.assert_allclose(h.conj(), hamiltonian("c4v", -kx, -ky, p), atol=1e-14)

    def test_selected_crossing_energy_and_mirror_switch(self):
        result = run({"eta": .25, "hopping": .8})
        cross = next(x for x in result["crossings"] if x["kind"] == "mirror-protected")
        k = math.acos(.25)
        self.assertAlmostEqual(cross["kx"], k)
        self.assertAlmostEqual(cross["t"], k / math.pi)
        energies = np.linalg.eigvalsh(hamiltonian("c4v", k, 0., result["parameters"]))
        np.testing.assert_allclose(energies, [1.2, 1.2], atol=1e-14)
        low = result["bands"][0]["mirror"]
        self.assertLess(low[5], -.99)
        self.assertGreater(low[-1], .99)

    def test_mirror_breaking_opens_analytic_gap_and_keeps_spinless_T(self):
        result = run({"mixing": -.23, "eta": -.2})
        k = math.acos(-.2)
        energies = np.linalg.eigvalsh(hamiltonian("c4v", k, 0., result["parameters"]))
        self.assertAlmostEqual(energies[1] - energies[0], .46)
        self.assertFalse(result["compatibility"]["active"])
        self.assertFalse(result["connections"]["active"])
        self.assertTrue(all(label == "混合态" for band in result["bands"] for label in band["mirrorLabels"]))
        self.assertAlmostEqual(result["validation"]["mirrorResidual"], .46)
        self.assertAlmostEqual(result["validation"]["rotationResidual"], .46)
        self.assertLess(result["validation"]["timeReversalResidual"], 1e-13)

    def test_compatibility_does_not_falsely_enforce_crossing(self):
        for eta in (-1.4, 1.4, 1.):
            result = run({"eta": eta})
            self.assertEqual(result["compatibility"]["activeRows"][0]["multiplicities"], [1, 1])
            self.assertFalse(any(x["kind"] == "mirror-protected" for x in result["crossings"]))
        self.assertTrue(any(x["kind"] == "tuned-endpoint" for x in run({"eta": -1})["crossings"]))

    def test_beta_zero_marks_extended_accidental_degeneracy(self):
        result = run({"beta": 0})
        degenerate = next(x for x in result["crossings"] if x["kind"] == "extended")
        self.assertFalse(degenerate["protected"])
        np.testing.assert_allclose(result["bands"][0]["energies"], result["bands"][1]["energies"], atol=1e-14)

    def test_rashba_covariance_and_time_reversal(self):
        result = run({"model": "rashba", "soc": -.73})
        p = result["parameters"]
        r = np.diag(np.exp([-1j * math.pi / 4, 1j * math.pi / 4]))
        m = 1j * SY
        for kx, ky in ((.72, -.41), (2.14, 1.03), (-.21, 1.7)):
            h = hamiltonian("rashba", kx, ky, p)
            np.testing.assert_allclose(r @ h @ r.conj().T, hamiltonian("rashba", -ky, kx, p), atol=1e-14)
            np.testing.assert_allclose(m @ h @ m.conj().T, hamiltonian("rashba", kx, -ky, p), atol=1e-14)
            np.testing.assert_allclose(m @ h.conj() @ m.conj().T, hamiltonian("rashba", -kx, -ky, p), atol=1e-14)
        np.testing.assert_allclose(m @ m.conj(), -I2, atol=1e-14)

    def test_kramers_only_at_TRIM_in_this_path(self):
        result = run({"model": "rashba", "soc": .7, "samples": 121})
        low, high = [np.array(band["energies"]) for band in result["bands"]]
        self.assertAlmostEqual(high[0] - low[0], 0.)
        self.assertAlmostEqual(high[-1] - low[-1], 0.)
        self.assertAlmostEqual(high[60] - low[60], 1.4)
        self.assertEqual([(x["kind"], x["t"]) for x in result["crossings"]], [("kramers", 0.), ("kramers", 1.)])
        self.assertEqual(result["validation"]["timeReversalSquare"], -1)

    def test_rashba_mirror_labels_at_degenerate_endpoints_are_resolved(self):
        result = run({"model": "rashba"})
        for point in (0, -1):
            self.assertEqual(sorted(round(band["mirror"][point]) for band in result["bands"]), [-1, 1])
        self.assertTrue(all(abs(abs(m) - 1) < 1e-12 for band in result["bands"] for m in band["mirror"]))

    def test_zeeman_breaks_T_and_mirror_preserves_C4(self):
        result = run({"model": "rashba", "zeeman": .28})
        self.assertFalse(result["summary"]["timeReversal"])
        self.assertFalse(result["summary"]["mirrorActive"])
        self.assertTrue(all(not x["protected"] for x in result["crossings"]))
        for x in result["crossings"]:
            self.assertAlmostEqual(x["gap"], .56)
        validation = result["validation"]
        self.assertAlmostEqual(validation["timeReversalResidual"], .56)
        self.assertAlmostEqual(validation["mirrorResidual"], .56)
        self.assertLess(validation["rotationResidual"], 2e-14)

    def test_zero_soc_all_k_degeneracy_not_claimed_as_all_k_TRIM(self):
        result = run({"model": "rashba", "soc": 0})
        self.assertEqual(len(result["crossings"]), 1)
        self.assertEqual(result["crossings"][0]["kind"], "extended")
        self.assertFalse(result["crossings"][0]["protected"])

    def test_analytic_rashba_spectrum_and_spin_texture(self):
        result = run({"model": "rashba", "soc": .71, "zeeman": .14, "samples": 101})
        p = result["parameters"]
        for j in (0, 23, 50, 79, 100):
            k = result["path"]["kpoints"][j][0]
            eps = 2 * p["hopping"] * (1 - math.cos(k))
            splitting = math.hypot(.71 * math.sin(k), .14)
            self.assertAlmostEqual(result["bands"][0]["energies"][j], eps - splitting)
            self.assertAlmostEqual(result["bands"][1]["energies"][j], eps + splitting)
            self.assertAlmostEqual(np.linalg.norm(result["bands"][0]["spin"][j]), 1.)
            self.assertAlmostEqual(result["bands"][1]["spin"][j][2], .14 / splitting)

    def test_both_models_periodic_hermitian_and_diagonalized(self):
        for model in ("c4v", "rashba"):
            result = run({"model": model, "mixing": .17, "zeeman": -.12})
            for key in ("periodicityResidual", "hermiticityResidual", "diagonalizationResidual"):
                self.assertLess(result["validation"][key], 3e-13)
            json.dumps(result, allow_nan=False)
            self.assertEqual(len(result["path"]["coordinates"]), 121)
            self.assertEqual(len(result["bands"][0]["mirrorLabels"]), 121)

    def test_invalid_inputs(self):
        for payload in (None, [], "c4v", {"model": "all-space-groups"}, {"samples": 20}, {"samples": 502},
                        {"samples": 21.0}, {"samples": True}, {"eta": 2}, {"beta": "1"}, {"soc": True},
                        {"zeeman": float("nan")}, {"mixing": float("inf")}, {"hopping": -1}):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    run(payload)

    def test_bounds_and_tiny_but_real_perturbation(self):
        result = run({"samples": 501, "beta": -5, "gamma": 5, "eta": -1.5, "mixing": 3,
                      "hopping": 0, "soc": -3, "zeeman": 3})
        self.assertEqual(len(result["bands"][0]["energies"]), 501)
        tiny = run({"mixing": 1e-15})
        self.assertFalse(tiny["compatibility"]["active"])
        self.assertEqual(tiny["parameters"]["mixing"], 1e-15)
        self.assertEqual(tiny["summary"]["perturbationGap"], 2e-15)


if __name__ == "__main__":
    unittest.main()
