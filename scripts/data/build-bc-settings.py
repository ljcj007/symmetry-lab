"""Regenerate the attributed BC-setting data from the vendored upstream source.

Only the trusted, version-controlled definitions before the file readers run.
No input structure text is evaluated by the converter.
"""
from pathlib import Path
import json
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / 'upstream/SpaceGroupIrep/getBCsymmetry.py').read_text(encoding='utf8')
definitions = source[source.index('brav_latt='):source.index('def read_poscar')]
namespace = {'np': np, 'sqrt': np.sqrt}
exec(compile(definitions.replace('np.mat(', 'np.asmatrix('), 'upstream/getBCsymmetry.py', 'exec'), namespace)
settings = {}
for n in range(1, 231):
    q, _ = namespace['Q_and_S_from_spg_to_BC'](n, np.array([[2,0,0],[0,3,0],[-1,0,4]]))
    gen, shift, u, _ = namespace['SG_gen_elem'][n]
    settings[n] = {
        'bravais': namespace['getSGlatt'](n), 'Q': q, 'U': u, 't0': shift,
        'generators': [{'name': name, 'rotation': namespace['get_BC_rot_mat'](n, name).tolist(),
                        'translation': v} for name, v in gen],
    }
target = ROOT / 'dist/python/structure_bc.py'
text = target.read_text(encoding='utf8') if target.exists() else ''
marker = '# BEGIN GENERATED BC SETTINGS'
if marker in text:
    text = text[:text.index(marker)]
text += marker + '\n# Source: Gui-Bin Liu, getBCsymmetry.py (GPL-3.0), SpaceGroupIrep 1.2.9.\n'
text += '_BC_SETTINGS = ' + repr(settings) + '\n'
target.write_text(text, encoding='utf8', newline='\n')
print('Generated', len(settings), 'BC settings')
