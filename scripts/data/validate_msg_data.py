"""Validate all extracted magnetic coset tables using exact rational arithmetic."""
from fractions import Fraction
from pathlib import Path
import json
import math
from paths import OUTPUT

groups = json.loads((OUTPUT / 'magnetic-groups.json').read_text(encoding='utf-8'))['groups']
denom = math.lcm(*(Fraction(x).denominator for g in groups for o in g['operations'] for x in o['translationExact']))
checked = 0
for group in groups:
    operations = [(sum(o['rotation'], []), [int(Fraction(x)*denom) for x in o['translationExact']], int(o['antiunitary'])) for o in group['operations']]
    keys = {tuple(r)+tuple(x%denom for x in t)+(a,) for r,t,a in operations}
    assert len(keys) == len(operations), (group['id'], 'duplicate')
    for r,t,a in operations:
        det = r[0]*(r[4]*r[8]-r[5]*r[7])-r[1]*(r[3]*r[8]-r[5]*r[6])+r[2]*(r[3]*r[7]-r[4]*r[6])
        assert abs(det) == 1, (group['id'], 'determinant')
        for s,u,b in operations:
            rs = tuple(sum(r[3*i+k]*s[3*k+j] for k in range(3)) for i in range(3) for j in range(3))
            tu = tuple((t[i]+sum(r[3*i+k]*u[k] for k in range(3)))%denom for i in range(3))
            assert rs+tu+(a^b,) in keys, (group['id'], 'closure', r,t,a,s,u,b)
            checked += 1
print(json.dumps({'groups':len(groups),'operationProductsChecked':checked,'exactTranslationDenominator':denom,'result':'all tables closed modulo primitive integer translations'}))
