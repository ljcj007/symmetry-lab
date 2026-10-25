"""Capture exact Python four-factor recoupling for display-only UI tests."""
import json
from pathlib import Path
import sys
import argparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from su3_ninej import run

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--high-only', action='store_true', help='Keep the existing large octet matrices and refresh higher-input fixtures')
args = parser.parse_args()
target = ROOT / 'scripts' / 'fixtures' / 'su3-ninej-ui.json'

base = {'lab': 'lie', 'experiment': 'su3_ninej', 'direction': 'left_to_right', 'state': {'index': 0}}
cases = {
    'four': {'factors': [[1, 0], [1, 0], [1, 0], [1, 0]], 'target': [2, 1]},
    'color': {'factors': [[1, 0], [0, 1], [1, 0], [0, 1]], 'target': [1, 1]},
    'mixed': {'factors': [[2, 0], [1, 0], [0, 1], [0, 0]], 'target': [2, 0]},
    'auto': {'factors': [[1, 0], [1, 0], [0, 0], [0, 0]]},
    'autoBar': {'factors': [[1, 0], [1, 0], [0, 0], [0, 0]], 'target': [0, 1]},
    'octetsSinglet': {'factors': [[1, 1]] * 4, 'target': [0, 0], 'state': {'index': 7}},
    'octetsAdjoint': {'factors': [[1, 1]] * 4, 'target': [1, 1]},
    'octets27': {'factors': [[1, 1]] * 4, 'target': [2, 2]},
    'decuplet': {'factors': [[3, 0], [1, 0], [1, 0], [0, 1]], 'target': [2, 1]},
    'decupletStandard': {'factors': [[3, 0], [1, 0], [1, 0], [1, 0]], 'target': [1, 1]},
    'fifteen': {'factors': [[2, 1], [1, 0], [0, 1], [1, 0]], 'target': [3, 1]},
    'twentySeven': {'factors': [[2, 2], [1, 0], [0, 1], [1, 0]], 'target': [3, 2]},
}
high_names = {'decuplet', 'decupletStandard', 'fifteen', 'twentySeven'}
results = json.loads(target.read_text(encoding='utf-8')) if args.high_only else {}
results.update({name: run(dict(base, **inputs)) for name, inputs in cases.items()
                if not args.high_only or name in high_names})
results['complex'] = run(dict(base, **cases['four'], state={'amplitudes': [
    {'re': 'sqrt(2)/2', 'im': '0'}, {'re': '0', 'im': 'sqrt(2)/2'}, {'re': '0', 'im': '0'},
]}))
results['complexBack'] = run(dict(base, **cases['four'], direction='right_to_left',
                                  state={'amplitudes': results['complex']['exactOutputAmplitudes']}))
octets = {'factors': [[1, 1]] * 4, 'target': [0, 0]}
results['octetsComplex'] = run(dict(base, **octets, state={'amplitudes': [
    {'re': 'sqrt(2)/2' if i == 0 else '0', 'im': 'sqrt(2)/2' if i == 1 else '0'}
    for i in range(8)
]}))
results['octetsComplexBack'] = run(dict(base, **octets, direction='right_to_left',
                                        state={'amplitudes': results['octetsComplex']['exactOutputAmplitudes']}))
results['highComplex'] = run(dict(base, **cases['twentySeven'], state={'amplitudes': [
    {'re': 'sqrt(2)/2' if i == 0 else '0', 'im': 'sqrt(2)/2' if i == 1 else '0'}
    for i in range(5)
]}))
results['highComplexBack'] = run(dict(base, **cases['twentySeven'], direction='right_to_left',
                                    state={'amplitudes': results['highComplex']['exactOutputAmplitudes']}))
target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'Wrote {target.relative_to(ROOT)} with {len(results)} exact Python results')
