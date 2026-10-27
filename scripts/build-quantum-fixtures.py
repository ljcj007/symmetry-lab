"""Real Python results for UI contracts (smaller plotting grids only)."""
from pathlib import Path
import json
import sys
from copy import deepcopy
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
requests={
 'orbitals':('crystal_field_lab',{'soc':.1,'angular_grid':11,'scan_points':11}),
 'tetrahedral':('crystal_field_lab',{'coordination':'tetrahedral','soc':0,'angular_grid':11,'scan_points':11}),
 'jt':('crystal_field_lab',{'mode':'jahn_teller','grid':15,'scan_points':21}),
 'qwz':('quantum_geometry_lab',{'mesh':11,'pathSamples':41}),
 'qwzCritical':('quantum_geometry_lab',{'mass':-2,'mesh':11,'pathSamples':41}),
 'ssh':('quantum_geometry_lab',{'model':'ssh','mesh':11,'pathSamples':41}),
 'transport':('electron_transport_lab',{'mesh':16,'muSamples':9}),
 'transportTau':('electron_transport_lab',{'mesh':16,'muSamples':9,'tauFs':10}),
 'transport3d':('electron_transport_lab',{'dimension':3,'mesh':10,'muSamples':9}),
 'transportEmpty':('electron_transport_lab',{'mesh':16,'muSamples':9,'chemicalPotential':-10}),
}
example=ROOT/'dist/examples/electron-transport-import.json'
if example.exists(): requests['transportImport']=('electron_transport_lab',json.loads(example.read_text(encoding='utf-8')))
out={'format':'real-python-quantum-materials-fixtures','requests':{k:{'action':a,'input':p} for k,(a,p) in requests.items()},'results':{k:run(a,deepcopy(p)) for k,(a,p) in requests.items()}}
target=ROOT/'scripts/fixtures/quantum-materials.json'
target.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf-8',newline='\n')
print('Generated',len(requests),'real Python UI fixtures:',target.stat().st_size,'bytes')
