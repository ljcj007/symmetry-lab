"""Independent mathematical and boundary checks of the new teaching models."""
import itertools
import json
import sys
import unittest
from pathlib import Path
import numpy as np
import sympy as sp
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import symmetry_connections as c
from browser_api import run

class ConnectionsTests(unittest.TestCase):
 def test_pauli_all_orbital_spin_products(self):
  for orbital,spin in itertools.product(['same','symmetric','antisymmetric'],['singlet','triplet0','upup']):
   r=run('statistics_lab',dict(orbital=orbital,spin=spin))
   allowed=(orbital=='antisymmetric') != (spin=='singlet')
   self.assertEqual(r['summary'][2]['value'],allowed)
   self.assertEqual(r['checks']['rank'],6)
   self.assertTrue(r['checks']['idempotent']);self.assertTrue(r['checks']['exchangeSquared'])
 def test_s3_character_multiplicities(self):
  # A permutation with c cycles fixes d**c tensor basis vectors.
  chars=[8,2,4,4,2,4] # tested below from cycle count, not hardwired ordering
  perms=list(itertools.permutations(range(3)));counts=[]
  for order in perms:
   unseen=set(range(3));cycles=0
   while unseen:
    i=next(iter(unseen));cycles+=1
    while i in unseen:unseen.remove(i);i=order[i]
   P=c.permutation(3,2,order);self.assertEqual(P.trace(),2**cycles);counts.append(2**cycles)
  self.assertEqual(sum(counts)//6,4)
  r=c.statistics({'mode':'three'});mats={k:sp.Matrix([[sp.Rational(x) for x in row] for row in m]) for k,m in r['exactProjectors'].items()}
  self.assertEqual([mats[k].rank() for k in ['symmetric','antisymmetric','mixed','young']],[4,0,4,2])
  for k in mats:self.assertEqual(mats[k]**2,mats[k])
  self.assertEqual(mats['symmetric']+mats['antisymmetric']+mats['mixed'],sp.eye(8))
  self.assertNotEqual(mats['young'],mats['young'].T)
 def test_vortex_winding_and_core_detection(self):
  for x,w in [(-1,1),(1,-1),(0,0)]:
   r=c.defects({'loopX':x,'radius':.6})['diagnostics'];self.assertTrue(r['valid']);self.assertEqual(r['winding'],w)
  self.assertEqual(c.defects({'radius':2})['diagnostics']['winding'],0)
  self.assertFalse(c.defects({'radius':1})['diagnostics']['valid'])
  self.assertIsNone(c.defects({'radius':1})['diagnostics']['winding'])
 def test_nematic_and_merger(self):
  r=c.defects({'model':'nematic','loopX':-1,'radius':.6})
  self.assertEqual(r['diagnostics']['charge'],.5)
  self.assertEqual(c.defects({'separation':0})['diagnostics']['winding'],0)
 def test_phase_rotation_does_not_change_charge(self):
  for angle in [-179,-60,0,60,179]:self.assertEqual(c.defects({'loopX':-1,'radius':.6,'phase':angle})['diagnostics']['winding'],1)
 def test_ising_sign_and_translation(self):
  r=c.defects({'model':'ising','loopX':1,'radius':.5});x=np.array(r['plot']['x']);y=np.array(r['plot']['values'])
  self.assertTrue(np.all(np.diff(y)>=0));self.assertLess(y[0],0);self.assertGreater(y[-1],0);self.assertEqual(y[np.where(x==1)[0][0]],0)
 def test_reciprocity_all_models_random_controls(self):
  rng=np.random.default_rng(931)
  for model in ['hall','thermo','mixed']:
   for _ in range(12):
    B,M=rng.uniform(-2,2,2);r=c.response(dict(model=model,field=float(B),magnetization=float(M)))
    L=np.array(r['plot']['matrix']);LR=np.array(r['plot']['reversed']);e=np.array(r['plot']['parities'])
    np.testing.assert_allclose(L,e[:,None]*LR.T*e[None,:]);self.assertTrue(r['checks']['reciprocal'])
 def test_partial_reversal_and_deliberate_violation(self):
  r=c.response({'reverseM':'no'});self.assertTrue(r['checks']['reciprocal']);self.assertFalse(r['checks']['selectedReversal'])
  for model in ['hall','thermo','mixed']:self.assertFalse(c.response({'model':model,'violation':.2})['checks']['reciprocal'])
 def test_spatial_covariance(self):
  for op in ['c1','c4','mirror']:
   r=c.response({'space':op});self.assertLess(r['spatial']['covariance'],1e-10)
  r=c.response({'space':'mirror'});self.assertFalse(r['spatial']['controlsRetained']);self.assertGreater(r['spatial']['sameState'],.1)
  r=c.response({'space':'mirror','field':0,'magnetization':0});self.assertTrue(r['spatial']['controlsRetained'])
 def test_entropy_vs_reciprocity(self):
  r=c.response({'model':'thermo','cross':2,'field':0,'magnetization':0});self.assertTrue(r['checks']['reciprocal']);self.assertFalse(r['checks']['passive'])
  L=np.array(r['plot']['matrix']);eig,U=np.linalg.eigh((L+L.T)/2);X=U[:,0];self.assertLess(X@L@X,0)
  np.testing.assert_allclose(X@np.array(r['plot']['antisymmetric'])@X,0,atol=1e-12)
 def test_three_layer_symmetry(self):
  a=c.audit({});self.assertGreater(a['hamiltonian'],1);self.assertEqual(a['state'],0);self.assertTrue(a['forcedZero']);self.assertAlmostEqual(a['expectation'],0)
  b=c.audit({'hx':0,'hz':1,'stateAngle':90});self.assertEqual(b['hamiltonian'],0);self.assertGreater(b['state'],1);self.assertFalse(b['forcedZero']);self.assertAlmostEqual(b['expectation'],1)
 def test_antiunitary_state_and_hamiltonian(self):
  a=c.audit({'operation':'time','hx':0,'hz':0,'polarization':0});self.assertEqual(a['hamiltonian'],0);self.assertEqual(a['state'],0);self.assertTrue(a['forcedZero'])
  self.assertGreater(c.audit({'operation':'time','polarization':1})['state'],1)
 def test_exact_grader_equivalences_and_wrong_signs(self):
  for task,answer in [('projector','2/4'),('young','2/6'),('exchange','0-1'),('winding','1/2'),('onsager','a-b*M-B*b'),('commutator','h*I+I*h')]:self.assertTrue(c.grade({'task':task,'answer':answer})['correct'])
  self.assertFalse(c.grade({'task':'onsager','answer':'a+b*(B+M)'})['correct'])
  self.assertFalse(c.grade({'task':'commutator','answer':'2*h'})['correct'])
 def test_grader_rejects_code_and_unbounded_inputs(self):
  for value in ["__import__('os').getcwd()",'a.__class__','[1]*100000','2**1000000','1/0','1.0/2','sin(B)','a'*181,'a/a','1/(B+M)']:
   with self.assertRaises((ValueError,SyntaxError)):c.safe_expression(value)
 def test_inputs_finite_and_choice_checked(self):
  for fn,args in [(c.defects,{'radius':0}),(c.response,{'field':float('nan')}),(c.statistics,{'mode':'four'}),(c.audit,{'polarization':2})]:
   with self.assertRaises(ValueError):fn(args)
 def test_all_catalog_presets_and_lessons(self):
  catalog=json.loads((ROOT/'dist/data/connections-materials.json').read_text(encoding='utf8'))
  for m in catalog['modules']:
   defaults={f['key']:f['default'] for f in m['fields']}
   for p in m['presets']:
    r=run(m['action'],defaults|p['input']);json.dumps(r,allow_nan=False)
    self.assertTrue(r['summary']);self.assertTrue(r['replay']);self.assertEqual(r['module'],m['id'])
  self.assertEqual(len(catalog['lessons']),9);self.assertEqual(sum(len(e['steps']) for e in catalog['exercises']),36)

if __name__=='__main__':unittest.main(verbosity=2)
