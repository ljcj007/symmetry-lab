"""Transparent finite models for the symmetry teaching demonstrations.

Only Python's standard library is required. Cartesian operations are active,
vectors are columns, and AB acts with B first. Molecular displacement patterns
are symmetry-adapted schematic coordinates, not fitted normal-mode eigenvectors.
"""
from __future__ import annotations

import math

RELEASE = "20261111-foundations-demos1"
SOURCES = [
    {"title": "Quanty: proper D4 character table and axes", "url": "https://www.quanty.org/physics_chemistry/point_groups/d4"},
    {"title": "Requist, Proetto and Gross: linear E⊗e Jahn–Teller model", "url": "https://doi.org/10.1103/PhysRevA.96.062503"},
    {"title": "University of Braunschweig: water vibrational symmetry", "url": "https://www.pci.tu-bs.de/aggericke/PC4e/Kap_V/H2O_Schwingungen.html"},
    {"title": "IUCr: crystallographic point groups", "url": "https://dictionary.iucr.org/Crystallographic_point_group"},
]


def _num(p, key, default, low=-100., high=100.):
    x = p.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not low <= x <= high:
        raise ValueError(f"{key}: expected a finite number between {low} and {high}")
    return float(x)


def _int(p, key, default, low, high):
    x = _num(p, key, default, low, high)
    if int(x) != x:
        raise ValueError(f"{key}: expected an integer")
    return int(x)


def _eye(n):
    return [[int(i == j) for j in range(n)] for i in range(n)]


def _transpose(a):
    return [list(row) for row in zip(*a)]


def _mm(a, b):
    bt = _transpose(b)
    return [[sum(x*y for x, y in zip(row, col)) for col in bt] for row in a]


def _mv(a, v):
    return [sum(x*y for x, y in zip(row, v)) for row in a]


def _trace(a):
    return sum(a[i][i] for i in range(len(a)))


def _scale(a, s):
    return [[s*x for x in row] for row in a]


def _sum_matrices(items, n):
    result = [[0. for _ in range(n)] for _ in range(n)]
    for matrix in items:
        result = [[a+b for a, b in zip(ar, br)] for ar, br in zip(result, matrix)]
    return result


def _err(a, b):
    return max(abs(x-y) for ar, br in zip(a, b) for x, y in zip(ar, br))


def _normalized(vector):
    norm = math.sqrt(sum(x*x for x in vector))
    return [x/norm for x in vector] if norm > 1e-12 else None


def _base(experiment, title):
    return {"schemaVersion": 1, "release": RELEASE, "experiment": experiment, "title": title,
            "conventions": "active Cartesian operations; column vectors; AB applies B first",
            "sources": SOURCES}


def _reduce(chars, sizes, rows):
    order = sum(sizes)
    return {name: int(round(sum(n*x*y for n, x, y in zip(sizes, chars, row))/order))
            for name, row in rows.items()}


C2V_ROWS = {"A1": [1, 1, 1, 1], "A2": [1, 1, -1, -1],
            "B1": [1, -1, 1, -1], "B2": [1, -1, -1, 1]}


def water_demo(params=None):
    p = params or {}
    mode = p.get("mode", "symmetric")
    if mode not in ("symmetric", "bend", "antisymmetric"):
        raise ValueError("mode must be symmetric, bend, or antisymmetric")
    phase = _num(p, "phase", 45., -3600., 3600.)
    amplitude = _num(p, "amplitude", .15, 0., .5)
    angle = _num(p, "angle", 104.5, 60., 150.)
    theta = math.radians(angle/2)
    a, b = math.sin(theta), math.cos(theta)
    sites = [[0., 0., 0.], [a, 0., b], [-a, 0., b]]
    mass = [16., 1., 1.]
    # Internal-coordinate variations followed by removal of rigid translations
    # and rotations. The two A1 coordinates can mix in an actual force field.
    raw = {"symmetric": [[0., 0., 0.], [a, 0., b], [-a, 0., b]],
           "bend": [[0., 0., 0.], [b, 0., -a], [-b, 0., -a]],
           "antisymmetric": [[0., 0., 0.], [a, 0., b], [a, 0., -b]]}
    center = [sum(m*r[j] for m, r in zip(mass, sites))/sum(mass) for j in range(3)]
    centered = [[r[j]-center[j] for j in range(3)] for r in sites]
    patterns = {}
    residuals = {}
    for key, pattern in raw.items():
        mean = [sum(m*u[j] for m, u in zip(mass, pattern))/sum(mass) for j in range(3)]
        u = [[v[j]-mean[j] for j in range(3)] for v in pattern]
        inertia = sum(m*(r[0]**2+r[2]**2) for m, r in zip(mass, centered))
        ly = sum(m*(r[2]*v[0]-r[0]*v[2]) for m, r, v in zip(mass, centered, u))
        omega = ly/inertia
        u = [[v[0]-omega*r[2], v[1], v[2]+omega*r[0]] for r, v in zip(centered, u)]
        norm = max(math.sqrt(sum(x*x for x in v)) for v in u)
        u = [[x/norm for x in v] for v in u]
        patterns[key] = u
        residuals[key] = {"translation": max(abs(sum(m*v[j] for m, v in zip(mass, u))) for j in range(3)),
                          "rotation": abs(sum(m*(r[2]*v[0]-r[0]*v[2]) for m, r, v in zip(mass, centered, u)))}
    scale = amplitude*math.sin(math.radians(phase))
    positions = [[r[j]+scale*u[j] for j in range(3)] for r, u in zip(sites, patterns[mode])]
    fixed, vector = [3, 1, 3, 1], [3, -1, 1, 1]
    displacement = [n*x for n, x in zip(fixed, vector)]
    trans, rot = [3, -1, 1, 1], [3, -1, -1, -1]
    vib = [a-b-c for a, b, c in zip(displacement, trans, rot)]
    decomp = _reduce(vib, [1]*4, C2V_ROWS)
    mode_rows = [{"id": "symmetric", "label": "symmetric stretch", "irrep": "A1", "irPolarizations": ["z"], "ramanComponents": ["xx", "yy", "zz"]},
                 {"id": "bend", "label": "bend", "irrep": "A1", "irPolarizations": ["z"], "ramanComponents": ["xx", "yy", "zz"]},
                 {"id": "antisymmetric", "label": "antisymmetric stretch", "irrep": "B1", "irPolarizations": ["x"], "ramanComponents": ["xz", "zx"]}]
    out = _base("water", "Water: displacement characters and vibrational selection rules")
    out.update({"group": "C2v", "axisConvention": "water in xz; C2 axis z; x/y exchange relabels B1 as B2",
                "classes": ["E", "C2(z)", "sigma(xz)", "sigma(yz)"],
                "characterTable": {"classes": ["E", "C2(z)", "sigma(xz)", "sigma(yz)"], "sizes": [1]*4, "rows": C2V_ROWS},
                "characters": {"fixed": fixed, "vector": vector, "displacement": displacement, "translation": trans, "rotation": rot, "vibration": vib},
                "decomposition": {"displacement": _reduce(displacement, [1]*4, C2V_ROWS), "translation": _reduce(trans, [1]*4, C2V_ROWS), "rotation": _reduce(rot, [1]*4, C2V_ROWS), "vibration": decomp},
                "atoms": [{"element": "O", "mass": 16.}, {"element": "H", "mass": 1.}, {"element": "H", "mass": 1.}],
                "equilibrium": sites, "positions": positions, "displacements": patterns[mode], "patterns": patterns,
                "modes": mode_rows, "mode": mode, "selection": next(row for row in mode_rows if row["id"] == mode),
                "modelNote": "Schematic symmetry-adapted motions, with rigid translation and rotation removed; no force constants, frequencies or absolute intensities are computed. A1 motions can mix in true normal modes.",
                "checks": {"passed": decomp == {"A1": 2, "A2": 0, "B1": 1, "B2": 0} and all(max(v.values()) < 1e-10 for v in residuals.values()), "rigidResiduals": residuals, "vibrationalDimensions": sum(decomp.values())}})
    return out


def characters_demo(params=None):
    p = params or {}
    choice = p.get("rotation", p.get("operation", "C4"))
    matrices = {"identity": _eye(3), "C4": [[0,-1,0],[1,0,0],[0,0,1]],
                "C2": [[-1,0,0],[0,-1,0],[0,0,1]], "mirror": [[1,0,0],[0,-1,0],[0,0,1]]}
    if choice not in matrices:
        raise ValueError("rotation must be identity, C4, C2, or mirror")
    basis = p.get("basis", "xyz")
    if basis not in ("xyz", "xy"):
        raise ValueError("basis must be xyz or xy")
    full = matrices[choice]
    xy = [row[:2] for row in full[:2]]
    chosen = full if basis == "xyz" else xy
    det = full[0][0]*full[1][1]-full[0][1]*full[1][0]
    power, order = _eye(3), None
    for k in range(1, 5):
        power = _mm(full, power)
        if power == _eye(3):
            order = k
            break
    out = _base("characters", "A character is the trace in a declared representation")
    out.update({"operation": choice, "basis": basis, "matrix": chosen, "fullMatrix": full, "xyMatrix": xy,
                "trace": _trace(chosen), "character": _trace(chosen), "fullTrace": _trace(full), "xyTrace": _trace(xy), "determinant": det, "order": order,
                "c4vClasses": ["E", "2C4", "C2", "2sigma_v", "2sigma_d"],
                "c4vClassSizes": [1,2,1,2,2], "c4vVectorCharacters": [3,1,-1,1,1],
                "c4vCharacters": {"A1": [1,1,1,1,1], "A2": [1,1,1,-1,-1], "B1": [1,-1,1,1,-1], "B2": [1,-1,1,-1,1], "E": [2,0,-2,0,0]},
                "decomposition": {"A1": 1, "A2": 0, "B1": 0, "B2": 0, "E": 1},
                "checks": {"passed": order is not None and _trace(full) == _trace(xy)+1},
                "modelNote": "The same operation has different characters in xyz and xy. Zero trace does not imply the zero matrix. The vector representation is A1(z) + E(x,y)."})
    return out


def _permutation_matrix(permutation):
    return [[int(permutation[j] == i) for j in range(len(permutation))] for i in range(len(permutation))]


def d3_demo(params=None):
    p = params or {}
    choice = _int(p, "operation", 1, 0, 5)
    seed = _int(p, "seedSite", 0, 0, 2)
    row = _int(p, "row", 0, 0, 1)
    irrep = p.get("irrep", "E")
    if irrep not in ("A1", "A2", "E"):
        raise ValueError("irrep must be A1, A2 or E")
    permutations = [[0,1,2],[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]]
    names = ["E", "C3+", "C3-", "C2(1)", "C2(2)", "C2(3)"]
    matrices = [_permutation_matrix(q) for q in permutations]
    a1 = [1/math.sqrt(3)]*3
    u, v = [2/math.sqrt(6), -1/math.sqrt(6), -1/math.sqrt(6)], [0.,1/math.sqrt(2),-1/math.sqrt(2)]
    basis = [[a1[i], u[i], v[i]] for i in range(3)]
    ebasis = [[u[i],v[i]] for i in range(3)]
    ematrices = [_mm(_mm(_transpose(ebasis), m), ebasis) for m in matrices]
    chars = {"A1": [1]*6, "A2": [1,1,1,-1,-1,-1], "E": [2,-1,-1,0,0,0]}
    dimensions = {"A1": 1, "A2": 1, "E": 2}
    projectors = {name: _scale(_sum_matrices([_scale(m,c) for m,c in zip(matrices,cs)],3),dimensions[name]/6) for name,cs in chars.items()}
    rows = [_scale(_sum_matrices([_scale(m,d[j][0]) for m,d in zip(matrices,ematrices)],3),2/6) for j in range(2)]
    seedvec = [int(j == seed) for j in range(3)]
    raw = _mv(projectors[irrep], seedvec)
    rowraw = _mv(rows[row], seedvec)
    table = []
    hom_error = 0.
    for i, a in enumerate(matrices):
        multiplication_row = []
        for j,b in enumerate(matrices):
            product = _mm(a,b)
            k = matrices.index(product)
            multiplication_row.append(k)
            hom_error = max(hom_error,_err(_mm(ematrices[i],ematrices[j]),ematrices[k]))
        table.append(multiplication_row)
    orth_error = _err(_mm(_transpose(basis),basis),_eye(3))
    invariance = max(_err(_mm(m,ebasis),_mm(ebasis,d)) for m,d in zip(matrices,ematrices))
    out = _base("projection", "D3 triangle: project scalar site functions into A1 and E")
    out.update({"group": "D3", "vertices": [[1.,0.,0.],[-.5,math.sqrt(3)/2,0.],[-.5,-math.sqrt(3)/2,0.]],
                "operationNames": names, "operations": [{"name": name,"permutation":perm,"matrix":m,"character":_trace(m),"eMatrix":d} for name,perm,m,d in zip(names,permutations,matrices,ematrices)],
                "characterTable": {"classes":["E","2C3","3C2"],"sizes":[1,2,3],"rows":{"A1":[1,1,1],"A2":[1,1,-1],"E":[2,-1,0]}},
                "characters": [3,0,1], "multiplicities": {"A1":1,"A2":0,"E":1},
                "basis": {"A1": a1, "E": [u,v], "columns": basis, "exact": ["(s1+s2+s3)/sqrt(3)","(2s1-s2-s3)/sqrt(6)","(s2-s3)/sqrt(2)"]},
                "projectors": projectors, "rowProjectors": rows, "multiplicationTable": table,
                "selected": {"operation":choice,"seedSite":seed,"irrep":irrep,"row":row,"matrix":matrices[choice],"eMatrix":ematrices[choice],
                             "rawProjection":raw,"normalizedProjection":_normalized(raw),"rowProjection":rowraw,"normalizedRowProjection":_normalized(rowraw),
                             "isZero":_normalized(raw) is None},
                "checks": {"passed": max(hom_error,orth_error,invariance)<1e-10,"multiplicationResidual":hom_error,"orthogonalityResidual":orth_error,"invarianceResidual":invariance},
                "modelNote": "Three scalar s-like functions on the vertices; D3 contains proper C2 rotations, not mirrors. Its action on this planar scalar set is isomorphic to the C3v permutation action. Character projection selects the whole E subspace; the declared E matrices and row projectors fix partner functions."})
    return out


def splitting_demo(params=None):
    p = params or {}
    delta = _num(p,"delta",p.get("splitting",1.),0.,10.)
    ds = _num(p,"ds",.08,-2.,2.)
    dt = _num(p,"dt",.02,-2.,2.)
    orbitals = [{"id":"z2","label":"d_(3z²-r²)","parent":"E","irrep":"A1","energy":.6*delta-2*ds-6*dt,"degeneracy":1},
                {"id":"x2-y2","label":"d_(x²-y²)","parent":"E","irrep":"B1","energy":.6*delta+2*ds-dt,"degeneracy":1},
                {"id":"xy","label":"d_xy","parent":"T2","irrep":"B2","energy":-.4*delta+2*ds-dt,"degeneracy":1},
                {"id":"xz-yz","label":"(d_xz,d_yz)","parent":"T2","irrep":"E","energy":-.4*delta-ds+4*dt,"degeneracy":2}]
    barycenter = sum(o["degeneracy"]*o["energy"] for o in orbitals)/5
    out = _base("splitting","SO(3) → O → D4: restriction of the l = 2 orbital representation")
    out.update({"delta":delta,"ds":ds,"dt":dt,"orbitals":orbitals,"barycenter":barycenter,
                "stages":[{"group":"SO(3)","levels":[{"irrep":"l=2","energy":0.,"degeneracy":5}]},
                          {"group":"O","levels":[{"irrep":"E","energy":.6*delta,"degeneracy":2},{"irrep":"T2","energy":-.4*delta,"degeneracy":3}]},
                          {"group":"D4","levels":orbitals}],
                "branching":{"SO3_to_O":"l=2 → E + T2","O_to_D4":{"E":["A1","B1"],"T2":["B2","E"]}},
                "d4Classes":["E","2C4","C2(z)","2C2(x,y)","2C2(diagonal)"],"d4ClassSizes":[1,2,1,2,2],
                "restrictedCharacters":{"l2":[5,-1,1,1,1],"O_E":[2,0,2,2,0],"O_T2":[3,-1,-1,-1,1]},
                "checks":{"passed":abs(barycenter)<1e-12,"totalDimension":5,"weightedEnergySum":5*barycenter},
                "modelNote":"Single-electron orbital diagram without SOC. O and D4 are proper rotation groups, so labels have no g/u. For even d orbitals in Oh and D4h one can append g. Symmetry fixes branches and degeneracies, while delta, Ds and Dt set model energies and possible accidental coincidences."})
    return out


def jahn_teller_demo(params=None):
    p=params or {}
    qt=_num(p,"qtheta",.6,-3.,3.)
    qe=_num(p,"qepsilon",.0,-3.,3.)
    g=_num(p,"g",1.,0.,3.)
    k=_num(p,"k",1.,.05,5.)
    occupation=_int(p,"occupancy",3,1,4)
    occupancy={1:[1,0],2:[1,1],3:[2,1],4:[2,2]}[occupation]
    radius=math.hypot(qt,qe)
    eigen=[-g*radius,g*radius]
    harmonic=.5*k*radius*radius
    imbalance=occupancy[0]-occupancy[1]
    q0=imbalance*g/k
    stabilization=(imbalance*g)**2/(2*k)
    extent=max(2.,min(4.,q0+1.))
    radial=[]
    for i in range(81):
        r=extent*i/80
        radial.append({"q":r,"lower":.5*k*r*r-g*r,"upper":.5*k*r*r+g*r,"occupied":.5*k*r*r-imbalance*g*r})
    surfaces=[]
    for i in range(21):
        x=extent*(i/10-1)
        for j in range(21):
            y=extent*(j/10-1);r=math.hypot(x,y)
            surfaces.append({"qtheta":x,"qepsilon":y,"lower":.5*k*r*r-g*r,"upper":.5*k*r*r+g*r})
    out=_base("jt","Linear E⊗e Jahn–Teller model and orbital filling")
    out.update({"qtheta":qt,"qepsilon":qe,"g":g,"k":k,"radius":radius,"electronicMatrix":[[g*qt,g*qe],[g*qe,-g*qt]],
                "electronicEigenvalues":eigen,"surfaces":{"lower":harmonic+eigen[0],"upper":harmonic+eigen[1],"grid":surfaces,"radial":radial},
                "occupancy":occupancy,"electronCount":occupation,"minRadius":q0,"stabilization":stabilization,
                "plotExtent":extent,"minimumInGrid":q0<=extent,
                "potential":harmonic+sum(n*e for n,e in zip(occupancy,eigen)),
                "fillingCases":[{"electrons":1,"occupancy":[1,0],"label":"eg¹"},{"electrons":2,"occupancy":[1,1],"label":"high-spin eg²"},{"electrons":3,"occupancy":[2,1],"label":"d9: t2g⁶ eg³"},{"electrons":4,"occupancy":[2,2],"label":"d10: t2g⁶ eg⁴"}],
                "checks":{"passed":abs((.5*k*q0*q0-imbalance*g*q0)+stabilization)<1e-12,"minimumEnergy":-stabilization},
                "modelNote":"Adiabatic linear E⊗e toy model, no nuclear kinetic energy, tunnelling or quadratic warping. d9 eg³ illustrates one-electron imbalance. eg² uses an explicitly assumed high-spin filling, not a solved Hund model. A Kramers spin doublet alone is not an orbital Jahn–Teller argument; not every degeneracy is JT active."})
    return out


def macro_demo(params=None):
    p=params or {}
    n=_int(p,"n",4,1,12)
    translation=p.get("translation",[.5,0.,0.])
    if isinstance(translation,(int,float)) and not isinstance(translation,bool):
        translation=[float(translation),0.,0.]
    if not isinstance(translation,(list,tuple)) or len(translation)!=3:
        raise ValueError("translation must contain three finite numbers")
    t=[_num({"x":x},"x",0.,-2.,2.) for x in translation]
    angle=2*math.pi/n
    c,s=math.cos(angle),math.sin(angle)
    r=[[c,-s,0.],[s,c,0.],[0.,0.,1.]]
    plane_trace=2*c
    allowed=n in (1,2,3,4,6)
    out=_base("macro","Macroscopic point symmetry and the crystallographic restriction")
    out.update({"n":n,"allowedOrders":[1,2,3,4,6],"allowed":allowed,"rotation":r,"planeTrace":plane_trace,
                "traceIsInteger":abs(plane_trace-round(plane_trace))<1e-10,"seitz":{"rotation":r,"translation":t},"macroscopic":{"rotation":r,"translationRemoved":True},
                "examples":[{"spaceGroup":"P m -3 m","number":221,"pointGroup":"m -3 m","crystalSystem":"cubic"},
                            {"spaceGroup":"P 4 3 2","number":207,"pointGroup":"432","crystalSystem":"cubic"}],
                "polarPointGroups":["1","2","m","mm2","4","4mm","3","3m","6","6mm"],
                "checks":{"passed":allowed==(abs(plane_trace-round(plane_trace))<1e-10),"determinant":1.},
                "modelNote":"For a three-dimensional periodic crystal, macroscopic point symmetry is the point-group quotient G/T: retain linear parts of all space-group operations, including screws and glides. It is not the site-symmetry group of a selected atom or necessarily the symmetry of a finite specimen. Noncrystallographic molecular and quasicrystal rotations are distinct settings."})
    return out


def run(params=None):
    if params is not None and not isinstance(params,dict):
        raise ValueError("parameters must be an object")
    p=params or {}
    theme=p.get("experiment",p.get("theme","water"))
    handlers={"water":water_demo,"characters":characters_demo,"d3":d3_demo,"projection":d3_demo,
              "splitting":splitting_demo,"jt":jahn_teller_demo,"macro":macro_demo}
    if theme not in handlers:
        raise ValueError("unknown foundations demonstration")
    return handlers[theme](p)
