"""Finite chirality/polarity teaching references from the existing public API."""
from pathlib import Path
import hashlib
import json
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import browser_api

BASE = dict(motif='d3', handedness=1, noise=0, tolerance=.01,
            optical='natural', angle=20)
SOURCES = ('dist/python/symmetry_frontiers.py', 'dist/python/browser_api.py',
           'dist/data/frontiers-materials.json')


def source_bytes(text):
    return text.replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')


def build():
    c3 = np.array([[-.5, -np.sqrt(3)/2, 0], [np.sqrt(3)/2, -.5, 0], [0, 0, 1]])
    specs = dict(d3=[('c3', c3), ('c2', np.diag([1, -1, -1]))],
                 pyramid=[('c4', [[0, -1, 0], [1, 0, 0], [0, 0, 1]]),
                          ('mirror', np.diag([1, -1, 1]))],
                 octahedron=[('inversion', -np.eye(3)),
                             ('c4', [[0, -1, 0], [1, 0, 0], [0, 0, 1]]),
                             ('cycle', [[0, 0, 1], [1, 0, 0], [0, 1, 0]])],
                 tetra=[('identity', np.eye(3))])
    cases = {}
    for motif, wanted in specs.items():
        payload = BASE | dict(motif=motif)
        result = browser_api.run('chirality_polarity_lab', payload)
        generators, prefix_projectors = [], [np.eye(3).tolist()]
        for name, matrix in wanted:
            operation = min(result['operations'], key=lambda o: np.linalg.norm(np.array(o['matrix'])-matrix))
            if np.linalg.norm(np.array(operation['matrix'])-matrix) > 1e-8:
                raise AssertionError('Required generator missing from actual API')
            generators.append(dict(id=name, operationIndex=result['operations'].index(operation), **operation))
            stacked = np.vstack([np.array(g['matrix'])-np.eye(3) for g in generators])
            _, singular, vh = np.linalg.svd(stacked, full_matrices=False)
            basis = vh[singular < 1e-7]
            prefix_projectors.append((basis.T @ basis).tolist())
        basis = np.array(result['polarBasis'], float).reshape(-1, 3)
        cases[motif] = dict(input=payload, geometry=result['geometry'], mirrorFit=result['mirrorFit'],
                            fitTranslation=[0, 0, 0], operations=result['operations'],
                            generators=generators, prefixProjectors=prefix_projectors,
                            polarBasis=result['polarBasis'], polarProjector=(basis.T @ basis).tolist(),
                            polarDimension=result['summary'][2]['value'], chiral=result['summary'][0]['value'])
    return dict(format='real-python-chirality-actions-reference-v1',
                action='chirality_polarity_lab', module='chirality',
                scope='four-centered-finite-motifs-no-noise-original-handedness',
                lengthUnit='model-length', coordinateConvention='active column vectors; geometry rows use matrix transpose',
                fitTranslationConvention='zero for the already-centered source and mirror point sets; not an extra API field',
                sourceHashNormalization='utf8-lf-v1',
                sourceHashes={path: hashlib.sha256(source_bytes((ROOT/path).read_text(encoding='utf-8'))).hexdigest()
                              for path in SOURCES}, cases=cases)


if __name__ == '__main__':
    target = ROOT / 'dist/chirality-actions-reference.js'
    target.write_text('// Generated from browser_api.run by scripts/build-chirality-actions-reference.py.\n'
                      'export const CHIRALITY_ACTIONS_REFERENCE = Object.freeze('
                      + json.dumps(build(), ensure_ascii=True, sort_keys=True, indent=2) + ');\n',
                      encoding='utf-8', newline='\n')
    print(target.name)
