"""Exact integral extensions of finite crystallographic point groups.

Independent Python implementation of the extension/normalizer and infinite
generation problems exposed by CrystKit (GPL-3.0-or-later). Integer relation
lattices and Smith transformations replace enumeration of guessed fractional
grids. A complete cohomology calculation is distinct from a complete normalizer
calculation: every result records which of these has been established.

The point group acts on column coordinates and translations are modulo Z^d.
H^1(P, Q^d/Z^d), equivalently H^2(P,Z^d), classifies vector systems up to
arbitrary origin changes for this FIXED integral point-group representation.
It does not identify different integral representations of a rational group.
"""

from collections import deque
from fractions import Fraction as F
from itertools import product, combinations, permutations
from math import isqrt, prod, lcm
import json
import crystkit_browser as c


def _sp():
    import sympy as sp
    return sp


def _smith(a):
    """Return D,U,V with U*A*V=D over Z, including exact transformations."""
    from sympy.polys.matrices import DomainMatrix
    from sympy.polys.matrices.normalforms import smith_normal_decomp
    sp = _sp()
    return tuple(x.to_Matrix() for x in smith_normal_decomp(DomainMatrix.from_Matrix(a).convert_to(sp.ZZ)))


def _row_lattice(a):
    from sympy.matrices.normalforms import hermite_normal_form
    return hermite_normal_form(a.T).T


def _limit(payload, key, default, ceiling, minimum=1):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= ceiling:
        raise ValueError(f"{key} must be an integer from {minimum} to {ceiling}")
    return value


def _point_input(payload, database=None):
    if "rotations" in payload:
        gens = [c.matrix(r) for r in payload["rotations"]]
    elif "point_generators" in payload:
        gens = [c.matrix(r) for r in payload["point_generators"]]
    else:
        gens = list(dict.fromkeys(r for r, _ in c._input_operations(payload, database)))
    if not gens or not 1 <= len(gens[0]) <= 6:
        raise ValueError("Point-group dimension must be between 1 and 6")
    if len(gens) > 2048:
        raise ValueError("Supply at most 2048 point matrices; a short generating set is sufficient")
    if any(abs(c.determinant(g)) != 1 or any(x.denominator != 1 for row in g for x in row) for g in gens):
        raise ValueError("Point generators must be integral unimodular matrices")
    max_order = _limit(payload, "max_order", 384, 120000)
    eye = c.identity(len(gens[0]))
    found, values = {eye}, [eye]
    for a in values:
        for g in gens:
            h = c.matmul(a, g)
            if any(x.numerator.bit_length() > 512 for row in h for x in row):
                raise c.SearchLimitError("Point matrix entries exceed the exact arithmetic resource limit; finiteness is not established")
            if h not in found:
                if len(found) >= max_order:
                    raise c.SearchLimitError("Point-group closure exceeded max_order; finiteness is not established")
                found.add(h)
                values.append(h)
    return [eye]+sorted(found-{eye})


def _choose_generators(group):
    """Deterministic small generating set, without a minimum-generator claim."""
    gens, known = [], {group[0]}
    for g in group:
        if g not in known:
            gens.append(g)
            known = set(c.finite_matrix_closure(gens, len(group)))
    return gens


def _cayley(group, generators):
    """Word coefficients: translation(word(g)) = W[g] * generator shifts."""
    sp = _sp()
    d, k = len(group[0]), len(generators)
    zero = sp.zeros(d, d*k)
    words = {group[0]: zero}
    exponents = {group[0]: sp.zeros(1, k)}
    queue = deque([group[0]])
    while queue:
        g = queue.popleft()
        for j, s in enumerate(generators):
            h = c.matmul(g, s)
            if h not in words:
                w = words[g].copy()
                w[:, j*d:(j+1)*d] += c._sympy_matrix(g)
                words[h] = w
                e = exponents[g].copy()
                e[j] += 1
                exponents[h] = e
                queue.append(h)
    if len(words) != len(group):
        raise ValueError("Selected matrices do not generate the point group")
    return words, exponents


def extension_data(group, max_classes=4096):
    """Compute all cohomology classes, with Smith-coordinate representatives."""
    sp = _sp()
    d = len(group[0])
    generators = _choose_generators(group)
    k, m = len(generators), d*len(generators)
    words, _ = _cayley(group, generators)
    if not m:
        return {"group": group, "generators": [], "words": words, "invariants": [],
                "torsion_positions": [], "V": sp.zeros(0), "Vinv": sp.zeros(0),
                "relations": sp.zeros(0), "smith": sp.zeros(0), "rank": 0,
                "classes": [((), sp.zeros(0, 1))], "origin_rank": 0}
    relations = []
    for g in group:
        for j, s in enumerate(generators):
            a = words[g]-words[c.matmul(g, s)]
            a[:, j*d:(j+1)*d] += c._sympy_matrix(g)
            relations.extend(a.tolist())
    a = _row_lattice(sp.Matrix(relations))
    D, U, V = _smith(a)
    assert U*a*V == D
    rank = sum(D[i, i] != 0 for i in range(min(D.shape)))
    origin = sp.Matrix.vstack(*(sp.eye(d)-c._sympy_matrix(g) for g in generators))
    origin_rank = origin.rank()
    if rank+origin_rank != m or a*origin != sp.zeros(a.rows, d):
        raise ArithmeticError("Cocycle/origin exactness identity failed")
    positions = [i for i in range(rank) if abs(int(D[i, i])) > 1]
    invariants = [abs(int(D[i, i])) for i in positions]
    count = prod(invariants)
    if count > max_classes:
        raise c.SearchLimitError(f"Exact cohomology has {count} classes; exceeds requested limit {max_classes}")
    classes = []
    for digits in product(*(range(v) for v in invariants)):
        y = sp.zeros(m, 1)
        for i, digit, order in zip(positions, digits, invariants):
            y[i] = sp.Rational(digit, order)
        x = V*y
        if any(v.q != 1 for v in a*x):
            raise ArithmeticError("Computed vector system fails the integral cocycle relations")
        classes.append((digits, x))
    return {"group": group, "generators": generators, "words": words, "invariants": invariants,
            "torsion_positions": positions, "V": V, "Vinv": V.inv(), "relations": a,
            "smith": D, "rank": rank, "classes": classes, "origin_rank": origin_rank}


def _fraction_vector(a):
    return tuple(F(int(v.p), int(v.q)) for v in a)


def _class_operations(data, x):
    return [(g, tuple(v % 1 for v in _fraction_vector(data["words"][g]*x))) for g in data["group"]]


def _class_label(data, operations):
    sp = _sp()
    shifts = dict(operations)
    x = sp.Matrix([sp.Rational(v.numerator, v.denominator) for g in data["generators"] for v in shifts[g]])
    if not data["generators"]:
        return ()
    if any(v.q != 1 for v in data["relations"]*x):
        raise ValueError("Vector system does not satisfy the point-group cocycle relations")
    y = data["Vinv"]*x
    values = []
    for i, order in zip(data["torsion_positions"], data["invariants"]):
        value = y[i]*order
        if value.q != 1:
            raise ArithmeticError("Nonintegral Smith class coordinate")
        values.append(int(value) % order)
    return tuple(values)


def exact_origin_conjugator(source, target):
    """Solve every origin congruence by Smith form, with no guessed grid.

    Returns o such that translation(C^-1 * source * C) equals target modulo
    Z^d for C=(I,o), or None after an exact inconsistency certificate.
    Compress the augmented INTEGER row lattice first, so the Smith left
    transformation is at most (d+1)-dimensional even for large point groups.
    """
    sp = _sp()
    left, right = dict(source), dict(target)
    if len(left) != len(source) or len(right) != len(target):
        raise ValueError("Origin comparison requires one coset per rotation")
    if left.keys() != right.keys():
        return None
    d = len(source[0][0])
    rows, rhs = [], []
    for g, t in source:
        for i in range(d):
            rows.append([g[i][j]-F(i == j) for j in range(d)])
            rhs.append(right[g][i]-t[i])
    if any(v.denominator != 1 for row in rows for v in row):
        raise ValueError("Origin comparison requires integral rotations")
    denominator = lcm(*(v.denominator for v in rhs))
    augmented = sp.Matrix([[int(v) for v in row]+[int(b*denominator)] for row, b in zip(rows, rhs)])
    compressed = _row_lattice(augmented)
    if compressed.rows == 0:
        return (F(0),)*d
    a = compressed[:, :d]
    b = compressed[:, d]/denominator
    D, U, V = _smith(a)
    transformed = U*b
    z = sp.zeros(d, 1)
    for i in range(D.rows):
        diag = D[i, i] if i < D.cols else 0
        if diag:
            z[i] = transformed[i]/diag
        elif transformed[i].q != 1:
            return None
    origin = _fraction_vector(V*z)
    if any((sum(v*x for v, x in zip(row, origin))-b).denominator != 1 for row, b in zip(rows, rhs)):
        raise ArithmeticError("Smith origin solution failed its exact identity")
    return tuple(x % 1 for x in origin)


def affine_compare(source, target, bases):
    """Exact affine equivalence under the explicitly supplied lattice bases."""
    if len(source) != len(target):
        return {"equivalent": False, "status": "different_quotient_orders"}
    target_set = {(r, tuple(x % 1 for x in t)) for r, t in target}
    for basis in bases:
        basis = c.matrix(basis)
        if abs(c.determinant(basis)) != 1 or any(v.denominator != 1 for row in basis for v in row):
            raise ValueError("Comparison basis must be an integral unimodular matrix")
        transformed = c.change_basis(source, basis)
        origin = exact_origin_conjugator(transformed, target)
        if origin is not None:
            old_origin = c.matvec(basis, origin)
            checked = {(r, tuple(x % 1 for x in t)) for r, t in c.change_basis(source, basis, old_origin)}
            if checked != target_set:
                raise ArithmeticError("Affine comparison identity failed")
            return {"equivalent": True, "status": "verified", "basis": basis, "origin": old_origin,
                    "orientationPreserved": c.determinant(basis) > 0, "identityVerified": True,
                    "certificate": "Unimodular basis and exact Smith solution of every origin congruence"}
    return {"equivalent": None, "status": "no_match_for_supplied_bases",
            "scope": "All origin shifts were checked exactly; the supplied list need not contain every GL(d,Z) basis"}


def _extensions_result(data, include_operations=True):
    reps = []
    d = len(data["group"][0])
    if include_operations and len(data["classes"])*len(data["group"])*d*(d+1) > 2000000:
        raise c.SearchLimitError("Operation-table output exceeds its size limit; set include_operations to false to retain all class representatives")
    for index, (label, x) in enumerate(data["classes"]):
        translations = [tuple(v % 1 for v in _fraction_vector(data["words"][g]*x)) for g in data["generators"]]
        entry = {"index": index, "coordinates": label, "generatorTranslations": translations}
        if include_operations:
            entry["operations"] = [c.operation_json(op) for op in _class_operations(data, x)]
        reps.append(entry)
    return {"dimension": len(data["group"][0]), "pointGroupOrder": len(data["group"]),
            "pointGenerators": data["generators"], "cohomologyInvariants": data["invariants"],
            "extensionCount": len(data["classes"]), "originFreedomDimension": data["origin_rank"],
            "relationRank": data["rank"], "representatives": reps, "complete": True,
            "certificate": "Integer Cayley relation lattice; unimodular Smith decomposition; kernel identity component equals all origin coboundaries",
            "scope": "All vector systems for this integral point group modulo every rational origin shift; GL(d,Z) normalizer equivalence is separate"}


def invariant_form_dimension(group):
    sp = _sp()
    d = len(group[0])
    pairs = list(combinations(range(d), 2))+[(i, i) for i in range(d)]
    variables = sp.symbols(f"q0:{len(pairs)}")
    q = sp.zeros(d)
    for x, (i, j) in zip(variables, pairs):
        q[i, j] = q[j, i] = x
    equations = []
    for g in _choose_generators(group):
        s = c._sympy_matrix(g)
        equations.extend(list(s.T*q*s-q))
    a, _ = sp.linear_eq_to_matrix(equations, variables)
    return len(variables)-a.rank()


def _gl_generators(d):
    result = []
    sign = [list(r) for r in c.identity(d)]
    sign[0][0] = -1
    result.append(c.matrix(sign))
    for j in range(d-1):
        swap = [list(r) for r in c.identity(d)]
        swap[j], swap[j+1] = swap[j+1], swap[j]
        result.append(c.matrix(swap))
    for i in range(d):
        for j in range(d):
            if i != j:
                shear = [list(r) for r in c.identity(d)]
                shear[i][j] = 1
                result.append(c.matrix(shear))
    return result


def _simple_character_normalizer(group, max_matrices):
    """Full normalizer of rational, one-dimensional, distinct characters.

    A unimodular map sends each primitive integer eigenline generator to a
    signed primitive generator of another eigenline. Consequently enumeration
    is finite even when the eigenline lattice has nontrivial index in Z^d.
    """
    sp = _sp()
    d = len(group[0])
    e = c.identity(d)
    if any(c.matmul(g, g) != e for g in group):
        return None
    gens = _choose_generators(group)
    columns = []
    for signs in product((-1, 1), repeat=len(gens)):
        a = sp.Matrix.vstack(*(c._sympy_matrix(g)-sign*sp.eye(d) for g, sign in zip(gens, signs)))
        null = a.nullspace()
        if len(null) > 1:
            return None
        if null:
            v = null[0]
            denominator = sp.ilcm(*(x.q for x in v))
            v *= denominator
            divisor = sp.igcd(*(int(x) for x in v))
            columns.append(v/divisor)
    if len(columns) != d:
        return None
    basis = sp.Matrix.hstack(*columns)
    inverse = basis.inv()
    diagonal_group = {tuple((inverse*c._sympy_matrix(g)*basis).diagonal()) for g in group}
    matrices = []
    tried = 0
    for p in permutations(range(d)):
        if {tuple(v[p[i]] for i in range(d)) for v in diagonal_group} != diagonal_group:
            continue
        for signs in product((-1, 1), repeat=d):
            tried += 1
            if tried > max_matrices:
                raise c.SearchLimitError("Exact primitive-character normalizer enumeration exceeds its resource limit")
            n = sp.zeros(d)
            for j in range(d):
                n[p[j], j] = signs[j]
            n = basis*n*inverse
            if all(v.q == 1 for v in n):
                matrices.append(c._from_sympy(n))
    matrices = [e]+sorted(set(matrices)-{e})
    return {"complete": True, "finite": True, "normalizerOrder": len(matrices),
            "generators": _choose_generators(matrices), "invariantFormDimension": d,
            "primitiveCharacterBasis": c._from_sympy(basis), "characterLatticeIndex": abs(int(basis.det())),
            "certificate": "Every rational character is one-dimensional and distinct; all signed permutations of primitive integer eigenlines tested for lattice integrality",
            "scope": "Full integral normalizer of this multiplicity-free rational sign representation"}


def integral_normalizer(group, max_vectors=2000000, max_matrices=100000):
    """Certified integral normalizer in scalar/unique-form cases.

    In the other cases enumerates the ENTIRE subgroup preserving the averaged
    positive Gram form, and does not equate that subgroup with GL normalizer.
    Bounds are derived from positive definiteness, never a guessed entry box.
    """
    d = len(group[0])
    e = c.identity(d)
    negative_e = tuple(tuple(-x for x in row) for row in e)
    if all(g in (e, negative_e) for g in group):
        return {"complete": True, "finite": d == 1, "normalizerOrder": 2 if d == 1 else None,
                "generators": _gl_generators(d), "invariantFormDimension": d*(d+1)//2,
                "certificate": "Scalar point group: its integral normalizer is GL(d,Z), generated by elementary transvections, coordinate swaps and a sign change",
                "scope": "Full integral normalizer GL(d,Z)"}
    if all(all(g[i][j] == 0 for i in range(d) for j in range(d) if i != j) for g in group):
        # Integral diagonal sign representations decompose as coordinate
        # character blocks. A normalizer permutes those blocks and acts by an
        # arbitrary GL(block_size,Z) matrix inside each block. Distinct blocks
        # cannot mix: the simultaneous rational eigenspaces are intrinsic.
        characters = [tuple(g[j][j] for g in group) for j in range(d)]
        blocks = [tuple(i for i, ch in enumerate(characters) if ch == value) for value in dict.fromkeys(characters)]
        generators = []
        for block in blocks:
            for small in _gl_generators(len(block)):
                large = [list(row) for row in e]
                for i, old_i in enumerate(block):
                    for j, old_j in enumerate(block):
                        large[old_i][old_j] = small[i][j]
                generators.append(c.matrix(large))
        group_set = set(group)
        permutations_found = []
        for p in permutations(range(d)):
            n = tuple(tuple(F(p[j] == i) for j in range(d)) for i in range(d))
            ni = c.transpose(n)
            if {c.matmul(c.matmul(ni, g), n) for g in group} == group_set:
                permutations_found.append(n)
        generators += _choose_generators([e]+sorted(set(permutations_found)-{e}))
        finite = all(len(block) == 1 for block in blocks)
        return {"complete": True, "finite": finite, "normalizerOrder": 2**d*len(permutations_found) if finite else None,
                "generators": list(dict.fromkeys(generators)), "characterBlocks": blocks,
                "invariantFormDimension": sum(len(block)*(len(block)+1)//2 for block in blocks),
                "certificate": "Simultaneous integral character blocks; all compatible coordinate permutations and full GL(block_size,Z) generators",
                "scope": "Full integral normalizer of this diagonal sign representation"}
    simple_characters = _simple_character_normalizer(group, max_matrices)
    if simple_characters is not None:
        return simple_characters
    gram = c.invariant_gram(group)
    inv = c.inverse(gram)
    form_dimension = invariant_form_dimension(group)
    vector_cache = {}
    tested = 0
    for j in range(d):
        norm = gram[j][j]
        if norm in vector_cache:
            continue
        limits = [isqrt((norm*inv[i][i]).numerator//(norm*inv[i][i]).denominator) for i in range(d)]
        count = prod(2*b+1 for b in limits)
        tested += count
        if tested > max_vectors:
            raise c.SearchLimitError("Certified Gram-vector enumeration exceeds its resource limit; no classification conclusion follows")
        vectors = []
        for v in product(*(range(-b, b+1) for b in limits)):
            if sum(x*y for x, y in zip(v, c.matvec(gram, v))) == norm:
                vectors.append(tuple(map(F, v)))
        vector_cache[norm] = vectors
    automorphisms, normalizers = 0, []
    group_set = set(group)
    def grow(columns):
        nonlocal automorphisms
        j = len(columns)
        if j == d:
            n = c.transpose(columns)
            if abs(c.determinant(n)) != 1:
                return
            automorphisms += 1
            if automorphisms > max_matrices:
                raise c.SearchLimitError("Gram automorphism enumeration exceeds its resource limit")
            ni = c.inverse(n)
            if all(c.matmul(c.matmul(ni, g), n) in group_set for g in group):
                normalizers.append(n)
            return
        for v in vector_cache[gram[j][j]]:
            if all(sum(x*y for x, y in zip(v, c.matvec(gram, col))) == gram[j][i] for i, col in enumerate(columns)):
                grow(columns+[v])
    grow([])
    normalizers = [e]+sorted(set(normalizers)-{e})
    gens = _choose_generators(normalizers)
    complete = form_dimension == 1
    return {"complete": complete, "finite": True, "normalizerOrder": len(normalizers),
            "generators": gens, "invariantGramMatrix": gram, "invariantFormDimension": form_dimension,
            "gramAutomorphismOrder": automorphisms,
            "certificate": "All integral isometries enumerated using positive-definite inverse-Gram coordinate bounds; every conjugation checked" +
                ("; unique invariant form forces every unimodular normalizer to preserve this form" if complete else ""),
            "scope": "Full integral normalizer" if complete else "Full normalizer inside this Gram-form isometry group; the full GL(d,Z) normalizer is not established"}


def extension_orbits(data, normalizers, normalizer_complete=False):
    d = len(data["group"][0])
    group_set = set(data["group"])
    normalizers = [c.matrix(n) for n in normalizers]
    for n in normalizers:
        if len(n) != d or abs(c.determinant(n)) != 1 or any(x.denominator != 1 for row in n for x in row):
            raise ValueError("Normalizer must be integral unimodular")
        ni = c.inverse(n)
        if {c.matmul(c.matmul(ni, g), n) for g in group_set} != group_set:
            raise ValueError("Supplied matrix does not normalize the point group")
    labels = [label for label, _ in data["classes"]]
    lookup = {label: i for i, label in enumerate(labels)}
    actions, signs = [], []
    for n in normalizers:
        permutation = []
        for label, x in data["classes"]:
            ops = c.change_basis(_class_operations(data, x), n)
            permutation.append(lookup[_class_label(data, ops)])
        if len(set(permutation)) != len(labels):
            raise ArithmeticError("Normalizer action is not a permutation")
        actions.append(permutation)
        signs.append(1 if c.determinant(n) > 0 else -1)
    remaining, orbits = set(range(len(labels))), []
    while remaining:
        start = min(remaining)
        found, queue = {(start, 1)}, deque([(start, 1)])
        while queue:
            index, orientation = queue.popleft()
            for perm, sign in zip(actions, signs):
                target = perm[index], orientation*sign
                if target not in found:
                    found.add(target)
                    queue.append(target)
        indices = sorted({i for i, _ in found})
        remaining.difference_update(indices)
        achiral = (start, -1) in found
        orbits.append({"representative": start, "extensionIndices": indices,
                       "positiveOrbit": sorted(i for i, sign in found if sign == 1),
                       "negativeOrbit": sorted(i for i, sign in found if sign == -1),
                       "improperStabilizerFound": achiral,
                       "enantiomorphicPair": not achiral if normalizer_complete else None})
    return {"orbitCount": len(orbits), "orbits": orbits, "normalizerActionPermutations": actions,
            "normalizerGenerators": normalizers, "normalizerComplete": normalizer_complete,
            "classificationCompleteForIntegralPointGroup": normalizer_complete,
            "scope": "Affine types for this integral point group" if normalizer_complete else "Orbits under the stated normalizer subgroup; a negative chirality conclusion is inconclusive"}


def generation_certificate(generators, target_operations):
    """Schreier translation-lattice certificate for the INFINITE affine group."""
    sp = _sp()
    from sympy.matrices.normalforms import hermite_normal_form
    d = len(target_operations[0][0])
    target = {r: tuple(x % 1 for x in t) for r, t in target_operations}
    e = c.affine_identity(d)
    lifts, queue = {e[0]: e}, deque([e[0]])
    for r, t in generators:
        if r not in target or any((x-y).denominator != 1 for x, y in zip(t, target[r])):
            return {"generates": False, "reason": "A candidate is outside the target infinite group"}
    while queue:
        a = lifts[queue.popleft()]
        for g in generators:
            h = c.compose(a, g)
            if h[0] not in lifts:
                lifts[h[0]] = h
                queue.append(h[0])
    translations = []
    for a in lifts.values():
        for g in generators:
            h = c.compose(a, g)
            translations.append(tuple(x-y for x, y in zip(h[1], lifts[h[0]][1])))
    if not translations:
        h = sp.zeros(d, 0)
    else:
        h = hermite_normal_form(sp.Matrix([[int(v[i]) for v in translations] for i in range(d)]))
    full = len(lifts) == len(target) and h == sp.eye(d)
    return {"generates": full, "generatedPointGroupOrder": len(lifts), "targetPointGroupOrder": len(target),
            "translationLatticeRank": h.cols, "translationHermiteBasis": c._from_sympy(h),
            "translationIndex": abs(int(h.det())) if h.cols == d else None,
            "certificate": "Schreier generators span the full translation lattice Z^d and projected generators span the point group" if full else "Exact Schreier translation lattice and projected point group"}


def abelianization(operations):
    """Abelianize a complete crystallographic presentation, over Z."""
    sp = _sp()
    group = [r for r, _ in operations]
    d = len(group[0])
    generators = _choose_generators(group)
    k = len(generators)
    words, exponents = _cayley(group, generators)
    shifts = dict(operations)
    x = sp.Matrix([sp.Rational(v.numerator, v.denominator) for g in generators for v in shifts[g]])
    relations = []
    for g in group:
        for j, s in enumerate(generators):
            h = c.matmul(g, s)
            coeff = exponents[g]+sp.eye(k)[j, :]-exponents[h]
            translation = words[g]*x+c._sympy_matrix(g)*c._sympy_matrix([shifts[s]]).T-words[h]*x
            if any(v.q != 1 for v in translation):
                raise ValueError("Operations must describe one coset per point-group element modulo the primitive lattice")
            relations.append(list(coeff)+[-int(v) for v in translation])
    for g in generators:
        conjugation = c._sympy_matrix(g)-sp.eye(d)
        for j in range(d):
            relations.append([0]*k+list(conjugation[:, j]))
    if relations:
        D, _, _ = _smith(_row_lattice(sp.Matrix(relations)))
        nonzero = [abs(int(D[i, i])) for i in range(min(D.shape)) if D[i, i]]
    else:
        nonzero = []
    torsion = [v for v in nonzero if v > 1]
    free = k+d-len(nonzero)
    return {"freeRank": free, "torsionInvariants": torsion, "minimumGenerators": free+len(torsion),
            "presentationGeneratorCount": k+d,
            "certificate": "Smith invariants of the abelianized finite-point-group Cayley presentation with all lattice conjugation relations"}


def infinite_generators(operations, candidates=None, max_candidates=400, max_trials=20000):
    """Return upper/lower bounds; minimum only when certified bounds coincide."""
    d = len(operations[0][0])
    group = [r for r, _ in operations]
    if len(set(group)) != len(operations):
        raise ValueError("A primitive lattice with one affine coset per rotation is required")
    props = c.group_properties(c.multiplication_table(operations))
    ab = abelianization(operations)
    lower = max(ab["minimumGenerators"], props["minimumGeneratorCount"])
    e = c.identity(d)
    shifts = dict(operations)
    standard = [(g, shifts[g]) for g in _choose_generators(group)]+[(e, row) for row in e]
    if candidates is not None:
        candidate_list = [c.operation(g) for g in candidates]
    else:
        candidate_list = list(operations[1:])+[(e, row) for row in e]
        # Lattice translates of coset representatives can generate the infinite
        # group with fewer elements than representatives plus unit translations.
        unit_shifts = [(F(0),)*d]+[tuple(sign*x for x in row) for row in e for sign in (-1, 1)]
        candidate_list += [(r, tuple(x+y for x, y in zip(t, shift))) for r, t in operations[1:] for shift in unit_shifts[1:]]
    candidate_list = list(dict.fromkeys(candidate_list))
    if len(candidate_list) > max_candidates:
        candidate_list = candidate_list[:max_candidates]
        truncated = True
    else:
        truncated = False
    best = standard
    trials, exhausted = 0, False
    # Prefer an explicitly supplied set as a whole; the SG227 README example
    # is already a two-generator certificate before any heuristic search.
    if candidates and generation_certificate(candidate_list, operations)["generates"]:
        best = candidate_list
    for count in range(lower, len(best)):
        found = False
        for indices in combinations(range(len(candidate_list)), count):
            if trials >= max_trials:
                exhausted = True
                break
            trials += 1
            trial = [candidate_list[i] for i in indices]
            if generation_certificate(trial, operations)["generates"]:
                best, found = trial, True
                break
        if found or exhausted:
            break
    cert = generation_certificate(best, operations)
    if not cert["generates"]:
        raise ArithmeticError("Internal generator upper-bound certificate failed")
    return {"lowerBound": lower, "upperBound": len(best), "minimumCertified": lower == len(best),
            "minimumGeneratorCount": len(best) if lower == len(best) else None,
            "generators": [c.operation_json(g) for g in best], "abelianization": ab,
            "generationCertificate": cert, "trials": trials, "candidateSearchLimited": truncated or exhausted,
            "scope": "Infinite affine group including its full integer translation lattice",
            "status": "certified_minimum" if lower == len(best) else "certified_bounds"}


def affine_properties(operations):
    """Decide torsion-freeness and the center for a standard affine lattice.

    The input must be the complete quotient by its FULL translation lattice Z^d.
    A nonidentity linear part R of order m admits a torsion element in its coset
    iff (I+R+...+R^(m-1))*z = -(I+R+...+R^(m-1))*t has an integer solution.
    Smith transforms decide this without a denominator or coordinate search.
    """
    sp = _sp()
    if not operations:
        raise ValueError("At least the identity coset is required")
    d = len(operations[0][0])
    eye, zero = c.affine_identity(d)
    rotations = [r for r, _ in operations]
    if len(set(rotations)) != len(rotations) or (eye, zero) not in operations:
        raise ValueError("Use a primitive translation lattice Z^d with one coset per rotation")
    rotations = [eye]+sorted(set(rotations)-{eye})
    # Validate the full vector system rather than assuming arbitrary shifts define
    # a group. The Cayley-generator check is sufficient for the whole quotient.
    shifts = dict(operations)
    gens = _choose_generators(rotations)
    for r, t in operations:
        if any(x.denominator != 1 for row in r for x in row):
            raise ValueError("Rotations must preserve the integer translation lattice")
        for g in gens:
            rg, tg = c.compose((r,t), (g,shifts[g]))
            if rg not in shifts or any((a-b).denominator != 1 for a,b in zip(tg,shifts[rg])):
                raise ValueError("Operations do not define a closed vector system modulo Z^d")
    checks, witness = [], None
    for r, t in operations:
        if r == eye:
            continue
        power, norm, order = eye, sp.zeros(d), 0
        while True:
            norm += c._sympy_matrix(power)
            order += 1
            power = c.matmul(power, r)
            if power == eye:
                break
            if order > len(operations):
                raise ValueError("Point group is not finite and closed")
        rhs = -norm*sp.Matrix(t)
        if any(x.q != 1 for x in rhs):
            raise ValueError("A coset power is not in the supplied integer translation lattice")
        diagonal, left, right = _smith(norm)
        b = left*rhs
        y = sp.zeros(d,1)
        obstruction = None
        for j in range(d):
            n = int(diagonal[j,j])
            if (n and int(b[j]) % n) or (not n and b[j] != 0):
                obstruction = {"smithRow":j,"divisor":abs(n),"value":int(b[j])}
                break
            if n:
                y[j] = b[j]/n
        check = {"rotation":r,"pointOrder":order,"containsTorsion":obstruction is None,
                 "normMatrix":[list(map(int,row)) for row in norm.tolist()],"smithDiagonal":[int(diagonal[j,j]) for j in range(d)]}
        if obstruction is None:
            z = right*y
            if norm*z != rhs or any(x.q != 1 for x in z):
                raise ArithmeticError("Integer torsion witness failed its certificate")
            lift = r, tuple(a+F(int(b)) for a,b in zip(t,z))
            element = c.affine_identity(d)
            for _ in range(order):
                element = c.compose(element,lift)
            if element != c.affine_identity(d):
                raise ArithmeticError("Torsion element does not have the claimed finite order")
            check["integerShift"] = list(map(int,z))
            if witness is None:
                witness = {"operation":c.operation_json(lift),"order":order,
                           "powerIsIdentity":True}
        else:
            check["obstruction"] = obstruction
        checks.append(check)
    equations = sp.Matrix.vstack(*(c._sympy_matrix(r)-sp.eye(d) for r in rotations))
    diagonal, _, right = _smith(equations)
    rank = sum(diagonal[j,j] != 0 for j in range(d))
    center = right[:,rank:]
    if equations*center != sp.zeros(equations.rows,center.cols):
        raise ArithmeticError("Fixed translation lattice certificate failed")
    return {"torsionFree":witness is None,"bieberbach":witness is None,
            "centerRank":center.cols,"centerBasis":[list(map(int,row)) for row in center.tolist()],
            "trivialCenter":center.cols == 0,
            "orientable":all(c.determinant(r)==1 for r in rotations),
            "torsionWitness":witness,"cosetChecks":checks,"complete":True,
            "implicitTranslationLattice":"Z^d",
            "certificate":"Every nonidentity point coset decided by an exact integer Smith equation; the full center is the saturated fixed translation lattice"}


def run(payload, database=None):
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON request object")
    action = payload.get("action", "extensions")
    if action in ("affine_properties", "torsionfree"):
        operations = c.affine_closure(c._input_operations(payload, database), _limit(payload, "max_order", 384, 120000))
        return c.jsonable({"action":action,"dimension":len(operations[0][0]),
                           "pointGroupOrder":len(operations),**affine_properties(operations)})
    if action == "affine_compare":
        left = c.affine_closure(c._input_operations(payload, database, "left"))
        right = c.affine_closure(c._input_operations(payload, database, "right"))
        bases = payload.get("bases", [c.identity(len(left[0][0]))])
        return c.jsonable({"action": action, **affine_compare(left, right, bases)})
    if action in ("spacegroup_generators", "abelianization", "generation_certificate"):
        operations = c.affine_closure(c._input_operations(payload, database), _limit(payload, "max_order", 384, 120000))
        if action == "abelianization":
            result = abelianization(operations)
        elif action == "generation_certificate":
            result = generation_certificate([c.operation(g) for g in payload["candidate_generators"]], operations)
        else:
            result = infinite_generators(operations, payload.get("candidate_generators"),
                                         _limit(payload, "max_candidates", 400, 10000), _limit(payload, "max_trials", 20000, 100000, 0))
        return c.jsonable({"action": action, "dimension": len(operations[0][0]), **result})
    group = _point_input(payload, database)
    if action == "integral_normalizer":
        result = integral_normalizer(group, _limit(payload, "max_vectors", 2000000, 10000000), _limit(payload, "max_matrices", 100000, 100000))
        return c.jsonable({"action": action, "dimension": len(group[0]), "pointGroupOrder": len(group), **result})
    if action not in ("extensions", "extension_orbits"):
        raise ValueError("Unknown CrystKit extension action")
    data = extension_data(group, _limit(payload, "max_classes", 4096, 65536))
    result = _extensions_result(data, payload.get("include_operations", True))
    if action == "extension_orbits":
        if "normalizers" in payload:
            normalizer = {"generators": payload["normalizers"], "complete": False, "scope": "User-supplied subgroup; completeness not assumed"}
        else:
            normalizer = integral_normalizer(group, _limit(payload, "max_vectors", 2000000, 10000000), _limit(payload, "max_matrices", 100000, 100000))
        result["normalizer"] = normalizer
        result.update(extension_orbits(data, normalizer["generators"], normalizer["complete"]))
    return c.jsonable({"action": action, **result})


OrbitSpaceGroupStdByCollectEquivExtensions = extension_orbits
MinimalGeneratingSetAffineCrystGroup = infinite_generators
