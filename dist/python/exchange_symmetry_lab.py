"""Bond symmetry and exchange of two distinguishable spin-1/2 moments.

The oriented bond is i=(-1/2,0,0) -> j=(1/2,0,0). Spins are axial
vectors; operations can exchange endpoints. All energies are in meV and
S=sigma/2 is dimensionless. Classical arrows instead have unit length.
"""
import math
import numpy as np


AXES = 'xyz'
LABELS = ['J_'+a+b for a in AXES for b in AXES]
DEFAULTS = dict(isotropic=1., anisotropyX=0., anisotropyY=0., symmetricXY=0.,
                symmetricXZ=0., symmetricYZ=0., dx=0., dy=0., dz=.6,
                inversion=0, mirrorXY=1, mirrorXZ=0, mirrorYZ=0,
                rotationOrder=0, conventionAngle=0., swapSites=0)
PAULI = [np.array([[0, 1], [1, 0]], complex),
         np.array([[0, -1j], [1j, 0]], complex), np.diag([1., -1.])]


def antisymmetric(d):
    x, y, z = d
    return np.array([[0., z, -y], [-z, 0., x], [y, -x, 0.]])


def decompose(j):
    iso = float(np.trace(j)/3)
    symmetric = (j+j.T)/2-iso*np.eye(3)
    d = np.array([j[1, 2]-j[2, 1], j[2, 0]-j[0, 2], j[0, 1]-j[1, 0]])/2
    return iso, symmetric, d


def parse(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入须为参数对象。')
    unknown = set(payload)-set(DEFAULTS)
    if unknown:
        raise ValueError('不支持的参数：'+', '.join(sorted(unknown)))
    p = dict(DEFAULTS, **payload)
    for key, value in p.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(key+' 必须为有限数。')
        if key in ('inversion', 'mirrorXY', 'mirrorXZ', 'mirrorYZ', 'swapSites'):
            if value not in (0, 1):
                raise ValueError(key+' 须为0或1。')
            p[key] = int(value)
        elif key == 'rotationOrder':
            if value not in (0, 2, 4):
                raise ValueError('键轴旋转只能为无、二重或四重。')
            p[key] = int(value)
        elif abs(value) > (180 if key == 'conventionAngle' else 10):
            raise ValueError(key+' 超出教学范围。')
        else:
            p[key] = float(value)
    return p


def raw_tensor(p):
    j = np.diag([p['isotropic']+p['anisotropyX'],
                 p['isotropic']+p['anisotropyY'],
                 p['isotropic']-p['anisotropyX']-p['anisotropyY']])
    for (a, b), name in [((0, 1), 'symmetricXY'), ((0, 2), 'symmetricXZ'), ((1, 2), 'symmetricYZ')]:
        j[a, b] = j[b, a] = p[name]
    return j + antisymmetric([p['dx'], p['dy'], p['dz']])


def generators(p):
    ops = []
    for key, label, diag in [('inversion', '键中心反演', [-1, -1, -1]),
                             ('mirrorXY', '包含键的xy镜面', [1, 1, -1]),
                             ('mirrorXZ', '包含键的xz镜面', [1, -1, 1]),
                             ('mirrorYZ', '垂直键的yz镜面', [-1, 1, 1])]:
        if p[key]:
            ops.append((key, label, np.diag(diag)))
    if p['rotationOrder']:
        angle = 2*math.pi/p['rotationOrder']
        c, s = round(math.cos(angle)), round(math.sin(angle))
        ops.append(('rotation', '绕键轴的'+str(p['rotationOrder'])+'重旋转',
                    np.array([[1, 0, 0], [0, c, -s], [0, s, c]])))
    return ops


def axial(r):
    return round(np.linalg.det(r))*r


def transformed(j, r):
    a = axial(r)
    return a.T @ (j.T if r[0, 0] < 0 else j) @ a


def constraint_block(r):
    return np.column_stack([(np.eye(9)[i].reshape(3, 3)-transformed(np.eye(9)[i].reshape(3, 3), r)).ravel()
                            for i in range(9)])


def group_closure(ops):
    identity = np.eye(3, dtype=int)
    elements = [identity]
    seen = {tuple(identity.ravel())}
    for g in elements:
        for _, _, r in ops:
            h = g @ r
            key = tuple(h.ravel())
            if key not in seen:
                seen.add(key)
                elements.append(h)
    return elements


def hamiltonian(j):
    return sum((j[a, b]*np.kron(PAULI[a], PAULI[b])/4 for a in range(3) for b in range(3)),
               np.zeros((4, 4), complex))


def quantum(j):
    h = hamiltonian(j)
    energies, u = np.linalg.eigh(h)
    mask = np.abs(energies-energies[0]) < 1e-9
    rho = u[:, mask] @ u[:, mask].conj().T / int(mask.sum())
    corr = np.array([[np.trace(rho @ np.kron(PAULI[a], PAULI[b])/4).real for b in range(3)] for a in range(3)])
    spin1 = [float(np.trace(rho @ np.kron(s, np.eye(2))/2).real) for s in PAULI]
    spin2 = [float(np.trace(rho @ np.kron(np.eye(2), s)/2).real) for s in PAULI]
    multiplets = []
    for energy in energies:
        if multiplets and abs(energy-multiplets[-1]['energy']) < 1e-9:
            multiplets[-1]['multiplicity'] += 1
        else:
            multiplets.append(dict(energy=float(energy), multiplicity=1))
    return dict(levels=energies.tolist(), multiplets=multiplets,
                groundDegeneracy=int(mask.sum()), groundCorrelations=corr.tolist(),
                groundSpin1=spin1, groundSpin2=spin2,
                groundRho=dict(re=rho.real.tolist(), im=rho.imag.tolist()))


def classical(j):
    u, singular, vh = np.linalg.svd(j)
    a, b = u[:, 0].copy(), -vh[0].copy()
    # Fix the arbitrary joint sign solely for reproducible arrow display.
    if a[np.argmax(abs(a))] < 0:
        a, b = -a, -b
    return dict(spin1=a.tolist(), spin2=b.tolist(), energy=float(a@j@b),
                angleDegrees=float(np.degrees(np.arccos(np.clip(a@b, -1., 1.)))),
                singularValues=singular.tolist(), maximumMultiplicity=int(np.sum(abs(singular-singular[0]) < 1e-9)),
                convention='单位长度经典向量的一个全局极小值代表；奇异值简并时不唯一，不是量子基态磁矩。')


def relation_rows(block):
    result, seen = [], set()
    for row in block:
        nz = np.flatnonzero(abs(row) > 1e-10)
        if not len(nz):
            continue
        row = row/row[nz[0]]
        key = tuple(np.round(row, 10))
        if key in seen:
            continue
        seen.add(key)
        result.append([{'coefficient': LABELS[i], 'factor': float(row[i])} for i in nz])
    return result


def calculate(payload):
    p = parse(payload)
    ops = generators(p)
    blocks = [constraint_block(r) for _, _, r in ops]
    constraints = np.vstack(blocks) if blocks else np.zeros((0, 9))
    if len(constraints):
        _, s, vh = np.linalg.svd(constraints, full_matrices=True)
        rank = int(np.sum(s > 1e-10))
        nullspace = vh[rank:].T
    else:
        rank, nullspace = 0, np.eye(9)
    projector = nullspace @ nullspace.T
    raw = raw_tensor(p)
    j = (projector @ raw.ravel()).reshape(3, 3)
    j[abs(j) < 1e-12] = 0.
    iso, symmetric, d = decompose(j)
    group = group_closure(ops)
    residual = max(float(np.linalg.norm(j-transformed(j, r))) for r in group)
    proofs = []
    for (key, label, r), block in zip(ops, blocks):
        proofs.append(dict(id=key, operation=label, polarMatrix=r.tolist(), axialMatrix=axial(r).tolist(),
                           swapsSites=bool(r[0, 0] < 0), formula='J = A^T J^T A' if r[0, 0] < 0 else 'J = A^T J A',
                           relations=relation_rows(block), inputResidual=float(np.linalg.norm(block@raw.ravel())),
                           outputResidual=float(np.linalg.norm(block@j.ravel()))))
    q = quantum(j)
    theta = math.radians(p['conventionAngle'])
    rotation = np.array([[math.cos(theta), -math.sin(theta), 0.], [math.sin(theta), math.cos(theta), 0.], [0., 0., 1.]])
    converted = rotation.T @ (j.T if p['swapSites'] else j) @ rotation
    _, converted_symmetric, converted_d = decompose(converted)
    converted_q = quantum(converted)
    convention_error = float(np.max(abs(np.array(converted_q['levels'])-q['levels'])))
    cl = classical(j)
    projected_input_symmetric = (projector @ ((raw+raw.T)/2).ravel()).reshape(3, 3)
    projected_input_anti = (projector @ ((raw-raw.T)/2).ravel()).reshape(3, 3)
    scales = np.linspace(0, 1.5, 61)
    spectrum_scan = np.array([np.linalg.eigvalsh(hamiltonian(projected_input_symmetric+x*projected_input_anti)) for x in scales])
    canting_scan = np.array([classical(projected_input_symmetric+x*projected_input_anti)['angleDegrees'] for x in scales])
    angles = np.linspace(-180, 180, 181)
    planar_energy = [float(np.array([1., 0., 0.]) @ j @ np.array([math.cos(math.radians(a)), math.sin(math.radians(a)), 0.])) for a in angles]
    tr = np.kron(1j*PAULI[1], 1j*PAULI[1])
    h = hamiltonian(j)
    tr_error = float(np.linalg.norm(tr@h.conj()@tr.conj().T-h))
    reconstruction = float(np.linalg.norm(j-iso*np.eye(3)-symmetric-antisymmetric(d)))
    checks = dict(passed=max(residual, convention_error, reconstruction, tr_error) < 1e-9,
                  groupConstraintResidual=residual, decompositionResidual=reconstruction,
                  conventionSpectrumResidual=convention_error,
                  projectorIdempotence=float(np.linalg.norm(projector@projector-projector)),
                  hamiltonianHermiticity=float(np.linalg.norm(h-h.conj().T)),
                  timeReversalResidual=tr_error, twoSpinTimeReversalSquare=1,
                  classicalLowerBoundResidual=abs(cl['energy']+cl['singularValues'][0]))
    return dict(model='oriented-bond-two-spin-half', parameters=p,
                summary=[dict(label='允许交换张量的独立实参数', value=9-rank), dict(label='生成群的操作数', value=len(group)),
                         dict(label='约束后D向量模长', value=float(np.linalg.norm(d)), unit='meV'),
                         dict(label='量子基态能量', value=q['levels'][0], unit='meV'),
                         dict(label='经典单位向量夹角', value=cl['angleDegrees'], unit='°'),
                         dict(label='约定变换后的谱残差', value=convention_error, unit='meV')],
                plots=[dict(id='exchange-levels', title='缩放允许DMI时的双自旋量子能级', xLabel='DMI乘数 λ', yLabel='E（meV）',
                            series=[dict(label='第'+str(i+1)+'能级', points=np.column_stack([scales, spectrum_scan[:, i]]).tolist()) for i in range(4)]),
                       dict(id='exchange-canting', title='一个经典极小代表的夹角；简并处代表可改变', xLabel='DMI乘数 λ', yLabel='夹角（°）',
                            series=[dict(label='经典单位向量', points=np.column_stack([scales, canting_scan]).tolist())]),
                       dict(id='exchange-plane', title='限制在xy面且固定第一个自旋沿x的试探能量', xLabel='第二个自旋方位角（°）', yLabel='E（meV；单位经典向量）',
                            series=[dict(label='受限平面试探态', points=np.column_stack([angles, planar_energy]).tolist())])],
                tables=[dict(title='输入、约束后与约定变换后的交换张量', columns=['分量','输入 / meV','约束后 / meV','换约定 / meV'],
                             rows=[[LABELS[i], float(raw.flat[i]), float(j.flat[i]), float(converted.flat[i])] for i in range(9)]),
                        dict(title='量子能级及简并度', columns=['能量 / meV','简并度'], rows=[[v['energy'],v['multiplicity']] for v in q['multiplets']]),
                        dict(title='量子基态子空间平均的自旋关联', columns=['分量','数值'], rows=[[AXES[a]+AXES[b],q['groundCorrelations'][a][b]] for a in range(3) for b in range(3)])],
                checks=checks,
                warnings=['单条有向键i→j沿x；使用真实轴向自旋和端点交换，不以一般体张量替代键约束。所有系数为教学输入，投影按矩阵Frobenius范数定义；允许项可以取零，不预测其材料大小。',
                          '量子模型为两个可区分的自旋1/2，S=σ/2、能量meV。经典箭头为单位向量的一组全局极小代表；奇异值简并时有多组代表，不把箭头当作有限量子基态的局域磁矩。',
                          '能谱具有双自旋时间反演T²=+1，不能凭时间反演宣称Kramers配对。能级简并度是此组参数的结果，不自动证明所有允许扰动都保留该简并。',
                          '坐标对照采用被动正交旋转v′=Q^T v；交换端点使J→J^T、D→−D。D分量改变并不意味着物理相互作用改变。当前不计算晶格磁序、磁振子色散或具体材料的弱铁磁矩。'],
                exchange=dict(inputTensor=raw.tolist(), tensor=j.tolist(), isotropic=iso, symmetric=symmetric.tolist(), D=d.tolist(),
                              constraints=proofs, generators=[label for _, label, _ in ops], closureOrder=len(group),
                              closureMatrices=[r.tolist() for r in group], allowedBasis=nullspace.tolist(), rank=rank, **q),
                convention=dict(rotation=rotation.tolist(), angleDegrees=p['conventionAngle'], swapSites=bool(p['swapSites']),
                                tensor=converted.tolist(), symmetric=converted_symmetric.tolist(), D=converted_d.tolist(),
                                levels=converted_q['levels'], energyResidual=convention_error,
                                description='被动转轴v′=Q^T v；若交换i/j，先J→J^T再转轴。'),
                classical=cl,
                formulaLinks=[dict(id='bond-exchange-invariant', label='键对称性约束的来源', formula='H_{ij}=S_i^T J_{ij} S_j',
                                   meaning='操作保持端点时J=A^TJA；交换端点时J=A^TJ^TA，其中A=det(R)R。',
                                   values=[dict(label='允许维数',value=9-rank),dict(label='群约束残差',value=residual)],plot='exchange-levels'),
                              dict(id='bond-dmi-decomposition', label='DMI与反对称矩阵', formula='H_D=D·(S_i×S_j)',
                                   meaning='约定Jxy−Jyx=2Dz；交换有向键同时交换自旋次序与D符号。',
                                   values=[dict(label='Dx / meV',value=float(d[0])),dict(label='Dy / meV',value=float(d[1])),dict(label='Dz / meV',value=float(d[2]))],plot='exchange-canting'),
                              dict(id='bond-classical-bound',label='经典双自旋的全局下界',formula='E_{min}=−s_{max}(J)',
                                   meaning='对单位向量，双线性型最小值由最大奇异值给出；受限xy平面的试探曲线不一定达到该全局下界。',
                                   values=[dict(label='全局经典最小能量 / meV',value=cl['energy'])],plot='exchange-plane')])
