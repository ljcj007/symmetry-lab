"""Execute every ablation layer as a separate recipient process.

These layers are OUR implementations, not proxy executions of other software.
"""
from pathlib import Path
from fractions import Fraction as F
import argparse, copy, hashlib, json, subprocess, sys, time
sys.path.insert(0, str(Path(__file__).parent / 'vendor'))
import exact_paths as A

ROOT=Path(__file__).resolve().parent
LAYERS=['local','boundary','period','atlas','source']


def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')


def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()


def negate(raw):return A.encode_matrix(A.neg(A.decode_matrix(raw)))


def cases(problem,original):
    yield 'valid-original',problem,original,None
    p,c=copy.deepcopy(problem),copy.deepcopy(original)
    h=A.padd({A.O:tuple(F(1,2)*x for x in A.root(F(1,8)))},{A.O:tuple(-F(1,2)*x for x in A.root(F(3,8)))})
    ih=A.pmul(h,{A.O:A.root(F(1,4))});V=[[h,ih],[ih,h]]
    for g,raw in list(c['carrier'].items()):c['carrier'][g]=A.encode_matrix(A.mul(A.mul(V,A.decode_matrix(raw)),A.adj(A.conj(V) if g in ('T','MT') else V)))
    c['source_gauge']=A.encode_matrix(A.mul(V,A.decode_matrix(c['source_gauge'])))
    for row in c['cells']:row['embedding']=A.encode_matrix(A.mul(V,A.decode_matrix(row['embedding'])))
    c['periods']=[A.encode_matrix(A.mul(A.mul(V,A.decode_matrix(raw)),A.adj(V))) for raw in c['periods']]
    for row in c['atlas']:row['matrix']=A.encode_matrix(A.mul(A.mul(V,A.decode_matrix(row['matrix'])),A.adj(V)))
    yield 'valid-complex-frame',p,c,None
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['geometry']['cells'][0]['stabilizer']=['E'];yield 'wrong-stabilizer',p,c,'geometry'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);U=A.decode_matrix(c['source_gauge']);J=A.decode_matrix(p['source_carrier']['T']);c['carrier']['T']=A.encode_matrix(A.mul(A.mul(U,J),A.adj(U)));yield 'omit-anti-conjugation',p,c,'local'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['catalogues']['M']['branches'][1]['matrices']['M']=copy.deepcopy(c['catalogues']['M']['branches'][0]['matrices']['M']);yield 'duplicate-mirror-branch',p,c,'local'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['boundaries'][0]['matrix']=negate(c['boundaries'][0]['matrix']);yield 'unitary-wrong-boundary',p,c,'boundary'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['boundaries'].pop();yield 'omitted-boundary',p,c,'boundary'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['seams'][0]['matrix']=negate(c['seams'][0]['matrix']);yield 'unitary-wrong-seam',p,c,'period'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['seams'].pop();yield 'omitted-period-identification',p,c,'period'
    p,c=copy.deepcopy(problem),copy.deepcopy(original);c['atlas'][0]['matrix']=negate(c['atlas'][0]['matrix']);yield 'unitary-wrong-atlas',p,c,'atlas'
    p,c=copy.deepcopy(problem),copy.deepcopy(original)
    for g in ('M','MT'):c['carrier'][g]=negate(c['carrier'][g])
    for row in c['catalogues'].values():
        for branch in row['branches']:
            for g in ('M','MT'):
                if g in branch['matrices']:branch['matrices'][g]=negate(branch['matrices'][g])
    yield 'internally-consistent-wrong-source-character',p,c,'source'


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',default=str(ROOT/'results'));args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    problem=json.loads((ROOT/'fixtures/mirror/problem.json').read_text(encoding='utf-8'));original=json.loads((ROOT/'fixtures/mirror/certificate.json').read_text(encoding='utf-8'))
    records=[];all_good=True
    for name,p,c,failed_stage in cases(problem,original):
        pp=out/'cases'/(name+'.problem.json');cp=out/'cases'/(name+'.certificate.json');save(pp,p);save(cp,c)
        row={'id':name,'expected_first_failure':failed_stage,'problem_sha256':digest(p),'certificate_sha256':digest(c),'layers':{}}
        for i,layer in enumerate(LAYERS):
            before=time.perf_counter();proc=subprocess.run([sys.executable,str(ROOT/'verify.py'),'--problem',str(pp),'--certificate',str(cp),'--layer',layer],capture_output=True,text=True,encoding='utf-8');elapsed=time.perf_counter()-before
            result=json.loads(proc.stdout);save(out/'outputs'/(name+'.'+layer+'.json'),result)
            expected_pass=failed_stage is None or (failed_stage in LAYERS and i<LAYERS.index(failed_stage))
            passed=result['status'] in ('CERTIFIED','PASS_REQUESTED_LAYER');okay=passed==expected_pass and (passed or result.get('stage')==failed_stage)
            all_good &= okay
            row['layers'][layer]={'status':result['status'],'stage':result.get('stage'),'exit_code':proc.returncode,'seconds':elapsed,'matches_expectation':okay,'result_path':'outputs/'+name+'.'+layer+'.json'}
            if proc.stderr:(out/'outputs'/(name+'.'+layer+'.stderr.txt')).write_text(proc.stderr,encoding='utf-8')
        records.append(row);print(json.dumps({'case':name,'matches_expectation':all(x['matches_expectation'] for x in row['layers'].values())}),flush=True)
    summary={'schema':'mirror-grey-workflow-ablation-results-v1','status':'PASS' if all_good else 'FAIL','cases':len(records),'recipient_cli_executions':len(records)*len(LAYERS),'records':records,'comparison_scope':'Each layer is an actually executed prefix of our recipient. No layer is attributed to an external package; external spgrep calls are recorded separately.','source_hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'produce.py',ROOT/'verify.py',ROOT/'run_benchmark.py',ROOT/'vendor/exact_paths.py']}}
    save(out/'RESULTS.json',summary);return 0 if all_good else 1


if __name__=='__main__':raise SystemExit(main())
