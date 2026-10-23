"""Refresh real Python response fixtures used by the display-only Node UI test.

Run explicitly after changing the CG response contract. The normal JS test reads
the saved responses, so it does not need Python, NumPy or SymPy installed.
"""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from su3_cg import run

cases = {
    'exactTen': dict(p1=3, q1=0, p2=1, q2=0, arithmetic='exact', state={'index': 1}),
    'exactLarge': dict(p1=2, q1=2, p2=1, q2=0, arithmetic='exact', state={'index': 1}),
    'exactComplex': dict(p1=1, q1=0, p2=1, q2=0, arithmetic='exact', state={
        'amplitudes': [{'re': 'sqrt(2)/2' if i == 1 else '0',
                        'im': 'sqrt(2)/2' if i == 3 else '0'} for i in range(9)]}),
    'numericLarge': dict(p1=2, q1=2, p2=1, q2=1, state={'index': 7}),
}
responses = {name: run(dict(payload, lab='lie', experiment='su3_cg')) for name, payload in cases.items()}
responses['exactComplexBack'] = run(dict(
    lab='lie', experiment='su3_cg', p1=1, q1=0, p2=1, q2=0,
    arithmetic='exact', direction='coupled_to_product',
    state={'amplitudes': responses['exactComplex']['exactOutputAmplitudes']}))
target = ROOT / 'scripts' / 'fixtures' / 'su3-cg-extended-ui.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(responses, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('Refreshed UI fixtures: ' + ', '.join(f'{name}={result["dimension"]}' for name, result in responses.items()))
