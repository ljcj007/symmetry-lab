"""Tie the exact teaching vectors to the existing GaAs phonons API result."""
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT if (ROOT / "dist/python/browser_api.py").is_file() else ROOT.parents[2] / "sites/symmetry-lab"
sys.path.insert(0, str(SITE / "dist/python"))
from browser_api import run

live = run("phonons", {"preset": "gaas", "mode": "z", "amplitude": .08, "steps": 32})
assert live["dimensions"]["mechanical"] == 6
assert live["dimensions"]["acoustic"] == 3
assert live["dimensions"]["optical"] == 3
assert live["decomposition"]["acoustic"][0]["irrep"] == "T2"
assert live["decomposition"]["optical"][0]["irrep"] == "T2"
assert math.isclose(live["frames"][8]["phase"], math.pi / 2)
code = """
import {gaasGammaPeriodicity} from './dist/gamma-periodicity-ui.js';
const records=['axis','a1','a2','a3'].map(route=>[
  gaasGammaPeriodicity('rotation',route),gaasGammaPeriodicity('optical',route)]);
process.stdout.write(JSON.stringify(records));
"""
reply = subprocess.run(
    ["node", "--input-type=module", "-e", code], cwd=ROOT,
    encoding="utf-8", capture_output=True, timeout=20, check=True,
)
for rotation, optical in json.loads(reply.stdout):
    indices = rotation["coefficients"]
    expected_translation = [
        sum(live["cell"][axis][column] * indices[column] for column in range(3))
        for axis in range(3)
    ]
    assert rotation["translation"] == expected_translation
    expected_difference = [-expected_translation[1] / 25, expected_translation[0] / 25, 0]
    assert all(site["delta"] == expected_difference for site in rotation["sites"])
    for site, equilibrium, moved in zip(optical["sites"], live["sites"], live["frames"][8]["sites"], strict=True):
        assert site["symbol"] == equilibrium["species"] == moved["species"]
        assert site["position"] == equilibrium["cartesian"]
        for actual, start, end in zip(site["displacement"], equilibrium["cartesian"], moved["cartesian"], strict=True):
            assert math.isclose(actual, end - start, abs_tol=1e-13)
        assert site["delta"] == [0, 0, 0]
print("Existing GaAs phonons core agrees with the four translations, sites, optical frame and Γ dimensions.")
