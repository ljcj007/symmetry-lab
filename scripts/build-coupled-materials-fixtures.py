"""Generate real Python response contracts for coupled-materials UI tests."""
from copy import deepcopy
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'dist/python'))
from distortion_lab import run as distortion, preset_data
from magnon_lab import run as magnons
from qha_lab import run as qha

custom = preset_data('batio3')
custom['preset'] = 'custom'
custom['landau'] = {'resolution': 21}
rank_deficient = deepcopy(custom)
rank_deficient['modes'][1]['vectors'] = deepcopy(rank_deficient['modes'][0]['vectors'])
matrix = json.loads((ROOT/'dist/data/examples/qha-multivolume-demo.json').read_text(encoding='utf8'))
thermal = json.loads((ROOT/'dist/data/examples/qha-thermal-files-demo.json').read_text(encoding='utf8'))
requests = {
    'distortion': ('distortion_lab', {'preset': 'batio3', 'landau': {'resolution': 21}}),
    'distortionSr': ('distortion_lab', {'preset': 'srtio3', 'landau': {'resolution': 21}}),
    'distortionRebuilt': ('distortion_lab', {'preset': 'batio3', 'amplitudes': [0, 0], 'landau': {'resolution': 21}}),
    'distortionCustom': ('distortion_lab', custom),
    'distortionRankDeficient': ('distortion_lab', rank_deficient),
    'distortionUnbounded': ('distortion_lab', {'preset': 'batio3', 'landau': {'c': -3, 'resolution': 21}}),
    'magnons': ('magnon_lab', {'model': 'fm'}),
    'magnonsAFM': ('magnon_lab', {'model': 'afm', 'field': .2}),
    'magnonsAFMBranch': ('magnon_lab', {'model': 'afm', 'field': .2, 'branch': 1}),
    'magnonsUnstable': ('magnon_lab', {'model': 'afm', 'anisotropy': 1.1, 'field': 2}),
    'magnonsSoft': ('magnon_lab', {'model': 'afm', 'anisotropy': 1, 'field': 0, 'q': 0}),
    'qha': ('qha_lab', {'source': 'preset', 'temperatures': [0, 100, 200, 300, 400]}),
    'qhaBoundary': ('qha_lab', {'source': 'preset', 'pressure': 100, 'temperatures': [0, 100, 200, 300, 400]}),
    'qhaMatrix': ('qha_lab', {'source': 'matrix', 'data': matrix}),
    'qhaThermal': ('qha_lab', {'source': 'thermal', 'data': thermal}),
}
calculators = {'distortion_lab': distortion, 'magnon_lab': magnons, 'qha_lab': qha}
result = {'format': 'real-python-coupled-materials-fixtures',
          'requests': {key: {'action': action, 'input': payload} for key, (action, payload) in requests.items()},
          'results': {key: calculators[action](deepcopy(payload)) for key, (action, payload) in requests.items()}}
target = ROOT/'scripts/fixtures/coupled-materials/contracts.json'
target.parent.mkdir(exist_ok=True, parents=True)
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf8')
print(f'Generated {len(requests)} real Python coupled-material fixtures: {target.stat().st_size} bytes')
