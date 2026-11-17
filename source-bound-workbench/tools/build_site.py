"""Prepare the static site and a clean downloadable source bundle."""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile

ROOT=Path(__file__).resolve().parents[1]

def source_files():
    for name in ['README.md','run.py','run.cmd','RIGHTS.md']:
        yield ROOT/name
    for folder in ['src','examples','schema','docs','tools','tests']:
        for p in sorted((ROOT/folder).rglob('*')):
            if p.is_file() and '__pycache__' not in p.parts and not any(x.startswith('tmp') for x in p.relative_to(ROOT).parts) and 'outputs' not in p.parts:
                yield p
    for name in ['index.html','style.css','app.js','worker.js','engine.js','package.json','test-engine.mjs','test-python-parity.py','test-structure.mjs']:
        p=ROOT/'site'/name
        if p.exists():yield p
    yield from sorted((ROOT/'site/examples').glob('*.json'))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--destination');a=ap.parse_args()
    for p in (ROOT/'examples').glob('*.json'):
        (ROOT/'site/examples').mkdir(exist_ok=True);shutil.copy2(p,ROOT/'site/examples'/p.name)
    site=ROOT/'site'
    html=(site/'index.html').read_text(encoding='utf-8').replace('docs/METHOD_COMPARISON.md','docs/PRIOR_ART_COMPARISON.md')
    (site/'index.html').write_text(html,encoding='utf-8')
    download=site/'downloads';download.mkdir(exist_ok=True)
    archive=download/'source-bound-workbench.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for p in source_files():z.write(p,p.relative_to(ROOT).as_posix())
    inventory={'scope':'Original affine receiver, controls, interface and primary-source comparison; no material raw data or binary runtime.','files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source_files()]}
    (download/'SOURCE_MANIFEST.json').write_text(json.dumps(inventory,indent=2)+'\n',encoding='utf-8')
    if a.destination:
        dest=Path(a.destination).resolve();dest.mkdir(parents=True,exist_ok=True)
        for name in ['index.html','style.css','app.js','engine.js','worker.js','examples','downloads']:
            p=site/name;q=dest/name
            if p.is_dir():shutil.copytree(p,q,dirs_exist_ok=True)
            else:shutil.copy2(p,q)
        (dest/'.nojekyll').write_text('')
    print(json.dumps({'site':str(site),'download_bytes':archive.stat().st_size,'download_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'members':len(zipfile.ZipFile(archive).namelist())},indent=2))

if __name__=='__main__':main()
