"""Exact equilibrium crystal tensors and explicitly parameterized demonstrations.

All generators act in an orthonormal Cartesian basis.  Intrinsic symmetries
are imposed before the exact invariant-subspace calculation.  No material
constants, frequencies, transport Onsager relations or magnetic groups are
inferred.  Ordinary material presets include pure time reversal (gray groups).
"""
import ast
from functools import lru_cache
import itertools
import math

import sympy as sp


_I = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
_INV = ((-1, 0, 0), (0, -1, 0), (0, 0, -1))
_C4 = ((0, -1, 0), (1, 0, 0), (0, 0, 1))
_C3CUBIC = ((0, 0, 1), (1, 0, 0), (0, 1, 0))
_C2X = ((1, 0, 0), (0, -1, 0), (0, 0, -1))
_MXY = ((0, 1, 0), (1, 0, 0), (0, 0, 1))
_MY = ((1, 0, 0), (0, -1, 0), (0, 0, 1))
_C3Z = (("-1/2", "-sqrt(3)/2", 0), ("sqrt(3)/2", "-1/2", 0), (0, 0, 1))
_VOIGT = ((0, 0), (1, 1), (2, 2), (1, 2), (0, 2), (0, 1))
_PAIR = {tuple(sorted(pair)): n for n, pair in enumerate(_VOIGT)}
_SOURCES = [
    {"title": "Bilbao MTENSOR: Cartesian setting, tensor parity and intrinsic symmetry",
     "url": "https://www.cryst.ehu.es/cryst/mtensor_help.html"},
    {"title": "IUCr teaching pamphlet: tensors and crystal properties",
     "url": "https://www.iucr.org/__data/assets/pdf_file/0003/14790/18.pdf"},
]
_PRESETS = {
    "cubic_m3m": {"label": "立方 m−3m（非磁性）", "point_group": "m−3m", "magnetic_group": "m−3m1′",
                   "generators": [(_C4, False), (_C3CUBIC, False), (_INV, False), (_I, True)]},
    "zincblende_td": {"label": "闪锌矿 −43m / T_d（非磁性）", "point_group": "−43m", "magnetic_group": "−43m1′",
                      "generators": [(_C3CUBIC, False), (_C2X, False), (_MXY, False), (_I, True)]},
    "tetragonal_4mm": {"label": "四方 4mm（非磁性）", "point_group": "4mm", "magnetic_group": "4mm1′",
                       "generators": [(_C4, False), (_MY, False), (_I, True)]},
    "magnetic_minus3mprime": {"label": "磁性 −3′m′（Cr₂O₃ 单畴模型）", "point_group": "−3m", "magnetic_group": "−3′m′",
                              "generators": [(_C3Z, False), (_C2X, False), (_INV, True)]},
    "gray_triclinic": {"label": "中心对称三斜 −1 1′", "point_group": "−1", "magnetic_group": "−1 1′",
                        "generators": [(_INV, False), (_I, True)]},
}
_KINDS = {
    "dielectric": {"label": "静态介电极化率", "rank": 2, "symbol": "chi", "jahn": "[V²]", "axial": False, "time_odd": False,
                    "equation": "P_i = χ_ij E_j（演示吸收单位因子）", "intrinsic": "χ_ij = χ_ji"},
    "elasticity": {"label": "弹性刚度", "rank": 4, "symbol": "C", "jahn": "[[V²][V²]]", "axial": False, "time_odd": False,
                    "equation": "σ_ij = C_ijkl ε_kl", "intrinsic": "C_ijkl = C_jikl = C_ijlk = C_klij"},
    "piezoelectric": {"label": "压电应力张量", "rank": 3, "symbol": "e", "jahn": "V[V²]", "axial": False, "time_odd": False,
                       "equation": "P_i = e_ijk ε_jk", "intrinsic": "e_ijk = e_ikj"},
    "magnetoelectric": {"label": "线性平衡磁电张量", "rank": 2, "symbol": "alpha", "jahn": "aeV²", "axial": True, "time_odd": True,
                        "equation": "P_i = α_ij H_j", "intrinsic": "不预设 α_ij = α_ji"},
}


def _exact(value):
    """Small arithmetic grammar; never sympify or eval untrusted strings."""
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError("矩阵元素必须为整数、有理数或 sqrt(整数) 的精确表达式")
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("矩阵元素必须有限")
    text = str(value)
    if len(text) > 80:
        raise ValueError("单个精确表达式最多 80 字符")
    try:
        tree = ast.parse(text, mode="eval")
    except (SyntaxError, ValueError) as error:
        raise ValueError("精确表达式语法无效") from error
    if len(list(ast.walk(tree))) > 48:
        raise ValueError("精确表达式过于复杂")

    def visit(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            if not math.isfinite(node.value) or abs(node.value) > 10000:
                raise ValueError("表达式常数绝对值不可超过 10000")
            return sp.Rational(str(node.value))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            result = visit(node.operand)
            return result if isinstance(node.op, ast.UAdd) else -result
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if right == 0:
                raise ValueError("精确表达式不可除以零")
            return left / right
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "sqrt"
                and len(node.args) == 1 and not node.keywords and isinstance(node.args[0], ast.Constant)
                and type(node.args[0].value) is int and 1 <= node.args[0].value <= 12):
            return sp.sqrt(node.args[0].value)
        raise ValueError("仅支持数值、+ − * / 和 sqrt(1…12)，不允许变量或函数执行")

    result = sp.simplify(visit(tree.body))
    if result.is_real is not True or result.is_finite is not True or abs(float(result)) > 1.0000000001:
        raise ValueError("正交矩阵元素必须为 [−1,1] 内的有限实数")
    return result


def _generators(payload, preset):
    if preset == "custom":
        raw = payload.get("generators")
        if not isinstance(raw, list) or not 1 <= len(raw) <= 8:
            raise ValueError("自定义 generators 需要 1–8 个笛卡尔正交生成元")
    else:
        raw = [{"rotation": matrix, "time_reversal": time} for matrix, time in _PRESETS[preset]["generators"]]
    generators = []
    for operation in raw:
        if not isinstance(operation, dict):
            raise ValueError("每个生成元应为含 rotation 与 time_reversal 的对象")
        matrix = operation.get("rotation")
        time = operation.get("time_reversal", False)
        if not isinstance(time, bool):
            raise ValueError("time_reversal 必须为 true 或 false")
        if not isinstance(matrix, (list, tuple)) or len(matrix) != 3 or any(not isinstance(row, (list, tuple)) or len(row) != 3 for row in matrix):
            raise ValueError("rotation 必须为 3×3 笛卡尔正交矩阵")
        rotation = sp.Matrix([[_exact(value) for value in row] for row in matrix])
        check = rotation.T * rotation - sp.eye(3)
        if any(sp.simplify(value) != 0 for value in check):
            raise ValueError("rotation 必须严格正交；分数坐标中的非正交晶体矩阵请先转换到笛卡尔基底")
        determinant = sp.simplify(rotation.det())
        if determinant not in (-1, 1):
            raise ValueError("rotation 行列式必须为 ±1")
        key = (tuple(rotation), time)
        if key not in generators:
            generators.append(key)
    return tuple(generators)


def _coordinate(kind, indices):
    if kind == "dielectric":
        return tuple(sorted(indices))
    if kind == "magnetoelectric":
        return indices
    if kind == "piezoelectric":
        return (indices[0], _PAIR[tuple(sorted(indices[1:]))])
    return tuple(sorted((_PAIR[tuple(sorted(indices[:2]))], _PAIR[tuple(sorted(indices[2:]))])))


def _layout(kind):
    rank = _KINDS[kind]["rank"]
    indices = list(itertools.product(range(3), repeat=rank))
    representatives = {}
    for item in indices:
        representatives.setdefault(_coordinate(kind, item), item)
    keys = tuple(sorted(representatives))
    slots = {key: index for index, key in enumerate(keys)}
    return indices, keys, tuple(representatives[key] for key in keys), slots


@lru_cache(maxsize=48)
def _solve(kind, generators):
    """Solve constraints on intrinsic coordinates, not a redundant 3**rank array."""
    indices, keys, representatives, slots = _layout(kind)
    rank = _KINDS[kind]["rank"]
    rows = []
    for flat, primed in generators:
        rotation = sp.Matrix(3, 3, flat)
        parity = (-1 if primed and _KINDS[kind]["time_odd"] else 1)
        if _KINDS[kind]["axial"]:
            parity *= rotation.det()
        nonzero = [[(j, rotation[i, j]) for j in range(3) if rotation[i, j] != 0] for i in range(3)]
        for row_index, output in enumerate(representatives):
            coefficients = [sp.S.Zero] * len(keys)
            for factors in itertools.product(*(nonzero[i] for i in output)):
                incoming = tuple(item[0] for item in factors)
                value = parity * sp.prod(item[1] for item in factors)
                coefficients[slots[_coordinate(kind, incoming)]] += value
            coefficients[row_index] -= 1
            coefficients = tuple(sp.simplify(value) for value in coefficients)
            if any(coefficients) and coefficients not in rows:
                rows.append(coefficients)
    constraints = sp.Matrix(rows) if rows else sp.zeros(0, len(keys))
    basis = tuple(sp.ImmutableMatrix(vector.applyfunc(sp.simplify)) for vector in constraints.nullspace())
    return keys, representatives, basis, len(rows), len(keys) - len(basis)


def _matrix_form(kind, values):
    if kind in ("dielectric", "magnetoelectric"):
        return [[values[_coordinate(kind, (i, j))] for j in range(3)] for i in range(3)]
    if kind == "piezoelectric":
        return [[values[(i, j)] for j in range(6)] for i in range(3)]
    return [[values[tuple(sorted((i, j)))] for j in range(6)] for i in range(6)]


def _finite(value, name):
    if type(value) not in (int, float) or not math.isfinite(value) or abs(value) > 1000000:
        raise ValueError(name + " 必须为绝对值不超过 1000000 的有限实数")
    return float(value)


def _vector(value, count, name):
    if not isinstance(value, (list, tuple)) or len(value) != count:
        raise ValueError(name + " 需要 " + str(count) + " 个分量")
    return [_finite(item, name) for item in value]


def _clean(value):
    return 0.0 if abs(value) < 1e-12 else float(value)


def _label(kind, row, column):
    symbol = _KINDS[kind]["symbol"]
    if kind in ("dielectric", "magnetoelectric"):
        return symbol + "_" + "xyz"[row] + "xyz"[column]
    return symbol + "_" + str(row + 1) + str(column + 1)


def _default_coefficients(kind, keys, basis):
    """Use a stable isotropic elastic example where it is in the invariant space."""
    if kind == "elasticity":
        target = sp.Matrix([3 if a == b and a < 3 else 1 if a < 3 and b < 3 or a == b else 0 for a, b in keys])
    elif kind == "dielectric":
        target = sp.Matrix([1 if a == b else 0 for a, b in keys])
    else:
        return [float(index + 1) for index in range(len(basis))]
    if not basis:
        return []
    try:
        result, _ = sp.Matrix.hstack(*basis).gauss_jordan_solve(target)
        return [float(value) for value in result]
    except ValueError:
        return [1.0] * len(basis)


def _numeric_tensor(kind, keys, basis, coefficients, angle):
    rank = _KINDS[kind]["rank"]
    values = {key: sum(float(vector[index]) * coefficients[n] for n, vector in enumerate(basis))
              for index, key in enumerate(keys)}
    indices = list(itertools.product(range(3), repeat=rank))
    full = {item: values[_coordinate(kind, item)] for item in indices}
    radians = math.radians(angle)
    c, s = math.cos(radians), math.sin(radians)
    rotation = ((c, -s, 0), (s, c, 0), (0, 0, 1))
    rotated = {}
    nonzero = [[(j, rotation[i][j]) for j in range(3) if abs(rotation[i][j]) > 1e-15] for i in range(3)]
    for output in indices:
        value = 0.0
        for factors in itertools.product(*(nonzero[i] for i in output)):
            incoming = tuple(item[0] for item in factors)
            value += math.prod(item[1] for item in factors) * full[incoming]
        rotated[output] = _clean(value)
    compact = {key: rotated[item] for item in indices for key in [_coordinate(kind, item)]}
    return _matrix_form(kind, compact)


def _response(kind, form, vector):
    output = [_clean(sum(a * b for a, b in zip(row, vector))) for row in form]
    weights = (1, 1, 1, 2, 2, 2) if kind == "elasticity" else (1, 1, 1)
    return {"input": vector, "output": output, "magnitude": math.sqrt(sum(weight * item * item for weight, item in zip(weights, output)))}


def run_tensors(payload):
    """JSON-only API. Exact symbolic basis + chosen numerical response in Python."""
    if not isinstance(payload, dict):
        raise ValueError("输入必须为对象")
    preset = payload.get("preset", "cubic_m3m")
    if not isinstance(preset, str) or preset not in (*_PRESETS, "custom"):
        raise ValueError("未知物性张量 preset")
    kind = payload.get("tensor", "dielectric")
    if not isinstance(kind, str) or kind not in _KINDS:
        raise ValueError("tensor 应为 dielectric / elasticity / piezoelectric / magnetoelectric")
    generators = _generators(payload, preset)
    keys, representatives, basis, row_count, constraint_rank = _solve(kind, generators)
    symbols = tuple(sp.Symbol("a" + str(i + 1), real=True) for i in range(len(basis)))
    symbolic = {key: sp.simplify(sum(symbols[n] * vector[index] for n, vector in enumerate(basis)))
                for index, key in enumerate(keys)}
    form = _matrix_form(kind, symbolic)
    defaults = _default_coefficients(kind, keys, basis)
    supplied = payload.get("parameters", {})
    if not isinstance(supplied, dict) or any(key not in [str(symbol) for symbol in symbols] for key in supplied):
        raise ValueError("parameters 必须是仅含当前独立参数 a1、a2… 的对象")
    coefficients = [_finite(supplied.get(str(symbol), defaults[n]), str(symbol)) for n, symbol in enumerate(symbols)]
    angle = _finite(payload.get("orientation_deg", 0), "orientation_deg")
    samples = payload.get("samples", 72)
    if type(samples) is not int or not 12 <= samples <= 360:
        raise ValueError("samples 必须为 12–360 的整数")
    plane = payload.get("plane", "xy")
    if plane not in ("xy", "xz", "yz"):
        raise ValueError("plane 必须为 xy、xz 或 yz")
    numeric = _numeric_tensor(kind, keys, basis, coefficients, angle)
    is_strain = kind in ("elasticity", "piezoelectric")
    vector = _vector(payload.get("strain", [1, 0, 0, 0, 0, 0]), 6, "strain") if is_strain else _vector(payload.get("field", [1, 0, 0]), 3, "field")
    response = _response(kind, numeric, vector)
    response.update({"rotated_form": numeric, "orientation_deg": angle, "rotation_axis": "z",
                     "input_label": "工程应变 (εxx, εyy, εzz, 2εyz, 2εxz, 2εxy)" if is_strain else "H" if kind == "magnetoelectric" else "E",
                     "output_label": "应力 (σxx, σyy, σzz, σyz, σxz, σxy)" if kind == "elasticity" else "P",
                     "units": "任意一致单位；参数是教学输入，非材料测量常数"})
    curve = []
    axes = ["xyz".index(character) for character in plane]
    for step in range(samples + 1):
        theta = 2 * math.pi * step / samples
        direction = [0.0, 0.0, 0.0]
        direction[axes[0]], direction[axes[1]] = math.cos(theta), math.sin(theta)
        incoming = ([direction[i] * direction[j] * (1 if i == j else 2) for i, j in _VOIGT]
                    if is_strain else direction)
        result = _response(kind, numeric, incoming)
        if kind == "elasticity":
            longitudinal = sum(direction[i] * direction[j] * result["output"][n] * (1 if i == j else 2) for n, (i, j) in enumerate(_VOIGT))
        else:
            longitudinal = sum(direction[i] * result["output"][i] for i in range(3))
        curve.append({"angle_deg": 360 * step / samples, "direction": [_clean(item) for item in direction],
                      "output": result["output"], "magnitude": result["magnitude"], "longitudinal": _clean(longitudinal)})
    zero = []
    groups = {}
    for row, entries in enumerate(form):
        for column, value in enumerate(entries):
            label = _label(kind, row, column)
            if value == 0:
                zero.append(label)
            else:
                groups.setdefault(str(value), []).append(label)
    equalities = [" = ".join(labels) + " = " + expression for expression, labels in groups.items() if len(labels) > 1]
    metadata = dict(_KINDS[kind])
    metadata.update({"contraction": "11,22,33,23,13,12 → 1,2,3,4,5,6；显示分量不含倍数，响应输入采用工程剪应变",
                     "row_labels": ["xx", "yy", "zz", "yz", "xz", "xy"] if kind == "elasticity" else ["x", "y", "z"],
                     "column_labels": ["xx", "yy", "zz", "yz", "xz", "xy"] if is_strain else ["x", "y", "z"]})
    group = ({"label": "自定义生成元所生成的对称群", "point_group": None, "magnetic_group": None} if preset == "custom"
             else {key: value for key, value in _PRESETS[preset].items() if key != "generators"})
    group["generators"] = [{"rotation": [[str(flat[3 * i + j]) for j in range(3)] for i in range(3)], "time_reversal": primed,
                             "determinant": str(sp.Matrix(3, 3, flat).det())} for flat, primed in generators]
    assumptions = [
        "使用笛卡尔正交基底；精确解生成元不变性即得到其生成群的不变量，不自动识别群名或判断它是否为有限晶体学点群。",
        "仅计算均匀、静态、局域平衡响应；平移部分不增加这些 q=0 张量约束。",
        "对称性允许某分量并不保证其非零；数值响应来自输入参数，不能据此预测材料常数。",
        "弹性正定性、介电稳定性与具体实验单位不由对称性保证；演示不拟合实验数据。",
        "此处不处理耗散输运或频率相关光学张量，不能用本规则替代 Onsager 互易关系。",
    ]
    if preset in ("cubic_m3m", "zincblende_td", "tetragonal_4mm", "gray_triclinic"):
        assumptions.append("本非磁性预设含独立时间反演 1′；线性磁电张量必须为零。自定义输入仅施加明确给出的生成元。")
    sources = list(_SOURCES)
    if preset == "magnetic_minus3mprime":
        assumptions.append("Cr₂O₃ 示例假定低于 Néel 温度、低磁场、沿三重轴共线反铁磁的单畴 −3′m′；另一时间反演畴的 α 整体变号。未拟合温度依赖或畴比例。")
        sources.append({"title": "Malashevich et al., Full magnetoelectric response of Cr₂O₃ from first principles (2012)",
                        "url": "https://www.physics.rutgers.edu/~dhv/pubs/archive/1207.5873/pap.pdf"})
    law = "T = τ det(R) R ⊗ R · T，τ = −1（带时间反演）或 +1" if kind == "magnetoelectric" else "T = R⊗" + str(metadata["rank"]) + " · T；时间反演偶"
    steps = [
        {"title": "写出响应和内禀对称性", "detail": metadata["equation"] + "；" + metadata["intrinsic"] + "。初始独立分量 " + str(len(keys)) + " 个。"},
        {"title": "将每个对称生成元作用于全部指标", "detail": law + "。本组有 " + str(len(generators)) + " 个输入生成元。"},
        {"title": "求精确不变子空间", "detail": "构建 (D(g)−I)t=0；约束矩阵秩为 " + str(constraint_rank) + "，零空间维数为 " + str(len(basis)) + "。"},
        {"title": "读出允许形式", "detail": "令 t=Σ aₙ bₙ。零元是禁止项；重复表达式给出相等关系。aₙ 为独立实参数。"},
        {"title": "给定参数后检验物理响应", "detail": "绕实验室 z 轴旋转晶体张量，对输入场或工程应变做收缩；方位曲线沿 " + plane + " 平面扫描单位方向。"},
    ]
    return {"lab": "property_tensors", "preset": preset, "group": group, "tensor": metadata,
            "independent_count": len(basis), "intrinsic_count": len(keys), "constraint_rank": constraint_rank,
            "constraint_rows": row_count, "symbols": [str(symbol) for symbol in symbols],
            "parameters": {str(symbol): coefficients[n] for n, symbol in enumerate(symbols)},
            "form": [[str(value) for value in row] for row in form],
            "basis": [{"symbol": str(symbols[n]), "form": [[str(value) for value in row] for row in _matrix_form(kind, dict(zip(keys, vector)))]}
                      for n, vector in enumerate(basis)],
            "zero_components": zero, "equalities": equalities, "transformation_law": law,
            "response": response, "azimuth_curve": curve, "curve_plane": plane,
            "curve_input": "单位单轴应变 ε=n⊗n" if is_strain else "单位场 n",
            "derivation": steps, "assumptions": assumptions, "sources": sources,
            "exact": True, "engine": "Python / SymPy"}
