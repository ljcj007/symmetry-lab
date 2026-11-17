"""Source-bound two-Q numerical exercises over unchanged supplied Phonopy modes.

Student attempts never enter the physical calculation. This adapter invokes the
existing creation calculation twice, changing only the integer reciprocal G.
It grades amplitudes in the supplied raw gauge, not equivalence of subspaces.
"""
from copy import deepcopy
import hashlib
import json
import math
import numpy as np
import phonopy_scattering as scattering
from symmetry_grading import matrix, packed

SCHEMA = 'symmetry-lab-phonopy-derivation-1'
ABS_TOL = 1e-7
REL_TOL = 2e-5
FIELDS = {'mode','input','comparisonG','branchIndex','atomIndex','answers','forFingerprint'}
GAUGE = '固定原文件的 Phonopy atom-phase 复本征矢；复数答案保留该显示规范与幅度。'
VARIANTS = [('missing-conjugation','漏掉创建通道的复共轭'),
            ('omit-phase','漏掉原子结构相位'),
            ('square-first','先取各原子模平方再相加'),
            ('omit-mass','漏掉质量平方根因子')]


def _integer(value, name, low, high):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(name+'必须是规定范围内的 JSON 整数')
    return value


def _shift(value, name):
    if not isinstance(value,list) or len(value)!=3:
        raise ValueError(name+'需要三个整数分量')
    return [_integer(x,name,-10000,10000) for x in value]


def _canonical(value):
    # This identity binds the full original request, including original text,
    # object precedence, filenames and apparently redundant confirmations.
    def check(v, depth=0):
        if depth>48:raise ValueError('来源 JSON 嵌套过深')
        if v is None or type(v) in (bool,int,str):return
        if type(v) is float and math.isfinite(v):return
        if type(v) is list:
            for x in v:check(x,depth+1)
            return
        if type(v) is dict and all(type(k) is str for k in v):
            for x in v.values():check(x,depth+1)
            return
        raise ValueError('来源只接受有限的标准 JSON 数据')
    check(value)
    try:body=json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf8')
    except (UnicodeError,ValueError,TypeError) as error:raise ValueError('来源不能编码为有限 UTF-8 JSON') from error
    if len(body)>20*1024*1024:raise ValueError('完整推导来源超过20 MiB身份检查上限')
    return body


def _complex(raw):
    a=np.asarray(raw,dtype=float)
    return a[...,0]+1j*a[...,1]


def _z(value):
    return [float(np.real(value)),float(np.imag(value))]


def _zs(values):
    return [_z(x) for x in values]


def _near(candidate, expected):
    delta=np.abs(np.asarray(candidate)-np.asarray(expected))
    limit=ABS_TOL+REL_TOL*np.abs(expected)
    return bool(np.all(delta<=limit)),delta,limit


def _task(identifier, point, stage, title, value, unit, real=False, reason=''):
    expected=np.asarray(value,dtype=complex)
    safe=bool(np.isfinite(expected).all() and np.max(np.abs(expected))<=1e8)
    if not safe:reason=reason or '目标超出有限矩阵判分器的1e8分量上限；仍保留实际科学结果，不判本题。'
    return {'id':identifier,'point':point,'stage':stage,'title':title,'shape':list(expected.shape),
        'unit':unit,'realOnly':real,'expected':packed(expected),'available':not reason,'reason':reason,
        'tolerance':{'absolute':ABS_TOL,'relative':REL_TOL},'gauge':GAUGE if not real else '',
        'criterion':'逐元素复差的模 ≤ absolute + relative × 目标分量的模；保留幅度。'}


def _derived(result, branch_index, atom_index):
    channel=result['channels'][0];branch=channel['branches'][branch_index]
    vectors=_complex(branch['eigenvector'])
    masses=np.array([a['mass'] for a in result['atoms']])
    displacements=vectors/np.sqrt(masses[:,None])
    q=np.array(channel['q']);Q=np.array(result['momentum']['Q'])
    Qcart=np.array(result['momentum']['QCartesian'])
    rows=[]
    for atom,e in zip(result['atoms'],vectors):
        position=np.array(atom['position'])
        arg=2*math.pi*float(q@position)
        phase=complex(math.cos(arg),math.sin(arg))
        cell=e*phase
        q_arg=2*math.pi*float(Q@position)
        full_phase=complex(math.cos(q_arg),math.sin(q_arg))
        term=atom['coherentLengthFm']*atom['debyeWallerFactor']/math.sqrt(atom['mass'])*full_phase*np.sum(Qcart*cell.conj())
        target=complex(*branch['terms'][atom['index']])
        rows.append({'atomIndex':atom['index'],'qPositionPhase':_z(phase),'cellPeriodicEigenvector':_zs(cell),
            'fullQPositionPhase':_z(full_phase),'cellPeriodicTerm':_z(term),'atomPhaseTerm':_z(target),
            'amplitudeResidual':float(abs(term-target))})
    bare=None if branch['excluded'] else branch['quantumFactor']*branch['strength']/branch['energyMeV']
    return {'massScaledEigenvector':[_zs(row) for row in displacements],
        'selectedAtomMassScaled':_zs(displacements[atom_index]),'bareWeight':bare,
        'displacementScope':'e/sqrt(m)是相对位移形状，质量数值以amu计；不是已校准的Å位移。动画若归一化须对所有原子使用同一尺度。',
        'conventionBridge':{'relation':'e_cell = exp(2pi i q dot tau) e_atom',
            'scope':'只变换同一提供模式的坐标与相位，不混合一维模型的参数，不改变q或重新求解本征模。',
            'atoms':rows,'maxAmplitudeResidual':max(r['amplitudeResidual'] for r in rows)}}


def _point_tasks(point, branch_index, atom_index):
    label=point['id'];result=point['result'];branch=result['channels'][0]['branches'][branch_index]
    atom=branch['atoms'][atom_index];excluded=branch['excluded']
    reason=branch['reason'] if excluded else ''
    rows=[_task(label+'.QCartesian',label,1,'完整Q的Cartesian三分量',[result['momentum']['QCartesian']],'angstrom^-1',True),
        _task(label+'.projection',label,3,'所选原子的 Q dot conjugate(e)',[[complex(*atom['projection'])]],'angstrom^-1'),
        _task(label+'.atomicTerm',label,3,'所选原子的完整复振幅',[[complex(*atom['term'])]],'fm/(angstrom sqrt(amu))'),
        _task(label+'.sum',label,4,'全部原子的相干复总和',[[complex(*branch['sum'])]],'fm/(angstrom sqrt(amu))'),
        _task(label+'.incoherentStrength',label,4,'逐原子模平方的和',[[branch['incoherentStrength']]],'fm^2/(angstrom^2 amu)',True),
        _task(label+'.interference',label,4,'全部干涉交叉项',[[branch['interference']]],'fm^2/(angstrom^2 amu)',True),
        _task(label+'.coherentStrength',label,4,'相干总和的模平方',[[branch['strength']]],'fm^2/(angstrom^2 amu)',True),
        _task(label+'.bareWeight',label,5,'未乘Bose热因子的线面积',[[point['derived']['bareWeight'] or 0.]],'fm^2 per primitive cell',True,reason),
        _task(label+'.weight',label,5,'乘n+1后的积分线面积',[[branch['weight']]],'fm^2 per primitive cell',True,reason)]
    if excluded:
        # No invented inverse energy, occupation or bare weight is exposed as a
        # target. The raw branch retains its separately declared zero weight.
        for row in rows[-2:]:row['expected']=None
    return rows


def _wrong_variants(point, branch_index):
    result=point['result'];branch=result['channels'][0]['branches'][branch_index]
    Q=np.array(result['momentum']['QCartesian']);vectors=_complex(branch['eigenvector'])
    correct=_complex(branch['terms']);variants={}
    for kind,_ in VARIANTS:
        values=[]
        for ai,atom in enumerate(branch['atoms']):
            if kind=='missing-conjugation':
                term=np.sum(Q*vectors[ai])*atom['scalarFactor']*complex(*atom['phase'])
            elif kind=='omit-phase':
                term=complex(*atom['projection'])*atom['scalarFactor']
            elif kind=='omit-mass':
                term=correct[ai]/atom['massFactor']
            else:term=correct[ai]
            values.append(term)
        strength=branch['incoherentStrength'] if kind=='square-first' else float(abs(sum(values))**2)
        bare=None if branch['excluded'] else branch['quantumFactor']*strength/branch['energyMeV']
        weight=0. if branch['excluded'] else bare*branch['thermalMultiplier']
        variants[kind]={'id':point['id'],'terms':None if kind=='square-first' else _zs(values),
            'sum':None if kind=='square-first' else _z(sum(values)), 'strength':strength,'bareWeight':bare,'weight':weight}
    return variants


def _contrasts(points, branch_index):
    computed=[_wrong_variants(point,branch_index) for point in points]
    output=[]
    for kind,title in VARIANTS:
        rows=[variants[kind] for variants in computed]
        agreement=[]
        for point,row in zip(points,rows):
            branch=point['result']['channels'][0]['branches'][branch_index]
            agreement.append(_near(row['strength'],branch['strength'])[0])
        output.append({'id':kind,'title':title,'points':rows,
            'referenceAgreementByPoint':agreement,'distinguishableByPoint':[not x for x in agreement],
            'distinguishable':not all(agreement),'signature':'两个实际Q的coherentStrength',
            'scope':'同一提供模式上的故意错误代数，不是新的合法本征模或材料光谱；未穷尽所有错误。'})
    return output


def _grade(tasks, answers, contrasts):
    lookup={t['id']:t for t in tasks}
    if not isinstance(answers,dict) or len(answers)>len(tasks) or any(k not in lookup for k in answers):
        raise ValueError('answers必须只包含本次返回的有界task ID，不接受客户端reference')
    checks=[];parsed={}
    for task in tasks:
        key=task['id'];check={'taskId':key,'status':'missing','passed':False,'feedback':'尚未提交这一题。'}
        if not task['available']:
            check.update(status='unavailable',feedback=task['reason'])
        elif key in answers:
            try:
                # Check container bounds before np.asarray in the shared parser.
                value=answers[key]
                arrays=list(value.values()) if isinstance(value,dict) else [value]
                if not arrays or any(not isinstance(a,list) or not 1<=len(a)<=32 or
                    any(not isinstance(row,list) or not 1<=len(row)<=32 for row in a) for a in arrays):
                    raise ValueError('作答需要有界的二维数值数组')
                if any(type(x) not in (int,float) or not math.isfinite(x) for a in arrays for row in a for x in row):
                    raise ValueError('作答分量必须是有限实数；布尔值、字符串和代码不是数字答案')
                answer=matrix(answers[key],'作答矩阵')
                if list(answer.shape)!=task['shape']:raise ValueError('答案矩阵形状与本题不符')
                if task['realOnly'] and np.any(answer.imag!=0):raise ValueError('本题要求实数答案，虚部必须为零')
            except (ValueError,TypeError,OverflowError) as error:
                check.update(status='malformed',feedback=str(error))
            else:
                expected=matrix(task['expected'],'本次目标矩阵')
                passed,residual,limit=_near(answer,expected);parsed[key]=answer
                check.update(status='correct' if passed else 'incorrect',passed=passed,answer=packed(answer),
                    residual=residual.tolist(),allowedResidual=limit.tolist(),maxResidual=float(np.max(residual)),
                    feedback='数值通过；这是固定输入与显示规范下的检查。' if passed else '与本次目标不符；请检查分量、单位、共轭、质量与求和顺序。')
        checks.append(check)
    counts={name:sum(c['status']==name for c in checks) for name in ('correct','incorrect','missing','malformed','unavailable')}
    gradable=len(tasks)-counts['unavailable']
    passed=gradable>0 and counts['correct']==gradable
    status='complete' if passed else 'needs-correction' if counts['incorrect'] or counts['malformed'] else 'incomplete' if gradable else 'no-gradable-tasks'
    observations=[key for key in parsed if key in ('A.coherentStrength','B.coherentStrength','A.weight','B.weight')]
    both=all(any(key.startswith(point+'.') for key in observations) for point in ('A','B'))
    reference_match=bool(observations) and all(_near(parsed[key],matrix(lookup[key]['expected']))[0] for key in observations)
    compatible=[]
    for variant in contrasts:
        by_point={r['id']:r for r in variant['points']}
        if observations and all(_near(parsed[key],[[by_point[key[0]]['strength' if key.endswith('.coherentStrength') else 'weight']]])[0] for key in observations):
            compatible.append(variant['id'])
    diagnosis={'usedTaskIds':observations,'hasBothPoints':both,'referenceCompatible':reference_match,
        'compatibleCandidates':compatible,
        'status':'insufficient-two-point-evidence' if not both else 'consistent-with-reference' if reference_match else 'finite-candidate-match' if compatible else 'unclassified',
        'scope':'候选只说明所提交数字与这四种有限错误代数的兼容性，不唯一推断思维过程；正确值可偶然与错误公式重合。'}
    return {'status':status,'passed':passed,'checks':checks,'counts':counts,'gradableCount':gradable,
        'diagnosis':diagnosis,'scope':'数值练习核对，不评自由文本证明，不认证材料来源或课程掌握；查看参考答案的状态由教学界面独立记录。'}


def run(payload):
    if not isinstance(payload,dict) or set(payload)-FIELDS:raise ValueError('推导输入含不支持字段')
    mode=payload.get('mode','derive')
    if mode not in ('derive','grade'):raise ValueError('mode只支持derive或grade')
    scientific=payload.get('input')
    if not isinstance(scientific,dict):raise ValueError('input需要完整原始三维散射请求')
    if scientific.get('channel')!='creation':raise ValueError('本工坊仅支持明确的creation请求，请显式建立新输入')
    if scientific.get('QCoordinates')!='primitive-reciprocal' or 'Q' in scientific:
        raise ValueError('本工坊要求整数G和primitive-reciprocal坐标，不接受显式Q')
    _shift(scientific.get('G'),'原始G')
    comparison=_shift(payload.get('comparisonG'),'comparisonG')
    branch=_integer(payload.get('branchIndex'),'branchIndex',0,3*scattering.MAX_ATOMS-1)
    atom=_integer(payload.get('atomIndex'),'atomIndex',0,scattering.MAX_ATOMS-1)
    identity={'schema':SCHEMA,'coreSchema':scattering.SCHEMA,'input':scientific,'comparisonG':comparison,'branchIndex':branch,'atomIndex':atom}
    fingerprint=hashlib.sha256(_canonical(identity)).hexdigest()
    if mode=='grade':
        supplied=payload.get('forFingerprint')
        if not isinstance(supplied,str) or len(supplied)!=64 or supplied!=fingerprint:
            raise ValueError('作答指纹与本次完整来源及条件不符；请重新推导，不沿用旧判分')
    elif 'forFingerprint' in payload or payload.get('answers'):
        raise ValueError('作答与指纹只用于grade，不能作为derive的科学输入')
    points=[]
    for label,shift in [('A',scientific['G']),('B',comparison)]:
        request=deepcopy(scientific);request['G']=deepcopy(shift)
        result=scattering.run(request)
        if branch>=len(result['channels'][0]['branches']) or atom>=len(result['atoms']):
            raise ValueError('所选branchIndex或atomIndex不存在于本次原胞与q点')
        points.append({'id':label,'input':request,'result':result,'derived':_derived(result,branch,atom)})
    tasks=_point_tasks(points[0],branch,atom)
    tasks.insert(1,_task('mode.massScaledEigenvector',None,2,'所选原子的e/sqrt(m)',
        [_complex(points[0]['derived']['selectedAtomMassScaled'])],'amu^-1/2 relative shape'))
    tasks.extend(_point_tasks(points[1],branch,atom))
    contrasts=_contrasts(points,branch)
    grouping=points[0]['result']['channels'][0]['groups'][points[0]['result']['channels'][0]['branches'][branch]['groupIndex']]
    return {'schema':SCHEMA,'fingerprint':fingerprint,'sourceBundle':deepcopy(points[0]['result']['sourceBundle']),
        'conditions':{'channel':'creation','sameRawQ':True,'onlyChangedField':'G','temperature':points[0]['result']['parameters']['temperature'],
            'gauge':GAUGE,'displacementScope':points[0]['derived']['displacementScope'],
            'numericalGroup':deepcopy(grouping),'singleBranchObservable':len(grouping['branches'])==1,
            'groupScope':'数值分组不是严格数学简并认证；逐支ledger固定原始基底，简并可观测比较须用整个子空间。',
            'comparisonScope':'改变G一般同时改变Cartesian投影与原子相位；两点只检验列出的有限候选，不认证一般公式或实验。'},
        'selection':{'branchIndex':branch,'atomIndex':atom},'points':points,'tasks':tasks,'contrasts':contrasts,
        'grading':_grade(tasks,payload.get('answers',{}),contrasts) if mode=='grade' else None,
        'checks':{'bothCoreChecksPassed':all(p['result']['checks']['passed'] for p in points),
            'sameSourceIdentity':points[0]['result']['sourceIdentity']==points[1]['result']['sourceIdentity'],
            'sameQ':points[0]['result']['momentum']['q']==points[1]['result']['momentum']['q']},
        'sources':deepcopy(scattering.SOURCES)}
