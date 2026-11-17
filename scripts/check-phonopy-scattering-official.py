"""Execute installed Phonopy 4.10.0's actual structure-factor method.

Uses the same supplied modes/b/explicit DW factors, and separately recomputes
the pinned ZnO eigenpairs from its original force data for subspace comparison.
This is not a run of Phonopy's default mesh-DW DSF constructor.
"""
from pathlib import Path
import hashlib
import importlib.metadata
import importlib.util
import inspect
import json
import math
import sys
import numpy as np
import phonopy
from phonopy.structure.atoms import PhonopyAtoms
from phonopy.spectrum.dynamic_structure_factor import DynamicStructureFactor

ROOT=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--write',action='store_true',help='Replace the independently measured official golden file with this actual run')
args=parser.parse_args()
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
spec=importlib.util.spec_from_file_location('reference_inputs',ROOT/'scripts/build-phonopy-scattering-reference.py')
refs=importlib.util.module_from_spec(spec);spec.loader.exec_module(refs)
assert phonopy.__version__=='4.10.0'
base=ROOT/'dist/data/examples'
model=phonopy.load(phonopy_yaml=str(base/'phonopy-zno-structure.yaml'),
    force_sets_filename=str(base/'phonopy-zno-FORCE_SETS'),
    is_nac=False,fc_calculator='traditional',symmetrize_fc=True,is_compact_fc=True)
provided_q=[[0,0,0],[.25,0,0],[.25,0,.25],[.5,0,0]]
fresh=model.run_qpoints(provided_q,with_eigenvectors=True,with_dynamical_matrices=True)
quantum=(6.62607015e-34/(2*math.pi))**2/(2*1.66053906660e-27*1e-20*1.602176634e-22)
rows=[];fresh_rows=[];method_calls=0
for case_id,payload in refs.inputs():
    if not (case_id.startswith('zno-') or case_id=='synthetic-provided-thermal'):continue
    result=run('phonopy_scattering',payload)
    atoms=result['atoms'];structure=result['structure']
    primitive=PhonopyAtoms(symbols=[a['symbol'] for a in atoms],masses=[a['mass'] for a in atoms],
        scaled_positions=[a['position'] for a in atoms],cell=structure['lattice'])
    holder=DynamicStructureFactor.__new__(DynamicStructureFactor)
    holder._primitive=primitive;holder._func_AFF=None
    holder._b={a['symbol']:a['coherentLengthFm'] for a in atoms}
    physical_Q=np.array(result['momentum']['QCartesian']);qcycles=physical_Q/(2*math.pi)
    if payload['debyeWaller']['mode']=='omit':DW=np.ones(len(atoms))
    else:
        tensors=np.array(payload['debyeWaller']['tensors'])
        DW=np.array([math.exp(-.5*float(physical_Q@u@physical_Q)) for u in tensors])
    for channel in result['channels']:
        for branch in channel['branches']:
            if branch['excluded']:continue
            values=np.array(branch['eigenvector'])
            eigen=(values[:,:,0]+1j*values[:,:,1]).reshape(-1)
            vector=eigen.conj() if channel['id']=='creation' else eigen
            frequency_thz=branch['energyMeV']/(6.62607015e-34*1e12/1.602176634e-22)
            actual=holder._phonon_structure_factor(qcycles,np.array(channel['G']),DW,frequency_thz,vector)
            method_calls+=1
            our=complex(*branch['sum'])/math.sqrt(2*frequency_thz)
            amplitude_relative=abs(actual-our)/max(1.,abs(actual),abs(our))
            converted_weight=abs(actual)**2*(2*frequency_thz)*quantum/branch['energyMeV']*branch['thermalMultiplier']
            weight_relative=abs(converted_weight-branch['weight'])/max(1.,abs(converted_weight),abs(branch['weight']))
            assert max(amplitude_relative,weight_relative)<2e-11
            rows.append({'case':case_id,'channel':channel['id'],'branch':branch['index'],
                'officialFRealImag':[float(actual.real),float(actual.imag)],
                'amplitudeRelativeResidual':amplitude_relative,'convertedWeightRelativeResidual':weight_relative})
        if case_id.startswith('zno-'):
            qi=channel['qIndex'];vectors=fresh.eigenvectors[qi];frequencies=fresh.frequencies[qi]
            for group in channel['groups']:
                if group['excludedBranches']:continue
                strength=0.
                for bi in group['branches']:
                    vector=vectors[:,bi].conj() if channel['id']=='creation' else vectors[:,bi]
                    official=holder._phonon_structure_factor(qcycles,np.array(channel['G']),DW,float(frequencies[bi]),vector)
                    method_calls+=1
                    strength+=float(abs(official)**2*(2*frequencies[bi]))
                residual=abs(strength-group['amplitudeStrength'])/max(1.,abs(strength),abs(group['amplitudeStrength']))
                assert residual<2e-8
                fresh_rows.append({'case':case_id,'channel':channel['id'],'branches':group['branches'],
                    'officialFreshSubspaceStrength':strength,'suppliedSubspaceStrength':group['amplitudeStrength'],
                    'relativeResidual':residual})
source=Path(inspect.getsourcefile(DynamicStructureFactor))
record={'officialVersion':phonopy.__version__,
    'versions':{name:importlib.metadata.version(name) for name in ['phonopy','numpy','spglib','symfc','phonors']},
    'officialSourceURL':'https://github.com/phonopy/phonopy/blob/v4.10.0/phonopy/spectrum/dynamic_structure_factor.py',
    'executedMethod':'DynamicStructureFactor._phonon_structure_factor',
    'productionCoreSHA256':hashlib.sha256((ROOT/'dist/python/phonopy_scattering.py').read_text(encoding='utf8').encode('utf8')).hexdigest(),
    'officialSourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'sameProvidedModeBranchComparisons':len(rows),'freshZnOSubspaceComparisons':len(fresh_rows),'actualOfficialMethodCalls':method_calls,
    'maxProvidedAmplitudeRelativeResidual':max(r['amplitudeRelativeResidual'] for r in rows),
    'maxConvertedWeightRelativeResidual':max(r['convertedWeightRelativeResidual'] for r in rows),
    'maxFreshZnOSubspaceRelativeResidual':max(r['relativeResidual'] for r in fresh_rows),
    'freshModelConditions':{'forceSetsSHA256':hashlib.sha256((base/'phonopy-zno-FORCE_SETS').read_bytes()).hexdigest(),
        'structureSHA256':hashlib.sha256((base/'phonopy-zno-structure.yaml').read_bytes()).hexdigest(),
        'isNAC':False,'fcCalculator':'traditional','symmetrizeFC':True,'compactFC':True,'qpoints':provided_q},
    'comparisonUnits':'Official private F receives the same b numeric values in fm and returns raw F; compare with supplied A/sqrt(2 frequencyTHz). Physical line weights use independently stated SI quantum factor/E and the same thermal multiplier.',
    'debyeWallerConditions':'ZnO explicitly omits DW, so official private method receives factors1. Synthetic provided thermal case receives the independently contracted same declared tensors. No real ZnO thermal tensors are generated.',
    'notExecuted':'Default DynamicStructureFactor constructor and its complete mesh-DW integration were not run; this does not compare against or claim that different default DW conditions agree.',
    'allPassed':True,'providedComparisons':rows,'freshComparisons':fresh_rows}
target=ROOT/'scripts/fixtures/phonopy-scattering-official.json'
if args.write:
    target.write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
else:
    expected=json.loads(target.read_text(encoding='utf8'))
    assert record['productionCoreSHA256']==expected['productionCoreSHA256']
    assert record['officialSourceSHA256']==expected['officialSourceSHA256']
    for key in ('providedComparisons','freshComparisons'):
        assert len(record[key])==len(expected[key])
        for a,b in zip(record[key],expected[key]):
            for name,value in b.items():
                if isinstance(value,list) and name=='officialFRealImag':
                    assert max(abs(x-y) for x,y in zip(a[name],value))<2e-10*max(1.,*(abs(x) for x in value))
                elif isinstance(value,float):
                    assert math.isclose(a[name],value,rel_tol=2e-8,abs_tol=2e-8),(key,name)
                else:assert a[name]==value,(key,name)

print(json.dumps({key:value for key,value in record.items() if key not in ['providedComparisons','freshComparisons']},indent=2))
