"""Rebuild and validate the three browser datasets from vendored GPL text data.

From the site directory:
  python scripts/data/rebuild_data.py          # rebuild dist/data/*.json
  python scripts/data/rebuild_data.py --check  # temporary build, byte comparison

SPDX-License-Identifier: GPL-3.0
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import shutil
import uuid

sys.dont_write_bytecode = True
from paths import SITE, UPSTREAM

FILES = ('space-groups.json', 'magnetic-groups.json', 'points.json')
STEPS = ('extract_space_groups.py', 'extract_msg_data.py',
         'enrich_symmetry_data.py', 'validate_msg_data.py')


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_sources():
    manifest = json.loads((UPSTREAM / 'manifest.json').read_text(encoding='utf-8'))
    for item in manifest['files']:
        path = UPSTREAM / item['path']
        if not path.is_file() or sha256(path) != item['sha256']:
            raise SystemExit(f"Vendored source differs from manifest: {item['path']}")
    print(f"Verified {len(manifest['files'])} vendored text files against SHA-256 manifest.", flush=True)


def rebuild(output):
    output.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, SYMMETRY_DATA_DIR=str(output), PYTHONIOENCODING='utf-8',
               PYTHONDONTWRITEBYTECODE='1')
    for step in STEPS:
        subprocess.run([sys.executable, str(Path(__file__).with_name(step))],
                       cwd=SITE, env=env, check=True)
    return {name: {'bytes': (output / name).stat().st_size,
                   'sha256': sha256(output / name)} for name in FILES}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true',
                        help='Build in a temporary directory and require byte-identical public datasets.')
    parser.add_argument('--output', type=Path,
                        help='Alternate output directory; default dist/data. Relative paths use current working directory.')
    args = parser.parse_args()
    if args.check and args.output:
        parser.error('--check and --output are mutually exclusive')
    verify_sources()
    if args.check:
        # Inherit workspace ACLs. Python 3.13 mkdtemp(mode=0700) can deny child
        # processes access under Windows restricted tokens, even inside cwd.
        temporary = SITE / f'.data-build-{uuid.uuid4().hex}'
        temporary.mkdir()
        assert temporary.resolve().is_relative_to(SITE.resolve())
        try:
            result = rebuild(temporary)
            for name in FILES:
                if result[name]['sha256'] != sha256(SITE / 'dist/data' / name):
                    raise SystemExit(f'Rebuilt dataset differs: {name}')
            print(json.dumps({'byteIdentical': True, 'datasets': result}, indent=2))
        finally:
            assert temporary.resolve().is_relative_to(SITE.resolve())
            shutil.rmtree(temporary)
    else:
        result = rebuild((args.output or SITE / 'dist/data').resolve())
        print(json.dumps({'rebuilt': True, 'datasets': result}, indent=2))


if __name__ == '__main__':
    main()
