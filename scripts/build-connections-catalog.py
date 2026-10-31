"""Author and build the statistics, defects and reciprocity course catalogue."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
RELEASE='20261031-connections1'
def select(key,label,default,options):return dict(key=key,label=label,default=default,type='select',options=options)
def number(key,label,default,lo,hi,step=.1):return dict(key=key,label=label,default=default,type='number',min=lo,max=hi,step=step)
def preset(id,title,**kw):return dict(id=id,title=title,input=kw)
modules=[dict(id='statistics',title='置换群与同粒子统计',route='statistics-lab',action='statistics_lab',pathway='foundations',summary='把置换群、轨道 × 自旋和 Pauli 条件连起来，逐步构造完整波函数。',fields=[select('mode','粒子空间','two',[['two','两电子：轨道 × 自旋'],['three','S₃：三个二能级因子']]),select('orbital','两电子轨道态','symmetric',[['same','同一轨道 aa'],['symmetric','(ab + ba) / √2'],['antisymmetric','(ab − ba) / √2']]),select('spin','两电子自旋态','singlet',[['singlet','单重态'],['triplet0','三重态 m=0'],['upup','三重态 m=1']]),select('swap','S₃ 交换操作','12',[['12','交换 1 与 2'],['23','交换 2 与 3'],['13','交换 1 与 3']])],presets=[preset('pauli-singlet','对称轨道 × 单重态'),preset('pauli-forbidden','反例：同轨道 × 三重态',orbital='same',spin='upup'),preset('pauli-triplet','反对称轨道 × 三重态',orbital='antisymmetric',spin='triplet0'),preset('pauli-same','同轨道 × 单重态',orbital='same'),preset('young-three','S₃ 中心投影与 Young 算符',mode='three'),preset('young-swap','交换两个不同因子',mode='three',swap='23')]),
dict(id='defects',title='序参量流形与拓扑缺陷',route='topological-defects-lab',action='defects_lab',pathway='structure-dynamics',summary='从可能的有序态到畴壁与涡旋，用闭环、核心和边界条件检验拓扑分类。',fields=[select('model','序参量空间','xy',[['xy','XY：平面矢量 S¹'],['nematic','平面向列：RP¹'],['ising','Ising：两个离散真空']]),select('texture','XY / 向列纹理','pair',[['pair','涡旋—反涡旋对'],['single','单个涡旋']]),number('separation','核心间距 d',2,0,4),number('loopX','环路中心 x / 畴壁中心',-1,-3,3),number('loopY','环路中心 y',0,-3,3),number('radius','环路半径 / 畴壁宽度',.6,.1,3),number('phase','整体转角（度）',0,-180,180,5)],presets=[preset('vortex-one','环路包围一个涡旋'),preset('vortex-pair','环路包围一对缺陷',loopX=0,radius=2),preset('vortex-core','反例：环路经过核心',loopX=0,radius=1),preset('vortex-merged','成对解析场合并终点',separation=0,loopX=0),preset('nematic-half','平面向列的半圈转角',model='nematic'),preset('ising-wall','固定异号边界的畴壁',model='ising',loopX=0,radius=.7)]),
dict(id='reciprocity',title='互易关系与响应约束',route='reciprocity-lab',action='reciprocity_lab',pathway='observables',summary='同时追踪空间操作、时间反演奇偶和磁畴反转，分清互易性、Hall 响应与耗散。',fields=[select('model','响应变量','hall',[['hall','二维电响应 / Hall'],['thermo','电荷—能量：两偶变量'],['mixed','抽象通道：一偶一奇']]),select('space','Hall 的空间操作','c4',[['c1','恒等操作'],['c4','四重旋转'],['mirror','镜面：同时变换轴矢量 Bz、Mz']]),number('a','对角响应 a',1,.05,4),number('b','对角响应 b',1.4,.05,4),number('cross','对称耦合系数 c',.25,-2,2),number('odd','反对称耦合系数 d',.4,-2,2),number('field','外磁场 B（无量纲）',.6,-3,3),number('magnetization','磁化 M（无量纲）',.3,-3,3),select('reverseM','比较实验是否同时反转 M','yes',[['yes','是：反转 B 与 M'],['no','否：只反转 B']]),number('violation','故意加入的互易破坏项 δ',0,-2,2),number('forceX','共轭力 X₁',1,-2,2),number('forceY','共轭力 X₂',0,-2,2)],presets=[preset('onsager-hall','反转全部奇参量'),preset('onsager-domain','反例：只翻转外磁场',reverseM='no'),preset('onsager-mirror','镜面与轴矢量协变',space='mirror'),preset('onsager-thermo','电热共轭通道',model='thermo',field=0,magnetization=0),preset('onsager-mixed','一偶一奇变量',model='mixed'),preset('onsager-broken','反例：违反互易的候选矩阵',violation=.4),preset('onsager-active','反例：互易但非被动',model='thermo',cross=2,field=0,magnetization=0)])]

predictions=[
 [('predict-pauli','pauli-forbidden','同轨道与同自旋组合，费米投影范数平方是多少？',['0','1','2'],0,'总态对称，反对称投影为零。'),('predict-young','young-three','三个二能级因子的全反对称空间有多大？',['0 维','1 维','3 维'],0,'单粒子维数 2 小于粒子数 3。')],
 [('predict-pair','vortex-pair','包围一正一负涡旋，净绕数是多少？',['0','1','2'],0,'电荷相消不等于区域内没有核心。'),('predict-core','vortex-core','环路经过核心还能报告整数吗？',['可以四舍五入','本环路诊断无效'],1,'核心上角度无定义，需移动环路。')],
 [('predict-domain','onsager-domain','只翻转 B，M 保持，所选比较残差会为零吗？',['会','当前预设不会'],1,'此预设 M 非零，完整反转残差仍为零。'),('predict-passive','onsager-active','满足互易就能保证所有方向非负耗散吗？',['能','不能'],1,'过大的对称交叉项可产生负本征值。')]]
for m,rows in zip(modules,predictions):m['predictions']=[dict(id=i,preset=p,question=q,choices=cs,answer=a,explanation=e) for i,p,q,cs,a,e in rows]
sources=[dict(id='neil',title='Ethan Neil · Identical particles',url='https://etneil.github.io/grad_qm_lec_notes/identical_particles.html'),dict(id='tong',title='David Tong · Continuous symmetries and vortices',url='https://www.damtp.cam.ac.uk/user/tong/sft/sfthtml/S4.html'),dict(id='onsager',title='Onsager (1931) · Reciprocal relations II',url='https://journals.aps.org/pr/abstract/10.1103/PhysRev.38.2265'),dict(id='casimir',title='Casimir (1945) · Microscopic reversibility',url='https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.17.343')]

# Each lesson has its own conceptual progression and four answerable steps.
lesson_rows=[
('statistics','complete-exchange','交换的是完整粒子','pauli-singlet','neil',[
('先确定单粒子自由度','电子具有轨道与自旋自由度。交换两个相同电子时，两部分都必须交换。玻色子的完整态取对称交换条件，费米子取反对称条件；局域可区分自旋无需强加粒子统计条件。','P = P_orb ⊗ P_spin'),
('构造自旋与轨道的组合','单重态自旋反对称，三重态自旋对称。完整电子波函数必须反对称，所以两部分交换奇偶相反。','η_total = η_orb η_spin'),
('把允许性与能量分开','交换条件筛去不允许的态。剩余态谁低谁高，需要具体 Hamiltonian；Pauli 原理本身不给出 Hund 能量差。','P_- = (I − P)/2')],
 [('完整交换作用在哪？',['只在轨道','只在自旋','轨道和自旋同时'],2,'每个电子的全部自由度要一起交换。'),('单重态的自旋交换符号？',['+1','−1','0'],1,'交换 ↑↓ 和 ↓↑ 使差组合变号。'),('对称轨道 × 单重态总符号？',['−1','+1','不能确定'],0,'(+1)×(−1)=−1，满足费米条件。'),('满足 Pauli 就确定基态了吗？',['是','还需 Hamiltonian','一定是三重态'],1,'允许性与能量排序是不同问题。')]),
('statistics','pauli-projector','用投影找出 Pauli 禁戒','pauli-forbidden','neil',[
('交换两次回到原态','二体交换算符的平方为单位。由此构造对称和反对称正交投影。','P^2 = I'),('为什么系数是二分之一','展开 (I−P)²=2(I−P)，幂等性要求非零归一化系数为 1/2。','P_-^2 = P_-'),('零向量不是归一化失败','同轨道且同自旋的两个电子总态对称，反对称投影严格为零。这是统计禁戒，不是数值误差。','P_- ψ = 0')],
 [('P² 是什么？',['P','I','−I'],1,'两次交换恢复全部标签。'),('c(I−P) 非零幂等时 c=?',['1','1/2','1/3'],1,'用 2c²=c 并排除零解。'),('同轨道 aa 的轨道奇偶？',['偶','奇','未定义'],0,'交换两个相同轨道不改变态。'),('同轨道 × ↑↑ 投影为零后应怎样？',['除以零归一化','增加精度继续','判为被禁止的候选态'],2,'精确零范数揭示完整态违反反对称条件。')]),
('statistics','young-sectors','S₃、中心投影与 Young 对称化','young-three','neil',[
('六个置换的作用','三个二能级张量因子有八维空间。S₃ 的六个操作在这个空间中产生具体置换矩阵。','dim V = 2^3'),('完整的中心分解','等权平均给对称投影，带置换符号平均给反对称投影，其余为混合中心投影；三个秩依次为 4、0、4。','P_mix = I − P_sym − P_alt'),('Young 与正交投影不同','指定表格第一行 1、2，第二行 3，按先列反对称再行对称作用，Y=(I+P₁₂)(I−P₁₃)。Y/3 幂等但非厄米。','Y^2 = 3Y')],
 [('三个二能级张量因子总维数？',['6','8','3'],1,'每因子维数 2，总维数 2³。'),('反对称秩零意味着 S₃ 无符号表示？',['是','否，只是在此模型未出现','S₃ 不是群'],1,'群的不可约表示与给定空间的重数要区分。'),('Y²=3Y 时幂等归一化？',['Y/2','Y/3','3Y'],1,'直接平方验证。'),('幂等必然正交投影吗？',['是','还需厄米性','还需满秩'],1,'Y/3 给出具体的非厄米幂等反例。')]),
('defects','manifold','从剩余对称性到序参量空间','vortex-one','tong',[
('G 与 H 描述不同对象','G 是模型的对称群，H 是一个选定有序态保持的子群；轨道 G/H 给出与其对称相关的可能状态。','M = G/H'),('离散点、圆和球','Ising 的两个真空不连通；平面 XY 有序态构成圆；三维单位矢量构成球。不同允许态空间有不同的缺陷分类。','S^1'),('约束决定分类适用范围','XY 环绕角度的整数绕数依赖序参量留在平面且环路上有定义。允许出平面或核心失序时，需要重新检查条件。','w = Δθ/(2π)')],
 [('H 是什么？',['模型全部对称','所选态保持的对称','测量仪器名称'],1,'模型与态的对称性分层描述。'),('XY 的单位平面矢量空间？',['两点','圆 S¹','球 S²'],1,'一个角度模 2π。'),('Ising 畴壁关联什么？',['真空不连通','任意非零绕数','自旋一定守恒'],0,'两个离散连通分支与畴壁相关。'),('放开出平面自由度后？',['原分类自动不变','需重查允许态空间','所有能量都变零'],1,'同伦分类以规定的目标空间为前提。')]),
('defects','winding','闭环、核心与绕数','vortex-pair','tong',[
('沿闭环累加相位','相邻采样点的主值相位差相加，除以 2π 得到绕数；采样步长太大会把大转角折叠。','w = Δθ/(2π)'),('环路不能穿过核心','核心处角度没有定义。程序同时检查核心距离、最大相位步长和解析包围电荷。','ψ = exp(iθ)'),('成对湮灭需要过程条件','包围一对正负涡旋的净绕数为零，但其中仍有两个核心。间距参数为零给出均匀解析终点；滑动此参数不是动力学模拟。','w_total = w_1 + w_2')],
 [('只包围正涡旋的绕数？',['1','0','−1'],0,'按逆时针环路与正角度约定。'),('包围一正一负净绕数？',['2','0','未必整数'],1,'两个电荷相加为零。'),('净绕数零能证明区域内无缺陷？',['能','不能，可能有缺陷对','只看颜色即可'],1,'净电荷与核心数量不同。'),('环路经过核心时？',['照样四舍五入','报告诊断无效并移动环路','一律取零'],1,'相位未定义不能产生可靠整数。')]),
('defects','director','指向矢、半圈转角与畴壁','nematic-half','tong',[
('平面指向矢正反等价','平面向列将 n 与 −n 视为同态，所以 θ 的周期是 π。这里是 RP¹，不是三维 RP²。','n ≡ −n'),('使用单值双角场','exp(2iθ) 沿闭环绕一圈，对应指向矢角度绕转 π，即 Δθ/(2π)=1/2。','ψ = exp(2iθ)'),('拓扑与能量分开','拓扑分类讨论在规定边界与非奇异约束下能否连续变形；稳定性还需要自由能、尺寸与边界条件。','Δθ/(2π) = 1/2')],
 [('平面向列角度周期？',['π','2π','4π'],0,'n 与 −n 等价。'),('哪个场是单值的？',['exp(iθ)','exp(2iθ)','θ 本身无周期'],1,'θ→θ+π 时双角场不变。'),('双角场绕数 1 的角度绕转？',['2π','π','0'],1,'除以双角系数 2。'),('有拓扑荷就一定能量稳定？',['是','否，要指定能量与边界','只与网格大小有关'],1,'分类和稳定性不能相互替代。')]),
('reciprocity','onsager','从变量奇偶到互易关系','onsager-hall','onsager',[
('先选共轭变量','在线性、近稳态框架下，用与熵产生相匹配的流和力定义 L。ε 是对应热力学状态变量的时间反演奇偶。','J = L X'),('同时反转奇参量','比较 Lᵢⱼ(B,M) 和 εᵢεⱼLⱼᵢ(−B,−M)。这里 B 与磁化 M 都必须反转。','L_ij(B,M) = ε_i ε_j L_ji(−B,−M)'),('同一磁场不必对称','二维 Hall 的反对称分量可随 B+M 变号，因此在非零磁态下矩阵可不对称而仍满足互易。','L = S + A')],
 [('ε 对应什么？',['随便给流贴标签','指定热力学状态变量的奇偶','只取空间反演奇偶'],1,'先说明变量和共轭力的定义。'),('有 B 与 M 时要反转？',['只 B','B 与 M','只测量电线'],1,'全部时间反演奇控制量一并反转。'),('Hall 矩阵非对称必然违反互易？',['是','否','只看一个数'],1,'互易连接反向磁态的转置矩阵。'),('电荷与能量的变量奇偶？',['均为偶','均为奇','一偶一奇'],0,'常规电热共轭通道使用两偶状态变量。')]),
('reciprocity','spatial-response','空间约束与磁畴反转','onsager-mirror','casimir',[
('旋转约束空间分量','二维四重旋转强制对角电响应相等；反对称 Hall 项在此旋转下可保留。','L = R L R^T'),('镜面也作用于外参量','面内镜面的行列式为 −1，垂直平面的轴矢量 Bz、Mz 同时变号。应检查不同磁态之间的协变。','L(−B,−M) = R L(B,M) R^T'),('标量通道不能误用空间矩阵','电荷—能量是两种通道，二维空间旋转不直接作用于这两个通道编号。工具只对 Hall 空间分量应用所选空间操作。','J_i = Σ_j L_ij X_j')],
 [('C₄ 对二维对角响应要求？',['两对角元相等','所有元为零','所有元相等'],0,'旋转交换 x 与 y 方向。'),('面内镜面对 Bz 的作用？',['不变','变号','平方'],1,'B 是轴矢量，需带行列式因子。'),('非零磁态的镜面通常连接？',['相同磁态','相反 B、M 的磁态','任意材料'],1,'不能把跨磁态协变当同一磁态不变。'),('热电两通道可直接当 x,y 吗？',['可以','不可以，需另定义空间指标','只在高温可以'],1,'通道索引与空间分量索引不同。')]),
('reciprocity','dissipation','耗散、互易与成对实验','onsager-active','onsager',[
('分解对称与反对称部分','任意实矩阵可分解为对称 S 和反对称 A；实共轭力下 XᵀAX=0。','S = (L + L^T)/2'),('检查所有激励而非单次实验','某个 X 下熵产生为正，不保证所有 X 都如此。需要 S 的全部本征值非负。','σ = X^T S X'),('让证据支持结论','保存 A、B 两组完整输入和结果，说明反转了什么、保留了什么，并比较互易残差与最小耗散本征值。','λ_min(S) ≥ 0')],
 [('熵产生依赖哪部分？',['只反对称','只对称','两个都相同'],1,'反对称部分的二次型恒为零。'),('一个激励下正耗散足够吗？',['足够','还要检查全部方向','仅检查迹即可'],1,'最小本征值决定是否存在负方向。'),('互易矩阵一定被动吗？',['是','否','只要对角元正就行'],1,'过大的对称交叉项可使 S 有负本征值。'),('报告应保留什么？',['只保留漂亮图','两组参数、结果和解释','只保留总分'],1,'可复现比较需要完整输入与输出。')])]
lessons=[];exercises=[]
for module,id,title,preset_id,source,sections,steps in lesson_rows:
    lid=module+'-'+id
    lessons.append(dict(id=lid,module=module,title=title,summary=sections[0][1],preset=preset_id,references=[source],sections=[dict(title=a,text=b,formula=c) for a,b,c in sections]))
    exercises.append(dict(id=lid+'-practice',module=module,lesson=lid,title=title+' · 推导',prompt='逐步说明假设、变换和可验证的结论，再改变参数寻找边界。',steps=[dict(prompt=q,choices=cs,answer=a,hint=h,explanation=h) for q,cs,a,h in steps]))

case_rows=[
('statistics','helium','氦原子两电子：交换条件','pauli-same','局域原子背景','将同一空间轨道与自旋单重态组合，解释两电子为何可占据同一空间轨道。','只计算两轨道 × 自旋的交换条件，不拟合氦能级或电子相关。',[['多电子多重态','#classroom/spin?module=multiplet'],['原子谱','#classroom/observables?module=spectra']]),
('statistics','molecular','双中心轨道与单重 / 三重态','pauli-triplet','分子与小团簇背景','比较两个局域轨道的对称和反对称组合，连接交换条件与 Hubbard 小团簇。','a、b 为正交教学轨道；没有使用真实 H₂ 的非正交轨道积分或势能面。',[['Hubbard 小团簇','#classroom/spin?module=hubbard'],['SALC','#classroom/foundations?module=salc']]),
('statistics','three-spins','三个二能级自由度的置换','young-three','有限表示模型','构造对称与混合子空间，对照 SU(2) 耦合和 Young 对称化。','这里的张量因子可为三个局域自旋；局域可区分自由度不强制全部费米反对称。',[['SU(2) 与重耦合','#classroom/coupling'],['密度矩阵','#classroom/spin?module=density']]),
('defects','easy-plane','易平面磁体的涡旋模型','vortex-one','磁性纹理背景','观察平面方向场的绕转，讨论易平面约束与缺陷核心。','解析 XY 纹理，没有拟合交换、DMI、偶极或核心能量。',[['交换与 DMI','#classroom/spin?module=exchange'],['磁激发','#classroom/spin?module=magnons']]),
('defects','nematic','平面向列液晶的指向矢','nematic-half','软物质背景','比较带箭头的矢量与正反等价的指向矢，使用双角场读取半圈转角。','严格限制平面 RP¹；不覆盖三维 RP² 缺陷或实际液晶边界锚定。',[['连续对称性','#classroom/continuous?module=conservation'],['序参量','#classroom/structure-dynamics?module=order']]),
('defects','ising','双稳态序参量与畴壁','ising-wall','标量有序模型','固定异号边界，移动畴壁并改变宽度，再到畴壁工具研究具体自由能。','实标量 tanh 构型只展示过零条件；真实铁电或磁畴还需多分量及长程作用。',[['畴壁与局域态','#classroom/structure-dynamics?module=domainwall'],['动态结构因子','#classroom/observables?module=scattering']]),
('reciprocity','magnetic-hall','磁性薄膜的 Hall 互易实验','onsager-domain','测量几何背景','分别翻转外磁场和磁畴，追踪交换激励与读出通道的比较条件。','无量纲 2×2 教学响应；不等于任意四端器件的完整接触电阻矩阵。',[['反常 Hall','#classroom/observables?module=hall'],['器件输运','#classroom/crystal?module=device']]),
('reciprocity','thermoelectric','Seebeck 与 Peltier 的共轭变量','onsager-thermo','热电材料背景','先统一温度与电化学势的共轭力约定，再讨论交叉响应的互易。','本页使用缩放的熵共轭量；不能不换单位就把矩阵元当作实验 S 与 Π。',[['电子输运与热电','#classroom/observables?module=transport'],['物性张量','#compute/tensors']]),
('reciprocity','mixed-parity','一偶一奇变量与耗散反例','onsager-mixed','抽象响应模型','把变量奇偶、矩阵转置和磁态反转分别操作，检查允许响应及非负耗散。','一偶一奇为抽象近稳态变量；不是电荷和能量这两个均偶的通道。',[['对称性推导','#classroom/crystal?module=workshop'],['守恒与退相干','#classroom/continuous?module=conservation']])]
cases=[dict(module=m,id=i,title=t,preset=p,kind=k,summary=s,assumption=a,links=l) for m,i,t,p,k,s,a,l in case_rows]
data=dict(schema='symmetry-lab-connections-1',release=RELEASE,modules=modules,lessons=lessons,exercises=exercises,cases=cases,sources=sources)
(ROOT/'dist/data/connections-materials.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print({k:len(data[k]) for k in ['modules','lessons','exercises','cases','sources']})

# Extend the clickable dictionary without changing historical records.
path=ROOT/'dist/data/formula-dictionary.json';dictionary=json.loads(path.read_text(encoding='utf8'))
dictionary['connectionsRelease']=RELEASE
for source in sources:
 sid='connections-'+source['id']
 if not any(s['id']==sid for s in dictionary['sources']):dictionary['sources'].append({**source,'id':sid})
entries=[
 ('complete-exchange','完整粒子交换',['P_orb','P_spin','η_total = η_orb η_spin'],'交换同时作用于粒子的全部自由度；电子的轨道与自旋交换符号相乘。','对于相同费米子总符号为 −1，玻色子为 +1。局域可区分张量因子不自动满足粒子统计条件。','statistics','neil'),
 ('pauli-projector','费米反对称投影',['P_-','P_- = (I − P)/2'],'二粒子交换 P²=I 时，(I−P)/2 是反对称正交投影。','零范数投影表示候选态被消去，不可归一化；投影不决定能量。','statistics','neil'),
 ('young-idempotent','Young 幂等归一化',['Y^2 = 3Y'],'指定 S₃ 表格下 Y=(I+P₁₂)(I−P₁₃)，Y/3 幂等。','算符乘积右侧先作用；此 Young 幂等算符通常非厄米，不等同混合中心正交投影。','statistics','neil'),
 ('order-manifold','序参量流形与剩余对称性',['G/H','M = G/H'],'G 是模型对称群，H 是选定有序态的稳定子；G/H 是其对称相关状态轨道。','须先规定允许态空间和固定边界；不能仅由群标签推断缺陷能量稳定性。','defects','tong'),
 ('defect-winding','闭环绕数',['w = Δθ/(2π)','n ≡ −n'],'XY 环路上角度增量除以 2π 得整数绕数；平面向列使用单值双角场。','环路不穿过核心、采样充分；向列的角度绕转可为半整数，其双角场绕数仍为整数。这里是平面 RP¹。','defects','tong'),
 ('onsager-casimir','Onsager–Casimir 互易',['L_ij(B,M) = ε_i ε_j L_ji(−B,−M)'],'反转全部时间反演奇参量，再交换响应指标并乘变量奇偶因子。','限定线性近稳态与一致的熵共轭力约定；不要求同一磁态下矩阵对称，也不自动保证非负耗散。','reciprocity','casimir'),
 ('entropy-response','对称耗散与非负熵产生',['σ = X^T S X','λ_min(S) ≥ 0'],'实共轭力的熵产生只依赖响应矩阵的对称部分 S。','要求对所有力非负时，S 必须半正定；单次激励的正结果不足以证明。','reciprocity','onsager')]
routes={m['id']:m for m in modules}
for id,title,symbols,definition,conditions,module,source in entries:
 eid='connections-'+id
 entry=dict(id=eid,title=title,symbols=symbols,aliases=[title],definition=definition,variables=[dict(symbol=symbols[0],meaning=definition,unit='按本页缩放约定；群、投影和绕数均无量纲')],conventions='采用对应课堂中明确给出的基、坐标和变量约定。',conditions=conditions,sources=['connections-'+source],links=[['对应课堂','#classroom/'+routes[module]['pathway']+'?module='+module],['交互计算','#compute/'+routes[module]['route']]],contexts=[module,'connections'],formulaAliases=symbols)
 existing=next((i for i,e in enumerate(dictionary['entries']) if e['id']==eid),None)
 if existing is None:dictionary['entries'].append(entry)
 else:dictionary['entries'][existing]=entry
path.write_text(json.dumps(dictionary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
