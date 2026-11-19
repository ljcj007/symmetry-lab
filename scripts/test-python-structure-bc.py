"""Parser, coordinate, supercell and all-230-group BC conversion checks."""
from pathlib import Path
import json
import sys
import time
import unittest
import numpy as np
import spglib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
import structure_bc as bc


def synthetic(number):
    hall = next(h for h in range(1,531) if spglib.get_spacegroup_type(h).number == number)
    ops = spglib.get_symmetry_from_database(hall)
    rotations,translations = ops['rotations'],ops['translations']
    seed_metric = np.array([[2,.13,.07],[.13,3,.11],[.07,.11,5]])
    gram = sum(r.T @ seed_metric @ r for r in rotations)/len(rotations)
    lattice = np.linalg.cholesky(gram)*2
    positions,species = [],[]
    for point,label in (([.123781,.271439,.391713],'Na'),([.218619,.483713,.153917],'Cl')):
        for r,t in zip(rotations,translations): positions.append(r@point+t);species.append(label)
    positions,species = bc._deduplicate(positions,species,lattice,1e-7)
    return {'lattice':lattice.tolist(),'positions':positions.tolist(),'species':species}


def cif_with_setting(lengths, angles, declaration, sites):
    keys = ('length_a', 'length_b', 'length_c', 'angle_alpha', 'angle_beta', 'angle_gamma')
    cell = '\n'.join(f'_cell_{key} {value}' for key, value in zip(keys, (*lengths, *angles)))
    return (f'data_metric\n{cell}\n{declaration}\nloop_\n_atom_site_type_symbol\n'
            f'_atom_site_fract_x\n_atom_site_fract_y\n_atom_site_fract_z\n{sites}\n')


def sg4_cif(declaration):
    # Same cell and asymmetric unit as the `unique-c` exercise.
    return cif_with_setting((3, 5, 4), (90, 90, '101.2(1)'), declaration,
                            'Na .123 .345 .234\nCl .271 .159 .414')


class StructureBCTests(unittest.TestCase):
    def test_poscar_negative_cartesian_selective_vasp4(self):
        text = 'anonymous\n-64\n1 0 0\n0 1 0\n0 0 1\n1 1\nSelective dynamics\nCartesian\n0 0 0 T F T\n.5 .5 .5 F F F\n'
        p = bc.parse_poscar(text)
        np.testing.assert_allclose(p['lattice'],4*np.eye(3))
        np.testing.assert_allclose(p['positions'][1],[.5]*3)
        self.assertEqual(p['species'],['X1','X2'])
        self.assertEqual(p['metadata']['selective_dynamics'][0],[True,False,True])
        self.assertEqual(bc.run({'text':text})['group_number'],221)

    def test_poscar_three_scales(self):
        text = 'three scales\n2 3 4\n1 0 0\n0 1 0\n0 0 1\nNa\n1\nCartesian\n.5 .25 .125\n'
        p=bc.parse_poscar(text)
        np.testing.assert_allclose(p['lattice'],np.diag([2,3,4]))
        np.testing.assert_allclose(p['positions'],[[.5,.25,.125]])
        with self.assertRaises(ValueError): bc.parse_poscar(text.replace('2 3 4','2 -3 4'))

    def test_cif_quotes_uncertainty_symmetry_expansion(self):
        text = '''data_test
_audit_creation_method
;CIF 1.1 multiline text
not a token
;
_cell_length_a 3.0(2)
_cell_length_b 4.0
_cell_length_c 5.0
_cell_angle_alpha 90
_cell_angle_beta 101.2(1)
_cell_angle_gamma 90
loop_
_space_group_symop_id
_space_group_symop_operation_xyz
1 'x,y,z'
2 '-x,y+1/2,-z'
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
Na1 Na 0.123 0.234 0.345 1
Cl1 Cl 0.271 0.414 0.159 1
'''
        p=bc.parse_cif(text)
        self.assertEqual(len(p['species']),4)
        r=bc.run({'format':'cif','text':text})
        self.assertEqual(r['group_number'],4)
        self.assertTrue(r['verified'])
        for bad in (text.replace('0.345 1','0.345 .5'),text+'\n_atom_site_moment_crystalaxis_x 1\n'):
            with self.assertRaises(ValueError): bc.parse_cif(bad)
        with self.assertRaises(ValueError): bc._linear_symop("__import__('os'),y,z")

    def test_cif_hall_metadata_and_block_choice(self):
        cell=synthetic(19)
        text=bc.export_cif(bc._cell_result(cell['lattice'],cell['positions'],cell['species'],'test'))
        parsed=bc.parse_cif(text)
        self.assertEqual(len(parsed['species']),len(cell['species']))
        with self.assertRaises(ValueError):bc.parse_cif(text+text.replace('data_BC_cell','data_second'))
        parsed=bc.parse_cif(text+text.replace('data_BC_cell','data_second'),'second')
        self.assertEqual(len(parsed['species']),len(cell['species']))
        no_ops=text.replace("loop_\n_space_group_symop_operation_xyz\n'x,y,z'\n",'')
        self.assertEqual(len(bc.parse_cif(no_ops)['species']),len(cell['species']))

    def test_cif_metadata_uses_the_unique_metric_compatible_screw_setting(self):
        # Swap b and c of the site's P2_1 CIF fixture. Hall 7 is unique-c,
        # whereas Hall 6 (the first IT 4 record in spglib) is unique-b.
        sites = 'Na .123 .345 .234\nCl .271 .159 .414'
        lengths, angles = (3, 5, 4), (90, 90, '101.2(1)')
        number_tag = '_space_group_IT_number 4'
        hall = "_space_group_name_Hall 'P 2c'"
        explicit = "loop_\n_space_group_symop_operation_xyz\n'x,y,z'\n'-x,-y,z+1/2'"
        declarations = ((number_tag, 'metadata_hall'),
                        ("_space_group_name_H-M_alt 'P 21'", 'metadata_hall'),
                        (hall, 'explicit_hall'),
                        ("_space_group_name_Hall 'P 2yb'\n" + explicit, 'explicit_operations'))
        for declaration, method in declarations:
            with self.subTest(declaration=declaration):
                text = cif_with_setting(lengths, angles, declaration, sites)
                result = bc.run({'format': 'cif', 'text': text, 'k': [0, 0, '1/4']})
                self.assertTrue(result['verified'])
                self.assertEqual((result['group_number'], result['group_order']), (4, 2))
                self.assertEqual(result['input_cell']['atom_count'], 4)
                self.assertEqual(result['input_metadata']['declared_symmetry_operation_count'], 2)
                self.assertEqual(result['hall_number'], 6)
                self.assertEqual(result['input_metadata']['cif_symmetry_setting'], {
                    'method': method,
                    'selected_hall': None if method == 'explicit_operations' else
                    {'number': 7, 'symbol': 'P 2c', 'choice': 'c'},
                    'compatible_hall_count': 1 if method == 'metadata_hall' else None,
                    'ambiguous': False,
                })
                self.assertEqual(result['warnings'], [])
                np.testing.assert_allclose(result['input_cell']['positions'][1], [.877, .655, .734], atol=1e-12)
                np.testing.assert_allclose(np.array(result['transform']['coordinate_matrix']).T @ result['k_bc'],
                                           [0, 0, .25], atol=1e-12)

        wrong_hall = cif_with_setting(lengths, angles, "_space_group_name_Hall 'P 2yb'", sites)
        wrong_operations = cif_with_setting(lengths, angles,
                                            number_tag + '\n' + explicit.replace('-x,-y,z+1/2', '-x,y+1/2,-z'), sites)
        no_match = cif_with_setting(lengths, (82, 94, 101.2), number_tag, sites)
        for invalid in (wrong_hall, wrong_operations, no_match):
            with self.assertRaisesRegex(ValueError, 'rotations do not preserve the declared cell metric'):
                bc.parse_cif(invalid)

    def test_cif_dotted_names_replay_the_sg4_exercise(self):
        original = sg4_cif("_space_group_name_Hall 'P 2c'")
        dotted_geometry = (original.replace('_cell_', '_cell.')
                           .replace('_atom_site_', '_atom_site.')
                           .replace('_space_group_name_Hall', '_space_group.name_Hall'))
        request = {'format': 'cif', 'k': [0, 0, '1/4']}
        control = bc.run(dict(request, text=original))
        variants = ((dotted_geometry, 'explicit_hall'),
                    (original.replace('_space_group_name_Hall', '_space_group.name_Hall'), 'explicit_hall'),
                    (original.replace("_space_group_name_Hall 'P 2c'", '_space_group.IT_number 4'), 'metadata_hall'),
                    (original.replace("_space_group_name_Hall 'P 2c'", '_symmetry.Int_Tables_number 4'), 'metadata_hall'),
                    (original.replace("_space_group_name_Hall 'P 2c'", "_space_group.name_H-M_alt 'P 21'\n"
                                      "_space_group.name_H-M_full 'P 1 1 21'"), 'metadata_hall'),
                    (original.replace("_space_group_name_Hall 'P 2c'", "_space_group.name_H-M_full 'P 1 1 21'"),
                     'metadata_hall'))
        for text, method in variants:
            with self.subTest(declaration=text.splitlines()[7]):
                result = bc.run(dict(request, text=text))
                self.assertTrue(result['verified'])
                self.assertEqual((result['group_number'], result['hall_number']), (4, 6))
                self.assertEqual(result['input_cell']['species'], ['Na', 'Na', 'Cl', 'Cl'])
                self.assertEqual(result['input_cell'], control['input_cell'])
                self.assertEqual(result['bc_primitive'], control['bc_primitive'])
                self.assertEqual(result['k_bc'], [0, 0, -.25])
                self.assertEqual(result['input_metadata']['cif_symmetry_setting'], {
                    'method': method,
                    'selected_hall': {'number': 7, 'symbol': 'P 2c', 'choice': 'c'},
                    'compatible_hall_count': 1 if method == 'metadata_hall' else None,
                    'ambiguous': False,
                })
        metadata = bc.run(dict(request, text=dotted_geometry))['input_metadata']
        self.assertEqual(metadata['source_tags'], {
            '_cell.length_a': '3', '_cell.length_b': '5', '_cell.length_c': '4',
            '_cell.angle_alpha': '90', '_cell.angle_beta': '90', '_cell.angle_gamma': '101.2(1)',
            '_space_group.name_hall': 'P 2c',
        })
        self.assertEqual(metadata['source_site_rows'][0], {
            '_atom_site.type_symbol': 'Na', '_atom_site.fract_x': '.123',
            '_atom_site.fract_y': '.345', '_atom_site.fract_z': '.234',
        })
        with self.assertRaisesRegex(ValueError, 'rotations do not preserve the declared cell metric'):
            bc.parse_cif(dotted_geometry.replace('P 2c', 'P 2yb'))

    def test_cif_dotted_cartesian_names_and_type_symbol_priority(self):
        original = sg4_cif("_space_group_name_Hall 'P 2c'")
        control = bc.parse_cif(original)
        # Independently convert Cartesian row coordinates for this oblique cell.
        gamma = np.deg2rad(101.2)
        lattice = np.array([[3, 0, 0], [5 * np.cos(gamma), 5 * np.sin(gamma), 0], [0, 0, 4]])
        points = np.array([[.123, .345, .234], [.271, .159, .414]]) @ lattice
        dotted = original.split('loop_')[0] + (
            'loop_\n_atom_site.id\n_atom_site.type_symbol\n'
            '_atom_site.Cartn_x\n_atom_site.Cartn_y\n_atom_site.Cartn_z\n')
        dotted += '\n'.join(f'{label} {species} ' + ' '.join(map(str, xyz))
                            for label, species, xyz in zip(('Q1', 'Q2'), ('Na', 'Cl'), points))
        result = bc.parse_cif(dotted)
        self.assertEqual(result['species'], control['species'])
        np.testing.assert_allclose(result['positions'], control['positions'], atol=1e-12)
        self.assertEqual(result['metadata']['source_site_rows'][0]['_atom_site.id'], 'Q1')
        for label in ('_atom_site.id', '_atom_site.label'):
            fallback = dotted.replace('_atom_site.id', label).replace('_atom_site.type_symbol\n', '')
            fallback = fallback.replace('Q1 Na ', 'Na1 ').replace('Q2 Cl ', 'Cl1 ')
            self.assertEqual(bc.parse_cif(fallback)['species'], control['species'])

    def test_cif_dotted_occupancy_disorder_and_duplicate_aliases(self):
        text = sg4_cif("_space_group.name_Hall 'P 2c'")
        for column, value, message in (
            ('_atom_site.occupancy', '.5', 'Partial/zero occupancy'),
            ('_atom_site.disorder_group', '1', 'Disordered CIF sites'),
            ('_atom_site.disorder_assembly', 'A', 'Disordered CIF sites'),
        ):
            variant = text.replace('_atom_site_fract_z\n', f'_atom_site_fract_z\n{column}\n')
            variant = variant.replace('.234\n', f'.234 {value}\n').replace('.414\n', '.414 1\n')
            with self.subTest(column=column), self.assertRaisesRegex(ValueError, message):
                bc.parse_cif(variant)
        both_occupancies = text.replace('_atom_site_fract_z\n', '_atom_site_fract_z\n'
                                        '_atom_site_occupancy\n_atom_site.occupancy\n')
        both_occupancies = both_occupancies.replace('.234\n', '.234 1 .5\n').replace('.414\n', '.414 1 1\n')
        both_halls = text.replace('loop_', "_space_group_name_Hall 'P 2yb'\nloop_")
        both_lengths = text.replace('_cell_length_a 3', '_cell_length_a 3\n_cell.length_a 3')
        for variant in (both_occupancies, both_halls, both_lengths):
            with self.assertRaisesRegex(ValueError, 'Repeated CIF data item: .* aliases '):
                bc.parse_cif(variant)

    def test_cif_accepts_the_two_agreeing_legacy_it_number_tags(self):
        # COD 5000035 and 1011097 use both generations of these tags.
        text = sg4_cif('_space_group_IT_number 4\n_symmetry_Int_Tables_number 4')
        control = sg4_cif('_space_group_IT_number 4')
        request = {'format': 'cif', 'k': [0, 0, '1/4']}
        result = bc.run(dict(request, text=text))
        reference = bc.run(dict(request, text=control))
        self.assertEqual(result['input_cell'], reference['input_cell'])
        self.assertEqual(result['k_bc'], reference['k_bc'])
        metadata = result['input_metadata']
        self.assertEqual(metadata['cif_symmetry_setting'], reference['input_metadata']['cif_symmetry_setting'])
        self.assertEqual(metadata['source_tags']['_space_group_it_number'], '4')
        self.assertEqual(metadata['source_tags']['_symmetry_int_tables_number'], '4')

        operations = "loop_\n_symmetry_equiv_pos_as_xyz\n'x,y,z'\n'-x,-y,z+1/2'"
        explicit = text.replace('4\nloop_', f'4\n{operations}\nloop_', 1)
        parsed = bc.parse_cif(explicit)
        self.assertEqual(parsed['metadata']['cif_symmetry_setting']['method'], 'explicit_operations')
        self.assertEqual(parsed['species'], ['Na', 'Na', 'Cl', 'Cl'])
        for variant in (text, explicit):
            with self.assertRaisesRegex(ValueError, 'Conflicting CIF International Tables space-group numbers'):
                bc.parse_cif(variant.replace('_symmetry_Int_Tables_number 4', '_symmetry_Int_Tables_number 3'))
        with self.assertRaisesRegex(ValueError, 'Repeated CIF data item: .* aliases '):
            bc.parse_cif(text.replace('_space_group_IT_number', '_space_group.IT_number'))

    def test_cif_dotted_and_old_symop_names_preserve_explicit_operation_rules(self):
        control = bc.parse_cif(sg4_cif("_space_group_name_Hall 'P 2c'"))
        for key in ('_space_group_symop_operation_xyz', '_space_group_symop.operation_xyz',
                    '_symmetry_equiv_pos_as_xyz', '_symmetry_equiv.pos_as_xyz'):
            with self.subTest(key=key):
                text = sg4_cif(f"_space_group.name_Hall 'P 2yb'\nloop_\n{key}\n'x,y,z'\n'-x,-y,z+1/2'")
                result = bc.parse_cif(text)
                self.assertEqual(result['metadata']['cif_symmetry_setting']['method'], 'explicit_operations')
                self.assertEqual(result['metadata']['declared_symmetry_operation_count'], 2)
                self.assertEqual(result['species'], control['species'])
                np.testing.assert_allclose(result['positions'], control['positions'], atol=1e-12)
                with self.assertRaisesRegex(ValueError, 'must include identity'):
                    bc.parse_cif(text.replace("'x,y,z'\n", ''))
        repeated = sg4_cif("loop_\n_space_group_symop_operation_xyz\n_space_group_symop.operation_xyz\n"
                           "'x,y,z' 'x,y,z'\n'-x,-y,z+1/2' 'x,y,z'")
        with self.assertRaisesRegex(ValueError, 'Repeated CIF data item: .* aliases '):
            bc.parse_cif(repeated)

    def test_cif_metadata_retains_first_choice_warning_for_multiple_metric_matches(self):
        sites = 'Na .123 .345 .234\nCl .271 .159 .414'
        lengths, angles = (3, 5, 4), (90, 90, 90)
        inferred = bc.parse_cif(cif_with_setting(lengths, angles, '_space_group_IT_number 4', sites))
        first = bc.parse_cif(cif_with_setting(lengths, angles, "_space_group_name_Hall 'P 2yb'", sites))
        self.assertEqual(inferred['species'], first['species'])
        np.testing.assert_array_equal(inferred['positions'], first['positions'])
        self.assertTrue(any('no unique Hall setting' in message for message in inferred['metadata']['warnings']))
        self.assertEqual(first['metadata']['warnings'], [])
        selected = {'number': 6, 'symbol': 'P 2yb', 'choice': 'b'}
        self.assertEqual(inferred['metadata']['cif_symmetry_setting'], {
            'method': 'metadata_hall', 'selected_hall': selected,
            'compatible_hall_count': 3, 'ambiguous': True,
        })
        self.assertEqual(first['metadata']['cif_symmetry_setting'], {
            'method': 'explicit_hall', 'selected_hall': selected,
            'compatible_hall_count': None, 'ambiguous': False,
        })

    def test_cif_without_symmetry_metadata_records_complete_cell_expansion(self):
        text = cif_with_setting((3, 5, 4), (82, 94, 101.2), '', 'Na .123 .345 .234')
        result = bc.run({'format': 'cif', 'text': text})
        self.assertEqual(result['input_cell']['atom_count'], 1)
        self.assertEqual(result['input_metadata']['declared_symmetry_operation_count'], 1)
        self.assertEqual(result['input_metadata']['cif_symmetry_setting'], {
            'method': 'complete_cell_p1', 'selected_hall': None,
            'compatible_hall_count': None, 'ambiguous': False,
        })
        self.assertTrue(any('complete cell (P1 expansion)' in message for message in result['warnings']))
        self.assertEqual((result['group_number'], result['hall_number']), (2, 2))

    def test_cif_metadata_distinguishes_hexagonal_and_rhombohedral_settings(self):
        # IT 166 has Hall 458 (H, centered) and 459 (R, primitive).
        sites = 'C .117 .236 .371\nO .192 .287 .426'
        cases = (
            ((5, 5, 12), (90, 90, 120), {'number': 458, 'symbol': '-R 3 2"', 'choice': 'H'}, 36),
            ((5, 5, 5), (77, 77, 77), {'number': 459, 'symbol': '-P 3* 2', 'choice': 'R'}, 12),
        )
        for lengths, angles, selected, operation_count in cases:
            hall = f"_space_group_name_Hall '{selected['symbol']}'"
            with self.subTest(hall=hall):
                inferred = cif_with_setting(lengths, angles, '_space_group_IT_number 166', sites)
                explicit = cif_with_setting(lengths, angles, hall, sites)
                request = {'format': 'cif', 'k': ['1/4', 0, '1/4']}
                result = bc.run(dict(request, text=inferred))
                control = bc.run(dict(request, text=explicit))
                self.assertTrue(result['verified'])
                self.assertEqual((result['group_number'], result['group_order']), (166, 12))
                self.assertEqual(result['input_metadata']['declared_symmetry_operation_count'], operation_count)
                self.assertEqual((result['hall_number'], control['hall_number']), (458, 458))
                self.assertEqual(result['input_metadata']['cif_symmetry_setting'], {
                    'method': 'metadata_hall', 'selected_hall': selected,
                    'compatible_hall_count': 1, 'ambiguous': False,
                })
                self.assertEqual(control['input_metadata']['cif_symmetry_setting'], {
                    'method': 'explicit_hall', 'selected_hall': selected,
                    'compatible_hall_count': None, 'ambiguous': False,
                })
                self.assertEqual(result['input_cell']['atom_count'], 2 * operation_count)
                self.assertEqual(result['input_cell'], control['input_cell'])
                self.assertEqual(result['bc_primitive'], control['bc_primitive'])
                self.assertEqual(result['k_bc'], control['k_bc'])
                self.assertEqual(result['warnings'], [])

    def test_shifted_oblique_supercell_and_reciprocal(self):
        # A deliberately non-symmetry-adapted determinant-two cubic supercell.
        s=np.array([[2,1,0],[0,1,0],[0,0,1]])
        base=np.array([[0,0,0],[.5,.5,.5]])
        points=[];species=[]
        for translation in ([0,0,0],[1,0,0]):
            for point,label in zip(base,['Na','Cl']):
                points.append((point+translation) @ np.linalg.inv(s)+[.137,.213,.119]);species.append(label)
        r=bc.run({'cell':{'lattice':(s*4).tolist(),'positions':points,'species':species},'k':['1/3','1/5','1/7']})
        self.assertEqual(r['group_number'],221);self.assertEqual(r['group_order'],48)
        self.assertEqual(r['atom_count'],2)
        self.assertTrue(r['verification']['input_operation_transport_verified'])
        m=np.array(r['transform']['coordinate_matrix']);k=np.array(r['k_bc'])
        np.testing.assert_allclose(m.T @ k,[1/3,1/5,1/7],atol=1e-10)
        self.assertLess(r['verification']['idealization_max_atom_displacement_angstrom'],1e-8)

    def test_centering_origin_exports_roundtrip(self):
        for number in (5,38,70,88,146,167,227,230):
            with self.subTest(group=number):
                r=bc.run({'cell':synthetic(number)})
                self.assertEqual(r['group_number'],number)
                self.assertTrue(r['verification']['atoms_per_volume_preserved'])
                for fmt,key in (('poscar','bc_poscar'),('cif','bc_cif')):
                    again=bc.run({'format':fmt,'text':r['exports'][key]})
                    self.assertEqual(again['group_number'],number)
                    self.assertEqual(again['atom_count'],r['atom_count'])

    def test_validation_and_json(self):
        for payload in ({'cell':{'lattice':np.eye(3),'positions':[[0,0,0]],'species':['X'],'occupancies':[.5]}},
                        {'cell':synthetic(1),'symprec':float('nan')},
                        {'text':'x'*4_000_001}):
            with self.assertRaises(ValueError):bc.run(payload)
        json.dumps(bc.run({'cell':synthetic(4)}),allow_nan=False)

    def test_skewed_periodic_distance(self):
        lattice=np.array([[1,0,0],[1,.00001,0],[0,0,1]])
        # Nearest component rounding gives [0.49,0.49,0] and a distance~0.98;
        # the actual nearby translate is [0.49,-0.51,0], within 0.021 A.
        positions,labels=bc._deduplicate([[0,0,0],[.49,.49,0]],['X','X'],lattice,.021)
        self.assertEqual(len(labels),1)


if __name__=='__main__':
    if '--all' in sys.argv:
        started=time.time();passed=[];failures=[]
        s=np.array([[1,1,0],[0,1,1],[0,0,1]])
        turn=np.array([[.6,-.8,0],[.8,.6,0],[0,0,1]])
        for number in range(1,231):
            try:
                cell=synthetic(number)
                r=bc.run({'cell':cell})
                if r['group_number'] != number: raise AssertionError('identified '+str(r['group_number']))
                if not r['verified']:raise AssertionError('not verified')
                transformed={'lattice':(s@np.array(cell['lattice'])@turn).tolist(),
                             'positions':(np.array(cell['positions'])@np.linalg.inv(s)+[.137,.213,.119]).tolist(),
                             'species':cell['species']}
                r=bc.run({'cell':transformed})
                if r['group_number'] != number or not r['verified']: raise AssertionError('basis/origin/rotation transform failed')
                passed.append(number)
            except Exception as exc:failures.append([number,str(exc)])
        print(json.dumps({'tested_space_groups':230,'structures':460,'passed':len(passed),'failures':failures,'seconds':round(time.time()-started,2)}))
        sys.exit(bool(failures))
    unittest.main(verbosity=2)
