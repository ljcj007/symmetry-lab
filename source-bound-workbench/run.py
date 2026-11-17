"""One entry for the affine receiver, regression suite and pinned Si delivery."""
from pathlib import Path
import argparse, datetime, hashlib, importlib.util, json, subprocess, sys, uuid

ROOT = Path(__file__).resolve().parent

def pin(path):
    path=Path(path)
    with path.open('rb') as stream:
        digest=hashlib.file_digest(stream,'sha256').hexdigest()
    return {'bytes':path.stat().st_size,'sha256':digest}

def new_output(value=None):
    out=Path(value).resolve() if value else ROOT/'runs'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'_'+uuid.uuid4().hex[:8])
    if out.exists():raise ValueError('Output must be a new directory; existing results are never overwritten.')
    out.mkdir(parents=True)
    return out

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('task',choices=['suite','verify','si925-documentary','serve'])
    p.add_argument('--input');p.add_argument('--out');p.add_argument('--delivery-dir')
    p.add_argument('--port',type=int,default=8765)
    args=p.parse_args()
    if args.task=='serve':
        import functools,http.server
        handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'site'))
        with http.server.ThreadingHTTPServer(('127.0.0.1',args.port),handler) as server:
            print(f'Workbench: http://127.0.0.1:{server.server_port}/',flush=True)
            server.serve_forever()
        return 0
    if args.task=='si925-documentary':
        if not args.delivery_dir:p.error('--delivery-dir is required')
        delivery=Path(args.delivery_dir).resolve();manifest=delivery/'DELIVERY_INPUTS.json';entry=delivery/'receive_delivery_v1.py'
        expected='dd97dffbeb34285435e20e29e2b98559288b89e7c8804a33eac2f2d79fa3e249'
        if pin(manifest)['sha256']!=expected:raise ValueError('Unrecognized delivery manifest; this adapter only accepts the pinned Si925 v1 package.')
        m=json.loads(manifest.read_text(encoding='utf-8'))
        entry_pin=m['files']['receive_delivery_v1.py']
        if pin(entry)!=entry_pin:raise ValueError('Delivery entry bytes do not match the pinned manifest.')
        if args.out:
            out=Path(args.out).resolve()
            if out.exists() or out.is_relative_to(delivery):raise ValueError('Use a new output outside the immutable delivery.')
        else:out=ROOT/'runs'/('si925_'+uuid.uuid4().hex[:12])
        out.parent.mkdir(parents=True,exist_ok=True)
        print('Running the pinned documentary entry; existing proofs are received, matrix calculations are not repeated.',flush=True)
        return subprocess.run([sys.executable,'-I','-B',str(entry),'--inputs-sha256',expected,'--out',str(out)]).returncode
    spec=importlib.util.spec_from_file_location('source_receiver',ROOT/'src/verify.py');receiver=importlib.util.module_from_spec(spec);spec.loader.exec_module(receiver)
    out=new_output(args.out)
    if args.task=='verify':
        if not args.input:p.error('--input is required')
        inputs=[Path(args.input).resolve()];expected={}
    else:
        inputs=sorted((ROOT/'examples').glob('*.json'))
        expected={'positive-gap':'CERTIFIED','periodic-gap':'CERTIFIED','wrong-window':'UNRESOLVED','overlap':'UNRESOLVED','wrong-symmetry':'REJECTED','malformed-source':'REJECTED'}
    rows=[]
    for source in inputs:
        try:report=receiver.verify(receiver.load_packet(source))
        except (receiver.PacketError,OSError) as exc:report={'schema':receiver.RECEIPT,'status':'REJECTED','reason_codes':[getattr(exc,'code','INPUT_IO_ERROR')],'message':str(exc),'checks':{},'scope':receiver.SCOPE}
        (out/(source.stem+'.receipt.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        row={'example':source.name,'input':pin(source),'status':report['status']}
        if source.stem in expected:row.update(expected=expected[source.stem],matches_expected=report['status']==expected[source.stem])
        rows.append(row)
    ok=all(row.get('matches_expected',row['status']=='CERTIFIED') for row in rows)
    summary={'schema':'source-bound-workbench.run.v1','status':'PASS' if ok else 'FAIL','task':args.task,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'receiver':pin(ROOT/'src/verify.py'),'results':rows,'scope':'New exact rational receiver execution for the affine finite-source profile. A passing negative control does not assert a physical gap closure. No material-DFT replay is implied.'}
    (out/'RUN.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':summary['status'],'output':str(out),'results':rows},indent=2))
    return 0 if ok else 2

if __name__=='__main__':
    try:raise SystemExit(main())
    except (ValueError,KeyError,OSError) as exc:print(str(exc),file=sys.stderr);raise SystemExit(3)
