"""Exact finite Bloch-fiber replay for a half translation and time reversal.

The two-site periodic orbital gauge is declared explicitly. No material
Hamiltonian, magnetic-space-group search, band calculation or topology is inferred.
Only bounded rational data are accepted at the input boundary; no user expression
is evaluated. Numerical mirrors are display data, not the exact decision rule.
"""
from copy import deepcopy
from fractions import Fraction
import math
import re
import sympy as sp

SCHEMA = 'symmetry-lab-antitranslation-1'
NUMBER = re.compile(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})?\Z')
RATIONAL = re.compile(r'[+-]?\d+/[1-9]\d*\Z')
X = sp.Matrix([[0, 1], [1, 0]])
Z = sp.diag(1, -1)
J = sp.Matrix([[0, -1], [1, 0]])
I2 = sp.eye(2)


def clean(value):
    return sp.simplify(sp.expand_complex(sp.simplify(value)))


def zero(value):
    return all(sp.simplify(x) == 0 for x in value)


def matrix_pack(value):
    value = value.applyfunc(clean)
    return {'exact': [[str(value[i, j]) for j in range(value.cols)] for i in range(value.rows)],
            'latex': sp.latex(value),
            'numeric': {'re': [[float(sp.re(value[i, j])) for j in range(value.cols)] for i in range(value.rows)],
                        'im': [[float(sp.im(value[i, j])) for j in range(value.cols)] for i in range(value.rows)]},
            'shape': [value.rows, value.cols]}


def scalar_pack(value):
    value = clean(value)
    return {'exact': str(value), 'latex': sp.latex(value), 're': float(sp.re(value)), 'im': float(sp.im(value))}


def vector_pack(value):
    value = sp.Matrix(value).applyfunc(clean)
    return {'exact': [str(x) for x in value], 'latex': sp.latex(value),
            'numeric': {'re': [float(sp.re(x)) for x in value], 'im': [float(sp.im(x)) for x in value]},
            'dimension': len(value)}


def number(raw):
    if isinstance(raw, bool) or not isinstance(raw, (int, float, str)):
        raise ValueError('k 仅接受有限整数、十进制或 p/q，不接受符号表达式。')
    if isinstance(raw, float) and not math.isfinite(raw):
        raise ValueError('k 的每个分量必须有限。')
    text = str(raw).strip()
    if len(text) > 48 or not (NUMBER.fullmatch(text) or RATIONAL.fullmatch(text)):
        raise ValueError('k 仅接受有限十进制或简单有理数，不执行函数或表达式。')
    try:
        value = Fraction(text)
    except (ValueError, ZeroDivisionError, OverflowError) as exc:
        raise ValueError('k 不是有效有理数。') from exc
    if abs(value) > 8 or abs(value.numerator) > 10**9 or value.denominator > 10**6:
        raise ValueError('k 超出精确教学范围：绝对值不超过 8，分母不超过 1000000。')
    return sp.Rational(value.numerator, value.denominator)


def check(identifier, label, passed):
    return {'id': identifier, 'label': label, 'passed': bool(passed)}


def step(identifier, title, explanation, formula):
    return {'id': identifier, 'title': title, 'explanation': explanation, 'formula': formula}


def spectral_pack(hamiltonian):
    rows = sorted(hamiltonian.eigenvals().items(), key=lambda row: float(sp.re(row[0])))
    return {'eigenvalues': [scalar_pack(value) for value, multiplicity in rows],
            'multiplicities': [int(multiplicity) for value, multiplicity in rows],
            'distinctEigenvalues': len(rows), 'hasDegeneracy': any(m > 1 for value, m in rows)}


def counterexamples():
    identity = sp.eye(4)
    unitary = sp.kronecker_product(X, -sp.I*X)
    at_gamma = sp.kronecker_product(X, J)
    h_gamma = sp.kronecker_product(X, I2)+2*sp.kronecker_product(I2, X)
    at_z = sp.kronecker_product(J, J)
    h_z = sp.kronecker_product(X, X)+2*sp.kronecker_product(Z, Z)
    return [
        {'id': 'unitary-gamma', 'title': 'Γ 点：幺正平方为 −I 仍可没有简并',
         'k': [0, 0, 0], 'spinful': True, 'antiunitary': False,
         'energyUnits': 'dimensionless model units',
         'description': '这个固定点四维 Hamiltonian 与 G 对易，四个能级各不相同；它没有 A 对称性。',
         'symmetryMatrix': matrix_pack(unitary), 'operatorSquare': matrix_pack(unitary*unitary),
         'hamiltonian': matrix_pack(h_gamma),
         'symmetryResidual': matrix_pack(unitary*h_gamma*unitary.conjugate().T-h_gamma),
         'comparisonAntiunitaryMatrix': matrix_pack(at_gamma),
         'comparisonAntiunitaryResidual': matrix_pack(at_gamma*h_gamma.conjugate()*at_gamma.conjugate().T-h_gamma),
         'preservesHamiltonian': zero(unitary*h_gamma-h_gamma*unitary),
         'comparisonAntiunitaryPreservesHamiltonian': zero(at_gamma*h_gamma.conjugate()*at_gamma.conjugate().T-h_gamma),
         'spectrum': spectral_pack(h_gamma),
         'formula': r'G=-iX_{orb}\otimes\sigma_x,\quad H=X_{orb}\otimes I+2I\otimes\sigma_x',
         'scope': '固定 Γ 点的有限矩阵反例，不是对交错磁序材料 Hamiltonian 的拟合。'},
        {'id': 'antiunitary-z-plus', 'title': 'Z 点：反幺正平方为 +I 也可没有简并',
         'k': [0, 0, '1/2'], 'spinful': True, 'antiunitary': True,
         'energyUnits': 'dimensionless model units',
         'description': '这里 B=J 直积 J，A=BK。给出的 H 保持 A，但四个能级各不相同。',
         'symmetryMatrix': matrix_pack(at_z), 'operatorSquare': matrix_pack(at_z*at_z.conjugate()),
         'hamiltonian': matrix_pack(h_z),
         'symmetryResidual': matrix_pack(at_z*h_z.conjugate()*at_z.conjugate().T-h_z),
         'preservesHamiltonian': zero(at_z*h_z.conjugate()*at_z.conjugate().T-h_z),
         'spectrum': spectral_pack(h_z),
         'formula': r'B=J_{orb}\otimes J_{spin},\quad H=X_{orb}\otimes\sigma_x+2Z_{orb}\otimes\sigma_z',
         'scope': '固定 Z 点的有限矩阵反例；A²=+I 不禁止其他对称性或偶然简并。'},
    ]


def pattern_data(spinful):
    reference = [{'id': 'A', 'position': [0, 0, 0], 'spin': [0, 0, 1]},
                 {'id': 'B', 'position': [0, 0, .5], 'spin': [0, 0, -1]}]
    frames = []
    for index, (label, shift, sign, preserves) in enumerate([
            ('初始磁矩图案', 0, 1, True), ('仅半平移', .5, 1, False),
            ('仅时间反演', 0, -1, False), ('半平移与时间反演 A', .5, -1, True)]):
        sites = [{**site, 'position': [0, 0, site['position'][2]+shift],
                  'spin': [0, 0, site['spin'][2]*sign]} for site in reference]
        frames.append({'step': index, 'label': label, 'sites': sites, 'preservesPattern': preserves})
    if spinful:
        frames.append({'step': 4, 'label': '半平移与幺正自旋二重旋转 G',
                       'sites': deepcopy(frames[3]['sites']), 'preservesPattern': True})
    return {'lab': 'spin_group', 'dimension': 'space', 'title': '三维格中的交错磁矩与半平移',
            'referenceSites': reference, 'frames': frames,
            'cellVertices': [[x, y, z] for x, y, z in [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0),
                                                       (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]],
            'latticeAxes': [{'label': axis, 'start': [0, 0, 0], 'end': end}
                            for axis, end in [('a', [1, 0, 0]), ('b', [0, 1, 0]), ('c', [0, 0, 1])]],
            'scope': '箭头只检验给定图案；不显示复振幅或 Bloch 相位。无自旋分支的箭头表示抽象时间奇序参量。'}


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError('反平移工坊输入必须为 JSON 对象。')
    if set(payload)-{'lab', 'k', 'spinful', 'statePreset'}:
        raise ValueError('反平移工坊含未知输入字段。')
    if 'lab' in payload and payload['lab'] != 'antitranslation':
        raise ValueError('lab 必须为 antitranslation。')
    raw_k = payload.get('k', [0, 0, 0])
    if not isinstance(raw_k, list) or len(raw_k) != 3:
        raise ValueError('k 必须包含三个倒格矢分数。')
    k = sp.Matrix([number(value) for value in raw_k])
    spinful = payload.get('spinful', True)
    if not isinstance(spinful, bool):
        raise ValueError('spinful 必须为 true 或 false。')
    state_preset = payload.get('statePreset', 'complex')
    if state_preset not in ('basis', 'complex'):
        raise ValueError('statePreset 必须为 basis 或 complex。')
    theta_square = -1 if spinful else 1
    spin_dimension = 2 if spinful else 1
    j = J if spinful else sp.eye(1)
    dimension = 2*spin_dimension
    identity = sp.eye(dimension)
    phase = sp.exp(-2*sp.pi*sp.I*k[2])
    s_k = sp.Matrix([[0, phase], [1, 0]])
    s_partner = s_k.conjugate()
    b_k = sp.kronecker_product(s_partner, j)
    b_partner = sp.kronecker_product(s_k, j)
    returning = b_partner*b_k.conjugate()
    square_scalar = theta_square*phase
    axis_invariant = [bool((2*x).is_Integer) for x in k]
    same_k = all(axis_invariant)
    # For rational reduced wavevectors this is an exact modular condition,
    # independent of numerical trig previews or symbolic-expression heuristics.
    square_is_minus = bool(k[2].is_Integer) if spinful else bool((2*k[2]).is_Integer and not k[2].is_Integer)
    if state_preset == 'basis':
        psi = sp.eye(dimension)[:, 0]
    elif spinful:
        psi = sp.Matrix([1, sp.I, 2, 1-sp.I])/sp.sqrt(8)
    else:
        psi = sp.Matrix([1, sp.I])/sp.sqrt(2)
    first_conjugate = psi.conjugate()
    first_state = b_k*first_conjugate
    second_conjugate = first_state.conjugate()
    second_state = b_partner*second_conjugate
    same_k_overlap = clean((psi.conjugate().T*first_state)[0]) if same_k else None
    contrast = {'available': spinful, 'antiunitary': False,
                'description': 'G 保持 k；它是幺正操作，平方为 −I 本身不能推出 Kramers 简并。'}
    if spinful:
        spin_rotation = -sp.I*X
        g_k = sp.kronecker_product(s_k, spin_rotation)
        contrast.update({'spinRotation': matrix_pack(spin_rotation), 'matrix': matrix_pack(g_k),
                         'square': matrix_pack(g_k*g_k), 'squareScalar': scalar_pack(-phase),
                         'sameK': True})
    else:
        contrast['reason'] = '此对照指定自旋 1/2 的幺正二重旋转；无自旋分支不把它当作已有算符。'
    examples = counterexamples()
    if not same_k:
        reason = 'A 把态送到另一个 k 空间；即使平方为 −I，也不能据此保证同一 k 的 Kramers 简并。'
    elif square_is_minus:
        reason = '同一 k 条件与 A²=−I 同时满足；还须由 Hamiltonian 的 A 对称性才能推出配对。'
    else:
        reason = 'A 回到同一 k，但平方不是 −I；此反幺正操作本身不保证 Kramers 配对。'
    # This describes the existing UI's finite step grid, not an algorithmic
    # quantization of the exact three-dimensional input.
    legacy_allowed = k[0] == 0 and k[1] == 0 and abs(k[2]) <= 1 and bool((20*k[2]).is_Integer)
    copy = {'available': bool(legacy_allowed), 'exactLongitudinalK': str(k[2]),
            'description': '原一维实验只接收纵向数值 k，范围 −1 到 1、步长 0.05；复制后仍需手动运行。'}
    if legacy_allowed:
        copy['payload'] = {'lab': 'antiferro', 'k': float(k[2]), 'spinful': spinful}
    elif k[0] != 0 or k[1] != 0:
        copy['reason'] = '存在横向 k 分量；不能静默丢弃它们后复制到一维实验。'
    else:
        copy['reason'] = '此精确 k 不在原一维表单的合法步长或范围内；可继续查看本工坊精确结果。'
    output = {'schema': SCHEMA, 'lab': 'antitranslation', 'exact': True,
        'input': deepcopy(payload), 'arithmetic': 'bounded rational wavevectors and exact finite matrices; numeric mirrors for display only',
        'basis': {'dimension': dimension, 'spinDimension': spin_dimension,
                  'order': ['A-up', 'A-down', 'B-up', 'B-down'] if spinful else ['A', 'B'],
                  'statePreset': state_preset, 'initialState': vector_pack(psi),
                  'convention': '周期轨道 Bloch 基取 Σ_R exp(+2πik·R)|R,α,s〉；T_n 的本征值为 exp(−2πik·n)。磁性原胞三条边长均为 1，α=A、B 位于 z=0、1/2。'},
        'momentum': {'k': vector_pack(k), 'partner': vector_pack(-k), 'sameK': same_k,
                     'axisInvariant': axis_invariant, 'sewingShift': vector_pack(2*k) if same_k else None,
                     'description': '三个分量均满足 2k∈整数，才有 −k+G=k。此周期轨道规范下 G 为整数时基底识别矩阵是单位阵。'},
        'translation': {'atK': matrix_pack(s_k), 'atPartner': matrix_pack(s_partner),
                        'squareAtK': matrix_pack(s_k*s_k), 'fullCellPhase': scalar_pack(phase),
                        'siteMappings': [
                            {'source': 'A', 'target': 'B', 'cellShift': [0, 0, 0],
                             'sourcePosition': vector_pack([0, 0, 0]), 'unwrappedPosition': vector_pack([0, 0, sp.Rational(1, 2)]),
                             'coefficientAtK': scalar_pack(1)},
                            {'source': 'B', 'target': 'A', 'cellShift': [0, 0, 1],
                             'sourcePosition': vector_pack([0, 0, sp.Rational(1, 2)]), 'unwrappedPosition': vector_pack([0, 0, 1]),
                             'coefficientAtK': scalar_pack(phase)}],
                        'convention': '半平移沿 +z。第二个站点跨入下一原胞，因此矩阵第 A 行、第 B 列带整胞相位；不能先折回位置再丢掉该相位。'},
        'antiunitary': {'thetaMatrix': matrix_pack(j), 'thetaSquare': theta_square,
                        'atK': matrix_pack(b_k), 'atPartner': matrix_pack(b_partner),
                        'firstConjugate': vector_pack(first_conjugate), 'firstState': vector_pack(first_state),
                        'secondConjugate': vector_pack(second_conjugate), 'secondState': vector_pack(second_state),
                        'returnSquare': matrix_pack(returning), 'squareScalar': scalar_pack(square_scalar),
                        'wrongOrdinarySquare': matrix_pack(b_k*b_k),
                        'wrongSameFiberProduct': matrix_pack(b_k*b_k.conjugate()),
                        'sameFiberMatrixApplies': same_k,
                        'sameKOverlap': scalar_pack(same_k_overlap) if same_k else None,
                        'sameKOrthogonal': bool(same_k_overlap == 0) if same_k else None,
                        'convention': 'A=T_(c/2)Θ 从 H_k 到 H_−k；B_A(k)=S(−k)⊗J。第二次作用须使用 B_A(−k) 并共轭第一次的全部系数。'},
        'unitaryContrast': contrast,
        'decision': {'sameK': same_k, 'squareIsMinusOne': bool(square_is_minus),
                     'kramersConditional': bool(same_k and square_is_minus), 'reason': reason,
                     'hamiltonianSymmetry': 'not-evaluated', 'materialDegeneracy': 'not-evaluated'},
        'counterexamples': examples, 'legacyCopy': copy, 'pattern': pattern_data(spinful),
        'steps': [
            step('cell-phase', '① 保留跨胞位移，建立半平移矩阵', '先跟踪 A 到 B、B 到下一原胞的 A，再把整胞 Bloch 相位放入对应矩阵列。', r'S(k)=\begin{pmatrix}0&e^{-2\pi i k_z}\\1&0\end{pmatrix},\quad S(k)^2=e^{-2\pi i k_z}I'),
            step('fiber-conjugation', '② 第二次作用属于返回的波矢空间', '第一次先共轭初态，再由 B_A(k) 送到 −k；第二次共轭整条中间态，再乘 B_A(−k)。', r'A_{-k}A_k=B_A(-k)B_A(k)^*=\Theta^2e^{-2\pi i k_z}I'),
            step('same-k', '③ 逐个分量检验同一 k，而不只看 k_z', '平方相位只含 k_z，但 A 反转三个动量分量。横向一般动量仍会去往另一个空间。', r'-k+G=k\quad\Longleftrightarrow\quad 2k_x,2k_y,2k_z\in\mathbb{Z}'),
            step('conditions', '④ 用两个非简并 Hamiltonian 反例检验推论', '先区分幺正与反幺正，再检查同一 k、平方及 Hamiltonian 对称性；有限图案的箭头重合不能替代这些条件。', r'[A,H]=0,\quad A^2=-I,\quad A:\mathcal H_k\to\mathcal H_k')],
        'checks': [
            check('translation-unitary', '半平移矩阵保持范数', zero(s_k.conjugate().T*s_k-I2)),
            check('translation-square', '两次半平移留下整胞相位', zero(s_k*s_k-phase*I2)),
            check('antiunitary-isometry', '反幺正矩阵部分保持范数', zero(b_k.conjugate().T*b_k-identity)),
            check('return-square', '跨两个波矢空间的正确平方', zero(returning-square_scalar*identity)),
            check('initial-normalized', '所选初态已规范化', clean((psi.conjugate().T*psi)[0]-1) == 0),
            check('state-return', '两次作用等于平方相位乘初态', zero(second_state-square_scalar*psi)),
            check('conditional-orthogonality', '同一 k 且平方为 −I 时所选态与其像正交', not (same_k and square_is_minus) or same_k_overlap == 0),
            check('momentum-condition', '同一 k 判据逐个分量成立', same_k == all(bool((2*x).is_Integer) for x in k)),
            check('unitary-counterexample', 'Γ 点幺正反例对称且无简并', examples[0]['preservesHamiltonian'] and not examples[0]['spectrum']['hasDegeneracy'] and not examples[0]['comparisonAntiunitaryPreservesHamiltonian']),
            check('plus-counterexample', 'Z 点反幺正反例对称且无简并', examples[1]['preservesHamiltonian'] and not examples[1]['spectrum']['hasDegeneracy'])],
        'notes': [
            '本工坊只计算给定两子格表示及其精确操作。没有从原子结构搜索磁空间群，也没有计算材料能带或拓扑不变量。',
            '在一般 k，A 连接两个不同波矢空间；将 B_A(k) 当作同一空间矩阵直接平方或重复使用，会丢失返回空间与复共轭。',
            '自旋 1/2 的 J=−iσ_y 且 Θ²=−1；无自旋分支 J=1、Θ²=+1，其交错箭头只表示抽象时间奇序参量。',
            '单位整胞平移在 k 的相位不受整数倒格矢平移影响；原胞内位置未放入指数的周期轨道规范，使 −k+G 的识别明确。',
            '文献也可选负向半平移或嵌入位置的 Bloch 规范，矩阵和相位写法随之改变；比较时先统一平移方向、k 单位与基底。'],
        'sources': [{'title': 'Mong, Essin and Moore, Antiferromagnetic topological insulators, Sec. II (2010)',
                     'url': 'https://doi.org/10.1103/PhysRevB.81.245209'},
                    {'title': 'Authors’ preprint: Sec. II, half translation and the antiunitary square',
                     'url': 'https://arxiv.org/abs/1004.1403'}]}
    if spinful:
        output['checks'].append(check('unitary-square', '幺正对照具有相同平方相位但不同定理条件', zero(g_k*g_k+phase*identity)))
    return output
