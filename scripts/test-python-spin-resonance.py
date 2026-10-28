"""Independent effective-spin limits, transition identities and public contracts."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dist/python"))
from spin_resonance_lab import run, spin_matrices, thermal_populations, grouped_transitions, absorption_spectrum, MU_B_OVER_H, K_B_OVER_H


class ResonanceTests(unittest.TestCase):
    def calculate(self, **updates):
        return run({"fieldPoints": 11, "frequencyPoints": 101, **updates})

    def test_angular_momentum_algebra(self):
        for spin in [0, .5, 1, 1.5, 2, 2.5]:
            x, y, z = spin_matrices(spin)
            self.assertTrue(np.allclose(x @ y - y @ x, 1j * z))
            self.assertTrue(np.allclose(x @ x + y @ y + z @ z, np.eye(len(x)) * spin * (spin + 1)))
            self.assertTrue(np.allclose(x, x.conj().T))
            self.assertTrue(np.allclose(y, y.conj().T))

    def test_isotropic_zeeman_and_temperature_analytic(self):
        for temperature in [0, .01, 4, 300]:
            r = self.calculate(temperature=temperature)
            frequency = 2 * MU_B_OVER_H * .34
            expected_weight = 1 if temperature == 0 else math.tanh(frequency / (2 * K_B_OVER_H * temperature))
            self.assertAlmostEqual(r["selection"]["dominantFrequency"], frequency)
            self.assertAlmostEqual(r["selection"]["totalWeight"], expected_weight)
            self.assertTrue(np.allclose(r["selection"]["energies"], [-frequency / 2, frequency / 2]))

    def test_anisotropic_direction_and_dipole_strength(self):
        g = np.array([1.8, 2.1, 2.6])
        for theta, phi in [(0, 0), (90, 0), (90, 90), (37, 51)]:
            th, ph = np.deg2rad([theta, phi])
            n = np.array([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)])
            e = np.array([np.cos(th) * np.cos(ph), np.cos(th) * np.sin(ph), -np.sin(th)])
            v, w = g * n, g * e
            frequency = MU_B_OVER_H * .34 * np.linalg.norm(v)
            weight = (np.dot(w, w) - np.dot(v, w) ** 2 / np.dot(v, v)) / 4
            r = self.calculate(gX=g[0], gY=g[1], gZ=g[2], theta=theta, phi=phi, temperature=0)
            self.assertAlmostEqual(r["selection"]["dominantFrequency"], frequency)
            self.assertAlmostEqual(r["selection"]["totalWeight"], weight)

    def test_isotropic_orientation_invariance_and_parallel_dark(self):
        reference = self.calculate()
        for theta, phi in [(20, 30), (90, 120), (180, 225)]:
            for polarization in ["theta", "phi"]:
                r = self.calculate(theta=theta, phi=phi, polarization=polarization)
                self.assertAlmostEqual(r["selection"]["totalWeight"], reference["selection"]["totalWeight"])
            dark = self.calculate(theta=theta, phi=phi, polarization="parallel")
            self.assertIsNone(dark["selection"]["dominantFrequency"])
            self.assertEqual(dark["selection"]["totalWeight"], 0)
            self.assertTrue(np.allclose(dark["spectrum"]["absorption"], 0))

    def test_spin_half_zero_field_terms_vanish(self):
        baseline = self.calculate()
        altered = self.calculate(zeroFieldD=12, zeroFieldE=-8)
        self.assertTrue(np.allclose(baseline["selection"]["energies"], altered["selection"]["energies"]))
        self.assertTrue(any("S=1/2" in w for w in altered["warnings"]))

    def test_spin_one_zero_field_exact_levels(self):
        d, e = 2.87, .15
        r = self.calculate(spin=1, field=0, zeroFieldD=d, zeroFieldE=e)
        self.assertTrue(np.allclose(r["selection"]["energies"], sorted([-2 * d / 3, d / 3 - e, d / 3 + e])))
        axial = self.calculate(spin=1, field=0, zeroFieldD=d, temperature=0)
        self.assertEqual([g["degeneracy"] for g in axial["selection"]["groups"]], [1, 2])
        self.assertAlmostEqual(axial["selection"]["totalWeight"], 4)
        self.assertAlmostEqual(axial["selection"]["dominantFrequency"], d)
        negative = self.calculate(spin=1, field=0, zeroFieldD=-d, temperature=0)
        self.assertAlmostEqual(negative["selection"]["totalWeight"], 2)

    def test_hyperfine_singlet_triplet(self):
        a = .3
        r = self.calculate(nuclearSpin=.5, field=0, hyperfinePerp=a, hyperfineParallel=a, temperature=0)
        self.assertEqual(r["dimension"], 4)
        self.assertTrue(np.allclose(r["selection"]["energies"], [-3 * a / 4, a / 4, a / 4, a / 4]))
        self.assertEqual([g["degeneracy"] for g in r["selection"]["groups"]], [1, 3])
        self.assertAlmostEqual(r["selection"]["dominantFrequency"], a)
        self.assertAlmostEqual(r["selection"]["totalWeight"], 1)

    def test_hyperfine_breit_rabi_eigenvalues(self):
        a, field, gamma = .37, .21, .04257748
        r = self.calculate(nuclearSpin=.5, field=field, hyperfinePerp=a, hyperfineParallel=a, nuclearGamma=gamma)
        e, n = MU_B_OVER_H * 2 * field, -gamma * field
        expected = sorted([a / 4 + (e + n) / 2, a / 4 - (e + n) / 2, -a / 4 + math.sqrt((e - n) ** 2 + a * a) / 2, -a / 4 - math.sqrt((e - n) ** 2 + a * a) / 2])
        self.assertTrue(np.allclose(r["selection"]["energies"], expected))

    def test_kramers_doublets_at_zero_field(self):
        for spin in [.5, 1.5, 2.5]:
            r = self.calculate(spin=spin, field=0, zeroFieldD=1.7, zeroFieldE=.21)
            es = np.array(r["selection"]["energies"])
            self.assertTrue(np.allclose(es[::2], es[1::2]))

    def test_degenerate_subspace_rotation_invariance(self):
        rng = np.random.default_rng(72)
        matrix = rng.normal(size=(4, 4)) + 1j * rng.normal(size=(4, 4))
        matrix += matrix.conj().T
        energies, populations = np.array([0., 0., 2., 2.]), np.array([.4, .4, .1, .1])
        rotation = np.zeros((4, 4), dtype=complex)
        for offset in [0, 2]:
            block, _ = np.linalg.qr(rng.normal(size=(2, 2)) + 1j * rng.normal(size=(2, 2)))
            rotation[offset:offset + 2, offset:offset + 2] = block
        g0, t0, s0 = grouped_transitions(energies, np.eye(4), matrix, populations)
        g1, t1, s1 = grouped_transitions(energies, rotation, matrix, populations)
        self.assertEqual(g0, g1)
        self.assertAlmostEqual(t0[0]["weight"], t1[0]["weight"])
        self.assertAlmostEqual(t0[0]["strength"], np.sum(abs(matrix[2:, :2]) ** 2))
        self.assertLess(s0 + s1, 1e-10)

    def test_thermal_ground_degeneracy_and_high_t(self):
        self.assertTrue(np.allclose(thermal_populations(np.array([0, 0, 1]), 0), [.5, .5, 0]))
        self.assertTrue(np.allclose(thermal_populations(np.zeros(5), 12), np.ones(5) / 5))
        cold, hot = self.calculate(temperature=1), self.calculate(temperature=500)
        self.assertGreater(cold["selection"]["totalWeight"], hot["selection"]["totalWeight"])

    def test_numerical_degeneracy_at_tiny_positive_temperature(self):
        # Eigensolvers split an exactly degenerate subspace by roundoff. Its
        # states must remain equipopulated even when kT is below that noise.
        energies = np.array([-3., -3. + 1e-13, 1., 1. + 2e-13])
        for temperature in (0., 1e-15, 1e-300, 5e-324):
            np.testing.assert_array_equal(thermal_populations(energies, temperature), [.5, .5, 0., 0.])
        # Group membership, not distances between averaged group energies,
        # decides which states form the numerical ground subspace.
        near = np.array([0., .999e-9, 1.001e-9])
        np.testing.assert_array_equal(thermal_populations(near, 0), [.5, .5, 0.])
        result = self.calculate(spin=1.5, field=0, zeroFieldD=2., zeroFieldE=.15,
                                temperature=5e-324)
        json.dumps(result, allow_nan=False)
        np.testing.assert_array_equal(result['selection']['populations'], [.5, .5, 0., 0.])

    def test_positive_frequency_line_normalization_and_window(self):
        line = [{"frequency": .25, "weight": 2.3}]
        grid = np.linspace(0, 100, 200001)
        values, exact = absorption_spectrum(line, grid, .04)
        numerical = np.sum((values[:-1] + values[1:]) * np.diff(grid) / 2)
        self.assertAlmostEqual(numerical, exact, places=5)
        self.assertGreater(exact, 2.299)
        self.assertLess(exact, 2.3)
        self.assertTrue(np.all(values >= 0))

    def test_grid_warning_and_window_coverage(self):
        r = self.calculate(lineWidth=.001, frequencyPoints=41)
        self.assertFalse(r["checks"]["spectrumGridResolved"])
        out = self.calculate(frequencyMax=2)
        self.assertLess(out["checks"]["spectrumWindowFraction"], .8)

    def test_field_scan_and_largest_space(self):
        r = self.calculate(spin=2.5, nuclearSpin=2.5, zeroFieldD=.6, zeroFieldE=-.1, hyperfinePerp=.1, hyperfineParallel=.3, theta=43, phi=31)
        self.assertEqual(r["dimension"], 36)
        self.assertEqual(len(r["fieldScan"]["energies"]), 11)
        self.assertTrue(all(len(row) == 36 for row in r["fieldScan"]["energies"]))
        self.assertTrue(r["checks"]["passed"])
        self.assertTrue(all(np.all(np.diff(row) >= -1e-10) for row in r["fieldScan"]["energies"]))
        json.dumps(r, allow_nan=False)

    def test_invalid_inputs(self):
        for p in [{"spin": .7}, {"nuclearSpin": .2}, {"gX": 0}, {"field": True}, {"theta": float("nan")}, {"temperature": -1}, {"frequencyPoints": 40}, {"fieldPoints": 11.2}, {"frequencyMin": 3, "frequencyMax": 2}, {"polarization": "circular"}, {"lineWidth": 0}, {"powder": True}, {"deriveFromKanamori": True}]:
            with self.subTest(p=p), self.assertRaises(ValueError):
                self.calculate(**p)


if __name__ == "__main__":
    unittest.main(verbosity=2)
