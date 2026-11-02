"""Execute a prepared portable QE experiment with immutable stage logs.

This launcher never changes system software or copies over a prior calculation.
Each NSCF stage gets its own copy of the same converged SCF save directory.
"""
from pathlib import Path
import argparse
import datetime
import json
import os
import shutil
import subprocess
import time
import xml.etree.ElementTree as ET
from analyze_fe import analyze_save, compare_baseline, export_branch_csv, sha, write_json, PHASE9
from source_data import source_directory


def density_files(save):
    return {p.name: sha(p) for p in sorted(Path(save).glob('*')) if p.is_file() and
            (p.name.startswith('charge-density') or p.name.startswith('spin-polarization'))}


def run_stage(experiment, stage, executable, threads=2, scf_source=None, convergence_study=False):
    base, executable = Path(experiment).resolve(), Path(executable).resolve()
    folder = base/stage
    manifest = json.loads((base/'MANIFEST.json').read_text(encoding='utf-8'))
    if stage not in ('scf', 'baseline8', 'path'):
        raise ValueError('Unknown stage')
    if (folder/'RUN.json').exists() or (folder/'pw.out').exists():
        raise ValueError('A prior stage exists; preserve it and prepare a fresh directory')
    for name in ('pw.in', 'Fe.jry.pbe.UPF'):
        if sha(folder/name) != manifest['input_files_sha256'][f'{stage}/{name}']:
            raise ValueError('Prepared input changed: '+name)
    save = folder/'scratch/Fe.save'
    source_density = {}
    if stage != 'scf':
        source = Path(scf_source).resolve() if scf_source else base/'scf/scratch/Fe.save'
        source_xml = ET.parse(source/'data-file-schema.xml').getroot()
        if source_xml.findtext('output/convergence_info/scf_conv/convergence_achieved') != 'true':
            raise ValueError('SCF source does not report convergence')
        if source_xml.findtext('input/control_variables/calculation') != 'scf':
            raise ValueError('Restart source must be the archived SCF, not another NSCF')
        source_density = density_files(source)
        if not source_density:
            raise ValueError('No saved charge density; cannot extend the same SCF Hamiltonian')
        if stage == 'path':
            prior = source.parents[2]/'baseline8'
            comparison = json.loads((prior/'BASELINE_COMPARISON.json').read_text(encoding='utf-8'))
            prior_run = json.loads((prior/'RUN.json').read_text(encoding='utf-8'))
            if convergence_study:
                source_manifest = json.loads((source.parents[2]/'MANIFEST.json').read_text(encoding='utf-8'))
                if min(source_manifest['scf_mesh']) <= 4 or not comparison['c4_prefix_multiplicities_match']:
                    raise ValueError('Convergence profile requires a declared denser SCF and preserved endpoint branches')
            elif comparison['status'] != 'REPRODUCED_WITHIN_DECLARED_NUMERICAL_PROFILE':
                raise ValueError('Review the failed eight-point reproduction before path calculation')
            if prior_run['source_scf_density_sha256'] != source_density:
                raise ValueError('Path and baseline do not share the same archived SCF density')
        if save.exists():
            raise ValueError('Do not overwrite an existing restart directory')
        shutil.copytree(source, save)
    environment = os.environ.copy()
    environment.update({'OMP_NUM_THREADS': str(threads), 'MKL_NUM_THREADS': str(threads)})
    started = time.time()
    result = {'schema': 'symmetry-lab.fe-qe-run.v1', 'stage': stage,
              'started_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'executable': str(executable), 'executable_sha256': sha(executable),
              'input_sha256': sha(folder/'pw.in'), 'pseudopotential_sha256': sha(folder/'Fe.jry.pbe.UPF'),
              'threads': threads, 'system_software_modified': False,
              'purpose': 'SCF_MESH_CONVERGENCE_NOT_SOURCE_REPRODUCTION' if convergence_study or min(manifest['scf_mesh']) > 4 else 'PUBLISHED_4MESH_PROFILE_REPRODUCTION',
              'source_scf_density_sha256': source_density,
              'source_scf_save': str(source) if stage != 'scf' else None}
    write_json(folder/'RUN_STARTED.json', result)
    with (folder/'pw.out').open('wb') as stdout, (folder/'pw.err').open('wb') as stderr:
        try:
            completed = subprocess.run([str(executable), '-in', 'pw.in'], cwd=folder,
                                       stdout=stdout, stderr=stderr, env=environment,
                                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                                       timeout=manifest['max_seconds_per_stage']+60)
            result['returncode'] = completed.returncode
        except subprocess.TimeoutExpired:
            result['returncode'] = None
            result['terminated_by_timeout'] = True
    result['wall_seconds'] = time.time()-started
    text = (folder/'pw.out').read_text(errors='replace')
    result['job_done_marker'] = 'JOB DONE.' in text
    result['stdout_sha256'], result['stderr_sha256'] = sha(folder/'pw.out'), sha(folder/'pw.err')
    result['saved_density_sha256'] = density_files(save)
    result['status'] = 'QE_COMPLETED' if result['returncode'] == 0 and result['job_done_marker'] else 'QE_INCOMPLETE'
    if stage == 'scf':
        result['scf_converged'] = 'convergence has been achieved' in text
        if not result['scf_converged']:
            result['status'] = 'SCF_NOT_CONVERGED'
    elif result['saved_density_sha256'] != source_density:
        result['status'] = 'NSCF_DENSITY_CHANGED_REQUIRES_REVIEW'
    write_json(folder/'RUN.json', result)
    if result['status'] != 'QE_COMPLETED':
        raise RuntimeError('QE stage did not complete: '+result['status'])
    if stage != 'scf':
        postprocess(base, stage)
    return result


def postprocess(base, stage):
    """Reanalyze a completed immutable DFT stage without rerunning the solver."""
    folder = Path(base).resolve()/stage
    save = folder/'scratch/Fe.save'
    execution = json.loads((folder/'RUN.json').read_text(encoding='utf-8'))
    if execution['status'] != 'QE_COMPLETED' or execution['stdout_sha256'] != sha(folder/'pw.out'):
        raise ValueError('No unchanged, completed QE execution record')
    if execution['input_sha256'] != sha(folder/'pw.in') or execution['pseudopotential_sha256'] != sha(folder/'Fe.jry.pbe.UPF'):
        raise ValueError('Executed input or pseudopotential has changed')
    if execution['saved_density_sha256'] != density_files(save):
        raise ValueError('Saved SCF density has changed since execution')
    if stage != 'scf':
        if not (save/'Fe.jry.pbe.UPF').exists():
            shutil.copy2(folder/'Fe.jry.pbe.UPF', save/'Fe.jry.pbe.UPF')
        report = analyze_save(save, on_path=(stage == 'path'))
        report['execution_record_sha256'] = sha(folder/'RUN.json')
        report['new_DFT_execution_claimed_by_analyzer'] = True
        write_json(folder/'ANALYSIS.json', report)
        export_branch_csv(folder/'C4_BRANCHES.csv', report)
        if stage == 'baseline8':
            old = analyze_save(source_directory()/'Fe.save')
            comparison = compare_baseline(old, report)
            write_json(folder/'BASELINE_COMPARISON.json', comparison)
        else:
            print(json.dumps({'crossing_brackets': report['crossing_brackets'],
                              'minimum_sampled_delta18_eV': report['minimum_sampled_delta18_eV']}))
    return {'status': 'POSTPROCESSED_EXISTING_QE_OUTPUT', 'stage': stage,
            'execution_record_sha256': sha(folder/'RUN.json')}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--experiment', type=Path, required=True)
    ap.add_argument('--pw', type=Path)
    ap.add_argument('--stage', choices=['scf', 'baseline8', 'path'], required=True)
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--scf-source', type=Path)
    ap.add_argument('--analyze-only', action='store_true')
    ap.add_argument('--convergence-study', action='store_true', help='Independent denser-SCF study; never reclassifies a failed source-reproduction comparison')
    args = ap.parse_args()
    if not 1 <= args.threads <= 8:
        ap.error('Use between one and eight threads for the local resource guard')
    if args.analyze_only:
        print(json.dumps(postprocess(args.experiment, args.stage)))
    else:
        if args.pw is None:
            ap.error('--pw is required to execute QE')
        print(json.dumps(run_stage(args.experiment, args.stage, args.pw, args.threads, args.scf_source, args.convergence_study)))


if __name__ == '__main__':
    main()
