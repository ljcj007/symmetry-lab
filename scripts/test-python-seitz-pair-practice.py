"""Verify real Seitz requests captured from the Space-02 lesson panel."""

from fractions import Fraction
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run


def explicit_product(left, right):
    a, b = left['rotation'], right['rotation']
    t, u = left['translation'], right['translation']
    rotation = [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    translation = tuple(Fraction(t[i]) + sum(a[i][k] * Fraction(u[k]) for k in range(3)) for i in range(3))
    return rotation, translation


def verify(case, expected_phases, expected_difference, expected_fold):
    requests = case['requests']
    assert len(requests) == 2
    assert all(entry['action'] == 'symbolic_interfaces' for entry in requests)
    ab, ba = [entry['input'] for entry in requests]
    assert ab['operations'] == list(reversed(ba['operations']))
    assert ab['k'] == ba['k']
    if case['label'].startswith('transverse'):
        expected_axis = ['1/2', 0, 0]
    else:
        expected_axis = [0, 0, '1/2']
    assert ab['operations'][0] == {'rotation': [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], 'translation': [0, 0, 0]}
    assert ab['operations'][1] == {'rotation': [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 'translation': expected_axis}

    translations, phases = [], []
    for payload in (ab, ba):
        assert payload['action'] == 'seitz' and payload['operation'] == 'multiply'
        result = run('symbolic_interfaces', payload)
        assert result['verified'] and not result['antiunitary']
        exact_rotation, exact_translation = explicit_product(*payload['operations'])
        assert result['rotation'] == [[str(value) for value in row] for row in exact_rotation]
        assert tuple(map(Fraction, result['translation'])) == exact_translation
        translations.append(exact_translation)
        phases.append(result['translation_phase']['expression'])

    assert phases == expected_phases
    assert tuple(b - a for a, b in zip(*translations)) == expected_difference
    assert all(tuple(value % 1 for value in translation) == expected_fold for translation in translations)
    return [list(map(str, translation)) for translation in translations]


def main():
    cases = {item['label']: item for item in json.load(sys.stdin)}
    assert set(cases) == {'transverse-gamma', 'transverse-half', 'parallel-half'}
    gamma = verify(cases['transverse-gamma'], ['1', '1'], (1, 0, 0), (Fraction(1, 2), 0, 0))
    boundary = verify(cases['transverse-half'], ['I', '-I'], (1, 0, 0), (Fraction(1, 2), 0, 0))
    parallel = verify(cases['parallel-half'], ['1', '1'], (0, 0, 0), (0, 0, Fraction(1, 2)))
    assert gamma == boundary == [['-1/2', '0', '0'], ['1/2', '0', '0']]
    assert parallel == [['0', '0', '1/2'], ['0', '0', '1/2']]
    print('Seitz replay passed: six exact requests, opposite transverse translations, equal folded endpoints and a commuting axial control.')


if __name__ == '__main__':
    main()
