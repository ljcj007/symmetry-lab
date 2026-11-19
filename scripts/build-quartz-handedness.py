"""Rebuild the two geometry controls from the retained COD 9005017 CIF."""

import argparse
from collections import Counter
from fractions import Fraction
from hashlib import sha1, sha256
import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist/data/examples/quartz-298k'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run
from structure_bc import export_poscar


def verify_source():
    metadata = json.loads((DATA / 'source.json').read_bytes())
    original = metadata['file']
    content = (DATA / original['name']).read_bytes()
    assert metadata['codId'] == 9005017 and metadata['codRevision'] == 291351
    assert len(content) == original['bytes']
    assert sha256(content).hexdigest() == original['sha256']
    git_blob = f'blob {len(content)}\0'.encode('ascii') + content
    assert sha1(git_blob).hexdigest() == original['gitBlobSha1']
    result = run('structure_bc', {'format': 'cif', 'text': content.decode('utf-8')})
    assert result['input_metadata']['declared_symmetry_operation_count'] == 6
    assert result['input_metadata']['source_tags']['_database_code_amcsd'] == metadata['amcsdId']
    assert any('original CIF to recover the full records' in warning for warning in result['warnings'])
    return result


def verify_case(result, group, hall, orientation, screw):
    assert result['verified']
    assert (result['group_number'], result['hall_number'], result['group_order']) == (group, hall, 6)
    assert Counter(result['input_cell']['species']) == {'Si': 3, 'O': 6}
    np.testing.assert_allclose(np.linalg.det(result['transform']['coordinate_matrix']), orientation, atol=1e-12, rtol=0)
    rotation = [[0, -1, 0], [1, -1, 0], [0, 0, 1]]
    operation = next(op for op in result['operations'] if op['rotation'] == rotation)
    np.testing.assert_allclose(operation['translation'], [0, 0, float(screw)], atol=1e-12, rtol=0)


def build_controls(check):
    original = verify_source()
    verify_case(original, 154, 443, 1, Fraction(2, 3))
    cell = original['input_cell']
    lattice = np.asarray(cell['lattice'])
    position = np.asarray(cell['positions'])
    inverse_lattice = np.linalg.inv(lattice)
    np.testing.assert_allclose(np.linalg.norm(lattice, axis=1), [4.9137, 4.9137, 5.4047], atol=1e-12, rtol=0)

    # Normalize only the written precision. The original CIF remains byte-exact.
    fraction = np.round(-position, 12) % 1
    reduced_lattice = np.round(lattice, 12)
    reduced_lattice[reduced_lattice == 0] = 0
    controls = (
        ('quartz-active-inversion.vasp', 'COD 9005017 teaching control: active inversion, L fixed',
         reduced_lattice, -1, 152, 441, 1, Fraction(1, 3)),
        ('quartz-passive-rebasis.vasp', 'COD 9005017 teaching control: passive rebasis, L and x negated',
         -reduced_lattice, 1, 154, 443, -1, Fraction(2, 3)),
    )
    outputs = {}
    for filename, title, basis, point_sign, group, hall, orientation, screw in controls:
        basis[basis == 0] = 0
        generated = export_poscar({'label':title, 'species':cell['species'],
                                   'lattice':basis.tolist(), 'positions':fraction.tolist()})
        result = run('structure_bc', {'format': 'poscar', 'text': generated})
        verify_case(result, group, hall, orientation, screw)
        converted = result['input_cell']
        assert converted['species'] == cell['species']
        displacement = (np.asarray(converted['positions']) @ np.asarray(converted['lattice'])
                        - point_sign * (position @ lattice)) @ inverse_lattice
        np.testing.assert_allclose(displacement, np.rint(displacement), atol=1e-11, rtol=0)
        outputs[DATA / filename] = generated.encode('utf-8')
    for path, raw in outputs.items():
        if check:
            assert path.read_bytes() == raw, f'Stale teaching control: {path.name}'
        else:
            path.write_bytes(raw)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    build_controls(args.check)
    print('COD 9005017 bytes, 9 atomic positions and both orientation controls verified.')
