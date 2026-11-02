"""Actual IrRep 2.1.0 and independent raw-reader comparison on identical QE data.

Only C4z little-group actions are requested. No across-path target search or
global certificate capability is imputed to the external representation tool.
"""
from pathlib import Path
from datetime import datetime,timezone
import argparse,contextlib,hashlib,importlib.metadata,importlib.util,json,os,sys,time,traceback
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
NCS=HERE.parents[1]
if (NCS/'phase9/vendor/irrep').is_dir():sys.path.insert(0,str(NCS/'phase9/vendor'))
sys.path.insert(0,str(HERE.parent/'fe'))
import numpy as np
import irrep.bandstructure as external_bandstructure
import irrep.gvectors as external_gvectors
import irrep.readfiles as external_readfiles
import irrep.spacegroup as external_spacegroup
from irrep.bandstructure import BandStructure
from irrep.gvectors import symm_matrix,Hartree_eV
import analyze_fe as independent


def sha(path):
    with Path(path).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def save(path,value):Path(path).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n',encoding='utf-8')
def portable_source(path):
    try:return Path(path).relative_to(HERE.parent).as_posix()
    except ValueError:return '<EXTERNAL_SOURCE>/'+Path(path).name
def phases(matrix):
    n=len(matrix);traces=np.array([n,*[np.trace(np.linalg.matrix_power(matrix,j)) for j in (1,2,3)]])
    chars=independent.ROOTS[:,None]**np.arange(4)[None,:];v=chars.conj()@traces/4
    return v,np.rint(v.real).astype(int)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--save',required=True);p.add_argument('--label',required=True);args=p.parse_args()
    source=Path(args.save).resolve();stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');out=HERE/'runs'/(stamp+'-'+args.label);out.mkdir(parents=True)
    started=time.perf_counter();report={'status':'RUNNING','label':args.label,'source_location':portable_source(source),'scope':'Same-input C4z little-group matrices and finite-k numerical phase counts; no external global-gluing test or topological claim.','external_product':'IrRep computes the symmetry matrices. The four-root count decomposition is performed by this adapter, not imported as an IrRep band-label report.'}
    inputs=[source/'data-file-schema.xml',*sorted(source.glob('wfc*.dat')),*sorted(source.glob('*.UPF'))];before={f.name:sha(f) for f in inputs};rows=[];matrices={}
    oldcwd=Path.cwd()
    try:
        os.chdir(out)
        with (out/'irrep.stdout.txt').open('w',encoding='utf-8') as log,contextlib.redirect_stdout(log),contextlib.redirect_stderr(log):
            meta,blocks,lattice,alat=independent.read_metadata(source)
            R,K,spincheck=independent.c4_conventions(lattice)
            b=BandStructure(code='espresso',prefix=str(source.with_suffix('')),magmom=[[0,0,-1]],include_TR=True,Ecut=None,normalize=False,calculate_traces=False,verbosity=1)
            assert b.Ecut==b.Ecut0 and len(b.kpoints)==len(blocks) and b.num_bands==32
            syms=[s for s in b.spacegroup.symmetries if not s.time_reversal and np.array_equal(s.rotation,R) and np.linalg.norm(s.translation)<1e-12]
            assert len(syms)==1,'C4z spin operation must be uniquely present'
            sym=syms[0];s0=np.asarray(sym.spinor_rotation);sign=1 if np.linalg.norm(s0-independent.SZ)<np.linalg.norm(s0+independent.SZ) else -1
            assert np.linalg.norm(sign*s0-independent.SZ)<1e-10
            report['convention']={'active_cartesian_rotation':independent.RZ.tolist(),'fractional_rotation':R.tolist(),'spin_phase_eighths':[-1,1],'count_order_phase_eighths':[7,1,3,5],'irrep_canonical_spin_lift_multiplier':sign,'irrep_spin_lift_matches_target_after_sign':float(np.linalg.norm(sign*s0-independent.SZ)),'matrix_orientation':'IrRep row-wavefunction matrix transposed to source-column -> target-column coefficients','normalization':False,'unitary_projection':False,'magnetic_direction_constraint':[0,0,-1]}
            for i,(kp,block) in enumerate(zip(b.kpoints,blocks),1):
                q=np.asarray(kp.k);cart=independent.reader.floats(block.findtext('k_point'));qraw=cart@lattice.T/alat
                assert np.max(abs(q-qraw))<1e-10
                shift=K@q-q
                if np.max(abs(shift-np.rint(shift)))>1e-9:
                    rows.append({'index_one_based':i,'k_fractional':q.tolist(),'status':'NOT_C4Z_LITTLE_GROUP_POINT'});continue
                assert kp.ig.shape[1]==int(block.findtext('npw')),'No input cutoff loss allowed'
                external=symm_matrix(K=q,K_other=q,WF=kp.WF,WF_other=kp.WF,igall=kp.ig,igall_other=kp.ig,A=sym.rotation,S=sign*s0,T=sym.translation,time_reversal=False,spinor=True,block_ind=None,return_blocks=False,unitary=False).T
                item=independent.reader.read_wfc(source/f'wfc{i}.dat');item['k']=qraw
                frame,image,missing,_=independent.rotate_frame(item,K);raw=frame.conj().T@image
                energies=independent.reader.floats(block.findtext('eigenvalues'))*independent.HARTREE_EV
                diagnostic=independent.analyze_frame(energies,frame,image,missing)
                extphase,extcounts=phases(external[:18,:18]);rawphase,rawcounts=phases(raw[:18,:18])
                # Verify both parsers retained the same complete coefficient set,
                # independent of their different Miller-vector sorting choices.
                lookup={tuple(g):j for j,g in enumerate(item['gvectors'])};perm=[lookup[tuple(g)] for g in kp.ig[:3].T]
                wf_expected=item['waves'][:,:,perm].reshape(32,-1)
                coefficient_error=float(np.max(abs(kp.WF-wf_expected)))
                matrix_error=float(np.max(abs(external-raw)));phase_error=float(np.max(abs(extphase-rawphase)))
                # IrRep explicitly uses right_inverse(WF), even when unitary=False.
                # Its column-coordinate map is G^-1 B, whereas the raw checker
                # reports the overlap B=Phi^dagger T Phi. This exact coordinate
                # relation is not a polar repair or fitted basis adjustment.
                gram=frame.conj().T@frame
                coordinate=np.linalg.solve(gram,raw)
                coordinate_error=float(np.max(abs(external-coordinate)))
                energy_error=float(np.max(abs(np.asarray(kp.Energy_raw)-energies)))
                energy_common=float(np.max(abs(np.asarray(kp.Energy_raw)/float(Hartree_eV)*independent.HARTREE_EV-energies)))
                okay=coefficient_error<1e-12 and coordinate_error<1e-10 and phase_error<1e-9 and np.array_equal(extcounts,rawcounts) and energy_common<1e-10
                status=diagnostic['prefix']['status']
                row={'index_one_based':i,'k_fractional':q.tolist(),'status':'PASS_NUMERICAL_SAME_INPUT' if okay else 'MISMATCH','raw_band18_prefix_status':status,'delta18_eV':diagnostic['delta18_eV'],'irrep_unrounded_phase_counts':[[float(z.real),float(z.imag)] for z in extphase],'raw_unrounded_phase_counts':[[float(z.real),float(z.imag)] for z in rawphase],'irrep_nearest_integer_counts':extcounts.tolist(),'raw_nearest_integer_counts':rawcounts.tolist(),'assigned_counts_only_if_raw_prefix_resolved':rawcounts.tolist() if status=='ASSIGNED_NUMERICALLY' else None,'coefficient_max_abs_discrepancy':coefficient_error,'matrix32_direct_overlap_discrepancy':matrix_error,'matrix32_same_coordinate_discrepancy':coordinate_error,'gram32_max_abs_nonorthogonality':float(np.max(abs(gram-np.eye(32)))),'matrix18_direct_overlap_discrepancy':float(np.max(abs(external[:18,:18]-raw[:18,:18]))),'phase_count_max_abs_discrepancy':phase_error,'energy_eV_different_constant_discrepancy':energy_error,'energy_eV_common_constant_discrepancy':energy_common,'irrep_full_plane_wave_count':int(kp.ig.shape[1]),'raw_prefix_diagnostics':diagnostic['prefix']}
                rows.append(row);matrices[f'irrep_k{i:04d}']=external;matrices[f'raw_overlap_k{i:04d}']=raw;matrices[f'raw_coordinates_k{i:04d}']=coordinate
            report['source_qe_version']=meta['qe_version'];report['energy_constants']={'IrRep_Hartree_eV':float(Hartree_eV),'independent_Hartree_eV':independent.HARTREE_EV};report['actual_irrep_C4_calls']=len(matrices)//3
            report['comparison_semantics']={'IrRep':'Coordinate map G^-1 B from right_inverse(WF); unitary=False does not remove Gram inverse.','independent_raw':'Overlap B=Phi^dagger T Phi; same-coordinate comparison uses solve(G,B), with G=Phi^dagger Phi.','energy':'Convert both documented Hartree-to-eV constants to the independent checker constant; no fitted offset.','thresholds':{'raw_coefficient':1e-12,'same_coordinate_matrix':1e-10,'phase_counts':1e-9,'common_constant_energy_eV':1e-10}}
        np.savez_compressed(out/'same_input_matrices.npz',**matrices)
        report['status']='PASS_NUMERICAL_SAME_INPUT' if rows and all(r['status'] in ('PASS_NUMERICAL_SAME_INPUT','NOT_C4Z_LITTLE_GROUP_POINT') for r in rows) and matrices else 'MISMATCH'
    except Exception as exc:
        report.update(status='FAILED',error=repr(exc));(out/'traceback.txt').write_text(traceback.format_exc(),encoding='utf-8')
    finally:os.chdir(oldcwd)
    after={f.name:sha(f) for f in inputs};report.update(input_files_sha256=before,input_files_unchanged=before==after,rows=rows,seconds=time.perf_counter()-started)
    if before!=after:report['status']='INPUT_CHANGED'
    report['dependencies']={name:importlib.metadata.version(name) for name in ('irrep','numpy','spglib','scipy')}
    sources={'comparison/compare_irrep_c4.py':Path(__file__),'irrep/bandstructure.py':Path(external_bandstructure.__file__),'irrep/gvectors.py':Path(external_gvectors.__file__),'irrep/readfiles.py':Path(external_readfiles.__file__),'irrep/spacegroup.py':Path(external_spacegroup.__file__),'fe/analyze_fe.py':HERE.parent/'fe/analyze_fe.py','fe/vendor/qe_reader.py':HERE.parent/'fe/vendor/qe_reader.py'}
    report['source_sha256']={key:sha(f) for key,f in sources.items()};report['output_sha256']={f.name:sha(f) for f in out.iterdir() if f.is_file()}
    save(out/'RESULTS.json',report);save(HERE/(args.label+'_LATEST.json'),{'status':report['status'],'path':(out/'RESULTS.json').relative_to(HERE).as_posix()})
    print(json.dumps({k:report.get(k) for k in ('status','label','actual_irrep_C4_calls','seconds','error','input_files_unchanged')}));return 0 if report['status']=='PASS_NUMERICAL_SAME_INPUT' else 1


if __name__=='__main__':raise SystemExit(main())
