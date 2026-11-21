"""Exact site actions for the preserved 298 K alpha-quartz teaching record.

Pass the original UTF-8 CIF as ``run({'content': text})``. Output fractions are
strings and all CIF operation rows and orbit-site ids are one-based. No input
setting conversion, structure recognition, or remote data lookup is performed.
"""

from fractions import Fraction
from hashlib import sha256
import re

from crystkit_browser import affine_closure, affine_identity, compose, inverse_operation, matvec
from structure_bc import _cif_blocks


_SOURCE = {
    'filename': '9005017.cif', 'codId': 9005017, 'revision': 291351, 'byteCount': 2384,
    'sha256': '09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6',
    'doi': '10.1127/ejm/2/1/0063',
}
_TERM = re.compile(r'(?:^|[+-])(?:[xyz]|[0-9]+(?:/[0-9]+)?)')
_OPERATION_FIELD = '_space_group_symop_operation_xyz'


def _operation(xyz):
    """Read signed unit axes and rational constants from the six pinned rows."""
    rotation, translation = [], []
    for expression in xyz.split(','):
        terms = _TERM.findall(expression)
        if not terms or ''.join(terms) != expression:
            raise ValueError('Unexpected coordinate expression in the quartz CIF.')
        rotation.append(tuple(terms.count(axis) + terms.count('+' + axis) - terms.count('-' + axis)
                              for axis in 'xyz'))
        translation.append(sum((Fraction(term) for term in terms if term[-1] not in 'xyz'), Fraction()))
    return tuple(rotation), tuple(translation)


def _wrapped(vector):
    return tuple(value % 1 for value in vector)


def _difference(left, right):
    return tuple(a - b for a, b in zip(left, right))


def _apply(operation, position):
    rotation, translation = operation
    return tuple(a + b for a, b in zip(matvec(rotation, position), translation))


def _orbit(start, operations):
    points = tuple(dict.fromkeys(_wrapped(_apply(operation, start)) for operation in operations))
    index = {point: i for i, point in enumerate(points, 1)}
    permutations = [tuple(index[_wrapped(_apply(operation, point))] for point in points)
                    for operation in operations]
    sites = []
    for i, point in enumerate(points, 1):
        stabilizer = [
            {'row': j, 'latticeCorrection': list(map(int, _difference(point, _apply(operation, point))))}
            for j, (operation, permutation) in enumerate(zip(operations, permutations), 1)
            if permutation[i - 1] == i
        ]
        if len(points) * len(stabilizer) != len(operations):
            raise ValueError('The operation list fails the quartz orbit–stabilizer check.')
        sites.append({'id': i, 'position': list(map(str, point)), 'stabilizer': stabilizer})
    return points, permutations, sites


def run(payload):
    """Return the exact Si and O site actions and a worked Si stabilizer conjugation."""
    content = payload.get('content') if isinstance(payload, dict) else None
    if not isinstance(content, str) or len(content) > _SOURCE['byteCount']:
        raise ValueError('Use the byte-preserved 298 K COD 9005017 CIF for the quartz exercise.')
    raw = content.encode('utf-8')
    if len(raw) != _SOURCE['byteCount'] or sha256(raw).hexdigest() != _SOURCE['sha256']:
        raise ValueError('Use the byte-preserved 298 K COD 9005017 CIF for the quartz exercise.')

    block, = _cif_blocks(content)
    rows = [row[_OPERATION_FIELD] for columns, records in block['loops']
            if _OPERATION_FIELD in columns for row in records]
    positions = {
        row['_atom_site_label']: tuple(Fraction(row['_atom_site_fract_' + axis]) for axis in 'xyz')
        for columns, records in block['loops'] if '_atom_site_fract_x' in columns for row in records
    }
    operations = [_operation(row) for row in rows]
    quotient_rows = {(rotation, _wrapped(translation)): row
                     for row, (rotation, translation) in enumerate(operations, 1)}
    if len(quotient_rows) != 6 or set(affine_closure(operations, max_order=6)) != set(quotient_rows):
        raise ValueError('The quartz CIF does not define the expected six-element translation quotient.')
    silicon, silicon_permutations, silicon_sites = _orbit(positions['Si'], operations)
    oxygen, _, oxygen_sites = _orbit(positions['O'], operations)
    if len(silicon) != 3 or len(oxygen) != 6 or len(set(silicon_permutations)) != 6:
        raise ValueError('The quartz orbits do not give the expected faithful three-site Si permutation action.')

    class_ids = {3: 'identity', 1: 'transposition', 0: 'three-cycle'}
    results = []
    for row, (xyz, (rotation, translation), permutation) in enumerate(zip(rows, operations, silicon_permutations), 1):
        fixed = [site for site, image in enumerate(permutation, 1) if site == image]
        results.append({'row': row, 'xyz': xyz, 'rotation': [list(line) for line in rotation],
                        'translation': list(map(str, translation)), 'classId': class_ids[len(fixed)],
                        'siliconPermutation': list(permutation), 'fixedSiliconSites': fixed})
    classes = [{'id': class_id, 'rows': [row['row'] for row in results if row['classId'] == class_id],
                'character': count} for count, class_id in class_ids.items()]

    # Row 3 is the recorded screw, carried through the calculation as its unwrapped affine lift.
    by_row = 3
    identity_row = quotient_rows[affine_identity(3)]
    base_row, = (item['row'] for item in silicon_sites[0]['stabilizer'] if item['row'] != identity_row)
    screw = operations[by_row - 1]
    lifted = compose(compose(screw, operations[base_row - 1]), inverse_operation(screw))
    representative_row = quotient_rows[lifted[0], _wrapped(lifted[1])]
    representative = operations[representative_row - 1]
    lattice_correction = _difference(lifted[1], representative[1])
    target_site_id = silicon_permutations[by_row - 1][0]
    target = silicon[target_site_id - 1]
    corrected = _apply(lifted, target)
    if corrected != target or any(component.denominator != 1 for component in lattice_correction):
        raise ValueError('The selected conjugation must give a real-point stabilizer of the second Si site.')

    return {
        'schemaVersion': 1, 'spaceGroup': 154, 'source': dict(_SOURCE),
        'operations': results, 'classes': classes,
        'silicon': {'label': 'Si', 'multiplicity': len(silicon), 'sites': silicon_sites},
        'oxygen': {'label': 'O', 'multiplicity': len(oxygen), 'sites': oxygen_sites},
        'conjugation': {
            'byRow': by_row, 'baseRow': base_row, 'representativeRow': representative_row,
            'latticeCorrection': list(map(int, lattice_correction)), 'targetSiteId': target_site_id,
            'listedRepresentativeImage': list(map(str, _apply(representative, target))),
            'correctedImage': list(map(str, corrected)), 'conjugateTranslation': list(map(str, lifted[1])),
        },
    }
