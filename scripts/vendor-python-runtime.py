"""Vendor the exact browser runtime; --check is offline and does not change files."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/vendor/pyodide/314.0.7'
TARBALL = 'https://registry.npmmirror.com/pyodide/-/pyodide-314.0.7.tgz'
TAR_SHA512 = '0YvXxEhfEdpLfb/XkM2BFAeMROq0iMUX2bzzH9pOttyMcWkwq+HbE5uyuGD82LN7y2q+SNvi/6V5JEsOlD2R1A=='
LOCK_SHA256 = '5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010'
CDN = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/'
PACKAGES = ('numpy', 'sympy', 'mpmath', 'pyyaml')
CORE = ('pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip')
NOTICE = '''Symmetry Lab self-hosted Python runtime
=====================================

Pyodide 314.0.7, containing CPython 3.14.2, is distributed unmodified here.
Pyodide is Copyright Pyodide contributors and Mozilla, under MPL-2.0.
The complete license is LICENSE-PYODIDE.txt. Corresponding source:
https://github.com/pyodide/pyodide/tree/314.0.7
https://github.com/pyodide/pyodide/releases/tag/314.0.7

CPython is Copyright Python Software Foundation and its contributors.
LICENSE-CPYTHON.txt contains the PSF license and historical notices.
Corresponding source: https://github.com/python/cpython/tree/v3.14.2

Included scientific packages retain their upstream licenses:
NumPy 2.4.6 (BSD-3-Clause and bundled component notices),
SymPy 1.14.0 (BSD and bundled notices), mpmath 1.4.1 (BSD-3-Clause),
and PyYAML 6.0.3 (MIT). Full package notices are retained inside the
unmodified wheels and extracted under licenses/ for direct inspection.

pyodide-lock.json is the original lock restricted to these four package
entries. Each entry and its checksum are unchanged. upstream-lock.json
retains the full original. The website-specific loader is outside this
directory. See runtime-manifest.json for exact hashes, versions, sources,
the verified Chinese npm mirror response, and the failed binary-mirror probe.
'''


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--cache', type=Path, help='Optional existing fixed-version download cache')
    args = parser.parse_args()
    if args.check:
        manifest = json.loads((DEST / 'runtime-manifest.json').read_text(encoding='utf8'))
        for entry in manifest['files']:
            data = (DEST / entry['path']).read_bytes()
            assert len(data) == entry['bytes'] and digest(data) == entry['sha256'], entry['path']
        lock = json.loads((DEST / 'pyodide-lock.json').read_text(encoding='utf8'))
        assert set(lock['packages']) == set(PACKAGES)
        assert lock['info']['python'] == '3.14.2'
        for package in lock['packages'].values():
            assert '/' not in package['file_name'] and ':' not in package['file_name']
            assert digest((DEST / package['file_name']).read_bytes()) == package['sha256']
            assert set(package['depends']) <= set(PACKAGES)
        print(f"PASS: {len(manifest['files'])} pinned files; {sum(x['bytes'] for x in manifest['files']):,} bytes; no network")
        return

    DEST.mkdir(parents=True, exist_ok=True)
    files, requests = [], []

    def get(url, allow_failure=False):
        request = urllib.request.Request(url, headers={'Origin': 'https://ljcj007.github.io', 'User-Agent': 'SymmetryLab-runtime-vendor/1'})
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                data = response.read()
                requests.append({'url': url, 'finalUrl': response.url, 'status': response.status,
                                 'bytes': len(data), 'cors': response.headers.get('Access-Control-Allow-Origin'),
                                 'contentType': response.headers.get('Content-Type'), 'sha256': digest(data)})
                return data
        except urllib.error.HTTPError as error:
            if not allow_failure:
                raise
            requests.append({'url': url, 'finalUrl': error.url, 'status': error.code,
                             'cors': error.headers.get('Access-Control-Allow-Origin')})

    def save(name, data, source, **details):
        target = DEST / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files.append({'path': name, 'bytes': len(data), 'sha256': digest(data), 'source': source, **details})

    archive = get(TARBALL)
    assert base64.b64encode(hashlib.sha512(archive).digest()).decode() == TAR_SHA512
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        lock_bytes = tar.extractfile('package/pyodide-lock.json').read()
        assert digest(lock_bytes) == LOCK_SHA256
        upstream = json.loads(lock_bytes)
        assert upstream['info']['python'] == '3.14.2'
        save('upstream-lock.json', lock_bytes, TARBALL, member='package/pyodide-lock.json')
        for name in CORE:
            data = tar.extractfile('package/' + name).read()
            if args.cache:
                assert data == (args.cache / name).read_bytes(), 'Preserved cache differs: ' + name
            save(name, data, TARBALL, member='package/' + name,
                 preservedCacheMatched=bool(args.cache))
        save('upstream-package.json', tar.extractfile('package/package.json').read(), TARBALL, member='package/package.json')

    subset = {**upstream, 'packages': {name: upstream['packages'][name] for name in PACKAGES}}
    save('pyodide-lock.json', (json.dumps(subset, ensure_ascii=False, indent=2) + '\n').encode(),
         TARBALL, modification='Package allowlist only; the four upstream entries, hashes and ABI info are unchanged.')
    for name in PACKAGES:
        entry = subset['packages'][name]
        filename = entry['file_name']
        cached = args.cache / filename if args.cache else None
        data = cached.read_bytes() if cached and cached.is_file() else get(CDN + filename)
        assert digest(data) == entry['sha256'], filename
        save(filename, data, CDN + filename, acquisition='preserved fixed cache' if cached and cached.is_file() else 'HTTP GET',
             package=name, version=entry['version'], upstreamLockHashMatched=True)
        with zipfile.ZipFile(io.BytesIO(data)) as wheel:
            for member in wheel.namelist():
                if '.dist-info/licenses/' in member or ('.dist-info/' in member and member.rsplit('/', 1)[-1].lower() in ('license', 'license.txt', 'copying')):
                    save('licenses/' + member, wheel.read(member), CDN + filename, member=member)

    for filename, url in [
        ('LICENSE-PYODIDE.txt', 'https://raw.githubusercontent.com/pyodide/pyodide/314.0.7/LICENSE'),
        ('LICENSE-CPYTHON.txt', 'https://raw.githubusercontent.com/python/cpython/v3.14.2/LICENSE'),
    ]:
        save(filename, get(url), url)
    save('NOTICE.txt', NOTICE.encode('utf8'), 'Symmetry Lab packaging notice in scripts/vendor-python-runtime.py')
    # This plausible mirror path is demonstrably absent: never configure it.
    get('https://npmmirror.com/mirrors/pyodide/v314.0.7/full/pyodide.mjs', allow_failure=True)
    manifest = {'schema': 'symmetry-lab-self-hosted-python-runtime-1', 'checkedUTC': '2026-11-24',
                'pyodide': '314.0.7', 'python': '3.14.2', 'abi': upstream['info'],
                'npmTarballIntegrity': 'sha512-' + TAR_SHA512, 'upstreamLockSha256': LOCK_SHA256,
                'runtimePolicy': 'All browser runtime and package requests use the website origin; no CDN fallback.',
                'files': files, 'httpVerification': requests,
                'limits': 'HTTP checks ran on the current network, not on representative mainland China ISPs. Same-origin hosting removes third-party runtime dependencies; website-origin reachability remains required.'}
    (DEST / 'runtime-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f"Vendored {len(files)} files, {sum(x['bytes'] for x in files):,} bytes")


if __name__ == '__main__':
    main()
