"""Finite maximal-order envelopes for integral representation classification.

GPL-3.0-or-later. For split rational image algebras use direct sums of full
integer matrix orders; for abelian images use the small cyclotomic PID rings.
If c M is contained in Z[G], every G-lattice is G-linearly isomorphic to one
in c Z^d <= L <= Z^d with M L=Z^d. The finite interval is enumerated exactly.
Strict conductor mode proves completeness without a catalogue cardinality;
auto mode can additionally use an explicitly labelled cardinality fallback.
"""
from collections import deque
from itertools import product, permutations
from math import gcd, lcm

import sympy as sp
from sympy.matrices.normalforms import hermite_normal_form, smith_normal_form

import carat_browser as cb
import crystkit_extensions as ce
import crystkit_browser as c


def _tuple(a):
    return tuple(tuple(int(x) for x in row) for row in a.tolist())


def _key(a):
    return tuple(int(x) for x in a)


def _integer(a):
    return all(x.q == 1 for x in a)


def split_group_equivalence(left_generators, right_generators, max_order=4096,
                            max_assignments=20000, max_trials=2000, max_orbit=20000):
    """Finite unlabelled conjugacy test from all character-preserving maps.

    Each abstract group correspondence is decided by a complete arithmetic
    module-isomorphism test. Unknown arithmetic models or resource exhaustion
    are never treated as negative isomorphism results.
    """
    import arithmetic_centralizer as ac
    left = cb.group_closure([cb._mat(g) for g in left_generators], max_order)
    right = cb.group_closure([cb._mat(g) for g in right_generators], max_order)
    if len(left) != len(right):
        return {'status': 'inequivalent', 'certificate': 'Different finite group orders.'}
    decomposition = ac.split_decomposition(left, max_trials=max_trials)
    if decomposition is None:
        return {'status': 'inconclusive', 'certificate': 'The rational image algebra has no verified split maximal-order model.'}
    generators = ce._choose_generators(left) or [left[0]]
    signatures_left = {g: tuple(sp.Matrix(g).charpoly().all_coeffs()) for g in left}
    signatures_right = {g: tuple(sp.Matrix(g).charpoly().all_coeffs()) for g in right}
    pools = [[g for g in right if signatures_right[g] == signatures_left[a]] for a in generators]
    assignments = 1
    for pool in pools:
        assignments *= len(pool)
    if assignments > max_assignments:
        return {'status': 'inconclusive', 'certificate': 'Finite generator-image assignment count exceeds max_assignments.',
                'assignment_count': assignments}
    checked, unknown = 0, 0
    for images in product(*pools):
        mapping, used, queue = {left[0]: right[0]}, {right[0]}, [left[0]]
        valid = True
        for g in queue:
            for a, image in zip(generators, images):
                h, mapped = cb._mul(g, a), cb._mul(mapping[g], image)
                if h in mapping:
                    if mapping[h] != mapped:
                        valid = False
                        break
                elif mapped in used or signatures_left[h] != signatures_right[mapped]:
                    valid = False
                    break
                else:
                    mapping[h] = mapped
                    used.add(mapped)
                    queue.append(h)
            if not valid:
                break
        if not valid or len(mapping) != len(left):
            continue
        checked += 1
        try:
            decision = ac.labelled_integral_equivalence(generators, images,
                        max_trials=max_trials, max_orbit=max_orbit, decomposition=decomposition)
        except (cb.SearchLimitError, c.SearchLimitError):
            unknown += 1
            continue
        if decision['equivalent']:
            # The helper returns X G_left X^-1=G_right; public convention is
            # T^-1 G_left T=G_right, so return T=X^-1.
            witness = sp.Matrix(decision['conjugator']).inv()
            return {'status': 'equivalent', 'conjugator': witness,
                    'certificate': {'method': 'split_arithmetic_module_isomorphism',
                                    'character_preserving_correspondences_tested': checked,
                                    'integral_witness_verified': True}}
        if not decision['complete']:
            unknown += 1
    if unknown:
        return {'status': 'inconclusive', 'certificate': 'Some character-preserving correspondences exceeded the arithmetic orbit budget.',
                'unresolved_correspondences': unknown}
    return {'status': 'inequivalent', 'certificate': {
        'method': 'all_finite_group_correspondences_and_arithmetic_module_orbits',
        'character_preserving_correspondences_tested': checked,
        'generator_image_assignments': assignments}}


def _budget(payload, name, default, maximum):
    value = payload.get(name, default)
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= maximum:
        raise ValueError(f'{name} must be an integer between 1 and {maximum}')
    return value


def _order_lattice(group, components):
    """Z[G] in integral coordinates of the product of full matrix orders."""
    columns = []
    size = sum(x['irreducibleDimension'] if x.get('kind') == 'cyclotomic' else
               x['irreducibleDimension']**2 for x in components)
    basis = sp.zeros(size, 0)
    # Batch HNF avoids constructing a d^2 by |G| matrix for large groups.
    for count, raw in enumerate(group, 1):
        g = sp.Matrix(raw)
        values = []
        for component in components:
            start, r = component['start'], component['irreducibleDimension']
            values.extend(g[start:start+r, start] if component.get('kind') == 'cyclotomic'
                          else g[start:start+r, start:start+r])
        columns.append(sp.Matrix(values))
        if len(columns) >= 64 or count == len(group):
            basis = hermite_normal_form(sp.Matrix.hstack(basis, *columns))
            columns = []
    if basis.cols != size:
        return None
    smith = smith_normal_form(basis, domain=sp.ZZ)
    conductor = abs(int(smith[size-1, size-1]))
    if conductor < 1 or not _integer(basis.inv()*(conductor*sp.eye(size))):
        raise ArithmeticError('The conductor inclusion c M <= Z[G] failed its exact certificate')
    return {'basis': basis, 'conductor': conductor,
            'quotient_invariants': [abs(int(smith[i, i])) for i in range(size)],
            'index': abs(int(basis.det())), 'rank': size}


def _absolute_decomposition(generators, group):
    d = len(group[0])
    component = {'start': 0, 'irreducibleDimension': d, 'multiplicity': 1}
    order = _order_lattice(group, [component])
    if order is None:
        return None
    return {'basis': sp.eye(d), 'components': [component],
            'generators': generators, 'group': group, 'order': order,
            'method': 'full-rational-matrix-image-algebra'}


def _decomposition(generators, group, payload):
    direct = _absolute_decomposition(generators, group)
    if direct is not None:
        return direct
    # Abelian image algebras have a canonical commutative maximal order.
    # Fixed-space projectors avoid a large commutant-order computation in
    # repeated one-dimensional character blocks (for example dimensions 1+5).
    if all(cb._mul(a, b) == cb._mul(b, a) for i, a in enumerate(generators) for b in generators[i+1:]):
        return _cyclic_decomposition(generators, group, payload)
    try:
        import arithmetic_centralizer as ac
    except ImportError:
        return None
    decomposition = ac.split_decomposition(group, max_trials=_budget(payload, 'max_decomposition_trials', 2000, 20000))
    if decomposition is None:
        return _cyclic_decomposition(generators, group, payload)
    basis = sp.Matrix(decomposition['basis'])
    inverse = basis.inv()
    transformed = [inverse*sp.Matrix(g)*basis for g in group]
    if not all(_integer(g) for g in transformed):
        raise ArithmeticError('The split maximal-order model is not integral')
    components = decomposition['components']
    for g in transformed:
        expected = sp.zeros(g.rows)
        for component in components:
            start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
            block = g[start:start+r, start:start+r]
            expected[start:start+r*m, start:start+r*m] = sp.diag(*(block for _ in range(m)))
        if g != expected:
            raise ArithmeticError('The claimed split matrix-algebra block certificate failed')
    model_group = [_tuple(g) for g in transformed]
    order = _order_lattice(model_group, components)
    if order is None:
        raise ArithmeticError('The claimed split simple components do not span their product algebra')
    return {'basis': basis, 'components': components,
            'generators': [_tuple(inverse*sp.Matrix(g)*basis) for g in generators],
            'group': model_group, 'order': order, 'method': 'split-rational-maximal-order'}


def _cyclic_decomposition(generators, group, payload):
    """Unique commutative maximal order: small cyclotomic rings are PIDs."""
    import integral_normalizer as normalizer
    generator = normalizer._cyclic_generator(group)
    if generator is None:
        return _abelian_decomposition(generators, group, payload)
    d, order = len(group[0]), len(group)
    components, bases, start, trials = [], [], 0, 0
    max_trials = _budget(payload, 'max_decomposition_trials', 2000, 20000)
    for n in sp.divisors(order):
        r = int(sp.totient(n))
        if r > d:
            continue
        x = sp.Symbol('x')
        polynomial = sp.Poly(sp.cyclotomic_poly(n, x), x)
        value = sum((coefficient*generator**i for (i,), coefficient in polynomial.terms()), sp.zeros(d))
        lattice = normalizer._integer_kernel(value)
        if not lattice.cols:
            continue
        local = (lattice.T*lattice).inv()*lattice.T*generator*lattice
        module_basis, attempts = normalizer._module_basis(local, r, max_trials-trials)
        trials += attempts
        basis = lattice*module_basis
        companion = normalizer._companion(n)
        m = lattice.cols//r
        if local*module_basis != module_basis*sp.diag(*(companion for _ in range(m))):
            raise ArithmeticError('Cyclotomic maximal-order component failed its module certificate')
        components.append({'start': start, 'irreducibleDimension': r, 'multiplicity': m,
                           'kind': 'cyclotomic', 'conductor_n': int(n)})
        bases.append(basis)
        start += r*m
    basis = sp.Matrix.hstack(*bases)
    inverse = basis.inv()
    if any(not _integer(inverse*sp.Matrix(g)*basis) for g in group):
        raise ArithmeticError('Cyclotomic model matrices are not integral')
    model_group = [_tuple(inverse*sp.Matrix(g)*basis) for g in group]
    model_generators = [_tuple(inverse*sp.Matrix(g)*basis) for g in generators]
    image_order = _order_lattice(model_group, components)
    if image_order is None:
        raise ArithmeticError('Cyclotomic factors do not span their complete rational image algebra')
    return {'basis': basis, 'components': components, 'group': model_group,
            'generators': model_generators, 'order': image_order, 'cyclic_order': order,
            'method': 'cyclotomic-pid-maximal-order', 'orbit_is_unlabelled': True}


def _abelian_decomposition(generators, group, payload):
    """Every rational simple image of an abelian group is cyclotomic.

    The joint fixed-space projectors distinguish rational character kernels;
    faithful rational characters of one cyclic quotient form one Galois orbit.
    """
    import integral_normalizer as normalizer
    if any(cb._mul(a, b) != cb._mul(b, a) for i, a in enumerate(generators) for b in generators[i+1:]):
        return None
    d = len(group[0])
    eye, zero = sp.eye(d), sp.zeros(d)
    projectors = [eye]
    for raw in group:
        g = sp.Matrix(raw)
        order = cb._element_signature(raw)[0]
        fixed = sum((g**k for k in range(order)), zero)/order
        refined = []
        for projector in projectors:
            first, second = projector*fixed, projector*(eye-fixed)
            refined.extend(a for a in (first, second) if a != zero)
        projectors = refined
    bases, components, start, trials = [], [], 0, 0
    max_trials = _budget(payload, 'max_decomposition_trials', 2000, 20000)
    for projector in projectors:
        matrix = projector-eye
        matrix *= lcm(*(int(x.q) for x in matrix))
        lattice = normalizer._integer_kernel(matrix)
        left_inverse = (lattice.T*lattice).inv()*lattice.T
        local_group = [left_inverse*sp.Matrix(g)*lattice for g in group]
        orders = [cb._element_signature(_tuple(g))[0] for g in local_group]
        n = max(orders)
        generator = local_group[orders.index(n)]
        r = int(sp.totient(n))
        if lattice.cols % r:
            raise ArithmeticError('Abelian component has invalid cyclotomic multiplicity')
        m = lattice.cols//r
        module_basis, attempts = normalizer._module_basis(generator, r, max_trials-trials)
        trials += attempts
        companion = normalizer._companion(n)
        if generator*module_basis != module_basis*sp.diag(*(companion for _ in range(m))):
            raise ArithmeticError('Abelian cyclotomic module basis failed its exact certificate')
        bases.append(lattice*module_basis)
        components.append({'start': start, 'irreducibleDimension': r, 'multiplicity': m,
                           'kind': 'cyclotomic', 'conductor_n': n})
        start += r*m
    basis = sp.Matrix.hstack(*bases)
    inverse = basis.inv()
    transformed = [inverse*sp.Matrix(g)*basis for g in group]
    if any(not _integer(g) for g in transformed):
        raise ArithmeticError('Abelian maximal-order model is not integral')
    for component in components:
        start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
        a = normalizer._companion(component['conductor_n'])
        allowed = {_key(sp.diag(*(a**k for _ in range(m)))) for k in range(component['conductor_n'])}
        if any(_key(g[start:start+r*m, start:start+r*m]) not in allowed for g in transformed):
            raise ArithmeticError('The abelian rational component is not the certified cyclic field image')
    model_group = [_tuple(g) for g in transformed]
    image_order = _order_lattice(model_group, components)
    if image_order is None:
        raise ArithmeticError('Abelian components do not span their full product of number fields')
    return {'basis': basis, 'components': components, 'group': model_group,
            'generators': [_tuple(inverse*sp.Matrix(g)*basis) for g in generators],
            'order': image_order, 'cyclic_order': None,
            'method': 'abelian-cyclotomic-pid-maximal-order', 'orbit_is_unlabelled': True}


def _full_saturation(basis, components):
    """M L=Z^d iff each multiplicity projection lattice is Z^m."""
    for component in components:
        start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
        if component.get('kind') == 'cyclotomic':
            import integral_normalizer as normalizer
            action = sp.diag(*(normalizer._companion(component['conductor_n']) for _ in range(m)))
            rows = basis[start:start+r*m, :]
            generated = sp.Matrix.hstack(*(action**k*rows for k in range(r)))
            if hermite_normal_form(generated) != sp.eye(r*m):
                return False
            continue
        projected = sp.Matrix.hstack(*(sp.Matrix(m, basis.cols,
            lambda i, j: basis[start+i*r+k, j]) for k in range(r)))
        if hermite_normal_form(projected) != sp.eye(m):
            return False
    return True


def _centralizer_generators(components, d):
    result = []
    for component in components:
        start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
        for raw in ce._gl_generators(m):
            g = sp.eye(d)
            g[start:start+r*m, start:start+r*m] = sp.kronecker_product(sp.Matrix(raw), sp.eye(r))
            if g != sp.eye(d):
                result.append(g)
    return result


def _cyclotomic_normalizer_generators(components, d, order, group):
    import integral_normalizer as normalizer
    result = []
    for component in components:
        start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
        a = normalizer._companion(component['conductor_n'])
        for j in range(m):
            for unit in normalizer._units(a, component['conductor_n']):
                g = sp.eye(d)
                g[start+j*r:start+(j+1)*r, start+j*r:start+(j+1)*r] = unit
                result.append(g)
        for i in range(m):
            for j in range(m):
                if i == j:
                    continue
                for k in range(r):
                    g = sp.eye(d)
                    g[start+i*r:start+(i+1)*r, start+j*r:start+(j+1)*r] = a**k
                    result.append(g)
        for j in range(m-1):
            g = sp.eye(d)
            for k in range(r):
                g.row_swap(start+j*r+k, start+(j+1)*r+k)
            result.append(g)
    character_columns = []
    for component in components:
        start, r, n = component['start'], component['irreducibleDimension'], component['conductor_n']
        a = normalizer._companion(n)
        powers = {_key(a**k): k for k in range(n)}
        character_columns.append([powers[_key(sp.Matrix(raw)[start:start+r, start:start+r])] for raw in group])
    rows = set(zip(*character_columns))
    units = [[k for k in range(1, max(c['conductor_n'], 2)) if gcd(k, c['conductor_n']) == 1] for c in components]
    for permutation in permutations(range(len(components))):
        if any((components[j]['conductor_n'], components[j]['multiplicity']) !=
               (components[permutation[j]]['conductor_n'], components[permutation[j]]['multiplicity'])
               for j in range(len(components))):
            continue
        for powers in product(*units):
            transformed_rows = set()
            for row in rows:
                target = [0]*len(components)
                for j in range(len(components)):
                    target[permutation[j]] = row[j]*powers[j] % components[j]['conductor_n']
                transformed_rows.add(tuple(target))
            if transformed_rows != rows:
                continue
            g = sp.zeros(d)
            for j, component in enumerate(components):
                start, r, m = (component[k] for k in ('start', 'irreducibleDimension', 'multiplicity'))
                target = components[permutation[j]]['start']
                a = normalizer._companion(component['conductor_n'])
                sigma = sp.Matrix.hstack(*(a**(powers[j]*k)*sp.eye(r)[:, 0] for k in range(r)))
                g[target:target+r*m, start:start+r*m] = sp.diag(*(sigma for _ in range(m)))
            result.append(g)
    return [g for g in result if g != sp.eye(d)]


def _centralizer_orbit(basis, generators, conductor, max_orbit):
    """Finite exact labelled-module orbit, including conjugating transports."""
    first = hermite_normal_form(basis)
    states = [(first, sp.eye(first.rows))]
    found = {_key(first): 0}
    for lattice, transport in states:
        for g in generators:
            target = hermite_normal_form(g*lattice)
            key = _key(target)
            if key not in found:
                if len(states) >= max_orbit:
                    raise cb.SearchLimitError('Exact multiplicity-lattice orbit exceeds max_lattice_orbit')
                found[key] = len(states)
                states.append((target, g*transport))
    return states


def _linear_modular_simples(group, generators, p):
    """Prove every F_p-simple constituent is one-dimensional.

    A normal Sylow p-subgroup acts trivially on every simple module. If the
    quotient is abelian with exponent dividing p-1, all its irreducibles split
    over F_p. This includes every p-group and useful mixed-order cases.
    """
    residual, ppart = len(group), 1
    while residual % p == 0:
        residual //= p
        ppart *= p
    if residual == 1:
        return True
    subgroup = set()
    for g in group:
        order = cb._element_signature(g)[0]
        while order % p == 0:
            order //= p
        if order == 1:
            subgroup.add(g)
    if len(subgroup) != ppart:
        return False  # the union of all Sylow p-subgroups is larger
    for i, a in enumerate(generators):
        if _tuple(sp.Matrix(a)**(p-1)) not in subgroup:
            return False
        for b in generators[i+1:]:
            commutator = cb._mul(cb._mul(cb._mul(a, b), cb._inverse(a)), cb._inverse(b))
            if commutator not in subgroup:
                return False
    return True


def _envelope(decomposition, payload):
    from carat_integral import _prime_neighbours
    group, generators = decomposition['group'], decomposition['generators']
    d = len(group[0])
    conductor = decomposition['order']['conductor']
    components = decomposition['components']
    max_candidates = _budget(payload, 'max_candidates', 40000, 2000000)
    max_lattices = _budget(payload, 'max_lattices', 512, 20000)
    max_orbit = _budget(payload, 'max_lattice_orbit', 20000, 100000)
    primes = list(sp.factorint(conductor))
    hyperplane_primes = {p for p in primes if _linear_modular_simples(group, generators, p)}
    centralizers = (_cyclotomic_normalizer_generators(components, d, decomposition['cyclic_order'], group)
                    if decomposition.get('orbit_is_unlabelled') else _centralizer_generators(components, d))
    nodes = [{'basis': sp.eye(d), 'generators': generators, 'depth': 0}]
    known = {_key(sp.eye(d)): 0}
    queue = deque([0])
    examined = duplicates = boundary = nonsaturated = 0
    complete, reason = True, 'finite_conductor_interval_exhausted'
    while queue:
        index = queue.popleft()
        current = nodes[index]
        for p in primes:
            # Every simple F_p[P]-module of a finite p-group is trivial;
            # maximal invariant sublattices therefore have index p. Every
            # lattice in the interval lies along a chain of such maximals.
            hyperplanes_only = p in hyperplane_primes
            for neighbor in _prime_neighbours(current['generators'], p, hyperplanes_only=hyperplanes_only):
                examined += 1
                if examined > max_candidates:
                    complete, reason = False, 'max_candidates'
                    break
                if neighbor is None:
                    continue
                step, _ = neighbor
                basis = hermite_normal_form(current['basis']*step)
                key = _key(basis)
                if key in known:
                    duplicates += 1
                    continue
                inverse = basis.inv()
                if not _integer(inverse*(conductor*sp.eye(d))):
                    boundary += 1
                    continue
                if not _full_saturation(basis, components):
                    nonsaturated += 1
                    continue
                if len(nodes) >= max_lattices:
                    complete, reason = False, 'max_lattices'
                    break
                transformed = [inverse*sp.Matrix(g)*basis for g in generators]
                if not all(_integer(g) for g in transformed):
                    raise ArithmeticError('The conductor lattice is not invariant under the point group')
                node = {'basis': basis, 'generators': [_tuple(g) for g in transformed],
                        'depth': current['depth']+1, 'parent': index, 'prime': p}
                new_index = len(nodes)
                nodes.append(node)
                queue.append(new_index)
                # Every orbit lattice has isomorphic descendant intervals.
                # Complete arithmetic centralizer orbits therefore permit an
                # exact quotient of the finite lattice traversal, not a guess.
                try:
                    orbit = _centralizer_orbit(basis, centralizers, conductor, max_orbit)
                except cb.SearchLimitError:
                    complete, reason = False, 'max_lattice_orbit'
                    break
                for lattice, _ in orbit:
                    known[_key(lattice)] = new_index
            if not complete:
                break
        if not complete:
            break
    return {'nodes': nodes, 'complete': complete, 'search': {
        'method': 'finite_maximal_order_conductor_interval', 'conductor': conductor,
        'examined_modular_subspaces': min(examined, max_candidates),
        'labelled_module_classes_discovered': len(nodes), 'orbit_lattices_recorded': len(known),
        'duplicates': duplicates, 'outside_conductor_interval': boundary,
        'nonfull_maximal_order_saturation': nonsaturated, 'primes': primes,
        'proved_linear_modular_primes': sorted(hyperplane_primes),
        'stop_reason': reason}}


def classify(generators, group, payload, catalogue_entry=None):
    """Return a complete finite representative cover, then certified Z classes.

    None means that a supported maximal-order model was not proved. Incomplete
    quotient tests are distinguished from incomplete lattice coverage.
    """
    from carat_integral import integral_equivalence, _invariant
    decomposition = _decomposition(generators, group, payload)
    if decomposition is None:
        return None
    envelope = _envelope(decomposition, payload)
    representatives, invariants, unresolved = [], [], 0
    for node in envelope['nodes']:
        ng = cb.group_closure(node['generators'], payload.get('max_order', 4096))
        invariant = _invariant(ng, node['generators'])
        duplicate, undecided = False, False
        for i, previous in enumerate([] if decomposition.get('orbit_is_unlabelled') else representatives):
            if invariant != invariants[i]:
                continue
            decision = integral_equivalence(previous['generators'], node['generators'],
                                            payload.get('max_order', 4096),
                                            payload.get('max_vectors', 200000),
                                            payload.get('max_matrices', 20000))
            if decision['status'] == 'equivalent':
                duplicate = True
                break
            if decision['status'] == 'inconclusive':
                undecided = True
        if duplicate:
            continue
        if undecided:
            unresolved += 1
        item = {'index': len(representatives), 'generators': node['generators'],
                'basis': decomposition['basis']*node['basis'],
                'model_lattice_basis': node['basis'], 'depth': node['depth'],
                'pairwise_distinctness_proved': not undecided,
                'certificate': 'Exact maximal-order conductor lattice; supplied rational basis conjugates the original point group into these integral matrices.'}
        representatives.append(item)
        invariants.append(invariant)
    complete = envelope['complete'] and not unresolved
    cardinality_fallback = bool(not complete and payload.get('classification_method', 'auto') == 'auto'
                               and catalogue_entry and not unresolved
                               and len(representatives) == catalogue_entry['z_classes'])
    if cardinality_fallback:
        complete = True
    if complete and catalogue_entry and len(representatives) != catalogue_entry['z_classes']:
        raise ArithmeticError('Independent conductor-interval classification disagrees with the official Z count')
    return {'z_classes': representatives,
            'z_class_count': len(representatives) if complete else None,
            'z_class_lower_bound': sum(x['pairwise_distinctness_proved'] for x in representatives),
            'z_complete': complete, 'candidate_cover_complete': envelope['complete'],
            'candidate_representative_count': len(representatives),
            'unresolved_integral_equivalences': unresolved,
            'affine_complete': False, 'affine_class_count': None,
            'certificate': {'method': 'catalogue_cardinality_exhaustion' if cardinality_fallback else 'finite_maximal_order_conductor_exhaustion',
                            'decomposition': decomposition['method'],
                            'conductor': decomposition['order']['conductor'],
                            'image_order_rank': decomposition['order']['rank'],
                            'image_order_index': decomposition['order']['index'],
                            'order_quotient_invariants': decomposition['order']['quotient_invariants'],
                            'components': decomposition['components'],
                            'proof': 'c M is contained in Z[G]. Every maximal-order module is free in its multiplicity coordinates over Z or the certified small cyclotomic PID, so every G-lattice is G-linearly equivalent to c Z^d <= L <= Z^d with M L=Z^d. Exhaustive finite invariant-lattice traversal modulo full arithmetic multiplicity groups covers every integral representation. Abelian models additionally quotient every compatible component permutation and Galois automorphism; other unlabelled Z classes use separately recorded exact equivalence decisions.',
                            'catalogue_count_used_for_completeness': cardinality_fallback},
            'search': envelope['search'],
            'scope': ('Complete integral classification: pairwise distinct representatives attain the independent official count; the finite conductor traversal itself remains incomplete.' if cardinality_fallback else
                      'Complete integral classification proved by the finite maximal-order conductor interval.') if complete else
                     ('Complete finite representative cover; unresolved integral equivalences prevent a distinct Z-class count.' if envelope['complete'] else 'Resource-limited finite conductor search; the exact stopping condition and proven partial results are recorded.')}
