"""Bounded electric-dipole RA-SHG geometry with explicit frequency conventions.

chi_ijk means chi_ijk(2w;w,w). Only j/k intrinsic permutation is imposed;
in particular 4mm chi_xxz and chi_zxx remain independent. Fields and chi
are in arbitrary but common units. No Fresnel/interface propagation is solved.
"""
from functools import lru_cache
from itertools import permutations, product
import math

import numpy as np


SOURCES = [
    {"title": "ShgPy：RA-SHG 张量与角度响应", "url": "https://bfichera.github.io/shgpy/"},
    {"title": "Yambo：非线性响应的角度依赖", "url": "https://wiki.yambo-code.eu/wiki/index.php?title=Angular_dependence_of_non-linear_response"},
]
CHANNELS = ("PP", "PS", "SP", "SS")
MODEL_DEFAULTS = {
    "gaas": {"xyz": 1.0},
    "batio3": {"xxz": 1.0, "zxx": 0.7, "zzz": 1.5},
    "centrosymmetric": {},
}


def _number(value, name, low, high):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not low <= value <= high or not math.isfinite(value)):
        raise ValueError(f"{name} 必须是 {low} 至 {high} 内的有限实数")
    return float(value)


def _complex(value, name):
    if isinstance(value, dict):
        if set(value) != {"re", "im"}:
            raise ValueError(name + " 的复数格式必须恰好包含 re 与 im")
        return complex(_number(value["re"], name + ".re", -10000, 10000),
                       _number(value["im"], name + ".im", -10000, 10000))
    return complex(_number(value, name, -10000, 10000))


def _json_complex(value):
    return {"re": float(value.real), "im": float(value.imag)}


def _rz(degrees):
    t = math.radians(degrees)
    c, s = math.cos(t), math.sin(t)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.]])


def _ry(degrees):
    t = math.radians(degrees)
    c, s = math.cos(t), math.sin(t)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def transform_tensor(tensor, rotation):
    """Active Cartesian tensor rotation (also valid for improper point operations)."""
    return np.einsum("ia,jb,kc,abc->ijk", rotation, rotation, rotation, tensor)


def _basis_tensor(components):
    tensor = np.zeros((3, 3, 3))
    for component in components:
        tensor[tuple("xyz".index(letter) for letter in component)] = 1.
    return tensor


@lru_cache(maxsize=3)
def _model(model):
    if model == "batio3":
        operations = []
        mirror = np.diag([1., -1., 1.])
        for n in range(4):
            rotation = np.rint(_rz(90 * n))
            operations.extend([rotation, rotation @ mirror])
        definitions = [("xxz", ["xxz", "xzx", "yyz", "yzy"]),
                       ("zxx", ["zxx", "zyy"]), ("zzz", ["zzz"])]
        title, group, symbol = "BaTiO₃ 四方铁电相的 4mm 张量教学模型", "C4v", "4mm"
    else:
        operations = []
        for perm in permutations(range(3)):
            for signs in product((-1., 1.), repeat=3):
                # Td preserves the four tetrahedral vertices with xyz = +1.
                if model == "gaas" and math.prod(signs) != 1:
                    continue
                operations.append(np.eye(3)[list(perm)] * np.array(signs)[:, None])
        definitions = [("xyz", ["xyz", "xzy", "yxz", "yzx", "zxy", "zyx"])] if model == "gaas" else []
        title, group, symbol = (("GaAs 闪锌矿的 Td 张量教学模型", "Td", "−43m")
                                if model == "gaas" else ("Oh 中心对称体电偶极对照", "Oh", "m−3m"))
    bases = [(name, components, _basis_tensor(components)) for name, components in definitions]
    # Character of V tensor Sym^2(V); group averaging counts invariants.
    invariant_dimension = int(round(sum(float(np.trace(op)) *
        (float(np.trace(op)) ** 2 + float(np.trace(op @ op))) / 2
        for op in operations) / len(operations)))
    residual = max((float(np.max(np.abs(transform_tensor(b, op) - b)))
                    for _, _, b in bases for op in operations), default=0.)
    if invariant_dimension != len(bases) or residual > 1e-12:
        raise RuntimeError("内置张量基与完整点群投影不一致")
    return {"operations": operations, "bases": bases, "title": title,
            "group": group, "symbol": symbol, "invariantDimension": invariant_dimension,
            "basisResidual": residual}


def _orientation(payload):
    cut = payload.get("cut", "001")
    if not isinstance(cut, str) or cut not in ("001", "111"):
        raise ValueError("cut 必须是 001 或 111")
    ratio = _number(payload.get("cOverA", 1.), "cOverA", 0.1, 10.)
    euler = payload.get("orientation")
    if euler is not None:
        if not isinstance(euler, list) or len(euler) != 3:
            raise ValueError("orientation 必须是三个角度 [α, β, γ]")
        euler = [_number(x, "orientation", -36000, 36000) for x in euler]
        rotation = _rz(euler[0]) @ _ry(euler[1]) @ _rz(euler[2])
        return rotation, cut, ratio, euler
    if cut == "001":
        return np.eye(3), cut, ratio, None
    normal = np.array([1., 1., 1. / ratio])
    normal /= np.linalg.norm(normal)
    x_axis = np.array([1., -1., 0.]) / math.sqrt(2.)
    y_axis = np.cross(normal, x_axis)
    return np.array([x_axis, y_axis, normal]), cut, ratio, None


def _geometry(incidence):
    t = math.radians(incidence)
    c, s = math.cos(t), math.sin(t)
    return {"incidentWavevector": np.array([s, 0., -c]),
            "outgoingWavevector": np.array([s, 0., c]),
            "incidentP": np.array([c, 0., s]),
            "outgoingP": np.array([c, 0., -s]), "S": np.array([0., 1., 0.])}


def _amplitudes(tensor, rotation, geometry):
    # Rotate polarization vectors back to the crystal frame; this is algebraically
    # equivalent to rotating all three tensor indices but cheaper for a scan.
    fields = {"P": rotation.T @ geometry["incidentP"], "S": rotation.T @ geometry["S"]}
    analyzers = {"P": rotation.T @ geometry["outgoingP"], "S": rotation.T @ geometry["S"]}
    polarizations = {key: np.einsum("ijk,j,k->i", tensor, field, field)
                     for key, field in fields.items()}
    amplitudes = {channel: complex(analyzers[channel[1]] @ polarizations[channel[0]])
                  for channel in CHANNELS}
    return amplitudes, {key: rotation @ vector for key, vector in polarizations.items()}


def run(payload=None):
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("SHG 输入必须是 JSON 对象")
    allowed = {"model", "cut", "cOverA", "orientation", "incidence", "azimuth", "samples", "channel", "coefficients"}
    if set(payload) - allowed:
        raise ValueError("未知 SHG 输入字段：" + ", ".join(str(x) for x in set(payload) - allowed))
    model = payload.get("model", "gaas")
    if not isinstance(model, str) or model not in MODEL_DEFAULTS:
        raise ValueError("model 必须是 gaas、batio3 或 centrosymmetric")
    incidence = _number(payload.get("incidence", 45), "incidence", 0., 85.)
    azimuth = _number(payload.get("azimuth", 30), "azimuth", -36000, 36000)
    samples = payload.get("samples", 181)
    if isinstance(samples, bool) or not isinstance(samples, int) or not 37 <= samples <= 721:
        raise ValueError("samples 必须是 37 至 721 的整数")
    channel = payload.get("channel", "PP")
    if not isinstance(channel, str) or channel not in CHANNELS:
        raise ValueError("channel 必须是 PP、PS、SP 或 SS，第一字母为入射偏振")
    description = _model(model)
    coefficients = payload.get("coefficients", MODEL_DEFAULTS[model])
    if not isinstance(coefficients, dict) or set(coefficients) - set(MODEL_DEFAULTS[model]):
        raise ValueError("coefficients 仅接受当前模型的独立 χ 分量：" + (", ".join(MODEL_DEFAULTS[model]) or "无；Oh 要求空对象"))
    coefficients = {name: _complex(coefficients.get(name, default), "χ_" + name)
                    for name, default in MODEL_DEFAULTS[model].items()}
    tensor = np.zeros((3, 3, 3), dtype=complex)
    for name, _, basis in description["bases"]:
        tensor += coefficients[name] * basis
    initial_rotation, cut, ratio, euler = _orientation(payload)
    if model != "batio3" and ratio != 1:
        raise ValueError("GaAs 与 Oh 预设使用立方轴，cOverA 必须为 1；一般取向请使用 orientation")
    geometry = _geometry(incidence)
    angles = np.linspace(0., 360., samples)
    raw = {key: [] for key in CHANNELS}
    for angle in angles:
        amplitudes, _ = _amplitudes(tensor, _rz(float(angle)) @ initial_rotation, geometry)
        for key in CHANNELS:
            raw[key].append(amplitudes[key])
    scan_channels = {key: {"amplitudes": [_json_complex(x) for x in values],
                           "intensities": [float(abs(x) ** 2) for x in values]}
                     for key, values in raw.items()}
    current_rotation = _rz(azimuth) @ initial_rotation
    selected, polarizations = _amplitudes(tensor, current_rotation, geometry)
    tensor_norm = float(np.max(np.abs(tensor)))
    covariance_residual = max(float(np.max(np.abs(transform_tensor(tensor, op) - tensor)))
                              for op in description["operations"])
    permutation_residual = float(np.max(np.abs(tensor - tensor.swapaxes(1, 2))))
    inversion_present = any(np.array_equal(op, -np.eye(3)) for op in description["operations"])
    nonzero = [{"component": "".join("xyz"[i] for i in index), **_json_complex(tensor[index])}
               for index in np.ndindex(3, 3, 3) if abs(tensor[index]) > 0.]
    warnings = [
        "预设系数为原创教学值，不是 GaAs 或 BaTiO₃ 的实测/第一性原理光学参数。",
        "只计算给定 χ^(2)(2ω;ω,ω) 的体电偶极几何投影；未求解 Fresnel 因子、折射、吸收、相位匹配、多层传播、表面电偶极或电四极贡献。",
        "强度为共同任意单位 |A|²，不逐曲线归一化，也不是绝对光功率；输入场幅取 1。",
        "只使用末两指标 j↔k 的固有置换对称性，不施加 Kleinman 全指标置换；4mm 的 χ_xxz 与 χ_zxx 独立。",
        "单个通道或几何下没有 SHG 不能唯一证明反演对称；中心对称体的表面与高阶多极贡献也可能产生 SHG。",
    ]
    if euler is not None:
        warnings.append("orientation 已覆盖 cut 与 cOverA 的几何作用；Euler 角针对正交笛卡尔晶体坐标轴。")
    elif model == "batio3" and cut == "111":
        warnings.append("四方 (111) 法向按 (1,1,1/(c/a)) 确定；默认 c/a=1 仅为参考几何，请按材料输入轴比。")
    result = {
        "kind": "shg-lab", "model": model, "title": description["title"], "synthetic": True,
        "scope": "三个完整点群预设的频率退化二阶极化张量及理想反射方向的相对 RA-SHG；不含光学边界条件。",
        "parameters": {"model": model, "cut": cut, "cOverA": ratio, "orientation": euler,
                       "incidence": incidence, "azimuth": azimuth, "samples": samples,
                       "channel": channel, "coefficients": {key: _json_complex(value) for key, value in coefficients.items()}},
        "units": {"angle": "degree", "susceptibility": "common arbitrary unit", "amplitude": "arbitrary unit", "intensity": "amplitude squared"},
        "tensor": {"pointGroup": description["group"], "symbol": description["symbol"],
                   "dimension": len(description["bases"]), "frequencyConvention": "χ_ijk(2ω;ω,ω)",
                   "coefficientConvention": "输入是完整 χ 分量，不是 d=χ/2；直接对 j,k 求和，交叉项自动出现系数 2。",
                   "intrinsicPermutation": "χ_ijk = χ_ikj；不要求 χ_ijk = χ_jik",
                   "basis": [{"id": name, "label": " = ".join("χ_" + x for x in components),
                              "components": components, "value": _json_complex(coefficients[name])}
                             for name, components, _ in description["bases"]],
                   "nonzero": nonzero,
                   "crystal": [[[_json_complex(tensor[i, j, k]) for k in range(3)] for j in range(3)] for i in range(3)]},
        "scan": {"angles": angles.tolist(), "channels": scan_channels,
                 "maxIntensity": max(max(item["intensities"]) for item in scan_channels.values()),
                 "normalization": "none; common field and susceptibility units across all four channels"},
        "selection": {"channel": channel, "angle": azimuth, "amplitude": _json_complex(selected[channel]),
                      "intensity": float(abs(selected[channel]) ** 2),
                      "allChannels": {key: {"amplitude": _json_complex(value), "intensity": float(abs(value) ** 2)} for key, value in selected.items()},
                      "nonlinearPolarization": [_json_complex(x) for x in polarizations[channel[0]]]},
        "geometry": {**{key: value.tolist() for key, value in geometry.items()},
                     "crystalToLab": current_rotation.tolist(), "initialCrystalToLab": initial_rotation.tolist(),
                     "surfaceNormalCrystal": (initial_rotation.T @ np.array([0., 0., 1.])).tolist(),
                     "crystalAxesLab": current_rotation.T.tolist(),
                     "channelConvention": "第一字母入射，第二字母分析器；PS=P入射/S出射",
                     "rotationConvention": "Q(φ)=Rz(φ)Q0，v_lab=Qv_crystal；Euler Q0=Rz(α)Ry(β)Rz(γ)",
                     "cutConvention": "(001) Q0=I；(111) 法向∝(1,1,1/(c/a))，零方位lab x沿[1,−1,0]，a=b，晶轴正交",
                     "beamConvention": "表面外法向+z，入射k=(sinθ,0,−cosθ)，出射k=(sinθ,0,+cosθ)；固定实验室散射面xz"},
        "symmetry": {"order": len(description["operations"]), "covarianceResidual": covariance_residual,
                     "relativeCovarianceResidual": covariance_residual / max(tensor_norm, 1.),
                     "permutationResidual": permutation_residual, "basisCovarianceResidual": description["basisResidual"],
                     "dimensionFromGroupProjector": description["invariantDimension"],
                     "inversionPresent": inversion_present,
                     "inversionResidual": 2. * tensor_norm,
                     "inversionZeroCheckPassed": not inversion_present or tensor_norm == 0.,
                     "periodicityResidual": max(float(abs(values[0] - values[-1])) for values in raw.values()),
                     "inversionExplanation": "极性三阶张量在反演下变号；若反演属于体点群，则 χ=−χ，因而体电偶极 χ=0。"},
        "steps": [
            {"title": "保留正确的频率与指标对称性", "detail": "写 χ_ijk(2ω;ω,ω)，相同输入频率只保证 j↔k；先将 27 分量减为 18 个候选分量。"},
            {"title": "施加完整点群的协变约束", "detail": "对每个 R 求 χ_ijk=R_ia R_jb R_kc χ_abc；本模型剩余 " + str(len(description["bases"])) + " 个独立分量，并由群投影的迹独立核对维数。"},
            {"title": "把样品转到实验坐标", "detail": "指定表面法向或 Euler 角，再主动绕实验室 z 轴转动 φ；可旋转张量，也可将入射与分析器矢量逆旋转到晶体坐标。"},
            {"title": "投影振幅后取模平方", "detail": "P_i=Σ_jk χ_ijk E_j E_k；A=e_out·P，I=|A|²。保留复系数的相干干涉，最后才取模平方。"},
        ],
        "warnings": warnings, "sources": SOURCES,
    }
    return result
