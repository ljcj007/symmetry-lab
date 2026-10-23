"""Finite-dimensional SU(2)/SU(3) classroom experiments, standard library only.

We use Hermitian physics generators T=Pauli/2 or Gell-Mann/2, with
tr(T_a T_b)=delta_ab/2 and U(theta)=exp(-i theta T). Thus -i T, not T,
belongs to the usual anti-Hermitian mathematical Lie algebra. The chosen
single-generator exponentials below are analytic; no matrix exponential
approximation or untrusted expression evaluation is used.
"""
import cmath
import math


_PAULI = (
    ((0, 1), (1, 0)),
    ((0, -1j), (1j, 0)),
    ((1, 0), (0, -1)),
)
_GELLMANN = (
    ((0, 1, 0), (1, 0, 0), (0, 0, 0)),
    ((0, -1j, 0), (1j, 0, 0), (0, 0, 0)),
    ((1, 0, 0), (0, -1, 0), (0, 0, 0)),
    ((0, 0, 1), (0, 0, 0), (1, 0, 0)),
    ((0, 0, -1j), (0, 0, 0), (1j, 0, 0)),
    ((0, 0, 0), (0, 0, 1), (0, 1, 0)),
    ((0, 0, 0), (0, 0, -1j), (0, 1j, 0)),
    ((1 / math.sqrt(3), 0, 0), (0, 1 / math.sqrt(3), 0),
     (0, 0, -2 / math.sqrt(3))),
)
_SOURCE = {
    'title': 'Stefan Floerchinger: Quantum field theory 1, lecture 02',
    'url': 'https://www.tpi.uni-jena.de/~floerchinger/qft1/lecture02/',
}


def _choice(value, choices, name):
    if not isinstance(value, str) or len(value) > 16 or value not in choices:
        raise ValueError(name + ' 必须为 ' + '、'.join(choices))
    return value


def _index(value, maximum, name):
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= maximum:
        raise ValueError(name + ' 必须为 1 到 ' + str(maximum) + ' 的整数')
    return value


def _angle(value):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not -8 * math.pi <= value <= 8 * math.pi or not math.isfinite(value)):
        raise ValueError('angle 必须为 [−8π, 8π] 内的有限弧度数')
    return float(value)


def _mm(left, right):
    return [[sum(a * b for a, b in zip(row, column)) for column in zip(*right)]
            for row in left]


def _adjoint(matrix):
    return [[complex(x).conjugate() for x in column] for column in zip(*matrix)]


def _trace(matrix):
    return sum(matrix[i][i] for i in range(len(matrix)))


def _subtract(left, right):
    return [[a - b for a, b in zip(x, y)] for x, y in zip(left, right)]


def _max_abs(matrix):
    return max(abs(x) for row in matrix for x in row)


def _identity(n):
    return [[int(i == j) for j in range(n)] for i in range(n)]


def _determinant(matrix):
    # Exact-size polynomial formulas avoid pivot-dependent division.
    if len(matrix) == 2:
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
    a, b, c = matrix
    return (a[0] * (b[1] * c[2] - b[2] * c[1])
            - a[1] * (b[0] * c[2] - b[2] * c[0])
            + a[2] * (b[0] * c[1] - b[1] * c[0]))


def _clean(value):
    value = float(value)
    return 0.0 if abs(value) < 1e-14 else value


def _complex(value):
    value = complex(value)
    return {'re': _clean(value.real), 'im': _clean(value.imag)}


def _matrix(matrix):
    return [[_complex(x) for x in row] for row in matrix]


def _basis(group):
    return [[[x / 2 for x in row] for row in matrix]
            for matrix in (_PAULI if group == 'su2' else _GELLMANN)]


def _common(group, experiment):
    return {
        'lab': 'lie', 'experiment': experiment, 'group': group,
        'dimension': 2 if group == 'su2' else 3,
        'realDimension': 3 if group == 'su2' else 8,
        'rank': 1 if group == 'su2' else 2,
        'generatorConvention': (
            '采用厄米生成元 Tₐ=σₐ/2，tr(TₐTᵦ)=δₐᵦ/2。'
            if group == 'su2' else
            '采用标准 Gell-Mann 厄米生成元 Tₐ=λₐ/2，tr(TₐTᵦ)=δₐᵦ/2。'
        ) + 'U(θ)=exp(−iθT)；θ 为弧度；数学上 su(n) 的反厄米生成元为 −iT。',
        'sources': [_SOURCE],
    }


def _rotation(payload, group):
    n = 2 if group == 'su2' else 3
    angle = _angle(payload.get('angle', 0))
    if group == 'su2':
        axis = _choice(payload.get('axis', 'z'), ('x', 'y', 'z'), 'axis')
        generator = ('x', 'y', 'z').index(axis) + 1
        initial = _choice(payload.get('state', 'up'), ('up', 'plus'), 'state')
        state = [1, 0] if initial == 'up' else [1 / math.sqrt(2)] * 2
        state_label = '|↑⟩ = (1,0)ᵀ' if initial == 'up' else '|+⟩ = (1,1)ᵀ/√2'
        base = _PAULI[generator - 1]
        label = 'T' + str(generator) + '=σ' + axis + '/2'
    else:
        generator = _index(payload.get('generator', 1), 8, 'generator')
        initial = _index(payload.get('state', 1), 3, 'state')
        state = [int(i == initial - 1) for i in range(3)]
        state_label = '|e' + str(initial) + '⟩'
        base = _GELLMANN[generator - 1]
        label = 'T' + str(generator) + '=λ' + str(generator) + '/2'

    if group == 'su3' and generator == 8:
        matrix = [[cmath.exp(-1j * angle * base[i][i] / 2) if i == j else 0
                   for j in range(n)] for i in range(n)]
        period = 4 * math.pi * math.sqrt(3)
        period_note = 'T₈ 的本征值为 (1,1,−2)/(2√3)，因此此单参矩阵的最小正周期为 4π√3；θ=4π√3/3 时为非平凡中心元 exp(−2πi/3)I₃。'
    else:
        square = _mm(base, base)
        c, s = math.cos(angle / 2), math.sin(angle / 2)
        # For Pauli matrices square=I; for lambda_1..lambda_7 it is the
        # projector onto their active two-dimensional subspace.
        matrix = [[int(i == j) + (c - 1) * square[i][j] - 1j * s * base[i][j]
                   for j in range(n)] for i in range(n)]
        period = 4 * math.pi
        period_note = ('此单参矩阵的最小正周期为 4π；2π 时 U=−I₂，Bloch 向量已复原而旋量反号。'
                       if group == 'su2' else
                       'T₁…T₇ 的本征值为 1/2、−1/2、0，此单参矩阵的最小正周期为 4π；2π 一般不是 SU(3) 的中心元。')

    transformed = [sum(a * b for a, b in zip(row, state)) for row in matrix]
    probabilities = [abs(x) ** 2 for x in transformed]
    determinant = _determinant(matrix)
    result = _common(group, group)
    result.update({
        'title': ('SU(2) 旋量与 Bloch 向量' if group == 'su2' else 'SU(3) 基本表示与三态变换'),
        'angle': angle, 'anglePi': angle / math.pi, 'generator': generator,
        'generatorLabel': label,
        'generatorMatrix': _matrix(_basis(group)[generator - 1]),
        'matrix': _matrix(matrix), 'initialState': [_complex(x) for x in state],
        'state': [_complex(x) for x in transformed], 'stateLabel': state_label,
        'probabilities': [_clean(x) for x in probabilities],
        'stateNorm': math.sqrt(sum(probabilities)), 'determinant': _complex(determinant),
        'residuals': {
            'norm': abs(sum(probabilities) - 1),
            'unitarity': _max_abs(_subtract(_mm(_adjoint(matrix), matrix), _identity(n))),
            'determinant': abs(determinant - 1),
        },
        'overlap': _complex(sum(complex(x).conjugate() * y for x, y in zip(state, transformed))),
        'period': period, 'periodExplanation': period_note,
        'notes': [
            '使用基本表示和选定的单个生成元；不把一个滑块当作整个多参数李群。',
            '列向量按 |ψ′⟩=U|ψ⟩ 变换；概率为各复振幅的模平方。整体相位不改变此基下的概率。',
            '数值残差由未清零的内部复数计算；矩阵显示中小于 10⁻¹⁴ 的实部或虚部显示为 0。',
        ],
    })
    if group == 'su2':
        a, b = transformed
        result['axis'] = axis
        result['blochVector'] = [_clean(2 * (a.conjugate() * b).real),
                                 _clean(2 * (a.conjugate() * b).imag),
                                 _clean(abs(a) ** 2 - abs(b) ** 2)]
        result['notes'].append('Bloch 向量按所选轴右手主动旋转；2π 后 Bloch 向量相同，但 U 与 −U 是不同的 SU(2) 元素。')
    else:
        weights = [[0.5, 1 / (2 * math.sqrt(3))],
                   [-0.5, 1 / (2 * math.sqrt(3))], [0, -1 / math.sqrt(3)]]
        result['cartanWeights'] = [{'label': 'e' + str(i + 1), 'weight': weight}
                                   for i, weight in enumerate(weights)]
        result['cartanExpectation'] = [_clean(sum(p * weight[k] for p, weight in zip(probabilities, weights)))
                                       for k in range(2)]
        result['notes'].append('三个权重点是基本表示中共同本征态的 (T₃,T₈) 本征值；一般叠加态的期望点不是新增权。SU(3) 参数不普遍具有空间转角的意义。')
    return result


def _commutator(payload):
    group = _choice(payload.get('group', 'su2'), ('su2', 'su3'), 'group')
    basis = _basis(group)
    a = _index(payload.get('a', 1), len(basis), 'a')
    b = _index(payload.get('b', 2), len(basis), 'b')
    left, right = basis[a - 1], basis[b - 1]
    commutator = _subtract(_mm(left, right), _mm(right, left))
    coefficients = [-2j * _trace(_mm(commutator, t)) for t in basis]
    n = len(left)
    reconstructed = [[1j * sum(c.real * t[i][j] for c, t in zip(coefficients, basis))
                      for j in range(n)] for i in range(n)]
    terms = [{'generator': k + 1, 'coefficient': _clean(c.real), 'label': 'T' + str(k + 1)}
             for k, c in enumerate(coefficients) if abs(c.real) > 1e-14]
    expansion = '[T' + str(a) + ', T' + str(b) + '] = '
    expansion += ('i (' + ' + '.join(format(t['coefficient'], '.8g') + ' T' + str(t['generator'])
                                     for t in terms) + ')') if terms else '0'
    anti_hermitian = [[commutator[i][j] + _adjoint(commutator)[i][j]
                       for j in range(n)] for i in range(n)]
    result = _common(group, 'commutator')
    result.update({
        'title': ('SU(2)' if group == 'su2' else 'SU(3)') + ' 生成元对易子',
        'a': a, 'b': b, 'generatorA': _matrix(left), 'generatorB': _matrix(right),
        'commutator': _matrix(commutator), 'coefficients': [_clean(c.real) for c in coefficients],
        'nonzeroTerms': terms, 'expansion': expansion,
        'commutatorNorm': math.sqrt(sum(abs(x) ** 2 for row in commutator for x in row)),
        'residuals': {
            'closure': _max_abs(_subtract(commutator, reconstructed)),
            'antiHermitian': _max_abs(anti_hermitian),
            'coefficientImaginary': max(abs(c.imag) for c in coefficients),
        },
        'notes': [
            '按 [Tₐ,Tᵦ]=TₐTᵦ−TᵦTₐ 计算，右端写作 i∑cₖTₖ；交换 a、b 后系数反号。',
            '由 tr(TₖTₗ)=δₖₗ/2 得 cₖ=−2i tr([Tₐ,Tᵦ]Tₖ)。非零系数是本约定下的结构常数。',
            '厄米生成元的对易子是反厄米矩阵；−i[Tₐ,Tᵦ] 才是厄米生成元的实线性组合。',
            '本实验检查选定生成元的李代数闭合关系；并非任意有限转动交换子的数值模拟。',
        ],
    })
    return result


def run(payload):
    """Validate a small flat JSON object and return JSON-safe teaching data."""
    if not isinstance(payload, dict) or len(payload) > 8:
        raise ValueError('输入必须是最多 8 个字段的 JSON 对象')
    if payload.get('lab') != 'lie':
        raise ValueError('lab 必须为 lie')
    experiment = _choice(payload.get('experiment', 'su2'), ('su2', 'su3', 'commutator'), 'experiment')
    allowed = {'lab', 'experiment'} | {
        'su2': {'axis', 'angle', 'state'},
        'su3': {'generator', 'angle', 'state'},
        'commutator': {'group', 'a', 'b'},
    }[experiment]
    if any(key not in allowed for key in payload):
        raise ValueError('输入包含该实验不支持的字段')
    return _commutator(payload) if experiment == 'commutator' else _rotation(payload, experiment)
