"""Real-wavefunction fault injection: valid local parity algebra, wrong binding.

Use the physical C4z x inversion subgroup at Gamma and H. Negating inversion
is a group character twist. It preserves the local algebra while changing the
assignment of parity to the unchanged physical wavefunctions.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys
import numpy as np

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE/'fe'))
import analyze_fe as fe


def inverse_image(item):
    g = item['gvectors']
    shift = fe.integral(-2*np.asarray(item['k']))
    target = -g + shift
    lookup = {tuple(row): i for i, row in enumerate(g)}
    mapping = np.array([lookup.get(tuple(row), -1) for row in target])
    if np.any(mapping < 0):
        raise ValueError('Inversion is not closed on the saved plane-wave set')
    raw = item['waves'].transpose(1, 2, 0)
    image = np.zeros_like(raw)
    image[:, mapping, :] = raw  # inversion acts trivially on axial spin
    return image.reshape(-1, raw.shape[-1])


def local_residuals(c4, parity):
    eye = np.eye(len(c4))
    return {'C4_fourth_minus_identity': fe.norm(np.linalg.matrix_power(c4, 4)+eye, len(c4)),
            'inversion_square': fe.norm(parity@parity-eye, len(c4)),
            'commutation': fe.norm(c4@parity-parity@c4, len(c4)),
            'C4_unitarity': fe.norm(c4.conj().T@c4-eye, len(c4)),
            'inversion_unitarity': fe.norm(parity.conj().T@parity-eye, len(c4))}


def joint_counts(c4, parity):
    result = []
    for phase, alpha in zip(fe.PHASE_EIGHTHS, fe.ROOTS):
        for sign in (1, -1):
            count = sum(alpha**(-j)*np.trace(np.linalg.matrix_power(c4,j) @
                        (np.eye(len(c4))+sign*parity)) for j in range(4))/8
            rounded = int(np.rint(count.real))
            if abs(count-rounded) > 1e-5 or rounded < 0:
                raise ValueError('Joint character counts unresolved numerically')
            result.append({'C4_phase_eighths': phase, 'inversion': sign, 'multiplicity': rounded})
    assert sum(r['multiplicity'] for r in result) == len(c4)
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--save', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    save = args.save.resolve()
    metadata, blocks, lattice, alat = fe.read_metadata(save)
    _, reciprocal, _ = fe.c4_conventions(lattice)
    records = []
    for index, block in enumerate(blocks, 1):
        q = fe.reader.floats(block.find('k_point').text) @ lattice.T / alat
        if not (np.max(abs(q)) < 1e-9 or np.max(abs(q-0.5)) < 1e-9):
            continue
        path = save/f'wfc{index}.dat'
        item = fe.reader.read_wfc(path); item['k'] = q
        raw, c4_image, _, _ = fe.rotate_frame(item, reciprocal)
        inversion_image = inverse_image(item)
        frame = raw[:, :18]
        c4 = frame.conj().T @ c4_image[:, :18]
        physical = frame.conj().T @ inversion_image[:, :18]
        forged = -physical
        energies = fe.reader.floats(block.findtext('eigenvalues'))*fe.HARTREE_EV
        outer_gap = float(energies[18]-energies[17])
        energy_differences = energies[:18,None]-energies[None,:18]
        energy_errors = {name: fe.norm(energy_differences*matrix, 18)
                         for name, matrix in [('C4',c4),('inversion',physical),('forged_inversion',forged)]}
        assert outer_gap > 1e-3 and max(energy_errors.values()) < 2e-4
        residuals = {'physical': local_residuals(c4, physical), 'forged': local_residuals(c4, forged)}
        assert max(x for row in residuals.values() for x in row.values()) < 2e-6
        actual_binding = fe.norm(inversion_image[:, :18]-frame@physical, 18)
        wrong_binding = fe.norm(inversion_image[:, :18]-frame@forged, 18)
        assert actual_binding < 2e-6 and wrong_binding > 1.9
        actual_counts, false_counts = joint_counts(c4, physical), joint_counts(c4, forged)
        assert actual_counts != false_counts
        generator = np.random.default_rng(1642+index)
        unitary, _ = np.linalg.qr(generator.normal(size=(18,18))+1j*generator.normal(size=(18,18)))
        moved = fe.norm(inversion_image[:, :18]@unitary-frame@unitary@(unitary.conj().T@forged@unitary), 18)
        assert abs(moved-wrong_binding) < 1e-12
        records.append({'k_fractional': q.tolist(), 'wavefunction_sha256': fe.sha(path),
                        'local_algebra': residuals, 'physical_joint_counts': actual_counts,
                        'outer_gap_eV': outer_gap, 'energy_covariance_residuals_eV': energy_errors,
                        'forged_joint_counts': false_counts, 'physical_binding_residual': actual_binding,
                        'forged_binding_residual': wrong_binding,
                        'complex_gauge_forged_binding_residual': moved,
                        'local_check_of_both': 'PASS_NUMERICALLY',
                        'raw_source_binding_physical': 'PASS_NUMERICALLY',
                        'raw_source_binding_forged': 'REJECTED_NUMERICALLY'})
    assert len(records) == 2
    report = {'status': 'PASS', 'source': str(save), 'metadata': metadata, 'records': records,
              'scope': 'Two actual Fe endpoint wavefunctions, C4z x inversion unitary subgroup; no claim of an external-tool failure',
              'fault': 'Multiply inversion by -1 while retaining the physical operation and raw wavefunctions',
              'matrix_repair_or_interpolation': False, 'new_DFT_launched': False,
              'source_sha256': {p.name: fe.sha(p) for p in (Path(__file__), Path(fe.__file__), fe.PARSER)}}
    fe.write_json(args.output, report)
    print(json.dumps({'status': report['status'], 'endpoints': len(records),
                      'wrong_binding_residuals': [r['forged_binding_residual'] for r in records]}))


if __name__ == '__main__':
    main()
