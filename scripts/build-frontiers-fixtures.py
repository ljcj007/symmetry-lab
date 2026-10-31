from pathlib import Path
import json,sys,gzip,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
def sha(p):return hashlib.sha256(p.read_text(encoding='utf8').encode('utf8')).hexdigest()
d=json.loads((ROOT/'dist/data/frontiers-materials.json').read_text(encoding='utf8'))
requests={p['id']:dict(action=m['action'],input={f['key']:f['default'] for f in m['fields']}|p['input']) for m in d['modules'] for p in m['presets']}
r=dict(release=d['release'],catalogSHA256=sha(ROOT/'dist/data/frontiers-materials.json'),sourceHashes={k:sha(ROOT/'dist/python'/k) for k in ['symmetry_frontiers.py','browser_api.py','order_parameter_lab.py','shg_lab.py','density_matrix_lab.py']},requests=requests,results={k:run(v['action'],v['input']) for k,v in requests.items()})
projects=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {frontiersAssignments as p} from './dist/frontiers-projects.js';process.stdout.write(JSON.stringify(p))"],cwd=ROOT,encoding='utf8'))
from urllib.parse import parse_qs,urlparse
catalogs=[d]+[json.loads((ROOT/f'dist/data/{k}-materials.json').read_text(encoding='utf8')) for k in ['principles','electronic','bridges']]
modules={m['action']:m for c in catalogs for m in c['modules']}
r['projects']={}
for project in projects:
 for s in project['steps']:
  m=modules[s['action']];pid=parse_qs(urlparse(s['route'][1:]).query)['preset'][0];preset=next(a for a in m['presets'] if a['id']==pid)
  values={f['key']:f['default'] for f in m.get('fields',[])}|preset['input']
  r['projects'][project['id']+'/'+s['id']]=dict(action=s['action'],input=values,result=run(s['action'],values))
r['linked']=[]
for key in requests:
 o=r['results'][key]['operations'][0]
 for time in [False,True]:
  p=dict(matrix=o['matrix'],translation=o['translation'],position=[.3,.2,.1],momentum=[.4,.3,.2],spin=[.2,.4,.7],timeReversal=time)
  r['linked'].append(dict(input=p,result=run('symmetry_linked',p)))
r['inverse']=[]
for domain,target,measure in [('layer','symmetric','exchangeSides'),('chirality','d3','chiral'),('spt','anisotropy','Rx')]:
 setup=run('frontier_inverse',dict(domain=domain,target=target));allids=[x['id'] for x in setup['candidates']]
 for revealed in [[],[measure]]:
  for guesses in [allids,run('frontier_inverse',dict(domain=domain,target=target,revealed=revealed))['remaining']]:
   for grade in [False,True]:
    p=dict(domain=domain,target=target,revealed=revealed,guesses=guesses,grade=grade)
    r['inverse'].append(dict(input=p,result=run('frontier_inverse',p)))
with gzip.GzipFile(ROOT/'scripts/fixtures/frontiers.json.gz','wb',mtime=0) as f:f.write(json.dumps(r,ensure_ascii=False,allow_nan=False).encode('utf8'))
print('Recorded',len(requests),'presets,',len(r['projects']),'project stages')
