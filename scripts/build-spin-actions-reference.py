"""Rebuild teaching operation fixtures using the actual shared browser API."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from browser_api import run

# Cross-platform reference files include libm-dependent display previews. Exact
# algebra, JSON types/shape/order, source hashes and original input stay strict.
# This tolerance applies only to non-input float leaves, never exact strings.
REFERENCE_FLOAT_REL_TOL = 1e-13
REFERENCE_FLOAT_ABS_TOL = 1e-13


def same_reference(actual, expected, path='fixture', strict_input=False):
    if type(actual) is not type(expected):
        raise AssertionError(path+': JSON type differs')
    if isinstance(actual, dict):
        if list(actual) != list(expected):
            raise AssertionError(path+': keys/order differ')
        for key in actual:
            same_reference(actual[key], expected[key], path+'.'+key, strict_input or key == 'input')
    elif isinstance(actual, list):
        if len(actual) != len(expected):
            raise AssertionError(path+': array length differs')
        for index, (left, right) in enumerate(zip(actual, expected)):
            same_reference(left, right, path+'['+str(index)+']', strict_input)
    elif type(actual) is float:
        if not math.isfinite(actual) or not math.isfinite(expected):
            raise AssertionError(path+': non-finite preview')
        if strict_input:
            if struct.pack('!d', actual) != struct.pack('!d', expected):
                raise AssertionError(path+': original input float differs')
        elif not math.isclose(actual, expected, rel_tol=REFERENCE_FLOAT_REL_TOL, abs_tol=REFERENCE_FLOAT_ABS_TOL):
            raise AssertionError(path+': numeric preview differs beyond rtol=atol=1e-13')
    elif actual != expected:
        raise AssertionError(path+': exact value differs')


def cases():
    rows = []
    def add(identifier, experiment, **parameters):
        rows.append({'id': identifier, 'input': {'lab': 'spin_actions', 'experiment': experiment, **parameters}})
    for preset in ('plus', 'circular', 'up', 'generic'):
        add('color-'+preset, 'color_theta', statePreset=preset)
    add('color-custom', 'color_theta', statePreset='custom', state=[['1/3', '2/3'], ['-1/2', '1/4']], scalar=['2/3', '1/5'])
    add('color-phase-i', 'color_theta', statePreset='plus', operatorPhase=[0, 1])
    add('color-phase-complex', 'color_theta', statePreset='generic', scalar=[0, 1], operatorPhase=[3, 4])
    add('color-real-scalar', 'color_theta', statePreset='up', scalar=[2, 0])
    for operation in ('identity', 'plane_xy', 'plane_xz', 'time_reversal'):
        add('triangular-'+operation, 'spin_stabilizer', momentPreset='triangular', operationPreset=operation)
    for angle in (0, 30, 45, 60, 90, 120, 180):
        add('collinear-rotation-'+str(angle), 'spin_stabilizer', momentPreset='collinear', operationPreset='rotation_z', angle=angle)
    add('triangular-rotation-120', 'spin_stabilizer', momentPreset='triangular', operationPreset='rotation_z', angle=120)
    add('collinear-plane-xz', 'spin_stabilizer', momentPreset='collinear', operationPreset='plane_xz')
    add('collinear-plane-xy', 'spin_stabilizer', momentPreset='collinear', operationPreset='plane_xy')
    add('zero-time-reversal', 'spin_stabilizer', momentPreset='zero', operationPreset='time_reversal')
    add('noncoplanar-plane-xy', 'spin_stabilizer', momentPreset='noncoplanar', operationPreset='plane_xy')
    add('noncoplanar-identity', 'spin_stabilizer', momentPreset='noncoplanar', operationPreset='identity')
    tilted = [['-7/9', '4/9', '4/9'], ['4/9', '-1/9', '8/9'], ['4/9', '8/9', '-1/9']]
    mirror = [['7/9', '-4/9', '-4/9'], ['-4/9', '1/9', '-8/9'], ['-4/9', '-8/9', '1/9']]
    add('custom-tilted-collinear', 'spin_stabilizer', momentPreset='custom', moments=[[1, 2, 2], [-2, -4, -4]], operationPreset='custom', operation=tilted)
    add('custom-tilted-plane', 'spin_stabilizer', momentPreset='custom', moments=[[2, -1, 0], [2, 0, -1]], operationPreset='custom', operation=mirror)
    add('custom-tiny-noncoplanar', 'spin_stabilizer', momentPreset='custom', moments=[[1, 0, 0], [0, 1, 0], [0, 0, '1/1000000000000']], operationPreset='identity')
    for preset in ('c2_point', 'af_space', 'triangular_point', 'helix3_space'):
        add('soc-'+preset, 'soc_locking', modelPreset=preset)
    sites = [{'id': 'left', 'species': 'X', 'position': [-1, 0, 0], 'moment': [0, 0, 1]},
             {'id': 'right', 'species': 'X', 'position': [1, 0, 0], 'moment': [0, 0, 1]}]
    add('soc-custom-inversion', 'soc_locking', modelPreset='custom', sites=sites, rotation=[[-1, 0, 0], [0, -1, 0], [0, 0, -1]])
    add('soc-custom-chemical-counterexample', 'soc_locking', modelPreset='custom', sites=[sites[0], {**sites[1], 'species': 'Y'}], rotation=[[-1, 0, 0], [0, -1, 0], [0, 0, 1]])
    return rows


def build(check=False):
    rows = cases()
    for row in rows:
        row['result'] = run('teaching_labs', row['input'])
        if not all(check['passed'] for check in row['result']['checks']):
            raise AssertionError('Internal exact identity failed: '+row['id'])
    files = ['dist/python/spin_actions_lab.py', 'dist/python/teaching_labs.py',
             'dist/python/group_extensions.py', 'dist/python/browser_api.py']
    output = {'schema': 'symmetry-lab-spin-actions-fixture-1',
        'method': 'Actual browser_api.run teaching_labs on this host, not manufactured UI trace data.',
        'sourceHashes': {name: hashlib.sha256((ROOT/name).read_text(encoding='utf8').encode('utf8')).hexdigest() for name in files},
        'cases': rows, 'legacyCases': []}
    for lab, preset, steps in [('color_group', 'c3_point', 3), ('spin_group', 'c2_point', 4),
                              ('spin_group', 'af_space', 4), ('spin_group', 'triangular_point', 3),
                              ('spin_group', 'helix3_space', 3)]:
        payload = {'lab': lab, 'preset': preset, 'steps': steps, 'variant': 'combined'}
        output['legacyCases'].append({'id': lab+'-'+preset, 'input': payload, 'result': run('teaching_labs', payload)})
    path = ROOT/'scripts/fixtures/spin-actions.json'
    if check:
        same_reference(output, json.loads(path.read_text(encoding='utf8')))
    else:
        path.write_text(json.dumps(output, ensure_ascii=False, allow_nan=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'path': str(path), 'cases': len(rows), 'bytes': path.stat().st_size, 'checked': check}))
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
