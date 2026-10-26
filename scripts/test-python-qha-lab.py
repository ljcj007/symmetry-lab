"""Independent analytic QHA checks, derivative units and import rejection cases."""
from copy import deepcopy
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from qha_lab import run

# Defined independently of the production module.
J_PER_EV = 1.602176634e-19
NA = 6.02214076e23
ENERGY_MOLAR = J_PER_EV * NA
PRESSURE_FACTOR = J_PER_EV / 1e-30 / 1e9
K = 0.018
A = 0.003
C = 4e-7
V0 = 40


def analytic_data(temperatures=None):
    """F = k/2 (V - V0 - aT)^2 - c/2 T^2, with known exact minimum."""
    vs = [35 + i for i in range(13)]
    ts = temperatures or [0, 100, 200, 300, 400, 500, 600, 700, 800]
    es = [K / 2 * (v-V0)**2 for v in vs]
    fs = [[-K*A*t*(v-V0) + K/2*A*A*t*t - C/2*t*t for v in vs] for t in ts]
    return {'cellBasis': 'same-input-cell', 'natom': 2,
            'units': {'volume': 'angstrom^3', 'staticEnergy': 'eV/input-cell',
                      'temperature': 'K', 'vibrationalFreeEnergy': 'eV/input-cell'},
            'volumes': vs, 'staticEnergies': es, 'temperatures': ts, 'freeEnergy': fs}


def thermal_data():
    data = analytic_data()
    files = []
    for iv in range(len(data['volumes'])):
        files.append({'natom': 2, 'unit': {'temperature': 'K', 'free_energy': 'kJ/mol',
                                         'entropy': 'J/K/mol', 'heat_capacity': 'J/K/mol'},
                      'num_modes': 600, 'num_integrated_modes': 600,
                      'thermal_properties': [{'temperature': t,
                                              'free_energy': data['freeEnergy'][it][iv] * ENERGY_MOLAR / 1000,
                                              'entropy': 0, 'heat_capacity': 0}
                                             for it, t in enumerate(data['temperatures'])]})
    del data['freeEnergy'], data['temperatures']
    data['thermalFiles'] = files
    return data


class QhaTests(unittest.TestCase):
    def test_exact_equilibrium_and_curvature(self):
        result = run({'source': 'matrix', 'data': analytic_data()})
        self.assertEqual(result['summary']['validCount'], 9)
        for row in result['rows']:
            t = row['temperature']
            self.assertAlmostEqual(row['volume'], V0+A*t, places=11)
            self.assertAlmostEqual(row['gibbsEnergy'], -C/2*t*t, places=12)
            self.assertAlmostEqual(row['bulkModulus'], K*(V0+A*t)*PRESSURE_FACTOR, places=10)

    def test_analytic_thermal_expansion_and_cp_units(self):
        rows = run({'source': 'matrix', 'data': analytic_data()})['rows']
        for r in rows[1:-1]:
            t = r['temperature']
            self.assertAlmostEqual(r['alphaVolume'], A/(V0+A*t), places=13)
            self.assertAlmostEqual(r['heatCapacity'], C*t*ENERGY_MOLAR, places=10)
            self.assertAlmostEqual(r['entropy'], C*t*ENERGY_MOLAR, places=10)

    def test_pressure_energy_conversion_and_compression(self):
        pressure = 5
        p = pressure / PRESSURE_FACTOR
        rows = run({'source': 'matrix', 'data': analytic_data(), 'pressure': pressure})['rows']
        for r in rows:
            t = r['temperature']
            v = V0+A*t-p/K
            g = -C/2*t*t+p*(V0+A*t)-p*p/(2*K)
            self.assertAlmostEqual(r['volume'], v, places=11)
            self.assertAlmostEqual(r['gibbsEnergy'], g, places=11)
            self.assertAlmostEqual(r['bulkModulus'], K*v*PRESSURE_FACTOR, places=10)
        self.assertAlmostEqual(rows[3]['entropy'], (C*300-p*A)*ENERGY_MOLAR, places=9)

    def test_nonuniform_temperature_grid(self):
        rows = run({'source': 'matrix', 'data': analytic_data([0, 17, 80, 210, 400, 800])})['rows']
        for r in rows[1:-1]:
            t = r['temperature']
            self.assertAlmostEqual(r['alphaVolume'], A/(V0+A*t), places=13)
            self.assertAlmostEqual(r['heatCapacity'], C*t*ENERGY_MOLAR, places=10)

    def test_no_endpoint_derivative(self):
        rows = run({'source': 'matrix', 'data': analytic_data()})['rows']
        for r in (rows[0], rows[-1]):
            for name in ('alphaVolume', 'heatCapacity', 'entropy'):
                self.assertIsNone(r[name])
            self.assertEqual(r['derivativeStatus'], 'endpoint-not-reported')

    def test_energy_zero_does_not_change_volume_or_derivatives(self):
        data = analytic_data()
        data['staticEnergies'] = [x-1234.5 for x in data['staticEnergies']]
        rows = run({'source': 'matrix', 'data': data})['rows']
        for r in rows[1:-1]:
            self.assertAlmostEqual(r['volume'], V0+A*r['temperature'], places=8)
            self.assertAlmostEqual(r['heatCapacity'], C*r['temperature']*ENERGY_MOLAR, places=6)

    def test_molar_unit_conversion(self):
        data = analytic_data()
        data['units']['vibrationalFreeEnergy'] = 'kJ/mol-input-cell'
        data['freeEnergy'] = [[f * ENERGY_MOLAR / 1000 for f in r] for r in data['freeEnergy']]
        r = run({'source': 'matrix', 'data': data})['rows'][3]
        self.assertAlmostEqual(r['volume'], V0+A*300, places=10)
        self.assertAlmostEqual(r['heatCapacity'], C*300*ENERGY_MOLAR, places=9)

    def test_five_points_suffice_for_exact_quadratic(self):
        data = analytic_data([0, 100, 200])
        ids = [3, 4, 5, 6, 7]
        data['volumes'] = [data['volumes'][i] for i in ids]
        data['staticEnergies'] = [data['staticEnergies'][i] for i in ids]
        data['freeEnergy'] = [[r[i] for i in ids] for r in data['freeEnergy']]
        for degree in (2, 3):
            r = run({'source': 'matrix', 'data': data, 'fit_degree': degree})['rows'][1]
            self.assertAlmostEqual(r['volume'], 40.3, places=10)

    def test_genuine_cubic_free_energy(self):
        data = analytic_data()
        for it, t in enumerate(data['temperatures']):
            data['freeEnergy'][it] = [f + 0.0004*(v-V0-A*t)**3
                                     for f, v in zip(data['freeEnergy'][it], data['volumes'])]
        rows = run({'source': 'matrix', 'data': data, 'fit_degree': 3})['rows']
        for r in rows[1:-1]:
            self.assertAlmostEqual(r['volume'], V0+A*r['temperature'], places=10)
            self.assertAlmostEqual(r['heatCapacity'], C*r['temperature']*ENERGY_MOLAR, places=9)

    def test_nonuniform_volume_grid(self):
        data = analytic_data()
        vs = [34, 35.2, 37, 38.5, 39.5, 40.2, 41.2, 42.1, 43.5, 45, 47]
        data['volumes'] = vs
        data['staticEnergies'] = [K/2*(v-V0)**2 for v in vs]
        data['freeEnergy'] = [[-K*A*t*(v-V0)+K/2*A*A*t*t-C/2*t*t for v in vs]
                              for t in data['temperatures']]
        rows = run({'source': 'matrix', 'data': data})['rows']
        for r in rows:
            self.assertAlmostEqual(r['volume'], V0+A*r['temperature'], places=10)

    def test_derivatives_do_not_bridge_invalid_temperature(self):
        data = analytic_data()
        data['freeEnergy'][4] = [-v for v in data['volumes']]
        rows = run({'source': 'matrix', 'data': data})['rows']
        self.assertFalse(rows[4]['valid'])
        for r in (rows[3], rows[5]):
            self.assertIsNone(r['heatCapacity'])
            self.assertEqual(r['derivativeStatus'], 'invalid-neighbor')
        self.assertIsNotNone(rows[2]['heatCapacity'])

    def test_duplicate_temperature_grid_rejected(self):
        data = analytic_data()
        data['temperatures'][3] = data['temperatures'][2]
        with self.assertRaises(ValueError):
            run({'source': 'matrix', 'data': data})

    def test_boundary_minimum_is_not_extrapolated(self):
        result = run({'source': 'matrix', 'data': analytic_data(), 'pressure': 100})
        for r in result['rows']:
            self.assertFalse(r['valid'])
            self.assertEqual(r['status'], 'boundary-minimum')
            self.assertIsNone(r['volume'])
            self.assertIsNone(r['heatCapacity'])

    def test_concave_data_does_not_claim_stability(self):
        data = analytic_data()
        data['staticEnergies'] = [-x for x in data['staticEnergies']]
        data['freeEnergy'] = [[0 for _ in data['volumes']] for _ in data['temperatures']]
        self.assertEqual(run({'source': 'matrix', 'data': data})['summary']['validCount'], 0)

    def test_flat_data_does_not_invent_equilibrium(self):
        data = analytic_data()
        data['staticEnergies'] = [0] * len(data['volumes'])
        data['freeEnergy'] = [[0 for _ in data['volumes']] for _ in data['temperatures']]
        self.assertEqual(run({'source': 'matrix', 'data': data})['summary']['validCount'], 0)

    def test_negative_cp_is_preserved_and_warned(self):
        data = analytic_data()
        for it, t in enumerate(data['temperatures']):
            data['freeEnergy'][it] = [f+C*t*t for f in data['freeEnergy'][it]]
        r = run({'source': 'matrix', 'data': data})['rows'][3]
        self.assertLess(r['heatCapacity'], 0)
        self.assertTrue(any('Cp 为负' in w for w in r['warnings']))

    def test_thermal_files_equal_matrix(self):
        data = thermal_data()
        data['thermalFiles'][0] = json.dumps(data['thermalFiles'][0])
        rows = run({'source': 'thermal', 'data': data})['rows']
        self.assertAlmostEqual(rows[3]['volume'], V0+A*300, places=10)
        self.assertAlmostEqual(rows[3]['heatCapacity'], C*300*ENERGY_MOLAR, places=9)

    def test_imported_json_and_yaml_parse(self):
        data = analytic_data()
        r = run({'source': 'matrix', 'content': json.dumps(data)})
        self.assertFalse(r['synthetic'])
        import yaml
        r2 = run({'source': 'matrix', 'content': yaml.safe_dump(data)})
        self.assertEqual(r['summary'], r2['summary'])

    def test_missing_cell_or_units_rejected(self):
        for key in ('cellBasis', 'natom', 'units'):
            data = analytic_data()
            del data[key]
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'source': 'matrix', 'data': data})

    def test_duplicate_or_unsorted_volumes_rejected(self):
        for volume in (39, 38):
            data = analytic_data()
            data['volumes'][5] = volume
            with self.subTest(volume=volume), self.assertRaises(ValueError):
                run({'source': 'matrix', 'data': data})

    def test_too_few_volumes_or_temperatures_rejected(self):
        data = analytic_data()
        for key, count in (('volumes', 4), ('temperatures', 2)):
            obj = deepcopy(data)
            obj[key] = obj[key][:count]
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'source': 'matrix', 'data': obj})

    def test_missing_nan_bool_matrix_rejected(self):
        for value in (None, float('nan'), True):
            data = analytic_data()
            data['freeEnergy'][1][1] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                run({'source': 'matrix', 'data': data})
        data = analytic_data()
        data['freeEnergy'][0].pop()
        with self.assertRaises(ValueError):
            run({'source': 'matrix', 'data': data})

    def test_mismatched_cell_atom_counts_rejected(self):
        for key in ('natoms', 'staticNatoms'):
            data = analytic_data()
            data[key] = [2] * len(data['volumes'])
            data[key][3] = 4
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'source': 'matrix', 'data': data})
        data = thermal_data()
        data['thermalFiles'][4]['natom'] = 4
        with self.assertRaises(ValueError):
            run({'source': 'thermal', 'data': data})

    def test_mismatched_thermal_temperature_grid_rejected(self):
        data = thermal_data()
        data['thermalFiles'][4]['thermal_properties'][3]['temperature'] = 301
        with self.assertRaisesRegex(ValueError, '温度网格'):
            run({'source': 'thermal', 'data': data})

    def test_thermal_units_subset_and_inconsistent_exclusions_rejected(self):
        data = thermal_data()
        mutations = [('unit', {'temperature': 'K', 'free_energy': 'eV'}),
                     ('band_index', [1, 2]), ('num_integrated_modes', 590)]
        for key, value in mutations:
            obj = deepcopy(data)
            obj['thermalFiles'][2][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'source': 'thermal', 'data': obj})

    def test_uniform_exclusion_is_explicitly_warned(self):
        data = thermal_data()
        for f in data['thermalFiles']:
            f['num_integrated_modes'] = 597
        result = run({'source': 'thermal', 'data': data})
        self.assertTrue(any('模式比例' in w for w in result['warnings']))

    def test_thermal_exclusion_boolean_and_full_mode_count(self):
        for key, value in [('exclude_gamma_acoustic', 'true'), ('num_modes', 601)]:
            data = thermal_data()
            for f in data['thermalFiles']:
                f[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'source': 'thermal', 'data': data})

    def test_different_complete_mesh_counts_warn(self):
        data = thermal_data()
        data['thermalFiles'][1]['num_modes'] = 1200
        data['thermalFiles'][1]['num_integrated_modes'] = 1200
        result = run({'source': 'thermal', 'data': data})
        self.assertTrue(any('总模式数不同' in w for w in result['warnings']))

    def test_flat_bottom_competing_wells_are_not_differentiated(self):
        data = analytic_data([0, 100, 200])
        data['volumes'] = list(range(10, 19))
        data['staticEnergies'] = [0]*9
        data['freeEnergy'] = [[2, 1, 0, 0, 1, .02, .02, 1, 2],
                              [2, 1, .01, .01, 1, .01, .01, 1, 2],
                              [2, 1, .02, .02, 1, 0, 0, 1, 2]]
        r = run({'source': 'matrix', 'data': data, 'fit_degree': 2})['rows'][1]
        self.assertTrue(r.get('multipleWells'))
        self.assertIsNone(r['heatCapacity'])
        self.assertIsNone(r['alphaVolume'])
        self.assertEqual(r['derivativeStatus'], 'multiple-wells-not-differentiated')

    def test_preset_is_synthetic_and_zero_gamma_has_no_expansion(self):
        result = run({'gamma': 0})
        self.assertTrue(result['synthetic'])
        self.assertEqual(result['summary']['validCount'], len(result['rows']))
        for r in result['rows'][1:-1]:
            self.assertAlmostEqual(r['volume'], 40, places=9)
            self.assertAlmostEqual(r['alphaVolume'], 0, places=12)
            self.assertGreaterEqual(r['heatCapacity'], 0)

    def test_gamma_sign_controls_expansion_and_zpe_volume_shift(self):
        positive = run({'gamma': 1.5})
        negative = run({'gamma': -1.5})
        self.assertGreater(positive['rows'][0]['volume'], 40)
        self.assertLess(negative['rows'][0]['volume'], 40)
        self.assertGreater(positive['rows'][12]['alphaVolume'], 0)
        self.assertLess(negative['rows'][12]['alphaVolume'], 0)

    def test_preset_equilibrium_converges_with_volume_resolution(self):
        coarse = run({'volume_points': 13, 'fit_degree': 3})['rows'][12]
        fine = run({'volume_points': 41, 'fit_degree': 3})['rows'][12]
        self.assertLess(abs(coarse['volume']-fine['volume']), 0.001)
        self.assertLess(abs(coarse['bulkModulus']-fine['bulkModulus']), 0.03)

    def test_preset_matches_independent_force_balance_and_cp_identity(self):
        r = run({'temperatures': [299, 300, 301], 'volume_points': 61})['rows'][1]
        kb_ev = 1.380649e-23 / J_PER_EV
        # dF_Einstein/dV = -gamma U_vib/V, from dF/d(ln omega)=U.
        lo, hi = 34., 46.
        for _ in range(100):
            v = (lo+hi)/2
            theta = 400*(40/v)**1.5
            u = 6*kb_ev*theta*(0.5+1/math.expm1(theta/300))
            derivative = 100/PRESSURE_FACTOR/40*(v-40)-1.5*u/v
            if derivative > 0:
                hi = v
            else:
                lo = v
        self.assertLess(abs(r['volume']-(lo+hi)/2), 1e-6)
        x = 400*(40/r['volume'])**1.5/300
        cv = 6*1.380649e-23*NA*x*x*math.exp(x)/math.expm1(x)**2
        predicted_cp = cv + 300*r['volume']*r['alphaVolume']**2*r['bulkModulus']/PRESSURE_FACTOR*ENERGY_MOLAR
        self.assertLess(abs(r['heatCapacity']-predicted_cp), 1e-4)
        self.assertGreater(r['heatCapacity'], cv)

    def test_qha_rejects_single_dos_source(self):
        with self.assertRaisesRegex(ValueError, '单份 DOS'):
            run({'source': 'dos'})

    def test_json_export_contains_no_nonfinite_values(self):
        result = run({'pressure': 100})
        json.dumps(result, allow_nan=False)

    def test_demo_files_reproduce_same_physics(self):
        matrix = json.loads((ROOT/'dist/data/examples/qha-multivolume-demo.json').read_text(encoding='utf-8'))
        thermal = json.loads((ROOT/'dist/data/examples/qha-thermal-files-demo.json').read_text(encoding='utf-8'))
        a = run({'source': 'matrix', 'data': matrix})
        b = run({'source': 'thermal', 'data': thermal})
        self.assertTrue(a['synthetic'] and b['synthetic'])
        self.assertEqual(a['summary']['validCount'], len(a['rows']))
        for ra, rb in zip(a['rows'], b['rows']):
            self.assertAlmostEqual(ra['volume'], rb['volume'], places=10)
            self.assertAlmostEqual(ra['gibbsEnergy'], rb['gibbsEnergy'], places=10)


if __name__ == '__main__':
    unittest.main()
