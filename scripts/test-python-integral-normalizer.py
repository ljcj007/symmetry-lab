"""Independent arithmetic/finite-field checks of integral normalizers."""
import json
from itertools import product
from pathlib import Path
import sys
import unittest

import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import crystkit_browser as c
import crystkit_extensions as e
import integral_normalizer as n


def group(*generators):
    return e._point_input({"rotations": [c._from_sympy(sp.Matrix(g)) for g in generators]})


def regular(order):
    a = sp.zeros(order)
    for j in range(order):
        a[(j+1) % order, j] = 1
    return a


def mod_closure(generators, p):
    d = len(generators[0])
    generators = [tuple(int(x) % p for row in g for x in row) for g in generators]
    eye = tuple(int(i == j) for i in range(d) for j in range(d))
    def multiply(a, b):
        return tuple(sum(a[i*d+k]*b[k*d+j] for k in range(d)) % p for i in range(d) for j in range(d))
    seen, queue = {eye}, [eye]
    for a in queue:
        for b in generators:
            value = multiply(a, b)
            if value not in seen:
                seen.add(value)
                queue.append(value)
    return seen


class NormalizerTests(unittest.TestCase):
    def test_all_small_cyclotomic_fields_and_exact_infinite_witnesses(self):
        for conductor in (3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 18):
            result = n.normalizer(group(n._companion(conductor)))
            self.assertTrue(result["complete"])
            self.assertTrue(result["everyGeneratorVerified"])
            self.assertEqual(result["algorithm"], "cyclotomic-module-lattice-schreier")
            if conductor in (3, 4, 6):
                self.assertTrue(result["finite"])
                self.assertEqual(len(c.finite_matrix_closure(result["generators"])), result["normalizerOrder"])
            else:
                self.assertFalse(result["finite"])
                # A finite-order rational matrix has only cyclotomic irreducible
                # characteristic factors. This is an independent infinite-order witness.
                self.assertTrue(any(any(not sp.Poly(f).is_cyclotomic for f, _ in
                                        sp.factor_list(c._sympy_matrix(g).charpoly().as_expr())[1])
                                    for g in result["generators"]))

    def test_unit_table_norms_and_real_unit_identities(self):
        for conductor in (5, 7, 8, 9, 12):
            a = n._companion(conductor)
            self.assertTrue(all(abs(u.det()) == 1 for u in n._units(a, conductor)))
        a = n._companion(12)
        u = sp.eye(4)-a
        self.assertEqual(u.det(), 1)
        # u*bar(u)=2-zeta-zeta^-1 = 2-sqrt(3), a real fundamental unit.
        real = u*(sp.eye(4)-a.inv())
        self.assertEqual(real**2-4*real+sp.eye(4), sp.zeros(4))

    def test_unimodular_conjugated_high_dimensional_cyclotomic_lattices(self):
        for conductor in (5, 7, 9):
            a = n._companion(conductor)
            b = sp.eye(a.rows)
            for i in range(a.rows-1):
                b[i, i+1] = i+2
            result = n.normalizer(group(b*a*b.inv()))
            self.assertTrue(result["complete"])
            self.assertFalse(result["finite"])

    def test_cyclic_regular_lattice_glue_is_retained(self):
        for order, expected in ((2, 4), (3, 12), (4, 16), (6, 24)):
            result = n.normalizer(group(regular(order)))
            self.assertTrue(result["complete"])
            self.assertEqual(result["normalizerOrder"], expected)
            self.assertEqual(len(c.finite_matrix_closure(result["generators"])), expected)
        result = n.normalizer(group(regular(5)))
        self.assertEqual(result["intrinsicLatticeIndex"], 5)
        self.assertEqual(result["latticeOrbitSize"], 4)
        self.assertFalse(result["finite"])

    def test_repeated_gaussian_and_eisenstein_multiplicity_blocks(self):
        for conductor in (3, 4, 6):
            a = n._companion(conductor)
            for multiplicity in (2, 3):
                result = n.normalizer(group(sp.diag(*(a for _ in range(multiplicity)))))
                self.assertTrue(result["complete"])
                self.assertFalse(result["finite"])
                self.assertEqual(result["cyclotomicComponents"][0]["multiplicity"], multiplicity)
                self.assertEqual(result["intrinsicLatticeIndex"], 1)

    def test_glued_repeated_sign_block_has_full_congruence_stabilizer(self):
        a = sp.diag(regular(2), sp.eye(1))
        result = n.normalizer(group(a))
        self.assertTrue(result["complete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["intrinsicLatticeIndex"], 2)
        self.assertEqual(result["latticeOrbitSize"], 3)
        image = mod_closure(result["generators"], 3)
        # Over F3 the eigenspaces have dimensions 1 and 2. Their stabilizer is
        # GL1(F3) x GL2(F3), of order 2*(9-1)*(9-3)=96.
        self.assertEqual(len(image), 96)
        # Independently enumerate all small integral unimodular commuting matrices.
        for v in product((-1, 0, 1), repeat=9):
            det = v[0]*(v[4]*v[8]-v[5]*v[7])-v[1]*(v[3]*v[8]-v[5]*v[6])+v[2]*(v[3]*v[7]-v[4]*v[6])
            if abs(det) != 1:
                continue
            if (v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]) != (v[4], v[3], v[5], v[1], v[0], v[2], v[7], v[6]):
                continue
            self.assertIn(tuple(x % 3 for x in v), image)

    def test_elementary_abelian_high_dimensional_glue(self):
        # Two independent involutions, repeated + characters, and a swap lattice.
        a = sp.diag(regular(2), sp.eye(4))
        b = sp.diag(sp.eye(2), -sp.eye(2), sp.eye(2))
        result = n.normalizer(group(a, b))
        self.assertTrue(result["complete"])
        self.assertFalse(result["finite"])
        self.assertEqual(result["intrinsicLatticeIndex"], 2)
        self.assertEqual(sorted(result["characterDimensions"]), [1, 2, 3])

    def test_noncyclic_dihedral_arithmetic_normalizers(self):
        for order in (3, 4, 5, 6, 7, 8, 9, 12):
            a = n._companion(order)
            v = sp.eye(a.rows)[:, 0]
            reflection = sp.Matrix.hstack(*(a**(-j)*v for j in range(a.rows)))
            result = n.normalizer(group(a, reflection))
            self.assertTrue(result["complete"])
            self.assertEqual(result["algorithm"], "characteristic-cyclic-subgroup-schreier")
            self.assertEqual(result["characteristicSubgroupOrder"], order)
            self.assertEqual(result["finite"], order in (3, 4, 6))

    def test_repeated_absolutely_irreducible_tensor_normalizer(self):
        a = n._companion(3)
        reflection = sp.Matrix([[1, -1], [0, -1]])
        for multiplicity in (2, 3):
            generators = [sp.diag(*(g for _ in range(multiplicity))) for g in (a, reflection)]
            d = 2*multiplicity
            b = sp.eye(d)
            b[0, d-1] = 7
            conjugated = group(*(b*g*b.inv() for g in generators))
            result = n.normalizer(conjugated, tensor_basis=c._from_sympy(b))
            self.assertTrue(result["complete"])
            self.assertFalse(result["finite"])
            self.assertEqual(result["algorithm"], "absolutely-irreducible-tensor-normalizer")
            self.assertEqual(result["irreducibleDimension"], 2)
            self.assertEqual(result["multiplicity"], multiplicity)

    def test_canonical_primitive_metric_handles_noncyclic_distinct_blocks(self):
        # A4 has no characteristic nontrivial cyclic subgroup. Its irreducible
        # signed-permutation 3D representation plus a fixed axis has full
        # normalizer O(3,Z) x {+-1}, independently of the chosen positive metric.
        a = sp.diag(regular(3), sp.eye(1))
        b = sp.diag(1, -1, -1, 1)
        result = n.normalizer(group(a, b))
        self.assertTrue(result["complete"])
        self.assertEqual(result["algorithm"], "canonical-primitive-block-metric")
        self.assertEqual(result["normalizerOrder"], 96)
        self.assertEqual(sorted(result["realIrreducibleDimensions"]), [1, 3])
        self.assertEqual(len(c.finite_matrix_closure(result["generators"])), 96)

    def test_six_dimensional_affine_orbits_use_infinite_normalizer(self):
        a = sp.diag(n._companion(3), sp.eye(4))
        result = n.run({"action": "extension_orbits", "rotations": c.jsonable([c._from_sympy(a)]), "include_operations": False})
        self.assertTrue(result["normalizerComplete"])
        self.assertFalse(result["normalizer"]["finite"])
        self.assertEqual(result["cohomologyInvariants"], [3]*4)
        self.assertEqual(result["orbitCount"], 2)
        self.assertEqual(sorted(len(o["extensionIndices"]) for o in result["orbits"]), [1, 80])

    def test_all_wallpaper_affine_counts(self):
        I, neg = sp.eye(2), -sp.eye(2)
        r3, r4, r6 = (n._companion(k) for k in (3, 4, 6))
        swap, mirror = sp.Matrix([[0, 1], [1, 0]]), sp.diag(1, -1)
        cases = [([I], 1), ([neg], 1), ([r3], 1), ([r4], 1), ([r6], 1),
                 ([mirror], 2), ([swap], 1), ([neg, mirror], 3), ([neg, swap], 1),
                 ([r3, swap], 1), ([r3, sp.Matrix([[-1, 0], [-1, 1]])], 1),
                 ([r4, mirror], 2), ([r6, swap], 1)]
        total = 0
        for generators, expected in cases:
            result = n.run({"action": "extension_orbits", "rotations": c.jsonable([c._from_sympy(g) for g in generators]), "include_operations": False})
            self.assertTrue(result["normalizerComplete"])
            self.assertEqual(result["orbitCount"], expected)
            total += result["orbitCount"]
        self.assertEqual(total, 17)

    def test_limits_do_not_claim_completion(self):
        with self.assertRaises(c.SearchLimitError):
            n.run({"rotations": c.jsonable([c._from_sympy(sp.diag(regular(2), sp.eye(1)))]), "max_orbit": 1})
        with self.assertRaises(c.SearchLimitError):
            a = n._companion(5)
            b = sp.eye(4)
            for i in range(3):
                b[i, i+1] = i+2
            n.run({"rotations": c.jsonable([c._from_sympy(b*a*b.inv())]), "max_module_trials": 1})
        with self.assertRaises(ValueError):
            n.run({"rotations": [[[1]]], "max_orbit": True})
        with self.assertRaises(ValueError):
            n.run({"rotations": [[[2]]], "action": "normalizer"})
        with self.assertRaises(ValueError):
            n.run({"rotations": [[[1]]], "action": "__import__"})
        a = n._companion(3)
        reflection = sp.Matrix([[1, -1], [0, -1]])
        basis = sp.eye(4)
        basis[0, 3] = 1
        hidden_tensor = group(*(basis*sp.diag(g, g)*basis.inv() for g in (a, reflection)))
        limited = n.normalizer(hidden_tensor, max_point_orbit=1)
        self.assertFalse(limited["complete"])
        self.assertIn("not covered", limited["remainingObstacle"])
        # Supplying a checked tensor certificate resolves the same group.
        certified = n.normalizer(hidden_tensor, max_point_orbit=1, tensor_basis=c._from_sympy(basis))
        self.assertTrue(certified["complete"])

    def test_examples_are_executable(self):
        for path in sorted((ROOT / "dist/examples").glob("normalizer-*.json")):
            result = n.run(json.loads(path.read_text(encoding="utf-8")))
            self.assertTrue(result.get("normalizerComplete", result.get("complete")), path.name)


if __name__ == "__main__":
    unittest.main()
