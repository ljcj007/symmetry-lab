"""Two explicit XXZ-chain teaching models, in linear spin-wave theory.

J and h=g*mu_B*B are energies in meV; spin operators have dimensionless S.
The AFM calculation expands about a collinear Neel reference state and is
not an exact solution of a one-dimensional quantum chain.  Real frequencies,
positive excitation energies and classical ground-state selection are reported
separately.  The animation is a normalized visualization of one linear mode,
not a nonlinear Landau-Lifshitz integration or a thermal simulation.
"""
from __future__ import annotations

import math
import numpy as np

HBAR_MEV_PS = 0.6582119569509067
PLANCK_MEV_PS = 2 * math.pi * HBAR_MEV_PS
SOURCES = [
    {"title": "pySpinW official tutorial: Ferromagnetic Chain",
     "url": "https://spinw.org/pyspinw/tutorials/ferromagnetic_chain/index.html"},
    {"title": "pySpinW official tutorial: Antiferromagnetic chain with rotating-frame calculation",
     "url": "https://spinw.org/pyspinw/tutorials/antiferromagnetic_chain/index.html"},
    {"title": "Toth and Lake (2015): linear spin-wave theory and its small-fluctuation approximation",
     "url": "https://arxiv.org/abs/1402.6069"},
    {"title": "Selke et al. (2009): classical and quantum anisotropic Heisenberg antiferromagnets",
     "url": "https://arxiv.org/abs/0907.1076"},
]


def _number(payload, key, default, lower, upper):
    x = payload.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not lower <= x <= upper:
        raise ValueError(f"{key} 必须是 {lower} 至 {upper} 的有限实数")
    return float(x)


def _integer(payload, key, default, lower, upper):
    x = _number(payload, key, default, lower, upper)
    if x != int(x):
        raise ValueError(f"{key} 必须是整数")
    return int(x)


def dynamic_matrix(model, k, exchange, spin, anisotropy, field):
    """i*hbar*d(Sx+iSy)/dt=M(k)*(Sx+iSy), global Cartesian frame.

Bloch phase is exp(i*k*n), including the A/B basis positions, with k=qa.
For AFM, M is not Hermitian; diagonalizing it as a Hermitian Hamiltonian is
incorrect.  Its eigenvalues are h +/- omega0, not two positive energies.
"""
    scale = 2 * exchange * spin
    if model == "fm":
        return np.array([[scale * ((anisotropy - 1) + 2 * math.sin(k/2)**2) + field]])
    a, b = scale * anisotropy, scale * math.cos(k)
    return np.array([[a + field, b], [-b, field - a]])


def _base_frequency(k, exchange, spin, anisotropy):
    # This form avoids cancellation at Delta=1 and q near zero.
    return 2 * exchange * spin * math.sqrt((anisotropy - 1) * (anisotropy + 1) + math.sin(k) ** 2)


def _stability(model, j, s, delta, h):
    scale = 2 * j * s
    tol = 1e-10 * max(scale * delta, abs(h), 1e-12)
    if model == "fm":
        gap = scale * (delta - 1) + h
        global_ground = h >= -tol
        minimum_hessian = gap / s
        phase = "+z 铁磁态" if h > tol else (("铁磁方向连续简并" if delta == 1 else "±z 铁磁态简并") if abs(h) <= tol else "−z 铁磁态")
        reference = -j * delta * s * s - h * s
        energies = {"reference": reference, "reversed": -j * delta * s * s + h * s}
        return {
            "energeticallyStable": gap >= -tol,
            "strictlyPositiveSpectrum": gap > tol,
            "dynamicallyOscillatory": True,
            "dynamicalQualification": "无阻尼线性方程频率为实数；负能模式仍表示参考态能量不稳定。",
            "classicalGroundState": global_ground,
            "classicalPhase": phase,
            "marginal": abs(gap) <= tol,
            "gap": gap, "minimumHessianEigenvalue": minimum_hessian,
            "spinFlopField": None, "saturationField": None,
            "referenceEnergyPerSite": reference, "classicalEnergiesPerSite": energies,
            "criterion": "+z 参考态局部能量稳定要求 h+2JS(Δ−1)≥0；全局经典基态要求 h≥0。",
        }
    threshold = scale * math.sqrt((delta - 1) * (delta + 1))
    saturation = scale * (delta + 1)
    gap = threshold - abs(h)
    canting = min(1., abs(h) / saturation)
    neel = -j * delta * s * s
    canted = j * s * s * ((delta + 1) * canting * canting - 1) - abs(h) * s * canting
    if abs(h) < threshold - tol:
        phase = "共线 Néel 态"
    elif abs(h) <= threshold + tol:
        phase = "各向同性零场：Néel 方向连续简并" if delta == 1 else "spin-flop 临界点：共线态与倾斜态等能"
    elif abs(h) < saturation - tol:
        phase = "倾斜 spin-flop 态（本模块不计算其自旋波）"
    else:
        phase = "饱和铁磁态（本模块仍只显示 Néel 参考态线性化）"
    min_hessian = (scale * delta - math.sqrt(h * h + scale * scale)) / s
    return {
        "energeticallyStable": gap >= -tol,
        "strictlyPositiveSpectrum": gap > tol,
        "dynamicallyOscillatory": delta > 1,
        "dynamicalQualification": "无阻尼线性频率为实数；Δ=1 的 q=0 矩阵含零频 Jordan 块，实频率不等于所有扰动有界。负能模式不能解释为稳定基态激发。",
        "classicalGroundState": abs(h) <= threshold + tol,
        "classicalPhase": phase,
        "marginal": abs(gap) <= tol,
        "gap": gap, "minimumHessianEigenvalue": min_hessian,
        "spinFlopField": threshold, "saturationField": saturation,
        "referenceEnergyPerSite": neel,
        "classicalEnergiesPerSite": {"reference": neel, "cantedOrSaturated": canted},
        "cantingCosineInCompetingState": canting,
        "criterion": "本最近邻 XXZ 经典链中 |h|≤h_sf=2JS√(Δ²−1)；在阈值处两相等能，超过后 Néel 态不是基态。此阈值不是有限 S 量子链的精确临界场。",
    }


def _animation(model, p, stability, energy, signed_frequency, coefficients, base):
    s, n, amplitude = p["spin"], p["sites"], p["amplitude"]
    sites = [{"index": i, "position": [float(i), 0., 0.],
              "sublattice": "A" if model == "fm" or i % 2 == 0 else "B",
              "equilibrium": [0., 0., s if model == "fm" or i % 2 == 0 else -s]}
             for i in range(n)]
    tol = 1e-10 * max(2 * p["exchange"] * s * p["anisotropy"], abs(p["field"]), 1e-12)
    reason = "一个小角线性本征模；纵向分量仅为保持箭头长度而重归一化，不是完整非线性动力学。"
    if not stability["energeticallyStable"]:
        available, reason = False, "参考态含负能模式，关闭稳定进动演示；请降低外场或改用稳定参考态。"
    elif energy <= tol or (model == "afm" and base <= tol):
        available, reason = False, "所选模式为零频或退化软模，没有有限进动周期；可选非零 q 或增加易轴各向异性。"
    else:
        available = True
    result = {"available": available, "reason": reason, "sites": sites, "frames": [],
              "smallAngle": True, "nonlinearDynamics": False, "positionUnit": "a",
              "spinUnit": "dimensionless spin", "amplitude": amplitude,
              "periodPs": PLANCK_MEV_PS / energy if available else None,
              "waveConvention": "S⁺_n(t)=Sρ c_s exp[i(qa n−λt/ℏ)]；ρ 是最大横向振幅/S。",
              "boundary": "无限周期链的有限显示窗口；窗口两端不是额外相连的有限环。",
              "lengthNormalizationOrder": "S_z=s_s S√(1−ρ²|c_s|²)，相对线性方程的高阶修正仅用于显示。"}
    if available:
        for index in range(p["frames"]):
            phase = 2 * math.pi * index / p["frames"]
            time_ps = phase * HBAR_MEV_PS / energy
            spins = []
            for site in sites:
                i = site["index"]
                c = coefficients[0 if model == "fm" else i % 2]
                angle = math.pi * p["q"] * i - signed_frequency * time_ps / HBAR_MEV_PS
                rho = amplitude * c
                zsign = 1 if site["sublattice"] == "A" else -1
                spins.append([s * rho * math.cos(angle), s * rho * math.sin(angle),
                              zsign * s * math.sqrt(max(0., 1 - rho * rho))])
            result["frames"].append({"phase": phase, "timePs": time_ps, "spins": spins})
    return result


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError("磁振子输入必须是 JSON 对象")
    model = payload.get("model", "fm")
    if model not in ("fm", "afm"):
        raise ValueError("model 仅支持 fm 或 afm")
    limit = 1. if model == "fm" else .5
    p = {
        "model": model,
        "exchange": _number(payload, "exchange", 1., .001, 100.),
        "spin": _number(payload, "spin", 1., .5, 10.),
        "anisotropy": _number(payload, "anisotropy", 1.15, 1., 5.),
        "field": _number(payload, "field", 0., -1000., 1000.),
        "samples": _integer(payload, "samples", 161, 21, 501),
        "q": _number(payload, "q", .25, -limit, limit),
        "branch": _integer(payload, "branch", 0, 0, 0 if model == "fm" else 1),
        "amplitude": _number(payload, "amplitude", .12, 0., .2),
        "sites": _integer(payload, "sites", 16, 4, 64),
        "frames": _integer(payload, "frames", 32, 8, 96),
    }
    if not math.isclose(2 * p["spin"], round(2 * p["spin"]), abs_tol=1e-10):
        raise ValueError("spin 必须是正半整数：1/2、1、3/2……")
    if model == "afm" and p["sites"] % 2:
        raise ValueError("AFM 显示窗口 sites 必须为偶数，包含完整 A/B 磁胞")
    if any(key in payload for key in ("single_ion", "dmi", "dm", "temperature")):
        raise ValueError("本模型未包含单离子各向异性、DMI 或有限温度；请使用 XXZ anisotropy 参数")
    j, s, delta, h = [p[k] for k in ("exchange", "spin", "anisotropy", "field")]
    coordinates = np.linspace(-limit, limit, p["samples"]).tolist()
    # Always retain Gamma, even for an even sample count.
    if 0. not in coordinates:
        coordinates.append(0.)
        coordinates.sort()
    if model == "fm":
        energies = [[2 * j * s * ((delta - 1) + 2 * math.sin(math.pi * q/2)**2) + h for q in coordinates]]
        labels = ["FM：ε=2JS(Δ−cos qa)+h"]
        polarizations = ["S⁺∝exp(−iωt)：从 +z 朝原点看，横向矢量顺时针进动"]
        base = 2 * j * s * ((delta - 1) + 2 * math.sin(math.pi * p["q"]/2)**2)
        energy = base + h
        signed_frequency = energy
        coefficients = [1.]
        dispersion = "ε(q)=2JS[Δ−cos(qa)]+h"
    else:
        frequencies = [_base_frequency(math.pi * q, j, s, delta) for q in coordinates]
        energies = [[w - h for w in frequencies], [w + h for w in frequencies]]
        labels = ["AFM：ε₋=ω₀−h", "AFM：ε₊=ω₀+h"]
        polarizations = ["S⁺∝exp(+iε₋t/ℏ)，B 子晶格横向振幅不小于 A", "S⁺∝exp(−iε₊t/ℏ)，A 子晶格横向振幅不小于 B"]
        base = _base_frequency(math.pi * p["q"], j, s, delta)
        ratio = -(2 * j * s * math.cos(math.pi * p["q"])) / (2 * j * s * delta + base)
        if p["branch"] == 0:
            energy, signed_frequency, coefficients = base - h, h - base, [ratio, 1.]
        else:
            energy, signed_frequency, coefficients = base + h, h + base, [1., ratio]
        dispersion = "ω₀(q)=2JS√[Δ²−cos²(qa)]；ε₋=ω₀−h，ε₊=ω₀+h"
    stability = _stability(model, j, s, delta, h)
    matrix = dynamic_matrix(model, math.pi * p["q"], j, s, delta, h)
    vector = np.array(coefficients)
    eigen_residual = float(np.linalg.norm(matrix @ vector - signed_frequency * vector))
    numerical = np.linalg.eigvals(matrix)
    expected = [energy] if model == "fm" else [h - base, h + base]
    spectral_residual = float(max(abs(x - y) for x, y in zip(sorted(numerical.real), sorted(expected))))
    zero_gap_expected = delta == 1 and h == 0
    zero_gap = abs(stability["gap"]) < 1e-10 * max(2 * j * s, 1e-12)
    warnings = [
        "参数和一维晶格均为教学模型；结果不是 MnF₂ 等具体材料的拟合谱。",
        "field 是 Zeeman 能量 h=gμB B（meV），不是以 Tesla 计的磁感应强度。",
        "这里使用 XXZ 交换各向异性 Δ；没有单离子 K(Sz)² 项，后者对 S=1/2 是常数。",
        "演示仅保留线性小振幅自旋波，未计算温度、阻尼、磁振子相互作用、DMI 或非共线基态。",
    ]
    if model == "afm":
        warnings.append("AFM 结果是经典 Néel 态附近的半经典近似；一维小 S 量子链可能有自旋子或 Haldane 隙，不能把此谱视作精确量子结果，也不据此判断有限温度长程序。")
    if not stability["classicalGroundState"]:
        warnings.append("当前共线参考态不是全局经典基态；此图保留参考态的有符号分支供稳定性教学，不给出新基态的真实激发谱。")
    if not stability["energeticallyStable"]:
        warnings.append("最低分支出现负值：参考态的二次能量不正定。无阻尼线性方程的实频率并不能排除这种能量不稳定。")
    if stability["marginal"]:
        warnings.append("存在零能软模：需区别连续对称性 Goldstone 模与场致临界软化；本模块不展示零频模式的有限周期动画。")
    animation = _animation(model, p, stability, energy, signed_frequency, coefficients, base)
    return {
        "kind": "magnon-lab", "model": model,
        "title": "XXZ 铁磁链：交换、自旋进动与能隙" if model == "fm" else "XXZ 反铁磁链：双子晶格与相反圆偏振",
        "parameters": p, "synthetic": True,
        "scope": "一维最近邻 XXZ 教学链，零温共线参考态的线性自旋波；全局稳定性采用本模型的经典能量比较。",
        "units": {"energy": "meV", "field": "meV (h=gμB B)", "q": "qa/π", "spin": "dimensionless S", "time": "ps", "frequency": "THz"},
        "path": {"label": "qa/π", "coordinates": coordinates, "sampleCount": len(coordinates),
                 "ticks": [{"x": -limit, "label": "−π/a" if model == "fm" else "−π/(2a)"}, {"x": 0., "label": "Γ"}, {"x": limit, "label": "π/a" if model == "fm" else "π/(2a)"}],
                 "range": [-limit, limit], "magneticCellLength": 1 if model == "fm" else 2,
                 "convention": "a 是相邻自旋间距；FM 磁胞 a，AFM 磁胞 2a；qa/π 并非普通晶胞倒格矢分数坐标。"},
        "bands": [{"index": i, "label": label, "energies": energies[i], "polarization": polarizations[i]} for i, label in enumerate(labels)],
        "selection": {"q": p["q"], "kRadians": math.pi * p["q"], "branch": p["branch"],
                      "energy": energy, "signedSplusFrequencyEnergy": signed_frequency,
                      "frequencyTHz": energy / PLANCK_MEV_PS if energy > 0 else None,
                      "polarization": polarizations[p["branch"]],
                      "sublatticeCoefficients": coefficients,
                      "coefficientConvention": "S⁺_s=c_s exp(iqn a−iλt/ℏ)，max|c_s|=1；不是玻色 Bogoliubov 度规归一化。",
                      "dynamicMatrix": matrix.tolist()},
        "animation": animation, "stability": stability,
        "hamiltonian": {"formula": ("H=−JΣ⟨ij⟩(SxiSxj+SyiSyj+ΔSziSzj)−hΣiSzi" if model == "fm" else "H=+JΣ⟨ij⟩(SxiSxj+SyiSyj+ΔSziSzj)−hΣiSzi"),
                        "dispersion": dispersion, "bonds": "最近邻无向键各计一次，J>0，配位数 z=2。",
                        "reference": "全部自旋沿 +z" if model == "fm" else "A 沿 +z，B 沿 −z；相邻格点交替",
                        "anisotropy": "Δ=1 各向同性；Δ>1 为交换易轴各向异性。",
                        "linearEquation": "iℏ∂t S⁺=M(q)S⁺；AFM 的 M 非厄米，不能用 Hermitian eigensolver 当普通能带求解。"},
        "validation": {"eigenvectorResidual": eigen_residual, "spectrumResidual": spectral_residual,
                       "imaginaryFrequencyResidual": float(max(abs(numerical.imag))),
                       "goldstoneExpected": zero_gap_expected, "zeroGapObserved": zero_gap,
                       "goldstoneCheckPassed": (not zero_gap_expected) or zero_gap,
                       "goldstoneReason": "仅在 Δ=1 且 h=0 时期待自发连续自旋旋转对称性对应的零能模；其它零能点可能是稳定性边界。",
                       "smallQLimit": "ε≈JS(qa)²（Δ=1,h=0）" if model == "fm" else "ε≈2JS|qa|（Δ=1,h=0）",
                       "normalizedSpinLengthResidual": max((abs(math.sqrt(sum(x*x for x in spin)) - s) for frame in animation["frames"] for spin in frame["spins"]), default=0.)},
        "steps": [
            {"title": "明确模型与计数", "detail": "每条最近邻键仅计一次；取自旋长度 S、J>0、Δ≥1，并用 h 表示外场的能量。"},
            {"title": "选择参考态与磁胞", "detail": "FM 取全部 +z，磁胞长度 a；AFM 取 A/B 交替 ±z，磁胞长度 2a，布里渊区随之折叠。"},
            {"title": "线性化横向运动", "detail": "围绕参考态展开 Sx、Sy；使用 S⁺=Sx+iSy 和包含原子位置的 Bloch 相位得到 M(q)，再求本征频率。"},
            {"title": "检查稳定性后解读偏振", "detail": "比较参考态与竞争态的经典能量，检查最低分支和零模；稳定模式才用于有限周期动画。AFM 两分支具有相反全局圆偏振。"},
        ],
        "warnings": warnings, "sources": SOURCES,
    }
