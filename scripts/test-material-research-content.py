"""Check lesson answers against explicit algebra and the public physics APIs."""
import cmath
import json
import math
from pathlib import Path
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from phonon_modes import run as modes, preset_data
from band_connectivity import run as bands
from phonon_thermo import run as thermo

DATA = json.loads((ROOT / 'dist/data/material-research.json').read_text(encoding='utf8'))
LESSONS = {x['id']: x for x in DATA['lessons']}
EXERCISES = {x['id']: x for x in DATA['exercises']}
R_SI = 1.380649e-23 * 6.02214076e23


def answers(identifier):
    return [step['choices'][step['answer']] for step in EXERCISES[identifier]['steps']]


class MaterialResearchContentTests(unittest.TestCase):
    def test_nine_lessons_nine_exercises_thirty_six_steps_with_valid_links(self):
        self.assertEqual(len(DATA['lessons']), 9)
        self.assertEqual(len(LESSONS), 9)
        self.assertEqual(len(EXERCISES), 9)
        self.assertEqual(sum(len(e['steps']) for e in DATA['exercises']), 36)
        module_ids = {m['id'] for m in DATA['modules']}
        references = {r['id'] for r in DATA['sources']}
        self.assertEqual({e['lesson'] for e in DATA['exercises']}, set(LESSONS))
        self.assertEqual(module_ids, {'modes', 'bands', 'thermo'})
        for lesson in DATA['lessons']:
            self.assertIn(lesson['module'], module_ids)
            self.assertIsInstance(lesson['lab'], dict)
            self.assertTrue(set(lesson['references']) <= references)
        for exercise in DATA['exercises']:
            self.assertEqual(len(exercise['steps']), 4)
            for step in exercise['steps']:
                self.assertIs(type(step['answer']), int)
                self.assertTrue(0 <= step['answer'] < len(step['choices']))
                self.assertEqual(len(set(step['choices'])), len(step['choices']))
                self.assertTrue(step['hint'] and step['explanation'])

    def test_module_routes_actions_and_material_boundaries(self):
        mapping = {m['id']: (m['action'], m['route']) for m in DATA['modules']}
        self.assertEqual(mapping, {'modes': ('phonon_modes', 'phonon-modes'),
                                  'bands': ('band_connectivity', 'band-connectivity'),
                                  'thermo': ('phonon_thermo', 'phonon-thermo')})
        cases = {c['id']: c for c in DATA['cases']}
        self.assertEqual(set(cases), {'silicon', 'gaas', 'square-model'})
        self.assertEqual(cases['square-model']['modules'], ['bands'])
        self.assertIn('二维模型', cases['square-model']['assumption'])
        self.assertIn('教学', cases['silicon']['assumption'])
        for case in cases.values():
            self.assertTrue(set(case['modules']) <= set(mapping))
            self.assertTrue(all(link[1].startswith('#') for link in case['links']))

    def test_unitary_basis_change_preserves_trace_and_multiplicities(self):
        angle = .37
        u = np.array([[math.cos(angle), 1j * math.sin(angle), 0],
                      [1j * math.sin(angle), math.cos(angle), 0], [0, 0, 1]])
        identity, mirror = np.eye(3), np.diag([1, -1, -1])
        before = np.array([np.trace(identity), np.trace(mirror)])
        after = np.array([np.trace(u.conj().T @ d @ u) for d in (identity, mirror)])
        np.testing.assert_allclose(before, after, atol=1e-14)
        self.assertAlmostEqual(np.dot(after, [1, 1]).real / 2, 1)
        self.assertAlmostEqual(np.dot(after, [1, -1]).real / 2, 2)
        self.assertEqual(answers('mode-trace'), ['U† Dsub U', 'Tr Dsub', '保持不变', '恢复完整简并空间再分类'])

    def test_finite_q_periodicity_and_export_are_same_rule_as_exercise(self):
        phase1, phase2 = cmath.exp(2j * math.pi * .5), cmath.exp(2j * math.pi * .5 * 2)
        self.assertAlmostEqual(phase1.real, -1)
        self.assertAlmostEqual(phase2.real, 1)
        data = preset_data('gaas')
        data['phonon'][0]['q-position'] = [.5, 0, 0]
        with self.assertRaisesRegex(ValueError, '不相容'):
            modes({'data': data, 'selected_band': 3, 'supercell': [1, 2, 1]})
        result = modes({'data': data, 'selected_band': 3, 'supercell': [2, 1, 1]})
        atoms = result['frozen']['atoms']
        self.assertEqual(len(atoms), 4)
        np.testing.assert_allclose(atoms[0]['displacement'], -np.array(atoms[2]['displacement']), atol=1e-12)
        self.assertTrue(all(g['classification']['status'] != 'classified' for g in result['modeGroups']))
        self.assertIn("'P 1'", result['exports']['cif'])
        self.assertEqual(answers('mode-supercell')[:3], ['−1', '+1', '[2,1,1]'])
        self.assertTrue(answers('mode-supercell')[3].startswith('不能'))

    def test_mass_weighted_acoustic_example_has_equal_physical_displacements(self):
        vector = np.array([1, 2]) / math.sqrt(5)
        self.assertAlmostEqual(float(vector @ vector), 1)
        physical = vector / np.sqrt([1, 4])
        np.testing.assert_allclose(physical, [1 / math.sqrt(5)] * 2)
        data = preset_data('gaas')
        for atom, mass in zip(data['points'], (1, 4)):
            atom['mass'] = mass
        for i, band in enumerate(data['phonon'][0]['band']):
            weights = vector if i < 3 else np.array([2, -1]) / math.sqrt(5)
            band['eigenvector'] = [[[float(w if axis == i % 3 else 0), 0]
                                   for axis in range(3)] for w in weights]
        result = modes({'data': data, 'selected_band': 0, 'amplitude': .2})
        np.testing.assert_allclose(result['frozen']['atoms'][0]['displacement'], [.2, 0, 0])
        np.testing.assert_allclose(result['frozen']['atoms'][1]['displacement'], [.2, 0, 0])
        self.assertEqual(answers('mode-masses'), ['1', '1/√5', '同向等幅', '错误显示第二个原子位移更大'])

    def test_material_mode_labels_are_complete_subspace_results(self):
        for preset, expected in [('silicon', ['T1u', 'T2g']), ('gaas', ['T2', 'T2'])]:
            result = modes({'preset': preset})
            self.assertTrue(result['synthetic'])
            self.assertEqual([g['classification']['label'] for g in result['modeGroups']], expected)
            self.assertEqual([g['dimension'] for g in result['modeGroups']], [3, 3])
            self.assertTrue(all(g['classification']['invarianceError'] < 1e-8 for g in result['modeGroups']))

    def test_c4v_restriction_inner_product_and_dimension(self):
        chi = np.array([2, 0])
        multiplicities = [int(np.vdot(line, chi) / 2) for line in ([1, 1], [1, -1])]
        self.assertEqual(multiplicities, [1, 1])
        result = bands(LESSONS['band-restriction']['lab'])
        row = next(row for row in result['compatibility']['rows'] if row['parent'] == 'E')
        self.assertEqual(row['multiplicities'], multiplicities)
        self.assertEqual(row['dimensionSum'], sum(multiplicities))
        self.assertEqual(answers('band-branch'), ['2', '1', '1', '2，与原表示一致'])
        self.assertIn('230', ' '.join(result['warnings']))
        self.assertEqual(result['scope'], 'selected-square-lattice-teaching-model')

    def test_mirror_mixing_gap_from_direct_diagonalization(self):
        mirror = np.diag([1, -1])
        mixing = np.array([[0, .2], [.2, 0]])
        np.testing.assert_allclose(mirror @ mixing @ mirror, -mixing)
        eigenvalues = np.linalg.eigvalsh(mixing)
        gap = float(eigenvalues[1] - eigenvalues[0])
        self.assertAlmostEqual(gap, .4)
        result = bands(LESSONS['band-crossing']['lab'])
        self.assertAlmostEqual(result['summary']['perturbationGap'], gap)
        self.assertFalse(result['summary']['mirrorActive'])
        self.assertFalse(result['connections']['active'])
        self.assertEqual(float(answers('band-gap')[2]), gap)
        self.assertEqual(answers('band-gap')[:2], ['等于 0', '简并'])
        self.assertTrue(answers('band-gap')[3].startswith('不能'))

    def test_rashba_kramers_statements_match_endpoint_and_interior(self):
        sy = np.array([[0, -1j], [1j, 0]])
        mirror = 1j * sy
        np.testing.assert_allclose(mirror @ mirror, -np.eye(2))
        result = bands(LESSONS['band-spin']['lab'])
        low, high = (np.array(b['energies']) for b in result['bands'])
        self.assertAlmostEqual(low[0], high[0])
        self.assertAlmostEqual(low[-1], high[-1])
        self.assertGreater(high[len(high) // 2] - low[len(low) // 2], 1)
        broken = bands({'model': 'rashba', 'zeeman': .2})
        self.assertFalse(broken['validation']['timeReversalPresent'])
        self.assertAlmostEqual(broken['bands'][1]['energies'][0] - broken['bands'][0]['energies'][0], .4)
        self.assertEqual(answers('band-kramers')[0], '0')
        self.assertEqual(answers('band-kramers')[2], '+i、−i')
        self.assertTrue(answers('band-kramers')[1].startswith('不必须'))
        self.assertTrue(answers('band-kramers')[3].startswith('不可以'))

    def test_two_atom_high_temperature_answer_is_six_r_not_three_r(self):
        params = {**LESSONS['thermal-oscillator']['lab'], 'theta_e': 1, 'theta_d': 1,
                  'temperatures': [10000]}
        result = thermo(params)
        expected = 6 * R_SI
        self.assertAlmostEqual(expected, 49.88677570891944)
        for series in result['series']:
            self.assertAlmostEqual(series['rows'][0]['heatCapacity'] / expected, 1, places=8)
        self.assertEqual(answers('thermal-count')[:2], ['6', 'kB'])
        self.assertEqual(float(answers('thermal-count')[2].split()[0]), round(expected, 2))
        self.assertEqual(answers('thermal-count')[3], '除以 2')

    def test_grid_weight_and_dos_count_handcalculation(self):
        weights = [1, 3, 4]
        self.assertEqual(sum(weights), 2 ** 3)
        self.assertEqual(weights[2] / sum(weights), .5)
        data = {'mesh': [2, 2, 2], 'natom': 2, 'frequency_unit': 'THz',
                'phonon': [{'weight': w, 'band': [{'frequency': float(i + 1)} for i in range(6)]}
                           for w in weights]}
        result = thermo({'source': 'mesh', 'data': data, 'temperatures': [300]})
        self.assertEqual(result['series'][0]['modeCount'], 6)
        self.assertEqual(result['basis'], 'per-input-cell')
        data.pop('mesh')
        with self.assertRaisesRegex(ValueError, '路径|网格'):
            thermo({'source': 'mesh', 'data': data})
        self.assertEqual(answers('thermal-weights')[:3], ['8', '1/2', '6'])
        self.assertTrue(answers('thermal-weights')[3].startswith('不能'))

    def test_debye_t_cubed_ratio_and_einstein_high_t_equal_count(self):
        result = thermo({'source': 'compare', 'natom': 2, 'theta_e': 500, 'theta_d': 500,
                         'temperatures': [1, 2]})
        debye = result['series'][1]['rows']
        expected1 = 12 * math.pi ** 4 / 5 * 2 * R_SI * (1 / 500) ** 3
        self.assertAlmostEqual(debye[0]['heatCapacity'] / expected1, 1, places=11)
        self.assertAlmostEqual(debye[1]['heatCapacity'] / debye[0]['heatCapacity'], 8, places=11)
        self.assertLess(result['series'][0]['rows'][0]['heatCapacity'], debye[0]['heatCapacity'] * 1e-100)
        self.assertEqual(result['series'][0]['highTemperatureLimit'], result['series'][1]['highTemperatureLimit'])
        self.assertEqual(answers('thermal-debye'), ['ν²', 'T³', '8', '总模式数 3n'])

    def test_lesson_presets_execute_with_public_result_schemas(self):
        for lesson in DATA['lessons']:
            payload = dict(lesson['lab'])
            if lesson['module'] == 'modes':
                result = modes(payload)
                self.assertEqual(result['kind'], 'phonon-modes')
                self.assertTrue(result['frozen']['available'])
                self.assertTrue(result['exports']['poscar'])
            elif lesson['module'] == 'bands':
                result = bands(payload)
                self.assertEqual(len(result['bands']), 2)
                self.assertTrue(result['compatibility']['dimensionConserved'])
            else:
                payload['temperatures'] = [0, 300]
                result = thermo(payload)
                self.assertEqual(result['kind'], 'phonon-thermodynamics')
                self.assertTrue(all(len(series['rows']) == 2 for series in result['series']))
            json.dumps(result, allow_nan=False)

    def test_document_distinguishes_input_cell_export_and_model_scope(self):
        text = (ROOT / 'dist/docs/material-research.md').read_text(encoding='utf8')
        for term in ('per-input-cell', 'poscarAtomOrder', 'O_h', 'T_d', '2|δ|',
                     '36', '32 MiB', '40 次计算', '缺少 ZPE', 'T³'):
            self.assertIn(term, text)


if __name__ == '__main__':
    unittest.main()
