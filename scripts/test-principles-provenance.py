"""Independent checks of recursive manifest hashing, cycle errors and immutability."""
import copy
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh_principles',ROOT/'scripts/refresh-principles-provenance.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)


class ProvenanceTests(unittest.TestCase):
    def test_recursive_hashes_use_final_bytes_and_are_idempotent(self):
        old={'release':'old','counts':{'n':1},'files':{'dist/leaf.txt':{'sha256':'old','bytes':0,'purpose':'retain'}}}
        middle={'release':'middle','files':[{'path':'dist/old.json','sha256':'old','bytes':0}]}
        newest={'files':[{'path':'dist/middle.json','sha256':'old','bytes':0},{'path':'dist/old.json','sha256':'old'}]}
        source={'dist/new.json':newest,'dist/middle.json':middle,'dist/old.json':old}
        saved=copy.deepcopy(source)
        leaf=lambda name:b'actual normalized contents\n'
        result=r.ManifestGraph(source,leaf).all_outputs()
        self.assertEqual(source,saved,'The caller data must not be mutated')
        self.assertEqual(result['dist/old.json']['release'],'old')
        self.assertEqual(result['dist/old.json']['counts'],{'n':1})
        self.assertEqual(result['dist/old.json']['files']['dist/leaf.txt']['purpose'],'retain')
        self.assertEqual(result['dist/old.json']['files']['dist/leaf.txt']['sha256'],r.digest(leaf('ignored')))
        expected=r.serialized(result['dist/old.json']).encode('utf8')
        self.assertEqual(result['dist/middle.json']['files'][0]['sha256'],r.digest(expected))
        self.assertEqual(result['dist/middle.json']['files'][0]['bytes'],len(expected))
        self.assertEqual(result['dist/new.json']['files'][0]['sha256'],r.digest(r.serialized(result['dist/middle.json']).encode('utf8')))
        self.assertNotIn('bytes',result['dist/new.json']['files'][1],'Do not add metadata fields to historical rows')
        self.assertEqual(result,r.ManifestGraph(result,leaf).all_outputs())

    def test_cycle_rejected_with_path(self):
        source={'dist/a.json':{'files':[{'path':'dist/b.json','sha256':'x'}]},'dist/b.json':{'files':[{'path':'dist/a.json','sha256':'x'}]}}
        with self.assertRaisesRegex(ValueError,r'cycle: dist/a.json -> dist/b.json -> dist/a.json'):
            r.ManifestGraph(source).all_outputs()

    def test_repository_and_ephemeral_paths_rejected(self):
        for name in ('../outside.json','.openai/temporary.json'):
            with self.assertRaises(ValueError):r.safe_name(name)

    def test_core_inventory_only_the_three_new_modules(self):
        self.assertEqual(set(r.CORE),{'order_parameter_lab','exchange_symmetry_lab','conservation_lab'})
        self.assertEqual(set(r.MODULES),{'order','exchange','conservation'})
        self.assertEqual(r.RELEASE,'20261030-symmetry1')


if __name__=='__main__':unittest.main(verbosity=2)
