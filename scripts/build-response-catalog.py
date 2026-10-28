"""Merge independently verified response teaching units without duplicate IDs."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
catalog={'schema':'symmetry-lab-response-materials-1','release':'20261028-response1',**{k:[] for k in ('modules','lessons','exercises','cases','sources')}}
for name in ('hall-response','device-transport','local-multiplet'):
 part=json.loads((ROOT/f'dist/data/{name}-content.json').read_text(encoding='utf8'))
 for key in ('modules','lessons','exercises','cases','sources'):
  for row in part[key]:
   previous=next((x for x in catalog[key] if x['id']==row['id']),None)
   if previous is None:catalog[key].append(row)
   elif previous!=row:raise ValueError(f'Conflicting {key}: {row["id"]}')
(ROOT/'dist/data/response-materials.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print({key:len(catalog[key]) for key in ('modules','lessons','exercises','cases','sources')})
