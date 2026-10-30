"""Analytic Lehmann limits, full-Fock resolvents, and basis-invariant weights."""
import json
import math
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
import manybody_spectra_lab as m


def jw(orbitals, index):
    z = np.diag([1., -1.])
    c = np.array([[0., 1.], [0., 0.]])
    result = np.array([[1.]])
    for i in reversed(range(orbitals)):
        result = np.kron(result, c if i == index else z if i < index else np.eye(2))
    return result


def independent_fock(p):
    n = p['sites']
    c = [jw(2*n, i) for i in range(2*n)]
    number = [op.T@op for op in c]
    h = np.zeros((2**(2*n), 2**(2*n)))
    edges = [(i, i+1) for i in range(n-1)]
    if p['boundary'] == 'periodic' and n > 2:
        edges.append((n-1, 0))
    for i, j in edges:
        for off in (0, n):
            h -= p['hopping']*(c[i+off].T@c[j+off] + c[j+off].T@c[i+off])
    for i in range(n):
        h += p['interactionU']*number[i]@number[i+n]
        h += (-1)**i*p['alternatingPotential']/2*(number[i]+number[i+n])
    mask = (1 << n)-1
    sector = [state for state in range(2**(2*n))
              if (state & mask).bit_count() == p['nUp'] and (state >> n).bit_count() == p['nDown']]
    energies, vectors = np.linalg.eigh(h[np.ix_(sector, sector)])
    gs = vectors[:, energies-energies[0] < 1e-9]
    initial = np.zeros((len(h), gs.shape[1]))
    initial[sector] = gs
    return h, c, number, initial, energies[0]


class ManybodyTests(unittest.TestCase):
    def run_model(self, **kwargs):
        result = m.calculate(kwargs)
        self.assertTrue(result['checks']['passed'], result['checks'])
        json.dumps(result, allow_nan=False)
        return result

    def test_noninteracting_local_dimer_has_two_half_weight_poles(self):
        r = self.run_model(interactionU=0, chemicalPotential=0)
        self.assertEqual(len(r['transitions']), 2)
        for line, expected_energy in zip(r['transitions'], (-1., 1.)):
            self.assertAlmostEqual(line['energy'], expected_energy, places=12)
            self.assertAlmostEqual(line['weight'], .5, places=12)

    def test_momentum_phase_selects_bonding_and_antibonding(self):
        for q, kind, energy in [(0., 'removal', -1.), (1., 'addition', 1.)]:
            r = self.run_model(interactionU=0, chemicalPotential=0, probe='momentum', q=q)
            self.assertEqual(len(r['transitions']), 1)
            line = r['transitions'][0]
            self.assertEqual(line['kind'], kind)
            self.assertAlmostEqual(line['energy'], energy, places=12)
            self.assertAlmostEqual(line['weight'], 1., places=12)

    def test_atomic_symmetric_dimer_has_hubbard_poles(self):
        r = self.run_model(hopping=0, interactionU=4, chemicalPotential=2)
        self.assertEqual(r['initial']['degeneracy'], 2)
        for line, energy in zip(r['transitions'], (-2., 2.)):
            self.assertAlmostEqual(line['energy'], energy, places=12)
            self.assertAlmostEqual(line['weight'], .5, places=12)

    def test_chemical_potential_only_shifts_all_single_particle_poles(self):
        a = self.run_model(chemicalPotential=1.1)
        b = self.run_model(chemicalPotential=3.7)
        self.assertEqual(a['initial'], b['initial'])
        for old, new in zip(a['transitions'], b['transitions']):
            self.assertAlmostEqual(new['energy']-old['energy'], -2.6, places=12)
            self.assertAlmostEqual(new['weight'], old['weight'], places=12)

    def test_dimer_spin_peak_and_weight_match_analytic_singlet(self):
        for u in (0., 4., 15.):
            r = self.run_model(experiment='response', responseKind='spin', interactionU=u,
                               probe='momentum', q=1)
            self.assertEqual(len(r['transitions']), 1)
            line = r['transitions'][0]
            d = math.sqrt(u*u+16)
            self.assertAlmostEqual(line['energy'], (d-u)/2, places=11)
            self.assertAlmostEqual(line['weight'], (1+u/d)/4, places=12)

    def test_dimer_charge_peak_is_different_from_spin_gap(self):
        for u in (0., 4., 15.):
            r = self.run_model(experiment='response', responseKind='charge', interactionU=u,
                               probe='momentum', q=1)
            self.assertEqual(len(r['transitions']), 1)
            line = r['transitions'][0]
            d = math.sqrt(u*u+16)
            self.assertAlmostEqual(line['energy'], (u+d)/2, places=11)
            self.assertAlmostEqual(line['weight'], 1-u/d, places=12)

    def test_fixed_number_and_fixed_sz_uniform_connected_spectra_vanish(self):
        for kind in ('spin', 'charge'):
            r = self.run_model(experiment='response', responseKind=kind, sites=4,
                               nUp=2, nDown=1, probe='momentum', q=0, boundary='periodic')
            self.assertEqual(r['transitions'], [])
            self.assertAlmostEqual(r['sumRules']['totalWeight'], 0., places=25)

    def test_degenerate_connected_response_retains_zero_energy_variance(self):
        r = self.run_model(experiment='response', responseKind='spin', hopping=0,
                           probe='momentum', q=1)
        self.assertEqual(r['initial']['degeneracy'], 2)
        self.assertAlmostEqual(r['sumRules']['zeroEnergyWeight'], .5, places=12)
        self.assertAlmostEqual(r['sumRules']['inelasticWeight'], 0., places=12)
        self.assertTrue(r['transitions'][0]['zeroEnergy'])

    def test_full_fock_resolvent_independently_matches_spectral_green(self):
        r = self.run_model(sites=3, nUp=2, nDown=1, boundary='periodic',
                           hopping=.7, interactionU=3.1, alternatingPotential=.6,
                           spin='down', probe='momentum', q=.37, chemicalPotential=.9)
        p = r['parameters']
        h, c, _, initial, e0 = independent_fock(p)
        op = sum(np.exp(-1j*math.pi*p['q']*j)/math.sqrt(3)*c[j+3] for j in range(3))
        identity = np.eye(len(h))
        for index in (51, 200, 451):
            z = r['spectrum']['energy'][index] + 1j*p['eta']
            added, removed = op.conj().T@initial, op@initial
            plus = np.trace(added.conj().T@np.linalg.solve((z+e0+p['chemicalPotential'])*identity-h, added))
            minus = np.trace(removed.conj().T@np.linalg.solve((z-e0+p['chemicalPotential'])*identity+h, removed))
            expected = (plus+minus)/initial.shape[1]
            actual = r['spectrum']['greenReal'][index] + 1j*r['spectrum']['greenImag'][index]
            self.assertAlmostEqual(abs(expected-actual), 0., places=10)

    def test_full_fock_connected_charge_variance_and_moment(self):
        r = self.run_model(experiment='response', responseKind='charge', sites=3,
                           nUp=1, nDown=1, hopping=.9, interactionU=2.3,
                           alternatingPotential=.7, probe='momentum', q=.61)
        p = r['parameters']
        h, _, num, initial, e0 = independent_fock(p)
        op = sum(np.exp(-1j*math.pi*p['q']*j)/math.sqrt(3)*(num[j]+num[j+3]) for j in range(3))
        mean = np.trace(initial.T@op@initial)/initial.shape[1]
        acted = (op-mean*np.eye(len(h)))@initial
        equal_time = np.trace(acted.conj().T@acted).real/initial.shape[1]
        first = np.trace(acted.conj().T@(h-e0*np.eye(len(h)))@acted).real/initial.shape[1]
        self.assertAlmostEqual(r['sumRules']['totalWeight'], equal_time, places=11)
        self.assertAlmostEqual(r['sumRules']['firstMomentEV'], first, places=11)

    def test_degenerate_trace_invariant_under_both_basis_rotations(self):
        rng = np.random.default_rng(41)
        energies = np.array([0., 0., 1., 1., 1.])
        acted = rng.normal(size=(5, 3)) + 1j*rng.normal(size=(5, 3))
        vf = np.eye(5, dtype=complex)
        vi, _ = np.linalg.qr(rng.normal(size=(3, 3)) + 1j*rng.normal(size=(3, 3)))
        for group in ([0, 1], [2, 3, 4]):
            rot, _ = np.linalg.qr(rng.normal(size=(len(group), len(group))) + 1j*rng.normal(size=(len(group), len(group))))
            vf[np.ix_(group, group)] = rot
        old = m.grouped_weights(energies, np.eye(5), acted)
        new = m.grouped_weights(energies, vf, acted@vi)
        np.testing.assert_allclose([x[1] for x in old], [x[1] for x in new], atol=1e-12)

    def test_vacuum_filled_and_spin_polarized_sectors_respect_pauli_sum_rule(self):
        for nup, ndown in ((0, 0), (2, 2), (2, 0), (0, 2)):
            for spin in ('up', 'down'):
                r = self.run_model(nUp=nup, nDown=ndown, spin=spin)
                sr = r['sumRules']
                self.assertAlmostEqual(sr['additionWeight']+sr['removalWeight'], 1., places=12)
                expected = (nup if spin == 'up' else ndown)/2
                self.assertAlmostEqual(sr['removalWeight'], expected, places=12)

    def test_grid_window_and_broadening_do_not_renormalize_weights(self):
        a = self.run_model(eta=.02)
        b = self.run_model(eta=.3)
        self.assertEqual(a['transitions'], b['transitions'])
        self.assertLess(a['sumRules']['windowCapturedWeight'], 1.)
        self.assertLess(b['sumRules']['windowCapturedWeight'], 1.)
        self.assertGreater(b['sumRules']['windowMissingLorentzianWeight'], 0.)
        self.assertTrue(np.all(np.array(a['spectrum']['greenImag']) <= 0))

    def test_mu_and_selected_spin_do_not_change_fixed_number_response(self):
        a = self.run_model(experiment='response', chemicalPotential=-10, spin='up')
        b = self.run_model(experiment='response', chemicalPotential=20, spin='down')
        self.assertEqual(a['transitions'], b['transitions'])
        self.assertEqual(a['spectrum'], b['spectrum'])

    def test_peak_conditional_state_differs_from_degenerate_group_average(self):
        r = self.run_model(hopping=0, nUp=0, nDown=0, probe='local', site=0)
        self.assertEqual(len(r['transitions']), 1)
        line = r['transitions'][0]
        self.assertEqual(line['finalDegeneracy'], 2)
        np.testing.assert_allclose(line['finalObservables']['density'], [1., 0.], atol=1e-13)
        np.testing.assert_allclose(line['finalGroupAverageObservables']['density'], [.5, .5], atol=1e-13)

    def test_every_preset_and_formula_link_uses_actual_results(self):
        content = json.loads((ROOT/'dist/data/manybody-content.json').read_text(encoding='utf-8'))
        self.assertEqual(len(content['module']['presets']), 6)
        defaults = {field['key']: field['default'] for field in content['module']['fields']}
        for preset in content['module']['presets']:
            self.assertEqual(set(preset['input']), set(defaults))
            r = self.run_model(**preset['input'])
            plots = {plot['id'] for plot in r['plots']}
            self.assertEqual(len(plots), len(r['plots']))
            for link in r['formulaLinks']:
                self.assertIn(link['plot'], plots)
                self.assertTrue(link['formula'] and link['meaning'] and link['values'])
            for line in r['transitions']:
                self.assertAlmostEqual(sum(line['finalObservables']['density']), line['finalParticles'], places=10)
        lessons = {row['id'] for row in content['lessons']}
        presets = {row['id'] for row in content['module']['presets']}
        sources = {row['id'] for row in content['sources']}
        for row in content['lessons']:
            self.assertIn(row['preset'], presets)
            self.assertTrue(set(row['references']) <= sources)
        for row in content['exercises']:
            self.assertIn(row['lesson'], lessons)
            self.assertEqual(len(row['steps']), 4)
            for step in row['steps']:
                self.assertIn(step['answer'], range(len(step['choices'])))
        for row in content['cases']:
            self.assertIn(row['preset'], presets)

    def test_input_validation_and_two_site_boundary_convention(self):
        for payload in ({'sites':5}, {'nUp':3}, {'site':2}, {'q':float('nan')},
                        {'eta':0}, {'temperature':1}, {'experiment':'wrong'}, {'sites':True}):
            with self.assertRaises(ValueError):
                m.calculate(payload)
        a = self.run_model(boundary='open')
        b = self.run_model(boundary='periodic')
        self.assertEqual(a['transitions'], b['transitions'])


if __name__ == '__main__':
    unittest.main()
