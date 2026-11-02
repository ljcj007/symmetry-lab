"""Read-only Fe review: independent binary decoding, C4 eigenvalues and hashes.

No phase13/fe or prior research module is imported. NumPy and the standard
library are the only dependencies. Outputs are written exclusively in reviews.
"""
import argparse
from fractions import Fraction
import hashlib
from itertools import product
import json
from pathlib import Path
import re
import struct
import sys
import xml.etree.ElementTree as ET
import numpy as np

EV = 27.211386245988
PHASES = [7,1,3,5]
ROOTS = np.exp(1j*np.pi*np.array(PHASES)/4)
R = np.array([[0,-1,0],[1,0,0],[0,0,1]])
SPIN = np.diag(np.exp(1j*np.pi*np.array([-1,1])/4))


def sha(path):
    with Path(path).open('rb') as handle:
        return hashlib.file_digest(handle,'sha256').hexdigest()


def floats(text):
    return np.array([float(s.replace('D','E')) for s in text.split()])


def binary(path):
    data = path.read_bytes()
    records, offset = [],0
    while offset < len(data):
        count, = struct.unpack_from('<i',data,offset)
        if count < 0 or offset+count+8 > len(data):
            raise ValueError('bad Fortran record size')
        end, = struct.unpack_from('<i',data,offset+count+4)
        if end != count:
            raise ValueError('Fortran record markers disagree')
        records.append(memoryview(data)[offset+4:offset+4+count])
        offset += count+8
    ik,kx,ky,kz,ispin,gamma,scale = struct.unpack('<i3diid',records[0])
    ngw,ng,npol,nb = struct.unpack('<4i',records[1])
    if gamma != 0 or npol != 2 or scale != 1 or len(records) != nb+4:
        raise ValueError('unsupported raw spinor format')
    recip = np.frombuffer(records[2],dtype='<f8').reshape(3,3)
    miller = np.frombuffer(records[3],dtype='<i4').reshape(ng,3)
    coeff = np.stack([np.frombuffer(r,dtype='<c16').reshape(2,ng) for r in records[4:]])
    if len({tuple(v) for v in miller}) != ng or not np.isfinite(coeff).all():
        raise ValueError('duplicate G vector or nonfinite wavefunction')
    return ik,np.array([kx,ky,kz]),recip,miller,coeff


def inspect_analysis(report_path, save):
    report = json.loads(report_path.read_text(encoding='utf-8'))
    xml = ET.parse(save/'data-file-schema.xml').getroot()
    structure = xml.find('output/atomic_structure')
    A = np.array([floats(structure.findtext('cell/a'+str(i))) for i in (1,2,3)])
    alat = float(structure.attrib['alat'])
    # Derive the reciprocal map directly from Cartesian reciprocal basis B.
    B = 2*np.pi*np.linalg.inv(A).T
    T_float = np.linalg.inv(B.T)@R@B.T
    T = np.rint(T_float).astype(int)
    if np.max(abs(T_float-T)) > 1e-12:
        raise ValueError('nonintegral reciprocal C4 map')
    maxima = {'energy_difference_eV':0.,'q_difference':0.,'binary_xml_k':0.,
              'prefix_root_distance':0.,'cluster_root_distance':0.,
              'covariance_difference_eV':0.}
    prefix_count,cluster_count,raw_points = 0,0,0
    file_checks = []
    for name,expected in report['source_metadata']['hashes'].items():
        actual = sha(save/name)
        if actual != expected:
            raise ValueError('analysis source hash differs: '+str(save/name))
        file_checks.append(name)
    psp = save/xml.findtext('input/atomic_species/species/pseudo_file')
    normalized = hashlib.sha256(psp.read_bytes().replace(b'\r\n',b'\n')).hexdigest()
    if normalized != report['source_metadata']['pseudopotential_LF_sha256']:
        raise ValueError('UPF canonical hash mismatch')
    xml_points = xml.findall('output/band_structure/ks_energies')
    if len(report['rows']) != len(xml_points):
        raise ValueError('analysis/XML point counts differ')
    for row,ks in zip(report['rows'],xml_points):
        energy = floats(ks.findtext('eigenvalues'))*EV
        cart = floats(ks.find('k_point').text)
        q = np.linalg.solve(B.T,cart*2*np.pi/alat)
        maxima['energy_difference_eV'] = max(maxima['energy_difference_eV'],float(np.max(abs(energy-row['energies_eV']))))
        maxima['q_difference'] = max(maxima['q_difference'],float(np.max(abs(q-row['k_fractional']))))
        if abs((energy[18]-energy[17])-row['delta18_eV']) > 1e-12:
            raise ValueError('18/19 energy difference mismatch')
        if 'prefix' not in row:
            if np.max(abs((T@q-q)-np.rint(T@q-q))) < 1e-10:
                raise ValueError('C4-invariant point was skipped')
            continue
        index = row['index_one_based']
        ik,kbinary,binary_B,G,waves = binary(save/f'wfc{index}.dat')
        raw_points += 1
        if ik != index or np.max(abs(binary_B-B)) > 1e-12:
            raise ValueError('binary reciprocal metadata mismatch')
        maxima['binary_xml_k'] = max(maxima['binary_xml_k'],float(np.max(abs(kbinary-cart*2*np.pi/alat))))
        shift = np.rint(T@q-q).astype(int)
        Gtarget = (T@G.T).T+shift
        positions = {tuple(v):i for i,v in enumerate(G)}
        raw = waves.transpose(1,2,0)
        transformed = np.zeros_like(raw)
        for source,target in enumerate(Gtarget):
            dest = positions.get(tuple(target))
            if dest is None:
                if np.max(abs(raw[:,source,:19])) > 1e-10:
                    raise ValueError('significant missing C4 plane-wave coefficient')
            else:
                transformed[:,dest,:] = SPIN@raw[:,source,:]
        W,V = raw.reshape(-1,len(energy)),transformed.reshape(-1,len(energy))
        D = W.conj().T@V

        def labels(start,stop,kind):
            eigenvalues = np.linalg.eigvals(D[start:stop,start:stop])
            distances = abs(eigenvalues[:,None]-ROOTS[None,:])
            nearest = distances.argmin(axis=1)
            maxima[kind] = max(maxima[kind],float(distances.min(axis=1).max()))
            return np.bincount(nearest,minlength=4).tolist()

        if row['prefix']['status'] == 'ASSIGNED_NUMERICALLY':
            if labels(0,18,'prefix_root_distance') != row['prefix']['multiplicities']:
                raise ValueError('independent prefix eigenvalue multiplicities disagree')
            prefix_count += 1
        for cluster in row['clusters']:
            if cluster['status'] == 'ASSIGNED_NUMERICALLY':
                if labels(cluster['band_start_one_based']-1,cluster['band_stop_one_based'],'cluster_root_distance') != cluster['multiplicities']:
                    raise ValueError('independent cluster eigenvalue multiplicities disagree')
                cluster_count += 1
        critical = next(c['band_stop_one_based'] for c in row['clusters'] if c['band_stop_one_based'] >= 19)
        comm = energy[:,None]*D-D*energy[None,:]
        covariance = float(np.linalg.norm(comm[:,:critical])/np.sqrt(critical))
        maxima['covariance_difference_eV'] = max(maxima['covariance_difference_eV'],abs(covariance-row['energy_covariance_eV']))
    if maxima['prefix_root_distance'] > 1e-5 or maxima['cluster_root_distance'] > 1e-5 or maxima['q_difference'] > 1e-12:
        raise ValueError('independent raw numeric residual exceeds review threshold')
    return {'status':'PASS','raw_points':raw_points,'resolved_prefixes':prefix_count,
            'resolved_clusters':cluster_count,'maxima':maxima,'source_files_checked':len(file_checks),
            'pseudopotential_raw_sha256':sha(psp),'pseudopotential_LF_sha256':normalized,
            'max_recorded_energy_covariance_eV':max(r.get('energy_covariance_eV',0) for r in report['rows']),
            'minimum_sampled_delta18_eV':report['minimum_sampled_delta18_eV'],
            'analysis_sha256':sha(report_path)}


def relocated(base, recorded):
    path = Path(recorded)
    if path.exists():
        return path
    normalized = str(recorded).replace('\\','/')
    if '/phase13/' in normalized:
        return base/normalized.split('/phase13/',1)[1]
    return path


def inspect_execution(run_path, cache, base):
    row = json.loads(run_path.read_text(encoding='utf-8'))
    folder = run_path.parent
    if row['status'] != 'QE_COMPLETED':
        return {'status':'NOT_COMPLETED','run_sha256':sha(run_path)}
    pairs = [('pw.in','input_sha256'),('pw.out','stdout_sha256'),('pw.err','stderr_sha256'),
             ('Fe.jry.pbe.UPF','pseudopotential_sha256')]
    for name,key in pairs:
        if sha(folder/name) != row[key]:
            raise ValueError('execution hash mismatch '+str(folder/name))
    exe = relocated(base,row['executable'])
    if str(exe) not in cache:
        cache[str(exe)] = sha(exe)
    if cache[str(exe)] != row['executable_sha256']:
        raise ValueError('solver executable changed')
    for name,value in row['saved_density_sha256'].items():
        if sha(folder/'scratch/Fe.save'/name) != value:
            raise ValueError('saved density changed')
    if row['stage'] != 'scf' and row['source_scf_density_sha256'] != row['saved_density_sha256']:
        raise ValueError('NSCF used another density')
    if row['stage'] != 'scf':
        source = relocated(base,row['source_scf_save'])
        for name,value in row['source_scf_density_sha256'].items():
            if sha(source/name) != value:
                raise ValueError('source SCF density no longer matches actual bytes')
        x = ET.parse(source/'data-file-schema.xml').getroot()
        if x.findtext('input/control_variables/calculation') != 'scf' or x.findtext('output/convergence_info/scf_conv/convergence_achieved') != 'true':
            raise ValueError('source is not a converged archived SCF')
    text = (folder/'pw.out').read_text(encoding='utf-8',errors='replace')
    if 'JOB DONE.' not in text or 'Program PWSCF v.7.5' not in text:
        raise ValueError('QE version or completion marker mismatch')
    thresholds = re.findall(r'ethr\s*=\s*([0-9.Ee+-]+)',text)
    return {'status':'PASS','stage':row['stage'],'run_sha256':sha(run_path),
            'executable_sha256':row['executable_sha256'],'density_sha256':row['saved_density_sha256'],
            'wall_seconds':row['wall_seconds'],'diagonalization_thresholds':thresholds,
            'purpose':row.get('purpose','not recorded in initial launch format'),
            'source_SCF_equals_original_missing_SCF_proved':False}


def plane_wave_interval(left, right, saves):
    points = [binary(save/f"wfc{row['index_one_based']}.dat") for row,save in zip((left,right),saves)]
    B = points[0][2]
    if np.max(abs(points[1][2]-B)) > 1e-12:
        raise ValueError('refinement endpoints use different reciprocal lattices')
    sets = [{tuple(g) for g in point[3]} for point in points]
    lo,hi = left['t'],right['t']
    A = 2*np.pi*np.linalg.inv(B).T
    bounds = np.ceil(np.linalg.norm(A,axis=1)*np.sqrt(120)/(2*np.pi)+max(abs(lo),abs(hi))).astype(int)+1
    candidates = np.array(list(product(*(range(-n,n+1) for n in bounds))),int)
    Gcart = candidates@B
    velocity = np.ones(3)@B
    aa = float(velocity@velocity)
    bb = 2*(Gcart@velocity)
    cc = np.einsum('ij,ij->i',Gcart,Gcart)
    def value(t): return aa*t*t+bb*t+cc
    minimum = value(np.clip(-bb/(2*aa),lo,hi))
    maximum = np.maximum(value(lo),value(hi))
    ambiguous = (minimum <= 120)&(maximum >= 120)
    inside = maximum < 120
    expected_left = {tuple(g) for g,val in zip(candidates,value(lo)) if val < 120}
    expected_right = {tuple(g) for g,val in zip(candidates,value(hi)) if val < 120}
    if sets[0] != expected_left or sets[1] != expected_right:
        raise ValueError('raw G set differs from independently enumerated 120 Ry cutoff sphere')
    margin = np.minimum(abs(minimum-120),abs(maximum-120))
    return {'endpoint_npw':[len(s) for s in sets], 'endpoint_G_sets_equal':sets[0]==sets[1],
            'finite_G_candidates':len(candidates),'integer_coordinate_bounds':bounds.tolist(),
            'possible_cutoff_crossings_in_closed_interval':int(ambiguous.sum()),
            'minimum_numeric_cutoff_margin_Ry':float(margin.min()),
            'fixed_basis_supported_numerically':not bool(ambiguous.any()) and sets[0]==sets[1],
            'scope':'Exhaustive finite G candidates bounded by the dual lattice, quadratic kinetic-energy extrema; floating arithmetic, not rigorous interval arithmetic.'}


def inspect_refinement(ref_path,fe):
    refined = json.loads(ref_path.read_text(encoding='utf-8'))
    initial = Path(refined['initial_analysis'])
    if not initial.exists():
        initial = fe/'experiments'/refined['initial_analysis'].replace('\\','/').split('/experiments/',1)[1]
    if sha(initial) != refined['initial_analysis_sha256']:
        raise ValueError('refinement initial analysis changed')
    sources = [(row,initial.parent/'scratch/Fe.save') for row in json.loads(initial.read_text(encoding='utf-8'))['rows']]
    for r in refined['rounds']:
        folder = ref_path.parent/f"round_{r['round']:02d}/path"
        if sha(folder/'ANALYSIS.json') != r['analysis_sha256'] or sha(folder/'RUN.json') != r['execution_sha256']:
            raise ValueError('refinement round hash mismatch')
        sources += [(row,folder/'scratch/Fe.save') for row in json.loads((folder/'ANALYSIS.json').read_text(encoding='utf-8'))['rows']]
    output = []
    for bracket in refined['brackets']:
        phase_a,phase_b = bracket['C4_phase_eighths_a_b']
        saves = []
        for side,claimed_gap in zip(('left','right'),bracket['signed_gap_Eb_minus_Ea_eV']):
            endpoint = bracket[side]
            matching = [save for row,save in sources if row == endpoint]
            if not matching:
                raise ValueError('refined endpoint detached from executed raw analysis')
            saves.append(matching[0])
            if endpoint['energy_covariance_eV'] > 2e-4:
                raise ValueError('refined endpoint energy covariance unresolved')
            phase_energy = {}
            for band in (18,19):
                cluster = next(c for c in endpoint['clusters'] if c['band_start_one_based'] <= band <= c['band_stop_one_based'])
                phases = [p for p,n in zip(PHASES,cluster['multiplicities']) if n]
                if len(phases) != 1 or cluster['status'] != 'ASSIGNED_NUMERICALLY':
                    raise ValueError('ambiguous boundary branch in refinement summary')
                phase_energy[phases[0]] = endpoint['energies_eV'][band-1]
            if abs(phase_energy[phase_b]-phase_energy[phase_a]-claimed_gap) > 1e-12:
                raise ValueError('signed branch gap inconsistent with executed energies')
        summary = {k:bracket[k] for k in ('t_interval','t_width','C4_phase_eighths_a_b','signed_gap_Eb_minus_Ea_eV')}
        summary['plane_wave_interval_check'] = plane_wave_interval(bracket['left'],bracket['right'],saves)
        output.append(summary)
    return {'status':'PASS','summary_sha256':sha(ref_path),'intervals':output}


def inspect_inversion_fault(base):
    report_path = base/'reviews/FE_INVERSION_FAULT.json'
    if not report_path.exists():return {'status':'NOT_AVAILABLE'}
    report = json.loads(report_path.read_text(encoding='utf-8'))
    save = base/'fe/experiments/reference_17/baseline8/scratch/Fe.save'
    result = []
    for record,index in zip(report['records'],(1,8)):
        path = save/f'wfc{index}.dat'
        if sha(path) != record['wavefunction_sha256']:raise ValueError('inversion fault source mismatch')
        ik,k,B,G,waves = binary(path)
        q = np.linalg.solve(B.T,k)
        T = np.rint(np.linalg.inv(B.T)@R@B.T).astype(int)
        lookup = {tuple(g):i for i,g in enumerate(G)}
        raw = waves[:18].transpose(1,2,0)
        c4image,pimage = np.zeros_like(raw),np.zeros_like(raw)
        for i,g in enumerate(G):
            cg = T@g+np.rint(T@q-q).astype(int)
            pg = -g-np.rint(2*q).astype(int)
            c4image[:,lookup[tuple(cg)],:] = SPIN@raw[:,i,:]
            pimage[:,lookup[tuple(pg)],:] = raw[:,i,:]
        W = raw.reshape(-1,18)
        CV,PV = c4image.reshape(-1,18),pimage.reshape(-1,18)
        C,P = W.conj().T@CV,W.conj().T@PV
        wrong = float(np.linalg.norm(PV+W@P)/np.sqrt(18))
        correct = float(np.linalg.norm(PV-W@P)/np.sqrt(18))
        if abs(wrong-record['forged_binding_residual']) > 1e-12 or abs(correct-record['physical_binding_residual']) > 1e-12:
            raise ValueError('raw inversion binding residual mismatch')
        joint = []
        for phase,alpha in zip(PHASES,ROOTS):
            _,singular,Vh = np.linalg.svd(C-alpha*np.eye(18))
            subspace = Vh.conj().T[:,singular<1e-5]
            block = subspace.conj().T@P@subspace
            vals = np.linalg.eigvalsh((block+block.conj().T)/2)
            if np.max(np.minimum(abs(vals-1),abs(vals+1))) > 1e-5:
                raise ValueError('joint inversion eigenvalues unresolved')
            for sign in (1,-1):
                joint.append({'C4_phase_eighths':phase,'inversion':sign,'multiplicity':int(np.count_nonzero(vals*sign>0))})
        if joint != record['physical_joint_counts']:raise ValueError('independent joint eigenspaces disagree')
        for row,actual in zip(record['forged_joint_counts'],joint):
            opposite = next(x for x in joint if x['C4_phase_eighths']==actual['C4_phase_eighths'] and x['inversion']==-actual['inversion'])
            if row['multiplicity'] != opposite['multiplicity']:raise ValueError('parity twist not recorded correctly')
        result.append({'index':index,'physical_binding_residual':correct,'forged_binding_residual':wrong,
                       'joint_eigenspace_count_matches':True})
    return {'status':'PASS','report_sha256':sha(report_path),'endpoints':result,
            'scope':'Independent raw decoder and C4 nullspace/parity eigenspace counts; numerical, unitary subgroup only.'}


def inspect_strict(fe):
    output = {}
    for mesh in (4,8,12):
        folder = fe/f'experiments/strict_{mesh}mesh/path'
        if not (folder/'ANALYSIS.json').exists():
            continue
        strict = json.loads((folder/'ANALYSIS.json').read_text(encoding='utf-8'))
        refined = json.loads((fe/f'experiments/refined_{mesh}mesh/RESULT.json').read_text(encoding='utf-8'))
        xml = ET.parse(folder/'scratch/Fe.save/data-file-schema.xml').getroot()
        threshold_Ry = 2*float(xml.findtext('input/electron_control/conv_thr'))
        if abs(threshold_Ry-1e-12) > 1e-24:
            raise ValueError('strict NSCF tolerance was not actually used')
        maximum, comparisons = 0.,[]
        for bracket in refined['brackets']:
            phase_a,phase_b = bracket['C4_phase_eighths_a_b']
            signs = []
            for side in ('left','right'):
                old = bracket[side]
                row = min(strict['rows'],key=lambda r:abs(r['t']-old['t']))
                if abs(row['t']-old['t']) > 1e-12:
                    raise ValueError('strict replay did not include the actual endpoint')
                maximum = max(maximum,float(np.max(abs(np.array(old['energies_eV'])-row['energies_eV']))))
                energies = {}
                for band in (18,19):
                    cluster = next(c for c in row['clusters'] if c['band_start_one_based']<=band<=c['band_stop_one_based'])
                    phases = [p for p,n in zip(PHASES,cluster['multiplicities']) if n]
                    if cluster['status']!='ASSIGNED_NUMERICALLY' or len(phases)!=1:
                        raise ValueError('strict endpoint branch unresolved')
                    energies[phases[0]] = row['energies_eV'][band-1]
                signs.append(energies[phase_b]-energies[phase_a])
            if signs[0] <= 0 or signs[1] >= 0:
                raise ValueError('strict NSCF threshold did not preserve branch order reversal')
            comparisons.append({'t_interval':bracket['t_interval'],'strict_signed_gaps_eV':signs})
        output[str(mesh)] = {'status':'PASS','conv_thr_Ry':threshold_Ry,'max_energy_change_eV':maximum,
                              'endpoint_pairs':comparisons,'analysis_sha256':sha(folder/'ANALYSIS.json')}
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-dir',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--source-dir',type=Path)
    args = parser.parse_args()
    base = args.base_dir.resolve()
    fe = base/'fe'
    original = args.source_dir or base.parent/'phase9/data/electronic/Fe-222-pw'
    manifest = json.loads((fe/'SOURCE_MANIFEST.json').read_text(encoding='utf-8'))
    source_count = 0
    for record in manifest['files']:
        path = original/record['path']
        if sha(path) != record['sha256'] or path.stat().st_size != record['bytes']:
            raise ValueError('published source differs '+str(path))
        source_count += 1
    files = [(fe/'reports/OLD_8_POINT_ANALYSIS.json',original/'Fe.save')]
    files += [(p,p.parent/'scratch/Fe.save') for p in sorted((fe/'experiments').rglob('ANALYSIS.json'))]
    analyses = {p.relative_to(base).as_posix():inspect_analysis(p,save) for p,save in files}
    cache = {}
    executions = {p.relative_to(base).as_posix():inspect_execution(p,cache,base)
                  for p in sorted((fe/'experiments').rglob('RUN.json'))}
    comparison = json.loads((fe/'experiments/reference_17/baseline8/BASELINE_COMPARISON.json').read_text(encoding='utf-8'))
    old = json.loads((fe/'reports/OLD_8_POINT_ANALYSIS.json').read_text(encoding='utf-8'))
    new = json.loads((fe/'experiments/reference_17/baseline8/ANALYSIS.json').read_text(encoding='utf-8'))
    delta = np.array([n['energies_eV'] for n in new['rows']])-np.array([o['energies_eV'] for o in old['rows']])
    if abs(float(np.max(abs(delta)))-comparison['absolute_max_energy_difference_eV']) > 1e-14:
        raise ValueError('baseline maximum difference mismatch')
    refinements = {p.relative_to(base).as_posix():inspect_refinement(p,fe)
                   for p in sorted((fe/'experiments').glob('refined_*/RESULT.json'))}
    archive = fe/'software/qe-7.5-win-oneapi-msmpi.zip'
    acquisition = json.loads((fe/'software/ACQUISITION.json').read_text(encoding='utf-8'))
    archive_check = {'status':'NOT_AVAILABLE_FOR_REPLAY'}
    if archive.exists():
        archive_hash = sha(archive)
        if archive_hash != acquisition['archive_sha256'] or archive.stat().st_size != acquisition['archive_bytes']:
            raise ValueError('portable QE distribution differs from acquisition record')
        archive_check = {'status':'PASS','sha256':archive_hash,'bytes':archive.stat().st_size,
                         'scope':'Byte identity with recorded distributor digest; not independent compiler audit.'}
    review = {'status':'PASS','scope':'Independent raw binary C4 eigenvalue, energy, and provenance audit. Numerical finite-k evidence, not rigorous DFT error control.',
              'environment':{'python':sys.version,'numpy':np.__version__},
              'source_manifest_files_verified':source_count,'source_commit':manifest['commit'],
              'qe_archive':archive_check,
              'analyses':analyses,'executions':executions,'baseline':comparison,
              'baseline_energy_count':int(delta.size),'baseline_no_energy_shift_removed':True,
              'refinements':refinements,'inversion_fault':inspect_inversion_fault(base),
              'strict_endpoint_repeats':inspect_strict(fe),
              'mesh_baselines':{p.parent.parent.name:json.loads(p.read_text(encoding='utf-8')) for p in sorted((fe/'experiments').glob('*/baseline8/BASELINE_COMPARISON.json'))},
              'raw_points_checked':sum(r['raw_points'] for r in analyses.values()),
              'resolved_prefixes_checked':sum(r['resolved_prefixes'] for r in analyses.values()),
              'resolved_clusters_checked':sum(r['resolved_clusters'] for r in analyses.values()),
              'source_hashes':{p.relative_to(base).as_posix():sha(p) for p in [Path(__file__).resolve(),fe/'analyze_fe.py',fe/'refine_fe.py',fe/'run_fe.py',fe/'prepare_fe.py',fe/'vendor/qe_reader.py']}}
    output = base/'reviews/fe_independent_review.json'
    output.write_text(json.dumps(review,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':review['status'],'analyses':len(analyses),'raw_points':review['raw_points_checked'],
                      'resolved_prefixes':review['resolved_prefixes_checked'],'resolved_clusters':review['resolved_clusters_checked'],
                      'executions':len(executions),'output':str(output)},indent=2))


if __name__ == '__main__':
    main()
