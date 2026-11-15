"""Real API plus independent finite geometry and polar-vector checks.

Compare RMS/projectors, never a particular SVD sign, basis order or equally
optimal registration. All text source digests use utf8-lf-v1.
"""
from itertools import permutations
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import os
import shutil
import subprocess
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import browser_api

source = (ROOT / 'dist/chirality-actions-reference.js').read_text(encoding='utf-8')
REFERENCE = json.loads(source.split('Object.freeze(', 1)[1].rsplit(');', 1)[0])
NODE = os.environ.get('SYMMETRY_LAB_NODE') or shutil.which('node') or str(
    Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
code = '''
import {chiralityActionReference,chiralityPolarReference} from './dist/chirality-actions-bridge.js';
const maps=[],polar=[];
for(const caseId of ['d3','pyramid','octahedron','tetra'])for(const components of ['original','passive']){
 for(const mode of ['proper','forbidden'])maps.push(chiralityActionReference({caseId,components,mode}));
 for(const trial of ['z','x','sum','zero'])for(const amplitude of [0,1,2])polar.push(chiralityPolarReference({caseId,components,trial,amplitude}));
}
console.log(JSON.stringify({maps,polar}));
'''
JS = json.loads(subprocess.run([NODE, '--input-type=module', '-e', code], cwd=ROOT,
                              text=True, encoding='utf-8', capture_output=True, check=True).stdout)
M = np.diag([-1., 1, 1])
B = np.array([[0., 0, 1], [0, 1, 0], [-1, 0, 0]])
PROJECTORS = dict(d3=np.zeros((3, 3)), pyramid=np.diag([0., 0, 1]),
                  octahedron=np.zeros((3, 3)), tetra=np.eye(3))


def optimal_proper_rms(positions, labels):
    mirrored = positions @ M
    best = float('inf')
    for perm in permutations(range(len(positions))):
        if any(labels[i] != labels[j] for i, j in enumerate(perm)):
            continue
        target = positions[list(perm)]
        covariance = mirrored.T @ target
        singular = np.linalg.svd(covariance, compute_uv=False)
        maximum_trace = singular[0] + singular[1] + (1 if np.linalg.det(covariance) >= 0 else -1)*singular[2]
        cost = (np.sum(mirrored**2) + np.sum(target**2) - 2*maximum_trace)/len(positions)
        best = min(best, math.sqrt(max(0, float(cost))))
    return best


class ChiralityActionsScience(unittest.TestCase):
    def test_reference_matches_actual_api_invariants(self):
        expected = dict(d3=(True, 0, 6), pyramid=(False, 1, 8),
                        octahedron=(False, 0, 48), tetra=(True, 3, 1))
        for name, data in REFERENCE['cases'].items():
            result = browser_api.run('chirality_polarity_lab', data['input'])
            self.assertEqual(tuple(row['value'] for row in result['summary'][:3]),
                             (expected[name][0], expected[name][2], expected[name][1]))
            self.assertEqual(data['geometry']['labels'], result['geometry']['labels'])
            np.testing.assert_allclose(data['geometry']['points'], result['geometry']['points'], atol=1e-12)
            self.assertAlmostEqual(data['mirrorFit']['rms'], result['mirrorFit']['rms'], delta=1e-9)
            self.assertAlmostEqual(data['mirrorFit']['rms'], optimal_proper_rms(
                np.array(data['geometry']['points']), data['geometry']['labels']), delta=1e-9)
            actual_basis = np.array(result['polarBasis']).reshape(-1, 3)
            np.testing.assert_allclose(data['polarProjector'], actual_basis.T @ actual_basis, atol=1e-9)
            np.testing.assert_allclose(data['polarProjector'], PROJECTORS[name], atol=1e-9)
            self.assertEqual(len(data['operations']), len(result['operations']))
            for generator in data['generators']:
                self.assertTrue(any(np.linalg.norm(np.array(generator['matrix'])-op['matrix']) < 1e-8
                                    for op in result['operations']))
            generated, cursor = [np.eye(3)], 0
            while cursor < len(generated):
                current = generated[cursor]
                cursor += 1
                for generator in data['generators']:
                    product = current @ np.array(generator['matrix'])
                    if not any(np.linalg.norm(product-known) < 1e-7 for known in generated):
                        generated.append(product)
                self.assertLessEqual(len(generated), 48)
            self.assertEqual(len(generated), len(result['operations']))

    def test_atom_maps_and_forbidden_inverse_mirror(self):
        for result in JS['maps']:
            data = REFERENCE['cases'][result['caseId']]
            change = np.eye(3) if result['components'] == 'original' else B
            x = np.array(data['geometry']['points']) @ change.T
            mirror = change @ M @ change.T
            rotation = np.array(result['rotation'])
            np.testing.assert_allclose(rotation.T @ rotation, np.eye(3), atol=1e-12)
            self.assertAlmostEqual(np.linalg.det(rotation), 1 if result['mode'] == 'proper' else -1, delta=1e-12)
            self.assertEqual(result['allowedAlignment'], result['mode'] == 'proper')
            self.assertEqual(sorted(row['j'] for row in result['rows']), list(range(len(x))))
            distances = []
            for row in result['rows']:
                np.testing.assert_allclose(row['position'], x[row['i']], atol=1e-12)
                np.testing.assert_allclose(row['reflected'], mirror @ x[row['i']], atol=1e-12)
                transformed = rotation @ mirror @ x[row['i']] + result['translation']
                np.testing.assert_allclose(row['transformed'], transformed, atol=1e-12)
                self.assertEqual(row['label'], row['targetLabel'])
                residual = transformed - x[row['j']]
                np.testing.assert_allclose(row['residual'], residual, atol=1e-12)
                distances.append(float(np.linalg.norm(residual)))
            self.assertAlmostEqual(result['rms'], np.sqrt(np.mean(np.square(distances))), delta=1e-12)
            self.assertAlmostEqual(result['maximum'], max(distances), delta=1e-12)
            self.assertAlmostEqual(result['rms'], data['mirrorFit']['rms'] if result['mode'] == 'proper' else 0, delta=1e-9)
            for row in result['structure']['rows']:
                np.testing.assert_allclose(row['image'], row['target'], atol=1e-10)

    def test_generator_intersections_projectors_and_zero(self):
        for name, data in REFERENCE['cases'].items():
            expected_prefix = [np.eye(3)]
            if name in ['d3', 'pyramid']:
                expected_prefix += [np.diag([0., 0, 1]), PROJECTORS[name]]
            elif name == 'octahedron':
                expected_prefix += [PROJECTORS[name]]*3
            else:
                expected_prefix += [PROJECTORS[name]]
            for projector, expected in zip(data['prefixProjectors'], expected_prefix):
                np.testing.assert_allclose(projector, expected, atol=1e-9)
        vectors = dict(z=[0, 0, 1], x=[1, 0, 0], sum=[1, 1, 1], zero=[0, 0, 0])
        for result in JS['polar']:
            change = np.eye(3) if result['components'] == 'original' else B
            vector = change @ np.array(vectors[result['trial']]) * result['amplitude']
            projector = change @ PROJECTORS[result['caseId']] @ change.T
            np.testing.assert_allclose(result['vector'], vector, atol=1e-12)
            np.testing.assert_allclose(result['projector'], projector, atol=1e-9)
            np.testing.assert_allclose(result['projected'], projector @ vector, atol=1e-9)
            self.assertEqual(result['allowed'], np.linalg.norm(projector @ vector-vector) < 1e-8)
            for generator in result['generators']:
                residual = (np.array(generator['matrix'])-np.eye(3)) @ vector
                np.testing.assert_allclose(generator['residual'], residual, atol=1e-12)
            self.assertTrue(result['zeroAllowed'])

    def test_lf_hashes_and_generator_reproducibility(self):
        self.assertEqual(REFERENCE['sourceHashNormalization'], 'utf8-lf-v1')
        for path, expected in REFERENCE['sourceHashes'].items():
            text = (ROOT/path).read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
            for variant in [text, text.replace('\n', '\r\n'), text.replace('\n', '\r')]:
                normalized = variant.replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')
                self.assertEqual(hashlib.sha256(normalized).hexdigest(), expected)
        spec = importlib.util.spec_from_file_location('chirality_generator', ROOT/'scripts/build-chirality-actions-reference.py')
        generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        fresh = generator.build()
        self.assertEqual(fresh['sourceHashes'], REFERENCE['sourceHashes'])
        for name, data in fresh['cases'].items():
            self.assertAlmostEqual(data['mirrorFit']['rms'], REFERENCE['cases'][name]['mirrorFit']['rms'], delta=1e-9)
            np.testing.assert_allclose(data['polarProjector'], REFERENCE['cases'][name]['polarProjector'], atol=1e-9)


if __name__ == '__main__':
    unittest.main()
