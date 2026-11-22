"""Scientific and input controls for the authentic ZnO Γ-limit exercise."""

import hashlib
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np
import yaml


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from zno_gamma_nac import FILES, run


EXAMPLES = ROOT / 'dist/data/examples'
INPUTS = {kind: (EXAMPLES / identity[0]).read_bytes().decode('utf-8')
          for kind, identity in FILES.items()}


def calculate(direction, correction='neutralized', coordinates='cartesian'):
    return run(dict(INPUTS, direction=direction, directionCoordinates=coordinates, correction=correction))


def modes(result, irrep):
    return [m for m in result['corrected']['modes'] if m['overlaps'][irrep] > .999999]


class ZnOGammaNACTest(unittest.TestCase):
    def test_pinned_sources_and_archive_units(self):
        source_record = json.loads((EXAMPLES / 'phonopy-zno-source.json').read_bytes())
        result = calculate([0, 0, 1], correction='off')
        source = result['source']
        self.assertEqual(result['schema'], 'symmetry-lab-zno-gamma-nac-1')
        self.assertEqual(source['revision'], source_record['commit'])
        self.assertFalse(source['archiveNAC'])
        self.assertFalse(source_record['generator']['settings']['is_nac'])
        for row in source['files'].values():
            with self.subTest(file=row['file']):
                original = row['file']
                self.assertEqual((ROOT / 'dist/en/data/examples' / original).read_bytes(),
                                 (EXAMPLES / original).read_bytes())
                self.assertEqual(hashlib.sha256((EXAMPLES / original).read_bytes()).hexdigest(), row['sha256'])
        self.assertEqual(source['symbols'], ['Zn', 'Zn', 'O', 'O'])
        self.assertEqual(source['massesU'], [65.38, 65.38, 15.9994, 15.9994])
        self.assertAlmostEqual(source['primitiveVolumeAngstrom3'], 49.639270875940056)
        self.assertEqual(source['frequencyFactorTHz'], source_record['generator']['settings']['unitConversionFactor'])
        self.assertEqual(source['bornFactorEVAngstrom'], 14.4)
        self.assertLess(result['checks']['archiveEigenpairMaxResidual'], 1e-9)
        self.assertEqual(result['baseline']['modes'], result['corrected']['modes'])
        self.assertEqual(result['checks']['correctionRank'], 0)

    def test_cartesian_axis_exercises(self):
        z = calculate([0, 0, 1])
        x = calculate([1, 0, 0])
        for result, expected_a1, expected_e1 in (
                (z, 15.84137848732, [11.18004640294, 11.18004640294]),
                (x, 10.58120020426, [11.18004640294, 15.19191168459])):
            self.assertEqual(len(result['corrected']['modes']), 12)
            np.testing.assert_allclose([m['frequencyTHz'] for m in modes(result, 'A1')], [expected_a1], atol=2e-8, rtol=0)
            np.testing.assert_allclose([m['frequencyTHz'] for m in modes(result, 'E1')], expected_e1, atol=2e-8, rtol=0)
            np.testing.assert_allclose([m['frequencyTHz'] for m in modes(result, 'E2')],
                                       [2.718847621, 2.718847621, 12.0685925431, 12.0685925431], atol=2e-8, rtol=0)
            np.testing.assert_allclose([m['frequencyTHz'] for m in modes(result, 'B1')],
                                       [7.3871695806, 15.3264760514], atol=2e-8, rtol=0)
            self.assertLess(max(abs(m['frequencyTHz']) for m in modes(result, 'acoustic')), 1e-3)
            self.assertGreater(result['checks']['correctionMaxEigenvalue'], 0)
            self.assertGreater(result['checks']['correctionMinEigenvalue'], -1e-12)
            self.assertEqual(result['checks']['correctionRank'], 1)
            self.assertTrue(result['checks']['translationPreserved'])
        # A1 rises past 15.326 THz; following the archived sorted index would select E1.
        self.assertAlmostEqual(z['baseline']['modes'][6]['overlaps']['A1'], 1, places=12)
        self.assertAlmostEqual(z['corrected']['modes'][6]['overlaps']['E1'], 1, places=12)
        self.assertEqual(modes(z, 'A1')[0]['band'], 11)

    def test_oblique_mixing_and_direction_conventions(self):
        oblique = calculate([1, 0, 1])
        mixed = [m for m in oblique['corrected']['modes'] if m['overlaps']['A1'] > 1e-6 and m['overlaps']['E1'] > 1e-6]
        np.testing.assert_allclose([m['frequencyTHz'] for m in mixed], [10.868990117, 15.459266477], atol=2e-8, rtol=0)
        reciprocal = np.asarray(oblique['source']['reciprocalBasisPerAngstrom'])
        vector = [1, 0, 1]
        equivalent_fractional = (np.asarray(vector) @ np.linalg.inv(reciprocal)).tolist()
        for direction, convention in (([-9, 0, -9], 'cartesian'),
                                      ([1e300, 0, 1e300], 'cartesian'),
                                      ([1e-300, 0, 1e-300], 'cartesian'),
                                      (equivalent_fractional, 'primitive-reciprocal')):
            other = calculate(direction, coordinates=convention)
            np.testing.assert_allclose(other['corrected']['deltaDynamicalMatrix'],
                                       oblique['corrected']['deltaDynamicalMatrix'], atol=2e-15, rtol=0)
            np.testing.assert_allclose([m['frequencyTHz'] for m in other['corrected']['modes']],
                                       [m['frequencyTHz'] for m in oblique['corrected']['modes']], atol=5e-9, rtol=0)
        raw_fractional = calculate(vector, coordinates='primitive-reciprocal')
        self.assertNotAlmostEqual(raw_fractional['corrected']['modes'][-1]['frequencyTHz'],
                                  oblique['corrected']['modes'][-1]['frequencyTHz'], places=3)

    def test_independent_cartesian_matrix_entries_and_strength_sum(self):
        direction = np.array([1., 2., -3.])
        unit = direction / math.sqrt(14)
        result = calculate(direction.tolist())
        matrix = result['corrected']['deltaDynamicalMatrix']
        # Independently expand the documented tensor formula by atom and component.
        source = yaml.safe_load(INPUTS['structure'])['primitive_cell']
        a, b, c = source['lattice']
        volume = sum(x*y for x, y in zip(a, np.cross(b, c)))
        screen = sum(unit[i]**2*epsilon for i, epsilon in enumerate([5.970, 5.970, 4.558]))
        charge = [(2.11950 + 2.14963)/2]*2 + [(2.14964 + 2.12582)/2]
        p = [s*unit[i]*charge[i]/math.sqrt(atom['mass']) for s, atom in zip([1, 1, -1, -1], source['points'])
             for i in range(3)]
        self.assertAlmostEqual(result['electrostatics']['screening'], screen)
        for i in range(12):
            for j in range(12):
                self.assertAlmostEqual(matrix[i][j], 4*math.pi*14.4*p[i]*p[j]/(volume*screen), places=13)
        for pool in ('baseline', 'corrected'):
            entries = result[pool]['modes']
            self.assertAlmostEqual(sum(m['longitudinalDipoleSquared'] for m in entries), sum(x*x for x in p), places=12)
            for mode in entries:
                self.assertAlmostEqual(sum(mode['overlaps'].values()), 1, places=12)

    def test_raw_born_is_a_translation_counterexample(self):
        for vector, spur in (([0, 0, 1], .034937472), ([1, 0, 0], .042380863)):
            raw = calculate(vector, 'raw')
            fixed = calculate(vector)
            np.testing.assert_allclose(raw['electrostatics']['rawBornChargeSum'],
                                       np.diag([-.06026, -.06026, .04764]), atol=1e-13, rtol=0)
            np.testing.assert_allclose(fixed['electrostatics']['appliedBornChargeSum'], np.zeros((3,3)), atol=1e-13, rtol=0)
            self.assertFalse(raw['checks']['translationPreserved'])
            self.assertTrue(fixed['checks']['translationPreserved'])
            self.assertAlmostEqual(raw['corrected']['modes'][2]['frequencyTHz'], spur, places=8)
            self.assertGreater(raw['checks']['correctionTranslationMaxResidual'], 1e-3)
            self.assertLess(fixed['checks']['correctionTranslationMaxResidual'], 1e-12)

    def test_invalid_or_modified_input(self):
        good = dict(INPUTS, direction=[0, 0, 1], directionCoordinates='cartesian', correction='neutralized')
        for changes in ({'direction': [0, 0, 0]}, {'direction': [1, 0]}, {'direction': [True, 0, 0]},
                        {'direction': [1, float('inf'), 0]}, {'direction': [1, float('nan'), 0]},
                        {'direction': [10**500, 0, 0]}, {'correction': 'arbitrary'}, {'directionCoordinates': 'grid'},
                        {'qpoints': INPUTS['qpoints'].replace('\r\n','\n')},
                        {'structure': INPUTS['structure'].replace('AMU','aMu')},
                        {'born': INPUTS['born'].replace('14.400', '14.401')}, {'ignored': True}):
            with self.subTest(fields=list(changes)), self.assertRaises(ValueError):
                run(dict(good, **changes))
        del good['born']
        with self.assertRaises(ValueError):
            run(good)


if __name__ == '__main__':
    unittest.main(verbosity=2)
