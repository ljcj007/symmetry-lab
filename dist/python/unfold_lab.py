"""Bounded 1D orthogonal tight-binding band unfolding, using NumPy only.

The primitive spacing a=1 and energies are in eV. In the site basis the
supercell Bloch convention is psi(R*N+j)=exp(i*K*R*N)*c[j]. Projection onto
the primitive Bloch vector exp(i*k*j)/sqrt(N) gives a spectral weight, not
a new eigenvalue. This is not a WAVECAR reader or a generic 3D unfolding code.
"""
from __future__ import annotations

import json
import math
import numpy as np

SOURCES = [
    {"title": "easyunfold: band unfolding theory and wavefunction requirements",
     "url": "https://smtg-bham.github.io/easyunfold/theory.html"},
    {"title": "Popescu and Zunger (2012), effective band structure from supercell calculations",
     "url": "https://doi.org/10.1103/PhysRevB.85.085201"},
]
MODELS = {"perfect": "完整链", "impurity": "周期重复的杂质", "dimerized": "交替跃迁链",
          "alternating": "交替在位势链", "vacancy": "真正删去轨道的空位链"}
MAX_BYTES = 2_000_000
TOL = 2e-8


def _number(obj, key, default, lo, hi, integer=False):
    x = obj.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not lo <= x <= hi or not math.isfinite(x):
        raise ValueError(f"{key} 必须是 {lo} 至 {hi} 的有限实数")
    if integer and int(x) != x:
        raise ValueError(f"{key} 必须为整数")
    return int(x) if integer else float(x)


def _real_array(obj, key, shape):
    if key not in obj:
        raise ValueError(f"导入缺少 {key}；仅有本征值不能计算展开权重")
    value = obj[key]
    # Reject booleans and numeric strings as well as non-finite/complex values.
    def numeric(v):
        if isinstance(v, list):
            return all(numeric(x) for x in v)
        try:
            return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
        except OverflowError:
            return False
    if not isinstance(value, list) or not numeric(value):
        raise ValueError(f"{key} 必须是有限实数的 JSON 数组")
    try:
        a = np.asarray(value, dtype=float)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(f"{key} 数组形状无效") from exc
    if a.shape != shape:
        raise ValueError(f"{key} 的形状应为 {shape}，实际为 {a.shape}")
    return a


def _wrap(k):
    return (np.asarray(k) + math.pi) % (2 * math.pi) - math.pi


def fold_k(k, n):
    """k in radians/a -> representative K in [-pi/N,pi/N)."""
    period = 2 * math.pi / n
    return float((k + period / 2) % period - period / 2)


def hamiltonian(K, size, hopping=1., onsite=0., model="perfect", defect_strength=1.5,
                defect_site=0, dimerization=.3, alternating_potential=.5):
    """Return H(K), retained site indices; boundary links are added, not assigned.

    Adding links is essential for N=2: intracell and intercell bonds connect
    the same pair of basis orbitals and both must contribute.
    """
    h = np.eye(size, dtype=complex) * onsite
    if model == "impurity":
        h[defect_site, defect_site] += defect_strength
    if model == "alternating":
        h += np.diag([alternating_potential * (-1)**j for j in range(size)])
    for j in range(size):
        other = (j + 1) % size
        bond = hopping * (1 + dimerization * (-1)**j) if model == "dimerized" else hopping
        phase = np.exp(1j * K * size) if j == size - 1 else 1.
        h[j, other] += -bond * phase
        h[other, j] += -bond * np.conj(phase)
    sites = [j for j in range(size) if model != "vacancy" or j != defect_site]
    return h[np.ix_(sites, sites)], sites


def project(K, vectors, sites, size):
    """Rows are N primitive momenta, columns are eigenstates."""
    momenta = _wrap(K + 2 * math.pi * np.arange(size) / size)
    order = np.argsort(momenta)
    momenta = momenta[order]
    fourier = np.exp(-1j * np.outer(momenta, sites)) / math.sqrt(size)
    weights = np.abs(fourier @ vectors)**2
    return momenta, weights


def _import(data):
    if not isinstance(data, dict):
        raise ValueError("data 必须是预处理数据对象")
    if data.get("schema") != "symmetry-lab-unfold-1":
        raise ValueError("schema 必须为 symmetry-lab-unfold-1")
    if data.get("phaseConvention") != "supercell-bloch":
        raise ValueError("必须明确 phaseConvention='supercell-bloch'：ψ(RN+j)=exp(iKRN)c_j")
    if data.get("energyUnit", "eV") != "eV" or data.get("momentumUnit", "1/a") != "1/a":
        raise ValueError("只接受 energyUnit='eV'、momentumUnit='1/a'；kPoints 是弧度波数，不是 k/π")
    n = _number(data, "size", None, 2, 12, True)
    sites = data.get("orbitalSites")
    if (not isinstance(sites, list) or not 1 <= len(sites) <= n or
            any(isinstance(x, bool) or not isinstance(x, int) or not 0 <= x < n for x in sites)
            or len(set(sites)) != len(sites)):
        raise ValueError("orbitalSites 必须是 0..N−1 中不重复的整数列表；每个原胞至多一个正交轨道")
    m = len(sites)
    raw_k = data.get("kPoints")
    if not isinstance(raw_k, list) or not 1 <= len(raw_k) <= 121:
        raise ValueError("kPoints 必须含 1 至 121 个超胞 K 点")
    count = len(raw_k)
    ks = _real_array(data, "kPoints", (count,))
    if np.any(np.abs(ks) > math.pi/n + 1e-12):
        raise ValueError("kPoints 必须在超胞第一布里渊区 [−π/N,π/N] 内")
    if count > 1 and np.any(np.diff(ks) <= 1e-12):
        raise ValueError("kPoints 必须严格递增且不能重复")
    energies = _real_array(data, "energies", (count, m))
    if np.max(np.abs(energies)) > 1e6:
        raise ValueError("导入能量绝对值上限为 10⁶ eV")
    real = _real_array(data, "eigenvectorsReal", (count, m, m))
    imag = _real_array(data, "eigenvectorsImag", (count, m, m))
    vectors = real + 1j * imag
    orth = float(max(np.max(np.abs(c.conj().T @ c - np.eye(m))) for c in vectors))
    if orth > TOL:
        raise ValueError(f"本征向量列必须构成完整正交归一基；最大误差 {orth:.3g}")
    supplied_h = "hamiltoniansReal" in data or "hamiltoniansImag" in data
    if supplied_h:
        hs = (_real_array(data, "hamiltoniansReal", (count, m, m)) +
              1j * _real_array(data, "hamiltoniansImag", (count, m, m)))
        if float(np.max(np.abs(hs))) > 1e6:
            raise ValueError("导入 Hamiltonian 元素绝对值上限为 10⁶ eV")
        scale = max(1., float(np.max(np.abs(hs))))
        herm = float(np.max(np.abs(hs - hs.conj().transpose(0, 2, 1))))
        if herm > TOL * scale:
            raise ValueError(f"Hamiltonian 必须厄米；最大误差 {herm:.3g}")
        residual = max(float(np.max(np.abs(h @ c - c * e))) for h, c, e in zip(hs, vectors, energies))
        if residual > TOL * max(scale, float(np.max(np.abs(energies))), 1.):
            raise ValueError(f"输入本征对不满足 Hc=Ec；最大误差 {residual:.3g}")
    else:
        hs = np.array([(c * e) @ c.conj().T for c, e in zip(vectors, energies)])
    # Sorting eigenvalues must reorder columns, never rows.
    for i in range(count):
        order = np.argsort(energies[i])
        energies[i] = energies[i, order]
        vectors[i] = vectors[i][:, order]
    return n, sites, ks, energies, vectors, hs, supplied_h


def _selection(K, e, c, sites, n, requested_q, band, exact):
    momenta, weights = project(K, c, sites, n)
    target = math.pi * requested_q
    channel = int(np.argmin(np.abs(_wrap(momenta - target))))
    k = float(momenta[channel])
    # Display the user's +pi endpoint when it is the same reciprocal point.
    if requested_q > 0 and abs(k + math.pi) < 1e-10:
        k = math.pi
    coeff = c[:, band]
    return {"requestedQ": requested_q, "q": k/math.pi, "k": k, "K": float(K),
            "exactRequestedMomentum": bool(exact), "samplingDistance": float(abs(_wrap(k-target))),
            "energies": e.tolist(), "weights": weights[channel].tolist(),
            "band": band, "energy": float(e[band]), "weight": float(weights[channel, band]),
            "coefficients": [{"site": int(j), "real": float(z.real), "imag": float(z.imag),
                              "probability": float(abs(z)**2)} for j, z in zip(sites, coeff)],
            "channels": [{"k": float(q), "kOverPi": float(q/math.pi), "weight": float(w)}
                         for q, w in zip(momenta, weights[:, band])]}


def run(payload=None):
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("输入必须为 JSON 对象")
    try:
        encoded = json.dumps(payload, allow_nan=False, ensure_ascii=False)
    except (TypeError, ValueError, OverflowError, RecursionError) as exc:
        raise ValueError("输入必须仅包含有限的 JSON 数据") from exc
    if len(encoded.encode("utf-8")) > MAX_BYTES:
        raise ValueError("输入 JSON 上限为 2 MB")
    mode = payload.get("mode", "model")
    if mode not in ("model", "import"):
        raise ValueError("mode 只接受 model 或 import")
    q = _number(payload, "q", .25, -1, 1)
    warnings = ["一维单轨道正交基教学模型；不直接读取 VASP WAVECAR，不由 POSCAR 或本征值单独猜测展开权重。",
                "展开保留超胞本征能量，只改变原胞动量分辨的谱权重；不是实际 ARPES 光电矩阵元。",
                "简并子空间内单一本征态的权重依赖基选择；合并等能态后的谱函数保持不变。"]
    if mode == "model":
        n = _number(payload, "size", 4, 2, 12, True)
        model = payload.get("model", "perfect")
        if not isinstance(model, str) or model not in MODELS:
            raise ValueError("model 只接受 perfect、impurity、dimerized、alternating、vacancy")
        if model in ("dimerized", "alternating") and n % 2:
            raise ValueError("交替跃迁或交替在位势要求偶数超胞大小，以保证跨胞周期一致")
        p = {"mode": mode, "model": model, "size": n,
             "hopping": _number(payload, "hopping", 1., .001, 20),
             "onsite": _number(payload, "onsite", 0., -20, 20),
             "defectStrength": _number(payload, "defectStrength", 1.5, -30, 30),
             "defectSite": _number(payload, "defectSite", 0, 0, n-1, True),
             "dimerization": _number(payload, "dimerization", .3, -.95, .95),
             "alternatingPotential": _number(payload, "alternatingPotential", .5, -20, 20),
             "samples": _number(payload, "samples", 81, 9, 121, True), "q": q}
        def model_h(K):
            return hamiltonian(K, n, p["hopping"], p["onsite"], model,
                               p["defectStrength"], p["defectSite"], p["dimerization"], p["alternatingPotential"])
        # Include the SC endpoints for a complete folded-band display. The
        # duplicate physical endpoint is excluded from the unfolded samples.
        ks = np.linspace(-math.pi/n, math.pi/n, p["samples"]+1)
        hs = []
        for K in ks:
            h, sites = model_h(K)
            hs.append(h)
        hs = np.array(hs)
        energies, vectors = np.linalg.eigh(hs)
        unfold_count = len(ks)-1
        supplied_h = True
        Ksel = fold_k(math.pi*q, n)
        hsel, _ = model_h(Ksel)
        esel, csel = np.linalg.eigh(hsel)
        selected_exact = True
        if model in ("impurity", "vacancy"):
            warnings.append("杂质或空位每 N 个原胞重复一次，模拟周期缺陷阵列，不是单个孤立缺陷。")
    else:
        n, sites, ks, energies, vectors, hs, supplied_h = _import(payload.get("data"))
        p = {"mode": mode, "model": "import", "size": n, "samples": len(ks), "q": q}
        unfold_count = len(ks)
        selected_i = int(np.argmin([min(abs(_wrap(mom-math.pi*q)))
                                    for mom, _ in [project(K, c, sites, n) for K, c in zip(ks, vectors)]]))
        Ksel, esel, csel = ks[selected_i], energies[selected_i], vectors[selected_i]
        momenta, _ = project(Ksel, csel, sites, n)
        selected_exact = float(np.min(np.abs(_wrap(momenta-math.pi*q)))) < 1e-9
        warnings.append("导入只在已有 K 点投影，不插值或补造波函数。所选 k 若未采样，显示最近的实际 k 点。")
        if not supplied_h:
            warnings.append("未提供独立 Hamiltonian；已检查本征向量正交归一，无法独立验证其对应真实材料 Hamiltonian。")
    m = len(sites)
    band = _number(payload, "band", 0, 0, m-1, True)
    p.update({"band": band, "orbitalSites": sites, "bands": m, "energyUnit": "eV",
              "momentumUnit": "1/a", "phaseConvention": "supercell-bloch"})
    state_error, momentum_error, first_moment_error = 0., 0., 0.
    all_k, all_e, all_w = [], [], []
    for i, (K, e, c, h) in enumerate(zip(ks, energies, vectors, hs)):
        momenta, weights = project(K, c, sites, n)
        state_error = max(state_error, float(np.max(np.abs(np.sum(weights, axis=0)-1))))
        momentum_error = max(momentum_error, float(np.max(np.abs(np.sum(weights, axis=1)-m/n))))
        f = np.exp(1j*np.outer(sites, momenta))/math.sqrt(n)
        first_moment = np.real(np.sum(f.conj()*(h@f), axis=0))
        first_moment_error = max(first_moment_error, float(np.max(np.abs(weights@e-first_moment))))
        if i < unfold_count:
            all_k.extend(momenta.tolist())
            all_e.extend([e.tolist()] * n)
            all_w.extend(weights.tolist())
    order = np.argsort(all_k, kind="stable")
    ak, ae, aw = np.array(all_k)[order], np.array(all_e)[order], np.array(all_w)[order]
    orth = float(max(np.max(np.abs(c.conj().T@c-np.eye(m))) for c in vectors))
    herm = float(np.max(np.abs(hs-hs.conj().transpose(0, 2, 1))))
    residual = float(max(np.max(np.abs(h@c-c*e)) for h, c, e in zip(hs, vectors, energies)))
    energy_scale = max(1., float(np.max(np.abs(energies))), float(np.max(np.abs(hs))))
    checks = {"stateWeightSumMaxError": state_error, "momentumWeightSumMaxError": momentum_error,
              "expectedMomentumWeightSum": m/n, "hermitianMaxError": herm,
              "orthonormalMaxError": orth, "eigenpairResidualMax": residual,
              "firstMomentMaxError": first_moment_error, "hamiltonianProvided": supplied_h,
              "allPassed": bool(max(state_error, momentum_error, orth) < TOL and
                                max(residual, herm, first_moment_error) < TOL*energy_scale) }
    if mode == "model" and p["model"] == "perfect":
        expected = p["onsite"]-2*p["hopping"]*np.cos(ak)
        # Degenerate eigenvectors can share weight; the spectral second
        # central moment tests recovery without assuming a particular basis.
        mismatch = float(np.max(np.sum(aw*(ae-expected[:, None])**2, axis=1)))
        checks.update({"perfectChainSpectralVarianceMax": mismatch, "perfectChainRecovered": mismatch < 1e-12})
    if m < n:
        warnings.append(f"保留 M={m} 个轨道、参考原胞位置 N={n}：Σ能带 W(k)=M/N={m/n:.6g}。不把缺失谱权重重新归一到 1。")
    selection = _selection(Ksel, esel, csel, sites, n, q, band, selected_exact)
    return {"tool": "unfold_lab", "version": "1.0", "parameters": p,
            "summary": {"title": MODELS.get(p["model"], "预处理波函数展开"), "supercellSize": n,
                        "retainedOrbitals": m, "foldedPoints": len(ks), "unfoldedPoints": len(ak),
                        "energyRange": [float(np.min(energies)), float(np.max(energies))],
                        "selectedWeight": selection["weight"], "normalizationPassed": checks["allPassed"]},
            "folded": {"k": ks.tolist(), "kOverPi": (ks/math.pi).tolist(), "energies": energies.tolist()},
            "unfolded": {"k": ak.tolist(), "kOverPi": (ak/math.pi).tolist(),
                         "energies": ae.tolist(), "weights": aw.tolist()},
            "selection": selection, "checks": checks,
            "derivation": [
                {"title": "确定超胞周期与折叠动量", "formula": "A=Na；K=k−2πm/N ∈ [−π/N,π/N)",
                 "text": "原胞长度 a=1。每个超胞 K 对应 N 个互不等价的原胞 k=K+2πm/N（模 2π）。"},
                {"title": "求解带边界 Bloch 相位的 Hamiltonian", "formula": "ψ(RN+j)=e^(iKRN)c_j；H(K)c_n=E_n(K)c_n",
                 "text": "跨胞最近邻键带 e^(±iKN) 相位。N=2 时跨胞和胞内键连接同一轨道对，必须相加。"},
                {"title": "投影得到原胞动量谱权重", "formula": "W_n(k)=|Σ_j e^(−ikj)c_jn / √N|²",
                 "text": "使用保留轨道的位置映射 j。相干求和包含复相位，只用能量或 |c_j|² 无法还原展开。"},
                {"title": "检查完备性并解释光谱", "formula": "Σ_m W_n(K+2πm/N)=1；Σ_n W_n(k)=M/N；A(k,E)=Σ_n W_n(k)δ(E−E_n)",
                 "text": "M=N 时每个 k 的总谱权重为 1；删去轨道后为 M/N。完整链恢复 ε−2t cos k，缺陷把谱权重分散到多条超胞能带。"}],
            "warnings": warnings, "sources": SOURCES}
