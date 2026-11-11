"""Nine finite-group demonstrations using one declared complex S3 model.

All displayed example matrices are real, regarded as matrices over C. This
keeps the complex-representation hypotheses visible without a numerical solver.
"""
from __future__ import annotations
import math

RELEASE="20261111-group-theorems1"
NAMES=["e","(12)","(23)","(13)","(123)","(132)"]
PERMS=[[0,1,2],[1,0,2],[0,2,1],[2,1,0],[1,2,0],[2,0,1]]
CLASSES=[[0],[1,2,3],[4,5]]
CLASS_NAMES=["e","3 transpositions","2 three-cycles"]
SIZES=[1,3,2]
CHARACTERS={"A1":[1,1,1],"A2":[1,-1,1],"E":[2,0,-1]}
DIMS={"A1":1,"A2":1,"E":2}
U=[2/math.sqrt(6),-1/math.sqrt(6),-1/math.sqrt(6)]
V=[0.,1/math.sqrt(2),-1/math.sqrt(2)]
A=[1/math.sqrt(3)]*3


def _dot(a,b):return sum(x*y for x,y in zip(a,b))
def _transpose(a):return [list(x) for x in zip(*a)]
def _mm(a,b):return [[_dot(row,col) for col in _transpose(b)] for row in a]
def _eye(n):return [[int(i==j) for j in range(n)] for i in range(n)]
def _scale(a,s):return [[s*x for x in row] for row in a]
def _outer(a,b):return [[x*y for y in b] for x in a]
def _sum(items,n):
    out=[[0.]*n for _ in range(n)]
    for a in items:out=[[x+y for x,y in zip(r,s)] for r,s in zip(out,a)]
    return out
def _err(a,b):return max(abs(x-y) for r,s in zip(a,b) for x,y in zip(r,s))
def _trace(a):return sum(a[i][i] for i in range(len(a)))
def _commutator(a,b):return _err(_mm(a,b),_mm(b,a))
def _num(p,key,default,low=-3.,high=3.):
    x=p.get(key,default)
    if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or not low<=x<=high:
        raise ValueError(f"{key}: finite number expected in [{low}, {high}]")
    return float(x)
def _index(p,key,default,dimension=6):
    x=_num(p,key,default,0,dimension-1)
    if int(x)!=x:raise ValueError(f"{key}: integer expected")
    return int(x)


TABLE=[[PERMS.index([a[b[j]] for j in range(3)]) for b in PERMS] for a in PERMS]
INVERSES=[next(j for j in range(6) if TABLE[i][j]==0) for i in range(6)]
MATRICES=[[[int(p[j]==i) for j in range(3)] for i in range(3)] for p in PERMS]
EBASIS=[[U[i],V[i]] for i in range(3)]
E_MATRICES=[_mm(_mm(_transpose(EBASIS),m),EBASIS) for m in MATRICES]
PA=[[1/3]*3 for _ in range(3)]
PE=[[int(i==j)-1/3 for j in range(3)] for i in range(3)]


def _representation(name):
    if name=="permutation":return MATRICES
    if name=="E":return E_MATRICES
    if name=="A1":return [[[1]] for _ in range(6)]
    if name=="A2":return [[[1 if g in (0,4,5) else -1]] for g in range(6)]
    raise ValueError("representation must be permutation, E, A1 or A2")


def _base(experiment,**data):
    return {"schemaVersion":1,"release":RELEASE,"experiment":experiment,"elements":NAMES,"classNames":CLASS_NAMES,"classSizes":SIZES,
            "classes":CLASSES,"characters":CHARACTERS,"dimensions":DIMS,"convention":"finite complex representations; active permutations; AB applies B first; canonical orthonormal E basis u,v",**data}


def rearrangement(p):
    h=_index(p,"h",1);side=p.get("side","left")
    if side not in ("left","right"):raise ValueError("side must be left or right")
    images=[TABLE[h][g] if side=="left" else TABLE[g][h] for g in range(6)]
    return _base("rearrangement",h=h,side=side,images=images,multiplicationTable=TABLE,inverse=INVERSES[h],checks={"passed":len(set(images))==6})


def conjugacy(p):
    g=_index(p,"g",1);h=_index(p,"h",4)
    result=TABLE[TABLE[h][g]][INVERSES[h]]
    cls=next(i for i,c in enumerate(CLASSES) if g in c)
    return _base("conjugacy",g=g,h=h,inverse=INVERSES[h],conjugate=result,classIndex=cls,
                 selectedMatrix=MATRICES[g],conjugateMatrix=MATRICES[result],checks={"passed":result in CLASSES[cls]})


def normal(p):
    choice=p.get("subgroup","A3")
    if choice not in ("A3","H12"):raise ValueError("subgroup must be A3 or H12")
    subgroup=[0,4,5] if choice=="A3" else [0,1]
    h=_index(p,"h",2)
    def conjugated(g):return sorted(TABLE[TABLE[g][x]][INVERSES[g]] for x in subgroup)
    is_normal=all(conjugated(g)==subgroup for g in range(6))
    left=[];right=[]
    for g in range(6):
        l=sorted(TABLE[g][x] for x in subgroup);r=sorted(TABLE[x][g] for x in subgroup)
        if l not in left:left.append(l)
        if r not in right:right.append(r)
    quotient=None
    if is_normal:
        quotient=[[next(k for k,c in enumerate(left) if TABLE[a[0]][b[0]] in c) for b in left] for a in left]
    return _base("normal",subgroupName=choice,subgroup=subgroup,h=h,conjugated=conjugated(h),normal=is_normal,leftCosets=left,rightCosets=right,
                 quotientTable=quotient,checks={"passed":len(left)*len(subgroup)==6,"index":len(left)})


def irreducible(p):
    name=p.get("representation","permutation");matrices=_representation(name);g=_index(p,"g",4)
    chars=[_trace(matrices[c[0]]) for c in CLASSES]
    inner=sum(n*x*x for n,x in zip(SIZES,chars))/6
    return _base("irreducible",representation=name,g=g,selectedMatrix=matrices[g],representationCharacters=chars,characterNorm=inner,
                 irreducible=abs(inner-1)<1e-10,decomposition={"permutation":{"A1":1,"A2":0,"E":1},"E":{"A1":0,"A2":0,"E":1},"A1":{"A1":1,"A2":0,"E":0},"A2":{"A1":0,"A2":1,"E":0}}[name],
                 invariantA1Projector=PA if name=="permutation" else None,checks={"passed":abs(inner-(2 if name=="permutation" else 1))<1e-10})


def schur(p):
    name=p.get("representation","permutation")
    if name not in ("E","permutation"):raise ValueError("choose E or permutation")
    a=_num(p,"a",.4);b=_num(p,"b",1.1)
    matrices=_representation(name)
    m=_scale(_eye(2),a) if name=="E" else _sum([_scale(PA,a),_scale(PE,b)],3)
    residue=max(_commutator(m,d) for d in matrices)
    scalar=name=="E" or abs(a-b)<1e-12
    return _base("schur",representation=name,a=a,b=b,intertwiner=m,scalar=scalar,commutatorResidual=residue,
                 canonicalBlocks=[{"irrep":"E","scalar":a,"dimension":2}] if name=="E" else [{"irrep":"A1","scalar":a,"dimension":1},{"irrep":"E","scalar":b,"dimension":2}],
                 checks={"passed":residue<1e-10})


def _inverse2(a):
    det=a[0][0]*a[1][1]-a[0][1]*a[1][0]
    return [[a[1][1]/det,-a[0][1]/det],[-a[1][0]/det,a[0][0]/det]]


def unitarity(p):
    scale=_num(p,"scale",1.8,.4,3.);shear=_num(p,"shear",.6,-1.5,1.5);g=_index(p,"g",4)
    choice=p.get("metric","average")
    if choice not in ("average","similarity"):raise ValueError("metric must be average or similarity")
    s=[[scale,shear],[0.,1.]];sinv=_inverse2(s)
    distorted=[_mm(_mm(sinv,d),s) for d in E_MATRICES]
    metric=_mm(_transpose(s),s)
    average=_scale(_sum([_mm(_transpose(d),d) for d in distorted],2),1/6)
    selected=average if choice=="average" else metric
    c00=math.sqrt(selected[0][0]);c01=selected[0][1]/c00;c11=math.sqrt(selected[1][1]-c01*c01)
    c=[[c00,c01],[0.,c11]];cinv=_inverse2(c)
    unitary=[_mm(_mm(c,d),cinv) for d in distorted]
    ordinary=max(_err(_mm(_transpose(d),d),_eye(2)) for d in distorted)
    invariant=max(_err(_mm(_mm(_transpose(d),selected),d),selected) for d in distorted)
    restored=max(_err(_mm(_transpose(d),d),_eye(2)) for d in unitary)
    return _base("unitarity",scale=scale,shear=shear,g=g,metricChoice=choice,S=s,nonunitary=distorted[g],metric=metric,averagedMetric=average,chosenMetric=selected,
                 factor=c,unitary=unitary[g],ordinaryResidual=ordinary,metricResidual=invariant,unitaryResidual=restored,
                 checks={"passed":max(invariant,restored)<1e-9,"positiveMetric":selected[0][0]>0 and selected[0][0]*selected[1][1]-selected[0][1]**2>0})


def orthogonality(p):
    alpha=p.get("alpha","E");beta=p.get("beta","E")
    if alpha not in DIMS or beta not in DIMS:raise ValueError("irreps must be A1, A2 or E")
    i=_index(p,"i",0,DIMS[alpha]);j=_index(p,"j",0,DIMS[alpha]);k=_index(p,"k",0,DIMS[beta]);l=_index(p,"l",0,DIMS[beta])
    da,db=_representation(alpha),_representation(beta)
    terms=[a[i][j]*b[k][l] for a,b in zip(da,db)]
    total=sum(terms);expected=6/DIMS[alpha] if alpha==beta and i==k and j==l else 0.
    char_inner=sum(n*a*b for n,a,b in zip(SIZES,CHARACTERS[alpha],CHARACTERS[beta]))/6
    return _base("orthogonality",alpha=alpha,beta=beta,i=i,j=j,k=k,l=l,terms=terms,total=total,expected=expected,characterInner=char_inner,
                 checks={"passed":abs(total-expected)<1e-9 and abs(char_inner-int(alpha==beta))<1e-9})


def reduction(p):
    preset=p.get("preset","permutation")
    triples={"permutation":[3.,1.,0.],"regular":[6.,0.,0.],"E":[2.,0.,-1.]}
    if preset=="custom":chars=[_num(p,"chiE",3.,0.,12.),_num(p,"chiT",1.,-12.,12.),_num(p,"chiC",0.,-12.,12.)]
    elif preset in triples:chars=triples[preset]
    else:raise ValueError("preset must be permutation, regular, E or custom")
    multiplicities={name:sum(n*a*b for n,a,b in zip(SIZES,chars,row))/6 for name,row in CHARACTERS.items()}
    weighted={name:[n*a*b for n,a,b in zip(SIZES,chars,row)] for name,row in CHARACTERS.items()}
    valid=all(x>=-1e-10 and abs(x-round(x))<1e-10 for x in multiplicities.values())
    reconstructed=sum(DIMS[name]*x for name,x in multiplicities.items())
    return _base("reduction",preset=preset,inputCharacters=chars,multiplicities=multiplicities,weightedTerms=weighted,validCharacter=valid,
                 reconstructedDimension=reconstructed,dimensionSquaredSum=sum(x*x for x in DIMS.values()),classCount=3,
                 checks={"passed":valid and abs(reconstructed-chars[0])<1e-9,"dimensionCheck":abs(reconstructed-chars[0])<1e-9})


def degeneracy(p):
    a=_num(p,"a",-.5);b=_num(p,"b",.5);epsilon=_num(p,"epsilon",0.,-1.5,1.5)
    perturbation=_scale(_outer(U,U),epsilon)
    h=_sum([_scale(PA,a),_scale(PE,b),perturbation],3)
    residual=max(_commutator(h,d) for d in MATRICES)
    levels=[{"basis":"A1","energy":a,"irrep":"A1"},{"basis":"u","energy":b+epsilon,"irrep":"E"},{"basis":"v","energy":b,"irrep":"E"}]
    energy_groups=[]
    for level in sorted(levels,key=lambda x:x["energy"]):
        if not energy_groups or abs(level["energy"]-energy_groups[-1]["energy"])>1e-9:
            energy_groups.append({"energy":level["energy"],"states":[level["basis"]],"degeneracy":1})
        else:energy_groups[-1]["states"].append(level["basis"]);energy_groups[-1]["degeneracy"]+=1
    return _base("degeneracy",a=a,b=b,epsilon=epsilon,hamiltonian=h,levels=levels,energyGroups=energy_groups,commutatorResidual=residual,
                 fullSymmetry=residual<1e-9,protectedE=abs(epsilon)<1e-12,accidentalThreefold=abs(a-b)<1e-12 and abs(epsilon)<1e-12,
                 checks={"passed":abs(_trace(h)-(a+2*b+epsilon))<1e-9})


def run(params=None):
    if params is not None and not isinstance(params,dict):raise ValueError("parameters must be an object")
    p=params or {};experiment=p.get("experiment","rearrangement")
    handlers={"rearrangement":rearrangement,"conjugacy":conjugacy,"normal":normal,"irreducible":irreducible,"schur":schur,"unitarity":unitarity,
              "orthogonality":orthogonality,"reduction":reduction,"degeneracy":degeneracy}
    if experiment not in handlers:raise ValueError("unknown group-theorem demonstration")
    return handlers[experiment](p)
