"""Independent, exact rational arrangement verifier; Python standard library only.

The verifier enumerates the arrangement itself from the problem.  No producer
routine, supplied cell count, vertex list or adjacency list is trusted.
"""
from fractions import Fraction as Q
from itertools import combinations, product, permutations
from math import gcd, lcm, comb
import argparse
import json
import re
import sys
from pathlib import Path


class Invalid(ValueError):
    pass


class Budget(RuntimeError):
    pass


def rational(x):
    if isinstance(x, bool) or isinstance(x, float):
        raise Invalid('rational input must be an integer or fraction string')
    if isinstance(x, str):
        if len(x) > 1024:
            raise Budget('rational token budget exceeded')
        if not re.fullmatch(r'[+-]?[0-9]+(?:/[+-]?[0-9]+)?', x):
            raise Invalid('rational string must contain an integer or fraction')
    elif not isinstance(x, (int, Q)):
        raise Invalid('rational input must be an integer or fraction string')
    try:
        value = Q(x)
        if max(value.numerator.bit_length(), value.denominator.bit_length()) > 512:
            raise Budget('rational bit budget exceeded')
        return value
    except (ValueError, TypeError, ZeroDivisionError) as exc:
        raise Invalid('invalid rational input') from exc


def det(a):
    return (a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])
            -a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])
            +a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]))


def rank(rows):
    a = [list(map(Q, row)) for row in rows]
    r = 0
    for c in range(3):
        p = next((p for p in range(r, len(a)) if a[p][c]), None)
        if p is None:
            continue
        a[p], a[r] = a[r], a[p]
        d = a[r][c]
        a[r] = [v/d for v in a[r]]
        for i in range(r+1, len(a)):
            d = a[i][c]
            a[i] = [u-d*v for u, v in zip(a[i], a[r])]
        r += 1
        if r == 3:
            break
    return r


def inverse(a):
    d = det(a)
    if not d:
        raise Invalid('singular rotation')
    return tuple(tuple(((-1)**(i+j))*det2(a, j, i)/d
                       for j in range(3)) for i in range(3))


def det2(a, i, j):
    b = [[a[r][c] for c in range(3) if c != j]
         for r in range(3) if r != i]
    return b[0][0]*b[1][1]-b[0][1]*b[1][0]


def dot(a, b):
    return sum(x*y for x, y in zip(a, b))


def canonical_plane(normal, offset):
    if not isinstance(normal, (list, tuple)) or len(normal) != 3:
        raise Invalid('plane normal must have exactly three coordinates')
    values = tuple(map(rational, (*normal, offset)))
    if not any(values[:3]):
        raise Invalid('zero plane normal')
    den = lcm(*(x.denominator for x in values))
    nums = [int(x*den) for x in values]
    common = gcd(*nums)
    nums = [x//common for x in nums]
    if next(x for x in nums[:3] if x) < 0:
        nums = [-x for x in nums]
    return tuple(nums)


def operation_rows(problem):
    operations = problem.get('operations', [])
    if not isinstance(operations, list) or len(operations) > 256:
        raise Invalid('operations must be a list of at most 256 records')
    result = []
    ids = set()
    for op in operations:
        label = op['id']
        if not isinstance(label, str) or not label or label in ids:
            raise Invalid('operation IDs must be unique nonempty strings')
        ids.add(label)
        if type(op['anti']) is not bool:
            raise Invalid('anti must be boolean')
        a = tuple(tuple(rational(x) for x in row) for row in op['rotation'])
        if len(a) != 3 or any(len(row) != 3 for row in a):
            raise Invalid('rotation must be 3 by 3')
        if any(x.denominator != 1 for row in a for x in row) or abs(det(a)) != 1:
            raise Invalid('rotation must be an integral unimodular lattice action')
        inv = inverse(a)
        sign = -1 if op['anti'] else 1
        rows = tuple(tuple(sign*inv[j][i]-(i == j) for j in range(3))
                     for i in range(3))
        result.append((label, rows))
    return result


def problem_planes(problem, ops, limits):
    planes = set()
    for axis in range(3):
        normal = tuple(int(i == axis) for i in range(3))
        for end in (0, 1):
            planes.add(canonical_plane(normal, end))
    for _, rows in ops:
        for row in rows:
            if not any(row):
                continue
            low = sum(min(x, 0) for x in row)
            high = sum(max(x, 0) for x in row)
            # Integral unimodular actions imply integer coefficients here.
            first, last = -((-low.numerator)//low.denominator), high.numerator//high.denominator
            if last-first+1 > limits['max_planes']:
                raise Budget('too many integer-congruence planes')
            for offset in range(first, last+1):
                planes.add(canonical_plane(row, offset))
    explicit = problem.get('planes', [])
    if not isinstance(explicit, list) or len(explicit) > limits['max_planes']:
        raise Budget('too many explicit planes')
    for record in explicit:
        p = canonical_plane(record['normal'], record['offset'])
        if sum(min(x, 0) for x in p[:3]) <= p[3] <= sum(max(x, 0) for x in p[:3]):
            planes.add(p)
    planes = sorted(planes)
    if len(planes) > limits['max_planes']:
        raise Budget('plane budget exceeded')
    return planes


DEFAULT_LIMITS = {'max_planes': 40, 'max_vertices': 5000,
                  'max_cells': 10000, 'max_triples': 20000,
                  'max_incidence_pairs': 2000000}


def construct(problem, limits=None):
    """Reconstruct all strata and gluing.  Limits are checker policy, not input."""
    if not isinstance(problem, dict) or problem.get('schema') != 'rational-arrangement-v1' or type(problem.get('dimension')) is not int or problem.get('dimension') != 3:
        raise Invalid('unsupported problem schema or dimension')
    limits = {**DEFAULT_LIMITS, **(limits or {})}
    if any(type(v) is not int or v <= 0 for v in limits.values()):
        raise Invalid('resource limits must be positive integers')
    axes = problem.get('period_axes', [0, 1, 2])
    if not isinstance(axes, list) or any(type(a) is not int or a not in (0, 1, 2) for a in axes) or len(set(axes)) != len(axes):
        raise Invalid('period_axes must be a subset of [0,1,2]')
    ops = operation_rows(problem)
    planes = problem_planes(problem, ops, limits)
    if comb(len(planes), 3) > limits['max_triples']:
        raise Budget('plane intersection budget exceeded')
    points = set()
    for triple in combinations(planes, 3):
        a = tuple(tuple(Q(x) for x in p[:3]) for p in triple)
        if not det(a):
            continue
        b = [Q(p[3]) for p in triple]
        inv = inverse(a)
        v = tuple(dot(row, b) for row in inv)
        if all(0 <= x <= 1 for x in v):
            points.add(v)
            if len(points) > limits['max_vertices']:
                raise Budget('vertex budget exceeded')
    points = sorted(points)
    if not points:
        raise Invalid('cube has no reconstructed vertices')
    values = [[dot(p[:3], v)-p[3] for v in points] for p in planes]
    cells = []
    # All 27 relative interiors of the initial cube, including its faces.
    for code in product((-1, 0, 1), repeat=3):
        vertices = tuple(i for i, v in enumerate(points)
                         if all(c == 0 or v[a] == (0 if c < 0 else 1)
                                for a, c in enumerate(code)))
        if not vertices:
            raise Invalid('missing initial cube face')
        cells.append(((), vertices))
    for vals in values:
        split = []
        for signs, vertices in cells:
            low, high = min(vals[i] for i in vertices), max(vals[i] for i in vertices)
            if low < 0 < high:
                for sign in (-1, 0, 1):
                    subset = tuple(i for i in vertices
                                   if (vals[i] == 0 if sign == 0 else sign*vals[i] >= 0))
                    if not subset:
                        raise Invalid('missing cut vertices')
                    split.append((signs+(sign,), subset))
            else:
                sign = 1 if high > 0 else (-1 if low < 0 else 0)
                split.append((signs+(sign,), vertices))
        cells = split
        if len(cells) > limits['max_cells']:
            raise Budget('cell budget exceeded')
    if len({s for s, _ in cells}) != len(cells):
        raise Invalid('internal duplicate strata')
    records, by_vertices = [], {}
    for index, (signs, inds) in enumerate(sorted(cells)):
        vertices = tuple(points[i] for i in inds)
        center = tuple(sum(v[a] for v in vertices)/len(vertices) for a in range(3))
        actual_signs = tuple((dot(p[:3], center) > p[3])-(dot(p[:3], center) < p[3]) for p in planes)
        if actual_signs != signs:
            raise Invalid('relative-interior witness mismatch')
        dimension = rank([[v[a]-vertices[0][a] for a in range(3)] for v in vertices[1:]])
        stabilizer = []
        for label, rows in ops:
            fixes = all(dot(row, center).denominator == 1 for row in rows)
            if fixes:
                if not all(len({dot(row, v) for v in vertices}) == 1 for row in rows):
                    raise Invalid('stabilizer not constant on stratum')
                stabilizer.append(label)
        rec = {'id': f'c{index:04d}', 'signs': list(signs), 'dimension': dimension,
               'vertices': [[str(x) for x in v] for v in vertices],
               'witness': [str(x) for x in center], 'stabilizer': stabilizer}
        records.append(rec)
        by_vertices[vertices] = rec
    if len(records)**2 > limits['max_incidence_pairs']:
        raise Budget('incidence budget exceeded')
    incidences = []
    for upper in records:
        for lower in records:
            if upper['dimension'] <= lower['dimension']:
                continue
            if all(b == a or b == 0 for a, b in zip(upper['signs'], lower['signs'])):
                incidences.append([upper['id'], lower['id']])
    period_pairs, pair_map = [], {}
    for axis in sorted(axes):
        for rec in records:
            vertices = tuple(tuple(map(Q, v)) for v in rec['vertices'])
            if not all(v[axis] == 0 for v in vertices):
                continue
            shifted = tuple(tuple(v[a]+(a == axis) for a in range(3)) for v in vertices)
            target = by_vertices.get(shifted)
            if target is None or target['dimension'] != rec['dimension']:
                raise Invalid('periodic face arrangements do not agree cell by cell')
            if rec['stabilizer'] != target['stabilizer']:
                raise Invalid('periodic stabilizer mismatch')
            pair_map[axis, rec['id']] = target['id']
            period_pairs.append({'axis': axis, 'source': rec['id'], 'target': target['id']})
    squares = []
    for a, b in combinations(sorted(axes), 2):
        for rec in records:
            sid = rec['id']
            if (a, sid) not in pair_map or (b, sid) not in pair_map:
                continue
            via_a, via_b = pair_map[a, sid], pair_map[b, sid]
            target_a, target_b = pair_map.get((b, via_a)), pair_map.get((a, via_b))
            if target_a is None or target_a != target_b:
                raise Invalid('period square does not commute')
            squares.append({'axes': [a, b], 'source': sid, 'via_a': via_a,
                            'via_b': via_b, 'target': target_a})
    cubes = []
    if sorted(axes) == [0, 1, 2]:
        for rec in records:
            sid = rec['id']
            if not all((a, sid) in pair_map for a in axes):
                continue
            paths = []
            for order in permutations(axes):
                path = [sid]
                for a in order:
                    path.append(pair_map[a, path[-1]])
                paths.append({'axes': list(order), 'cells': path})
            if len({p['cells'][-1] for p in paths}) != 1:
                raise Invalid('period cube paths disagree')
            cubes.append({'source': sid, 'paths': paths})
    return {'schema': 'rational-arrangement-certificate-v1',
            'planes': [{'normal': list(p[:3]), 'offset': p[3]} for p in planes],
            'cells': records, 'incidences': incidences, 'period_pairs': period_pairs,
            'period_squares': squares, 'period_cubes': cubes}


def verify(problem, certificate, limits=None):
    try:
        expected = construct(problem, limits)
        if not isinstance(certificate, dict) or set(certificate) != set(expected):
            raise Invalid('certificate field set differs from protocol')
        for field, wanted in expected.items():
            # JSON comparison preserves types: True, 1 and 1.0 are distinct.
            if json.dumps(certificate[field], sort_keys=True, separators=(',', ':')) != json.dumps(wanted, sort_keys=True, separators=(',', ':')):
                raise Invalid('mismatch in independently reconstructed '+field)
        return {'status': 'CERTIFIED', 'scope': 'exact stratification, stabilizers, incidences and periodic geometry',
                'counts': {k: len(expected[k]) for k in ('planes', 'cells', 'incidences', 'period_pairs', 'period_squares', 'period_cubes')},
                'dimensions': {str(d): sum(c['dimension'] == d for c in expected['cells']) for d in range(4)}}
    except Budget as exc:
        return {'status': 'UNRESOLVED', 'reason': str(exc)}
    except (Invalid, KeyError, TypeError, ValueError, IndexError) as exc:
        return {'status': 'INVALID', 'reason': str(exc)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--problem', required=True)
    parser.add_argument('--certificate', required=True)
    args = parser.parse_args()
    try:
        if any(Path(p).stat().st_size > 32*1024*1024 for p in (args.problem, args.certificate)):
            raise Budget('input byte budget exceeded')
        problem = json.loads(Path(args.problem).read_text(encoding='utf-8'))
        certificate = json.loads(Path(args.certificate).read_text(encoding='utf-8'))
        result = verify(problem, certificate)
    except Budget as exc:
        result = {'status': 'UNRESOLVED', 'reason': str(exc)}
    except (OSError, ValueError) as exc:
        result = {'status': 'INVALID', 'reason': str(exc)}
    print(json.dumps(result, indent=2))
    return {'CERTIFIED': 0, 'INVALID': 1, 'UNRESOLVED': 2}[result['status']]


if __name__ == '__main__':
    sys.exit(main())
