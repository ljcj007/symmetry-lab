"""Independent cardinality, cohomology and exact-conjugacy regression checks."""
import gzip
import json
from pathlib import Path
import sys
import time

import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
import carat_integral as ci
import carat_browser as cb
import crystkit_extensions as ce
import crystkit_browser as cryst

started = time.monotonic()
catalogs = {d: json.loads(gzip.decompress((ROOT/f'dist/data/carat/q{d}.json.gz').read_bytes())) for d in range(1, 7)}
checks = 0
prime_cases = []
for d, catalog in catalogs.items():
    for entry in catalog['entries']:
        if entry['order'] not in (2, 3, 5, 7):
            continue
        result = ci.run({'action': 'affine_classes', 'name': entry['name'], 'dimension': d}, catalog)
        assert result['z_complete'] and result['affine_complete']
        assert result['z_class_count'] == entry['z_classes']
        assert result['affine_class_count'] == entry['affine_classes']
        signatures = set()
        for item in result['z_classes']:
            group = cb.group_closure([cb._mat(g) for g in item['generators']])
            signatures.add(ci._prime_type(group))
            data = ce.extension_data(group)
            assert data['invariants'] == item['cohomology_invariants']
            assert sum(x['orbit_size'] for x in item['affine_representatives']) == len(data['classes'])
            for affine in item['affine_representatives']:
                g = sp.Matrix(affine['point_generators'][0])
                t = sp.Matrix([sp.Rational(x) for x in affine['generator_translations'][0]])
                norm = sum((g**k*t for k in range(entry['order'])), sp.zeros(d, 1))
                assert all(x.q == 1 for x in norm)
            shear = sp.eye(d)
            if d > 1:
                shear[0, d-1] = 37
            changed = [ci._matrix(shear.inv()*sp.Matrix(g)*shear) for g in item['generators']]
            eq = ci.integral_equivalence(item['generators'], changed)
            assert eq['status'] == 'equivalent'
        assert len(signatures) == entry['z_classes']
        prime_cases.append((d, entry['name']))
        checks += 1
assert len(prime_cases) == 34

# Noncyclic/reducible six-dimensional groups. All witnesses must transport
# the original generators exactly; no guessed labels or count-only matrices.
nonprime = [('group.1044', 2), ('min.351', 2), ('min.352', 4),
            ('min.353', 3), ('min.354', 3), ('group.1909', 4)]
for name, expected in nonprime:
    result = ci.run({'name': name, 'dimension': 6}, catalogs[6])
    assert result['z_complete'] and result['z_class_count'] == expected, (name, result['search'])
    original = [sp.Matrix(g) for g in cb._entry(name, catalogs[6])['generators']]
    for item in result['z_classes']:
        b = sp.Matrix(item['basis'])
        assert b.det() != 0
        assert all(b.inv()*g*b == sp.Matrix(h) for g, h in zip(original, item['generators']))
    for i in range(expected):
        for j in range(i):
            assert ci.integral_equivalence(result['z_classes'][i]['generators'], result['z_classes'][j]['generators'])['status'] == 'inequivalent'
    checks += 1

# Higher-dimensional modular constituents: there are 14 proper nonzero
# subspaces of F_2^3, and all are invariant under a scalar group.
neighbors = list(ci._prime_neighbours([cb._identity(3)], 2))
assert len(neighbors) == 14 and all(x is not None for x in neighbors)
assert {int(x[0].det()) for x in neighbors} == {2, 4}
assert len({tuple(x[0]) for x in neighbors}) == 14
checks += 1

# A non-prime, noncyclic 6D rational class with nontrivial H^2 in both
# integral representatives. The independently tabulated affine total is six.
affine = ci.run({'action': 'affine_classes', 'dimension': 6, 'name': 'group.1044'}, catalogs[6])
assert affine['z_class_count'] == 2 and affine['affine_class_count'] == 6
assert affine['affine_complete'] and [x['extension_count'] for x in affine['z_classes']] == [64, 16]
for item in affine['z_classes']:
    point_group = cb.group_closure([cb._mat(g) for g in item['generators']])
    data = ce.extension_data(point_group)
    assert len(item['affine_representatives']) == item['affine_class_count']
    for representative in item['affine_representatives']:
        operations = [cryst.operation({'rotation': g, 'translation': shift})
                      for g, shift in zip(representative['point_generators'], representative['generator_translations'])]
        quotient = cryst.affine_closure(operations)
        assert len(quotient) == len(point_group)
        assert ce._class_label(data, quotient) == tuple(representative['cohomology_coordinates'])
checks += 1

# A complete affine classification need not imply a complete normalizer.
# Deliberately use only the identity subgroup: for this 2D D8 case its two
# H^2 orbits already attain the independent affine count.
import integral_normalizer
saved_normalizer = integral_normalizer.normalizer
try:
    integral_normalizer.normalizer = lambda group, **options: {
        'generators': [cb._identity(len(group[0]))], 'complete': False,
        'certificate': 'Test subgroup only'}
    affine = ci.run({'action': 'affine_classes', 'dimension': 2, 'name': 'max.2'}, catalogs[2])
    assert affine['affine_complete'] and affine['affine_class_count'] == 2
    assert affine['affine_certificate']['method'] == 'catalogue_affine_cardinality_exhaustion'
    assert not affine['z_classes'][0]['normalizer']['complete']
    for representative in affine['z_classes'][0]['affine_representatives']:
        operations = [cryst.operation({'rotation': g, 'translation': shift})
                      for g, shift in zip(representative['point_generators'], representative['generator_translations'])]
        assert len(cryst.affine_closure(operations)) == 8
finally:
    integral_normalizer.normalizer = saved_normalizer
checks += 1

# Exhaustive primitive-form isometry proof finds actual unimodular witnesses.
rotation = sp.Matrix([[0, -1], [1, 0]])
shear = sp.Matrix([[1, 1], [0, 1]])
left, right = [ci._matrix(rotation)], [ci._matrix(shear.inv()*rotation*shear)]
eq = ci.integral_equivalence(left, right)
assert eq['status'] == 'equivalent'
t = sp.Matrix(eq['conjugator'])
assert abs(t.det()) == 1
assert ci._matrix(t.inv()*rotation*t) in cb.group_closure(right)
checks += 1

# Involution gluing (diagonal versus exchange) is a real Z distinction,
# even though both groups are rationally conjugate.
diag, swap = [[[1, 0], [0, -1]]], [[[0, 1], [1, 0]]]
assert ci.integral_equivalence(diag, swap)['status'] == 'inequivalent'
checks += 1

# Search limits and missing catalogues cannot manufacture completeness.
partial = ci.run({'name': 'min.352', 'max_candidates': 1}, catalogs[6])
assert not partial['z_complete'] and partial['z_class_count'] is None
assert partial['z_class_lower_bound'] == 1 and partial['search']['stop_reason'] == 'max_candidates'
uncatalogued = ci.run({'generators': left, 'max_candidates': 2})
assert not uncatalogued['z_complete'] and uncatalogued['z_class_count'] is None
for field, value in [('max_candidates', True), ('max_candidates', 1.5), ('max_depth', 0), ('max_order', 0)]:
    try:
        ci.run({'name': 'min.352', field: value}, catalogs[6])
    except ValueError:
        pass
    else:
        raise AssertionError(f'Accepted invalid limit {field}={value}')
checks += 1

for path in (ROOT/'dist/examples').glob('integral-*.json'):
    payload = json.loads(path.read_text(encoding='utf8'))
    result = ci.run(payload, catalogs[payload.get('dimension', 3)])
    assert result.get('z_complete', result.get('status') == 'equivalent'), path
    if payload['action'] == 'affine_classes':
        assert result['affine_complete'], path
    checks += 1

print(json.dumps({'suite': 'carat_integral', 'checks': checks,
                  'prime_catalogue_classes': len(prime_cases), 'nonprime_six_dimensional_classes': len(nonprime),
                  'elapsed_seconds': round(time.monotonic()-started, 2)}))
