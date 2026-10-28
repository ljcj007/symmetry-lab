"""Generate actual Python responses for every teaching preset, with smaller display scans."""
from pathlib import Path
import json,sys
from copy import deepcopy
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
catalog=json.loads((ROOT/'dist/data/response-materials.json').read_text(encoding='utf8'))
requests={}
for m in catalog['modules']:
 for preset in m['presets']:
  p=deepcopy(preset['input'])
  if m['id']=='hall':p['mesh']=min(p.get('mesh',61),31);p['scanPoints']=11
  if m['id']=='device':p['samples']=41
  if m['id']=='multiplet':p['scanPoints']=3
  requests[preset['id']]={'action':m['action'],'input':p}
requests['project-geometry']={'action':'quantum_geometry_lab','input':{'model':'qwz','mass':-1,'energyScale':1,'mesh':11,'pathSamples':41}}
requests['project-ssh']={'action':'quantum_geometry_lab','input':{'model':'ssh','t1':.6,'t2':1,'mesh':11,'pathSamples':41}}
requests['project-orbitals']={'action':'crystal_field_lab','input':{'coordination':'octahedral','splitting':1,'soc':0,'angular_grid':11,'scan_points':11}}
results={k:run(v['action'],deepcopy(v['input'])) for k,v in requests.items()}
target=ROOT/'scripts/fixtures/response-materials.json'
target.write_text(json.dumps({'format':'real-python-response-fixtures','requests':requests,'results':results},ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf8',newline='\n')
print('Response fixtures:',len(results),'results,',target.stat().st_size,'bytes')
