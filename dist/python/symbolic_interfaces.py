"""Exact, stateless symbolic interfaces for supplied finite representations.

GPL-3.0-only. CPython/Pyodide share this file. No executable input, numerical
reconstruction, hidden catalog lookup, or automatic claims of upstream parity.
Group indices are zero based; matrices act on columns. Antiunitary matrices
denote U K. Cyclotomic kernels are columns, unlike Mathematica's row convention.
"""
from __future__ import annotations

import itertools
import math
import sympy as sp

from symbolic_core import (ExactParser, CyclotomicField, require, integer, simp,
    clean, zero, exact_equal, exact_kernel, rank_conditions, mat_json, display)


def _matrices(raw, parser, limit=16, count=96):
    require(isinstance(raw, list) and 0 < len(raw) <= count, "Expected a nonempty bounded list of matrices")
    result = [parser.matrix(m, limit=limit) for m in raw]
    require(sum(m.rows*m.cols for m in result) <= 8192, "Matrix input has more than 8192 entries")
    return result


def _stack(matrices):
    require(len({m.cols for m in matrices}) == 1, "Constraint matrices must have equal column counts")
    return sp.Matrix.vstack(*matrices)


def _constructed_domains(parser, matrices):
    for matrix in matrices:
        for value in matrix:
            parser.nonzero_domain(sp.denom(sp.cancel(value)))


def _field_kernel(matrix, field):
    rref, pivots = field.rref(matrix)
    free = [j for j in range(matrix.cols) if j not in pivots]
    kernel = sp.zeros(matrix.cols, len(free))
    for j, free_col in enumerate(free):
        kernel[free_col, j] = 1
        for i, pivot in enumerate(pivots):
            kernel[pivot, j] = field.reduce(-rref[i, free_col])
    require(all(field.reduce(v) == 0 for v in matrix*kernel), "Cyclotomic kernel certificate failed")
    return kernel, rref, pivots


def _radical_data(value):
    """Positive rational square root via the positive quadratic Gauss sum."""
    require(value.is_Rational and value > 0, "Only square roots of rational constants can be compiled automatically")
    combined = int(value.p*value.q)
    require(combined <= 10**8, "Radical radicand numerator times denominator exceeds 100000000")
    outside, squarefree = 1, 1
    for prime, power in sp.factorint(combined).items():
        outside *= int(prime)**(int(power)//2)
        if power % 2:
            squarefree *= int(prime)
    if squarefree == 1:
        return 1, sp.Rational(outside, value.q), []
    discriminant = squarefree if squarefree % 4 == 1 else 4*squarefree
    require(discriminant <= 240, "Quadratic conductor exceeds browser bound 240")
    scale = sp.Rational(outside, value.q*(1 if discriminant == squarefree else 2))
    terms = [(a, int(sp.kronecker_symbol(discriminant, a))) for a in range(discriminant)]
    return discriminant, scale, [(a, c) for a, c in terms if c]


def _conductor(value, explicit_order=None):
    if value.is_Rational:
        return 1
    if value == sp.I:
        return 4
    if value.is_Symbol and str(value) == "z":
        require(explicit_order is not None, "Expressions using z require an explicit cyclotomic order")
        return explicit_order
    if value.func in (sp.Add, sp.Mul):
        return math.lcm(*[_conductor(v, explicit_order) for v in value.args])
    if value.func == sp.Pow:
        base, exponent = value.args
        if exponent.is_Integer:
            return _conductor(base, explicit_order)
        if exponent.is_Rational and exponent.q == 2 and base.is_Rational:
            return math.lcm(_radical_data(abs(base))[0], 4 if base < 0 else 1)
    if value.func == sp.exp:
        angle = sp.cancel(value.args[0]/(2*sp.pi*sp.I))
        require(angle.is_Rational, "Only rational-angle roots of unity can be compiled")
        return int(angle.q)
    if value.func in (sp.sin, sp.cos):
        angle = sp.cancel(value.args[0]/(2*sp.pi))
        require(angle.is_Rational, "Only rational multiples of pi can be compiled")
        return math.lcm(int(angle.q), 4 if value.func == sp.sin else 1)
    if value.func == sp.conjugate:
        return _conductor(value.args[0], explicit_order)
    raise ValueError("Cyclotomic compilation accepts rational constants, rational radicals, roots of unity, and their arithmetic; symbolic parameters are not cyclotomic constants")


def _compile_value(value, field):
    z, n = field.z, field.order
    if value.is_Rational:
        return value
    if value == sp.I:
        require(n % 4 == 0, "Common conductor does not contain I")
        return z**(n//4)
    if value.is_Symbol and str(value) == "z":
        return z
    if value.func == sp.Add:
        return field.reduce(sum(_compile_value(v, field) for v in value.args))
    if value.func == sp.Mul:
        return field.reduce(sp.prod(_compile_value(v, field) for v in value.args))
    if value.func == sp.Pow:
        base, exponent = value.args
        if exponent.is_Integer:
            return field.reduce(_compile_value(base, field)**exponent)
        if exponent.is_Rational and exponent.q == 2 and base.is_Rational:
            conductor, scale, terms = _radical_data(abs(base))
            require(n % conductor == 0, "Incompatible quadratic conductor")
            root = scale*sum(c*z**(a*(n//conductor)) for a, c in terms) if terms else scale
            if base < 0:
                root *= z**(n//4)
            return field.reduce(base**(exponent-sp.Rational(1, 2))*root)
    if value.func == sp.exp:
        angle = sp.cancel(value.args[0]/(2*sp.pi*sp.I))
        return field.reduce(z**(int(angle*n) % n))
    if value.func in (sp.cos, sp.sin):
        angle = sp.cancel(value.args[0]/(2*sp.pi))
        power = int(angle*n) % n
        a, b = z**power, z**((-power) % n)
        return field.reduce((a+b)/2 if value.func == sp.cos else (a-b)/(2*z**(n//4)))
    if value.func == sp.conjugate:
        return field.conjugate(_compile_value(value.args[0], field))
    raise ValueError("Unsupported cyclotomic expression")


def _compile_blocks(payload, parser):
    explicit = integer(payload["order"], 1, 240, "order") if "order" in payload else None
    if explicit is not None:
        parser.assumptions["z"] = "complex"
        parser.symbols.pop("z", None)
    raw = payload.get("matrices", [payload["matrix"]] if "matrix" in payload else None)
    matrices = _matrices(raw, parser, limit=24, count=32)
    conductors = [_conductor(value, explicit) for matrix in matrices for value in matrix]
    conductors += [_conductor(value, explicit) for value in parser.domain_terms]
    order = math.lcm(explicit or 1, *conductors)
    require(order <= 240, "Common cyclotomic conductor exceeds 240")
    field = CyclotomicField(order, parser)
    require(field.degree <= 64, "Common cyclotomic field degree exceeds 64")
    # z already denotes the explicit root, so lift it before changing conductor.
    old_z = next((s for matrix in matrices for s in matrix.free_symbols if str(s) == "z"), None)
    lift = lambda v: v.subs(old_z, field.z**(order//explicit)) if old_z is not None and explicit else v
    result = [m.applyfunc(lambda v: _compile_value(lift(v), field)) for m in matrices]
    for domain in parser.domain_terms:
        require(_compile_value(lift(domain), field) != 0, "Input lies outside its original cyclotomic domain, even after cancellation")
    return result, field


def compile_cyclotomic(payload, parser):
    matrices, field = _compile_blocks(payload, parser)
    coefficients = [[[[str(sp.Poly(v, field.z).nth(i)) for i in range(field.degree)]
                       for v in row] for row in m.tolist()] for m in matrices]
    return {"action": "compile_cyclotomic", "order": field.order, "degree": field.degree,
            "minimal_polynomial": str(field.phi.as_expr()), "matrices": [mat_json(m) for m in matrices],
            "coefficient_tensors": coefficients, "coefficient_order": "ascending powers of z",
            "embedding": f"z = exp(2*pi*I/{field.order})", "verified": True,
            "certificate": "Exact rational arithmetic and positive quadratic Gauss sums embed every input in one polynomial quotient; no floating-point identification.",
            **display(matrices[0])}


def common_kernel(payload, parser):
    if payload.get("cyclotomic", False) or "order" in payload:
        matrices, field = _compile_blocks(payload, parser)
        system = _stack(matrices)
        kernel, rref, pivots = _field_kernel(system, field)
        extra = {"order": field.order, "degree": field.degree, "minimal_polynomial": str(field.phi.as_expr()),
                 "scalar_field": f"Q[z]/Phi_{field.order}(z)", "conditions": []}
        block_ranks = [len(field.rref(m)[1]) for m in matrices]
    else:
        matrices = _matrices(payload.get("matrices"), parser, limit=32, count=32)
        system = _stack(matrices)
        require(system.rows*system.cols <= 8192, "Common-kernel system exceeds 8192 entries")
        kernel = exact_kernel(system)
        rref, pivots = system.rref(simplify=simp, iszerofunc=zero)
        block_ranks = [m.cols-exact_kernel(m).cols for m in matrices]
        extra = {"scalar_field": "exact algebraic/rational-function field", "conditions": rank_conditions(system)}
        _constructed_domains(parser, [kernel, rref])
    return {"action": "common_kernel", "block_count": len(matrices), "block_ranks": block_ranks,
            "rank": len(pivots), "nullity": kernel.cols, "kernel": mat_json(kernel),
            "kernel_rows": mat_json(kernel.T), "rref": mat_json(rref), "pivot_columns": list(pivots),
            "verified": True, "certificate": "Every original block annihilates the returned full column basis; rank follows exact RREF of the vertically stacked system.",
            **extra, **display(kernel)}


def _group(payload, parser):
    table = payload.get("table")
    require(isinstance(table, list) and 1 <= len(table) <= 64, "Supply a multiplication table of order 1..64")
    n = len(table)
    require(all(isinstance(row, list) and len(row) == n for row in table), "Multiplication table must be square")
    table = [[integer(v, 0, n-1, "group index") for v in row] for row in table]
    all_indices = set(range(n))
    require(all(set(row) == all_indices for row in table) and all({table[i][j] for i in range(n)} == all_indices for j in range(n)), "Multiplication table is not Latin")
    identity = next((i for i in range(n) if table[i] == list(range(n)) and all(table[j][i] == j for j in range(n))), None)
    require(identity is not None, "Group table has no two-sided identity")
    require(all(table[table[i][j]][k] == table[i][table[j][k]] for i in range(n) for j in range(n) for k in range(n)), "Multiplication table is not associative")
    anti = payload.get("antiunitary", [False]*n)
    require(isinstance(anti, list) and len(anti) == n and all(isinstance(a, bool) for a in anti), "antiunitary must contain one Boolean per group element")
    require(all(anti[table[i][j]] == (anti[i] != anti[j]) for i in range(n) for j in range(n)), "Antiunitary parity is not a group homomorphism")
    factor = parser.matrix(payload["factor_system"], shape=(n, n), limit=64) if "factor_system" in payload else sp.ones(n)
    require(all(zero(factor[identity, i]-1) and zero(factor[i, identity]-1) for i in range(n)), "Factor system must be normalized at the identity")
    require(all(zero(v*sp.conjugate(v)-1) for v in factor), "Projective factors must have exact unit modulus")
    if "factor_system" in payload:
        require(n <= 32, "Projective cocycle validation is limited to order 32")
        require(all(zero(factor[i, j]*factor[table[i][j], k] - (sp.conjugate(factor[j, k]) if anti[i] else factor[j, k])*factor[i, table[j][k]])
                    for i in range(n) for j in range(n) for k in range(n)), "Factor system fails the semilinear cocycle equation")
    inverses = [next(j for j in range(n) if table[i][j] == identity) for i in range(n)]
    return {"table": table, "anti": anti, "factor": factor, "identity": identity, "inverse": inverses, "order": n}


def _representation(raw, group, parser, label="representation", indices=None):
    indices = list(range(group["order"])) if indices is None else list(indices)
    matrices = _matrices(raw, parser, limit=8, count=64)
    require(len(matrices) == len(indices), f"{label}: one matrix per supplied group index is required")
    size = matrices[0].rows
    require(all(m.shape == (size, size) for m in matrices), f"{label}: matrices must be square with equal size")
    reps = dict(zip(indices, matrices))
    require(group["identity"] in reps and exact_equal(reps[group["identity"]], sp.eye(size)), f"{label}: identity matrix is invalid")
    require(all(group["table"][i][j] in reps for i in indices for j in indices), "Supplied subgroup is not closed")
    for i in indices:
        for j in indices:
            rhs = group["factor"][i, j]*reps[group["table"][i][j]]
            lhs = reps[i]*(reps[j].conjugate() if group["anti"][i] else reps[j])
            require(exact_equal(lhs, rhs), f"{label}: exact (semi)linear group law fails for indices ({i},{j})")
    return reps


def _characters(reps):
    return {i: simp(m.trace()) for i, m in reps.items()}


def _inner(a, b, indices):
    return simp(sum(sp.conjugate(a[i])*b[i] for i in indices)/len(indices))


def representation(payload, parser):
    group = _group(payload, parser)
    reps = _representation(payload.get("matrices"), group, parser)
    indices = [i for i in reps if not group["anti"][i]]
    chars = _characters(reps)
    norm = _inner(chars, chars, indices)
    metric = clean(sum((m.conjugate().T*m for m in reps.values()), sp.zeros(reps[group["identity"]].rows))/len(reps))
    # This metric is guaranteed invariant for linear groups; antiunitary metric
    # averaging requires conjugating the g-anti term.
    metric = clean(sum(((m.conjugate().T*m).conjugate() if group["anti"][i] else m.conjugate().T*m
                        for i, m in reps.items()), sp.zeros(metric.rows))/len(reps))
    require(all(exact_equal(m.conjugate().T*metric*m, metric.conjugate() if group["anti"][i] else metric) for i, m in reps.items()), "Invariant metric certificate failed")
    return {"action": "representation", "order": group["order"], "dimension": metric.rows,
            "unitary_subgroup_order": len(indices), "unitary_characters": [{"index": i, "character": str(chars[i])} for i in indices],
            "restriction_character_norm": str(norm), "irreducible_unitary_restriction": norm == 1,
            "unitary_matrices": all(exact_equal(m.conjugate().T*m, sp.eye(m.rows)) for m in reps.values()),
            "invariant_metric": mat_json(metric), "verified": True,
            "certificate": "Identity, every product, projective cocycle, antiunitary parity, and averaged invariant Hermitian metric verified exactly. Antiunitary traces are deliberately not called characters.",
            **display(metric)}


def _intertwiner_basis(left, right, anti):
    rows, cols = left[0].rows, right[0].rows
    require(rows*cols <= 64, "Intertwiner has more than 64 unknown entries")
    anti_present = any(anti)
    units = [sp.Matrix(rows, cols, lambda a, b: int(a == i and b == j)) for i in range(rows) for j in range(cols)]
    if anti_present:
        units += [sp.I*u for u in list(units)]
    columns = []
    for unit in units:
        values = [v for l, r, a in zip(left, right, anti) for v in l*(unit.conjugate() if a else unit)-unit*r]
        if anti_present:
            values = [simp(sp.re(v)) for v in values]+[simp(sp.im(v)) for v in values]
        columns.append(sp.Matrix(values))
    system = sp.Matrix.hstack(*columns)
    require(system.rows*system.cols <= 262144, "Intertwiner constraint system exceeds browser limit")
    kernel = exact_kernel(system)
    basis = [clean(sum((units[j]*kernel[j, k] for j in range(len(units))), sp.zeros(rows, cols))) for k in range(kernel.cols)]
    for matrix in basis:
        require(all(exact_equal(l*(matrix.conjugate() if a else matrix), matrix*r) for l, r, a in zip(left, right, anti)), "Intertwiner certificate failed")
    return basis, system, "real" if anti_present else "complex"


def intertwiner(payload, parser):
    left = _matrices(payload.get("left"), parser, limit=8, count=64)
    right = _matrices(payload.get("right"), parser, limit=8, count=64)
    require(len(left) == len(right), "Left and right representation lists must have equal length")
    require(all(m.rows == m.cols == left[0].rows for m in left) and all(m.rows == m.cols == right[0].rows for m in right), "Representations must have uniform square matrices")
    anti = payload.get("antiunitary", [False]*len(left))
    require(len(anti) == len(left) and all(isinstance(a, bool) for a in anti), "Invalid antiunitary flags")
    if "table" in payload:
        group = _group(payload, parser)
        _representation(payload["left"], group, parser, "left")
        _representation(payload["right"], group, parser, "right")
    basis, system, field = _intertwiner_basis(left, right, anti)
    _constructed_domains(parser, basis)
    witness = None
    if left[0].rows == right[0].rows and basis:
        candidates = basis+[sum(basis, sp.zeros(left[0].rows))]
        attempts = integer(payload.get("max_attempts", 64), 1, 512, "max_attempts")
        for weights in itertools.islice(itertools.product((-1, 0, 1), repeat=min(len(basis), 8)), attempts):
            candidates.append(sum((w*b for w, b in zip(weights, basis)), sp.zeros(left[0].rows)))
        witness = next((m for m in candidates if not zero(m.det())), None)
    conditions = rank_conditions(system)
    if witness is not None and witness.det().free_symbols:
        conditions.append({"kind": "invertible_intertwiner", "condition": f"{sp.factor(witness.det())} != 0"})
    result = {"action": "intertwiner", "dimension": len(basis), "scalar_field": field,
              "basis": [mat_json(m) for m in basis], "verified": True, "conditions": conditions,
              "equation": "L(g) conjugate^anti(X) = X R(g)",
              "equivalence": "proved" if witness is not None else "inequivalent" if not basis or left[0].rows != right[0].rows else "inconclusive",
              "certificate": "Full exact linear nullspace (real-linear when antiunitary). An invertible witness proves equivalence; unsuccessful bounded witness search never proves inequivalence."}
    if witness is not None:
        result.update({"witness": mat_json(witness), "determinant": str(simp(witness.det())), **display(witness)})
    elif basis:
        result.update(display(basis[0]))
    return result


def _ordinary(group):
    require(not any(group["anti"]), "This action requires a unitary group; use its unitary subgroup for characters")


def projector(payload, parser):
    group = _group(payload, parser)
    _ordinary(group)
    reps = _representation(payload.get("matrices"), group, parser)
    target = _representation(payload.get("irrep"), group, parser, "irrep")
    chars, tchars = _characters(reps), _characters(target)
    require(_inner(tchars, tchars, list(reps)) == 1, "Target is not an irreducible representation")
    require(all(exact_equal(m.conjugate().T*m, sp.eye(m.rows)) for m in target.values()), "Matrix-unit construction needs a unitary irrep basis")
    d, size, n = target[group["identity"]].rows, reps[group["identity"]].rows, group["order"]
    multiplicity = _inner(tchars, chars, list(reps))
    require(multiplicity.is_Integer and multiplicity >= 0, "Character multiplicity is not a nonnegative integer")
    result = clean(sum((sp.conjugate(tchars[i])*reps[i] for i in reps), sp.zeros(size))*sp.Rational(d, n))
    require(exact_equal(result*result, result) and all(exact_equal(result*m, m*result) for m in reps.values()), "Isotypic projector certificate failed")
    require(result.rank() == d*multiplicity, "Projector rank disagrees with character multiplicity")
    units = []
    for a in range(d):
        row = []
        for b in range(d):
            row.append(clean(sum((sp.conjugate(target[i][a, b])*reps[i] for i in reps), sp.zeros(size))*sp.Rational(d, n)))
        units.append(row)
    require(all(exact_equal(units[a][b]*units[c][e], units[a][e] if b == c else sp.zeros(size))
                for a in range(d) for b in range(d) for c in range(d) for e in range(d)), "Matrix-unit multiplication certificate failed")
    return {"action": "projector", "irrep_dimension": d, "multiplicity": int(multiplicity), "rank": int(d*multiplicity),
            "matrix_units": [[mat_json(m) for m in row] for row in units], "verified": True,
            "certificate": "Character orthogonality, isotypic idempotence/commutation, exact rank, and all matrix-unit multiplication laws verified.", **display(result)}


def character_decompose(payload, parser):
    group = _group(payload, parser)
    _ordinary(group)
    sources = payload.get("tensor_factors")
    if sources is not None:
        require(isinstance(sources, list) and 1 <= len(sources) <= 4, "Supply 1..4 tensor factors")
        require(all(zero(v-1) for v in group["factor"]), "Tensor-factor decomposition currently requires an ordinary factor system")
        factors = [_representation(raw, group, parser) for raw in sources]
        require(math.prod(f[group["identity"]].rows for f in factors) <= 64, "Tensor representation dimension exceeds 64")
        reps = {i: sp.kronecker_product(*(f[i] for f in factors)) for i in range(group["order"])}
    else:
        reps = _representation(payload.get("matrices"), group, parser)
    raw_irreps = payload.get("irreps")
    require(isinstance(raw_irreps, list) and 1 <= len(raw_irreps) <= 64, "Supply a nonempty list of irreps")
    irreps = [_representation(raw, group, parser, f"irrep {i}") for i, raw in enumerate(raw_irreps)]
    chars = [_characters(r) for r in irreps]
    indices = list(reps)
    require(all(_inner(a, b, indices) == int(i == j) for i, a in enumerate(chars) for j, b in enumerate(chars)), "Supplied irreps are not distinct orthonormal irreducible characters")
    source_chars = _characters(reps)
    multiplicities = [_inner(c, source_chars, indices) for c in chars]
    require(all(m.is_Integer and m >= 0 for m in multiplicities), "Decomposition has invalid character multiplicities")
    dimensions = [r[group["identity"]].rows for r in irreps]
    covered = sum(d*m for d, m in zip(dimensions, multiplicities))
    full_dim = reps[group["identity"]].rows
    return {"action": "character_decompose", "dimension": full_dim, "covered_dimension": int(covered),
            "multiplicities": [int(m) for m in multiplicities], "irrep_dimensions": dimensions,
            "source_characters": [str(source_chars[i]) for i in indices],
            "complete_decomposition": covered == full_dim, "complete_irrep_list": sum(d*d for d in dimensions) == group["order"],
            "verified": True, "certificate": "Exact group laws and pairwise character orthogonality checked before taking character inner products. Completeness is certified by dimension, not assumed from the supplied list."}


def _induce(group, subgroup, reps):
    table, n = group["table"], group["order"]
    remaining, cosets, transversals = set(range(n)), [], []
    while remaining:
        t = group["identity"] if group["identity"] in remaining else min(remaining)
        coset = {table[t][h] for h in subgroup}
        require(coset <= remaining, "Subgroup cosets overlap")
        remaining -= coset
        cosets.append(coset)
        transversals.append(t)
    size = reps[group["identity"]].rows
    require(size*len(cosets) <= 24, "Induced representation dimension exceeds 24")
    result = {}
    for g in range(n):
        matrix = sp.zeros(size*len(cosets))
        for j, t in enumerate(transversals):
            gt = table[g][t]
            i = next(i for i, c in enumerate(cosets) if gt in c)
            ti = transversals[i]
            h = table[group["inverse"][ti]][gt]
            block = reps[h].conjugate() if group["anti"][ti] else reps[h]
            block = clean(block*group["factor"][g, t]/group["factor"][ti, h])
            matrix[i*size:(i+1)*size, j*size:(j+1)*size] = block
        result[g] = matrix
    for g in range(n):
        for h in range(n):
            require(exact_equal(result[g]*(result[h].conjugate() if group["anti"][g] else result[h]), group["factor"][g, h]*result[table[g][h]]), "Induced representation group-law certificate failed")
    return result, transversals


def induce(payload, parser):
    group = _group(payload, parser)
    subgroup = payload.get("subgroup")
    require(isinstance(subgroup, list) and len(set(subgroup)) == len(subgroup), "Supply distinct zero-based subgroup indices")
    subgroup = [integer(i, 0, group["order"]-1, "subgroup index") for i in subgroup]
    require(all(not group["anti"][i] for i in subgroup), "Induction source must be a unitary subgroup")
    reps = _representation(payload.get("matrices"), group, parser, "subgroup representation", subgroup)
    result, transversal = _induce(group, subgroup, reps)
    return {"action": "induce", "dimension": result[group["identity"]].rows,
            "index": len(transversal), "coset_representatives": transversal,
            "matrices": [mat_json(result[i]) for i in range(group["order"])],
            "antiunitary": group["anti"], "verified": True,
            "certificate": "Left-coset block induction with exact projective and antiunitary factors; every product of the resulting representation verified.",
            **display(result[next((i for i in range(group["order"]) if i != group["identity"]), group["identity"])])}


def wigner(payload, parser):
    group = _group(payload, parser)
    unitary = [i for i in range(group["order"]) if not group["anti"][i]]
    anti = [i for i in range(group["order"]) if group["anti"][i]]
    require(anti and len(anti) == len(unitary), "Wigner construction requires an index-two unitary subgroup")
    reps = _representation(payload.get("matrices"), group, parser, "unitary-subgroup irrep", unitary)
    chars = _characters(reps)
    require(_inner(chars, chars, unitary) == 1, "Wigner input must be an irreducible unitary-subgroup representation")
    indicator = simp(sum(group["factor"][a, a]*chars[group["table"][a][a]] for a in anti)/len(unitary))
    require(indicator in (-1, 0, 1), "Herring indicator is not -1, 0, or +1")
    kind = {1: "a", -1: "b", 0: "c"}[indicator]
    d = reps[group["identity"]].rows
    a = anti[0]
    if indicator == 1:
        left, right = [], []
        for h in unitary:
            hp = group["table"][group["table"][a][h]][group["inverse"][a]]
            left.append(clean(group["factor"][a, h]*reps[hp]/group["factor"][hp, a]))
            right.append(reps[h].conjugate())
        basis, _, _ = _intertwiner_basis(left, right, [False]*len(left))
        require(len(basis) == 1, "Type-a conjugate intertwiner is not one-dimensional")
        matrix = basis[0]
        square = group["factor"][a, a]*reps[group["table"][a][a]]
        ratio_matrix = clean(matrix*matrix.conjugate()*square.inv())
        ratio = simp(ratio_matrix[0, 0])
        require(exact_equal(ratio_matrix, ratio*sp.eye(d)) and ratio.is_positive is True, "Type-a normalization is not provably positive; specialize symbolic parameters")
        matrix = clean(matrix/sp.sqrt(ratio))
        parser.nonzero_domain(ratio)
        _constructed_domains(parser, [matrix])
        result = dict(reps)
        for h in unitary:
            result[group["table"][a][h]] = clean(matrix*reps[h].conjugate()/group["factor"][a, h])
    else:
        result, _ = _induce(group, unitary, reps)
    for g in range(group["order"]):
        for h in range(group["order"]):
            require(exact_equal(result[g]*(result[h].conjugate() if group["anti"][g] else result[h]), group["factor"][g, h]*result[group["table"][g][h]]), "Constructed corepresentation group-law certificate failed")
    return {"action": "wigner", "indicator": int(indicator), "wigner_type": kind,
            "unitary_irrep_dimension": d, "corep_dimension": result[group["identity"]].rows,
            "unitary_subgroup": unitary, "antiunitary": group["anti"], "antiunitary_representative": a,
            "matrices": [mat_json(result[i]) for i in range(group["order"])],
            "verified": True, "certificate": "Exact projective Herring indicator, character irreducibility, and every semilinear product of the constructed Wigner corepresentation verified.",
            **display(result[a])}


def symmetrize(payload, parser):
    group = _group(payload, parser)
    reps = _representation(payload.get("matrices"), group, parser)
    size = reps[group["identity"]].rows
    require(all(exact_equal(m.conjugate().T*m, sp.eye(size)) for m in reps.values()), "Symmetrization requires a unitary matrix basis")
    matrix = parser.matrix(payload.get("matrix"), shape=(size, size), limit=8)
    transform = lambda h, i: reps[i]*(h.conjugate() if group["anti"][i] else h)*reps[i].conjugate().T
    result = clean(sum((transform(matrix, i) for i in reps), sp.zeros(size))/group["order"])
    require(all(exact_equal(transform(result, i), result) for i in reps), "Reynolds projection invariance failed")
    return {"action": "symmetrize", "hermitian_input": exact_equal(matrix, matrix.conjugate().T),
            "hermitian_output": exact_equal(result, result.conjugate().T), "verified": True,
            "certificate": "Finite semilinear Reynolds average at a fixed momentum; invariance under every group element is verified exactly.", **display(result)}


def _vector(raw, parser, dimension, label):
    require(isinstance(raw, list) and len(raw) == dimension, f"{label} must have length {dimension}")
    return sp.Matrix([parser.parse(v) for v in raw])


def seitz(payload, parser):
    raw = payload.get("operations")
    require(isinstance(raw, list) and 1 <= len(raw) <= 96, "Supply 1..96 Seitz operations")
    operations = []
    dim = None
    for op in raw:
        require(isinstance(op, dict), "Seitz operation must be an object")
        rotation = parser.matrix(op.get("rotation"), limit=6)
        dim = rotation.rows if dim is None else dim
        require(rotation.shape == (dim, dim) and not zero(rotation.det()), "Seitz rotations must be nonsingular and equally sized")
        parser.nonzero_domain(rotation.det())
        translation = _vector(op.get("translation", [0]*dim), parser, dim, "translation")
        anti = op.get("antiunitary", False)
        require(isinstance(anti, bool), "antiunitary must be Boolean")
        operations.append((rotation, translation, anti))
    def multiply(a, b):
        return clean(a[0]*b[0]), clean(a[1]+a[0]*b[1]), a[2] != b[2]
    operation = payload.get("operation", "multiply")
    if operation == "multiply":
        result = (sp.eye(dim), sp.zeros(dim, 1), False)
        for op in operations:
            result = multiply(result, op)
    else:
        require(len(operations) == 1, "Inverse or power takes one operation")
        base = operations[0]
        exponent = -1 if operation == "inverse" else integer(payload.get("exponent", 1), -128, 128, "exponent")
        require(operation in ("inverse", "power"), "Unknown Seitz operation")
        if exponent < 0:
            inv = clean(base[0].inv())
            base, exponent = (inv, clean(-inv*base[1]), base[2]), -exponent
        result = (sp.eye(dim), sp.zeros(dim, 1), False)
        for _ in range(exponent):
            result = multiply(result, base)
    homogeneous = sp.eye(dim+1)
    homogeneous[:dim, :dim], homogeneous[:dim, dim] = result[0], result[1]
    response = {"action": "seitz", "operation": operation, "rotation": mat_json(result[0]),
                "translation": [str(simp(v)) for v in result[1]], "antiunitary": result[2],
                "verified": True, "certificate": "Exact affine composition on columns; translations are never silently reduced modulo the lattice.", **display(homogeneous)}
    if "k" in payload:
        k = _vector(payload["k"], parser, dim, "k")
        require(all(v.is_real is True for v in k), "Momentum components must be real")
        phase = simp(sp.exp(-2*sp.pi*sp.I*(k.dot(result[1]))))
        response["translation_phase"] = display(phase)
        response["phase_convention"] = "exp(-2*pi*I*k.t); fractional reciprocal coordinates"
    return response


def gauge(payload, parser):
    matrix = parser.matrix(payload.get("matrix"), limit=16)
    require(matrix.rows == matrix.cols, "Hamiltonian must be square")
    centers = payload.get("centers")
    require(isinstance(centers, list) and len(centers) == matrix.rows, "Supply one fractional center per orbital")
    dim = len(centers[0])
    require(1 <= dim <= 6, "Center dimension must be 1..6")
    centers = [_vector(c, parser, dim, "center") for c in centers]
    k = _vector(payload.get("k", [f"k{i+1}" for i in range(dim)]), parser, dim, "k")
    require(all(v.is_real is True for c in centers for v in c) and all(v.is_real is True for v in k), "Orbital centers and momentum must be real")
    direction = payload.get("direction", "periodic_to_atomic")
    require(direction in ("periodic_to_atomic", "atomic_to_periodic"), "Unknown gauge direction")
    sign = 1 if direction == "periodic_to_atomic" else -1
    u = sp.diag(*(sp.exp(sign*2*sp.pi*sp.I*k.dot(c)) for c in centers))
    result = clean(u.conjugate().T*matrix*u)
    require(exact_equal(u*u.conjugate().T, sp.eye(matrix.rows)), "Gauge matrix is not unitary")
    require(exact_equal(u*result*u.conjugate().T, matrix), "Gauge round-trip certificate failed")
    return {"action": "gauge", "direction": direction, "gauge_matrix": mat_json(u),
            "verified": True, "convention": "H_periodic,ij = sum_R t_ij(R) exp(+2*pi*I*k.R); H_atomic,ij = sum_R t_ij(R) exp(+2*pi*I*k.(R+tau_j-tau_i))",
            "certificate": "H_new = U† H_old U with U_aa = exp(+2*pi*I*k.tau_a) for periodic_to_atomic; exact unitary round trip verified. The sign follows this website's positive Bloch Fourier convention.", **display(result)}


def representation_element(payload, parser):
    matrix = parser.matrix(payload.get("matrix"), limit=24)
    require(matrix.rows == matrix.cols, "Representation matrix must be square")
    translation = payload.get("translation")
    require(isinstance(translation, list) and 1 <= len(translation) <= 6, "Supply a lattice translation of dimension 1..6")
    dim = len(translation)
    t = _vector(translation, parser, dim, "translation")
    require(all(v.is_integer is True for v in t), "Representation-element translation must be an integer lattice vector")
    momenta = payload.get("row_momenta")
    if momenta is None:
        momenta = [payload.get("k")]*matrix.rows
    require(isinstance(momenta, list) and len(momenta) == matrix.rows, "row_momenta must give one reciprocal momentum per representation row")
    momenta = [_vector(k, parser, dim, "momentum") for k in momenta]
    require(all(v.is_real is True for k in momenta for v in k), "Momentum components must be real")
    diagonal = sp.diag(*(sp.exp(-2*sp.pi*sp.I*k.dot(t)) for k in momenta))
    result = clean(diagonal*matrix)
    anti = payload.get("antiunitary", False)
    require(isinstance(anti, bool), "antiunitary must be Boolean")
    response = {"action": "representation_element", "antiunitary": anti,
                "translation_matrix": mat_json(clean(diagonal)), "verified": True,
                "certificate": "The requested element is the supplied representative preceded by the integer translation: D(T_t g)=diag(exp(-2*pi*I*k_row.t)) D(g). Star-arm ordering is explicit input.",
                **display(result)}
    if not anti:
        response["character"] = str(simp(result.trace()))
    return response


def bloch_cocycle(payload, parser):
    raw = payload.get("operations")
    require(isinstance(raw, list) and 1 <= len(raw) <= 32, "Supply 1..32 complete little-cogroup Seitz representatives")
    operations = []
    dim = None
    for op in raw:
        require(isinstance(op, dict), "Each operation must be an object")
        rotation = parser.matrix(op.get("rotation"), limit=6)
        dim = rotation.rows if dim is None else dim
        require(rotation.shape == (dim, dim) and all(v.is_Integer for v in rotation)
                and abs(rotation.det()) == 1, "Little-group rotations must be unimodular integer matrices")
        t = _vector(op.get("translation", [0]*dim), parser, dim, "translation")
        require(all(v.is_Rational for v in t), "Seitz representative translations must be rational")
        anti = op.get("antiunitary", False)
        require(isinstance(anti, bool), "antiunitary must be Boolean")
        operations.append((rotation, t, anti))
    k = _vector(payload.get("k"), parser, dim, "k")
    require(all(v.is_real is True for v in k), "Momentum components must be real")
    reciprocal_shifts = []
    for rotation, _, anti in operations:
        shift = clean((-1 if anti else 1)*rotation.inv().T*k-k)
        require(all(v.is_integer is True for v in shift), "An operation does not fix this symbolic k modulo reciprocal integers; specialize k or supply its actual little group")
        reciprocal_shifts.append([str(v) for v in shift])
    n = len(operations)
    table, lattice_shifts, factor = [], [], sp.zeros(n)
    for i, (r, t, a) in enumerate(operations):
        row, shifts = [], []
        for j, (s, u, b) in enumerate(operations):
            matches = [(h, clean(t+r*u-v)) for h, (q, v, c) in enumerate(operations)
                       if c == (a != b) and r*s == q and all(x.is_Integer for x in t+r*u-v)]
            require(len(matches) == 1, "Seitz representatives are duplicated or not closed modulo the integer lattice")
            h, shift = matches[0]
            row.append(h)
            shifts.append([int(v) for v in shift])
            factor[i, j] = simp(sp.exp(-2*sp.pi*sp.I*k.dot(shift)))
        table.append(row)
        lattice_shifts.append(shifts)
    if "spin_factor_system" in payload:
        spin = parser.matrix(payload["spin_factor_system"], shape=(n, n), limit=32)
        factor = factor.multiply_elementwise(spin).applyfunc(simp)
    group = _group({"table": table, "antiunitary": [op[2] for op in operations],
                    "factor_system": factor.tolist()}, parser)
    return {"action": "bloch_cocycle", "order": n, "identity": group["identity"],
            "table": table, "antiunitary": group["anti"], "factor_system": mat_json(factor),
            "lattice_shifts": lattice_shifts, "reciprocal_shifts": reciprocal_shifts,
            "verified": True, "certificate": "Every Seitz product, reciprocal little-group condition, and normalized semilinear Bloch/spin cocycle equation is checked symbolically. No numerical k substitution is used.",
            **display(factor)}


ACTIONS = {"compile_cyclotomic": compile_cyclotomic, "common_kernel": common_kernel,
           "representation": representation, "intertwiner": intertwiner, "projector": projector,
           "character_decompose": character_decompose, "induce": induce, "wigner": wigner,
           "symmetrize": symmetrize, "seitz": seitz, "gauge": gauge,
           "representation_element": representation_element, "bloch_cocycle": bloch_cocycle}


def run(payload):
    require(isinstance(payload, dict), "Symbolic-interface request must be a JSON object")
    action = payload.get("action", "common_kernel")
    require(action in ACTIONS, "Unknown symbolic-interface action")
    parser = ExactParser(payload.get("assumptions"))
    result = ACTIONS[action](payload, parser)
    result["engine"] = "SymPy exact Python interfaces"
    result["version"] = "1.0"
    result["conditions"] = result.get("conditions", [])+parser.domain_conditions()
    result["domain_note"] = "Results use the supplied exact data and stated assumptions. Generic parameter conditions remain necessary; no automatic crystallographic label/database compatibility is implied."
    result["assumptions"] = {name: parser.assumptions.get(name, "real") for name in parser.symbols}
    return result
