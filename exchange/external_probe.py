"""Actual optional spgrep unitary-reference calls; never a global-validator proxy."""
from pathlib import Path
import argparse, hashlib, json, sys


def main():
    p=argparse.ArgumentParser();p.add_argument('--spgrep-path');p.add_argument('--hsnf-path');p.add_argument('--output',required=True);args=p.parse_args()
    if args.hsnf_path:sys.path.insert(0,args.hsnf_path)
    if args.spgrep_path:sys.path.insert(0,args.spgrep_path)
    try:
        import numpy as np
        import spgrep
        import spgrep.symmetry.enumerate as enum
        records=[]
        for key,mirror in [('E',False),('M',True),('T',False),('MT',False),('FULL',True)]:
            rotations=np.array([np.eye(3,dtype=int),[[0,1,0],[1,0,0],[0,0,1]]] if mirror else [np.eye(3,dtype=int)])
            factor=np.ones((len(rotations),len(rotations)),dtype=complex)
            if mirror:factor[1,1]=-1
            irreps,indicators=enum.enumerate_unitary_irreps(rotations,factor,method='Neto')
            raw=[[[[[float(z.real),float(z.imag)] for z in row] for row in matrix] for matrix in rep] for rep in irreps]
            characters=[complex(np.trace(rep[-1])) for rep in irreps]
            expected=[1j,-1j] if mirror else [1+0j]
            err=max(min(abs(x-y) for y in expected) for x in characters)
            okay=len(irreps)==len(expected) and all(rep.shape[1]==1 for rep in irreps) and err<1e-10
            records.append({'little_class':key,'input_unitary_rotations':rotations.tolist(),'input_factor':[[[float(z.real),float(z.imag)] for z in row] for row in factor],'irreps_real_imag':raw,'indicators':[int(x) for x in indicators],'dimension_and_character_check':okay,'max_character_discrepancy':err})
        result={'status':'PASS' if all(r['dimension_and_character_check'] for r in records) else 'FAIL','package':'spgrep','version':getattr(spgrep,'__version__','unknown'),'api':'spgrep.symmetry.enumerate.enumerate_unitary_irreps','source_sha256':hashlib.sha256(Path(enum.__file__).read_bytes()).hexdigest(),'actual_calls':len(records),'records':records,'scope':'Unitary-kernel representation generation only. Antiunitary catalogue completion is our analytic producer. No external boundary, seam, atlas or source-binding check was executed or alleged to fail.'}
    except ImportError as exc:result={'status':'NOT_RUN','reason':str(exc),'scope':'Optional external comparison dependency absent; no result is imputed.'}
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':result['status'],'actual_calls':result.get('actual_calls',0)}));return 0 if result['status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
