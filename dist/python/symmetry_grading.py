"""Numerical matrix/subspace exercises; no parsing or evaluation of code.

Equivalent full-rank frames are compared by orthogonal projectors, not by
elementwise basis coefficients. Projector answers have a separate contract.
"""
import numpy as np

TOL = 1e-7


def matrix(value, name='矩阵'):
    if isinstance(value, dict):
        if set(value) != {'re', 'im'}:
            raise ValueError(name+'需要 re 和 im 两个二维数组')
        re, im = np.asarray(value['re']), np.asarray(value['im'])
        if re.shape != im.shape:
            raise ValueError(name+'实部与虚部形状不同')
        arrays = [re, im]
    else:
        arrays = [np.asarray(value)]
    if any(a.dtype.kind not in 'iuf' for a in arrays):
        raise ValueError(name+'只接受有限实数，不能输入代码或字符串')
    if any(a.ndim != 2 or not all(0 < n <= 32 for n in a.shape) for a in arrays):
        raise ValueError(name+'需要 1 至 32 行/列的非空二维数组')
    out = arrays[0].astype(complex)
    if len(arrays) == 2:
        out += 1j*arrays[1]
    if not np.isfinite(out).all() or np.max(np.abs(out)) > 1e8:
        raise ValueError(name+'含非有限值或过大的分量')
    return out


def packed(a):
    return {'re':np.asarray(a).real.tolist(), 'im':np.asarray(a).imag.tolist()}


def frame(a):
    u, s, _ = np.linalg.svd(a, full_matrices=False)
    rank = int(np.count_nonzero(s > max(1e-12, float(s[0])*1e-10)))
    q = u[:, :rank]
    return q, rank, q@q.conj().T


def calculate(payload):
    if not isinstance(payload, dict) or set(payload)-{'task','answer','kind','mode','example'}:
        raise ValueError('未知的作业输入字段')
    task = payload.get('task')
    if not isinstance(task, dict) or 'reference' not in task:
        raise ValueError('请先选择当前计算生成的作业')
    reference = matrix(task['reference'], '目标子空间基')
    q, rank, target = frame(reference)
    n, d = reference.shape
    if rank != d:
        raise ValueError('目标作业基底不满列秩')
    operators = [matrix(o, '检验算符') for o in task.get('operators', [])]
    if len(operators)>128 or any(o.shape != (n,n) for o in operators):
        raise ValueError('检验算符维数不匹配或数量过多')
    residual = lambda p: max((float(np.linalg.norm((np.eye(n)-p)@o@p)/max(1.,np.linalg.norm(o))) for o in operators), default=0.)
    if residual(target)>TOL:
        raise ValueError('目标子空间未通过声明算符的不变性检查，不能用于判分')
    kind = payload.get('kind', task.get('kind','subspace'))
    if kind not in ('subspace','projector'):
        raise ValueError('只支持子空间基或投影矩阵两种作业')
    mode = payload.get('mode','grade')
    if mode == 'example':
        variant=payload.get('example','equivalent')
        if variant not in ('reference','equivalent','wrong'):
            raise ValueError('未知示例类型')
        candidate=q.copy()
        if variant=='equivalent':
            j=np.arange(d)
            unitary=np.exp(2j*np.pi*np.outer(j,j)/d)/np.sqrt(d)
            candidate=q@unitary*np.exp(.37j)
        if variant=='wrong':
            if d<n:
                u,_,_=np.linalg.svd(np.eye(n)-target)
                candidate[:,0]=(q[:,0]+u[:,0])/np.sqrt(2)
            else:
                candidate[:,0]=0
        if kind=='projector':
            candidate=candidate@candidate.conj().T
        return {'kind':kind,'candidate':packed(candidate),'taskId':str(task.get('id','')),
                'note':'这是公开的学习示例，不计作独立完成；可以修改矩阵后再检查。'}
    if mode!='grade':
        raise ValueError('未知判分方式')
    answer=matrix(payload.get('answer'), '提交答案')
    if answer.shape != ((n,d) if kind=='subspace' else (n,n)):
        raise ValueError(f'当前答案应为 {n} 行、{d if kind=="subspace" else n} 列；每一列是一条基向量')
    _, submitted_rank, p=frame(answer)
    if kind=='projector':
        hermitian=float(np.linalg.norm(answer-answer.conj().T))
        idempotent=float(np.linalg.norm(answer@answer-answer))
        distance=float(np.linalg.norm(answer-target))
        valid=hermitian<=TOL and idempotent<=TOL
    else:
        hermitian=idempotent=0.
        distance=float(np.linalg.norm(p-target))
        valid=True
    invariant=residual(p)
    same=submitted_rank==d and distance<=TOL
    checks=[{'label':'维数与秩一致','passed':submitted_rank==d,'value':submitted_rank,'expected':d},
            {'label':'与目标子空间一致','passed':same,'value':distance,'tolerance':TOL},
            {'label':'声明算符下封闭','passed':invariant<=TOL,'value':invariant,'tolerance':TOL}]
    if kind=='projector':
        checks.extend([{'label':'Hermitian 投影矩阵','passed':hermitian<=TOL,'value':hermitian,'tolerance':TOL},
                       {'label':'幂等性 P²=P','passed':idempotent<=TOL,'value':idempotent,'tolerance':TOL}])
    passed=bool(same and valid and invariant<=TOL)
    return {'taskId':str(task.get('id','')),'kind':kind,'passed':passed,'checks':checks,
            'score':sum(c['passed'] for c in checks),'total':len(checks),
            'orthonormalityResidual':float(np.linalg.norm(answer.conj().T@answer-np.eye(d))) if kind=='subspace' else None,
            'targetProjector':packed(target),'submittedProjector':packed(p),
            'feedback':('通过：相位和子空间内部换基不影响判定。' if passed else '尚未通过：按下方维数、目标子空间及矩阵性质逐项检查。'),
            'scope':'浮点矩阵验证，阈值为1e-7；不批改自由文本证明。子空间模式允许任意数值满秩内部换基；投影矩阵模式要求实际Hermitian幂等矩阵。'}
