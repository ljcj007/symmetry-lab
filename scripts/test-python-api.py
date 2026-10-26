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
    def test_phonon_public_api(self):
        result = self.result('phonons', {'preset': 'nacl', 'channel': 'ir', 'mode': 'sum'})
        self.assertEqual(result['formulas']['optical'], 'T1u')
        self.assertEqual(result['dimensions']['mechanical'], 6)
        self.assertAlmostEqual(result['polarization']['intensity'], 1)
        self.assertFalse(result['spectrum']['predictedFrequency'])

    def test_property_tensor_public_api(self):
        result = self.result('tensors', {'preset': 'zincblende_td', 'tensor': 'piezoelectric',
                                      'strain': [0, 0, 0, 1, 0, 0], 'parameters': {'a1': 2}})
        self.assertEqual(result['independent_count'], 1)
        self.assertEqual(result['response']['output'], [2, 0, 0])

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

    def test_double_color_spin_teaching_contract(self):
        double = self.result('teaching_labs', {'lab':'double_group', 'preset':'screw21_space', 'kz':'1/2', 'steps':4})
        self.assertEqual(double['frames'][2]['translationExact'], ['0','0','1'])
        self.assertEqual(double['frames'][2]['spinorMatrixExact'], [['-1','0'],['0','-1']])
        self.assertEqual(double['closure']['blochPhaseExact'], '1')
        for lab, preset in [('color_group','translation3_space'),('spin_group','af_space'),('spin_group','helix3_space')]:
            combined = self.result('teaching_labs', {'lab':lab,'preset':preset,'variant':'combined'})
            self.assertTrue(combined['exact'])
            self.assertTrue(all(frame['preservesPattern'] for frame in combined['frames']))
            alone = self.result('teaching_labs', {'lab':lab,'preset':preset,'variant':'spatial_only'})
            self.assertFalse(alone['frames'][1]['preservesPattern'])
        self.assertFalse(combined['socLockedTest']['preservesPattern'])

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

    def test_su3_cg_public_change_of_basis(self):
        import math
        def z(value):return complex(value['re'],value['im'])
        request={'lab':'lie','experiment':'su3_cg','p1':1,'q1':0,'p2':0,'q2':1}
        amplitudes=[{'re':1,'im':1},{'re':2,'im':-1}]+[{'re':0,'im':0} for _ in range(7)]
        forward=self.result('teaching_labs',{**request,'direction':'product_to_coupled','state':{'amplitudes':amplitudes}})
        self.assertEqual(forward['dimension'],9)
        self.assertLess(max(forward['checks'].values()),1e-10)
        # In the exported GT antifundamental convention (sbar,-dbar,ubar),
        # the invariant tensor has the independent signs +,-,+.
        singlet=next(b for b in forward['blocks'] if (b['p'],b['q'])==(0,0))['start']
        for row in range(9):
            self.assertAlmostEqual(forward['cgMatrix'][row][singlet],
                {2:1/math.sqrt(3),4:-1/math.sqrt(3),6:1/math.sqrt(3)}.get(row,0))
        backward=self.result('teaching_labs',{**request,'direction':'coupled_to_product','state':{'amplitudes':forward['outputAmplitudes']}})
        for actual,expected in zip(backward['outputAmplitudes'],amplitudes):
            self.assertLess(abs(z(actual)-z(expected)),1e-10)
        self.assertAlmostEqual(forward['inputNorm'],7)
        octets=self.result('teaching_labs',{'lab':'lie','experiment':'su3_cg','p1':1,'q1':1,'p2':1,'q2':1})
        self.assertEqual(octets['dimension'],64)
        self.assertEqual(sorted(b['swapParity'] for b in octets['blocks'] if (b['p'],b['q'])==(1,1)),[-1,1])

    def test_su3_high_dimensional_cg_public_contract(self):
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_cg',
            'arithmetic':'numeric','p1':2,'q1':2,'p2':1,'q2':1,
            'direction':'product_to_coupled','state':{'index':17}})
        self.assertEqual(result['dimension'],216)
        # Independent adjoint tensor rule (p,q) x (1,1), with two copies
        # of an interior highest weight. Dynkin labels fix conjugation.
        from collections import Counter
        self.assertEqual(Counter((b['p'],b['q']) for b in result['blocks']),
            Counter({(3,3):1,(4,1):1,(1,4):1,(2,2):2,(3,0):1,(0,3):1,(1,1):1}))
        self.assertLess(max(result['checks'].values()),1e-8)

    def test_su3_exact_cg_public_contract_and_roundtrip(self):
        import sympy as sp
        request={'lab':'lie','experiment':'su3_cg','arithmetic':'exact',
            'p1':1,'q1':0,'p2':1,'q2':0,'direction':'product_to_coupled'}
        amplitudes=[{'re':'0','im':'0'} for _ in range(9)]
        amplitudes[1]={'re':'sqrt(2)/2','im':'0'}
        amplitudes[3]={'re':'0','im':'sqrt(2)/2'}
        forward=self.result('teaching_labs',{**request,'state':{'amplitudes':amplitudes}})
        self.assertEqual(forward['arithmetic'],'exact')
        self.assertEqual(sp.simplify(sp.sympify(forward['exactCGMatrix'][1][1])-sp.sqrt(2)/2),0)
        self.assertEqual(sp.simplify(sp.sympify(forward['exactCGMatrix'][3][6])+sp.sqrt(2)/2),0)
        self.assertEqual(forward['exactOutputAmplitudes'][1],{'re':'1/2','im':'1/2'})
        self.assertEqual(forward['exactOutputAmplitudes'][6],{'re':'1/2','im':'-1/2'})
        self.assertTrue(forward['exactChecks'])
        self.assertTrue(all(value=='0' for value in forward['exactChecks'].values()))
        self.assertEqual(forward['exactInputNorm'],'1')
        self.assertEqual(forward['exactOutputNorm'],'1')
        self.assertFalse(any(sp.sympify(value).has(sp.Float) for row in forward['exactCGMatrix'] for value in row))
        back=self.result('teaching_labs',{**request,'direction':'coupled_to_product',
            'state':{'amplitudes':forward['exactOutputAmplitudes']}})
        for actual,expected in zip(back['exactOutputAmplitudes'],amplitudes):
            for part in ('re','im'):
                self.assertEqual(sp.simplify(sp.sympify(actual[part])-sp.sympify(expected[part])),0)

    def test_su3_exact_higher_irrep_first_lowering(self):
        import sympy as sp
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_cg',
            'arithmetic':'exact','p1':3,'q1':0,'p2':1,'q2':0,'state':{'index':1}})
        self.assertEqual(result['dimension'],30)
        self.assertEqual([(b['p'],b['q']) for b in result['blocks']],[(4,0),(2,1)])
        matrix=result['exactCGMatrix']
        second=result['blocks'][1]['start']
        # F12(|uuu> x |u>)=sqrt(3)|uud> x |u>+|uuu> x |d>.
        # The normalized first descendant and its orthogonal highest weight
        # therefore have these coefficients without consulting the CG solver.
        for i,j,expected in ((1,1,sp.Rational(1,2)),(3,1,sp.sqrt(3)/2),
                             (1,second,sp.sqrt(3)/2),(3,second,-sp.Rational(1,2))):
            self.assertEqual(sp.simplify(sp.sympify(matrix[i][j])-expected),0)
        self.assertTrue(all(v=='0' for v in result['exactChecks'].values()))

    def test_su3_racah_exact_f_and_dimension_reduced_sixj(self):
        import sympy as sp
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_racah',
            'factors':[[1,0],[1,0],[1,0]],'target':[1,1],
            'direction':'left_to_right','state':{'index':0}})
        self.assertEqual(result['dimension'],27)
        self.assertEqual(result['multiplicity'],2)
        # Independent S3 Young-space overlap in (uud,udu,duu), with the
        # first nonzero GT coordinate positive in each highest-weight seed.
        expected=sp.Matrix([[sp.Rational(1,2),sp.sqrt(3)/2],
                            [sp.sqrt(3)/2,-sp.Rational(1,2)]])
        f=sp.Matrix(result['exactFMatrix']).applyfunc(sp.sympify)
        self.assertEqual((f-expected).applyfunc(sp.simplify),sp.zeros(2))
        s=sp.Matrix(result['exactSixJMatrix']).applyfunc(sp.sympify)
        expected_s=sp.Matrix([[sp.Rational(1,12),sp.sqrt(6)/12],
                              [sp.sqrt(6)/12,-sp.Rational(1,6)]])
        self.assertEqual((s-expected_s).applyfunc(sp.simplify),sp.zeros(2))
        # The reduced 6j matrix has dimension-weighted orthogonality.
        self.assertEqual((s.T*sp.diag(6,3)*s-sp.diag(sp.Rational(1,6),sp.Rational(1,3))).applyfunc(sp.simplify),sp.zeros(2))
        self.assertTrue(all(value=='0' for value in result['exactChecks'].values()))

    def test_su3_racah_exact_complex_roundtrip_and_singlet(self):
        import sympy as sp
        request={'lab':'lie','experiment':'su3_racah','factors':[[1,0]]*3,'target':[1,1]}
        state=[{'re':'sqrt(2)/2','im':'0'},{'re':'0','im':'sqrt(2)/2'}]
        forward=self.result('teaching_labs',{**request,'state':{'amplitudes':state}})
        expected=[(sp.sqrt(2)/4,sp.sqrt(6)/4),(sp.sqrt(6)/4,-sp.sqrt(2)/4)]
        for actual,pair in zip(forward['exactOutputAmplitudes'],expected):
            for part,value in zip(('re','im'),pair):
                self.assertEqual(sp.simplify(sp.sympify(actual[part])-value),0)
        backward=self.result('teaching_labs',{**request,'direction':'right_to_left',
            'state':{'amplitudes':forward['exactOutputAmplitudes']}})
        for actual,original in zip(backward['exactOutputAmplitudes'],state):
            for part in ('re','im'):
                self.assertEqual(sp.simplify(sp.sympify(actual[part])-sp.sympify(original[part])),0)
        # The antisymmetric epsilon tensor is invariant under a cyclic
        # reassociation, so the sole singlet path has F=1 and reduced 6j=1/3.
        singlet=self.result('teaching_labs',{**request,'target':[0,0]})
        self.assertEqual(singlet['exactFMatrix'],[['1']])
        self.assertEqual(singlet['exactSixJMatrix'],[['1/3']])

    def test_su3_racah_three_octets_preserve_all_path_multiplicities(self):
        from collections import Counter
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_racah',
            'factors':[[1,1]]*3,'target':[1,1]})
        self.assertEqual((result['dimension'],result['multiplicity']),(512,8))
        self.assertEqual(len(result['leftPaths']),8)
        self.assertEqual(len(result['rightPaths']),8)
        self.assertEqual(len(result['exactFMatrix']),8)
        self.assertTrue(all(len(row)==8 for row in result['exactFMatrix']))
        self.assertTrue(all(value=='0' for value in result['exactChecks'].values()))
        self.assertLess(max(result['checks'].values()),1e-8)
        # Independent adjoint multiplication applied to
        # 27 + 10 + 10bar + 2*8 + 1 gives these total multiplicities.
        self.assertEqual(Counter({(t['p'],t['q']):t['multiplicity'] for t in result['targets']}),
            Counter({(3,3):1,(4,1):2,(1,4):2,(2,2):6,(3,0):4,(0,3):4,(1,1):8,(0,0):2}))

    def test_su3_ninej_four_fundamentals_and_dimension_normalization(self):
        import sympy as sp
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
            'factors':[[1,0]]*4,'target':[2,1],'state':{'index':0}})
        self.assertEqual((result['dimension'],result['multiplicity']),(81,3))
        # S4 standard Young space in the four orthogonal product states
        # with one d among three u's; pair exchange parities fix this basis.
        root=sp.sqrt(2)/2
        expected=sp.Matrix([[0,root,root],[root,sp.Rational(1,2),-sp.Rational(1,2)],
                            [root,-sp.Rational(1,2),sp.Rational(1,2)]])
        r=sp.Matrix(result['exactRecouplingMatrix']).applyfunc(sp.sympify)
        self.assertEqual((r-expected).applyfunc(sp.simplify),sp.zeros(3))
        left=[p['firstIntermediate']['dimension']*p['secondIntermediate']['dimension']
              for p in result['leftPaths']]
        right=[p['firstIntermediate']['dimension']*p['secondIntermediate']['dimension']
               for p in result['rightPaths']]
        self.assertEqual(left,[36,18,18])
        self.assertEqual(right,[36,18,18])
        s=sp.Matrix(result['exactNineJMatrix']).applyfunc(sp.sympify)
        for i in range(3):
            for j in range(3):
                self.assertEqual(sp.simplify(s[i,j]-r[i,j]/sp.sqrt(right[i]*left[j])),0)
        self.assertEqual((s.T*sp.diag(*right)*s-sp.diag(*[sp.Rational(1,d) for d in left])).applyfunc(sp.simplify),sp.zeros(3))
        # Schur-Weyl partitions [4], [3,1], [2,2], [2,1,1].
        self.assertEqual([(t['p'],t['q'],t['multiplicity']) for t in result['targets']],
                         [(4,0,1),(2,1,3),(0,2,2),(1,0,3)])
        self.assertTrue(all(v=='0' for v in result['exactChecks'].values()))

    def test_su3_ninej_exact_complex_roundtrip_and_identity(self):
        import sympy as sp
        request={'lab':'lie','experiment':'su3_ninej','factors':[[1,0]]*4,'target':[2,1]}
        state=[{'re':'sqrt(2)/2','im':'0'},{'re':'0','im':'sqrt(2)/2'},{'re':'0','im':'0'}]
        forward=self.result('teaching_labs',{**request,'state':{'amplitudes':state}})
        expected=[(0,sp.Rational(1,2)),(sp.Rational(1,2),sp.sqrt(2)/4),
                  (sp.Rational(1,2),-sp.sqrt(2)/4)]
        for actual,pair in zip(forward['exactOutputAmplitudes'],expected):
            for part,value in zip(('re','im'),pair):
                self.assertEqual(sp.simplify(sp.sympify(actual[part])-value),0)
        backward=self.result('teaching_labs',{**request,'direction':'right_to_left',
            'state':{'amplitudes':forward['exactOutputAmplitudes']}})
        for actual,original in zip(backward['exactOutputAmplitudes'],state):
            for part in ('re','im'):
                self.assertEqual(sp.simplify(sp.sympify(actual[part])-sp.sympify(original[part])),0)
        unit=self.result('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
            'factors':[[0,0]]*4})
        self.assertEqual(unit['exactRecouplingMatrix'],[['1']])
        self.assertEqual(unit['exactNineJMatrix'],[['1']])
        self.assertTrue(all(v=='0' for v in backward['exactChecks'].values()))

    def test_su3_ninej_preserves_root_and_pair_vertex_outer_copies(self):
        # Two octets in the final 8 x 8 -> 8 vertex, even though all
        # individual factors here are fundamental or antifundamental.
        result=self.result('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
            'factors':[[1,0],[0,1],[1,0],[0,1]],'target':[1,1]})
        self.assertEqual((result['dimension'],result['multiplicity']),(81,4))
        roots=[p['finalCopy'] for p in result['leftPaths']
               if all(p[k]['dimension']==8 for k in ('firstIntermediate','secondIntermediate'))]
        self.assertEqual(roots,[1,2])
        self.assertTrue(all(v=='0' for v in result['exactChecks'].values()))
        # A repeated 8 in the very first binary vertex is separately tagged.
        pair=self.result('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
            'factors':[[1,1],[1,1],[1,0],[0,0]],'target':[1,0]})
        self.assertEqual((pair['dimension'],pair['multiplicity']),(192,3))
        copies=[p['firstCopy'] for p in pair['leftPaths'] if p['firstIntermediate']['dimension']==8]
        self.assertEqual(copies,[1,2])
        self.assertLess(max(pair['checks'].values()),1e-8)
        self.assertTrue(all(v=='0' for v in pair['exactChecks'].values()))

    def test_su3_ninej_four_adjoints_exact_invariant_channels(self):
        import sympy as sp
        from collections import defaultdict
        payload=json.loads((ROOT/'dist/examples/su3-ninej-adjoint-singlet.json').read_text())
        result=self.result('teaching_labs',payload)
        self.assertEqual((result['dimension'],result['multiplicity']),(4096,8))
        self.assertEqual(len(result['targets']),13)
        self.assertEqual({(t['p'],t['q']):t['multiplicity'] for t in result['targets']
                          if (t['p'],t['q']) in ((0,0),(1,1),(2,2))},
                         {(0,0):8,(1,1):32,(2,2):33})
        index=payload['state']['index']
        self.assertEqual([result['leftPaths'][index][k]['dimension']
                          for k in ('firstIntermediate','secondIntermediate')],[1,1])
        # Independently normalized real-adjoint invariant delta_ab delta_cd/8:
        # its crossed self-overlap is sum_abcd(delta_ab delta_cd delta_ac delta_bd)/64=1/8.
        self.assertEqual(sp.sympify(result['exactRecouplingMatrix'][index][index]),sp.Rational(1,8))
        grouped=defaultdict(lambda:sp.Integer(0))
        for path,probability in zip(result['rightPaths'],result['exactOutputProbabilities']):
            irrep=path['firstIntermediate']
            grouped[irrep['p'],irrep['q']]+=sp.sympify(probability)
        self.assertEqual(dict(grouped),{(2,2):sp.Rational(27,64),(3,0):sp.Rational(10,64),
            (0,3):sp.Rational(10,64),(1,1):sp.Rational(16,64),(0,0):sp.Rational(1,64)})
        self.assertTrue(all(v=='0' for v in result['exactChecks'].values()))
        self.assertLess(max(result['checks'].values()),3e-12)

    def test_su3_ninej_higher_input_examples_and_independent_s3(self):
        import sympy as sp
        for label,n,m,target in [('10',270,4,[2,1]),('15',405,5,[3,1]),('27',729,5,[3,2])]:
            payload=json.loads((ROOT/f'dist/examples/su3-ninej-{label}-input.json').read_text())
            result=self.result('teaching_labs',payload)
            self.assertEqual((result['dimension'],result['multiplicity']),(n,m))
            self.assertEqual([result['target'][k] for k in ('p','q')],target)
            self.assertTrue(all(v=='0' for v in result['exactChecks'].values()))
            self.assertLess(max(result['checks'].values()),3e-12)
        # Independently, 10 x 3^3 -> 8 is the two-dimensional standard S3
        # multiplicity representation of B,C,D. In a CD-parity basis the
        # crossing reflection has squared entries 1/4 and 3/4.
        payload=json.loads((ROOT/'dist/examples/su3-ninej-10-permutation.json').read_text())
        result=self.result('teaching_labs',payload)
        self.assertEqual(result['multiplicity'],2)
        r=sp.Matrix(result['exactRecouplingMatrix']).applyfunc(sp.sympify)
        self.assertEqual(r.applyfunc(lambda x:sp.simplify(x*x)),
                         sp.Matrix([[sp.Rational(1,4),sp.Rational(3,4)],
                                    [sp.Rational(3,4),sp.Rational(1,4)]]))

    def test_su3_ninej_27_input_complex_and_large_target_label(self):
        import sympy as sp
        payload=json.loads((ROOT/'dist/examples/su3-ninej-27-input.json').read_text())
        state=[{'re':'sqrt(2)/2','im':'0'},{'re':'0','im':'sqrt(2)/2'}]+[{'re':'0','im':'0'}]*3
        forward=self.result('teaching_labs',{**payload,'state':{'amplitudes':state}})
        backward=self.result('teaching_labs',{**payload,'direction':'right_to_left',
            'state':{'amplitudes':forward['exactOutputAmplitudes']}})
        self.assertEqual(backward['exactOutputAmplitudes'],state)
        self.assertTrue(all(v=='0' for v in backward['exactChecks'].values()))
        # Three 15-prime inputs have a unique highest component (12,0).
        high=self.result('teaching_labs',{'lab':'lie','experiment':'su3_ninej',
            'factors':[[4,0],[4,0],[4,0],[0,0]],'target':[12,0]})
        self.assertEqual((high['dimension'],high['multiplicity']),(3375,1))
        self.assertEqual(high['exactRecouplingMatrix'],[['1']])
        # Both trees couple (8,0) of dimension45 with (4,0) of dimension15.
        self.assertEqual(high['exactNineJMatrix'],[['1/675']])

    def test_invalid_data_and_unknown_tool(self):
        for tool, payload in [('carat',{'dimension':'../../example'}), ('symbolic',[]),
                              ('symbolic',{'expression':'__import__("os").getcwd()'}), ('unknown',{})]:
            process = invoke(tool,payload)
            self.assertNotEqual(process.returncode,0)
            self.assertFalse(process.stdout.strip())


if __name__ == '__main__':
    unittest.main(verbosity=2)
