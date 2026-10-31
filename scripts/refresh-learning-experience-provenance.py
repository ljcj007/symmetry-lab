"""Refresh dependent manifests without expanding their historical feature claims."""
from pathlib import Path
import argparse,importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prior',ROOT/'scripts/refresh-construction-provenance.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
NAME='dist/data/learning-experience-provenance.json'
def build():
    manifests={p.relative_to(ROOT).as_posix():json.loads(p.read_text(encoding='utf8')) for p in (ROOT/'dist/data').glob('*provenance.json') if p.name!='learning-experience-provenance.json'}
    files=[]
    for folder in ['dist','scripts']:
        for p in (ROOT/folder).rglob('*'):
            if not p.is_file() or p.suffix not in prior.TEXT_EXTENSIONS|{'.gz'} or '__pycache__' in p.parts or 'vendor' in p.parts or p.name.endswith('.zip'):continue
            name=p.relative_to(ROOT).as_posix()
            if name!=NAME:files.append(dict(path=name,sha256='pending',bytes=0))
    for name in ['README.md','package.json']:files.append(dict(path=name,sha256='pending',bytes=0))
    manifests[NAME]=dict(release='20261031-entry2',sourceHashNormalization='utf8-lf-v1',counts=dict(homeLevels=3,flagshipExperiments=1,materials=3,stages=4,searchEntries=len(json.loads((ROOT/'dist/data/search-index.json').read_text(encoding='utf8'))['entries'])),scope='Existing SHG Python core; ideal bulk electric-dipole teaching models, not measured optical coefficients. See docs/learning-experience.md.',files=files)
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
