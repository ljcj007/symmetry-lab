"""Build genuine Python/API results and grading exchanges for construction UI QA."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run

CORE_FILES = ('salc_lab.py', 'wavevector_lab.py', 'nonsymmorphic_lab.py', 'symmetry_grading.py')


def normalized_hash(path):
    return hashlib.sha256(path.read_text(encoding='utf-8').encode('utf-8')).hexdigest()


def main():
    catalog = ROOT/'dist/data/construction-materials.json'
    data = json.loads(catalog.read_text(encoding='utf-8'))
    requests = {}
    for module in data['modules']:
        defaults = {f['key']: f['default'] for f in module['fields']}
        for preset in module['presets']:
            if preset['id'] in requests:
                raise ValueError('Duplicate preset ID: '+preset['id'])
            requests[preset['id']] = {'action': module['action'], 'input': {**defaults, **preset['input']}}
    results = {key: run(r['action'], r['input']) for key, r in requests.items()}
    grading = {}
    for preset, result in results.items():
        for task in result['grading']['tasks']:
            for kind in ('subspace', 'projector'):
                for example in ('reference', 'equivalent', 'wrong'):
                    request = {'task': task, 'kind': kind, 'mode': 'example', 'example': example}
                    response = run('symmetry_grading', request)
                    grade_request = {'task': task, 'kind': kind, 'mode': 'grade', 'answer': response['candidate']}
                    grade_response = run('symmetry_grading', grade_request)
                    if grade_response['passed'] != (example != 'wrong'):
                        raise AssertionError(preset+'/'+task['id']+'/'+kind+'/'+example)
                    grading[preset+'/'+task['id']+'/'+kind+'/'+example] = {
                        'example': {'request': request, 'response': response},
                        'grade': {'request': grade_request, 'response': grade_response}}
    fixture = {'format': 'real-python-construction-fixtures', 'release': data['release'],
               'sourceHashNormalization': 'utf8-lf-v1',
               'sourceHashes': {name: normalized_hash(ROOT/'dist/python'/name) for name in CORE_FILES},
               'catalogSHA256': normalized_hash(catalog), 'requests': requests, 'results': results, 'grading': grading}
    raw = json.dumps(fixture, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
    target = ROOT/'scripts/fixtures/construction.json.gz'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(gzip.compress(raw, mtime=0))
    print('Construction fixtures:', len(results), 'real results;', len(grading), 'actual Python grading exchanges;',
          len(raw), 'raw bytes;', target.stat().st_size, 'compressed bytes.')


if __name__ == '__main__':
    main()
