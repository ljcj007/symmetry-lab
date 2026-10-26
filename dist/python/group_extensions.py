"""Exact finite examples of double, colour and spin-space symmetries.

This is an educational operation calculator, not a group classifier.  Fraction
arithmetic in Q(sqrt(3)) certifies the examples; floats occur only in the drawing
coordinates. Space examples include all integer translations of the displayed
motif. Their tables are translation quotients, never the infinite space group.
"""
from fractions import Fraction
import math


class _Q3:
    """a+b sqrt(3); sufficient for every fixed matrix in these experiments."""
    __slots__ = ('a', 'b')

    def __init__(self, a=0, b=0):
        if isinstance(a, _Q3):
            self.a, self.b = a.a, a.b
        else:
            self.a, self.b = Fraction(a), Fraction(b)

    def __add__(self, other):
        other = _Q3(other)
        return _Q3(self.a + other.a, self.b + other.b)

    __radd__ = __add__

    def __neg__(self):
        return _Q3(-self.a, -self.b)

    def __sub__(self, other):
        return self + -_Q3(other)

    def __rsub__(self, other):
        return _Q3(other) + -self

    def __mul__(self, other):
        other = _Q3(other)
        return _Q3(self.a * other.a + 3 * self.b * other.b,
                   self.a * other.b + self.b * other.a)

    __rmul__ = __mul__

    def __eq__(self, other):
        if not isinstance(other, (int, Fraction, _Q3)):
            return False
        other = _Q3(other)
        return self.a == other.a and self.b == other.b

    def __float__(self):
        return float(self.a) + float(self.b) * math.sqrt(3)

    def __str__(self):
        if not self.b:
            return str(self.a)
        magnitude = abs(self.b)
        radical = 'sqrt(3)' if magnitude == 1 else str(magnitude) + '*sqrt(3)'
        if not self.a:
            return ('-' if self.b < 0 else '') + radical
        return str(self.a) + (' - ' if self.b < 0 else ' + ') + radical


def _vector(*values):
    return [_Q3(value) for value in values]


_ZERO = _vector(0, 0, 0)
_I = [_vector(1, 0, 0), _vector(0, 1, 0), _vector(0, 0, 1)]
_C2X = [_vector(1, 0, 0), _vector(0, -1, 0), _vector(0, 0, -1)]
_C2Z = [_vector(-1, 0, 0), _vector(0, -1, 0), _vector(0, 0, 1)]
_C3Z = [_vector(Fraction(-1, 2), _Q3(0, Fraction(-1, 2)), 0),
         _vector(_Q3(0, Fraction(1, 2)), Fraction(-1, 2), 0), _vector(0, 0, 1)]
_POINT_TRIANGLE = [_vector(1, 0, 0),
                   _vector(Fraction(-1, 2), _Q3(0, Fraction(1, 2)), 0),
                   _vector(Fraction(-1, 2), _Q3(0, Fraction(-1, 2)), 0)]
_VARIANTS = ('combined', 'spatial_only', 'internal_only')
_SOURCES = [
    {'title': 'Bilbao: double crystallographic groups and their representations',
     'url': 'https://doi.org/10.1107/S1600576717011712'},
    {'title': 'Shinohara et al.: Algorithm for spin symmetry operation search (2024)',
     'url': 'https://journals.iucr.org/a/issues/2024/01/00/ib5119/'},
    {'title': 'Etxebarria et al.: Spin point groups (2025)',
     'url': 'https://journals.iucr.org/a/issues/2025/04/00/cam5007/'},
    {'title': 'IUCr Online Dictionary: Colour symmetry',
     'url': 'https://dictionary.iucr.org/Colour_symmetry'},
]


def _mv(matrix, vector):
    return [sum(a * b for a, b in zip(row, vector)) for row in matrix]


def _mm(left, right):
    return [[sum(left[i][k] * right[k][j] for k in range(3)) for j in range(3)]
            for i in range(3)]


def _transpose(matrix):
    return [list(column) for column in zip(*matrix)]


def _det(matrix):
    a = matrix
    return (a[0][0] * (a[1][1]*a[2][2] - a[1][2]*a[2][1])
            - a[0][1] * (a[1][0]*a[2][2] - a[1][2]*a[2][0])
            + a[0][2] * (a[1][0]*a[2][1] - a[1][1]*a[2][0]))


def _exact(matrix):
    return [[str(value) for value in row] for row in matrix]


def _translation(left_r, left_t, right_t):
    return [a + b for a, b in zip(_mv(left_r, right_t), left_t)]


def _choice(payload, name, choices, default):
    value = payload.get(name, default)
    if not isinstance(value, str) or value not in choices:
        raise ValueError(name + ' 必须为 ' + '、'.join(choices))
    return value


def _steps(payload):
    value = payload.get('steps', 6)
    if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 12:
        raise ValueError('steps 必须为 1 到 12 的整数')
    return value


def _cyclic_group(order, space, label, names=None):
    names = names or ['E'] + ['g' if n == 1 else 'g^' + str(n) for n in range(1, order)]
    return {'labels': names,
            'table': [[names[(i + j) % order] for j in range(order)] for i in range(order)],
            'order': order, 'quotientOrder': order, 'finiteFullGroup': not space,
            'quotientBy': '纯整数平移 Txyz' if space else '无（显示选定有限子群本身）',
            'tableRepresents': '联合生成元的模平移商群' if space else '联合生成元生成的有限子群',
            'label': label, 'scope': '选定生成元及所声明平移生成的子群；不枚举整个结构的对称群'}


def _base(lab, preset, title, space):
    result = {'lab': lab, 'preset': preset, 'title': title,
              'dimension': 'space' if space else 'point', 'arithmetic': 'exact Q(sqrt(3))',
              'exact': True, 'frames': [], 'referenceSites': [], 'checks': [], 'derivation': [],
              'convention': '主动操作，右边先作用；坐标和箭头均使用正交笛卡尔坐标。精确数保留为有理数或 sqrt(3) 根式。',
              'sources': _SOURCES, 'notes': []}
    if space:
        result['cellVertices'] = [[x, y, z] for x in (0, 1) for y in (0, 1) for z in (0, 1)]
        result['latticeAxes'] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
        result['notes'].append('图中是三维周期结构的一个晶胞及其像；沿 x、y、z 均可作任意整数平移。完整空间群无限，表格仅表示模整数平移后的有限商群。')
    return result


def _quaternion_product(a, b):
    w, x, y, z = a
    v, p, q, r = b
    return (w*v - x*p - y*q - z*r, w*p + x*v + y*r - z*q,
            w*q - x*r + y*v + z*p, w*r + x*q - y*p + z*v)


def _quaternion_rotation(q):
    w, x, y, z = q
    return [_vector(1-2*(y*y+z*z), 2*(x*y-w*z), 2*(x*z+w*y)),
            _vector(2*(x*y+w*z), 1-2*(x*x+z*z), 2*(y*z-w*x)),
            _vector(2*(x*z-w*y), 2*(y*z+w*x), 1-2*(x*x+y*y))]


def _complex_text(real, imaginary):
    if not imaginary:
        return str(real)
    imag = 'I' if abs(imaginary) == 1 else str(abs(imaginary)) + '*I'
    if not real:
        return ('-' if imaginary < 0 else '') + imag
    return str(real) + (' - ' if imaginary < 0 else ' + ') + imag


def _spinor_matrix(q):
    w, x, y, z = q
    entries = [[(w, -z), (-y, -x)], [(y, -x), (w, z)]]
    return ([[{'re': a, 'im': b} for a, b in row] for row in entries],
            [[_complex_text(a, b) for a, b in row] for row in entries])


def _double(payload):
    preset = _choice(payload, 'preset', ('c2_point', 'd2_point', 'screw21_space'), 'd2_point')
    steps = _steps(payload)
    kz = _choice(payload, 'kz', ('0', '1/4', '1/2'), '0')
    space = preset == 'screw21_space'
    result = _base('double_group', preset,
                   {'c2_point': '双点群：C₂ 的四阶提升', 'd2_point': '双点群：222 的 Q₈ 提升',
                    'screw21_space': '双空间群：2₁ 螺旋与 2π 中心元'}[preset], space)
    result.update({'steps': steps, 'kz': kz})
    result['arithmetic'] = 'exact rational coordinates and Q(i) spinor matrices'
    quaternions = [(1,0,0,0), (-1,0,0,0), (0,1,0,0), (0,-1,0,0),
                   (0,0,1,0), (0,0,-1,0), (0,0,0,1), (0,0,0,-1)]
    labels = ['E', 'barE', 'X', 'barX', 'Y', 'barY', 'Z', 'barZ']
    q_labels = dict(zip(quaternions, labels))
    if preset == 'd2_point':
        table = [[q_labels[_quaternion_product(a,b)] for b in quaternions] for a in quaternions]
        result['group'] = {'labels': labels, 'table': table, 'order': 8, 'quotientOrder': 4,
                           'quotientBy': '中心子群 {E,barE}', 'tableRepresents': '八阶双点群 Q8 本身',
                           'finiteFullGroup': True, 'label': 'Q₈：双点群 222；模 {E,barE} 得 D₂',
                           'scope': '绕三个正交轴的二重旋转及其旋量提升'}
        result['commutator'] = {'xy': 'Z', 'yx': 'barZ', 'xyxInverseYInverse': 'barE'}
        result['notes'].append('X=−iσx，Y=−iσy，Z=−iσz。逐步动画交替先 X、再 Y；累计矩阵为左乘新操作，四步得 barE、八步得 E。')
    else:
        result['group'] = _cyclic_group(4, space, '双螺旋子群模平移：C₄' if space else 'C₄：C₂ 的双点群',
                                       ['E', 'g', 'barE', 'barE*g'])
        result['group']['quotientOrder'] = 4 if space else 2
        result['group']['spatialPointOrder'] = 2
        if not space:
            result['group']['quotientBy'] = '中心子群 {E,barE}'
        result['group']['scope'] += '；表中 barE 表示 g² 的平移等价类' if space else ''
    probe = _vector(Fraction(1,4), Fraction(1,3), Fraction(1,5))
    result['referenceSites'] = [{'id': 'probe', 'position': list(map(float, probe)),
                                  'positionExact': list(map(str, probe)), 'spin': [0,0,1],
                                  'spinExact': ['0','0','1']}]
    q = quaternions[0]
    t = _ZERO[:]
    for step in range(steps + 1):
        rotation = _quaternion_rotation(q)
        xyz = [a+b for a,b in zip(_mv(rotation, probe), t)]
        spin = _mv(rotation, _vector(0,0,1))
        matrix, matrix_exact = _spinor_matrix(q)
        site = {'id': 'probe', 'position': list(map(float,xyz)), 'positionExact': list(map(str,xyz)),
                'spin': list(map(float,spin)), 'spinExact': list(map(str,spin))}
        if space:
            site['positionWrapped'] = [float(v.a % 1) for v in xyz]
        result['frames'].append({'step': step, 'operation': q_labels[q] + (' ; t=(0,0,' + str(t[2]) + ')' if space else ''),
                                 'rotationExact': _exact(rotation), 'translationExact': list(map(str,t)),
                                 'internalExact': matrix_exact, 'spinorMatrixExact': matrix_exact,
                                 'spinorMatrix': matrix, 'quaternion': list(q), 'sites': [site],
                                 'preservesPattern': None})
        generator = quaternions[2 if step % 2 == 0 else 4] if preset == 'd2_point' else quaternions[6]
        generator_t = _vector(0,0,Fraction(1,2)) if space else _ZERO
        t = _translation(_quaternion_rotation(generator), generator_t, t)
        q = _quaternion_product(generator, q)
    phase = {'0': '-1', '1/4': 'I', '1/2': '1'}[kz]
    result['closure'] = {'formula': 'g² = barE · T(0,0,1)' if space else
                                    ('(YX)² = barE; (YX)⁴ = E' if preset == 'd2_point' else 'g² = barE; g⁴ = E'),
                         'spatialOrder': 2, 'spinorOrder': 4,
                         'sequenceSpatialReturnStep': 4 if preset == 'd2_point' else 2,
                         'sequenceSpinorReturnStep': 8 if preset == 'd2_point' else 4,
                         'translationExact': ['0','0','1' if space else '0'],
                         'blochPhaseExact': phase if space else '-1', 'kz': kz,
                         'fullOrder': 'infinite' if space else ('8' if preset == 'd2_point' else '4')}
    result['checks'] = [{'label': '中心元 barE 的平方为 E', 'passed': _quaternion_product(quaternions[1], quaternions[1]) == quaternions[0]},
                        {'label': '每个二重旋转提升的平方为 barE', 'passed': all(_quaternion_product(quaternions[i], quaternions[i]) == quaternions[1] for i in (2,4,6))},
                        {'label': 'SU(2) 负号投影到相同的 SO(3) 旋转', 'passed': all(_quaternion_rotation(a) == _quaternion_rotation(tuple(-x for x in a)) for a in quaternions)}]
    result['derivation'] = [
        {'title': '从旋转提升到旋量', 'formula': 'Uₙ(π)=exp(−iπσₙ/2)=−iσₙ',
         'explanation': '采用右手主动旋转约定；X、Y、Z 分别沿 x、y、z 轴。'},
        {'title': '保留中心元', 'formula': 'Uₙ(π)²=−I=barE，barE²=E',
         'explanation': '2π 旋转在经典箭头上不可见，在旋量上是 −I；只有相对参考路径才能观测整体负号。'},
        {'title': '组合空间操作', 'formula': '({R|t},U)({S|u},V)=({RS|Ru+t},UV)',
         'explanation': '螺旋先累积平移再检查是否回到单位元，不能仅凭折回晶胞后的坐标判定。'},
        {'title': '读取本例关系', 'formula': result['closure']['formula'],
         'explanation': '螺旋情形在旋转不变的 k=(0,0,kz) 上有 D(g)²=−exp(−2πikz)，这里 kz=' + kz + ' 时为 ' + phase + '。' if space else
                        ('XY=Z，YX=barZ，故交换子为 barE；三个二重轴在 SO(3) 中可交换，在此旋量提升中不可交换。' if preset == 'd2_point' else '因此双群有四个元素 E、g、barE、barE g。')},
    ]
    result['notes'].extend(['这里只对适当旋转作 SU(2) 提升；镜面与反演的双群约定需另行指定，不能仅把任意 3×3 矩阵变成旋量矩阵。',
                            '双群的中心负号、颜色置换和独立自旋空间旋转是不同的扩充。图中箭头是旋量的 Bloch 向量，不能展示整体相位。'])
    return result


def _same_position(a, b, periodic):
    delta = [x-y for x,y in zip(a,b)]
    return all(v.b == 0 and v.a.denominator == 1 for v in delta) if periodic else all(v == 0 for v in delta)


def _match(sites, reference, periodic):
    """Exact one-to-one labelled-motif matching; fixed examples have unique sites."""
    mapping = []
    for site in sites:
        candidates = [i for i, ref in enumerate(reference) if _same_position(site['position'],ref['position'],periodic)
                      and site.get('color') == ref.get('color') and site.get('spin') == ref.get('spin')]
        if len(candidates) != 1 or candidates[0] in mapping:
            return False, []
        mapping.append(candidates[0])
    return len(mapping) == len(reference), mapping


def _public_site(site, periodic, target=None):
    result = {'id': site['id'], 'position': list(map(float,site['position'])),
              'positionExact': list(map(str,site['position']))}
    if periodic:
        # All periodic preset positions stay rational in the selected examples.
        result['positionWrapped'] = [float(v.a % 1) for v in site['position']]
    if 'color' in site:
        result['color'] = site['color']
    if 'spin' in site:
        result['spin'], result['spinExact'] = list(map(float,site['spin'])), list(map(str,site['spin']))
    if target is not None:
        result['targetId'] = target
    return result


def _transform(reference, rotation, translation, internal, color_shift, color_count):
    sites = []
    for site in reference:
        item = {'id': site['id'], 'position': [x+y for x,y in zip(_mv(rotation,site['position']),translation)]}
        if 'color' in site:
            item['color'] = (site['color'] + color_shift) % color_count
        if 'spin' in site:
            item['spin'] = _mv(internal,site['spin'])
        sites.append(item)
    return sites


def _pattern(payload, lab):
    color = lab == 'color_group'
    choices = ('c3_point','translation3_space') if color else ('c2_point','af_space','triangular_point','helix3_space')
    preset = _choice(payload, 'preset', choices, 'c3_point' if color else 'af_space')
    variant = _choice(payload, 'variant', _VARIANTS, 'combined')
    steps = _steps(payload)
    space = preset.endswith('_space')
    order = 2 if preset in ('c2_point','af_space') else 3
    rotation = _I if space else _C2Z if order == 2 else _C3Z
    translation = _vector(0,0,Fraction(1,order)) if space else _ZERO
    internal = _I if color else _C2X if order == 2 else _C3Z
    if space:
        positions = [_vector(Fraction(1,4),Fraction(1,4),Fraction(i,order)) for i in range(order)]
    elif order == 2:
        positions = [_vector(1,0,0),_vector(-1,0,0)]
    else:
        positions = _POINT_TRIANGLE
    reference = []
    for i, position in enumerate(positions):
        site = {'id': 'site-'+str(i), 'position': position}
        if color:
            site['color'] = i
        else:
            site['spin'] = _vector(0,0,1 if i == 0 else -1) if order == 2 else _POINT_TRIANGLE[i]
        reference.append(site)
    title = {'c3_point':'三色点群：空间 C₃ 与颜色循环', 'translation3_space':'三色空间群：分数平移与颜色循环',
             'c2_point':'自旋点群：独立的两个旋转轴', 'af_space':'自旋空间群：反铁磁半平移',
             'triangular_point':'自旋点群：120° 共面三角结构', 'helix3_space':'自旋空间群：三层共面螺旋结构'}[preset]
    result = _base(lab,preset,title,space)
    result.update({'variant': variant, 'steps': steps,
                   'referenceSites': [_public_site(site,space) for site in reference],
                   'colorCount': order if color else None,
                   'group': _cyclic_group(order,space,('模整数平移的 C'+str(order)+' 商群' if space else '选定生成操作形成的 C'+str(order)+' 子群'))})
    generator_r = _I if variant == 'internal_only' else rotation
    generator_t = _ZERO if variant == 'internal_only' else translation
    generator_u = _I if variant == 'spatial_only' else internal
    generator_shift = 1 if color and variant != 'spatial_only' else 0
    r, t, u, shift = _I, _ZERO, _I, 0
    labels = {'combined':'空间与内部变换同时作用','spatial_only':'仅空间操作','internal_only':'仅内部变换'}
    for step in range(steps+1):
        sites = _transform(reference,r,t,u,shift,order)
        preserves, mapping = _match(sites,reference,space)
        result['frames'].append({'step':step, 'operation':labels[variant]+'；第 '+str(step)+' 次',
                                 'rotationExact':_exact(r), 'translationExact':list(map(str,t)),
                                 'internalExact': [str((i+shift)%order) for i in range(order)] if color else _exact(u),
                                 'colorPermutation':[(i+shift)%order for i in range(order)] if color else None,
                                 'sites':[_public_site(site,space,reference[mapping[i]]['id'] if preserves else None)
                                          for i,site in enumerate(sites)], 'preservesPattern':preserves})
        t = _translation(generator_r,generator_t,t)
        r, u = _mm(generator_r,r), _mm(generator_u,u)
        shift = (shift+generator_shift)%order
    tests = []
    for variant_name in _VARIANTS:
        rr = _I if variant_name == 'internal_only' else rotation
        tt = _ZERO if variant_name == 'internal_only' else translation
        uu = _I if variant_name == 'spatial_only' else internal
        ss = 1 if color and variant_name != 'spatial_only' else 0
        passed, mapping = _match(_transform(reference,rr,tt,uu,ss,order),reference,space)
        tests.append({'variant':variant_name,'label':labels[variant_name], 'preservesPattern':passed,
                      'mapping':[reference[i]['id'] for i in mapping]})
    result['symmetryTests'] = tests
    result['checks'] = [{'label':'组合生成元保持每个格点的颜色或磁矩', 'passed':tests[0]['preservesPattern']},
                        {'label':'负对照：仅空间操作不保持图样', 'passed':not tests[1]['preservesPattern']},
                        {'label':'负对照：仅内部变换不保持图样', 'passed':not tests[2]['preservesPattern']},
                        {'label':'空间与自旋旋转矩阵正交且行列式为 +1',
                         'passed': all(_mm(m,_transpose(m)) == _I and _det(m) == 1 for m in (rotation,internal))}]
    closure = 'g^'+str(order)+' = '+('T(0,0,1)' if space else 'E')
    result['closure'] = {'formula':closure, 'translationExact':['0','0','1' if space else '0'],
                         'fullOrder':'infinite' if space else str(order), 'quotientOrder':order,
                         'appliesTo':'combined generator; not necessarily selected control variant'}
    result['derivation'] = [
        {'title':'分开记录两种作用', 'formula':'(R,t;π): (r,c) ↦ (Rr+t,π(c))' if color else '[U∥R|t]: (r,m) ↦ (Rr+t,Um)',
         'explanation':'空间部分决定去哪个位置，内部部分决定到达时的颜色或自旋。'},
        {'title':'按同一顺序复合', 'formula':'(R,t;π)(S,u;ρ)=(RS,Ru+t;π∘ρ)' if color else '[U∥R|t][V∥S|u]=[UV∥RS|Ru+t]',
         'explanation':'右边操作先作用。颜色排列或自旋旋转必须随空间操作一起累计。'},
        {'title':'逐点检查图样', 'formula':'c(Rr+t)=π(c(r))' if color else 'm(Rr+t)=U m(r)',
         'explanation':'对所有显示格点作精确匹配；三维空间例还要模整数晶格平移。两个单独操作均不通过，但组合通过。'},
        {'title':'区分子群与商群', 'formula':closure,
         'explanation':'g 的完整阶数无限，模整数平移后阶数为 '+str(order)+'。' if space else '这是选定生成操作产生的有限子群，不声称列出该图样的全部对称性。'},
    ]
    if color:
        result['notes'].extend(['颜色编号为抽象离散标签，允许的置换必须与空间操作成群；本实验选用 3 循环，未枚举任意 n 色群。',
                                '黑白交换本身是二元置换。只有赋予时间反演的物理作用后才是磁群操作；量子时间反演需要复共轭，不等同于交换颜色。'])
        result['colorKernel'] = {'label':'保持每一种颜色的核', 'quotient':'C3',
                                  'description':'整数三维平移子群；g³=Tz 保持全部颜色' if space else '本例 C3 生成子群内仅 E 保持所有颜色'}
    else:
        locked = _transform(reference,rotation,translation,rotation,0,order)
        locked_pass, locked_map = _match(locked,reference,space)
        result['socLockedTest'] = {'preservesPattern':locked_pass,
                                   'spinMatrixExact':_exact(rotation),
                                   'mapping':[reference[i]['id'] for i in locked_map],
                                   'label':'同一个空间操作配上 SOC 锁定的轴向变换 det(R)R；本例 det(R)=+1'}
        if space:
            result['spinPointProjection'] = {
                'operation': '[U∥I]', 'kernel': '[I∥I|n], n∈Z³',
                'order': order,
                'explanation': '忘去平移后，联合自旋平移仍投影为非平凡 [U∥I]；核是自旋也恒等的纯平移，不能把所有 [U∥I|t] 都商去。'}
        result['spinOnlyUnitary'] = '绕 z 轴的 SO(2) 连续旋转' if order == 2 else '仅 E（所有磁矩逐点保持）'
        result['notes'].extend(['这里 U 是经典磁矩的适当旋转，全部 det(U)=+1，表示幺正自旋旋转。一般自旋群可含 det(U)=−1 的自旋操作；其量子实现通常需要时间反演，并非本有限例的普通 SU(2) 矩阵。',
                                '在弱 SOC 或忽略 SOC 的近似中，自旋与晶格旋转可独立。启用 SOC 时普通幺正空间对称的磁矩变换锁定为 det(R)R；磁操作还可附加时间反演。',
                                'SOC 锁定测试只检查该空间操作配合指定的普通幺正自旋变换。未通过不排除另一个反幺正磁操作保持同一共线磁结构；例如反铁磁例中的时间反演加半格平移。',
                                '自旋群 [U∥R|t] 与 Spin(3)=SU(2) 的双覆盖不是同一概念。对本例 SO(3) 自旋因子再作旋量提升时，2π 旋转才会出现额外中心负号。',
                                '有限表格仅涵盖选定生成元。共线结构还具有保持自旋方向的 SO(2) 连续自旋独立子群，不能称整个自旋群为有限 C2。'])
        if space:
            result['notes'].append(result['spinPointProjection']['explanation'])
        result['derivation'].append({'title':'检查 SOC 锁定条件', 'formula':'U_SOC=det(R)R',
                                     'explanation':'将内部旋转换成由空间操作锁定的轴向变换后，本例保持图样：'+('是。' if locked_pass else '否。')+'这只检验该操作，不计算材料真实的 SOC 强度。'})
    return result


def run(payload):
    """Return exact operation data and a floating-point-only visual preview."""
    if not isinstance(payload,dict):
        raise ValueError('教学实验输入必须是 JSON 对象')
    lab = _choice(payload,'lab',('double_group','color_group','spin_group'),'double_group')
    return _double(payload) if lab == 'double_group' else _pattern(payload,lab)
