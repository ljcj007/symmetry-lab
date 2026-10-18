"""Build a compact teaching index from the site's attributed BC databases.

No structure, Wyckoff position or representation is inferred from a symbol.
The original database is used when a learner opens the calculation workbench.
"""
from collections import Counter
from fractions import Fraction
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYSTEMS = [('三斜', 1, 2), ('单斜', 3, 15), ('正交', 16, 74),
           ('四方', 75, 142), ('三方', 143, 167), ('六方', 168, 194),
           ('立方', 195, 230)]


def read(name):
    return json.loads((ROOT / 'dist/data' / name).read_text(encoding='utf8'))


def system(number):
    return next(label for label, lo, hi in SYSTEMS if lo <= number <= hi)


def fractional(operation):
    return any(abs(float(x) - round(float(x))) > 1e-9 for x in operation['translation'])


def build():
    ordinary = read('space-groups.json')['groups']
    magnetic = read('magnetic-groups.json')['groups']
    points = read('points.json')['points']
    groups = []
    for g in ordinary:
        # Keep a compact illustration; it is explicitly not the complete group.
        operations = g['operations']
        candidates = [op for op in operations if fractional(op)] + operations
        seen, examples = set(), []
        for op in candidates:
            key = json.dumps([op['rotation'], op['translation']])
            if key in seen:
                continue
            seen.add(key)
            examples.append({'name': op['name'], 'rotation': op['rotation'],
                             'translation': [str(Fraction(float(x)).limit_denominator(96)) for x in op['translation']],
                             'antiunitary': False})
            if len(examples) == 4:
                break
        groups.append({'number': g['number'], 'symbol': g['symbol'],
                       'bcSymbol': g['bcSymbol'], 'system': system(g['number']),
                       'lattice': g['lattice'], 'pointGroup': g['pointGroup'],
                       'pointGroupNumber': g['pointGroupNumber'], 'order': len(operations),
                       'generatorCount': len(g['generators']),
                       'hasFractionalTranslations': any(map(fractional, operations)),
                       'examples': examples})
    messages = []
    for g in magnetic:
        unitary = sum(not op['antiunitary'] for op in g['operations'])
        messages.append({**{key: g[key] for key in ('id', 'symbol', 'type', 'family', 'ogId', 'ogSymbol')},
                         'unitarySpaceGroup': g['unitarySG'], 'system': system(g['family']),
                         'order': len(g['operations']), 'unitaryOrder': unitary,
                         'antiunitaryOrder': len(g['operations']) - unitary})
    point_rows = [{**{key: g[key] for key in ('id', 'symbol', 'type', 'order', 'unitaryPointGroup')},
                   'representativeMSG': '.'.join(map(str, g['representativeMSG']))} for g in points]
    source_files = ['space-groups.json', 'magnetic-groups.json', 'points.json']
    result = {
        'schemaVersion': 1,
        'title': '空间群、双群与磁群教学索引',
        'conventions': [
            '空间群本身无限；order 表示按本站 BC 原胞平移取商后的代表操作数。',
            '示例矩阵作用于 BC 原胞分数坐标列向量，未指定度量时不能当作正交笛卡尔矩阵。',
            '含分数平移的代表操作不构成 symmorphic / nonsymmorphic 分类判据；它依赖原点和代表元选择。',
            '磁群 BNS 首段在 I–III 型对应颜色抹去群 F，IV 型对应幺正子群 D 的普通空间群类型。',
            '全部 230 空间群均可进入单值或自旋双值表示工作台；双群不是磁群，也不是重复每个不可约表示。',
            '这里只提供教学索引与操作示例；Wyckoff 字母、任意磁结构判定与完整相图不由本索引推断。'],
        'systems': [{'id': label, 'title': label, 'range': [lo, hi],
                     'spaceGroupCount': hi - lo + 1} for label, lo, hi in SYSTEMS],
        'spaceGroups': groups, 'magneticGroups': messages, 'magneticPointGroups': point_rows,
        'sources': [
            {'title': 'SpaceGroupIrep', 'url': 'https://github.com/goodluck1982/SpaceGroupIrep'},
            {'title': 'MSGCorep', 'url': 'https://github.com/goodluck1982/MSGCorep'},
            {'title': 'IUCr magnetic group tables', 'url': 'https://www.iucr.org/what-we-do/publications/books/Magnetic-Group-Tables'},
            {'title': 'IUCr BNS numbering definition', 'url': 'https://www.iucr.org/__data/iucr/cifdic_html/3_orig/MAGNETIC_CIF/Ispace_group_magn.number_BNS.html'},
            {'title': 'Double crystallographic groups and their representations', 'url': 'https://arxiv.org/abs/1706.09272'}],
        'sourceFiles': {name: hashlib.sha256((ROOT / 'dist/data' / name).read_bytes()).hexdigest() for name in source_files},
        'validation': {'spaceGroupCount': len(groups), 'magneticGroupCount': len(messages),
                       'magneticPointGroupCount': len(point_rows),
                       'systemCounts': dict(Counter(g['system'] for g in groups)),
                       'magneticTypeCounts': dict(sorted(Counter(g['type'] for g in messages).items())),
                       'magneticPointTypeCounts': dict(sorted(Counter(g['type'] for g in point_rows).items()))}}
    assert len(groups) == 230 and len(messages) == 1651 and len(point_rows) == 122
    assert result['validation']['magneticTypeCounts'] == {1: 230, 2: 230, 3: 674, 4: 517}
    return result


if __name__ == '__main__':
    result = build()
    path = ROOT / 'dist/data/symmetry-course-atlas.json'
    path.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8', newline='\n')
    print('Built teaching atlas:', len(result['spaceGroups']), len(result['magneticGroups']), len(result['magneticPointGroups']))
