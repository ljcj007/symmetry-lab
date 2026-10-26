"""Harmonic phonon thermodynamics with explicit input-cell normalization.

The models and imported frequencies provide vibrational contributions only.
There is no static electronic energy, quasi-harmonic volume minimization, Cp,
thermal expansion or thermal conductivity calculation in this module.
"""
import math

from phonopy_import import _parse, _number, _integer, MAX_BYTES, MAX_DOS_ROWS

# Exact SI definitions; frequencies below are ordinary nu, never angular omega.
PLANCK = 6.62607015e-34
BOLTZMANN = 1.380649e-23
AVOGADRO = 6.02214076e23
EV = 1.602176634e-19
LIGHT = 299792458.0
R = BOLTZMANN * AVOGADRO
EV_MOLAR = EV * AVOGADRO
MAX_TEMPERATURES = 501
MAX_WORK = 3000000
SOURCES = [
    {'title': 'Phonopy harmonic thermodynamic formulas',
     'url': 'https://phonopy.github.io/phonopy/formulation.html#thermodynamic-properties'},
    {'title': 'Phonopy thermal units, mesh convergence and excluded modes',
     'url': 'https://phonopy.github.io/phonopy/setting-tags.html#thermal-properties-related-tags'},
    {'title': 'Phonopy output files and reciprocal-space mesh weights',
     'url': 'https://phonopy.github.io/phonopy/output-files.html'},
]
UNITS = {'temperature': 'K', 'freeEnergy': 'kJ/mol primitive cells',
         'internalEnergy': 'kJ/mol primitive cells', 'zeroPointEnergy': 'kJ/mol primitive cells',
         'entropy': 'J/(mol primitive cells K)', 'heatCapacity': 'J/(mol primitive cells K)',
         'cellEnergy': 'eV/primitive cell', 'cellEntropy': 'eV/(primitive cell K)'}


def _temps(payload):
    if 'temperatures' in payload:
        values = payload['temperatures']
        if not isinstance(values, list) or not 1 <= len(values) <= MAX_TEMPERATURES:
            raise ValueError('temperatures 须包含 1 至 501 个温度')
        values = [_number(t, '温度', 0, 10000) for t in values]
        if any(b <= a for a, b in zip(values, values[1:])):
            raise ValueError('温度必须严格递增，不得重复')
        return values
    start = _number(payload.get('t_min', 0), '最低温度', 0, 10000)
    stop = _number(payload.get('t_max', 1000), '最高温度', start, 10000)
    step = _number(payload.get('t_step', 20), '温度步长', 1e-6, 10000)
    count = int(math.floor((stop - start) / step + 1e-10)) + 1
    if count > MAX_TEMPERATURES:
        raise ValueError('温度点超过 501 个，请增大温度步长')
    return [min(stop, start + i * step) for i in range(count)]


def _oscillator(theta, temperature):
    """One mole of modes: F,U in J/mol; S,Cv in J/(mol K)."""
    zpe = R * theta / 2
    if temperature == 0:
        return zpe, zpe, 0.0, 0.0
    x = theta / temperature
    if x <= 0:
        raise ValueError('频率过小，已超出浮点热力学计算的可靠范围；请核对单位与零频模式')
    if x > 745:
        return zpe, zpe, 0.0, 0.0
    ex = math.exp(-x)
    one_minus = -math.expm1(-x)
    log_one_minus = math.log(one_minus) if x < 0.7 else math.log1p(-ex)
    occupation_term = x * ex / one_minus
    return (zpe + R * temperature * log_one_minus,
            zpe + R * temperature * occupation_term,
            R * (occupation_term - log_one_minus),
            R * (x / one_minus) ** 2 * ex)


def _row(temperature, values):
    free, internal, entropy, heat = values
    return {'temperature': temperature, 'freeEnergy': free / 1000,
            'internalEnergy': internal / 1000, 'entropy': entropy, 'heatCapacity': heat,
            'cell': {'freeEnergy': free / EV_MOLAR, 'internalEnergy': internal / EV_MOLAR,
                     'entropy': entropy / EV_MOLAR, 'heatCapacity': heat / EV_MOLAR}}


def _gauss(count):
    """Gauss-Legendre quadrature on (0,1), no scipy/numpy dependency."""
    result = []
    for i in range(1, count + 1):
        z = math.cos(math.pi * (i - 0.25) / (count + 0.5))
        for _ in range(30):
            p0, p1 = 1.0, z
            for j in range(2, count + 1):
                p0, p1 = p1, ((2 * j - 1) * z * p1 - (j - 1) * p0) / j
            deriv = count * (z * p1 - p0) / (z * z - 1)
            delta = p1 / deriv
            z -= delta
            if abs(delta) < 2e-15:
                break
        result.append(((z + 1) / 2, 1 / ((1 - z * z) * deriv * deriv)))
    return result


_GL64 = _gauss(64)
_GL4 = _gauss(4)


def _debye(theta, natom, temperature):
    zpe = 9 / 8 * natom * R * theta
    if temperature == 0:
        return zpe, zpe, 0.0, 0.0
    y = theta / temperature
    if y < 20:
        # Integrate the smooth frequency density. The exact ZPE avoids drift.
        sums = [0.0] * 4
        for u, weight in _GL64:
            values = _oscillator(theta * u, temperature)
            for j in range(4):
                sums[j] += 9 * natom * u * u * weight * values[j]
        return tuple(sums)
    # Integrate in x = h nu/(k T), retaining low-T resolution for any theta/T.
    upper = min(y, 60.0)
    i3 = math.fsum(weight * upper * (u * upper) ** 3 / math.expm1(u * upper)
                   for u, weight in _GL64)
    factor = natom * R * (temperature / theta) ** 3
    thermal = 9 * factor * temperature * i3
    boundary = math.log1p(-math.exp(-y)) if y < 745 else 0.0
    free = zpe + 3 * natom * R * temperature * boundary - 3 * factor * temperature * i3
    internal = zpe + thermal
    entropy = 12 * factor * i3 - 3 * natom * R * boundary
    tail = y / math.expm1(y) if y < 700 else 0.0
    heat = 36 * factor * i3 - 9 * natom * R * tail
    return free, internal, entropy, heat


def _frequency_factor(unit):
    factors = {'THz': PLANCK * 1e12 / BOLTZMANN,
               'cm^-1': PLANCK * LIGHT * 100 / BOLTZMANN,
               'meV': EV * 1e-3 / BOLTZMANN}
    if unit not in factors:
        raise ValueError('请明确频率单位 THz、cm^-1 或 meV；不把未知单位自动当作 THz')
    return factors[unit]


def _frequency_unit(payload, data):
    declared = data.get('frequency_unit')
    for key in ('physical_unit', 'unit'):
        section = data.get(key)
        if isinstance(section, dict):
            declared = declared or section.get('frequency')
    explicit = payload.get('frequency_unit')
    if explicit and declared and explicit != declared:
        raise ValueError('所选频率单位与文件声明不一致；请核对后选择文件实际单位')
    unit = explicit or declared
    _frequency_factor(unit)
    return unit


def _sum_series(modes, temperatures, source, label, metadata):
    if len(modes) * len(temperatures) > MAX_WORK:
        raise ValueError('模式数乘温度点数超过浏览器计算限制，请增大温度步长或使用收敛的较小网格')
    rows = []
    for temperature in temperatures:
        sums = [0.0] * 4
        for theta, weight in modes:
            for j, value in enumerate(_oscillator(theta, temperature)):
                sums[j] += weight * value
        rows.append(_row(temperature, sums))
    zpe = math.fsum(theta * weight * R / 2 for theta, weight in modes) / 1000
    return dict(id=source, label=label, rows=rows, zeroPointEnergy=zpe,
                zeroPointEnergyCell=zpe * 1000 / EV_MOLAR, **metadata)


def _mesh(payload, data, temperatures, warnings):
    qs = data.get('phonon')
    if not isinstance(qs, list) or not 1 <= len(qs) <= 2000:
        raise ValueError('mesh.yaml 必须含 1 至 2000 个不可约 q 点')
    if 'segment_nqpoint' in data or any('distance' in q for q in qs if isinstance(q, dict)):
        raise ValueError('band.yaml 的高对称路径不是布里渊区积分网格，不能据此计算体热容')
    mesh = data.get('mesh')
    if not isinstance(mesh, list) or len(mesh) != 3:
        raise ValueError('需要 mesh.yaml 的三维 mesh 与每个 q 点的 weight；单条路径或任意 q 点不够')
    mesh = [_integer(n, 'mesh', 1, 10000) for n in mesh]
    total_weight = math.prod(mesh)
    natom = _integer(data.get('natom'), 'natom', 1, 128)
    if 'nqpoint' in data and data['nqpoint'] != len(qs):
        raise ValueError('nqpoint 与实际 q 点数量不一致')
    if len(qs) * 3 * natom > 60000:
        raise ValueError('mesh 模式条目超过 60000 个')
    unit = _frequency_unit(payload, data)
    factor = _frequency_factor(unit)
    zero_policy = payload.get('zero_policy', 'error')
    if zero_policy not in ('error', 'exclude'):
        raise ValueError('zero_policy 只能是 error 或 exclude')
    weights = 0
    modes, excluded = [], 0.0
    negative = 0
    for q in qs:
        if not isinstance(q, dict):
            raise ValueError('q 点记录必须为对象')
        weight = _integer(q.get('weight'), 'q 点 weight', 1, total_weight)
        weights += weight
        bands = q.get('band')
        if not isinstance(bands, list) or len(bands) != 3 * natom:
            raise ValueError('每个 q 点必须具有完整的 3 × natom 个频率')
        for band in bands:
            if not isinstance(band, dict):
                raise ValueError('band 条目必须为对象')
            frequency = _number(band.get('frequency'), '频率', -1e6, 1e6)
            if frequency < 0:
                negative += 1
            elif frequency == 0:
                excluded += weight / total_weight
            else:
                modes.append((frequency * factor, weight / total_weight))
    if weights != total_weight:
        raise ValueError('不可约 q 点权重之和必须等于 mesh 三个维数的乘积，不能静默重归一化')
    if negative:
        raise ValueError(f'检测到 {negative} 个负频率条目：不稳定结构的谐振子热力学无定义；不取绝对值或静默丢弃')
    if excluded and zero_policy == 'error':
        raise ValueError('检测到精确零频：离散零频谐振子的自由能发散；请使用不含 Γ 的收敛网格，或明确选择排除零频近似')
    if not modes:
        raise ValueError('排除零频后没有正频模式可用于热力学计算')
    if excluded:
        warnings.append(f'已按明确选择排除精确零频，缺少 {excluded:.8g} 个模式/输入计算胞；未重归一化剩余权重，结果为有限网格近似。')
    warnings.append('网格密度与低频收敛仍需用户验证；文件的 mesh 与权重一致性不等于收敛证明。')
    count = 3 * natom - excluded
    return _sum_series(modes, temperatures, 'mesh', '加权声子网格',
                       {'natom': natom, 'modeCount': count, 'expectedModeCount': 3 * natom,
                        'excludedModeWeight': excluded, 'highTemperatureLimit': count * R,
                        'frequencyUnit': unit, 'mesh': mesh, 'qpointCount': len(qs)}), natom


def _dos_rows(payload):
    if 'data' in payload:
        data = _parse(payload)
        values = data.get('dos')
    else:
        text = payload.get('dos_content', payload.get('content', ''))
        if not isinstance(text, str) or not text.strip() or len(text.encode('utf8')) > MAX_BYTES:
            raise ValueError('请提供不超过 8 MiB 的两列 total_dos.dat 文本')
        values = []
        for line in text.splitlines():
            line = line.split('#', 1)[0].strip()
            if not line:
                continue
            columns = line.split()
            if len(columns) != 2:
                raise ValueError('只接受频率、总 DOS 两列；不能把单个原子 PDOS 作为完整 DOS')
            try:
                values.append([float(x) for x in columns])
            except ValueError as exc:
                raise ValueError('DOS 含非数值内容') from exc
        data = {}
    if not isinstance(values, list) or not 2 <= len(values) <= MAX_DOS_ROWS:
        raise ValueError('DOS 需要 2 至 20000 个数据点')
    rows = []
    for pair in values:
        if not isinstance(pair, list) or len(pair) != 2:
            raise ValueError('DOS 每行必须恰含频率和总态密度两项')
        rows.append((_number(pair[0], 'DOS 频率', -1e6, 1e6),
                     _number(pair[1], 'DOS 密度', 0, 1e12)))
    if any(b[0] <= a[0] for a, b in zip(rows, rows[1:])):
        raise ValueError('DOS 频率必须严格递增')
    return rows, data


def _dos(payload, temperatures, warnings):
    if payload.get('dos_complete') is not True or payload.get('dos_normalization') != '3n':
        raise ValueError('须明确确认导入完整 total DOS，且积分按每输入计算胞 3n 个模式归一化；不接受路径态密度或部分 PDOS')
    rows, data = _dos_rows(payload)
    natom = _integer(payload.get('natom', data.get('natom')), '输入计算胞原子数 natom', 1, 128)
    unit = _frequency_unit(payload, data)
    factor = _frequency_factor(unit)
    modes, area = [], 0.0
    for (left, gl), (right, gr) in zip(rows, rows[1:]):
        if left < 0 and (gl > 0 or gr > 0):
            raise ValueError('DOS 在负频率区有非零谱重；不能静默舍弃或取绝对值计算稳定相热力学')
        if gl == gr == 0:
            continue
        width = right - left
        area += width * (gl + gr) / 2
        for u, weight in _GL4:
            frequency = left + u * width
            density = gl + (gr - gl) * u
            if frequency <= 0 and density > 0:
                raise ValueError('DOS 含非正频率谱重')
            if density:
                modes.append((frequency * factor, weight * width * density))
    if area == 0 or abs(area / (3 * natom) - 1) > 0.005:
        raise ValueError(f'DOS 积分为 {area:.8g}，与 3n = {3 * natom} 不符（容许 0.5% 网格误差）；请先核对完整性、单位和归一化')
    correction = 3 * natom / area
    if abs(correction - 1) > 1e-12:
        warnings.append(f'DOS 分段线性积分为 {area:.8g}；已施加明确归一化因子 {correction:.10g}，使积分等于 3n = {3 * natom}。')
    modes = [(theta, weight * correction) for theta, weight in modes]
    warnings.append('按相邻点间的分段线性 DOS 作四点 Gauss 积分；低温结果对低频分辨率敏感，须检查频率网格收敛。零频端点按连续积分处理，不增加离散零频模式。')
    return _sum_series(modes, temperatures, 'dos', '完整总 DOS 积分',
                       {'natom': natom, 'modeCount': 3 * natom, 'expectedModeCount': 3 * natom,
                        'excludedModeWeight': 0, 'highTemperatureLimit': 3 * natom * R,
                        'synthetic': data.get('synthetic') is True,
                        'frequencyUnit': unit, 'dosIntegralBeforeNormalization': area,
                        'dosNormalizationFactor': correction, 'dosRows': len(rows)}), natom


def _import_thermal(payload, data, warnings):
    rows = data.get('thermal_properties')
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_TEMPERATURES:
        raise ValueError('thermal_properties.yaml 需要 1 至 501 行 thermal_properties')
    units = data.get('unit')
    if not isinstance(units, dict):
        raise ValueError('thermal_properties.yaml 缺少 unit 声明，不能猜测热力学单位')
    aliases = {'J/K/mol', 'J/mol/K', 'J/(mol K)', 'J/(K mol)'}
    if units.get('temperature') != 'K' or units.get('free_energy') != 'kJ/mol':
        raise ValueError('当前热性质导入要求文件声明 temperature: K 和 free_energy: kJ/mol')
    if units.get('entropy') not in aliases or units.get('heat_capacity') not in aliases:
        raise ValueError('当前热性质导入要求 entropy 与 heat_capacity 声明为 J/K/mol')
    result_rows = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('thermal_properties 每行须为对象')
        t = _number(row.get('temperature'), 'temperature', 0, 10000)
        f = _number(row.get('free_energy'), 'free_energy', -1e9, 1e9)
        s = _number(row.get('entropy'), 'entropy', -1e-6, 1e9)
        cv = _number(row.get('heat_capacity'), 'heat_capacity', -1e-6, 1e9)
        u = f * 1000 + t * s
        result_rows.append(_row(t, (f * 1000, u, s, cv)))
    if any(b['temperature'] <= a['temperature'] for a, b in zip(result_rows, result_rows[1:])):
        raise ValueError('导入热性质的温度必须严格递增')
    if 'band_index' in data:
        warnings.append('原文件含 band_index，热性质只含指定模式子集；其 natom 可能由所选带数推得，不能据此推断完整原胞的 3n 极限。')
        natom = None
    else:
        natom = _integer(data['natom'], 'natom', 1, 128) if 'natom' in data else None
    zpe = (_number(data['zero_point_energy'], 'zero_point_energy', 0, 1e9)
           if 'zero_point_energy' in data else None)
    warnings.append('这是既有 Phonopy 热性质的导入展示，内能由 U = F + TS 推得；导入过程不能验证原始网格收敛、频率单位或生产计算的稳定性。')
    if zpe is None:
        warnings.append('文件未声明 zero_point_energy，零点能保持未知，不以首行自由能代替。')
    total, included = data.get('num_modes'), data.get('num_integrated_modes')
    ratio = None
    if total is not None and included is not None:
        total = _integer(total, 'num_modes', 1, 1000000000000)
        included = _integer(included, 'num_integrated_modes', 0, total)
        ratio = included / total
        if included < total:
            warnings.append(f'原文件仅积分 {included}/{total} 个模式；已有截止或排除操作，结果不能视为完整稳定声子谱的热性质。')
    elif total is not None or included is not None:
        warnings.append('原文件未同时提供 num_modes 与 num_integrated_modes，无法核验模式排除比例。')
    cutoff = data.get('cutoff_frequency')
    if cutoff is not None:
        cutoff = _number(cutoff, 'cutoff_frequency', -1e6, 1e6)
        if cutoff != 0:
            warnings.append(f'原文件声明 cutoff_frequency = {cutoff:g}，保留生产计算的频率截断信息。')
    if data.get('exclude_gamma_acoustic') is True:
        warnings.append('原文件明确排除了 Γ 点声学模式；展示保留这一有限网格近似，不补回缺失贡献。')
    series = {'id': 'thermal', 'label': '导入 Phonopy 热性质', 'rows': result_rows,
              'zeroPointEnergy': zpe, 'zeroPointEnergyCell': None if zpe is None else zpe * 1000 / EV_MOLAR,
              'natom': natom, 'modeCount': None if natom is None or ratio is None else 3 * natom * ratio,
              'expectedModeCount': None if natom is None else 3 * natom,
              'highTemperatureLimit': None, 'imported': True,
              'numModes': total, 'numIntegratedModes': included, 'cutoffFrequency': cutoff,
              'internalEnergyDerived': True}
    return series, natom


def run(payload):
    """Return model/mesh/DOS/Phonopy rows with molar and per-cell units."""
    if not isinstance(payload, dict):
        raise ValueError('输入必须是对象')
    source = payload.get('source', 'compare')
    if source not in ('compare', 'einstein', 'debye', 'mesh', 'dos', 'thermal'):
        raise ValueError('source 必须为 compare、einstein、debye、mesh、dos 或 thermal')
    warnings = []
    assumptions = ['固定体积谐近似；F、U 与零点能仅为振动贡献，不含静态电子基态能。',
                   '1 mol 表示阿伏伽德罗常数个所用原胞，不自动等同于 1 mol 化学式单位。',
                   '计算的是定容热容 Cv；未计算 Cp、热膨胀、准谐体积优化或热导率。']
    series = []
    synthetic = source in ('compare', 'einstein', 'debye')
    if source == 'thermal':
        data = _parse(payload)
        synthetic = data.get('synthetic') is True
        item, natom = _import_thermal(payload, data, warnings)
        series.append(item)
    else:
        temperatures = _temps(payload)
        if source in ('compare', 'einstein', 'debye'):
            natom = _integer(payload.get('natom', 2), 'natom', 1, 128)
            if source in ('compare', 'einstein'):
                theta = _number(payload.get('theta_e', 400), 'Einstein 温度', 0.001, 100000)
                series.append(_sum_series([(theta, 3 * natom)], temperatures, 'einstein',
                                         'Einstein 单频教学模型', {'natom': natom, 'theta': theta,
                                         'modeCount': 3 * natom, 'expectedModeCount': 3 * natom,
                                         'highTemperatureLimit': 3 * natom * R}))
            if source in ('compare', 'debye'):
                theta = _number(payload.get('theta_d', 500), 'Debye 温度', 0.001, 100000)
                zpe = 9 / 8 * natom * R * theta / 1000
                series.append({'id': 'debye', 'label': 'Debye 三维连续谱教学模型',
                               'rows': [_row(t, _debye(theta, natom, t)) for t in temperatures],
                               'natom': natom, 'theta': theta, 'modeCount': 3 * natom,
                               'expectedModeCount': 3 * natom, 'highTemperatureLimit': 3 * natom * R,
                               'zeroPointEnergy': zpe, 'zeroPointEnergyCell': zpe * 1000 / EV_MOLAR})
            assumptions.append('Einstein 用 3n 个相同频率的模式；Debye 用归一化为 3n 的三维 ν² 连续谱。参数为教学选择，不是材料拟合值。')
        elif source == 'mesh':
            data = _parse(payload)
            synthetic = data.get('synthetic') is True
            item, natom = _mesh(payload, data, temperatures, warnings)
            series.append(item)
        else:
            item, natom = _dos(payload, temperatures, warnings)
            synthetic = item.get('synthetic') is True
            series.append(item)
    summary = {'seriesCount': len(series), 'temperatureCount': len(series[0]['rows']),
               'natom': natom, 'expectedModeCount': None if natom is None else 3 * natom,
               'dulongPetitLimit': None if natom is None else 3 * natom * R,
               'temperatureMin': series[0]['rows'][0]['temperature'],
               'temperatureMax': series[0]['rows'][-1]['temperature'],
               'synthetic': synthetic}
    if synthetic and source in ('mesh', 'thermal', 'dos'):
        warnings.insert(0, '文件明确标记为 synthetic 合成教学示例，不是材料实验或第一性原理结果。')
    imported = source in ('mesh', 'thermal', 'dos')
    units = {key: value.replace('primitive', 'input') for key, value in UNITS.items()} if imported else UNITS
    if imported:
        assumptions[1] = '导入量按文件的输入计算胞归一化；未验证其是否最小原胞。1 mol 为 N_A 个输入计算胞，不自动等于一摩尔原胞、原子或化学式单位。'
    return {'kind': 'phonon-thermodynamics', 'source': source,
            'basis': 'per-input-cell' if imported else 'per-primitive-cell',
            'basisLabel': '每输入计算胞' if imported else '每模型原胞',
            'units': units, 'series': series, 'summary': summary, 'warnings': warnings,
            'assumptions': assumptions, 'sources': SOURCES,
            'constants': {'h_Js': PLANCK, 'kB_JK': BOLTZMANN, 'NA_mol': AVOGADRO,
                          'R_J_molK': R, 'eV_J': EV}}
