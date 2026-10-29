"""Exact small, single-band Hubbard clusters; NumPy-only browser runtime.

Fock ordering: all up orbitals, then all down orbitals, each by site index.
Every hopping and spin-flip matrix element includes the fermionic parity.
Energies are eV, angular momentum uses hbar=1, and temperature is zero.
"""
import math
from functools import lru_cache
from itertools import combinations
import numpy as np

RELEASE = '20261029-pathways1'
ENERGY_TOLERANCE = 1e-9
SOURCES = [
    {'id':'hubbard-original','title':'Hubbard (1963), Electron correlations in narrow energy bands',
     'url':'https://doi.org/10.1098/rspa.1963.0204'},
    {'id':'hubbard-dimer','title':'Carrascal et al. (2015), The Hubbard Dimer: a density functional case study',
     'url':'https://arxiv.org/abs/1502.02194'},
    {'id':'hubbard-lieb-wu','title':'Lieb and Wu (1968), Absence of Mott Transition in an Exact Solution of the Short-Range, One-Band Model in One Dimension',
     'url':'https://doi.org/10.1103/PhysRevLett.20.1445'},
]


def _number(payload,key,default,lo,hi,integer=False):
    value=payload.get(key,default)
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not lo<=value<=hi:
        raise ValueError(f'{key} 必须是 {lo} 至 {hi} 的有限数值')
    if integer and int(value)!=value:
        raise ValueError(f'{key} 必须为整数')
    return int(value) if integer else float(value)


def parameters(payload):
    if not isinstance(payload,dict):
        raise ValueError('Hubbard 输入必须为 JSON 对象')
    sites=_number(payload,'sites',2,2,4,True)
    boundary=payload.get('boundary','open')
    if boundary not in ('open','periodic'):
        raise ValueError('boundary 仅支持 open 或 periodic')
    p={'sites':sites,'boundary':boundary,
       'nUp':_number(payload,'nUp',1,0,sites,True),
       'nDown':_number(payload,'nDown',1,0,sites,True),
       'hopping':_number(payload,'hopping',1,0,3),
       'interactionU':_number(payload,'interactionU',4,0,30),
       'alternatingPotential':_number(payload,'alternatingPotential',0,-10,10),
       'scanMaxU':_number(payload,'scanMaxU',12,0,30),
       'scanPoints':_number(payload,'scanPoints',25,11,41,True)}
    unsupported=set(payload)&{'temperature','magneticField','soc','pairing','doping','chemicalPotential'}
    if unsupported:
        raise ValueError('本固定粒子数、零温模型不接受 '+', '.join(sorted(unsupported)))
    return p


def bonds(sites,boundary):
    """Unique undirected bonds: a two-site ring is one bond, not two."""
    result=[(i,i+1) for i in range(sites-1)]
    if boundary=='periodic' and sites>2:
        result.append((0,sites-1))
    return tuple(result)


def fock_basis(sites,nup,ndown):
    return tuple(sum(1<<i for i in u)+sum(1<<(sites+i) for i in d)
                 for u in combinations(range(sites),nup)
                 for d in combinations(range(sites),ndown))


def fermion_action(state,operations):
    """Apply (orbital, create?) operations in right-to-left application order."""
    sign=1
    for orbital,create in operations:
        occupied=bool(state & (1<<orbital))
        if occupied==create:
            return None
        if (state & ((1<<orbital)-1)).bit_count()%2:
            sign=-sign
        state=state ^ (1<<orbital)
    return state,sign


def _operator(basis,terms):
    lookup={state:i for i,state in enumerate(basis)}
    matrix=np.zeros((len(basis),len(basis)))
    for col,state in enumerate(basis):
        for coefficient,operations in terms:
            result=fermion_action(state,operations)
            if result is not None and result[0] in lookup:
                matrix[lookup[result[0]],col]+=coefficient*result[1]
    return matrix


@lru_cache(maxsize=100)
def sector_operators(sites,nup,ndown,boundary):
    basis=fock_basis(sites,nup,ndown)
    up=np.array([[(state>>i)&1 for i in range(sites)] for state in basis],dtype=float)
    down=np.array([[(state>>(sites+i))&1 for i in range(sites)] for state in basis],dtype=float)
    double=up*down
    density=up+down
    sz=(up-down)/2
    terms=[]
    for i,j in bonds(sites,boundary):
        for offset in (0,sites):
            terms.extend([(-1.,((j+offset,False),(i+offset,True))),
                          (-1.,((i+offset,False),(j+offset,True)))])
    kinetic=_operator(basis,terms)
    spins=np.empty((sites,sites,len(basis),len(basis)))
    for i in range(sites):
        for j in range(sites):
            if i==j:
                spins[i,j]=np.diag(.75*(density[:,i]-2*double[:,i]))
            else:
                flips=[(.5,((j,False),(sites+j,True),(sites+i,False),(i,True))),
                       (.5,((sites+j,False),(j,True),(i,False),(sites+i,True)))]
                spins[i,j]=np.diag(sz[:,i]*sz[:,j])+_operator(basis,flips)
    return {'basis':basis,'up':up,'down':down,'density':density,'double':double,'sz':sz,
            'kinetic':kinetic,'doubleTotal':np.diag(double.sum(axis=1)),
            'alternation':np.diag(density@np.array([(-1)**i/2 for i in range(sites)])),
            'spin':spins,'S2':spins.sum(axis=(0,1))}


def hamiltonian(p,nup=None,ndown=None):
    nup=p['nUp'] if nup is None else nup
    ndown=p['nDown'] if ndown is None else ndown
    ops=sector_operators(p['sites'],nup,ndown,p['boundary'])
    h=p['hopping']*ops['kinetic']+p['interactionU']*ops['doubleTotal']+p['alternatingPotential']*ops['alternation']
    return h,ops


def energy_groups(energies):
    result=[]
    for i,energy in enumerate(energies):
        if not result or energy-energies[result[-1][0]]>ENERGY_TOLERANCE:
            result.append([i])
        else:
            result[-1].append(i)
    return result


def sector_result(p):
    h,ops=hamiltonian(p)
    energies,vectors=np.linalg.eigh(h)
    groups=energy_groups(energies)
    ground_vectors=vectors[:,groups[0]]
    rho=ground_vectors@ground_vectors.T/len(groups[0])
    probability=np.diag(rho)
    spin=np.einsum('ij,abji->ab',rho,ops['spin'])
    szcorr=np.einsum('k,ki,kj->ij',probability,ops['sz'],ops['sz'])
    e0=float(np.mean(energies[groups[0]]))
    levels=[{'energy':float(np.mean(energies[g])),
             'relativeEnergy':float(np.mean(energies[g])-e0),'degeneracy':len(g),
             'S2':float(np.trace(vectors[:,g].T@ops['S2']@vectors[:,g])/len(g))}
            for g in groups]
    double=probability@ops['double']
    ground={'energy':e0,'degeneracy':len(groups[0]),'density':(probability@ops['density']).tolist(),
            'densityUp':(probability@ops['up']).tolist(),'densityDown':(probability@ops['down']).tolist(),
            'doubleOccupancy':double.tolist(),'totalDoubleOccupancy':float(double.sum()),
            'averageDoubleOccupancy':float(double.mean()),'localSz':(probability@ops['sz']).tolist(),
            'spinCorrelations':spin.tolist(),'szCorrelations':szcorr.tolist(),
            'totalSpinSquared':float(np.trace(rho@ops['S2'])),
            'nearestSpinCorrelation':float(np.mean([spin[i,j] for i,j in bonds(p['sites'],p['boundary'])])),
            'kineticEnergy':float(p['hopping']*np.trace(rho@ops['kinetic'])),
            'interactionEnergy':float(p['interactionU']*double.sum()),
            'potentialEnergy':float(p['alternatingPotential']*np.trace(rho@ops['alternation']))}
    checks={'hermiticityResidual':float(np.max(abs(h-h.T))),
            'eigenResidual':float(np.max(abs(h@vectors-vectors*energies))),
            'spinCommutatorResidual':float(np.max(abs(h@ops['S2']-ops['S2']@h))),
            'densityMatrixTrace':float(np.trace(rho)),
            'particleNumberResidual':abs(sum(ground['density'])-p['nUp']-p['nDown']),
            'spinProjectionResidual':abs(sum(ground['localSz'])-(p['nUp']-p['nDown'])/2),
            'energyDecompositionResidual':abs(e0-ground['kineticEnergy']-ground['interactionEnergy']-ground['potentialEnergy'])}
    return {'ground':ground,'levels':levels,'eigenvalues':energies.tolist(),
            'dimension':len(energies),'sectorGap':levels[1]['relativeEnergy'] if len(levels)>1 else None,
            'checks':checks}


def total_number_ground(p,total):
    """Minimize at fixed total N over *all* available Sz sectors."""
    n=p['sites']
    if not 0<=total<=2*n:
        return None
    rows=[]
    for nup in range(max(0,total-n),min(n,total)+1):
        ndown=total-nup
        h,_=hamiltonian(p,nup,ndown)
        rows.append({'nUp':nup,'nDown':ndown,'energy':float(np.linalg.eigvalsh(h)[0])})
    minimum=min(row['energy'] for row in rows)
    return {'particles':total,'energy':minimum,'sectors':rows}


def dimer_singlet_triplet(p):
    if p['sites']!=2 or p['nUp']+p['nDown']!=2:
        return None
    # Project the whole Sz=0 sector onto S=0, even if its ground level shares
    # a numerical degeneracy with S=1. The triplet comes from Sz=1 separately.
    h,ops=hamiltonian(p,1,1)
    s2,rotation=np.linalg.eigh(ops['S2'])
    singlets=rotation[:,abs(s2)<1e-8]
    singlet=float(np.linalg.eigvalsh(singlets.T@h@singlets)[0])
    ht,_=hamiltonian(p,2,0)
    triplet=float(ht[0,0])
    gap=triplet-singlet
    t,u=p['hopping'],p['interactionU']
    # Rationalized expression is stable when U is large relative to t.
    exact=(2*t*(4*t/(math.hypot(u,4*t)+u)) if t or u else 0.)
    return {'singletEnergy':singlet,'tripletEnergy':triplet,'gap':gap,
            'symmetricExactGap':exact if p['alternatingPotential']==0 else None,
            'strongCouplingEstimate':4*t*t/u if u>0 else None,
            'estimateApplicable':bool(p['alternatingPotential']==0 and t>0 and u>=10*t)}


def gaps(p,sector):
    total=p['nUp']+p['nDown']
    fixed=total_number_ground(p,total)
    lower=total_number_ground(p,total-1)
    upper=total_number_ground(p,total+1)
    return {'sectorExcitationGap':sector['sectorGap'],'totalNumberGround':fixed,
            'removalSector':lower,'additionSector':upper,
            'chargeGap':upper['energy']+lower['energy']-2*fixed['energy'] if upper and lower else None,
            'selectedGroundAboveGlobal':sector['ground']['energy']-fixed['energy'],
            'dimerSingletTriplet':dimer_singlet_triplet(p)}


def calculate(payload):
    p=parameters(payload)
    selected=sector_result(p)
    gap=gaps(p,selected)
    ground=selected['ground']
    scan=[]
    # If Umax=0 there is one distinct sample; do not repeat identical points.
    for u in np.linspace(0,p['scanMaxU'],p['scanPoints']) if p['scanMaxU']>0 else [0.]:
        sp={**p,'interactionU':float(u)}
        result=sector_result(sp)
        sg=gaps(sp,result)
        g=result['ground']
        scan.append({'U':float(u),'energy':g['energy'],'globalEnergy':sg['totalNumberGround']['energy'],
                     'doubleOccupancy':g['averageDoubleOccupancy'],'nearestSpinCorrelation':g['nearestSpinCorrelation'],
                     'chargeGap':sg['chargeGap'],'sectorGap':sg['sectorExcitationGap'],
                     'dimerSpinGap':sg['dimerSingletTriplet']['gap'] if sg['dimerSingletTriplet'] else None})
    def series(key,label):
        return {'label':label,'points':[[row['U'],row[key]] for row in scan]}
    gap_series=[series('sectorGap','所选 Sz 扇区的下一不同能级'),series('chargeGap','跨全部 Sz 的电荷增减隙')]
    if gap['dimerSingletTriplet']:
        gap_series.append(series('dimerSpinGap','二聚体单重态–三重态分裂'))
    plots=[{'title':'相互作用扫描：固定扇区与全自旋基态','xLabel':'U（eV）','yLabel':'能量（eV）',
            'series':[series('energy','所选扇区基态'),series('globalEnergy','同总粒子数的最低能量')]},
           {'title':'双占据随 U 变化','xLabel':'U（eV）','yLabel':'每站点双占据',
            'series':[series('doubleOccupancy','平均 ⟨n↑n↓⟩')]},
           {'title':'最近邻自旋关联','xLabel':'U（eV）','yLabel':'⟨Sᵢ·Sⱼ⟩（ℏ²）',
            'series':[series('nearestSpinCorrelation','唯一键上的平均')]},
           {'title':'三种不同的有限团簇能隙','xLabel':'U（eV）','yLabel':'能量差（eV）','series':gap_series}]
    n=p['sites']
    tables=[{'title':'固定 N↑、N↓ 扇区的全部能级组','columns':['组','能量（eV）','相对基态（eV）','扇区内简并度','组平均 ⟨S²⟩'],
             'rows':[[i,row['energy'],row['relativeEnergy'],row['degeneracy'],row['S2']] for i,row in enumerate(selected['levels'])]},
            {'title':'简并基态子空间等权平均','columns':['站点','εᵢ（eV）','⟨n↑⟩','⟨n↓⟩','⟨n⟩','⟨n↑n↓⟩','⟨Sz⟩'],
             'rows':[[i,(-1)**i*p['alternatingPotential']/2,ground['densityUp'][i],ground['densityDown'][i],ground['density'][i],ground['doubleOccupancy'][i],ground['localSz'][i]] for i in range(n)]},
            {'title':'完整自旋关联 ⟨Sᵢ·Sⱼ⟩（ℏ²）','columns':['i / j',*list(range(n))],
             'rows':[[i,*row] for i,row in enumerate(ground['spinCorrelations'])]},
            {'title':'同一总粒子数的不同 Sz 扇区','columns':['N↑','N↓','最低能量（eV）'],
             'rows':[[row['nUp'],row['nDown'],row['energy']] for row in gap['totalNumberGround']['sectors']]}]
    if gap['dimerSingletTriplet']:
        d=gap['dimerSingletTriplet']
        tables.append({'title':'二聚体 N=2：跨自旋子空间核验','columns':['量','数值（eV）'],
                       'rows':[['最低 S=0 能量',d['singletEnergy']],['Sz=1 的 S=1 能量',d['tripletEnergy']],
                               ['E_triplet−E_singlet',d['gap']],['Δ=0 解析分裂',d['symmetricExactGap']],
                               ['4t²/U（仅 Δ=0 且 U≫t 时近似）',d['strongCouplingEstimate']]]})
    checks=selected['checks']
    checks.update({'uniqueBondCount':len(bonds(n,p['boundary'])),'basisDimension':selected['dimension'],
                   'expectedDimension':math.comb(n,p['nUp'])*math.comb(n,p['nDown']),
                   'energyDegeneracyToleranceEV':ENERGY_TOLERANCE})
    checks['passed']=bool(checks['basisDimension']==checks['expectedDimension'] and
                          all(value<1e-8 for key,value in checks.items() if key.endswith('Residual')) and
                          abs(checks['densityMatrixTrace']-1)<1e-12)
    warnings=[
        '仅计算 2–4 站点、单轨道、零温、无自旋翻转场的 Hubbard 模型；t、U、Δ 为给定参数，没有自动拟合材料或求解真实晶体。',
        '所有主谱和局域量固定 N↑、N↓，按 10⁻⁹ eV 容差将基态数值简并空间等权平均。小于容差的实际劈裂不作分辨；固定 Sz 混合态不等于跨整个自旋多重态的旋转不变热平均。',
        '“扇区激发隙”是离开所选简并基态子空间后的下一不同能级，不等于普适自旋隙。总 N 基态和电荷增减隙另在全部允许的 Sz 扇区中取最低值。',
        '2–4 站点的有限能级间距或电荷增减隙不能证明热力学 Mott 相变；有限尺寸、边界、填充与交替势都可能产生能隙。',
        '周期边界使用每对站点之间的一条无向键，N=2 与开放二聚体相同；N=3 为三角环，N=4 为四站点环。',
        'εᵢ=(−1)^i Δ/2，0号站点取正号。三站点时不减去平均在位能，周期奇数环上的交替势在首尾不能完全交替。',
        '自旋点积包括横向翻转项；只计算 SzSz 会漏掉单重态的量子关联。双占据是无量纲概率，不是电荷密度单位。',
        'U 扫描固定 t、Δ、边界和 N↑、N↓；有限采样线段只用于阅读，简并或扇区变化处的连接不代表连续跟踪同一个本征态。',
    ]
    if gap['chargeGap'] is None:
        warnings.append('真空或满占据时 N−1 或 N+1 超出模型空间，电荷增减隙不定义，显示为空。')
    if gap['selectedGroundAboveGlobal']>1e-8:
        warnings.append('当前固定自旋扇区的最低能量高于同总 N 的全局基态；不能将当前局域量当成无自旋约束的基态结果。')
    if p['hopping']==0:
        warnings.append('t=0 为原子极限；多个占据组态可简并，结果是该扇区简并态等权，不能据此声称自发磁有序。')
    summary=[{'label':'固定扇区维数','value':selected['dimension']},
             {'label':'固定 Sz','value':(p['nUp']-p['nDown'])/2,'unit':'ℏ'},
             {'label':'扇区基态能量','value':ground['energy'],'unit':'eV'},
             {'label':'扇区基态简并度','value':ground['degeneracy']},
             {'label':'每站点平均双占据','value':ground['averageDoubleOccupancy']},
             {'label':'基态 ⟨S²⟩','value':ground['totalSpinSquared'],'unit':'ℏ²'},
             {'label':'有限团簇电荷增减隙','value':gap['chargeGap'],'unit':'eV'}]
    if gap['dimerSingletTriplet']:
        summary.append({'label':'二聚体单重态–三重态分裂','value':gap['dimerSingletTriplet']['gap'],'unit':'eV'})
    return {'release':RELEASE,'parameters':p,'summary':summary,'plots':plots,'tables':tables,
            'sector':{'nUp':p['nUp'],'nDown':p['nDown'],'particles':p['nUp']+p['nDown'],
                      'Sz':(p['nUp']-p['nDown'])/2,'dimension':selected['dimension']},
            'ground':ground,'levels':selected['levels'],'eigenvalues':selected['eigenvalues'],
            'gaps':gap,'scan':scan,'bonds':[list(b) for b in bonds(n,p['boundary'])],
            'warnings':warnings,'checks':checks,'sources':SOURCES}
