"""One/two spin-1/2 density matrices with a constant Lindblad generator.

NumPy-only, with an explicitly vectorized generator and a scaling/squaring
Taylor exponential (not a potentially defective Liouvillian eigendecomposition).
Basis: up, down; or up-up, up-down, down-up, down-down.  H/hbar and
temperatureScale are angular frequencies in rad/ns; rates are 1/ns.
"""
import math
import numpy as np

RELEASE = '20261030-bridges1'
I2 = np.eye(2, dtype=complex)
SX = np.array([[0, 1], [1, 0]], dtype=complex)
SY = np.array([[0, -1j], [1j, 0]], dtype=complex)
SZ = np.diag([1, -1]).astype(complex)
SM = np.array([[0, 0], [1, 0]], dtype=complex)
SOURCES = [
    {'id':'density-qutip-master', 'title':'QuTiP: Lindblad master equation and its assumptions',
     'url':'https://qutip.readthedocs.io/en/stable/guide/dynamics/dynamics-master.html'},
    {'id':'density-qutip-tensor', 'title':'QuTiP: Tensor products and partial traces',
     'url':'https://qutip.readthedocs.io/en/stable/guide/guide-tensor.html'},
    {'id':'density-negativity', 'title':'Vidal and Werner, Computable measure of entanglement (2002)',
     'url':'https://doi.org/10.1103/PhysRevA.65.032314'},
]


def _number(payload, key, default, lo, hi, integer=False):
    x = payload.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not lo <= x <= hi:
        raise ValueError(f'{key} 必须为 {lo} 至 {hi} 的有限数值')
    if integer and int(x) != x:
        raise ValueError(f'{key} 必须为整数')
    return int(x) if integer else float(x)


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError('密度矩阵实验输入必须为 JSON 对象')
    experiment = payload.get('experiment', 'single')
    if experiment not in ('single', 'pair'):
        raise ValueError('experiment 仅支持 single 或 pair')
    initial = payload.get('initialState', 'plus_z')
    if initial not in ('plus_z', 'minus_z', 'plus_x', 'antiparallel', 'singlet', 'classical', 'thermal'):
        raise ValueError('未知初态')
    if experiment == 'single' and initial in ('antiparallel', 'singlet', 'classical'):
        raise ValueError('反平行、单重态和反平行经典混合初态需要选择双自旋实验')
    return {'experiment':experiment, 'initialState':initial,
            'drive':_number(payload, 'drive', 1, -10, 10),
            'detuning':_number(payload, 'detuning', 0, -10, 10),
            'exchange':_number(payload, 'exchange', 0, -10, 10),
            'gradient':_number(payload, 'gradient', 0, -10, 10),
            'gamma1':_number(payload, 'gamma1', 0, 0, 5),
            'gammaPhi':_number(payload, 'gammaPhi', 0, 0, 5),
            'thermalScale':_number(payload, 'thermalScale', 1, 0, 10),
            'duration':_number(payload, 'duration', 12, 0, 50),
            'points':_number(payload, 'points', 161, 2, 301, True)}


def operators(p):
    pair = p['experiment'] == 'pair'
    a = [np.kron(x, I2) for x in (SX, SY, SZ)] if pair else [SX, SY, SZ]
    b = [np.kron(I2, x) for x in (SX, SY, SZ)] if pair else []
    h = (p['drive'] * a[0] + p['detuning'] * a[2]) / 2
    if pair:
        h += (p['drive'] * b[0] + p['detuning'] * b[2]) / 2
        h += p['gradient'] * (a[2] - b[2]) / 4
        h += p['exchange'] * sum(x @ y for x, y in zip(a, b)) / 4
    collapses = []
    for index in range(2 if pair else 1):
        sm = np.kron(SM, I2) if pair and index == 0 else np.kron(I2, SM) if pair else SM
        z = a[2] if index == 0 else b[2]
        if p['gamma1']:
            collapses.append(math.sqrt(p['gamma1']) * sm)
        if p['gammaPhi']:
            collapses.append(math.sqrt(p['gammaPhi'] / 2) * z)
    return h, collapses, a, b


def initial_density(p, h):
    pair = p['experiment'] == 'pair'
    name = p['initialState']
    if name == 'thermal':
        energies, vectors = np.linalg.eigh(h)
        if p['thermalScale'] == 0:
            weights = (energies - energies[0] < 1e-10).astype(float)
        else:
            weights = np.exp(-(energies - energies[0]) / p['thermalScale'])
        weights /= weights.sum()
        return (vectors * weights) @ vectors.conj().T
    if name == 'classical':
        return np.diag([0., .5, .5, 0.]).astype(complex)
    if name == 'singlet':
        ket = np.array([0, 1, -1, 0], dtype=complex) / math.sqrt(2)
    elif name == 'antiparallel':
        ket = np.array([0, 1, 0, 0], dtype=complex)
    else:
        ket = {'plus_z':np.array([1., 0.]), 'minus_z':np.array([0., 1.]),
               'plus_x':np.array([1., 1.]) / math.sqrt(2)}[name]
        if pair:
            ket = np.kron(ket, ket)
    return np.outer(ket, ket.conj())


def liouvillian(h, collapses):
    """Column-major vec: vec(A rho B) = (B.T tensor A) vec(rho)."""
    eye = np.eye(len(h), dtype=complex)
    result = -1j * (np.kron(eye, h) - np.kron(h.T, eye))
    for c in collapses:
        cc = c.conj().T @ c
        result += np.kron(c.conj(), c) - .5 * (np.kron(eye, cc) + np.kron(cc.T, eye))
    return result


def matrix_exponential(matrix):
    """Scaling/squaring Taylor exponential for a matrix of at most 16 x 16."""
    norm = float(np.linalg.norm(matrix, 1))
    scaling = max(0, int(math.ceil(math.log2(norm / .5)))) if norm > .5 else 0
    scaled = matrix / (2. ** scaling)
    result = np.eye(len(matrix), dtype=complex)
    term = result.copy()
    for k in range(1, 80):
        term = term @ scaled / k
        result += term
        if np.linalg.norm(term, 1) <= 1e-16 * max(1., np.linalg.norm(result, 1)):
            break
    else:
        raise ArithmeticError('矩阵指数未达到收敛阈值')
    for _ in range(scaling):
        result = result @ result
    return result


def partial_traces(rho):
    tensor = rho.reshape(2, 2, 2, 2)
    return np.trace(tensor, axis1=1, axis2=3), np.trace(tensor, axis1=0, axis2=2)


def entropy(rho):
    # Clip roundoff only; physicality checks use the unmodified eigenvalues.
    eigenvalues = np.linalg.eigvalsh((rho + rho.conj().T) / 2)
    positive = eigenvalues[eigenvalues > 1e-14]
    return float(-np.sum(positive * np.log2(positive)))


def negativity(rho):
    partial = rho.reshape(2, 2, 2, 2).transpose(0, 3, 2, 1).reshape(4, 4)
    values = np.linalg.eigvalsh((partial + partial.conj().T) / 2)
    return float(-np.minimum(values, 0).sum())


def matrix_json(a):
    return {'re':np.real(a).tolist(), 'im':np.imag(a).tolist()}


def _real_trace(a):
    return float(np.trace(a).real)


def calculate(payload):
    p = parameters(payload)
    h, collapses, op_a, op_b = operators(p)
    pair = p['experiment'] == 'pair'
    dimension = len(h)
    rho0 = initial_density(p, h)
    generator = liouvillian(h, collapses)
    times = np.linspace(0., p['duration'], p['points'])
    dt = float(times[1] - times[0])
    propagator = matrix_exponential(generator * dt)
    vector = rho0.reshape(-1, order='F').copy()
    snapshots = []
    trace_error = hermitian_error = 0.
    minimum_eigenvalue = 1.
    for index, time in enumerate(times):
        if index:
            vector = propagator @ vector
        rho = vector.reshape(dimension, dimension, order='F')
        trace_error = max(trace_error, float(abs(np.trace(rho) - 1)))
        hermitian_error = max(hermitian_error, float(np.max(np.abs(rho-rho.conj().T))))
        minimum_eigenvalue = min(minimum_eigenvalue, float(np.linalg.eigvalsh((rho+rho.conj().T)/2)[0]))
        reduced_a, reduced_b = partial_traces(rho) if pair else (rho, None)
        snapshots.append({'time':float(time), 'rho':matrix_json(rho),
                          'rhoA':matrix_json(reduced_a), 'rhoB':matrix_json(reduced_b) if pair else None,
                          'blochA':[_real_trace(rho @ x) for x in op_a],
                          'blochB':[_real_trace(rho @ x) for x in op_b] if pair else None,
                          'purity':_real_trace(rho @ rho), 'entropyA':entropy(reduced_a),
                          'entropyB':entropy(reduced_b) if pair else None,
                          'totalEntropy':entropy(rho), 'negativity':negativity(rho) if pair else None,
                          'upProbabilityA':float(reduced_a[0,0].real),
                          'energy':_real_trace(rho @ h)})
    if trace_error > 2e-8 or hermitian_error > 2e-8 or minimum_eigenvalue < -2e-8:
        raise ArithmeticError('密度矩阵未通过迹、厄米性或半正定校验，请缩小时间范围')
    last = snapshots[-1]
    gamma2 = p['gamma1']/2 + p['gammaPhi']
    basis = ['↑↑', '↑↓', '↓↑', '↓↓'] if pair else ['↑', '↓']
    def curve(key, label):
        return {'label':label, 'points':[[s['time'], s[key]] for s in snapshots]}
    plots = [
        {'id':'bloch','title':'自旋 A 的 Bloch 向量', 'xLabel':'t（ns）', 'yLabel':'⟨σ⟩',
         'series':[{'label':label, 'points':[[s['time'], s['blochA'][i]] for s in snapshots]}
                   for i,label in enumerate(['⟨σ_x⟩','⟨σ_y⟩','⟨σ_z⟩'])]},
        {'id':'purity','title':'整体纯度与局部混合性', 'xLabel':'t（ns）', 'yLabel':'纯度 / 熵（bit）',
         'series':[curve('purity','Tr(ρ²)'), curve('entropyA','S(ρ_A)'), curve('totalEntropy','S(ρ)')]},
    ]
    if pair:
        plots.append({'id':'entanglement','title':'双自旋纠缠：负性', 'xLabel':'t（ns）', 'yLabel':'N(ρ)',
                      'series':[curve('negativity','部分转置负性 N(ρ)')]})
    tables = [
        {'title':'末态密度矩阵的实部', 'columns':['基底']+basis,
         'rows':[[basis[i]]+last['rho']['re'][i] for i in range(dimension)]},
        {'title':'末态密度矩阵的虚部', 'columns':['基底']+basis,
         'rows':[[basis[i]]+last['rho']['im'][i] for i in range(dimension)]},
        {'title':'初态与末态对照', 'columns':['物理量','t=0','最终时刻'],
         'rows':[['整体纯度', snapshots[0]['purity'],last['purity']],
                 ['A 约化熵（bit）',snapshots[0]['entropyA'],last['entropyA']],
                 ['整体熵（bit）',snapshots[0]['totalEntropy'],last['totalEntropy']],
                 ['双自旋负性',snapshots[0]['negativity'],last['negativity']]]},
    ]
    warnings = [
        'H/ℏ 使用 rad/ns，时间使用 ns；drive 是 Ω 而不是 Ω/(2π)。基底按 ↑、↓ 排序，弛豫算符把 ↑ 转为 ↓。',
        'γ₁、γ_φ 为固定现象学速率；每个自旋独立耦合所选 Markov 通道。没有非 Markov 环境、脉冲序列、真实材料拟合或环境自洽反作用。',
        '局部熵含经典混合与量子纠缠贡献；只有整体纯态时，它才是该二分划分的纠缠熵。本实验双自旋混态另外报告部分转置负性。',
    ]
    if p['initialState'] == 'thermal' and collapses:
        warnings.append('热态仅定义初始条件；本地 ↑→↓ 通道不按耦合后 Hamiltonian 的跃迁与详细平衡构造，因此不宣称演化趋于同温 Gibbs 热平衡。')
    if p['experiment'] == 'single' and (p['exchange'] or p['gradient']):
        warnings.append('单自旋实验不使用双自旋 exchange 与 gradient 参数；它们不会改变本次计算。')
    max_frequency = float(np.linalg.norm(h,2)*2 + p['gamma1'] + 2*p['gammaPhi'])
    if dt * max_frequency > .5:
        warnings.append('时间采样较稀，曲线可能漏掉快速变化；矩阵指数在采样点仍求解同一常量生成元。请增加采样点或缩短总时间。')
    return {'module':'density', 'action':'density_matrix_lab', 'release':RELEASE, 'input':p,
            'summary':[{'label':'Hilbert 空间维数', 'value':dimension},
                       {'label':'末态整体纯度 Tr(ρ²)', 'value':last['purity']},
                       {'label':'末态 A 约化熵', 'value':last['entropyA'], 'unit':'bit'},
                       {'label':'末态双自旋负性', 'value':last['negativity']},
                       {'label':'自由单自旋 T₁', 'value':1/p['gamma1'] if p['gamma1'] else '∞', 'unit':'ns'},
                       {'label':'自由单自旋 T₂', 'value':1/gamma2 if gamma2 else '∞', 'unit':'ns'}],
            'plots':plots, 'tables':tables, 'stateSnapshots':snapshots,
            'finalDensityMatrix':last['rho'], 'initialDensityMatrix':snapshots[0]['rho'],
            'basis':basis, 'hamiltonianOverHbar':matrix_json(h),
            'rates':{'gamma1':p['gamma1'],'gammaPhi':p['gammaPhi'],'gamma2':gamma2,
                     'T1':1/p['gamma1'] if p['gamma1'] else None,'T2':1/gamma2 if gamma2 else None},
            'checks':{'最大迹误差':trace_error, '最大厄米误差':hermitian_error,
                      '全轨迹最小本征值':minimum_eigenvalue,
                      'Hamiltonian 厄米误差':float(np.max(np.abs(h-h.conj().T))),
                      '时间步长（ns）':dt, '正定性容差':2e-8,
                      '数值方法':'常量 Lindblad 生成元；缩放平方矩阵指数，无归一化或正定投影修补',
                      'T₂ 约定':'1/T₂ = γ₁/2 + γ_φ；仅描述无驱动、无耦合单自旋的横向包络'},
            'warnings':warnings, 'sources':SOURCES,
            'formulaLinks':[
                {'id':'density-purity','label':'纯度与局部熵','formula':'P=Tr(ρ²)；S(ρ_A)=−Tr(ρ_A log₂ρ_A)',
                 'meaning':'纯度描述整体混合性；局部熵只有在整体纯态时才等于该二分划分的纠缠熵。',
                 'values':[{'label':'末态纯度','value':last['purity']},{'label':'末态局部熵（bit）','value':last['entropyA']}], 'plot':'purity'},
                {'id':'density-rate','label':'自由单自旋的横向衰减率','formula':'γ_2=γ_1/2+γ_φ',
                 'meaning':'这是本通道约定下无驱动、无交换单自旋的相干包络率；完整驱动轨迹不必为单一指数。',
                 'values':[{'label':'γ₁（ns⁻¹）','value':p['gamma1']},{'label':'γ_φ（ns⁻¹）','value':p['gammaPhi']},{'label':'γ₂（ns⁻¹）','value':gamma2}], 'plot':'bloch'},
            ] + ([{'id':'density-negativity','label':'双自旋混态纠缠','formula':'N(ρ)=(||ρ^{T_B}||_1−1)/2',
                   'meaning':'对B部分转置，累加负本征值的绝对值；适用于本实验2×2系统，不把局部熵当一般混态纠缠。',
                   'values':[{'label':'末态负性','value':last['negativity']}], 'plot':'entanglement'}] if pair else []),
            'scope':{'spins':2 if pair else 1, 'timeDependentHamiltonian':False,
                     'units':'H/ℏ: rad/ns; time: ns; rates: ns⁻¹; entropy: bit',
                     'basisOrder':basis, 'bath':'independent phenomenological Markov channels',
                     'densityMatrixCorrection':'none'}}
