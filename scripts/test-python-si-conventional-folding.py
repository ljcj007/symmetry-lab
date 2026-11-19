"""Check the four conventional-cell Gamma displacement sectors of official Si.

Run staged tests with --site-root pointing to the Symmetry Lab checkout. Once
placed in the checkout's scripts directory they also run without that option.
The result counts displacement coordinates, rather than phonon frequencies.
"""

import argparse
from fractions import Fraction as F
import hashlib
import json
from pathlib import Path
import sys
import unittest

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SI_SHA = '6e2316a7d3085fd9fe5fc837aa849d2ad1d104ea1b23919fc6b3c1514b72e7a7'
F_TRANSLATIONS = tuple(tuple(F(n, 2) for n in t) for t in (
    (0, 0, 0), (0, 1, 1), (1, 0, 1), (1, 1, 0),
))
CONVENTIONAL_K = ((0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1))
EXPECTED_BC_K = ((0, 0, 0), (0, F(1, 2), F(1, 2)), (F(1, 2), 0, F(1, 2)), (F(1, 2), F(1, 2), 0))
EXPECTED_CHARACTERS = np.array([
    [1, 1, 1, 1], [1, 1, -1, -1], [1, -1, 1, -1], [1, -1, -1, 1],
], dtype=int)


def modulo_lattice(vector):
    return tuple(F(x) % 1 for x in vector)


def plus(left, right):
    return tuple(x + y for x, y in zip(left, right))


def dot(left, right):
    return sum(x * y for x, y in zip(left, right))


def translation_character(k, translation):
    phase = dot(k, translation) % 1
    if phase not in (0, F(1, 2)):
        raise ValueError('Expected a real character of the four F cosets.')
    return 1 if phase == 0 else -1


class SiConventionalFoldingTests(unittest.TestCase):
    site_root = ROOT

    @classmethod
    def setUpClass(cls):
        data = cls.site_root / 'dist/data'
        sys.path.insert(0, str(cls.site_root / 'dist/python'))
        from browser_api import run

        folder = data / 'examples/phonopy-si-structure'
        raw = (folder / 'POSCAR-0').read_bytes()
        manifest = json.loads((folder / 'source.json').read_bytes())
        if hashlib.sha256(raw).hexdigest() != SI_SHA or manifest['structureFile']['sha256'] != SI_SHA:
            raise ValueError('The official Si conventional structure does not match its source record.')
        if len(raw) != 1109 or manifest['structureFile']['bytes'] != len(raw):
            raise ValueError('Unexpected official POSCAR-0 byte count.')

        database = json.loads((data / 'space-groups.json').read_bytes())
        group = database['groups'][226]
        cls.structures = [run('structure_bc', {'format': 'poscar', 'text': raw.decode('utf-8'),
                                                'symprec': 1e-5, 'k': list(k)}, database=database)
                          for k in CONVENTIONAL_K]
        # Use the workbench's numerical, single-valued path. Optional names are
        # irrelevant to the orbit, stabilizer and dimensions checked here.
        cls.analyses = [run('analyze', {'basis': group['basis'], 'operations': group['operations'],
                                       'doubleValued': False, 'k': structure['k_bc']})
                        for structure in cls.structures]
        cls.operations = group['operations']
        cls.site_positions = [modulo_lattice(r) for r in cls.structures[0]['input_cell']['positions']]

    def test_real_si_gamma_and_three_x_arms(self):
        star_x = set(EXPECTED_BC_K[1:])
        for index, (structure, analysis, k, k_bc) in enumerate(zip(
                self.structures, self.analyses, CONVENTIONAL_K, EXPECTED_BC_K)):
            with self.subTest(k=k):
                self.assertEqual(structure['group_number'], 227)
                self.assertEqual(structure['input_cell']['atom_count'], 8)
                self.assertEqual(structure['bc_primitive']['atom_count'], 2)
                self.assertEqual(structure['input_cell']['species'], ['Si'] * 8)
                self.assertEqual(tuple(structure['k_bc']), k_bc)
                self.assertTrue(structure['k_translation_phase_verified'])

                # Check dot-product invariance for the actual F translations,
                # with the origin shift correctly absent from a displacement.
                matrix = structure['transform']['coordinate_matrix']
                for t in F_TRANSLATIONS:
                    t_bc = tuple(dot(tuple(F(x) for x in row), t) for row in matrix)
                    self.assertTrue(all(x.denominator == 1 for x in t_bc))
                    self.assertEqual(dot(k, t), dot(k_bc, t_bc))

                arm_count, little_order = (1, 48) if index == 0 else (3, 16)
                expected_star = {EXPECTED_BC_K[0]} if index == 0 else star_x
                actual_star = {modulo_lattice(row['k']) for row in analysis['star']}
                self.assertEqual(actual_star, expected_star)
                self.assertEqual(len(analysis['star']), arm_count)

                # For this closed operation list, R^T fixes k iff R^-T does.
                little = [i for i, op in enumerate(self.operations)
                          if modulo_lattice(dot(col, k_bc) for col in zip(*op['rotation'])) == k_bc]
                self.assertEqual(analysis['littleGroup']['sourceIndices'], little)
                self.assertEqual(len(little), little_order)
                self.assertEqual(arm_count * little_order, 48)
                self.assertTrue(analysis['validation']['passed'])
                self.assertEqual(analysis['validation']['dimensionSquaredSum'], little_order)
                if index:
                    self.assertEqual(sorted(irrep['dimension'] for irrep in analysis['irreps']), [2] * 4)

    def test_translation_characters_and_displacement_projectors(self):
        nsite = len(self.site_positions)
        site_index = {position: i for i, position in enumerate(self.site_positions)}
        self.assertEqual(len(site_index), 8)
        eye = np.eye(3 * nsite, dtype=int)
        matrices, site_permutations = [], []
        for t in F_TRANSLATIONS:
            targets = [site_index[modulo_lattice(plus(position, t))] for position in self.site_positions]
            self.assertEqual(sorted(targets), list(range(nsite)))
            site_permutations.append(targets)
            # Active permutation of atoms, leaving Cartesian displacement axes fixed.
            permutation = np.zeros((nsite, nsite), dtype=int)
            permutation[targets, np.arange(nsite)] = 1
            matrices.append(np.kron(permutation, np.eye(3, dtype=int)))

        self.assertEqual([int(np.trace(m)) for m in matrices], [24, 0, 0, 0])
        orbits = {frozenset(targets[i] for targets in site_permutations) for i in range(nsite)}
        self.assertEqual(sorted(map(len, orbits)), [4, 4])
        for i, left in enumerate(F_TRANSLATIONS):
            for j, right in enumerate(F_TRANSLATIONS):
                k = F_TRANSLATIONS.index(modulo_lattice(plus(left, right)))
                np.testing.assert_array_equal(matrices[i] @ matrices[j], matrices[k])

        characters = np.array([[translation_character(k, t) for t in F_TRANSLATIONS]
                               for k in CONVENTIONAL_K], dtype=int)
        np.testing.assert_array_equal(characters, EXPECTED_CHARACTERS)
        np.testing.assert_array_equal(characters @ characters.T, 4 * np.eye(4, dtype=int))

        # Check exact scaled projectors N_chi = 4 P_chi; no rank threshold needed.
        numerators = [sum(coefficient * matrix for coefficient, matrix in zip(row, matrices))
                      for row in characters]
        np.testing.assert_array_equal(sum(numerators), 4 * eye)
        for i, current in enumerate(numerators):
            self.assertEqual(np.trace(current), 4 * 6)
            np.testing.assert_array_equal(current.T, current)
            for j, other in enumerate(numerators):
                np.testing.assert_array_equal(current @ other, 4 * current if i == j else np.zeros_like(eye))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--site-root', type=Path, default=ROOT)
    options, test_args = parser.parse_known_args()
    SiConventionalFoldingTests.site_root = options.site_root.resolve()
    unittest.main(argv=[sys.argv[0], *test_args])
