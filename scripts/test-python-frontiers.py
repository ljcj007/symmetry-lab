import sys,unittest,itertools,json
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'dist/python'))
import symmetry_frontiers as f
from browser_api import run

class Frontiers(unittest.TestCase):
 def test_layer_faces(self):
  for face,order in [('001',16),('110',8),('111',12)]:
   s=f.layer_state({'face':face});self.assertEqual(len(s['operations']),order);self.assertTrue(s['closure'])
   for o in s['operations']:
    r=np.array(o['matrix']);t=np.array(o['translation']);self.assertAlmostEqual(t@s['normal'],0)
    cost=f.periodic_cost(s['positions']@r.T+t,s['positions'],s['lattice'],s['species'])
    self.assertLess(max(cost[i,j] for i,j in enumerate(o['permutation'])),1e-7)
 def test_surface_labels_remove_side_exchange(self):
  s=f.layer_state({'termination':'marker'});self.assertEqual(len(s['operations']),8)
  self.assertFalse(any(o['flipsNormal'] for o in s['operations']))
 def test_boundary_and_interface_closure(self):
  for face,n,shift in itertools.product(['001','110','111'],[1,3,6],[0,.23,.5]):
   s=f.layer_state({'face':face,'layers':n,'registry':shift,'interface':'hetero','bulk':'alternating','cut':1})
   self.assertTrue(s['closure']);self.assertTrue(s['operations'])
 def test_matching_is_bijective(self):
  self.assertIsNone(f.assignment(np.array([[0,1],[0,1]]),.1))
  self.assertEqual(f.assignment(np.eye(2),.1),[1,0])
 def test_oblique_periodic_metric(self):
  s=f.layer_state({'face':'111'});x=s['positions'];lat=s['lattice']
  c=f.periodic_cost(x+lat[:,0]-2*lat[:,1],x,lat,s['species']);self.assertLess(np.max(np.diag(c)),1e-12)
  c=f.periodic_cost(x+10*s['normal'],x,lat,s['species']);self.assertGreater(c.min(),5)
 def test_chirality_polarity_independent(self):
  for k,count,polar,chiral in [('d3',6,0,True),('pyramid',8,1,False),('octahedron',48,0,False),('tetra',1,3,True)]:
   r=f.chirality_lab({'motif':k});self.assertEqual(len(r['operations']),count)
   self.assertEqual(r['summary'][2]['value'],polar);self.assertEqual(r['summary'][0]['value'],chiral)
   self.assertAlmostEqual(r['mirrorFit']['determinant'],1)
   self.assertEqual(r['mirrorFit']['rms']>1e-7,chiral)
 def test_mirror_and_rotation_invariance(self):
  for k in ['d3','tetra','pyramid']:
   a=f.chirality_lab({'motif':k,'handedness':1});b=f.chirality_lab({'motif':k,'handedness':-1})
   self.assertAlmostEqual(a['mirrorFit']['rms'],b['mirrorFit']['rms'])
  x,l=f.motif('d3');q=f.cubic_ops()[7];ops=f.motif_operations(x@q.T,l);self.assertEqual(len(ops),6)
 def test_noise_and_tolerance_have_separate_meanings(self):
  a=f.chirality_lab({'noise':.04,'tolerance':1e-6});b=f.chirality_lab({'noise':.04,'tolerance':.3})
  self.assertEqual(len(a['operations']),1);self.assertEqual(a['mirrorFit'],b['mirrorFit'])
  self.assertEqual(sum(v['accepted'] for v in a['pseudo']['residuals']),1)
  self.assertEqual(sum(v['accepted'] for v in b['pseudo']['residuals']),6)
  self.assertTrue(all(y['accepted']>=x['accepted'] for x,y in zip(a['path'],a['path'][1:])))
 def test_optical_round_trip(self):
  a=f.chirality_lab({'optical':'natural','angle':30});b=f.chirality_lab({'optical':'faraday','angle':30})
  np.testing.assert_allclose(a['optical']['roundTrip'],np.eye(2),atol=1e-12)
  np.testing.assert_allclose(b['optical']['output'],[.5,np.sqrt(3)/2],atol=1e-12)
 def test_aklt_parent_and_boundaries(self):
  for bc,mult in [('periodic',1),('open',4)]:
   r=f.spin_point(4,bc,0,0,'gradient');self.assertEqual(r['groundMultiplicity'],mult)
   self.assertAlmostEqual(r['energies'][0],0);self.assertLess(r['stateResidual'],1e-11)
   self.assertTrue(all(v<1e-12 for v in r['symmetry'].values()))
   self.assertAlmostEqual(sum(r['schmidt']),1);self.assertGreaterEqual(min(r['schmidt']),0)
 def test_protection_is_not_a_single_switch(self):
  u=f.spin_point(4,'periodic',0,.3,'uniform');g=f.spin_point(4,'periodic',0,.3,'gradient')
  self.assertGreater(u['symmetry']['T'],.01);self.assertLess(u['symmetry']['inversion'],1e-12)
  self.assertGreater(g['symmetry']['inversion'],.01)
  d=f.spin_point(4,'periodic',2,0,'gradient');self.assertTrue(all(v<1e-12 for v in d['symmetry'].values()))
 def test_virtual_fixed_point_evidence(self):
  r=f.spt_lab({});x=np.array(r['virtual']['Ux']);z=np.array(r['virtual']['Uz'])
  np.testing.assert_array_equal(x@z,-z@x);self.assertEqual(r['virtual']['commutatorPhase'],-1)
  r=f.spt_lab({'anisotropy':1});self.assertIsNone(r['virtual']['commutatorPhase'])
 def test_path_records_actual_hamiltonians(self):
  p={'fieldPattern':'uniform','pathAxis':'field','pathEnd':.6};r=f.spt_lab(p)
  for a in r['path']:
   b=f.spin_point(4,'periodic',0,a['parameter'],'uniform',False)
   np.testing.assert_allclose(a['energies'],b['energies'],atol=1e-12)
   self.assertEqual(a['symmetry'],b['symmetry'])
 def test_axial_time_and_translation(self):
  p={'matrix':np.diag([-1,1,1]).tolist(),'translation':[.5,0,0],'position':[1,2,3],'momentum':[.2,.3,.4],'spin':[1,2,3]}
  a=f.linked(p);b=f.linked(p|{'timeReversal':True})
  np.testing.assert_allclose(a['real'],[-.5,2,3]);np.testing.assert_allclose(a['spin'],[1,-2,-3])
  np.testing.assert_allclose(b['spin'],-np.array(a['spin']));np.testing.assert_allclose(b['real'],a['real'])
  self.assertAlmostEqual(sum(v*v for v in a['phase']),1)
 def test_inverse_ambiguity_and_grading(self):
  p={'domain':'spt','target':'uniform','revealed':['T']};r=f.inverse(p)
  self.assertEqual(set(r['remaining']),{'uniform','gradient'});self.assertFalse(r['unique']);self.assertEqual(r['nextMeasurement'],'inversion')
  r=f.inverse(p|{'guesses':['uniform','gradient'],'grade':True});self.assertTrue(r['correct'])
  r=f.inverse(p|{'guesses':['uniform'],'grade':True});self.assertFalse(r['correct'])
  r=f.inverse(p|{'revealed':['T','inversion']});self.assertEqual(r['remaining'],['uniform'])
 def test_all_presets_json_and_api(self):
  d=json.loads((ROOT/'dist/data/frontiers-materials.json').read_text(encoding='utf8'))
  for m in d['modules']:
   for preset in m['presets']:
    p={x['key']:x['default'] for x in m['fields']}|preset['input'];r=run(m['action'],p)
    json.dumps(r,allow_nan=False);self.assertTrue(r['replay']);self.assertTrue(r['inverseSetup'])
 def test_validation_bounds(self):
  for action,p in [('manybody_spt_lab',{'sites':6}),('manybody_spt_lab',{'sites':4.1}),('layer_symmetry_lab',{'layers':20}),('chirality_polarity_lab',{'tolerance':float('nan')}),('symmetry_linked',{'matrix':[[2,0,0],[0,1,0],[0,0,1]]}),('frontier_inverse',{'revealed':['fabricated']})]:
   with self.assertRaises(ValueError):run(action,p)

if __name__=='__main__':unittest.main()
