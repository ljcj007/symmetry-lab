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

    def assert_screw_branch_labels(self, standard, characters, parameter, expected_labels):
        self.assertTrue(standard['bc_complete'])
        self.assertEqual(standard['bilbao_candidate_tables'], 0)
        # The same fixed Seitz operation is compared on both raw-k charts.
        positive_character = complex(1, 1) / (2 ** .5)
        for target, label in zip((positive_character, -positive_character), expected_labels):
            matches = [row for row in standard['mappings']
                       if abs(characters[row['local_label']] - target) < 1e-12]
            self.assertEqual(len(matches), 1)
            mapping = matches[0]
            self.assertEqual(mapping['bc_label'], label)
            self.assertIsNone(mapping['bilbao_label'])
            candidate, = mapping['candidates']
            self.assertEqual(candidate['k_label'], 'Λ')
            self.assertLess(candidate['residual'], 1e-12)
            transport = candidate['transport']
            self.assertEqual(transport['parameter'], parameter)
            self.assertEqual(transport['reference_k'], [0, 0, parameter])
            self.assertEqual(transport['star_rotation'], 'E')
            self.assertEqual(transport['origin_translation'], [0, 0, 0])
            self.assertFalse(transport['outside_space_group'])

    def test_same_structure_with_equivalent_and_opposite_reciprocal_coordinates(self):
        sys.path.insert(0, str(self.site_root / 'dist/python'))
        from browser_api import run

        case = self.node(READ_CIF)
        text = case['text']
        digest = hashlib.sha256(text.encode('utf-8')).hexdigest()
        database = json.loads((self.site_root / 'dist/data/space-groups.json').read_bytes())
        catalog = database['groups'][3]
        self.assertEqual(catalog['number'], 4)
        # SG 4 Λ in SpaceGroupIrep's LittleGroupIrepData.wl uses the two C2 rows
        # of LGIrepLabel[{2,1}], type b. For s = {C2z | 0 0 1/2}, these give
        # χ_Λ1(s,u) = exp(-i*pi*u) and χ_Λ2(s,u) = -exp(-i*pi*u).
        # A unit shift in u reverses both signs and exchanges the raw-u labels.
        branch_labels = {-.25: ('Λ1', 'Λ2'), .75: ('Λ2', 'Λ1')}

        for k_input, k_bc, reduced, factor in [(.25, -.25, -.25, 1j), (-.75, .75, -.25, 1j), (-.25, .25, .25, -1j)]:
            with self.subTest(k_input=k_input):
                input_ = {'format': 'cif', 'text': text, 'symprec': 1e-5, 'angle_tolerance': -1, 'k': [0, 0, k_input]}
                result = run('structure_bc', input_, database=database)
                self.assertTrue(result['verified'])
                self.assertEqual(result['k_bc'], [0, 0, k_bc])
                job = {'group_number': 4, 'k': result['k_bc'], 'doubleValued': False, 'bz_type': result['bz_type'],
                       'basis': catalog['basis'], 'operations': catalog['operations']}
                analysis = run('analyze', job, database=database)
                little_group = analysis['littleGroup']
                self.assertEqual(little_group['order'], 2)
                screw, = [i for i, op in enumerate(little_group['unitaryOperations'])
                          if op['name'] == 'C2z' and op['translation'] == [0, 0, .5]]
                self.assertEqual(little_group['translationDefects'][screw][screw], [0, 0, 1])
                self.assertEqual([arm['k'] for arm in analysis['star']], [[0, 0, reduced]])
                self.assertEqual([irrep['dimension'] for irrep in analysis['irreps']], [1, 1])
                characters = {}
                for irrep in analysis['irreps']:
                    chi = irrep['characters'][screw]
                    value = complex(chi['re'], chi['im'])
                    characters[irrep['label']] = value
                    self.assertAlmostEqual(value ** 2, factor)
                self.assertEqual(little_group['factors'][screw][screw], {'re': factor.real, 'im': factor.imag})
                if k_bc in branch_labels:
                    self.assert_screw_branch_labels(analysis['standardLabels'], characters, k_bc, branch_labels[k_bc])
                if k_bc == .75:
                    fixed_chart = run('standard_labels', {'action': 'match', 'group_number': 4,
                                      'k': [0, 0, reduced], 'analysis': analysis}, database=database)
                    self.assert_screw_branch_labels(fixed_chart, characters, reduced, branch_labels[reduced])

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
