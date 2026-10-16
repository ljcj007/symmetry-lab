"""Character-based standard-label regressions against independent eigenspaces."""
from pathlib import Path
import gzip,json,sys,unittest
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'dist/python'))
import standard_labels as labels
import symmetry_core
DB=json.loads((ROOT/'dist/data/space-groups.json').read_text(encoding='utf-8'))
CAT={k:json.loads(gzip.decompress((ROOT/f'dist/data/labels/{k}-labels.json.gz').read_bytes())) for k in ('bc','bilbao')}

class StandardLabels(unittest.TestCase):
    def test_full_catalogues(self):
        self.assertEqual(len(CAT['bc']['records']),6928);self.assertFalse(CAT['bc']['failures'])
        self.assertEqual(len(CAT['bilbao']['records']),2700);self.assertFalse(CAT['bilbao']['coverage']['failures'])
        for kind in ('bc','bilbao'):
            self.assertEqual({(r['group_number'],r['double_valued']) for r in CAT[kind]['records']},{(n,d) for n in range(1,231) for d in (False,True)})
            for record in CAT[kind]['records']:
                self.assertEqual(sum(r['dimension']**2 for r in record['irreps']),len(record['operations']))

    def analyze(self,n,k,double=False):
        g=DB['groups'][n-1]
        result=symmetry_core.analyze_group({'operations':g['operations'],'k':k,'doubleValued':double,'includeMatrices':False})
        return labels.run({'action':'annotate','group_number':n,'k':k,'double_valued':double,'analysis':result},DB,CAT)

    def test_numeric_irreps_across_crystal_systems(self):
        for n in (2,4,19,76,143,186,195,225):
            for double in (False,True):
                with self.subTest(group=n,double=double):
                    r=self.analyze(n,[0,0,0],double)
                    self.assertTrue(r['bc_complete'],r['mappings']);self.assertTrue(r['bilbao_complete'],r['mappings'])

    def test_nonsymmorphic_boundary_and_spin(self):
        for n,k in [(4,[0,0,.5]),(19,[.5,.5,.5]),(76,[0,0,.5]),(227,[0,.5,.5]),(230,[.5,.5,-.5])]:
            for double in (False,True):
                with self.subTest(group=n,double=double):
                    r=self.analyze(n,k,double);self.assertTrue(r['bc_complete'],r['mappings'])
                    self.assertTrue(r['bilbao_complete'],r['mappings'])

    def test_screw_label_correspondence_not_equal_numbers(self):
        r=labels.run({'group_number':4,'k_label':'Z'},DB,CAT)['tables'][0]['mapped_irreps']
        self.assertEqual({(x['bc_label'],x['bilbao_label']) for x in r},{('Z1','Z2'),('Z2','Z1')})

    def test_generic_line_and_unsupported_bilbao(self):
        for double in (False,True):
            r=self.analyze(4,[0,0,.173],double)
            self.assertTrue(r['bc_complete'],r);self.assertFalse(r['bilbao_complete'])
            self.assertTrue(all(m['bc_label'].startswith('Λ') for m in r['mappings']))

    def test_screw_line_parameter_does_not_permute_labels(self):
        for n in (144,169):
            for double in (False,True):
                for value in ('173/1000','1173/1000','-173/1000'):
                    t=labels.run({'group_number':n,'k_label':'Delta','double_valued':double,'parameter':value},DB,CAT)['tables'][0]
                    rows=[dict(row,id=row['bc_label']) for row in t['irreps']]
                    r=labels.run({'action':'match','group_number':n,'k':t['k'],'double_valued':double,'operations':t['operations'],'irreps':rows},DB,CAT)
                    self.assertTrue(r['bc_complete'],r)
                    self.assertTrue(all(m['local_label']==m['bc_label'] for m in r['mappings']),r)

    def test_magnetic_not_assigned_sg_labels(self):
        r=labels.run({'action':'annotate','group_number':1,'analysis':{'magnetic':True}},DB,CAT)
        self.assertFalse(r['complete']);self.assertEqual(r['mappings'],[])

    def test_explicit_bz_and_k_label_filters(self):
        g=DB['groups'][21]
        a=symmetry_core.analyze_group({'operations':g['operations'],'k':[0,0,0],'includeMatrices':False})
        r=labels.run({'action':'annotate','group_number':22,'analysis':a,'bz_type':'OrthFace(b)','k_label':'Gamma'},DB,CAT)
        self.assertTrue(r['bc_complete']);self.assertEqual(r['requested_bz_type'],'OrthFace(b)')
        self.assertTrue(all(c['bz_type']=='OrthFace(b)' for m in r['mappings'] for c in m['candidates']))
        with self.assertRaises(ValueError):labels.run({'action':'annotate','group_number':22,'analysis':a,'bz_type':'invalid'},DB,CAT)

    def test_reordering_translation_phase_and_spin_section(self):
        table=labels.run({'group_number':4,'k_label':'Z','double_valued':True},DB,CAT)['tables'][0]
        ops=[dict(op) for op in reversed(table['operations'])]
        ops[0]['translation']=['0','0','3/2']
        rows=[dict(row,id='local'+str(i),characters=[str(-labels._expr(row['characters'][1])),row['characters'][0]]) for i,row in enumerate(table['irreps'])]
        r=labels.run({'action':'match','group_number':4,'k':[0,0,'1/2'],'double_valued':True,'operations':ops,'irreps':rows},DB,CAT)
        self.assertTrue(r['bc_complete']);self.assertTrue(r['bilbao_complete'])

    def test_bad_character_not_dimension_matched(self):
        g=DB['groups'][3]
        r=labels.run({'action':'match','group_number':4,'operations':g['operations'],'irreps':[{'id':'bad','dimension':1,'characters':[1,.125]}]},DB,CAT)
        self.assertFalse(r['bc_complete']);self.assertIsNone(r['mappings'][0]['bc_label'])
        with self.assertRaises(ValueError):labels.run({'action':'table','group_number':231},DB,CAT)
        with self.assertRaises(ValueError):labels.run({'action':'table','group_number':4,'parameter':"__import__('os')"},DB,CAT)

    def test_near_boundary_uses_engine_little_group_tolerance(self):
        r=self.analyze(2,[.49999997,0,0])
        self.assertFalse(r['bc_complete']);self.assertFalse(r['bilbao_complete'])

    def test_external_normalizer_ambiguity_is_not_forced(self):
        record=next(r for r in CAT['bilbao']['records'] if r['group_number']==143 and not r['double_valued'] and r['k_label']=='K')
        r=labels.run({'action':'match','group_number':143,'k':record['k'],'operations':record['operations'],
            'irreps':[dict(x,id=x['bilbao_label']) for x in record['irreps']]},DB,CAT)
        ambiguous=[m for m in r['mappings'] if m['bc_status']=='ambiguous']
        self.assertTrue(ambiguous)
        self.assertTrue(all(m['bc_label'] is None for m in ambiguous))
        self.assertTrue(all(c['transport']['normalizer_certificate'] for m in ambiguous for c in m['candidates']))

    def test_incomplete_duplicate_nonintegral_operations_rejected(self):
        identity=DB['groups'][0]['operations'][0]
        with self.assertRaises(ValueError):
            labels.run({'action':'match','group_number':195,'operations':[identity]*12,'irreps':[{'id':'bad','dimension':3,'characters':[3]*12}]},DB,CAT)
        bad=dict(identity,rotation=[[1.1,0,0],[0,1,0],[0,0,1]])
        with self.assertRaises(ValueError):
            labels.run({'action':'match','group_number':1,'operations':[bad],'irreps':[{'id':'bad','dimension':1,'characters':[1]}]},DB,CAT)
        with self.assertRaises(ValueError):
            labels.run({'action':'match','group_number':4,'operations':[identity],'irreps':[{'id':'bad','dimension':1,'characters':[1]}]},DB,CAT)

if __name__=='__main__':unittest.main()
