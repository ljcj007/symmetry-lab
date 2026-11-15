"""Exact, bounded operation replays for labels, spinors and classical moments.

These are explicit finite teaching models, not a magnetic group classifier.
User numbers are parsed as bounded rational data, never as Python/SymPy code.
The spinor convention agrees with teaching_labs: Theta = -i sigma_y K.
"""
from copy import deepcopy
from fractions import Fraction
import math
import re
import sympy as sp

SCHEMA = 'symmetry-lab-spin-actions-1'
I2, I3 = sp.eye(2), sp.eye(3)
X = sp.Matrix([[0, 1], [1, 0]])
Y = sp.Matrix([[0, -sp.I], [sp.I, 0]])
Z = sp.diag(1, -1)
J = -sp.I*Y
NUMBER = re.compile(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})?\Z')
RATIONAL = re.compile(r'[+-]?\d+/[1-9]\d*\Z')
ANGLES = (0, 30, 45, 60, 90, 120, 180)


def clean(value):
    return sp.simplify(value)


def matrix_clean(matrix):
    return matrix.applyfunc(clean)


def zero(matrix):
    return all(clean(x) == 0 for x in matrix)


def equal(left, right):
    return left.shape == right.shape and zero(left-right)


def number(value, label='number', bound=1000):
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError(label+' 须为有限整数、十进制数或有理数，不接受符号表达式。')
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError(label+' 须为有限数。')
    text = str(value).strip()
    if len(text) > 48 or not (NUMBER.fullmatch(text) or RATIONAL.fullmatch(text)):
        raise ValueError(label+' 只接受有限十进制或 p/q，不接受函数、变量或任意表达式。')
    try:
        value = Fraction(text)
    except (ValueError, ZeroDivisionError, OverflowError) as exc:
        raise ValueError(label+' 不是有效有理数。') from exc
    if abs(value) > bound or abs(value.numerator) > 10**15 or value.denominator > 10**12:
        raise ValueError(label+' 超出精确教学输入的幅度或分母限制。')
    return sp.Rational(value.numerator, value.denominator)


def vector(raw, label, dimension=3, bound=1000):
    if not isinstance(raw, list) or len(raw) != dimension:
        raise ValueError(label+' 须含 '+str(dimension)+' 个数。')
    return sp.Matrix([number(x, label, bound) for x in raw])


def real_matrix(raw, label):
    if not isinstance(raw, list) or len(raw) != 3 or any(not isinstance(row, list) or len(row) != 3 for row in raw):
        raise ValueError(label+' 须为 3×3 实矩阵。')
    return sp.Matrix([[number(x, label, 1) for x in row] for row in raw])


def orthogonal(raw, label):
    result = real_matrix(raw, label)
    if not equal(result.T*result, I3) or result.det() not in (-1, 1):
        raise ValueError(label+' 必须精确正交且行列式为 +1 或 −1。请用精确有理数而非舍入旋转矩阵。')
    return result


def complex_number(raw, label):
    parts = vector(raw, label, 2)
    return parts[0]+sp.I*parts[1]


def scalar_pack(value):
    value = clean(value)
    return {'exact': str(value), 're': float(sp.re(value)), 'im': float(sp.im(value))}


def matrix_pack(matrix):
    matrix = matrix_clean(matrix)
    return {'exact': [[str(matrix[i, j]) for j in range(matrix.cols)] for i in range(matrix.rows)],
            'numeric': {'re': [[float(sp.re(matrix[i, j])) for j in range(matrix.cols)] for i in range(matrix.rows)],
                        'im': [[float(sp.im(matrix[i, j])) for j in range(matrix.cols)] for i in range(matrix.rows)]},
            'shape': [matrix.rows, matrix.cols]}


def vector_pack(value):
    value = matrix_clean(value)
    return {'exact': [str(x) for x in value],
            'numeric': {'re': [float(sp.re(x)) for x in value], 'im': [float(sp.im(x)) for x in value]},
            'dimension': len(value)}


def real_list(value):
    return [float(x) for x in value]


def choice(payload, name, choices, default):
    value = payload.get(name, default)
    if not isinstance(value, str) or value not in choices:
        raise ValueError(name+' 须为 '+', '.join(choices))
    return value


def allowed(payload, names):
    unknown = set(payload)-{'lab', 'experiment'}-set(names)
    if unknown:
        raise ValueError('未知输入字段：'+', '.join(sorted(unknown)))


def check(identifier, label, passed, detail=''):
    return {'id': identifier, 'label': label, 'passed': bool(passed), 'detail': detail}


def step(identifier, title, explanation, formula):
    return {'id': identifier, 'title': title, 'explanation': explanation, 'formula': formula}


def base(payload, experiment):
    return {'schema': SCHEMA, 'lab': 'spin_actions', 'experiment': experiment,
            'exact': True, 'arithmetic': 'exact rational/algebraic matrices; numeric mirrors for display only',
            'input': deepcopy(payload), 'steps': [], 'checks': [], 'notes': []}


def theta(psi):
    return matrix_clean(J*psi.conjugate())


def bloch(psi):
    return sp.Matrix([clean((psi.conjugate().T*p*psi)[0]) for p in (X, Y, Z)])


def color_theta(payload):
    allowed(payload, ('statePreset', 'state', 'scalar', 'operatorPhase'))
    preset = choice(payload, 'statePreset', ('plus', 'circular', 'up', 'generic', 'custom'), 'plus')
    states = {'plus': sp.Matrix([1, 1]), 'circular': sp.Matrix([1, sp.I]),
              'up': sp.Matrix([1, 0]), 'generic': sp.Matrix([sp.Rational(3, 5), sp.Rational(12, 25)+sp.I*sp.Rational(16, 25)])}
    if preset == 'custom':
        raw = payload.get('state')
        if not isinstance(raw, list) or len(raw) != 2:
            raise ValueError('自定义 state 须为 [[Re a,Im a],[Re b,Im b]]。')
        psi = sp.Matrix([complex_number(x, 'state') for x in raw])
    else:
        if 'state' in payload:
            raise ValueError('提供 state 时须明确选择 statePreset=custom。')
        psi = states[preset]
    norm2 = clean((psi.conjugate().T*psi)[0])
    if norm2 == 0:
        raise ValueError('复态不能是零向量。')
    psi = matrix_clean(psi/sp.sqrt(norm2))
    scalar = complex_number(payload.get('scalar', [0, 1]), 'scalar')
    phase_raw = complex_number(payload.get('operatorPhase', [1, 0]), 'operatorPhase')
    phase_norm = clean(phase_raw*sp.conjugate(phase_raw))
    if phase_norm == 0:
        raise ValueError('operatorPhase 不能为零；非零输入会规范化为单位模相位。')
    phase = clean(phase_raw/sp.sqrt(phase_norm))
    swapped, reversed_state = matrix_clean(X*psi), theta(psi)
    scaled = matrix_clean(scalar*psi)
    phased_j = matrix_clean(phase*J)
    overlap = clean((swapped.conjugate().T*reversed_state)[0])
    overlap_squared = clean(overlap*sp.conjugate(overlap))
    output = base(payload, 'color_theta')
    output['parameters'] = {'statePreset': preset, 'rawStateNormSquared': str(norm2),
                            'stateNormalizationApplied': True, 'operatorPhaseNormalized': True}
    output['scalar'], output['operatorPhase'] = scalar_pack(scalar), scalar_pack(phase)
    output['matrices'] = {key: matrix_pack(value) for key, value in {
        'swap': X, 'thetaUnitary': J, 'thetaSquare': J*J.conjugate(),
        'phasedThetaUnitary': phased_j, 'phasedThetaSquare': phased_j*phased_j.conjugate(),
        'phasedThetaOrdinarySquare': phased_j*phased_j,
        'hamiltonian': X, 'thetaHamiltonian': J*X.conjugate()*J.inv(),
        'swapSquare': X*X}.items()}
    vectors = {'initial': psi, 'conjugated': psi.conjugate(), 'swap': swapped, 'theta': reversed_state,
        'swapTwice': X*swapped, 'thetaConjugated': reversed_state.conjugate(), 'thetaTwice': theta(reversed_state),
        'scaledInitial': scaled, 'swapScaled': X*scaled, 'scalarTimesSwap': scalar*swapped,
        'thetaScaled': theta(scaled), 'conjugateScalarTimesTheta': sp.conjugate(scalar)*reversed_state,
        'scalarTimesTheta': scalar*reversed_state, 'phasedTheta': phased_j*psi.conjugate(),
        'phasedThetaTwice': phased_j*(phased_j*psi.conjugate()).conjugate()}
    output['states'] = {key: vector_pack(value) for key, value in vectors.items()}
    output['blochVectors'] = {key: vector_pack(bloch(value)) for key, value in {
        'initial': psi, 'swap': swapped, 'theta': reversed_state}.items()}
    output['comparison'] = {'sameComponents': equal(swapped, reversed_state), 'sameRay': overlap_squared == 1,
        'overlap': scalar_pack(overlap), 'overlapAbsSquared': scalar_pack(overlap_squared),
        'initialThetaOverlap': scalar_pack((psi.conjugate().T*reversed_state)[0]),
        'thetaOrthogonalToInitial': clean((psi.conjugate().T*reversed_state)[0]) == 0,
        'swapThetaRayDistanceSquared': scalar_pack(2-2*sp.sqrt(overlap_squared))}
    eigenvalues = sorted(X.eigenvals().items(), key=lambda pair: float(pair[0]))
    output['hamiltonian'] = {'eigenvalues': [str(value) for value, _ in eigenvalues],
        'multiplicities': [int(multiplicity) for _, multiplicity in eigenvalues],
        'commutesWithSwap': equal(X*X-X*X, sp.zeros(2)),
        'timeReversalSymmetric': equal(J*X.conjugate()*J.inv(), X),
        'characteristicPolynomial': str(X.charpoly('lambda').as_expr()), 'units': 'dimensionless teaching energy'}
    output['steps'] = [
        step('spaces', '先固定两个空间与有序基', 'P是形式标签空间的线性延拓；Θ作用于另一个明确指定的自旋1/2空间。相同二元坐标不使两个物理空间相同。', 'P=σx；Θ=−iσy K=A K，A=[[0,−1],[1,0]]'),
        step('conjugate', '先共轭，再乘A', '逐项显示ψ、ψ*和Aψ*，与只交换两个系数的Pψ比较。', 'P(a,b)ᵀ=(b,a)ᵀ；Θ(a,b)ᵀ=(−b*,a*)ᵀ'),
        step('scalar', '改变复系数检验线性', '同时计算P(cψ)、cPψ、Θ(cψ)、c*Θψ及cΘψ。输入为实数时这一步可能无法区分两种法则。', 'P(cψ)=cPψ；Θ(cψ)=c*Θψ'),
        step('twice', '第二次作用仍要共轭', '逐次作用与算符复合独立核对。本约定A恰为实矩阵，但一般反幺正平方必须算AA*。', 'P²=I；Θ²=AA*=−I'),
        step('phase', '算符整体相位与二次作用', '将Θ乘以单位模相位不会改变平方；反线性使第二个相位被共轭，不能误算成相位平方。', '(e^{iχ}Θ)²=e^{iχ}e^{−iχ}Θ²=−I'),
        step('rays', '相同分量与相同物理射线分开', 'ψc上Pψc与Θψc可能完全相同；ψ+上则正交。整体负号不改变孤立态概率，输出内积和Bloch向量帮助识别真正不同的射线。', '|⟨Pψ|Θψ⟩|²=1 ⇔ 同一归一化射线'),
        step('counterexample', '保持换色不强制简并', '精确H=σx保持P，却有两个不简并能级±1；它不保持Θ，因此不违反Kramers定理。', '[H,P]=0；ΘHΘ⁻¹=−H；spec(H)={−1,+1}')]
    output['checks'] = [check('norm', '初态已规范化', clean((psi.conjugate().T*psi)[0]) == 1),
        check('linear', 'P保持复系数', equal(vectors['swapScaled'], vectors['scalarTimesSwap'])),
        check('antilinear', 'Θ共轭复系数', equal(vectors['thetaScaled'], vectors['conjugateScalarTimesTheta'])),
        check('swap-square', '两次P回到ψ', equal(vectors['swapTwice'], psi)),
        check('theta-square', '两次Θ得到−ψ', equal(vectors['thetaTwice'], -psi)),
        check('phase-square', '给Θ加整体相位不改变平方', equal(phased_j*phased_j.conjugate(), -I2)),
        check('theta-orthogonal', 'ψ与Θψ正交', output['comparison']['thetaOrthogonalToInitial']),
        check('theta-bloch', 'Θ反转全部Bloch分量', equal(bloch(reversed_state), -bloch(psi))),
        check('counterexample', '换色反例不具有Θ对称', not output['hamiltonian']['timeReversalSymmetric'])]
    output['notes'] = ['Θ统一采用本站的−iσyK约定；改成+iσyK只改变整体相位，不改变Θ²。',
        '形式颜色振幅不自动成为电子自旋；数值相同或标签互换不能代替算符定义。',
        '反幺正配对还要求Hamiltonian具有该对称；若讨论同一晶体动量，还须−k≡k。此实验没有计算能带。',
        '所有精确字符串由有界有理输入的矩阵计算生成；浮点副本仅用于显示。']
    return output


def trusted_matrix(raw):
    """Only source-controlled output from group_extensions, never user text."""
    return sp.Matrix([[sp.sympify(text, locals={'sqrt': sp.sqrt}) for text in row] for row in raw])


def legacy_model(preset):
    from group_extensions import run
    source = run({'lab': 'spin_group', 'preset': preset, 'variant': 'combined', 'steps': 1})
    frame = source['frames'][1]
    sites = [{'id': x['id'], 'species': 'X',
        'position': trusted_matrix([x['positionExact']]).T,
        'moment': trusted_matrix([x['spinExact']]).T} for x in source['referenceSites']]
    return sites, source['dimension'] == 'space', trusted_matrix(frame['rotationExact']), \
        trusted_matrix([frame['translationExact']]).T, trusted_matrix(frame['internalExact'])


def public_site(site, position=None, moment=None, target=None):
    position = site['position'] if position is None else position
    moment = site['moment'] if moment is None else moment
    out = {'id': site['id'], 'species': site['species'], 'position': real_list(position),
        'positionExact': [str(clean(x)) for x in position], 'spin': real_list(moment),
        'spinExact': [str(clean(x)) for x in moment]}
    if target is not None:
        out['targetId'] = target
    return out


def same_position(left, right, periodic):
    delta = matrix_clean(left-right)
    return all(x.is_integer is True for x in delta) if periodic else zero(delta)


def custom_sites(raw, periodic):
    if not isinstance(raw, list) or not 1 <= len(raw) <= 12:
        raise ValueError('sites 须含1至12个站点。')
    sites = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict) or set(item)-{'id', 'species', 'position', 'moment'}:
            raise ValueError('sites每项仅含id、species、position和moment。')
        identifier, species = item.get('id', 'site-'+str(index)), item.get('species', 'X')
        if not isinstance(identifier, str) or not identifier or len(identifier) > 32 or any(x['id'] == identifier for x in sites):
            raise ValueError('站点id须非空、唯一且不超过32字符。')
        if not isinstance(species, str) or not species or len(species) > 32:
            raise ValueError('species须为非空标签且不超过32字符。')
        site = {'id': identifier, 'species': species,
            'position': vector(item.get('position'), 'position', bound=100),
            'moment': vector(item.get('moment'), 'moment')}
        if any(same_position(site['position'], other['position'], periodic) for other in sites):
            raise ValueError('站点位置须互不相同；周期模型按整格平移检查重复。')
        sites.append(site)
    return sites


def quaternion_lift(rotation):
    """One explicit SU(2) lift of a real proper orthogonal matrix."""
    if not equal(rotation.T*rotation, I3) or clean(rotation.det()) != 1:
        raise ValueError('只有SO(3)正旋转可作本实验的SU(2)提升。')
    trace = clean(sp.trace(rotation))
    if clean(1+trace) != 0:
        w = sp.sqrt(clean(1+trace))/2
        x, y, z = [(rotation[2, 1]-rotation[1, 2])/(4*w),
                   (rotation[0, 2]-rotation[2, 0])/(4*w), (rotation[1, 0]-rotation[0, 1])/(4*w)]
    else:
        axis = next(i for i in range(3) if clean(rotation[i, i]+1) != 0)
        v = [sp.Integer(0)]*3
        v[axis] = sp.sqrt(clean((rotation[axis, axis]+1)/2))
        for j in range(3):
            if j != axis:
                v[j] = clean((rotation[axis, j]+rotation[j, axis])/(4*v[axis]))
        w, (x, y, z) = sp.Integer(0), v
    return matrix_clean(w*I2-sp.I*(x*X+y*Y+z*Z))


def quantum_implementation(operation):
    determinant = int(clean(operation.det()))
    anti = determinant == -1
    proper = matrix_clean(determinant*operation)
    lift = quaternion_lift(proper)
    part = matrix_clean(lift*J if anti else lift)
    square = matrix_clean(part*part.conjugate() if anti else part*part)
    return {'antiunitary': anti,
        'kind': 'antiunitary-rotation-time-reversal' if anti else 'unitary-spin-rotation',
        'properRotation': matrix_pack(proper), 'unitaryPart': matrix_pack(part),
        'square': matrix_pack(square), 'classicalSquare': matrix_pack(operation*operation),
        'convention': 'Θ=−iσyK；D(V)=wI−i(xσx+yσy+zσz)。选择一个明确SU(2)提升；另一提升差整体−1。',
        'scope': '这里只计算自旋因子；没有空间轨道表示、Bloch平移相位或实际材料Hamiltonian。'}


def viewer(sites, periodic, frames, title):
    out = {'lab': 'spin_group', 'dimension': 'space' if periodic else 'point', 'title': title,
           'referenceSites': [public_site(site) for site in sites], 'frames': frames}
    if periodic:
        out['cellVertices'] = [[x, y, z] for x in (0, 1) for y in (0, 1) for z in (0, 1)]
        out['latticeAxes'] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    return out


def frame(sites, rotation, translation, operation, periodic, label, index):
    rows, shown, mapping = [], [], []
    for site in sites:
        after = matrix_clean(rotation*site['position']+translation)
        transformed = matrix_clean(operation*site['moment'])
        targets = [other for other in sites if other['species'] == site['species'] and same_position(after, other['position'], periodic)]
        target = targets[0] if len(targets) == 1 else None
        difference = matrix_clean(transformed-target['moment']) if target is not None else None
        matches = target is not None and zero(difference)
        mapping.append(target['id'] if target is not None else None)
        rows.append({'sourceId': site['id'], 'targetId': target['id'] if target is not None else None,
            'positionBefore': vector_pack(site['position']), 'positionAfter': vector_pack(after),
            'initial': vector_pack(site['moment']), 'target': vector_pack(target['moment']) if target is not None else None,
            'transformed': vector_pack(transformed), 'difference': vector_pack(difference) if difference is not None else None,
            'positionMatches': target is not None, 'momentMatches': bool(matches)})
        shown.append(public_site(site, after, transformed, target['id'] if matches else None))
    structure = all(row['positionMatches'] for row in rows) and len(set(mapping)) == len(sites)
    preserved = structure and all(row['momentMatches'] for row in rows)
    visual = {'step': index, 'operation': label, 'rotationExact': matrix_pack(rotation)['exact'],
        'translationExact': [str(x) for x in translation], 'internalExact': matrix_pack(operation)['exact'],
        'sites': shown, 'preservesPattern': bool(preserved)}
    return rows, visual, bool(structure), bool(preserved)


def spin_stabilizer(payload):
    allowed(payload, ('momentPreset', 'moments', 'positions', 'operationPreset', 'angle', 'operation'))
    preset = choice(payload, 'momentPreset', ('triangular', 'collinear', 'zero', 'noncoplanar', 'custom'), 'triangular')
    if preset in ('triangular', 'collinear'):
        if 'moments' in payload or 'positions' in payload:
            raise ValueError('提供moments或positions时须选momentPreset=custom。')
        sites, _, _, _, _ = legacy_model('triangular_point' if preset == 'triangular' else 'c2_point')
    else:
        if preset == 'custom':
            raw = payload.get('moments')
            if not isinstance(raw, list) or not 1 <= len(raw) <= 12:
                raise ValueError('moments须含1至12条三维磁矩。')
            moments = [vector(x, 'moments') for x in raw]
            positions = payload.get('positions', [[i, 0, 0] for i in range(len(moments))])
            if not isinstance(positions, list) or len(positions) != len(moments):
                raise ValueError('positions须与moments等长。')
            positions = [vector(x, 'positions', bound=100) for x in positions]
            if any(equal(a, b) for i, a in enumerate(positions) for b in positions[:i]):
                raise ValueError('positions须互不相同。')
        else:
            if 'moments' in payload or 'positions' in payload:
                raise ValueError('提供moments或positions时须选momentPreset=custom。')
            moments = [sp.zeros(3, 1)]*3 if preset == 'zero' else [I3[:, i] for i in range(3)]
            positions = [sp.Matrix([i, 0, 0]) for i in range(len(moments))]
        sites = [{'id': 'site-'+str(i), 'species': 'X', 'position': p, 'moment': m} for i, (p, m) in enumerate(zip(positions, moments))]
    operation_preset = choice(payload, 'operationPreset', ('identity', 'rotation_z', 'plane_xy', 'plane_xz', 'time_reversal', 'custom'), 'plane_xy')
    if operation_preset != 'rotation_z' and 'angle' in payload:
        raise ValueError('angle仅适用于operationPreset=rotation_z。')
    if operation_preset != 'custom' and 'operation' in payload:
        raise ValueError('提供operation矩阵时须选operationPreset=custom。')
    if operation_preset == 'custom':
        operation = orthogonal(payload.get('operation'), 'operation')
    elif operation_preset == 'rotation_z':
        angle = payload.get('angle', 60)
        if isinstance(angle, bool) or not isinstance(angle, int) or angle not in ANGLES:
            raise ValueError('angle须取0、30、45、60、90、120或180度。')
        c, s = clean(sp.cos(sp.pi*angle/180)), clean(sp.sin(sp.pi*angle/180))
        operation = sp.Matrix([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    else:
        operation = {'identity': I3, 'plane_xy': sp.diag(1, 1, -1),
                     'plane_xz': sp.diag(1, -1, 1), 'time_reversal': -I3}[operation_preset]
    moments = sp.Matrix.hstack(*(site['moment'] for site in sites))
    rref, pivots = moments.rref()
    span = sp.GramSchmidt(moments.columnspace(), True)
    complement = sp.GramSchmidt(moments.T.nullspace(), True)
    b = sp.Matrix.hstack(*span) if span else sp.zeros(3, 0)
    n = sp.Matrix.hstack(*complement) if complement else sp.zeros(3, 0)
    projector = matrix_clean(b*b.T)
    rank = len(pivots)
    rows, applied, _, preserved = frame(sites, I3, sp.zeros(3, 1), operation, False, '纯自旋操作：每个位置固定', 1)
    _, initial, _, _ = frame(sites, I3, sp.zeros(3, 1), I3, False, '原始磁矩', 0)
    sitewise = [{'id': row['sourceId'], 'initial': row['initial'], 'transformed': row['transformed'],
        'difference': row['difference'], 'fixed': row['momentMatches']} for row in rows]
    output = base(payload, 'spin_stabilizer')
    full = ('O(3)', 'O(2)', '{I, reflection in the moment plane}', '{I}')[rank]
    proper = ('SO(3)', 'SO(2) around the moment axis', '{I}', '{I}')[rank]
    output['parameters'] = {'momentPreset': preset, 'operationPreset': operation_preset,
                            'angle': payload.get('angle', 60) if operation_preset == 'rotation_z' else None}
    output['spinOnly'] = {'momentMatrix': matrix_pack(moments), 'rank': rank, 'rref': matrix_pack(rref),
        'pivots': list(pivots), 'spanBasis': matrix_pack(b), 'complementBasis': matrix_pack(n),
        'projector': matrix_pack(projector), 'operation': matrix_pack(operation), 'determinant': int(clean(operation.det())),
        'classification': {'full': full, 'proper': proper, 'complementDimension': 3-rank,
                           'family': 'W=P_span+B_perp Q B_perp^T, Q in O(3-rank)'},
        'sitewise': sitewise, 'preservesAll': preserved, 'quantum': quantum_implementation(operation),
        'fixedSubspaceResidual': matrix_pack((operation-I3)*moments)}
    output['viewer'] = viewer(sites, False, [initial, applied], '固定位置的纯自旋稳定子检验')
    output['steps'] = [step('fixed-sites', '先固定所有站点', '本实验空间部分严格为恒等，不能把磁矩换到另一个站点后再宣布spin-only成立。', 'Wm_i=m_i 对每个i；空间R=I,t=0'),
        step('span', '从真实磁矩求秩和张成空间', '用精确RREF找独立磁矩，显示正交归一的张成基与正交补。', 'M=[m₁ … m_N]；rank M=r'),
        step('family', '只允许正交补内自由变化', 'W逐点固定张成空间，在其正交补上可取任意正交变换。这给出完整族，不是用有限几个采样证明连续性。', 'G_so≅O(3−r)；W=P_span+B_perp Q B_perpᵀ'),
        step('apply', '逐个磁矩乘矩阵并比较', '并排显示W、m_i、Wm_i和Wm_i−m_i。共面三角的C₃可置换三个方向，却不能在固定站点下逐点保持它们。', '(W−I)M=0'),
        step('parity', '把经典不正变换解释为反幺正', 'detW=−1时先写V=−W∈SO(3)，再给出D(V)Θ；绝不把不正3×3矩阵直接称为旋量幺正旋转。', 'W=(−I)V；A=D(V)Θ=D(V)(−iσy)K'),
        step('square', '经典平方与旋量平方分开计算', '并列显示W²与自旋因子的平方。反幺正部分必须算BB*，而不是B²；完整空间算符及动量条件还未计算。', '(BK)²=BB*；D(V)²另保留双覆盖中心负号')]
    output['checks'] = [check('orthogonal', '所选W精确正交', equal(operation.T*operation, I3)),
        check('basis', '张成基与补空间正交完整', equal(b*b.T+n*n.T, I3)),
        check('projector', '张成空间投影保持全部磁矩', equal(projector*moments, moments)),
        check('pointwise', '逐点检验与矩阵残差一致', preserved == zero((operation-I3)*moments)),
        check('quantum-norm', '旋量作用保持范数', True)]
    q = output['spinOnly']['quantum']
    # Certify the spin-factor action on all three Pauli matrices, including K.
    part = trusted_matrix(q['unitaryPart']['exact'])
    paulis = (X, Y, Z)
    induced = sp.Matrix([[clean(sp.trace(paulis[i]*part*(paulis[j].conjugate() if q['antiunitary'] else paulis[j])*part.conjugate().T)/2)
                         for j in range(3)] for i in range(3)])
    output['checks'][-1]['passed'] = bool(equal(part.conjugate().T*part, I2) and equal(induced, operation))
    output['notes'] = ['磁矩是时间奇经典向量；W属于O(3)。旋量作用属于幺正/反幺正算符，两个作用空间不能混同。',
        '只有逐点固定的正旋转才属于这里的幺正spin-only部分；等能磁畴旋转或方向置换不替代逐点稳定。',
        '零、共线、共面和非共面由精确输入的秩区分；这里不对真实测量噪声作容差分类。',
        '本实验的场景是有限教学图案，不搜索完整自旋空间群，也不验证某个材料Hamiltonian。']
    return output


def soc_locking(payload):
    allowed(payload, ('modelPreset', 'sites', 'periodic', 'rotation', 'translation', 'spinMatrix'))
    preset = choice(payload, 'modelPreset', ('c2_point', 'af_space', 'triangular_point', 'helix3_space', 'custom'), 'c2_point')
    if preset == 'custom':
        periodic = payload.get('periodic', False)
        if not isinstance(periodic, bool):
            raise ValueError('periodic须为true或false。')
        sites = custom_sites(payload.get('sites'), periodic)
        rotation = orthogonal(payload.get('rotation', [[1, 0, 0], [0, 1, 0], [0, 0, 1]]), 'rotation')
        translation = vector(payload.get('translation', [0, 0, 0]), 'translation', bound=20)
        independent = orthogonal(payload.get('spinMatrix', [[1, 0, 0], [0, 1, 0], [0, 0, 1]]), 'spinMatrix')
        if periodic and any(value.is_integer is not True for value in rotation):
            raise ValueError('本自定义周期模型使用单位正交晶格；rotation必须同时为整数矩阵以保持整格平移。')
    else:
        if set(payload)&{'sites', 'periodic', 'rotation', 'translation', 'spinMatrix'}:
            raise ValueError('提供站点或操作矩阵时须选modelPreset=custom。')
        sites, periodic, rotation, translation, independent = legacy_model(preset)
    det = int(clean(rotation.det()))
    _, initial, _, _ = frame(sites, I3, sp.zeros(3, 1), I3, periodic, '原始磁图案', 0)
    rows, original_frame, structure, original_preserved = frame(sites, rotation, translation, independent, periodic, '给定的独立自旋/空间组合', 1)
    original = {'matrix': matrix_pack(independent), 'preservesPattern': original_preserved,
                'sitewise': rows, 'quantum': quantum_implementation(independent)}
    candidates, frames = [], [initial, original_frame]
    for epsilon in (0, 1):
        locked = matrix_clean((-1)**epsilon*det*rotation)
        rows, visual, _, passed = frame(sites, rotation, translation, locked, periodic,
            'SOC锁定候选：ε='+str(epsilon), epsilon+2)
        for row, site in zip(rows, sites):
            row['polarRotated'] = vector_pack(rotation*site['moment'])
            row['axialRotated'] = vector_pack(det*rotation*site['moment'])
        candidates.append({'timeReversal': bool(epsilon), 'matrix': matrix_pack(locked),
            'matchesInputSpin': equal(locked, independent), 'preservesPattern': passed,
            'sitewise': rows, 'quantum': quantum_implementation(locked)})
        frames.append(visual)
    output = base(payload, 'soc_locking')
    output['parameters'] = {'modelPreset': preset, 'periodic': periodic,
                            'coordinateConvention': 'orthonormal Cartesian; periodic custom cell is the unit cube'}
    output['locking'] = {'rotation': matrix_pack(rotation), 'translation': vector_pack(translation),
        'inputSpin': matrix_pack(independent), 'determinant': det, 'structurePreserved': structure,
        'original': original, 'candidates': candidates, 'hamiltonianSymmetry': 'not-evaluated',
        'originalSatisfiesEitherLock': any(x['matchesInputSpin'] for x in candidates),
        'originalIsLockedPatternSymmetry': original_preserved and any(x['matchesInputSpin'] for x in candidates)}
    output['viewer'] = viewer(sites, periodic, frames, '独立自旋操作与两种SOC锁定候选')
    output['steps'] = [step('operation', '固定同一个空间操作与磁畴', '先列出笛卡尔R、t和原独立自旋矩阵U，保留原操作的身份。', '[U∥R|t]：(r_i,m_i)→(Rr_i+t,U m_i)'),
        step('spatial', '逐点找同种目标站点', '只有空间位置和化学标签先匹配，才比较变换后的磁矩；周期例按整格平移匹配，未折回位置仍保留。', 'Rr_i+t≡r_j；species_i=species_j'),
        step('axial', '从极向量转到时间奇轴矢量', '逐站点显示Rm、det(R)Rm以及最后的时间反演符号，而非只给最终通过/失败。', 'm′=(−1)^ε det(R)R m'),
        step('original', '检查原来的U是否满足锁定', '分别比较原U与两候选矩阵，区分原操作失去锁定和另一个候选仍保持图案。', 'U ?= det(R)R；U ?= −det(R)R'),
        step('candidate', '重新检验两种候选的图案匹配', '即便候选不等于原U，它也可能是另一个实际保磁图案的操作；共线半平移可由Θ补偿。', 'W_ε m_i ?= m_j，ε=0,1'),
        step('quantum', '保留幺正与反幺正的区别', 'ε=1候选对应自旋旋转加Θ，给出自旋因子的精确实现与平方；这还不是完整轨道/平移算符。', 'A_ε=D(det(R)R)Θ^ε'),
        step('scope', '结构匹配不替代Hamiltonian对称', '本计算不输入或检验实际SOC Hamiltonian，也不由净磁矩为零宣布能带简并或Kramers配对。', '图案匹配 + 锁定 + 具体Hamiltonian检验，层次不同')]
    output['checks'] = [check('orthogonal-R', '空间矩阵精确正交', equal(rotation.T*rotation, I3)),
        check('orthogonal-U', '输入自旋矩阵精确正交', equal(independent.T*independent, I3)),
        check('locked-determinant', '两候选的det分别为+1和−1', all(int(trusted_matrix(x['matrix']['exact']).det()) == (-1)**int(x['timeReversal']) for x in candidates)),
        check('distinct', '两个时间分支是不同矩阵', not equal(det*rotation, -det*rotation)),
        check('preservation-accounted', '每个候选由所有站点逐项检验', all(x['preservesPattern'] == (structure and all(row['momentMatches'] for row in x['sitewise'])) for x in candidates))]
    output['notes'] = ['R使用正交笛卡尔坐标；不能直接把一般分数基底矩阵乘到笛卡尔磁矩上。',
        '原U不等于任一锁定候选，不代表相同空间R,t配另一个U后也一定失败。',
        '固定预设复用现有group_extensions的精确站点与联合生成元；不会改变旧实验的结果。',
        '空间模型包含任意整数平移；画面有限，不能把跨胞折回解释成完整空间操作恒等。',
        '量子实现只显示自旋因子；没有轨道表示、Bloch相位和Hamiltonian，不能据此作同一k的简并结论。']
    return output


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError('操作回放输入须为JSON对象。')
    if 'lab' in payload and payload['lab'] != 'spin_actions':
        raise ValueError('lab须为spin_actions。')
    experiment = choice(payload, 'experiment', ('color_theta', 'spin_stabilizer', 'soc_locking'), 'color_theta')
    return {'color_theta': color_theta, 'spin_stabilizer': spin_stabilizer, 'soc_locking': soc_locking}[experiment](payload)
