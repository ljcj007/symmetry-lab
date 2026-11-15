"""Independent finite-group/polynomial checks against the genuine Python API."""
from fractions import Fraction
from itertools import permutations, product
from pathlib import Path
import importlib.util
import json
import math
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
spec=importlib.util.spec_from_file_location('order_capture',ROOT/'scripts/build-order-actions-reference.py')
capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
data=capture.capture();capture.verify_science(data)
stored=json.loads((ROOT/'dist/order-actions-reference.js').read_text(encoding='utf8')[len(capture.PREFIX):].rstrip().removesuffix(';'))
capture.compare(stored,data)

def group(dim):
    return [[[signs[i] if j==perm[i] else 0 for j in range(dim)] for i in range(dim)] for perm in permutations(range(dim)) for signs in product((-1,1),repeat=dim)]
def apply(a,v):return [sum(x*y for x,y in zip(row,v)) for row in a]
def transpose(a):return list(map(list,zip(*a)))
def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]
def near(a,b):return math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-12)
def vector_near(a,b):return all(near(x,y) for x,y in zip(a,b))
def count(ops,v,h):
    fixed=[g for g in ops if vector_near(apply(g,v),v)]
    field=[g for g in ops if vector_near(apply(g,h),h)]
    intersection=[g for g in field if vector_near(apply(g,v),v)]
    orbit=[]
    for g in field:
        image=apply(g,v)
        if not any(vector_near(image,x) for x in orbit):orbit.append(image)
    return len(ops),len(fixed),len(field),len(intersection),len(orbit)

# Exact polynomial Reynolds averages; enumeration is independent of core BFS.
ops=group(2)
for seed,expected in [((2,0),{(2,0):Fraction(1,2),(0,2):Fraction(1,2)}),((1,1),{}),((4,0),{(4,0):Fraction(1,2),(0,4):Fraction(1,2)})]:
    polynomial={}
    for g in ops:
        powers=[0,0];sign=1
        for i,power in enumerate(seed):
            j=next(j for j,x in enumerate(g[i]) if x)
            powers[j]+=power;sign*=g[i][j]**power
        key=tuple(powers);polynomial[key]=polynomial.get(key,Fraction(0))+Fraction(sign,len(ops))
    polynomial={k:v for k,v in polynomial.items() if v}
    assert polynomial==expected
    if not polynomial:continue
    key='a2' if seed==(2,0) else 'b4'
    primitive=next(b for b in data['records']['reynolds']['order']['invariants'] if b['id']==key)
    assert {tuple(t['powers']):Fraction(t['coefficient'],2) for t in primitive['terms']}==expected
    for eta in [(1,0),(1,1),(0,0)]:
        for coefficient in (-2,2):
            request={**data['records']['reynolds']['input'],**dict.fromkeys(['a2','b4','c4','d6','e6','f6'],0),'etaX':eta[0],'etaY':eta[1],key:coefficient/2,'fieldX':0}
            output=run('order_parameter_lab',request)
            energy=next(x['value'] for x in output['summary'] if x['label']=='当前自由能')
            average=sum(value*math.prod(x**power for x,power in zip(eta,powers)) for powers,value in polynomial.items())
            assert near(energy,float(coefficient*average))

# Every transformed operation, action, field and subgroup remains covariant.
r=data['records']['convention'];q=r['order']['convention']['rotation'];qt=transpose(q)
eta=r['order']['vector'];field=[r['parameters']['fieldX'],0,0];eta_prime=apply(qt,eta);field_prime=apply(qt,field)
before=group(3);after=[mul(mul(qt,g),q) for g in before]
assert count(before,eta,field)==count(after,eta_prime,field_prime)==(48,1,8,1,8)
for g,gprime in zip(before,after):assert vector_near(apply(gprime,eta_prime),apply(qt,apply(g,eta)))
assert near(sum(x*y for x,y in zip(field,eta)),sum(x*y for x,y in zip(field_prime,eta_prime)))
naive=sum(b['coefficient']*sum(t['coefficient']*math.prod(x**power for x,power in zip(eta_prime,t['powers'])) for t in b['terms']) for b in r['order']['invariants'])-sum(x*y for x,y in zip(field_prime,eta_prime))
assert near(naive,.3758680136551086) and not near(naive,r['energy'])
print('Order actions Python: six genuine API references; independently enumerated Oh/C4v, exact Reynolds polynomials, 12 copied one-term inputs, 48 covariant actions, subgroup counts and wrong-coordinate counterexample passed.')
