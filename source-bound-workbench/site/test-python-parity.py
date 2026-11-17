"""Generate actual Python Fraction receipts for the JS independent comparison.
Run after: node site/test-engine.mjs --prepare
Then: node site/test-engine.mjs
These ordered commands avoid any Node child-process requirement.
"""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from verify import verify
fixture=ROOT/'site/test-data'
packets=json.loads((fixture/'packets.json').read_text(encoding='utf-8'))
results={row['name']:verify(row['packet']) for row in packets}
(fixture/'python-receipts.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('Generated',len(results),'actual Python Fraction receipts')
