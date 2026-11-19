"""Replay the existing SG 4 CIF with matching sources through both calculators."""

import argparse
import hashlib
import json
from pathlib import Path
import runpy
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]

READ_CIF = '''
import {cifSettingCases} from './dist/cif-setting-practice.js';
process.stdout.write(JSON.stringify(cifSettingCases.find(item=>item.id==='unique-c')));
'''
CHECK_SOURCE = '''
import fs from 'node:fs';
import {createStructureHandoff,structureHandoffForCalculation} from './dist/structure-provenance.js';
const {result,input,job,analysis,filename} = JSON.parse(fs.readFileSync(0,'utf8'));
const source = await createStructureHandoff({result,input,source:{kind:'teaching-example',filename}});
const changed = {...job,k:[0,0,job.k[2]+1]};
process.stdout.write(JSON.stringify({source,associated:!!structureHandoffForCalculation(source,{input:job,result:analysis}),
 changedAssociated:!!structureHandoffForCalculation(source,{input:changed})}));
'''


class CIFReciprocalReplayTests(unittest.TestCase):
    site_root = ROOT

    def node(self, source, payload=None):
        response = subprocess.run(['node', '--input-type=module', '-e', source], cwd=self.site_root,
                                  input=json.dumps(payload), encoding='utf-8', capture_output=True,
                                  check=True, timeout=30)
        return json.loads(response.stdout)

    def test_same_structure_with_equivalent_and_opposite_reciprocal_coordinates(self):
        sys.path.insert(0, str(self.site_root / 'dist/python'))
        from browser_api import run

        case = self.node(READ_CIF)
        text = case['text']
        digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
        database = json.loads((self.site_root / 'dist/data/space-groups.json').read_bytes())
        catalog = database['groups'][3]
        screw = catalog['operations'][1]
        self.assertEqual(catalog['number'], 4)
        self.assertEqual(screw['name'], 'C2z')
        self.assertEqual(screw['translation'], [0, 0, .5])

        for k_input, k_bc, reduced, factor in [(.25, -.25, -.25, 1j), (-.75, .75, -.25, 1j), (-.25, .25, .25, -1j)]:
            with self.subTest(k_input=k_input):
                input_ = {'format': 'cif', 'text': text, 'symprec': 1e-5, 'angle_tolerance': -1, 'k': [0, 0, k_input]}
                result = run('structure_bc', input_, database=database)
                self.assertTrue(result['verified'])
                self.assertEqual(result['k_bc'], [0, 0, k_bc])
                job = {'group_number': 4, 'k': result['k_bc'], 'doubleValued': False, 'bz_type': result['bz_type'],
                       'basis': catalog['basis'], 'operations': catalog['operations']}
                analysis = run('analyze', job, database=database)
                self.assertEqual(analysis['littleGroup']['order'], 2)
                self.assertEqual(analysis['littleGroup']['translationDefects'][1][1], [0, 0, 1])
                self.assertEqual([arm['k'] for arm in analysis['star']], [[0, 0, reduced]])
                self.assertEqual([irrep['dimension'] for irrep in analysis['irreps']], [1, 1])
                for irrep in analysis['irreps']:
                    chi = irrep['characters'][1]
                    self.assertAlmostEqual(complex(chi['re'], chi['im']) ** 2, factor)
                self.assertEqual(analysis['littleGroup']['factors'][1][1], {'re': factor.real, 'im': factor.imag})

                evidence = self.node(CHECK_SOURCE, {'result': result, 'input': input_, 'job': job,
                                                    'analysis': analysis, 'filename': case['filename']})
                self.assertTrue(evidence['associated'])
                self.assertFalse(evidence['changedAssociated'], 'Changing workbench k directly removes its former source association')
                self.assertEqual(evidence['source']['source']['sha256'], digest)

        # Reuse the production handoff exercised by the existing diffraction regression.
        diffraction = runpy.run_path(str(self.site_root / 'scripts/test-python-structure-diffraction-handoff.py'))
        copied = diffraction['copy_for_diffraction'](result, {'format': 'cif', 'filename': case['filename'], 'sha256': digest})
        self.assertEqual(copied['source']['atomCount'], 4)
        for hkl, intensity, spacing in [([0, 0, 1], 0, 4), ([0, 0, 2], 2.9006080820104856, 2)]:
            reflected = diffraction['reflection'](hkl, copied['custom'], scatteringFactors={'Na': 1, 'Cl': 1})
            self.assertAlmostEqual(reflected['intensity'], intensity)
            self.assertAlmostEqual(reflected['dSpacing'], spacing)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site-root', type=Path, default=ROOT)
    args, extra = parser.parse_known_args()
    CIFReciprocalReplayTests.site_root = args.site_root.resolve()
    unittest.main(argv=[sys.argv[0], *extra])
