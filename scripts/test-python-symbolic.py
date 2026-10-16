"""Independent identities, analytic spectra, symmetry laws and parser boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest

import numpy as np
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import symbolic_core as exact
import magnetictb_browser as numeric

E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
P = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
C4 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]


def example(name):
    return json.loads((ROOT / f"dist/examples/symbolic-{name}.json").read_text(encoding="utf-8"))


def parse_matrix(raw):
    return exact.ExactParser().matrix(raw)


class SafeLanguageTests(unittest.TestCase):
    def test_exact_decimal_and_rational(self):
        parser = exact.ExactParser()
        self.assertEqual(parser.parse("0.1000000000000000000001"), sp.Rational(1000000000000000000001, 10**22))
        self.assertEqual(parser.parse(0.1), sp.Rational(1, 10))
        self.assertEqual(parser.parse("1/3 + 1/6"), sp.Rational(1, 2))
        self.assertEqual(parser.parse("sqrt(2)^2"), 2)
        self.assertEqual(parser.parse(["1/2", "sqrt(3)/2"]), (1+sp.I*sp.sqrt(3))/2)

    def test_no_executable_python_or_attributes(self):
        parser = exact.ExactParser()
        rejected = ["__import__('os').getcwd()", "(1).__class__", "globals()", "open('x')",
                    "[x for x in range(3)]", "lambda: 1", "x[0]", "sum([1,2])", "sqrt(x=2)",
                    "True", "'1'", "1 if x else 2", "1/0", "nan", "2**1000000", "2**(64**64)", "1e99999999"]
        # nan is a legal ordinary real symbol rather than a nonfinite literal.
        rejected.remove("nan")
        for expression in rejected:
            with self.subTest(expression=expression), self.assertRaises((ValueError, SyntaxError)):
                parser.parse(expression)

    def test_assumptions_and_branch_preservation(self):
        result = exact.run({"expression": "sqrt(x**2)", "assumptions": {"x": "real"}})
        self.assertEqual(result["expression"], "Abs(x)")
        result = exact.run({"expression": "sqrt(x**2)", "assumptions": {"x": "positive"}})
        self.assertEqual(result["expression"], "x")
        result = exact.run({"expression": "conjugate(a)", "assumptions": {"a": "complex"}})
        self.assertEqual(result["expression"], "conjugate(a)")
        self.assertTrue(result["mathml"])


class ExactAlgebraTests(unittest.TestCase):
    def test_algebraic_kernel(self):
        raw = [[1, "sqrt(2)", "I"], [2, "2*sqrt(2)", "2*I"]]
        result = exact.run({"action": "algebra", "operation": "nullspace", "matrix": raw})
        self.assertEqual((result["rank"], result["nullity"]), (1, 2))
        self.assertTrue(exact.exact_equal(parse_matrix(raw)*parse_matrix(result["kernel"]), sp.zeros(2, 2)))
        self.assertEqual(result["conditions"], [])

    def test_generic_rank_exception_is_disclosed(self):
        request = example("algebra")
        result = exact.run(request)
        self.assertEqual(result["rank"], 2)
        self.assertTrue(result["conditions"])
        request["matrix"] = [[0, "sqrt(2)", 0], [0, 0, 0]]
        self.assertEqual(exact.run(request)["rank"], 1)

    def test_trigonometric_dependencies_affect_rank(self):
        result = exact.run({"action": "algebra", "operation": "nullspace",
                            "matrix": [[1, "sin(q)", "cos(q)"], ["sin(q)", 1, 0], ["cos(q)", 0, 1]]})
        self.assertEqual((result["rank"], result["nullity"]), (2, 1))
        self.assertTrue(result["verified"])

    def test_original_poles_survive_symbolic_cancellation(self):
        for raw in [[["x/x"]], [["1/x", 0], [0, "x"]]]:
            result = exact.run({"action": "algebra", "operation": "rank", "matrix": raw})
            self.assertTrue(any(c.get("condition") == "x != 0" for c in result["conditions"] if isinstance(c, dict)))
        with self.assertRaisesRegex(ValueError, "original input domain"):
            exact.run({"expression": "x/x", "substitutions": {"x": 0}})

    def test_inverse_charpoly_and_spectrum(self):
        matrix = [["m", "t"], ["t", "-m"]]
        inverse = exact.run({"action": "algebra", "operation": "inverse", "matrix": matrix})
        self.assertTrue(inverse["verified"])
        self.assertTrue(inverse["conditions"])
        result = exact.run({"action": "algebra", "operation": "eigenvalues", "matrix": matrix})
        parser = exact.ExactParser()
        for item in result["eigenvalues"]:
            value = parser.parse(item["value"])
            self.assertEqual(sp.simplify(value**2-parser.parse("m**2+t**2")), 0)

    def test_exact_derivative_and_series(self):
        result = exact.run({"operation": "differentiate", "expression": "sin(k)", "variable": "k", "order": 2})
        self.assertEqual(result["expression"], "-sin(k)")
        result = exact.run({"operation": "series", "expression": "sin(k)", "variable": "k", "order": 5})
        self.assertIn("k**3/6", result["expression"])

    def test_cyclotomic_relations_trace_and_norm(self):
        for n in [1, 2, 3, 4, 5, 7, 8, 12, 24]:
            with self.subTest(n=n):
                result = exact.run({"action": "cyclotomic", "order": n, "expression": "z"})
                self.assertEqual(int(result["trace"]), int(sp.mobius(n)))
                self.assertEqual(abs(int(result["norm"])), 1)
                zero = exact.run({"action": "cyclotomic", "order": n, "expression": f"z**{n}-1"})
                self.assertEqual(zero["expression"], "0")
        result = exact.run({"action": "cyclotomic", "order": 5, "expression": "(1-z)/(1+z)"})
        field = exact.CyclotomicField(5, exact.ExactParser())
        parser = exact.ExactParser({"z": "complex"})
        self.assertEqual(field.reduce(parser.parse(result["expression"])*(1+field.z)-(1-field.z)), 0)

    def test_cyclotomic_kernel_is_independently_numeric(self):
        result = exact.run(example("cyclotomic"))
        self.assertEqual((result["rank"], result["nullity"]), (1, 2))
        parser = exact.ExactParser({"z": "complex"})
        z = parser.symbol("z")
        a = parser.matrix(result["input"])
        b = parser.matrix(result["kernel"])
        residual = np.array((a*b).subs(z, sp.exp(2*sp.pi*sp.I/5)).evalf(), dtype=complex)
        np.testing.assert_allclose(residual, 0, atol=1e-12)
        with self.assertRaisesRegex(ValueError, "denominator"):
            exact.run({"action": "cyclotomic", "order": 3, "expression": "1/(1+z+z**2)"})


class PolynomialOrbitalTests(unittest.TestCase):
    def test_full_f_representation_and_character(self):
        result = exact.run(example("f-orbitals"))
        matrix = parse_matrix(result["matrix"])
        self.assertTrue(exact.exact_equal(matrix**4, sp.eye(7)))
        self.assertTrue(exact.exact_equal(matrix.H*matrix, sp.eye(7)))
        # l=3 character at theta=pi/2: sin((l+1/2)theta)/sin(theta/2) = -1.
        self.assertEqual(matrix.trace(), -1)
        self.assertEqual(len(result["polynomials"]), 7)

    def test_arbitrary_polynomial_basis_and_nonorthogonal_metric(self):
        result = exact.run({"action": "orbitals", "rotation": C4,
                            "polynomials": ["x+y", "x", "z"], "orthonormalize": False})
        matrix, gram = parse_matrix(result["matrix"]), parse_matrix(result["gram"])
        self.assertTrue(exact.exact_equal(matrix.T*gram*matrix, gram))
        self.assertTrue(exact.exact_equal(matrix**4, sp.eye(3)))
        with self.assertRaisesRegex(ValueError, "not closed"):
            exact.run({"action": "orbitals", "rotation": C4, "polynomials": ["x"]})
        with self.assertRaisesRegex(ValueError, "dependent"):
            exact.run({"action": "orbitals", "rotation": C4, "polynomials": ["s", "x*x+y*y+z*z"]})

    def test_exact_spin_double_cover(self):
        lift = exact.spin_lift(sp.Matrix(C4))
        self.assertTrue(exact.exact_equal(lift**4, -sp.eye(2)))
        self.assertTrue(exact.exact_equal(exact.spin_lift(sp.Matrix(P)), sp.eye(2)))


class SymbolicModelTests(unittest.TestCase):
    def test_chain_formula_and_numerical_bridge(self):
        result = exact.run(example("chain"))
        self.assertEqual(result["parameter_count"], 2)
        parser = exact.ExactParser()
        formula = parser.parse(result["hamiltonian"]["matrix"][0][0])
        self.assertEqual(sp.simplify(formula-parser.parse("epsilon+2*t*cos(2*pi*q)")), 0)
        numerical = result["numerical_model"]
        numerical["kpoints"] = [[0, 0, 0], [.25, 0, 0], [.5, 0, 0]]
        bands = numeric.run(numerical)["bands"]["energies"]
        np.testing.assert_allclose(np.array(bands).ravel(), [-2, 0, 2], atol=1e-12)
        comparison = copy.deepcopy(example("chain"))
        comparison["parameters"] = [0, -1]
        comparison.pop("numeric_substitutions")
        comparison["action"] = "model"
        reference = numeric.run(comparison)
        self.assertEqual(reference["model"]["parameter_count"], result["parameter_count"])

    def test_spinful_tr_and_inversion(self):
        request = {"action": "model", "periodic": [True, False, False], "shell_count": 2,
                   "sites": [{"position": [0, 0, 0], "orbitals": ["sup", "sdn"]}],
                   "operations": [{"rotation": r, "antiunitary": a} for r in [E, P] for a in [False, True]],
                   "k": ["q", 0, 0]}
        result = exact.run(request)
        self.assertEqual(result["parameter_count"], 2)
        matrix = parse_matrix(result["hamiltonian"]["matrix"])
        self.assertEqual(matrix[0, 1], 0)
        self.assertEqual(matrix[0, 0], matrix[1, 1])
        self.assertTrue(any("-1" in row for row in result["projective_factors"]))

    def test_exact_graphene_dirac_point(self):
        result = exact.run(example("graphene"))
        self.assertEqual(result["parameter_count"], 2)
        self.assertEqual(result["diagnostics"]["operation_count"], 48)
        parser = exact.ExactParser()
        matrix = parser.matrix(result["hamiltonian"]["matrix"])
        kx, ky, epsilon, t = [parser.symbol(n) for n in ["kx", "ky", "epsilon", "t"]]
        dirac = matrix.subs({kx: sp.Rational(1, 3), ky: sp.Rational(1, 3)})
        self.assertTrue(exact.exact_equal(dirac, epsilon*sp.eye(2)))
        gamma = matrix.subs({kx: 0, ky: 0})
        self.assertEqual(sp.factor((gamma-epsilon*sp.eye(2)).det()), -9*t*t)

    def test_f_orbital_model_exact_constraint_count(self):
        rotation = sp.Matrix(C4)
        operations = [{"rotation": (rotation**i).tolist(), "antiunitary": anti}
                      for i in range(4) for anti in [False, True]]
        request = {"action": "model", "shell_count": 1, "operations": operations,
                   "sites": [{"position": [0, 0, 0], "orbitals": example("f-orbitals")["polynomials"]}]}
        result = exact.run(request)
        # Real C4 sectors: one +1 orbital (1 symmetric parameter), two -1
        # orbitals (3), and two equivalent rotation doublets (4): total 8.
        self.assertEqual(result["parameter_count"], 8)
        self.assertTrue(result["diagnostics"]["covariance_verified"])

    def test_antiunitary_half_translation(self):
        request = {"action": "model", "periodic": [True, False, False], "shell_count": 3,
                   "sites": [{"position": [0, 0, 0], "orbitals": ["s"]}],
                   "operations": [{"rotation": E}, {"rotation": E, "translation": ["1/2", 0, 0], "antiunitary": True}]}
        result = exact.run(request)
        self.assertEqual(len(result["sites"]), 2)
        self.assertTrue(result["diagnostics"]["covariance_verified"])
        # The antiunitary half translation squares to one primitive translation;
        # the Bloch spectrum must be doubly degenerate at k=1/2.
        parser = exact.ExactParser()
        matrix = parser.matrix(result["hamiltonian"]["matrix"]).subs(parser.symbol("kx"), sp.Rational(1, 2))
        self.assertTrue(exact.exact_equal(matrix, sp.eye(2)*matrix.trace()/2))

    def test_symbolic_geometry_requires_explicit_bonds(self):
        request = {"action": "model", "lattice": [["a", 0, 0], [0, 1, 0], [0, 0, 1]],
                   "assumptions": {"a": "positive"}, "periodic": [True, False, False]}
        with self.assertRaisesRegex(ValueError, "explicit bonds"):
            exact.run(request)
        request["bonds"] = [{"cell": [i, 0, 0]} for i in [-1, 0, 1]]
        result = exact.run(request)
        self.assertEqual(result["parameter_count"], 3)  # no time reversal: complex nearest hopping
        self.assertIn("a**2", [entry["distance_squared"] for entry in result["basis"]])
        self.assertTrue(any(c.get("condition") == "a != 0" for c in result["conditions"] if isinstance(c, dict)))

    def test_nonperiodic_axes_do_not_wrap(self):
        request = {"action": "model", "periodic": [True, True, False], "shell_count": 1,
                   "operations": [{"rotation": E}, {"rotation": E, "translation": [0, 0, "1/2"]}]}
        with self.assertRaisesRegex(ValueError, "not closed"):
            exact.run(request)
        # A finite bilayer reflection about z=1/2 is valid and keeps z=1 distinct
        # from z=0, rather than reducing both positions modulo one.
        request["operations"][1] = {"rotation": [[1, 0, 0], [0, 1, 0], [0, 0, -1]], "translation": [0, 0, 1]}
        result = exact.run(request)
        self.assertEqual([s["position"][2] for s in result["sites"]], ["0", "1"])

    def test_numerical_bridge_rejects_nonreal_or_singular_substitutions(self):
        request = {"action": "bloch", "hoppings": [{"cell": [0, 0, 0], "matrix": [["p"]]}],
                   "numeric_substitutions": {"p": "I"}}
        with self.assertRaisesRegex(ValueError, "must be real"):
            exact.run(request)
        request["hoppings"][0]["matrix"] = [["p/p"]]
        request["numeric_substitutions"] = {"p": 0}
        with self.assertRaisesRegex(ValueError, "original input domain"):
            exact.run(request)

    def test_reject_nonclosed_bonds_and_inconsistent_representations(self):
        with self.assertRaisesRegex(ValueError, "not closed"):
            exact.run({"action": "model", "bonds": [{"cell": [1, 0, 0]}]})
        request = {"action": "model", "shell_count": 1, "sites": [{"position": [0, 0, 0], "orbitals": ["a", "b"]}],
                   "operations": [{"rotation": E, "orbital_matrix": [[1, 0], [0, 1]]},
                                  {"rotation": P, "orbital_matrix": [[1, 0], [0, "I"]]}]}
        with self.assertRaisesRegex(ValueError, "group law"):
            exact.run(request)

    def test_ssh_characteristic_polynomial(self):
        result = exact.run(example("ssh"))
        parser = exact.ExactParser()
        matrix = parser.matrix(result["hamiltonian"]["matrix"])
        expected = parser.parse("v**2+w**2+2*v*w*cos(2*pi*q)")
        self.assertEqual(sp.simplify(matrix.det()+expected), 0)
        for value in result["eigenvalues"]:
            self.assertEqual(sp.simplify(parser.parse(value["value"])**2-expected), 0)
        request = example("ssh"); request["k"] = ["1/2", 0, 0]
        matrix = parse_matrix(exact.run(request)["hamiltonian"]["matrix"])
        self.assertEqual(matrix[0, 1], parser.parse("v-w"))
        bridge = result["numerical_model"]
        bridge["kpoints"] = [[0, 0, 0], [.25, 0, 0], [.5, 0, 0]]
        energies = np.array(numeric.run(bridge)["bands"]["energies"])
        reference = np.array([[-1.5, 1.5], [-np.sqrt(1.25), np.sqrt(1.25)], [-.5, .5]])
        np.testing.assert_allclose(energies, reference, atol=1e-12)


class KpTests(unittest.TestCase):
    def test_generated_coefficients_cannot_be_complex(self):
        request = {"action": "kp", "dimension": 1, "degree": 0, "assumptions": {"c1": "complex"},
                   "operations": [{"rotation": [[1]], "representation": [[1]]}]}
        with self.assertRaisesRegex(ValueError, "must have real"):
            exact.run(request)

    def test_spinful_c4_and_time_reversal(self):
        result = exact.run(example("kp"))
        self.assertEqual(result["parameter_count"], 4)
        parser = exact.ExactParser()
        matrix = parser.matrix(result["hamiltonian"]["matrix"])
        kx, ky = parser.symbol("kx"), parser.symbol("ky")
        T = sp.Matrix([[0, 1], [-1, 0]])
        self.assertTrue(exact.exact_equal(matrix.subs({kx: -kx, ky: -ky}, simultaneous=True), T*matrix.conjugate()*T.H))
        # At k=0 Kramers degeneracy is exact for arbitrary real coefficients.
        origin = matrix.subs({kx: 0, ky: 0})
        self.assertTrue(exact.exact_equal(origin, sp.eye(2)*origin.trace()/2))

    def test_spinless_time_reversal_forbids_odd_scalar_terms(self):
        result = exact.run({"action": "kp", "dimension": 2, "degree": 2,
                            "operations": [{"rotation": [[1, 0], [0, 1]], "representation": [[1]], "antiunitary": True}]})
        self.assertEqual(result["parameter_count"], 4)
        parser = exact.ExactParser()
        value = parser.parse(result["hamiltonian"]["matrix"][0][0])
        kx, ky = parser.symbol("kx"), parser.symbol("ky")
        self.assertEqual(sp.expand(value-value.subs({kx: -kx, ky: -ky}, simultaneous=True)), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
