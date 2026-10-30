"""Build nine genuine Python outputs; run from any cwd with Python and Node."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

requests = json.loads(subprocess.check_output(
    ['node', 'scripts/test-principles-projects.mjs', '--requests'], cwd=ROOT, encoding='utf-8'))
results = {key: run(request['action'], request['input']) for key, request in requests.items()}
sources = ['browser_api.py', 'order_parameter_lab.py', 'exchange_symmetry_lab.py',
           'conservation_lab.py', 'density_matrix_lab.py']
hashes = {name: hashlib.sha256((ROOT / 'dist/python' / name).read_text(encoding='utf-8').encode('utf-8')).hexdigest()
          for name in sources}
payload = {'format': 'real-python-principles-project-fixtures', 'requests': requests, 'results': results,
           'sourceHashNormalization': 'utf8-lf-v1', 'sourceHashes': hashes}
raw = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
target = ROOT / 'scripts/fixtures/principles-projects.json.gz'
target.write_bytes(gzip.compress(raw, mtime=0))
print(f'Built {len(results)} genuine stages: {len(raw)} JSON bytes, {target.stat().st_size} gzip bytes')
