"""Build real Python result contracts for dependency-free browser UI tests."""
from pathlib import Path
import copy
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from phonon_modes import run as modes, preset_data
from band_connectivity import run as bands
from phonon_thermo import run as thermo

mesh = (ROOT / 'dist/data/examples/thermo-mesh-demo.yaml').read_text(encoding='utf8')
thermal = (ROOT / 'dist/data/examples/thermal-properties-demo.yaml').read_text(encoding='utf8')
finite_q = preset_data()
finite_q['phonon'][0]['q-position'] = [.5, 0, 0]
unknown_unit = preset_data()
del unknown_unit['physical_unit']
bohr = preset_data()
bohr['physical_unit']['length'] = 'bohr'
orthorhombic = {'natom': 1, 'lattice': [[2, 0, 0], [0, 3, 0], [0, 0, 4]],
                'physical_unit': {'length': 'angstrom'},
                'points': [{'symbol': 'Si', 'mass': 28, 'coordinates': [0, 0, 0]}],
                'frequency_unit': 'THz',
                'phonon': [{'q-position': [0, 0, 0], 'band': [
                    {'frequency': 0, 'eigenvector': [[[int(i == j), 0] for j in range(3)]]} for i in range(3)]}]}
requests = {
    'modes': ('phonon_modes', {'preset': 'silicon', 'selected_band': 3}),
    'modesAcoustic': ('phonon_modes', {'preset': 'silicon', 'selected_band': 0}),
    'modesGaAs': ('phonon_modes', {'preset': 'gaas', 'selected_band': 3}),
    'modesPhase': ('phonon_modes', {'preset': 'silicon', 'selected_band': 3, 'phase': math.pi / 2}),
    'modesFiniteQ': ('phonon_modes', {'data': finite_q, 'selected_band': 3, 'supercell': [2, 1, 1]}),
    'modesUnknownUnit': ('phonon_modes', {'data': unknown_unit, 'selected_band': 3, 'length_unit': 'unknown'}),
    'modesBohr': ('phonon_modes', {'data': bohr, 'selected_band': 3}),
    'modesCharacters': ('phonon_modes', {'data': orthorhombic, 'selected_band': 0}),
    'bands': ('band_connectivity', {}),
    'bandsBroken': ('band_connectivity', {'mixing': .2}),
    'rashba': ('band_connectivity', {'model': 'rashba'}),
    'rashbaBroken': ('band_connectivity', {'model': 'rashba', 'zeeman': .2}),
    'thermoCompare': ('phonon_thermo', {'source': 'compare'}),
    'thermoMesh': ('phonon_thermo', {'source': 'mesh', 'content': mesh, 'filename': 'thermo-mesh-demo.yaml'}),
    'thermoThermal': ('phonon_thermo', {'source': 'thermal', 'content': thermal, 'filename': 'thermal-properties-demo.yaml'}),
    'thermoDOS': ('phonon_thermo', {'source': 'dos', 'natom': 2, 'frequency_unit': 'THz',
                                  'dos_content': '0 0\n1 1.5\n2 3\n3 1.5\n4 0\n',
                                  'dos_complete': True, 'dos_normalization': '3n'}),
}
functions = {'phonon_modes': modes, 'band_connectivity': bands, 'phonon_thermo': thermo}
result = {'format': 'real-python-material-research-fixtures',
          'requests': {name: {'action': action, 'input': payload} for name, (action, payload) in requests.items()},
          'results': {name: functions[action](copy.deepcopy(payload)) for name, (action, payload) in requests.items()}}
target = ROOT / 'scripts/fixtures/material-research.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf8')
print(f'Generated {len(requests)} real Python fixtures: {target.stat().st_size} bytes')
