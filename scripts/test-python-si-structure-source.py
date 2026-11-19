"""Check the official Si input and its BC representation handoff with the public Python API."""

from collections import Counter
from fractions import Fraction as F
import gzip
import hashlib
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data'
EXAMPLE = DATA / 'examples/phonopy-si-structure'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

COMMIT = '18cad919af8fe8aad349e04f101887fa19b051a0'
POSCAR_SHA = '6e2316a7d3085fd9fe5fc837aa849d2ad1d104ea1b23919fc6b3c1514b72e7a7'
LICENSE_SHA = '2ce26839c8b70d28765d73e934cc1a979d896d8d228d30694fdd9a92e94d43a9'
CONVENTIONAL_K = (F(1, 2), F(0), F(0))
# FCC primitive direct vectors, columns in cubic conventional coordinates.
PRIMITIVE_BASIS = ((F(0), F(1, 2), F(1, 2)),
                   (F(1, 2), F(0), F(1, 2)),
                   (F(1, 2), F(1, 2), F(0)))
CONVENTIONAL_TO_BC = ((-1, 1, 1), (1, -1, 1), (1, 1, -1))


def key_sha256(data):
    return hashlib.sha256(data).hexdigest()


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def act(matrix, vector):
    return tuple(dot(row, vector) for row in matrix)


def dual_act(matrix, vector):
    return tuple(dot(column, vector) for column in zip(*matrix))


def reduced(vector):
    return tuple(value % 1 for value in vector)


def seitz_key(operation):
    rotation = tuple(tuple(row) for row in operation['rotation'])
    translation = reduced(F(value) for value in operation['translation'])
    return rotation, translation


class SiStructureSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((EXAMPLE / 'source.json').read_bytes())
        cls.text = (EXAMPLE / 'POSCAR-0').read_bytes().decode('utf-8')
        cls.database = json.loads((DATA / 'space-groups.json').read_text(encoding='utf-8'))
        cls.labels = {kind: json.loads(gzip.decompress((DATA / 'labels' / f'{kind}-labels.json.gz').read_bytes()))
                      for kind in ('bc', 'bilbao')}
        cfg = cls.manifest['input']
        cls.conversion = run('structure_bc', {'format': cfg['format'], 'text': cls.text,
                                             'k': cfg['conventionalK'], 'symprec': cfg['symprec'],
                                             'angle_tolerance': cfg['angleTolerance']}, database=cls.database)
        cls.group = cls.database['groups'][cls.conversion['group_number'] - 1]
        # Match the workbench. The converted coordinates choose the catalogued
        # BC representations after the independently verified setting transform.
        base_input = {'operations': cls.group['operations'], 'basis': cls.group['basis'],
                      'group_number': cls.group['number'], 'doubleValued': False,
                      'bz_type': cls.conversion['bz_type']}
        cls.correct = run('analyze', dict(base_input, k=cls.conversion['k_bc']),
                          database=cls.database, label_database=cls.labels)
        cls.unconverted = run('analyze', dict(base_input, k=cfg['conventionalK']),
                              database=cls.database, label_database=cls.labels)

    def test_raw_identity_and_conventional_atom_positions(self):
        self.assertEqual(self.manifest['format'], 'symmetry-lab-phonopy-si-structure-source-1')
        self.assertEqual(self.manifest['commit'], COMMIT)
        self.assertEqual(self.manifest['license'], 'BSD-3-Clause')
        for field, name, digest, blob in (
            ('structureFile', 'POSCAR-0', POSCAR_SHA, 'f377319ec8d5e6e36793e7630f2932d663f19295'),
            ('licenseFile', 'LICENSE.txt', LICENSE_SHA, 'ad98c46d8bef0cac32974e405865147cc80679ff'),
        ):
            entry = self.manifest[field]
            data = (EXAMPLE / name).read_bytes()
            self.assertEqual(entry['path'], name)
            self.assertIn('/' + COMMIT + '/', entry['url'])
            self.assertEqual(entry['bytes'], len(data))
            self.assertEqual(entry['sha256'], digest)
            self.assertEqual(key_sha256(data), digest)
            self.assertEqual(entry['gitBlobSha1'], blob)
            self.assertEqual(hashlib.sha1(f'blob {len(data)}\0'.encode('ascii') + data).hexdigest(), blob)
        lines = self.text.splitlines()
        self.assertEqual(lines[:2], ['Si', '1.'])
        cubic = F(lines[2].split()[0])
        self.assertEqual(float(cubic), self.manifest['input']['latticeConstantAngstrom'])
        self.assertEqual([tuple(map(F, line.split())) for line in lines[2:5]],
                         [tuple(cubic if i == j else 0 for j in range(3)) for i in range(3)])
        self.assertEqual([line.strip() for line in lines[5:8]], ['Si', '8', 'Direct'])
        positions = {tuple(map(F, line.split())) for line in lines[8:16]}
        offsets = ((0, 0, 0), (0, F(1, 2), F(1, 2)), (F(1, 2), 0, F(1, 2)), (F(1, 2), F(1, 2), 0))
        expected_atoms = {reduced(base + delta for delta in offset) for base in (F(1, 8), F(7, 8)) for offset in offsets}
        self.assertEqual(positions, expected_atoms)
        self.assertEqual(self.conversion['input_cell']['positions'], [list(map(float, line.split())) for line in lines[8:16]])
        self.assertEqual(self.conversion['input_metadata']['trailing_lines'], lines[16:])

    def test_primitive_geometry_and_space_group_operation_covariance(self):
        result, reference = self.conversion, self.manifest['reference']
        self.assertTrue(result['verified'] and result['complete'])
        self.assertEqual(result['group_number'], reference['spaceGroupNumber'])
        self.assertEqual(result['international'], reference['international'])
        self.assertEqual(result['hall_number'], reference['hallNumber'])
        self.assertEqual(result['bravais'], reference['bravais'])
        self.assertEqual(result['atom_count'], reference['bcAtomCount'])
        self.assertEqual(result['input_cell']['atom_count'], 8)
        self.assertEqual(result['bc_primitive']['species'], ['Si', 'Si'])
        self.assertAlmostEqual(result['bc_primitive']['volume'] / result['input_cell']['volume'], 0.25, places=14)
        self.assertEqual(result['group_order'], 48)
        self.assertEqual(result['group_order'], reference['bcRepresentativeCount'])
        self.assertEqual({seitz_key(op) for op in result['operations']}, {seitz_key(op) for op in self.group['operations']})
        transported = Counter(op['bc_operation_index'] for op in result['transported_input_operations'])
        self.assertEqual(transported, Counter({i: 4 for i in range(48)}))
        lattice = self.manifest['input']['latticeConstantAngstrom']
        for row, expected in zip(result['bc_primitive']['lattice'], PRIMITIVE_BASIS):
            for stored, value in zip(row, expected):
                self.assertAlmostEqual(stored, lattice * float(value), places=14)
        atoms = {tuple(map(F, row)) for row in result['bc_primitive']['positions']}
        self.assertEqual(len(atoms), 2)
        for operation in result['operations']:
            rotation, translation = seitz_key(operation)
            self.assertEqual({reduced(x + v for x, v in zip(act(rotation, atom), translation)) for atom in atoms}, atoms)
        proof = result['verification']
        self.assertTrue(all(proof[key] for key in ('original_BC_generators', 'integral_rotations',
                                                   'input_operation_transport_verified', 'atoms_per_volume_preserved')))
        self.assertLessEqual(proof['atom_covariance_max_error_angstrom'], 1e-12)

    def test_wavevector_transport_and_declared_workbench_difference(self):
        expected_bc = dual_act(PRIMITIVE_BASIS, CONVENTIONAL_K)
        self.assertEqual(expected_bc, (0, F(1, 4), F(1, 4)))
        self.assertEqual(tuple(self.conversion['k_bc']), expected_bc)
        self.assertEqual(tuple(self.manifest['reference']['bcK']), expected_bc)
        self.assertEqual(tuple(tuple(row) for row in self.conversion['transform']['coordinate_matrix']), CONVENTIONAL_TO_BC)
        for translation in ((1, 0, 0), (0, 1, 0), (0, 0, 1), (1, -2, 3)):
            self.assertEqual(dot(CONVENTIONAL_K, translation), dot(expected_bc, act(CONVENTIONAL_TO_BC, translation)))
        self.assertTrue(self.conversion['k_translation_phase_verified'])

        for result, k, arms, size, dimensions, tags in (
            (self.correct, expected_bc, 6, 8, [1, 1, 1, 1, 2], {f'Δ{n}' for n in range(1, 6)}),
            (self.unconverted, CONVENTIONAL_K, 4, 12, [1, 1, 1, 1, 2, 2],
             {f'L{n}{sign}' for n in range(1, 4) for sign in ('+', '-')}),
        ):
            with self.subTest(k=k):
                # The full rotation set is closed under inversion. Transposed
                # and inverse-transposed sets give the same star of arms.
                star = {reduced(dual_act(op['rotation'], k)) for op in self.group['operations']}
                selected = [i for i, op in enumerate(self.group['operations']) if reduced(dual_act(op['rotation'], k)) == k]
                self.assertEqual(star, {reduced(F(value) for value in arm['k']) for arm in result['star']})
                self.assertEqual(len(star), arms)
                self.assertEqual(result['littleGroup']['sourceIndices'], selected)
                self.assertEqual(len(selected), size)
                self.assertEqual(size * arms, 48)
                self.assertEqual(sorted(row['dimension'] for row in result['irreps']), dimensions)
                self.assertEqual(result['validation']['dimensionSquaredSum'], size)
                self.assertTrue(result['validation']['passed'])
                self.assertFalse(result['magnetic'] or result['doubleValued'])
                labels = result['standardLabels']
                self.assertTrue(labels['bc_complete'])
                self.assertEqual({row['bc_label'] for row in labels['mappings']}, tags)
        self.assertFalse(self.correct['standardLabels']['bilbao_complete'])

    def test_little_group_uses_integer_translation_defects_at_converted_k(self):
        little = self.correct['littleGroup']
        operations = little['operations']
        k = tuple(map(F, self.correct['k']))
        sampled_factors = set()
        for i, left in enumerate(operations):
            r, t = seitz_key(left)
            for j, right in enumerate(operations):
                product = operations[little['multiplicationTable'][i][j]]
                s, u = seitz_key(right)
                chosen_r, chosen_t = seitz_key(product)
                self.assertEqual(tuple(tuple(dot(row, column) for column in zip(*s)) for row in r), chosen_r)
                defect = tuple(a + b - c for a, b, c in zip(t, act(r, u), chosen_t))
                self.assertEqual(defect, tuple(little['translationDefects'][i][j]))
                self.assertTrue(all(value.denominator == 1 for value in defect))
                quarter_turns = -4 * dot(k, defect)
                self.assertEqual(quarter_turns.denominator, 1)
                phase = (1, 1j, -1, -1j)[int(quarter_turns) % 4]
                stored = little['factors'][i][j]
                self.assertAlmostEqual(stored['re'], phase.real, places=14)
                self.assertAlmostEqual(stored['im'], phase.imag, places=14)
                sampled_factors.add(phase)
        self.assertIn(1, sampled_factors)
        self.assertGreater(len(sampled_factors), 1)


if __name__ == '__main__':
    unittest.main()
