"""Freeze all fifteen SU(3) basis replies through the genuine public API."""
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))


def cases():
    return [{'id': f'irrep-{p}-{q}', 'input': {'lab': 'su3_basis', 'p': p, 'q': q}}
            for total in range(5) for p in range(total, -1, -1) for q in [total-p]]


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
    paths = ['dist/python/su3_basis_lab.py', 'dist/python/su3_cg.py',
             'dist/python/su3_cg_exact.py', 'dist/python/teaching_labs.py',
             'dist/python/browser_api.py']
    document = {'schema': 'symmetry-lab-su3-basis-fixture-1',
        'method': 'Actual browser_api.run teaching_labs for all fifteen p+q<=4 irreps; canonical exact GT matrices, not fabricated UI traces.',
        'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
                         for name in paths}, 'cases': rows}
    target = ROOT/'scripts/fixtures/su3-basis.json'
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
