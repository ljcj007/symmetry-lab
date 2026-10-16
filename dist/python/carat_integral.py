"""Certified integral and affine classes of finite rational matrix groups.

Pure Python / SymPy, GPL-3.0-or-later.  Prime cyclic representations through
dimension six have a constructive complete classification.  For other groups
we construct invariant p-neighbour lattices and certify pairwise distinction.
Exhaustion of the independently published CARAT cardinality is a completeness
certificate; exhaustion of a search budget is NEVER such a certificate.
"""
from collections import Counter, deque
from itertools import product, combinations
from math import gcd, isqrt, prod

import sympy as sp
from sympy.matrices.normalforms import hermite_normal_form, smith_normal_form

import carat_browser as cb
import crystkit_extensions as ce
import crystkit_browser as c


def _limit(payload, name, default, maximum, minimum=1):
    value = payload.get(name, default)
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ValueError(f'{name} must be an integer between {minimum} and {maximum}')
    return value


def _matrix(a):
    return tuple(tuple(int(x) for x in row) for row in a.tolist())


def _rank_mod(a, p):
    rows = [[int(x) % p for x in row] for row in a.tolist()]
    rank = 0
    for j in range(a.cols):
        pivot = next((i for i in range(rank, len(rows)) if rows[i][j]), None)
        if pivot is None:
            continue
        rows[rank], rows[pivot] = rows[pivot], rows[rank]
        inverse = pow(rows[rank][j], -1, p)
        rows[rank] = [(x*inverse) % p for x in rows[rank]]
        for i in range(len(rows)):
            if i != rank and rows[i][j]:
                q = rows[i][j]
                rows[i] = [(x-q*y) % p for x, y in zip(rows[i], rows[rank])]
        rank += 1
    return rank


def _smith_diagonal(a):
    s = smith_normal_form(a, domain=sp.ZZ)
    return tuple(abs(int(s[i, i])) for i in range(min(s.shape)))


def _primitive_gram(group):
    d = len(group[0])
    f = sum((sp.Matrix(g).T*sp.Matrix(g) for g in group), sp.zeros(d))
    divisor = 0
    for x in f:
        divisor = gcd(divisor, int(x))
    return f/divisor


def _invariant(group, generators, unique_form=None):
    """A conjugacy invariant, not a complete integral-class label."""
    d = len(group[0])
    eye = sp.eye(d)
    elements = Counter()
    for raw in group:
        g = sp.Matrix(raw)
        elements[(cb._element_signature(raw), _smith_diagonal(g-eye))] += 1
    coinvariants = _smith_diagonal(sp.Matrix.hstack(*(sp.Matrix(g)-eye for g in generators)))
    if unique_form is None:
        unique_form = ce.invariant_form_dimension(group) == 1
    form = _primitive_gram(group) if unique_form else None
    return (tuple(sorted(elements.items())), coinvariants,
            int(form.det()) if form is not None else None)


def _prime_type(group):
    p = len(group)
    if p not in (2, 3, 5, 7):
        return None
    d = len(group[0])
    g = sp.Matrix(next(x for x in group if x != cb._identity(d)))
    a = d-(g-sp.eye(d)).rank()
    if (d-a) % (p-1):
        raise ArithmeticError('Prime cyclic rational decomposition has invalid dimension')
    b = (d-a)//(p-1)
    t = _rank_mod(g-sp.eye(d), p)-b*(p-2)
    if not 0 <= t <= min(a, b):
        raise ArithmeticError('Invalid prime cyclic integral gluing invariant')
    return p, a, b, t


def _prime_blocks(p, a, b, t):
    # Basis 1,z,...,z^(p-2), multiplication by z modulo Phi_p(z).
    cyclotomic = sp.zeros(p-1)
    for j in range(p-2):
        cyclotomic[j+1, j] = 1
    cyclotomic[:, p-2] = -sp.ones(p-1, 1)
    regular = sp.zeros(p)
    for j in range(p):
        regular[(j+1) % p, j] = 1
    blocks = [sp.ones(1)]*(a-t)+[cyclotomic]*(b-t)+[regular]*t
    return sp.diag(*blocks)


def _prime_classes(group, affine):
    p, a, b, input_t = _prime_type(group)
    d = len(group[0])
    classes = []
    for t in range(min(a, b)+1):
        g = _prime_blocks(p, a, b, t)
        m = a-t
        item = {'index': t, 'generators': [_matrix(g)],
                'block_multiplicities': {'trivial': m, 'cyclotomic': b-t, 'regular': t},
                'cohomology_invariants': [p]*m,
                'certificate': {'method': 'prime_cyclic_integral_blocks', 'prime': p,
                                'rational_trivial_multiplicity': a, 'rational_cyclotomic_multiplicity': b,
                                'gluing_rank': t, 'rank_mod_p_of_g_minus_I': b*(p-2)+t}}
        if affine:
            translations = [sp.zeros(d, 1)]
            if m:
                shift = sp.zeros(d, 1)
                shift[0] = sp.Rational(1, p)
                translations.append(shift)
            reps = []
            for index, shift in enumerate(translations):
                reps.append({'index': index, 'point_generators': [_matrix(g)],
                             'generator_translations': [list(shift)],
                             'torsion_free': bool(index),
                             'orbit_size': 1 if index == 0 else p**m-1})
            item.update(affine_representatives=reps, affine_class_count=len(reps), affine_complete=True,
                        affine_certificate='H^2(C_p,L)=(Z/p)^(a-t). Integral changes of basis on the trivial summands and Galois normalizers are transitive on its nonzero vectors. Zero is a separate orbit.')
        classes.append(item)
    return {'z_classes': classes, 'z_class_count': len(classes), 'z_class_lower_bound': len(classes),
            'z_complete': True, 'input_z_index': input_t,
            'affine_complete': bool(affine),
            'affine_class_count': sum(x['affine_class_count'] for x in classes) if affine else None,
            'certificate': {'method': 'diederichsen_reiner_prime_order',
                            'prime': p, 'cyclotomic_class_number': 1,
                            'distinctness': 'The rank of g-I over F_p determines t and is preserved by all integral conjugacies and all automorphisms of C_p.',
                            'exhaustion': 'For p=2,3,5,7 every integral C_p lattice is a direct sum of trivial, cyclotomic and regular blocks; the cyclotomic ideal class groups are trivial.',
                            'reference': 'https://doi.org/10.1090/S0002-9939-1957-0083493-6'},
            'scope': 'Complete Q-to-Z classification of this prime-order cyclic rational representation, in dimension at most six.'}


def _isometries(left, right, max_vectors, max_matrices):
    """All T with T.T*left*T=right, with exhaustive inverse-Gram bounds."""
    d = left.rows
    inverse = left.inv()
    cache, tested = {}, 0
    for norm in set(right.diagonal()):
        limits = [isqrt(int(sp.floor(norm*inverse[i, i]))) for i in range(d)]
        tested += prod(2*x+1 for x in limits)
        if tested > max_vectors:
            raise cb.SearchLimitError('Integral isometry vector budget exceeded')
        vectors = []
        for values in product(*(range(-x, x+1) for x in limits)):
            v = sp.Matrix(values)
            if (v.T*left*v)[0] == norm:
                vectors.append(v)
        cache[norm] = vectors
    leaves = 0
    def grow(columns):
        nonlocal leaves
        j = len(columns)
        if j == d:
            leaves += 1
            if leaves > max_matrices:
                raise cb.SearchLimitError('Integral isometry matrix budget exceeded')
            t = sp.Matrix.hstack(*columns)
            if abs(t.det()) == 1:
                yield t
            return
        for v in cache[right[j, j]]:
            if all((col.T*left*v)[0] == right[i, j] for i, col in enumerate(columns)):
                yield from grow(columns+[v])
    yield from grow([])


def integral_equivalence(left, right, max_order=4096, max_vectors=200000, max_matrices=100000):
    """Proof-producing integral equivalence; unknown is an explicit outcome."""
    lg = [cb._mat(x) for x in left]
    rg = [cb._mat(x) for x in right]
    if not lg or not rg or len(lg[0]) != len(rg[0]):
        raise ValueError('Supply two nonempty generator sets of the same dimension')
    a, b = cb.group_closure(lg, max_order), cb.group_closure(rg, max_order)
    if set(a) == set(b):
        return {'status': 'equivalent', 'conjugator': sp.eye(len(a[0])), 'certificate': 'The two exact matrix groups are identical.'}
    if len(a) != len(b):
        return {'status': 'inequivalent', 'certificate': 'Different finite group orders.'}
    pt, qt = _prime_type(a), _prime_type(b)
    if pt is not None:
        return {'status': 'equivalent' if pt == qt else 'inequivalent',
                'certificate': {'method': 'complete_prime_cyclic_integral_invariant', 'left': pt, 'right': qt}}
    af = ce.invariant_form_dimension(a) == 1
    bf = ce.invariant_form_dimension(b) == 1
    if af != bf or _invariant(a, lg, af) != _invariant(b, rg, bf):
        return {'status': 'inequivalent', 'certificate': 'Unequal exact integral conjugacy invariants (element Smith forms, coinvariants or primitive invariant-form determinant).'}
    if not af:
        return {'status': 'inconclusive', 'certificate': 'The available integral invariants coincide; the general reducible integral-conjugacy problem is not decided by this test.'}
    f, h = _primitive_gram(a), _primitive_gram(b)
    try:
        for t in _isometries(f, h, max_vectors, max_matrices):
            ti = t.inv()
            if all(_matrix(ti*sp.Matrix(g)*t) in set(b) for g in lg):
                return {'status': 'equivalent', 'conjugator': t,
                        'certificate': 'Exact unimodular T with T^-1 G_left T=G_right; equal finite orders prove equality.'}
    except cb.SearchLimitError as error:
        return {'status': 'inconclusive', 'certificate': str(error)}
    return {'status': 'inequivalent', 'certificate': 'The invariant symmetric form space is one-dimensional. Every integral conjugacy must be an isometry of the primitive invariant forms; exhaustive integral isometry enumeration found none.'}


def _prime_neighbours(generators, p):
    """All proper invariant lattices between pL and L.

    Hyperplanes come first; other subspaces are unique reduced row-echelon
    matrices.  Including codimension > 1 is essential when a simple modular
    constituent has dimension greater than one.
    """
    d = len(generators[0])
    matrices = [sp.Matrix(g) for g in generators]
    for first in range(d):
        for tail in product(range(p), repeat=d-first-1):
            row = [0]*first+[1]+list(tail)
            # The kernel of f is invariant iff f*g is a scalar multiple of f.
            valid = True
            for g in matrices:
                values = [sum(row[i]*int(g[i, j]) for i in range(d)) % p for j in range(d)]
                if any(values[j] != values[first]*row[j] % p for j in range(d)):
                    valid = False
                    break
            if not valid:
                yield None
                continue
            basis = sp.eye(d)
            basis[first, first] = p
            for j in range(first+1, d):
                basis[first, j] = -row[j]
            basis = hermite_normal_form(basis)
            inverse = basis.inv()
            conjugates = [inverse*g*basis for g in matrices]
            if any(x.q != 1 for g in conjugates for x in g):
                raise ArithmeticError('Invariant neighbour failed exact integrality verification')
            yield basis, [_matrix(g) for g in conjugates]
    for k in range(1, d-1):
        for pivots in combinations(range(d), k):
            slots = [(i, j) for i in range(k) for j in range(pivots[i]+1, d) if j not in pivots]
            for entries in product(range(p), repeat=len(slots)):
                rows = [[int(j == pivots[i]) for j in range(d)] for i in range(k)]
                for (i, j), value in zip(slots, entries):
                    rows[i][j] = value
                valid = True
                for g in generators:
                    for row in rows:
                        values = [sum(g[j][i]*row[i] for i in range(d)) % p for j in range(d)]
                        if any(values[j] != sum(values[pivots[i]]*rows[i][j] for i in range(k)) % p for j in range(d)):
                            valid = False
                            break
                    if not valid:
                        break
                if not valid:
                    yield None
                    continue
                basis = hermite_normal_form(sp.Matrix.hstack(sp.Matrix(rows).T, p*sp.eye(d)))
                inverse = basis.inv()
                conjugates = [inverse*g*basis for g in matrices]
                if any(x.q != 1 for g in conjugates for x in g):
                    raise ArithmeticError('Invariant subspace lift failed exact integrality verification')
                yield basis, [_matrix(g) for g in conjugates]


def _catalogue_entry(payload, catalog, generators):
    if catalog is None:
        return None
    if payload.get('name') and 'generators' not in payload:
        return cb._entry(payload['name'], catalog)
    identification = cb.classify({'generators': cb._serial(generators),
                                  'max_order': payload.get('max_order', 4096)}, catalog)
    if identification['q_status'] != 'certified':
        return None
    return cb._entry(identification['q_class']['name'], catalog)


def _search_classes(generators, group, entry, payload):
    d = len(generators[0])
    expected = entry['z_classes'] if entry else None
    max_candidates = _limit(payload, 'max_candidates', 4000, 100000)
    max_classes = _limit(payload, 'max_classes', 128, 4096)
    max_depth = _limit(payload, 'max_depth', 4, 16)
    max_vectors = _limit(payload, 'max_vectors', 200000, 2000000)
    max_matrices = _limit(payload, 'max_matrices', 20000, 100000)
    max_order = _limit(payload, 'max_order', 4096, 120000)
    unique_form = ce.invariant_form_dimension(group) == 1
    initial = {'index': 0, 'generators': generators, 'basis': sp.eye(d), 'depth': 0,
               'certificate': 'The supplied integral representative belongs to the selected Q class.'}
    classes = [initial]
    invariants = [_invariant(group, generators, unique_form)]
    queue = deque([0])
    tested = unknown = duplicates = 0
    reason = 'queue_exhausted_without_global_completeness_proof'
    primes = list(sp.factorint(len(group)))
    while queue and len(classes) != expected:
        index = queue.popleft()
        current = classes[index]
        if current['depth'] >= max_depth:
            reason = 'max_depth'
            continue
        for p in primes:
            for neighbor in _prime_neighbours(current['generators'], p):
                tested += 1
                if tested > max_candidates:
                    reason = 'max_candidates'
                    queue.clear()
                    break
                if neighbor is None:
                    continue
                basis, ng = neighbor
                # Matrices of the neighbour group are directly conjugated, avoiding
                # another closure walk and retaining the exact Q-membership witness.
                ni = basis.inv()
                current_group = cb.group_closure(current['generators'], max_order)
                n_group = [_matrix(ni*sp.Matrix(g)*basis) for g in current_group]
                invariant = _invariant(n_group, ng, unique_form)
                matches = [i for i, key in enumerate(invariants) if key == invariant]
                distinct = True
                for previous in matches:
                    decision = integral_equivalence(classes[previous]['generators'], ng,
                                                    max_order, max_vectors, max_matrices)
                    if decision['status'] != 'inequivalent':
                        distinct = False
                        if decision['status'] == 'equivalent':
                            duplicates += 1
                        else:
                            unknown += 1
                        break
                if not distinct:
                    continue
                if len(classes) >= max_classes:
                    reason = 'max_classes'
                    queue.clear()
                    break
                combined = sp.Matrix(current['basis'])*basis
                new = {'index': len(classes), 'generators': ng, 'basis': combined,
                       'depth': current['depth']+1, 'parent': index, 'prime': p,
                       'neighbour_index': int(basis.det()),
                       'certificate': 'B^-1 G_input B is integral. Each earlier representative is proved inequivalent by an integral invariant or exhaustive primitive-form isometry search.'}
                classes.append(new)
                invariants.append(invariant)
                queue.append(new['index'])
                if expected is not None and len(classes) > expected:
                    raise ArithmeticError('Proved integral classes exceed the selected catalogue cardinality')
                if len(classes) == expected:
                    break
            if len(classes) == expected or not queue and reason in ('max_candidates', 'max_classes'):
                break
    complete = expected is not None and len(classes) == expected
    return {'z_classes': classes, 'z_class_count': len(classes) if complete else None,
            'z_class_lower_bound': len(classes), 'z_complete': complete,
            'affine_complete': False, 'affine_class_count': None,
            'certificate': {'method': 'catalogue_cardinality_exhaustion' if complete else 'certified_distinct_subset',
                            'official_z_class_count': expected,
                            'pairwise_distinctness': 'Exact Smith invariants and, for unique-form representations, exhaustive integral isometry tests.',
                            'q_membership': 'Every representative has an explicit rational invariant-lattice basis.',
                            'completeness': 'The independent CARAT count is attained by pairwise proved inequivalent representatives.' if complete else 'No completeness conclusion follows from this finite search.'},
            'search': {'examined_modular_subspaces': min(tested, max_candidates),
                       'proved_duplicate_candidates': duplicates, 'unresolved_candidates': unknown,
                       'stop_reason': 'official_count_attained' if complete else reason,
                       'max_depth': max_depth, 'primes': primes},
            'scope': 'Certified complete Q-to-Z classification.' if complete else 'Certified pairwise distinct integral classes; search limits or unresolved integral conjugacies leave the full classification open.'}


def _affine_aggregate(result, entry, payload):
    from integral_normalizer import normalizer
    all_complete = result['z_complete']
    total = 0
    for item in result['z_classes']:
        group = cb.group_closure(item['generators'], _limit(payload, 'max_order', 4096, 120000))
        data = ce.extension_data(group, _limit(payload, 'max_extensions', 4096, 65536))
        if len(data['classes']) == 1:
            n = {'generators': [cb._identity(len(group[0]))], 'complete': False,
                 'certificate': 'Normalizer construction is unnecessary because H^2 is trivial.'}
        else:
            try:
                n = normalizer(group, max_vectors=_limit(payload, 'max_vectors', 200000, 2000000),
                               max_matrices=_limit(payload, 'max_matrices', 20000, 100000),
                               max_orbit=_limit(payload, 'max_orbit', 20000, 100000),
                               max_module_trials=_limit(payload, 'max_module_trials', 20000, 100000))
            except (cb.SearchLimitError, c.SearchLimitError) as error:
                n = {'generators': [cb._identity(len(group[0]))], 'complete': False,
                     'certificate': 'Normalizer resource limit reached; retain the identity subgroup and every exact cohomology class.',
                     'resource_limit': str(error)}
        orbits = ce.extension_orbits(data, n['generators'], n['complete'])
        representatives = []
        for index, orbit in enumerate(orbits['orbits']):
            extension_index = orbit['representative']
            label, vector = data['classes'][extension_index]
            shifts = [[value % 1 for value in data['words'][g]*vector] for g in data['generators']]
            representatives.append({'index': index, 'extension_index': extension_index,
                                    'cohomology_coordinates': label,
                                    'point_generators': data['generators'],
                                    'generator_translations': shifts,
                                    'orbit_size': len(orbit['extensionIndices'])})
        orbit_complete = n['complete'] or orbits['orbitCount'] == 1
        item.update(cohomology_invariants=data['invariants'], extension_count=len(data['classes']),
                    affine_class_count=orbits['orbitCount'], affine_complete=orbit_complete,
                    normalizer=n, affine_orbits=orbits['orbits'],
                    affine_representatives=representatives)
        total += orbits['orbitCount']
        all_complete = all_complete and orbit_complete
    # Subgroup orbits cover the whole exact cohomology set, and true affine
    # orbits can only MERGE these orbits.  Equality with an independent total
    # is therefore a rigorous exhaustion certificate, without asserting that
    # the subgroup is the full (possibly infinite) integral normalizer.
    cardinality_complete = bool(result['z_complete'] and entry and total == entry['affine_classes'])
    if cardinality_complete:
        all_complete = True
        for item in result['z_classes']:
            item['affine_complete'] = True
        result['affine_certificate'] = {'method': 'catalogue_affine_cardinality_exhaustion',
                                        'official_affine_count': entry['affine_classes'],
                                        'proof': 'All Z classes and all cohomology classes are covered. True normalizer orbits can only merge computed subgroup orbits. Equality of their total with the independent official affine count excludes every possible merger.'}
    if all_complete and entry and total != entry['affine_classes']:
        raise ArithmeticError('Complete affine calculation disagrees with the independent CARAT count')
    result.update(affine_complete=all_complete, affine_class_count=total if all_complete else None,
                  computed_affine_orbit_count=total,
                  affine_scope='All affine classes across every Z class in this rational class.' if all_complete else 'Computed normalizer orbits are provisional unless both Z-class and normalizer completeness are proved.')


def run(payload, catalog=None):
    if not isinstance(payload, dict):
        raise ValueError('Expected a JSON object')
    action = payload.get('action', 'z_classes')
    if action == 'z_equivalent':
        left, right = payload.get('left_generators'), payload.get('right_generators')
        if not isinstance(left, list) or not isinstance(right, list) or not left or not right:
            raise ValueError('z_equivalent requires left_generators and right_generators')
        result = integral_equivalence(left, right,
                                      _limit(payload, 'max_order', 4096, 120000),
                                      _limit(payload, 'max_vectors', 200000, 2000000),
                                      _limit(payload, 'max_matrices', 20000, 100000))
        return cb._serial({'action': action, 'dimension': len(left[0]), **result})
    if action not in ('z_classes', 'affine_classes'):
        raise ValueError('Unknown integral-classification action')
    generators = cb._generators(payload, catalog)
    d = len(generators[0])
    if 'dimension' in payload and (isinstance(payload['dimension'], bool) or payload['dimension'] != d):
        raise ValueError('dimension disagrees with the supplied generator matrices')
    group = cb.group_closure(generators, _limit(payload, 'max_order', 4096, 120000))
    entry = _catalogue_entry(payload, catalog, generators)
    affine = action == 'affine_classes'
    if len(group) == 1:
        result = {'z_classes': [{'index': 0, 'generators': [cb._identity(d)],
                                'affine_representatives': [{'index': 0, 'point_generators': [cb._identity(d)],
                                                            'generator_translations': [[0]*d], 'torsion_free': True}] if affine else [],
                                'affine_complete': affine, 'affine_class_count': 1 if affine else None}],
                  'z_complete': True, 'z_class_count': 1, 'z_class_lower_bound': 1,
                  'affine_complete': affine, 'affine_class_count': 1 if affine else None,
                  'certificate': {'method': 'trivial_point_group'}, 'scope': 'The unique free abelian crystallographic group Z^d.'}
    elif _prime_type(group) is not None:
        result = _prime_classes(group, affine)
        if entry and result['z_class_count'] != entry['z_classes']:
            raise ArithmeticError('Constructive prime cyclic classification disagrees with catalogue Z count')
        if affine and entry and result['affine_class_count'] != entry['affine_classes']:
            raise ArithmeticError('Constructive prime cyclic classification disagrees with catalogue affine count')
    else:
        result = _search_classes(generators, group, entry, payload)
        if affine:
            _affine_aggregate(result, entry, payload)
    result.update(action=action, dimension=d, group_order=len(group),
                  q_class=cb._summary(entry) if entry else None,
                  implicit_translation_lattice=cb._identity(d),
                  affine_convention='Each affine representative includes all unit translations of Z^d in addition to its listed point generators and shifts; operations act on column coordinates.',
                  class_labels='Local Python representative indices; these are not CARAT Z-name indices.')
    return cb._serial(result)
