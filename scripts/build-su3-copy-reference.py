"""Freeze all twelve exact octet-copy replies through the real public API.

--check recomputes every complete reply, then compares every JSON value and
source identity. The fixed canonical-core guards cannot be authorized by
editing sourceHashes in the generated fixture.
"""
from copy import deepcopy
from pathlib import Path
import argparse
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT/'dist/python'))

SCHEMA = 'symmetry-lab-su3-copy-fixture-1'
CANONICAL_COMMIT = 'abc1cf09a54cfc557e3dd0c2b75a3f235106a761'
# UTF-8/LF hashes independently checked against the unchanged production HEAD
# above. These are intentionally fixed rather than inferred from a fixture.
PROTECTED_CG = {
    'dist/python/su3_cg.py': '201e06fe4ee0f168813e23fcf7819f087b70b3912ae16ac94a12b4b14791b794',
    'dist/python/su3_cg_exact.py': '7742e5b74e053023955865f6f18e94461b284ab06fa04c353bb19c02cabeb7f2',
}
SOURCE_PATHS = ('dist/python/su3_copy_lab.py', 'dist/python/su3_cg.py',
                'dist/python/su3_cg_exact.py', 'dist/python/teaching_labs.py',
                'dist/python/browser_api.py')
TARGET = ROOT/'scripts/fixtures/su3-copy.json'


def source_hash(name):
    text = (ROOT/name).read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def cases():
    return [{'id': f'angle-{angle}-phase-{phase}',
             'input': {'lab': 'su3_copy', 'angle': angle, 'phase': phase}}
            for angle in (0, 45, 90) for phase in ('1', 'i', '-1', '-i')]


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
    start = time.perf_counter()
    source_hashes = {name: source_hash(name) for name in SOURCE_PATHS}
    for name, known in PROTECTED_CG.items():
        if source_hashes[name] != known:
            raise AssertionError(name+': protected canonical core changed from '+CANONICAL_COMMIT)
    from browser_api import run
    rows = cases()
    for row in rows:
        request_before = deepcopy(row['input'])
        row['result'] = run('teaching_labs', row['input'])
        if row['input'] != request_before or row['result']['request'] != request_before:
            raise AssertionError(row['id']+': input identity changed')
        if not all(item['passed'] and item['residual']['exact'] == '0'
                   for item in row['result']['checks']):
            raise AssertionError(row['id']+': exact check failed')
        if not row['result']['canonical']['reply']['exactCGMatrix']:
            raise AssertionError(row['id']+': full canonical CG reply is missing')
        canonical = row['result']['canonical']
        if canonical.get('serialization') != 'python-json-utf8-sorted-v1':
            raise AssertionError(row['id']+': canonical source serialization identity is missing')
        serialized = canonical.get('serialized')
        if not isinstance(serialized, str):
            raise AssertionError(row['id']+': original canonical JSON string is missing')
        if hashlib.sha256(serialized.encode('utf-8')).hexdigest() != canonical['sha256']:
            raise AssertionError(row['id']+': preserved canonical JSON bytes fail their digest')
        compare(json.loads(serialized), canonical['reply'], row['id']+'.canonical.serialized')
    if source_hashes != {name: source_hash(name) for name in SOURCE_PATHS}:
        raise AssertionError('Production source changed during public API calculation')
    document = {'schema': SCHEMA,
        'method': 'Actual browser_api.run("teaching_labs", input) for all 12 angle/phase presets; full replies including canonical CG request and reply, without fabricated or omitted values.',
        'canonicalCoreGuard': {'commit': CANONICAL_COMMIT, 'sourceHashes': dict(PROTECTED_CG)},
        'sourceHashEncoding': 'UTF-8 with LF line endings',
        'sourceHashes': source_hashes, 'cases': rows}
    if check:
        compare(document, json.loads(TARGET.read_text(encoding='utf-8')))
    else:
        # Complete compact JSON avoids multiplying the 12 complete 64x64 source
        # replies by indentation whitespace. No scientific field is removed.
        text = json.dumps(document, ensure_ascii=False, separators=(',', ':'), allow_nan=False)+'\n'
        with TARGET.open('w', encoding='utf-8', newline='\n') as stream:
            stream.write(text)
    print(json.dumps({'path': str(TARGET), 'cases': len(rows),
        'bytes': TARGET.stat().st_size, 'checked': check, 'publicAPI': True,
        'seconds': round(time.perf_counter()-start, 6)}, ensure_ascii=False))
    return document


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
