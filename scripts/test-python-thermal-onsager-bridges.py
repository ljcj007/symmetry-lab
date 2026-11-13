"""Independent ensembles/dual-pair checks for the bounded learning bridges.

The finite teaching modules are imported through Node. Answers come from an
explicit high-precision canonical ensemble, energy variance, independent
linear algebra, and the real browser_api dispatcher, rather than UI fixtures.
"""
from decimal import Decimal, localcontext
from pathlib import Path
import json
import math
import shutil
import subprocess
import sys
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import browser_api

NODE = shutil.which('node') or str(Path(
    'C:/Users/ljcj007/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'))
KB, NA, EV, H = 1.380649e-23, 6.02214076e23, 1.602176634e-19, 6.62607015e-34
EPSILON = 400 * KB
CODE = r'''
import * as t from './dist/thermal-learning-bridge.js';
import * as o from './dist/onsager-learning-bridge.js';
const thermal=[],groups=[],slopes=[],requests=[],responses=[],transforms=[],dissipation=[],kelvin=[];
for(const temperature of [0,Number.MIN_VALUE,1e-6,.37,1,2,10,20,100,400,400/Math.LN2,1000])for(const reference of ['absolute','shifted']){
 const input={temperature,reference};thermal.push({input,result:t.thermalOscillatorReference(input)});
}
for(const temperature of [0,100,400,400/Math.LN2,1000])for(const reference of ['absolute','shifted'])for(const degeneracy of [1,3])for(const natom of [1,2]){
 const input={temperature,reference,degeneracy,natom};groups.push({input,result:t.thermalBridgeReference(input)});
}
for(const reference of ['absolute','shifted'])for(const natom of [1,2]){
 const input={reference,natom};slopes.push({input,result:t.thermalSlopeReference(input)});
}
for(const temperature of [0,100,400/Math.LN2,1000])for(const natom of [1,2]){
 const input={temperature,natom};requests.push({input,result:t.thermalBridgeLabRequest(input)});
}
for(const preset of ['onsager-hall','onsager-domain','onsager-mirror','onsager-thermo','onsager-mixed','onsager-broken','onsager-active']){
 const request=o.onsagerBridgeLabRequest({preset});responses.push({request,result:o.onsagerResponseReference(request.input)});
}
for(const model of ['hall','thermo','mixed'])for(const [field,magnetization]of [[-.6,-.3],[.6,-.3],[0,0]]){
 const input={model,field,magnetization,forceX:.7,forceY:-.4};const result=o.onsagerResponseReference(input);responses.push({request:{action:'reciprocity_lab',input:result.input},result});
}
for(const kind of ['space','dual','force-only'])for(const angleDegrees of [-37,30])for(const scale of [.5,1,2,3]){
 const input={kind,angleDegrees,scale};transforms.push({input,result:o.onsagerTransformReference(input)});
}
for(const model of ['active','hall'])for(const angleDegrees of [-180,-90,-45,0,30,90])for(const amplitude of [.25,2]){
 const input={model,angleDegrees,amplitude,forcePreset:'custom'};dissipation.push({input,result:o.onsagerDissipationReference(input)});
}
for(const model of ['active','hall'])for(const forcePreset of ['axis','negative']){
 const input={model,forcePreset};dissipation.push({input,result:o.onsagerDissipationReference(input)});
}
for(const T0 of [.1,2,10])kelvin.push(o.onsagerKelvinReference(T0));
console.log(JSON.stringify({thermal,groups,slopes,requests,responses,transforms,dissipation,kelvin}));
'''


def ensemble(temperature, shifted=False):
    """Normalize enumerated weights, then sum probabilities and energy moments."""
    if temperature == 0 or 400 / temperature > 10000:
        return dict(p=[1, 0, 0, 0, 0, 0], tail=0, mean=0, variance=0,
                    u=0 if shifted else .5, f=0 if shifted else .5, s=0, cv=0)
    with localcontext() as ctx:
        # Enough digits to retain p0's entropy even when q is below 1e-170.
        ctx.prec = max(80, int(400 / temperature / math.log(10)) + 80)
        x = Decimal(400) / Decimal(str(temperature))
        q = (-x).exp()
        weights, weight = [], Decimal(1)
        while True:
            weights.append(weight)
            # Include every displayed row and at least the first tail row,
            # even when their probabilities are below the normalization
            # threshold. Otherwise a precise tiny tail would be called zero.
            if len(weights) >= 7 and weight < Decimal('1e-70'):
                break
            weight *= q
        z = sum(weights)
        probabilities = [weight / z for weight in weights]
        mean = sum(Decimal(n) * p for n, p in enumerate(probabilities))
        second = sum(Decimal(n*n) * p for n, p in enumerate(probabilities))
        variance = second - mean*mean
        entropy = -sum(p*p.ln() for p in probabilities if p)
        offset = Decimal(0) if shifted else Decimal('.5')
        free = -(((-x*offset).exp()*z).ln())/x
        first_six = probabilities[:6] + [Decimal(0)] * max(0, 6-len(probabilities))
        return dict(p=list(map(float, first_six)), tail=float(sum(probabilities[6:])),
                    mean=float(mean), variance=float(variance), u=float(mean+offset),
                    f=float(free), s=float(entropy), cv=float(x*x*variance))


class ThermalOnsagerBridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run([NODE, '--input-type=module', '-e', CODE], cwd=ROOT,
                                check=True, capture_output=True, text=True, encoding='utf-8')
        cls.data = json.loads(result.stdout)

    def near(self, actual, expected, rtol=8e-13, atol=1e-300):
        np.testing.assert_allclose(actual, expected, rtol=rtol, atol=atol)

    def test_number_probabilities_energy_variance_and_zero_point(self):
        for row in self.data['thermal']:
            with self.subTest(**row['input']):
                p, r = row['input'], row['result']
                expected = ensemble(p['temperature'], p['reference'] == 'shifted')
                self.near([v['probability'] for v in r['levels']], expected['p'])
                self.near(r['tailProbability'], expected['tail'])
                self.near(r['occupation'], expected['mean'])
                self.near(r['internalEnergy']/EPSILON, expected['u'])
                self.near(r['freeEnergy']/EPSILON, expected['f'])
                self.near(r['entropy']/KB, expected['s'])
                self.near(r['heatCapacityOverKB'], expected['cv'])
                self.near(r['energyVariance']/(EPSILON*EPSILON), expected['variance'])
                self.near(r['visibleProbability']+r['tailProbability'], 1)
                # nu is ordinary frequency; omega is 2pi*nu and hbar*omega=h*nu.
                nu = r['frequency']['THz']*1e12
                self.near(H*nu, EPSILON)
                self.near((H/(2*math.pi))*(2*math.pi*nu), EPSILON)
        for row in self.data['groups']:
            p, r = row['input'], row['result']
            e = ensemble(p['temperature'], p['reference'] == 'shifted')
            self.assertEqual(r['local']['modes'], p['degeneracy'])
            self.assertEqual(r['complete']['modes'], 3*p['natom'])
            self.near(r['local']['occupation'], p['degeneracy']*e['mean'])
            self.near(r['complete']['heatCapacityMolar'], 3*p['natom']*KB*NA*e['cv'])
            self.near(r['complete']['energyMolar'], 3*p['natom']*EPSILON*NA*e['u']/1000)
            self.near(r['complete']['heatCapacityPerMoleAtoms'], 3*KB*NA*e['cv'])

    def test_real_thermal_api_and_finite_difference_units(self):
        for row in self.data['requests']:
            p, request = row['input'], row['result']
            self.assertEqual(request['action'], 'phonon_thermo')
            self.assertEqual(request['input']['t_min'], p['temperature'])
            self.assertEqual(request['input']['t_max'], p['temperature'])
            result = browser_api.run(request['action'], request['input'])
            actual = result['series'][0]['rows'][0]
            e = ensemble(p['temperature'])
            count = 3*p['natom']
            for key, value in [('freeEnergy', count*EPSILON*NA*e['f']/1000),
                               ('internalEnergy', count*EPSILON*NA*e['u']/1000),
                               ('entropy', count*KB*NA*e['s']),
                               ('heatCapacity', count*KB*NA*e['cv'])]:
                self.near(actual[key], value)
        for row in self.data['slopes']:
            p, r = row['input'], row['result']
            count = 3*p['natom']
            values = [ensemble(T, p['reference'] == 'shifted') for T in [399,400,401]]
            for actual, expected in zip(r['rows'], values):
                self.near(actual['energyMolar'], count*EPSILON*NA*expected['u']/1000)
            slope = count*EPSILON*NA*(values[2]['u']-values[0]['u'])/2
            self.near(r['centralSlope'], slope, rtol=3e-12)
            self.near(r['analyticHeatCapacity'], count*KB*NA*values[1]['cv'])
            # This is an approximation, not equality with the derivative.
            self.assertLess(abs(r['centralSlope']/r['analyticHeatCapacity']-1), 6e-7)

    def test_real_response_api_reversal_and_passivity(self):
        for row in self.data['responses']:
            request, r = row['request'], row['result']
            actual = browser_api.run(request['action'], request['input'])
            self.near(r['L'], actual['plot']['matrix'], atol=2e-14)
            self.near(r['LR'], actual['plot']['reversed'], atol=2e-14)
            self.near(r['J'], actual['plot']['flux'], atol=2e-14)
            self.near(r['entropy'], actual['checks']['entropy'], atol=2e-14)
            self.near(r['selectedResidual'], actual['summary'][0]['value'], atol=2e-14)
            self.near(r['canonicalResidual'], actual['summary'][1]['value'], atol=2e-14)
            L = np.array(r['L'])
            self.near(r['eigenvalues'], np.linalg.eigvalsh((L+L.T)/2), atol=2e-14)
            X = np.array(r['X'])
            self.near(r['entropy'], X@((L+L.T)/2)@X, atol=2e-14)
            E = np.diag([1,-1] if r['input']['model']=='mixed' else [1,1])
            self.near(r['E'], E, atol=0)
            if r['input']['violation'] == 0:
                self.near(L, E@np.array(r['fullReverse']).T@E, atol=2e-14)
        for row in self.data['dissipation']:
            r = row['result']; X = np.array(r['X'])
            L = np.array([[1,2],[2,1.4]]) if row['input']['model']=='active' else np.array([[1.2,.36],[-.36,1.2]])
            S, A = (L+L.T)/2, (L-L.T)/2
            self.near(r['J'], L@X, atol=2e-14)
            self.near(r['entropy'], X@S@X, atol=2e-14)
            self.near(r['antisymmetricEntropy'], X@A@X, atol=2e-14)
            self.near(r['eigenvalues'], np.linalg.eigvalsh(S), atol=2e-14)
            if row['input'].get('forcePreset')=='negative' and row['input']['model']=='active':
                self.near(r['entropy'], -1.6, atol=2e-14)
                self.assertLess(r['eigenvalues'][0], 0)

    def test_dual_pair_metric_space_and_kelvin_conventions(self):
        for row in self.data['transforms']:
            p, r = row['input'], row['result']; s = p['scale']
            if p['kind']=='space':
                L=np.array([[1.2,.36],[-.36,1.2]]); X=np.array([.7,-.4])
                angle=math.radians(p['angleDegrees'])
                Q=np.array([[math.cos(angle),-math.sin(angle)],[math.sin(angle),math.cos(angle)]])
                lp, xp, jp, metric=Q@L@Q.T,Q@X,Q@(L@X),np.eye(2)
            else:
                L=np.array([[1,.25],[.25,1.4]]); X=np.array([1,-.4])
                if p['kind']=='dual':
                    C=np.diag([s,1/s]); lp=C@L@C.T; xp=np.linalg.solve(C.T,X); jp=C@(L@X);metric=np.eye(2)
                else:
                    C=np.diag([1,s]); lp=L@np.linalg.inv(C);xp=C@X;jp=L@X;metric=np.linalg.inv(C)
            self.near(r['LPrime'],lp,atol=2e-14)
            self.near(r['XPrime'],xp,atol=2e-14)
            self.near(r['JPrime'],jp,atol=2e-14)
            self.near(r['entropyMetric'],metric,atol=2e-14)
            self.near(r['correctEntropy'],jp@metric@xp,atol=2e-14)
            self.near(r['correctEntropy'],X@L@X,atol=2e-14)
            self.near(r['responseResidual'],0,atol=2e-14)
            if p['kind']=='force-only' and s==2:
                self.near(r['correctEntropy'],1.024,atol=2e-14)
                self.near(r['naiveEntropy'],1.148,atol=2e-14)
        for r in self.data['kelvin']:
            L=np.array([[1,.25],[.25,1.4]])
            self.near(r['openFlux'],L@r['openForces'],atol=2e-14)
            self.near(r['openFlux'][0],0,atol=2e-14)
            self.near(r['Pi'],r['isothermalFlux'][1]/r['isothermalFlux'][0])
            self.near(r['Pi'],r['T0']*r['S'])


if __name__=='__main__':unittest.main()
