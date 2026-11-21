"""Recompute the classroom's quartz result from the verified CIF on disk."""

import argparse
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

import numpy as np


CHECKOUT = Path(__file__).resolve().parents[1]


class QuartzConjugacyTests(unittest.TestCase):
    site = CHECKOUT

    @classmethod
    def setUpClass(cls):
        sys.path[:0] = [str(CHECKOUT / 'dist/python'), str(cls.site / 'dist/python')]
        from quartz_conjugacy import run
        from structure_bc import parse_cif

        source = cls.site / 'dist/data/examples/quartz-298k'
        cls.record = json.loads((source / 'source.json').read_bytes())
        cls.raw = (source / cls.record['file']['name']).read_bytes()
        cls.content = cls.raw.decode('utf-8')
        cls.run_mode = staticmethod(run)
        cls.parsed_cell = parse_cif(cls.content)
        cls.result = run({'content': cls.content})

    def test_source_and_browser_fixture(self):
        self.assertEqual(self.result['schemaVersion'], 1)
        self.assertEqual(self.result['spaceGroup'], 154)
        self.assertEqual(self.result['source'], {
            'filename': self.record['file']['name'], 'codId': self.record['codId'],
            'revision': self.record['codRevision'], 'byteCount': len(self.raw),
            'sha256': sha256(self.raw).hexdigest(), 'doi': self.record['doi'],
        })
        self.assertEqual(len(self.raw), self.record['file']['bytes'])
        self.assertEqual(sha256(self.raw).hexdigest(), self.record['file']['sha256'])
        fixture = json.loads((CHECKOUT / 'scripts/fixtures/quartz-conjugacy.json').read_bytes())
        self.assertEqual(json.loads(json.dumps(self.result)), fixture)

    def test_rejects_modified_coordinate_even_at_same_byte_count(self):
        altered = self.content.replace('0.46970', '0.46971')
        self.assertEqual(len(altered.encode('utf-8')), len(self.raw))
        for value in (altered, self.content.replace('\n', '\r\n'), self.content.strip(), None, True):
            with self.subTest(type=type(value).__name__), self.assertRaisesRegex(ValueError, 'byte-preserved'):
                self.run_mode({'content': value})
        with self.assertRaisesRegex(ValueError, 'byte-preserved'):
            self.run_mode({})

    def test_silicon_and_oxygen_orbits_match_existing_structure_import(self):
        self.assertEqual(self.result['silicon']['multiplicity'], 3)
        self.assertEqual(self.result['oxygen']['multiplicity'], 6)
        expected_silicon = [
            ['4697/10000', '0', '0'], ['0', '4697/10000', '2/3'], ['5303/10000', '5303/10000', '1/3'],
        ]
        self.assertEqual([site['position'] for site in self.result['silicon']['sites']], expected_silicon)
        for name in ('silicon', 'oxygen'):
            sites = self.result[name]['sites']
            expected_stabilizer_size = 6 // len(sites)
            self.assertTrue(all(len(site['stabilizer']) == expected_stabilizer_size for site in sites))
            if name == 'oxygen':
                self.assertTrue(all(site['stabilizer'] == [{'row': 1, 'latticeCorrection': [0, 0, 0]}]
                                    for site in sites))
            imported = [point for point, label in zip(self.parsed_cell['positions'], self.parsed_cell['species'])
                        if label == self.result[name]['label']]
            self.assertEqual(len(imported), len(sites))
            for site in sites:
                exact = [float(Fraction(component)) for component in site['position']]
                self.assertEqual(sum(np.allclose(point, exact, atol=1e-10, rtol=0) for point in imported), 1)

    def test_lift_adds_a_cell_instead_of_subtracting_it(self):
        witness = self.result['conjugation']
        self.assertEqual(witness, {
            'byRow': 3, 'baseRow': 6, 'representativeRow': 4, 'latticeCorrection': [0, 0, 1],
            'targetSiteId': 2, 'listedRepresentativeImage': ['0', '4697/10000', '-1/3'],
            'correctedImage': ['0', '4697/10000', '2/3'], 'conjugateTranslation': ['0', '0', '4/3'],
        })
        self.assertEqual([site['stabilizer'] for site in self.result['silicon']['sites']], [
            [{'row': 1, 'latticeCorrection': [0, 0, 0]}, {'row': 6, 'latticeCorrection': [0, 0, 0]}],
            [{'row': 1, 'latticeCorrection': [0, 0, 0]}, {'row': 4, 'latticeCorrection': [0, 0, 1]}],
            [{'row': 1, 'latticeCorrection': [0, 0, 0]}, {'row': 2, 'latticeCorrection': [0, 0, 0]}],
        ])

    def test_operation_rows_realize_the_s3_permutations_and_classes(self):
        operations = self.result['operations']
        self.assertEqual([row['row'] for row in operations], list(range(1, 7)))
        expected = [[1, 2, 3], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2], [1, 3, 2]]
        self.assertEqual([row['siliconPermutation'] for row in operations], expected)
        self.assertEqual([row['fixedSiliconSites'] for row in operations], [[1, 2, 3], [3], [], [2], [], [1]])
        self.assertEqual(self.result['classes'], [
            {'id': 'identity', 'rows': [1], 'character': 3},
            {'id': 'transposition', 'rows': [2, 4, 6], 'character': 1},
            {'id': 'three-cycle', 'rows': [3, 5], 'character': 0},
        ])
        g, h = expected[5], expected[2]
        h_inverse = [h.index(site) + 1 for site in (1, 2, 3)]
        self.assertEqual([h[g[index - 1] - 1] for index in h_inverse], expected[3])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--site', type=Path, default=CHECKOUT)
    args, unittest_args = parser.parse_known_args()
    QuartzConjugacyTests.site = args.site.resolve()
    unittest.main(argv=[sys.argv[0], *unittest_args])
