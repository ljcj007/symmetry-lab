"""Generate actual NumPy calculation responses for browser UI contract checks."""
from copy import deepcopy
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist" / "python"))
from pairing_lab import run as pairing
from shg_lab import run as shg
from unfold_lab import run as unfold

requests = {
    "pairingSquare": ("pairing_lab", {"model": "square_singlet", "pairing": "d_x2_y2", "hopping": 1,
                                      "chemical_potential": -1, "gap": .4, "grid": 11, "path_samples": 11}),
    "pairingDid": ("pairing_lab", {"model": "square_singlet", "pairing": "d+id", "hopping": 1,
                                   "chemical_potential": -1, "gap": .4, "grid": 11, "path_samples": 11}),
    "pairingKitaev": ("pairing_lab", {"model": "kitaev", "hopping": 1, "chemical_potential": 0,
                                      "gap": .6, "sites": 20, "path_samples": 21}),
    "pairingTrivial": ("pairing_lab", {"model": "kitaev", "hopping": 1, "chemical_potential": 3,
                                       "gap": .6, "sites": 20, "path_samples": 21}),
    "pairingCritical": ("pairing_lab", {"model": "kitaev", "hopping": 1, "chemical_potential": 2,
                                        "gap": .6, "sites": 20, "path_samples": 21}),
    "shgGaas": ("shg_lab", {"model": "gaas", "cut": "001", "incidence": 45, "azimuth": 30,
                            "samples": 37, "channel": "PP", "coefficients": {"xyz": 1}}),
    "shgBTO": ("shg_lab", {"model": "batio3", "cut": "111", "cOverA": 1.01,
                           "incidence": 45, "azimuth": 30, "samples": 37, "channel": "PP",
                           "coefficients": {"xxz": 1, "zxx": .7, "zzz": 1.5}}),
    "shgZero": ("shg_lab", {"model": "centrosymmetric", "cut": "001", "incidence": 45,
                            "azimuth": 30, "samples": 37, "channel": "PP", "coefficients": {}}),
    "unfoldPerfect": ("unfold_lab", {"model": "perfect", "size": 4, "samples": 9}),
    "unfoldImpurity": ("unfold_lab", {"model": "impurity", "size": 4, "samples": 9, "defectStrength": 1.5}),
    "unfoldVacancy": ("unfold_lab", {"model": "vacancy", "size": 4, "samples": 9}),
    "unfoldSelection": ("unfold_lab", {"model": "impurity", "size": 4, "samples": 9, "q": -.375, "band": 2}),
    "unfoldImport": ("unfold_lab", json.loads((ROOT / "dist" / "examples" / "unfold-import.json").read_text(encoding="utf-8"))),
}
requests["unfoldImportNearest"] = ("unfold_lab", {**deepcopy(requests["unfoldImport"][1]), "q": .1, "band": 1})
calculators = {"pairing_lab": pairing, "shg_lab": shg, "unfold_lab": unfold}
result = {"format": "real-python-electronic-materials-fixtures",
          "samplingNote": "Reduced grids are used only for UI response fixtures. Tests separately assert actual submitted production defaults.",
          "requests": {key: {"action": action, "input": data} for key, (action, data) in requests.items()},
          "results": {key: calculators[action](deepcopy(data)) for key, (action, data) in requests.items()}}
target = ROOT / "scripts" / "fixtures" / "electronic-materials.json"
target.parent.mkdir(exist_ok=True, parents=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
print(f"Generated {len(requests)} real Python electronic-materials fixtures: {target.stat().st_size} bytes")
