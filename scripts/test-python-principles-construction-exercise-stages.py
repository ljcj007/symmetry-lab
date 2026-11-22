"""Replay all 14 manually submitted classroom stage requests through the real core."""
import json
import math
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from browser_api import run


def near(actual, expected, tolerance=1e-9):
    np.testing.assert_allclose(actual, expected, rtol=0, atol=tolerance)


def compare_inputs(first, second, changed):
    assert {key for key in first if first[key] != second[key]} == set(changed)


def complex_matrix(packed):
    return np.asarray(packed['re']) + 1j * np.asarray(packed['im'])


payloads = json.load(sys.stdin)
requests = {stage['preset']: stage['input'] for stage in payloads}
results = {stage['preset']: run(stage['action'], stage['input']) for stage in payloads}
assert len(payloads) == len(results) == 14
assert all(out['checks']['passed'] for out in results.values())

heisenberg, dmi = (results[key] for key in ('exchange-heisenberg', 'exchange-plane'))
compare_inputs(requests['exchange-heisenberg'], requests['exchange-plane'], ['dz'])
near([heisenberg['classical']['energy'], dmi['classical']['energy']], [-1, -math.hypot(1, .6)])
near([heisenberg['exchange']['levels'][0], dmi['exchange']['levels'][0]],
     [-.75, -.25 - math.hypot(1, .6) / 2])
near([heisenberg['classical']['angleDegrees'], dmi['classical']['angleDegrees']],
     [180, 180 - math.degrees(math.atan(.6))])
for result in (heisenberg, dmi):
    near(result['exchange']['groundSpin1'], [0, 0, 0])
    near(result['exchange']['groundSpin2'], [0, 0, 0])

closed, dephasing, relaxation = (results[key]['conservation'] for key in (
    'conservation-mixed-xyz', 'conservation-bath-sz', 'conservation-bath-relaxation'))
mixed_request = requests['conservation-mixed-xyz']
assert (mixed_request['initialState'], mixed_request['jx'], mixed_request['jy'], mixed_request['jz']) == (
    'mixed', 1, .4, 1.7)
assert mixed_request['gammaPhi'] == mixed_request['gamma1'] == 0
compare_inputs(requests['conservation-bath-sz'], requests['conservation-bath-relaxation'], ['gamma1'])
assert closed['selected'] == dephasing['selected'] == relaxation['selected'] == 'sz'
closed_proof, dephasing_proof, relaxation_proof = (
    next(row for row in data['proofs'] if row['id'] == 'sz') for data in (closed, dephasing, relaxation))
assert not closed_proof['hamiltonianConserved'] and not closed_proof['conserved']
assert closed_proof['hamiltonianNorm'] > .4
for step in closed['trajectory']:
    near(complex_matrix(step['rho']), np.eye(4) / 4)
    near(step['expectations']['sz'], 0)
assert dephasing_proof['hamiltonianConserved'] and dephasing_proof['conserved']
near(dephasing_proof['totalAdjointNorm'], 0)
assert relaxation_proof['hamiltonianConserved'] and not relaxation_proof['conserved']
assert relaxation_proof['totalAdjointNorm'] > .2
near(dephasing['trajectory'][-1]['expectations']['sz'], 0)
near(relaxation['trajectory'][-1]['expectations']['sz'], math.exp(-.8) - 1)

direction_cases = ('salc-polarization-x', 'salc-polarization')
compare_inputs(*(requests[key] for key in direction_cases), ['polarizationAngle'])
for key, expected in zip(direction_cases, ([.5, 0], [.25, .25])):
    selection = results[key]['salc']['selection']
    row = next(row for row in selection if row['initial'] == 'A1' and row['final'] == 'E')
    assert row['multiplicity'] == 1
    near(abs(complex_matrix(row['matrix'])[:, 0]) ** 2, expected)
    near(row['strength'], .5)
    forbidden = next(row for row in selection if row['initial'] == row['final'] == 'A1')
    assert forbidden['multiplicity'] == 0
    near(forbidden['strength'], 0)

wave_cases = ('wavevector-stripe', 'wavevector-double', 'wavevector-checker', 'wavevector-checker-phase90')
compare_inputs(requests[wave_cases[0]], requests[wave_cases[1]], ['pattern'])
compare_inputs(requests[wave_cases[2]], requests[wave_cases[3]], ['phaseDegrees'])
expected_sites = ({(1, 0), (3, 0)}, {(1, 0), (3, 0), (0, 1), (0, 3)}, {(1, 1)}, set())
for key, sites, per_spot in zip(wave_cases, expected_sites, (.25, .25, 1, 0)):
    rows = results[key]['wavevector']['spectrum']
    selected = {tuple(row['q']): row['intensity'] for row in rows if row['intensity'] > 1e-10}
    assert selected.keys() == sites
    near(list(selected.values()), [per_spot] * len(sites))

glide_cases = ('nonsymmorphic-hourglass', 'nonsymmorphic-glide-quarter', 'nonsymmorphic-spinless')
compare_inputs(requests[glide_cases[0]], requests[glide_cases[1]], ['spinOrbit', 'kFraction'])
endpoint, quarter, spinless = (results[key]['nonsymmorphic'] for key in glide_cases)
gamma, edge = endpoint['endpoints']
assert gamma['kramersProtected'] and edge['kramersProtected']
for block in gamma['blocks']:
    values = np.asarray(block['symmetryEigenvalues'])
    near(values[:, 0], [0, 0])
    near(sorted(values[:, 1]), [-1, 1])
for block in edge['blocks']:
    values = np.asarray(block['symmetryEigenvalues'])
    near(values[:, 1], [0, 0])
    near(values[0, 0], values[1, 0])
    near(abs(values[0, 0]), 1)
near(quarter['crossingFractionUnperturbed'], .25)
near(quarter['momentum']['fractionalK'], [.25, 0, 0])
assert quarter['partnerSwitchProtected'] and quarter['momentum']['inLittleGroup']
assert not quarter['momentum']['timeReversalInvariant']
energies = np.linalg.eigvalsh(complex_matrix(quarter['selectedHamiltonian']))
near(energies[1:3], [0, 0])
near(np.asarray(quarter['selectedGlideEigenvalues']).sum(axis=0), [0, 0])

spinless_edge = spinless['endpoints'][1]
assert not spinless_edge['kramersProtected']
assert spinless_edge['timeReversalInvariant'] and spinless_edge['inLittleGroup']
assert len(spinless_edge['blocks']) == 1 and spinless_edge['blocks'][0]['multiplicity'] == 2
values = np.asarray(spinless_edge['blocks'][0]['symmetryEigenvalues'])
near(values[:, 0], [0, 0])
near(sorted(values[:, 1]), [-1, 1])

print(json.dumps({
    'stages': len(results),
    'classicalExchangeMinima': [heisenberg['classical']['energy'], dmi['classical']['energy']],
    'closedMixedSzCommutatorNorm': closed_proof['hamiltonianNorm'],
    'closedMixedSzExpectation': closed['trajectory'][-1]['expectations']['sz'],
    'dephasingSzAdjointNorm': dephasing_proof['totalAdjointNorm'],
    'relaxationSzAdjointNorm': relaxation_proof['totalAdjointNorm'],
    'relaxationFinalSz': relaxation['trajectory'][-1]['expectations']['sz'],
    'salcPartnerWeights': [[.5, 0], [.25, .25]],
    'nonzeroSatelliteCounts': [len(sites) for sites in expected_sites],
    'glideCrossingFraction': quarter['crossingFractionUnperturbed'],
    'glideCrossingGap': float(energies[2] - energies[1]),
    'spinlessXKramersProtected': spinless_edge['kramersProtected'],
}, allow_nan=False))
