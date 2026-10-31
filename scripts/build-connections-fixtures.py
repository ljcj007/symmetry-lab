"""Record actual Python outputs for browser UI contract checks."""
from pathlib import Path
import gzip,json,sys,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
def sha(path):return hashlib.sha256(path.read_text(encoding='utf8').encode('utf8')).hexdigest()
d=json.loads((ROOT/'dist/data/connections-materials.json').read_text(encoding='utf8'))
requests={p['id']:dict(action=m['action'],input={f['key']:f['default'] for f in m['fields']}|p['input']) for m in d['modules'] for p in m['presets']}
result=dict(format='real-python-connections-fixtures',release=d['release'],sourceHashes={'symmetry_connections.py':sha(ROOT/'dist/python/symmetry_connections.py')},catalogSHA256=sha(ROOT/'dist/data/connections-materials.json'),requests=requests,results={k:run(v['action'],v['input']) for k,v in requests.items()})
result['grading']=[dict(input=dict(task=t,answer=a),result=run('symbolic_step_grade',dict(task=t,answer=a))) for t,a in [('projector','1/2'),('projector','1/3'),('onsager','a-b*(B+M)'),('young','1/3')]]
payload=dict(hx=1,hz=0,stateAngle=0,probeAngle=90,polarization=1,operation='z')
result['audit']=dict(input=payload,result=run('symmetry_audit',payload))
project_code="import {connectionsAssignments as x} from './dist/connections-projects.js';process.stdout.write(JSON.stringify(x));"
projects=json.loads(subprocess.check_output(['node','--input-type=module','-e',project_code],cwd=ROOT,encoding='utf8'))
catalogs=[d]+[json.loads((ROOT/f'dist/data/{name}-materials.json').read_text(encoding='utf8')) for name in ['pathways','response']]
modules={m['action']:m for cat in catalogs for m in cat['modules']}
from urllib.parse import urlparse,parse_qs
result['projects']={}
for project in projects:
 for stage in project['steps']:
  m=modules[stage['action']];pid=parse_qs(urlparse(stage['route'][1:]).query)['preset'][0]
  preset=next(p for p in m['presets'] if p['id']==pid);request={f['key']:f['default'] for f in m.get('fields',[])}|preset['input']
  assert all(request[k]==v for k,v in stage['requires'].items())
  result['projects'][project['id']+'/'+stage['id']]=dict(input=request,action=m['action'],result=run(m['action'],request))
for name in ['browser_api.py','hubbard_lab.py','domain_wall_lab.py','hall_response_lab.py']:
 result['sourceHashes'][name]=sha(ROOT/'dist/python'/name)
with gzip.GzipFile(ROOT/'scripts/fixtures/connections.json.gz','wb',mtime=0) as f:f.write(json.dumps(result,ensure_ascii=False,allow_nan=False).encode('utf8'))
print('Recorded',len(requests),'real model outputs')
