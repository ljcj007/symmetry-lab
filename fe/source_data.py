"""Portable source selection: explicit environment, local download, workspace."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import urllib.request

HERE = Path(__file__).resolve().parent
WORKSPACE_SOURCE = HERE.parents[1]/'phase9/data/electronic/Fe-222-pw'
EXPECTED_PSP_SHA256 = '371345212f2e0e81bfb97b9562099b39e3901399513a980386643bff2c3270d5'


def source_directory():
    if os.environ.get('FE_SOURCE_DATA'):
        return Path(os.environ['FE_SOURCE_DATA']).resolve()
    local = HERE/'data/Fe-222-pw'
    if local.is_dir():
        return local
    if WORKSPACE_SOURCE.is_dir():
        return WORKSPACE_SOURCE
    return local


def download(include_wavefunctions=False):
    manifest = json.loads((HERE/'SOURCE_MANIFEST.json').read_text(encoding='utf-8'))
    target = HERE/'data/Fe-222-pw'
    wanted = {'Fe_pw_scf_in', 'Fe_pw_nscf_in', 'Fe.win', 'Fe.save/Fe.jry.pbe.UPF',
              'Fe.save/data-file-schema.xml', 'LICENSE.wannierberri'}
    if include_wavefunctions:
        wanted.update(f'Fe.save/wfc{i}.dat' for i in range(1, 9))
    checked = []
    for row in manifest['files']:
        if row['path'] not in wanted:
            continue
        path = (target/row['path']).resolve()
        if not path.is_relative_to(target.resolve()):
            raise ValueError('Source manifest path escapes the download directory')
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            request = urllib.request.Request(row['url'])
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read(row['bytes']+1)
            if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
                raise ValueError('Source download length or SHA mismatch: '+row['path'])
            path.write_bytes(data)
        data = path.read_bytes()
        if len(data) != row['bytes'] or hashlib.sha256(data).hexdigest() != row['sha256']:
            raise ValueError('Existing source file differs from pinned bytes: '+row['path'])
        checked.append(row['path'])
    if set(checked) != wanted:
        raise ValueError('Manifest does not supply every requested input')
    report = {'status': 'PINNED_SOURCE_HASHES_VERIFIED', 'files': checked,
              'include_wavefunctions': include_wavefunctions, 'commit': manifest['commit'],
              'new_DFT_calculation': False}
    (target/'DOWNLOAD_CHECK.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--include-wavefunctions', action='store_true')
    args = ap.parse_args()
    download(args.include_wavefunctions)
