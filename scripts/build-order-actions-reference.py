"""Capture bounded, genuine order_parameter_lab records for the teaching bridge.

No general solver is copied to JavaScript. --check compares floating values at
the declared precision so Windows/Linux libm last bits are not treated as a new
model. Integer matrices, source hashes, fields, and requests remain exact.
"""
from pathlib import Path
import hashlib
import itertools
import json
import math
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run

catalog=json.loads((ROOT/'dist/data/principles-materials.json').read_text(encoding='utf8'))
module=next(m for m in catalog['modules'] if m['id']=='order')
presets={p['id']:p['input'] for p in module['presets']}
requests={
    'axis':presets['order-cubic-axis'],
    'zero':{**presets['order-cubic-axis'],'etaZ':0},
    'reynolds':presets['order-axis'],
    'fieldZero':{**presets['order-field'],'fieldX':0},
    'field':presets['order-field'],
    'convention':presets['order-convention'],
}

def capture():
    records={}
    for key, request in requests.items():
        output=run('order_parameter_lab',request)
        assert output['checks']['passed']
        info=output['order']
        records[key]={'input':request,'parameters':output['parameters'],
            'energy':next(row['value'] for row in output['summary'] if row['label']=='当前自由能'),
            'order':{name:info[name] for name in ('vector','dimension','groupOrder','stabilizerOrder','isotropyLabel',
                'fieldGroupOrder','physicalStabilizerOrder','fieldOrbitSize','operations','domains','invariants','convention')},
            'checks':output['checks']}
    return {'schemaVersion':1,'capture':'Actual browser_api.run order_parameter_lab outputs; bounded teaching references.',
            'sourceCommit':'baeb2640125ce07685b3f2191d0c631f32917108',
            'sourceHashNormalization':'utf8-lf-v1',
            'coreSHA256':hashlib.sha256((ROOT/'dist/python/order_parameter_lab.py').read_text(encoding='utf8').encode('utf8')).hexdigest(),
            'records':records}

def verify_science(data):
    """Independent signed-permutation enumeration, not the production closure."""
    for key,record in data['records'].items():
        dim=record['order']['dimension']
        operations=record['order']['operations']
        independent=[]
        for perm in itertools.permutations(range(dim)):
            for signs in itertools.product((-1,1),repeat=dim):
                independent.append([[signs[i] if j==perm[i] else 0 for j in range(dim)] for i in range(dim)])
        flatten=lambda m:tuple(v for row in m for v in row)
        assert {flatten(m) for m in independent}=={flatten(row['matrix']) for row in operations}
        eta=record['order']['vector'];field=[record['parameters']['fieldX']]+[0]*(dim-1)
        apply=lambda matrix,v:[sum(a*b for a,b in zip(row,v)) for row in matrix]
        images=[apply(row['matrix'],eta) for row in operations]
        near=lambda a,b:max(abs(x-y) for x,y in zip(a,b))<1e-12
        assert sum(near(v,eta) for v in images)==record['order']['stabilizerOrder']
        for image,row in zip(images,operations):assert near(image,row['image'])
        p=record['parameters']
        def polynomial(v):
            return p['a2']*sum(x*x for x in v)+p['b4']*sum(x**4 for x in v)+p['c4']*sum(v[i]**2*v[j]**2 for i in range(dim) for j in range(i+1,dim))+p['d6']*sum(x**6 for x in v)+p['e6']*sum(v[i]**4*v[j]**2 for i in range(dim) for j in range(dim) if i!=j)+(p['f6']*math.prod(x*x for x in v) if dim==3 else 0)-sum(a*b for a,b in zip(field,v))
        assert math.isclose(polynomial(eta),record['energy'],rel_tol=2e-12,abs_tol=2e-12)
        for row in record['order']['domains']:assert math.isclose(polynomial(row['vector']),row['energy'],rel_tol=2e-12,abs_tol=2e-12)
        Q=record['order']['convention']['rotation'];transpose=list(map(list,zip(*Q)))
        eta_new=apply(transpose,eta);field_new=apply(transpose,field)
        assert near(eta_new,record['order']['convention']['vector'])
        assert near(field_new,record['order']['convention']['field'])
        assert math.isclose(sum(a*b for a,b in zip(eta,field)),sum(a*b for a,b in zip(eta_new,field_new)),abs_tol=2e-12)
    assert data['records']['axis']['order']['groupOrder']==48
    assert data['records']['axis']['order']['stabilizerOrder']==8
    assert len(data['records']['axis']['order']['domains'])==6
    assert data['records']['zero']['order']['stabilizerOrder']==48
    assert len(data['records']['zero']['order']['domains'])==1
    field={tuple(row['vector']):row['energy'] for row in data['records']['field']['order']['domains']}
    assert math.isclose(field[(1,0,0)],-.2,abs_tol=2e-12)
    assert math.isclose(field[(-1,0,0)],.4,abs_tol=2e-12)
    assert math.isclose(field[(0,1,0)],.1,abs_tol=2e-12)

def compare(a,b,path=''):
    if isinstance(a,dict):
        assert a.keys()==b.keys(),path
        for key in a:compare(a[key],b[key],path+'/'+key)
    elif isinstance(a,list):
        assert len(a)==len(b),path
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+'/'+str(i))
    elif isinstance(a,float):
        assert isinstance(b,(int,float)) and not isinstance(b,bool) and math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-12),(path,a,b)
    else:assert type(a) is type(b) and a==b,(path,a,b)

TARGET=ROOT/'dist/order-actions-reference.js'
PREFIX='// Genuine bounded API capture; regenerate with scripts/build-order-actions-reference.py.\nexport const ORDER_ACTIONS_REFERENCE = '
if __name__=='__main__':
    data=capture();verify_science(data)
    body=PREFIX+json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+';\n'
    if '--emit-json' in sys.argv:
        print(json.dumps(data,ensure_ascii=False,allow_nan=False,separators=(',',':')))
    elif '--check' in sys.argv:
        source=TARGET.read_text(encoding='utf8')
        assert source.startswith(PREFIX)
        stored=json.loads(source[len(PREFIX):].rstrip().removesuffix(';'))
        compare(stored,data);verify_science(stored)
        print('Order action reference: six actual API records, complete signed-permutation groups, energies, counts and coordinate covariance passed.')
    else:
        TARGET.write_text(body,encoding='utf8')
        print('Captured six genuine bounded order action records:',len(body.encode('utf8')),'bytes')
