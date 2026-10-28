"""Generate real Python outputs for UI contract tests, with smaller plot grids."""
from pathlib import Path
import json,sys
from copy import deepcopy
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
catalog=json.loads((ROOT/'dist/data/spectroscopy-materials.json').read_text(encoding='utf8'))
requests={}
for module in catalog['modules']:
    for preset in module['presets']:
        p=deepcopy(preset['input'])
        if module['id']=='resonance':p.update(frequencyPoints=81,fieldPoints=11)
        elif module['id']=='andreev':p['samples']=41
        else:p['samples']=101
        requests[preset['id']]={'action':module['action'],'input':p}
requests['old-ion']={'action':'local_multiplet_lab','input':{'electrons':8,'coordination':'octahedral','splitting':1,'coulombU':4,'hundJ':.6,'scanPoints':3}}
requests['old-device']={'action':'device_transport_lab','input':{'model':'uniform','sites':12,'hopping':1,'gate':0,'barrier':0,'barrierStart':6,'barrierWidth':1,'leadHopping':1,'leadOnsite':0,'contactLeft':1,'contactRight':1,'energy':.2,'spinDegeneracy':1,'eta':1e-7,'samples':41}}
results={k:run(v['action'],deepcopy(v['input'])) for k,v in requests.items()}
target=ROOT/'scripts/fixtures/spectroscopy.json'
target.write_text(json.dumps({'format':'real-python-spectroscopy-fixtures','requests':requests,'results':results},ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf8',newline='\n')
print('Spectroscopy fixtures:',len(results),'results,',target.stat().st_size,'bytes')
