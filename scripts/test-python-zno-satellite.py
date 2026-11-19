"""Check static ZnO satellite reflections from the pinned frozen-mode snapshot."""

from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'dist/data/examples/zno-mode-quadrature.json'
FIXTURE_SHA = 'e2186db63054497d22d25f2203739d9cf195733978505afe45bd7294ccbfcacc'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run


class ZnOSatelliteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = FIXTURE.read_bytes()
        if hashlib.sha256(raw).hexdigest() != FIXTURE_SHA:
            raise ValueError('The pinned ZnO frozen-mode fixture changed.')
        cls.data = json.loads(raw)
        parent, frozen = cls.data['parent'], cls.data['distorted']
        cls.lattice = np.asarray(parent['lattice'])
        cls.symbols = [a['symbol'] for a in parent['atoms']]
        if (parent['lattice'] != frozen['lattice'] or parent['lengthUnit'] != 'angstrom'
                or frozen['lengthUnit'] != 'angstrom' or cls.symbols != [a['symbol'] for a in frozen['atoms']]):
            raise ValueError('This comparison requires the same Å cell and atom order in both structures.')
        cls.parent = np.array([a['coordinates'] for a in parent['atoms']])
        cls.frozen = np.array([a['coordinates'] for a in frozen['atoms']])
        # Remove wrapping from same-order atom differences. These displacements
        # are all shorter than half the shortest lattice-vector lower bound,
        # which certifies them as unique nearest images even in this oblique cell.
        cls.u = cls.frozen - cls.parent
        cls.u -= np.rint(cls.u)
        cls.displacements_angstrom = np.linalg.norm(cls.u @ cls.lattice, axis=1)
        cell_lower_bound = np.linalg.svd(cls.lattice, compute_uv=False)[-1]
        if np.max(cls.displacements_angstrom) >= cell_lower_bound / 2:
            raise ValueError('Could not certify the periodic image for half-displacement interpolation.')

    def reflection(self, hkl, scale):
        sites = (self.parent + scale * self.u) % 1
        atoms = [{'species': symbol, 'fractional': site.tolist()} for symbol, site in zip(self.symbols, sites)]
        result = run('diffraction', {
            'preset': 'custom', 'cell': self.lattice.tolist(), 'atoms': atoms,
            'hkl': hkl, 'maxIndex': 2, 'wavelength': 1.5406, 'scatteringFactors': {'Zn': 1, 'O': 1},
        })['reflection']
        # Independent equal-weight Fourier sum using the same declared basis.
        amplitude = np.sum(np.exp(2j * math.pi * (sites @ hkl)))
        self.assertAlmostEqual(result['real'], amplitude.real, places=9)
        self.assertAlmostEqual(result['imag'], amplitude.imag, places=9)
        self.assertAlmostEqual(result['intensity'], abs(amplitude) ** 2, places=9)
        return result

    def test_cell_metric_and_parent_translations(self):
        settings = self.data['settings']
        self.assertEqual(settings['supercell'], [4, 1, 4])
        self.assertEqual(settings['q'], [.25, 0, .25])
        self.assertEqual(settings['freezeAmplitude'], .1)
        self.assertEqual(settings['lengthUnit'], 'angstrom')
        self.assertEqual(Counter(self.symbols), {'Zn': 32, 'O': 32})
        self.assertAlmostEqual(np.max(self.displacements_angstrom), .08319208620760367, places=10)
        self.assertLessEqual(np.max(self.displacements_angstrom), .1 + 1e-10)
        endpoint_delta = self.parent + self.u - self.frozen
        np.testing.assert_allclose(endpoint_delta - np.rint(endpoint_delta), 0, atol=1e-12, rtol=0)

        hkl = [1, 0, 1]
        np.testing.assert_array_equal(np.array(hkl) / settings['supercell'], settings['q'])
        a, b, c = self.lattice
        dual = np.array([np.cross(b, c), np.cross(c, a), np.cross(a, b)]) / np.dot(a, np.cross(b, c))
        g = hkl @ dual
        result = self.reflection(hkl, 0)
        np.testing.assert_allclose(result['reciprocalVector'], g, atol=1e-12, rtol=0)
        self.assertAlmostEqual(result['dSpacing'], 1 / np.linalg.norm(g), places=12)
        self.assertAlmostEqual(result['dSpacing'], 10.033522590330415, places=10)

        # A primitive translation leaves the parent decorated supercell fixed.
        # Its Fourier phase at H=(1,0,1) is i, forcing its structure factor to vanish.
        translation = np.array([.25, 0, 0])
        for label in ('Zn', 'O'):
            points = self.parent[np.array(self.symbols) == label]
            difference = points[:, None, :] + translation - points[None, :, :]
            difference -= np.rint(difference)
            matches = np.linalg.norm(difference @ self.lattice, axis=2) < 1e-9
            np.testing.assert_array_equal(matches.sum(axis=1), 1)
            np.testing.assert_array_equal(matches.sum(axis=0), 1)
        self.assertAlmostEqual(np.exp(2j * math.pi * (translation @ hkl)), 1j)
        self.assertAlmostEqual(result['intensity'], 0)
        self.assertEqual(result['extinction']['kind'], 'model_cancellation')
        self.assertFalse(result['extinction']['systematicForModel'])

    def test_first_satellite_grows_quadratically_with_small_displacement(self):
        hkl = [1, 0, 1]
        full = self.reflection(hkl, 1)['intensity']
        half = self.reflection(hkl, .5)['intensity']
        self.assertAlmostEqual(full, .5285224161470846, places=9)
        self.assertAlmostEqual(half, .1322078912019354, places=9)
        self.assertAlmostEqual(half / full, .25, delta=2e-4)

    def test_second_satellite_has_no_linear_structure_factor(self):
        hkl = [2, 0, 2]
        phases = np.exp(2j * math.pi * (self.parent @ hkl))
        linear = 2j * math.pi * np.sum((self.u @ hkl) * phases)
        self.assertLess(abs(linear), 1e-8)
        self.assertAlmostEqual(self.reflection(hkl, 0)['intensity'], 0)
        full = self.reflection(hkl, 1)['intensity']
        half = self.reflection(hkl, .5)['intensity']
        self.assertAlmostEqual(full, .0003930909935441101, places=11)
        self.assertAlmostEqual(half / full, 1 / 16, delta=1e-4)


if __name__ == '__main__':
    unittest.main()
