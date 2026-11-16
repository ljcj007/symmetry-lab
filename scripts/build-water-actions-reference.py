"""Freeze the complete water ledger through the real shared public API."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))


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
            raise AssertionError(path+': drawing float bits differ')
    elif actual != expected:
        raise AssertionError(path+': exact value differs')


def build(check=False):
    from browser_api import run
    payload = {}
    result = run('water_actions', payload)
    if result['schema'] != 'symmetry-lab-water-actions-1' or not all(row['passed'] for row in result['checks']):
        raise AssertionError('Actual API returned an invalid water ledger')
    sources = ['dist/python/water_actions.py', 'dist/python/browser_api.py']
    document = {'schema': 'symmetry-lab-water-actions-fixture-1',
        'method': 'Actual browser_api.run water_actions with empty input; exact integer action/character ledger, not manufactured UI traces.',
        'sourceHashEncoding': 'utf8-lf-v1',
        'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest() for name in sources},
        'cases': [{'id': 'water-xz-all-four-actions', 'action': 'water_actions', 'input': payload, 'result': result}]}
    target = ROOT/'scripts/fixtures/water-actions.json'
    if check:
        compare(document, json.loads(target.read_text(encoding='utf8')))
    else:
        target.write_text(json.dumps(document, ensure_ascii=False, allow_nan=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'path': str(target), 'cases': 1, 'operations': len(result['operations']),
        'columns': sum(len(o['columns']) for o in result['operations']),
        'bytes': target.stat().st_size, 'checked': check, 'publicAPI': True}))
    return document


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
