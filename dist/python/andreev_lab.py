"""Single-channel NS junction with exact uniform-chain lead surface resolvents.

Nambu block (electron up, hole down), real s-wave Delta, no SOC or Zeeman.
The second spin block is identical and counted once by the factor two in G.
Only the finite normal scattering region has a numerical eta; lead surface
functions use their exact E+i0 boundary values. Exact gap thresholds are
withheld instead of imposing an unreported lead broadening.
"""
from __future__ import annotations
import cmath
import math
import numpy as np

E_CHARGE = 1.602176634e-19
PLANCK = 6.62607015e-34
G_QUANTUM = E_CHARGE**2/PLANCK
TAUZ = np.diag([1.0, -1.0])
TAUY = np.array([[0, -1j], [1j, 0]])
SOURCES = [
    {"id": "andreev-kwant", "title": "Kwant: superconducting junctions and electron/hole conductance", "url": "https://kwant-project.org/doc/1/tutorial/superconductors"},
    {"id": "andreev-btk", "title": "Blonder, Tinkham, Klapwijk: metallic to tunneling regimes in NS contacts", "url": "https://doi.org/10.1103/PhysRevB.25.4515"},
    {"id": "andreev-beenakker", "title": "Beenakker: mesoscopic theory of NS junctions", "url": "https://arxiv.org/abs/cond-mat/9406083"},
]


def _number(payload, key, default, lo, hi, integer=False):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f"{key} 必须为 {lo} 至 {hi} 的有限实数")
    if integer and not isinstance(value, int):
        raise ValueError(f"{key} 必须为整数")
    return int(value) if integer else float(value)


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError("NS 结输入必须是 JSON 对象")
    for key in ('temperature', 'phase', 'spinDegeneracy', 'bias', 'soc'):
        if key in payload:
            raise ValueError(f"本模型不接受 {key}；采用零温、固定势、实配对及固定两重物理自旋")
    n = _number(payload, 'sites', 8, 2, 32, True)
    p = {'sites': n,
         'hopping': _number(payload, 'hopping', 1, .05, 5),
         'chemicalPotential': _number(payload, 'chemicalPotential', 0, -8, 8),
         'gate': _number(payload, 'gate', 0, -5, 5),
         'barrier': _number(payload, 'barrier', 0, 0, 5),
         'barrierStart': _number(payload, 'barrierStart', n//2, 0, n-1, True),
         'contactLeft': _number(payload, 'contactLeft', 1, 0, 5),
         'contactRight': _number(payload, 'contactRight', 1, 0, 5),
         'gap': _number(payload, 'gap', .15, 0, 1),
         'energy': _number(payload, 'energy', 0, -10, 10),
         'energyMin': _number(payload, 'energyMin', -.45, -10, 10),
         'energyMax': _number(payload, 'energyMax', .45, -10, 10),
         'samples': _number(payload, 'samples', 121, 41, 241, True),
         'eta': _number(payload, 'eta', 1e-7, 1e-9, 1e-3)}
    if p['energyMin'] >= p['energyMax']:
        raise ValueError('扫描终点必须大于起点')
    return p


def lead_surface_green(z, hopping, onsite=0.0):
    """Analytic semi-infinite scalar chain resolvent, retarded on real axis."""
    z = complex(z)
    if z.imag < 0:
        return lead_surface_green(z.conjugate(), hopping, onsite).conjugate()
    x, t = z-onsite, float(hopping)
    if z.imag == 0:
        if abs(x.real) < 2*t:
            return (x-1j*math.sqrt(max(0., 4*t*t-x.real*x.real)))/(2*t*t)
        if abs(x.real) == 2*t:
            return x/(2*t*t)
        return 2/(x+math.copysign(math.sqrt(x.real*x.real-4*t*t), x.real))
    # Product chooses the branch with sqrt(x²-4t²) ~ x in the upper half plane.
    root = cmath.sqrt(x-2*t)*cmath.sqrt(x+2*t)
    return 2/(x+root)


def gap_threshold(energy, gap):
    return gap > 0 and abs(abs(energy)-gap) <= 1e-10*max(1., gap)


def superconducting_surface(energy, hopping, mu, gap):
    """Exact semi-infinite BdG surface Green function at E+i0.

    H(k)=xi(k) tau_z + Delta tau_x. Surface spectral measure is
    (2/pi) sin²(k) dk. Partial fractions use a retarded g(kappa) and
    advanced g(-kappa), which is essential outside the gap.
    """
    if gap == 0:
        return np.diag([lead_surface_green(energy, hopping, -mu),
                        lead_surface_green(energy, hopping, mu)])
    if gap_threshold(energy, gap):
        raise ValueError('精确超导能隙阈值须用单侧极限核验，当前点不报告结果')
    if abs(energy) > gap:
        kappa = complex(math.copysign(math.sqrt(energy*energy-gap*gap), energy))
    else:
        kappa = 1j*math.sqrt(gap*gap-energy*energy)
    gp = lead_surface_green(kappa, hopping, -mu)
    gm = lead_surface_green((-kappa).conjugate(), hopping, -mu).conjugate()
    even = (gp-gm)/(2*kappa)
    odd = (gp+gm)/2
    return np.array([[energy*even+odd, gap*even],
                     [gap*even, energy*even-odd]], dtype=complex)


def hamiltonian(p):
    n = p['sites']
    onsite = np.full(n, p['gate']-p['chemicalPotential'])
    onsite[p['barrierStart']] += p['barrier']
    electron = np.diag(onsite)-np.diag(np.full(n-1, p['hopping']), 1)-np.diag(np.full(n-1, p['hopping']), -1)
    return np.kron(electron, TAUZ), onsite


def _undefined(energy, p, full):
    result = {'energy': float(energy), 'defined': False,
              'reason': 'E=±Δ 的理想电极表面函数在本公式中需取阈值极限；请稍移能量并比较两侧，当前点留空。',
              'electronOpen': abs(energy+p['chemicalPotential']) < 2*p['hopping'],
              'holeOpen': abs(energy-p['chemicalPotential']) < 2*p['hopping']}
    for key in ('normalReflection', 'andreevReflection', 'quasiparticleTransmission', 'regulatorAbsorption',
                'conductanceQuantum', 'conductanceSiemens', 'holeNormalReflection', 'holeAndreevReflection',
                'fluxResidual', 'leadDysonResidual', 'minimumLeadGamma', 'greenSolveResidual'):
        result[key] = None
    if full:
        result.update(electronLDOS=[], holeLDOS=[])
    return result


def evaluate(energy, p, matrix=None, full=False, eta=None):
    energy = float(energy)
    if gap_threshold(energy, p['gap']):
        return _undefined(energy, p, full)
    if matrix is None:
        matrix, _ = hamiltonian(p)
    n, t, mu = p['sites'], p['hopping'], p['chemicalPotential']
    eta = p['eta'] if eta is None else eta
    normal = np.diag([lead_surface_green(energy, t, -mu), lead_surface_green(energy, t, mu)])
    sc = superconducting_surface(energy, t, mu, p['gap'])
    sig_l = p['contactLeft']**2*normal
    sig_r = p['contactRight']**2*(TAUZ@sc@TAUZ)
    gamma_l = 1j*(sig_l-sig_l.conj().T)
    gamma_r = 1j*(sig_r-sig_r.conj().T)
    ge, gh = max(0., float(gamma_l[0, 0].real)), max(0., float(gamma_l[1, 1].real))
    inverse = (energy+1j*eta)*np.eye(2*n)-matrix
    inverse[:2, :2] -= sig_l
    inverse[-2:, -2:] -= sig_r
    if full:
        green = np.linalg.inv(inverse)
        columns = green[:, :2]
    else:
        columns = np.linalg.solve(inverse, np.eye(2*n)[:, :2])
    state_e, state_h = math.sqrt(ge)*columns[:, 0], math.sqrt(gh)*columns[:, 1]
    electron_open, hole_open = abs(energy+mu) < 2*t, abs(energy-mu) < 2*t
    ree = float(abs(1-1j*ge*columns[0, 0])**2) if electron_open else None
    rhe = float(ge*gh*abs(columns[1, 0])**2) if electron_open else None
    rhh = float(abs(1-1j*gh*columns[1, 1])**2) if hole_open else None
    reh = float(ge*gh*abs(columns[0, 1])**2) if hole_open else None
    transmission = max(0., float(np.vdot(state_e[-2:], gamma_r@state_e[-2:]).real))
    absorption = float(2*eta*np.vdot(state_e, state_e).real)
    flux = abs(ree+rhe+transmission+absorption-1) if electron_open else 0.
    conductance = 2*(1-ree+rhe) if electron_open else 0.
    lead_h = np.array([[-mu, p['gap']], [p['gap'], mu]])
    hop = -t*TAUZ
    # Multiplicative Dyson residual is well behaved even when g is singular.
    dyson = float(np.linalg.norm(((energy*np.eye(2)-lead_h-hop@sc@hop)@sc)-np.eye(2), ord=np.inf))
    out = {'energy': energy, 'defined': True, 'reason': '理想电极的实能量迟致边界值；数值 η 仅作用于有限正常区。',
           'electronOpen': electron_open, 'holeOpen': hole_open,
           'normalReflection': ree, 'andreevReflection': rhe,
           'quasiparticleTransmission': transmission, 'regulatorAbsorption': absorption,
           'conductanceQuantum': float(conductance), 'conductanceSiemens': float(G_QUANTUM*conductance),
           'holeNormalReflection': rhh, 'holeAndreevReflection': reh,
           'fluxResidual': float(flux), 'leadDysonResidual': dyson,
           'minimumLeadGamma': float(np.min(np.linalg.eigvalsh(gamma_r))),
           'greenSolveResidual': float(np.linalg.norm(inverse@columns-np.eye(2*n)[:, :2], ord=np.inf))}
    if full:
        out.update(electronLDOS=(-np.diag(green).imag[::2]/math.pi).tolist(),
                   holeLDOS=(-np.diag(green).imag[1::2]/math.pi).tolist())
    return out


def run(payload):
    p = parameters(payload)
    matrix, onsite = hamiltonian(p)
    selected = evaluate(p['energy'], p, matrix, full=True)
    energy_grid = np.linspace(p['energyMin'], p['energyMax'], p['samples'])
    rows = [evaluate(e, p, matrix) for e in energy_grid]
    normal_parameters = {**p, 'gap': 0.}
    normal = evaluate(p['energy'], normal_parameters, matrix)
    normal_rows = [evaluate(e, normal_parameters, matrix) for e in energy_grid]
    finer = evaluate(p['energy'], p, matrix, eta=p['eta']/2)
    reverse = evaluate(-p['energy'], p, matrix)
    defined = selected['defined']
    eta_difference = abs(selected['conductanceQuantum']-finer['conductanceQuantum']) if defined else None
    particle_hole = None
    if defined and selected['electronOpen']:
        particle_hole = max(abs(selected['normalReflection']-reverse['holeNormalReflection']),
                            abs(selected['andreevReflection']-reverse['holeAndreevReflection']))
    good_rows = [s for s in rows if s['defined']]
    checks = {'fluxResidual': selected['fluxResidual'],
              'maxScanFluxResidual': max((s['fluxResidual'] for s in good_rows), default=0.),
              'leadDysonResidual': selected['leadDysonResidual'],
              'maxScanLeadDysonResidual': max((s['leadDysonResidual'] for s in good_rows), default=0.),
              'particleHoleResidual': particle_hole,
              'hamiltonianParticleHoleResidual': float(np.max(abs(np.kron(np.eye(p['sites']), TAUY)@matrix.conj()@np.kron(np.eye(p['sites']), TAUY)+matrix))),
              'greenSolveResidual': selected['greenSolveResidual'],
              'minimumLeadGamma': min((s['minimumLeadGamma'] for s in good_rows), default=0.),
              'etaDifference': eta_difference,
              'etaComparison': {'eta': p['eta'], 'halfEta': p['eta']/2,
                                'conductanceQuantum': selected['conductanceQuantum'],
                                'halfEtaConductanceQuantum': finer['conductanceQuantum']},
              'undefinedScanPoints': sum(not s['defined'] for s in rows)}
    selected['numericallyResolved'] = bool(defined and selected['fluxResidual'] < 1e-7 and selected['leadDysonResidual'] < 1e-5 and selected['regulatorAbsorption'] < 1e-4 and eta_difference < 1e-4)
    warnings = [
        '一维单轨道、无磁场和 SOC 的正常金属—s 波超导结。配对仅在右半无限电极；有限散射区保持正常态。',
        'Nambu 块为(e↑,h↓)，另一自旋块等价。表中概率按一个入射电子通道，G=2(e²/h)(1−Ree+Rhe) 已计入两个物理自旋，不再额外乘2。',
        'E 相对超导凝聚体的化学势。曲线是零温、固定势与固定Δ近似下的谱微分电导；只有E=0对应严格零偏压线性电导。不求有限偏压自洽势、非平衡占据或I(V)。',
        'Ree+Rhe+Tqp+Aη=1 是准粒子通量守恒；Rhe 的空穴反射在电荷电导中取加号。Tqp 不等于电荷电导。',
        'η只在有限散射区产生已报告的人工吸收；它不是实际非弹性散射率。理想超导电极内不增加隐藏展宽。',
        '所有能量和接触跃迁以eV计，电导为S，LDOS按一个Nambu自旋块、每eV；不输出“片电导”或三维电导率。',
        '正常参考线只把同一器件的Δ设为0，其余参数不变。透射接近1且Δ远小于带宽时才接近理想亚隙电导加倍，不能对任意势垒套用。',
        '本实验是常规s波NS结，不包含Josephson相位差、自洽配对、拓扑超导或Majorana判据。',
    ]
    if checks['undefinedScanPoints'] or not defined:
        warnings.append('精确E=±Δ的阈值点留空；请减小能量步长并比较阈值两侧。空值不意味着该能量下实际电导为零。')
    if not selected['electronOpen']:
        warnings.append('该能量在左电极电子带外或带边，没有入射电子传播通道；电子电导为零，反射概率不定义。')
    if defined and not selected['numericallyResolved']:
        warnings.append('当前点的η、表面函数或通量诊断未达到预设阈值，请先减小η并核验数值稳定性。')
    return {'schema': 'symmetry-lab-andreev-1', 'parameters': p,
            'units': {'energy': 'eV', 'conductanceQuantum': 'e²/h (two physical spins included)', 'conductanceSiemens': 'S', 'localDensity': '1/eV per Nambu spin block'},
            'selection': selected, 'normalReference': normal,
            'scan': {'energies': energy_grid.tolist(), 'rows': rows,
                     'normalConductanceQuantum': [s['conductanceQuantum'] for s in normal_rows]},
            'device': {'sites': [{'index': i, 'onsite': float(v)} for i, v in enumerate(onsite)],
                       'gap': p['gap'], 'normalBand': [-p['chemicalPotential']-2*p['hopping'], -p['chemicalPotential']+2*p['hopping']]},
            'checks': checks, 'warnings': warnings,
            'derivation': [
                {'title': '电子与空穴的耦合', 'formula': 'H_BdG=ξτz+Δτx；V=−tτz', 'text': '有限区域Δ=0；右电极包含实s波配对。'},
                {'title': '迟致开放边界', 'formula': 'Gʳ=[(E+iη)I−HD−ΣN−ΣS]⁻¹', 'text': '两根半无限引线的表面函数取精确实轴边界值。'},
                {'title': '反射与电荷', 'formula': 'G/(e²/h)=2(1−Ree+Rhe)', 'text': '因空穴电荷与电子相反，向后反射的空穴增加流入超导体的电荷电流。'},
                {'title': '数值守恒', 'formula': 'Ree+Rhe+Tqp+Aη=1', 'text': '同时比较η与η/2，保留未定义阈值和数值误差。'}],
            'sources': SOURCES}
