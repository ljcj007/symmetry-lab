"""Independent finite-complex, periodic-boundary and API-trace checks."""
import json
import math
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from runpy import run_path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".openai/local-python-deps"))
sys.path.insert(0, str(ROOT / "dist/python"))
sys.path.insert(0, str(ROOT / "scripts"))
import numpy as np
import quantum_geometry_lab as core
reference_tools = run_path(str(ROOT / "scripts/check-fhs-plaquette-reference.py"))
independent_grid, independent_state, reference, contract_checks = (
    reference_tools[name] for name in ("independent_grid", "independent_state", "reference", "contract_checks"))


class FHSReplayTests(unittest.TestCase):
    def test_independent_analytic_loops_and_reference_contract(self):
        data = reference()
        contract_checks(data)
        for row in data["cases"]:
            mass = row["input"]["mass"]
            if mass == -2:
                continue
            for size in (9, 17):
                _, _, _, fluxes = independent_grid(size, mass)
                total = math.fsum(value for line in fluxes for value in line)/(2*math.pi)
                expected = 1 if mass == -1 else -1 if mass == 1 else 0
                self.assertLess(abs(total-expected), 2e-14)

    def test_collector_preserves_ordinary_aggregate_and_does_not_mutate_frames(self):
        k = [-math.pi+2*math.pi*i/9 for i in range(9)]
        frames = np.array([[independent_state(x, y, -1) for x in k] for y in k])
        original = frames.copy()
        plain = core._fhs(frames)
        collected = {}
        traced = core._fhs(frames, collected)
        self.assertEqual(plain, traced)
        self.assertEqual(set(plain), {"value", "minOverlap", "maxPlaquettePhase", "valid"})
        np.testing.assert_array_equal(frames, original)
        self.assertTrue(collected["linksValid"])
        self.assertEqual(len(collected["cells"]), 2)
        # Swapping axes reverses active orientation, not just display labels.
        self.assertLess(abs(core._fhs(frames.swapaxes(0, 1))["value"]+plain["value"]), 2e-14)

    def test_zero_and_subthreshold_links_stay_unormalized_and_null(self):
        for epsilon in (0., 1e-12):
            frames = np.zeros((3, 3, 2), complex)
            frames[..., 0] = 1
            frames[0, 0] = [epsilon, math.sqrt(1-epsilon**2)]
            collected = {}
            result = core._fhs(frames, collected)
            self.assertFalse(result["valid"])
            self.assertIsNone(result["value"])
            self.assertIsNone(result["maxPlaquettePhase"])
            self.assertFalse(collected["linksValid"])
            for cell in collected["cells"]:
                self.assertEqual(len(cell["rawForwardOverlaps"]), 4)
                self.assertIsNone(cell["loop"])
                self.assertIsNone(cell["fluxRad"])
            json.dumps(collected, allow_nan=False)

    def test_trace_uses_same_batch_arrays_without_extra_diagonalization(self):
        original = np.linalg.eigh
        with patch.object(core.np.linalg, "eigh", wraps=original) as diagonalize:
            result = core.run({"mass": -1, "mesh": 9, "pathSamples": 31, "gaugeStrength": 2})
        # Existing base sample, fine sample and independent local selection.
        self.assertEqual(diagonalize.call_count, 3)
        replay = result["fhsReplay"]
        self.assertEqual(replay["mesh"], result["convergence"][0]["mesh"])
        self.assertEqual(replay["convergenceIndex"], 0)
        self.assertEqual(replay["sewing"], "identity")
        boundary = replay["cells"][1]
        self.assertEqual(boundary["anchor"], [8, 8])
        self.assertEqual([v["index"] for v in boundary["corners"]], [[8, 8], [8, 0], [0, 0], [0, 8]])
        self.assertAlmostEqual(boundary["corners"][1]["k"][0], -math.pi)
        self.assertAlmostEqual(boundary["corners"][1]["unwrappedK"][0], math.pi)

    def test_global_gap_nulls_ssh_and_unchanged_input_boundary(self):
        for mass in (-2, 0, 2):
            result = core.run({"mass": mass, "mesh": 9, "pathSamples": 31})
            self.assertFalse(result["topology"]["defined"])
            self.assertFalse(result["fhsReplay"]["bandIsolated"])
            self.assertIsNone(result["topology"]["value"])
            for cell in result["fhsReplay"]["cells"]:
                for stage in ("before", "after"):
                    self.assertEqual(len(cell[stage]["rawForwardOverlaps"]), 4)
                    self.assertIsNone(cell[stage]["loop"])
                    self.assertIsNone(cell[stage]["fluxRad"])
            json.dumps(result, allow_nan=False)
        ssh = core.run({"model": "ssh", "mesh": 9, "pathSamples": 31})
        self.assertIsNone(ssh["fhsReplay"])
        for key in ("plaquette", "sewing", "phase", "rawForwardOverlaps"):
            with self.assertRaises(ValueError):
                core.run({key: 0})


if __name__ == "__main__":
    unittest.main(verbosity=2)
