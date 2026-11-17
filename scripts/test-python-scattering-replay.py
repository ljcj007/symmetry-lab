"""Independent atomic sums, gauge/subspace checks and strict old-core replay."""
from pathlib import Path
from copy import deepcopy
import cmath
import gzip
import hashlib
import importlib.util
import json
import math
import struct
import sys
import types
import unittest
from unittest.mock import patch
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
import dynamic_scattering_lab as d
from browser_api import run

spec = importlib.util.spec_from_file_location('scattering_references', ROOT/'scripts/build-scattering-replay-reference.py')
references = importlib.util.module_from_spec(spec)
spec.loader.exec_module(references)
BASELINE_SHA = '6e4aba71fdbf966feb15cdfe586b49538eb46ad8f513f3109783bb690b07547c'
baseline_source = gzip.decompress((ROOT/'scripts/fixtures/scattering-source-baseline.py.gz').read_bytes())
assert hashlib.sha256(baseline_source).hexdigest() == BASELINE_SHA
baseline = types.ModuleType('immutable_pre_amplitude_replay')
exec(compile(baseline_source.decode('utf8'), '<hash-verified-scattering-baseline>', 'exec'), baseline.__dict__)
COUNTS = {'legacyInputs': 0, 'legacyComparisons': 0, 'numericLeaves': 0, 'floatLeavesBitwise': 0, 'otherLeaves': 0}


def strict_equal(old, new, path='result'):
    assert type(old) is type(new), path+': type'
    if isinstance(old, dict):
        assert list(old) == list(new), path+': keys/order'
        for key in old:
            strict_equal(old[key], new[key], path+'/'+key)
    elif isinstance(old, list):
        assert len(old) == len(new), path+': length'
        for i, (x, y) in enumerate(zip(old, new)):
            strict_equal(x, y, path+'/'+str(i))
    elif type(old) is float:
        assert struct.pack('!d', old) == struct.pack('!d', new), path+': float bits'
        COUNTS['numericLeaves'] += 1
        COUNTS['floatLeavesBitwise'] += 1
    else:
        assert old == new, path+': value'
        COUNTS['numericLeaves' if type(old) is int else 'otherLeaves'] += 1


def z(pair):
    return complex(*pair)


def independent_terms(p, parallel, vector):
    tau = (0., p['lattice']*p['basisFraction'])
    masses = (p['massA'], p['massB'])
    scatter = (p['scatterA'], p['scatterB'])
    return [parallel*scatter[i]*cmath.exp(1j*parallel*tau[i])*vector[i].conjugate()/math.sqrt(masses[i]) for i in range(2)]


class ScatteringReplay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = references.inputs()
        cls.results = {name: run('dynamic_scattering_lab', payload) for name, payload in cls.inputs}

    def close(self, a, b, scale=1.):
        self.assertLessEqual(abs(a-b), 3e-12*max(scale, abs(a), abs(b), 1.))

    def check_ledger(self, item, p, parallel, vector):
        terms = independent_terms(p, parallel, vector)
        for i in range(2):
            self.close(z(item['eigenvector'][i]), vector[i])
            self.close(z(item['physicalDisplacement'][i]), vector[i]/math.sqrt((p['massA'],p['massB'])[i]))
            self.close(z(item['conjugatedDisplacement'][i]), vector[i].conjugate()/math.sqrt((p['massA'],p['massB'])[i]))
            self.close(z(item['terms'][i]), terms[i])
        self.assertEqual(item['partialSums'][0], [0., 0.])
        self.close(z(item['partialSums'][1]), terms[0])
        self.close(z(item['partialSums'][2]), sum(terms))
        self.close(z(item['sum']), sum(terms))
        self.close(item['strength'], abs(sum(terms))**2)
        squares = [abs(a)**2 for a in terms]
        for a,b in zip(item['individualStrengths'], squares):
            self.close(a,b)
        self.close(item['incoherentStrength'], sum(squares))
        self.close(item['interference'], 2*(terms[0]*terms[1].conjugate()).real)
        self.close(item['strength'], item['incoherentStrength']+item['interference'])
        if parallel == 0:
            self.assertIsNone(item['normalizedStrength'])
        elif abs(parallel) > 1e-150:
            self.close(item['normalizedStrength'], abs(sum(terms))**2/parallel**2)

    def test_01_all_atomic_factors_and_paths(self):
        for name, result in self.results.items():
            with self.subTest(case=name):
                replay = result['data']['amplitudeReplay'];p = result['parameters']
                self.assertEqual(replay['schema'], 'symmetry-lab-scattering-amplitude-replay-1')
                self.assertEqual(replay['parameters'], p)
                momentum = replay['momentum'];parallel = momentum['QParallel']
                expected_cos = math.cos(p['angle']*math.pi/180)
                if abs(expected_cos) < 1e-14:expected_cos = 0.
                self.close(parallel, p['selectedQ']*expected_cos)
                self.close(momentum['reconstructedQParallel'], momentum['reducedQ']+momentum['reciprocalOrder']*2*math.pi/p['lattice'])
                for atom in replay['atoms']:
                    i=atom['index'];mass=(p['massA'],p['massB'])[i];tau=(0.,p['lattice']*p['basisFraction'])[i]
                    self.close(atom['mass'],mass);self.close(atom['sqrtMass'],math.sqrt(mass))
                    self.close(atom['basisPosition'],tau)
                    self.close(z(atom['structurePhase']),cmath.exp(1j*parallel*tau))
                    self.close(z(atom['coefficient']),parallel*(p['scatterA'],p['scatterB'])[i]*cmath.exp(1j*parallel*tau)/math.sqrt(mass))
                for item, vector in zip(replay['branches'], result['data']['selection']['eigenvectors']):
                    self.check_ledger(item,p,parallel,list(map(z,vector)))
                self.assertTrue(replay['checks']['passed'])
                json.dumps(replay, allow_nan=False)

    def test_02_group_strength_and_existing_thermal_weights(self):
        for name,result in self.results.items():
            replay=result['data']['amplitudeReplay'];p=result['parameters']
            for old,group in zip(result['data']['selection']['groups'],replay['groups']):
                for key in old:self.assertEqual(group[key],old[key])
                members=[replay['branches'][i] for i in group['branches']]
                self.close(group['reconstructedStrength'],sum(b['strength'] for b in members))
                self.close(group['amplitudeStrength'],sum(b['strength'] for b in members))
                if group['excluded']:
                    self.assertIsNone(group['energyDenominator']);self.assertIsNone(group['occupation'])
                    self.assertIsNone(group['stokesMultiplier']);self.assertIsNone(group['antiStokesMultiplier'])
                    self.assertEqual(group['stokesWeight'],0);self.assertEqual(group['antiStokesWeight'],0)
                else:
                    self.close(group['energyDenominator'],1/group['energy'])
                    thermal=d.KB_MEV_K*p['temperature']
                    n=1/math.expm1(group['energy']/thermal) if thermal and group['energy']/thermal<700 else 0.
                    self.close(group['occupation'],n)
                    bare=d.RECOIL_FACTOR*group['amplitudeStrength']/group['energy']
                    self.close(group['bareWeight'],bare)
                    self.close(group['stokesWeight'],bare*(n+1));self.close(group['antiStokesWeight'],bare*n)

    def test_03_gauge_is_not_a_relative_atomic_phase(self):
        for result in self.results.values():
            replay=result['data']['amplitudeReplay'];p=result['parameters'];parallel=replay['momentum']['QParallel']
            for item in replay['branches']:
                vector=list(map(z,item['eigenvector']))
                self.check_ledger(item['gauge'],p,parallel,[1j*v for v in vector])
                self.close(z(item['gauge']['sum']),-1j*z(item['sum']))
                self.close(item['gauge']['strength'],item['strength'])
                self.check_ledger(item['relativePhase'],p,parallel,[vector[0],1j*vector[1]])
                overlap=abs(sum(a.conjugate()*b for a,b in zip(vector,[vector[0],1j*vector[1]])))**2
                self.close(item['relativePhase']['overlapMagnitudeSquared'],overlap)
                self.assertEqual(item['relativePhase']['commonPhaseEquivalent'],abs(1.-overlap)<=1e-12)
        default=self.results['default']['data']['amplitudeReplay']['branches'][0]
        self.assertGreater(default['relativePhase']['eigenResidual'],1e-4)
        self.assertGreater(abs(default['relativePhase']['strength']-default['strength']),1e-4)
        self.assertFalse(default['relativePhase']['commonPhaseEquivalent'])
        self.assertTrue(all(b['relativePhase']['commonPhaseEquivalent'] for b in self.results['degenerate-edge']['data']['amplitudeReplay']['branches']))

    def test_04_degenerate_subspace_invariance_and_arbitrary_unitaries(self):
        replay=self.results['degenerate-edge']['data']['amplitudeReplay'];mix=replay['degenerateMixing']
        self.assertIsNotNone(mix)
        self.close(mix['changedGroupStrength'],mix['originalGroupStrength'])
        self.assertTrue(any(abs(a-b)>1e-4 for a,b in zip(mix['originalStrengths'],mix['changedStrengths'])))
        old=[[z(x) for x in v] for v in mix['originalEigenvectors']]
        unitary=[[z(x) for x in row] for row in mix['unitary']]
        for j,item in enumerate(mix['changedBranches']):
            vector=[sum(old[k][i]*unitary[k][j] for k in range(2)) for i in range(2)]
            self.check_ledger(item,replay['parameters'],replay['momentum']['QParallel'],vector)
        # Independent continuous U(2) rotations, beyond the one displayed case.
        p=replay['parameters'];Q=replay['momentum']['QParallel']
        for theta in (.13,.67,1.21):
            for phi in (.31,1.91):
                c,s=math.cos(theta),math.sin(theta);phase=cmath.exp(1j*phi)
                U=[[c,-s*phase.conjugate()],[s*phase,c]]
                amplitudes=[]
                for j in range(2):
                    v=[sum(old[k][i]*U[k][j] for k in range(2)) for i in range(2)]
                    amplitudes.append(sum(independent_terms(p,Q,v)))
                self.close(sum(abs(a)**2 for a in amplitudes),mix['originalGroupStrength'])
        self.assertIsNone(self.results['default']['data']['amplitudeReplay']['degenerateMixing'])
        near=run('dynamic_scattering_lab',references.regression_inputs()[0][1])['data']['amplitudeReplay']
        self.assertEqual(near['groups'][0]['degeneracy'],2)
        self.assertGreater(near['groups'][0]['energySpread'],near['mixingEnergyTolerance'])
        self.assertLess(near['groups'][0]['energySpread'],near['energyGroupingTolerance'])
        self.assertIsNone(near['degenerateMixing'])

    def test_05_gamma_extinction_zone_normalization_and_zero_projection(self):
        gamma=self.results['unequal-gamma']['data']['amplitudeReplay']
        u=list(map(z,gamma['branches'][0]['physicalDisplacement']))
        self.close(u[0],u[1]);self.assertEqual(gamma['branches'][0]['energy'],0.)
        self.assertTrue(gamma['groups'][0]['excluded']);self.assertIsNone(gamma['groups'][0]['energyDenominator'])
        self.assertGreater(gamma['branches'][0]['strength'],0.)
        even=self.results['folded-even']['data']['amplitudeReplay'];odd=self.results['folded-odd']['data']['amplitudeReplay']
        self.close(even['momentum']['reducedQ'],odd['momentum']['reducedQ'])
        self.assertLess(even['branches'][1]['normalizedStrength'],1e-26)
        self.assertLess(odd['branches'][0]['normalizedStrength'],1e-26)
        self.close(even['branches'][0]['normalizedStrength'],odd['branches'][1]['normalizedStrength'])
        self.assertGreater(abs(even['branches'][0]['strength']-odd['branches'][1]['strength']),.1)
        zero=self.results['zero-projection']['data']['amplitudeReplay']
        self.assertEqual(zero['momentum']['QParallel'],0.)
        for item in zero['branches']:
            self.assertEqual(item['strength'],0.);self.assertIsNone(item['normalizedStrength'])

    def test_06_no_extra_eigensolve_and_no_mutation(self):
        payload=dict(self.inputs[0][1]);payload['qPoints']=31
        with patch.object(d.np.linalg,'eigh',wraps=d.np.linalg.eigh) as solve:
            d.calculate(payload)
            self.assertEqual(solve.call_count,32)
        p=d.parameters(payload);grid=np.linspace(-60,60,121)
        point=d._point(p,p['selectedQ'],grid)
        q=point['reducedQ'];_,vectors,matrix=d.chain_modes(p,q)
        before=(vectors.copy(),matrix.copy(),deepcopy(point))
        with patch.object(d.np.linalg,'eigh',side_effect=AssertionError('Replay must not solve')):
            d.amplitude_replay(p,point,vectors,matrix)
        np.testing.assert_array_equal(vectors,before[0]);np.testing.assert_array_equal(matrix,before[1])
        for key in point:
            if isinstance(point[key],np.ndarray):np.testing.assert_array_equal(before[2][key],point[key])
            else:self.assertEqual(before[2][key],point[key])

    def test_07_strict_flag_and_extreme_finite_inputs(self):
        for bad in (0,1,None,'true',[],{},2.5):
            with self.subTest(flag=bad),self.assertRaises(ValueError):d.calculate({'includeAmplitudeReplay':bad})
        for change in ({'selectedQ':5e-324},{'selectedQ':-8.,'angle':180.,'scatterA':-20.,'scatterB':20.,'massA':1.,'massB':1.,'temperature':1500.}, {'temperature':0.}, {'temperature':5e-324}):
            result=d.calculate({'qPoints':31,'energyPoints':101,'includeAmplitudeReplay':True,**change})
            json.dumps(result,allow_nan=False)
            self.assertTrue(result['data']['amplitudeReplay']['checks']['passed'])

    def test_08_strict_same_host_old_results_absent_false_and_true(self):
        requests=[{k:v for k,v in payload.items() if k!='includeAmplitudeReplay'} for _,payload in self.inputs]
        requests += [{'qPoints':31,'energyPoints':101,**change} for change in
                     ({'temperature':0.,'channel':'antiStokes'},{'selectedQ':-2.3,'angle':121.},
                      {'scatterA':0.,'scatterB':0.},{'springIntra':.02,'springInter':20.,'massA':250.,'massB':1.},
                      {'selectedQ':5e-324,'temperature':5e-324})]
        for payload in requests:
            old=baseline.calculate(deepcopy(payload));COUNTS['legacyInputs']+=1
            for flag in (None,False,True):
                data=deepcopy(payload)
                if flag is not None:data['includeAmplitudeReplay']=flag
                new=d.calculate(data)
                if flag is True:
                    self.assertIn('amplitudeReplay',new['data']);new['data'].pop('amplitudeReplay')
                else:self.assertNotIn('amplitudeReplay',new['data'])
                strict_equal(old,new);COUNTS['legacyComparisons']+=1
                self.assertEqual(payload,{k:v for k,v in data.items() if k!='includeAmplitudeReplay'})


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(ScatteringReplay)
    outcome=unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'mode':'strict-same-host-immutable-source','baselineCommit':'d0bf5e826adf60ab6c122cc502f20f81289b43f7','baselineSourceSHA256':BASELINE_SHA,**COUNTS}))
    raise SystemExit(0 if outcome.wasSuccessful() else 1)
