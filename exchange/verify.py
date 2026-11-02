"""Independent recipient for the fixed mirror-grey global exchange protocol.

No producer import.  Geometry is independently rebuilt by the Phase 13 geometry
checker; exact matrix arithmetic is the documented Phase 11 dependency.
"""
from fractions import Fraction as F
from itertools import product, combinations
from pathlib import Path
import argparse, hashlib, importlib.util, json, sys
sys.path.insert(0, str(Path(__file__).parent / 'vendor'))
import exact_paths as A

NAMES = ['E', 'M', 'T', 'MT']
LEVELS = ['local', 'boundary', 'period', 'atlas', 'source']
SCOPE = 'Complete selected little-group family and declared torus gluing; not a DFT band-gap or arbitrary equivariant-bundle certificate.'
LIMITS = {'max_charts': 16, 'max_axis_sample_product': 50000,
          'max_coverage_comparisons': 500000, 'max_overlap_components': 1024,
          'max_triple_candidates': 100000}


def binding(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def require(value, message):
    if not value: raise ValueError(message)


def decode(raw, n=None):
    out = A.decode_matrix(raw)
    if n is not None: require(len(out) == n, 'matrix dimension')
    return out


def phase(turn):
    return {A.O: A.root(turn)}


def signed(m, bit):
    return A.neg(m) if bit else m


def semimul(a, b, anti):
    return A.mul(a, A.conj(b) if anti else b)


def check_rep(group, matrices, n):
    require(matrices['E'] == A.eye(n), 'identity matrix')
    for name in group:
        g = NAMES.index(name); D = matrices[name]
        require(A.mul(D, A.adj(D)) == A.eye(n), 'unitarity ' + name)
        for other in group:
            h = NAMES.index(other)
            sign = ((g & 1) * (h & 1) + (g >> 1) * (h >> 1)) % 2
            require(semimul(D, matrices[other], g >= 2) == signed(matrices[NAMES[g ^ h]], sign), 'semilinear group law ' + name + '*' + other)


def direct_sum(branches, multiplicities, name):
    blocks = []
    for b, m in zip(branches, multiplicities):
        blocks += [decode(b['matrices'][name], b['dimension'])] * m
    n = sum(map(len, blocks)); out = A.zero(n); at = 0
    for block in blocks:
        for i, row in enumerate(block):
            for j, x in enumerate(row): out[at + i][at + j] = x
        at += len(block)
    return out


def catalogue(row):
    group = row['group']; branches = row['branches']; mult = row['multiplicities']
    allowed = {('E',): ([1], 'unitary'), ('E', 'M'): ([1, 1], 'unitary'), ('E', 'T'): ([2], 'b'), ('E', 'MT'): ([1], 'a'), tuple(NAMES): ([2], 'c')}
    require(tuple(group) in allowed, 'unsupported little subgroup')
    dims, kind = allowed[tuple(group)]
    require(all(type(b['dimension']) is int for b in branches) and [b['dimension'] for b in branches] == dims and row['wigner_type'] == kind, 'complete irreducible catalogue shape / Wigner class')
    require(len({b['id'] for b in branches}) == len(branches), 'duplicate branch ID')
    require(len(mult) == len(branches) and all(type(m) is int and m >= 0 for m in mult), 'selected multiplicities')
    require(sum(m * b['dimension'] for b, m in zip(branches, mult)) == 2, 'selected rank must be two')
    for b in branches:
        require(set(b['matrices']) == set(group), 'reference operation set')
        check_rep(group, {g: decode(raw, b['dimension']) for g, raw in b['matrices'].items()}, b['dimension'])
    if group == ['E', 'M']:
        # The two roots exhaust the projective C2 group algebra.  Counting two
        # branches alone would incorrectly accept a duplicated mirror branch.
        chars = [decode(b['matrices']['M'])[0][0] for b in branches]
        require(any(x == phase(F(1, 4)) for x in chars) and any(x == phase(F(-1, 4)) for x in chars), 'mirror irreducible completeness / inequivalence')
    # A T^2=-1 antiunitary has no invariant complex line, proving the T-only
    # two-dimensional branch irreducible.  In the full group T exchanges the
    # two inequivalent +/-i mirror lines.  For MT, its square is +1 and every
    # one-dimensional phase is equivalent.  These five subgroup classifications
    # exhaust the group; see THEOREMS.md rather than a numerical rank proxy.
    return {g: direct_sum(branches, mult, g) for g in group}


def geometric_module():
    path = Path(__file__).parent / 'vendor' / 'exact_geometry.py'
    if not path.exists(): path = Path(__file__).parent.parent / 'geometry' / 'exact_geometry.py'
    spec = importlib.util.spec_from_file_location('recipient_geometry', path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod


def matrices_product(matrices, displacement):
    out = A.eye(2)
    for axis, n in enumerate(displacement):
        for _ in range(abs(n)):
            out = A.mul(matrices[axis] if n > 0 else A.adj(matrices[axis]), out)
    return out


def atlas_components(charts):
    require(type(charts) is list and charts, 'nonempty chart list')
    if len(charts)>LIMITS['max_charts']: raise A.Budget('atlas chart count budget')
    require(len({v['id'] for v in charts}) == len(charts), 'chart IDs')
    boxes = {v['id']: (tuple(map(A.rational, v['lower'])), tuple(map(A.rational, v['upper']))) for v in charts}
    for lo, hi in boxes.values():
        require(len(lo) == len(hi) == 3 and all(0 < b - a < 1 and -1 <= a < b <= 2 for a, b in zip(lo, hi)), 'lifted chart widths or coordinate bounds')
    # Exhaustive rational axis decomposition of all projected box boundaries.
    axes = []
    for a in range(3):
        cuts = sorted({F(0), F(1)} | {x[a] % 1 for box in boxes.values() for x in box})
        axes.append(cuts + [(x + y) / 2 for x, y in zip(cuts, cuts[1:])])
    samples=len(axes[0])*len(axes[1])*len(axes[2])
    if samples>LIMITS['max_axis_sample_product'] or samples*len(boxes)>LIMITS['max_coverage_comparisons']:
        raise A.Budget('atlas coverage enumeration budget')
    for q in product(*axes):
        require(any(all(any(lo[a] < q[a] + n < hi[a] for n in (-1, 0, 1)) for a in range(3)) for lo, hi in boxes.values()), 'atlas does not cover torus')
    out = {}
    for sid, (slo, shi) in boxes.items():
        for tid, (tlo, thi) in boxes.items():
            for n in product(range(-2, 3), repeat=3):
                lo = tuple(max(slo[a], tlo[a] - n[a]) for a in range(3)); hi = tuple(min(shi[a], thi[a] - n[a]) for a in range(3))
                if all(a < b for a, b in zip(lo, hi)): out[(sid, tid, n)] = (lo, hi)
                if len(out)>LIMITS['max_overlap_components']:raise A.Budget('atlas overlap component budget')
    if len(out)**2>LIMITS['max_triple_candidates']:raise A.Budget('atlas triple candidate budget')
    return out


def verify(problem, cert, level='source'):
    stage = 'contract'; counts = {}; passed = []
    try:
        A.tree(problem);A.tree(cert)
        require(type(problem) is dict and type(cert) is dict, 'problem and certificate must be objects')
        require(set(problem)=={'schema','model','rank','geometry_problem','charts','source_carrier','spin_convention','scope'}, 'problem keys')
        require(level in LEVELS, 'unknown inspection layer')
        require(problem['schema'] == 'mirror-grey-global-problem-v1' and type(problem['rank']) is int and problem['rank'] == 2 and problem['model'] == 'spinful-diagonal-mirror-grey', 'unsupported model contract')
        require(problem['scope']==SCOPE and problem['spin_convention']=='M^2=T^2=-I; MT=TM semilinearly', 'fixed scope and spin-convention declaration')
        require(cert['schema'] == 'mirror-grey-global-certificate-v1' and cert['problem_sha256'] == binding(problem), 'problem binding')
        require(set(cert) == {'schema','problem_sha256','geometry','catalogues','source_gauge','carrier','periods','cells','boundaries','seams','atlas','producer'}, 'certificate keys')
        gp = problem['geometry_problem']
        require(type(gp) is dict, 'geometry problem must be an object')
        require(gp.get('period_axes',[0,1,2])==[0,1,2] and all(type(x) is int for x in gp.get('period_axes',[0,1,2])), 'global contract requires all three periodic axes')
        expected_ops = [('E', False, [[1,0,0],[0,1,0],[0,0,1]]), ('M', False, [[0,1,0],[1,0,0],[0,0,1]]), ('T', True, [[1,0,0],[0,1,0],[0,0,1]]), ('MT', True, [[0,1,0],[1,0,0],[0,0,1]])]
        require([(x['id'], x['anti'], x['rotation']) for x in gp['operations']] == expected_ops, 'fixed mirror-grey space-group input')
        stage = 'geometry'
        geom = geometric_module().verify(gp, cert['geometry'])
        if geom['status'] == 'UNRESOLVED': raise A.Budget(geom['reason'])
        require(geom['status'] == 'CERTIFIED', 'geometry: ' + geom.get('reason', ''))
        counts.update(geom['counts']); passed.append(stage)
        stage = 'local'
        require(set(cert['carrier']) == set(NAMES), 'carrier operation set')
        C = {g: decode(raw, 2) for g, raw in cert['carrier'].items()}
        check_rep(NAMES, C, 2)
        Fs = {key: catalogue(row) for key, row in cert['catalogues'].items()}
        geometry_cells = {r['id']: r for r in cert['geometry']['cells']}
        records = {r['id']: r for r in cert['cells']}
        require(set(records) == set(geometry_cells) and len(records) == len(cert['cells']), 'selected cell inventory')
        L = {}; Fcells = {}
        for cid, row in records.items():
            group = geometry_cells[cid]['stabilizer']; ref = cert['catalogues'][row['catalogue']]
            require(ref['group'] == group, 'catalogue uses wrong actual stabilizer')
            Fcells[cid] = Fs[row['catalogue']]; L[cid] = decode(row['embedding'], 2)
            require(A.mul(L[cid], A.adj(L[cid])) == A.eye(2), 'embedding unitarity')
            for g in group:
                require(semimul(C[g], L[cid], NAMES.index(g) >= 2) == A.mul(L[cid], Fcells[cid][g]), 'carrier decomposition at ' + cid + '/' + g)
        counts['catalogues'] = len(Fs); passed.append(stage)
        if level == stage: return {'status': 'PASS_REQUESTED_LAYER', 'layer': level, 'passed': passed, 'counts': counts}
        stage = 'boundary'
        boundaries = {(r['source'], r['target']): decode(r['matrix'], 2) for r in cert['boundaries']}
        wanted = {tuple(x) for x in cert['geometry']['incidences']}
        require(set(boundaries) == wanted and len(boundaries) == len(cert['boundaries']), 'complete boundary inventory')
        for (h, l), W in boundaries.items():
            require(A.mul(L[l], W) == L[h], 'boundary common-carrier binding')
            for g in Fcells[h]: require(semimul(Fcells[l][g], W, NAMES.index(g) >= 2) == A.mul(W, Fcells[h][g]), 'enhancement restriction')
        chains = 0
        for (h, m), W in boundaries.items():
            for l in (x[1] for x in boundaries if x[0] == m):
                require(A.mul(boundaries[m, l], W) == boundaries[h, l], 'restriction-chain coherence'); chains += 1
        counts['restriction_chains'] = chains; passed.append(stage)
        if level == stage: return {'status': 'PASS_REQUESTED_LAYER', 'layer': level, 'passed': passed, 'counts': counts}
        stage = 'period'
        require(len(cert['periods']) == 3, 'three periods required')
        S = [decode(raw, 2) for raw in cert['periods']]
        for a, s in enumerate(S):
            require(A.mul(s, A.adj(s)) == A.eye(2), 'period unitarity')
            shift = tuple(F(i == a) for i in range(3))
            for g in NAMES: require(A.mul(s, C[g]) == semimul(A.pull(C[g], b=shift), s, NAMES.index(g) >= 2), 'period-carrier covariance')
        for a, b in combinations(range(3), 2):
            ea = tuple(F(i == a) for i in range(3)); eb = tuple(F(i == b) for i in range(3))
            require(A.mul(A.pull(S[b], b=ea), S[a]) == A.mul(A.pull(S[a], b=eb), S[b]), 'shifted mixed-period square')
        require(all(type(r['axis']) is int and r['axis'] in (0,1,2) for r in cert['seams']), 'integer seam axis required')
        seams = {(r['axis'], r['source'], r['target']): decode(r['matrix'], 2) for r in cert['seams']}
        wanted_seams = {(r['axis'], r['source'], r['target']) for r in cert['geometry']['period_pairs']}
        require(set(seams) == wanted_seams and len(seams) == len(cert['seams']), 'complete seam inventory')
        for (a, s, t), P in seams.items():
            shift = tuple(F(i == a) for i in range(3))
            require(A.mul(A.pull(L[t], b=shift), P) == A.mul(S[a], L[s]), 'selected seam binding')
        # Naturality and every square/cube follow from these same embeddings;
        # additionally recompute every submitted geometric square and cube.
        skeys = {(a, s): (t, P) for (a,s,t),P in seams.items()}
        for square in cert['geometry']['period_squares']:
            a,b = square['axes']; s = square['source']
            ta,pa=skeys[a,s]; tb,pb=skeys[b,s]
            ea=tuple(F(i==a) for i in range(3)); eb=tuple(F(i==b) for i in range(3))
            require(A.mul(A.pull(skeys[b,ta][1],b=ea),pa)==A.mul(A.pull(skeys[a,tb][1],b=eb),pb), 'selected mixed square')
        for cube in cert['geometry']['period_cubes']:
            values=[]
            for route in cube['paths']:
                ans=A.eye(2); shift=[F(0)]*3
                for a,s in zip(route['axes'],route['cells']):
                    ans=A.mul(A.pull(skeys[a,s][1],b=tuple(shift)),ans);shift[a]+=1
                values.append(ans)
            require(all(x==values[0] for x in values), 'six selected cube paths')
        passed.append(stage)
        if level == stage: return {'status': 'PASS_REQUESTED_LAYER', 'layer': level, 'passed': passed, 'counts': counts}
        stage = 'atlas'
        components=atlas_components(problem['charts'])
        require(all(type(r['shift']) is list and len(r['shift'])==3 and all(type(n) is int for n in r['shift']) for r in cert['atlas']), 'integer atlas shift triple required')
        rows={(r['source'],r['target'],tuple(r['shift'])):r for r in cert['atlas']}
        require(set(rows)==set(components) and len(rows)==len(cert['atlas']), 'all actual lifted atlas overlap components')
        transitions={}
        # This v1 contract has constant period matrices. This is checked, never
        # inferred by evaluating at a single momentum.
        require(all(all(all(k==A.O for k in x) for x in row) for s in S for row in s), 'v1 atlas contract requires constant period matrices')
        for key,(lo,hi) in components.items():
            row=rows[key]; require(row['lower']==list(map(str,lo)) and row['upper']==list(map(str,hi)), 'atlas overlap domain')
            transitions[key]=decode(row['matrix'],2)
            require(transitions[key]==matrices_product(S,key[2]), 'atlas-to-carrier binding')
        triples=0
        for (i,j,n),(lo,hi) in components.items():
            for (j2,k,m),(lo2,hi2) in components.items():
                if j2!=j:continue
                if all(max(lo[a],lo2[a]-n[a])<min(hi[a],hi2[a]-n[a]) for a in range(3)):
                    nm=tuple(n[a]+m[a] for a in range(3))
                    require(A.mul(transitions[j,k,m],transitions[i,j,n])==transitions[i,k,nm], 'atlas triple cocycle'); triples+=1
        counts['atlas_overlaps']=len(components);counts['atlas_triples']=triples;passed.append(stage)
        if level == stage:return {'status':'PASS_REQUESTED_LAYER','layer':level,'passed':passed,'counts':counts}
        stage='source'
        one=phase(0)
        expected={'E':A.eye(2),'M':[[{},phase(F(-1,8))],[A.pneg(phase(F(1,8))),{}]],'T':[[{},one],[A.pneg(one),{}]]}
        expected['MT']=A.mul(expected['M'],expected['T'])
        require({g:decode(raw,2) for g,raw in problem['source_carrier'].items()}==expected,'fixed physical spin convention')
        U=decode(cert['source_gauge'],2);require(A.mul(U,A.adj(U))==A.eye(2),'source gauge unitarity')
        for g in NAMES:require(C[g]==A.mul(A.mul(U,expected[g]),A.adj(A.conj(U) if NAMES.index(g)>=2 else U)),'source-carrier gauge binding '+g)
        for a in range(3):
            shift=tuple(F(i==a) for i in range(3));require(S[a]==A.mul(A.pull(U,b=shift),A.adj(U)),'source-period gauge binding')
        passed.append(stage)
        return {'status':'CERTIFIED','layer':level,'passed':passed,'counts':counts,'problem_sha256':binding(problem),'scope':SCOPE}
    except A.Budget as exc:return {'status':'UNRESOLVED','stage':stage,'reason':str(exc),'passed':passed}
    except (ValueError,KeyError,TypeError,IndexError,ZeroDivisionError) as exc:return {'status':'INVALID','stage':stage,'reason':str(exc),'passed':passed}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--problem',required=True);p.add_argument('--certificate',required=True);p.add_argument('--layer',choices=LEVELS,default='source');args=p.parse_args()
    try:
        paths=[Path(args.problem),Path(args.certificate)]
        if any(x.stat().st_size>16*1024*1024 for x in paths):raise A.Budget('input byte budget')
        problem,cert=[json.loads(x.read_text(encoding='utf-8')) for x in paths];result=verify(problem,cert,args.layer)
    except A.Budget as exc:result={'status':'UNRESOLVED','stage':'input','reason':str(exc)}
    except (OSError,ValueError,RecursionError) as exc:result={'status':'INVALID','stage':'input','reason':str(exc)}
    print(json.dumps(result,indent=2,ensure_ascii=False));return 0 if result['status'] in ('CERTIFIED','PASS_REQUESTED_LAYER') else (3 if result['status']=='UNRESOLVED' else 2)


if __name__=='__main__':raise SystemExit(main())
