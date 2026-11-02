"""Read only the central directory of the pinned QE release asset."""
import io
import json
import struct
import urllib.request
import zipfile
from acquire_qe import HERE, URL
from resume_qe import SIZE


def get_range(start, stop):
    request = urllib.request.Request(URL, headers={'Range': f'bytes={start}-{stop-1}'})
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{stop-1}/{SIZE}':
            raise ValueError('Incorrect range response')
        data = response.read(stop-start+1)
    if len(data) != stop-start:
        raise ValueError('Truncated range')
    return data


def main():
    tail = get_range(SIZE-65558, SIZE)
    offset = tail.rfind(b'PK\x05\x06')
    if offset < 0:
        raise ValueError('ZIP EOCD absent')
    fields = struct.unpack_from('<4s4H2IH', tail, offset)
    cd_size, cd_offset = fields[5:7]
    cd = get_range(cd_offset, cd_offset+cd_size)
    # A central-directory-only synthetic stream suffices for metadata listing;
    # entry offsets intentionally still refer to the original remote archive.
    end = bytearray(tail[offset:])
    struct.pack_into('<I', end, 16, 0)
    z = zipfile.ZipFile(io.BytesIO(cd+end))
    rows = [{'name': info.filename, 'offset': info.header_offset, 'compressed': info.compress_size,
             'uncompressed': info.file_size, 'crc32': info.CRC} for info in z.infolist()]
    (HERE/'software/REMOTE_ZIP_DIRECTORY.json').write_text(json.dumps({
        'url': URL, 'whole_asset_sha256_verified': False, 'bytes_fetched': len(tail)+len(cd),
        'central_directory_offset': cd_offset, 'entries': rows}, indent=2)+'\n', encoding='utf-8')
    print(json.dumps([r for r in rows if r['name'].lower().endswith(('pw.exe', '.dll'))], indent=2))


if __name__ == '__main__':
    main()
