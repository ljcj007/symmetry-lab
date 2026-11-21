"""Replay axial extinction and a Friedel pair on the preserved α-quartz CIF.

Real, constant weights keep this prediction within ordinary kinematic
diffraction. The mirrored and rebased cells come from the same input positions.
Their reported hkl are in the particular cell used for each calculation.
"""

from hashlib import sha256

from diffraction import run as diffraction
from structure_bc import parse_cif


_SOURCE = {
    'filename': '9005017.cif',
    'byteCount': 2384,
    'sha256': '09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6',
}
_WEIGHTS = {'Si': 14, 'O': 8}
_INVALID_SOURCE = 'Use the byte-preserved 298 K COD 9005017 CIF for the quartz diffraction exercise.'


def _geometry(cell, positions, species):
    return {
        'preset': 'custom',
        'cell': cell.tolist(),
        'atoms': [{'species': s, 'fractional': position.tolist()}
                  for s, position in zip(species, positions, strict=True)],
        'scatteringFactors': _WEIGHTS,
        'maxIndex': 1,
    }


def _reflection(geometry, hkl):
    request = {**geometry, 'hkl': hkl}
    selected = diffraction(request)['selected']
    return {key: selected[key] for key in ('hkl', 'real', 'imag', 'intensity', 'dSpacing')}


def run(payload):
    """Return computed amplitudes for the axial series and same-vector controls."""
    content = payload.get('content') if isinstance(payload, dict) else None
    if not isinstance(content, str) or len(content) > _SOURCE['byteCount']:
        raise ValueError(_INVALID_SOURCE)
    raw = content.encode('utf-8')
    if len(raw) != _SOURCE['byteCount'] or sha256(raw).hexdigest() != _SOURCE['sha256']:
        raise ValueError(_INVALID_SOURCE)

    parsed = parse_cif(content)
    cell, positions, species = parsed['lattice'], parsed['positions'], parsed['species']
    original = _geometry(cell, positions, species)
    mirrored = _geometry(cell, -positions, species)
    rebased = _geometry(-cell, -positions, species)
    axial = [
        {'original': _reflection(original, hkl), 'mirror': _reflection(mirrored, hkl)}
        for hkl in ([0, 0, 1], [0, 0, 2], [0, 0, 3])
    ]
    off_axis = [1, 0, 1]
    opposite = [-value for value in off_axis]
    return {
        'schemaVersion': 1,
        'source': dict(_SOURCE),
        'atomCount': len(species),
        'weights': dict(_WEIGHTS),
        'axial': axial,
        'control': {
            'original': _reflection(original, off_axis),
            'friedel': _reflection(original, opposite),
            'mirror': _reflection(mirrored, off_axis),
            'rebasedSameLabel': _reflection(rebased, off_axis),
            'rebasedSameVector': _reflection(rebased, opposite),
        },
    }
