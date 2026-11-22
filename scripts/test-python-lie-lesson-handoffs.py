"""Check the worked results for lesson and derivation payloads captured from the UI.

Run with ``node scripts/test-lie-lesson-handoffs.mjs --payloads`` piped to stdin.
"""

import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from teaching_labs import run


def channels(result):
    return {(term['p'], term['q']): (term['dimension'], term['multiplicity'])
            for term in result['decomposition']}


def close(actual, expected):
    assert math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-12), (actual, expected)


def main():
    captured = json.load(sys.stdin)
    inputs, exercises = captured['lessons'], captured['derivations']
    assert len(inputs) == len(exercises) == 6
    rabi = run(inputs['rabi-qubit-control'])
    close(rabi['omegaEffective'], 2 * math.sqrt(2))
    close(rabi['maxTransitionProbability'], .5)
    close(rabi['transitionProbability'], .5)

    spin = run(inputs['su2-coupling-representations'])
    assert spin['dimension'] == 6
    assert {term['twoJ']: term['dimension'] for term in spin['decomposition']} == {3: 4, 1: 2}

    exchange = run(inputs['singlet-triplet-exchange'])
    assert [term['probabilityExact'] for term in exchange['selected']['expansion']] == ['1/2', '1/2']
    assert {term['twoJ']: term['energy'] for term in exchange['decomposition']} == {2: .25, 0: -.75}

    label_input = inputs['su3-dynkin-representations']
    fifteen = run(label_input)
    conjugate = run({**label_input, 'p1': label_input['q1'], 'q1': label_input['p1']})
    assert channels(fifteen) == {(2, 1): (15, 1)}
    assert channels(conjugate) == {(1, 2): (15, 1)}
    for result in (fifteen, conjugate):
        close(result['decomposition'][0]['casimir'], 16 / 3)

    meson = run(inputs['su3-flavor-color'])
    assert meson['dimension'] == 9
    assert channels(meson) == {(0, 0): (1, 1), (1, 1): (8, 1)}

    octet = run(inputs['su3-octet-selection'])
    assert octet['dimension'] == 8
    assert channels(octet) == {(1, 1): (8, 1)}

    resonant = run(exercises['rabi-pi-pulse'])
    close(resonant['transitionProbability'], 1)
    close(resonant['maxTransitionProbability'], 1)

    lowered = run(exercises['su2-spin-addition'])
    quartet = next(row for row in lowered['selected']['expansion'] if row['twoJ'] == 3)
    assert quartet['twoM'] == 1
    assert quartet['probabilityExact'] == '1/3'

    exchange_two = run(exercises['exchange-splitting'])
    assert {term['twoJ']: term['energy'] for term in exchange_two['decomposition']} == {2: .5, 0: -1.5}

    twentyseven = run(exercises['su3-dynkin-dimension'])
    assert channels(twentyseven) == {(2, 2): (27, 1)}
    close(twentyseven['decomposition'][0]['casimir'], 8)

    assert channels(run(exercises['meson-singlet'])) == {(0, 0): (1, 1), (1, 1): (8, 1)}
    two_octets = run(exercises['octet-multiplicity'])
    assert two_octets['dimension'] == 64
    assert channels(two_octets) == {(2, 2): (27, 1), (3, 0): (10, 1), (0, 3): (10, 1),
                                    (1, 1): (8, 2), (0, 0): (1, 1)}
    print('Twelve lesson and derivation UI requests matched the real Python results via the teaching dispatcher.')


if __name__ == '__main__':
    main()
