"""Physical limits, independent Kubo and energy-convolution checks for Hall lab."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"dist"/"python"))
from hall_response_lab import run, fermi_entropy, CONDUCTANCE_QUANTUM, THERMOELECTRIC_QUANTUM, KB_EV


class HallResponseTests(unittest.TestCase):
    def calc(self, **kwargs):
        return run({"mesh": 31, "scanPoints": 11, **kwargs})

    def test_zero_temperature_chern_plateau_and_charge_sign(self):
        for mass, chern in [(-3, 0), (-1, 1), (1, -1), (3, 0)]:
            r = self.calc(mass=mass, temperature=0, mesh=61)
            self.assertEqual(r["checks"]["analyticLowerChern"], chern)
            self.assertAlmostEqual(r["selection"]["sigmaInE2OverH"], -chern, places=10)
            self.assertEqual(r["selection"]["alphaXY"], 0)
            self.assertTrue(r["selection"]["numericallyResolved"])

    def test_curvature_against_independent_velocity_kubo(self):
        r = self.calc(mass=-.7)
        sx = np.array([[0, 1], [1, 0]], complex)
        sy = np.array([[0, -1j], [1j, 0]], complex)
        sz = np.diag([1., -1.])
        for i, j in [(2, 4), (9, 16), (18, 24)]:
            x, y = r["heatmap"]["kx"][i], r["heatmap"]["ky"][j]
            h = math.sin(x)*sx+math.sin(y)*sy+(-.7+math.cos(x)+math.cos(y))*sz
            energy, u = np.linalg.eigh(h)
            vx, vy = math.cos(x)*sx-math.sin(x)*sz, math.cos(y)*sy-math.sin(y)*sz
            q = (u[:, 0].conj()@vx@u[:, 1])*(u[:, 1].conj()@vy@u[:, 0])/(energy[1]-energy[0])**2
            self.assertAlmostEqual(r["heatmap"]["berryCurvature"][j][i], -2*q.imag, places=13)

    def test_entropy_result_against_zero_T_spectral_convolution(self):
        # Build a zero-T Hall staircase independently from the output energies,
        # then convolve over energy, rather than reusing the entropy formula.
        mu, temp = 1.4, 900
        r = self.calc(chemicalPotential=mu, temperature=temp, mesh=25)
        energy = np.array(r["heatmap"]["gap"]).ravel()/2
        omega = np.array(r["heatmap"]["berryCurvature"]).ravel()
        energies = np.r_[-energy, energy]
        contributions = -2*math.pi*np.r_[omega, -omega]/len(energy)
        order = np.argsort(energies)
        levels, cumulative = energies[order], np.r_[0, np.cumsum(contributions[order])]
        grid = np.linspace(mu-32*KB_EV*temp, mu+32*KB_EV*temp, 100001)
        staircase = cumulative[np.searchsorted(levels, grid, side="right")]
        x = (grid-mu)/(KB_EV*temp)
        derivative = 1/(4*KB_EV*temp*np.cosh(x/2)**2)
        alpha = -np.trapezoid(staircase*x*derivative, grid)
        sigma = np.trapezoid(staircase*derivative, grid)
        self.assertAlmostEqual(alpha, r["selection"]["alphaInEKbOverH"], delta=2e-5)
        self.assertAlmostEqual(sigma, r["selection"]["sigmaInE2OverH"], delta=2e-5)

    def test_particle_hole_mu_parities(self):
        p = self.calc(chemicalPotential=.55, energyScale=.4, temperature=700)
        n = self.calc(chemicalPotential=-.55, energyScale=.4, temperature=700)
        self.assertAlmostEqual(p["selection"]["sigmaXY"], n["selection"]["sigmaXY"], places=18)
        self.assertAlmostEqual(p["selection"]["alphaXY"], -n["selection"]["alphaXY"], places=22)
        zero = self.calc(chemicalPotential=0, temperature=2000)
        self.assertEqual(zero["selection"]["alphaXY"], 0)

    def test_mass_reversal_reverses_responses(self):
        a = self.calc(mass=-.7, chemicalPotential=.8, temperature=500, mesh=30)
        b = self.calc(mass=.7, chemicalPotential=.8, temperature=500, mesh=30)
        for key in ["sigmaInE2OverH", "alphaInEKbOverH"]:
            self.assertAlmostEqual(a["selection"][key], -b["selection"][key], places=12)

    def test_full_and_empty_two_band_space_cancel(self):
        for mu in [-20, 20]:
            r = self.calc(chemicalPotential=mu, temperature=0)
            self.assertAlmostEqual(r["selection"]["sigmaXY"], 0, places=20)
            self.assertEqual(r["selection"]["alphaXY"], 0)

    def test_alpha_zero_temperature_and_metal_not_quantized(self):
        r = self.calc(chemicalPotential=1.5, temperature=0, mesh=91)
        self.assertEqual(r["selection"]["alphaXY"], 0)
        self.assertGreater(abs(r["selection"]["sigmaInE2OverH"]), .01)
        self.assertLess(abs(r["selection"]["sigmaInE2OverH"]), .99)

    def test_joint_energy_temperature_rescaling(self):
        a = self.calc(energyScale=.2, chemicalPotential=.35, temperature=400)
        b = self.calc(energyScale=.4, chemicalPotential=.7, temperature=800)
        for key in ["sigmaInE2OverH", "alphaInEKbOverH"]:
            self.assertAlmostEqual(a["selection"][key], b["selection"][key], places=13)

    def test_high_temperature_suppression(self):
        cold = self.calc(energyScale=.02, temperature=0)
        hot = self.calc(energyScale=.02, temperature=5000)
        self.assertLess(abs(hot["selection"]["sigmaXY"]), .06*abs(cold["selection"]["sigmaXY"]))

    def test_exact_closures_override_missed_grid_degeneracy(self):
        for m in [-2, 0, 2]:
            r = self.calc(mass=m, mesh=31)
            self.assertFalse(r["selection"]["defined"])
            self.assertFalse(r["checks"]["needsRefinement"])
            self.assertIsNone(r["selection"]["sigmaXY"])
            self.assertIsNone(r["selection"]["alphaXY"])
            self.assertEqual(r["checks"]["analyticDirectGap"], 0)
            self.assertTrue(all(x["sigmaXY"] is None for x in r["scan"]["rows"]))

    def test_near_critical_coarse_grid_not_labelled_converged(self):
        r = self.calc(mass=-1.999, mesh=15)
        self.assertTrue(r["selection"]["defined"])
        self.assertFalse(r["selection"]["numericallyResolved"])
        self.assertTrue(r["checks"]["needsRefinement"])

    def test_units_and_antisymmetry(self):
        r = self.calc(chemicalPotential=1.4, temperature=600)
        s = r["selection"]
        self.assertAlmostEqual(s["sigmaXY"], s["sigmaInE2OverH"]*CONDUCTANCE_QUANTUM, places=20)
        self.assertAlmostEqual(s["alphaXY"], s["alphaInEKbOverH"]*THERMOELECTRIC_QUANTUM, places=24)
        self.assertEqual(s["sigmaYX"], -s["sigmaXY"])
        self.assertEqual(s["alphaYX"], -s["alphaXY"])
        self.assertEqual(r["units"]["sigma"], "S")
        self.assertEqual(r["units"]["alpha"], "A/K")

    def test_stable_fermi_entropy_tails(self):
        f, s = fermi_entropy(np.array([-1e5, -1, 0, 1, 1e5]), 0, .001)
        np.testing.assert_allclose(f, [1, 1, .5, 0, 0])
        np.testing.assert_allclose(s, [0, 0, math.log(2), 0, 0])
        f, s = fermi_entropy(np.array([-1., 0., 1.]), 0, 1e-320)
        np.testing.assert_allclose(f, [1, .5, 0])
        np.testing.assert_allclose(s, [0, math.log(2), 0])
        json.dumps(self.calc(temperature=1e-320), allow_nan=False)

    def test_published_presets_run_and_match_scenario(self):
        path = Path(__file__).resolve().parents[1]/"dist/data/hall-response-content.json"
        data = json.loads(path.read_text(encoding="utf8"))
        for preset in data["modules"][0]["presets"]:
            r = run(preset["input"])
            json.dumps(r, allow_nan=False)
            if preset["id"] == "hall-project-metal":
                self.assertTrue(r["selection"]["numericallyResolved"])
                self.assertGreater(r["selection"]["sigmaXY"], 0)
                self.assertLess(r["selection"]["alphaXY"], 0)
            if preset["id"] == "hall-unresolved":
                self.assertTrue(r["checks"]["needsRefinement"])

    def test_bad_inputs_rejected(self):
        cases = [{"mass": float("nan")}, {"mass": True}, {"temperature": -1}, {"temperature": float("inf")},
                 {"energyScale": 0}, {"mesh": 121.0}, {"mesh": 14}, {"mesh": 122}, {"scanPoints": 102},
                 {"chemicalPotential": "0"}, {"muMin": 2, "muMax": 1}, {"muMin": 2, "muMax": 2}]
        for payload in cases:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                run(payload)

    def test_json_serializable_complete_scan(self):
        for payload in [{}, {"mass": 0}, {"chemicalPotential": 1.5, "temperature": 0}]:
            r = self.calc(**payload)
            json.dumps(r, allow_nan=False)
            self.assertEqual(len(r["scan"]["rows"]), 11)
            self.assertEqual([c["mesh"] for c in r["convergence"]], [31, 62])


if __name__ == "__main__":
    unittest.main(verbosity=2)
