"""Audit lesson links and independently solve all nine four-step exercises."""
from copy import deepcopy
import json
import math
from pathlib import Path
import sys
import unittest
from urllib.parse import urlparse, parse_qs

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
from distortion_lab import run as distortion, landau_model
from magnon_lab import run as magnons
from qha_lab import run as qha

DATA = json.loads((ROOT/'dist/data/coupled-materials.json').read_text(encoding='utf8'))
LESSONS = {x['id']: x for x in DATA['lessons']}
EXERCISES = {x['id']: x for x in DATA['exercises']}


def answers(identifier):
    return [step['choices'][step['answer']] for step in EXERCISES[identifier]['steps']]


def simple_structure(position):
    return {'lattice': [[4, 0, 0], [0, 4, 0], [0, 0, 4]], 'lengthUnit': 'angstrom',
            'atoms': [{'symbol': 'Si', 'coordinates': position}]}


class CoupledContentTests(unittest.TestCase):
    def test_catalog_integrity_nine_lessons_nine_exercises_thirty_six_steps(self):
        self.assertEqual(len(DATA['lessons']), 9)
        self.assertEqual(len(LESSONS), 9)
        self.assertEqual(len(DATA['exercises']), 9)
        self.assertEqual(len(EXERCISES), 9)
        self.assertEqual(sum(len(e['steps']) for e in DATA['exercises']), 36)
        self.assertEqual({e['lesson'] for e in DATA['exercises']}, set(LESSONS))
        modules = {m['id'] for m in DATA['modules']}
        references = {s['id'] for s in DATA['sources']}
        for lesson in DATA['lessons']:
            self.assertIn(lesson['module'], modules)
            self.assertIsInstance(lesson['lab'], dict)
            self.assertTrue(set(lesson['references']) <= references)
            self.assertTrue(lesson['sections'])
            self.assertTrue(all(s['title'] and s['text'] for s in lesson['sections']))
        for exercise in DATA['exercises']:
            self.assertEqual(len(exercise['steps']), 4)
            for step in exercise['steps']:
                self.assertIs(type(step['answer']), int)
                self.assertTrue(0 <= step['answer'] < len(step['choices']))
                self.assertEqual(len(set(step['choices'])), len(step['choices']))
                self.assertTrue(step['hint'] and step['explanation'])
        for source in DATA['sources']:
            self.assertEqual(urlparse(source['url']).scheme, 'https')

    def test_modules_preserve_existing_pathways_and_material_case_links(self):
        mapping = {m['id']: (m['action'], m['route'], m['pathway']) for m in DATA['modules']}
        self.assertEqual(mapping, {
            'distortion': ('distortion_lab', 'distortion-modes', 'structure-dynamics'),
            'magnons': ('magnon_lab', 'magnon-lab', 'spin'),
            'qha': ('qha_lab', 'qha-lab', 'observables')})
        cases = {c['id']: c for c in DATA['cases']}
        self.assertEqual(set(cases), {'batio3', 'srtio3', 'afm-chain', 'qha-solid'})
        self.assertIn('不使用链参数冒充定量谱', cases['afm-chain']['assumption'])
        self.assertIn('不是某个材料的第一性原理数据', cases['qha-solid']['assumption'])
        self.assertIn('线性', cases['srtio3']['summary'])
        material_ids = {m['id'] for m in json.loads((ROOT/'dist/data/symmetry-materials.json').read_text(encoding='utf8'))['materials']}
        for case in cases.values():
            self.assertTrue(set(case['modules']) <= set(mapping))
            for label, link in case['links']:
                self.assertTrue(label)
                self.assertTrue(link.startswith(('#compute/', '#classroom/', '#atlas/')))
                self.assertNotIn('javascript:', link)
                if link.startswith('#atlas/materials?'):
                    self.assertIn(parse_qs(link.split('?', 1)[1])['material'][0], material_ids)

    def test_distortion_periodic_image_exercise(self):
        result = distortion({'preset': 'custom', 'parent': simple_structure([.98, 0, 0]),
                             'distorted': simple_structure([.02, 0, 0]), 'remove_translation': False,
                             'modes': [{'id': 'x', 'vectors': [[1, 0, 0]]}],
                             'landau': {'resolution': 11}})
        self.assertAlmostEqual(.02-.98, -.96)
        self.assertAlmostEqual((.02-.98+1)*4, .16)
        self.assertAlmostEqual(result['displacement']['reference'][0][0], .16)
        self.assertAlmostEqual(result['decomposition']['amplitudes'][0], .16)
        self.assertEqual(answers('distortion-image'), ['−0.96', '0.04', '0.16 Å', '不能，应比较笛卡尔长度'])

    def test_distortion_projection_and_residual_exercise(self):
        root2 = math.sqrt(2)
        basis = np.array([[1, 1, 0], [1, -1, 0]])/root2
        u = np.array([root2, 0, 0])
        np.testing.assert_allclose(basis @ basis.T, np.eye(2), atol=1e-14)
        np.testing.assert_allclose(basis @ u, [1, 1], atol=1e-14)
        parent = simple_structure([0, 0, 0])
        child = simple_structure([root2/4, 0, 0])
        payload = {'preset': 'custom', 'parent': parent, 'distorted': child, 'remove_translation': False,
                   'modes': [{'id': 'b'+str(i), 'vectors': [row.tolist()]} for i, row in enumerate(basis)],
                   'landau': {'resolution': 11}}
        full = distortion(payload)
        np.testing.assert_allclose(full['decomposition']['amplitudes'], [1, 1], atol=1e-14)
        self.assertLess(full['decomposition']['residualNorm'], 1e-14)
        partial = distortion({**payload, 'modes': payload['modes'][:1]})
        self.assertAlmostEqual(partial['decomposition']['residualNorm'], 1)
        self.assertEqual(answers('distortion-amplitudes'), ['0', '1', '1', '1'])

    def test_landau_mixed_minimum_exercise(self):
        result = landau_model({'a1': -1, 'a2': -1, 'b1': 1, 'b2': 1, 'c': 1, 'resolution': 11})
        x, y = np.linalg.solve([[2, 1], [1, 2]], [1, 1])
        self.assertAlmostEqual(x, 1/3)
        self.assertAlmostEqual(y, 1/3)
        self.assertAlmostEqual(-x-y+x*x+y*y+x*y, -1/3)
        self.assertAlmostEqual(result['globalMinimumEnergy'], -1/3)
        self.assertEqual(len(result['globalMinima']), 4)
        for point in result['globalMinima']:
            self.assertAlmostEqual(point['q1']**2, 1/3)
            self.assertAlmostEqual(point['q2']**2, 1/3)
        self.assertEqual(answers('landau-coexist'), ['2x+y=1', '1/3', '−1/3', '混合解'])

    def test_magnon_gap_and_bandwidth_exercise(self):
        payload = {'model': 'fm', 'exchange': 1, 'spin': 1, 'anisotropy': 1.2, 'field': .1}
        center, edge = magnons({**payload, 'q': 0}), magnons({**payload, 'q': 1})
        self.assertAlmostEqual(center['selection']['energy'], .5)
        self.assertAlmostEqual(edge['selection']['energy'], 4.5)
        self.assertAlmostEqual(edge['selection']['energy']-center['selection']['energy'], 4)
        self.assertEqual(answers('magnon-gap'), ['1', '0.5 meV', '4.5 meV', '4 meV'])

    def test_magnon_two_polarizations_exercise(self):
        payload = {'model': 'afm', 'exchange': 1, 'spin': 1, 'anisotropy': 1.25, 'field': .2, 'q': 0}
        low, high = magnons(payload), magnons({**payload, 'branch': 1})
        self.assertAlmostEqual(1.25**2-1, .5625)
        self.assertAlmostEqual(low['selection']['energy'], 1.3)
        self.assertAlmostEqual(high['selection']['energy'], 1.7)
        self.assertAlmostEqual(high['selection']['energy']-low['selection']['energy'], .4)
        self.assertTrue(low['stability']['classicalGroundState'])
        self.assertEqual(answers('magnon-afm'), ['0.5625', '1.5 meV', '1.3 与 1.7 meV', '0.4 meV'])

    def test_magnon_low_q_exercise(self):
        k = 1e-4
        fm = magnons({'model': 'fm', 'anisotropy': 1, 'field': 0, 'q': k/math.pi})
        afm = magnons({'model': 'afm', 'anisotropy': 1, 'field': 0, 'q': k/math.pi})
        self.assertAlmostEqual(fm['selection']['energy']/(k*k), 1, places=7)
        self.assertAlmostEqual(afm['selection']['energy']/(2*abs(k)), 1, places=7)
        self.assertEqual(answers('magnon-low-q'), ['(qa)²/2', 'JS(qa)²', '|sin qa|', '2JS|qa|'])

    def test_pressure_exercise_against_volume_minimization(self):
        zero, positive = qha({'gamma': 0}), qha({'gamma': 0, 'pressure': 1})
        self.assertGreater(42/160.2176634, 40/160.2176634)
        self.assertTrue(all(p['volume'] < z['volume'] for p, z in zip(positive['rows'], zero['rows'])))
        with self.assertRaises(ValueError):
            qha({'source': 'dos'})
        self.assertEqual(answers('qha-pressure'), ['pV', 'V₂ 对应项', 'V₁', '不能，需要体积依赖数据'])

    def test_thermal_derivative_exercise_with_independent_exact_free_energy(self):
        v0, a, b, k = 40, .0001, 4e-7, .02
        temperatures = [0, 100, 200, 300, 400]
        volumes = list(range(36, 46))
        static = [.5*k*(v-v0)**2 for v in volumes]
        free = [[.5*k*(v-v0*(1+a*t))**2-.5*b*t*t-e for v, e in zip(volumes, static)] for t in temperatures]
        data = {'cellBasis': 'same-input-cell', 'natom': 2, 'volumes': volumes, 'staticEnergies': static,
                'temperatures': temperatures, 'freeEnergy': free,
                'units': {'volume': 'angstrom^3', 'staticEnergy': 'eV/input-cell', 'temperature': 'K', 'vibrationalFreeEnergy': 'eV/input-cell'}}
        r = qha({'source': 'matrix', 'data': data})
        molar = 1.602176634e-19*6.02214076e23
        for row in r['rows'][1:-1]:
            t = row['temperature']
            self.assertAlmostEqual(row['volume'], v0*(1+a*t), places=10)
            self.assertAlmostEqual(row['alphaVolume'], a/(1+a*t), places=12)
            self.assertAlmostEqual(row['heatCapacity'], b*t*molar, places=9)
        self.assertEqual(answers('qha-derivatives'), ['V₀a', 'a/(1+aT)', '−b', 'bT'])

    def test_qha_boundary_and_endpoint_exercise(self):
        r = qha({'pressure': 100})
        self.assertEqual(r['summary']['validCount'], 0)
        self.assertTrue(all(row['volume'] is None and row['heatCapacity'] is None for row in r['rows']))
        normal = qha({})
        for row in (normal['rows'][0], normal['rows'][-1]):
            self.assertIsNone(row['heatCapacity'])
            self.assertIsNone(row['alphaVolume'])
        self.assertEqual(answers('qha-boundary'), ['没有', '扩大体积范围并补算', '不能', '不报告并说明原因'])

    def test_all_nine_lesson_presets_execute(self):
        calculators = {'distortion': distortion, 'magnons': magnons, 'qha': qha}
        for lesson in DATA['lessons']:
            with self.subTest(lesson=lesson['id']):
                result = calculators[lesson['module']](deepcopy(lesson['lab']))
                self.assertTrue(result['synthetic'])
                self.assertTrue(result['warnings'])
                json.dumps(result, allow_nan=False)
                if lesson['module'] == 'distortion':
                    self.assertLess(result['decomposition']['relativeResidual'], 1e-10)
                    self.assertTrue(result['reconstruction']['exports']['poscar'])
                elif lesson['module'] == 'magnons':
                    self.assertLess(result['validation']['eigenvectorResidual'], 1e-10)
                    if lesson['id'] == 'magnon-stability':
                        self.assertFalse(result['animation']['available'])
                else:
                    self.assertGreater(result['summary']['validCount'], 0)


if __name__ == '__main__':
    unittest.main()
