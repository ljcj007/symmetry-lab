"""Independent closed-form producer for the diagonal-mirror + time-reversal case.

This module never imports a verifier or a geometry constructor.  The independently
supplied geometry is data.  Arithmetic is the openly identified Phase 11 kernel.
"""
from fractions import Fraction as F
from itertools import product
from pathlib import Path
import argparse, hashlib, json, sys
sys.path.insert(0, str(Path(__file__).parent / 'vendor'))
import exact_paths as A


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def scalar(phase=0, coefficient=1, frequency=(0, 0, 0)):
    return A.decode_entry([{'coefficient': str(coefficient), 'phase': str(phase), 'frequency': list(map(str, frequency))}])


def diagonal(a, b):
    return [[a, {}], [{}, b]]


def constant_models():
    one, z = scalar(), scalar(F(1, 8))
    M = [[{}, scalar(F(-1, 8))], [scalar(F(1, 8), -1), {}]]
    J = [[{}, one], [scalar(0, -1), {}]]
    return [A.eye(2), M, J, A.mul(M, J)]


def local_tables():
    C = constant_models()
    halfroot = A.padd(scalar(F(1, 8), F(1, 2)), scalar(F(3, 8), F(-1, 2)))
    mirror_basis = [[A.pmul(halfroot, scalar(F(-3, 8))), A.pmul(halfroot, scalar(F(1, 8)))], [halfroot, halfroot]]
    tables = {}
    specs = [
        ('E', [0], [[[[scalar()]]]], [2], A.eye(2), 'unitary'),
        ('M', [0, 1], [[[scalar()]], [[scalar()]]], [1, 1], mirror_basis, 'unitary'),
        ('T', [0, 2], None, [1], A.eye(2), 'b'),
        ('MT', [0, 3], None, [2], diagonal(scalar(), scalar(F(1, 8))), 'a'),
        ('FULL', [0, 1, 2, 3], None, [1], A.eye(2), 'c'),
    ]
    for key, group, _, mult, L, kind in specs:
        if key == 'E':
            branches = [{'id': 'trivial', 'dimension': 1, 'matrices': {'E': A.encode_matrix([[scalar()]])}}]
        elif key == 'M':
            branches = [{'id': label, 'dimension': 1, 'matrices': {'E': A.encode_matrix([[scalar()]]), 'M': A.encode_matrix([[scalar(phase)]])}} for label, phase in [('plus-i', F(1, 4)), ('minus-i', F(-1, 4))]]
        elif key == 'MT':
            branches = [{'id': 'real-line', 'dimension': 1, 'matrices': {'E': A.encode_matrix([[scalar()]]), 'MT': A.encode_matrix([[scalar(F(3, 8))]])}}]
        else:
            branches = [{'id': 'kramers' if key == 'T' else 'mirror-pair', 'dimension': 2, 'matrices': {['E', 'M', 'T', 'MT'][g]: A.encode_matrix(C[g]) for g in group}}]
        tables[key] = {'group': [['E', 'M', 'T', 'MT'][g] for g in group], 'branches': branches, 'multiplicities': mult, 'wigner_type': kind, 'base_embedding': L}
    return tables


def shift_matrix(periods, n):
    ans = A.eye(2)
    for a, count in enumerate(n):
        for _ in range(abs(count)):
            ans = A.mul(periods[a] if count > 0 else A.adj(periods[a]), ans)
    return ans


def overlaps(charts):
    rows = []
    for s in charts:
        for t in charts:
            for n in product(range(-1, 2), repeat=3):
                low = [max(F(s['lower'][a]), F(t['lower'][a]) - n[a]) for a in range(3)]
                high = [min(F(s['upper'][a]), F(t['upper'][a]) - n[a]) for a in range(3)]
                if all(x < y for x, y in zip(low, high)):
                    rows.append({'source': s['id'], 'target': t['id'], 'shift': list(n), 'lower': list(map(str, low)), 'upper': list(map(str, high))})
    return rows


def produce(geometry_problem, geometry, route='closed-form'):
    C0 = constant_models()
    U = diagonal(scalar(0, 1, (F(1, 4),) * 3), scalar(0, 1, (F(-1, 4),) * 3))
    S = diagonal(scalar(F(1, 4)), scalar(F(-1, 4)))
    C = [A.mul(A.mul(U, x), A.adj(A.conj(U) if g >= 2 else U)) for g, x in enumerate(C0)]
    charts = [{'id': 'v' + ''.join(map(str, bits)), 'lower': [str(F(b, 2) - F(3, 8)) for b in bits], 'upper': [str(F(b, 2) + F(3, 8)) for b in bits]} for bits in product((0, 1), repeat=3)]
    problem = {'schema': 'mirror-grey-global-problem-v1', 'model': 'spinful-diagonal-mirror-grey', 'rank': 2, 'geometry_problem': geometry_problem, 'charts': charts, 'source_carrier': {name: A.encode_matrix(C0[i]) for i, name in enumerate(('E', 'M', 'T', 'MT'))}, 'spin_convention': 'M^2=T^2=-I; MT=TM semilinearly', 'scope': 'Complete selected little-group family and declared torus gluing; not a DFT band-gap or arbitrary equivariant-bundle certificate.'}
    tables = local_tables()
    cells, Ls = [], {}
    for cell in geometry['cells']:
        q = list(map(F, cell['witness']))
        actual = ['E']
        if (q[0] - q[1]).denominator == 1: actual.append('M')
        if all((2 * x).denominator == 1 for x in q): actual.append('T')
        if (q[0] + q[1]).denominator == 1 and (2 * q[2]).denominator == 1: actual.append('MT')
        if actual != cell['stabilizer']:
            raise ValueError('producer independently found a stabilizer mismatch')
        key = next(k for k, v in tables.items() if v['group'] == actual)
        base = tables[key]['base_embedding']
        # An alternate legal choice exercises exchange of repeated selected bases.
        # It is a second gauge fixture, not a second independent implementation.
        if route == 'complex-gauge':
            B = diagonal(scalar(F(1, 8)), scalar(F(-1, 8)))
            base = A.mul(base, B)
        L = A.mul(U, base)
        Ls[cell['id']] = L
        cells.append({'id': cell['id'], 'catalogue': key, 'embedding': A.encode_matrix(L)})
    if route != 'closed-form':
        raise ValueError('only independently derived closed-form route is released; no disguised second producer')
    boundary = [{'source': h, 'target': l, 'matrix': A.encode_matrix(A.mul(A.adj(Ls[l]), Ls[h]))} for h, l in geometry['incidences']]
    seams = []
    for row in geometry['period_pairs']:
        shift = [0, 0, 0]; shift[row['axis']] = 1
        target = A.pull(Ls[row['target']], b=tuple(map(F, shift)))
        seams.append({**row, 'matrix': A.encode_matrix(A.mul(A.mul(A.adj(target), S), Ls[row['source']]))})
    atlas = [{**o, 'matrix': A.encode_matrix(shift_matrix([S] * 3, o['shift']))} for o in overlaps(charts)]
    catalogues = {k: {a: b for a, b in value.items() if a != 'base_embedding'} for k, value in tables.items()}
    cert = {'schema': 'mirror-grey-global-certificate-v1', 'problem_sha256': digest(problem), 'geometry': geometry, 'catalogues': catalogues, 'source_gauge': A.encode_matrix(U), 'carrier': {name: A.encode_matrix(C[i]) for i, name in enumerate(('E', 'M', 'T', 'MT'))}, 'periods': [A.encode_matrix(S)] * 3, 'cells': cells, 'boundaries': boundary, 'seams': seams, 'atlas': atlas, 'producer': {'algorithm': 'analytic mirror eigenvectors and antiunitary pairing', 'independence': 'No verifier or geometry constructor imported; Phase 11 exact arithmetic shared and vendored.'}}
    return problem, cert


def main():
    p = argparse.ArgumentParser(); p.add_argument('--geometry-problem', required=True); p.add_argument('--geometry', required=True); p.add_argument('--output', required=True); args = p.parse_args()
    gp = json.loads(Path(args.geometry_problem).read_text(encoding='utf-8')); g = json.loads(Path(args.geometry).read_text(encoding='utf-8'))
    problem, cert = produce(gp, g)
    out = Path(args.output); out.mkdir(parents=True, exist_ok=True)
    for name, obj in [('problem.json', problem), ('certificate.json', cert)]: (out / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'GENERATED_NOT_VERIFIED', 'problem_sha256': digest(problem), 'cells': len(cert['cells']), 'output': str(out)}))


if __name__ == '__main__': main()
