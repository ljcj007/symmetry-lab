"""Finite-spin symmetry, conserved observables and antiunitary diagnostics.

Hbar is divided out: h=H/hbar has units rad/ns; S=sigma/2 is dimensionless.
Conservation is an operator identity, never inferred from a single trajectory.
Only density_matrix_lab's validated NumPy matrix exponential and Liouvillian
are reused. No thermal-limit spontaneous symmetry breaking is computed.
"""
import math
import numpy as np
from density_matrix_lab import matrix_exponential, liouvillian

RELEASE = '20261030-symmetry1'
I = np.eye(2, dtype=complex)
PAULI = [np.array([[0, 1], [1, 0]], complex),
         np.array([[0, -1j], [1j, 0]], complex), np.diag([1, -1]).astype(complex)]
LOWER = np.array([[0, 0], [1, 0]], complex)
LABELS = {'sx':'S_x', 'sy':'S_y', 'sz':'S_z', 's2':'S²', 'energy':'H/ℏ'}
TOL = 1e-10


def matrix_json(a):
    return {'re':a.real.tolist(), 'im':a.imag.tolist()}


def norm(a):
    return float(np.linalg.norm(a))


def commutator(a, b):
    return a @ b - b @ a


def parameters(payload):
    if not isinstance(payload, dict):
        raise ValueError('守恒量实验输入须为对象。')
    defaults = {'experiment':'pair', 'initialState':'plus_x', 'observable':'sz',
                'jx':1., 'jy':1., 'jz':1., 'fieldX':0., 'fieldZ':0., 'gradientZ':0.,
                'gamma1':0., 'gammaPhi':0., 'duration':8., 'points':161, 'basisAngle':45.}
    unknown = set(payload)-set(defaults)
    if unknown:
        raise ValueError('未知参数：'+', '.join(sorted(unknown)))
    p = {**defaults, **payload}
    for key, choices in [('experiment', ('single','pair')),
                         ('initialState', ('up','down','plus_x','antiparallel','singlet','mixed')),
                         ('observable', tuple(LABELS))]:
        if not isinstance(p[key], str) or p[key] not in choices:
            raise ValueError(key+' 不属于支持的选项。')
    if p['experiment']=='single' and p['initialState'] in ('antiparallel','singlet'):
        raise ValueError('反平行和单重态初态只适用于双自旋。')
    for key in ('jx','jy','jz','fieldX','fieldZ','gradientZ','gamma1','gammaPhi','duration','points','basisAngle'):
        value = p[key]
        lo, hi = ((0,5) if key.startswith('gamma') else (0,30) if key=='duration' else
                  (2,301) if key=='points' else (-180,180) if key=='basisAngle' else (-10,10))
        if isinstance(value, bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not lo<=value<=hi:
            raise ValueError(f'{key} 须为 {lo} 至 {hi} 的有限实数。')
        if key=='points' and int(value)!=value:
            raise ValueError('points 必须为整数。')
        p[key] = int(value) if key=='points' else float(value)
    return p


def model(p):
    pair = p['experiment']=='pair'
    a = [np.kron(s/2,I) for s in PAULI] if pair else [s/2 for s in PAULI]
    b = [np.kron(I,s/2) for s in PAULI] if pair else [np.zeros((2,2),complex) for _ in PAULI]
    total = [x+y for x,y in zip(a,b)]
    dim = len(a[0]); terms=[]
    if pair:
        for i,key in enumerate(('jx','jy','jz')):
            terms.append((key, p[key], a[i]@b[i]))
    terms.extend([('fieldX',p['fieldX'],total[0]),('fieldZ',p['fieldZ'],total[2])])
    if pair:
        terms.append(('gradientZ',p['gradientZ'],(a[2]-b[2])/2))
    h = sum((coefficient*operator for _,coefficient,operator in terms),np.zeros((dim,dim),complex))
    q = {key:value for key,value in zip(('sx','sy','sz'),total)}
    q['s2'] = sum(x@x for x in total); q['energy']=h
    collapses=[]
    for site in range(2 if pair else 1):
        lower=np.kron(LOWER,I) if pair and site==0 else np.kron(I,LOWER) if pair else LOWER
        z=2*(a[2] if site==0 else b[2])
        if p['gamma1']:
            collapses.append((f'站点{site} ↑→↓',math.sqrt(p['gamma1'])*lower))
        if p['gammaPhi']:
            collapses.append((f'站点{site} z纯退相干',math.sqrt(p['gammaPhi']/2)*z))
    return h,terms,q,collapses


def initial_density(p):
    pair=p['experiment']=='pair'; name=p['initialState']; dimension=4 if pair else 2
    if name=='mixed':
        return np.eye(dimension,dtype=complex)/dimension
    if name=='singlet':
        ket=np.array([0,1,-1,0],complex)/math.sqrt(2)
    elif name=='antiparallel':
        ket=np.array([0,1,0,0],complex)
    else:
        ket={'up':np.array([1,0],complex),'down':np.array([0,1],complex),
             'plus_x':np.array([1,1],complex)/math.sqrt(2)}[name]
        if pair:
            ket=np.kron(ket,ket)
    return np.outer(ket,ket.conj())


def dissipator_adjoint(c,q):
    cc=c.conj().T@c
    return c.conj().T@q@c-(cc@q+q@cc)/2


def adjoint(h, collapses, q):
    return 1j*commutator(h,q)+sum((dissipator_adjoint(c,q) for c in collapses),np.zeros_like(q))


def conservation_proofs(h,terms,observables,collapses):
    rows=[]
    for key,q in observables.items():
        comm=commutator(h,q)
        diss=sum((dissipator_adjoint(c,q) for _,c in collapses),np.zeros_like(q))
        total=1j*comm+diss
        parts=[]
        for name,coefficient,operator in terms:
            part=coefficient*commutator(operator,q)
            parts.append({'term':name,'coefficient':coefficient,'norm':norm(part),
                          'commutator':matrix_json(part),'adjoint':matrix_json(1j*part)})
        baths=[{'channel':name,'norm':norm(dissipator_adjoint(c,q)),
                'adjoint':matrix_json(dissipator_adjoint(c,q))} for name,c in collapses]
        rows.append({'id':key,'label':LABELS[key],'hamiltonianNorm':norm(comm),
                     'dissipatorNorm':norm(diss),'totalAdjointNorm':norm(total),
                     'hamiltonianConserved':norm(comm)<TOL,'conserved':norm(total)<TOL,
                     'trivial':norm(q-np.trace(q)*np.eye(len(q))/len(q))<TOL,
                     'operator':matrix_json(q),'commutator':matrix_json(comm),
                     'adjoint':matrix_json(total),'contributions':parts,'channels':baths})
    return rows


def degeneracy_diagnostic(h,experiment,proofs):
    u=-1j*PAULI[1]
    if experiment=='pair':u=np.kron(u,u)
    sign=-1 if experiment=='single' else 1
    residual=norm(u@h.conj()@u.conj().T-h)
    vals=np.linalg.eigvalsh(h); groups=[]
    for value in vals:
        if groups and abs(float(value)-groups[-1]['energy'])<1e-8:
            groups[-1]['multiplicity']+=1
        else:groups.append({'energy':float(value),'multiplicity':1})
    su2=all(x['hamiltonianConserved'] for x in proofs[:3])
    kramers=sign==-1 and residual<TOL
    if kramers:
        reason='单自旋的物理时间反演满足 T²=−I 且与 H 对易，Kramers 定理强制二重配对。'
    elif residual>=TOL:
        reason='当前 Hamiltonian 破坏物理时间反演；不能用 Kramers 定理保证简并。'
    elif su2:
        reason='双自旋 T²=+I 本身不强制 Kramers 配对；全局 SU(2) 对称性可解释自旋多重态。'
    else:
        reason='双自旋 T²=+I 不强制 Kramers 配对；出现的简并须再检查其他幺正对称性或参数巧合。'
    return {'timeReversalSquare':sign,'timeReversalResidual':residual,'timeReversalSymmetric':residual<TOL,
            'kramersProtected':kramers,'globalSU2':su2,'levels':groups,'eigenvalues':vals.tolist(),
            'timeReversalUnitary':matrix_json(u),'squareResidual':norm(u@u.conj()-sign*np.eye(len(h))),
            'reason':reason,'scope':'仅诊断有限自旋 Hamiltonian；不把耗散生成元谱等同于能级。'}


def calculate(payload):
    p=parameters(payload); h,terms,qs,channels=model(p); cs=[c for _,c in channels]
    rho0=initial_density(p); proofs=conservation_proofs(h,terms,qs,channels)
    selected=next(x for x in proofs if x['id']==p['observable']); q=qs[p['observable']]
    generator=liouvillian(h,cs); times=np.linspace(0,p['duration'],p['points']); dt=float(times[1]-times[0])
    step=matrix_exponential(generator*dt); state=rho0.reshape(-1,order='F'); trajectory=[]
    trace_error=hermiticity_error=0.; minimum_eigenvalue=1.
    for i,t in enumerate(times):
        if i:state=step@state
        rho=state.reshape(h.shape,order='F')
        trace_error=max(trace_error,float(abs(np.trace(rho)-1)))
        hermiticity_error=max(hermiticity_error,norm(rho-rho.conj().T))
        minimum_eigenvalue=min(minimum_eigenvalue,float(np.linalg.eigvalsh((rho+rho.conj().T)/2)[0]))
        trajectory.append({'time':float(t),'expectations':{key:float(np.trace(rho@op).real) for key,op in qs.items()},
                           'selectedDerivative':float(np.trace(rho@adjoint(h,cs,q)).real),
                           'purity':float(np.trace(rho@rho).real),'rho':matrix_json(rho)})
    if trace_error>2e-8 or hermiticity_error>2e-8 or minimum_eigenvalue< -2e-8:
        raise ArithmeticError('演化未通过迹、厄米性或半正定校验。')
    angle=p['basisAngle']*math.pi/180; u=matrix_exponential(-1j*angle*qs['sy'])
    transform=lambda x:u.conj().T@x@u
    hp,qp,rhop=transform(h),transform(q),transform(rho0); cp=[transform(c) for c in cs]
    finalp=(matrix_exponential(liouvillian(hp,cp)*p['duration'])@rhop.reshape(-1,order='F')).reshape(h.shape,order='F')
    final=state.reshape(h.shape,order='F')
    convention={'angleDegrees':p['basisAngle'],'axis':'y','definition':'被动换基：新基矢=旧基矢×U，A′=U†AU；ρ、H、Q、全部C同时变换。',
                'unitary':matrix_json(u),'originalHamiltonian':matrix_json(h),'transformedHamiltonian':matrix_json(hp),
                'originalObservable':matrix_json(q),'transformedObservable':matrix_json(qp),
                'energyResidual':float(np.max(abs(np.linalg.eigvalsh(h)-np.linalg.eigvalsh(hp)))),
                'expectationResidual':float(abs(np.trace(final@q)-np.trace(finalp@qp))),
                'stateResidual':norm(finalp-transform(final)),
                'adjointResidual':norm(adjoint(hp,cp,qp)-transform(adjoint(h,cs,q)))}
    protection=degeneracy_diagnostic(h,p['experiment'],proofs)
    tu=-1j*PAULI[1]
    if p['experiment']=='pair':tu=np.kron(tu,tu)
    tup=u.conj().T@tu@u.conj()
    convention['originalTimeReversalUnitary']=matrix_json(tu)
    convention['transformedTimeReversalUnitary']=matrix_json(tup)
    convention['antiunitarySquareResidual']=norm(tup@tup.conj()-protection['timeReversalSquare']*np.eye(len(h)))
    convention['antiunitaryCovarianceResidual']=norm(tup@hp.conj()@tup.conj().T-transform(tu@h.conj()@tu.conj().T))
    eps=np.linspace(-.3,.3,61); levels=np.array([np.linalg.eigvalsh(h+x*qs['sz']) for x in eps])
    conserved=[x['label'] for x in proofs[:3] if x['hamiltonianConserved']]
    symmetry='全局 SU(2)' if len(conserved)==3 else ('至少有 '+','.join(conserved)+' 生成的连续旋转' if conserved else '三个坐标轴均无连续自旋旋转；不排除斜轴或其他对称性')
    warnings=['这是一个或两个自旋1/2的有限模型；S=σ/2 无量纲，H/ℏ系数为rad/ns。不会据此声称热力学极限自发破缺或Goldstone定理已被验证。',
              '守恒判据是完整算符 L†Q=0，不能由一条期望值恰好平坦的轨迹代替；逐项贡献可以相消。范数是Frobenius范数，不同量纲的Q不直接比较大小。',
              '耗散为各站点独立的现象学 ↑→↓ 弛豫和z纯退相干；浴通道不由Hamiltonian的对称性或温度自动推导。',
              '简并按1e−8 rad/ns分组仅供显示；保护结论使用声明的对称算符，不把数值接近直接称作对称保护。']
    if p['experiment']=='single':warnings.append('单自旋实验忽略 jx、jy、jz 和 gradientZ；S²=3I/4 的守恒是平凡恒等式。')
    if dt*(2*norm(h)+p['gamma1']+2*p['gammaPhi'])>.5:warnings.append('时间采样较稀，可能漏掉快速振荡；请增加点数或缩短演化时间。')
    selected_span=max(s['expectations'][p['observable']] for s in trajectory)-min(s['expectations'][p['observable']] for s in trajectory)
    return {'module':'conservation','action':'conservation_lab','release':RELEASE,'input':p,
            'model':'finite-spin-symmetry-and-adjoint','summary':[
                {'label':'Hilbert空间维数','value':len(h)}, {'label':'所选Q的 [H/ℏ,Q] 范数','value':selected['hamiltonianNorm']},
                {'label':'所选Q的 L†Q 范数','value':selected['totalAdjointNorm']},
                {'label':'所选Q对所有初态守恒','value':'是' if selected['conserved'] else '否'},
                {'label':'当前轨迹Q的变化范围','value':float(selected_span)},
                {'label':'物理时间反演的平方','value':protection['timeReversalSquare']},
                {'label':'Kramers保护条件满足','value':'是' if protection['kramersProtected'] else '否'}],
            'plots':[{'id':'charges','title':'实际演化中的总自旋期望值','xLabel':'t（ns）','yLabel':'⟨S⟩（无量纲）',
                      'series':[{'label':LABELS[key],'points':[[s['time'],s['expectations'][key]] for s in trajectory]} for key in ('sx','sy','sz')]},
                     {'id':'selected-charge','title':'所选观测量的实际轨迹','xLabel':'t（ns）','yLabel':'⟨Q⟩（S²无量纲；H/ℏ为rad/ns）',
                      'series':[{'label':LABELS[p['observable']],'points':[[s['time'],s['expectations'][p['observable']]] for s in trajectory]}]},
                     {'id':'protection','title':'加入 ε S_z 后的Hamiltonian能级','xLabel':'ε（rad/ns）','yLabel':'E/ℏ（rad/ns）',
                      'series':[{'label':'排序能级 '+str(i+1),'points':np.column_stack([eps,levels[:,i]]).tolist()} for i in range(len(h))]}],
            'tables':[{'title':'完整算符判据','columns':['Q','||[H/ℏ,Q]||','||D†Q||','||L†Q||','完整演化守恒'],
                       'rows':[[x['label'],x['hamiltonianNorm'],x['dissipatorNorm'],x['totalAdjointNorm'],'是' if x['conserved'] else '否'] for x in proofs]},
                      {'title':'所选Q的逐项约束来源','columns':['Hamiltonian项','系数','该项对易子范数'],
                       'rows':[[x['term'],x['coefficient'],x['norm']] for x in selected['contributions']]},
                      {'title':'耗散通道的逐项贡献','columns':['通道','||D_c†Q||'],'rows':[[x['channel'],x['norm']] for x in selected['channels']]},
                      {'title':'能级简并与保护','columns':['E/ℏ（rad/ns）','数值重数'],'rows':[[x['energy'],x['multiplicity']] for x in protection['levels']]},
                      {'title':'约定对照的实际数值检查','columns':['检查','残差'],'rows':[[key,convention[key]] for key in ('energyResidual','expectationResidual','stateResidual','adjointResidual')]}],
            'checks':{'passed':max(trace_error,hermiticity_error,convention['stateResidual'],convention['adjointResidual'])<2e-8 and minimum_eigenvalue>=-2e-8,
                      'traceError':trace_error,'hermiticityError':hermiticity_error,'minimumDensityEigenvalue':minimum_eigenvalue,
                      'basisCovarianceResidual':convention['stateResidual'],'antiunitarySquareResidual':protection['squareResidual'],
                      'method':'常量Lindblad生成元矩阵指数；没有密度矩阵归一化或正定性修补'},
            'warnings':warnings,'conservation':{'proofs':proofs,'selected':p['observable'],'trajectory':trajectory,
                'degeneracy':protection,'convention':convention,'hamiltonianSymmetry':symmetry},
            'formulaLinks':[{'id':'commutator-conservation','label':'由生成元检查闭系统守恒','formula':'d⟨Q⟩/dt = i⟨[H/ℏ,Q]⟩',
                'meaning':'Q不显含时间；矩阵恒等式[H,Q]=0保证所有初态的期望守恒。这里不把离散旋转自动等同于角动量守恒。',
                'values':[{'label':'闭系统算符残差','value':selected['hamiltonianNorm']}],'plot':'charges'},
                {'id':'adjoint-conservation','label':'耗散系统的完整条件','formula':'L†Q=i[H/ℏ,Q]+Σ_c(C_c†QC_c−{C_c†C_c,Q}/2)',
                 'meaning':'完整生成元的伴随作用决定守恒；各项范数不能代替先求矩阵和再求范数。',
                 'values':[{'label':'完整算符残差','value':selected['totalAdjointNorm']}],'plot':'selected-charge'},
                {'id':'antiunitary-protection','label':'Kramers条件','formula':'T=U_T K；T²=U_T U_T*',
                 'meaning':'有限自旋能级中需要T²=−I且T与Hamiltonian对易；双自旋的T²=+I不能单独保证配对。',
                 'values':[{'label':'T²符号','value':protection['timeReversalSquare']},{'label':'T对称残差','value':protection['timeReversalResidual']}],'plot':'protection'}]}
