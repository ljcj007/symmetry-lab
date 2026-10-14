"""Create redistributable source (including provenance), excluding hosting identity."""
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parents[1]
target = root / 'dist' / 'source.zip'
allowed = ['dist', 'scripts', 'upstream', '.github']
files = [root / p for p in ['README.md', 'NOTICE.txt', 'LICENSE', 'package.json', 'start.cmd', '.gitignore', '.gitattributes']]
for folder in allowed:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file())
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(set(files)):
        if file == target or '__pycache__' in file.parts or file.suffix in ['.pyc', '.log']:
            continue
        if file.exists():
            archive.write(file, Path('symmetry-lab') / file.relative_to(root))
print(f'Source archive: {target} ({target.stat().st_size:,} bytes)')
