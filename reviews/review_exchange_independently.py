"""Reproducible independent numeric decoding plus isolated contract probes.

The numeric check imports NumPy and the standard library only. It never imports
the producer, recipient or exact arithmetic. Contract mutations are checked by
separate recipient CLI processes and recorded separately from the numeric check.
"""
import argparse
from copy import deepcopy
from fractions import Fraction as F
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import numpy as np


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2), encoding='utf-8')


def numeric(problem, certificate):
    points = [(F(1,7),F(2,9),F(3,11)), (F(0),F(1,2),F(0)),
              (F(1,3),F(1,3),F(1,7)), (F(1,3),F(2,3),F(0)), (F(1,2),)*3]

    def matrix(raw, q):
        return np.array([[sum(float(F(t['coefficient'])) * np.exp(
            2j*np.pi*float(F(t['phase']) + sum(F(x)*y for x,y in zip(t['frequency'],q))))
            for t in entry) for entry in row] for row in raw], complex)

    names = ['E', 'M', 'T', 'MT']
    maxima, counts = {}, {}

    def check(kind, left, right):
        error = float(np.max(np.abs(left-right)))
        maxima[kind] = max(maxima.get(kind, 0), error)
        counts[kind] = counts.get(kind, 0)+1

    raw_embeddings = {x['id']: x['embedding'] for x in certificate['cells']}
    for q in points:
        C = {g: matrix(certificate['carrier'][g], q) for g in names}
        U = matrix(certificate['source_gauge'], q)
        S = [matrix(x,q) for x in certificate['periods']]
        check('gauge_unitarity', U@U.conj().T, np.eye(2))
        for g in names:
            source = matrix(problem['source_carrier'][g],q)
            Ug = U.conj() if g in ('T','MT') else U
            check('source_binding', C[g], U@source@Ug.conj().T)
            for h in names:
                i,j = names.index(g), names.index(h)
                sign = (-1)**((i&1)*(j&1)+(i>>1)*(j>>1))
                check('semilinear_group', C[g]@(C[h].conj() if i>=2 else C[h]), sign*C[names[i^j]])
        L = {cid: matrix(raw,q) for cid,raw in raw_embeddings.items()}
        for row in certificate['cells']:
            catalogue = certificate['catalogues'][row['catalogue']]
            check('cell_unitarity', L[row['id']]@L[row['id']].conj().T, np.eye(2))
            for g in catalogue['group']:
                blocks = [matrix(b['matrices'][g],q)
                          for b,m in zip(catalogue['branches'],catalogue['multiplicities'])
                          for _ in range(m)]
                direct = np.zeros((2,2),complex)
                at = 0
                for block in blocks:
                    direct[at:at+len(block),at:at+len(block)] = block
                    at += len(block)
                check('selected_decomposition', C[g]@(L[row['id']].conj() if g in ('T','MT') else L[row['id']]), L[row['id']]@direct)
        for row in certificate['boundaries']:
            check('boundary_binding', L[row['target']]@matrix(row['matrix'],q), L[row['source']])
        for axis in range(3):
            shifted = tuple(q[i]+(i==axis) for i in range(3))
            check('source_period', S[axis], matrix(certificate['source_gauge'],shifted)@U.conj().T)
            for g in names:
                check('period_covariance', S[axis]@C[g], matrix(certificate['carrier'][g],shifted)@(S[axis].conj() if g in ('T','MT') else S[axis]))
        for row in certificate['seams']:
            shifted = tuple(q[i]+(i==row['axis']) for i in range(3))
            check('seam_binding', matrix(raw_embeddings[row['target']],shifted)@matrix(row['matrix'],q), S[row['axis']]@L[row['source']])
    sx = np.array([[0,1],[1,0]],complex)
    sy = np.array([[0,-1j],[1j,0]])
    sz = np.diag([1,-1])
    pauli = [sx,sy,sz]
    M = np.array([[0,1,0],[1,0,0],[0,0,1]])
    Um = matrix(problem['source_carrier']['M'],points[0])
    J = matrix(problem['source_carrier']['T'],points[0])
    for j in range(3):
        check('mirror_axial_spin', Um@pauli[j]@Um.conj().T, sum(-M[i,j]*pauli[i] for i in range(3)))
        check('time_reversal_spin', J@pauli[j].conj()@J.conj().T, -pauli[j])
    return {'status': 'PASS' if max(maxima.values()) < 1e-12 else 'FAIL',
            'scope': 'Independent floating evaluation of submitted Fourier JSON; no producer/verifier/arithmetic-core import. Supplementary numerical cross-check, not exact proof.',
            'points': [[str(x) for x in q] for q in points], 'counts': counts,
            'total_comparisons': sum(counts.values()), 'max_residual': maxima}


def probes(base, problem, certificate, output):
    cases = []
    p,c = deepcopy(problem),deepcopy(certificate)
    p['scope'] = 'Claims arbitrary materials and a DFT gap'
    c['problem_sha256'] = digest(p)
    cases.append(('overstated-scope-rebound',p,c,'contract'))
    p,c = deepcopy(problem),deepcopy(certificate)
    p['geometry_problem']['period_axes'] = []
    c['problem_sha256'] = digest(p)
    cases.append(('missing-period-axes-rebound',p,c,'contract'))
    p,c = deepcopy(problem),deepcopy(certificate)
    p['geometry_problem'] = []
    c['problem_sha256'] = digest(p)
    cases.append(('nonobject-geometry-rebound',p,c,'contract'))
    p,c = deepcopy(problem),deepcopy(certificate)
    row = next(r for r in c['seams'] if r['axis'] == 1)
    row['axis'] = True
    cases.append(('boolean-seam-axis',p,c,'period'))
    p,c = deepcopy(problem),deepcopy(certificate)
    row = next(r for r in c['atlas'] if 1 in r['shift'])
    row['shift'][row['shift'].index(1)] = True
    cases.append(('boolean-atlas-shift',p,c,'atlas'))
    results = []
    for name,p,c,stage in cases:
        pp,cp = output/(name+'.problem.json'),output/(name+'.certificate.json')
        write(pp,p)
        write(cp,c)
        proc = subprocess.run([sys.executable,'-B','-I',str(base/'exchange/verify.py'),
                               '--problem',str(pp),'--certificate',str(cp)],
                              capture_output=True,text=True,encoding='utf-8',timeout=60)
        result = json.loads(proc.stdout)
        write(output/(name+'.result.json'),result)
        (output/(name+'.stderr.txt')).write_text(proc.stderr,encoding='utf-8')
        results.append({'case': name, 'expected_stage': stage, 'result': result,
                        'exit_code': proc.returncode, 'problem_sha256': digest(p),
                        'certificate_sha256': digest(c),
                        'pass': result['status']=='INVALID' and result.get('stage')==stage and proc.returncode==2})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-dir',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output',type=Path)
    args = parser.parse_args()
    base = args.base_dir.resolve()
    out = args.output or base/'reviews/general_geometry_exchange_review.json'
    pp,cp = base/'exchange/fixtures/mirror/problem.json',base/'exchange/fixtures/mirror/certificate.json'
    problem,certificate = [json.loads(p.read_text(encoding='utf-8')) for p in (pp,cp)]
    report = numeric(problem,certificate)
    report['environment'] = {'python': sys.version, 'numpy': np.__version__}
    report['contract_probes'] = probes(base,problem,certificate,out.parent/'exchange_review_cases')
    report['reviewed_source_sha256'] = {p.relative_to(base).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                                       for p in (pp,cp,base/'exchange/verify.py',Path(__file__).resolve())}
    report['status'] = 'PASS' if report['status']=='PASS' and all(p['pass'] for p in report['contract_probes']) else 'FAIL'
    write(out,report)
    print(json.dumps({'status':report['status'],'comparisons':report['total_comparisons'],
                      'max_residual':max(report['max_residual'].values()),'contract_probes':len(report['contract_probes']),
                      'output':str(out)},indent=2))
    return 0 if report['status']=='PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
