"""Build the independently versioned symmetry-construction teaching catalog."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
result={'schema':'symmetry-lab-construction-1','release':'20261030-construction1',**{k:[] for k in ['modules','lessons','exercises','cases','sources']}}
for module,pathway in {'salc':'foundations','wavevector':'structure-dynamics','nonsymmorphic':'crystal'}.items():
 data=json.loads((ROOT/f'dist/data/{module}-content.json').read_text(encoding='utf8'))
 data['module']['pathway']=pathway;result['modules'].append(data['module'])
 for source in data['sources']:source['id']=module+'-'+source['id']
 for lesson in data['lessons']:lesson['references']=[module+'-'+s for s in lesson['references']]
 for key in ['lessons','exercises','cases','sources']:result[key].extend(data[key])
(ROOT/'dist/data/construction-materials.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print({k:len(result[k]) for k in ['modules','lessons','exercises','cases','sources']})
