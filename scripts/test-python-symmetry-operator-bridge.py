"""Exercise genuine bounded API captures and independent scientific identities."""
from pathlib import Path
import importlib.util
import json
import sys

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('operator_capture',root/'scripts/build-symmetry-operator-reference.py')
capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
actual=capture.capture();capture.verify_science(actual)
source=(root/'dist/symmetry-operator-reference.js').read_text(encoding='utf8');assert source.startswith(capture.PREFIX)
stored=json.loads(source[len(capture.PREFIX):].rstrip().removesuffix(';'))
capture.compare(stored,actual);capture.verify_science(stored)
assert len(actual['records'])==8
for record in actual['records'].values():
 assert set(record['input'])==set(dict((field['key'],field['default']) for field in capture.MODULES[record['module']]['fields']))
 try:capture.run(record['action'],{**record['input'],'imaginaryField':1})
 except ValueError:pass
 else:raise AssertionError('Production API accepted an invented field')
print('Symmetry operator Python: eight real complete-schema requests, fixed signed-operation averages, axial/endpoint constraints and 5/6/4/6 dimensions, literal Pauli Kronecker commutators, cancellation, XXZ and active-pi XYZ counterexamples passed; no cross-platform float bit equality required.')
