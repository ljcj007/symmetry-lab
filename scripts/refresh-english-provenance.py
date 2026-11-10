"""Refresh registered historical hashes and record the reproducible English build.

Historical inventories and scientific coverage declarations remain unchanged.
Run once after source edits, build English again to mirror final historical
metadata, then run once more. --check is read-only and must be stable.
"""
from pathlib import Path
import argparse, importlib.util, json
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prior', ROOT/'scripts/refresh-construction-provenance.py')
prior = importlib.util.module_from_spec(spec); spec.loader.exec_module(prior)
NAME = 'dist/data/english-provenance.json'
def normalized_content(name):
    p=ROOT/name
    # These text files have no ordinary suffix. A Windows checkout must use
    # the declared UTF-8/LF hash convention for them too.
    if p.name in {'.gitignore','.gitattributes','LICENSE','NOTICE'}:
        return p.read_text(encoding='utf8').encode('utf8')
    return prior.content(p)
def build():
    manifests = {p.relative_to(ROOT).as_posix(): json.loads(p.read_text(encoding='utf8')) for p in (ROOT/'dist/data').glob('*provenance.json') if p.name != 'english-provenance.json'}
    files = []
    for folder in ['dist/en', 'locales']:
        for p in (ROOT/folder).rglob('*'):
            if not p.is_file() or p.suffix not in prior.TEXT_EXTENSIONS: continue
            if p.parent.name == 'locales' and (p.name in ['en-jobs.json','en-extra-index.json','en-corrections-index.json','en-translation-failures.json','en-meta-sources.json','en-meta-index.json','en-ref-sources.json','en-ref-index.json'] or p.name.startswith('en-manual-') and p.name.endswith('-sources.json')): continue
            files.append(dict(path=p.relative_to(ROOT).as_posix(),sha256='pending',bytes=0))
    for name in ['README.md','package.json','package-lock.json','.github/workflows/pages.yml','dist/index.html','dist/language-switch.js','dist/language-switch.css','dist/english-results.js','dist/math-notation.js','dist/docs/english-edition.md']:
        files.append(dict(path=name,sha256='pending',bytes=0))
    for p in (ROOT/'scripts').glob('*english*'):
        if p.is_file(): files.append(dict(path=p.relative_to(ROOT).as_posix(),sha256='pending',bytes=0))
    for name in ['scripts/test-language-switch.mjs','scripts/collect-fixture-messages.mjs','scripts/extract-python-messages.py','scripts/package-source.py']:
        files.append(dict(path=name,sha256='pending',bytes=0))
    report=json.loads((ROOT/'dist/en/translation-report.json').read_text(encoding='utf8'))
    manifests[NAME]=dict(release='20261110-en1',sourceHashNormalization='utf8-lf-v1',scope='Static English teaching and interface edition; shared Python computation cores, crystallographic data, calculation inputs and numeric results. See docs/english-edition.md.',counts=dict(sourceUnits=report['sourceUnits'],translatedUnits=report['translatedUnits'],missingUnits=len(report['missing']),generatedFiles=report['files']),files=sorted(files,key=lambda row:row['path']))
    return prior.ManifestGraph(manifests,leaf_content=normalized_content).all_outputs()
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();changed=[]
    for name,data in build().items():
        p=ROOT/name;body=prior.serialized(data)
        if not p.exists() or p.read_text(encoding='utf8')!=body:
            changed.append(name)
            if not args.check:p.write_text(body,encoding='utf8')
    print('Manifests needing update:',len(changed))
    if args.check and changed:raise SystemExit(1)
