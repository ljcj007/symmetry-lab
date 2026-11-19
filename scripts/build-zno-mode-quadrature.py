"""Rebuild or check the ZnO finite-q projection input using the public Python API.

The already published no-NAC Phonopy eigenpairs are inputs. The script reads the
original companion and makes a finite displacement snapshot. It needs the same
NumPy, spglib and PyYAML environment as the existing site computation tests.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / 'dist/data/examples'
FIXTURE = EXAMPLES / 'zno-mode-quadrature.json'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

SCHEMA = 'symmetry-lab.zno-mode-quadrature.v1'
REFERENCE = 'phonopy-zno-derived-qpoints'
COMMIT = '0937453a793eb504f674b7d4fd98421d508008e6'
QPOINTS = {
    'file': 'phonopy-zno-qpoints.yaml', 'byteCount': 55277,
    'sha256': '37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5',
}
COMPANION = {
    'file': 'phonopy-zno-structure.yaml', 'byteCount': 7641,
    'sha256': '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c',
}
SETTINGS = {
    'qIndex': 2, 'bandIndex': 10, 'q': [.25, 0, .25],
    'frequency': 13.5565890715, 'frequencyUnit': 'THz',
    'supercell': [4, 1, 4], 'freezeAmplitude': .1, 'phase': math.pi / 3,
    'lengthUnit': 'angstrom', 'removeTranslation': False,
}
COMPARE_TOLERANCE = 1e-9


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked_text(record):
    raw = (EXAMPLES / record['file']).read_bytes()
    require(len(raw) == record['byteCount'] and hashlib.sha256(raw).hexdigest() == record['sha256'],
            'Pinned ZnO input differs: ' + record['file'])
    return raw.decode('utf-8')


def rounded(value):
    # Keep input precision well within the comparison tolerance and normalize -0.
    return round(float(value), 12) or 0.0


def rounded_rows(matrix):
    return [[rounded(x) for x in row] for row in matrix]


def source_snapshot():
    manifest = json.loads((EXAMPLES / 'phonopy-zno-source.json').read_bytes())
    require(manifest['id'] == REFERENCE and manifest['commit'] == COMMIT
            and manifest['generator']['settings']['is_nac'] is False,
            'The supplied source must be the recorded no-NAC postprocessing result.')
    result = run('phonon_modes', {
        'content': checked_text(QPOINTS), 'structure_content': checked_text(COMPANION),
        'filename': QPOINTS['file'], 'selected_q': SETTINGS['qIndex'], 'selected_band': SETTINGS['bandIndex'],
        'supercell': SETTINGS['supercell'], 'amplitude': SETTINGS['freezeAmplitude'],
        'phase': SETTINGS['phase'], 'frequency_unit': SETTINGS['frequencyUnit'],
        'length_unit': SETTINGS['lengthUnit'],
    })
    chosen, frozen = result['selection'], result['frozen']
    require(chosen['q'] == SETTINGS['q'] and chosen['qIndex'] == SETTINGS['qIndex']
            and chosen['bandIndex'] == SETTINGS['bandIndex'] and chosen['frequency'] == SETTINGS['frequency']
            and result['frequencyUnit'] == SETTINGS['frequencyUnit']
            and frozen['lengthUnit'] == SETTINGS['lengthUnit'], 'Unexpected ZnO choice or units.')
    require(frozen['commensurate'] and frozen['supercell'] == SETTINGS['supercell']
            and len(frozen['atoms']) == 64 and result['structure']['natom'] == 4,
            'Expected four primitive sites and a 64-site commensurate snapshot.')
    return result


def quadratures(snapshot):
    """Recreate the two Cartesian directions from the archived eigenpair."""
    primitive = snapshot['structure']['atoms']
    shape = np.asarray(SETTINGS['supercell'])
    q = np.asarray(SETTINGS['q'])
    raw_vectors = np.asarray(snapshot['selection']['eigenvector'])
    physical = (raw_vectors[..., 0] + 1j * raw_vectors[..., 1]) / np.sqrt([a['mass'] for a in primitive])[:, None]
    physical /= np.max(np.linalg.norm(physical, axis=1))

    coordinates, vectors = [], []
    for atom in snapshot['frozen']['atoms']:
        index = atom['atomIndex']
        require(atom['symbol'] == primitive[index]['symbol'], 'Unexpected atom order in the snapshot.')
        fractional = np.asarray(atom['cell']) + primitive[index]['coordinates']
        coordinates.append(fractional / shape)
        vectors.append(physical[index] * np.exp(2j * math.pi * np.dot(q, fractional)))
    vectors = np.asarray(vectors)
    np.testing.assert_allclose(np.vdot(vectors.real, vectors.imag), 0, atol=1e-12, rtol=0)
    norm = np.linalg.norm(vectors.real)
    np.testing.assert_allclose(norm, np.linalg.norm(vectors.imag), atol=1e-12, rtol=0)
    return coordinates, vectors, norm


def build_fixture():
    snapshot = source_snapshot()
    frozen = snapshot['frozen']
    reference, vectors, norm = quadratures(snapshot)

    def structure(coords):
        return {'lattice': rounded_rows(frozen['lattice']), 'lengthUnit': SETTINGS['lengthUnit'], 'atoms': [
            {'symbol': atom['symbol'], 'coordinates': position}
            for atom, position in zip(frozen['atoms'], rounded_rows(coords))
        ]}

    phi, amplitude = SETTINGS['phase'], SETTINGS['freezeAmplitude']
    cosine = rounded(amplitude * norm * math.cos(phi))
    sine = rounded(amplitude * norm * math.sin(phi))
    return {
        'schema': SCHEMA,
        'source': {'referenceId': REFERENCE, 'commit': COMMIT, 'qpoints': QPOINTS, 'structure': COMPANION,
                   'nonAnalyticCorrection': False},
        'settings': SETTINGS,
        'parent': structure(reference),
        'distorted': structure([atom['fractional'] for atom in frozen['atoms']]),
        'modes': [
            {'id': 'phase-zero', 'vectors': rounded_rows(vectors.real)},
            {'id': 'phase-pi-over-two', 'vectors': rounded_rows(vectors.imag)},
        ],
        'checks': {
            'oneDirection': {'amplitudes': [cosine], 'residualNorm': abs(sine),
                             'relativeResidual': rounded(abs(math.sin(phi)))},
            'twoDirections': {'amplitudes': [cosine, sine], 'residualNorm': 0, 'relativeResidual': 0},
            'compareTolerance': COMPARE_TOLERANCE,
        },
    }


def check_fits(fixture):
    for count, comparison in enumerate(('oneDirection', 'twoDirections'), 1):
        expected = fixture['checks'][comparison]
        computed = run('distortion_lab', {
            'preset': 'custom', 'parent': fixture['parent'], 'distorted': fixture['distorted'],
            'modes': fixture['modes'][:count], 'atom_mapping': list(range(len(fixture['parent']['atoms']))),
            'remove_translation': fixture['settings']['removeTranslation'],
        })
        fit = computed['decomposition']
        require(fit['rank'] == count and fit['orthonormal'] and fit['amplitudeUnit'] == 'angstrom',
                f'Unexpected rank, Gram matrix or amplitude units for {comparison}.')
        np.testing.assert_allclose(fit['gram'], np.eye(count), atol=COMPARE_TOLERANCE, rtol=0)
        np.testing.assert_allclose(computed['strain']['greenLagrange'], 0, atol=COMPARE_TOLERANCE, rtol=0)
        for key, target in expected.items():
            np.testing.assert_allclose(fit[key], target, atol=COMPARE_TOLERANCE, rtol=0,
                                       err_msg=f'{comparison} {key}')
        print(f"{comparison}: residual {fit['residualNorm']:.12g} Å, relative {fit['relativeResidual']:.12g}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare current data without writing files.')
    args = parser.parse_args()
    fixture = build_fixture()
    encoded = (json.dumps(fixture, indent=2, allow_nan=False) + '\n').encode('ascii')
    if args.check:
        require(FIXTURE.read_bytes() == encoded, f'{FIXTURE.name} differs from its reproducible source.')
    check_fits(fixture)
    if not args.check:
        FIXTURE.write_bytes(encoded)


if __name__ == '__main__':
    main()
