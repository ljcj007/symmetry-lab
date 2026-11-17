"""Genuine source-bound two-Q derivation and grading API references."""
from copy import deepcopy
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import math
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
spec=importlib.util.spec_from_file_location('supplied_mode_refs',ROOT/'scripts/build-phonopy-scattering-reference.py')
ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)


def inputs():
    supplied=ref.zno_input()
    metadata=json.loads((ROOT/'dist/data/examples/phonopy-zno-scattering-source.json').read_text(encoding='utf8'))
    supplied['scatteringLengthSource']=metadata['probe']['source']['title']+'; '+metadata['probe']['source']['url']
    # Match a literal browser JSON request for ordinary parameter numbers. Raw
    # source texts and frozen synthetic data are never numerically rewritten.
    for key in ('temperature','sigma','energyMin','energyMax'):
        supplied[key]=int(supplied[key])
    real={'input':supplied,'comparisonG':[1,0,0],'branchIndex':10,'atomIndex':2}
    same=deepcopy(real);same['comparisonG']=[1,1,0]
    cutoff=deepcopy(real);cutoff.update(branchIndex=0,atomIndex=0,comparisonG=[1,0,1])
    cutoff['input'].update(qIndex=0,G=[0,0,1])
    zero=deepcopy(real);zero.update(branchIndex=6,comparisonG=[0,0,0])
    zero['input'].update(qIndex=0,G=[0,0,0])
    synthetic=ref.synthetic_input();synthetic['channel']='creation';synthetic.pop('negativeQIndex')
    general={'input':synthetic,'comparisonG':[0,1,0],'branchIndex':0,'atomIndex':1}
    return [('zno-two-G',real),('zno-same-G',same),('zno-cutoff',cutoff),('zno-zero-Q',zero),('synthetic-complex',general)]


def complete_answers(result):
    return {task['id']:deepcopy(task['expected']) for task in result['tasks'] if task['available']}


def grade_requests(real, derived, cutoff, cut_derived):
    common={**deepcopy(real),'mode':'grade','forFingerprint':derived['fingerprint']}
    correct={**deepcopy(common),'answers':complete_answers(derived)}
    wrong={**deepcopy(common),'answers':{}}
    for point in derived['contrasts'][0]['points']:
        wrong['answers'][point['id']+'.coherentStrength']={'re':[[point['strength']]],'im':[[0.]]}
    square={**deepcopy(common),'answers':{point['id']+'.coherentStrength':{'re':[[point['strength']]],'im':[[0.]]} for point in derived['contrasts'][2]['points']}}
    partial={**deepcopy(common),'answers':{'A.coherentStrength':{'re':[[derived['points'][0]['result']['channels'][0]['branches'][10]['strength']]],'im':[[0.]]}}}
    paired={**deepcopy(common),'answers':{point['id']+'.coherentStrength':{'re':[[point['result']['channels'][0]['branches'][10]['strength']]],'im':[[0.]]} for point in derived['points']}}
    malformed={**deepcopy(common),'answers':{'A.QCartesian':'not a matrix','mode.massScaledEigenvector':[[True,0,0]],'A.weight':[[0,0]]}}
    excluded={**deepcopy(cutoff),'mode':'grade','forFingerprint':cut_derived['fingerprint'],'answers':complete_answers(cut_derived)}
    return [('grade-correct',correct),('grade-missing-conjugation',wrong),('grade-square-first',square),
        ('grade-one-point-only',partial),('grade-two-point-correct',paired),('grade-malformed',malformed),('grade-excluded-correct',excluded)]


def rejection_inputs(real, derived):
    rows=[]
    p=deepcopy(real);p['reference']={};rows.append(('client-reference',p))
    p=deepcopy(real);p['input']['channel']='both';rows.append(('implicit-channel-conversion',p))
    p=deepcopy(real);p['input']['Q']=[1.25,1,.25];rows.append(('explicit-Q',p))
    p=deepcopy(real);p['input']['QCoordinates']='cartesian-angstrom^-1';rows.append(('wrong-coordinate-contract',p))
    p=deepcopy(real);p['comparisonG'][0]=1.;rows.append(('noninteger-G',p))
    p=deepcopy(real);p['branchIndex']=True;rows.append(('boolean-index',p))
    p=deepcopy(real);p['input']['primitiveOrderConfirmed']=False;rows.append(('unconfirmed-order',p))
    p=deepcopy(real);p.update(mode='grade',forFingerprint=derived['fingerprint'],answers={})
    p['input']['temperature']=101.;rows.append(('stale-source-fingerprint',p))
    p=deepcopy(real);p.update(mode='grade',forFingerprint='0'*64,answers={});rows.append(('forged-fingerprint',p))
    p=deepcopy(real);p.update(mode='grade',forFingerprint=derived['fingerprint'],answers={'client.target':[[1]]});rows.append(('unknown-task',p))
    return rows


def compare(a,b,path='fixture'):
    assert type(a) is type(b),path+': type'
    if isinstance(a,dict):
        assert list(a)==list(b),path+': keys/order'
        for key in a:compare(a[key],b[key],path+'/'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path+': shape'
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+'/'+str(i))
    elif type(a) is float:
        assert math.isfinite(a) and math.isfinite(b) and math.isclose(a,b,rel_tol=2e-11,abs_tol=2e-11),path+': numeric'
    else:assert a==b,path+': exact value'


def build(check=False):
    from browser_api import run
    cases=[];derived={}
    requests=inputs()
    for case_id,payload in requests:
        result=run('phonopy_derivation',deepcopy(payload));derived[case_id]=result
        assert result['checks']['bothCoreChecksPassed'] and len(result['tasks'])==19
        cases.append({'id':case_id,'action':'phonopy_derivation','input':payload,'result':result})
    for case_id,payload in grade_requests(requests[0][1],derived['zno-two-G'],requests[2][1],derived['zno-cutoff']):
        result=run('phonopy_derivation',deepcopy(payload))
        cases.append({'id':case_id,'action':'phonopy_derivation','input':payload,'result':result})
    rejections=[]
    for case_id,payload in rejection_inputs(requests[0][1],derived['zno-two-G']):
        try:run('phonopy_derivation',deepcopy(payload))
        except ValueError as error:rejections.append({'id':case_id,'action':'phonopy_derivation','input':payload,'errorType':'ValueError','error':str(error)})
        else:raise AssertionError('Invalid derivation request was accepted: '+case_id)
    files=['dist/python/phonopy_derivation.py','dist/python/symmetry_grading.py','dist/python/phonopy_scattering.py',
        'dist/python/phonopy_import.py','dist/python/browser_api.py']
    document={'schema':'symmetry-lab-phonopy-derivation-fixture-1',
        'method':'Twenty-two actual browser_api.run requests: five derivations, seven source-bound grade results and ten genuine rejected requests. Each successful request invokes the unchanged supplied-mode scattering calculation at two integer G values. Raw ZnO and frozen synthetic sources are retained.',
        'sourceHashEncoding':'utf8-lf-v1','sourceHashes':{f:hashlib.sha256((ROOT/f).read_text(encoding='utf8').encode('utf8')).hexdigest() for f in files},
        'cases':cases,'rejections':rejections}
    target=ROOT/'scripts/fixtures/phonopy-derivation.json'
    if check:compare(document,json.loads(target.read_text(encoding='utf8')))
    else:target.write_bytes((json.dumps(document,ensure_ascii=False,indent=2,allow_nan=False)+'\n').encode('utf8'))
    print(json.dumps({'cases':len(cases),'rejections':len(rejections),'actualAPIRequests':len(cases)+len(rejections),'checked':check,'bytes':target.stat().st_size}))
    return document


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    build(parser.parse_args().check)
