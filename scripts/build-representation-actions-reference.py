"""Freeze five exact representation ledgers through the real shared API."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
POINTS = ((1, 2), (0, 0), (1, 0), (0, 1), (-2, -1))


def compare(actual, expected, path='fixture'):
    if type(actual) is not type(expected):
        raise AssertionError(path+': JSON type differs')
    if isinstance(actual, dict):
        if list(actual) != list(expected):
            raise AssertionError(path+': keys/order differ')
        for key in actual:
            compare(actual[key], expected[key], path+'/'+key)
    elif isinstance(actual, list):
        if len(actual) != len(expected):
            raise AssertionError(path+': array length differs')
        for index, (left, right) in enumerate(zip(actual, expected)):
            compare(left, right, path+'/'+str(index))
    elif type(actual) is float:
        if not math.isfinite(actual) or not math.isfinite(expected) or struct.pack('!d', actual) != struct.pack('!d', expected):
            raise AssertionError(path+': float bits differ')
    elif actual != expected:
        raise AssertionError(path+': exact value differs')


def build(check=False):
    from browser_api import run
    cases = []
    for point in POINTS:
        payload = {'point': list(point)}
        result = run('representation_actions', payload)
        if result['schema'] != 'symmetry-lab-representation-actions-1' or not all(row['passed'] for row in result['checks']):
            raise AssertionError('Actual API returned an invalid representation ledger')
        cases.append({'id': 'representation-point-'+str(point[0])+'-'+str(point[1]),
                      'action': 'representation_actions', 'input': payload, 'result': result})
    sources = ['dist/python/representation_actions.py', 'dist/python/browser_api.py']
    document = {'schema': 'symmetry-lab-representation-actions-fixture-1',
        'method': 'Five actual browser_api.run representation_actions calls. Exact four-family ledgers include the deliberately inconsistent family; its false multiplication identities are teaching counterexamples, not computation failures.',
        'sourceHashEncoding': 'utf8-lf-v1',
        'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest() for name in sources},
        'cases': cases}
    target = ROOT/'scripts/fixtures/representation-actions.json'
    if check:
        compare(document, json.loads(target.read_text(encoding='utf8')))
    else:
        target.write_text(json.dumps(document, ensure_ascii=False, allow_nan=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'path': str(target), 'cases': len(cases), 'familiesPerCase': 4,
        'orderedPairsPerFamily': 64, 'bytes': target.stat().st_size, 'checked': check, 'publicAPI': True}))
    return document


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
