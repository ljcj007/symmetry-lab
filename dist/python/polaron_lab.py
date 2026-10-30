"""Finite, one-electron Holstein dimer with two quantum local oscillators.

The oscillator energy W=hbar*omega, t, g, and Delta are in eV.  The two
zero-point energies are omitted.  X=b+b^dagger is dimensionless, not Angstrom.
Basis ordering is |electron site, n_0, n_1>; each n_i ranges from 0 to cutoff.
NumPy-only, intended for both CPython and the browser's Pyodide worker.
"""
import math
from functools import lru_cache
import numpy as np

RELEASE = '20261030-bridges1'
DEGENERACY_TOLERANCE = 1e-9
SOURCES = [
    {'id': 'holstein-original', 'title': 'T. Holstein (1959), Studies of polaron motion: Part I. The molecular-crystal model',
     'url': 'https://doi.org/10.1016/0003-4916(59)90002-8'},
    {'id': 'holstein-small', 'title': 'T. Holstein (1959), Studies of polaron motion: Part II. The small polaron',
     'url': 'https://doi.org/10.1016/0003-4916(59)90003-X'},
    {'id': 'epw-methods', 'title': 'H. Lee et al. (2023), Electron-phonon physics from first principles using the EPW code',
     'url': 'https://arxiv.org/abs/2302.08085'},
]


def _number(payload, key, default, lo, hi, integer=False):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f'{key} 必须是 {lo} 至 {hi} 的有限数值')
    if integer and int(value) != value:
        raise ValueError(f'{key} 必须为整数')
    return int(value) if integer else float(value)


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError('Holstein 输入必须为 JSON 对象')
    forbidden = set(payload) & {'temperature', 'particles', 'interactionU', 'sites', 'phonopy', 'selfConsistent', 'lengthUnit'}
    if forbidden:
        raise ValueError('本单电子、二站点、零温模型不接受 ' + ', '.join(sorted(forbidden)))
    return {
        'hopping': _number(payload, 'hopping', 1, 0, 3),
        'phononEnergy': _number(payload, 'phononEnergy', 1, .2, 3),
        'coupling': _number(payload, 'coupling', .8, 0, 3),
        'siteBias': _number(payload, 'siteBias', 0, -4, 4),
        'cutoff': _number(payload, 'cutoff', 6, 2, 10, True),
        'scanMaxCoupling': _number(payload, 'scanMaxCoupling', 1.6, 0, 3),
        'scanPoints': _number(payload, 'scanPoints', 7, 1, 9, True),
    }


@lru_cache(maxsize=10)
def operators(cutoff):
    size = cutoff + 1
    b = np.diag(np.sqrt(np.arange(1, size)), 1)
    one = np.eye(size)
    x0 = np.kron(b + b.T, one)
    x1 = np.kron(one, b + b.T)
    number0 = np.repeat(np.arange(size), size)
    number1 = np.tile(np.arange(size), size)
    site0 = np.diag([1., 0.])
    site1 = np.diag([0., 1.])
    return {
        'size': size, 'phononSize': size * size,
        'kinetic': -np.kron(np.array([[0., 1.], [1., 0.]]), np.eye(size * size)),
        'bias': np.repeat([.5, -.5], size * size),
        'phonons': np.tile(number0 + number1, 2),
        'interaction': np.kron(site0, x0) + np.kron(site1, x1),
        'x': (x0, x1),
    }


def hamiltonian(p, cutoff=None):
    cut = p['cutoff'] if cutoff is None else cutoff
    op = operators(cut)
    h = p['hopping'] * op['kinetic'] + p['coupling'] * op['interaction']
    h = h + np.diag(p['siteBias'] * op['bias'] + p['phononEnergy'] * op['phonons'])
    return h, op


def solve(p, cutoff=None):
    cut = p['cutoff'] if cutoff is None else cutoff
    h, op = hamiltonian(p, cut)
    eigenvalues, vectors = np.linalg.eigh(h)
    ground_indices = np.flatnonzero(eigenvalues - eigenvalues[0] <= DEGENERACY_TOLERANCE)
    ground_vectors = vectors[:, ground_indices]
    # Average over a numerically degenerate subspace rather than choosing a basis vector.
    rho = ground_vectors @ ground_vectors.T / len(ground_indices)
    size = cut + 1
    prob = np.diag(rho).reshape(2, size, size)
    density = prob.sum(axis=(1, 2))
    phonon_distributions = np.array([prob.sum(axis=(0, 2)), prob.sum(axis=(0, 1))])
    phonon_occupations = phonon_distributions @ np.arange(size)
    corr = np.array([[np.trace(rho[i*size*size:(i+1)*size*size, i*size*size:(i+1)*size*size] @ x)
                      for x in op['x']] for i in range(2)])
    displacement = corr.sum(axis=0)
    conditional = [[float(corr[i, j] / density[i]) if density[i] > 1e-12 else None
                    for j in range(2)] for i in range(2)]
    electronic_rho = np.trace(rho.reshape(2, size*size, 2, size*size), axis1=1, axis2=3)
    kinetic = float(p['hopping'] * np.trace(rho @ op['kinetic']))
    phonon = float(p['phononEnergy'] * phonon_occupations.sum())
    interaction = float(p['coupling'] * np.trace(corr))
    potential = float(p['siteBias'] * (density[0] - density[1]) / 2)
    energy = float(np.mean(eigenvalues[ground_indices]))
    union_top = float(prob[:, -1, :].sum() + prob[:, :, -1].sum() - prob[:, -1, -1].sum())
    levels = []
    for value in eigenvalues:
        if not levels or value - levels[-1]['energy'] > DEGENERACY_TOLERANCE:
            levels.append({'energy': float(value), 'relativeEnergy': float(value-energy), 'degeneracy': 1})
        else:
            levels[-1]['degeneracy'] += 1
    ground = {
        'energy': energy, 'degeneracy': int(len(ground_indices)), 'density': density.tolist(),
        'phononOccupation': phonon_occupations.tolist(), 'displacement': displacement.tolist(),
        'densityDisplacement': corr.tolist(), 'conditionalDisplacement': conditional,
        'phononDistributions': phonon_distributions.tolist(), 'electronicDensityMatrix': electronic_rho.tolist(),
        'electronicPurity': float(np.trace(electronic_rho @ electronic_rho)),
        'bondCoherence': float(2 * electronic_rho[0, 1]),
        'topLevelProbability': phonon_distributions[:, -1].tolist(), 'eitherTopLevelProbability': union_top,
        'energyParts': {'hopping': kinetic, 'phonon': phonon, 'coupling': interaction, 'bias': potential},
    }
    checks = {
        'hermiticityResidual': float(np.max(abs(h-h.T))),
        'eigenResidual': float(np.max(abs(h @ ground_vectors - ground_vectors * eigenvalues[ground_indices]))),
        'particleNumberResidual': abs(float(density.sum())-1),
        'phononProbabilityResidual': float(np.max(abs(phonon_distributions.sum(axis=1)-1))),
        'energyDecompositionResidual': abs(energy-kinetic-phonon-interaction-potential),
        'electronicDensityTraceResidual': abs(float(np.trace(electronic_rho))-1),
        'electronicDensityMinimumEigenvalue': float(np.linalg.eigvalsh(electronic_rho)[0]),
        'dimension': len(eigenvalues), 'groundDegeneracyToleranceEV': DEGENERACY_TOLERANCE,
    }
    checks['passed'] = bool(all(value < 1e-8 for key, value in checks.items() if key.endswith('Residual'))
                            and checks['electronicDensityMinimumEigenvalue'] > -1e-10)
    return {'ground': ground, 'levels': levels, 'eigenvalues': eigenvalues.tolist(), 'checks': checks}


def calculate(payload):
    p = parameters(payload)
    result = solve(p)
    fine = solve(p, p['cutoff'] + 1)
    g, f = result['ground'], fine['ground']
    energy_change = abs(g['energy']-f['energy'])
    occupation_change = float(np.max(abs(np.array(g['phononOccupation'])-f['phononOccupation'])))
    density_change = float(np.max(abs(np.array(g['density'])-f['density'])))
    correlation_change = float(np.max(abs(np.array(g['densityDisplacement'])-f['densityDisplacement'])))
    converged = bool(energy_change < 1e-4 and max(occupation_change, density_change, correlation_change) < .01
                     and max(g['topLevelProbability']) < 1e-3)
    convergence = {'cutoff': p['cutoff'], 'comparisonCutoff': p['cutoff']+1,
                   'energyChangeEV': energy_change, 'phononOccupationChange': occupation_change,
                   'densityChange': density_change, 'correlationChange': correlation_change,
                   'comparisonEnergy': f['energy'], 'comparisonTopLevelProbability': f['topLevelProbability'],
                   'energyToleranceEV': 1e-4, 'observableTolerance': .01, 'topProbabilityTolerance': 1e-3,
                   'converged': converged,
                   'description': '仅比较相邻截断；通过阈值是局部收敛诊断，不能证明任意参数的严格误差界。'}
    scan = []
    scan_values = np.linspace(0, p['scanMaxCoupling'], p['scanPoints']) if p['scanPoints'] > 1 else [p['coupling']]
    for coupling in scan_values:
        row = solve({**p, 'coupling': float(coupling)})['ground']
        scan.append({'coupling': float(coupling), 'energy': row['energy'],
                     'phonons': sum(row['phononOccupation']), 'coherence': row['bondCoherence'],
                     'localCorrelation': sum(row['densityDisplacement'][i][i] for i in range(2)),
                     'maxTopProbability': max(row['topLevelProbability'])})
    def series(key, label):
        return {'label': label, 'points': [[row['coupling'], row[key]] for row in scan]}
    plots = [
        {'id': 'phonons', 'title': '两个局域振子的声子数概率', 'xLabel': '声子数 n', 'yLabel': '概率',
         'series': [{'label': f'振子 {i}', 'points': [[n, prob] for n, prob in enumerate(g['phononDistributions'][i])]} for i in range(2)]},
        {'id': 'cloud', 'title': '电子在哪里，振动云就怎样改变', 'xLabel': '被观察振子 j', 'yLabel': '条件位移 ⟨X_j⟩_{n_i=1}',
         'series': [{'label': f'条件：电子在站点 {i}', 'points': [[j, val] for j, val in enumerate(g['conditionalDisplacement'][i])]} for i in range(2)]},
        {'id': 'scan', 'title': '相同声子截断下的耦合扫描', 'xLabel': 'g（eV）', 'yLabel': '基态能量（eV）', 'series': [series('energy', 'E_0')]},
        {'id': 'observables', 'title': '振动云与电子离域的共同变化', 'xLabel': 'g（eV）', 'yLabel': '无量纲',
         'series': [series('phonons', '总声子数'), series('coherence', '键相干度 2 Re ρ_{01}') ]},
        {'id': 'cutoff', 'title': '扫描中每个点都要检查截断', 'xLabel': 'g（eV）', 'yLabel': '最高声子层概率',
         'series': [series('maxTopProbability', '两个振子中的较大值')]},
    ]
    warnings = [
        '模型固定二站点、单电子、零温和一个固定自旋分量；没有电子间排斥、有限温度或真实材料参数拟合。',
        'ℏω、t、g、Δ 的单位均为 eV；ω不是直接输入的THz数值。H省略两个振子的总零点能ℏω，X=b+b†无量纲，未换算为Å。',
        '正g使被电子占据的振子向负X偏移；ε_0=+Δ/2、ε_1=−Δ/2。输入g是局域能量耦合，不是无量纲λ。',
        '结果来自声子截断矩阵的精确对角化；需另查声子截断误差。数值残差小不意味着物理截断已收敛。',
        '扫描固定当前声子截断，各点只报告最高层概率；仅当前参数额外做相邻更高截断比较。扫描连线不证明无穷体系相变。',
        '对称体系的均匀电子密度可与电子—声子关联共存；不能因⟨n_0⟩=⟨n_1⟩就断言没有极化子。二站点模型也不定义宏观极化子半径。',
        '简并基态按10⁻⁹ eV容差等权平均，条件位移在电子占据概率低于10⁻¹²时留空；电子约化纯度描述混合程度，简并混态时不直接当作纠缠量。',
        '这不是SSH键耦合、自洽晶格结构弛豫或EPW第一性原理计算；已有声子频率文件本身不能提供这里的电子—声子耦合g。',
    ]
    if not converged:
        warnings.insert(0, '当前声子截断未通过相邻截断诊断，请提高截断或减小g/ℏω后比较；图中结果仅代表当前有限基底。')
    if any(row['maxTopProbability'] >= 1e-3 for row in scan):
        warnings.insert(0, '耦合扫描中存在最高声子层概率不小于10⁻³的点；这些点不能按已收敛结果解读。')
    summary = [
        {'label': '当前 / 对照矩阵维数', 'value': f"{result['checks']['dimension']} / {fine['checks']['dimension']}"},
        {'label': '基态能量（省略零点能）', 'value': g['energy'], 'unit': 'eV'},
        {'label': '基态简并度', 'value': g['degeneracy']},
        {'label': '总声子数', 'value': sum(g['phononOccupation'])},
        {'label': '电子约化纯度', 'value': g['electronicPurity']},
        {'label': '相邻截断能量变化', 'value': energy_change, 'unit': 'eV'},
        {'label': '相邻截断诊断', 'value': '通过当前阈值' if converged else '尚未收敛，请检查'},
    ]
    tables = [
        {'title': '电子与振子的局域量', 'columns': ['站点', '⟨n_i⟩', '⟨b_i†b_i⟩', '⟨X_i⟩', '最高声子层概率'],
         'rows': [[i, g['density'][i], g['phononOccupation'][i], g['displacement'][i], g['topLevelProbability'][i]] for i in range(2)]},
        {'title': '电子—位移关联 ⟨n_i X_j⟩', 'columns': ['电子站点 i / 振子 j', 0, 1],
         'rows': [[i, *row] for i, row in enumerate(g['densityDisplacement'])]},
        {'title': '条件位移 ⟨n_i X_j⟩/⟨n_i⟩', 'columns': ['电子站点 i / 振子 j', 0, 1],
         'rows': [[i, *row] for i, row in enumerate(g['conditionalDisplacement'])]},
        {'title': '电子约化密度矩阵（站点基）', 'columns': ['i / j', 0, 1],
         'rows': [[i, *row] for i, row in enumerate(g['electronicDensityMatrix'])]},
        {'title': '最低十二个不同能级组', 'columns': ['组', '能量（eV）', '相对基态（eV）', '简并度'],
         'rows': [[i, row['energy'], row['relativeEnergy'], row['degeneracy']] for i, row in enumerate(result['levels'][:12])]},
        {'title': '基态能量分项', 'columns': ['项', '能量（eV）'], 'rows': list(g['energyParts'].items())},
        {'title': '相邻截断检查', 'columns': ['量', '值'], 'rows': [[key, value] for key, value in convergence.items()]},
    ]
    formula_links = [
        {'id': 'holstein-interaction', 'label': '局域电子—声子耦合', 'formula': 'H_{ep}=g Σ_i n_i X_i；X_i=b_i+b_i†',
         'meaning': '耦合调制位点能；g单位eV、X无量纲。正g对应被占据振子的负位移。它不调制跃迁t。',
         'values': [{'label': 'g（eV）', 'value': p['coupling']}, {'label': '⟨H_{ep}⟩（eV）', 'value': g['energyParts']['coupling']}], 'plot': 'scan'},
        {'id': 'holstein-cloud', 'label': '条件振动云', 'formula': '⟨X_j⟩_{n_i=1}=⟨n_i X_j⟩/⟨n_i⟩',
         'meaning': '固定电子所在站点后读取振动云；该关联可以存在于电子密度均匀的对称基态。分母小于10⁻¹²时不定义。',
         'values': [{'label': '⟨n_0⟩', 'value': g['density'][0]}, {'label': '⟨n_0 X_0⟩', 'value': g['densityDisplacement'][0][0]}], 'plot': 'cloud'},
        {'id': 'holstein-phonons', 'label': '声子数与零点能约定', 'formula': 'E_{ph}=ℏω Σ_i ⟨b_i†b_i⟩',
         'meaning': '两个振子的总零点能ℏω已从Hamiltonian中省略，位移仍是量子算符；不代表没有零点涨落。',
         'values': [{'label': 'ℏω（eV）', 'value': p['phononEnergy']}, {'label': '总声子数', 'value': sum(g['phononOccupation'])}], 'plot': 'phonons'},
        {'id': 'holstein-cutoff', 'label': '声子截断诊断', 'formula': 'δE=|E_0(N_{max}+1)−E_0(N_{max})|',
         'meaning': '相邻截断的能量差须连同局域量变化和最高声子层概率一起判断。当前参数做双截断，扫描仅做最高层概率检查。',
         'values': [{'label': 'N_{max}', 'value': p['cutoff']}, {'label': 'δE（eV）', 'value': energy_change}], 'plot': 'cutoff'},
    ]
    return {'release': RELEASE, 'parameters': p, 'summary': summary, 'plots': plots, 'tables': tables, 'formulaLinks': formula_links,
            'ground': g, 'levels': result['levels'], 'eigenvalues': result['eigenvalues'], 'scan': scan,
            'convergence': convergence, 'warnings': warnings, 'checks': result['checks'], 'sources': SOURCES}
