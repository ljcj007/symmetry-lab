"""Small, mathematically explicit teaching experiments for browser CPython.

No database or external dependency is required. The fixed orthonormal cells are
illustrations, not a classifier of arbitrary space groups or magnetic materials.
All complex numbers at the JSON boundary are {re, im} objects.
"""
import cmath
from fractions import Fraction
import math


_I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
_C2Z = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]]
_C4Z = [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
_MZ = [[1, 0, 0], [0, 1, 0], [0, 0, -1]]
_INVERSION = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
_SEITZ = {
    'translation': (_I3, [0, 0, 1], 1, '纯平移'),
    'screw21': (_C2Z, [0, 0, Fraction(1, 2)], 2, '二重螺旋 2₁'),
    'screw41': (_C4Z, [0, 0, Fraction(1, 4)], 4, '四重螺旋 4₁'),
    'glide': (_MZ, [Fraction(1, 2), 0, 0], 2, '沿 x 的滑移镜面'),
}
_SEITZ_SOURCE = {'title': 'Bilbao Crystallographic Server: Seitz notation',
                 'url': 'https://www.cryst.ehu.es/cryst/seitz_help.html'}
_SPIN_SOURCE = {'title': 'Gregory W. Moore: Quantum Symmetry',
               'url': 'https://www.physics.rutgers.edu/grad/695/QuantumSymmetryBook.pdf'}
_MAG_SOURCE = {
    'title': 'IUCr: Teaching crystallographic and magnetic point group symmetry',
    'url': 'https://www.iucr.org/what-we-do/education/pamphlets/teaching-crystallographic-and-magnetic-point-group-symmetry-using',
}
_AF_SOURCE = {'title': 'Mong, Essin & Moore (2010), Antiferromagnetic topological insulators, Sec. II',
              'url': 'https://arxiv.org/abs/1004.1403'}


def _number(value, name):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or abs(value) > 1_000_000 or not math.isfinite(value)):
        raise ValueError(name + ' 必须是绝对值不超过 1000000 的有限实数')
    return value


def _vector(value, name):
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(name + ' 必须包含 3 个有限实数')
    return [_number(x, name) for x in value]


def _boolean(value, name):
    if not isinstance(value, bool):
        raise ValueError(name + ' 必须为 true 或 false')
    return value


def _choice(value, choices, name):
    if not isinstance(value, str) or value not in choices:
        raise ValueError(name + ' 必须为 ' + '、'.join(choices))
    return value


def _clean(value):
    value = float(value)
    return 0.0 if abs(value) < 1e-14 else value


def _complex(value):
    return {'re': _clean(value.real), 'im': _clean(value.imag)}


def _mv(matrix, vector):
    return [sum(a * b for a, b in zip(row, vector)) for row in matrix]


def _mm(left, right):
    return [[sum(left[i][k] * right[k][j] for k in range(len(right)))
             for j in range(len(right[0]))] for i in range(len(left))]


def _dot(left, right):
    return sum(a * b for a, b in zip(left, right))


def _compose(left, right):
    """(R,t)(S,u) = (RS, R u+t), with the right action first."""
    r, t = left
    s, u = right
    return _mm(r, s), [a + b for a, b in zip(_mv(r, u), t)]


def _seitz(payload):
    preset = _choice(payload.get('preset', 'screw21'), _SEITZ, 'preset')
    point = _vector(payload.get('point', [0.2, 0.3, 0.1]), 'point')
    k = _vector(payload.get('k', [0, 0, 0.5]), 'k')
    steps = payload.get('steps', 4)
    if isinstance(steps, bool) or not isinstance(steps, int) or not 1 <= steps <= 12:
        raise ValueError('steps 必须为 1 到 12 的整数')
    rotation, translation, rotation_order, label = _SEITZ[preset]
    # Decimal input is interpreted exactly as written, not via binary floats.
    point_q = [Fraction(str(x)) for x in point]
    k_q = [Fraction(str(x)) for x in k]
    r, t = [row[:] for row in _I3], [Fraction(0)] * 3
    frames = []
    for step in range(steps + 1):
        xyz = [a + b for a, b in zip(_mv(r, point_q), t)]
        cells = [math.floor(x) for x in xyz]
        wrapped = [x - cell for x, cell in zip(xyz, cells)]
        rk = _mv(r, k_q)
        phase_turns = -_dot(rk, t)
        # Reduce the argument exactly before evaluating sin/cos at large input.
        phase = cmath.exp(2j * math.pi * float(phase_turns % 1))
        frames.append({
            'step': step, 'rotation': [row[:] for row in r],
            'translation': list(map(float, t)),
            'translationExact': [str(x) for x in t],
            'unwrapped': list(map(float, xyz)), 'wrapped': list(map(float, wrapped)),
            'cellTranslation': cells, 'transformedK': list(map(float, rk)),
            'isLittleGroup': all((a - b).denominator == 1 for a, b in zip(rk, k_q)),
            'blochPhase': _complex(phase), 'phaseAngle': 2 * math.pi * float(phase_turns),
        })
        r, t = _compose((rotation, translation), (r, t))
    closure_r, closure_t = [row[:] for row in _I3], [Fraction(0)] * 3
    for _ in range(rotation_order):
        closure_r, closure_t = _compose((rotation, translation), (closure_r, closure_t))
    return {
        'lab': 'seitz', 'title': label + '：追踪 Seitz 操作', 'preset': preset,
        'point': point, 'k': k, 'steps': steps,
        'rotation': [row[:] for row in rotation], 'translation': list(map(float, translation)),
        'frames': frames,
        'closure': {'rotationOrder': rotation_order, 'step': rotation_order,
                    'translation': list(map(float, closure_t)),
                    'isPureTranslation': closure_r == _I3,
                    'isIdentity': closure_r == _I3 and all(x == 0 for x in closure_t)},
        'convention': '正交示意晶胞；坐标以晶格常数为单位，k 以倒格矢为单位。主动作用 r′=Rr+t；gψ(r)=ψ(R⁻¹(r−t))。',
        'notes': [
            'Seitz 乘法为 {R|t}{S|u}={RS|Ru+t}；右边的操作先作用。',
            '平面波 exp(2πik·r) 被送到 Rk，并获得 exp(−2πi(Rk)·t) 相位。一般 k 处该相位不是小群表示的本征值。',
            'wrapped 只表示折回 [0,1) 晶胞。旋转部分回到恒等时，非零整格平移仍然存在；完整空间群是无限群。',
            '四种预设用于比较平移、螺旋和滑移，不代表任意真实晶胞的完整空间群。',
        ], 'sources': [_SEITZ_SOURCE],
    }


def _spin_matrix(axis, angle):
    half = math.radians(angle) / 2
    c, s = math.cos(half), math.sin(half)
    pauli = {'x': [[0, 1], [1, 0]], 'y': [[0, -1j], [1j, 0]],
             'z': [[1, 0], [0, -1]]}[axis]
    return [[(c if i == j else 0) - 1j * s * pauli[i][j]
             for j in range(2)] for i in range(2)]


def _time_reverse(spinor):
    """Theta = -i sigma_y K. Complex conjugation is essential."""
    a, b = spinor
    return [-b.conjugate(), a.conjugate()]


def _spinor(payload):
    axis = _choice(payload.get('axis', 'z'), ('x', 'y', 'z'), 'axis')
    initial = _choice(payload.get('initialState', 'plus'), ('up', 'plus'), 'initialState')
    state = [1 + 0j, 0j] if initial == 'up' else [complex(1 / math.sqrt(2))] * 2
    frames = []
    for angle in range(0, 721, 15):
        matrix = _spin_matrix(axis, angle)
        psi = _mv(matrix, state)
        a, b = psi
        frames.append({
            'angle': angle, 'matrix': [[_complex(x) for x in row] for row in matrix],
            'spinor': [_complex(x) for x in psi],
            'blochVector': [_clean(2 * (a.conjugate() * b).real),
                            _clean(2 * (a.conjugate() * b).imag),
                            _clean(abs(a) ** 2 - abs(b) ** 2)],
            'overlap': _complex(sum(x.conjugate() * y for x, y in zip(state, psi))),
            'probabilities': [_clean(abs(x) ** 2) for x in psi],
        })
    return {
        'lab': 'spinor', 'title': '自旋 1/2：从 360° 到 720°',
        'axis': axis, 'initialState': initial, 'frames': frames,
        'checkpoints': {'angle360': frames[24], 'angle720': frames[48]},
        'timeReversal': {'operator': '−iσy K', 'state': [_complex(x) for x in _time_reverse(state)],
                         'twoApplications': [_complex(x) for x in _time_reverse(_time_reverse(state))],
                         'square': -1},
        'convention': '右手主动旋转 U(θ)=exp(−iθσₙ/2)，基底为 σz 的 ↑、↓ 态；|+⟩=(|↑⟩+|↓⟩)/√2。',
        'notes': [
            'U(360°)=−I，U(720°)=+I；双覆盖保留了 SO(3) 中不可区分的两个 SU(2) 元素。',
            '整体负号不会改变孤立态的测量概率或 Bloch 向量；与未旋转的相干参考路径比较，才可探测相对相位。',
            'Bloch 向量已经在 360° 返回原处；它不能独自显示旋量的整体负号。',
            'Θ=−iσyK 是反幺正操作，K 表示复共轭，Θ²=−I；不能用普通矩阵平方取代反幺正复合。',
        ], 'sources': [_SPIN_SOURCE, _AF_SOURCE],
    }


def _det3(r):
    return (r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1])
            - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0])
            + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]))


def _magnetic(payload):
    rotations = {'E': _I3, 'inversion': _INVERSION, 'mirror_z': _MZ, 'C2z': _C2Z}
    operation = _choice(payload.get('operation', 'mirror_z'), rotations, 'operation')
    time_reversal = _boolean(payload.get('timeReversal', False), 'timeReversal')
    moment = _vector(payload.get('moment', [0.4, 0.3, 0.8]), 'moment')
    position = _vector(payload.get('position', [0.25, 0.35, 0.45]), 'position')
    rotation = rotations[operation]
    det = _det3(rotation)
    sign = -1 if time_reversal else 1
    polar = _mv(rotation, moment)
    return {
        'lab': 'magnetic', 'title': '磁矩为何不是普通箭头', 'operation': operation,
        'timeReversal': time_reversal, 'rotation': [row[:] for row in rotation],
        'determinant': det, 'timeSign': sign, 'position': position, 'moment': moment,
        'transformedPosition': list(map(_clean, _mv(rotation, position))),
        'transformedMoment': [_clean(sign * det * x) for x in polar],
        'polarVectorTransform': list(map(_clean, polar)),
        'convention': '正交笛卡尔坐标；位置是时间偶的极向量，磁矩是时间奇的轴向量。r′=Rr，m′=s det(R)Rm，含时间反演时 s=−1。',
        'notes': [
            '空间反演改变位置和极向量方向，却保持轴向磁矩不变；加入时间反演后磁矩再变号。',
            'mirror_z 表示垂直 z 轴的镜面：极向量的 z 分量变号，轴向磁矩的 x、y 分量变号。',
            '对照箭头采用与初始磁矩相同的数值分量，但代表时间偶的极向量。速度等时间奇的极向量不适用这一对照。',
            '箭头的经典变换只演示磁结构的对称性；量子态的时间反演还必须包含复共轭。',
        ], 'sources': [_MAG_SOURCE],
    }


def _antiferro(payload):
    k = _number(payload.get('k', 0), 'k')
    spinful = _boolean(payload.get('spinful', True), 'spinful')
    k_q = Fraction(str(k))
    tau = Fraction(1, 2)
    theta_square = -1 if spinful else 1
    phase = cmath.exp(-2j * math.pi * float((2 * k_q * tau) % 1))
    square = theta_square * phase
    is_trim = (2 * k_q).denominator == 1
    square_minus = abs(square + 1) < 1e-10
    sites = [{'position': cell + sub / 2, 'moment': 1 if sub == 0 else -1,
              'sublattice': 'A' if sub == 0 else 'B'} for cell in range(-2, 3) for sub in (0, 1)]
    tests = []
    for key, label, shift, sign in (
            ('T_tau', '仅半格平移 Tτ', tau, 1),
            ('Theta', '仅时间反演 Θ', 0, -1),
            ('Theta_T_tau', '组合 ΘTτ', tau, -1)):
        transformed = []
        for site in sites:
            position = Fraction(str(site['position'])) + shift
            moment = sign * site['moment']
            transformed.append({'position': float(position), 'moment': moment,
                                'sublattice': site['sublattice']})
        preserves = all(item['moment'] == (1 if round(2 * item['position']) % 2 == 0 else -1)
                        for item in transformed)
        tests.append({'operation': key, 'label': label,
                      'preservesPattern': preserves, 'sites': transformed})
    return {
        'lab': 'antiferro', 'title': '反铁磁链：时间反演与半格平移',
        'k': k, 'tau': float(tau), 'spinful': spinful, 'thetaSquare': theta_square,
        'momentumImage': _clean(-k), 'isTrim': is_trim, 'square': _complex(square),
        'squareIsMinusOne': square_minus, 'kramersEligible': is_trim and square_minus,
        'sites': sites, 'symmetryTests': tests,
        'convention': '一维示意模型，以磁性原胞长度为 1，τ=1/2，k 以磁性倒格矢为单位；T(a) 的 Bloch 相位取 exp(−2πika)。',
        'notes': [
            'A=ΘTτ 将 k 送到 −k；A²=Θ²T(2τ)，因此 A²=Θ²exp(−4πikτ)。本模型 τ=1/2。',
            '仅在 k≡−k（模整数），即 k=0 或 1/2（模 1）处，A 才属于该 k 的磁小群。',
            '若 Hamiltonian 具有 A 对称性，且 A 在同一 k 空间内满足 A²=−1，则存在 Kramers 型二重简并；本演示不计算实际能带。',
            'spinful=true 采用自旋 1/2 的 Θ²=−1；false 比较 Θ²=+1 的数学情形，交错箭头此时应理解为抽象时间奇序参量。',
            '这是演示反平移的无限交错链片段，并非三维磁空间群分类或材料拓扑判定。',
        ], 'sources': [_AF_SOURCE],
    }


def run(payload):
    """Run one finite teaching experiment and return JSON-serializable data."""
    if not isinstance(payload, dict):
        raise ValueError('教学实验输入必须是 JSON 对象')
    if payload.get('lab') == 'crystal':
        from crystal_labs import run as crystal_run
        return crystal_run(payload)
    labs = {'seitz': _seitz, 'spinor': _spinor, 'magnetic': _magnetic, 'antiferro': _antiferro}
    lab = _choice(payload.get('lab'), labs, 'lab')
    return labs[lab](payload)
