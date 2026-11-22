"""Check the actual worked results from the captured classroom submissions.

Pipe node scripts/test-electronic-response-handoffs.mjs --payloads to stdin.
"""

import json
from math import isclose
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
from browser_api import run


def close(actual, expected, *, tolerance=1e-12):
    assert isclose(actual, expected, rel_tol=0, abs_tol=tolerance), (actual, expected)


def result(captured, lesson, entry):
    request = captured[lesson][entry]
    return run(request['action'], request['input'])


def selected_shg(response):
    close(response['selection']['angle'], 45)
    assert response['selection']['channel'] == 'PP'
    close(response['selection']['intensity'], 1 / 8)
    sample = response['scan']['angles'].index(45)
    close(response['scan']['channels']['PP']['intensities'][sample], 1 / 8)


def unfolding_weights(response, band, at_zero, at_boundary):
    selection = response['selection']
    close(selection['K'], 0)
    close(selection['q'], 0)
    assert selection['band'] == band
    weights = {channel['kOverPi']: channel['weight'] for channel in selection['channels']}
    assert set(weights) == {-1, 0}
    close(weights[0], at_zero)
    close(weights[-1], at_boundary)


def main():
    captured = json.load(sys.stdin)
    for entry in ('lecture', 'derived'):
        selected_shg(result(captured, 'shg-geometry', entry))
        unfolding_weights(result(captured, 'unfold-projection', entry), 0, 1, 0)
    close(result(captured, 'shg-geometry', 'legacy')['selection']['intensity'], 3 / 32)
    unfolding_weights(result(captured, 'unfold-projection', 'upper'), 1, 0, 1)
    assert len(result(captured, 'unfold-projection', 'legacy')['selection']['channels']) == 4

    exact = result(captured, 'device-scattering', 'derived')['selection']
    close(exact['transmission'], .5, tolerance=1e-6)
    close(exact['reflection'], .5, tolerance=1e-6)
    close(exact['transmission'] + exact['reflection'] + exact['regulatorAbsorption'], 1)
    lecture = result(captured, 'device-scattering', 'lecture')['selection']
    legacy = result(captured, 'device-scattering', 'legacy')['selection']
    close(lecture['transmission'], legacy['transmission'])
    close(lecture['transmission'], (4 - .2 ** 2) / (4 - .2 ** 2 + 1.5 ** 2), tolerance=1e-6)
    print('Python classroom replay passed: GaAs I_PP=1/8, two-site Γ weights exchanged, and a single-site barrier gave T=R=1/2 as eta tends to zero.')


if __name__ == '__main__':
    main()
