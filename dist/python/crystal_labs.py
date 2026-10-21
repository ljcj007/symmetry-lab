"""One-operation symmetry checks for small, explicitly supplied crystal models.

The cell matrix A contains Cartesian lattice vectors as columns.  Fractional
positions transform by R f + t; Cartesian magnetic moments transform as axial,
time-odd vectors by s det(Q) Q m, where Q = A R A^-1.  No crystallographic or
magnetic group is inferred from the result.  Only Python's standard library is
needed, so the same code runs in native CPython and browser Pyodide.
"""
import json
import math


_I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
_MAX_INPUT_BYTES = 200_000
_MAX_SEARCH_NODES = 200_000
_POSITION_RELATIVE_TOLERANCE = 1e-7
_MOMENT_RELATIVE_TOLERANCE = 1e-7


def _number(value, name):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or abs(value) > 1_000_000 or not math.isfinite(value)):
        raise ValueError(name + ' 必须是绝对值不超过 1000000 的有限实数')
    return float(value)


def _vector(value, name):
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(name + ' 必须是三个有限实数组成的向量')
    return [_number(x, name) for x in value]


def _matrix(value, name):
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(name + ' 必须是 3×3 矩阵')
    return [_vector(row, name) for row in value]


def _text(value, name, maximum=80):
    if not isinstance(value, str) or not 0 < len(value) <= maximum:
        raise ValueError(name + ' 必须是长度为 1–' + str(maximum) + ' 的字符串')
    return value


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _norm(a):
    return math.sqrt(_dot(a, a))


def _mv(matrix, vector):
    return [_dot(row, vector) for row in matrix]


def _mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3))
             for j in range(3)] for i in range(3)]


def _transpose(a):
    return [list(column) for column in zip(*a)]


def _det(a):
    return (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
            - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
            + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))


def _inverse(a):
    determinant = _det(a)
    if determinant == 0:
        raise ValueError('cell 必须是非退化晶胞')
    cofactor = [[(
        a[(i + 1) % 3][(j + 1) % 3] * a[(i + 2) % 3][(j + 2) % 3]
        - a[(i + 1) % 3][(j + 2) % 3] * a[(i + 2) % 3][(j + 1) % 3]
    ) for j in range(3)] for i in range(3)]
    # The cyclic 2x2 minors above already carry the cofactor signs.
    return [[cofactor[j][i] / determinant for j in range(3)] for i in range(3)]


def _qr_upper(a):
    """Modified Gram-Schmidt; only the triangular factor is needed for CVP."""
    columns = _transpose(a)
    q = []
    upper = [[0.0] * 3 for _ in range(3)]
    for j in range(3):
        v = columns[j][:]
        for i in range(j):
            upper[i][j] = _dot(q[i], v)
            v = [v[k] - upper[i][j] * q[i][k] for k in range(3)]
        upper[j][j] = _norm(v)
        q.append([x / upper[j][j] for x in v])
    return upper


def _nearby_integers(center, low, high):
    """Visit a bounded integer interval in increasing distance from center."""
    left = math.floor(center)
    right = left + 1
    while left >= low or right <= high:
        if left >= low and (right > high or center - left <= right - center):
            yield left
            left -= 1
        elif right <= high:
            yield right
            right += 1


def _nearest_periodic_image(delta, cell, upper, budget):
    """Exact 3D closest-lattice-vector search, to floating-point precision.

    Componentwise fractional wrapping is not the nearest image in a skew cell.
    A Babai seed and QR sphere enumeration find the true Cartesian minimum.
    Exhausting the explicit resource budget raises rather than guessing.
    """
    seed = [0, 0, 0]
    for i in range(2, -1, -1):
        center = delta[i] + sum(upper[i][j] * (delta[j] - seed[j])
                                for j in range(i + 1, 3)) / upper[i][i]
        seed[i] = round(center)
    best = seed[:]
    residual = _mv(cell, [delta[i] - best[i] for i in range(3)])
    best_squared = _dot(residual, residual)
    slack = 1e-13 * sum(x * x for row in cell for x in row)
    trial = seed[:]

    def search(i, partial):
        nonlocal best, best_squared
        if i < 0:
            # Recompute with A, avoiding accumulated triangular roundoff.
            v = _mv(cell, [delta[j] - trial[j] for j in range(3)])
            squared = _dot(v, v)
            if squared < best_squared:
                best_squared, best = squared, trial[:]
            return
        center = delta[i] + sum(upper[i][j] * (delta[j] - trial[j])
                                for j in range(i + 1, 3)) / upper[i][i]
        remaining = best_squared + slack - partial
        if remaining < 0:
            return
        radius = math.sqrt(remaining) / abs(upper[i][i])
        low, high = math.ceil(center - radius), math.floor(center + radius)
        for candidate in _nearby_integers(center, low, high):
            budget[0] += 1
            if budget[0] > _MAX_SEARCH_NODES:
                raise ValueError('晶胞过于倾斜，周期最近像搜索超出教学计算预算；请约化晶胞后重试')
            trial[i] = candidate
            row_residual = upper[i][i] * (center - candidate)
            total = partial + row_residual * row_residual
            if total <= best_squared + slack:
                search(i - 1, total)

    search(2, 0.0)
    return math.sqrt(max(0.0, best_squared)), best


def _matching(candidates, count):
    """Maximum bipartite matching, with augmenting paths (not greedy)."""
    target_to_source = [-1] * count

    def augment(source, visited):
        for target in candidates[source]:
            if target in visited:
                continue
            visited.add(target)
            previous = target_to_source[target]
            if previous < 0 or augment(previous, visited):
                target_to_source[target] = source
                return True
        return False

    for source in range(count):
        augment(source, set())
    source_to_target = [-1] * count
    for target, source in enumerate(target_to_source):
        if source >= 0:
            source_to_target[source] = target
    return source_to_target


def _wrapped(frac):
    shifts = [math.floor(value) for value in frac]
    wrapped = [value - shift for value, shift in zip(frac, shifts)]
    return wrapped, shifts


def _validate(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须是 JSON 对象')
    try:
        size = len(json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8'))
    except (TypeError, ValueError, RecursionError, OverflowError) as error:
        raise ValueError('输入必须是有限大小的 JSON 数据') from error
    if size > _MAX_INPUT_BYTES:
        raise ValueError('教学模型输入不能超过 200000 字节')
    if payload.get('lab', 'crystal') != 'crystal':
        raise ValueError('lab 必须为 crystal')
    model = payload.get('model')
    if not isinstance(model, dict):
        raise ValueError('model 必须是晶体模型对象')
    cell = _matrix(model.get('cell'), 'cell')
    column_lengths = [_norm(v) for v in _transpose(cell)]
    if min(column_lengths) < 1e-8:
        raise ValueError('晶格矢量长度不能小于 1e-8')
    inverse = _inverse(cell)
    condition = max(sum(abs(x) for x in row) for row in cell) * max(
        sum(abs(x) for x in row) for row in inverse)
    if condition > 100_000:
        raise ValueError('晶胞数值条件过差；请先采用较稳定或约化的晶格基矢')
    raw_atoms = model.get('atoms')
    if not isinstance(raw_atoms, list) or not 1 <= len(raw_atoms) <= 32:
        raise ValueError('atoms 必须包含 1–32 个原子')
    atoms, atom_ids = [], set()
    for raw in raw_atoms:
        if not isinstance(raw, dict):
            raise ValueError('每个原子必须是对象')
        atom_id = _text(raw.get('id'), 'atom.id')
        if atom_id in atom_ids:
            raise ValueError('原子 id 不能重复')
        atom_ids.add(atom_id)
        atoms.append({'id': atom_id, 'element': _text(raw.get('element'), 'element', 12),
                      'frac': _vector(raw.get('frac'), 'atom.frac'),
                      'moment': _vector(raw.get('moment', [0, 0, 0]), 'atom.moment')})
    raw_operations = model.get('operations')
    if not isinstance(raw_operations, list) or not 1 <= len(raw_operations) <= 12:
        raise ValueError('operations 必须包含 1–12 个操作')
    operations, operation_ids = [], set()
    for raw in raw_operations:
        if not isinstance(raw, dict):
            raise ValueError('每个操作必须是对象')
        operation_id = _text(raw.get('id'), 'operation.id')
        if operation_id in operation_ids:
            raise ValueError('操作 id 不能重复')
        operation_ids.add(operation_id)
        rotation = _matrix(raw.get('rotation'), 'rotation')
        if any(x != round(x) or abs(x) > 32 for row in rotation for x in row):
            raise ValueError('rotation 必须是元素绝对值不超过 32 的整数晶格矩阵')
        rotation = [[int(x) for x in row] for row in rotation]
        determinant = _det(rotation)
        if determinant not in (-1, 1):
            raise ValueError('rotation 的行列式必须为 +1 或 -1')
        cartesian_rotation = _mm(_mm(cell, rotation), inverse)
        orthogonality = _mm(_transpose(cartesian_rotation), cartesian_rotation)
        metric_error = max(abs(orthogonality[i][j] - _I3[i][j])
                           for i in range(3) for j in range(3))
        if metric_error > 1e-7:
            raise ValueError('rotation 不保持该晶胞的欧氏度量，不能作为刚体对称操作')
        time_reversal = raw.get('timeReversal', False)
        if not isinstance(time_reversal, bool):
            raise ValueError('timeReversal 必须为 true 或 false')
        operations.append({'id': operation_id,
                           'label': _text(raw.get('label', operation_id), 'operation.label', 200),
                           'rotation': rotation,
                           'translation': _vector(raw.get('translation', [0, 0, 0]), 'translation'),
                           'timeReversal': time_reversal,
                           'cartesianRotation': cartesian_rotation,
                           'determinant': determinant, 'metricError': metric_error})
    selected = _text(payload.get('operationId'), 'operationId')
    if selected not in operation_ids:
        raise ValueError('operationId 必须对应模型中的一个操作')
    operation = next(item for item in operations if item['id'] == selected)
    return cell, atoms, operation, max(column_lengths), condition


def run(payload):
    """Return geometry and independent chemical/magnetic matching diagnostics."""
    cell, atoms, operation, cell_scale, condition = _validate(payload)
    upper = _qr_upper(cell)
    rotation, translation = operation['rotation'], operation['translation']
    q = operation['cartesianRotation']
    time_sign = -1 if operation['timeReversal'] else 1
    axial_sign = time_sign * operation['determinant']
    output_atoms = []
    for atom in atoms:
        unwrapped = [a + b for a, b in zip(_mv(rotation, atom['frac']), translation)]
        wrapped, shifts = _wrapped(unwrapped)
        moment = [axial_sign * value for value in _mv(q, atom['moment'])]
        output_atoms.append({**atom, 'cartesian': _mv(cell, atom['frac']),
                             'transformed': {
                                 'unwrapped': unwrapped, 'wrapped': wrapped,
                                 'cellTranslation': shifts,
                                 'cartesianUnwrapped': _mv(cell, unwrapped),
                                 'cartesianWrapped': _mv(cell, wrapped), 'moment': moment}})
    position_tolerance = _POSITION_RELATIVE_TOLERANCE * cell_scale
    moment_scale = max(1.0, max(_norm(atom['moment']) for atom in atoms))
    moment_tolerance = _MOMENT_RELATIVE_TOLERANCE * moment_scale
    chemical_candidates, magnetic_candidates = [], []
    pair_data = {}
    budget = [0]
    for i, source in enumerate(output_atoms):
        possible = []
        for j, target in enumerate(atoms):
            if source['element'] != target['element']:
                continue
            delta = [a - b for a, b in zip(source['transformed']['unwrapped'], target['frac'])]
            position_error, shift = _nearest_periodic_image(delta, cell, upper, budget)
            moment_error = _norm([a - b for a, b in zip(source['transformed']['moment'], target['moment'])])
            pair_data[i, j] = {'sourceId': source['id'], 'targetId': target['id'],
                               'positionError': position_error, 'momentError': moment_error,
                               'periodicShift': shift}
            if position_error <= position_tolerance:
                possible.append(j)
        possible.sort(key=lambda j: (pair_data[i, j]['positionError'], j))
        chemical_candidates.append(possible)
        magnetic_candidates.append([j for j in possible
                                    if pair_data[i, j]['momentError'] <= moment_tolerance])
    chemical_match = _matching(chemical_candidates, len(atoms))
    magnetic_match = _matching(magnetic_candidates, len(atoms))
    chemical_mapping = [pair_data[i, j] for i, j in enumerate(chemical_match) if j >= 0]
    magnetic_mapping = [pair_data[i, j] for i, j in enumerate(magnetic_match) if j >= 0]
    chemical_symmetry = all(j >= 0 for j in chemical_match)
    magnetic_symmetry = all(j >= 0 for j in magnetic_match)
    vertices = [_mv(cell, [(index >> bit) & 1 for bit in range(3)]) for index in range(8)]
    edges = [[i, i ^ (1 << bit)] for i in range(8) for bit in range(3)
             if not i & (1 << bit)]
    unmatched = {
        'chemical': [atoms[i]['id'] for i, j in enumerate(chemical_match) if j < 0],
        'magnetic': [atoms[i]['id'] for i, j in enumerate(magnetic_match) if j < 0],
    }
    diagnostics = []
    for i, source in enumerate(output_atoms):
        options = [pair_data[i, j] for j, target in enumerate(atoms)
                   if target['element'] == source['element']]
        nearest = min(options, key=lambda item: (item['positionError'], item['momentError']))
        diagnostics.append({'sourceId': source['id'], 'nearestSameSpecies': nearest,
                            'chemicalCandidates': [atoms[j]['id'] for j in chemical_candidates[i]],
                            'magneticCandidates': [atoms[j]['id'] for j in magnetic_candidates[i]]})
    return {
        'lab': 'crystal', 'title': '理想晶体模型的三维对称操作',
        'cell': cell, 'cellVertices': vertices, 'cellEdges': edges,
        'latticeAxes': [{'label': label, 'start': [0, 0, 0], 'end': column}
                        for label, column in zip(('a', 'b', 'c'), _transpose(cell))],
        'operation': operation, 'atoms': output_atoms,
        'chemicalSymmetry': chemical_symmetry, 'magneticSymmetry': magnetic_symmetry,
        'chemicalMapping': chemical_mapping, 'magneticMapping': magnetic_mapping,
        'atomMapping': magnetic_mapping if magnetic_symmetry else chemical_mapping,
        'unmatched': unmatched, 'diagnostics': diagnostics,
        'tolerances': {'position': position_tolerance, 'moment': moment_tolerance,
                       'positionRelativeToLongestCellVector': _POSITION_RELATIVE_TOLERANCE,
                       'momentRelativeToMaxOfOneAndMomentNorm': _MOMENT_RELATIVE_TOLERANCE},
        'cellConditionNumberInfinity': condition,
        'formula': "r = A f；f′ = R f + t；Q = A R A⁻¹；m′ = s det(Q) Q m，s = −1（含 Θ）或 +1。",
        'convention': '晶格矢量为 A 的列；位置使用分数坐标；磁矩为笛卡尔坐标中的时间奇轴矢量。',
        'notes': [
            '只核验给定理想模型中所选的一个操作，不识别真实材料的空间群或磁空间群。',
            '化学对称要求周期等价的同种原子完整一一对应；磁对称还要求变换后的磁矩一致。两种匹配独立求解。',
            '周期位置误差采用笛卡尔最近晶格像；折回晶胞只用于显示，不把非零平移改称为恒等操作。',
            '位置容差为最长基矢长度的 10⁻⁷；磁矩容差为 max(1, 最大磁矩模长) 的 10⁻⁷，单位与输入一致。',
            '时间反演不改变位置，会反转磁矩；这里展示经典磁序的变换，不计算量子态的反幺正表示或 Kramers 简并。',
        ],
    }
