"""Independent mathematical checks of the shipped 32-point-group atlas."""
from collections import Counter
import json
from pathlib import Path
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ATLAS = json.loads((ROOT / 'dist/data/pointgroup-atlas.json').read_text(encoding='utf-8'))


def complex_values(values):
    return np.array([complex(v['re'], v['im']) for v in values])


def data(group):
    matrices = np.array([o['matrix'] for o in group['operations']])
    chars = np.array([complex_values(r['characters']) for r in group['irreps']])
    full = np.zeros((len(chars), group['order']), dtype=complex)
    for c, info in enumerate(group['classes']):
        full[:, info['operationIndices']] = chars[:, c, None]
    return matrices, chars, full


class PointGroupAtlas(unittest.TestCase):
    def test_catalogue_and_physical_counts(self):
        groups = ATLAS['groups']
        self.assertEqual([g['id'] for g in groups], list(range(1, 33)))
        self.assertEqual(len({g['hm'] for g in groups}), 32)
        self.assertEqual(Counter(g['system'] for g in groups),
                         {'三斜': 2, '单斜': 3, '正交': 3, '四方': 7, '三方': 5, '六方': 7, '立方': 5})
        self.assertEqual(sum(g['centrosymmetric'] for g in groups), 11)
        self.assertEqual(sum(g['chiral'] for g in groups), 11)
        self.assertEqual(sum(g['polar'] for g in groups), 10)
        self.assertEqual({g['hm'] for g in groups if g['polar']},
                         {'1', '2', 'm', 'mm2', '4', '4mm', '3', '3m', '6', '6mm'})

    def test_orthogonal_actions_closure_and_generators(self):
        for group in ATLAS['groups']:
            with self.subTest(group=group['hm']):
                matrices, _, _ = data(group)
                self.assertEqual(len(matrices), group['order'])
                for i, a in enumerate(matrices):
                    np.testing.assert_allclose(a.T @ a, np.eye(3), atol=1e-10)
                    self.assertAlmostEqual(np.linalg.det(a), group['operations'][i]['det'])
                    np.testing.assert_allclose(np.linalg.matrix_power(a, group['operations'][i]['order']), np.eye(3), atol=1e-10)
                multiplication = []
                for a in matrices:
                    row = []
                    for b in matrices:
                        distances = np.max(abs(matrices - a @ b), axis=(1, 2))
                        self.assertEqual(sum(distances < 1e-9), 1)
                        row.append(int(np.argmin(distances)))
                    multiplication.append(row)
                identity = int(np.argmin(np.max(abs(matrices - np.eye(3)), axis=(1, 2))))
                generated = {identity}
                while True:
                    enlarged = generated | {multiplication[g][h] for g in generated for h in group['generators']}
                    if enlarged == generated:
                        break
                    generated = enlarged
                self.assertEqual(len(generated), group['order'])
                self.assertEqual(group['chiral'], bool(np.all(np.linalg.det(matrices) > 0)))
                self.assertEqual(group['centrosymmetric'], bool(np.any(np.max(abs(matrices + np.eye(3)), axis=(1, 2)) < 1e-9)))
                projector = np.mean(matrices, axis=0)
                self.assertEqual(group['polarDimension'], np.linalg.matrix_rank(projector, tol=1e-9))

    def test_conjugacy_character_orthogonality_and_fs(self):
        for group in ATLAS['groups']:
            with self.subTest(group=group['hm']):
                matrices, chars, full = data(group)
                sizes = np.array([c['size'] for c in group['classes']])
                self.assertEqual(len(chars), len(sizes))
                self.assertEqual(sorted(i for c in group['classes'] for i in c['operationIndices']), list(range(group['order'])))
                self.assertEqual(sum(r['dimension']**2 for r in group['irreps']), group['order'])
                np.testing.assert_allclose((chars.conjugate()*sizes) @ chars.T / group['order'], np.eye(len(chars)), atol=1e-10)
                np.testing.assert_allclose(chars.conjugate().T @ chars, np.diag(group['order']/sizes), atol=1e-9)
                for ci, item in enumerate(group['classes']):
                    a = matrices[item['operationIndices'][0]]
                    conjugates = {int(np.argmin(np.max(abs(matrices - b @ a @ b.T), axis=(1, 2)))) for b in matrices}
                    self.assertEqual(conjugates, set(item['operationIndices']))
                    self.assertEqual(item['size'], len(conjugates))
                squares = [int(np.argmin(np.max(abs(matrices - a @ a), axis=(1, 2)))) for a in matrices]
                for i, irrep in enumerate(group['irreps']):
                    self.assertAlmostEqual(float(np.mean(full[i, squares]).real), irrep['frobeniusSchur'])
                    j = next(j for j, r in enumerate(group['irreps']) if r['label'] == irrep['conjugateLabel'])
                    np.testing.assert_allclose(chars[j], chars[i].conjugate(), atol=1e-10)
                    self.assertEqual(bool(irrep['physicalPair']), j != i)

    def test_tensor_decompositions_and_inversion_exclusion(self):
        for group in ATLAS['groups']:
            with self.subTest(group=group['hm']):
                matrices, _, full = data(group)
                tr = np.trace(matrices, axis1=1, axis2=2)
                targets = {'vector': tr, 'axial': np.linalg.det(matrices)*tr,
                           'quadratic': (tr*tr + np.trace(matrices @ matrices, axis1=1, axis2=2))/2}
                for name, expected in targets.items():
                    multiplicities = np.array([r[name+'Multiplicity'] for r in group['irreps']])
                    self.assertTrue(np.all(multiplicities >= 0))
                    np.testing.assert_allclose(multiplicities @ full, expected, atol=1e-9)
                    self.assertEqual(sum(r['dimension']*r[name+'Multiplicity'] for r in group['irreps']), 6 if name == 'quadratic' else 3)
                for irrep in group['irreps']:
                    self.assertEqual(irrep['irActive'], irrep['vectorMultiplicity'] > 0)
                    self.assertEqual(irrep['ramanActive'], irrep['quadraticMultiplicity'] > 0)
                    if group['centrosymmetric']:
                        self.assertFalse(irrep['irActive'] and irrep['ramanActive'])

    def test_basis_functions_span_the_claimed_subspaces(self):
        # Construct Sym² R independently by evaluating monomials at 6 points.
        points = np.array([[1,0,0], [0,1,0], [0,0,1], [1,1,0], [1,0,1], [0,1,1]], dtype=float)
        def monomials(p):
            x, y, z = p.T
            return np.array([x*x,y*y,z*z,x*y,x*z,y*z]).T
        evaluation = monomials(points)
        for group in ATLAS['groups']:
            matrices, _, full = data(group)
            # Rows of points @ R are (R^-1 x)^T; columns of the solution
            # are coefficients of the transformed basis functions.
            quadratic = np.array([np.linalg.solve(evaluation, monomials(points @ a)) for a in matrices])
            representations = {'vector': matrices, 'axial': np.linalg.det(matrices)[:,None,None]*matrices,
                               'quadratic': quadratic}
            for index, irrep in enumerate(group['irreps']):
                for name, representation in representations.items():
                    with self.subTest(group=group['hm'], irrep=irrep['label'], kind=name):
                        coefficients = irrep['basisCoefficients'][name]
                        expected_dimension = irrep['dimension']*irrep[name+'Multiplicity']
                        self.assertEqual(len(coefficients), expected_dimension)
                        self.assertEqual(len(irrep['basis'][name]), expected_dimension)
                        if not coefficients:
                            continue
                        basis = np.array([complex_values(v) for v in coefficients]).T
                        self.assertEqual(np.linalg.matrix_rank(basis), expected_dimension)
                        inverse = np.linalg.pinv(basis)
                        restricted = np.array([inverse @ a @ basis for a in representation])
                        np.testing.assert_allclose(np.array([a @ basis - basis @ r for a,r in zip(representation,restricted)]), 0, atol=1e-9)
                        np.testing.assert_allclose(np.trace(restricted, axis1=1, axis2=2), irrep[name+'Multiplicity']*full[index], atol=1e-9)

    def test_familiar_examples(self):
        c3 = next(g for g in ATLAS['groups'] if g['hm'] == '3')
        self.assertEqual([r['dimension'] for r in c3['irreps']], [1,1,1])
        self.assertEqual(sum(bool(r['physicalPair']) for r in c3['irreps']), 2)
        oh = next(g for g in ATLAS['groups'] if g['hm'] == 'm-3m')
        self.assertEqual(oh['order'], 48)
        self.assertEqual(len(oh['irreps']), 10)
        self.assertEqual([r['dimension'] for r in oh['irreps'] if r['irActive']], [3])
        self.assertEqual(sorted(r['dimension'] for r in oh['irreps'] if r['ramanActive']), [1,2,3])
        cs = next(g for g in ATLAS['groups'] if g['hm'] == 'm')
        even = next(r for r in cs['irreps'] if r['characters'][1]['re'] == 1)
        odd = next(r for r in cs['irreps'] if r['characters'][1]['re'] == -1)
        self.assertEqual(set(even['basis']['vector']), {'x','y'})
        self.assertEqual(odd['basis']['vector'], ['z'])
        c2v = next(g for g in ATLAS['groups'] if g['hm'] == 'mm2')
        self.assertEqual({r['mulliken']: r['basis']['vector'] for r in c2v['irreps']},
                         {'A1': ['z'], 'A2': [], 'B1': ['x'], 'B2': ['y']})
        # Explicit phase/sign regression: f(R^-1 r), not f(R r).
        gamma2 = next(r for r in c3['irreps'] if r['bcLabel'] == 'Γ2')
        self.assertEqual(gamma2['basis']['vector'], ['x - i*y'])
        self.assertGreater(gamma2['characters'][1]['im'], 0)


if __name__ == '__main__':
    unittest.main()
