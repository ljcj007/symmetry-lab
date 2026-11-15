"""Independent exact checks plus live, unmodified Python lab replies for UI tests."""
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import sympy as sp
import teaching_labs

rows = json.load(sys.stdin)
assert len(rows) == 6
def exact(coeff):
    return (sp.Integer(coeff[0]) + sp.I * coeff[1]) / sp.sqrt(coeff[2])
def display(text):
    return sp.sympify(text.replace('−', '-').replace('√2', 'sqrt(2)').replace('i', 'I'))
for row in rows:
    s, z, c, a = (exact(row[key]) for key in ('s', 'z', 'c', 'a'))
    transformed_u = sp.simplify(sp.I * sp.conjugate(s) / s)
    assert sp.simplify(c - z / s) == 0
    assert sp.simplify(a - transformed_u * sp.conjugate(c)) == 0
    assert sp.simplify(transformed_u * sp.conjugate(a) - c) == 0
    assert sp.simplify(transformed_u * sp.conjugate(transformed_u) - 1) == 0
    for field, expected in [('coordinate', c), ('conjugate', sp.conjugate(c)), ('once', a), ('twice', c)]:
        assert sp.simplify(display(row[field]) - expected) == 0, (row, field)
assert sp.I * sp.conjugate(sp.I) == 1 and sp.I * (sp.I * 1) == -1

# Verify the p x spin worked reduction in the full four-element C2 double group.
orbital = [3, -1, 3, -1]
spin = [2, 0, -2, 0]
product = [a * b for a, b in zip(orbital, spin)]
assert product == [6, 0, -6, 0]
irreps = [[1, sp.I, -1, -sp.I], [1, -sp.I, -1, sp.I]]
for chi in irreps:
    assert sp.simplify(sum(sp.conjugate(a) * b for a, b in zip(chi, product)) / 4) == 3
assert all(sp.simplify(3 * (irreps[0][i] + irreps[1][i]) - product[i]) == 0 for i in range(4))

def c(value):
    return complex(value['re'], value['im'])
def close(a, b):
    assert abs(a - b) < 1e-11, (a, b)
replies = {}
for initial in ('up', 'plus'):
    reply = teaching_labs.run({'lab': 'spinor', 'axis': 'z', 'initialState': initial})
    replies[initial] = reply
    initial_state = list(map(c, reply['frames'][0]['spinor']))
    once = list(map(c, reply['timeReversal']['state']))
    twice = list(map(c, reply['timeReversal']['twoApplications']))
    expected_once = [-initial_state[1].conjugate(), initial_state[0].conjugate()]
    for a, b in zip(once, expected_once): close(a, b)
    for a, b in zip(twice, initial_state): close(a, -b)
    close(sum(a.conjugate() * b for a, b in zip(initial_state, once)), 0)
    for angle, expected in [(0, 1), (180, -1j if initial == 'up' else 0), (360, -1), (720, 1)]:
        frame = next(f for f in reply['frames'] if f['angle'] == angle)
        close(c(frame['overlap']), expected)
        for actual, expected_probability in zip(frame['probabilities'], [1.0, 0.0] if initial == 'up' else [0.5, 0.5]):
            close(actual, expected_probability)

for k, trim, eligible, square in [(0, True, True, -1), (0.25, False, False, 1j), (0.5, True, False, 1), (-1, True, True, -1), (1, True, True, -1)]:
    reply = teaching_labs.run({'lab': 'antiferro', 'k': k, 'spinful': True})
    assert reply['isTrim'] is trim and reply['kramersEligible'] is eligible
    close(c(reply['square']), square)
    replies['af' + str(k)] = reply
reply = teaching_labs.run({'lab': 'antiferro', 'k': 0.5, 'spinful': False})
assert reply['kramersEligible'] is True
replies['af-spinless'] = reply
replies['c2'] = teaching_labs.run({'lab': 'double_group', 'preset': 'c2_point', 'steps': 4, 'kz': '0'})
assert replies['c2']['group']['order'] == 4
assert len(replies['c2']['frames']) == 5

# The transverse three-dimensional example has kz=0 but is not a TRIM.
k3 = [sp.Rational(1, 5), 0, 0]
tau = [0, 0, sp.Rational(1, 2)]
square3 = -sp.exp(-4 * sp.pi * sp.I * sum(a * b for a, b in zip(k3, tau)))
assert square3 == -1 and not all((2 * x).is_integer if hasattr(2*x, 'is_integer') else float(2*x).is_integer() for x in k3)
along = teaching_labs.run({'lab': 'antiferro', 'k': 0.2, 'spinful': True})
assert abs(c(along['square']) + 1) > 0.1
replies['magnetic'] = teaching_labs.run({'lab': 'magnetic', 'operation': 'E', 'timeReversal': True, 'moment': [0, 0, 1], 'position': [0.25, 0.35, 0.45]})
print(json.dumps(replies, ensure_ascii=False))
