"""Freeze IrRep's Bilbao tables and transport them to the site's BC section.

Input: IrRep commit 4f43f138d30ef37a499a297ac9b1ec8ef14717cc, GPL-3.0.
All 460 input text tables and license are archived alongside the JSON. Rebuild
offline from this archive, or pass the root of the inspected IrRep checkout.
"""
from pathlib import Path
import ast, gzip, hashlib, itertools, json, math, re, sys, zipfile
import numpy as np
import sympy as sp

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'dist/data/labels';OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'dist/python'))
from symbolic_core import ExactParser, spin_lift
P=ExactParser();DB=json.loads((ROOT/'dist/data/space-groups.json').read_text(encoding='utf-8'))
BC=json.loads(gzip.decompress((OUT/'bc-labels.json.gz').read_bytes()))
COMMIT='4f43f138d30ef37a499a297ac9b1ec8ef14717cc'

def frac(x):return sp.Rational(str(x)).limit_denominator(96)
def matrix(a):return sp.Matrix([[frac(x) for x in row] for row in a])
def expr(a):return [[str(x) for x in row] for row in a.tolist()]
def key(a):return tuple(int(x) for x in a)
def number(z):
    a,b=round(float(z.real),12),round(float(z.imag),12)
    if abs(a)<1e-11:a=0
    if abs(b)<1e-11:b=0
    return str(a) if not b else f'({a})+I*({b})'

def source_tables():
    archive=OUT/'bilbao-source.zip'; checkout=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'.openai/upstream-checkouts/irrep-labels'
    if archive.exists() and len(sys.argv)==1:
        with zipfile.ZipFile(archive) as z:return {name:z.read(name) for name in z.namelist()}
    if checkout.exists():
        import subprocess
        actual=subprocess.check_output(['git','-C',str(checkout),'rev-parse','HEAD'],text=True).strip()
        assert actual==COMMIT,('Expected frozen IrRep commit',COMMIT,'found',actual)
        folder=checkout/'irreptables/irreptables/data/tables'
        files={f.name:f.read_bytes() for f in sorted(folder.glob('irreps-SG=*.dat'))}
        assert len(files)==460,len(files)
        files['LICENSE-IrRep.txt']=(checkout/'LICENSE').read_bytes()
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for name,data in files.items():
                info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
    else:
        with zipfile.ZipFile(archive) as z:files={name:z.read(name) for name in z.namelist()}
    return files

def settings():
    tree=ast.parse((ROOT/'dist/python/structure_bc.py').read_text(encoding='utf-8'))
    for node in tree.body:
        if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='_BC_SETTINGS' for t in node.targets):return ast.literal_eval(node.value)
    raise ValueError('Missing verified BC settings')

def spin_frame(number,bravais):
    # Exactly Q_and_S_from_spg_to_BC with monoclinic gamma=pi/2 as used by
    # SpaceGroupIrep convTraceToBC for trace transport (metric independent).
    S=sp.eye(3)
    if bravais.startswith('Mono'):S=sp.Matrix([[1,0,0],[0,0,-1],[0,1,0]])
    if bravais=='HexaPrim':S=sp.Matrix([[0,1,0],[-1,0,0],[0,0,1]])
    if bravais=='TrigPrim':S=sp.Matrix([[-sp.Rational(1,2),sp.sqrt(3)/2,0],[-sp.sqrt(3)/2,-sp.Rational(1,2),0],[0,0,1]])
    if number in [17,19,28,29,31,33,36,46,53,61,70,122]:S=sp.Matrix([[0,1,0],[-1,0,0],[0,0,1]])*S
    if number in [38,39,40,41,57]:S=sp.Matrix([[0,1,0],[0,0,1],[1,0,0]])*S
    if number in [51,54]:S=sp.Matrix([[0,0,-1],[0,1,0],[1,0,0]])*S
    if number in [52,60]:S=sp.Matrix([[1,0,0],[0,0,-1],[0,1,0]])*S
    U=np.array(spin_lift(S,P).evalf(),dtype=complex)
    if 143<=number<=194:
        J=np.diag([np.exp(-1j*np.pi/4),np.exp(1j*np.pi/4)])@np.array([[0,1],[1,0]])
        U=U@J
    # getBandRep performs the final up/down -> BC down/up basis swap.
    return np.array([[0,1],[1,0]])@U

def parse_table(text):
    lines=[x.strip() for x in text.splitlines() if x.strip()];n=int(next(x for x in lines if x.startswith('nsym=')).split('=')[1]);start=lines.index('symmetries=')+1
    operations=[]
    for line in lines[start:start+n]:
        v=list(map(float,line.split()));R=sp.Matrix(3,3,[int(x) for x in v[:9]]);t=sp.Matrix([frac(x) for x in v[9:12]])
        S=(np.array(v[12:16])*np.exp(1j*np.pi*np.array(v[16:20]))).reshape(2,2) if len(v)>=20 else np.eye(2)
        operations.append((R,t,S))
    points=[];point=None
    for line in lines[start+n:]:
        if line.startswith('kpoint'):
            a,b,c=line.split(':');point={'name':a.split()[1],'k':sp.Matrix([frac(x) for x in b.split()]),'indices':[int(x)-1 for x in c.split()],'rows':[]};points.append(point)
        elif point is not None:
            v=line.split();num=np.array(list(map(float,v[2:])));m=len(point['indices'])
            assert len(num) in (m,2*m),(line,m)
            chars=num[:m].astype(complex)
            if len(num)==2*m:chars*=np.exp(1j*np.pi*num[m:])
            point['rows'].append({'bilbao_label':v[0],'dimension':int(v[1]),'raw':chars})
    return operations,points

def main():
    files=source_tables();sets=settings();records=[];fails=[];origins={};hashes={}
    s0={48:[1/4]*3,50:[1/4,1/4,0],59:[1/4,1/4,0],68:[0,1/4,1/4],70:[-1/8]*3,85:[-1/4,1/4,0],86:[-1/4]*3,88:[0,-1/4,-1/8],125:[-1/4,-1/4,0],126:[-1/4]*3,129:[-1/4,1/4,0],130:[-1/4,1/4,0],133:[-1/4,1/4,-1/4],134:[-1/4,1/4,-1/4],137:[-1/4,1/4,-1/4],138:[-1/4,1/4,-1/4],141:[0,1/4,-1/8],142:[0,1/4,-1/8],201:[-1/4]*3,203:[-1/8]*3,222:[-1/4]*3,224:[-1/4]*3,227:[-1/8]*3,228:[-3/8]*3}
    for n in range(1,231):
        group=DB['groups'][n-1];setting=sets[n];M=matrix(setting['Q'])*matrix(setting['U']);Mi=M.inv();t0=sp.Matrix([frac(x) for x in setting['t0']]);frame=spin_frame(n,setting['bravais'])
        target={key(sp.Matrix(op['rotation'])):op for op in group['operations']}
        for double in (False,True):
            filename=f'irreps-SG={n}-'+('spin' if double else 'scal')+'.dat';raw=files[filename];hashes[filename]=hashlib.sha256(raw).hexdigest()
            try:
                ops,points=parse_table(raw.decode());transformed=[]
                # The frozen files use several origin choices. Prefer exactly
                # the upstream conversion origin, then its stated ITA origin;
                # accept only after every operation agrees modulo the lattice.
                origin_candidates=[t0-Mi*sp.Matrix([frac(x) for x in s0.get(n,[0,0,0])]),t0]
                def matches(p):
                    for R,t,S in ops:
                        rb=Mi*R*M;op=target.get(key(rb))
                        if op is None:return False
                        tb=Mi*t+p-rb*p;delta=tb-sp.Matrix([frac(x) for x in op['translation']])
                        if not all(x.is_Integer for x in delta):return False
                    return True
                origin=next((p for p in origin_candidates if matches(p)),None)
                if origin is None:
                    # Origin differences in these space groups divide 24.
                    for p in itertools.product(range(24),repeat=3):
                        v=sp.Matrix([sp.Rational(x,24) for x in p])
                        if matches(v):origin=v;break
                assert origin is not None,('origin could not align',n)
                origins[str(n)]=[str(v) for v in origin]
                for R,t,S in ops:
                    rb=Mi*R*M;op=target[key(rb)];tb=Mi*t+origin-rb*origin;delta=tb-sp.Matrix([frac(x) for x in op['translation']]);sign=1
                    if double:
                        spin=frame@S@frame.conj().T;spin/=np.linalg.norm(spin)/np.sqrt(2)
                        spinbc=np.array([[complex(P.parse(v)) for v in row] for row in BC['spinMatrices'][op['name']]])
                        plus=float(np.max(abs(spin-spinbc)));minus=float(np.max(abs(spin+spinbc)))
                        assert min(plus,minus)<1e-4,('spin frame mismatch',n,op['name'],plus,minus)
                        sign=1 if plus<minus else -1
                    transformed.append((op,delta,sign))
                for point in points:
                    kb=M.T*point['k']; selected=[transformed[i] for i in point['indices']]
                    phases=np.array([sgn*np.exp(2j*np.pi*float(kb.dot(delta))) for op,delta,sgn in selected])
                    rows=[{'bilbao_label':row['bilbao_label'],'dimension':row['dimension'],'characters':[number(z) for z in row['raw'].conj()*phases]} for row in point['rows']]
                    aa=np.array([row['raw'] for row in point['rows']]);orth=np.max(abs(aa@aa.conj().T/len(selected)-np.eye(len(rows))))
                    assert orth<2e-4,('source orthogonality',n,point['name'],orth)
                    assert sum(row['dimension']**2 for row in rows)==len(selected),('incomplete source point',n,point['name'])
                    records.append({'group_number':n,'double_valued':double,'k_label':point['name'],'k':[str(x) for x in kb],'k_bilbao_conventional':[str(x) for x in point['k']],
                                    'bz_type':'Bilbao maximal k','operations':[{'name':op['name'],'rotation':op['rotation'],'translation':[str(frac(x)) for x in op['translation']]} for op,delta,sgn in selected],
                                    'irreps':rows})
            except Exception as exc:fails.append({'group':n,'double':double,'error':str(exc)})
        if n%25==0:print('Bilbao groups',n,'records',len(records),'fails',fails[-3:],flush=True)
    data={'schemaVersion':1,'sources':{'repository':'https://github.com/irreducible-representations/irrep','commit':COMMIT,'license':'GPL-3.0','origin':'Bilbao Crystallographic Server via IrRep','inputSha256':hashes},
          'coverage':{'space_groups':230,'source_tables':460,'exported_k_tables':len(records),'failures':fails,'scope':'maximal-k points in the frozen IrRep tables; no invented generic-line labels','source_character_precision':'rounded decimal amplitudes and phase/pi'},
          'origin_transforms':origins,'records':records}
    (OUT/'bilbao-labels.json.gz').write_bytes(gzip.compress((json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8'),compresslevel=9,mtime=0))
    print('Bilbao complete',len(records),'failures',fails,flush=True)

if __name__=='__main__':main()
