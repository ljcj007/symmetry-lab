"""Combine original teaching content without changing source modules."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
PATHWAYS={'bandrep':'crystal','scattering':'observables','domainwall':'structure-dynamics','hubbard':'spin'}
result={'schema':'symmetry-lab-pathways-1','release':'20261029-pathways1','modules':[],'lessons':[],'exercises':[],'cases':[],'sources':[]}
for module,pathway in PATHWAYS.items():
    data=json.loads((ROOT/f'dist/data/{module}-content.json').read_text(encoding='utf-8'))
    m=data['module'];m['pathway']=pathway;result['modules'].append(m)
    for source in data['sources']:source['id']=module+'-'+source['id']
    for lesson in data['lessons']:lesson['references']=[module+'-'+ref for ref in lesson['references']]
    for key in ['lessons','exercises','cases','sources']:result[key].extend(data[key])
target=ROOT/'dist/data/pathways-materials.json'
byid={m['id']:m for m in result['modules']}
byid['bandrep']['presets'].append({'id':'screw-gamma','title':'项目：螺旋群 Γ 点参照','input':{'group':4,'site':'auto','orbitals':'s','kPoint':'G','kz':.25}})
for suffix,potential in [('ssh',0),('potential',.4)]:
    byid['domainwall']['presets'].append({'id':'wall-project-'+suffix,'title':'项目：匹配 SSH 体相键强度'+(' · 中心势' if potential else ''),'input':{'experiment':'ssh','sites':60,'hopping':.8,'dimerization':.25,'sshWidth':2,'onsite':potential,'probeEnergy':0,'eta':.03,'interface':'wall'}})
base=next(p['input'] for p in byid['hubbard']['presets'] if p['id']=='dimer-half').copy()
base['interactionU']=12
byid['hubbard']['presets'].append({'id':'dimer-project-strong','title':'项目：Hubbard 二聚体强耦合 U=12 eV','input':base})
target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print({k:len(result[k]) for k in ['modules','lessons','exercises','cases','sources']})
