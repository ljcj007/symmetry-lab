"""Exact SU(3) associativity matrices in the site's orthonormal GT convention.

Columns are left-associated paths and rows are right-associated paths.  The
matrix is computed in the highest-weight multiplicity space, never by fitting
floating-point numbers to radicals.  Only the first binary vertex needs a
complete CG matrix; the second vertex uses a selected highest-weight kernel.
"""
from collections import Counter
from functools import lru_cache
import math

import numpy as np
import sympy as sp

from su3_cg import _dimension, _integer, _name, _z as _numeric_z, _maxabs
from su3_cg_exact import (_irrep, _coupling, _null_basis, _matrix_simp,
                          _simp, _zero, _state, _z)


FACTORS = ((0, 0), (1, 0), (0, 1), (2, 0), (0, 2), (1, 1))
MAX_DIMENSION = 512


def _representation(p, q, **extra):
    return dict(p=p, q=q, label=_name(p, q), dimension=_dimension(p, q), **extra)


@lru_cache(maxsize=64)
def _decomposition(labels):
    """Exact integer character subtraction, independent of CG nullspaces."""
    from lie_applications import _weights
    weights = Counter({(0, 0): 1})
    for p, q in labels:
        product = Counter()
        for a, count in weights.items():
            for b, copies in _weights(p, q).items():
                product[a[0] + b[0], a[1] + b[1]] += count * copies
        weights = product
    remaining, result = weights.copy(), []
    while remaining:
        candidates = [w for w, count in remaining.items() if count > 0 and min(w) >= 0]
        if not candidates:
            raise ArithmeticError('SU(3) character subtraction has no dominant highest weight')
        p, q = max(candidates, key=lambda w: (sum(w), w[0]))
        count = remaining[p, q]
        for w, multiplicity in _weights(p, q).items():
            remaining[w] -= count * multiplicity
            if remaining[w] < 0:
                raise ArithmeticError('SU(3) character subtraction became negative')
        remaining = +remaining
        result.append(_representation(p, q, multiplicity=count))
    if sum(row['dimension'] * row['multiplicity'] for row in result) != sum(weights.values()):
        raise ArithmeticError('SU(3) character dimension mismatch')
    return tuple(result)


@lru_cache(maxsize=96)
def _highest(p1, q1, p2, q2, p, q):
    """Selected binary CG highest columns with both outer-copy conventions."""
    left, right = _irrep(p1, q1), _irrep(p2, q2)
    n1, n2 = left['dimension'], right['dimension']
    weights = [(a[0] + b[0], a[1] + b[1]) for a in left['weights'] for b in right['weights']]
    indices = [i for i, weight in enumerate(weights) if weight == (p, q)]
    if not indices:
        return ()
    # Only rows reachable from this weight can constrain a raising kernel.
    constraints = []
    for gi, root in ((0, (2, -1)), (2, (-1, 2))):
        output = [i for i, w in enumerate(weights) if w == (p + root[0], q + root[1])]
        matrix = sp.zeros(len(output), len(indices))
        a, b = left['generators'][gi], right['generators'][gi]
        for r, row in enumerate(output):
            ir, jr = divmod(row, n2)
            for c, col in enumerate(indices):
                ic, jc = divmod(col, n2)
                matrix[r, c] = (a[ir, ic] if jr == jc else 0) + (b[jr, jc] if ir == ic else 0)
        constraints.append(matrix)
    identical = (p1, q1) == (p2, q2)
    permutation = None
    if identical:
        lookup = {index: i for i, index in enumerate(indices)}
        permutation = sp.zeros(len(indices))
        for i, index in enumerate(indices):
            a, b = divmod(index, n2)
            permutation[lookup[b * n1 + a], i] = 1
    result = []
    for parity in ((1, -1) if identical else (None,)):
        matrices = list(constraints)
        if identical:
            matrices.append(permutation - parity * sp.eye(len(indices)))
        for seed in _null_basis(sp.Matrix.vstack(*matrices)):
            if not all(_zero(matrix * seed) for matrix in matrices):
                raise ArithmeticError('Selected binary highest-weight verification failed')
            if _simp((seed.T * seed)[0] - 1) != 0:
                raise ArithmeticError('Selected binary normalization failed')
            result.append({'copy': len(result) + 1, 'swapParity': parity,
                           'indices': indices, 'seed': seed})
    expected = next((row['multiplicity'] for row in _decomposition(((p1, q1), (p2, q2)))
                     if (row['p'], row['q']) == (p, q)), 0)
    if len(result) != expected:
        raise ArithmeticError('Selected binary highest-weight multiplicity mismatch')
    return tuple(result)


def _triple_weights(factors):
    reps = [_irrep(*pair) for pair in factors]
    return [(a[0] + b[0] + c[0], a[1] + b[1] + c[1])
            for a in reps[0]['weights'] for b in reps[1]['weights'] for c in reps[2]['weights']]


def _paths(factors, target, side, rows):
    a, b, c = factors
    first = _coupling(*(a + b if side == 'left' else b + c))
    n1, n2, n3 = [_dimension(*pair) for pair in factors]
    lookup = {row: i for i, row in enumerate(rows)}
    vectors, paths = [], []
    for block in first['blocks']:
        middle = (block['p'], block['q'])
        second = _highest(*(middle + c if side == 'left' else a + middle), *target)
        if not second:
            continue
        cg = first['matrix'][:, block['start']:block['end']]
        for outer in second:
            vector = sp.zeros(len(rows), 1)
            for index, amplitude in zip(outer['indices'], outer['seed']):
                if amplitude == 0:
                    continue
                if side == 'left':
                    local, ic = divmod(index, n3)
                    for ab in range(n1 * n2):
                        if cg[ab, local] != 0:
                            vector[lookup[ab * n3 + ic]] += cg[ab, local] * amplitude
                else:
                    ia, local = divmod(index, block['dimension'])
                    for bc in range(n2 * n3):
                        if cg[bc, local] != 0:
                            vector[lookup[ia * n2 * n3 + bc]] += cg[bc, local] * amplitude
            vectors.append(_matrix_simp(vector))
            suffix = 's' if block['swapParity'] == 1 else 'a' if block['swapParity'] == -1 else ''
            intermediate = _representation(*middle)
            first_label, second_label = ('α', 'β') if side == 'left' else ('γ', 'δ')
            label = (f"{intermediate['label']}{suffix} · {first_label}={block['copy']}, {second_label}={outer['copy']}")
            paths.append({'index': len(paths), 'label': label, 'intermediate': intermediate,
                          'firstCopy': block['copy'], 'secondCopy': outer['copy'],
                          'firstSwapParity': block['swapParity'], 'secondSwapParity': outer['swapParity'],
                          'swapParity': block['swapParity']})
    return sp.Matrix.hstack(*vectors), paths


def _lowered(factors, rows, columns, target):
    """One independent GT state overlap; the singlet has no lowering state."""
    p, q = target
    if p == q == 0:
        return columns, rows
    gi, root, norm = (1, (2, -1), p) if p else (3, (-1, 2), q)
    weights = _triple_weights(factors)
    outrows = [i for i, w in enumerate(weights) if w == (p - root[0], q - root[1])]
    n1, n2, n3 = [_dimension(*pair) for pair in factors]
    gs = [_irrep(*pair)['generators'][gi] for pair in factors]
    lowering = sp.zeros(len(outrows), len(rows))
    def unpack(index):
        a, bc = divmod(index, n2 * n3)
        b, c = divmod(bc, n3)
        return a, b, c
    for i, row in enumerate(outrows):
        indices = unpack(row)
        for j, col in enumerate(rows):
            source = unpack(col)
            for k in range(3):
                if all(indices[t] == source[t] for t in range(3) if t != k):
                    lowering[i, j] += gs[k][indices[k], source[k]]
    return _matrix_simp(lowering * columns / sp.sqrt(norm)), outrows


@lru_cache(maxsize=8)
def _recoupling(factors, target):
    targets = _decomposition(factors)
    expected = next((row['multiplicity'] for row in targets if (row['p'], row['q']) == target), 0)
    if not expected:
        raise ValueError('所选最终表示不出现在该三重张量积中，请从最终表示列表选择')
    weights = _triple_weights(factors)
    rows = [i for i, w in enumerate(weights) if w == target]
    left, left_paths = _paths(factors, target, 'left', rows)
    right, right_paths = _paths(factors, target, 'right', rows)
    if len(left_paths) != expected or len(right_paths) != expected:
        raise ArithmeticError('Racah path count does not equal the character multiplicity')
    f = _matrix_simp(right.T * left)
    if not _zero(left.T * left - sp.eye(expected)) or not _zero(right.T * right - sp.eye(expected)):
        raise ArithmeticError('Racah path embeddings are not orthonormal')
    if not _zero(f.T * f - sp.eye(expected)) or not _zero(f * f.T - sp.eye(expected)):
        raise ArithmeticError('Exact Racah unitarity failed')
    if not _zero(right * f - left):
        raise ArithmeticError('Highest-weight multiplicity space reconstruction failed')
    ll, _ = _lowered(factors, rows, left, target)
    rr, _ = _lowered(factors, rows, right, target)
    if not _zero(ll.T * ll - sp.eye(expected)) or not _zero(rr.T * ll - f):
        raise ArithmeticError('Racah matrix depends on the final GT state')
    sixj = f.applyfunc(lambda value: value)
    for i, path_r in enumerate(right_paths):
        for j, path_l in enumerate(left_paths):
            sixj[i, j] = _simp(f[i, j] / sp.sqrt(path_r['intermediate']['dimension'] * path_l['intermediate']['dimension']))
    dl = sp.diag(*[path['intermediate']['dimension'] for path in left_paths])
    dr = sp.diag(*[path['intermediate']['dimension'] for path in right_paths])
    if not _zero(sixj.T * dr * sixj - dl.inv()):
        raise ArithmeticError('Dimension-reduced six-j weighted orthogonality failed')
    numeric = lambda matrix: np.array(matrix.evalf(17).tolist(), dtype=float)
    nf, nl, nr, nll, nrr, ns = [numeric(matrix) for matrix in (f, left, right, ll, rr, sixj)]
    checks = {'unitarity': max(_maxabs(nf.T @ nf - np.eye(expected)), _maxabs(nf @ nf.T - np.eye(expected))),
              'pathOrthogonality': max(_maxabs(nl.T @ nl - np.eye(expected)), _maxabs(nr.T @ nr - np.eye(expected))),
              'reconstruction': _maxabs(nr @ nf - nl), 'gtStateIndependence': _maxabs(nrr.T @ nll - nf),
              'weightedSixJ': _maxabs(ns.T @ np.diag([p['intermediate']['dimension'] for p in right_paths]) @ ns
                                        - np.diag([1 / p['intermediate']['dimension'] for p in left_paths])),
              'multiplicity': 0.0}
    return {'matrix': f, 'sixJ': sixj, 'numeric': nf, 'leftPaths': left_paths, 'rightPaths': right_paths,
            'targets': targets, 'checks': checks, 'left': left, 'right': right, 'weightRows': rows}


def run(payload):
    if not isinstance(payload, dict) or payload.get('lab') != 'lie' or payload.get('experiment') != 'su3_racah':
        raise ValueError('SU(3) 重耦合要求 lab="lie", experiment="su3_racah"')
    if set(payload) - {'lab', 'experiment', 'factors', 'target', 'direction', 'state'}:
        raise ValueError('SU(3) 重耦合含不支持的输入字段')
    raw = payload.get('factors', [[1, 0], [1, 0], [1, 0]])
    if not isinstance(raw, list) or len(raw) != 3:
        raise ValueError('factors 必须含三个 [p,q] 表示')
    factors = []
    for pair in raw:
        if not isinstance(pair, list) or len(pair) != 2:
            raise ValueError('每个因子必须为 [p,q]')
        label = tuple(_integer(x, 0, 2, 'Dynkin label') for x in pair)
        if label not in FACTORS:
            raise ValueError('每个输入因子要求 p+q≤2，支持 1、3、3̄、6、6̄、8')
        factors.append(label)
    factors = tuple(factors)
    n = math.prod(_dimension(*pair) for pair in factors)
    if n > MAX_DIMENSION:
        raise ValueError(f'三重积总维数不得超过 {MAX_DIMENSION}')
    targets = _decomposition(factors)
    preferred = next((row for row in targets if (row['p'], row['q']) == (1, 1)), targets[0])
    raw_target = payload.get('target', [preferred['p'], preferred['q']])
    if not isinstance(raw_target, list) or len(raw_target) != 2:
        raise ValueError('target 必须为最终表示的 [p,q]')
    target = tuple(_integer(x, 0, 6, 'target') for x in raw_target)
    direction = payload.get('direction', 'left_to_right')
    if direction not in ('left_to_right', 'right_to_left'):
        raise ValueError('direction 必须为 left_to_right 或 right_to_left')
    target_data = next((row for row in targets if (row['p'], row['q']) == target), None)
    if target_data is None:
        raise ValueError('所选最终表示不出现在该三重张量积中，请从最终表示列表选择')
    vector = _state(payload.get('state', {'index': 0}), target_data['multiplicity'])
    data = _recoupling(factors, target)
    f = data['matrix']
    output = _matrix_simp((f if direction == 'left_to_right' else f.T) * vector)
    restored = _matrix_simp((f.T if direction == 'left_to_right' else f) * output)
    input_norm = _simp((vector.conjugate().T * vector)[0])
    output_norm = _simp((output.conjugate().T * output)[0])
    if _simp(input_norm - output_norm) != 0 or not _zero(restored - vector):
        raise ArithmeticError('Exact Racah state roundtrip failed')
    nv = np.array([complex(sp.N(x, 17)) for x in vector])
    no = np.array([complex(sp.N(x, 17)) for x in output])
    nf = data['numeric']
    recovered = (nf.T if direction == 'left_to_right' else nf) @ no
    in_norm, out_norm = float(input_norm), float(output_norm)
    checks = dict(data['checks'], stateNorm=float(abs(np.vdot(no, no).real - np.vdot(nv, nv).real) / in_norm),
                  roundtrip=_maxabs(recovered - nv) / math.sqrt(in_norm))
    out_paths = data['rightPaths' if direction == 'left_to_right' else 'leftPaths']
    return {
        'lab': 'lie', 'experiment': 'su3_racah', 'group': 'su3', 'arithmetic': 'exact',
        'title': 'SU(3) Racah（6j）与三重张量积重耦合', 'dimension': n,
        'factors': [_representation(*pair) for pair in factors], 'target': target_data,
        'targets': list(data['targets']), 'multiplicity': target_data['multiplicity'], 'direction': direction,
        'leftPaths': data['leftPaths'], 'rightPaths': data['rightPaths'],
        'fMatrix': data['numeric'].tolist(), 'exactFMatrix': [[str(x) for x in row] for row in f.tolist()],
        'sixJMatrix': np.array(data['sixJ'].evalf(17).tolist(), dtype=float).tolist(),
        'exactSixJMatrix': [[str(x) for x in row] for row in data['sixJ'].tolist()],
        'matrixOrientation': 'F[rightPath][leftPath] = V_R† V_L; b_R=F b_L, b_L=F† b_R',
        'sixJDefinition': 'S[rightPath][leftPath] = F[rightPath][leftPath] / sqrt(dim(E) dim(F)); project GT phase convention',
        'inputAmplitudes': [_numeric_z(z) for z in nv], 'outputAmplitudes': [_numeric_z(z) for z in no],
        'exactInputAmplitudes': [_z(z) for z in vector], 'exactOutputAmplitudes': [_z(z) for z in output],
        'inputNorm': in_norm, 'outputNorm': out_norm, 'exactInputNorm': str(input_norm), 'exactOutputNorm': str(output_norm),
        'inputProbabilities': [float(_simp(sp.conjugate(z) * z / input_norm)) for z in vector],
        'outputProbabilities': [float(_simp(sp.conjugate(z) * z / output_norm)) for z in output],
        'exactInputProbabilities': [str(_simp(sp.conjugate(z) * z / input_norm)) for z in vector],
        'exactOutputProbabilities': [str(_simp(sp.conjugate(z) * z / output_norm)) for z in output],
        'outputTerms': [{'index': i, 'label': out_paths[i]['label'], 'amplitude': _numeric_z(no[i]),
                         'exactAmplitude': _z(z), 'probability': float(_simp(sp.conjugate(z) * z / output_norm))}
                        for i, z in enumerate(output) if z != 0],
        'checks': checks, 'exactChecks': {name: '0' for name in checks},
        'convention': [
            '三因子顺序固定 A⊗B⊗C；左路径为 ((A B)E C)D，右路径为 (A (B C)F)D。',
            '每个二元顶点沿用本站正交 GT、坐标轴投影及首个非零最高权系数为正的相位；相同因子先交换对称后反对称。',
            '左路径 α=firstCopy、β=secondCopy，右路径 γ=firstCopy、δ=secondCopy，分别标出两个二元顶点的外重数；这些标签不能只用中间表示代替。',
            'F 的行是右路径、列是左路径；F 为正交矩阵，不随最终表示的 GT 磁量子态改变。',
            '本项目维数缩约 6j 定义为 S_fe=F_fe/√(dimE dimF)，其相位与文献约定可能不同；F 与 S 不可混用。',
            '范数为平方范数；输入不自动归一化，所示概率按该平方范数归一化。',
        ],
        'derivation': [
            '用整数 GT 权字符逐项相减分解 A⊗B⊗C，得到最终表示 D 的外重数 m。',
            '枚举 E⊂A⊗B 及 D⊂E⊗C，分别保留两个顶点的外重数，构造 m 条左路径；右路径同理。',
            '将次顶点最高权零空间与首顶点完整 CG 嵌入复合，得到三重乘积基中的 V_L 与 V_R。',
            '计算 F=V_R†V_L，严格检查 F†F=I、V_R F=V_L 和路径数 m；降低一个最终 GT 态再次核对相同 F。',
            '用 b_R=F b_L 或 b_L=F† b_R 换基，精确核对范数与往返；维数缩约 S 满足 S† diag(dimF) S=diag(1/dimE)。',
        ],
        'notes': [
            '六类输入 1、3、3̄、6、6̄、8 的三重积，总维数≤512；最终表示从精确三重分解选择，计算所选表示的重数空间。',
            '省略 target 时优先选择实际出现的 8，否则选择三重分解的首项；显式指定不存在的最终表示会报错。',
            '全部系数由 SymPy 的有理数与根式运算直接构造；小数仅为精确结果的预览，未使用浮点拟合根式。',
            'Racah 矩阵是不同结合顺序的基底变换，不自动给出哈密顿量、散射振幅或能谱。',
        ],
        'sources': [
            {'title': 'Alex et al.: SU(N) Clebsch–Gordan algorithm and GT convention',
             'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/PapersVonDelft/Alex2011.pdf'},
            {'title': 'Authors’ SU(N) Clebsch–Gordan calculator and conventions',
             'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/Papers/ClebschGordan/'},
            {'title': 'Dang et al. (2024): canonical U(3) coupling and recoupling, §5.1',
             'url': 'https://link.springer.com/article/10.1140/epjp/s13360-024-05501-8'},
            {'title': 'Lanina & Sleptsov (2023): Racah matrices and dimension-reduced 6j, §2.1',
             'url': 'https://scoap3-prod-backend.s3.cern.ch/media/files/79803/10.1016/j.physletb.2023.138138.pdf'},
        ],
    }
