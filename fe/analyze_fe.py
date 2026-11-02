"""Streaming, raw-wavefunction C4z and band-18/19 diagnostics for QE Fe.

Only the Phase 9 binary parser is reused (and hashed). No producer symmetry
matrices, repaired matrices, interpolated Hamiltonian, or rounded coefficients
enter this calculation. All labels are floating-point numerical assignments.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import importlib.util
import json
import sys
import xml.etree.ElementTree as ET
import numpy as np
from source_data import EXPECTED_PSP_SHA256, source_directory

HERE = Path(__file__).resolve().parent
PHASE9 = HERE.parents[1] / 'phase9'
PARSER = HERE / 'vendor/qe_reader.py'
spec = importlib.util.spec_from_file_location('phase13_fe_qe_reader', PARSER)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
HARTREE_EV = 27.211386245988
PHASE_EIGHTHS = [7, 1, 3, 5]
ROOTS = np.exp(1j * np.pi * np.array(PHASE_EIGHTHS) / 4)
RZ = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]], dtype=int)
SZ = np.diag(np.exp(np.array([-1, 1]) * 1j * np.pi / 4))
TOL = {'symmetry': 2e-6, 'gram': 2e-6, 'integer': 1e-5,
       'cluster_eV': 1e-5, 'prefix_gap_eV': 1e-3, 'energy_covariance_eV': 2e-4}


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n', encoding='utf-8')


def norm(a, rank=1):
    return float(np.linalg.norm(a) / np.sqrt(rank))


def integral(a):
    a = np.asarray(a)
    if not np.isfinite(a).all() or np.max(abs(a-np.rint(a))) > 1e-10:
        raise ValueError('Nonintegral reciprocal/lattice action')
    return np.rint(a).astype(int)


def pseudopotential_identity(data):
    raw = hashlib.sha256(data).hexdigest()
    canonical = hashlib.sha256(data.replace(b'\r\n', b'\n')).hexdigest()
    if canonical != EXPECTED_PSP_SHA256:
        raise ValueError('Pseudopotential differs from the pinned Fe baseline')
    return {'raw_sha256': raw, 'LF_sha256': canonical, 'CRLF_only_normalization': raw != canonical}


def c4_conventions(lattice):
    """Rows of A are real basis vectors; q is a fractional column.

    Active rotation: R=A^-T Rcart A^T; q'=R^-T q, and the spinor lift
    exp(-i*pi*sigma_z/4) rotates the spin actively with the same Rcart.
    """
    a = np.asarray(lattice, float)
    rotation = integral(np.linalg.inv(a.T) @ RZ @ a.T)
    reciprocal = integral(np.linalg.inv(rotation).T)
    pauli = [np.array([[0, 1], [1, 0]]), np.array([[0, -1j], [1j, 0]]),
             np.diag([1, -1])]
    spin_error = max(norm(SZ @ pauli[j] @ SZ.conj().T -
                         sum(RZ[i, j]*pauli[i] for i in range(3))) for j in range(3))
    if spin_error > 1e-12 or norm(np.linalg.matrix_power(SZ, 4)+np.eye(2)) > 1e-12:
        raise ValueError('Spin lift and active Cartesian rotation disagree')
    return rotation, reciprocal, spin_error


def path_audit(lattice):
    a = np.asarray(lattice, float)
    b = 2*np.pi*np.linalg.inv(a).T
    rotation, reciprocal, spin_error = c4_conventions(a)
    h = np.full(3, 0.5)
    h_win = np.array([0.5, -0.5, -0.5])
    tangent = np.ones(3)
    if np.max(abs(reciprocal @ tangent - tangent)) > 1e-12:
        raise ValueError('Requested path is not pointwise C4z invariant')
    return {'active_cartesian_rotation': RZ.tolist(), 'fractional_rotation': rotation.tolist(),
            'reciprocal_action': reciprocal.tolist(), 'spin_lift_diagonal_phase_eighths': [-1, 1],
            'eigenvalue_phase_eighths': PHASE_EIGHTHS, 'spin_axial_residual': spin_error,
            'path': 'q(t)=(t,t,t), 0<=t<=1/2; q in primitive reciprocal coordinates',
            'target_H_fractional': h.tolist(), 'target_H_cartesian_inverse_bohr': (h@b).tolist(),
            'source_win_H_fractional': h_win.tolist(),
            'source_win_H_cartesian_inverse_bohr': (h_win@b).tolist(),
            'H_endpoint_reciprocal_offset': integral(h_win-h).tolist(),
            'same_endpoint_mod_reciprocal_lattice': True,
            'same_Gamma_to_H_path': False,
            'warning': 'The source Fe.win follows Cartesian x, whereas the C4z obstruction follows Cartesian z.'}


def rotate_frame(point, reciprocal):
    q = np.asarray(point['k'])
    shift = integral(reciprocal @ q - q)
    g = point['gvectors']
    mapped = g @ reciprocal.T + shift
    lookup = {tuple(row): i for i, row in enumerate(g)}
    destination = np.array([lookup.get(tuple(row), -1) for row in mapped])
    present = destination >= 0
    raw = point['waves'].transpose(1, 2, 0)  # spin, G, band
    rotated = np.einsum('ab,bgn->agn', SZ, raw)
    image = np.zeros_like(raw)
    image[:, destination[present], :] = rotated[:, present, :]
    missing_per_band = np.linalg.norm(rotated[:, ~present, :], axis=(0, 1))
    return raw.reshape(-1, raw.shape[-1]), image.reshape(-1, raw.shape[-1]), missing_per_band, shift


def assign_block(frame, image, missing, tolerance=TOL):
    n = frame.shape[1]
    d = frame.conj().T @ image
    gram = norm(frame.conj().T @ frame-np.eye(n), n)
    leakage = float(np.hypot(norm(image-frame@d, n), np.linalg.norm(missing)/np.sqrt(n)))
    unitary = norm(d.conj().T@d-np.eye(n), n)
    fourth = norm(np.linalg.matrix_power(d, 4)+np.eye(n), n)
    traces = np.array([n, *[np.trace(np.linalg.matrix_power(d, j)) for j in (1, 2, 3)]])
    chars = ROOTS[:, None] ** np.arange(4)[None, :]
    counts = chars.conj() @ traces / 4
    rounded = np.rint(counts.real).astype(int)
    error = float(np.max(abs(counts-rounded)))
    resolved = (gram <= tolerance['gram'] and leakage <= tolerance['symmetry'] and
                unitary <= tolerance['symmetry'] and fourth <= tolerance['symmetry'] and
                error <= tolerance['integer'] and np.all(rounded >= 0) and rounded.sum() == n)
    return {'status': 'ASSIGNED_NUMERICALLY' if resolved else 'UNRESOLVED',
            'rank': n, 'phase_eighths': PHASE_EIGHTHS,
            'multiplicities': rounded.tolist() if resolved else None,
            'measured_multiplicities': [[float(z.real), float(z.imag)] for z in counts],
            'raw_gram_error': gram, 'subspace_leakage': leakage,
            'unitarity_error': unitary, 'spinful_fourth_power_error': fourth,
            'distance_to_integer': error}


def analyze_frame(energies, frame, image, missing=None, rank=18, tolerance=TOL):
    energies = np.asarray(energies, float)
    frame, image = np.asarray(frame, complex), np.asarray(image, complex)
    n = len(energies)
    if n <= rank or frame.shape != image.shape or frame.shape[1] != n:
        raise ValueError('Need matching full frames and at least rank+1 bands')
    if not (np.isfinite(energies).all() and np.isfinite(frame).all() and np.isfinite(image).all()):
        raise ValueError('Nonfinite input')
    if np.min(np.diff(energies)) < -1e-9:
        raise ValueError('Energies are not in ascending band order')
    missing = np.zeros(n) if missing is None else np.asarray(missing, float)
    if missing.shape != (n,) or not np.isfinite(missing).all() or np.any(missing < 0):
        raise ValueError('Invalid missing-plane-wave norms')
    boundaries = [0, *list(np.where(np.diff(energies) > tolerance['cluster_eV'])[0]+1), n]
    clusters = []
    for start, stop in zip(boundaries[:-1], boundaries[1:]):
        if start > rank:
            break  # Only the low-energy prefix and its first external cluster matter.
        assignment = assign_block(frame[:, start:stop], image[:, start:stop], missing[start:stop], tolerance)
        assignment.update({'band_start_one_based': int(start+1), 'band_stop_one_based': int(stop),
                           'energy_range_eV': [float(energies[start]), float(energies[stop-1])],
                           'touches_truncated_upper_window': bool(stop == n)})
        if stop == n:
            assignment['status'] = 'UNRESOLVED_UPPER_WINDOW'
            assignment['multiplicities'] = None
        clusters.append(assignment)
    prefix = assign_block(frame[:, :rank], image[:, :rank], missing[:rank], tolerance)
    gap = float(energies[rank]-energies[rank-1])
    if gap <= tolerance['prefix_gap_eV']:
        prefix['status'] = 'UNRESOLVED_SMALL_OR_CLOSED_OUTER_GAP'
        prefix['multiplicities'] = None
    d = frame.conj().T @ image
    critical = min(n, next(c['band_stop_one_based'] for c in clusters if c['band_stop_one_based'] >= rank+1))
    covariance = norm(((energies[:, None]-energies[None, :])*d)[:, :critical], critical)
    if covariance > tolerance['energy_covariance_eV']:
        prefix['status'] = 'UNRESOLVED_ENERGY_COVARIANCE'
        prefix['multiplicities'] = None
    return {'energies_eV': energies.tolist(), 'delta18_eV' if rank == 18 else 'outer_gap_eV': gap,
            'prefix_rank': rank, 'prefix': prefix, 'energy_covariance_eV': covariance,
            'clusters': clusters, 'minimum_critical_cluster_leakage': min(c['subspace_leakage'] for c in clusters),
            'no_per_band_label_inside_a_degenerate_cluster': True}


def read_metadata(save):
    save = Path(save)
    xml = ET.parse(save/'data-file-schema.xml').getroot()
    if xml.attrib.get('Units') != 'Hartree atomic units':
        raise ValueError('Expected QE Hartree atomic-unit schema')
    structure = xml.find('output/atomic_structure')
    lattice = np.array([reader.floats(structure.findtext(f'cell/a{i}')) for i in (1, 2, 3)])
    alat = float(structure.attrib['alat'])
    atoms = list(structure.find('atomic_positions'))
    if len(atoms) != 1 or np.max(abs(reader.floats(atoms[0].text))) > 1e-12:
        raise ValueError('The symmorphic Fe convention requires one atom at the origin')
    bs = xml.find('output/band_structure')
    if bs.findtext('noncolin') != 'true' or bs.findtext('spinorbit') != 'true':
        raise ValueError('Need two-component SOC source')
    species = xml.findall('input/atomic_species/species')
    if len(species) != 1 or species[0].attrib['name'] != 'Fe':
        raise ValueError('This workflow is specifically elemental bcc Fe')
    psp = save / species[0].findtext('pseudo_file')
    if not psp.is_file():
        raise ValueError('Pseudopotential must be archived alongside the save data')
    if 'Norm - Conserving' not in psp.read_text(encoding='utf-8'):
        raise ValueError('Only the published norm-conserving Fe pseudo is supported')
    psp_identity = pseudopotential_identity(psp.read_bytes())
    canonical_psp_sha = psp_identity['LF_sha256']
    if not np.allclose(lattice, np.array([[1,1,1],[-1,1,1],[-1,-1,1]])*2.71175, atol=1e-10, rtol=0):
        raise ValueError('Unexpected Fe primitive lattice')
    metadata = {'qe_version': xml.find('general_info/creator').attrib['VERSION'],
                'calculation': xml.findtext('input/control_variables/calculation'),
                'lattice_bohr': lattice.tolist(), 'alat_bohr': alat,
                'ecutwfc_Ry': 2*float(xml.findtext('input/basis/ecutwfc')),
                'hashes': {'data-file-schema.xml': sha(save/'data-file-schema.xml'), psp.name: sha(psp)},
                'pseudopotential_LF_sha256': canonical_psp_sha,
                'pseudopotential_only_CRLF_normalized_for_identity': sha(psp) != canonical_psp_sha,
                'energy_unit': 'eV', 'energy_conversion_Hartree_to_eV': HARTREE_EV}
    if metadata['ecutwfc_Ry'] != 120:
        raise ValueError('This baseline profile requires 120 Ry')
    return metadata, bs.findall('ks_energies'), lattice, alat


def change_brackets(rows):
    """Resolved label changes only bracket a conditional obstruction, not a root."""
    good = [r for r in rows if r.get('prefix', {}).get('status') == 'ASSIGNED_NUMERICALLY']
    result = []
    for a, b in zip(good[:-1], good[1:]):
        if a['prefix']['multiplicities'] != b['prefix']['multiplicities']:
            result.append({'t_interval': [a['t'], b['t']],
                           'left_multiplicities': a['prefix']['multiplicities'],
                           'right_multiplicities': b['prefix']['multiplicities'],
                           'status': 'CONDITIONAL_CROSSING_BRACKET',
                           'requires': ['same continuous Hamiltonian', 'persistent C4z symmetry',
                                        'correct numerical endpoint branch assignments'],
                           'is_rigorous_DFT_error_enclosure': False})
    return result


def analyze_save(save, on_path=False):
    save = Path(save).resolve()
    metadata, blocks, lattice, alat = read_metadata(save)
    _, reciprocal, _ = c4_conventions(lattice)
    rows = []
    for index, block in enumerate(blocks, 1):
        cart = reader.floats(block.find('k_point').text)
        q = cart @ lattice.T / alat
        path_ok = np.max(abs(q-q[0])) <= 1e-9 and -1e-10 <= q[0] <= 0.5+1e-10
        if on_path and not path_ok:
            raise ValueError(f'Point {index} is not on the declared C4z z path')
        energy = reader.floats(block.findtext('eigenvalues'))*HARTREE_EV
        row = {'index_one_based': index, 'k_fractional': q.tolist(), 'energies_eV': energy.tolist(),
               'delta18_eV': float(energy[18]-energy[17]), 'on_z_path': bool(path_ok),
               't': float(q[0]) if path_ok else None}
        shift = reciprocal @ q-q
        if np.max(abs(shift-np.rint(shift))) > 1e-10:
            row['status'] = 'NOT_C4Z_INVARIANT_MOD_RECIPROCAL_LATTICE'
            rows.append(row)
            continue
        wfpath = save/f'wfc{index}.dat'
        item = reader.read_wfc(wfpath)
        metadata['hashes'][wfpath.name] = sha(wfpath)
        if item['ik'] != index or not np.allclose(item['k_cartesian'], cart*2*np.pi/alat, atol=1e-12, rtol=0):
            raise ValueError('Binary/XML k mismatch')
        if item['scale'] != 1 or not np.allclose(item['reciprocal_lattice'], 2*np.pi*np.linalg.inv(lattice).T, atol=1e-12, rtol=0):
            raise ValueError('Unsupported spinor scale or reciprocal basis')
        if len(item['waves']) != len(energy) or int(block.findtext('npw')) != len(item['gvectors']):
            raise ValueError('Binary/XML band or plane-wave count mismatch')
        item['k'] = q
        ordered_g = item['gvectors'][np.lexsort((item['gvectors'][:,2], item['gvectors'][:,1], item['gvectors'][:,0]))]
        row['plane_wave_count'] = int(len(ordered_g))
        row['miller_vector_set_sha256'] = hashlib.sha256(ordered_g.astype('<i4').tobytes()).hexdigest()
        frame, image, missing, gshift = rotate_frame(item, reciprocal)
        row.update(analyze_frame(energy, frame, image, missing))
        row['reciprocal_reindexing_shift'] = gshift.tolist()
        row['missing_plane_wave_norm'] = float(np.max(missing[:19]))
        rows.append(row)
    if on_path:
        ts = [r['t'] for r in rows]
        if not all(a < b for a, b in zip(ts[:-1], ts[1:])):
            raise ValueError('Path points must be strictly increasing without duplicates')
    report = {'schema': 'symmetry-lab.fe-c4-path-diagnostic.v1',
              'status': 'NUMERICAL_FINITE_K_DIAGNOSTICS', 'source': str(save), 'source_metadata': metadata,
              'reader_sha256': sha(PARSER), 'analyzer_sha256': sha(__file__),
              'conventions': path_audit(lattice), 'tolerances': TOL,
              'rounding_is_not_rigorous_DFT_error_control': True, 'new_DFT_execution_claimed_by_analyzer': False,
              'rows': rows, 'minimum_sampled_delta18_eV': min(r['delta18_eV'] for r in rows),
              'crossing_brackets': change_brackets(rows) if on_path else [],
              'interpolated': False, 'claim': 'Finite-k numerical evidence; a gap closing is not located solely by a small sampled gap.'}
    return report


def export_branch_csv(path, report):
    """Do not split an unresolved degenerate cluster into arbitrary band labels."""
    fields = ['k_index', 't', 'band_first', 'band_last', 'energy_min_eV', 'energy_max_eV',
              'C4_phase_eighths', 'branch_multiplicity', 'delta18_eV', 'assignment_status']
    with Path(path).open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in report['rows']:
            for cluster in row.get('clusters', []):
                counts = cluster['multiplicities']
                labels = [(p, m) for p, m in zip(PHASE_EIGHTHS, counts) if m] if counts else [('', '')]
                for phase, count in labels:
                    writer.writerow({'k_index': row['index_one_based'], 't': row['t'],
                                     'band_first': cluster['band_start_one_based'],
                                     'band_last': cluster['band_stop_one_based'],
                                     'energy_min_eV': cluster['energy_range_eV'][0],
                                     'energy_max_eV': cluster['energy_range_eV'][1],
                                     'C4_phase_eighths': phase, 'branch_multiplicity': count,
                                     'delta18_eV': row['delta18_eV'], 'assignment_status': cluster['status']})


def compare_baseline(old, new, energy_tolerance_eV=0.05):
    a, b = old['rows'], new['rows']
    if len(a) != 8 or len(b) != 8:
        raise ValueError('Baseline comparison requires all original eight points')
    if old['source_metadata']['pseudopotential_LF_sha256'] != new['source_metadata']['pseudopotential_LF_sha256']:
        raise ValueError('Baseline pseudopotentials differ')
    diffs, labels = [], []
    for x, y in zip(a, b):
        if np.max(abs(np.array(x['k_fractional'])-y['k_fractional'])) > 1e-9:
            raise ValueError('Baseline k ordering or reciprocal coordinates differ')
        diffs.extend(np.array(y['energies_eV'])-x['energies_eV'])
        if 'prefix' in x:
            labels.append(x['prefix']['status'] == y.get('prefix', {}).get('status') == 'ASSIGNED_NUMERICALLY'
                          and x['prefix']['multiplicities'] == y['prefix']['multiplicities'])
    diff = np.array(diffs)
    maximum = float(np.max(abs(diff)))
    labels_match = bool(labels) and all(labels)
    return {'status': 'REPRODUCED_WITHIN_DECLARED_NUMERICAL_PROFILE' if labels_match and maximum <= energy_tolerance_eV else 'BASELINE_MISMATCH_REQUIRES_REVIEW',
            'absolute_max_energy_difference_eV': maximum, 'mean_energy_difference_eV': float(diff.mean()),
            'energy_tolerance_eV': energy_tolerance_eV, 'energy_offset_fitted_or_removed': False,
            'c4_prefix_multiplicities_match': labels_match, 'compared_C4_invariant_points': len(labels),
            'same_original_SCF_Hamiltonian_proved': False,
            'new_SCF_and_old_NSCF_cannot_be_identified_from_band_agreement_alone': True}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--save', type=Path)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--path', action='store_true')
    ap.add_argument('--compare', nargs=2, type=Path, metavar=('OLD_JSON', 'NEW_JSON'))
    args = ap.parse_args()
    if args.compare:
        report = compare_baseline(*(json.loads(p.read_text(encoding='utf-8')) for p in args.compare))
    else:
        if args.save is None:
            ap.error('--save is required unless --compare is used')
        report = analyze_save(args.save, args.path)
    write_json(args.output, report)
    if 'rows' in report:
        export_branch_csv(args.output.with_suffix('.csv'), report)
    print(json.dumps({k: report[k] for k in ['status', 'minimum_sampled_delta18_eV', 'crossing_brackets'] if k in report}))


if __name__ == '__main__':
    main()
