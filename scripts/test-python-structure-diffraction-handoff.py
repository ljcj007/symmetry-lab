"""Run both Python APIs with the actual browser handoff between them."""

import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data'
SI_SOURCE = DATA / 'examples/phonopy-si-structure/POSCAR-0'
SI_SHA = '6e2316a7d3085fd9fe5fc837aa849d2ad1d104ea1b23919fc6b3c1514b72e7a7'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

INVERSION_CIF = '''data_inversion_pair
_cell_length_a 4
_cell_length_b 5
_cell_length_c 6
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 60
loop_
_space_group_symop_operation_xyz
'x,y,z'
'-x,-y,-z'
loop_
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C 0.125 0.2 0.3
'''

# The same browser module copies and revalidates the producer's output, so the
# test exercises the real handoff and detects Python/JavaScript reshaping drift.
NODE_HANDOFF = '''
import fs from 'node:fs';
import {createStructureDiffractionHandoff, validateStructureDiffractionHandoff}
  from './dist/structure-diffraction-handoff.js';
const {result, source} = JSON.parse(fs.readFileSync(0, 'utf8'));
const draft = createStructureDiffractionHandoff(result, source);
process.stdout.write(JSON.stringify(validateStructureDiffractionHandoff(draft)));
'''


def copy_for_diffraction(result, source):
    response = subprocess.run(
        ['node', '--input-type=module', '-e', NODE_HANDOFF],
        input=json.dumps({'result': result, 'source': source}),
        encoding='utf-8', capture_output=True, cwd=ROOT, check=False, timeout=30,
    )
    if response.returncode:
        raise RuntimeError(response.stderr)
    return json.loads(response.stdout)


def reflection(hkl, geometry, **controls):
    payload = {'preset': 'custom', 'hkl': hkl, 'maxIndex': 2, 'wavelength': 1.5406, **geometry, **controls}
    return run('diffraction', payload)['reflection']


class StructureDiffractionHandoffTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database = json.loads((DATA / 'space-groups.json').read_text('utf-8'))

    def convert(self, text, fmt):
        result = run('structure_bc', {'format': fmt, 'text': text, 'symprec': 1e-5}, database=self.database)
        self.assertTrue(result['verified'])
        return result

    def test_official_si_keeps_eight_sites_and_existing_custom_classification(self):
        raw = SI_SOURCE.read_bytes()
        sha = hashlib.sha256(raw).hexdigest()
        self.assertEqual(sha, SI_SHA)
        result = self.convert(raw.decode('utf-8'), 'poscar')
        handoff = copy_for_diffraction(result, {'format': 'poscar', 'filename': SI_SOURCE.name, 'sha256': sha})
        self.assertEqual(result['group_number'], 227)
        self.assertEqual(result['bc_primitive']['atom_count'], 2)
        self.assertEqual(handoff['source'], {'format': 'poscar', 'filename': 'POSCAR-0', 'sha256': sha, 'atomCount': 8})
        geometry = handoff['custom']
        self.assertEqual(len(geometry['atoms']), 8)
        self.assertEqual(geometry['cell'], result['input_cell']['lattice'])

        # The unchanged Python preset is a separate control at the same declared
        # constant scattering weight. Its geometry/basis labels stay independent.
        def preset(hkl):
            return run('diffraction', {'preset': 'silicon', 'hkl': hkl, 'maxIndex': 2,
                                       'scatteringFactors': {'Si': 1}})['reflection']

        for hkl, ideal_label in (([1, 0, 0], 'centering'), ([2, 0, 0], 'diamond_basis')):
            with self.subTest(hkl=hkl):
                actual = reflection(hkl, geometry)
                self.assertEqual(actual['real'], 0)
                self.assertEqual(actual['imag'], 0)
                self.assertEqual(actual['intensity'], 0)
                self.assertEqual(actual['extinction']['kind'], 'model_cancellation')
                self.assertFalse(actual['extinction']['systematicForModel'])
                self.assertEqual(preset(hkl)['extinction']['kind'], ideal_label)
        # 100 cancels in pairs inside each F-centred sublattice. For 200 the
        # separate four-site sublattices contribute -4i and +4i.
        one = reflection([1, 0, 0], geometry)
        two = reflection([2, 0, 0], geometry)
        for start in (0, 4):
            self.assertAlmostEqual(sum(c['real'] for c in one['components'][start:start + 4]), 0, places=12)
            self.assertAlmostEqual(sum(c['imag'] for c in one['components'][start:start + 4]), 0, places=12)
        self.assertEqual([c['imag'] for c in two['components']], [-1] * 4 + [1] * 4)

        allowed = reflection([2, 2, 0], geometry)
        self.assertEqual(allowed['real'], -8)
        self.assertEqual(allowed['intensity'], 64)
        self.assertEqual(allowed['phaseDeg'], 180)
        self.assertEqual(preset([2, 2, 0])['real'], 8)
        self.assertEqual(preset([2, 2, 0])['intensity'], 64)
        d = 5.466163915731997 / math.sqrt(8)
        self.assertAlmostEqual(allowed['dSpacing'], d, places=12)
        self.assertAlmostEqual(allowed['twoTheta'], math.degrees(2 * math.asin(1.5406 / (2 * d))), places=12)

    def test_cif_expansion_and_input_hkl_in_a_nonorthogonal_cell(self):
        result = self.convert(INVERSION_CIF, 'cif')
        self.assertEqual(result['group_number'], 2)
        handoff = copy_for_diffraction(result, {'format': 'cif', 'filename': 'pair.cif', 'text': INVERSION_CIF})
        self.assertEqual(handoff['source'], {'format': 'cif', 'filename': 'pair.cif', 'sha256': '', 'atomCount': 2})
        geometry = handoff['custom']
        self.assertEqual(geometry['atoms'], [
            {'species': 'C', 'fractional': [0.125, 0.2, 0.3]},
            {'species': 'C', 'fractional': [0.875, 0.8, 0.7]},
        ])
        actual = reflection([1, 0, 0], geometry)
        self.assertAlmostEqual(actual['dSpacing'], 4 * math.sin(math.pi / 3), places=12)
        self.assertAlmostEqual(actual['real'], math.sqrt(2), places=12)
        self.assertAlmostEqual(actual['intensity'], 2, places=12)
        for contribution, phase in zip(actual['components'], (45, 315)):
            self.assertAlmostEqual(contribution['phaseDeg'], phase, places=12)
        # The handoff supplies no per-site factor, leaving species controls editable.
        weighted = reflection([1, 0, 0], geometry, scatteringFactors={'C': 2})
        self.assertAlmostEqual(weighted['intensity'], 8, places=12)


if __name__ == '__main__':
    unittest.main()
