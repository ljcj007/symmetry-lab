"""Independent projector, perturbation, link-gauge and analytic gap checks."""
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist" / "python"))
from quantum_geometry_lab import run, _fhs, _zak

SX = np.array([[0, 1], [1, 0]], complex)
SY = np.array([[0, -1j], [1j, 0]], complex)
SZ = np.diag([1., -1.])


def independent_hamiltonian(x, y, mass=-1., scale=1.):
    return scale*(math.sin(x)*SX+math.sin(y)*SY+(mass+math.cos(x)+math.cos(y))*SZ)


def projector(x, y, mass=-1.):
    _, v = np.linalg.eigh(independent_hamiltonian(x, y, mass))
    return np.outer(v[:, 0], v[:, 0].conj())


class QuantumGeometryTests(unittest.TestCase):
    def test_qgt_against_independent_projector_finite_differences(self):
        step = 1e-5
        for mass, x, y in [(-1, .4, .7), (.6, -.8, 1.1), (3, .2, -.3), (-3, 1.3, -.7)]:
            r = run({"mass": mass, "kx": x, "ky": y, "mesh": 9, "pathSamples": 31})["selection"]
            p = projector(x, y, mass)
            dx = (projector(x+step, y, mass)-projector(x-step, y, mass))/(2*step)
            dy = (projector(x, y+step, mass)-projector(x, y-step, mass))/(2*step)
            q = np.array([[np.trace(p@a@b) for b in (dx, dy)] for a in (dx, dy)])
            np.testing.assert_allclose([[r["gxx"], r["gxy"]], [r["gxy"], r["gyy"]]], q.real, rtol=1e-7, atol=2e-10)
            self.assertAlmostEqual(r["berryCurvature"], -2*q[0, 1].imag, places=8)

    def test_berry_sign_against_velocity_kubo_expression(self):
        x, y, mass = .7, -.3, -1.
        e, u = np.linalg.eigh(independent_hamiltonian(x, y, mass))
        vx = math.cos(x)*SX-math.sin(x)*SZ
        vy = math.cos(y)*SY-math.sin(y)*SZ
        qxy = (u[:, 0].conj()@vx@u[:, 1])*(u[:, 1].conj()@vy@u[:, 0])/(e[0]-e[1])**2
        actual = run({"kx": x, "ky": y, "mesh": 9, "pathSamples": 31})["selection"]
        self.assertAlmostEqual(actual["berryCurvature"], -2*qxy.imag, places=14)

    def test_qwz_phase_diagram_in_chosen_orientation(self):
        for mass, expected in [(-5, 0), (-3, 0), (-1.3, 1), (-.4, 1), (.4, -1), (1.3, -1), (3, 0), (5, 0)]:
            with self.subTest(mass=mass):
                r = run({"mass": mass, "mesh": 21, "pathSamples": 31})
                self.assertTrue(r["topology"]["defined"])
                self.assertTrue(r["topology"]["numericallyResolved"])
                self.assertEqual(r["topology"]["integer"], expected)
                self.assertAlmostEqual(r["topology"]["value"], expected, places=12)
                self.assertTrue(r["gauge"]["passed"])

    def test_exact_gap_detects_closing_missed_by_odd_mesh(self):
        for mass in (-2, 0, 2):
            r = run({"mass": mass, "mesh": 9, "pathSamples": 31})
            self.assertFalse(r["topology"]["defined"])
            self.assertIsNone(r["topology"]["value"])
            self.assertIsNone(r["topology"]["analyticValue"])
            self.assertEqual(r["topology"]["analyticDirectGap"], 0)
            for row in r["convergence"]:
                self.assertIsNone(row["value"])
                self.assertIsNone(row["curvatureIntegral"])
                self.assertFalse(row["valid"])
            if mass in (-2, 0):
                self.assertGreater(r["checks"]["sampledDirectGap"], 0.01)
                self.assertTrue(r["checks"]["gapMissedByDisplayMesh"])

    def test_no_fabricated_local_geometry_at_degeneracy(self):
        r = run({"mass": -2, "kx": 0, "ky": 0, "mesh": 10, "pathSamples": 31})
        self.assertFalse(r["selection"]["valid"])
        for field in ("gxx", "gxy", "gyy", "metricTrace", "berryCurvature", "projector", "eigenvector"):
            self.assertIsNone(r["selection"][field])
        self.assertGreater(r["checks"]["localUndefinedPoints"], 0)
        self.assertTrue(any(x is None for row in r["heatmap"]["gxx"] for x in row))
        json.dumps(r, allow_nan=False)

    def test_energy_scale_changes_gap_not_band_geometry(self):
        a = run({"energyScale": .1, "mesh": 9, "pathSamples": 31})
        b = run({"energyScale": 7, "mesh": 9, "pathSamples": 31})
        for field in ("gxx", "gxy", "gyy", "berryCurvature"):
            np.testing.assert_allclose(a["heatmap"][field], b["heatmap"][field], atol=1e-14)
        self.assertAlmostEqual(b["topology"]["analyticDirectGap"]/a["topology"]["analyticDirectGap"], 70)
        np.testing.assert_allclose(np.array(b["bands"]["energies"]), np.array(a["bands"]["energies"])*70, atol=5e-14)

    def test_two_band_metric_identity_positive_semidefinite_and_trace_bound(self):
        r = run({"mass": .7, "mesh": 31, "pathSamples": 31})
        g = r["heatmap"]
        a, b, c, omega = (np.array(g[f]) for f in ("gxx", "gxy", "gyy", "berryCurvature"))
        self.assertGreaterEqual(float(a.min()), -1e-14)
        self.assertGreaterEqual(float(c.min()), -1e-14)
        np.testing.assert_allclose(a*c-b*b, omega*omega/4, atol=5e-15)
        self.assertGreaterEqual(float(np.min(a+c-abs(omega))), -1e-14)

    def test_independent_random_point_gauge_leaves_links_invariant(self):
        k = np.linspace(-math.pi, math.pi, 17, endpoint=False)
        frames = np.array([[np.linalg.eigh(independent_hamiltonian(x, y))[1][:, 0] for x in k] for y in k])
        rng = np.random.default_rng(2751)
        phase = rng.uniform(-math.pi, math.pi, (17, 17))
        a, b = _fhs(frames), _fhs(frames*np.exp(1j*phase)[..., None])
        self.assertAlmostEqual(a["value"], b["value"], places=13)
        self.assertAlmostEqual(a["minOverlap"], b["minOverlap"], places=13)
        # Swap oriented axes to independently check Chern sign reversal.
        self.assertAlmostEqual(_fhs(frames.transpose(1, 0, 2))["value"], -a["value"], places=13)

    def test_ssh_metric_against_planar_angle_derivative(self):
        for t1, t2, k in [(.6, 1, .5), (1.2, .7, -2), (0, 1, .7), (1, 0, 1.3)]:
            r = run({"model": "ssh", "t1": t1, "t2": t2, "kx": k, "mesh": 21, "pathSamples": 31})
            e2 = t1*t1+t2*t2+2*t1*t2*math.cos(k)
            expected = t2*t2*(t2+t1*math.cos(k))**2/(4*e2*e2)
            self.assertAlmostEqual(r["selection"]["gxx"], expected, places=13)
            self.assertEqual(r["selection"]["gyy"], 0)
            self.assertEqual(r["selection"]["berryCurvature"], 0)
            self.assertTrue(r["gauge"]["passed"])

    def test_ssh_zak_dimer_limits_and_gap_closing(self):
        for t1, t2, zak in [(0, 1, math.pi), (.6, 1, math.pi), (1, .6, 0), (1, 0, 0)]:
            r = run({"model": "ssh", "t1": t1, "t2": t2, "mesh": 31, "pathSamples": 31})
            self.assertAlmostEqual(r["topology"]["value"], zak, places=12)
            self.assertIsNone(r["topology"]["integer"])
        for t1, t2 in [(1, 1), (0, 0)]:
            r = run({"model": "ssh", "t1": t1, "t2": t2, "kx": math.pi, "mesh": 9, "pathSamples": 31})
            self.assertFalse(r["topology"]["defined"])
            self.assertIsNone(r["topology"]["value"])
            json.dumps(r, allow_nan=False)

    def test_zak_random_gauge_and_periodic_boundary_link(self):
        k = np.linspace(-math.pi, math.pi, 31, endpoint=False)
        u = np.array([np.linalg.eigh((.6+math.cos(x))*SX+math.sin(x)*SY)[1][:, 0] for x in k])
        rng = np.random.default_rng(705)
        gauged = u*np.exp(1j*rng.uniform(-3, 3, len(k)))[:, None]
        self.assertAlmostEqual(_zak(u)["value"], math.pi, places=13)
        self.assertAlmostEqual(_zak(gauged)["value"], math.pi, places=13)

    def test_curvature_riemann_integral_has_independent_convergence(self):
        r = run({"mass": -.7, "mesh": 15, "pathSamples": 31})
        coarse, fine = r["convergence"]
        self.assertAlmostEqual(coarse["value"], 1, places=12)
        self.assertAlmostEqual(fine["value"], 1, places=12)
        self.assertLess(fine["curvatureIntegralError"], coarse["curvatureIntegralError"])
        self.assertGreater(coarse["curvatureIntegralError"], 1e-8)

    def test_unresolved_near_transition_does_not_report_false_main_integer(self):
        r = run({"mass": -1.999999, "mesh": 9, "pathSamples": 31})
        self.assertTrue(r["topology"]["defined"])
        self.assertFalse(r["topology"]["numericallyResolved"])
        self.assertIsNone(r["topology"]["value"])
        self.assertEqual(r["topology"]["analyticValue"], 1)

    def test_finite_bounded_inputs(self):
        invalid = [[], {"model": []}, {"model": "any"}, {"mass": float("nan")}, {"mass": 10**400},
                   {"mesh": 8}, {"mesh": 102}, {"mesh": 31.0}, {"mesh": True}, {"energyScale": 0},
                   {"t1": -1}, {"t2": float("inf")}, {"kx": 4}, {"pathSamples": 402},
                   {"gaugeStrength": 21}, {"basis": "changed"}]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)
        for payload in ({"mesh": 101, "pathSamples": 401, "gaugeStrength": 20},
                        {"model": "ssh", "mesh": 101, "pathSamples": 401, "t1": 0, "t2": 0}):
            json.dumps(run(payload), allow_nan=False)

    def test_teaching_fragment_examples_and_analytic_exercises(self):
        root = Path(__file__).resolve().parents[1]
        catalog = json.loads((root/"dist/data/quantum-geometry-content.json").read_text(encoding="utf-8"))
        self.assertEqual(catalog["section"], "quantum-materials")
        module = catalog["modules"][0]
        self.assertEqual(module["id"], "geometry")
        presets = {p["id"]: p for p in module["presets"]}
        self.assertEqual(len(presets), 5)
        for preset in presets.values():
            json.dumps(run(preset["input"]), allow_nan=False)
        sources = {x["id"] for x in catalog["sources"]}
        lessons = {x["id"] for x in catalog["lessons"]}
        self.assertEqual(len(lessons), 3)
        for lesson in catalog["lessons"]:
            self.assertIn(lesson["preset"], presets)
            self.assertLessEqual(set(lesson["references"]), sources)
        self.assertEqual(len(catalog["exercises"]), 3)
        for exercise in catalog["exercises"]:
            self.assertIn(exercise["lesson"], lessons)
            self.assertEqual(len(exercise["steps"]), 4)
            for step in exercise["steps"]:
                self.assertEqual(len(step["choices"]), 3)
                self.assertIn(step["answer"], range(3))
                self.assertTrue(step["explanation"])
        for case in catalog["cases"]:
            self.assertIn(case["preset"], presets)
            self.assertGreater(len(case["assumption"]), 20)
        for path in (root/"dist/examples").glob("quantum-geometry-*.json"):
            json.dumps(run(json.loads(path.read_text(encoding="utf-8"))), allow_nan=False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
