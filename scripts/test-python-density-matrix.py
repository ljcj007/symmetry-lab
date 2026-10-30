"""Independent analytic, unitary and CPTP checks for the spin density module."""
from pathlib import Path
import json
import math
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
import density_matrix_lab as d


def complex_matrix(record):
    return np.array(record['re']) + 1j*np.array(record['im'])


class DensityMatrixTests(unittest.TestCase):
    def test_resonant_rabi_probability_and_bloch_orientation(self):
        r = d.calculate({'drive':1.7,'duration':4,'points':41})
        for s in r['stateSnapshots']:
            t = s['time']
            np.testing.assert_allclose(s['blochA'],[0,-math.sin(1.7*t),math.cos(1.7*t)],atol=2e-13)
            self.assertAlmostEqual(s['upProbabilityA'],math.cos(1.7*t/2)**2,places=12)
            self.assertAlmostEqual(s['purity'],1,places=12)

    def test_detuned_rabi_analytic_population(self):
        drive, detuning = .7,1.2
        frequency = math.hypot(drive,detuning)
        r = d.calculate({'drive':drive,'detuning':detuning,'duration':7,'points':35})
        for s in r['stateSnapshots']:
            expected = 1-drive**2/frequency**2*math.sin(frequency*s['time']/2)**2
            self.assertAlmostEqual(s['upProbabilityA'],expected,places=12)

    def test_amplitude_damping_exact_population_and_coherence(self):
        r = d.calculate({'drive':0,'initialState':'plus_x','gamma1':.4,'duration':7,'points':51})
        for s in r['stateSnapshots']:
            t = s['time']
            expected = np.array([[.5*np.exp(-.4*t),.5*np.exp(-.2*t)],
                                 [.5*np.exp(-.2*t),1-.5*np.exp(-.4*t)]])
            np.testing.assert_allclose(complex_matrix(s['rho']),expected,atol=2e-13)
        self.assertEqual(r['rates']['T1'],2.5)
        self.assertEqual(r['rates']['T2'],5)

    def test_pure_dephasing_preserves_population_and_has_correct_rate(self):
        r = d.calculate({'drive':0,'detuning':.8,'initialState':'plus_x','gammaPhi':.3,
                         'duration':8,'points':61})
        for s in r['stateSnapshots']:
            t=s['time']; coherence=.5*np.exp((-.3-.8j)*t)
            np.testing.assert_allclose(complex_matrix(s['rho']),[[.5,coherence],[coherence.conjugate(),.5]],atol=2e-13)
        self.assertAlmostEqual(r['rates']['T2'],1/.3)

    def test_combined_rates_analytic_free_spin(self):
        r=d.calculate({'drive':0,'initialState':'plus_x','gamma1':.8,'gammaPhi':.3,'duration':3,'points':21})
        for s in r['stateSnapshots']:
            self.assertAlmostEqual(s['blochA'][0],math.exp(-.7*s['time']),places=12)
        self.assertAlmostEqual(r['rates']['gamma2'],.7)

    def test_bell_and_classical_mixture_have_same_marginals_different_entanglement(self):
        base={'experiment':'pair','drive':0,'duration':0,'points':2}
        bell=d.calculate({**base,'initialState':'singlet'})['stateSnapshots'][0]
        classical=d.calculate({**base,'initialState':'classical'})['stateSnapshots'][0]
        for s in (bell,classical):
            np.testing.assert_allclose(complex_matrix(s['rhoA']),np.eye(2)/2,atol=1e-14)
            np.testing.assert_allclose(complex_matrix(s['rhoB']),np.eye(2)/2,atol=1e-14)
            self.assertAlmostEqual(s['entropyA'],1)
        self.assertAlmostEqual(bell['negativity'],.5)
        self.assertAlmostEqual(classical['negativity'],0)
        self.assertAlmostEqual(bell['purity'],1)
        self.assertAlmostEqual(classical['purity'],.5)

    def test_exchange_entanglement_matches_two_state_solution(self):
        r=d.calculate({'experiment':'pair','initialState':'antiparallel','drive':0,'exchange':.9,
                       'duration':5,'points':51})
        for s in r['stateSnapshots']:
            angle=.9*s['time']/2
            psi=np.array([0,math.cos(angle),-1j*math.sin(angle),0])
            np.testing.assert_allclose(complex_matrix(s['rho']),np.outer(psi,psi.conjugate()),atol=3e-13)
            self.assertAlmostEqual(s['negativity'],abs(math.sin(2*angle))/2,places=12)

    def test_singlet_invariant_under_exchange_and_uniform_rotation(self):
        r=d.calculate({'experiment':'pair','initialState':'singlet','drive':1.8,'detuning':-.8,
                       'exchange':2.4,'duration':8,'points':71})
        initial=complex_matrix(r['initialDensityMatrix'])
        for s in r['stateSnapshots']:
            np.testing.assert_allclose(complex_matrix(s['rho']),initial,atol=3e-13)

    def test_local_dephasing_bell_negativity_decay(self):
        r=d.calculate({'experiment':'pair','initialState':'singlet','drive':0,'gammaPhi':.3,
                       'duration':7,'points':41})
        for s in r['stateSnapshots']:
            self.assertAlmostEqual(s['negativity'],.5*math.exp(-.6*s['time']),places=12)
            self.assertAlmostEqual(s['entropyA'],1,places=12)

    def test_partial_trace_against_explicit_indices_and_swap(self):
        rng=np.random.default_rng(715)
        x=rng.normal(size=(4,4))+1j*rng.normal(size=(4,4));rho=x@x.conj().T;rho/=np.trace(rho)
        a,b=d.partial_traces(rho)
        aa=np.array([[sum(rho[2*i+j,2*k+j] for j in range(2)) for k in range(2)] for i in range(2)])
        bb=np.array([[sum(rho[2*j+i,2*j+k] for j in range(2)) for k in range(2)] for i in range(2)])
        np.testing.assert_allclose(a,aa);np.testing.assert_allclose(b,bb)

    def test_thermal_state_and_zero_temperature_ground_projector(self):
        r=d.calculate({'experiment':'pair','initialState':'thermal','drive':0,'exchange':2,
                       'thermalScale':0,'duration':3,'points':11})
        self.assertAlmostEqual(r['stateSnapshots'][0]['negativity'],.5)
        p=d.parameters({'initialState':'thermal','drive':0,'detuning':2,'thermalScale':1})
        h,_,_,_=d.operators(p);rho=d.initial_density(p,h)
        self.assertAlmostEqual(float(rho[0,0].real),1/(1+math.exp(2)))
        p=d.parameters({'initialState':'thermal','drive':0,'detuning':0,'thermalScale':0})
        h,_,_,_=d.operators(p)
        np.testing.assert_allclose(d.initial_density(p,h),np.eye(2)/2)

    def test_vectorized_generator_matches_direct_matrix_equation(self):
        p=d.parameters({'experiment':'pair','drive':.7,'exchange':1.1,'gradient':.4,'gamma1':.2,'gammaPhi':.3})
        h,cs,_,_=d.operators(p)
        rng=np.random.default_rng(62);x=rng.normal(size=(4,4))+1j*rng.normal(size=(4,4))
        rho=x@x.conj().T;rho/=np.trace(rho)
        expected=-1j*(h@rho-rho@h)
        for c in cs:
            q=c.conj().T@c;expected+=c@rho@c.conj().T-.5*(q@rho+rho@q)
        actual=(d.liouvillian(h,cs)@rho.reshape(-1,order='F')).reshape(4,4,order='F')
        np.testing.assert_allclose(actual,expected,atol=1e-14)

    def test_matrix_exponential_handles_defective_jordan_block(self):
        # A repeated eigenvalue with one eigenvector defeats naive eig inversion.
        a=np.array([[-2.,3.],[0.,-2.]])*4
        expected=np.exp(-8)*np.array([[1.,12.],[0.,1.]])
        np.testing.assert_allclose(d.matrix_exponential(a),expected,atol=1e-16)

    def test_unitary_pair_matches_independent_hamiltonian_diagonalization(self):
        p=d.parameters({'experiment':'pair','initialState':'plus_x','drive':.4,'detuning':-.6,
                        'exchange':1.1,'gradient':.8,'duration':5,'points':23})
        h,_,_,_=d.operators(p);e,v=np.linalg.eigh(h);rho=d.initial_density(p,h)
        for s in d.calculate(p)['stateSnapshots']:
            unitary=(v*np.exp(-1j*e*s['time']))@v.conj().T
            np.testing.assert_allclose(complex_matrix(s['rho']),unitary@rho@unitary.conj().T,atol=2e-13)

    def test_noisy_extreme_parameters_and_initial_states_remain_physical(self):
        for experiment,initial in [('single','plus_x'),('single','thermal'),('pair','singlet'),('pair','thermal')]:
            r=d.calculate({'experiment':experiment,'initialState':initial,'drive':10,'detuning':-10,
                           'exchange':10,'gradient':-10,'gamma1':5,'gammaPhi':5,'duration':50,'points':101})
            for s in r['stateSnapshots']:
                rho=complex_matrix(s['rho'])
                self.assertLess(abs(np.trace(rho)-1),2e-11)
                self.assertGreaterEqual(np.linalg.eigvalsh(rho)[0],-2e-12)
                self.assertLessEqual(s['purity'],1+2e-11)
            json.dumps(r,allow_nan=False)

    def test_invalid_inputs_are_rejected(self):
        for payload in [[],{'experiment':'many'},{'initialState':'singlet'},
                        {'gamma1':-1},{'gammaPhi':float('nan')},{'points':2.5},
                        {'drive':True},{'thermalScale':-1},{'duration':100}]:
            with self.assertRaises(ValueError,msg=str(payload)):
                d.calculate(payload)

    def test_presets_and_content_references(self):
        path=ROOT/'dist/data/density-content.json'
        if not path.exists():
            self.skipTest('Content generation not yet complete')
        c=json.loads(path.read_text(encoding='utf-8'))
        presets={p['id']:p for p in c['module']['presets']}
        source_ids={s['id'] for s in c['sources']}
        for p in presets.values():
            r=d.calculate(p['input']);json.dumps(r,allow_nan=False)
            self.assertEqual(r['module'],'density')
        for lesson in c['lessons']:
            self.assertIn(lesson['preset'],presets)
            self.assertTrue(set(lesson['references'])<=source_ids)
        for exercise in c['exercises']:
            self.assertEqual(len(exercise['steps']),4)
            for step in exercise['steps']:
                self.assertIn(step['answer'],range(len(step['choices'])))


if __name__=='__main__':
    unittest.main(verbosity=2)
