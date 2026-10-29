"""Produce genuine project-stage outputs on stdout from JSON requests on stdin.

No golden numerical output is invented or committed. The Node contract test
resolves live catalogue presets, passes the exact requests, and checks physics.
"""
import json
import hashlib
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
from browser_api import run

requests=json.load(sys.stdin)
results={}
for key,request in requests.items():
    results[key]=run(request['action'],request['input'])
# Universal-newline text reading canonicalizes CRLF and CR to LF. Re-encode
# as UTF-8; preserve every other character, including whitespace and comments.
# Git's Windows checkout conversion must not look like an algorithm change.
hashes={p.name:hashlib.sha256(p.read_text(encoding='utf-8').encode('utf-8')).hexdigest()
        for p in sorted((ROOT/'dist/python').glob('*.py'))}
json.dump({'format':'real-python-pathways-project-fixtures','requests':requests,'results':results,
           'sourceHashNormalization':'utf8-lf-v1','sourceHashes':hashes},
          sys.stdout,ensure_ascii=False,allow_nan=False,separators=(',',':'))
