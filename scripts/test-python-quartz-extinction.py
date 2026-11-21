"""Check quartz diffraction against independent phase sums for the CIF."""

from cmath import exp
from hashlib import sha256
import json
from math import cos, sqrt, tau
from pathlib import Path
import sys
import unittest


SITE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SITE / 'dist/python'))
from quartz_extinction import run


class QuartzExtinctionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = SITE / 'dist/data/examples/quartz-298k'
        cls.raw = (cls.folder / '9005017.cif').read_bytes()
        cls.content = cls.raw.decode('utf-8')
        cls.result = run({'content': cls.content})

    def test_source_identity(self):
        metadata = json.loads((self.folder / 'source.json').read_bytes())
        self.assertEqual(self.result['source'], {
            'filename': metadata['file']['name'],
            'byteCount': len(self.raw),
            'sha256': sha256(self.raw).hexdigest(),
        })
        self.assertEqual(self.result['source']['sha256'], metadata['file']['sha256'])
        self.assertEqual(self.result['atomCount'], 9)
        self.assertEqual(self.result['weights'], {'Si': 14, 'O': 8})
        for content in ('', self.content.replace('4.9137', '4.9138', 1), self.content + '\n'):
            with self.subTest(bytes=len(content)), self.assertRaisesRegex(ValueError, 'COD 9005017'):
                run({'content': content})

    def test_axial_orbits(self):
        axial = self.result['axial']
        for index, row in enumerate(axial, 1):
            for direction in ('original', 'mirror'):
                with self.subTest(index=index, direction=direction):
                    test = row[direction]
                    self.assertEqual(test['hkl'], [0, 0, index])
                    self.assertAlmostEqual(test['dSpacing'], 5.4047 / index, places=10)
                    self.assertEqual(test['imag'], 0)
                    if index < 3:
                        self.assertEqual(test['real'], 0)
                        self.assertEqual(test['intensity'], 0)
                    else:
                        reference = 3 * 14 + 6 * 8 * cos(3 * tau * .11880)
                        self.assertGreater(reference, 0)
                        self.assertAlmostEqual(test['real'], reference, places=10)
                        self.assertAlmostEqual(test['intensity'], reference ** 2, places=8)

    def test_off_axis_controls(self):
        # For 101, each phase depends only on x + z. Evaluate those sums
        # directly for the three Si images and the six O images in the CIF.
        u = .46970
        x, y, z = .41330, .26720, .11880
        silicon = [u, 2 / 3, -u + 1 / 3]
        oxygen = [x + z, y + 2 / 3 - z, -y + 2 / 3 + z,
                  -x + 1 / 3 - z, -x + y + 1 / 3 + z, x - y - z]
        reference = (14 * sum(exp(1j * tau * r) for r in silicon)
                     + 8 * sum(exp(1j * tau * r) for r in oxygen))
        d_spacing = 1 / sqrt(4 / (3 * 4.9137 ** 2) + 1 / 5.4047 ** 2)
        self.assertGreater(abs(reference.imag), 20)
        labels = {
            'original': ([1, 0, 1], reference),
            'friedel': ([-1, 0, -1], reference.conjugate()),
            'mirror': ([1, 0, 1], reference.conjugate()),
            'rebasedSameLabel': ([1, 0, 1], reference.conjugate()),
            'rebasedSameVector': ([-1, 0, -1], reference),
        }
        self.assertEqual(set(self.result['control']), set(labels))
        for key, (hkl, amplitude) in labels.items():
            with self.subTest(control=key):
                observed = self.result['control'][key]
                self.assertEqual(observed['hkl'], hkl)
                self.assertAlmostEqual(observed['real'], amplitude.real, places=10)
                self.assertAlmostEqual(observed['imag'], amplitude.imag, places=10)
                self.assertAlmostEqual(observed['intensity'], abs(amplitude) ** 2, places=8)
                self.assertAlmostEqual(observed['dSpacing'], d_spacing, places=10)

    def test_browser_fixture_numeric_parity(self):
        fixture = json.loads((SITE / 'scripts/fixtures/quartz-extinction.json').read_bytes())

        def check(current, saved):
            if isinstance(current, dict):
                self.assertEqual(set(current), set(saved))
                for key, value in current.items():
                    check(value, saved[key])
            elif isinstance(current, list):
                self.assertEqual(len(current), len(saved))
                for value, expected in zip(current, saved, strict=True):
                    check(value, expected)
            elif isinstance(current, float):
                self.assertAlmostEqual(current, saved, places=8)
            else:
                self.assertEqual(current, saved)

        check(self.result, fixture)


if __name__ == '__main__':
    unittest.main()
