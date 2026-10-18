"""Build the 32-point-group teaching atlas from verified local BC data.

Run from any directory with Python, NumPy and SymPy. No network is used.
The tables are ordinary complex irreducible representations; conjugate pairs
are identified explicitly instead of calling their separate rows 2D irreps.
"""
from __future__ import annotations

import functools
import gzip
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import sympy as sp

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist/python'))
import standard_labels
import symmetry_core

GROUPS = [
    ('1', 'C1', 1), ('-1', 'Ci', 2),
    ('2', 'C2', 3), ('m', 'Cs', 6), ('2/m', 'C2h', 10),
    ('222', 'D2', 16), ('mm2', 'C2v', 25), ('mmm', 'D2h', 47),
    ('4', 'C4', 75), ('-4', 'S4', 81), ('4/m', 'C4h', 83),
    ('422', 'D4', 89), ('4mm', 'C4v', 99), ('-42m', 'D2d', 111),
    ('4/mmm', 'D4h', 123),
    ('3', 'C3', 143), ('-3', 'S6', 147), ('32', 'D3', 149),
    ('3m', 'C3v', 156), ('-3m', 'D3d', 162),
    ('6', 'C6', 168), ('-6', 'C3h', 174), ('6/m', 'C6h', 175),
    ('622', 'D6', 177), ('6mm', 'C6v', 183), ('-6m2', 'D3h', 187),
    ('6/mmm', 'D6h', 191),
    ('23', 'T', 195), ('m-3', 'Th', 200), ('432', 'O', 207),
    ('-43m', 'Td', 215), ('m-3m', 'Oh', 221),
]
SYSTEMS = [('三斜', 2), ('单斜', 3), ('正交', 3), ('四方', 7),
           ('三方', 5), ('六方', 7), ('立方', 5)]


def clean(value):
    value = float(value)
    return 0.0 if abs(value) < 1e-10 else round(value, 12)


def complex_json(value):
    return {'re': clean(value.real), 'im': clean(value.imag)}


@functools.lru_cache(None)
def scalar(value):
    if abs(value) < 1e-9:
        return sp.S.Zero
    return sp.nsimplify(value, [sp.sqrt(3)], tolerance=1e-9, full=False)


def exact_matrix(matrix):
    return sp.Matrix([[scalar(round(float(z.real), 10)) + sp.I *
                       scalar(round(float(z.imag), 10)) for z in row] for row in matrix])


def polynomial_representation(matrices):
    """Action f(x) -> f(R^-1 x), in x²,y²,z²,xy,xz,yz order."""
    tensors = []
    for i, j in ((0, 0), (1, 1), (2, 2), (0, 1), (0, 2), (1, 2)):
        tensor = np.zeros((3, 3))
        tensor[i, j] = tensor[j, i] = 1 if i == j else .5
        tensors.append(tensor)
    result = []
    for rotation in matrices:
        columns = []
        for tensor in tensors:
            t = rotation @ tensor @ rotation.T
            columns.append([t[0, 0], t[1, 1], t[2, 2],
                            2*t[0, 1], 2*t[0, 2], 2*t[1, 2]])
        result.append(np.array(columns).T)
    return np.array(result)


def basis_for(representation, characters, dimension, names):
    projector = dimension / len(characters) * np.einsum(
        'g,gij->ij', characters.conjugate(), representation)
    vectors = exact_matrix(projector).columnspace()
    expressions, coefficients = [], []
    for vector in vectors:
        vector = sp.simplify(vector / next(x for x in vector if x != 0))
        expression = sp.expand(sum(a*b for a, b in zip(vector, names)))
        text = sp.sstr(expression).replace('**', '^').replace('sqrt(3)', '√3').replace('I', 'i')
        expressions.append(text)
        coefficients.append([complex_json(complex(x)) for x in vector])
    return expressions, coefficients


def multiplication(rotations):
    by_key = {tuple(r.astype(int).flat): i for i, r in enumerate(rotations)}
    return np.array([[by_key[tuple((a @ b).astype(int).flat)] for b in rotations]
                     for a in rotations], dtype=int)


def conjugacy_classes(table, identity):
    inverses = [next(j for j in range(len(table)) if table[i, j] == identity)
                for i in range(len(table))]
    result, seen = [], set()
    for g in range(len(table)):
        if g in seen:
            continue
        members = sorted({int(table[table[h, g], inverses[h]]) for h in range(len(table))})
        seen.update(members)
        result.append(members)
    return result


def operation_order(index, table, identity):
    current = identity
    for count in range(1, len(table) + 1):
        current = table[current, index]
        if current == identity:
            return count
    raise ValueError('Operation has no finite order')


def build_group(group_id, specification, system, database, label_database):
    hm, schoenflies, sg = specification
    source = database['groups'][sg - 1]
    assert source['pointGroupNumber'] == group_id and source['pointGroup'] == schoenflies
    raw_operations = source['operations']
    rotations = np.array([operation['rotation'] for operation in raw_operations], dtype=int)
    order = len(rotations)
    assert all(np.linalg.norm(op['translation']) < 1e-10 for op in raw_operations)
    lattice_columns = np.array(source['basis']).T
    matrices = np.array([lattice_columns @ r @ np.linalg.inv(lattice_columns) for r in rotations])
    assert max(np.max(abs(r.T @ r - np.eye(3))) for r in matrices) < 1e-9
    determinants = np.rint(np.linalg.det(matrices)).astype(int)
    table = multiplication(rotations)
    identity = next(i for i, r in enumerate(rotations) if np.array_equal(r, np.eye(3)))
    class_members = conjugacy_classes(table, identity)
    classes = [{'label': raw_operations[c[0]]['name'], 'size': len(c), 'operationIndices': c}
               for c in class_members]
    class_indices = [c[0] for c in class_members]
    class_sizes = np.array([len(c) for c in class_members])
    label_table = standard_labels.run({'action': 'table', 'group_number': sg,
                                       'k_label': 'Gamma'}, database, label_database)['tables'][0]
    label_by_rotation = {tuple(np.array(op['rotation']).flat): i
                         for i, op in enumerate(label_table['operations'])}
    reorder = [label_by_rotation[tuple(r.flat)] for r in rotations]
    label_rows = label_table['mapped_irreps']
    characters = np.array([[complex(standard_labels._expr(row['characters'][i]))
                            for i in reorder] for row in label_rows])
    numeric = symmetry_core.analyze_group({'operations': raw_operations,
                                          'k': [0, 0, 0], 'includeMatrices': False})
    numeric_characters = np.array([[complex(z['re'], z['im']) for z in row['characters']]
                                   for row in numeric['irreps']])
    overlaps = abs(characters.conjugate() @ numeric_characters.T / order)
    assert np.all(np.sum(overlaps > 1-1e-7, axis=0) == 1)
    assert np.all(np.sum(overlaps > 1-1e-7, axis=1) == 1)
    orthogonality_error = float(np.max(abs(characters.conjugate() @ characters.T / order -
                                          np.eye(len(characters)))))
    assert orthogonality_error < 1e-9
    x, y, z = sp.symbols('x y z')
    rx, ry, rz = sp.symbols('Rx Ry Rz')
    representations = {'vector': matrices, 'axial': determinants[:, None, None] * matrices,
                       'quadratic': polynomial_representation(matrices)}
    basis_names = {'vector': [x, y, z], 'axial': [rx, ry, rz],
                   'quadratic': [x*x, y*y, z*z, x*y, x*z, y*z]}
    irreps = []
    for index, row in enumerate(label_rows):
        chars = characters[index]
        conjugate_index = next(i for i, values in enumerate(characters)
                               if np.max(abs(values - chars.conjugate())) < 1e-9)
        fs = np.sum(chars[[table[g, g] for g in range(order)]]) / order
        assert abs(fs.imag) < 1e-9 and abs(fs.real - round(fs.real)) < 1e-9
        item = {'label': row['bc_label'], 'bcLabel': row['bc_label'],
                'mulliken': row.get('mulliken'),
                'mullikenSourceToken': row.get('mulliken_source_token'),
                'bilbaoLabel': row.get('bilbao_label'), 'dimension': row['dimension'],
                'characters': [complex_json(chars[i]) for i in class_indices],
                'charactersExact': [row['characters'][reorder[i]] for i in class_indices],
                'frobeniusSchur': round(fs.real),
                'conjugateLabel': label_rows[conjugate_index]['bc_label'],
                'physicalPair': ([row['bc_label'], label_rows[conjugate_index]['bc_label']]
                                 if conjugate_index != index else []),
                'basis': {}, 'basisCoefficients': {}}
        for name, representation in representations.items():
            multiplicity = np.vdot(chars, np.trace(representation, axis1=1, axis2=2)) / order
            assert abs(multiplicity.imag) < 1e-8 and abs(multiplicity.real-round(multiplicity.real)) < 1e-8
            item[name + 'Multiplicity'] = round(multiplicity.real)
            expressions, coefficients = basis_for(representation, chars, row['dimension'], basis_names[name])
            assert len(expressions) == item[name + 'Multiplicity'] * row['dimension']
            item['basis'][name], item['basisCoefficients'][name] = expressions, coefficients
        item['irActive'] = item['vectorMultiplicity'] > 0
        item['ramanActive'] = item['quadraticMultiplicity'] > 0
        irreps.append(item)
    polar_dimension = round(float(np.trace(np.mean(matrices, axis=0))))
    centrosymmetric = any(np.max(abs(r + np.eye(3))) < 1e-9 for r in matrices)
    chiral = bool(np.all(determinants == 1))
    properties = ['含反演中心' if centrosymmetric else '无反演中心',
                  '允许不变极向量' if polar_dimension else '不允许非零不变极向量',
                  '仅含正旋转' if chiral else '含反向操作']
    return {'id': group_id, 'hm': hm, 'schoenflies': schoenflies, 'system': system,
            'order': order, 'representativeSG': sg, 'representativeSGSymbol': source['symbol'],
            'centrosymmetric': centrosymmetric, 'polar': polar_dimension > 0,
            'polarDimension': polar_dimension, 'chiral': chiral,
            'summary': f'{system}晶系，群阶 {order}；' + '，'.join(properties) + '。',
            'coordinateConvention': '正交笛卡尔轴沿原始 BC 设置；x_cart = basisᵀ x_fractional。' +
                                   ('本表单斜主轴沿 z，镜面 m 为 xy 面。' if system == '单斜' else ''),
            'sourceBasis': source['basis'],
            'generators': [next(i for i, op in enumerate(raw_operations) if op['name'] == generator[0])
                           for generator in source['generators']],
            'operations': [{'label': op['name'], 'matrix': [[clean(x) for x in row] for row in matrix],
                            'fractionalMatrix': op['rotation'], 'det': int(determinants[i]),
                            'order': operation_order(i, table, identity)}
                           for i, (op, matrix) in enumerate(zip(raw_operations, matrices))],
            'classes': classes, 'irreps': irreps,
            'characterOrthogonalityError': orthogonality_error,
            'numericalCharacterMatchError': float(np.max(np.minimum(overlaps, abs(overlaps-1))))}


def build():
    database_path = ROOT / 'dist/data/space-groups.json'
    database = json.loads(database_path.read_text(encoding='utf-8'))
    label_database = {kind: json.loads(gzip.decompress((ROOT / f'dist/data/labels/{kind}-labels.json.gz').read_bytes()))
                      for kind in ('bc', 'bilbao')}
    systems = [name for name, count in SYSTEMS for _ in range(count)]
    groups = [build_group(i+1, specification, systems[i], database, label_database)
              for i, specification in enumerate(GROUPS)]
    return {
        'schemaVersion': 1,
        'title': '32 个晶体学点群：操作、特征标与选择定则',
        'conventions': [
            '群阶与表格均针对普通单值点群；不含自旋双群或磁点群。',
            'Γ 编号采用代表性点式（symmorphic）空间群的 BC Γ 点标准标签；Mulliken 作为同一行的别名。',
            '复不可约表示分行显示。Frobenius–Schur 指标 0 的共轭行应成对组成实物理表示；不能把每行误读为二维表示。',
            'IR 为极向量 (x,y,z) 中出现的对称类型；Raman 为非共振电偶极近似下对称二阶张量中的类型，不保证具体材料有该振动或非零强度。',
            'basis 给出对应等型子空间的一组基；若重数大于 1，不声称每个列出的函数分别属于不同副本。',
            '基函数采用主动操作 f(r) → f(R⁻¹r)。轴向量另乘 det(R)；因此复函数 x±iy 的标签与该操作约定一致。',
            '正交轴沿 BC 设置，未强制改为教材的单斜 b 轴约定；操作矩阵与基函数采用同一坐标。',
        ],
        'sources': [
            {'title': 'SpaceGroupIrep 本地固定版本：操作、BC Γ 特征标与 Mulliken 别名',
             'url': 'https://github.com/goodluck1982/SpaceGroupIrep',
             'commit': database['source']['commit'],
             'databaseSha256': hashlib.sha256(database_path.read_bytes()).hexdigest(),
             'bcLabelsSha256': hashlib.sha256((ROOT / 'dist/data/labels/bc-labels.json.gz').read_bytes()).hexdigest()},
            {'title': 'Bilbao Point Group Tables：特征标、IR 与 Raman 选择定则',
             'url': 'https://www.cryst.ehu.es/rep/point'},
            {'title': 'IUCr：Crystallographic shelves: space-group hierarchy explained',
             'url': 'https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html'},
        ],
        'groups': groups,
        'validation': {
            'groupCount': len(groups), 'systemCounts': dict(SYSTEMS),
            'centrosymmetricCount': sum(g['centrosymmetric'] for g in groups),
            'polarCount': sum(g['polar'] for g in groups),
            'chiralCount': sum(g['chiral'] for g in groups),
            'irrepCount': sum(len(g['irreps']) for g in groups),
            'maxCharacterOrthogonalityError': max(g['characterOrthogonalityError'] for g in groups),
            'method': 'BC 精确源表与独立数值正则表示逐行匹配；验证群闭合、特征标正交、维数平方和、极/轴向量及对称平方分解。',
        },
    }


if __name__ == '__main__':
    output = ROOT / 'dist/data/pointgroup-atlas.json'
    result = build()
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Built {len(result["groups"])} groups, {result["validation"]["irrepCount"]} irreps; {output.stat().st_size} bytes')
