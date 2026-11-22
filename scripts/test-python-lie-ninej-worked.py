"""Verify classroom Casimir arithmetic from the exact 9j calculator payloads."""
import json
from pathlib import Path
import sys

import sympy as sp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import su3_ninej


def casimir(label):
    p, q = label
    return sp.Rational(p*p + q*q + p*q + 3*p + 3*q, 3)


def pair_label(path):
    irrep = path['firstIntermediate']
    return irrep['p'], irrep['q']


def check(payload, exact_paths, exact_grouped, exact_moments):
    result = su3_ninej.run(payload)
    probabilities = [sp.Rational(value) for value in result['exactOutputProbabilities']]
    labels = [pair_label(path) for path in result['rightPaths']]
    assert result['exactOutputNorm'] == '1'
    if exact_paths is not None:
        assert probabilities == exact_paths, probabilities

    grouped = {}
    for label, probability in zip(labels, probabilities, strict=True):
        grouped[label] = grouped.get(label, 0) + probability
    assert grouped == exact_grouped, grouped
    assert sum(grouped.values()) == 1

    a, _, c, _ = payload['factors']
    values = {label: (casimir(label) - casimir(a) - casimir(c)) / 2 for label in grouped}
    mean = sum(grouped[label] * value for label, value in values.items())
    variance = sum(grouped[label] * value**2 for label, value in values.items()) - mean**2
    assert (mean, variance) == exact_moments, (mean, variance)
    return result, grouped, mean, variance


def report(grouped, mean, variance):
    return {'probabilityByFirstPairDynkinLabel': {f'{p},{q}': str(value) for (p, q), value in grouped.items()},
            'meanOverKappa': str(mean), 'varianceOverKappaSquared': str(variance)}


if __name__ == '__main__':
    # These requests are the two form submissions captured by the DOM route test.
    worked = json.load(sys.stdin)
    assert set(worked) == {'fundamentals', 'octetsSinglet'}
    half = sp.Rational(1, 2)
    fundamental, grouped, mean, variance = check(worked['fundamentals'], [0, half, half],
          {(2, 0): half, (0, 1): half}, (sp.Rational(-1, 6), sp.Rational(1, 4)))
    assert pair_label(fundamental['leftPaths'][0]) == (2, 0)
    evidence = {'fundamentals': report(grouped, mean, variance)}
    evidence['fundamentals']['exactPathProbabilities'] = fundamental['exactOutputProbabilities']

    singlet, grouped, mean, variance = check(worked['octetsSinglet'], None,
          {(2, 2): sp.Rational(27, 64), (3, 0): sp.Rational(5, 32), (0, 3): sp.Rational(5, 32),
           (1, 1): sp.Rational(1, 4), (0, 0): sp.Rational(1, 64)}, (0, sp.Rational(9, 8)))
    for side in ('leftPaths', 'rightPaths'):
        assert pair_label(singlet[side][7]) == (0, 0)
        assert singlet[side][7]['secondIntermediate']['dimension'] == 1
    assert singlet['exactRecouplingMatrix'][7][7] == '1/8'
    evidence['octetsSinglet'] = report(grouped, mean, variance)
    evidence['octetsSinglet']['doubleSingletOverlap'] = singlet['exactRecouplingMatrix'][7][7]
    print(json.dumps(evidence, indent=2))
