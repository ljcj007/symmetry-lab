"""Actual shared-API references: pinned ZnO modes and labelled synthetic data."""
from pathlib import Path
from copy import deepcopy
import argparse
import hashlib
import json
import math
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))


def base_parameters():
    return {'frequency_unit':'THz','length_unit':'angstrom','mass_unit':'amu',
        'eigenvectorConvention':'phonopy-atom-phase','primitiveOrderConfirmed':True,
        'qIndex':2,'G':[1,1,0],'QCoordinates':'primitive-reciprocal','channel':'creation',
        'coherentLengths':{'Zn':5.680,'O':5.803},'scatteringLengthUnit':'fm',
        'scatteringLengthSource':'NIST NCNR natural Zn Coh b=5.680 fm and natural O Coh b=5.803 fm; neutron scattering lengths, not measured ZnO DSF',
        'temperature':100.,'debyeWaller':{'mode':'omit'},'energyCutoff':.25,'groupTolerance':1e-5,
        'sigma':1.,'energyMin':-80.,'energyMax':80.,'energyPoints':401}


def zno_input():
    folder=ROOT/'dist/data/examples'
    raw=(folder/'phonopy-zno-qpoints.yaml').read_bytes()
    companion=(folder/'phonopy-zno-structure.yaml').read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5'
    assert hashlib.sha256(companion).hexdigest()=='93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c'
    return {**base_parameters(),'filename':'phonopy-zno-qpoints.yaml','content':raw.decode('utf8'),'structure_content':companion.decode('utf8')}


def synthetic_input():
    """Read a fixed synthetic source rather than regenerate its libm bits.

    These exact input values were already published in the original reference
    case. Freezing the input preserves its canonical-JSON identity on every
    platform; numerical tolerance remains a separate result comparison.
    """
    data=json.loads((ROOT/'scripts/fixtures/phonopy-scattering-synthetic.json').read_text(encoding='utf8'))
    assert data.get('synthetic') is True
    p=base_parameters()
    p.update(data=data,filename='synthetic-three-atom-complex.json',frequency_unit='meV',qIndex=0,G=[1,0,0],channel='both',negativeQIndex=1,
             coherentLengths=[1.2,-2.1,3.3],scatteringLengthSource='Explicit synthetic signed relative neutron lengths in fm for a mathematical regression; not material constants')
    return p


def inputs():
    zno=zno_input()
    gamma={**deepcopy(zno),'qIndex':0,'G':[0,0,1],'channel':'both','negativeQIndex':0}
    half={**deepcopy(zno),'qIndex':3,'G':[1,0,0],'channel':'both','negativeQIndex':3}
    cart=deepcopy(zno)
    import yaml
    lattice=np.array(yaml.safe_load(zno['structure_content'])['primitive_cell']['lattice'])
    cart.pop('G');cart.update(Q=(2*math.pi*np.array([1.25,1.,.25])@np.linalg.inv(lattice).T).tolist(),QCoordinates='cartesian-angstrom^-1')
    synthetic=synthetic_input()
    thermal=deepcopy(synthetic)
    thermal['debyeWaller']={'mode':'provided','temperature':100.,'unit':'angstrom^2',
        'tensors':[[[.002,.0002,0.],[.0002,.003,0.],[0.,0.,.001]] for _ in range(3)]}
    single=deepcopy(synthetic)
    single['data']['phonon']=single['data']['phonon'][1:];single['data']['nqpoint']=1
    single.pop('negativeQIndex');single.update(channel='annihilation',qIndex=0)
    units=deepcopy(synthetic)
    from phonopy_scattering import CM_MEV
    units['frequency_unit']='cm^-1';units['data']['frequency_unit']='cm^-1'
    for point in units['data']['phonon']:
        for band in point['band']:band['frequency']/=CM_MEV
    return [('zno-quarter-creation',zno),('zno-cartesian-Q',cart),('zno-gamma-both',gamma),
        ('zno-half-both',half),('synthetic-three-atom-both',synthetic),('synthetic-provided-thermal',thermal),
        ('synthetic-annihilation-only',single),('synthetic-cm-units',units)]


def rejection_inputs():
    real=zno_input();synthetic=synthetic_input();rows=[]
    p=deepcopy(real);p['primitiveOrderConfirmed']=False;rows.append(('unconfirmed-order',p))
    p=deepcopy(real);p.pop('frequency_unit');rows.append(('missing-frequency-unit',p))
    p=deepcopy(real);p['channel']='both';rows.append(('missing-negative-q',p))
    p=deepcopy(real);p.pop('G');p['Q']=[.123,0.,0.];rows.append(('unmatched-Q',p))
    p=deepcopy(synthetic);p['data']['phonon'][0]['band'][0].pop('eigenvector');rows.append(('missing-selected-vector',p))
    p=deepcopy(synthetic);p['data']['phonon'][0]['band'][0]['eigenvector'][0][0][0]*=2;rows.append(('nonorthogonal-selected-basis',p))
    for name,tensor,temperature in [('thermal-temperature-mismatch',np.eye(3).tolist(),101.),
                                   ('thermal-negative-variance',np.diag([-1.,1.,1.]).tolist(),100.)]:
        p=deepcopy(synthetic);p['debyeWaller']={'mode':'provided','temperature':temperature,'unit':'angstrom^2','tensors':[tensor]*3}
        rows.append((name,p))
    return rows


def compare(a,b,path='fixture'):
    assert type(a) is type(b),path+': type'
    if isinstance(a,dict):
        assert list(a)==list(b),path+': keys/order'
        for k in a:compare(a[k],b[k],path+'/'+k)
    elif isinstance(a,list):
        assert len(a)==len(b),path+': shape'
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,path+'/'+str(i))
    elif type(a) is float:
        assert math.isfinite(a) and math.isfinite(b) and math.isclose(a,b,rel_tol=2e-11,abs_tol=2e-11),path+': numeric'
    else:assert a==b,path+': exact value'


def build(check=False):
    from browser_api import run
    cases=[]
    for case_id,payload in inputs():
        result=run('phonopy_scattering',deepcopy(payload))
        assert result['schema']=='symmetry-lab-phonopy-scattering-1' and result['checks']['passed']
        cases.append({'id':case_id,'action':'phonopy_scattering','input':payload,'result':result})
    rejections=[]
    for case_id,payload in rejection_inputs():
        try:run('phonopy_scattering',deepcopy(payload))
        except ValueError as error:
            rejections.append({'id':case_id,'action':'phonopy_scattering','input':payload,
                'errorType':'ValueError','error':str(error)})
        else:raise AssertionError('Invalid supplied-mode request was accepted: '+case_id)
    files=['dist/python/phonopy_scattering.py','dist/python/phonopy_import.py','dist/python/browser_api.py']
    document={'schema':'symmetry-lab-phonopy-scattering-fixture-1',
        'method':'Sixteen actual browser_api.run requests: eight valid full results (four pinned ZnO supplied-mode cases with sourced real neutron lengths and four explicitly synthetic regressions) and eight genuine rejected-input results; no generated material modes or material thermal tensors.',
        'sourceHashEncoding':'utf8-lf-v1','sourceHashes':{f:hashlib.sha256((ROOT/f).read_text(encoding='utf8').encode('utf8')).hexdigest() for f in files},'cases':cases,'rejections':rejections}
    target=ROOT/'scripts/fixtures/phonopy-scattering.json'
    if check:compare(document,json.loads(target.read_text(encoding='utf8')))
    else:target.write_text(json.dumps(document,ensure_ascii=False,allow_nan=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'cases':len(cases),'rejections':len(rejections),'actualAPIRequests':len(cases)+len(rejections),'publicAPI':True,'bytes':target.stat().st_size,'checked':check}))
    return document


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    build(parser.parse_args().check)
