"""Independent reader of serial, complex-spinor QE 7.x wavefunction records.

Uses the documented Fortran sequential record layout, not IrRep's parser.
No coefficient cut, normalization, symmetry repair, or energy shift is applied.
"""
from pathlib import Path
import hashlib
import re
import struct
import xml.etree.ElementTree as ET
import numpy as np

HARTREE_EV = 27.211386245981


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def record(handle):
    head = handle.read(4)
    if len(head) != 4:
        raise ValueError('Missing Fortran record header')
    size = struct.unpack('<i', head)[0]
    if not 0 <= size <= 128 * 1024 * 1024:
        raise ValueError('Unsupported endian/layout or oversized Fortran record')
    value, tail = handle.read(size), handle.read(4)
    if len(value) != size or tail != head:
        raise ValueError('Truncated/inconsistent Fortran record')
    return value


def read_wfc(path):
    with Path(path).open('rb') as handle:
        head = record(handle)
        if len(head) != 44:
            raise ValueError('Expected serial QE 44-byte spinor header')
        ik, kx, ky, kz, ispin, gamma, scale = struct.unpack('<i3diid', head)
        ngw, ng, npol, nbands = struct.unpack('<4i', record(handle))
        if gamma or npol != 2 or not (0 < ng <= 1000000 and 0 < nbands <= 1000):
            raise ValueError('Only complex, non-gamma-compressed two-component spinors supported')
        reciprocal = np.frombuffer(record(handle), dtype='<f8').reshape(3, 3).copy()
        gvectors = np.frombuffer(record(handle), dtype='<i4').reshape(ng, 3).copy()
        if len(np.unique(gvectors, axis=0)) != ng:
            raise ValueError('Duplicate Miller vectors')
        waves = []
        for _ in range(nbands):
            raw = record(handle)
            if len(raw) != 16 * npol * ng:
                raise ValueError('Inconsistent complex128 wavefunction record length')
            waves.append(np.frombuffer(raw, dtype='<c16').reshape(npol, ng).copy())
        if handle.read(1):
            raise ValueError('Unexpected trailing wavefunction data')
    return {'ik': ik, 'k_cartesian': np.array([kx, ky, kz]), 'ispin': ispin,
            'gamma_only': bool(gamma), 'scale': scale, 'ngw': ngw,
            'reciprocal_lattice': reciprocal, 'gvectors': gvectors,
            'waves': np.array(waves)}


def floats(text):
    return np.fromstring(text.replace('D', 'E'), sep=' ')


def read_dataset(directory):
    directory = Path(directory)
    xmlpath = directory / 'data-file-schema.xml'
    xml = ET.parse(xmlpath).getroot()
    if xml.attrib.get('Units') != 'Hartree atomic units':
        raise ValueError('Unrecognized energy/length units')
    structure = xml.find('output/atomic_structure')
    if structure is None:
        raise ValueError('Missing output atomic structure')
    lattice = np.array([floats(structure.findtext('cell/a' + str(j))) for j in (1, 2, 3)])
    alat = float(structure.attrib['alat'])
    positions = np.array([floats(atom.text) for atom in structure.find('atomic_positions')]) @ np.linalg.inv(lattice)
    species = [atom.attrib['name'] for atom in structure.find('atomic_positions')]
    bandstructure = xml.find('output/band_structure')
    if bandstructure.findtext('noncolin') != 'true' or bandstructure.findtext('spinorbit') != 'true':
        raise ValueError('Not a declared SOC noncollinear calculation')
    kpoints = []
    raw_hashes = {xmlpath.name: sha(xmlpath)}
    for index, ks in enumerate(bandstructure.findall('ks_energies'), 1):
        path = directory / f'wfc{index}.dat'
        item = read_wfc(path)
        raw_hashes[path.name] = sha(path)
        cart = floats(ks.find('k_point').text)
        # XML k coordinates are in 2*pi/alat, whereas the binary header
        # stores Cartesian reciprocal coordinates in inverse Bohr.
        if item['ik'] != index or not np.allclose(cart * (2 * np.pi / alat), item['k_cartesian'], atol=1e-12, rtol=0):
            raise ValueError('XML and binary k point mismatch')
        if not np.allclose(item['reciprocal_lattice'], 2 * np.pi * np.linalg.inv(lattice).T, atol=1e-12, rtol=0):
            raise ValueError('Binary reciprocal lattice and XML cell mismatch')
        if item['scale'] != 1:
            raise ValueError('Nontrivial binary scale not supported without an explicit convention')
        energies = floats(ks.findtext('eigenvalues')) * HARTREE_EV
        occupations = floats(ks.findtext('occupations'))
        if len(energies) != len(item['waves']) or int(ks.findtext('npw')) != len(item['gvectors']):
            raise ValueError('XML and binary band/PW counts disagree')
        kpoints.append(item | {'k': cart @ lattice.T / alat, 'energies': energies,
                               'occupations': occupations})
    psp = directory / xml.findtext('input/atomic_species/species/pseudo_file')
    raw_hashes[psp.name] = sha(psp)
    psp_text = psp.read_text(encoding='utf-8')
    metadata = {'schema': 'symmetry-lab.qe-spinor-source.v1', 'lattice_bohr': lattice.tolist(),
                'positions_fractional': positions.tolist(), 'species': species,
                'alat_bohr': alat, 'energy_unit': 'eV', 'raw_xml_energy_unit': 'Hartree',
                'hartree_to_ev': HARTREE_EV,
                'qe_version': xml.find('general_info/creator').attrib['VERSION'],
                'calculation': xml.findtext('input/control_variables/calculation'),
                'ecutwfc_hartree': float(xml.findtext('input/basis/ecutwfc')),
                'noncollinear': True, 'spin_orbit': True,
                'starting_magnetization': xml.findtext('input/atomic_species/species/starting_magnetization'),
                'output_magnetization_is_nscf_not_scf_measurement': True,
                'source_files_sha256': raw_hashes,
                'source_scope': 'Unmodified full-cutoff smooth spinor coefficients from published QE test data; no new DFT calculation.'}
    header = re.search(r'<PP_HEADER>\s*(.*?)</PP_HEADER>', psp_text, re.S)
    header_lines = [line.strip() for line in header.group(1).splitlines() if line.strip()] if header else []
    pseudo_type = header_lines[2].split()[0] if len(header_lines) > 2 else None
    metadata['pseudopotential_type_from_header'] = pseudo_type
    metadata['pseudopotential_header_norm_conserving'] = pseudo_type == 'NC'
    return metadata, kpoints
