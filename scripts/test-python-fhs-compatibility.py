"""Strict same-host compatibility with the immutable pre-replay core."""
from pathlib import Path
from copy import deepcopy
import gzip
import hashlib
import json
import sys
import types

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import quantum_geometry_lab as current

BASELINE_COMMIT='7639fcc2155580e734c8043d4a97adc9865d941c'
BASELINE_SHA256='41f8b521449b01dccf7ff347c7e1694395db30f4c5ff723b329d383d1c910f7b'
SOURCE=ROOT/'scripts/fixtures/fhs-baseline-source.py.gz'

def historical_core():
    raw=gzip.decompress(SOURCE.read_bytes())
    assert hashlib.sha256(raw).hexdigest()==BASELINE_SHA256
    module=types.ModuleType('immutable_pre_fhs_replay')
    module.__file__=str(SOURCE)
    exec(compile(raw.decode('utf8'),str(SOURCE),'exec'),module.__dict__)
    return module

def exact_old_fields(old,new,path='result'):
    numeric=other=0
    if isinstance(old,dict):
        assert isinstance(new,dict) and set(old)==set(new),(path,'fields')
        for key in old:
            a,b=exact_old_fields(old[key],new[key],path+'/'+key);numeric+=a;other+=b
    elif isinstance(old,list):
        assert isinstance(new,list) and len(old)==len(new),(path,'shape')
        for i,(x,y) in enumerate(zip(old,new)):
            a,b=exact_old_fields(x,y,path+'/'+str(i));numeric+=a;other+=b
    else:
        assert type(old)==type(new),(path,type(old),type(new))
        assert old==new,(path,old,new)
        if type(old) in (int,float):numeric+=1
        else:other+=1
    return numeric,other

def check():
    old_core=historical_core()
    requests=[]
    for filename in ['quantum-materials.json','response-materials.json']:
        data=json.loads((ROOT/'scripts/fixtures'/filename).read_text(encoding='utf8'))
        requests.extend(item['input'] for item in data['requests'].values() if item['action']=='quantum_geometry_lab')
    requests.extend(dict(model='qwz',mass=mass,mesh=mesh,pathSamples=31,gaugeStrength=4)
                    for mass,mesh in [(-3,9),(-1,9),(1,9),(3,9),(-2,9),(0,10),(2,10),(-1.95,31)])
    requests.extend([dict(model='ssh',t1=0,t2=1,mesh=9,pathSamples=31),
                     dict(model='ssh',t1=1,t2=1,mesh=10,pathSamples=31),
                     dict(model='ssh',t1=0,t2=0,mesh=9,pathSamples=31)])
    numeric=other=0
    for request in requests:
        old=old_core.run(deepcopy(request));new=current.run(deepcopy(request))
        assert 'fhsReplay' not in old
        assert 'fhsReplay' in new
        assert set(new)==set(old)|{'fhsReplay'}
        if new['parameters']['model']=='ssh':assert new['fhsReplay'] is None
        a,b=exact_old_fields(old,{k:v for k,v in new.items() if k!='fhsReplay'})
        numeric+=a;other+=b
    # The old core executes here, rather than treating archived libm outputs as
    # cross-platform bitwise expectations. Scientific replay checks are separate.
    assert callable(old_core._fhs) and callable(current._fhs)
    report={'mode':'strict-same-host-immutable-source','baselineCommit':BASELINE_COMMIT,
            'baselineSourceSHA256':BASELINE_SHA256,'requests':len(requests),
            'numericLeavesExactlyUnchanged':numeric,'otherLeavesExactlyUnchanged':other}
    print(json.dumps(report))
    return report

if __name__=='__main__':check()
