"""Build the spectroscopy lessons from separately verified physics modules."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
keys=('modules','lessons','exercises','cases','sources')
catalog={'schema':'symmetry-lab-spectroscopy-1','release':'20261028-spectroscopy1',**{k:[] for k in keys}}
for name in ('spin-resonance','andreev','atomic-spectra'):
    part=json.loads((ROOT/f'dist/data/{name}-content.json').read_text(encoding='utf8'))
    for key in keys:
        for row in part[key]:
            old=next((x for x in catalog[key] if x['id']==row['id']),None)
            if old is None:catalog[key].append(row)
            elif old!=row:raise ValueError(f'Conflicting {key} ID {row["id"]}')
(ROOT/'dist/data/spectroscopy-materials.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print({k:len(catalog[k]) for k in keys})
