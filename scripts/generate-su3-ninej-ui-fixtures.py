"""Capture exact Python four-factor recoupling for display-only UI tests."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from su3_ninej import run

base = {'lab': 'lie', 'experiment': 'su3_ninej', 'direction': 'left_to_right', 'state': {'index': 0}}
cases = {
    'four': {'factors': [[1, 0], [1, 0], [1, 0], [1, 0]], 'target': [2, 1]},
    'color': {'factors': [[1, 0], [0, 1], [1, 0], [0, 1]], 'target': [1, 1]},
    'mixed': {'factors': [[2, 0], [1, 0], [0, 1], [0, 0]], 'target': [2, 0]},
    'auto': {'factors': [[1, 0], [1, 0], [0, 0], [0, 0]]},
    'autoBar': {'factors': [[1, 0], [1, 0], [0, 0], [0, 0]], 'target': [0, 1]},
}
results = {name: run(dict(base, **inputs)) for name, inputs in cases.items()}
results['complex'] = run(dict(base, **cases['four'], state={'amplitudes': [
    {'re': 'sqrt(2)/2', 'im': '0'}, {'re': '0', 'im': 'sqrt(2)/2'}, {'re': '0', 'im': '0'},
]}))
results['complexBack'] = run(dict(base, **cases['four'], direction='right_to_left',
                                  state={'amplitudes': results['complex']['exactOutputAmplitudes']}))
target = ROOT / 'scripts' / 'fixtures' / 'su3-ninej-ui.json'
target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {target.relative_to(ROOT)} with {len(results)} exact Python results')
