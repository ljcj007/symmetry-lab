"""Independent official CPython vs WebAssembly spglib regression tests."""
import dataclasses
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest

import numpy as np
import spglib

ROOT = Path(__file__).resolve().parents[1]


def wasm(requests):
    output = subprocess.run(["node", str(ROOT / "scripts" / "spglib-wasm-runner.mjs")],
                            input=json.dumps(requests), text=True, capture_output=True, check=True, cwd=ROOT)
    return json.loads(output.stdout)


def orbit(hall, lattice):
    symmetry = spglib.get_symmetry_from_database(hall)
    sites, numbers = [], []
    for number, point in enumerate([[.137, .271, .389], [.193, .417, .083]], 1):
        seen = set()
        for rotation, translation in zip(symmetry["rotations"], symmetry["translations"]):
            image = (rotation @ point + translation) % 1
            key = tuple(np.round(image, 10))
            if key not in seen:
                seen.add(key); sites.append(image.tolist()); numbers.append(number)
    return [lattice, sites, numbers]


class SpglibWasmTests(unittest.TestCase):
    def assert_dataset(self, actual, expected):
        self.assertNotIn("error", actual)
        for field in dataclasses.fields(expected):
            value = getattr(expected, field.name)
            self.assertIn(field.name, actual)
            if isinstance(value, np.ndarray):
                np.testing.assert_allclose(actual[field.name], value, rtol=0, atol=2e-10,
                                           err_msg=field.name)
            else:
                self.assertEqual(actual[field.name], value, field.name)

    def test_01_binary_provenance(self):
        provenance = json.loads((ROOT / "dist/vendor/spglib/provenance.json").read_text())
        self.assertEqual(spglib.__version__, provenance["version"])
        for name, digest in provenance["assets"].items():
            self.assertEqual(hashlib.sha256((ROOT / "dist/vendor/spglib" / name).read_bytes()).hexdigest(), digest)

    def test_02_all_530_hall_types_and_operation_tables(self):
        requests = [{"action": action, "hall_number": hall} for hall in range(1, 531) for action in ["type", "database"]]
        result = wasm(requests)
        for hall in range(1, 531):
            expected_type = dataclasses.asdict(spglib.get_spacegroup_type(hall))
            self.assertEqual(result[2 * (hall - 1)], expected_type, f"Hall {hall}")
            expected_symmetry = spglib.get_symmetry_from_database(hall)
            actual = result[2 * (hall - 1) + 1]
            np.testing.assert_array_equal(actual["rotations"], expected_symmetry["rotations"])
            np.testing.assert_allclose(actual["translations"], expected_symmetry["translations"], rtol=0, atol=0)

    def test_03_dataset_all_crystal_systems_and_origin_choices(self):
        hall_groups = [1, 2, 6, 9, 14, 39, 81, 108, 115, 125, 228, 229, 292, 298,
                       350, 364, 400, 418, 434, 439, 443, 458, 460, 463, 488, 489, 517, 525, 526, 529, 530]
        cells = []
        for hall in hall_groups:
            number = spglib.get_spacegroup_type(hall).number
            if number <= 2:
                lattice = [[3.1, .2, .3], [.4, 4.2, .1], [.2, .3, 5.3]]
            elif number <= 15:
                lattice = [[3.1, 0, .7], [0, 4.2, 0], [0, 0, 5.3]]
            elif number <= 74:
                lattice = np.diag([3.1, 4.2, 5.3]).tolist()
            elif number <= 142:
                lattice = np.diag([3.1, 3.1, 5.3]).tolist()
            elif number <= 194:
                lattice = [[3.1, 0, 0], [-1.55, 3.1 * 3 ** .5 / 2, 0], [0, 0, 5.3]]
            else:
                lattice = np.eye(3).tolist()
            cells.append(orbit(hall, lattice))
        requests = [{"action": "dataset", "cell": cell, "symprec": 1e-5, "angle_tolerance": -1} for cell in cells]
        results = wasm(requests)
        for cell, actual in zip(cells, results):
            self.assert_dataset(actual, spglib.get_symmetry_dataset(cell))

    def test_04_sheared_rotated_supercell_and_forced_hall(self):
        cells = []
        base = orbit(81, np.diag([3.1, 4.2, 5.3]).tolist())
        shear = np.array([[1, 2, -1], [0, 1, 1], [0, 0, 1]])
        rotation = np.array([[.8, -.6, 0], [.6, .8, 0], [0, 0, 1]])
        cells.append([(shear @ base[0] @ rotation).tolist(),
                      (np.array(base[1]) @ np.linalg.inv(shear) + [.177, .233, .311]).tolist(), base[2]])
        cells.append([[[2, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 0, 0], [.5, 0, 0]], [1, 1]])
        cells.append([[[0, .5, .5], [.5, 0, .5], [.5, .5, 0]], [[0, 0, 0], [.25, .25, .25]], [14, 14]])
        requests = [{"action": "dataset", "cell": cell} for cell in cells]
        requests += [{"action": "dataset", "cell": cells[-1], "hall_number": hall} for hall in [525, 526]]
        actual = wasm(requests)
        for request, result in zip(requests, actual):
            expected = spglib.get_symmetry_dataset(request["cell"], hall_number=request.get("hall_number", 0))
            self.assert_dataset(result, expected)

    def test_05_standardize_conventional_primitive_and_no_idealize(self):
        cell = [[[0, .5, .5], [.5, 0, .5], [.5, .5, 0]], [[0, 0, 0], [.25, .25, .25]], [14, 14]]
        requests = [{"action": "standardize", "cell": cell, "to_primitive": p, "no_idealize": n}
                    for p in [False, True] for n in [False, True]]
        for request, result in zip(requests, wasm(requests)):
            expected = spglib.standardize_cell(cell, to_primitive=request["to_primitive"], no_idealize=request["no_idealize"])
            for key, value in zip(["lattice", "positions", "numbers"], expected):
                np.testing.assert_allclose(result[key], value, rtol=0, atol=2e-10)

    def test_06_failed_dataset_returns_error_without_crashing(self):
        duplicate = [np.eye(3).tolist(), [[0, 0, 0], [0, 0, 0]], [1, 1]]
        result = wasm([{"action": "dataset", "cell": duplicate}, {"action": "type", "hall_number": 517}])
        self.assertIn("error", result[0])
        self.assertEqual(result[1]["number"], 221)


if __name__ == "__main__":
    unittest.main()
