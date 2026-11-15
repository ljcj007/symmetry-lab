"""Rebuild exact square-operation references through the genuine browser API."""
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))


def cases():
    result = []
    for identifier, first, second, point, selected in [
        ('rotation-then-mirror', 'R', 'M', [1, 2], ['E', 'R']),
        ('mirror-then-rotation', 'M', 'R', [1, 2], ['R', 'M']),
        ('commuting-rotations', 'R', 'R2', [-2, 1], ['E', 'R', 'R2', 'R3']),
        ('origin-hides-noncommutation', 'R', 'M', [0, 0], ['M']),
        ('nonzero-fixed-probe', 'M', 'E', [1, 0], ['E', 'M']),
        ('second-probe-distinguishes', 'M', 'E', [0, 1], ['R2M', 'R3M']),
        ('full-eight-operation-set', 'R3M', 'RM', [-2, -2],
         ['E', 'R', 'R2', 'R3', 'M', 'RM', 'R2M', 'R3M']),
        ('inverse-quarter-turns', 'R', 'R3', [2, -1], ['R3'])
    ]:
        result.append({'id': identifier, 'input': {'lab': 'composition', 'first': first,
            'second': second, 'point': point, 'candidateSet': selected}})
    return result


def compare(actual, expected, pointer='fixture'):
    if type(actual) is not type(expected):
        raise AssertionError(pointer+': JSON type changed')
    if isinstance(actual, dict):
        if list(actual) != list(expected):
            raise AssertionError(pointer+': keys or order changed')
        for key in actual:
            compare(actual[key], expected[key], pointer+'.'+key)
    elif isinstance(actual, list):
        if len(actual) != len(expected):
            raise AssertionError(pointer+': length changed')
        for index, (left, right) in enumerate(zip(actual, expected)):
            compare(left, right, pointer+'['+str(index)+']')
    elif actual != expected:
        raise AssertionError(pointer+': exact value changed')


def build(check=False):
    from browser_api import run
    rows = cases()
    for row in rows:
        row['result'] = run('teaching_labs', row['input'])
        assert row['result']['input'] == row['input']
        assert all(item['passed'] for item in row['result']['checks'])
    paths = ['dist/python/composition_lab.py', 'dist/python/teaching_labs.py', 'dist/python/browser_api.py']
    document = {'schema': 'symmetry-lab-composition-fixture-1',
                'method': 'Actual browser_api.run teaching_labs; exact integer calculations, not fabricated UI traces.',
                'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
                                 for name in paths}, 'cases': rows}
    target = ROOT/'scripts/fixtures/composition.json'
    if check:
        compare(document, json.loads(target.read_text(encoding='utf-8')))
    else:
        target.write_text(json.dumps(document, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    print(json.dumps({'path': str(target), 'cases': len(rows), 'bytes': target.stat().st_size,
                      'checked': check, 'publicAPI': True}))
    return document


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
