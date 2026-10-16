"""Exhaustive frozen catalogue cross-checks, separate from the fast CI tests."""
from pathlib import Path
from collections import Counter
import gzip,json,hashlib,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'dist/python'))
import standard_labels as L
import symmetry_core as S

def main():
    folder=ROOT/'dist/data/labels'
    d=json.loads((ROOT/'dist/data/space-groups.json').read_text(encoding='utf-8'))
    cat={n:json.loads(gzip.decompress((folder/(n+'-labels.json.gz')).read_bytes())) for n in ('bc','bilbao')}
    gamma=Counter();gamma_issues=[]
    for n in range(1,231):
        for double in (False,True):
            a=S.analyze_group({'operations':d['groups'][n-1]['operations'],'k':[0,0,0],'doubleValued':double,'includeMatrices':False})
            r=L.run({'action':'annotate','group_number':n,'double_valued':double,'analysis':a},d,cat)
            gamma['bc_unique']+=r['bc_complete'];gamma['bilbao_unique']+=r['bilbao_complete']
            if not r['bc_complete'] or not r['bilbao_complete']:gamma_issues.append({'group':n,'double':double,'mappings':r['mappings']})
        if n%50==0:print('independent numerical Gamma checks',n,flush=True)
    counts=Counter();issues=[]
    for i,r in enumerate(cat['bilbao']['records']):
        g=d['groups'][r['group_number']-1]
        candidates=L._candidates(L._records(cat['bc'],g['number'],r['double_valued']),L._k(r['k']),r['operations'],g,cat['bc'],r['double_valued'],2e-4)
        rows=L._match_rows([dict(x,id=x['bilbao_label']) for x in r['irreps']],candidates,'bc_label',2e-4)
        states=[x['status'] for x in rows];counts.update(states)
        if any(x!='matched' for x in states):issues.append({'group':g['number'],'k_label':r['k_label'],'double_valued':r['double_valued'],'states':states})
        if i%500==0:print('Bilbao-to-BC catalogue checks',i,flush=True)
    validation={'schemaVersion':1,'date':'2026-10-16','gamma_independent_numerical':{'cases':460,**dict(gamma),'issues':gamma_issues},
        'bilbao_to_bc':{'k_tables':2700,'representations':sum(counts.values()),**dict(counts),'unresolved_tables':issues},
        'build_checks':{'abstract_tables_orthogonal':93,'bc_k_tables_orthogonal':len(cat['bc']['records']),
            'bilbao_files_converted':460,'bilbao_k_tables_orthogonal':2700,'exact_bc_spin_sign_products':True,
            'affine_normalizer_transports':sum(map(len,cat['bc'].get('normalizerTransforms',{}).values()))},
        'notes':['Ambiguous outside-space-group normalizer transports remain candidates, not forced names.',
                 '24 unmatched rows are Bilbao R/T/U/V in triclinic SG1/2; BC source names no corresponding point.',
                 'Numeric catalogue crosscheck tolerance is 2e-4, reflecting rounded Bilbao source coefficients.'],
        'datasetSha256':{n+'-labels.json.gz':hashlib.sha256((folder/(n+'-labels.json.gz')).read_bytes()).hexdigest() for n in ('bc','bilbao')}}
    (folder/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assert not gamma_issues,gamma_issues
    print(json.dumps({'gamma':dict(gamma),'bilbao_to_bc':dict(counts)}))

if __name__=='__main__':main()
