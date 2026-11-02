"""Test the exported core in a detached directory with verified source copies."""
from pathlib import Path
import datetime
import json
import os
import shutil
import subprocess
import sys
from analyze_fe import sha, write_json
from source_data import source_directory

HERE = Path(__file__).resolve().parent


def main():
    tag = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    package = HERE/'portability_check'/tag
    package.mkdir(parents=True)
    inventory = json.loads((HERE/'PORTABLE_FILES.json').read_text(encoding='utf-8'))
    for name in inventory['include']:
        target = package/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(HERE/name, target)
    source_manifest = json.loads((HERE/'SOURCE_MANIFEST.json').read_text(encoding='utf-8'))
    for item in source_manifest['files']:
        source = source_directory()/item['path']
        if source.stat().st_size != item['bytes'] or sha(source) != item['sha256']:
            raise ValueError('Unverified source fixture')
        target = package/'data/Fe-222-pw'/item['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    env = os.environ.copy()
    env.pop('FE_SOURCE_DATA', None)
    result = subprocess.run([sys.executable, 'validate_fe.py'], cwd=package, env=env,
                            capture_output=True, timeout=60)
    (package/'stdout.txt').write_bytes(result.stdout)
    (package/'stderr.txt').write_bytes(result.stderr)
    tests = json.loads((package/'reports/TEST_REPORT.json').read_text(encoding='utf-8'))
    report = {'status': 'PASS' if result.returncode == 0 and tests['status']=='PASS' else 'FAIL',
              'package': package.relative_to(HERE).as_posix(), 'test_count': tests['tests_run'],
              'returncode': result.returncode, 'network_used': False, 'phase9_code_required': False,
              'fixtures_copied_after_full_pinned_hash_verification': True,
              'exported_code_sha256': {name: sha(package/name) for name in inventory['include'] if name.endswith('.py')},
              'stdout_sha256': sha(package/'stdout.txt'), 'stderr_sha256': sha(package/'stderr.txt')}
    write_json(HERE/'reports/PORTABLE_CHECK.json', report)
    print(json.dumps(report))
    if report['status'] != 'PASS':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
