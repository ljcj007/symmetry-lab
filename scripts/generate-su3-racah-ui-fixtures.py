"""Capture exact Python Racah results for display-only JavaScript regressions."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from su3_racah import run

base = {'lab': 'lie', 'experiment': 'su3_racah', 'direction': 'left_to_right', 'state': {'index': 0}}
cases = {
    'three': {'factors': [[1, 0], [1, 0], [1, 0]], 'target': [1, 1]},
    'bar': {'factors': [[1, 0], [0, 1], [1, 0]], 'target': [1, 0]},
    'six': {'factors': [[2, 0], [1, 0], [1, 0]], 'target': [2, 1]},
    'eight': {'factors': [[1, 1], [1, 1], [1, 1]], 'target': [1, 1]},
    'autoNoOctet': {'factors': [[1, 0], [1, 0], [0, 0]]},
    'autoNoOctetBar': {'factors': [[1, 0], [1, 0], [0, 0]], 'target': [0, 1]},
}
results = {name: run(dict(base, **inputs)) for name, inputs in cases.items()}
results['complex'] = run(dict(base, **cases['three'], state={'amplitudes': [
    {'re': 'sqrt(2)/2', 'im': '0'}, {'re': '0', 'im': 'sqrt(2)/2'},
]}))
results['complexBack'] = run(dict(base, **cases['three'], direction='right_to_left',
                                  state={'amplitudes': results['complex']['exactOutputAmplitudes']}))
target = ROOT / 'scripts' / 'fixtures' / 'su3-racah-ui.json'
target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {target.relative_to(ROOT)} with {len(results)} exact Python results')
