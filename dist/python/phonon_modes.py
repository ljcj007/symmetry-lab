"""Gamma-subspace characters and commensurate frozen Phonopy eigenmodes.

Frequencies/eigenvectors are inputs, not force-constant calculations.  Labels
are assigned only after a complete frequency cluster is invariant under all
detected crystal operations.  The built-in label tables cover Oh and Td (and
C1/Ci); other groups retain computed characters without invented labels.
"""
import itertools
import math

import numpy as np
import spglib

import phonopy_import as importer
from phonon_spectra import _table, _OH_CLASSES, _TD_CLASSES

MAX_ATOMS = 64
MAX_FROZEN_ATOMS = 512
ELEMENTS = set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn '
                'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce '
                'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn '
                'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl '
                'Mc Lv Ts Og').split())
SOURCES = [
    {'title': 'Phonopy: dynamical matrix and displacement phase convention',
     'url': 'https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix'},
    {'title': 'Phonopy: irreducible representations and degenerate sets',
     'url': 'https://phonopy.github.io/phonopy/setting-tags.html#irreps'},
    {'title': 'Phonopy: symmetry-adapted modes',
     'url': 'https://phonopy.github.io/phonopy/symmetry-adapted-modes.html'},
    {'title': 'spglib: symmetry dataset and fractional symmetry operations',
     'url': 'https://spglib.readthedocs.io/en/stable/dataset.html'},
]


def _number(payload, key, default, low, high):
    return importer._number(payload.get(key, default), key, low, high)


def preset_data(preset='silicon'):
    """Original, analytic two-atom teaching models, never experimental spectra."""
    models = {
        'silicon': ('Si', 'Si', 28.085, 28.085, 5.431, .25, 10.0),
        'gaas': ('Ga', 'As', 69.723, 74.9216, 5.653, .25, 8.0),
        'nacl': ('Na', 'Cl', 22.98977, 35.45, 5.64, .5, 6.0),
    }
    if preset not in models:
        raise ValueError('preset 必须是 silicon、gaas 或 nacl')
    first, second, m1, m2, lattice, coordinate, frequency = models[preset]
    bands = []
    # e is mass-weighted: translations have equal physical displacements;
    # optical modes have zero centre-of-mass displacement.
    for optical in (False, True):
        weights = ([math.sqrt(m2 / (m1 + m2)), -math.sqrt(m1 / (m1 + m2))]
                   if optical else [math.sqrt(m1 / (m1 + m2)), math.sqrt(m2 / (m1 + m2))])
        for axis in range(3):
            bands.append({'frequency': frequency if optical else 0.0,
                          'eigenvector': [[[weight if j == axis else 0.0, 0.0]
                                           for j in range(3)] for weight in weights]})
    return {'natom': 2, 'nqpoint': 1, 'synthetic': True,
            'description': '原创合成教学本征矢和频率；采用理想晶体结构，不是 DFT 或实验光谱。',
            'frequency_unit': 'THz', 'physical_unit': {'length': 'angstrom'},
            'lattice': [[0, lattice / 2, lattice / 2], [lattice / 2, 0, lattice / 2],
                        [lattice / 2, lattice / 2, 0]],
            'points': [{'symbol': first, 'mass': m1, 'coordinates': [0, 0, 0]},
                       {'symbol': second, 'mass': m2, 'coordinates': [coordinate] * 3}],
            'phonon': [{'q-position': [0, 0, 0], 'label': 'Γ', 'band': bands}]}


def _symmetry(structure, symprec):
    lattice = np.asarray(structure['lattice'], dtype=float)
    positions = np.asarray([a['coordinates'] for a in structure['atoms']])
    # Distinct isotopes must not be permuted: their mass-weighted dynamical
    # matrices need not have the chemical crystal's larger symmetry.
    identities, numbers = [], []
    for atom in structure['atoms']:
        identity = (atom['symbol'], atom['mass'])
        if identity not in identities:
            identities.append(identity)
        numbers.append(identities.index(identity) + 1)
    dataset = spglib.get_symmetry_dataset((lattice, positions, numbers), symprec=symprec)
    if dataset is None:
        raise ValueError('spglib 无法识别有效晶体对称性；请检查晶格、原子重合和 symprec')
    primitive = len(set(int(x) for x in dataset.mapping_to_primitive)) == len(positions)
    operations = []
    for rotation, translation in zip(dataset.rotations, dataset.translations):
        cart = lattice.T @ rotation @ np.linalg.inv(lattice.T)
        # Mapping tolerance is in Cartesian input length units, like spglib.
        mapping = []
        for i, position in enumerate(positions):
            transformed = rotation @ position + translation
            delta = positions - transformed
            delta -= np.rint(delta)
            distances = np.linalg.norm(delta @ lattice, axis=1)
            matches = [j for j, dist in enumerate(distances)
                       if dist < symprec * 1.1 and numbers[j] == numbers[i]]
            if len(matches) != 1:
                raise ValueError('对称操作不能唯一映射原子；请检查重合原子或减小 symprec')
            mapping.append(matches[0])
        if len(set(mapping)) != len(positions):
            raise ValueError('对称操作的原子映射不是置换')
        if np.linalg.norm(cart.T @ cart - np.eye(3)) > max(1e-7, symprec * 10):
            raise ValueError('对称操作不是有效的笛卡尔正交变换；请减小 symprec')
        operations.append({'rotation': np.asarray(rotation), 'cart': cart,
                           'mapping': mapping, 'translation': np.asarray(translation)})
    return {'pointGroup': str(dataset.pointgroup), 'spaceGroup': int(dataset.number),
            'symbol': str(dataset.international), 'operationCount': len(operations),
            'method': 'spglib structure operations + Cartesian atom permutation',
            'primitiveCell': primitive, 'symprec': symprec,
            'massSensitive': True}, operations


def _class_labels(symmetry, operations):
    """Cubic class identity from conjugacy sizes, independent of frame choice."""
    point = symmetry['pointGroup']
    if point not in ('m-3m', '-43m', '1', '-1'):
        return None, None, None
    if not symmetry['primitiveCell']:
        return None, None, None
    if point in ('1', '-1'):
        indices = [0 if np.linalg.det(op['cart']) > 0 else 1 for op in operations]
        return (['E'], {'A': [1]}, indices) if point == '1' else (['E', 'i'], {'Ag': [1, 1], 'Au': [1, -1]}, indices)
    is_td = point == '-43m'
    classes = _TD_CLASSES if is_td else _OH_CLASSES
    table = _table('Td' if is_td else 'Oh')
    indices = []
    for op in operations:
        rotation = op['rotation']
        determinant = int(round(np.linalg.det(rotation)))
        trace = int(round(np.trace(rotation)))
        if is_td:
            index = ({3: 0, 0: 1, -1: 2}[trace] if determinant == 1
                     else {-1: 3, 1: 4}[trace])
        else:
            proper = determinant * rotation
            proper_trace = int(np.trace(proper))
            if proper_trace in (3, 0, 1):
                index = {3: 0, 0: 1, 1: 3}[proper_trace]
            else:
                conjugates = {tuple(np.rint(g['rotation'] @ proper @ np.linalg.inv(g['rotation'])).astype(int).ravel())
                              for g in operations}
                index = 4 if len(conjugates) == 3 else 2
            index += 5 if determinant == -1 else 0
        indices.append(index)
    return classes, table, indices


def _groups(bands, q, structure, symmetry, operations, tolerance):
    frequencies = [float(b['frequency']) for b in bands]
    pending = sorted(range(len(bands)), key=lambda i: frequencies[i])
    grouped = []
    while pending:
        first = pending[0]
        cluster = [i for i in pending if frequencies[i] - frequencies[first] <= tolerance]
        pending = pending[len(cluster):]
        grouped.append(sorted(cluster))
    gamma = max(abs(x - round(x)) for x in q) < 1e-8
    labels, table, class_indices = _class_labels(symmetry, operations)
    positions = np.asarray([a['coordinates'] for a in structure['atoms']])
    gauge = np.exp(2j * math.pi * (positions @ np.asarray(q)))
    basis_problem = None
    if all('eigenvector' in band for band in bands):
        full = np.column_stack([np.asarray(b['eigenvector'], dtype=float).view(np.complex128).reshape(-1)
                                for b in bands])
        norms = np.linalg.norm(full, axis=0)
        if np.any(norms < 1e-14):
            basis_problem = '完整 3N 模式集中含零本征矢，不能认证表示分解。'
        else:
            full /= norms
            if min(np.linalg.svd(full, compute_uv=False)) < 1e-8:
                basis_problem = '完整 3N 本征矢线性相关，不能认证完整模式表示分解。'
            else:
                gram = full.conj().T @ full
                group_index = {band: i for i, group in enumerate(grouped) for band in group}
                cross_overlap = max((abs(gram[i, j]) for i in range(len(bands)) for j in range(i)
                                     if group_index[i] != group_index[j]), default=0)
                if cross_overlap > 1e-5:
                    basis_problem = '不同频率簇的质量加权本征矢不正交；请检查模式文件与本征矢约定。'
    results = []
    for indices in grouped:
        classification = {'status': 'unavailable', 'label': None, 'decomposition': [],
                          'characters': [], 'invarianceError': None, 'reason': ''}
        item = {'bands': indices, 'frequencies': [frequencies[i] for i in indices],
                'dimension': len(indices), 'classification': classification}
        results.append(item)
        if not gamma:
            classification['reason'] = '当前为非 Γ 点：只提供相容超胞冻结模，不套用点群 Γ 标签。'
            continue
        if not symmetry['primitiveCell']:
            classification['reason'] = '当前输入不是原胞；折叠模式需要额外平移量子数，本接口不强行赋予原胞 Γ 标签。'
            continue
        if basis_problem:
            classification['reason'] = basis_problem
            continue
        if any('eigenvector' not in bands[i] for i in indices):
            classification['reason'] = '此频率簇缺少部分本征矢；不能由单个简并模式推断整个表示。'
            continue
        vectors = np.column_stack([np.asarray(bands[i]['eigenvector'], dtype=float)
                                   .view(np.complex128).reshape(-1) for i in indices])
        # At reciprocal-lattice equivalent Gamma, Phonopy's position gauge
        # must first be converted to periodic Gamma displacement amplitudes.
        vectors = (vectors.reshape(len(positions), 3, -1) * gauge[:, None, None]).reshape(3 * len(positions), -1)
        norm = np.linalg.norm(vectors, axis=0)
        if np.any(norm < 1e-14):
            classification['reason'] = '此频率簇包含零本征矢，无法构造表示空间。'
            continue
        vectors /= norm
        u, singular, _ = np.linalg.svd(vectors, full_matrices=False)
        if min(singular) < 1e-8:
            classification['reason'] = '此频率簇的本征矢线性相关；简并空间不完整。'
            continue
        basis = u[:, :len(indices)]
        characters, error = [], 0.0
        for op in operations:
            transformed = np.empty_like(basis).reshape(len(positions), 3, -1)
            transformed[op['mapping']] = np.einsum('ij,njk->nik', op['cart'], basis.reshape(len(positions), 3, -1))
            transformed = transformed.reshape(basis.shape)
            restricted = basis.conj().T @ transformed
            error = max(error, float(np.linalg.norm(transformed - basis @ restricted) / math.sqrt(len(indices))))
            character = np.trace(restricted)
            characters.append(complex(character))
        classification['invarianceError'] = error
        classification['operationCharacters'] = [[z.real, z.imag] for z in characters]
        if error > 1e-5:
            classification['status'] = 'not-invariant'
            classification['reason'] = '此频率簇在结构对称操作下不封闭：检查简并容差、NAC 方向、结构与本征矢是否匹配。'
            continue
        if table is None:
            classification.update(status='characters-only', reason='子空间已通过封闭性验证；此点群的标签表尚未覆盖，保留逐操作特征标。')
            continue
        class_chars = []
        for i, label in enumerate(labels):
            selected = [z for z, cls in zip(characters, class_indices) if cls == i]
            average = sum(selected) / len(selected)
            if max(abs(z - average) for z in selected) > 1e-5:
                classification.update(status='inconsistent', reason='同一共轭类特征标不一致，拒绝给出标签。')
                break
            class_chars.append({'class': label, 'size': len(selected), 'real': float(average.real), 'imag': float(average.imag)})
        else:
            decomposition = []
            for label, row in table.items():
                coefficient = sum(c['size'] * complex(c['real'], c['imag']) * x for c, x in zip(class_chars, row)) / len(operations)
                multiplicity = round(coefficient.real)
                if abs(coefficient - multiplicity) > 1e-5 or multiplicity < 0:
                    classification.update(status='inconsistent', reason='特征标约化不满足非负整数性，拒绝给出标签。')
                    break
                if multiplicity:
                    decomposition.append({'irrep': label, 'multiplicity': multiplicity, 'dimension': row[0]})
            else:
                if sum(d['multiplicity'] * d['dimension'] for d in decomposition) != len(indices):
                    raise ArithmeticError('不可约表示维数校验失败')
                label = ' + '.join((str(d['multiplicity']) if d['multiplicity'] > 1 else '') + d['irrep'] for d in decomposition)
                classification.update(status='classified', label=label, decomposition=decomposition,
                                      reason='标签属于整个简并频率子空间；子空间内可任意酉换基，不能把一个基矢当作完整多维表示。')
        classification['characters'] = class_chars
    return results


def _export_text(lattice, atoms, title):
    species = list(dict.fromkeys(atom['symbol'] for atom in atoms))
    if any(symbol not in ELEMENTS for symbol in species):
        return {'poscar': None, 'cif': None, 'reason': '结构导出要求真实元素符号（例如 Si、Ga）；任意占位标签不能写入 POSCAR/CIF。同位素请使用元素符号及对应 mass。'}
    lattice = np.array(lattice, dtype=float, copy=True)
    corrected = float(np.linalg.det(lattice)) < 0
    if corrected:
        # A CIF cell reconstructed from lengths and angles is right-handed.
        # Flip the basis AND its fractional component to preserve chirality.
        lattice[0] *= -1
        atoms = [dict(atom, fractional=[(-atom['fractional'][0]) % 1,
                                        atom['fractional'][1], atom['fractional'][2]]) for atom in atoms]
    ordered = [atom for symbol in species for atom in atoms if atom['symbol'] == symbol]
    fmt = lambda values: ' '.join(f'{value:.12f}' for value in values)
    lines = [title, '1.0'] + [fmt(row) for row in lattice]
    lines += [' '.join(species), ' '.join(str(sum(a['symbol'] == s for a in atoms)) for s in species), 'Direct']
    lines += [fmt(atom['fractional']) for atom in ordered]
    lengths = np.linalg.norm(lattice, axis=1)
    angles = [math.degrees(math.acos(float(np.clip(np.dot(lattice[i], lattice[j]) / (lengths[i] * lengths[j]), -1, 1))))
              for i, j in ((1, 2), (0, 2), (0, 1))]
    cif = ['data_frozen_mode', '# Generated frozen mode; P1 only, no relaxed structure or inferred child group.',
           "_symmetry_space_group_name_H-M 'P 1'", '_symmetry_Int_Tables_number 1']
    cif += [f'_cell_length_{axis} {value:.12f}' for axis, value in zip('abc', lengths)]
    cif += [f'_cell_angle_{axis} {value:.12f}' for axis, value in zip(('alpha', 'beta', 'gamma'), angles)]
    cif += ['loop_', '_symmetry_equiv_pos_as_xyz', "'x,y,z'", 'loop_', '_atom_site_label', '_atom_site_type_symbol',
            '_atom_site_fract_x', '_atom_site_fract_y', '_atom_site_fract_z', '_atom_site_occupancy']
    cif += [f"{atom['symbol']}{i + 1} {atom['symbol']} {fmt(atom['fractional'])} 1" for i, atom in enumerate(atoms)]
    return {'poscar': '\n'.join(lines) + '\n', 'cif': '\n'.join(cif) + '\n',
            'reason': '完整超胞以 P1 导出；保留所有原子，不宣称畸变后的空间群。' +
                      ('输入为左手晶胞，导出同步反转第一基矢及其分数坐标以保持真实手性。' if corrected else ''),
            'lengthUnit': 'angstrom', 'poscarAtomOrder': [atom['index'] for atom in ordered],
            'basisHandednessCorrected': corrected,
            'basisTransform': [[-1 if corrected else 1, 0, 0], [0, 1, 0], [0, 0, 1]]}


def _freeze(structure, selection, payload):
    amplitude = _number(payload, 'amplitude', .1, 0, 2)
    phase = _number(payload, 'phase', 0, -1e6, 1e6)
    shape = [importer._integer(x, 'supercell', 1, 8)
             for x in importer._list(payload.get('supercell', [1, 1, 1]), 'supercell', 3)]
    if math.prod(shape) * structure['natom'] > MAX_FROZEN_ATOMS:
        raise ValueError(f'冻结超胞不能超过 {MAX_FROZEN_ATOMS} 个原子')
    q = np.asarray(selection['q'])
    if np.max(np.abs(q * shape - np.rint(q * shape))) > 1e-8:
        raise ValueError('q 与所选超胞不相容：每个 q_i × supercell_i 必须为整数，不能将非周期窗口导出为周期晶胞')
    if selection['eigenvector'] is None:
        raise ValueError('所选模式缺少 eigenvector，不能生成冻结模结构')
    eigen = np.asarray(selection['eigenvector'], dtype=float).view(np.complex128).reshape(-1, 3)
    norm = float(np.linalg.norm(eigen))
    if norm < 1e-14:
        raise ValueError('所选本征矢为零，不能定义冻结模幅度')
    eigen /= norm
    masses = np.asarray([a['mass'] for a in structure['atoms']])
    physical = eigen / np.sqrt(masses[:, None])
    envelope = float(max(np.linalg.norm(physical, axis=1)))
    lattice = np.asarray(structure['lattice'], dtype=float)
    super_lattice = lattice * np.asarray(shape)[:, None]
    inverse = np.linalg.inv(super_lattice)
    atoms = []
    for cell in itertools.product(*(range(x) for x in shape)):
        for i, (atom, vector) in enumerate(zip(structure['atoms'], physical)):
            fractional = np.asarray(cell) + atom['coordinates']
            equilibrium = fractional @ lattice
            spatial = np.exp(2j * math.pi * float((q @ fractional) % 1) - 1j * phase)
            coefficient = amplitude * vector * np.exp(2j * math.pi * float((q @ fractional) % 1)) / envelope
            displacement = amplitude * (vector * spatial).real / envelope
            position = equilibrium + displacement
            wrapped = (position @ inverse) % 1
            wrapped[np.abs(wrapped - 1) < 1e-12] = 0
            atoms.append({'index': len(atoms), 'atomIndex': i, 'cell': list(cell), 'symbol': atom['symbol'],
                          'mass': atom['mass'], 'equilibrium': equilibrium.tolist(), 'position': position.tolist(),
                          'displacement': displacement.tolist(), 'fractional': wrapped.tolist(),
                          'complexDisplacement': [[float(x.real), float(x.imag)] for x in coefficient]})
    frozen = {'available': True, 'reason': '周期相容冻结位移；没有做能量计算、结构弛豫或自动子群判定。',
              'atoms': atoms, 'lattice': super_lattice.tolist(), 'supercell': shape,
              'amplitude': amplitude, 'phase': phase, 'commensurate': True,
              'maxDisplacement': max(float(np.linalg.norm(a['displacement'])) for a in atoms),
              'eigenvectorNorm': norm, 'massUnweightedEnvelope': envelope,
              'lengthUnit': structure['lengthUnit'],
              'formula': 'u_j(R) = A Re[(e_j/√m_j) exp(i2π q·(R+r_j)−iφ)] / max_k ||e_k/√m_k||'}
    declared = payload.get('length_unit', structure['lengthUnit'])
    if not isinstance(declared, str):
        raise ValueError('length_unit 必须是文本')
    unit = declared.lower().replace('å', 'angstrom').replace('Å', 'angstrom')
    conversion = {'angstrom': 1, 'angstroms': 1, 'a': 1, 'bohr': .529177210903, 'au': .529177210903,
                  'nm': 10, 'pm': .01}.get(unit)
    frozen['lengthUnit'] = declared
    if conversion is None:
        exports = {'poscar': None, 'cif': None, 'reason': '输入长度单位不明确；请明确指定 length_unit=angstrom 或 bohr/nm/pm 后再导出。'}
    else:
        exports = _export_text(super_lattice * conversion, atoms, 'Symmetry Lab frozen mode; synthetic' if payload.get('_synthetic') else 'Symmetry Lab imported frozen mode')
    return frozen, exports


def run(payload=None):
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError('payload 必须是对象')
    imported = any(importer._provided(payload, key) for key in ('content', 'data'))
    data = importer._parse(payload) if imported else preset_data(payload.get('preset', 'silicon'))
    parse_payload = dict(payload, data=data, amplitude=0, phase=0, supercell=[1, 1, 1])
    parse_payload.setdefault('selected_band', 0 if imported else 3)
    if not imported:
        parse_payload.setdefault('filename', f"{payload.get('preset', 'silicon')}-synthetic-gamma.json")
    result = importer.run(parse_payload)
    if result['kind'] != 'phonon-data' or result['selection'] is None:
        raise ValueError('模式分析需要包含频率和本征矢的 band.yaml / qpoints.yaml，结构文件本身不能生成模式')
    structure = result['structure']
    if structure['natom'] > MAX_ATOMS:
        raise ValueError(f'此模式工具最多支持 {MAX_ATOMS} 个原胞原子')
    if (not structure['lattice'] or not structure['atoms'] or structure['cellKind'] == 'supercell'
            or any(a['mass'] is None or a['coordinates'] is None for a in structure['atoms'])):
        raise ValueError('需要同一原胞完整 lattice、points、coordinates 和 mass；缺少元数据时不能匹配原子或恢复物理位移')
    tolerance = _number(payload, 'frequency_tolerance', 1e-5, 0, 10)
    symprec = _number(payload, 'symprec', 1e-5, 1e-8, 1e-2)
    symmetry, operations = _symmetry(structure, symprec)
    selection = result['selection']
    bands = data['phonon'][selection['qIndex']]['band']
    groups = _groups(bands, selection['q'], structure, symmetry, operations, tolerance)
    frozen, exports = _freeze(structure, selection, dict(payload, _synthetic=result['synthetic']))
    warnings = result['warnings'][:]
    warnings += ['模式标签属于整个简并子空间，频率接近不自动保证该空间对称封闭。',
                 '冻结模只生成指定幅度的结构；负频模式不表示周期性真实运动，也不能单独决定最终相变结构。',
                 '标签表目前覆盖 O_h、T_d、C_1、C_i 的非磁性原胞 Γ 模式；其他点群保留计算特征标。']
    return {'kind': 'phonon-modes', 'source': result['source'], 'synthetic': result['synthetic'],
            'description': result['description'], 'structure': structure, 'qpoints': result['qpoints'],
            'frequencyUnit': result['frequencyUnit'], 'selection': selection, 'modeGroups': groups,
            'symmetry': symmetry, 'frequencyTolerance': tolerance, 'frozen': frozen, 'exports': exports,
            'warnings': warnings, 'sources': SOURCES,
            'scope': 'Gamma invariant frequency subspaces + commensurate diagonal supercell frozen modes',
            'limits': {'maxAtoms': MAX_ATOMS, 'maxFrozenAtoms': MAX_FROZEN_ATOMS, 'maxSupercellAxis': 8}}


run_phonon_modes = run
