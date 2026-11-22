"""Compare the classroom calculation with Phonopy 4.10.0 at directional Γ.

The official calculation refits force constants from the pinned FORCE_SETS
and evaluates the Wang dynamical matrix at Γ. Its low-level interface keeps
the raw and explicitly neutralized BORN cases independent of the high-level
API's normalization. This is offline harmonic postprocessing, without DFT.
"""

from importlib.metadata import version
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import phonopy
from phonopy.file_IO import parse_BORN
from phonopy.harmonic.dynamical_matrix import DynamicalMatrixWang
import yaml


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from zno_gamma_nac import FILES, run


def exercise(model, data, bare, reciprocal, raw_params):
    cases = []
    for label, direction, coordinates in (
            ('c-axis', [0, 0, 1], 'cartesian'),
            ('basal-axis', [1, 0, 0], 'cartesian'),
            ('oblique-cartesian', [1, 0, 1], 'cartesian'),
            ('oblique-reciprocal', [1, 0, 1], 'primitive-reciprocal'),
            ('reversed-oblique-reciprocal', [-1, 0, -1], 'primitive-reciprocal')):
        direction_fractional = np.asarray(direction, dtype=float)
        if coordinates == 'cartesian':
            direction_fractional = np.linalg.solve(reciprocal.T, direction_fractional)
        for correction in ('raw', 'neutralized'):
            original_born = raw_params['born']
            official_born = original_born if correction == 'raw' else original_born - original_born.mean(axis=0)
            official = DynamicalMatrixWang(model.supercell, model.primitive, model.force_constants.copy(),
                                          nac_params={**raw_params, 'born': official_born})
            official.run(np.zeros(3), q_direction=direction_fractional)
            result = run(dict(data, direction=direction, directionCoordinates=coordinates, correction=correction))
            np.testing.assert_allclose(result['electrostatics']['appliedBornCharges'], official_born, atol=1e-12, rtol=0)
            delta = np.array(result['corrected']['deltaDynamicalMatrix'])
            matrix_error = np.max(np.abs(bare + delta - official.dynamical_matrix))
            official_values = np.linalg.eigvalsh(official.dynamical_matrix)
            modes = result['corrected']['modes']
            squared_error = np.max(np.abs([mode['eigenvalue'] for mode in modes] - official_values))
            official_frequencies = np.sign(official_values) * np.sqrt(np.abs(official_values)) * model.unit_conversion_factor
            differences = np.abs([mode['frequencyTHz'] for mode in modes] - official_frequencies)
            # Near-zero acoustic frequencies amplify serialized matrix rounding.
            # Test all squared frequencies and optical frequencies separately.
            assert matrix_error < 3e-10 and squared_error < 3e-10 and max(differences[3:]) < 2e-8
            if correction == 'raw':
                assert abs(differences[2]) < 5e-7 and official_frequencies[2] > .03
            cases.append({'direction': label, 'correction': correction, 'matrixError': float(matrix_error),
                          'maxEigenvalueError': float(squared_error), 'maxOpticalErrorTHz': float(max(differences[3:])),
                          'thirdAcousticFrequencyTHz': float(official_frequencies[2])})
    return cases


def main():
    assert phonopy.__version__ == '4.10.0'
    examples = ROOT / 'dist/data/examples'
    data = {kind: (examples / identity[0]).read_bytes().decode('utf8') for kind, identity in FILES.items()}
    manifest = json.loads((examples / 'phonopy-zno-source.json').read_bytes())
    force_path = examples / 'phonopy-zno-FORCE_SETS'
    force_input, = [source for source in manifest['inputs'] if source['localFile'] == force_path.name]
    assert hashlib.sha256(force_path.read_bytes()).hexdigest() == force_input['sha256']
    model = phonopy.load(
        phonopy_yaml=str(examples / 'phonopy-zno-structure.yaml'), force_sets_filename=str(force_path),
        is_nac=False, fc_calculator='traditional', symmetrize_fc=True, is_compact_fc=True,
    )
    bare = model.run_qpoints([[0, 0, 0]], with_dynamical_matrices=True)
    archive = yaml.safe_load(data['qpoints'])['phonon'][0]
    serialized = np.array(archive['dynamical_matrix'])
    archive_matrix = serialized[:, ::2] + 1j * serialized[:, 1::2]
    baseline_error = float(np.max(np.abs(archive_matrix - bare.dynamical_matrices[0])))
    assert baseline_error < 1e-10
    np.testing.assert_allclose(bare.frequencies[0], [mode['frequency'] for mode in archive['band']], atol=2e-8, rtol=0)
    reciprocal = np.linalg.inv(model.primitive.cell).T
    raw_params = parse_BORN(model.primitive, filename=str(examples / 'phonopy-zno-BORN'))
    cases = exercise(model, data, bare.dynamical_matrices[0], reciprocal, raw_params)
    print(json.dumps({'officialMethod': 'Phonopy DynamicalMatrixWang, exact Γ directional limit',
                      'inputRevision': manifest['commit'], 'forceSetsSHA256': force_input['sha256'],
                      'versions': {name: version(name) for name in ('phonopy', 'numpy', 'spglib', 'symfc', 'phonors')},
                      'archivedBaselineMatrixError': baseline_error, 'cases': cases}, indent=2))


if __name__ == '__main__':
    main()
