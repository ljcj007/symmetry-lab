"""End-to-end public CLI contract, using the same dispatcher as Pyodide."""
from pathlib import Path
import json
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / 'dist/python/cli.py'


def invoke(tool, payload):
    return subprocess.run([sys.executable, '-X', 'utf8', str(CLI), tool, '-'],
                          input=json.dumps(payload), text=True, encoding='utf8',
                          capture_output=True, timeout=60)


class PublicAPITests(unittest.TestCase):
    def result(self, tool, payload):
        process = invoke(tool, payload)
        self.assertEqual(process.returncode, 0, process.stderr)
        return json.loads(process.stdout)

    def test_catalog_and_classification(self):
        catalog = self.result('carat', {'dimension': 6, 'action': 'catalog', 'limit': 2})
        self.assertEqual(catalog['q_classes'], 7103)
        self.assertEqual(len(catalog['entries']), 2)
        classified = self.result('carat', {'dimension': 2, 'action': 'classify', 'generators': [[[0,-1],[1,0]]]})
        self.assertEqual(classified['q_status'], 'certified')
        self.assertEqual(classified['group_order'], 4)

    def test_symbolic_and_numerical_bridge(self):
        payload = json.loads((ROOT / 'dist/examples/symbolic-chain.json').read_text())
        result = self.result('symbolic', payload)
        self.assertTrue(result['diagnostics']['covariance_verified'])
        numerical = self.result('magnetictb', {**result['numerical_model'], 'kpoints': [[0,0,0],[0.5,0,0]]})
        self.assertAlmostEqual(numerical['bands']['energies'][0][0], -2)
        self.assertAlmostEqual(numerical['bands']['energies'][-1][0], 2)

    def test_infinite_group_certificate(self):
        result = self.result('crystkit_ext', {'action':'spacegroup_generators','group_number':19})
        self.assertTrue(result['minimumCertified'])
        self.assertEqual(result['minimumGeneratorCount'], 2)
        self.assertTrue(result['generationCertificate']['generates'])

    def test_integral_classes_and_arithmetic_normalizer(self):
        rotation = [[int(i == j)*(1 if i < 3 else -1) for j in range(6)] for i in range(6)]
        result = self.result('carat_integral', {'action':'affine_classes','dimension':6,'generators':[rotation]})
        self.assertTrue(result['z_complete'])
        self.assertTrue(result['affine_complete'])
        self.assertEqual((result['z_class_count'],result['affine_class_count']),(4,7))
        glued = result['z_classes'][-1]['generators']
        normalizer = self.result('integral_normalizer', {'rotations':glued})
        self.assertTrue(normalizer['complete'])
        self.assertFalse(normalizer['finite'])
        self.assertTrue(normalizer['everyGeneratorVerified'])

    def test_existing_extension_api_uses_arithmetic_normalizer(self):
        result = self.result('crystkit_ext', {'action':'extension_orbits',
                           'rotations':[[[0,-1,0],[1,0,0],[0,0,1]]]})
        self.assertTrue(result['normalizerComplete'])
        self.assertTrue(result['classificationCompleteForIntegralPointGroup'])
        self.assertEqual(result['orbitCount'],3)

    def test_exact_symbolic_interface(self):
        result = self.result('symbolic_interfaces', {'action':'common_kernel',
                            'matrices':[[[1,1,0]],[[0,1,1]]]})
        self.assertEqual(result['nullity'],1)
        self.assertEqual(result['matrix'],[['1'],['-1'],['1']])

    def test_arithmetic_order_and_unit_group(self):
        payload={'action':'order','rotations':[[[0,-1],[1,-1]]]}
        order=self.result('arithmetic_centralizer',payload)
        self.assertEqual(order['orderRank'],2)
        self.assertEqual(order['centerDimension'],2)
        self.assertTrue(order['orderComplete'])
        self.assertEqual(len(order['multiplicationConstants']),2)
        units=self.result('arithmetic_centralizer',{**payload,'action':'centralizer'})
        self.assertTrue(units['unitGroupComplete'])
        self.assertTrue(units['everyGeneratorVerified'])
        self.assertEqual(units['centralizerOrder'],6)

    def test_automatic_symbolic_screw_representation(self):
        import sympy as sp
        result=self.result('symbolic_spacegroups',{'action':'analyze','group_number':4,'k':[0,0,'q']})
        self.assertTrue(result['verified'])
        self.assertEqual(result['little_group']['order'],2)
        self.assertEqual([r['dimension'] for r in result['irreps']],[1,1])
        q=sp.Symbol('q',real=True)
        for rep in result['irreps']:
            screw=sp.sympify(rep['matrices'][1][0][0],locals={'q':q})
            self.assertEqual(sp.simplify(sp.expand_complex(screw**2-sp.exp(-2*sp.pi*sp.I*q))),0)

    def test_affine_torsion_contract(self):
        result=self.result('crystkit_ext',{'action':'torsionfree','group_number':19})
        self.assertTrue(result['bieberbach'])
        self.assertTrue(result['trivialCenter'])
        self.assertEqual(result['centerRank'],0)

    def test_structure_conversion_cli(self):
        payload = json.loads((ROOT / 'dist/examples/structure-silicon.json').read_text(encoding='utf8'))
        result = self.result('structure_bc', payload)
        self.assertEqual(result['group_number'], 227)
        self.assertTrue(result['verified'])
        self.assertEqual(result['bc_primitive']['atom_count'], 2)
        again = self.result('structure_bc', {'format':'cif', 'text':result['exports']['bc_cif']})
        self.assertEqual(again['group_number'], 227)

    def test_standard_labels_are_attached_to_analyze(self):
        groups = json.loads((ROOT / 'dist/data/space-groups.json').read_text(encoding='utf8'))['groups']
        group = next(g for g in groups if g['number'] == 2)
        result = self.result('analyze', {'group_number':2, 'operations':group['operations'],
                           'basis':group['basis'], 'k':[0,0,0], 'doubleValued':False})
        labels = result['standardLabels']['mappings']
        self.assertEqual(len(labels), 2)
        self.assertTrue(all(row['bc_label'] and row['bilbao_label'] for row in labels))
        self.assertEqual({row['local_label'] for row in labels}, {ir['label'] for ir in result['irreps']})

    def test_near_boundary_labels_preserve_numerical_little_group(self):
        groups = json.loads((ROOT / 'dist/data/space-groups.json').read_text(encoding='utf8'))['groups']
        group = next(g for g in groups if g['number'] == 2)
        result = self.result('analyze', {'group_number':2, 'operations':group['operations'],
                           'basis':group['basis'], 'k':[0.49999997,0,0], 'doubleValued':False})
        self.assertEqual(len(result['littleGroup']['operations']), 1)
        self.assertNotEqual(result['standardLabels'].get('status'), 'unavailable')

    def test_teaching_labs_public_contract(self):
        screw = self.result('teaching_labs', {'lab':'seitz', 'preset':'screw21', 'steps':2, 'k':[0,0,0.5]})
        self.assertEqual(screw['closure']['translation'], [0,0,1])
        self.assertAlmostEqual(screw['frames'][2]['blochPhase']['re'], -1)
        spin = self.result('teaching_labs', {'lab':'spinor', 'axis':'z', 'initialState':'up'})
        self.assertAlmostEqual(spin['checkpoints']['angle360']['spinor'][0]['re'], -1)
        self.assertAlmostEqual(spin['checkpoints']['angle720']['spinor'][0]['re'], 1)
        moment = self.result('teaching_labs', {'lab':'magnetic', 'operation':'inversion', 'moment':[1,2,3]})
        self.assertEqual(moment['transformedMoment'], [1,2,3])
        anti = self.result('teaching_labs', {'lab':'antiferro', 'k':0.5, 'spinful':True})
        self.assertTrue(anti['isTrim'])
        self.assertFalse(anti['kramersEligible'])

    def test_material_crystal_public_contract(self):
        materials = json.loads((ROOT / 'dist/data/symmetry-materials.json').read_text(encoding='utf8'))
        iron = next(m for m in materials['materials'] if m['formula'] == 'Fe')
        model = iron['model']
        # Check both preservation and loss of the chosen magnetic domain via
        # the same public dispatcher that the browser Worker uses.
        for expected in (True, False):
            operation = next(o for o in model['operations']
                             if o['expectedChemicalSymmetry'] and o['expectedMagneticSymmetry'] is expected)
            result = self.result('teaching_labs', {'lab':'crystal', 'model':model, 'operationId':operation['id']})
            self.assertTrue(result['chemicalSymmetry'])
            self.assertEqual(result['magneticSymmetry'], expected)
            self.assertEqual(len(result['atoms']), len(model['atoms']))
            self.assertEqual(result['operation']['id'], operation['id'])

    def test_lie_labs_public_contract(self):
        import math
        spin=self.result('teaching_labs',{'lab':'lie','experiment':'su2','axis':'z','angle':2*math.pi,'state':'up'})
        self.assertAlmostEqual(spin['matrix'][0][0]['re'],-1)
        self.assertEqual((spin['dimension'],spin['realDimension'],spin['rank']),(2,3,1))
        color=self.result('teaching_labs',{'lab':'lie','experiment':'su3','generator':1,'angle':math.pi,'state':1})
        self.assertAlmostEqual(color['probabilities'][1],1)
        bracket=self.result('teaching_labs',{'lab':'lie','experiment':'commutator','group':'su3','a':4,'b':5})
        self.assertAlmostEqual(bracket['coefficients'][2],.5)
        self.assertAlmostEqual(bracket['coefficients'][7],math.sqrt(3)/2)

    def test_lie_physics_public_contract(self):
        import math
        rabi=self.result('teaching_labs',{'lab':'lie','experiment':'rabi','omega':1,'delta':0,'time':math.pi})
        self.assertAlmostEqual(rabi['transitionProbability'],1)
        self.assertAlmostEqual(rabi['trajectory'][-1]['time'],math.pi)
        spins=self.result('teaching_labs',{'lab':'lie','experiment':'su2_coupling',
                          'twoJ1':1,'twoJ2':1,'twoM1':1,'twoM2':-1,'coupling':1})
        self.assertEqual(spins['dimension'],4)
        self.assertEqual({float(row['J']):row['energy'] for row in spins['decomposition']},{0:-.75,1:.25})
        for row in spins['selected']['expansion']:
            self.assertAlmostEqual(row['probability'],.5)
        octets=self.result('teaching_labs',{'lab':'lie','experiment':'su3_tensor','p1':1,'q1':1,'p2':1,'q2':1})
        self.assertEqual(octets['dimension'],64)
        self.assertEqual({(row['p'],row['q']):row['multiplicity'] for row in octets['decomposition']},
                         {(2,2):1,(3,0):1,(0,3):1,(1,1):2,(0,0):1})

    def test_invalid_data_and_unknown_tool(self):
        for tool, payload in [('carat',{'dimension':'../../example'}), ('symbolic',[]),
                              ('symbolic',{'expression':'__import__("os").getcwd()'}), ('unknown',{})]:
            process = invoke(tool,payload)
            self.assertNotEqual(process.returncode,0)
            self.assertFalse(process.stdout.strip())


if __name__ == '__main__':
    unittest.main(verbosity=2)
