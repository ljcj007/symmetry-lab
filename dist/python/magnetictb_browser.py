"""Numerical Python tight-binding tools for Symmetry Lab (GPL-3.0-only).

Port of the symmetry/bond workflow in MagneticTB, Zhang et al., CPC 270 (2022)
108153, upstream commit 3575e8356af282c9d9447bfbf03e282ef3bac77d. This is an
independent NumPy implementation, NOT the upstream Rust extension or a complete
replacement for its exact symbolic API. See MAGNETICTB_COVERAGE in this module.

Lattice vectors are ROWS. Positions and k are fractional. Rotation matrices act
on direct-coordinate COLUMNS. H_ij(k)=sum_R t_ij(R)*exp(2*pi*i*k.R), a periodic
orbital gauge; energies have the same unit as the input hopping parameters.
All complex JSON scalars are [real, imaginary]. The run() interface is usable
unchanged in CPython and Pyodide. No network, files, eval, or native extensions.
"""

from __future__ import annotations

import itertools
import math
import numpy as np

MAGNETICTB_COVERAGE = {
    "upstream_commit": "3575e8356af282c9d9447bfbf03e282ef3bac77d",
    "implemented": ["site-orbit expansion", "real s/p/d orbital representations",
        "spin-1/2 and antiunitary operations", "custom local representations",
        "numerical symmetry-constrained hopping basis", "Bloch bands",
        "Wannier90 hr import/export", "finite and slab Hamiltonians",
        "surface Green function", "Wilson loop/Berry phase", "FHS Chern number", "Kubo Berry curvature",
        "unitary little-group band characters"],
    "not_implemented": ["exact cyclotomic/symbolic algebra", "automatic Wyckoff lookup",
        "full spin-space-group catalog/continuous spin groups", "arbitrary polynomial orbitals",
        "site-irrep induction API initfromrep", "band fitting/DFT parsers",
        "automatic standard k-path", "gapless-point search", "Z2 invariant",
        "automatic published irrep/corep labels", "full upstream API compatibility"],
}
TOL = 1e-8
I3 = np.eye(3)


def _require(condition, message):
    if not condition:
        raise ValueError(message)


def _real(value, shape=None, name="array"):
    arr = np.asarray(value, dtype=float)
    _require(np.all(np.isfinite(arr)), f"{name} must contain finite real numbers")
    if shape is not None:
        _require(arr.shape == shape, f"{name} must have shape {shape}")
    return arr


def _integer(value, lo, hi, name):
    _require(not isinstance(value, bool) and float(value).is_integer(), f"{name} must be an integer")
    value = int(value)
    _require(lo <= value <= hi, f"{name} must be between {lo} and {hi}")
    return value


def _complex(value):
    if isinstance(value, dict):
        result = complex(value.get("re", 0), value.get("im", 0))
    elif isinstance(value, (list, tuple)):
        _require(len(value) == 2, "A complex number must be [real, imaginary]")
        result = complex(*value)
    else:
        result = complex(value)
    _require(np.isfinite(result), "Complex entries must be finite")
    return result


def _cmatrix(value, shape=None):
    arr = np.array([[_complex(z) for z in row] for row in value], dtype=complex)
    if shape is not None:
        _require(arr.shape == shape, f"Complex matrix must have shape {shape}")
    return arr


def _json_complex(value):
    arr = np.asarray(value)
    if arr.ndim == 0:
        z = complex(arr)
        return [float(z.real), float(z.imag)]
    return [_json_complex(v) for v in arr]


def _max(value):
    return float(np.max(np.abs(value), initial=0))


def _key_position(position):
    return tuple(np.round(np.mod(position, 1) % 1, 8))


def _op_key(rotation, translation, anti):
    return (tuple(np.rint(rotation).astype(int).flat),
            tuple(np.round(np.mod(translation, 1), 7) % 1), bool(anti))


def _operations(raw, lattice, periodic):
    _require(isinstance(raw, list) and 0 < len(raw) <= 384, "Supply 1–384 complete symmetry operations")
    result = []
    lookup = {}
    metric_residual = 0.
    for index, op in enumerate(raw):
        rotation = _real(op.get("rotation"), (3, 3), "rotation")
        _require(_max(rotation - np.rint(rotation)) < TOL and abs(abs(np.linalg.det(rotation))-1) < TOL,
                 "Rotations must be unimodular integer matrices in fractional coordinates")
        rotation = np.rint(rotation).astype(int)
        translation = _real(op.get("translation", [0, 0, 0]), (3,), "translation")
        translation = np.mod(translation, 1)
        translation[np.abs(translation-1) < TOL] = 0
        cartesian = lattice.T @ rotation @ np.linalg.inv(lattice.T)
        residual = _max(cartesian.T @ cartesian - I3)
        _require(residual < 2e-6, f"Operation {index+1} does not preserve the lattice metric")
        metric_residual = max(metric_residual, residual)
        for a in range(3):
            for b in range(3):
                _require(not (periodic[a] != periodic[b] and rotation[a, b]),
                         "A symmetry operation mixes periodic and nonperiodic directions")
        anti = bool(op.get("antiunitary", False))
        key = _op_key(rotation, translation, anti)
        _require(key not in lookup, "Duplicate Seitz representative in operation list")
        lookup[key] = index
        result.append(dict(op, rotation=rotation, translation=translation,
                           antiunitary=anti, cartesian=cartesian))
    _require(_op_key(I3, np.zeros(3), False) in lookup, "Operation list must include the identity")
    table = np.zeros((len(raw), len(raw)), dtype=int)
    for a, g in enumerate(result):
        for b, h in enumerate(result):
            key = _op_key(g["rotation"] @ h["rotation"],
                g["rotation"] @ h["translation"] + g["translation"],
                g["antiunitary"] != h["antiunitary"])
            _require(key in lookup, f"Operation list is not closed: product {a+1} × {b+1} is missing")
            table[a, b] = lookup[key]
    return result, table, metric_residual


def _sites(raw, operations, expand=True):
    _require(isinstance(raw, list) and 0 < len(raw) <= 64, "Supply 1–64 seed sites")
    sites = []
    for seed in raw:
        position = np.mod(_real(seed["position"], (3,), "site position"), 1)
        orbitals = list(seed.get("orbitals", ["s"]))
        _require(0 < len(orbitals) <= 10 and all(isinstance(v, str) for v in orbitals),
                 "Each site needs 1–10 orbital labels")
        positions = [g["rotation"] @ position + g["translation"] for g in operations] if expand else [position]
        for pos in positions:
            pos = np.mod(pos, 1)
            pos[np.abs(pos-1) < TOL] = 0
            duplicate = next((s for s in sites if _max(pos-s["position"]-np.rint(pos-s["position"])) < TOL), None)
            if duplicate is not None:
                _require(duplicate["orbitals"] == orbitals, "Overlapping site orbits have different orbital lists")
                continue
            sites.append({"position": pos, "orbitals": orbitals, "label": seed.get("label", "")})
    _require(len(sites) <= 64 and sum(len(s["orbitals"]) for s in sites) <= 64,
             "Browser model limit: 64 sites and 64 total orbitals")
    permutations, shifts = [], []
    for g in operations:
        perm, cells = [], []
        for site in sites:
            image = g["rotation"] @ site["position"] + g["translation"]
            matches = [i for i, target in enumerate(sites)
                if _max(image-target["position"]-np.rint(image-target["position"])) < TOL
                and site["orbitals"] == target["orbitals"]]
            _require(len(matches) == 1, "Sites and orbital lists are not closed under the supplied symmetry")
            j = matches[0]
            perm.append(j)
            cells.append(np.rint(image-sites[j]["position"]).astype(int))
        _require(len(set(perm)) == len(sites), "Symmetry does not permute the sites bijectively")
        permutations.append(perm)
        shifts.append(cells)
    return sites, np.array(permutations), np.array(shifts)


# Normalized real solid harmonics. Quadratic matrices have Frobenius norm 1.
_D_ORBITALS = {
    "dxy": np.array([[0, 1, 0], [1, 0, 0], [0, 0, 0]]) / math.sqrt(2),
    "dyz": np.array([[0, 0, 0], [0, 0, 1], [0, 1, 0]]) / math.sqrt(2),
    "dxz": np.array([[0, 0, 1], [0, 0, 0], [1, 0, 0]]) / math.sqrt(2),
    "dx2-y2": np.diag([1, -1, 0]) / math.sqrt(2),
    "dz2": np.diag([-1, -1, 2]) / math.sqrt(6),
}


def orbital_matrix(labels, cartesian):
    """Active spatial action on a closed, orthonormal real s/p/d basis."""
    descriptors = []
    for label in labels:
        if label == "s": descriptors.append((0, np.ones(1)))
        elif label in ["px", "py", "pz"]: descriptors.append((1, I3[["px", "py", "pz"].index(label)]))
        elif label in _D_ORBITALS: descriptors.append((2, _D_ORBITALS[label]))
        else: raise ValueError(f"Unknown orbital {label!r}; provide explicit site_matrices for custom orbitals")
    _require(len(set(labels)) == len(labels), "Duplicate orbital labels on one site")
    matrix = np.zeros((len(labels), len(labels)))
    for j, (degree, value) in enumerate(descriptors):
        transformed = value if degree == 0 else cartesian @ value if degree == 1 else cartesian @ value @ cartesian.T
        for i, (other_degree, other) in enumerate(descriptors):
            if degree == other_degree:
                matrix[i, j] = np.sum(other * transformed)
    _require(_max(matrix.T @ matrix - np.eye(len(labels))) < 2e-6,
             "Orbital subset is not closed under symmetry; include all mixing p/d orbitals")
    return matrix.astype(complex)


def spin_matrix(cartesian):
    """A deterministic SU(2) lift of the axial rotation det(R)*R."""
    proper = np.linalg.det(cartesian) * cartesian
    _require(_max(proper.T @ proper-I3) < 2e-6 and np.linalg.det(proper) > 0,
             "Spin rotation must be orthogonal")
    # Stable largest-component quaternion extraction, including pi rotations.
    trace = np.trace(proper)
    if trace > 0:
        s = 2*math.sqrt(1+trace)
        q = np.array([s/4, (proper[2,1]-proper[1,2])/s,
                      (proper[0,2]-proper[2,0])/s, (proper[1,0]-proper[0,1])/s])
    else:
        i = int(np.argmax(np.diag(proper))); j, k = (i+1)%3, (i+2)%3
        s = 2*math.sqrt(max(0, 1+proper[i,i]-proper[j,j]-proper[k,k]))
        q = np.zeros(4); q[i+1] = s/4
        q[0] = (proper[k,j]-proper[j,k])/s
        q[j+1] = (proper[j,i]+proper[i,j])/s
        q[k+1] = (proper[k,i]+proper[i,k])/s
    q /= np.linalg.norm(q)
    if q[np.flatnonzero(abs(q)>TOL)[0]] < 0: q = -q
    w, x, y, z = q
    return np.array([[w-1j*z, -y-1j*x], [y-1j*x, w+1j*z]])


def _local_representations(operations, sites, permutations, table):
    matrices = []
    for gi, g in enumerate(operations):
        row = []
        for si, site in enumerate(sites):
            labels = site["orbitals"]
            if "site_matrices" in g:
                _require(len(g["site_matrices"]) == len(sites), "site_matrices must follow the expanded site order")
                matrix = _cmatrix(g["site_matrices"][si], (len(labels), len(labels)))
            elif "orbital_matrix" in g:
                matrix = _cmatrix(g["orbital_matrix"], (len(labels), len(labels)))
            else:
                spin_labels = [(v[:-2], 0 if v.endswith("up") else 1) for v in labels if v.endswith(("up", "dn"))]
                if spin_labels:
                    _require(len(spin_labels) == len(labels), "Cannot mix spinor and scalar orbitals")
                    spatial_labels = list(dict.fromkeys(v[0] for v in spin_labels))
                    _require(len(labels) == len(spatial_labels)*2 and len(set(spin_labels)) == len(labels),
                             "Provide both up/dn components of each spinor orbital")
                    orbital = orbital_matrix(spatial_labels, g["cartesian"])
                    # Existing SG/MSG records contain rounded `spinRotation`
                    # matrices intended for character labels. Reconstruct from
                    # geometry here: low-precision lifts can change nullity of
                    # the hopping constraint system. An explicit spin_matrix
                    # override is accepted only after group-law validation.
                    supplied_spin = g.get("spin_matrix")
                    spin = _cmatrix(supplied_spin, (2,2)) if supplied_spin is not None else spin_matrix(
                        _real(g.get("spin_rotation", g["cartesian"]), (3,3), "spin_rotation"))
                    if g["antiunitary"]: spin = spin @ np.array([[0, 1], [-1, 0]])
                    matrix = np.array([[orbital[spatial_labels.index(a), spatial_labels.index(b)] * spin[u,v]
                        for b,v in spin_labels] for a,u in spin_labels])
                else:
                    matrix = orbital_matrix(labels, g["cartesian"])
            _require(_max(matrix.conj().T@matrix-np.eye(len(labels))) < 2e-6,
                     f"Operation {gi+1}, site {si+1}: representation is not unitary")
            row.append(matrix)
        matrices.append(row)
    residual = 0.
    for a, g in enumerate(operations):
        for b in range(len(operations)):
            phase = None
            for s in range(len(sites)):
                left = matrices[a][permutations[b,s]] @ (matrices[b][s].conj() if g["antiunitary"] else matrices[b][s])
                right = matrices[table[a,b]][s]
                scalar = np.vdot(right, left)/right.shape[0]
                if phase is None: phase = scalar
                error = max(abs(abs(scalar)-1), abs(scalar-phase), _max(left-phase*right))
                residual = max(residual, error)
    _require(residual < 1e-8,
             "Local matrices do not form a consistent (possibly projective) group representation")
    return matrices, residual


def _bonds(lattice, sites, periodic, shell_count=2, cutoff=None):
    positions = np.array([s["position"] for s in sites])
    inv_norm = np.linalg.norm(np.linalg.inv(lattice), axis=0)
    if cutoff is None:
        # First obtain an upper bound on the requested shell, then enumerate the
        # mathematically sufficient box derived from that physical cutoff.
        cutoff = float(max(np.linalg.norm(lattice[a]) for a in range(3) if periodic[a]) if any(periodic)
                       else np.linalg.norm(lattice)) * shell_count
    cutoff = float(cutoff)
    _require(np.isfinite(cutoff) and cutoff >= 0, "max_distance must be finite and nonnegative")
    bounds = [int(math.ceil(cutoff*inv_norm[a]+1+TOL)) if periodic[a] else 0 for a in range(3)]
    _require(max(bounds) <= 18 and np.prod([2*b+1 for b in bounds])*len(sites)**2 <= 2_000_000,
             "Bond enumeration exceeds browser limit; reduce cutoff/site count")
    candidates = []
    for cell in itertools.product(*(range(-b,b+1) for b in bounds)):
        R = np.array(cell)
        distances = np.linalg.norm((positions[None,:,:] - positions[:,None,:] + R) @ lattice, axis=2)
        for i,j in zip(*np.where(distances <= cutoff+TOL)):
            candidates.append((float(distances[i,j]), (int(i), int(j), *cell)))
    candidates.sort(key=lambda item:(item[0], item[1]))
    lengths = []
    records = {}
    for distance, key in candidates:
        if not lengths or abs(distance-lengths[-1]) > 2e-6*max(1, distance): lengths.append(distance)
        if shell_count and len(lengths) > shell_count: break
        records[key] = (len(lengths), distance)
    if shell_count:
        _require(len(lengths) >= shell_count, "Requested bond shells are absent; increase max_distance")
        lengths = lengths[:shell_count]
    _require(len(records) <= 25000, "Too many bonds for browser calculation")
    return records, lengths


def _linear_map(left, right, anti, reverse):
    n, m = left.shape[1], right.shape[1]
    basis = np.zeros((2*n*m, n, m), dtype=complex)
    for a in range(n*m):
        basis[a].flat[a] = 1
        basis[a+n*m].flat[a] = 1j
    transformed = left[None,:,:] @ (basis.conj() if anti else basis) @ right.conj().T[None,:,:]
    if reverse: transformed = transformed.conj().transpose(0,2,1)
    flat = transformed.reshape(2*n*m, -1)
    return np.concatenate((flat.real, flat.imag), axis=1).T


def _null_space(constraints, width):
    if not constraints: return np.eye(width), 0.
    matrix = np.concatenate(constraints)
    matrix = matrix[np.max(abs(matrix), axis=1)>1e-10]
    if len(matrix) == 0: return np.eye(width), 0.
    _, values, vh = np.linalg.svd(matrix, full_matrices=False)
    rank = int(np.sum(values > 1e-8*max(1., values[0])))
    # A matrix can be short and wide. full_matrices supplies its implicit zeros.
    if len(vh) < width: _, _, vh = np.linalg.svd(matrix, full_matrices=True)
    kernel = vh[rank:].T
    if kernel.shape[1] == 0: return kernel, 0.
    # Choose a deterministic coordinate parametrization, avoiding arbitrary SVD
    # rotations and giving each parameter one hopping component of magnitude 1.
    pivots, selected = [], np.empty((0, kernel.shape[1]))
    for i, row in enumerate(kernel):
        proposed = np.vstack([selected, row])
        if np.linalg.matrix_rank(proposed, tol=1e-7) > len(pivots):
            pivots.append(i); selected = proposed
        if len(pivots) == kernel.shape[1]: break
    kernel = kernel @ np.linalg.inv(kernel[pivots])
    kernel[abs(kernel)<1e-10] = 0
    residual = _max(matrix@kernel)
    _require(residual < 2e-6, "Symmetry null-space residual exceeds tolerance")
    return kernel, residual


def _constrained_basis(records, sites, operations, permutations, shifts, reps):
    remaining = set(records)
    basis = []
    max_residual = 0.
    while remaining:
        key = min(remaining, key=lambda k:(records[k][0], k))
        i,j,*cell = key
        width = 2*len(sites[i]["orbitals"])*len(sites[j]["orbitals"])
        transports, constraints = {}, []
        for gi, g in enumerate(operations):
            ni, nj = permutations[gi,i], permutations[gi,j]
            new_cell = g["rotation"]@cell + shifts[gi,j]-shifts[gi,i]
            for reverse in [False, True]:
                target = (int(nj), int(ni), *(-new_cell)) if reverse else (int(ni), int(nj), *new_cell)
                _require(target in records, "Selected bond shells are not symmetry closed; check periodicity/cutoff")
                transform = _linear_map(reps[gi][i], reps[gi][j], g["antiunitary"], reverse)
                if target in transports: constraints.append(transform-transports[target])
                else: transports[target] = transform
        kernel, residual = _null_space(constraints, width)
        max_residual = max(max_residual, residual)
        for p in range(kernel.shape[1]):
            terms = []
            for target, transform in sorted(transports.items()):
                a,b,*R = target
                vec = transform@kernel[:,p]; half = len(vec)//2
                matrix = (vec[:half]+1j*vec[half:]).reshape(len(sites[a]["orbitals"]),len(sites[b]["orbitals"]))
                matrix[abs(matrix)<1e-10] = 0
                if _max(matrix) > 1e-10:
                    terms.append({"from_site":a,"to_site":b,"cell":list(map(int,R)),"matrix":_json_complex(matrix)})
            basis.append({"name":f"p{len(basis)+1}", "shell":records[key][0],
                          "distance":records[key][1], "terms":terms})
        remaining.difference_update(transports)
        _require(len(basis) <= 300, "More than 300 hopping parameters; reduce shells/orbital count")
    return basis, max_residual


def _hopping_dict(hoppings, n=None):
    _require(isinstance(hoppings, list) and 0 < len(hoppings) <= 25000, "hoppings must be a nonempty list")
    result = {}
    for item in hoppings:
        R = _real(item["cell"], (3,), "cell")
        _require(_max(R-np.rint(R)) < TOL, "Hopping cells must be integers")
        key = tuple(np.rint(R).astype(int))
        matrix = _cmatrix(item["matrix"])
        if n is None: n = len(matrix)
        _require(matrix.shape == (n,n) and n <= 128, "Hopping matrices must be square with consistent dimensions ≤128")
        _require(key not in result, "Duplicate hopping cell")
        result[key] = matrix
    residual = max((_max(matrix-result.get(tuple(-np.array(R)), np.zeros((n,n))).conj().T)
                    for R,matrix in result.items()), default=0)
    _require(residual < 2e-7, f"Hoppings are not Hermitian: residual {residual:.3g}")
    return result, n, residual


def _serialize_hoppings(hoppings):
    return [{"cell":list(map(int,R)),"matrix":_json_complex(matrix)} for R,matrix in sorted(hoppings.items())]


def _assemble(basis, sites, parameters):
    _require(isinstance(parameters,(dict,list)), "parameters must be a name/value object or a complete array")
    offsets = np.cumsum([0]+[len(s["orbitals"]) for s in sites])
    hoppings = {}
    params = []
    if isinstance(parameters, list): _require(len(parameters) == len(basis), "Parameter list length must equal parameter_count")
    if isinstance(parameters, dict):
        _require(not (set(parameters)-{p["name"] for p in basis}), "Unknown hopping parameter name")
    for index, term in enumerate(basis):
        value = (parameters[index] if isinstance(parameters,list) else parameters.get(term["name"], 0 if term["shell"]==1 else -1))
        value = float(value)
        _require(np.isfinite(value), "Hopping parameters must be finite real numbers")
        params.append({"name":term["name"],"shell":term["shell"],"value":value})
        for block in term["terms"]:
            R = tuple(block["cell"])
            if R not in hoppings: hoppings[R] = np.zeros((offsets[-1],offsets[-1]),complex)
            i,j=block["from_site"],block["to_site"]
            hoppings[R][offsets[i]:offsets[i+1], offsets[j]:offsets[j+1]] += value*_cmatrix(block["matrix"])
    if not hoppings: hoppings[(0,0,0)] = np.zeros((offsets[-1],offsets[-1]),complex)
    return hoppings, params, offsets


def bloch_hamiltonian(hoppings, k):
    k = _real(k, (3,), "k")
    result = sum(matrix*np.exp(2j*np.pi*np.dot(k,R)) for R,matrix in hoppings.items())
    _require(_max(result-result.conj().T) < 2e-6, "Bloch Hamiltonian is not Hermitian")
    return result


def _symmetry_matrix(gi, k, operations, permutations, shifts, reps, offsets):
    g = operations[gi]
    kp = (-1 if g["antiunitary"] else 1)*np.linalg.inv(g["rotation"]).T@k
    U = np.zeros((offsets[-1],offsets[-1]),complex)
    for s,t in enumerate(permutations[gi]):
        U[offsets[t]:offsets[t+1],offsets[s]:offsets[s+1]] = reps[gi][s]*np.exp(-2j*np.pi*np.dot(kp,shifts[gi,s]))
    return kp,U


def _covariance(hoppings, operations, permutations, shifts, reps, offsets):
    residual = 0.
    for k in [np.zeros(3),np.array([.137,.219,.173])]:
        H = bloch_hamiltonian(hoppings,k)
        for gi,g in enumerate(operations):
            kp,U = _symmetry_matrix(gi,k,operations,permutations,shifts,reps,offsets)
            target = U@(H.conj() if g["antiunitary"] else H)@U.conj().T
            residual=max(residual,_max(bloch_hamiltonian(hoppings,kp)-target))
    return residual


def _path(payload, lattice=None):
    if "kpoints" in payload:
        ks = _real(payload["kpoints"], name="kpoints")
        _require(ks.ndim==2 and ks.shape[1]==3 and 1 <= len(ks) <= 3000, "kpoints must contain 1–3000 vectors")
        labels=[]
    else:
        vertices = payload.get("path", [{"label":"Γ","k":[0,0,0]}, {"label":"X","k":[.5,0,0]}])
        _require(2 <= len(vertices) <= 30, "path needs 2–30 vertices")
        count=_integer(payload.get("points_per_segment",40),2,200,"points_per_segment")
        ks=[]; labels=[]
        for i,v in enumerate(vertices):
            k=_real(v["k"] if isinstance(v,dict) else v,(3,),"path point")
            labels.append({"index":len(ks),"label":str(v.get("label",i)) if isinstance(v,dict) else str(i)})
            if i+1<len(vertices):
                end=vertices[i+1]; end=_real(end["k"] if isinstance(end,dict) else end,(3,),"path point")
                ks.extend(np.linspace(k,end,count,endpoint=False))
            else: ks.append(k)
        ks=np.array(ks)
    _require(len(ks)<=3000,"Band/Wilson path exceeds 3000 points")
    reciprocal=2*np.pi*np.linalg.inv(lattice).T if lattice is not None else I3
    distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(ks,axis=0)@reciprocal,axis=1))]
    for tick in labels:tick["distance"]=float(distance[tick["index"]])
    return ks,distance,labels


def _bands(hoppings, payload, lattice=None):
    ks,distance,ticks=_path(payload,lattice)
    energies=[np.linalg.eigvalsh(bloch_hamiltonian(hoppings,k)).tolist() for k in ks]
    return {"kpoints":ks.tolist(),"distance":distance.tolist(),"ticks":ticks,"energies":energies}


def export_hr(hoppings):
    """Export physical hoppings with degeneracy one (Wannier90 format)."""
    n=len(next(iter(hoppings.values())))
    keys=sorted(hoppings)
    lines=["Symmetry Lab Python / MagneticTB numerical port",str(n),str(len(keys))]
    for start in range(0,len(keys),15):lines.append(" ".join(["1"]*min(15,len(keys)-start)))
    for R in keys:
        for j in range(n):
            for i in range(n):
                z=hoppings[R][i,j]
                lines.append(f"{R[0]:5d} {R[1]:5d} {R[2]:5d} {i+1:5d} {j+1:5d} {z.real:.14g} {z.imag:.14g}")
    return "\n".join(lines)+"\n"


def read_hr(text):
    """Validate and read Wannier90 hr, dividing each block by its degeneracy."""
    _require(isinstance(text,str) and len(text)<=30_000_000,"HR text exceeds browser input limit")
    lines=text.strip().splitlines()
    _require(len(lines)>=4,"Incomplete Wannier90 HR header")
    n=_integer(int(lines[1].strip()),1,128,"number of orbitals")
    nr=_integer(int(lines[2].strip()),1,25000,"number of cells")
    dlines=math.ceil(nr/15)
    degeneracies=[int(v) for line in lines[3:3+dlines] for v in line.split()]
    _require(len(degeneracies)==nr and min(degeneracies)>0,"Invalid HR degeneracy table")
    data=lines[3+dlines:]
    _require(len(data)==nr*n*n,"HR record count does not match header")
    hoppings={}
    for a in range(nr):
        matrix=np.zeros((n,n),complex); key=None; seen=set()
        for line in data[a*n*n:(a+1)*n*n]:
            tokens=line.split();_require(len(tokens)==7,"Each HR record needs seven fields")
            R=tuple(int(v) for v in tokens[:3]);i,j=(int(v)-1 for v in tokens[3:5])
            if key is None:key=R
            _require(R==key and 0<=i<n and 0<=j<n and (i,j) not in seen,"Invalid/duplicate HR block index")
            seen.add((i,j))
            matrix[i,j]=complex(*(float(v.replace("D","e").replace("d","e")) for v in tokens[5:]))/degeneracies[a]
        _require(key not in hoppings and np.all(np.isfinite(matrix)),"Duplicate HR cell or nonfinite hopping")
        hoppings[key]=matrix
    serialized=_serialize_hoppings(hoppings)
    _hopping_dict(serialized)
    return hoppings


def _input_hoppings(payload):
    if payload.get("hr_text") is not None:return read_hr(payload["hr_text"])
    model=payload.get("model",payload)
    return _hopping_dict(model["hoppings"])[0]


def _model(payload):
    lattice=_real(payload.get("lattice",I3),(3,3),"lattice")
    _require(abs(np.linalg.det(lattice))>1e-9,"Lattice must be nonsingular")
    periodic=list(payload.get("periodic",[True,True,True]))
    _require(len(periodic)==3 and all(isinstance(v,bool) for v in periodic),"periodic needs three booleans")
    operations,table,metric_residual=_operations(payload.get("operations",[{"rotation":I3.tolist()}]),lattice,periodic)
    sites,permutations,shifts=_sites(payload["sites"],operations,payload.get("expand_orbits",True))
    reps,representation_residual=_local_representations(operations,sites,permutations,table)
    shell_count=_integer(payload.get("shell_count",2),1,8,"shell_count")
    records,lengths=_bonds(lattice,sites,periodic,shell_count,payload.get("max_distance"))
    basis,constraint_residual=_constrained_basis(records,sites,operations,permutations,shifts,reps)
    hoppings,params,offsets=_assemble(basis,sites,payload.get("parameters",{}))
    serialized=_serialize_hoppings(hoppings)
    _,n,hermiticity=_hopping_dict(serialized)
    covariance=_covariance(hoppings,operations,permutations,shifts,reps,offsets)
    _require(covariance<2e-6*max(1,max(_max(v) for v in hoppings.values())),"Hamiltonian symmetry covariance check failed")
    model={"lattice":lattice.tolist(),"periodic":periodic,"orbital_count":n,
        "sites":[dict(s,position=s["position"].tolist()) for s in sites],
        "shells":[{"shell":i+1,"distance":d,"bond_count":sum(v[0]==i+1 for v in records.values())} for i,d in enumerate(lengths)],
        "parameter_count":len(basis),"basis":basis,"hoppings":serialized,
        "gauge":"periodic; H_ij(k)=sum_R t_ij(R) exp(2π i k·R)"}
    result={"model":model,"parameters":params,"bands":_bands(hoppings,payload,lattice),
        "hr_text":export_hr(hoppings),"diagnostics":{"metric_residual":metric_residual,
        "representation_residual":representation_residual,"constraint_residual":constraint_residual,
        "hermiticity_residual":hermiticity,"covariance_residual":covariance,
        "operation_count":len(operations),"directed_bond_count":len(records)}}
    if payload.get("character_k") is not None:
        result["band_characters"]=_band_characters(hoppings,payload["character_k"],operations,permutations,shifts,reps,offsets)
    return result


def _band_characters(hoppings,k,operations,permutations,shifts,reps,offsets):
    k=_real(k,(3,),"character_k")
    values,vectors=np.linalg.eigh(bloch_hamiltonian(hoppings,k))
    blocks=[]
    for i,value in enumerate(values):
        if not blocks or abs(value-values[blocks[-1][0]])>1e-6:blocks.append([])
        blocks[-1].append(i)
    unitary=[];matrices=[]
    for gi,g in enumerate(operations):
        kp,U=_symmetry_matrix(gi,k,operations,permutations,shifts,reps,offsets)
        if not g["antiunitary"] and _max(kp-k-np.rint(kp-k))<TOL:
            unitary.append(gi);matrices.append(U)
    return {"k":k.tolist(),"operation_indices":unitary,"blocks":[{
        "bands":[i+1 for i in block],"energy":float(values[block[0]]),
        "characters":[_json_complex(np.trace(vectors[:,block].conj().T@U@vectors[:,block])) for U in matrices]
        } for block in blocks],"note":"Unitary little-group traces in the supplied site/orbital gauge; antiunitary operators have no basis-invariant trace."}


def slab_hamiltonian(hoppings,k,layers,axis=2):
    axis=_integer(axis,0,2,"open_axis");layers=_integer(layers,1,80,"layers")
    k=_real(k,(3,),"k").copy();k[axis]=0
    n=len(next(iter(hoppings.values())))
    _require(n*layers<=600,"Slab dimension exceeds 600; reduce layers/orbitals")
    H=np.zeros((n*layers,n*layers),complex)
    for layer in range(layers):
        for R,matrix in hoppings.items():
            target=layer+R[axis]
            if 0<=target<layers:
                H[layer*n:(layer+1)*n,target*n:(target+1)*n]+=matrix*np.exp(2j*np.pi*np.dot(k,R))
    _require(_max(H-H.conj().T)<2e-6,"Slab Hamiltonian is not Hermitian")
    return H


def _slab(payload):
    hoppings=_input_hoppings(payload)
    axis=_integer(payload.get("open_axis",2),0,2,"open_axis")
    layers=_integer(payload.get("layers",12),1,80,"layers")
    ks,distance,ticks=_path(payload)
    _require(len(ks)*layers*len(next(iter(hoppings.values())))**2<=4_000_000,"Slab path is too large for the browser")
    energies=[np.linalg.eigvalsh(slab_hamiltonian(hoppings,k,layers,axis)).tolist() for k in ks]
    return {"layers":layers,"open_axis":axis,"bands":{"kpoints":ks.tolist(),"distance":distance.tolist(),"ticks":ticks,"energies":energies}}


def _finite(payload):
    hoppings=_input_hoppings(payload);n=len(next(iter(hoppings.values())))
    size=[_integer(v,1,30,"size") for v in payload.get("size",[4,4,1])]
    _require(len(size)==3 and np.prod(size)*n<=600,"Finite model dimension must be ≤600")
    periodic=payload.get("boundary_periodic",[False]*3)
    _require(len(periodic)==3 and all(isinstance(v,bool) for v in periodic),"boundary_periodic needs three booleans")
    cells=list(itertools.product(*(range(v) for v in size)));lookup={v:i for i,v in enumerate(cells)}
    H=np.zeros((len(cells)*n,len(cells)*n),complex)
    for i,cell in enumerate(cells):
        for R,matrix in hoppings.items():
            target=[cell[a]+R[a] for a in range(3)]
            if any(not periodic[a] and not 0<=target[a]<size[a] for a in range(3)):continue
            target=tuple(target[a]%size[a] for a in range(3));j=lookup[target]
            H[i*n:(i+1)*n,j*n:(j+1)*n]+=matrix
    residual=_max(H-H.conj().T);_require(residual<2e-6,"Finite Hamiltonian is not Hermitian")
    result={"size":size,"dimension":len(H),"cells":[list(v) for v in cells],"energies":np.linalg.eigvalsh(H).tolist(),"hermiticity_residual":residual}
    if payload.get("include_matrix",False):result["matrix"]=_json_complex(H)
    return result


def surface_green(hoppings,k,energy,axis=2,eta=.02,side=1):
    axis=_integer(axis,0,2,"open_axis");k=_real(k,(3,),"k").copy();k[axis]=0
    _require(np.isfinite(eta) and eta>0,"eta must be positive")
    n=len(next(iter(hoppings.values())))
    thickness=max(1,max(abs(R[axis]) for R in hoppings))
    dim=n*thickness;_require(dim<=180,"Principal-layer dimension must be ≤180")
    h00=np.zeros((dim,dim),complex);h01=h00.copy();h10=h00.copy()
    for layer in range(thickness):
        for R,matrix in hoppings.items():
            target=layer+side*R[axis]
            block=h00 if 0<=target<thickness else h01 if thickness<=target<2*thickness else h10 if -thickness<=target<0 else None
            if block is not None:
                j=target%thickness
                block[layer*n:(layer+1)*n,j*n:(j+1)*n]+=matrix*np.exp(2j*np.pi*np.dot(k,R))
    _require(_max(h01-h10.conj().T)<2e-7,"Principal-layer coupling is not Hermitian")
    z=(float(energy)+1j*eta)*np.eye(dim)
    bulk=h00.copy();surface=h00.copy();alpha=h01.copy();beta=h10.copy()
    residual=math.inf
    for iteration in range(1,201):
        g=np.linalg.inv(z-bulk)
        agb=alpha@g@beta;bga=beta@g@alpha
        surface+=agb;bulk+=agb+bga
        alpha,beta=alpha@g@alpha,beta@g@beta
        residual=max(_max(alpha),_max(beta))
        if residual<1e-11:break
    _require(residual<1e-8,"Surface Green decimation did not converge; increase eta")
    green=np.linalg.inv(z-surface)
    # For a translationally uniform semi-infinite stack the surface g satisfies
    # g^-1=z-h00-h01*g*h10, independently of the decimation path.
    dyson=_max((z-h00-h01@green@h10)@green-np.eye(dim))
    return {"energy":float(energy),"spectral_weight":float(-np.trace(green).imag/np.pi),
        "green":_json_complex(green),"iterations":iteration,"coupling_residual":residual,
        "dyson_residual":dyson,"principal_layer_thickness":thickness}


def _surface(payload):
    hoppings=_input_hoppings(payload)
    energies=_real(payload.get("energies",np.linspace(-4,4,81)),name="energies")
    _require(energies.ndim==1 and 1<=len(energies)<=401,"Supply 1–401 surface energies")
    kwargs=dict(axis=payload.get("open_axis",2),eta=float(payload.get("eta",.02)),side=-1 if payload.get("side",1)==-1 else 1)
    rows=[surface_green(hoppings,payload.get("k",[0,0,0]),e,**kwargs) for e in energies]
    return {"spectrum":[{"energy":r["energy"],"spectral_weight":r["spectral_weight"]} for r in rows],
        "diagnostics":{"max_dyson_residual":max(r["dyson_residual"] for r in rows),"max_iterations":max(r["iterations"] for r in rows)},
        "last_green":rows[-1]}


def _frame(hoppings,k,occupied):
    vals,vecs=np.linalg.eigh(bloch_hamiltonian(hoppings,k))
    gap=float(vals[occupied]-vals[occupied-1])
    _require(gap>1e-7,"Occupied subspace is not isolated: direct gap closes on the sampled mesh/path")
    return vecs[:,:occupied],gap


def _unitary_link(a,b):
    u,s,vh=np.linalg.svd(a.conj().T@b)
    _require(min(s)>1e-7,"Occupied frames have singular overlap; refine the k mesh/path")
    return u@vh,float(min(s))


def wilson_loop(hoppings,points,occupied):
    n=len(next(iter(hoppings.values())));occupied=_integer(occupied,1,n-1,"occupied")
    ks=_real(points,name="Wilson path")
    _require(ks.ndim==2 and ks.shape[1]==3 and 3<=len(ks)<=3000,"Wilson path needs 3–3000 k points")
    closure=ks[-1]-ks[0]
    _require(_max(closure-np.rint(closure))<TOL,"Wilson path must close modulo a reciprocal lattice vector")
    frames=[];gaps=[]
    for k in ks:
        frame,gap=_frame(hoppings,k,occupied);frames.append(frame);gaps.append(gap)
    product=np.eye(occupied,dtype=complex);min_link=1.
    for a,b in zip(frames,frames[1:]):
        link,minimum=_unitary_link(a,b);product=product@link;min_link=min(min_link,minimum)
    # Close the last numerical eigenframe back to the first; periodic orbital
    # gauge has identity sewing even when k_end=k_start+G.
    link,minimum=_unitary_link(frames[-1],frames[0]);product=product@link;min_link=min(min_link,minimum)
    phases=np.sort(-np.angle(np.linalg.eigvals(product)))
    return {"berry_phase":float(-np.angle(np.linalg.det(product))),"phases":phases.tolist(),
        "wannier_centers":np.mod(phases/(2*np.pi),1).tolist(),
        "wilson_matrix":_json_complex(product),"minimum_direct_gap":min(gaps),
        "minimum_overlap_singular_value":min_link,"unitarity_residual":_max(product.conj().T@product-np.eye(occupied)),
        "convention":"Berry connection A=i<u|∇u>, periodic orbital gauge"}


def chern_number(hoppings,occupied,mesh=21,axes=(0,1),fixed_k=(0,0,0)):
    n=len(next(iter(hoppings.values())));occupied=_integer(occupied,1,n-1,"occupied")
    mesh=_integer(mesh,5,101,"mesh")
    _require(len(axes)==2 and len(set(axes))==2 and all(a in [0,1,2] for a in axes),"axes must be two distinct coordinate indices")
    _require(mesh*mesh*n*n<=2_000_000,"Chern mesh too large for this orbital count")
    fixed=_real(fixed_k,(3,),"fixed_k")
    frames={};min_gap=math.inf
    for i in range(mesh):
        for j in range(mesh):
            k=fixed.copy();k[axes[0]]+=i/mesh;k[axes[1]]+=j/mesh
            frames[i,j],gap=_frame(hoppings,k,occupied);min_gap=min(min_gap,gap)
    links={};min_link=1.
    for i in range(mesh):
        for j in range(mesh):
            for a,(di,dj) in enumerate([(1,0),(0,1)]):
                link,minimum=_unitary_link(frames[i,j],frames[(i+di)%mesh,(j+dj)%mesh])
                links[i,j,a]=np.linalg.det(link);min_link=min(min_link,minimum)
    flux=np.zeros((mesh,mesh))
    for i in range(mesh):
        for j in range(mesh):
            loop=links[i,j,0]*links[(i+1)%mesh,j,1]*links[i,(j+1)%mesh,0].conjugate()*links[i,j,1].conjugate()
            flux[i,j]=-np.angle(loop)
    value=float(np.sum(flux)/(2*np.pi))
    return {"chern":value,"nearest_integer":int(round(value)),"mesh":mesh,
        "axes":list(axes),"flux":flux.tolist(),"minimum_direct_gap":min_gap,
        "maximum_plaquette_flux":float(np.max(abs(flux))),"minimum_overlap_singular_value":min_link,
        "convention":"A=i<u|∇u>; oriented axes[0] then axes[1]; verify convergence by increasing mesh"}


def _topology(payload):
    hoppings=_input_hoppings(payload)
    occupied=payload.get("occupied",1)
    method=payload.get("method","chern")
    if method=="chern":return chern_number(hoppings,occupied,payload.get("mesh",21),payload.get("axes",[0,1]),payload.get("fixed_k",[0,0,0]))
    if method=="curvature":
        points=payload.get("kpoints",[payload.get("k",[0,0,0])])
        _require(1<=len(points)<=3000,"Supply 1–3000 Berry-curvature points")
        return {"samples":[berry_curvature(hoppings,k,occupied,payload.get("axes",[0,1])) for k in points],
                "convention":"A=i<u|∇u>; derivatives with respect to fractional k coordinates"}
    _require(method in ["wilson","berry"],"Topology method must be chern, wilson, berry or curvature")
    points,_,_=_path(payload)
    return wilson_loop(hoppings,points,occupied)


def berry_curvature(hoppings,k,occupied,axes=(0,1)):
    """Gauge-invariant occupied-subspace Kubo curvature, fractional k units."""
    n=len(next(iter(hoppings.values())));occupied=_integer(occupied,1,n-1,"occupied")
    _require(len(axes)==2 and len(set(axes))==2 and all(a in [0,1,2] for a in axes),"axes must be two distinct coordinate indices")
    k=_real(k,(3,),"k")
    values,vectors=np.linalg.eigh(bloch_hamiltonian(hoppings,k))
    gap=float(values[occupied]-values[occupied-1])
    _require(gap>1e-7,"Occupied subspace is not isolated: direct gap closes at k")
    derivatives=[sum(2j*np.pi*R[a]*matrix*np.exp(2j*np.pi*np.dot(k,R)) for R,matrix in hoppings.items()) for a in axes]
    velocities=[vectors.conj().T@derivative@vectors for derivative in derivatives]
    curvature=0.
    for i in range(occupied):
        for j in range(occupied,n):
            curvature-=2*float((velocities[0][i,j]*velocities[1][j,i]).imag)/(values[i]-values[j])**2
    return {"k":k.tolist(),"curvature":float(curvature),"minimum_direct_gap":gap,"energies":values.tolist()}


def run(payload):
    """JSON-in/JSON-out browser dispatcher. Invalid inputs raise ValueError."""
    _require(isinstance(payload,dict),"Request must be a JSON object")
    action=payload.get("action","model")
    if action=="model":return _model(payload)
    if action in ["bands","hr_import","hr_export"]:
        hoppings=_input_hoppings(payload)
        result={"model":{"hoppings":_serialize_hoppings(hoppings),"orbital_count":len(next(iter(hoppings.values())))},"hr_text":export_hr(hoppings)}
        if action!="hr_export":result["bands"]=_bands(hoppings,payload,_real(payload["lattice"],(3,3)) if "lattice" in payload else None)
        return result
    if action=="slab":return _slab(payload)
    if action=="finite":return _finite(payload)
    if action=="surface":return _surface(payload)
    if action=="topology":return _topology(payload)
    if action=="coverage":return MAGNETICTB_COVERAGE
    raise ValueError(f"Unsupported MagneticTB browser action: {action}")
