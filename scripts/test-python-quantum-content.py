"""Executable catalog integrity and independent classroom checks."""
from collections import Counter
from pathlib import Path
import json
import math
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
DATA=json.loads((ROOT/'dist/data/quantum-materials.json').read_text(encoding='utf-8'))

class QuantumContent(unittest.TestCase):
 def test_references_and_exercises(self):
  modules={m['id']:m for m in DATA['modules']}
  self.assertEqual(set(modules),{'orbitals','geometry','transport'})
  lessons={l['id']:l for l in DATA['lessons']}
  sources={s['id'] for s in DATA['sources']}
  for collection in ['modules','lessons','exercises','cases','sources']:
   ids=[x['id'] for x in DATA[collection]]
   self.assertEqual(len(ids),len(set(ids)),collection)
  for collection in ['lessons','exercises']:
   self.assertEqual(Counter(x['module'] for x in DATA[collection]),{'orbitals':3,'geometry':3,'transport':3})
  for lesson in lessons.values():
   self.assertIn(lesson['preset'],[p['id'] for p in modules[lesson['module']]['presets']])
   self.assertTrue(set(lesson['references'])<=sources)
   self.assertGreaterEqual(len(lesson['sections']),3)
  for e in DATA['exercises']:
   self.assertEqual(lessons[e['lesson']]['module'],e['module'])
   self.assertEqual(len(e['steps']),4)
   for s in e['steps']:
    self.assertIn(s['answer'],range(len(s['choices'])))
    self.assertEqual(len(set(s['choices'])),len(s['choices']))
    self.assertTrue(s['hint'] and s['explanation'])
  for c in DATA['cases']:
   self.assertIn(c['preset'],[p['id'] for p in modules[c['module']]['presets']])
   self.assertTrue(c['assumption'] and c['kind'])
   for title,link in c['links']:
    self.assertTrue(title and (link.startswith(('#','https://')) or (link.startswith(('docs/','examples/')) and (ROOT/'dist'/link).is_file())))

 def test_every_preset_runs_through_public_api(self):
  for module in DATA['modules']:
   for p in module['presets']:
    with self.subTest(preset=p['id']):
     result=run(module['action'],p['input'])
     json.dumps(result,allow_nan=False)
     self.assertTrue(result['sources'])
     self.assertTrue(result['warnings'])

 def test_independent_lesson_examples(self):
  cf=run('crystal_field_lab',{'soc':0,'splitting':1})
  levels=[g['energy'] for g in cf['groups']]
  self.assertAlmostEqual(max(levels)-min(levels),1)
  self.assertAlmostEqual(sum(g['energy']*g['degeneracy'] for g in cf['groups']),0)
  jt=run('crystal_field_lab',{'mode':'jahn_teller','coupling':1,'stiffness':2})
  self.assertAlmostEqual(jt['minimum']['radius'],.5)
  self.assertAlmostEqual(jt['minimum']['energy'],-.25)
  geo=run('quantum_geometry_lab',{'model':'ssh','t1':0,'t2':1})
  self.assertAlmostEqual(abs(geo['topology']['value']),math.pi)
  for g in geo['line']['metric']: self.assertAlmostEqual(g,.25)
  gapless=run('quantum_geometry_lab',{'mass':-2,'mesh':31})
  self.assertIsNone(gapless['topology']['value'])
  tr=run('electron_transport_lab',{'hopping':1,'anisotropy':1,'chemicalPotential':4,'temperature':300,'mesh':32})
  s=tr['selection']
  self.assertAlmostEqual(s['fillingPerCell'],1)
  self.assertAlmostEqual(s['seebeckMicroV'][0][0],0,places=7)
  self.assertAlmostEqual(s['sigmaOverTau'][0][0]/s['sigmaOverTau'][1][1],1)

if __name__=='__main__': unittest.main()
