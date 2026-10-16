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

    def test_invalid_data_and_unknown_tool(self):
        for tool, payload in [('carat',{'dimension':'../../example'}), ('symbolic',[]),
                              ('symbolic',{'expression':'__import__("os").getcwd()'}), ('unknown',{})]:
            process = invoke(tool,payload)
            self.assertNotEqual(process.returncode,0)
            self.assertFalse(process.stdout.strip())


if __name__ == '__main__':
    unittest.main(verbosity=2)
