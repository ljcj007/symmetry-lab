"""Bounded version/startup probe after verified local extraction only."""
from pathlib import Path
import json
import os
import subprocess
import time
from acquire_qe import HERE, DIGEST
from analyze_fe import sha, write_json


def main():
    record = json.loads((HERE/'software/ACQUISITION.json').read_text(encoding='utf-8'))
    if record['archive_sha256'] != DIGEST or record['system_installation']:
        raise ValueError('Verified portable acquisition required')
    candidates = record['pw_executables']
    if len(candidates) != 1:
        raise ValueError('Expected exactly one portable pw.exe')
    executable = HERE/candidates[0]
    folder = HERE/'software/startup_probe'
    folder.mkdir(exist_ok=False)
    environment = os.environ.copy()
    environment.update({'OMP_NUM_THREADS': '2', 'MKL_NUM_THREADS': '2'})
    start = time.time()
    # Explicit empty stdin prevents an unsupported help flag from waiting for input.
    result = subprocess.run([str(executable), '-h'], cwd=folder, input=b'',
                            capture_output=True, timeout=30, env=environment)
    (folder/'stdout.txt').write_bytes(result.stdout)
    (folder/'stderr.txt').write_bytes(result.stderr)
    text = result.stdout.decode(errors='replace')
    report = {'status': 'PWSCF_7_5_BANNER_OBSERVED' if 'PWSCF' in text and 'v.7.5' in text else 'STARTUP_REQUIRES_REVIEW',
              'returncode': result.returncode, 'wall_seconds': time.time()-start,
              'executable': str(executable), 'executable_sha256': sha(executable),
              'archive_sha256': DIGEST, 'new_DFT_calculation': False,
              'stdout_sha256': sha(folder/'stdout.txt'), 'stderr_sha256': sha(folder/'stderr.txt')}
    write_json(folder/'PROBE.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
