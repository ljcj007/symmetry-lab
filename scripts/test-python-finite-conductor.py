"""Complete low-dimensional enumeration without supplying catalogue counts.

The catalogue is used solely AFTER each computation as an independent oracle.
Every 1–3D Q representative is processed, not a selection of examples.
"""
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
import crystkit_browser as cryst
import finite_conductor as fc

started = time.monotonic()
totals, records = {}, []
for dimension in (1, 2, 3):
    catalog = json.loads(gzip.decompress((ROOT/f'dist/data/carat/q{dimension}.json.gz').read_bytes()))
    z_count = affine_count = 0
    for entry in catalog['entries']:
        payload = {'action': 'affine_classes', 'dimension': dimension,
                   'generators': entry['generators'], 'classification_method': 'conductor'}
        result = ci.run(payload)  # Deliberately NO catalogue, name, or official counts.
        assert result['z_complete'] and result['affine_complete'], (dimension, entry['name'], result['search'])
        assert result['q_class'] is None
        assert result['z_class_count'] == entry['z_classes'], (dimension, entry['name'])
        assert result['affine_class_count'] == entry['affine_classes'], (dimension, entry['name'])
        assert not result['certificate'].get('catalogue_count_used_for_completeness', False)
        assert not result.get('affine_certificate', {}).get('catalogue_count_used_for_completeness', False)
        for item in result['z_classes']:
            if 'basis' in item:
                basis = sp.Matrix(item['basis'])
                assert all(basis.inv()*sp.Matrix(g)*basis == sp.Matrix(h)
                           for g, h in zip(entry['generators'], item['generators']))
            assert len(item['affine_representatives']) == item['affine_class_count']
            for representative in item['affine_representatives']:
                operations = [cryst.operation({'rotation': g, 'translation': t}) for g, t in
                              zip(representative['point_generators'], representative['generator_translations'])]
                # Trivial group may use an explicitly listed identity.
                if not operations:
                    operations = [cryst.affine_identity(dimension)]
                quotient = cryst.affine_closure(operations)
                assert len(quotient) == entry['order']
        z_count += result['z_class_count']
        affine_count += result['affine_class_count']
        records.append((dimension, entry['name'], result['z_class_count'], result['affine_class_count']))
    totals[dimension] = (len(catalog['entries']), z_count, affine_count)
assert totals == {1: (2, 2, 2), 2: (10, 13, 17), 3: (32, 73, 219)}

# Six-dimensional finite envelopes with repeated rational/cyclotomic factors.
high_dimensional = [
    (sp.diag(sp.eye(3), -sp.eye(3)), 4),
    (sp.diag(sp.eye(4), sp.Matrix([[0, -1], [1, 0]])), 2),
    (sp.diag(*(sp.Matrix([[0, -1], [1, -1]]) for _ in range(3))), 1),
]
for generator, expected in high_dimensional:
    result = ci.run({'action': 'z_classes', 'dimension': 6, 'generators': [generator.tolist()],
                     'classification_method': 'conductor'})
    assert result['candidate_cover_complete'] and result['z_complete']
    assert result['z_class_count'] == expected
    assert result['certificate']['catalogue_count_used_for_completeness'] is False

# A repeated absolutely irreducible nonabelian representation is handled by
# split matrix orders, not by the abelian/cyclotomic branch.
rotation, reflection = sp.Matrix([[0, -1], [1, -1]]), sp.Matrix([[0, 1], [1, 0]])
generators = [sp.diag(g, g).tolist() for g in (rotation, reflection)]
repeated = ci.run({'action': 'z_classes', 'dimension': 4, 'generators': generators,
                  'classification_method': 'conductor'})
assert repeated['z_complete'] and repeated['candidate_cover_complete']
assert repeated['certificate']['decomposition'] == 'split-rational-maximal-order'
assert repeated['search']['proved_linear_modular_primes'] == [3]
for i, item in enumerate(repeated['z_classes']):
    for earlier in repeated['z_classes'][:i]:
        assert ci.integral_equivalence(item['generators'], earlier['generators'])['status'] == 'inequivalent'

# The order lattice certificate itself is exact, and arbitrary integer basis
# shears preserve the complete classification.
group = cb.group_closure([cb._mat(g) for g in generators])
decomposition = fc._decomposition([cb._mat(g) for g in generators], group, {})
order = decomposition['order']
assert fc._integer(order['basis'].inv()*(order['conductor']*sp.eye(order['rank'])))
shear = sp.eye(4)
shear[0, 3] = 7
changed = [(shear.inv()*sp.Matrix(g)*shear).tolist() for g in generators]
sheared = ci.run({'generators': changed, 'dimension': 4, 'classification_method': 'conductor'})
assert sheared['z_complete'] and sheared['z_class_count'] == repeated['z_class_count']

# A finite theorem does not excuse incomplete execution; strict conductor
# mode must not use the known catalogue total to hide a truncated traversal.
partial = ci.run({'generators': [high_dimensional[0][0].tolist()], 'dimension': 6,
                  'classification_method': 'conductor', 'max_candidates': 1})
assert not partial['candidate_cover_complete'] and not partial['z_complete']
assert partial['z_class_count'] is None and partial['search']['stop_reason'] == 'max_candidates'
for key, value in [('max_lattices', 0), ('max_lattice_orbit', True), ('max_decomposition_trials', 1.5)]:
    try:
        ci.run({'generators': generators, 'dimension': 4, 'classification_method': 'conductor', key: value})
    except ValueError:
        pass
    else:
        raise AssertionError(f'Accepted invalid {key}')

print(json.dumps({'suite': 'finite_conductor', 'complete_q_classes': len(records),
                  'complete_z_classes': sum(v[1] for v in totals.values()),
                  'complete_affine_classes': sum(v[2] for v in totals.values()),
                  'dimension_totals': totals, 'additional_high_dimensional_cases': 5,
                  'elapsed_seconds': round(time.monotonic()-started, 2)}))
