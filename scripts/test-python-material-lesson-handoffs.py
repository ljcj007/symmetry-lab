"""Quantitative controls for the three material classroom handoffs."""

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run


class MaterialLessonHandoffs(unittest.TestCase):
    def test_half_reciprocal_mode_requires_even_repetition(self):
        examples = ROOT / 'dist/data/examples'
        base = {
            'content': (examples / 'phonopy-zno-qpoints.yaml').read_bytes().decode('utf8'),
            'structure_content': (examples / 'phonopy-zno-structure.yaml').read_bytes().decode('utf8'),
            'filename': 'phonopy-zno-qpoints.yaml', 'preset': 'custom', 'frequency_unit': 'THz',
            'selected_q': 3, 'selected_band': 10, 'amplitude': .12, 'phase': 0,
        }
        result = run('phonon_modes', dict(base, supercell=[2, 1, 1]))
        self.assertEqual(result['selection']['q'], [.5, 0, 0])
        self.assertAlmostEqual(result['selection']['frequency'], 15.0416538329)
        self.assertEqual(result['frequencyUnit'], 'THz')
        self.assertTrue(result['frozen']['available'])
        self.assertEqual(len(result['frozen']['atoms']), 8)
        self.assertTrue(result['exports']['poscar'])
        self.assertTrue(result['exports']['cif'])
        with self.assertRaisesRegex(ValueError, 'q_i × supercell_i'):
            run('phonon_modes', dict(base, supercell=[3, 1, 1]))

    def test_raman_z_geometry_matches_analytic_exercise(self):
        for analyzer in ('parallel', 'crossed'):
            with self.subTest(analyzer=analyzer):
                result = run('phonons', {'preset': 'silicon', 'mode': 'z', 'angle': 22.5,
                                         'channel': 'raman', 'polarization': analyzer})
                self.assertAlmostEqual(result['polarization']['intensity'], .5)

    def test_upper_volume_boundary_does_not_produce_equilibrium_values(self):
        base = {'source': 'preset', 'preset': 'einstein-volume', 'fit_degree': 2, 'fit_window': 5,
                'v0': 40, 'natom': 2, 'bulk_modulus': 100, 'theta': 400, 'gamma': 1.5,
                't_min': 0, 't_max': 1000, 't_step': 25}
        interior = run('qha_lab', dict(base, pressure=0))
        upper_edge = run('qha_lab', dict(base, pressure=-100))
        self.assertTrue(interior['synthetic'] and upper_edge['synthetic'])
        self.assertEqual(len(interior['rows']), 41)
        self.assertEqual(len(upper_edge['rows']), 41)
        self.assertTrue(all(row['status'] == 'interior-minimum' for row in interior['rows']))
        self.assertEqual(upper_edge['volumes'][-1], 46)
        for row in upper_edge['rows']:
            self.assertEqual(row['status'], 'boundary-minimum')
            best = min(row['samples'], key=lambda sample: sample['totalFreeEnergy'])
            self.assertEqual(best['volume'], 46)
            self.assertIsNone(row['volume'])
            self.assertIsNone(row['alphaVolume'])
            self.assertIsNone(row['heatCapacity'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
