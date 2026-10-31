"""Real Python outputs used by the UI workflow regression test."""
from pathlib import Path
import hashlib, json, math, sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from shg_lab import run
requests=[]
for model,coefficients,ratio in [('centrosymmetric',{},1),('gaas',{'xyz':1},1),('batio3',{'xxz':1,'zxx':.7,'zzz':1.5},1.01)]:
    requests.append(dict(model=model,coefficients=coefficients,cOverA=ratio,cut='001',incidence=45,azimuth=30,channel='PP',samples=73))
requests.append(dict(requests[1],incidence=0))
data=dict(sourceSHA256=hashlib.sha256((ROOT/'dist/python/shg_lab.py').read_text(encoding='utf8').encode()).hexdigest(),cases=[dict(input=p,result=run(p)) for p in requests])
text=json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n'
target=ROOT/'scripts/fixtures/shg-flagship.json'
if '--check' in sys.argv:
    def compare(expected,actual,path='root'):
        # Different NumPy/BLAS builds can differ in the last floating-point bits.
        # Keep structure, labels and integer dimensions exact; check all floats.
        assert type(expected) is type(actual),path+' type changed'
        if isinstance(expected,dict):
            assert expected.keys()==actual.keys(),path+' keys changed'
            for key in expected:compare(expected[key],actual[key],path+'.'+key)
        elif isinstance(expected,list):
            assert len(expected)==len(actual),path+' length changed'
            for i,(left,right) in enumerate(zip(expected,actual)):compare(left,right,path+f'[{i}]')
        elif isinstance(expected,float):
            assert math.isclose(expected,actual,rel_tol=1e-11,abs_tol=1e-12),path+' numerical mismatch'
        else:assert expected==actual,path+' value changed'
    compare(json.loads(target.read_text(encoding='utf8')),data)
else:target.write_text(text,encoding='utf8')
print('SHG flagship: four independent Python reference calculations verified.')
