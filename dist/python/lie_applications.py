"""Bounded SU(2)/SU(3) physics and tensor-product laboratories, stdlib only.

SU(2) uses the finite factorial formula of NIST DLMF 34.2.4 combined
with 34.1.1 (Condon--Shortley convention). Rational prefactors and sums
are kept exact until the final square root. SU(3) weights are integer
Gelfand--Tsetlin pattern row differences for top row (p+q,q,0).
Tensor-product multiplicities are computed by exact character subtraction,
then independently checked with the Weyl determinant character formula.
No SU(3) Clebsch--Gordan change-of-basis coefficients are claimed.
"""
import cmath
from collections import Counter
from fractions import Fraction
from functools import lru_cache
import math


_SOURCES = {
    'rabi': {'title': 'Ethan T. Neil: Graduate Quantum Mechanics, Rabi oscillations and quantum control',
             'url': 'https://etneil.github.io/grad_qm_lec_notes/ex_rabi.html'},
    'cg': {'title': 'NIST DLMF 34.1–34.2: Clebsch–Gordan convention and finite sum',
           'url': 'https://dlmf.nist.gov/34.2'},
    'su3': {'title': 'Vincent Bouchard: Tensor representations of SU(N)',
            'url': 'https://sites.ualberta.ca/~vbouchar/MAPH464/section-representation-sun-tensors.html'},
    'gt': {'title': 'Daniel Bump: Solvable Lattice Models, Gelfand–Tsetlin patterns and Schur characters',
           'url': 'https://sporadic.stanford.edu/solvable/Solvable.pdf'},
    'physics': {'title': 'Hugh Osborn: Group Theory Lecture Notes',
                'url': 'https://www.damtp.cam.ac.uk/user/ho/GNotes.pdf'},
}


def _number(value, low, high, name):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not low <= value <= high or not math.isfinite(value)):
        raise ValueError(f'{name} 必须为 [{low}, {high}] 内的有限数值')
    return float(value)


def _integer(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f'{name} 必须为 [{low}, {high}] 内的整数')
    return value


def _z(value):
    return {'re': float(complex(value).real), 'im': float(complex(value).imag)}


def _half(value):
    return str(value // 2) if value % 2 == 0 else f'{value}/2'


def _common(experiment, group, title):
    return {'lab': 'lie', 'experiment': experiment, 'group': group, 'title': title}


def _rabi(payload):
    omega = _number(payload.get('omega', 1), 0, 10, 'omega')
    delta = _number(payload.get('delta', 0), -10, 10, 'delta')
    time = _number(payload.get('time', math.pi), 0, 20, 'time')
    effective = math.hypot(omega, delta)

    def evolution(t):
        if effective == 0:
            return [1 + 0j, 0j], [[1 + 0j, 0j], [0j, 1 + 0j]]
        c, s = math.cos(effective * t / 2), math.sin(effective * t / 2)
        # U=cos(w t/2)I-i sin(w t/2)(Omega sigma_x+Delta sigma_z)/w.
        up, down = c - 1j * delta / effective * s, -1j * omega / effective * s
        return [up, down], [[up, down], [down, up.conjugate()]]

    def bloch(state):
        overlap = state[0].conjugate() * state[1]
        return [2 * overlap.real, 2 * overlap.imag, abs(state[0]) ** 2 - abs(state[1]) ** 2]

    state, matrix = evolution(time)
    probability = abs(state[1]) ** 2
    maximum = (omega / effective) ** 2 if effective else 0.0
    # Keep at least 32 samples per probability period even at the largest
    # allowed Omega_eff*time. The explicit upper bound also caps JSON size.
    sample_count = min(2001, max(241, math.ceil(effective * time * 32 / (2 * math.pi)) + 1)) if time > 0 else 1
    trajectory = []
    for sample in range(sample_count):
        t = time * sample / max(1, sample_count - 1)
        vector, _ = evolution(t)
        trajectory.append({'time': t, 'probability': abs(vector[1]) ** 2, 'blochVector': bloch(vector)})
    period = 2 * math.pi / effective if omega > 0 and effective else None
    if period is not None and not math.isfinite(period):
        period = None
    result = _common('rabi', 'su2', 'SU(2) 应用：失谐 Rabi 振荡')
    result.update({
        'omega': omega, 'delta': delta, 'time': time, 'omegaEffective': effective,
        'transitionProbability': probability, 'maxTransitionProbability': maximum,
        'state': [_z(z) for z in state], 'matrix': [[_z(z) for z in row] for row in matrix],
        'blochVector': bloch(state), 'trajectory': trajectory, 'sampleCount': len(trajectory),
        'periodProbability': period,
        'checks': {
            'stateNorm': abs(sum(abs(z) ** 2 for z in state) - 1),
            'unitarity': max(abs(sum(matrix[k][i].conjugate() * matrix[k][j] for k in range(2))
                                 - int(i == j)) for i in range(2) for j in range(2)),
            'determinant': abs(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0] - 1),
            'probabilityFormula': abs(probability - maximum * math.sin(effective * time / 2) ** 2),
        },
        'derivation': [
            '取 |↑⟩ 为初态，H_eff/ℏ=(Ωσₓ+Δσ_z)/2；Ω、Δ 用同一角频率单位，t 用其倒数单位。',
            '利用 (Ωσₓ+Δσ_z)²=(Ω²+Δ²)I，令 Ω_eff=√(Ω²+Δ²)，把指数幂分成奇次项与偶次项。',
            '得到 U(t)=cos(Ω_eff t/2)I−i sin(Ω_eff t/2)(Ωσₓ+Δσ_z)/Ω_eff；零场时连续延拓为 I。',
            f'取 |↓⟩ 分量的模平方：P↓=Ω²/(Ω²+Δ²) sin²(Ω_eff t/2)={probability:.6g}。',
            '共振 Δ=0 且 Ω>0 时，t=π/Ω 为 π 脉冲；失谐会使振荡幅度低于 1。',
        ],
        'notes': [
            '这是恒定有效哈密顿量的解析演化。若来自受驱二能级系统，需在适用条件下选旋转坐标系并作旋波近似；模型不含退相干。',
            'Bloch 球表示态的期望值，不直接显示整体相位。概率周期与态矢量恢复周期一般不同。',
            'Ω=0 时初态只有相位演化、布居恒定，概率周期留空；数值范围无法表示的极长周期也留空。',
            '参数范围：0≤Ω≤10，−10≤Δ≤10，0≤t≤20；这里输入角频率，不把数值当作 Hz。',
        ],
        'sources': [_SOURCES['rabi']],
    })
    return result


@lru_cache(maxsize=8192)
def _cg(two_j1, two_m1, two_j2, two_m2, two_j):
    """Return (real coefficient, exact squared coefficient) in CS convention."""
    two_m = two_m1 + two_m2
    if (abs(two_m) > two_j or abs(two_j1 - two_j2) > two_j
            or two_j > two_j1 + two_j2 or (two_j1 + two_j2 - two_j) % 2):
        return 0.0, Fraction(0)
    a = (two_j1 + two_j2 - two_j) // 2
    b = (two_j1 - two_j2 + two_j) // 2
    c = (-two_j1 + two_j2 + two_j) // 2
    d = (two_j1 + two_j2 + two_j) // 2 + 1
    fact = math.factorial
    prefactor_squared = Fraction((two_j + 1) * fact(a) * fact(b) * fact(c), fact(d))
    for n in ((two_j1 + two_m1) // 2, (two_j1 - two_m1) // 2,
              (two_j2 + two_m2) // 2, (two_j2 - two_m2) // 2,
              (two_j + two_m) // 2, (two_j - two_m) // 2):
        prefactor_squared *= fact(n)
    total = Fraction(0)
    for s in range(a + 1):
        factorial_args = (s, a - s, (two_j1 - two_m1) // 2 - s,
                          (two_j2 + two_m2) // 2 - s,
                          (two_j - two_j2 + two_m1) // 2 + s,
                          (two_j - two_j1 - two_m2) // 2 + s)
        if min(factorial_args) >= 0:
            total += Fraction((-1) ** s, math.prod(fact(n) for n in factorial_args))
    squared = prefactor_squared * total * total
    return (math.copysign(math.sqrt(float(squared)), total) if total else 0.0), squared


def _su2_coupling(payload):
    j1 = _integer(payload.get('twoJ1', 1), 0, 6, 'twoJ1')
    j2 = _integer(payload.get('twoJ2', 1), 0, 6, 'twoJ2')
    m1 = _integer(payload.get('twoM1', j1), -j1, j1, 'twoM1')
    m2 = _integer(payload.get('twoM2', -j2), -j2, j2, 'twoM2')
    if (j1 - m1) % 2 or (j2 - m2) % 2:
        raise ValueError('twoM 必须与相应 twoJ 同奇偶，即 m=−j,−j+1,…,j')
    coupling = _number(payload.get('coupling', 1), -10, 10, 'coupling')
    total_m = m1 + m2
    js = list(range(j1 + j2, abs(j1 - j2) - 1, -2))
    product_basis = [(x, y) for x in range(j1, -j1 - 1, -2) for y in range(j2, -j2 - 1, -2)]
    product_index = {pair: index for index, pair in enumerate(product_basis)}
    c1, c2 = j1 * (j1 + 2) / 4, j2 * (j2 + 2) / 4

    def energy(two_j):
        return coupling * (two_j * (two_j + 2) / 4 - c1 - c2) / 2

    # Build every coupled eigenvector, so checks verify the whole basis, not
    # just the selected projection. Dimension is bounded by 7*7=49.
    basis = []
    casimir_residual = 0.0
    for j in js:
        for m in range(j, -j - 1, -2):
            vector = [_cg(j1, x, j2, y, j)[0] if x + y == m else 0.0 for x, y in product_basis]
            applied = [0.0] * len(vector)
            for index, (x, y) in enumerate(product_basis):
                v = vector[index]
                applied[index] += (c1 + c2 + x * y / 2) * v
                for dx in (-2, 2):
                    pair = (x + dx, y - dx)
                    if pair not in product_index:
                        continue
                    if dx == 2:
                        coefficient = math.sqrt((j1 - x) * (j1 + x + 2) * (j2 + y) * (j2 - y + 2)) / 4
                    else:
                        coefficient = math.sqrt((j1 + x) * (j1 - x + 2) * (j2 - y) * (j2 + y + 2)) / 4
                    applied[product_index[pair]] += coefficient * v
            eigenvalue = j * (j + 2) / 4
            casimir_residual = max(casimir_residual, *(abs(a - eigenvalue * v) for a, v in zip(applied, vector)))
            basis.append(vector)
    orthogonality = max(abs(sum(x * y for x, y in zip(left, right)) - int(i == k))
                        for i, left in enumerate(basis) for k, right in enumerate(basis))
    expansion = []
    for j in js:
        if abs(total_m) > j:
            continue
        coefficient, squared = _cg(j1, m1, j2, m2, j)
        terms = []
        for x, y in product_basis:
            if x + y == total_m:
                value, probability = _cg(j1, x, j2, y, j)
                if probability:
                    terms.append({'twoM1': x, 'twoM2': y, 'm1': x / 2, 'm2': y / 2,
                                  'coefficient': value, 'probabilityExact': str(probability)})
        expansion.append({'twoJ': j, 'J': j / 2, 'twoM': total_m, 'M': total_m / 2,
                          'coefficient': coefficient, 'probability': float(squared),
                          'probabilityExact': str(squared), 'energy': energy(j), 'terms': terms})
    dimension = (j1 + 1) * (j2 + 1)
    result = _common('su2_coupling', 'su2', 'SU(2) 直积、Clebsch–Gordan 系数与交换能级')
    result.update({
        'twoJ1': j1, 'twoJ2': j2, 'coupling': coupling, 'dimension': dimension,
        'decompositionText': f'V({_half(j1)}) ⊗ V({_half(j2)}) = ' + ' ⊕ '.join(f'V({_half(j)})' for j in js),
        'decomposition': [{'twoJ': j, 'J': j / 2, 'dimension': j + 1,
                           'casimir': j * (j + 2) / 4, 'energy': energy(j)} for j in js],
        'selected': {'twoM1': m1, 'twoM2': m2, 'twoM': total_m, 'M': total_m / 2,
                     'label': f'|j₁={_half(j1)},m₁={_half(m1)}⟩ ⊗ |j₂={_half(j2)},m₂={_half(m2)}⟩',
                     'expansion': expansion},
        'checks': {'dimension': abs(dimension - sum(j + 1 for j in js)),
                   'orthogonality': orthogonality, 'casimir': casimir_residual,
                   'probability': abs(sum(row['probability'] for row in expansion) - 1)},
        'derivation': [
            f'两个表示的维数为 {j1 + 1} 与 {j2 + 1}，故直积空间有 {dimension} 维。',
            f'允许的总角动量依次为 J=j₁+j₂,…,|j₁−j₂|，这里是 ' + '、'.join(_half(j) for j in js) + '。',
            f'选定乘积态有 M=m₁+m₂={_half(total_m)}，只需保留 J≥|M| 的总角动量态。',
            '用 Condon–Shortley 相位约定计算 C(j₁m₁,j₂m₂|JM)，乘积态在 |JM⟩ 中的展开系数为这些实数。测得 J 的概率是系数平方。',
            '由 J²=S₁²+S₂²+2S₁·S₂，H=κS₁·S₂ 的能量为 E_J=κ[J(J+1)−j₁(j₁+1)−j₂(j₂+1)]/2。',
        ],
        'notes': [
            '采用 ℏ=1，S₁、S₂ 为无量纲角动量，κ 给出能量单位。κ>0 的两自旋 1/2 系统以单重态为最低能态。',
            '固定相位约定使两自旋 1/2 的单重态为 (|↑↓⟩−|↓↑⟩)/√2；改变整条多重态的整体相位不改变概率。',
            '输入 j₁、j₂ 支持 0,1/2,…,3；输出全部总角动量多重态，并验证完整耦合基的正交性与 J² 本征关系。',
        ],
        'sources': [_SOURCES['cg'], _SOURCES['physics']],
    })
    return result


def _dimension(p, q):
    return (p + 1) * (q + 1) * (p + q + 2) // 2


@lru_cache(maxsize=128)
def _weight_items(p, q):
    """SU(3) exact Dynkin-weight multiplicities from interlacing GT rows."""
    weights = Counter()
    # Top row=(p+q,q,0); next=(u,v), last=(w).
    for u in range(q, p + q + 1):
        for v in range(q + 1):
            for w in range(v, u + 1):
                content = (w, u + v - w, p + 2 * q - u - v)
                weights[(content[0] - content[1], content[1] - content[2])] += 1
    return tuple(sorted(weights.items()))


def _weights(p, q):
    return Counter(dict(_weight_items(p, q)))


def _weight_rows(weights):
    return [{'dynkin': [a, b], 'cartan': [a / 2, (a + 2 * b) / (2 * math.sqrt(3))], 'multiplicity': n}
            for (a, b), n in sorted(weights.items(), key=lambda entry: (-sum(entry[0]), -entry[0][0])) if n]


def _rep_label(p, q):
    names = {(0, 0): '1', (1, 0): '3', (0, 1): '3̄', (2, 0): '6',
             (0, 2): '6̄', (1, 1): '8', (3, 0): '10', (0, 3): '10̄', (2, 2): '27'}
    return f'{names.get((p, q), str(_dimension(p, q)))} ({p},{q})'


def _representation(p, q):
    return {'p': p, 'q': q, 'label': _rep_label(p, q), 'dimension': _dimension(p, q),
            'casimir': (p * p + q * q + p * q + 3 * p + 3 * q) / 3,
            'weights': _weight_rows(_weights(p, q))}


def _det3(rows):
    a, b, c = rows
    return (a[0] * (b[1] * c[2] - b[2] * c[1])
            - a[1] * (b[0] * c[2] - b[2] * c[0])
            + a[2] * (b[0] * c[1] - b[1] * c[0]))


def _weyl_character(p, q, phases):
    """Independent Weyl/Schur determinant on a regular determinant-one torus."""
    x = [cmath.exp(1j * phase) for phase in (phases[0], phases[1], -sum(phases))]
    numerator = _det3([[z ** (p + q + 2), z ** (q + 1), 1] for z in x])
    denominator = _det3([[z ** 2, z, 1] for z in x])
    return numerator / denominator


def _su3_tensor(payload):
    labels = []
    for index, default in ((1, (1, 0)), (2, (0, 1))):
        p = _integer(payload.get(f'p{index}', default[0]), 0, 4, f'p{index}')
        q = _integer(payload.get(f'q{index}', default[1]), 0, 4, f'q{index}')
        if p + q > 4:
            raise ValueError(f'第 {index} 个表示要求 p+q≤4（单个维数≤27）')
        labels.append((p, q))
    left, right = [_weights(*label) for label in labels]
    tensor = Counter()
    for (a, b), multiplicity in left.items():
        for (c, d), count in right.items():
            tensor[(a + c, b + d)] += multiplicity * count
    remaining = tensor.copy()
    decomposition, steps = [], []
    reconstructed = Counter()
    while remaining:
        # Both simple roots have Dynkin coordinate sum 1. Maximal a+b
        # therefore identifies an unremoved highest weight; a breaks ties.
        candidates = [weight for weight, count in remaining.items() if count > 0 and min(weight) >= 0]
        if not candidates:
            raise ArithmeticError('SU(3) 权字符不能继续分解：缺少占优最高权')
        p, q = max(candidates, key=lambda weight: (sum(weight), weight[0]))
        multiplicity = remaining[(p, q)]
        irreducible = _weights(p, q)
        for weight, count in irreducible.items():
            remaining[weight] -= multiplicity * count
            reconstructed[weight] += multiplicity * count
            if remaining[weight] < 0:
                raise ArithmeticError('SU(3) 最高权相减产生负的权重数')
        remaining = +remaining
        representation = _representation(p, q)
        representation['multiplicity'] = multiplicity
        decomposition.append(representation)
        steps.append({'p': p, 'q': q, 'label': representation['label'],
                      'multiplicity': multiplicity, 'remainingDimension': sum(remaining.values())})
    factors = [_representation(*label) for label in labels]
    dimension = factors[0]['dimension'] * factors[1]['dimension']
    character_residual = 0.0
    for phases in ((0.37, 1.11), (0.21, -0.87), (1.29, 0.43)):
        product = _weyl_character(*labels[0], phases) * _weyl_character(*labels[1], phases)
        reduced = sum(row['multiplicity'] * _weyl_character(row['p'], row['q'], phases) for row in decomposition)
        character_residual = max(character_residual, abs(product - reduced))
    decomposition_text = ' ⊕ '.join((f"{row['multiplicity']} × " if row['multiplicity'] > 1 else '') + row['label'] for row in decomposition)
    result = _common('su3_tensor', 'su3', 'SU(3) 表示、权图与直积分解')
    result.update({
        'factors': factors, 'dimension': dimension, 'decomposition': decomposition,
        'decompositionText': f"{factors[0]['label']} ⊗ {factors[1]['label']} = {decomposition_text}",
        'tensorWeights': _weight_rows(tensor), 'steps': steps,
        'checks': {'dimension': abs(dimension - sum(row['multiplicity'] * row['dimension'] for row in decomposition)),
                   'weightMultiplicity': max(abs(tensor[weight] - reconstructed[weight]) for weight in tensor.keys() | reconstructed.keys()),
                   'character': character_residual},
        'derivation': [
            '用最高权 Dynkin 标签 (p,q) 指定不可约表示：d=(p+1)(q+1)(p+q+2)/2。维数相同不一定表示等价。',
            '枚举顶行 (p+q,q,0) 的 Gelfand–Tsetlin 整数交错图；相邻行和之差给出三个内容数，其差给出 Dynkin 权 (a,b)。',
            '直积中两因子的权逐对相加，重数相乘并累加；同一个权位置可代表多个线性无关态。',
            '从剩余字符选取占优最高权，减去相应完整不可约权字符。循环至所有权重数为零，即得到含重复表示的直和。',
            '把每项的维数乘以外重数后相加，并用独立的 Weyl 行列式字符公式检查结果；C₂(p,q)=(p²+q²+pq+3p+3q)/3。',
        ],
        'notes': [
            '坐标采用 T₃=λ₃/2、T₈=λ₈/2：权 (a,b) 显示为 (a/2,(a+2b)/(2√3))；权图不是粒子的实空间位置。',
            '这里输出不可约表示与外重数，以及每个权空间的内重数；不输出 SU(3) Clebsch–Gordan 换基系数。',
            '每个因子支持非负整数 p,q 且 p+q≤4（最大 27 维），总维数至多 729。输出最高权可超过输入上限。',
            '色 SU(3) 与近似味 SU(3) 共享表示论，但代表不同物理对称性；本分解不自动给出粒子质量或强子能谱。',
        ],
        'sources': [_SOURCES['su3'], _SOURCES['gt'], _SOURCES['physics']],
    })
    return result


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError('李群应用实验的输入必须为 JSON 对象')
    if len(payload) > 8 or payload.get('lab') != 'lie':
        raise ValueError('李群应用实验要求 lab="lie"，输入字段不得超过 8 个')
    experiment = payload.get('experiment')
    allowed = {
        'rabi': {'lab', 'experiment', 'omega', 'delta', 'time'},
        'su2_coupling': {'lab', 'experiment', 'twoJ1', 'twoJ2', 'twoM1', 'twoM2', 'coupling'},
        'su3_tensor': {'lab', 'experiment', 'p1', 'q1', 'p2', 'q2'},
    }
    if not isinstance(experiment, str) or experiment not in allowed:
        raise ValueError('experiment 必须为 rabi、su2_coupling 或 su3_tensor')
    if set(payload) - allowed[experiment]:
        raise ValueError('存在该李群应用实验不支持的输入字段')
    if experiment == 'rabi':
        return _rabi(payload)
    if experiment == 'su2_coupling':
        return _su2_coupling(payload)
    if experiment == 'su3_tensor':
        return _su3_tensor(payload)
