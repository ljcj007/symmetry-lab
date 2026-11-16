"""Exact displacement-action ledger for a fixed bent H2O molecule in xz.

Only the standard library is used. Scientific matrices/characters are integer
data derived from atom permutations and polar Cartesian actions. The numerical
104.5-degree coordinates are drawing aids, not force-constant normal modes.
"""
from functools import lru_cache
import json
import math

SCHEMA = 'symmetry-lab-water-actions-1'
_AXES = ('x', 'y', 'z')
_ATOM_IDS = ('O', 'H1', 'H2')
# Entries are coefficients of positive a and b in (a*x, 0, b*z).
# This exact orbit describes any noncollinear bent geometry in the xz plane.
_SITE_COEFFICIENTS = ((0, 0, 0), (1, 0, 1), (-1, 0, 1))
_OPERATIONS = (
    ('E', 'E', ((1, 0, 0), (0, 1, 0), (0, 0, 1))),
    ('C2', 'C2(z)', ((-1, 0, 0), (0, -1, 0), (0, 0, 1))),
    ('sigma-xz', 'sigma(xz)', ((1, 0, 0), (0, -1, 0), (0, 0, 1))),
    ('sigma-yz', 'sigma(yz)', ((-1, 0, 0), (0, 1, 0), (0, 0, 1))),
)
_CHARACTERS = (
    ('A1', (1, 1, 1, 1), ('z',), (), ('xx', 'yy', 'zz')),
    ('A2', (1, 1, -1, -1), (), ('Rz',), ('xy',)),
    ('B1', (1, -1, 1, -1), ('x',), ('Ry',), ('xz', 'zx')),
    ('B2', (1, -1, -1, 1), ('y',), ('Rx',), ('yz', 'zy')),
)
_SOURCES = (
    {'id': 'mit-symm4ml-displacements',
     'title': 'MIT Symm4ML: APS March Meeting 2026 tutorial',
     'url': 'https://symm4ml.mit.edu/symm4ml_s26/tutorials/aps-tutorial-2026',
     'scope': 'The molecular displacement action combines an atom permutation with a Cartesian vector action.'},
    {'id': 'mit-503-vibrations',
     'title': 'MIT 5.03: Molecular vibrations and IR selection rules',
     'url': 'https://web.mit.edu/5.03/www/readings/molecular_vibrations/main.pdf',
     'scope': 'Fixed-atom vector traces, removal of translations and rotations for nonlinear molecules, and dipole selection rules. Axis labels are specified separately here.'},
)


def _eye(n):
    return [[int(i == j) for j in range(n)] for i in range(n)]


def _transpose(matrix):
    return [list(row) for row in zip(*matrix)]


def _multiply(left, right):
    return [[sum(x*y for x, y in zip(row, column)) for column in zip(*right)]
            for row in left]


def _act(matrix, vector):
    return tuple(sum(x*y for x, y in zip(row, vector)) for row in matrix)


def _trace(matrix):
    return sum(matrix[i][i] for i in range(len(matrix)))


def _determinant(matrix):
    a, b, c = matrix
    return (a[0]*(b[1]*c[2]-b[2]*c[1]) -
            a[1]*(b[0]*c[2]-b[2]*c[0]) +
            a[2]*(b[0]*c[1]-b[1]*c[0]))


def _latex(matrix):
    return r'\begin{pmatrix}' + r'\\'.join('&'.join(str(v) for v in row)
                                             for row in matrix) + r'\end{pmatrix}'


def _pack(matrix):
    return {'matrix': matrix, 'latex': _latex(matrix),
            'diagonal': [matrix[i][i] for i in range(len(matrix))],
            'trace': _trace(matrix)}


def _error(left, right):
    return max(abs(a-b) for ar, br in zip(left, right) for a, b in zip(ar, br))


def _operation(index, identifier, label, rotation, basis):
    polar = [list(row) for row in rotation]
    determinant = _determinant(polar)
    axial = [[determinant*v for v in row] for row in polar]
    permutation = [_SITE_COEFFICIENTS.index(_act(polar, site))
                   for site in _SITE_COEFFICIENTS]
    matrix = [[0]*9 for _ in range(9)]
    for atom, target in enumerate(permutation):
        for source_axis in range(3):
            for target_axis in range(3):
                matrix[3*target+target_axis][3*atom+source_axis] = polar[target_axis][source_axis]
    columns = []
    for source in basis:
        j = source['index']
        vector = [row[j] for row in matrix]
        nonzero = [(i, value) for i, value in enumerate(vector) if value]
        if len(nonzero) != 1:
            raise ArithmeticError('This fixed Cartesian operation must map each displacement to one signed basis vector.')
        target_index, coefficient = nonzero[0]
        target = basis[target_index]
        columns.append({'index': j, 'sourceBasisIndex': j,
            'sourceAtomIndex': source['atomIndex'], 'sourceAtomId': source['atomId'],
            'sourceAxis': source['axis'], 'sourceLabel': source['label'],
            'targetBasisIndex': target_index, 'targetAtomIndex': target['atomIndex'],
            'targetAtomId': target['atomId'], 'targetAxis': target['axis'],
            'targetLabel': target['label'], 'coefficient': coefficient,
            'inputArrow': source['unitVector'],
            'outputArrow': list(_act(polar, source['unitVector'])),
            'vector': vector, 'latex': _latex([[v] for v in vector]),
            'diagonalContribution': vector[j]})
    fixed = [i for i, image in enumerate(permutation) if image == i]
    return {'index': index, 'id': identifier, 'label': label,
        'polar': _pack(polar), 'axial': _pack(axial), 'determinant': determinant,
        'atomPermutation': permutation,
        'atomMaps': [{'sourceAtomIndex': i, 'targetAtomIndex': target,
                      'sourceAtomId': _ATOM_IDS[i], 'targetAtomId': _ATOM_IDS[target],
                      'fixed': i == target} for i, target in enumerate(permutation)],
        'fixedAtomIndices': fixed, 'fixedAtomCount': len(fixed),
        'matrix': matrix, 'latex': _latex(matrix),
        'diagonal': [matrix[i][i] for i in range(9)], 'trace': _trace(matrix),
        'traceTerms': [{'basisIndex': i, 'basisLabel': basis[i]['label'],
                        'coefficient': matrix[i][i]} for i in range(9)],
        'columns': columns}


def _reduce(characters):
    components, decomposition = [], []
    for irrep, row, *_ in _CHARACTERS:
        products = [a*b for a, b in zip(characters, row)]
        numerator = sum(products)
        if numerator % 4:
            raise ArithmeticError('Character reduction did not produce an integer multiplicity.')
        multiplicity = numerator//4
        if multiplicity < 0:
            raise ArithmeticError('The fixed molecular representation must have nonnegative multiplicities.')
        components.append({'irrep': irrep, 'irrepDimension': 1,
            'irrepCharacters': list(row), 'weightedProducts': products,
            'sum': numerator, 'multiplicity': multiplicity,
            'dimensionContribution': multiplicity})
        if multiplicity:
            decomposition.append({'irrep': irrep, 'multiplicity': multiplicity, 'dimension': 1})
    tex = '+'.join((str(row['multiplicity']) if row['multiplicity'] != 1 else '')+
                   row['irrep'][0]+'_'+row['irrep'][1:] for row in decomposition) or '0'
    return {'characters': characters, 'groupOrder': 4, 'components': components,
            'decomposition': decomposition, 'dimension': characters[0],
            'dimensionSum': sum(row['dimensionContribution'] for row in components),
            'latex': tex}


@lru_cache(maxsize=1)
def _result_json():
    basis = [{'index': 3*atom+axis, 'atomIndex': atom, 'atomId': atom_id,
              'axis': axis_id, 'label': atom_id+axis_id,
              'unitVector': [int(i == axis) for i in range(3)]}
             for atom, atom_id in enumerate(_ATOM_IDS) for axis, axis_id in enumerate(_AXES)]
    operations = [_operation(i, *spec, basis) for i, spec in enumerate(_OPERATIONS)]
    characters = {'fixedAtoms': [o['fixedAtomCount'] for o in operations],
                  'polar': [o['polar']['trace'] for o in operations],
                  'axial': [o['axial']['trace'] for o in operations],
                  'displacement': [o['trace'] for o in operations]}
    characters['translation'] = list(characters['polar'])
    characters['rotation'] = list(characters['axial'])
    characters['vibration'] = [a-b-c for a, b, c in zip(characters['displacement'],
                                characters['translation'], characters['rotation'])]
    reductions = {role: _reduce(characters[role])
                  for role in ('displacement', 'translation', 'rotation', 'vibration')}
    mode_types = [{'id': 'symmetric', 'label': 'Symmetric stretching type', 'irrep': 'A1'},
                  {'id': 'bend', 'label': 'Bending type', 'irrep': 'A1'},
                  {'id': 'antisymmetric', 'label': 'Antisymmetric stretching type', 'irrep': 'B1'}]
    rows = {name: list(row) for name, row, *_ in _CHARACTERS}
    channels = []
    for identifier, process, operator, irrep in (
            ('ir-z', 'ir', 'z', 'A1'), ('ir-x', 'ir', 'x', 'B1'),
            ('raman-xx', 'raman', 'xx', 'A1'), ('raman-xz', 'raman', 'xz', 'B1')):
        modes = []
        for mode in mode_types:
            products = [f*op*i for f, op, i in zip(rows[mode['irrep']], rows[irrep], rows['A1'])]
            numerator = sum(products)
            modes.append({'modeId': mode['id'], 'finalIrrep': mode['irrep'],
                'weightedProducts': products, 'sum': numerator, 'groupOrder': 4,
                'multiplicity': numerator//4, 'allowed': numerator > 0})
        channels.append({'id': identifier, 'process': process, 'operator': operator,
            'operatorIrrep': irrep, 'operatorCharacters': rows[irrep], 'initialIrrep': 'A1',
            'modeRows': modes,
            'scope': 'Symmetry permission from a totally symmetric vibrational ground state; no intensity or frequency is inferred.'})
    checks = []
    def check(identifier, value):
        if value != 0:
            raise ArithmeticError('Exact water-action check failed: '+identifier)
        checks.append({'id': identifier, 'passed': True, 'residual': value})
    multiplication = []
    for left in operations:
        row = []
        check('orthogonality.'+left['id'], _error(_multiply(_transpose(left['matrix']), left['matrix']), _eye(9)))
        check('trace.'+left['id'], left['trace']-left['fixedAtomCount']*left['polar']['trace'])
        check('diagonalSum.'+left['id'], sum(t['coefficient'] for t in left['traceTerms'])-left['trace'])
        for right in operations:
            polar_product = _multiply(left['polar']['matrix'], right['polar']['matrix'])
            product = next(o for o in operations if o['polar']['matrix'] == polar_product)
            row.append(product['index'])
            check('multiplication.'+left['id']+'.'+right['id'],
                  _error(_multiply(left['matrix'], right['matrix']), product['matrix']))
        multiplication.append(row)
    for role, reduction in reductions.items():
        check('dimension.'+role, reduction['dimensionSum']-reduction['dimension'])
    check('nonlinearVibrationalDimension', characters['vibration'][0]-(3*len(_ATOM_IDS)-6))
    angle = math.radians(104.5/2)
    # Drawing-only precision is explicit, avoiding host-libm last-bit changes
    # in a redistributable reference. No scientific action uses these values.
    a, b = round(math.sin(angle), 12), round(math.cos(angle), 12)
    positions = [[0., 0., 0.], [a, 0., b], [-a, 0., b]]
    c2 = next(o for o in operations if o['id'] == 'C2')
    example = c2['columns'][3]
    result = {'schema': SCHEMA, 'action': 'water_actions', 'input': {},
        'title': 'Water displacements: from a matrix column to vibrational selection rules',
        'conventions': {'plane': 'xz', 'group': 'C2v', 'mainAxis': 'z',
            'operationOrder': [o['id'] for o in operations],
            'basisOrder': [b['label'] for b in basis], 'active': True,
            'columns': 'Column j is the image of the original displacement basis vector j.',
            'composition': 'AB applies B first.',
            'scope': 'A fixed bent nonlinear molecule. Displacements and translations are polar; rotations are axial. Character subtraction identifies symmetry types, not force-constant eigenvectors.'},
        'basis': basis,
        'atoms': [{'index': i, 'id': name, 'element': 'O' if i == 0 else 'H',
                   'position': positions[i]} for i, name in enumerate(_ATOM_IDS)],
        'drawing': {'plane': 'xz', 'angleDegrees': 104.5, 'coordinateDecimalPlaces': 12,
                    'scope': 'Illustrative equilibrium coordinates rounded to 12 decimal places for display only; all action matrices and characters are exact integers independent of the drawing angle.'},
        'operationOrder': [o['id'] for o in operations], 'operations': operations,
        'characters': characters,
        'characterTable': {'operationOrder': [o['id'] for o in operations],
            'classSizes': [1]*4, 'groupOrder': 4,
            'rows': [{'irrep': name, 'dimension': 1, 'characters': list(row),
                      'polarBasis': list(polar), 'axialBasis': list(axial),
                      'ramanBasis': list(raman)} for name, row, polar, axial, raman in _CHARACTERS]},
        'reductions': reductions,
        'vibrations': {'dimension': characters['vibration'][0],
            'latex': reductions['vibration']['latex'], 'modeTypes': mode_types,
            'scope': 'Three symmetry types only. The two A1 coordinates may mix in a force field; no normal-mode eigenvectors, force constants, frequencies or intensities are supplied.'},
        'selectionChannels': channels,
        'counterexample': {'id': 'fixed-atom-is-not-fixed-displacement', 'operationId': 'C2',
            'fixedAtomIndices': c2['fixedAtomIndices'],
            'incorrectScalarGuess': c2['fixedAtomCount'],
            'actualDisplacementCharacter': c2['trace'],
            'oxygenDiagonal': c2['diagonal'][:3], 'hydrogenDiagonal': c2['diagonal'][3:],
            'diagonal': c2['diagonal'], 'exampleColumn': example['index'],
            'sourceLabel': example['sourceLabel'], 'targetLabel': example['targetLabel'],
            'coefficient': example['coefficient']},
        'multiplicationTable': multiplication, 'checks': checks,
        'sources': list(_SOURCES)}
    return json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def run(payload):
    if type(payload) is not dict or payload:
        raise ValueError('water_actions accepts only an empty JSON object; operation and column selections browse the complete returned ledger.')
    # Cache immutable text; every caller receives its own complete JSON tree.
    return json.loads(_result_json())
