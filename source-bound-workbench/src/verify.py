"""Exact reception for complete real affine finite sources on a unit cube.

This small adapter proves sufficient signed-form inequalities. It neither runs
DFT nor interprets failed sufficient bounds as physical gap closure.
"""
from __future__ import annotations
import argparse
from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path
import re
import sys
from typing import Any

SCHEMA = 'source-bound-affine-v1'
RECEIPT = 'source-bound-receipt-v1'
MAX_BYTES = 1_000_000
MAX_DIM = 12
MAX_PARAMETER_DIM = 3
MAX_SAFE_INTEGER = 2**53 - 1
SCOPE = ('Exact rational sufficient certification for the submitted real symmetric '
         'affine finite family on the full unit cube. A source identifier is a label; '
         'the canonical SHA256 binds the submitted source descriptor. This adapter '
         'does not authenticate physical provenance, run DFT, certify topology, or '
         'recompute the archived QE/Fe/Bi matrix proofs.')

class PacketError(ValueError):
    def __init__(self, code: str, detail: str):
        self.code = code
        super().__init__(detail)

def require(ok, code, detail):
    if not ok:
        raise PacketError(code, detail)

def keys(obj, required, optional=(), path='object'):
    require(type(obj) is dict, 'SCHEMA_INVALID', f'{path} must be an object')
    require(set(required) <= set(obj), 'SCHEMA_INVALID', f'{path} is missing required fields')
    require(set(obj) <= set(required) | set(optional), 'UNSUPPORTED_FIELD', f'{path} contains unsupported fields')

def rat(x, path='rational'):
    if type(x) is int:
        require(abs(x) <= MAX_SAFE_INTEGER, 'RATIONAL_INVALID', f'{path}: integer exceeds shared safe range')
        return Fraction(x)
    require(type(x) is str and 0 < len(x) <= 128, 'RATIONAL_INVALID', f'{path}: use an exact rational string or safe integer')
    require(bool(re.fullmatch(r'[+-]?(?:[0-9]+(?:\.[0-9]+)?|[0-9]+/[0-9]+)', x)), 'RATIONAL_INVALID', f'{path}: invalid exact rational syntax')
    try:
        f = Fraction(x)
    except (ValueError, ZeroDivisionError):
        raise PacketError('RATIONAL_INVALID', f'{path}: invalid denominator')
    require(f.numerator.bit_length() <= 512 and f.denominator.bit_length() <= 512, 'RATIONAL_INVALID', f'{path}: rational is too large')
    return f

def matrix(x, rows, cols, path):
    require(type(x) is list and len(x) == rows, 'DIMENSION_MISMATCH', f'{path}: expected {rows} explicit rows')
    out = []
    for i,row in enumerate(x):
        require(type(row) is list and len(row) == cols, 'DIMENSION_MISMATCH', f'{path}[{i}]: expected {cols} explicit entries')
        out.append([rat(v, f'{path}[{i}][{j}]') for j,v in enumerate(row)])
    return out

def transpose(a): return [list(x) for x in zip(*a)]
def mm(a,b):
    bt=transpose(b)
    return [[sum((x*y for x,y in zip(row,col)), Fraction(0)) for col in bt] for row in a]
def identity(n): return [[Fraction(i==j) for j in range(n)] for i in range(n)]
def zero(n): return [[Fraction(0) for _ in range(n)] for _ in range(n)]
def shifted(a,c): return [[x-(c if i==j else 0) for j,x in enumerate(row)] for i,row in enumerate(a)]
def negate(a): return [[-x for x in row] for row in a]
def add(a,b): return [[x+y for x,y in zip(row,s)] for row,s in zip(a,b)]
def congruence(a,q): return mm(transpose(q),mm(a,q))
def flatten(a): return [x for row in a for x in row]
def exact_text(x): return str(x)

def ldl_positive(a):
    """Sylvester/LDL positive-definiteness test, entirely over Fraction.

    Positive leading pivots prove strict positive definiteness. A nonpositive
    pivot is a failed sufficient witness, not a declaration of a physical gap.
    """
    n=len(a);l=identity(n);d=[]
    for j in range(n):
        pivot=a[j][j]-sum((l[j][k]*l[j][k]*d[k] for k in range(j)),Fraction(0))
        d.append(pivot)
        if pivot <= 0:
            return False,[str(x) for x in d]
        for i in range(j+1,n):
            l[i][j]=(a[i][j]-sum((l[i][k]*l[j][k]*d[k] for k in range(j)),Fraction(0)))/pivot
    return True,[str(x) for x in d]

def parse_packet(p):
    keys(p,['schema','source','request'],['symmetry','periodic_axes'],'packet')
    require(p['schema']==SCHEMA,'SCHEMA_UNSUPPORTED',f'Only {SCHEMA} is supported')
    s=p['source'];keys(s,['id','dimension','parameters','H0','H_affine'],path='source')
    require(type(s['id']) is str and bool(s['id'].strip()) and len(s['id'])<=120 and not any(0xD800<=ord(c)<=0xDFFF for c in s['id']),'SCHEMA_INVALID','source.id must be a nonempty label of at most120 characters')
    n=s['dimension'];require(type(n) is int and 2<=n<=MAX_DIM,'SCHEMA_INVALID','dimension must be2..12')
    params=s['parameters'];require(type(params) is list and len(params)<=MAX_PARAMETER_DIM,'SCHEMA_INVALID','parameters must contain0..3 names')
    require(all(type(x) is str and re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,31}',x) for x in params),'SCHEMA_INVALID','parameter names must be short identifiers')
    require(len(params)==len(set(params)),'SCHEMA_INVALID','parameter names must be distinct')
    d=len(params);h0=matrix(s['H0'],n,n,'source.H0')
    require(type(s['H_affine']) is list and len(s['H_affine'])==d,'DIMENSION_MISMATCH','one coefficient matrix is required per parameter')
    hs=[matrix(x,n,n,f'source.H_affine[{i}]') for i,x in enumerate(s['H_affine'])]
    for i,h in enumerate([h0]+hs):
        require(h==transpose(h),'SOURCE_NOT_SYMMETRIC',f'source coefficient {i} is not exactly real symmetric')
    req=p['request'];keys(req,['rank','cuts','Q_minus','Q_plus'],path='request')
    r=req['rank'];require(type(r) is int and 1<=r<n,'SCHEMA_INVALID','rank must be1..dimension-1')
    keys(req['cuts'],['lower','upper'],path='request.cuts')
    a=rat(req['cuts']['lower'],'cuts.lower');b=rat(req['cuts']['upper'],'cuts.upper')
    require(a<b,'CUT_ORDER_INVALID','strictly separated cuts lower<upper are required')
    qm=matrix(req['Q_minus'],n,r,'request.Q_minus');qp=matrix(req['Q_plus'],n,n-r,'request.Q_plus')
    sym=None
    if 'symmetry' in p:
        keys(p['symmetry'],['V','D'],path='symmetry')
        sym=(matrix(p['symmetry']['V'],n,n,'symmetry.V'),matrix(p['symmetry']['D'],r,r,'symmetry.D'))
    axes=p.get('periodic_axes',[])
    require(type(axes) is list and all(type(x) is int and 0<=x<d for x in axes),'SCHEMA_INVALID','periodic_axes must be existing zero-based parameter indices')
    require(len(axes)==len(set(axes)),'SCHEMA_INVALID','periodic_axes must be distinct')
    return s,n,d,h0,hs,req,r,a,b,qm,qp,sym,axes

def verify(packet: Any):
    receipt={'schema':RECEIPT,'status':'REJECTED','checks':{},'reason_codes':[],'scope':SCOPE}
    try:
        s,n,d,h0,hs,req,r,a,b,qm,qp,sym,axes=parse_packet(packet)
    except PacketError as exc:
        receipt['reason_codes']=[exc.code];receipt['message']=str(exc);return receipt
    canonical=json.dumps(s,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    receipt['input_sha256']=hashlib.sha256(json.dumps(packet,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')).hexdigest()
    receipt['source']={'id':s['id'],'dimension':n,'parameters':s['parameters'],'canonical_sha256':hashlib.sha256(canonical).hexdigest()}
    receipt['request']={'rank':r,'cuts':{'lower':str(a),'upper':str(b)}}
    checks=receipt['checks'];checks['source_dimensions_and_symmetry']={'status':'PASS','coefficients_checked':d+1}
    checks['complete_carrier']={'status':'PASS','dimension':n,'negative_directions':r,'positive_directions':n-r,'omitted_directions':0}
    q=[qm[i]+qp[i] for i in range(n)]
    full,pivots=ldl_positive(mm(transpose(q),q))
    checks['trial_full_rank']={'status':'PASS' if full else 'FAIL','gram_pivots':pivots}
    reasons=[]
    if not full: reasons.append('TRIAL_NOT_FULL_RANK')
    vertices=[];spectral=True
    for t in itertools.product([0,1],repeat=d):
        h=[row[:] for row in h0]
        for ti,hi in zip(t,hs):
            if ti:h=add(h,hi)
        neg,neg_piv=ldl_positive(negate(congruence(shifted(h,a),qm)))
        pos,pos_piv=ldl_positive(congruence(shifted(h,b),qp))
        vertices.append({'vertex':list(t),'negative_form':{'status':'PASS' if neg else 'FAIL','ldl_pivots':neg_piv},'positive_form':{'status':'PASS' if pos else 'FAIL','ldl_pivots':pos_piv}})
        spectral=spectral and neg and pos
    checks['spectral_counts']={'status':'PASS' if spectral else 'FAIL','vertices_checked':len(vertices),'vertices':vertices,'method':'Exact signed-form LDL at every vertex; affine convexity covers the full closed cube.'}
    if not spectral:reasons.append('SIGNED_FORMS_UNRESOLVED')
    symmetry=True
    if sym is None:
        checks['symmetry']={'status':'NOT_REQUESTED','claim':'No symmetry representation is assigned.'}
    else:
        v,action=sym
        gram=mm(transpose(qm),qm)==identity(r)
        orth=mm(transpose(v),v)==identity(n)
        cov=all(mm(v,h)==mm(h,v) for h in [h0]+hs)
        bound=mm(v,qm)==mm(qm,action)
        orth_d=mm(transpose(action),action)==identity(r)
        symmetry=gram and orth and cov and bound and orth_d
        checks['symmetry']={'status':'PASS' if symmetry else 'FAIL','profile':'One real orthogonal action commuting coefficientwise; exact isometric lower-frame intertwiner. No group/topological inference.','lower_embedding_orthonormal':gram,'ambient_orthogonal':orth,'source_covariance':cov,'embedding_intertwiner':bound,'restricted_orthogonal':orth_d}
        if not symmetry:reasons.append('SYMMETRY_BINDING_INVALID')
    period=all(all(x==0 for x in flatten(hs[i])) for i in axes)
    checks['periodicity']={'status':('PASS' if period else 'FAIL') if axes else 'NOT_REQUESTED','axes':axes,'profile':'Identity periodic maps; each requested direction must have a zero affine coefficient. No nonconstant affine period is accepted.'}
    if not period:reasons.append('PERIODICITY_IDENTITY_FAILED')
    receipt['reason_codes']=reasons
    if not symmetry or not period:
        receipt['status']='REJECTED';receipt['message']='A submitted symmetry or periodic identity is violated.'
    elif not full or not spectral:
        receipt['status']='UNRESOLVED';receipt['message']='The submitted sufficient signed-form witness did not certify the requested common interval; no physical gap closure follows.'
    else:
        receipt['status']='CERTIFIED';receipt['message']='Complete ordered counts and all requested optional identities passed exact reception.'
        receipt['conclusion']={'rank':r,'dimension':n,'common_interval':{'lower':str(a),'upper':str(b)},'gap_lower_bound':str(b-a),'inequality':'lambda_r(t) < lower < upper < lambda_(r+1)(t) on the full unit cube; indirect separation >= gap_lower_bound.','domain':{'kind':'closed-unit-cube','dimension':d},'symmetry_action_bound':sym is not None,'identity_periodic_axes':axes,'topology_certified':False}
    return receipt

def no_duplicates(pairs):
    out={}
    for k,v in pairs:
        if k in out:raise PacketError('DUPLICATE_KEY',f'Duplicate JSON field: {k}')
        out[k]=v
    return out

def load_packet(path):
    raw=Path(path).read_bytes()
    require(len(raw)<=MAX_BYTES,'INPUT_TOO_LARGE','Packet exceeds1MB')
    try:return json.loads(raw.decode('utf-8'),object_pairs_hook=no_duplicates,parse_constant=lambda s: (_ for _ in ()).throw(PacketError('SCHEMA_INVALID','Nonfinite JSON constants are forbidden')))
    except (UnicodeDecodeError,json.JSONDecodeError,RecursionError) as exc:raise PacketError('JSON_INVALID',str(exc))

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('packet',help='Exact finite-source JSON input')
    parser.add_argument('--out',help='New receipt file; existing files are never replaced')
    args=parser.parse_args(argv)
    try:report=verify(load_packet(args.packet))
    except (PacketError,OSError) as exc:report={'schema':RECEIPT,'status':'REJECTED','reason_codes':[getattr(exc,'code','INPUT_IO_ERROR')],'message':str(exc),'checks':{},'scope':SCOPE}
    rendered=json.dumps(report,indent=2,ensure_ascii=False)+'\n'
    if args.out:
        target=Path(args.out);target.parent.mkdir(parents=True,exist_ok=True)
        try:
            with target.open('x',encoding='utf-8',newline='\n') as stream:stream.write(rendered)
        except FileExistsError:
            print('Refusing to overwrite an existing receipt.',file=sys.stderr);return 4
        except OSError as exc:
            print(f'Could not write a new receipt: {exc}',file=sys.stderr);return 4
    else:sys.stdout.write(rendered)
    return {'CERTIFIED':0,'UNRESOLVED':2,'REJECTED':3}[report['status']]

if __name__=='__main__':raise SystemExit(main())
