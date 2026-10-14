"""Cross-link extracted MSG and SG datasets and share source spin rotation lifts."""
from pathlib import Path
import json
from paths import OUTPUT

data_dir = OUTPUT
magpath = data_dir / 'magnetic-groups.json'
sgpath = data_dir / 'space-groups.json'
pointpath = data_dir / 'points.json'
mag = json.loads(magpath.read_text(encoding='utf-8'))
sg = json.loads(sgpath.read_text(encoding='utf-8'))
points = json.loads(pointpath.read_text(encoding='utf-8'))

def rotkey(rotation):
    return tuple(sum(rotation, []))

families = {g['number']:g for g in sg['groups']}
allmag = {g['id']:g for g in mag['groups']}
rotations = {lat:{rotkey(r['rotation']):r['name'] for r in rots}
             for lat,rots in sg['rotationsByLattice'].items()}

for group in mag['groups']:
    family = families[group['family']]
    for key in ['lattice','basis','basisNote','pointGroup','pointGroupNumber','kpoints','klines','bzTypes']:
        group[key] = family[key]
    group['unitarySG'] = group['unitarySpaceGroup']
    for operation in group['operations']:
        operation['name'] = rotations[group['lattice']][rotkey(operation['rotation'])]

for point in points['points']:
    msg = allmag['.'.join(map(str,point['representativeMSG']))]
    for key in ['family','lattice','basis','basisNote']:
        point[key] = msg[key]
    for op in point['operations']:
        op['name'] = rotations[point['lattice']][rotkey(op['rotation'])]

# MSG type-I data use the same BC setting. Assert exact rotation correspondence
# and equivalence of translations modulo integer primitive vectors.
matched = 0
for maggroup in mag['groups']:
    if maggroup['type'] != 1:
        continue
    family = families[maggroup['family']]
    ops = {rotkey(o['rotation']):o for o in maggroup['operations']}
    assert len(ops) == len(family['operations']), maggroup['id']
    for op in family['operations']:
        source = ops[rotkey(op['rotation'])]
        assert all(abs((x-y)-round(x-y))<1e-7 for x,y in zip(source['translation'],op['translation'])), (family['number'],op)
        op['spinRotation'] = source['spinRotation']
        matched += 1

sg['spinSource'] = 'MSGCorep BC_MSG_elements type-I tables, down-up basis; six decimal places'
mag['spinBasis'] = points['spinBasis'] = 'down-up (↓↑); spatial spin action only, time reversal is separately indicated by antiunitary'
for path,doc in [(magpath,mag),(sgpath,sg),(pointpath,points)]:
    path.write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'Named all magnetic operations; enriched lattice metadata; cross-validated and added source spin lifts to {matched} ordinary SG operations.')
