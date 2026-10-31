"""Finite, auditable symmetry teaching models. NumPy only; no remote computation."""
from functools import lru_cache
from itertools import permutations, product
import math
import numpy as np


def number(p, key, default, lo, hi, integer=False):
    x = p.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not lo <= x <= hi or (integer and int(x) != x):
        raise ValueError(f'{key} 必须为 {lo}–{hi} 范围的' + ('整数' if integer else '有限数'))
    return int(x) if integer else float(x)


def choice(p, key, default, values):
    x = p.get(key, default)
    if x not in values:
        raise ValueError(f'{key} 不是支持的选项')
    return x


def rows(values):
    return [dict(label=k, value=v) for k, v in values]


def curve(title, x, ys, xlabel, ylabel):
    return dict(title=title, xLabel=xlabel, yLabel=ylabel,
                series=[dict(label=k, points=[[float(a), float(b)] for a, b in zip(x, v)]) for k, v in ys])


def op_record(r, t=None, **extra):
    return dict(matrix=np.round(r, 12).tolist(), translation=np.round(np.zeros(3) if t is None else t, 12).tolist(), determinant=int(round(np.linalg.det(r))), **extra)


@lru_cache(None)
def cubic_ops():
    ops = []
    for perm in permutations(range(3)):
        for signs in product([-1, 1], repeat=3):
            ops.append(np.eye(3)[list(perm)] * np.array(signs)[:, None])
    return tuple(sorted(ops, key=lambda r: (np.linalg.norm(r - np.eye(3)), tuple(r.ravel()))))


def assignment(cost, tolerance):
    """Species-aware perfect matching, not independent nearest neighbours."""
    allowed = [np.flatnonzero(row <= tolerance).tolist() for row in cost]
    order = sorted(range(len(allowed)), key=lambda i: len(allowed[i]))
    matches = [-1] * len(allowed)
    def walk(k, used):
        if k == len(order):
            return True
        i = order[k]
        for j in allowed[i]:
            if j not in used:
                matches[i] = j
                if walk(k + 1, used | {j}):
                    return True
        return False
    return matches if walk(0, set()) else None


def periodic_cost(x, y, lattice, species):
    inv = np.linalg.inv(lattice)
    d = (x[:, None, :] - y[None, :, :]) @ inv.T
    d[:, :, :2] -= np.round(d[:, :, :2])
    # Nearest-image search also covers the oblique (111) surface basis.
    c = np.full(d.shape[:2], np.inf)
    for a, b in product([-1, 0, 1], repeat=2):
        cart = (d + [a, b, 0]) @ lattice.T
        c = np.minimum(c, np.linalg.norm(cart, axis=2))
    return np.where(np.array(species)[:, None] == np.array(species)[None, :], c, np.inf)


def layer_state(p):
    face = choice(p, 'face', '001', ['001', '110', '111'])
    n = number(p, 'layers', 4, 1, 6, True)
    shift = number(p, 'registry', 0, 0, 1)
    cut = number(p, 'cut', 0, 0, 1, True)
    bulk = choice(p, 'bulk', 'mono', ['mono', 'alternating'])
    interface = choice(p, 'interface', 'same', ['same', 'hetero'])
    termination = choice(p, 'termination', 'same', ['same', 'marker'])
    a, b, c = {'001': ([1,0,0],[0,1,0],[0,0,1]), '110': ([1,-1,0],[0,0,1],[1,0,0]), '111': ([1,-1,0],[0,1,-1],[1,0,0])}[face]
    a, b, c = map(lambda v: np.array(v, float), (a,b,c))
    normal = np.cross(a,b); normal /= np.linalg.norm(normal)
    lattice = np.column_stack([a,b,normal])
    positions = np.array([j*c + (shift*a if j >= (n+1)//2 else 0) for j in range(n)])
    species = [('A' if (j+cut)%2 == 0 else 'B') if bulk == 'alternating' else 'A' for j in range(n)]
    if interface == 'hetero':
        species = [s + ('-upper' if j >= (n+1)//2 else '-lower') for j,s in enumerate(species)]
    if termination == 'marker':
        species[-1] = 'surface-C'
    positions -= positions.mean(axis=0)
    ops = []
    for r in cubic_ops():
        if abs(abs(float(normal @ r @ normal)) - 1) > 1e-8:
            continue
        mapped = positions @ r.T
        for j in range(n):
            if species[j] != species[0]:
                continue
            t = positions[j] - mapped[0]
            if abs(t @ normal) > 1e-8:
                continue
            f = np.linalg.solve(lattice, t); f[:2] %= 1; f[np.abs(f-1)<1e-10] = 0; t = lattice @ f
            if any(np.linalg.norm(r-np.array(o['matrix'])) < 1e-8 and np.linalg.norm(t-o['translation']) < 1e-8 for o in ops):
                continue
            cost = periodic_cost(mapped+t, positions, lattice, species)
            match = assignment(cost, 1e-7)
            if match is not None:
                ops.append(op_record(r,t,permutation=match,flipsNormal=bool(normal@r@normal < 0),residual=float(max(cost[i,j] for i,j in enumerate(match)))))
    # Verify closure of affine representatives modulo only the two surface translations.
    closure = True
    for g in ops:
        for h in ops:
            rr = np.array(g['matrix']) @ np.array(h['matrix'])
            tt = np.array(g['matrix']) @ h['translation'] + g['translation']
            found = False
            for o in ops:
                d = np.linalg.solve(lattice, tt-o['translation'])
                if np.linalg.norm(rr-o['matrix']) < 1e-8 and np.linalg.norm(d[:2]-np.round(d[:2])) < 1e-8 and abs(d[2]) < 1e-8:
                    found = True; break
            closure &= found
    return dict(face=face, positions=positions, species=species, lattice=lattice, normal=normal, operations=ops, closure=bool(closure))


def layer_lab(p):
    s = layer_state(p)
    end = number(p, 'pathEnd', .5, 0, 1)
    xs = np.linspace(0,end,7)
    path = [layer_state(p | {'registry':float(x)}) for x in xs]
    points, labels = [], []
    for i,j in product([-1,0,1],repeat=2):
        for x,l in zip(s['positions'],s['species']):
            points.append((x+i*s['lattice'][:,0]+j*s['lattice'][:,1]).tolist()); labels.append(l)
    return dict(summary=rows([('面内周期方向数',2),('原胞内有限原子层数',len(s['positions'])),('保留仿射操作（模面内平移）',len(s['operations'])),('交换上下表面的操作',sum(o['flipsNormal'] for o in s['operations'])),('仿射操作闭合检验',s['closure'])]),
        geometry=dict(points=points,labels=labels,unit=s['positions'].tolist(),lattice=s['lattice'].tolist(),normal=s['normal'].tolist()),operations=s['operations'],
        plots=[curve('界面横向错位路径',xs,[('保留操作数',[len(t['operations']) for t in path]),('交换两侧的操作数',[sum(o['flipsNormal'] for o in t['operations']) for t in path])],'沿第一面内基矢的错位','操作数')],
        path=[dict(parameter=float(x),order=len(t['operations']),closed=t['closure'],normalFlips=sum(o['flipsNormal'] for o in t['operations'])) for x,t in zip(xs,path)],
        replay=[dict(title='先指定周期与边界',text='只在两条面内基矢方向取模；法向保持有限，不能把上下表面当作周期相邻原子。'),dict(title='保留晶面的小群',text='从立方母体的 48 个正交矩阵中筛选 Rn=±n；再寻找面内分数平移并逐原子匹配。'),dict(title='材料与终止决定真实操作',text='映射必须保持元素标签。可交换上下表面的抽象矩阵，不一定保持异质界面或单面标记。'),dict(title='检验组合与范围',text='逐对核验仿射操作的组合模面内平移闭合。结果是此立方原型继承的层对称操作，不是任意输入结构的 80 层群定名器。')],
        formulas=['r′ = R r + t','R n = ±n','k′ = R k','S′ = det(R) R S'],
        assumptions=['长度以立方母体晶格常数为单位；面内无限周期、法向有限。001/110/111 使用各自的原始面内基矢。','单层和薄层可能具有母体以外的偶然对称性；这里只报告母体继承操作。面内平移代表与三维空间群群阶不可混淆。','教学原型允许同质/异质标签、交替层、两种切割起点与上表面标记；不拟合表面弛豫或真实材料能带。'],inverseDomain='layer')


def motif(kind, handedness=1):
    if kind == 'd3':
        a=.31; x=[]
        for k in range(3):
            t=a+2*np.pi*k/3; x.append([np.cos(t),np.sin(t),.55])
            t=-a+2*np.pi*k/3; x.append([np.cos(t),np.sin(t),-.55])
        labels=['A']*6
    elif kind == 'pyramid':
        x=[[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,1.3]]; labels=['A']*4+['B']
    elif kind == 'octahedron':
        x=np.vstack([np.eye(3),-np.eye(3)]);labels=['A']*6
    else:
        x=[[0,0,0],[1,0,0],[.2,1,0],[.3,.2,handedness]];labels=['A','B','C','D']
    x=np.asarray(x,float);x[:,0]*=handedness if kind!='tetra' else 1
    return x-x.mean(axis=0),labels


def permitted_permutations(labels):
    return np.array([p for p in permutations(range(len(labels))) if all(labels[i]==labels[j] for i,j in enumerate(p))])


def fits(x,y,labels,determinant):
    """All species-preserving permutations + best proper/improper Kabsch rotations."""
    perms=permitted_permutations(labels); targets=y[perms]
    u,_,vh=np.linalg.svd(np.einsum('ni,pnj->pij',x,targets))
    fix=np.ones((len(perms),3));fix[:,-1]=determinant*np.linalg.det(u@vh)
    q=(u*fix[:,None,:])@vh
    delta=np.einsum('ni,pij->pnj',x,q)-targets
    rms=np.sqrt(np.mean(np.sum(delta*delta,axis=2),axis=1))
    maxima=np.max(np.linalg.norm(delta,axis=2),axis=1)
    return perms,q,rms,maxima


def motif_operations(x,labels):
    out=[]
    for det in [1,-1]:
        pp,q,_,mm=fits(x,x,labels,det)
        for perm,mat,res in zip(pp,q,mm):
            if res<1e-7 and not any(np.linalg.norm(mat.T-np.array(o['matrix']))<1e-7 for o in out):
                out.append(op_record(mat.T,permutation=perm.tolist(),residual=float(res)))
    return sorted(out,key=lambda o:np.linalg.norm(np.array(o['matrix'])-np.eye(3)))


def polar_rank(ops):
    a=np.vstack([np.array(o['matrix'])-np.eye(3) for o in ops]);_,ss,vh=np.linalg.svd(a,full_matrices=False)
    keep=ss<1e-7
    return int(sum(keep)),vh[keep].tolist()


def chirality_lab(p):
    kind=choice(p,'motif','d3',['d3','pyramid','octahedron','tetra'])
    hand=choice(p,'handedness',1,[-1,1])
    noise=number(p,'noise',0,0,.12);tol=number(p,'tolerance',.01,1e-6,.3)
    optical=choice(p,'optical','natural',['natural','faraday']);angle=number(p,'angle',20,-90,90)
    ideal,labels=motif(kind,hand); ids=np.arange(ideal.size).reshape(ideal.shape)
    perturb=np.sin((ids+1)*1.731)+.31*np.cos((ids+2)*.912);perturb-=perturb.mean(axis=0);perturb/=np.max(np.linalg.norm(perturb,axis=1))
    x=ideal+noise*perturb;mirror=x*np.array([-1,1,1])
    pp,q,rms,mm=fits(mirror,x,labels,1);best=int(np.argmin(rms))
    ops=motif_operations(x,labels);pr,basis=polar_rank(ops)
    candidates=motif_operations(ideal,labels);res=[]
    for o in candidates:
        res.append(float(np.max(np.linalg.norm(x@np.array(o['matrix']).T-x[o['permutation']],axis=1))))
    accepted=[o for o,e in zip(candidates,res) if e<=tol]
    closed=all(any(np.linalg.norm(np.array(a['matrix'])@np.array(b['matrix'])-np.array(c['matrix']))<1e-7 for c in accepted) for a in accepted for b in accepted)
    grid=np.geomspace(1e-6,.3,25)
    chiral=not any(o['determinant']<0 for o in ops)
    theta=math.radians(angle)*(hand if optical=='natural' else 1)
    # Optical toy is independent of the geometric fitting; do not infer a material rotation coefficient.
    rot=lambda t:np.array([[np.cos(t),-np.sin(t)],[np.sin(t),np.cos(t)]])
    forward=rot(theta);back=rot(-theta if optical=='natural' else theta)
    return dict(summary=rows([('当前构型的几何手性',chiral),('严格对称操作数',len(ops)),('允许极向量子空间维数',pr),('镜像最佳正旋转配准 RMS',float(rms[best])),('容差下近似候选操作数',len(accepted)),('近似候选集合闭合',bool(closed))]),geometry=dict(points=x.tolist(),labels=labels,mirror=mirror.tolist(),aligned=(mirror@q[best]).tolist(),permutation=pp[best].tolist()),operations=ops,
        mirrorFit=dict(rms=float(rms[best]),maximum=float(mm[best]),rotation=q[best].T.tolist(),determinant=float(np.linalg.det(q[best])),speciesPreserved=True),polarBasis=basis,
        pseudo=dict(noise=noise,tolerance=tol,residuals=[dict(index=i,maximum=e,accepted=bool(e<=tol)) for i,e in enumerate(res)],closed=bool(closed),referenceOrder=len(candidates)),
        optical=dict(model=optical,forward=forward.tolist(),backward=back.tolist(),roundTrip=(back@forward).tolist(),output=(back@forward@np.array([1,0])).tolist(),angle=angle),
        plots=[curve('容差扫描与伪对称性',grid,[('接受的母构型操作',[sum(e<=t for e in res) for t in grid])],'距离容差（模型长度）','候选操作数')],
        path=[dict(parameter=float(t),accepted=int(sum(e<=t for e in res))) for t in grid],
        replay=[dict(title='固定元素与镜像定义',text='将 x 坐标反号构造镜像。只枚举同种原子的排列，再用行列式 +1 的最佳刚体旋转配准；坐标换基不会被当作物理镜像。'),dict(title='分别判定手性与极性',text='枚举刚体正交等距操作；存在不正操作则构型非手性。解 (R−I)P=0 得到允许极向量方向，而不是自发极化值。'),dict(title='观察容差与闭合',text='在理想母构型操作下逐原子检查最大位移。近似接受集合可能不闭合，因此不能直接授予新的严格点群标签。'),dict(title='独立的往返偏振实验',text='光学模型固定实验室 x/y 轴，忽略镜面的共同相位：自然旋光的回程取 R(−θ)，Faraday 回程取 R(θ)。θ 是外加教学参数，不由几何配准计算。')],
        formulas=['det(R) = +1','R P = P','R(−θ) R(θ) = I'],assumptions=['这里分析 4–6 个位点的有限点集，D₃ 原型、四方锥、八面体和四个不同标签的四面体；不声称从任意晶体直接判定绝对结构。','严格操作用 10⁻⁷ 模型长度阈值；伪对称候选始终来自理想母构型，保留逐原子对应关系。','允许极性不等于存在自发极化或可逆铁电开关。独立 Jones 旋转实验不代表该点集的光学常数。'],inverseDomain='chirality')


@lru_cache(None)
def spin_base(n,boundary):
    sx=np.array([[0,1,0],[1,0,1],[0,1,0]],complex)/np.sqrt(2)
    sy=np.array([[0,-1j,0],[1j,0,-1j],[0,1j,0]],complex)/np.sqrt(2)
    sz=np.diag([1.,0.,-1.]);eye=np.eye(3)
    def tensor(ms):
        a=np.ones((1,1),complex)
        for m in ms:a=np.kron(a,m)
        return a
    sites=[[tensor([s if j==i else eye for j in range(n)]) for s in [sx,sy,sz]] for i in range(n)]
    dim=3**n;h=np.zeros((dim,dim),complex);ident=np.eye(dim)
    bonds=[(i,i+1) for i in range(n-1)]+([(n-1,0)] if boundary=='periodic' else [])
    for i,j in bonds:
        dot=sum(sites[i][a]@sites[j][a] for a in range(3));h+=dot+dot@dot/3+2*ident/3
    anis=sum(s[2]@s[2] for s in sites)
    uniform=sum(s[0]+.37*s[2] for s in sites)
    gradient=sum((i+1)/n*(s[0]+.37*s[2]) for i,s in enumerate(sites))
    rx=tensor([eye-2*sx@sx]*n);rz=tensor([eye-2*sz@sz]*n);time=tensor([eye-2*sy@sy]*n)
    digits=np.array(list(product(range(3),repeat=n)));rev=np.ravel_multi_index(digits[:,::-1].T,[3]*n)
    inv=ident[rev]
    return h,anis,uniform,gradient,sites,{'Rx':rx,'Rz':rz,'T':time,'inversion':inv}


def spin_symmetry(h,ops):
    scale=max(1,float(np.linalg.norm(h)));out={}
    # These symmetry matrices are signed permutations; avoid dense O(dim^3) conjugations.
    for key,u in ops.items():
        perm=np.argmax(np.abs(u),axis=1);sign=u[np.arange(len(u)),perm]
        source=h.conj() if key=='T' else h
        transformed=source[np.ix_(perm,perm)]*sign[:,None]*sign.conj()[None,:]
        out[key]=float(np.linalg.norm(transformed-h)/scale)
    return out


def spin_point(n,boundary,d,field,pattern,state=True):
    h0,anis,uniform,gradient,sites,ops=spin_base(n,boundary)
    h=h0+d*anis+field*(uniform if pattern=='uniform' else gradient)
    energies,vecs=np.linalg.eigh(h);deg=int(sum(abs(energies-energies[0])<1e-8))
    r=dict(energies=energies[:min(10,len(energies))].real.tolist(),groundMultiplicity=deg,firstSpacing=float(energies[1]-energies[0]),gapAboveGroundSpace=float(energies[deg]-energies[0]) if deg<len(energies) else None,symmetry=spin_symmetry(h,ops))
    if state:
        v=vecs[:,:deg];diagonal=np.sum(abs(v)**2,axis=1);seed=int(np.argmax(diagonal));psi=v@v[seed].conj()/np.sqrt(diagonal[seed])
        cut=n//2;schmidt=np.linalg.svd(psi.reshape(3**cut,-1),compute_uv=False)**2;schmidt=np.maximum(0,schmidt.real);schmidt/=schmidt.sum()
        entropy=float(-sum(w*np.log(w) for w in schmidt if w>1e-14))
        op=sites[0][2]@sites[-1][2]
        for i in range(1,n-1):op=op@(np.eye(3**n)-2*sites[i][2]@sites[i][2])
        r.update(schmidt=schmidt.tolist(),entropy=entropy,stringOrder=float(-np.vdot(psi,op@psi).real),magnetization=[float(np.vdot(psi,s[2]@psi).real) for s in sites],stateResidual=float(np.linalg.norm(h@psi-energies[0]*psi)),stateSelection=f'基态投影作用于计算基矢 #{seed}；简并度 {deg} 时此纯态不是唯一的边界态。')
    return r


def spt_lab(p):
    n=number(p,'sites',4,3,5,True);boundary=choice(p,'boundary','periodic',['periodic','open'])
    d=number(p,'anisotropy',0,0,8);field=number(p,'field',0,0,1)
    pattern=choice(p,'fieldPattern','gradient',['gradient','uniform']);axis=choice(p,'pathAxis','anisotropy',['anisotropy','field'])
    end=number(p,'pathEnd',4,0,8 if axis=='anisotropy' else 1)
    r=spin_point(n,boundary,d,field,pattern);xs=np.linspace(0,end,7)
    path=[spin_point(n,boundary,float(x) if axis=='anisotropy' else d,float(x) if axis=='field' else field,pattern,False)|{'parameter':float(x)} for x in xs]
    aklt=bool(d==0 and field==0)
    return dict(summary=rows([('自旋 1 位点数',n),('Hilbert 空间维数',3**n),('基态子空间维数',r['groundMultiplicity']),('最低两能级间距',r['firstSpacing']),('基态子空间上方能隙',r['gapAboveGroundSpace']),('代表纯态纠缠熵',r['entropy']),('串关联（本页符号约定）',r['stringOrder'])]),spectrum=r,
        geometry=dict(points=[[i-(n-1)/2,0,0] for i in range(n)],labels=['S=1']*n),operations=[op_record(np.eye(3),name='恒等'),op_record(np.diag([1,-1,-1]),name='绕 x 的 π 旋转'),op_record(np.diag([-1,-1,1]),name='绕 z 的 π 旋转')],
        virtual=dict(available=aklt,commutatorPhase=-1 if aklt else None,Ux=[[0,1],[1,0]],Uz=[[1,0],[0,-1]],explanation='仅在 AKLT 点展示解析虚拟自旋 1/2：Ux Uz = −Uz Ux。扰动后的有限能谱不自动给出该射影不变量。'),
        plots=[curve('纠缠谱权重（Schmidt 概率）',range(len(r['schmidt'])),[('概率',r['schmidt'])],'Schmidt 序号','概率'),curve('有限链扰动路径',xs,[('最低两级间距',[a['firstSpacing'] for a in path]),('基态子空间上方能隙',[a['gapAboveGroundSpace'] for a in path])],('D' if axis=='anisotropy' else 'h')+' / J','能量 / J'),curve('代表态局域磁化',range(1,n+1),[('Sz',r['magnetization'])],'位点','期望值')],path=path,
        replay=[dict(title='建立 AKLT 母 Hamiltonian',text='每条键使用 S·S+(S·S)²/3+2/3=2P(S总=2)，逐项构造 3^N 维矩阵。J=1；周期边界额外连接末端与首端。'),dict(title='先检查保护操作',text='分别计算 Rx、Rz、时间反演和键中心反演的 Hamiltonian 协变残差。均匀磁场可破坏自旋与时间反演而保留空间反演，不能只看一个开关宣布全部保护消失。'),dict(title='分解真实有限链基态',text=r['stateSelection']+' 对选定纯态做 Schmidt 分解；开边界简并态的纠缠谱需连同态选择报告。'),dict(title='连接解析射影表示与有限尺寸结果',text='AKLT 虚拟自旋矩阵的反对易是解析证据。小链能隙或某一纠缠简并既不能单独证明热力学极限中的相变，也不能普遍替代 SPT 分类。')],
        formulas=['H = Σ [S_i·S_j + (S_i·S_j)²/3 + 2/3] + D Σ (S_i^z)² + H_h','U_x U_z = −U_z U_x','S = −Σ λ_i log(λ_i)'],
        assumptions=['N=3–5 的精确对角化教学模型；全部能量以 J 为单位。梯度场为 h Σ ((i+1)/N)(Sx_i+0.37 Sz_i)，均匀场去掉位点系数。','简并时从基态投影选择确定的纯态；这不是对简并子空间的混合态求 Schmidt 分解。有限链边缘劈裂、纠缠权重及边界条件一起显示。','AKLT 点的射影表示单独给出；对一般扰动不自动输出体相拓扑标签。路径只有 7 个采样点，不声称定位所有闭隙或热力学临界点。'],inverseDomain='spt')


def linked(p):
    r=np.asarray(p.get('matrix',np.eye(3)),float);t=np.asarray(p.get('translation',[0,0,0]),float)
    vectors=[np.asarray(p.get(k,d),float) for k,d in [('position',[.3,.2,.1]),('momentum',[.4,.3,.2]),('spin',[.2,.4,.7])]]
    if r.shape!=(3,3) or t.shape!=(3,) or any(v.shape!=(3,) for v in vectors) or not all(np.isfinite(a).all() and np.max(abs(a))<=100 for a in [r,t]+vectors) or np.linalg.norm(r.T@r-np.eye(3))>1e-7:raise ValueError('联动输入须为有限正交矩阵与三维向量')
    time=choice(p,'timeReversal',False,[False,True]);sign=-1 if time else 1;det=int(round(np.linalg.det(r)));x,k,s=vectors
    phase=float(-(sign*r@k)@t)
    return dict(real=(r@x+t).tolist(),momentum=(sign*r@k).tolist(),spin=(sign*det*r@s).tolist(),determinant=det,timeReversal=time,phase=[float(np.cos(phase)),float(np.sin(phase))],phaseAngle=phase,norms=dict(momentum=float(np.linalg.norm(k)),spin=float(np.linalg.norm(s))),convention='主动操作；r 为长度、k 为弧度/长度。平移相位按变换后波矢 exp(−i k′·t)；反幺正操作还须共轭完整波函数，不能只使用这个相位。')


@lru_cache(None)
def inverse_library(domain):
    if domain=='chirality':
        out=[]
        for k,title in [('d3','D3 手性非极性原型'),('pyramid','C4v 极性锥体'),('octahedron','Oh 中心对称八面体'),('tetra','C1 手性极性四位点')]:
            x,l=motif(k);ops=motif_operations(x,l)
            out.append(dict(id=k,title=title,facts=dict(chiral=all(o['determinant']>0 for o in ops),polar=polar_rank(ops)[0]>0,inversion=any(np.linalg.norm(np.array(o['matrix'])+np.eye(3))<1e-7 for o in ops))))
        return out
    if domain=='layer':
        out=[]
        for key,title,p in [('symmetric','对称四层薄膜',{}),('surface','上表面标记',{'termination':'marker'}),('shift','错位异质界面',{'registry':.23,'interface':'hetero'})]:
            ops=layer_state(p)['operations'];rs=[np.array(o['matrix']) for o in ops]
            out.append(dict(id=key,title=title,facts=dict(exchangeSides=any(o['flipsNormal'] for o in ops),fourfold=any(abs(np.trace(r)-1)<1e-7 and abs(np.linalg.det(r)-1)<1e-7 for r in rs),inversion=any(np.linalg.norm(r+np.eye(3))<1e-7 for r in rs))))
        return out
    h,a,u,g,_,ops=spin_base(3,'periodic')
    return [dict(id=k,title=t,facts={name:res<1e-8 for name,res in spin_symmetry(mat,ops).items()}) for k,t,mat in [('anisotropy','D=2 的各向异性链',h+2*a),('uniform','均匀倾斜磁场链',h+.3*u),('gradient','梯度倾斜磁场链',h+.3*g)]]


def inverse(p):
    domain=choice(p,'domain','chirality',['chirality','layer','spt']);lib=inverse_library(domain)
    target=choice(p,'target',lib[0]['id'],[x['id'] for x in lib]);hidden=next(x for x in lib if x['id']==target)
    measures=list(hidden['facts']);revealed=p.get('revealed',[])
    if not isinstance(revealed,list) or len(revealed)>len(measures) or len(set(revealed))!=len(revealed) or any(k not in measures for k in revealed):raise ValueError('无效的测量列表')
    observations={k:hidden['facts'][k] for k in revealed}
    remaining=[x for x in lib if all(x['facts'][k]==v for k,v in observations.items())]
    gains={k:sum(x['facts'][k] for x in remaining)*sum(not x['facts'][k] for x in remaining) for k in measures if k not in revealed}
    best=max(gains,key=gains.get) if gains and max(gains.values())>0 else None
    guesses=p.get('guesses',[])
    if not isinstance(guesses,list) or any(g not in [x['id'] for x in lib] for g in guesses) or len(set(guesses))!=len(guesses):raise ValueError('无效的候选集合')
    return dict(candidates=[dict(id=x['id'],title=x['title']) for x in lib],measurements=measures,observations=observations,remaining=[x['id'] for x in remaining],unique=len(remaining)==1,nextMeasurement=best,graded=bool(p.get('grade',False)),correct=set(guesses)=={x['id'] for x in remaining},scope='仅在列出的教学候选中排除；操作对称性不等同于可由单次实验直接确定的材料群或体相拓扑。')


def run(action,p):
    r = {'layer_symmetry_lab':layer_lab,'chirality_polarity_lab':chirality_lab,'manybody_spt_lab':spt_lab,'symmetry_linked':linked,'frontier_inverse':inverse}[action](p)
    if 'inverseDomain' in r:
        r['inverseSetup'] = inverse({'domain':r['inverseDomain']})
    return r
