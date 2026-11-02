"""Generate immutable, independent SCF / eight-point / z-path job folders."""
from pathlib import Path
from itertools import product
from fractions import Fraction
import argparse
import json
import shutil
import numpy as np
from analyze_fe import PHASE9, sha, write_json, path_audit
from source_data import source_directory

SOURCE = source_directory()


def input_text(calculation, points=None, scf_mesh=4, max_seconds=900, nscf_conv_thr='1.0e-10'):
    scf = calculation == 'scf'
    bands = '' if scf else '  nbnd=32, nosym=.true., noinv=.true.,\n'
    text = ("&control\n" + f"  calculation='{calculation}', restart_mode='from_scratch',\n"
            "  prefix='Fe', pseudo_dir='./', outdir='./scratch',\n"
            + f"  disk_io='low', verbosity='high', max_seconds={max_seconds},\n/\n"
            "&system\n  ibrav=3, celldm(1)=5.4235, nat=1, ntyp=1,\n"
            "  ecutwfc=120.0, ecutrho=480.0,\n"
            "  lspinorb=.true., noncolin=.true., starting_magnetization(1)=-1,\n"
            "  occupations='smearing', smearing='cold', degauss=0.02,\n"
            + bands + "/\n&electrons\n  startingwfc='random', diagonalization='david',\n"
            + ("  conv_thr=1.0e-8,\n" if scf else f"  conv_thr={nscf_conv_thr},\n")
            + "/\nATOMIC_SPECIES\nFe 55.85 Fe.jry.pbe.UPF\nATOMIC_POSITIONS\nFe 0.0 0.0 0.0\n")
    if scf:
        return text + f'K_POINTS automatic\n{scf_mesh} {scf_mesh} {scf_mesh} 0 0 0\n'
    if not points:
        raise ValueError('Explicit NSCF point list required')
    return text + 'K_POINTS crystal\n' + str(len(points))+'\n' + ''.join(
        ' '.join(f'{float(x):.16f}' for x in q)+f' {1/len(points):.16f}\n' for q in points)


def prepare(destination, samples=17, scf_mesh=4, max_seconds=900, parameters=None, nscf_conv_thr='1.0e-10'):
    dest = Path(destination).resolve()
    if not (SOURCE/'Fe.save/Fe.jry.pbe.UPF').is_file():
        raise ValueError('Pinned source data missing. Run python source_data.py or set FE_SOURCE_DATA.')
    if dest.exists():
        raise ValueError('Refusing to overwrite a prepared experiment: ' + str(dest))
    if samples < 3 or scf_mesh < 4 or max_seconds <= 0:
        raise ValueError('At least 3 path samples, SCF mesh >=4 and positive max_seconds required')
    threshold = float(nscf_conv_thr)
    if not np.isfinite(threshold) or not 0 < threshold <= 1e-8:
        raise ValueError('Positive, finite NSCF threshold no looser than 1e-8 required')
    nscf_conv_thr = str(nscf_conv_thr)
    times = [Fraction(i, 2*(samples-1)) for i in range(samples)] if parameters is None else [Fraction(x) for x in parameters]
    if not times or any(t < 0 or t > Fraction(1, 2) for t in times) or sorted(set(times)) != times:
        raise ValueError('Explicit path parameters must be strictly increasing in [0,1/2]')
    old8 = list(product((Fraction(0), Fraction(1, 2)), repeat=3))
    path = [[t, t, t] for t in times]
    stages = [('scf', None), ('baseline8', old8), ('path', path)]
    dest.mkdir(parents=True)
    manifest = {'schema': 'symmetry-lab.fe-recompute-input.v1', 'executed': False,
                'source_directory': str(SOURCE), 'scf_mesh': [scf_mesh]*3,
                'path_parameter_exact': [str(t) for t in times], 'path_point_count': len(path),
                'nscf_conv_thr_Ry': threshold,
                'max_seconds_per_stage': max_seconds, 'wavefunction_cutoff_Ry': 120,
                'charge_cutoff_Ry': 480, 'new_SCF_is_not_the_original_saved_potential': True,
                'expected_old_endpoint_multiplicities': {'Gamma': [4,4,5,5], 'H_z': [4,5,4,5]},
                'baseline_profile': {'absolute_energy_tolerance_eV': 0.05, 'energy_origin_shift': False},
                'changes_from_published_inputs': [
                    'separate scratch directories preserve every completed stage',
                    'ecutrho=480 Ry makes the published default explicit',
                    'noinv=true prevents unrequested inverse-k generation in NSCF',
                    'finite wallclock guard and high verbosity for reproducibility'],
                'input_files_sha256': {}, 'original_input_sha256': {
                    name: sha(SOURCE/name) for name in ('Fe_pw_scf_in', 'Fe_pw_nscf_in', 'Fe.win')}}
    for stage, points in stages:
        folder = dest/stage
        folder.mkdir()
        (folder/'scratch').mkdir()
        shutil.copy2(SOURCE/'Fe.save/Fe.jry.pbe.UPF', folder/'Fe.jry.pbe.UPF')
        (folder/'pw.in').write_text(input_text('scf' if stage == 'scf' else 'nscf', points, scf_mesh, max_seconds, nscf_conv_thr), encoding='ascii')
        for name in ('pw.in', 'Fe.jry.pbe.UPF'):
            manifest['input_files_sha256'][f'{stage}/{name}'] = sha(folder/name)
    a = np.array([[1,1,1],[-1,1,1],[-1,-1,1]])*2.71175
    manifest['path_conventions'] = path_audit(a)
    write_json(dest/'MANIFEST.json', manifest)
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--samples', type=int, default=17)
    ap.add_argument('--scf-mesh', type=int, default=4)
    ap.add_argument('--max-seconds', type=int, default=900)
    ap.add_argument('--parameters', nargs='+', help='Exact increasing t values, e.g. 1/4 17/64 9/32')
    ap.add_argument('--nscf-conv-thr', default='1.0e-10')
    args = ap.parse_args()
    manifest = prepare(args.out, args.samples, args.scf_mesh, args.max_seconds, args.parameters, args.nscf_conv_thr)
    print(json.dumps({'status': 'INPUTS_PREPARED_NOT_EXECUTED', 'directory': str(args.out),
                      'path_point_count': manifest['path_point_count']}))


if __name__ == '__main__':
    main()
