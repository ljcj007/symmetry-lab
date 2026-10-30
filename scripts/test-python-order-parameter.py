"""Independent identities and declared-scope regressions for finite polar invariants."""
from pathlib import Path
import json
import math
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from order_parameter_lab import calculate, group_data, invariant_basis, polynomial_value


class OrderParameterTests(unittest.TestCase):
    def test_group_orders_and_orthogonality(self):
        for name, expected in [('c4v',8),('oh',48)]:
            dim, _, ops = group_data(name)
            self.assertEqual(len(ops), expected)
            for op in ops:
                np.testing.assert_array_equal(op.T@op,np.eye(dim))
                self.assertAlmostEqual(abs(np.linalg.det(op)),1)
            self.assertTrue(calculate({'pointGroup':name})['checks']['exactGroupClosure'])

    def test_independent_molien_dimensions(self):
        # Newton identities compute symmetric-power characters directly from
        # matrix traces, independently of orbit-sum construction.
        for name, dimensions in [('c4v',[1,2,2]),('oh',[1,2,3])]:
            _, _, ops = group_data(name)
            for degree, expected in zip((2,4,6),dimensions):
                chars=[]
                for op in ops:
                    h=[1.]
                    traces=[float(np.trace(np.linalg.matrix_power(op,i))) for i in range(1,degree+1)]
                    for n in range(1,degree+1):
                        h.append(sum(traces[i-1]*h[n-i] for i in range(1,n+1))/n)
                    chars.append(h[-1])
                self.assertAlmostEqual(sum(chars)/len(chars),expected)
                basis=invariant_basis(name,degree)
                self.assertEqual(len(basis),expected)
                rng=np.random.default_rng(742)
                rows=np.array([[polynomial_value(b,v) for b in basis] for v in rng.normal(size=(12,len(ops[0])))])
                self.assertEqual(np.linalg.matrix_rank(rows),expected)

    def test_closed_form_basis_values(self):
        for name,v in [('c4v',[.7,-1.3]),('oh',[.7,-1.3,.9])]:
            r=calculate(dict(pointGroup=name,etaX=v[0],etaY=v[1],etaZ=v[2] if len(v)==3 else 0))
            basis={i['id']:i['value'] for i in r['order']['invariants']}
            self.assertAlmostEqual(basis['a2'],sum(x*x for x in v))
            self.assertAlmostEqual(basis['b4'],sum(x**4 for x in v))
            self.assertAlmostEqual(basis['c4'],sum(v[i]**2*v[j]**2 for i in range(len(v)) for j in range(i+1,len(v))))
            self.assertAlmostEqual(basis['d6'],sum(x**6 for x in v))
            self.assertAlmostEqual(basis['e6'],sum(v[i]**4*v[j]**2 for i in range(len(v)) for j in range(len(v)) if i!=j))
            if len(v)==3:self.assertAlmostEqual(basis['f6'],np.prod(np.array(v)**2))

    def test_reynolds_and_all_operation_invariance(self):
        rng=np.random.default_rng(91)
        for name in ('c4v','oh'):
            dim,_,ops=group_data(name)
            for vector in rng.normal(size=(4,dim)):
                self.assertAlmostEqual(sum((op@vector)[0]*(op@vector)[1] for op in ops)/len(ops),0)
                self.assertAlmostEqual(sum((op@vector)[0]**2 for op in ops)/len(ops),vector@vector/dim)
                for degree in (2,4,6):
                    for basis in invariant_basis(name,degree):
                        for op in ops:
                            self.assertAlmostEqual(polynomial_value(basis,op@vector),polynomial_value(basis,vector),places=9)

    def test_distinct_orbits_and_stabilizers(self):
        for name,eta,stabilizer,orbit in [('c4v',[1,0,0],2,4),('c4v',[1,1,0],2,4),('c4v',[1,2,0],1,8),('oh',[1,0,0],8,6),('oh',[1,1,0],4,12),('oh',[1,1,1],6,8),('oh',[1,2,3],1,48),('oh',[1,2,0],2,24)]:
            order=calculate(dict(pointGroup=name,etaX=eta[0],etaY=eta[1],etaZ=eta[2]))['order']
            self.assertEqual(order['stabilizerOrder'],stabilizer)
            self.assertEqual(len(order['domains']),orbit)
            self.assertAlmostEqual(max(d['energy'] for d in order['domains'])-min(d['energy'] for d in order['domains']),0)

    def test_zero_state_preserves_parent(self):
        for name,size in [('c4v',8),('oh',48)]:
            r=calculate(dict(pointGroup=name,etaX=0))
            self.assertEqual(r['order']['stabilizerOrder'],size)
            self.assertEqual(len(r['order']['domains']),1)
            self.assertTrue(r['checks']['passed'])

    def test_field_splits_parent_orbit(self):
        r=calculate(dict(pointGroup='oh',fieldX=.3))
        o=r['order']
        self.assertEqual(o['fieldGroupOrder'],8)
        self.assertEqual(o['fieldOrbitSize'],1)
        energies={tuple(row['vector']):row['energy'] for row in o['domains']}
        self.assertAlmostEqual(energies[(1,0,0)],-.2)
        self.assertAlmostEqual(energies[(-1,0,0)],.4)
        self.assertAlmostEqual(energies[(0,1,0)],.1)
        self.assertEqual(o['physicalStabilizerOrder'],8)

    def test_stabilizer_intersection_is_not_parent_stabilizer(self):
        r=calculate(dict(pointGroup='oh',etaX=0,etaZ=1,fieldX=.3))['order']
        self.assertEqual(r['stabilizerOrder'],8)
        self.assertEqual(r['physicalStabilizerOrder'],2)
        self.assertEqual(r['fieldOrbitSize'],4)

    def test_passive_coordinate_convention_nontrivial(self):
        r=calculate(dict(pointGroup='oh',etaX=.6,etaY=.8,etaZ=.4,basisAngle=37,fieldX=.2))
        o=r['order'];c=o['convention'];q=np.array(c['rotation']);v=np.array(c['vector'])
        self.assertGreater(np.linalg.norm(v-o['vector']),.1)
        np.testing.assert_allclose(q@v,o['vector'],atol=1e-13)
        for old,new in zip(o['operations'],c['operations']):
            np.testing.assert_allclose(np.array(new)@v,q.T@np.array(old['matrix'])@np.array(o['vector']),atol=1e-13)
        f=np.array(c['field']);self.assertAlmostEqual(f@v,.2*.6)
        self.assertLess(r['checks']['coordinateEnergyResidual'],1e-12)
        self.assertTrue(r['checks']['passed'])

    def test_constraint_provenance_checks_actual_coefficients(self):
        for name in ('c4v','oh'):
            r=calculate({'pointGroup':name})
            for item in r['order']['invariants']:
                coeffs={tuple(t['powers']):t['coefficient'] for t in item['terms']}
                for row in r['order']['constraintSources']:
                    if row['degree']!=item['degree']:continue
                    self.assertEqual(coeffs.get(tuple(row['targetPowers']),0),row['sign']*coeffs.get(tuple(row['sourcePowers']),0))
            forbidden=[row for row in r['order']['constraintSources'] if row['degree']==2 and row['sourcePowers'][:2]==[1,1] and row['sign']==-1]
            self.assertTrue(forbidden)

    def test_stationary_radius_closed_form(self):
        r=calculate({})
        roots=r['order']['stationaryRadii']
        expected=math.sqrt((-4+math.sqrt(16+4*.6*2))/(2*.6))
        np.testing.assert_allclose([x['radius'] for x in roots],[-expected,0,expected],atol=1e-10)
        self.assertLess(roots[1]['radialCurvature'],0)
        self.assertGreater(roots[0]['radialCurvature'],0)
        self.assertGreater(roots[-1]['radialCurvature'],0)

    def test_angular_anisotropy_real_energy(self):
        r=calculate({})
        points=r['plots'][1]['series'][0]['points']
        self.assertAlmostEqual(points[0][1],.1)
        self.assertAlmostEqual(points[45][1],.1)  # 90 degrees, C4 related.
        r2=calculate(dict(etaX=1/math.sqrt(2),etaY=1/math.sqrt(2)))
        self.assertAlmostEqual(r2['summary'][-1]['value'],.275)

    def test_boundedness_sufficient_not_necessary(self):
        self.assertTrue(calculate({})['order']['boundedness']['sufficientConditionSatisfied'])
        r=calculate(dict(d6=-1))
        self.assertFalse(r['order']['boundedness']['sufficientConditionSatisfied'])
        self.assertTrue(any('有界' in w for w in r['warnings']))

    def test_catalog_presets_exercises_and_output_are_finite(self):
        catalog=json.loads((ROOT/'dist/data/order-content.json').read_text(encoding='utf8'))
        self.assertEqual(len(catalog['lessons']),3)
        self.assertEqual(sum(len(e['steps']) for e in catalog['exercises']),12)
        for preset in catalog['module']['presets']:
            r=calculate(preset['input']);self.assertTrue(r['checks']['passed'],preset['id'])
            json.dumps(r,allow_nan=False)
        for prediction in catalog['module']['predictions']:
            self.assertIn(prediction['preset'],[p['id'] for p in catalog['module']['presets']])
            self.assertIn(prediction['answer'],range(len(prediction['choices'])))

    def test_invalid_parameters(self):
        for payload in [None,[],{'typo':1},{'pointGroup':[]},{'pointGroup':'c3v'},{'etaX':float('nan')},{'a2':True},{'etaY':6},{'basisAngle':361},{'fieldX':'1'}]:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):calculate(payload)


if __name__=='__main__':unittest.main(verbosity=2)
