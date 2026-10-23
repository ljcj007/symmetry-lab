"""Exact SU(3) CG coefficients constructed from orthonormal GT generators.

No floating-point value is used to discover coefficients. SymPy's exact
rational/radical nullspaces, projectors and lowering relations fix the same
coordinate-axis convention as the numerical implementation.
"""
import ast
from functools import lru_cache
import math

import sympy as sp


MAX_DIMENSION = 81
MAX_EXPRESSION_LENGTH = 65536
MAX_EXPRESSION_NODES = 16384
MAX_INTEGER_BITS = 4096


def _simp(value):
    return sp.radsimp(sp.cancel(sp.expand(value)))


def _matrix_simp(matrix):
    return matrix.applyfunc(_simp)


@lru_cache(maxsize=32)
def _irrep(p, q):
    from su3_cg import _weight
    patterns = [(a, b, c) for a in range(q, p + q + 1)
                for b in range(q + 1) for c in range(b, a + 1)]
    patterns.sort(key=lambda x: (sum(_weight(p, q, x)), _weight(p, q, x)[0], x), reverse=True)
    lookup = {pattern: i for i, pattern in enumerate(patterns)}
    dim = len(patterns)
    e12, e23 = sp.zeros(dim), sp.zeros(dim)
    weights = [_weight(p, q, pattern) for pattern in patterns]
    for j, (a, b, c) in enumerate(patterns):
        if (a, b, c + 1) in lookup:
            e12[lookup[a, b, c + 1], j] = sp.sqrt((a - c) * (c - b + 1))
        if (a + 1, b, c) in lookup:
            square = sp.Rational((p + q - a) * (a - q + 1) * (a + 2) * (a - c + 1),
                                 (a - b + 1) * (a - b + 2))
            e23[lookup[a + 1, b, c], j] = sp.sqrt(square)
        if (a, b + 1, c) in lookup:
            square = sp.Rational((p + q - b + 1) * (q - b) * (b + 1) * (c - b),
                                 (a - b) * (a - b + 1))
            e23[lookup[a, b + 1, c], j] = sp.sqrt(square)
    h1, h2 = sp.diag(*[w[0] for w in weights]), sp.diag(*[w[1] for w in weights])
    e13 = _matrix_simp(e12 * e23 - e23 * e12)
    return {'p': p, 'q': q, 'patterns': patterns, 'weights': weights,
            'dimension': dim, 'generators': (e12, e12.T, e23, e23.T, e13, e13.T, h1, h2)}


def _null_basis(matrix):
    # Remove identically zero constraints before exact row reduction.
    rows = [i for i in range(matrix.rows) if any(matrix[i, j] != 0 for j in range(matrix.cols))]
    matrix = matrix[rows, :] if rows else sp.zeros(0, matrix.cols)
    null = matrix.nullspace(simplify=_simp)
    if not null:
        return []
    z = sp.Matrix.hstack(*null)
    projector = _matrix_simp(z * _matrix_simp((z.T * z).inv()) * z.T)
    result = []
    for i in range(projector.cols):
        v = projector[:, i]
        for previous in result:
            v = _matrix_simp(v - previous * _simp((previous.T * v)[0]))
        square = _simp((v.T * v)[0])
        if square == 0:
            continue
        v = _matrix_simp(v / sp.sqrt(square))
        first = next(x for x in v if x != 0)
        if first.is_negative:
            v = -v
        elif first.is_positive is not True:
            raise ArithmeticError('Exact highest-weight phase could not be determined')
        result.append(v)
        if len(result) == len(null):
            break
    return result


def _zero(matrix):
    return all(_simp(value) == 0 for value in matrix if value != 0)


@lru_cache(maxsize=3)
def _coupling(p1, q1, p2, q2):
    from su3_cg import _basis, _name
    left, right = _irrep(p1, q1), _irrep(p2, q2)
    n1, n2 = left['dimension'], right['dimension']
    n = n1 * n2
    generators = tuple(sp.kronecker_product(a, sp.eye(n2)) + sp.kronecker_product(sp.eye(n1), b)
                       for a, b in zip(left['generators'], right['generators']))
    weights = [(a[0] + b[0], a[1] + b[1]) for a in left['weights'] for b in right['weights']]
    weight_rows = {w: [i for i, v in enumerate(weights) if v == w] for w in set(weights)}
    identical = (p1, q1) == (p2, q2)
    swap = sp.eye(n)[[j * n1 + i for i in range(n1) for j in range(n2)], :] if identical else None
    matrices, blocks, coupled_basis = [], [], []
    start = 0
    for p, q in sorted({w for w in weights if min(w) >= 0}, key=lambda w: (sum(w), w[0]), reverse=True):
        indices = weight_rows[p, q]
        copy = 0
        for parity in ((1, -1) if identical else (None,)):
            constraints = [generators[0][:, indices], generators[2][:, indices]]
            if parity is not None:
                constraints.append((swap - parity * sp.eye(n))[:, indices])
            seeds = _null_basis(sp.Matrix.vstack(*constraints))
            if not seeds:
                continue
            target = _irrep(p, q)
            target_rows = {w: [i for i, v in enumerate(target['weights']) if v == w] for w in set(target['weights'])}
            for seed in seeds:
                copy += 1
                matrix = sp.zeros(n, target['dimension'])
                for i, row in enumerate(indices):
                    matrix[row, 0] = seed[i]
                for weight in sorted(target_rows, key=lambda w: (sum(w), w[0]), reverse=True):
                    local = target_rows[weight]
                    if local == [0]:
                        continue
                    rows = weight_rows[weight]
                    relations, lowered = [], []
                    for gi, root in ((1, (2, -1)), (3, (-1, 2))):
                        higher = (weight[0] + root[0], weight[1] + root[1])
                        upper = target_rows.get(higher, [])
                        if upper:
                            relations.append(target['generators'][gi][local, upper])
                            source_rows = weight_rows[higher]
                            lowered.append(generators[gi][rows, source_rows] * matrix[source_rows, upper])
                    d = sp.Matrix.hstack(*relations)
                    b = sp.Matrix.hstack(*lowered)
                    pivots = d.rref(simplify=_simp)[1]
                    if len(pivots) != len(local):
                        raise ArithmeticError('Exact lowering did not span a weight space')
                    solved = _matrix_simp(b[:, list(pivots)] * d[:, list(pivots)].inv())
                    for i, row in enumerate(rows):
                        for j, column in enumerate(local):
                            matrix[row, column] = solved[i, j]
                matrices.append(matrix)
                suffix = ('s' if parity == 1 else 'a') if parity is not None else ''
                label = f'{_name(p, q)}{suffix}'
                bi, end = len(blocks), start + target['dimension']
                blocks.append({'index': bi, 'p': p, 'q': q, 'label': label, 'copy': copy,
                               'dimension': target['dimension'], 'start': start, 'end': end, 'swapParity': parity})
                for local in _basis(target):
                    row = dict(local)
                    row.update({'index': start + local['index'], 'localIndex': local['index'],
                                'label': f'{label} · α={copy} · {local["label"]}', 'p': p, 'q': q,
                                'copy': copy, 'blockIndex': bi, 'dimension': target['dimension'], 'swapParity': parity})
                    coupled_basis.append(row)
                start = end
    if start != n:
        raise ArithmeticError('Exact highest-weight decomposition dimension mismatch')
    c = sp.Matrix.hstack(*matrices)
    for weight, rows in weight_rows.items():
        cols = [i for i, row in enumerate(coupled_basis) if tuple(row['weight']) == weight]
        cw = c[rows, cols]
        if cw.rows != cw.cols or not _zero(cw.T * cw - sp.eye(len(rows))) or not _zero(cw * cw.T - sp.eye(len(rows))):
            raise ArithmeticError('Exact unitarity verification failed')
    for block, matrix in zip(blocks, matrices):
        target = _irrep(block['p'], block['q'])
        for j, weight in enumerate(target['weights']):
            if any(matrix[i, j] != 0 for i, w in enumerate(weights) if w != weight):
                raise ArithmeticError('Exact weight conservation verification failed')
        for gi in range(8):
            if not _zero(generators[gi] * matrix - matrix * target['generators'][gi]):
                raise ArithmeticError('Exact generator intertwining verification failed')
        if identical and not _zero(swap * matrix - block['swapParity'] * matrix):
            raise ArithmeticError('Exact exchange verification failed')
    return {'left': left, 'right': right, 'matrix': c, 'blocks': blocks, 'coupledBasis': coupled_basis,
            'weights': weights, 'generators': generators,
            'checks': {'unitarity': 0., 'intertwining': 0., 'weightConservation': 0., 'exchange': 0.}}


def _real(value):
    """Parse a tiny bounded arithmetic grammar, never sympify user text."""
    if isinstance(value, bool):
        raise ValueError('精确振幅必须为实数或安全根式表达式')
    if isinstance(value, int):
        if abs(value).bit_length() > MAX_INTEGER_BITS or abs(value) > 10**6:
            raise ValueError('精确振幅数值超出范围')
        return sp.Integer(value)
    if isinstance(value, float):
        if not math.isfinite(value) or abs(value) > 10**6:
            raise ValueError('精确振幅必须为有限实数')
        return sp.Rational(str(value))
    if not isinstance(value, str) or len(value) > MAX_EXPRESSION_LENGTH:
        raise ValueError(f'精确表达式长度限于 {MAX_EXPRESSION_LENGTH} 字符')
    try:
        tree = ast.parse(value.strip(), mode='eval')
        if sum(1 for _ in ast.walk(tree)) > MAX_EXPRESSION_NODES:
            raise ValueError('精确表达式过于复杂')
        def visit(node):
            if (isinstance(node, ast.Constant) and type(node.value) is int
                    and abs(node.value).bit_length() <= MAX_INTEGER_BITS):
                return sp.Integer(node.value)
            if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
                operand = visit(node.operand)
                return operand if isinstance(node.op, ast.UAdd) else -operand
            if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
                a, b = visit(node.left), visit(node.right)
                if isinstance(node.op, ast.Add): return a + b
                if isinstance(node.op, ast.Sub): return a - b
                if isinstance(node.op, ast.Mult): return a * b
                if b == 0: raise ValueError('精确表达式分母不能为零')
                return a / b
            if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'sqrt'
                    and len(node.args) == 1 and not node.keywords):
                arg = visit(node.args[0])
                if arg.is_Integer is True and arg >= 0 and int(arg).bit_length() <= MAX_INTEGER_BITS:
                    return sp.sqrt(arg)
            raise ValueError('仅支持整数、四则运算与 sqrt(非负整数)，复数请分别填写 re/im')
        result = _simp(visit(tree.body))
        if result.is_real is not True or result.is_finite is not True or abs(float(result)) > 10**6 * (1 + 1e-12):
            raise ValueError('精确表达式必须为绝对值不超过 10^6 的有限实数')
        return result
    except (SyntaxError, TypeError, ZeroDivisionError, OverflowError, RecursionError) as error:
        raise ValueError('精确振幅表达式无效') from error


def _state(raw, dimension):
    from su3_cg import _integer
    if not isinstance(raw, dict) or set(raw) not in ({'index'}, {'amplitudes'}):
        raise ValueError('state 只能包含 index 或 amplitudes 之一')
    if 'index' in raw:
        index = _integer(raw['index'], 0, dimension - 1, 'state.index')
        return sp.eye(dimension)[:, index]
    values = raw['amplitudes']
    if not isinstance(values, list) or len(values) != dimension:
        raise ValueError(f'amplitudes 必须含 {dimension} 个复振幅')
    text_size = sum(len(part) for value in values if isinstance(value, dict)
                    for part in value.values() if isinstance(part, str))
    if text_size > 1048576:
        raise ValueError('精确输入向量的表达式总长度限于 1 MiB')
    entries = []
    for value in values:
        if not isinstance(value, dict) or set(value) != {'re', 'im'}:
            raise ValueError('每个振幅必须为 {re, im}')
        entries.append(_real(value['re']) + sp.I * _real(value['im']))
    vector = sp.Matrix(entries)
    norm = _simp((vector.conjugate().T * vector)[0])
    if not 1e-24 * (1 - 1e-12) <= float(norm) <= 1e12 * (1 + 1e-12):
        raise ValueError('输入态的平方范数必须介于 10^-24 与 10^12')
    return vector


def _z(value):
    return {'re': str(_simp(sp.re(value))), 'im': str(_simp(sp.im(value)))}


def prepare(labels, state):
    from su3_cg import _dimension
    n = _dimension(*labels[:2]) * _dimension(*labels[2:])
    vector = _state(state, n)
    return _coupling(*labels), vector


def fields(data, vector, direction):
    c = data['matrix']
    output = _matrix_simp(c.T * vector if direction == 'product_to_coupled' else c * vector)
    restored = c * output if direction == 'product_to_coupled' else c.T * output
    input_norm = _simp((vector.conjugate().T * vector)[0])
    output_norm = _simp((output.conjugate().T * output)[0])
    if _simp(output_norm - input_norm) != 0 or not _zero(restored - vector):
        raise ArithmeticError('Exact state roundtrip verification failed')
    return {'arithmetic': 'exact', 'exactCGMatrix': [[str(x) for x in row] for row in c.tolist()],
            'exactInputAmplitudes': [_z(z) for z in vector], 'exactOutputAmplitudes': [_z(z) for z in output],
            'exactInputNorm': str(input_norm), 'exactOutputNorm': str(output_norm),
            'exactInputProbabilities': [str(_simp(sp.conjugate(z) * z / input_norm)) for z in vector],
            'exactOutputProbabilities': [str(_simp(sp.conjugate(z) * z / output_norm)) for z in output],
            'exactChecks': {name: '0' for name in ('unitarity', 'intertwining', 'weightConservation', 'exchange', 'stateNorm', 'roundtrip')}}
