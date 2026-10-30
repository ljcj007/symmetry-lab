"""Compute actual bridge-project outputs for browser-only JavaScript tests.

Usage: node scripts/test-bridges-projects.mjs --requests |
       python scripts/build-bridges-project-fixtures.py > scripts/fixtures/bridges-projects.json
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
from browser_api import run

requests = json.load(sys.stdin)
results = {key: run(request['action'], request['input']) for key, request in requests.items()}
hashes = {path.name: hashlib.sha256(path.read_text(encoding='utf-8').encode('utf-8')).hexdigest()
          for path in sorted((ROOT / 'dist/python').glob('*.py'))}
json.dump({'format': 'real-python-bridges-project-fixtures', 'requests': requests, 'results': results,
           'sourceHashNormalization': 'utf8-lf-v1', 'sourceHashes': hashes}, sys.stdout,
          ensure_ascii=False, allow_nan=False, separators=(',', ':'))
