"""Finite, explicit BdG teaching models; no gap equation or material fitting.

Energies are in an arbitrary common unit, positions in lattice constants,
and momenta are in radians (ka).  The square model keeps the full spinful
Nambu basis, so its particle-hole check must not be applied to a lone
spin block with the wrong particle-hole operator.
"""
from __future__ import annotations

import math
import numpy as np

SOURCES = [
    {"title": "Kwant: superconductors and particle-hole degrees of freedom",
     "url": "https://kwant-project.org/doc/latest/tutorial/superconductors"},
    {"title": "Kitaev (2001): Unpaired Majorana fermions in quantum wires",
     "url": "https://arxiv.org/abs/cond-mat/0010440"},
    {"title": "Topology in condensed matter: Kitaev chain",
     "url": "https://topocondmat.org/w1_topointro/1D.html"},
]
PAIRINGS = {
    "s": ("s 波", "1", "A₁g"),
    "extended_s": ("扩展 s 波", "(cos kx + cos ky)/2", "A₁g"),
    "d_x2_y2": ("d(x²−y²) 波", "(cos kx − cos ky)/2", "B₁g"),
    "d_xy": ("d(xy) 波", "sin kx sin ky", "B₂g"),
    "d+id": ("手性 d+id 波", "(cos kx − cos ky)/2 + i sin kx sin ky", "B₁g + i B₂g"),
}


def _number(payload, key, default, lower, upper):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not lower <= value <= upper or not math.isfinite(value):
        raise ValueError(f"{key} 必须是 {lower} 至 {upper} 的有限实数")
    return float(value)


def _integer(payload, key, default, lower, upper):
    value = _number(payload, key, default, lower, upper)
    if value != int(value):
        raise ValueError(f"{key} 必须为整数")
    return int(value)


def gap_function(kx, ky, amplitude, pairing):
    """Scalar even-parity singlet gap; works on NumPy arrays or scalars."""
    if pairing == "s":
        return amplitude * (1 + 0 * np.asarray(kx) + 0 * np.asarray(ky))
    if pairing == "extended_s":
        return amplitude * (np.cos(kx) + np.cos(ky)) / 2
    if pairing == "d_x2_y2":
        return amplitude * (np.cos(kx) - np.cos(ky)) / 2
    if pairing == "d_xy":
        return amplitude * np.sin(kx) * np.sin(ky)
    if pairing == "d+id":
        return amplitude * ((np.cos(kx) - np.cos(ky)) / 2 + 1j * np.sin(kx) * np.sin(ky))
    raise ValueError("不支持的配对基函数")


def square_bdg(kx, ky, hopping, chemical_potential, gap, pairing):
    xi = -2 * hopping * (math.cos(kx) + math.cos(ky)) - chemical_potential
    d = gap_function(kx, ky, gap, pairing)
    pairing_matrix = d * np.array([[0., 1.], [-1., 0.]])
    h = xi * np.eye(2)
    return np.block([[h, pairing_matrix], [pairing_matrix.conj().T, -h]])


def kitaev_bdg(k, hopping, chemical_potential, gap):
    xi = -2 * hopping * math.cos(k) - chemical_potential
    d = 2j * gap * math.sin(k)
    return np.array([[xi, d], [d.conjugate(), -xi]])


def kitaev_chain(sites, hopping, chemical_potential, gap):
    h = -chemical_potential * np.eye(sites)
    pair = np.zeros((sites, sites))
    for i in range(sites - 1):
        h[i, i + 1] = h[i + 1, i] = -hopping
        pair[i, i + 1], pair[i + 1, i] = gap, -gap
    return np.block([[h, pair], [pair.T, -h.T]])


def _checks(matrices, minus_matrices, dimension, pairing_residual):
    swap = np.block([[np.zeros((dimension, dimension)), np.eye(dimension)],
                     [np.eye(dimension), np.zeros((dimension, dimension))]])
    herm = max(float(np.max(np.abs(h - h.conj().T))) for h in matrices)
    phs = max(float(np.max(np.abs(swap @ h.conj() @ swap + hm))) for h, hm in zip(matrices, minus_matrices))
    return {"hermiticity_residual": herm, "particle_hole_residual": phs,
            "pauli_residual": float(pairing_residual), "passed": bool(max(herm, phs, pairing_residual) < 1e-10),
            "particle_hole_operator": "C = τx K（电子/空穴块交换，再复共轭）；C H(k) C⁻¹ = −H(−k)",
            "pauli_condition": "Δ(k) = −Δᵀ(−k)", "residual_norm": "最大矩阵元绝对值"}


def _unique_points(points):
    out = []
    for point in points:
        # Identify opposite zone faces as one point on the momentum torus.
        p = [float((x + math.pi) % (2 * math.pi) - math.pi) for x in point]
        if not any(max(abs(a - b) for a, b in zip(p, q)) < 1e-9 for q in out):
            out.append(p)
    return out


def _square_nodes(p):
    """Analytic zero-energy classification, independent of the display mesh."""
    t, mu, gap, pairing = p["hopping"], p["chemical_potential"], p["gap"], p["pairing"]
    within = abs(mu) <= 4 * t
    if not within:
        return {"gapless": False, "kind": "no_normal_fermi_surface", "points": [],
                "explanation": "|μ|>4t，正常态能带没有费米面，故 ξ 与 Δ 不会同时为零。"}
    if gap == 0:
        return {"gapless": True, "kind": "normal_state", "points": [],
                "explanation": "Δ₀=0；零能集合是正常态 ξ(k)=0，在带边退化为一个点。"}
    if pairing == "s":
        return {"gapless": False, "kind": "fully_gapped", "points": [],
                "explanation": "非零常数 s 波在整个费米面上均非零。"}
    if pairing == "extended_s":
        nodal = mu == 0
        return {"gapless": nodal, "kind": "fermi_surface_nodes" if nodal else "fully_gapped", "points": [],
                "explanation": "在本最近邻单带模型的费米面上 Δ(k)=−Δ₀μ/(4t)；μ=0 时整条费米面均为节点。"}
    if pairing == "d_x2_y2":
        k = math.acos(float(np.clip(-mu / (4 * t), -1, 1)))
        points = _unique_points([[sx * k, sy * k] for sx in (-1, 1) for sy in (-1, 1)])
        return {"gapless": True, "kind": "point_nodes", "points": points,
                "explanation": "联立 ξ=0 与 cos kx=cos ky，得到 cos kx=cos ky=−μ/(4t)。"}
    if pairing == "d_xy":
        points = []
        for fixed in (0., math.pi):
            other_cos = -mu / (2 * t) - math.cos(fixed)
            if -1 <= other_cos <= 1:
                other = math.acos(other_cos)
                for sign in (-1, 1):
                    points.extend([[fixed, sign * other], [sign * other, fixed]])
        return {"gapless": True, "kind": "point_nodes", "points": _unique_points(points),
                "explanation": "联立 ξ=0 与 sin kx sin ky=0；节点位于坐标轴或布里渊区边界。"}
    nodal = abs(mu) == 4 * t
    points = [[0., 0.]] if mu == -4 * t else ([[-math.pi, -math.pi]] if mu == 4 * t else [])
    return {"gapless": nodal, "kind": "band_edge_node" if nodal else "fully_gapped", "points": points,
            "explanation": "复能隙为零要求两个实基函数同时为零，只能在 Γ 或 M；仅 μ=−4t 或 +4t 时同时满足 ξ=0。"}


def _fermi_surface(p):
    t, mu, delta, pairing = (p[k] for k in ("hopping", "chemical_potential", "gap", "pairing"))
    c = -mu / (2 * t)
    if abs(c) > 2:
        return {"exists": False, "branches": [], "equation": "cos kx + cos ky = −μ/(2t)"}
    lo, hi = max(-1., c - 1), min(1., c + 1)
    x = np.linspace(math.acos(hi), math.acos(lo), max(51, p["path_samples"]))
    y = np.arccos(np.clip(c - np.cos(x), -1, 1))
    branches = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            d = np.asarray(gap_function(sx * x, sy * y, delta, pairing), dtype=complex)
            branches.append({"kx": (sx * x).tolist(), "ky": (sy * y).tolist(),
                             "real": d.real.tolist(), "imag": d.imag.tolist(),
                             "magnitude": np.abs(d).tolist(), "phase": np.angle(d).tolist()})
    return {"exists": True, "branches": branches, "equation": "cos kx + cos ky = −μ/(2t)",
            "qualification": "正常态等能线 ξ=0；超导态零能节点还要求 Δ(k)=0。带边时等能线收缩为一点。"}


def _square(p):
    t, mu, delta, pairing = (p[k] for k in ("hopping", "chemical_potential", "gap", "pairing"))
    k = np.linspace(-math.pi, math.pi, p["grid"])
    kx, ky = np.meshgrid(k, k)
    d = np.asarray(gap_function(kx, ky, delta, pairing), dtype=complex)
    xi = -2 * t * (np.cos(kx) + np.cos(ky)) - mu
    energy = np.hypot(xi, np.abs(d))
    vertices = np.array([[0., 0.], [math.pi, 0.], [math.pi, math.pi], [0., 0.]])
    points, distance, ticks, accumulated = [], [], [{"value": 0., "label": "Γ"}], 0.
    for index, (a, b) in enumerate(zip(vertices[:-1], vertices[1:])):
        length = float(np.linalg.norm(b - a))
        for fraction in np.linspace(0, 1, p["path_samples"], endpoint=False):
            points.append(a + fraction * (b - a))
            distance.append(accumulated + fraction * length)
        accumulated += length
        ticks.append({"value": accumulated, "label": ["X", "M", "Γ"][index]})
    points.append(vertices[-1]); distance.append(accumulated)
    matrices = [square_bdg(*point, t, mu, delta, pairing) for point in points]
    minus = [square_bdg(*(-point), t, mu, delta, pairing) for point in points]
    eig = np.linalg.eigvalsh(np.asarray(matrices))
    pair_residual = float(np.max(np.abs(d - gap_function(-kx, -ky, delta, pairing))))
    checks = _checks(matrices, minus, 2, pair_residual)
    checks["spectrum_pair_residual"] = float(np.max(np.abs(eig + eig[:, ::-1])))
    nodes = _square_nodes(p)
    name, formula, irrep = PAIRINGS[pairing]
    warnings = ["给定配对势的平均场教学模型；没有自洽能隙方程，不预测临界温度、配对机制或具体材料参数。",
                "网格最小能量只是采样值，不能据此证明没有节点；节点结论来自对本模型 ξ=0、Δ=0 的解析联立。",
                "四条 BdG 能带含电子—空穴冗余，两条正能带简并；不能把正负能带重复计作独立激发。",
                "能隙相位在 |Δ|=0 处无定义；绘图输出的零相位仅为占位，零幅值点应淡化。"]
    if pairing == "d+id":
        warnings.append("方格 D₄h 中 B₁g 与 B₂g 是不同的一维不可约表示；等幅 d+id 是人为指定的复组合，四方对称性不强制它们简并或同时凝聚。本模块不计算其 Chern 数。")
    if abs(mu) > 4 * t:
        warnings.append("当前 μ 位于正常态能带外，图中不存在正常态费米面。")
    return {"tool": "pairing_lab", "model": "square_singlet", "parameters": p,
            "summary": {"title": name + "：方格晶格自旋单态", "irrep": irrep,
                        "energy_unit": "共同任意能量单位（t、μ、Δ₀ 使用相同单位）", "momentum_unit": "ka（弧度）",
                        "sampled_min_energy": float(np.min(energy)), "analytic_nodes": nodes,
                        "gap_convention": "最小正激发能 min E₊；不是负、正 BdG 分支之间的间距 2 min E₊。",
                        "time_reversal": "破缺（Δ₀>0 时）" if pairing == "d+id" and delta > 0 else "保持",
                        "gap_formula": "Δ(k) = Δ₀ [" + formula + "]", "basis": "(c_k↑, c_k↓, c†_−k↑, c†_−k↓)",
                        "normal_fermi_surface": bool(abs(mu) <= 4 * t)},
            "bands": {"distance": distance, "momenta": np.asarray(points).tolist(), "energies": eig.tolist(),
                      "ticks": ticks, "path": "Γ–X–M–Γ", "orientation": "energies[k_index][band_index]"},
            "gap_map": {"kx": k.tolist(), "ky": k.tolist(), "real": d.real.tolist(), "imag": d.imag.tolist(),
                        "magnitude": np.abs(d).tolist(), "phase": np.angle(d).tolist(),
                        "xi": xi.tolist(), "energy": energy.tolist(), "orientation": "matrix[ky_index][kx_index]"},
            "fermi_surface": _fermi_surface(p), "checks": checks, "warnings": warnings, "sources": SOURCES,
            "derivation": [
                {"title": "交换反对称性", "formula": "Δσσ′(k)=−Δσ′σ(−k)", "explanation": "单态自旋矩阵 iσy 反对称，因此标量轨道函数必须是偶函数。"},
                {"title": "正常态与配对", "formula": "ξ(k)=−2t(cos kx+cos ky)−μ；Δspin(k)=Δ(k)iσy", "explanation": "t>0 是最近邻跃迁；这里使用给定的基函数和幅值。"},
                {"title": "构造完整 BdG 矩阵", "formula": "H(k)=[[ξ I₂, Δspin],[Δspin†, −ξ I₂]]", "explanation": "保留完整四维 Nambu 基，直接检验厄米性及 C=τxK 的粒子—空穴关系。"},
                {"title": "谱与节点", "formula": "E=±√(ξ²+|Δ|²)，每个符号二重简并；E=0 ⇔ ξ=0 且 Δ=0", "explanation": nodes["explanation"]},
            ]}


def _kitaev_bulk_min(t, mu, delta):
    # Minimize E² over x=cos k in [-1,1], not over a display mesh.
    candidates = [-1., 1.]
    a = t * t - delta * delta
    if a > 0:
        x = -mu * t / (2 * a)
        if -1 < x < 1:
            candidates.append(x)
    energies = [math.hypot(mu + 2 * t * x, 2 * delta * math.sqrt(max(0., 1 - x * x))) for x in candidates]
    i = int(np.argmin(energies))
    return energies[i], math.acos(candidates[i])


def _kitaev(p):
    t, mu, delta, n = (p[k] for k in ("hopping", "chemical_potential", "gap", "sites"))
    k = np.linspace(-math.pi, math.pi, 2 * p["path_samples"] + 1)
    matrices = [kitaev_bdg(float(q), t, mu, delta) for q in k]
    minus = [kitaev_bdg(float(-q), t, mu, delta) for q in k]
    energies = np.linalg.eigvalsh(np.asarray(matrices))
    matrix = kitaev_chain(n, t, mu, delta)
    eigenvalues, eigenvectors = np.linalg.eigh(matrix)
    # Select the ±E pair closest to zero, then the next pair. A degenerate
    # eigenvector's distribution is basis dependent; its pair projector is not.
    chosen = np.argsort(np.abs(eigenvalues), kind="stable")[:4]
    pair = chosen[:2]
    edge_sites = max(1, min(4, n // 10))
    selected = []
    for index in chosen:
        v = eigenvectors[:, index]
        weights = np.abs(v[:n]) ** 2 + np.abs(v[n:]) ** 2
        selected.append({"index": int(index), "energy": float(eigenvalues[index]),
                         "site_weight": weights.tolist(), "electron_weight": float(np.sum(np.abs(v[:n]) ** 2)),
                         "hole_weight": float(np.sum(np.abs(v[n:]) ** 2)),
                         "edge_weight": float(np.sum(weights[:edge_sites]) + np.sum(weights[-edge_sites:]))})
    subspace = eigenvectors[:, pair]
    pair_weights = np.sum(np.abs(subspace[:n]) ** 2 + np.abs(subspace[n:]) ** 2, axis=1) / 2
    gap, minimum_k = _kitaev_bulk_min(t, mu, delta)
    critical = abs(mu) == 2 * t
    normal_gapless = delta == 0 and abs(mu) <= 2 * t
    gapless = critical or normal_gapless
    topological = not gapless and abs(mu) < 2 * t
    phase = "体能隙闭合：相界" if critical else ("无配对的无隙正常链" if normal_gapless else ("有隙拓扑相" if topological else "有隙平庸相"))
    invariant = None if gapless else (-1 if topological else 1)
    checks = _checks(matrices, minus, 1, 0.)
    real_checks = _checks([matrix], [matrix], n, 0.)
    checks.update({"open_chain_hermiticity_residual": real_checks["hermiticity_residual"],
                   "open_chain_particle_hole_residual": real_checks["particle_hole_residual"],
                   "spectrum_pair_residual": float(np.max(np.abs(eigenvalues + eigenvalues[::-1]))),
                   "pair_weight_normalization_residual": float(abs(np.sum(pair_weights) - 1))})
    checks["passed"] = bool(checks["passed"] and real_checks["passed"] and checks["spectrum_pair_residual"] < 1e-9)
    warnings = ["Kitaev 链是有效无自旋奇宇称模型，不是带自旋电子的单态 s 波链；Δij=−Δji 保证费米交换反对称性。",
                "开放边界链长度有限：拓扑区间内两端模式仍可能杂化并产生非零分裂，不能用有限链最小能量替代体拓扑判据。",
                "端态权重为 |u|²+|v|²，不是电荷密度；最低两态平均空间权重在该双态子空间内部换基下不变。若与其他态简并，则选取两态本身不唯一。",
                "给定配对势，不求自洽能隙，也不预测真实材料的临界温度、输运电导或 Majorana 实验信号。"]
    if gapless:
        warnings.append("当前无限链体能隙闭合，Z₂ 指标留空；有限链离散能级间距不能解释为无限链体能隙。")
    if not topological:
        warnings.append("当前参数不处于有隙拓扑相；仍显示最低四态供对比，不把它们自动称作拓扑端态。")
    return {"tool": "pairing_lab", "model": "kitaev", "parameters": p,
            "summary": {"title": "Kitaev 链：奇宇称配对与开放边界", "phase": phase,
                        "topological": topological, "gapless": gapless, "z2_invariant": invariant,
                        "analytic_bulk_gap": gap, "bulk_minimum_k": minimum_k,
                        "gap_convention": "体能隙为最小正激发能 min E₊；不是负、正 BdG 分支之间的间距 2 min E₊。",
                        "finite_chain_min_abs_energy": float(np.min(np.abs(eigenvalues))),
                        "edge_sites_per_end": edge_sites, "pair_edge_weight": float(np.sum(pair_weights[:edge_sites]) + np.sum(pair_weights[-edge_sites:])),
                        "energy_unit": "共同任意能量单位", "momentum_unit": "ka（弧度）",
                        "basis": "bulk：(c_k,c†_−k)；open：(c₁…cN,c†₁…c†N)",
                        "criterion": "Δ≠0 且 |μ|<2t 为有隙拓扑相；|μ|=2t 体能隙闭合；Δ=0 且 |μ|≤2t 为无隙正常态。"},
            "bands": {"distance": k.tolist(), "momenta": [[float(q)] for q in k], "energies": energies.tolist(),
                      "ticks": [{"value": -math.pi, "label": "−π"}, {"value": 0., "label": "0"}, {"value": math.pi, "label": "π"}],
                      "path": "−π → π", "orientation": "energies[k_index][band_index]"},
            "chain": {"sites": list(range(1, n + 1)), "energies": eigenvalues.tolist(),
                      "selected_modes": selected, "near_zero_pair_weight": pair_weights.tolist(),
                      "boundary": "open", "pair_weight_definition": "最低 |E| 两态的 (|u_j|²+|v_j|²) 平均，所有格点求和为 1"},
            "checks": checks, "warnings": warnings, "sources": SOURCES,
            "derivation": [
                {"title": "奇宇称与反对称配对", "formula": "Δj,j+1=Δ₀；Δj+1,j=−Δ₀ ⇒ Δ(k)=2iΔ₀ sin k", "explanation": "无自旋模型的轨道部分必须反对称；这里 Δ₀ 是实空间键配对幅值。"},
                {"title": "体 BdG 谱", "formula": "ξ=−2t cos k−μ；E=±√[(2t cos k+μ)²+4Δ₀²sin²k]", "explanation": "一般 k 处配对打开能隙，k=0、π 处奇宇称配对严格为零。"},
                {"title": "相变与拓扑指标", "formula": "ν=sgn[(μ+2t)(μ−2t)]（仅有隙时）；ν=−1 为拓扑相", "explanation": "同时要求体能隙不为零；Δ=0 的金属区不能沿用这个符号作为有隙相指标。"},
                {"title": "开放边界", "formula": "Hopen=[[h,Δ], [Δ†,−hᵀ]]；wj=|uj|²+|vj|²", "explanation": "取消首尾连接后数值对角化；观察端部局域及有限尺寸能级分裂。"},
            ]}


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError("配对实验输入必须是 JSON 对象")
    allowed = {"action", "model", "hopping", "chemical_potential", "gap", "pairing", "grid", "path_samples", "sites"}
    unknown = set(payload) - allowed
    if unknown:
        raise ValueError("不支持的参数：" + ", ".join(sorted(str(x) for x in unknown)))
    model = payload.get("model", "square_singlet")
    if model not in ("square_singlet", "kitaev"):
        raise ValueError("model 仅支持 square_singlet 或 kitaev")
    pairing = payload.get("pairing", "d_x2_y2")
    if not isinstance(pairing, str) or pairing not in PAIRINGS:
        raise ValueError("pairing 必须是 s、extended_s、d_x2_y2、d_xy 或 d+id")
    p = {"model": model, "hopping": _number(payload, "hopping", 1., .05, 5.),
         "chemical_potential": _number(payload, "chemical_potential", 0., -25., 25.),
         "gap": _number(payload, "gap", .4, 0., 5.), "pairing": pairing,
         "grid": _integer(payload, "grid", 41, 11, 81),
         "path_samples": _integer(payload, "path_samples", 61, 11, 121),
         "sites": _integer(payload, "sites", 40, 6, 80)}
    # Return only parameters that enter the selected model, to prevent the
    # singlet dropdown being mistaken for a Kitaev pairing choice.
    if model == "kitaev":
        p.pop("pairing"); p.pop("grid")
        return _kitaev(p)
    p.pop("sites")
    return _square(p)
