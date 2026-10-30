"""Commensurate scalar modulation on a square N x N torus, N = 2, 3, 4.

The parent is the declared finite quotient (Z_N x Z_N) semidirect C4v,
not a classification of three-dimensional crystallographic space groups.
All site permutations, stars, stabilizers and orbit sizes are computed.
"""
import math
from functools import lru_cache
import numpy as np


def _matrix(value):
    array = np.asarray(value, complex)
    return {'re': array.real.tolist(), 'im': array.imag.tolist()}


def _finite(payload, key, default, limit):
    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or abs(value) > limit:
        raise ValueError(key+' 必须是绝对值不超过 '+str(limit)+' 的有限实数。')
    return float(value)


def _integer(payload, key, default, low, high):
    value = _finite(payload, key, default, max(abs(low), abs(high)))
    if value != int(value) or value < low or value > high:
        raise ValueError(key+' 必须是 '+str(low)+' 到 '+str(high)+' 的整数。')
    return int(value)


@lru_cache(maxsize=3)
def group_data(period):
    """Exact semidirect product and its (possibly nonfaithful) site action."""
    rotation = np.array([[0, -1], [1, 0]], int)
    mirror = np.diag([1, -1])
    rotations = [np.linalg.matrix_power(rotation, i) for i in range(4)]
    point_ops = rotations + [r @ mirror for r in rotations]
    point_labels = ['E', 'C4', 'C2', 'C4^-1', 'm_x', 'm_diag', 'm_y', 'm_antidiag']
    point_index = {tuple(r.ravel()): i for i, r in enumerate(point_ops)}
    sites = np.array([(x, y) for y in range(period) for x in range(period)], int)
    operations = []
    for ri, r in enumerate(point_ops):
        for ty in range(period):
            for tx in range(period):
                images = (sites @ r.T + [tx, ty]) % period
                destination = images[:, 1] * period + images[:, 0]
                p = np.zeros((period**2, period**2), int)
                p[destination, np.arange(period**2)] = 1
                operations.append({'pointIndex': ri, 'translation': (tx, ty), 'matrix': p,
                                   'label': point_labels[ri]+' | ('+str(tx)+','+str(ty)+')'})
    def product(a, b):
        ga, gb = operations[a], operations[b]
        ra, rb = point_ops[ga['pointIndex']], point_ops[gb['pointIndex']]
        ri = point_index[tuple((ra @ rb).ravel())]
        t = (ra @ np.array(gb['translation']) + ga['translation']) % period
        return ri * period**2 + int(t[1]) * period + int(t[0])
    multiplication = np.array([[product(a, b) for b in range(len(operations))] for a in range(len(operations))], int)
    return sites, point_ops, operations, multiplication


def wave_star(q, period, point_ops):
    q = np.asarray(q, int)
    star = sorted({tuple(int(x) for x in ((r @ q) % period)) for r in point_ops})
    first = tuple(int(x) for x in (q % period))
    pairs, seen = [], set()
    for arm in [first] + star:
        if arm in seen:
            continue
        opposite = tuple((-x) % period for x in arm)
        pair = [arm] if opposite == arm else [arm, opposite]
        pairs.append(pair)
        seen.update(pair)
    return star, pairs


def fourier_basis(sites, pairs, period):
    """Orthonormal real basis. Self-conjugate arms contribute only cosine."""
    columns = []
    for pair in pairs:
        angle = 2 * np.pi * (sites @ np.array(pair[0])) / period
        columns.append(np.cos(angle))
        if len(pair) == 2:
            columns.append(np.sin(angle))
    basis = np.column_stack(columns)
    # Discrete Fourier orthogonality makes separate normalization sufficient;
    # QR also keeps roundoff small for all supported tori.
    basis, _ = np.linalg.qr(basis)
    return basis


def _unique_images(operations, field, tolerance):
    images, representatives = [], []
    for index, operation in enumerate(operations):
        image = operation['matrix'] @ field
        if not any(np.max(np.abs(image-old)) <= tolerance for old in images):
            images.append(image)
            representatives.append(index)
    return images, representatives


def _points(sites, field):
    return [{'x': int(site[0]), 'y': int(site[1]), 'z': float(value),
             'label': '('+str(site[0])+','+str(site[1])+')', 'weight': float(value)}
            for site, value in zip(sites, field)]


def _subgroup_graph(order, stabilizer, translation, identity=0):
    groups = [('parent', 'G：声明的有限超胞母群', set(range(order))),
              ('translations', 'T：超胞内平移', set(translation)),
              ('stabilizer', 'H：当前图案稳定子', set(stabilizer)),
              ('retained-translations', 'H∩T：保留平移', set(stabilizer) & set(translation)),
              ('identity', '{e}', {identity})]
    nodes, unique, selected = [], [], None
    for id_, label, members in groups:
        previous = next((i for i, item in enumerate(unique) if item == members), None)
        if previous is None:
            previous = len(unique)
            unique.append(members)
            nodes.append({'id': id_, 'label': label, 'order': len(members),
                          'details': '元素为 (R,t)，群运算模声明的 N×N 超胞；这是有限商群的真实包含关系，不是完整空间群关系图。',
                          'members': sorted(members)})
        else:
            nodes[previous]['label'] += ' = '+label
        if id_ == 'stabilizer':
            selected = nodes[previous]['id']
    edges = []
    for i, parent in enumerate(unique):
        for j, child in enumerate(unique):
            if child < parent and not any(child < middle < parent for middle in unique):
                edges.append({'from': nodes[i]['id'], 'to': nodes[j]['id'],
                              'label': '子群，指数 '+str(len(parent)//len(child))})
    return {'nodes': nodes, 'edges': edges, 'selected': selected}


def calculate(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须为对象。')
    allowed = {'period', 'qx', 'qy', 'amplitude', 'transverseRatio', 'phaseDegrees', 'relativePhaseDegrees', 'pattern'}
    if set(payload) - allowed:
        raise ValueError('Unknown wavevector fields: '+', '.join(sorted(str(k) for k in set(payload)-allowed)))
    n = _integer(payload, 'period', 4, 2, 4)
    q = (_integer(payload, 'qx', 1, -4, 4) % n, _integer(payload, 'qy', 0, -4, 4) % n)
    amplitude = _finite(payload, 'amplitude', 1, 5)
    ratio = _finite(payload, 'transverseRatio', 1, 3)
    phase = _finite(payload, 'phaseDegrees', 0, 360)
    relative_phase = _finite(payload, 'relativePhaseDegrees', 0, 360)
    pattern = payload.get('pattern', 'single')
    if pattern not in ('single', 'multi'):
        raise ValueError('pattern 须为 single 或 multi。')
    sites, point_ops, operations, multiplication = group_data(n)
    star, pairs = wave_star(q, n, point_ops)
    basis = fourier_basis(sites, pairs, n)
    projector = basis @ basis.T
    field = np.zeros(n*n)
    pair_rows, partials = [], []
    for index, pair in enumerate(pairs):
        a = amplitude if index == 0 else amplitude * ratio if pattern == 'multi' else 0.
        p = phase if index == 0 else phase + relative_phase
        component = a * np.cos(2*np.pi*(sites @ np.array(pair[0]))/n + math.radians(p))
        field += component
        partials.append(field.copy())
        pair_rows.append({'arms': [list(arm) for arm in pair], 'amplitude': a, 'phaseDegrees': p,
                          'selfConjugate': len(pair) == 1, 'component': component.tolist()})
    # Remove trigonometric roundoff relative to the requested amplitudes, not
    # an absolute cutoff that would classify a small nonzero field as zero.
    input_scale = max(abs(row['amplitude']) for row in pair_rows)
    field[np.abs(field) < 1e-13 * input_scale] = 0.
    tolerance = 1e-9 * max(1e-300, float(np.max(np.abs(field))))
    retained = [i for i, operation in enumerate(operations)
                if np.max(np.abs(operation['matrix'] @ field-field)) <= tolerance]
    translations = list(range(n*n))
    retained_t = sorted(set(retained) & set(translations))
    orbit, representatives = _unique_images(operations, field, tolerance)
    t_orbit, t_representatives = _unique_images(operations[:n*n], field, tolerance)
    transformed = np.fft.fft2(field.reshape(n, n)) / (n*n)
    intensity = np.abs(transformed)**2
    spectrum = [{'q': [kx, ky], 'fractionalQ': [kx/n, ky/n, 0],
                 're': float(transformed[ky, kx].real), 'im': float(transformed[ky, kx].imag),
                 'intensity': float(intensity[ky, kx])}
                for ky in range(n) for kx in range(n)]
    active = [row for row in spectrum if abs(complex(row['re'], row['im'])) > tolerance]
    lx = n // math.gcd(n, *[row['q'][0] for row in active]) if active else 1
    ly = n // math.gcd(n, *[row['q'][1] for row in active]) if active else 1
    translation_index = n*n // len(retained_t)
    projected = projector @ field
    projection_residual = float(np.linalg.norm(projected-field))
    generator_ids = [1, n, n*n, 4*n*n]  # Tx, Ty, C4, mx
    invariant_residual = max(float(np.linalg.norm((np.eye(n*n)-projector) @ operations[i]['matrix'] @ basis)) for i in generator_ids)
    parseval_residual = abs(float(intensity.sum())-float(np.mean(field**2)))
    conjugacy_residual = max(abs(transformed[y, x] - transformed[-y % n, -x % n].conjugate()) for y in range(n) for x in range(n))
    subgroup_closure = all(int(multiplication[a, b]) in retained for a in retained for b in retained)
    # Verify group multiplication at the level of exact site permutations.
    action_residual = max(int(np.max(np.abs(operations[g]['matrix'] @ operations[h]['matrix'] - operations[int(multiplication[g, h])]['matrix'])))
                          for g in generator_ids for h in range(len(operations)))
    faithful = len({tuple(op['matrix'].ravel()) for op in operations}) == len(operations)
    warnings = [
        '本实验是已知方格母晶格上的单标量模式，嵌入 z=0 平面。母群为 (Z_N×Z_N)⋊C₄ᵥ 的有限周期商群；不识别任意三维空间群、任意原子模式或非公度结构。',
        '标量可解释为占据偏离，或 C₄ᵥ 操作下不变号的垂直位移幅度；这里没有水平镜面、反演或轴向磁矩表示。占据偏离未加背景值，不可直接当作占据率。',
        '振幅与相位指定一个图案；对称性和畴计数不证明真实材料的热力学稳定相。母群轨道表示对称相关图案，未计算能量或畴壁。',
        '谱强度为无量纲标量场的 |DFT|²；没有原子散射因子、偏振、位移的 Q·u 因子或实验几何，不能当作真实衍射强度。',
        '相容矩形周期 Lx×Ly 可能不是最小斜晶胞；平移指数由当前图案的实际平移稳定子计算。完整 q 星子空间的作业与当前激活的图案不同。']
    if not faithful:
        warnings.append('N=2 时不同抽象点操作可在四个位点上给出相同置换；保留全部 8N² 个抽象群元素，轨道—稳定子仍成立。')
    if any(row['selfConjugate'] and abs(row['amplitude']) > 1e-12 for row in pair_rows):
        warnings.append('自共轭臂满足 q≡−q；只有一个实模式，sin 模式为零。输入相位只把其振幅乘以 cosφ，φ=90° 时该分量消失。')
    if not active:
        warnings.append('当前场为零，所有母群操作均保留；完整 q 星的表示空间仍可用于子空间作业。')
    replay = [
        {'title': '声明超胞、坐标与群作用', 'text': '位点顺序 x 先变、y 后变；g=(R,t) 把 r 送到 Rr+t mod N。以下 C₄ 是真实二维整数旋转。', 'matrix': _matrix(point_ops[1])},
        {'title': '用 C₄ 生成一个星臂', 'text': '输入 q='+str(list(q))+'/'+str(n)+'，C₄q='+str(((point_ops[1] @ np.array(q)) % n).tolist())+'/'+str(n)+'；所有臂均按倒格矢取模。', 'vector': _matrix((point_ops[1] @ np.array(q)) % n)},
        {'title': '把共轭臂组成实模式', 'text': '每对非自共轭臂提供 cos 与 sin 两列；自共轭臂仅提供 cos。以下正交矩阵列张成完整星的实子空间。', 'matrix': _matrix(basis)}]
    for index, partial in enumerate(partials):
        replay.append({'title': '叠加共轭对 '+str(index+1),
                       'text': '加入 q='+str(pair_rows[index]['arms'][0])+'/'+str(n)+' 的 A cos(2πq·r+φ)；A='+format(pair_rows[index]['amplitude'], '.5g')+'，φ='+format(pair_rows[index]['phaseDegrees'], '.5g')+'°。',
                       'vector': _matrix(partial), 'points': _points(sites, partial)})
    translated = operations[1]['matrix'] @ field
    replay.append({'title': '真实平移一次并比较图案', 'text': '主动平移 Tx：新场在 r 处等于原场在 r−(1,0) 处。是否属于稳定子由整个位点向量逐项比较。',
                   'matrix': _matrix(operations[1]['matrix']), 'vector': _matrix(translated), 'points': _points(sites, translated)})
    replay.append({'title': '投影回完整星子空间', 'text': '由正交实基 B 构造 P=BBᵀ，再计算 Pf；重建残差='+format(projection_residual, '.3g')+'。投影矩阵不依赖子空间内部换基。',
                   'matrix': _matrix(projector), 'vector': _matrix(projected)})
    info = {'period': n, 'q': list(q), 'fractionalQ': [q[0]/n, q[1]/n, 0],
            'star': [list(arm) for arm in star], 'pairs': pair_rows, 'field': field.tolist(),
            'sites': [[int(x), int(y), 0] for x, y in sites], 'points': _points(sites, field),
            'basis': _matrix(basis), 'projector': _matrix(projector), 'realDimension': int(basis.shape[1]),
            'groupOrder': len(operations), 'faithfulSiteAction': faithful,
            'stabilizerOrder': len(retained), 'retained': retained,
            'translationStabilizerOrder': len(retained_t), 'retainedTranslations': [list(operations[i]['translation']) for i in retained_t],
            'domainCount': len(orbit), 'translationDomainCount': len(t_orbit), 'translationIndex': translation_index,
            'rectangularPeriod': [lx, ly], 'spectrum': spectrum,
            'domains': [{'representative': operations[i]['label'], 'field': v.tolist()} for i, v in zip(representatives, orbit)],
            'translationDomains': [{'translation': list(operations[i]['translation']), 'field': v.tolist()} for i, v in zip(t_representatives, t_orbit)],
            'operations': [{'id': i, 'label': op['label'], 'pointMatrix': point_ops[op['pointIndex']].tolist(),
                            'translation': list(op['translation']), 'retained': i in retained} for i, op in enumerate(operations)]}
    return {
        'model': 'commensurate-square-scalar', 'parameters': {'period': n, 'qx': q[0], 'qy': q[1], 'amplitude': amplitude,
            'transverseRatio': ratio, 'phaseDegrees': phase, 'relativePhaseDegrees': relative_phase, 'pattern': pattern},
        'wavevector': info,
        'summary': [{'label': '声明有限母群阶数', 'value': len(operations)}, {'label': 'q 星臂数 / 实维数', 'value': str(len(star))+' / '+str(basis.shape[1])},
                    {'label': '图案稳定子阶数', 'value': len(retained)}, {'label': '全部对称相关图案', 'value': len(orbit)},
                    {'label': '平移畴 / 最小平移指数', 'value': len(t_orbit)}, {'label': '相容矩形周期', 'value': str(lx)+'×'+str(ly)}],
        'tables': [
            {'title': 'q 星、共轭配对与输入模式', 'columns': ['共轭对（分子）', '振幅', '相位 / 度', '实自由度'],
             'rows': [[str(row['arms'])+'/'+str(n), row['amplitude'], row['phaseDegrees'], 1 if row['selfConjugate'] else 2] for row in pair_rows]},
            {'title': '实际保留的超胞平移', 'columns': ['tx', 'ty'], 'rows': info['retainedTranslations']},
            {'title': '非零 Fourier 分量与相对卫星强度', 'columns': ['q（倒格单位）', 'Re F', 'Im F', '|F|²'],
             'rows': [[str(row['fractionalQ']), row['re'], row['im'], row['intensity']] for row in active]},
            {'title': '当前图案稳定子操作', 'columns': ['操作', '平面矩阵 R', '平移 t'],
             'rows': [[operations[i]['label'], str(point_ops[operations[i]['pointIndex']].tolist()), str(list(operations[i]['translation']))] for i in retained]}],
        'plots': [
            {'id': 'wavevector-field', 'title': '超胞实空间图案：每条曲线为一个 y 行', 'xLabel': 'x / 母晶格常数', 'yLabel': '标量场 f',
             'series': [{'label': 'y='+str(y), 'points': [[x, float(field[y*n+x])] for x in range(n)]} for y in range(n)]},
            {'id': 'wavevector-spectrum', 'title': '标量调制 Fourier 强度：k=x+Ny', 'xLabel': '倒格网格编号 k', 'yLabel': '|F(q)|²（任意单位）',
             'series': [{'label': 'DFT 强度', 'points': [[i, row['intensity']] for i, row in enumerate(spectrum)]}]}],
        'checks': {'passed': subgroup_closure and action_residual == 0 and len(orbit)*len(retained) == len(operations)
                   and len(t_orbit)*len(retained_t) == n*n and parseval_residual < 1e-8 and conjugacy_residual < 1e-8 and invariant_residual < 1e-8,
                   'exactStabilizerClosure': subgroup_closure, 'groupActionResidual': action_residual,
                   'orbitStabilizer': len(orbit)*len(retained) == len(operations), 'translationOrbitStabilizer': len(t_orbit)*len(retained_t) == n*n,
                   'parsevalResidual': parseval_residual, 'realConjugacyResidual': float(conjugacy_residual),
                   'starSubspaceInvarianceResidual': invariant_residual, 'fieldProjectionResidual': projection_residual},
        'warnings': warnings, 'replay': replay,
        'subgroupGraph': _subgroup_graph(len(operations), retained, translations),
        'grading': {'tasks': [{'id': 'wavevector-real-star', 'title': '提交完整 q 星的实模式子空间', 'kind': 'subspace',
            'reference': _matrix(basis), 'operators': [_matrix(operations[i]['matrix']) for i in generator_ids],
            'instructions': '按 x 先变、y 后变排列 '+str(n*n)+' 个位点，把模式放在列中；目标为完整 q 星的 '+str(basis.shape[1])+' 维子空间。允许列归一化、相位和任意满秩内部换基；须保留同一张成空间，可提交对应投影矩阵。'}]},
        'formulaLinks': [
            {'id': 'wavevector-real', 'label': '从共轭臂恢复实场', 'formula': 'f(r)=Σ_j A_j cos(2πq_j·r+φ_j)；F(−q)=F(q)^*',
             'meaning': 'q 以母倒格单位表示。非自共轭臂的复系数与共轭系数配对；自共轭点仅有一个实分量。', 'plot': 'wavevector-field',
             'values': [{'label': '完整星实维数', 'value': int(basis.shape[1])}, {'label': '共轭残差', 'value': float(conjugacy_residual)}]},
            {'id': 'wavevector-domains', 'label': '图案稳定子与平移畴', 'formula': 'H={g∈G:D(g)f=f}；N_domain=|G|/|H|；N_translation=|T|/|H∩T|',
             'meaning': '先对指定图案求稳定子，再由轨道—稳定子定理计数。这里 G 是声明超胞的有限商群。', 'plot': 'wavevector-field',
             'values': [{'label': '|G|', 'value': len(operations)}, {'label': '|H|', 'value': len(retained)}, {'label': '平移畴数', 'value': len(t_orbit)}]},
            {'id': 'wavevector-dft', 'label': '模式 Fourier 强度与 Parseval 检验', 'formula': 'F(q)=N⁻²Σ_r f(r)exp(−2πiq·r)；Σ_q|F(q)|²=N⁻²Σ_r|f(r)|²',
             'meaning': 'DFT 使用负指数与 1/N² 归一化。这里给出标量模式的相对 Fourier 权重，实验强度还需要散射因子和几何。', 'plot': 'wavevector-spectrum',
             'values': [{'label': '强度总和', 'value': float(intensity.sum())}, {'label': '实场均方', 'value': float(np.mean(field**2))}, {'label': 'Parseval 残差', 'value': parseval_residual}]}]}
