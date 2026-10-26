"""Independent algebra and motif checks for the three group-extension labs."""
import itertools
import json
import math
from pathlib import Path
import sys
import unittest

import sympy as sp

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'dist' / 'python'))
import teaching_labs


PRESETS = {
    'double_group': ('c2_point', 'd2_point', 'screw21_space'),
    'color_group': ('c3_point', 'translation3_space'),
    'spin_group': ('c2_point', 'af_space', 'triangular_point', 'helix3_space'),
}
VARIANTS = ('combined', 'spatial_only', 'internal_only')
I3 = sp.eye(3)
I2 = sp.eye(2)
PAULI = (sp.Matrix([[0, 1], [1, 0]]), sp.Matrix([[0, -sp.I], [sp.I, 0]]),
         sp.diag(1, -1))


def exact(values):
    return sp.Matrix([[sp.sympify(v) for v in row] for row in values])


def vector(values):
    return sp.Matrix([sp.sympify(v) for v in values])


def run(lab, preset, **kwargs):
    return teaching_labs.run({'lab': lab, 'preset': preset, **kwargs})


def periodic_same(a, b):
    return all(sp.simplify(x-y).is_integer is True for x, y in zip(a,b))


class GroupExtensionTests(unittest.TestCase):
    def test_all_presets_public_contract_and_json(self):
        for lab, presets in PRESETS.items():
            for preset in presets:
                with self.subTest(lab=lab, preset=preset):
                    result = run(lab,preset,steps=12)
                    self.assertEqual(len(result['frames']),13)
                    self.assertTrue(result['exact'])
                    self.assertTrue(all(item['passed'] for item in result['checks']))
                    self.assertEqual(result,json.loads(json.dumps(result,allow_nan=False)))
                    self.assertGreaterEqual(len(result['derivation']),4)
                    self.assertTrue(result['group']['quotientBy'])
                    self.assertTrue(result['group']['tableRepresents'])
                    if preset.endswith('_space'):
                        self.assertEqual(len(result['cellVertices']),8)
                        self.assertFalse(result['group']['finiteFullGroup'])
                        self.assertEqual(result['closure']['fullOrder'],'infinite')

    def test_all_displayed_tables_are_associative_groups(self):
        # Independent table axioms for all finite groups and translation quotients.
        for lab, presets in PRESETS.items():
            for preset in presets:
                group = run(lab,preset)['group']
                labels, table = group['labels'], group['table']
                size = group['order']
                self.assertEqual(len(labels),size)
                self.assertEqual(len(set(labels)),size)
                self.assertEqual(len(table),size)
                self.assertEqual(table[0],labels)
                self.assertEqual([row[0] for row in table],labels)
                lookup = {label:i for i,label in enumerate(labels)}
                mul = lambda a,b: lookup[table[a][b]]
                for i in range(size):
                    self.assertEqual(set(table[i]),set(labels))
                    self.assertEqual({table[j][i] for j in range(size)},set(labels))
                    self.assertTrue(any(mul(i,j) == 0 and mul(j,i) == 0 for j in range(size)))
                for a,b,c in itertools.product(range(size),repeat=3):
                    self.assertEqual(mul(mul(a,b),c),mul(a,mul(b,c)))

    def test_q8_table_is_faithful_pauli_matrix_multiplication(self):
        result = run('double_group','d2_point',steps=8)
        x,y,z = [-sp.I * p for p in PAULI]
        matrices = {'E':I2,'barE':-I2,'X':x,'barX':-x,'Y':y,'barY':-y,'Z':z,'barZ':-z}
        labels, table = result['group']['labels'],result['group']['table']
        for i,left in enumerate(labels):
            for j,right in enumerate(labels):
                self.assertEqual(matrices[left]*matrices[right],matrices[table[i][j]])
        self.assertEqual(x*y,z)
        self.assertEqual(y*x,-z)
        self.assertEqual(x*y*x.inv()*y.inv(),-I2)
        self.assertEqual(result['group']['quotientOrder'],4)

    def test_double_sequence_uses_new_operation_on_left(self):
        result = run('double_group','d2_point',steps=12)
        current = I2
        for index,frame in enumerate(result['frames']):
            matrix = exact(frame['spinorMatrixExact'])
            self.assertEqual(matrix,current)
            self.assertEqual(matrix.H*matrix,I2)
            self.assertEqual(sp.simplify(matrix.det()),1)
            # U sigma_j U^-1 supplies columns of the classical rotation.
            projected = sp.Matrix(3,3,lambda i,j:sp.simplify(sp.trace(PAULI[i]*matrix*PAULI[j]*matrix.H)/2))
            self.assertEqual(projected,exact(frame['rotationExact']))
            current = -sp.I*PAULI[index%2]*current
        self.assertEqual(exact(result['frames'][4]['spinorMatrixExact']),-I2)
        self.assertEqual(exact(result['frames'][8]['spinorMatrixExact']),I2)
        self.assertEqual(result['closure']['sequenceSpatialReturnStep'],4)
        self.assertEqual(result['closure']['sequenceSpinorReturnStep'],8)

    def test_c2_lift_has_four_elements_and_two_classical_rotations(self):
        result = run('double_group','c2_point',steps=4)
        self.assertEqual(exact(result['frames'][2]['spinorMatrixExact']),-I2)
        self.assertEqual(exact(result['frames'][4]['spinorMatrixExact']),I2)
        self.assertEqual(exact(result['frames'][2]['rotationExact']),I3)
        self.assertEqual(result['frames'][0]['sites'][0]['spin'],result['frames'][2]['sites'][0]['spin'])
        self.assertEqual(result['group']['order'],4)
        self.assertEqual(result['group']['quotientOrder'],2)

    def test_double_screw_keeps_integer_translation_and_bloch_sign(self):
        for kz in ('0','1/4','1/2'):
            result = run('double_group','screw21_space',steps=12,kz=kz)
            for step,frame in enumerate(result['frames']):
                self.assertEqual(vector(frame['translationExact']),sp.Matrix([0,0,sp.Rational(step,2)]))
                initial = vector(result['referenceSites'][0]['positionExact'])
                expected = sp.diag((-1)**step,(-1)**step,1)*initial + sp.Matrix([0,0,sp.Rational(step,2)])
                self.assertEqual(vector(frame['sites'][0]['positionExact']),expected)
            self.assertEqual(exact(result['frames'][2]['spinorMatrixExact']),-I2)
            self.assertEqual(vector(result['frames'][2]['translationExact']),sp.Matrix([0,0,1]))
            phase = -sp.exp(-2*sp.pi*sp.I*sp.Rational(kz))
            self.assertEqual(sp.simplify(sp.sympify(result['closure']['blochPhaseExact'])-phase),0)
            # C4 is the translation quotient; projection to spatial point group is C2.
            self.assertEqual(result['group']['order'],4)
            self.assertEqual(result['group']['quotientOrder'],4)
            self.assertEqual(result['group']['spatialPointOrder'],2)

    def test_color_equivariance_and_negative_controls_at_every_power(self):
        for preset in PRESETS['color_group']:
            periodic = preset.endswith('_space')
            for variant in VARIANTS:
                result = run('color_group',preset,variant=variant,steps=12)
                reference = result['referenceSites']
                for frame in result['frames']:
                    expected_valid = variant == 'combined' or frame['step']%3 == 0
                    self.assertEqual(frame['preservesPattern'],expected_valid)
                    matches = []
                    for site in frame['sites']:
                        position = vector(site['positionExact'])
                        candidates = [target['id'] for target in reference
                                      if ((periodic_same(position,vector(target['positionExact'])) if periodic else position == vector(target['positionExact']))
                                          and site['color'] == target['color'])]
                        matches.append(candidates)
                        if expected_valid:
                            self.assertEqual(candidates,[site['targetId']])
                    self.assertEqual(all(len(candidates)==1 for candidates in matches),expected_valid)
                    expected_shift = 0 if variant == 'spatial_only' else frame['step']%3
                    self.assertEqual(frame['colorPermutation'],[(i+expected_shift)%3 for i in range(3)])

    def test_color_threefold_closure_changes_translation_only_in_space(self):
        point = run('color_group','c3_point',steps=3)
        space = run('color_group','translation3_space',steps=3)
        self.assertEqual(point['frames'][3]['rotationExact'],[['1','0','0'],['0','1','0'],['0','0','1']])
        self.assertEqual(point['frames'][3]['translationExact'],['0','0','0'])
        self.assertEqual(space['frames'][3]['translationExact'],['0','0','1'])
        self.assertNotEqual(space['frames'][0]['sites'][0]['positionExact'],space['frames'][3]['sites'][0]['positionExact'])
        self.assertEqual(space['frames'][0]['sites'][0]['positionWrapped'],space['frames'][3]['sites'][0]['positionWrapped'])

    def test_spin_pattern_exact_matching_and_negative_controls(self):
        for preset in PRESETS['spin_group']:
            periodic = preset.endswith('_space')
            order = 2 if preset in ('c2_point','af_space') else 3
            for variant in VARIANTS:
                result = run('spin_group',preset,variant=variant,steps=12)
                reference = result['referenceSites']
                for frame in result['frames']:
                    expected_valid = variant == 'combined' or frame['step']%order == 0
                    self.assertEqual(frame['preservesPattern'],expected_valid)
                    rotation, spin_rotation = exact(frame['rotationExact']),exact(frame['internalExact'])
                    for matrix in (rotation,spin_rotation):
                        self.assertEqual(sp.simplify(matrix.T*matrix),I3)
                        self.assertEqual(sp.simplify(matrix.det()),1)
                    for i,site in enumerate(frame['sites']):
                        position, spin = vector(site['positionExact']),vector(site['spinExact'])
                        expected_spin = spin_rotation*vector(reference[i]['spinExact'])
                        self.assertEqual(sp.simplify(spin-expected_spin),sp.zeros(3,1))
                        self.assertEqual(sp.simplify(spin.dot(spin)),1)
                        candidates = [target['id'] for target in reference
                                      if ((periodic_same(position,vector(target['positionExact'])) if periodic else position == vector(target['positionExact']))
                                          and spin == vector(target['spinExact']))]
                        self.assertEqual(bool(candidates),expected_valid)
                        if expected_valid:
                            self.assertEqual(candidates,[site['targetId']])

    def test_spin_point_and_space_have_independent_rotations(self):
        for preset in ('c2_point','af_space','helix3_space'):
            result = run('spin_group',preset,steps=1)
            self.assertNotEqual(result['frames'][1]['rotationExact'],result['frames'][1]['internalExact'])
            self.assertTrue(result['frames'][1]['preservesPattern'])
            self.assertFalse(result['socLockedTest']['preservesPattern'])
        triangle = run('spin_group','triangular_point',steps=1)
        self.assertEqual(triangle['frames'][1]['rotationExact'],triangle['frames'][1]['internalExact'])
        self.assertTrue(triangle['socLockedTest']['preservesPattern'])
        # C2x flips a collinear moment in the same way as time reversal, but
        # does not flip a generic moment. These are distinct symmetry operators.
        c2x = exact(run('spin_group','af_space',steps=1)['frames'][1]['internalExact'])
        self.assertEqual(c2x*sp.Matrix([0,0,1]),sp.Matrix([0,0,-1]))
        self.assertNotEqual(c2x*sp.Matrix([1,2,3]),-sp.Matrix([1,2,3]))

    def test_spin_translation_projection_retains_nontrivial_spin_factor(self):
        for preset,order in (('af_space',2),('helix3_space',3)):
            result = run('spin_group',preset,steps=order)
            projection = result['spinPointProjection']
            self.assertEqual(projection['operation'],'[U∥I]')
            self.assertEqual(projection['order'],order)
            self.assertEqual(exact(result['frames'][1]['rotationExact']),I3)
            self.assertNotEqual(exact(result['frames'][1]['internalExact']),I3)
            self.assertEqual(exact(result['frames'][order]['internalExact']),I3)
            self.assertEqual(result['frames'][order]['translationExact'],['0','0','1'])
            self.assertIn('[I∥I|n]',projection['kernel'])

    def test_float_previews_agree_with_exact_algebra(self):
        for lab,presets in PRESETS.items():
            for preset in presets:
                result = run(lab,preset,steps=12)
                for frame in result['frames']:
                    for site in frame['sites']:
                        for name in ('position','spin'):
                            if name in site:
                                for actual,expected in zip(site[name],vector(site[name+'Exact'])):
                                    self.assertTrue(math.isfinite(actual))
                                    self.assertAlmostEqual(actual,float(expected),places=12)

    def test_input_validation_rejects_ambiguous_or_unbounded_requests(self):
        for payload in (None,[],1,{'lab':'unknown'},
                        {'lab':'double_group','preset':'unknown'},
                        {'lab':'color_group','preset':'c2_point'},
                        {'lab':'spin_group','variant':'time_reversal'},
                        {'lab':'double_group','kz':0},
                        {'lab':'double_group','kz':'1/3'}):
            with self.subTest(payload=payload),self.assertRaises(ValueError):
                teaching_labs.run(payload)
        for steps in (True,False,0,-1,13,1.5,'4',None):
            for lab,presets in PRESETS.items():
                with self.subTest(lab=lab,steps=steps),self.assertRaises(ValueError):
                    run(lab,presets[0],steps=steps)


if __name__ == '__main__':
    unittest.main()
