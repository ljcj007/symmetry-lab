"""Replay the three magnetic-03 Workbench requests with the production engine."""
from fractions import Fraction
import json
from pathlib import Path
import sys

DIST = Path(__file__).resolve().parents[1] / 'dist'
sys.path.insert(0, str(DIST / 'python'))
from browser_api import run


def catalog(name, entries):
    path = DIST / 'data' / name
    return {group['id']: group for group in json.loads(path.read_text(encoding='utf-8'))[entries]}


def payload(group, double=False):
    return {'operations': group['operations'], 'basis': group['basis'],
            'k': [0, 0, 0], 'doubleValued': double}


def point_projection(operations):
    return {(tuple(map(tuple, op['rotation'])), op['antiunitary']) for op in operations}


if __name__ == '__main__':
    requests = json.load(sys.stdin)
    mpg = catalog('points.json', 'points')
    expected = {
        '3.1': (1, [('E', False), ('C2z', False)], []),
        '3.2': (2, [('E', False), ('C2z', False), ('E', True), ('C2z', True)], [2, 3]),
        '3.3': (3, [('E', False), ('C2z', True)], [1]),
    }
    assert requests.keys() == expected.keys()
    evidence = {}
    for group_id, (kind, rows, antiunitary) in expected.items():
        group = mpg[group_id]
        assert group['type'] == kind
        assert requests[group_id] == {'action': 'analyze', 'payload': payload(group)}
        result = run(requests[group_id]['action'], requests[group_id]['payload'])
        assert result['k'] == [0, 0, 0]
        assert result['doubleValued'] is False
        little = result['littleGroup']
        assert [(op['name'], op['antiunitary']) for op in little['operations']] == rows
        assert little['antiunitaryIndices'] == antiunitary
        assert len(little['operations']) == group['order']
        assert all(all(x == 0 for x in op['translation']) for op in little['operations'])
        evidence[group_id] = {'type': kind, 'groupOrder': len(rows),
                              'antiunitaryCount': len(antiunitary), 'operationRows': rows}

    # The existing spin-double-valued option still refers to the same spatial
    # representative rows, with a different representation convention.
    spin = run('analyze', payload(mpg['3.3'], double=True))
    assert spin['doubleValued'] is True
    assert spin['littleGroup']['antiunitaryIndices'] == [1]

    # An actual Type IV magnetic space group has a nonzero translation on Θ.
    bns = catalog('magnetic-groups.json', 'groups')['1.3']
    assert bns['type'] == 4
    exact = run('analyze', payload(bns))['littleGroup']['operations']
    grey = mpg['1.2']
    assert grey['type'] == 2
    assert point_projection(exact) == point_projection(grey['operations'])
    assert [list(map(Fraction, row['translation'])) for row in exact if row['antiunitary']] == [
        [Fraction(1, 2), 0, 0],
    ]
    assert [row['translation'] for row in grey['operations'] if row['antiunitary']] == [[0, 0, 0]]
    evidence['scopeControl'] = {'magneticSpaceGroup': bns['id'], 'type': bns['type'],
                                'antiunitaryTranslation': ['1/2', '0', '0'],
                                'projectedMagneticPointGroup': grey['id']}
    print(json.dumps(evidence, indent=2))
