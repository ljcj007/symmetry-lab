"""Exact, finite square-operation replay for the first group-theory lesson.

All composition, actions and closure are computed with bounded integers.  The
eight-element planar model is not an arbitrary matrix-group classifier.  Axes
stay fixed; column-vector actions compose from the right.  No numerical package
is needed by this optional module.
"""
from copy import deepcopy

SCHEMA = 'symmetry-lab-composition-1'
IDS = ('E', 'R', 'R2', 'R3', 'M', 'RM', 'R2M', 'R3M')
I2 = ((1, 0), (0, 1))
R = ((0, -1), (1, 0))
M = ((1, 0), (0, -1))
BASIS = ((1, 0), (0, 1))
CORNERS = ((-1, -1), (1, -1), (1, 1), (-1, 1))


def multiply(a, b):
    return tuple(tuple(sum(a[i][k]*b[k][j] for k in range(len(b)))
                       for j in range(len(b[0]))) for i in range(len(a)))


def action(a, vector):
    return tuple(sum(x*y for x, y in zip(row, vector)) for row in a)


def power(a, n):
    result = tuple(tuple(int(i == j) for j in range(len(a))) for i in range(len(a)))
    for _ in range(n):
        result = multiply(result, a)
    return result


MATRICES = dict(zip(IDS, [power(R, a) for a in range(4)] +
                           [multiply(power(R, a), M) for a in range(4)]))
REVERSE = {matrix: identifier for identifier, matrix in MATRICES.items()}


def product(left, right):
    return REVERSE[multiply(MATRICES[left], MATRICES[right])]


def operator_latex(identifier):
    return {'E': 'E', 'R': 'R', 'R2': 'R^{2}', 'R3': 'R^{3}', 'M': 'M',
            'RM': 'RM', 'R2M': 'R^{2}M', 'R3M': 'R^{3}M'}[identifier]


def matrix_pack(value):
    exact = [list(row) for row in value]
    latex = r'\begin{pmatrix}' + r'\\'.join('&'.join(str(x) for x in row)
                                            for row in exact) + r'\end{pmatrix}'
    return {'exact': exact, 'numeric': deepcopy(exact), 'latex': latex,
            'shape': [len(exact), len(exact[0])]}


def vector_pack(value):
    exact = list(value)
    return {'exact': exact, 'numeric': exact.copy(),
            'latex': r'\begin{pmatrix}' + r'\\'.join(map(str, exact)) + r'\end{pmatrix}',
            'dimension': len(exact)}


def determinant(a):
    if len(a) == 2:
        return a[0][0]*a[1][1]-a[0][1]*a[1][0]
    return (a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])
            - a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])
            + a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]))


def inverse_id(identifier):
    return next(other for other in IDS
                if product(identifier, other) == product(other, identifier) == 'E')


def order(identifier):
    return next(n for n in range(1, 9) if power(MATRICES[identifier], n) == I2)


def closure(candidate):
    selected = set(candidate)
    missing = next(({'left': left, 'right': right, 'productId': product(left, right),
                     'matrix': matrix_pack(MATRICES[product(left, right)])}
                    for left in IDS if left in selected
                    for right in IDS if right in selected
                    if product(left, right) not in selected), None)
    members = selected | {'E'}
    stages = [{'index': 0, 'added': [x for x in IDS if x in members],
               'members': [x for x in IDS if x in members], 'witnesses': []}]
    # Each nonterminal round adds a new member of this known finite universe;
    # the final empty round certifies that the complete product queue finished.
    for index in range(1, 10):
        new = set()
        witnesses = []
        for left in IDS:
            if left not in members:
                continue
            for right in IDS:
                if right not in members:
                    continue
                result = product(left, right)
                if result not in members and result not in new:
                    new.add(result)
                    witnesses.append({'left': left, 'right': right, 'productId': result})
        members |= new
        stages.append({'index': index, 'added': [x for x in IDS if x in new],
                       'members': [x for x in IDS if x in members], 'witnesses': witnesses})
        if not new:
            break
    else:
        raise AssertionError('Finite square closure did not finish.')
    identities = 'E' in selected
    inverses = all(inverse_id(x) in selected for x in selected)
    return {'candidateSet': list(candidate), 'closed': missing is None,
            'containsIdentity': identities, 'containsInverses': inverses,
            'isSubgroup': missing is None and identities and inverses,
            'missingProduct': missing, 'generatedClosure': [x for x in IDS if x in members],
            'generationStages': stages, 'complete': True,
            'convention': '生成闭包先加入单位操作，再反复计算当前集合的全部有序乘积；最后一轮没有新增元素才停止。'}


def path(first, second, point):
    first_matrix = MATRICES[first]
    combined = multiply(MATRICES[second], first_matrix)
    frames = []
    for name, identifier, matrix in [('initial', None, I2), ('first', first, first_matrix),
                                      ('second', second, combined)]:
        frames.append({'id': name, 'operationId': identifier,
                       'point': vector_pack(action(matrix, point)),
                       'basis': [vector_pack(action(matrix, basis)) for basis in BASIS],
                       'corners': [vector_pack(action(matrix, corner)) for corner in CORNERS]})
    return {'first': first, 'second': second,
            'writtenProduct': '('+second+')('+first+')',
            'productLatex': '('+operator_latex(second)+')('+operator_latex(first)+')',
            'productId': REVERSE[combined], 'matrix': matrix_pack(combined), 'frames': frames}


def normalized_input(payload):
    if not isinstance(payload, dict):
        raise ValueError('输入必须是对象。')
    if payload.get('lab', 'composition') != 'composition':
        raise ValueError('lab 必须为 composition。')
    first = payload.get('first', 'R')
    second = payload.get('second', 'M')
    if type(first) is not str or first not in IDS or type(second) is not str or second not in IDS:
        raise ValueError('first 和 second 必须是八操作模型中的合法标识。')
    point = payload.get('point', [1, 2])
    if type(point) is not list or len(point) != 2 or any(type(x) is not int or abs(x) > 2 for x in point):
        raise ValueError('point 必须包含两个 −2 到 2 的整数，不接受布尔值、小数或字符串。')
    candidate = payload.get('candidateSet', ['E', 'R'])
    if (type(candidate) is not list or not 1 <= len(candidate) <= 8
            or any(type(x) is not str or x not in IDS for x in candidate)
            or len(set(candidate)) != len(candidate)):
        raise ValueError('candidateSet 必须含一到八个互不重复的合法操作标识。')
    return {'lab': 'composition', 'first': first, 'second': second,
            'point': point.copy(), 'candidateSet': candidate.copy()}


def run(payload):
    selected = normalized_input(payload)
    first, second = selected['first'], selected['second']
    point = selected['point']
    forward, swapped = path(first, second, point), path(second, first, point)
    equal = forward['matrix']['exact'] == swapped['matrix']['exact']
    point_equal = forward['frames'][2]['point']['exact'] == swapped['frames'][2]['point']['exact']
    basis_equal = [forward['frames'][2]['basis'][j]['exact'] == swapped['frames'][2]['basis'][j]['exact']
                   for j in range(2)]
    if equal:
        explanation = '这两个操作在整个平面上可交换；两条路径对每个基矢和每个点都给出相同结果。'
    elif point_equal:
        explanation = '所选点的两条路径碰巧相同，但两个矩阵不同；检查两支独立的单位箭头才能比较整个线性操作。'
    else:
        explanation = '两条路径给出不同的点像，且两个矩阵不同；这对操作不可交换。'
    selected_closure = closure(selected['candidateSet'])
    inverse_rows = []
    operators = []
    for identifier in IDS:
        matrix = MATRICES[identifier]
        inverse = inverse_id(identifier)
        operators.append({'id': identifier, 'label': operator_latex(identifier),
                          'matrix': matrix_pack(matrix),
                          'basisImages': [vector_pack(action(matrix, x)) for x in BASIS],
                          'determinant': determinant(matrix), 'order': order(identifier), 'inverseId': inverse})
        inverse_rows.append({'id': identifier, 'inverseId': inverse,
                             'leftId': product(inverse, identifier), 'rightId': product(identifier, inverse),
                             'leftMatrix': matrix_pack(multiply(MATRICES[inverse], matrix)),
                             'rightMatrix': matrix_pack(multiply(matrix, MATRICES[inverse]))})
    fixed = {'left': 'M', 'right': 'E', 'point': vector_pack(BASIS[0]),
             'leftPoint': vector_pack(action(M, BASIS[0])), 'rightPoint': vector_pack(BASIS[0]),
             'pointEqual': True, 'matrixEqual': M == I2,
             'basis': [{'id': label, 'initial': vector_pack(v),
                        'left': vector_pack(action(M, v)), 'right': vector_pack(v),
                        'equal': action(M, v) == v}
                       for label, v in zip(('e_x', 'e_y'), BASIS)],
             'explanation': '固定反例比较 M 与 E：它们都保持 e_x，但对 e_y 的作用不同。它独立于上方选择的操作和点。'}
    mirror3 = ((1, 0, 0), (0, -1, 0), (0, 0, 1))
    proper3 = ((1, 0, 0), (0, -1, 0), (0, 0, -1))
    group_relations = [
        {'id': 'R4', 'formula': r'R^4=E', 'passed': power(R, 4) == I2},
        {'id': 'M2', 'formula': r'M^2=E', 'passed': power(M, 2) == I2},
        {'id': 'MRM', 'formula': r'MRM=R^{-1}=R^3',
         'passed': multiply(multiply(M, R), M) == power(R, 3)}]
    checks = [
        {'id': 'eight-distinct', 'label': '模型包含八个不同的精确矩阵', 'passed': len(REVERSE) == 8},
        {'id': 'group-closure', 'label': '八操作的全部乘积都在模型内',
         'passed': all(multiply(MATRICES[a], MATRICES[b]) in REVERSE for a in IDS for b in IDS)},
        {'id': 'associativity', 'label': '全部三操作组合满足结合律',
         'passed': all(product(product(a, b), c) == product(a, product(b, c))
                       for a in IDS for b in IDS for c in IDS)},
        {'id': 'inverse', 'label': '每个逆操作的左右乘积都是单位操作',
         'passed': all(row['leftId'] == row['rightId'] == 'E' for row in inverse_rows)},
        {'id': 'matrix-columns', 'label': '矩阵两列等于两个单位基矢的像',
         'passed': all(action(op, BASIS[j]) == tuple(row[j] for row in op)
                       for op in MATRICES.values() for j in range(2))},
        {'id': 'both-paths', 'label': '两条逐步路径与对应复合矩阵一致',
         'passed': all(p['frames'][2]['point']['exact'] == list(action(
             tuple(tuple(row) for row in p['matrix']['exact']), point)) for p in (forward, swapped))},
        {'id': 'basis-decides-map', 'label': '比较完整基底得到的判断与矩阵相等判断一致', 'passed': equal == all(basis_equal)},
        {'id': 'closure-finished', 'label': '生成闭包以完整的无新增轮次结束',
         'passed': selected_closure['complete'] and not selected_closure['generationStages'][-1]['added']},
        {'id': 'one-probe', 'label': '固定单探针反例由第二个独立基矢区分',
         'passed': fixed['pointEqual'] and not fixed['matrixEqual'] and not fixed['basis'][1]['equal']},
        {'id': 'embedding', 'label': '固定 z 镜像与三维正旋转的行列式不同',
         'passed': determinant(mirror3) == -1 and determinant(proper3) == 1}]
    return {'schema': SCHEMA, 'lab': 'composition', 'exact': True,
            'input': deepcopy(payload), 'normalizedInput': selected,
            'arithmetic': 'bounded exact integers; all composition and closure calculated in Python',
            'basis': {'dimension': 2, 'order': ['e_x', 'e_y'],
                      'vectors': [vector_pack(v) for v in BASIS],
                      'convention': '主动操作作用于平面实列向量，坐标轴不动；矩阵的第 j 列是第 j 个单位基矢的像。'},
            'operators': operators, 'paths': {'forward': forward, 'swapped': swapped},
            'comparison': {'matrixEqual': equal, 'pointEqual': point_equal, 'basisEqual': basis_equal,
                           'commute': equal, 'explanation': explanation},
            'group': {'order': 8, 'operatorOrder': list(IDS),
                      'name': '正方形的八元素平面二面体群；本页记为 D₄。',
                      'relations': group_relations,
                      'multiplication': {'rowConvention': '左因子 A', 'columnConvention': '右因子 B',
                                         'entryConvention': '表项 AB 先作用 B，再作用 A。',
                                         'ids': list(IDS), 'entries': [[product(a, b) for b in IDS] for a in IDS]},
                      'inverses': inverse_rows, 'closure': selected_closure,
                      'rotationOnlyClosure': closure(['R']), 'rotationMirrorClosure': closure(['R', 'M'])},
            'fixedProbeCounterexample': fixed,
            'embedding': {'dimension': 2,
                          'fixedZ': {'group': 'C4v', 'mirror': matrix_pack(mirror3), 'determinant': determinant(mirror3)},
                          'properMirrorAlternative': {'group': 'D4', 'matrix': matrix_pack(proper3), 'determinant': determinant(proper3)},
                          'description': '本页先研究二维平面作用。若三维嵌入保持 z 不变，得到 C₄ᵥ；三维正旋转点群 D₄ 的对应操作还会反转 z，是绕 x 的二重旋转。两者抽象同构，但三维作用不同。'},
            'steps': [
                {'id': 'order', 'title': '① 先说清动作先后',
                 'explanation': '先作用 first，再作用 second，因此列向量左边写 second·first。比较交换先后的第二条路径。',
                 'formula': r'v\xrightarrow{A}Av\xrightarrow{B}BAv'},
                {'id': 'basis', 'title': '② 用两支单位箭头比较整个操作',
                 'explanation': '一个点相同还不够。依次跟踪 e_x 和 e_y，并保留每一步的坐标。',
                 'formula': r'Ae_x,\quad Ae_y'},
                {'id': 'columns', 'title': '③ 把基矢的像读成矩阵列',
                 'explanation': '第一列记录 e_x 的像，第二列记录 e_y 的像。两列都相同，才是同一个平面线性操作。',
                 'formula': r'A=\begin{pmatrix}|&|\\Ae_x&Ae_y\\|&|\end{pmatrix}'},
                {'id': 'closure', 'title': '④ 检查封闭性与撤销操作',
                 'explanation': '生成元列表不一定是完整群。寻找缺失乘积，补全生成闭包，并用左右单位乘积检查逆操作。',
                 'formula': r'R^4=E,\quad M^2=E,\quad MRM=R^{-1}'}],
            'checks': checks,
            'notes': [
                '本页只计算固定八操作模型，不做任意矩阵群闭包或点群鉴别。',
                '坐标、矩阵、两条路径、乘法表和闭包判断都由 Python 精确整数计算；网页只选择并绘制返回值。',
                'MR 与 RM 在本页平面模型中只在原点给出相同点像；不能虚构非零平面重合点。固定的 M/E 反例用于说明非零单探针也可能不足。',
                '结合律允许改变括号，不允许任意交换操作的先后。',
                '方形轮廓和两支单位箭头是操作探针，不把颜色或箭头当作改变物体对称性的化学标记。',
                '三维嵌入说明不涉及空间平移、自旋、Bloch 相位或磁群分类。'],
            'sources': [
                {'title': 'T. W. Judson, Abstract Algebra: Theory and Applications, Dihedral Groups',
                 'url': 'https://twjudson.github.io/aata-files/aata-html/permute-section-dihedral-groups.html'},
                {'title': 'Dresselhaus, Dresselhaus and Jorio, Group Theory (2008)',
                 'url': 'https://doi.org/10.1007/978-3-540-32899-5'}]}
