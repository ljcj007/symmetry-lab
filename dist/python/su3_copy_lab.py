"""Exact, isolated 8 x 8 outer-multiplicity teaching adapter.

The existing canonical CG reply is preserved in full. All new basis changes
are derived from immutable copies, with no new inputs to the canonical API.
Only twelve explicitly enumerated exact transformations are accepted.
"""
from collections import namedtuple
from copy import deepcopy
from functools import lru_cache
import hashlib
import json

import sympy as sp


SCHEMA = 'symmetry-lab-su3-copy-1'
OP_IDS = ('E12', 'E21', 'E23', 'E32', 'E13', 'E31', 'H1', 'H2')
_Canonical = namedtuple('_Canonical', 'reply_json request_json embedding generators target pairs_json projector plus minus swap')


@lru_cache(maxsize=4096)
def _simp(value):
    return sp.radsimp(sp.cancel(sp.expand(value)))


def _clean(matrix):
    return sp.ImmutableSparseMatrix(matrix.applyfunc(_simp))


@lru_cache(maxsize=4096)
def _scalar_values(value):
    value = _simp(value)
    return (str(value), sp.latex(value), float(sp.re(value).evalf(17)),
            float(sp.im(value).evalf(17)))


def _scalar(value):
    exact, latex, real, imag = _scalar_values(sp.sympify(value))
    return {'exact': exact, 'latex': latex, 'numeric': {'re': real, 'im': imag}}


def _matrix(matrix):
    # Parallel arrays keep exported matrices compact. All representations of a
    # coefficient come from the same exact expression, including complex ones.
    matrix = _clean(matrix)
    values = [[_scalar(matrix[i, j]) for j in range(matrix.cols)]
              for i in range(matrix.rows)]
    return {'shape': [matrix.rows, matrix.cols],
            'exact': [[v['exact'] for v in row] for row in values],
            'latex': sp.latex(matrix),
            'numeric': [[v['numeric'] for v in row] for row in values]}


def _sparse(matrix):
    matrix = _clean(matrix)
    return {'shape': [matrix.rows, matrix.cols], 'entries': [
        {'row': i, 'column': j, 'value': _scalar(v)}
        for (i, j), v in sorted(matrix.todok().items()) if v != 0]}


def _residual(matrix):
    values = {_simp(v) for v in matrix if v != 0}
    squares = [_simp(sp.conjugate(v) * v) for v in values if v != 0]
    return _simp(sp.sqrt(max(squares))) if squares else sp.Integer(0)


def _key(row):
    return (row['localIndex'], tuple(row['pattern']), tuple(row['weight']),
            row['twoI'], row['twoI3'], row['threeY'])


@lru_cache(maxsize=1)
def _canonical():
    from su3_cg import run as canonical_run
    from su3_cg_exact import _coupling, _irrep
    data = _coupling(1, 1, 1, 1)
    # Never retain a mutable core matrix, list, or metadata dictionary.
    c = sp.ImmutableSparseMatrix(data['matrix'])
    blocks = deepcopy(data['blocks'])
    rows = deepcopy(data['coupledBasis'])
    octets = [b for b in blocks if (b['p'], b['q']) == (1, 1)]
    if len(octets) != 2 or {b['swapParity'] for b in octets} != {1, -1}:
        raise ArithmeticError('规范回包必须包含交换宇称相反的两份八重态')
    by_parity = {b['swapParity']: b for b in octets}
    maps = {p: {_key(r): r for r in rows
                if r['blockIndex'] == by_parity[p]['index']} for p in (1, -1)}
    if len(maps[1]) != 8 or maps[1].keys() != maps[-1].keys():
        raise ArithmeticError('两份八重态的完整 GT 标签无法逐项配对')
    ordered = sorted(maps[1], key=lambda k: k[0])
    if [k[0] for k in ordered] != list(range(8)):
        raise ArithmeticError('八重态内部标签必须完整覆盖八个态')
    paired = []
    indices = []
    for identity in ordered:
        s, a = maps[1][identity], maps[-1][identity]
        paired.append({'p': s['p'], 'q': s['q'],
                       'mu': identity[0], 'pattern': list(identity[1]),
                       'weight': list(identity[2]), 'twoI': identity[3],
                       's': {k: s[k] for k in ('copy', 'blockIndex', 'swapParity')},
                       'a': {k: a[k] for k in ('copy', 'blockIndex', 'swapParity')}})
        paired[-1]['s']['canonicalColumn'] = s['index']
        paired[-1]['a']['canonicalColumn'] = a['index']
    for parity in (1, -1):
        indices.extend(maps[parity][identity]['index'] for identity in ordered)
    embedding = sp.ImmutableSparseMatrix(c[:, indices])
    generators = tuple(sp.ImmutableSparseMatrix(g) for g in data['generators'])
    target = tuple(sp.ImmutableSparseMatrix(sp.kronecker_product(sp.eye(2), g))
                   for g in _irrep(1, 1)['generators'])
    cs, ca = embedding[:, :8], embedding[:, 8:]
    plus, minus = _clean(cs * cs.H), _clean(ca * ca.H)
    projector = _clean(plus + minus)
    swap = sp.ImmutableSparseMatrix(64, 64,
        {(i*8+j, j*8+i): 1 for i in range(8) for j in range(8)})
    # This request identifies the original source result independently of the
    # workshop's angle/phase. The column is discovered from actual metadata.
    default = next(p for p in paired if p['mu'] == 3)
    request = {'lab': 'lie', 'experiment': 'su3_cg', 'arithmetic': 'exact',
               'p1': 1, 'q1': 1, 'p2': 1, 'q2': 1,
               'direction': 'coupled_to_product',
               'state': {'index': default['s']['canonicalColumn']}}
    reply = canonical_run(deepcopy(request))
    if reply['exactCGMatrix'] != [[str(v) for v in row] for row in c.tolist()]:
        raise ArithmeticError('规范来源矩阵与教学嵌入来源不一致')
    freeze = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':'))
    return _Canonical(freeze(reply), freeze(request), embedding, generators,
                      target, freeze(paired), projector, plus, minus, swap)


def _rotation(angle, phase):
    c, s = {0: (sp.Integer(1), sp.Integer(0)),
            45: (sp.sqrt(2)/2, sp.sqrt(2)/2),
            90: (sp.Integer(0), sp.Integer(1))}[angle]
    z = {'1': sp.Integer(1), 'i': sp.I, '-1': sp.Integer(-1), '-i': -sp.I}[phase]
    return _clean(sp.Matrix([[c, -s], [s, c]]) * sp.diag(1, z))


def _pair_view(canonical):
    rows = json.loads(canonical.pairs_json)
    product = json.loads(canonical.reply_json)['productBasis']
    for pair in rows:
        mu = pair['mu']
        pair['I'] = _scalar(sp.Rational(pair['twoI'], 2))
        for label, column in (('s', mu), ('a', 8+mu)):
            vector = canonical.embedding[:, column]
            side = pair[label]
            side['vector'] = _matrix(vector)
            side['amplitudeMatrix'] = _matrix(sp.Matrix(8, 8, list(vector)))
            side['terms'] = [{'productIndex': i,
                'leftIndex': product[i]['leftIndex'],
                'rightIndex': product[i]['rightIndex'],
                'label': product[i]['label'], 'coefficient': _scalar(v)}
                for i, v in enumerate(vector) if v != 0]
    return rows


def _counterexample(canonical):
    c8 = canonical.embedding
    pair = next(p for p in json.loads(canonical.pairs_json) if p['mu'] == 3)
    q = sp.eye(16)
    q[pair['mu'], pair['mu']] = -1
    q = sp.ImmutableSparseMatrix(q)
    changed = _clean(c8*q)
    old = _clean(canonical.generators[0]*changed-changed*canonical.target[0])
    old_max = _residual(old)
    if old_max == 0:
        raise ArithmeticError('单列改号反例没有产生预期的 E₁₂ 残差')
    generators = []
    for name, total, target in zip(OP_IDS, canonical.generators, canonical.target):
        transformed = _clean(q.H*target*q)
        repaired = _residual(total*changed-changed*transformed)
        if repaired != 0:
            raise ArithmeticError('一致变换目标生成元后交织关系未恢复')
        generators.append({'id': name, 'transformed': _matrix(transformed),
            'oldResidual': _scalar(_residual(total*changed-changed*target)),
            'repairedResidual': _scalar(repaired)})
    return {'mu': pair['mu'], 'pattern': pair['pattern'],
        'canonicalColumn': pair['s']['canonicalColumn'], 'Q': _matrix(q),
        'embedding': _matrix(changed),
        'orthogonalityResidual': _scalar(_residual(changed.H*changed-sp.eye(16))),
        'projectorResidual': _scalar(_residual(changed*changed.H-canonical.projector)),
        'oldE12Residual': _sparse(old), 'oldE12MaxAbs': _scalar(old_max),
        'generators': generators,
        'notes': ['只把 μ=3 的对称八重态列改号，仍得到合法的正交基和相同的八重态等型子空间。',
            f'继续使用旧标准 GT 生成元时，E₁₂ 的最大逐项交织残差为 {old_max}；错误在于基底与生成元约定不一致。',
            '同时使用 D′=Q†DQ 后，全部八个生成元的交织残差精确为零。']}


@lru_cache(maxsize=1)
def _static_json():
    canonical = _canonical()
    return json.dumps({'pairs': _pair_view(canonical),
        'counterexample': _counterexample(canonical)}, ensure_ascii=False,
        separators=(',', ':'))


@lru_cache(maxsize=12)
def _result_json(angle, phase):
    canonical = _canonical()
    c8 = canonical.embedding
    r = _rotation(angle, phase)
    u = sp.ImmutableSparseMatrix(sp.kronecker_product(r, sp.eye(8)))
    changed = _clean(c8*u)
    p = sp.ImmutableSparseMatrix(sp.diag(*([1]*8+[-1]*8)))
    pprime = _clean(u.H*p*u)
    ppair = _clean(r.H*sp.diag(1, -1)*r)
    b = sp.ImmutableSparseMatrix(sp.Matrix.vstack(sp.eye(8), sp.zeros(8)))
    bprime = _clean(u.H*b)
    physical = _clean(c8*b)
    reconstructed = _clean(changed*bprime)
    changed_projector = _clean(changed*changed.H)
    checks = []

    def check(name, residual):
        value = _residual(residual)
        if value != 0:
            raise ArithmeticError(f'精确教学检验未通过：{name}')
        checks.append({'id': name, 'passed': True, 'residual': _scalar(value)})

    check('RUnitary', r.H*r-sp.eye(2))
    check('UUnitaryAll16', u.H*u-sp.eye(16))
    check('canonicalOrthogonalityAll16', c8.H*c8-sp.eye(16))
    check('crossOctetOrthogonalityAll8', c8[:, :8].H*c8[:, 8:])
    check('canonicalExchangeAll16', canonical.swap*c8-c8*p)
    check('rotatedOrthogonalityAll16', changed.H*changed-sp.eye(16))
    check('projectorInvariant64x64', changed_projector-canonical.projector)
    check('projectorIdempotent64x64', canonical.projector**2-canonical.projector)
    check('exchangeAll16', canonical.swap*changed-changed*pprime)
    check('fixedPhysicalStatesAll8', reconstructed-physical)
    check('fixedNormsAll8', bprime.H*bprime-sp.eye(8))
    check('fixedExchangeExpectationsAll8', bprime.H*pprime*bprime-sp.eye(8))
    generators = []
    for name, total, target in zip(OP_IDS, canonical.generators, canonical.target):
        canonical_residual = _residual(total*c8-c8*target)
        changed_residual = _residual(total*changed-changed*target)
        target_residual = _residual(u.H*target*u-target)
        check('canonicalIntertwiner.'+name, total*c8-c8*target)
        check('rotatedIntertwiner.'+name, total*changed-changed*target)
        check('standardGeneratorUnchanged.'+name, u.H*target*u-target)
        generators.append({'id': name, 'standard': _matrix(target),
            'canonicalResidual': _scalar(canonical_residual),
            'rotatedResidual': _scalar(changed_residual),
            'standardUnchangedResidual': _scalar(target_residual)})
    states = []
    for mu in range(8):
        state = physical[:, mu]
        before = _simp((b[:, mu].H*b[:, mu])[0])
        after = _simp((bprime[:, mu].H*bprime[:, mu])[0])
        probabilities = [_simp((bprime[start:start+8, mu].H*bprime[start:start+8, mu])[0]/after)
                         for start in (0, 8)]
        plus = _simp((state.H*canonical.plus*state)[0]/before)
        minus = _simp((state.H*canonical.minus*state)[0]/before)
        states.append({'mu': mu, 'coordinates': _matrix(bprime[[mu, 8+mu], [mu]]),
            'normBefore': _scalar(before), 'normAfter': _scalar(after),
            'swapExpectation': _scalar(_simp((bprime[:, mu].H*pprime*bprime[:, mu])[0]/after)),
            'newCopyProbabilities': [_scalar(v) for v in probabilities],
            'physicalSwapProbabilities': {'plus': _scalar(plus), 'minus': _scalar(minus)}})
    static = json.loads(_static_json())
    reply = json.loads(canonical.reply_json)
    digest = hashlib.sha256(canonical.reply_json.encode('utf8')).hexdigest()
    coord = states[3]['coordinates']['exact']
    probs = [v['exact'] for v in states[3]['newCopyProbabilities']]
    counter = static['counterexample']
    zero_labels = '；'.join(
        f'μ={pair["mu"]}、GT[{pair["pattern"][0]},{pair["pattern"][1]};{pair["pattern"][2]}]、I={pair["I"]["exact"]}'
        for pair in static['pairs'] if pair['weight'] == [0, 0])
    result = {'schema': SCHEMA, 'lab': 'su3_copy',
        'title': 'SU(3) 八重态副本：真实 CG 嵌入与一致换基',
        'request': {'lab': 'su3_copy', 'angle': angle, 'phase': phase},
        'canonical': {'request': json.loads(canonical.request_json), 'reply': reply,
                      'serialization': 'python-json-utf8-sorted-v1',
                      'serialized': canonical.reply_json, 'sha256': digest},
        'dimensions': {'product': 64, 'inner': 8, 'outer': 2, 'isotypic': 16,
                       'zeroWeightPerCopy': 2, 'zeroWeightBothCopies': 4},
        'pairs': static['pairs'], 'canonicalEmbedding': _matrix(c8),
        'rotation': {'angle': angle, 'phase': phase,
            'order': 'R=Rθ diag(1,ζ); U=R⊗I8; C8′=C8U',
            'R': _matrix(r), 'U': _matrix(u), 'embedding': _matrix(changed),
            'exchangeCanonical': _matrix(p), 'exchange': _matrix(pprime),
            'exchangePair': _matrix(ppair)},
        'fixed': {'description': '固定全部八个原 |8s,μ⟩ 物理态；每列对应一个 μ，换基不改变态。',
            'b': _matrix(b), 'bPrime': _matrix(bprime),
            'productStates': _matrix(physical), 'reconstructed': _matrix(reconstructed),
            'states': states},
        'projector': {'dimension': 64, 'rank': 16,
            'canonical': _sparse(canonical.projector), 'transformed': _sparse(changed_projector)},
        'checks': checks, 'generators': generators, 'counterexample': counter,
        'steps': [
            {'stage': 1, 'title': '完整标签先于权坐标',
             'text': f'两个零权内部态为 {zero_labels}；每个内部态都有 s/a 两份嵌入，共四条不同列。'},
            {'stage': 2, 'title': '把真实列放回乘积空间',
             'text': '全部八个 μ 的两条 64 维嵌入已按完整 GT 标签配对；8×8 幅度矩阵满足 A_sᵀ=A_s、A_aᵀ=−A_a，跨副本内积矩阵精确为零。'},
            {'stage': 3, 'title': '对八个内部态统一换副本基底',
             'text': f'本次 θ={angle}°、ζ={phase}，先取 R=Rθ diag(1,ζ)，再取完整 U=R⊗I8。全部 16 条派生列同时变换，八个标准生成元保持不变。'},
            {'stage': 4, 'title': '固定物理态，同时变换坐标与交换矩阵',
             'text': f'原 |8s,μ⟩ 的新副本坐标为 ({coord[0][0]}, {coord[1][0]})，新坐标概率为 ({probs[0]}, {probs[1]})；物理交换概率仍为 (+1:1, −1:0)。重建、范数、交换期望和 Π8 均精确不变。'},
            {'stage': 5, 'title': '只改一列，再修复生成元约定',
             'text': f'只改 μ=3 的对称列符号后，正交性仍成立；旧 E₁₂ 的最大逐项残差为 {counter["oldE12MaxAbs"]["exact"]}。使用 D′=Q†DQ 后，全部八个交织残差恢复为零。'}],
        'notes': [
            '固定 8⊗8；八重态内部维数为 8，外重数为 2，等型子空间维数为 16。内部同权重数与外重数分别计数。',
            '规范 CG 回包及原请求完整保存在 canonical；派生列保存在 rotation，不改变旧规范、列序、相位或缓存。',
            '新副本 α′ 通常不再是交换宇称本征基；新的坐标分量概率不能直接解释为物理 s/a 概率。',
            '这是固定态的被动换基，不是时间演化或跃迁；交换期望必须用同时变换后的 P′ 计算。',
            '只支持列明的三个角和四个相位；选择 μ 只浏览已完整返回的数据，不接受任意符号表达式。',
            '两个因子有标号；CG 系数不直接给出能谱、速率、约化矩阵元或真实同粒子的全部统计约束。'],
        'sources': deepcopy(reply['sources'])}
    # Cache only immutable serialized bytes/text, never a mutable public result.
    return json.dumps(result, ensure_ascii=False, separators=(',', ':'))


def run(payload):
    if not isinstance(payload, dict) or set(payload)-{'lab', 'angle', 'phase'}:
        raise ValueError('八重态副本工坊只接受 lab、angle、phase 字段')
    if payload.get('lab') != 'su3_copy':
        raise ValueError('此接口要求 lab=su3_copy')
    angle, phase = payload.get('angle', 45), payload.get('phase', '1')
    if type(angle) is not int or angle not in (0, 45, 90):
        raise ValueError('angle 必须是整数 0、45 或 90')
    if not isinstance(phase, str) or phase not in ('1', 'i', '-1', '-i'):
        raise ValueError('phase 必须是 1、i、-1 或 -i 字符串')
    return json.loads(_result_json(angle, phase))
