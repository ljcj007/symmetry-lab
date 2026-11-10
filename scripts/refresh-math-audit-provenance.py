"""Refresh source digests in dependency order; retain prior release coverage."""
from pathlib import Path
import argparse,importlib.util,json
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prior',ROOT/'scripts/refresh-construction-provenance.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
NAME='dist/data/math-audit-provenance.json'
def build():
    manifests={p.relative_to(ROOT).as_posix():json.loads(p.read_text(encoding='utf8')) for p in (ROOT/'dist/data').glob('*provenance.json') if p.name!='math-audit-provenance.json'}
    files=[]
    for folder in ['dist','scripts']:
        for p in (ROOT/folder).rglob('*'):
            if not p.is_file() or p.suffix not in prior.TEXT_EXTENSIONS|{'.gz'} or '__pycache__' in p.parts or 'vendor' in p.parts or p.name.endswith('.zip'):continue
            name=p.relative_to(ROOT).as_posix()
            if name!=NAME:files.append(dict(path=name,sha256='pending',bytes=0))
    for name in ['README.md','package.json']:files.append(dict(path=name,sha256='pending',bytes=0))
    manifests[NAME]=dict(release='20261110-math1',sourceHashNormalization='utf8-lf-v1',scope='Scientific typesetting and native option labels; identical calculation inputs and numeric results. See docs/formula-display.md.',validation=dict(formulaFields=997,inlineStrings=3735,mathFragments=7147,typedCrystalSymbols=3546,browserCatalogs=34,browserUniqueCases=2705,classroomModules=18,correctedDisplayStrings=330,nativeOptionLabels=22),files=files)
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
