"""Independent finite-order witnesses and Bieberbach checks in dimensions 1–6."""
from fractions import Fraction as F
from pathlib import Path
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import crystkit_browser as c
import crystkit_extensions as e

DB = json.loads((ROOT/'dist/data/space-groups.json').read_text(encoding='utf-8'))

def check(rotations, shifts):
    ops = c.affine_closure([c.operation({'rotation':r,'translation':t}) for r,t in zip(rotations,shifts)])
    return e.affine_properties(ops)

class AffinePropertiesTests(unittest.TestCase):
    def test_translation_lattices_in_all_dimensions(self):
        for d in range(1,7):
            result=check([c.identity(d)],[[0]*d])
            self.assertTrue(result['torsionFree'])
            self.assertEqual(result['centerRank'],d)
            self.assertTrue(result['orientable'])

    def test_reflection_versus_glide(self):
        r=[[1,0],[0,-1]]
        self.assertFalse(check([r],[[0,0]])['torsionFree'])
        glide=check([r],[[F(1,2),0]])
        self.assertTrue(glide['torsionFree'])
        self.assertFalse(glide['orientable'])
        self.assertEqual(glide['centerRank'],1)
        self.assertEqual(glide['cosetChecks'][0]['obstruction']['divisor'],2)

    def test_composite_screw_detects_proper_power_torsion(self):
        r=[[0,-1,0],[1,0,0],[0,0,1]]
        for shift, expected in [(0,False),(F(1,4),True),(F(1,2),False),(F(3,4),True)]:
            result=check([r],[[0,0,shift]])
            self.assertEqual(result['torsionFree'],expected)
        result=check([r],[[0,0,F(1,2)]])
        self.assertEqual(result['torsionWitness']['order'],2)

    def test_finite_order_witness_may_require_integer_shift(self):
        # R exchanges coordinates; the listed lift has square translation (1,1).
        # The same coset contains a finite-order element after an integer shift.
        r=[[0,1],[1,0]]
        result=check([r],[[F(1,2),F(1,2)]])
        self.assertFalse(result['torsionFree'])
        witness=c.operation(result['torsionWitness']['operation'])
        self.assertEqual(c.compose(witness,witness),c.affine_identity(2))
        self.assertNotEqual(result['cosetChecks'][0]['integerShift'],[0,0])

    def test_three_dimensional_hantzsche_wendt_center(self):
        result=e.run({'action':'torsionfree','group_number':19},DB)
        self.assertTrue(result['bieberbach'])
        self.assertTrue(result['trivialCenter'])
        self.assertTrue(result['orientable'])
        self.assertEqual(result['centerRank'],0)

    def test_integral_shear_and_origin_preserve_result(self):
        rotation=c.matrix([[0,-1,0],[1,0,0],[0,0,1]])
        ops=c.affine_closure([(rotation,(F(0),F(0),F(1,4)))])
        basis=[[1,5,-7],[0,1,2],[0,0,1]]
        transformed=c.affine_closure(c.change_basis(ops,basis,[F(2,7),F(-3,5),F(11,13)]))
        a,b=e.affine_properties(ops),e.affine_properties(transformed)
        for key in ('torsionFree','centerRank','orientable'):
            self.assertEqual(a[key],b[key])

    def test_reject_nonprimitive_translation_and_invalid_cocycle(self):
        with self.assertRaisesRegex(ValueError,'primitive translation'):
            e.run({'action':'torsionfree','operations':[{'rotation':[[1,0],[0,1]],'translation':['1/2',0]}]})
        with self.assertRaises(ValueError):
            e.affine_properties([c.affine_identity(2),(c.matrix([[1,0],[0,-1]]),(F(1,3),F(0)))])

    def test_all_wallpaper_classes_have_two_bieberbach_types(self):
        minus=[[-1,0],[0,-1]]; mirror=[[1,0],[0,-1]]; swap=[[0,1],[1,0]]
        r3=[[0,-1],[1,-1]]; r4=[[0,-1],[1,0]]; r6=[[0,-1],[1,1]]
        groups=[[[[1,0],[0,1]]],[minus],[r3],[r4],[r6],[mirror],[swap],
                [minus,mirror],[minus,swap],[r3,swap],[r3,[[-1,0],[-1,1]]],
                [r4,mirror],[r6,swap]]
        total, torsionfree = 0, []
        for generators in groups:
            result=e.run({'action':'extension_orbits','rotations':generators})
            self.assertTrue(result['normalizerComplete'])
            for orbit in result['orbits']:
                representative=result['representatives'][orbit['representative']]
                properties=e.affine_properties([c.operation(op) for op in representative['operations']])
                total+=1
                if properties['torsionFree']:
                    torsionfree.append(properties)
        self.assertEqual(total,17)
        self.assertEqual(len(torsionfree),2)
        self.assertEqual(sorted(x['centerRank'] for x in torsionfree),[1,2])
        self.assertEqual(sum(x['orientable'] for x in torsionfree),1)

if __name__=='__main__':
    unittest.main(verbosity=2)
