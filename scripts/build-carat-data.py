"""Reproducibly convert official CARAT Q tables into browser-sized exact JSON.

No CARAT executable is required. Copyright notices and source table archive are
retained in upstream/CARAT. See the generated manifest for the pinned revision.
"""
import argparse
from collections import Counter
from fractions import Fraction
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['name', 'dimension', 'symbol', 'order', 'discriminant', 'z_classes',
          'affine_classes', 'torsion_free', 'conjugacy_classes', 'idempotents']


class Reader:
    def __init__(self, text):
        self.lines = [line.split('%', 1)[0].strip() for line in text.splitlines()]
        self.lines = [line for line in self.lines if line]
        self.pos = 0

    def line(self):
        result = self.lines[self.pos]
        self.pos += 1
        return result

    def matrix(self):
        header = self.line()
        match = re.fullmatch(r'(\d+)\s*(?:([xd])\s*(\d+))?\s*(?:/\s*(\d+))?', header)
        if not match:
            raise ValueError('Unsupported exact CARAT matrix header: ' + header)
        n, kind, raw_m, denom = match.groups()
        n = int(n)
        raw_m = int(raw_m) if raw_m is not None else n
        denom = int(denom or 1)
        m = n if kind == 'd' or raw_m == 0 else raw_m
        count = (1 if raw_m == 0 else n) if kind == 'd' else n*(n+1)//2 if kind == 'x' and raw_m == 0 else n*m
        tokens = []
        while len(tokens) < count:
            tokens.extend(self.line().split())
        if len(tokens) != count:
            raise ValueError('Matrix element count mismatch')
        vals = iter(Fraction(x) / denom for x in tokens)
        out = [[Fraction(0) for _ in range(m)] for _ in range(n)]
        if kind == 'd':
            scalar = next(vals) if raw_m == 0 else None
            for i in range(n):
                out[i][i] = scalar if scalar is not None else next(vals)
        elif kind == 'x' and raw_m == 0:
            for i in range(n):
                for j in range(i+1):
                    out[i][j] = out[j][i] = next(vals)
        else:
            for i in range(n):
                for j in range(m):
                    out[i][j] = next(vals)
        return [[int(x) if x.denominator == 1 else str(x) for x in row] for row in out]

    def group(self):
        header = self.line()
        if not header.startswith('#'):
            self.pos -= 1
            counts = {'g': 1}
        else:
            counts = {key: int(number) for key, number in re.findall(r'([gfznc])\s*(\d+)', header)}
            if not counts:
                counts = {'g': int(header[1:])}
        labels = {'g':'generators', 'f':'forms', 'z':'centralizer_matrices', 'n':'normalizer_generators', 'c':'centralizer_generators'}
        result = {labels[key]: [self.matrix() for _ in range(counts.get(key, 0))] for key in labels}
        if self.pos < len(self.lines):
            order = self.line()
            match = re.search(r'=\s*(\d+)', order)
            if match:
                result['order'] = int(match.group(1))
        return result


def fingerprint(character):
    return [list(col) for col in sorted(zip(*character[:9]))]


def build(source):
    archive = source / 'tables/qcatalog.tar.gz'
    dest = ROOT / 'dist/data/carat'
    upstream = ROOT / 'upstream/CARAT'
    dest.mkdir(parents=True, exist_ok=True)
    upstream.mkdir(parents=True, exist_ok=True)
    for name in ['LICENSE', 'README.md']:
        shutil.copyfile(source/name, upstream/name)
    shutil.copyfile(archive, upstream/'qcatalog.tar.gz')
    for name in ['Name/compute_q_matrix.c', 'Name/q_class_inf.c', 'Name/Q_catalog.c', 'Getput/get_mat.c']:
        target = upstream/'reference'/name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source/'functions'/name, target)
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    manifest = {'schema_version':1, 'source':'https://github.com/lbfm-rwth/carat',
                'revision':revision, 'license':'GPL-2.0-or-later',
                'archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(), 'dimensions':[],
                'scope':{'q_catalog':'Complete 1–6D official Q representatives and presentations.',
                         'z_affine_counts':'Official counts per Q class; these counts are not stored representatives.',
                         'classification':'Exact class invariants including rational central-idempotent traces; unique full-catalog matches or explicit rational conjugator certificates.',
                         'z_lattices':'Exact invariant sublattices up to requested index; no false assertion of complete GL(n,Z) classes.'}}
    with tarfile.open(archive) as tar:
        files = {member.name:tar.extractfile(member).read() for member in tar if member.isfile()}
        for d in range(1, 7):
            lines = files[f'qcatalog/data{d}'].decode().splitlines()
            expected = int(lines[0])
            entries = []
            for line in lines[1:]:
                if not line.strip(): continue
                values = line.split()
                assert len(values) == 10, line
                entry = {key: (val if key in ['name','symbol','discriminant'] else int(val)) for key,val in zip(FIELDS,values)}
                path = f"qcatalog/dim{d}/dir.{entry['symbol']}/ordnung.{entry['order']}/{entry['discriminant']}/"
                raw = files[path+entry['name']]
                group = Reader(raw.decode()).group()
                entry['generators'] = group['generators']
                entry['relators'] = [[x for x in row if x] for row in Reader(files[path+'pres.'+entry['name']].decode()).matrix()]
                entry['character_matrix'] = Reader(files[path+'char.'+entry['name']].decode()).matrix()
                entry['fingerprint'] = fingerprint(entry['character_matrix'])
                entry['source_path'] = path+entry['name']
                entry['sha256'] = hashlib.sha256(raw).hexdigest()
                assert group.get('order', entry['order']) == entry['order']
                entries.append(entry)
            assert len(entries) == expected
            catalog = {'schema_version':1, 'dimension':d, 'source_revision':revision, 'entries':entries}
            raw = json.dumps(catalog, ensure_ascii=False, separators=(',',':')).encode()
            data = gzip.compress(raw, compresslevel=9, mtime=0)
            (dest/f'q{d}.json.gz').write_bytes(data)
            collisions = Counter(json.dumps(x['fingerprint']) for x in entries)
            full_collisions = Counter(json.dumps(x['character_matrix']) for x in entries)
            summary = {'dimension':d, 'q_classes':len(entries), 'z_classes':sum(x['z_classes'] for x in entries),
                       'affine_classes':sum(x['affine_classes'] for x in entries),
                       'torsion_free':sum(x['torsion_free'] for x in entries),
                       'unique_fingerprint_classes':sum(1 for x in entries if collisions[json.dumps(x['fingerprint'])] == 1),
                       'unique_full_characteristic_classes':sum(1 for x in entries if full_collisions[json.dumps(x['character_matrix'])] == 1),
                       'file':f'q{d}.json.gz', 'bytes':len(data),'json_bytes':len(raw),'sha256':hashlib.sha256(data).hexdigest()}
            manifest['dimensions'].append(summary)
            print(summary)
    (dest/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',encoding='utf8')
    (upstream/'PROVENANCE.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,default=ROOT/'.openai/upstream-checkouts/CARAT')
    build(parser.parse_args().source)
