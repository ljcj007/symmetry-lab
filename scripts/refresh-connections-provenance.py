"""Refresh current file digests while retaining historical scope declarations."""
from pathlib import Path
import argparse,hashlib,importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prior',ROOT/'scripts/refresh-construction-provenance.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
NAME='dist/data/connections-provenance.json'
def build():
 manifests={p.relative_to(ROOT).as_posix():json.loads(p.read_text(encoding='utf8')) for p in (ROOT/'dist/data').glob('*provenance.json') if p.name!='connections-provenance.json'}
 inventory=manifests['dist/data/python-provenance.json']['modules']
 if not any(r['path']=='dist/python/symmetry_connections.py' for r in inventory):inventory.append(dict(path='dist/python/symmetry_connections.py',sha256='pending',bytes=0,upstream=[],license='GPL-3.0-only',implementation='Original NumPy/SymPy finite teaching models',coverage=['Exact S2/S3 permutation algebra, XY/director loop winding, linear response reciprocity, antiunitary audit and bounded symbolic grading'],limitations=['Finite models only; no arbitrary homotopy, S_n or material fitting; see dist/docs/connections.md']))
 files=[]
 for directory in ['dist','scripts']:
  for p in (ROOT/directory).rglob('*'):
   if not p.is_file() or p.suffix not in prior.TEXT_EXTENSIONS|{'.gz'} or '__pycache__' in p.parts or 'vendor' in p.parts or p.name.endswith('.zip'):continue
   name=p.relative_to(ROOT).as_posix()
   if name==NAME:continue
   files.append(dict(path=name,sha256='pending',bytes=0))
 for name in ['README.md','package.json']:files.append(dict(path=name,sha256='pending',bytes=0))
 data=json.loads((ROOT/'dist/data/connections-materials.json').read_text(encoding='utf8'))
 dictionary=json.loads((ROOT/'dist/data/formula-dictionary.json').read_text(encoding='utf8'))
 manifests[NAME]=dict(release='20261031-connections1',sourceHashNormalization='utf8-lf-v1',counts=dict(modules=3,lessons=9,exerciseSteps=36,presets=19,predictions=6,cases=9,projects=3,projectCenterTotal=23,dictionaryEntries=len(dictionary['entries']),dictionarySources=len(dictionary['sources'])),sources=data['sources'],scope='Explicit finite teaching models; see docs/connections.md',files=files)
 return prior.ManifestGraph(manifests).all_outputs()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();changed=[]
 for name,data in build().items():
  p=ROOT/name;text=prior.serialized(data)
  if not p.exists() or p.read_text(encoding='utf8')!=text:
   changed.append(name)
   if not args.check:p.write_text(text,encoding='utf8')
 print('Manifests needing update:',len(changed))
 if args.check and changed:raise SystemExit(1)
