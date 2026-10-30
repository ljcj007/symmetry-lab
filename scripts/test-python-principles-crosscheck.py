"""Independent mathematical crosschecks across the three symmetry laboratories.

The references here are independently enumerated signed-permutation groups,
polynomial evaluation, Reynolds averaging, and Pauli/SU(2) constructions; they
do not call the cores' projection or monomial-transformation helpers.
"""
import itertools
import math
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
import order_parameter_lab as order
import exchange_symmetry_lab as exchange
import conservation_lab as conservation

SX = np.array([[0, 1], [1, 0]], complex)
SY = np.array([[0, -1j], [1j, 0]], complex)
SZ = np.diag([1., -1.]).astype(complex)
PAULI = [SX, SY, SZ]
SWAP = np.eye(4)[[0, 2, 1, 3]]


def signed_permutations(dim):
    result = []
    for permutation in itertools.permutations(range(dim)):
        for signs in itertools.product((-1, 1), repeat=dim):
            m = np.zeros((dim, dim), int)
            for row, column in enumerate(permutation):
                m[row, column] = signs[row]
            result.append(m)
    return result


def monomial_values(points, powers):
    return np.prod(points[:, None, :] ** np.array(powers)[None, :, :], axis=2)


def independent_energy(v, p):
    x = np.asarray(v)
    pairs = sum(x[i]**2*x[j]**2 for i in range(len(x)) for j in range(i+1, len(x)))
    sixth = sum(x[i]**4*x[j]**2 for i in range(len(x)) for j in range(len(x)) if i != j)
    triple = np.prod(x**2) if len(x) == 3 else 0.
    return (p['a2']*sum(x*x)+p['b4']*sum(x**4)+p['c4']*pairs
            +p['d6']*sum(x**6)+p['e6']*sixth+p['f6']*triple-p['fieldX']*x[0])


def spin_hamiltonian(j):
    return sum((j[a, b]*np.kron(PAULI[a], PAULI[b])/4
                for a in range(3) for b in range(3)), np.zeros((4, 4), complex))


def spinor(axis, angle):
    axis = np.asarray(axis, float)/np.linalg.norm(axis)
    return math.cos(angle/2)*np.eye(2)-1j*math.sin(angle/2)*sum(axis[a]*PAULI[a] for a in range(3))


def proper_rotation(axis, angle):
    n = np.asarray(axis, float)/np.linalg.norm(axis)
    cross = np.array([[0, -n[2], n[1]], [n[2], 0, -n[0]], [-n[1], n[0], 0]])
    return math.cos(angle)*np.eye(3)+(1-math.cos(angle))*np.outer(n, n)+math.sin(angle)*cross


def lift_rotation(rotation):
    angle = math.acos(np.clip((np.trace(rotation)-1)/2, -1, 1))
    if angle < 1e-10:
        return np.eye(2, dtype=complex)
    if abs(math.sin(angle)) > 1e-8:
        axis = np.array([rotation[2, 1]-rotation[1, 2], rotation[0, 2]-rotation[2, 0], rotation[1, 0]-rotation[0, 1]])
    else:
        values, vectors = np.linalg.eigh((rotation+rotation.T)/2)
        axis = vectors[:, np.argmax(values)]
    return spinor(axis, angle)


def decode(matrix):
    return np.array(matrix['re'])+1j*np.array(matrix['im'])


class PrinciplesCrosscheck(unittest.TestCase):
    def test_independently_enumerated_parent_groups(self):
        for name, dim in [('c4v', 2), ('oh', 3)]:
            actual = order.calculate({'pointGroup': name})['order']['operations']
            self.assertEqual({tuple(np.array(x['matrix']).ravel()) for x in actual},
                             {tuple(x.ravel()) for x in signed_permutations(dim)})

    def test_polynomial_reynolds_image_is_complete_not_just_invariant(self):
        rng = np.random.default_rng(314159)
        for name, dim in [('c4v', 2), ('oh', 3)]:
            result = order.calculate({'pointGroup': name})['order']
            for degree in (2, 4, 6):
                powers = [x for x in itertools.product(range(degree+1), repeat=dim) if sum(x) == degree]
                points = rng.uniform(-.95, .95, (3*len(powers)+7, dim))
                average = sum(monomial_values(points@g.T, powers) for g in signed_permutations(dim))/(2**dim*math.factorial(dim))
                basis = [x for x in result['invariants'] if x['degree'] == degree]
                values = np.column_stack([sum(t['coefficient']*np.prod(points**t['powers'], axis=1) for t in item['terms']) for item in basis])
                # B_n invariant ring is the symmetric polynomials in x_i^2.
                partitions = {tuple(sorted(x, reverse=True)) for x in itertools.product(range(degree//2+1), repeat=dim) if sum(x) == degree//2}
                self.assertEqual(len(basis), len(partitions))
                self.assertEqual(np.linalg.matrix_rank(average, tol=1e-10), len(partitions))
                self.assertEqual(np.linalg.matrix_rank(values, tol=1e-10), len(partitions))
                coeff = np.linalg.lstsq(values, average, rcond=None)[0]
                np.testing.assert_allclose(values@coeff, average, atol=1e-12)

    def test_order_orbit_field_splitting_and_little_group(self):
        for name, dim, vectors in [('c4v', 2, [[0, 0], [1, 0], [1, 1], [.4, .9]]),
                                   ('oh', 3, [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1], [.4, .9, 1.3]])]:
            for v in vectors:
                for field in (0, .37):
                    p = dict(pointGroup=name, etaX=v[0], etaY=v[1], etaZ=v[2] if dim == 3 else 0,
                             a2=-.3, b4=.6, c4=1.2, d6=.2, e6=.1, f6=.3, fieldX=field)
                    result = order.calculate(p)['order']
                    group = signed_permutations(dim)
                    orbit = {tuple(g@v) for g in group}
                    stabilizer = [g for g in group if np.array_equal(g@v, v)]
                    h = np.eye(dim)[0]*field
                    little = [g for g in group if np.array_equal(g@h, h)]
                    physical = [g for g in little if np.array_equal(g@v, v)]
                    self.assertEqual({tuple(x['vector']) for x in result['domains']}, orbit)
                    self.assertEqual(result['stabilizerOrder'], len(stabilizer))
                    self.assertEqual(result['fieldGroupOrder'], len(little))
                    self.assertEqual(result['physicalStabilizerOrder'], len(physical))
                    self.assertEqual(result['fieldOrbitSize']*len(physical), len(little))
                    invariant_values = []
                    for domain in result['domains']:
                        self.assertAlmostEqual(domain['energy'], independent_energy(domain['vector'], p), places=12)
                        invariant_values.append(domain['energy']+field*domain['vector'][0])
                    np.testing.assert_allclose(invariant_values, invariant_values[0], atol=1e-12)

    def test_passive_order_coordinates_include_field_and_operations(self):
        for group in ('c4v', 'oh'):
            for angle in (-137, 19, 83):
                result = order.calculate(dict(pointGroup=group, etaX=.5, etaY=-.3, etaZ=.7, fieldX=.4,
                                              b4=.8, c4=1.7, d6=.2, e6=.13, f6=.29, basisAngle=angle))
                o, p = result['order'], result['parameters']
                c = o['convention']; q = np.array(c['rotation']); dim = o['dimension']
                np.testing.assert_allclose(q@c['vector'], o['vector'], atol=1e-14)
                np.testing.assert_allclose(q@c['field'], np.eye(dim)[0]*p['fieldX'], atol=1e-14)
                self.assertAlmostEqual(c['energy'], independent_energy(q@c['vector'], p), places=12)
                for old, new in zip(o['operations'], c['operations']):
                    np.testing.assert_allclose(q@new@q.T, old['matrix'], atol=1e-14)
                # Physical rotation at fixed anisotropy is generally different.
                self.assertGreater(abs(independent_energy(c['vector'], p)-c['energy']), 1e-5)

    def test_bond_svd_projection_equals_independent_group_average(self):
        rng = np.random.default_rng(161803)
        for flags in itertools.product((0, 1), repeat=4):
            for rotation in (0, 2, 4):
                p = dict(zip(('inversion', 'mirrorXY', 'mirrorXZ', 'mirrorYZ'), flags))
                p.update(dict(zip(('isotropic', 'anisotropyX', 'anisotropyY', 'symmetricXY', 'symmetricXZ', 'symmetricYZ', 'dx', 'dy', 'dz'), rng.uniform(-1, 1, 9))))
                p['rotationOrder'] = rotation
                out = exchange.calculate(p)['exchange']
                original, projected = np.array(out['inputTensor']), np.array(out['tensor'])
                reference = np.zeros((3, 3))
                for polar in out['closureMatrices']:
                    r = np.array(polar); axial = np.linalg.det(r)*r
                    # Derive site permutation from geometry, not R[0,0].
                    endpoint = r@np.array([-.5, 0, 0])
                    swapped = np.allclose(endpoint, [.5, 0, 0])
                    tensor = original.T if swapped else original
                    reference += axial.T@tensor@axial/out['closureOrder']
                np.testing.assert_allclose(projected, reference, atol=1e-12)
                basis = np.array(out['allowedBasis'])
                np.testing.assert_allclose(basis.T@(original-projected).ravel(), 0, atol=1e-12)

    def test_improper_spatial_operations_lift_to_axial_spin_and_endpoint_swap(self):
        # These combinations include proper rotations, mirrors and inversion.
        for p in [dict(mirrorXY=1, mirrorXZ=1, rotationOrder=4),
                  dict(inversion=1, mirrorXY=1, rotationOrder=4),
                  dict(mirrorXY=0, mirrorYZ=1, rotationOrder=2),
                  dict(mirrorXY=1)]:
            p.update(isotropic=.73, anisotropyX=.21, anisotropyY=-.17,
                     symmetricXY=.26, symmetricXZ=-.31, symmetricYZ=.44, dx=.53, dy=-.63, dz=.47)
            out = exchange.calculate(p)['exchange']
            j = np.array(out['tensor']); h = spin_hamiltonian(j)
            for polar in out['closureMatrices']:
                r = np.array(polar); a = np.linalg.det(r)*r
                single = lift_rotation(a); unitary = np.kron(single, single)
                if np.allclose(r@[-.5, 0, 0], [.5, 0, 0]):
                    unitary = unitary@SWAP
                np.testing.assert_allclose(unitary.conj().T@h@unitary, h, atol=1e-12)

    def test_arbitrary_axis_quantum_coordinate_covariance_and_dmi_sign(self):
        rng = np.random.default_rng(271828)
        for _ in range(12):
            j = rng.normal(size=(3, 3)); axis = rng.normal(size=3); angle = rng.uniform(-math.pi, math.pi)
            r = proper_rotation(axis, angle); single = spinor(axis, angle); both = np.kron(single, single)
            old_d = np.array([j[1, 2]-j[2, 1], j[2, 0]-j[0, 2], j[0, 1]-j[1, 0]])/2
            for swapped in (False, True):
                new_j = r.T@(j.T if swapped else j)@r
                u = both@SWAP if swapped else both
                np.testing.assert_allclose(u.conj().T@spin_hamiltonian(j)@u, exchange.hamiltonian(new_j), atol=1e-12)
                _, _, new_d = exchange.decompose(new_j)
                np.testing.assert_allclose(new_d, (-1 if swapped else 1)*r.T@old_d, atol=1e-12)

    def test_same_diagonal_exchange_matches_conservation_model(self):
        rng = np.random.default_rng(57721)
        for _ in range(6):
            diagonal = rng.uniform(-2, 2, 3)
            result = conservation.calculate(dict(jx=diagonal[0], jy=diagonal[1], jz=diagonal[2], points=5))
            c = result['conservation']
            h = decode(c['convention']['originalHamiltonian'])
            np.testing.assert_allclose(h, spin_hamiltonian(np.diag(diagonal)), atol=1e-14)
            np.testing.assert_allclose(c['degeneracy']['eigenvalues'], exchange.quantum(np.diag(diagonal))['levels'], atol=1e-14)
            for proof in c['proofs']:
                q = decode(proof['operator']); commutator = h@q-q@h
                np.testing.assert_allclose(decode(proof['commutator']), commutator, atol=1e-14)
                np.testing.assert_allclose(decode(proof['adjoint']), 1j*commutator, atol=1e-14)
            self.assertEqual(c['degeneracy']['timeReversalSquare'], 1)
            self.assertFalse(c['degeneracy']['kramersProtected'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
