"""Analytic group-theoretic identities and independent embedding checks."""
import copy
import json
from pathlib import Path
import sys
import unittest

import numpy as np
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dist/python"))
import symbolic_interfaces as interface
from symbolic_core import ExactParser, exact_equal


def cyclic(n):
    return [[(a+b) % n for b in range(n)] for a in range(n)]


def matrix(raw):
    return ExactParser().matrix(raw)


def s3():
    # r^a s^b, s r s = r^-1, indices 2a+b.
    elements = [(a, b) for a in range(3) for b in range(2)]
    table = [[elements.index(((a+(-1)**b*c) % 3, (b+d) % 2)) for c, d in elements] for a, b in elements]
    r = sp.Matrix([[-sp.Rational(1, 2), -sp.sqrt(3)/2], [sp.sqrt(3)/2, -sp.Rational(1, 2)]])
    s = sp.diag(1, -1)
    reps = [r**a*s**b for a, b in elements]
    return table, reps, elements


def raw(matrices):
    return [interface.mat_json(m) for m in matrices]


class CyclotomicInterfaces(unittest.TestCase):
    def test_radicals_common_conductor_independent_embedding(self):
        inputs = [[['sqrt(2)', 'sqrt(3)', 'I', 'exp(2*pi*I/5)']]]
        result = interface.run({"action": "compile_cyclotomic", "matrices": inputs})
        self.assertEqual((result['order'], result['degree']), (120, 32))
        parser = ExactParser({"z": "complex"})
        z = parser.symbol('z')
        compiled = parser.matrix(result['matrices'][0])
        values = [complex(sp.N(v.subs(z, sp.exp(2*sp.pi*sp.I/120)), 30)) for v in compiled]
        expected = [np.sqrt(2), np.sqrt(3), 1j, np.exp(2j*np.pi/5)]
        np.testing.assert_allclose(values, expected, atol=1e-13)
        self.assertEqual(len(result['coefficient_tensors'][0][0][0]), 32)

    def test_mixed_explicit_root_lifts_to_common_conductor(self):
        result = interface.run({"action": "compile_cyclotomic", "order": 3, "matrices": [[['z', 'I']]]})
        self.assertEqual(result['order'], 12)
        p = ExactParser({'z': 'complex'})
        z = p.symbol('z')
        self.assertEqual(sp.rem(p.parse(result['matrices'][0][0][0])-z**4, sp.cyclotomic_poly(12, z), z), 0)

    def test_trigonometric_roots_and_inverse_radicals(self):
        result = interface.run({"action": "compile_cyclotomic", "matrices": [[['cos(2*pi/7)', 'sin(2*pi/7)', '1/sqrt(2)']]]})
        p = ExactParser({'z': 'complex'})
        z = p.symbol('z')
        actual = [complex(sp.N(p.parse(v).subs(z, sp.exp(2*sp.pi*sp.I/result['order'])), 30)) for v in result['matrices'][0][0]]
        np.testing.assert_allclose(actual, [np.cos(2*np.pi/7), np.sin(2*np.pi/7), 1/np.sqrt(2)], atol=1e-13)

    def test_common_cyclotomic_kernel(self):
        result = interface.run({"action": "common_kernel", "order": 3,
            "matrices": [[[1, 'z', 0]], [[0, 1, 'z']]]})
        self.assertEqual((result['rank'], result['nullity']), (2, 1))
        p = ExactParser({'z': 'complex'})
        z = p.symbol('z')
        expected = sp.Matrix([z**2, -z, 1])
        actual = p.matrix(result['kernel'])
        self.assertTrue(all(sp.rem(v, sp.cyclotomic_poly(3, z), z) == 0 for v in actual-expected))

    def test_common_exact_kernel_and_rank_stratum(self):
        result = interface.run({"action": "common_kernel", "matrices": [[[1, 1, 0]], [[0, 'a', 'a']]]})
        self.assertEqual(result['nullity'], 1)
        self.assertTrue(result['conditions'])
        specialized = interface.run({"action": "common_kernel", "matrices": [[[1, 1, 0]], [[0, 0, 0]]]})
        self.assertEqual(specialized['nullity'], 2)

    def test_cancelled_cyclotomic_pole_rejected(self):
        with self.assertRaisesRegex(ValueError, 'original cyclotomic domain'):
            interface.run({"action": "compile_cyclotomic", "order": 3, "matrices": [[['(1+z+z**2)/(1+z+z**2)']]]})
        with self.assertRaises(ValueError):
            interface.run({"action": "compile_cyclotomic", "matrices": [[['x']]]})


class RepresentationInterfaces(unittest.TestCase):
    def test_s3_irrep_laws_and_metric(self):
        table, reps, _ = s3()
        result = interface.run({"action": "representation", "table": table, "matrices": raw(reps)})
        self.assertEqual(result['restriction_character_norm'], '1')
        self.assertTrue(result['irreducible_unitary_restriction'])
        self.assertTrue(result['unitary_matrices'])
        self.assertEqual(matrix(result['invariant_metric']), sp.eye(2))

    def test_nonunitary_basis_gets_invariant_metric(self):
        result = interface.run({"action": "representation", "table": cyclic(2),
                                "matrices": [[[1, 0], [0, 1]], [[1, -2], [0, -1]]]})
        self.assertFalse(result['unitary_matrices'])
        self.assertEqual(matrix(result['invariant_metric']), sp.Matrix([[1, -1], [-1, 3]]))

    def test_bad_group_parity_and_group_laws_rejected(self):
        invalid = [
            {"table": [[0, 0], [1, 1]], "matrices": [[[1]], [[1]]]},
            {"table": cyclic(3), "antiunitary": [False, True, False], "matrices": [[[1]], [[1]], [[1]]]},
            {"table": cyclic(2), "matrices": [[[1]], [[2]]]},
            {"table": cyclic(2), "factor_system": [[1, 1], [1, 2]], "matrices": [[[1]], [[1]]]},
        ]
        for data in invalid:
            with self.subTest(data=data), self.assertRaises(ValueError):
                interface.run({"action": "representation", **data})

    def test_projective_spin_half_law(self):
        result = interface.run({"action": "representation", "table": cyclic(2),
            "factor_system": [[1, 1], [1, -1]], "matrices": [[[1, 0], [0, 1]], [['I', 0], [0, '-I']]]})
        self.assertTrue(result['verified'])

    def test_complex_intertwiner_exact_equivalence(self):
        result = interface.run({"action": "intertwiner", "table": cyclic(2),
            "left": [[[1, 0], [0, 1]], [[1, -2], [0, -1]]],
            "right": [[[1, 0], [0, 1]], [[1, 0], [0, -1]]]})
        self.assertEqual(result['scalar_field'], 'complex')
        self.assertEqual(result['dimension'], 2)
        self.assertEqual(result['equivalence'], 'proved')
        witness = matrix(result['witness'])
        self.assertEqual(sp.Matrix([[1, -2], [0, -1]])*witness, witness*sp.diag(1, -1))

    def test_antiunitary_intertwiner_is_real_linear(self):
        # K intertwiners are exactly real scalars, not arbitrary complex scalars.
        result = interface.run({"action": "intertwiner", "table": cyclic(2),
            "antiunitary": [False, True], "left": [[[1]], [[1]]], "right": [[[1]], [[1]]]})
        self.assertEqual((result['scalar_field'], result['dimension']), ('real', 1))
        self.assertEqual(result['basis'], [[['1']]])
        phase = interface.run({"action": "intertwiner", "antiunitary": [True], "left": [[['I']]], "right": [[[1]]]})
        self.assertEqual(phase['dimension'], 1)
        value = matrix(phase['basis'][0])[0]
        self.assertEqual(sp.simplify(sp.I*sp.conjugate(value)-value), 0)

    def test_inequivalent_reps_zero_intertwiner(self):
        result = interface.run({"action": "intertwiner", "left": [[[1]]], "right": [[[-1]]]})
        self.assertEqual(result['equivalence'], 'inequivalent')

    def test_s3_tensor_decomposition_and_projector(self):
        table, reps, elements = s3()
        trivial = [[[1]] for _ in elements]
        sign = [[[(-1)**b]] for a, b in elements]
        request = {"action": "character_decompose", "table": table,
                   "tensor_factors": [raw(reps), raw(reps)], "irreps": [trivial, sign, raw(reps)]}
        result = interface.run(request)
        self.assertEqual(result['multiplicities'], [1, 1, 1])
        self.assertTrue(result['complete_decomposition'])
        self.assertTrue(result['complete_irrep_list'])
        tensor = [sp.kronecker_product(m, m) for m in reps]
        project = interface.run({"action": "projector", "table": table,
                                 "matrices": raw(tensor), "irrep": sign})
        # The antisymmetric tensor is the sign representation.
        expected = sp.zeros(4)
        expected[1, 1] = expected[2, 2] = sp.Rational(1, 2)
        expected[1, 2] = expected[2, 1] = -sp.Rational(1, 2)
        self.assertEqual(matrix(project['matrix']), expected)
        self.assertEqual((project['multiplicity'], project['rank']), (1, 1))

    def test_matrix_unit_algebra_for_2d_irrep(self):
        table, reps, _ = s3()
        result = interface.run({"action": "projector", "table": table, "matrices": raw(reps), "irrep": raw(reps)})
        for a in range(2):
            for b in range(2):
                expected = sp.zeros(2)
                expected[a, b] = 1
                self.assertEqual(matrix(result['matrix_units'][a][b]), expected)

    def test_incomplete_irrep_list_disclosed(self):
        result = interface.run({"action": "character_decompose", "table": cyclic(2),
            "matrices": [[[1, 0], [0, 1]], [[1, 0], [0, -1]]], "irreps": [[[[1]], [[1]]]]})
        self.assertFalse(result['complete_decomposition'])
        self.assertFalse(result['complete_irrep_list'])
        self.assertEqual(result['covered_dimension'], 1)

    def test_induce_c3_character_to_s3(self):
        table, _, _ = s3()
        omega = '-1/2+I*sqrt(3)/2'
        result = interface.run({"action": "induce", "table": table, "subgroup": [0, 2, 4],
                               "matrices": [[[1]], [[omega]], [['-1/2-I*sqrt(3)/2']]]})
        self.assertEqual(result['dimension'], 2)
        chars = [matrix(m).trace() for m in result['matrices']]
        self.assertEqual(chars, [2, 0, -1, 0, -1, 0])

    def test_wigner_a_real_spinless(self):
        result = interface.run({"action": "wigner", "table": cyclic(2),
            "antiunitary": [False, True], "matrices": [[[1]]]})
        self.assertEqual((result['indicator'], result['wigner_type'], result['corep_dimension']), (1, 'a', 1))

    def test_wigner_b_kramers_projective(self):
        result = interface.run({"action": "wigner", "table": cyclic(2),
            "antiunitary": [False, True], "factor_system": [[1, 1], [1, -1]], "matrices": [[[1]]]})
        self.assertEqual((result['indicator'], result['wigner_type'], result['corep_dimension']), (-1, 'b', 2))
        t = matrix(result['matrices'][1])
        self.assertEqual(t*t.conjugate(), -sp.eye(2))

    def test_wigner_c_complex_pair(self):
        # C3 x {1,T}; T commutes abstractly, so a complex C3 irrep pairs with its conjugate.
        elements = [(a, b) for a in range(3) for b in range(2)]
        table = [[elements.index(((a+c) % 3, (b+d) % 2)) for c, d in elements] for a, b in elements]
        result = interface.run({"action": "wigner", "table": table, "antiunitary": [bool(b) for a, b in elements],
            "matrices": [[[1]], [['-1/2+I*sqrt(3)/2']], [['-1/2-I*sqrt(3)/2']]]})
        self.assertEqual((result['indicator'], result['wigner_type'], result['corep_dimension']), (0, 'c', 2))

    def test_wigner_a_nontrivial_anti_conjugation(self):
        # S3 with reflections antiunitary. A nonreal C3 irrep stays one-dimensional.
        table, _, elements = s3()
        result = interface.run({"action": "wigner", "table": table, "antiunitary": [bool(b) for a, b in elements],
            "matrices": [[[1]], [['-1/2+I*sqrt(3)/2']], [['-1/2-I*sqrt(3)/2']]]})
        self.assertEqual((result['indicator'], result['corep_dimension']), (1, 1))

    def test_wigner_projective_gauge_with_complex_cocycle(self):
        # C3 x T with nonreal rephasing alpha_g. This tests the antiunitary
        # conjugations in the cocycle and induced block factors independently.
        elements = [(a, b) for a in range(3) for b in range(2)]
        table = [[elements.index(((a+c) % 3, (b+d) % 2)) for c, d in elements] for a, b in elements]
        anti = [bool(b) for a, b in elements]
        phases = [1, sp.I, -1, (1+sp.I)/sp.sqrt(2), -sp.I, (1-sp.I)/sp.sqrt(2)]
        omega = (-1+sp.I*sp.sqrt(3))/2
        factor = [[interface.simp(phases[i]*(sp.conjugate(phases[j]) if anti[i] else phases[j])/phases[table[i][j]]) for j in range(6)] for i in range(6)]
        reps = [sp.Matrix([[phases[i]*omega**a]]) for i, (a, b) in enumerate(elements) if not b]
        result = interface.run({"action": "wigner", "table": table, "antiunitary": anti,
            "factor_system": interface.mat_json(sp.Matrix(factor)), "matrices": raw(reps)})
        self.assertEqual((result['indicator'], result['corep_dimension']), (0, 2))

    def test_wigner_a_two_dimensional_real_irrep(self):
        table_h, reps, _ = s3()
        table = [[2*table_h[i//2][j//2]+((i % 2+j % 2) % 2) for j in range(12)] for i in range(12)]
        result = interface.run({"action": "wigner", "table": table, "antiunitary": [bool(i % 2) for i in range(12)],
                                "matrices": raw(reps)})
        self.assertEqual((result['indicator'], result['corep_dimension']), (1, 2))

    def test_wigner_b_quaternion_irrep(self):
        e = sp.eye(2)
        a, b = sp.diag(sp.I, -sp.I), sp.Matrix([[0, 1], [-1, 0]])
        reps = [e, -e, a, -a, b, -b, a*b, -a*b]
        table_h = [[next(k for k, m in enumerate(reps) if x*y == m) for y in reps] for x in reps]
        table = [[2*table_h[i//2][j//2]+((i % 2+j % 2) % 2) for j in range(16)] for i in range(16)]
        result = interface.run({"action": "wigner", "table": table, "antiunitary": [bool(i % 2) for i in range(16)],
                                "matrices": raw(reps)})
        self.assertEqual((result['indicator'], result['corep_dimension']), (-1, 4))

    def test_reducible_wigner_input_rejected(self):
        with self.assertRaisesRegex(ValueError, 'irreducible'):
            interface.run({"action": "wigner", "table": cyclic(2), "antiunitary": [False, True],
                           "matrices": [[[1, 0], [0, 1]]]})

    def test_reynolds_antiunitary_projection(self):
        result = interface.run({"action": "symmetrize", "table": cyclic(2), "antiunitary": [False, True],
            "factor_system": [[1, 1], [1, -1]], "matrices": [[[1, 0], [0, 1]], [[0, 1], [-1, 0]]],
            "matrix": [['a+b', 'c-I*d'], ['c+I*d', 'a-b']]})
        p = ExactParser()
        self.assertEqual(p.matrix(result['matrix']), p.symbol('a')*sp.eye(2))


class SymbolicGeometryInterfaces(unittest.TestCase):
    def test_nonsymmorphic_screw_square_and_translation_phase(self):
        result = interface.run({"action": "seitz", "operation": "power", "exponent": 2,
            "operations": [{"rotation": [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], "translation": [0, 0, '1/2']}],
            "k": [0, 0, 'q']})
        self.assertEqual(result['translation'], ['0', '0', '1'])
        q = ExactParser().symbol('q')
        phase = ExactParser().parse(result['translation_phase']['expression'])
        self.assertEqual(sp.simplify(phase-sp.exp(-2*sp.pi*sp.I*q)), 0)

    def test_symbolic_affine_inverse_preserves_poles(self):
        result = interface.run({"action": "seitz", "operation": "inverse",
            "operations": [{"rotation": [['a']], "translation": ['t'], "antiunitary": True}]})
        self.assertEqual(result['rotation'], [['1/a']])
        self.assertEqual(result['translation'], ['-t/a'])
        self.assertTrue(result['antiunitary'])
        self.assertTrue(any(c.get('condition') == 'a != 0' for c in result['conditions']))

    def test_bloch_gauge_roundtrip_and_spectrum(self):
        data = {"action": "gauge", "matrix": [[0, 'v+w*exp(-2*pi*I*q)'], ['v+w*exp(2*pi*I*q)', 0]],
                "centers": [[0], ['1/2']], "k": ['q']}
        result = interface.run(data)
        reverse = interface.run({**data, "matrix": result['matrix'], "direction": "atomic_to_periodic"})
        self.assertTrue(exact_equal(matrix(reverse['matrix']), matrix(data['matrix'])))
        self.assertEqual(interface.simp(matrix(result['matrix']).det()-matrix(data['matrix']).det()), 0)

    def test_bloch_gauge_single_bond_embedded_displacement_sign(self):
        result = interface.run({"action": "gauge", "matrix": [[0, 't'], ['t', 0]],
                                "centers": [[0], ['1/3']], "k": ['q']})
        p = ExactParser()
        q, t = p.symbol('q'), p.symbol('t')
        # Positive Fourier sign and displacement R+tau_j-tau_i fix this sign.
        self.assertTrue(exact_equal(p.matrix(result['matrix'])[0, 1], t*sp.exp(2*sp.pi*sp.I*q/3)))

    def test_symbolic_screw_bloch_cocycle(self):
        result = interface.run({"action": "bloch_cocycle", "k": [0, 0, 'q'], "operations": [
            {"rotation": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]},
            {"rotation": [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], "translation": [0, 0, '1/2']}]})
        self.assertEqual(result['table'], cyclic(2))
        self.assertEqual(result['lattice_shifts'][1][1], [0, 0, 1])
        p = ExactParser()
        q = p.symbol('q')
        self.assertTrue(exact_equal(p.parse(result['factor_system'][1][1]), sp.exp(-2*sp.pi*sp.I*q)))

    def test_anti_translation_bloch_cocycle_at_boundary(self):
        result = interface.run({"action": "bloch_cocycle", "k": ['1/2'], "operations": [
            {"rotation": [[1]]}, {"rotation": [[1]], "translation": ['1/2'], "antiunitary": True}]})
        self.assertEqual(result['factor_system'], [['1', '1'], ['1', '-1']])
        with self.assertRaisesRegex(ValueError, 'does not fix'):
            interface.run({"action": "bloch_cocycle", "k": ['q'], "operations": [
                {"rotation": [[1]]}, {"rotation": [[1]], "translation": ['1/2'], "antiunitary": True}]})

    def test_full_star_translation_matrix_and_anti_trace(self):
        result = interface.run({"action": "representation_element", "matrix": [[0, 1], [1, 0]],
                                "translation": [1], "row_momenta": [['q'], ['-q']]})
        p = ExactParser()
        q = p.symbol('q')
        self.assertTrue(exact_equal(p.matrix(result['matrix'])[0, 1], sp.exp(-2*sp.pi*sp.I*q)))
        self.assertTrue(exact_equal(p.matrix(result['matrix'])[1, 0], sp.exp(2*sp.pi*sp.I*q)))
        self.assertEqual(result['character'], '0')
        anti = interface.run({"action": "representation_element", "matrix": [[1]], "translation": [0], "k": [0], "antiunitary": True})
        self.assertNotIn('character', anti)

    def test_exact_parser_security_in_all_new_actions(self):
        with self.assertRaises(ValueError):
            interface.run({"action": "common_kernel", "matrices": [[["__import__('os').getcwd()"]]]})
        with self.assertRaises(ValueError):
            interface.run({"action": "not_a_function"})

    def test_all_shipped_examples_execute(self):
        examples = sorted((ROOT/'dist/examples').glob('interfaces-*.json'))
        self.assertEqual(len(examples), 11)
        for path in examples:
            with self.subTest(path=path.name):
                result = interface.run(json.loads(path.read_text(encoding='utf-8')))
                self.assertTrue(result['verified'])

    def test_api_inventory_discloses_uncovered_symbols(self):
        coverage = json.loads((ROOT/'dist/data/symbolic-api-coverage.json').read_text(encoding='utf-8'))
        self.assertFalse(coverage['all_upstream_apis_covered'])
        self.assertEqual(len(coverage['inventory']), 308)
        self.assertEqual(set(coverage['actions']), set(interface.ACTIONS))
        self.assertTrue(coverage['remaining_symbolic_gaps'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
