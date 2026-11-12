"""Verify the published conceptual exercises with exact rational arithmetic.

No repository files are modified. Normalized spinors are represented by their
unnormalized Q(i) numerators; their common sqrt(2) factors cancel in the tested
inner products and expectation values.
"""
from fractions import Fraction as F
from itertools import product
from pathlib import Path
import json
import re

REPO = Path(__file__).resolve().parents[1]
DATA = REPO / 'dist/data/symmetry-derivations.json'
data = json.loads(DATA.read_text(encoding='utf-8'))
conceptual_ids = {'space-pminus1-orbit-stabilizer', 'color-swap-antilinear-time-reversal'}
exercises = [exercise for exercise in data['exercises'] if exercise['id'] in conceptual_ids]
by_id = {exercise['id']: exercise for exercise in exercises}
space = by_id['space-pminus1-orbit-stabilizer']
color_exercise = by_id['color-swap-antilinear-time-reversal']
checks = []


def verify(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def vec(*items):
    return tuple(F(value) for value in items)


def named_vector(text, name):
    match = re.search(re.escape(name) + r'=\(([^)]+)\)', text)
    if not match:
        raise AssertionError('Missing vector '+name)
    return vec(*match[1].split(','))


def rational_vectors(text):
    return {vec(*body.split(',')) for body in re.findall(r'\(([-\d/]+,[-\d/]+,[-\d/]+)\)', text)}


def wrap(v):
    return tuple(value - value.numerator // value.denominator for value in v)


def scale(sign, v):
    return tuple(sign * value for value in v)


def orbit(v):
    return {wrap(scale(sign, v)) for sign in (1, -1)}


def stabilizer(v):
    return [sign for sign in (1, -1) if wrap(scale(sign, v)) == wrap(v)]


def actual_site_operations(v):
    # Solve epsilon*v+n=v exactly; there is only one possible n for each sign.
    return [(sign, tuple((1-sign)*value for value in v)) for sign in (1, -1)
            if all(((1-sign)*value).denominator == 1 for value in v)]


def affine_apply(operation, v):
    sign, translation = operation
    return tuple(sign*value+shift for value, shift in zip(v, translation))


def affine_compose(left, right):
    a, n = left
    b, m = right
    return a*b, tuple(x+a*y for x, y in zip(n, m))


x = named_vector(space['prompt'], 'x')
q = named_vector(space['prompt'], 'q')
q_delta = named_vector(space['steps'][5]['explanation'], 'qδ')
verify('general orbit is exactly two stated points', orbit(x) == {x, vec('4/5', '7/10', '3/5')})
verify('inversion twice restores general point', wrap(scale(-1, wrap(scale(-1, x)))) == x)
verify('general quotient stabilizer is identity', stabilizer(x) == [1])
verify('general actual site group is identity', actual_site_operations(x) == [(1, vec(0, 0, 0))])
verify('half-integer orbit is singleton', orbit(q) == {q})
verify('half-integer quotient stabilizer has both elements', stabilizer(q) == [1, -1])
verify('untranslated inversion does not actually fix q', affine_apply((-1, vec(0, 0, 0)), q) != q)
q_inversion = (-1, vec(1, 0, 1))
verify('translated inversion actually fixes q', affine_apply(q_inversion, q) == q)
verify('translated inversion squares to actual identity', affine_compose(q_inversion, q_inversion) == (1, vec(0, 0, 0)))
verify('actual half-integer site group is exactly stated pair', actual_site_operations(q) == [(1, vec(0, 0, 0)), q_inversion])
verify('nonzero translation does not actually fix q', affine_apply((1, vec(1, 0, 1)), q) != q)
half_points = [tuple(values) for values in product((F(0), F(1, 2)), repeat=3)]
verify('eight half-integer classes are distinct', len(set(half_points)) == 8)
verify('all eight have singleton orbits and two stabilizer elements', all(len(orbit(v)) == 1 and len(stabilizer(v)) == 2 for v in half_points))
verify('each half-integer point has its own actual inversion lift', all(affine_apply((-1, scale(2, v)), v) == v for v in half_points))
verify('perturbed orbit is exactly two stated rational points', orbit(q_delta) == {q_delta, vec('499/1000', 0, '1/2')})
verify('perturbed point is not inversion-fixed modulo translations', stabilizer(q_delta) == [1])
verify('perturbed pair separation is exactly 1/500', q_delta[0] - F(499, 1000) == F(1, 500))
verify('orbit-stabilizer identity holds in every tested case', all(len(orbit(v))*len(stabilizer(v)) == 2 for v in [x, q, q_delta, *half_points]))
verify('published general orbit formula matches exact action', rational_vectors(space['steps'][1]['formula']) == orbit(x))
verify('published perturbed orbit formula matches exact action', rational_vectors(space['steps'][5]['formula']) == orbit(q_delta))
verify('published perturbation is exactly one thousandth', tuple(value-base for value, base in zip(q_delta, q)) == vec('1/1000', 0, 0))
verify('published actual-site answer names the correct inversion lift', '{−I|(1,0,1)}' in space['answer'] and space['check']['choices'][space['check']['answer']] == '{−I|(1,0,1)}')

# Q(i), with each real/imaginary component a Fraction. No complex floats.
def C(real=0, imag=0): return F(real), F(imag)
def add(a, b): return a[0]+b[0], a[1]+b[1]
def neg(a): return -a[0], -a[1]
def mul(a, b): return a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]
def conj(a): return a[0], -a[1]
def csum(items):
    result = C()
    for item in items: result = add(result, item)
    return result
def mv(matrix, v): return tuple(csum(mul(a, b) for a, b in zip(row, v)) for row in matrix)
def mm(a, b): return tuple(tuple(csum(mul(a[i][j], b[j][k]) for j in range(2)) for k in range(2)) for i in range(2))
def mc(a): return tuple(tuple(conj(value) for value in row) for row in a)
def mn(a): return tuple(tuple(neg(value) for value in row) for row in a)
def vmul(scalar, v): return tuple(mul(scalar, value) for value in v)
def inner(a, b): return csum(mul(conj(x), y) for x, y in zip(a, b))
def published_real_matrix(name):
    text = ' '.join(color_exercise['givens'])
    match = re.search(re.escape(name) + r'=\[\[([^]]+)\],\[([^]]+)\]\]', text)
    if not match:
        raise AssertionError('Missing real matrix '+name)
    return tuple(tuple(C(F(value.replace('−','-'))) for value in row.split(',')) for row in match.groups())
P = published_real_matrix('P')
A = published_real_matrix('A=−iσy')
identity = ((C(1), C(0)), (C(0), C(1)))
i = C(0, 1)
up = (C(1), C(0))
down = (C(0), C(1))
plus = (C(1), C(1))
minus = (C(1), C(-1))
complex_state = (C(1), C(0, 1))
def theta(v): return mv(A, tuple(conj(value) for value in v))
verify('P is linear with square I', mm(P, P) == identity and mv(P, vmul(i, up)) == vmul(i, mv(P, up)))
verify('minus convention maps up to down and down to minus up', theta(up) == down and theta(down) == vmul(C(-1), up))
verify('Theta conjugates the scalar i', theta(vmul(i, up)) == vmul(neg(i), theta(up)))
verify('AA* equals minus I exactly', mm(A, mc(A)) == mn(identity))
verify('opposite overall-phase convention has same square', mm(mn(A), mc(mn(A))) == mn(identity))
verify('Theta squared is minus identity on exact test vectors', all(theta(theta(v)) == vmul(C(-1), v) for v in (up, down, plus, complex_state)))
verify('complex-state accidental equality is exactly as stated', mv(P, complex_state) == theta(complex_state) == (C(0, 1), C(1)))
verify('linear complex-state scalar output is stated vector', mv(P, vmul(i, complex_state)) == (C(-1), C(0, 1)))
verify('antilinear complex-state scalar output is stated vector', theta(vmul(i, complex_state)) == (C(1), C(0, -1)))
verify('plus-state outputs are orthogonal', mv(P, plus) == plus and theta(plus) == (C(-1), C(1)) and inner(mv(P, plus), theta(plus)) == C(0))
verify('normalized sigma-x expectation after P is plus one', inner(mv(P, plus), mv(P, mv(P, plus))) == inner(plus, plus))
verify('normalized sigma-x expectation after Theta is minus one', inner(theta(plus), mv(P, theta(plus))) == neg(inner(plus, plus)))
verify('H=P has independent eigenvectors with eigenvalues plus/minus one', mv(P, plus) == plus and mv(P, minus) == vmul(C(-1), minus))
H = ((C(0), C(1)), (C(1), C(0)))
commutator = tuple(tuple(add(mm(H, P)[row][column], neg(mm(P, H)[row][column])) for column in range(2)) for row in range(2))
verify('H=P commutes with P', commutator == ((C(0), C(0)), (C(0), C(0))))
verify('H=P fails Theta invariance', mm(mm(A, mc(P)), mn(A)) == mn(P))
verify('Theta partners are exactly orthogonal on sample vectors', all(inner(v, theta(v)) == C(0) for v in (up, down, plus, complex_state, (C(F(2, 3), F(1, 5)), C(F(-3, 7), F(4, 9))))))

course = json.loads((REPO/'dist/data/symmetry-course-lessons.json').read_text(encoding='utf-8'))
materials = json.loads((REPO/'dist/data/symmetry-materials.json').read_text(encoding='utf-8'))
sources = {source['id'] for doc in (course, materials) for source in doc['sources']}
verify('both conceptual IDs appear exactly once', len(exercises) == 2 and set(by_id) == conceptual_ids)
verify('all catalog IDs are unique', len({e['id'] for e in data['exercises']}) == len(data['exercises']))
for exercise in exercises:
    verify(exercise['id']+': known sources', set(exercise['sourceIds']) <= sources)
    verify(exercise['id']+': required display fields populated', all(exercise.get(field) for field in ('id', 'track', 'title', 'modelLabel', 'prompt', 'givens', 'hint', 'steps', 'answer', 'pitfall', 'sourceIds')))
    verify(exercise['id']+': complete steps and explicit self-checks', len(exercise['steps']) >= 3 and all(step['title'] and step['explanation'] and step['formula'] and '自检' in step['explanation'] for step in exercise['steps']))
    check = exercise['check']
    verify(exercise['id']+': unambiguous final check', type(check['answer']) is int and 0 <= check['answer'] < len(check['choices']) and len(set(check['choices'])) == len(check['choices']) and bool(check['explanation']))
    verify(exercise['id']+': no invented lab or preset', 'lab' not in exercise and 'labPreset' not in exercise and 'materialId' not in exercise)
legacy = [e for e in data['exercises'] if e['id'] not in conceptual_ids]
verify('conceptual records use the original exercise field vocabulary', all(set(e) <= set().union(*(set(e) for e in legacy)) for e in exercises))
lesson_map = {lesson['id']: lesson['derivationIds'] for lesson in course['lessons']}
verify('space lesson links to its exact orbit exercise', lesson_map['space-04'] == ['space-pminus1-orbit-stabilizer'])
verify('color lesson links to its exact operator exercise', lesson_map['color-03'] == ['color-swap-antilinear-time-reversal'])
verify('unrelated convention lesson remains honestly unbound', lesson_map['magnetic-03'] == [])
verify('23 of 24 crystal/spin lessons now have reviewed continuations', len(lesson_map) == 24 and sum(bool(ids) for ids in lesson_map.values()) == 23)
teaching = (REPO/'dist/python/teaching_labs.py').read_text(encoding='utf-8')
mini = (REPO/'dist/python/symmetry_mini_demos.py').read_text(encoding='utf-8')
color = next(lesson for lesson in course['lessons'] if lesson['id'] == 'color-03')
verify('negative convention is explicitly present in color-03 and teaching lab', '−iσy K' in json.dumps(color, ensure_ascii=False) or '−iσyK' in json.dumps(color, ensure_ascii=False))
verify('teaching implementation uses minus convention', 'return [-b.conjugate(), a.conjugate()]' in teaching)
verify('mini implementation uses the phase-equivalent plus convention', 'return [v[1].conjugate(),-v[0].conjugate()]' in mini)

print('Crystal conceptual derivations:', len(checks), 'checks passed with exact Q and Q(i) arithmetic; no floating-point calculations, no files written.')
