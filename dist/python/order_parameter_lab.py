"""Finite polar-vector invariant and isotropy teaching laboratory.

Exact signed-permutation Reynolds projectors for C4v (xy) and Oh (xyz).
No space-group irrep catalogue, cell reconstruction or automatic material fit.
"""
import itertools
import math
from functools import lru_cache
import numpy as np


def _key(matrix):
    return tuple(int(x) for x in np.asarray(matrix).ravel())


@lru_cache(maxsize=2)
def group_data(name):
    if name == 'c4v':
        dim = 2
        generators = [('C4z', np.array([[0, -1], [1, 0]], int)),
                      ('m_xz', np.diag([1, -1]))]
    elif name == 'oh':
        dim = 3
        generators = [('C4z', np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]], int)),
                      ('C3_111', np.array([[0, 0, 1], [1, 0, 0], [0, 1, 0]], int)),
                      ('inversion', -np.eye(3, dtype=int))]
    else:
        raise ValueError('pointGroup 须为 c4v 或 oh。')
    identity = np.eye(dim, dtype=int)
    matrices = {_key(identity): identity}
    queue = [identity]
    for matrix in queue:
        for _, generator in generators:
            product = generator @ matrix
            if _key(product) not in matrices:
                matrices[_key(product)] = product
                queue.append(product)
    return dim, tuple(generators), tuple(queue)


def monomials(dim, degree):
    return [p for p in itertools.product(range(degree+1), repeat=dim) if sum(p) == degree]


def transformed_monomial(powers, operation):
    """Return sign, powers of m(R eta); operation is an exact signed permutation."""
    result = [0] * len(powers)
    sign = 1
    for row, power in enumerate(powers):
        col = int(np.flatnonzero(operation[row])[0])
        result[col] += power
        sign *= int(operation[row, col]) ** power
    return sign, tuple(result)


def monomial_label(powers):
    return ' '.join('η_'+axis+('^'+str(power) if power != 1 else '')
                    for axis, power in zip('xyz', powers) if power) or '1'


@lru_cache(maxsize=6)
def invariant_basis(name, degree):
    """Integer primitive orbit-sum basis obtained from the Reynolds projector."""
    dim, _, operations = group_data(name)
    vectors = []
    seen = set()
    for powers in monomials(dim, degree):
        counts = {}
        for operation in operations:
            sign, transformed = transformed_monomial(powers, operation)
            counts[transformed] = counts.get(transformed, 0) + sign
        counts = {p:c for p,c in counts.items() if c}
        if not counts:
            continue
        common = math.gcd(*[abs(c) for c in counts.values()])
        terms = tuple(sorted(((p, c//common) for p, c in counts.items()), reverse=True))
        if terms not in seen:
            seen.add(terms)
            vectors.append(terms)
    vectors.sort(key=lambda terms:max(p for p, _ in terms), reverse=True)
    return tuple(vectors)


def polynomial_value(terms, vector):
    return float(sum(c * np.prod(np.asarray(vector, float) ** np.asarray(p)) for p,c in terms))


def _float(payload, key, default, limit=5):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > limit:
        raise ValueError(key+' 必须为绝对值不超过 '+str(limit)+' 的有限实数。')
    return float(value)


def _orbit(operations, vector):
    result = []
    for operation in operations:
        v = operation @ vector
        if not any(np.max(np.abs(v-old)) < 1e-9 for old in result):
            result.append(v)
    return result


def _coefficient(degree, powers, params):
    partition = tuple(sorted(powers, reverse=True))
    if degree == 2:
        return 'a2', params['a2']
    if degree == 4:
        key = 'b4' if partition[0] == 4 else 'c4'
    else:
        key = 'd6' if partition[0] == 6 else 'e6' if partition[0] == 4 else 'f6'
    return key, params[key]


def _isotropy_name(group, order):
    if group == 'c4v':
        return {8:'C4v (4mm)',2:'Cs (m)',1:'C1 (1)'}.get(order, '以操作矩阵定义')
    return {48:'Oh (m-3m)',8:'C4v (4mm)',6:'C3v (3m)',4:'C2v (mm2)',2:'Cs (m)',1:'C1 (1)'}.get(order,'以操作矩阵定义')


def calculate(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须为对象。')
    allowed = {'pointGroup','etaX','etaY','etaZ','a2','b4','c4','d6','e6','f6','fieldX','basisAngle'}
    if set(payload)-allowed:
        raise ValueError('Unknown order-parameter fields: '+', '.join(sorted(str(k) for k in set(payload)-allowed)))
    name = payload.get('pointGroup', 'c4v')
    if name not in ('c4v', 'oh'):
        raise ValueError('pointGroup 须为 c4v 或 oh。')
    dim, generators, operations = group_data(name)
    params = {k:_float(payload,k,v) for k,v in [('etaX',1),('etaY',0),('etaZ',0),('a2',-1),('b4',1),('c4',3),('d6',.1),('e6',0),('f6',0),('fieldX',0)]}
    params['basisAngle'] = _float(payload,'basisAngle',30,360)
    eta = np.array([params['etaX'],params['etaY'],params['etaZ']][:dim])
    field = np.zeros(dim); field[0] = params['fieldX']
    invariants = []
    for degree in (2,4,6):
        for index, terms in enumerate(invariant_basis(name, degree)):
            key, coeff = _coefficient(degree,terms[0][0],params)
            invariants.append({'id':key,'degree':degree,'label':' + '.join(monomial_label(p) for p,c in terms),
                               'terms':[{'powers':list(p),'coefficient':c} for p,c in terms],
                               'value':polynomial_value(terms,eta),'coefficient':coeff})
    def energy(v):
        return float(sum(item['coefficient']*polynomial_value([(tuple(t['powers']),t['coefficient']) for t in item['terms']],v) for item in invariants)-field@v)
    def energy_invariant(v):
        return energy(v)+float(field@v)
    stabilizer = [op for op in operations if np.linalg.norm(op@eta-eta)<1e-9]
    field_group = [op for op in operations if np.linalg.norm(op@field-field)<1e-9]
    physical_stabilizer = [op for op in stabilizer if np.linalg.norm(op@field-field)<1e-9]
    orbit = _orbit(operations,eta)
    current_orbit = _orbit(field_group,eta)
    theta = math.radians(params['basisAngle'])
    transform = np.eye(dim); transform[:2,:2] = [[math.cos(theta),-math.sin(theta)],[math.sin(theta),math.cos(theta)]]
    eta_new = transform.T@eta
    field_new = transform.T@field
    rotated_ops = [transform.T@op@transform for op in operations]
    energy_new = energy(transform@eta_new)
    covariance = max(float(np.linalg.norm(rotated_ops[i]@eta_new-transform.T@(operations[i]@eta))) for i in range(len(operations)))
    invariant_residual = max(abs(energy_invariant(op@eta)-energy_invariant(eta)) for op in operations)
    group_keys = {_key(op) for op in operations}
    closure = all(_key(g@h) in group_keys for g in operations for h in operations)
    source_rows=[]
    for degree in (2,4,6):
        for label, op in generators:
            seen=set()
            for p in monomials(dim,degree):
                sign,q = transformed_monomial(p,op)
                if p==q and sign==1:
                    continue
                canonical=tuple(sorted((p,q)))+(sign,)
                if canonical in seen:
                    continue
                seen.add(canonical)
                relation='c['+monomial_label(q)+'] = '+('−' if sign<0 else '')+'c['+monomial_label(p)+']'
                if p==q:
                    relation='c['+monomial_label(p)+'] = 0'
                source_rows.append({'generator':label,'matrix':op.tolist(),'degree':degree,'sourcePowers':list(p),'targetPowers':list(q),'sign':sign,'relation':relation,
                                    'explanation':'把 η 换成 Rη；比较 F(Rη)=F(η) 中相同单项式的系数。'})
    norm=float(np.linalg.norm(eta)); direction=eta/norm if norm>1e-12 else np.eye(dim)[0]
    radialmax=max(2.,norm*1.15)
    radii=np.linspace(-radialmax,radialmax,161)
    radial=[[float(r),energy(r*direction)] for r in radii]
    angles=np.linspace(0,360,181)
    plane_radius=float(np.linalg.norm(eta[:2]))
    def angular_vector(a):
        v=eta.copy();v[:2]=plane_radius*np.array([math.cos(math.radians(a)),math.sin(math.radians(a))]);return v
    angular=[[float(a),energy(angular_vector(a))] for a in angles]
    # All stationary radii on the selected full straight line; polynomial roots,
    # not just a sampled minimum. These are not all multidimensional extrema.
    radial_coeff={degree:sum(item['coefficient']*polynomial_value([(tuple(t['powers']),t['coefficient']) for t in item['terms']],direction) for item in invariants if item['degree']==degree) for degree in (2,4,6)}
    derivative=np.array([6*radial_coeff[6],0,4*radial_coeff[4],0,2*radial_coeff[2],-float(field@direction)],float)
    derivative=np.trim_zeros(derivative,'f')
    roots=[] if not len(derivative) else np.roots(derivative)
    stationary=[]
    for root in roots:
        if abs(root.imag)>1e-8:
            continue
        radius=float(root.real)
        if any(abs(radius-row['radius'])<1e-7 for row in stationary):
            continue
        curvature=30*radial_coeff[6]*radius**4+12*radial_coeff[4]*radius**2+2*radial_coeff[2]
        stationary.append({'radius':radius,'energy':energy(radius*direction),'radialCurvature':float(curvature),'kind':'径向极小' if curvature>1e-8 else '径向极大' if curvature< -1e-8 else '径向退化驻点'})
    stationary.sort(key=lambda x:x['radius'])
    certified=params['d6']>0 and params['e6']>=0 and (dim==2 or params['f6']>=0)
    warnings=['只处理 C4v 的 xy 极向量与 Oh 的 xyz 极向量；这是点群序参量教学，未推导230空间群的任意 irrep、平移畴、真实原子模式或标准空间群标签。',
              '序参量无量纲，能量为任意教学单位。拖动序参量给出一个指定状态，不自动证明它是平衡相；径向极小不等于完整多维稳定。',
              '换坐标同时变换序参量、操作、场和多项式；若只旋转向量而保持各向异性能量表达式不变，通常是在改变物理状态。']
    if not certified:
        warnings.append('本组最高阶系数未通过所用的全局有界充分条件；有限能量窗口不能证明自由能有下界或全局稳定。')
    if np.linalg.norm(field)>1e-12:
        warnings.append('非零外场显式破坏母群。母群轨道中的状态仍列出供对照，但其能量可不同，不再称全部为简并畴。')
    if dim==2 and abs(params['etaZ'])>1e-12:
        warnings.append('C4v 实验只使用二维表示，etaZ 已忽略。')
    if norm<1e-12:
        warnings.append('零序参量保留整个母群；径向扫描默认沿x，固定半径角扫描为零向量。')
    info={'vector':eta.tolist(),'dimension':dim,'groupOrder':len(operations),'stabilizerOrder':len(stabilizer),'isotropyLabel':_isotropy_name(name,len(stabilizer)),
          'fieldGroupOrder':len(field_group),'physicalStabilizerOrder':len(physical_stabilizer),'fieldOrbitSize':len(current_orbit),
          'operations':[{'id':i,'label':'g'+str(i),'matrix':op.tolist(),'retained':bool(np.linalg.norm(op@eta-eta)<1e-9),'fieldRetained':bool(np.linalg.norm(op@field-field)<1e-9),'image':(op@eta).tolist()} for i,op in enumerate(operations)],
          'domains':[{'vector':v.tolist(),'energy':energy(v)} for v in orbit], 'invariants':invariants,'constraintSources':source_rows,'stationaryRadii':stationary,
          'convention':{'rotation':transform.tolist(),'vector':eta_new.tolist(),'field':field_new.tolist(),'operations':[op.tolist() for op in rotated_ops],'energy':energy_new,'residual':abs(energy_new-energy(eta)),'covarianceResidual':covariance,'rule':'η′=Qᵀη；R′=QᵀRQ；F′(η′)=F(Qη′)'},
          'boundedness':{'sufficientConditionSatisfied':certified,'condition':'d6>0 且 e6≥0、三维 f6≥0（充分而非必要）'}}
    return {'model':'finite-polar-invariants','parameters':{'pointGroup':name,**params},'order':info,
      'summary':[{'label':'母群阶数','value':len(operations)},{'label':'指定序参量稳定子群阶数','value':len(stabilizer)},{'label':'母群轨道状态数','value':len(orbit)},
                 {'label':'外场后母群内保留操作数','value':len(field_group)},{'label':'独立二/四/六阶不变量总数','value':len(invariants)},{'label':'当前自由能','value':energy(eta),'unit':'教学单位'}],
      'plots':[{'id':'order-radial','title':'指定方向的径向自由能（不是完整相图）','xLabel':'有符号径向幅度 r','yLabel':'F（教学单位）','series':[{'label':'F(r n)','points':radial}]},
               {'id':'order-angular','title':'固定 xy 半径与 z 分量的方位角能量','xLabel':'方位角 / 度','yLabel':'F（教学单位）','series':[{'label':'方位角扫描','points':angular}]}],
      'tables':[{'title':'自动生成的独立不变量','columns':['阶数','系数键','多项式','系数','当前值'],'rows':[[i['degree'],i['id'],i['label'],i['coefficient'],i['value']] for i in invariants]},
                {'title':'母群轨道与外场劈裂','columns':['序参量','自由能'],'rows':[[', '.join(format(x,'.5g') for x in row['vector']),row['energy']] for row in info['domains']]},
                {'title':'选定直线的全部实驻点','columns':['r','F','径向二阶导','径向类型'],'rows':[[s['radius'],s['energy'],s['radialCurvature'],s['kind']] for s in stationary]},
                {'title':'约定对照','columns':['量','原坐标','新坐标'],'rows':[['序参量',str(eta.tolist()),str(eta_new.tolist())],['能量',energy(eta),energy_new],['稳定子群阶数',len(stabilizer),int(sum(np.linalg.norm(op@eta_new-eta_new)<1e-9 for op in rotated_ops))]]}],
      'checks':{'passed':closure and len(orbit)*len(stabilizer)==len(operations) and invariant_residual<1e-8 and covariance<1e-9 and abs(energy_new-energy(eta))<1e-8,
                'exactGroupClosure':closure,'orbitStabilizer':len(orbit)*len(stabilizer)==len(operations),'invariantResidual':invariant_residual,'coordinateEnergyResidual':abs(energy_new-energy(eta)),'coordinateCovarianceResidual':covariance},
      'warnings':warnings,
      'formulaLinks':[{'id':'order-isotropy','label':'稳定子群与轨道','formula':'H_η = {g ∈ G : D(g)η = η}；|Gη| = |G| / |H_η|','meaning':'母群轨道计数来自轨道—稳定子定理；显式外场可使轨道中不同状态能量分裂。','plot':'order-angular','values':[{'label':'母群阶数','value':len(operations)},{'label':'稳定子群阶数','value':len(stabilizer)},{'label':'轨道数','value':len(orbit)}]},
      {'id':'order-reynolds','label':'群平均生成不变量','formula':'P_G f(η) = (1/|G|) Σ_g f(D(g)η)','meaning':'对单项式作群平均，删除零像与重复像，再以最小整数系数表示独立轨道和。','plot':'order-radial','values':[{'label':'不变量基维数','value':len(invariants)},{'label':'不变性残差','value':invariant_residual}]},
      {'id':'order-convention','label':'被动换坐标','formula':'η′ = Qᵀη；D′(g) = QᵀD(g)Q；F′(η′) = F(Qη′)','meaning':'操作、场和能量表达式必须同时变换。数值相等不要求矩阵逐项相同。','plot':'order-angular','values':[{'label':'原能量','value':energy(eta)},{'label':'新能量','value':energy_new},{'label':'协变残差','value':covariance}]}]}
