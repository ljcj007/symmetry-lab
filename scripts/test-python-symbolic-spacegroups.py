"""Exact automatic representations: analytic nonsymmorphic and magnetic checks."""
import copy
import json
from pathlib import Path
import sys
import unittest

import sympy as sp

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import symbolic_spacegroups as exact
from symbolic_core import ExactParser, exact_equal

DATABASE=json.loads((ROOT/'dist/data/space-groups.json').read_text(encoding='utf8'))
MAGNETIC=json.loads((ROOT/'dist/data/magnetic-groups.json').read_text(encoding='utf8'))


def run(payload):
    return exact.run(payload,DATABASE,MAGNETIC)


def matrix(raw):
    return ExactParser().matrix(raw,limit=48)


class ExactAutomaticRepresentations(unittest.TestCase):
    def test_twofold_symbolic_screw_branch_formula(self):
        result=run({'group_number':4,'k':[0,0,'q']})
        p=ExactParser();q=p.symbol('q')
        values=[matrix(rep['matrices'][1])[0] for rep in result['irreps']]
        self.assertEqual(len(values),2)
        self.assertTrue(exact_equal(values[0]+values[1],0))
        self.assertTrue(all(exact_equal(value**2,sp.exp(-2*sp.pi*sp.I*q)) for value in values))
        self.assertEqual(result['base_k'],['0','0','0'])
        self.assertTrue(result['complete'])

    def test_spinful_screw_has_minus_translation_square(self):
        result=run({'group_number':4,'k':[0,0,'q'],'double_valued':True})
        q=ExactParser().symbol('q')
        for rep in result['irreps']:
            value=matrix(rep['matrices'][1])[0]
            self.assertTrue(exact_equal(value**2,-sp.exp(-2*sp.pi*sp.I*q)))
        self.assertIn('spin_frame',result)

    def test_threefold_and_fourfold_symbolic_screw(self):
        for sg,order,name in [(144,3,'C3z'),(76,4,'C4z')]:
            with self.subTest(sg=sg):
                result=run({'group_number':sg,'k':[0,0,'q']})
                operations=result['little_group']['operations']
                index=next(i for i,op in enumerate(operations) if op['translation'][2]==str(sp.Rational(1,order)))
                q=ExactParser().symbol('q')
                self.assertEqual(len(result['irreps']),order)
                for rep in result['irreps']:
                    value=matrix(rep['matrices'][index])[0]
                    self.assertTrue(exact._exponential_equal(sp.Matrix([[value**order]]),sp.Matrix([[sp.exp(-2*sp.pi*sp.I*q)]])))

    def test_nonsymmorphic_boundary_has_forced_two_dimensional_irrep(self):
        result=run({'group_number':19,'k':['1/2','1/2','1/2']})
        self.assertEqual([x['dimension'] for x in result['irreps']],[2])
        reps=[matrix(m) for m in result['irreps'][0]['matrices']]
        self.assertEqual(reps[1]**2,-sp.eye(2))
        self.assertEqual(reps[1]*reps[2],-reps[2]*reps[1])
        self.assertEqual(result['irreps'][0]['characters'],['2','0','0','0'])

    def test_tetrahedral_and_cubic_irrep_dimensions(self):
        expected={195:[1,1,1,3],207:[1,1,2,3,3],221:[1,1,1,1,2,2,3,3,3,3]}
        for number,dims in expected.items():
            with self.subTest(number=number):
                result=run({'group_number':number,'k':[0,0,0]})
                self.assertEqual(sorted(r['dimension'] for r in result['irreps']),dims)
                self.assertEqual(sum(r['dimension']**2 for r in result['irreps']),result['little_group']['order'])

    def test_tetrahedral_double_cover_irreps(self):
        result=run({'group_number':195,'k':[0,0,0],'double_valued':True})
        self.assertEqual(sorted(x['dimension'] for x in result['irreps']),[2,2,2])

    def test_exact_input_does_not_use_rounded_spin_or_basis(self):
        poisoned=copy.deepcopy(MAGNETIC)
        item=next(g for g in poisoned['groups'] if g['id']=='4.7')
        item['basis']=[['not-a-number']]
        for op in item['operations']:
            op['spinRotation']=[['must-never-be-parsed']]
            op['translation']=['must-never-be-parsed']
        result=exact.run({'group_number':4,'k':[0,0,'q'],'double_valued':True},DATABASE,poisoned)
        self.assertEqual(len(result['irreps']),2)

    def test_large_rational_screw_coordinate_needs_no_huge_field(self):
        result=run({'group_number':4,'k':[0,0,'1/1009']})
        self.assertEqual(result['conductor'],1)
        self.assertEqual(len(result['irreps']),2)

    def test_generic_star_has_exception_conditions(self):
        generic=run({'action':'star','group_number':2,'k':['q',0,0]})
        special=run({'action':'star','group_number':2,'k':[0,0,0]})
        self.assertEqual(len(generic['star']),2)
        self.assertEqual(len(special['star']),1)
        self.assertTrue(any(c['kind']=='generic_little_group_stratum' for c in generic['conditions']))

    def test_parser_poles_retained_for_symbolic_k(self):
        result=run({'group_number':4,'k':[0,0,'q/q']})
        self.assertTrue(any(c.get('condition')=='q != 0' for c in result['conditions']))

    def test_resource_limit_is_explicit_not_approximation(self):
        with self.assertRaisesRegex(ValueError,'not approximated'):
            run({'group_number':207,'k':[0,0,0],'max_unitary_order':4})


class ExactMagneticRepresentations(unittest.TestCase):
    def test_anti_translation_boundary_spinless_kramers(self):
        result=run({'magnetic_group':'1.3','k':['1/2',0,0]})
        self.assertEqual([(x['dimension'],x['wigner_type']) for x in result['corepresentations']],[(2,'b')])
        a=matrix(result['corepresentations'][0]['matrices'][1])
        self.assertEqual(a*a.conjugate(),-sp.eye(2))

    def test_spinful_gray_group_kramers(self):
        result=run({'magnetic_group':'1.2','k':[0,0,0],'double_valued':True})
        self.assertEqual([(x['dimension'],x['wigner_type']) for x in result['corepresentations']],[(2,'b')])

    def test_gray_c3_type_a_and_complex_pair(self):
        result=run({'magnetic_group':'143.2','k':[0,0,0]})
        self.assertEqual(sorted((x['dimension'],x['wigner_type']) for x in result['corepresentations']),[(1,'a'),(2,'c')])

    def test_spinful_boundary_cancels_anti_translation_sign(self):
        result=run({'magnetic_group':'1.3','k':['1/2',0,0],'double_valued':True})
        self.assertEqual([(x['dimension'],x['wigner_type']) for x in result['corepresentations']],[(1,'a')])

    def test_full_magnetic_star_translation_phase(self):
        result=run({'action':'induce','magnetic_group':'1.3','k':['q',0,0]})
        self.assertEqual(len(result['full_representations']),1)
        a=matrix(result['full_representations'][0]['matrices'][1])
        q=ExactParser().symbol('q')
        expected=sp.diag(sp.exp(-2*sp.pi*sp.I*q),sp.exp(2*sp.pi*sp.I*q))
        self.assertTrue(exact._exponential_equal(a*a.conjugate(),expected))

    def test_full_spinful_star_has_correct_spin_sign(self):
        result=run({'action':'induce','group_number':4,'k':['q',0,0],'double_valued':True})
        c=matrix(result['full_representations'][0]['matrices'][1])
        self.assertEqual(c*c,-sp.eye(2))

    def test_full_star_with_antiunitary_little_group(self):
        result=run({'action':'induce','magnetic_group':'16.3','k':['q',0,0]})
        self.assertTrue(result['verified'])
        self.assertTrue(result['full_representations'])
        self.assertTrue(all(not result['full_group_operations'][i]['antiunitary'] for i in result['star_representatives']))


class ExactCompatibilityAndData(unittest.TestCase):
    def test_database_rational_thirds_preserved(self):
        result=run({'api':'getSGElem','group_number':144})
        self.assertIn('1/3',[v for op in result['operations'] for v in op['translation']])

    def test_upstream_bc_orientation_is_axes_not_setting_matrix(self):
        self.assertEqual(run({'api':'BCOrientation','group_number':4})['value']['axes'],['a','-c','b'])
        self.assertEqual(run({'api':'BCOrientation','group_number':19})['value']['axes'],['b','-a','c'])

    def test_schoenflies_and_bns_og_roundtrip(self):
        self.assertEqual(run({'api':'SGSymScho','group_number':4})['value'],{'point_group':'C2','index':2,'symbol':'C2^2'})
        og=run({'api':'BNStoOG','magnetic_group':'4.11'})['value']
        bns=run({'api':'OGtoBNS','og':og})['value']
        self.assertEqual(bns,[4,11])

    def test_named_automatic_representation_adapters(self):
        small=run({'api':'getLGIrepTab','group_number':4,'k':[0,0,'q']})
        full=run({'api':'getMSGCorep','magnetic_group':'1.3','k':['q',0,0]})
        self.assertEqual(small['upstream_api'],'getLGIrepTab')
        self.assertTrue(full['full_representations'])

    def test_old_exact_cyclotomic_adapter_needs_no_database(self):
        result=exact.run({'api':'CyclotomicNullSpace','order':3,'matrix':[[1,'z']]})
        self.assertEqual(result['nullity'],1)
        self.assertEqual(result['upstream_api'],'CyclotomicNullSpace')

    def test_restore_and_bloch_stateless_adapters(self):
        restored=exact.run({'api':'RestoreCyclotomicExpression','order':4,'matrix':[['z','z**2']]})
        self.assertEqual(restored['matrix'],[['I','-1']])
        bloch=exact.run({'api':'buildBlochHamiltonian','k':[0,0,'q'],
                         'hoppings':[{'cell':[0,0,0],'matrix':[['epsilon']]}]})
        self.assertEqual(bloch['hamiltonian']['matrix'],[['epsilon']])

    def test_origin_shift_preserves_integer_translation(self):
        result=exact.run({'api':'shiftOrigin','origin':['a',0,0],'operations':[
            {'rotation':[[1,0,0],[0,1,0],[0,0,1]],'translation':[2,0,0]},
            {'rotation':[[-1,0,0],[0,-1,0],[0,0,-1]],'translation':[3,0,0]}]})
        self.assertEqual(result['operations'][0]['translation'][0],'2')
        self.assertEqual(result['operations'][1]['translation'][0],'3 - 2*a')

    def test_exact_central_extension_quaternion_group(self):
        result=run({'action':'central_extension','group_number':19,'k':['1/2','1/2','1/2']})
        self.assertEqual(result['extension_order'],8)
        table=result['extension_table'];identity=result['little_group']['identity']*result['conductor']
        orders=[]
        for g in range(8):
            x=g;order=1
            while x!=identity:
                x=table[x][g];order+=1
            orders.append(order)
        self.assertEqual(sorted(orders),[1,2,4,4,4,4,4,4])

    def test_invalid_exact_inputs_and_unknown_apis_rejected(self):
        with self.assertRaisesRegex(ValueError,'rounded decimals'):
            exact.run({'operations':[{'rotation':[[1,0,0],[0,1,0],[0,0,1]],'translation':[0.0,0,0]}]})
        with self.assertRaises(ValueError):
            exact.run({'api':'__import__'})
        with self.assertRaises(ValueError):
            run({'group_number':4,'k':['__import__("os")',0,0]})

    def test_all_downloadable_examples(self):
        paths=list((ROOT/'dist/examples').glob('symbolic-sg-*.json'))
        self.assertEqual(len(paths),7)
        for path in paths:
            with self.subTest(path=path.name):
                self.assertTrue(run(json.loads(path.read_text(encoding='utf8')))['verified'])


if __name__=='__main__':
    unittest.main(verbosity=2)
