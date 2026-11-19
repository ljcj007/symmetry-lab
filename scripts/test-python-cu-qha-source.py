"""Run the shipped Cu inputs through the actual browser Python action."""

from decimal import Decimal, localcontext
import hashlib
import json
import lzma
from pathlib import Path
import sys
import unittest

import yaml


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / 'dist/data/examples'
EXAMPLE = EXAMPLES / 'phonopy-cu-qha'
sys.path.insert(0, str(ROOT / 'dist/python'))
from browser_api import run

JOULES_PER_EV = Decimal('1.602176634e-19')
AVOGADRO = Decimal('6.02214076e23')
JOULES_MOLAR_PER_EV = JOULES_PER_EV * AVOGADRO
KILOJOULES_MOLAR_PER_EV = JOULES_MOLAR_PER_EV / 1000
EV_ANGSTROM_TO_GPA = JOULES_PER_EV / Decimal('1e-30') / Decimal('1e9')


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def parse_static():
    text = (EXAMPLE / 'e-v.dat').read_text(encoding='ascii')
    values = [tuple(map(Decimal, line.split())) for line in text.splitlines() if line and not line.startswith('#')]
    return tuple(zip(*values))


def solve_small_system(rows):
    """Solve a small normal system in decimal arithmetic with pivoting."""
    matrix = [row[:] for row in rows]
    for column in range(len(matrix)):
        pivot = max(range(column, len(matrix)), key=lambda i: abs(matrix[i][column]))
        matrix[column], matrix[pivot] = matrix[pivot], matrix[column]
        scale = matrix[column][column]
        if not scale:
            raise AssertionError('Control fit unexpectedly singular')
        matrix[column] = [x / scale for x in matrix[column]]
        for row in range(len(matrix)):
            if row == column:
                continue
            scale = matrix[row][column]
            matrix[row] = [a - scale * b for a, b in zip(matrix[row], matrix[column])]
    return [row[-1] for row in matrix]


def independent_fit(volumes, free_energy):
    """Five-point cubic, using decimal normal equations and a derivative bracket."""
    index = min(range(len(volumes)), key=free_energy.__getitem__)
    if index in (0, len(volumes) - 1):
        raise AssertionError('Unexpected boundary for this interior control')
    start = min(max(index - 2, 0), len(volumes) - 5)
    center = volumes[index]
    xs = [volume - center for volume in volumes[start:start + 5]]
    ys = free_energy[start:start + 5]
    with localcontext() as context:
        context.prec = 50
        terms = [[Decimal(1), x, x * x, x * x * x] for x in xs]
        columns = list(zip(*terms))
        products = lambda left, right: sum(a * b for a, b in zip(left, right))
        equations = [[products(left, right) for right in columns] + [products(left, ys)] for left in columns]
        c0, c1, c2, c3 = solve_small_system(equations)

        def slope(x):
            return c1 + x * (2 * c2 + 3 * c3 * x)

        low = volumes[index - 1] - center
        high = volumes[index + 1] - center
        if not slope(low) < 0 < slope(high):
            raise AssertionError('The interior control must bracket a minimum')
        for _ in range(100):
            midpoint = (high + low) / 2
            if slope(midpoint) > 0:
                high = midpoint
            else:
                low = midpoint
        offset = (high + low) / 2
        volume = center + offset
        energy = c0 + offset * (c1 + offset * (c2 + offset * c3))
        curvature = 2 * c2 + 6 * c3 * offset
        if curvature <= 0:
            raise AssertionError('The interior control must have positive curvature')
        return volume, energy, volume * curvature * EV_ANGSTROM_TO_GPA


class CuQhaSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((EXAMPLE / 'source.json').read_bytes())
        cls.payload_text = (EXAMPLE / 'payload.json').read_bytes().decode('utf-8')
        cls.payload = json.loads(cls.payload_text)
        cls.volumes, cls.energies = parse_static()
        cls.thermal = []
        for entry in cls.manifest['thermalFiles']:
            raw = (EXAMPLE / entry['path']).read_bytes()
            cls.thermal.append(yaml.safe_load(lzma.decompress(raw)))
        cls.result = run('qha_lab', {'source': 'thermal', 'content': cls.payload_text,
                                    'fit_degree': 3, 'fit_window': 5, 'pressure': 0})
        cls.rows = {row['temperature']: row for row in cls.result['rows']}

    def total_free_energy(self, temperature):
        energies = []
        for static, sheet in zip(self.energies, self.thermal):
            sample = sheet['thermal_properties'][temperature // 10]
            self.assertEqual(sample['temperature'], temperature)
            energies.append(static + Decimal(str(sample['free_energy'])) / KILOJOULES_MOLAR_PER_EV)
        return energies

    def verify_original(self, entry):
        raw = (EXAMPLE / entry['path']).read_bytes()
        self.assertEqual(len(raw), entry['bytes'])
        self.assertEqual(sha256(raw), entry['sha256'])
        git_header = f'blob {len(raw)}\0'.encode('ascii')
        self.assertEqual(hashlib.sha1(git_header + raw).hexdigest(), entry['gitBlobSha1'])
        self.assertIn('/18cad919af8fe8aad349e04f101887fa19b051a0/', entry['url'])
        return raw

    def test_static_and_compressed_sources_match_payload_bytes(self):
        self.assertEqual(self.manifest['commit'], '18cad919af8fe8aad349e04f101887fa19b051a0')
        self.assertEqual(self.manifest['format'], 'symmetry-lab-phonopy-cu-qha-source-1')
        self.assertEqual(self.manifest['license'], 'BSD-3-Clause')
        self.assertEqual(self.verify_original(self.manifest['licenseFile']), (EXAMPLES / 'phonopy-cu-LICENSE.txt').read_bytes())
        self.verify_original(self.manifest['eVFile'])
        self.assertEqual(self.payload['volumes'], [float(value) for value in self.volumes])
        self.assertEqual(self.payload['staticEnergies'], [float(value) for value in self.energies])
        self.assertEqual(len(self.thermal), 11)
        for index, entry in enumerate(self.manifest['thermalFiles']):
            with self.subTest(index=index):
                self.assertEqual(entry['index'], index)
                self.assertEqual(entry['path'], f'thermal_properties.yaml-{index:02d}.xz')
                raw = self.verify_original(entry)
                text = lzma.decompress(raw)
                self.assertEqual(sha256(text), entry['yaml']['sha256'])
                self.assertEqual(len(text), entry['yaml']['bytes'])
                self.assertEqual(text, self.payload['thermalFiles'][index].encode('utf-8'))
                if index == 5:
                    self.assertEqual(raw, (EXAMPLES / 'phonopy-cu-thermal-index05.yaml.xz').read_bytes())
                    self.assertEqual(text, (EXAMPLES / 'phonopy-cu-thermal-index05.yaml').read_bytes())
        self.assertEqual(len(self.payload_text.encode('utf-8')), self.manifest['payload']['bytes'])
        self.assertEqual(sha256(self.payload_text.encode('utf-8')), self.manifest['payload']['sha256'])

    def test_thermal_header_and_full_tables(self):
        tolerance = Decimal('0.00000000005')
        self.assertEqual(self.result['temperatures'], list(range(0, 2501, 10)))
        for index, source in enumerate(self.thermal):
            with self.subTest(index=index):
                self.assertEqual(source['natom'], 4)
                self.assertLessEqual(abs(Decimal(str(source['volume'])) - self.volumes[index]), tolerance)
                self.assertEqual(source['num_modes'], source['num_integrated_modes'])
                self.assertEqual(source['num_modes'], 96000)
                self.assertNotIn('band_index', source)
                self.assertNotIn('cutoff_frequency', source)
                self.assertEqual(source['unit'], {'temperature': 'K', 'free_energy': 'kJ/mol',
                                                  'entropy': 'J/K/mol', 'heat_capacity': 'J/K/mol'})
                values = source['thermal_properties']
                self.assertEqual([row['temperature'] for row in values], list(range(0, 2501, 10)))
                self.assertEqual(values[0]['free_energy'], source['zero_point_energy'])
                for item in values:
                    # All printed rows independently retain U = F + T S.
                    internal = item['free_energy'] + item['temperature'] * item['entropy'] / 1000
                    self.assertAlmostEqual(internal, item['energy'], delta=3e-7)

    def test_browser_result_samples_and_interior_fit(self):
        self.assertIs(self.result['synthetic'], False)
        self.assertEqual(self.result['basis'], 'per-input-cell')
        self.assertEqual(self.result['summary']['natom'], 4)
        self.assertEqual(self.result['summary']['volumeCount'], 11)
        self.assertEqual(self.result['summary']['validCount'], 173)
        for temperature in range(0, 2501, 10):
            row = self.rows[temperature]
            for sample, independently in zip(row['samples'], self.total_free_energy(temperature)):
                self.assertAlmostEqual(sample['totalFreeEnergy'], float(independently), delta=2e-12)
        self.assertGreater(self.rows[300]['volume'], self.rows[0]['volume'])
        for temperature in (0, 290, 300, 310, 1000, 1010):
            with self.subTest(temperature=temperature):
                volume, energy, bulk = independent_fit(self.volumes, self.total_free_energy(temperature))
                row = self.rows[temperature]
                self.assertTrue(row['valid'])
                self.assertAlmostEqual(row['volume'], float(volume), delta=2e-10)
                self.assertAlmostEqual(row['gibbsEnergy'], float(energy), delta=2e-12)
                self.assertAlmostEqual(row['bulkModulus'], float(bulk), delta=3e-9)
        self.assertEqual(self.rows[300]['status'], 'interior-minimum-with-warning')
        self.assertGreater(self.rows[300]['fit']['maxResidual'], 1e-4)

    def test_temperature_derivatives_and_boundary_refusal(self):
        q290, q300, q310 = [independent_fit(self.volumes, self.total_free_energy(t)) for t in (290, 300, 310)]
        alpha = (q310[0] - q290[0]) / (20 * q300[0])
        cp = -300 * (q290[1] - 2 * q300[1] + q310[1]) / 100 * JOULES_MOLAR_PER_EV
        self.assertAlmostEqual(self.rows[300]['alphaVolume'], float(alpha), delta=1e-12)
        self.assertAlmostEqual(self.rows[300]['heatCapacity'], float(cp), delta=2e-8)
        self.assertIsNone(self.rows[0]['heatCapacity'])
        boundary = self.rows[2500]
        free_energy = self.total_free_energy(2500)
        self.assertEqual(min(range(len(free_energy)), key=free_energy.__getitem__), len(self.volumes) - 1)
        self.assertEqual(boundary['status'], 'boundary-minimum')
        self.assertIs(boundary['valid'], False)
        for field in ('volume', 'gibbsEnergy', 'bulkModulus', 'alphaVolume', 'heatCapacity'):
            self.assertIsNone(boundary[field])


if __name__ == '__main__':
    unittest.main()
