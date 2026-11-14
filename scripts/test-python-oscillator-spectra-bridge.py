"""Independent number-state and real-API checks for oscillator teaching cards.

Node exports the current JS references once. Python constructs operators,
normalizes 4096 explicit Boltzmann weights, and sums their matrix-element
strengths independently. The finite display window is not renormalized.
"""
from pathlib import Path
import cmath
import json
import math
import os
import shutil
import subprocess
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import browser_api

# Stated fixed-chain model parameters and unit conversions, not imported from
# the implementation being checked. The optical projector avoids arbitrary
# eigenvector phases in the independent scattering-weight calculation.
KB = 0.08617333262145
HBAR, EV, AMU = 1.054571817e-34, 1.602176634e-19, 1.66053906660e-27
DEFAULT = dict(lattice=4, massA=23, massB=35.45, springIntra=2,
               springInter=2, basisFraction=.5, scatterA=1, scatterB=1,
               angle=0, selectedQ=1.8, temperature=300, sigma=.5,
               qMin=0, qMax=4, energyMin=-50, energyMax=50,
               energyCutoff=.25, qPoints=81, energyPoints=401, channel='both')


def optical_reference():
    p = DEFAULT
    q = p['selectedQ'] - round(p['selectedQ'] * p['lattice'] / (2 * math.pi)) * (2 * math.pi / p['lattice'])
    trace = 4 * (1 / p['massA'] + 1 / p['massB'])
    determinant = 16 * math.sin(q * p['lattice'] / 2)**2 / (p['massA'] * p['massB'])
    low, high = ((trace - math.sqrt(trace**2 - 4*determinant))/2,
                 (trace + math.sqrt(trace**2 - 4*determinant))/2)
    off = -2 * (1 + cmath.exp(-1j*q*p['lattice'])) / math.sqrt(p['massA']*p['massB'])
    dynamical = np.array([[4/p['massA'], off], [off.conjugate(), 4/p['massB']]])
    projector = (dynamical - low*np.eye(2)) / (high-low)
    energy = HBAR * math.sqrt(EV/(1e-20*AMU)) / (EV*.001) * math.sqrt(high)
    coefficients = np.array([1/math.sqrt(p['massA']),
        cmath.exp(1j*p['selectedQ']*p['basisFraction']*p['lattice'])/math.sqrt(p['massB'])])
    strength = float((coefficients.conj() @ projector @ coefficients).real)
    weight = HBAR**2/(2*AMU*1e-20*EV*.001) * p['selectedQ']**2 * strength / energy
    return energy, weight


EPSILON, W = optical_reference()
CODE = r'''
import * as o from './dist/oscillator-spectra-bridge.js';
const half=o.OSCILLATOR_HALF_RATIO_TEMPERATURE;
const temperatures=[0,10,100,300,half,1500];
const actions=[],matrices=[],vacuum=[],boundaries=[],ensembles=[],requests=[],cold=[];
for(let m=0;m<=5;m++){
 for(const create of [false,true])actions.push({input:{m,create},result:o.oscillatorLadderAction({m,create})});
 vacuum.push(o.oscillatorVacuumReference({m}));
}
for(const create of [false,true])matrices.push(o.oscillatorLadderMatrix({create}));
for(const cutoff of [2,6,10])for(let m=0;m<=cutoff;m++)boundaries.push(o.oscillatorFiniteBoundary({cutoff,m}));
for(const temperature of temperatures){
 for(let m=0;m<=5;m++)for(const create of [false,true]){
  const input={temperature,m,create};ensembles.push({input,result:o.oscillatorScatteringReference(input)});
 }
 requests.push(o.oscillatorSpectraLabRequest({temperature}));
}
for(const x of [720,800]){
 const temperature=o.OSCILLATOR_SPECTRA_REFERENCE.energyMeV/(o.OSCILLATOR_SPECTRA_REFERENCE.kBMeVK*x);
 cold.push({x,result:o.oscillatorScatteringReference({temperature,m:0,create:true}),request:o.oscillatorSpectraLabRequest({temperature})});
}
console.log(JSON.stringify({reference:o.OSCILLATOR_SPECTRA_REFERENCE,half,temperatures,actions,matrices,vacuum,boundaries,ensembles,requests,cold}));
'''


def explicit_ensemble(temperature):
    """Use individual energy levels and a finite sum far beyond the six rows."""
    if temperature == 0:
        probabilities = [1.] + [0.]*4095
    else:
        # Subtract the common vacuum energy before exponentiation. This is an
        # energy-origin shift; no geometric-series formula is used here.
        weights = [math.exp(-m*EPSILON/(KB*temperature)) for m in range(4096)]
        partition = math.fsum(weights)
        probabilities = [weight/partition for weight in weights]
    down = [m*p for m, p in enumerate(probabilities)]
    up = [(m+1)*p for m, p in enumerate(probabilities)]
    return dict(p=probabilities, down=down, up=up,
                mean=math.fsum(down),
                total_up=math.fsum(up),
                tails=[math.fsum(probabilities[6:]), math.fsum(down[6:]), math.fsum(up[6:])])


class OscillatorSpectraIndependentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        node = os.environ.get('NODE') or shutil.which('node')
        if not node:
            raise RuntimeError('Node must be on PATH or supplied through NODE')
        process = subprocess.run([node, '--input-type=module', '-e', CODE],
            cwd=ROOT, text=True, encoding='utf-8', capture_output=True, timeout=45)
        if process.returncode:
            raise RuntimeError(process.stderr or process.stdout)
        cls.js = json.loads(process.stdout)
        cls.ensembles = {t: explicit_ensemble(t) for t in cls.js['temperatures']}

    def close(self, actual, expected, label=''):
        self.assertTrue(math.isclose(actual, expected, rel_tol=3e-12, abs_tol=5e-323),
                        f'{label}: {actual!r} != {expected!r}')

    def test_fixed_optical_energy_and_projector_weight(self):
        self.close(self.js['reference']['energyMeV'], EPSILON, 'optical energy')
        self.close(self.js['reference']['bareWeight'], W, 'coherent optical projector weight')
        self.assertEqual(self.js['reference']['kBMeVK'], KB)
        self.close(self.js['half'], EPSILON/(KB*math.log(2)), 'half-ratio temperature')

    def test_ladder_actions_and_rectangular_window(self):
        for item in self.js['actions']:
            m, create = item['input']['m'], item['input']['create']
            got = item['result']
            allowed = create or m>0
            strength = m+1 if create else m
            self.assertEqual(got['target'], m+(1 if create else -1) if allowed else None)
            self.assertEqual(got['deltaQuanta'], (1 if create else -1) if allowed else None)
            self.assertEqual(got['strength'], strength)
            self.close(got['amplitude'], math.sqrt(strength), 'ladder amplitude')
        for got in self.js['matrices']:
            expected = np.zeros((7,6))
            for m in range(6):
                if got['create']: expected[m+1,m] = math.sqrt(m+1)
                elif m: expected[m-1,m] = math.sqrt(m)
            np.testing.assert_allclose(got['matrix'], expected, atol=1e-15, rtol=1e-15)
            self.assertEqual(got['sourceStates'], list(range(6)))
            self.assertEqual(got['targetStates'], list(range(7)))
        self.assertEqual(self.js['matrices'][1]['matrix'][6][5], math.sqrt(6))

    def test_number_state_vacuum_and_finite_commutators(self):
        b = np.zeros((8,8))
        for m in range(1,8): b[m-1,m] = math.sqrt(m)
        x = b+b.T
        for got in self.js['vacuum']:
            ket = np.eye(8)[:,got['m']]
            mean = float(ket @ x @ ket)
            square = float(np.linalg.norm(x @ ket)**2)
            self.close(got['meanX'], mean)
            self.close(got['meanX2'], square)
            self.close(got['varianceX'], square-mean**2)
            self.close(got['phononNumber'], float(np.linalg.norm(b @ ket)**2))
        for got in self.js['boundaries']:
            n, m = got['cutoff'], got['m']
            annihilation = np.zeros((n+1,n+1))
            for j in range(1,n+1): annihilation[j-1,j] = math.sqrt(j)
            creation = annihilation.T
            commutator = annihilation@creation-creation@annihilation
            np.testing.assert_allclose(got['annihilation'], annihilation, atol=1e-15)
            np.testing.assert_allclose(got['creation'], creation, atol=1e-15)
            expected = np.eye(n+1); expected[n,n] = -n
            np.testing.assert_allclose(commutator, expected, atol=4e-15)
            np.testing.assert_allclose(got['commutatorDiagonal'], np.diag(commutator), atol=4e-15)
            self.close(got['commutator'], float(commutator[m,m]))
            self.close(got['bbdag'], float((annihilation@creation)[m,m]))
            self.close(got['bdagb'], float((creation@annihilation)[m,m]))
            self.assertEqual(got['finiteCreationTarget'], m+1 if m<n else None)
            self.assertEqual(got['infiniteCreationTarget'], m+1)
            self.assertEqual(got['topBoundary'], m==n)
            self.assertAlmostEqual(float(np.trace(commutator)), 0, places=13)

    def test_explicit_4096_state_probabilities_weights_and_pairs(self):
        for item in self.js['ensembles']:
            got, inp = item['result'], item['input']
            t, m, create = inp['temperature'], inp['m'], inp['create']
            expected = self.ensembles[t]
            for j, row in enumerate(got['rows']):
                self.close(row['probability'], expected['p'][j], f'T={t}/p{j}')
                self.assertEqual(row['downStrength'], j)
                self.assertEqual(row['upStrength'], j+1)
                self.close(row['weightedDown'], expected['down'][j])
                self.close(row['weightedUp'], expected['up'][j])
            for key, answer in zip(['probability','annihilation','creation'], expected['tails']):
                self.close(got['tails'][key], answer, f'T={t}/{key} tail')
            for key, values in [('probability',expected['p']),('annihilation',expected['down']),('creation',expected['up'])]:
                self.close(got['visible'][key], math.fsum(values[:6]))
            self.close(got['occupation'], expected['mean'])
            self.close(got['total']['annihilation'], expected['mean'])
            self.close(got['total']['creation'], expected['total_up'])
            self.close(got['selectedProbability'], expected['p'][m])
            self.close(got['selectedWeightedStrength'], expected['p'][m]*(m+1 if create else m))
            allowed = create or m>0
            self.assertEqual(got['action']['target'], m+(1 if create else -1) if allowed else None)
            self.close(got['action']['amplitude'], math.sqrt(m+1 if create else m))
            if allowed:
                self.close(got['action']['transferEnergyMeV'], EPSILON*(1 if create else -1))
            else:
                self.assertIsNone(got['action']['transferEnergyMeV'])
            pair = got['pair']
            self.assertEqual((pair['lower'],pair['upper'],pair['matrixElementSquared']), (m,m+1,m+1))
            self.close(pair['forwardInitialProbability'], expected['p'][m])
            self.close(pair['reverseInitialProbability'], expected['p'][m+1])
            forward, reverse = expected['p'][m]*(m+1), expected['p'][m+1]*(m+1)
            self.close(pair['forward'], forward)
            self.close(pair['reverse'], reverse)
            if forward: self.close(pair['rowRatio'], reverse/forward)
            else: self.assertIsNone(pair['rowRatio'])
            self.close(got['meanX'], 0)
            self.close(got['meanX2'], math.fsum((2*j+1)*p for j,p in enumerate(expected['p'])))
            self.close(got['peaks']['stokes']['weight'], W*expected['total_up'])
            self.close(got['peaks']['antiStokes']['weight'], W*expected['mean'])
        half = next(x['result'] for x in self.js['ensembles'] if x['input']['temperature']==self.js['half'])
        self.assertEqual(half['r'], .5)
        self.assertEqual(half['tails'], {'probability':1/64,'annihilation':7/64,'creation':8/64})
        self.assertEqual(half['occupation'], 1)

    def test_real_api_accepts_only_full_manual_handoffs(self):
        for request in self.js['requests']:
            self.assertEqual(set(request), {'action','module','input'})
            self.assertEqual(request['action'], 'dynamic_scattering_lab')
            self.assertEqual(request['module'], 'scattering')
            payload = request['input']
            self.assertEqual(set(payload), set(DEFAULT), 'No selected m, epsilon, weight, or band field is sent')
            self.assertEqual({k:v for k,v in payload.items() if k!='temperature'}, {k:v for k,v in DEFAULT.items() if k!='temperature'})
            got = browser_api.run(request['action'], payload)
            self.assertEqual(got['parameters'], payload)
            optical = got['data']['selection']['groups'][1]
            expected = self.ensembles[payload['temperature']]
            self.close(optical['energy'], EPSILON)
            self.close(optical['bareWeight'], W)
            self.close(optical['occupation'], expected['mean'])
            self.close(optical['stokesWeight'], W*expected['total_up'])
            self.close(optical['antiStokesWeight'], W*expected['mean'])
        for field in ['m','band','epsilon','bareWeight']:
            with self.assertRaises(ValueError):
                browser_api.run('dynamic_scattering_lab', {**DEFAULT,field:1})

    def test_stated_cold_core_approximation_is_distinct_from_underflow(self):
        for item in self.js['cold']:
            got = item['result']
            self.assertTrue(got['coreColdApproximation'])
            self.assertEqual(got['numericalUnderflow'], item['x']>745)
            result = browser_api.run('dynamic_scattering_lab',item['request']['input'])
            optical = result['data']['selection']['groups'][1]
            self.assertEqual(optical['occupation'],0, 'The existing core intentionally sets n=0 at x>700')
            self.assertEqual(optical['antiStokesWeight'],0)
            if item['x']==720:
                self.assertGreater(got['occupation'],0, 'Representable tiny probabilities are not physical T=0')
                self.close(got['occupation'],math.exp(-720))
            else:
                self.assertEqual(got['occupation'],0)


if __name__ == '__main__':
    unittest.main()
