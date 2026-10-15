"""NumPy implementation of Symmetry Lab's SG/MSG representation algorithms.

Derived from this project's GPL-3.0 engine.js, induction.js and trace-parser.js.
Primitive direct/reciprocal fractional coordinates; exp(-2 pi i k.t).
Numerical D/C labels are not BC, CDML or Bilbao labels. Antiunitary matrices
represent U K. ``run(action, payload)`` accepts and returns JSON-compatible data.
No JavaScript, Mathematica or server calculation is used by this module.
"""
from __future__ import annotations

import functools
import json
import math
import re
import numpy as np

EPS = 1e-8
TAU = 2 * math.pi
IDENTITY3 = np.eye(3, dtype=int)
MAX_TRACE_BYTES = 10 * 1024 * 1024


def require(condition, message):
    if not condition:
        raise ValueError(message)


def _complex(value):
    if isinstance(value, dict):
        return complex(value['re'], value.get('im', 0))
    if isinstance(value, (list, tuple)):
        return complex(*value)
    return complex(value)


def _cmatrix(value):
    if isinstance(value, np.ndarray):
        return value.astype(complex, copy=False)
    return np.array([[_complex(z) for z in row] for row in value], dtype=complex)


def _native(value):
    if isinstance(value, dict):
        if set(value) == {'re', 'im'}:
            return _complex(value)
        return {k: _native(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_native(v) for v in value]
    return value


def _json(value):
    if isinstance(value, (complex, np.complexfloating)):
        return {'re': 0.0 if abs(value.real) < 1e-14 else float(value.real),
                'im': 0.0 if abs(value.imag) < 1e-14 else float(value.imag)}
    if isinstance(value, np.ndarray):
        return _json(value.tolist())
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, dict):
        return {k: _json(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [_json(v) for v in value]
    return value


def _vector(value, name='k'):
    a = np.asarray(value, dtype=float)
    require(a.shape == (3,) and np.all(np.isfinite(a)), f'{name} must contain three finite numbers.')
    return a


def _round(x):
    # JavaScript Math.round tie convention, also fixes displayed star gauges.
    return np.floor(np.asarray(x) + .5)


def _centered(x):
    result = np.asarray(x) - _round(x)
    return np.where(abs(result) < EPS, 0., result)


def _equivalent(a, b, tolerance=EPS):
    diff = np.asarray(a) - np.asarray(b)
    return bool(np.all(abs(diff - _round(diff)) < tolerance))


def _key(op):
    return (bool(op.get('antiunitary')), *np.rint(op['rotation']).astype(int).flat)


def _error(a, b):
    return float(np.max(np.abs(np.asarray(a) - np.asarray(b))))


def _normalize_operations(operations):
    require(isinstance(operations, list) and 0 < len(operations) <= 384,
            'A nonempty set of at most 384 Seitz representatives is required.')
    result = []
    for i, op in enumerate(operations):
        r = np.asarray(op['rotation'], dtype=float)
        require(r.shape == (3, 3) and np.all(np.isfinite(r)), f'Invalid rotation at operation {i + 1}.')
        require(np.all(abs(r - _round(r)) < 2e-6), 'Rotations must use integer primitive fractional coordinates.')
        r = _round(r).astype(int)
        require(abs(abs(np.linalg.det(r)) - 1) < EPS, f'Rotation {i + 1} is not unimodular.')
        t = _vector(op.get('translation', [0, 0, 0]), 'Translation') % 1
        t[(t < EPS) | (1 - t < EPS)] = 0
        result.append({**op, 'rotation': r, 'translation': t,
                       'antiunitary': bool(op.get('antiunitary')), 'name': op.get('name') or f'g{i + 1}'})
    return result


def _seitz_product(g, h):
    return {'rotation': np.asarray(g['rotation']) @ h['rotation'],
            'translation': np.asarray(g['rotation']) @ h['translation'] + g['translation'],
            'antiunitary': bool(g.get('antiunitary')) != bool(h.get('antiunitary'))}


def reciprocal_action(operation, k):
    return (-1 if operation.get('antiunitary') else 1) * np.linalg.solve(np.asarray(operation['rotation']).T, k)


def _compute_star(operations, k):
    k = _vector(k)
    star = []
    for index, op in enumerate(operations):
        v = reciprocal_action(op, k)
        previous = next((arm for arm in star if _equivalent(v, arm['k'])), None)
        if previous is None:
            star.append({'k': _centered(v), 'operationIndices': [index]})
        else:
            previous['operationIndices'].append(index)
    return star


def _build_table(input_operations):
    operations = _normalize_operations(input_operations)
    n = len(operations)
    buckets = {}
    for i, op in enumerate(operations):
        bucket = buckets.setdefault(_key(op), [])
        require(not any(_equivalent(op['translation'], operations[j]['translation']) for j in bucket),
                f'Duplicate Seitz representative {i + 1}.')
        bucket.append(i)
    table = np.zeros((n, n), dtype=int)
    defects = np.zeros((n, n, 3), dtype=int)
    for g in range(n):
        for h in range(n):
            product = _seitz_product(operations[g], operations[h])
            match = next((j for j in buckets.get(_key(product), [])
                          if _equivalent(product['translation'], operations[j]['translation'])), None)
            require(match is not None, f'Operations are not closed modulo primitive translations: {g + 1} x {h + 1}.')
            table[g, h] = match
            defects[g, h] = np.rint(product['translation'] - operations[match]['translation']).astype(int)
    identity = next((i for i, op in enumerate(operations) if not op['antiunitary']
                     and np.array_equal(op['rotation'], IDENTITY3) and np.all(abs(op['translation']) < EPS)), None)
    require(identity is not None, 'The quotient group has no identity representative.')
    require(np.all(np.any(table == identity, axis=1)), 'A representative has no inverse.')
    return {'operations': operations, 'table': table, 'multiplicationTable': table,
            'translationDefects': defects, 'identity': identity, 'inverses': np.argmax(table == identity, axis=1)}


def _spatial_spin(op, basis=None):
    if op.get('spinRotation') is not None:
        m = _cmatrix(op['spinRotation'])
        require(m.shape == (2, 2) and _error(m @ m.conj().T, np.eye(2)) < 2e-4,
                'Supplied spatial spin matrix is not unitary.')
        return m
    b = np.asarray(basis if basis is not None else IDENTITY3).T
    r = b @ op['rotation'] @ np.linalg.inv(b)
    require(_error(r.T @ r, np.eye(3)) < 2e-5,
            'Double-valued calculation needs Cartesian primitive basis or supplied spinRotation matrices.')
    r = r * np.linalg.det(r)
    tr = np.trace(r)
    if tr > 0:
        s = math.sqrt(1 + tr) * 2
        w, x, y, z = s / 4, (r[2, 1] - r[1, 2]) / s, (r[0, 2] - r[2, 0]) / s, (r[1, 0] - r[0, 1]) / s
    elif r[0, 0] > r[1, 1] and r[0, 0] > r[2, 2]:
        s = math.sqrt(1 + r[0, 0] - r[1, 1] - r[2, 2]) * 2
        w, x, y, z = (r[2, 1] - r[1, 2]) / s, s / 4, (r[0, 1] + r[1, 0]) / s, (r[0, 2] + r[2, 0]) / s
    elif r[1, 1] > r[2, 2]:
        s = math.sqrt(1 + r[1, 1] - r[0, 0] - r[2, 2]) * 2
        w, x, y, z = (r[0, 2] - r[2, 0]) / s, (r[0, 1] + r[1, 0]) / s, s / 4, (r[1, 2] + r[2, 1]) / s
    else:
        s = math.sqrt(1 + r[2, 2] - r[0, 0] - r[1, 1]) * 2
        w, x, y, z = (r[1, 0] - r[0, 1]) / s, (r[0, 2] + r[2, 0]) / s, (r[1, 2] + r[2, 1]) / s, s / 4
    if next(v for v in [w, x, y, z] if abs(v) > EPS) < 0:
        w, x, y, z = -w, -x, -y, -z
    return np.array([[w - 1j * z, -y - 1j * x], [y - 1j * x, w + 1j * z]])


def _make_factors(group, k, double_valued, basis=None):
    ops, table = group['operations'], group['table']
    factors = np.exp(-1j * TAU * (group['translationDefects'] @ k))
    if double_valued:
        spin = [_spatial_spin(op, basis) for op in ops]
        for g in range(len(ops)):
            for h in range(len(ops)):
                product, target = spin[g] @ spin[h], spin[table[g, h]]
                plus, minus = _error(product, target), _error(product, -target)
                require(min(plus, minus) < 2e-4, f'Spatial spin sections inconsistent at {g + 1} x {h + 1}.')
                factors[g, h] *= (1 if plus < minus else -1) * (-1 if ops[g]['antiunitary'] and ops[h]['antiunitary'] else 1)
    return factors


def _validate_cocycle(table, factors, ops):
    error = 0.
    for g in range(len(ops)):
        for h in range(len(ops)):
            left = factors[g, h] * factors[table[g, h]]
            right = (factors[h].conj() if ops[g]['antiunitary'] else factors[h]) * factors[g, table[h]]
            error = max(error, _error(left, right))
    require(error < 2e-6, f'Factor system fails the antiunitary cocycle law ({error}).')
    return error


def _rng(seed):
    while True:
        seed ^= (seed << 13) & 0xffffffff
        seed ^= seed >> 17
        seed ^= (seed << 5) & 0xffffffff
        seed &= 0xffffffff
        yield seed / 4294967296


def _inner(a, b):
    a = np.array([_complex(x) for x in a])
    b = np.array([_complex(x) for x in b])
    return np.vdot(a, b) / len(a)


def _validate_representation(matrices, table, factors, ops=None):
    matrices = np.asarray(matrices, dtype=complex)
    product_error, unitary_error = 0., 0.
    for g, m in enumerate(matrices):
        unitary_error = max(unitary_error, _error(m @ m.conj().T, np.eye(len(m))))
        right = matrices.conj() if ops is not None and ops[g].get('antiunitary') else matrices
        product_error = max(product_error, _error(m @ right, factors[g, :, None, None] * matrices[table[g]]))
    require(product_error < 2e-6 and unitary_error < 2e-6,
            f'Representation validation failed (product {product_error}, unitarity {unitary_error}).')
    return {'productError': product_error, 'unitarityError': unitary_error}


def _compare_irreps(a, b):
    if a['dimension'] != b['dimension']:
        return a['dimension'] - b['dimension']
    trivial_a = np.all(abs(a['characters'] - 1) < EPS)
    trivial_b = np.all(abs(b['characters'] - 1) < EPS)
    if trivial_a != trivial_b:
        return -1 if trivial_a else 1
    for x, y in zip(a['characters'], b['characters']):
        if abs(x.real - y.real) > 1e-7:
            return -1 if x.real > y.real else 1
        if abs(x.imag - y.imag) > 1e-7:
            return -1 if x.imag > y.imag else 1
    return 0


def _calculate_irreps(table, factors, identity=0):
    n = len(table)
    require(0 < n <= 192, 'Unitary little group order must be between 1 and 192.')
    last_error = None
    for attempt in range(4):
        try:
            rng = _rng(173205 + attempt * 7919)
            hermitian = np.zeros((n, n), dtype=complex)
            for h in range(n):
                coefficient = complex(next(rng) - .5, next(rng) - .5) / math.sqrt(n)
                for g in range(n):
                    row = table[g, h]
                    value = coefficient * factors[g, h]
                    hermitian[row, g] += value
                    hermitian[g, row] += value.conjugate()
            values, vectors = np.linalg.eigh(hermitian)
            residual = _error(hermitian @ vectors, vectors * values)
            blocks = []
            for i, value in enumerate(values):
                if blocks and abs(value - blocks[-1][0]) < 1e-7:
                    blocks[-1][1].append(i)
                else:
                    blocks.append((value, [i]))
            irreps = []
            for _, indices in blocks:
                v = vectors[:, indices]
                matrices = np.array([v[row].conj().T @ (factors[g, :, None] * v) for g, row in enumerate(table)])
                characters = np.trace(matrices, axis1=1, axis2=2)
                require(abs(_inner(characters, characters) - 1) < 2e-6, 'Accidental eigenspace degeneracy.')
                equivalent = next((r for r in irreps if abs(_inner(r['characters'], characters) - 1) < 2e-6), None)
                if equivalent is not None:
                    equivalent['regularMultiplicity'] += 1
                else:
                    irreps.append({'dimension': len(indices), 'characters': characters,
                                   'matrices': matrices, 'regularMultiplicity': 1})
            require(all(r['regularMultiplicity'] == r['dimension'] for r in irreps), 'Regular multiplicities differ from dimensions.')
            squared = sum(r['dimension'] ** 2 for r in irreps)
            require(squared == n, f'Incomplete irrep decomposition: {squared}, expected {n}.')
            orthogonality = max(abs(_inner(a['characters'], b['characters']) - (i == j))
                                for i, a in enumerate(irreps) for j, b in enumerate(irreps))
            require(orthogonality < 2e-6, 'Irrep character orthogonality failed.')
            validations = [_validate_representation(r['matrices'], table, factors) for r in irreps]
            irreps.sort(key=functools.cmp_to_key(_compare_irreps))
            for i, rep in enumerate(irreps):
                rep.update(id=f'D{i + 1}', label=f'D{i + 1}')
            return {'irreps': irreps, 'validation': {'groupOrder': n, 'dimensionSquaredSum': squared,
                    'characterOrthogonalityError': float(orthogonality),
                    'productError': max(v['productError'] for v in validations),
                    'unitarityError': max(v['unitarityError'] for v in validations),
                    'diagonalizationResidual': residual, 'commutantAttempt': attempt + 1, 'passed': True}}
        except (ValueError, np.linalg.LinAlgError) as error:
            last_error = error
    raise ValueError(f'Could not obtain a verified irrep decomposition: {last_error}')


def _intertwiner(a, b):
    d, rng = len(a[0]), _rng(314159)
    for _ in range(8):
        seed = np.array([[complex(next(rng) - .5, next(rng) - .5) for _ in range(d)] for _ in range(d)])
        total = sum(x @ seed @ y.conj().T for x, y in zip(a, b))
        norm = np.linalg.norm(total) / math.sqrt(d)
        if norm > 1e-7:
            u = total / norm
            if _error(u @ u.conj().T, np.eye(d)) < 2e-6:
                return u
    raise ValueError('Could not construct a type-a unitary intertwiner.')


def _corepresentations(group, unitary_indices, irreps, factors):
    ops, table = group['operations'], group['table']
    anti = [i for i, op in enumerate(ops) if op['antiunitary']]
    if not anti:
        return []
    a, n = anti[0], len(unitary_indices)
    ainv, square = group['inverses'][a], table[a, a]
    local = {g: i for i, g in enumerate(unitary_indices)}
    completed, results = set(), []
    for index, rep in enumerate(irreps):
        if index in completed:
            continue
        d = rep['dimension']
        indicator = sum(factors[g, g] * rep['characters'][local[table[g, g]]] for g in anti) / n
        rounded = int(_round(indicator.real))
        require(abs(indicator.imag) < 2e-6 and abs(indicator.real - rounded) < 2e-6 and rounded in (-1, 0, 1),
                f'Wigner indicator is not 0 or +/-1 ({indicator}).')
        kind = {1: 'a', -1: 'b', 0: 'c'}[rounded]
        partner_matrices = []
        for h in unitary_indices:
            conjugated = table[table[ainv, h], a]
            partner_matrices.append(rep['matrices'][local[conjugated]].conj() * factors[h, a] / factors[a, conjugated])
        partner_matrices = np.asarray(partner_matrices)
        partner_chars = np.trace(partner_matrices, axis1=1, axis2=2)
        partner = next((i for i, candidate in enumerate(irreps) if abs(_inner(candidate['characters'], partner_chars) - 1) < 2e-6), None)
        require(partner is not None, 'Antiunitary partner irrep not found.')
        require((partner != index) if kind == 'c' else (partner == index), 'Wigner classification disagrees with partner matching.')
        x = rep['matrices'][local[square]] * factors[a, a]
        if kind == 'a':
            unitary_matrices = rep['matrices']
            anti_generator = _intertwiner(rep['matrices'], partner_matrices)
            require(_error(anti_generator @ anti_generator.conj(), x) < 2e-6, 'Type-a antiunitary square failed.')
        else:
            unitary_matrices = np.zeros((n, 2 * d, 2 * d), dtype=complex)
            unitary_matrices[:, :d, :d] = rep['matrices']
            unitary_matrices[:, d:, d:] = partner_matrices
            anti_generator = np.zeros((2 * d, 2 * d), dtype=complex)
            anti_generator[:d, d:], anti_generator[d:, :d] = x, np.eye(d)
        matrices = []
        for g, op in enumerate(ops):
            h = table[g, ainv] if op['antiunitary'] else g
            matrices.append(unitary_matrices[local[h]] @ anti_generator / factors[h, a]
                            if op['antiunitary'] else unitary_matrices[local[g]])
        matrices = np.asarray(matrices)
        validation = _validate_representation(matrices, table, factors, ops)
        results.append({'id': f'C{len(results) + 1}', 'label': f'C{len(results) + 1}', 'type': kind,
                        'wignerIndicator': rounded, 'dimension': len(matrices[0]), 'unitaryIrrep': rep['id'],
                        'partnerIrrep': irreps[partner]['id'], 'unitaryCharacters': np.trace(unitary_matrices, axis1=1, axis2=2),
                        'matrices': matrices, 'antiunitaryFlags': [op['antiunitary'] for op in ops], 'validation': validation})
        completed.add(index)
        if kind == 'c':
            completed.add(partner)
    return results


def _analyze(options):
    k = _vector(options.get('k', [0, 0, 0]))
    full = _build_table(options['operations'])
    operations = full['operations']
    star = _compute_star(operations, k)
    source = [i for i, op in enumerate(operations) if _equivalent(reciprocal_action(op, k), k)]
    group = _build_table([operations[i] for i in source])
    require(len(star) * len(group['operations']) == len(operations), 'Orbit-stabilizer identity failed.')
    double = bool(options.get('doubleValued', False))
    factors = _make_factors(group, k, double, options.get('basis'))
    cocycle = _validate_cocycle(group['table'], factors, group['operations'])
    unitary = [i for i, op in enumerate(group['operations']) if not op['antiunitary']]
    anti = [i for i, op in enumerate(group['operations']) if op['antiunitary']]
    local = {g: i for i, g in enumerate(unitary)}
    table = np.array([[local[group['table'][g, h]] for h in unitary] for g in unitary])
    unitary_factors = factors[np.ix_(unitary, unitary)]
    calculation = _calculate_irreps(table, unitary_factors, local[group['identity']])
    coreps = _corepresentations(group, unitary, calculation['irreps'], factors)
    little = {'order': len(group['operations']), 'unitaryOrder': len(unitary), 'operations': group['operations'],
              'sourceIndices': source, 'unitaryOperations': [group['operations'][i] for i in unitary],
              'unitaryIndices': unitary, 'antiunitaryIndices': anti, 'multiplicationTable': group['table'],
              'translationDefects': group['translationDefects'], 'factors': factors,
              'unitaryMultiplicationTable': table, 'unitaryFactors': unitary_factors, 'identity': group['identity']}
    if not options.get('includeMatrices', True):
        for rep in calculation['irreps'] + coreps:
            del rep['matrices']
    return {'schemaVersion': 1, 'k': k, 'groupOrder': len(operations),
            'magnetic': any(op['antiunitary'] for op in operations), 'doubleValued': double,
            'star': star, 'littleGroup': little, 'irreps': calculation['irreps'], 'corepresentations': coreps,
            'validation': {**calculation['validation'], 'cocycleError': cocycle,
                           'orbitStabilizer': True, 'corepresentationsVerified': len(coreps)},
            'conventions': ['Primitive fractional direct/reciprocal coordinates; phase exp(-2 pi i k.t).',
                            'D1, D2, ... and C1, C2, ... are numerical labels, not BC/CDML/Bilbao labels.',
                            'NumPy numerical eigenspaces; antiunitary matrices act as U K.',
                            'Spinful T squared = -1.' if double else 'Spinless T squared = +1.']}


def _decompose(characters, reps, magnetic=False):
    require(bool(reps), 'Target representations are required.')
    key = 'unitaryCharacters' if magnetic else 'characters'
    require(len(characters) == len(reps[0][key]), 'Character vector length must equal the unitary little-group order.')
    values = np.array([_complex(z) for z in characters])
    require(np.all(np.isfinite(values)), 'Characters must be finite complex numbers.')
    multiplicities = []
    reconstruction = np.zeros(len(values), dtype=complex)
    for rep in reps:
        chars = np.array([_complex(z) for z in rep[key]])
        norm = _inner(chars, chars) if magnetic else 1
        coefficient = _inner(chars, values) / norm
        multiplicity = int(_round(coefficient.real))
        require(multiplicity >= 0 and abs(coefficient.real - multiplicity) < 2e-5 and abs(coefficient.imag) < 2e-5,
                f'Input is not a nonnegative integral representation combination ({rep["id"]}: {coefficient}). Include complete antiunitary/Kramers partners.')
        term = {name: rep[name] for name in ['id', 'label', 'dimension']}
        if magnetic:
            term['type'] = rep['type']
        term.update(multiplicity=multiplicity, coefficient=coefficient)
        multiplicities.append(term)
        reconstruction += chars * multiplicity
    residual = _error(values, reconstruction)
    require(residual < 2e-5, f'Character outside target span (residual {residual}).')
    return {'terms': [t for t in multiplicities if t['multiplicity'] > 0], 'multiplicities': multiplicities,
            'dimension': sum(t['dimension'] * t['multiplicity'] for t in multiplicities),
            'reconstructionError': residual, 'passed': True}


def _spin_semi(op):
    require(op.get('spinRotation') is not None, 'Double-valued induction requires supplied spinRotation matrices.')
    u = _cmatrix(op['spinRotation'])
    u /= np.linalg.norm(u) / math.sqrt(2)
    anti = bool(op.get('antiunitary'))
    return (u @ np.array([[0, -1], [1, 0]]) if anti else u, anti)


def _semi_product(a, b):
    return a[0] @ (b[0].conj() if a[1] else b[0]), a[1] != b[1]


def _semi_inverse(a):
    return (a[0].T if a[1] else a[0].conj().T, a[1])


def _section_sign(u, v):
    overlap = np.vdot(v, u)
    require(abs(abs(overlap.real) - 2) < 2e-6 and abs(overlap.imag) < 2e-6, 'Inconsistent SU(2) lifts in induction.')
    return 1 if overlap.real > 0 else -1


def _induce(options):
    group = options['group']
    require(bool(group.get('operations')), 'A space group with operations is required.')
    k = _vector(options['k'])
    analysis = options.get('analysis')
    if analysis is None:
        analysis = _analyze({'operations': group['operations'], 'k': k, 'basis': group.get('basis'),
                             'doubleValued': options.get('doubleValued', False)})
    else:
        analysis = _native(analysis)
    require(_error(analysis['k'], k) < 2e-7, 'Analysis and induction must use identical k coordinates, including reciprocal gauge.')
    double = analysis['doubleValued']
    has_anti = bool(analysis['corepresentations'])
    reps = analysis['corepresentations'] if has_anti else analysis['irreps']
    selected = options.get('irrepIndex', 0)
    require(isinstance(selected, int) and 0 <= selected < len(reps), 'Invalid representation selection.')
    local = options.get('irrep', reps[selected])
    require('matrices' in local, 'Little-group matrices are required for induction.')
    local_matrices = np.array([_cmatrix(m) for m in local['matrices']])
    ops = group['operations']
    little = analysis['littleGroup']['operations' if has_anti else 'unitaryOperations']
    star = _compute_star(ops, k)
    coset_indices = [arm['operationIndices'][0] for arm in star]
    representatives = [ops[i] for i in coset_indices]
    inv_reps = [np.linalg.inv(op['rotation']) for op in representatives]
    hmap = {}
    for i, op in enumerate(little):
        hmap.setdefault(_key(op), []).append(i)
    d, n = local['dimension'], len(star)
    dimension = d * n
    require(n * len(little) == len(ops), 'Coset orbit-stabilizer identity failed.')
    spins = [_spin_semi(op) for op in representatives] if double else []
    little_spins = [_spin_semi(op) for op in little] if double else []

    def blocks_for(op):
        out = []
        for j in range(n):
            moved = reciprocal_action(op, star[j]['k'])
            i = next((i for i, arm in enumerate(star) if _equivalent(arm['k'], moved, 2e-7)), None)
            require(i is not None, 'Operation does not preserve induced k star.')
            rh = inv_reps[i] @ op['rotation'] @ np.asarray(representatives[j]['rotation'])
            th = inv_reps[i] @ (np.asarray(op['rotation']) @ representatives[j]['translation']
                                + np.asarray(op['translation']) - representatives[i]['translation'])
            ah = bool(representatives[i].get('antiunitary')) ^ bool(op.get('antiunitary')) ^ bool(representatives[j].get('antiunitary'))
            hi = next((h for h in hmap.get(_key({'rotation': rh, 'antiunitary': ah}), [])
                       if _equivalent(th, little[h]['translation'], 2e-7)), None)
            require(hi is not None, 'Coset conjugation did not land in little group.')
            delta = th - little[hi]['translation']
            require(np.all(abs(delta - _round(delta)) < 2e-6), 'Induction translation is not a primitive lattice vector.')
            factor = np.exp(-1j * TAU * np.dot(k, delta))
            if double:
                uh = _semi_product(_semi_product(_semi_inverse(spins[i]), _spin_semi(op)), spins[j])
                factor *= _section_sign(uh[0], little_spins[hi][0])
            matrix = local_matrices[hi] * factor
            if representatives[i].get('antiunitary'):
                matrix = matrix.conj()
            out.append({'rowArm': i, 'columnArm': j, 'littleOperation': hi, 'matrix': matrix})
        return out

    blocks = [blocks_for(op) for op in ops]
    matrices = np.zeros((len(ops), dimension, dimension), dtype=complex)
    for g, row in enumerate(blocks):
        for block in row:
            i, j = block['rowArm'], block['columnArm']
            matrices[g, i*d:(i+1)*d, j*d:(j+1)*d] = block['matrix']
    characters = np.trace(matrices, axis1=1, axis2=2)
    law_error, translation_error = 0., 0.
    if options.get('validate', True):
        product = _build_table(ops)
        op_spins = [_spin_semi(op) for op in ops] if double else []
        for a in range(len(ops)):
            for b in range(len(ops)):
                c, shift = product['table'][a, b], product['translationDefects'][a, b]
                sign = _section_sign(_semi_product(op_spins[a], op_spins[b])[0], op_spins[c][0]) if double else 1
                for j in range(n):
                    first = blocks[b][j]
                    second, expected = blocks[a][first['rowArm']], blocks[c][j]
                    require(second['rowArm'] == expected['rowArm'], 'Induced arm permutations failed composition.')
                    result = second['matrix'] @ (first['matrix'].conj() if ops[a].get('antiunitary') else first['matrix'])
                    factor = sign * np.exp(-1j * TAU * np.dot(star[expected['rowArm']]['k'], shift))
                    law_error = max(law_error, _error(result, expected['matrix'] * factor))
        for shift in IDENTITY3:
            translation = blocks_for({'rotation': IDENTITY3, 'translation': shift,
                                      'spinRotation': [[1, 0], [0, 1]], 'antiunitary': False})
            for j in range(n):
                translation_error = max(translation_error, _error(translation[j]['matrix'],
                                        np.eye(d) * np.exp(-1j * TAU * np.dot(star[j]['k'], shift))))
        require(law_error < 3e-5 and translation_error < 3e-5,
                f'Induced representation law failed ({law_error}, {translation_error}).')
    return {'id': f'Star({local["id"]})', 'label': '*' + local['label'], 'dimension': dimension,
            'littleDimension': d, 'littleIrrepId': local['id'], 'littleCorepType': local.get('type'),
            'k': k, 'doubleValued': double, 'magnetic': analysis['magnetic'], 'star': star,
            'cosetIndices': coset_indices, 'operations': ops, 'matrices': matrices, 'characters': characters,
            'unitaryCharacters': [characters[i] for i, op in enumerate(ops) if not op.get('antiunitary')],
            'antiunitaryFlags': [bool(op.get('antiunitary')) for op in ops], 'blocks': blocks,
            'validation': {'multiplicationError': law_error, 'translationError': translation_error,
                           'passed': law_error < 3e-5 and translation_error < 3e-5},
            'conventions': ['Matrices induced from a numerical little-group irrep/corepresentation.',
                            'Primitive translations act as exp(-2 pi i k_arm.t).',
                            'Antiunitary matrices act as U K; their traces are not ordinary characters.']}


def _star_product(options):
    group, k1, k2 = options['group'], options['k1'], options['k2']
    left = _induce({'group': group, 'k': k1, 'analysis': options.get('analysis1'),
                   'irrepIndex': options.get('irrepIndex1', 0), 'doubleValued': options.get('double1', False)})
    right = _induce({'group': group, 'k': k2, 'analysis': options.get('analysis2'),
                    'irrepIndex': options.get('irrepIndex2', 0), 'doubleValued': options.get('double2', False)})
    target_double = left['doubleValued'] != right['doubleValued']
    sectors = []
    for i, left_arm in enumerate(left['star']):
        for j, right_arm in enumerate(right['star']):
            total = np.asarray(left_arm['k']) + right_arm['k']
            sector = next((s for s in sectors if _equivalent(s['k'], total, 2e-7)), None)
            if sector is None:
                sector = {'k': _centered(total), 'pairs': []}
                sectors.append(sector)
            sector['pairs'].append((i, j))
    seen, outputs = [], []
    for sector in sectors:
        if any(_equivalent(k, sector['k'], 2e-7) for k in seen):
            continue
        target = _analyze({'operations': group['operations'], 'k': sector['k'],
                           'basis': group.get('basis'), 'doubleValued': target_double})
        seen.extend(arm['k'] for arm in target['star'])
        chars = []
        little = target['littleGroup']
        for source in (little['sourceIndices'][i] for i in little['unitaryIndices']):
            total = 0j
            for i, j in sector['pairs']:
                a, b = left['blocks'][source][i], right['blocks'][source][j]
                if a['rowArm'] == i and b['rowArm'] == j:
                    total += np.trace(a['matrix']) * np.trace(b['matrix'])
            chars.append(total)
        magnetic = bool(target['corepresentations'])
        reduction = _decompose(chars, target['corepresentations'] if magnetic else target['irreps'], magnetic)
        outputs.append({'k': sector['k'], 'star': target['star'], 'doubleValued': target_double,
                        'sectorDimension': len(sector['pairs']) * left['littleDimension'] * right['littleDimension'],
                        'characters': chars, 'littleOperations': little['unitaryOperations'],
                        'terms': [{**term, 'littleDimension': term['dimension'],
                                   'dimension': term['dimension'] * len(target['star'])} for term in reduction['terms']],
                        'validation': {'reconstructionError': reduction['reconstructionError'], 'passed': reduction['passed']}})
    product_dimension = left['dimension'] * right['dimension']
    decomposed_dimension = sum(t['dimension'] * t['multiplicity'] for o in outputs for t in o['terms'])
    require(decomposed_dimension == product_dimension,
            f'Full SG tensor dimension mismatch: {decomposed_dimension} vs {product_dimension}.')
    return {'left': {'k': k1, 'id': left['id'], 'dimension': left['dimension']},
            'right': {'k': k2, 'id': right['id'], 'dimension': right['dimension']},
            'doubleValued': target_double, 'magnetic': any(op.get('antiunitary') for op in group['operations']),
            'productDimension': product_dimension, 'decomposedDimension': decomposed_dimension, 'outputs': outputs,
            'validation': {'dimensionConserved': True, 'passed': True},
            'conventions': ['Translation eigenspaces are resolved before little-group character projection.',
                            'D/C labels are numerical and local to each resulting little group.']}


def _trace_fail(message, line=None):
    raise ValueError(f'trace 文件{("第 " + str(line) + " 行") if line else ""}：{message}')


def _integer(value, label, line=None, minimum=0, maximum=1000000):
    if not math.isfinite(value) or value != math.floor(value) or not minimum <= value <= maximum:
        _trace_fail(label + '不是有效整数', line)
    return int(value)


def parse_trace(text, max_bytes=MAX_TRACE_BYTES):
    require(isinstance(text, str), 'trace 需要文本内容')
    require(len(text.encode('utf-8')) <= max_bytes, 'trace 文件超过 10 MiB 限制')
    numeric = re.compile(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$')
    rows = []
    for index, line in enumerate(text.lstrip('\ufeff').splitlines()):
        if not line.strip():
            continue
        tokens = line.split()
        if not all(numeric.fullmatch(t) for t in tokens):
            _trace_fail('含有非数值内容', index + 1)
        values = [float(re.sub('[dD]', 'e', t)) for t in tokens]
        if not all(math.isfinite(v) for v in values):
            _trace_fail('含有无穷或无效数值', index + 1)
        rows.append((values, index + 1))
    cursor = 0

    def next_row(label):
        nonlocal cursor
        if cursor >= len(rows):
            _trace_fail(label + '缺失，文件可能被截断')
        row = rows[cursor]
        cursor += 1
        return row

    first, line = next_row('电子数')
    nelec = _integer(first[0], '电子数', line)
    v, line = next_row('SOC 标记')
    soc = _integer(v[0], 'SOC 标记', line, 0, 1)
    v, line = next_row('对称操作数')
    nsym = _integer(v[0], '对称操作数', line, 1, 384)
    columns, operations = None, []
    for index in range(nsym):
        v, line = next_row('对称操作')
        if columns is None:
            columns = len(v)
        if columns not in (20, 21) or len(v) != columns:
            _trace_fail('对称操作必须统一为 20 列或 21 列', line)
        if any(x != round(x) for x in v[:9]):
            _trace_fail('BC 原胞旋转矩阵必须为整数', line)
        rotation = np.array(v[:9], dtype=int).reshape(3, 3)
        if abs(abs(np.linalg.det(rotation)) - 1) > EPS:
            _trace_fail('旋转矩阵行列式必须为 +/-1', line)
        if columns == 21 and v[20] not in (1, -1):
            _trace_fail('幺正标记必须为 +1 或 -1', line)
        operations.append({'sourceIndex': index + 1, 'rotation': rotation.tolist(), 'translation': v[9:12],
                           'spinRotation': [[v[12:14], v[14:16]], [v[16:18], v[18:20]]],
                           'antiunitary': columns == 21 and v[20] == -1})
    v, line = next_row('k 点数')
    nk = _integer(v[0], 'k 点数', line, 1, 100000)
    coords = []
    for _ in range(nk):
        v, line = next_row('k 点坐标')
        if len(v) != 3:
            _trace_fail('k 点必须有三个坐标', line)
        coords.append(v)
    band_count, points = None, []
    for ik, k in enumerate(coords):
        v, line = next_row('小群操作数')
        if len(v) != 1:
            _trace_fail('小群操作数应单独占一行', line)
        order = _integer(v[0], '小群操作数', line, 1, nsym)
        v, line = next_row('操作索引')
        if len(v) != order:
            _trace_fail('操作索引数与小群操作数不一致', line)
        indices = [_integer(x, '操作索引', line, 1, nsym) - 1 for x in v]
        if len(set(indices)) != order:
            _trace_fail('操作索引重复', line)
        bands, next_band = [], 1
        while cursor < len(rows) and len(rows[cursor][0]) != 1:
            v, line = next_row('能带数据')
            if len(v) != 3 + 2 * order:
                _trace_fail(f'能带行应有 {3 + 2 * order} 列', line)
            index = _integer(v[0], '能带编号', line, 1)
            degeneracy = _integer(v[1], '简并度', line, 1)
            if index != next_band:
                _trace_fail(f'能带编号应连续；期望 {next_band}，得到 {index}', line)
            next_band += degeneracy
            bands.append({'index': index, 'degeneracy': degeneracy, 'energy': v[2],
                          'characters': [v[3 + 2*i:5 + 2*i] for i in range(order)]})
        if not bands:
            _trace_fail(f'第 {ik + 1} 个 k 点没有能带数据')
        if band_count is None:
            band_count = next_band - 1
        if next_band - 1 != band_count:
            _trace_fail('各 k 点的能带总数不同')
        points.append({'k': k, 'bands': bands, 'operationIndices': indices})
    if cursor != len(rows):
        _trace_fail('声明的 k 点之后还有未解析数据', rows[cursor][1])
    return {'format': 'magvasp2trace' if columns == 21 else 'vasp2trace', 'nelec': nelec,
            'soc': soc, 'nsym': nsym, 'nk': nk, 'bandCount': band_count, 'sourceHeader': first,
            'spinBasis': 'up-down', 'operations': operations, 'kpoints': points}


def match_trace_operations(trace, group, tolerance=2e-5):
    require(bool(group.get('operations')), '所选群缺少操作数据')
    mapping = []
    for source, op in enumerate(trace['operations']):
        candidates = [(i, g) for i, g in enumerate(group['operations'])
                      if np.array_equal(op['rotation'], g['rotation'])
                      and bool(op.get('antiunitary')) == bool(g.get('antiunitary'))
                      and _equivalent(op['translation'], g['translation'], tolerance)]
        require(len(candidates) == 1, f'操作 {source + 1} 无法唯一匹配所选群的 BC 原胞设置；本工具不自动转换晶胞。')
        i, g = candidates[0]
        sign = 1
        if trace['soc'] == 1:
            require(g.get('spinRotation') is not None, f'操作 {source + 1} 缺少数据库自旋矩阵')
            downup = _cmatrix(op['spinRotation'])[::-1, ::-1]
            database = _cmatrix(g['spinRotation'])
            if _error(downup, database) < tolerance:
                sign = 1
            elif _error(downup, -database) < tolerance:
                sign = -1
            else:
                raise ValueError(f'操作 {source + 1} 的自旋矩阵与 BC 基底不兼容。')
        mapping.append({'groupIndex': i, 'spinSign': sign,
                        'translationShift': _round(np.asarray(op['translation']) - g['translation']).astype(int).tolist()})
    points = []
    for point in trace['kpoints']:
        bands = []
        for band in point['bands']:
            chars = []
            for j, z in enumerate(band['characters']):
                match = mapping[point['operationIndices'][j]]
                value = _complex(z) * match['spinSign'] * np.exp(1j * TAU * np.dot(point['k'], match['translationShift']))
                chars.append([float(value.real), float(value.imag)])
            bands.append({**band, 'characters': chars})
        points.append({**point, 'sourceOperationIndices': point['operationIndices'],
                       'operationIndices': [mapping[i]['groupIndex'] for i in point['operationIndices']], 'bands': bands})
    return {**trace, 'kpoints': points, 'mapping': mapping, 'operationMap': [x['groupIndex'] for x in mapping],
            'groupId': group.get('id', group.get('number')), 'charactersBasis': 'selected BC representatives; spin down-up',
            'notes': ['坐标按 BC 原胞匹配；没有执行晶胞或原点转换。', '已校正整格矢平移相位和双值旋转的 +/- 号。']}


def characters_for_analysis(point, band, analysis):
    little = analysis['littleGroup']
    chars = []
    for i in little['unitaryIndices']:
        source = little['sourceIndices'][i]
        require(source in point['operationIndices'], f'trace 缺少所选 k 点的幺正操作 {source + 1}。')
        chars.append(band['characters'][point['operationIndices'].index(source)])
    return chars


def _match_bands(payload):
    group, text = payload['group'], payload['text']
    analysis = _native(payload['analysis'])
    k = _vector(payload.get('k', analysis['k']))
    double = bool(payload.get('doubleValued', analysis['doubleValued']))
    require(isinstance(text, str) and len(text.encode('utf-8')) <= MAX_TRACE_BYTES, '输入文件超过 10 MiB 限制。')
    magnetic = bool(analysis['corepresentations'])
    reps = analysis['corepresentations'] if magnetic else analysis['irreps']
    if text.lstrip().startswith('{'):
        obj = json.loads(text)
        require('k' not in obj or _equivalent(obj['k'], k), 'JSON k 点与当前选择不一致。')
        require('doubleValued' not in obj or obj['doubleValued'] == double, 'JSON 自旋类型与当前计算不一致。')
        if obj.get('group'):
            gid = str(group.get('id', group.get('number')))
            require(str(obj['group']['id']) == gid, 'JSON 群编号与当前选择不一致。')
            if payload.get('mode'):
                require(obj['group'].get('mode') == payload['mode'], 'JSON 群类型与当前选择不一致。')
        require(isinstance(obj.get('bands'), list) and bool(obj['bands']), 'bands 必须是非空能带数组。')
        rows = [{**band, 'index': band.get('index', i + 1), 'k': k,
                 'terms': _decompose(band.get('characters', []), reps, magnetic)} for i, band in enumerate(obj['bands'])]
    else:
        trace = parse_trace(text)
        require(bool(trace['soc']) == double, 'trace 的 SOC 标记与当前单值 / 双值选择不一致。')
        matched = match_trace_operations(trace, group)
        point = next((p for p in matched['kpoints'] if _equivalent(p['k'], k, 1e-7)), None)
        require(point is not None, '文件中未找到当前 k 点。请在工作台输入文件中的 k 坐标。')
        rows = [{**band, 'k': point['k'], 'terms': _decompose(characters_for_analysis(point, band, analysis), reps, magnetic)}
                for band in point['bands']]
    for row in rows:
        require(row['terms']['dimension'] > 0, '能带表示的维数必须大于零。')
        require('degeneracy' not in row or row['degeneracy'] == row['terms']['dimension'],
                f'能带 {row["index"]} 的简并度与特征标分解维数不一致。')
    return {'bands': rows}


def analyze_group(options):
    return _json(_analyze(options))


def induce_representation(options):
    return _json(_induce(options))


def decompose_star_product(options):
    return _json(_star_product(options))


def decompose_characters(characters, irreps):
    return _json(_decompose(characters, irreps))


def decompose_corepresentation_characters(characters, corepresentations):
    return _json(_decompose(characters, corepresentations, True))


def compute_star(operations, k):
    return _json(_compute_star(operations, k))


def build_multiplication_table(operations):
    return _json(_build_table(operations))


def induced_operation_matrix(induced, operation_index, lattice_translation=(0, 0, 0)):
    require(isinstance(operation_index, int) and 0 <= operation_index < len(induced['matrices']), 'Invalid operation index.')
    shift = _vector(lattice_translation, 'Translation')
    require(np.all(shift == _round(shift)), 'Translation must contain three integers.')
    matrix = _cmatrix(induced['matrices'][operation_index]).copy()
    for i in range(len(matrix)):
        matrix[i] *= np.exp(-1j * TAU * np.dot(induced['star'][i // induced['littleDimension']]['k'], shift))
    return _json(matrix)


def direct_product(options):
    left = options['left'].get('characters') if isinstance(options['left'], dict) else options['left']
    right = options['right'].get('characters') if isinstance(options['right'], dict) else options['right']
    require(len(left) == len(right), 'Tensor factors must use the same ordered subgroup.')
    factor_names = ['leftFactors', 'rightFactors', 'targetFactors']
    if any(options.get(name) is not None for name in factor_names):
        require(all(options.get(name) is not None for name in factor_names), 'Supply all three factor systems.')
        a, b, c = [_cmatrix(options[name]) for name in factor_names]
        require(a.shape == b.shape == c.shape == (len(left), len(left)), 'Factor-system dimensions differ.')
        require(_error(a * b, c) < 2e-6, 'Tensor-product factor system differs from target.')
    characters = [_complex(a) * _complex(b) for a, b in zip(left, right)]
    return _json({**_decompose(characters, options['targetIrreps']), 'characters': characters})


def run(action, payload):
    """Browser/CLI entry: action analyze, induce, product, match_bands or decompose."""
    if action == 'analyze':
        return analyze_group(payload)
    if action == 'induce':
        return induce_representation(payload)
    if action == 'product':
        return decompose_star_product(payload)
    if action == 'match_bands':
        return _json(_match_bands(payload))
    if action == 'decompose':
        if payload.get('corepresentations'):
            return decompose_corepresentation_characters(payload['characters'], payload['corepresentations'])
        return decompose_characters(payload['characters'], payload['irreps'])
    if action == 'direct_product':
        return direct_product(payload)
    if action == 'parse_trace':
        return parse_trace(payload['text'])
    raise ValueError('Unknown symmetry calculation action: ' + str(action))


def run_json(action, payload_json):
    """String-only bridge avoids PyProxy conversion and keeps complex encoding explicit."""
    return json.dumps(run(action, json.loads(payload_json)), ensure_ascii=False, allow_nan=False)
