"""Exact crystallographic algebra for CPython and Pyodide.

Selected algorithms ported from CrystKit 0f4f85e (Hongsheng Zhao,
GPL-2.0-or-later), with an independent rational affine-group implementation.
Distributed under GPL-3.0-or-later. No GAP or CARAT executables are invoked.

Coordinates are column vectors. ``change_basis(ops, B, o)`` means
``x_old = B*x_new + o`` and returns C^-1*g*C. A fractional operation list
describes cosets modulo the explicitly assumed integer translation lattice;
it is NOT a finite space group. ``minimum_generators`` refers only to that
finite quotient. Arbitrary rational generator sets can instead be passed to
``simplify_affine_generators`` to derive their translation lattice by Schreier
generators and rational Hermite reduction. CARAT's exhaustive 2--6 dimensional
classification and unbounded GL(n,Z) normalizers are not implemented.

``run(payload, database=None)`` is the JSON API. ``database`` is the existing
space-groups.json object, its groups list, or its JSON string. Actions:
analyze, finite_orders, blocks, conjugacy, compare, simplify, normalizer_orbit. JSON rationals
are integers or strings such as "1/3". No expression evaluation is used.
"""

from collections import Counter, deque
from fractions import Fraction as F
from functools import lru_cache
from itertools import combinations, permutations, product
from math import gcd, isfinite, lcm
import json


class SearchLimitError(ValueError):
    """A bounded search stopped; this is not evidence of nonexistence."""


def rational(value):
    if isinstance(value, bool):
        raise ValueError("Boolean values are not rational coordinates")
    if isinstance(value, float):
        if not isfinite(value):
            raise ValueError("Coordinates must be finite")
        result = F(value).limit_denominator(1000000)
        if abs(float(result) - value) > 1e-12:
            raise ValueError("Use an exact fraction string for this coordinate")
        return result
    try:
        return F(value)
    except (ValueError, TypeError, ZeroDivisionError) as exc:
        raise ValueError("Expected an integer or rational string") from exc


def matrix(values):
    rows = tuple(tuple(rational(x) for x in row) for row in values)
    if not rows or not rows[0] or any(len(row) != len(rows[0]) for row in rows):
        raise ValueError("Expected a nonempty rectangular matrix")
    return rows


def identity(d):
    return tuple(tuple(F(i == j) for j in range(d)) for i in range(d))


def transpose(a):
    return tuple(zip(*a))


def matmul(a, b):
    if len(a[0]) != len(b):
        raise ValueError("Matrix dimensions do not match")
    return tuple(tuple(sum(x*y for x, y in zip(row, col)) for col in zip(*b)) for row in a)


def matvec(a, v):
    return tuple(sum(x*y for x, y in zip(row, v)) for row in a)


def determinant(a):
    d = len(a)
    if any(len(row) != d for row in a):
        raise ValueError("Expected a square matrix")
    work = [list(row) for row in a]
    result = F(1)
    for j in range(d):
        pivot = next((i for i in range(j, d) if work[i][j]), None)
        if pivot is None:
            return F(0)
        if pivot != j:
            work[j], work[pivot] = work[pivot], work[j]
            result = -result
        value = work[j][j]
        result *= value
        for i in range(j+1, d):
            factor = work[i][j] / value
            for k in range(j+1, d):
                work[i][k] -= factor * work[j][k]
    return result


def inverse(a):
    d = len(a)
    if any(len(row) != d for row in a):
        raise ValueError("Expected a square matrix")
    work = [list(row) + list(unit) for row, unit in zip(a, identity(d))]
    for j in range(d):
        pivot = next((i for i in range(j, d) if work[i][j]), None)
        if pivot is None:
            raise ValueError("Basis matrix must be invertible")
        work[j], work[pivot] = work[pivot], work[j]
        scale = work[j][j]
        work[j] = [x/scale for x in work[j]]
        for i in range(d):
            if i != j:
                scale = work[i][j]
                work[i] = [x-scale*y for x, y in zip(work[i], work[j])]
    return tuple(tuple(row[d:]) for row in work)


def augmented_matrix_on_left(linear, translation):
    linear = matrix(linear)
    d = len(linear)
    translation = tuple(map(rational, translation))
    if len(linear[0]) != d or len(translation) != d:
        raise ValueError("Affine dimensions do not match")
    return tuple(row+(t,) for row, t in zip(linear, translation)) + ((F(0),)*d+(F(1),),)


def operation(value):
    if isinstance(value, dict):
        if value.get("antiunitary", False):
            raise ValueError("CrystKit affine operations are ordinary, not magnetic")
        r = matrix(value["rotation"])
        t = tuple(map(rational, value.get("translation", [0]*len(r))))
    else:
        a = matrix(value)
        d = len(a)-1
        if d < 1:
            raise ValueError("Affine dimension must be positive")
        if len(a[0]) != d+1 or a[-1] != (F(0),)*d+(F(1),):
            raise ValueError("Expected a homogeneous affine matrix acting on the left")
        r = tuple(row[:-1] for row in a[:-1])
        t = tuple(row[-1] for row in a[:-1])
    if not r or len(r) > 6 or len(r[0]) != len(r) or len(t) != len(r) or not determinant(r):
        raise ValueError("Invalid affine operation")
    return r, t


def affine_identity(d):
    return identity(d), (F(0),)*d


def compose(a, b, modulo=False):
    r = matmul(a[0], b[0])
    t = tuple(x+y for x, y in zip(matvec(a[0], b[1]), a[1]))
    return r, tuple(x % 1 for x in t) if modulo else t


def inverse_operation(a):
    r = inverse(a[0])
    return r, tuple(-x for x in matvec(r, a[1]))


def change_basis(operations, basis, origin=None):
    """Conjugate by x_old = basis*x_new + origin, exactly over Q."""
    b = matrix(basis)
    d = len(b)
    o = tuple(map(rational, origin if origin is not None else [0]*d))
    if len(o) != d:
        raise ValueError("Origin dimension does not match the basis")
    c = b, o
    ci = inverse_operation(c)
    return [compose(compose(ci, a), c) for a in operations]


def affine_closure(generators, max_order=384):
    """Finite coset closure modulo Z^d; requires a preserved integer lattice."""
    if not generators:
        raise ValueError("At least one operation (possibly identity) is required")
    d = len(generators[0][0])
    for r, t in generators:
        if len(r) != d or len(t) != d:
            raise ValueError("Operation dimensions differ")
        if abs(determinant(r)) != 1 or any(x.denominator != 1 for row in r for x in row):
            raise ValueError("Rotations must preserve Z^d; supply the translation basis first")
    gens = list(dict.fromkeys((r, tuple(x % 1 for x in t)) for r, t in generators))
    e = affine_identity(d)
    found, queue = {e}, deque([e])
    while queue:
        a = queue.popleft()
        for b in gens:
            c = compose(a, b, True)
            if c not in found:
                found.add(c)
                queue.append(c)
                if len(found) > max_order:
                    raise SearchLimitError("Affine quotient exceeds the finite-order limit")
    return [e] + sorted(found-{e})


def finite_matrix_closure(generators, max_order=192):
    gens = list(dict.fromkeys(matrix(g) for g in generators))
    if not gens:
        raise ValueError("At least one matrix is required")
    d = len(gens[0])
    if any(len(g) != d or len(g[0]) != d or not determinant(g) for g in gens):
        raise ValueError("Expected invertible matrices of equal dimension")
    e = identity(d)
    found, queue = {e}, deque([e])
    while queue:
        for g in gens:
            c = matmul(queue[0], g)
            if c not in found:
                found.add(c)
                queue.append(c)
                if len(found) > max_order:
                    raise SearchLimitError("Matrix group may be infinite or exceed the order limit")
        queue.popleft()
    return [e] + sorted(found-{e})


def multiplication_table(elements, affine=True):
    lookup = {a: i for i, a in enumerate(elements)}
    multiply = (lambda a, b: compose(a, b, True)) if affine else matmul
    try:
        return [[lookup[multiply(a, b)] for b in elements] for a in elements]
    except KeyError as exc:
        raise ValueError("Input operations are not closed") from exc


def subgroup(table, generators):
    result, queue = {0}, deque([0])
    while queue:
        a = queue.popleft()
        for b in generators:
            c = table[a][b]
            if c not in result:
                result.add(c)
                queue.append(c)
    return frozenset(result)


def group_properties(table, max_subgroups=12000):
    """Certified solvability and exact minimum generators of the FINITE quotient."""
    n = len(table)
    inverses = [row.index(0) for row in table]
    derived, sizes = frozenset(range(n)), [n]
    while len(derived) > 1:
        commutators = {table[table[table[a][b]][inverses[a]]][inverses[b]] for a in derived for b in derived}
        new = subgroup(table, commutators)
        sizes.append(len(new))
        if new == derived:
            break
        derived = new
    queue = deque([(frozenset([0]), ())])
    seen = {frozenset([0])}
    answer = () if n == 1 else None
    while queue and answer is None:
        h, gens = queue.popleft()
        for g in range(1, n):
            if g in h:
                continue
            newgens = gens+(g,)
            k = subgroup(table, newgens)
            if len(k) == n:
                answer = newgens
                break
            if k not in seen:
                if len(seen) >= max_subgroups:
                    raise SearchLimitError("Minimum quotient-generator search exceeded its subgroup budget")
                seen.add(k)
                queue.append((k, newgens))
    return {"order": n, "abelian": all(table[i][j] == table[j][i] for i in range(n) for j in range(i)),
            "solvable": sizes[-1] == 1, "derivedSeriesOrders": sizes,
            "minimumGeneratorIndices": list(answer), "minimumGeneratorCount": len(answer),
            "generatorMeaning": "Exact minimum for the finite quotient modulo lattice translations; not the infinite space group"}


def point_orbit(operations, point):
    point = tuple(map(rational, point))
    if len(point) != len(operations[0][0]):
        raise ValueError("Point dimension does not match the group")
    images = [tuple((x+y) % 1 for x, y in zip(matvec(r, point), t)) for r, t in operations]
    fixed = [i for i, v in enumerate(images) if all((x-y) % 1 == 0 for x, y in zip(v, point))]
    return {"points": sorted(set(images)), "multiplicity": len(set(images)), "stabilizerIndices": fixed,
            "stabilizerOrder": len(fixed), "orbitStabilizerVerified": len(set(images))*len(fixed) == len(operations)}


def identify_group_generators(operations):
    """Coordinate expressions, the purpose of upstream IdentifyGroupGenerators."""
    if not operations:
        return []
    d = len(operations[0][0])
    names = list("xyztuv") if d <= 6 else ["x"+str(i+1) for i in range(d)]
    output = []
    for r, t in operations:
        coordinates = []
        for row, shift in zip(r, t):
            terms = []
            for a, name in zip(row, names):
                if a:
                    terms.append(("+" if a > 0 else "-") + ("" if abs(a) == 1 else str(abs(a))+"*") + name)
            if shift:
                terms.append(("+" if shift > 0 else "-")+str(abs(shift)))
            coordinates.append(("".join(terms).lstrip("+")) or "0")
        output.append(coordinates)
    return output


def invariant_gram(rotations):
    d = len(rotations[0])
    result = [[F(0) for _ in range(d)] for _ in range(d)]
    for r in rotations:
        gram = matmul(transpose(r), r)
        for i in range(d):
            for j in range(d):
                result[i][j] += gram[i][j]
    return matrix(result)


def _sympy_matrix(a):
    import sympy as sp
    return sp.Matrix([[sp.Rational(x.numerator, x.denominator) for x in row] for row in a])


def _from_sympy(a):
    return tuple(tuple(F(int(x.p), int(x.q)) for x in a.row(i)) for i in range(a.rows))


def _lattice_basis(vectors, d):
    """Columns spanning a rational lattice, using exact Hermite normal form."""
    import sympy as sp
    from sympy.matrices.normalforms import hermite_normal_form
    if not vectors:
        raise ValueError("The generated affine group has no full-rank translation lattice")
    denominator = lcm(*(x.denominator for v in vectors for x in v))
    a = sp.Matrix([[int(v[i]*denominator) for v in vectors] for i in range(d)])
    h = hermite_normal_form(a)
    if h.cols != d:
        raise ValueError("The generated affine group has a translation subgroup of rank below its dimension")
    return _from_sympy(h/denominator)


def _lll_gram(gram):
    """LLL for an exact positive definite Gram form; rows are basis coefficients."""
    d = len(gram)
    basis = [list(row) for row in identity(d)]
    def inner(a, b):
        return sum(x*y for x, y in zip(a, matvec(gram, b)))
    def gs():
        orth, norms, mu = [], [], [[F(0)]*d for _ in range(d)]
        for i, b in enumerate(basis):
            v = b[:]
            for j in range(i):
                mu[i][j] = inner(b, orth[j])/norms[j]
                v = [x-mu[i][j]*y for x, y in zip(v, orth[j])]
            orth.append(v)
            norms.append(inner(v, v))
        return norms, mu
    k, iterations = 1, 0
    while k < d:
        iterations += 1
        if iterations > 10000:
            raise SearchLimitError("LLL iteration limit exceeded")
        norms, mu = gs()
        for j in range(k-1, -1, -1):
            q = (mu[k][j]+F(1, 2)).__floor__()
            if q:
                basis[k] = [x-q*y for x, y in zip(basis[k], basis[j])]
                norms, mu = gs()
        if norms[k] >= (F(3, 4)-mu[k][k-1]**2)*norms[k-1]:
            k += 1
        else:
            basis[k], basis[k-1] = basis[k-1], basis[k]
            k = max(1, k-1)
    if determinant(basis) < 0:
        basis[0] = [-x for x in basis[0]]
    return transpose(basis)


def simplify_affine_generators(generators, translation_basis=None, max_order=192):
    """Compute a full translation lattice, orientation-preserving LLL basis and SNoT origin.

    The input is an actual generating set, not a list of coset representatives.
    Pass translation_basis=I to explicitly adjoin lattice translations. A finite
    point group and full-rank rational translations are required. Every returned
    transformation is verified against the input and the derived lattice.
    """
    if not generators:
        raise ValueError("At least one generator is required")
    d = len(generators[0][0])
    gens = list(generators)
    if translation_basis is not None:
        b = matrix(translation_basis)
        if len(b) != d or len(b[0]) != d or not determinant(b):
            raise ValueError("Invalid translation basis")
        gens += [(identity(d), tuple(v)) for v in transpose(b)]
    e = affine_identity(d)
    lifts, queue = {e[0]: e}, deque([e[0]])
    while queue:
        a = lifts[queue.popleft()]
        for g in gens:
            c = compose(a, g)
            if c[0] not in lifts:
                lifts[c[0]] = c
                queue.append(c[0])
                if len(lifts) > max_order:
                    raise SearchLimitError("Point group exceeds the finite-order limit")
    translations = []
    for a in lifts.values():
        for g in gens:
            c = compose(a, g)
            translations.append(tuple(x-y for x, y in zip(c[1], lifts[c[0]][1])))
    b = _lattice_basis(translations, d)
    standardized = change_basis(list(lifts.values()), b)
    if any(x.denominator != 1 for r, _ in standardized for row in r for x in row):
        raise ValueError("Derived translations do not define a preserved lattice")
    reduction = _lll_gram(invariant_gram([r for r, _ in standardized]))
    b = matmul(b, reduction)
    standardized = change_basis(list(lifts.values()), b)
    average = tuple(sum(t[j] for _, t in standardized)/len(standardized) for j in range(d))
    origin = matvec(b, average)
    reduced = change_basis(list(lifts.values()), b, origin)
    reduced = affine_closure(reduced, max_order)
    n = len(reduced)
    return {"basis": b, "origin": origin, "conjugator": augmented_matrix_on_left(b, origin),
            "operations": reduced, "orientationPreserved": determinant(b) > 0,
            "denominatorBoundVerified": all((n*x).denominator == 1 for _, t in reduced for x in t),
            "translationLatticeRank": d, "pointGroupOrder": n}


def _origin_solution(source, target, max_candidates=100000):
    """Solve (R-I)o=t_target-t_source (mod Z) exactly for matching rotations."""
    source_by_r, target_by_r = dict(source), dict(target)
    if len(source_by_r) != len(source) or len(target_by_r) != len(target):
        return None
    if source_by_r.keys() != target_by_r.keys():
        return None
    d = len(source[0][0])
    a, b = [], []
    for r, t in source:
        for i in range(d):
            a.append(tuple(r[i][j]-F(i == j) for j in range(d)))
            b.append(target_by_r[r][i]-t[i])
    if any(x.denominator != 1 for row in a for x in row):
        raise ValueError("Origin matching requires integral rotations")
    # Select independent rows with exact elimination; dimension is small.
    reduced, rows, pivots = [], [], []
    for i, row in enumerate(a):
        v = list(row)
        for rr, pivot in zip(reduced, pivots):
            q = v[pivot]
            v = [x-q*y for x, y in zip(v, rr)]
        pivot = next((j for j, x in enumerate(v) if x), None)
        if pivot is not None:
            q = v[pivot]
            reduced.append([x/q for x in v])
            rows.append(i)
            pivots.append(pivot)
    rank = len(rows)
    if rank == 0:
        return (F(0),)*d if all(x.denominator == 1 for x in b) else None
    cols = next(cols for cols in combinations(range(d), rank)
                if determinant(tuple(tuple(a[i][j] for j in cols) for i in rows)))
    minor = tuple(tuple(a[i][j] for j in cols) for i in rows)
    det = abs(int(determinant(minor)))
    if det**rank > max_candidates:
        raise SearchLimitError("Origin-congruence search exceeded its exact enumeration budget")
    inv = inverse(minor)
    for offsets in product(range(det), repeat=rank):
        values = matvec(inv, [b[i]+n for i, n in zip(rows, offsets)])
        origin = [F(0)]*d
        for j, value in zip(cols, values):
            origin[j] = value % 1
        if all((sum(x*y for x, y in zip(row, origin))-rhs).denominator == 1 for row, rhs in zip(a, b)):
            return tuple(origin)
    return None


@lru_cache(maxsize=12)
def signed_permutation_bases(d, positive_only=False):
    result = []
    for p in permutations(range(d)):
        for signs in product([-1, 1], repeat=d):
            b = tuple(tuple(F(signs[j] if p[j] == i else 0) for j in range(d)) for i in range(d))
            if not positive_only or determinant(b) > 0:
                result.append(b)
    return tuple(sorted(result, key=lambda b: b != identity(d)))


def affine_equivalence(source, target, bases=None, positive_only=False):
    """Return a verified affine conjugator from a finite, declared basis search.

    A miss is 'no_match_in_search', never a proof of nonisomorphism under GL(Z).
    Integer translations must already be primitive (one coset per rotation).
    """
    if len(source) != len(target):
        return {"status": "different_quotient_orders", "equivalent": False}
    d = len(source[0][0])
    if len(target[0][0]) != d:
        raise ValueError("Dimensions differ")
    bases = bases if bases is not None else signed_permutation_bases(d, positive_only)
    target_set = set(target)
    for b in bases:
        b = matrix(b)
        if abs(determinant(b)) != 1 or any(x.denominator != 1 for row in b for x in row):
            raise ValueError("Comparison basis must preserve the primitive integer lattice")
        transformed = change_basis(source, b)
        origin = _origin_solution(transformed, target)
        if origin is not None:
            old_origin = matvec(b, origin)
            check = {(r, tuple(x % 1 for x in t)) for r, t in change_basis(source, b, old_origin)}
            if check == target_set:
                return {"status": "verified", "equivalent": True, "basis": b, "origin": old_origin,
                        "determinant": determinant(b), "orientationPreserved": determinant(b) > 0,
                        "identityVerified": True}
    return {"status": "no_match_in_search", "equivalent": None,
            "scope": "Supplied bases or signed-permutation bases plus every compatible rational origin shift"}


def orbit_space_group_by_normalizers(operations, normalizers, max_orbit=128):
    """SNoT orbit under supplied GL(d,Z) normalizer generators, modulo origins.

    This faithfully implements the orbit operation, while requiring callers to
    supply the normalizer generators instead of computing an unbounded GL(Z)
    normalizer. Every normalizer and every equivalence test is checked exactly.
    """
    operations = affine_closure(operations)
    d = len(operations[0][0])
    p = {r for r, _ in operations}
    if len(p) != len(operations):
        raise ValueError("Normalizer SNoT orbit requires a primitive translation lattice")
    normalizers = [matrix(n) for n in normalizers]
    for n in normalizers:
        if len(n) != d or abs(determinant(n)) != 1 or any(x.denominator != 1 for row in n for x in row):
            raise ValueError("Normalizer generators must be unimodular integer matrices")
        ni = inverse(n)
        if {matmul(matmul(ni, r), n) for r in p} != p:
            raise ValueError("Supplied matrix does not normalize this point group")
    representatives, bases = [operations], [identity(d)]
    position = 0
    while position < len(representatives):
        for n in normalizers:
            candidate = affine_closure(change_basis(representatives[position], n))
            if all(_origin_solution(candidate, existing) is None for existing in representatives):
                if len(representatives) >= max_orbit:
                    raise SearchLimitError("Normalizer orbit exceeded its size budget")
                representatives.append(candidate)
                bases.append(matmul(bases[position], n))
        position += 1
    rotations = sorted(p)
    return {"orbitSize": len(representatives), "normalizerGenerators": normalizers,
            "rotations": rotations, "vectorSystems": [[dict(ops)[r] for r in rotations] for ops in representatives],
            "basisRepresentatives": bases, "operations": [[operation_json(op) for op in ops] for ops in representatives],
            "scope": "Exact SNoT orbit under the supplied normalizer subgroup, modulo all rational origin shifts"}


ENANTIOMORPHIC_PAIRS = ((76, 78), (91, 95), (92, 96), (144, 145), (151, 153),
                       (152, 154), (169, 170), (171, 172), (178, 179), (180, 181), (212, 213))


def database_groups(database):
    if isinstance(database, str):
        database = json.loads(database)
    if isinstance(database, dict):
        database = database.get("groups", [])
    if not isinstance(database, list):
        raise ValueError("Supply the SpaceGroupIrep-derived space-groups.json database")
    return database


def identify_space_group(operations, database, search_basis=False):
    if len(operations[0][0]) != 3:
        return {"status": "unsupported_dimension", "matches": [], "scope": "3D BC primitive database"}
    if len({r for r, _ in operations}) != len(operations):
        return {"status": "nonprimitive_lattice", "matches": [],
                "scope": "Simplify first: identification expects one coset per point-group element"}
    rotations = {r for r, _ in operations}
    matches = []
    for group in database_groups(database):
        if len(group["operations"]) != len(operations):
            continue
        target = [(r, tuple(x % 1 for x in t)) for r, t in map(operation, group["operations"])]
        if not search_basis and {r for r, _ in target} != rotations:
            continue
        match = affine_equivalence(operations, target,
                                   None if search_basis else [identity(3)], positive_only=True)
        if match["equivalent"]:
            matches.append({"number": group["number"], "symbol": group["symbol"], **match})
    return {"status": "verified" if len(matches) == 1 else "multiple_verified" if matches else "no_match_in_search",
            "matches": matches,
            "scope": "3D BC primitive database; " + ("orientation-preserving signed-permutation bases" if search_basis else "current basis") + "; exact origin congruences"}


def _prime(n):
    return n >= 2 and all(n % k for k in range(2, int(n**0.5)+1))


@lru_cache(maxsize=128)
def phipn_inverse(n):
    """Prime powers q with Euler phi(q)=n (CrystKit PhipnInverse)."""
    if isinstance(n, bool) or not isinstance(n, int) or n < 1:
        raise ValueError("n must be a positive integer")
    result = []
    for p in range(2, n+2):
        if _prime(p):
            q, phi = p, p-1
            while phi <= n:
                if phi == n:
                    result.append(q)
                q *= p
                phi *= p
    return sorted(result)


def _partitions(n, minimum=1):
    if n == 0:
        yield ()
    for i in range(minimum, n+1):
        for tail in _partitions(n-i, i):
            yield (i,)+tail


@lru_cache(maxsize=64)
def new_finite_orders_glz(n):
    """Element orders first possible in dimension n; the upstream exact algorithm.

    The upstream function returns [] for odd n, including n=1. Use
    finite_orders_glz for ALL allowed orders, including identity and inversion.
    """
    if isinstance(n, bool) or not isinstance(n, int) or n < 1 or n % 2:
        return []
    if n > 48:
        raise SearchLimitError("Browser finite-order enumeration is limited to dimension 48")
    result = set()
    for partition in _partitions(n//2):
        choices = [phipn_inverse(2*x) for x in partition]
        partial = {1}
        for choice in choices:
            partial = {old*q for old in partial for q in choice if gcd(old, q) == 1}
        result.update(partial)
    result.update(2*x for x in list(result) if x % 2)
    return sorted(result)


def finite_orders_glz(dimension):
    if isinstance(dimension, bool) or not isinstance(dimension, int) or not 1 <= dimension <= 48:
        raise ValueError("Dimension must be an integer from 1 to 48")
    result = {1, 2}
    for n in range(2, dimension+1, 2):
        result.update(new_finite_orders_glz(n))
    return sorted(result)


def direct_sum_decomposition_matrix(values):
    """Contiguous diagonal blocks, without permuting rows/columns (upstream semantics)."""
    a = matrix(values)
    nr, nc, row0, col0 = len(a), len(a[0]), 0, 0
    result = []
    while row0 < nr and col0 < nc:
        r, c = row0+1, col0+1
        while True:
            newc = max([c] + [j+1 for i in range(row0, r) for j in range(c, nc) if a[i][j]])
            newr = max([r] + [i+1 for i in range(r, nr) for j in range(col0, newc) if a[i][j]])
            if (newr, newc) == (r, c):
                break
            r, c = newr, newc
        if r == nr:
            c = nc
        if c == nc:
            r = nr
        result.append({"rows": [row0, r], "columns": [col0, c],
                       "matrix": tuple(tuple(a[i][j] for j in range(col0, c)) for i in range(row0, r))})
        row0, col0 = r, c
    return result


def conjugator_matrix_groups(left, right, max_assignments=4000):
    """Certified rational conjugacy via finite-group generator matching and intertwiners.

    Search-budget exhaustion is explicitly inconclusive. A successful returned C
    satisfies C^-1*G_left*C=G_right, verified on EVERY group element. Failed bounded
    invertible-intertwiner sampling cannot certify nonconjugacy and is reported so.
    """
    a = finite_matrix_closure(left)
    b = finite_matrix_closure(right)
    if len(a[0]) != len(b[0]) or len(a) != len(b):
        return {"status": "not_conjugate", "reason": "Different dimensions or group orders"}
    ta, tb = multiplication_table(a, False), multiplication_table(b, False)
    generators = group_properties(ta)["minimumGeneratorIndices"]
    if not generators:
        return {"status": "verified", "conjugator": identity(len(a[0])), "identityVerified": True}
    def signature(g):
        return tuple(_sympy_matrix(g).charpoly().all_coeffs())
    signatures = [signature(g) for g in b]
    choices = [[i for i, sig in enumerate(signatures) if sig == signature(a[g])] for g in generators]
    if any(not choice for choice in choices):
        return {"status": "not_conjugate", "reason": "Generator characteristic polynomial absent in target group"}
    import sympy as sp
    import random
    d, attempts, unresolved = len(a[0]), 0, False
    for images in product(*choices):
        attempts += 1
        if attempts > max_assignments:
            return {"status": "inconclusive", "reason": "Generator-assignment budget exceeded", "attempts": attempts-1}
        if len(subgroup(tb, images)) != len(b):
            continue
        equations = []
        for gi, hi in zip(generators, images):
            ga, gb = _sympy_matrix(a[gi]), _sympy_matrix(b[hi])
            for i in range(d):
                for j in range(d):
                    row = [sp.Rational(0)]*(d*d)
                    for k in range(d):
                        row[k*d+j] += ga[i, k]
                        row[i*d+k] -= gb[k, j]
                    equations.append(row)
        null = sp.Matrix(equations).nullspace()
        if not null:
            continue
        matrices = [sp.Matrix(d, d, v) for v in null]
        candidates = [sp.eye(d)] + matrices + [sum(matrices, sp.zeros(d))]
        rng = random.Random(1729)
        candidates += [sum((rng.randint(-3, 3)*m for m in matrices), sp.zeros(d)) for _ in range(48)]
        for c in candidates:
            if not c.det() or any(_sympy_matrix(a[g])*c != c*_sympy_matrix(b[h]) for g, h in zip(generators, images)):
                continue
            cf = _from_sympy(c)
            ci = inverse(cf)
            if {matmul(matmul(ci, g), cf) for g in a} == set(b):
                return {"status": "verified", "conjugator": cf, "determinant": determinant(cf),
                        "identityVerified": True, "attempts": attempts}
        # Exact singular pencil proof for one-dimensional nullspace; otherwise
        # retain uncertainty rather than interpreting bounded sampling as proof.
        if len(null) > 1:
            unresolved = True
    return {"status": "inconclusive" if unresolved else "not_conjugate",
            "reason": "No invertible intertwiner found within bounded sampling" if unresolved else "Exhausted generator images with no invertible intertwiner",
            "attempts": attempts}


def jsonable(value):
    if isinstance(value, F):
        return int(value) if value.denominator == 1 else str(value)
    if isinstance(value, (tuple, list)):
        return [jsonable(x) for x in value]
    if isinstance(value, dict):
        return {key: jsonable(x) for key, x in value.items()}
    return value


def operation_json(op):
    return {"rotation": op[0], "translation": op[1]}


def _input_operations(payload, database=None, key=None):
    entry = payload[key] if key else payload
    if isinstance(entry, list):
        return list(map(operation, entry))
    if "group_number" in entry:
        raw_number = rational(entry["group_number"])
        if raw_number.denominator != 1:
            raise ValueError("Space-group number must be an integer")
        number = int(raw_number)
        group = next((g for g in database_groups(database) if g["number"] == number), None)
        if group is None:
            raise ValueError("Space-group number must be between 1 and 230")
        ops = list(map(operation, group["operations"]))
    else:
        values = entry.get("operations", entry.get("generators", []))
        if not values:
            raise ValueError("Supply group_number, operations, or generators")
        ops = list(map(operation, values))
    if "basis" in entry or "origin" in entry:
        ops = change_basis(ops, entry.get("basis", identity(len(ops[0][0]))), entry.get("origin"))
    return ops


def run(payload, database=None):
    """Execute a JSON request; return JSON-compatible scientific results."""
    if isinstance(payload, str):
        payload = json.loads(payload)
    action = payload.get("action", "analyze")
    if action == "finite_orders":
        n = payload.get("dimension", 3)
        return {"action": action, "dimension": n, "allowedElementOrders": finite_orders_glz(n),
                "newElementOrders": new_finite_orders_glz(n),
                "primePowersWithTotient": phipn_inverse(n),
                "meaning": "Orders of finite-order elements of GL(n,Z), not orders of finite point groups"}
    if action == "blocks":
        return jsonable({"action": action, "blocks": direct_sum_decomposition_matrix(payload["matrix"]),
                         "meaning": "Contiguous blocks without row or column permutations"})
    if action == "conjugacy":
        return jsonable({"action": action, **conjugator_matrix_groups(payload["left"], payload["right"])})
    if action == "compare":
        left = affine_closure(_input_operations(payload, database, "left"))
        right = affine_closure(_input_operations(payload, database, "right"))
        return jsonable({"action": action, **affine_equivalence(left, right, payload.get("bases"), payload.get("positive_only", False))})
    operations = _input_operations(payload, database)
    if action == "normalizer_orbit":
        return jsonable({"action": action, **orbit_space_group_by_normalizers(operations, payload.get("normalizers", []))})
    if action == "simplify":
        supplied = payload.get("translation_basis")
        result = simplify_affine_generators(operations, supplied)
        if database is not None:
            result["identification"] = identify_space_group(result["operations"], database, True)
        result["operations"] = [operation_json(op) for op in result["operations"]]
        return jsonable({"action": action, **result})
    if action != "analyze":
        raise ValueError("Unknown CrystKit action")
    operations = affine_closure(operations)
    d = len(operations[0][0])
    rotations = list(dict.fromkeys(r for r, _ in operations))
    table = multiplication_table(operations)
    properties = group_properties(table)
    gens = [operations[i] for i in properties["minimumGeneratorIndices"]]
    gram = invariant_gram(rotations)
    primitive = len(rotations) == len(operations)
    symmorphic_origin = _origin_solution(operations, [(r, (F(0),)*d) for r in rotations]) if primitive else None
    identification = identify_space_group(operations, database, payload.get("search_basis", False)) if database is not None else {"status": "database_not_supplied", "matches": []}
    matches = identification.get("matches", [])
    partner = None
    if len(matches) == 1:
        n = matches[0]["number"]
        partner = next((b if n == a else a for a, b in ENANTIOMORPHIC_PAIRS if n in (a, b)), None)
    result = {"action": action, "dimension": d, "quotient": properties,
              "pointGroupOrder": len(rotations), "primitiveTranslationLattice": primitive,
              "symmorphic": symmorphic_origin is not None if primitive else None,
              "symmorphicOrigin": symmorphic_origin,
              "orientationPreserving": all(determinant(r) > 0 for r in rotations),
              "determinantCounts": dict(Counter(str(determinant(r)) for r in rotations)),
              "operations": [operation_json(op) for op in operations],
              "quotientGenerators": [operation_json(op) for op in gens],
              "generatorExpressions": identify_group_generators(gens),
              "invariantGramMatrix": gram,
              "gramInvariantVerified": all(matmul(matmul(transpose(r), gram), r) == gram for r in rotations),
              "identification": identification, "enantiomorphicPartner": partner,
              "enantiomorphismMeaning": "Known 3D IT pair for a uniquely identified type; orientation-preserving groups need not form an enantiomorphic pair",
              "orbit": point_orbit(operations, payload.get("point", ["1/7"]*d)),
              "limits": ["No CARAT 4D–6D classifier or unbounded GL(n,Z) normalizer",
                         "Minimum generators refer to the finite quotient, not the infinite affine group"]}
    return jsonable(result)


# Faithful upstream names for directly corresponding mathematical functions.
AugmentedMatrixOnLeft = augmented_matrix_on_left
IdentifyGroupGenerators = identify_group_generators
DirectSumDecompositionMatrix = direct_sum_decomposition_matrix
PhipnInverse = phipn_inverse
NewFiniteOrdersOfGLNZ = new_finite_orders_glz
ConjugatorMatrixGroups = conjugator_matrix_groups


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("request", help="JSON request file")
    parser.add_argument("--database", help="space-groups.json file")
    args = parser.parse_args()
    with open(args.request, encoding="utf-8") as f:
        request = json.load(f)
    db = None
    if args.database:
        with open(args.database, encoding="utf-8") as f:
            db = json.load(f)
    print(json.dumps(run(request, db), ensure_ascii=False, indent=2))
