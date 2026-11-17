"""Coherent neutron one-phonon weights from supplied 3D Phonopy modes.

No force constants, missing modes, time-reversed modes, or thermal displacement
tensors are generated. Lattice rows, Cartesian atom-phase eigenvectors and raw
q representatives remain paired with the original input.
"""
import math
import numpy as np
import phonopy_import as importer

H_J_S = 6.62607015e-34
EV_J = 1.602176634e-19
AMU_KG = 1.66053906660e-27
HBAR_J_S = H_J_S / (2 * math.pi)
KB_MEV_K = 8.617333262145e-2
THZ_MEV = H_J_S * 1e12 / (EV_J * .001)
CM_MEV = H_J_S * 299792458. * 100 / (EV_J * .001)
QUANTUM_FACTOR = HBAR_J_S**2 / (2 * AMU_KG * 1e-20 * EV_J * .001)
SCHEMA = 'symmetry-lab-phonopy-scattering-1'
MATCH_TOLERANCE = 1e-8
VECTOR_TOLERANCE = 2e-6
MAX_ATOMS = 64
SOURCES = [
    {'title': 'Phonopy: coherent one-phonon dynamic structure factor', 'url': 'https://phonopy.github.io/phonopy/dynamic-structure-factor.html'},
    {'title': 'Phonopy: dynamical matrix and atom-phase eigenvectors', 'url': 'https://phonopy.github.io/phonopy/formulation.html#dynamical-matrix'},
    {'title': 'Phonopy: complete complex eigenvector output', 'url': 'https://phonopy.github.io/phonopy/output-files.html#mesh-yaml-band-yaml-qpoints-yaml'},
    {'title': 'NIST NCNR: bound coherent neutron scattering lengths in fm', 'url': 'https://www.ncnr.nist.gov/resources/n-lengths/list.html'},
]
FIELDS = {'content','data','filename','structure_content','structure_data','frequency_unit','length_unit','mass_unit',
          'eigenvectorConvention','primitiveOrderConfirmed','qIndex','G','Q','QCoordinates','channel','negativeQIndex',
          'coherentLengths','scatteringLengthUnit','scatteringLengthSource','temperature','debyeWaller',
          'energyCutoff','groupTolerance','sigma','energyMin','energyMax','energyPoints'}


def _num(value, name, low=-1e12, high=1e12):
    return importer._number(value, name, low, high)


def _integer(value, name, low, high):
    return importer._integer(value, name, low, high)


def _unit(value, kind):
    if not isinstance(value, str):
        raise ValueError(kind + ' 单位必须明确声明')
    key = value.strip().lower()
    aliases = {
        'frequency_unit': {'thz':'THz','cm^-1':'cm^-1','cm-1':'cm^-1','cm⁻¹':'cm^-1','mev':'meV'},
        'length_unit': {'angstrom':'angstrom','å':'angstrom','ångström':'angstrom','angstroem':'angstrom'},
        'mass_unit': {'amu':'amu','u':'amu','da':'amu','dalton':'amu'},
        'scatteringLengthUnit': {'fm':'fm'},
        'thermal_tensor': {'angstrom^2':'angstrom^2','angstrom²':'angstrom^2','å^2':'angstrom^2','å²':'angstrom^2'},
    }
    if key not in aliases[kind]:
        raise ValueError(kind + ' 单位不受支持，请核对原始数值单位')
    return aliases[kind][key]


def _declared_units(data, frequency, length, mass):
    for field in ('frequency_unit','frequency-unit'):
        if field in data and _unit(data[field],'frequency_unit') != frequency:
            raise ValueError('频率单位声明冲突；不能仅改标签后计算谱权重')
    physical = data.get('physical_unit',{})
    if not isinstance(physical,dict):
        raise ValueError('physical_unit 必须是对象')
    for field, expected, kind in [('frequency',frequency,'frequency_unit'),('length',length,'length_unit'),('atomic_mass',mass,'mass_unit')]:
        if field in physical and _unit(physical[field],kind) != expected:
            raise ValueError('原始文件与确认的单位声明冲突：' + field)
    for field, expected, kind in [('length_unit',length,'length_unit'),('mass_unit',mass,'mass_unit')]:
        if field in data and _unit(data[field],kind) != expected:
            raise ValueError('原始文件与确认的单位声明冲突：' + field)


def _z(z):
    return [float(np.real(z)),float(np.imag(z))]


def _zs(values):
    return [_z(z) for z in values]


def _tensor_input(payload, atoms, temperature, Qcart):
    supplied = payload.get('debyeWaller')
    if not isinstance(supplied,dict) or supplied.get('mode') not in ('omit','provided'):
        raise ValueError('必须明确选择省略或提供 Debye–Waller 热位移张量')
    if supplied['mode'] == 'omit':
        if set(supplied) != {'mode'}:
            raise ValueError('省略 Debye–Waller 时不能同时附加未使用的热张量')
        return [None]*len(atoms), [0.]*len(atoms), [1.]*len(atoms), {'mode':'omit','temperature':temperature,'tensorsGenerated':False}
    if set(supplied) != {'mode','temperature','unit','tensors'}:
        raise ValueError('提供热张量须包含 mode、temperature、unit、tensors')
    tensor_t = _num(supplied['temperature'],'热张量温度',0,2000)
    if tensor_t != temperature:
        raise ValueError('热张量温度与谱计算温度必须一致')
    _unit(supplied['unit'],'thermal_tensor')
    rows = importer._list(supplied['tensors'],'热位移张量',len(atoms))
    tensors=[];exponents=[];factors=[];minimum=[]
    for raw in rows:
        tensor=np.array([[_num(x,'热张量分量',-100,100) for x in importer._list(row,'热张量行',3)]
                         for row in importer._list(raw,'热位移张量',3)])
        tolerance=1e-12*max(1.,float(np.max(abs(tensor))))
        if np.max(abs(tensor-tensor.T))>tolerance:
            raise ValueError('热位移张量必须在 Cartesian 坐标中对称')
        tensor=(tensor+tensor.T)/2
        low=float(np.min(np.linalg.eigvalsh(tensor)))
        if low < -tolerance:
            raise ValueError('热位移张量必须半正定，不能具有负方差')
        variance=float(Qcart@tensor@Qcart)
        if variance < -tolerance*max(1.,float(np.dot(Qcart,Qcart))):
            raise ValueError('热位移投影产生负方差')
        exponent=.5*max(0.,variance)
        tensors.append(tensor.tolist());exponents.append(exponent);factors.append(math.exp(-exponent));minimum.append(low)
    return tensors,exponents,factors,{'mode':'provided','temperature':temperature,'unit':'angstrom^2',
        'tensorsGenerated':False,'minEigenvalues':minimum,'symmetryPSDTolerance':1e-12}


def _weights(payload,atoms):
    _unit(payload.get('scatteringLengthUnit'),'scatteringLengthUnit')
    raw=payload.get('coherentLengths')
    if isinstance(raw,dict):
        symbols={a['symbol'] for a in atoms}
        if set(raw)!=symbols:
            raise ValueError('物种散射长度须完整且只包含当前原胞物种')
        values=[raw[a['symbol']] for a in atoms]
    else:
        values=importer._list(raw,'逐原子相干散射长度',len(atoms))
    return [_num(v,'相干中子散射长度 fm',-10000,10000) for v in values]


def _point_vectors(point,natom):
    bands=importer._list(point.get('band'),'完整声子支',3*natom)
    vectors=[];frequencies=[]
    for band in bands:
        if not isinstance(band,dict) or 'frequency' not in band or 'eigenvector' not in band:
            raise ValueError('计算散射需要所选 q 点全部 3N 条频率与完整复本征矢')
        frequencies.append(_num(band['frequency'],'输入频率'))
        data=np.array(importer._eigenvector(band['eigenvector'],natom,'复本征矢'))
        vectors.append((data[:,:,0]+1j*data[:,:,1]).reshape(-1))
    matrix=np.column_stack(vectors)
    gram=float(np.max(abs(matrix.conj().T@matrix-np.eye(3*natom))))
    if gram>VECTOR_TOLERANCE:
        raise ValueError('所选 q 点完整本征矢不是归一正交基，不能可靠计算子空间强度')
    checks={'gramResidual':gram,'dynamicalMatrixAvailable':False}
    if 'dynamical_matrix' in point:
        size=3*natom
        raw=np.array([[_num(x,'动力学矩阵分量') for x in importer._list(row,'动力学矩阵行',2*size)]
                      for row in importer._list(point['dynamical_matrix'],'动力学矩阵',size)])
        dyn=raw[:,0::2]+1j*raw[:,1::2]
        scale=max(1.,float(np.max(abs(dyn))))
        herm=float(np.max(abs(dyn-dyn.conj().T)))
        ray=np.array([np.vdot(v,dyn@v)/np.vdot(v,v) for v in vectors])
        residual=float(np.max(abs(dyn@matrix-matrix*ray)))
        if max(herm,residual)>VECTOR_TOLERANCE*scale:
            raise ValueError('序列化动力学矩阵与给定本征矢不一致')
        checks.update(dynamicalMatrixAvailable=True,hermitianResidual=herm,rayleighEigenResidual=residual,
                      frequencyEigenvalueUnitsVerified=False)
    return frequencies,vectors,checks


def _match(target,q,sign):
    raw=target-sign*np.array(q)
    integer=np.rint(raw)
    residual=float(np.max(abs(raw-integer)))
    return [int(x) for x in integer],residual


def _bose(energy,temperature):
    thermal=KB_MEV_K*temperature
    if thermal<=0 or energy>=700*thermal:
        return 0.
    return 1./math.expm1(energy/thermal)


def _channel(channel_id,qindex,q,shift,point,atoms,Qcart,frequency_factor,p):
    natom=len(atoms);frequencies,vectors,checks=_point_vectors(point,natom)
    creation=channel_id=='creation';branches=[]
    coefficients=[]
    phases=[]
    for atom in atoms:
        argument=2*math.pi*float(np.dot(atom['position'],shift))
        phases.append((argument,complex(math.cos(argument),math.sin(argument))))
        coefficients.extend(atom['coherentLengthFm']*atom['debyeWallerFactor']*phases[-1][1]*Qcart/math.sqrt(atom['mass']))
    coefficients=np.array(coefficients)
    for bi,(frequency,vector) in enumerate(zip(frequencies,vectors)):
        energy=frequency*frequency_factor
        excluded=frequency<=0 or energy<p['energyCutoff']
        occupation=None if excluded else _bose(energy,p['temperature'])
        multiplier=None if excluded else occupation+(1. if creation else 0.)
        used=vector.conj() if creation else vector
        atom_rows=[];terms=[]
        for ai,atom in enumerate(atoms):
            triple=used[3*ai:3*ai+3]
            contributions=Qcart*triple
            projection=np.sum(contributions)
            scalar=atom['coherentLengthFm']*atom['debyeWallerFactor']/math.sqrt(atom['mass'])
            term=projection*scalar*phases[ai][1]
            terms.append(term)
            atom_rows.append({'atomIndex':ai,'vectorUsed':_zs(triple),'projectionComponents':_zs(contributions),
                'projection':_z(projection),'phaseArgument':phases[ai][0],'phase':_z(phases[ai][1]),
                'massFactor':1./math.sqrt(atom['mass']),'coherentLengthFm':atom['coherentLengthFm'],
                'debyeWallerFactor':atom['debyeWallerFactor'],'scalarFactor':scalar,'term':_z(term)})
        terms=np.array(terms);total=np.sum(terms);squares=abs(terms)**2;strength=float(abs(total)**2)
        partial=np.concatenate(([0.+0.j],np.cumsum(terms)))
        weight=0. if excluded else QUANTUM_FACTOR*strength/energy*multiplier
        phase=-1j if creation else 1j
        gauge_terms=phase*terms;gauge_sum=np.sum(gauge_terms);gauge_strength=float(abs(gauge_sum)**2)
        gauge_weight=0. if excluded else QUANTUM_FACTOR*gauge_strength/energy*multiplier
        branches.append({'index':bi,'frequencyOriginal':frequency,'energyMeV':energy,'groupIndex':None,
            'excluded':excluded,'reason':('输入为非正或虚频，不计算一声子谱权重' if frequency<=0 else '低于能量截断，不计算一声子谱权重') if excluded else '',
            'eigenvector':[_zs(vector[3*i:3*i+3]) for i in range(natom)],'atoms':atom_rows,
            'terms':_zs(terms),'partialSums':_zs(partial),'sum':_z(total),'individualStrengths':squares.tolist(),
            'incoherentStrength':float(np.sum(squares)),'interference':strength-float(np.sum(squares)),
            'strength':strength,'occupation':occupation,'energyDenominator':None if excluded else 1./energy,
            'quantumFactor':QUANTUM_FACTOR,'thermalMultiplier':multiplier,'weight':weight,
            'center':None if excluded else (energy if creation else -energy),
            'gauge':{'phase':[0.,1.],'amplitudePhase':_z(phase),'terms':_zs(gauge_terms),
                'partialSums':_zs(np.concatenate(([0.+0.j],np.cumsum(gauge_terms)))),'sum':_z(gauge_sum),
                'strength':gauge_strength,'weight':gauge_weight,'expectedSum':_z(phase*total),
                'amplitudeResidual':float(abs(gauge_sum-phase*total)),
                'strengthResidual':abs(gauge_strength-strength),'weightResidual':abs(gauge_weight-weight)}})
    groups=[]
    for branch in sorted(branches,key=lambda row:row['energyMeV']):
        if not groups or branch['energyMeV']-groups[-1][0]['energyMeV']>p['groupTolerance']:
            groups.append([branch])
        else:groups[-1].append(branch)
    grouped=[]
    for gi,members in enumerate(groups):
        for member in members:member['groupIndex']=gi
        energies=[b['energyMeV'] for b in members]
        grouped.append({'index':gi,'branches':[b['index'] for b in members],
            'energyMin':min(energies),'energyMax':max(energies),'energySpread':max(energies)-min(energies),
            'energy':sum(energies)/len(energies),'amplitudeStrength':sum(b['strength'] for b in members),
            'weight':sum(b['weight'] for b in members),'excludedBranches':sum(b['excluded'] for b in members),
            'label':'group '+str(gi+1)})
    expected=float(np.sum(abs(coefficients)**2));actual=sum(b['strength'] for b in branches)
    checks.update(amplitudeClosureExpected=expected,amplitudeClosureActual=actual,
                  amplitudeClosureResidual=abs(expected-actual),
                  amplitudeClosureRelative=abs(expected-actual)/max(1.,expected),
                  gaugeStrengthResidual=max(b['gauge']['strengthResidual'] for b in branches))
    return {'id':channel_id,'qIndex':qindex,'q':list(q),'G':shift,'gramResidual':checks['gramResidual'],
            'completeBasis':True,'branches':branches,'groups':grouped,'checks':checks}


def run(payload):
    if not isinstance(payload,dict):
        raise ValueError('散射输入必须为 JSON 对象')
    unknown=set(payload)-FIELDS
    if unknown:raise ValueError('不支持的散射字段：'+', '.join(sorted(unknown)))
    if payload.get('primitiveOrderConfirmed') is not True:
        raise ValueError('请明确确认配套原胞与本征矢的原子顺序')
    if payload.get('eigenvectorConvention')!='phonopy-atom-phase':
        raise ValueError('本工具只接受明确的 phonopy-atom-phase 本征矢规范')
    frequency=_unit(payload.get('frequency_unit'),'frequency_unit')
    length=_unit(payload.get('length_unit'),'length_unit');mass=_unit(payload.get('mass_unit'),'mass_unit')
    data=importer._parse(payload);warnings=[]
    _declared_units(data,frequency,length,mass)
    companion=None
    if importer._provided(payload,'structure_data') or importer._provided(payload,'structure_content'):
        companion=importer._parse({'data':payload['structure_data']} if importer._provided(payload,'structure_data') else {'content':payload['structure_content']})
        _declared_units(companion,frequency,length,mass)
    structure=importer._supplement_structure(data,importer._structure(data,warnings),payload,warnings)
    natom=structure['natom'];atoms=structure['atoms']
    if not natom or natom>MAX_ATOMS or len(atoms)!=natom or structure['cellKind']=='supercell' or not structure['lattice']:
        raise ValueError('需要不超过64原子的完整配套原胞结构；不能用超胞替代原胞')
    if any(a['mass'] is None or a['coordinates'] is None for a in atoms):
        raise ValueError('原胞每个原子必须有明确质量和分数坐标')
    points=importer._list(data.get('phonon'),'提供的 q 点')
    if not 1<=len(points)<=importer.MAX_QPOINTS or len(points)*3*natom>importer.MAX_MODE_POINTS:
        raise ValueError('提供的 q 点或模点数量超过有界计算范围')
    if 'nqpoint' in data and _integer(data['nqpoint'],'nqpoint',1,importer.MAX_QPOINTS)!=len(points):
        raise ValueError('nqpoint 与实际提供 q 点数不一致')
    overview=[]
    for i,point in enumerate(points):
        if not isinstance(point,dict):raise ValueError('q 点必须为对象')
        q=importer._vector(point.get('q-position'),'q-position')
        bands=importer._list(point.get('band'),'完整3N声子支',3*natom)
        overview.append({'index':i,'q':q,'bandCount':len(bands),
            'completeEigenvectors':all(isinstance(b,dict) and 'eigenvector' in b for b in bands)})
    index=_integer(payload.get('qIndex'),'qIndex',0,len(points)-1)
    channel=payload.get('channel','creation')
    if channel not in ('creation','annihilation','both'):raise ValueError('通道须为 creation、annihilation 或 both')
    coordinates=payload.get('QCoordinates','primitive-reciprocal')
    if coordinates not in ('primitive-reciprocal','cartesian-angstrom^-1'):
        raise ValueError('完整 Q 坐标须明确为原胞倒易分数或 Cartesian Å⁻¹')
    lattice=np.array(structure['lattice']);reciprocal=np.linalg.inv(lattice).T
    q=np.array(overview[index]['q']);sign=-1 if channel=='annihilation' else 1
    shift=None
    if 'G' in payload:
        shift=[_integer(x,'G整数分量',-10000,10000) for x in importer._list(payload['G'],'G',3)]
    if 'Q' in payload:
        supplied=np.array(importer._vector(payload['Q'],'完整 Q'))
        Q=supplied if coordinates=='primitive-reciprocal' else supplied@lattice.T/(2*math.pi)
        actual,residual=_match(Q,q,sign)
        if residual>MATCH_TOLERANCE or shift is not None and actual!=shift:
            raise ValueError('完整 Q 与所选原始 q 和整数 G 不匹配；不采用最近邻或自动折叠')
        shift=actual
    elif shift is not None:
        if coordinates!='primitive-reciprocal':raise ValueError('只输入 G 时坐标约定须为原胞倒易分数')
        Q=sign*q+np.array(shift);residual=0.
    else:raise ValueError('必须提供整数 G 或明确坐标的完整 Q')
    Qcart=2*math.pi*(Q@reciprocal)
    p={'frequency_unit':frequency,'length_unit':length,'mass_unit':mass,'eigenvectorConvention':'phonopy-atom-phase',
        'primitiveOrderConfirmed':True,'qIndex':index,'G':shift,'Q':Q.tolist(),'QCoordinates':'primitive-reciprocal',
        'channel':channel,'temperature':_num(payload.get('temperature'),'温度 K',0,2000),
        'energyCutoff':_num(payload.get('energyCutoff',.25),'能量截断 meV',1e-6,100),
        'groupTolerance':_num(payload.get('groupTolerance',1e-5),'分组容差 meV',0,10),
        'sigma':_num(payload.get('sigma',.5),'Gaussian sigma meV',1e-4,100),
        'energyMin':_num(payload.get('energyMin',-80),'能量窗口起点 meV',-1e6,1e6),
        'energyMax':_num(payload.get('energyMax',80),'能量窗口终点 meV',-1e6,1e6),
        'energyPoints':_integer(payload.get('energyPoints',401),'能量点数',101,2001),
        'scatteringLengthUnit':'fm','scatteringLengthSource':importer._text(payload.get('scatteringLengthSource','user-declared real coherent lengths'),'散射长度来源',1000)}
    if p['energyMax']<=p['energyMin']:raise ValueError('能量窗口终点必须大于起点')
    lengths=_weights(payload,atoms)
    tensors,exponents,dw,dw_meta=_tensor_input(payload,atoms,p['temperature'],Qcart)
    atom_results=[{'index':i,'symbol':atom['symbol'],'position':atom['coordinates'],'mass':atom['mass'],
        'coherentLengthFm':lengths[i],'debyeWallerExponent':exponents[i],'debyeWallerFactor':dw[i],'thermalTensor':tensors[i]}
        for i,atom in enumerate(atoms)]
    p['coherentLengths']=lengths;p['debyeWaller']={'mode':'omit'} if dw_meta['mode']=='omit' else {
        'mode':'provided','temperature':p['temperature'],'unit':'angstrom^2','tensors':tensors}
    factor={'THz':THZ_MEV,'cm^-1':CM_MEV,'meV':1.}[frequency]
    requests=[('annihilation' if channel=='annihilation' else 'creation',index,shift)]
    if channel=='both':
        if 'negativeQIndex' in payload:
            negative=_integer(payload['negativeQIndex'],'negativeQIndex',0,len(points)-1)
            neg_shift,neg_resid=_match(Q,overview[negative]['q'],-1)
            if neg_resid>MATCH_TOLERANCE:raise ValueError('指定湮灭 q 点与 Q+q 整数条件不匹配')
        else:
            matches=[(i,_match(Q,item['q'],-1)[0]) for i,item in enumerate(overview) if _match(Q,item['q'],-1)[1]<=MATCH_TOLERANCE]
            if len(matches)!=1:
                raise ValueError('双通道需要唯一的实际负 Q 对应模；请提供或明确选择 negativeQIndex，不推断时间反演')
            negative,neg_shift=matches[0]
        p['negativeQIndex']=negative;requests.append(('annihilation',negative,neg_shift))
    elif 'negativeQIndex' in payload:
        raise ValueError('negativeQIndex 只用于双通道，不能附加未使用参数')
    channels=[_channel(name,i,overview[i]['q'],g,points[i],atom_results,Qcart,factor,p) for name,i,g in requests]
    energy_grid=np.linspace(p['energyMin'],p['energyMax'],p['energyPoints'])
    curves={'creation':np.zeros_like(energy_grid),'annihilation':np.zeros_like(energy_grid)}
    line_totals={'creation':0.,'annihilation':0.};window={'creation':0.,'annihilation':0.}
    for item in channels:
        for branch in item['branches']:
            if branch['excluded']:continue
            name=item['id'];center=branch['center'];weight=branch['weight'];sigma=p['sigma']
            curves[name]+=weight*np.exp(-.5*((energy_grid-center)/sigma)**2)/(sigma*math.sqrt(2*math.pi))
            fraction=.5*(math.erf((p['energyMax']-center)/(sigma*math.sqrt(2)))-math.erf((p['energyMin']-center)/(sigma*math.sqrt(2))))
            line_totals[name]+=weight;window[name]+=weight*fraction
    signal=curves['creation']+curves['annihilation'];step=float(energy_grid[1]-energy_grid[0])
    numerical=float(np.sum((signal[:-1]+signal[1:])*np.diff(energy_grid)/2));exact=sum(window.values())
    closure=max(item['checks']['amplitudeClosureRelative'] for item in channels)
    gram=max(item['gramResidual'] for item in channels)
    warnings += ['只读取已提供 q 点的三维 Phonopy 模；未生成力常数、未插值 q 点、未推断负 q 模或 Debye–Waller 网格。',
        '原胞与原子顺序由用户明确确认；散射长度是本次请求提供的实相干中子长度，不包括吸收、非相干、多声子或 X 射线形状因子。',
        '线权重按每原胞且 k′/k=1 归一为 fm²，能谱为单位面积 Gaussian 展宽后的 fm²/meV；不是仪器标定的实验计数。',
        '频率簇只是显示和求和：实际谱使用每条原始支各自的能量；接近的频率不等于数学精确简并。']
    if dw_meta['mode']=='omit':warnings.append('已明确省略 Debye–Waller 衰减；即使 T=0 也不意味着真实热位移或零点运动为零。')
    if not step<=p['sigma']/2:warnings.append('当前能量步长大于 sigma/2，峰形可能欠采样；解析窗口权重与数值积分分别报告。')
    if any(not item['checks']['dynamicalMatrixAvailable'] for item in channels):
        warnings.append('部分所选 q 点没有动力学矩阵：已核对完整向量基，但不能据此认证原始力常数或频率数据正确性。')
    if any(item['checks']['dynamicalMatrixAvailable'] for item in channels):
        warnings.append('序列化动力学矩阵校验使用 Rayleigh 本征残差；未把未知矩阵单位与频率转换因子自动等同。')
    identity=importer._source_identity(payload)
    companion_identity=None if companion is None else importer._source_identity(
        {'data':payload['structure_data']} if importer._provided(payload,'structure_data') else {'content':payload['structure_content']})
    source_bundle={'primary':identity,'companion':companion_identity,'primitiveOrderConfirmed':True,
                   'eigenvectorConvention':'phonopy-atom-phase','sourceSynthetic':data.get('synthetic') is True}
    if source_bundle['sourceSynthetic']:warnings.insert(0,'明确标记的合成教学数据，不是真实材料计算或实验谱。')
    return {'schema':SCHEMA,'parameters':p,'sourceIdentity':identity,'sourceBundle':source_bundle,
        'structure':{**structure,'lengthUnit':'angstrom','massUnit':'amu'},'atoms':atom_results,'qpoints':overview,
        'momentum':{'Q':Q.tolist(),'QCartesian':Qcart.tolist(),'reciprocalBasis':reciprocal.tolist(),
                    'qIndex':index,'q':q.tolist(),'G':shift,'matchResidual':residual,'matchTolerance':MATCH_TOLERANCE,
                    'inputCoordinates':coordinates,'primaryChannel':requests[0][0]},
        'debyeWaller':dw_meta,'channels':channels,
        'spectrum':{'energies':energy_grid.tolist(),'creation':curves['creation'].tolist(),'annihilation':curves['annihilation'].tolist(),
            'selected':signal.tolist(),'lineTotals':line_totals,'analyticWindow':window,'analyticWindowTotal':exact,
            'numericalWindowTotal':numerical,'windowQuadratureError':abs(numerical-exact),'sampleResolved':step<=p['sigma']/2,
            'energyStep':step,'sigma':p['sigma']},
        'checks':{'gramResidual':gram,'completeBasisTolerance':VECTOR_TOLERANCE,'amplitudeClosureRelative':closure,
                  'finiteNonnegativeSpectrum':bool(np.all(np.isfinite(signal)) and np.min(signal)>=0),
                  'passed':bool(gram<=VECTOR_TOLERANCE and closure<=2*VECTOR_TOLERANCE and np.all(np.isfinite(signal)) and np.min(signal)>=0)},
        'units':{'lineWeight':'fm^2 per primitive cell, kprime/k=1','spectrum':'fm^2/meV','energy':'meV',
                 'QCartesian':'angstrom^-1 (includes 2pi)','G':'integer primitive reciprocal coordinates','thermalTensor':'angstrom^2',
                 'frequencyOriginal':frequency,'mass':'amu','quantumFactorMeVAngstrom2Amu':QUANTUM_FACTOR},
        'warnings':warnings,'sources':SOURCES,
        'limits':{'maxAtoms':MAX_ATOMS,'maxSpectrumPoints':2001,'maxInputBytes':importer.MAX_BYTES,'maxInputNodes':importer.MAX_NODES}}
