"""Public API, content references and the numeric comparisons used by projects."""
import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run

class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/'dist/data/spectroscopy-materials.json').read_text(encoding='utf8'))
    def test_content_references_and_steps(self):
        d=self.data
        self.assertEqual((len(d['modules']),len(d['lessons']),len(d['exercises']),len(d['cases'])),(3,9,9,9))
        self.assertEqual(sum(len(e['steps']) for e in d['exercises']),36)
        for key in ('modules','lessons','exercises','cases','sources'):
            self.assertEqual(len({x['id'] for x in d[key]}),len(d[key]))
        lessons={x['id'] for x in d['lessons']};sources={x['id'] for x in d['sources']}
        for m in d['modules']:
            presets={p['id'] for p in m['presets']}
            for lesson in [x for x in d['lessons'] if x['module']==m['id']]:
                self.assertIn(lesson['preset'],presets)
                self.assertTrue(set(lesson['references'])<=sources)
            for case in [x for x in d['cases'] if x['module']==m['id']]:self.assertIn(case['preset'],presets)
        for e in d['exercises']:
            self.assertIn(e['lesson'],lessons)
            for step in e['steps']:self.assertIn(step['answer'],range(len(step['choices'])))
    def test_every_preset_through_public_api(self):
        for m in self.data['modules']:
            for p in m['presets']:
                with self.subTest(preset=p['id']):
                    result=run(m['action'],p['input'].copy())
                    self.assertIn('checks',result)
                    self.assertIn('parameters',result)
                    json.dumps(result,allow_nan=False)
    def test_project_physics_bridge(self):
        presets={p['id']:(m['action'],p['input']) for m in self.data['modules'] for p in m['presets']}
        normal=run(*presets['andreev-project-normal']);paired=run(*presets['andreev-project-paired'])
        self.assertAlmostEqual(normal['selection']['conductanceQuantum'],2,places=4)
        self.assertLess(normal['selection']['andreevReflection'],1e-12)
        self.assertGreater(paired['selection']['andreevReflection'],.8)
        x=run(*presets['spectra-project-x']);z=run(*presets['spectra-project-z'])
        self.assertEqual(x['dimensions'],{'initial':45,'final':60})
        self.assertAlmostEqual(x['ground']['S2'],z['ground']['S2'],places=12)
        self.assertGreater(max(abs(a-b) for a,b in zip(x['spectrum']['selected'],z['spectrum']['selected'])),1e-5)
        spin=run(*presets['resonance-spin1-isotropic'])
        self.assertEqual(spin['dimension'],3)
        self.assertAlmostEqual(spin['selection']['dominantFrequency'],2*13.99624555*.05,places=6)

if __name__=='__main__':unittest.main()
