"""Independent BdG spectra, continuum nodes, boundary states and validation."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist" / "python"))
from pairing_lab import run, square_bdg, kitaev_bdg, kitaev_chain


class PairingLabTests(unittest.TestCase):
    def test_full_spinful_spectrum_and_nambu_constraint(self):
        for pairing in ("s", "extended_s", "d_x2_y2", "d_xy", "d+id"):
            kx, ky, t, mu, delta = .73, -1.21, 1.3, .37, .42
            basis = {"s": 1., "extended_s": (math.cos(kx) + math.cos(ky)) / 2,
                     "d_x2_y2": (math.cos(kx) - math.cos(ky)) / 2,
                     "d_xy": math.sin(kx) * math.sin(ky),
                     "d+id": (math.cos(kx) - math.cos(ky)) / 2 + 1j * math.sin(kx) * math.sin(ky)}[pairing]
            expected = math.sqrt((-2 * t * (math.cos(kx) + math.cos(ky)) - mu) ** 2 + abs(delta * basis) ** 2)
            h = square_bdg(kx, ky, t, mu, delta, pairing)
            hm = square_bdg(-kx, -ky, t, mu, delta, pairing)
            swap = np.eye(4)[[2, 3, 0, 1]]
            np.testing.assert_allclose(np.linalg.eigvalsh(h), [-expected, -expected, expected, expected], atol=3e-15)
            np.testing.assert_allclose(h, h.conj().T, atol=1e-15)
            np.testing.assert_allclose(swap @ h.conj() @ swap, -hm, atol=1e-15)
            np.testing.assert_allclose(h[:2, 2:], -hm[:2, 2:].T, atol=1e-15)

    def test_s_wave_gap_equals_amplitude_on_fermi_surface(self):
        r = run({"pairing": "s", "chemical_potential": .53})
        self.assertFalse(r["summary"]["analytic_nodes"]["gapless"])
        for branch in r["fermi_surface"]["branches"]:
            x, y = np.array(branch["kx"]), np.array(branch["ky"])
            np.testing.assert_allclose(-2 * (np.cos(x) + np.cos(y)) - .53, 0., atol=1e-14)
            np.testing.assert_allclose(branch["magnitude"], .4)

    def test_analytic_d_nodes_are_not_inferred_from_display_grid(self):
        r = run({"pairing": "d_x2_y2", "chemical_potential": 1.7, "grid": 11})
        self.assertTrue(r["summary"]["analytic_nodes"]["gapless"])
        self.assertGreater(r["summary"]["sampled_min_energy"], .01)
        self.assertEqual(len(r["summary"]["analytic_nodes"]["points"]), 4)
        for x, y in r["summary"]["analytic_nodes"]["points"]:
            self.assertAlmostEqual(-2 * (math.cos(x) + math.cos(y)) - 1.7, 0.)
            self.assertAlmostEqual(math.cos(x) - math.cos(y), 0.)

    def test_extended_s_special_half_filled_nodes(self):
        zero = run({"pairing": "extended_s", "chemical_potential": 0})
        self.assertEqual(zero["summary"]["analytic_nodes"]["kind"], "fermi_surface_nodes")
        finite = run({"pairing": "extended_s", "chemical_potential": 1.3})
        self.assertFalse(finite["summary"]["analytic_nodes"]["gapless"])
        for branch in finite["fermi_surface"]["branches"]:
            np.testing.assert_allclose(branch["real"], -.4 * 1.3 / 4, atol=1e-15)

    def test_dxy_nodes_across_chemical_potentials(self):
        for mu in (-4., -2.7, 0., 1.2, 4.):
            r = run({"pairing": "d_xy", "chemical_potential": mu})
            nodes = r["summary"]["analytic_nodes"]
            self.assertTrue(nodes["gapless"])
            self.assertTrue(nodes["points"])
            for x, y in nodes["points"]:
                self.assertAlmostEqual(-2 * (math.cos(x) + math.cos(y)) - mu, 0.)
                self.assertAlmostEqual(math.sin(x) * math.sin(y), 0.)

    def test_d_plus_id_phase_and_band_edge_closing(self):
        r = run({"pairing": "d+id", "chemical_potential": 0, "grid": 41})
        self.assertFalse(r["summary"]["analytic_nodes"]["gapless"])
        self.assertGreater(np.max(np.abs(r["gap_map"]["imag"])), .39)
        self.assertGreater(np.ptp(r["gap_map"]["phase"]), 5.)
        self.assertEqual(r["summary"]["irrep"], "B₁g + i B₂g")
        for mu in (-4., 4.):
            edge = run({"pairing": "d+id", "chemical_potential": mu})
            self.assertTrue(edge["summary"]["analytic_nodes"]["gapless"])
            self.assertEqual(len(edge["summary"]["analytic_nodes"]["points"]), 1)

    def test_normal_state_and_absent_fermi_surface(self):
        for pairing in ("s", "extended_s", "d_x2_y2", "d_xy", "d+id"):
            normal = run({"pairing": pairing, "gap": 0})
            self.assertEqual(normal["summary"]["analytic_nodes"]["kind"], "normal_state")
            empty = run({"pairing": pairing, "gap": 0, "chemical_potential": 4.1})
            self.assertFalse(empty["fermi_surface"]["exists"])
            self.assertFalse(empty["summary"]["analytic_nodes"]["gapless"])

    def test_square_band_data_matches_matrix_diagonalization(self):
        r = run({"pairing": "d+id", "hopping": 1.7, "chemical_potential": -1.4, "gap": .71, "path_samples": 17})
        self.assertEqual(len(r["bands"]["distance"]), 52)
        for k, energies in zip(r["bands"]["momenta"], r["bands"]["energies"]):
            np.testing.assert_allclose(energies, np.linalg.eigvalsh(square_bdg(*k, 1.7, -1.4, .71, "d+id")))
        self.assertTrue(r["checks"]["passed"])

    def test_kitaev_bulk_matches_independent_periodic_real_space(self):
        n, t, mu, delta = 14, 1.3, .7, .42
        h = np.zeros((n, n))
        d = np.zeros((n, n))
        for i in range(n):
            h[i, i] = -mu
            h[i, (i + 1) % n] = h[(i + 1) % n, i] = -t
            d[i, (i + 1) % n] = delta
            d[(i + 1) % n, i] = -delta
        finite_ring = np.block([[h, d], [-d, -h]])
        expected = []
        for i in range(n):
            q = 2 * math.pi * i / n
            e = math.sqrt((2 * t * math.cos(q) + mu) ** 2 + 4 * delta * delta * math.sin(q) ** 2)
            expected.extend([-e, e])
        np.testing.assert_allclose(np.linalg.eigvalsh(finite_ring), sorted(expected), atol=1e-14)
        for q in (.2, .91, 2.11):
            e = math.sqrt((2 * t * math.cos(q) + mu) ** 2 + 4 * delta * delta * math.sin(q) ** 2)
            np.testing.assert_allclose(np.linalg.eigvalsh(kitaev_bdg(q, t, mu, delta)), [-e, e], atol=1e-14)

    def test_kitaev_sweet_spot_has_two_exact_end_modes(self):
        r = run({"model": "kitaev", "hopping": 1, "gap": 1, "chemical_potential": 0, "sites": 24})
        self.assertTrue(r["summary"]["topological"])
        self.assertEqual(r["summary"]["z2_invariant"], -1)
        self.assertAlmostEqual(r["summary"]["analytic_bulk_gap"], 2.)
        eigen = np.array(r["chain"]["energies"])
        self.assertEqual(np.count_nonzero(abs(eigen) < 1e-10), 2)
        np.testing.assert_allclose(abs(eigen[abs(eigen) > 1e-10]), 2., atol=3e-15)
        expected = np.zeros(24); expected[[0, -1]] = .5
        np.testing.assert_allclose(r["chain"]["near_zero_pair_weight"], expected, atol=1e-14)
        self.assertTrue(r["checks"]["passed"])

    def test_kitaev_gap_closure_and_unpaired_metal_not_topological(self):
        for mu in (-2., 2.):
            critical = run({"model": "kitaev", "chemical_potential": mu})
            self.assertTrue(critical["summary"]["gapless"])
            self.assertEqual(critical["summary"]["analytic_bulk_gap"], 0.)
            self.assertIsNone(critical["summary"]["z2_invariant"])
        metal = run({"model": "kitaev", "gap": 0, "chemical_potential": .37})
        self.assertTrue(metal["summary"]["gapless"])
        self.assertFalse(metal["summary"]["topological"])
        self.assertIsNone(metal["summary"]["z2_invariant"])
        trivial = run({"model": "kitaev", "gap": 0, "chemical_potential": 3.})
        self.assertEqual(trivial["summary"]["z2_invariant"], 1)
        self.assertEqual(trivial["summary"]["analytic_bulk_gap"], 1.)

    def test_analytic_bulk_minimum_matches_dense_independent_scan(self):
        k = np.linspace(0, math.pi, 200001)
        for t, mu, delta in [(1., .7, .2), (1., 0., 1.), (.8, .9, 1.7), (1.2, 2.5, .6), (.7, -.9, .71)]:
            r = run({"model": "kitaev", "hopping": t, "chemical_potential": mu, "gap": delta, "sites": 12})
            expected = np.sqrt((2 * t * np.cos(k) + mu) ** 2 + 4 * delta ** 2 * np.sin(k) ** 2).min()
            self.assertAlmostEqual(r["summary"]["analytic_bulk_gap"], expected, places=8)

    def test_finite_size_splitting_decreases_and_weight_is_normalized(self):
        short = run({"model": "kitaev", "gap": .4, "chemical_potential": .7, "sites": 12})
        long = run({"model": "kitaev", "gap": .4, "chemical_potential": .7, "sites": 60})
        self.assertGreater(short["summary"]["finite_chain_min_abs_energy"], 1e-5)
        self.assertLess(long["summary"]["finite_chain_min_abs_energy"], short["summary"]["finite_chain_min_abs_energy"] / 100)
        for r in (short, long):
            self.assertAlmostEqual(sum(r["chain"]["near_zero_pair_weight"]), 1.)
            for mode in r["chain"]["selected_modes"]:
                self.assertAlmostEqual(sum(mode["site_weight"]), 1.)
                self.assertAlmostEqual(mode["electron_weight"] + mode["hole_weight"], 1.)

    def test_json_and_parameter_validation(self):
        for payload in ({}, {"model": "kitaev"}, {"pairing": "d+id"}, {"gap": 0, "chemical_potential": 0}):
            r = run(payload)
            json.dumps(r, allow_nan=False)
            self.assertTrue(r["checks"]["passed"])
        bad = [None, [], {"model": "triplet"}, {"pairing": []}, {"gap": -1}, {"gap": float("nan")},
               {"hopping": 0}, {"hopping": True}, {"chemical_potential": float("inf")}, {"grid": 11.2},
               {"sites": 81}, {"path_samples": 1000}, {"temperature": 300}, {"chemical_potential": "1"},
               {"hopping": 10**400}, {"gap": complex(1, 2)}]
        for payload in bad:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)

    def test_tiny_nonzero_gap_does_not_underflow_into_gapless_classification(self):
        r = run({"model": "kitaev", "chemical_potential": 0, "gap": 1e-200})
        self.assertGreater(r["summary"]["analytic_bulk_gap"], 0)
        self.assertTrue(r["summary"]["topological"])
        self.assertAlmostEqual(r["summary"]["analytic_bulk_gap"] / 1e-200, 2.)


if __name__ == "__main__":
    unittest.main()
