"""Single-electron d crystal fields and a separate linear E x e JT model.

No Coulomb/Hund multiplets, electron filling, self-consistent ligand field,
radial wavefunction or nuclear kinetic energy is inferred from these models.
All calculations use finite NumPy matrices; plots use explicit angular data.
"""
from __future__ import annotations

import math
import numpy as np

ORBITAL_IDS = ["xy", "yz", "xz", "x2-y2", "z2"]
ORBITAL_LABELS = ["d_xy", "d_yz", "d_xz", "d_(x²−y²)", "d_(3z²−r²)"]
SOURCES = [
    {"id": "quanty-nio", "title": "Quanty: NiO crystal-field ground-state tutorial",
     "url": "https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate"},
    {"id": "crispy-cf", "title": "ESRF Crispy: crystal-field axes and Dq, Ds, Dt conventions",
     "url": "https://crispy.esrf.fr/en/stable/user_guide/crystal_field.html"},
    {"id": "quanty-d4h", "title": "Quanty: D4h character table and axis conventions",
     "url": "https://www.quanty.org/physics_chemistry/point_groups/d4h"},
    {"id": "jt-linear", "title": "Requist et al.: the linear E⊗e Jahn–Teller model",
     "url": "https://arxiv.org/abs/1710.04041"},
]


def _number(p, key, default, low, high):
    x = p.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not low <= x <= high or not math.isfinite(x):
        raise ValueError(f"{key} 必须是 {low} 至 {high} 的有限实数")
    return float(x)


def _integer(p, key, default, low, high):
    x = _number(p, key, default, low, high)
    if x != int(x):
        raise ValueError(f"{key} 必须是整数")
    return int(x)


def angular_momentum():
    """L/hbar in real Cartesian harmonics [xy,yz,xz,x2-y2,z2].

Columns of U give the real orbitals in Condon-Shortley |l=2,m>,
with m ordered -2,-1,0,1,2. This fixes phases used in both SOC and shapes.
"""
    root = math.sqrt(2.)
    u = np.array([[1j/root, 0, 0, 1/root, 0],
                  [0, 1j/root, 1/root, 0, 0],
                  [0, 0, 0, 0, 1],
                  [0, 1j/root, -1/root, 0, 0],
                  [-1j/root, 0, 0, 1/root, 0]], dtype=complex)
    m = np.arange(-2, 3)
    plus = np.zeros((5, 5), dtype=complex)
    for i, value in enumerate(m[:-1]):
        plus[i + 1, i] = math.sqrt(6 - value * (value + 1))
    complex_l = [(plus + plus.T.conj()) / 2, (plus - plus.T.conj()) / (2j), np.diag(m)]
    return [u.conj().T @ operator @ u for operator in complex_l]


def angular_values(x, y, z):
    """Normalized real l=2 spherical harmonics on the unit sphere, last axis=5."""
    a = math.sqrt(15 / (4 * math.pi))
    return np.stack([a*x*y, a*y*z, a*x*z,
                     a*(x*x-y*y)/2, math.sqrt(5/(16*math.pi))*(3*z*z-1)], axis=-1)


def orbital_energies(coordination, splitting, ds, dt):
    """Positive splitting means E(e)-E(t2)=+splitting (Oh), -splitting (Td)."""
    if coordination == "octahedral":
        base = np.array([-.4, -.4, -.4, .6, .6]) * splitting
    elif coordination == "tetrahedral":
        base = np.array([.4, .4, .4, -.6, -.6]) * splitting
    else:
        raise ValueError("coordination 必须是 octahedral 或 tetrahedral")
    return base + ds*np.array([2., -1., -1., 2., -2.]) + dt*np.array([-1., 4., 4., -1., -6.])


def crystal_hamiltonian(coordination, splitting, ds, dt, soc):
    l = angular_momentum()
    s = [np.array([[0., 1.], [1., 0.]])/2,
         np.array([[0., -1j], [1j, 0.]])/2, np.diag([.5, -.5])]
    l_dot_s = sum(np.kron(a, b) for a, b in zip(l, s))
    crystal = np.kron(np.diag(orbital_energies(coordination, splitting, ds, dt)), np.eye(2))
    return crystal + soc*l_dot_s, l_dot_s


def _reduced_density(vectors):
    """Unpolarized average over the supplied energy subspace, trace=1."""
    # Flattening is orbital-major with up/down adjacent.
    projector = vectors @ vectors.conj().T / vectors.shape[1]
    return np.trace(projector.reshape(5, 2, 5, 2), axis1=1, axis2=3)


def _angular_map(density, count):
    theta = np.linspace(0., math.pi, count)
    phi = np.linspace(0., 2*math.pi, 2*count)
    th, ph = np.meshgrid(theta, phi, indexing="ij")
    x, y, z = np.sin(th)*np.cos(ph), np.sin(th)*np.sin(ph), np.cos(th)
    functions = angular_values(x, y, z)
    probability = np.einsum("...i,ij,...j->...", functions, density, functions).real
    # The projector guarantees positivity; clipping only removes round-off.
    probability = np.maximum(0., probability)
    return {"theta": theta.tolist(), "phi": phi.tolist(), "density": probability.tolist(),
            "basis_values": np.moveaxis(functions, -1, 0).tolist(),
            "orientation": "density[theta_index][phi_index]; basis_values[orbital][theta_index][phi_index]",
            "units": "angular probability per steradian; ∫density dΩ=1",
            "radius_convention": "绘图可取 r=√density；这是角分布的可视化半径，不是电子真实径向距离。",
            "phase_convention": "实基函数符号可着色；自旋迹和简并子空间平均后的密度没有单一波函数相位。"}


def _angular_integral(density):
    # Gauss-Legendre x uniform phi integrates all l=2 products exactly.
    cos_theta, weights = np.polynomial.legendre.leggauss(8)
    phi = 2*math.pi*np.arange(16)/16
    z, ph = np.meshgrid(cos_theta, phi, indexing="ij")
    x, y = np.sqrt(1-z*z)*np.cos(ph), np.sqrt(1-z*z)*np.sin(ph)
    values = angular_values(x, y, z)
    f = np.einsum("...i,ij,...j->...", values, density, values).real
    return float(np.sum(weights[:, None]*f)*(2*math.pi/16))


def _crystal(p):
    h, l_dot_s = crystal_hamiltonian(p["coordination"], p["splitting"], p["ds"], p["dt"], p["soc"])
    energies, vectors = np.linalg.eigh(h)
    scale = max(1., float(np.max(np.abs(energies))))
    group_tolerance = 1e-9 * scale
    groups, group_indices = [], []
    for index, energy in enumerate(energies):
        if group_indices and abs(float(energy)-float(energies[group_indices[-1][0]])) <= group_tolerance:
            group_indices[-1].append(index)
        else:
            group_indices.append([index])
    selected_group = next(i for i, indices in enumerate(group_indices) if p["selected_level"] in indices)
    densities = []
    for indices in group_indices:
        vs = vectors[:, indices]
        density = _reduced_density(vs)
        densities.append(density)
        weights = np.diag(density).real
        groups.append({"energy": float(np.mean(energies[indices])), "degeneracy": len(indices), "indices": indices,
                       "orbital_weights": weights.tolist(), "eg_weight": float(np.sum(weights[3:])),
                       "t2g_weight": float(np.sum(weights[:3])),
                       "l_dot_s": float(np.trace(vs.conj().T @ l_dot_s @ vs).real/len(indices))})
    levels = []
    for i, energy in enumerate(energies):
        v = vectors[:, i]
        weights = np.sum(np.abs(v.reshape(5, 2))**2, axis=1)
        levels.append({"index": i, "energy": float(energy), "orbital_weights": weights.tolist(),
                       "eg_weight": float(np.sum(weights[3:])), "t2g_weight": float(np.sum(weights[:3])),
                       "l_dot_s": float((v.conj() @ l_dot_s @ v).real),
                       "group": next(j for j, ids in enumerate(group_indices) if i in ids)})
    density = densities[selected_group]
    t_unitary = np.kron(np.eye(5), np.array([[0., 1.], [-1., 0.]]))
    l = angular_momentum()
    hermitian = float(np.max(np.abs(h-h.conj().T)))
    eigen_residual = float(np.max(np.abs(h @ vectors-vectors*energies)))
    tr_residual = float(np.max(np.abs(t_unitary @ h.conj() @ t_unitary.conj().T-h)))
    algebra = max(float(np.max(np.abs(l[i]@l[j]-l[j]@l[i]-1j*l[k])))
                  for i, j, k in [(0, 1, 2), (1, 2, 0), (2, 0, 1)])
    kramers = float(np.max(np.abs(energies[::2]-energies[1::2])))
    integral_error = abs(_angular_integral(density)-1)
    scan = np.linspace(0., p["soc"], p["scan_points"])
    scan_energies = [np.linalg.eigvalsh(crystal_hamiltonian(p["coordination"], p["splitting"], p["ds"], p["dt"], float(a))[0]).tolist() for a in scan]
    octahedral = p["coordination"] == "octahedral"
    ligands = np.concatenate([np.eye(3), -np.eye(3)]).tolist() if octahedral else (np.array([[1,1,1], [1,-1,-1], [-1,1,-1], [-1,-1,1]])/math.sqrt(3)).tolist()
    orbital_data = [{"id": name, "label": label, "parent_label": ("t₂g" if octahedral else "t₂") if i<3 else ("e_g" if octahedral else "e"),
                     "angular_formula": ["√(15/4π) xy", "√(15/4π) yz", "√(15/4π) xz", "√(15/16π)(x²−y²)", "√(5/16π)(3z²−1)"][i],
                     "normalization": "x²+y²+z²=1；∫Y²dΩ=1", "crystal_field_energy": float(orbital_energies(p["coordination"],p["splitting"],p["ds"],p["dt"])[i])}
                    for i, (name, label) in enumerate(zip(ORBITAL_IDS, ORBITAL_LABELS))]
    warnings = ["这是单电子 10×10 d 壳层模型；没有电子填充、Coulomb/Hund 相互作用、多重态、共价杂化或电荷转移，不能据此推断 NiO 等多电子材料的高低自旋、磁基态或真实激发谱。",
                "Ds/Dt 是独立现象学能级参数；配体坐标固定为理想几何，不由 Ds/Dt 反推真实键长，也不能把其正负直接等同于拉伸/压缩。",
                "分裂参数 Δ≥0 是当前几何中两组轨道的正能量间距；八面体 e_g 高、四面体 e 低。没有自动施加四面体与八面体分裂的经验比例。",
                "简并本征矢可任意换基；主要角密度取同能子空间的平均并对自旋求迹。单个 levels 的轨道权重只是一种数值基底选择。",
                "e/t₂ 投影权重不是电子占据数；有 SOC 或低对称晶场时，不应把父相轨道标签当作所有本征态的严格量子数。",
                "密度图只含归一实球谐的角部分，不含径向波函数、真实电子云尺寸或材料电荷密度。"]
    if p["soc"] == 0:
        warnings.append("当前 λ=0，SOC 扫描范围退化为同一点；调节 λ 可显示能级演化。")
    summary = {"title": ("八面体" if octahedral else "四面体")+" d 晶场、四方项与 SOC", "energy_unit": "eV",
               "coordination": "Oh 理想配体背景" if octahedral else "Td 理想配体背景",
               "parent_decomposition": "d → e_g ⊕ t₂g" if octahedral else "d → e ⊕ t₂",
               "basis_size": 10, "level_groups": len(groups), "lowest_energy": float(energies[0]),
               "selected_group": selected_group, "trace_energy": float(np.trace(h).real),
               "degeneracy_tolerance": group_tolerance, "kramers_expected": True,
               "free_ion_limit": "Δ=Ds=Dt=0 时 j=3/2 四态为 −3λ/2，j=5/2 六态为 λ。"}
    return {"tool": "crystal_field_lab", "mode": "crystal_field", "parameters": p, "summary": summary,
            "basis": {"orbitals": ORBITAL_IDS, "spins": ["up", "down"],
                      "ordered_states": [name+spin for name in ORBITAL_IDS for spin in ["↑", "↓"]],
                      "convention": "每个实 d 轨道的 ↑、↓ 相邻；L、S以ℏ为单位，H_SOC=λ L·S。"},
            "orbitals": orbital_data, "ligands": {"positions": ligands, "geometry": p["coordination"],
                                                       "ideal": True, "bond_length": 1., "unit": "arbitrary visualization length"},
            "levels": levels, "groups": groups,
            "selection": {"level": p["selected_level"], "group": selected_group, "energy": groups[selected_group]["energy"],
                          "degeneracy": groups[selected_group]["degeneracy"], "orbital_weights": groups[selected_group]["orbital_weights"],
                          "orbital_density_real": density.real.tolist(), "orbital_density_imag": density.imag.tolist()},
            "angular_map": _angular_map(density, p["angular_grid"]),
            "soc_scan": {"soc": scan.tolist(), "energies": scan_energies, "unit": "eV", "orientation": "energies[soc_index][sorted_level]",
                         "branch_tracking": "各点按能量排序，不声称跨交叉追踪同一本征态。"},
            "hamiltonian": {"real": h.real.tolist(), "imag": h.imag.tolist()},
            "checks": {"hermiticity_residual": hermitian, "eigenpair_residual": eigen_residual,
                       "time_reversal_residual": tr_residual, "kramers_pair_residual": kramers,
                       "angular_momentum_commutator_residual": algebra, "angular_integral_residual": integral_error,
                       "trace_density_residual": float(abs(np.trace(density)-1)),
                       "passed": bool(max(hermitian, eigen_residual, tr_residual, kramers, algebra, integral_error)<1e-8*scale)},
            "steps": [
                {"title": "固定实轨道与轴", "formula": "[xy,yz,xz,x²−y²,3z²−r²] ⊗ [↑,↓]", "text": "使用归一实球谐；轨道函数、角动量矩阵与三维图保持同一相位约定。"},
                {"title": "晶场只分裂单电子能级", "formula": "Oh: E(t₂g)=−2Δ/5，E(e_g)=3Δ/5；Td: E(t₂)=2Δ/5，E(e)=−3Δ/5", "text": "两种约定都保留五个轨道的能量重心，Δ为所选几何的正间距。"},
                {"title": "加入四方项与自旋–轨道耦合", "formula": "H=diag(E_d)⊗I₂+λΣαLα⊗Sα", "text": "Ds/Dt分别按指定对角系数加入，SOC允许轨道与自旋混合；时间反演仍保留Kramers成对简并。"},
                {"title": "用子空间平均解释角密度", "formula": "ρ_orb=Tr_spin[P_group/d_group]；n(Ω)=Y(Ω)ᵀρ_orbY(Ω)", "text": "同能子空间平均消除简并本征矢任意换基的影响，角密度积分为1。"}],
            "warnings": warnings, "sources": SOURCES}


def jahn_teller_matrix(q2, q3, coupling, stiffness):
    electronic = coupling*np.array([[q3, q2], [q2, -q3]], dtype=float)
    elastic = stiffness*(q2*q2+q3*q3)/2
    return electronic+elastic*np.eye(2)


def _jahn_teller(p):
    g, spring, extent = p["coupling"], p["stiffness"], p["q_extent"]
    coordinates = np.linspace(-extent, extent, p["grid"])
    q2, q3 = np.meshgrid(coordinates, coordinates)
    rho = np.hypot(q2, q3)
    elastic = spring*rho*rho/2
    lower, upper = elastic-abs(g)*rho, elastic+abs(g)*rho
    radius = abs(g)/spring
    minimum_energy = -g*g/(2*spring)
    radial_rho = np.linspace(0., max(math.sqrt(2)*extent, 1.25*radius), p["scan_points"])
    radial_elastic = spring*radial_rho*radial_rho/2
    selected = jahn_teller_matrix(p["q2"], p["q3"], g, spring)
    selected_energy, selected_vectors = np.linalg.eigh(selected)
    selected_rho = math.hypot(p["q2"], p["q3"])
    electronic = g*np.array([[p["q3"],p["q2"]],[p["q2"],-p["q3"]]])
    splitting = 2*abs(g)*selected_rho
    state_defined = splitting > 1e-12*max(1., float(np.max(np.abs(selected_energy))))
    weights = (np.abs(selected_vectors[:,0])**2).tolist() if state_defined else [.5,.5]
    analytic_selected = np.array([spring*selected_rho**2/2-abs(g)*selected_rho, spring*selected_rho**2/2+abs(g)*selected_rho])
    residual = float(np.max(np.abs(selected_energy-analytic_selected)))
    warnings = ["独立的线性 E⊗e 绝热模型：一个电子二重态耦合两个无量纲约化坐标，不是上方完整 d⊗spin Hamiltonian 的自动截断，也未加入 SOC。",
                "Q₂/Q₃ 不是已标定的原子位移或质量加权正常坐标；g与K为教学输入，不反推材料耦合常数或键长。",
                "只对电子2×2矩阵对角化后加弹性能；不包含核动能、振动零点能、动态JT隧穿、温度或多电子占据。",
                "圆形极小谷来自线性模型的偶然连续简并，不意味着真实晶体有连续空间旋转对称性；高阶耦合和环境各向异性可选择离散畸变方向。"]
    if radius > extent:
        warnings.append("解析极小圆未完整落在当前二维显示窗口内；仍报告全局极小值，径向曲线会包含该极小半径。")
    if not state_defined:
        warnings.append("选定点的电子态简并或劈裂低于数值分辨率；下态轨道权重显示子空间平均1/2，不是唯一电子本征态。")
    return {"tool": "crystal_field_lab", "mode": "jahn_teller", "parameters": p,
            "summary": {"title": "线性 E⊗e Jahn–Teller 绝热势能面", "energy_unit": "eV",
                        "coordinate_unit": "dimensionless reduced Q", "stabilization_energy": -minimum_energy,
                        "minimum_radius": radius, "electronic_basis": ["z2", "x2-y2"],
                        "conical_intersection": g != 0, "ground_surface": "lower"},
            "surfaces": {"q2": coordinates.tolist(), "q3": coordinates.tolist(), "lower": lower.tolist(), "upper": upper.tolist(),
                         "orientation": "matrix[q3_index][q2_index]", "unit": "eV"},
            "radial": {"rho": radial_rho.tolist(), "lower": (radial_elastic-abs(g)*radial_rho).tolist(),
                       "upper": (radial_elastic+abs(g)*radial_rho).tolist(), "elastic": radial_elastic.tolist()},
            "minimum": {"radius": radius, "energy": minimum_energy, "kind": "circle" if g != 0 else "point",
                        "whole_circle_in_plot": radius<=extent, "any_minimum_in_plot": radius<=math.sqrt(2)*extent,
                        "radial_curvature": spring, "tangential_curvature": 0. if g != 0 else spring,
                        "upper_minimum": {"q2": 0., "q3": 0., "energy": 0.}},
            "selection": {"q2": p["q2"], "q3": p["q3"], "rho": selected_rho, "energies": selected_energy.tolist(),
                          "electronic_matrix": electronic.tolist(), "total_matrix": selected.tolist(),
                          "elastic_energy": spring*selected_rho**2/2, "electronic_splitting": splitting,
                          "lower_orbital_weights": weights, "state_defined": state_defined,
                          "orbital_labels": ["z2", "x2-y2"]},
            "checks": {"hermiticity_residual": float(np.max(np.abs(selected-selected.T))),
                       "analytic_eigenvalue_residual": residual, "minimum_radial_force_residual": abs(spring*radius-abs(g)),
                       "bounded_below": True, "passed": residual<1e-10},
            "steps": [
                {"title": "写电子二重态的线性耦合", "formula": "H_el=g(Q₂τx+Q₃τz)", "text": "基组取[z²,x²−y²]，两个约化坐标与电子双态矩阵按明示约定耦合。"},
                {"title": "对角化并加入弹性能", "formula": "V±(ρ)=Kρ²/2±|g|ρ；ρ=√(Q₂²+Q₃²)", "text": "K>0使两张势能面有下界；g≠0时原点是两电子势能面的锥形交叉。"},
                {"title": "求解析极小半径", "formula": "∂ρV−=Kρ−|g|=0 ⇒ ρ₀=|g|/K", "text": "g≠0时方位角在此线性模型中不被选择，极小集合是一圈；g=0时退化为原点。"},
                {"title": "计算稳定化能并检查范围", "formula": "V−(ρ₀)=−g²/(2K)；E_JT=g²/(2K)", "text": "比较解析极小与显示窗口，不能将被裁剪图上的最低采样点误当全局极小。"}],
            "warnings": warnings, "sources": SOURCES}


def run(payload):
    if not isinstance(payload, dict):
        raise ValueError("晶场实验输入必须是 JSON 对象")
    common = {"action", "mode", "scan_points"}
    cf = {"coordination", "splitting", "ds", "dt", "soc", "selected_level", "angular_grid"}
    jt = {"coupling", "stiffness", "q2", "q3", "q_extent", "grid"}
    unknown = set(payload)-common-cf-jt
    if unknown:
        raise ValueError("不支持的参数："+", ".join(sorted(str(k) for k in unknown)))
    mode = payload.get("mode", "crystal_field")
    if not isinstance(mode, str) or mode not in ("crystal_field", "jahn_teller"):
        raise ValueError("mode 必须是 crystal_field 或 jahn_teller")
    # Validate all supplied fields, even fields retained by a UI after a mode switch.
    coordination = payload.get("coordination", "octahedral")
    if not isinstance(coordination, str) or coordination not in ("octahedral", "tetrahedral"):
        raise ValueError("coordination 必须是 octahedral 或 tetrahedral")
    field = {"coordination": coordination,
             "splitting": _number(payload,"splitting",1.,0.,5.), "ds": _number(payload,"ds",0.,-2.,2.),
             "dt": _number(payload,"dt",0.,-2.,2.), "soc": _number(payload,"soc",.1,-2.,2.),
             "selected_level": _integer(payload,"selected_level",0,0,9), "angular_grid": _integer(payload,"angular_grid",21,9,41)}
    vibronic = {"coupling": _number(payload,"coupling",1.,-5.,5.), "stiffness": _number(payload,"stiffness",2.,.05,20.),
                "q2": _number(payload,"q2",.2,-5.,5.), "q3": _number(payload,"q3",.3,-5.,5.),
                "q_extent": _number(payload,"q_extent",1.5,.1,5.), "grid": _integer(payload,"grid",41,11,81)}
    p = {"mode": mode, "scan_points": _integer(payload,"scan_points",61,9,121)}
    p.update(field if mode == "crystal_field" else vibronic)
    result = _crystal(p) if mode == "crystal_field" else _jahn_teller(p)
    inactive = sorted(set(payload) & (jt if mode == "crystal_field" else cf))
    result["inactive_parameters"] = {key: payload[key] for key in inactive}
    if inactive:
        result["warnings"].append("当前模式未使用另一模型的参数："+", ".join(inactive)+"；这些字段已验证，但不进入本次 Hamiltonian。parameters 仅回显实际作用参数。")
    return result
