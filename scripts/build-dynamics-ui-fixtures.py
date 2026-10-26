"""Generate real Python result contracts for dependency-free JavaScript UI tests."""
from pathlib import Path
import json
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'dist/python'))
from browser_api import run
demo=(ROOT/'dist/data/examples/phonopy-demo.yaml').read_text(encoding='utf8')
requests={
 'phase':('phase',{}),
 'phaseNegative':('phase',{'q':-.7,'axis':'x'}),
 'phaseZero':('phase',{'q':0,'axis':'x'}),
 'diffraction200':('diffraction',{'preset':'silicon','hkl':[2,0,0],'maxIndex':2,'scatteringFactors':{'Si':1}}),
 'diffraction220':('diffraction',{'preset':'silicon','hkl':[2,2,0],'maxIndex':2,'scatteringFactors':{'Si':1}}),
 'phonopy':('phonopy',{'content':demo,'frequency_unit':'THz','supercell':[2,1,1]}),
 'phonopyQ1':('phonopy',{'content':demo,'frequency_unit':'THz','supercell':[2,1,1],'selected_q':1}),
}
result={key:run(action,payload) for key,(action,payload) in requests.items()}
target=ROOT/'scripts/fixtures/structure-dynamics.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf8')
print(f'Generated {len(result)} Python result fixtures: {target.stat().st_size} bytes')
