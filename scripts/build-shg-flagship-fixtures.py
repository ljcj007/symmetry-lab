"""Real Python outputs used by the UI workflow regression test."""
from pathlib import Path
import hashlib, json, sys
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
    assert json.loads(target.read_text(encoding='utf8'))==data,'SHG fixtures are stale'
else:target.write_text(text,encoding='utf8')
print('SHG flagship: four independent Python reference calculations verified.')
