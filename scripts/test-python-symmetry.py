"""Test NumPy symmetry core against fixed, independently generated JS fixtures.

Run ``node scripts/generate-symmetry-reference.mjs`` to intentionally refresh
fixtures from the retained JS reference. ``--all`` additionally scans every
SG/MSG at three momenta, and every MPG at Gamma, both spin parities.
"""
from pathlib import Path
import copy
import hashlib
import json
import sys
import time
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
import symmetry_core as core

sg = json.loads((ROOT / 'dist/data/space-groups.json').read_text(encoding='utf8'))['groups']
msg = json.loads((ROOT / 'dist/data/magnetic-groups.json').read_text(encoding='utf8'))['groups']
mpg = json.loads((ROOT / 'dist/data/points.json').read_text(encoding='utf8'))['points']
by_msg = {g['id']: g for g in msg}
fixture = json.loads((ROOT / 'scripts/fixtures/python-symmetry-reference.json').read_text(encoding='utf8'))
started = time.perf_counter()


def same(actual, expected, tolerance=3e-7):
    a = np.asarray([core._complex(z) for z in actual])
    b = np.asarray([core._complex(z) for z in expected])
    assert a.shape == b.shape
    assert np.max(abs(a-b), initial=0) < tolerance, (a, b)


def reject(callback):
    try:
        callback()
    except (ValueError, TypeError, KeyError, IndexError):
        return
    raise AssertionError('Invalid input unexpectedly accepted')


def group_for(case):
    return sg[case['id'] - 1] if case['kind'] == 'sg' else by_msg[case['id']]


max_error, count = 0., 0
for case_index,case in enumerate(fixture['analyses']):
    group = group_for(case)
    a = core.analyze_group({'operations': group['operations'], 'basis': group.get('basis'),
                            'k': case['k'], 'doubleValued': case['doubleValued']})
    assert a['groupOrder'] == case['groupOrder']
    assert a['littleGroup']['order'] == case['littleOrder']
    assert a['littleGroup']['unitaryOrder'] == case['unitaryOrder']
    assert len(a['star']) == len(case['star'])
    for actual_arm, expected_arm in zip(a['star'],case['star']):
        assert actual_arm['operationIndices'] == expected_arm['operationIndices']
        same(actual_arm['k'],expected_arm['k'],1e-12)
    for key, char_key in [('irreps','characters'),('corepresentations','unitaryCharacters')]:
        assert len(a[key]) == len(case[key])
        for actual, expected in zip(a[key], case[key]):
            assert actual['id'] == expected['id']
            assert actual['dimension'] == expected['dimension']
            if key == 'corepresentations':
                assert actual['type'] == expected['type']
                assert actual['wignerIndicator'] == expected['wignerIndicator']
            same(actual[char_key], expected[char_key])
    max_error = max(max_error, a['validation']['productError'], a['validation']['unitarityError'],
                    *(r['validation']['productError'] for r in a['corepresentations']))
    for i, expected in enumerate(case['induced']):
        induced = core.induce_representation({'group': group, 'k': case['k'], 'analysis': a, 'irrepIndex': i})
        assert induced['id'] == expected['id'] and induced['dimension'] == expected['dimension']
        same(induced['unitaryCharacters'], expected['unitaryCharacters'])
        assert induced['validation']['passed']
        max_error = max(max_error, induced['validation']['multiplicationError'], induced['validation']['translationError'])
        shifted = core.induced_operation_matrix(induced, 0, [1,-1,2])
        assert len(shifted) == induced['dimension']
        count += 1
    if (case_index+1)%20==0:
        print(f'PASS reference {case_index+1}/{len(fixture["analyses"])}; {count} full representations',flush=True)
print(f"PASS {len(fixture['analyses'])} JS reference analyses and {count} induced matrix laws",flush=True)

for case in fixture['products']:
    result = core.decompose_star_product({**case, 'group': group_for(case)})
    assert result['productDimension'] == result['decomposedDimension'] == case['productDimension']
    assert len(result['outputs']) == len(case['outputs'])
    for actual, expected in zip(result['outputs'], case['outputs']):
        assert np.max(abs(np.asarray(actual['k'])-expected['k'])) < 1e-8
        assert actual['sectorDimension'] == expected['sectorDimension']
        keys = ['id','dimension','multiplicity']
        assert [{k:t[k] for k in keys} for t in actual['terms']] == [{k:t[k] for k in keys} for t in expected['terms']]
print(f"PASS {len(fixture['products'])} ordinary/magnetic k-star tensor reference decompositions",flush=True)

text = (ROOT / 'dist/examples/trace-msg.txt').read_text(encoding='utf8')
trace = core.parse_trace(text)
assert trace['nelec'] == 36 and trace['soc'] == 1 and trace['bandCount'] == 4
group = by_msg['166.101']
mapped = core.match_trace_operations(trace, group)
assert sum(m['spinSign'] == -1 for m in mapped['mapping']) == 2
a = core.analyze_group({'operations':group['operations'],'basis':group.get('basis'),'doubleValued':True})
bands = core.run('match_bands',{'group':group,'analysis':a,'text':text,'k':[0,0,0],'doubleValued':True})['bands']
for actual, expected in zip(bands, fixture['traceBands']):
    assert actual['index'] == expected['index'] and actual['energy'] == expected['energy']
    assert actual['degeneracy'] == actual['terms']['dimension'] == expected['degeneracy']
    assert [{k:t[k] for k in ['id','dimension','multiplicity']} for t in actual['terms']['terms']] == expected['terms']
    assert actual['terms']['reconstructionError'] < 1e-8
translated = copy.deepcopy(trace)
translated['operations'][0]['translation'][0] += 1
translated['kpoints'][0]['k'] = [.25,0,0]
same(core.match_trace_operations(translated,group)['kpoints'][0]['bands'][0]['characters'][0], [0,2])
spin_lift = copy.deepcopy(trace)
spin_lift['operations'][0]['spinRotation'] = (-np.asarray(spin_lift['operations'][0]['spinRotation'])).tolist()
assert core.match_trace_operations(spin_lift,group)['kpoints'][0]['bands'][0]['characters'][0][0] == -2
ordinary_trace = core.parse_trace((ROOT/'scripts/fixtures/trace-sg186.txt').read_text(encoding='utf8'))
assert ordinary_trace['format'] == 'vasp2trace' and ordinary_trace['bandCount'] == 4
reject(lambda: core.match_trace_operations(ordinary_trace,sg[185]))
reject(lambda: core.match_trace_operations(trace,by_msg['1.1']))
reject(lambda: core.parse_trace(text,100))
reject(lambda: core.parse_trace(text.replace('-11.456165','NaN')))
reject(lambda: core.parse_trace('\n'.join(text.splitlines()[:12])))
reject(lambda: core.run('match_bands',{'group':group,'analysis':a,'text':text,'doubleValued':False}))
print('PASS real trace, spin basis, opposite lift, Bloch phase and malformed-input checks',flush=True)

identity = {'rotation':np.eye(3,dtype=int).tolist(),'translation':[0,0,0]}
reject(lambda:core.build_multiplication_table([identity,identity]))
reject(lambda:core.analyze_group({'operations':[identity],'k':[float('nan'),0,0]}))
gray = core.analyze_group({'operations':[identity,{**identity,'antiunitary':True}],'doubleValued':True})
assert gray['corepresentations'][0]['type']=='b'
assert core.decompose_corepresentation_characters([4],gray['corepresentations'])['dimension']==4
reject(lambda:core.decompose_corepresentation_characters([1],gray['corepresentations']))
c3v=core.analyze_group({'operations':sg[155]['operations']})
rep=next(r for r in c3v['irreps'] if r['dimension']==2)
f=c3v['littleGroup']['unitaryFactors']
direct=core.direct_product({'left':rep,'right':rep,'targetIrreps':c3v['irreps'],
                           'leftFactors':f,'rightFactors':f,'targetFactors':f})
assert direct['dimension']==4 and [t['multiplicity'] for t in direct['terms']]==[1,1,1]
json_result=core.run_json('analyze',json.dumps({'operations':[identity]}))
assert json.loads(json_result)['irreps'][0]['dimension']==1
print('PASS antiunitary normalization, integral decomposition, direct products, JSON bridge and rejected bad inputs',flush=True)

scan_count = 0
if '--all' in sys.argv:
    for kind, groups in [('SG',sg),('MSG',msg),('MPG',mpg)]:
        for index, group in enumerate(groups):
            ks=[[0,0,0]] if kind=='MPG' else [[0,0,0],[.5,.5,.5],[.173,.271,.389]]
            for k in ks:
                for double in [False,True]:
                    result=core.analyze_group({'operations':group['operations'],'basis':group.get('basis'),
                                               'k':k,'doubleValued':double,'includeMatrices':False})
                    max_error=max(max_error,result['validation']['productError'],
                                  *(r['validation']['productError'] for r in result['corepresentations']))
                    scan_count+=1
            if (index+1)%100==0 or index==len(groups)-1:
                print(f'PASS scan {kind} {index+1}/{len(groups)}; {scan_count} analyses',flush=True)

report={'passed':True,'engine':'dist/python/symmetry_core.py','numpyVersion':np.__version__,
        'sourceSha256':hashlib.sha256((ROOT/'dist/python/symmetry_core.py').read_bytes()).hexdigest(),
        'referenceAnalyses':len(fixture['analyses']),'inducedRepresentations':count,
        'tensorProducts':len(fixture['products']),'allGroupScan':scan_count,
        'maxMatrixLawError':max_error,'elapsedSeconds':round(time.perf_counter()-started,2)}
if '--all' in sys.argv:
    report.update(groups={'ordinary':len(sg),'magnetic':len(msg),'magneticPoint':len(mpg)},
                  momenta=['Gamma','(1/2,1/2,1/2)','(0.173,0.271,0.389)'],
                  magneticPointMomenta=['Gamma'],spins=['single-valued','double-valued'])
    (ROOT/'dist/data/python-symmetry-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
