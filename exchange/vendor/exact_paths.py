"""Independent Q(zeta_8) finite-Fourier semilinear path arithmetic.

No imports from prior producers, certificate verifiers, SymPy or NumPy.
The field is Q[x]/(x**4+1); every coefficient operation is rational.
"""
from fractions import Fraction as F
from itertools import combinations
import re

ZERO = (F(0),)*4
ONE = (F(1),F(0),F(0),F(0))
O = (F(0),)*3
I3 = tuple(tuple(F(i==j) for j in range(3)) for i in range(3))


class Budget(Exception):
    pass


def rational(value):
    if type(value) is int:
        if value.bit_length()>256:raise Budget('integer encoding bit budget')
    elif type(value) is str:
        if len(value)>160:raise Budget('rational encoding length budget')
        if not re.fullmatch(r'[+-]?\d+(?:/[+-]?\d+)?',value):raise ValueError('rational must be an integer or integer fraction string')
    elif isinstance(value,F):
        return value
    else:raise ValueError('rational encoding must be string or integer, never bool or float')
    q=F(value)
    if q.numerator.bit_length()>256 or q.denominator.bit_length()>256:raise Budget('rational encoding bit budget')
    return q


def tree(value):
    stack=[(value,0)];count=0
    while stack:
        v,depth=stack.pop();count+=1
        if depth>64 or count>250000:raise Budget('JSON tree depth or node budget')
        if isinstance(v,dict):
            if any(type(k) is not str for k in v):raise ValueError('JSON object keys must be strings')
            stack.extend((x,depth+1) for x in v.values())
        elif isinstance(v,list):stack.extend((x,depth+1) for x in v)
        elif type(v) is int:
            if v.bit_length()>256:raise Budget('JSON integer bit budget')
        elif type(v) not in (str,bool,type(None)):raise ValueError('exact witness JSON excludes floating-point values')


def validate_problem(p):
    tree(p)
    if not isinstance(p,dict) or set(p)!={'schema','id','field_conductor','rank','domain','edges','relations','provenance'}:raise ValueError('problem keys')
    if p['schema']!='symmetry-lab.exact-path-witness.problem.v1':raise ValueError('unsupported problem schema')
    if type(p['field_conductor']) is not int:raise ValueError('integer conductor required')
    if p['field_conductor']!=8:raise Budget('only Q(zeta_8) is implemented')
    if type(p['rank']) is not int:raise ValueError('integer rank required')
    if not 1<=p['rank']<=4:raise Budget('rank outside 1..4')
    d=p['domain']
    if not isinstance(d,dict) or set(d)!={'origin','tangents'}:raise ValueError('domain keys')
    restrict(eye(p['rank']),d)
    if not isinstance(p['edges'],list) or not p['edges']:raise ValueError('nonempty edge list required')
    if len(p['edges'])>4096:raise Budget('edge count budget')
    for e in p['edges']:
        if not isinstance(e,dict) or set(e)!={'id','source','target','anti','map','matrix'}:raise ValueError('edge keys')
        if any(type(e[k]) is not str or not e[k] or len(e[k])>128 for k in ('id','source','target')):raise ValueError('edge identifiers')
        if type(e['anti']) is not bool:raise ValueError('boolean edge semilinearity required')
        affine(e['map'])
        if len(decode_matrix(e['matrix']))!=p['rank']:raise ValueError('edge rank mismatch')
    if len({e['id'] for e in p['edges']})!=len(p['edges']):raise ValueError('duplicate edges')
    if not isinstance(p['relations'],list) or not p['relations']:raise ValueError('nonempty relation list required')
    if len(p['relations'])>4096:raise Budget('relation count budget')
    ids={e['id'] for e in p['edges']}
    for r in p['relations']:
        if not isinstance(r,dict) or set(r)!={'id','left','right'}:raise ValueError('relation keys')
        if type(r['id']) is not str or not r['id'] or len(r['id'])>128:raise ValueError('relation identifier')
        for key in ('left','right'):
            if not isinstance(r[key],list) or not 1<=len(r[key])<=32:raise ValueError('nonempty path of length at most 32 required')
            if any(type(x) is not str or x not in ids for x in r[key]):raise ValueError('unknown path edge')
    if len({r['id'] for r in p['relations']})!=len(p['relations']):raise ValueError('duplicate relations')


def fadd(a,b): return tuple(x+y for x,y in zip(a,b))
def fneg(a): return tuple(-x for x in a)
def fmul(a,b):
    out=[F(0)]*4
    for i,x in enumerate(a):
        for j,y in enumerate(b):
            k=i+j;out[k%4]+=(-1 if k>=4 else 1)*x*y
    return tuple(out)
def root(phase):
    x=8*rational(phase)
    if x.denominator!=1: raise Budget('phase outside the declared Q(zeta_8) witness field')
    k=int(x)%8;out=[F(0)]*4;out[k%4]=F(1 if k<4 else -1)
    return tuple(out)
def fconj(a):
    out=ZERO
    for j,x in enumerate(a):out=fadd(out,tuple(x*y for y in root(F(-j,8))))
    return out
def finv(a):
    if a==ZERO:raise ValueError('division by zero')
    cols=[fmul(a,tuple(F(i==j) for i in range(4))) for j in range(4)]
    rows=[[cols[j][i] for j in range(4)]+[F(i==0)] for i in range(4)]
    for j in range(4):
        k=next(k for k in range(j,4) if rows[k][j]);rows[j],rows[k]=rows[k],rows[j]
        pivot=rows[j][j];rows[j]=[x/pivot for x in rows[j]]
        for k in range(4):
            if k!=j:
                q=rows[k][j];rows[k]=[x-q*y for x,y in zip(rows[k],rows[j])]
    return tuple(row[-1] for row in rows)


def clean(p):return {k:v for k,v in p.items() if v!=ZERO}
def padd(a,b):
    out=dict(a)
    for k,v in b.items():out[k]=fadd(out.get(k,ZERO),v)
    return clean(out)
def pneg(a):return {k:fneg(v) for k,v in a.items()}
def pmul(a,b):
    if len(a)*len(b)>200000:raise Budget('Fourier product term budget')
    out={}
    for u,x in a.items():
        for v,y in b.items():
            k=tuple(i+j for i,j in zip(u,v));out[k]=fadd(out.get(k,ZERO),fmul(x,y))
    return clean(out)
def pconj(a):return {tuple(-x for x in k):fconj(v) for k,v in a.items()}
def pconst(value=1):return {} if not value else {O:(F(value),F(0),F(0),F(0))}
def pullback(a,A=I3,b=O):
    out={}
    for nu,c in a.items():
        frequency=tuple(sum(nu[i]*A[i][j] for i in range(3)) for j in range(3))
        phase=sum(x*y for x,y in zip(nu,b))
        out[frequency]=fadd(out.get(frequency,ZERO),fmul(c,root(phase)))
    return clean(out)
def decode_entry(raw):
    if not isinstance(raw,list) or len(raw)>4096:raise ValueError('invalid Fourier entry')
    out={}
    for t in raw:
        if set(t)!={'coefficient','phase','frequency'}:raise ValueError('invalid Fourier term keys')
        k=tuple(rational(v) for v in t['frequency'])
        if len(k)!=3:raise ValueError('three frequencies required')
        v=tuple(rational(t['coefficient'])*x for x in root(t['phase']))
        out[k]=fadd(out.get(k,ZERO),v)
    return clean(out)
def encode_entry(p):
    return [{'coefficient':str(c),'phase':str(F(j,8)),'frequency':[str(v) for v in k]}
            for k,a in sorted(p.items()) for j,c in enumerate(a) if c]
def decode_matrix(raw):
    if not isinstance(raw,list) or not raw:raise ValueError('nonempty matrix list required')
    if len(raw)>4:raise Budget('matrix rank exceeds 4')
    if any(not isinstance(row,list) or len(row)!=len(raw) for row in raw):raise ValueError('square matrix required')
    return [[decode_entry(x) for x in row] for row in raw]
def encode_matrix(m):return [[encode_entry(x) for x in row] for row in m]
def eye(n):return [[pconst(i==j) for j in range(n)] for i in range(n)]
def zero(n):return [[{} for _ in range(n)] for _ in range(n)]
def add(a,b):return [[padd(x,y) for x,y in zip(r,s)] for r,s in zip(a,b)]
def neg(a):return [[pneg(x) for x in row] for row in a]
def sub(a,b):return add(a,neg(b))
def mul(a,b):
    n=len(a)
    if len(b)!=n:raise ValueError('matrix dimensions disagree')
    out=zero(n)
    for i in range(n):
        for j in range(n):
            for k in range(n):out[i][j]=padd(out[i][j],pmul(a[i][k],b[k][j]))
    return out
def conj(a):return [[pconj(x) for x in row] for row in a]
def adj(a):return list(map(list,zip(*conj(a))))
def pull(a,A=I3,b=O):return [[pullback(x,A,b) for x in row] for row in a]
def norm2(a):
    out={}
    for row in a:
        for x in row:out=padd(out,pmul(pconj(x),x))
    return out
def iszero(a):return all(not x for row in a for x in row)
def det(m):
    if len(m)==1:return m[0][0]
    out={}
    for j in range(len(m)):
        minor=[[row[k] for k in range(len(m)) if k!=j] for row in m[1:]]
        term=pmul(m[0][j],det(minor));out=padd(out,pneg(term) if j%2 else term)
    return out
def generic_rank(m):
    n=len(m)
    if iszero(m):return 0
    for r in range(n,0,-1):
        for rows in combinations(range(n),r):
            for cols in combinations(range(n),r):
                if det([[m[i][j] for j in cols] for i in rows]):return r
    return 0
def affine(raw):
    if set(raw)!={'linear','shift'}:raise ValueError('affine map keys')
    A=tuple(tuple(rational(x) for x in row) for row in raw['linear']);b=tuple(rational(x) for x in raw['shift'])
    if len(A)!=3 or any(len(row)!=3 for row in A) or len(b)!=3:raise ValueError('three-dimensional affine map required')
    return A,b
def compose_affine(A,b,C,d):
    return (tuple(tuple(sum(A[i][k]*C[k][j] for k in range(3)) for j in range(3)) for i in range(3)),
            tuple(sum(A[i][k]*d[k] for k in range(3))+b[i] for i in range(3)))
def restrict(m,domain):
    o=tuple(rational(x) for x in domain['origin']);t=domain['tangents']
    if len(o)!=3 or len(t)>3 or any(len(v)!=3 for v in t):raise ValueError('invalid affine domain')
    A=tuple(tuple(rational(t[j][i]) if j<len(t) else F(0) for j in range(3)) for i in range(3))
    return pull(m,A,o)
def path(edges,ids,rank):
    if not ids or len(ids)>32:raise ValueError('path length must be 1..32')
    start=edges[ids[0]]['source'];current=start;A,b=I3,O;parity=False;M=eye(rank)
    for name in ids:
        edge=edges[name]
        if edge['source']!=current:raise ValueError('disconnected path')
        if type(edge['anti']) is not bool:raise ValueError('boolean semilinearity required')
        E=decode_matrix(edge['matrix'])
        if len(E)!=rank:raise ValueError('path matrix rank mismatch')
        M=mul(pull(E,A,b),conj(M) if edge['anti'] else M)
        E_A,E_b=affine(edge['map']);A,b=compose_affine(E_A,E_b,A,b)
        parity^=edge['anti'];current=edge['target']
    return {'source':start,'target':current,'linear':A,'shift':b,'anti':parity,'matrix':M}


def relation(edges,row,rank,domain):
    left=path(edges,row['left'],rank);right=path(edges,row['right'],rank)
    for key in ('source','target','linear','shift','anti'):
        if left[key]!=right[key]:raise ValueError('paths do not share '+key)
    residual=restrict(sub(left['matrix'],right['matrix']),domain)
    return {'id':row['id'],'holds':iszero(residual),'residual':encode_matrix(residual),
            'frobenius_norm_squared':encode_entry(norm2(residual)),
            'generic_rank_on_declared_affine_span':generic_rank(residual),
            'semilinearity':left['anti'],'source':left['source'],'target':left['target']}
