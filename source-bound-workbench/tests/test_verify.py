import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import uuid
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('source_verifier',ROOT/'src/verify.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)

def example(name='positive-gap'):
    return json.loads((ROOT/'examples'/f'{name}.json').read_text(encoding='utf-8'))

class ExactReceiverTests(unittest.TestCase):
    def test_all_examples(self):
        for name,status in [('positive-gap','CERTIFIED'),('wrong-window','UNRESOLVED'),('overlap','UNRESOLVED'),('malformed-source','REJECTED'),('wrong-symmetry','REJECTED'),('periodic-gap','CERTIFIED')]:
            with self.subTest(name=name):
                r=v.verify(example(name));self.assertEqual(r['status'],status)
                self.assertEqual('conclusion' in r,status=='CERTIFIED')

    def test_every_vertex_in_closed_three_cube(self):
        p=example();h=p['source']['H_affine'][0]
        p['source']['parameters']=['x','y','z'];p['source']['H_affine']=[h,h,h]
        # Sum0.75 leaves occupied edge below-0.25, so use common cuts+-0.1.
        p['request']['cuts']={'lower':'-0.1','upper':'0.1'}
        r=v.verify(p);self.assertEqual(r['status'],'CERTIFIED')
        self.assertEqual(r['checks']['spectral_counts']['vertices_checked'],8)
        self.assertEqual(r['conclusion']['gap_lower_bound'],'1/5')

    def test_upper_vertex_failure_cannot_be_ignored(self):
        p=example();p.pop('symmetry');p['source']['H_affine'][0][1][1]='2'
        r=v.verify(p);self.assertEqual(r['status'],'UNRESOLVED')
        self.assertEqual(r['checks']['spectral_counts']['vertices'][0]['negative_form']['status'],'PASS')
        self.assertEqual(r['checks']['spectral_counts']['vertices'][1]['negative_form']['status'],'FAIL')

    def test_nonorthogonal_full_frames_are_valid(self):
        p=example();p.pop('symmetry');p['request']['Q_minus'][0][0]='2';p['request']['Q_plus'][2][0]='3'
        self.assertEqual(v.verify(p)['status'],'CERTIFIED')

    def test_deficient_trial_frame_unresolved(self):
        p=example();p.pop('symmetry');p['request']['Q_plus'][2][0]='0'
        r=v.verify(p);self.assertEqual(r['status'],'UNRESOLVED');self.assertIn('TRIAL_NOT_FULL_RANK',r['reason_codes'])

    def test_trial_subspace_need_not_be_spectrally_invariant(self):
        p=example()
        # The positive/negative trial spaces mix under H, within eachV sector.
        p['source']['H0'][0][2]=p['source']['H0'][2][0]='1/4'
        p['source']['H0'][1][3]=p['source']['H0'][3][1]='1/4'
        r=v.verify(p);self.assertEqual(r['status'],'CERTIFIED');self.assertTrue(r['checks']['symmetry']['embedding_intertwiner'])

    def test_exact_covariance_is_required(self):
        p=example();p['source']['H0'][0][3]=p['source']['H0'][3][0]='1/100000000000000000'
        r=v.verify(p);self.assertEqual(r['status'],'REJECTED');self.assertFalse(r['checks']['symmetry']['source_covariance'])

    def test_false_period_is_rejected(self):
        p=example();p['periodic_axes']=[0]
        self.assertEqual(v.verify(p)['status'],'REJECTED')

    def test_constant_source_supports_zero_parameter_case(self):
        p=example();p['source']['parameters']=[];p['source']['H_affine']=[]
        r=v.verify(p);self.assertEqual(r['status'],'CERTIFIED');self.assertEqual(r['checks']['spectral_counts']['vertices_checked'],1)

    def test_source_identity_changes_on_source_change(self):
        p=example();a=v.verify(p);p['source']['H0'][0][0]='-3';b=v.verify(p)
        self.assertNotEqual(a['source']['canonical_sha256'],b['source']['canonical_sha256'])

    def test_witness_identity_changes_without_changing_source_identity(self):
        p=example();a=v.verify(p);p['request']['cuts']['lower']='-1/4';b=v.verify(p)
        self.assertEqual(a['source']['canonical_sha256'],b['source']['canonical_sha256']);self.assertNotEqual(a['input_sha256'],b['input_sha256'])

    def test_source_symmetry_exact(self):
        p=example();p['source']['H0'][0][1]='1/1000'
        self.assertEqual(v.verify(p)['reason_codes'],['SOURCE_NOT_SYMMETRIC'])

    def test_unknown_claim_is_not_trusted(self):
        p=example();p['status']='CERTIFIED'
        self.assertEqual(v.verify(p)['status'],'REJECTED')

    def test_float_rejected_but_decimal_string_exact(self):
        p=example();p['request']['cuts']['lower']=-0.5
        self.assertEqual(v.verify(p)['status'],'REJECTED')
        p['request']['cuts']['lower']='-0.5';self.assertEqual(v.verify(p)['status'],'CERTIFIED')

    def test_strict_cut_equality_is_unresolved(self):
        p=example();p.pop('symmetry');p['request']['cuts']['lower']='-3/4'
        self.assertEqual(v.verify(p)['status'],'UNRESOLVED')

    def test_invalid_fraction_and_extra_direction(self):
        p=example();p['request']['cuts']['lower']='1/0';self.assertEqual(v.verify(p)['status'],'REJECTED')
        p=example();p['request']['Q_plus'].append(['0','0']);self.assertEqual(v.verify(p)['status'],'REJECTED')

    def test_duplicate_json_key_rejected(self):
        t=ROOT/'tests'/'outputs'/('run-'+uuid.uuid4().hex)
        t.mkdir(parents=True)
        p=Path(t)/'x.json';p.write_text('{"schema":"source-bound-affine-v1","schema":"forged"}')
        with self.assertRaises(v.PacketError):v.load_packet(p)

    def test_cli_new_output_and_no_overwrite(self):
        t=ROOT/'tests'/'outputs'/('run-'+uuid.uuid4().hex)
        t.mkdir(parents=True)
        out=Path(t)/'receipt.json'
        cmd=[sys.executable,'-B',str(ROOT/'src/verify.py'),str(ROOT/'examples/positive-gap.json'),'--out',str(out)]
        r=subprocess.run(cmd,capture_output=True,text=True);self.assertEqual(r.returncode,0)
        self.assertEqual(json.loads(out.read_text())['status'],'CERTIFIED')
        original=out.read_bytes();r=subprocess.run(cmd,capture_output=True,text=True)
        self.assertEqual(r.returncode,4);self.assertEqual(out.read_bytes(),original)

if __name__=='__main__':unittest.main()
