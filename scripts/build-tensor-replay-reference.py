"""Generate complete real API references for the optional exact tensor replay."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
INVERSION = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
C2 = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]]
C4 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
C3 = [[0, 0, 1], [1, 0, 0], [0, 1, 0]]
TRIGONAL = [['-1/2', '-sqrt(3)/2', 0], ['sqrt(3)/2', '-1/2', 0], [0, 0, 1]]
TILTED_C2 = [['-7/9', '4/9', '4/9'], ['4/9', '-1/9', '8/9'], ['4/9', '8/9', '-1/9']]
RATIONAL_ROTATION = [['3/5', '-4/5', 0], ['4/5', '3/5', 0], [0, 0, 1]]


def custom(kind, operations):
    return {'preset': 'custom', 'tensor': kind, 'samples': 12, 'replay': True,
            'generators': [{'rotation': rotation, 'time_reversal': prime}
                           for rotation, prime in operations]}


CASES = [
    ('c2-dielectric', custom('dielectric', [(C2, False)])),
    ('c4-dielectric', custom('dielectric', [(C4, False)])),
    ('cubic-dielectric', custom('dielectric', [(C4, False), (C3, False)])),
    ('inversion-magnetoelectric', custom('magnetoelectric', [(INVERSION, False)])),
    ('time-magnetoelectric', custom('magnetoelectric', [(IDENTITY, True)])),
    ('antiinversion-magnetoelectric', custom('magnetoelectric', [(INVERSION, True)])),
    ('trigonal-dielectric', custom('dielectric', [(TRIGONAL, False)])),
    ('tilted-c2-dielectric', custom('dielectric', [(TILTED_C2, False)])),
    ('gray-cubic-96-dielectric', {'preset': 'cubic_m3m', 'tensor': 'dielectric', 'samples': 12, 'replay': True}),
    ('unsupported-piezoelectric', {'preset': 'zincblende_td', 'tensor': 'piezoelectric', 'samples': 12, 'replay': True}),
    ('unsupported-elasticity', {'preset': 'cubic_m3m', 'tensor': 'elasticity', 'samples': 12, 'replay': True}),
    ('closure-bound-dielectric', custom('dielectric', [(RATIONAL_ROTATION, False)])),
]


def build():
    files = ['dist/python/property_tensors.py', 'dist/python/browser_api.py']
    return {'schema': 'symmetry-lab-tensor-replay-references-1',
            'generatedBy': 'scripts/build-tensor-replay-reference.py',
            'sourceHashNormalization': 'utf8-lf-v1',
            'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest()
                             for name in files},
            'cases': [{'id': name, 'input': payload, 'result': run('tensors', payload)} for name, payload in CASES]}


def same(actual, expected, path='root'):
    # Exact strings encode the authoritative symbolic values. Ordinary numerical
    # response/plot mirrors permit only cross-platform floating-point roundoff.
    if type(actual) is float and type(expected) in (int, float):
        if not math.isclose(actual, expected, rel_tol=1e-13, abs_tol=1e-13):
            raise AssertionError(path + ': numerical reference differs')
    elif isinstance(actual, dict) and isinstance(expected, dict):
        if actual.keys() != expected.keys():
            raise AssertionError(path + ': keys differ')
        for key in actual:
            same(actual[key], expected[key], path + '.' + key)
    elif isinstance(actual, list) and isinstance(expected, list):
        if len(actual) != len(expected):
            raise AssertionError(path + ': length differs')
        for index, (a, b) in enumerate(zip(actual, expected)):
            same(a, b, path + '[' + str(index) + ']')
    elif type(actual) is not type(expected) or actual != expected:
        raise AssertionError(path + ': exact reference differs')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    target = ROOT / 'scripts/fixtures/tensor-replay.json'
    data = build()
    if args.check:
        same(data, json.loads(target.read_text(encoding='utf8')))
    else:
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8')
    print(json.dumps({'realAPIReferences': len(data['cases']),
                      'availableReplays': sum(row['result']['replay']['available'] for row in data['cases']),
                      'checked' if args.check else 'generated': str(target)}))
