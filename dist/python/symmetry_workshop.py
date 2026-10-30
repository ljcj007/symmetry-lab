"""Bounded 2D spin-half k.p teaching workshop; real coefficients through order 2.

The coefficient nullspace is computed from full polynomial identities, not
sampled band degeneracies. Mirrors transform physical spin as an axial vector.
"""
import math
import numpy as np

MONOMIALS = ['1', 'k_x', 'k_y', 'k_x^2', 'k_x k_y', 'k_y^2']
PAULI = ['I', 'σ_x', 'σ_y', 'σ_z']


def polynomial_transform(r):
    a, b, c, d = r[0, 0], r[0, 1], r[1, 0], r[1, 1]
    return np.array([[1, 0, 0, 0, 0, 0], [0, a, b, 0, 0, 0],
                     [0, c, d, 0, 0, 0], [0, 0, 0, a*a, 2*a*b, b*b],
                     [0, 0, 0, a*c, a*d+b*c, b*d],
                     [0, 0, 0, c*c, 2*c*d, d*d]], float)


def generators(group, rotation=True, mirror=True, inversion=False, tr=True):
    if group not in ('c2v', 'c3v', 'c4v'):
        raise ValueError('请选择 C2v、C3v 或 C4v。')
    result = []
    if rotation:
        theta = 2*math.pi/int(group[1]); c, s = math.cos(theta), math.sin(theta)
        r = np.array([[c, -s], [s, c]])
        spin = np.eye(4); spin[1:3, 1:3] = r
        result.append(('绕 z 轴的 '+group[:2].upper(), r, spin))
    if mirror:
        result.append(('xz 镜面：极向量 k 与轴向量自旋', np.diag([1., -1.]), np.diag([1., -1., 1., -1.])))
    if inversion:
        result.append(('反演：同宇称自旋双重态', -np.eye(2), np.eye(4)))
    if tr:
        result.append(('时间反演 T²=−1', -np.eye(2), np.diag([1., -1., -1., -1.])))
    return result


def constraint_matrix(ops):
    blocks = []
    for _, r, spin in ops:
        m = polynomial_transform(r)
        block = np.empty((24, 24))
        for j in range(24):
            basis = np.zeros((4, 6)); basis.flat[j] = 1
            block[:, j] = (basis @ m - spin @ basis).ravel()
        blocks.append(block)
    return np.vstack(blocks) if blocks else np.zeros((0, 24))


def coefficients(payload):
    defaults = {'rashba': 1., 'dresselhaus': .5, 'mass': .4, 'fieldX': .3, 'curvature': 1.}
    values = {}
    for key, default in defaults.items():
        value = payload.get(key, default)
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or abs(value)>5:
            raise ValueError(key+' 须为 −5 至 5 的有限实数。')
        values[key] = float(value)
    c = np.zeros((4, 6))
    c[0, 3] = c[0, 5] = values['curvature']
    c[1, 2], c[2, 1] = values['rashba'], -values['rashba']
    c[1, 1], c[2, 2] = values['dresselhaus'], -values['dresselhaus']
    c[3, 0], c[1, 0] = values['mass'], values['fieldX']
    return c, values


def evaluate(c, x, y):
    return c @ np.array([1, x, y, x*x, x*y, y*y])


def calculate(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入须为对象。')
    flags = {}
    for name, default in [('rotation',1),('mirror',1),('inversion',0),('timeReversal',1)]:
        v = payload.get(name, default)
        if v not in (0,1):
            raise ValueError(name+' 须为 0 或 1。')
        flags[name] = bool(v)
    group = payload.get('pointGroup', 'c4v')
    ops = generators(group, flags['rotation'], flags['mirror'], flags['inversion'], flags['timeReversal'])
    a = constraint_matrix(ops)
    if len(a):
        _, s, vh = np.linalg.svd(a, full_matrices=True)
        rank = int(np.count_nonzero(s>1e-10)); null = vh[rank:].T
    else:
        rank, null = 0, np.eye(24)
    raw, params = coefficients(payload)
    projected = (null @ (null.T @ raw.ravel())).reshape(4, 6)
    projected[np.abs(projected)<1e-12] = 0.
    residual = float(np.max(np.abs(a @ projected.ravel()))) if len(a) else 0.
    terms = []
    for i, sigma in enumerate(PAULI):
        for j, monomial in enumerate(MONOMIALS):
            if abs(raw[i,j])+abs(projected[i,j])>1e-10:
                terms.append({'term': monomial+' '+sigma, 'input': float(raw[i,j]), 'output':float(projected[i,j]), 'index':[i,j]})
    constraints, seen = [], set()
    for row in a:
        nz = np.flatnonzero(abs(row)>1e-10)
        if not len(nz): continue
        normed = row / row[nz[0]]
        key = tuple(np.round(normed, 9))
        if key in seen: continue
        seen.add(key)
        items = [{'factor':float(normed[i]),'coefficient':'a['+MONOMIALS[i%6]+','+PAULI[i//6]+']'} for i in nz]
        constraints.append(items)
    xs = np.linspace(-.6, .6, 121)
    def curves(c, prefix):
        vals = np.array([evaluate(c, x, 0) for x in xs]); split=np.linalg.norm(vals[:,1:],axis=1)
        return [{'label':prefix+' E_'+sign,'points':np.column_stack([xs, vals[:,0]+factor*split]).tolist()} for sign,factor in [('+',1),('−',-1)]]
    gap = float(2*np.linalg.norm(projected[1:,0]))
    return {
        'model':'spin-half-kp-order2', 'parameters':{'pointGroup':group,**{k:int(v) for k,v in flags.items()},**params},
        'summary':[{'label':'允许的实系数空间维数','value':24-rank}, {'label':'独立约束数','value':rank},
                   {'label':'投影后 Γ 点分裂','value':gap,'unit':'eV'}, {'label':'完整多项式约束残差','value':residual}],
        'plots':[{'id':'bands','title':'固定 k_y=0 的输入模型与对称约束模型','xLabel':'k_x（约化教学坐标）','yLabel':'E（eV）','series':curves(raw,'输入')+curves(projected,'约束后')}],
        'tables':[{'title':'系数逐项比较','columns':['项','原始系数','约束后系数'],'rows':[[t['term'],t['input'],t['output']] for t in terms]},
                  {'title':'启用的生成元','columns':['操作'],'rows':[[o[0]] for o in ops]}],
        'checks':{'passed':residual<1e-9,'polynomialResidual':residual,'projectorIdempotence':float(np.linalg.norm((null@null.T)@(null@null.T)-null@null.T))},
        'warnings':['二维 Γ 点附近、同宇称真实自旋双重态、二阶 k.p 教学模型。镜面按轴向量变换自旋；不适用于任意轨道赝自旋。',
                    '关闭生成元后采用剩余约束，不再声称保留原点群；增加反演可能扩大对称群。',
                    '约束后的系数是当前单项式实系数欧氏度量下的正交投影，不是材料拟合；远离 Γ 点的能带不作预测。'],
        'workshop':{'terms':terms,'constraints':constraints,'coefficientLabels':[[m+' '+s for m in MONOMIALS] for s in PAULI],
                    'inputCoefficients':raw.tolist(),'coefficients':projected.tolist(),'nullspace':null.tolist(),'generators':[o[0] for o in ops]},
        'formulaLinks':[{'id':'kp-constraint','label':'对称约束','formula':'H(Rk) = U H(k) U†','meaning':'所有动量上的矩阵恒等式决定允许项。反幺正操作还需要复共轭。','values':[{'label':'启用操作数','value':len(ops)},{'label':'允许维数','value':24-rank},{'label':'多项式残差','value':residual}],'plot':'bands'},
                        {'id':'kp-splitting','label':'能带分裂','formula':'E_{±}(k) = d_0(k) ± |d(k)|','meaning':'Pauli 部分决定两条能带的分裂，单位矩阵项只共同平移。','values':[{'label':'Γ 点分裂 / eV','value':gap}],'plot':'bands'}]
    }
