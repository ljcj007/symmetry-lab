from pathlib import Path
import sys, json
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'dist/python'))
from symmetry_workshop import calculate, generators, evaluate

for group, dim in [('c2v',5),('c3v',3),('c4v',3)]:
    r=calculate({'pointGroup':group})
    assert r['summary'][0]['value']==dim,(group,r['summary'])
    c=np.array(r['workshop']['coefficients'])
    assert abs(c[1,2]-1)<1e-10 and abs(c[2,1]+1)<1e-10
    assert abs(c[3,0])+abs(c[1,0])<1e-10
    # Independent randomly selected momenta test full matrix-covariance identity.
    for _,rot,spin in generators(group):
        for xy in [(.127,-.291),(-.48,.31),(.19,.21)]:
            x,y=rot@xy
            np.testing.assert_allclose(evaluate(c,x,y),spin@evaluate(c,*xy),atol=1e-10)
    assert r['checks']['passed']
    json.dumps(r,allow_nan=False)
r=calculate({'inversion':1})
assert np.linalg.norm(np.array(r['workshop']['coefficients'])[1:])<1e-10
r=calculate({'rotation':0,'mirror':0,'timeReversal':0})
np.testing.assert_allclose(r['workshop']['inputCoefficients'],r['workshop']['coefficients'],atol=1e-10)
assert r['summary'][0]['value']==24
assert calculate({'rotation':0,'mirror':0,'timeReversal':0})['summary'][2]['value']>0
for p in [{'pointGroup':'unknown'},{'rashba':float('nan')},{'mass':6},{'mirror':3}]:
    try:calculate(p)
    except ValueError:pass
    else:raise AssertionError(p)
print('Symmetry workshop: C2v/C3v/C4v dimensions, Rashba, inversion+TR, independent covariance, no constraints and invalid inputs passed.')
