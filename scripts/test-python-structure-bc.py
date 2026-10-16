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
