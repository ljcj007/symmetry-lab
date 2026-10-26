"""Independent checks of Phonopy file semantics and displacement conventions."""
from copy import deepcopy
import cmath
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from phonopy_import import run, MAX_BYTES, MAX_NODES


def fixture(natom=1):
    """Small explicit Cartesian basis, not the demo generator's formula."""
    bands = []
    for index in range(3 * natom):
        eigen = [[[float(3 * atom + axis == index), 0] for axis in range(3)] for atom in range(natom)]
        bands.append({'frequency': index + 1.0, 'eigenvector': eigen})
    return {'natom': natom, 'nqpoint': 1, 'lattice': [[2,0,0],[0,3,0],[0,0,4]],
            'points': [{'symbol': f'A{i}', 'coordinates': [0,0,0], 'mass': 1.0} for i in range(natom)],
            'phonon': [{'q-position': [0,0,0], 'band': bands}]}


class PhonopyImportTests(unittest.TestCase):
    def test_demo_import_and_segments(self):
        text = (ROOT / 'dist/data/examples/phonopy-demo.yaml').read_text(encoding='utf8')
        result = run({'content': text, 'filename': 'phonopy-demo.yaml', 'selected_q': 8, 'supercell': [2,1,1]})
        self.assertEqual(result['kind'], 'phonon-data')
        self.assertTrue(result['synthetic'])
        self.assertEqual(result['frequencyUnit'], 'THz')
        self.assertEqual(result['summary']['qpointCount'], 18)
        self.assertEqual(result['summary']['bandCount'], 6)
        self.assertEqual([s['indices'] for s in result['segments']], [list(range(9)), list(range(9,18))])
        self.assertEqual(result['qpoints'][9]['label'], 'M')
        self.assertEqual(result['summary']['imaginaryCount'], 8)
        self.assertTrue(result['animation']['available'])
        self.assertTrue(result['animation']['commensurate'])
        self.assertEqual(len(result['animation']['atoms']), 4)
        json.dumps(result, allow_nan=False)

    def test_demo_eigenvectors_form_unitary_basis(self):
        import yaml
        data = yaml.safe_load((ROOT / 'dist/data/examples/phonopy-demo.yaml').read_text(encoding='utf8'))
        for point in data['phonon']:
            vectors = [[complex(*v) for atom in band['eigenvector'] for v in atom] for band in point['band']]
            for i, u in enumerate(vectors):
                for j, v in enumerate(vectors):
                    overlap = sum(a.conjugate() * b for a, b in zip(u,v))
                    self.assertAlmostEqual(abs(overlap - (1 if i == j else 0)), 0, places=12)

    def test_json_and_yaml_same_semantics(self):
        import yaml
        data = fixture()
        a = run({'content': json.dumps(data)})
        b = run({'content': yaml.safe_dump(data)})
        self.assertEqual(a, b)

    def test_mass_unweighting_keeps_relative_amplitudes(self):
        data = fixture(2)
        data['points'][1]['mass'] = 4
        data['phonon'][0]['band'][0]['eigenvector'] = [[[1/math.sqrt(2),0],[0,0],[0,0]]] * 2
        atoms = run({'data': data, 'amplitude': 0.4})['animation']['atoms']
        self.assertAlmostEqual(atoms[0]['displacement'][0], 0.4)
        self.assertAlmostEqual(atoms[1]['displacement'][0], 0.2)

    def test_complex_eigenvector_and_time_phase_sign(self):
        data = fixture()
        data['phonon'][0]['band'][0]['eigenvector'] = [[[0,1],[0,0],[0,0]]]
        a = run({'data': data, 'phase': 0, 'amplitude': 0.3})['animation']['atoms'][0]
        b = run({'data': data, 'phase': math.pi / 2, 'amplitude': 0.3})['animation']['atoms'][0]
        self.assertAlmostEqual(a['displacement'][0], 0)
        self.assertAlmostEqual(b['displacement'][0], 0.3)

    def test_non_gamma_phase_includes_basis_coordinate_and_cell(self):
        data = fixture()
        data['points'][0]['coordinates'] = [0.5,0,0]
        data['phonon'][0]['q-position'] = [0.5,0,0]
        a = run({'data': data, 'amplitude': 0.3, 'supercell': [2,1,1], 'phase': math.pi/2})['animation']
        self.assertTrue(a['commensurate'])
        self.assertAlmostEqual(a['atoms'][0]['displacement'][0], 0.3)
        self.assertAlmostEqual(a['atoms'][1]['displacement'][0], -0.3)
        self.assertEqual(a['atoms'][0]['equilibrium'], [1,0,0])
        self.assertEqual(a['atoms'][1]['equilibrium'], [3,0,0])
        b = run({'data': data, 'amplitude': 0.3, 'supercell': [2,1,1], 'phase': 0})['animation']
        self.assertAlmostEqual(b['atoms'][0]['displacement'][0], 0)

    def test_noncommensurate_window_is_explicit(self):
        data = fixture()
        data['phonon'][0]['q-position'] = [0.3,0,0]
        r = run({'data': data, 'supercell': [2,1,1]})
        self.assertFalse(r['animation']['commensurate'])
        self.assertTrue(any('有限窗口' in warning for warning in r['warnings']))

    def test_animation_frames_follow_coefficients(self):
        data = fixture()
        data['phonon'][0]['band'][0]['eigenvector'] = [[[0.5,0.5],[0.5,-0.5],[0,0]]]
        r = run({'data': data, 'amplitude': 0.2})['animation']
        for frame in r['frames']:
            for atom, position in zip(r['atoms'], frame['positions']):
                for base, pair, coordinate in zip(atom['equilibrium'], atom['complexDisplacement'], position):
                    expected = base + (complex(*pair) * cmath.exp(-1j * frame['phase'])).real
                    self.assertAlmostEqual(coordinate, expected)

    def test_lattice_rows_and_cartesian_eigenvectors_not_confused(self):
        data = fixture()
        data['lattice'] = [[2,1,0],[0,3,0],[0,0,4]]
        data['points'][0]['coordinates'] = [0.5,0.25,0.25]
        atom = run({'data': data, 'amplitude': 0.2})['animation']['atoms'][0]
        self.assertEqual(atom['equilibrium'], [1,1.25,1])
        self.assertEqual(atom['displacement'], [0.2,0,0])

    def test_missing_animation_inputs_do_not_invent_motion(self):
        for key in ('mass', 'coordinates', 'eigenvector', 'lattice', 'points'):
            data = fixture()
            if key in ('mass', 'coordinates'):
                del data['points'][0][key]
            elif key == 'eigenvector':
                del data['phonon'][0]['band'][0][key]
            else:
                del data[key]
            with self.subTest(key=key):
                result = run({'data': data})
                self.assertEqual(result['summary']['bandCount'], 3)
                self.assertFalse(result['animation']['available'])
                self.assertEqual(result['animation']['frames'], [])
                self.assertTrue(result['animation']['reason'])

    def test_unit_not_guessed_and_explicit_unit_retains_numbers(self):
        data = fixture()
        unknown = run({'data': data, 'frequency_unit': 'unknown'})
        self.assertEqual(unknown['frequencyUnit'], '未声明单位')
        specified = run({'data': data, 'frequency_unit': 'cm^-1'})
        self.assertEqual(specified['frequencyUnit'], 'cm^-1')
        self.assertEqual(specified['qpoints'], unknown['qpoints'])
        data['frequency_unit'] = 'meV'
        self.assertEqual(run({'data': data, 'frequency_unit': 'unknown'})['frequencyUnit'], 'meV')

    def test_imaginary_tolerance_and_negative_frequency_animation(self):
        data = fixture()
        for band, f in zip(data['phonon'][0]['band'], [-0.3, -1e-6, 2e-6]):
            band['frequency'] = f
        r = run({'data': data, 'imaginary_tolerance': 1e-5})
        self.assertEqual(r['summary']['imaginaryCount'], 1)
        self.assertEqual(r['summary']['negativeCount'], 2)
        self.assertEqual(r['summary']['nearZeroCount'], 2)
        self.assertFalse(r['animation']['physicalTrajectory'])
        self.assertTrue(any('真实时间' in message for message in r['warnings']))

    def test_qpoints_are_not_connected_without_declared_path(self):
        data = fixture()
        point = deepcopy(data['phonon'][0])
        point['q-position'] = [0.5,0,0]
        data['phonon'].append(point)
        data['nqpoint'] = 2
        for i, p in enumerate(data['phonon']):
            p['distance'] = i
        self.assertEqual([s['indices'] for s in run({'data': data})['segments']], [[0],[1]])

    def test_structure_only_phonopy_yaml_reports_missing_frequency(self):
        cell = fixture()
        data = {'primitive_cell': {'lattice': cell['lattice'], 'points': cell['points']},
                'force_constants': {'shape': [1,1], 'elements': [[[1,0,0],[0,1,0],[0,0,1]]]}}
        r = run({'data': data, 'filename': 'phonopy.yaml'})
        self.assertEqual(r['kind'], 'structure-only')
        self.assertEqual(r['qpoints'], [])
        self.assertFalse(r['animation']['available'])
        self.assertTrue(any('不从力常数' in warning for warning in r['warnings']))

    def test_optional_empty_inputs_are_ignored(self):
        r = run({'data': fixture(), 'dos_content': '', 'structure_content': '   '})
        self.assertEqual(r['kind'], 'phonon-data')
        self.assertIsNone(r['dos'])

    def test_qpoints_companion_structure_and_reciprocal_check(self):
        data = fixture()
        companion = {'primitive_cell': {'lattice': data.pop('lattice'), 'points': data.pop('points')}}
        data['reciprocal_lattice'] = [[0.5,0,0],[0,1/3,0],[0,0,0.25]]
        r = run({'data': data, 'structure_data': companion})
        self.assertTrue(r['animation']['available'])
        self.assertTrue(r['structure']['supplemented'])
        companion['primitive_cell']['lattice'][0][0] = 3
        with self.assertRaisesRegex(ValueError, 'reciprocal_lattice'):
            run({'data': data, 'structure_data': companion})

    def test_companion_atom_order_and_mass_must_match(self):
        data = fixture(2)
        for key, value in [('symbol','B'), ('mass',4), ('coordinates',[0.1,0,0])]:
            extra = {'primitive_cell': deepcopy(data)}
            extra['primitive_cell']['points'][1][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'data': data, 'structure_data': extra})

    def test_total_dos_preserves_input_integral(self):
        r = run({'dos_content': '# units already chosen\n0 0\n1 2\n2 0\n', 'frequency_unit': 'THz'})
        self.assertEqual(r['kind'], 'dos')
        self.assertEqual(r['dos']['frequency'], [0,1,2])
        self.assertEqual(r['dos']['series'][0]['values'], [0,2,0])
        self.assertEqual(r['dos']['integrals'], [2])
        self.assertEqual(r['qpoints'], [])

    def test_projected_and_xyz_dos_columns_are_explicit(self):
        r = run({'data': fixture(2), 'dos_content': '0 1 2\n1 2 3', 'dos_kind': 'projected'})
        self.assertEqual(len(r['dos']['series']), 2)
        r = run({'data': fixture(2), 'dos_content': '0 1 2 3 4 5 6\n1 2 3 4 5 6 7', 'dos_kind': 'xyz'})
        self.assertEqual([s['label'] for s in r['dos']['series']], ['A0 1 x','A0 1 y','A0 1 z','A1 2 x','A1 2 y','A1 2 z'])
        with self.assertRaisesRegex(ValueError, 'XYZ_PROJECTION'):
            run({'data': fixture(2), 'dos_content': '0 1 2 3 4 5 6', 'dos_kind': 'projected'})

    def test_invalid_dos_inputs(self):
        for content in ['0 1\n1 2 3', '0 -1\n1 2', '1 1\n0 2', '0 nan', '# no data', '0 1 2']:
            with self.subTest(content=content), self.assertRaises(ValueError):
                run({'dos_content': content})

    def test_yaml_code_tags_and_aliases_rejected(self):
        for content in ['!!python/object/apply:os.system ["echo injected"]',
                        'a: &a [1,2,3]\nb: *a', 'a: &a [*a]']:
            with self.subTest(content=content), self.assertRaises(ValueError):
                run({'content': content})

    def test_input_size_depth_cycle_and_nonfinite_limits(self):
        with self.assertRaisesRegex(ValueError, '8 MiB'):
            run({'content': 'a' * (MAX_BYTES + 1)})
        with self.assertRaisesRegex(ValueError, '嵌套'):
            run({'content': 'a: ' + '[' * 40 + '0' + ']' * 40})
        cyclic = {}; cyclic['loop'] = cyclic
        with self.assertRaisesRegex(ValueError, '循环'):
            run({'data': cyclic})
        data = fixture(); data['phonon'][0]['band'][0]['frequency'] = math.nan
        with self.assertRaises(ValueError):
            run({'data': data})
        data['phonon'][0]['band'][0]['frequency'] = 10 ** 1000
        with self.assertRaises(ValueError):
            run({'data': data})

    def test_invalid_metadata_and_missing_frequency(self):
        mutations = [lambda d: d.update(natom=2), lambda d: d.update(nqpoint=2),
                     lambda d: d.update(segment_nqpoint=[2]),
                     lambda d: d['phonon'][0]['band'][0].pop('frequency'),
                     lambda d: d['phonon'][0]['band'].pop(),
                     lambda d: d['phonon'][0]['band'][0].update(eigenvector=[[[1,0],[1,0]]]),
                     lambda d: d.update(lattice=[[0,0,0],[0,1,0],[0,0,1]]),
                     lambda d: d['points'][0].update(mass=0)]
        for index, mutation in enumerate(mutations):
            data = fixture(); mutation(data)
            with self.subTest(index=index), self.assertRaises(ValueError):
                run({'data': data})

    def test_invalid_selection_and_amplitude(self):
        for params in [{'selected_q': 1}, {'selected_band': -1}, {'selected_band': 3},
                       {'amplitude': True}, {'amplitude': -1}, {'phase': math.inf}, {'supercell': [5,1,1]}]:
            with self.subTest(params=params), self.assertRaises(ValueError):
                run({'data': fixture(), **params})

    def test_q_mode_node_and_render_limits(self):
        data = fixture()
        for band in data['phonon'][0]['band']:
            band.pop('eigenvector')
        data['phonon'] = data['phonon'] * 2001
        data['nqpoint'] = 2001
        with self.assertRaisesRegex(ValueError, '2000'):
            run({'data': data})
        point = {'q-position': [0,0,0], 'band': [{'frequency': 1}] * 384}
        with self.assertRaisesRegex(ValueError, '60000'):
            run({'data': {'natom': 128, 'phonon': [point] * 157}})
        with self.assertRaisesRegex(ValueError, '节点'):
            run({'data': {'a': [0] * MAX_NODES}})
        result = run({'data': fixture(9), 'supercell': [4,4,4]})
        self.assertFalse(result['animation']['available'])
        self.assertIn('512', result['animation']['reason'])

    def test_unrecognized_documents_fail_helpfully(self):
        for data in [{}, {'thermal_properties': []}, ['no root mapping']]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                run({'data': data})


if __name__ == '__main__':
    unittest.main()
