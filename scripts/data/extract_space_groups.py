"""Export primary SpaceGroupIrep data for the browser. No Wolfram execution.

The upstream GPL-3.0 Python and Wolfram sources remain the authority. This
extractor executes only two inspected data-building functions and literal AST
assignments, then generates the finite quotient by primitive translations.
"""
import ast
import copy
from fractions import Fraction
import json
import math
from pathlib import Path
import re
import numpy as np
from paths import UPSTREAM, OUTPUT

SOURCE = UPSTREAM / 'SpaceGroupIrep'
OUT = OUTPUT
WL = (SOURCE / 'SpaceGroupIrep.wl').read_text(encoding='utf-8')
PY = (SOURCE / 'getBCsymmetry.py').read_text(encoding='utf-8')
LG = (SOURCE / 'LittleGroupIrepData.wl').read_text(encoding='utf-8')

def greek(text):
    names = {'CapitalGamma':'Γ','CapitalLambda':'Λ','CapitalSigma':'Σ',
             'CapitalDelta':'Δ','Sigma':'σ','Alpha':'α','Beta':'β','Gamma':'γ'}
    return re.sub(r'\\\[(\w+)\]', lambda m:names.get(m[1],m[0]), text)

def split_top(text):
    parts=[]; start=0; depth=0; quoted=False; escaped=False
    for i,c in enumerate(text):
        if quoted:
            if escaped: escaped=False
            elif c=='\\': escaped=True
            elif c=='"': quoted=False
        elif c=='"': quoted=True
        elif c in '{[(': depth+=1
        elif c in '}])': depth-=1
        elif c==',' and depth==0: parts.append(text[start:i].strip()); start=i+1
    parts.append(text[start:].strip())
    return parts

def literal(expr):
    """Restricted literal Wolfram list/arithmetic conversion, never evaluates code."""
    expr=expr.strip()
    if expr.startswith('{') and expr.endswith('}'):
        return [literal(x) for x in split_top(expr[1:-1])]
    if expr.startswith('"') and expr.endswith('"'): return greek(expr[1:-1])
    tree=ast.parse(expr,mode='eval')
    def visit(n):
        if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)): return n.value
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.USub,ast.UAdd)):
            return (-1 if isinstance(n.op,ast.USub) else 1)*visit(n.operand)
        if isinstance(n,ast.BinOp) and isinstance(n.op,(ast.Add,ast.Sub,ast.Mult,ast.Div)):
            a,b=visit(n.left),visit(n.right)
            if isinstance(n.op,ast.Add): return a+b
            if isinstance(n.op,ast.Sub): return a-b
            if isinstance(n.op,ast.Mult): return a*b
            return a/b
        raise ValueError(expr)
    return visit(tree.body)

scope={}
for node in ast.parse(PY).body:
    if isinstance(node,ast.FunctionDef) and node.name in ('getSGlatt','init_SG_gen_elem'):
        exec(compile(ast.Module(body=[node],type_ignores=[]),'upstream-data','exec'),scope)
    elif isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name):
        if node.targets[0].id in ('BC_rot_name','BC_rot_mat'):
            scope[node.targets[0].id]=ast.literal_eval(node.value)
scope['init_SG_gen_elem']()
rotations={b:dict(zip(scope['BC_rot_name'][b],scope['BC_rot_mat'][b])) for b in scope['BC_rot_name']}

symbols=re.findall(r'"([^"\n]+)"',re.search(r'SGSymText=\{(.*?)\};',WL,re.S)[1])
assert len(symbols)==230
bc_symbols=list(symbols)
for match in re.finditer(r'SGSymTextBC\[\[\{([^}]+)\}\]\]=\{(.*?)\};',WL,re.S):
    ids=[int(x) for x in match[1].split(',')]
    vals=re.findall(r'"([^"\n]+)"',match[2])
    assert len(ids)==len(vals)
    for number,name in zip(ids,vals): bc_symbols[number-1]=name
pg_text=re.search(r'PGinfo=\{(.*?)\n\};',WL,re.S)[1]
point_groups=[]
for match in re.finditer(r'\{(\d+),"([^"]+)","([^"]+)",\{(\d+),\s*(\d+)\}',pg_text):
    point_groups.append({'number':int(match[1]),'symbol':match[2],'international':match[3],
                         'spaceGroupRange':[int(match[4]),int(match[5])]})
assert len(point_groups)==32

def basis(brav,a=1.,b=1.2,c=1.4):
    s=math.sqrt(3)/2
    return {
      'TricPrim':[[a,0,0],[.2*b,math.sqrt(.96)*b,0],[.1*c,.15*c,math.sqrt(.9675)*c]],
      'MonoPrim':[[0,-b,0],[s*a,-.5*a,0],[0,0,c]],
      'MonoBase':[[0,-b,0],[s*a/2,-a/4,-c/2],[s*a/2,-a/4,c/2]],
      'OrthPrim':[[0,-b,0],[a,0,0],[0,0,c]],
      'OrthBase':[[a/2,-b/2,0],[a/2,b/2,0],[0,0,c]],
      'OrthBody':[[a/2,b/2,c/2],[-a/2,-b/2,c/2],[a/2,-b/2,-c/2]],
      'OrthFace':[[a/2,0,c/2],[0,-b/2,c/2],[a/2,-b/2,0]],
      'TetrPrim':[[a,0,0],[0,a,0],[0,0,c]],
      'TetrBody':[[-a/2,a/2,c/2],[a/2,-a/2,c/2],[a/2,a/2,-c/2]],
      'TrigPrim':[[0,-a,c],[s*a,a/2,c],[-s*a,a/2,c]],
      'HexaPrim':[[0,-a,0],[s*a,a/2,0],[0,0,c]],
      'CubiPrim':[[a,0,0],[0,a,0],[0,0,a]],
      'CubiFace':[[0,a/2,a/2],[a/2,0,a/2],[a/2,a/2,0]],
      'CubiBody':[[-a/2,a/2,a/2],[a/2,-a/2,a/2],[a/2,a/2,-a/2]],
    }[brav]

def mult(first,second):
    R,v=first; S,w=second
    return (tuple(tuple(sum(R[i][k]*S[k][j] for k in range(3)) for j in range(3)) for i in range(3)),
            tuple((v[i]+sum(R[i][k]*w[k] for k in range(3)))%1 for i in range(3)))

IDENTITY=(((1,0,0),(0,1,0),(0,0,1)),(Fraction(0),)*3)
def generate(brav,gens):
    generators=[(tuple(map(tuple,rotations[brav][name])),tuple(Fraction(x).limit_denominator(96) for x in v)) for name,v in gens]
    elements=[IDENTITY]; seen={IDENTITY}; cursor=0
    while cursor<len(elements):
        elem=elements[cursor]; cursor+=1
        for gen in generators:
            out=mult(elem,gen)
            if out not in seen: seen.add(out); elements.append(out)
        assert len(elements)<=48,(brav,len(elements))
    assert len({x[0] for x in elements})==len(elements),'extra translations'
    assert all(mult(a,b) in seen for a in elements for b in elements),'closure'
    return elements

clean_wl=re.sub(r'\(\*.*?\*\)','',WL,flags=re.S)
k_tables={}
for match in re.finditer(r'hskpt\["([^"]+)"\]=\{(.*?)\n\s*\};',clean_wl,re.S):
    rows=[]
    for row in split_top(match[2]):
        fields=split_top(row.strip()[1:-1])
        if len(fields)<4: raise ValueError(row)
        label,path=literal(fields[0]),literal(fields[1])
        components=split_top(fields[2][1:-1])
        offset=[literal(x.replace('u','0')) for x in components]
        slope=[literal(x.replace('u','1'))-v for x,v in zip(components,offset)]
        rows.append({'label':label,'path':path,'offset':offset,'direction':slope,
                     'coordinateExpressions':components,'latticeLittleCoGroup':literal(fields[3])})
    k_tables[match[1]]=rows
assert len(k_tables)==14,len(k_tables)

def find(tab,label): return next(r for r in k_tables[tab] if r['label']==label)
def edit(tab,label,coords=None,path=None,new_label=None):
    row=find(tab,label)
    if coords is not None:
        row['coordinateExpressions']=coords
        row['offset']=[literal(x.replace('u','0')) for x in coords]
        row['direction']=[literal(x.replace('u','1'))-v for x,v in zip(coords,row['offset'])]
    if path is not None: row['path']=path
    if new_label is not None: row['label']=new_label
def clone(dest,src): k_tables[dest]=copy.deepcopy(k_tables[src])
def delete(tab,*labels): k_tables[tab]=[r for r in k_tables[tab] if r['label'] not in labels]
def add(tab,label,path,coords):
    k_tables[tab].append({'label':label,'path':path,'latticeLittleCoGroup':'C2v'})
    edit(tab,label,coords)

clone('OrthBase(b)','OrthBase(a)')
for label,coords in [('Y',['-1/2','1/2','0']),('T',['-1/2','1/2','1/2']),('H',['-1/2','1/2','u'])]: edit('OrthBase(b)',label,coords)
for label,path in [('A','ΓA'),('Σ','ΓΣ'),('Δ','ΓY'),('B','ZT')]: edit('OrthBase(b)',label,path=path)
edit('OrthBase(b)','G',['-1/2+u','1/2+u','1/2'],'TE','E')
edit('OrthBase(b)','F',['-1/2+u','1/2+u','0'],'YC','C')
clone('OrthBody(b)','OrthBody(a)'); clone('OrthBody(c)','OrthBody(a)')
edit('OrthBody(b)','X',['1/2','-1/2','-1/2']); edit('OrthBody(c)','X',['1/2','1/2','-1/2'])
edit('OrthBody(c)','Λ',path='ΓX'); edit('OrthBody(b)','G',['1/2+u','-1/2+u','-1/2-u'])
for tab in ['OrthBody(b)','OrthBody(c)']: edit(tab,'Σ',path='ΓΣ')
edit('OrthBody(b)','U',['1/2+u','-1/2-u','-1/2+u'],'XF','F')
edit('OrthBody(c)','G',['1/2+u','1/2-u','-1/2+u'],'XF','F')
edit('OrthBody(b)','Δ',path='ΓX'); edit('OrthBody(c)','U',['1/2+u','1/2-u','-1/2-u'])
for variant in ['b','c','d']: clone(f'OrthFace({variant})','OrthFace(a)')
edit('OrthFace(c)','Y',['1','1/2','1/2']); edit('OrthFace(d)','X',['1/2','0','-1/2']); edit('OrthFace(b)','Z',['1/2','-1/2','0'])
for variant,label,path in [('b','Λ','ΓΛ'),('c','G','XY'),('d','H','YX'),('d','Σ','ΓΣ'),('b','C','YZ'),('c','A','ZY'),('c','Δ','ΓΔ'),('b','D','XZ'),('d','B','ZX')]: edit(f'OrthFace({variant})',label,path=path)
delete('OrthFace(b)','A','B'); delete('OrthFace(c)','H','C'); delete('OrthFace(d)','G','D')
add('OrthFace(b)','Q','ZQ',['1/2+u','-1/2+u','0']); add('OrthFace(c)','R','YR',['1','1/2-u','1/2-u']); add('OrthFace(d)','U','XU',['1/2+u','0','-1/2+u'])
clone('TetrBody(b)','TetrBody(a)'); delete('TetrBody(a)','F','U'); delete('TetrBody(b)','V')
edit('TetrBody(b)','Z',['1/2','1/2','-1/2'])
for label,path in [('Λ','ΓZ'),('Σ','ΓΣ'),('Y','XY')]: edit('TetrBody(b)',label,path=path)
clone('TrigPrim(b)','TrigPrim(a)'); delete('TrigPrim(a)','B','Q'); delete('TrigPrim(b)','P')
edit('TrigPrim(b)','Z',['1/2','1/2','1/2']); edit('TrigPrim(b)','F',['1/2','1/2','0'])
for label,path in [('Λ','ΓZ'),('Σ','ΓΣ'),('Y','LY')]: edit('TrigPrim(b)',label,path=path)
assert len(k_tables)==22

irrep_metadata={}
for kind in ['LGIrep','DLGIrep']:
    for match in re.finditer(r'(?<!\w)'+kind+r'\[(\d+)\]=<\|(.*?)\|>;',LG,re.S):
        entries={}
        for line in match[2].splitlines():
            entry=re.match(r'\s*"([^"]+)"->(.*?)(?:,)?\s*$',line)
            if not entry: continue
            value=literal(entry[2].rstrip(','))
            entries[greek(entry[1])]={'abstractGroup':value[0],'generators':value[1],
                                    'allowedIrrepsAndReality':value[2],'labelType':value[3]}
        irrep_metadata.setdefault(int(match[1]),{})['double' if kind=='DLGIrep' else 'single']=entries
assert len(irrep_metadata)==230

groups=[]
for number in range(1,231):
    brav=scope['getSGlatt'](number); bv=basis(brav)
    reverse={tuple(map(tuple,R)):name for name,R in rotations[brav].items()}
    elems=generate(brav,scope['SG_gen_elem'][number][0])
    ops=[]
    for R,v in elems:
        ops.append({'name':reverse[R],'rotation':[list(row) for row in R],
                    'translation':[float(x) for x in v],'antiunitary':False})
        cart=np.array(bv).T@np.array(R)@np.linalg.inv(np.array(bv).T)
        assert np.max(np.abs(cart.T@cart-np.eye(3)))<1e-10,(number,reverse[R],cart)
    pg=next(p for p in point_groups if p['spaceGroupRange'][0]<=number<=p['spaceGroupRange'][1])
    order={1:1,2:2,3:2,4:2,5:4,6:4,7:4,8:8,9:4,10:4,11:8,12:8,13:8,14:8,15:16,16:3,17:6,18:6,19:6,20:12,21:6,22:6,23:12,24:12,25:12,26:12,27:24,28:12,29:24,30:24,31:24,32:48}[pg['number']]
    assert len(ops)==order,(number,len(ops),order)
    variants=[k for k in k_tables if k==brav or k.startswith(brav+'(')]
    allowed=irrep_metadata[number]['single']
    fixed=[]; lines=[]
    for variant in variants:
        for row in k_tables[variant]:
            if row['label'] not in allowed and not (row['label']=='F' and any(x in allowed for x in ['aF','bF'])): continue
            item={**copy.deepcopy(row),'bzType':variant}
            if any(row['direction']): lines.append(item)
            else:
                item['coordinates']=item['offset']
                same=next((x for x in fixed if x['label']==item['label'] and x['coordinates']==item['coordinates']),None)
                if same: same['bzTypes'].append(variant)
                else: item['bzTypes']=[variant]; fixed.append(item)
    groups.append({'number':number,'symbol':symbols[number-1],'bcSymbol':bc_symbols[number-1],
      'lattice':brav,'pointGroup':pg['symbol'],'pointGroupNumber':pg['number'],'basis':bv,
      'basisNote':'Illustrative BC primitive basis; a=1, b=1.2, c=1.4 (unused parameters ignored).',
      'operations':ops,'generators':scope['SG_gen_elem'][number][0],
      'originShift':scope['SG_gen_elem'][number][1],'bcSettingTransform':scope['SG_gen_elem'][number][2],
      'kpoints':fixed,'klines':lines,'bzTypes':variants,'irrepMetadata':irrep_metadata[number]})

payload={'schemaVersion':1,'source':{'repository':'https://github.com/goodluck1982/SpaceGroupIrep',
  'commit':'7b43201ac0973333edbe69bc3dd6ccb308abf624','version':'1.2.9',
  'files':['SpaceGroupIrep.wl','LittleGroupIrepData.wl','getBCsymmetry.py']},'license':'GPL-3.0',
  'convention':'BC primitive fractional real-space operations; reciprocal fractional k transforms as inverse(rotation).transpose().',
  'notes':['Operations are coset representatives modulo primitive translations.',
    'Named k-line ranges depend on lattice metric; affine forms are source data, not guaranteed first-BZ intervals.',
    'Irrep metadata contains upstream abstract-group IDs and selected indices, not evaluated representation matrices.'],
  'groups':groups,'pointGroups':point_groups,'kpointTables':k_tables,
  'rotationsByLattice':{b:[{'name':name,'rotation':R} for name,R in rows.items()] for b,rows in rotations.items()}}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'space-groups.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'groups':len(groups),'operations':sum(len(g['operations']) for g in groups),
                  'kpointTables':len(k_tables),'bytes':(OUT/'space-groups.json').stat().st_size,
                  'validation':'all group pair products close; expected 32 point-group orders; Cartesian rotations orthogonal'},indent=2))
