"""Adversarial protocol and resource cases, executed through the public CLI."""
from pathlib import Path
import argparse, copy, hashlib, json, subprocess, sys

ROOT=Path(__file__).resolve().parent


def bind(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'contract_results'));args=parser.parse_args();out=Path(args.output)
    basep=json.loads((ROOT/'fixtures/mirror/problem.json').read_text());basec=json.loads((ROOT/'fixtures/mirror/certificate.json').read_text());records=[]
    def case(name,alter,status,stage):
        p,c=copy.deepcopy(basep),copy.deepcopy(basec);alter(p,c);c['problem_sha256']=bind(p)
        pp=out/(name+'.problem.json');cp=out/(name+'.certificate.json');write(pp,p);write(cp,c)
        proc=subprocess.run([sys.executable,str(ROOT/'verify.py'),'--problem',str(pp),'--certificate',str(cp)],capture_output=True,text=True,encoding='utf-8');r=json.loads(proc.stdout);write(out/(name+'.result.json'),r)
        okay=r['status']==status and (stage is None or r.get('stage')==stage)
        records.append({'id':name,'expected_status':status,'expected_stage':stage,'actual_status':r['status'],'actual_stage':r.get('stage'),'matches_expectation':okay,'exit_code':proc.returncode})
    case('missing-z-period-axis',lambda p,c:p['geometry_problem'].__setitem__('period_axes',[0,1]),'INVALID','contract')
    case('no-period-axis',lambda p,c:p['geometry_problem'].__setitem__('period_axes',[]),'INVALID','contract')
    case('nonobject-geometry-problem',lambda p,c:p.__setitem__('geometry_problem',[]),'INVALID','contract')
    case('omitted-period-axis-means-all-three',lambda p,c:p['geometry_problem'].pop('period_axes'),'CERTIFIED',None)
    case('forged-physical-scope',lambda p,c:p.__setitem__('scope','All magnetic materials are topological'),'INVALID','contract')
    case('float-rank',lambda p,c:p.__setitem__('rank',2.0),'INVALID','contract')
    case('boolean-reference-dimension',lambda p,c:c['catalogues']['E']['branches'][0].__setitem__('dimension',True),'INVALID','local')
    case('boolean-selected-multiplicity',lambda p,c:c['catalogues']['M'].__setitem__('multiplicities',[True,True]),'INVALID','local')
    def many_charts(p,c):
        p['charts']=[dict(p['charts'][0],id='b'+str(i)) for i in range(17)]
    case('atlas-chart-budget',many_charts,'UNRESOLVED','atlas')
    def coverage_budget(p,c):
        p['charts']=[{'id':'b'+str(i),'lower':[str(i)+'/100']*3,'upper':[str(i+50)+'/100']*3} for i in range(16)]
    case('atlas-coverage-budget',coverage_budget,'UNRESOLVED','atlas')
    def irrational_phase(p,c):c['carrier']['E'][0][0][0]['phase']='1/16'
    case('unsupported-field',irrational_phase,'UNRESOLVED','local')
    case('huge-rational',lambda p,c:p['charts'][0]['lower'].__setitem__(0,str(2**300)),'UNRESOLVED','atlas')
    case('duplicate-cell',lambda p,c:c['cells'].append(copy.deepcopy(c['cells'][0])),'INVALID','local')
    case('duplicate-atlas-component',lambda p,c:c['atlas'].append(copy.deepcopy(c['atlas'][0])),'INVALID','atlas')
    def bool_seam(p,c):
        row=next(r for r in c['seams'] if r['axis']==1);row['axis']=True
    case('boolean-seam-axis',bool_seam,'INVALID','period')
    def bool_shift(p,c):
        row=next(r for r in c['atlas'] if 1 in r['shift']);row['shift'][row['shift'].index(1)]=True
    case('boolean-atlas-shift',bool_shift,'INVALID','atlas')
    # The helper deliberately rebinds edits. A separate literal stale binding
    # case makes sure a submitter cannot reuse the old hash.
    p,c=copy.deepcopy(basep),copy.deepcopy(basec);c['problem_sha256']='0'*64
    pp=out/'stale-binding.problem.json';cp=out/'stale-binding.certificate.json';write(pp,p);write(cp,c)
    proc=subprocess.run([sys.executable,str(ROOT/'verify.py'),'--problem',str(pp),'--certificate',str(cp)],capture_output=True,text=True);r=json.loads(proc.stdout);write(out/'stale-binding.result.json',r)
    records.append({'id':'stale-binding','matches_expectation':r['status']=='INVALID' and r['stage']=='contract','actual_status':r['status'],'actual_stage':r.get('stage')})
    result={'status':'PASS' if all(r['matches_expectation'] for r in records) else 'FAIL','cases':len(records),'records':records,'source_sha256':hashlib.sha256((ROOT/'verify.py').read_bytes()).hexdigest()};write(out/'RESULTS.json',result);print(json.dumps(result,indent=2));return 0 if result['status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
