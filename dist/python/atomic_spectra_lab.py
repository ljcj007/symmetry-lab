"""Small atomic 2p -> 3d XAS with Slater integrals, SOC and exact fermions.

Original NumPy implementation. The supported configurations are p6 d8/d9
and p5 d9/d10, with 45/10 initial and 60/6 final determinants. The radial
dipole integral is set to one. Energies are eV; the final configuration's
trace barycentre is an explicitly recalibrated edge reference, not an
absolute core binding energy. All shell orbitals use Condon--Shortley phases.
"""
import math
from functools import lru_cache
from itertools import combinations
import numpy as np

KB = 8.617333262145e-5
MU_B = 5.7883818060e-5
ORBITALS = ["xy", "yz", "xz", "x²−y²", "3z²−r²"]
SOURCES = [
    {"id": "spectra-quanty-xas", "title": "Quanty：原子近似的偏振 XAS 与有限温度", "url": "https://www.quanty.org/documentation/tutorials/small_programs_a_quick_start/xas"},
    {"id": "spectra-quanty-nio", "title": "Quanty：2p–3d Slater 直接/交换项与偶极算符", "url": "https://www.quanty.org/documentation/tutorials/nio_crystal_field/xas_l23"},
    {"id": "spectra-quanty-ground", "title": "Quanty：完整 d 壳层 Slater 相互作用", "url": "https://www.quanty.org/documentation/tutorials/nio_crystal_field/groundstate"},
]


@lru_cache(maxsize=2048)
def wigner3j(j1, j2, j3, m1, m2, m3):
    """Integer-j Racah factorial formula; here only l<=2 and k<=4 occur."""
    if m1+m2+m3 or any(abs(m)>j for j,m in [(j1,m1),(j2,m2),(j3,m3)]):
        return 0.0
    if j3 > j1+j2 or j3 < abs(j1-j2):
        return 0.0
    f = math.factorial
    pref = (-1)**(j1-j2-m3)*math.sqrt(
        f(j1+j2-j3)*f(j1-j2+j3)*f(-j1+j2+j3)/f(j1+j2+j3+1)
        *f(j1+m1)*f(j1-m1)*f(j2+m2)*f(j2-m2)*f(j3+m3)*f(j3-m3))
    lo = max(0, j2-j3-m1, j1-j3+m2)
    hi = min(j1+j2-j3, j1-m1, j2+m2)
    return pref*sum((-1)**z/(f(z)*f(j1+j2-j3-z)*f(j1-m1-z)*f(j2+m2-z)
                            *f(j3-j2+m1+z)*f(j3-j1-m2+z)) for z in range(lo,hi+1))


@lru_cache(maxsize=4096)
def spherical_element(l, m, k, q, lp, mp):
    """<l,m|C^k_q|l',m'>, C=sqrt(4pi/(2k+1))*Y_kq."""
    return ((-1)**m*math.sqrt((2*l+1)*(2*lp+1))
            *wigner3j(l,k,lp,0,0,0)*wigner3j(l,k,lp,-m,q,mp))


def orbital_info(index):
    return (2, index//2-2, index%2) if index < 10 else (1, (index-10)//2-1, index%2)


COULOMB_KEYS = ("F0", "F2", "F4", "pdF0", "pdF2", "pdG1", "pdG3")


@lru_cache(maxsize=32000)
def coulomb_element(a, b, c, d, key):
    """Unsymmetrized <a b|V|c d> coefficient of one Slater radial integral."""
    la,ma,sa = orbital_info(a); lb,mb,sb = orbital_info(b)
    lc,mc,sc = orbital_info(c); ld,md,sd = orbital_info(d)
    if sa != sc or sb != sd:
        return 0.0
    k = int(key[-1])
    allowed = ((key[0] == 'F' and la == lb == lc == ld == 2)
               or (key.startswith('pdF') and la == lc and lb == ld and la != lb)
               or (key.startswith('pdG') and la == ld and lb == lc and la != lb))
    if not allowed:
        return 0.0
    q = ma-mc
    if abs(q) > k or mb-md != -q:
        return 0.0
    return (-1)**q*spherical_element(la,ma,k,q,lc,mc)*spherical_element(lb,mb,k,-q,ld,md)


def apply_product(state, operators):
    sign = 1
    for create, index in reversed(operators):
        bit = 1 << index
        if bool(state & bit) == create:
            return None
        if (state & (bit-1)).bit_count() % 2:
            sign = -sign
        state = state | bit if create else state & ~bit
    return state, sign


def determinant_basis(nd, npcore):
    return tuple(sum(1 << i for i in ds)+sum(1 << (10+i) for i in ps)
                 for ds in combinations(range(10),nd)
                 for ps in combinations(range(6),npcore))


def one_body(matrix, basis_out, basis_in=None):
    basis_in = basis_out if basis_in is None else basis_in
    out = np.zeros((len(basis_out),len(basis_in)),complex)
    lookup = {state:i for i,state in enumerate(basis_out)}
    nz = np.argwhere(abs(matrix)>1e-13)
    for col,state in enumerate(basis_in):
        for a,b in nz:
            pair = apply_product(state, ((True,int(a)),(False,int(b))))
            if pair is not None and pair[0] in lookup:
                out[lookup[pair[0]],col] += matrix[a,b]*pair[1]
    return out


@lru_cache(maxsize=2)
def pair_terms():
    pairs = [(a,b) for a,b in combinations(range(16),2) if a < 10]
    terms = {key:[] for key in COULOMB_KEYS}
    for a,b in pairs:
        for c,d in pairs:
            if (a<10)+(b<10) != (c<10)+(d<10):
                continue
            for key in COULOMB_KEYS:
                value = coulomb_element(a,b,c,d,key)-coulomb_element(a,b,d,c,key)
                if abs(value)>1e-13:
                    terms[key].append((a,b,c,d,value))
    return terms


def angular_one_body(l, offset):
    """Orbital and spin matrices in the complete 16-spin-orbital basis."""
    lp = np.zeros((16,16),complex); sp = np.zeros_like(lp)
    lz = np.zeros_like(lp); sz = np.zeros_like(lp)
    for m in range(-l,l+1):
        for spin in range(2):
            a = offset+2*(m+l)+spin
            lz[a,a] = m; sz[a,a] = .5 if spin == 0 else -.5
            if m < l:
                lp[a+2,a] = math.sqrt(l*(l+1)-m*(m+1))
        sp[offset+2*(m+l),offset+2*(m+l)+1] = 1
    return ((lp+lp.conj().T)/2, (lp-lp.conj().T)/(2j), lz,
            (sp+sp.conj().T)/2, (sp-sp.conj().T)/(2j), sz)


def real_d_transform():
    """Columns xy,yz,xz,x2-y2,z2 in spherical m=-2...2."""
    u = np.zeros((5,5),complex); r = math.sqrt(.5)
    u[0,0] = 1j*r; u[4,0] = -1j*r
    u[1,1] = 1j*r; u[3,1] = 1j*r
    u[1,2] = r; u[3,2] = -r
    u[0,3] = r; u[4,3] = r; u[2,4] = 1
    return u


@lru_cache(maxsize=6)
def configuration_operators(nd, npcore):
    basis = determinant_basis(nd,npcore); dim = len(basis)
    index = {state:i for i,state in enumerate(basis)}
    ops = {}
    for key,terms in pair_terms().items():
        h = np.zeros((dim,dim),complex)
        for col,state in enumerate(basis):
            for a,b,c,d,value in terms:
                pair = apply_product(state, ((True,a),(True,b),(False,d),(False,c)))
                if pair is not None:
                    row = index.get(pair[0])
                    if row is not None:
                        h[row,col] += pair[1]*value
        ops[key] = h
    for l,offset,suffix in [(2,0,'d'),(1,10,'p')]:
        angular = angular_one_body(l,offset)
        for name,m in zip(('Lx','Ly','Lz','Sx','Sy','Sz'),angular):
            ops[name+suffix] = one_body(m,basis)
        spin_orbit = sum(angular[k]@angular[k+3] for k in range(3))
        ops['soc'+suffix.upper()] = one_body(spin_orbit,basis)
    ops['L2'] = sum(ops[name+'d']@ops[name+'d'] for name in ('Lx','Ly','Lz'))
    ops['S2'] = sum(ops[name+'d']@ops[name+'d'] for name in ('Sx','Sy','Sz'))
    real = real_d_transform()
    for o in range(5):
        m = np.zeros((16,16),complex)
        m[:10,:10] = np.kron(np.outer(real[:,o],real[:,o].conj()),np.eye(2))
        ops['n'+str(o)] = one_body(m,basis)
    ops['tenDq'] = sum(e*ops['n'+str(i)] for i,e in enumerate((-.4,-.4,-.4,.6,.6)))
    # An explicit axial traceless distortion, not a universal structural mapping.
    ops['tetragonal'] = sum(e*ops['n'+str(i)] for i,e in enumerate((0,-.5,-.5,1,0)))
    ops['fieldTesla'] = MU_B*(ops['Lzd']+2*ops['Szd']+ops['Lzp']+2*ops['Szp'])
    for m in ops.values():
        m.setflags(write=False)
    return basis,ops


@lru_cache(maxsize=2)
def dipole_operators(nd):
    initial = determinant_basis(nd,6); final = determinant_basis(nd+1,5)
    ds = []
    for q in (-1,0,1):
        m = np.zeros((16,16),complex)
        for md in range(-2,3):
            for mp in range(-1,2):
                for spin in range(2):
                    m[2*(md+2)+spin,10+2*(mp+1)+spin] = spherical_element(2,md,1,q,1,mp)
        ds.append(one_body(m,final,initial))
    minus,z,plus = ds
    return {'x':(minus-plus)/math.sqrt(2),'y':1j*(minus+plus)/math.sqrt(2),'z':z}


def _number(p,key,default,lo,hi,integer=False):
    value = p.get(key,default)
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not lo<=value<=hi:
        raise ValueError(f'{key} 必须是 {lo} 至 {hi} 的有限数值')
    if integer and int(value) != value:
        raise ValueError(f'{key} 必须为整数')
    return int(value) if integer else float(value)


def parameters(payload):
    if not isinstance(payload,dict):
        raise ValueError('输入必须是 JSON 对象')
    configuration = payload.get('configuration','d8')
    polarization = payload.get('polarization','x')
    if configuration not in ('d8','d9'):
        raise ValueError('configuration 仅支持 d8 或 d9')
    if polarization not in ('x','y','z','plus','minus','linear'):
        raise ValueError('不支持的光偏振')
    p = {'configuration':configuration,'polarization':polarization}
    for key,default,lo,hi in [
        ('tenDq',1,0,5),('tetragonal',0,-3,3),('F0',4,0,20),('F2',10,0,20),('F4',6,0,15),
        ('pdF0',6,0,25),('pdF2',6,0,15),('pdG1',4,0,12),('pdG3',2.5,0,10),
        ('socD',.08,0,1),('socP',11.5,0,20),('fieldTesla',0,-30,30),('temperature',300,0,2000),
        ('polarizationAngle',45,0,180),('width',.35,.02,3),('energyMin',-15,-60,40),('energyMax',25,-40,70)]:
        p[key] = _number(payload,key,default,lo,hi)
    p['samples'] = _number(payload,'samples',401,101,601,True)
    if p['energyMax']<=p['energyMin']:
        raise ValueError('energyMax 必须大于 energyMin')
    unsupported = set(payload)&{'rixs','ligand','chargeTransfer','exchangeField','absoluteEdge','selfConsistent'}
    if unsupported:
        raise ValueError('本模块未实现 '+', '.join(sorted(unsupported)))
    return p


def hamiltonian(p, final=False):
    nd = int(p['configuration'][-1])
    basis,ops = configuration_operators(nd+int(final),5 if final else 6)
    h = sum(p[key]*ops[key] for key in COULOMB_KEYS+('socD','socP','tenDq','tetragonal','fieldTesla'))
    return np.asarray(h),basis,ops


def _groups(energies,tolerance=1e-8):
    groups=[]
    for index,e in enumerate(energies):
        if not groups or abs(e-energies[groups[-1][0]])>tolerance:
            groups.append([index])
        else:
            groups[-1].append(index)
    return groups


def _expect(matrix,vectors):
    return np.einsum('ij,ij->j',vectors.conj(),matrix@vectors).real


def _weights(energies,temperature):
    # Numerical eigenvalue splittings within the same displayed degenerate
    # subspace must not choose a preferred vector at arbitrarily small T.
    # Use one energy per group at every temperature, including the T -> 0 limit.
    groups=_groups(energies)
    centers=np.array([np.mean(energies[g]-energies[0]) for g in groups])
    relative=centers-centers[0]
    thermal_energy=KB*temperature
    w=np.zeros(len(energies))
    if thermal_energy==0:
        w[groups[0]]=1.
    else:
        for g,delta in zip(groups,relative):
            # Avoid overflow in delta/kBT and underflow warnings in exp for
            # subnormal positive temperatures; the limiting occupation is zero.
            w[g]=0. if delta>=745*thermal_energy else math.exp(-float(delta)/thermal_energy)
    return w/w.sum()


def run(payload):
    p=parameters(payload); nd=int(p['configuration'][-1])
    hi,bi,oi=hamiltonian(p); hf,bf,of=hamiltonian(p,True)
    ei,vi=np.linalg.eigh(hi); ef,vf=np.linalg.eigh(hf)
    reference=float(np.trace(hf).real/len(bf))
    eir=ei-ei[0]; efr=ef-reference; weights=_weights(ei,p['temperature'])
    ig=_groups(ei); fg=_groups(ef)
    expect={key:_expect(oi[key],vi) for key in ('S2','L2','Szd','Lzd','n0','n1','n2','n3','n4')}
    initial_levels=[{'energy':float(np.mean(eir[g])),'degeneracy':len(g),'population':float(weights[g].sum()),
                     'S2':float(np.mean(expect['S2'][g])),'L2':float(np.mean(expect['L2'][g]))} for g in ig]
    final_levels=[{'energy':float(np.mean(efr[g])),'degeneracy':len(g)} for g in fg]
    ground_idx=ig[0]
    ground={'degeneracy':len(ground_idx),'S2':float(np.mean(expect['S2'][ground_idx])),
            'L2':float(np.mean(expect['L2'][ground_idx])), 'Sz':float(np.mean(expect['Szd'][ground_idx])),
            'Lz':float(np.mean(expect['Lzd'][ground_idx])),
            'orbitalOccupations':[float(np.mean(expect['n'+str(i)][ground_idx])) for i in range(5)]}
    thermal={'S2':float(weights@expect['S2']),'L2':float(weights@expect['L2']),
             'Sz':float(weights@expect['Szd']),'Lz':float(weights@expect['Lzd']),
             'magneticMomentMuB':float(-weights@(expect['Lzd']+2*expect['Szd']))}
    dips=dipole_operators(nd)
    x,y,z=[vf.conj().T@dips[k]@vi for k in ('x','y','z')]
    angle=math.radians(p['polarizationAngle'])
    amps={'x':x,'y':y,'z':z,'plus':(x+1j*y)/math.sqrt(2),'minus':(x-1j*y)/math.sqrt(2),
          'linear':math.cos(angle)*x+math.sin(angle)*z}
    intensities={key:abs(a)**2*weights[None,:] for key,a in amps.items()}
    transition_energies=efr[:,None]-eir[None,:]
    energies=np.linspace(p['energyMin'],p['energyMax'],p['samples'])
    gamma=p['width'] # HWHM of normalized Lorentzian; never call this FWHM.
    kernel=gamma/math.pi/((energies[:,None,None]-transition_energies[None,:,:])**2+gamma**2)
    spectra={key:np.einsum('efi,fi->e',kernel,intensity) for key,intensity in intensities.items()}
    spectra['isotropic']=(spectra['x']+spectra['y']+spectra['z'])/3
    spectra['xmcd']=spectra['plus']-spectra['minus']
    spectra['xld']=spectra['z']-spectra['x']
    selected=intensities[p['polarization']]
    whole_strength=float(selected.sum())
    window_fraction=(np.arctan((p['energyMax']-transition_energies)/gamma)
                     -np.arctan((p['energyMin']-transition_energies)/gamma))/math.pi
    exact_window=float(np.sum(window_fraction*selected))
    numeric_window=float(np.sum((spectra[p['polarization']][:-1]+spectra[p['polarization']][1:])/2*np.diff(energies)))
    closure=sum(d.conj().T@d for d in dips.values())
    # Sum over x,y,z gives 2/5 times the number of empty 3d spin orbitals.
    hole_sum=.4*(10-nd)
    closure_error=float(np.max(abs(closure-hole_sum*np.eye(len(bi)))))
    total_strength=sum(float(intensities[k].sum()) for k in ('x','y','z'))
    lines=[]
    for a,g in enumerate(ig):
        for b,h in enumerate(fg):
            strength=float(selected[np.ix_(h,g)].sum())
            if strength>1e-12:
                lines.append({'energy':float(np.mean(efr[h])-np.mean(eir[g])),
                              'strength':strength,'initialGroup':a,'finalGroup':b})
    lines.sort(key=lambda row:-row['strength'])
    residual=max(float(np.max(abs(hi@vi-vi*ei))),float(np.max(abs(hf@vf-vf*ef))))
    grid_step=float(energies[1]-energies[0]); errors=[]
    if grid_step>gamma/3:
        errors.append('能量步长较线宽大，请增加采样点或缩小窗口；细峰形可能未充分分辨。')
    if whole_strength>0 and exact_window/whole_strength<.95:
        errors.append('当前能量窗口未包含全部 Lorentz 尾部或跃迁线；曲线面积不等于无限窗口积分强度。')
    if abs(p['fieldTesla'])<1e-12:
        errors.append('零外场采用热平衡/简并态等权混合；不会自动生成磁畴、交换场或反铁磁有序。')
    zero_field_difference=float(np.max(abs(spectra['xmcd']))) if p['fieldTesla']==0 else None
    checks={'hermiticityResidual':max(float(np.max(abs(hi-hi.conj().T))),float(np.max(abs(hf-hf.conj().T)))),
            'eigenResidual':residual,'dipoleClosureResidual':closure_error,
            'threePolarizationStrength':total_strength,'expectedHoleStrength':hole_sum,
            'selectedIntegratedStrength':whole_strength,'exactWindowStrength':exact_window,
            'numericalWindowStrength':numeric_window,'windowFraction':exact_window/whole_strength if whole_strength>1e-14 else 0,
            'windowQuadratureDifference':abs(numeric_window-exact_window),'energyStep':grid_step,
            'gridResolved':grid_step<=gamma/3,'populationSum':float(weights.sum()),
            'groundOccupationSum':sum(ground['orbitalOccupations']),
            'zeroFieldCircularDifference':zero_field_difference,
            'passed':bool(residual<1e-8 and closure_error<1e-10 and abs(total_strength-hole_sum)<1e-10
                          and abs(weights.sum()-1)<1e-12
                          and (zero_field_difference is None or zero_field_difference<1e-9))}
    warnings=[
        '单离子 p⁶d⁸/d⁹ → p⁵d⁹/d¹⁰ 原子近似；无配体杂化、电荷转移、晶体磁有序或 RIXS，不代表完整 NiO/CuO 实验谱。',
        '3d F⁰/F²/F⁴ 与 2p–3d F⁰/F²/G¹/G³ 是 Slater 径向积分；不能把 F⁰ 直接叫旧 Kanamori U 或把 F²/F⁴ 替换成单个 J。初末态使用相同径向参数，未拟合芯空穴径向松弛。',
        '横轴 E=(E_f−Tr H_f/dim H_f)−(E_i−E_i,min)，每次参数变化重新校准末态重心；未计算绝对吸收边或化学位移。F⁰ 公共位移在此坐标中消去。',
        '偶极径向积分设为1，曲线为相对强度/eV；Lorentz 参数 Γ 是半高半宽（HWHM），不是绝对截面或实验仪器响应。',
        '± 偏振定义为 (x±iy)/√2，固定沿 z 的传播几何；linear 为 cosθ x+sinθ z，可取沿 y 传播。XMCD=I₊−I₋，XLD=I_z−I_x，符号依赖这些约定。',
        'SOC 存在时 S 与 L 一般不是好量子数；表中给出期望值而不强行贴完整 LS 项标签。',
    ]+errors
    return {'parameters':p,'units':{'energy':'eV relative to final-configuration barycentre','field':'T','temperature':'K','spectrum':'relative dipole strength/eV','width':'eV HWHM','angularMomentum':'hbar=1'},
            'dimensions':{'initial':len(bi),'final':len(bf)},'orbitalLabels':ORBITALS,
            'ground':ground,'thermal':thermal,'initialLevels':initial_levels,'finalLevels':final_levels,
            'spectrum':{'energies':energies.tolist(),'selected':spectra[p['polarization']].tolist(),
                        **{k:v.tolist() for k,v in spectra.items()}},
            'transitions':lines,'transitionCount':len(lines),'checks':checks,'warnings':warnings,
            'derivation':[
                {'title':'完整壳层角向相互作用','formula':'U_abcd=Σ_k R^k Σ_q (−1)^q〈a|Cᵏ_q|c〉〈b|Cᵏ_−q|d〉','text':'费米行列式中使用反对称化两电子矩阵元；晶场与单电子 Σ l·s 在同一球谐基中构造。'},
                {'title':'有芯空穴的末态','formula':'p⁶dⁿ → p⁵dⁿ⁺¹；D_ε=Σ_(m,m′,σ)〈2m|ε·r̂|1m′〉d†_(mσ)p_(m′σ)','text':'偶极跃迁守恒自旋并改变轨道宇称；完整末态空间保留核心 SOC 和 p–d 交换。'},
                {'title':'热平均的谱线','formula':'I_ε(E)=Σ_i,f p_i |〈f|D_ε|i〉|² Γ/[π((E−ΔE_fi)²+Γ²)]','text':'以数值简并组的平均能量计算 Boltzmann 权重，组内每态等权；T=0 或热能下溢时取基态等权极限，不随求解器任意基底改变结果。'},
                {'title':'积分与完备性','formula':'Σ_(ε=x,y,z) ∫ I_ε(E)dE=(2/5)(10−n)','text':'此关系在径向积分设为1及完整 p→d 壳层下成立；有限窗口的 Lorentz 尾部另以解析积分核验。'}],
            'sources':SOURCES}
