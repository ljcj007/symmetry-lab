"""Constant-relaxation-time intraband electronic transport on a complete BZ mesh.

NumPy only; 2D outputs are sheet coefficients, 3D outputs are volume coefficients.
Seebeck uses electron charge -e and E=S grad(T) at zero electrical current.
No phonon conductivity, Hall/Berry terms, gap fitting, or real-material ZT.
"""
from __future__ import annotations

import json
import math
import numpy as np

EV = E_CHARGE = 1.602176634e-19
KB = 1.380649e-23
HBAR = 1.054571817e-34
MAX_BYTES = 4_000_000
MAX_STATES = 150_000
SOURCES = [
    {"id": "boltztrap2", "title": "Madsen, Carrete & Verstraete: BoltzTraP2 (2018)",
     "url": "https://arxiv.org/abs/1712.07946"},
    {"id": "boltzwann", "title": "Wannier90 BoltzWann: transport integrals and conventions",
     "url": "https://wannier90.readthedocs.io/en/latest/user_guide/postw90/boltzwann/"},
]


def _number(obj, key, default, lo, hi, integer=False):
    x = obj.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not lo <= x <= hi or not math.isfinite(x):
        raise ValueError(f"{key} 必须为 {lo} 至 {hi} 的有限实数")
    if integer and int(x) != x:
        raise ValueError(f"{key} 必须为整数")
    return int(x) if integer else float(x)


def _array(obj, key, shape):
    value = obj.get(key)
    def valid(x, depth=0):
        if depth < len(shape):
            return isinstance(x, list) and len(x) == shape[depth] and all(valid(y, depth+1) for y in x)
        try:
            return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)
        except OverflowError:
            return False
    if not isinstance(value, list) or not valid(value):
        raise ValueError(f"{key} 必须为形状 {shape} 的有限实数 JSON 数组")
    try:
        out = np.asarray(value, dtype=float)
    except (ValueError, TypeError, OverflowError) as exc:
        raise ValueError(f"{key} 数组形状错误") from exc
    if out.shape != shape:
        raise ValueError(f"{key} 形状应为 {shape}，实际为 {out.shape}")
    return out


def fermi_kernel(x):
    """Return f(x), 1-f(x), f(1-f) without exponential overflow or cancellation."""
    z = np.exp(-np.abs(x))
    low, high = z/(1+z), 1/(1+z)
    return np.where(x >= 0, low, high), np.where(x >= 0, high, low), z/(1+z)**2


def model_data(dimension=2, hopping=1., anisotropy=.5, z_anisotropy=1., lattice=4., mesh=48, spin=2):
    fractions = (np.arange(mesh)+.5)/mesh
    frac = np.stack(np.meshgrid(*([fractions]*dimension), indexing="ij"), axis=-1).reshape(-1, dimension)
    q = 2*math.pi*frac
    ts = np.array([hopping, hopping*anisotropy] + ([hopping*z_anisotropy] if dimension == 3 else []))
    energies = np.sum(2*ts*(1-np.cos(q)), axis=1)[:, None]
    velocities = (2*ts*np.sin(q)*EV*lattice*1e-10/HBAR)[:, None, :]
    return {"dimension": dimension, "energies": energies, "velocities": velocities,
            "weights": np.full(len(frac), 1/len(frac)), "cellMeasureSI": (lattice*1e-10)**dimension,
            "cellMeasure": lattice**dimension, "spin": spin, "meshShape": [mesh]*dimension,
            "meshShift": [.5]*dimension, "kPoints": frac}


def _import(data):
    if not isinstance(data, dict) or data.get("schema") != "symmetry-lab-electron-transport-1":
        raise ValueError("data 必须为 schema='symmetry-lab-electron-transport-1' 的完整 BZ 数据")
    if data.get("sampling") != "full-uniform-bz":
        raise ValueError("只接受 full-uniform-bz 完整均匀布里渊区网格；高对称路径或未展开的不可约网格不能用于输运积分")
    if data.get("energyUnit") != "eV" or data.get("velocityUnit") != "m/s":
        raise ValueError("必须明确 energyUnit='eV'、velocityUnit='m/s'；速度使用正交笛卡尔分量")
    d = _number(data, "dimension", None, 2, 3, True)
    measure = _number(data, "cellMeasure", None, .01, 1e9)
    spin = _number(data, "spinDegeneracy", None, 1, 2, True)
    shape = data.get("meshShape")
    if not isinstance(shape, list) or len(shape) != d or any(isinstance(n, bool) or not isinstance(n, int) or not 2 <= n <= 121 for n in shape):
        raise ValueError("meshShape 必须含 dimension 个 2..121 的整数")
    count = math.prod(shape)
    if count > MAX_STATES:
        raise ValueError("网格点数超过 150000 的浏览器上限")
    shift = _array(data, "meshShift", (d,))
    if np.any(shift < 0) or np.any(shift >= 1):
        raise ValueError("meshShift 每分量必须在 [0,1)；它是网格步长单位的偏移")
    ks = _array(data, "kPoints", (count, d))
    if np.any(ks < 0) or np.any(ks >= 1):
        raise ValueError("kPoints 须为 [0,1) 中的分数倒易坐标；不含重复端点")
    indices = ks*np.array(shape)-shift
    rounded = np.rint(indices).astype(int)
    if np.max(np.abs(indices-rounded)) > 1e-7 or np.any(rounded < 0) or np.any(rounded >= np.array(shape)):
        raise ValueError("kPoints 与 meshShape / meshShift 声明的完整规则网格不匹配")
    if len(np.unique(rounded, axis=0)) != count:
        raise ValueError("完整 BZ 网格含重复点或缺失点；不能用路径点填充")
    weights = _array(data, "weights", (count,))
    if np.any(weights <= 0) or abs(float(np.sum(weights))-1) > 1e-8 or np.max(np.abs(weights-1/count)) > 1e-8/count:
        raise ValueError("本首版完整均匀 BZ 网格要求每点 weights=1/Nk 且总和为 1；不可约星权重不能代替完整速度张量")
    raw_e = data.get("energies")
    if not isinstance(raw_e, list) or len(raw_e) != count or not isinstance(raw_e[0], list):
        raise ValueError("energies 须为 [Nk][bands] 数组")
    bands = len(raw_e[0])
    if not 1 <= bands <= 8 or count*bands > MAX_STATES:
        raise ValueError("能带数须为 1..8，网格×能带总态数不超过 150000")
    es = _array(data, "energies", (count, bands))
    vs = _array(data, "velocities", (count, bands, d))
    if np.max(np.abs(es)) > 1000 or np.max(np.abs(vs)) > 1e8:
        raise ValueError("输入能量绝对值须≤1000 eV，速度分量绝对值须≤10⁸ m/s")
    return {"dimension": d, "energies": es, "velocities": vs, "weights": weights,
            "cellMeasureSI": measure*10**(-10*d), "cellMeasure": measure, "spin": spin,
            "meshShape": shape, "meshShift": shift.tolist(), "kPoints": ks}


def transport_moments(data, temperature, chemical_potential, tau_fs=None):
    """Evaluate dimensionless-energy moments J_r using x=(E-mu)/(kBT).

    L0=J0/(kBT), L1=J1, L2=kBT*J2 avoids powers of 1e-19 during inversion.
    Seebeck = -(kB/e) J0^-1 J1 and kappa/tau = kB(J2-J1 J0^-1 J1).
    """
    es, vs, w = data["energies"], data["velocities"], data["weights"]
    dim, bands = data["dimension"], es.shape[1]
    x = (es-chemical_potential)/(KB*temperature/EV)
    f, holes, g = fermi_kernel(x)
    coeff = data["spin"]/data["cellMeasureSI"]
    wg = w[:, None]*g
    mats = [coeff*np.einsum("nb,nbi,nbj->ij", wg*x**order, vs, vs, optimize=True) for order in range(3)]
    j0, j1, j2 = [(m+m.T)/2 for m in mats]
    filling = data["spin"]*float(np.sum(w[:, None]*f))
    empty = data["spin"]*float(np.sum(w[:, None]*holes))
    electron_density, hole_density = filling/data["cellMeasureSI"], empty/data["cellMeasureSI"]
    sigma = E_CHARGE**2*j0/(KB*temperature)
    eig = np.linalg.eigvalsh(j0)
    kernel_mass = float(np.sum(wg))
    trace_contributions = wg*np.sum(vs**2, axis=2)
    # Divide by the largest contribution before squaring: exponentially small
    # but nonzero thermal tails would otherwise produce a floating-point 0/0.
    trace_scale = float(np.max(trace_contributions))
    scaled_trace = trace_contributions/trace_scale if trace_scale > 0 else trace_contributions
    effective = float(np.sum(scaled_trace))**2/float(np.sum(scaled_trace**2)) if trace_scale > 0 else 0.
    condition_ratio = max(0., float(eig[0]/eig[-1])) if eig[-1] > 0 else 0.
    sparse = effective < 12
    active = kernel_mass >= 1e-14 and eig[-1] > 0 and condition_ratio >= 1e-10
    seebeck, kappa, lorenz = None, None, None
    warnings = []
    if kernel_mass < 1e-14:
        warnings.append("费米热窗口内的权重过小，载流子极少或能带接近全满；S 与 κ 的比值/抵消计算不可靠，返回 null。")
    elif condition_ratio < 1e-10:
        warnings.append("输运矩阵奇异或严重病态，部分方向没有可解析的导电响应；完整 S、κ 张量返回 null。")
    if sparse:
        warnings.append("热窗口的有效输运采样态少于 12；请提高网格密度并比较收敛，不能把离散峰解释为材料特征。")
    psd_min = None
    if active:
        inverse_j1 = np.linalg.solve(j0, j1)
        seebeck = -KB/E_CHARGE*inverse_j1*1e6
        thermal = j2-j1@inverse_j1
        thermal = (thermal+thermal.T)/2
        thermal_e, thermal_v = np.linalg.eigh(thermal)
        psd_min = float(thermal_e[0])
        tolerance = 1e-9*max(1., float(np.max(np.abs(j2))))
        if psd_min < -tolerance:
            warnings.append("电子热导协方差出现显著负特征值；数值不可靠，κ 返回 null。")
        else:
            # The covariance is positive semidefinite; only negative roundoff
            # eigenvalues within the above declared tolerance are clipped.
            thermal = (thermal_v*np.maximum(thermal_e, 0))@thermal_v.T
            kappa = KB*thermal
            lorenz = [float(kappa[i, i]/(sigma[i, i]*temperature)) if sigma[i, i] > 0 else None for i in range(dim)]
    tau = tau_fs*1e-15 if tau_fs is not None else None
    matrix = lambda v: None if v is None else v.tolist()
    return {"temperature": float(temperature), "chemicalPotential": float(chemical_potential),
            "fillingPerCell": filling, "emptyStatesPerCell": empty,
            "carrierDensity": electron_density, "electronDensity": electron_density, "holeDensity": hole_density,
            "sigmaOverTau": sigma.tolist(), "seebeckMicroV": matrix(seebeck), "kappaOverTau": matrix(kappa),
            "sigma": matrix(sigma*tau) if tau is not None else None,
            "kappa": matrix(kappa*tau) if tau is not None and kappa is not None else None,
            "lorenzDiagonal": lorenz,
            "diagnostics": {"kernelWeight": kernel_mass, "effectiveTransportStates": effective,
                            "conductivityEigenvalueRatio": condition_ratio, "illConditioned": not active,
                            "sparseThermalSampling": sparse, "thermalCovarianceMinimumEigenvalue": psd_min,
                            "occupationSumError": abs(filling+empty-data["spin"]*bands),
                            "conductivitySymmetryError": float(np.max(np.abs(sigma-sigma.T))),
                            "warnings": warnings}}


def run(payload=None):
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("输运输入须为 JSON 对象")
    try:
        raw = json.dumps(payload, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError, OverflowError, RecursionError) as exc:
        raise ValueError("输入须为有限 JSON 数据") from exc
    if len(raw.encode("utf8")) > MAX_BYTES:
        raise ValueError("输运 JSON 输入上限 4 MB")
    source = payload.get("source", "model")
    if source not in ("model", "import"):
        raise ValueError("source 仅支持 model 或 import")
    temperature = _number(payload, "temperature", 300., 10, 2000)
    mu = _number(payload, "chemicalPotential", .3, -1000, 1000)
    tau = None if payload.get("tauFs") is None else _number(payload, "tauFs", None, .01, 1e6)
    p = {"source": source, "temperature": temperature, "chemicalPotential": mu, "tauFs": tau,
         "muMin": _number(payload, "muMin", -.05, -1000, 1000),
         "muMax": _number(payload, "muMax", 1.55, -1000, 1000),
         "muSamples": _number(payload, "muSamples", 41, 3, 101, True)}
    if p["muMin"] >= p["muMax"]:
        raise ValueError("muMin 必须小于 muMax")
    if source == "model":
        d = _number(payload, "dimension", 2, 2, 3, True)
        p.update({"dimension": d, "hopping": _number(payload, "hopping", .25, .01, 5),
                  "anisotropy": _number(payload, "anisotropy", .5, .05, 4),
                  "zAnisotropy": _number(payload, "zAnisotropy", 1., .05, 4),
                  "latticeConstant": _number(payload, "latticeConstant", 4., .5, 30),
                  "mesh": _number(payload, "mesh", 48 if d == 2 else 24, 6, 121 if d == 2 else 51, True),
                  "spinDegeneracy": _number(payload, "spinDegeneracy", 2, 1, 2, True)})
        def build(mesh):
            return model_data(d, p["hopping"], p["anisotropy"], p["zAnisotropy"], p["latticeConstant"], mesh, p["spinDegeneracy"])
        data = build(p["mesh"])
    else:
        data = _import(payload.get("data"))
        d = data["dimension"]
        p.update({"dimension": d, "spinDegeneracy": data["spin"], "meshShape": data["meshShape"]})
    if data["energies"].size*p["muSamples"] > 15_000_000:
        raise ValueError("网格×能带×化学势点超过 1500 万，请减少扫描点或网格")
    p["cellMeasure"] = data["cellMeasure"]
    selection = transport_moments(data, temperature, mu, tau)
    mus = np.linspace(p["muMin"], p["muMax"], p["muSamples"])
    rows = [transport_moments(data, temperature, float(value), tau) for value in mus]
    convergence = {"available": False, "reason": "导入数据只有一个网格；请外部提供更密完整 BZ 数据进行比较。"}
    if source == "model":
        cap = 121 if d == 2 else 51
        compared_mesh = min(2*p["mesh"], cap) if p["mesh"] < cap else max(6, p["mesh"]//2)
        comparison = transport_moments(build(compared_mesh), temperature, mu, tau)
        a, b = np.array(selection["sigmaOverTau"]), np.array(comparison["sigmaOverTau"])
        scale = max(float(np.linalg.norm(a)), float(np.linalg.norm(b)))
        relative = float(np.linalg.norm(a-b)/scale) if scale > 0 else None
        s1, s2 = selection["seebeckMicroV"], comparison["seebeckMicroV"]
        delta_s = float(np.max(np.abs(np.array(s1)-np.array(s2)))) if s1 is not None and s2 is not None else None
        convergence = {"available": True, "selectedMesh": p["mesh"], "comparedMesh": compared_mesh,
                       "comparisonIsFiner": compared_mesh > p["mesh"], "sigmaRelativeDifference": relative,
                       "seebeckMaxDifferenceMicroV": delta_s,
                       "needsRefinement": relative is None or relative > .05 or delta_s is None or delta_s > 5,
                       "reason": "只对当前 μ、T 比较两网格；不是全扫描的收敛证明。达到上限时与较粗网格比较。"}
    units = {"energy": "eV", "temperature": "K", "velocity": "m/s", "tau": "fs", "seebeckMicroV": "µV/K",
             "density": "m⁻²" if d == 2 else "m⁻³", "cellMeasure": "Å²" if d == 2 else "Å³",
             "sigmaOverTau": "S/s" if d == 2 else "S/(m·s)", "sigma": "S" if d == 2 else "S/m",
             "kappaOverTau": "W/(K·s)" if d == 2 else "W/(m·K·s)", "kappa": "W/K" if d == 2 else "W/(m·K)",
             "lorenzDiagonal": "V²/K²", "filling": "electrons / input cell"}
    warnings = ["常数、标量且与能量无关的弛豫时间 τ 近似；忽略电子相互作用修正、带间相干、Hall/Berry 与磁场响应。",
                "S 的约定为开路 E=S∇T，电子电荷为 −e。κ_e 已扣除开路热电回流项；不是裸 L₂/T。",
                "填充/电子密度仅统计所给能带；holeDensity 是同一有限能带集合中的空态数，不自动等于真实材料掺杂浓度。",
                "仅计算电子贡献，不含声子热导、实际散射寿命或真实材料 ZT；给定 τ 才输出 σ 与 κ_e。",
                "网格积分必须解析 kBT 热窗口。化学势扫描可在低温稀疏网格上产生伪峰，请检查有效采样态与网格比较。"]
    if d == 2:
        warnings.append("二维结果为片电导/片电子热导，不把真空层厚度当物理体积；转换三维单位必须另给有物理意义的厚度。")
    if source == "import":
        warnings.append("已验证规则网格覆盖与权重，但不能独立验证用户提供的能量、速度和能带窗口是否收敛或来自同一物理模型。")
    elif convergence["needsRefinement"]:
        warnings.append("当前 μ、T 的两网格结果差异较大或无法比较；数值只作未收敛演示，不作为定量材料预测。")
    warnings.extend(selection["diagnostics"]["warnings"])
    return {"tool": "electron_transport_lab", "version": "20261027-quantum1", "parameters": p, "units": units,
            "summary": {"title": "二维片输运" if d == 2 else "三维体输运", "dimension": d,
                        "normalization": "sheet" if d == 2 else "volume", "kPointCount": len(data["weights"]),
                        "bands": data["energies"].shape[1], "spinDegeneracy": data["spin"],
                        "cellMeasureSI": data["cellMeasureSI"], "energyRange": [float(np.min(data["energies"])), float(np.max(data["energies"]))],
                        "absoluteCoefficientsAvailable": tau is not None},
            "selection": selection, "scan": {"chemicalPotentials": mus.tolist(), "rows": rows},
            "checks": {"fullBZGrid": True, "weightSum": float(np.sum(data["weights"])),
                       "stateCount": data["energies"].size, "convergence": convergence,
                       "occupationSumMaxError": max(r["diagnostics"]["occupationSumError"] for r in [selection]+rows)},
            "derivation": [
                {"title": "确定周期模型与速度", "formula": "E(q)=Σᵢ2tᵢ(1−cos qᵢ)；vᵢ=(2tᵢaᵢ/ℏ)sin qᵢ",
                 "text": "完整 BZ 权重和为 1；自旋简并只乘一次。速度必须是笛卡尔 m/s，路径本征值不足以完成积分。"},
                {"title": "对费米热窗口积分", "formula": "Lᵣ=(g/Ω)Σₙₖ wₖ vvᵀ(E−μ)ʳ(−∂f/∂E)",
                 "text": "E、μ 在积分中换为 J；Ω 是三维体积或二维面积。数值采用 x=(E−μ)/(kBT) 避免能量矩的单位病态。"},
                {"title": "取开路响应", "formula": "σ/τ=e²L₀；S=−L₀⁻¹L₁/(eT)；κₑ/τ=(L₂−L₁L₀⁻¹L₁)/T",
                 "text": "电子热导扣除电流被开路条件抵消的贡献。常数 τ 在 S 中抵消；σ 和 κ 与 τ 成正比。"},
                {"title": "检查单位与收敛", "formula": "n=(g/Ω)Σw f；n+nh=gNband/Ω",
                 "text": "有效载流子太少或导电矩阵奇异时不输出不稳定 S、κ；两网格比较只约束当前 μ、T。"}],
            "warnings": warnings, "sources": SOURCES}
