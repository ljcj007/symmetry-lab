"""Download one pinned portable QE distribution into this work line only.

No installer, registry change, global PATH change, or executable launch.
The publisher's release and asset digest are documented in SOFTWARE.md.
"""
from pathlib import Path
import hashlib
import json
import time
import urllib.request
import zipfile

HERE = Path(__file__).resolve().parent
URL = ('https://github.com/QMatSuite/quantum-espresso-windows-exe/releases/'
       'download/qe-7.5-win-oneapi-msmpi/qe-7.5-win-oneapi-msmpi.zip')
DIGEST = 'e50ec7368a5b7a964eb5084e0a13464ba2628d4e147c16227e876002ea34fdf7'


def main():
    target = HERE / 'software'
    target.mkdir(exist_ok=True)
    archive = target / 'qe-7.5-win-oneapi-msmpi.zip'
    begin = time.time()
    if not archive.exists():
        partial = archive.with_suffix('.zip.partial')
        if partial.exists():
            raise RuntimeError('A prior partial download exists; inspect it before retrying.')
        with urllib.request.urlopen(URL, timeout=45) as response, partial.open('xb') as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        partial.rename(archive)
    digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
    if digest != DIGEST:
        raise RuntimeError('Portable QE archive SHA256 differs from publisher digest')
    extracted = target / 'qe-7.5'
    if extracted.exists():
        raise RuntimeError('Do not overwrite an existing extracted distribution')
    with zipfile.ZipFile(archive) as bundle:
        root = extracted.resolve()
        for entry in bundle.infolist():
            name = entry.filename.replace('\\', '/')
            dest = (root / name).resolve()
            if not dest.is_relative_to(root) or entry.external_attr >> 16 & 0o170000 == 0o120000:
                raise RuntimeError('Unsafe archive member: ' + name)
        bundle.extractall(extracted)
    executables = list(extracted.rglob('pw.exe'))
    result = {'url': URL, 'archive_sha256': digest, 'archive_bytes': archive.stat().st_size,
              'download_and_extract_seconds': time.time() - begin,
              'pw_executables': [str(x.relative_to(HERE)) for x in executables],
              'system_installation': False, 'executed': False}
    (target / 'ACQUISITION.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
