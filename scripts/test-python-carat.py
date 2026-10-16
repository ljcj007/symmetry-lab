"""Independent exact catalogue checks and computation regressions."""
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import carat_browser as carat

started = time.monotonic()
manifest = json.loads((ROOT/'dist/data/carat/manifest.json').read_text(encoding='utf8'))
expected_q = [2,10,32,227,955,7103]
expected_z = [2,13,73,710,6079,85308]
expected_affine = [2,17,219,4783,222018,28927915]
catalogs = {}
checked_relators = 0
checked_generators = 0
for item in manifest['dimensions']:
    d = item['dimension']
    raw = (ROOT/'dist/data/carat'/item['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == item['sha256']
    db = json.loads(gzip.decompress(raw))
    catalogs[d] = db
    assert len(db['entries']) == expected_q[d-1]
    assert len({e['name'] for e in db['entries']}) == expected_q[d-1]
    assert sum(e['z_classes'] for e in db['entries']) == expected_z[d-1]
    assert sum(e['affine_classes'] for e in db['entries']) == expected_affine[d-1]
    for e in db['entries']:
        gens = [tuple(tuple(int(x) for x in row) for row in a) for a in e['generators']]
        inverse = []
        for g in gens:
            m = sp.Matrix(g)
            assert m.shape == (d,d) and abs(m.det()) == 1
            inverse.append(tuple(tuple(int(x) for x in row) for row in m.inv().tolist()))
            checked_generators += 1
        for relator in e['relators']:
            value = carat._identity(d)
            for letter in relator:
                assert isinstance(letter,int) and 1 <= abs(letter) <= len(gens)
                value = carat._mul(value,gens[letter-1] if letter>0 else inverse[-letter-1])
            assert value == carat._identity(d),(d,e['name'],relator)
            checked_relators += 1
        assert [list(col) for col in sorted(zip(*e['character_matrix'][:9]))] == e['fingerprint']
        assert sum(e['character_matrix'][0]) == e['order']
    print(f'dimension {d}: all {len(db["entries"])} catalogue representatives and relators exact',flush=True)

# Compute all catalogue Q invariants in dimensions 1–3 independently of tables.
for d in range(1,4):
    for e in catalogs[d]['entries']:
        r = carat.run({'action':'classify','dimension':d,'generators':e['generators']},catalogs[d])
        assert r['q_status'] == 'certified' and r['q_class']['name'] == e['name']
        assert r['group_order'] == e['order']

# High-dimensional classification is tested on actual catalogues, including
# all fingerprint collisions where exact central-idempotent algebra is needed.
for d in [4,5,6]:
    db = catalogs[d]
    count = Counter(json.dumps(e['fingerprint']) for e in db['entries'])
    selected = [e for i,e in enumerate(db['entries']) if (i % max(1,len(db['entries'])//12)==0 and e['order']<=384) or count[json.dumps(e['fingerprint'])]>1]
    for e in selected:
        gens = carat._generators({'name':e['name']},db)
        group = carat.group_closure(gens)
        assert len(group) == e['order']
        assert [list(x) for x in carat.characteristic_fingerprint(gens,group)] == e['fingerprint']
        if count[json.dumps(e['fingerprint'])]>1:
            assert carat.full_characteristic_matrix(gens,group) == e['character_matrix'],e['name']
        r = carat.run({'action':'classify','dimension':d,'name':e['name']},db)
        assert r['q_class']['name'] == e['name']
    print(f'dimension {d}: {len(selected)} independent classifications including every invariant collision',flush=True)

# A highly nonstandard unimodular shear must retain the Q class. Certificate
# must satisfy the full conjugacy relation, not just a matched group order.
db = catalogs[2]
g = carat._entry('min.4',db)['generators']
b = sp.Matrix([[1,17],[0,1]])
sheared = [(b.inv()*sp.Matrix(a)*b).tolist() for a in g]
r = carat.run({'action':'classify','dimension':2,'generators':sheared,'find_conjugator':True},db)
assert r['q_class']['name'] == 'min.4'
c = sp.Matrix(r['certificate']['matrix'])
target = set(carat.group_closure(carat._generators({'name':'min.4'},db)))
assert all(tuple(tuple(int(x) for x in row) for row in (c.inv()*sp.Matrix(a)*c).tolist()) in target for a in sheared)
r = carat.run({'action':'representative','dimension':2,'name':'min.4','basis':[[2,0],[0,2]]},db)
assert r['z_equivalent_to_catalog_representative'] is True

for example in (ROOT/'dist/examples').glob('carat-*.json'):
    payload = json.loads(example.read_text(encoding='utf8'))
    result = carat.run(payload,catalogs[payload['dimension']])
    assert result['action'] == payload['action']

# Identity action leaves every sublattice invariant: index-two lattices count
# 2^d-1. This checks HNF enumeration against an independent combinatorial result.
for d in [2,4,6]:
    r = carat.run({'action':'invariant_lattices','dimension':d,'generators':[sp.eye(d).tolist()],'max_index':2},catalogs[d])
    assert r['complete_through_requested_index'] is True
    assert len(r['lattices']) == 2**d
    assert sum(x['index']==2 for x in r['lattices']) == 2**d-1
r = carat.run({'action':'invariant_lattices','dimension':6,'name':'min.171','max_index':4,'max_candidates':1},catalogs[6])
assert r['complete_through_requested_index'] is False and r['z_class_count'] is None

# Bounded closure explicitly refuses an infinite unipotent matrix.
try:
    carat.run({'action':'classify','dimension':2,'generators':[[[1,1],[0,1]]],'max_order':20},db)
    raise AssertionError('Infinite group incorrectly classified')
except carat.SearchLimitError:
    pass
try:
    carat.run({'action':'classify','dimension':2,'generators':[[[2,0],[0,1]]]},db)
    raise AssertionError('Non-unimodular matrix accepted')
except ValueError:
    pass
print(f'CARAT Python checks passed: 8329 Q representatives, {checked_generators} generators, {checked_relators} relators; {time.monotonic()-started:.1f}s')
