"""A scalar Landau model linked to an explicitly idealized polar perovskite.

No material coefficients, transition temperatures, phonon eigenvectors or
general isotropy-subgroup database are inferred.  Q is dimensionless and
the fractional Ti displacement is displacementScale * Q along one axis.
"""
from itertools import permutations, product
from fractions import Fraction
import math


SOURCES = [
    {"title": "ISODISTORT: distortion modes, isotropy subgroups and domains",
     "url": "https://iso.byu.edu/isodistorthelp.php"},
]


def _number(data, key, default, lower, upper):
    value = data.get(key, default)
    if (isinstance(value, bool) or not isinstance(value, (float, int))
            or not math.isfinite(value) or not lower <= value <= upper):
        raise ValueError(f"{key} 必须是 {lower} 至 {upper} 的有限实数")
    return float(value)


def _det(r):
    return (r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1])
            - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0])
            + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]))


def _mv(r, v):
    return [sum(row[i] * v[i] for i in range(3)) for row in r]


def _cubic_operations():
    rotations = []
    for perm in permutations(range(3)):
        for signs in product((-1, 1), repeat=3):
            rotations.append([[signs[i] if j == perm[i] else 0
                               for j in range(3)] for i in range(3)])
    return sorted(rotations, key=lambda r: (r != [[1, 0, 0], [0, 1, 0], [0, 0, 1]], str(r)))


def _stationary_roots(a, b, c, h):
    """Return (root, multiplicity in F', sign of F^(multiplicity+1))."""
    # Analytic zero-field path. Rational arithmetic identifies discriminant
    # zero exactly; a small curvature is never mistaken for a higher-order zero.
    if h == 0:
        leading = next(((power, value) for power, value in ((1, a), (3, b), (5, c)) if value), None)
        if leading is None:
            return []
        roots = [(0.0, leading[0], 1 if leading[1] > 0 else -1)]
        ys = []  # y, multiplicity, curvature sign (irrelevant for even multiplicity)
        if c:
            fa, fb, fc = (Fraction(str(value)) for value in (a, b, c))
            discriminant = fb * fb - 3 * fc * fa
            if discriminant >= 0:
                root = math.sqrt(float(discriminant))
                # Stable quadratic evaluation, with the other root from the product.
                pivot = -b - math.copysign(root, b)
                if pivot:
                    sign = -1 if b >= 0 else 1
                    if discriminant == 0:
                        ys = [(pivot / (3 * c), 2, 0)]
                    else:
                        ys = [(pivot / (3 * c), 1, sign), (a / pivot, 1, -sign)]
        elif b:
            ys = [(-a / (2 * b), 1, 1 if b > 0 else -1)]
        for value, multiplicity, sign in ys:
            if value > 0:
                roots.extend([(-math.sqrt(value), multiplicity, sign), (math.sqrt(value), multiplicity, sign)])
        return sorted(roots)
    # Decimal inputs define rational polynomial coefficients. Real-root
    # isolation preserves multiple roots, unlike companion-matrix np.roots.
    import sympy as sp
    x = sp.Symbol('Q')
    sa, sb, sc, sh = (sp.Rational(str(value)) for value in (a, b, c, h))
    polynomial = sp.Poly(6 * sc * x ** 5 + 4 * sb * x ** 3 + 2 * sa * x - sh, x)
    roots = []
    for (left, right), multiplicity in polynomial.intervals(eps=sp.Rational(1, 10 ** 18)):
        midpoint = (left + right) / 2
        derivative = polynomial.as_expr().diff(x, multiplicity).subs(x, midpoint)
        roots.append((float(midpoint), multiplicity, 1 if derivative > 0 else -1))
    return roots


def run(payload=None):
    """Return the potential, stationary points, subgroup operations and domains."""
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("输入必须为 JSON 对象")
    data = dict(payload)
    if 'q' not in data and 'Q' in data:
        data['q'] = data['Q']
    coefficients = {key: _number(data, key, default, -100, 100)
                    for key, default in [('a', -1), ('b', 1), ('c', 0), ('h', 0)]}
    for key, value in coefficients.items():
        if value != 0 and abs(value) < 1e-10:
            raise ValueError(f"{key} 的非零绝对值至少为 1e-10，以保持多项式求根数值精度")
    a, b, c, h = (coefficients[key] for key in ('a', 'b', 'c', 'h'))
    q = _number(data, 'q', 0.7, -3, 3)
    qmax = _number(data, 'qMax', 1.6, 0.1, 10)
    scale = _number(data, 'displacementScale', 0.05, 0.001, 0.1)
    lattice = _number(data, 'latticeConstant', 4, 0.5, 30)
    samples = data.get('samples', 241)
    if isinstance(samples, bool) or not isinstance(samples, int) or not 51 <= samples <= 601:
        raise ValueError("samples 必须是 51 至 601 的整数")
    axis = data.get('axis', 'z')
    if not isinstance(axis, str) or axis not in ('x', 'y', 'z'):
        raise ValueError("axis 必须为 x、y 或 z")
    direction = [int(i == 'xyz'.index(axis)) for i in range(3)]

    def energy(x):
        return a * x ** 2 + b * x ** 4 + c * x ** 6 - h * x

    def derivative(x):
        return 2 * a * x + 4 * b * x ** 3 + 6 * c * x ** 5 - h

    def curvature(x):
        return 2 * a + 12 * b * x ** 2 + 30 * c * x ** 4

    flat = a == b == c == h == 0
    leading = next((value for value in (c, b, a) if value != 0), None)
    bounded = flat or (leading is not None and leading > 0)
    stationary = []
    for x, multiplicity, sign in ([] if flat else _stationary_roots(a, b, c, h)):
        order = multiplicity + 1
        kind = ('minimum' if sign > 0 else 'maximum') if order % 2 == 0 else 'stationary_inflection'
        stationary.append({'q': x, 'energy': energy(x), 'curvature': curvature(x) if multiplicity == 1 else 0.0,
                           'derivativeResidual': derivative(x), 'kind': kind,
                           'firstNonzeroDerivativeOrder': order, 'stationaryMultiplicity': multiplicity,
                           'isGlobalMinimum': False})
    minima = [point for point in stationary if point['kind'] == 'minimum']
    minimum_energy = min((point['energy'] for point in minima), default=None) if bounded else None
    if minimum_energy is not None:
        for point in minima:
            point['isGlobalMinimum'] = abs(point['energy'] - minimum_energy) <= 1e-12 * max(1, abs(minimum_energy))
    curve = [{'q': -qmax + 2 * qmax * i / (samples - 1),
              'energy': energy(-qmax + 2 * qmax * i / (samples - 1))} for i in range(samples)]
    landau = {'formula': 'F(Q) = aQ² + bQ⁴ + cQ⁶ − hQ', 'boundedBelow': bounded,
              'flat': flat, 'stationary': stationary,
              'globalMinima': [point for point in stationary if point['isGlobalMinimum']],
              'globalMinimumEnergy': 0.0 if flat else minimum_energy,
              'globalMinimumSet': 'all_real_Q' if flat else ('finite_points' if bounded else 'none_unbounded'),
              'curve': curve, 'selected': {'q': q, 'energy': energy(q),
                                         'derivative': derivative(q), 'curvature': curvature(q)},
              'stationaryOutsidePlot': sum(abs(point['q']) > qmax for point in stationary)}
    displacement = [q * scale * component for component in direction]
    positions = [('Ba', [0, 0, 0]), ('Ti', [0.5, 0.5, 0.5]),
                 ('O', [0, 0.5, 0.5]), ('O', [0.5, 0, 0.5]), ('O', [0.5, 0.5, 0])]
    atoms = []
    for species, parent in positions:
        fractional = [parent[i] + (displacement[i] if species == 'Ti' else 0) for i in range(3)]
        atoms.append({'species': species, 'parentFractional': parent,
                      'fractional': fractional, 'cartesian': [lattice * v for v in fractional]})
    operations = [{'id': index + 1, 'rotation': rotation, 'determinant': _det(rotation),
                   'retained': q == 0 or _mv(rotation, direction) == direction,
                   'transformedDirection': _mv(rotation, direction)}
                  for index, rotation in enumerate(_cubic_operations())]
    domains = []
    if q == 0:
        domains.append({'label': 'Q = 0 · 母相', 'direction': [0, 0, 0], 'displacement': [0, 0, 0]})
    else:
        for n, name in enumerate('xyz'):
            for sign in (1, -1):
                vector = [sign if i == n else 0 for i in range(3)]
                domains.append({'label': ('+' if sign == 1 else '−') + name,
                                'direction': vector, 'displacement': [abs(q) * scale * v for v in vector]})
    retained = sum(operation['retained'] for operation in operations)
    symmetry = {'parentOrder': 48, 'retainedOrder': retained, 'lostOrder': 48 - retained,
                'operations': operations, 'domains': domains, 'domainCount': len(domains),
                'orbitStabilizer': f'48 / {retained} = {len(domains)}',
                'fieldFreeEquivalence': h == 0,
                'domainMeaning': '六个畴为母相点操作产生的几何取向畴；标量自由能仅描述所选轴的 ±Q 分支，非六维畴动力学。'}
    limitations = [
        'Landau 系数、Q 和能量均为用户给定的无量纲示意量；未拟合 BaTiO₃ 的温度、真实自由能或实测相图。',
        '结构仅移动固定立方五原子胞中的 Ti，位移为 displacementScale×Q；没有晶格弛豫、氧协同位移或真实软模本征矢。',
        '枚举原点位于 Ba 的 48 个立方带符号置换矩阵，检验它们对极性位移的稳定子；不进行任意结构的空间群或子群识别。',
        '±x、±y、±z 为离散几何取向畴；未计算畴壁结构、畴壁能或畴切换动力学。h≠0 时零场等价不代表场下能量相等。',
        '驻点数值由零场解析式或有理系数实根隔离得到，保留重数；最低能量比较容差为 1e-12×max(1,|最低能量|)。曲线窗口可能不包含所有驻点。',
    ]
    if not bounded:
        limitations.append('所选多项式在实轴下无界，没有全局平衡态；图中局部最低点不能视为稳定热力学基态。')
    if flat:
        limitations.append('F 恒为零，所有实 Q 都是驻点和非严格全局极小；有限驻点列表为空。')
    steps = [
        {'title': '写出自由能与平衡方程', 'detail': 'F′(Q)=2aQ+4bQ³+6cQ⁵−h=0。h=0 时可令 y=Q²，解 a+2by+3cy²=0。'},
        {'title': '判定稳定性', 'detail': '用 F″=2a+12bQ²+30cQ⁴ 判定局部极值；F″=0 时继续检查更高阶导数，并先确认自由能下有界。'},
        {'title': '连接畸变与保留操作', 'detail': f'Ti 位移沿 {axis}，逐个检验 Rδ=δ；当前保留 {retained} / 48 个母相点操作。'},
        {'title': '计数几何取向畴', 'detail': f'轨道—稳定子关系给出 N=|G|/|H|=48/{retained}={len(domains)}。非零轴向畸变给出六个极性方向。'},
    ]
    return {'kind': 'phase_domains', 'parameters': {**coefficients, 'q': q, 'axis': axis,
            'qMax': qmax, 'samples': samples, 'latticeConstant': lattice, 'displacementScale': scale},
            'landau': landau, 'structure': {'name': '理想 BaTiO₃ 极性畸变模型',
            'cell': [[lattice, 0, 0], [0, lattice, 0], [0, 0, lattice]], 'atoms': atoms,
            'displacement': displacement, 'parentSymbol': 'Pm-3m / m-3m',
            'distortedSymbol': 'Pm-3m / m-3m' if q == 0 else 'P4mm / 4mm（四重轴沿所选轴）'},
            'symmetry': symmetry, 'curve': curve, 'stationary': stationary,
            'operations': operations, 'domains': domains, 'steps': steps,
            'limitations': limitations, 'sources': SOURCES}
