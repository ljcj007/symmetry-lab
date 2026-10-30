"""Construct C4v SALCs and operator selection rules from explicit site actions.

All numerical results are generated for four scalar orbitals on a cross, or
two equivalent copies.  The module does not infer a real material Hamiltonian.
"""
from itertools import combinations
import math
import numpy as np

RELEASE = "20261030-construction1"
SITES = np.array([[1, 0], [0, 1], [-1, 0], [0, -1]], dtype=int)
C4 = np.array([[0, -1], [1, 0]], dtype=int)
MIRROR = np.diag([1, -1])
IRREPS = ("A1", "A2", "B1", "B2", "E")
DIMENSIONS = {"A1": 1, "A2": 1, "B1": 1, "B2": 1, "E": 2}
DEFAULTS = dict(copies=1, targetIrrep="E", seedSite=0, polarizationAngle=0.0,
                operatorType="dipole", operatorScale=1.0, hop=-1.0,
                crossHop=0.3, copyOffset=0.5, anisotropy=0.4,
                retainC4=1, retainMirror=1)


def group_closure(generators):
    """Integer 2 by 2 matrices, identity first, deterministic breadth first."""
    group = [np.eye(2, dtype=int)]
    seen = {tuple(group[0].ravel())}
    for element in group:
        for generator in generators:
            candidate = generator @ element
            key = tuple(candidate.ravel())
            if key not in seen:
                seen.add(key)
                group.append(candidate)
    return group


def permutation(rotation, copies=1):
    matrix = np.zeros((4, 4))
    for j, site in enumerate(SITES):
        image = rotation @ site
        matches = np.where(np.all(SITES == image, axis=1))[0]
        if len(matches) != 1:
            raise ValueError("操作没有把当前轨道映回自身")
        matrix[int(matches[0]), j] = 1.0
    return np.kron(np.eye(copies), matrix)


def character(irrep, rotation):
    if irrep == "A1":
        return 1
    if irrep == "A2":
        return int(round(np.linalg.det(rotation)))
    if irrep == "B1":
        return int(rotation[0, 0] ** 2 - rotation[0, 1] ** 2)
    if irrep == "B2":
        return int(rotation[0, 0] * rotation[1, 1] + rotation[0, 1] * rotation[1, 0])
    if irrep == "E":
        return int(np.trace(rotation))
    raise ValueError("未知不可约表示")


def projector(irrep, group, copies=1):
    return sum(character(irrep, g) * permutation(g, copies) for g in group) * DIMENSIONS[irrep] / len(group)


def matrix_projector(m, n, group, copies=1):
    # All E matrices are real in the declared Cartesian partner convention.
    return sum(g[m, n] * permutation(g, copies) for g in group) * 2 / len(group)


def normalized(vector):
    norm = float(np.linalg.norm(vector))
    if norm < 1e-12:
        raise ValueError("种子投影为零，不能归一化")
    return vector / norm


def construct_basis(copies=1):
    group = group_closure([C4, MIRROR])
    sectors, labels, columns = {}, [], []
    for irrep in ("A1", "B1", "E"):
        sector = []
        for copy in range(copies):
            seed = np.eye(4 * copies)[:, 4 * copy]
            if irrep == "E":
                x = normalized(matrix_projector(0, 0, group, copies) @ seed)
                y = normalized(matrix_projector(1, 0, group, copies) @ x)
                sector.extend([x, y])
                labels.extend([f"E_x·副本{copy+1}", f"E_y·副本{copy+1}"])
            else:
                sector.append(normalized(projector(irrep, group, copies) @ seed))
                labels.append(f"{irrep}·副本{copy+1}")
        sectors[irrep] = np.column_stack(sector)
        columns.extend(sector)
    return np.column_stack(columns), sectors, labels


def reynolds(matrix, group, copies=1):
    return sum(permutation(g, copies) @ matrix @ permutation(g, copies).T for g in group) / len(group)


def operator_matrices(copies=1):
    x = np.kron(np.eye(copies), np.diag(SITES[:, 0]))
    y = np.kron(np.eye(copies), np.diag(SITES[:, 1]))
    r = permutation(C4, copies)
    return dict(X=x, Y=y, scalar=np.eye(4 * copies),
                quadrupole=x @ x - y @ y, axial=0.5j * (r - r.T))


def selection_multiplicity(initial, operator, final, group=None):
    group = group or group_closure([C4, MIRROR])
    return int(round(sum(character(final, g) * character(operator, g) * character(initial, g) for g in group) / len(group)))


def packed(matrix):
    array = np.asarray(matrix, dtype=complex)
    re, im = array.real.copy(), array.imag.copy()
    re[np.abs(re) < 1e-13] = 0
    im[np.abs(im) < 1e-13] = 0
    return {"re": re.tolist(), "im": im.tolist()}


def group_name(group):
    return {8: "C4v", 4: "C4", 2: "Cs", 1: "C1"}[len(group)]


def operation_name(rotation):
    names = {(1, 0, 0, 1): "E", (0, -1, 1, 0): "C₄z", (-1, 0, 0, -1): "C₂z",
             (0, 1, -1, 0): "C₄z⁻¹", (1, 0, 0, -1): "m_xz", (-1, 0, 0, 1): "m_yz",
             (0, 1, 1, 0): "m_(x=y)", (0, -1, -1, 0): "m_(x=−y)"}
    return names[tuple(int(v) for v in rotation.ravel())]


def parse(payload):
    if not isinstance(payload, dict):
        raise ValueError("输入须为参数对象")
    unknown = set(payload) - set(DEFAULTS)
    if unknown:
        raise ValueError("未知参数：" + ", ".join(sorted(unknown)))
    params = dict(DEFAULTS, **payload)
    for name, choices in {"targetIrrep": ("A1", "B1", "E"),
                          "operatorType": ("dipole", "scalar", "quadrupole", "axial")}.items():
        if not isinstance(params[name], str) or params[name] not in choices:
            raise ValueError(name + "的选项无效")
    ranges = dict(copies=(1, 2), seedSite=(0, 3), polarizationAngle=(-360, 360),
                  operatorScale=(-5, 5), hop=(-5, 5), crossHop=(-3, 3), copyOffset=(-5, 5),
                  anisotropy=(-3, 3), retainC4=(0, 1), retainMirror=(0, 1))
    integer_keys = {"copies", "seedSite", "retainC4", "retainMirror"}
    for name, (lower, upper) in ranges.items():
        value = params[name]
        if isinstance(value, (bool, str)) or not isinstance(value, (int, float)):
            raise ValueError(name + "须为有限数值")
        value = float(value)
        if not math.isfinite(value) or not lower <= value <= upper:
            raise ValueError(name + "超出范围")
        if name in integer_keys:
            if value != int(value):
                raise ValueError(name + "须为整数")
            params[name] = int(value)
        else:
            params[name] = value
    return params


def calculate(payload):
    p = parse(payload)
    copies, n = p["copies"], 4 * p["copies"]
    group = group_closure([C4, MIRROR])
    subgroup = group_closure(([C4] if p["retainC4"] else []) + ([MIRROR] if p["retainMirror"] else []))
    representations = [permutation(g, copies) for g in group]
    u, sectors, labels = construct_basis(copies)
    ops = operator_matrices(copies)
    adjacency = permutation(C4) + permutation(C4).T
    copy_h = np.zeros((copies, copies))
    if copies == 2:
        copy_h = np.array([[0, p["crossHop"]], [p["crossHop"], p["copyOffset"]]])
    h0 = p["hop"] * np.kron(np.eye(copies), adjacency) + np.kron(copy_h, np.eye(4))
    perturbation = reynolds(ops["quadrupole"], subgroup, copies)
    h = h0 + p["anisotropy"] * perturbation
    theta = math.radians(p["polarizationAngle"])
    op_type = p["operatorType"]
    op = (math.cos(theta) * ops["X"] + math.sin(theta) * ops["Y"]) if op_type == "dipole" else ops[op_type]
    op = p["operatorScale"] * op
    op_irrep = {"dipole": "E", "scalar": "A1", "quadrupole": "B1", "axial": "A2"}[op_type]
    h_salc, op_salc = u.T @ h @ u, u.T @ op @ u
    eigenvalues, eigenvectors = np.linalg.eigh(h)
    energy_operator = eigenvectors.conj().T @ op @ eigenvectors

    selection_rows, selection_data = [], []
    for initial in ("A1", "B1", "E"):
        for final in ("A1", "B1", "E"):
            multiplicity = selection_multiplicity(initial, op_irrep, final, group)
            block = sectors[final].conj().T @ op @ sectors[initial]
            strength = float(np.linalg.norm(block, "fro") ** 2)
            label = "允许，实际为零" if multiplicity and strength < 1e-12 else ("允许" if multiplicity else "母群禁戒")
            selection_rows.append([initial, op_irrep, final, multiplicity, label, round(strength, 10)])
            selection_data.append(dict(initial=initial, final=final, multiplicity=multiplicity,
                                       strength=strength, matrix=packed(block)))

    target = p["targetIrrep"]
    seed = np.eye(n)[:, p["seedSite"]]
    selected_projector = projector(target, group, copies)
    projected_seed = selected_projector @ seed
    selected_vector = normalized(projected_seed)
    points = lambda v: [dict(x=int(SITES[i % 4, 0]), y=int(SITES[i % 4, 1]),
                             z=(0.0 if copies == 1 else (-0.35 if i < 4 else 0.35)),
                             label=f"副本{i//4+1}·站点{i%4+1}", weight=float(np.real(v[i]))) for i in range(n)]
    replay = [dict(title="声明基轨道与种子", text="四个归一正交标量轨道按+x、+y、−x、−y排序；额外副本按相同顺序排列。列j表示第j个轨道变换后的系数。", vector=packed(seed), points=points(seed))]
    cumulative = np.zeros(n)
    for g, d in zip(group, representations):
        chi = character(target, g)
        cumulative = cumulative + DIMENSIONS[target] * chi * (d @ seed) / len(group)
        replay.append(dict(title=f"{operation_name(g)}：累加字符投影", text=f"χ_Γ(g)={chi}；此项权重为d_Γχ_Γ(g)/8={DIMENSIONS[target]*chi/8:g}。向量显示已累加的部分和；尚未归一化。", matrix=packed(d), vector=packed(cumulative), points=points(cumulative)))
    replay.extend([
        dict(title="完成投影并归一化", text="字符投影得到整个同型分量的投影算符；单个种子只给出其中一条向量，不保证生成所有伙伴或副本。", matrix=packed(selected_projector), vector=packed(selected_vector), points=points(selected_vector)),
        dict(title="用矩阵元投影产生E伙伴", text="先用P_xx作用于第一个+x轨道，再用P_yx作用于归一化的E_x。于是E_x、E_y按照同一套笛卡尔E矩阵变换；两个副本分别重复该构造。", matrix=packed(matrix_projector(1, 0, group, copies)), vector=packed(sectors["E"][:, 1]), points=points(sectors["E"][:, 1])),
        dict(title="把所有SALC合成正交基U", text="列依次为各副本A1、各副本B1、各副本的E_x与E_y。重复不可约表示可在副本空间混合；这不改变其同型子空间。", matrix=packed(u)),
        dict(title="检查共同分块", text="这里显示U†HU。保留母群时，不同不可约表示间为零，E伙伴块相同。降对称后允许出现母群块间耦合，不能继续把母群标签当成所有能量本征态标签。", matrix=packed(h_salc))])

    candidates = []
    a1, b1 = construct_basis(1)[1]["A1"], construct_basis(1)[1]["B1"]
    for size in range(3):
        for removed in combinations(["c4", "mirror"], size):
            retained = group_closure(([C4] if "c4" not in removed else []) + ([MIRROR] if "mirror" not in removed else []))
            v_allowed = reynolds(operator_matrices(1)["quadrupole"], retained)
            mixing = float(np.linalg.norm(a1.T @ v_allowed @ b1))
            achieved = mixing > 1e-10
            candidates.append(dict(removed=list(removed), achieved=achieved,
                                   reason=f"保留群{group_name(retained)}的阶为{len(retained)}；对B1型势做群平均后，|〈A1|V|B1〉|={mixing:.6g}。"))
    minimal_count = min(len(item["removed"]) for item in candidates if item["achieved"])

    projectors = {ir: projector(ir, group, copies) for ir in IRREPS}
    projector_residual = max(float(np.linalg.norm(q @ q - q)) for q in projectors.values())
    orthogonality = float(np.linalg.norm(u.T @ u - np.eye(n)))
    completeness = float(np.linalg.norm(sum(projectors.values()) - np.eye(n)))
    representation_residual = max(float(np.linalg.norm(permutation(g @ f, copies) - permutation(g, copies) @ permutation(f, copies))) for g in group for f in group)
    retained_commutator = max(float(np.linalg.norm(h @ permutation(g, copies) - permutation(g, copies) @ h)) for g in subgroup)
    parent_commutator = max(float(np.linalg.norm(h @ d - d @ h)) for d in representations)
    forbidden_strength = max([item["strength"] for item in selection_data if not item["multiplicity"]] or [0.0])
    partner_residual = max(float(np.linalg.norm(sectors["E"].T @ d @ sectors["E"] - np.kron(np.eye(copies), g))) for g, d in zip(group, representations))
    checks = dict(passed=max(projector_residual, orthogonality, completeness, representation_residual, retained_commutator, forbidden_strength, partner_residual) < 1e-9,
                  projectorResidual=projector_residual, orthogonalityResidual=orthogonality,
                  completenessResidual=completeness, representationResidual=representation_residual,
                  retainedCommutatorResidual=retained_commutator, motherGroupCommutator=parent_commutator,
                  forbiddenStrength=forbidden_strength, partnerResidual=partner_residual)
    angle_grid = np.linspace(0, 360, 73)
    polarized = []
    for partner in (0, 1):
        data = []
        for angle in angle_grid:
            a = math.radians(float(angle))
            probe = p["operatorScale"] * (math.cos(a) * ops["X"] + math.sin(a) * ops["Y"])
            value = abs(sectors["E"][:, partner].conj() @ probe @ sectors["A1"][:, 0]) ** 2
            data.append([float(angle), float(value)])
        polarized.append(dict(label=("A1→E_x" if partner == 0 else "A1→E_y") + "（副本1）", points=data))
    decomposition = "A1 ⊕ B1 ⊕ E" if copies == 1 else "2A1 ⊕ 2B1 ⊕ 2E"
    warnings = ["四/八轨道模型仅含正交标量轨道与指定近邻跃迁，能量和强度均为教学相对单位；没有从材料结构拟合参数。",
                "选择定则表使用母群C₄ᵥ的参考SALC与算符表示。降对称后，实际本征态会混合母群标签，应查看能量本征基算符矩阵。",
                "允许只表示群论不强制为零；偏振、算符幅值、副本正交和动力学仍可使实际矩阵元为零。偏振图始终显示极向量偶极探针，独立于上方算符类型选择。",
                "所选保留群给出保证保留的操作；零扰动或其他特殊参数可产生更高的偶然对称。子群图仅画这两个生成元产生的四个群，并非完整子群格。",
                "简并能级内部的数值本征向量可任意旋转；单个矩阵元随基改变，而完整简并子空间之间的总强度不变。"]
    return dict(schemaVersion=1, release=RELEASE, params=p,
        summary=[dict(label="母群轨道表示", value=decomposition), dict(label="基空间维数", value=n),
                 dict(label="保证保留的子群", value=group_name(subgroup)), dict(label="目标同型子空间维数", value=sectors[target].shape[1]),
                 dict(label="算符母群类型", value=op_irrep), dict(label="投影与协变检查", value="通过" if checks["passed"] else "未通过")],
        tables=[dict(title="逐个操作与字符", columns=["操作", "轨道字符", "A1", "A2", "B1", "B2", "E"], rows=[[operation_name(g), int(np.trace(d))] + [character(ir, g) for ir in IRREPS] for g, d in zip(group, representations)]),
                dict(title="不可约表示重数与投影秩", columns=["表示", "维数", "重数", "投影秩"], rows=[[ir, DIMENSIONS[ir], int(round(np.trace(projectors[ir]) / DIMENSIONS[ir])), int(round(np.trace(projectors[ir])))] for ir in IRREPS]),
                dict(title="有限群选择定则与实际跃迁块", columns=["初态", "算符", "末态", "包含重数", "判定", "块强度‖O_fi‖²"], rows=selection_rows),
                dict(title="能量本征值", columns=["序号", "能量（相对单位）"], rows=[[i + 1, float(e)] for i, e in enumerate(eigenvalues)]),
                dict(title="正交SALC系数（列顺序同构造回放）", columns=["站点"] + labels, rows=[[f"副本{i//4+1}·{i%4+1}"] + [float(x) for x in u[i]] for i in range(n)])],
        plots=[dict(id="salc-polarization", title="偏振改变E伙伴强度：总和不变", xLabel="线偏振角 θ（度）", yLabel="偶极矩阵元模方（相对单位）", series=polarized),
               dict(id="salc-vector", title="当前种子产生的归一SALC", xLabel="轨道编号", yLabel="带符号振幅", series=[dict(label=target, points=[[i+1, float(v)] for i, v in enumerate(selected_vector)])])],
        checks=checks, warnings=warnings,
        formulaLinks=[dict(id="salc-character-projection", label="字符投影", formula="P_α = (d_α/|G|) Σ_g χ_α(g)^* D(g)", meaning="投影到全部等价副本组成的同型子空间；单个种子不保证张成该空间。", plot="salc-vector", values=[dict(label="投影秩", value=int(round(np.trace(selected_projector))))]),
                      dict(id="salc-selection-rule", label="统一选择定则", formula="n = (1/|G|) Σ_g χ_f(g)^* χ_O(g) χ_i(g)", meaning="n=0时整个耦合块为零；n>0时仍须计算实际算符和偏振。与SU(2)的Wigner–Eckart思想相通，系数需采用各自群的约定。", plot="salc-polarization", values=[dict(label="当前算符表示", value=op_irrep)])],
        replay=replay,
        subgroupGraph=dict(nodes=[dict(id="C4v", label="C₄ᵥ", order=8, details="由C₄z与m_xz生成"), dict(id="C4", label="C₄", order=4, details="仅由C₄z生成"), dict(id="Cs", label="Cₛ(xz)", order=2, details="仅由m_xz生成"), dict(id="C1", label="C₁", order=1, details="仅恒等操作")], edges=[dict(from_="C4v", to="C4", label="指数2"), dict(from_="C4v", to="Cs", label="指数4"), dict(from_="C4", to="C1", label="指数4"), dict(from_="Cs", to="C1", label="指数2")], selected=group_name(subgroup)),
        grading=dict(tasks=[dict(id="salc-target-subspace", title=f"提交完整{target}同型子空间", kind="subspace", reference=packed(sectors[target]), operators=[packed(d) for d in representations], instructions=f"提交{n}行、{sectors[target].shape[1]}列的满列秩矩阵，列向量在原站点基中展开。允许整体复相位、归一化差异与任意可逆内部换基；须覆盖全部{copies}个副本，且在所有母群操作下保持子空间不变。")]),
        breaking=dict(goal="只从C₄z、m_xz这两个生成元中移除最少项，使母群A1与B1参考SALC之间的Hamiltonian混合不再被保留群强制为零。检验势为X²−Y²，幅值固定为1。", choices=[dict(id="c4", label="移除C₄z约束"), dict(id="mirror", label="移除m_xz约束")], candidates=candidates, minimalCount=minimal_count),
        salc=dict(siteCoordinates=SITES.tolist(), basisLabels=labels, basis=packed(u), projector=packed(selected_projector), hamiltonian=packed(h), blockedHamiltonian=packed(h_salc), operator=packed(op), blockedOperator=packed(op_salc), eigenvalues=eigenvalues.tolist(), eigenvectors=packed(eigenvectors), energyBasisOperator=packed(energy_operator), sectors={ir: packed(v) for ir, v in sectors.items()}, selection=selection_data, groupMatrices=[packed(d) for d in representations], groupOrder=len(group), retainedOrder=len(subgroup)))


# JSON reserves no keyword, but Python does: expose the standard edge key.
_calculate = calculate
def calculate(payload):
    result = _calculate(payload)
    for edge in result["subgroupGraph"]["edges"]:
        edge["from"] = edge.pop("from_")
    return result
