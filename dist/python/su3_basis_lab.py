"""Canonical SU(3) GT basis ledger and exact generator-column teaching views.

The scientific basis and generators come from the existing CG implementation.
This adapter copies its cached mutable objects and never changes their phases,
ordering, metadata, or matrices. A reply contains every state and every column;
choosing a row or generator in the UI does not require another calculation.
"""
from copy import deepcopy
from functools import lru_cache

import sympy as sp


SCHEMA = 'symmetry-lab-su3-basis-1'
OP_IDS = ('E12', 'E21', 'E23', 'E32', 'E13', 'E31', 'H1', 'H2')
SHIFTS = ((2, -1), (-2, 1), (-1, 2), (1, -2), (1, 1), (-1, -1), (0, 0), (0, 0))


def _simp(value):
    return sp.radsimp(sp.cancel(sp.expand(value)))


@lru_cache(maxsize=2048)
def _scalar_values(value):
    value = _simp(sp.sympify(value))
    return str(value), sp.latex(value), float(value)


def _scalar(value):
    exact, latex, numeric = _scalar_values(value)
    return {'exact': exact, 'latex': latex, 'numeric': numeric}


def _matrix(matrix):
    values = [[_scalar(matrix[i, j]) for j in range(matrix.cols)] for i in range(matrix.rows)]
    return {'exact': [[v['exact'] for v in row] for row in values],
            'latex': sp.latex(matrix),
            'numeric': [[v['numeric'] for v in row] for row in values],
            'shape': [matrix.rows, matrix.cols]}


def _vector(vector):
    values = [_scalar(v) for v in vector]
    return {'exact': [v['exact'] for v in values], 'latex': sp.latex(vector),
            'numeric': [v['numeric'] for v in values], 'dimension': vector.rows}


@lru_cache(maxsize=15)
def _canonical(p, q):
    from su3_cg import _basis, _name
    from su3_cg_exact import _irrep
    original = _irrep(p, q)
    # The old CG cache contains mutable matrices and lists. Own immutable copies.
    generators = tuple(sp.ImmutableMatrix(g) for g in original['generators'])
    patterns = tuple(tuple(row) for row in original['patterns'])
    weights = tuple(tuple(row) for row in original['weights'])
    metadata = _basis({'p': p, 'q': q, 'patterns': patterns, 'weights': weights})
    return (_name(p, q), patterns, weights, generators,
            tuple((r['index'], r['label'], tuple(r['pattern']), tuple(r['weight']),
                   r['twoI'], r['twoI3'], r['threeY']) for r in metadata))


def _states(p, q, canonical):
    rows = []
    for index, label, pattern, weight, two_i, two_i3, three_y in canonical[4]:
        a, b, c = pattern
        n = [c, a + b - c, p + 2*q - a - b]
        inequalities = [('p+q', 'a', p+q, a), ('a', 'q', a, q),
                        ('q', 'b', q, b), ('b', '0', b, 0),
                        ('a', 'c', a, c), ('c', 'b', c, b)]
        h1, h2 = weight
        rows.append({'index': index, 'label': label, 'pattern': list(pattern),
            'weight': list(weight), 'twoI': two_i, 'twoI3': two_i3, 'threeY': three_y,
            'interlacing': [{'leftLabel': left_label, 'rightLabel': right_label,
                'left': left, 'right': right, 'passed': left >= right}
                for left_label, right_label, left, right in inequalities],
            'content': {'n': n, 'total': p+2*q, 'terms': [
                {'id': 'n1', 'label': 'n₁', 'expressionLatex': 'c', 'value': _scalar(n[0])},
                {'id': 'n2', 'label': 'n₂', 'expressionLatex': 'a+b-c', 'value': _scalar(n[1])},
                {'id': 'n3', 'label': 'n₃', 'expressionLatex': 'p+2q-a-b', 'value': _scalar(n[2])}]},
            'cartan': {'H1': _scalar(h1), 'H2': _scalar(h2),
                'T3': _scalar(sp.Rational(h1, 2)),
                'T8': _scalar((h1+2*h2)/(2*sp.sqrt(3)))},
            'isospin': {'I': _scalar(sp.Rational(two_i, 2)),
                'I3': _scalar(sp.Rational(two_i3, 2)), 'Y': _scalar(sp.Rational(three_y, 3))}})
    return rows


def _action(matrix, index, shift):
    vector = matrix[:, index]
    return {'sourceIndex': index, 'vector': _vector(vector),
        'normSquared': _scalar(sum(value*value for value in vector)),
        'zero': all(value == 0 for value in vector),
        'terms': [{'targetIndex': target, 'coefficient': _scalar(value)}
                  for target, value in enumerate(vector) if value != 0],
        'weightShift': list(shift)}


def _zero(matrix):
    return all(_simp(value) == 0 for value in matrix if value != 0)


def _checks(p, q, canonical, states):
    _, patterns, weights, g, _ = canonical
    n = len(patterns)
    h1, h2 = g[6:]
    commutators = (_zero(g[0]*g[1]-g[1]*g[0]-h1)
        and _zero(g[2]*g[3]-g[3]*g[2]-h2)
        and _zero(g[4]*g[5]-g[5]*g[4]-h1-h2)
        and _zero(g[0]*g[2]-g[2]*g[0]-g[4])
        and _zero(h1*h2-h2*h1))
    shifts = all((weights[i][0]-weights[j][0], weights[i][1]-weights[j][1]) == shift
                 for matrix, shift in zip(g, SHIFTS)
                 for i in range(n) for j in range(n) if matrix[i, j] != 0)
    casimir = (sum((g[i]*g[i+1]+g[i+1]*g[i] for i in (0, 2, 4)), sp.zeros(n))/2
               +h1*h1/4+(h1+2*h2)*(h1+2*h2)/12)
    expected = sp.Rational(p*p+p*q+q*q+3*p+3*q, 3)*sp.eye(n)
    rows = [
        ('dimension', '交错图样数等于表示维数', n == (p+1)*(q+1)*(p+q+2)//2),
        ('interlacing', '全部基态满足六条交错约束',
         all(item['passed'] for row in states for item in row['interlacing'])),
        ('content', '内容非负且总数固定', all(min(r['content']['n']) >= 0
            and sum(r['content']['n']) == p+2*q for r in states)),
        ('cartan', '内容差与两个 Cartan 对角元一致', all(
            r['content']['n'][0]-r['content']['n'][1] == h1[i, i]
            and r['content']['n'][1]-r['content']['n'][2] == h2[i, i]
            for i, r in enumerate(states))),
        ('transpose', '升降算符互为转置', all(g[i].T == g[i+1] for i in (0, 2, 4))),
        ('commutators', 'Cartan 与根算符满足基本对易关系', commutators),
        ('root-shifts', '每个非零矩阵元连接规定的权差', shifts),
        ('casimir', '二阶 Casimir 等于表示的标量值', _zero(casimir-expected))]
    return [{'id': key, 'label': label, 'passed': bool(passed)} for key, label, passed in rows]


def _fixed_octet():
    canonical = _canonical(1, 1)
    states = _states(1, 1, canonical)
    indices = [r['index'] for r in states if r['weight'] == [0, 0]]
    return {'p': 1, 'q': 1, 'dimension': 8, 'basis': states, 'indices': indices,
        'rows': [{'stateIndex': i, 'actions': {
            'E12': _action(canonical[3][0], i, SHIFTS[0]),
            'E23': _action(canonical[3][2], i, SHIFTS[2])}} for i in indices],
        'sameWeight': len(indices) == 2, 'differentStates': len(set(indices)) == 2,
        'description': '固定八维伴随表示：同一表示中的两个零权基态可有不同的升算符作用。',
        'scope': '本比较独立于上方输入。它比较一个八维表示内部的基态，不是张量积中的 8s 与 8a 外重数副本。'}


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须是 JSON 对象。')
    if set(payload)-{'lab', 'p', 'q'}:
        raise ValueError('只接受 lab、p、q；基态和算符选择使用已经返回的数据。')
    if payload.get('lab', 'su3_basis') != 'su3_basis':
        raise ValueError('lab 必须为 su3_basis。')
    p, q = payload.get('p', 1), payload.get('q', 0)
    if type(p) is not int or type(q) is not int or min(p, q) < 0 or p+q > 4:
        raise ValueError('p 和 q 必须为非负整数且 p+q≤4；不接受布尔值、小数或字符串。')
    canonical = _canonical(p, q)
    label, patterns, weights, generators, _ = canonical
    states = _states(p, q, canonical)
    groups = {}
    for index, weight in enumerate(weights):
        if weight not in groups:
            groups[weight] = {'index': len(groups), 'weight': list(weight),
                'T3': _scalar(sp.Rational(weight[0], 2)),
                'T8': _scalar((weight[0]+2*weight[1])/(2*sp.sqrt(3))), 'members': []}
        groups[weight]['members'].append(index)
    return {'schema': SCHEMA, 'lab': 'su3_basis', 'exact': True,
        'input': deepcopy(payload), 'normalizedInput': {'lab': 'su3_basis', 'p': p, 'q': q},
        'representation': {'p': p, 'q': q, 'label': label, 'dimension': len(patterns)},
        'conventions': {
            'basis': '采用现有 CG 核心的正交归一 GT 基底；顶行固定为 (p+q,q,0)。',
            'order': '按 (H1+H2,H1,a,b,c) 降序排列，所有矩阵、列向量与权图共用此顺序。',
            'phase': 'E12 与 E23 的非零升算符系数取非负实数；共轭三维基底为 (s̄,−d̄,ū)。基底重定相会改变矩阵元的符号。',
            'columns': '算符左乘列向量，第 j 列是第 j 个归一基态的像；Eij 不是有限的幺正群操作。',
            'coordinates': 'T3、T8 是 Cartan 本征值坐标；权图不是实空间、动量空间或能级图。',
            'normalization': '原始列向量不重新归一化，范数平方不是跃迁概率；零输出向量不等于零权基态。',
            'interpretation': 'u、d、s、I、Y 在此是表示标签；未指定物理模型时不赋予粒子味、晶体轨道或空间方向含义。',
            'scope': '只构造 p+q≤4 的十五个 SU(3) 不可约表示，不构造任意 SU(N) 或新的 CG 换基矩阵。'},
        'basis': {'dimension': len(patterns), 'order': list(range(len(patterns))),
            'topRow': [p+q, q, 0], 'states': states},
        'operators': [{'id': identifier, 'label': identifier,
            'kind': 'ladder' if i < 6 else 'cartan', 'matrix': _matrix(matrix),
            'weightShift': list(shift),
            'columns': [_action(matrix, j, shift) for j in range(len(patterns))]}
            for i, (identifier, matrix, shift) in enumerate(zip(OP_IDS, generators, SHIFTS))],
        'weightGroups': list(groups.values()), 'fixedOctet': _fixed_octet(),
        'checks': _checks(p, q, canonical, states),
        'steps': [
            {'id': 'interlacing', 'title': '① 先检查图样是否合法',
             'explanation': '顶行确定表示，六条交错不等式筛选允许的 GT 基态。',
             'formula': r'p+q\ge a\ge q\ge b\ge0,\quad a\ge c\ge b'},
            {'id': 'content', 'title': '② 从行和读出三个内容数',
             'explanation': '逐层行和之差给出内容数，总数固定为 p+2q。',
             'formula': r'(n_1,n_2,n_3)=(c,a+b-c,p+2q-a-b)'},
            {'id': 'cartan', 'title': '③ 内容差给出权与 Cartan 坐标',
             'explanation': '先求两个整数权，再换成 T3、T8 及 I、I3、Y。',
             'formula': r'H_1=n_1-n_2,\ H_2=n_2-n_3,\ T_3=H_1/2,\ T_8=(H_1+2H_2)/(2\sqrt3)'},
            {'id': 'column', 'title': '④ 用矩阵的一列读取算符作用',
             'explanation': '完整列向量保留全部目标基态及精确系数；权相同的基态仍保留各自索引。',
             'formula': r'E_{ij}|j_0\rangle=\sum_k(E_{ij})_{k j_0}|k\rangle'},
            {'id': 'zero-weight', 'title': '⑤ 比较同权但不同的基态',
             'explanation': '固定八维例子用 E12 和 E23 区分两个零权基态；一个升算符给出零并不表示输入是零向量。',
             'formula': r'\mathrm{wt}(|3\rangle)=\mathrm{wt}(|4\rangle)=(0,0)'}],
        'notes': ['改变表示后需要重新运行；基态和算符选择只浏览本次计算的完整结果。',
            '相同权点的全部成员都保留；图上重合不能代替基态相等或能量简并的判断。',
            '所有精确式、数值和 LaTeX 均由同一 SymPy 对象生成；数值只用于显示与绘图。'],
        'sources': [
            {'title': 'Alex et al., A numerical algorithm for the explicit calculation of SU(N) and SL(N,C) Clebsch–Gordan coefficients (2011)',
             'url': 'https://doi.org/10.1063/1.3521562'},
            {'title': 'von Delft group: Clebsch–Gordan coefficients and Gelfand–Tsetlin conventions',
             'url': 'https://homepages.physik.uni-muenchen.de/~vondelft/Papers/ClebschGordan/'}]}
