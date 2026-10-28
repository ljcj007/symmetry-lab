"""Two-terminal coherent transport through a finite one-orbital chain.

All energies are in eV.  H[i,i+1]=-t_i; each electrode is a semi-infinite
uniform chain.  Retarded electrode self energies use the exact real-energy
boundary value.  A positive eta in the device Green function is only a
numerical regulator, whose absorption is reported, not a scattering model.
"""
from __future__ import annotations

import math
import numpy as np

E_CHARGE = 1.602176634e-19
PLANCK = 6.62607015e-34
G_QUANTUM = E_CHARGE ** 2 / PLANCK
SOURCES = [
    {"id": "device-kwant", "title": "Kwant: a quantum wire, leads and Landauer conductance",
     "url": "https://www.kwant-project.org/doc/1/tutorial/first_steps"},
    {"id": "device-kwant-paper", "title": "Groth et al.: Kwant, a software package for quantum transport",
     "url": "https://arxiv.org/abs/1309.2926"},
    {"id": "device-local", "title": "Kwant: computing local densities and currents",
     "url": "https://kwant-project.org/doc/1/tutorial/operators"},
]


def _number(payload, key, default, lo, hi, integer=False):
    x = payload.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not lo <= x <= hi:
        raise ValueError(f"{key} 必须是 {lo} 至 {hi} 的有限实数")
    if not math.isfinite(x):
        raise ValueError(f"{key} 必须是有限实数")
    if integer and (not isinstance(x, int)):
        raise ValueError(f"{key} 必须为整数")
    return int(x) if integer else float(x)


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError("器件输入必须为 JSON 对象")
    model = payload.get("model", "uniform")
    if model not in ("uniform", "ssh"):
        raise ValueError("model 必须为 uniform 或 ssh")
    n = _number(payload, "sites", 12, 2, 40, True)
    p = {"model": model, "sites": n,
         "hopping": _number(payload, "hopping", 1, 0.05, 5),
         "dimerRatio": _number(payload, "dimerRatio", 0.6, 0.05, 3),
         "gate": _number(payload, "gate", 0, -10, 10),
         "barrier": _number(payload, "barrier", 0, -10, 10),
         "barrierStart": _number(payload, "barrierStart", n // 2, 0, n-1, True),
         "barrierWidth": _number(payload, "barrierWidth", 1, 1, n, True),
         "leadHopping": _number(payload, "leadHopping", 1, 0.05, 5),
         "leadOnsite": _number(payload, "leadOnsite", 0, -10, 10),
         "contactLeft": _number(payload, "contactLeft", 1, 0, 5),
         "contactRight": _number(payload, "contactRight", 1, 0, 5),
         "energy": _number(payload, "energy", 0.2, -30, 30),
         "energyMin": _number(payload, "energyMin", -2.5, -30, 30),
         "energyMax": _number(payload, "energyMax", 2.5, -30, 30),
         "samples": _number(payload, "samples", 161, 41, 301, True),
         "eta": _number(payload, "eta", 1e-7, 1e-9, 1e-3),
         "spinDegeneracy": _number(payload, "spinDegeneracy", 1, 1, 2, True)}
    if p["barrierStart"] + p["barrierWidth"] > n:
        raise ValueError("势垒起点与宽度超出散射区；站点编号从 0 开始")
    if p["energyMin"] >= p["energyMax"]:
        raise ValueError("能量扫描终点须大于起点")
    return p


def lead_surface_green(energy, hopping, onsite=0.0):
    """Exact g^r(E+i0) of a uniform semi-infinite chain, units eV^-1.

    The inside-band imaginary part is negative.  The outside-band form
    2/(x+sign(x)*sqrt(x*x-4*t*t)) avoids subtracting nearly equal numbers.
    """
    x, t = float(energy-onsite), float(hopping)
    if abs(x) < 2*t:
        return complex(x, -math.sqrt(max(0.0, 4*t*t-x*x))) / (2*t*t)
    if abs(x) == 2*t:
        return complex(x / (2*t*t), 0)
    return complex(2 / (x + math.copysign(math.sqrt(x*x-4*t*t), x)), 0)


def hamiltonian(p):
    n = p["sites"]
    onsite = np.full(n, p["gate"], dtype=float)
    start = p["barrierStart"]
    onsite[start:start+p["barrierWidth"]] += p["barrier"]
    hoppings = np.full(n-1, p["hopping"], dtype=float)
    if p["model"] == "ssh":
        hoppings[::2] *= p["dimerRatio"]
    matrix = np.diag(onsite) - np.diag(hoppings, 1) - np.diag(hoppings, -1)
    return matrix, onsite, hoppings


def evaluate(energy, p, matrix, full=False, eta=None):
    n = len(matrix)
    eta = p["eta"] if eta is None else eta
    g = lead_surface_green(energy, p["leadHopping"], p["leadOnsite"])
    sig_l, sig_r = p["contactLeft"]**2*g, p["contactRight"]**2*g
    gam_l, gam_r = max(0.0, -2*sig_l.imag), max(0.0, -2*sig_r.imag)
    inverse = (energy+1j*eta)*np.eye(n)-matrix
    inverse[0, 0] -= sig_l
    inverse[-1, -1] -= sig_r
    if full:
        green = np.linalg.inv(inverse)
        col_l = green[:, 0]
    else:
        source = np.zeros(n, dtype=complex)
        source[0] = 1
        col_l = np.linalg.solve(inverse, source)
    transmission = float(gam_l*gam_r*abs(col_l[-1])**2)
    # This is flux-normalized left injection; its norm has units 1/eV.
    state_l = math.sqrt(gam_l)*col_l
    lead_open = abs(energy-p["leadOnsite"]) < 2*p["leadHopping"]
    reflection = float(abs(1-1j*gam_l*col_l[0])**2) if lead_open else None
    absorption = float(2*eta*np.vdot(state_l, state_l).real)
    output = {"energy": float(energy), "transmission": transmission,
              "conductanceQuantum": p["spinDegeneracy"]*transmission,
              "conductanceSiemens": p["spinDegeneracy"]*G_QUANTUM*transmission,
              "reflection": reflection, "regulatorAbsorption": absorption,
              "leadOpen": bool(lead_open),
              "gammaLeft": float(gam_l), "gammaRight": float(gam_r),
              "selfEnergyLeft": {"re": float(sig_l.real), "im": float(sig_l.imag)},
              "selfEnergyRight": {"re": float(sig_r.real), "im": float(sig_r.imag)}}
    if full:
        state_r = math.sqrt(gam_r)*green[:, -1]
        ldos = -np.diag(green).imag/math.pi
        injection_l = np.abs(state_l)**2/(2*math.pi)
        injection_r = np.abs(state_r)**2/(2*math.pi)
        # Positive bond flux means motion from site i to i+1.
        flux = -2*np.imag(np.diag(matrix, 1)*state_l[1:]*state_l[:-1].conj())
        # Loss in the positive-eta resolvent: J_in-J_out=2 eta |psi_i|^2.
        losses = 2*eta*np.abs(state_l)**2
        incoming = np.r_[1-reflection if lead_open else 0.0, flux]
        outgoing = np.r_[flux, transmission]
        continuity = incoming-outgoing-losses
        spectral_rhs = injection_l+injection_r+eta/math.pi*np.sum(abs(green)**2, axis=1)
        output.update({"ldos": ldos.tolist(), "leftInjectivity": injection_l.tolist(),
                       "rightInjectivity": injection_r.tolist(),
                       "bondTransmission": flux.tolist(),
                       "siteRegulatorLoss": losses.tolist(),
                       "continuityResidual": float(np.max(np.abs(continuity))),
                       "greenIdentityResidual": float(np.max(np.abs(ldos-spectral_rhs))),
                       "greenSolveResidual": float(np.linalg.norm(inverse@green-np.eye(n), ord=np.inf)),
                       "reciprocityResidual": float(np.max(np.abs(green-green.T))),
                       "minimumLDOS": float(np.min(ldos))})
    return output


def run(payload):
    p = parameters(payload)
    matrix, onsite, hoppings = hamiltonian(p)
    selection = evaluate(p["energy"], p, matrix, full=True)
    energies = np.linspace(p["energyMin"], p["energyMax"], p["samples"])
    rows = [evaluate(float(e), p, matrix) for e in energies]
    finer = evaluate(p["energy"], p, matrix, eta=p["eta"]/2)
    residual = (abs(selection["transmission"]+selection["reflection"]+
                    selection["regulatorAbsorption"]-1) if selection["leadOpen"] else None)
    max_unitarity = max([abs(r["transmission"]+r["reflection"]+r["regulatorAbsorption"]-1)
                         for r in rows if r["leadOpen"]] or [0.0])
    max_t = max([selection["transmission"]]+[r["transmission"] for r in rows])
    eta_delta = abs(selection["transmission"]-finer["transmission"])
    band = [p["leadOnsite"]-2*p["leadHopping"], p["leadOnsite"]+2*p["leadHopping"]]
    warnings = [
        "非相互作用、相干、弹性、一维单轨道链，左右电极为相同的半无限均匀链；不是任意三维材料器件或完整 Kwant 移植。",
        "G=gs(e²/h)T(EF) 是零温、零偏压极限的两端电导；能量滑块作为所选费米能，不包含有限偏压势分布、温度积分或接触自洽。",
        "每个自旋的电极至多一个传播通道。gs=2 只复制完全独立的自旋通道，不表示已经加入 SOC、Zeeman 或自旋散射。",
        "局域态密度与注入密度按每个自旋、每 eV 给出；bondTransmission 是左入射归一通量，不是以安培计的有限偏压电流。",
        "eta 是散射区 Green 函数的数值正虚部，带来已报告的人工吸收；它不是物理弛豫率。需减小 eta 并检查透射稳定性。",
        "SSH 的胞内键从站点 0–1 开始；端态与接触共振取决于终止方式、有限长度和电极耦合。单个零能峰不能独自证明拓扑。",
        "能量扫描只给有限采样点，窄共振可能被漏采；当前 eta 比较仅针对选定能量，不能证明整条曲线已收敛。",
    ]
    if not selection["leadOpen"]:
        warnings.append("所选能量位于电极带外或恰在带边，没有传播通道；T 与电导取零，局域谱仍可含束缚态或带边谱权重。")
    if min(p["contactLeft"], p["contactRight"]) == 0:
        warnings.append("至少一侧接触为零，两端透射严格为零；孤立或单侧连接的局域态仍可能在 LDOS 中出现。")
    if eta_delta > 1e-4 or selection["regulatorAbsorption"] > 1e-3:
        warnings.append("所选能量对数值展宽较敏感；请减小 eta 并重新检查，尤其注意弱接触或窄共振。")
    if max_t > 1+1e-6 or max_unitarity > 1e-6 or selection["greenSolveResidual"] > 1e-5:
        warnings.append("数值守恒或矩阵求解残差偏大，当前结果应先做数值收敛核验。")
    return {"schema": "symmetry-lab-device-transport-1", "parameters": p,
            "model": "single-orbital two-terminal chain", "units": {
                "energy": "eV", "conductanceQuantum": "e²/h", "conductanceSiemens": "S",
                "ldos": "states/(eV·site·spin)", "injectivity": "states/(eV·site·spin)",
                "bondTransmission": "左入射的无量纲正向通量", "position": "站点间距为1"},
            "selection": selection,
            "scan": {"energies": energies.tolist(),
                     "transmission": [r["transmission"] for r in rows],
                     "conductanceQuantum": [r["conductanceQuantum"] for r in rows],
                     "regulatorAbsorption": [r["regulatorAbsorption"] for r in rows]},
            "device": {"sites": [{"index": i, "position": [i, 0], "onsite": float(v)} for i, v in enumerate(onsite)],
                       "bonds": [{"from": i, "to": i+1, "hopping": float(t)} for i, t in enumerate(hoppings)],
                       "leadBand": band, "closedEnergies": np.linalg.eigvalsh(matrix).tolist()},
            "checks": {"unitarityResidual": residual, "scanMaxUnitarityResidual": max_unitarity,
                       "currentContinuityResidual": selection["continuityResidual"],
                       "greenIdentityResidual": selection["greenIdentityResidual"],
                       "greenSolveResidual": selection["greenSolveResidual"],
                       "reciprocityResidual": selection["reciprocityResidual"],
                       "transmissionUpperBound": 1, "maxTransmission": max_t,
                       "etaComparison": {"eta": p["eta"], "finerEta": p["eta"]/2,
                                         "transmission": selection["transmission"], "finerTransmission": finer["transmission"],
                                         "absoluteDifference": eta_delta, "needsRefinement": bool(eta_delta > 1e-4)},
                       "scanSpacing": float(energies[1]-energies[0])},
            "warnings": warnings, "sources": SOURCES,
            "derivation": [
                {"title": "电极的迟致表面自能", "formula": "gʳ=1/(E+i0−ε₀−t₀²gʳ)，Im gʳ≤0；ΣL/R=vL/R²gʳ，ΓL/R=−2 Im ΣL/R", "text": "选取在上半平面解析且大能量趋向1/E的物理解；电极带内有有限逃逸宽度。"},
                {"title": "开放器件的传播", "formula": "Gʳ=[(E+iη)I−HD−ΣL−ΣR]⁻¹；T=ΓLΓR|GʳN1|²", "text": "两端各连接一个站点，每自旋一个传播通道；反射由r=1−iΓLGʳ11得到。"},
                {"title": "零温电导", "formula": "G=gs(e²/h)T(EF)", "text": "gs只表示独立自旋副本数。打开通道不等于每个通道都完全透射。"},
                {"title": "局域谱与守恒", "formula": "ρi=−ImGʳii/π；νL,i=ΓL|Gʳi1|²/(2π)；Jᵢ→ᵢ₊₁=−2Im(Hᵢ,ᵢ₊₁ψᵢ₊₁ψᵢ*)，ψ=√ΓLGʳ·e₁", "text": "正虚部引入损失2η|ψi|²；程序核验T+R+Aη=1及每个站点的通量连续性。"},
            ]}
