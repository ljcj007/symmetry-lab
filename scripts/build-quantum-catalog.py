"""Rebuild the classroom catalog from the three independently reviewed units."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
catalog={'schema':'symmetry-lab-quantum-materials-1','release':'20261027-quantum1'}
for key in ('modules','lessons','exercises','cases','sources'):catalog[key]=[]
for name in ('crystal-field','quantum-geometry','electron-transport'):
 part=json.loads((ROOT/f'dist/data/{name}-content.json').read_text(encoding='utf-8'))
 for key in ('modules','lessons','exercises','cases','sources'):
  for item in part[key]:
   old=next((row for row in catalog[key] if row['id']==item['id']),None)
   if old is None:catalog[key].append(item)
   elif old!=item:raise ValueError(f'Conflicting {key} identifier: {item["id"]}')
(ROOT/'dist/data/quantum-materials.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Rebuilt quantum catalog:',len(catalog['lessons']),'lessons,',len(catalog['cases']),'cases')
