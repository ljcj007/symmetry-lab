"""Finite kinematic structure-factor and extinction demonstrations.

Scattering factors are constant real user weights, not tabulated X-ray form
factors.  Only explicitly constructed lattice/basis/screw examples receive
systematic labels. Arbitrary input structures are never assigned space groups.
Cell vectors are rows in Cartesian angstrom; hkl uses the reciprocal dual.
"""
from itertools import product
import math

import numpy as np


_FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]
_PRESETS = {
    'silicon': {'name': 'Si · 金刚石常规胞', 'lattice': 5.43, 'basis': [('Si', [0, 0, 0]), ('Si', [0.25] * 3)], 'centering': 'F', 'factors': {'Si': 14}},
    'gaas': {'name': 'GaAs · 闪锌矿常规胞', 'lattice': 5.65, 'basis': [('Ga', [0, 0, 0]), ('As', [0.25] * 3)], 'centering': 'F', 'factors': {'Ga': 31, 'As': 33}},
    'nacl': {'name': 'NaCl · 岩盐常规胞', 'lattice': 5.64, 'basis': [('Na', [0, 0, 0]), ('Cl', [0.5] * 3)], 'centering': 'F', 'factors': {'Na': 11, 'Cl': 17}},
    'fcc': {'name': '单元素面心立方模型', 'lattice': 4, 'basis': [('X', [0, 0, 0])], 'centering': 'F', 'factors': {'X': 1}},
    'bcc': {'name': '单元素体心立方模型', 'lattice': 3, 'basis': [('X', [0, 0, 0])], 'centering': 'I', 'factors': {'X': 1}},
    'screw21': {'name': '沿 z 的 2₁ 螺旋配对模型', 'lattice': 5, 'basis': [('X', [0.13, 0.21, 0.07]), ('X', [0.87, 0.79, 0.57])], 'centering': 'P', 'factors': {'X': 1}},
}
SOURCES = [
    {'title': 'IUCr: Structure factor', 'url': 'https://dictionary.iucr.org/Structure_factor'},
    {'title': 'IUCr: Reflection conditions', 'url': 'https://dictionary.iucr.org/Reflection_conditions'},
]


def _number(value, name, lower, upper):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not math.isfinite(value) or not lower <= value <= upper):
        raise ValueError(f'{name} 必须是 {lower} 至 {upper} 的有限实数')
    return float(value)


def _integer(value, name, lower, upper):
    if isinstance(value, bool) or not isinstance(value, int) or not lower <= value <= upper:
        raise ValueError(f'{name} 必须是 {lower} 至 {upper} 的整数')
    return value


def _vector(value, name, lower=-1000, upper=1000):
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(f'{name} 必须含三个实数')
    return [_number(v, name, lower, upper) for v in value]


def _cell(value):
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError('cell 必须是行向量组成的 3×3 晶胞矩阵（Å）')
    cell = np.array([_vector(row, 'cell', -1000, 1000) for row in value], dtype=float)
    volume = float(abs(np.linalg.det(cell)))
    if volume < 1e-6 or not math.isfinite(volume) or float(np.linalg.cond(cell)) > 1e6:
        raise ValueError('cell 必须非奇异且条件数不超过 1e6，体积至少为 1e-6 Å³')
    return cell


def _factors(value):
    if not isinstance(value, dict) or len(value) > 64:
        raise ValueError('scatteringFactors 必须为最多 64 项的元素→恒定实权重对象')
    result = {}
    for key, factor in value.items():
        if not isinstance(key, str) or not key or len(key) > 32:
            raise ValueError('元素标签必须是长度 1 至 32 的字符串')
        result[key] = _number(factor, 'scatteringFactors', -1000, 1000)
    return result


def _structure(data, preset):
    overrides = _factors(data.get('scatteringFactors', {}))
    if preset == 'custom':
        if 'cell' not in data or 'atoms' not in data:
            raise ValueError('自定义模型必须提供 cell 和 atoms')
        cell = _cell(data['cell'])
        raw = data['atoms']
        if not isinstance(raw, list) or not 1 <= len(raw) <= 128:
            raise ValueError('atoms 必须包含 1 至 128 个原子')
        atoms = []
        for index, atom in enumerate(raw):
            if not isinstance(atom, dict):
                raise ValueError('每个原子必须为 JSON 对象')
            species = atom.get('species', 'X')
            if not isinstance(species, str) or not species or len(species) > 32:
                raise ValueError('species 必须为长度 1 至 32 的字符串')
            fractional = _vector(atom.get('fractional'), 'fractional')
            occupancy = _number(atom.get('occupancy', 1), 'occupancy', 0, 1)
            factor = _number(atom.get('factor', overrides.get(species, 1)), 'factor', -1000, 1000)
            atoms.append({'index': index + 1, 'species': species, 'fractional': [v % 1 for v in fractional],
                          'factor': factor, 'occupancy': occupancy, 'weight': factor * occupancy})
        return {'name': '用户自定义完整晶胞', 'cell': cell.tolist(), 'atoms': atoms,
                'centering': 'not_inferred', 'volume': float(abs(np.linalg.det(cell))),
                'coordinateConvention': '晶胞矢量按行排列，原子为分数坐标；所有原子需显式列出。'}
    spec = _PRESETS[preset]
    lattice = _number(data.get('latticeConstant', spec['lattice']), 'latticeConstant', 0.5, 100)
    cell = np.eye(3) * lattice
    factors = {**spec['factors'], **overrides}
    shifts = _FCC if spec['centering'] == 'F' else [[0, 0, 0], [0.5] * 3] if spec['centering'] == 'I' else [[0, 0, 0]]
    atoms = []
    for species, basis in spec['basis']:
        for shift in shifts:
            factor = factors[species]
            atoms.append({'index': len(atoms) + 1, 'species': species,
                          'fractional': [(basis[j] + shift[j]) % 1 for j in range(3)],
                          'factor': factor, 'occupancy': 1.0, 'weight': factor})
    return {'name': spec['name'], 'cell': cell.tolist(), 'atoms': atoms, 'centering': spec['centering'],
            'volume': lattice ** 3, 'latticeConstant': lattice,
            'coordinateConvention': '理想常规立方胞，矢量按行排列，原子为分数坐标。'}


def _extinction(preset, hkl, cancelled):
    h, k, l = hkl
    if preset in ('silicon', 'gaas', 'nacl', 'fcc') and not h % 2 == k % 2 == l % 2:
        return {'kind': 'centering', 'reason': 'F 格心：h、k、l 必须同奇或同偶；混合奇偶时格心相位和为零。', 'systematicForModel': True}
    if preset == 'bcc' and (h + k + l) % 2:
        return {'kind': 'centering', 'reason': 'I 格心：h+k+l 必须为偶数；奇数时两个格点相位相反。', 'systematicForModel': True}
    if preset == 'silicon' and all(v % 2 == 0 for v in hkl) and sum(hkl) % 4 == 2:
        return {'kind': 'diamond_basis', 'reason': '金刚石等权同种原子基底：全偶且 h+k+l=4n+2 时，(¼,¼,¼) 基底相位为 −1。该基底条件不可推广到所有 F 格心结构。', 'systematicForModel': True}
    if preset == 'screw21' and h == k == 0 and l % 2:
        return {'kind': 'screw_axis', 'reason': '沿 z 的 2₁ 配对：仅对 00l，平移 c/2 给出 (−1)^l，所以奇数 l 消光。', 'systematicForModel': True}
    if cancelled:
        if preset == 'custom':
            return {'kind': 'model_cancellation', 'reason': '给定坐标与权重的结构因子数值抵消；没有推断空间群，不能据此认定一般系统消光。', 'systematicForModel': False}
        return {'kind': 'accidental', 'reason': '给定基底/散射权重发生抵消，但不属于此处已证实的格心、金刚石或 2₁ 选择条件；改变元素权重可能解除。', 'systematicForModel': False}
    return {'kind': 'allowed', 'reason': '在给定模型与散射权重下结构因子非零；允许不代表实验中一定可分辨。', 'systematicForModel': False}


def run(payload=None):
    """Calculate one resolved reflection and a bounded Friedel-complete stick sum."""
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError('输入必须是 JSON 对象')
    data = dict(payload)
    for alias, key in [('max_index', 'maxIndex'), ('factors', 'scatteringFactors'), ('lattice', 'cell')]:
        if key not in data and alias in data:
            data[key] = data[alias]
    preset = data.get('preset', 'silicon')
    if not isinstance(preset, str) or preset not in (*_PRESETS, 'custom'):
        raise ValueError('preset 必须为 silicon / gaas / nacl / fcc / bcc / screw21 / custom')
    raw_hkl = data.get('hkl', [2, 2, 0])
    if not isinstance(raw_hkl, (list, tuple)) or len(raw_hkl) != 3:
        raise ValueError('hkl 必须含三个整数')
    hkl = [_integer(v, 'hkl', -32, 32) for v in raw_hkl]
    if hkl == [0, 0, 0]:
        raise ValueError('(000) 为直射束，不作为 Bragg 衍射峰')
    maximum = _integer(data.get('maxIndex', 4), 'maxIndex', 1, 6)
    wavelength = _number(data.get('wavelength', 1.5406), 'wavelength', 0.01, 100)
    structure = _structure(data, preset)
    atoms = structure['atoms']
    inverse = np.linalg.inv(np.array(structure['cell']))
    weights = np.array([atom['weight'] for atom in atoms])
    positions = np.array([atom['fractional'] for atom in atoms])
    scale = max(float(np.abs(weights).sum()), 1.0)
    tolerance = 1e-10 * scale

    def reflection(indices, components=False):
        # Row lattice A: A*g=h, hence g=A^{-1}h and d=1/|g| (no 2π).
        reciprocal = inverse @ np.array(indices)
        d = 1 / float(np.linalg.norm(reciprocal))
        sine = wavelength / (2 * d)
        accessible = sine <= 1 + 1e-12
        angle = math.degrees(2 * math.asin(min(1, sine))) if accessible else None
        phases = 2 * math.pi * (positions @ np.array(indices))
        terms = weights * np.exp(1j * phases)
        amplitude = complex(terms.sum())
        real, imag = float(amplitude.real), float(amplitude.imag)
        if abs(real) <= tolerance:
            real = 0.0
        if abs(imag) <= tolerance:
            imag = 0.0
        magnitude = math.hypot(real, imag)
        cancelled = magnitude <= tolerance
        classification = _extinction(preset, indices, cancelled)
        result = {'hkl': list(indices), 'real': real, 'imag': imag,
                  'amplitude': magnitude, 'intensity': magnitude ** 2,
                  'phaseDeg': math.degrees(math.atan2(imag, real)) if magnitude else None,
                  'dSpacing': d, 'twoTheta': angle, 'accessible': accessible,
                  'reciprocalVector': reciprocal.tolist(), 'extinction': classification}
        if components:
            terms_rows = []
            running = 0j
            for atom, phase, term in zip(atoms, phases, terms):
                running += term
                terms_rows.append({'index': atom['index'], 'species': atom['species'],
                    'fractional': atom['fractional'], 'factor': atom['factor'],
                    'occupancy': atom['occupancy'], 'weight': atom['weight'],
                    'phaseDeg': float(math.degrees(phase) % 360),
                    'real': float(term.real), 'imag': float(term.imag),
                    'cumulativeReal': float(running.real), 'cumulativeImag': float(running.imag)})
            result['components'] = terms_rows
        return result

    selected = reflection(hkl, components=True)
    # Retain one member of every ±hkl pair; all weights are real so Friedel's
    # intensity equality applies. Powder sum restores both members explicitly.
    reflections = []
    for index in product(range(-maximum, maximum + 1), repeat=3):
        first = next((value for value in index if value), 0)
        if first > 0:
            reflections.append(reflection(index))
    reflections.sort(key=lambda row: (-row['dSpacing'], row['hkl']))
    powder = []
    for item in reflections:
        if not item['accessible'] or item['intensity'] <= tolerance ** 2:
            continue
        # Relative d grouping is safe for the finite models; no crystal-family
        # assignment or symmetrization is made for a custom lattice.
        if not powder or abs(powder[-1]['dSpacing'] - item['dSpacing']) > 1e-8 * item['dSpacing']:
            powder.append({'dSpacing': item['dSpacing'], 'twoTheta': item['twoTheta'],
                           'intensity': 0.0, 'multiplicity': 0, 'hkls': []})
        powder[-1]['intensity'] += 2 * item['intensity']
        powder[-1]['multiplicity'] += 2
        powder[-1]['hkls'].append(item['hkl'])
    max_intensity = max((peak['intensity'] for peak in powder), default=0)
    for peak in powder:
        peak['relativeIntensity'] = 100 * peak['intensity'] / max_intensity if max_intensity else 0.0
    limitations = [
        'f 为用户给定的恒定实散射权重；默认元素数字仅取原子序数作示意，未使用随散射矢量变化的 X 射线原子形状因子。',
        'I=|F|² 为运动学结构因子强度；粉末棒谱只按等 d 求和，不含 Lorentz/偏振、Debye–Waller、吸收、仪器展宽、织构或异常散射。',
        '晶格常数为教学示意值，不能将棒谱视为对应材料的定量实验 XRD；2θ 用一阶 Bragg 条件及输入波长计算。',
        f'仅枚举 |h|、|k|、|l|≤{maximum}，同一 ±hkl 对保留一项并在粉末强度计数乘 2。高角区可能因指标截断缺少部分同 d 反射。',
        '格心/金刚石基底/2₁ 分类只针对已构造预设；自定义结构需列出完整晶胞所有原子，未展开 CIF 非对称单元或自动识别空间群消光。',
        '数值抵消阈值为 1e-10×max(1,Σ|占据率×f|)；非常弱的非零反射可能被归为数值零。',
    ]
    steps = [
        {'title': '形成每个原子的复振幅', 'detail': '由分数坐标计算 φⱼ=2π(hxⱼ+kyⱼ+lzⱼ)，每项为占据率×fⱼ(cosφⱼ+i sinφⱼ)。'},
        {'title': '相位矢量求和', 'detail': f'当前 F={selected["real"]:.6g}+({selected["imag"]:.6g})i，|F|²={selected["intensity"]:.6g}。'},
        {'title': '区分消光来源', 'detail': selected['extinction']['reason']},
        {'title': '从倒易长度得到衍射角', 'detail': '行向量晶胞 A 满足 A g=hkl；d=1/|g|，若 λ/(2d)≤1 则 2θ=2asin[λ/(2d)]，否则该波长不可达。'},
    ]
    return {'kind': 'diffraction', 'parameters': {'preset': preset, 'hkl': hkl,
                'maxIndex': maximum, 'wavelength': wavelength,
                'scatteringFactors': {atom['species']: atom['factor'] for atom in atoms}},
            'structure': structure, 'reflection': selected, 'selected': selected,
            'reflections': reflections, 'powder': powder,
            'statistics': {'friedelPairs': len(reflections),
                'nonzeroReflections': sum(item['intensity'] > tolerance ** 2 for item in reflections),
                'powderPeaks': len(powder), 'cancellationTolerance': tolerance},
            'formulas': {'structureFactor': 'F(hkl)=Σⱼ occupancyⱼ fⱼ exp[2πi(hxⱼ+kyⱼ+lzⱼ)]',
                'intensity': 'I=|F|²', 'bragg': '2d sinθ=λ'},
            'steps': steps, 'limitations': limitations, 'sources': SOURCES}
