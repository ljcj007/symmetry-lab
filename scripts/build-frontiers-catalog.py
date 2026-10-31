"""Original lessons and bounded, reproducible teaching presets."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
RELEASE='20261031-frontiers1'
def numeric(k,label,v,lo,hi,step=.1):return dict(key=k,label=label,type='number',default=v,min=lo,max=hi,step=step)
def select(k,label,v,options):return dict(key=k,label=label,type='select',default=v,options=options)
def preset(id,title,**input):return dict(id=id,title=title,input=input)
sources=[
 dict(id='layer-bcs',title='Bilbao · 层群与截面对称性',url='https://www.cryst.ehu.es/cgi-bin/subperiodic/programs/nph-sections?gnum=47&what=table'),
 dict(id='layer-db',title='de la Flor 等 · 层群数据库与 Brillouin 区',url='https://pmc.ncbi.nlm.nih.gov/articles/PMC8573847/'),
 dict(id='chirality-iucr',title='Nespolo、Aroyo、Souvignier · 空间群层次与手性',url='https://journals.iucr.org/j/issues/2018/05/00/in5013/index.html'),
 dict(id='spglib-tol',title='spglib · 笛卡尔距离容差的定义',url='https://spglib.readthedocs.io/en/v2.8.0/variable.html'),
 dict(id='aklt',title='Affleck、Kennedy、Lieb、Tasaki · Valence-bond ground states',url='https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.59.799'),
 dict(id='pollmann',title='Pollmann 等 · 一维拓扑相的纠缠谱',url='https://arxiv.org/abs/0910.1811')]
modules=[
 dict(id='layers',title='层群、表面与界面对称性',summary='从三维母体切出有限薄层，保留面内周期，逐原子检查边界、元素与堆垛的作用。',pathway='crystal',route='layer-symmetry-lab',action='layer_symmetry_lab',fields=[select('face','母体切面','001',[['001','(001) 方形面'],['110','(110) 矩形面'],['111','(111) 三角面']]),numeric('layers','有限原子层数',4,1,6,1),select('bulk','层成分','mono',[['mono','相同元素层'],['alternating','A/B 交替层']]),numeric('cut','交替层切割起点',0,0,1,1),select('interface','界面标签','same',[['same','同质两侧'],['hetero','异质两侧']]),select('termination','表面终止','same',[['same','保留原层标签'],['marker','上表面标记 C']]),numeric('registry','上半部分错位（第一面内基矢）',0,0,1,.05),numeric('pathEnd','错位路径终点',.5,0,1,.05)],presets=[preset('layer-square','对称 (001) 四层'),preset('layer-110','(110) 面内矩形',face='110'),preset('layer-111','(111) 面内三角',face='111'),preset('layer-surface','只标记上表面',termination='marker'),preset('layer-interface','异质错位界面',interface='hetero',registry=.23),preset('layer-alternating','奇数交替层与切割起点',bulk='alternating',layers=5,cut=1)]),
 dict(id='chirality',title='手性、极性与伪对称实验',summary='镜像配准、极向量约束与距离容差分别检验；再用独立偏振模型理解往返旋转。',pathway='observables',route='chirality-polarity-lab',action='chirality_polarity_lab',fields=[select('motif','有限结构原型','d3',[['d3','D3 手性非极性'],['pyramid','C4v 极性锥体'],['octahedron','Oh 八面体'],['tetra','四个不同标签的位点']]),select('handedness','构型与其镜像',1,[[1,'原构型'],[-1,'镜像构型']]),numeric('noise','确定性位移幅度',0,0,.12,.005),numeric('tolerance','候选操作的距离容差',.01,1e-6,.3,.005),select('optical','独立往返偏振模型','natural',[['natural','自然旋光'],['faraday','Faraday 旋转']]),numeric('angle','单程旋转角（度，教学输入）',20,-90,90,1)],presets=[preset('chiral-d3','手性但无极向量方向'),preset('chiral-polar','极性但含镜面',motif='pyramid'),preset('chiral-centro','有反演的八面体',motif='octahedron'),preset('chiral-tetra','四个不同标签的手性构型',motif='tetra'),preset('chiral-mirror','同构型的镜像与 Faraday 对照',motif='tetra',handedness=-1,optical='faraday'),preset('chiral-noise','从精确对称到伪对称',noise=.04,tolerance=.06)]),
 dict(id='spt',title='射影表示与多体 SPT',summary='从 AKLT 自旋 1 链到虚拟自旋 1/2，联动边界、纠缠谱、保护操作与有限尺寸扰动路径。',pathway='spin',route='manybody-spt-lab',action='manybody_spt_lab',fields=[numeric('sites','自旋 1 位点数（有限链）',4,3,5,1),select('boundary','边界','periodic',[['periodic','周期边界'],['open','开边界']]),numeric('anisotropy','单离子各向异性 D/J',0,0,8,.1),numeric('field','倾斜场 h/J',0,0,1,.05),select('fieldPattern','场的空间分布','gradient',[['gradient','位点梯度'],['uniform','均匀']]),select('pathAxis','路径改变的参数','anisotropy',[['anisotropy','D/J'],['field','h/J']]),numeric('pathEnd','路径终点（D ≤ 8；h ≤ 1）',4,0,8,.1)],presets=[preset('spt-aklt','周期 AKLT 点'),preset('spt-edge','开边界与四维基态空间',boundary='open'),preset('spt-large-d','强单离子各向异性',anisotropy=8,pathEnd=8),preset('spt-uniform','均匀场：仍需检查反演',field=.3,fieldPattern='uniform',pathAxis='field',pathEnd=.8),preset('spt-gradient','梯度场与保护条件',field=.3,pathAxis='field',pathEnd=.8),preset('spt-size','五位点有限尺寸对照',sites=5)])]

lesson_rows=[
 ('layer-periodicity','layers','二维周期不等于二维空间','layer-square',[
 ('先指定周期方向','平面群作用于二维图案；层群作用于三维空间中的对象，但只有两个独立周期平移。层群可以含翻转法向的操作。教材中的 17 个平面群与 80 个层群回答不同问题。','r′ = R r + t'),
 ('把边界写进匹配规则','面内坐标按两条晶格基矢取模，法向不取模。把薄膜塞进有真空的三维周期晶胞，是计算表示；不能直接把超胞的全部周期平移当作孤立薄膜的实际操作。','R n = ±n'),
 ('检查一个真实映射','本页从简单立方母体切出薄层，枚举保持晶面方向的矩阵，再查找面内平移。每个原子必须映到同标签原子，且整个映射为双射。','{R|t}{S|u} = {RS|R u+t}')]),
 ('layer-termination','layers','切面、终止与两侧交换','layer-surface',[
 ('几何面与具体表面','(001)、(110)、(111) 的面内度量不同。同一个法向也不能唯一指定原子终止；成分、层数和切割起点都属于结构输入。','R n = ±n'),
 ('辨认翻转法向的操作','Rn=−n 的操作交换薄膜两侧。它可能保持对称薄膜，却破坏只有一侧的吸附标记或异质界面；这不是由群符号单独决定的。','R n = −n'),
 ('保持动量和自旋的角色','在正交笛卡尔坐标中，波矢随 R 变换；自旋为轴矢量，另有 det(R)。时间反演会同时反转波矢和自旋，而不移动原子坐标。','S′ = det(R) R S')]),
 ('layer-registry','layers','堆垛路径与界面共同对称性','layer-interface',[
 ('用同一面内晶格比较两侧','上半层沿面内基矢连续平移，比较每个操作对全部原子的映射。界面共同对称性还依赖横向配准，不能只比较两侧的抽象点群名称。','r′ = R r + t'),
 ('追踪特殊配准点','一般错位可能降低操作数，特殊配准可恢复部分操作。七点曲线是取样记录，不保证发现所有特殊点；可手动输入其他分数错位。','t = s a_1'),
 ('把对称许可接到物性','将保留操作带到物性张量课堂，可以继续约束响应分量；操作减少不保证某项响应变大，也不替代微观材料参数。','R P = P')]),
 ('chiral-mirror','chirality','结构镜像与正旋转配准','chiral-d3',[
 ('区分主动镜像与坐标描述','主动镜像改变构型。被动换基仅改变同一构型的坐标，同时也必须变换晶格和操作矩阵。本实验用明确的 x 反号生成镜像。','det(R) = −1'),
 ('只允许保向刚体配准','枚举同种原子的所有对应，再寻找行列式 +1 的最佳旋转。不同标签不能互换。配准残差为零说明这个有限点集与镜像可重合。','det(R) = +1'),
 ('回到空间群的层次','手性晶体结构只能具有保向操作，涉及 65 个 Sohncke 群型；其中 22 个群型组成 11 对对映群型。其余 Sohncke 群型也可容纳手性结构。','R r = r′')]),
 ('chiral-polarity','chirality','手性、极性与铁电性的不同问题','chiral-polar',[
 ('直接求允许极向量','极向量必须被每个群操作保持。将所有 (R−I) 约束联立，可以得到允许方向的维数；D3 原型为零，C4v 锥体只允许轴向。','(R−I) P = 0'),
 ('手性与极性分别验证','D3 点集可以手性而非极性；C4v 锥体可以极性却因镜面而非手性。无反演也不能替代这两个独立判断。','R P = P'),
 ('用独立实验讨论响应','极性只说明对称性许可，不给出自发极化大小或可逆切换。偏振往返模型使用外加旋转角，并明确自然旋光与 Faraday 的回程约定。','R(−θ) R(θ) = I')]),
 ('chiral-tolerance','chirality','容差、伪对称与逆向鉴别','chiral-noise',[
 ('先量化实际位移','沿固定扰动方向给理想点集加入已知幅度。严格当前构型的对称与理想母构型的近似操作分开记录；几何误差使用模型长度。','δ = max_i |R r_i − r_{p(i)}|'),
 ('接受集合还要检查闭合','逐操作通过距离阈值并不自动保证组合也通过。容差扫描显示接受数与每个候选的最大残差，闭合失败时不输出严格群名。','R_1 R_2 ∈ G'),
 ('从有限证据排除候选','依次测定手性、极向量许可和反演等性质，保留与全部已知证据相容的候选。不能把“剩一个教学候选”理解为证明任意真实材料的结构。','R P = P')]),
 ('spt-aklt-parent','spt','从价键图像到 AKLT 母 Hamiltonian','spt-aklt',[
 ('把两个虚拟自旋投影成自旋 1','AKLT 图像将每个位点的两个虚拟自旋 1/2 投影到对称自旋 1 子空间，相邻位点的虚拟自旋组成单重态。这连接已有置换与 CG 课程。','1/2 ⊗ 1/2 = 0 ⊕ 1'),
 ('构造每一条键','两个自旋 1 的总自旋为 0、1、2。S·S 的本征值为 −2、−1、1，本页键算符在前两者为零、在总自旋 2 为 2。','h = S_i·S_j + (S_i·S_j)²/3 + 2/3'),
 ('边界改变低能空间','周期链与开链使用不同键集合。理想开链的边缘自由度产生四维基态空间；有限扰动下需重新计算，不能固定假设简并仍然精确。','1/2 ⊗ 1/2 = 0 ⊕ 1')]),
 ('spt-schmidt','spt','Schmidt 分解、纠缠谱与射影表示','spt-edge',[
 ('明确所选量子态','先说明边界和基态简并。本页对简并子空间的投影选择确定纯态；其他边缘态可能给出不同的有限链纠缠谱。','ρ_A = Tr_B |ψ⟩⟨ψ|'),
 ('从系数矩阵得到概率','按二分切口重排波函数系数，对矩阵做奇异值分解。奇异值平方是 Schmidt 概率，总和为 1；纠缠熵是这些概率的函数。','S = −Σ λ_i log(λ_i)'),
 ('识别虚拟空间的群作用','AKLT 点的虚拟 π 旋转可取 Pauli 矩阵。两者反对易，而物理整数自旋的对应 D2 操作对易，显示线性表示与射影表示的差别。','U_x U_z = −U_z U_x')]),
 ('spt-protection','spt','扰动路径与保护条件','spt-uniform',[
 ('分别检验每个保护操作','时间反演是反幺正操作，需共轭 H；空间反演交换位点，不能只反转自旋。均匀倾斜场可能保留空间反演，梯度场可进一步破坏它。','U H* U† = H'),
 ('沿路径记录同一组诊断','固定链长、边界与其他参数，仅改变 D 或 h，联动低能间距、基态空间维数及四个对称残差。通过的对称性可由数值残差直接核验。','U H U† = H'),
 ('区分有限观察与体相结论','有限链没有严格的热力学相变诊断。需要比较尺寸、边界和保护条件；一般扰动时本站不自动把能级变化翻译成体相拓扑标签。','U_x U_z = −U_z U_x')])]
lessons=[]
for lid,mid,title,pid,ss in lesson_rows:
 refs={'layers':['layer-bcs','layer-db'],'chirality':['chirality-iucr','spglib-tol'],'spt':['aklt','pollmann']}[mid]
 lessons.append(dict(id=lid,module=mid,title=title,summary=ss[0][1],preset=pid,references=refs,sections=[dict(title=a,text=b,formula=c) for a,b,c in ss]))

# Correct answers are independently phrased explanations, with plausible conceptual distractors.
questions=[
 [('层群的周期性是？','三维空间中两个独立周期方向','必须所有原子共面','三个方向都周期','层群可作用于有厚度的对象。'),('薄膜法向坐标能否像面内一样取模？','不能；孤立边界必须保留','能，任何超胞都真实周期','只在层数为偶数时能','计算超胞与物理边界要区分。'),('原子映射还必须保持什么？','元素标签与双射关系','只要最近距离较小','只要原子总数相同','每个同种原子要有唯一对应。'),('仿射操作相乘的平移部分？','R u+t','t+u，永远如此','R t+u','第二个平移先被第一个旋转作用。')],
 [('Rn=−n 表示？','交换法向两侧','所有原子都不动','时间反演','这是空间操作对法向的作用。'),('仅上表面标记 C 后如何检查？','重新匹配全部元素标签','只检查母体群名称','仍然必须保留原有反演','上下两侧可能已不等价。'),('镜面下自旋如何变换？','det(R) R S','恒等于 R S','总是保持 S 不变','自旋是轴矢量。'),('时间反演对 r、k、S 的作用？','r 不变，k 和 S 反号','三者都反号','三者都不变','静态位置不因时间反演而移动。')],
 [('界面共同对称性还依赖？','两侧的相对堆垛位置','只依赖各自抽象点群','只依赖两侧原子总数','配准关系是结构的一部分。'),('一般错位与特殊错位的操作数？','可能不同，需逐点检验','必定相同','必定单调下降','特殊分数错位可能恢复操作。'),('七点路径能否找全特殊点？','不能，应增加检查点','一定能','只需曲线看起来平滑','有限采样不证明连续区间全部行为。'),('允许新的张量分量意味着？','对称性不再强制它为零','它必然很大','它与任何微观参数无关','许可与实际数值分开。')],
 [('主动镜像使用什么变换？','行列式 −1 的空间操作','任意坐标换基','时间反演','主动作用与描述变换不同。'),('检验镜像可重合时允许什么旋转？','行列式 +1 的刚体旋转','任意反射也允许','只能恒等操作','加入反射会让镜像判定失去意义。'),('不同元素能否任意互换？','不能','能，几何才重要','仅原子数相同时能','配准必须保持物理标签。'),('65 个 Sohncke 类型全部都是对映群型吗？','不是；22 个构成 11 对','是，构成 65 对','只有其中 11 个允许手性结构','结构手性与群型手性不是同一层次。')],
 [('允许极向量应满足？','所有操作下 R P=P','只对一个旋转成立','只要没有反演即可','需要联立全部操作。'),('D3 手性原型能否没有极向量方向？','可以','不可以，手性必定极性','取决于原子质量','手性与极性分别判定。'),('C4v 锥体的镜面意味着？','可以极性而非手性','一定没有极向量','一定具有中心反演','镜面与允许轴向极向量可以共存。'),('极性是否证明可逆铁电切换？','不能，还需物理证据','一定证明','只需改变坐标原点','铁电性包含材料及切换条件。')],
 [('伪对称实验的容差衡量？','给定候选下的原子映射距离','电子能隙','群的阶数','单位是本模型长度。'),('每个候选单独通过阈值就一定成群吗？','不一定，还需闭合检查','一定','只需群阶是偶数','近似判据可能破坏组合闭合。'),('增大容差恢复更多候选意味着？','接受了更大几何误差','材料必然发生相变','已证明严格高对称','数值接受与物理对称分开。'),('逆向实验仍有两个候选时应怎样报告？','保留二者并选择下一项测量','随机选一个群名','把两者群阶取平均','有限证据允许不唯一结论。')],
 [('两个自旋 1/2 的对称子空间为？','自旋 1 三重态','自旋 0 单重态','自旋 2 五重态','对称投影保留三维子空间。'),('两个自旋 1 的总自旋可取？','0、1、2','只有 1','1/2、3/2','角动量加法决定分解。'),('总自旋 2 时本页键能量为？','2','0','−2','代入 S·S=1 得 1+1/3+2/3。'),('周期链改成开链需要？','移除末端与首端的键','只改图像标签','只把总能量除以链长','边界改变实际 Hamiltonian。')],
 [('简并基态的纠缠谱先要说明？','选定了哪个纯态或混合态','只给最低能量','只给链长','不同边缘态可有不同纠缠。'),('Schmidt 概率来自？','系数矩阵奇异值的平方','能量本征值本身','矩阵元素的直接平均','概率非负且总和为 1。'),('虚拟 Ux 与 Uz 的关系？','反对易','恒等矩阵','任意次序都相同','AKLT 虚拟自旋为半整数。'),('离开 AKLT 点能否直接沿用页面的 −1 标签？','不能，应重新求一般态的不变量','一定可以','只看最低能量即可','解析固定点证据与扰动态诊断分开。')],
 [('时间反演检验包含哪一步？','对 Hamiltonian 取复共轭','只对能量反号','只交换空间坐标','反幺正操作必须包含共轭。'),('均匀场破坏时间反演后是否所有保护都消失？','不一定，还要检查空间反演','一定消失','能隙一定立即闭合','不同保护对称性分别判断。'),('受控路径应怎样改变参数？','固定其余参数，仅改变指定项','同时改变尺寸与边界和场','只改变曲线标题','受控比较方便解释来源。'),('小链的能级变化能否直接定位体相相变？','不能，需要尺寸及其他诊断','任何交叉都可以','任何非零隙都证明平庸','有限尺寸与热力学极限不同。')]]
exercises=[]
for i,(l,qq) in enumerate(zip(lessons,questions)):
 steps=[]
 for j,(prompt,correct,a,b,explain) in enumerate(qq):
  candidates=[correct,a,b];shift=(i+j)%3;candidates=candidates[shift:]+candidates[:shift]
  steps.append(dict(prompt=prompt,hint=explain,choices=candidates,answer=candidates.index(correct),explanation=explain))
 exercises.append(dict(id=l['id']+'-steps',module=l['module'],lesson=l['id'],title=l['title']+'：逐步推导',prompt='先判断模型、操作和适用条件，再用实验结果检验。',steps=steps))
predictions=[
 ('layers','layer-square','对称四层薄膜允许交换上下表面吗？',['允许','不允许'],0,'本预设的两侧元素与几何相同；逐原子配准找到翻转法向的操作。'),
 ('layers','layer-surface','仅上表面标记后，交换两侧的操作会怎样？',['仍然全部保留','不再保留'],1,'表面 C 与另一侧元素不等价，原子标签匹配失败。'),
 ('chirality','chiral-d3','手性 D3 原型一定允许非零极向量吗？',['一定允许','不允许'],1,'本模型所有旋转共同保持的极向量子空间为零维。'),
 ('chirality','chiral-polar','有极轴的锥体一定手性吗？',['一定','不一定'],1,'本 C4v 点集保留镜面，镜像能经正旋转及同类原子配准重合。'),
 ('spt','spt-edge','理想开边界 AKLT 链的基态空间维数？',['1','4','9'],1,'本页无扰动开链得到四维基态空间，对应两个边缘自旋 1/2。'),
 ('spt','spt-uniform','均匀倾斜场破坏 T 后，空间反演还可能保持吗？',['可能保持','一定破坏'],0,'空间反演置换位点，均匀场系数不变。')]
for m in modules:m['predictions']=[dict(id=f'{mid}-predict-{i}',preset=pid,question=q,choices=c,answer=a,explanation=e) for i,(mid,pid,q,c,a,e) in enumerate(predictions) if mid==m['id']]
case_rows=[
 ('surface-cubic','layers','立方母体的三个切面','layer-square','薄膜几何原型','比较 001、110、111 的面内晶格与母体继承操作。','简单立方单原子母体；不是特定元素表面的弛豫结果。',[['空间群课堂','#classroom/crystal'],['物性张量','#compute/tensors']]),
 ('hetero-stack','layers','异质层与横向堆垛','layer-interface','界面原型','区分各侧自身的对称与整体界面的共同操作。','相同面内晶格的化学标签原型，不模拟实际晶格失配或能带。',[['器件输运','#classroom/crystal?module=device'],['螺旋与滑移','#classroom/crystal?module=nonsymmorphic']]),
 ('termination-case','layers','单面吸附与表面标记','layer-surface','边界条件原型','用只有一侧的元素标记检查上下表面是否仍可交换。','标记只改变标签，不含吸附力学、表面电荷与结构弛豫。',[['结构相变','#classroom/structure-dynamics?module=order'],['材料研究记录','#atlas/notebook']]),
 ('quartz-analogy','chirality','石英：手性与非极性的辨析','chiral-d3','材料对称性背景','以石英点群 32 为背景，在 D3 有限点集上求允许极向量。','有限点集仅复现点群层面的约束，不是石英原胞，也不预测旋光系数。',[['32 点群','#classroom/foundations'],['物性张量','#compute/tensors']]),
 ('polar-analogy','chirality','四方极性结构：许可与切换','chiral-polar','铁电材料背景','借助 C4v 原型理解极轴、镜面和电场切换证据的区别。','锥体不是 BaTiO3 原胞；未计算 Berry 极化或铁电翻转势垒。',[['序参量与畴','#classroom/structure-dynamics?module=order'],['非线性光学','#classroom/observables?module=shg']]),
 ('pseudo-structure','chirality','结构优化残差与伪对称','chiral-noise','结构分析方法','将可控小位移与识别阈值分开调节，保留每个候选的距离证据。','有限点集的母构型候选检查；任意 POSCAR/CIF 仍由既有结构工具处理。',[['晶体结构分析','#structure'],['互易关系','#classroom/observables?module=reciprocity']]),
 ('aklt-fixed','spt','AKLT 价键固体','spt-aklt','精确可解固定点','把虚拟自旋、交换投影、有限链基态与纠缠联系起来。','模型是理论固定点，不拟合真实自旋链材料的交换参数。',[['同粒子统计','#classroom/foundations?module=statistics'],['SU(2) 耦合','#classroom/coupling']]),
 ('spin-chain-edge','spt','Haldane 链与边缘自由度','spt-edge','量子自旋链背景','对比周期和开边界，观察边缘空间及纯态选择对纠缠的影响。','N=3–5 的 AKLT 链，不把小链谱当作热力学极限的实验谱。',[['磁交换','#classroom/spin?module=exchange'],['密度矩阵','#classroom/spin?module=density']]),
 ('spt-path-case','spt','各向异性与破缺场路径','spt-gradient','受控扰动原型','逐点追踪对称性残差、低能间距和保护条件。','有限七点路径不能替代无限链相图；一般扰动不自动标定 SPT 类。',[['拓扑与量子几何','#classroom/crystal?module=geometry'],['Hubbard 小团簇','#classroom/spin?module=hubbard']])]
cases=[dict(id=i,module=m,title=t,preset=p,kind=k,summary=s,assumption=a,links=l) for i,m,t,p,k,s,a,l in case_rows]
data=dict(release=RELEASE,modules=modules,lessons=lessons,exercises=exercises,cases=cases,sources=sources)
(ROOT/'dist/data/frontiers-materials.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Frontiers catalog:',len(lessons),'lessons;',sum(len(m['presets']) for m in modules),'presets;',sum(len(e['steps']) for e in exercises),'steps')

allmodules={m['id']:m for m in modules}
for name in ['principles','electronic','bridges']:
 for m in json.loads((ROOT/f'dist/data/{name}-materials.json').read_text(encoding='utf8'))['modules']:allmodules[m['id']]=m
def stage(id,mid,pid,title,prompt):
 m=allmodules[mid];pr=next(p for p in m['presets'] if p['id']==pid)
 values={f['key']:f['default'] for f in m.get('fields',[])}|pr['input']
 def flatten(x,prefix=''):
  return {key:value for k,v in x.items() for key,value in (flatten(v,prefix+k+'.').items() if isinstance(v,dict) else [(prefix+k,v)])}
 return dict(id=id,title=title,action=m['action'],route='#compute/'+m['route']+'?preset='+pid,requires=flatten(values),prompt=prompt)
projects=[
 dict(id='surface-to-polarity',module='layers',title='切割、终止与允许极性',question='哪些约束来自整体薄膜，哪些结论还需要序参量模型？',rubric=['逐原子证明交换两侧的操作是否保持元素。','区分法向边界与面内周期，报告层数和切面。','序参量工具是另一个给定模型；不得把对称许可直接当作薄膜自发极化。'],steps=[stage('slab','layers','layer-square','建立对称薄膜','记录全部操作、两侧交换与闭合；保存为 A。'),stage('surface','layers','layer-surface','只改变上表面标签','与 A 比较，找到因元素标签而失效的操作，应用一次波矢与自旋联动。'),stage('order','order','order-cubic-axis','连接极性序参量模型','在独立立方序参量模型中记录稳定子与等价方向。说明它不是从薄膜自动拟合的自由能。')]),
 dict(id='chirality-to-optics',module='chirality',title='从镜像辨析到光学许可',question='手性、极向量与光学响应分别需要什么证据？',rubric=['保留同种原子约束及正旋转配准误差。','比较手性非极性与极性非手性的两个原型。','SHG 的系数和实验几何是额外输入，不由手性布尔值决定。'],steps=[stage('chiral','chirality','chiral-d3','手性而非极性','记录镜像残差和允许极向量维数；完成一次逆向候选集合判断。'),stage('polar','chirality','chiral-polar','极性而非手性','检查镜面、极向量方向和独立往返旋转模型。'),stage('optics','shg','batio3-001','进入既有偏振光谱工具','在 4mm 的独立 SHG 模型中改变偏振几何；说明原型锥体与真实 BaTiO3 结构及系数的区别。')]),
 dict(id='schmidt-to-spt',module='spt',title='从约化态到 AKLT 边缘与射影表示',question='局域混合、纠缠与拓扑保护怎样联系，又有哪些不同假设？',rubric=['注明完整态和约化态的纯度及 Hilbert 空间。','保留 AKLT 边界条件、选定纯态和基态空间维数。','将解析虚拟表示与有限链数值诊断分开，不由单个有限链谱宣判体相。'],steps=[stage('density','density','singlet','先做单重态的约化密度矩阵','记录整体纯态与局部混合，解释 Schmidt 概率。'),stage('periodic','spt','spt-aklt','周期 AKLT 与虚拟表示','记录能谱、纠缠权重和 Ux/Uz 的反对易；比较位点自旋与虚拟自旋。'),stage('edge','spt','spt-edge','只打开边界','比较基态子空间与代表纯态，保存 A/B 证据。沿 D 路径检查保护条件，解释有限尺寸限制。')])]
projectjs='export const frontiersAssignments='+json.dumps(projects,ensure_ascii=False,indent=2)+';\n'
projectjs+="export function frontiersEvidence(record){if(!['layer_symmetry_lab','chirality_polarity_lab','manybody_spt_lab'].includes(record.action))return null;const e=record.result.learningEvidence||{};return record.result.summary.map(s=>s.label+'='+s.value).join('；')+'；联动证据：'+(e.linked?'已保存':'未保存')+'；逆向鉴别：'+(e.inverse?.result?.correct?'通过':'未通过或未作答')+'；路径点：'+(e.path?.index??'未选择')+(e.comparison?'\\n\\nA 输入：'+JSON.stringify(e.comparison.A.input)+'\\n\\nB 输入：'+JSON.stringify(e.comparison.B.input)+'\\n\\n对照解释：'+e.comparison.explanation:'');}\n"
(ROOT/'dist/frontiers-projects.js').write_text(projectjs,encoding='utf8')
dictionary_path=ROOT/'dist/data/formula-dictionary.json'
dictionary=json.loads(dictionary_path.read_text(encoding='utf8'))
dictionary['entries']=[e for e in dictionary['entries'] if not e['id'].startswith('frontiers-')]
dictionary['sources']=[s for s in dictionary['sources'] if not s['id'].startswith('frontiers-')]
for s in sources:dictionary['sources'].append(s|{'id':'frontiers-'+s['id']})
entries=[
 ('layer-normal','层法向与边界操作',['R n = ±n','R n = −n'],'layers','层的保留操作可以保持或翻转法向；实际是否成立还需检查全部原子与两侧成分。',[('R','主动笛卡尔正交操作','无量纲'),('n','单位法向','无量纲')],'法向有限、两个面内方向周期；不把真空超胞的法向平移当作孤立薄膜操作。','layer-bcs'),
 ('axial-spin','极矢量与轴矢量联动',['S′ = det(R) R S','k′ = R k'],'layers','空间不正操作作用于自旋时多出行列式符号；时间反演另行反转波矢与自旋。',[('S','轴矢量自旋','按模型缩放'),('k','笛卡尔波矢','弧度/长度'),('R','正交矩阵','无量纲')],'采用主动操作。复波函数的反幺正变换还必须包含共轭。','layer-db'),
 ('polar-space','允许极向量子空间',['(R−I) P = 0','R P = P'],'chirality','联立所有操作的不变性方程得到允许极向量方向。',[('P','候选极向量；此处不代表已计算的自发极化','按物理对象定义'),('I','单位矩阵','无量纲')],'对称性许可不证明材料存在自发极化或可逆铁电切换。','chirality-iucr'),
 ('mirror-fit','镜像与保向刚体配准',['det(R) = +1','det(R) = −1'],'chirality','镜像使用不正操作；与镜像比较重合时只允许正旋转、平移及同种原子的对应。',[('R','空间正交矩阵','无量纲')],'当前工具限有限点集；不直接决定周期晶体的绝对结构。','chirality-iucr'),
 ('pseudo-distance','伪对称操作的映射误差',['δ = max_i |R r_i − r_{p(i)}|'],'chirality','逐个候选操作计算指定原子对应下的最大位移；容差接受集合还需检查闭合。',[('δ','最大映射距离','模型长度'),('r_i','原子位置','模型长度'),('p(i)','候选操作给出的原子对应','索引')],'本页的固定母构型候选不是 spglib 的完整空间群搜索算法。','spglib-tol'),
 ('schmidt','Schmidt 概率与纠缠熵',['ρ_A = Tr_B |ψ⟩⟨ψ|','S = −Σ λ_i log(λ_i)'],'spt','纯态二分后的奇异值平方给出 Schmidt 概率；以自然对数计算纠缠熵。',[('λ_i','非负且归一化的 Schmidt 概率','无量纲'),('S','纠缠熵','nat'),('ρ_A','子系统 A 的约化密度矩阵','无量纲')],'简并基态须明确选定纯态；混合态的约化谱不能直接视为纯态纠缠。','pollmann'),
 ('projective','AKLT 虚拟射影表示',['U_x U_z = −U_z U_x'],'spt','虚拟半整数自旋的两个 π 旋转反对易，体现与物理整数自旋线性表示不同的射影相位。',[('U_x','虚拟空间 x 方向 π 旋转的相位约定代表','无量纲'),('U_z','虚拟空间 z 方向 π 旋转的相位约定代表','无量纲')],'本页解析矩阵仅用于 AKLT 固定点，不自动分类一般扰动链。','aklt')]
for id,title,symbols,mid,definition,variables,conditions,source in entries:
 m=next(m for m in modules if m['id']==mid)
 dictionary['entries'].append(dict(id='frontiers-'+id,title=title,symbols=symbols,aliases=[title],definition=definition,variables=[dict(symbol=s,meaning=d,unit=u) for s,d,u in variables],conventions='采用本页标注的主动操作、笛卡尔坐标和模型单位。',conditions=conditions,sources=['frontiers-'+source],links=[['对应课堂','#classroom/'+m['pathway']+'?module='+mid],['交互计算','#compute/'+m['route']]],contexts=[mid,'frontiers'],formulaAliases=symbols))
dictionary['frontiersRelease']=RELEASE
dictionary_path.write_text(json.dumps(dictionary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Projects:',len(projects),'dictionary entries:',len(dictionary['entries']))
