"""Small, explicit models for statistics, defects and reciprocal response.

Exact permutation algebra uses SymPy. Texture sampling and response tensors
are finite educational models, not a material fitting or homotopy solver.
"""
import ast
import itertools
import math
import numpy as np
import sympy as sp

RELEASE = '20261031-connections1'


def number(p, key, default, lo, hi):
    value = float(p.get(key, default))
    if not math.isfinite(value) or not lo <= value <= hi:
        raise ValueError(f'{key} 须在 {lo} 到 {hi} 之间')
    return value


def choice(p, key, default, values):
    value = p.get(key, default)
    if value not in values:
        raise ValueError(f'{key} 不在支持的选项中')
    return value


def exact(matrix):
    return [[str(sp.simplify(x)) for x in row] for row in matrix.tolist()]


def numeric(matrix):
    return np.array(matrix, dtype=float).tolist()


def result(module, p, summary, notes):
    return dict(module=module, release=RELEASE, parameters=p, summary=[dict(label=k,value=v) for k,v in summary], notes=notes,
                tables=[], formulas=[], replay=[], plot={}, symbolicTasks=[], challenge={})


def permutation(n, d, order):
    basis=list(itertools.product(range(d), repeat=n)); indices={x:i for i,x in enumerate(basis)}
    out=sp.zeros(d**n)
    for j, word in enumerate(basis):
        out[indices[tuple(word[i] for i in order)],j]=1
    return out


def statistics(p):
    mode=choice(p,'mode','two',['two','three'])
    orbital=choice(p,'orbital','symmetric',['same','symmetric','antisymmetric'])
    spin=choice(p,'spin','singlet',['singlet','triplet0','upup'])
    swap=choice(p,'swap','12',['12','23','13'])
    if mode=='two':
        e=sp.eye(4)
        orb={'same':e[:,0],'symmetric':(e[:,1]+e[:,2])/sp.sqrt(2),'antisymmetric':(e[:,1]-e[:,2])/sp.sqrt(2)}[orbital]
        chi={'singlet':(e[:,1]-e[:,2])/sp.sqrt(2),'triplet0':(e[:,1]+e[:,2])/sp.sqrt(2),'upup':e[:,0]}[spin]
        psi=sp.kronecker_product(orb,chi)
        exchange=sp.kronecker_product(permutation(2,2,(1,0)),permutation(2,2,(1,0)))
        anti=(sp.eye(16)-exchange)/2; projected=anti*psi
        norm=sp.simplify((projected.T*projected)[0]); sign=sp.simplify((psi.T*exchange*psi)[0])
        labels=[f'{a}{b};{s}{t}' for a,b,s,t in itertools.product('ab','ab','↑↓','↑↓')]
        rows=[[labels[i],str(psi[i]),str((exchange*psi)[i]),str(projected[i])] for i in range(16) if psi[i]!=0]
        r=result('statistics',p,[('总交换本征值',int(sign)),('费米投影后范数平方',int(norm)),('允许的费米态',bool(norm))],
                 ['基顺序为轨道(a,b)的两粒子空间 × 自旋(↑,↓)的两粒子空间；交换同时作用于两部分。',
                  '这里枚举完整波函数的交换性质；不把张量轴换序自动解释为费米符号，也不由交换奇偶决定能量高低。'])
        r['tables']=[dict(title='完整波函数的非零振幅（精确）',headers=['轨道;自旋','原态','交换后','反对称投影后'],rows=rows)]
        r['replay']=[dict(title='轨道态',matrix=numeric(orb),text='同轨道或对称轨道为 +1；反对称轨道为 −1。'),dict(title='自旋态',matrix=numeric(chi),text='单重态为 −1；三重态为 +1。'),dict(title='完整交换',matrix=numeric(exchange),text='同时交换轨道和自旋，总符号为两者之积。'),dict(title='费米投影',matrix=numeric(projected),text=f'投影范数平方为 {norm}；零向量不可归一化。')]
        r['plot']=dict(kind='amplitudes',labels=[row[0] for row in rows],values=[float(psi[i]) for i in range(16) if psi[i]!=0],after=[float(projected[i]) for i in range(16) if psi[i]!=0])
        r['checks']=dict(idempotent=anti*anti==anti,exchangeSquared=exchange*exchange==sp.eye(16),rank=int(anti.trace()))
        r['challenge']=dict(question='同一轨道的两个电子取自旋三重态，费米投影后会怎样？',choices=['得到归一化三重态','得到零向量，不能归一化','交换只改变坐标标签'],answer=1,explanation='轨道与自旋都对称，总态为 +1，(I−P)/2 将它消去。')
    else:
        perms=list(itertools.permutations(range(3))); identity=sp.eye(8)
        signs=[(-1)**sum(o[i]>o[j] for i in range(3) for j in range(i+1,3)) for o in perms]
        mats=[permutation(3,2,o) for o in perms]
        sym=sum(mats,sp.zeros(8))/6; anti=sum((s*m for s,m in zip(signs,mats)),sp.zeros(8))/6
        mixed=identity-sym-anti
        p12=permutation(3,2,(1,0,2));p13=permutation(3,2,(2,1,0))
        young=(identity+p12)*(identity-p13)
        selected={'12':p12,'13':p13,'23':permutation(3,2,(0,2,1))}[swap]
        seed=sp.eye(8)[:,1]; image=selected*seed
        r=result('statistics',p,[('对称子空间维数',int(sym.trace())),('反对称子空间维数',int(anti.trace())),('混合对称子空间维数',int(mixed.trace()))],
                 ['S₃ 作用于三个二能级张量因子，维数为 8；全反对称空间为零，因为单粒子空间只有二维。',
                  '混合中心投影是正交投影；Young 算符 Y=(I+P₁₂)(I−P₁₃) 满足 Y²=3Y，Y/3 幂等但通常不厄米。它不是完整同粒子态的统计条件。'])
        r['tables']=[dict(title='S₃ 中心投影',headers=['通道','秩','幂等','相互正交'],rows=[[name,int(mat.trace()),mat*mat==mat,mat*other==sp.zeros(8)] for name,mat,other in [('对称',sym,anti),('反对称',anti,mixed),('混合',mixed,sym)]])]
        r['replay']=[dict(title=f'置换 {o}',matrix=numeric(mat),text=f'反对称加权符号 {s}') for o,mat,s in zip(perms,mats,signs)]+[dict(title='对称投影',matrix=numeric(sym),text='六个操作等权平均。'),dict(title='混合中心投影',matrix=numeric(mixed),text='I 减去对称与反对称中心投影。'),dict(title='Young 对称化',matrix=numeric(young/3),text='行对称、列反对称；核验幂等性和非厄米性。')]
        r['plot']=dict(kind='amplitudes',labels=[''.join(map(str,x)) for x in itertools.product(range(2),repeat=3)],values=numeric(seed.T)[0],after=numeric(image.T)[0])
        r['exactProjectors']={k:exact(v) for k,v in [('symmetric',sym),('antisymmetric',anti),('mixed',mixed),('young',young/3)]}
        r['checks']=dict(resolution=sym+anti+mixed==identity,youngSquared=young*young==3*young,youngHermitian=young==young.T)
        r['challenge']=dict(question='三个二能级粒子的全反对称子空间为什么是零？',choices=['S₃ 没有反对称表示','单粒子空间维数小于粒子数','混合对称投影计算失败'],answer=1,explanation='S₃ 有符号表示，但它在此张量空间中的重数为零；不能把群的表示与某个模型的出现次数混淆。')
    r['formulas']=['P_- = (I − P)/2','P^2 = I','Y^2 = 3Y']
    r['symbolicTasks']=['projector','young','exchange']
    return r


def defects(p):
    model=choice(p,'model','xy',['xy','nematic','ising'])
    d=number(p,'separation',2,0,4);cx=number(p,'loopX',0,-3,3);cy=number(p,'loopY',0,-3,3)
    radius=number(p,'radius',1,0.1,3);phase=math.radians(number(p,'phase',0,-180,180))
    pair=choice(p,'texture','pair',['pair','single'])
    r=result('defects',p,[],['纹理由解析场指定，没有执行能量极小化或实时动力学；拓扑分类不保证能量稳定。','环路不穿过核心且采样充分时才报告绕数；核心穿越、边界逃逸和纹理合并须单独判断。'])
    if model=='ising':
        x=np.linspace(-4,4,129);v=np.tanh((x-cx)/radius)
        r['summary']=[dict(label='序参量空间',value='两个离散点'),dict(label='左右边界',value='− / +'),dict(label='固定异号边界下的畴壁',value=True)]
        r['plot']=dict(kind='ising',x=x.tolist(),values=v.tolist())
        r['tables']=[dict(title='边界条件',headers=['量','解释'],rows=[['x 中心',cx],['宽度',radius],['拓扑条件','保持异号边界时，连续实标量场必有零点；有限窗口数值不等于无限远真空。']])]
        r['replay']=[dict(title='选定两种真空',text='离散序参量的两个连通分支。'),dict(title='固定左右边界',text='左负右正，连续实标量场必须经过零。'),dict(title='改变畴壁宽度',text='宽度和中心不改变异号边界约束，但能量需另给自由能泛函。')]
    else:
        m=2 if model=='nematic' else 1
        cores=[(-d/2,0,1)] if pair=='single' else ([] if d==0 else [(-d/2,0,1),(d/2,0,-1)])
        def theta(x,y):return phase+sum(q*math.atan2(y-b,x-a) for a,b,q in cores)/m
        phi=np.linspace(0,2*math.pi,257);path=np.column_stack([cx+radius*np.cos(phi),cy+radius*np.sin(phi)])
        values=np.array([theta(x,y) for x,y in path]);increments=np.angle(np.exp(1j*m*np.diff(values)))
        core_gap=min((abs(math.hypot(a-cx,b-cy)-radius) for a,b,q in cores),default=100)
        expected=sum(q for a,b,q in cores if math.hypot(a-cx,b-cy)<radius)
        winding=float(sum(increments)/(2*math.pi));valid=core_gap>max(1e-5,radius*.03) and max(abs(increments),default=0)<.8*math.pi and abs(winding-expected)<1e-7
        field=[]
        for y in np.linspace(-3,3,17):
            for x in np.linspace(-3,3,17):
                if any(math.hypot(x-a,y-b)<.14 for a,b,q in cores):continue
                t=theta(x,y);field.append([float(x),float(y),math.cos(t),math.sin(t)])
        r['summary']=[dict(label='序参量空间',value='平面指向矢 RP¹（角度模 π）' if m==2 else 'S¹（角度模 2π）'),dict(label='环路诊断有效',value=bool(valid)),dict(label='整数绕数（双角场）' if m==2 else '整数绕数',value=round(winding) if valid else '未定义 / 需移动环路'),dict(label='指向矢角度绕转 / 2π' if m==2 else '角度绕转 / 2π',value=round(winding)/m if valid else '未定义')]
        r['plot']=dict(kind='texture',field=field,path=path[::4].tolist(),cores=cores,headless=m==2)
        r['diagnostics']=dict(valid=bool(valid),coreDistance=float(core_gap),winding=round(winding) if valid else None,expected=expected,charge=round(winding)/m if valid else None)
        r['tables']=[dict(title='环路与核心',headers=['检查','结果'],rows=[['环路距最近核心',core_gap],['离散相位最大步长',float(max(abs(increments),default=0))],['解析包围核心电荷和',expected],['单值场', 'exp(2iθ)' if m==2 else 'exp(iθ)']])]
        r['replay']=[dict(title='确定序参量空间',text='平面向列取 θ 与 θ+π 等价；不将它当成三维 RP²。' if m==2 else 'XY 限制序参量在圆 S¹ 上；放开出平面自由度会改变分类。'),dict(title='沿闭环取样',text='使用 256 段，计算相邻单值复场的主值相位差。'),dict(title='检查核心与分辨率',text='环路经过核心或离散步长过大时拒绝报告整数。'),dict(title='累加并对照',text='数值绕数与解析包围电荷交叉核验；d=0 的成对解析场为均匀场，这只是构型终点。')]
    r['formulas']=['G/H','w = Δθ/(2π)','n ≡ −n']
    r['symbolicTasks']=['winding']
    r['challenge']=dict(question='让 XY 涡旋脱离平面，原先的平面绕数还能无条件保护它吗？',choices=['一定能，绕数总是整数','不能；允许态空间已改变','只要图像不变就能'],answer=1,explanation='平面 S¹ 的闭环分类依赖平面约束；三维单位矢量 S² 的闭环可收缩。能量障碍需要另行计算。')
    return r


def response(p):
    model=choice(p,'model','hall',['hall','thermo','mixed'])
    space=choice(p,'space','c4',['c1','c4','mirror'])
    a=number(p,'a',1,0.05,4);b=number(p,'b',1.4,0.05,4)
    cross=number(p,'cross',.25,-2,2);odd=number(p,'odd',.4,-2,2)
    B=number(p,'field',.6,-3,3);M=number(p,'magnetization',.3,-3,3)
    error=number(p,'violation',0,-2,2);rev=choice(p,'reverseM','yes',['yes','no'])
    fx=number(p,'forceX',1,-2,2);fy=number(p,'forceY',0,-2,2)
    eps=np.diag([1,-1] if model=='mixed' else [1,1])
    def matrix(field,mag):
        t=field+mag
        if model=='hall':
            L=np.array([[a,odd*t],[-odd*t,b]],float)
            if space=='c4':L[0,0]=L[1,1]=(a+b)/2
        elif model=='thermo':L=np.array([[a,cross+odd*t],[cross-odd*t,b]],float)
        else:L=np.array([[a,cross*t+odd],[cross*t-odd,b]],float)
        L[0,1]+=error
        return L
    L=matrix(B,M);LR=matrix(-B,-M if rev=='yes' else M);correct=matrix(-B,-M)
    residual=float(np.linalg.norm(L-eps@LR.T@eps));canonical=float(np.linalg.norm(L-eps@correct.T@eps))
    S=(L+L.T)/2;A=(L-L.T)/2;ev=np.linalg.eigvalsh(S);F=np.array([fx,fy]);J=L@F
    r=result('reciprocity',p,[('所选反转的互易残差',residual),('全部奇参量反转的残差',canonical),('耗散矩阵最小本征值',float(ev[0])),('此激励下熵产生率',float(F@L@F))],
             ['线性、近稳态、无量纲的熵共轭力与流模型；不是材料输运系数的拟合。奇偶指对应热力学状态变量在时间反演下的奇偶。',
              '热电模型的两变量为电荷与能量（均为偶）；混合模型为一偶一奇的抽象变量，不冒充常规电热矩阵。',
              '空间选项只作用于二维 Hall 空间分量；热电和混合变量是标量通道，空间矩阵不作用于其通道索引。',
              '非零 violation 是故意加入的错误候选响应，用于反例诊断。对称性或互易性通过不保证耗散矩阵半正定。'])
    spatial='标量通道：未施加空间分量变换'
    if model=='hall':
        R={'c1':np.eye(2),'c4':np.array([[0,-1],[1,0]]),'mirror':np.diag([1,-1])}[space]
        # Axial Bz and Mz change sign under an in-plane reflection.
        sign=float(np.linalg.det(R));spatial_res=float(np.linalg.norm(matrix(sign*B,sign*M)-R@L@R.T))
        same=float(np.linalg.norm(L-R@L@R.T))
        spatial=f'协变残差 {spatial_res:.6g}；同一磁态的矩阵不变残差 {same:.6g}'
        r['spatial']=dict(covariance=spatial_res,sameState=same,controlsRetained=space!='mirror' or (B==0 and M==0))
    r['tables']=[dict(title='互易约定与稳定性',headers=['量','结果'],rows=[['变量奇偶','(+1,−1)' if model=='mixed' else '(+1,+1)'],['磁场反转',f'{B} → {-B}'],['磁畴反转',f'{M} → {-M if rev=="yes" else M}'],['全部激励下非负耗散',bool(ev[0]>=-1e-10)],['空间约束',spatial]])]
    r['plot']=dict(kind='response',matrix=L.tolist(),reversed=LR.tolist(),symmetric=S.tolist(),antisymmetric=A.tolist(),force=F.tolist(),flux=J.tolist(),parities=np.diag(eps).tolist())
    r['checks']=dict(reciprocal=canonical<1e-10,selectedReversal=residual<1e-10,passive=bool(ev[0]>=-1e-10),entropy=float(F@L@F))
    r['replay']=[dict(title='先确定变量与约定',text='从状态变量的时间反演奇偶得到 ε，而不是直接拿流的直觉奇偶代替。'),dict(title='空间对称约束',text=spatial),dict(title='反转奇参量并交换通道',matrix=(eps@LR.T@eps).tolist(),text='比较 L(B,M) 与 E Lᵀ(−B,−M) E；磁化未反转时一般不相等。'),dict(title='检查耗散',matrix=S.tolist(),text='熵产生只依赖对称部分；最小本征值须非负，才能对所有力非负。')]
    r['formulas']=['L_ij(B,M) = ε_i ε_j L_ji(−B,−M)','L = S + A','σ = X^T S X']
    r['symbolicTasks']=['onsager','commutator']
    r['challenge']=dict(question='有磁畴时只反转外磁场，没有反转磁化。测得不互易就否定 Onsager 吗？',choices=['可以直接否定','不可以，比较的参量反转不完整','只需检查两个对角元'],answer=1,explanation='应比较所有时间反演奇参量一并反转的配置，还要核实线性响应、变量定义和测量条件。')
    return r


def audit(p):
    hx=number(p,'hx',1,-2,2);hz=number(p,'hz',0,-2,2)
    theta=math.radians(number(p,'stateAngle',0,-180,180));probe=math.radians(number(p,'probeAngle',90,-180,180))
    purity=number(p,'polarization',1,0,1);kind=choice(p,'operation','z',['z','time'])
    x=np.array([[0,1],[1,0]],complex);y=np.array([[0,-1j],[1j,0]]);z=np.diag([1,-1]);identity=np.eye(2)
    H=hx*x+hz*z;rho=(identity+purity*(math.sin(theta)*x+math.cos(theta)*z))/2;O=math.sin(probe)*x+math.cos(probe)*z
    U=z if kind=='z' else 1j*y
    def transform(A):return U@(A.conj() if kind=='time' else A)@U.conj().T
    residuals=[float(np.linalg.norm(transform(A)-A)) for A in [H,rho,O]]
    odd=float(np.linalg.norm(transform(O)+O))<1e-9
    return dict(operation='幺正变换：σ_z' if kind=='z' else '自旋时间反演：iσ_y K',hamiltonian=residuals[0],state=residuals[1],probe=residuals[2],probeOdd=bool(odd),expectation=float(np.trace(rho@O).real),forcedZero=bool(residuals[1]<1e-9 and odd),note='只有态保持该对称且可观测量为奇，才由此对称性强制其期望为零。瞬时态未假设为热平衡态；H 对称不保证所选态对称。')


SYMBOLIC_TASKS={
 'projector':('由 P²=I，使 c(I−P) 为非零幂等投影，c=?','1/2','排除 c=0；展开后系数为 2c²=c。'),
 'young':('已知 Y²=3Y，使 cY 为非零幂等算符，c=?','1/3','Young 算符通常非厄米；幂等不等于正交投影。'),
 'exchange':('对称轨道 × 自旋单重态的完整交换本征值？','-1','两个交换符号相乘：(+1)×(−1)。'),
 'winding':('平面指向矢绕转 π，对应 Δθ/(2π)=?','1/2','单值双角场的整数绕数为 1；指向矢角度绕转为半圈。'),
 'onsager':('两变量均为偶，L12(B,M)=a+b(B+M)，求 L21(B,M)。','a-b*(B+M)','把 B、M 同时取反并交换指标。'),
 'commutator':('H=hσx，求 [σz,H] 中 σy 的系数。','2*I*h','Pauli 关系 [σz,σx]=2iσy；I 表示虚数单位。')}


def safe_expression(text):
    if not isinstance(text,str) or len(text)>180:raise ValueError('表达式最多 180 字符')
    tree=ast.parse(text,mode='eval')
    if len(list(ast.walk(tree)))>65:raise ValueError('表达式过于复杂')
    names={k:sp.Symbol(k,real=True) for k in ['a','b','B','M','h']};names['I']=sp.I
    def walk(node):
        if isinstance(node,ast.Expression):return walk(node.body)
        if isinstance(node,ast.Constant) and type(node.value) is int and abs(node.value)<=100:return sp.Integer(node.value)
        if isinstance(node,ast.Name) and node.id in names:return names[node.id]
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,(ast.UAdd,ast.USub)):return walk(node.operand)*(-1 if isinstance(node.op,ast.USub) else 1)
        if isinstance(node,ast.BinOp) and isinstance(node.op,(ast.Add,ast.Sub,ast.Mult,ast.Div)):
            a,b=walk(node.left),walk(node.right)
            if isinstance(node.op,ast.Add):return a+b
            if isinstance(node.op,ast.Sub):return a-b
            if isinstance(node.op,ast.Mult):return a*b
            if b==0:raise ValueError('除数不能为零')
            if b.free_symbols:raise ValueError('本题仅允许数值常量作除数；变量分母需要额外的非零假设')
            return a/b
        raise ValueError('只支持整数、a b B M h I、括号和 + − * /；请用 1/2 输入精确分数')
    out=walk(tree)
    if out.has(sp.zoo,sp.nan,sp.oo,-sp.oo):raise ValueError('表达式须有限')
    return out


def grade(p):
    task=choice(p,'task','projector',SYMBOLIC_TASKS)
    prompt,target,hint=SYMBOLIC_TASKS[task]
    answer=safe_expression(p.get('answer',''));expected=safe_expression(target)
    difference=sp.factor(answer-expected)
    return dict(task=task,prompt=prompt,correct=difference==0,answer=str(answer),difference=str(difference),expected=target,hint=hint,scope='给定假设下的有限类型精确恒等式；不判定任意文字证明。')


def run(tool,p):
    if not isinstance(p,dict):raise ValueError('输入须为对象')
    fn={'statistics_lab':statistics,'defects_lab':defects,'reciprocity_lab':response,'symmetry_audit':audit,'symbolic_step_grade':grade}.get(tool)
    if fn is None:raise ValueError('未知教学实验')
    return fn(p)
