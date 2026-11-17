"""Exact finite representation ledger with a shared-basis counterexample.

This optional adapter uses only the standard library.  It keeps a geometric
C4v action, a passive coordinate change, an inconsistent matrix collection,
and an abstract nonfaithful representation distinct.  It is not a general
representation classifier and does not compute energies or degeneracies.
"""
from fractions import Fraction
from functools import lru_cache
import json

SCHEMA = 'symmetry-lab-representation-actions-1'
IDS = ('E', 'R', 'R2', 'R3', 'M', 'RM', 'R2M', 'R3M')
_I = ((1, 0), (0, 1))
_R = ((0, -1), (1, 0))
_M = ((1, 0), (0, -1))
_S = ((0, 1), (1, 0))
_BASIS = ((1, 0), (0, 1))
_LATEX = ('E', 'R', 'R^{2}', 'R^{3}', 'M', 'RM', 'R^{2}M', 'R^{3}M')
_SOURCES = (
    {'id': 'mit-18702-representations',
     'title': 'MIT 18.702: Group representations, February 17 summary',
     'url': 'https://math.mit.edu/classes/18.702/summary-feb17.pdf',
     'scope': 'Homomorphism definition, common change of basis, traces, and the trivial representation. The eight-element example and its failure counts are calculated independently here.'},
    {'id': 'mit-symm4ml-representations',
     'title': 'MIT Symm4ML: Representations of finite groups',
     'url': 'https://symm4ml.mit.edu/symm4ml_s26/notes/representations',
     'scope': 'A common similarity changes coordinates for the full representation; matrix-element orthogonality assumes a representation. The deliberately inconsistent family here is not one.'},
)


def _multiply(left, right):
    return tuple(tuple(sum(x*y for x, y in zip(row, column))
                       for column in zip(*right)) for row in left)


def _act(matrix, vector):
    return tuple(sum(x*y for x, y in zip(row, vector)) for row in matrix)


def _power(matrix, exponent):
    result = _I
    for _ in range(exponent):
        result = _multiply(result, matrix)
    return result


def _transpose(matrix):
    return tuple(zip(*matrix))


def _difference(left, right):
    return tuple(tuple(a-b for a, b in zip(lrow, rrow)) for lrow, rrow in zip(left, right))


def _trace(matrix):
    return sum(matrix[i][i] for i in range(len(matrix)))


def _scalar(value):
    if isinstance(value, Fraction):
        return value.numerator if value.denominator == 1 else str(value)
    return value


def _scalar_latex(value):
    if isinstance(value, Fraction) and value.denominator != 1:
        sign = '-' if value < 0 else ''
        return sign + r'\frac{' + str(abs(value.numerator)) + '}{' + str(value.denominator) + '}'
    return str(_scalar(value))


def _matrix_pack(matrix):
    return {'matrix': [[_scalar(value) for value in row] for row in matrix],
            'latex': r'\begin{pmatrix}' + r'\\'.join('&'.join(_scalar_latex(value) for value in row) for row in matrix) + r'\end{pmatrix}',
            'shape': [len(matrix), len(matrix[0])]}


def _vector_pack(vector):
    return {'vector': [_scalar(value) for value in vector],
            'latex': r'\begin{pmatrix}' + r'\\'.join(_scalar_latex(value) for value in vector) + r'\end{pmatrix}'}


def _rational_pack(value):
    value = Fraction(value)
    return {'numerator': value.numerator, 'denominator': value.denominator,
            'exact': str(value), 'latex': _scalar_latex(value)}


_MATRICES = tuple(_power(_R, k) for k in range(4)) + tuple(_multiply(_power(_R, k), _M) for k in range(4))
_REVERSE = {matrix: index for index, matrix in enumerate(_MATRICES)}
_TABLE = tuple(tuple(_REVERSE[_multiply(left, right)] for right in _MATRICES) for left in _MATRICES)


def _frame(identifier, applied, matrix, point, physical_basis):
    image = _act(matrix, point)
    basis_images = [_act(matrix, vector) for vector in _BASIS]
    return {'id': identifier, 'appliedId': applied, 'point': _vector_pack(image),
            'basisImages': [_vector_pack(vector) for vector in basis_images],
            'physicalPoint': _vector_pack(_act(physical_basis, image)) if physical_basis is not None else None,
            'physicalBasisImages': [_vector_pack(_act(physical_basis, vector)) for vector in basis_images] if physical_basis is not None else None}


def _family(identifier, matrices, point):
    is_common = identifier == 'common'
    initial = _act(_S, point) if is_common else point
    physical_basis = _S if is_common else _I if identifier == 'original' else None
    operations = []
    for index, matrix in enumerate(matrices):
        operations.append({'id': IDS[index], 'operatorLatex': _LATEX[index],
            'matrix': _matrix_pack(matrix), 'diagonal': [matrix[0][0], matrix[1][1]],
            'trace': _trace(matrix), 'orthogonal': _multiply(_transpose(matrix), matrix) == _I,
            'basisImages': [_vector_pack(_act(matrix, vector)) for vector in _BASIS],
            'pointImage': _vector_pack(_act(matrix, initial))})
    pairs = []
    for gi, g in enumerate(IDS):
        for hi, h in enumerate(IDS):
            product_index = _TABLE[gi][hi]
            actual = _multiply(matrices[gi], matrices[hi])
            expected = matrices[product_index]
            frames = [_frame('initial', None, _I, initial, physical_basis),
                      _frame('after-h', h, matrices[hi], initial, physical_basis),
                      _frame('after-g', g, actual, initial, physical_basis)]
            direct = _frame('direct-gh', IDS[product_index], expected, initial, physical_basis)
            pairs.append({'id': g+'|'+h, 'g': g, 'h': h, 'productId': IDS[product_index],
                'lhs': _matrix_pack(actual), 'rhs': _matrix_pack(expected),
                'difference': _matrix_pack(_difference(actual, expected)), 'equal': actual == expected,
                'frames': frames, 'direct': direct,
                'pointEqual': frames[-1]['point']['vector'] == direct['point']['vector'],
                'basisEqual': frames[-1]['basisImages'] == direct['basisImages']})
    failed = sum(not pair['equal'] for pair in pairs)
    distinct = len(set(matrices))
    flat = [tuple(value for row in matrix for value in row) for matrix in matrices]
    gram = tuple(tuple(sum(row[i]*row[j] for row in flat) for j in range(4)) for i in range(4))
    characters = [_trace(matrix) for matrix in matrices]
    gram_pack = _matrix_pack(gram)
    return {'id': identifier,
        'space': {'original': 'physical-xy', 'common': 'passive-xy',
                  'mixed': 'inconsistent-coordinate-ledger', 'trivial': 'auxiliary-trivial-2d'}[identifier],
        'physicalGeometry': physical_basis is not None, 'initialPoint': _vector_pack(initial),
        'operations': operations, 'characters': characters,
        'formalCharacterNorm': _rational_pack(Fraction(sum(value*value for value in characters), 8)),
        'coeffGram': {'coefficientOrder': ['D00', 'D01', 'D10', 'D11'],
                      'matrix': gram_pack['matrix'], 'latex': gram_pack['latex']},
        'law': {'isRepresentation': failed == 0, 'passedPairs': 64-failed, 'failedPairs': failed,
                'distinctMatrices': distinct, 'faithful': distinct == 8 if not failed else None,
                'kernelIds': [IDS[index] for index, matrix in enumerate(matrices) if matrix == _I] if not failed else None},
        'pairs': pairs}


def _diagonalization():
    q = ((1, 1), (1, -1))
    qi = ((Fraction(1, 2), Fraction(1, 2)), (Fraction(1, 2), Fraction(-1, 2)))
    ain_q = _multiply(_multiply(qi, _M), q)
    bin_q = _multiply(_multiply(qi, _S), q)
    commutator = _difference(_multiply(_M, _S), _multiply(_S, _M))
    return {'AId': 'M', 'BId': 'RM', 'A': _matrix_pack(_M), 'B': _matrix_pack(_S),
        'Q': _matrix_pack(q), 'inverseQ': _matrix_pack(qi),
        'AOwnBasis': _matrix_pack(_I), 'AOwnDiagonal': _matrix_pack(_M),
        'BOwnBasis': _matrix_pack(q), 'BOwnDiagonal': _matrix_pack(bin_q),
        'AInQ': _matrix_pack(ain_q), 'BInQ': _matrix_pack(bin_q),
        'commutator': _matrix_pack(commutator),
        'commutatorInQ': _matrix_pack(_multiply(_multiply(qi, commutator), q)),
        'noCommonDiagonalBasis': any(value for row in commutator for value in row),
        'physicalProduct': _matrix_pack(_multiply(_M, _S)),
        'mixedIndividualDiagonalProduct': _matrix_pack(_multiply(_M, bin_q)),
        'mixedProductEqual': _multiply(_M, bin_q) == _multiply(_M, _S),
        'rotationField': {'id': 'R', 'matrix': _matrix_pack(_R), 'square': _matrix_pack(_multiply(_R, _R)),
            'characteristicPolynomialLatex': r'\lambda^2+1', 'realDiagonalizable': False,
            'complexDiagonalizable': True, 'eigenvaluesLatex': ['i', '-i']}}


@lru_cache(maxsize=25)
def _result_json(point):
    common = tuple(_multiply(_multiply(_S, matrix), _S) for matrix in _MATRICES)
    mixed = list(_MATRICES)
    mixed[1] = common[1]
    families = [_family('original', _MATRICES, point), _family('common', common, point),
                _family('mixed', tuple(mixed), point), _family('trivial', (_I,)*8, point)]
    new_point = _act(_S, point)
    reconstruction = []
    for index, identifier in enumerate(IDS):
        old_image = _act(_MATRICES[index], point)
        new_image = _act(common[index], new_point)
        rebuilt = _act(_S, new_image)
        rebuilt_operator = _multiply(_multiply(_S, common[index]), _S)
        reconstruction.append({'id': identifier, 'oldPoint': _vector_pack(point),
            'newPoint': _vector_pack(new_point), 'oldImage': _vector_pack(old_image),
            'newImage': _vector_pack(new_image), 'reconstructedImage': _vector_pack(rebuilt),
            'equal': old_image == rebuilt, 'rebuiltOperator': _matrix_pack(rebuilt_operator),
            'operatorEqual': rebuilt_operator == _MATRICES[index]})
    diagonalization = _diagonalization()
    checks = [
        {'id': 'complete-four-family-pair-ledgers', 'passed': all(len(f['operations']) == 8 and len(f['pairs']) == 64 for f in families)},
        {'id': 'original-common-trivial-homomorphisms', 'passed': all(families[i]['law']['failedPairs'] == 0 for i in (0, 1, 3))},
        {'id': 'mixed-intended-eighteen-failures', 'passed': families[2]['law']['failedPairs'] == 18},
        {'id': 'common-and-mixed-traces-preserved', 'passed': families[0]['characters'] == families[1]['characters'] == families[2]['characters']},
        {'id': 'individual-orthogonality-all-families', 'passed': all(op['orthogonal'] for f in families for op in f['operations'])},
        {'id': 'mixed-coefficient-gram-preserved', 'passed': families[0]['coeffGram'] == families[2]['coeffGram']},
        {'id': 'trivial-valid-nonfaithful', 'passed': families[3]['law']['isRepresentation'] and not families[3]['law']['faithful'] and families[3]['law']['distinctMatrices'] == 1},
        {'id': 'passive-point-and-operator-reconstruction', 'passed': all(row['equal'] and row['operatorEqual'] for row in reconstruction)},
        {'id': 'basis-images-detect-every-matrix-failure', 'passed': all(p['basisEqual'] == p['equal'] for f in families for p in f['pairs'])},
        {'id': 'separate-reflection-diagonalizers', 'passed': diagonalization['AOwnDiagonal']['matrix'] == diagonalization['BOwnDiagonal']['matrix'] == [list(row) for row in _M] and diagonalization['AInQ']['matrix'] == [list(row) for row in _S]},
        {'id': 'nonzero-commutator-blocks-common-diagonalizer', 'passed': diagonalization['noCommonDiagonalBasis'] and not diagonalization['mixedProductEqual']},
    ]
    if not all(row['passed'] for row in checks):
        raise ArithmeticError('The exact representation ledger failed an internal consistency check.')
    result = {'schema': SCHEMA, 'input': {'point': list(point)},
        'group': {'id': 'C4v', 'order': 8, 'dimension': 2,
            'normalFormLatex': r'R^kM^s', 'actionConvention': 'active-column-vectors-right-factor-first',
            'operationIds': list(IDS),
            'operations': [{'id': identifier, 'operatorLatex': _LATEX[index], 'matrix': _matrix_pack(_MATRICES[index])} for index, identifier in enumerate(IDS)],
            'multiplicationTable': [[IDS[index] for index in row] for row in _TABLE]},
        'basisChange': {'S': _matrix_pack(_S), 'inverseS': _matrix_pack(_S),
            'oldPoint': _vector_pack(point), 'newPoint': _vector_pack(new_point),
            'reconstructedPoint': _vector_pack(_act(_S, new_point)), 'equal': _act(_S, new_point) == point,
            'coordinateFormula': r"x'=S^{-1}x", 'matrixFormula': r"D'(g)=S^{-1}D(g)S"},
        'families': families, 'commonReconstruction': reconstruction,
        'counterexample': {'familyId': 'mixed', 'pairId': 'R|R2', 'expectedFailedPairs': 18,
            'matrixDuplicationIsNotCriterion': True, 'trivialFamilyId': 'trivial'},
        'diagonalization': diagonalization, 'checks': checks, 'sources': list(_SOURCES)}
    return json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def run(payload):
    if type(payload) is not dict or set(payload) != {'point'}:
        raise ValueError('Input must contain exactly the point key.')
    point = payload['point']
    if type(point) is not list or len(point) != 2 or any(type(value) is not int or not -2 <= value <= 2 for value in point):
        raise ValueError('point must be a list of two integers from -2 to 2; booleans and floats are not accepted.')
    return json.loads(_result_json(tuple(point)))
