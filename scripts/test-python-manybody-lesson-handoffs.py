"""Run the exact native-handler requests from the companion Node test."""

import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run


def main():
    requests = json.load(sys.stdin)
    outputs = {}
    for key, call in requests.items():
        assert call['action'] in ('hubbard_lab', 'density_matrix_lab', 'polaron_lab'), key
        outputs[key] = run(call['action'], call['input'])
    require_hubbard(outputs)
    require_density(outputs)
    require_polaron(outputs, requests['polaronAtomic']['input'])
    print(f'{len(outputs)} captured lesson requests passed exact shared Python checks.')


def require_hubbard(out):
    basis = out['hubbardBasis']
    assert basis['checks']['basisDimension'] == 36 and basis['checks']['uniqueBondCount'] == 3
    assert out['hubbardPeriodic']['checks']['uniqueBondCount'] == 4
    assert out['hubbardGap']['gaps']['chargeGap'] == 2
    assert out['hubbardEmpty']['gaps']['chargeGap'] is None
    ionic = out['hubbardIonic']['ground']
    assert ionic['energy'] == -2 and ionic['density'] == [0, 2]
    degenerate = out['hubbardIonicDegenerate']['ground']
    assert degenerate['degeneracy'] == 2 and degenerate['nearestSpinCorrelation'] == -.25


def require_density(out):
    rates = out['undrivenDamping']['rates']
    np.testing.assert_allclose([rates['T1'], rates['T2']], [2.5, 10/3], rtol=0, atol=1e-12)
    sparse, dense = (out[key]['stateSnapshots'] for key in ('thermalSparse', 'thermalDense'))
    assert len(sparse) == 41 and len(dense) == 161
    assert len(sparse[0]['rho']['re']) == 4
    for sample, reference in zip(sparse, dense[::4]):
        assert abs(sample['time'] - reference['time']) < 1e-12
        for part in ('re', 'im'):
            np.testing.assert_allclose(sample['rho'][part], reference['rho'][part], atol=1e-12, rtol=0)
    assert abs(sparse[0]['rho']['re'][3][3] - sparse[-1]['rho']['re'][3][3]) > .1


def require_polaron(out, atom_input):
    atomic = out['polaronAtomic']['ground']
    baseline = run('polaron_lab', dict(atom_input, coupling=0))['ground']
    np.testing.assert_allclose(atomic['density'], [0, 1], atol=1e-12, rtol=0)
    np.testing.assert_allclose(atomic['conditionalDisplacement'][1][1], -1, atol=1e-8, rtol=0)
    np.testing.assert_allclose(atomic['energy'] - baseline['energy'], -.25, atol=1e-8, rtol=0)
    np.testing.assert_allclose(out['polaronSymmetric']['ground']['density'], [.5, .5], atol=1e-10, rtol=0)


if __name__ == '__main__':
    main()
