"""Catalog references, runnable presets and independently checkable lesson claims."""
from collections import Counter
import importlib
import json
import math
from pathlib import Path
import sys
import unittest
from urllib.parse import urlparse

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist" / "python"))
CATALOG = json.loads((ROOT / "dist" / "data" / "electronic-materials.json").read_text(encoding="utf-8"))


class ElectronicContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.modules = {m["id"]: m for m in CATALOG["modules"]}
        cls.lessons = {l["id"]: l for l in CATALOG["lessons"]}
        cls.presets = {m["id"]: {p["id"]: p for p in m["presets"]} for m in CATALOG["modules"]}
        cls.results = {}
        for m in CATALOG["modules"]:
            runner = importlib.import_module(m["action"]).run
            for p in m["presets"]:
                cls.results[p["id"]] = runner(p["input"])

    def test_schema_unique_ids_and_balanced_coverage(self):
        self.assertEqual(CATALOG["schema"], "symmetry-lab-electronic-materials-1")
        self.assertEqual(set(self.modules), {"pairing", "shg", "unfold"})
        for key in ("modules", "lessons", "exercises", "cases", "sources"):
            ids = [item["id"] for item in CATALOG[key]]
            self.assertEqual(len(ids), len(set(ids)), key)
        for key in ("lessons", "exercises"):
            self.assertEqual(Counter(item["module"] for item in CATALOG[key]), {"pairing": 3, "shg": 3, "unfold": 3})
        self.assertEqual(sum(len(e["steps"]) for e in CATALOG["exercises"]), 36)
        self.assertEqual(len(CATALOG["cases"]), 8)

    def test_lesson_and_exercise_references(self):
        sources = {s["id"] for s in CATALOG["sources"]}
        for lesson in self.lessons.values():
            self.assertIn(lesson["module"], self.modules)
            self.assertIn(lesson["preset"], self.presets[lesson["module"]])
            self.assertGreaterEqual(len(lesson["sections"]), 3)
            self.assertTrue(lesson["references"])
            self.assertLessEqual(set(lesson["references"]), sources)
            for section in lesson["sections"]:
                self.assertTrue(section["title"].strip())
                self.assertGreater(len(section["text"]), 40)
                self.assertTrue(section["formula"].strip())
        covered = set()
        for exercise in CATALOG["exercises"]:
            self.assertIn(exercise["lesson"], self.lessons)
            self.assertEqual(self.lessons[exercise["lesson"]]["module"], exercise["module"])
            self.assertEqual(len(exercise["steps"]), 4)
            covered.add(exercise["lesson"])
            for step in exercise["steps"]:
                self.assertEqual(len(step["choices"]), 3)
                self.assertEqual(len(set(step["choices"])), 3)
                self.assertIs(type(step["answer"]), int)
                self.assertIn(step["answer"], range(3))
                for field in ("prompt", "hint", "explanation"):
                    self.assertTrue(step[field].strip())
        self.assertEqual(covered, set(self.lessons))

    def test_cases_routes_sources_and_boundaries_are_present(self):
        for m in self.modules.values():
            self.assertEqual(m["route"], {"pairing": "pairing-lab", "shg": "shg-lab", "unfold": "unfold-lab"}[m["id"]])
            self.assertEqual(m["pathway"], {"pairing": "spin", "shg": "observables", "unfold": "crystal"}[m["id"]])
            self.assertTrue(m["summary"])
        for case in CATALOG["cases"]:
            self.assertIn(case["module"], self.modules)
            self.assertIn(case["preset"], self.presets[case["module"]])
            self.assertGreater(len(case["assumption"]), 30)
            self.assertTrue(case["kind"])
            self.assertGreaterEqual(len(case["links"]), 2)
            for title, target in case["links"]:
                self.assertTrue(title)
                self.assertTrue(target.startswith(("#compute/", "#classroom/", "#atlas/")))
        for source in CATALOG["sources"]:
            parsed = urlparse(source["url"])
            self.assertEqual(parsed.scheme, "https")
            self.assertIn(parsed.hostname, {"kwant-project.org", "arxiv.org", "topocondmat.org", "bfichera.github.io", "wiki.yambo-code.eu", "smtg-bham.github.io"})
        text = json.dumps(CATALOG, ensure_ascii=False)
        for phrase in ("不预测临界温度", "Fresnel", "不是绝对", "不直接读取 WAVECAR", "周期", "简并", "相位"):
            # Absolute power qualification can appear as either wording.
            if phrase == "不是绝对":
                self.assertIn("绝对光功率", text)
            else:
                self.assertIn(phrase, text)

    def test_all_sixteen_presets_run_and_return_finite_json(self):
        self.assertEqual(len(self.results), 16)
        for name, result in self.results.items():
            with self.subTest(name=name):
                json.dumps(result, allow_nan=False)
                self.assertTrue(result["warnings"])
                self.assertTrue(result["sources"])
                if "checks" in result:
                    self.assertTrue(result["checks"].get("passed", result["checks"].get("allPassed")))
                else:
                    self.assertLess(result["symmetry"]["covarianceResidual"], 1e-12)

    def test_default_presets_match_ui_initial_models(self):
        p = self.modules["pairing"]["presets"][0]["input"]
        self.assertEqual((p["model"], p["pairing"], p["chemical_potential"]), ("square_singlet", "d_x2_y2", -1))
        self.assertEqual(self.modules["shg"]["presets"][0]["input"]["model"], "gaas")
        self.assertEqual(self.modules["unfold"]["presets"][0]["input"]["model"], "impurity")

    def test_pairing_lesson_node_and_phase_claims(self):
        d = self.results["square-d"]["summary"]["analytic_nodes"]
        self.assertTrue(d["gapless"])
        self.assertEqual(len(d["points"]), 4)
        for point in d["points"]:
            np.testing.assert_allclose(np.cos(point), [.25, .25], atol=2e-15)
        self.assertFalse(self.results["square-s"]["summary"]["analytic_nodes"]["gapless"])
        self.assertTrue(self.results["square-extended-s"]["summary"]["analytic_nodes"]["gapless"])
        self.assertFalse(self.results["square-did"]["summary"]["analytic_nodes"]["gapless"])
        self.assertTrue(self.results["kitaev-topological"]["summary"]["topological"])
        self.assertFalse(self.results["kitaev-trivial"]["summary"]["topological"])

    def test_shg_lesson_analytic_number_and_inversion_counterexample(self):
        from shg_lab import run
        r = run({**self.presets["shg"]["gaas-001"]["input"], "azimuth": 45})
        self.assertAlmostEqual(r["selection"]["intensity"], 1/8)
        normal = run({"model": "gaas", "incidence": 0})
        self.assertEqual(normal["scan"]["maxIntensity"], 0)
        self.assertFalse(normal["symmetry"]["inversionPresent"])
        self.assertEqual(self.results["batio3-001"]["tensor"]["dimension"], 3)
        self.assertEqual(self.results["oh-zero"]["tensor"]["dimension"], 0)

    def test_unfold_lesson_projection_folding_and_vacancy_claims(self):
        from unfold_lab import fold_k, project
        self.assertAlmostEqual(fold_k(3*math.pi/4, 4), -math.pi/4)
        k, weights = project(0, np.array([[1, 1], [1, -1]])/math.sqrt(2), [0, 1], 2)
        idx = int(np.argmin(abs(k)))
        np.testing.assert_allclose(weights[idx], [1, 0], atol=1e-15)
        np.testing.assert_allclose(weights.sum(axis=0), [1, 1], atol=1e-15)
        self.assertTrue(self.results["chain-perfect"]["checks"]["perfectChainRecovered"])
        self.assertEqual(self.results["chain-vacancy"]["checks"]["expectedMomentumWeightSum"], .75)


if __name__ == "__main__":
    unittest.main(verbosity=2)
