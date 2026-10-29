"""Original domain-wall teaching catalogue; deterministic generation."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def field(key,label,default,lo=None,hi=None,step='any',options=None,experiment=None):
    r=dict(key=key,label=label,default=default,type='select' if options else 'number')
    if options:r['options']=options
    else:r.update(min=lo,max=hi,step=step)
    if experiment:r['experiment']=experiment
    return r
fields=[field('experiment','选择实验','landau',options=[['landau','连续序参量畴壁'],['ssh','SSH 界面与局域态']]),
field('kappa','梯度系数 κ（约化）',1,.05,8,experiment='landau'),field('beta','双阱系数 β（约化）',1,.05,8,experiment='landau'),field('amplitude','极小值幅度 v（约化）',1,.2,3,experiment='landau'),field('extent','半区间长度 / ξ',8,4,16,experiment='landau'),field('gridPoints','粗网格点数（奇数）',81,41,161,2,experiment='landau'),
field('sites','开放链格点数（偶数）',60,20,100,2,experiment='ssh'),field('hopping','平均跃迁 t（eV）',1,.1,3,experiment='ssh'),field('dimerization','渐近二聚化 δ',.4,.05,.85,experiment='ssh'),field('sshWidth','界面宽度（键间距）',2,.5,10,experiment='ssh'),field('onsite','中心两格点势（eV）',0,-2,2,experiment='ssh'),field('probeEnergy','观察能量（eV）',0,-6,6,experiment='ssh'),field('eta','LDOS 展宽 η（eV）',.03,.005,.2,experiment='ssh'),field('interface','键序结构','wall',options=[['wall','二聚化反号界面'],['uniform','均匀二聚化参照']],experiment='ssh')]
presets=[{'id':'wall-landau','title':'标量180°畴壁 · 基准','input':{'experiment':'landau','kappa':1,'beta':1,'amplitude':1,'extent':8,'gridPoints':81}},
{'id':'wall-stiff','title':'增强梯度代价 · κ=4','input':{'experiment':'landau','kappa':4,'beta':1,'amplitude':1,'extent':8,'gridPoints':81}},
{'id':'wall-ssh','title':'SSH 反号界面 · 手征对称','input':{'experiment':'ssh','sites':60,'hopping':1,'dimerization':.4,'sshWidth':2,'onsite':0,'interface':'wall'}},
{'id':'wall-ssh-uniform','title':'均匀二聚化参照','input':{'experiment':'ssh','sites':60,'hopping':1,'dimerization':.4,'sshWidth':2,'onsite':0,'interface':'uniform'}},
{'id':'wall-ssh-potential','title':'中心在位势 · 破坏手征对称','input':{'experiment':'ssh','sites':60,'hopping':1,'dimerization':.4,'sshWidth':2,'onsite':.4,'interface':'wall'}}]
def section(title,text,formula=None):
    return dict(title=title,text=text,**({'formula':formula} if formula else {}))
lessons=[dict(id='wall-gradient',module='domainwall',title='从等价畴到空间中的畴壁',summary='同样的两个极小值，为什么界面既不能无限陡，也不能无限宽？',preset='wall-landau',references=['tong'],sections=[
section('在局域自由能中加入梯度代价','已有相变实验寻找均匀极小值。让φ随位置变化后，局域双阱希望每处取±v，梯度项希望相邻位置平滑；两者竞争决定壁宽。','F/A = ∫dx [κ(∂ₓφ)²/2 + β(φ²−v²)²/4]'),
section('固定边界并求驻点','固定左端−v、右端+v，对内部φ变分。边界变分为零，分部积分得到二阶方程；界面中心选为x=0。','κ ∂ₓ²φ = βφ(φ²−v²)'),
section('连续解与宽度','无限域解是连接两极小值的tanh。κ增大使突变更昂贵，壁变宽；v或β增大加强局域恢复力。','φ(x)=v tanh(x/ξ); ξ=√[2κ/(βv²)]'),
section('教学量和材料量','这里x、φ、自由能均采用约化单位。BaTiO₃只提供180°极性畴的背景；要计算材料壁能还需真实系数、静电边界与弹性耦合。')]),
dict(id='wall-energy',module='domainwall',title='畴壁能与网格收敛',summary='比较解析张力、有限区间和离散解，理解计算诊断的用途。',preset='wall-stiff',references=['tong'],sections=[
section('壁能是相对均匀体相的额外代价','将两端的均匀基态自由能设为零。连续平衡解上梯度项与局域势能相等；对整个空间积分获得每面积壁能。','σ = 2√(2κβ)v³/3'),
section('做一个可手算的对比','固定β=v=1，将κ从1改成4。宽度和壁能都增加到两倍。并非壁越宽就一定越便宜，因为改变的是模型参数。'),
section('两个网格的作用','程序固定相同有限区间，分别用N和2N−1个点求离散驻点。能量差是当前离散敏感性的指示；驻点残差很小并不等于连续解已收敛。'),
section('稳定性与模型边界','两端边界强制存在一面壁，反对称约束固定中心。此实验求固定中心约束的静态驻点，同时检查解除中心约束后的Hessian。粗网格可能产生不稳定方向，不能只靠残差宣布稳定；不预测畴成核、开关速度或三维畴形貌。')]),
dict(id='wall-localized',module='domainwall',title='SSH 畴壁怎样产生局域电子态',summary='把键序反号、有限链能谱与局域态密度放在同一幅研究图中。',preset='wall-ssh',references=['ssh','asboth'],sections=[
section('以键序作为另一种序参量','在独立的SSH模型中，交替强弱键是二聚化序。让它在中心平滑反号，再与均匀二聚化链比较。这里的界面宽度按键间距计，与铁电壁宽不做数值等同。','H = −Σᵢ tᵢ(cᵢ†cᵢ₊₁+h.c.)'),
section('手征对称与谱的配对','没有在位势时，偶/奇子格符号算符与Hamiltonian反对易，能量成±E对。中心两格点在位势会破坏该对称并改变局域谱。','ΓH+HΓ=0'),
section('为什么同时看能量和位置','开放链可同时有端态和界面态，有限长度还会造成杂化。观察E=0附近的LDOS以及中心/边界权重，才能区分两者。短链或宽界面时两区域可能重叠，需查看区域索引和警告，不可把两份权重相加。','ρᵢ(E)=Σₙ |ψₙ(i)|² η/[π((E−Eₙ)²+η²)]'),
section('避免任意简并本征矢的影响','程序把|E|<tδ的全部态作为一个子空间，用投影算符对角元显示其密度；密度之和等于选中态数。该量对选中子空间内部换基不变。','Pᵢᵢ = Σₙ∈W |ψₙ(i)|²')])]
def step(prompt,hint,choices,answer,explanation):return dict(prompt=prompt,hint=hint,choices=choices,answer=answer,explanation=explanation)
exercises=[dict(id='wall-gradient-ex',module='domainwall',lesson='wall-gradient',title='一步步得到畴壁宽度',prompt='β=κ=v=1，连接−1和+1。',steps=[
step('哪一项惩罚空间变化？','观察是否含位置导数。',['β(φ²−v²)²/4','κ(∂ₓφ)²/2','一个常数'],1,'梯度项给快速空间变化带来能量代价。'),
step('固定边界变分给出的驻点方程是？','梯度项需分部积分。',['κφ″=βφ(φ²−v²)','κφ″=−βφ(φ²−v²)','φ=0处处成立'],0,'δF/δφ=−κφ″+βφ(φ²−v²)=0。'),
step('把φ=v tanh(x/ξ)代入后ξ是多少？','比较tanh与sech²前系数。',['1/√2','2','√2'],2,'ξ²=2κ/(βv²)，本例ξ=√2。'),
step('只把κ增加4倍，ξ如何变化？','ξ与√κ成正比。',['增加4倍','增加2倍','不变'],1,'梯度代价变大，平衡壁宽增加2倍。')]),
dict(id='wall-energy-ex',module='domainwall',lesson='wall-energy',title='壁能与数值可信度',prompt='核对基准模型与κ=4模型。',steps=[
step('基准无限连续壁能是多少？','代入σ=2√(2κβ)v³/3。',['2√2/3','√2/3','0'],0,'κ=β=v=1，σ=2√2/3≈0.94281。'),
step('κ=4而β,v不变时壁能是多少？','壁能也正比于√κ。',['仍为2√2/3','8√2/3','4√2/3'],2,'壁宽和壁能都增加2倍。'),
step('驻点残差很小，但网格能量差明显，应怎样做？','离散方程和连续极限是两项不同检验。',['直接称为精确材料壁能','增加网格并比较相同区间','删除梯度项'],1,'需核对离散误差，并在必要时扩展有限区间。'),
step('当前能量能直接写成BaTiO₃的J/m²吗？','这里没有给定真实长度/极化/能量标尺。',['可以','只要曲线光滑即可','不可以，需要材料系数和单位标尺'],2,'约化教学模型只说明机制和参数标度。')]),
dict(id='wall-localized-ex',module='domainwall',lesson='wall-localized',title='辨别界面态与端态',prompt='比较wall-ssh、均匀链和中心在位势三个预设。',steps=[
step('SSH实验中空间反号的量是什么？','观察相邻强弱键。',['磁场','键二聚化δ','电子数'],1,'交替跃迁的反号连接两种键序。'),
step('没有在位势时哪条关系成立？','Γ在两子格取相反符号。',['ΓH+HΓ=0','ΓH−HΓ=0且Γ=I','H=0'],0,'手征对称导致±E能谱配对，有限链仍可有杂化分裂。'),
step('发现近零能级后，如何确认它在界面？','能量不能提供空间位置。',['只看能量绝对值','只数本征值','同时看中心和边界的LDOS/投影权重'],2,'开放链也可能有端态，需要位置分辨证据。'),
step('两个近简并态换一组正交基，哪个量不变？','对整个选中子空间求和。',['某个任意本征矢的每个分量','Pᵢᵢ=Σ|ψₙ(i)|²','每个波函数的正负号'],1,'投影密度对选中子空间内部幺正换基不变。')])]
cases=[dict(id='wall-ferroelectric',module='domainwall',title='BaTiO₃ 背景：从极性畴到标量壁',kind='材料背景 · 约化模型',summary='从已有极性畸变和六方向畴，选择相反两畴建立一维连续壁。',assumption='标量180°教学壁；不包含材料拟合、弹性和静电边界。',preset='wall-landau',links=[['均匀相变与方向畴','#compute/phase'],['结构畸变','#compute/distortion-modes']]),
dict(id='wall-ssh-interface',module='domainwall',title='二聚化链：界面与端态同时出现',kind='SSH 教学模型',summary='用有限链能谱、LDOS和投影密度区分界面与边界的贡献。',assumption='无自旋、无相互作用的一维模型，不是聚乙炔材料参数拟合。',preset='wall-ssh',links=[['SSH 体相几何','#compute/quantum-geometry-lab'],['接触器件','#compute/device-transport-lab']]),
dict(id='wall-local-potential',module='domainwall',title='局域势如何改变界面谱',kind='对称性破缺对照',summary='固定跃迁和长度，只在中心两格点加入势，比较手征残差和LDOS。',assumption='局域在位势破坏手征对称；近零能子空间的阈值筛选会随能级移动改变。',preset='wall-ssh-potential',links=[['超胞与缺陷','#compute/unfold-lab'],['研究记录','#atlas/notebook']])]
data=dict(release='20261029-pathways1',module=dict(id='domainwall',title='畴壁与局域态',summary='从自由能梯度项到空间畴壁，再在独立SSH模型中观察界面电子态。',route='domain-wall-lab',action='domain_wall_lab',fields=fields,presets=presets),lessons=lessons,exercises=exercises,cases=cases,sources=[
dict(id='tong',title='David Tong · Statistical Field Theory: domain walls',url='https://www.damtp.cam.ac.uk/user/tong/sft/one.pdf'),
dict(id='ssh',title='Su, Schrieffer, Heeger (1979), Solitons in Polyacetylene',url='https://doi.org/10.1103/PhysRevLett.42.1698'),
dict(id='asboth',title='Asbóth, Oroszlány, Pályi · A Short Course on Topological Insulators',url='https://arxiv.org/abs/1509.02295')])
(ROOT/'dist/data/domainwall-content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Domain walls: 3 lessons, 12 steps, 3 cases, 5 presets')
