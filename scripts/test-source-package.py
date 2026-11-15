"""Check the actual downloadable archive and replay its provenance checks."""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path, default=ROOT / 'dist/source.zip')
args = parser.parse_args()
node = shutil.which('node')
if not node:
    raise SystemExit('Node.js is required to replay source provenance checks.')
builders = [
    'build-learning-depth-provenance', 'build-learning-flow-provenance',
    'build-learning-support-provenance', 'build-learning-routes-provenance',
    'build-operational-bridges-provenance', 'build-thermal-onsager-provenance',
    'build-evidence-workflows-provenance', 'build-precision-teaching-provenance',
    'build-actions-teaching-provenance', 'build-derivation-teaching-provenance',
    'build-zno-workflow-provenance',
    'build-tensor-teaching-provenance',
]
temp_root = Path(tempfile.gettempdir()).resolve()
with tempfile.TemporaryDirectory(prefix='symmetry-source-check-', dir=temp_root) as temp:
    destination = Path(temp).resolve()
    assert destination.is_relative_to(temp_root) and destination.name.startswith('symmetry-source-check-')
    with zipfile.ZipFile(args.archive) as archive:
        assert archive.testzip() is None, 'The source archive failed its ZIP integrity check.'
        names = archive.namelist()
        assert len(names) == len(set(names)), 'Duplicate archive member.'
        for name in names:
            path = destination / name
            assert path.resolve().is_relative_to(destination), 'Archive member escapes its directory: ' + name
            assert name.startswith('symmetry-lab/'), 'Unexpected source archive root: ' + name
            assert '/.openai/' not in name and '/.git/' not in name
        assert 'symmetry-lab/GOAL-ROADMAP.md' in names
        archive.extractall(destination)
    extracted = destination / 'symmetry-lab'
    required = set()
    for manifest in (extracted / 'dist/data').glob('*provenance.json'):
        data = json.loads(manifest.read_text(encoding='utf8'))
        for field in ('files', 'modules'):
            rows = data.get(field, {})
            items = rows.items() if isinstance(rows, dict) else ((row.get('path'), row) for row in rows if isinstance(row, dict))
            for name, row in items:
                if not name or not isinstance(row, dict) or 'sha256' not in row:
                    continue
                target = (extracted / name).resolve()
                assert target.is_relative_to(extracted.resolve()) and target.is_file(), name
                required.add(name)
    commands = [[node, 'scripts/' + name + '.mjs', '--check'] for name in builders]
    commands.append([sys.executable, 'scripts/refresh-english-provenance.py', '--check'])
    environment = dict(os.environ, PYTHONDONTWRITEBYTECODE='1', PYTHONIOENCODING='utf-8')
    for variable in ('PYTHONPATH', 'NODE_PATH', 'NODE_OPTIONS'):
        environment.pop(variable, None)
    # This checks the distributed bytes without access to Git, node_modules,
    # checkout-local dependency directories, or the original repository files.
    for command in commands:
        result = subprocess.run(command, cwd=extracted, env=environment,
                                capture_output=True, text=True, encoding='utf8', timeout=180)
        if result.returncode:
            raise SystemExit('Extracted source check failed: ' + ' '.join(command[1:])
                             + '\n' + result.stdout + result.stderr)
print(json.dumps({'archiveEntries': len(names), 'registeredDependenciesPresent': len(required),
                  'extractedProvenanceCommandsPassed': len(commands),
                  'hostingIdentityExcluded': True, 'gitAndLocalDependenciesRequired': False}))
