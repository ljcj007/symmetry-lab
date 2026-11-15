"""Independent real-data checks; not a Phonopy installation or DFT rerun."""
from pathlib import Path
import copy
import gzip
import hashlib
import json
import math
import struct
import sys
import types
import unittest

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run
import phonopy_import

BASE = ROOT / 'dist/data/examples'
RAW = (BASE / 'phonopy-zno-qpoints.yaml').read_bytes()
COMPANION = (BASE / 'phonopy-zno-structure.yaml').read_bytes()
DATA = yaml.safe_load(RAW)
STRUCTURE = yaml.safe_load(COMPANION)['primitive_cell']
META = json.loads((BASE / 'phonopy-zno-source.json').read_text(encoding='utf8'))
REQUEST = {'filename': META['localFile'], 'content': RAW.decode('utf8'),
           'structure_content': COMPANION.decode('utf8'), 'frequency_unit': 'THz',
           'selected_q': 2, 'selected_band': 10, 'amplitude': .2,
           'phase': .37, 'supercell': [4, 1, 4]}


def complex_vector(band):
    values = np.asarray(band['eigenvector'], dtype=float)
    return values[:, :, 0] + 1j * values[:, :, 1]


def physical_displacement(atom, eigen, phase, amplitude=.2):
    index = atom['atomIndex']
    mass = np.array([p['mass'] for p in STRUCTURE['points']])
    physical = eigen / np.sqrt(mass[:, None])
    maximum = np.max(np.linalg.norm(physical, axis=1))
    fractional = np.array(atom['cell']) + STRUCTURE['points'][index]['coordinates']
    angle = 2 * math.pi * np.dot(DATA['phonon'][2]['q-position'], fractional) - phase
    # Direct cos/sin contraction independently checks the complex exponential.
    return amplitude * (physical[index].real * math.cos(angle)
                        - physical[index].imag * math.sin(angle)) / maximum


class ZnOExample(unittest.TestCase):
    def test_original_bytes_generation_conditions_and_full_license(self):
        self.assertEqual(hashlib.sha256(RAW).hexdigest(), META['sha256'])
        self.assertEqual(len(RAW), 55277)
        self.assertEqual(RAW.count(b'\r\n'), 983)
        self.assertEqual(RAW.count(b'\n'), 983)
        for item in META['inputs']:
            raw = (BASE / item['localFile']).read_bytes()
            self.assertEqual(len(raw), item['bytes'])
            self.assertEqual(hashlib.sha256(raw).hexdigest(), item['sha256'])
            self.assertIn(META['commit'], item['url'])
        license_raw = (BASE / META['licenseFile']).read_bytes()
        self.assertEqual(hashlib.sha256(license_raw).hexdigest(), META['licenseSha256'])
        for clause in ('Copyright (c) 2014-2024, Phonopy.', 'Neither the name of the phonopy project',
                       'THIS SOFTWARE IS PROVIDED', 'LIABILITY'):
            self.assertIn(clause, license_raw.decode('utf8'))
        self.assertEqual(META['generator']['versions']['phonopy'], '4.10.0')
        self.assertFalse(META['generator']['settings']['is_nac'])
        self.assertTrue(META['generator']['settings']['symmetrize_fc'])
        self.assertFalse(next(x for x in META['inputs'] if x['path'].endswith('/BORN'))['usedForGeneration'])
        self.assertIsNone(META['frequencyUnitInQpoints'])
        self.assertEqual(META['counts']['pathSegments'], 0)

    def test_all_48_eigenpairs_complete_bases_and_serialization_precision(self):
        residuals = []
        for point in DATA['phonon']:
            values = np.array(point['dynamical_matrix'], dtype=float).reshape(12, 12, 2)
            dynamical = values[:, :, 0] + 1j * values[:, :, 1]
            self.assertLess(np.linalg.norm(dynamical - dynamical.conj().T), 1e-12)
            columns = np.column_stack([complex_vector(b).reshape(12) for b in point['band']])
            self.assertLess(np.linalg.norm(columns.conj().T @ columns - np.eye(12)), 1e-12)
            for band, vector in zip(point['band'], columns.T):
                frequency = band['frequency']
                eigenvalue = np.sign(frequency) * (frequency / 15.633302300230191) ** 2
                residuals.append(float(np.linalg.norm(dynamical @ vector - eigenvalue * vector)))
        self.assertEqual(len(residuals), 48)
        self.assertLess(max(residuals), 1e-8, 'Native writer prints finite decimal precision')
        selected = complex_vector(DATA['phonon'][2]['band'][10]).reshape(12)
        invariant = np.max(np.abs(np.imag(selected[:, None] * selected[None, :].conj())))
        self.assertAlmostEqual(float(invariant), .2126498074227134, places=12)
        shifted = selected * np.exp(.73j)
        self.assertAlmostEqual(float(np.max(np.abs(np.imag(shifted[:, None] * shifted[None, :].conj())))),
                               float(invariant), places=14)
        frequencies = [b['frequency'] for b in DATA['phonon'][2]['band']]
        self.assertGreater(min(abs(frequencies[10] - f) for i, f in enumerate(frequencies) if i != 10), .14)

    def test_public_api_preserves_all_frequencies_vectors_units_and_paired_identity(self):
        result = run('phonopy', copy.deepcopy(REQUEST))
        self.assertEqual(result['summary']['qpointCount'], 4)
        self.assertEqual(result['summary']['bandCount'], 12)
        self.assertEqual(result['summary']['eigenvectorCount'], 48)
        self.assertEqual(len(result['segments']), 4)
        self.assertTrue(all(len(s['indices']) == 1 for s in result['segments']))
        self.assertEqual(result['structure']['natom'], 4)
        self.assertEqual([a['symbol'] for a in result['structure']['atoms']], ['Zn', 'Zn', 'O', 'O'])
        self.assertEqual([a['mass'] for a in result['structure']['atoms']], [65.38, 65.38, 15.9994, 15.9994])
        for parsed, original in zip(result['qpoints'], DATA['phonon']):
            self.assertEqual(parsed['q'], original['q-position'])
            self.assertEqual(parsed['frequencies'], [b['frequency'] for b in original['band']])
        self.assertEqual(result['selection']['eigenvector'], DATA['phonon'][2]['band'][10]['eigenvector'])
        self.assertEqual(result['frequencyUnitSource'], 'user.frequency_unit')
        self.assertEqual(result['structure']['lengthUnitSource'], 'companion.physical_unit.length')
        identity = result['sourceIdentity']
        self.assertEqual(identity['sha256'], META['sha256'])
        self.assertEqual(identity['reference']['kind'], 'derived-phonopy-output-from-official-force-data')
        self.assertTrue(identity['reference']['companion']['matchesPinnedSource'])
        self.assertEqual(identity['reference']['companion']['actualSha256'], META['companion']['sha256'])
        unknown = run('phonopy', {**REQUEST, 'frequency_unit': 'unknown'})
        self.assertEqual(unknown['frequencyUnit'], '未声明单位')
        self.assertEqual(unknown['qpoints'], result['qpoints'])
        self.assertFalse(result['animation']['physicalTrajectory'])

    def test_mass_unweighting_basis_phase_and_all_1024_frame_positions(self):
        result = run('phonopy', copy.deepcopy(REQUEST))
        animation = result['animation']
        eigen = complex_vector(DATA['phonon'][2]['band'][10])
        self.assertTrue(animation['commensurate'])
        self.assertEqual(len(animation['atoms']), 64)
        for atom in animation['atoms']:
            self.assertLess(np.max(np.abs(np.array(atom['displacement'])
                                         - physical_displacement(atom, eigen, .37))), 1e-12)
        for frame in animation['frames']:
            for atom, actual in zip(animation['atoms'], frame['positions']):
                expected = np.array(atom['equilibrium']) + physical_displacement(atom, eigen, frame['phase'])
                self.assertLess(np.max(np.abs(actual - expected)), 1e-12)
        self.assertEqual(len(animation['frames']), 16)
        # A common normalization cannot erase the different inverse mass factors.
        weighted = eigen / np.sqrt(np.array([65.38, 65.38, 15.9994, 15.9994])[:, None])
        wrong = eigen / np.sqrt(65.38)
        weighted /= np.max(np.linalg.norm(weighted, axis=1))
        wrong /= np.max(np.linalg.norm(wrong, axis=1))
        self.assertGreater(np.linalg.norm(weighted - wrong), .05)

    def test_frozen_periodic_snapshot_all_coordinates_and_unsupported_labels(self):
        result = run('phonon_modes', copy.deepcopy(REQUEST))
        self.assertEqual(result['sourceIdentity'], run('phonopy', REQUEST)['sourceIdentity'])
        self.assertTrue(result['frozen']['commensurate'])
        self.assertEqual(len(result['frozen']['atoms']), 64)
        self.assertEqual(result['symmetry']['spaceGroup'], 186)
        self.assertEqual(result['symmetry']['pointGroup'], '6mm')
        self.assertTrue(all(g['classification']['status'] == 'unavailable' for g in result['modeGroups']))
        lattice = np.array(STRUCTURE['lattice']) * np.array([4, 1, 4])[:, None]
        inverse = np.linalg.inv(lattice)
        eigen = complex_vector(DATA['phonon'][2]['band'][10])
        expected = []
        for atom in result['frozen']['atoms']:
            position = np.array(atom['equilibrium']) + physical_displacement(atom, eigen, .37)
            fractional = (position @ inverse) % 1
            fractional[np.abs(fractional - 1) < 1e-12] = 0
            expected.append(fractional)
            self.assertLess(np.max(np.abs(atom['position'] - position)), 1e-12)
        lines = result['exports']['poscar'].splitlines()
        self.assertEqual(lines[5:8], ['Zn O', '32 32', 'Direct'])
        self.assertLess(np.max(np.abs(np.array([list(map(float, line.split())) for line in lines[2:5]])
                                     - lattice)), 1e-12)
        for actual, index in zip(lines[8:], result['exports']['poscarAtomOrder']):
            self.assertLess(np.max(np.abs(np.array(list(map(float, actual.split()))) - expected[index])), 1e-12)
        cif = result['exports']['cif'].splitlines()
        self.assertIn("_symmetry_space_group_name_H-M 'P 1'", cif)
        first = cif.index('_atom_site_occupancy') + 1
        self.assertEqual(len(cif[first:]), 64)
        for row, target in zip(cif[first:], expected):
            self.assertLess(np.max(np.abs(np.array(list(map(float, row.split()[2:5]))) - target)), 1e-12)
        with self.assertRaisesRegex(ValueError, 'q 与所选超胞不相容'):
            run('phonon_modes', {**REQUEST, 'supercell': [3, 1, 4]})
        gamma = run('phonon_modes', {**REQUEST, 'selected_q': 0, 'selected_band': 3, 'supercell': [1, 1, 1]})
        self.assertTrue(all(g['classification']['status'] == 'characters-only' for g in gamma['modeGroups']))
        self.assertTrue(all(g['classification']['invarianceError'] < 1e-5 for g in gamma['modeGroups']))

    def test_actual_input_precedence_and_byte_identity_are_not_material_guesses(self):
        for content in (REQUEST['content'] + ' ', REQUEST['content'].replace('\r\n', '\n')):
            result = run('phonopy', {**REQUEST, 'content': content})
            self.assertNotIn('reference', result['sourceIdentity'])
        modified = run('phonopy', {**REQUEST, 'structure_content': REQUEST['structure_content'] + ' '})
        extra = modified['sourceIdentity']['reference']['companion']
        self.assertFalse(extra['matchesPinnedSource'])
        self.assertNotEqual(extra['actualSha256'], extra['expectedSha256'])
        object_companion = run('phonopy', {**REQUEST, 'structure_data': yaml.safe_load(COMPANION)})
        extra = object_companion['sourceIdentity']['reference']['companion']
        self.assertEqual(extra['representation'], 'canonical-json-object-not-original-file')
        self.assertFalse(extra['matchesPinnedSource'], 'Ignored matching text cannot certify a supplied object')
        object_primary = run('phonopy', {**REQUEST, 'data': DATA})
        self.assertNotIn('reference', object_primary['sourceIdentity'])
        self.assertEqual(object_primary['sourceIdentity']['representation'], 'canonical-json-object-not-original-file')
        missing = run('phonopy', {k: v for k, v in REQUEST.items() if k != 'structure_content'})
        self.assertFalse(missing['sourceIdentity']['reference']['companion']['matchesPinnedSource'])
        self.assertFalse(missing['animation']['available'])

    def test_historical_same_host_old_fields_and_values_are_exact(self):
        raw = gzip.decompress((ROOT / 'scripts/fixtures/phonopy-source-baseline.py.gz').read_bytes())
        self.assertEqual(hashlib.sha256(raw).hexdigest(), '78613ddd022e3d9e81dee41232dbc2b58fb585ffe909c570983754f20bbd806a')
        baseline = types.ModuleType('phonopy_import_historical')
        exec(compile(raw.decode('utf8'), 'immutable-phonopy-source-baseline.py', 'exec'), baseline.__dict__)
        demo = (BASE / 'phonopy-demo.yaml').read_text(encoding='utf8')
        al = (BASE / 'phonopy-al-abacus-band.yaml').read_text(encoding='utf8')
        structure = (BASE / 'phonopy-al-abacus-structure.yaml').read_text(encoding='utf8')
        requests = [
            {'content': demo}, {'content': demo, 'frequency_unit': 'THz', 'selected_q': 5, 'selected_band': 4},
            {'data': yaml.safe_load(demo)}, {'data': yaml.safe_load(demo), 'content': al},
            {'content': al}, {'content': al, 'frequency_unit': 'THz', 'selected_q': 66, 'selected_band': 1},
            {'content': al, 'structure_content': structure, 'frequency_unit': 'THz', 'phase': .37},
            {'content': al, 'structure_data': yaml.safe_load(structure), 'supercell': [2, 2, 1]},
            {'content': structure, 'filename': 'phonopy.yaml'},
            {'dos_content': '0 0\n1 2\n2 0\n', 'frequency_unit': 'THz'},
            {'content': demo, 'structure_content': '   ', 'dos_content': ''},
        ]
        counts = {'numeric': 0, 'other': 0}
        def exact(old, new):
            self.assertIs(type(new), type(old))
            if isinstance(old, dict):
                self.assertEqual(set(new), set(old))
                for key in old: exact(old[key], new[key])
            elif isinstance(old, list):
                self.assertEqual(len(new), len(old))
                for a, b in zip(old, new): exact(a, b)
            elif isinstance(old, float):
                self.assertEqual(struct.pack('!d', new), struct.pack('!d', old))
                counts['numeric'] += 1
            else:
                self.assertEqual(new, old)
                counts['numeric' if isinstance(old, int) and not isinstance(old, bool) else 'other'] += 1
        for request in requests:
            exact(baseline.run(copy.deepcopy(request)), phonopy_import.run(copy.deepcopy(request)))
        print(f'Phonopy immutable same-host compatibility: {len(requests)} requests, '
              f'{counts["numeric"]} numeric and {counts["other"]} other leaves exactly unchanged.')


if __name__ == '__main__':
    unittest.main()
