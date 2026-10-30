"""Independent analytic checks for periodic nonsymmorphic line teaching models."""
import importlib.util
import json
import math
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nonsymmorphic_lab', ROOT/'dist/python/nonsymmorphic_lab.py')
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


def close(a, b, tol=1e-9):
    assert np.allclose(a, b, atol=tol, rtol=tol), (a, b)


def unpack(data):
    return np.array(data['re'])+1j*np.array(data['im'])


def run():
    cases = 0
    for operation in ('glide', 'screw'):
        for spinful in ('true', 'false'):
            p = lab.parameters({'operation':operation, 'spinful':spinful, 'hopping':1.3, 'spinOrbit':.7})
            n = 4 if p['spinful'] else 2
            sign = -1 if p['spinful'] else 1
            for k in (-2*math.pi, -.731, 0., .731, math.pi, 2*math.pi):
                h = lab.hamiltonian(k,p); g, t = lab.operators(k,p)
                close(h, h.conj().T); close(g@g, sign*np.exp(-1j*k)*np.eye(n))
                close(g@g.conj().T,np.eye(n)); close(t@t.conj(), sign*np.eye(n))
                close(g@h@g.conj().T,h)
                close(t@h.conj()@t.conj().T, lab.hamiltonian(-k,p))
                close(t@g.conj()@t.conj().T, lab.operators(-k,p)[0])
                close(lab.hamiltonian(k+2*math.pi,p),h)
                close(lab.operators(k+2*math.pi,p)[0],g)
                if p['spinful']:
                    # Analytic branches, derived by simultaneous Q/σ diagonalization.
                    expected = sorted(q*2*(1.3*math.cos(k/2)+s*.7*math.sin(k/2)) for q in (-1,1) for s in (-1,1))
                else:
                    expected = sorted([-2*1.3*math.cos(k/2),2*1.3*math.cos(k/2)])
                close(np.linalg.eigvalsh(h),expected)
                m=.37; hm=lab.hamiltonian(k,p,mass=m)
                close(t@hm.conj()@t.conj().T,lab.hamiltonian(-k,p,mass=m))
                assert np.linalg.norm(g@hm@g.conj().T-hm)>.5
                # Squaring eliminates anticommuting mass cross terms.
                close(hm@hm,h@h+m*m*np.eye(n))
                cases += 1
            cross=2*math.atan2(1.3,.7) if p['spinful'] else math.pi
            assert lab.central_gap(cross,p)<1e-9
            close(lab.central_gap(cross,p,mass=.37),.74)
            for x in np.linspace(0,math.pi,77):
                assert lab.central_gap(x,p,mass=.37)>=.74-1e-9
            out=lab.calculate(p)
            assert out['checks']['passed']
            # Endpoint pairing must come from simultaneous energy/G blocks.
            if p['spinful']:
                for endpoint in out['nonsymmorphic']['endpoints']:
                    assert endpoint['kramersProtected']
                    assert [b['multiplicity'] for b in endpoint['blocks']]==[2,2]
                for b in out['nonsymmorphic']['endpoints'][0]['blocks']:
                    eig=np.array(b['symmetryEigenvalues']);close(sorted(eig[:,1]),[-1,1])
                for b in out['nonsymmorphic']['endpoints'][1]['blocks']:
                    eig=np.array(b['symmetryEigenvalues']);close(abs(eig[:,0]),[1,1]);close(eig[0,0],eig[1,0])
            else:
                assert not any(ep['kramersProtected'] for ep in out['nonsymmorphic']['endpoints'])
                b=out['nonsymmorphic']['endpoints'][1]['blocks'][0]
                assert b['multiplicity']==2
                close(sorted(np.array(b['symmetryEigenvalues'])[:,1]),[-1,1])
            task=out['grading']['tasks'][0];v=unpack(task['reference']);hh=unpack(task['operators'][0])
            close(v.conj().T@v,np.eye(v.shape[1]));close(hh@v,v@ (v.conj().T@hh@v))
            for c in out['breaking']['candidates']:
                assert c['achieved']==bool(c['removed'])
                assert c['sampledMinimumGap']+1e-8>=c['gapLowerBound']
                if 'spatial' not in c['removed']:assert c['spatialResidual']<1e-9
                if 'time-reversal' not in c['removed']:assert c['timeReversalResidual']<1e-9
                # Fresh dense scan independent of the challenge grid.
                dense=min(lab.central_gap(x,p,mass=c['mass'],zeeman=c['zeeman']) for x in np.linspace(0,math.pi,413))
                assert dense+1e-8>=c['gapLowerBound']
            assert out['breaking']['minimalCount']==1
    for operation in ('glide','screw'):
        assert lab.momentum_diagnostic(lab.parameters({'operation':operation}))['inLittleGroup']
        assert not lab.momentum_diagnostic(lab.parameters({'operation':operation,'transverseY':.2}))['inLittleGroup']
        assert lab.momentum_diagnostic(lab.parameters({'operation':operation,'transverseY':.5}))['inLittleGroup']
    assert lab.momentum_diagnostic(lab.parameters({'operation':'glide','transverseZ':.2}))['inLittleGroup']
    assert not lab.momentum_diagnostic(lab.parameters({'operation':'screw','transverseZ':.2}))['inLittleGroup']
    off=lab.calculate({'transverseY':.2})
    assert not off['nonsymmorphic']['partnerSwitchProtected']
    assert not any(e['kramersProtected'] for e in off['nonsymmorphic']['endpoints'])
    mass=lab.calculate({'mass':.3})
    assert not mass['nonsymmorphic']['partnerSwitchProtected']
    assert all(e['kramersProtected'] for e in mass['nonsymmorphic']['endpoints'])
    field=lab.calculate({'zeeman':5})
    assert field['nonsymmorphic']['spatialResidual']<1e-9
    assert field['nonsymmorphic']['timeReversalResidual']>1
    assert not any(e['kramersProtected'] for e in field['nonsymmorphic']['endpoints'])
    data=json.loads((ROOT/'dist/data/nonsymmorphic-content.json').read_text(encoding='utf-8'))
    assert len(data['lessons'])==3 and len(data['exercises'])==3 and len(data['cases'])==3
    assert all(len(x['steps'])==4 for x in data['exercises'])
    assert len(data['module']['presets'])==8 and len(data['module']['predictions'])==2
    for preset in data['module']['presets']:
        result=lab.calculate(preset['input'])
        assert result['checks']['passed'],preset['id']
        json.dumps(result,allow_nan=False)
    for bad in ({'hopping':0},{'spinOrbit':float('nan')},{'kFraction':1},{'points':1000},{'operation':'fake'}):
        try:lab.calculate(bad)
        except (ValueError,TypeError):pass
        else:raise AssertionError('invalid input accepted: '+str(bad))
    print('nonsymmorphic: PASS (24 independent k/representation cases, endpoint pairings, periodic sewing, full-line gap bounds, momentum diagnostics, eight presets)')


if __name__=='__main__':
    run()
