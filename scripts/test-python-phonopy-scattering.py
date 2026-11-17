"""Independent 3D contractions, transformations, units and strict input checks."""
from pathlib import Path
from copy import deepcopy
import cmath
import importlib.util
import json
import math
import sys
import unittest
import numpy as np
import yaml

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
import phonopy_scattering as core
spec=importlib.util.spec_from_file_location('phonopy_scattering_references',ROOT/'scripts/build-phonopy-scattering-reference.py')
ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)


def complex_array(raw):
    a=np.array(raw);return a[...,0]+1j*a[...,1]


def cross(a,b):
    return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]


def dot(a,b):return sum(x*y for x,y in zip(a,b))


def independent_Q(frac,lattice):
    a,b,c=lattice;volume=dot(a,cross(b,c))
    dual=[cross(b,c),cross(c,a),cross(a,b)]
    return [2*math.pi*sum(frac[i]*dual[i][j]/volume for i in range(3)) for j in range(3)]


class PhonopyScattering(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs=dict(ref.inputs())
        cls.results={key:run('phonopy_scattering',deepcopy(value)) for key,value in cls.inputs.items()}

    def close(self,a,b,relative=3e-11):
        self.assertLessEqual(abs(a-b),relative*max(1.,abs(a),abs(b)))

    def test_01_actual_atomic_contractions_and_physical_units(self):
        # Independent constants and reciprocal basis via vector cross products.
        quantum=(6.62607015e-34/(2*math.pi))**2/(2*1.66053906660e-27*1e-20*1.602176634e-22)
        self.close(quantum,2.09007964265,relative=2e-9)
        for case,result in self.results.items():
            with self.subTest(case=case):
                p=result['parameters'];atoms=result['atoms']
                Q=independent_Q(result['momentum']['Q'],result['structure']['lattice'])
                for a,b in zip(Q,result['momentum']['QCartesian']):self.close(a,b)
                for channel in result['channels']:
                    for branch in channel['branches']:
                        eigen=complex_array(branch['eigenvector']);terms=[]
                        for i,atom in enumerate(atoms):
                            vector=eigen[i].conjugate() if channel['id']=='creation' else eigen[i]
                            phase=cmath.exp(2j*math.pi*dot(channel['G'],atom['position']))
                            projection=dot(Q,vector)
                            term=atom['coherentLengthFm']*atom['debyeWallerFactor']*phase*projection/math.sqrt(atom['mass'])
                            terms.append(term)
                            self.close(complex(*branch['atoms'][i]['projection']),projection)
                            self.close(complex(*branch['atoms'][i]['phase']),phase)
                            self.close(complex(*branch['atoms'][i]['term']),term)
                            self.close(complex(*branch['partialSums'][i+1]),sum(terms))
                        self.assertEqual(branch['partialSums'][0],[0.,0.])
                        total=sum(terms);strength=abs(total)**2
                        self.close(complex(*branch['sum']),total)
                        self.close(branch['strength'],strength)
                        self.close(branch['incoherentStrength'],sum(abs(x)**2 for x in terms))
                        self.close(branch['interference'],strength-sum(abs(x)**2 for x in terms))
                        if branch['excluded']:
                            self.assertIsNone(branch['occupation']);self.assertIsNone(branch['energyDenominator'])
                            self.assertIsNone(branch['center']);self.assertEqual(branch['weight'],0.)
                        else:
                            energy=branch['energyMeV'];t=p['temperature']
                            occupation=1/math.expm1(energy/(8.617333262145e-2*t)) if t else 0.
                            multiplier=occupation+(channel['id']=='creation')
                            self.close(branch['occupation'],occupation)
                            self.close(branch['weight'],quantum*strength/energy*multiplier)
                            phase=-1j if channel['id']=='creation' else 1j
                            self.close(complex(*branch['gauge']['sum']),phase*total)
                            self.close(branch['gauge']['weight'],branch['weight'])
                    for group in channel['groups']:
                        members=[channel['branches'][i] for i in group['branches']]
                        self.close(group['weight'],sum(b['weight'] for b in members))
                        self.close(group['amplitudeStrength'],sum(b['strength'] for b in members))
                self.assertTrue(result['checks']['passed']);json.dumps(result,allow_nan=False)

    def test_02_real_source_identity_and_no_hidden_modes(self):
        result=self.results['zno-quarter-creation']
        self.assertEqual(result['sourceIdentity']['sha256'],'37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5')
        self.assertTrue(result['sourceIdentity']['reference']['companion']['matchesPinnedSource'])
        self.assertFalse(result['sourceIdentity']['reference']['generator']['isNAC'])
        self.assertEqual([a['symbol'] for a in result['atoms']],['Zn','Zn','O','O'])
        self.assertEqual(len(result['channels'][0]['branches']),12)
        self.assertEqual(len(result['qpoints']),4)
        self.assertFalse(result['sourceBundle']['sourceSynthetic'])
        self.assertTrue(self.results['synthetic-three-atom-both']['sourceBundle']['sourceSynthetic'])
        changed=deepcopy(self.inputs['zno-quarter-creation']);changed['content']+=' '
        self.assertNotIn('reference',run('phonopy_scattering',changed)['sourceIdentity'])

    def test_03_cartesian_Q_and_frequency_unit_equivalence(self):
        a=self.results['zno-quarter-creation'];b=self.results['zno-cartesian-Q']
        for x,y in zip(a['momentum']['Q'],b['momentum']['Q']):self.close(x,y)
        for x,y in zip(a['channels'][0]['branches'],b['channels'][0]['branches']):self.close(x['weight'],y['weight'])
        original=self.results['synthetic-three-atom-both'];units=self.results['synthetic-cm-units']
        for x,y in zip(original['channels'],units['channels']):
            for u,v in zip(x['branches'],y['branches']):
                self.close(u['energyMeV'],v['energyMeV']);self.close(u['weight'],v['weight'])
        for x,y in zip(original['spectrum']['selected'],units['spectrum']['selected']):self.close(x,y)

    def test_04_actual_negative_q_and_annihilation_only(self):
        both=self.results['synthetic-three-atom-both'];single=self.results['synthetic-annihilation-only']
        self.assertEqual([x['id'] for x in single['channels']],['annihilation'])
        self.assertEqual(single['qpoints'][0]['q'],[-.2,-.1,-.15])
        self.assertEqual(single['momentum']['Q'],[1.2,.1,.15])
        for a,b in zip(both['channels'][1]['branches'],single['channels'][0]['branches']):self.close(a['weight'],b['weight'])
        # Supplied +/-q energies differ: no borrowed TR spectrum is substituted.
        self.assertNotEqual(both['channels'][0]['branches'][0]['energyMeV'],both['channels'][1]['branches'][0]['energyMeV'])
        missing=deepcopy(self.inputs['synthetic-three-atom-both']);missing['data']['phonon']=missing['data']['phonon'][:1];missing['data']['nqpoint']=1;missing.pop('negativeQIndex')
        with self.assertRaises(ValueError):run('phonopy_scattering',missing)

    def test_05_spectrum_areas_grouping_and_zero_modes(self):
        for result in self.results.values():
            p=result['parameters'];s=result['spectrum'];analytic=0.
            for channel in result['channels']:
                for b in channel['branches']:
                    if b['excluded']:continue
                    fraction=.5*(math.erf((p['energyMax']-b['center'])/(p['sigma']*math.sqrt(2)))-math.erf((p['energyMin']-b['center'])/(p['sigma']*math.sqrt(2))))
                    analytic+=b['weight']*fraction
            self.close(s['analyticWindowTotal'],analytic)
            self.assertLess(s['windowQuadratureError'],1e-8*max(1.,analytic))
        gamma=self.results['zno-gamma-both']['channels'][0]['branches']
        self.assertTrue(all(b['excluded'] for b in gamma[:3]))
        p=deepcopy(self.inputs['synthetic-three-atom-both']);p['groupTolerance']=1.
        for point in p['data']['phonon']:point['band'][1]['frequency']=point['band'][0]['frequency']+.5
        result=run('phonopy_scattering',p)
        for channel in result['channels']:
            group=channel['groups'][0]
            self.assertEqual(group['branches'],[0,1]);self.close(group['energySpread'],.5)
            self.close(group['weight'],sum(channel['branches'][i]['weight'] for i in (0,1)))
            self.assertNotEqual(channel['branches'][0]['center'],channel['branches'][1]['center'])

    def test_06_common_gauge_and_degenerate_unitary_subspaces(self):
        p=deepcopy(self.inputs['synthetic-three-atom-both'])
        for point in p['data']['phonon']:
            point['band'][1]['frequency']=point['band'][0]['frequency']
        original=run('phonopy_scattering',p)
        changed=deepcopy(p);theta=.37;phase=cmath.exp(.43j)
        U=np.array([[math.cos(theta),-math.sin(theta)*phase.conjugate()],[math.sin(theta)*phase,math.cos(theta)]])
        for point in changed['data']['phonon']:
            vectors=np.column_stack([complex_array(b['eigenvector']).reshape(-1) for b in point['band'][:2]])@U
            for j in range(2):
                vector=vectors[:,j]*cmath.exp(.29j)
                point['band'][j]['eigenvector']=[core._zs(vector[3*i:3*i+3]) for i in range(3)]
        rotated=run('phonopy_scattering',changed)
        for a,b in zip(original['channels'],rotated['channels']):
            self.close(a['groups'][0]['amplitudeStrength'],b['groups'][0]['amplitudeStrength'])
            self.close(a['groups'][0]['weight'],b['groups'][0]['weight'])
        for a,b in zip(original['spectrum']['selected'],rotated['spectrum']['selected']):self.close(a,b)

    def test_07_reordering_and_origin_shift_keep_physical_strengths(self):
        p=deepcopy(self.inputs['synthetic-three-atom-both']);original=run('phonopy_scattering',p)
        order=[2,0,1];reordered=deepcopy(p)
        reordered['data']['points']=[p['data']['points'][i] for i in order]
        reordered['coherentLengths']=[p['coherentLengths'][i] for i in order]
        for point in reordered['data']['phonon']:
            for b in point['band']:b['eigenvector']=[b['eigenvector'][i] for i in order]
        changed=run('phonopy_scattering',reordered)
        for a,b in zip(original['channels'],changed['channels']):
            for u,v in zip(a['branches'],b['branches']):self.close(u['weight'],v['weight'])
        shifted=deepcopy(p);origin=[.13,-.27,.07]
        for atom in shifted['data']['points']:atom['coordinates']=[x-y for x,y in zip(atom['coordinates'],origin)]
        changed=run('phonopy_scattering',shifted)
        for a,b in zip(original['channels'],changed['channels']):
            phase=cmath.exp(-2j*math.pi*dot(a['G'],origin))
            for u,v in zip(a['branches'],b['branches']):
                self.close(u['weight'],v['weight']);self.close(complex(*v['sum']),phase*complex(*u['sum']))

    def test_08_anisotropic_thermal_tensors_and_passive_Cartesian_frame(self):
        p=deepcopy(self.inputs['synthetic-provided-thermal']);old=run('phonopy_scattering',p)
        rotation=np.array([[math.cos(.42),-math.sin(.42),0],[math.sin(.42),math.cos(.42),0],[0,0,1.]])
        changed=deepcopy(p)
        changed['data']['lattice']=(np.array(p['data']['lattice'])@rotation.T).tolist()
        for point in changed['data']['phonon']:
            for band in point['band']:
                rows=complex_array(band['eigenvector'])@rotation.T
                band['eigenvector']=[core._zs(row) for row in rows]
        changed['debyeWaller']['tensors']=[(rotation@np.array(tensor)@rotation.T).tolist() for tensor in p['debyeWaller']['tensors']]
        new=run('phonopy_scattering',changed)
        for a,b in zip(old['channels'],new['channels']):
            for u,v in zip(a['branches'],b['branches']):self.close(u['weight'],v['weight'])
        zero=deepcopy(p);zero['temperature']=0.;zero['debyeWaller']['temperature']=0.
        result=run('phonopy_scattering',zero)
        self.assertTrue(all(a['debyeWallerFactor']<1 for a in result['atoms']))
        self.assertTrue(all(b['weight']==0 for b in result['channels'][1]['branches']))

    def test_09_strict_declarations_missing_modes_and_invalid_tensors(self):
        original=deepcopy(self.inputs['synthetic-three-atom-both']);bad=[]
        for key in ['frequency_unit','mass_unit','length_unit','temperature','coherentLengths','debyeWaller','primitiveOrderConfirmed','eigenvectorConvention']:
            p=deepcopy(original);p.pop(key);bad.append(p)
        for key,value in [('primitiveOrderConfirmed','true'),('primitiveOrderConfirmed',1),('eigenvectorConvention','cell-periodic'),('frequency_unit','THz'),('mass_unit','kg'),('length_unit','bohr'),('scatteringLengthUnit','angstrom'),('temperature',False),('qIndex',True),('G',[0,0,.5]),('Q',[.13,.31,.42]),('force_constants',[])]:
            p=deepcopy(original);p[key]=value;bad.append(p)
        p=deepcopy(original);p['data']['phonon'][0]['band'][0].pop('eigenvector');bad.append(p)
        p=deepcopy(original);p['data']['phonon'][0]['band'][0]['eigenvector'][0][0][0]*=2;bad.append(p)
        p=deepcopy(original);p['coherentLengths']={'C':1.};bad.append(p)
        for tensor in ([[1,2,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,1,0],[0,0,1]]):
            p=deepcopy(original);p['debyeWaller']={'mode':'provided','temperature':100.,'unit':'angstrom^2','tensors':[tensor]*3};bad.append(p)
        p=deepcopy(self.inputs['synthetic-provided-thermal']);p['debyeWaller']['temperature']=101;bad.append(p)
        for i,payload in enumerate(bad):
            with self.subTest(rejection=i),self.assertRaises(ValueError):run('phonopy_scattering',payload)
        self.assertEqual(original,self.inputs['synthetic-three-atom-both'])

    def test_10_input_immutability_and_alias_roundtrip(self):
        p=deepcopy(self.inputs['synthetic-provided-thermal']);snapshot=deepcopy(p)
        run('phonopy_scattering',p);self.assertEqual(p,snapshot)
        p['length_unit']='Å';p['mass_unit']='AMU';p['frequency_unit']='MEV';p['debyeWaller']['unit']='Å²';p['scatteringLengthUnit']='FM'
        result=run('phonopy_scattering',p)
        self.assertEqual(result['parameters']['length_unit'],'angstrom')
        self.assertEqual(result['parameters']['frequency_unit'],'meV')
        self.assertEqual(result['parameters']['mass_unit'],'amu')

    def test_11_fixed_actual_official_method_results_without_phonopy_dependency(self):
        import hashlib
        golden=json.loads((ROOT/'scripts/fixtures/phonopy-scattering-official.json').read_text(encoding='utf8'))
        self.assertEqual(golden['officialVersion'],'4.10.0')
        self.assertTrue(golden['allPassed'])
        self.assertIn('Default DynamicStructureFactor constructor',golden['notExecuted'])
        self.assertEqual(golden['productionCoreSHA256'],hashlib.sha256((ROOT/'dist/python/phonopy_scattering.py').read_text(encoding='utf8').encode('utf8')).hexdigest())
        self.assertEqual(golden['sameProvidedModeBranchComparisons'],len(golden['providedComparisons']))
        self.assertEqual(golden['freshZnOSubspaceComparisons'],len(golden['freshComparisons']))
        self.assertEqual(golden['actualOfficialMethodCalls'],150)
        for row in golden['providedComparisons']:
            result=self.results[row['case']]
            channel=next(c for c in result['channels'] if c['id']==row['channel'])
            branch=channel['branches'][row['branch']]
            frequency=branch['energyMeV']/(6.62607015e-34*1e12/1.602176634e-22)
            supplied=complex(*branch['sum'])/math.sqrt(2*frequency)
            actual_official=complex(*row['officialFRealImag'])
            self.close(supplied,actual_official)
        for row in golden['freshComparisons']:
            channel=next(c for c in self.results[row['case']]['channels'] if c['id']==row['channel'])
            group=next(g for g in channel['groups'] if g['branches']==row['branches'])
            self.close(group['amplitudeStrength'],row['officialFreshSubspaceStrength'],relative=2e-8)


if __name__=='__main__':unittest.main(verbosity=2)
