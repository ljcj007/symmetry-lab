"""Finite Hubbard Lehmann spectra, with explicit fermion signs and sum rules.

Only NumPy and the existing hubbard_lab are needed in the browser.  Energies,
including the horizontal spectral coordinate and Lorentzian HWHM, are in eV.
The initial density matrix is the equal mixture of the fixed (Nup,Ndown)
sector's ground eigenspace.  No temperature or thermodynamic limit is implied.
"""
import math
import numpy as np
import hubbard_lab as hub

RELEASE = '20261030-bridges1'
WEIGHT_TOL = 1e-13
SOURCES = [
    {'id': 'manybody-lehmann', 'title': 'TRIQS: atomic retarded Green function from the Lehmann representation',
     'url': 'https://triqs.github.io/triqs/latest/documentation/cpp_api/triqs/atom_diag/atomic_g_w.html'},
    {'id': 'manybody-hubbard', 'title': 'Hubbard (1963), Electron correlations in narrow energy bands',
     'url': 'https://doi.org/10.1098/rspa.1963.0204'},
    {'id': 'manybody-dimer', 'title': 'Carrascal et al. (2015), The Hubbard Dimer: a density functional case study',
     'url': 'https://arxiv.org/abs/1502.02194'},
]


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError('多体光谱输入必须为 JSON 对象')
    allowed = {'experiment', 'sites', 'nUp', 'nDown', 'hopping', 'interactionU',
               'alternatingPotential', 'boundary', 'probe', 'site', 'q', 'spin',
               'chemicalPotential', 'responseKind', 'eta', 'points'}
    unsupported = set(payload) - allowed
    if unsupported:
        raise ValueError('本有限团簇零温实验不接受参数：' + ', '.join(sorted(unsupported)))
    n = hub._number(payload, 'sites', 2, 2, 4, True)
    p = {
        'sites': n, 'nUp': hub._number(payload, 'nUp', 1, 0, n, True),
        'nDown': hub._number(payload, 'nDown', 1, 0, n, True),
        'hopping': hub._number(payload, 'hopping', 1, 0, 3),
        'interactionU': hub._number(payload, 'interactionU', 4, 0, 30),
        'alternatingPotential': hub._number(payload, 'alternatingPotential', 0, -10, 10),
        'q': hub._number(payload, 'q', 1, -2, 2),
        'site': hub._number(payload, 'site', 0, 0, n-1, True),
        'chemicalPotential': hub._number(payload, 'chemicalPotential', 2, -20, 40),
        'eta': hub._number(payload, 'eta', .08, .01, .8),
        'points': hub._number(payload, 'points', 601, 201, 1201, True),
    }
    for key, default, choices in [
        ('experiment', 'single_particle', ('single_particle', 'response')),
        ('boundary', 'open', ('open', 'periodic')),
        ('probe', 'local', ('local', 'momentum')),
        ('spin', 'up', ('up', 'down')),
        ('responseKind', 'spin', ('spin', 'charge')),
    ]:
        value = payload.get(key, default)
        if value not in choices:
            raise ValueError(key + ' 必须为 ' + ' / '.join(choices))
        p[key] = value
    return p


def probe_coefficients(p):
    if p['probe'] == 'local':
        coefficients = np.zeros(p['sites'], dtype=complex)
        coefficients[p['site']] = 1
        return coefficients
    return np.exp(-1j * math.pi * p['q'] * np.arange(p['sites'])) / math.sqrt(p['sites'])


def rectangular_fermion(source_basis, target_basis, coefficients, offset, create):
    """Matrix for c or c†; coefficients are conjugated for its adjoint."""
    lookup = {state: i for i, state in enumerate(target_basis)}
    result = np.zeros((len(target_basis), len(source_basis)), dtype=complex)
    for col, state in enumerate(source_basis):
        for i, coefficient in enumerate(coefficients):
            applied = hub.fermion_action(state, ((i + offset, create),))
            if applied is not None and applied[0] in lookup:
                result[lookup[applied[0]], col] += applied[1] * (coefficient.conjugate() if create else coefficient)
    return result


def _state_observables(vectors, ops):
    probability = np.sum(abs(vectors)**2, axis=1) / vectors.shape[1]
    return _probability_observables(probability, ops)


def _probability_observables(probability, ops):
    return {
        'density': (probability @ ops['density']).tolist(),
        'densityUp': (probability @ ops['up']).tolist(),
        'densityDown': (probability @ ops['down']).tolist(),
        'localSz': (probability @ ops['sz']).tolist(),
        'totalDoubleOccupancy': float(probability @ np.sum(ops['double'], axis=1)),
    }


def grouped_weights(energies, vectors, acted_ground):
    """Trace over initial and final eigenspaces, not arbitrary eigenvectors."""
    coefficients = vectors.conj().T @ acted_ground
    initial_degeneracy = acted_ground.shape[1]
    return [(group, float(np.sum(abs(coefficients[group, :])**2) / initial_degeneracy))
            for group in hub.energy_groups(energies)]


def _diagonalize(p, nup, ndown):
    h, ops = hub.hamiltonian(p, nup, ndown)
    energies, vectors = np.linalg.eigh(h)
    residual = float(np.max(abs(h @ vectors - vectors * energies)))
    return h, ops, energies, vectors, residual


def calculate(payload):
    p = parameters(payload)
    n = p['sites']
    h, ops, energies, vectors, residual = _diagonalize(p, p['nUp'], p['nDown'])
    initial_group = hub.energy_groups(energies)[0]
    initial = vectors[:, initial_group]
    g = len(initial_group)
    e0 = float(np.mean(energies[initial_group]))
    rho = initial @ initial.conj().T / g
    initial_observables = _state_observables(initial, ops)
    coefficients = probe_coefficients(p)
    initial_sector = {'nUp': p['nUp'], 'nDown': p['nDown'], 'particles': p['nUp'] + p['nDown']}
    transitions = []
    all_lines = []
    sum_rules = {}
    checks = {'hermiticityResidual': float(np.max(abs(h-h.conj().T))),
              'eigenResidual': residual, 'initialDensityTraceResidual': abs(float(np.trace(rho).real)-1),
              'energyDegeneracyToleranceEV': hub.ENERGY_TOLERANCE}

    def add_lines(kind, target_ops, target_energies, target_vectors, acted,
                  final_nup, final_ndown, energy_sign=1):
        for gi, (group, weight) in enumerate(grouped_weights(target_energies, target_vectors, acted)):
            final_energy = float(np.mean(target_energies[group]))
            transfer = final_energy - e0
            coordinate = (energy_sign * transfer - p['chemicalPotential']
                          if p['experiment'] == 'single_particle' else transfer)
            all_lines.append((kind, coordinate, weight))
            if weight <= WEIGHT_TOL:
                continue
            final_projection = target_vectors[:, group] @ (target_vectors[:, group].conj().T @ acted)
            conditional_probability = np.sum(abs(final_projection)**2, axis=1) / (g*weight)
            transitions.append({
                'id': kind + '-' + str(gi), 'kind': kind, 'energy': coordinate, 'weight': weight,
                'energyTransfer': transfer, 'initialEnergy': e0, 'finalEnergy': final_energy,
                'initialDegeneracy': g, 'finalDegeneracy': len(group),
                'initialParticles': initial_sector['particles'], 'finalParticles': final_nup + final_ndown,
                'initialSector': initial_sector.copy(), 'finalSector': {'nUp': final_nup, 'nDown': final_ndown},
                'initialState': '所选扇区的基态子空间等权混合',
                'finalState': f'末态能级组 {gi}（简并度 {len(group)}）',
                'initialObservables': initial_observables,
                'finalObservables': _probability_observables(conditional_probability, target_ops),
                'finalGroupAverageObservables': _state_observables(target_vectors[:, group], target_ops),
                'finalObservablesConvention': '条件末态ρ_f=P_f O ρ_0 O† P_f / w_f；完整初态简并平均与末态投影均保留。',
                'zeroEnergy': bool(abs(transfer) <= hub.ENERGY_TOLERANCE),
            })

    if p['experiment'] == 'single_particle':
        offset = 0 if p['spin'] == 'up' else n
        expected_remove = 0.
        for create, kind in [(False, 'removal'), (True, 'addition')]:
            delta = 1 if create else -1
            target_up = p['nUp'] + (delta if p['spin'] == 'up' else 0)
            target_down = p['nDown'] + (delta if p['spin'] == 'down' else 0)
            if not (0 <= target_up <= n and 0 <= target_down <= n):
                sum_rules[kind + 'Weight'] = 0.
                continue
            _, tops, te, tv, tr = _diagonalize(p, target_up, target_down)
            checks['eigenResidual'] = max(checks['eigenResidual'], tr)
            operator = rectangular_fermion(ops['basis'], tops['basis'], coefficients, offset, create)
            acted = operator @ initial
            norm_weight = float(np.sum(abs(acted)**2) / g)
            if not create:
                expected_remove = norm_weight
            before = len(all_lines)
            add_lines(kind, tops, te, tv, acted, target_up, target_down, 1 if create else -1)
            sum_rules[kind + 'Weight'] = sum(row[2] for row in all_lines[before:])
            checks[kind + 'CompletenessResidual'] = abs(sum_rules[kind + 'Weight'] - norm_weight)
        sum_rules.update({'probeOccupation': expected_remove, 'expectedRemovalWeight': expected_remove,
                          'expectedAdditionWeight': 1 - expected_remove, 'expectedTotalWeight': 1.})
        checks['anticommutatorSumResidual'] = abs(sum_rules['additionWeight'] + sum_rules['removalWeight'] - 1)
        checks['occupationSumResidual'] = abs(sum_rules['removalWeight'] - expected_remove)
        # The first spectral moment is an independent local density/one-body test.
        one_body = np.diag([(-1)**i * p['alternatingPotential'] / 2 for i in range(n)])
        for i, j in hub.bonds(n, p['boundary']):
            one_body[i, j] = one_body[j, i] = -p['hopping']
        opposite = initial_observables['densityDown' if p['spin'] == 'up' else 'densityUp']
        expected_moment = float(np.real(coefficients @ one_body @ coefficients.conj())
                                + p['interactionU'] * np.dot(abs(coefficients)**2, opposite)
                                - p['chemicalPotential'])
        actual_moment = sum(energy * weight for _, energy, weight in all_lines)
        sum_rules.update({'firstMomentEV': actual_moment, 'expectedFirstMomentEV': expected_moment})
        checks['firstMomentResidual'] = abs(actual_moment - expected_moment)
        response_metadata = None
    else:
        values = ops['sz'] if p['responseKind'] == 'spin' else ops['density']
        diagonal = values @ coefficients
        mean = complex(np.dot(np.diag(rho), diagonal))
        connected = diagonal - mean
        acted = connected[:, None] * initial
        add_lines(p['responseKind'], ops, energies, vectors, acted, p['nUp'], p['nDown'])
        equal_time = float(np.dot(np.diag(rho).real, abs(connected)**2))
        integrated = sum(weight for _, _, weight in all_lines)
        zero_weight = sum(weight for _, energy, weight in all_lines if abs(energy) <= hub.ENERGY_TOLERANCE)
        sum_rules.update({'totalWeight': integrated, 'connectedEqualTime': equal_time,
                          'zeroEnergyWeight': zero_weight, 'inelasticWeight': integrated-zero_weight,
                          'subtractedCoherentWeight': abs(mean)**2, 'expectedTotalWeight': equal_time})
        checks['equalTimeSumResidual'] = abs(integrated-equal_time)
        checks['negativeExcitationResidual'] = max([max(0., -e) for _, e, w in all_lines if w > WEIGHT_TOL] or [0.])
        # Sum_f (Ef-E0)|<f|O|0>|² = Tr rho O†(H-E0)O.
        moment = float(np.real(np.trace(acted.conj().T @ (h-e0*np.eye(len(h))) @ acted)) / g)
        spectral_moment = sum(energy*weight for _, energy, weight in all_lines)
        sum_rules.update({'firstMomentEV': spectral_moment, 'expectedFirstMomentEV': moment})
        checks['firstMomentResidual'] = abs(spectral_moment-moment)
        response_metadata = {'operator': 'S_z' if p['responseKind'] == 'spin' else 'n',
                             'meanReal': mean.real, 'meanImag': mean.imag,
                             'connected': True, 'spinConvention': 'S_z=(n_up-n_down)/2, hbar=1',
                             'zeroEnergyConvention': '减去平均值只去除相干平均；简并混合态的零能涨落仍保留。'}

    transitions.sort(key=lambda row: (row['energy'], row['kind'], row['id']))
    nonzero = [(kind, energy, weight) for kind, energy, weight in all_lines if weight > WEIGHT_TOL]
    checks['omittedTinyWeight'] = sum(weight for _, _, weight in all_lines if weight <= WEIGHT_TOL)
    line_energies = [e for _, e, _ in nonzero] or [0.]
    lo = min(0., min(line_energies))
    hi = max(0., max(line_energies))
    margin = max(.15*max(1., hi-lo), 12*p['eta'])
    lo, hi = lo-margin, hi+margin
    x = np.linspace(lo, hi, p['points'])
    channels = ('addition', 'removal') if p['experiment'] == 'single_particle' else (p['responseKind'],)
    arrays = {channel: np.zeros_like(x) for channel in channels}
    green = np.zeros_like(x, dtype=complex)
    for kind, center, weight in nonzero:
        pole = weight / (x-center + 1j*p['eta'])
        arrays[kind] += -pole.imag/math.pi
        if p['experiment'] == 'single_particle':
            green += pole
    total = sum(arrays.values())
    captured = sum(weight/math.pi*(math.atan((hi-center)/p['eta']) - math.atan((lo-center)/p['eta']))
                   for _, center, weight in nonzero)
    discrete_weight = sum(weight for _, _, weight in all_lines)
    sum_rules.update({'discreteWeight': discrete_weight, 'windowCapturedWeight': captured,
                      'windowMissingLorentzianWeight': discrete_weight-captured})
    checks['gridStepEV'] = float(x[1]-x[0])
    checks['gridResolvesHWHM'] = bool(x[1]-x[0] <= p['eta']/3)
    checks['finiteNonnegativeSpectrum'] = bool(np.all(np.isfinite(total)) and np.min(total) >= 0)
    checks['passed'] = bool(checks['finiteNonnegativeSpectrum'] and checks['omittedTinyWeight'] < 1e-10
                            and all(v < 1e-8 for k, v in checks.items() if k.endswith('Residual')))
    ground_global = hub.total_number_ground(p, initial_sector['particles'])
    ground_excess = e0-ground_global['energy']
    labels = {'addition': '添加电子', 'removal': '移除电子', 'spin': '纵向自旋连通谱', 'charge': '电荷连通谱'}
    energy_label = 'E−μ（eV）' if p['experiment'] == 'single_particle' else '能量转移 E（eV）'
    spectrum = {'energy': x.tolist(), 'total': total.tolist(),
                'channels': {kind: arr.tolist() for kind, arr in arrays.items()}}
    if p['experiment'] == 'single_particle':
        spectrum.update({'greenReal': green.real.tolist(), 'greenImag': green.imag.tolist()})
    summary = [{'label': '初态扇区维数', 'value': len(energies)},
               {'label': '初态基态能量', 'value': e0, 'unit': 'eV'},
               {'label': '初态简并度', 'value': g},
               {'label': '离散跃迁总权重', 'value': discrete_weight},
               {'label': '理论和规则', 'value': sum_rules['expectedTotalWeight']},
               {'label': '绘图窗口内的解析面积', 'value': captured},
               {'label': '所选扇区高于同 N 最低态', 'value': ground_excess, 'unit': 'eV'}]
    if response_metadata is not None:
        summary.append({'label': '残余零能权重', 'value': sum_rules['zeroEnergyWeight']})
    else:
        summary.append({'label': '归一探针占据数', 'value': sum_rules['probeOccupation']})
    plots = [{'id': 'lehmann-spectrum', 'title': '离散 Lehmann 权重经 Lorentz 展宽后的谱', 'xLabel': energy_label,
              'yLabel': '谱密度（eV⁻¹）',
              'series': [{'label': labels[kind], 'points': np.column_stack((x, arr)).tolist()}
                         for kind, arr in arrays.items()]}]
    if p['experiment'] == 'single_particle':
        plots.append({'id': 'retarded-green', 'title': '同一组跃迁的迟致格林函数', 'xLabel': energy_label,
                      'yLabel': 'G^R（eV⁻¹）', 'series': [
                          {'label': 'Re G^R', 'points': np.column_stack((x, green.real)).tolist()},
                          {'label': 'Im G^R', 'points': np.column_stack((x, green.imag)).tolist()}]})
    tables = [
        {'title': '可点击谱峰的离散初末态数据',
         'columns': ['ID', '通道', energy_label, '权重', '初态 N', '末态 N', '初态能量', '末态能量', '初态简并度', '末态简并度'],
         'rows': [[r['id'], labels[r['kind']], r['energy'], r['weight'], r['initialParticles'],
                   r['finalParticles'], r['initialEnergy'], r['finalEnergy'], r['initialDegeneracy'], r['finalDegeneracy']]
                  for r in transitions]},
        {'title': '谱和规则与有限绘图窗口', 'columns': ['量', '数值'], 'rows': [[k, v] for k, v in sum_rules.items()]},
        {'title': '初态的简并子空间平均', 'columns': ['站点', '⟨n_{i↑}⟩', '⟨n_{i↓}⟩', '⟨S_{zi}⟩'],
         'rows': [[i, initial_observables['densityUp'][i], initial_observables['densityDown'][i],
                   initial_observables['localSz'][i]] for i in range(n)]},
    ]
    warnings = [
        '仅计算2–4站点单带Hubbard模型的零温有限团簇；不给出真实材料绝对光电子截面、热力学Mott相图或自洽有限温度结果。',
        '初态固定N↑、N↓；10⁻⁹ eV内的基态按子空间等权平均。末态简并能级的跃迁权重合并求迹，不依赖任选的本征向量。固定Sz平均不等于完整自旋多重态的热平均。',
        '探针为一个局域轨道，或c_q=L⁻¹ᐟ²Σ_j exp(−iπqj)c_j；输入q=qa/π，j从0编号。开放链及非允许环动量是有限链傅里叶探针，不是严格晶格动量量子数。',
        'η是Lorentz线形半高半宽，单位eV；仅用于显示，不是已计算的电子寿命或退相干率。和规则使用离散权重；有限绘图窗口缺失的Lorentz尾部不重新归一化。',
        '两站点周期边界只有一条无向键；三站点周期边界是三角环。电子轨道排序为全部上自旋、随后全部下自旋；所有增减操作保留费米符号。',
        '点击跃迁后的末态密度按P_f Oρ₀O†P_f/w_f归一化，是该能级组的条件末态；另行导出整个末态能级组的等权平均，二者不必相同。',
    ]
    if p['experiment'] == 'single_particle':
        warnings.append('只显示选定自旋的一个归一探针：移除权重=⟨c†c⟩、添加权重=1−⟨c†c⟩，总权重为1。μ只设谱的能量零点，不重新选择初态粒子数；μ任取时添加/移除峰不保证分居正负半轴。')
    else:
        warnings.append('响应是连通纵向S_z或密度算符的S(q,E)，不是完整矢量自旋谱或χ。只减去算符平均值；简并混合态可仍有零能涨落。零温离散激发E≥0，负E处绘图尾部仅来自对称Lorentz展宽。μ与spin字段不影响此响应。')
    if not checks['gridResolvesHWHM']:
        warnings.append('当前能量网格不足以每个半宽包含3个间隔；细峰高度可能欠采样，请增加采样点或增大显示半宽。离散峰权重与和规则仍独立计算。')
    if ground_excess > 1e-8:
        warnings.append('当前自旋扇区最低态高于同总N的最低态；本结果描述受自旋约束的初态，不能当成无约束系统基态光谱。')
    formula_links = [{
        'id': 'lorentz-width', 'label': '线宽怎样改变曲线而保持离散权重',
        'formula': 'L_η(E−E_f)=η/[π((E−E_f)^2+η^2)]',
        'meaning': 'η是显示线形的半高半宽；离散权重不随η变化，有限窗口面积小于完整积分。',
        'values': [{'label': 'η（eV）', 'value': p['eta']},
                   {'label': '离散总权重', 'value': discrete_weight},
                   {'label': '窗口内解析面积', 'value': captured}], 'plot': 'lehmann-spectrum',
    }]
    if p['experiment'] == 'single_particle':
        formula_links.extend([
            {'id': 'fermion-sum', 'label': '由反对易关系检查每个峰的面积',
             'formula': 'Σ_f w_f^{−}=⟨c†c⟩；Σ_f w_f^{+}=1−⟨c†c⟩',
             'meaning': '选定自旋的归一探针只贡献一个轨道的总谱权重；峰高不是占据概率。',
             'values': [{'label': '探针占据', 'value': sum_rules['probeOccupation']},
                        {'label': '移除权重', 'value': sum_rules['removalWeight']},
                        {'label': '添加权重', 'value': sum_rules['additionWeight']}], 'plot': 'lehmann-spectrum'},
            {'id': 'retarded-poles', 'label': '同一组跃迁构成迟致格林函数',
             'formula': 'G^R(E)=Σ_f w_f/(E−E_f+iη)；A(E)=−Im G^R(E)/π',
             'meaning': '横轴能量已减去μ；改变μ只平移所有添加和移除峰，不改变固定粒子数的初态。',
             'values': [{'label': 'μ（eV）', 'value': p['chemicalPotential']},
                        {'label': '初态E₀（eV）', 'value': e0},
                        {'label': '谱的一阶矩（eV）', 'value': sum_rules['firstMomentEV']}], 'plot': 'retarded-green'},
        ])
    else:
        formula_links.append({
            'id': 'response-sum', 'label': '把动态谱积分接回等时涨落',
            'formula': 'Σ_f w_f=Tr(ρ_0 δO†δO)；δO=O−Tr(ρ_0 O)I',
            'meaning': '连通谱移除相干平均；在简并基态混合中，剩余零能涨落仍属于和规则。',
            'values': [{'label': '等时连通涨落', 'value': sum_rules['connectedEqualTime']},
                       {'label': '零能权重', 'value': sum_rules['zeroEnergyWeight']},
                       {'label': '非弹性权重', 'value': sum_rules['inelasticWeight']}], 'plot': 'lehmann-spectrum',
        })
    return {'release': RELEASE, 'parameters': p, 'summary': summary, 'plots': plots, 'tables': tables,
            'formulaLinks': formula_links,
            'transitions': transitions, 'spectrum': spectrum, 'sumRules': sum_rules,
            'initial': {'energy': e0, 'degeneracy': g, 'dimension': len(energies),
                        'sector': initial_sector, 'observables': initial_observables,
                        'aboveSameNumberGroundEV': ground_excess},
            'response': response_metadata, 'checks': checks, 'warnings': warnings, 'sources': SOURCES}
