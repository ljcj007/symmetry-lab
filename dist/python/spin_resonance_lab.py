"""Small effective-spin magnetic resonance model in a common crystal frame.

H/h is in GHz, B in tesla, and dimensionless spin matrices use hbar=1.
All effective tensors are supplied phenomenologically; they are not derived
from a no-SOC Kanamori atom. Only NumPy is required in a browser worker.
"""
import math
from functools import lru_cache
import numpy as np

MU_B_OVER_H = 13.996245  # GHz/T, rounded to the precision needed here.
K_B_OVER_H = 1.380649e-23 / 6.62607015e-34 / 1e9  # GHz/K, exact SI constants.
SOURCES = [
    {"id": "resonance-spin-hamiltonian", "title": "EasySpin：有效自旋哈密顿量、Zeeman、零场与超精细相互作用", "url": "https://www.easyspin.org/documentation/hamiltonian.html"},
    {"id": "resonance-pepper", "title": "EasySpin：固态 EPR 的实验与线形约定", "url": "https://www.easyspin.org/documentation/pepper.html"},
]


def _number(p, key, default, lo, hi, integer=False):
    value = p.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f"{key} 必须是 {lo} 至 {hi} 的有限数值")
    if integer and (int(value) != value):
        raise ValueError(f"{key} 必须为整数")
    return int(value) if integer else float(value)


def parameters(p):
    if not isinstance(p, dict):
        raise ValueError("输入必须为参数对象")
    q = {
        "spin": _number(p, "spin", .5, .5, 2.5),
        "nuclearSpin": _number(p, "nuclearSpin", 0, 0, 2.5),
        **{key: _number(p, key, 2, .2, 5) for key in ("gX", "gY", "gZ")},
        **{key: _number(p, key, 0, -30, 30) for key in ("zeroFieldD", "zeroFieldE")},
        **{key: _number(p, key, 0, -3, 3) for key in ("hyperfinePerp", "hyperfineParallel")},
        "nuclearGamma": _number(p, "nuclearGamma", 0, -.1, .1),
        "field": _number(p, "field", .34, 0, 3),
        "theta": _number(p, "theta", 0, 0, 180),
        "phi": _number(p, "phi", 0, 0, 360),
        "temperature": _number(p, "temperature", 4, 0, 500),
        "lineWidth": _number(p, "lineWidth", .05, .001, 2),
        "frequencyMin": _number(p, "frequencyMin", 0, 0, 100),
        "frequencyMax": _number(p, "frequencyMax", 15, .001, 100),
        "frequencyPoints": _number(p, "frequencyPoints", 201, 41, 501, True),
        "fieldMax": _number(p, "fieldMax", .7, .001, 3),
        "fieldPoints": _number(p, "fieldPoints", 61, 11, 121, True),
        "polarization": p.get("polarization", "theta"),
    }
    if q["spin"] * 2 != int(q["spin"] * 2) or q["nuclearSpin"] * 2 != int(q["nuclearSpin"] * 2):
        raise ValueError("S 与 I 必须为整数或半整数")
    if q["polarization"] not in ("theta", "phi", "parallel"):
        raise ValueError("微波偏振必须为 theta、phi 或 parallel")
    if q["frequencyMin"] >= q["frequencyMax"]:
        raise ValueError("频率扫描终点须大于起点")
    unknown = set(p) - set(q)
    if unknown:
        raise ValueError("不支持的参数：" + ", ".join(sorted(str(key) for key in unknown)) + "。本实验仅含给定有效参数的静态单晶弱激发吸收。")
    return q


@lru_cache(maxsize=12)
def spin_matrices(spin):
    """Sx,Sy,Sz in descending m order, including the I=0 identity space."""
    dimension = int(round(2 * spin + 1))
    m = np.arange(dimension, dtype=float) * -1 + spin
    plus = np.zeros((dimension, dimension), dtype=complex)
    for col in range(1, dimension):
        plus[col - 1, col] = math.sqrt(spin * (spin + 1) - m[col] * (m[col] + 1))
    x, y, z = (plus + plus.T.conj()) / 2, (plus - plus.T.conj()) / (2j), np.diag(m).astype(complex)
    for matrix in (x, y, z):
        matrix.setflags(write=False)
    return x, y, z


def direction_vectors(theta, phi, polarization):
    theta, phi = math.radians(theta), math.radians(phi)
    n = np.array([math.sin(theta) * math.cos(phi), math.sin(theta) * math.sin(phi), math.cos(theta)])
    e_theta = np.array([math.cos(theta) * math.cos(phi), math.cos(theta) * math.sin(phi), -math.sin(theta)])
    e_phi = np.array([-math.sin(phi), math.cos(phi), 0.])
    return n, {"theta": e_theta, "phi": e_phi, "parallel": n}[polarization]


def operators(q):
    ds, di = int(2 * q["spin"] + 1), int(2 * q["nuclearSpin"] + 1)
    electron = tuple(np.kron(m, np.eye(di)) for m in spin_matrices(q["spin"]))
    nuclear = tuple(np.kron(np.eye(ds), m) for m in spin_matrices(q["nuclearSpin"]))
    n, microwave = direction_vectors(q["theta"], q["phi"], q["polarization"])
    g = np.array([q["gX"], q["gY"], q["gZ"]])
    constant = q["zeroFieldD"] * (electron[2] @ electron[2] - np.eye(ds * di) * q["spin"] * (q["spin"] + 1) / 3)
    constant += q["zeroFieldE"] * (electron[0] @ electron[0] - electron[1] @ electron[1])
    constant += q["hyperfinePerp"] * (electron[0] @ nuclear[0] + electron[1] @ nuclear[1])
    constant += q["hyperfineParallel"] * (electron[2] @ nuclear[2])
    zeeman = sum(MU_B_OVER_H * n[a] * g[a] * electron[a] - q["nuclearGamma"] * n[a] * nuclear[a] for a in range(3))
    magnetic_dipole = sum(microwave[a] * g[a] * electron[a] for a in range(3))
    return constant, zeeman, magnetic_dipole, n, microwave


def _degenerate_indices(energies):
    indices = []
    for i, energy in enumerate(energies):
        if not indices or abs(energy - energies[indices[-1][0]]) > 1e-9:
            indices.append([i])
        else:
            indices[-1].append(i)
    return indices


def thermal_populations(energies, temperature):
    """Equal weights within numerical degeneracies, including at tiny positive T."""
    energies = np.asarray(energies)
    groups = _degenerate_indices(energies)
    centers = np.array([np.mean(energies[g]) for g in groups])
    relative = centers - centers[0]
    thermal_energy = K_B_OVER_H * temperature
    if thermal_energy == 0:
        weights = np.zeros(len(groups))
        weights[0] = 1.
    else:
        # Overflow of a positive gap/kT only means a vanishing Boltzmann weight.
        with np.errstate(over='ignore'):
            weights = np.exp(-relative / thermal_energy)
    p = np.zeros(len(energies))
    for group, weight in zip(groups, weights):
        p[group] = weight
    return p / p.sum()


def grouped_transitions(energies, vectors, magnetic_dipole, populations):
    """Trace strengths between degenerate subspaces, invariant under basis choice."""
    indices = _degenerate_indices(energies)
    groups = [{"energy": float(np.mean(energies[idx])), "relativeEnergy": float(np.mean(energies[idx]) - energies[0]), "degeneracy": len(idx), "population": float(np.sum(populations[idx])), "perStatePopulation": float(np.mean(populations[idx]))} for idx in indices]
    dipole = vectors.conj().T @ magnetic_dipole @ vectors
    transitions = []
    for i, initial in enumerate(indices):
        for j in range(i + 1, len(indices)):
            final = indices[j]
            strength = float(np.sum(np.abs(dipole[np.ix_(final, initial)]) ** 2))
            if strength < 1e-14:
                continue
            difference = max(0., groups[i]["perStatePopulation"] - groups[j]["perStatePopulation"])
            transitions.append({"from": i, "to": j, "frequency": groups[j]["energy"] - groups[i]["energy"], "strength": strength, "populationDifference": difference, "weight": difference * strength})
    sum_rule = abs(float(np.sum(np.abs(dipole) ** 2)) - float(np.trace(magnetic_dipole.conj().T @ magnetic_dipole).real))
    return groups, transitions, sum_rule


def absorption_spectrum(transitions, frequencies, width):
    """Positive-frequency phenomenological Lorentzians, each with unit area on [0,infinity)."""
    absorption = np.zeros_like(frequencies, dtype=float)
    exact_window = 0.
    for line in transitions:
        center, weight = line["frequency"], line["weight"]
        norm = .5 + math.atan(center / width) / math.pi
        absorption += weight * width / (math.pi * norm * ((frequencies - center) ** 2 + width ** 2))
        exact_window += weight * (math.atan((frequencies[-1] - center) / width) - math.atan((frequencies[0] - center) / width)) / (math.pi * norm)
    return absorption, exact_window


def run(payload):
    q = parameters(payload)
    constant, zeeman, magnetic_dipole, n, microwave = operators(q)
    hamiltonian = constant + q["field"] * zeeman
    energies, vectors = np.linalg.eigh(hamiltonian)
    populations = thermal_populations(energies, q["temperature"])
    groups, transitions, sum_rule = grouped_transitions(energies, vectors, magnetic_dipole, populations)
    total_weight = sum(line["weight"] for line in transitions)
    dominant = max(transitions, key=lambda line: line["weight"], default=None)
    if dominant is not None and dominant["weight"] <= 1e-15:
        dominant = None
    frequencies = np.linspace(q["frequencyMin"], q["frequencyMax"], q["frequencyPoints"])
    absorption, exact_window = absorption_spectrum(transitions, frequencies, q["lineWidth"])
    numerical_window = float(np.sum((absorption[:-1] + absorption[1:]) * np.diff(frequencies) / 2))
    grid_error = abs(numerical_window - exact_window) / exact_window if exact_window > 1e-15 else 0.
    fields = np.linspace(0, q["fieldMax"], q["fieldPoints"])
    field_energies = [np.linalg.eigvalsh(constant + field * zeeman).tolist() for field in fields]
    analytic_geff = float(np.linalg.norm(np.array([q["gX"], q["gY"], q["gZ"]]) * n))
    check = {
        "hermiticityResidual": float(np.max(np.abs(hamiltonian - hamiltonian.conj().T))),
        "eigenResidual": float(np.max(np.abs(hamiltonian @ vectors - vectors * energies))),
        "populationResidual": abs(float(populations.sum()) - 1),
        "transitionSumRuleResidual": sum_rule,
        "traceEnergyResidual": abs(float(energies.sum())),
        "frequencyGridStep": float(frequencies[1] - frequencies[0]),
        "spectrumWindowWeightExact": exact_window,
        "spectrumWindowWeightNumerical": numerical_window,
        "spectrumWindowFraction": exact_window / total_weight if total_weight > 1e-15 else None,
        "spectrumGridRelativeError": grid_error,
        "spectrumGridResolved": bool(grid_error < .02),
    }
    check["passed"] = all(check[key] < 1e-8 for key in ("hermiticityResidual", "eigenResidual", "populationResidual", "transitionSumRuleResidual", "traceEnergyResidual"))
    warnings = [
        "给定有效 S、g、D/E 和超精细参数；它们不由现有无 SOC Kanamori 能级自动推导。g、零场与轴向超精细张量在此共用晶体主轴。",
        "输出为弱激发、热平衡、单晶正频磁偶极吸收。不是实验仪器记录的场调制一阶导数谱；不含粉末取向平均、脉冲、弛豫、饱和及光泵浦。",
        "微波只耦合电子磁矩，核 Zeeman 项可改变能级，但本页不计算直接核磁共振驱动或核四极相互作用。",
        "GHz 表示 H/h 而非角频率；lineWidth 是 GHz 单位的半高半宽。正频 Lorentz 线形逐条归一，不按峰高归一，保留温度引起的谱权重变化。",
        "磁场扫描每点按能量排序，交叉处曲线编号不代表绝热跟踪同一个量子态。简并子空间的跃迁强度取完整迹和。",
    ]
    if q["spin"] == .5 and (q["zeroFieldD"] != 0 or q["zeroFieldE"] != 0):
        warnings.append("S=1/2 的二阶零场分裂算符恒为零，改变 D/E 不会劈裂该双重态。")
    if q["nuclearSpin"] == 0 and (q["hyperfinePerp"] != 0 or q["hyperfineParallel"] != 0 or q["nuclearGamma"] != 0):
        warnings.append("I=0 时核自旋相关算符恒为零；输入的超精细与核 Zeeman 参数不起作用。")
    if not transitions or total_weight < 1e-15:
        warnings.append("当前偏振和热占据下无正频吸收权重；零频简并内部跃迁未计为有限频率共振。")
    if grid_error >= .02:
        warnings.append("当前频率网格未充分解析窄谱线；加密频率采样或调整显示范围，不能只凭峰高判断强度。")
    if total_weight > 1e-15 and exact_window / total_weight < .8:
        warnings.append("当前频率窗口包含不足 80% 的总正频谱权重，请扩大窗口或查看跃迁表。")
    if q["field"] > q["fieldMax"]:
        warnings.append("选定磁场位于磁场扫描窗口之外；当前吸收谱仍按所选磁场计算。")
    derivation = [
        {"title": "有效自旋模型", "formula": "H/h=(μB/h) B·g·S + D[Sz²−S(S+1)/3]+E(Sx²−Sy²)+A⊥(SxIx+SyIy)+A∥SzIz−γN B·I", "text": "S 与 I 为无量纲角动量算符。核旋磁比 γN 的输入已包含符号；所有频率参数使用 GHz。"},
        {"title": "热占据与微波矩阵元", "formula": "pn=exp[−(En−E0)/(kBT/h)]/Z；M=Σa e₁,a ga Sa", "text": "T=0 时在完整基态简并子空间均匀分配占据。theta/phi 是相对静磁场的两个正交线偏振，parallel 与静磁场平行。"},
        {"title": "正频跃迁与谱线", "formula": "νfi=Ef−Ei>0；Wif=(pi−pf) Σi∈Pi,f∈Pf |〈f|M|i〉|²", "text": "pi、pf 是每个简并态的占据；矩阵元迹和保证简并基底变换不影响强度。逐条线形在正频轴单位归一，输出是相对电子磁偶极谱权重。"},
        {"title": "可独立检查的极限", "formula": "S=1/2, I=0：ν=(μB/h)B √Σa(ga na)²", "text": "只有这个纯 Zeeman 极限可用所显示的几何 g_eff 直接预测唯一共振；有零场或超精细作用时须对角化完整 Hamiltonian。"},
    ]
    return {"parameters": q, "units": {"energy": "GHz (H/h)", "field": "T", "temperature": "K", "angle": "degree", "absorption": "relative magnetic-dipole weight / GHz", "integratedWeight": "relative magnetic-dipole weight (mu_B^2 suppressed)", "lineWidth": "GHz, HWHM", "muBOverH": MU_B_OVER_H, "kBOverH": K_B_OVER_H}, "dimension": len(energies),
            "selection": {"energies": energies.tolist(), "relativeEnergies": (energies - energies[0]).tolist(), "populations": populations.tolist(), "groups": groups, "transitions": transitions, "totalWeight": total_weight, "dominantFrequency": dominant["frequency"] if dominant else None, "dominantWeight": dominant["weight"] if dominant else 0., "effectiveG": analytic_geff, "fieldDirection": n.tolist(), "microwaveDirection": microwave.tolist()},
            "spectrum": {"frequencies": frequencies.tolist(), "absorption": absorption.tolist()}, "fieldScan": {"fields": fields.tolist(), "energies": field_energies}, "checks": check, "warnings": warnings, "derivation": derivation, "sources": SOURCES}
