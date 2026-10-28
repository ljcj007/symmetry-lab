"""Intrinsic 2D QWZ Hall / transverse thermoelectric response (NumPy only).

Electron charge -e, e>0; A=i<u|du>, kx->ky orientation;
j_x = sigma_xy E_y - alpha_xy d_y T.  Thus C_lower=+1 gives
sigma_xy=-e^2/h for a filled lower band. alpha is a transport coefficient,
not an open-circuit Nernst voltage. All energies in eV, T in K.
"""
import math
import numpy as np

E_CHARGE = 1.602176634e-19
PLANCK = 6.62607015e-34
KB = 1.380649e-23
KB_EV = KB / E_CHARGE
CONDUCTANCE_QUANTUM = E_CHARGE**2 / PLANCK
THERMOELECTRIC_QUANTUM = E_CHARGE * KB / PLANCK

SOURCES = [
    {"id": "hall-xiao", "title": "Xiao et al.: Berry-phase effect in anomalous thermoelectric transport", "url": "https://arxiv.org/abs/cond-mat/0604561"},
    {"id": "hall-w90", "title": "Wannier90: Berry connection, curvature and anomalous Hall conductivity", "url": "https://wannier90.readthedocs.io/en/latest/user_guide/postw90/berry/"},
    {"id": "hall-fe", "title": "Wannier90: bcc Fe Berry curvature and anomalous Hall tutorial", "url": "https://wannier90.readthedocs.io/en/latest/tutorials/tutorial_18/"},
    {"id": "hall-qwz", "title": "Qi, Wu, Zhang: two-dimensional topological lattice model", "url": "https://arxiv.org/abs/cond-mat/0505308"},
]


def _number(data, key, default, low, high, integer=False):
    x = data.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not low <= x <= high:
        raise ValueError(f"{key} 必须为 {low} 至 {high} 的有限数值")
    if integer and not isinstance(x, int):
        raise ValueError(f"{key} 必须是整数")
    return int(x) if integer else float(x)


def _fields(mass, scale, n):
    k = -math.pi + 2*math.pi*np.arange(n)/n
    x, y = np.meshgrid(k, k, indexing="xy")
    cx, cy, sx, sy = np.cos(x), np.cos(y), np.sin(x), np.sin(y)
    radius = np.sqrt(sx*sx + sy*sy + (mass+cx+cy)**2)
    valid = 2*scale*radius > 1e-10
    safe = np.where(valid, radius, 1.)
    # d dot (dx d cross dy d) = cos x + cos y + m cos x cos y.
    omega = (cx+cy+mass*cx*cy)/(2*safe**3)
    omega = np.where(valid, omega, 0.)
    return {"k": k, "energy": scale*radius, "omega": omega, "valid": valid}


def fermi_entropy(energy, mu, temperature):
    """Occupation and dimensionless binary entropy; stable in both tails."""
    energy = np.asarray(energy, dtype=float)
    if temperature == 0:
        return (energy < mu).astype(float) + .5*(energy == mu), np.zeros_like(energy)
    with np.errstate(over="ignore", divide="ignore", invalid="ignore"):
        x = (energy-mu)/(KB_EV*temperature)
    x = np.where(energy == mu, 0., x)
    a = np.abs(x)
    z = np.exp(-a)
    f = np.where(x >= 0, z/(1+z), 1/(1+z))
    entropy = np.log1p(z) + np.minimum(a, 1e300)*z/(1+z)
    return f, entropy


def _response(fields, mu, temperature):
    fm, sm = fermi_entropy(-fields["energy"], mu, temperature)
    fp, sp = fermi_entropy(fields["energy"], mu, temperature)
    occ = fields["omega"]*(fm-fp)
    entropy = fields["omega"]*(sm-sp)
    sigma = -2*math.pi*float(np.mean(occ))
    alpha = 2*math.pi*float(np.mean(entropy))
    return {"sigmaInE2OverH": sigma, "alphaInEKbOverH": alpha,
            "sigmaXY": sigma*CONDUCTANCE_QUANTUM, "sigmaYX": -sigma*CONDUCTANCE_QUANTUM,
            "alphaXY": alpha*THERMOELECTRIC_QUANTUM, "alphaYX": -alpha*THERMOELECTRIC_QUANTUM}, occ, entropy


def _reference(mass, scale):
    gap = 2*scale*min(abs(mass+2), abs(mass), abs(mass-2))
    chern = None if gap <= 1e-10 else (1 if -2 < mass < 0 else -1 if 0 < mass < 2 else 0)
    return gap, chern


def _difference(a, b):
    ds = abs(a["sigmaInE2OverH"]-b["sigmaInE2OverH"])
    da = abs(a["alphaInEKbOverH"]-b["alphaInEKbOverH"])
    good = ds <= max(.002, .02*abs(b["sigmaInE2OverH"])) and da <= max(.0005, .05*abs(b["alphaInEKbOverH"]))
    return ds, da, bool(good)


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError("输入必须是 JSON 对象")
    p = {"mass": _number(payload, "mass", -1, -5, 5),
         "energyScale": _number(payload, "energyScale", 1, .02, 5),
         "temperature": _number(payload, "temperature", 300, 0, 5000),
         "chemicalPotential": _number(payload, "chemicalPotential", 0, -20, 20),
         "mesh": _number(payload, "mesh", 61, 15, 121, True),
         "muMin": _number(payload, "muMin", -3.5, -20, 20),
         "muMax": _number(payload, "muMax", 3.5, -20, 20),
         "scanPoints": _number(payload, "scanPoints", 61, 11, 101, True)}
    if p["muMin"] >= p["muMax"]:
        raise ValueError("化学势扫描终点必须大于起点")
    gap, chern = _reference(p["mass"], p["energyScale"])
    f = _fields(p["mass"], p["energyScale"], p["mesh"])
    fine = _fields(p["mass"], p["energyScale"], 2*p["mesh"])
    defined = chern is not None
    c0 = 2*math.pi*float(np.mean(f["omega"]))
    c1 = 2*math.pi*float(np.mean(fine["omega"]))
    geometry_ok = defined and max(abs(c0-chern), abs(c1-chern)) <= .01
    selected, occupied, entropy = _response(f, p["chemicalPotential"], p["temperature"])
    refined, _, _ = _response(fine, p["chemicalPotential"], p["temperature"])
    ds, da, stable = _difference(selected, refined)
    resolved = bool(geometry_ok and stable)
    reason = ("两带在解析动量处接触；本实现要求孤立带，停止报告带分辨横向响应。热图仅显示未简并采样点，不表示已计算闭隙体系的完整输运。" if not defined else
              "当前 μ、T 的两层网格与下带曲率积分检查通过；这不是所有温度和参数的收敛证明。" if resolved else
              "当前网格未能同时通过下带曲率积分和响应加密比较；数值仅为待收敛估计，请提高网格或温度并检查临界参数。")
    selection = {**selected, "defined": defined, "numericallyResolved": resolved, "reason": reason}
    mus = np.linspace(p["muMin"], p["muMax"], p["scanPoints"])
    rows = []
    for mu in mus:
        row, _, _ = _response(f, float(mu), p["temperature"])
        dense, _, _ = _response(fine, float(mu), p["temperature"])
        _, _, ok = _difference(row, dense)
        row.update(defined=defined, numericallyResolved=bool(geometry_ok and ok))
        if not defined:
            for key in selected:
                row[key] = None
        rows.append(row)
    if not defined:
        for key in selected:
            selection[key] = None
    masked = lambda arr: np.where(f["valid"], np.asarray(arr, dtype=object), None).tolist()
    convergence = [{"mesh": n, "sigmaXY": r["sigmaXY"] if defined else None,
                    "alphaXY": r["alphaXY"] if defined else None,
                    "lowerBandChernIntegral": c if defined else None}
                   for n, r, c in [(p["mesh"], selected, c0), (2*p["mesh"], refined, c1)]]
    warnings = [
        "二维 QWZ 两带模型，采用固定周期轨道基底；不含真实材料拟合、自旋简并倍数、普通磁场霍尔项、散射相关侧跳或偏斜散射。",
        "σxy 是片电导（S），αxy 是片横向热电响应（A/K）；不指定厚度转换成三维单位。电子电荷为 −e，jx=σxy Ey−αxy∂yT。",
        "αxy 不是开路 Nernst 电压或 Seebeck 系数。开路信号需要同一模型、同一单位下的完整 σ 与 α 张量，通过 S=σ⁻¹α 求得；本模块不拼接无关模型的纵向张量。",
        "温度与化学势独立指定；没有固定掺杂的电中性求解。两条带的贡献一并积分，满带/空带状态不携带费米熵。",
        "每个 μ 扫描点均做两层网格比较；稳定是有限容差诊断，不是严格误差界。低温金属费米面及临界曲率热点可能需要远高于本页上限的网格。",
        "真实 Wannier Berry 响应一般还需位置/连接矩阵及轨道嵌入约定，不能仅凭 hr 文件等同于完整第一性原理响应。",
    ]
    if p["temperature"] == 0:
        warnings.append("T=0 的 αxy 取严格极限0；金属的阶跃占据用离散网格积分，不提供由阶跃曲线粗差分得到的 Mott 预测。")
    if not resolved:
        warnings.append(reason)
    return {"model": "qwz-intrinsic-transverse", "parameters": p,
            "units": {"energy": "eV", "temperature": "K", "sigma": "S", "alpha": "A/K", "momentum": "ka (rad)",
                      "conductanceQuantum": CONDUCTANCE_QUANTUM, "thermoelectricQuantum": THERMOELECTRIC_QUANTUM,
                      "convention": "jx = sigma_xy Ey - alpha_xy d_y T; electron charge -e; A=i<u|du>; lower C=+1 gives sigma_xy=-e^2/h"},
            "selection": selection, "scan": {"chemicalPotentials": mus.tolist(), "rows": rows},
            "heatmap": {"kx": f["k"].tolist(), "ky": f["k"].tolist(), "berryCurvature": masked(f["omega"]),
                        "occupiedCurvature": masked(occupied), "entropyCurvature": masked(entropy), "gap": (2*f["energy"]).tolist()},
            "convergence": convergence,
            "checks": {"analyticDirectGap": gap, "analyticLowerChern": chern,
                       "needsRefinement": bool(defined and not resolved), "responseAvailable": defined,
                       "geometryResolved": bool(geometry_ok), "currentResponseStable": bool(defined and stable),
                       "sigmaAbsoluteDifference": ds*CONDUCTANCE_QUANTUM if defined else None,
                       "alphaAbsoluteDifference": da*THERMOELECTRIC_QUANTUM if defined else None,
                       "chernIntegralError": max(abs(c0-chern), abs(c1-chern)) if defined else None,
                       "scanUnresolvedPoints": sum(not r["numericallyResolved"] for r in rows),
                       "sampledDirectGap": float(2*np.min(f["energy"])), "finiteTemperature": p["temperature"] > 0},
            "derivation": [
                {"title": "固定模型、基底与符号", "formula": "H=s[sin kx σx+sin ky σy+(m+cos kx+cos ky)σz]；Ω−=d·(∂xd×∂yd)/(2|d|³)，Ω+=−Ω−", "text": "s 以 eV 输入，k 为无量纲 ka。正的共同能量尺度不改变曲率。"},
                {"title": "按电子占据积分", "formula": "σxy=−(e²/ℏ)Σn∫d²k/(2π)² Ωn fn；σxy/(e²/h)=−2π〈ΣnΩnfn〉", "text": "网格平均必须覆盖完整二维布里渊区，不能使用高对称线代替。"},
                {"title": "按费米熵积分", "formula": "αxy=(e kB/ℏ)Σn∫d²k/(2π)² Ωn sn；sn=−fn ln fn−(1−fn)ln(1−fn)", "text": "这是扣除平衡磁化电流后的内禀输运热电系数。严格零温熵核为零。"},
                {"title": "从系数到开路信号需要额外信息", "formula": "j=σE−α∇T；j=0 ⇒ E=S∇T，S=σ⁻¹α", "text": "本页只给出内禀横向项，不把 αxy 除以任意数值冒充 Nernst 信号。"}],
            "warnings": warnings, "sources": SOURCES}
