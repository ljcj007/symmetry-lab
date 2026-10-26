"""Thermodynamic identities, asymptotic physics and file normalization checks."""
from copy import deepcopy
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from phonon_thermo import run, R, PLANCK, BOLTZMANN, AVOGADRO, EV, LIGHT


def mesh_data():
    return {'mesh': [2, 2, 2], 'natom': 1, 'nqpoint': 2, 'frequency_unit': 'THz',
            'phonon': [{'q-position': [0.25, 0.25, 0.25], 'weight': 2,
                        'band': [{'frequency': 2}, {'frequency': 3}, {'frequency': 4}]},
                       {'q-position': [0.25, 0.25, -0.25], 'weight': 6,
                        'band': [{'frequency': 4}, {'frequency': 5}, {'frequency': 6}]}]}


def thermal_data():
    return {'unit': {'temperature': 'K', 'free_energy': 'kJ/mol', 'entropy': 'J/K/mol',
                     'heat_capacity': 'J/K/mol'}, 'natom': 2,
            'zero_point_energy': 10, 'num_modes': 600, 'num_integrated_modes': 600,
            'thermal_properties': [{'temperature': 0, 'free_energy': 10, 'entropy': 0, 'heat_capacity': 0},
                                   {'temperature': 300, 'free_energy': 4, 'entropy': 40, 'heat_capacity': 30}]}


def debye_dos(rows=501, theta=400):
    cutoff = theta * BOLTZMANN / (PLANCK * 1e12)
    return {'dos': [[cutoff * i / (rows - 1), 9 / cutoff * (i / (rows - 1)) ** 2]
                    for i in range(rows)]}


class PhononThermoTests(unittest.TestCase):
    def test_zero_temperature_has_zpe_no_entropy_or_heat(self):
        result = run({'natom': 3, 'theta_e': 200, 'theta_d': 400, 'temperatures': [0]})
        for item, zpe in zip(result['series'], (1.5 * 3 * R * 200 / 1000,
                                               9 / 8 * 3 * R * 400 / 1000)):
            row = item['rows'][0]
            self.assertAlmostEqual(row['freeEnergy'], zpe)
            self.assertAlmostEqual(row['internalEnergy'], zpe)
            self.assertEqual(row['entropy'], 0)
            self.assertEqual(row['heatCapacity'], 0)

    def test_einstein_analytic_value(self):
        row = run({'source': 'einstein', 'natom': 1, 'theta_e': 300,
                   'temperatures': [300]})['series'][0]['rows'][0]
        self.assertAlmostEqual(row['heatCapacity'], 3 * R * math.e / (math.e - 1) ** 2, places=11)
        self.assertAlmostEqual(row['internalEnergy'], 3 * R * 300 * (0.5 + 1 / (math.e - 1)) / 1000)

    def test_high_temperature_dulong_petit(self):
        result = run({'natom': 2, 'theta_e': 1, 'theta_d': 1, 'temperatures': [10000]})
        for item in result['series']:
            self.assertAlmostEqual(item['rows'][0]['heatCapacity'] / (6 * R), 1, places=8)

    def test_debye_low_temperature_t_cubed_exact_coefficient(self):
        values = run({'source': 'debye', 'natom': 2, 'theta_d': 500,
                      'temperatures': [0.001, 1, 2]})['series'][0]['rows']
        for row in values:
            exact = 12 * math.pi ** 4 / 5 * 2 * R * (row['temperature'] / 500) ** 3
            self.assertAlmostEqual(row['heatCapacity'] / exact, 1, places=11)
        self.assertAlmostEqual(values[2]['heatCapacity'] / values[1]['heatCapacity'], 8)

    def test_debye_entropy_low_t_equals_cv_over_three(self):
        row = run({'source': 'debye', 'theta_d': 400, 'temperatures': [1]})['series'][0]['rows'][0]
        self.assertAlmostEqual(row['entropy'] * 3 / row['heatCapacity'], 1, places=12)

    def test_einstein_exponential_freezeout_and_extreme_t_finite(self):
        result = run({'source': 'einstein', 'theta_e': 100000, 'temperatures': [1e-300, 1]})
        for row in result['series'][0]['rows']:
            self.assertEqual(row['entropy'], 0)
            self.assertEqual(row['heatCapacity'], 0)
        json.dumps(result, allow_nan=False)

    def test_debye_underflow_temperature_stays_finite(self):
        result = run({'source': 'debye', 'theta_d': 100000, 'temperatures': [1e-300]})
        row = result['series'][0]['rows'][0]
        self.assertEqual(row['entropy'], 0)
        self.assertEqual(row['heatCapacity'], 0)
        json.dumps(result, allow_nan=False)

    def test_free_energy_identity_and_derivatives(self):
        result = run({'temperatures': [299.99, 300, 300.01]})
        for item in result['series']:
            left, row, right = item['rows']
            self.assertAlmostEqual(row['internalEnergy'] - row['freeEnergy'],
                                   row['temperature'] * row['entropy'] / 1000, places=9)
            self.assertAlmostEqual(-(right['freeEnergy'] - left['freeEnergy']) / .02 * 1000,
                                   row['entropy'], places=6)
            self.assertAlmostEqual((right['internalEnergy'] - left['internalEnergy']) / .02 * 1000,
                                   row['heatCapacity'], places=6)

    def test_cell_vs_mole_and_atom_scaling(self):
        one = run({'natom': 1, 'temperatures': [300]})
        two = run({'natom': 2, 'temperatures': [300]})
        for a, b in zip(one['series'], two['series']):
            row, doubled = a['rows'][0], b['rows'][0]
            self.assertAlmostEqual(doubled['heatCapacity'], 2 * row['heatCapacity'])
            self.assertAlmostEqual(row['cell']['internalEnergy'] * EV * AVOGADRO / 1000,
                                   row['internalEnergy'])

    def test_mesh_nonuniform_weighted_zpe_independent_sum(self):
        result = run({'source': 'mesh', 'data': mesh_data(), 'temperatures': [0, 300]})
        exact = (2 * (2 + 3 + 4) + 6 * (4 + 5 + 6)) / 8 * PLANCK * 1e12 * AVOGADRO / 2 / 1000
        self.assertAlmostEqual(result['series'][0]['zeroPointEnergy'], exact)
        self.assertEqual(result['series'][0]['modeCount'], 3)

    def test_mesh_weights_match_independent_einstein_sum(self):
        result = run({'source': 'mesh', 'data': mesh_data(), 'temperatures': [200]})['series'][0]['rows'][0]
        x = [v * PLANCK * 1e12 / BOLTZMANN / 200 for v in [2, 3, 4, 4, 5, 6]]
        expected = R * sum(w * y * y * math.exp(y) / math.expm1(y) ** 2
                           for w, y in zip([.25] * 3 + [.75] * 3, x))
        self.assertAlmostEqual(result['heatCapacity'], expected)

    def test_frequency_units_equivalent(self):
        reference = run({'source': 'mesh', 'data': mesh_data(), 'temperatures': [0, 300]})['series'][0]['rows']
        for unit, factor in [('cm^-1', 1e12 / LIGHT / 100), ('meV', PLANCK * 1e12 / EV * 1000)]:
            data = mesh_data()
            data['frequency_unit'] = unit
            for q in data['phonon']:
                for band in q['band']:
                    band['frequency'] *= factor
            rows = run({'source': 'mesh', 'data': data, 'temperatures': [0, 300]})['series'][0]['rows']
            for actual, expected in zip(rows, reference):
                for field in ('freeEnergy', 'internalEnergy', 'entropy', 'heatCapacity'):
                    self.assertAlmostEqual(actual[field], expected[field], places=10)

    def test_mesh_reject_band_path_weight_or_branch_errors(self):
        for mutate in [lambda d: d.pop('mesh'), lambda d: d['phonon'][0].update(distance=0),
                       lambda d: d['phonon'][0].update(weight=1),
                       lambda d: d['phonon'][0]['band'].pop(),
                       lambda d: d.update(nqpoint=99)]:
            data = mesh_data()
            mutate(data)
            with self.assertRaises(ValueError):
                run({'source': 'mesh', 'data': data})

    def test_mesh_rejects_every_negative_mode_even_with_exclude(self):
        data = mesh_data()
        data['phonon'][0]['band'][0]['frequency'] = -1e-15
        with self.assertRaisesRegex(ValueError, '负频率'):
            run({'source': 'mesh', 'data': data, 'zero_policy': 'exclude'})

    def test_mesh_zero_mode_exclusion_explicit_not_renormalized(self):
        data = mesh_data()
        data['phonon'][0]['band'][0]['frequency'] = 0
        with self.assertRaisesRegex(ValueError, '零频'):
            run({'source': 'mesh', 'data': data})
        result = run({'source': 'mesh', 'data': data, 'zero_policy': 'exclude', 'temperatures': [300]})
        self.assertEqual(result['series'][0]['excludedModeWeight'], .25)
        self.assertEqual(result['series'][0]['modeCount'], 2.75)
        self.assertAlmostEqual(result['series'][0]['highTemperatureLimit'], 2.75 * R)
        self.assertTrue(any('未重归一化' in w for w in result['warnings']))

    def test_unit_missing_or_conflicting_rejected(self):
        data = mesh_data()
        with self.assertRaisesRegex(ValueError, '单位'):
            run({'source': 'mesh', 'data': data, 'frequency_unit': 'meV'})
        data.pop('frequency_unit')
        with self.assertRaisesRegex(ValueError, '单位'):
            run({'source': 'mesh', 'data': data})

    def test_dos_matches_debye_continuum(self):
        actual = run({'source': 'dos', 'natom': 1, 'data': debye_dos(), 'frequency_unit': 'THz',
                      'dos_complete': True, 'dos_normalization': '3n',
                      'temperatures': [0, 100, 400]})['series'][0]
        expected = run({'source': 'debye', 'natom': 1, 'theta_d': 400,
                        'temperatures': [0, 100, 400]})['series'][0]
        for a, b in zip(actual['rows'], expected['rows']):
            for field in ('freeEnergy', 'internalEnergy', 'entropy', 'heatCapacity'):
                self.assertAlmostEqual(a[field], b[field], delta=2e-4)

    def test_dos_reject_unknown_normalization_partial_and_imaginary(self):
        args = {'source': 'dos', 'natom': 1, 'data': debye_dos(51), 'frequency_unit': 'THz',
                'dos_complete': True, 'dos_normalization': '3n', 'temperatures': [300]}
        for key in ('dos_complete', 'dos_normalization'):
            modified = deepcopy(args)
            modified.pop(key)
            with self.assertRaises(ValueError):
                run(modified)
        modified = deepcopy(args)
        modified['data']['dos'][-1][1] *= 100
        with self.assertRaisesRegex(ValueError, '积分'):
            run(modified)
        modified = deepcopy(args)
        modified['data']['dos'][0] = [-1, .1]
        with self.assertRaisesRegex(ValueError, '负频率'):
            run(modified)

    def test_dos_text_and_data_agree_and_pdos_rejected(self):
        data = debye_dos(51)
        args = {'source': 'dos', 'natom': 1, 'frequency_unit': 'THz',
                'dos_complete': True, 'dos_normalization': '3n', 'temperatures': [300]}
        a = run(dict(args, data=data))
        b = run(dict(args, dos_content='# synthetic Debye\n' + '\n'.join(f'{x} {y}' for x, y in data['dos'])))
        self.assertEqual(a, b)
        with self.assertRaisesRegex(ValueError, '两列'):
            run(dict(args, dos_content='1 2 3\n2 3 4'))

    def test_thermal_import_molar_units_and_derived_internal_energy(self):
        result = run({'source': 'thermal', 'data': thermal_data()})
        self.assertEqual(result['series'][0]['rows'][1]['internalEnergy'], 16)
        self.assertEqual(result['series'][0]['zeroPointEnergy'], 10)
        self.assertEqual(result['summary']['natom'], 2)
        self.assertTrue(result['series'][0]['internalEnergyDerived'])

    def test_thermal_does_not_invent_zpe_or_atom_count(self):
        data = thermal_data()
        data.pop('zero_point_energy')
        data.pop('natom')
        result = run({'source': 'thermal', 'data': data, 'natom': 12})
        self.assertIsNone(result['series'][0]['zeroPointEnergy'])
        self.assertIsNone(result['summary']['natom'])

    def test_thermal_excluded_modes_and_band_subset_warnings(self):
        data = thermal_data()
        data.update(num_integrated_modes=597, cutoff_frequency=.1, exclude_gamma_acoustic=True, band_index=[1, 2, 3])
        result = run({'source': 'thermal', 'data': data})
        text = ' '.join(result['warnings'])
        for word in ('597/600', 'cutoff_frequency', 'band_index', 'Γ'):
            self.assertIn(word, text)
        self.assertIsNone(result['summary']['dulongPetitLimit'])

    def test_single_band_phonopy_natom_zero_is_not_a_full_cell_count(self):
        data = thermal_data()
        data.update(natom=0, band_index=[1], num_modes=100, num_integrated_modes=100)
        result = run({'source': 'thermal', 'data': data})
        self.assertIsNone(result['summary']['natom'])
        self.assertIsNone(result['summary']['dulongPetitLimit'])

    def test_import_normalization_does_not_assume_minimal_primitive_cell(self):
        data = thermal_data()
        data['natom'] = 8
        result = run({'source': 'thermal', 'data': data})
        self.assertEqual(result['basis'], 'per-input-cell')
        self.assertEqual(result['summary']['natom'], 8)
        self.assertEqual(result['units']['freeEnergy'], 'kJ/mol input cells')
        self.assertEqual(result['series'][0]['zeroPointEnergy'], 10)

    def test_dos_preserves_synthetic_provenance(self):
        data = debye_dos(51)
        data['synthetic'] = True
        result = run({'source': 'dos', 'data': data, 'natom': 1, 'frequency_unit': 'THz',
                      'dos_complete': True, 'dos_normalization': '3n', 'temperatures': [300]})
        self.assertTrue(result['summary']['synthetic'])

    def test_thermal_reject_missing_or_wrong_units_and_duplicate_t(self):
        for mutate in [lambda d: d.pop('unit'), lambda d: d['unit'].update(free_energy='eV'),
                       lambda d: d['unit'].update(heat_capacity='cal/K/mol'),
                       lambda d: d['thermal_properties'][1].update(temperature=0)]:
            data = thermal_data()
            mutate(data)
            with self.assertRaises(ValueError):
                run({'source': 'thermal', 'data': data})

    def test_yaml_safety_reject_alias_and_nonfinite(self):
        for text in ['a: &a [1]\nb: *a', 'thermal_properties: .nan']:
            with self.assertRaises(ValueError):
                run({'source': 'thermal', 'content': text})

    def test_temperature_and_input_validation(self):
        for args in [{'temperatures': [1, 1]}, {'temperatures': [-1]}, {'t_step': 0},
                     {'t_step': .001}, {'theta_d': 0}, {'natom': True},
                     {'theta_e': float('inf')}, {'source': 'invented'}]:
            with self.assertRaises(ValueError):
                run(args)

    def test_demo_files_are_importable_and_explicitly_synthetic(self):
        for filename, source in [('thermo-mesh-demo.yaml', 'mesh'),
                                 ('thermal-properties-demo.yaml', 'thermal')]:
            text = (ROOT / 'dist/data/examples' / filename).read_text(encoding='utf8')
            self.assertIn('synthetic', text.lower())
            result = run({'source': source, 'content': text, 'temperatures': [0, 300]})
            self.assertTrue(result['summary']['synthetic'])
            json.dumps(result, allow_nan=False)


if __name__ == '__main__':
    unittest.main()
