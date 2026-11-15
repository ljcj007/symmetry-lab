"""Reproduce the distributed ZnO teaching data from pinned official inputs.

Install phonopy==4.10.0, numpy==2.5.4, spglib==2.8.0, symfc==1.8.0 and
phonors==0.8.0 in a separate environment. Run this file with --output-dir
pointing to a new directory. It never executes VASP or uses the bundled BORN
file: non-analytical correction is explicitly disabled.

The distributed qpoints.yaml preserves the original Windows CRLF writer
output. Other platforms and eigensolvers can choose different phases within
the same physical mode/subspace; compare eigenpairs and subspace projectors,
not arbitrary component phases or archived floating-point bits.
"""
import argparse
import hashlib
import json
from pathlib import Path
import importlib.metadata

import phonopy

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', required=True, type=Path)
args = parser.parse_args()
base = Path(__file__).resolve().parent
checks = {
    'phonopy-zno-structure.yaml': '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c',
    'phonopy-zno-FORCE_SETS': '403e821f0017ca396874edcdb7da58366c6dce3cbe1f8ca03cd1346f1bd02dc5',
}
for name, expected in checks.items():
    if hashlib.sha256((base / name).read_bytes()).hexdigest() != expected:
        raise ValueError('Pinned original input differs: ' + name)
if phonopy.__version__ != '4.10.0':
    raise ValueError('This reproduction specifies phonopy==4.10.0')
target = args.output_dir.resolve()
if target == base or (target / 'qpoints.yaml').exists():
    raise ValueError('Choose a new output directory; bundled or existing qpoints are not overwritten')
target.mkdir(parents=True, exist_ok=True)
model = phonopy.load(
    phonopy_yaml=str(base / 'phonopy-zno-structure.yaml'),
    force_sets_filename=str(base / 'phonopy-zno-FORCE_SETS'),
    is_nac=False, fc_calculator='traditional', symmetrize_fc=True,
    is_compact_fc=True,
)
qpoints = [[0, 0, 0], [.25, 0, 0], [.25, 0, .25], [.5, 0, 0]]
result = model.run_qpoints(qpoints, with_eigenvectors=True, with_dynamical_matrices=True)
filename = target / 'qpoints.yaml'
result.write_yaml(filename)
report = {
    'classification': 'Offline Phonopy postprocessing of pinned official ZnO force data; no new DFT calculation',
    'officialCommit': '0937453a793eb504f674b7d4fd98421d508008e6',
    'versions': {name: importlib.metadata.version(name) for name in ('phonopy', 'numpy', 'spglib', 'symfc', 'phonors')},
    'isNAC': False, 'fcCalculator': 'traditional', 'symmetrizeFC': True,
    'compactFC': True, 'unitConversionFactorToTHz': model.unit_conversion_factor,
    'qpoints': qpoints, 'inputSHA256': checks,
    'outputSHA256': hashlib.sha256(filename.read_bytes()).hexdigest(),
    'outputBytes': filename.stat().st_size,
}
(target / 'generation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps(report, indent=2))
