"""Replay requests from test-pminus1-practice.mjs --emit-requests."""

from fractions import Fraction
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run
from crystkit_browser import change_basis, identity, operation


def main():
    requests = json.load(sys.stdin)
    assert set(requests) == {'general', 'center', 'shifted'}
    database = json.loads((ROOT / 'dist/data/space-groups.json').read_text(encoding='utf-8'))
    outcomes = {key: run('crystkit', value, database) for key, value in requests.items()}
    for result in outcomes.values():
        assert result['quotient']['order'] == 2
        assert result['orbit']['orbitStabilizerVerified']
        assert result['identification']['status'] == 'verified'
        assert [match['number'] for match in result['identification']['matches']] == [2]

    general, center, shifted = (outcomes[key]['orbit'] for key in ('general', 'center', 'shifted'))
    assert general['points'] == [['1/5', '3/10', '2/5'], ['4/5', '7/10', '3/5']]
    assert general['stabilizerIndices'] == [0]
    assert center['points'] == [[0, 0, 0]]
    assert center['stabilizerIndices'] == [0, 1]
    assert shifted['points'] == [['3/4', 0, 0]]
    assert shifted['stabilizerIndices'] == [0, 1]
    assert [(orbit['multiplicity'], orbit['stabilizerOrder']) for orbit in (general, center, shifted)] == [
        (2, 1), (1, 2), (1, 2)
    ]

    inversion_rotation = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]]
    group = next(entry for entry in database['groups'] if entry['number'] == 2)
    inversion = operation(next(op for op in group['operations'] if op['rotation'] == inversion_rotation))
    unwrapped = change_basis([inversion], identity(3), requests['shifted']['origin'])[0]
    assert unwrapped[1] == (Fraction(-1, 2), 0, 0)
    folded = next(op for op in outcomes['shifted']['operations'] if op['rotation'] == inversion_rotation)
    assert folded['translation'] == ['1/2', 0, 0]
    print('CrystKit replay passed: orbit/stabilizer (2,1), (1,2), (1,2); unfolded -1/2 and folded +1/2 with space-group type 2 retained.')


if __name__ == '__main__':
    main()
