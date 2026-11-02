"""Retry stalled blocks as 1 MiB requests; preserve both transfer records."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import time
from acquire_qe import HERE
from inspect_remote_zip import get_range
from resume_qe import CHUNK


def main():
    root = HERE/'software'
    directory = root/'rescue_ranges'
    directory.mkdir(exist_ok=True)
    small = 1024*1024
    start = time.time()
    def one(item):
        block, piece = item
        path = directory/f'{block:03d}-{piece:02d}.part'
        if not path.exists():
            offset = block*CHUNK+piece*small
            data = get_range(offset, offset+small)
            path.write_bytes(data)
        if path.stat().st_size != small:
            raise ValueError('Wrong rescue piece length')
        print(json.dumps({'block': block, 'piece': piece}), flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(one, [(block, piece) for block in (8,9) for piece in range(16)]))
    for block in (8,9):
        data = b''.join((directory/f'{block:03d}-{piece:02d}.part').read_bytes() for piece in range(16))
        target = root/'ranges'/f'{block:03d}.part'
        if target.exists():
            if target.read_bytes() != data:
                raise ValueError('Independent range transfers disagree')
        else:
            pending = directory/f'{block:03d}.complete'
            pending.write_bytes(data)
            try:
                pending.rename(target)
            except FileExistsError:
                if target.read_bytes() != data:
                    raise ValueError('Concurrent independent range transfers disagree')
    (root/'RESCUE_RANGES.json').write_text(json.dumps({'blocks': [8,9],
        'piece_size': small, 'workers': 4, 'wall_seconds': time.time()-start,
        'whole_asset_digest_verification_still_required': True}, indent=2)+'\n', encoding='utf-8')


if __name__ == '__main__':
    main()
