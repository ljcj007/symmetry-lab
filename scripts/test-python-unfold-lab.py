"""Independent analytic spectra, Fourier completeness, and import validation."""
import copy
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist" / "python"))
from unfold_lab import run


def plane_wave_import(n=4, removed=None):
    sites = list(range(n))
    if removed is not None:
        sites.remove(removed)
    m = len(sites)
    ks = [-math.pi/(2*n), 0., math.pi/(2*n)]
    # Construct a complete orthonormal basis independent of the core solver.
    vectors = np.exp(2j*math.pi*np.outer(np.arange(m), np.arange(m))/m)/math.sqrt(m)
    es = np.linspace(-2., 2., m)
    hs = (vectors*es)@vectors.conj().T
    return {"schema": "symmetry-lab-unfold-1", "phaseConvention": "supercell-bloch",
            "energyUnit": "eV", "momentumUnit": "1/a", "size": n,
            "orbitalSites": sites, "kPoints": ks, "energies": [es.tolist() for _ in ks],
            "eigenvectorsReal": [vectors.real.tolist() for _ in ks],
            "eigenvectorsImag": [vectors.imag.tolist() for _ in ks],
            "hamiltoniansReal": [hs.real.tolist() for _ in ks],
            "hamiltoniansImag": [hs.imag.tolist() for _ in ks]}


class UnfoldTests(unittest.TestCase):
    def test_perfect_chain_recovers_primitive_dispersion_all_sizes(self):
        for n in range(2, 13):
            result = run({"size": n, "samples": 9, "hopping": 1.7, "onsite": .24})
            k = np.array(result["unfolded"]["k"])
            e = np.array(result["unfolded"]["energies"])
            w = np.array(result["unfolded"]["weights"])
            expected = .24-3.4*np.cos(k)
            np.testing.assert_allclose(np.sum(e*w, axis=1), expected, atol=2e-14)
            np.testing.assert_allclose(np.sum(w*(e-expected[:, None])**2, axis=1), 0, atol=2e-27)
            self.assertTrue(result["checks"]["perfectChainRecovered"])

    def test_folding_energies_match_cosine_branches_and_two_site_bonds(self):
        for n in [2, 3, 6]:
            result = run({"size": n, "samples": 9})
            for K, e in zip(result["folded"]["k"], result["folded"]["energies"]):
                expected = sorted(-2*np.cos(K+2*math.pi*np.arange(n)/n))
                np.testing.assert_allclose(e, expected, atol=4e-15)
        r = run({"size": 2, "q": 0})
        np.testing.assert_allclose(r["selection"]["energies"], [-2, 2], atol=1e-15)

    def test_state_and_momentum_sum_rules(self):
        for model in ["perfect", "impurity", "dimerized", "alternating", "vacancy"]:
            r = run({"model": model, "size": 6, "samples": 13, "q": -.237})
            expected = 5/6 if model == "vacancy" else 1
            np.testing.assert_allclose(np.sum(r["unfolded"]["weights"], axis=1), expected, atol=3e-15)
            self.assertAlmostEqual(sum(x["weight"] for x in r["selection"]["channels"]), 1)
            self.assertLess(r["checks"]["stateWeightSumMaxError"], 3e-15)
            self.assertLess(r["checks"]["firstMomentMaxError"], 5e-15)
            self.assertTrue(r["checks"]["allPassed"])

    def test_impurity_first_spectral_moment_and_weight_redistribution(self):
        n, impurity = 5, 2.3
        r = run({"model": "impurity", "size": n, "samples": 17, "defectStrength": impurity})
        k = np.array(r["unfolded"]["k"])
        w = np.array(r["unfolded"]["weights"])
        e = np.array(r["unfolded"]["energies"])
        # <k|V_impurity|k> = V/N; no implementation matrix used here.
        np.testing.assert_allclose(np.sum(w*e, axis=1), -2*np.cos(k)+impurity/n, atol=1e-14)
        self.assertGreater(np.count_nonzero(w[4] > 1e-3), 1)

    def test_dimerized_two_site_analytic_spectrum(self):
        t, delta = 1.7, .27
        r = run({"model": "dimerized", "size": 2, "hopping": t, "dimerization": delta})
        for K, values in zip(r["folded"]["k"], r["folded"]["energies"]):
            t1, t2 = t*(1+delta), t*(1-delta)
            e = math.sqrt(t1*t1+t2*t2+2*t1*t2*math.cos(2*K))
            np.testing.assert_allclose(values, [-e, e], atol=3e-15)
        self.assertAlmostEqual(r["folded"]["energies"][0][1]-r["folded"]["energies"][0][0], 4*t*abs(delta))

    def test_alternating_potential_analytic_spectrum(self):
        r = run({"model": "alternating", "size": 2, "alternatingPotential": .7})
        for K, values in zip(r["folded"]["k"], r["folded"]["energies"]):
            e = math.sqrt(.7**2+4*math.cos(K)**2)
            np.testing.assert_allclose(values, [-e, e], atol=1e-14)

    def test_vacancy_is_removed_orbital_open_chain_and_retains_missing_weight(self):
        for n in [2, 4, 7]:
            for site in [0, n-1]:
                r = run({"model": "vacancy", "size": n, "defectSite": site, "samples": 9})
                expected = sorted(-2*np.cos(math.pi*np.arange(1, n)/n))
                for es in r["folded"]["energies"]:
                    np.testing.assert_allclose(es, expected, atol=3e-15)
                self.assertEqual(r["parameters"]["bands"], n-1)
                self.assertNotIn(site, r["parameters"]["orbitalSites"])
                self.assertAlmostEqual(r["checks"]["expectedMomentumWeightSum"], (n-1)/n)

    def test_selection_at_both_primitive_zone_endpoints(self):
        for q in [-1, 1, -.351, 0]:
            r = run({"q": q})
            self.assertAlmostEqual(r["selection"]["q"], q)
            self.assertTrue(r["selection"]["exactRequestedMomentum"])
            self.assertAlmostEqual(sum(c["probability"] for c in r["selection"]["coefficients"]), 1)

    def test_import_matches_direct_explicit_fourier(self):
        data = plane_wave_import()
        r = run({"mode": "import", "data": data, "q": .031})
        c = np.array(data["eigenvectorsReal"])+1j*np.array(data["eigenvectorsImag"])
        expected = []
        for i, K in enumerate(data["kPoints"]):
            for m in range(data["size"]):
                k = (K+2*math.pi*m/data["size"]+math.pi)%(2*math.pi)-math.pi
                weights = [abs(sum(np.exp(-1j*k*j)*c[i, a, b] for a, j in enumerate(data["orbitalSites"])))**2/data["size"] for b in range(data["size"])]
                expected.append((k, weights))
        expected.sort(key=lambda pair: pair[0])
        np.testing.assert_allclose(r["unfolded"]["k"], [x[0] for x in expected], atol=1e-15)
        np.testing.assert_allclose(r["unfolded"]["weights"], [x[1] for x in expected], atol=1e-15)
        self.assertFalse(r["selection"]["exactRequestedMomentum"])
        self.assertTrue(r["checks"]["hamiltonianProvided"])

    def test_import_orbital_permutation_and_global_eigenstate_phases_invariant(self):
        data = plane_wave_import()
        original = run({"mode": "import", "data": data})
        c = np.array(data["eigenvectorsReal"])+1j*np.array(data["eigenvectorsImag"])
        h = np.array(data["hamiltoniansReal"])+1j*np.array(data["hamiltoniansImag"])
        perm = [2, 0, 3, 1]
        c = c[:, perm, :]*np.exp(1j*np.arange(4))
        h = h[:, perm, :][:, :, perm]
        data["orbitalSites"] = [data["orbitalSites"][j] for j in perm]
        data["eigenvectorsReal"], data["eigenvectorsImag"] = c.real.tolist(), c.imag.tolist()
        data["hamiltoniansReal"], data["hamiltoniansImag"] = h.real.tolist(), h.imag.tolist()
        updated = run({"mode": "import", "data": data})
        np.testing.assert_allclose(original["unfolded"]["weights"], updated["unfolded"]["weights"], atol=5e-16)

    def test_import_energy_reordering_keeps_matching_eigenvectors(self):
        data = plane_wave_import()
        expected = run({"mode": "import", "data": data})
        data["energies"] = [list(reversed(es)) for es in data["energies"]]
        for key in ["eigenvectorsReal", "eigenvectorsImag"]:
            data[key] = np.array(data[key])[:, :, ::-1].tolist()
        actual = run({"mode": "import", "data": data})
        np.testing.assert_allclose(expected["unfolded"]["weights"], actual["unfolded"]["weights"], atol=1e-15)

    def test_import_missing_hamiltonian_disclosed_and_removed_basis(self):
        data = plane_wave_import(5, removed=2)
        del data["hamiltoniansReal"], data["hamiltoniansImag"]
        r = run({"mode": "import", "data": data})
        self.assertFalse(r["checks"]["hamiltonianProvided"])
        self.assertAlmostEqual(r["checks"]["expectedMomentumWeightSum"], .8)
        self.assertTrue(any("未提供独立" in x for x in r["warnings"]))

    def test_bad_imports_rejected(self):
        cases = [
            ("phaseConvention", "unknown"), ("energyUnit", "Hartree"),
            ("orbitalSites", [0, 0, 2, 3]), ("kPoints", [0, .1, 3.]),
            ("kPoints", [0, 0, .1]), ("energies", [[0, 1]]),
            ("eigenvectorsImag", [[[float("nan")]*4]*4]*3),
            ("eigenvectorsReal", [[[0]*4]*4]*3),
        ]
        for key, value in cases:
            data = plane_wave_import()
            data[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({"mode": "import", "data": data})
        for key in ["eigenvectorsReal", "eigenvectorsImag"]:
            data = plane_wave_import()
            del data[key]
            with self.assertRaisesRegex(ValueError, "仅有本征值"):
                run({"mode": "import", "data": data})

    def test_nonhermitian_or_inconsistent_eigenpairs_rejected(self):
        data = plane_wave_import()
        data["hamiltoniansReal"][0][0][1] += .2
        with self.assertRaisesRegex(ValueError, "厄米"):
            run({"mode": "import", "data": data})
        data = plane_wave_import()
        data["energies"][0][0] += .2
        with self.assertRaisesRegex(ValueError, "Hc=Ec"):
            run({"mode": "import", "data": data})

    def test_bounds_and_json_finite(self):
        for payload in [{"size": 13}, {"samples": 999}, {"q": 1.1}, {"model": "dimerized", "size": 3},
                        {"model": "alternating", "size": 5}, {"size": True}, {"hopping": "1"},
                        {"band": 4}, {"model": "vacancy", "size": 2, "band": 1}, {"model": []},
                        {"hopping": 10**400},
                        {"x": "a"*2_000_001}]:
            with self.subTest(payload=str(payload)[:100]), self.assertRaises(ValueError):
                run(payload)
        encoded = json.dumps(run({"size": 12, "samples": 121}), allow_nan=False)
        self.assertLess(len(encoded), 2_000_000)

    def test_example_payloads(self):
        for path in (ROOT/"dist"/"examples").glob("unfold-*.json"):
            r = run(json.loads(path.read_text(encoding="utf-8")))
            self.assertTrue(r["checks"]["allPassed"], path.name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
