"""Rebuild the fixed ZnO Gamma optical-mode dipole projection lesson.

By default the JSON is written in dist/data/examples under the checkout.
Use --site-root and --output to select other locations. --check checks the archived source, all
scientific controls and exact JSON bytes without writing files.

The public phonon_modes API verifies the frequency clusters. The archived
Gamma eigenpairs are read with NAC off. The original BORN tensors are used
only for their dipole derivatives. This procedure does not change frequencies,
apply dielectric corrections or calculate an absorption spectrum.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np
import spglib
import yaml


SCHEMA = 'symmetry-lab.zno-ir-polarization.v1'
REFERENCE = 'phonopy-zno-derived-qpoints'
REPOSITORY = 'https://github.com/phonopy/phonopy'
REVISION = '0937453a793eb504f674b7d4fd98421d508008e6'
FILES = {
    'qpoints': {'file': 'phonopy-zno-qpoints.yaml', 'byteCount': 55277,
                'sha256': '37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5'},
    'structure': {'file': 'phonopy-zno-structure.yaml', 'byteCount': 7641,
                  'sha256': '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c',
                  'upstreamPath': 'example/ZnO/phonopy_disp.yaml'},
    'born': {'file': 'phonopy-zno-BORN', 'byteCount': 112,
             'sha256': '902118e6b31c9046c0b22eadac279e079563d2386e675a88409443923ee5063e',
             'upstreamPath': 'example/ZnO/BORN'},
    'license': {'file': 'phonopy-zno-LICENSE.txt', 'byteCount': 1470,
                'sha256': '2ce26839c8b70d28765d73e934cc1a979d896d8d228d30694fdd9a92e94d43a9',
                'upstreamPath': 'LICENSE', 'id': 'BSD-3-Clause'},
}
SETTINGS = {
    'qIndex': 0, 'q': [0, 0, 0], 'spaceGroup': 186, 'pointGroup': '6mm',
    'frequencyUnit': 'THz', 'projectionUnit': 'e^2/u', 'frequencyTolerance': 1e-5,
    'symprec': 1e-5, 'clusterScope': 'selected-optical-clusters',
}
GROUPS = (
    ('a1', 'A1', [6], 10.5812002046, 1, 1),
    ('e1', 'E1', [7, 8], 11.1800464020, 1, 0),
    ('e2-low', 'E2', [3, 4], 2.7188476210, -1, 0),
    ('e2-high', 'E2', [9, 10], 12.0685925431, -1, 0),
)
TOLERANCE = 1e-9


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_sources(examples):
    manifest = json.loads((examples / 'phonopy-zno-source.json').read_bytes())
    require(manifest['id'] == REFERENCE and manifest['repository'] == REPOSITORY
            and manifest['commit'] == REVISION and manifest['license'] == FILES['license']['id']
            and manifest['generator']['settings']['is_nac'] is False
            and manifest['exampleEntryFrequencyUnitChoice'] == SETTINGS['frequencyUnit'],
            'The ZnO source must be the recorded BSD-licensed no-NAC postprocessing result.')
    originals = {record['path']: record for record in manifest['inputs']}
    for key in ('structure', 'born'):
        record = FILES[key]
        original = originals[record['upstreamPath']]
        require(original['localFile'] == record['file'] and original['sha256'] == record['sha256']
                and original['bytes'] == record['byteCount'], f'The {key} record does not match Phonopy provenance.')
    require(originals[FILES['born']['upstreamPath']]['usedForGeneration'] is False,
            'BORN must have been absent from the archived dynamical-matrix postprocessing.')

    raw = {}
    for key, record in FILES.items():
        data = (examples / record['file']).read_bytes()
        require(len(data) == record['byteCount'] and hashlib.sha256(data).hexdigest() == record['sha256'],
                f'{record["file"]} does not match the pinned source bytes.')
        raw[key] = data.decode('utf-8')
    return raw


def rounded(value):
    return round(float(value), 12) or 0.0


def matrix_rows(matrix):
    return [[rounded(x) for x in row] for row in matrix]


def gamma_modes(sources, run):
    result = run('phonon_modes', {
        'content': sources['qpoints'], 'structure_content': sources['structure'],
        'filename': FILES['qpoints']['file'], 'frequency_unit': SETTINGS['frequencyUnit'],
        'selected_q': SETTINGS['qIndex'], 'selected_band': 6, 'symprec': SETTINGS['symprec'],
        'frequency_tolerance': SETTINGS['frequencyTolerance'], 'amplitude': 0,
    })
    require(result['selection']['q'] == SETTINGS['q'] and result['selection']['qIndex'] == SETTINGS['qIndex']
            and result['frequencyUnit'] == SETTINGS['frequencyUnit']
            and result['symmetry']['spaceGroup'] == SETTINGS['spaceGroup']
            and result['symmetry']['pointGroup'] == SETTINGS['pointGroup']
            and result['symmetry']['operationCount'] == 12 and result['symmetry']['primitiveCell'],
            'Expected the no-NAC ZnO primitive Gamma point and space group 186.')
    return result


def source_geometry(mode_result, born_text):
    structure = mode_result['structure']
    atoms = structure['atoms']
    symbols = [atom['symbol'] for atom in atoms]
    masses = [atom['mass'] for atom in atoms]
    require(symbols == ['Zn', 'Zn', 'O', 'O'] and masses == [65.38, 65.38, 15.9994, 15.9994],
            'The BORN teaching fixture is only defined for the pinned Zn/Zn/O/O atom order and masses.')

    # Infer the independent-site representatives using the same crystal data.
    lattice = np.asarray(structure['lattice'])
    cell = (lattice, [a['coordinates'] for a in atoms], [30, 30, 8, 8])
    space_group = spglib.get_symmetry_dataset(cell, symprec=SETTINGS['symprec'])
    require(space_group is not None and space_group.number == SETTINGS['spaceGroup'], 'Unexpected space group.')
    representatives = space_group.equivalent_atoms.tolist()
    require(representatives == [0, 0, 2, 2], 'The BORN independent-site assignment changed.')
    independent = sorted(set(representatives))
    mapping = [independent.index(i) for i in representatives]

    # The pinned four-line BORN file contains its NAC factor and dielectric
    # tensor first. The following two Cartesian tensors belong to atoms 0, 2.
    lines = born_text.splitlines()
    require(len(lines) == 4 and len(lines[0].split()) == 1 and all(len(x.split()) == 9 for x in lines[1:]),
            'Expected the exact independent-atom BORN format for this ZnO record.')
    tensors = np.array([[float(s) for s in line.split()] for line in lines[2:]]).reshape(2, 3, 3)
    charge_sum = tensors[mapping].sum(axis=0)
    np.testing.assert_allclose(charge_sum, np.diag([-.06026, -.06026, .04764]), atol=TOLERANCE, rtol=0)

    # Every operation preserves these two axial diagonal tensors, so equivalent
    # sites receive the exact same tensor after Cartesian tensor transport.
    c6, vertical_mirrors = [], []
    for i, rotation in enumerate(space_group.rotations):
        cart = lattice.T @ rotation @ np.linalg.inv(lattice.T)
        for tensor in tensors:
            np.testing.assert_allclose(cart @ tensor @ cart.T, tensor, atol=TOLERANCE, rtol=0)
        determinant = round(np.linalg.det(rotation))
        if determinant == 1 and np.trace(rotation) == 2:
            c6.append(i)
        if determinant == -1:
            vertical_mirrors.append(i)
    require(len(c6) == 2 and len(vertical_mirrors) == 6, 'Expected C6v rotations and vertical mirrors.')
    primitive = {
        'symbols': symbols, 'masses': masses, 'independentAtomIndices': independent,
        'bornRowForAtom': mapping, 'independentBornTensors': [matrix_rows(t) for t in tensors],
        'bornChargeSum': matrix_rows(charge_sum),
    }
    charge_map = np.column_stack([tensor / math.sqrt(m) for tensor, m in zip(tensors[mapping], masses)])
    return primitive, charge_map, c6, vertical_mirrors


def projection_groups(sources, modes, charge_map, c6, mirrors):
    raw = yaml.safe_load(sources['qpoints'])['phonon'][SETTINGS['qIndex']]
    require(raw['q-position'] == SETTINGS['q'], 'Wrong q point in the exact input.')
    groups = []
    for name, label, bands, frequency, c6_char, mirror_char in GROUPS:
        cluster, = (item for item in modes['modeGroups'] if item['bands'] == bands)
        require(cluster['frequencies'] == [frequency] * len(bands), f'{name} has unexpected frequencies.')
        classification = cluster['classification']
        require(classification['status'] == 'characters-only' and classification['invarianceError'] <= TOLERANCE,
                f'{name} is not closed under the recorded parent point group.')
        characters = np.asarray(classification['operationCharacters'])
        np.testing.assert_allclose(characters[c6], [[c6_char, 0]] * 2, atol=TOLERANCE, rtol=0)
        np.testing.assert_allclose(characters[mirrors], [[mirror_char, 0]] * 6, atol=TOLERANCE, rtol=0)

        values = np.array([raw['band'][i]['eigenvector'] for i in bands])
        vectors = (values[..., 0] + 1j * values[..., 1]).reshape(len(bands), 12).T
        # Preserve each archived column's phase by dividing by its positive norm.
        vectors /= np.linalg.norm(vectors, axis=0)
        np.testing.assert_allclose(vectors.conj().T @ vectors, np.eye(len(bands)), atol=TOLERANCE, rtol=0)
        require(not np.any(vectors.imag), 'The archived Gamma vectors are expected to be real here.')
        projector = vectors @ vectors.conj().T
        np.testing.assert_allclose(projector @ projector, projector, atol=TOLERANCE, rtol=0)

        dipoles = charge_map @ vectors.real
        tensor = dipoles @ dipoles.T
        np.testing.assert_allclose(tensor, charge_map @ projector @ charge_map.T, atol=TOLERANCE, rtol=0)
        groups.append({'id': name, 'label': label, 'bands': bands, 'frequency': frequency,
                       'classification': {'dimension': len(bands), 'c6Characters': [c6_char] * 2,
                                          'mirrorCharacters': [mirror_char] * 6,
                                          'closureError': rounded(classification['invarianceError'])},
                       'modeDipoles': matrix_rows(dipoles), 'projectionTensor': matrix_rows(tensor)})
    return groups


def verify_projections(groups):
    a1, e1, *e2 = groups
    a1_tensor, e1_tensor = np.asarray(a1['projectionTensor']), np.asarray(e1['projectionTensor'])
    np.testing.assert_allclose(a1_tensor, np.diag([0, 0, .706252822948]), atol=TOLERANCE, rtol=0)
    np.testing.assert_allclose(e1_tensor, np.diag([.715033618280, .715033618280, 0]), atol=TOLERANCE, rtol=0)
    for group in e2:
        np.testing.assert_allclose(group['modeDipoles'], 0, atol=1e-12, rtol=0)
        np.testing.assert_allclose(group['projectionTensor'], 0, atol=1e-12, rtol=0)

    polarization = np.array([1, 0, 1]) / math.sqrt(2)
    a1_tilt = polarization @ a1_tensor @ polarization
    e1_tilt = polarization @ e1_tensor @ polarization
    np.testing.assert_allclose([a1_tilt, e1_tilt], [.353126411474, .357516809140], atol=TOLERANCE, rtol=0)

    angle = math.pi / 5
    c, s = math.cos(angle), math.sin(angle)
    original = np.asarray(e1['modeDipoles'])
    mixed = original @ np.array([[c, -s], [s, c]])
    before, after = original[0] ** 2, mixed[0] ** 2
    np.testing.assert_allclose(before, [.711465895195, .003567723085], atol=TOLERANCE, rtol=0)
    np.testing.assert_allclose(after, [.514808913342, .200224704938], atol=TOLERANCE, rtol=0)
    np.testing.assert_allclose(mixed @ mixed.T, e1_tensor, atol=TOLERANCE, rtol=0)
    return {'tolerance': TOLERANCE,
            'tiltedPolarization': {'direction': [rounded(x) for x in polarization],
                                  'a1': rounded(a1_tilt), 'e1': rounded(e1_tilt)},
            'e1BasisRotation': {'radians': angle, 'direction': [1, 0, 0],
                                'perModeBefore': [rounded(x) for x in before],
                                'perModeAfter': [rounded(x) for x in after],
                                'sum': rounded(np.sum(before))}}


def build_fixture(site_root):
    sys.path.insert(0, str(site_root / 'dist/python'))
    from browser_api import run

    sources = read_sources(site_root / 'dist/data/examples')
    modes = gamma_modes(sources, run)
    primitive, charge_map, c6, mirrors = source_geometry(modes, sources['born'])
    groups = projection_groups(sources, modes, charge_map, c6, mirrors)
    return {'schema': SCHEMA,
            'source': {'referenceId': REFERENCE, 'repository': REPOSITORY, 'commit': REVISION,
                       'manifest': 'phonopy-zno-source.json', **FILES, 'nonAnalyticCorrection': False},
            'settings': SETTINGS, 'primitive': primitive, 'groups': groups, 'checks': verify_projections(groups)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    site_root = args.site_root.resolve()
    output = args.output or site_root / 'dist/data/examples/zno-ir-polarization.json'
    fixture = build_fixture(site_root)
    encoded = (json.dumps(fixture, indent=2, allow_nan=False) + '\n').encode('ascii')
    if args.check:
        require(output.read_bytes() == encoded, f'{output} differs from the pinned source and checked projection.')
    else:
        output.write_bytes(encoded)
    print('ZnO Gamma: verified pinned inputs, Born tensor mapping, optical projector, polarization and E1 basis rotation.')


if __name__ == '__main__':
    main()
