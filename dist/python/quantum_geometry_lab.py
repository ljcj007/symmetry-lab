"""SSH/QWZ lower-band geometry in a fixed periodic orbital basis (NumPy only).

A_mu=i<u|partial_mu u>; Q_mu_nu=g_mu_nu-i Omega_mu_nu/2.
Momenta are dimensionless ka, oriented x then y. FHS flux is minus the
argument of the forward overlap plaquette, matching magnetictb_browser.
An exact model-specific direct gap prevents a mesh from hiding a transition.
"""
import math
import numpy as np

SOURCES = [
    {"id": "geometry-fhs", "title": "Fukui, Hatsugai, Suzuki：离散布里渊区 Chern 数", "url": "https://arxiv.org/abs/cond-mat/0503172"},
    {"id": "geometry-qwz", "title": "Qi, Wu, Zhang：二维晶格拓扑模型", "url": "https://arxiv.org/abs/cond-mat/0505308"},
    {"id": "geometry-metric", "title": "tbkit：Bloch 带的量子度规与 Berry 曲率", "url": "https://cpoli.github.io/tbkit/api/gallery/topology/plot_quantum_geometry.html"},
    {"id": "geometry-ssh", "title": "Su, Schrieffer, Heeger：Solitons in Polyacetylene", "url": "https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.42.1698"},
]


def _number(obj, key, default, lo, hi, integer=False):
    x = obj.get(key, default)
    if (isinstance(x, bool) or not isinstance(x, (int, float))
            or not lo <= x <= hi or not math.isfinite(x)):
        raise ValueError(f"{key} 必须是 {lo} 至 {hi} 的有限实数")
    if integer and (not isinstance(x, int)):
        raise ValueError(f"{key} 必须为整数")
    return int(x) if integer else float(x)


def model_vectors(kx, ky, p):
    """Return d, partial_x d, partial_y d for H=d.sigma; broadcast over k."""
    x, y = np.broadcast_arrays(np.asarray(kx, float), np.asarray(ky, float))
    zero = np.zeros_like(x)
    if p["model"] == "qwz":
        scale = p["energyScale"]
        d = scale * np.stack([np.sin(x), np.sin(y), p["mass"] + np.cos(x) + np.cos(y)], axis=-1)
        dx = scale * np.stack([np.cos(x), zero, -np.sin(x)], axis=-1)
        dy = scale * np.stack([zero, np.cos(y), -np.sin(y)], axis=-1)
    else:
        a, b = p["t1"], p["t2"]
        d = np.stack([a+b*np.cos(x), b*np.sin(x), zero], axis=-1)
        dx = np.stack([-b*np.sin(x), b*np.cos(x), zero], axis=-1)
        dy = np.stack([zero, zero, zero], axis=-1)
    return d, dx, dy


def hamiltonian(d):
    d = np.asarray(d)
    h = np.empty(d.shape[:-1] + (2, 2), dtype=complex)
    h[..., 0, 0], h[..., 1, 1] = d[..., 2], -d[..., 2]
    h[..., 0, 1], h[..., 1, 0] = d[..., 0]-1j*d[..., 1], d[..., 0]+1j*d[..., 1]
    return h


def geometry_fields(d, dx, dy, tolerance=1e-10):
    """Analytic two-band projector geometry; undefined at unresolved degeneracy."""
    radius = np.linalg.norm(d, axis=-1)
    valid = 2*radius > tolerance
    denominator = np.where(valid, radius, 1.)
    n = d / denominator[..., None]
    nx = (dx-n*np.sum(n*dx, axis=-1)[..., None]) / denominator[..., None]
    ny = (dy-n*np.sum(n*dy, axis=-1)[..., None]) / denominator[..., None]
    gxx = np.sum(nx*nx, axis=-1)/4
    gxy = np.sum(nx*ny, axis=-1)/4
    gyy = np.sum(ny*ny, axis=-1)/4
    curvature = np.sum(n*np.cross(nx, ny), axis=-1)/2
    return {"gxx": gxx, "gxy": gxy, "gyy": gyy, "metricTrace": gxx+gyy,
            "berryCurvature": curvature, "gap": 2*radius, "valid": valid, "n": n}


def _masked(values, valid):
    return np.where(valid, np.asarray(values, dtype=object), None).tolist()


def _angle_difference(a, b):
    return float(abs(np.angle(np.exp(1j*(a-b)))))


def _fhs(vectors):
    """vectors[ky,kx,orbital]; oriented plaquette kx -> ky."""
    ux = np.sum(vectors.conj()*np.roll(vectors, -1, axis=1), axis=-1)
    uy = np.sum(vectors.conj()*np.roll(vectors, -1, axis=0), axis=-1)
    minimum = float(min(np.min(abs(ux)), np.min(abs(uy))))
    if minimum <= 1e-10:
        return {"value": None, "minOverlap": minimum, "maxPlaquettePhase": None, "valid": False}
    ux, uy = ux/abs(ux), uy/abs(uy)
    loop = ux*np.roll(uy, -1, axis=1)*np.roll(ux, -1, axis=0).conj()*uy.conj()
    flux = -np.angle(loop)
    return {"value": float(np.sum(flux)/(2*math.pi)), "minOverlap": minimum,
            "maxPlaquettePhase": float(np.max(abs(flux))), "valid": True}


def _zak(vectors):
    links = np.sum(vectors.conj()*np.roll(vectors, -1, axis=0), axis=-1)
    minimum = float(np.min(abs(links)))
    if minimum <= 1e-10:
        return {"value": None, "minOverlap": minimum, "maxPlaquettePhase": None, "valid": False}
    value = float(-np.angle(np.prod(links/abs(links))))
    # Report the equivalent representative in [0,2pi), snapping only branch noise.
    value %= 2*math.pi
    if abs(value-2*math.pi) < 1e-12 or abs(value) < 1e-12:
        value = 0.
    return {"value": value, "minOverlap": minimum, "maxPlaquettePhase": None, "valid": True}


def _gap(p):
    if p["model"] == "qwz":
        mass = p["mass"]
        gap = 2*p["energyScale"]*min(abs(mass+2), abs(mass), abs(mass-2))
        tolerance = 1e-10 * p["energyScale"]
        analytic = (1 if -2 < mass < 0 else -1 if 0 < mass < 2 else 0) if gap > tolerance else None
        gap_points = [[0., 0.], [-math.pi, 0.], [0., -math.pi], [-math.pi, -math.pi]]
        closing = [point for point in gap_points
                   if 2*np.linalg.norm(model_vectors(*point, p)[0]) <= tolerance]
        formula = "Δ_direct=2s min(|m+2|,|m|,|m−2|)；m=−2,0,2 闭隙"
    else:
        gap = 2*abs(p["t1"]-p["t2"])
        tolerance = 1e-10 * max(p["t1"], p["t2"], 1e-12)
        analytic = (math.pi if p["t2"] > p["t1"] else 0.) if gap > tolerance else None
        closing = [[-math.pi, 0.]] if gap <= tolerance else []
        if p["t1"] == p["t2"] == 0:
            closing = []
        formula = "Δ_direct=2|t₁−t₂|；t₁=t₂ 时 k=π 闭隙，两者全零则全带简并"
    return gap, tolerance, analytic, closing, formula


def _sample(p, mesh, gapped, analytic, tolerance, include_grid=False):
    k = np.linspace(-math.pi, math.pi, mesh, endpoint=False)
    if p["model"] == "qwz":
        x, y = np.meshgrid(k, k, indexing="xy")
        phase = p["gaugeStrength"]*(np.sin(x)+.37*np.cos(y)+.23*np.sin(x+y))
    else:
        x, y = k, np.zeros_like(k)
        phase = p["gaugeStrength"]*(np.sin(x)+.37*np.cos(2*x))
    d, dx, dy = model_vectors(x, y, p)
    fields = geometry_fields(d, dx, dy, tolerance)
    eigenvalues, eigenvectors = np.linalg.eigh(hamiltonian(d))
    u = eigenvectors[..., :, 0]
    transformed = u*np.exp(1j*phase)[..., None]
    projector = u[..., :, None]*u[..., None, :].conj()
    changed_projector = transformed[..., :, None]*transformed[..., None, :].conj()
    valid_local = fields["valid"]
    projector_residual = float(np.max(abs(projector-changed_projector))) if np.any(valid_local) else None
    algorithm = _fhs if p["model"] == "qwz" else _zak
    first, second = algorithm(u), algorithm(transformed)
    first["valid"] = bool(first["valid"] and gapped)
    second["valid"] = bool(second["valid"] and gapped)
    difference = None
    if first["valid"] and second["valid"]:
        difference = (abs(first["value"]-second["value"]) if p["model"] == "qwz"
                      else _angle_difference(first["value"], second["value"]))
    # Compare all link magnitudes, not just their minima.
    axes = (0, 1) if p["model"] == "qwz" else (0,)
    overlap_error = max(float(np.max(abs(
        abs(np.sum(u.conj()*np.roll(u, -1, axis=a), axis=-1))-
        abs(np.sum(transformed.conj()*np.roll(transformed, -1, axis=a), axis=-1))))) for a in axes)
    value = first["value"] if first["valid"] else None
    error = (abs(value-analytic) if p["model"] == "qwz" else _angle_difference(value, analytic)) if value is not None else None
    curvature_integral = float(np.sum(fields["berryCurvature"])*(2*math.pi/mesh)**2/(2*math.pi)) if p["model"] == "qwz" and gapped else None
    row = {"mesh": mesh, "value": value, "curvatureIntegral": curvature_integral,
           "curvatureIntegralError": abs(curvature_integral-analytic) if curvature_integral is not None else None,
           "errorToAnalytic": error, "minOverlap": first["minOverlap"],
           "maxPlaquettePhase": first["maxPlaquettePhase"] if gapped else None,
           "valid": first["valid"], "sampledDirectGap": float(np.min(fields["gap"]))}
    gauge = {"strength": p["gaugeStrength"], "projectorResidual": projector_residual,
             "overlapMagnitudeResidual": overlap_error, "topologyDifference": difference,
             "passed": bool(projector_residual < 1e-12 and overlap_error < 1e-12 and difference < 1e-10) if difference is not None else None,
             "phaseFormula": "α(k)=s[sin kx+0.37 cos ky+0.23 sin(kx+ky)]" if p["model"] == "qwz" else "α(k)=s[sin k+0.37 cos 2k]",
             "meaning": "只改变同一带本征矢的 U(1) 相位，不改变轨道嵌入、晶胞或 Hamiltonian。"}
    grid = None
    if include_grid:
        grid = {name: _masked(fields[name], valid_local) for name in ("gxx", "gxy", "gyy", "metricTrace", "berryCurvature")}
        grid.update({"gap": fields["gap"].tolist(), "valid": valid_local.tolist(), "kx": k.tolist(), "ky": k.tolist(), "orientation": "matrix[ky_index][kx_index]"})
    return row, gauge, grid, fields


def _bands(p):
    count = p["pathSamples"]
    if p["model"] == "ssh":
        x = np.linspace(-math.pi, math.pi, count)
        d = model_vectors(x, np.zeros_like(x), p)[0]
        ticks = [{"value": -math.pi, "label": "−π"}, {"value": 0., "label": "0"}, {"value": math.pi, "label": "π"}]
        return {"distance": x.tolist(), "energies": np.stack([-np.linalg.norm(d, axis=-1), np.linalg.norm(d, axis=-1)], axis=-1).tolist(), "ticks": ticks, "path": "−π → π"}
    vertices = [(np.array([0., 0.]), "Γ"), (np.array([math.pi, 0.]), "X"),
                (np.array([math.pi, math.pi]), "M"), (np.array([0., 0.]), "Γ")]
    points, distance, ticks, position = [], [], [], 0.
    for (a, label), (b, _) in zip(vertices, vertices[1:]):
        ticks.append({"value": position, "label": label})
        length = float(np.linalg.norm(b-a))
        for fraction in np.linspace(0., 1., count, endpoint=False):
            points.append(a+(b-a)*fraction)
            distance.append(position+length*float(fraction))
        position += length
    points.append(vertices[-1][0]); distance.append(position)
    ticks.append({"value": position, "label": "Γ"})
    points = np.asarray(points)
    energy = np.linalg.norm(model_vectors(points[:, 0], points[:, 1], p)[0], axis=-1)
    return {"distance": distance, "energies": np.stack([-energy, energy], axis=-1).tolist(), "ticks": ticks, "path": "Γ → X → M → Γ"}


def _selection(p, tolerance):
    d, dx, dy = model_vectors(p["kx"], p["ky"] if p["model"] == "qwz" else 0., p)
    fields = geometry_fields(d, dx, dy, tolerance)
    _, u = np.linalg.eigh(hamiltonian(d)); u = u[:, 0]
    projector = np.outer(u, u.conj())
    alpha = p["gaugeStrength"]*(math.sin(p["kx"])+.37*math.cos(p["ky"])+.23*math.sin(p["kx"]+p["ky"])) if p["model"] == "qwz" else p["gaugeStrength"]*(math.sin(p["kx"])+.37*math.cos(2*p["kx"]))
    changed = u*np.exp(1j*alpha)
    valid = bool(fields["valid"])
    values = {key: float(fields[key]) if valid else None for key in ("gxx", "gxy", "gyy", "metricTrace", "berryCurvature")}
    return {"kx": p["kx"], "ky": p["ky"] if p["model"] == "qwz" else 0., "energy": float(fields["gap"])/2,
            "gap": float(fields["gap"]), "valid": valid, **values,
            "blochVector": (-fields["n"]).tolist() if valid else None,
            "eigenvector": [[float(z.real), float(z.imag)] for z in u] if valid else None,
            "transformedEigenvector": [[float(z.real), float(z.imag)] for z in changed] if valid else None,
            "projector": [[[float(z.real), float(z.imag)] for z in row] for row in projector] if valid else None,
            "phase": alpha,
            "blochVectorConvention": "下带期望值 <σ>=−d/|d|；能量为 E₋=−energy。"}


def run(payload=None):
    payload = {} if payload is None else payload
    if not isinstance(payload, dict):
        raise ValueError("量子几何输入必须是 JSON 对象")
    allowed = {"model", "mass", "energyScale", "t1", "t2", "mesh", "pathSamples", "gaugeStrength", "kx", "ky"}
    if set(payload)-allowed:
        raise ValueError("未知量子几何输入字段：" + ", ".join(str(x) for x in set(payload)-allowed))
    model = payload.get("model", "qwz")
    if not isinstance(model, str) or model not in ("qwz", "ssh"):
        raise ValueError("model 必须为 qwz 或 ssh")
    p = {"model": model, "mass": _number(payload, "mass", -1., -6., 6.),
         "energyScale": _number(payload, "energyScale", 1., .05, 10.),
         "t1": _number(payload, "t1", .6, 0., 5.), "t2": _number(payload, "t2", 1., 0., 5.),
         "mesh": _number(payload, "mesh", 31, 9, 101, True),
         "pathSamples": _number(payload, "pathSamples", 121, 31, 401, True),
         "gaugeStrength": _number(payload, "gaugeStrength", 1., 0., 20.),
         "kx": _number(payload, "kx", .6, -math.pi, math.pi),
         "ky": _number(payload, "ky", .4, -math.pi, math.pi)}
    gap, tolerance, analytic, closing, gap_formula = _gap(p)
    gapped = gap > tolerance
    rows = []
    base, gauge, heatmap, fields = _sample(p, p["mesh"], gapped, analytic, tolerance, include_grid=model == "qwz")
    rows.append(base)
    fine, _, _, _ = _sample(p, 2*p["mesh"]-1, gapped, analytic, tolerance)
    rows.append(fine)
    resolved = bool(gapped and all(row["valid"] and row["errorToAnalytic"] < 1e-8
                                  and (row["maxPlaquettePhase"] is None or row["maxPlaquettePhase"] < math.pi-1e-5) for row in rows))
    value = fine["value"] if resolved else None
    if not gapped:
        reason = "解析直接间隙闭合或低于数值隔离阈值，下带不构成处处孤立的带；不报告 Zak/Chern。"
    elif not resolved:
        reason = "解析模型有隙，但当前两层网格未可靠复现模型拓扑值；请加密网格，不能把离散整数自动视为收敛。"
    else:
        reason = "孤立下带已通过解析间隙、两层网格及已知模型拓扑值核对；曲率积分仍需单独检查数值收敛。"
    valid = fields["valid"]
    det = fields["gxx"]*fields["gyy"]-fields["gxy"]**2
    metric_check = float(np.max(abs((det-fields["berryCurvature"]**2/4)[valid]))) if np.any(valid) else None
    determinant_min = float(np.min(det[valid])) if np.any(valid) else None
    trace_bound = float(np.min((fields["metricTrace"]-abs(fields["berryCurvature"]))[valid])) if np.any(valid) else None
    line = None
    if model == "ssh":
        k = np.linspace(-math.pi, math.pi, p["pathSamples"])
        ds = model_vectors(k, np.zeros_like(k), p)
        geo = geometry_fields(*ds, tolerance)
        line = {"k": k.tolist(), "metric": _masked(geo["gxx"], geo["valid"]),
                "gap": geo["gap"].tolist(), "valid": geo["valid"].tolist(),
                "energies": np.stack([-geo["gap"]/2, geo["gap"]/2], axis=-1).tolist()}
    warnings = [
        "SSH 与 QWZ 均为固定基底的两带教学模型，不输出真实材料的 Chern 数、输运电导或超流权重。",
        "选择下带且化学势位于零能隙；所有能量采用共同任意单位，动量为无量纲 ka，晶格常数 a=1。",
        "U(1) 本征态相位不改变投影、度规与拓扑；重新选择晶胞或改变轨道嵌入属于另一种变换，不能与此混淆。",
        "FHS 整数化不等于物理收敛：仍需检查全局直接间隙、链重叠、单元通量及网格变化。",
        "度规来自解析投影导数，FHS/Zak 来自离散本征态链；曲率黎曼积分是另一项近似积分，近闭隙时可能很慢收敛。",
    ]
    if model == "ssh":
        warnings.append("SSH 的 Zak 相位以给定周期轨道基与胞内/胞间键约定定义，模 2π；不能不指定嵌入与原点就把 Zak/2π 当成绝对材料极化。")
    if not gapped:
        warnings.append("当前处于闭隙诊断区：即使离散网格的最小能隙大于零，也不能定义整条下带的拓扑量。局部未简并点仍可显示几何。")
    elif not resolved:
        warnings.append("当前网格未充分分辨拓扑；主拓扑结果留空，收敛表保留网格数值供诊断。")
    return {"tool": "quantum_geometry_lab", "model": model, "parameters": p,
            "unusedParameters": ["t1", "t2"] if model == "qwz" else ["mass", "energyScale", "ky"],
            "title": "QWZ：量子度规、Berry 曲率与 Chern 诊断" if model == "qwz" else "SSH：量子度规与 Zak 相位",
            "synthetic": True,
            "convention": {"connection": "A=i<u|∇u>", "qgt": "Qμν=gμν−iΩμν/2", "band": "lower",
                           "orientation": "kx then ky", "momenta": "dimensionless ka; a=1",
                           "orbitalGauge": "fixed periodic orbital basis; identity sewing at BZ boundary",
                           "fhs": "Uμ=<u(k)|u(k+δμ)>/|overlap|；flux=−arg[Ux(k)Uy(k+δx)Ux*(k+δy)Uy*(k)]",
                           "hamiltonian": "H=s[sin kx σx+sin ky σy+(m+cos kx+cos ky)σz]" if model == "qwz" else "H=(t₁+t₂ cos k)σx+t₂ sin k σy"},
            "bands": _bands(p), "heatmap": heatmap, "line": line,
            "selection": _selection(p, tolerance),
            "topology": {"defined": bool(gapped), "numericallyResolved": resolved, "kind": "chern" if model == "qwz" else "zak",
                         "value": value, "integer": int(round(value)) if model == "qwz" and value is not None else None,
                         "analyticValue": analytic, "analyticDirectGap": gap, "gapTolerance": tolerance,
                         "gapFormula": gap_formula, "closingMomenta": closing, "reason": reason,
                         "unit": "dimensionless integer" if model == "qwz" else "radian modulo 2π",
                         "gridAgreement": resolved},
            "convergence": rows, "gauge": gauge,
            "checks": {"twoBandMetricIdentityResidual": metric_check, "minimumMetricDeterminant": determinant_min,
                       "minimumTraceMinusAbsCurvature": trace_bound, "sampledDirectGap": base["sampledDirectGap"],
                       "analyticDirectGap": gap, "globalGapResolved": bool(gapped),
                       "gapMissedByDisplayMesh": bool(not gapped and base["sampledDirectGap"] > tolerance),
                       "localUndefinedPoints": int(np.size(valid)-np.sum(valid))},
            "derivation": [
                {"title": "固定 Hamiltonian 与下带", "formula": "H=d·σ；P₋=(I−n·σ)/2，n=d/|d|", "explanation": "先检查整个布里渊区的直接间隙，不用有限网格最小值替代解析诊断。"},
                {"title": "从投影变化得到量子几何", "formula": "gμν=(∂μn·∂νn)/4；Ωxy=n·(∂xn×∂yn)/2（下带）", "explanation": "度规测量邻近态射线的变化，曲率由带取向决定；两者都不依赖本征态整体相位。"},
                {"title": "闭合链或网格拓扑", "formula": "Zak=−arg∏U；C=Σplaquette flux/(2π)", "explanation": "周期边界链接不可遗漏；规范相位因子在闭环上消去。"},
                {"title": "分别检查离散值与积分收敛", "formula": "det g=Ω²/4；tr g≥|Ω|（二维两带纯态）", "explanation": "比较 N 与 2N−1 网格、链重叠与通量；一个离散整数不能替代收敛和全局闭隙判断。"},
            ], "warnings": warnings, "sources": SOURCES}
