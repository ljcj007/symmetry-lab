"""Independent finite-slab enumeration and production-API reference checks."""
from pathlib import Path
from itertools import permutations, product
import hashlib
import importlib.util
import json
import unittest
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import browser_api

text = (ROOT / 'dist/layer-actions-reference.js').read_text(encoding='utf-8')
REFERENCE = json.loads(text.split('Object.freeze(', 1)[1].rsplit(');', 1)[0])
POSITIONS = np.array([[0., 0., -1.5], [0., 0., -.5], [0., 0., .5], [0., 0., 1.5]])


def independent_matches(r, t, labels, keep_labels=True, normal_period=None):
    mapped = POSITIONS @ r.T + t
    valid = []
    for perm in permutations(range(4)):
        if keep_labels and any(labels[i] != labels[j] for i, j in enumerate(perm)):
            continue
        delta = mapped - POSITIONS[list(perm)]
        delta[:, :2] -= np.round(delta[:, :2])
        if normal_period is not None:
            delta[:, 2] -= normal_period * np.round(delta[:, 2] / normal_period)
        if np.max(np.abs(delta)) < 1e-10:
            valid.append(list(perm))
    return valid


def independent_inherited_ops(labels):
    answer = {}
    # Enumerate signed permutations directly, without core cubic_ops or assignment.
    for axis in permutations(range(3)):
        for signs in product((-1, 1), repeat=3):
            r = np.zeros((3, 3), dtype=int)
            for i in range(3):
                r[i, axis[i]] = signs[i]
            if not np.array_equal(np.abs(r @ np.array([0, 0, 1])), [0, 0, 1]):
                continue
            matches = independent_matches(r, np.zeros(3), labels)
            if matches:
                assert len(matches) == 1
                answer[tuple(r.flat)] = matches[0]
    return answer


class LayerActionsScience(unittest.TestCase):
    def test_live_api_and_finite_asset(self):
        for name, expected_count, expected_flips in [('symmetric', 16, 8), ('marker', 8, 0)]:
            data = REFERENCE['cases'][name]
            result = browser_api.run('layer_symmetry_lab', data['input'])
            self.assertEqual(result['operations'], data['operations'])
            self.assertEqual(result['geometry']['unit'], data['positions'])
            self.assertEqual(result['geometry']['labels'][:4], data['labels'])
            self.assertEqual(result['geometry']['lattice'], np.eye(3).tolist())
            self.assertEqual(result['geometry']['normal'], [0, 0, 1])
            self.assertEqual(len(result['operations']), expected_count)
            self.assertEqual(sum(op['flipsNormal'] for op in result['operations']), expected_flips)
            independently = independent_inherited_ops(data['labels'])
            self.assertEqual(len(independently), expected_count)
            self.assertEqual(set(independently), {tuple(np.array(op['matrix'], dtype=int).flat) for op in result['operations']})
            # The core orders cubic matrices by Frobenius distance to I, then
            # their flattened integer tuple. Squared distances below are exact
            # integers, so no eigensolver, set iteration or float tie decides
            # the reference order on a different platform.
            ordered = sorted(independently, key=lambda flat: (
                sum((flat[3*i+j] - int(i == j))**2 for i in range(3) for j in range(3)), flat))
            self.assertEqual(ordered, [tuple(np.array(op['matrix'], dtype=int).flat) for op in result['operations']])
            for op in result['operations']:
                self.assertEqual(op['permutation'], independently[tuple(np.array(op['matrix'], dtype=int).flat)])
                self.assertEqual(op['residual'], 0)
                self.assertEqual(op['translation'], [0, 0, 0])

    def test_real_mirror_labels_and_plane_translation(self):
        mirror = np.diag([1, 1, -1])
        for shift in (0, 1):
            self.assertEqual(independent_matches(mirror, [shift, 0, 0], ['A']*4), [[3, 2, 1, 0]])
            self.assertEqual(independent_matches(mirror, [shift, 0, 0], ['A', 'A', 'A', 'surface-C']), [])
            self.assertEqual(independent_matches(mirror, [shift, 0, 0], ['A', 'A', 'A', 'surface-C'], False), [[3, 2, 1, 0]])
        op = REFERENCE['cases']['symmetric']['operations'][7]
        self.assertEqual(op['matrix'], mirror.tolist())
        self.assertEqual(op['permutation'], [3, 2, 1, 0])

    def test_normal_is_finite(self):
        self.assertEqual(independent_matches(np.eye(3), [0, 0, 4], ['A']*4), [])
        self.assertEqual(independent_matches(np.eye(3), [0, 0, 4], ['A']*4, normal_period=4), [[0, 1, 2, 3]])
        # Even the smallest residual is nonzero before the false normal wrap.
        diff = (POSITIONS + [0, 0, 4])[:, None, :] - POSITIONS[None, :, :]
        self.assertEqual(float(np.min(abs(diff[:, :, 2]))), 1)

    def test_source_hashes_and_reproducibility(self):
        self.assertEqual(REFERENCE['sourceHashNormalization'], 'utf8-lf-v1')
        for path, expected in REFERENCE['sourceHashes'].items():
            text = (ROOT / path).read_text(encoding='utf-8')
            lf = text.replace('\r\n', '\n').replace('\r', '\n')
            for variant in [lf, lf.replace('\n', '\r\n'), lf.replace('\n', '\r')]:
                normalized = variant.replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')
                self.assertEqual(hashlib.sha256(normalized).hexdigest(), expected)
        spec = importlib.util.spec_from_file_location('layer_reference_generator', ROOT / 'scripts/build-layer-actions-reference.py')
        generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        for variant in ['a\nb\n', 'a\r\nb\r\n', 'a\rb\r']:
            self.assertEqual(generator.normalized_source_bytes(variant), b'a\nb\n')
        self.assertEqual(generator.build(), REFERENCE)


if __name__ == '__main__':
    unittest.main()
