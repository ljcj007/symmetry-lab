"""Capture five malformed-answer and two rejected-source API messages.

This small display fixture does not modify the scientific reference. Expected
values are recomputed by the actual source-bound grade action on every request.
"""
from copy import deepcopy
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))


def inputs():
    return [
        ('wrong-complex-keys',{'re':[[1.,2.,3.]],'imag':[[0.,0.,0.]]}),
        ('complex-shape-mismatch',{'re':[[1.,2.,3.]],'im':[[0.,0.]]}),
        ('finite-component-over-limit',{'re':[[1e9,0.,0.]],'im':[[0.,0.,0.]]}),
        ('nonzero-imaginary-real-task',{'re':[[1.,2.,3.]],'im':[[0.,0.,1.]]}),
        ('wrong-task-shape',{'re':[[0.]],'im':[[0.]]}),
    ]


def build(check=False):
    from browser_api import run
    reference_path='scripts/fixtures/phonopy-derivation.json'
    references=json.loads((ROOT/reference_path).read_text(encoding='utf8'))
    reference=next(case for case in references['cases'] if case['id']=='zno-two-G')
    task_id='A.QCartesian';fingerprint=reference['result']['fingerprint'];cases=[]
    for case_id,answer in inputs():
        request=deepcopy(reference['input'])
        request.update(mode='grade',forFingerprint=fingerprint,answers={task_id:deepcopy(answer)})
        result=run('phonopy_derivation',request)
        assert result['fingerprint']==fingerprint
        feedback=next(row for row in result['grading']['checks'] if row['taskId']==task_id)
        assert feedback['status']=='malformed' and not feedback['passed']
        cases.append({'caseId':case_id,'answer':answer,'forFingerprint':fingerprint,
            'feedback':feedback['feedback'],'status':feedback['status'],'taskId':task_id})
    request_errors=[]
    for case_id,shift in [('source-G-wrong-length',[1,0]),('source-G-noninteger',[1,1.25,0])]:
        request=deepcopy(reference['input']);request['input']['G']=deepcopy(shift)
        try:run('phonopy_derivation',request)
        except ValueError as error:
            request_errors.append({'caseId':case_id,'scientificInputPatch':{'G':shift},
                'message':str(error),'status':'rejected'})
        else:raise AssertionError('Invalid original G was accepted: '+case_id)
    module='dist/python/phonopy_derivation.py'
    document={'schema':'symmetry-lab-phonopy-derivation-messages-1',
        'method':'Seven actual browser_api.run(phonopy_derivation) requests: five grade requests using the complete pinned zno-two-G scientific input and its verified fingerprint, plus two genuinely rejected derive requests with invalid original G. Grade feedback and source-request errors are separate; no fabricated messages or NumPy ragged-array strings.',
        'sourceEvidence':{'module':module,'normalization':'utf8-lf-v1',
            'moduleSHA256':hashlib.sha256((ROOT/module).read_text(encoding='utf8').encode('utf8')).hexdigest(),
            'referenceFixture':reference_path,'referenceCaseId':reference['id'],'referenceFingerprint':fingerprint},
        'cases':cases,'requestErrors':request_errors}
    body=(json.dumps(document,ensure_ascii=False,indent=2,allow_nan=False)+'\n').encode('utf8')
    target=ROOT/'scripts/fixtures/phonopy-derivation-messages.json'
    if check:
        assert body==target.read_bytes(),'Malformed-answer message fixture differs byte-for-byte from actual API calls'
    else:target.write_bytes(body)
    print(json.dumps({'actualAPIRequests':len(cases)+len(request_errors),'cases':len(cases),
        'requestErrors':len(request_errors),'bytes':len(body),'checked':check}))
    return document


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    build(parser.parse_args().check)
