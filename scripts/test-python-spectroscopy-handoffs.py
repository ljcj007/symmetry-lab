"""Verify actual spectroscopy exercise submissions captured by the browser adapter."""

import json
from math import isclose
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist/python'))
from browser_api import run


def close(actual, expected, *, tolerance=1e-12):
    assert isclose(actual, expected, rel_tol=0, abs_tol=tolerance), (actual, expected)


def main():
    requests = json.load(sys.stdin)

    def calculate(lesson, use):
        request = requests[lesson][use]
        return run(request['action'], request['input'])

    before = calculate('resonance-interactions', 'lecture')
    close(before['parameters']['field'], .34)
    axial = calculate('resonance-interactions', 'derived')
    close(axial['parameters']['field'], 0)
    close(axial['parameters']['zeroFieldE'], 0)
    groups = axial['selection']['groups']
    assert [row['degeneracy'] for row in groups] == [1, 2]
    close(groups[0]['energy'], -2 * 2.87 / 3)
    close(groups[1]['energy'], 2.87 / 3)
    close(axial['selection']['dominantFrequency'], 2.87)
    hyperfine = calculate('resonance-interactions', 'comparison')
    close(hyperfine['parameters']['field'], 0)
    groups = hyperfine['selection']['groups']
    assert [row['degeneracy'] for row in groups] == [1, 3]
    close(groups[0]['energy'], -3 * .3 / 4)
    close(groups[1]['energy'], .3 / 4)

    barrier = calculate('andreev-barriers', 'lecture')
    assert barrier['parameters']['barrier'] == 1.5 and barrier['parameters']['gap'] == .3
    normal = calculate('andreev-barriers', 'derived')
    assert normal['parameters']['barrier'] == normal['parameters']['gap'] == 0
    selection = normal['selection']
    close(selection['andreevReflection'], 0)
    close(selection['quasiparticleTransmission'], 1, tolerance=2e-6)
    close(selection['conductanceQuantum'], 2, tolerance=2e-6)

    d9 = calculate('spectra-audit', 'lecture')
    assert d9['parameters']['configuration'] == 'd9'
    close(d9['checks']['threePolarizationStrength'], .4)
    d8 = calculate('spectra-audit', 'derived')
    assert d8['parameters']['configuration'] == 'd8'
    close(d8['checks']['threePolarizationStrength'], .8)
    close(2 * d8['parameters']['width'], .70)
    print('Spectroscopy Python replay: axial splitting and zero-field hyperfine, matched normal conductance, and d8/d9 dipole sums verified.')


if __name__ == '__main__':
    main()
