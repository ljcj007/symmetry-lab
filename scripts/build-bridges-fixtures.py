"""Build genuine browser-API preset outputs, never handwritten golden curves.

UTF-8/LF source hashes make semantic source changes stale without treating a
Windows CRLF checkout as a different algorithm. Gzip timestamps are fixed.
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run

CORE_FILES = ('manybody_spectra_lab.py', 'hubbard_lab.py', 'polaron_lab.py',
              'density_matrix_lab.py', 'symmetry_workshop.py')


def normalized_hash(path):
    return hashlib.sha256(path.read_text(encoding='utf-8').encode('utf-8')).hexdigest()


def main():
    catalog_path = ROOT/'dist/data/bridges-materials.json'
    data = json.loads(catalog_path.read_text(encoding='utf-8'))
    requests = {}
    for module in data['modules']:
        defaults = {field['key']: field['default'] for field in module['fields']}
        for preset in module['presets']:
            if preset['id'] in requests:
                raise ValueError('Duplicate fixture ID: '+preset['id'])
            requests[preset['id']] = {'action': module['action'], 'input': {**defaults, **preset['input']}}
    results = {key: run(request['action'], request['input']) for key, request in requests.items()}
    fixture = {
        'format': 'real-python-bridges-fixtures', 'release': data['release'],
        'sourceHashNormalization': 'utf8-lf-v1',
        'sourceHashes': {name: normalized_hash(ROOT/'dist/python'/name) for name in CORE_FILES},
        'catalogSHA256': normalized_hash(catalog_path),
        'requests': requests, 'results': results,
    }
    raw = json.dumps(fixture, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
    target = ROOT/'scripts/fixtures/bridges.json.gz'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(gzip.compress(raw, mtime=0))
    print('Bridges fixtures:', len(results), 'real results;', len(raw), 'raw bytes;',
          target.stat().st_size, 'compressed bytes; 5 normalized core hashes.')


if __name__ == '__main__':
    main()
