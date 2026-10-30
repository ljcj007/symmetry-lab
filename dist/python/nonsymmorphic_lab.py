"""Periodic two/four-band nonsymmorphic line models, not a space-group database."""
import itertools
import math
import numpy as np

RELEASE = '20261030-construction1'
TOL = 1e-9
I2 = np.eye(2, dtype=complex)
X = np.array([[0, 1], [1, 0]], dtype=complex)
Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
Z = np.diag([1., -1.]).astype(complex)


def matrix_json(a):
    a = np.asarray(a, dtype=complex)
    return {'re': a.real.tolist(), 'im': a.imag.tolist()}


def norm(a):
    return float(np.linalg.norm(a))


def parameters(payload):
    p = dict(payload or {})
    operation = p.get('operation', 'glide')
    if operation not in ('glide', 'screw'):
        raise ValueError('operation须为glide或screw。')
    spinful = str(p.get('spinful', 'true')).lower() in ('true', '1', 'yes')
    out = {'operation': operation, 'spinful': spinful}
    for key, default, lo, hi in [('hopping', 1., .05, 5.), ('spinOrbit', .65, .05, 5.),
                                ('mass', 0., -5., 5.), ('zeeman', 0., -100., 100.),
                                ('shift', 0., -5., 5.), ('kFraction', .2, -.5, .5),
                                ('transverseY', 0., -.5, .5), ('transverseZ', 0., -.5, .5)]:
        value = float(p.get(key, default))
        if not math.isfinite(value) or value < lo or value > hi:
            raise ValueError(key+'超出允许范围。')
        out[key] = value
    out['points'] = int(p.get('points', 121))
    if out['points'] < 41 or out['points'] > 401:
        raise ValueError('points须在41至401之间。')
    return out


def operators(k, p):
    s = np.array([[0, np.exp(-1j*k)], [1, 0]], dtype=complex)
    if p['spinful']:
        axis = Y if p['operation'] == 'glide' else X
        return np.kron(s, 1j*axis), np.kron(I2, 1j*Y)
    return s, I2.copy()


def hamiltonian(k, p, mass=None, zeeman=None):
    """Cell-periodic Fourier convention: H(k+2π)=H(k), sewing matrix I."""
    a = (1+math.cos(k))*X + math.sin(k)*Y
    b = math.sin(k)*X + (1-math.cos(k))*Y
    m = p['mass'] if mass is None else mass
    z = p['zeeman'] if zeeman is None else zeeman
    if p['spinful']:
        axis = Y if p['operation'] == 'glide' else X
        h = p['hopping']*np.kron(a, I2) + p['spinOrbit']*np.kron(b, axis)
        h += m*np.kron(Z, I2) + z*np.kron(I2, axis)
    else:
        h = p['hopping']*a + m*Z + z*b
    return h + p['shift']*math.cos(k)*np.eye(len(h))


def momentum_diagnostic(p, k_fraction=None):
    f = p['kFraction'] if k_fraction is None else k_fraction
    k = np.array([f, p['transverseY'], p['transverseZ']])
    rotation = np.diag([1, -1, 1 if p['operation'] == 'glide' else -1])
    difference = rotation@k-k
    residual = norm(difference-np.round(difference))
    trim_residual = norm(2*k-np.round(2*k))
    return {'fractionalK': k.tolist(), 'rotatedK': (rotation@k).tolist(),
            'reciprocalDifference': difference.tolist(), 'littleGroupResidual': residual,
            'inLittleGroup': residual < TOL, 'timeReversalInvariant': trim_residual < TOL,
            'timeReversalMomentumResidual': trim_residual}


def spectrum(k, p, mass=None, zeeman=None):
    return np.linalg.eigvalsh(hamiltonian(k, p, mass, zeeman))


def central_gap(k, p, mass=None, zeeman=None):
    e = spectrum(k, p, mass, zeeman)
    return float(e[len(e)//2]-e[len(e)//2-1])


def block_glide_labels(k, p):
    """Diagonalize G inside degenerate energy blocks; never assign arbitrary eigh vectors."""
    h = hamiltonian(k, p)
    vals, vectors = np.linalg.eigh(h)
    g, _ = operators(k, p)
    groups = []
    start = 0
    while start < len(vals):
        end = start+1
        while end < len(vals) and abs(vals[end]-vals[start]) < 1e-8:
            end += 1
        basis = vectors[:, start:end]
        restricted = basis.conj().T@g@basis
        leakage = norm(g@basis-basis@restricted)
        eig = np.linalg.eigvals(restricted)
        groups.append({'energy': float(vals[start]), 'multiplicity': end-start,
                       'symmetryEigenvalues': [[float(v.real), float(v.imag)] for v in eig],
                       'subspaceLeakage': leakage})
        start = end
    return groups


def breaking_challenge(p):
    """Compare the WHOLE Γ-X middle gap with a certified bound, not a moved node."""
    q = dict(p, mass=0., zeeman=0., transverseY=0., transverseZ=0.)
    t, lam = q['hopping'], q['spinOrbit']
    mass = .3
    field = 8*(t+lam+1) if q['spinful'] else 2*t
    crossing = 2*math.atan2(t, lam) if q['spinful'] else math.pi
    grid = np.unique(np.r_[np.linspace(0, math.pi, 257), crossing])
    candidates = []
    for use_mass, use_field in itertools.product((False, True), repeat=2):
        m, b = (mass if use_mass else 0.), (field if use_field else 0.)
        removed = (['spatial'] if use_mass else []) + (['time-reversal'] if use_field else [])
        gap = min(central_gap(k, q, m, b) for k in grid)
        if use_field and q['spinful']:
            bound = 2*b-4*math.sqrt(t*t+lam*lam)-2*abs(m)
        elif use_field:
            bound = 4*min(t, b)
        elif use_mass:
            bound = 2*abs(m)
        else:
            bound = 0.
        attained = bound > 1e-8 and gap > 1e-8
        probe = .713
        g, tu = operators(probe, q)
        h = hamiltonian(probe, q, m, b)
        spatial = norm(g@h@g.conj().T-h)
        tr = norm(tu@h.conj()@tu.conj().T-hamiltonian(-probe, q, m, b))
        candidates.append({'removed': removed, 'achieved': attained, 'gapLowerBound': bound,
                           'sampledMinimumGap': gap, 'spatialResidual': spatial, 'timeReversalResidual': tr,
                           'mass': m, 'zeeman': b,
                           'reason': ('全线开隙有严格正下界；' if attained else '包含解析交叉点的扫线仍为零隙；')+
                           ('端点Kramers仍保留。' if q['spinful'] and not use_field else
                            '时间反演已破坏，不能主张端点Kramers。' if use_field else '无自旋T²=+1，边界配对不是Kramers。')})
    return {'goal': '在同一Γ—X路径的所有k打开中间能隙；从m=b=0出发。每个选项添加指定真实矩阵项，不是仅删去对称性标签。',
            'choices': [{'id': 'spatial', 'label': '加入 mτ_z（m=0.3）：破坏G，保留T'},
                        {'id': 'time-reversal', 'label': '加入充分强的T破缺项 b='+format(field, '.4g')+'：保留G'}],
            'candidates': candidates, 'minimalCount': min(len(c['removed']) for c in candidates if c['achieved']),
            'scope': '双值T破缺项为b I⊗σ_axis；单值为b[sin(k)τ_x+(1−cos(k))τ_y]。全线下界排除只移动交叉的误判。'}


def calculate(payload):
    p = parameters(payload)
    k = 2*math.pi*p['kFraction']
    spin = p['spinful']; n = 4 if spin else 2; sign = -1 if spin else 1
    h = hamiltonian(k, p); g, tu = operators(k, p); ident = np.eye(n)
    crossing = 2*math.atan2(p['hopping'], p['spinOrbit']) if spin else math.pi
    grid = np.unique(np.r_[np.linspace(0, math.pi, p['points']), crossing])
    levels = np.array([spectrum(x, p) for x in grid])
    checks = {'hermiticityResidual': norm(h-h.conj().T),
              'groupSquareResidual': norm(g@g-sign*np.exp(-1j*k)*ident),
              'unitarityResidual': norm(g@g.conj().T-ident),
              'timeReversalSquareResidual': norm(tu@tu.conj()-sign*ident),
              'representationTimeReversalResidual': norm(tu@g.conj()@tu.conj().T-operators(-k, p)[0]),
              'hamiltonianPeriodicityResidual': norm(hamiltonian(k+2*math.pi, p)-h),
              'representationPeriodicityResidual': norm(operators(k+2*math.pi, p)[0]-g)}
    spatial_residual = max(norm(operators(x, p)[0]@hamiltonian(x, p)@operators(x, p)[0].conj().T-hamiltonian(x, p)) for x in grid)
    tr_residual = max(norm(tu@hamiltonian(x, p).conj()@tu.conj().T-hamiltonian(-x, p)) for x in grid)
    checks['passed'] = max(checks.values()) < 1e-8
    checks['method'] = '直接构造周期Hermitian矩阵，数值对角化；同时检验群关系、反幺正平方和周期缝合。故意施加的破缺另列为物理结果。'
    momentum = momentum_diagnostic(p)
    endpoints = []
    for label, f in [('Γ', 0.), ('X', .5)]:
        diagnostic = momentum_diagnostic(p, f)
        endpoints.append({'label': label, **diagnostic,
                          'kramersProtected': spin and diagnostic['timeReversalInvariant'] and tr_residual < TOL,
                          'blocks': block_glide_labels(2*math.pi*f, p)})
    line_condition = all(x['inLittleGroup'] and x['timeReversalInvariant'] for x in endpoints)
    partner = spin and line_condition and spatial_residual < TOL and tr_residual < TOL
    gap = float(np.min(levels[:, n//2]-levels[:, n//2-1]))
    vals, vecs = np.linalg.eigh(h)
    minimum = vals[0]; multiplicity = int(np.sum(abs(vals-minimum) < 1e-8))
    basis = vecs[:, :multiplicity]
    grading = {'tasks': [{'id': 'lowest-energy-subspace', 'title': '当前k的最低能量本征子空间', 'kind': 'subspace',
                         'reference': matrix_json(basis), 'operators': [matrix_json(h)],
                         'instructions': '输入一个'+str(n)+'行、'+str(multiplicity)+'列的复矩阵，其列张成最低能量子空间。整体相位和内部酉换基等价；基底顺序为(A↑,A↓,B↑,B↓)，单值为(A,B)。'}]}
    orb = np.array([[0, np.exp(-1j*k)], [1, 0]], complex)
    eig_phase = (1j if spin else 1)*np.exp(-1j*k/2)
    replay = [{'title': '1. 先确认操作是否保持k', 'text': '分数坐标以倒格矢为单位。比较Rk−k是否为整数向量；当前残差='+format(momentum['littleGroupResidual'], '.3g')+'。小群之外不能在同一个k态上赋G标签。',
               'points': [{'x': float(x), 'y': float(y), 'z': float(z), 'label': label, 'weight': 1} for (x,y,z),label in [(momentum['fractionalK'],'k'),(momentum['rotatedK'],'Rk')]]},
              {'title': '2. 从两个位点构造半平移', 'text': 'A→B；B→下一晶胞A。周期Bloch约定给跨胞矩阵元e^(−ik)，故S²=e^(−ik)I。', 'matrix': matrix_json(orb),
               'points': [{'x':0,'y':0,'z':0,'label':'A','weight':1},{'x':.5,'y':0,'z':0,'label':'B','weight':1},{'x':1,'y':0,'z':0,'label':'A+a','weight':.6}]},
              {'title': '3. 加入单值或双值旋转', 'text': 'G=S⊗iσ_axis，双值旋转两次带−1；单值G=S。这里glide取axis=y、screw取axis=x。', 'matrix': matrix_json(g)},
              {'title': '4. 由群关系得到动量相关本征值', 'text': 'g_±='+('±i' if spin else '±')+'e^(−ik/2)。k→k+2π时两标签交换，但矩阵G本身严格周期。', 'matrix': matrix_json(g@g)},
              {'title': '5. 构造并对角化真实Hamiltonian', 'text': '当前m='+str(p['mass'])+'、b='+str(p['zeeman'])+'。每一条图线均来自这个Hermitian矩阵，不预设沙漏形状。', 'matrix': matrix_json(h)},
              {'title': '6. 输出可判分的能量子空间', 'text': '最低能量='+format(float(minimum), '.6g')+'，维数='+str(multiplicity)+'；判分比较整个子空间，不要求某个任意相位。', 'matrix': matrix_json(basis)}]
    graph = {'nodes': [{'id':'GT','label':'G与T的线约束','order':4,'details':'模去晶格平移和双群中心后的生成元标签商；含反幺正T。不是实际空间群阶数。'},
                       {'id':'G','label':'仅保留G','order':2,'details':'无T时端点Kramers配对不成立；非对称型本征值仍带平移相位。'},
                       {'id':'T','label':'仅保留T','order':2,'details':'双值且k为TRIM时保证Kramers；不强制中间k交叉。'},
                       {'id':'E','label':'仅恒等标签','order':1,'details':'没有这两种指定约束。'}],
             'edges':[{'from':'GT','to':'G','label':'加入T破缺项'},{'from':'GT','to':'T','label':'加入mτ_z'},
                      {'from':'G','to':'E','label':'再破坏G'},{'from':'T','to':'E','label':'再破坏T'}],
             'selected': 'GT' if spatial_residual<TOL and tr_residual<TOL else 'G' if spatial_residual<TOL else 'T' if tr_residual<TOL else 'E',
             'scope':'生成元约束关系示意，order仅为模去平移与中心后的标签商阶数；G²和T²的真实相位仍由矩阵给出，不是完整空间群子群目录。'}
    warnings = ['这是三维操作嵌入的1D两/四带教学模型；横向没有色散，不是材料能带拟合或230空间群分类。',
                '能量使用同一任意单位；k_x=2πf_x。Bloch基底严格周期，缝合矩阵为I；不能把单个本征值分支的标签交换误称基底不周期。',
                'Γ/X仅在横向分量均为0时是通常轴上路径名；横向非零时表示平行切线的两个端点。小群与TRIM检查优先于图形。',
                '本模型具有额外的简化矩阵结构；中间交叉的保护结论只在所声明的G、T、路径及孤立四带前提下使用。图形本身不能诊断真实材料拓扑。',
                '端点数值简并与Kramers定理分开报告。单值T²=+1的X点配对来自T将复G标签互换，不能称自旋Kramers配对。']
    if not momentum['inLittleGroup']:
        warnings.append('当前操作不属于该k的小群。横向平坦教学模型可能仍显示偶然相同的谱，但不为当前k赋受晶体保护的G标签。')
    if spatial_residual >= TOL:
        warnings.append('mτ_z已经破坏G；能量块中的G矩阵投影不再代表严格的对称性本征值。')
    if not spin:
        warnings.append('单值模型忽略spinOrbit；zeeman在此表示T破缺轨道项，不是电子Zeeman磁场。')
    return {'module':'nonsymmorphic','action':'nonsymmorphic_lab','release':RELEASE,'input':p,
            'model':'periodic-nonsymmorphic-line','summary':[{'label':'模型维数','value':n},{'label':'当前操作属于k小群','value':'是' if momentum['inLittleGroup'] else '否'},
              {'label':'T²','value':sign},{'label':'G协变残差（全线）','value':spatial_residual},{'label':'T协变残差（全线）','value':tr_residual},
              {'label':'扫描中间最小隙（含无扰动解析交叉点）','value':gap},{'label':'双值伙伴交换保护条件','value':'满足' if partner else '不满足'},
              {'label':'无扰动解析交叉f_x','value':crossing/(2*math.pi)}],
            'plots':[{'id':'nonsymmorphic-bands','title':'真实周期Hamiltonian的Γ—X能带','xLabel':'f_x=k_x/(2π)','yLabel':'E（任意单位）',
                      'series':[{'label':'排序能带 '+str(i+1),'points':np.column_stack([grid/(2*math.pi), levels[:,i]]).tolist()} for i in range(n)]},
                     {'id':'nonsymmorphic-phases','title':'单支G本征值的复相位（仅小群内具有同k标签意义）','xLabel':'f_x','yLabel':'Re/Im g₊',
                      'series':[{'label':'Re g₊','points':[[float(x/(2*math.pi)),float(((1j if spin else 1)*np.exp(-1j*x/2)).real)] for x in grid]},
                                {'label':'Im g₊','points':[[float(x/(2*math.pi)),float(((1j if spin else 1)*np.exp(-1j*x/2)).imag)] for x in grid]}]}],
            'tables':[{'title':'端点的能量块与配对','columns':['端点','能量','重数','G本征值（实部,虚部）','块外泄漏','Kramers保护'],
                       'rows':[[ep['label'],b['energy'],b['multiplicity'],str(b['symmetryEigenvalues']),b['subspaceLeakage'],'是' if ep['kramersProtected'] else '否'] for ep in endpoints for b in ep['blocks']]},
                      {'title':'小群与反幺正动量条件','columns':['条件','残差','成立'],
                       'rows':[['Rk−k为倒格矢',momentum['littleGroupResidual'],'是' if momentum['inLittleGroup'] else '否'],['−k等价k',momentum['timeReversalMomentumResidual'],'是' if momentum['timeReversalInvariant'] else '否']]},
                      {'title':'结构恒等式验证','columns':['检查','残差'],'rows':[[key,value] for key,value in checks.items() if key.endswith('Residual')]}],
            'checks':checks,'warnings':warnings,'replay':replay,'subgroupGraph':graph,'grading':grading,'breaking':breaking_challenge(p),
            'nonsymmorphic':{'momentum':momentum,'endpoints':endpoints,'spatialResidual':spatial_residual,'timeReversalResidual':tr_residual,
                'partnerSwitchProtected':partner,'crossingFractionUnperturbed':crossing/(2*math.pi),'selectedHamiltonian':matrix_json(h),
                'selectedOperation':matrix_json(g),'timeReversalUnitary':matrix_json(tu),'sewingMatrix':matrix_json(ident),
                'selectedGlideEigenvalues':[[float(eig_phase.real),float(eig_phase.imag)],[-float(eig_phase.real),-float(eig_phase.imag)]]},
            'formulaLinks':[{'id':'nonsymmorphic-square','label':'从群关系到分数平移相位','formula':'G(k)² = (−1)^(2s) e^(−ik_x) I',
                'meaning':'两次半平移累积一个晶格平移；双值旋转额外给出−1。S、G矩阵均为周期Bloch约定。',
                'values':[{'label':'群关系残差','value':checks['groupSquareResidual']}],'plot':'nonsymmorphic-phases'},
               {'id':'nonsymmorphic-partners','label':'伙伴交换的端点条件','formula':'g_± = ±i e^(−ik_x/2)；T² = −I',
                'meaning':'双值Γ端的±i为共轭对，X端±1各自为实数。需要T对称、两端TRIM、整条路径在G小群内。',
                'values':[{'label':'保护条件成立','value':partner}],'plot':'nonsymmorphic-bands'},
               {'id':'nonsymmorphic-mass','label':'真正开隙与保留端点Kramers','formula':'H_m=H_0+mτ_z⊗I；Δ_middle=2|m|（b=0）',
                'meaning':'质量项与无扰动的轨道非对角项反对易，破G但保T。这里Δ是整条Γ—X中间隙的最小值；单值模型同理。',
                'values':[{'label':'质量m','value':p['mass']}],'plot':'nonsymmorphic-bands'}]}
