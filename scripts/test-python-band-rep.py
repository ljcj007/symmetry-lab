"""Physical checks of real-space induction, independent of local D labels."""
import json
from pathlib import Path
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist" / "python"))
import band_rep_lab as lab


def z(value):
    if isinstance(value, dict): return complex(value["re"], value["im"])
    if isinstance(value, list): return np.array([z(x) for x in value])
    return value


def chars_by_operation(result):
    return dict(zip(result["representation"]["operationNames"], z(result["representation"]["characters"])))


class BandRepresentationTests(unittest.TestCase):
    def test_frozen_operations_match_original_catalogue(self):
        source = json.loads((ROOT / "dist/data/space-groups.json").read_text(encoding="utf8"))["groups"]
        for number in (2, 4, 19, 221):
            original = next(g for g in source if g["number"] == number)
            frozen = lab._RAW_GROUPS[str(number)]
            self.assertEqual(frozen["symbol"], original["symbol"])
            self.assertEqual(frozen["operations"], [{k: op[k] for k in ("name", "rotation", "translation")}
                                                    for op in original["operations"]])

    def test_independent_analytic_screw_matrix_and_fourier_coefficients(self):
        # SG4 BC setting: S={diag(-1,-1,1)|0,0,1/2}. The positions,
        # permutation and cell shifts below are independently hand-derived.
        ops = lab._group(4)["operations"]
        screw = ops[1]
        mapping = np.array([1, 0]); shifts = np.array([[-1, -1, 0], [-1, -1, 1]])
        k = np.array([.123, .237, .319]); q = np.array([-k[0], -k[1], k[2]])
        matrix = lab._bloch_matrix(screw, mapping, shifts, k, "s")
        phase = np.exp(-2j*np.pi*(k[0]+k[1]))
        expected = np.array([[0, phase*np.exp(-2j*np.pi*k[2])], [phase, 0]])
        np.testing.assert_allclose(matrix, expected, atol=1e-14)
        # Check against an individual real-space Fourier summand. No quotient
        # factors or character routine is used for this identity.
        for a in (0, 1):
            for T in ([0, 0, 0], [2, -1, 3], [-3, 2, -2]):
                destination_cell = screw["rotation"] @ T + shifts[a]
                incoming = np.exp(2j*np.pi*np.dot(k, T))
                transformed = matrix[mapping[a], a] * np.exp(2j*np.pi*np.dot(q, destination_cell))
                self.assertAlmostEqual(abs(incoming-transformed), 0, places=13)

    def test_screw_boundary_square_eigenvalues_and_sensitivity_to_phase(self):
        for group in (4, 19):
            for orbital in ("s", "p"):
                result = lab.calculate({"group": group, "orbitals": orbital, "kPoint": "Z"})
                names = result["representation"]["operationNames"]
                # Actual rotation, rather than the historical name, selects z.
                allops = result["spaceGroup"]["operations"]
                source = result["representation"]["operationIndices"]
                index = next(i for i,j in enumerate(source) if allops[j]["rotation"] == [[-1,0,0],[0,-1,0],[0,0,1]])
                U = z(result["representation"]["matrices"])[index]
                np.testing.assert_allclose(U @ U, -np.eye(len(U)), atol=1e-13)
                eigen = np.linalg.eigvals(U)
                self.assertTrue(all(min(abs(w-1j), abs(w+1j)) < 1e-12 for w in eigen))
                self.assertEqual(sum(abs(w-1j) < 1e-12 for w in eigen), len(U)//2)
                # Removing the phases genuinely breaks this physical relation.
                stripped = np.where(abs(U) > .5, 1.0, 0.0)
                self.assertGreater(np.max(abs(stripped @ stripped + np.eye(len(U)))), 1)

    def test_inversion_centers_orbitals_and_general_pair(self):
        for site in ("origin", "body"):
            for point, sign in (("G",1), ("X", -1 if site == "body" else 1),
                                ("M",1), ("R",-1 if site == "body" else 1)):
                for orbital, parity, dim in (("s",1,1), ("p",-1,3)):
                    r = lab.calculate({"group":2, "site":site, "kPoint":point, "orbitals":orbital})
                    self.assertAlmostEqual(chars_by_operation(r)["I"], sign*parity*dim)
        for point in ("G", "X", "R"):
            r = lab.calculate({"group":2, "site":"general", "kPoint":point})
            self.assertEqual(r["checks"]["orbitSize"],2)
            self.assertEqual(r["checks"]["stabilizerOrder"],1)
            self.assertAlmostEqual(chars_by_operation(r)["I"],0)
            self.assertEqual(sorted((t["dimension"],t["multiplicity"]) for t in r["decomposition"]["terms"]),[(1,1),(1,1)])

    def test_sg19_boundary_quaternion_algebra_and_dimension(self):
        gamma = lab.calculate({"group":19, "kPoint":"G"})
        self.assertEqual([(t["dimension"],t["multiplicity"]) for t in gamma["decomposition"]["terms"]],[(1,1)]*4)
        for orbital, multiplicity in (("s",2),("p",6)):
            r=lab.calculate({"group":19,"kPoint":"R","orbitals":orbital})
            terms=r["decomposition"]["terms"]
            self.assertEqual([(t["dimension"],t["multiplicity"]) for t in terms],[(2,multiplicity)])
            U=z(r["representation"]["matrices"])
            for i in (1,2,3):
                np.testing.assert_allclose(U[i]@U[i],-np.eye(len(U[i])),atol=1e-13)
            for i,j in ((1,2),(2,3),(3,1)):
                np.testing.assert_allclose(U[i]@U[j],-U[j]@U[i],atol=1e-13)

    def test_cubic_vector_and_face_orbit_decomposition(self):
        r=lab.calculate({"group":221,"site":"origin","orbitals":"p"})
        c=chars_by_operation(r)
        self.assertAlmostEqual(c["I"],-3)
        self.assertEqual([(t["dimension"],t["multiplicity"]) for t in r["decomposition"]["terms"]],[(3,1)])
        self.assertAlmostEqual(sum(abs(x)**2 for x in c.values())/48,1)
        for orbital, expected in (("s",[(1,1),(2,1)]),("p",[(3,1),(3,2)])):
            face=lab.calculate({"group":221,"site":"faces","orbitals":orbital})
            actual={tuple(x) for x in face["site"]["positions"]}
            self.assertEqual(actual,{(0,.5,.5),(.5,0,.5),(.5,.5,0)})
            self.assertEqual(face["checks"]["stabilizerOrder"],16)
            self.assertEqual(sorted((t["dimension"],t["multiplicity"]) for t in face["decomposition"]["terms"]),expected)

    def test_all_sites_interior_and_boundary_multiplication_reconstruction(self):
        for number, sites in lab.SITES.items():
            for site in sites:
                for orbital in ("s","p"):
                    for point in ("G","R","line"):
                        with self.subTest(number=number,site=site,orbital=orbital,point=point):
                            r=lab.calculate({"group":number,"site":site,"orbitals":orbital,"kPoint":point,"kz":.231})
                            check=r["checks"]
                            self.assertTrue(check["passed"])
                            self.assertEqual(check["orbitSize"]*check["stabilizerOrder"],check["groupOrder"])
                            for key in ("productResidual","unitarityResidual","fullCovarianceResidual","characterReconstructionResidual"):
                                self.assertLess(check[key],1e-10)
                            U=z(r["representation"]["matrices"])
                            ir={x["label"]:z(x["characters"]) for x in r["irreps"]}
                            reconstruction=sum(t["multiplicity"]*ir[t["label"]] for t in r["decomposition"]["terms"])
                            np.testing.assert_allclose(reconstruction,np.trace(U,axis1=1,axis2=2),atol=1e-11)
                            # The returned JSON has no complex/numpy escape hatches.
                            json.dumps(r,allow_nan=False)

    def test_content_links_answers_and_actual_presets(self):
        content=json.loads((ROOT/"dist/data/bandrep-content.json").read_text(encoding="utf8"))
        self.assertEqual(content["release"],lab.RELEASE)
        module=content["module"]
        self.assertEqual((module["id"],module["action"],module["route"]),("bandrep","band_rep_lab","band-representation-lab"))
        presets={p["id"]:p for p in module["presets"]}
        sources={s["id"] for s in content["sources"]}
        lessons={l["id"] for l in content["lessons"]}
        self.assertGreaterEqual(len(content["lessons"]),3)
        self.assertGreaterEqual(len(content["exercises"]),3)
        self.assertGreaterEqual(len(content["cases"]),3)
        for p in presets.values(): self.assertTrue(lab.calculate(p["input"])["checks"]["passed"])
        defaults={f["key"]:f["default"] for f in module["fields"]}
        self.assertTrue(lab.calculate(defaults)["checks"]["passed"])
        for lesson in content["lessons"]:
            self.assertIn(lesson["preset"],presets)
            self.assertTrue(set(lesson["references"]) <= sources)
        for exercise in content["exercises"]:
            self.assertIn(exercise["lesson"],lessons)
            self.assertEqual(len(exercise["steps"]),4)
            for step in exercise["steps"]:
                self.assertIn(step["answer"],range(len(step["choices"])))
                self.assertTrue(step["hint"] and step["explanation"])
        for case in content["cases"]: self.assertIn(case["preset"],presets)

    def test_explicit_scope_and_input_validation(self):
        for bad in ({"group":1},{"group":True},{"group":float("nan")},
                    {"group":221,"site":"general"},{"group":4,"site":"origin"},
                    {"orbitals":"px"},{"orbitals":"spinful"},{"kPoint":"unknown"},
                    {"kz":float("inf")},{"kz":-.1},{"kz":.6}):
            with self.subTest(bad=bad),self.assertRaises(ValueError): lab.calculate(bad)
        r=lab.calculate()
        self.assertTrue(any("EBR" in w for w in r["warnings"]))
        self.assertTrue(any("时间反演" in w for w in r["warnings"]))


if __name__ == "__main__": unittest.main()
