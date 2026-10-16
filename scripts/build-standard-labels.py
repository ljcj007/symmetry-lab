"""Reproducible BC character/label export; no Wolfram runtime or arbitrary evaluation.

Trusted vendored source expressions are parsed with SymPy's Mathematica parser.
Only literal arrays, the three documented direct products and two class-list
append constructions occur in AbstractGroupData. User input never reaches this
build-time parser. Runtime uses the restricted ExactParser instead.
"""
from pathlib import Path
import json, re, sys, hashlib, math, functools, gzip
import numpy as np
import sympy as s
from sympy.parsing.mathematica import parse_mathematica

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'upstream/SpaceGroupIrep'
OUT = ROOT / 'dist/data/labels'
OUT.mkdir(parents=True, exist_ok=True)
DB = json.loads((ROOT / 'dist/data/space-groups.json').read_text(encoding='utf-8'))
WL = re.sub(r'\(\*.*?\*\)', '', (SRC / 'SpaceGroupIrep.wl').read_text(encoding='utf-8'), flags=re.S)
AG = re.sub(r'\(\*.*?\*\)', '', (SRC / 'AbstractGroupData.wl').read_text(encoding='utf-8'), flags=re.S)

def split_top(text):
    out=[]; start=depth=0; quote=escape=False
    for i,c in enumerate(text):
        if quote:
            if escape: escape=False
            elif c=='\\': escape=True
            elif c=='"': quote=False
        elif c=='"': quote=True
        elif c in '{[(': depth+=1
        elif c in '}])': depth-=1
        elif c==',' and depth==0: out.append(text[start:i].strip()); start=i+1
    out.append(text[start:].strip())
    return out

def greek(v):
    names={'CapitalGamma':'Γ','CapitalLambda':'Λ','CapitalSigma':'Σ','CapitalDelta':'Δ','Sigma':'σ'}
    return re.sub(r'\\\[(\w+)\]',lambda m:names.get(m[1],m[1]),v)

def literal(text):
    text=text.strip()
    if text.startswith('{') and text.endswith('}'):
        return [literal(x) for x in split_top(text[1:-1])] if text[1:-1].strip() else []
    if text.startswith('"'): return greek(text[1:-1])
    if text=='na': return ''
    m=re.fullmatch(r'Range\[(\d+)\]',text)
    if m:return list(range(1,int(m[1])+1))
    m=re.fullmatch(r'Table\[1,\s*(\d+)\]',text)
    if m:return [1]*int(m[1])
    if re.fullmatch(r'-?\d+',text):return int(text)
    return text

@functools.lru_cache(None)
def scalar(text):
    text=text.replace(r'\[Omega]\[Conjugate]','omc').replace(r'\[Theta]\[Conjugate]','thc').replace(r'\[Sigma]\[Conjugate]','sic')
    text=text.replace(r'\[Omega]','om').replace(r'\[Theta]','th').replace(r'\[Sigma]','si')
    expr=parse_mathematica(text)
    vals={'om':(-1+s.sqrt(3)*s.I)/2,'omc':(-1-s.sqrt(3)*s.I)/2,'th':(1+s.I)/s.sqrt(2),'thc':(1-s.I)/s.sqrt(2),'si':s.exp(s.I*s.pi/8),'sic':s.exp(-s.I*s.pi/8)}
    return s.simplify(expr.subs({s.Symbol(k):v for k,v in vals.items()}))

def scalar_array(text):
    a=literal(text)
    def conv(v):return [conv(x) for x in v] if isinstance(v,list) else scalar(str(v))
    return conv(a)

def abstract_data():
    chars={}; classes={}
    for m in re.finditer(r'AG(CharTab|Classes)\[(\d+),(\d+)\]\s*=\s*(.*?);',AG,re.S):
        kind,key,expr=m[1],(int(m[2]),int(m[3])),m[4].strip()
        target=chars if kind=='CharTab' else classes
        if expr.startswith('{'):target[key]=scalar_array(expr) if kind=='CharTab' else literal(expr)
        elif expr.startswith('otimes'):
            p=re.fullmatch(r'otimesG(21|41|42)\[AGCharTab\[(\d+),(\d+)\]\]',expr); assert p,expr
            x=s.Matrix(chars[(int(p[2]),int(p[3]))]); z=s.I
            pmat={'21':s.Matrix([[1,1],[1,-1]]),'41':s.Matrix([[1,1,1,1],[1,z,-1,-z],[1,-1,1,-1],[1,-z,-1,z]]),'42':s.Matrix([[1,1,1,1],[1,-1,1,-1],[1,1,-1,-1],[1,-1,-1,1]])}[p[1]]
            target[key]=s.kronecker_product(pmat,x).tolist()
        elif key==(16,1):
            target[key]=[[s.exp(s.I*s.pi*i*j/8) for i in range(16)] for j in range(16)] if kind=='CharTab' else [[[i]] for i in range(16)]
        elif kind=='Classes' and key in ((96,6),(96,8)):
            old=classes[(48,4 if key[1]==6 else 10)];target[key]=[[p+[q] for p in cl] for q in (0,1) for cl in old]
        else:raise ValueError((kind,key,expr))
    assert len(chars)==len(classes)==93,(len(chars),len(classes))
    # Independent numeric orthogonality of every extracted abstract table.
    for key,tab in chars.items():
        a=np.array([[complex(v.evalf()) for v in row] for row in tab]); sizes=np.array([len(c) for c in classes[key]])
        assert sum(sizes)==key[0] and np.max(abs((a*sizes)@a.conj().T/key[0]-np.eye(len(a))))<1e-10,key
    return chars,classes

def label_data():
    result={}
    for kind in ('LGIrepLabel','DLGIrepLabel'):
        result[kind]={}
        for m in re.finditer(r'(?<![A-Za-z])'+kind+r'\[\{(\d+),\s*(\d+)\}\]\s*=\s*(.*?);',WL,re.S):
            result[kind][(int(m[1]),int(m[2]))]=literal(m[3])
    return result

def spin_data():
    block=re.search(r'SpinRot0=<\|(.*?)\|>;',WL,re.S)[1]; result={}
    for item in split_top(block):
        name,expr=item.split('->',1); name=greek(name.strip()[1:-1]); expr=expr.strip()
        depth=0; end=0
        for i,c in enumerate(expr):
            if c=='{':depth+=1
            elif c=='}':
                depth-=1
                if depth==0:end=i+1;break
        mat=s.Matrix(scalar_array(expr[:end]));suffix=expr[end:]
        if suffix:assert suffix[0]=='/';mat=mat/scalar(suffix[1:])
        result[name]=mat
    block=re.search(r'getSpinRotOp=Module\[.*?name0=\{(.*?)\};\s*name1=\{(.*?)\};',WL,re.S)
    names0=literal('{'+block[1]+'}');names1=literal('{'+block[2]+'}')
    for a,b in zip(names0,names1):result[b.replace('σ','m')]=result[a]
    return result

def name_fix(name): return name.replace('σ','m')

def plain_mulliken(token):
    if not token:return ''
    if re.fullmatch(r'[fs]?[AEFTJH][a-z0-9]*',token):
        prefix='¹' if token.startswith('f') else '²' if token.startswith('s') else ''
        t=token[1:] if prefix else token
        t=t.replace('pp','″').replace('p','′')
        if len(t)>1 and t[1]=='b':t=t[0]+'̅'+t[2:]
        return prefix+t
    return token

def gamma_label(k,tag):
    if isinstance(tag,list):return f'{k}{tag[0]}{tag[1]}'
    return f'{k}{tag}'

def exprstr(v):return s.sstr(v)

def normalizer_transforms():
    """Verified finite affine normalizer transports, not a completeness claim.

    Search the 24-torsion origin grid in the lattice holohedry. Every accepted
    transport is certified using integer arithmetic on all Seitz elements.
    All distinct actions (including different origin shifts) are retained.
    """
    grid=np.array(list(__import__('itertools').product(range(24),repeat=3)),dtype=int)
    result={}
    for group in DB['groups']:
        ops=group['operations'];target={tuple(np.array(op['rotation']).ravel()):op for op in ops};existing=set(target)
        answer=[]
        for item in DB['rotationsByLattice'][group['lattice']]:
            A=np.array(item['rotation'],dtype=int)
            if tuple(A.ravel()) in existing:continue
            Ai=np.rint(np.linalg.inv(A)).astype(int);relations=[]
            for op in ops:
                R=A@np.array(op['rotation'],dtype=int)@Ai;tgt=target.get(tuple(R.ravel()))
                if tgt is None:break
                t=np.rint(np.array(op['translation'])*24).astype(int);tt=np.rint(np.array(tgt['translation'])*24).astype(int)
                relations.append((np.eye(3,dtype=int)-R,A@t-tt))
            else:
                candidates=grid
                for B,c in relations:
                    candidates=candidates[np.all((candidates@B.T+c)%24==0,axis=1)]
                    if not len(candidates):break
                actions=set()
                for point in candidates:
                    deltas=tuple(int(x) for B,c in relations for x in ((B@point+c)//24))
                    if deltas in actions:continue
                    actions.add(deltas)
                    assert all(np.all((B@point+c)%24==0) for B,c in relations)
                    answer.append({'name':item['name'],'rotation':item['rotation'],'translation':[str(s.Rational(int(x),24)) for x in point],
                                   'normalizer_certificate':'all Seitz conjugates match with exact integer translation differences; denominator 24 grid',
                                   'source':'lattice holohedry / affine normalizer outside G'})
        if answer:result[str(group['number'])]=answer
    return result

def main():
    chars,classes=abstract_data(); labels=label_data(); spins=spin_data()
    # Floating selection is checked by an exact symbolic matrix identity before
    # any spin multiplication sign enters the exported character tables.
    spin_tables={}; rotation_tables={}
    for lattice,rr in DB['rotationsByLattice'].items():
        rots={r['name']:np.array(r['rotation'],dtype=int) for r in rr}; names=list(rots); byrot={tuple(r.ravel()):n for n,r in rots.items()}
        st={};rt={}
        for a in names:
            for b in names:
                c=byrot[tuple((rots[a]@rots[b]).ravel())];rt[a,b]=c
                prod=spins[a]*spins[b];v=np.array(prod.evalf(),dtype=complex);w=np.array(spins[c].evalf(),dtype=complex)
                sign=1 if np.max(abs(v-w))<1e-8 else -1
                assert (prod-sign*spins[c]).applyfunc(s.simplify)==s.zeros(2),(a,b,c)
                st[a,b]=sign
        spin_tables[lattice]=st;rotation_tables[lattice]=(rots,rt)
    records=[]; failures=[]
    for group in DB['groups']:
        for kind in ('single','double'):
            for label,meta in group['irrepMetadata'][kind].items():
                try:
                    records.extend(make_records(group,kind,label,meta,chars,classes,labels,rotation_tables,spin_tables))
                except Exception as exc:
                    failures.append({'group':group['number'],'kind':kind,'label':label,'error':str(exc)})
        if group['number']%25==0: print('BC groups',group['number'],len(records),'failures',len(failures),flush=True)
    export={'schemaVersion':1,'sources':{'bc':DB['source'],'abstractSha256':hashlib.sha256((SRC/'AbstractGroupData.wl').read_bytes()).hexdigest()},'records':records,'failures':failures,'normalizerTransforms':normalizer_transforms(),
            'spinMatrices':{k:[[exprstr(v) for v in row] for row in mat.tolist()] for k,mat in spins.items()}}
    (OUT/'bc-labels.json.gz').write_bytes(gzip.compress((json.dumps(export,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8'),compresslevel=9,mtime=0))
    print('BC exported',len(records),'failures',failures[:12],flush=True)

def make_records(group,kind,label,meta,chars,classes,labels,rotation_tables,spin_tables):
    double=kind=='double'; lattice=group['lattice']; rots,rt=rotation_tables[lattice];st=spin_tables[lattice]
    key=tuple(meta['abstractGroup']);ct=chars[key];cl=classes[key];lb=labels['DLGIrepLabel' if double else 'LGIrepLabel'][key]
    lbi={r:i for i,r in enumerate(lb[0][1])}; labelrow=next(row for row in lb[1:] if row[0]==meta['labelType'])
    candidates=[p for p in group['kpoints']+group['klines'] if p['label']==label or (label in ('aF','bF') and p['label']=='F' and '('+label[0]+')' in p['bzType'])]
    if label=="Z'" and group['number']==205:candidates=[{'coordinateExpressions':['1/2','u','0'],'bzType':lattice}]
    assert candidates,('missing k',label)
    out=[]; seen=set(); u=s.Symbol('u',real=True)
    for kp in candidates:
        k=[scalar(x).subs(s.Symbol('u'),u) for x in kp['coordinateExpressions']]
        marker=tuple(map(str,k))
        if marker in seen:continue
        seen.add(marker)
        operations=[]
        for op in group['operations']:
            R=s.Matrix(op['rotation']);dk=R.T*s.Matrix(k)-s.Matrix(k)
            if all(x.is_Integer for x in dk):
                operations.append({'name':name_fix(op['name']),'rotation':op['rotation'],'translation':[s.Rational(str(x)).limit_denominator(96) for x in op['translation']]})
        opby={op['name']:op for op in operations}
        gens=[]
        herring=isinstance(meta['generators'][0][1],list)
        for n,t in meta['generators']:
            bar=n.startswith('bar');n=name_fix(n[3:] if bar else n)
            assert n in rots,n
            gens.append((n,-1 if bar else 1,tuple(s.Rational(str(x)).limit_denominator(96) for x in t) if herring else int(t)))
        if not herring:
            coc={};den=[]
            for a in opby:
                dk=s.Matrix(rots[a].tolist()).T*s.Matrix(k)-s.Matrix(k)
                for b in opby:
                    v=s.expand(-dk.dot(s.Matrix(opby[b]['translation'])));assert not v.free_symbols,(label,v)
                    coc[a,b]=v;den.append(int(s.denom(v)))
            modulus=math.lcm(*den)
        def mul(x,y):
            a,sa,v=x;b,sb,w=y;c=rt[a,b]; sign=sa*sb*(st[a,b] if double else 1)
            if herring:
                z=tuple(v[i]+sum(int(rots[a][i,j])*w[j] for j in range(3)) for i in range(3))
            else:z=(v+w+coc[a,b]*modulus)%modulus
            return c,sign,z
        identity=('E',1,(s.S.Zero,)*3 if herring else 0)
        representatives=[]
        for ci,cla in enumerate(cl):
            for powers in cla:
                e=identity
                for gen,power in zip(gens,powers):
                    for _ in range(power):e=mul(e,gen)
                representatives.append((e,ci))
        columns=[]
        for op in operations:
            possible=[(e,ci) for e,ci in representatives if e[0]==op['name'] and e[1]==1 and (herring or e[2]==0)]
            assert possible,('no representative',label,op['name'])
            e,ci=possible[0]
            phase=-2*sum(k[i]*(op['translation'][i]-(e[2][i] if herring else 0)) for i in range(3))
            columns.append((ci,s.expand(phase)))
        rows=[]; numeric_rows=[]
        for index,reality in meta['allowedIrrepsAndReality']:
            li=lbi[index];tag=labelrow[2][li];token=labelrow[1][li];assert token!='',('empty label',key,index)
            vals=[s.expand(ct[index-1][ci])*s.exp(s.I*s.pi*phase) for ci,phase in columns]
            numeric_rows.append([complex(v.subs(u,s.Rational(173,1000)).evalf()) for v in vals])
            rows.append({'bc_label':gamma_label(label.replace('aF','F').replace('bF','F'),tag),'mulliken':plain_mulliken(token),'mulliken_source_token':token,'abstract_irrep':index,'dimension':int(ct[index-1][0]),'reality':reality,'characters':[exprstr(v) for v in vals]})
        assert sum(r['dimension']**2 for r in rows)==len(operations),(group['number'],label,'dimension')
        # Orthogonality at a generic exact rational point also guards operation
        # ordering and the allowed-irrep subset independently of source labels.
        aa=np.array(numeric_rows)
        assert np.max(abs(aa@aa.conj().T/len(operations)-np.eye(len(rows))))<1e-8,(group['number'],label,'orthogonality')
        out.append({'group_number':group['number'],'k_label':label,'bz_type':kp['bzType'],'bz_types':kp.get('bzTypes',[kp['bzType']]),'k':[exprstr(v) for v in k], 'double_valued':double,'abstract_group':list(key),
                    'operations':[dict(op,translation=[exprstr(v) for v in op['translation']]) for op in operations],'irreps':rows})
    return out

if __name__=='__main__':
    if '--normalizers-only' in sys.argv:
        path=OUT/'bc-labels.json.gz';data=json.loads(gzip.decompress(path.read_bytes()));data['normalizerTransforms']=normalizer_transforms()
        path.write_bytes(gzip.compress((json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8'),compresslevel=9,mtime=0))
        print('normalizer transports',sum(map(len,data['normalizerTransforms'].values())))
    else:main()
