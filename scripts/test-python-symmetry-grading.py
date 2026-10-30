import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'dist/python'))
from symmetry_grading import calculate,packed

class Grading(unittest.TestCase):
    def setUp(self):
        self.v=np.eye(4)[:,:2]
        self.task={'id':'test','reference':packed(self.v),'operators':[packed(np.diag([1,2,3,4]))]}
    def grade(self,a,**kw):return calculate({'task':self.task,'answer':packed(a),**kw})
    def test_arbitrary_complex_full_rank_frame(self):
        a=self.v@np.array([[2,1j],[.7,3j]])
        r=self.grade(a);self.assertTrue(r['passed']);self.assertGreater(r['orthonormalityResidual'],1)
    def test_wrong_invariant_subspace_is_rejected(self):
        r=self.grade(np.eye(4)[:,2:]);self.assertFalse(r['passed']);self.assertTrue(r['checks'][2]['passed'])
    def test_rank_deficient_rejected(self):
        self.assertFalse(self.grade(np.column_stack([self.v[:,0],self.v[:,0]]))['passed'])
    def test_projector_is_matrix_not_arbitrary_phase(self):
        p=self.v@self.v.T
        self.assertTrue(self.grade(p,kind='projector')['passed'])
        self.assertFalse(self.grade(1j*p,kind='projector')['passed'])
        self.assertFalse(self.grade(2*p,kind='projector')['passed'])
    def test_nonorthogonal_projection_rejected(self):
        p=self.v@self.v.T;p[0,2]=1
        self.assertFalse(self.grade(p,kind='projector')['passed'])
    def test_examples_are_actual_equivalent_frames(self):
        for kind in ['subspace','projector']:
            for example in ['reference','equivalent','wrong']:
                r=calculate({'task':self.task,'mode':'example','kind':kind,'example':example})
                verdict=calculate({'task':self.task,'kind':kind,'answer':r['candidate']})
                self.assertEqual(verdict['passed'],example!='wrong')
    def test_invalid_reference_rejected(self):
        self.task['operators']=[packed(np.roll(np.eye(4),1,axis=0))]
        with self.assertRaises(ValueError):self.grade(self.v)
    def test_shapes_and_nonfinite_rejected(self):
        for a in [np.ones((3,2)),np.full((4,2),np.nan),np.full((4,2),np.inf)]:
            with self.assertRaises(ValueError):self.grade(a)
    def test_text_is_not_evaluated(self):
        for a in ['__import__("os")',[[True]],[["1"]],[],{'re':[[1]],'im':[[0]],'other':1}]:
            with self.assertRaises((ValueError,TypeError)):calculate({'task':self.task,'answer':a})
    def test_reference_gram_not_assumed_identity(self):
        self.task['reference']=packed(self.v@np.array([[2,1],[0,3]]))
        self.assertTrue(self.grade(self.v)['passed'])
    def test_full_space_wrong_example_rank(self):
        self.task['reference']=packed(np.eye(4))
        a=calculate({'task':self.task,'mode':'example','example':'wrong'})['candidate']
        self.assertFalse(calculate({'task':self.task,'answer':a})['passed'])

if __name__=='__main__':unittest.main(verbosity=2)
