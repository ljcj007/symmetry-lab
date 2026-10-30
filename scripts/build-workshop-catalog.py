"""Original bounded symmetry-workshop course content."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def select(key,label,default,options):return dict(key=key,label=label,type='select',default=default,options=options)
fields=[select('pointGroup','起始生成元', 'c4v', [['c2v','C₂ᵥ'],['c3v','C₃ᵥ'],['c4v','C₄ᵥ']])]
for key,label,default in [('rotation','保留绕 z 轴旋转',1),('mirror','保留 xz 镜面',1),('inversion','额外施加反演',0),('timeReversal','保留时间反演',1)]:
    fields.append(select(key,label,default,[[1,'启用'],[0,'关闭']]))
for key,label,default in [('rashba','Rashba 型系数 α',1),('dresselhaus','输入各向异性系数 β',.5),('mass','输入 σ_z 常数项 m',.4),('fieldX','输入 σ_x 常数项 b_x',.3),('curvature','输入各向同性曲率 c',1)]:
    fields.append(dict(key=key,label=label+'（约化 k 坐标；能量 eV）',type='number',default=default,min=-5,max=5,step=.1))
defaults={f['key']:f['default'] for f in fields}
presets=[dict(id=i,title=t,input={**defaults,**p}) for i,t,p in [
    ('workshop-rashba','C₄ᵥ 与时间反演：Rashba 约束',{}),
    ('workshop-inversion','加入反演：抑制自旋分裂',{'inversion':1}),
    ('workshop-c2v','C₂ᵥ：允许不同曲率与线性系数',{'pointGroup':'c2v'}),
    ('workshop-c3v','C₃ᵥ：二阶约束空间',{'pointGroup':'c3v'}),
    ('workshop-free','关闭所有生成元：原始输入',{'rotation':0,'mirror':0,'timeReversal':0}),
    ('workshop-magnetic','只保留旋转：允许 z 磁性项',{'mirror':0,'timeReversal':0})]]
rows=[
('workshop-identity','从矩阵恒等式到系数约束','workshop-rashba',[
('先固定表示空间','这里的两个分量是真实自旋双重态，具有相同反演宇称。Pauli 矩阵按轴向量变换；换成任意两个轨道，必须重新指定表示矩阵。','H(k)=d_0(k)I+d_x(k)σ_x+d_y(k)σ_y+d_z(k)σ_z'),
('比较所有动量的系数','二阶二维多项式有6个单项式，每个乘以4个Hermitian基矩阵，共24个实系数。生成元给出齐次线性约束；不能只在几个高对称点比较能量。','H(Rk)=U H(k) U†'),
('先求允许空间，再投影','将输入系数正交投影至约束矩阵的零空间。系数之间可能需要组合：单个 k_x σ_y 并不独立满足 C₄ 旋转，而 Rashba 组合可以。','H_R=α(k_y σ_x−k_x σ_y)'),
('查看投影的含义','工坊给出每项前后系数、独立维数、完整多项式残差和Γ附近曲线。零空间求解是数值的；系数投影依赖声明的单项式欧氏度量，不能当作材料参数拟合。','A a=0')]),
('workshop-spin','为什么反演加时间反演消除这里的自旋分裂','workshop-inversion',[
('时间反演反转自旋','对于真实自旋一半，时间反演包含复共轭，平方为−1。标量部分对动量为偶，自旋部分为奇。','d_0(−k)=d_0(k)；d(−k)=−d(k)'),
('反演不反转轴向量自旋','本工坊两个态同宇称，反演表示为共同的正或负单位阵。反演约束使自旋部分也成为偶函数。','d(−k)=d(k)'),
('同一项同时为奇和偶','两个条件合并后自旋部分消失，因此两条能带在每个k简并。这个结论依赖所用同宇称双态空间，不可照搬到任意多轨道有效模型。','d(k)=0'),
('开关与群名要一致','关闭镜面或旋转后，页面只声称保留剩余生成元。额外加入反演可能扩大对称群，不能仍把它简单叫原来的 C₄ᵥ。','E_{±}=d_0±|d|')]),
('workshop-breaking','用受控对照辨认磁性开隙','workshop-magnetic',[
('保留旋转时的常数项','绕z旋转允许常数 σ_z；xz镜面将轴向量z分量反转，时间反演也反转它。只有解除对应限制，输入m才能保留。','H_m=mσ_z'),
('只改变一个开关','把“只保留旋转”结果固定为A，再只启用时间反演计算B。比较Γ点劈裂和同一条k路径；不要同时改变m和生成元。','Δ_Γ=2|d(0)|'),
('色散不等于完整拓扑诊断','这个低阶Γ附近模型没有完整布里渊区及晶格正则化。即使出现质量项，也不能由这一条局部能带曲线确定材料Chern数。','E_{±}(k)=d_0(k)±|d(k)|'),
('回到矩阵条件解释现象','项目结论应写出被破坏的生成元、改变的系数和物理后果。若图上看似简并，仍要检验完整系数约束，避免数值或路径偶然简并。','H(−k)=σ_y H(k)* σ_y')])]
lessons=[dict(id=i,module='workshop',title=t,summary=sections[0][1],preset=p,sections=[dict(title=h,text=x,formula=f) for h,x,f in sections],references=['qsymm']) for i,t,p,sections in rows]
questions=[
[('二阶二维单项式有几个？','包括常数、两个一次项、三个二次项。',['6','4','9'],0,'乘以4个Pauli基矩阵，共24个实系数。'),('判定对称性应检查什么？','矩阵还包含本征态信息。',['几处能量相同','所有k的矩阵恒等式','只看Γ点'],1,'比较整个多项式系数，而非单独的能量。'),('C₄ᵥ中的线性自旋项应怎样检查？','旋转会混合x与y。',['逐个删掉所有一次项','只留k_x','检验Rashba等完整组合'],2,'生成元可约束系数之间的关系。'),('投影后的系数是什么？','这里没有实验拟合。',['指定系数度量下的允许模型','真实材料唯一参数','精确实验能带'],0,'这是明确表示空间和截断阶数下的教学投影。')],
[('时间反演要求d(k)怎样变化？','自旋在时间反演下反号。',['奇函数','偶函数','不受限'],0,'d(−k)=−d(k)。'),('同宇称双态中的反演要求d(k)怎样变化？','自旋是轴向量。',['奇函数','偶函数','只能有z分量'],1,'反演不翻转自旋，故为偶函数。'),('两个条件合并得到什么？','同时为奇和偶。',['线性项加倍','只在Γ为零','处处为零'],2,'此模型中d(k)=0，因此没有自旋分裂。'),('关闭镜面后能否仍声称保留完整原点群？','剩余生成元才是约束依据。',['不能，应列出剩余约束','始终可以','只看曲线即可'],0,'生成元开关改变对称条件。')],
[('只有z旋转时常数mσ_z是否允许？','σ_z与z旋转对易。',['允许','必定禁止','依赖k_x'],0,'z旋转保留轴向量z分量。'),('只启用时间反演后该常数项怎样？','常数不能是k的奇函数。',['加倍','被禁止','不变'],1,'时间反演禁止该常数磁性项。'),('本模型Γ劈裂如何求？','求2×2 Hermitian矩阵本征值。',['|d_0|','|m|/2','2|d(0)|'],2,'两条能量差是2|d|。'),('一条Γ附近开隙曲线能否给出材料Chern数？','缺少完整布里渊区。',['不能','能，开隙就是1','能，开隙就是0'],0,'局部模型的开隙与全局拓扑诊断不同。')]]
exercises=[]
for (i,t,_,_),qs in zip(rows,questions):
    exercises.append(dict(id=i+'-exercise',module='workshop',lesson=i,title=t+'：分步验证',prompt='先根据表示和生成元推导，再在工坊运行预设核对。',steps=[dict(prompt=q,hint=h,choices=c,answer=a,explanation=e) for q,h,c,a,e in qs]))
cases=[dict(id='workshop-interface',module='workshop',title='界面反演破缺与 Rashba 型项',kind='对称性机制原型',summary='用 C₄ᵥ 双态模型理解表面或界面允许的线性自旋动量耦合。',assumption='约化k、示意系数与同宇称真实自旋双态；不是特定界面的拟合能带。',preset='workshop-rashba',links=[['能带相容关系','#compute/band-connectivity'],['自旋与双群','#classroom/spin']]),dict(id='workshop-magnetism',module='workshop',title='磁性项如何受镜面和时间反演限制',kind='教学模型',summary='关闭生成元后追踪σ_z系数与Γ点劈裂，区分能谱后果和约束来源。',assumption='未构造磁空间群完整小表示；只对声明的2×2模型施加生成元。',preset='workshop-magnetic',links=[['量子几何与拓扑诊断','#compute/quantum-geometry-lab'],['符号Hamiltonian','#compute/advanced/symbolic']])]
data=dict(schemaVersion=1,release='20261030-bridges1',module=dict(id='workshop',title='对称性推导工坊：允许项与能带',summary='开关生成元，逐步检查二阶二维自旋模型的矩阵约束、系数关系与能带变化。',route='symmetry-workshop',action='symmetry_workshop',fields=fields,presets=presets),lessons=lessons,exercises=exercises,cases=cases,sources=[dict(id='qsymm',title='Qsymm: symmetry-constrained continuum Hamiltonian generation',url='https://qsymm.readthedocs.io/latest/')])
(ROOT/'dist/data/workshop-content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Workshop: 3 lessons, 12 exercise steps, 6 presets, 2 cases.')
