"""Certified arithmetic normalizers of small integral finite groups.

The new algorithms cover every cyclic and elementary abelian 2-group integral
representation of dimension at most six, subject to explicit resource budgets.
They also certify characteristic-cyclic-subgroup reductions, repeated absolutely
irreducible integral tensor blocks and rational multiplicity-free real blocks.
They retain the lattice glue: a rational block decomposition alone is not an
integral decomposition. Schreier generators of a finite lattice orbit recover
the full stabilizer, including infinite congruence subgroups.

Other groups use the older certified cases/metric subgroup, with completeness
reported honestly.  No unsuccessful bounded search is a proof of completeness.
"""

from itertools import product, permutations
from math import gcd, prod, lcm, isqrt
import crystkit_browser as c
import crystkit_extensions as ext


def _sp():
    import sympy as sp
    return sp


def _key(a):
    return tuple(int(x) for x in a)


def _integer_kernel(a):
    """Saturated Z-kernel, using the unimodular Smith transformation."""
    D, _, V = ext._smith(a)
    return V[:, sum(D[i, i] != 0 for i in range(min(D.shape))):]


def _embed(small, start, d):
    result = _sp().eye(d)
    result[start:start+small.rows, start:start+small.cols] = small
    return result


def _deduplicate(matrices):
    result, seen = [], set()
    for a in matrices:
        key = _key(a)
        if key not in seen and a != _sp().eye(a.rows):
            result.append(a)
            seen.add(key)
    return result


def _entry_limit(a):
    if any(abs(int(x)).bit_length() > 512 for x in a):
        raise c.SearchLimitError("Normalizer Schreier words exceed the exact arithmetic resource limit")


def lattice_stabilizer(basis, ambient_generators, max_orbit=20000, max_generators=100000):
    """Stabilize Z^d in an overgroup preserving the intrinsic sublattice B Z^d.

    Ambient matrices use B coordinates.  D*B^-1 Z^d is an integer lattice
    containing D Z^d, so its orbit lies in a finite set of sublattices of
    (Z/DZ)^d.  An exhausted orbit, not a coefficient cutoff, proves completeness.
    """
    from sympy.matrices.normalforms import hermite_normal_form
    sp = _sp()
    d = basis.rows
    inverse = basis.inv()
    denominator = lcm(*(int(x.q) for x in inverse))
    scaled = denominator*inverse
    initial = hermite_normal_form(sp.Matrix(d, d, [int(x) for x in scaled]))
    initial_key = _key(initial)
    generators = _deduplicate(ambient_generators)
    if any(abs(a.det()) != 1 or any(x.q != 1 for x in a) for a in generators):
        raise ArithmeticError("Ambient lattice generators must be integral unimodular")
    states = [(initial, sp.eye(d))]
    indices = {initial_key: 0}
    result, result_keys = [], set()
    inverse_words = [sp.eye(d)]
    edges = 0
    for lattice, word in states:
        for a in generators:
            edges += 1
            target = hermite_normal_form(a*lattice)
            key = _key(target)
            next_word = a*word
            _entry_limit(next_word)
            if key not in indices:
                if len(states) >= max_orbit:
                    raise c.SearchLimitError("Finite lattice orbit exceeded max_orbit; the full normalizer is not certified")
                indices[key] = len(states)
                states.append((target, next_word))
                inverse_words.append(next_word.inv())
                continue
            schreier = inverse_words[indices[key]]*next_word
            if schreier == sp.eye(d):
                continue
            original = basis*schreier*inverse
            if any(x.q != 1 for x in original) or abs(original.det()) != 1:
                raise ArithmeticError("Schreier stabilizer failed its integral certificate")
            original_key = _key(original)
            if original_key not in result_keys:
                if len(result) >= max_generators:
                    raise c.SearchLimitError("Schreier generator count exceeded max_matrices; no completeness conclusion follows")
                result.append(c._from_sympy(original))
                result_keys.add(original_key)
    return {"generators": result, "latticeOrbitSize": len(states),
            "latticeOrbitEdges": edges, "glueExponent": denominator,
            "intrinsicLatticeIndex": abs(int(basis.det())),
            "intrinsicLatticeBasis": c._from_sympy(basis)}


def character_decomposition(group):
    """Intrinsic saturated simultaneous sign eigenspaces; None if not exponent 2."""
    sp = _sp()
    d = len(group[0])
    eye = c.identity(d)
    if any(c.matmul(g, g) != eye for g in group):
        return None
    gens = ext._choose_generators(group)
    blocks = []
    for signs in product((-1, 1), repeat=len(gens)):
        a = sp.Matrix.vstack(*(c._sympy_matrix(g)-sign*sp.eye(d) for g, sign in zip(gens, signs))) if gens else sp.zeros(0, d)
        basis = _integer_kernel(a)
        if basis.cols:
            character = []
            for g in group:
                v = c._sympy_matrix(g)*basis[:, 0]
                character.append(1 if v == basis[:, 0] else -1)
            blocks.append({"basis": basis, "character": tuple(character), "dimension": basis.cols})
    if sum(block["dimension"] for block in blocks) != d:
        raise ArithmeticError("Simultaneous eigenspaces did not span the representation")
    return blocks


def _sign_normalizer(group, max_orbit, max_matrices):
    sp = _sp()
    blocks = character_decomposition(group)
    if blocks is None:
        return None
    d = len(group[0])
    basis = sp.Matrix.hstack(*(block["basis"] for block in blocks))
    starts, start = [], 0
    ambient = []
    for block in blocks:
        starts.append(start)
        ambient.extend(_embed(c._sympy_matrix(g), start, d) for g in ext._gl_generators(block["dimension"]))
        start += block["dimension"]
    character_rows = {tuple(block["character"][i] for block in blocks) for i in range(len(group))}
    compatible = 0
    for p in permutations(range(len(blocks))):
        if any(blocks[i]["dimension"] != blocks[p[i]]["dimension"] for i in range(len(blocks))):
            continue
        if {tuple(row[p[i]] for i in range(len(blocks))) for row in character_rows} != character_rows:
            continue
        compatible += 1
        a = sp.zeros(d)
        for j, target in enumerate(p):
            for k in range(blocks[j]["dimension"]):
                a[starts[target]+k, starts[j]+k] = 1
        ambient.append(a)
    result = lattice_stabilizer(basis, ambient, max_orbit, max_matrices)
    finite = all(block["dimension"] == 1 for block in blocks)
    ambient_order = 2**d*compatible if finite else None
    result.update({"complete": True, "finite": finite,
                   "normalizerOrder": ambient_order//result["latticeOrbitSize"] if finite else None,
                   "algorithm": "sign-character-lattice-schreier",
                   "characterDimensions": [block["dimension"] for block in blocks],
                   "compatibleCharacterPermutations": compatible,
                   "certificate": "Saturated integer character lattices; full GL(m,Z) in every multiplicity block; every compatible character permutation; exhausted finite glue-lattice orbit and Schreier stabilizer",
                   "scope": "Full GL(d,Z) normalizer of this integral elementary abelian 2-group representation"})
    return result


def _cyclic_generator(group):
    sp = _sp()
    order = len(group)
    if order == 1:
        return c._sympy_matrix(group[0])
    primes = list(sp.factorint(order))
    for g in group[1:]:
        a = c._sympy_matrix(g)
        if all(a**(order//p) != sp.eye(a.rows) for p in primes):
            return a
    return None


def _primitive_columns(a):
    from sympy.matrices.normalforms import smith_normal_form
    sp = _sp()
    if a.rank() != a.cols:
        return False
    D = smith_normal_form(a, domain=sp.ZZ)
    return all(abs(D[i, i]) == 1 for i in range(a.cols))


def _module_basis(a, degree, max_trials):
    """Find and VERIFY a free Z[zeta]-basis; PID ensures existence in degree <=6.

    Each accepted cyclic summand is saturated as a Z lattice, hence has a
    torsion-free O quotient.  In the seven small cyclotomic PIDs that quotient
    is free. A budget failure is reported as inconclusive, never as non-freeness.
    """
    sp = _sp()
    d = a.rows
    if degree == 1:
        return sp.eye(d), 0
    selected = sp.zeros(d, 0)
    seen = set()
    trials = 0
    radius = 0
    while selected.cols < d:
        radius += 1
        candidates = []
        if radius == 1:
            candidates.extend(tuple(int(i == j) for i in range(d)) for j in range(d))
        candidates = iter(candidates)
        def vectors():
            yield from candidates
            yield from product(range(-radius, radius+1), repeat=d)
        progress = False
        for values in vectors():
            if max(map(abs, values), default=0) != radius or values in seen:
                continue
            seen.add(values)
            if not any(values) or next(x for x in values if x) < 0:
                continue
            trials += 1
            if trials > max_trials:
                raise c.SearchLimitError("Cyclotomic module-basis search exceeded max_module_trials; normalizer completeness is not established")
            v = sp.Matrix(values)
            columns = [v]
            for _ in range(1, degree):
                columns.append(a*columns[-1])
            trial = selected.row_join(sp.Matrix.hstack(*columns))
            if _primitive_columns(trial):
                selected = trial
                progress = True
                if selected.cols == d:
                    break
        # After adding a summand, retry short vectors: independence changed.
        if progress and selected.cols < d:
            radius, seen = 0, set()
    if abs(selected.det()) != 1:
        raise ArithmeticError("Cyclotomic module basis is not unimodular")
    return selected, trials


def _companion(conductor):
    sp = _sp()
    x = sp.Symbol("x")
    p = sp.Poly(sp.cyclotomic_poly(conductor, x), x)
    d = p.degree()
    a = sp.zeros(d)
    for j in range(d-1):
        a[j+1, j] = 1
    for i in range(d):
        a[i, d-1] = -p.nth(i)
    return a


def _units(a, conductor):
    """Full unit group for all cyclotomic fields of degree <=6.

    Prime-power conductors: circular units have index h+=1.  For conductor 12,
    1-zeta supplies the extra CM unit, its squared modulus being 2-sqrt(3).
    Conductors 2m (m odd) are the same field, with primitive m-th root -zeta.
    See the checked proof table in dist/docs/integral-normalizer.md.
    """
    sp = _sp()
    f = conductor//2 if conductor % 4 == 2 else conductor
    t = -a if conductor % 4 == 2 else a
    eye = sp.eye(a.rows)
    result = [-eye, a]
    if f == 12:
        result.append(eye-t)
    elif f in (3, 4, 5, 7, 8, 9):
        for k in range(2, f):
            if gcd(k, f) == 1:
                result.append(sum((t**j for j in range(k)), sp.zeros(a.rows)))
    elif f != 1:
        raise ArithmeticError("Unsupported cyclotomic field in dimension at most six")
    if any(abs(u.det()) != 1 for u in result):
        raise ArithmeticError("Cyclotomic unit has nonunit norm")
    return _deduplicate(result)


def _cyclotomic_normalizer(group, max_orbit, max_matrices, max_module_trials):
    sp = _sp()
    generator = _cyclic_generator(group)
    if generator is None:
        return None
    d, order = generator.rows, len(group)
    blocks, ambient, start = [], [], 0
    trials = 0
    for n in sp.divisors(order):
        degree = int(sp.totient(n))
        if degree > d:
            continue
        x = sp.Symbol("x")
        polynomial = sp.Poly(sp.cyclotomic_poly(n, x), x)
        value = sum((coefficient*generator**i for (i,), coefficient in polynomial.terms()), sp.zeros(d))
        lattice_basis = _integer_kernel(value)
        if not lattice_basis.cols:
            continue
        local = (lattice_basis.T*lattice_basis).inv()*lattice_basis.T*generator*lattice_basis
        if any(v.q != 1 for v in local):
            raise ArithmeticError("Cyclotomic component lattice is not invariant")
        module_basis, attempts = _module_basis(local, degree, max_module_trials-trials)
        trials += attempts
        integral_basis = lattice_basis*module_basis
        a = _companion(n)
        multiplicity = lattice_basis.cols//degree
        if local*module_basis != module_basis*sp.diag(*(a for _ in range(multiplicity))):
            raise ArithmeticError("Cyclotomic module basis failed its action certificate")
        blocks.append({"conductor": int(n), "degree": degree, "multiplicity": multiplicity,
                       "basis": integral_basis, "start": start, "companion": a})
        # GL_m(O) for m>1 occurs only for O=Z, Z[i], or Z[zeta_3]
        # in dimension <=6. These are Euclidean, so elementary matrices,
        # permutations and a full diagonal unit group generate GL_m(O).
        for j in range(multiplicity):
            for u in _units(a, n):
                ambient.append(_embed(u, start+j*degree, d))
        for i in range(multiplicity):
            for j in range(multiplicity):
                if i == j:
                    continue
                for k in range(degree):
                    e = sp.eye(d)
                    e[start+i*degree:start+(i+1)*degree, start+j*degree:start+(j+1)*degree] = a**k
                    ambient.append(e)
        for i in range(multiplicity-1):
            swap = sp.eye(d)
            for k in range(degree):
                p, q = start+i*degree+k, start+(i+1)*degree+k
                swap.row_swap(p, q)
            ambient.append(swap)
        start += lattice_basis.cols
    basis = sp.Matrix.hstack(*(block["basis"] for block in blocks))
    if basis.cols != d or basis.det() == 0:
        raise ArithmeticError("Cyclotomic summands do not span the representation")
    automorphisms = [k for k in range(1, max(order, 2)) if gcd(k, order) == 1]
    for k in automorphisms:
        galois = sp.zeros(d)
        for block in blocks:
            a, degree, start = block["companion"], block["degree"], block["start"]
            e0 = sp.eye(degree)[:, 0]
            sigma = sp.Matrix.hstack(*(a**(k*j)*e0 for j in range(degree)))
            for j in range(block["multiplicity"]):
                i = start+j*degree
                galois[i:i+degree, i:i+degree] = sigma
        ambient.append(galois)
    result = lattice_stabilizer(basis, ambient, max_orbit, max_matrices)
    finite = all(block["degree"] <= 2 and block["multiplicity"] == 1 for block in blocks)
    ambient_order = prod(2 if block["degree"] == 1 else (4 if block["conductor"] == 4 else 6) for block in blocks)*len(automorphisms) if finite else None
    result.update({"complete": True, "finite": finite,
                   "normalizerOrder": ambient_order//result["latticeOrbitSize"] if finite else None,
                   "algorithm": "cyclotomic-module-lattice-schreier",
                   "cyclicGenerator": c._from_sympy(generator), "cyclicOrder": order,
                   "cyclotomicComponents": [{"conductor": b["conductor"], "degree": b["degree"], "multiplicity": b["multiplicity"]} for b in blocks],
                   "moduleBasisTrials": trials, "galoisAutomorphisms": automorphisms,
                   "certificate": "Verified free bases over the small cyclotomic PID rings; full field units; Euclidean elementary generators for repeated blocks; every cyclic-group automorphism; exhausted finite glue-lattice orbit and Schreier stabilizer",
                   "scope": "Full GL(d,Z) normalizer of this finite cyclic integral representation in dimension at most six"})
    return result


def _characteristic_cyclic_subgroups(group):
    """Cyclic subgroups unique among all cyclic subgroups of their order."""
    eye = group[0]
    by_order = {}
    seen = set()
    for g in group:
        if g in seen:
            continue
        powers, current = [eye], g
        while current != eye:
            powers.append(current)
            current = c.matmul(current, g)
        size = len(powers)
        if size <= 2:
            continue
        subgroup = frozenset(powers)
        by_order.setdefault(size, set()).add(subgroup)
        # Skip only the other generators, not elements of proper subgroups.
        seen.update(powers[k] for k in range(size) if gcd(k, size) == 1)
    return [[eye]+sorted(next(iter(groups))-{eye}) for size, groups in sorted(by_order.items(), reverse=True) if len(groups) == 1]


def _point_group_stabilizer(group, ambient, max_orbit, max_matrices):
    """Schreier stabilizer for conjugation on a group orbit, if it closes.

    Unlike the glue orbit this orbit need not be finite. Exhaustion proves a
    complete stabilizer; reaching a budget returns None, not a negative result.
    """
    sp = _sp()
    d = len(group[0])
    original = tuple(sorted((_key(c._sympy_matrix(g)) for g in group)))
    matrices = [(c._sympy_matrix(g), c._sympy_matrix(c.inverse(g))) for g in ambient]
    states = [(original, sp.eye(d))]
    indices = {original: 0}
    inverse_words = [sp.eye(d)]
    result, keys = [], set()
    for point_set, word in states:
        point_matrices = [sp.Matrix(d, d, entries) for entries in point_set]
        for n, ni in matrices:
            target = tuple(sorted(_key(n*g*ni) for g in point_matrices))
            next_word = n*word
            _entry_limit(next_word)
            if target not in indices:
                if len(states) >= max_orbit:
                    return None
                indices[target] = len(states)
                states.append((target, next_word))
                inverse_words.append(next_word.inv())
                continue
            schreier = inverse_words[indices[target]]*next_word
            key = _key(schreier)
            if schreier != sp.eye(d) and key not in keys:
                if len(result) >= max_matrices:
                    return None
                keys.add(key)
                result.append(c._from_sympy(schreier))
    return {"generators": result, "pointGroupConjugacyOrbitSize": len(states)}


def _characteristic_normalizer(group, max_orbit, max_matrices, max_module_trials,
                              max_point_orbit):
    for subgroup in _characteristic_cyclic_subgroups(group):
        base = _cyclotomic_normalizer(subgroup, max_orbit, max_matrices, max_module_trials)
        if base is None or not base["complete"]:
            continue
        result = _point_group_stabilizer(group, base["generators"], max_point_orbit, max_matrices)
        if result is None:
            continue
        finite = base["finite"]
        result.update({"complete": True, "finite": finite,
                       "normalizerOrder": base["normalizerOrder"]//result["pointGroupConjugacyOrbitSize"] if finite else None,
                       "algorithm": "characteristic-cyclic-subgroup-schreier",
                       "characteristicSubgroupOrder": len(subgroup),
                       "characteristicSubgroupNormalizer": base,
                       "certificate": "The cyclic subgroup is unique of its order and therefore characteristic; its full integral normalizer is certified; the finite conjugacy orbit of the entire point group was exhausted and its Schreier stabilizer computed",
                       "scope": "Full integral normalizer, certified through a characteristic cyclic subgroup"})
        return result
    return None


def _tensor_normalizer(group, max_vectors, max_matrices, tensor_basis=None):
    """Full arithmetic normalizer of repeated absolutely irreducible Z blocks.

    An exact (possibly user supplied) unimodular basis is verified. Schur's
    lemma makes every rational intertwiner X tensor A. After X is made a
    primitive integer matrix, integrality forces A integral, and determinant
    one forces both factors unimodular. Thus no rational normalizer cosets are
    lost by combining N_GL(r,Z)(P0) with GL(m,Z).
    """
    sp = _sp()
    d = len(group[0])
    basis = sp.eye(d) if tensor_basis is None else c._sympy_matrix(c.matrix(tensor_basis))
    if basis.shape != (d, d) or any(x.q != 1 for x in basis) or abs(basis.det()) != 1:
        raise ValueError("tensor_basis must be an integral unimodular d by d matrix")
    inverse = basis.inv()
    transformed = [inverse*c._sympy_matrix(g)*basis for g in group]
    for r in range(2, d):
        if d % r:
            continue
        multiplicity = d//r
        small = [a[:r, :r] for a in transformed]
        if any(a != sp.diag(*(b for _ in range(multiplicity))) for a, b in zip(transformed, small)):
            continue
        small_group = [c._from_sympy(a) for a in small]
        equations = []
        variables = sp.symbols(f"x0:{r*r}")
        x = sp.Matrix(r, r, variables)
        for a in ext._choose_generators(small_group):
            s = c._sympy_matrix(a)
            equations.extend(list(x*s-s*x))
        system, _ = sp.linear_eq_to_matrix(equations, variables)
        if r*r-system.rank() != 1:
            continue
        base = ext.integral_normalizer(small_group, max_vectors, max_matrices)
        if not base["complete"]:
            continue
        result_generators = [sp.diag(*(c._sympy_matrix(g) for _ in range(multiplicity))) for g in base["generators"]]
        result_generators += [sp.kronecker_product(c._sympy_matrix(g), sp.eye(r)) for g in ext._gl_generators(multiplicity)]
        return {"complete": True, "finite": False, "normalizerOrder": None,
                "generators": [c._from_sympy(basis*g*inverse) for g in _deduplicate(result_generators)],
                "algorithm": "absolutely-irreducible-tensor-normalizer",
                "irreducibleDimension": r, "multiplicity": multiplicity,
                "tensorBasis": c._from_sympy(basis), "irreducibleNormalizer": base,
                "certificate": "Verified unimodular decomposition into identical integral blocks with rational commutant Q; full irreducible normalizer and GL(m,Z) multiplicity generators; primitive Kronecker factors and determinant one exclude further rational cosets",
                "scope": "Full integral normalizer of this repeated absolutely irreducible integral representation"}
    return None


def _primitive_gram(group):
    sp = _sp()
    gram = c._sympy_matrix(c.invariant_gram(group))
    gram *= lcm(*(int(x.q) for x in gram))
    divisor = gcd(*(int(x) for x in gram))
    return gram/divisor


def _metric_normalizer(group, gram, max_vectors, max_matrices):
    """Every isometry of one exact positive metric, with rigorous vector bounds."""
    d = len(group[0])
    gram = c._from_sympy(gram)
    inverse = c.inverse(gram)
    cache, tested = {}, 0
    for j in range(d):
        norm = gram[j][j]
        if norm in cache:
            continue
        limits = [isqrt((norm*inverse[i][i]).numerator//(norm*inverse[i][i]).denominator) for i in range(d)]
        tested += prod(2*b+1 for b in limits)
        if tested > max_vectors:
            raise c.SearchLimitError("Certified canonical-metric vector enumeration exceeds max_vectors")
        cache[norm] = [tuple(map(c.F, v)) for v in product(*(range(-b, b+1) for b in limits))
                       if sum(x*y for x, y in zip(v, c.matvec(gram, v))) == norm]
    point_generators = ext._choose_generators(group)
    group_set, normalizers = set(group), []
    automorphisms = 0
    def grow(columns):
        nonlocal automorphisms
        j = len(columns)
        if j == d:
            n = c.transpose(columns)
            if abs(c.determinant(n)) != 1:
                return
            automorphisms += 1
            if automorphisms > max_matrices:
                raise c.SearchLimitError("Canonical metric automorphism count exceeds max_matrices")
            ni = c.inverse(n)
            if all(c.matmul(c.matmul(ni, g), n) in group_set for g in point_generators):
                normalizers.append(n)
            return
        for v in cache[gram[j][j]]:
            if all(sum(x*y for x, y in zip(v, c.matvec(gram, col))) == gram[j][i] for i, col in enumerate(columns)):
                grow(columns+[v])
    grow([])
    eye = c.identity(d)
    normalizers = [eye]+sorted(set(normalizers)-{eye})
    return {"generators": ext._choose_generators(normalizers), "normalizerOrder": len(normalizers),
            "invariantGramMatrix": gram, "gramAutomorphismOrder": automorphisms,
            "metricVectorsTested": tested}


def _finite_block_normalizer(group, max_vectors, max_matrices, return_metric_only=False):
    """Rational multiplicity-free real-irreducible blocks have finite normalizer.

    Every normalizer permutes their saturated Z lattices. Primitive integral
    invariant forms are preserved under unimodular changes, including between
    permuted blocks; their orthogonal sum is a canonical normalizer metric.
    """
    sp = _sp()
    d = len(group[0])
    pairs = [(i, j) for i in range(d) for j in range(i, d)]
    variables = sp.symbols(f"q0:{len(pairs)}")
    q = sp.zeros(d)
    for variable, (i, j) in zip(variables, pairs):
        q[i, j] = q[j, i] = variable
    equations = []
    for g in ext._choose_generators(group):
        a = c._sympy_matrix(g)
        equations.extend(a.T*q*a-q)
    system, _ = sp.linear_eq_to_matrix(equations, variables)
    null = system.nullspace()
    count = len(null)
    if count <= 1 or count > d:
        return None
    gram = _primitive_gram(group)
    inverse_gram = gram.inv()
    endomorphisms = []
    for v in null:
        form = sp.zeros(d)
        for x, (i, j) in zip(v, pairs):
            form[i, j] = form[j, i] = x
        endomorphisms.append(inverse_gram*form)
    if any(a*b != b*a for i, a in enumerate(endomorphisms) for b in endomorphisms[i+1:]):
        return None
    component_bases = None
    # A Vandermonde linear combination separates Q^count components after at
    # most (count-1)*binomial(count,2) exceptional integer parameters.
    for t in range(1, (count-1)*count*(count-1)//2+2):
        a = sum((t**i*x for i, x in enumerate(endomorphisms)), sp.zeros(d))
        factors = sp.factor_list(a.charpoly().as_expr())[1]
        if any(sp.Poly(p).degree() != 1 for p, _ in factors):
            return None  # a non-Q eigenvalue already excludes a split Q algebra
        if len(factors) != count:
            continue
        component_bases = []
        for factor, _ in factors:
            polynomial = sp.Poly(factor)
            value = -polynomial.nth(0)/polynomial.nth(1)
            kernel_matrix = a-value*sp.eye(d)
            kernel_matrix *= lcm(*(int(x.q) for x in kernel_matrix))
            component_bases.append(_integer_kernel(kernel_matrix))
        break
    if component_bases is None:
        return None
    basis = sp.Matrix.hstack(*component_bases)
    component_grams = []
    for b in component_bases:
        left_inverse = (b.T*b).inv()*b.T
        small_group = [c._from_sympy(left_inverse*c._sympy_matrix(g)*b) for g in group]
        if ext.invariant_form_dimension(small_group) != 1:
            return None
        component_grams.append(_primitive_gram(small_group))
    inverse = basis.inv()
    canonical_gram = inverse.T*sp.diag(*component_grams)*inverse
    if return_metric_only:
        return {"gram": canonical_gram, "basis": basis,
                "componentDimensions": [b.cols for b in component_bases],
                "complete": True,
                "certificate": "Primitive invariant metrics on intrinsic saturated rational real-irreducible components"}
    result = _metric_normalizer(group, canonical_gram, max_vectors, max_matrices)
    result.update({"complete": True, "finite": True,
                   "algorithm": "canonical-primitive-block-metric",
                   "realIrreducibleDimensions": [b.cols for b in component_bases],
                   "intrinsicLatticeBasis": c._from_sympy(basis),
                   "intrinsicLatticeIndex": abs(int(basis.det())),
                   "invariantFormDimension": count,
                   "certificate": "Commuting rational self-adjoint endomorphisms split into distinct rational real-irreducible blocks; each saturated component lattice has a unique primitive integral invariant form; every normalizer preserves their canonical sum; all isometries enumerated with exact inverse-Gram bounds",
                   "scope": "Full integral normalizer of this rational multiplicity-free real-irreducible representation"})
    return result


def canonical_primitive_metric(group):
    """Normalizer-invariant positive metric, when certified, without enumeration."""
    if ext.invariant_form_dimension(group) == 1:
        return {"gram": _primitive_gram(group), "basis": _sp().eye(len(group[0])),
                "componentDimensions": [len(group[0])], "complete": True,
                "certificate": "Unique primitive positive invariant metric"}
    return _finite_block_normalizer(group, 0, 0, return_metric_only=True)


def normalizer(group, max_vectors=2000000, max_matrices=100000,
               max_orbit=20000, max_module_trials=20000, max_point_orbit=64,
               tensor_basis=None):
    """Return exact generators and a separately stated completeness certificate."""
    if not group or not 1 <= len(group[0]) <= 6:
        raise ValueError("Normalizer dimension must be between one and six")
    result = _sign_normalizer(group, max_orbit, max_matrices)
    if result is None:
        result = _cyclotomic_normalizer(group, max_orbit, max_matrices, max_module_trials)
    if result is None:
        result = _tensor_normalizer(group, max_vectors, max_matrices, tensor_basis)
    if result is None:
        result = _characteristic_normalizer(group, max_orbit, max_matrices,
                                           max_module_trials, max_point_orbit)
    if result is None:
        result = _finite_block_normalizer(group, max_vectors, max_matrices)
    if result is None:
        result = ext.integral_normalizer(group, max_vectors, max_matrices)
        result["algorithm"] = "certified-metric-or-existing-arithmetic-case"
        if not result["complete"]:
            result["remainingObstacle"] = "The arithmetic centralizer of this noncyclic representation is not covered by the current complete algorithms"
    group_set = set(group)
    point_generators = ext._choose_generators(group)
    for n in result["generators"]:
        ni = c.inverse(n)
        if abs(c.determinant(n)) != 1 or any(c.matmul(c.matmul(ni, g), n) not in group_set for g in point_generators):
            raise ArithmeticError("Returned generator failed exact normalizer verification")
    result["dimension"] = len(group[0])
    result["pointGroupOrder"] = len(group)
    result["generatorCount"] = len(result["generators"])
    result["everyGeneratorVerified"] = True
    return result


def run(payload, database=None):
    if not isinstance(payload, dict):
        raise ValueError("Normalizer input must be an object")
    action = payload.get("action", "integral_normalizer")
    if action not in ("integral_normalizer", "normalizer", "extension_orbits", "affine_orbits"):
        raise ValueError("Unknown integral-normalizer action")
    group = ext._point_input(payload, database)
    # The low-level normalizer remains a fallback for the arithmetic module;
    # dispatch only the public entry here, avoiding an import/recursion cycle.
    from arithmetic_centralizer import arithmetic_normalizer
    result = arithmetic_normalizer(group, payload)
    group_set = set(group)
    point_generators = ext._choose_generators(group)
    for n in result["generators"]:
        ni = c.inverse(n)
        if abs(c.determinant(n)) != 1 or any(c.matmul(c.matmul(ni, g), n) not in group_set for g in point_generators):
            raise ArithmeticError("Returned generator failed exact normalizer verification")
    result.update(dimension=len(group[0]), pointGroupOrder=len(group),
                  generatorCount=len(result["generators"]), everyGeneratorVerified=True)
    if action in ("extension_orbits", "affine_orbits"):
        data = ext.extension_data(group, ext._limit(payload, "max_classes", 4096, 65536))
        output = ext._extensions_result(data, payload.get("include_operations", True))
        output["normalizer"] = result
        output.update(ext.extension_orbits(data, result["generators"], result["complete"]))
        return c.jsonable({"action": action, **output})
    return c.jsonable({"action": action, **result})
