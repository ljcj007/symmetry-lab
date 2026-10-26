"""Independent Gamma characters, physical displacement, and export checks."""
import copy
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from phonon_modes import run, preset_data


def unpack(bands):
    return np.column_stack([np.array(band['eigenvector']).view(np.complex128).reshape(-1) for band in bands])


def replace_vectors(data, matrix):
    for i, band in enumerate(data['phonon'][0]['band']):
        band['eigenvector'] = [[[float(z.real), float(z.imag)] for z in row]
                             for row in matrix[:, i].reshape(-1, 3)]


class PhononModesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.results = {preset: run({'preset': preset}) for preset in ('silicon', 'gaas', 'nacl')}

    def test_known_gamma_labels(self):
        for preset, expected in {'silicon': ['T1u', 'T2g'], 'gaas': ['T2', 'T2'], 'nacl': ['T1u', 'T1u']}.items():
            result = self.results[preset]
            self.assertEqual([g['classification']['label'] for g in result['modeGroups']], expected)
            self.assertTrue(all(g['classification']['status'] == 'classified' for g in result['modeGroups']))
            self.assertEqual([g['dimension'] for g in result['modeGroups']], [3, 3])
            self.assertEqual(result['symmetry']['operationCount'], 24 if preset == 'gaas' else 48)
            self.assertTrue(result['synthetic'])

    def test_independent_silicon_characters(self):
        # O_h order is E,8C3,6C2(edge),6C4,3C2(axis),i,8S6,6sigma(d),6S4,3sigma(h).
        expected = [[3, 0, -1, 1, -1, -3, 0, 1, -1, 1],
                    [3, 0, 1, -1, -1, 3, 0, 1, -1, -1]]
        for group, row in zip(self.results['silicon']['modeGroups'], expected):
            chars = group['classification']['characters']
            np.testing.assert_allclose([c['real'] for c in chars], row, atol=1e-12)
            np.testing.assert_allclose([c['imag'] for c in chars], 0, atol=1e-12)
            self.assertEqual(sum(c['size'] for c in chars), 48)

    def test_complex_unitary_rotation_within_degeneracy_preserves_characters(self):
        data = preset_data('silicon')
        original = unpack(data['phonon'][0]['band'])
        # Three-dimensional DFT is complex unitary, not just a permutation.
        unitary = np.exp(2j * math.pi * np.outer(np.arange(3), np.arange(3)) / 3) / math.sqrt(3)
        original[:, :3] = original[:, :3] @ unitary
        original[:, 3:] = original[:, 3:] @ unitary
        replace_vectors(data, original)
        result = run({'data': data})
        for left, right in zip(result['modeGroups'], self.results['silicon']['modeGroups']):
            self.assertEqual(left['classification']['label'], right['classification']['label'])
            np.testing.assert_allclose([c['real'] for c in left['classification']['characters']],
                                       [c['real'] for c in right['classification']['characters']], atol=1e-12)

    def test_rotation_of_cartesian_frame_preserves_cubic_classification(self):
        data = preset_data('silicon')
        angle = .37
        rotation = np.array([[math.cos(angle), -math.sin(angle), 0],
                             [math.sin(angle), math.cos(angle), 0], [0, 0, 1]])
        data['lattice'] = (np.array(data['lattice']) @ rotation.T).tolist()
        vectors = unpack(data['phonon'][0]['band']).reshape(2, 3, 6)
        replace_vectors(data, np.einsum('ij,njk->nik', rotation, vectors).reshape(6, 6))
        result = run({'data': data})
        self.assertEqual([g['classification']['label'] for g in result['modeGroups']], ['T1u', 'T2g'])

    def test_atom_permutation_preserves_labels_and_mass_weighting(self):
        data = preset_data('gaas')
        data['points'].reverse()
        for band in data['phonon'][0]['band']:
            band['eigenvector'].reverse()
        result = run({'data': data, 'selected_band': 3})
        self.assertEqual([g['classification']['label'] for g in result['modeGroups']], ['T2', 'T2'])
        atoms = result['frozen']['atoms']
        self.assertEqual([a['symbol'] for a in atoms], ['As', 'Ga'])
        np.testing.assert_allclose(sum(a['mass'] * np.array(a['displacement']) for a in atoms), 0, atol=1e-12)

    def test_acoustic_equal_physical_displacements_and_optical_zero_com(self):
        acoustic = run({'preset': 'gaas', 'selected_band': 0})['frozen']['atoms']
        np.testing.assert_allclose(acoustic[0]['displacement'], acoustic[1]['displacement'], atol=1e-12)
        optical = self.results['gaas']['frozen']['atoms']
        np.testing.assert_allclose(sum(a['mass'] * np.array(a['displacement']) for a in optical), 0, atol=1e-12)
        ratio = abs(optical[0]['displacement'][0] / optical[1]['displacement'][0])
        self.assertAlmostEqual(ratio, 74.9216 / 69.723)

    def test_single_split_degenerate_vector_not_mislabeled(self):
        data = preset_data('silicon')
        data['phonon'][0]['band'][3]['frequency'] += .01
        result = run({'data': data})
        optical = result['modeGroups'][1:]
        self.assertEqual(len(optical), 2)
        self.assertTrue(all(g['classification']['status'] == 'not-invariant' for g in optical))
        self.assertTrue(all(g['classification']['label'] is None for g in optical))
        recovered = run({'data': data, 'frequency_tolerance': .02})
        self.assertEqual(recovered['modeGroups'][1]['classification']['label'], 'T2g')

    def test_accidental_degeneracy_is_reducible_not_forced_single_irrep(self):
        data = preset_data('silicon')
        for band in data['phonon'][0]['band']:
            band['frequency'] = 0
        result = run({'data': data})
        group = result['modeGroups'][0]
        self.assertEqual(group['dimension'], 6)
        self.assertEqual({x['irrep'] for x in group['classification']['decomposition']}, {'T1u', 'T2g'})

    def test_missing_member_of_degenerate_space_not_labeled(self):
        data = preset_data('silicon')
        del data['phonon'][0]['band'][5]['eigenvector']
        group = run({'data': data})['modeGroups'][1]
        self.assertEqual(group['classification']['status'], 'unavailable')
        self.assertIn('缺少', group['classification']['reason'])

    def test_linearly_dependent_eigenvectors_not_labeled(self):
        data = preset_data('silicon')
        data['phonon'][0]['band'][4]['eigenvector'] = copy.deepcopy(data['phonon'][0]['band'][3]['eigenvector'])
        group = run({'data': data})['modeGroups'][1]
        self.assertEqual(group['classification']['status'], 'unavailable')
        self.assertIn('线性相关', group['classification']['reason'])

    def test_duplicated_subspace_across_different_frequencies_not_labeled(self):
        data = preset_data()
        for i in range(3):
            data['phonon'][0]['band'][i + 3]['eigenvector'] = copy.deepcopy(data['phonon'][0]['band'][i]['eigenvector'])
        result = run({'data': data})
        self.assertTrue(all(g['classification']['label'] is None for g in result['modeGroups']))
        self.assertTrue(all('线性相关' in g['classification']['reason'] for g in result['modeGroups']))

    def test_different_frequency_subspaces_must_be_orthogonal(self):
        data = preset_data()
        vectors = unpack(data['phonon'][0]['band'])
        vectors[:, 3] += .1 * vectors[:, 0]
        replace_vectors(data, vectors)
        result = run({'data': data})
        self.assertTrue(all('不正交' in g['classification']['reason'] for g in result['modeGroups']))

    def test_finite_q_alternation_and_position_gauge(self):
        data = preset_data('silicon')
        data['phonon'][0]['q-position'] = [.5, 0, 0]
        result = run({'data': data, 'selected_band': 3, 'supercell': [2, 1, 1]})
        atoms = result['frozen']['atoms']
        np.testing.assert_allclose(atoms[0]['displacement'], -np.array(atoms[2]['displacement']), atol=1e-12)
        # Second atom has spatial phase 2*pi*(.5*.25) = pi/4.
        self.assertAlmostEqual(atoms[1]['displacement'][0], -.1 * math.cos(math.pi / 4))
        self.assertEqual(len(atoms), 4)
        self.assertIsNone(result['modeGroups'][0]['classification']['label'])
        self.assertTrue(result['frozen']['commensurate'])

    def test_incommensurate_supercell_rejected(self):
        data = preset_data()
        data['phonon'][0]['q-position'] = [1 / 3, 0, 0]
        with self.assertRaisesRegex(ValueError, '不相容'):
            run({'data': data, 'supercell': [2, 1, 1]})
        self.assertEqual(len(run({'data': data, 'supercell': [3, 1, 1]})['frozen']['atoms']), 6)

    def test_reciprocal_equivalent_gamma_gauge(self):
        data = preset_data()
        data['phonon'][0]['q-position'] = [1, 0, 0]
        vectors = unpack(data['phonon'][0]['band']).reshape(2, 3, 6)
        for i, atom in enumerate(data['points']):
            vectors[i] *= np.exp(-2j * math.pi * atom['coordinates'][0])
        replace_vectors(data, vectors.reshape(6, 6))
        result = run({'data': data, 'selected_band': 3})
        self.assertEqual([g['classification']['label'] for g in result['modeGroups']], ['T1u', 'T2g'])
        np.testing.assert_allclose([a['displacement'] for a in result['frozen']['atoms']],
                                   [a['displacement'] for a in self.results['silicon']['frozen']['atoms']], atol=1e-12)

    def test_normalization_independent_of_eigenvector_scale(self):
        data = preset_data()
        replace_vectors(data, unpack(data['phonon'][0]['band']) * 7)
        result = run({'data': data, 'selected_band': 3})
        self.assertAlmostEqual(result['frozen']['eigenvectorNorm'], 7)
        np.testing.assert_allclose([a['position'] for a in result['frozen']['atoms']],
                                   [a['position'] for a in self.results['silicon']['frozen']['atoms']])

    def test_phase_and_zero_amplitude(self):
        result = run({'phase': math.pi / 2})
        self.assertLess(result['frozen']['maxDisplacement'], 1e-12)
        result = run({'amplitude': 0})
        for atom in result['frozen']['atoms']:
            self.assertEqual(atom['equilibrium'], atom['position'])

    def test_poscar_roundtrip_metric_and_grouped_species(self):
        result = run({'preset': 'gaas', 'supercell': [2, 1, 1]})
        lines = result['exports']['poscar'].splitlines()
        lattice = np.array([[float(x) for x in line.split()] for line in lines[2:5]])
        np.testing.assert_allclose(lattice, result['frozen']['lattice'], atol=1e-11)
        self.assertEqual(lines[5], 'Ga As')
        self.assertEqual(lines[6], '2 2')
        self.assertEqual(lines[7], 'Direct')
        for line, atom_id in zip(lines[8:], result['exports']['poscarAtomOrder']):
            fractional = np.array([float(x) for x in line.split()])
            atom = result['frozen']['atoms'][atom_id]
            np.testing.assert_allclose(fractional, atom['fractional'], atol=1e-11)
            difference = (fractional @ lattice - np.array(atom['position'])) @ np.linalg.inv(lattice)
            np.testing.assert_allclose(difference, np.rint(difference), atol=1e-11)

    def test_cif_is_explicit_p1_and_correct_atom_count(self):
        cif = self.results['silicon']['exports']['cif']
        self.assertIn("_symmetry_space_group_name_H-M 'P 1'", cif)
        self.assertIn('_symmetry_Int_Tables_number 1', cif)
        atom_lines = [line for line in cif.splitlines() if line.startswith(('Si1 ', 'Si2 '))]
        self.assertEqual(len(atom_lines), 2)

    def test_placeholder_or_isotope_alias_is_not_exported_as_an_element(self):
        for symbol in ('Xx', 'A', 'Q', 'D', 'T'):
            data = preset_data()
            for atom in data['points']:
                atom['symbol'] = symbol
            result = run({'data': data})
            self.assertTrue(result['frozen']['available'])
            self.assertIsNone(result['exports']['poscar'])
            self.assertIsNone(result['exports']['cif'])
            self.assertIn('真实元素', result['exports']['reason'])

    def test_left_handed_cell_export_preserves_chirality(self):
        data = {'natom': 4, 'physical_unit': {'length': 'angstrom'},
                'lattice': [[-4, 0, 0], [0, 5, 0], [0, 0, 6]],
                'points': [{'symbol': s, 'mass': m, 'coordinates': p} for s, m, p in [
                    ('H', 1, [.1, .1, .1]), ('C', 12, [.2, .1, .1]),
                    ('N', 14, [.1, .3, .1]), ('O', 16, [.1, .1, .4])]],
                'phonon': [{'q-position': [0, 0, 0], 'band': []}]}
        for i in range(12):
            data['phonon'][0]['band'].append({'frequency': 0, 'eigenvector': [
                [[int(i == 3 * atom + axis), 0] for axis in range(3)] for atom in range(4)]})
        result = run({'data': data, 'amplitude': 0})
        self.assertTrue(result['exports']['basisHandednessCorrected'])
        self.assertLess(np.linalg.det(result['frozen']['lattice']), 0)
        lines = result['exports']['poscar'].splitlines()
        lattice = np.array([[float(x) for x in row.split()] for row in lines[2:5]])
        self.assertGreater(np.linalg.det(lattice), 0)
        fractions = np.array([[float(x) for x in row.split()] for row in lines[8:]])
        deltas = fractions[1:] - fractions[0]
        deltas -= np.rint(deltas)
        original = np.array([a['position'] for a in result['frozen']['atoms']])
        expected_volume = np.linalg.det(original[1:] - original[0])
        self.assertLess(expected_volume, 0)
        self.assertAlmostEqual(np.linalg.det(deltas @ lattice), expected_volume)
        # This orthogonal right-handed CIF has the same lengths and angles;
        # its standard Cartesian reconstruction must keep the signed volume.
        cif_atoms = [row for row in result['exports']['cif'].splitlines()
                     if row.startswith(('H1 ', 'C2 ', 'N3 ', 'O4 '))]
        cf = np.array([[float(x) for x in row.split()[2:5]] for row in cif_atoms])
        cd = cf[1:] - cf[0]
        cd -= np.rint(cd)
        self.assertAlmostEqual(np.linalg.det(cd @ np.diag([4, 5, 6])), expected_volume)

    def test_unknown_length_unit_does_not_export_angstroms(self):
        data = preset_data()
        del data['physical_unit']
        result = run({'data': data})
        self.assertIsNone(result['exports']['poscar'])
        self.assertIsNone(result['exports']['cif'])
        confirmed = run({'data': data, 'length_unit': 'angstrom'})
        self.assertIsInstance(confirmed['exports']['poscar'], str)

    def test_bohr_conversion_changes_lattice_not_fractional_coordinates(self):
        result = run({'length_unit': 'bohr'})
        rows = result['exports']['poscar'].splitlines()[2:5]
        lattice = np.array([[float(x) for x in row.split()] for row in rows])
        np.testing.assert_allclose(lattice, np.array(result['frozen']['lattice']) * .529177210903, atol=1e-11)

    def test_companion_structure_and_json_text(self):
        full = preset_data()
        data = {'natom': 2, 'phonon': full['phonon'], 'frequency_unit': 'THz'}
        result = run({'content': json.dumps(data), 'structure_data': full})
        self.assertEqual(result['modeGroups'][1]['classification']['label'], 'T2g')
        self.assertIsInstance(result['exports']['poscar'], str)

    def test_yaml_input_and_missing_metadata(self):
        import yaml
        result = run({'content': yaml.safe_dump(preset_data())})
        self.assertEqual(result['modeGroups'][1]['classification']['label'], 'T2g')
        data = preset_data()
        del data['points'][0]['mass']
        with self.assertRaisesRegex(ValueError, 'mass'):
            run({'data': data})

    def test_single_atom_default_band_and_other_point_group_character_scope(self):
        data = {'natom': 1, 'lattice': [[2, 0, 0], [0, 3, 0], [0, 0, 4]],
                'points': [{'symbol': 'Si', 'mass': 28, 'coordinates': [0, 0, 0]}],
                'phonon': [{'q-position': [0, 0, 0], 'band': [
                    {'frequency': 0, 'eigenvector': [[[int(i == j), 0] for j in range(3)]]} for i in range(3)]}]}
        result = run({'data': data})
        self.assertEqual(result['selection']['bandIndex'], 0)
        self.assertEqual(result['symmetry']['pointGroup'], 'mmm')
        self.assertEqual(result['modeGroups'][0]['classification']['status'], 'characters-only')
        self.assertIsNone(result['modeGroups'][0]['classification']['label'])
        self.assertEqual(len(result['modeGroups'][0]['classification']['operationCharacters']), 8)

    def test_invalid_capacity_and_parameters(self):
        for params in ({'supercell': [8, 8, 8]}, {'supercell': [0, 1, 1]}, {'supercell': [True, 1, 1]},
                       {'amplitude': -1}, {'amplitude': float('nan')}, {'phase': float('inf')},
                       {'frequency_tolerance': -1}, {'symprec': 0}, {'preset': 'fake'}):
            with self.subTest(params=params), self.assertRaises(ValueError):
                run(params)
        with self.assertRaises(ValueError):
            run([])

    def test_capacity_exact_boundary_and_atom_limit(self):
        result = run({'supercell': [8, 8, 4]})
        self.assertEqual(len(result['frozen']['atoms']), 512)
        data = {'natom': 65, 'lattice': np.eye(3).tolist(),
                'points': [{'symbol': 'Si', 'mass': 28, 'coordinates': [i / 65, 0, 0]} for i in range(65)],
                'phonon': [{'q-position': [0, 0, 0], 'band': [{'frequency': 0} for _ in range(195)]}]}
        with self.assertRaisesRegex(ValueError, '64'):
            run({'data': data})

    def test_nonprimitive_folded_cell_does_not_get_primitive_gamma_labels(self):
        data = preset_data()
        data['lattice'] = np.eye(3).tolist()
        data['points'][1]['coordinates'] = [.5, .5, .5]
        result = run({'data': data})
        self.assertFalse(result['symmetry']['primitiveCell'])
        self.assertTrue(all(g['classification']['label'] is None for g in result['modeGroups']))
        self.assertTrue(all('不是原胞' in g['classification']['reason'] for g in result['modeGroups']))

    def test_isotope_masses_are_not_permuted_as_same_species(self):
        data = preset_data()
        data['points'][1]['mass'] = 29
        result = run({'data': data})
        self.assertEqual(result['symmetry']['pointGroup'], '-43m')
        self.assertEqual(result['symmetry']['operationCount'], 24)
        self.assertTrue(result['symmetry']['massSensitive'])

    def test_missing_selected_vector_and_zero_vector_rejected(self):
        data = preset_data()
        del data['phonon'][0]['band'][0]['eigenvector']
        with self.assertRaisesRegex(ValueError, 'eigenvector'):
            run({'data': data})
        data['phonon'][0]['band'][0]['eigenvector'] = [[[0, 0] for _ in range(3)] for _ in range(2)]
        with self.assertRaisesRegex(ValueError, '零'):
            run({'data': data})

    def test_json_serialization_all_outputs(self):
        for result in self.results.values():
            self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)


if __name__ == '__main__':
    unittest.main()
