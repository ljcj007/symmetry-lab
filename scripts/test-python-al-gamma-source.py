"""Reproduce the three Al/ABACUS scenes with the browser's existing Python API."""

from fractions import Fraction
import hashlib
import json
from pathlib import Path
import sys
import unittest

import numpy as np
import yaml


ROOT = Path(__file__).resolve().parents[1]
BAND_SHA = '08da0d622d6f423f4bc5d3900a30c9bb5dfb86933bc849f59aad60fe67ec330b'
STRUCTURE_SHA = 'a5d34dc7f9ddf73066e07a9b64a53e7d9b89735d9af353de0af1a21a5512b87f'
COMMIT = '18cad919af8fe8aad349e04f101887fa19b051a0'
BOHR_ANGSTROM = .529177210903
GAMMA_RESIDUAL_THZ = .0008274596


def verified_raw(folder, record, expected_digest, byte_count):
    raw = (folder / record['localFile']).read_bytes()
    if record['sha256'] != expected_digest or hashlib.sha256(raw).hexdigest() != expected_digest:
        raise ValueError('The official raw file does not match its validated SHA-256 pin.')
    if record['byteCount'] != byte_count or len(raw) != byte_count:
        raise ValueError('The official raw file does not match its validated byte count.')
    return raw


class OfficialAlGammaTests(unittest.TestCase):
    site_root = ROOT

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(cls.site_root / 'dist/python'))
        from browser_api import run

        folder = cls.site_root / 'dist/data/examples'
        cls.manifest = json.loads((folder / 'phonopy-al-abacus-source.json').read_bytes())
        band = verified_raw(folder, cls.manifest, BAND_SHA, 63428)
        companion = verified_raw(folder, cls.manifest['companion'], STRUCTURE_SHA, 8206)
        cls.raw_band = yaml.safe_load(band)
        cls.base = {
            'preset': 'custom', 'content': band.decode('utf-8'), 'filename': cls.manifest['localFile'],
            'structure_content': companion.decode('utf-8'), 'structure_filename': cls.manifest['companion']['localFile'],
            'frequency_unit': 'THz', 'selected_band': 0, 'amplitude': .01, 'phase': 0,
            'frequency_tolerance': 1e-5, 'symprec': 1e-5,
        }
        cls.run_mode = staticmethod(run)

    def calculate(self, q_index, supercell, **settings):
        payload = dict(self.base, selected_q=q_index, supercell=supercell)
        payload.update(settings)
        return self.run_mode('phonon_modes', payload)

    def test_both_gamma_coordinates_give_the_same_vector_representation(self):
        for q_index, expected_q in [(0, [1, 1, 1]), (62, [0, 0, 0])]:
            with self.subTest(index=q_index):
                result = self.calculate(q_index, [1, 1, 1])
                self.assertEqual(self.raw_band['phonon'][q_index]['q-position'], expected_q)
                self.assertEqual(result['selection']['q'], expected_q)
                self.assertTrue(all(Fraction(component).denominator == 1 for component in expected_q))
                self.assertEqual(result['symmetry']['spaceGroup'], 225)
                self.assertTrue(result['symmetry']['primitiveCell'])
                self.assertEqual(result['symmetry']['operationCount'], 48)
                self.assertEqual(result['structure']['natom'], 1)
                self.assertFalse(result['synthetic'])
                self.assertEqual(len(result['modeGroups']), 1)
                group = result['modeGroups'][0]
                self.assertEqual(group['bands'], [0, 1, 2])
                self.assertEqual(group['dimension'], 3)
                expected_frequencies = [mode['frequency'] for mode in self.raw_band['phonon'][q_index]['band']]
                self.assertEqual(group['frequencies'], expected_frequencies)
                self.assertEqual(expected_frequencies, [GAMMA_RESIDUAL_THZ] * 3)
                classification = group['classification']
                self.assertEqual(classification['status'], 'classified')
                self.assertEqual(classification['label'], 'T1u')
                self.assertEqual(classification['decomposition'], [{'irrep': 'T1u', 'multiplicity': 1, 'dimension': 3}])
                self.assertLess(classification['invarianceError'], 1e-12)

    def test_unit_confirmation_leaves_values_and_file_identity_intact(self):
        self.assertNotIn('frequency_unit', self.raw_band)
        self.assertIsNone(self.manifest['frequencyUnitInBandFile'])
        self.assertEqual(self.manifest['exampleEntryFrequencyUnitChoice'], 'THz')
        self.assertEqual(self.raw_band['length_unit'], 'au')
        unknown = self.calculate(0, [1, 1, 1], frequency_unit='unknown')
        confirmed = self.calculate(0, [1, 1, 1])
        self.assertEqual(unknown['frequencyUnitSource'], 'unspecified')
        self.assertEqual(confirmed['frequencyUnit'], 'THz')
        self.assertEqual(confirmed['frequencyUnitSource'], 'user.frequency_unit')
        self.assertEqual(confirmed['frequencyUnitDeclarations'], [])
        self.assertEqual(unknown['modeGroups'][0]['frequencies'], confirmed['modeGroups'][0]['frequencies'])
        for result in [unknown, confirmed]:
            source = result['sourceIdentity']
            self.assertEqual(source['sha256'], BAND_SHA)
            self.assertEqual(source['reference']['id'], 'official-phonopy-al-abacus-pw')
            self.assertEqual(source['reference']['commit'], COMMIT)
            self.assertEqual(result['frozen']['lengthUnit'], 'au')
            self.assertEqual(result['structure']['lattice'], self.raw_band['lattice'])
            poscar_lattice = np.array([[float(value) for value in row.split()]
                                      for row in result['exports']['poscar'].splitlines()[2:5]])
            np.testing.assert_allclose(poscar_lattice, np.array(self.raw_band['lattice']) * BOHR_ANGSTROM,
                                       atol=1e-11, rtol=0)

    def test_boundary_wave_requires_compatible_period_and_flips_equivalent_sites(self):
        with self.assertRaisesRegex(ValueError, 'q_i.*supercell_i'):
            self.calculate(83, [1, 1, 1])
        result = self.calculate(83, [2, 2, 2])
        expected_q = [.5, .5, .5]
        self.assertEqual(self.raw_band['phonon'][83]['q-position'], expected_q)
        self.assertEqual(result['selection']['q'], expected_q)
        self.assertEqual(sorted(group['dimension'] for group in result['modeGroups']), [1, 2])
        for group in result['modeGroups']:
            self.assertEqual(group['classification']['status'], 'unavailable')
            self.assertIsNone(group['classification']['label'])
        frozen = result['frozen']
        self.assertTrue(frozen['commensurate'])
        self.assertEqual(frozen['supercell'], [2, 2, 2])
        self.assertEqual(len(frozen['atoms']), 8)
        self.assertEqual({atom['symbol'] for atom in frozen['atoms']}, {'Al'})
        self.assertTrue(result['exports']['poscar'])
        self.assertTrue(result['exports']['cif'])
        reference = np.array(frozen['atoms'][0]['displacement'])
        self.assertGreater(np.linalg.norm(reference), 0)
        for atom in frozen['atoms']:
            # Each integer primitive translation adds a half turn to q·R.
            parity = (-1) ** sum(atom['cell'])
            np.testing.assert_allclose(atom['displacement'], parity * reference, atol=1e-12, rtol=0)

    def test_l_point_longitudinal_and_transverse_projectors(self):
        modes = [self.calculate(83, [2, 2, 2], selected_band=i) for i in range(3)]
        self.assertEqual([r['selection']['frequency'] for r in modes],
                         [9.7063938967, 4.1396545728, 4.1396545728])
        self.assertTrue(all(r['frequencyUnit'] == 'THz' for r in modes))
        reference = modes[0]
        self.assertEqual([g['bands'] for g in reference['modeGroups']], [[1, 2], [0]])
        self.assertEqual(reference['structure']['lengthUnit'], 'au')

        # Columns of the Cartesian reciprocal dual solve A q_cart = q_frac,
        # where the rows of A are the primitive direct-lattice vectors in bohr.
        lattice = np.asarray(reference['structure']['lattice'])
        self.assertEqual(reference['selection']['q'], [.5, .5, .5])
        q_cart = np.linalg.solve(lattice, reference['selection']['q'])
        a = 2 * lattice[0, 1]
        np.testing.assert_allclose(q_cart, np.full(3, 1 / (2 * a)), atol=1e-12, rtol=0)
        direction = q_cart / np.linalg.norm(q_cart)

        vectors = []
        for mode in modes:
            pairs = np.asarray(mode['selection']['eigenvector'])[0]
            mass = mode['structure']['atoms'][0]['mass']
            physical = (pairs[:, 0] + 1j * pairs[:, 1]) / np.sqrt(mass)
            vectors.append(physical / np.linalg.norm(physical))
        frame = np.column_stack(vectors)
        np.testing.assert_allclose(frame.conj().T @ frame, np.eye(3), atol=1e-12, rtol=0)
        np.testing.assert_allclose(np.abs(direction @ frame)**2, [1, 0, 0], atol=1e-12, rtol=0)

        def projector(columns):
            return columns @ columns.conj().T

        longitudinal, transverse = frame[:, :1], frame[:, 1:]
        axis = np.outer(direction, direction)
        plane = np.eye(3) - axis
        np.testing.assert_allclose(projector(longitudinal), axis, atol=1e-12, rtol=0)
        np.testing.assert_allclose(projector(transverse), plane, atol=1e-12, rtol=0)

        # Phases and a complex unitary mixing alter chosen columns, not their
        # subspace. Signs are included as a special case of the column phases.
        mixed = (transverse * [-1, np.exp(.31j)]) @ (np.array([[1, 1j], [1j, 1]]) / np.sqrt(2))
        np.testing.assert_allclose(projector(-longitudinal * np.exp(.73j)), axis, atol=1e-12, rtol=0)
        np.testing.assert_allclose(projector(mixed), plane, atol=1e-12, rtol=0)


if __name__ == '__main__':
    unittest.main()
