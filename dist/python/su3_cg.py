"""SU(3) CG matrices in an explicit orthonormal GT convention.

Each input has p+q <= 4, with a product dimension of at most 256.
The optional exact path constructs rational/radical coefficients directly
using SymPy (product dimension <= 81). Browser execution stays in Pyodide.
"""
from functools import lru_cache
import math

import numpy as np


_TOL = 1e-10
_NORM_TOL = 1e-12
_SOURCES = [
    {'title': 'Alex, Kalus, Huckleberry & von Delft: A numerical algorithm for SU(N) Clebsch–Gordan coefficients (2011)',
     'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/PapersVonDelft/Alex2011.pdf'},
    {'title': 'Authors’ SU(N) Clebsch–Gordan calculator and GT conventions',
     'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/Papers/ClebschGordan/'},
]


def _dimension(p, q):
    return (p + 1) * (q + 1) * (p + q + 2) // 2


def _name(p, q):
    names = {(0, 0): '1', (1, 0): '3', (0, 1): '3̄', (2, 0): '6',
             (0, 2): '6̄', (1, 1): '8', (3, 0): '10', (0, 3): '10̄',
             (2, 2): '27', (4, 0): '15′', (0, 4): '15̄′',
             (2, 1): '15', (1, 2): '15̄', (3, 1): '24', (1, 3): '24̄',
             (5, 0): '21', (0, 5): '21̄', (4, 1): '35', (1, 4): '35̄',
             (3, 2): '42', (2, 3): '42̄', (6, 0): '28', (0, 6): '28̄',
             (5, 1): '48', (1, 5): '48̄', (4, 2): '60', (2, 4): '60̄',
             (3, 3): '64', (7, 0): '36', (0, 7): '36̄',
             (6, 1): '63', (1, 6): '63̄', (5, 2): '81', (2, 5): '81̄',
             (4, 3): '90', (3, 4): '90̄', (8, 0): '45', (0, 8): '45̄',
             (7, 1): '80', (1, 7): '80̄', (6, 2): '105', (2, 6): '105̄',
             (5, 3): '120', (3, 5): '120̄', (4, 4): '125'}
    return f'{names.get((p, q), str(_dimension(p, q)))} ({p},{q})'


def _weight(p, q, pattern):
    a, b, c = pattern
    return (2 * c - a - b, 2 * (a + b) - c - p - 2 * q)


def _clean(value):
    value = float(value)
    return 0.0 if abs(value) < 1e-14 else value


def _maxabs(matrix):
    return float(np.max(np.abs(matrix))) if matrix.size else 0.0


def _z(value):
    # Amplitudes can be very small yet physically relevant relative to an
    # unnormalised input. Never apply the CG display-zero cutoff to a state.
    return {'re': float(complex(value).real), 'im': float(complex(value).imag)}


@lru_cache(maxsize=32)
def _irrep(p, q):
    """GT E12,E23, H1,H2; Eij^dagger=Eji and positive raising roots.

    Pattern rows: (p+q,q,0); (a,b); (c). Interlacing fixes all states.
    Eq. (28) of Alex et al. specializes to the two E23 terms below.
    """
    patterns = [(a, b, c) for a in range(q, p + q + 1)
                for b in range(q + 1) for c in range(b, a + 1)]
    patterns.sort(key=lambda x: (_weight(p, q, x)[0] + _weight(p, q, x)[1],
                                  _weight(p, q, x)[0], x), reverse=True)
    lookup = {pattern: i for i, pattern in enumerate(patterns)}
    dim = len(patterns)
    e12, e23 = np.zeros((dim, dim)), np.zeros((dim, dim))
    weights = [_weight(p, q, pattern) for pattern in patterns]
    for j, (a, b, c) in enumerate(patterns):
        if (a, b, c + 1) in lookup:
            e12[lookup[(a, b, c + 1)], j] = math.sqrt((a - c) * (c - b + 1))
        if (a + 1, b, c) in lookup:
            square = ((p + q - a) * (a - q + 1) * (a + 2) * (a - c + 1)
                      / ((a - b + 1) * (a - b + 2)))
            e23[lookup[(a + 1, b, c)], j] = math.sqrt(square)
        if (a, b + 1, c) in lookup:
            square = ((p + q - b + 1) * (q - b) * (b + 1) * (c - b)
                      / ((a - b) * (a - b + 1)))
            e23[lookup[(a, b + 1, c)], j] = math.sqrt(square)
    h1 = np.diag([w[0] for w in weights]).astype(float)
    h2 = np.diag([w[1] for w in weights]).astype(float)
    e13 = e12 @ e23 - e23 @ e12
    generators = (e12, e12.T, e23, e23.T, e13, e13.T, h1, h2)
    return {'p': p, 'q': q, 'patterns': patterns, 'weights': weights,
            'dimension': dim, 'generators': generators}


def _basis(rep):
    names = {(1, 0): ['u', 'd', 's'], (0, 1): ['s̄', '−d̄', 'ū']}
    rows = []
    for i, (pattern, weight) in enumerate(zip(rep['patterns'], rep['weights'])):
        a, b, c = pattern
        physical = names.get((rep['p'], rep['q']))
        label = physical[i] if physical else f'GT[{a},{b};{c}]'
        rows.append({'index': i, 'label': label, 'pattern': list(pattern),
                     'weight': list(weight), 'twoI': a - b, 'twoI3': weight[0],
                     'threeY': weight[0] + 2 * weight[1]})
    return rows


def _null_basis(matrix):
    """A deterministic basis of ker A: project coordinate axes, then MGS.

    The orthogonal projector is independent of SVD eigenvector signs and
    degeneracy rotations. Two MGS passes stabilize the coordinate convention.
    """
    _, singular, vh = np.linalg.svd(matrix, full_matrices=True)
    rank = int(np.sum(singular > _TOL))
    null = vh[rank:].T
    if not null.shape[1]:
        return []
    projector = null @ null.T
    result = []
    for i in range(projector.shape[1]):
        v = projector[:, i].copy()
        for _ in range(2):
            for previous in result:
                v -= np.dot(previous, v) * previous
        norm = float(np.linalg.norm(v))
        if norm <= _TOL:
            continue
        v /= norm
        first = np.flatnonzero(np.abs(v) > _TOL)[0]
        if v[first] < 0:
            v *= -1
        result.append(v)
        if len(result) == null.shape[1]:
            break
    return result


def _lower_block(highest, target, generators, product_weights):
    """Recover every GT column from known lowering relations, weight by weight.

    If D contains target lowering coefficients into weight w and B contains
    the lowered product-space columns, X D = B determines the unknown CG
    columns X uniquely. Rank is checked rather than silently approximated.
    """
    dim = target['dimension']
    out = np.zeros((len(highest), dim))
    weights = target['weights']
    out[:, 0] = highest
    for weight in sorted(set(weights), key=lambda w: (sum(w), w[0]), reverse=True):
        indices = [i for i, w in enumerate(weights) if w == weight]
        if indices == [0]:
            continue
        relation, lowered = [], []
        rows = [i for i, w in enumerate(product_weights) if w == weight]
        for generator_index, root in ((1, (2, -1)), (3, (-1, 2))):
            higher = (weight[0] + root[0], weight[1] + root[1])
            upper = [i for i, w in enumerate(weights) if w == higher]
            if upper:
                relation.append(target['generators'][generator_index][np.ix_(indices, upper)])
                source_rows = [i for i, w in enumerate(product_weights) if w == higher]
                lowered.append(generators[generator_index][np.ix_(rows, source_rows)] @ out[np.ix_(source_rows, upper)])
        if not relation:
            raise ArithmeticError('GT lowering reached a disconnected weight')
        d = np.concatenate(relation, axis=1)
        b = np.concatenate(lowered, axis=1)
        solved, _, rank, _ = np.linalg.lstsq(d.T, b.T, rcond=1e-12)
        if rank != len(indices):
            raise ArithmeticError('GT lowering did not span a weight space')
        out[np.ix_(rows, indices)] = solved.T
    return out


@lru_cache(maxsize=4)
def _coupling(p1, q1, p2, q2):
    left, right = _irrep(p1, q1), _irrep(p2, q2)
    n1, n2 = left['dimension'], right['dimension']
    n = n1 * n2
    generators = tuple(np.kron(a, np.eye(n2)) + np.kron(np.eye(n1), b)
                       for a, b in zip(left['generators'], right['generators']))
    weights = [(a[0] + b[0], a[1] + b[1])
               for a in left['weights'] for b in right['weights']]
    identical = (p1, q1) == (p2, q2)
    swap = np.eye(n)[[j * n1 + i for i in range(n1) for j in range(n2)]] if identical else None
    matrices, blocks, coupled_basis = [], [], []
    start = 0
    dominant = sorted({w for w in weights if min(w) >= 0},
                      key=lambda w: (sum(w), w[0]), reverse=True)
    for p, q in dominant:
        indices = [i for i, w in enumerate(weights) if w == (p, q)]
        target = _irrep(p, q)
        copy = 0
        for parity in ((1, -1) if identical else (None,)):
            constraints = [generators[0][:, indices], generators[2][:, indices]]
            if parity is not None:
                constraints.append((swap - parity * np.eye(n))[:, indices])
            for seed in _null_basis(np.concatenate(constraints, axis=0)):
                copy += 1
                highest = np.zeros(n)
                highest[indices] = seed
                matrix = _lower_block(highest, target, generators, weights)
                matrices.append(matrix)
                suffix = ('s' if parity == 1 else 'a') if parity is not None else ''
                label = f'{_name(p, q)}{suffix}'
                block_index = len(blocks)
                end = start + target['dimension']
                blocks.append({'index': block_index, 'p': p, 'q': q, 'label': label,
                               'copy': copy, 'dimension': target['dimension'],
                               'start': start, 'end': end, 'swapParity': parity})
                for local in _basis(target):
                    row = dict(local)
                    row.update({'index': start + local['index'], 'localIndex': local['index'],
                                'label': f'{label} · α={copy} · {local["label"]}',
                                'p': p, 'q': q, 'copy': copy, 'blockIndex': block_index,
                                'dimension': target['dimension'], 'swapParity': parity})
                    coupled_basis.append(row)
                start = end
    if start != n:
        raise ArithmeticError('Highest-weight decomposition dimension mismatch')
    c = np.concatenate(matrices, axis=1)
    checks = {'unitarity': 0.0,
              'intertwining': 0.0, 'weightConservation': 0.0, 'exchange': 0.0}
    weight_rows = {w: [i for i, v in enumerate(weights) if v == w] for w in set(weights)}
    for weight, rows in weight_rows.items():
        cols = [i for i, row in enumerate(coupled_basis) if tuple(row['weight']) == weight]
        cw = c[np.ix_(rows, cols)]
        checks['unitarity'] = max(checks['unitarity'], _maxabs(cw.T @ cw - np.eye(len(cols))),
                                   _maxabs(cw @ cw.T - np.eye(len(rows))))
    shifts = ((2, -1), (-2, 1), (-1, 2), (1, -2), (1, 1), (-1, -1), (0, 0), (0, 0))
    for block, matrix in zip(blocks, matrices):
        target = _irrep(block['p'], block['q'])
        target_rows = {w: [i for i, v in enumerate(target['weights']) if v == w] for w in set(target['weights'])}
        for gi, shift in enumerate(shifts):
            for weight, cols in target_rows.items():
                dest = (weight[0] + shift[0], weight[1] + shift[1])
                rows = weight_rows.get(dest, [])
                source = weight_rows[weight]
                target_dest = target_rows.get(dest, [])
                lhs = generators[gi][np.ix_(rows, source)] @ matrix[np.ix_(source, cols)]
                rhs = matrix[np.ix_(rows, target_dest)] @ target['generators'][gi][np.ix_(target_dest, cols)]
                checks['intertwining'] = max(checks['intertwining'], _maxabs(lhs - rhs))
        if identical:
            swap_rows = [j * n1 + i for i in range(n1) for j in range(n2)]
            checks['exchange'] = max(checks['exchange'], _maxabs(matrix[swap_rows] - block['swapParity'] * matrix))
        for j, weight in enumerate(target['weights']):
            forbidden = [i for i, w in enumerate(weights) if w != weight]
            checks['weightConservation'] = max(checks['weightConservation'], _maxabs(matrix[forbidden, j]))
    if max(checks.values()) > 1e-8:
        raise ArithmeticError('SU(3) CG verification failed')
    return {'left': left, 'right': right, 'matrix': c, 'blocks': blocks,
            'coupledBasis': coupled_basis, 'checks': checks, 'generators': generators,
            'weights': weights}


def _integer(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f'{name} 必须是 {low} 到 {high} 的整数')
    return value


def _state(raw, dimension):
    if not isinstance(raw, dict) or set(raw) not in ({'index'}, {'amplitudes'}):
        raise ValueError('state 只能包含 index 或 amplitudes 之一')
    if 'index' in raw:
        index = _integer(raw['index'], 0, dimension - 1, 'state.index')
        vector = np.zeros(dimension, dtype=complex)
        vector[index] = 1
        return vector
    amplitudes = raw['amplitudes']
    if not isinstance(amplitudes, list) or len(amplitudes) != dimension:
        raise ValueError(f'amplitudes 必须含 {dimension} 个复振幅')
    values = []
    for item in amplitudes:
        if not isinstance(item, dict) or set(item) != {'re', 'im'}:
            raise ValueError('每个振幅必须为 {re, im}')
        for part in ('re', 'im'):
            number = item[part]
            if (isinstance(number, bool) or not isinstance(number, (int, float))
                    or abs(number) > 1e6 * (1 + _NORM_TOL) or not math.isfinite(number)):
                raise ValueError('振幅的实部和虚部必须为绝对值不超过 10^6 的有限数')
        values.append(complex(item['re'], item['im']))
    vector = np.asarray(values)
    norm = float(np.vdot(vector, vector).real)
    # Norm bounds are unchanged by unitary basis transformations. Small
    # relative tolerance lets a serialized boundary state be transformed back.
    if not 1e-24 * (1 - _NORM_TOL) <= norm <= 1e12 * (1 + _NORM_TOL):
        raise ValueError('输入态的平方范数必须介于 10^-24 与 10^12（含数值容差）')
    return vector


def run(payload):
    allowed = {'lab', 'experiment', 'p1', 'q1', 'p2', 'q2', 'direction', 'state', 'arithmetic'}
    if not isinstance(payload, dict) or set(payload) - allowed:
        raise ValueError('SU(3) CG 请求包含不支持的字段')
    if payload.get('lab') != 'lie' or payload.get('experiment') != 'su3_cg':
        raise ValueError('此接口要求 lab=lie、experiment=su3_cg')
    arithmetic = payload.get('arithmetic', 'numeric')
    if arithmetic not in ('numeric', 'exact'):
        raise ValueError('arithmetic 必须是 numeric 或 exact')
    labels = [_integer(payload.get(key, default), 0, 4, key)
              for key, default in (('p1', 1), ('q1', 0), ('p2', 0), ('q2', 1))]
    p1, q1, p2, q2 = labels
    if p1 + q1 > 4 or p2 + q2 > 4:
        raise ValueError('每个输入表示需满足 p+q≤4')
    direction = payload.get('direction', 'product_to_coupled')
    if direction not in ('product_to_coupled', 'coupled_to_product'):
        raise ValueError('direction 必须是 product_to_coupled 或 coupled_to_product')
    n = _dimension(p1, q1) * _dimension(p2, q2)
    limit = 81 if arithmetic == 'exact' else 256
    if n > limit:
        raise ValueError(f'{arithmetic} 模式的直积维数上限为 {limit}，当前为 {n}')
    extra = {}
    if arithmetic == 'exact':
        from su3_cg_exact import prepare, fields
        data, exact_vector = prepare(labels, payload.get('state', {'index': 0}))
        extra = fields(data, exact_vector, direction)
        c = np.array(data['matrix'].evalf(17).tolist(), dtype=float)
        input_vector = np.array([complex(value.evalf(17)) for value in exact_vector])
    else:
        input_vector = _state(payload.get('state', {'index': 0}), n)
        data = _coupling(*labels)
        c = data['matrix']
    input_norm = float(np.vdot(input_vector, input_vector).real)
    output = c.T @ input_vector if direction == 'product_to_coupled' else c @ input_vector
    restored = c @ output if direction == 'product_to_coupled' else c.T @ output
    left_basis, right_basis = _basis(data['left']), _basis(data['right'])
    product_basis = []
    for a in left_basis:
        for b in right_basis:
            index = len(product_basis)
            product_basis.append({'index': index, 'label': f'|{a["label"]}⟩ ⊗ |{b["label"]}⟩',
                                  'leftIndex': a['index'], 'rightIndex': b['index'],
                                  'weight': list(data['weights'][index])})
    checks = dict(data['checks'])
    if arithmetic == 'exact':
        # These residuals describe the floating-point preview, independently
        # of the strict zero identities reported in exactChecks.
        left_numeric, right_numeric = _irrep(p1, q1), _irrep(p2, q2)
        n1, n2 = left_numeric['dimension'], right_numeric['dimension']
        numeric_generators = tuple(np.kron(a, np.eye(n2)) + np.kron(np.eye(n1), b)
                                   for a, b in zip(left_numeric['generators'], right_numeric['generators']))
        checks = {'unitarity': max(_maxabs(c.T @ c - np.eye(n)), _maxabs(c @ c.T - np.eye(n))),
                  'intertwining': 0.0, 'weightConservation': 0.0, 'exchange': 0.0}
        for block in data['blocks']:
            matrix = c[:, block['start']:block['end']]
            target = _irrep(block['p'], block['q'])
            for generator, target_generator in zip(numeric_generators, target['generators']):
                checks['intertwining'] = max(checks['intertwining'], _maxabs(generator @ matrix - matrix @ target_generator))
            for j, weight in enumerate(target['weights']):
                forbidden = [i for i, w in enumerate(data['weights']) if w != weight]
                checks['weightConservation'] = max(checks['weightConservation'], _maxabs(matrix[forbidden, j]))
            if (p1, q1) == (p2, q2):
                swapped = matrix[[j * n1 + i for i in range(n1) for j in range(n2)]]
                checks['exchange'] = max(checks['exchange'], _maxabs(swapped - block['swapParity'] * matrix))
    output_norm = float(np.vdot(output, output).real)
    checks.update({'stateNorm': abs(output_norm - input_norm) / input_norm,
                   'roundtrip': _maxabs(restored - input_vector) / math.sqrt(input_norm)})
    output_basis = data['coupledBasis'] if direction == 'product_to_coupled' else product_basis
    result = {'lab': 'lie', 'experiment': 'su3_cg', 'group': 'su3', 'arithmetic': arithmetic,
            'title': 'SU(3) Clebsch–Gordan 系数与换基',
            'dimension': n, 'direction': direction,
            'factors': [{'p': r['p'], 'q': r['q'], 'label': _name(r['p'], r['q']),
                         'dimension': r['dimension'], 'basis': b}
                        for r, b in ((data['left'], left_basis), (data['right'], right_basis))],
            'productBasis': product_basis, 'coupledBasis': data['coupledBasis'],
            'blocks': data['blocks'], 'cgMatrix': [[_clean(x) for x in row] for row in c],
            'matrixOrientation': 'C[productIndex][coupledIndex]; b=C†a, a=Cb',
            'inputAmplitudes': [_z(z) for z in input_vector],
            'outputAmplitudes': [_z(z) for z in output],
            'inputNorm': input_norm, 'outputNorm': output_norm,
            'inputProbabilities': [float(abs(z) ** 2 / input_norm) for z in input_vector],
            'outputProbabilities': [float(abs(z) ** 2 / output_norm) for z in output],
            'outputTerms': [{'index': i, 'label': output_basis[i]['label'],
                             'amplitude': _z(z), 'probability': float(abs(z) ** 2 / output_norm)}
                            for i, z in enumerate(output) if abs(z) > 1e-12 * math.sqrt(input_norm)],
            'checks': checks,
            'convention': [
                'C 的行是乘积基、列是耦合 GT 基：|耦合,j⟩=Σ_i C_ij |乘积,i⟩。本约定的 C 为实数；输入态可为复数。',
                '正交 Gelfand–Tsetlin 基：顶行 (p+q,q,0)，中行 (a,b)，底行 c；相邻升算符 E₁₂、E₂₃ 的非零矩阵元取正。',
                '基按 (H₁+H₂,H₁,a,b,c) 降序排列；3 为 (u,d,s)，3̄ 为 (s̄,−d̄,ū)，须计入反三重态的相位。',
                '最高权空间投影到按行序排列的乘积基，并以两遍 Gram–Schmidt 固定正交基；各最高权向量首个非零系数取正。',
                '相同因子先以交换算符分成 +1 对称与 −1 反对称空间，再固定外重数基；8⊗8 的 8s、8a 是独立的两个八重态。',
                '其余列由目标 GT 表示的降算符关系求出。该相位/外重数约定不宣称与 de Swart 或任何未转换的系数表逐项相同。',
            ],
            'derivation': [
                '从每个输入 (p,q) 的交错 GT 图样构造 E₁₂、E₂₃ 与两个 Cartan 生成元。',
                '在乘积空间使用 T_total=T₁⊗I+I⊗T₂，并按总权分块。',
                '在支配权 (p,q) 求 E₁₂v=E₂₃v=0；相同因子同时解 Pv=±v，得到各不可约副本的最高权。',
                '逐权下降：用已知列和 GT 降算符解 X D=B，恢复包括权重数大于一时的全部正交列。',
                '检验 C†C=CC†=I 及全部八个生成元的 T_total C=C T_block，再按方向计算振幅；振幅相加后才能取模平方。',
            ],
            'notes': [
                '输入表示满足 p+q≤4；数值模式直积维数上限 256，精确模式上限 81，输出表示可有更高 Dynkin 标签。',
                '数值模式采用双精度；精确模式从有理数根式 GT 生成元直接构造并严格验证，exact 字段保存根式，普通数值字段供预览。',
                '输入振幅原样换基，不自动归一化；平方范数限于 10^-24 至 10^12，边界允许 10^-12 相对数值容差。概率按各自平方范数归一化。',
                'GT 标签中的 I=(a−b)/2、I₃=H₁/2、Y=(H₁+2H₂)/3 描述标准 SU(2)×U(1) 子群；物理含义依具体模型而定。',
            ], 'sources': _SOURCES}
    result.update(extra)
    return result
