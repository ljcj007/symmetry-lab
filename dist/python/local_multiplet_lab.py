"""Five-orbital fixed-N Kanamori atom, with cubic crystal field and no SOC.

The spin-rotation-invariant Kanamori approximation includes both spin flip
and pair hopping. It is not the full spherical d-shell Slater interaction.
Fock order: xy up/down, yz up/down, xz up/down, x2-y2 up/down, z2 up/down.
All energies are eV and spin operators have hbar=1. NumPy is the only dependency.
"""
import math
from functools import lru_cache
import numpy as np

ORBITALS = ["xy", "yz", "xz", "x²−y²", "3z²−r²"]
SOURCES = [
    {"id": "multiplet-kanamori", "title": "TRIQS：Kanamori 密度、自旋翻转与成对跃迁", "url": "https://triqs.github.io/triqs/latest/documentation/python_api/triqs.operators.util.hamiltonians.h_int_kanamori.html"},
    {"id": "multiplet-libcommute", "title": "libcommute：Kanamori Hamiltonian 与守恒子空间", "url": "https://krivenko.github.io/libcommute/examples/kanamori.html"},
    {"id": "multiplet-nio", "title": "Quanty：NiO 多电子晶场基态与 Slater 相互作用", "url": "https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate"},
]


def _number(p, key, default, lo, hi, integer=False):
    x = p.get(key, default)
    if isinstance(x, bool) or not isinstance(x, (float, int)) or not math.isfinite(x) or not lo <= x <= hi:
        raise ValueError(f"{key} 必须为 {lo} 至 {hi} 的有限数值")
    if integer and not isinstance(x, int):
        raise ValueError(f"{key} 必须为整数")
    return int(x) if integer else float(x)


def apply_fermions(state, operators):
    """Apply a left-to-right written operator product to a bit determinant.

    Each entry is (creation, spin-orbital-index). The rightmost acts first.
    Return (new-state, fermionic sign), or None for a Pauli-forbidden result.
    """
    sign = 1
    for creation, index in reversed(operators):
        bit = 1 << index
        occupied = bool(state & bit)
        if occupied == creation:
            return None
        if (state & (bit-1)).bit_count() % 2:
            sign = -sign
        state = state | bit if creation else state & ~bit
    return state, sign


def _add_product(matrix, index, state, col, coefficient, operators):
    applied = apply_fermions(state, operators)
    if applied is not None:
        final, sign = applied
        row = index.get(final)
        if row is None:
            raise RuntimeError("Operator left the declared conserved block")
        matrix[row, col] += coefficient*sign


@lru_cache(maxsize=36)
def block_operators(up, down):
    """Return immutable matrices in a fixed (N_up,N_down) sector."""
    basis = [s for s in range(1024) if sum((s >> (2*m)) & 1 for m in range(5)) == up
             and sum((s >> (2*m+1)) & 1 for m in range(5)) == down]
    index = {s:i for i,s in enumerate(basis)}
    dim = len(basis)
    occ = np.zeros((dim, 5))
    jmat, s2 = np.zeros((dim,dim)), np.eye(dim)*((up-down)/2)**2
    for col, state in enumerate(basis):
        nu = [(state >> (2*m)) & 1 for m in range(5)]
        nd = [(state >> (2*m+1)) & 1 for m in range(5)]
        occ[col] = np.array(nu)+np.array(nd)
        for m in range(5):
            for n in range(m+1,5):
                jmat[col,col] += -2*(nu[m]*nd[n]+nd[m]*nu[n])-3*(nu[m]*nu[n]+nd[m]*nd[n])
            for n in range(5):
                if m != n:
                    # -J S_m^+ S_n^-; all ordered pairs provide the conjugate.
                    _add_product(jmat,index,state,col,-1,[(True,2*m),(False,2*m+1),(True,2*n+1),(False,2*n)])
                    # +J P_m^dagger P_n, P_n=c_(n,down)c_(n,up).
                    _add_product(jmat,index,state,col,1,[(True,2*m),(True,2*m+1),(False,2*n+1),(False,2*n)])
                # S^2=Sz^2+(S+S-+S-S+)/2. Intermediate determinants may
                # have a different Sz, but the complete products conserve it.
                _add_product(s2,index,state,col,.5,[(True,2*m),(False,2*m+1),(True,2*n+1),(False,2*n)])
                _add_product(s2,index,state,col,.5,[(True,2*m+1),(False,2*m),(True,2*n),(False,2*n+1)])
    for matrix in (occ,jmat,s2):
        matrix.setflags(write=False)
    return tuple(basis), occ, jmat, s2


def orbital_energies(coordination, splitting):
    if coordination == "octahedral":
        return np.array([-.4,-.4,-.4,.6,.6])*splitting
    if coordination == "tetrahedral":
        return np.array([.4,.4,.4,-.6,-.6])*splitting
    raise ValueError("coordination 必须为 octahedral 或 tetrahedral")


def _energy_slices(energies, tol):
    start = 0
    for end in range(1,len(energies)+1):
        if end == len(energies) or abs(energies[end]-energies[start]) > tol:
            yield slice(start,end)
            start = end


def spectrum(electrons, coordination, splitting, coulomb_u, hund_j, diagnostics=True):
    """Resolve equal-energy eigenstates by S^2, then average joint subspaces.

    Accidental degeneracies of different total spin are separate groups.
    Each group includes every magnetic Sz partner, so its occupation average
    does not depend on a solver's arbitrary basis in a degenerate subspace.
    """
    orbital = orbital_energies(coordination,splitting)
    common = coulomb_u*electrons*(electrons-1)/2
    tol = 2e-9*max(1.,splitting,abs(hund_j)*10)
    levels = []
    errors = {"hermiticityResidual":0.,"spinCommutatorResidual":0.,"eigenResidual":0.,"spinResidual":0.}
    sizes = []
    for up in range(max(0,electrons-5),min(5,electrons)+1):
        down = electrons-up
        basis, occ, jmat, s2 = block_operators(up,down)
        h = np.diag(occ@orbital)+hund_j*jmat
        energies,vectors = np.linalg.eigh(h)
        sizes.append(len(basis))
        if diagnostics:
            errors["hermiticityResidual"] = max(errors["hermiticityResidual"],float(np.max(abs(h-h.T))))
            errors["spinCommutatorResidual"] = max(errors["spinCommutatorResidual"],float(np.max(abs(h@s2-s2@h))))
        for segment in _energy_slices(energies,tol):
            frame = vectors[:,segment]
            spin2, rotate = np.linalg.eigh(frame.T@s2@frame)
            frame = frame@rotate
            energy = float(np.mean(energies[segment]))
            if diagnostics:
                errors["eigenResidual"] = max(errors["eigenResidual"],float(np.max(abs(h@frame-energy*frame))))
                errors["spinResidual"] = max(errors["spinResidual"],float(np.max(abs(s2@frame-frame*spin2))))
            weights = (frame*frame).T@occ
            for value, occupations in zip(spin2,weights):
                spin = round(math.sqrt(max(0.,1+4*value))-1)/2
                if abs(value-spin*(spin+1)) > 1e-6:
                    raise RuntimeError("S² 本征值未通过量子数校验")
                levels.append((energy,spin,occupations))
    levels.sort(key=lambda x:(x[0],x[1]))
    grouped = []
    for energy,spin,occupations in levels:
        match = next((g for g in reversed(grouped) if abs(g["shiftedEnergy"]-energy)<=tol and g["spin"]==spin),None)
        if match is None:
            match = {"shiftedEnergy":energy,"spin":spin,"S2":spin*(spin+1),"degeneracy":0,"sumOccupations":np.zeros(5)}
            grouped.append(match)
        match["degeneracy"] += 1
        match["sumOccupations"] += occupations
    grouped.sort(key=lambda g:(round(g["shiftedEnergy"]/tol),g["spin"]))
    lowest = min(g["shiftedEnergy"] for g in grouped)
    groups = []
    for i,g in enumerate(grouped):
        groups.append({"index":i,"energy":g["shiftedEnergy"]+common,"relativeEnergy":max(0.,g["shiftedEnergy"]-lowest),
                       "spin":g["spin"],"S2":g["S2"],"degeneracy":g["degeneracy"],
                       "spinMultiplets":g["degeneracy"]/int(2*g["spin"]+1),
                       "orbitalOccupations":(g["sumOccupations"]/g["degeneracy"]).tolist()})
    ground_groups = [g for g in groups if g["relativeEnergy"]<=tol]
    degeneracy = sum(g["degeneracy"] for g in ground_groups)
    ground = {"energy":lowest+common,"degeneracy":degeneracy,
              "spins":sorted({g["spin"] for g in ground_groups}),
              "S2":sum(g["S2"]*g["degeneracy"] for g in ground_groups)/degeneracy,
              "orbitalOccupations":sum((np.array(g["orbitalOccupations"])*g["degeneracy"] for g in ground_groups),np.zeros(5)).tolist()}
    ground["orbitalOccupations"] = [v/degeneracy for v in ground["orbitalOccupations"]]
    excited = [g["relativeEnergy"] for g in groups if g["relativeEnergy"]>tol]
    ground["gap"] = min(excited) if excited else None
    errors.update({"dimension":sum(sizes),"maxBlockDimension":max(sizes),"blockDimensions":sizes,
                   "occupationResidual":max(abs(sum(g["orbitalOccupations"])-electrons) for g in groups),
                   "multipletCountResidual":max(abs(g["spinMultiplets"]-round(g["spinMultiplets"])) for g in groups)})
    return groups,ground,errors


def run(payload):
    if not isinstance(payload,dict):
        raise ValueError("输入必须是 JSON 对象")
    allowed = {"electrons","coordination","splitting","coulombU","hundJ","selectedGroup","scanMax","scanPoints"}
    if set(payload)-allowed:
        raise ValueError("不支持的参数："+", ".join(sorted(set(payload)-allowed))+"；本模块没有 SOC 或任意库仑矩阵接口")
    p = {"electrons":_number(payload,"electrons",6,0,10,True),
         "coordination":payload.get("coordination","octahedral"),
         "splitting":_number(payload,"splitting",1,0,10),
         "coulombU":_number(payload,"coulombU",4,0,20),
         "hundJ":_number(payload,"hundJ",.6,0,2),
         "selectedGroup":_number(payload,"selectedGroup",0,0,251,True),
         "scanMax":_number(payload,"scanMax",5,0,10),
         "scanPoints":_number(payload,"scanPoints",21,3,41,True)}
    if p["coordination"] not in ("octahedral","tetrahedral"):
        raise ValueError("coordination 必须为 octahedral 或 tetrahedral")
    if p["coulombU"]+1e-12 < 3*p["hundJ"]:
        raise ValueError("本教学范围要求 U≥3J≥0，使平行自旋的不同轨道密度排斥非负")
    n,coord,delta,u,j = (p[k] for k in ("electrons","coordination","splitting","coulombU","hundJ"))
    groups,ground,checks = spectrum(n,coord,delta,u,j)
    if p["selectedGroup"] >= len(groups):
        raise ValueError(f"所选联合能量/自旋组超出范围：本次结果只有 {len(groups)} 组，序号从0开始")
    # Include the currently selected Delta exactly, in addition to the grid.
    xs = sorted(set(np.linspace(0,p["scanMax"],p["scanPoints"]).tolist()+[delta]))
    rows = []
    for d in xs:
        if d == delta:
            state = ground
        else:
            _,state,_ = spectrum(n,coord,d,u,j,False)
        rows.append({"splitting":float(d),"groundEnergy":state["energy"],
                     "relativeEnergy":state["energy"]-ground["energy"],"degeneracy":state["degeneracy"],
                     "spins":state["spins"],"S2":state["S2"],"orbitalOccupations":state["orbitalOccupations"],"gap":state["gap"]})
    checks["passed"] = all(checks[k]<1e-6 for k in ("hermiticityResidual","spinCommutatorResidual","eigenResidual","spinResidual","occupationResidual","multipletCountResidual"))
    warnings = [
        "这是固定电子数、孤立五 d 轨道的 Kanamori 教学模型，包含自旋翻转与成对跃迁；没有 SOC、磁场、配体杂化、带宽、温度或电荷转移。",
        "U′=U−2J；不同轨道同自旋排斥为 U−3J。五轨道统一 J 的 Kanamori 近似不等于完整 F⁰/F²/F⁴ Slater 相互作用，不输出真实原子 LS 项符号、NiO 激发谱或 XAS/RIXS。",
        "无 SOC 且相互作用保持自旋 SU(2)，因此可用严格 S 分类；能量相同但 S 不同的子空间分别显示。占据数在同能量、同 S 的全部简并态上平均。",
        "固定 N 时 U 只贡献共同偏移 U·N(N−1)/2；改变 U 不改变此模型的能级差、自旋或占据。不同 N 的总能量不能直接代替真实材料的电荷转变能。",
        "扫描只显示有限采样点，未自动寻找全部交叉点；自旋切换处须局部加密。基态偶然包含多个 S 时报告各个 S，平均 S² 不代表某个纯态的自旋量子数。",
        "配位与 Δ 为现象学输入；没有从真实结构拟合。NiO 仅为 d⁸ 局域配位的材料背景，所有预设参数为教学值。",
    ]
    return {"schema":"symmetry-lab-local-multiplet-1","model":"five-orbital-kanamori-no-soc","parameters":p,
            "units":{"energy":"eV","spin":"ℏ=1","occupations":"electrons per orbital"},
            "dimension":math.comb(10,n),"orbitalLabels":ORBITALS.copy(),"orbitalEnergies":orbital_energies(coord,delta).tolist(),
            "groups":groups,"ground":ground,"selection":groups[p["selectedGroup"]],
            "scan":{"splittings":xs,"rows":rows,"energyReference":"selected-Delta ground energy","includesSelection":True},
            "checks":checks,"warnings":warnings,"sources":SOURCES,
            "derivation":[
                {"title":"固定粒子数的 Fock 空间","formula":"dim H_N=C(10,N)","text":"十个自旋轨道按费米反对易规则生成行列式；再按 N↑、N↓ 分块。"},
                {"title":"立方晶场与完整交换项","formula":"H=Σ_mσ ε_m n_mσ + H_K(U,U′=U−2J,J)","text":"同轨道 U、异轨道异自旋 U−2J、同自旋 U−3J，以及 −J S⁺_m S⁻_n 和 +J P†_m P_n 的全部有序轨道对。"},
                {"title":"在简并子空间解析自旋","formula":"[H,S²]=0；S²=S(S+1)","text":"先对角化每个 Sz 块，再在同能子空间对角化 S²。联合子空间的占据迹平均不依赖数值本征矢选基。"},
                {"title":"比较竞争的能量尺度","formula":"Δ/J 与 N 决定当前模型的自旋竞争；ΔU 仅增加 ΔU·N(N−1)/2", "text":"扫描 Δ 时保持 N、U、J 和配位固定，查看基态 S、轨道占据和到下一不同能量组的间隔。"}
            ]}
