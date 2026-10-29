"""Dimensionless phi^4 domain wall and independent SSH interface (GPL-3.0)."""
import math
import numpy as np

RELEASE = '20261029-pathways1'

def number(p, key, default, lo, hi, integer=False):
    v = p.get(key, default)
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi:
        raise ValueError(f'{key} must be finite in [{lo}, {hi}]')
    if integer and int(v) != v:
        raise ValueError(f'{key} must be an integer')
    return int(v) if integer else float(v)

def wall_profile(kappa, beta, amplitude, extent, count):
    width = math.sqrt(2*kappa/(beta*amplitude**2))
    x = np.linspace(-extent*width, extent*width, count)
    dx = x[1]-x[0]
    y = amplitude*np.tanh(x/width)
    y[0], y[-1] = -amplitude, amplitude
    # Antisymmetry pins the wall centre; only the positive half is solved.
    # On a discrete grid translation is not an exact zero mode: check stability.
    mid = count//2
    y[mid] = 0
    for _ in range(40):
        f = kappa*(2*y[mid+1:-1]-y[mid:-2]-y[mid+2:])/dx**2 + beta*y[mid+1:-1]*(y[mid+1:-1]**2-amplitude**2)
        if np.max(np.abs(f)) < 1e-10:
            break
        diag = 2*kappa/dx**2 + beta*(3*y[mid+1:-1]**2-amplitude**2)
        h = np.diag(diag) + np.diag(np.full(len(diag)-1, -kappa/dx**2), 1) + np.diag(np.full(len(diag)-1, -kappa/dx**2), -1)
        step = np.linalg.solve(h, f)
        old = np.linalg.norm(f)
        damping = 1.
        for _ in range(20):
            trial = y.copy(); trial[mid+1:-1] -= damping*step
            g = kappa*(2*trial[mid+1:-1]-trial[mid:-2]-trial[mid+2:])/dx**2 + beta*trial[mid+1:-1]*(trial[mid+1:-1]**2-amplitude**2)
            if np.linalg.norm(g) < old: break
            damping *= .5
        y = trial
        y[:mid] = -y[:mid:-1]
    force = kappa*(2*y[1:-1]-y[:-2]-y[2:])/dx**2 + beta*y[1:-1]*(y[1:-1]**2-amplitude**2)
    potential = beta/4*(y*y-amplitude**2)**2
    gradient = kappa/2*(np.diff(y)/dx)**2
    tension = float(dx*(gradient.sum()+potential[1:-1].sum()))
    return x, y, potential, gradient, tension, float(np.max(np.abs(force)))

def wall_stability(x, y, kappa, beta, amplitude):
    """Hessian of the *discrete energy*, with fixed endpoint values.

    The full Hessian permits motion of the wall relative to the grid. The
    pinned Hessian restricts variations to the antisymmetric subspace used by
    the solver. Its orthonormal coordinates give the positive-half block.
    """
    dx=x[1]-x[0]
    diagonal=2*kappa/dx**2+beta*(3*y[1:-1]**2-amplitude**2)
    hessian=dx*(np.diag(diagonal)+np.diag(np.full(len(diagonal)-1,-kappa/dx**2),1)
                +np.diag(np.full(len(diagonal)-1,-kappa/dx**2),-1))
    mid=len(y)//2
    pinned=hessian[mid:,mid:]
    full_min=float(np.linalg.eigvalsh(hessian)[0])
    pinned_min=float(np.linalg.eigvalsh(pinned)[0])
    tolerance=1e-9*max(1.,float(np.linalg.norm(hessian,ord=np.inf)))
    return {'minimumUnconstrainedHessianEigenvalue':full_min,
            'minimumPinnedHessianEigenvalue':pinned_min,
            'hessianTolerance':tolerance,
            'pinnedLocallyStable':pinned_min>=-tolerance,
            'unconstrainedLocallyStable':full_min>=-tolerance}

def ssh_matrix(sites, hopping, dimerization, width, potential, interface):
    bonds = np.arange(sites-1, dtype=float)
    delta = dimerization*np.tanh((bonds-(sites-2)/2)/width) if interface else np.full(sites-1, dimerization)
    t = hopping*(1+(-1.)**bonds*delta)
    h = np.diag(-t, 1)+np.diag(-t, -1)
    # A potential on the central pair explicitly breaks chiral symmetry.
    h[sites//2-1, sites//2-1] = potential
    h[sites//2, sites//2] = potential
    return h, t

def calculate(payload):
    if not isinstance(payload, dict): raise ValueError('Input must be an object')
    experiment = payload.get('experiment', 'landau')
    if experiment not in ('landau', 'ssh'): raise ValueError('Unknown experiment')
    p = dict(experiment=experiment,
        kappa=number(payload,'kappa',1,.05,8), beta=number(payload,'beta',1,.05,8),
        amplitude=number(payload,'amplitude',1,.2,3), extent=number(payload,'extent',8,4,16),
        gridPoints=number(payload,'gridPoints',81,41,161,True),
        sites=number(payload,'sites',60,20,100,True), hopping=number(payload,'hopping',1,.1,3),
        dimerization=number(payload,'dimerization',.4,.05,.85), sshWidth=number(payload,'sshWidth',2,.5,10),
        onsite=number(payload,'onsite',0,-2,2), probeEnergy=number(payload,'probeEnergy',0,-6,6),
        eta=number(payload,'eta',.03,.005,.2), interface=payload.get('interface','wall'))
    if p['gridPoints']%2 != 1: raise ValueError('gridPoints must be odd')
    if p['sites']%2: raise ValueError('sites must be even to compare balanced bipartite chains')
    if p['interface'] not in ('wall','uniform'): raise ValueError('Unknown interface')
    summary, plots, tables = [], [], []
    result = {'release':RELEASE,'model':experiment,'parameters':p}
    if experiment == 'landau':
        k,b,v = p['kappa'],p['beta'],p['amplitude']
        x,y,pot,grad,tension,res = wall_profile(k,b,v,p['extent'],p['gridPoints'])
        fine = wall_profile(k,b,v,p['extent'],2*p['gridPoints']-1)
        stability=wall_stability(x,y,k,b,v)
        width = math.sqrt(2*k/(b*v*v)); exact = 2*math.sqrt(2*k*b)*v**3/3
        analytic = v*np.tanh(x/width)
        result.update(profile={'x':x.tolist(),'orderParameter':y.tolist(),'analytic':analytic.tolist(),'potential':pot.tolist(),'bondGradientEnergy':grad.tolist()},
            wall={'width':width,'tension':tension,'continuumTension':exact,'fineTension':fine[4],
                  'gridSpacing':float(x[1]-x[0]),'gridSpacingOverWidth':float((x[1]-x[0])/width)},
            checks={'stationaryResidual':res,'fineStationaryResidual':fine[5],
                    'antisymmetryResidual':float(np.max(np.abs(y+y[::-1]))),'gridTensionDifference':abs(tension-fine[4]),
                    'gridRelativeTensionDifference':abs(tension-fine[4])/exact,
                    'continuumProfileMaxError':float(np.max(np.abs(y-analytic))),**stability},
            warnings=['x、序参量与自由能均为约化教学单位；κ、β、v不对应已拟合的BaTiO₃材料参数。','固定两端−v/+v并用反对称条件固定壁中心。宽度ξ是tanh尺度；有限网格能量与无限连续解存在离散及边界误差。','求解的是中心约束的静态标量180°壁驻点；小驻点残差不证明解除中心约束后的稳定性。离散网格破坏连续平移对称，须另查 Hessian。','未包含静电、弹性、畴切换动力学或真实材料壁能。'])
        summary=[{'label':'连续解宽度 ξ','value':width,'unit':'约化长度'},{'label':'离散畴壁能','value':tension,'unit':'约化能量/面积'},{'label':'无限连续解壁能','value':exact},{'label':'加密网格能量差','value':abs(tension-fine[4])}]
        summary.append({'label':'解除中心约束的离散稳定性','value':'未发现负方向（数值容差内）' if stability['unconstrainedLocallyStable'] else '存在负方向：需加密网格/检查钉扎'})
        if not stability['unconstrainedLocallyStable']:
            result['warnings'].append('当前粗网格驻点的完整离散能量 Hessian 有负本征值；它在允许壁中心移动时不稳定，不能据小残差宣称自由壁稳定。请加密网格并比较。')
        plots=[{'title':'连接两个极小值的畴壁','xLabel':'x（约化长度）','yLabel':'φ(x)','series':[{'label':'中心约束离散驻点','points':list(map(list,zip(x.tolist(),y.tolist())))},{'label':'无限域 tanh 解','points':list(map(list,zip(x.tolist(),analytic.tolist())))}]},
            {'title':'局域势能与梯度代价','xLabel':'x（约化长度）','yLabel':'约化能量密度','series':[{'label':'局域双阱势','points':list(map(list,zip(x.tolist(),pot.tolist())))},{'label':'键中点梯度项','points':list(map(list,zip(((x[1:]+x[:-1])/2).tolist(),grad.tolist())))}]}]
    else:
        h,t = ssh_matrix(p['sites'],p['hopping'],p['dimerization'],p['sshWidth'],p['onsite'],p['interface']=='wall')
        e,u = np.linalg.eigh(h); densities = np.abs(u)**2
        eta=p['eta']; probe=p['probeEnergy']; ldos=densities@(eta/math.pi/((probe-e)**2+eta**2))
        mass=np.diag((-1.)**np.arange(p['sites'])); chiral=float(np.max(np.abs(mass@h+h@mass)))
        # The central half of the asymptotic gap selects a *subspace*, not an arbitrary eigenvector.
        edge=2*p['hopping']*p['dimerization']; selected=np.abs(e)<edge/2
        density=densities[:,selected].sum(axis=1); count=int(selected.sum())
        center=np.abs(np.arange(p['sites'])-(p['sites']-1)/2)<=max(3.,2*p['sshWidth'])
        edge_sites=(np.arange(p['sites'])<3)|(np.arange(p['sites'])>=p['sites']-3)
        overlap=int(np.count_nonzero(center&edge_sites))
        endpoint_fraction=math.tanh((p['sites']-2)/(2*p['sshWidth'])) if p['interface']=='wall' else 1.
        result.update(spectrum={'energies':e.tolist(),'siteDensities':densities.tolist()},chain={'hoppings':t.tolist(),'ldos':ldos.tolist(),'subspaceDensity':density.tolist(),'subspaceCount':count},
            regions={'centerSites':np.flatnonzero(center).tolist(),'edgeSites':np.flatnonzero(edge_sites).tolist(),
                     'overlapSites':np.flatnonzero(center&edge_sites).tolist()},
            checks={'hermiticityResidual':float(np.max(np.abs(h-h.T))),'eigenResidual':float(np.max(np.abs(h@u-u*e))),'completenessResidual':float(np.max(np.abs(densities.sum(axis=1)-1))),'chiralResidual':chiral,'subspaceTraceResidual':abs(float(density.sum())-count),
                    'centerEdgeOverlapCount':overlap,'endpointDimerizationFraction':endpoint_fraction},
            warnings=['独立的无自旋、无相互作用SSH界面模型，t和在位势以eV计；sshWidth以键间距计，不自动等于铁电畴壁宽度。','开放链可能同时有端态和界面态。空间分布必须与能量一起判断，近零能不是界面局域性的充分条件。','近零能区取|E|<tδ，显示该子空间投影的对角元，简并态任意换基不改变结果。阈值窗口不是全部体相能隙，移动到窗口外的态不等于消失。','局域在位势破坏手征对称；有限链两端/界面之间的杂化可分裂近零能级。','LDOS 使用单位面积 Lorentz 线型，η 为半高半宽（HWHM），FWHM=2η；η只平滑有限链谱，不是器件输运中的人工吸收率。每格点 LDOS 在全部能量上的积分为1。'])
        if overlap:
            result['warnings'].append('中心窗口与两端六格点存在重叠，两个权重不可直接相加，也不能凭中心总权重认定界面局域；请结合完整空间分布或增加链长。')
        if endpoint_fraction<.95:
            result['warnings'].append('这条有限链的端点尚未接近±δ渐近键序；标出的4tδ是无限均匀体相参考能隙，不是本有限链已形成的谱隙。')
        summary=[{'label':'体相渐近能隙','value':2*edge,'unit':'eV'},{'label':'近零能子空间维数','value':count},{'label':'子空间中心区域总权重','value':float(density[center].sum())},{'label':'子空间两端六格点总权重','value':float(density[edge_sites].sum())},{'label':'手征反对易残差','value':chiral}]
        plots=[{'title':'界面两侧的键强度','xLabel':'键编号','yLabel':'跃迁（eV）','series':[{'label':'tᵢ','points':[[i,float(v)] for i,v in enumerate(t)]}]},
            {'title':'有限链全部本征能量','xLabel':'能量排序编号','yLabel':'E（eV）','series':[{'label':'本征能量','points':[[i,float(v)] for i,v in enumerate(e)]}]},
            {'title':'能量分辨的局域态密度','xLabel':'格点编号','yLabel':'LDOS（1/eV）','series':[{'label':f'E={probe:g} eV, η={eta:g} eV','points':[[i,float(v)] for i,v in enumerate(ldos)]}]},
            {'title':'近零能子空间的空间投影','xLabel':'格点编号','yLabel':'投影对角元','series':[{'label':'包含全部选中态，和等于子空间维数','points':[[i,float(v)] for i,v in enumerate(density)]}]}]
        near=np.argsort(np.abs(e))[:12]
        tables=[{'title':'靠近零能的12个态','columns':['能量（eV）','中心区域权重','两端六格点权重'],'rows':[[float(e[i]),float(densities[center,i].sum()),float(densities[edge_sites,i].sum())] for i in near]}]
    result.update(summary=summary,plots=plots,tables=tables)
    return result
