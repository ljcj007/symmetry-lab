"""Real Python preset outputs for interface regression tests."""
import json,sys,gzip
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
data=json.loads((ROOT/'dist/data/pathways-materials.json').read_text(encoding='utf8'))
requests={}
for module in data['modules']:
    for preset in module['presets']:
        params={f['key']:f['default'] for f in module['fields']};params.update(preset['input'])
        requests[preset['id']]={'action':module['action'],'input':params}
results={key:run(r['action'],r['input']) for key,r in requests.items()}
raw=json.dumps({'requests':requests,'results':results},ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf8')
target=ROOT/'scripts/fixtures/pathways.json.gz';target.write_bytes(gzip.compress(raw,mtime=0))
print('Pathways fixtures:',len(results),'results;',len(raw),'raw bytes;',target.stat().st_size,'compressed bytes')
