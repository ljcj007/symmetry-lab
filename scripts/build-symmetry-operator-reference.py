"""Capture eight bounded genuine API records for operator-action teaching.

No general symmetry solver is moved into JavaScript. Floating captures use a
2e-12 comparison tolerance across platform libm implementations; integers,
schemas, exact matrices and normalized source hashes remain checked.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run

TARGET=ROOT/'dist/symmetry-operator-reference.js'
PREFIX='// Genuine finite API references; regenerate with scripts/build-symmetry-operator-reference.py.\nexport const SYMMETRY_OPERATOR_REFERENCE = '
CATALOG=json.loads((ROOT/'dist/data/principles-materials.json').read_text(encoding='utf8'))
MODULES={m['id']:m for m in CATALOG['modules']}

def preset(module,id):return next(p['input'].copy() for p in MODULES[module]['presets'] if p['id']==id)
REQUESTS={
 'mirror':('exchange', {**preset('exchange','exchange-plane'),'dx':.3,'dy':.4,'dz':.6}),
 'inversion':('exchange',{**preset('exchange','exchange-inversion'),'mirrorXY':0}),
 'combined':('exchange',preset('exchange','exchange-inversion')),
 'perpendicular':('exchange',preset('exchange','exchange-perpendicular')),
 'su2':('conservation',preset('conservation','conservation-su2')),
 'xxz-sx':('conservation',preset('conservation','conservation-u1')),
 'xxz-sz':('conservation',{**preset('conservation','conservation-u1'),'observable':'sz'}),
 'xyz':('conservation',preset('conservation','conservation-discrete'))}

def capture():
 records={}
 for key,(module,input) in REQUESTS.items():
  action=MODULES[module]['action'];r=run(action,input);assert r['checks']['passed']
  if module=='exchange':
   e=r['exchange']
   result={name:e[name] for name in ['inputTensor','tensor','D','rank','closureOrder']}
   result['constraints']=[{name:row[name] for name in ['id','polarMatrix','axialMatrix','swapsSites','formula','relations','inputResidual','outputResidual']} for row in e['constraints']]
  else:
   c=r['conservation'];selected=next(row for row in c['proofs'] if row['id']==input['observable'])
   result={'selected':input['observable'],'selectedProof':{name:selected[name] for name in ['id','operator','commutator','adjoint','hamiltonianNorm','totalAdjointNorm','contributions','conserved']},'allHamiltonianNorms':{row['id']:row['hamiltonianNorm'] for row in c['proofs']},'hamiltonian':c['convention']['originalHamiltonian']}
  records[key]={'module':module,'action':action,'input':input,'result':result,'checks':{k:v for k,v in r['checks'].items() if k!='method'}}
 files=['dist/python/exchange_symmetry_lab.py','dist/python/conservation_lab.py','dist/python/density_matrix_lab.py','dist/data/principles-materials.json']
 return {'schemaVersion':1,'capture':'Actual browser_api.run outputs; eight finite teaching requests.','sourceHashNormalization':'utf8-lf-v1','sourceHashes':{p:hashlib.sha256((ROOT/p).read_text(encoding='utf8').encode('utf8')).hexdigest() for p in files},'records':records}

def unpack(a):return np.array(a['re'])+1j*np.array(a['im'])
def verify_science(data):
 """Independent fixed group averages and literal Pauli Kronecker products."""
 for key in ['mirror','inversion','combined','perpendicular']:
  record=data['records'][key];p=record['input'];r=record['result']
  raw=np.array([[1,.6,-.4],[-.6,1,.3],[.4,-.3,1.]])
  operations={'mirror':[np.eye(3),np.diag([1,1,-1])],'inversion':[np.eye(3),-np.eye(3)],'combined':[np.eye(3),-np.eye(3),np.diag([1,1,-1]),np.diag([-1,-1,1])],'perpendicular':[np.eye(3),np.diag([-1,1,1])]}[key]
  transformed=[]
  for operation in operations:
   axial=round(np.linalg.det(operation))*operation
   transformed.append(axial.T@(raw.T if operation[0,0]<0 else raw)@axial)
  projected=sum(transformed)/len(transformed)
  assert np.allclose(raw,r['inputTensor'],atol=2e-12,rtol=2e-12)
  assert np.allclose(projected,r['tensor'],atol=2e-12,rtol=2e-12)
  expected_d={'mirror':[0,0,.6],'inversion':[0,0,0],'combined':[0,0,0],'perpendicular':[0,.4,.6]}[key]
  assert np.allclose(r['D'],expected_d,atol=2e-12,rtol=2e-12)
  assert 9-r['rank']=={'mirror':5,'inversion':6,'combined':4,'perpendicular':6}[key]
 pauli=[np.array([[0,1],[1,0]],complex),np.array([[0,-1j],[1j,0]]),np.diag([1.,-1.])]
 a=[np.kron(s,np.eye(2))/2 for s in pauli];b=[np.kron(np.eye(2),s)/2 for s in pauli];total=[x+y for x,y in zip(a,b)]
 for key in ['su2','xxz-sx','xxz-sz','xyz']:
  record=data['records'][key];p=record['input'];r=record['result'];assert p['gamma1']==p['gammaPhi']==0
  h=sum(p[name]*a[i]@b[i] for i,name in enumerate(['jx','jy','jz']));q=total[['sx','sy','sz'].index(p['observable'])]
  assert np.allclose(h,unpack(r['hamiltonian']),atol=2e-12,rtol=2e-12)
  assert np.allclose(q,unpack(r['selectedProof']['operator']),atol=2e-12,rtol=2e-12)
  parts=[]
  for i,name in enumerate(['jx','jy','jz']):
   term=p[name]*a[i]@b[i];part=term@q-q@term;parts.append(part)
   actual=next(row for row in r['selectedProof']['contributions'] if row['term']==name)
   assert np.allclose(part,unpack(actual['commutator']),atol=2e-12,rtol=2e-12)
  assert np.allclose(sum(parts),unpack(r['selectedProof']['commutator']),atol=2e-12,rtol=2e-12)
  u=np.diag([-1.,1.,1.,-1.]);assert np.linalg.norm(h@u-u@h)<2e-12
  for i,name in enumerate(['sx','sy','sz']):assert math.isclose(float(np.linalg.norm(h@total[i]-total[i]@h)),r['allHamiltonianNorms'][name],abs_tol=2e-12)
 s=data['records']['su2']['result']['selectedProof'];parts={x['term']:x for x in s['contributions']}
 assert unpack(parts['jy']['commutator'])[0,1]==-.25
 assert unpack(parts['jz']['commutator'])[0,1]==.25
 assert math.isclose(parts['jy']['norm']+parts['jz']['norm'],math.sqrt(2),abs_tol=2e-12) and s['hamiltonianNorm']==0
 assert math.isclose(data['records']['xxz-sx']['result']['selectedProof']['hamiltonianNorm'],.7/math.sqrt(2),abs_tol=2e-12)
 assert data['records']['xxz-sz']['result']['selectedProof']['hamiltonianNorm']==0
 assert math.isclose(data['records']['xyz']['result']['selectedProof']['hamiltonianNorm'],.6/math.sqrt(2),abs_tol=2e-12)
 assert data['records']['xyz']['result']['allHamiltonianNorms']['s2']==0

def compare(a,b,path=''):
 if isinstance(a,dict):
  assert a.keys()==b.keys(),path
  for key in a:compare(a[key],b[key],path+'/'+key)
 elif isinstance(a,list):
  assert len(a)==len(b),path
  for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+'/'+str(i))
 elif isinstance(a,float):assert isinstance(b,(int,float)) and not isinstance(b,bool) and math.isclose(a,b,rel_tol=2e-12,abs_tol=2e-12),(path,a,b)
 else:assert type(a) is type(b) and a==b,(path,a,b)

if __name__=='__main__':
 data=capture();verify_science(data)
 if '--check' in sys.argv:
  source=TARGET.read_text(encoding='utf8');assert source.startswith(PREFIX)
  stored=json.loads(source[len(PREFIX):].rstrip().removesuffix(';'));compare(stored,data);verify_science(stored)
  print('Symmetry operators: eight genuine API references, independent bond projections and Pauli commutators checked.')
 elif '--emit-json' in sys.argv:print(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False))
 else:
  TARGET.write_text(PREFIX+json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+';\n',encoding='utf8')
  print('Captured eight finite symmetry-operator references:',TARGET.stat().st_size,'bytes')
