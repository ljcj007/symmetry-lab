"""Exact symbolic algebra and symmetry-constrained Hamiltonians (GPL-3.0-only).

Pure SymPy; CPython and Pyodide use the same entry point ``run(payload)``.
Expressions are parsed by a deliberately small AST interpreter, never eval,
sympify(string), or parse_expr. Decimal input denotes the exact decimal rational.
H_ij(k) = sum_R t_ij(R) exp(2*pi*I*k.R), in periodic orbital gauge.
All hopping parameters and momentum symbols are real unless explicitly stated.

This independently implements the algebraic constraint construction used in
MagneticTB. It is not a wrapper for Rust, Mathematica, or a complete compatibility
layer for every upstream API. See SYMBOLIC_COVERAGE and the repository coverage.
"""
from __future__ import annotations

import ast
import functools
import itertools
import math
import re
import sympy as sp
from sympy.polys.matrices import DomainMatrix

SYMBOLIC_COVERAGE = {
    "implemented": ["safe exact expression/matrix algebra", "cyclotomic quotient fields",
        "exact rank/nullspace/inverse and generic-rank certificates",
        "exact symmetry-constrained hopping parametrization", "antiunitary and projective spin representations",
        "arbitrary closed polynomial orbital bases, including f orbitals",
        "symbolic Bloch Hamiltonians and k-line substitutions", "characteristic polynomials and small exact spectra",
        "symmetry-constrained polynomial k.p Hamiltonians", "exact-to-numerical hopping export"],
    "limits": ["finite browser resource bounds", "symbolic geometry requires explicit symmetry-closed bonds",
        "generic symbolic rank conditions are disclosed", "no automatic spin-space-group catalog or full upstream API compatibility"],
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integer(value, low, high, name):
    require(not isinstance(value, bool) and isinstance(value, (int, str)) and re.fullmatch(r"[+-]?\d+", str(value)),
            f"{name} must be an integer")
    value = int(value)
    require(low <= value <= high, f"{name} must be between {low} and {high}")
    return value


class ExactParser:
    """Tiny non-executing arithmetic language, with explicit symbol assumptions."""
    def __init__(self, assumptions=None):
        self.symbols = {}
        self.assumptions = dict(assumptions or {})
        self.domain_terms = []
        require(isinstance(self.assumptions, dict) and len(self.assumptions) <= 64, "Invalid symbol assumptions")
        for name, assumption in self.assumptions.items():
            require(assumption in ("real", "positive", "nonnegative", "integer", "complex"),
                    "Symbol assumptions: real, positive, nonnegative, integer, or complex")
            self.symbol(name)

    def nonzero_domain(self, expression):
        if expression.free_symbols and expression not in self.domain_terms:
            self.domain_terms.append(expression)

    def domain_conditions(self):
        return [{"kind": "original_input_domain", "condition": f"{sp.sstr(v)} != 0",
                 "explanation": "This input or construction denominator, negative power, or nonsingularity condition remains excluded even if symbolic simplification cancels it."}
                for v in self.domain_terms]

    def symbol(self, name):
        require(re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,31}", name) and not name.startswith("__"), "Invalid symbol name")
        require(name not in ("I", "pi", "E", "sqrt", "sin", "cos", "tan", "exp", "conjugate", "Abs", "re", "im"),
                f"Reserved symbol name: {name}")
        require(name in self.symbols or len(self.symbols) < 64, "At most 64 symbols")
        if name not in self.symbols:
            assumption = self.assumptions.get(name, "real")
            self.symbols[name] = sp.Symbol(name, **({} if assumption == "complex" else {assumption: True}))
        return self.symbols[name]

    def parse(self, value):
        if isinstance(value, sp.Basic):
            return value
        if isinstance(value, bool):
            raise ValueError("Boolean is not an exact scalar")
        if isinstance(value, int):
            require(abs(value).bit_length() <= 1024, "Integer is too large")
            return sp.Integer(value)
        if isinstance(value, float):
            require(math.isfinite(value), "Numbers must be finite")
            return sp.Rational(str(value))
        if isinstance(value, (list, tuple)):
            require(len(value) == 2, "Complex scalars are [real, imaginary]")
            return self.parse(value[0]) + sp.I*self.parse(value[1])
        require(isinstance(value, str) and 0 < len(value) <= 4096, "Exact expressions must be strings of at most 4096 characters")
        try:
            tree = ast.parse(value.replace("^", "**"), mode="eval")
        except (SyntaxError, RecursionError) as exc:
            raise ValueError("Invalid exact expression syntax") from exc
        require(sum(1 for _ in ast.walk(tree)) <= 512, "Expression has too many operations")

        def visit(node, depth=0):
            require(depth <= 32, "Expression nesting limit exceeded")
            if isinstance(node, ast.Constant):
                require(isinstance(node.value, (int, float)) and not isinstance(node.value, bool), "Only numeric literals are allowed")
                # Preserve the original decimal lexeme, including long decimals.
                token = ast.get_source_segment(value.replace("^", "**"), node)
                require(len(token or "") <= 320, "Numeric literal is too long")
                exponent = re.search(r"[eE]([+-]?\d+)$", token or "")
                require(exponent is None or abs(int(exponent[1])) <= 1000, "Decimal exponent exceeds the resource bound")
                return self.parse(node.value) if isinstance(node.value, int) else sp.Rational(token)
            if isinstance(node, ast.Name):
                constants = {"I": sp.I, "pi": sp.pi, "E": sp.E}
                return constants[node.id] if node.id in constants else self.symbol(node.id)
            if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
                v = visit(node.operand, depth+1)
                return v if isinstance(node.op, ast.UAdd) else -v
            if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
                a, b = visit(node.left, depth+1), visit(node.right, depth+1)
                if isinstance(node.op, ast.Add): return a+b
                if isinstance(node.op, ast.Sub): return a-b
                if isinstance(node.op, ast.Mult): return a*b
                if isinstance(node.op, ast.Div):
                    require(b != 0, "Division by zero")
                    self.nonzero_domain(b)
                    return a/b
                require(b.is_Rational and abs(b) <= 128 and b.q <= 64,
                        "Powers require a rational exponent with absolute value at most 128 and denominator at most 64")
                require(not (a == 0 and b < 0), "Division by zero")
                if b < 0: self.nonzero_domain(a)
                if a.is_Rational:
                    require(max(abs(int(a.p)).bit_length(), int(a.q).bit_length())*max(1, abs(b)) <= 8192,
                            "Exact integer power exceeds the 8192-bit resource bound")
                return a**b
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords and len(node.args) == 1:
                functions = {"sqrt": sp.sqrt, "sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "exp": sp.exp,
                             "conjugate": sp.conjugate, "Abs": sp.Abs, "re": sp.re, "im": sp.im}
                require(node.func.id in functions, "Function is not in the safe arithmetic language")
                argument = visit(node.args[0], depth+1)
                if node.func.id == "tan": self.nonzero_domain(sp.cos(argument))
                return functions[node.func.id](argument)
            raise ValueError("Only arithmetic, symbols, and approved one-argument functions are allowed")

        result = visit(tree.body)
        require(not result.has(sp.zoo, sp.oo, -sp.oo, sp.nan), "Expression is not finite")
        if result.is_Rational:
            require(max(abs(int(result.p)).bit_length(), int(result.q).bit_length()) <= 8192,
                    "Exact rational exceeds the 8192-bit resource bound")
        return result

    def matrix(self, raw, shape=None, limit=48):
        require(isinstance(raw, list) and 0 < len(raw) <= limit and all(isinstance(row, list) for row in raw), "Expected a matrix")
        width = len(raw[0])
        require(0 < width <= limit and all(len(row) == width for row in raw), "Matrix rows must have equal bounded length")
        result = sp.Matrix([[self.parse(v) for v in row] for row in raw])
        require(shape is None or result.shape == shape, f"Matrix must have shape {shape}")
        return result


@functools.lru_cache(maxsize=16384)
def simp(value):
    value = sp.sympify(value)  # value is already an internally constructed SymPy object, never user text.
    if value.is_Atom or value.is_Rational:
        return value
    # Expand imaginary exponentials for Bloch formulas, but do not expand the
    # square root of an unknown-sign symbolic radicand into Abs/atan2 branches.
    if value.has(sp.exp) and all(s.is_real for s in value.free_symbols):
        value = sp.expand_complex(value)
    return sp.trigsimp(sp.cancel(value))


def zero(value):
    return simp(value) == 0


def clean(matrix):
    return matrix.applyfunc(simp)


def exact_equal(a, b):
    if isinstance(a, sp.MatrixBase):
        return a.shape == b.shape and all(zero(v) for v in a-b)
    return zero(a-b)


def mat_json(matrix):
    return [[str(simp(matrix[i, j])) for j in range(matrix.cols)] for i in range(matrix.rows)]


def display(value):
    return {"matrix": mat_json(value), "latex": sp.latex(value),
            "mathml": sp.printing.mathml(value, printer="presentation"),
            "symbols": sorted(str(s) for s in value.free_symbols)} if isinstance(value, sp.MatrixBase) else {
            "expression": str(value), "latex": sp.latex(value),
            "mathml": sp.printing.mathml(value, printer="presentation"),
            "symbols": sorted(str(s) for s in value.free_symbols)}


def exact_kernel(matrix, width=None):
    """An exact algebraic/rational-function field kernel, with no numeric SVD."""
    if matrix.rows == 0:
        return sp.eye(width if width is not None else matrix.cols)
    matrix = clean(matrix)
    # A rational-function domain treats sin(x) and cos(x) as independent
    # generators. For such inputs use symbolic pivot simplification so that
    # relations such as sin(x)**2 + cos(x)**2 = 1 also affect the rank.
    symbols = matrix.free_symbols
    if symbols and not all(v.is_rational_function(*symbols) for v in matrix):
        vectors = matrix.nullspace(simplify=simp, iszerofunc=zero)
        kernel = clean(sp.Matrix.hstack(*vectors)) if vectors else sp.zeros(matrix.cols, 0)
    else:
        domain = DomainMatrix.from_Matrix(matrix, extension=True).to_field()
        kernel = clean(domain.nullspace(divide_last=True).to_Matrix().T)
    require(exact_equal(matrix*kernel, sp.zeros(matrix.rows, kernel.cols)), "Exact nullspace verification failed")
    return kernel


def rank_conditions(matrix):
    """A sufficient nonzero minor for the generic rank (not an exhaustive stratum decomposition)."""
    if not matrix.free_symbols:
        return []
    _, columns = matrix.rref(simplify=simp, iszerofunc=zero)
    if not columns:
        return []
    _, rows = matrix.T.rref(simplify=simp, iszerofunc=zero)
    minor = sp.factor(matrix.extract(rows, columns).det())
    if not minor.free_symbols:
        return []
    return [{"kind": "sufficient_generic_rank_minor", "condition": f"{minor} != 0",
             "explanation": "Kernel/rank are over the rational-function field. Substitute exceptional parameter values and recompute; this minor is sufficient, not necessary, for the reported rank."}]


def checked_substitutions(raw, parser):
    require(isinstance(raw, dict) and len(raw) <= 64, "Substitutions must be an object with at most 64 entries")
    values = {parser.symbol(k): parser.parse(v) for k, v in raw.items()}
    for symbol, value in values.items():
        if symbol.is_real: require(zero(sp.im(value)), f"Substitution for real symbol {symbol} must be real")
        if symbol.is_positive: require(value.is_positive is True, f"Substitution for positive symbol {symbol} must be positive")
        if symbol.is_nonnegative: require(value.is_nonnegative is True, f"Substitution for nonnegative symbol {symbol} must be nonnegative")
        if symbol.is_integer: require(value.is_integer is True, f"Substitution for integer symbol {symbol} must be integer")
    for denominator in parser.domain_terms:
        require(not zero(denominator.subs(values, simultaneous=True)), "Substitution lies outside the original input domain")
    return values


def algebra(payload, parser):
    operation = payload.get("operation", "simplify")
    if "matrix" in payload:
        matrix = parser.matrix(payload["matrix"])
        require(matrix.rows*matrix.cols <= 1024, "Symbolic matrix limit: 1024 entries")
        if operation in ("nullspace", "rref", "rank"):
            kernel = exact_kernel(matrix)
            rref, pivots = matrix.rref(simplify=simp, iszerofunc=zero)
            return {"action": "algebra", "operation": operation, "input": mat_json(matrix),
                    "rank": len(pivots), "nullity": kernel.cols, "kernel": mat_json(kernel),
                    "rref": mat_json(rref), "pivot_columns": list(pivots), "conditions": rank_conditions(matrix),
                    "verified": exact_equal(matrix*kernel, sp.zeros(matrix.rows, kernel.cols)), **display(kernel)}
        if operation == "inverse":
            require(matrix.rows == matrix.cols, "Inverse needs a square matrix")
            determinant = sp.factor(matrix.det())
            require(not zero(determinant), "Matrix is singular")
            inverse = clean(matrix.inv())
            return {"action": "algebra", "operation": operation, "determinant": str(determinant),
                    "conditions": [f"{determinant} != 0"] if determinant.free_symbols else [],
                    "verified": exact_equal(matrix*inverse, sp.eye(matrix.rows)), **display(inverse)}
        if operation in ("det", "charpoly", "eigenvalues"):
            require(matrix.rows == matrix.cols and matrix.rows <= 10, "Spectral algebra needs a square matrix of size ≤10")
            if operation == "det":
                return {"action": "algebra", "operation": operation, **display(sp.factor(matrix.det()))}
            lam = parser.symbol("lambda")
            characteristic = sp.factor(matrix.charpoly(lam).as_expr())
            result = {"action": "algebra", "operation": operation, **display(characteristic)}
            if operation == "eigenvalues":
                require(matrix.rows <= 4, "Explicit eigenvalues are limited to size 4; use charpoly above that")
                result["eigenvalues"] = [{"value": str(simp(v)), "multiplicity": int(m)} for v, m in matrix.eigenvals().items()]
            return result
        functions = {"simplify": simp, "expand": sp.expand, "factor": sp.factor, "trigsimp": sp.trigsimp,
                     "conjugate": sp.conjugate}
        require(operation in functions, "Unsupported matrix algebra operation")
        return {"action": "algebra", "operation": operation, **display(matrix.applyfunc(functions[operation]))}
    expression = parser.parse(payload.get("expression", "0"))
    substitutions = payload.get("substitutions", {})
    expression = expression.subs(checked_substitutions(substitutions, parser), simultaneous=True)
    functions = {"simplify": simp, "expand": sp.expand, "factor": sp.factor, "trigsimp": sp.trigsimp,
                 "conjugate": sp.conjugate, "real": sp.re, "imag": sp.im}
    if operation == "differentiate":
        result = sp.diff(expression, parser.symbol(payload.get("variable", "k")), integer(payload.get("order", 1), 1, 8, "order"))
    elif operation == "series":
        symbol = parser.symbol(payload.get("variable", "k"))
        result = sp.series(expression, symbol, parser.parse(payload.get("point", 0)), integer(payload.get("order", 5), 1, 12, "order"))
    else:
        require(operation in functions, "Unsupported scalar algebra operation")
        result = functions[operation](expression)
    return {"action": "algebra", "operation": operation, **display(result),
            "assumptions": {name: parser.assumptions.get(name, "real") for name in parser.symbols},
            "conditions": ["Identities hold on the common domain of the input and output; simplification does not fill original poles or choose unstated branches."]}


class CyclotomicField:
    """Q[z]/Phi_n(z), using polynomial remainders and exact extended Euclid."""
    def __init__(self, order, parser):
        self.order = order
        parser.assumptions["z"] = "complex"
        parser.symbols.pop("z", None)
        self.z = parser.symbol("z")
        self.phi = sp.Poly(sp.cyclotomic_poly(order, self.z), self.z, domain=sp.QQ)
        self.degree = self.phi.degree()

    def reduce(self, expression):
        require(expression.free_symbols <= {self.z}, "Cyclotomic expressions may only contain z; write I as z**(order/4) when applicable")
        num, den = sp.cancel(expression).as_numer_denom()
        try:
            a, b = sp.Poly(num, self.z, domain=sp.QQ), sp.Poly(den, self.z, domain=sp.QQ)
            require(a.degree() <= 4096 and b.degree() <= 4096, "Cyclotomic polynomial degree is too large")
            return (a * sp.invert(b, self.phi)).rem(self.phi).as_expr().expand()
        except (sp.PolynomialError, sp.CoercionFailed) as exc:
            raise ValueError("Cyclotomic coefficients must be rational; use arithmetic in the formal root z") from exc
        except sp.NotInvertible as exc:
            raise ValueError("Cyclotomic denominator is zero in this field") from exc

    def conjugate(self, expression):
        return self.reduce(expression.subs(self.z, self.z**(self.order-1)))

    def rref(self, matrix):
        a = matrix.applyfunc(self.reduce)
        pivots = []
        row = 0
        for column in range(a.cols):
            pivot = next((i for i in range(row, a.rows) if a[i, column] != 0), None)
            if pivot is None:
                continue
            a.row_swap(row, pivot)
            scale = a[row, column]
            for j in range(a.cols): a[row, j] = self.reduce(a[row, j]/scale)
            for i in range(a.rows):
                if i != row and a[i, column] != 0:
                    scale = a[i, column]
                    for j in range(a.cols): a[i, j] = self.reduce(a[i, j]-scale*a[row, j])
            pivots.append(column)
            row += 1
            if row == a.rows: break
        return a, pivots


def cyclotomic(payload, parser):
    order = integer(payload.get("order", 6), 1, 120, "cyclotomic order")
    field = CyclotomicField(order, parser)
    require(field.degree <= 48, "Cyclotomic field degree limit is 48")
    result = {"action": "cyclotomic", "order": order, "degree": field.degree,
              "minimal_polynomial": str(field.phi.as_expr()), "embedding": "z = exp(2*pi*I/order)",
              "arithmetic": "exact rational polynomial quotient, no floating-point reconstruction"}
    if "matrix" in payload:
        matrix = parser.matrix(payload["matrix"], limit=24)
        reduced = matrix.applyfunc(field.reduce)
        rref, pivots = field.rref(reduced)
        free = [j for j in range(matrix.cols) if j not in pivots]
        kernel = sp.zeros(matrix.cols, len(free))
        for j, free_col in enumerate(free):
            kernel[free_col, j] = 1
            for i, pivot in enumerate(pivots): kernel[pivot, j] = -rref[i, free_col]
        verified = all(field.reduce(v) == 0 for v in reduced*kernel)
        require(verified, "Cyclotomic kernel verification failed")
        return {**result, "input": mat_json(reduced), "rank": len(pivots), "nullity": len(free),
                "rref": mat_json(rref), "kernel": mat_json(kernel), "verified": verified,
                "pivot_columns": pivots, **display(kernel)}
    value = field.reduce(parser.parse(payload.get("expression", "z")))
    polynomial = sp.Poly(value, field.z, domain=sp.QQ)
    multiplication = sp.Matrix(field.degree, field.degree,
        lambda i, j: sp.Poly(field.reduce(value*field.z**j), field.z).nth(i))
    return {**result, **display(value), "coefficients": [str(polynomial.nth(i)) for i in range(field.degree)],
            "conjugate": str(field.conjugate(value)), "trace": str(multiplication.trace()),
            "norm": str(multiplication.det()),
            "approximation": str(sp.N(value.subs(field.z, sp.exp(2*sp.pi*sp.I/order)), 15))}


X, Y, Z = sp.symbols("x y z", real=True)
XYZ = sp.Matrix([X, Y, Z])
R2 = X*X+Y*Y+Z*Z
ORBITALS = {
    "s": sp.Integer(1), "px": X, "py": Y, "pz": Z,
    "dxy": X*Y, "dyz": Y*Z, "dxz": X*Z, "dx2-y2": X*X-Y*Y, "dz2": 3*Z*Z-R2,
    "fz3": Z*(5*Z*Z-3*R2), "fxz2": X*(5*Z*Z-R2), "fyz2": Y*(5*Z*Z-R2),
    "fz(x2-y2)": Z*(X*X-Y*Y), "fxyz": X*Y*Z,
    "fx(x2-3y2)": X*(X*X-3*Y*Y), "fy(3x2-y2)": Y*(3*X*X-Y*Y),
}


def sphere_inner(a, b):
    product = sp.Poly(sp.expand(sp.conjugate(a)*b), X, Y, Z)
    result = sp.Integer(0)
    for powers, coefficient in product.terms():
        if any(p % 2 for p in powers): continue
        moment = sp.prod(sp.factorial2(p-1) for p in powers)/sp.factorial2(sum(powers)+1)
        result += coefficient*moment
    return simp(result)


def polynomial_basis(raw, parser, orthonormal=True):
    require(isinstance(raw, list) and 0 < len(raw) <= 16, "Supply 1–16 polynomial orbitals")
    polys = []
    for item in raw:
        expr = ORBITALS[item] if isinstance(item, str) and item in ORBITALS else parser.parse(item)
        expr = expr.xreplace({s: dict(zip(("x", "y", "z"), (X, Y, Z)))[str(s)] for s in expr.free_symbols if str(s) in ("x", "y", "z")})
        require(expr.free_symbols <= {X, Y, Z}, "Polynomial orbitals may only contain x, y, z")
        try: polynomial = sp.Poly(expr, X, Y, Z)
        except sp.PolynomialError as exc: raise ValueError("Orbital functions must be polynomials") from exc
        require(polynomial.total_degree() <= 6, "Orbital polynomial degree limit is 6")
        require(zero(sp.im(expr)), "Automatic polynomial orbitals must have real coefficients")
        polys.append(sp.expand(expr))
    gram = sp.Matrix(len(polys), len(polys), lambda i, j: sphere_inner(polys[i], polys[j]))
    require(not zero(gram.det()), "Polynomial orbitals are linearly dependent on the unit sphere")
    if orthonormal:
        normalized = []
        for p in polys:
            q = p - sum((sphere_inner(v, p)*v for v in normalized), sp.Integer(0))
            normalized.append(sp.expand(q/sp.sqrt(sphere_inner(q, q))))
        polys = normalized
    return polys, gram


def orbital_representation(polys, rotation):
    transformed_coords = rotation.T*XYZ
    transformed = [sp.expand(p.subs(dict(zip((X, Y, Z), transformed_coords)), simultaneous=True)) for p in polys]
    gram = sp.Matrix(len(polys), len(polys), lambda i, j: sphere_inner(polys[i], polys[j]))
    projections = sp.Matrix(len(polys), len(polys), lambda i, j: sphere_inner(polys[i], transformed[j]))
    representation = clean(gram.inv()*projections)
    require(all(zero(transformed[j]-sum((polys[i]*representation[i, j] for i in range(len(polys))), sp.Integer(0)))
                for j in range(len(polys))), "Polynomial orbital subspace is not closed under this rotation")
    require(exact_equal(representation.H*gram*representation, gram), "Orbital metric invariance failed")
    return representation


def orbitals(payload, parser):
    rotation = parser.matrix(payload.get("rotation", sp.eye(3).tolist()), (3, 3))
    require(exact_equal(rotation.T*rotation, sp.eye(3)), "Cartesian rotation must be exactly orthogonal")
    polys, original_gram = polynomial_basis(payload.get("polynomials", ["px", "py", "pz"]), parser,
                                          payload.get("orthonormalize", True))
    representation = orbital_representation(polys, rotation)
    gram = sp.Matrix(len(polys), len(polys), lambda i, j: sphere_inner(polys[i], polys[j]))
    return {"action": "orbitals", "polynomials": [str(p) for p in polys], "original_gram": mat_json(original_gram),
            "gram": mat_json(gram), "verified": True, **display(representation),
            "inner_product": "average over the unit sphere; polynomial basis orthonormalized by exact Gram–Schmidt when requested"}


def spin_lift(rotation, parser=None):
    proper = clean(rotation.det()*rotation)
    candidates = [(1+proper.trace())/4] + [(1+2*proper[i, i]-proper.trace())/4 for i in range(3)]
    index = next((i for i, value in enumerate(candidates) if not zero(value)), None)
    require(index is not None, "Cannot construct exact spin lift")
    q = [sp.Integer(0)]*4
    q[index] = sp.sqrt(simp(candidates[index]))
    if parser is not None: parser.nonzero_domain(q[index])
    if index == 0:
        q[1] = (proper[2, 1]-proper[1, 2])/(4*q[0])
        q[2] = (proper[0, 2]-proper[2, 0])/(4*q[0])
        q[3] = (proper[1, 0]-proper[0, 1])/(4*q[0])
    else:
        i = index-1; j, k = (i+1) % 3, (i+2) % 3
        q[0] = (proper[k, j]-proper[j, k])/(4*q[index])
        q[j+1] = (proper[j, i]+proper[i, j])/(4*q[index])
        q[k+1] = (proper[k, i]+proper[i, k])/(4*q[index])
    w, x, y, z = map(simp, q)
    result = clean(sp.Matrix([[w-sp.I*z, -y-sp.I*x], [y-sp.I*x, w+sp.I*z]]))
    require(exact_equal(result.H*result, sp.eye(2)), "Exact spin lift is not unitary")
    return result


def rational_vector(raw, parser, name):
    require(isinstance(raw, list) and len(raw) == 3, f"{name} must have three entries")
    result = sp.Matrix([parser.parse(v) for v in raw])
    require(all(v.is_Rational for v in result), f"{name} must use exact rational fractional coordinates")
    return result


def mod1(vector, periodic=(True, True, True)):
    return sp.Matrix([v-sp.floor(v) if periodic[i] else v for i, v in enumerate(vector)])


def op_key(rotation, translation, anti, periodic=(True, True, True)):
    return tuple(rotation)+tuple(mod1(translation, periodic))+(bool(anti),)


def exact_operations(raw, lattice, periodic, parser):
    require(isinstance(raw, list) and 0 < len(raw) <= 96, "Supply a complete list of 1–96 operations")
    operations, lookup = [], {}
    for index, item in enumerate(raw):
        rotation = parser.matrix(item.get("rotation"), (3, 3))
        require(all(v.is_Integer for v in rotation) and abs(rotation.det()) == 1, "Fractional rotations must be unimodular integer matrices")
        translation = mod1(rational_vector(item.get("translation", [0, 0, 0]), parser, "translation"), periodic)
        cartesian = clean(lattice.T*rotation*lattice.T.inv())
        require(exact_equal(cartesian.T*cartesian, sp.eye(3)), f"Operation {index+1} does not exactly preserve the lattice metric")
        require(all(periodic[i] == periodic[j] or rotation[i, j] == 0 for i in range(3) for j in range(3)),
                "An operation mixes periodic and nonperiodic directions")
        anti = bool(item.get("antiunitary", False))
        key = op_key(rotation, translation, anti, periodic)
        require(key not in lookup, "Duplicate symmetry operation")
        lookup[key] = index
        operations.append({**item, "rotation": rotation, "translation": translation, "cartesian": cartesian, "antiunitary": anti})
    require(op_key(sp.eye(3), sp.zeros(3, 1), False, periodic) in lookup, "Operation list must include identity")
    table = []
    for g in operations:
        row = []
        for h in operations:
            key = op_key(g["rotation"]*h["rotation"], g["rotation"]*h["translation"]+g["translation"], g["antiunitary"] != h["antiunitary"], periodic)
            require(key in lookup, "Symmetry operation list is not closed modulo lattice translations")
            row.append(lookup[key])
        table.append(row)
    return operations, table


def exact_sites(raw, operations, parser, expand=True, periodic=(True, True, True)):
    require(isinstance(raw, list) and 0 < len(raw) <= 16, "Supply 1–16 seed sites")
    sites = []
    for item in raw:
        position = mod1(rational_vector(item.get("position"), parser, "site position"), periodic)
        labels = item.get("orbitals", ["s"])
        require(isinstance(labels, list) and 0 < len(labels) <= 16 and all(isinstance(x, str) for x in labels), "Invalid orbital labels")
        positions = [mod1(g["rotation"]*position+g["translation"], periodic) for g in operations] if expand else [position]
        for pos in positions:
            duplicates = [s for s in sites if s["position"] == pos]
            if duplicates:
                require(duplicates[0]["orbitals"] == labels and duplicates[0].get("polynomials") == item.get("polynomials"), "Overlapping site orbits have incompatible orbitals")
            else:
                sites.append({**item, "position": pos, "orbitals": labels})
    require(len(sites) <= 16 and sum(len(s["orbitals"]) for s in sites) <= 24, "Exact browser model limit: 16 sites / 24 orbitals")
    permutations, shifts = [], []
    for g in operations:
        permutation, cells = [], []
        for site in sites:
            image = g["rotation"]*site["position"]+g["translation"]
            matches = [i for i, other in enumerate(sites) if mod1(image, periodic) == other["position"] and site["orbitals"] == other["orbitals"]
                       and site.get("polynomials") == other.get("polynomials")]
            require(len(matches) == 1, "Sites/orbitals are not a closed symmetry orbit")
            j = matches[0]
            permutation.append(j); cells.append(image-sites[j]["position"])
        require(len(set(permutation)) == len(sites), "Symmetry does not permute the sites bijectively")
        permutations.append(permutation); shifts.append(cells)
    return sites, permutations, shifts


def exact_representations(operations, sites, permutations, table, parser):
    matrices, polynomial_output = [], {}
    for gi, g in enumerate(operations):
        row = []
        for si, site in enumerate(sites):
            labels = site["orbitals"]; size = len(labels)
            if "site_matrices" in g:
                require(len(g["site_matrices"]) == len(sites), "site_matrices must follow expanded site order")
                matrix = parser.matrix(g["site_matrices"][si], (size, size))
            elif "orbital_matrix" in g:
                matrix = parser.matrix(g["orbital_matrix"], (size, size))
            else:
                spin_labels = [(v[:-2], 0 if v.endswith("up") else 1) for v in labels if v.endswith(("up", "dn"))]
                spatial = list(dict.fromkeys(v[0] for v in spin_labels)) if spin_labels else labels
                if spin_labels:
                    require(len(spin_labels) == size == 2*len(spatial) and len(set(spin_labels)) == size,
                            "Spinor orbitals need both up and dn components")
                polys, _ = polynomial_basis(site.get("polynomials", spatial), parser)
                require(len(polys) == len(spatial), "polynomials must follow the spatial orbital labels")
                orbital = orbital_representation(polys, g["cartesian"])
                polynomial_output[str(si)] = [str(p) for p in polys]
                if spin_labels:
                    spin = parser.matrix(g["spin_matrix"], (2, 2)) if "spin_matrix" in g else spin_lift(g["cartesian"], parser)
                    if g["antiunitary"]: spin = spin*sp.Matrix([[0, 1], [-1, 0]])
                    matrix = sp.Matrix(size, size, lambda i, j: orbital[spatial.index(spin_labels[i][0]), spatial.index(spin_labels[j][0])]*spin[spin_labels[i][1], spin_labels[j][1]])
                else:
                    matrix = orbital
            matrix = clean(matrix)
            require(exact_equal(matrix.H*matrix, sp.eye(size)), f"Operation {gi+1}, site {si+1}: representation is not exactly unitary")
            row.append(matrix)
        matrices.append(row)
    factors = []
    for a, g in enumerate(operations):
        phase_row = []
        for b in range(len(operations)):
            phase = None
            for s in range(len(sites)):
                left = matrices[a][permutations[b][s]]*(matrices[b][s].conjugate() if g["antiunitary"] else matrices[b][s])
                right = matrices[table[a][b]][s]
                scalar = simp((right.H*left).trace()/right.rows)
                if phase is None: phase = scalar
                require(zero(scalar*sp.conjugate(scalar)-1) and zero(scalar-phase) and exact_equal(left, scalar*right),
                        "Local matrices fail the exact semilinear projective group law")
            phase_row.append(str(phase))
        factors.append(phase_row)
    return matrices, polynomial_output, factors


def exact_bonds(payload, lattice, sites, periodic, parser):
    metric = clean(lattice*lattice.T)
    if "bonds" in payload:
        raw = payload["bonds"]
        require(isinstance(raw, list) and 0 < len(raw) <= 2048, "Explicit bonds limit: 2048")
        records = {}
        for item in raw:
            i = integer(item.get("from_site", 0), 0, len(sites)-1, "from_site")
            j = integer(item.get("to_site", 0), 0, len(sites)-1, "to_site")
            cell = rational_vector(item.get("cell", [0, 0, 0]), parser, "cell")
            require(all(v.is_Integer for v in cell), "Bond cell coordinates must be integers")
            require(all(periodic[a] or cell[a] == 0 for a in range(3)), "Bond cell extends a nonperiodic direction")
            delta = sites[j]["position"]-sites[i]["position"]+cell
            records[(i, j, *map(int, cell))] = (0, simp((delta.T*metric*delta)[0]))
        return records, [], "explicit symmetry-closed bonds; no ordering assumption on symbolic distances"
    require(not metric.free_symbols, "Symbolic lattice parameters require an explicit bonds list; distance ordering depends on parameter values")
    shell_count = integer(payload.get("shell_count", 2), 1, 8, "shell_count")
    row_norms = [simp(metric[a, a]) for a in range(3) if periodic[a]]
    cutoff = parser.parse(payload["max_distance"]) if "max_distance" in payload else shell_count*sp.sqrt(sp.Max(*(row_norms or [metric.trace()])))
    require(not cutoff.free_symbols and cutoff.is_nonnegative is True, "Cutoff must be a nonnegative exact constant")
    dual = clean(metric.inv())
    bounds = [int(sp.ceiling(simp(cutoff*sp.sqrt(dual[a, a])+1))) if periodic[a] else 0 for a in range(3)]
    require(max(bounds) <= 12 and math.prod(2*b+1 for b in bounds)*len(sites)**2 <= 100000,
            "Exact bond enumeration exceeds browser limit; provide a smaller cutoff or explicit bonds")
    candidates = []
    for cell in itertools.product(*(range(-b, b+1) for b in bounds)):
        R = sp.Matrix(cell)
        for i, left in enumerate(sites):
            for j, right in enumerate(sites):
                delta = right["position"]-left["position"]+R
                d2 = simp((delta.T*metric*delta)[0])
                difference = simp(cutoff*cutoff-d2)
                require(difference.is_nonnegative is not None, "Cannot exactly order these algebraic distances; provide explicit bonds")
                if difference.is_nonnegative: candidates.append((d2, (i, j, *cell)))
    def compare(a, b):
        difference = simp(a[0]-b[0])
        if difference == 0: return (a[1] > b[1])-(a[1] < b[1])
        require(difference.is_positive is not None, "Cannot exactly order bond lengths")
        return 1 if difference.is_positive else -1
    candidates.sort(key=functools.cmp_to_key(compare))
    lengths, records = [], {}
    for d2, key in candidates:
        if not lengths or not zero(d2-lengths[-1]): lengths.append(d2)
        if len(lengths) > shell_count: break
        records[key] = (len(lengths), d2)
    require(len(lengths) >= shell_count, "Requested bond shells are absent; increase max_distance")
    require(len(records) <= 2048, "Exact bond limit: 2048")
    return records, lengths[:shell_count], "complete enumeration with dual-metric cell bound and exact distance comparisons"


def real_linear_transport(left, right, anti, reverse):
    n, m = left.cols, right.cols
    columns = []
    for p in range(2*n*m):
        seed = sp.zeros(n, m)
        seed[(p % (n*m))//m, p % m] = 1 if p < n*m else sp.I
        transformed = left*(seed.conjugate() if anti else seed)*right.H
        if reverse: transformed = transformed.H
        values = list(transformed)
        columns.append(sp.Matrix([simp(sp.re(v)) for v in values]+[simp(sp.im(v)) for v in values]))
    return sp.Matrix.hstack(*columns)


def constrained_basis(records, sites, operations, permutations, shifts, matrices):
    remaining, basis, certificates = set(records), [], []
    while remaining:
        key = min(remaining, key=lambda k: (records[k][0], k))
        i, j, *cell = key
        width = 2*len(sites[i]["orbitals"])*len(sites[j]["orbitals"])
        require(width <= 128, "Exact per-bond constraint width limit is 128 real variables")
        transports, constraints = {}, []
        for gi, g in enumerate(operations):
            ni, nj = permutations[gi][i], permutations[gi][j]
            new_cell = g["rotation"]*sp.Matrix(cell)+shifts[gi][j]-shifts[gi][i]
            for reverse in (False, True):
                target = (nj, ni, *map(int, -new_cell)) if reverse else (ni, nj, *map(int, new_cell))
                require(target in records, "Selected bonds are not closed under Hermitian conjugation and symmetry")
                transform = real_linear_transport(matrices[gi][i], matrices[gi][j], g["antiunitary"], reverse)
                if target in transports:
                    difference = transform-transports[target]
                    for row in difference.tolist():
                        row = tuple(simp(v) for v in row)
                        if any(v != 0 for v in row): constraints.append(row)
                else:
                    transports[target] = transform
        constraints = list(dict.fromkeys(constraints))
        system = sp.Matrix(constraints) if constraints else sp.zeros(0, width)
        kernel = exact_kernel(system, width)
        conditions = rank_conditions(system)
        certificates.extend(conditions)
        for p in range(kernel.cols):
            terms = []
            for target, transform in sorted(transports.items()):
                a, b, *R = target
                vector = clean(transform*kernel[:, p]); half = vector.rows//2
                matrix = sp.Matrix(len(sites[a]["orbitals"]), len(sites[b]["orbitals"]),
                                   lambda u, v: simp(vector[u*len(sites[b]["orbitals"])+v]+sp.I*vector[half+u*len(sites[b]["orbitals"])+v]))
                if any(v != 0 for v in matrix):
                    terms.append({"from_site": a, "to_site": b, "cell": R, "matrix": matrix})
            basis.append({"name": f"p{len(basis)+1}", "shell": records[key][0], "distance_squared": str(records[key][1]), "terms": terms})
        remaining.difference_update(transports)
        require(len(basis) <= 128, "Exact model parameter limit is 128")
    return basis, certificates


def exact_hoppings(payload, parser):
    raw = payload.get("hoppings")
    require(isinstance(raw, list) and 0 < len(raw) <= 2048, "Supply 1–2048 hopping matrices")
    result, size = {}, None
    for item in raw:
        cell = rational_vector(item.get("cell"), parser, "hopping cell")
        require(all(v.is_Integer for v in cell), "Hopping cells must be integer")
        key = tuple(map(int, cell))
        require(key not in result, "Duplicate hopping cell")
        matrix = parser.matrix(item.get("matrix"), limit=24)
        if size is None: size = matrix.rows
        require(matrix.shape == (size, size), "Hopping matrices must be square and have the same dimension")
        result[key] = matrix
    for cell, matrix in result.items():
        reverse = tuple(-v for v in cell)
        require(exact_equal(matrix, result.get(reverse, sp.zeros(size)).H), "Hoppings are not exactly Hermitian; include reverse cells")
    return result


def hamiltonian(hoppings, k):
    size = next(iter(hoppings.values())).rows
    result = sp.zeros(size)
    for cell, matrix in hoppings.items():
        result += matrix*sp.exp(2*sp.pi*sp.I*sum(a*b for a, b in zip(k, cell)))
    return clean(result)


def spectral_output(matrix, payload, parser):
    result = {"hamiltonian": display(matrix), "hermitian": exact_equal(matrix.H, matrix)}
    if payload.get("characteristic_polynomial", False) or payload.get("eigenvalues", False):
        require(matrix.rows <= 8, "Characteristic polynomial limit is size 8")
        lam = parser.symbol("lambda")
        result["characteristic_polynomial"] = display(sp.factor(matrix.charpoly(lam).as_expr()))
    if payload.get("eigenvalues", False):
        require(matrix.rows <= 4, "Explicit eigenvalue limit is size 4; request a characteristic polynomial instead")
        result["eigenvalues"] = [{"value": str(simp(value)), "multiplicity": int(multiplicity)}
                                 for value, multiplicity in matrix.eigenvals().items()]
    return result


def numeric_export(hoppings, substitutions, parser):
    if substitutions is None: return None
    values = checked_substitutions(substitutions, parser)
    substituted = {cell: clean(matrix.subs(values, simultaneous=True)) for cell, matrix in hoppings.items()}
    for cell, matrix in substituted.items():
        require(not matrix.free_symbols, "Numerical export requires values for every hopping symbol")
        require(exact_equal(matrix, substituted.get(tuple(-v for v in cell), sp.zeros(matrix.rows)).H),
                "Numerical substitutions violate hopping Hermiticity")
    out = []
    for cell, current in sorted(substituted.items()):
        converted = []
        for row in current.tolist():
            converted_row = []
            for item in row:
                value = complex(sp.N(item, 17))
                require(math.isfinite(value.real) and math.isfinite(value.imag), "Numerical substitution produced a nonfinite value")
                converted_row.append([value.real, value.imag])
            converted.append(converted_row)
        out.append({"cell": list(cell), "matrix": converted})
    return {"action": "bands", "hoppings": out, "convention": "periodic orbital gauge; H=sum_R t(R) exp(2*pi*I*k.R)"}


def k_vector(payload, parser):
    raw = payload.get("k", ["kx", "ky", "kz"])
    require(isinstance(raw, list) and len(raw) == 3, "k needs three coordinates")
    k = [parser.parse(v) for v in raw]
    require(all(zero(sp.im(v)) for v in k), "Momentum components must be real")
    return k


def bloch(payload, parser):
    hoppings = exact_hoppings(payload, parser)
    k = k_vector(payload, parser)
    result = {"action": "bloch", "k": [str(v) for v in k],
              "convention": "H_ij(k)=sum_R t_ij(R) exp(2*pi*I*k.R); periodic orbital gauge",
              **spectral_output(hamiltonian(hoppings, k), payload, parser)}
    numerical = numeric_export(hoppings, payload.get("numeric_substitutions"), parser)
    if numerical is not None: result["numerical_model"] = numerical
    return result


def model(payload, parser):
    lattice = parser.matrix(payload.get("lattice", sp.eye(3).tolist()), (3, 3))
    require(not zero(lattice.det()) and all(zero(sp.im(v)) for v in lattice), "Lattice must be a nonsingular real matrix of row vectors")
    parser.nonzero_domain(lattice.det())
    periodic = payload.get("periodic", [True, True, True])
    require(isinstance(periodic, list) and len(periodic) == 3 and all(isinstance(v, bool) for v in periodic), "periodic needs three booleans")
    operations, table = exact_operations(payload.get("operations", [{"rotation": sp.eye(3).tolist()}]), lattice, periodic, parser)
    sites, permutations, shifts = exact_sites(payload.get("sites", [{"position": [0, 0, 0], "orbitals": ["s"]}]), operations, parser, payload.get("expand_orbits", True), periodic)
    matrices, polynomials, factors = exact_representations(operations, sites, permutations, table, parser)
    records, shells, enumeration = exact_bonds(payload, lattice, sites, periodic, parser)
    basis, conditions = constrained_basis(records, sites, operations, permutations, shifts, matrices)
    offsets = [0]
    for site in sites: offsets.append(offsets[-1]+len(site["orbitals"]))
    parameters = payload.get("parameters")
    if parameters is None: parameters = {b["name"]: b["name"] for b in basis}
    if isinstance(parameters, list):
        require(len(parameters) == len(basis), "Parameter list length must equal parameter count")
        parameters = dict(zip((b["name"] for b in basis), parameters))
    require(isinstance(parameters, dict) and set(parameters) <= {b["name"] for b in basis}, "Unknown model parameter")
    hoppings, parameter_output = {}, []
    for b in basis:
        value = parser.parse(parameters.get(b["name"], b["name"]))
        require(zero(sp.im(value)), "Hopping parameters in the real constraint basis must be real")
        parameter_output.append({"name": b["name"], "value": str(value), "shell": b["shell"]})
        for term in b["terms"]:
            cell = tuple(term["cell"])
            if cell not in hoppings: hoppings[cell] = sp.zeros(offsets[-1])
            a, z = term["from_site"], term["to_site"]
            for i in range(term["matrix"].rows):
                for j in range(term["matrix"].cols): hoppings[cell][offsets[a]+i, offsets[z]+j] += value*term["matrix"][i, j]
    if not hoppings: hoppings[(0, 0, 0)] = sp.zeros(offsets[-1])
    hoppings = {cell: clean(matrix) for cell, matrix in hoppings.items()}
    # Independent verification of all resulting real-space covariance equations.
    for cell, matrix in hoppings.items():
        require(exact_equal(matrix, hoppings.get(tuple(-v for v in cell), sp.zeros(offsets[-1])).H), "Exact assembled Hermiticity check failed")
    for key in records:
        i, j, *cell = key
        source = hoppings.get(tuple(cell), sp.zeros(offsets[-1]))[offsets[i]:offsets[i+1], offsets[j]:offsets[j+1]]
        for gi, g in enumerate(operations):
            ni, nj = permutations[gi][i], permutations[gi][j]
            transformed_cell = tuple(map(int, g["rotation"]*sp.Matrix(cell)+shifts[gi][j]-shifts[gi][i]))
            target = hoppings.get(transformed_cell, sp.zeros(offsets[-1]))[offsets[ni]:offsets[ni+1], offsets[nj]:offsets[nj+1]]
            predicted = matrices[gi][i]*(source.conjugate() if g["antiunitary"] else source)*matrices[gi][j].H
            require(exact_equal(predicted, target), "Exact assembled symmetry covariance check failed")
    k = k_vector(payload, parser)
    result = {"action": "model", "parameter_count": len(basis), "parameters": parameter_output,
              "orbital_count": offsets[-1], "sites": [{"position": [str(v) for v in s["position"]], "orbitals": s["orbitals"]} for s in sites],
              "shells_squared": [str(v) for v in shells], "polynomial_basis": polynomials,
              "basis": [{**b, "terms": [{**t, "matrix": mat_json(t["matrix"])} for t in b["terms"]]} for b in basis],
              "hoppings": [{"cell": list(cell), "matrix": mat_json(matrix)} for cell, matrix in sorted(hoppings.items())],
              "k": [str(v) for v in k], "conditions": conditions,
              "diagnostics": {"arithmetic": "exact algebraic/rational-function field elimination", "nullspace_verified": True,
                  "hermiticity_verified": True, "covariance_verified": True, "representation_verified": True,
                  "operation_count": len(operations), "bond_count": len(records), "enumeration": enumeration},
              "projective_factors": factors, "convention": "H_ij(k)=sum_R t_ij(R) exp(2*pi*I*k.R); periodic orbital gauge",
              **spectral_output(hamiltonian(hoppings, k), payload, parser)}
    numerical = numeric_export(hoppings, payload.get("numeric_substitutions"), parser)
    if numerical is not None: result["numerical_model"] = numerical
    return result


def hermitian_basis(size):
    matrices = []
    for i in range(size):
        value = sp.zeros(size); value[i, i] = 1; matrices.append(value)
    for i in range(size):
        for j in range(i+1, size):
            value = sp.zeros(size); value[i, j] = value[j, i] = 1; matrices.append(value)
            value = sp.zeros(size); value[i, j] = -sp.I; value[j, i] = sp.I; matrices.append(value)
    return matrices


def kp(payload, parser):
    dimension = integer(payload.get("dimension", 3), 1, 3, "dimension")
    degree = integer(payload.get("degree", 2), 0, 4, "degree")
    raw = payload.get("operations")
    require(isinstance(raw, list) and 0 < len(raw) <= 48, "Supply 1–48 k.p symmetry generators")
    operations, size = [], None
    for item in raw:
        rotation = parser.matrix(item.get("rotation"), (dimension, dimension))
        require(exact_equal(rotation.T*rotation, sp.eye(dimension)), "k.p rotations must be exactly orthogonal Cartesian matrices")
        representation = parser.matrix(item.get("representation"), limit=6)
        if size is None: size = representation.rows
        require(representation.shape == (size, size) and exact_equal(representation.H*representation, sp.eye(size)), "k.p representation matrices must be unitary and share one dimension")
        operations.append((rotation, representation, bool(item.get("antiunitary", False))))
    momenta = [parser.symbol(v) for v in ("kx", "ky", "kz")[:dimension]]
    require(all(v.is_real for v in momenta), "k.p momentum symbols must be real")
    powers = [p for p in itertools.product(range(degree+1), repeat=dimension) if sum(p) <= degree]
    powers.sort(key=lambda p: (sum(p), p))
    monomials = [sp.prod(k**n for k, n in zip(momenta, p)) for p in powers]
    matrices = hermitian_basis(size)
    width = len(monomials)*len(matrices)
    require(width <= 256, "k.p exact constraint limit: 256 coefficients; reduce degree/dimension/band count")
    seeds = [m*monomial for monomial in monomials for m in matrices]
    columns = []
    for seed in seeds:
        column = []
        for rotation, rep, anti in operations:
            transformed_k = (-1 if anti else 1)*rotation*sp.Matrix(momenta)
            difference = (seed.subs(dict(zip(momenta, transformed_k)), simultaneous=True)
                          - rep*(seed.conjugate() if anti else seed)*rep.H)
            for entry in difference:
                coefficients = sp.Poly(sp.expand(entry), *momenta)
                for p in powers:
                    c = coefficients.coeff_monomial(p)
                    column.extend((simp(sp.re(c)), simp(sp.im(c))))
        columns.append(sp.Matrix(column))
    system = sp.Matrix.hstack(*columns)
    unique = list(dict.fromkeys(tuple(row) for row in system.tolist() if any(v != 0 for v in row)))
    system = sp.Matrix(unique) if unique else sp.zeros(0, width)
    kernel = exact_kernel(system, width)
    require(kernel.cols <= 128, "k.p parameter count exceeds 128")
    basis = [clean(sum((seeds[i]*kernel[i, j] for i in range(width)), sp.zeros(size))) for j in range(kernel.cols)]
    names = [parser.symbol(f"c{i+1}") for i in range(len(basis))]
    require(all(c.is_real for c in names), "Generated k.p coefficients c1, c2, ... must have real assumptions")
    result_h = clean(sum((c*h for c, h in zip(names, basis)), sp.zeros(size)))
    require(exact_equal(result_h.H, result_h), "Exact k.p Hamiltonian is not Hermitian")
    for rotation, rep, anti in operations:
        transformed_k = (-1 if anti else 1)*rotation*sp.Matrix(momenta)
        require(exact_equal(result_h.subs(dict(zip(momenta, transformed_k)), simultaneous=True),
                            rep*(result_h.conjugate() if anti else result_h)*rep.H), "Exact k.p covariance verification failed")
    return {"action": "kp", "dimension": dimension, "degree": degree, "parameter_count": len(basis),
            "parameters": [str(c) for c in names], "basis": [display(b) for b in basis],
            "conditions": rank_conditions(system), "verified": True,
            "convention": "H(s R k) = U H(k)^(*) U†; s=-1 and conjugation for antiunitary generators, s=+1 otherwise. k is Cartesian displacement from a symmetry-fixed expansion point.",
            **spectral_output(result_h, payload, parser)}


def run(payload):
    require(isinstance(payload, dict), "Symbolic request must be a JSON object")
    parser = ExactParser(payload.get("assumptions"))
    action = payload.get("action", "algebra")
    functions = {"algebra": algebra, "cyclotomic": cyclotomic, "orbitals": orbitals,
                 "model": model, "bloch": bloch, "kp": kp}
    require(action in functions, "Unknown symbolic action")
    result = functions[action](payload, parser)
    result["engine"] = "SymPy exact Python"
    result["version"] = "1.0"
    result["conditions"] = result.get("conditions", [])+parser.domain_conditions()
    result["domain_note"] = "Results hold on the original input domain and under the reported symbol assumptions; cancellations do not fill excluded poles."
    result.setdefault("assumptions", {name: parser.assumptions.get(name, "real") for name in parser.symbols})
    return result
