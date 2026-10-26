"""Bounded isotropic quasi-harmonic volume minimization for the browser.

This is a local polynomial fit to supplied free energies, not an implementation
of Phonopy's Vinet/Birch-Murnaghan EOS. All energies and volumes refer to the
same explicitly declared input cell. No equilibrium point is extrapolated.
"""
import math
import numpy as np

from phonopy_import import _parse, _number, _integer
from phonon_thermo import _oscillator, _temps, _import_thermal, EV_MOLAR

EV_A3_TO_GPA = 160.2176634
MAX_VOLUMES = 61
SOURCES = [
    {'title': 'Phonopy：准谐自由能、体积优化与热膨胀',
     'url': 'https://phonopy.github.io/phonopy/qha.html'},
    {'title': 'Phonopy：谐振动热力学公式',
     'url': 'https://phonopy.github.io/phonopy/formulation.html#thermodynamic-properties'},
]
UNITS = {'temperature': 'K', 'volume': 'angstrom^3/input-cell',
         'staticEnergy': 'eV/input-cell', 'vibrationalFreeEnergy': 'eV/input-cell',
         'freeEnergy': 'eV/input-cell', 'gibbsEnergy': 'eV/input-cell',
         'pressure': 'GPa', 'bulkModulus': 'GPa', 'alphaVolume': 'K^-1',
         'entropy': 'J/(mol input cells K)', 'heatCapacity': 'J/(mol input cells K)'}


def _sequence(values, name, low, high, minimum, maximum):
    if not isinstance(values, list) or not minimum <= len(values) <= maximum:
        raise ValueError(f'{name} 须包含 {minimum} 至 {maximum} 个数值')
    result = [_number(x, name, low, high) for x in values]
    if any(b <= a for a, b in zip(result, result[1:])):
        raise ValueError(f'{name}必须严格递增；不自动排序或合并重复点，以免错配数据')
    return result


def _preset(payload):
    if payload.get('preset', 'einstein-volume') != 'einstein-volume':
        raise ValueError('当前 preset 仅支持 einstein-volume 原创教学模型')
    n = _integer(payload.get('natom', 2), 'natom', 1, 128)
    v0 = _number(payload.get('v0', 40), '参考胞体积 v0', 1, 10000)
    bulk = _number(payload.get('bulk_modulus', 100), '静态体模量', 1, 1000)
    gamma = _number(payload.get('gamma', 1.5), '模式 Grüneisen 参数 gamma', -4, 4)
    theta = _number(payload.get('theta', 400), '参考 Einstein 温度 theta', 1, 3000)
    span = _number(payload.get('volume_span', 0.15), '相对体积采样半宽', 0.02, 0.4)
    count = _integer(payload.get('volume_points', 13), '体积点数', 5, MAX_VOLUMES)
    if count % 2 != 1:
        raise ValueError('教学模型体积点数须为奇数，以包含参考体积')
    ts = _temps(payload)
    if len(ts) < 3:
        raise ValueError('QHA 至少需要 3 个温度点；首末点不报告温度导数')
    vs = [v0 * (1 + span * (2 * i / (count - 1) - 1)) for i in range(count)]
    k = bulk / EV_A3_TO_GPA / v0
    es = [0.5 * k * (v - v0) ** 2 for v in vs]
    fs = [[3 * n * _oscillator(theta * (v0 / v) ** gamma, t)[0] / EV_MOLAR
           for v in vs] for t in ts]
    parameters = {'preset': 'einstein-volume', 'natom': n, 'v0': v0,
                  'bulk_modulus': bulk, 'gamma': gamma, 'theta': theta,
                  'volume_span': span, 'volume_points': count,
                  'staticFormula': 'E_static(V) = B0 (V−V0)^2 / (2 V0)',
                  'frequencyFormula': 'θ(V) = θ0 (V0/V)^γ；3n 个相同频率模式'}
    return vs, es, ts, fs, n, True, parameters, []


def _import(payload, source):
    data = _parse(payload)
    if not isinstance(data, dict):
        raise ValueError('QHA 输入须为 JSON/YAML 对象')
    if data.get('cellBasis') != 'same-input-cell':
        raise ValueError('必须声明 cellBasis: same-input-cell，确认所有体积、静态能与振动能采用同一计算胞归一化')
    n = _integer(data.get('natom'), '同一输入计算胞原子数 natom', 1, 128)
    units = data.get('units', {})
    if not isinstance(units, dict) or units.get('volume') != 'angstrom^3' or units.get('staticEnergy') != 'eV/input-cell':
        raise ValueError('units 必须明确 volume: angstrom^3 和 staticEnergy: eV/input-cell')
    if units.get('temperature') != 'K':
        raise ValueError('units.temperature 必须声明为 K')
    vs = _sequence(data.get('volumes'), '体积', 1e-3, 1e7, 5, MAX_VOLUMES)
    energies = data.get('staticEnergies')
    if not isinstance(energies, list) or len(energies) != len(vs):
        raise ValueError('staticEnergies 必须与 volumes 一一对应；不得缺失体积点')
    es = [_number(x, '静态能', -1e9, 1e9) for x in energies]
    for name in ('natoms', 'staticNatoms'):
        if name in data:
            values = data[name]
            if not isinstance(values, list) or len(values) != len(vs) or any(_integer(x, name, 1, 128) != n for x in values):
                raise ValueError(f'{name} 必须逐体积匹配共同的 natom；不自动按原子数缩放')
    warnings = ['同胞归一化依据导入文件的显式声明；仅有自由能表不能独立核验晶胞、原子种类、原子对应、q 网格收敛或动力学稳定性。']
    metadata = []
    if source == 'matrix':
        ts = _sequence(data.get('temperatures'), '温度', 0, 10000, 3, 501)
        f_unit = units.get('vibrationalFreeEnergy')
        if f_unit not in ('eV/input-cell', 'kJ/mol-input-cell'):
            raise ValueError('units.vibrationalFreeEnergy 须为 eV/input-cell 或 kJ/mol-input-cell')
        factor = 1 if f_unit == 'eV/input-cell' else 1000 / EV_MOLAR
        matrix = data.get('freeEnergy')
        if not isinstance(matrix, list) or len(matrix) != len(ts):
            raise ValueError('freeEnergy 必须每个温度一行')
        fs = []
        for row in matrix:
            if not isinstance(row, list) or len(row) != len(vs):
                raise ValueError('freeEnergy 每行必须有与 volumes 等长的振动自由能；不插补缺失值')
            fs.append([_number(f, '振动自由能', -1e9, 1e9) * factor for f in row])
        warnings.append('矩阵导入未包含逐模式信息；结果仅反映所提供振动自由能，不能据此判断虚频或缺失模式。')
    else:
        files = data.get('thermalFiles')
        if not isinstance(files, list) or len(files) != len(vs):
            raise ValueError('thermalFiles 必须按 volumes 顺序包含每个体积的一份 thermal_properties.yaml 文本或对象')
        ts, columns, signatures = None, [], []
        for index, item in enumerate(files):
            if not isinstance(item, (str, dict)):
                raise ValueError('thermalFiles 每项必须为 YAML 文本或解析后的对象')
            obj = _parse({'content': item} if isinstance(item, str) else {'data': item})
            if not isinstance(obj, dict) or 'band_index' in obj:
                raise ValueError('QHA 不接受 band_index 模式子集；必须提供完整计算胞的振动自由能')
            if 'exclude_gamma_acoustic' in obj and not isinstance(obj['exclude_gamma_acoustic'], bool):
                raise ValueError('exclude_gamma_acoustic 必须是 true/false 布尔值，不能用文本代替')
            own_warnings = []
            series, file_n = _import_thermal({}, obj, own_warnings)
            if file_n != n:
                raise ValueError(f'体积点 {index + 1} 的 thermal 文件 natom 缺失或与共同 natom 不同')
            temp = [r['temperature'] for r in series['rows']]
            if len(temp) < 3:
                raise ValueError('每个 thermal 文件至少需要 3 个相同的温度点')
            if ts is None:
                ts = temp
            elif len(ts) != len(temp) or any(abs(a-b) > 1e-10 * max(1, abs(a)) for a, b in zip(ts, temp)):
                raise ValueError('各体积 thermal 文件的温度网格必须完全一致；不自动插值或截断')
            columns.append([r['cell']['freeEnergy'] for r in series['rows']])
            total, integrated = series['numModes'], series['numIntegratedModes']
            if total is not None and total % (3*n) != 0:
                raise ValueError('num_modes 必须是完整计算胞 3×natom 的整数倍；请核对模式计数与胞归一化')
            signature = (None if total is None or integrated is None else integrated / total,
                         series['cutoffFrequency'], obj.get('exclude_gamma_acoustic', False))
            signatures.append(signature)
            metadata.append({'volume': vs[index], 'natom': file_n, 'numModes': total,
                             'numIntegratedModes': integrated, 'cutoffFrequency': series['cutoffFrequency'],
                             'excludeGammaAcoustic': obj.get('exclude_gamma_acoustic') is True})
            if (total is None) != (integrated is None):
                raise ValueError('QHA thermal 文件须同时提供或同时省略 num_modes 与 num_integrated_modes')
        if any(sig != signatures[0] for sig in signatures[1:]):
            raise ValueError('各体积的模式积分比例、频率截断或 Γ 声学模式排除设置不同，不能将不一致的振动自由能拼接拟合')
        ratio = signatures[0][0]
        if ratio is None:
            warnings.append('thermal 文件未提供模式积分计数，无法核验模式完整性；请独立确认所有体积的声子谱稳定且积分设置一致。')
        elif ratio < 1:
            warnings.append(f'所有体积保留的模式比例为 {ratio:.8g}；结果沿用相同的模式排除近似，不能视为完整稳定谱的证明。')
        if signatures[0][1] not in (None, 0):
            warnings.append('thermal 文件使用了非零频率截止；结果保留这一近似。')
        if len({m['numModes'] for m in metadata}) > 1:
            warnings.append('各体积的总模式数不同，可能采用了不同 q 网格；相同积分比例不证明网格收敛，需独立验证自由能精度。')
        fs = [list(row) for row in zip(*columns)]
    return vs, es, ts, fs, n, data.get('synthetic') is True, {'importedMetadata': metadata}, warnings


def _polynomial(vs, ys, degree):
    center = (vs[0] + vs[-1]) / 2
    scale = (vs[-1] - vs[0]) / 2
    if scale <= 1e-12 * max(1, abs(center)):
        raise ValueError('体积采样区间过窄，不能稳定拟合')
    x = (np.asarray(vs) - center) / scale
    y = np.asarray(ys)
    offset = float(y[len(y)//2])
    design = np.polynomial.polynomial.polyvander(x, degree)
    c, _, rank, singular = np.linalg.lstsq(design, y - offset, rcond=None)
    condition = float(singular[0] / singular[-1])
    if rank < degree + 1 or condition > 1e8:
        raise ValueError('局部体积采样病态或近乎重复，拟合条件数过大')
    c[0] += offset
    error = np.polynomial.polynomial.polyval(x, c) - y
    return {'coefficients': [float(a) for a in c], 'center': center, 'scale': scale,
            'rmsResidual': float(np.sqrt(np.mean(error ** 2))),
            'maxResidual': float(np.max(np.abs(error))), 'conditionNumber': condition}


def _evaluate(fit, volume, order=0):
    c = np.polynomial.polynomial.polyder(fit['coefficients'], order)
    return float(np.polynomial.polynomial.polyval((volume-fit['center']) / fit['scale'], c) / fit['scale']**order)


def _minima(fit, low, high):
    derivative = np.polynomial.polynomial.polyder(fit['coefficients'])
    # A numerically quadratic cubic fit has a tiny leading coefficient. Its
    # untrimmed companion matrix has an enormous spurious root and can destroy
    # the accuracy of the finite root. Only discard terms below fit precision.
    threshold = 1e-12 * max((abs(float(x)) for x in derivative), default=0)
    while len(derivative) > 1 and abs(derivative[-1]) <= threshold:
        derivative = derivative[:-1]
    # Degree is at most three: solve its quadratic derivative with the stable
    # q-formula rather than subtracting nearly equal numbers in a quadratic
    # formula or diagonalizing a badly scaled companion matrix.
    if len(derivative) == 1:
        roots = []
    elif len(derivative) == 2:
        roots = [-derivative[0] / derivative[1]]
    else:
        c, b, a = [float(x) for x in derivative]
        discriminant = b*b - 4*a*c
        if discriminant < 0:
            roots = []
        else:
            q = -0.5 * (b + math.copysign(math.sqrt(discriminant), b))
            roots = [-b/(2*a)] if q == 0 else [q/a, c/q]
    candidates = []
    for root in roots:
        if abs(float(np.imag(root))) > 1e-9:
            continue
        v = float(np.real(root)) * fit['scale'] + fit['center']
        if low < v < high and _evaluate(fit, v, 2) > 1e-12:
            candidates.append(v)
    return sorted(candidates, key=lambda v: _evaluate(fit, v))


def _fit_row(vs, es, fs, temperature, pressure, degree, window, tolerance):
    pv = [pressure * v / EV_A3_TO_GPA for v in vs]
    ys = [e + f + p for e, f, p in zip(es, fs, pv)]
    index = int(np.argmin(ys))
    row = {'temperature': temperature, 'valid': False, 'status': 'boundary-minimum',
           'volume': None, 'gibbsEnergy': None, 'bulkModulus': None,
           'alphaVolume': None, 'heatCapacity': None, 'entropy': None,
           'derivativeStatus': 'unavailable', 'fit': None, 'curve': [],
           'samples': [{'volume': v, 'staticEnergy': e, 'vibrationalFreeEnergy': f,
                        'pv': p, 'totalFreeEnergy': y} for v, e, f, p, y in zip(vs, es, fs, pv, ys)],
           'warnings': []}
    if index in (0, len(vs)-1):
        row['warnings'].append('最低采样自由能位于体积区间边界；需要补充体积数据，未外推平衡体积。')
        return row
    start = max(0, min(index-window//2, len(vs)-window))
    ids = list(range(start, start+window))
    local_v, local_y = [vs[i] for i in ids], [ys[i] for i in ids]
    fit = _polynomial(local_v, local_y, degree)
    fit.update({'degree': degree, 'windowIndices': ids, 'volumeDegreeDifference': None})
    row['fit'] = fit
    row['curve'] = [{'volume': float(v), 'freeEnergy': _evaluate(fit, v)}
                    for v in np.linspace(local_v[0], local_v[-1], 81)]
    minima = _minima(fit, vs[index-1], vs[index+1])
    if not minima:
        row['status'] = 'no-convex-interior-minimum'
        row['warnings'].append('拟合在采样最小值的相邻体积之间没有正曲率极小点；不能报告稳定平衡体积。')
        return row
    v = minima[0]
    energy = _evaluate(fit, v)
    if energy > min(ys) + max(tolerance, fit['maxResidual']):
        row['status'] = 'inconsistent-local-fit'
        row['warnings'].append('局部拟合极小值高于最低原始采样能；拟合不能可靠描述该极小值。')
        return row
    row.update({'valid': True, 'status': 'interior-minimum', 'volume': v,
                'gibbsEnergy': energy, 'bulkModulus': v * _evaluate(fit, v, 2) * EV_A3_TO_GPA})
    if degree == 3:
        alternative = _polynomial(local_v, local_y, 2)
        other = _minima(alternative, vs[index-1], vs[index+1])
        if other:
            fit['volumeDegreeDifference'] = abs(v - other[0])
            if abs(v-other[0]) > 0.1 * (vs[index+1]-vs[index-1]):
                row['warnings'].append('二次和三次拟合的平衡体积差异较大；请增加体积点并检查拟合窗口。')
        else:
            row['warnings'].append('二次拟合未给出相同区间的极小值；拟合阶数收敛尚未确认。')
    if fit['maxResidual'] > tolerance:
        row['warnings'].append(f'局部拟合最大残差超过 {tolerance:g} eV/胞；导数可能对采样和拟合方式敏感。')
    # Treat a flat-bottom valley as one basin; strict pairwise '<' comparisons
    # miss both wells when each minimum spans two equal samples.
    plateau_tolerance = max(1e-12, 1e-10*(max(ys)-min(ys)),
                            32*np.finfo(float).eps*max(abs(y) for y in ys))
    groups, first = [], 0
    for i in range(1, len(ys)):
        if abs(ys[i]-ys[first]) > plateau_tolerance:
            groups.append((first, i-1))
            first = i
    groups.append((first, len(ys)-1))
    basins = [(a, b) for a, b in groups if a > 0 and b < len(ys)-1
              and max(ys[a:b+1]) < min(ys[a-1], ys[b+1])-plateau_tolerance]
    if len(basins) > 1:
        row['warnings'].append('原始体积数据出现多个局部极小值；本次仅拟合最低采样谷，单相连续导数未必适用。')
        row['multipleWells'] = True
    if row['warnings']:
        row['status'] = 'interior-minimum-with-warning'
    return row


def _derivatives(rows):
    """Three-point quadratic interpolation on possibly nonuniform T grids."""
    for i, row in enumerate(rows):
        if not row['valid']:
            continue
        if i in (0, len(rows)-1):
            row['derivativeStatus'] = 'endpoint-not-reported'
            continue
        nearby = rows[i-1:i+2]
        if any(not r['valid'] for r in nearby):
            row['derivativeStatus'] = 'invalid-neighbor'
            continue
        if any(r.get('multipleWells') for r in nearby):
            row['derivativeStatus'] = 'multiple-wells-not-differentiated'
            continue
        temperatures = [r['temperature'] for r in nearby]
        t = row['temperature']
        volume_fit = _polynomial(temperatures, [r['volume'] for r in nearby], 2)
        gibbs_fit = _polynomial(temperatures, [r['gibbsEnergy'] for r in nearby], 2)
        row['alphaVolume'] = _evaluate(volume_fit, t, 1) / row['volume']
        row['entropy'] = -_evaluate(gibbs_fit, t, 1) * EV_MOLAR
        row['heatCapacity'] = -t * _evaluate(gibbs_fit, t, 2) * EV_MOLAR
        row['derivativeStatus'] = 'three-point-interior'
        if row['heatCapacity'] < -1e-6:
            row['warnings'].append('数值导出的 Cp 为负；请核对输入的热力学稳定性、温度采样及体积拟合误差。')
        # A minimum can jump between disjoint fits at a first-order transition.
        if set(nearby[0]['fit']['windowIndices']).isdisjoint(nearby[2]['fit']['windowIndices']):
            row['alphaVolume'] = row['heatCapacity'] = row['entropy'] = None
            row['derivativeStatus'] = 'disjoint-volume-branches'
            row['warnings'].append('相邻温度的拟合窗口不相交，可能存在体积跳变；不报告跨越跳变的连续导数。')


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须为对象')
    source = payload.get('source', 'preset')
    if source not in ('preset', 'matrix', 'thermal'):
        raise ValueError('source 须为 preset、matrix 或 thermal；单份 DOS 不能确定热膨胀')
    pressure = _number(payload.get('pressure', 0), '压力', -100, 1000)
    degree = _integer(payload.get('fit_degree', 3), '局部多项式阶数', 2, 3)
    window = _integer(payload.get('fit_window', 5), '局部拟合体积点数', 5, 9)
    if window % 2 != 1:
        raise ValueError('fit_window 须为 5、7 或 9')
    tolerance = _number(payload.get('fit_tolerance', 1e-4), '拟合能量残差阈值', 1e-10, 1)
    vs, es, ts, fs, n, synthetic, parameters, warnings = _preset(payload) if source == 'preset' else _import(payload, source)
    if window > len(vs):
        raise ValueError('fit_window 不得大于实际体积点数')
    rows = [_fit_row(vs, es, f, t, pressure, degree, window, tolerance) for t, f in zip(ts, fs)]
    _derivatives(rows)
    if synthetic:
        warnings.insert(0, '原创合成教学数据；参数用于观察体积—频率耦合，不代表 Si 或任何真实材料的第一性原理结果。')
    failed = sum(not r['valid'] for r in rows)
    if failed:
        warnings.append(f'{failed}/{len(rows)} 个温度没有受采样区间支持的内点极小值，相应体积、体模量与导数留空。')
    warning_count = sum(bool(r['warnings']) for r in rows)
    if warning_count:
        warnings.append(f'{warning_count} 个温度含拟合或热力学警告，详见各温度结果；小残差不等于体积/温度/q 网格已收敛。')
    warnings.append('αV、S 和 Cp 使用相邻三个温度的局部二次差分，首末温度不报告；请用更密温度与体积网格检查数值导数收敛。')
    parameters.update({'pressure': pressure, 'fit_degree': degree, 'fit_window': window, 'fit_tolerance': tolerance})
    valid = [r for r in rows if r['valid']]
    return {'kind': 'qha-lab', 'source': source, 'synthetic': synthetic,
            'basis': 'per-input-cell', 'basisLabel': '每个声明一致的输入计算胞',
            'units': dict(UNITS), 'parameters': parameters, 'temperatures': ts,
            'volumes': vs, 'rows': rows,
            'summary': {'natom': n, 'temperatureCount': len(ts), 'volumeCount': len(vs),
                        'validCount': len(valid), 'invalidCount': failed,
                        'derivativeCount': sum(r['heatCapacity'] is not None for r in rows),
                        'volumeMin': vs[0], 'volumeMax': vs[-1],
                        'temperatureMin': ts[0], 'temperatureMax': ts[-1],
                        'maxFitResidual': max((r['fit']['maxResidual'] for r in rows if r['fit']), default=None),
                        'method': f'局部 {degree} 次多项式，{window} 个体积点；仅限内点极小值'},
            'warnings': warnings,
            'assumptions': [
                'G(T,p) = min_V [E_static(V) + F_vib(T,V) + pV]；p 为恒定外部静水压力。',
                '体积、静态能与振动自由能必须采用同一计算胞；1 mol 是 N_A 个此计算胞，不自动等于原子或化学式单位。',
                '局部缩放坐标 x=(V−center)/scale 上最小二乘拟合，不是 Vinet 或 Birch–Murnaghan 状态方程；拟合系数按 x 的升幂排列。',
                'B_T = V ∂²F/∂V²；αV=(1/V)(∂V/∂T)_p；Cp=−T(∂²G/∂T²)_p。αV 是体积膨胀系数，不能直接当作一般各向异性晶体的线膨胀系数。',
                '本模块只做各向同性体积优化；不计算各向异性应变、强非谐频率重整化、电子有限温自由能、磁熵、相间自由能或热导率。',
                '正体模量只检验体积方向的机械曲率；不证明声子无虚频、剪切稳定或全局相稳定。'],
            'steps': [
                {'title': '核对共同计算胞', 'formula': 'V、E_static、F_vib → 同一 natom 与同一胞', 'detail': '至少 5 个严格递增的体积点；各体积使用完全相同的温度网格与一致的振动积分设置。'},
                {'title': '统一单位并相加', 'formula': 'F_total = E_static + F_vib + pV', 'detail': 'kJ/mol-input-cell 除以 96.485332… 转为 eV/input-cell；GPa·Å³ 除以 160.2176634 转为 eV。'},
                {'title': '寻找受采样支持的极小值', 'formula': '∂F_total/∂V=0，∂²F_total/∂V²>0', 'detail': '在离散最小值周围拟合，检查内点、曲率与残差；边界最小不向区间外外推。'},
                {'title': '沿温度求导并验证收敛', 'formula': 'αV=V⁻¹dV/dT；Cp=−T d²G/dT²', 'detail': '只用三个有效的相邻温度；端点留空，并通过更细温度/体积采样和不同拟合阶数交叉检查。'}],
            'sources': SOURCES, 'constants': {'eV_angstrom3_to_GPa': EV_A3_TO_GPA,
                                             'eV_to_J_mol': EV_MOLAR}}
