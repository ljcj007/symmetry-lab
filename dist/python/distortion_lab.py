"""Small-displacement structure decomposition and two-order-parameter Landau model.

The structures must already describe the same compatible cell, basis and origin.
No standard irrep, space-group label, force constant or fitted energy is inferred.
Lattice vectors are rows. Mode vectors are Cartesian in the parent reference cell;
each column is normalized in the ordinary (not mass-weighted) Euclidean metric.
Only NumPy and the standard library are required, including for browser execution.
"""
import copy
import itertools
import math

import numpy as np


MAX_ATOMS = 80
MAX_MODES = 240
ELEMENTS = set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn '
                'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce '
                'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn '
                'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl '
                'Mc Lv Ts Og').split())
SOURCES = [
    {'title': 'ISODISTORT：结构畸变、模式与参考晶胞约定',
     'url': 'https://iso.byu.edu/isodistorthelp.php'},
    {'title': 'ISODISPLACE：对称适配结构畸变的原始论文',
     'url': 'https://doi.org/10.1107/S0021889806014075'},
]


def _number(value, name, low=-1e6, high=1e6):
    if isinstance(value, bool):
        raise ValueError(name + ' 必须是有限数值，不能是布尔值')
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError) as exc:
        raise ValueError(name + ' 必须是有限数值') from exc
    if not math.isfinite(result) or not low <= result <= high:
        raise ValueError(f'{name} 必须在 [{low}, {high}] 内')
    return result


def _array(value, name, shape):
    try:
        result = np.asarray(value, dtype=float)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(name + ' 必须是有限数值矩阵') from exc
    if result.shape != shape or not np.isfinite(result).all():
        raise ValueError(name + ' 必须是 ' + str(shape) + ' 的有限数值矩阵')
    return result


def _boolean(payload, name, default):
    value = payload.get(name, default)
    if not isinstance(value, bool):
        raise ValueError(name + ' 必须是 true 或 false')
    return value


def _clean(array):
    values = np.array(array, dtype=float, copy=True)
    values[np.abs(values) < 1e-14] = 0
    return values.tolist()


def _structure(raw, label):
    if not isinstance(raw, dict):
        raise ValueError(label + ' 必须是包含 lattice 和 atoms 的 JSON 对象')
    lattice = _array(raw.get('lattice'), label + '.lattice', (3, 3))
    singular = np.linalg.svd(lattice, compute_uv=False)
    if singular[-1] < 1e-6 or singular[0] > 1e4 or singular[0] / singular[-1] > 1e4:
        raise ValueError(label + ' 晶格奇异、过小、过大或条件数超过 10000')
    if raw.get('lengthUnit', 'angstrom') != 'angstrom':
        raise ValueError(label + ' 当前仅接受 angstrom；请先统一晶格长度单位')
    atoms = raw.get('atoms')
    if not isinstance(atoms, list) or not 1 <= len(atoms) <= MAX_ATOMS:
        raise ValueError(f'{label}.atoms 需要 1–{MAX_ATOMS} 个完整原子，不支持部分占位')
    positions, symbols = [], []
    for index, atom in enumerate(atoms):
        if not isinstance(atom, dict) or atom.get('symbol') not in ELEMENTS:
            raise ValueError(f'{label}.atoms[{index}].symbol 需要真实化学元素符号')
        if 'occupancy' in atom and _number(atom['occupancy'], 'occupancy', 0, 1) != 1:
            raise ValueError('当前畸变分解仅接受完全占位；不能把部分占位当作完整原子')
        position = _array(atom.get('coordinates'), label + '.coordinates', (3,))
        if np.max(np.abs(position)) > 1e6:
            raise ValueError('分数坐标绝对值不能超过 1000000')
        positions.append(position % 1)
        symbols.append(atom['symbol'])
    return lattice, np.array(positions), symbols


class _Images:
    """Exact 3D closest-lattice-vector search, with a bounded sphere enumeration.

    Componentwise fractional rounding is only a starting upper bound. QR sphere
    decoding then proves the closest Cartesian image, also for oblique cells.
    """
    def __init__(self, lattice):
        self.lattice = np.asarray(lattice)
        self.r = np.linalg.qr(self.lattice.T)[1]

    def closest(self, delta):
        delta = np.asarray(delta, dtype=float)
        base = np.rint(delta).astype(int)
        reduced = delta - base
        y = self.r @ reduced
        initial = reduced @ self.lattice
        best = float(initial @ initial)
        best_n = None
        ties = 0
        visited = 0
        n = np.zeros(3, dtype=int)
        # Absolute Cartesian squared-distance tolerance, with relative scaling.
        def search(axis, partial):
            nonlocal best, best_n, ties, visited
            tolerance = 1e-12 * max(1., best)
            if axis < 0:
                if best_n is None or partial < best - tolerance:
                    best, best_n, ties = partial, n.copy(), 1
                elif abs(partial - best) <= tolerance:
                    ties += 1
                return
            center = (y[axis] - float(self.r[axis, axis + 1:] @ n[axis + 1:])) / self.r[axis, axis]
            radius = math.sqrt(max(0., best + tolerance - partial)) / abs(self.r[axis, axis])
            low, high = math.ceil(center - radius), math.floor(center + radius)
            if high - low > 50000:
                raise ValueError('晶胞过于倾斜，周期最短像搜索超出限制；请先使用较约化的共同晶胞基')
            for value in sorted(range(low, high + 1), key=lambda x: abs(x - center)):
                visited += 1
                if visited > 50000:
                    raise ValueError('周期最短像搜索超出 50000 个节点；请先约化共同晶胞基')
                n[axis] = value
                error = self.r[axis, axis] * (center - value)
                new_partial = partial + error * error
                if new_partial <= best + tolerance:
                    search(axis - 1, new_partial)

        search(2, 0.)
        shift = base + best_n
        return delta - shift, shift, ties > 1


def _assignment(cost):
    """Shortest-augmenting-path Hungarian assignment for a square cost matrix."""
    count = len(cost)
    u, v = np.zeros(count + 1), np.zeros(count + 1)
    p, way = np.zeros(count + 1, dtype=int), np.zeros(count + 1, dtype=int)
    for row in range(1, count + 1):
        p[0], column = row, 0
        minv, used = np.full(count + 1, np.inf), np.zeros(count + 1, dtype=bool)
        while True:
            used[column] = True
            i, delta, next_column = p[column], np.inf, 0
            for j in range(1, count + 1):
                if not used[j]:
                    current = cost[i - 1, j - 1] - u[i] - v[j]
                    if current < minv[j]:
                        minv[j], way[j] = current, column
                    if minv[j] < delta:
                        delta, next_column = minv[j], j
            for j in range(count + 1):
                if used[j]:
                    u[p[j]] += delta
                    v[j] -= delta
                else:
                    minv[j] -= delta
            column = next_column
            if p[column] == 0:
                break
        while True:
            previous = way[column]
            p[column] = p[previous]
            column = previous
            if column == 0:
                break
    result = np.empty(count, dtype=int)
    for column in range(1, count + 1):
        result[p[column] - 1] = column - 1
    return result


def _assignment_gap(cost, assignment):
    """Cost of the second-best permutation, by the cheapest alternating cycle.

    Every alternative permutation is a set of disjoint directed cycles. The
    optimum makes every cycle nonnegative; the smallest cycle is the runner-up.
    Floyd-Warshall handles negative individual edges without enumerating n! maps.
    """
    count = len(cost)
    if count < 2:
        return math.inf
    edge = cost[:, assignment] - cost[np.arange(count), assignment, None]
    distance = edge.copy()
    np.fill_diagonal(distance, 0.)
    for k in range(count):
        distance = np.minimum(distance, distance[:, k, None] + distance[None, k, :])
    cycle = edge + distance.T
    np.fill_diagonal(cycle, np.inf)
    return max(0., float(np.min(cycle)))


def _mapping(parent, distorted, symbols, target_symbols, payload):
    lattice, positions = parent
    images = _Images(lattice)
    count = len(positions)
    explicit = payload.get('atom_mapping')
    tolerance = _number(payload.get('mapping_tolerance', 1e-6), 'mapping_tolerance', 1e-12, .1)
    max_displacement = _number(payload.get('max_displacement', 1.5), 'max_displacement', 1e-8, 100)
    warnings, gaps = [], []
    if sorted(symbols) != sorted(target_symbols):
        raise ValueError('母相与畸变相必须具有相同元素计数和原子数；先建立相容超胞')
    if explicit is not None:
        if (not isinstance(explicit, list) or len(explicit) != count
                or any(isinstance(x, bool) or not isinstance(x, (int, np.integer)) for x in explicit)
                or sorted(explicit) != list(range(count))):
            raise ValueError('atom_mapping 必须是 0 起始索引的完整置换：第 i 项给出母相原子 i 对应的畸变相原子')
        mapping = np.array(explicit, dtype=int)
        if any(symbols[i] != target_symbols[j] for i, j in enumerate(mapping)):
            raise ValueError('atom_mapping 不能映射到不同元素')
    else:
        mapping = np.empty(count, dtype=int)
        for symbol in dict.fromkeys(symbols):
            left = [i for i, item in enumerate(symbols) if item == symbol]
            right = [i for i, item in enumerate(target_symbols) if item == symbol]
            cost = np.empty((len(left), len(right)))
            for i, source in enumerate(left):
                for j, target in enumerate(right):
                    vector, _, _ = images.closest(distorted[target] - positions[source])
                    cart = vector @ lattice
                    cost[i, j] = cart @ cart
            assignment = _assignment(cost)
            gap = _assignment_gap(cost, assignment)
            if math.isfinite(gap):
                gaps.append(gap)
            if gap <= tolerance * tolerance:
                raise ValueError(f'{symbol} 原子存在等价或近等价全局匹配（平方位移总成本差 ≤ mapping_tolerance²）；请显式给出 atom_mapping，不能任意选取映射')
            for i, target in enumerate(assignment):
                mapping[left[i]] = right[target]
    raw_shifts = payload.get('image_shifts')
    shifts = None
    if raw_shifts is not None:
        shifts = _array(raw_shifts, 'image_shifts', (count, 3))
        if not np.equal(shifts, np.rint(shifts)).all() or np.max(np.abs(shifts)) > 100:
            raise ValueError('image_shifts 必须是 N×3 整数矩阵，且绝对值不超过 100')
        shifts = shifts.astype(int)
    vectors, chosen_shifts = [], []
    for i, j in enumerate(mapping):
        delta = distorted[j] - positions[i]
        vector, shift, ambiguous = images.closest(delta)
        if shifts is not None:
            vector, shift = delta - shifts[i], shifts[i]
        elif ambiguous:
            raise ValueError(f'原子 {i} 在周期晶胞边界存在多个等长最短像；请显式给出 image_shifts，避免任意选择位移方向')
        vectors.append(vector @ lattice)
        chosen_shifts.append(shift)
    vectors = np.array(vectors)
    if float(np.max(np.linalg.norm(vectors, axis=1))) > max_displacement + 1e-12:
        raise ValueError('匹配位移超过 max_displacement；检查相容晶胞、原点、atom_mapping 与 image_shifts，确认后再调整阈值')
    if explicit is None:
        warnings.append('自动匹配最小化母相参考度量中的平方位移总和；不会自动寻找晶胞变换、共同原点或跨元素映射。')
    return vectors, {'indices': mapping.tolist(), 'imageShifts': np.array(chosen_shifts).tolist(),
                     'method': 'explicit' if explicit is not None else 'minimum-total-squared-displacement',
                     'minimumCostGap': min(gaps) if gaps else None, 'costUnit': 'angstrom^2',
                     'ambiguityTolerance': tolerance, 'ambiguous': False,
                     'explicitImages': shifts is not None, 'maxAllowedDisplacement': max_displacement}, warnings


def _normal_modes(raw_modes, count):
    if not isinstance(raw_modes, list) or not 1 <= len(raw_modes) <= min(MAX_MODES, 3 * count):
        raise ValueError('modes 需要 1 至 min(240,3N) 个 {id,label,vectors}；本工具不自动猜测不可约表示基')
    columns, metadata, seen = [], [], set()
    for i, mode in enumerate(raw_modes):
        if not isinstance(mode, dict):
            raise ValueError('每个模式必须是包含 vectors 的对象')
        vector = _array(mode.get('vectors'), f'modes[{i}].vectors', (count, 3)).reshape(-1)
        norm = float(np.linalg.norm(vector))
        if norm < 1e-12 or norm > 1e8:
            raise ValueError('模式不能是零向量或过大；提供维数无关的笛卡尔方向后由程序归一化')
        key = str(mode.get('id', f'mode-{i + 1}'))[:80]
        if key in seen:
            raise ValueError('模式 id 不可重复')
        seen.add(key)
        columns.append(vector / norm)
        metadata.append({'id': key, 'label': str(mode.get('label', f'用户模式 {i + 1}'))[:200],
                         'inputNorm': norm, 'standardIrrep': None})
    return np.column_stack(columns), metadata


def _public_structure(lattice, positions, symbols):
    return {'lattice': _clean(lattice), 'natom': len(symbols), 'lengthUnit': 'angstrom',
            'atoms': [{'index': i, 'symbol': symbol, 'coordinates': _clean(position % 1),
                       'position': _clean(position @ lattice)}
                      for i, (symbol, position) in enumerate(zip(symbols, positions))]}


def _exports(lattice, atoms):
    """P1 exports; left-handed basis is corrected without changing Cartesian chirality."""
    lattice = np.array(lattice, copy=True)
    atoms = copy.deepcopy(atoms)
    flipped = float(np.linalg.det(lattice)) < 0
    if flipped:
        lattice[0] *= -1
        for atom in atoms:
            atom['coordinates'][0] = (-atom['coordinates'][0]) % 1
    symbols = list(dict.fromkeys(atom['symbol'] for atom in atoms))
    ordered = [atom for symbol in symbols for atom in atoms if atom['symbol'] == symbol]
    fmt = lambda values: ' '.join(f'{v:.12f}' for v in values)
    poscar = ['Symmetry Lab linear distortion reconstruction; synthetic unless supplied', '1.0']
    poscar += [fmt(row) for row in lattice] + [' '.join(symbols),
               ' '.join(str(sum(a['symbol'] == symbol for a in atoms)) for symbol in symbols), 'Direct']
    poscar += [fmt(atom['coordinates']) for atom in ordered]
    lengths = np.linalg.norm(lattice, axis=1)
    angles = [math.degrees(math.acos(float(np.clip(lattice[i] @ lattice[j] / lengths[i] / lengths[j], -1, 1))))
              for i, j in ((1, 2), (0, 2), (0, 1))]
    cif = ['data_distortion_reconstruction', '# P1 export; no inferred child space group or relaxation.',
           "_symmetry_space_group_name_H-M 'P 1'", '_symmetry_Int_Tables_number 1']
    cif += [f'_cell_length_{axis} {v:.12f}' for axis, v in zip('abc', lengths)]
    cif += [f'_cell_angle_{axis} {v:.12f}' for axis, v in zip(('alpha', 'beta', 'gamma'), angles)]
    cif += ['loop_', '_symmetry_equiv_pos_as_xyz', "'x,y,z'", 'loop_', '_atom_site_label',
            '_atom_site_type_symbol', '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_occupancy']
    cif += [f"{atom['symbol']}{i+1} {atom['symbol']} {fmt(atom['coordinates'])} 1" for i, atom in enumerate(atoms)]
    return {'poscar': '\n'.join(poscar) + '\n', 'cif': '\n'.join(cif) + '\n',
            'lengthUnit': 'angstrom', 'poscarAtomOrder': [a['index'] for a in ordered],
            'basisHandednessCorrected': flipped,
            'basisTransform': [[-1 if flipped else 1, 0, 0], [0, 1, 0], [0, 0, 1]],
            'reason': 'P1 输出全部原子；POSCAR 按元素分组，poscarAtomOrder 给出对应母相原子索引。未计算子空间群或结构弛豫。' +
                      ('左手输入晶胞已同步反转第一基矢和第一分数坐标，保留真实手性。' if flipped else '')}


def preset_data(name='batio3'):
    """Original ideal-cell examples, with invented amplitudes, never fitted data."""
    if name not in ('batio3', 'srtio3'):
        raise ValueError('preset 必须是 batio3、srtio3 或 custom')
    cell = 4.0 if name == 'batio3' else 3.905
    base = [('Ba' if name == 'batio3' else 'Sr', [0, 0, 0]), ('Ti', [.5, .5, .5]),
            ('O', [0, .5, .5]), ('O', [.5, 0, .5]), ('O', [.5, .5, 0])]
    side = 1 if name == 'batio3' else 2
    atoms, polar, second = [], [], []
    for offset in itertools.product(range(side), repeat=3):
        sign = (-1) ** sum(offset)
        for i, (symbol, position) in enumerate(base):
            atoms.append({'symbol': symbol, 'coordinates': ((np.array(position) + offset) / side).tolist()})
            polar.append([0, 0, [.2, 1., -.4, -.4, -.4][i]])
            if name == 'batio3':
                # A second independent optical displacement, intentionally not
                # asserted to be a normal mode or a symmetry-adapted eigenvector.
                second.append([[0, 0, 1.], [0, 0, -.2], [0, 0, -.8/3], [0, 0, -.8/3], [0, 0, -.8/3]][i])
            else:
                # Shared equatorial oxygens move consistently for alternating
                # octahedral rotations. z-axis apical oxygen is stationary.
                second.append([0, -sign, 0] if i == 2 else [sign, 0, 0] if i == 3 else [0, 0, 0])
    vectors = [np.array(polar, dtype=float), np.array(second, dtype=float)]
    # Built-in modes are orthonormal so their amplitude convention is transparent.
    vectors[0] /= np.linalg.norm(vectors[0])
    vectors[1] -= np.sum(vectors[0] * vectors[1]) * vectors[0]
    vectors[1] /= np.linalg.norm(vectors[1])
    amplitudes = [.22, .07] if side == 1 else [.12, .55]
    lattice = np.eye(3) * cell * side
    stretch = np.diag([1, 1, 1.012 if side == 1 else 1.002])
    parent = {'lattice': lattice.tolist(), 'atoms': atoms, 'lengthUnit': 'angstrom'}
    displaced = np.array([a['coordinates'] for a in atoms]) + sum(q * v for q, v in zip(amplitudes, vectors)) @ np.linalg.inv(lattice)
    distorted = {'lattice': (lattice @ stretch).tolist(), 'lengthUnit': 'angstrom',
                 'atoms': [{'symbol': atom['symbol'], 'coordinates': (position % 1).tolist()}
                           for atom, position in zip(atoms, displaced)]}
    labels = ['极性相对位移（z 方向）', '另一独立极性位移（z 方向）' if side == 1 else 'R 点反相氧八面体转动（z 轴，小位移线性模式）']
    return {'preset': name, 'synthetic': True, 'parent': parent, 'distorted': distorted,
            'modes': [{'id': 'polar-z' if i == 0 else 'optical-z' if side == 1 else 'antiphase-z',
                       'label': labels[i], 'vectors': vector.tolist()} for i, vector in enumerate(vectors)],
            'description': ('原创理想 BaTiO₃ 五原子晶胞，畸变幅度与 1.2% c 轴应变均为合成教学数据。' if side == 1 else
                            '原创理想 SrTiO₃ 2×2×2 相容超胞（40 原子），反相转动按 (-1)^(i+j+k) 交替。位移是线性小角模式，不是有限角刚性八面体，也不是拟合或实验结构。'),
            'expectedAmplitudes': amplitudes,
            'supercell': [side, side, side],
            'waveVector': [0, 0, 0] if side == 1 else [.5, .5, .5]}


def landau_model(payload=None):
    """All stationary solutions of an even two-variable quartic, including continua.

    b1,b2 are positive. c is unrestricted within the numeric input limits. The
    negative copositivity boundary c=-2*sqrt(b1*b2) is treated explicitly;
    a singular squared-amplitude system at +2*sqrt(b1*b2) is also not discarded.
    """
    payload = {} if payload is None else payload
    if not isinstance(payload, dict):
        raise ValueError('landau 必须是参数对象')
    defaults = {'a1': -1., 'b1': 1., 'a2': -.7, 'b2': 1., 'c': .5}
    p = {key: _number(payload.get(key, default), 'landau.' + key, 1e-6 if key.startswith('b') else -100, 100)
         for key, default in defaults.items()}
    a1, b1, a2, b2, c = (p[key] for key in ('a1', 'b1', 'a2', 'b2', 'c'))
    extent = _number(payload.get('range', 1.5), 'landau.range', .01, 100)
    resolution = _number(payload.get('resolution', 61), 'landau.resolution', 11, 121)
    if not resolution.is_integer():
        raise ValueError('landau.resolution 必须是 11–121 的整数')
    resolution = int(resolution)
    selected = [_number(payload.get('q1', .4), 'landau.q1', -100, 100),
                _number(payload.get('q2', .2), 'landau.q2', -100, 100)]
    scale = max(1., abs(a1), abs(a2), b1, b2, abs(c))
    tol = 1e-10 * scale
    root = math.sqrt(b1 * b2)
    threshold = 2 * root
    # Do not collapse near-boundary coercive models into an unbounded/flat one:
    # even a tiny positive quartic lifts the valley, possibly far off the plot.
    boundary = c == -threshold
    determinant = 4 * b1 * b2 - c * c
    singular = c == threshold or c == -threshold
    alpha, beta = a1 / math.sqrt(b1), a2 / math.sqrt(b2)
    unbounded = c < -threshold and not boundary
    coercive = c > -threshold and not boundary
    if boundary:
        unbounded = alpha + beta < 0
        coercive = alpha + beta > 0
    bounded = not unbounded

    def energy(x, y):
        return a1*x*x + b1*x**4 + a2*y*y + b2*y**4 + c*x*x*y*y

    def gradient(x, y):
        return [2*x*(a1+2*b1*x*x+c*y*y), 2*y*(a2+2*b2*y*y+c*x*x)]

    def hessian(x, y):
        return np.array([[2*a1+12*b1*x*x+2*c*y*y, 4*c*x*y],
                         [4*c*x*y, 2*a2+12*b2*y*y+2*c*x*x]])

    def classify(x, y):
        eigenvalues = np.linalg.eigvalsh(hessian(x, y))
        if x == 0 and y == 0:
            # At a zero quadratic curvature the positive self quartic matters.
            flat = a1 == 0 or a2 == 0
            if a1 < 0 and a2 < 0:
                kind = 'maximum'
            else:
                kind = 'minimum' if a1 >= 0 and a2 >= 0 and (a1 > 0 or a2 > 0 or c >= -threshold) else 'saddle'
        elif x == 0 or y == 0:
            # Use the analytic soft curvature, not a broad eigenvalue tolerance
            # that could turn a small but negative curvature into a minimum.
            curvature = a1-c*a2/(2*b2) if x == 0 else a2-c*a1/(2*b1)
            flat = curvature == 0
            # Minimize the massive coordinate to fourth order in the soft one.
            effective = 0. if singular else (b1-c*c/(4*b2)) if x == 0 else (b2-c*c/(4*b1))
            kind = 'minimum' if curvature > 0 or (curvature == 0 and effective >= 0) else 'saddle'
        else:
            flat = singular
            kind = 'minimum' if determinant > 0 or (singular and bounded) else 'saddle'
        label = {'minimum': '局域极小（含高阶判定）' if flat else '严格局域极小',
                 'maximum': '局域极大', 'saddle': '鞍点'}[kind]
        return kind, label, flat, eigenvalues

    points = []

    def add(x, y, branch):
        if any(math.hypot(point['q1']-x, point['q2']-y) < 1e-9 for point in points):
            return
        kind, label, degenerate, eigenvalues = classify(x, y)
        points.append({'q1': float(x), 'q2': float(y), 'energy': float(energy(x, y)),
                       'branch': branch, 'kind': kind, 'label': label,
                       'degenerate': degenerate, 'hessianEigenvalues': _clean(eigenvalues),
                       'gradientResidual': float(np.linalg.norm(gradient(x, y))),
                       'inPlotRange': abs(x) <= extent and abs(y) <= extent})

    add(0., 0., 'origin')
    if a1 < 0:
        for sign in (-1, 1):
            add(sign * math.sqrt(-a1/(2*b1)), 0., 'q1-axis')
    if a2 < 0:
        for sign in (-1, 1):
            add(0., sign * math.sqrt(-a2/(2*b2)), 'q2-axis')
    families = []
    if not singular:
        squares = np.linalg.solve([[2*b1, c], [c, 2*b2]], [-a1, -a2])
        if min(squares) > 0:
            for sign1, sign2 in itertools.product((-1, 1), repeat=2):
                add(sign1*math.sqrt(squares[0]), sign2*math.sqrt(squares[1]), 'mixed')
    elif c > 0 and alpha == beta and alpha < 0:
        radius = -alpha/2
        samples = [{'q1': math.sqrt(radius/math.sqrt(b1))*math.cos(t),
                    'q2': math.sqrt(radius/math.sqrt(b2))*math.sin(t)}
                   for t in np.linspace(0, 2*math.pi, 65)]
        families.append({'kind': 'minimum', 'label': '连续简并极小：椭圆',
                         'equation': 'sqrt(b1) Q1² + sqrt(b2) Q2² = -a1/(2 sqrt(b1))',
                         'constant': radius, 'energy': -alpha*alpha/4,
                         'compact': True, 'samples': samples})
    elif boundary and alpha + beta == 0:
        constant = -alpha/2
        samples = []
        for x in np.linspace(-extent, extent, resolution):
            y_squared = (math.sqrt(b1)*x*x - constant)/math.sqrt(b2)
            if y_squared >= 0 and math.sqrt(y_squared) <= extent:
                for sign in (-1, 1):
                    samples.append({'q1': float(x), 'q2': sign*math.sqrt(y_squared)})
        families.append({'kind': 'minimum', 'label': '非紧连续简并极小：双曲线或直线',
                         'equation': 'sqrt(b1) Q1² - sqrt(b2) Q2² = -a1/(2 sqrt(b1))',
                         'constant': constant, 'energy': -alpha*alpha/4,
                         'compact': False, 'samples': samples})
    candidates = [point['energy'] for point in points] + [family['energy'] for family in families]
    minimum = min(candidates) if bounded else None
    comparison_tolerance = 64*np.finfo(float).eps*max(1., abs(minimum or 0))
    minima = [dict(point) for point in points if bounded and abs(point['energy']-minimum) <= comparison_tolerance]
    for point in points:
        point['globalMinimum'] = bool(bounded and abs(point['energy']-minimum) <= comparison_tolerance)
    for family in families:
        family['globalMinimum'] = bool(bounded and abs(family['energy']-minimum) <= comparison_tolerance)
    axis = np.linspace(-extent, extent, resolution)
    x, y = np.meshgrid(axis, axis)
    grid = a1*x*x+b1*x**4+a2*y*y+b2*y**4+c*x*x*y*y
    warnings = ['Landau 系数和序参量使用独立的约化单位；不是从结构幅度或第一性原理能量拟合所得，也不能自动等同于实测材料参数。']
    if unbounded:
        warnings.append('此参数组自由能无下界；有限绘图区的最低点不是全局平衡态。需要调整系数或加入稳定的更高阶项。')
    elif minima and not any(point['inPlotRange'] for point in minima) and not families:
        warnings.append('真正的全局极小在当前绘图区外；请扩大绘图范围。')
    return {'parameters': p, 'formula': 'F=a1 Q1²+b1 Q1⁴+a2 Q2²+b2 Q2⁴+c Q1²Q2²',
            'units': {'orderParameter': 'dimensionless reduced Q', 'energy': 'reduced energy'},
            'boundedness': {'boundedBelow': bounded, 'coercive': coercive,
                            'quarticStrictlyPositive': c > -threshold and not boundary,
                            'quarticBoundary': boundary, 'negativeCouplingThreshold': -threshold,
                            'label': '无下界' if unbounded else '有下界且强制增长' if coercive else '有下界但含非紧简并谷'},
            'stationaryPoints': points, 'stationaryFamilies': families,
            'globalMinima': minima, 'globalMinimumEnergy': minimum,
            'energyComparisonTolerance': float(comparison_tolerance),
            'selection': {'q1': selected[0], 'q2': selected[1], 'energy': energy(*selected),
                          'gradient': gradient(*selected), 'hessian': _clean(hessian(*selected))},
            'grid': {'q1': axis.tolist(), 'q2': axis.tolist(), 'energy': grid.tolist(),
                     'range': extent, 'resolution': resolution, 'orientation': 'energy[q2 index][q1 index]'},
            'equations': ['∂F/∂Q1 = 2 Q1 (a1 + 2 b1 Q1² + c Q2²) = 0',
                          '∂F/∂Q2 = 2 Q2 (a2 + 2 b2 Q2² + c Q1²) = 0',
                          '混合支：[[2b1,c],[c,2b2]] · [Q1²,Q2²]ᵀ = [-a1,-a2]ᵀ',
                          'b1,b2>0 时四次项在所有非零 Q 上严格正定的条件为 c > -2√(b1b2)；正 c 没有上限。'],
            'warnings': warnings}


def run(payload=None):
    payload = {} if payload is None else payload
    if not isinstance(payload, dict):
        raise ValueError('payload 必须是 JSON 对象')
    custom = payload.get('preset') == 'custom' or 'parent' in payload or 'distorted' in payload
    data = payload if custom else preset_data(payload.get('preset', 'batio3'))
    parent_lattice, parent_positions, symbols = _structure(data.get('parent'), 'parent')
    child_lattice, child_positions, child_symbols = _structure(data.get('distorted'), 'distorted')
    if len(parent_positions) != len(child_positions):
        raise ValueError('母相与畸变相必须具有相同原子数；请先建立相容超胞')
    if np.linalg.det(parent_lattice) * np.linalg.det(child_lattice) < 0:
        raise ValueError('两个晶胞手性不同，不能当作同一晶胞的连续应变；先显式对齐晶胞基和原子坐标')
    remove_translation = _boolean(payload, 'remove_translation', True)
    displacement, mapping, warnings = _mapping((parent_lattice, parent_positions), child_positions,
                                               symbols, child_symbols, payload)
    translation = np.mean(displacement, axis=0) if remove_translation else np.zeros(3)
    internal = displacement - translation
    matrix, modes = _normal_modes(payload.get('modes', data.get('modes')), len(symbols))
    coefficients, _, rank, singular = np.linalg.lstsq(matrix, internal.reshape(-1), rcond=1e-10)
    projected = (matrix @ coefficients).reshape(-1, 3)
    residual = internal - projected
    rank = int(rank)
    if rank < len(modes):
        warnings.append('输入模式线性相关；幅度不是唯一坐标，当前给出 Moore–Penrose 最小范数解。重构仍可检验，但不能把单个系数当作唯一物理序参量。')
    gram = matrix.T @ matrix
    orthogonal = bool(np.max(np.abs(gram-np.eye(len(modes)))) < 1e-9)
    if not orthogonal:
        warnings.append('输入模式非正交，采用完整最小二乘求解；逐列点积通常不是正确幅度。')
    # F maps Cartesian column vectors. Polar stretch and Green strain distinguish
    # a rigid rotation of the full cell from actual homogeneous deformation.
    deformation = (np.linalg.inv(parent_lattice) @ child_lattice).T
    left, stretches, right = np.linalg.svd(deformation)
    rotation = left @ right
    stretch = right.T @ np.diag(stretches) @ right
    green = .5*(deformation.T @ deformation-np.eye(3))
    amplitudes = payload.get('amplitudes')
    if amplitudes is None:
        selected_amplitudes = coefficients.copy()
    else:
        selected_amplitudes = _array(amplitudes, 'amplitudes', (len(modes),))
        if np.max(np.abs(selected_amplitudes)) > 100:
            raise ValueError('重构幅度绝对值不能超过 100 Å')
    selected_displacement = (matrix @ selected_amplitudes).reshape(-1, 3)
    restore_translation = _boolean(payload, 'restore_translation', False)
    reconstruct_lattice = payload.get('reconstruction_lattice', 'distorted')
    if reconstruct_lattice not in ('parent', 'distorted'):
        raise ValueError('reconstruction_lattice 必须是 parent 或 distorted')
    chosen_lattice = parent_lattice if reconstruct_lattice == 'parent' else child_lattice
    selected_total = selected_displacement + (translation if restore_translation else 0)
    positions = parent_positions + selected_total @ np.linalg.inv(parent_lattice)
    rebuilt = _public_structure(chosen_lattice, positions, symbols)
    for i, atom in enumerate(rebuilt['atoms']):
        atom['equilibrium'] = _clean(parent_positions[i] @ chosen_lattice)
        atom['referenceDisplacement'] = _clean(selected_total[i])
        atom['displacement'] = _clean(selected_total[i] @ np.linalg.inv(parent_lattice) @ chosen_lattice)
    rebuilt.update(amplitudes=_clean(selected_amplitudes), latticeChoice=reconstruct_lattice,
                   translationRestored=restore_translation,
                   exports=_exports(chosen_lattice, rebuilt['atoms']))
    for i, mode in enumerate(modes):
        mode.update(amplitude=float(coefficients[i]), selectedAmplitude=float(selected_amplitudes[i]),
                    vectors=_clean(matrix[:, i].reshape(-1, 3)),
                    translationComponent=_clean(np.mean(matrix[:, i].reshape(-1, 3), axis=0)))
    norm = float(np.linalg.norm(internal))
    residual_norm = float(np.linalg.norm(residual))
    warnings += ['模式方向在母相笛卡尔参考系中按 Σᵢ|eᵢ|²=1 归一化；Q 单位为 Å，未乘质量权重。',
                 '输入结构须已有相同相容晶胞基、原点和完整原子对应；仅分离连续均匀应变，不自动求超胞关系。',
                 '模式名称是用户或教学定义；不据此宣称标准 irrep、子群、力常数、本征频率或稳定相。']
    if remove_translation:
        warnings.append('平移去除使用全部原子的算术平均位移（非质量加权质心）；重构默认不恢复这一原点平移。')
    landau = landau_model(payload.get('landau'))
    return {'kind': 'distortion-lab', 'title': '结构畸变分解与双序参量自由能',
            'preset': 'custom' if custom else data['preset'], 'synthetic': not custom or bool(data.get('synthetic', False)),
            'description': data.get('description', '用户提供的已对齐同胞结构与模式；数据来源由用户负责说明。'),
            'scope': '同一相容晶胞中的小位移、均匀应变分离、用户模式最小二乘与独立约化 Landau 教学模型。',
            'parent': _public_structure(parent_lattice, parent_positions, symbols),
            'distorted': _public_structure(child_lattice, child_positions, child_symbols),
            'mapping': mapping,
            'strain': {'deformationGradient': _clean(deformation), 'rotation': _clean(rotation),
                       'rightStretch': _clean(stretch), 'greenLagrange': _clean(green),
                       'principalStretches': _clean(stretches),
                       'volumeRatio': float(abs(np.linalg.det(child_lattice)/np.linalg.det(parent_lattice))),
                       'formula': 'F=(Lp⁻¹ Ld)ᵀ；E=(FᵀF−I)/2；内位移按母相参考度量分析'},
            'displacement': {'reference': _clean(displacement), 'internal': _clean(internal),
                             'removedTranslation': _clean(translation), 'removeTranslation': remove_translation,
                             'deformedInternal': _clean(internal @ deformation.T),
                             'maximum': float(np.max(np.linalg.norm(internal, axis=1))), 'unit': 'angstrom'},
            'decomposition': {'modes': modes, 'rank': rank, 'modeCount': len(modes),
                              'fullColumnRank': rank == len(modes), 'orthonormal': orthogonal,
                              'gram': _clean(gram), 'singularValues': _clean(singular),
                              'conditionNumber': float(singular[0]/singular[-1]) if rank == len(modes) else None,
                              'amplitudes': _clean(coefficients), 'projected': _clean(projected),
                              'residual': _clean(residual), 'residualNorm': residual_norm,
                              'rmsResidualPerAtom': residual_norm/math.sqrt(len(symbols)),
                              'relativeResidual': residual_norm/norm if norm > 1e-14 else 0.,
                              'normalEquationResidual': float(np.linalg.norm(matrix.T @ residual.reshape(-1))),
                              'totalDisplacementNorm': norm, 'amplitudeUnit': 'angstrom',
                              'normalization': 'sum_i |e_i|^2 = 1; ordinary Cartesian Euclidean norm',
                              'method': 'Moore-Penrose least squares; unweighted reference Cartesian coordinates'},
            'reconstruction': rebuilt, 'landau': landau,
            'warnings': warnings + landau['warnings'], 'sources': SOURCES,
            'limits': {'maxAtoms': MAX_ATOMS, 'maxModes': MAX_MODES, 'maxGridResolution': 121},
            'steps': [{'title': '建立共同参考', 'detail': '核对晶胞基、原点和原子数；在母相真实笛卡尔度量中求周期最短像并匹配同种元素。'},
                      {'title': '分离应变与平移', 'detail': '晶格给出变形梯度 F 与 Green–Lagrange 应变 E；分数位置变化给出参考内位移，可去除算术平均平移。'},
                      {'title': '求模式幅度', 'detail': '将归一化模式按列组成 B，解 min_Q ||BQ−u||²；检查秩、Gram 矩阵与法方程残差。'},
                      {'title': '验证结构重构', 'detail': '由 x=x_parent+(BQ)L_parent⁻¹ 重建分数位置；选择母相或畸变相晶格，并保留残差，导出 P1。'},
                      {'title': '独立分析双序参量模型', 'detail': '枚举原点、两条轴支和混合支；用 Hessian 和必要的高阶项分类，退化连续解与无下界情形单独报告。'}]}


run_distortion_lab = run
