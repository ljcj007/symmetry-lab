from pathlib import Path
from collections import Counter
import json,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
DATA=json.loads((ROOT/'dist/data/response-materials.json').read_text(encoding='utf8'))
class ResponseContent(unittest.TestCase):
 def test_catalog_consistency(self):
  modules={x['id']:x for x in DATA['modules']};lessons={x['id']:x for x in DATA['lessons']};sources={x['id'] for x in DATA['sources']}
  self.assertEqual(set(modules),{'hall','device','multiplet'})
  for key in ('modules','lessons','exercises','cases','sources'):
   ids=[x['id'] for x in DATA[key]];self.assertEqual(len(ids),len(set(ids)))
  for key in ('lessons','exercises','cases'):self.assertEqual(Counter(x['module'] for x in DATA[key]),{'hall':3,'device':3,'multiplet':3})
  for l in lessons.values():
   self.assertIn(l['preset'],[p['id'] for p in modules[l['module']]['presets']]);self.assertTrue(set(l['references'])<=sources);self.assertGreaterEqual(len(l['sections']),3)
  for e in DATA['exercises']:
   self.assertEqual(lessons[e['lesson']]['module'],e['module']);self.assertEqual(len(e['steps']),4)
   for s in e['steps']:
    self.assertIn(s['answer'],range(len(s['choices'])));self.assertTrue(s['hint'] and s['explanation']);self.assertEqual(len(s['choices']),len(set(s['choices'])))
  for c in DATA['cases']:
   self.assertIn(c['preset'],[p['id'] for p in modules[c['module']]['presets']]);self.assertTrue(c['assumption'] and c['kind'])
   for title,url in c['links']:
    self.assertTrue(title);self.assertTrue(url.startswith(('#','https://')) or (ROOT/'dist'/url).is_file(),url)
 def test_all_presets_run_public_api(self):
  for m in DATA['modules']:
   for p in m['presets']:
    with self.subTest(preset=p['id']):
     r=run(m['action'],p['input']);json.dumps(r,allow_nan=False);self.assertTrue(r['sources']);self.assertTrue(r['warnings'])
 def test_project_independent_limits(self):
  m={m['id']:m for m in DATA['modules']}
  def calc(module,id):return run(m[module]['action'],next(p['input'] for p in m[module]['presets'] if p['id']==id))
  self.assertAlmostEqual(calc('hall','hall-qwz-plateau')['selection']['sigmaInE2OverH'],-1,places=5)
  self.assertGreater(calc('device','device-perfect')['selection']['transmission'],.9999)
  self.assertEqual(calc('multiplet','multiplet-d6-high')['ground']['spins'],[2.0])
  self.assertEqual(calc('multiplet','multiplet-d6-low')['ground']['spins'],[0.0])
if __name__=='__main__':unittest.main()
