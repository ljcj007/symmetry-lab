"""Exact paired-tree SU(3) recoupling in the site's orthonormal GT gauge.

Rows refer to ((A C)G (B D)H)T and columns to ((A B)E (C D)F)T.
The right embedding is explicitly permuted from ACBD to the common ABCD
product order before overlaps are taken.  All three vertex outer copies are
retained; only the selected final highest-weight multiplicity space is built.
"""
from functools import lru_cache
from itertools import product
import math

import numpy as np
import sympy as sp

from su3_cg import _dimension, _integer, _maxabs, _z as _numeric_z
from su3_cg_exact import _irrep, _coupling, _matrix_simp, _simp, _zero, _state, _z
from su3_racah import FACTORS, _representation, _decomposition, _highest


MAX_DIMENSION = 4096


def _four_weights(factors):
    return [(sum(w[0] for w in weights), sum(w[1] for w in weights))
            for weights in product(*[_irrep(*pair)['weights'] for pair in factors])]


def _paths(factors, target, side, rows):
    """Compose two full first-level CG maps with selected root kernels."""
    a, b, c, d = factors
    pair1, pair2 = ((a, b), (c, d)) if side == 'left' else ((a, c), (b, d))
    first, second = _coupling(*(pair1[0] + pair1[1])), _coupling(*(pair2[0] + pair2[1]))
    na, nb, nc, nd = [_dimension(*pair) for pair in factors]
    lookup = {row: i for i, row in enumerate(rows)}
    paths, vectors = [], []
    columns1 = {i: [(r, first['matrix'][r, i]) for r in range(first['matrix'].rows)
                    if first['matrix'][r, i] != 0] for i in range(first['matrix'].cols)}
    columns2 = {i: [(r, second['matrix'][r, i]) for r in range(second['matrix'].rows)
                    if second['matrix'][r, i] != 0] for i in range(second['matrix'].cols)}
    for block1 in first['blocks']:
        e = (block1['p'], block1['q'])
        for block2 in second['blocks']:
            f = (block2['p'], block2['q'])
            for outer in _highest(*(e + f), *target):
                vector = sp.zeros(len(rows), 1)
                for index, coefficient in zip(outer['indices'], outer['seed']):
                    if coefficient == 0:
                        continue
                    ie, jf = divmod(index, block2['dimension'])
                    for i, x in columns1[block1['start'] + ie]:
                        for j, y in columns2[block2['start'] + jf]:
                            if side == 'left':
                                row = i * nc * nd + j
                            else:
                                # i indexes AC, j indexes BD.  Put both into
                                # ABCD before comparing the two embeddings.
                                ia, ic = divmod(i, nc)
                                ib, id_ = divmod(j, nd)
                                row = ((ia * nb + ib) * nc + ic) * nd + id_
                            vector[lookup[row]] += coefficient * x * y
                vectors.append(_matrix_simp(vector))
                rep1, rep2 = _representation(*e), _representation(*f)
                suffix = lambda parity: 's' if parity == 1 else 'a' if parity == -1 else ''
                letters = ('α', 'β', 'γ') if side == 'left' else ('δ', 'ε', 'ζ')
                label = (f"{rep1['label']}{suffix(block1['swapParity'])} × "
                         f"{rep2['label']}{suffix(block2['swapParity'])} · "
                         f"{letters[0]}={block1['copy']}, {letters[1]}={block2['copy']}, {letters[2]}={outer['copy']}")
                paths.append({'index': len(paths), 'label': label,
                              'firstIntermediate': rep1, 'secondIntermediate': rep2,
                              'firstCopy': block1['copy'], 'secondCopy': block2['copy'], 'finalCopy': outer['copy'],
                              'firstSwapParity': block1['swapParity'], 'secondSwapParity': block2['swapParity'],
                              'finalSwapParity': outer['swapParity']})
    return sp.Matrix.hstack(*vectors), paths


@lru_cache(maxsize=16)
def _lowering(factors, target):
    """Build the selected-weight lowering map by acting on one tensor axis.

    Each GT generator is sparse.  Visiting its nonzero column entries avoids
    testing every pair of four-factor product states, and never constructs a
    4096 by 4096 product generator.
    """
    p, q = target
    gi, root, norm = (1, (2, -1), p) if p else (3, (-1, 2), q)
    weights = _four_weights(factors)
    rows = [i for i, weight in enumerate(weights) if weight == target]
    outrows = [i for i, weight in enumerate(weights) if weight == (p - root[0], q - root[1])]
    dimensions = [_dimension(*pair) for pair in factors]
    generators = [_irrep(*pair)['generators'][gi] for pair in factors]
    strides = [math.prod(dimensions[k + 1:]) for k in range(4)]
    lookup = {row: i for i, row in enumerate(outrows)}
    columns = [[[(r, generator[r, c]) for r in range(generator.rows)
                 if generator[r, c] != 0] for c in range(generator.cols)]
               for generator in generators]
    entries = {}
    for j, col in enumerate(rows):
        for axis, stride in enumerate(strides):
            source = (col // stride) % dimensions[axis]
            for destination, amplitude in columns[axis][source]:
                key = (lookup[col + (destination - source) * stride], j)
                entries[key] = entries.get(key, 0) + amplitude
    return sp.SparseMatrix(len(outrows), len(rows), entries), outrows, rows, norm


def _lowered(factors, rows, columns, target):
    """Verify the overlap on one additional normalized final GT state."""
    if target == (0, 0):
        return columns, rows
    lowering, outrows, source_rows, norm = _lowering(factors, target)
    if rows != source_rows:
        raise ArithmeticError('Nine-j lowering weight rows are inconsistent')
    return _matrix_simp(lowering * columns / sp.sqrt(norm)), outrows


def _crossing_rows(factors, rows):
    """B↔C is an exact row permutation when the two middle factors agree."""
    _, nb, nc, nd = [_dimension(*pair) for pair in factors]
    lookup = {row: i for i, row in enumerate(rows)}
    permutation = []
    for row in rows:
        abc, id_ = divmod(row, nd)
        ab, ic = divmod(abc, nc)
        ia, ib = divmod(ab, nb)
        permutation.append(lookup[((ia * nb + ic) * nc + ib) * nd + id_])
    return permutation


def _path_dimension(path):
    return path['firstIntermediate']['dimension'] * path['secondIntermediate']['dimension']


@lru_cache(maxsize=8)
def _recoupling(factors, target):
    targets = _decomposition(factors)
    expected = next((row['multiplicity'] for row in targets if (row['p'], row['q']) == target), 0)
    if not expected:
        raise ValueError('所选最终表示不出现在该四重张量积中，请从最终表示列表选择')
    rows = [i for i, weight in enumerate(_four_weights(factors)) if weight == target]
    left, left_paths = _paths(factors, target, 'left', rows)
    if factors[1] == factors[2]:
        # The two natural paired-tree embeddings then have identical CG
        # coefficients.  Reuse them with the actual B↔C product-axis
        # permutation; this does not identify or discard any outer copy.
        right = left[_crossing_rows(factors, rows), :]
        letters = str.maketrans({'α': 'δ', 'β': 'ε', 'γ': 'ζ'})
        right_paths = [dict(path, label=path['label'].translate(letters)) for path in left_paths]
    else:
        right, right_paths = _paths(factors, target, 'right', rows)
    if len(left_paths) != expected or len(right_paths) != expected:
        raise ArithmeticError('Nine-j path count does not equal the character multiplicity')
    matrix = _matrix_simp(right.T * left)
    if not _zero(left.T * left - sp.eye(expected)) or not _zero(right.T * right - sp.eye(expected)):
        raise ArithmeticError('Nine-j paired-tree embeddings are not orthonormal')
    if not _zero(matrix.T * matrix - sp.eye(expected)) or not _zero(matrix * matrix.T - sp.eye(expected)):
        raise ArithmeticError('Exact nine-j recoupling unitarity failed')
    if not _zero(right * matrix - left):
        raise ArithmeticError('Nine-j highest-weight reconstruction failed')
    ll, _ = _lowered(factors, rows, left, target)
    rr, _ = _lowered(factors, rows, right, target)
    if not _zero(ll.T * ll - sp.eye(expected)) or not _zero(rr.T * ll - matrix):
        raise ArithmeticError('Nine-j recoupling depends on the final GT state')
    dl, dr = [_path_dimension(path) for path in left_paths], [_path_dimension(path) for path in right_paths]
    ninej = matrix.applyfunc(lambda value: value)
    for i in range(expected):
        for j in range(expected):
            ninej[i, j] = _simp(matrix[i, j] / sp.sqrt(dr[i] * dl[j]))
    if not _zero(ninej.T * sp.diag(*dr) * ninej - sp.diag(*dl).inv()):
        raise ArithmeticError('Dimension-reduced nine-j weighted orthogonality failed')
    numeric = lambda value: np.array(value.evalf(17).tolist(), dtype=float)
    nr, nl, nright, nll, nrr, ns = [numeric(value) for value in (matrix, left, right, ll, rr, ninej)]
    checks = {'unitarity': max(_maxabs(nr.T @ nr - np.eye(expected)), _maxabs(nr @ nr.T - np.eye(expected))),
              'pathOrthogonality': max(_maxabs(nl.T @ nl - np.eye(expected)), _maxabs(nright.T @ nright - np.eye(expected))),
              'reconstruction': _maxabs(nright @ nr - nl), 'gtStateIndependence': _maxabs(nrr.T @ nll - nr),
              'weightedNineJ': _maxabs(ns.T @ np.diag(dr) @ ns - np.diag([1 / x for x in dl])),
              'multiplicity': 0.0}
    return {'matrix': matrix, 'nineJ': ninej, 'numeric': nr, 'leftPaths': left_paths, 'rightPaths': right_paths,
            'targets': targets, 'checks': checks, 'left': left, 'right': right, 'weightRows': rows}


def run(payload):
    if not isinstance(payload, dict) or payload.get('lab') != 'lie' or payload.get('experiment') != 'su3_ninej':
        raise ValueError('SU(3) 四重重耦合要求 lab="lie", experiment="su3_ninej"')
    if set(payload) - {'lab', 'experiment', 'factors', 'target', 'direction', 'state'}:
        raise ValueError('SU(3) 四重重耦合含不支持的输入字段')
    raw = payload.get('factors', [[1, 0]] * 4)
    if not isinstance(raw, list) or len(raw) != 4:
        raise ValueError('factors 必须含四个 [p,q] 表示')
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
        raise ValueError(f'四重积总维数不得超过 {MAX_DIMENSION}')
    targets = _decomposition(factors)
    preferred = next((row for row in targets if (row['p'], row['q']) == (1, 1)), None)
    preferred = preferred or next((row for row in targets if (row['p'], row['q']) == (2, 1)), targets[0])
    raw_target = payload.get('target', [preferred['p'], preferred['q']])
    if not isinstance(raw_target, list) or len(raw_target) != 2:
        raise ValueError('target 必须为最终表示的 [p,q]')
    target = tuple(_integer(x, 0, 8, 'target') for x in raw_target)
    direction = payload.get('direction', 'left_to_right')
    if direction not in ('left_to_right', 'right_to_left'):
        raise ValueError('direction 必须为 left_to_right 或 right_to_left')
    target_data = next((row for row in targets if (row['p'], row['q']) == target), None)
    if target_data is None:
        raise ValueError('所选最终表示不出现在该四重张量积中，请从最终表示列表选择')
    vector = _state(payload.get('state', {'index': 0}), target_data['multiplicity'])
    data = _recoupling(factors, target)
    matrix = data['matrix']
    output = _matrix_simp((matrix if direction == 'left_to_right' else matrix.T) * vector)
    restored = _matrix_simp((matrix.T if direction == 'left_to_right' else matrix) * output)
    input_norm = _simp((vector.conjugate().T * vector)[0])
    output_norm = _simp((output.conjugate().T * output)[0])
    if _simp(input_norm - output_norm) != 0 or not _zero(restored - vector):
        raise ArithmeticError('Exact nine-j state roundtrip failed')
    nv = np.array([complex(sp.N(x, 17)) for x in vector])
    no = np.array([complex(sp.N(x, 17)) for x in output])
    recovered = (data['numeric'].T if direction == 'left_to_right' else data['numeric']) @ no
    in_norm, out_norm = float(input_norm), float(output_norm)
    checks = dict(data['checks'], stateNorm=float(abs(np.vdot(no, no).real - np.vdot(nv, nv).real) / in_norm),
                  roundtrip=_maxabs(recovered - nv) / math.sqrt(in_norm))
    out_paths = data['rightPaths' if direction == 'left_to_right' else 'leftPaths']
    return {
        'lab': 'lie', 'experiment': 'su3_ninej', 'group': 'su3', 'arithmetic': 'exact',
        'title': 'SU(3) 9j 与四重张量积重耦合', 'dimension': n,
        'factors': [_representation(*pair) for pair in factors], 'target': target_data,
        'targets': list(data['targets']), 'multiplicity': target_data['multiplicity'], 'direction': direction,
        'computation': {'method': 'selected-highest-weight', 'productDimension': n,
                        'highestWeightRows': len(data['weightRows']),
                        'maxProductDimension': MAX_DIMENSION,
                        'middleFactorPermutationReuse': factors[1] == factors[2]},
        'leftPaths': data['leftPaths'], 'rightPaths': data['rightPaths'],
        'recouplingMatrix': data['numeric'].tolist(), 'exactRecouplingMatrix': [[str(x) for x in row] for row in matrix.tolist()],
        'nineJMatrix': np.array(data['nineJ'].evalf(17).tolist(), dtype=float).tolist(),
        'exactNineJMatrix': [[str(x) for x in row] for row in data['nineJ'].tolist()],
        'matrixOrientation': 'R[rightPath][leftPath] = V_R† V_L; b_R=R b_L, b_L=R† b_R',
        'nineJDefinition': 'S[rightPath][leftPath] = R[rightPath][leftPath] / sqrt(dim(E) dim(F) dim(G) dim(H)); project GT phase convention',
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
            '四因子顺序固定 A⊗B⊗C⊗D；左路径为 ((A B)E (C D)F)T，右路径为 ((A C)G (B D)H)T。',
            '右路径自然生成于 A⊗C⊗B⊗D，先交换中间 B、C 张量轴，再在共同 A⊗B⊗C⊗D 中求重叠；这是带标签张量因子的线性置换，不添加费米交换负号。',
            '每个二元顶点沿用本站正交 GT、坐标轴投影及首个非零最高权系数为正的相位；相同表示先交换对称后反对称。',
            '每条路径保留三个顶点的外重数：左 α=firstCopy、β=secondCopy、γ=finalCopy；右 δ=firstCopy、ε=secondCopy、ζ=finalCopy。',
            'R 的行是右路径、列是左路径，R 为正交换基矩阵；本项目维数缩约 9j 为 S=R/√(dimE dimF dimG dimH)，相位与其他文献约定可能不同。',
            '范数为平方范数；输入不自动归一化，概率按该平方范数归一化。',
        ],
        'derivation': [
            '用整数 GT 权字符分解 A⊗B⊗C⊗D，得到最终表示 T 的外重数 m。',
            '枚举 E⊂A⊗B、F⊂C⊗D 与 T⊂E⊗F，保留全部三个顶点外重数；右树对 G⊂A⊗C、H⊂B⊗D 同理。',
            '将两个首层完整 CG 嵌入与根顶点选定最高权零空间复合，再将右树 ACBD 张量轴显式置换为 ABCD，得到 V_L、V_R。',
            '计算 R=V_R†V_L，精确检查正交性、V_R R=V_L、字符重数与路径数相等，并降低一个最终 GT 态核对相同 R。',
            '用 b_R=R b_L 或 b_L=R† b_R 换基，精确核对范数与往返；S 满足 S† diag(dimG dimH) S=diag(1/(dimE dimF))。',
        ],
        'notes': [
            '六类输入 1、3、3̄、6、6̄、8 的全部四重积，总维数≤4096；所有实际最终表示均可选择，不截断中间表示或外重数。',
            '8⊗8⊗8⊗8 的 4096 维空间仅构造所选最终最高权的嵌入：1 的外重数为 8，8 为 32，27 为 33；避免构造完整 4096×4096 CG 矩阵。',
            '省略 target 时优先选择实际出现的 8，其次为 (2,1) 的 15，否则选择字符分解首项；显式不存在的最终表示会报错。',
            '全部系数直接由 SymPy 的有理数与根式构造；小数仅作预览，未用浮点拟合根式。',
            '这是两个指定配对树之间的重耦合；不把交换张量轴解释为粒子交换统计，也不自动产生哈密顿量或谱。',
        ],
        'sources': [
            {'title': 'Alex et al.: SU(N) Clebsch–Gordan algorithm and GT convention',
             'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/PapersVonDelft/Alex2011.pdf'},
            {'title': 'Dang et al. (2024): canonical U(3) four-factor recoupling, §5.2',
             'url': 'https://link.springer.com/article/10.1140/epjp/s13360-024-05501-8'},
        ],
    }
