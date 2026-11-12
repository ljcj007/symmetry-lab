"""Independent exact-algebra checks against the production exercise bank.

All entries lie in Q(sqrt(2),sqrt(3),i).  No floating-point tolerance or website
implementation is used for the mathematical assertions. General continuity and
representation statements still need the accompanying analytic argument; finite
examples do not establish them by enumeration.
"""
from fractions import Fraction as F
from itertools import permutations
from pathlib import Path
import ast
import json
import re

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT

class Q:
    """Basis order 1,sqrt2,sqrt3,sqrt6,i,i*sqrt2,i*sqrt3,i*sqrt6."""
    def __init__(self,value=0,coefficients=None):
        self.c=tuple(F(x) for x in coefficients) if coefficients is not None else (F(value),)+(F(0),)*7
        assert len(self.c)==8
    @classmethod
    def basis(cls,n):return cls(coefficients=[int(j==n) for j in range(8)])
    @staticmethod
    def coerce(x):return x if isinstance(x,Q) else Q(x)
    def __add__(self,other):
        other=Q.coerce(other);return Q(coefficients=[a+b for a,b in zip(self.c,other.c)])
    __radd__=__add__
    def __neg__(self):return Q(coefficients=[-a for a in self.c])
    def __sub__(self,other):return self+-Q.coerce(other)
    def __rsub__(self,other):return Q.coerce(other)+-self
    def __mul__(self,other):
        other=Q.coerce(other);out=[F(0)]*8
        for a,ca in enumerate(self.c):
            for b,cb in enumerate(other.c):
                factor=(2 if a&b&1 else 1)*(3 if a&b&2 else 1)*(-1 if a&b&4 else 1)
                out[a^b]+=ca*cb*factor
        return Q(coefficients=out)
    __rmul__=__mul__
    def __truediv__(self,rational):return self*(1/F(rational))
    def __eq__(self,other):
        try:return self.c==Q.coerce(other).c
        except (TypeError,ValueError):return False
    def __hash__(self):return hash(self.c)
    def conjugate(self):return Q(coefficients=[-a if n&4 else a for n,a in enumerate(self.c)])
    def __repr__(self):
        names=['1','sqrt(2)','sqrt(3)','sqrt(6)','i','i*sqrt(2)','i*sqrt(3)','i*sqrt(6)']
        parts=[]
        for coefficient,name in zip(self.c,names):
            if coefficient:
                parts.append(str(coefficient) if name=='1' else (name if coefficient==1 else '-'+name if coefficient==-1 else str(coefficient)+'*'+name))
        return ' + '.join(parts).replace('+ -','- ') if parts else '0'

rt2,rt3,ii=Q.basis(1),Q.basis(2),Q.basis(4)
one=Q(1)
def mat(rows):return [[Q.coerce(x) for x in row] for row in rows]
def eye(n):return mat([[int(i==j) for j in range(n)] for i in range(n)])
def zero(n,m=None):return mat([[0]*(n if m is None else m) for _ in range(n)])
def add(A,B):return [[a+b for a,b in zip(ar,br)] for ar,br in zip(A,B)]
def scale(s,A):return [[s*x for x in row] for row in A]
def sub(A,B):return add(A,scale(-1,B))
def mm(A,B):
    assert len(A[0])==len(B)
    return [[sum((A[i][k]*B[k][j] for k in range(len(B))),Q(0)) for j in range(len(B[0]))] for i in range(len(A))]
def dag(A):return [[A[j][i].conjugate() for j in range(len(A))] for i in range(len(A[0]))]
def trace(A):return sum((A[i][i] for i in range(len(A))),Q(0))
def diag(*xs):return mat([[x if i==j else 0 for j in range(len(xs))] for i,x in enumerate(xs)])
def comm(A,B):return sub(mm(A,B),mm(B,A))
def det(A):
    n=len(A);result=Q(0)
    for p in permutations(range(n)):
        sign=(-1)**sum(p[i]>p[j] for i in range(n) for j in range(i+1,n))
        term=Q(sign)
        for i in range(n):term*=A[i][p[i]]
        result+=term
    return result
def kron(A,B):
    return [[a*b for a in ar for b in br] for ar in A for br in B]
def col(*xs):return mat([[x] for x in xs])
def norm(v):return mm(dag(v),v)[0][0]
def expect(v,A):return mm(mm(dag(v),A),v)[0][0]
def powers(x,n):
    a=Q(1)
    for _ in range(n):a*=x
    return a
def printable(x):
    if isinstance(x,Q):return repr(x)
    if isinstance(x,list):return [printable(v) for v in x]
    if isinstance(x,tuple):return [printable(v) for v in x]
    if isinstance(x,dict):return {k:printable(v) for k,v in x.items()}
    return x

checks=[]
def check(name,condition,value=None):
    assert condition,name
    checks.append({'name':name,'passed':True,**({'value':printable(value)} if value is not None else {})})

check('algebra sqrt2 squared',rt2*rt2==2)
check('algebra sqrt3 squared',rt3*rt3==3)
check('algebra i squared',ii*ii==-1)
check('algebra conjugation',ii.conjugate()==-ii)
I2,I3=eye(2),eye(3)
sx,sy,sz=mat([[0,1],[1,0]]),mat([[0,-ii],[ii,0]]),diag(1,-1)
paulis=[sx,sy,sz]
half=F(1,2)
Tx,Ty,Tz=[scale(half,A) for A in paulis]
up=col(1,0)
plus=col(rt2/2,rt2/2)
quarter=scale(rt2/2,sub(I2,scale(ii,sy)))

# Exercise 1: four roots, closure, inverses, and the excluded 45-degree phase.
c4=[powers(ii,n) for n in range(4)]
check('c4 four distinct elements',len(set(c4))==4,c4)
check('c4 fourth power',powers(ii,4)==1)
for m in range(4):
    for n in range(4):
        check(f'c4 product {m},{n}',c4[m]*c4[n]==c4[(m+n)%4])
    check(f'c4 inverse {m}',c4[m]*c4[(-m)%4]==1)
q=(1+ii)*rt2/2
check('45-degree phase unit norm',q*q.conjugate()==1,q)
check('45-degree phase outside c4',q not in c4)
check('45-degree phase square',q*q==ii)
check('a/1000 requires noninteger index',F(1,1000).denominator!=1)

# Exercise 2: unitarity and determinant are distinct exact conditions.
phase_minus=(1-ii)*rt2/2
phase_plus=(1+ii)*rt2/2
U=diag(phase_minus,phase_plus)
V=diag(ii,1)
for name,A in [('U',U),('V',V),('W',quarter)]:
    check(f'{name} unitary',mm(dag(A),A)==I2,A)
check('U determinant one',det(U)==1,det(U))
check('V determinant i',det(V)==ii,det(V))
check('W determinant one',det(quarter)==1)
wup=mm(quarter,up)
check('W sends up to plus',wup==plus,wup)
check('W output norm',norm(wup)==1)
check('W probabilities half',all(x[0]*x[0].conjugate()==half for x in wup))

# Exercise 3: normalization, reversal, anti-Hermitian generators, commuting pair.
check('pauli xy product',mm(sx,sy)==scale(ii,sz))
check('pauli yx product',mm(sy,sx)==scale(-ii,sz))
check('pauli commutator',comm(sx,sy)==scale(2*ii,sz))
check('normalized commutator',comm(Tx,Ty)==scale(ii,Tz),comm(Tx,Ty))
check('reversed commutator',comm(Ty,Tx)==scale(-ii,Tz))
for name,T in zip('xyz',[Tx,Ty,Tz]):
    X=scale(-ii,T)
    check(f'anti-Hermitian X_{name}',dag(X)==scale(-1,X))

# Build the standard eight Gell-Mann generators independently.
l1=mat([[0,1,0],[1,0,0],[0,0,0]])
l2=mat([[0,-ii,0],[ii,0,0],[0,0,0]])
l3=diag(1,-1,0)
l4=mat([[0,0,1],[0,0,0],[1,0,0]])
l5=mat([[0,0,-ii],[0,0,0],[ii,0,0]])
l6=mat([[0,0,0],[0,0,1],[0,1,0]])
l7=mat([[0,0,0],[0,0,-ii],[0,ii,0]])
l8=scale(rt3/3,diag(1,1,-2))
generators=[scale(half,A) for A in [l1,l2,l3,l4,l5,l6,l7,l8]]
T1,T2,T3,T4,T5,T6,T7,T8=generators
check('su3 Cartan pair commutes',comm(T3,T8)==zero(3))
check('su3 not all pairs commute',comm(T1,T2)==scale(ii,T3) and comm(T1,T2)!=zero(3))

# Exercise 4: exact state, probabilities and Bloch counterexample.
state=mm(quarter,up)
bloch=[expect(state,A) for A in paulis]
check('y-quarter matrix',quarter==scale(rt2/2,mat([[1,-1],[1,1]])),quarter)
check('y-quarter state',state==plus,state)
check('y-quarter Bloch +x',bloch==[Q(1),Q(0),Q(0)],bloch)
yplus=col(rt2/2,ii*rt2/2)
check('phase counterexample normalized',norm(yplus)==1)
check('phase counterexample same probabilities',all(yplus[j][0]*yplus[j][0].conjugate()==half for j in range(2)))
check('phase counterexample Bloch +y',[expect(yplus,A) for A in paulis]==[Q(0),Q(1),Q(0)])

# Exercise 5: full controlled operation in path tensor spin space.
minusI2=scale(-1,I2)
zphase_pi=diag(-1,-1)
zphase_2pi=diag(1,1)
check('2pi SU2 rotation',zphase_pi==minusI2 and det(zphase_pi)==1,zphase_pi)
check('4pi SU2 rotation',zphase_2pi==I2)
path_plus=plus
path_minus=col(rt2/2,-rt2/2)
Pplus=mm(path_plus,dag(path_plus))
Pminus=mm(path_minus,dag(path_minus))
controlled=diag(1,1,-1,-1)
both=scale(-1,eye(4))
for name,spin in [('up',up),('plus',plus),('complex',yplus)]:
    initial=kron(path_plus,spin)
    single=mm(controlled,initial)
    common=mm(both,initial)
    check(f'path single-state {name}',single==kron(path_minus,spin))
    check(f'path initial P+ {name}',expect(initial,kron(Pplus,I2))==1)
    check(f'path single P+ {name}',expect(single,kron(Pplus,I2))==0)
    check(f'path single P- {name}',expect(single,kron(Pminus,I2))==1)
    check(f'path both P+ {name}',expect(common,kron(Pplus,I2))==1)
    check(f'path both P- {name}',expect(common,kron(Pminus,I2))==0)
    check(f'isolated density invariant {name}',mm(spin,dag(spin))==mm(scale(-1,spin),dag(scale(-1,spin))))

# Exercise 6: central element on spinor versus vector adjoint action.
check('j-half dimension',2*F(1,2)+1==2)
check('j-one dimension',2*F(1)+1==3)
check('center spinor order two',mm(minusI2,minusI2)==I2)
for name,A in zip('xyz',paulis):
    check(f'center vector action {name}',mm(mm(minusI2,A),dag(minusI2))==A)
check('vector center kernel has two distinct examples',minusI2!=I2)
check('su2 and su3 real dimensions differ',3!=8)

# Exercise 7: exact generator basis and pi/2pi/4pi transformations.
check('Hermitian parameter count',3+2*3==9)
check('traceless Hermitian parameter count',9-1==8)
for a,Ta in enumerate(generators):
    check(f'Gell-Mann {a+1} Hermitian',dag(Ta)==Ta)
    check(f'Gell-Mann {a+1} traceless',trace(Ta)==0)
    for b,Tb in enumerate(generators):
        check(f'generator Gram {a+1},{b+1}',trace(mm(Ta,Tb))==(half if a==b else 0))
P=diag(1,1,0)
check('lambda1 squared projector',mm(l1,l1)==P)
check('lambda1 cubed lambda1',mm(mm(l1,l1),l1)==l1)
U_pi=mat([[0,-ii,0],[-ii,0,0],[0,0,1]])
U_2pi=diag(-1,-1,1)
U_4pi=I3
check('pi action on e1',mm(U_pi,col(1,0,0))==col(0,-ii,0))
check('pi probabilities',[(x[0]*x[0].conjugate()) for x in mm(U_pi,col(1,0,0))]==[Q(0),Q(1),Q(0)])
check('two pi from two pi-half factors',mm(U_pi,U_pi)==U_2pi,U_2pi)
check('four pi from two two-pi factors',mm(U_2pi,U_2pi)==U_4pi)
for name,A in [('pi',U_pi),('2pi',U_2pi),('4pi',U_4pi)]:
    check(f'su3 {name} unitary',mm(dag(A),A)==I3)
    check(f'su3 {name} determinant',det(A)==1)
check('minus I3 not SU3',det(scale(-1,I3))==-1)
check('2pi is not minus I3',U_2pi!=scale(-1,I3))

# Exercise 8: all six root differences, the highlighted commutators and phases.
weights=[(T3[j][j],T8[j][j]) for j in range(3)]
expected=[(Q(half),rt3/6),(Q(-half),rt3/6),(Q(0),-rt3/3)]
check('basic weights',weights==expected,weights)
roots=[]
for a in range(3):
    for b in range(3):
        if a==b:continue
        E=zero(3);E[a][b]=Q(1)
        root=tuple(weights[a][k]-weights[b][k] for k in range(2));roots.append(root)
        check(f'root commutator T3 E{a+1}{b+1}',comm(T3,E)==scale(root[0],E))
        check(f'root commutator T8 E{a+1}{b+1}',comm(T8,E)==scale(root[1],E))
check('six distinct nonzero roots',len(set(roots))==6 and (Q(0),Q(0)) not in roots,roots)
check('root 12',tuple(weights[0][k]-weights[1][k] for k in range(2))==(Q(1),Q(0)))
check('root 13',tuple(weights[0][k]-weights[2][k] for k in range(2))==(Q(half),rt3/2))
check('root 23',tuple(weights[1][k]-weights[2][k] for k in range(2))==(Q(-half),rt3/2))
psi0=col(rt2/2,rt2/2,0)
U3_quarter=diag(phase_minus,phase_plus,1)
psi1=mm(U3_quarter,psi0)
check('Cartan evolved state',psi1==col((1-ii)/2,(1+ii)/2,0),psi1)
check('Cartan initial norm',norm(psi0)==1)
check('Cartan final norm',norm(psi1)==1)
check('Cartan probabilities unchanged',[x[0]*x[0].conjugate() for x in psi0]==[x[0]*x[0].conjugate() for x in psi1])
mean0=[expect(psi0,A) for A in [T3,T8]]
mean1=[expect(psi1,A) for A in [T3,T8]]
check('Cartan average equal',mean0==mean1==[Q(0),rt3/6],mean0)
check('Cartan average is not a new weight',tuple(mean0) not in weights)
check('nonCartan initial expectation',[expect(psi0,A) for A in [T1,T2]]==[Q(half),Q(0)])
check('nonCartan final expectation',[expect(psi1,A) for A in [T1,T2]]==[Q(0),Q(half)])
check('states are distinct rays',mm(psi0,dag(psi0))!=mm(psi1,dag(psi1)))

# Read the actual production records, not the external authoring drafts.
course_path=REPO/'dist/data/lie-group-lessons.json'
bank_path=REPO/'dist/data/lie-derivations.json'
course=json.loads(course_path.read_text(encoding='utf-8'))
bank=json.loads(bank_path.read_text(encoding='utf-8'))
expected_ids=['continuous-c4-in-u1','unitary-special-two-checks',
              'generators-pauli-normalization','su2-y-quarter-turn-bloch',
              'su2-double-cover-path-phase','representations-center-two-actions',
              'su3-eight-directions-embedded-rotation','su3-weights-roots-phase-record']
exercises=bank['exercises'][:8]
source_ids={x['id'] for x in course['sources']}
required={'id','lessonIds','group','title','prompt','givens','hint','steps','answer','pitfall','check','references'}
check('eight dedicated exercises',len(exercises)==8)
check('production contains forty exercises',len(bank['exercises'])==40)
check('production unique exercise IDs',len({x['id'] for x in bank['exercises']})==40)
check('production introductory order',[x['id'] for x in exercises]==expected_ids)
check('first eight lesson associations',[x['lessonIds'][0] for x in exercises]==[x['id'] for x in course['lessons'][:8]])
check('independent answer indices',[x['check']['answer'] for x in exercises]==[1,1,2,0,1,0,2,0])
expected_presets=['u1-circle-quarter','unitary-z-quarter','generators-xy','spinor-y-quarter',
                  'su2-phase-single','su2-center-actions','su3-t1-half','su3-weight-phase']
check('exact introductory preset IDs',[x['labPreset'] for x in exercises]==expected_presets)
for exercise in exercises:
    name=exercise['id']
    check(name+' fields',required.issubset(exercise))
    check(name+' four steps',len(exercise['steps'])==4 and all({'title','explanation','formula'}.issubset(step) for step in exercise['steps']))
    check(name+' one valid check',len(exercise['check']['choices'])==3 and 0<=exercise['check']['answer']<3)
    check(name+' known reference IDs',all(ref['sourceId'] in source_ids for ref in exercise['references']))
    check(name+' known basic lab',exercise.get('lab') in ['u1','representations','interferometer','su2','su3','commutator'])

# Parse the concrete values actually displayed in JSON.  A wrong answer,
# matrix entry or root in the production text must fail even if the independent
# derivation above remains unchanged. This restricted AST supports exact scalar,
# vector, matrix and diagonal expressions only; it does not evaluate Python code.
names={'i':ii,'rt2':rt2,'rt3':rt3,'I2':I2,'I3':I3,
       'σx':sx,'σy':sy,'σz':sz,'Tx':Tx,'Ty':Ty,'Tz':Tz}
def inverse_monomial(value):
    value=Q.coerce(value)
    nonzero=[(i,c) for i,c in enumerate(value.c) if c]
    assert len(nonzero)==1, 'Only exact monomial denominators occur in these examples'
    n,coefficient=nonzero[0]
    base=Q.basis(n)
    return base/(coefficient*(base*base).c[0])
def scalar_times(s,value):
    if isinstance(value,list):return [scalar_times(s,x) for x in value]
    return s*value
def evaluate_expression(source):
    source=source.strip().replace('−','-').replace('√2','rt2').replace('√3','rt3')
    source=source.translate(str.maketrans('₀₁₂₃₄₅₆₇₈₉','0123456789'))
    source=re.sub(r'(?<=\d)(?=i|rt[23])','*',source)
    source=re.sub(r'i(?=σ|T[xyz])','i*',source)
    def visit(node):
        if isinstance(node,ast.Constant) and isinstance(node.value,int):return Q(node.value)
        if isinstance(node,ast.Name) and node.id in names:return names[node.id]
        if isinstance(node,(ast.List,ast.Tuple)):return [visit(x) for x in node.elts]
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,(ast.UAdd,ast.USub)):
            value=visit(node.operand);return value if isinstance(node.op,ast.UAdd) else scalar_times(-1,value)
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='diag' and not node.keywords:
            return diag(*(visit(x) for x in node.args))
        if isinstance(node,ast.BinOp):
            a,b=visit(node.left),visit(node.right)
            if isinstance(node.op,ast.Mult):
                if isinstance(a,list) and isinstance(b,list):return mm(a,b)
                return scalar_times(b,a) if isinstance(a,list) else scalar_times(a,b)
            if isinstance(node.op,ast.Div):return scalar_times(inverse_monomial(b),a)
            if isinstance(node.op,(ast.Add,ast.Sub)):
                if isinstance(a,list):return add(a,b) if isinstance(node.op,ast.Add) else sub(a,b)
                return a+b if isinstance(node.op,ast.Add) else a-b
        raise AssertionError('Unsupported expression in production example: '+source)
    return visit(ast.parse(source,mode='eval').body)
def chosen(exercise):return exercise['check']['choices'][exercise['check']['answer']]

for n,part in enumerate(exercises[0]['steps'][0]['formula'].split('，')):
    check('production C4 power '+str(n),evaluate_expression(part.split('=')[1])==powers(ii,n))
actual_U_dagger=evaluate_expression(exercises[1]['steps'][0]['formula'].split('，')[0].split('=')[1])
check('production unitary dagger matrix',actual_U_dagger==dag(U))
actual_V=evaluate_expression(re.search(r'V=(diag\([^)]*\))',exercises[1]['prompt']).group(1))
check('production V is unitary',mm(dag(actual_V),actual_V)==I2)
check('production V classification answer',chosen(exercises[1])==('SU(2)' if det(actual_V)==1 else 'U(2)，但不属于SU(2)'))
actual_W=evaluate_expression(exercises[1]['steps'][3]['explanation'].split('W=')[1].split('。')[0])
check('production mixing counterexample matrix',actual_W==quarter)
check('production normalized commutator formula',evaluate_expression(exercises[2]['steps'][1]['formula'].split('=')[-1])==comm(Tx,Ty))
check('production commutator answer',evaluate_expression(chosen(exercises[2]))==comm(Tx,Ty))
actual_quarter=evaluate_expression(exercises[3]['steps'][0]['formula'].split('=')[-1])
check('production y-quarter rotation matrix',actual_quarter==quarter)
check('production Bloch answer',evaluate_expression(chosen(exercises[3]))==[expect(mm(actual_quarter,up),A) for A in paulis])
check('production interferometer probability answer',evaluate_expression(chosen(exercises[4]))==expect(mm(controlled,kron(path_plus,up)),kron(Pminus,I2)))
check('production center representation answer',evaluate_expression(chosen(exercises[5]))==I3)
actual_l1=evaluate_expression(exercises[6]['givens'][0].split('，')[0].split('=')[1])
check('production lambda1 matrix',actual_l1==l1)
check('production full SU3 2pi answer',evaluate_expression(chosen(exercises[6]))==mm(U_pi,U_pi))
actual_T3,actual_T8=[evaluate_expression(part.split('=')[1].rstrip('。')) for part in exercises[7]['givens'][0].split('，')]
check('production T3 matrix',actual_T3==T3)
check('production T8 matrix',actual_T8==T8)
actual_root=[actual_T3[0][0]-actual_T3[1][1],actual_T8[0][0]-actual_T8[1][1]]
check('production E12 root answer',evaluate_expression(chosen(exercises[7]))==actual_root)
before_after=exercises[7]['steps'][3]['formula'].split('；')
check('production initial nonCartan mean',evaluate_expression(before_after[0].split('=')[-1])==[expect(psi0,A) for A in [T1,T2]])
check('production final nonCartan mean',evaluate_expression(before_after[1].split('=')[-1])==[expect(psi1,A) for A in [T1,T2]])
print(json.dumps({'status':'passed','exactAndContentChecks':len(checks),'productionExercises':len(bank['exercises']),
                  'introductoryLessons':len(exercises),'method':'Fraction arithmetic in Q(sqrt(2),sqrt(3),i); concrete production expressions parsed independently'},ensure_ascii=False))
