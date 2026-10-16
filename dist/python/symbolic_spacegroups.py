"""Exact automatic little-group representations on supplied/catalogue Seitz data.

GPL-3.0-only. No numerical eigenspaces, guessed rational values or rounded spin
matrices. A finite twisted regular algebra is decomposed with exact Hermitian
commutant eigenspaces. Continuous k dependence is removed by a proved cochain
and restored after the constant algebra is solved. Labels are local, not BC.
"""
from __future__ import annotations

import math
import functools
from fractions import Fraction
import sympy as sp

from symbolic_core import (ExactParser, require, integer, simp, clean, zero,
    exact_equal, mat_json, display, spin_lift, run as symbolic_run)
import symbolic_interfaces as interfaces


def _phase(angle):
    return simp(sp.exp(2*sp.pi*sp.I*angle))


def _mod_rational(value):
    require(value.is_Rational, "Constant factor exponent is not rational")
    return value-sp.floor(value)


def _int_vector(vector):
    return all(v.is_integer is True for v in vector)


def _raw_operation(op):
    return {"name": op.get("name", ""), "rotation": mat_json(op["r"]),
            "translation": [str(v) for v in op["t"]], "antiunitary": op["anti"]}


def _operations(raw, parser, reduce_translations=True):
    require(isinstance(raw, list) and 0 < len(raw) <= 192, "Supply 1..192 exact Seitz representatives")
    result = []
    for i, item in enumerate(raw):
        require(isinstance(item, dict), "Seitz representatives must be objects")
        r = parser.matrix(item.get("rotation"), shape=(3, 3), limit=3)
        require(all(x.is_Integer for x in r) and abs(r.det()) == 1, "Rotations must be unimodular integer 3 by 3 matrices")
        source = item.get("translationExact", item.get("translation", [0, 0, 0]))
        require(isinstance(source, list) and len(source) == 3, "Translations must have three exact rational entries")
        require(all(not isinstance(x, float) for x in source), "Use exact rational strings for translations; rounded decimals are not reconstructed")
        t = sp.Matrix([parser.parse(x) for x in source])
        require(all(v.is_Rational for v in t), "Seitz representative translations must be rational constants")
        if reduce_translations:
            t = t.applyfunc(lambda x: x-sp.floor(x))
        anti = item.get("antiunitary", False)
        require(isinstance(anti, bool), "antiunitary must be Boolean")
        result.append({"r": r, "t": t, "anti": anti, "name": item.get("name", f"g{i}")})
    return result


def _catalogue(payload, database, magnetic_database):
    if "operations" in payload:
        return payload["operations"], {"source": "explicit exact Seitz representatives"}
    require(isinstance(magnetic_database, dict) and isinstance(magnetic_database.get("groups"), list),
            "The exact magnetic-group catalogue is required, including translationExact")
    groups = magnetic_database["groups"]
    if "magnetic_group" in payload:
        value = payload["magnetic_group"]
        if isinstance(value, list):
            require(len(value) == 2, "Magnetic number must be [family, serial]")
            value = '.'.join(str(integer(x, 1, 1651, "magnetic group number")) for x in value)
        require(isinstance(value, str), "magnetic_group must be a BNS string or pair")
        item = next((g for g in groups if g["id"] == value), None)
        require(item is not None, "Unknown BNS magnetic group")
        metadata = {k: item[k] for k in ("id", "bns", "og", "family", "symbol", "bcSymbol", "ogSymbol", "type", "lattice", "pointGroup", "unitarySpaceGroup") if k in item}
    else:
        number = integer(payload.get("group_number", 4), 1, 230, "group_number")
        item = next(g for g in groups if g["family"] == number and g["type"] == 1)
        metadata = {"number": number, "symbol": item["symbol"], "bcSymbol": item["bcSymbol"],
                    "lattice": item["lattice"], "pointGroup": item["pointGroup"], "magnetic_type_I_source": item["id"]}
        if isinstance(database, dict):
            source = next((g for g in database.get("groups", []) if g["number"] == number), None)
            if source:
                metadata.update({k: source[k] for k in ("pointGroupNumber", "originShift", "bcSettingTransform") if k in source})
                index = sum(g["number"] <= number and g["pointGroup"] == source["pointGroup"] for g in database["groups"])
                metadata["schoenflies"] = {"point_group": source["pointGroup"], "index": index, "symbol": f'{source["pointGroup"]}^{index}'}
        metadata["bc_orientation"] = _bc_orientation(number)
    metadata["source"] = "Frozen BC catalogue; integer rotations and original rational translationExact fields. Rounded spinRotation and illustrative basis fields are never used."
    return item["operations"], metadata


def _bc_orientation(number):
    if number in (17, 19, 28, 29, 31, 33, 53, 61, 36, 46, 70, 122):
        axes = ["b", "-a", "c"]
    elif number in (38, 39, 40, 41, 57):
        axes = ["b", "c", "a"]
    elif number in (51, 54):
        axes = ["-c", "b", "a"]
    elif number in (52, 60) or 3 <= number <= 15:
        axes = ["a", "-c", "b"]
    else:
        axes = ["a", "b", "c"]
    return {"axes": axes, "label": ','.join(axes)}


def _table(operations):
    n = len(operations)
    lookup = {}
    for i, op in enumerate(operations):
        key = (tuple(op["r"]), tuple(op["t"]), op["anti"])
        require(key not in lookup, "Duplicate Seitz quotient representatives")
        lookup[key] = i
    table, defects = [], []
    for g in operations:
        row, shifts = [], []
        for h in operations:
            rotation, translation = g["r"]*h["r"], g["t"]+g["r"]*h["t"]
            fractional = translation.applyfunc(lambda x: x-sp.floor(x))
            key = (tuple(rotation), tuple(fractional), g["anti"] != h["anti"])
            require(key in lookup, "Seitz operations are not closed modulo integer translations")
            index = lookup[key]
            row.append(index)
            shifts.append(translation-operations[index]["t"])
        table.append(row)
        defects.append(shifts)
    identity = lookup.get((tuple(sp.eye(3)), (0, 0, 0), False))
    require(identity is not None, "Missing identity Seitz representative")
    inverse = [next(j for j in range(n) if table[i][j] == identity) for i in range(n)]
    return table, defects, identity, inverse


def _little(operations, k):
    star, arms, little, conditions = [], [], [], []
    for i, op in enumerate(operations):
        transformed = clean((-1 if op["anti"] else 1)*op["r"].inv().T*k)
        difference = clean(transformed-k)
        if _int_vector(difference):
            little.append(i)
        elif difference.free_symbols:
            conditions.append({"kind": "generic_little_group_stratum", "operation": i,
                               "difference": [str(v) for v in difference],
                               "condition": "These three differences are not simultaneously integers; substitute exceptional parameter values and recompute."})
        if not any(_int_vector(clean(transformed-old)) for old in star):
            star.append(transformed)
            arms.append(i)
    require(len(star)*len(little) == len(operations), "Exact orbit-stabilizer certificate failed")
    return little, star, arms, conditions


def _spin(operations, table, parser):
    metric = sum((op["r"].T*op["r"] for op in operations), sp.zeros(3))
    frame = clean(metric.cholesky().T)
    inverse = clean(frame.inv())
    time_reversal = sp.Matrix([[0, 1], [-1, 0]])
    matrices = []
    for op in operations:
        cartesian = clean(frame*op["r"]*inverse)
        require(exact_equal(cartesian.T*cartesian, sp.eye(3)), "Exact spin frame is not orthogonal")
        spin = spin_lift(cartesian, parser)
        matrices.append(clean(spin*time_reversal if op["anti"] else spin))
    signs = sp.ones(len(operations))
    for i, g in enumerate(operations):
        for j in range(len(operations)):
            product = clean(matrices[i]*(matrices[j].conjugate() if g["anti"] else matrices[j]))
            target = matrices[table[i][j]]
            if exact_equal(product, target):
                signs[i, j] = 1
            else:
                require(exact_equal(product, -target), "Exact spin product is not a double-cover sign")
                signs[i, j] = -1
    return signs, matrices, metric, frame


def _factors(operations, table, defects, k, double, parser, spin_data=None):
    n = len(operations)
    projector = sum(((-1 if op["anti"] else 1)*op["r"].inv().T for op in operations), sp.zeros(3))/n
    invariant = clean(projector*k)
    base = clean(k-invariant)
    require(all(v.is_Rational for v in base), "The non-invariant part of k must be constant rational; supply an affine symbolic k family or a rational k point")
    require(all(exact_equal((-1 if op["anti"] else 1)*op["r"].inv().T*invariant, invariant) for op in operations), "Cochain direction is not fixed by the reciprocal action")
    spin, spin_matrices, metric, frame = (sp.ones(n), None, None, None)
    if double:
        spin, spin_matrices, metric, frame = spin_data or _spin(operations, table, parser)
    exponents = [[_mod_rational(-base.dot(defects[i][j])+(sp.Rational(1, 2) if spin[i, j] == -1 else 0)) for j in range(n)] for i in range(n)]
    conductor = math.lcm(*(int(a.q) for row in exponents for a in row))
    require(conductor <= 48, "Constant cocycle conductor exceeds exact browser limit 48")
    # Rational modular arithmetic proves every semilinear cocycle identity.
    integer_exponents = [[int(conductor*a) for a in row] for row in exponents]
    for i in range(n):
        sign = -1 if operations[i]["anti"] else 1
        for j in range(n):
            for h in range(n):
                require((integer_exponents[i][j]+integer_exponents[table[i][j]][h]-sign*integer_exponents[j][h]-integer_exponents[i][table[j][h]]) % conductor == 0, "Constant semilinear cocycle certificate failed")
    factors = sp.Matrix([[_phase(a) for a in row] for row in exponents])
    cochain = [_phase(-invariant.dot(op["t"])) for op in operations]
    for i, g in enumerate(operations):
        for j in range(n):
            # Verify at exponent level, avoiding expensive trigonometric expansion.
            lhs = -invariant.dot(g["t"])-(-1 if g["anti"] else 1)*invariant.dot(operations[j]["t"])+invariant.dot(operations[table[i][j]]["t"])
            require(zero(lhs+invariant.dot(defects[i][j])), "Symbolic cochain certificate failed")
    return {"constant": factors, "exponents": exponents, "conductor": conductor,
            "cochain": cochain, "base_k": base, "invariant_k": invariant,
            "spin_matrices": spin_matrices, "spin_metric": metric, "spin_frame": frame}


@functools.lru_cache(maxsize=32)
def _regular_cached(table, factors_tuple, identity):
    return _regular_irreps([list(row) for row in table], sp.Matrix(factors_tuple), identity)


def _regular_irreps(table, factors, identity):
    n = len(table)
    left, right = [], []
    for g in range(n):
        l, r = sp.zeros(n), sp.zeros(n)
        for h in range(n):
            l[table[g][h], h] = factors[g, h]
            r[table[h][g], h] = factors[h, g]
        left.append(l)
        right.append(r)
    hermitian = []
    for g in range(n):
        if g == identity:
            continue
        for op in (clean(right[g]+right[g].H), clean(sp.I*(right[g]-right[g].H))):
            if op != sp.zeros(n) and op not in hermitian:
                hermitian.append(op)
    remaining, irreps = sp.eye(n), []
    while remaining.cols:
        basis = remaining
        while True:
            gram = clean(basis.H*basis)
            dual = clean(gram.inv()*basis.H)
            matrices = [clean(dual*l*basis) for l in left]
            require(all(exact_equal(l*basis, basis*m) for l, m in zip(left, matrices)), "Selected exact subspace is not invariant")
            characters = [simp(m.trace()) for m in matrices]
            norm = simp(sum(sp.conjugate(c)*c for c in characters)/n)
            if norm == 1:
                break
            split = None
            for op in hermitian:
                projected = clean(dual*op*basis)
                if exact_equal(projected, projected[0, 0]*sp.eye(projected.rows)):
                    continue
                eigen = projected.eigenvects(simplify=simp, error_when_incomplete=True)
                require(sum(len(vectors) for _, _, vectors in eigen) == projected.rows, "Exact eigenspaces were incomplete; no numerical fallback")
                proper = [(value, vectors) for value, _, vectors in eigen if 0 < len(vectors) < basis.cols]
                require(proper, "Non-scalar Hermitian commutant did not split exactly")
                _, vectors = min(proper, key=lambda pair: (len(pair[1]), str(pair[0])))
                split = clean(basis*sp.Matrix.hstack(*vectors))
                break
            require(split is not None, "Exact commutant could not certify an irreducible component")
            basis = split
        d = matrices[0].rows
        # Positive Gram orthonormalization makes downstream projectors and
        # Wigner construction usable in a checked unitary basis.
        ortho = []
        for j in range(basis.cols):
            v = basis[:, j]
            for u in ortho:
                v = clean(v-u*(u.H*v)[0])
            length = simp((v.H*v)[0])
            require(length.is_positive is True, "Exact invariant-basis norm is not provably positive")
            ortho.append(clean(v/sp.sqrt(length)))
        basis = sp.Matrix.hstack(*ortho)
        matrices = [clean(basis.H*l*basis) for l in left]
        require(all(exact_equal(m.H*m, sp.eye(d)) for m in matrices), "Exact irrep basis is not unitary")
        require(all(exact_equal(matrices[g]*matrices[h], factors[g, h]*matrices[table[g][h]]) for g in range(n) for h in range(n)), "Exact irreducible multiplication certificate failed")
        irreps.append({"dimension": d, "matrices": matrices, "characters": characters})
        projector = clean(sum((sp.conjugate(characters[g])*left[g] for g in range(n)), sp.zeros(n))*sp.Rational(d, n))
        require(exact_equal(projector*projector, projector), "Exact isotypic projector failed")
        complement = clean((sp.eye(n)-projector)*remaining)
        columns = complement.columnspace(simplify=True)
        remaining = sp.Matrix.hstack(*columns) if columns else sp.zeros(n, 0)
    require(sum(rep["dimension"]**2 for rep in irreps) == n, "Exact irreps do not exhaust the twisted regular algebra")
    require(all(simp(sum(sp.conjugate(a["characters"][g])*b["characters"][g] for g in range(n))/n) == int(i == j)
                for i, a in enumerate(irreps) for j, b in enumerate(irreps)), "Exact irrep characters are not orthonormal")
    return irreps


def _wigner(group, unitary, rep):
    """Construct on a group whose quotient, cocycle and irrep were just proved."""
    table, factors, anti = group["table"], group["factor"], group["anti"]
    reps = dict(zip(unitary, rep["matrices"]))
    characters = dict(zip(unitary, rep["characters"]))
    outside = [g for g in range(group["order"]) if anti[g]]
    indicator = simp(sum(factors[a, a]*characters[table[a][a]] for a in outside)/len(unitary))
    require(indicator in (-1, 0, 1), "Exact Herring indicator is invalid")
    a = outside[0]
    if indicator == 1:
        left, right = [], []
        for h in unitary:
            hp = table[table[a][h]][group["inverse"][a]]
            left.append(clean(factors[a, h]*reps[hp]/factors[hp, a]))
            right.append(reps[h].conjugate())
        basis, _, _ = interfaces._intertwiner_basis(left, right, [False]*len(left))
        require(len(basis) == 1, "Exact conjugate intertwiner is not one-dimensional")
        matrix = basis[0]
        square = factors[a, a]*reps[table[a][a]]
        ratio_matrix = clean(matrix*matrix.conjugate()*square.inv())
        ratio = simp(ratio_matrix[0, 0])
        require(exact_equal(ratio_matrix, ratio*sp.eye(matrix.rows)) and ratio.is_positive is True, "Exact Wigner normalization is not positive")
        matrix = clean(matrix/sp.sqrt(ratio))
        result = dict(reps)
        for h in unitary:
            result[table[a][h]] = clean(matrix*reps[h].conjugate()/factors[a, h])
    else:
        result, _ = interfaces._induce(group, unitary, reps)
    for g in range(group["order"]):
        for h in range(group["order"]):
            require(exact_equal(result[g]*(result[h].conjugate() if anti[g] else result[h]), factors[g, h]*result[table[g][h]]), "Exact Wigner semilinear product failed")
    return result, int(indicator), {1: "a", -1: "b", 0: "c"}[indicator]


def analyze(payload, parser, operations, metadata, action="analyze"):
    kraw = payload.get("k", [0, 0, 0])
    require(isinstance(kraw, list) and len(kraw) == 3, "k must have three exact entries")
    k = sp.Matrix([parser.parse(x) for x in kraw])
    require(all(v.is_real is True for v in k), "k components must be real")
    full_table, _, _, _ = _table(operations)
    source, star, arms, conditions = _little(operations, k)
    little = [operations[i] for i in source]
    table, defects, identity, inverse = _table(little)
    response = {"action": action, "group": metadata, "group_order": len(operations),
                "k": [str(v) for v in k], "star": [[str(v) for v in arm] for arm in star],
                "star_representatives": arms, "little_group": {"order": len(little), "source_indices": source,
                "operations": [_raw_operation(op) for op in little], "table": table, "identity": identity},
                "conditions": conditions, "verified": True}
    if action in ("little_group", "star"):
        response["certificate"] = "Exact reciprocal action, quotient closure and orbit-stabilizer identity. Parameter-dependent exceptions are explicitly listed."
        return response
    double = payload.get("double_valued", False)
    require(isinstance(double, bool), "double_valued must be Boolean")
    spin_data = None
    if double:
        full_signs, full_spins, full_metric, full_frame = _spin(operations, full_table, parser)
        spin_data = (full_signs.extract(source, source), [full_spins[i] for i in source], full_metric, full_frame)
    factors = _factors(little, table, defects, k, double, parser, spin_data)
    response.update(double_valued=double, base_k=[str(v) for v in factors["base_k"]],
                    symbolic_cochain=[str(v) for v in factors["cochain"]],
                    constant_cocycle=mat_json(factors["constant"]), conductor=factors["conductor"])
    if factors["spin_frame"] is not None:
        response["spin_frame"] = mat_json(factors["spin_frame"])
        response["spin_metric"] = mat_json(factors["spin_metric"])
        response["spin_convention"] = "Exact SU(2) lift in an internally constructed invariant orthonormal frame; T=i sigma_y K. This gauge is not the rounded upstream spin gauge."
    if action == "central_extension":
        order = factors["conductor"]
        size = order*len(little)
        require(size <= 512, "Finite central-extension order exceeds 512")
        response["extension_order"] = size
        response["elements"] = [[g, a] for g in range(len(little)) for a in range(order)]
        response["extension_table"] = [[table[g][h]*order+int((a+(-1 if little[g]["anti"] else 1)*b+order*factors["exponents"][g][h]) % order)
                                         for h in range(len(little)) for b in range(order)] for g in range(len(little)) for a in range(order)]
        response["certificate"] = "Exact finite root-of-unity extension of the constant cocycle. The kernel is central only on the unitary subgroup; antiunitary elements invert it. Symbolic k dependence is restored by the recorded cochain."
        return response
    if action == "spin_operations":
        require(double, "spin_operations requires double_valued:true")
        response["matrices"] = [mat_json(m) for m in factors["spin_matrices"]]
        response.update(display(factors["spin_matrices"][0]))
        response["certificate"] = "Exact rational invariant metric, Cholesky spin frame, orthogonal rotations, unitary SU(2) lifts and every semilinear double-cover sign verified."
        return response
    unitary = [i for i, op in enumerate(little) if not op["anti"]]
    local = {g: i for i, g in enumerate(unitary)}
    unitable = [[local[table[g][h]] for h in unitary] for g in unitary]
    unifactor = factors["constant"].extract(unitary, unitary)
    max_order = integer(payload.get("max_unitary_order", 48), 1, 48, "max_unitary_order")
    require(len(unitary) <= max_order, f"Exact regular-algebra decomposition is limited to unitary order {max_order}; the request is not approximated")
    irreps = _regular_cached(tuple(map(tuple, unitable)), tuple(map(tuple, unifactor.tolist())), local[identity])
    response["unitary_indices"] = unitary
    response["irreps"] = [{"id": f"E{i+1}", "dimension": rep["dimension"],
                            "matrices": [mat_json(clean(factors["cochain"][g]*m)) for g, m in zip(unitary, rep["matrices"])],
                            "characters": [str(simp(factors["cochain"][g]*c)) for g, c in zip(unitary, rep["characters"])]}
                           for i, rep in enumerate(irreps)]
    coreps = []
    if any(op["anti"] for op in little):
        require(len(little) <= 96, "Exact Wigner construction is limited to magnetic little-group order 96")
        verified_group = {"table": table, "factor": factors["constant"], "anti": [op["anti"] for op in little],
                          "order": len(little), "identity": identity, "inverse": inverse}
        used_characters = []
        for rep in irreps:
            if any(simp(sum(sp.conjugate(rep["characters"][j])*chars[j] for j in range(len(unitary)))/len(unitary)) != 0 for chars in used_characters):
                continue
            matrices, indicator, kind = _wigner(verified_group, unitary, rep)
            used_characters.append([simp(matrices[g].trace()) for g in unitary])
            restored = [clean(factors["cochain"][g]*matrices[g]) for g in range(len(little))]
            coreps.append({"id": f"M{len(coreps)+1}", "dimension": restored[identity].rows,
                           "wigner_type": kind, "indicator": indicator,
                           "matrices": [mat_json(m) for m in restored],
                           "unitary_characters": [str(simp(restored[g].trace())) for g in unitary],
                           "antiunitary": [op["anti"] for op in little]})
    response["corepresentations"] = coreps
    response["complete"] = True
    response["certificate"] = "Exact twisted-regular algebra decomposed by Hermitian right-commutant eigenspaces; every irrep multiplication, character orthogonality and sum(dim^2)=|H| verified. Wigner construction checks every constant semilinear product. A proved symbolic one-cochain restores all continuous k dependence. No numerical eigenspace or rational guessing is used."
    response["label_note"] = "E/M numbers are local exact representation labels, not BC/CDML/Bilbao standard labels. Results apply on the stated generic little-group stratum."
    first = coreps[0]["matrices"] if coreps else response["irreps"][0]["matrices"]
    if first:
        response.update(display(parser.matrix(first[-1])))
    return response


def _exponential_equal(left, right):
    if left.shape != right.shape:
        return False
    return all(zero(sp.expand(v.rewrite(sp.exp))) for v in left-right)


def induce(payload, parser, operations, metadata):
    response = analyze(payload, parser, operations, metadata)
    source = response["little_group"]["source_indices"]
    little = [operations[i] for i in source]
    k = sp.Matrix([parser.parse(v) for v in response["k"]])
    table, defects, _, _ = _table(operations)
    star = [sp.Matrix([parser.parse(v) for v in arm]) for arm in response["star"]]
    reps = list(response["star_representatives"])
    # If H contains an antiunitary element every G/H coset admits a unitary
    # representative; use it so the inducing corep's complex basis is unchanged.
    if any(op["anti"] for op in little):
        for i, arm in enumerate(star):
            index = next(j for j, op in enumerate(operations)
                         if not op["anti"] and _int_vector(clean(op["r"].inv().T*k-arm)))
            reps[i] = index
            star[i] = clean(operations[index]["r"].inv().T*k)
    spin_signs = sp.ones(len(operations))
    if response["double_valued"]:
        spin_signs, _, _, _ = _spin(operations, table, parser)
    lookup = {(tuple(op["r"]), tuple(op["t"]), op["anti"]): h for h, op in enumerate(little)}
    transports = []
    for g, operation in enumerate(operations):
        row = []
        for j, tj in enumerate(reps):
            r = operation["r"]*operations[tj]["r"]
            a = operation["anti"] != operations[tj]["anti"]
            target_k = clean((-1 if a else 1)*r.inv().T*k)
            i = next(i for i, arm in enumerate(star) if _int_vector(clean(target_k-arm)))
            ti = reps[i]
            inverse = operations[ti]["r"].inv()
            hr = inverse*r
            ht = inverse*(operation["r"]*operations[tj]["t"]+operation["t"]-operations[ti]["t"])
            ha = operations[ti]["anti"] != a
            key = (tuple(hr), tuple(ht.applyfunc(lambda x: x-sp.floor(x))), ha)
            require(key in lookup, "Exact coset induction did not return to the little group")
            h = lookup[key]
            shift = ht-little[h]["t"]
            require(_int_vector(shift), "Induction transport has a nonlattice shift")
            spin = spin_signs[g, tj]/spin_signs[ti, source[h]]
            row.append((i, h, shift, spin, operations[ti]["anti"]))
        require(len({item[0] for item in row}) == len(star), "Induced star action is not a permutation")
        transports.append(row)
    inputs = response["corepresentations"] or response["irreps"]
    output = []
    for small in inputs:
        matrices = [parser.matrix(raw) for raw in small["matrices"]]
        d, arms = small["dimension"], len(star)
        require(d*arms <= integer(payload.get("max_full_dimension", 24), 1, 48, "max_full_dimension"), "Full exact star representation exceeds dimension budget")
        blocks, full = [], []
        for g in range(len(operations)):
            rows, matrix = [], sp.zeros(d*arms)
            for j, (i, h, shift, sign, anti) in enumerate(transports[g]):
                block = _phase(-k.dot(shift))*matrices[h]
                block = clean(sign*(block.conjugate() if anti else block))
                matrix[i*d:(i+1)*d, j*d:(j+1)*d] = block
                rows.append(block)
            blocks.append(rows)
            full.append(matrix)
        for g in range(len(operations)):
            for h in range(len(operations)):
                gh = table[g][h]
                for j in range(arms):
                    middle = transports[h][j][0]
                    i = transports[g][middle][0]
                    require(i == transports[gh][j][0], "Induced star permutations fail multiplication")
                    lhs = blocks[g][middle]*(blocks[h][j].conjugate() if operations[g]["anti"] else blocks[h][j])
                    rhs = spin_signs[g, h]*_phase(-star[i].dot(defects[g][h]))*blocks[gh][j]
                    require(_exponential_equal(lhs, rhs), "Full symbolic star semilinear multiplication failed")
        output.append({"id": f"F{len(output)+1}", "little_id": small["id"], "dimension": d*arms,
                       "matrices": [mat_json(m) for m in full], "antiunitary": [op["anti"] for op in operations],
                       "unitary_characters": [{"index": g, "character": str(simp(m.trace()))} for g, m in enumerate(full) if not operations[g]["anti"]],
                       "wigner_type": small.get("wigner_type")})
    response.update(action="induce", full_representations=output,
                    star=[[str(v) for v in arm] for arm in star], star_representatives=reps,
                    full_group_operations=[_raw_operation(op) for op in operations],
                    certificate=response["certificate"]+" Exact Seitz coset induction then verifies every full semilinear product block with the correct row-star lattice-translation phase and spin-cover sign.")
    if output:
        response.update(display(parser.matrix(output[0]["matrices"][-1], limit=48)))
    return response


ALIASES = {
    "getSGElem": "group", "getMSGElem": "group", "msgop": "group", "getMSGElemFromMSGCorep": "group",
    "getLGElem": "little_group", "getMLGElem": "little_group",
    "getKStar": "star", "getMagKStar": "star",
    "getLGIrepTab": "analyze", "getLGCharTab": "analyze", "getMLGCorep": "analyze",
    "getSGIrepTab": "induce", "getMSGCorep": "induce",
    "getCentExt": "central_extension", "shiftOrigin": "origin",
    "SGSymStd": "symbol", "SGSymBC": "symbol", "SGSymScho": "symbol", "getSGLatt": "symbol", "BCOrientation": "symbol",
    "MSGSymStd": "symbol", "MSGSymBNS": "symbol", "MSGSymBC": "symbol", "MSGSymOG": "symbol",
    "getMSGType": "symbol", "BNStoOG": "symbol", "OGtoBNS": "symbol",
}

SYMBOLIC_ALIASES = {
    "CompileCyclotomicMatrices": ("compile_cyclotomic", {}),
    "CyclotomicCommonKernel": ("common_kernel", {"cyclotomic": True}),
    "CyclotomicCommonNullSpace": ("common_kernel", {"cyclotomic": True}),
    "CyclotomicNullSpace": ("common_kernel", {"cyclotomic": True}),
    "CyclotomicRREF": ("common_kernel", {"cyclotomic": True}),
    "symhamII": ("gauge", {}),
    "SeitzTimes": ("seitz", {"operation": "multiply"}),
    "invSeitz": ("seitz", {"operation": "inverse"}),
    "powerSeitz": ("seitz", {"operation": "power"}),
    "MSGSeitzTimes": ("seitz", {"operation": "multiply"}),
    "MSGinvSeitz": ("seitz", {"operation": "inverse"}),
    "MSGpowerSeitz": ("seitz", {"operation": "power"}),
    "checkLGIrep": ("representation", {}), "checkSGIrep": ("representation", {}),
    "checkMLGCorep": ("representation", {}), "checkMSGCorep": ("representation", {}),
    "getLGIrepMat": ("representation_element", {}), "getSGIrepMat": ("representation_element", {}),
    "getMLGCorepMat": ("representation_element", {}), "getMSGCorepMat": ("representation_element", {}),
    "aCentExt": ("bloch_cocycle", {}), "reduceRep": ("character_decompose", {}),
    "PGIrepDirectProduct": ("character_decompose", {}),
}

CORE_ALIASES = {"buildBlochHamiltonian": "bloch", "symham": "model", "texOutput": "algebra"}


def _restore_cyclotomic(payload, parser):
    matrices, field = interfaces._compile_blocks(payload, parser)
    root = sp.exp(2*sp.pi*sp.I/field.order)
    restored = [clean(m.subs(field.z, root)) for m in matrices]
    return {"action": "restore_cyclotomic", "order": field.order,
            "matrices": [mat_json(m) for m in restored], "polynomial_matrices": [mat_json(m) for m in matrices],
            "verified": True, "certificate": "Evaluate the exact polynomial quotient in its specified primitive root exp(2*pi*I/n); no numerical identification or branch guessing.",
            **display(restored[0])}


def run(payload, database=None, magnetic_database=None):
    require(isinstance(payload, dict), "Exact space-group request must be an object")
    parser = ExactParser(payload.get("assumptions"))
    api = payload.get("api", payload.get("function"))
    action = payload.get("action", "analyze")
    if api is None and (action in SYMBOLIC_ALIASES or action in CORE_ALIASES or action == "RestoreCyclotomicExpression"):
        api = action
    if api in CORE_ALIASES:
        response = symbolic_run({**payload, "action": CORE_ALIASES[api]})
        response["upstream_api"] = api
        response["compatibility_note"] = "Stateless exact JSON workflow; explicit Hamiltonian/hopping/model data replace the upstream initialized session."
        return response
    if api == "RestoreCyclotomicExpression" or action == "restore_cyclotomic":
        response = _restore_cyclotomic(payload, parser)
        response.update(engine="SymPy exact cyclotomic embedding", upstream_api=api,
                        conditions=parser.domain_conditions())
        return response
    if api in SYMBOLIC_ALIASES:
        mapped, defaults = SYMBOLIC_ALIASES[api]
        request = {**payload, **defaults, "action": mapped}
        if "matrix" in request and mapped == "common_kernel" and "matrices" not in request:
            request["matrices"] = [request["matrix"]]
        response = interfaces.run(request)
        if api in ("CyclotomicNullSpace", "CyclotomicCommonNullSpace", "CyclotomicCommonKernel"):
            response["value"] = response["kernel_rows"]
        elif api == "CyclotomicRREF":
            response["value"] = response["rref"]
        response["upstream_api"] = api
        response["compatibility_note"] = "Explicit JSON mathematical adapter; signatures, basis orientation and result schemas follow the documented Python interface."
        return response
    if api is not None:
        require(api in ALIASES, "Upstream API is not in the exact compatibility allowlist")
        action = ALIASES[api]
    elif action in ALIASES:
        api, action = action, ALIASES[action]
    require(action in ("analyze", "induce", "group", "little_group", "star", "central_extension", "spin_operations", "origin", "symbol"), "Unknown exact space-group action")
    if api == "OGtoBNS":
        require(isinstance(magnetic_database, dict), "Magnetic catalogue required")
        value = payload.get("og")
        require(isinstance(value, (list, str)), "OGtoBNS requires og as [family,index,serial] or dotted string")
        text = '.'.join(map(str, value)) if isinstance(value, list) else value
        item = next((g for g in magnetic_database["groups"] if g["ogId"] == text), None)
        require(item is not None, "Unknown OG number")
        payload = {**payload, "magnetic_group": item["id"]}
    raw, metadata = _catalogue(payload, database, magnetic_database)
    operations = _operations(raw, parser)
    if action in ("group", "origin", "symbol"):
        table, _, identity, _ = _table(operations)
        if action == "origin":
            operations = _operations(raw, parser, reduce_translations=False)
            origin = payload.get("origin")
            require(isinstance(origin, list) and len(origin) == 3, "origin must have three exact coordinates")
            origin = sp.Matrix([parser.parse(v) for v in origin])
            operations = [{**op, "t": clean(op["t"]+(op["r"]-sp.eye(3))*origin)} for op in operations]
        response = {"action": action, "group": metadata, "order": len(operations), "operations": [_raw_operation(op) for op in operations],
                    "table": table, "identity": identity, "verified": True,
                    "certificate": "Exact original rational catalogue translations and integral rotations; quotient closure verified. Origin changes use x_old=x_new+origin without modulo rounding."}
        if api is not None:
            keys = {"SGSymStd": "symbol", "SGSymBC": "bcSymbol", "SGSymScho": "schoenflies", "getSGLatt": "lattice", "BCOrientation": "bc_orientation",
                    "MSGSymStd": "symbol", "MSGSymBNS": "symbol", "MSGSymBC": "bcSymbol", "MSGSymOG": "ogSymbol",
                    "getMSGType": "type", "BNStoOG": "og", "OGtoBNS": "bns"}
            if api in keys:
                require(keys[api] in metadata, "Requested metadata is unavailable for this input")
                response["value"] = metadata[keys[api]]
    elif action == "induce":
        response = induce(payload, parser, operations, metadata)
    else:
        response = analyze(payload, parser, operations, metadata, action)
    response["engine"] = "SymPy exact automatic space-group representations"
    response["conditions"] = response.get("conditions", [])+parser.domain_conditions()
    if api is not None:
        response["upstream_api"] = api
        response["compatibility_note"] = "Mathematical workflow mapped to an explicit JSON contract; no stateful Wolfram syntax or published representation-label compatibility is implied."
    return response
