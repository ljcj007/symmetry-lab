"""Source-bound scalar-weight Friedel comparisons for the 298 K alpha-quartz CIF.

The complex factors are illustrative constants. The experiment cited in the
classroom uses polarization-dependent resonant scattering, which is outside
the kinematic scalar model used here.
"""

from hashlib import sha256

from diffraction import run as diffraction
from structure_bc import parse_cif


_SOURCE = {
    'filename': '9005017.cif',
    'byteCount': 2384,
    'sha256': '09da8f993c8c494c4f69c1a36d2ce055fa006cdae133823dfd1a1c7376b56dd6',
    'codId': 9005017,
    'revision': 291351,
}
_INVALID_SOURCE = 'Use the byte-preserved 298 K COD 9005017 CIF for the Friedel exercise.'


def run(payload):
    """Compute six fixed comparisons from the authenticated experimental geometry."""
    content = payload.get('content') if isinstance(payload, dict) else None
    if not isinstance(content, str) or len(content) > _SOURCE['byteCount']:
        raise ValueError(_INVALID_SOURCE)
    raw = content.encode('utf-8')
    if len(raw) != _SOURCE['byteCount'] or sha256(raw).hexdigest() != _SOURCE['sha256']:
        raise ValueError(_INVALID_SOURCE)

    structure = parse_cif(content)
    positions = structure['positions']
    species = structure['species']
    real = {'Si': 14, 'O': 8}
    illustrative = {'Si': {'re': 14, 'im': 1}, 'O': 8}

    def compare(hkl, factors, coordinates=positions):
        result = diffraction({
            'preset': 'custom',
            'cell': structure['lattice'].tolist(),
            'atoms': [{'species': element, 'fractional': point.tolist()}
                      for element, point in zip(species, coordinates, strict=True)],
            'hkl': hkl,
            'maxIndex': 1,
            'scatteringFactors': factors,
            'compareFriedel': True,
        })
        return result['friedelPair']

    direction = [1, 1, 0]
    return {
        'schemaVersion': 1,
        'source': dict(_SOURCE),
        'model': 'kinematic-constant-scalar',
        'atomCount': len(species),
        'weights': {'real': real, 'illustrative': illustrative},
        'comparisons': {
            'real110': compare(direction, real),
            'illustrative110': compare(direction, illustrative),
            'mirrored110': compare(direction, illustrative, -positions),
            'illustrative101': compare([1, 0, 1], illustrative),
            'illustrative001': compare([0, 0, 1], illustrative),
            'illustrative003': compare([0, 0, 3], illustrative),
        },
    }
