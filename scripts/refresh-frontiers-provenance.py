"""Update file digests in dependency order, retaining historical coverage declarations."""
from pathlib import Path
import argparse,importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prior',ROOT/'scripts/refresh-construction-provenance.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
NAME='dist/data/frontiers-provenance.json'
def build():
 manifests={p.relative_to(ROOT).as_posix():json.loads(p.read_text(encoding='utf8')) for p in (ROOT/'dist/data').glob('*provenance.json') if p.name!='frontiers-provenance.json'}
 inventory=manifests['dist/data/python-provenance.json']['modules']
 if not any(r['path']=='dist/python/symmetry_frontiers.py' for r in inventory):
  inventory.append(dict(path='dist/python/symmetry_frontiers.py',sha256='pending',bytes=0,upstream=[],license='GPL-3.0-only',implementation='Original NumPy finite symmetry teaching models',coverage=['Inherited cubic slab operations and affine closure, finite motif mirror matching and polarity, tolerance diagnostics, finite AKLT chains, linked vector actions and computed inverse experiments'],limitations=['No arbitrary layer-group naming, unrestricted crystal chirality determination or infinite-chain SPT classification; see docs/frontiers.md']))
 files=[]
 for folder in ['dist','scripts']:
  for p in (ROOT/folder).rglob('*'):
   if not p.is_file() or p.suffix not in prior.TEXT_EXTENSIONS|{'.gz'} or '__pycache__' in p.parts or 'vendor' in p.parts or p.name.endswith('.zip'):continue
   name=p.relative_to(ROOT).as_posix()
   if name!=NAME:files.append(dict(path=name,sha256='pending',bytes=0))
 for name in ['README.md','package.json']:files.append(dict(path=name,sha256='pending',bytes=0))
 data=json.loads((ROOT/'dist/data/frontiers-materials.json').read_text(encoding='utf8'))
 dictionary=json.loads((ROOT/'dist/data/formula-dictionary.json').read_text(encoding='utf8'))
 manifests[NAME]=dict(release='20261031-frontiers1',sourceHashNormalization='utf8-lf-v1',counts=dict(modules=3,lessons=9,exerciseSteps=36,presets=18,predictions=6,cases=9,projects=3,projectStages=9,projectCenterTotal=26,dictionaryEntries=len(dictionary['entries']),dictionarySources=len(dictionary['sources'])),sources=data['sources'],scope='Explicit finite models and independent experimental evidence; see docs/frontiers.md',files=files)
 return prior.ManifestGraph(manifests).all_outputs()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();changed=[]
 for name,data in build().items():
  p=ROOT/name;s=prior.serialized(data)
  if not p.exists() or p.read_text(encoding='utf8')!=s:
   changed.append(name)
   if not args.check:p.write_text(s,encoding='utf8')
 print('Manifests needing update:',len(changed))
 if args.check and changed:raise SystemExit(1)
