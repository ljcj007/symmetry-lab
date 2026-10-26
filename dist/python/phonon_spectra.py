"""Exact Gamma mechanical representations for three two-atom fcc models.

The displacement character is computed from the actual motif permutation,
not selected from a lookup table. Character reduction uses integer cubic
character tables. All algebra is standard-library rational/integer arithmetic;
angles, animation and an explicitly assumed Lorentzian line are numerical.
This module does not infer arbitrary structures or calculate force constants.
"""
from fractions import Fraction
from itertools import permutations, product
import math


_F = Fraction
_CELL = [[0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]
_PRESETS = {
    'silicon': {'name': 'Si · 金刚石结构', 'species': ['Si', 'Si'],
                'd': [_F(1, 4)] * 3, 'sg': 227, 'symbol': 'Fd-3m',
                'pointGroup': 'Oh', 'pointSymbol': 'm-3m'},
    'gaas': {'name': 'GaAs · 闪锌矿结构', 'species': ['Ga', 'As'],
             'd': [_F(1, 4)] * 3, 'sg': 216, 'symbol': 'F-43m',
             'pointGroup': 'Td', 'pointSymbol': '-43m'},
    'nacl': {'name': 'NaCl · 岩盐结构', 'species': ['Na', 'Cl'],
             'd': [_F(1, 2)] * 3, 'sg': 225, 'symbol': 'Fm-3m',
             'pointGroup': 'Oh', 'pointSymbol': 'm-3m'},
}
_OH_CLASSES = ['E', '8C3', '6C2(edge)', '6C4', '3C2(axis)',
               'i', '8S6', '6sigma(d)', '6S4', '3sigma(h)']
_TD_CLASSES = ['E', '8C3', '3C2', '6S4', '6sigma(d)']
_O_CHARS = {'A1': [1, 1, 1, 1, 1], 'A2': [1, 1, -1, -1, 1],
            'E': [2, -1, 0, 0, 2], 'T1': [3, 0, -1, 1, -1],
            'T2': [3, 0, 1, -1, -1]}
_TD_CHARS = {'A1': [1, 1, 1, 1, 1], 'A2': [1, 1, 1, -1, -1],
             'E': [2, -1, 2, 0, 0], 'T1': [3, 0, -1, 1, -1],
             'T2': [3, 0, -1, -1, 1]}
_RAMAN = [
    [[0, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 0, 1], [0, 0, 0], [1, 0, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 0]],
]
_SOURCES = [
    {'title': 'Bilbao SAM：对称适应振动与选择定则',
     'url': 'https://cryst.ehu.es/rep/sam_help.html'},
    {'title': 'AFLOW：Diamond (A4) structure',
     'url': 'https://aflow.org/p/A_cF8_227_a-001/'},
    {'title': 'AFLOW：Zincblende (B3) structure',
     'url': 'https://aflow.org/p/AB_cF8_216_a_c-001/'},
    {'title': 'AFLOW：Rock Salt/Halite (B1) structure',
     'url': 'https://aflow.org/p/AB_cF8_225_a_b-001/'},
    {'title': 'Paukatong et al.：diamond / zinc-blende polarized Raman tensors',
     'url': 'https://doi.org/10.1002/jrs.70113'},
]


def _number(payload, key, default, lower, upper):
    value = payload.get(key, default)
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value) or not lower <= value <= upper):
        raise ValueError(f'{key} 必须为 {lower} 至 {upper} 范围内的有限实数')
    return float(value)


def _choice(payload, key, default, options):
    value = payload.get(key, default)
    if not isinstance(value, str) or value not in options:
        raise ValueError(key + ' 必须为 ' + ' / '.join(options))
    return value


def _mv(matrix, vector):
    return [sum(row[j] * vector[j] for j in range(3)) for row in matrix]


def _mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _trace(matrix):
    return sum(matrix[i][i] for i in range(3))


def _det(a):
    return (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
            - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
            + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))


def _primitive(vector):
    x, y, z = vector
    return [-x + y + z, x - y + z, x + y - z]


def _same_fcc(a, b):
    return all(_F(value).denominator == 1 for value in _primitive([a[i] - b[i] for i in range(3)]))


def _class_index(rotation, point_group):
    determinant = _det(rotation)
    if point_group == 'Td':
        if determinant == 1:
            return {3: 0, 0: 1, -1: 2}[_trace(rotation)]
        return {-1: 3, 1: 4}[_trace(rotation)]
    proper = [[determinant * x for x in row] for row in rotation]
    trace = _trace(proper)
    if trace == 3:
        index = 0
    elif trace == 0:
        index = 1
    elif trace == 1:
        index = 3
    else:
        index = 4 if all(proper[i][j] == 0 for i in range(3) for j in range(3) if i != j) else 2
    return index + (5 if determinant == -1 else 0)


def _operations(model):
    positions = [[_F(0)] * 3, model['d']]
    result = []
    for permutation in permutations(range(3)):
        for signs in product((1, -1), repeat=3):
            rotation = [[signs[i] if j == permutation[i] else 0 for j in range(3)] for i in range(3)]
            translations = [[_F(0)] * 3]
            if model['species'][0] == model['species'][1]:
                translations.append(model['d'])
            for translation in translations:
                mapping = []
                for atom, position in enumerate(positions):
                    rotated = _mv(rotation, position)
                    transformed = [rotated[i] + translation[i] for i in range(3)]
                    matches = [j for j in range(2) if model['species'][j] == model['species'][atom]
                               and _same_fcc(transformed, positions[j])]
                    if len(matches) != 1:
                        break
                    mapping.append(matches[0])
                if len(mapping) != 2 or len(set(mapping)) != 2:
                    continue
                fixed = sum(i == j for i, j in enumerate(mapping))
                vector_character = _trace(rotation)
                # D_(j,b),(i,a) = R_(b,a) when g maps atom i to atom j.
                displacement_matrix = [[0] * 6 for _ in range(6)]
                for i, j in enumerate(mapping):
                    for a in range(3):
                        for b in range(3):
                            displacement_matrix[3 * j + b][3 * i + a] = rotation[b][a]
                result.append({
                    'rotation': rotation, 'translationExact': [str(x) for x in translation],
                    'translation': [float(x) for x in translation], 'permutation': mapping,
                    'fixedAtoms': fixed, 'classIndex': _class_index(rotation, model['pointGroup']),
                    'mechanical': fixed * vector_character, 'acoustic': vector_character,
                    'optical': (fixed - 1) * vector_character, 'vector': vector_character,
                    'symmetricSquare': (vector_character ** 2 + _trace(_mm(rotation, rotation))) // 2,
                    'displacementMatrix': displacement_matrix,
                })
                break
    return result


def _table(point_group):
    if point_group == 'Td':
        return _TD_CHARS
    return {label + parity: row + [sign * x for x in row]
            for parity, sign in [('g', 1), ('u', -1)] for label, row in _O_CHARS.items()}


def _reduce(classes, characters, key):
    order = sum(row['size'] for row in classes)
    values = {}
    for label, row in characters.items():
        value = sum(item['size'] * item[key] * row[i] for i, item in enumerate(classes))
        if value % order or value < 0:
            raise ArithmeticError('机械表示的特征标约化未通过整数性检查')
        values[label] = value // order
    return values


def _formula(rows):
    return ' + '.join(('' if row['multiplicity'] == 1 else str(row['multiplicity'])) + row['irrep'] for row in rows) or '0'


def _intensities(angle, polarization, selected, modes):
    radians = math.radians(angle)
    incident = [math.cos(radians), math.sin(radians), 0.0]
    scattered = incident[:] if polarization == 'parallel' else [-incident[1], incident[0], 0.0]
    indices = range(3) if selected == 'sum' else [['x', 'y', 'z'].index(selected)]
    raman = 0.0
    infrared = 0.0
    for index in indices:
        mode = modes[index]
        response = _mv(mode['ramanTensor'], incident)
        raman += sum(scattered[i] * response[i] for i in range(3)) ** 2
        if mode['ir']:
            infrared += incident[index] ** 2
    return incident, scattered, raman, infrared


def run_phonons(payload):
    """Return JSON-ready exact group analysis and clearly labeled model plots."""
    if not isinstance(payload, dict):
        raise ValueError('声子光谱输入必须是 JSON 对象')
    preset = _choice(payload, 'preset', 'silicon', _PRESETS)
    model = _PRESETS[preset]
    angle = _number(payload, 'angle', 0, -360, 360)
    polarization = _choice(payload, 'polarization', 'parallel', ('parallel', 'crossed'))
    selected = _choice(payload, 'mode', 'z', ('x', 'y', 'z', 'sum'))
    channel = _choice(payload, 'channel', 'raman', ('raman', 'ir'))
    amplitude = _number(payload, 'amplitude', 0.08, 0, 0.3)
    frequency = _number(payload, 'frequency_cm1', 300, 10, 4000)
    width = _number(payload, 'width_cm1', 20, 0.1, 500)
    steps = payload.get('steps', 32)
    if isinstance(steps, bool) or not isinstance(steps, int) or not 8 <= steps <= 120:
        raise ValueError('steps 必须是 8 至 120 范围内的整数')
    operations = _operations(model)
    labels = _TD_CLASSES if model['pointGroup'] == 'Td' else _OH_CLASSES
    classes = []
    for i, label in enumerate(labels):
        members = [op for op in operations if op['classIndex'] == i]
        row = {'label': label, 'size': len(members), 'fixedAtoms': members[0]['fixedAtoms']}
        for key in ('mechanical', 'acoustic', 'optical', 'vector', 'symmetricSquare'):
            values = {op[key] for op in members}
            if len(values) != 1:
                raise ArithmeticError('同一共轭类出现不同特征标')
            row[key] = values.pop()
        classes.append(row)
    characters = _table(model['pointGroup'])
    reduced = {key: _reduce(classes, characters, key)
               for key in ('mechanical', 'acoustic', 'optical', 'vector', 'symmetricSquare')}
    decomposition = {key: [
        {'irrep': irrep, 'multiplicity': value, 'dimension': characters[irrep][0],
         'ir': bool(reduced['vector'][irrep]), 'raman': bool(reduced['symmetricSquare'][irrep])}
        for irrep, value in reduced[key].items() if value]
        for key in ('mechanical', 'acoustic', 'optical', 'vector', 'symmetricSquare')}
    optical = decomposition['optical'][0]
    modes = []
    for i, axis in enumerate(('x', 'y', 'z')):
        direction = [int(j == i) for j in range(3)]
        modes.append({'id': axis, 'label': axis + ' 型相对位移', 'irrep': optical['irrep'],
                      'displacements': [direction, [-x for x in direction]],
                      'ramanTensor': _RAMAN[i] if optical['raman'] else [[0] * 3 for _ in range(3)],
                      'irDipole': direction if optical['ir'] else [0, 0, 0],
                      'ir': optical['ir'], 'raman': optical['raman']})
    sites = [{'id': str(i), 'species': model['species'][i],
              'fractional': [float(x) for x in _primitive(position)],
              'fractionalExact': [str(x) for x in _primitive(position)],
              'cartesian': [float(x) for x in position]}
             for i, position in enumerate([[_F(0)] * 3, model['d']])]
    animated_mode = 'z' if selected == 'sum' else selected
    displacement = modes[['x', 'y', 'z'].index(animated_mode)]['displacements']
    frames = []
    for step in range(steps + 1):
        phase = 2 * math.pi * step / steps
        frames.append({'phase': phase, 'sites': [
            {'id': site['id'], 'species': site['species'],
             'cartesian': [site['cartesian'][j] + amplitude * math.sin(phase) * displacement[i][j]
                           for j in range(3)]} for i, site in enumerate(sites)]})
    incident, scattered, raman, infrared = _intensities(angle, polarization, selected, modes)
    intensity = raman if channel == 'raman' else infrared
    pattern = []
    for degrees in range(0, 361, 3):
        _, _, rr, ii = _intensities(degrees, polarization, selected, modes)
        pattern.append({'angle': degrees, 'raman': rr, 'ir': ii,
                        'intensity': rr if channel == 'raman' else ii})
    peak_points = sorted(set([2 * frequency * i / 200 for i in range(201)] + [frequency - width / 2, frequency + width / 2]))
    spectrum = [{'wavenumber': x, 'intensity': intensity / (1 + 4 * ((x - frequency) / width) ** 2)}
                for x in peak_points if x >= 0]
    vertex_codes = list(product((0, 1), repeat=3))
    vertices = [_mv(_CELL, code) for code in vertex_codes]
    edges = [[i, j] for i, a in enumerate(vertex_codes) for j, b in enumerate(vertex_codes)
             if i < j and sum(abs(a[k] - b[k]) for k in range(3)) == 1]
    formulas = {key: _formula(value) for key, value in decomposition.items()}
    dimensions = {key: sum(row['multiplicity'] * row['dimension'] for row in value)
                  for key, value in decomposition.items()}
    return {
        'lab': 'phonons', 'preset': preset, 'exact': True,
        'exactScope': '整数/有理数的群操作、位点置换、特征标与约化；三角函数、动画与假设谱线使用浮点数。',
        'material': {'id': preset, 'name': model['name'], 'spaceGroupNumber': model['sg'],
                     'spaceGroupSymbol': model['symbol'], 'primitiveAtoms': 2},
        'presets': [{'id': key, 'name': value['name']} for key, value in _PRESETS.items()],
        'group': {'symbol': model['pointGroup'], 'hm': model['pointSymbol'], 'order': len(operations),
                  'quotientBy': '三维 fcc 平移子群；Gamma 点平移相位为 1',
                  'finiteFullGroup': False},
        'classes': classes, 'characterTable': [{'irrep': key, 'characters': value} for key, value in characters.items()],
        'operations': operations, 'decomposition': decomposition, 'formulas': formulas,
        'dimensions': dimensions, 'modes': modes, 'selectedMode': selected,
        'animatedMode': animated_mode, 'sites': sites, 'cell': _CELL,
        'cellConvention': '列为 fcc 原胞基矢，笛卡尔坐标单位为常规立方晶格常数 a；此处不指定实际 a。',
        'cellVertices': vertices, 'cellEdges': edges, 'frames': frames,
        'polarization': {'angle': angle, 'geometry': '入射/分析偏振在晶体 Cartesian xy 平面；线偏振，(001) 几何',
                         'incident': incident, 'scattered': scattered, 'polarization': polarization,
                         'channel': channel, 'intensity': intensity, 'ramanIntensity': raman,
                         'irIntensity': infrared, 'pattern': pattern,
                         'ramanFormula': 'I = sum_mu |e_s^T R_mu e_i|^2；选单个基时仅一项',
                         'irFormula': 'I_IR = sum_mu |e_i · p_mu|^2；无出射分析器因子',
                         'normalization': '非零 Raman 张量元 d=1、IR 有效偶极导数=1，等权非相干求和；任意相对单位。'},
        'spectrum': {'model': '用户假设的 Lorentzian 单线示意', 'assumedFrequencyCm1': frequency,
                     'fwhmCm1': width, 'predictedFrequency': False, 'absoluteIntensity': False,
                     'points': spectrum, 'formula': 'I(w)=I_pol/[1+4((w-w0)/FWHM)^2]',
                     'note': '默认中心 300 cm^-1 与宽度 20 cm^-1 对所有预设相同，仅为绘图参数；不是这些材料的实测或计算声子频率。'},
        'derivation': [
            {'title': '数原胞自由度', 'formula': 'N=2; dim(Gamma_mech)=3N=6',
             'explanation': '使用 fcc 原胞的两个基元。常规立方胞含四个原胞，不能将其 24 个位移自由度直接当作原胞 Gamma 模。'},
            {'title': '从真实位点置换构造表示', 'formula': 'D(g)=P(g) tensor R(g); chi_mech(g)=N_fixed(g) tr R(g)',
             'explanation': '对各个立方笛卡尔操作寻找保持化学占位的平移，并模 fcc 晶格逐原子匹配。只有映回自身的原子贡献迹。'},
            {'title': '按共轭类精确约化', 'formula': 'n_alpha=(1/|G|) sum_C |C| chi_alpha(C)* chi_mech(C)',
             'explanation': '本次得到 Gamma_mech = ' + formulas['mechanical'] + '。乘法、求和与整除均为精确整数计算。'},
            {'title': '扣除整体平移', 'formula': 'Gamma_opt = Gamma_mech - Gamma_vector = ' + formulas['optical'],
             'explanation': '三条声学支在 Gamma 点对应整体平移。周期晶体扣除 3 个声学自由度，不套用分子 3N-6。'},
            {'title': '检验电偶极 IR 与普通一阶 Raman', 'formula': 'IR: Gamma_vector; Raman: Sym^2(Gamma_vector)',
             'explanation': '极矢量表示为 ' + formulas['vector'] + '；对称二阶张量表示为 ' + formulas['symmetricSquare'] + '。允许表示只决定耦合可存在，不给出其数值。'},
            {'title': '将选择定则转成可检验的偏振曲线', 'formula': 'R_z=[[0,d,0],[d,0,0],[0,0,0]]; I_parallel=d^2 sin^2(2 theta)',
             'explanation': '对允许的 z 型 Raman 基，交叉通道为 d^2 cos^2(2 theta)。禁戒通道张量取零；谱线中心与宽度需另行给定。'},
        ],
        'checks': [
            {'label': '机械、声学、光学维数为 6、3、3', 'passed': [dimensions[key] for key in ('mechanical', 'acoustic', 'optical')] == [6, 3, 3]},
            {'label': '每个操作保持化学元素且原子置换双射', 'passed': all(sorted(op['permutation']) == [0, 1] for op in operations)},
            {'label': '类大小之和等于群阶', 'passed': sum(row['size'] for row in classes) == (24 if preset == 'gaas' else 48)},
            {'label': '恒等操作的位移表示迹等于 3N', 'passed': classes[0]['mechanical'] == 6},
        ],
        'scope': [
            '目前精确处理 Si、GaAs、NaCl 三个理想两原子 fcc 周期模型的 Gamma 点；未实现任意 CIF/POSCAR 的声子模式识别。',
            '动画是未质量加权的对称适应相对位移基 u_A=+axis、u_B=-axis；不将其当作由力常数算出的真实动力学本征矢。异质原子的实际振幅需满足质量加权正交条件。',
            '所选光学三维子空间为本模型的对称类型；极性晶体接近 Gamma 点的 LO-TO 非解析分裂需要 Born 有效电荷、介电常数和传播方向，本计算未包含。',
            'IR 指电偶极一阶过程；Raman 指普通对称极化率的一阶过程。缺陷、二阶散射、共振与磁光过程不在这组禁戒结论内。',
            '频率、线宽、绝对强度、温度依赖与动力学稳定性不能由对称性单独确定。当前 Lorentzian 为用户参数模型，无材料实验数据。',
            'sum 对不同最终简并模式的强度非相干求和；动画仅展示 z 基，不将三个方向合并成一个真实正常模式。',
        ],
        'sources': _SOURCES,
    }
