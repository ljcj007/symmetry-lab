"""Selected, spinless real-space induced Bloch representations.

Periodic gauge |a,k> = sum_T exp(+2pi i k.T)|T+r_a>.  The input
orbit is generated from a site, not from the k star.  s and the complete
polar-vector p triplet are supported; neither is asserted to be an EBR.
"""
from __future__ import annotations

import functools
import json
import math

import numpy as np
import symmetry_core as core

RELEASE = "20261029-pathways1"
# Selected operation records copied without reinterpreting their BC names.
# The independent test compares every R,t,name to the formal SG catalogue.
_RAW_GROUPS = json.loads('{"2":{"symbol":"P-1","operations":[{"name":"E","rotation":[[1,0,0],[0,1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"I","rotation":[[-1,0,0],[0,-1,0],[0,0,-1]],"translation":[0.0,0.0,0.0]}]},"4":{"symbol":"P21","operations":[{"name":"E","rotation":[[1,0,0],[0,1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2z","rotation":[[-1,0,0],[0,-1,0],[0,0,1]],"translation":[0.0,0.0,0.5]}]},"19":{"symbol":"P212121","operations":[{"name":"E","rotation":[[1,0,0],[0,1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2x","rotation":[[-1,0,0],[0,1,0],[0,0,-1]],"translation":[0.0,0.5,0.5]},{"name":"C2y","rotation":[[1,0,0],[0,-1,0],[0,0,-1]],"translation":[0.5,0.5,0.0]},{"name":"C2z","rotation":[[-1,0,0],[0,-1,0],[0,0,1]],"translation":[0.5,0.0,0.5]}]},"221":{"symbol":"Pm-3m","operations":[{"name":"E","rotation":[[1,0,0],[0,1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2z","rotation":[[-1,0,0],[0,-1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2x","rotation":[[1,0,0],[0,-1,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C2a","rotation":[[0,1,0],[1,0,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C31+","rotation":[[0,0,1],[1,0,0],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"I","rotation":[[-1,0,0],[0,-1,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C2y","rotation":[[-1,0,0],[0,1,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C2b","rotation":[[0,-1,0],[-1,0,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C33+","rotation":[[0,0,-1],[-1,0,0],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"mz","rotation":[[1,0,0],[0,1,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C4z-","rotation":[[0,1,0],[-1,0,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C34+","rotation":[[0,0,1],[-1,0,0],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"mx","rotation":[[-1,0,0],[0,1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C4z+","rotation":[[0,-1,0],[1,0,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C4x-","rotation":[[1,0,0],[0,0,1],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"mda","rotation":[[0,-1,0],[-1,0,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C32+","rotation":[[0,0,-1],[1,0,0],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"C4y-","rotation":[[0,0,-1],[0,1,0],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"C31-","rotation":[[0,1,0],[0,0,1],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S61-","rotation":[[0,0,-1],[-1,0,0],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"my","rotation":[[1,0,0],[0,-1,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2f","rotation":[[-1,0,0],[0,0,-1],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"mdb","rotation":[[0,1,0],[1,0,0],[0,0,1]],"translation":[0.0,0.0,0.0]},{"name":"C2c","rotation":[[0,0,1],[0,-1,0],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"C34-","rotation":[[0,-1,0],[0,0,-1],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S63-","rotation":[[0,0,1],[1,0,0],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"C4x+","rotation":[[1,0,0],[0,0,-1],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"S4z+","rotation":[[0,-1,0],[1,0,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C2e","rotation":[[0,0,-1],[0,-1,0],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"C32-","rotation":[[0,1,0],[0,0,-1],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S64-","rotation":[[0,0,-1],[1,0,0],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"C2d","rotation":[[-1,0,0],[0,0,1],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"S4z-","rotation":[[0,1,0],[-1,0,0],[0,0,-1]],"translation":[0.0,0.0,0.0]},{"name":"C4y+","rotation":[[0,0,1],[0,1,0],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S4x+","rotation":[[-1,0,0],[0,0,-1],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"C33-","rotation":[[0,-1,0],[0,0,1],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S62-","rotation":[[0,0,1],[-1,0,0],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"S4y+","rotation":[[0,0,1],[0,-1,0],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S61+","rotation":[[0,-1,0],[0,0,-1],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"mdf","rotation":[[1,0,0],[0,0,1],[0,1,0]],"translation":[0.0,0.0,0.0]},{"name":"mdc","rotation":[[0,0,-1],[0,1,0],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S64+","rotation":[[0,1,0],[0,0,1],[-1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S4x-","rotation":[[-1,0,0],[0,0,1],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"mde","rotation":[[0,0,1],[0,1,0],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S62+","rotation":[[0,-1,0],[0,0,1],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"mdd","rotation":[[1,0,0],[0,0,-1],[0,-1,0]],"translation":[0.0,0.0,0.0]},{"name":"S4y-","rotation":[[0,0,-1],[0,-1,0],[1,0,0]],"translation":[0.0,0.0,0.0]},{"name":"S63+","rotation":[[0,1,0],[0,0,-1],[1,0,0]],"translation":[0.0,0.0,0.0]}]}}')

SITES = {
    2: {"origin": ([0, 0, 0], "反演中心 (0,0,0)"),
        "body": ([.5, .5, .5], "反演中心 (1/2,1/2,1/2)"),
        "general": ([.17, .23, .31], "一般位置二点轨道")},
    4: {"general": ([.13, .21, .17], "一般位置二点轨道；BC 的螺旋轴为 z")},
    19: {"general": ([.13, .21, .17], "一般位置四点轨道")},
    221: {"origin": ([0, 0, 0], "1a 原点"),
          "body": ([.5, .5, .5], "1b 体心位点"),
          "faces": ([0, .5, .5], "3c 面心位点轨道")},
}
KPOINTS = {"G": [0, 0, 0], "X": [.5, 0, 0], "Y": [0, .5, 0],
           "Z": [0, 0, .5], "M": [.5, .5, 0], "R": [.5, .5, .5]}


def _clean_vector(value):
    x = np.asarray(value, dtype=float) % 1
    x[np.isclose(x, 1, atol=1e-10) | np.isclose(x, 0, atol=1e-10)] = 0
    return x


@functools.lru_cache(maxsize=4)
def _group(number):
    return core._build_table(_RAW_GROUPS[str(number)]["operations"])


def _orbit(operations, seed):
    positions = []
    for op in operations:
        point = _clean_vector(op["rotation"] @ seed + op["translation"])
        if not any(np.max(abs(point - old)) < 1e-9 for old in positions):
            positions.append(point)
    return np.asarray(positions)


def _site_mapping(operations, positions):
    mapping, shifts = [], []
    for op in operations:
        targets, cell_shifts = [], []
        for point in positions:
            image = op["rotation"] @ point + op["translation"]
            matches = [(j, np.rint(image - q).astype(int)) for j, q in enumerate(positions)
                       if core._equivalent(image, q)]
            core.require(len(matches) == 1, "位点轨道的晶格匹配不唯一")
            targets.append(matches[0][0]); cell_shifts.append(matches[0][1])
        core.require(len(set(targets)) == len(positions), "位点映射不是置换")
        mapping.append(targets); shifts.append(cell_shifts)
    return np.asarray(mapping, dtype=int), np.asarray(shifts, dtype=int)


def _bloch_matrix(op, mapping, shifts, k, orbitals):
    """Map the periodic-gauge k fibre to R^{-T}k, including cell shifts."""
    q = core.reciprocal_action(op, k)
    local = np.eye(1) if orbitals == "s" else np.asarray(op["rotation"], dtype=float)
    d, m = len(local), len(mapping)
    matrix = np.zeros((m*d, m*d), dtype=complex)
    for source, target in enumerate(mapping):
        phase = np.exp(-2j * math.pi * np.dot(q, shifts[source]))
        matrix[target*d:(target+1)*d, source*d:(source+1)*d] = phase * local
    return matrix


@functools.lru_cache(maxsize=28)
def _analysis(number, k):
    return core._analyze({"operations": _RAW_GROUPS[str(number)]["operations"],
                          "k": list(k), "doubleValued": False})


def _phase_label(value):
    z = complex(value)
    if abs(z.imag) < 1e-9:
        return f"{z.real:.6g}"
    return f"{z.real:.6g}{z.imag:+.6g}i"


def calculate(payload=None):
    payload = {} if payload is None else payload
    core.require(isinstance(payload, dict), "输入必须是参数对象")
    raw = payload.get("group", 4)
    core.require(not isinstance(raw, bool) and str(raw) in _RAW_GROUPS,
                 "当前只支持普通空间群 2、4、19、221")
    number = int(raw)
    orbitals = payload.get("orbitals", "s")
    core.require(orbitals in ("s", "p"), "轨道必须为 s 或完整 p 三重态")
    site = payload.get("site", "auto")
    if site == "auto": site = "general" if number in (4, 19) else "origin"
    core.require(site in SITES[number], "所选位点不适用于这个群；请选择自动位点或该群预设")
    kz = payload.get("kz", .25)
    core.require(isinstance(kz, (int, float)) and not isinstance(kz, bool)
                 and math.isfinite(kz) and 0 <= kz <= .5, "kz 须在 0 到 1/2 之间")
    point = payload.get("kPoint", "G")
    core.require(point in (*KPOINTS, "line"), "未知的 k 点")
    k = np.array([0, 0, kz] if point == "line" else KPOINTS[point], dtype=float)
    group = _group(number); ops = group["operations"]
    seed = np.array(SITES[number][site][0], dtype=float)
    positions = _orbit(ops, seed)
    mapping, shifts = _site_mapping(ops, positions)
    local_dim = 1 if orbitals == "s" else 3
    dimension = len(positions) * local_dim
    stabilizer = []
    for i, op in enumerate(ops):
        diff = op["rotation"] @ seed + op["translation"] - seed
        if np.max(abs(diff - np.rint(diff))) < 1e-9:
            stabilizer.append({"operationIndex": i, "name": op["name"],
                               "rotation": op["rotation"], "cellShift": np.rint(diff).astype(int),
                               "fixingTranslation": op["translation"] - np.rint(diff)})
    orbit_stabilizer = len(positions) * len(stabilizer) == len(ops)
    core.require(orbit_stabilizer, "位点轨道–稳定子计数失败")
    analysis = _analysis(number, tuple(float(x) for x in k))
    source = analysis["littleGroup"]["sourceIndices"]
    matrices = np.array([_bloch_matrix(ops[i], mapping[i], shifts[i], k, orbitals) for i in source])
    chars = np.trace(matrices, axis1=1, axis2=2)
    validation = core._validate_representation(matrices,
        analysis["littleGroup"]["multiplicationTable"], analysis["littleGroup"]["factors"])
    decomposition = core._decompose(chars, analysis["irreps"])
    core.require(decomposition["dimension"] == dimension, "分解后维数不守恒")
    # Stronger than a single-k check: include operations mapping k to another
    # fibre. The representative-product defect is a genuine lattice translation.
    full_covariance = 0.0
    first = [_bloch_matrix(op, mapping[i], shifts[i], k, orbitals) for i, op in enumerate(ops)]
    for h, op_h in enumerate(ops):
        hk = core.reciprocal_action(op_h, k)
        for g, op_g in enumerate(ops):
            target = group["table"][g, h]
            ghk = core.reciprocal_action(op_g, hk)
            factor = np.exp(-2j * math.pi * np.dot(ghk, group["translationDefects"][g, h]))
            product = _bloch_matrix(op_g, mapping[g], shifts[g], hk, orbitals) @ first[h]
            full_covariance = max(full_covariance, core._error(product, factor * first[target]))
    core.require(full_covariance < 1e-8, "一般 k 的跨纤维空间群乘法律失败")
    checks = {"siteOrbitStabilizer": orbit_stabilizer,
              "orbitSize": len(positions), "stabilizerOrder": len(stabilizer),
              "groupOrder": len(ops), "dimensionConserved": decomposition["dimension"] == dimension,
              "productResidual": validation["productError"], "unitarityResidual": validation["unitarityError"],
              "fullCovarianceResidual": full_covariance,
              "characterReconstructionResidual": decomposition["reconstructionError"],
              "irrepOrthogonalityResidual": analysis["validation"]["characterOrthogonalityError"],
              "passed": True}
    operation_rows = [[i+1, ops[j]["name"], _phase_label(chars[i]),
                       "; ".join(f"{a+1}→{mapping[j,a]+1}, L={shifts[j,a].tolist()}" for a in range(len(positions)))]
                      for i, j in enumerate(source)]
    terms = decomposition["terms"]
    tables = [
        {"title": "生成的位点轨道（原胞分数坐标）", "columns": ["位点", "x", "y", "z"],
         "rows": [[i+1, *[float(v) for v in p]] for i, p in enumerate(positions)]},
        {"title": "稳定子：减去整格平移后固定种子", "columns": ["操作", "减去的晶格向量", "实际固定平移"],
         "rows": [[s["name"], str(s["cellShift"].tolist()), str(s["fixingTranslation"].tolist())] for s in stabilizer]},
        {"title": "选定 k 的小群作用与特征标", "columns": ["序号", "操作", "χ", "位点置换 / 晶格余量"], "rows": operation_rows},
        {"title": "小群不可约分解（本次计算的局部编号）", "columns": ["表示", "维数", "重数", "贡献维数"],
         "rows": [[t["label"], t["dimension"], t["multiplicity"], t["dimension"]*t["multiplicity"]] for t in terms]},
    ]
    plots = [{"title": "选定 k 的小群特征标", "xLabel": "小群操作序号", "yLabel": "特征标",
              "series": [{"label": "Re χ", "points": [[i+1, float(z.real)] for i, z in enumerate(chars)]},
                         {"label": "Im χ", "points": [[i+1, float(z.imag)] for i, z in enumerate(chars)]}]}]
    screw_data = None
    if number in (4, 19):
        idx = next(i for i, op in enumerate(ops) if np.array_equal(op["rotation"], np.diag([-1, -1, 1])))
        grid = np.linspace(0, 1, 41)
        branches = [np.exp(-1j*math.pi*grid), -np.exp(-1j*math.pi*grid)]
        spectra = []
        screw_residual = 0.
        for z in grid:
            mat = _bloch_matrix(ops[idx], mapping[idx], shifts[idx], [0, 0, z], orbitals)
            eigen = np.linalg.eigvals(mat)
            screw_residual = max(screw_residual, core._error(mat@mat, np.exp(-2j*math.pi*z)*np.eye(dimension)))
            spectra.append(eigen)
        checks["screwSquareResidual"] = screw_residual
        core.require(screw_residual < 1e-8, "螺旋平方平移相位检验失败")
        plots.append({"title": "2₁ 螺旋本征值 λ±=±exp(−iπkz)，相位分支在 kz+1 交换",
                      "xLabel": "kz（倒格分数坐标）", "yLabel": "无量纲本征值分量",
                      "series": [{"label": f"{sign} / {part}", "points": [[float(x), float(fun(y))] for x,y in zip(grid,branch)]}
                                 for sign,branch in zip(("λ+","λ−"), branches)
                                 for part,fun in (("Re",np.real),("Im",np.imag))]})
        selected = _bloch_matrix(ops[idx], mapping[idx], shifts[idx], k, orbitals)
        # The eigenvalues at arbitrary selected k are only little-group labels
        # if this operation preserves k modulo a reciprocal lattice vector.
        selected_is_little = idx in source
        screw_data = {"operationIndex": idx, "name": ops[idx]["name"], "grid": grid,
                      "eigenvalues": spectra, "selectedPreservesK": selected_is_little,
                      "selectedEigenvalues": np.linalg.eigvals(selected) if selected_is_little else None}
    warnings = [
        "精选普通空间群的无自旋 s / 完整极性 p 轨道教学模型；未施加时间反演，未计算SOC、磁群、能量或实际材料占据。",
        "本模块从实空间位点稳定子和完整位点轨道构造表示；这不同于从动量小群诱导整个 k 星。",
        "D1、D2…仅为本次计算的小群编号，不能跨 k 点比较，也不是 BC / Bilbao 标准标签。",
        "位点轨道及 s/p 的诱导表示不自动是不可约或 elementary；本模块不判定通用 EBR、Wannier 障碍或拓扑类别。",
        "p_x,p_y,p_z 是固定全局笛卡尔轴下的极性向量；完整三重态在部分位点稳定子中可约。",
        "沿用本站 BC 操作设置；群4的 2₁ 轴为 z，不能直接照搬常见 unique-b 标准胞的 k 点名称。",
        "这里只指定所研究的空间群作用，不做结构对称性识别；单独绘出的位点轨道可能具有额外的偶然对称性。",
    ]
    parameters = {"group": number, "site": site, "orbitals": orbitals, "kPoint": point, "kz": float(kz)}
    result = {"release": RELEASE, "parameters": parameters,
              "spaceGroup": {"number": number, "symbol": _RAW_GROUPS[str(number)]["symbol"],
                             "setting": "SpaceGroupIrep-derived BC primitive setting", "operations": ops},
              "summary": [{"label": "空间群", "value": f"{number} · {_RAW_GROUPS[str(number)]['symbol']}"},
                          {"label": "位点轨道数", "value": len(positions)},
                          {"label": "稳定子阶", "value": len(stabilizer)},
                          {"label": "Bloch 纤维维数", "value": dimension},
                          {"label": "小群阶", "value": len(source)}],
              "plots": plots, "tables": tables, "warnings": warnings, "checks": checks,
              "site": {"key": site, "label": SITES[number][site][1], "seed": seed,
                       "positions": positions, "stabilizer": stabilizer, "mapping": mapping, "cellShifts": shifts},
              "k": k, "orbitDimension": dimension, "localOrbitalDimension": local_dim,
              "representation": {"operationIndices": source, "operationNames": [ops[i]["name"] for i in source],
                                 "matrices": matrices, "characters": chars,
                                 "factors": analysis["littleGroup"]["factors"],
                                 "multiplicationTable": analysis["littleGroup"]["multiplicationTable"],
                                 "translationDefects": analysis["littleGroup"]["translationDefects"]},
              "irreps": [{"label": r["label"], "dimension": r["dimension"], "characters": r["characters"]}
                         for r in analysis["irreps"]],
              "decomposition": decomposition, "screw": screw_data,
              "convention": {"gauge": "periodic", "bloch": "|a,k> = sum_T exp(+2πi k·T)|T+r_a>",
                             "matrix": "U_g(k)[b,a] = exp(−2πi (R_g⁻ᵀk)·L_ga) ρ(R_g)",
                             "cellShift": "R_g r_a+t_g=r_b+L_ga", "coordinates": "primitive fractional; BC setting"}}
    return core._json(result)
