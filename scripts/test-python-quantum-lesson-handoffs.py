"""Check the calculations from the actual quantum classroom submissions."""
from pathlib import Path
from math import isclose, pi
import json
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'dist/python'))
from browser_api import run

requests=json.load(sys.stdin)
results={lesson:{name:run(value['action'],value['input']) for name,value in cases.items()}
         for lesson,cases in requests.items()}
geometry=results['geometry-rays']
for name in ['lecture','derived']:
    result=geometry[name]
    assert result['parameters']['t1']==0 and result['parameters']['t2']==1
    assert all(isclose(value,.25,abs_tol=1e-7) for value in result['line']['metric'])
    assert isclose(abs(result['topology']['value']),pi,abs_tol=1e-10)
assert geometry['legacy']['parameters']['t1']==.6
assert any(not isclose(value,.25,abs_tol=1e-3) for value in geometry['legacy']['line']['metric'])

orbitals=results['orbital-soc']
groups=sorted(orbitals['derived']['groups'],key=lambda row:row['energy'])
assert [row['degeneracy'] for row in groups]==[4,6]
assert isclose(groups[0]['energy'],-.3,abs_tol=1e-10)
assert isclose(groups[1]['energy'],.2,abs_tol=1e-10)
assert isclose(groups[1]['energy']-groups[0]['energy'],.5,abs_tol=1e-10)
for name in ['lecture','legacy']:
    assert [row['degeneracy'] for row in orbitals[name]['groups']]==[2]*5
print('Actual quantum classroom requests passed: fixed-basis SSH metric 1/4, free-ion SOC energies −0.3/0.2 eV with degeneracies 4/6, and retained controls.')
