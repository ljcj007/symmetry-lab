"""Create redistributable source (including provenance), excluding hosting identity."""
from pathlib import Path
import json
import zipfile
root = Path(__file__).resolve().parents[1]
target = root / 'dist' / 'source.zip'
allowed = ['dist', 'scripts', 'upstream', '.github', 'locales']
files = [root / p for p in ['README.md', 'GOAL-ROADMAP.md', 'NOTICE.txt', 'LICENSE', 'package.json', 'package-lock.json', 'start.cmd', '.gitignore', '.gitattributes']]
for folder in allowed:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file())
selected = []
for file in sorted(set(files)):
    if file == target or '__pycache__' in file.parts or file.suffix in ['.pyc', '.log']:
        continue
    if file.parent.name == 'locales' and (file.name in ['en-jobs.json', 'en-extra-index.json', 'en-corrections-index.json', 'en-translation-failures.json', 'en-meta-sources.json', 'en-meta-index.json','en-ref-sources.json','en-ref-index.json'] or file.name.startswith('en-manual-') and file.name.endswith('-sources.json')):
        continue
    if file.exists():
        if not file.resolve().is_relative_to(root.resolve()):
            raise ValueError('Source file resolves outside the repository: ' + str(file))
        selected.append(file)

# A downloadable source must contain the files read by its own provenance
# builders. Validate the existing public dependency lists without broadening
# the archive allowlist or including hosting identity.
included = {file.relative_to(root).as_posix() for file in selected}
required = set()
for manifest in (root / 'dist/data').glob('*provenance.json'):
    data = json.loads(manifest.read_text(encoding='utf8'))
    for field in ('files', 'modules'):
        rows = data.get(field, {})
        items = rows.items() if isinstance(rows, dict) else ((row.get('path'), row) for row in rows if isinstance(row, dict))
        required.update(name for name, row in items if name and isinstance(row, dict) and 'sha256' in row)
missing = sorted(required - included)
if missing:
    raise ValueError('Source archive is missing provenance dependencies: ' + ', '.join(missing))
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in selected:
        archive.write(file, Path('symmetry-lab') / file.relative_to(root))
print(f'Source archive: {target} ({target.stat().st_size:,} bytes)')
print(f'Included all {len(required)} registered provenance dependencies.')
