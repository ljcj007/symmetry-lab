"""Coherent one-phonon scattering from a longitudinal diatomic harmonic chain.

Cell-periodic convention: u[l,k] ~ e[k,q] exp(i*q*l*a)/sqrt(m[k]).
Creation at Q uses sum_k b[k] exp(i*Q_parallel*tau[k]) e[k,q].conj()/sqrt(m[k]),
where q = Q_parallel modulo 2*pi/a. Real force constants imply time reversal;
annihilation at the same Q therefore has the same bare weight and Bose factor n.
Only NumPy is required. No force constants or experimental spectra are imported.
"""
import math
import numpy as np

EV_J = 1.602176634e-19
AMU_KG = 1.66053906660e-27
HBAR_JS = 1.054571817e-34
KB_MEV_K = 0.08617333262145
ENERGY_FACTOR = HBAR_JS * math.sqrt(EV_J / (1e-20 * AMU_KG)) / (EV_J * .001)
RECOIL_FACTOR = HBAR_JS**2 / (2 * AMU_KG * 1e-20 * EV_J * .001)
SOURCES = [
    {"id": "scattering-phonopy-dsf", "title": "Phonopy: coherent one-phonon dynamic structure factor and phase conventions", "url": "https://phonopy.github.io/phonopy/dynamic-structure-factor.html"},
    {"id": "scattering-phonopy-formulation", "title": "Phonopy: dynamical matrix and displacement eigenvectors", "url": "https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix"},
    {"id": "scattering-togo-2023", "title": "Togo, Chaput, Tadano & Tanaka, Implementation strategies in phonopy and phono3py (2023)", "url": "https://arxiv.org/abs/2301.05784"},
]


def _number(payload, key, default, low, high, integer=False):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{key} 必须是 {low} 至 {high} 范围内的有限数值')
    if integer and int(value) != value:
        raise ValueError(f'{key} 必须为整数')
    return int(value) if integer else float(value)


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须为 JSON 对象')
    p = {}
    for key, default, low, high in [
        ('lattice', 4, 1, 10), ('massA', 23, 1, 250), ('massB', 35.45, 1, 250),
        ('springIntra', 2, .02, 20), ('springInter', 2, .02, 20),
        ('basisFraction', .5, .05, .95), ('scatterA', 1, -20, 20), ('scatterB', 1, -20, 20),
        ('angle', 0, 0, 180), ('selectedQ', 1.8, -8, 8), ('temperature', 100, 0, 1500),
        ('sigma', .5, .05, 8), ('qMin', 0, -8, 8), ('qMax', 4, -8, 8),
        ('energyMin', -50, -250, 250), ('energyMax', 50, -250, 250), ('energyCutoff', .25, .001, 2),
    ]:
        p[key] = _number(payload, key, default, low, high)
    p['qPoints'] = _number(payload, 'qPoints', 81, 31, 121, True)
    p['energyPoints'] = _number(payload, 'energyPoints', 401, 101, 401, True)
    p['channel'] = payload.get('channel', 'both')
    if p['channel'] not in ('both', 'stokes', 'antiStokes'):
        raise ValueError('channel 仅支持 both、stokes、antiStokes')
    unknown = set(payload) - set(p)
    if unknown:
        raise ValueError('不支持的输入字段：' + ', '.join(sorted(unknown)))
    if p['qMax'] <= p['qMin'] or p['energyMax'] <= p['energyMin']:
        raise ValueError('Q 与能量扫描终点必须大于起点')
    return p


def fold_q(Q_parallel, lattice):
    """Return reduced q in [-pi/a,pi/a), with exact Gamma after roundoff."""
    G = 2 * math.pi / lattice
    q = (Q_parallel + G / 2) % G - G / 2
    if abs(q) < 1e-12:
        q = 0.
    return q


def dynamical_matrix(p, q):
    a, b = p['massA'], p['massB']
    k1, k2 = p['springIntra'], p['springInter']
    off = -(k1 + k2 * np.exp(-1j * q * p['lattice'])) / math.sqrt(a * b)
    return np.array([[(k1 + k2) / a, off], [off.conjugate(), (k1 + k2) / b]], complex)


def chain_modes(p, q):
    matrix = dynamical_matrix(p, q)
    values, vectors = np.linalg.eigh(matrix)
    if min(values) < -1e-10:
        raise ValueError('动力学矩阵出现非物理负本征值')
    values = np.maximum(values, 0.)
    if q == 0:
        values[0] = 0.
    return ENERGY_FACTOR * np.sqrt(values), vectors, matrix


def bose(energy, temperature):
    thermal = KB_MEV_K * temperature
    if thermal == 0 or energy > 700 * thermal:
        return 0.
    return 1. / math.expm1(energy / thermal)


def _groups(energies):
    indices = []
    for i, energy in enumerate(energies):
        if not indices or abs(energy - energies[indices[-1][0]]) > 1e-8:
            indices.append([i])
        else:
            indices[-1].append(i)
    return indices


def mode_weights(p, Q_parallel, energies, vectors):
    """Subspace sums remove arbitrary eigenvectors at exact branch degeneracy."""
    masses = np.array([p['massA'], p['massB']])
    basis = np.array([0., p['basisFraction'] * p['lattice']])
    weights = np.array([p['scatterA'], p['scatterB']])
    coefficients = Q_parallel * weights * np.exp(1j * Q_parallel * basis) / np.sqrt(masses)
    amplitudes = vectors.conj().T @ coefficients
    groups = []
    for indices in _groups(energies):
        energy = float(np.mean(energies[indices]))
        amplitude_strength = float(np.sum(abs(amplitudes[indices])**2))
        excluded = energy < p['energyCutoff']
        occupation = bose(energy, p['temperature']) if not excluded else None
        bare = RECOIL_FACTOR * amplitude_strength / energy if not excluded else 0.
        groups.append({
            'branches': indices, 'label': '声学 / 光学（简并子空间）' if len(indices) == 2 else ('声学' if indices[0] == 0 else '光学'),
            'energy': energy, 'degeneracy': len(indices), 'amplitudeStrength': amplitude_strength,
            'bareWeight': bare, 'occupation': occupation,
            'stokesWeight': bare * (occupation + 1) if not excluded else 0.,
            'antiStokesWeight': bare * occupation if not excluded else 0.,
            'excluded': excluded, 'reason': '低于一声子能量截断；未计算弹性或准弹性散射' if excluded else '',
        })
    expected = float(Q_parallel**2 * np.sum(weights**2 / masses))
    return groups, abs(float(np.sum(abs(amplitudes)**2)) - expected)


def gaussian(energy_grid, center, sigma):
    return np.exp(-.5 * ((energy_grid - center) / sigma)**2) / (sigma * math.sqrt(2 * math.pi))


def spectra_from_groups(groups, energy_grid, sigma):
    stokes = np.zeros_like(energy_grid)
    anti = np.zeros_like(energy_grid)
    exact = {'stokes': 0., 'antiStokes': 0.}
    for group in groups:
        if group['excluded']:
            continue
        for name, center, weight, array in (
            ('stokes', group['energy'], group['stokesWeight'], stokes),
            ('antiStokes', -group['energy'], group['antiStokesWeight'], anti),
        ):
            array += weight * gaussian(energy_grid, center, sigma)
            fraction = .5 * (math.erf((energy_grid[-1] - center) / (sigma * math.sqrt(2)))
                              - math.erf((energy_grid[0] - center) / (sigma * math.sqrt(2))))
            exact[name] += weight * fraction
    return stokes, anti, exact


def _selected_channel(stokes, anti, channel):
    return stokes + anti if channel == 'both' else (stokes if channel == 'stokes' else anti)


def _point(p, Q, energy_grid):
    cosine = math.cos(math.radians(p['angle']))
    if abs(cosine) < 1e-14:
        cosine = 0.
    parallel = Q * cosine
    q = fold_q(parallel, p['lattice'])
    energies, vectors, matrix = chain_modes(p, q)
    groups, sum_rule = mode_weights(p, parallel, energies, vectors)
    stokes, anti, exact = spectra_from_groups(groups, energy_grid, p['sigma'])
    values = (energies / ENERGY_FACTOR)**2
    residual = float(np.max(abs(matrix @ vectors - vectors * values)))
    ortho = float(np.max(abs(vectors.conj().T @ vectors - np.eye(2))))
    balance = 0.
    for group in groups:
        if group['excluded'] or group['stokesWeight'] == 0:
            continue
        thermal = KB_MEV_K * p['temperature']
        ratio = math.exp(-group['energy'] / thermal) if thermal > 0 and group['energy'] < 700 * thermal else 0.
        balance = max(balance, abs(group['antiStokesWeight'] / group['stokesWeight'] - ratio))
    return {'Q': Q, 'QParallel': parallel, 'reducedQ': q, 'reducedRLU': q * p['lattice'] / (2 * math.pi),
            'reciprocalOrder': int(round((parallel - q) * p['lattice'] / (2 * math.pi))),
            'energies': energies.tolist(), 'eigenvectors': [[[float(z.real), float(z.imag)] for z in vectors[:, i]] for i in range(2)],
            'groups': groups, 'stokes': stokes, 'antiStokes': anti, 'exactWindow': exact,
            'checks': {'eigenResidual': residual, 'orthogonalityResidual': ortho, 'amplitudeClosureResidual': sum_rule,
                       'detailedBalanceResidual': balance}}


def calculate(payload=None):
    p = parameters({} if payload is None else payload)
    energies = np.linspace(p['energyMin'], p['energyMax'], p['energyPoints'])
    qs = np.linspace(p['qMin'], p['qMax'], p['qPoints'])
    selected = _point(p, p['selectedQ'], energies)
    scan = [_point(p, float(q), energies) for q in qs]
    grid = np.array([_selected_channel(row['stokes'], row['antiStokes'], p['channel']) for row in scan]).T
    signal = _selected_channel(selected['stokes'], selected['antiStokes'], p['channel'])
    total_stokes = sum(g['stokesWeight'] for g in selected['groups'])
    total_anti = sum(g['antiStokesWeight'] for g in selected['groups'])
    total = total_stokes + total_anti if p['channel'] == 'both' else (total_stokes if p['channel'] == 'stokes' else total_anti)
    exact_window = (sum(selected['exactWindow'].values()) if p['channel'] == 'both' else selected['exactWindow'][p['channel']])
    numerical_window = float(np.sum((signal[:-1] + signal[1:]) * np.diff(energies) / 2))
    checks = {key: max(row['checks'][key] for row in [selected] + scan) for key in selected['checks']}
    energy_step = float(energies[1] - energies[0])
    omitted = sum(sum(g['degeneracy'] for g in row['groups'] if g['excluded']) for row in scan)
    checks.update({'energyStep': energy_step, 'gridResolved': energy_step <= p['sigma'] / 2,
                   'exactWindowWeight': exact_window, 'numericalWindowWeight': numerical_window,
                   'windowQuadratureError': abs(exact_window - numerical_window),
                   'windowFraction': exact_window / total if total > 1e-15 else None,
                   'omittedScanModes': omitted, 'nonnegativeSpectrum': bool(np.min(grid) >= 0),
                   'passed': bool(max(checks.values()) < 1e-8 and np.all(np.isfinite(grid)) and np.min(grid) >= 0)})
    warnings = [
        '理想一维双原子纵向谐链的相干一声子模型；参数与散射权重由用户给定，不是 NaCl、NiO 或任何材料的拟合。',
        '完整散射向量 Q 与约化声子 q 不同：Q∥=Q cosθ，q=Q∥ mod 2π/a。改变夹角同时改变动量匹配与纵向 Q·e 投影。',
        '相干权重 bA/bB 是有符号的相对常数，不是已校准散射长度或随 Q 变化的 X 射线形状因子。结果省略截面运动学常数与 Debye–Waller 因子。',
        '无限一维谐链存在长波涨落问题；本页只演示有限 Q/能量窗口及显式低能截断下的一声子运动学，不声称给出无限链的完整有限温度结构因子。',
        f'所有能量低于 {p["energyCutoff"]:g} meV 的模均从非弹性谱排除，尤其 q=0 的刚体声学模。没有用展宽把 1/ω 奇点变成弹性峰；未含弹性、多声子或准弹性贡献。',
        'Gaussian 的 σ 是能量标准差，FWHM=2√(2ln2)σ。Stokes位于正能量（探针向晶格传能），anti-Stokes位于负能量；详细平衡核验的是未展宽单模权重，非展宽后逐点曲线。',
        '本页没有导入 Phonopy 数据。现有导入器可用于检查结构与单模；完整散射还需明确 Å 单位、原胞、质量、匹配 q 点的全部复本征矢和散射权重，不能由频率或单模动画补全。',
    ]
    if not checks['gridResolved']:
        warnings.append('能量采样步长大于 σ/2，细峰形可能欠采样；请增加采样点、缩小能量窗口或增大展宽。')
    if checks['windowFraction'] is not None and checks['windowFraction'] < .95:
        warnings.append('当前选定 Q 的能量窗口未覆盖至少95%的总谱权重；完整权重和窗口积分已分别列出。')
    if omitted:
        warnings.append(f'热图的 {len(scan)} 个 Q 点共有 {omitted} 个模因低能截断被排除；近倒格点亮度依赖此截断，比较时须保持它相同。')
    if any(g['degeneracy'] > 1 for g in selected['groups']):
        warnings.append('当前 Q 有简并模；强度按完整简并子空间求和。导出的各个本征矢可任意酉混合，单独的分支标签没有唯一意义。')
    if not p['qMin'] <= p['selectedQ'] <= p['qMax']:
        warnings.append('选定 Q 不在热图扫描范围内；其独立能谱仍使用相同模型计算。')
    def series(label, xs, ys):
        return {'label': label, 'points': [[float(x), float(y)] for x, y in zip(xs, ys)]}
    selection_json = {k: v for k, v in selected.items() if k not in ('stokes', 'antiStokes')}
    selection_json.update({'spectrum': {'energies': energies.tolist(), 'stokes': selected['stokes'].tolist(), 'antiStokes': selected['antiStokes'].tolist(), 'selected': signal.tolist()}})
    return {
        'parameters': p,
        'summary': [{'label': '选定完整 Q', 'value': p['selectedQ'], 'unit': 'Å⁻¹'},
                    {'label': '链轴动量 Q∥', 'value': selected['QParallel'], 'unit': 'Å⁻¹'},
                    {'label': '约化 q', 'value': selected['reducedRLU'], 'unit': '2π/a'},
                    {'label': 'Stokes 积分权重', 'value': total_stokes},
                    {'label': 'anti-Stokes 积分权重', 'value': total_anti},
                    {'label': '所选通道窗口积分', 'value': exact_window}],
        'plots': [
            {'title': '选定 Q 的非弹性能谱', 'xLabel': '能量转移 E（meV）', 'yLabel': '相对谱密度（meV⁻¹）',
             'series': [series('Stokes · 创建声子', energies, selected['stokes']), series('anti-Stokes · 湮灭声子', energies, selected['antiStokes']), series('所选通道', energies, signal)]},
            {'title': '完整 Q 扫描中的折叠色散', 'xLabel': '完整 Q（Å⁻¹）', 'yLabel': '声子能量（meV）',
             'series': [series('声学分支', qs, [r['energies'][0] for r in scan]), series('光学分支', qs, [r['energies'][1] for r in scan])]},
            {'title': '谱线权重与动量选择', 'xLabel': '完整 Q（Å⁻¹）', 'yLabel': '相对积分权重',
             'series': [series('Stokes 总权重', qs, [sum(g['stokesWeight'] for g in r['groups']) for r in scan]), series('anti-Stokes 总权重', qs, [sum(g['antiStokesWeight'] for g in r['groups']) for r in scan])]},
        ],
        'tables': [
            {'title': '选定 Q 的模与散射权重', 'columns': ['分支 / 子空间', '能量（meV）', '简并度', 'Bose n', '裸权重', 'Stokes', 'anti-Stokes', '状态'],
             'rows': [[g['label'], g['energy'], g['degeneracy'], g['occupation'], g['bareWeight'], g['stokesWeight'], g['antiStokesWeight'], '低能排除' if g['excluded'] else '保留'] for g in selected['groups']]},
            {'title': '质量归一化本征矢（任意整体相位）', 'columns': ['分支', 'A 实部', 'A 虚部', 'B 实部', 'B 虚部'],
             'rows': [[i, *vector[0], *vector[1]] for i, vector in enumerate(selected['eigenvectors'])]},
        ],
        'heatmap': {'title': '相干一声子 S(Q,E) · 所选通道', 'xLabel': '完整 Q（Å⁻¹）', 'yLabel': '能量转移 E（meV）',
                    'x': qs.tolist(), 'y': energies.tolist(), 'z': grid.tolist(), 'valueLabel': '相对谱密度（meV⁻¹）', 'recommendedScale': 'log1p'},
        'data': {'selection': selection_json,
                 'scan': [{'Q': r['Q'], 'QParallel': r['QParallel'], 'reducedQ': r['reducedQ'], 'energies': r['energies'], 'groups': r['groups']} for r in scan],
                 'energyFactor': ENERGY_FACTOR, 'recoilFactor': RECOIL_FACTOR,
                 'conventions': {'eigenvector': 'u_lκ=eκ(q) exp(i q l a)/sqrt(mκ)', 'phase': 'exp(i Q_parallel tauκ) eκ(q)*',
                                 'energy': 'positive for Stokes; probe energy loss', 'scatterWeight': 'dimensionless signed relative amplitude',
                                 'gaussian': 'unit-area in energy; sigma in meV', 'heatmap': 'rows=energy, columns=full Q'}},
        'checks': checks, 'warnings': warnings, 'sources': SOURCES,
    }
