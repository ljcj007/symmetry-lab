"""Bounded parallel range transfer after a truncated release download.

The failed archive is retained. No bytes are extracted before the complete
publisher SHA256 matches. Partial-prefix reuse is only a bandwidth optimization.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import shutil
import time
import urllib.request
from acquire_qe import HERE, URL, DIGEST, main as extract_verified

SIZE = 400430691
CHUNK = 16*1024*1024


def digest(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def main():
    folder = HERE/'software'
    archive = folder/'qe-7.5-win-oneapi-msmpi.zip'
    incomplete = folder/'qe-7.5-win-oneapi-msmpi.incomplete-119846673.zip'
    if archive.exists() and digest(archive) != DIGEST:
        if incomplete.exists():
            raise ValueError('Failed archive already archived; inspect before proceeding')
        archive.rename(incomplete)
        (folder/'FIRST_DOWNLOAD_FAILURE.json').write_text(json.dumps({
            'status': 'TRUNCATED_DOWNLOAD_SHA256_MISMATCH', 'file': incomplete.name,
            'bytes_received': incomplete.stat().st_size, 'expected_bytes': SIZE,
            'received_sha256': digest(incomplete), 'expected_sha256': DIGEST,
            'extracted_or_executed': False}, indent=2)+'\n', encoding='utf-8')
    ranges = folder/'ranges'
    ranges.mkdir(exist_ok=True)
    count = (SIZE+CHUNK-1)//CHUNK
    if incomplete.exists():
        with incomplete.open('rb') as f:
            for index in range(incomplete.stat().st_size//CHUNK):
                target = ranges/f'{index:03d}.part'
                data = f.read(CHUNK)
                if not target.exists():
                    target.write_bytes(data)
    def obtain(index):
        start, end = index*CHUNK, min(SIZE, (index+1)*CHUNK)-1
        target = ranges/f'{index:03d}.part'
        if target.exists() and target.stat().st_size == end-start+1:
            return str(target)
        request = urllib.request.Request(URL, headers={'Range': f'bytes={start}-{end}'})
        last = None
        for attempt in range(4):
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    expected = f'bytes {start}-{end}/{SIZE}'
                    if response.status != 206 or response.headers.get('Content-Range') != expected:
                        raise ValueError('Server did not honor the requested byte interval')
                    data = response.read(end-start+2)
                if len(data) != end-start+1:
                    raise ValueError('Truncated range')
                target.write_bytes(data)
                print(json.dumps({'completed_chunk': index, 'total_chunks': count}), flush=True)
                return str(target)
            except Exception as exc:
                last = exc
                print(json.dumps({'retry_chunk': index, 'attempt': attempt+1, 'error': str(exc)}), flush=True)
                time.sleep(2)
        raise RuntimeError(f'Could not obtain range {index}: {last}')
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=4) as pool:
        chunks = list(pool.map(obtain, range(count)))
    if archive.exists():
        raise ValueError('Refuse to overwrite an archive')
    with archive.open('xb') as output:
        for path in chunks:
            with Path(path).open('rb') as source:
                shutil.copyfileobj(source, output)
    actual = digest(archive)
    result = {'url': URL, 'expected_bytes': SIZE, 'actual_bytes': archive.stat().st_size,
              'expected_sha256': DIGEST, 'actual_sha256': actual,
              'publisher_digest_matches': actual == DIGEST,
              'wall_seconds': time.time()-start_time, 'workers': 4, 'chunk_bytes': CHUNK,
              'failed_first_archive_preserved': str(incomplete), 'chunk_files_preserved': True}
    (folder/'RANGE_DOWNLOAD.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    if actual != DIGEST:
        raise ValueError('Merged asset digest mismatch; no extraction or execution')
    extract_verified()


if __name__ == '__main__':
    main()
