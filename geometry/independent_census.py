"""Second cell-enumeration algorithm; no import from exact_geometry.

For small 3D arrangements, enumerate barycentres of up to four arrangement
vertices.  Every d-cell contains the barycentre of d+1 affinely independent
closure vertices.  This is deliberately expensive and used as a cross-check.
"""
from fractions import Fraction as F
from itertools import combinations
import json
from pathlib import Path


def determinant(a):
    return sum(a[0][i]*(a[1][(i+1)%3]*a[2][(i+2)%3]-a[1][(i+2)%3]*a[2][(i+1)%3]) for i in range(3))


def census(planes):
    pts = set()
    for rows in combinations(planes, 3):
        a = [[F(x) for x in row['normal']] for row in rows]
        denominator = determinant(a)
        if not denominator:
            continue
        xyz = []
        for col in range(3):
            replaced = [[F(rows[i]['offset']) if j == col else a[i][j] for j in range(3)] for i in range(3)]
            xyz.append(determinant(replaced)/denominator)
        if all(0 <= t <= 1 for t in xyz):
            pts.add(tuple(xyz))
    pts = sorted(pts)
    if len(pts) > 40:
        raise ValueError('independent exhaustive barycentre census limited to 40 vertices')
    patterns = set()
    barycentres = set()
    for count in range(1, 5):
        for selected in combinations(pts, count):
            barycentres.add(tuple(sum(v[i] for v in selected)/count for i in range(3)))
    for point in barycentres:
        pattern = []
        for plane in planes:
            value = sum(F(x)*y for x, y in zip(plane['normal'], point))-F(plane['offset'])
            pattern.append((value > 0)-(value < 0))
        patterns.add(tuple(pattern))
    return pts, patterns, len(barycentres)


def check(certificate):
    points, patterns, samples = census(certificate['planes'])
    submitted = {tuple(c['signs']) for c in certificate['cells']}
    if patterns != submitted or len(submitted) != len(certificate['cells']):
        raise AssertionError('exhaustive barycentre census differs from incremental split cells')
    # Independently obtain each closure by inequalities, not split histories.
    for cell in certificate['cells']:
        included = []
        for point in points:
            good = True
            for plane, sign in zip(certificate['planes'], cell['signs']):
                val = sum(F(x)*y for x, y in zip(plane['normal'], point))-F(plane['offset'])
                if (val != 0 if sign == 0 else sign*val < 0):
                    good = False
                    break
            if good:
                included.append(point)
        if included != [tuple(map(F, v)) for v in cell['vertices']]:
            raise AssertionError('independent closure vertex census differs')
    return {'status': 'PASS', 'vertices': len(points), 'barycentres': samples,
            'cells': len(patterns), 'scope': 'independent Cramer intersection and exhaustive barycentre enumeration; planes are shared input'}


if __name__ == '__main__':
    p = Path(__file__).parent
    certificate = json.loads((p/'diagonal_mirror.certificate.json').read_text(encoding='utf-8'))
    result = check(certificate)
    (p/'INDEPENDENT_CENSUS.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
