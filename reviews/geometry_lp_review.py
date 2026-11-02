"""Independent numerical LP census of the exact arrangement's sign strata.

This does not import the constructor/checker. It is a numerical cross-check,
not part of the exact proof or acceptance algorithm.
"""
from pathlib import Path
from itertools import product
from fractions import Fraction
import hashlib
import json
import time
import numpy as np
import scipy
from scipy.optimize import linprog
from scipy.spatial import ConvexHull

HERE = Path(__file__).resolve().parent
BASE = HERE.parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def feasible(planes, signs):
    # Maximise a common strict inequality margin, with the cube always closed.
    # Zero signs are exact equality constraints supplied to HiGHS.
    aub, bub, aeq, beq = [], [], [], []
    for plane, sign in zip(planes, signs):
        normal = np.array(plane['normal'], dtype=float)
        offset = float(Fraction(str(plane['offset'])))
        if sign == 0:
            aeq.append([*normal, 0.0]); beq.append(offset)
        else:
            aub.append([*(-sign*normal), 1.0]); bub.append(-sign*offset)
    result = linprog([0, 0, 0, -1], A_ub=aub or None, b_ub=bub or None,
                     A_eq=aeq or None, b_eq=beq or None,
                     bounds=[(0, 1)]*3 + [(0, 1)], method='highs',
                     options={'dual_feasibility_tolerance': 1e-9,
                              'primal_feasibility_tolerance': 1e-9})
    if result.status == 2:
        return False, None
    if not result.success:
        raise RuntimeError('LP failed: ' + result.message)
    delta = float(result.x[3])
    if 1e-10 < delta < 1e-7:
        raise RuntimeError('Ambiguous small margin, numerical audit inconclusive')
    return delta > 1e-8, result.x.tolist()


def main():
    start = time.perf_counter()
    cp = BASE / 'geometry/diagonal_mirror.certificate.json'
    pp = BASE / 'geometry/diagonal_mirror.problem.json'
    certificate = json.loads(cp.read_text(encoding='utf-8'))
    problem = json.loads(pp.read_text(encoding='utf-8'))
    planes = certificate['planes']
    prefixes = [()]
    lp_calls = 0
    progression = []
    witnesses = {}
    for depth in range(len(planes)):
        following = []
        for prefix in prefixes:
            for sign in (-1, 0, 1):
                signs = prefix + (sign,)
                possible, witness = feasible(planes, signs)
                lp_calls += 1
                if possible:
                    following.append(signs)
                    if depth == len(planes)-1:
                        witnesses[signs] = witness
        prefixes = following
        progression.append(len(prefixes))
    expected = {tuple(c['signs']) for c in certificate['cells']}
    observed = set(prefixes)
    if expected != observed:
        raise AssertionError({'missing': list(observed-expected), 'extra': list(expected-observed)})
    total_volume = sum(ConvexHull(np.array([[float(Fraction(x)) for x in v]
                                          for v in c['vertices']])).volume
                       for c in certificate['cells'] if c['dimension'] == 3)
    assert abs(total_volume - 1.0) < 1e-12
    sample_count = 0
    # Independently use the input action, not the supplied stabilizer list.
    rotations = [(op['id'], (-1 if op['anti'] else 1)*np.linalg.inv(np.array(op['rotation'])).T)
                 for op in problem['operations']]
    for cell in certificate['cells']:
        q = np.array(witnesses[tuple(cell['signs'])][:3])
        found = [name for name, action in rotations
                 if np.max(np.abs((action@q-q)-np.rint(action@q-q))) < 1e-8]
        assert found == cell['stabilizer'], (cell['id'], found, cell['stabilizer'])
        sample_count += 1
    euler = sum((-1)**c['dimension'] for c in certificate['cells'])
    assert euler == 1
    result = {'status': 'PASS_NUMERICAL_CROSS_CHECK',
              'scope': 'Independent HiGHS strict-feasibility census; not an exact certificate proof',
              'imports_exact_checker': False, 'lp_calls': lp_calls,
              'feasible_prefix_counts': progression, 'final_sign_strata': len(observed),
              'stabilizer_witnesses': sample_count, 'sum_3d_volume': total_volume,
              'closed_cube_euler_characteristic': euler,
              'numpy_version': np.__version__, 'scipy_version': scipy.__version__,
              'source_sha256': digest(Path(__file__)),
              'input_sha256': {str(p.relative_to(BASE)): digest(p) for p in (pp, cp)},
              'seconds': time.perf_counter()-start}
    (HERE/'GEOMETRY_LP_REVIEW.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
