"""Six small symmetry models with explicit conventions; standard library only."""
from __future__ import annotations

from itertools import combinations, product
import cmath
import math

RELEASE="20261111-symmetry-mini1"


def _num(p,key,default,low=-100.,high=100.):
    value=p.get(key,default)
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:
        raise ValueError(f"{key}: finite number expected in [{low}, {high}]")
    return float(value)


def _dot(a,b):return sum(x*y for x,y in zip(a,b))
def _norm(a):return math.sqrt(_dot(a,a))
def _mv(a,v):return [_dot(row,v) for row in a]
def _outer(a,b):return [[x*y for y in b] for x in a]
def _encoded(v):return [[float(x.real),float(x.imag)] for x in v]


def _result(experiment,**data):
    return {"schemaVersion":1,"release":RELEASE,"experiment":experiment,**data}


def _vertices(name):
    phi=(1+math.sqrt(5))/2
    if name=="tetra":return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]
    if name=="cube":return [list(v) for v in product([-1.,1.],repeat=3)]
    if name=="octa":return [[s if k==j else 0. for k in range(3)] for j in range(3) for s in [-1.,1.]]
    icosa=[]
    for a,b in product([-1.,1.],repeat=2):
        icosa.extend([[0.,a,b*phi],[a,b*phi,0.],[b*phi,0.,a]])
    if name=="icosa":return icosa
    if name=="dodeca":
        # Face centers of the explicit icosahedron form its aligned dual.
        vertices=[]
        for face in combinations(range(12),3):
            if all(abs(sum((icosa[i][k]-icosa[j][k])**2 for k in range(3))-4)<1e-9 for i,j in combinations(face,2)):
                center=[sum(icosa[i][k] for i in face)/3 for k in range(3)]
                scale=math.sqrt(3)/_norm(center)
                vertices.append([scale*x for x in center])
        return vertices
    raise ValueError("polyhedron must be tetra, cube, octa, dodeca or icosa")


def polyhedra(p):
    name=p.get("polyhedron","tetra")
    n=_num(p,"order",3,2,5)
    if n not in (2,3,4,5):raise ValueError("order must be 2, 3, 4 or 5")
    n=int(n)
    fraction=_num(p,"fraction",1.,0.,1.)
    phi=(1+math.sqrt(5))/2
    axes={2:[1.,0.,0.],3:[1.,1.,1.],4:[0.,0.,1.],5:[0.,1.,phi]}
    axis=axes[n];axis=[x/_norm(axis) for x in axis]
    theta=2*math.pi*fraction/n;c=math.cos(theta);s=math.sin(theta)
    x,y,z=axis
    skew=[[0.,-z,y],[z,0.,-x],[-y,x,0.]]
    rotation=[[c*int(i==j)+(1-c)*axis[i]*axis[j]+s*skew[i][j] for j in range(3)] for i in range(3)]
    vertices=_vertices(name)
    transformed=[_mv(rotation,v) for v in vertices]
    matches=[];distances=[]
    for v in transformed:
        d=[_norm([a-b for a,b in zip(v,w)]) for w in vertices]
        i=min(range(len(d)),key=d.__getitem__)
        distances.append(d[i]);matches.append(i if d[i]<1e-8 else None)
    dmin=min(_norm([a-b for a,b in zip(vertices[i],vertices[j])]) for i,j in combinations(range(len(vertices)),2))
    edges=[[i,j] for i,j in combinations(range(len(vertices)),2) if abs(_norm([a-b for a,b in zip(vertices[i],vertices[j])])-dmin)<1e-8]
    proper,full,orders={"tetra":("T","Td",(12,24)),"cube":("O","Oh",(24,48)),"octa":("O","Oh",(24,48)),"dodeca":("I","Ih",(60,120)),"icosa":("I","Ih",(60,120))}[name]
    return _result("polyhedra",polyhedron=name,vertices=vertices,transformed=transformed,edges=edges,axis=axis,order=n,fraction=fraction,
                   rotation=rotation,matches=matches,maxMismatch=max(distances),coincident=all(i is not None for i in matches),
                   properGroup=proper,fullGroup=full,properOrder=orders[0],fullOrder=orders[1],crystallographic=name not in ("dodeca","icosa"),
                   modelNote="Regular ideal polyhedra: proper rotations and full point groups are distinguished. I/Ih contain fivefold rotations and are noncrystallographic for 3D periodic lattices.",
                   checks={"passed":len(set(tuple(v) for v in vertices))==len(vertices),"vertexCount":len(vertices),"edgeCount":len(edges)})


def vibrations(p):
    k0=_num(p,"k0",1.,.1,4.)
    k=_num(p,"k",.5,0.,2.)
    delta=_num(p,"delta",0.,-2.,2.)
    angle=math.radians(_num(p,"mix",0.,0.,360.))
    phase=math.radians(_num(p,"phase",45.,0.,360.))
    mode=p.get("mode","E")
    if mode not in ("A1","E"):raise ValueError("mode must be A1 or E")
    a=[1/math.sqrt(3)]*3
    u=[2/math.sqrt(6),-1/math.sqrt(6),-1/math.sqrt(6)]
    v=[0.,1/math.sqrt(2),-1/math.sqrt(2)]
    stiffness=[[k0*int(i==j)+k*(2 if i==j else -1)+delta*u[i]*u[j] for j in range(3)] for i in range(3)]
    mode_vector=a if mode=="A1" else [math.cos(angle)*x+math.sin(angle)*y for x,y in zip(u,v)]
    rayleigh=_dot(mode_vector,_mv(stiffness,mode_vector))
    residual=_norm([x-rayleigh*y for x,y in zip(_mv(stiffness,mode_vector),mode_vector)])
    eigenvalues=[k0,k0+3*k+delta,k0+3*k]
    frequencies=[math.sqrt(x) if x>=0 else None for x in eigenvalues]
    return _result("vibrations",k0=k0,k=k,delta=delta,mode=mode,mix=math.degrees(angle),phase=math.degrees(phase),
                   stiffness=stiffness,basis={"A1":a,"u":u,"v":v},modeVector=mode_vector,displacement=[math.sin(phase)*x for x in mode_vector],
                   eigenvalues=eigenvalues,frequencies=frequencies,rayleigh=rayleigh,eigenResidual=residual,isEigenvector=residual<1e-9,
                   degenerateE=abs(delta)<1e-12,stable=min(eigenvalues)>0,
                   modelNote="Three equal-mass scalar oscillators on the complete three-site ring. Frequencies use unit mass. This is not a general molecular spectrum solver; a negative eigenvalue means an unstable harmonic direction.",
                   checks={"passed":abs(sum(stiffness[i][i] for i in range(3))-sum(eigenvalues))<1e-10,"trace":sum(eigenvalues)})


def bands(p):
    t=_num(p,"t",1.,0.,2.)
    alpha=_num(p,"alpha",.4,0.,2.)
    field=_num(p,"B",0.,-2.,2.)
    q=_num(p,"kpi",.35,-1.,1.)*math.pi
    if "k" in p:q=_num(p,"k",q,-math.pi,math.pi)
    def values(k):
        e=-2*t*math.cos(k);a=2*alpha*math.sin(k);r=math.hypot(a,field)
        return [e-r,e+r]
    energies=values(q)
    spin_y=2*alpha*math.sin(q);r=math.hypot(spin_y,field)
    spin=[0.,spin_y/r,field/r] if r>1e-12 else None
    eps=-2*t*math.cos(q)
    return _result("bands",t=t,alpha=alpha,B=field,k=q,kpi=q/math.pi,energies=energies,spinUpper=spin,
                   hamiltonian={"real":[[eps+field,0.],[0.,eps-field]],"imag":[[0.,-spin_y],[spin_y,0.]]},
                   curves=[{"k":-math.pi+2*math.pi*i/128,"energies":values(-math.pi+2*math.pi*i/128)} for i in range(129)],
                   trimGaps={"0":2*abs(field),"pi":2*abs(field)},timeReversal=abs(field)<1e-12,trResidual=2*abs(field),
                   sameKDegenerate=abs(energies[1]-energies[0])<1e-9,
                   modelNote="One-dimensional spinful Rashba model with a z Zeeman term. At B=0, Kramers degeneracy is guaranteed at k=0 and pi, not at every k. Even E(k)=E(-k) curves alone do not prove time reversal; no topological invariant is inferred.",
                   checks={"passed":abs(sum(energies)-2*eps)<1e-10})


def manybody(p):
    j=_num(p,"J",1.,-2.,2.)
    state=p.get("state","singlet")
    states={"singlet":[0.,1/math.sqrt(2),-1/math.sqrt(2),0.],"triplet0":[0.,1/math.sqrt(2),1/math.sqrt(2),0.],"triplet+":[1.,0.,0.,0.],"triplet-":[0.,0.,0.,1.]}
    if state not in states:raise ValueError("invalid two-spin state")
    swap=[[1,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1]]
    h=[[.5*j*swap[i][k]-.25*j*int(i==k) for k in range(4)] for i in range(4)]
    psi=states[state];swapped=_mv(swap,psi);energy=_dot(psi,_mv(h,psi));eigenvalue=_dot(psi,swapped)
    return _result("manybody",J=j,state=state,basis=["up up","up down","down up","down down"],wavefunction=psi,swapped=swapped,
                   swapMatrix=swap,hamiltonian=h,exchangeEigenvalue=eigenvalue,energy=energy,
                   levels=[{"label":"S=0 singlet","energy":-.75*j,"degeneracy":1,"exchange":-1},{"label":"S=1 triplet","energy":.25*j,"degeneracy":3,"exchange":1}],
                   modelNote="Two spin-1/2 degrees of freedom, H=J S1·S2 and hbar=1. For identical electrons the complete spin-times-spatial wavefunction must be antisymmetric; a triplet spin factor is not forbidden. This is not a general many-body solver.",
                   checks={"passed":abs(energy-(-.75*j if state=="singlet" else .25*j))<1e-10})


def time_reversal(p):
    theta=math.radians(_num(p,"theta",65.,0.,180.))
    phi=math.radians(_num(p,"phi",35.,0.,360.))
    field=_num(p,"B",0.,-2.,2.)
    psi=[complex(math.cos(theta/2)),cmath.exp(1j*phi)*math.sin(theta/2)]
    def t(v):return [v[1].conjugate(),-v[0].conjugate()]
    def conj(v):return [x.conjugate() for x in v]
    tp=t(psi);t2=t(tp);kp=conj(psi);k2=conj(kp)
    bloch=[math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)]
    overlap=sum(x.conjugate()*y for x,y in zip(psi,tp))
    return _result("time-reversal",theta=math.degrees(theta),phi=math.degrees(phi),B=field,spinor=_encoded(psi),Tspinor=_encoded(tp),T2spinor=_encoded(t2),Kspinor=_encoded(kp),K2spinor=_encoded(k2),
                   bloch=bloch,Tbloch=[-x for x in bloch],Kbloch=[bloch[0],-bloch[1],bloch[2]],overlapT=_encoded([overlap])[0],fieldTrResidual=2*abs(field),
                   modelNote="T=i sigma_y K in the declared spin basis, so T²=-I. K²=+I is the spinless comparison in a real basis. T² restores the Bloch vector but changes the spinor sign; a global phase alone is not an observable of an isolated state. A nonzero external magnetic field breaks this time-reversal symmetry.",
                   checks={"passed":max(abs(x+y) for x,y in zip(psi,t2))<1e-12 and max(abs(x-y) for x,y in zip(psi,k2))<1e-12 and abs(overlap)<1e-12})


def double_soc(p):
    angle=math.radians(_num(p,"angle",360.,0.,720.))
    coupling=_num(p,"coupling",.6,-2.,2.)
    phase=cmath.exp(-.5j*angle)
    spinor=[phase/math.sqrt(2),phase.conjugate()/math.sqrt(2)]
    energies=[-coupling,coupling/2]
    return _result("double-soc",angle=math.degrees(angle),coupling=coupling,spinor=_encoded(spinor),bloch=[math.cos(angle),math.sin(angle),0.],
                   rotation={"real":[[phase.real,0.],[0.,phase.real]],"imag":[[phase.imag,0.],[0.,-phase.imag]]},
                   levels=[{"j":.5,"energy":energies[0],"degeneracy":2},{"j":1.5,"energy":energies[1],"degeneracy":4}],
                   rotation2pi=[[-1,0],[0,-1]],rotation4pi=[[1,0],[0,1]],zeroFieldKramers=True,
                   modelNote="Spin-1/2 rotation about z; a 2pi rotation gives -I and a 4pi rotation I. SOC example uses l=1,s=1/2,H=lambda L·S and hbar=1, with no crystal field or external field. The j=3/2 quartet contains Kramers pairs; full rotational symmetry supplies the larger degeneracy.",
                   checks={"passed":abs(2*energies[0]+4*energies[1])<1e-12,"weightedEnergySum":2*energies[0]+4*energies[1]})


def run(params=None):
    if params is not None and not isinstance(params,dict):raise ValueError("parameters must be an object")
    p=params or {};experiment=p.get("experiment","polyhedra")
    handlers={"polyhedra":polyhedra,"vibrations":vibrations,"bands":bands,"manybody":manybody,"time-reversal":time_reversal,"double-soc":double_soc}
    if experiment not in handlers:raise ValueError("unknown micro demonstration")
    return handlers[experiment](p)
