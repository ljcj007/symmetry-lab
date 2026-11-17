"""Independent two-Q arithmetic, bounded grading and source-identity checks."""
from copy import deepcopy
from pathlib import Path
import cmath
import hashlib
import importlib.util
import json
import math
import sys
import unittest
from unittest.mock import patch
import numpy as np
import yaml

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
import phonopy_derivation as core
import phonopy_scattering as scattering
from symmetry_grading import matrix
spec=importlib.util.spec_from_file_location('derivation_refs',ROOT/'scripts/build-phonopy-derivation-reference.py')
ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)


def dot(a,b):return sum(x*y for x,y in zip(a,b))


def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]


def Qcart(fraction,lattice):
    dual=[cross(lattice[1],lattice[2]),cross(lattice[2],lattice[0]),cross(lattice[0],lattice[1])]
    volume=dot(lattice[0],dual[0])
    return [2*math.pi*sum(fraction[i]*dual[i][j]/volume for i in range(3)) for j in range(3)]


def unpack(vector):return [[complex(*part) for part in row] for row in vector]


def raw_source(request):
    data=request.get('data') or yaml.safe_load(request['content'])
    if 'structure_data' in request:structure=request['structure_data']
    elif request.get('structure_content'):structure=yaml.safe_load(request['structure_content'])
    else:structure=data
    primitive=structure.get('primitive_cell',structure)
    return data,primitive['lattice'],primitive['points']


def independent(request,branch):
    data,lattice,atoms=raw_source(request)
    point=data['phonon'][request['qIndex']];G=request['G'];q=point['q-position']
    Q=Qcart([a+b for a,b in zip(q,G)],lattice)
    vector=unpack(point['band'][branch]['eigenvector'])
    bs=request['coherentLengths'];terms=[];displacements=[];variants={k:[] for k in ['missing-conjugation','omit-phase','omit-mass']}
    for atom,e in zip(atoms,vector):
        b=bs[atom['symbol']] if isinstance(bs,dict) else bs[len(terms)]
        if request['debyeWaller']['mode']=='provided':
            U=request['debyeWaller']['tensors'][len(terms)]
            b*=math.exp(-.5*sum(Q[i]*U[i][j]*Q[j] for i in range(3) for j in range(3)))
        mass=math.sqrt(atom['mass']);phase=cmath.exp(2j*math.pi*dot(G,atom['coordinates']))
        projection=dot(Q,[x.conjugate() for x in e])
        term=b/mass*phase*projection;terms.append(term)
        displacements.append([x/mass for x in e])
        variants['missing-conjugation'].append(b/mass*phase*dot(Q,e))
        variants['omit-phase'].append(b/mass*projection)
        variants['omit-mass'].append(b*phase*projection)
    strength=abs(sum(terms))**2;incoherent=sum(abs(x)**2 for x in terms)
    h=6.62607015e-34;ev=1.602176634e-19;amu=1.66053906660e-27
    quantum=(h/(2*math.pi))**2/(2*amu*1e-20*ev*.001)
    frequency=point['band'][branch]['frequency'];unit=request['frequency_unit']
    E=frequency*(h*1e12/(ev*.001) if unit=='THz' else 1.)
    excluded=frequency<=0 or E<request['energyCutoff']
    bose=None if excluded else 0. if request['temperature']==0 else 1/math.expm1(E/(8.617333262145e-2*request['temperature']))
    bare=None if excluded else quantum*strength/E
    return {'Q':Q,'vectors':vector,'displacements':displacements,'terms':terms,'sum':sum(terms),
        'strength':strength,'incoherent':incoherent,'interference':strength-incoherent,'bare':bare,
        'weight':0. if excluded else bare*(1+bose),'variants':variants,'atoms':atoms,'q':q}


class DerivationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs=dict(ref.inputs())
        cls.results={key:run('phonopy_derivation',deepcopy(value)) for key,value in cls.inputs.items()}

    def close(self,a,b):
        self.assertTrue(np.allclose(a,b,rtol=2e-11,atol=2e-11),(a,b))

    def grade(self,key='zno-two-G',answers=None):
        source=deepcopy(self.inputs[key]);result=self.results[key]
        source.update(mode='grade',forFingerprint=result['fingerprint'],answers={} if answers is None else answers)
        return run('phonopy_derivation',source)

    def test_01_two_actual_core_calls_no_new_solver_and_original_input_immutable(self):
        source=deepcopy(self.inputs['zno-two-G']);before=deepcopy(source)
        with patch.object(scattering,'run',wraps=scattering.run) as calculate, patch.object(np.linalg,'eigh',side_effect=AssertionError('No eigensolve')):
            result=run('phonopy_derivation',source)
        self.assertEqual(calculate.call_count,2);self.assertEqual(source,before)
        for point in result['points']:
            self.assertEqual(point['result'],run('phonopy_scattering',point['input']))
            expected=deepcopy(source['input']);expected['G']=source['input']['G'] if point['id']=='A' else source['comparisonG']
            self.assertEqual(point['input'],expected)

    def test_02_independent_raw_source_scalar_arithmetic(self):
        for name,result in self.results.items():
            branch=self.inputs[name]['branchIndex'];ai=self.inputs[name]['atomIndex']
            for point in result['points']:
                expected=independent(point['input'],branch);actual=point['result']['channels'][0]['branches'][branch]
                self.close(expected['Q'],point['result']['momentum']['QCartesian'])
                self.close(expected['sum'],complex(*actual['sum']))
                for x,y in zip(expected['terms'],actual['terms']):self.close(x,complex(*y))
                self.close(expected['strength'],actual['strength']);self.close(expected['interference'],actual['interference'])
                self.close(expected['weight'],actual['weight'])
                if expected['bare'] is not None:self.close(expected['bare'],point['derived']['bareWeight'])
                self.close(expected['displacements'][ai],[complex(*x) for x in point['derived']['selectedAtomMassScaled']])

    def test_03_each_wrong_formula_has_independent_current_input_values(self):
        for name,result in self.results.items():
            branch=self.inputs[name]['branchIndex']
            expected=[independent(point['input'],branch) for point in result['points']]
            for candidate in result['contrasts']:
                for i,point in enumerate(candidate['points']):
                    strength=expected[i]['incoherent'] if candidate['id']=='square-first' else abs(sum(expected[i]['variants'][candidate['id']]))**2
                    self.close(strength,point['strength'])
                    if candidate['id']=='square-first':self.assertIsNone(point['sum'])

    def test_04_accidental_single_point_correctness_and_second_point_discrimination(self):
        result=self.results['zno-two-G']
        variants={v['id']:v for v in result['contrasts']}
        for name in ['missing-conjugation','omit-phase']:
            self.assertEqual(variants[name]['referenceAgreementByPoint'],[True,False])
        # At G110 every raw atom has x+y=1, making the structural phase unity.
        _,_,atoms=raw_source(result['points'][0]['input'])
        for atom in atoms:self.close(atom['coordinates'][0]+atom['coordinates'][1],1.)
        self.assertGreater(variants['missing-conjugation']['points'][1]['strength'],10.)
        branch=result['points'][1]['result']['channels'][0]['branches'][10]
        self.assertLess(branch['strength'],1.)

    def test_05_component_grading_preserves_amplitude_and_fixed_raw_gauge(self):
        result=self.results['zno-two-G'];answers=ref.complete_answers(result)
        correct=self.grade(answers=answers)['grading'];self.assertTrue(correct['passed']);self.assertEqual(correct['counts']['correct'],19)
        # Subspace grading would allow this scale change; physical components do not.
        changed=deepcopy(answers);task='mode.massScaledEigenvector'
        changed[task]['re']=[[x*2 for x in row] for row in changed[task]['re']]
        changed[task]['im']=[[x*2 for x in row] for row in changed[task]['im']]
        graded=self.grade(answers=changed)['grading'];checks={c['taskId']:c for c in graded['checks']}
        self.assertEqual(checks[task]['status'],'incorrect');self.assertFalse(graded['passed'])
        # An explicitly different common gauge is physically valid, but is not
        # the raw-gauge component answer requested by this particular task.
        changed=deepcopy(answers);value=matrix(changed['A.sum'])*1j
        changed['A.sum']={'re':value.real.tolist(),'im':value.imag.tolist()}
        graded=self.grade(answers=changed)['grading'];checks={c['taskId']:c for c in graded['checks']}
        self.assertEqual(checks['A.sum']['status'],'incorrect')

    def test_06_full_source_identity_and_stale_answer_rejection(self):
        original=self.inputs['zno-two-G'];derived=self.results['zno-two-G']
        for change in ['raw-whitespace','temperature','G','comparison','atom','filename']:
            p=deepcopy(original)
            if change=='raw-whitespace':p['input']['content']+=' '
            elif change=='temperature':p['input']['temperature']=101.
            elif change=='G':p['input']['G']=[2,1,0]
            elif change=='comparison':p['comparisonG']=[0,1,0]
            elif change=='atom':p['atomIndex']=1
            else:p['input']['filename']='different-name.yaml'
            p.update(mode='grade',forFingerprint=derived['fingerprint'],answers={})
            with self.assertRaisesRegex(ValueError,'指纹'):run('phonopy_derivation',p)
        p=deepcopy(original);p['input']['content']+=' '
        fresh=run('phonopy_derivation',p)
        self.assertNotEqual(fresh['fingerprint'],derived['fingerprint'])
        # Canonical object key ordering is not an input value change.
        p=deepcopy(original);p['input']=dict(reversed(list(p['input'].items())))
        self.assertEqual(run('phonopy_derivation',p)['fingerprint'],derived['fingerprint'])

    def test_07_distinct_missing_malformed_incorrect_and_unavailable(self):
        answers={'A.QCartesian':'__import__("os")','A.projection':[[True]],'A.sum':[[0,1]],
            'B.sum':{'re':[[0]],'im':[[0]],'reference':[[0]]},'A.weight':[[0]*33],
            'B.projection':{'re':[[0]],'im':[[1e100]]},'A.coherentStrength':[[0]]}
        graded=self.grade(answers=answers)['grading'];checks={c['taskId']:c for c in graded['checks']}
        for name in ['A.QCartesian','A.projection','A.sum','B.sum','A.weight','B.projection']:
            self.assertEqual(checks[name]['status'],'malformed')
        self.assertEqual(checks['A.coherentStrength']['status'],'incorrect')
        self.assertEqual(checks['B.weight']['status'],'missing')
        source=deepcopy(self.inputs['zno-two-G']);source['input']['coherentLengths']={'Zn':10000,'O':10000}
        source['input']['G']=[10000,10000,10000]
        large=run('phonopy_derivation',source)
        self.assertTrue(any(not t['available'] and '1e8' in t['reason'] for t in large['tasks']))

    def test_08_zero_Q_same_G_and_diagnosis_do_not_claim_uniqueness(self):
        zero=self.results['zno-zero-Q'];self.assertTrue(all(not c['distinguishable'] for c in zero['contrasts']))
        answers={name:[[0]] for name in ['A.coherentStrength','B.coherentStrength']}
        grade=self.grade('zno-zero-Q',answers)['grading']['diagnosis']
        self.assertEqual(grade['status'],'consistent-with-reference');self.assertEqual(len(grade['compatibleCandidates']),4)
        result=self.results['zno-two-G']
        single=self.grade(answers={'A.coherentStrength':[[result['points'][0]['result']['channels'][0]['branches'][10]['strength']]]})['grading']['diagnosis']
        self.assertEqual(single['status'],'insufficient-two-point-evidence');self.assertFalse(single['hasBothPoints'])
        wrong=result['contrasts'][0]['points'];answers={p['id']+'.coherentStrength':[[p['strength']]] for p in wrong}
        grade=self.grade(answers=answers)['grading']['diagnosis']
        self.assertIn('missing-conjugation',grade['compatibleCandidates']);self.assertFalse(grade['referenceCompatible'])
        self.assertTrue(all(p['input']['G']==[1,1,0] for p in self.results['zno-same-G']['points']))

    def test_09_convention_bridge_transforms_both_vector_and_phase(self):
        result=self.results['synthetic-complex'];branch=self.inputs['synthetic-complex']['branchIndex']
        for point in result['points']:
            independent_result=independent(point['input'],branch)
            _,_,atoms=raw_source(point['input']);Q=point['result']['momentum']['Q']
            for atom,e,row in zip(atoms,independent_result['vectors'],point['derived']['conventionBridge']['atoms']):
                phase=cmath.exp(2j*math.pi*dot(independent_result['q'],atom['coordinates']))
                self.close([complex(*x) for x in row['cellPeriodicEigenvector']],[phase*x for x in e])
                self.close(complex(*row['cellPeriodicTerm']),complex(*row['atomPhaseTerm']))
            self.assertLess(point['derived']['conventionBridge']['maxAmplitudeResidual'],1e-12)

    def test_10_cutoff_has_no_division_or_invented_thermal_target(self):
        result=self.results['zno-cutoff'];unavailable=[t for t in result['tasks'] if not t['available']]
        self.assertEqual(len(unavailable),4);self.assertTrue(all(t['expected'] is None for t in unavailable))
        for point in result['points']:
            b=point['result']['channels'][0]['branches'][0]
            self.assertIsNone(point['derived']['bareWeight']);self.assertIsNone(b['energyDenominator']);self.assertIsNone(b['occupation'])
            self.assertEqual(b['weight'],0.)
        grade=self.grade('zno-cutoff',ref.complete_answers(result))['grading']
        self.assertTrue(grade['passed']);self.assertEqual(grade['counts']['unavailable'],4)

    def test_11_complete_group_does_not_certify_single_branch_observable(self):
        source=deepcopy(self.inputs['synthetic-complex']);data=source['input']['data']
        data['phonon'][0]['band'][1]['frequency']=data['phonon'][0]['band'][0]['frequency']
        result=run('phonopy_derivation',source)
        self.assertFalse(result['conditions']['singleBranchObservable'])
        self.assertEqual(result['conditions']['numericalGroup']['branches'],[0,1])
        self.assertEqual(result['points'][0]['result'],run('phonopy_scattering',result['points'][0]['input']))

    def test_12_bounded_contract_and_fixed_source_regression(self):
        original=self.inputs['zno-two-G'];derived=self.results['zno-two-G']
        for _,payload in ref.rejection_inputs(original,derived):
            with self.assertRaises(ValueError):run('phonopy_derivation',payload)
        # No synthetic source is constructed by fresh libm/BLAS operations.
        with patch.object(ref.ref.np,'exp',side_effect=AssertionError('Frozen input required')):
            frozen=ref.inputs()[-1][1]
        self.assertEqual(frozen,self.inputs['synthetic-complex'])
        # The scientific core and independently measured official reference are
        # pinned separately from the new adapter and its API allowlist.
        identities={'dist/python/phonopy_scattering.py':'11b50d45723f46315bab2e2b0b30465a76687353472cec8cecabd21c59ba61e5',
            # UTF-8/LF source identity; the untouched Windows CRLF file has
            # raw byte identity af477914... and the Git LF blob has this hash.
            'scripts/fixtures/phonopy-scattering-official.json':'79b0a6881ee91bc26ceba5423611a3e4d1ff28d36d27dd8af7e29191704fa27f'}
        for path,expected in identities.items():
            actual=hashlib.sha256((ROOT/path).read_text(encoding='utf8').encode('utf8')).hexdigest()
            self.assertEqual(actual,expected,path)

    def test_13_mixed_booleans_cannot_be_promoted_to_correct_numbers(self):
        # This answer would exactly match zero Q after numpy's bool/float
        # promotion. Its semantic type is invalid before numerical comparison.
        graded=self.grade('zno-zero-Q',{'A.QCartesian':[[False,0.,0.]]})['grading']
        check=next(c for c in graded['checks'] if c['taskId']=='A.QCartesian')
        self.assertEqual(check['status'],'malformed')
        task=core._task('probe',None,1,'typed numeric validation',[[1.,0.,0.]],'unit',True)
        output=core._grade([task],{'probe':[[True,0.,0.]]},[])
        self.assertEqual(output['checks'][0]['status'],'malformed')
        self.assertFalse(output['passed'])

    def test_14_supplied_thermal_tensors_are_recontracted_at_each_actual_Q(self):
        p=deepcopy(self.inputs['synthetic-complex'])
        p['input']['debyeWaller']={'mode':'provided','temperature':100.,'unit':'angstrom^2',
            'tensors':[[[.002,.0002,0.],[.0002,.003,0.],[0.,0.,.001]] for _ in range(3)]}
        result=run('phonopy_derivation',p)
        self.assertNotEqual(result['points'][0]['result']['atoms'][0]['debyeWallerFactor'],
            result['points'][1]['result']['atoms'][0]['debyeWallerFactor'])
        for point in result['points']:
            expected=independent(point['input'],p['branchIndex'])
            actual=point['result']['channels'][0]['branches'][p['branchIndex']]
            self.close(expected['strength'],actual['strength']);self.close(expected['weight'],actual['weight'])


if __name__=='__main__':unittest.main(verbosity=2)
