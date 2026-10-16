"""Exact Python access to CARAT's complete 1–6 dimensional Q catalogue.

GPL-3.0-or-later. Catalogue data originate from CARAT, GPL-2.0-or-later.
The classification invariants are ported from compute_q_matrix.c (first nine
rows). A unique match is certified against the exhaustive official catalogue;
collisions require an explicit rational conjugator, never a heuristic label.
Z-class enumeration is explicitly bounded invariant-lattice enumeration, not
an assertion that all 85,308 six-dimensional integral classes were generated.
All arithmetic is exact; no native CARAT binary or remote calculation is used.
"""
from collections import deque
from fractions import Fraction
from itertools import product, permutations
from math import prod
import json
import random

import sympy as sp


class SearchLimitError(ValueError):
    pass


def _int(value):
    if isinstance(value, bool):
        raise ValueError('Boolean is not an integer coordinate')
    q = Fraction(str(value))
    if q.denominator != 1:
        raise ValueError('Point-group generators must be integer matrices')
    return q.numerator


def _mat(values, dimension=None):
    a = tuple(tuple(_int(x) for x in row) for row in values)
    d = len(a)
    if not 1 <= d <= 6 or any(len(row) != d for row in a) or dimension not in [None,d]:
        raise ValueError('Expected square matrices of one common dimension between 1 and 6')
    if abs(int(sp.Matrix(a).det())) != 1:
        raise ValueError('Point-group matrices must have determinant +1 or -1')
    return a


def _identity(d):
    return tuple(tuple(int(i == j) for j in range(d)) for i in range(d))


def _mul(a, b):
    # Python integers have no fixed-width overflow, including strongly sheared bases.
    cols = tuple(zip(*b))
    return tuple(tuple(sum(x*y for x,y in zip(row,col)) for col in cols) for row in a)


def _inverse(a):
    return tuple(tuple(int(x) for x in row) for row in sp.Matrix(a).inv().tolist())


def _trace(a):
    return sum(a[i][i] for i in range(len(a)))


def _serial(value):
    if isinstance(value,bool):
        return value
    if isinstance(value, sp.MatrixBase):
        return [[_serial(x) for x in row] for row in value.tolist()]
    if isinstance(value, (sp.Integer,int)):
        return int(value)
    if isinstance(value, (sp.Rational,Fraction)):
        return int(value) if value.denominator == 1 else str(value)
    if isinstance(value, dict):
        return {str(k):_serial(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):
        return [_serial(x) for x in value]
    return value


def _generators(payload, catalog=None):
    raw = payload.get('generators')
    if raw is None and payload.get('name'):
        raw = _entry(payload['name'],catalog)['generators']
    if not isinstance(raw,list) or not 1 <= len(raw) <= 32:
        raise ValueError('Supply one to 32 point-group generator matrices, or a catalogue name')
    gens = [_mat(g) for g in raw]
    if len({len(x) for x in gens}) != 1:
        raise ValueError('Generator dimensions differ')
    return list(dict.fromkeys(gens))


def group_closure(generators, max_order=120000):
    """Enumerate a finite integral group; an exceeded bound means inconclusive."""
    d = len(generators[0])
    eye = _identity(d)
    found = {eye}
    values = [eye]
    for a in values:
        for g in generators:
            b = _mul(g,a)
            if b not in found:
                if len(found) >= max_order:
                    raise SearchLimitError('Group closure exceeded max_order; finiteness/classification is not established')
                if max(abs(x) for row in b for x in row).bit_length() > 512:
                    raise SearchLimitError('Matrix entries exceeded the exact-arithmetic resource bound; group may be infinite')
                found.add(b)
                values.append(b)
    return values


def _element_signature(a):
    d = len(a)
    eye = _identity(d)
    power = a
    order = 1
    while power != eye:
        power = _mul(power,a)
        order += 1
        if order > 60:
            raise ValueError('Element order exceeds the finite GL(6,Z) bound')
    square = _mul(a,a)
    m = sp.Matrix(a)
    minus = (m-sp.eye(d)).rank()
    plus = (m+sp.eye(d)).rank()
    return (order,_trace(a),_trace(square),_trace(_mul(square,a)),minus,plus,minus,plus)


def characteristic_fingerprint(generators, group=None, max_order=120000):
    """Sorted first nine rows of CARAT's exact characteristic matrix."""
    group = group if group is not None else group_closure(generators,max_order)
    remaining = set(group)
    inverse_gens = [_inverse(g) for g in generators]
    columns = []
    while remaining:
        first = next(iter(remaining))
        orbit = {first}
        queue = [first]
        for a in queue:
            for g,inv in zip(generators,inverse_gens):
                b = _mul(_mul(g,a),inv)
                if b not in orbit:
                    orbit.add(b)
                    queue.append(b)
        remaining.difference_update(orbit)
        columns.append((len(orbit),)+_element_signature(first))
    return sorted(columns)


def _polynomial_matrix(poly, matrix):
    result = sp.zeros(matrix.rows)
    for coefficient in poly.all_coeffs():
        result = result*matrix+coefficient*sp.eye(matrix.rows)
    return result


def full_characteristic_matrix(generators,group):
    """Port CARAT's central-idempotent character invariant over exact Q.

    Class sums span the centre of the semisimple rational image algebra. A
    central element whose squarefree minimal polynomial has degree equal to
    this centre's dimension generates the whole centre. CRT projectors then
    provably give all primitive central idempotents (no numerical eigensolver).
    """
    remaining = set(group)
    inverses = [_inverse(g) for g in generators]
    d = len(generators[0])
    representatives, sizes, sums = [],[],[]
    while remaining:
        first = next(iter(remaining))
        orbit, queue = {first},[first]
        for a in queue:
            for g,inv in zip(generators,inverses):
                b = _mul(_mul(g,a),inv)
                if b not in orbit:
                    orbit.add(b); queue.append(b)
        remaining.difference_update(orbit)
        representatives.append(first); sizes.append(len(orbit))
        sums.append(sp.Matrix(d,d,[sum(a[i][j] for a in orbit) for i in range(d) for j in range(d)]))
    columns = sp.Matrix.hstack(*(sp.Matrix(d*d,1,list(a)) for a in sums))
    pivots = columns.rref()[1]
    basis = [sums[i] for i in pivots]
    t = sp.Symbol('_carat_t')
    rng = random.Random(1789)
    chosen = None
    choices = list(basis)
    choices += [sum((rng.randint(-8,8)*a for a in basis),sp.zeros(d)) for _ in range(64)]
    for central in choices:
        polynomial = central.charpoly(t).as_poly().sqf_part()
        if polynomial.degree() == len(basis):
            chosen = central,polynomial
            break
    if chosen is None:
        raise SearchLimitError('Could not certify a primitive element of the rational centre within the deterministic search budget')
    central,polynomial = chosen
    idempotents = []
    for factor,_ in polynomial.factor_list()[1]:
        other = polynomial.exquo(factor)
        projection_poly = (sp.invert(other,factor)*other).rem(polynomial)
        e = _polynomial_matrix(projection_poly,central)
        assert e*e == e
        idempotents.append(e)
    assert sum(idempotents,sp.zeros(d)) == sp.eye(d)
    leading = [(size,)+_element_signature(a) for size,a in zip(sizes,representatives)]
    characters = [[sp.trace(e*sp.Matrix(a)) for a in representatives] for e in idempotents]
    best = None
    for order in permutations(range(len(characters))):
        cols = sorted(tuple(leading[j])+tuple(characters[i][j] for i in order) for j in range(len(leading)))
        rows = tuple(tuple(row) for row in zip(*cols))
        if best is None or rows < best: best = rows
    return [list(row) for row in best]


def _catalog(catalog, dimension=None):
    if isinstance(catalog,str):
        catalog = json.loads(catalog)
    if not isinstance(catalog,dict) or not isinstance(catalog.get('entries'),list):
        raise ValueError('Load the matching data/carat/q{dimension}.json.gz catalogue first')
    if dimension is not None and int(catalog['dimension']) != int(dimension):
        raise ValueError('Catalogue dimension does not match the requested group')
    return catalog


def _entry(name, catalog):
    catalog = _catalog(catalog)
    found = [x for x in catalog['entries'] if x['name'] == name]
    if len(found) != 1:
        raise ValueError('Unknown CARAT Q name for this dimension: '+str(name))
    return found[0]


def _summary(e):
    return {k:e[k] for k in ['name','dimension','symbol','order','discriminant','z_classes','affine_classes','torsion_free','conjugacy_classes','idempotents']}


def browse(payload,catalog):
    rows = catalog['entries']
    query = str(payload.get('query','')).strip().lower()
    if query:
        rows = [x for x in rows if query in (x['name']+' '+x['symbol']).lower()]
    for key in ['order','z_classes','affine_classes','torsion_free','conjugacy_classes']:
        if payload.get(key) is not None:
            rows = [x for x in rows if x[key] == int(payload[key])]
    offset = max(0,int(payload.get('offset',0)))
    limit = min(500,max(1,int(payload.get('limit',50))))
    totals = {key:sum(x[key] for x in catalog['entries']) for key in ['z_classes','affine_classes','torsion_free']}
    return {'action':'catalog','dimension':catalog['dimension'],'q_classes':len(catalog['entries']),
            **totals,'total_matches':len(rows),'offset':offset,'entries':[_summary(x) for x in rows[offset:offset+limit]],
            'complete_q_catalog':True,'scope':'Z and affine values are official class counts, not precomputed representative lists.'}


def representative(payload,catalog):
    e = _entry(payload.get('name'),catalog)
    result = dict(e)
    generators = [sp.Matrix(x) for x in e['generators']]
    basis = payload.get('basis')
    if basis is not None:
        b = sp.Matrix([[sp.Rational(str(x)) for x in row] for row in basis])
        if b.shape != (e['dimension'],e['dimension']) or not b.det():
            raise ValueError('basis must be a nonsingular rational matrix of the selected dimension')
        transformed = [b.inv()*g*b for g in generators]
        if any(x.q != 1 for g in transformed for x in g):
            raise ValueError('This basis does not give an integral invariant lattice representation')
        result['generators'] = [_serial(g) for g in transformed]
        result['basis'] = _serial(b)
        result['basis_convention'] = 'g_new = basis^-1 g_catalog basis'
        integral_certificate = bool(abs(b.det()) == 1 and all(x.q == 1 for x in b))
        identical = all(a == g for a,g in zip(transformed,generators))
        result['z_equivalent_to_catalog_representative'] = True if integral_certificate or identical else None
        result['z_equivalence_status'] = 'certified' if integral_certificate or identical else 'inconclusive'
    result['split_affine_generators'] = [{'rotation':g,'translation':[0]*e['dimension']} for g in result['generators']]
    result['implicit_translation_lattice'] = _serial(sp.eye(e['dimension']))
    result['action'] = 'representative'
    result['representative_scope'] = 'One integral representative of this Q class; the zero cocycle gives its split space group.'
    return result


def _intertwiner(left,right,attempts=256):
    d = len(left[0])
    equations = []
    for a,b in zip(left,right):
        for i in range(d):
            for j in range(d):
                row = [0]*(d*d)
                for k in range(d):
                    row[k*d+j] += a[i][k]
                    row[i*d+k] -= b[k][j]
                equations.append(row)
    space = sp.Matrix(equations).nullspace()
    if not space:
        return None
    def candidates():
        yield from space
        rng = random.Random(1327)
        for _ in range(min(attempts,256)):
            coefficients = [rng.randint(-d,d) for _ in space]
            yield sum((x*v for x,v in zip(coefficients,space)),sp.zeros(d*d,1))
    for vector in candidates():
        c = sp.Matrix(d,d,list(vector))
        if c.det():
            # Primitive integer scaling can improve an integral certificate.
            den = sp.ilcm(*[x.q for x in c]) if len(c) > 1 else c[0].q
            c *= den
            divisor = sp.igcd(*[int(x) for x in c]) if len(c) > 1 else abs(int(c[0]))
            if divisor: c /= divisor
            assert all(sp.Matrix(a)*c == c*sp.Matrix(b) for a,b in zip(left,right))
            return c
    return None


def _conjugator(gens,target_gens,target_group,max_attempts):
    target_set = set(target_group)
    if all(g in target_set for g in gens):
        return sp.eye(len(gens[0])),0
    signatures = {a:_element_signature(a) for a in target_group}
    generator_signatures = [_element_signature(g) for g in gens]
    pools = [[a for a,s in signatures.items() if s == signature] for signature in generator_signatures]
    attempts = 0
    for images in product(*pools):
        attempts += 1
        if attempts > max_attempts:
            return None,attempts-1
        if any(_trace(_mul(gens[i],gens[j])) != _trace(_mul(images[i],images[j])) for i in range(len(gens)) for j in range(i)):
            continue
        c = _intertwiner(gens,images)
        if c is not None:
            # A nonsingular intertwiner injects the whole group; equal orders
            # imply equality. Matrix-by-matrix checks are the certificate.
            inv = c.inv()
            if all(tuple(tuple(int(x) for x in row) for row in (inv*sp.Matrix(g)*c).tolist()) in target_set
                   and all(x.q == 1 for x in inv*sp.Matrix(g)*c) for g in gens):
                return c,attempts
    return None,attempts


def classify(payload,catalog):
    gens = _generators(payload,catalog)
    _catalog(catalog,len(gens[0]))
    max_order = min(120000,max(1,int(payload.get('max_order',120000))))
    group = group_closure(gens,max_order)
    fp = characteristic_fingerprint(gens,group)
    candidates = [e for e in catalog['entries'] if e['order'] == len(group) and [tuple(col) for col in e['fingerprint']] == fp]
    used_full = False
    if len(candidates)>1:
        full = full_characteristic_matrix(gens,group)
        candidates = [e for e in candidates if e['character_matrix'] == full]
        used_full = True
    result = {'action':'classify','dimension':len(gens[0]),'group_order':len(group),
              'fingerprint':_serial(fp),'candidates':[_summary(e) for e in candidates],
              'q_status':'inconclusive','z_status':'inconclusive','certificate':None}
    if not candidates:
        raise ValueError('Exact finite group has no matching official catalogue invariant; input or catalogue is inconsistent')
    if len(candidates) == 1:
        result.update(q_status='certified',q_class=_summary(candidates[0]),
                      certificate={'method':'unique_exact_invariant_in_complete_q_catalog','catalogue_size':len(catalog['entries']),
                                   'central_idempotents_used':used_full})
    # For literal standard generators a Z certificate is cheap even when the
    # full group is large. Otherwise compute only when explicitly requested.
    max_attempts = min(10000,max(1,int(payload.get('max_attempts',256))))
    for e in sorted(candidates,key=lambda e:set(_mat(g) for g in e['generators']) != set(gens)):
        target_gens = [_mat(g) for g in e['generators']]
        c = None
        count = 0
        if set(target_gens) == set(gens):
            c = sp.eye(len(gens[0]))
        elif len(candidates)>1 or payload.get('find_conjugator'):
            target_group = group_closure(target_gens,max_order)
            c,count = _conjugator(gens,target_gens,target_group,max_attempts)
        if c is not None:
            integral = bool(abs(c.det()) == 1 and all(x.q == 1 for x in c))
            result.update(q_status='certified',q_class=_summary(e),
                          z_status='certified_same_as_stored_representative' if integral else 'inconclusive',
                          certificate={'method':'exact_rational_conjugator','matrix':_serial(c),
                                       'determinant':_serial(c.det()),'convention':'C^-1 G_input C = G_catalog',
                                       'integral_unimodular':integral,'attempts':count})
            break
    result['scope'] = 'Q identification uses the complete catalogue. A non-unimodular Q conjugator does not decide Z equivalence. Unresolved searches return inconclusive.'
    return result


def _diagonals(index,d):
    if d == 1:
        yield (index,)
        return
    for a in range(1,index+1):
        if index % a == 0:
            for rest in _diagonals(index//a,d-1):
                yield (a,)+rest


def invariant_lattices(payload,catalog):
    """All invariant sublattices of Z^d up to a specified finite index.

    Column Hermite normal forms uniquely enumerate sublattices. Returned point
    groups are rationally conjugate and integral, but may share a Z class.
    """
    gens = [sp.Matrix(g) for g in _generators(payload,catalog)]
    d = gens[0].rows
    bound = min(64,max(1,int(payload.get('max_index',2))))
    budget = min(100000,max(1,int(payload.get('max_candidates',20000))))
    output = []
    examined = 0
    complete = True
    completed_index = 0
    for index in range(1,bound+1):
        for diagonal in _diagonals(index,d):
            slots = [(i,j) for j in range(d) for i in range(j)]
            for entries in product(*(range(diagonal[i]) for i,j in slots)):
                if examined >= budget:
                    complete = False
                    break
                examined += 1
                b = sp.diag(*diagonal)
                for (i,j),value in zip(slots,entries): b[i,j] = value
                inv = b.inv()
                conjugates = [inv*g*b for g in gens]
                if all(x.q == 1 for a in conjugates for x in a):
                    output.append({'index':index,'basis':_serial(b),'generators':[_serial(a) for a in conjugates],
                                   'certificate':'B^-1 g B is integral for every generator; det(B) equals index.'})
            if not complete: break
        if not complete: break
        completed_index = index
    return {'action':'invariant_lattices','dimension':d,'max_index':bound,'examined':examined,
            'complete_through_requested_index':complete,'complete_through_index':completed_index,
            'lattices':output,'lattice_count':len(output),'z_class_count':None,
            'scope':'Distinct sublattices can represent the same Z class. This finite-index enumeration is not complete Q-to-Z classification.'}


def run(payload,catalog=None):
    if not isinstance(payload,dict):
        raise ValueError('Expected a JSON object')
    catalog = _catalog(catalog,payload.get('dimension'))
    action = payload.get('action','catalog')
    if action in ['catalog','browse','q_catalog']:
        result = browse(payload,catalog)
    elif action in ['representative','reverse_name']:
        result = representative(payload,catalog)
    elif action in ['classify','name']:
        result = classify(payload,catalog)
    elif action in ['invariant_lattices','z_lattices']:
        result = invariant_lattices(payload,catalog)
    elif action in ['affine_extensions','affine_orbits','integral_normalizer']:
        import crystkit_extensions
        options = dict(payload)
        options['action'] = {'affine_extensions':'extensions','affine_orbits':'extension_orbits',
                             'integral_normalizer':'integral_normalizer'}[action]
        selected = representative(payload,catalog) if payload.get('name') else None
        options['point_generators'] = selected['generators'] if selected else _serial(_generators(payload,catalog))
        if action != 'affine_extensions' and 'normalizers' not in options:
            from integral_normalizer import run as calculate
            result = calculate(options)
        else:
            result = crystkit_extensions.run(options)
        result['action'] = action
        if selected:
            result['q_class'] = _summary(selected)
        result['catalogue_scope'] = 'Extensions of this selected integral point-group representative; other Z classes in the Q class require their own integral representatives.'
    else:
        raise ValueError('Unknown CARAT Python action: '+str(action))
    result['source_revision'] = catalog.get('source_revision')
    return _serial(result)
