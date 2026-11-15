"""Rebuild exact half-translation references through the shared browser API."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))


def cases():
    rows = []
    for identifier, k, spinful, state in [
            ('spinful-gamma', [0, 0, 0], True, 'complex'),
            ('spinful-z', [0, 0, '1/2'], True, 'complex'),
            ('generic-longitudinal', [0, 0, '1/4'], True, 'complex'),
            ('generic-transverse', ['1/4', 0, 0], True, 'complex'),
            ('longitudinal-seventh', [0, 0, '1/7'], True, 'complex'),
            ('trim-transverse', ['1/2', '1/2', 0], True, 'complex'),
            ('equivalent-z-outside-first-zone', [1, -1, '3/2'], True, 'basis'),
            ('spinless-gamma', [0, 0, 0], False, 'complex'),
            ('spinless-z', [0, 0, '1/2'], False, 'complex'),
            ('spinless-generic', [0, 0, '1/4'], False, 'basis')]:
        # Browser text controls preserve submitted rational strings, including
        # integer literals. Numeric JSON inputs have separate core coverage.
        rows.append({'id': identifier, 'input': {'lab': 'antitranslation', 'k': [str(x) for x in k],
                                                'spinful': spinful, 'statePreset': state}})
    return rows


def compare(actual, expected, pointer='fixture', strict_input=False):
    if type(actual) is not type(expected):
        raise AssertionError(pointer+': JSON type changed')
    if isinstance(actual, dict):
        if list(actual) != list(expected):
            raise AssertionError(pointer+': keys/order changed')
        for key in actual:
            compare(actual[key], expected[key], pointer+'.'+key, strict_input or key == 'input')
    elif isinstance(actual, list):
        if len(actual) != len(expected):
            raise AssertionError(pointer+': length changed')
        for index, (left, right) in enumerate(zip(actual, expected)):
            compare(left, right, pointer+'['+str(index)+']', strict_input)
    elif isinstance(actual, float):
        if not math.isfinite(actual) or not math.isfinite(expected):
            raise AssertionError(pointer+': non-finite mirror')
        if strict_input:
            if struct.pack('!d', actual) != struct.pack('!d', expected):
                raise AssertionError(pointer+': original input bits changed')
        elif not math.isclose(actual, expected, rel_tol=1e-13, abs_tol=1e-13):
            raise AssertionError(pointer+': numeric mirror changed')
    elif actual != expected:
        raise AssertionError(pointer+': exact value changed')


def build(check=False, direct=False):
    if direct:
        from antitranslation_lab import run as calculate
    else:
        from browser_api import run
        calculate = lambda payload: run('teaching_labs', payload)
    rows = cases()
    for row in rows:
        row['result'] = calculate(row['input'])
        if not all(item['passed'] for item in row['result']['checks']):
            raise AssertionError(row['id']+': internal exact identity failed')
    names = ['dist/python/antitranslation_lab.py', 'dist/python/teaching_labs.py',
             'dist/python/browser_api.py']
    result = {'schema': 'symmetry-lab-antitranslation-fixture-1',
              'method': 'Development module.run only; regenerate with browser_api before release.' if direct else 'Actual browser_api.run teaching_labs; exact outputs, not fabricated UI trace data.',
              'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest() for name in names},
              'cases': rows}
    target = ROOT/'scripts/fixtures/antitranslation.json'
    if check:
        compare(result, json.loads(target.read_text(encoding='utf8')))
    else:
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf8')
    print(json.dumps({'path': str(target), 'cases': len(rows), 'bytes': target.stat().st_size,
                      'checked': check, 'publicAPI': not direct}))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--direct', action='store_true', help='Development only, before the dispatcher is integrated.')
    arguments = parser.parse_args()
    build(arguments.check, arguments.direct)
