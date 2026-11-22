"""Directional Γ-limit correction for the pinned wurtzite ZnO calculation."""

import hashlib
import math

import numpy as np
import yaml


ACTION = 'zno_gamma_nac'
SCHEMA = 'symmetry-lab-zno-gamma-nac-1'
REVISION = '0937453a793eb504f674b7d4fd98421d508008e6'
FREQUENCY_FACTOR = 15.633302300230191
TOLERANCE = 1e-8
SYMBOLS = ['Zn', 'Zn', 'O', 'O']
MASSES = [65.38, 65.38, 15.9994, 15.9994]
FILES = {
    'qpoints': ('phonopy-zno-qpoints.yaml', 55277,
                '37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5'),
    'structure': ('phonopy-zno-structure.yaml', 7641,
                  '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c'),
    'born': ('phonopy-zno-BORN', 112,
             '902118e6b31c9046c0b22eadac279e079563d2386e675a88409443923ee5063e'),
}
# Band indices refer to the archived q=0 record. A1, E1 and E2 agree with
# the verified dipole-projection lesson. The complementary optical z blocks
# are the two silent B1 modes of the wurtzite convention.
GROUPS = (
    ('acoustic', 'acoustic', [0, 1, 2]),
    ('e2-low', 'E2', [3, 4]),
    ('b1-low', 'B1', [5]),
    ('a1', 'A1', [6]),
    ('e1', 'E1', [7, 8]),
    ('e2-high', 'E2', [9, 10]),
    ('b1-high', 'B1', [11]),
)


def _read_source(payload, key):
    filename, size, digest = FILES[key]
    value = payload[key]
    if not isinstance(value, str) or len(value) != size or not value.isascii():
        raise ValueError(f'{filename}: the original pinned UTF-8 bytes are required.')
    if hashlib.sha256(value.encode('utf-8')).hexdigest() != digest:
        raise ValueError(f'{filename}: SHA-256 does not match the pinned ZnO source.')
    return value


def _residual(array):
    return float(np.max(np.abs(array)))


def _source_data(payload):
    source = {key: _read_source(payload, key) for key in FILES}
    structure = yaml.safe_load(source['structure'])
    cell = structure['primitive_cell']
    units = structure['physical_unit']
    if units != {'atomic_mass': 'AMU', 'length': 'angstrom',
                 'force_constants': 'eV/angstrom^2'}:
        raise ValueError('Unexpected ZnO source units.')
    if [atom['symbol'] for atom in cell['points']] != SYMBOLS or [
            atom['mass'] for atom in cell['points']] != MASSES:
        raise ValueError('Unexpected ZnO primitive-cell atom order or masses.')
    lattice = np.asarray(cell['lattice'])
    reciprocal = np.linalg.inv(lattice).T
    point = yaml.safe_load(source['qpoints'])
    gamma = point['phonon'][0]
    if gamma['q-position'] != [0, 0, 0] or point['natom'] != len(MASSES) or not np.allclose(
            point['reciprocal_lattice'], reciprocal, rtol=0, atol=TOLERANCE):
        raise ValueError('The archived Γ matrix and primitive reciprocal basis must match.')

    serialized = np.asarray(gamma['dynamical_matrix'])
    if serialized.shape != (12, 24) or np.any(serialized[:, 1::2]):
        raise ValueError('Expected the 12 × 12 real ZnO Γ dynamical matrix.')
    dynamical = serialized[:, ::2]
    bands = gamma['band']
    frequencies = np.asarray([band['frequency'] for band in bands])
    eigenvalues = np.sign(frequencies) * (frequencies / FREQUENCY_FACTOR)**2
    serialized_vectors = np.asarray([band['eigenvector'] for band in bands])
    if serialized_vectors.shape != (12, 4, 3, 2) or np.any(serialized_vectors[..., 1]):
        raise ValueError('Expected a complete real ZnO Γ eigensystem.')
    vectors = serialized_vectors[..., 0].reshape(12, 12).T
    eig_error = _residual(dynamical @ vectors - vectors * eigenvalues)
    if eig_error > TOLERANCE or _residual(vectors.T @ vectors - np.eye(12)) > TOLERANCE:
        raise ValueError('Archived eigenvectors and frequencies do not verify the Γ matrix.')

    unit_factor, dielectric, zinc, oxygen = [
        np.fromstring(line, sep=' ') for line in source['born'].splitlines()]
    # The two independent atoms represent both symmetry-related sites for each
    # element; these diagonal tensors are invariant under the site rotations.
    raw_born = np.array([zinc, zinc, oxygen, oxygen]).reshape(4, 3, 3)
    return (lattice, reciprocal, dynamical, frequencies, eigenvalues, vectors,
            eig_error, float(unit_factor[0]), dielectric.reshape(3, 3), raw_born)


def _unit_direction(value, coordinates, reciprocal):
    if not isinstance(value, list) or len(value) != 3 or any(
            type(x) not in (int, float) for x in value):
        raise ValueError('Choose a three-component numeric direction.')
    try:
        direction = np.asarray(value, dtype=float)
    except (OverflowError, ValueError):
        raise ValueError('Choose a finite direction.') from None
    if not np.all(np.isfinite(direction)) or not np.any(direction):
        raise ValueError('Choose a finite nonzero Γ approach direction.')
    # Scaling before converting the reciprocal basis avoids overflow and gives
    # the same unit direction for large or small scalar multiples of q.
    direction /= np.max(np.abs(direction))
    if coordinates == 'primitive-reciprocal':
        direction = direction @ reciprocal
    return direction / np.linalg.norm(direction)


def _mode_rows(frequencies, eigenvalues, vectors, parent_vectors, dipole):
    weights = np.abs(parent_vectors.T @ vectors)**2
    strengths = np.abs(dipole @ vectors)**2
    overlap_by_label = {}
    for _, label, bands in GROUPS:
        overlap_by_label[label] = overlap_by_label.get(label, 0) + np.sum(weights[bands], axis=0)
    overlap_by_label['other'] = np.zeros(len(frequencies))
    return [
        {'band': band, 'frequencyTHz': float(frequency),
         'eigenvalue': float(eigenvalues[band]),
         'longitudinalDipoleSquared': float(strengths[band]),
         'overlaps': {label: float(overlap[band]) for label, overlap in overlap_by_label.items()}}
        for band, frequency in enumerate(frequencies)
    ]


def run(payload):
    expected = {'qpoints', 'structure', 'born', 'direction', 'directionCoordinates', 'correction'}
    if not isinstance(payload, dict) or payload.keys() != expected:
        raise ValueError('Supply the three pinned ZnO sources, direction, coordinates and correction choice.')
    coords, correction = payload['directionCoordinates'], payload['correction']
    if coords not in ('cartesian', 'primitive-reciprocal'):
        raise ValueError('Direction coordinates must be Cartesian or primitive reciprocal.')
    if correction not in ('neutralized', 'raw', 'off'):
        raise ValueError('Correction must be neutralized, raw or off.')
    (lattice, reciprocal, dynamical, frequencies, eigenvalues, vectors,
     archive_error, unit_factor, dielectric, raw_born) = _source_data(payload)
    direction = _unit_direction(payload['direction'], coords, reciprocal)
    volume = float(abs(np.linalg.det(lattice)))
    screening = float(direction @ dielectric @ direction)
    neutral_born = raw_born - raw_born.mean(axis=0)
    born = raw_born if correction == 'raw' else neutral_born
    masses = np.asarray(MASSES)
    dipole = (direction @ born / np.sqrt(masses)[:, None]).ravel()
    change = np.outer(dipole, dipole) * (4 * math.pi * unit_factor / volume / screening)
    if correction == 'off':
        change = np.zeros_like(dynamical)
        corrected_values, corrected_vectors, corrected_freq = eigenvalues, vectors, frequencies
    else:
        corrected_values, corrected_vectors = np.linalg.eigh(dynamical + change)
        corrected_freq = np.sign(corrected_values) * np.sqrt(np.abs(corrected_values)) * FREQUENCY_FACTOR

    cartesian_translations = np.vstack([math.sqrt(m) * np.eye(3) for m in masses]) / math.sqrt(sum(masses))
    corrected_matrix = dynamical + change
    correction_spectrum = np.linalg.eigvalsh(change)
    eig_error = _residual(corrected_matrix @ corrected_vectors - corrected_vectors * corrected_values)
    translation_error = _residual(change @ cartesian_translations)
    checks = {
        'archiveEigenpairMaxResidual': archive_error,
        'correctedEigenpairMaxResidual': eig_error,
        'parentTranslationMaxResidual': _residual(dynamical @ cartesian_translations),
        'correctionTranslationMaxResidual': translation_error,
        'correctedTranslationMaxResidual': _residual(corrected_matrix @ cartesian_translations),
        'hermitianMaxResidual': _residual(corrected_matrix - corrected_matrix.T),
        'correctedOrthonormalityMaxResidual': _residual(corrected_vectors.T @ corrected_vectors - np.eye(12)),
        'correctionRank': int(np.count_nonzero(correction_spectrum > TOLERANCE)),
        'correctionMinEigenvalue': float(correction_spectrum[0]),
        'correctionMaxEigenvalue': float(correction_spectrum[-1]),
        'translationPreserved': translation_error <= TOLERANCE,
        'tolerance': TOLERANCE,
    }
    return {
        'schema': SCHEMA, 'action': ACTION,
        'source': {
            'id': 'phonopy-zno-derived-qpoints', 'revision': REVISION,
            'manifest': 'phonopy-zno-source.json', 'license': 'BSD-3-Clause',
            'licenseFile': 'phonopy-zno-LICENSE.txt', 'archiveNAC': False,
            'files': {key: {'file': filename, 'byteCount': size, 'sha256': digest}
                      for key, (filename, size, digest) in FILES.items()},
            'symbols': SYMBOLS.copy(), 'massesU': MASSES.copy(), 'latticeAngstrom': lattice.tolist(),
            'reciprocalBasisPerAngstrom': reciprocal.tolist(), 'primitiveVolumeAngstrom3': volume,
            'bornFactorEVAngstrom': unit_factor, 'frequencyFactorTHz': FREQUENCY_FACTOR,
        },
        'direction': {'input': payload['direction'].copy(), 'coordinates': coords,
                      'cartesianUnit': direction.tolist()},
        'correction': correction,
        'electrostatics': {
            'dielectric': dielectric.tolist(), 'screening': screening,
            'rawBornCharges': raw_born.tolist(), 'appliedBornCharges': born.tolist(),
            'rawBornChargeSum': raw_born.sum(axis=0).tolist(),
            'appliedBornChargeSum': born.sum(axis=0).tolist(),
            'dipoleConvention': 'raw' if correction == 'raw' else 'neutralized',
            'massWeightedLongitudinalCharges': dipole.reshape(4, 3).tolist(),
        },
        'baseline': {
            'modes': _mode_rows(frequencies, eigenvalues, vectors, vectors, dipole),
            'groups': [{'id': group, 'irrep': irrep, 'bands': indices.copy(),
                        'frequencyTHz': float(np.mean(frequencies[indices]))}
                       for group, irrep, indices in GROUPS],
        },
        'corrected': {'modes': _mode_rows(corrected_freq, corrected_values, corrected_vectors, vectors, dipole),
                      'deltaDynamicalMatrix': change.tolist()},
        'checks': checks,
    }
