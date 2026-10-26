"""Read bounded Phonopy outputs, preserving their phase and unit conventions.

No force constants are fitted and no frequencies or missing eigenvectors are
invented.  Animation is a mass-unweighted, amplitude-normalised visualisation
of one input eigenvector, not a thermal trajectory or motion of an unstable
mode.  The only non-standard-library dependency is PyYAML (safe loading).
"""
import cmath
import itertools
import json
import math


MAX_BYTES = 8 * 1024 * 1024
MAX_NODES = 400000
MAX_DEPTH = 32
MAX_ATOMS = 128
MAX_QPOINTS = 2000
MAX_MODE_POINTS = 60000
MAX_DISPLAY_ATOMS = 512
MAX_DOS_ROWS = 20000
SOURCES = [
    {'title': 'Phonopy: output files and eigenvector format',
     'url': 'https://phonopy.github.io/phonopy/output-files.html'},
    {'title': 'Phonopy: dynamical matrix and displacement phase convention',
     'url': 'https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix'},
    {'title': 'Phonopy: phonopy-yaml structure format',
     'url': 'https://phonopy.github.io/phonopy/phonopy-yaml.html'},
]


def _number(value, name, low=-1e12, high=1e12):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not low <= value <= high or not math.isfinite(value)):
        raise ValueError(f'{name} 必须为 {low:g} 至 {high:g} 范围内的有限实数')
    return float(value)


def _integer(value, name, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f'{name} 必须为 {low} 至 {high} 的整数')
    return value


def _list(value, name, length=None):
    if not isinstance(value, list) or (length is not None and len(value) != length):
        suffix = f'，长度须为 {length}' if length is not None else ''
        raise ValueError(f'{name} 必须是列表{suffix}')
    return value


def _vector(value, name):
    return [_number(x, name) for x in _list(value, name, 3)]


def _text(value, name, limit=160):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f'{name} 必须是长度不超过 {limit} 的文本')
    return value


def _provided(payload, key):
    value = payload.get(key)
    return value is not None and (not isinstance(value, str) or bool(value.strip()))


def _bounded_tree(value):
    """Also validate data supplied as a Python/JSON object, rejecting cycles."""
    nodes = 0
    active = set()

    def visit(item, depth):
        nonlocal nodes
        nodes += 1
        if nodes > MAX_NODES or depth > MAX_DEPTH:
            raise ValueError('输入数据节点或嵌套层数超过浏览器导入限制')
        if isinstance(item, (dict, list)):
            if id(item) in active:
                raise ValueError('输入不允许循环引用')
            active.add(id(item))
            if isinstance(item, dict):
                for key, child in item.items():
                    if not isinstance(key, str):
                        raise ValueError('输入对象的键必须为文本')
                    visit(key, depth + 1)
                    visit(child, depth + 1)
            else:
                for child in item:
                    visit(child, depth + 1)
            active.remove(id(item))
        elif isinstance(item, float) and not math.isfinite(item):
            raise ValueError('输入包含 NaN 或 Infinity，须提供有限数值')
        elif not isinstance(item, (str, int, float, bool, type(None))):
            raise ValueError('只支持 JSON 基本类型；不支持日期或自定义 YAML 对象')

    visit(value, 0)


def _parse(payload):
    if 'data' in payload:
        data = payload['data']
        _bounded_tree(data)
        try:
            encoded = json.dumps(data, ensure_ascii=False, allow_nan=False)
        except (TypeError, ValueError) as exc:
            raise ValueError('data 必须是可序列化的 JSON 数据') from exc
        if len(encoded.encode('utf-8')) > MAX_BYTES:
            raise ValueError('输入文件超过 8 MiB，请缩小 q 点或本征矢数据范围')
    else:
        content = payload.get('content', '')
        if not isinstance(content, str) or not content.strip():
            raise ValueError('请提供 band.yaml、qpoints.yaml 或同结构 JSON 文件内容')
        if len(content.encode('utf-8')) > MAX_BYTES:
            raise ValueError('输入文件超过 8 MiB，请缩小 q 点或本征矢数据范围')
        if content.lstrip().startswith(('{', '[')):
            try:
                data = json.loads(content)
            except (ValueError, RecursionError) as exc:
                raise ValueError('JSON 格式无效或嵌套过深') from exc
        else:
            try:
                import yaml
            except ImportError as exc:
                raise ValueError('YAML 解析需要 PyYAML；可改用同结构 JSON') from exc
            try:
                # Bound the event stream before constructing Python objects.
                count, depth = 0, 0
                for event in yaml.parse(content, Loader=yaml.SafeLoader):
                    count += 1
                    if isinstance(event, yaml.events.AliasEvent):
                        raise ValueError('为避免递归展开，不接受 YAML 别名或锚点引用')
                    if isinstance(event, (yaml.events.SequenceStartEvent, yaml.events.MappingStartEvent)):
                        depth += 1
                    if count > MAX_NODES or depth > MAX_DEPTH:
                        raise ValueError('YAML 节点或嵌套层数超过浏览器导入限制')
                    if isinstance(event, (yaml.events.SequenceEndEvent, yaml.events.MappingEndEvent)):
                        depth -= 1
                data = yaml.safe_load(content)
            except yaml.YAMLError as exc:
                raise ValueError('YAML 格式无效；只允许安全的普通数据类型') from exc
        _bounded_tree(data)
    if not isinstance(data, dict):
        raise ValueError('Phonopy 文件根节点必须是对象')
    return data


def _det(a):
    return (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
            - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
            + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))


def _structure(data, warnings):
    cell = data
    cell_kind = 'root'
    if not any(key in data for key in ('lattice', 'points', 'atoms')):
        for key in ('primitive_cell', 'unit_cell', 'supercell'):
            if key in data:
                if not isinstance(data[key], dict):
                    raise ValueError(f'{key} 必须是晶胞对象')
                cell, cell_kind = data[key], key
                break
    lattice = None
    if 'lattice' in cell:
        lattice = [_vector(row, 'lattice') for row in _list(cell['lattice'], 'lattice', 3)]
        if abs(_det(lattice)) < 1e-12:
            raise ValueError('lattice 晶格矩阵奇异，不能定义三维晶胞')
    raw_atoms = cell.get('points', cell.get('atoms', []))
    _list(raw_atoms, 'points')
    if len(raw_atoms) > MAX_ATOMS:
        raise ValueError(f'原胞原子数不能超过 {MAX_ATOMS}')
    atoms = []
    for index, atom in enumerate(raw_atoms):
        if not isinstance(atom, dict):
            raise ValueError('points 中每个原子必须是对象')
        coordinates = atom.get('coordinates', atom.get('position'))
        atoms.append({
            'index': index,
            'symbol': _text(atom.get('symbol', f'Atom {index + 1}'), 'symbol', 40),
            'coordinates': _vector(coordinates, '原子分数坐标') if coordinates is not None else None,
            'mass': _number(atom['mass'], 'mass', 1e-9, 1e9) if 'mass' in atom else None,
        })
    natom = data.get('natom', cell.get('natom'))
    if natom is None and atoms:
        natom = len(atoms)
    if natom is not None:
        _integer(natom, 'natom', 1, MAX_ATOMS)
        if atoms and len(atoms) != natom:
            raise ValueError('natom 与 points 原子数不一致；不能混用原胞与常规晶胞')
    units = data.get('physical_unit', {})
    length_unit = units.get('length', '输入晶格单位') if isinstance(units, dict) else '输入晶格单位'
    _text(length_unit, 'length unit', 50)
    if cell_kind == 'supercell':
        warnings.append('文件只有 supercell：仅展示此超胞结构，不能据此匹配原胞声子本征矢。')
    return {'natom': natom, 'lattice': lattice, 'atoms': atoms,
            'cellKind': cell_kind, 'lengthUnit': length_unit}


def _eigenvector(value, natom, name):
    atoms = _list(value, name, natom)
    return [[[_number(x, name) for x in _list(component, name, 2)]
             for component in _list(atom, name, 3)] for atom in atoms]


def _supplement_structure(data, structure, payload, warnings):
    if not _provided(payload, 'structure_content') and not _provided(payload, 'structure_data'):
        return structure
    companion = _parse({'data': payload['structure_data']} if _provided(payload, 'structure_data')
                       else {'content': payload['structure_content']})
    extra = _structure(companion, warnings)
    if extra['cellKind'] == 'supercell' or not extra['atoms'] or not extra['lattice']:
        raise ValueError('补充结构必须包含原胞 lattice 与 points；仅有 supercell 不可用于匹配声子本征矢')
    if structure['natom'] is not None and structure['natom'] != extra['natom']:
        raise ValueError('补充结构原子数与声子文件 natom 不一致')
    if structure['lattice'] and any(abs(a - b) > 1e-6 * max(1, abs(a), abs(b))
                                    for row_a, row_b in zip(structure['lattice'], extra['lattice'])
                                    for a, b in zip(row_a, row_b)):
        raise ValueError('补充结构的晶格与声子文件不一致')
    if 'reciprocal_lattice' in data:
        reciprocal = [_vector(row, 'reciprocal_lattice')
                      for row in _list(data['reciprocal_lattice'], 'reciprocal_lattice', 3)]
        if any(abs(sum(extra['lattice'][i][k] * reciprocal[j][k] for k in range(3))
                   - (1 if i == j else 0)) > 1e-5 for i in range(3) for j in range(3)):
            raise ValueError('补充结构与声子文件的 reciprocal_lattice 不匹配（Phonopy 倒易基不含 2π）')
    if structure['atoms']:
        for atom, candidate in zip(structure['atoms'], extra['atoms']):
            if atom['symbol'] != candidate['symbol']:
                raise ValueError('补充结构的原子种类/顺序与声子文件不一致')
            if atom['coordinates'] is not None and candidate['coordinates'] is not None:
                if any(abs((a - b) - round(a - b)) > 1e-6
                       for a, b in zip(atom['coordinates'], candidate['coordinates'])):
                    raise ValueError('补充结构的原子坐标/顺序与声子文件不一致')
            if atom['mass'] is not None and candidate['mass'] is not None:
                if abs(atom['mass'] - candidate['mass']) > 1e-6 * max(1, atom['mass']):
                    raise ValueError('补充结构的原子质量与声子文件不一致')
            for key in ('coordinates', 'mass'):
                if atom[key] is None:
                    atom[key] = candidate[key]
        structure['lattice'] = structure['lattice'] or extra['lattice']
        structure['lengthUnit'] = extra['lengthUnit']
    else:
        structure = extra
    structure['supplemented'] = True
    warnings.append('已使用伴随原胞结构。原子顺序必须与生成声子文件的计算完全一致；原文件未列原子时，程序只能核对原子数和已有倒易晶格。')
    return structure


def _segments(data, qpoints, warnings):
    counts = data.get('segment_nqpoint')
    if counts is None:
        warnings.append('文件未声明 segment_nqpoint：q 点作为独立散点展示，不连接未知路径。')
        return [{'start': i, 'end': i, 'indices': [i], 'labels': [q['label'], q['label']]}
                for i, q in enumerate(qpoints)]
    _list(counts, 'segment_nqpoint')
    if not counts:
        raise ValueError('segment_nqpoint 不能为空')
    for count in counts:
        _integer(count, '每段 q 点数', 1, MAX_QPOINTS)
    if sum(counts) != len(qpoints):
        raise ValueError('segment_nqpoint 总和必须等于 phonon 中的 q 点数')
    labels = data.get('labels')
    if labels is not None:
        _list(labels, 'labels', len(counts))
        labels = [[_text(x, '路径端点标签', 80) for x in _list(pair, 'labels pair', 2)] for pair in labels]
    segments, start = [], 0
    for index, count in enumerate(counts):
        end = start + count - 1
        segment_labels = labels[index] if labels else [qpoints[start]['label'], qpoints[end]['label']]
        for i, label in ((start, segment_labels[0]), (end, segment_labels[1])):
            if label is not None:
                qpoints[i]['label'] = label
        distances = [q['distance'] for q in qpoints[start:end + 1]]
        if all(x is not None for x in distances) and any(b < a - 1e-10 for a, b in zip(distances, distances[1:])):
            raise ValueError('同一路径段内 distance 必须单调不减')
        segments.append({'start': start, 'end': end, 'indices': list(range(start, end + 1)), 'labels': segment_labels})
        start = end + 1
    return segments


def _cartesian(lattice, fractional):
    # Phonopy writes lattice vectors as rows; eigenvectors are Cartesian.
    return [sum(fractional[j] * lattice[j][i] for j in range(3)) for i in range(3)]


def _animation(structure, selected, payload, warnings):
    amplitude = _number(payload.get('amplitude', 0.2), 'amplitude', 0, 2)
    phase = _number(payload.get('phase', 0), 'phase', -1e6, 1e6)
    supercell = _list(payload.get('supercell', [1, 1, 1]), 'supercell', 3)
    supercell = [_integer(x, 'supercell', 1, 4) for x in supercell]
    formula = 'u_j(R,φ) = A Re[(e_j/√m_j) exp(i2π q·(R+r_j) − iφ)] / max_k ||e_k/√m_k||'
    result = {'available': False, 'reason': '', 'formula': formula, 'atoms': [], 'frames': [],
              'supercell': supercell, 'amplitude': amplitude, 'phase': phase,
              'lengthUnit': structure['lengthUnit'], 'commensurate': None,
              'physicalTrajectory': False, 'frameCount': 0}
    if not selected:
        result['reason'] = '文件中没有声子频率与本征矢，不能生成振动动画。'
        return result
    if not selected['eigenvector']:
        result['reason'] = '所选模式缺少 eigenvector；请在 Phonopy 中启用 EIGENVECTORS 再导出。'
        return result
    if not structure['lattice'] or not structure['atoms']:
        result['reason'] = '缺少 lattice 或 points，不能将本征矢放置到真实晶胞中。'
        return result
    if structure['cellKind'] == 'supercell':
        result['reason'] = '仅有 supercell 结构，不能确认原胞原子顺序与本征矢一致。'
        return result
    if any(atom['mass'] is None or atom['coordinates'] is None for atom in structure['atoms']):
        result['reason'] = '原子 mass 或 coordinates 缺失；需要原胞质量和坐标以恢复正确相对位移。'
        return result
    if math.prod(supercell) * structure['natom'] > MAX_DISPLAY_ATOMS:
        result['reason'] = f'展示超胞超过 {MAX_DISPLAY_ATOMS} 个原子，请减小 supercell。'
        return result
    vectors = [[complex(*component) / math.sqrt(atom['mass']) for component in eigen]
               for atom, eigen in zip(structure['atoms'], selected['eigenvector'])]
    norm = max(math.sqrt(sum(abs(x) ** 2 for x in vector)) for vector in vectors)
    if norm < 1e-15:
        result['reason'] = '所选本征矢为零，不能生成位移。'
        return result
    q = selected['q']
    commensurate = all(abs(q[i] * supercell[i] - round(q[i] * supercell[i])) < 1e-7 for i in range(3))
    result['commensurate'] = commensurate
    if not commensurate:
        warnings.append('所选 q 与展示超胞不相容：动画展示无限 Bloch 模的有限窗口，不施加周期边界。')
    if selected['frequency'] < 0:
        warnings.append('负频率是虚频标记；动画只扫过本征矢相位，不代表不稳定模在真实时间中周期振动。')
    elif abs(selected['frequency']) < 1e-8:
        warnings.append('所选模式接近零频；动画相位由滑块驱动，不能据此推断真实振动周期。')
    for cell in itertools.product(*(range(x) for x in supercell)):
        for atom, vector in zip(structure['atoms'], vectors):
            fractional = [cell[i] + atom['coordinates'][i] for i in range(3)]
            spatial = cmath.exp(2j * math.pi * sum(q[i] * fractional[i] for i in range(3)))
            coefficients = [amplitude * x * spatial / norm for x in vector]
            equilibrium = _cartesian(structure['lattice'], fractional)
            displacement = [(x * cmath.exp(-1j * phase)).real for x in coefficients]
            result['atoms'].append({'cell': list(cell), 'atomIndex': atom['index'], 'symbol': atom['symbol'],
                                    'mass': atom['mass'], 'equilibrium': equilibrium,
                                    'displacement': displacement,
                                    'position': [a + b for a, b in zip(equilibrium, displacement)],
                                    'complexDisplacement': [[x.real, x.imag] for x in coefficients]})
    for frame in range(16):
        frame_phase = 2 * math.pi * frame / 16
        result['frames'].append({'phase': frame_phase, 'positions': [
            [base + real * math.cos(frame_phase) + imag * math.sin(frame_phase)
             for base, (real, imag) in zip(atom['equilibrium'], atom['complexDisplacement'])]
            for atom in result['atoms']]})
    result.update(available=True, reason='质量反加权并统一归一化的模式示意；幅度为显示参数，不是热振幅。',
                  frameCount=len(result['frames']), massWeightedInput=True)
    return result


def _dos(content, kind, structure=None):
    if not isinstance(content, str) or not content.strip():
        raise ValueError('DOS 文件内容不能为空')
    if len(content.encode('utf-8')) > MAX_BYTES:
        raise ValueError('DOS 文件超过 8 MiB')
    if kind not in ('total', 'projected', 'xyz'):
        raise ValueError('dos_kind 必须为 total、projected 或 xyz')
    rows, columns = [], None
    for line in content.splitlines():
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        try:
            row = [float(word.replace('D', 'E').replace('d', 'e')) for word in line.split()]
        except ValueError as exc:
            raise ValueError('DOS 仅支持以空格分隔的数值列和 # 注释') from exc
        if len(row) < 2 or len(row) > 3 * MAX_ATOMS + 1:
            raise ValueError('DOS 需要频率列和 1 至 384 个态密度列')
        if columns is None:
            columns = len(row)
        if len(row) != columns:
            raise ValueError('DOS 各行的列数必须一致')
        for number in row:
            _number(number, 'DOS 数值')
        if any(x < -1e-10 for x in row[1:]):
            raise ValueError('DOS 态密度不能为负数；虚频应写在第 1 列')
        if rows and row[0] <= rows[-1][0]:
            raise ValueError('DOS 第 1 列频率必须严格递增')
        rows.append(row)
        if len(rows) > MAX_DOS_ROWS:
            raise ValueError(f'DOS 不能超过 {MAX_DOS_ROWS} 行')
    if not rows:
        raise ValueError('DOS 文件没有数值行')
    natom = structure['natom'] if structure else None
    atoms = structure['atoms'] if structure else []
    if kind == 'total' and columns != 2:
        raise ValueError('total DOS 必须恰有 2 列：频率、总态密度')
    if kind == 'projected' and natom is not None and columns != natom + 1:
        raise ValueError('projected DOS 必须为频率 + 每原胞原子 1 列；XYZ_PROJECTION 请显式选择 xyz')
    if kind == 'xyz' and ((columns - 1) % 3 or (natom is not None and columns != 3 * natom + 1)):
        raise ValueError('xyz DOS 必须为频率 + 每原胞原子 x、y、z 共 3 列')
    labels = []
    for index in range(columns - 1):
        atom_index = index // 3 if kind == 'xyz' else index
        label = atoms[atom_index]['symbol'] if atom_index < len(atoms) else 'Atom'
        labels.append('Total DOS' if kind == 'total' else f'{label} {atom_index + 1}' +
                      (' ' + 'xyz'[index % 3] if kind == 'xyz' else ''))
    series = [{'label': label, 'values': [row[index + 1] for row in rows]}
              for index, label in enumerate(labels)]
    integrals = [sum((rows[j + 1][0] - rows[j][0]) * (s['values'][j + 1] + s['values'][j]) / 2
                     for j in range(len(rows) - 1)) for s in series]
    return {'kind': kind, 'frequency': [row[0] for row in rows], 'series': series,
            'rowCount': len(rows), 'integrals': integrals,
            'normalization': '保留输入数值；积分采用梯形法，不自动归一到 3N。',
            'columnConvention': '首列频率；其余列为原胞原子顺序的投影；xyz 时按原子逐一排列 x,y,z。'}


def run(payload=None):
    """Import text/object data. All q/branch indices in payload/result are 0-based."""
    payload = payload or {}
    if not isinstance(payload, dict):
        raise ValueError('payload 必须是对象')
    warnings = []
    filename = _text(payload.get('filename', 'uploaded-data'), 'filename', 240)
    dos_only = (_provided(payload, 'dos_content') and not any(_provided(payload, key) for key in ('content', 'data')))
    if filename.lower().endswith('.dat') and 'content' in payload:
        dos_only = True
    data = {} if dos_only else _parse(payload)
    structure = _structure(data, warnings)
    structure = _supplement_structure(data, structure, payload, warnings)
    unit = payload.get('frequency_unit', data.get('frequency_unit', data.get('frequency-unit')))
    if unit == 'unknown':
        unit = data.get('frequency_unit', data.get('frequency-unit'))
    if unit is None and isinstance(data.get('physical_unit'), dict):
        unit = data['physical_unit'].get('frequency')
    unit = _text(unit or '未声明单位', 'frequency_unit', 50)
    if unit == '未声明单位':
        warnings.append('频率单位未声明。Phonopy 通常输出 THz，但可修改转换因子；请根据原计算设置指定单位。')
    result = {'kind': 'dos' if dos_only else 'structure-only', 'source': filename,
              'description': _text(data.get('description', ''), 'description', 1000),
              'synthetic': data.get('synthetic') is True,
              'structure': structure, 'qpoints': [], 'segments': [], 'frequencyUnit': unit,
              'summary': {'qpointCount': 0, 'bandCount': 0, 'imaginaryCount': 0, 'negativeCount': 0,
                          'nearZeroCount': 0, 'minFrequency': None, 'maxFrequency': None},
              'selection': None, 'dos': None, 'warnings': warnings, 'sources': SOURCES,
              'limits': {'maxBytes': MAX_BYTES, 'maxAtoms': MAX_ATOMS, 'maxQpoints': MAX_QPOINTS,
                         'maxModePoints': MAX_MODE_POINTS, 'maxDisplayAtoms': MAX_DISPLAY_ATOMS}}
    phonon = data.get('phonon')
    if phonon is not None:
        _list(phonon, 'phonon')
        if not phonon or len(phonon) > MAX_QPOINTS:
            raise ValueError(f'phonon 须包含 1 至 {MAX_QPOINTS} 个 q 点')
        if 'nqpoint' in data and _integer(data['nqpoint'], 'nqpoint', 1, MAX_QPOINTS) != len(phonon):
            raise ValueError('nqpoint 与 phonon 中的 q 点数不一致')
        if not isinstance(phonon[0], dict) or not isinstance(phonon[0].get('band'), list):
            raise ValueError('每个 phonon q 点须包含 band 列表')
        nband = len(phonon[0]['band'])
        if nband < 3 or nband > 3 * MAX_ATOMS or nband % 3:
            raise ValueError('声子支数必须是 3N，且须包含完整 3N 条支')
        if len(phonon) * nband > MAX_MODE_POINTS:
            raise ValueError(f'q 点数 × 声子支数不能超过 {MAX_MODE_POINTS}')
        if structure['natom'] is None:
            structure['natom'] = nband // 3
            warnings.append('未声明 natom：按完整 3N 条声子支推定原胞原子数。')
        if nband != 3 * structure['natom']:
            raise ValueError('声子支数必须等于 3 × natom')
        selected_q = _integer(payload.get('selected_q', 0), 'selected_q', 0, len(phonon) - 1)
        selected_band = _integer(payload.get('selected_band', 0), 'selected_band', 0, nband - 1)
        all_frequencies, vectors_present = [], 0
        for q_index, point in enumerate(phonon):
            if not isinstance(point, dict):
                raise ValueError('phonon 中每个 q 点须为对象')
            q = _vector(point.get('q-position'), 'q-position')
            bands = _list(point.get('band'), 'band', nband)
            frequencies = []
            selected_eigen = None
            for b_index, band in enumerate(bands):
                if not isinstance(band, dict) or 'frequency' not in band:
                    raise ValueError('每条声子支须包含 frequency，不能由结构或位移文件凭空推算')
                frequencies.append(_number(band['frequency'], 'frequency'))
                if 'eigenvector' in band:
                    eigen = _eigenvector(band['eigenvector'], structure['natom'], 'eigenvector')
                    vectors_present += 1
                    if q_index == selected_q and b_index == selected_band:
                        selected_eigen = eigen
            distance = _number(point['distance'], 'distance', 0) if 'distance' in point else None
            label = _text(point['label'], 'q 点标签', 80) if 'label' in point else None
            result['qpoints'].append({'index': q_index, 'q': q, 'distance': distance,
                                      'frequencies': frequencies, 'label': label})
            all_frequencies.extend(frequencies)
            if q_index == selected_q:
                result['selection'] = {'qIndex': q_index, 'bandIndex': selected_band, 'q': q,
                                       'frequency': frequencies[selected_band], 'eigenvector': selected_eigen}
        threshold = _number(payload.get('imaginary_tolerance', 1e-5), 'imaginary_tolerance', 0, 1e4)
        result['kind'] = 'phonon-data'
        result['segments'] = _segments(data, result['qpoints'], warnings)
        result['summary'] = {'qpointCount': len(phonon), 'bandCount': nband,
                             'imaginaryCount': sum(f < -threshold for f in all_frequencies),
                             'negativeCount': sum(f < 0 for f in all_frequencies),
                             'nearZeroCount': sum(abs(f) <= threshold for f in all_frequencies),
                             'minFrequency': min(all_frequencies), 'maxFrequency': max(all_frequencies),
                             'imaginaryTolerance': threshold, 'eigenvectorCount': vectors_present}
        warnings.append('虚频计数按输入频率 < −容差统计；极小负值可能来自数值误差，单凭本文件不能判定相变或热力学稳定性。')
        if any(q['distance'] is None for q in result['qpoints']):
            warnings.append('部分或全部 q 点没有 distance：横轴使用 q 点序号，不宣称为倒易空间距离。')
    elif not dos_only:
        if not structure['atoms'] and structure['lattice'] is None:
            raise ValueError('文件没有 phonon 频率数据或可识别晶胞；请导入 band.yaml / qpoints.yaml')
        warnings.append('这是结构/位移类文件，没有 phonon[].band[].frequency；仅展示结构。此导入器不从力常数或位移重新计算声子频率。')
    if dos_only or _provided(payload, 'dos_content'):
        kind = payload.get('dos_kind', 'total')
        result['dos'] = _dos(payload.get('dos_content', payload.get('content')), kind, structure)
        warnings.append('DOS 保留输入的投影顺序与归一化；不是从所导入的高对称路径重新估算得到。')
    result['animation'] = _animation(structure, result['selection'], payload, warnings)
    if result['synthetic']:
        warnings.insert(0, '原创合成教学数据：不对应真实材料或第一性原理计算，不能引用为实验/计算结果。')
    return result


run_phonopy_import = run
