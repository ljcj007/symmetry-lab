import {progressionCatalogs,progressionLessons} from './lesson-progression-index.js?v=20261113-route1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(catalog,lessonId)=>catalog+'::'+lessonId;
const byKey=new Map(progressionLessons.map(item=>[key(item.catalog,item.lessonId),item]));
const catalogFor=new Map(progressionCatalogs.flatMap(item=>[[item.catalog,item],[item.section,item]]));
const copyLesson=item=>({...item,exerciseIds:[...(item.exerciseIds||[])]});
const ref=(catalog,lessonId)=>key(catalog,lessonId);
const pg=id=>ref('pointgroup-lessons',id),sc=id=>ref('symmetry-course-lessons',id),lie=id=>ref('lie-group-lessons',id);
const obs=id=>ref('material-observables',id),research=id=>ref('material-research',id),pathways=id=>ref('pathways-materials',id);
const bridges=id=>ref('bridges-materials',id),frontiers=id=>ref('frontiers-materials',id),connections=id=>ref('connections-materials',id);
const principles=id=>ref('principles-materials',id),quantum=id=>ref('quantum-materials',id),response=id=>ref('response-materials',id);

// Each edge names the operation carried into the destination. These optional
// recommendations are not a dependency inferred from catalogue/array order.
const edgeDefinitions=[
 [pg('group-basics'),pg('operations-notation'),'先用复合与逆操作辨认群元素，再读旋转、镜面和反演的符号。'],
 [pg('operations-notation'),pg('thirty-two'),'把具体旋转与镜面同晶体允许的旋转阶数联系起来。'],
 [pg('operations-notation'),pg('representations'),'先辨认几何操作，再看它怎样作用于列向量并成为矩阵。'],
 [pg('representations'),pg('character-reduction'),'先固定作用空间和矩阵，再用矩阵的迹计算不可约表示的出现次数。'],
 [pg('character-reduction'),pg('projection'),'先分清不可约表示的维数和出现次数，再投影出相应基函数。'],
 [pg('character-reduction'),pg('selection-rules'),'用特征标约化判断算符与初末态的直积是否含全对称分量。'],
 [pg('thirty-two'),sc('space-01'),'先分清点群类型，再加入周期平移、晶格和基元。'],
 [sc('space-01'),sc('space-02'),'在晶格和平移的基础上，用 Seitz 对表示并复合空间操作。'],
 [sc('space-02'),sc('space-03'),'用旋转与平移的复合规则理解螺旋轴和滑移面。'],
 [sc('space-02'),sc('space-04'),'重复作用空间操作，才能区分位点轨道与保持该点不动的稳定子。'],
 [sc('space-03'),sc('space-05'),'把实空间分数平移带入 Bloch 相位，检查动量相关的表示。'],
 [pg('representations'),sc('space-05'),'先理解表示矩阵与特征标，再加入波矢和小群的条件。'],
 [pg('representations'),lie('continuous-symmetry'),'把已知的离散矩阵操作同连续可调的旋转和相位作比较。'],
 [lie('continuous-symmetry'),lie('unitary-matrices'),'连续变化仍需保持态的范数；由此理解幺正条件。'],
 [lie('unitary-matrices'),lie('generators-commutators'),'利用保持范数的矩阵小变化，认识生成元及不同变化顺序的对易子。'],
 [lie('generators-commutators'),lie('su2-spinor'),'把一般生成元落实为 Pauli 矩阵和二分量旋量的旋转。'],
 [lie('su2-spinor'),lie('su2-double-cover'),'先跟踪同一旋量的旋转，再比较二分量态与三维向量的回到原状条件。'],
 [lie('generators-commutators'),lie('representations'),'先辨认群元素与生成元，再比较同一群在不同空间中的矩阵。'],
 [lie('representations'),lie('su2-coupling-representations'),'先分清表示维数与出现次数，再建立两自旋直积基和耦合基。'],
 [lie('su2-spinor'),lie('su2-coupling-representations'),'先认识单个自旋 1/2 的二分量空间，再构造两个自旋的四维空间。'],
 [lie('su2-coupling-representations'),lie('singlet-triplet-exchange'),'用直积分解得到的单重态与三重态分析交换能级。'],
 [pg('representations'),obs('mechanical-modes'),'把原子置换和三维位移的作用合在一起，构造机械表示。'],
 [obs('mechanical-modes'),obs('acoustic-optical'),'先核对总位移维数，再分出整体平移与相对运动。'],
 [obs('mechanical-modes'),pathways('scattering-chain'),'把有序原子位移空间带入质量和力常数的本征问题，区分对称分类与动力学频率。'],
 [obs('acoustic-optical'),pathways('scattering-chain'),'用整体平移和相对运动检查 Γ 点本征矢，再用质量平方根把归一化本征矢换成实际位移。'],
 [pathways('scattering-chain'),pathways('scattering-phase'),'把同一质量归一化复本征矢与 Bloch 规范带入原子散射振幅，先相干相加再取模平方。'],
 [pathways('scattering-phase'),pathways('scattering-temperature'),'先由质量、投影和基底相位求裸模式权重，再用热占据分别加权声子的创建与湮灭。'],
 [obs('mechanical-modes'),obs('ir-raman'),'用位移表示的不可约分量判断哪些振动可与光学算符耦合。'],
 [pg('selection-rules'),obs('ir-raman'),'把统一的矩阵元条件落实为极性向量与二次函数的选择。'],
 [pathways('hubbard-basis'),pathways('hubbard-superexchange'),'先固定占据数扇区与费米模式排序，再跟踪二聚体的虚跃迁。'],
 [pathways('hubbard-basis'),bridges('manybody-lehmann'),'先会对占据数基施加产生或湮灭算符，再区分跃迁能量与非零谱权重。'],
 [bridges('manybody-lehmann'),bridges('manybody-response'),'先理解初末态与矩阵元，再把单电子探针换成固定粒子数的自旋或电荷探针。'],
 [bridges('manybody-lehmann'),bridges('manybody-checks'),'把已经得到的添加与移除谱用于和规则、极限和简并平均核对。'],
 [lie('su2-coupling-representations'),bridges('density-exchange'),'把单重态和三重态换基同交换演化中的纠缠联系起来。'],
 [bridges('density-pure-mixed'),bridges('density-exchange'),'先区分整体纯态与约化混态，再解释交换生成的纠缠。'],
 [lie('su2-coupling-representations'),frontiers('spt-aklt-parent'),'用两个自旋 1/2 的单重态与对称三重态理解 AKLT 的虚拟自旋和物理自旋。'],
 [bridges('density-pure-mixed'),frontiers('spt-schmidt'),'先亲手做两自旋的部分迹，再从 Schmidt 概率构造约化态与纠缠熵。'],
 [frontiers('spt-aklt-parent'),frontiers('spt-schmidt'),'先说明 AKLT 量子态与边界，再区分物理自旋和 Schmidt 虚拟空间的群作用。'],
 [frontiers('spt-schmidt'),frontiers('spt-protection'),'先识别纠缠谱与射影表示，再沿扰动路径检查保护条件。'],
 [obs('acoustic-optical'),research('thermal-oscillator'),'先数清每个原胞的振动分支，再为正频率模式建立热占据与配分函数。'],
 [research('thermal-oscillator'),pathways('scattering-temperature'),'用归一化热分布得到的 Bose 占据区分创建声子的 n+1 与湮灭声子的 n。'],
 [research('thermal-oscillator'),bridges('polaron-hamiltonian'),'先认识量子振子的能量和占据，再把局域振子同电子放进同一个 Hilbert 空间。'],
 [research('thermal-oscillator'),ref('coupled-materials','qha-free-energy'),'先明确每原胞的声子自由能，再比较不同体积的自由能。'],
 [obs('neumann'),connections('reciprocity-onsager'),'先掌握空间操作对张量的约束，再单独选择热力学流与力以讨论互易。'],
 [sc('magnetic-01'),connections('reciprocity-onsager'),'先理解时间反演奇偶，再检查共轭状态变量的奇偶及磁场、磁化的同时反转。'],
 [obs('neumann'),connections('reciprocity-spatial-response'),'利用空间张量约束，比较同一磁畴内的允许分量。'],
 [connections('reciprocity-onsager'),connections('reciprocity-spatial-response'),'把互易所比较的反转磁态同空间点群约束分开，再合并两种条件。'],
 [connections('reciprocity-spatial-response'),connections('reciprocity-dissipation'),'在空间与互易条件明确后，检查对称耗散部分与反对称横向响应。'],
 // Reviewed transfers between action spaces; these are optional preparation,
 // not evidence that every destination has a complete operational derivation.
 [pg('representations'),principles('order-isotropy'),'先固定群作用的线性空间，再对指定序参量逐个检验 D(g)η=η，得到状态的稳定子群。'],
 [pg('projection'),principles('order-invariants'),'把全对称投影的群平均用于齐次多项式空间，区别零平均、重复轨道和与归一化系数。'],
 [principles('order-isotropy'),principles('order-field-convention'),'先分清一个状态的稳定子群与母群轨道，再加入固定外场，比较场群及其与状态稳定子的交集。'],
 [principles('order-invariants'),principles('order-field-convention'),'先明确 F₀ 的不变量及各向异性，再分开比较线性外场导致的实际劈裂和全部对象的一致被动换坐标。'],
 [sc('magnetic-01'),principles('exchange-bond-constraints'),'先用 det(R)R 变换轴向磁矩，再单独跟踪同一空间操作是否交换有向键的两个端点。'],
 [obs('neumann'),principles('exchange-bond-constraints'),'沿用逐生成元求张量公共线性约束的方法；交换张量还须使用轴向自旋并在端点互换时加入转置。'],
 [principles('exchange-bond-constraints'),principles('exchange-classical-quantum'),'先得到共同约束后的同一交换矩阵，再分别代入单位经典向量和 S=σ/2 的量子算符，比较不同归一化下的能量。'],
 [lie('singlet-triplet-exchange'),principles('exchange-classical-quantum'),'把 2⊗2=3⊕1 和 −3J/4、J/4 的能级基准带入一般允许交换矩阵，检查各向异性或 DMI 改变哪些结论。'],
 [principles('exchange-bond-constraints'),principles('exchange-conventions'),'先固定有向键和轴向自旋约束，再辨别 J→Jᵀ、D→−D 是端点约定变化还是物理约束变化。'],
 [principles('exchange-classical-quantum'),principles('exchange-conventions'),'用已定义的量子能级和经典最低能量核对被动转轴与端点重标记，避免以矩阵分量外观判断相互作用改变。'],
 [lie('generators-commutators'),principles('conservation-generators'),'把 U(θ)=exp(−iθQ) 的无穷小生成元带入时间演化，计算完整 [H/ℏ,Q] 而非只检查一次有限角度旋转。'],
 [principles('exchange-classical-quantum'),principles('conservation-generators'),'先用无 DMI 的双自旋 Hamiltonian 和总自旋算符建立矩阵，再检查连续旋转守恒；能量参数须先除以 ℏ，不能把 meV 数值直接当 rad/ns。'],
 [principles('conservation-generators'),principles('conservation-open'),'把闭系统的完整对易子判据扩展到 Hamiltonian 与所有浴通道的伴随作用之和，再判断是否对全部初态守恒。'],
 [bridges('density-pure-mixed'),principles('conservation-open'),'先分清密度矩阵与最大混合态，再解释 I/d 的平坦轨迹为什么不能替代对全部初态成立的算符守恒条件。'],
 [principles('conservation-generators'),principles('conservation-protection'),'先用三个旋转生成元识别 SU(2) 多重态，再分别检查物理反幺正 T 的平方及其与 H 的关系，辨认 Kramers 保护。'],
 [lie('singlet-triplet-exchange'),principles('conservation-protection'),'把双自旋的单重态和三重态作为比较基准：三重态可由共同 SU(2) 解释，整体 T²=+I 本身不强制 Kramers 配对。'],
 [sc('space-01'),frontiers('layer-periodicity'),'先分清晶格平移与原子基元，再把三个周期方向改成两个，并保留薄层法向的有限边界。'],
 [sc('space-02'),frontiers('layer-periodicity'),'把 Seitz 复合规则用于薄层操作，只在两条面内晶格方向识别平移等价。'],
 [frontiers('layer-periodicity'),frontiers('layer-termination'),'先按面内周期与有限法向核对原子双射，再用元素和表面标签检验交换两侧的操作。'],
 [frontiers('layer-termination'),frontiers('layer-registry'),'固定两侧的化学标签与有限边界，再改变相对堆垛位置，逐原子检查界面共同操作。'],
 [pg('operations-notation'),frontiers('chiral-mirror'),'先用行列式区分保向与反常空间操作，再限制镜像配准只能使用保向刚体旋转。'],
 [sc('space-01'),frontiers('chiral-mirror'),'先分清手性结构、Sohncke 类型与对映群型，再把有限点集镜像检验放回正确的晶体层次。'],
 [obs('neumann'),frontiers('chiral-polarity'),'把所有空间操作共同约束物性的思想用于一阶极向量，联立 (R−I)P=0 求允许方向。'],
 [frontiers('chiral-mirror'),frontiers('chiral-polarity'),'先独立检验镜像能否保向重合，再比较同一操作集合是否保留非零极向量，区分手性与极性。'],
 [frontiers('chiral-mirror'),frontiers('chiral-tolerance'),'先声明源点集、允许配准和同标签对应，再给构型加位移，以实际残差检验近似操作。'],
 [pg('group-basics'),frontiers('chiral-tolerance'),'用群的封闭性检查通过距离阈值的候选集合，避免把逐项近似通过直接当成一个严格群。'],
 [lie('unitary-matrices'),quantum('geometry-rays'),'先计算复振幅的共轭转置、归一化与内积，再用投影区分整体相位和可区分的态变化。'],
 [lie('su2-spinor'),quantum('geometry-rays'),'把 Pauli 矩阵、二分量归一化态和不保留整体相位的 Bloch 表示带入两带轨道模型；不额外引入物理自旋简并。'],
 [quantum('geometry-rays'),quantum('geometry-topology'),'先用相邻态重叠的模刻画距离，再把同一重叠的相位接成有方向、包含边界链接的闭环。'],
 [quantum('geometry-topology'),quantum('geometry-diagnostics'),'理解全区闭环相位求和后，分别检查孤立带、链重叠、相位分支和加密网格，而不只检查整数。'],
 [quantum('geometry-diagnostics'),response('hall-occupation'),'先核对 QWZ 下带的曲率取向、全局能隙与积分收敛，再为响应模型明确以 eV 计的能标，不直接沿用无单位数值，然后加入两带费米占据与电子电荷符号。'],
 [response('hall-occupation'),response('hall-entropy'),'保持能带曲率和电流约定不变，把占据权重换成费米熵权重，比较霍尔与横向热电的抵消条件。'],
 [response('hall-entropy'),response('hall-diagnostics'),'先分清占据加权片电导与熵加权输运系数，再判断开路信号所需张量及每个扫描点的数值检查。'],
 [quantum('geometry-diagnostics'),response('hall-diagnostics'),'把离散 FHS 整数与普通曲率求积的不同误差检查带入响应积分；分别比较 N→2N−1 与 N→2N 网格。'],
 // Phonon input, mode spaces and equilibrium response tensors.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("material-observables","mechanical-modes"),ref("structure-dynamics","soft-modes"),"先固定原子顺序与 3N 维置换—位移作用，再加入质量和力常数，区分对称适配基与质量加权动力学本征矢。"],
 [ref("structure-dynamics","soft-modes"),ref("structure-dynamics","phonopy-files"),"先用 e_j/√m_j 和有限 q 的复相位还原位移，再核对文件是否提供原胞、质量和 3N 分支；频率单位确认不会自动换算原数字。"],
 [ref("structure-dynamics","phonopy-files"),ref("material-research","mode-audit"),"先核对文件的原胞、单位和本征矢字段，再检查原子顺序、配套结构与声学平移；同一化学式或文件摘要不能独自证明模式与结构对应。"],
 [ref("material-research","mode-audit"),ref("material-research","mode-subspaces"),"先确认有序结构、质量与本征矢一致，再对完整频率簇检验子空间封闭；有限 q 或未覆盖点群不能直接套用 Γ 点标签。"],
 [ref("pointgroup-lessons","character-reduction"),ref("material-research","mode-subspaces"),"沿用同一操作和类权重下的字符内积，约化已经封闭的模式子空间，分清频率簇维数、不可约维数与重数。"],
 [ref("material-research","mode-subspaces"),ref("material-research","mode-freezing"),"先分清整个子空间的标签与所选基矢，再固定复模式、相位和长度幅度，检查 n_i q_i 为整数；冻结快照不是弛豫后的稳定结构。"],
 [ref("material-research","thermal-oscillator"),ref("material-research","thermal-data"),"先按 hν（ν 为普通频率）计算单模统计量，再用完整网格权重或规范化总 DOS 累加，并保留每原胞或输入计算胞的计量口径。"],
 [ref("material-research","thermal-oscillator"),ref("material-research","thermal-limits"),"先数清整个原胞的 3n 个模式，再比较 Einstein 的指数抑制、三维 Debye 的 T³ 和共同的 3nR 高温极限；不把 Cv 当作 Cp 或热导率。"],
 [ref("material-observables","ir-raman"),ref("material-observables","polarization"),"先用极向量和对称二次函数判定允许通道，再收缩具体 Raman 张量与两端偏振；对称允许不保证某一几何有强度，示意峰位也不是材料预测。"],
 [ref("material-observables","neumann"),ref("material-observables","piezoelectricity"),"先逐 Cartesian 指标求公共张量约束，再对 P_i=e_ijk ε_jk 加入 j、k 交换对称；完整指标求和与工程剪切 γ=2ε 的因子二须一致，e 不能直接换成 d。"],
 [ref("symmetry-course-lessons","magnetic-01"),ref("material-observables","magnetoelectricity"),"先分别变换时间偶的极向量与时间奇的轴向量，再对 P=αH 推导 τdet(R) 的约束；i、1′ 各自禁止静态 α，而仅有 i′ 不限制其九个分量。"],
 [ref("material-observables","neumann"),ref("material-observables","magnetoelectricity"),"沿用逐生成元求公共不变子空间的方法，但先明确响应两端的极性、轴性与时间奇偶；一般磁电 α 有九个未知量，不能照搬介电张量的指标对称性。"],
 // Bulk transport, open devices, pairing and electron–hole charge ledgers.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("quantum-materials","transport-window"),ref("quantum-materials","transport-seebeck"),"先以完整 BZ 的速度平方和费米导数确定 L₀，再加 E−μ 权重构造 L₁、L₂；导入能量用 eV、速度用 m/s，带内 Boltzmann 矩不是器件透射。"],
 [ref("connections-materials","reciprocity-onsager"),ref("quantum-materials","transport-seebeck"),"先声明熵共轭流与力、电子电荷和热流约定，再施加开路条件理解 κ 的回流扣除；无量纲 Onsager 演示系数不能直接作为 SI 输运能量矩。"],
 [ref("quantum-materials","transport-seebeck"),ref("quantum-materials","transport-validation"),"先判断 τ 在哪些比值中抵消，再核对自旋计数、费米窗口网格及二维片系数 S、W/K；三维体系数另用 S/m、W/(m K)，未定义值不能填零。"],
 [ref("response-materials","device-open"),ref("response-materials","device-scattering"),"先固定推迟引线格林函数、接触自能和带内通道，再用同一链的势垒或弱接触核验透射；能量用 eV，人工吸收 η 不是 Boltzmann 的弛豫时间 τ。"],
 [ref("response-materials","device-scattering"),ref("response-materials","device-ssh"),"先用断开接触时仍有 LDOS 而 T=0 的反例区分局域谱与传输，再固定 SSH 终止和接触，逐键核对注入通量及 η 损失。"],
 [ref("lie-group-lessons","singlet-triplet-exchange"),ref("electronic-materials","pairing-exchange"),"把两自旋的反对称单态落实为 iσy，再连同 k→−k 检验 Δ(k)=−Δᵀ(−k)；单轨道单态要求偶动量函数，但二聚体交换能不提供配对吸引或 Tc。"],
 [ref("electronic-materials","pairing-exchange"),ref("electronic-materials","pairing-nodes"),"先固定 D₄h 基函数和四维 Nambu 空间，再联立 Δ(k)=0 与 ξ(k)=0 判断节点；本模型共用任意能量单位，配对标签不单独决定全能隙。"],
 [ref("electronic-materials","pairing-exchange"),ref("electronic-materials","pairing-kitaev"),"先掌握完整费米交换条件，再从单态偶动量配对转到单个无自旋轨道的奇动量键配对；区分 2×2 体 BdG 矩阵与 2N 维开放链，不额外复制自旋。"],
 [ref("response-materials","device-open"),ref("spectroscopy-materials","andreev-charge"),"先掌握正常引线的推迟自能和入射通道，再扩展到电子—空穴块，分账正常反射、Andreev 反射和准粒子透射；亚隙透射为零不等于电荷电导为零。"],
 [ref("electronic-materials","pairing-exchange"),ref("spectroscopy-materials","andreev-charge"),"先分清单态 BdG 的 Nambu 冗余，再转到 NS 的 (e↑,h↓) 块与电荷通量；须明确把任意能标定为 eV，并重新核对粒子—空穴矩阵，不能重复计入自旋。"],
 [ref("spectroscopy-materials","andreev-charge"),ref("spectroscopy-materials","andreev-barriers"),"先建立 1−Ree+Rhe 的电荷账本，再仅令同一器件 Δ=0 得到正常参考；固定接触和 η 后检验加倍条件，有限能量谱不等于自洽有限偏压 I(V)。"],
 [ref("spectroscopy-materials","andreev-barriers"),ref("spectroscopy-materials","andreev-checks"),"先固定单变量正常参考，再配对 E 与 −E 的电子/空穴入射并计入 η 吸收，核对准粒子通量；阈值空点不能填零，η 与能量步长须分别收敛。"],
 // Site-to-Bloch representations, finite-q patterns and nonsymmorphic bands.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("symmetry-course-lessons","space-04"),ref("pathways-materials","bandrep-real-space"),"先按同一原胞平移求实空间位点轨道与稳定子，再附加局域轨道构造 Bloch 纤维；位点数乘局域维数不是机械表示的 3N 计数，也不自动构成 EBR。"],
 [ref("pathways-materials","bandrep-real-space"),ref("pathways-materials","bandrep-bloch-phase"),"保留同一组有序位点和局域基，把折回原胞的整格余量放入同一周期规范的 Bloch 矩阵；若旋转后的 k 不等价原 k，就不是同一纤维内的对称标签。"],
 [ref("pathways-materials","bandrep-bloch-phase"),ref("pathways-materials","bandrep-decomposition"),"先保存 Seitz 代表元相乘的整格缺陷和 k 相位，再用同一因子系统的小表示字符约化；边界射影二维性不必来自自旋或时间反演。"],
 [ref("pathways-materials","bandrep-decomposition"),ref("material-research","band-restriction"),"先会分解固定 k 的小群表示，再把端点表示限制到线上共同操作；保持设置、规范和因子系统一致，不把三维轨道数值原样复制到二维 C4v 模型。"],
 [ref("material-research","band-restriction"),ref("material-research","band-crossing"),"先确定线上实际保留的镜面和分支本征值，再检验禁止混合与破缺开隙；不同标签允许交叉但不强迫能量相遇，母相标签不能沿用到破缺后的混合态。"],
 [ref("material-research","band-spin"),ref("construction-materials","nonsymmorphic-partner"),"先分清双值镜面平方、时间反演平方和 TRIM，再加入半平移的端点配对；一般 k 的伙伴在 −k，单值端点配对不能直接称为自旋 Kramers 简并。"],
 [ref("pathways-materials","bandrep-bloch-phase"),ref("construction-materials","nonsymmorphic-bloch"),"先用位点置换和整格余量构造无自旋 Bloch 矩阵，再加入自旋提升；群4沿 z 用分数 k_z，线模型沿 x 用弧度 k_x=2πf_x，两种相位不能混用。"],
 [ref("construction-materials","nonsymmorphic-bloch"),ref("construction-materials","nonsymmorphic-partner"),"先核实半平移、自旋平方及动量不变条件，再在简并能量子空间内求操作标签和端点伙伴；操作本征值曲线不是能量色散。"],
 [ref("construction-materials","nonsymmorphic-partner"),ref("construction-materials","nonsymmorphic-breaking"),"先列出伙伴交换的空间与反幺正条件，再一次删除一个约束检查全线能隙和端点；保留 Kramers 端点不保证中间两带连接，全线直接隙也不是三维绝缘隙。"],
 [ref("symmetry-course-lessons","space-05"),ref("construction-materials","wavevector-star"),"先把保持单个 q 的小群同改变星臂的操作分开，再用 ±q 共轭配对构造实模式；本实验是有限方格上的标量场，不是一般三维原子位移表示。"],
 [ref("construction-materials","wavevector-star"),ref("construction-materials","wavevector-cell"),"先声明完整星及真正非零的 Fourier 分量，再求当前图案的稳定子与平移子群；相容矩形超胞不必是最小斜胞，面积不等于平移指数。"],
 [ref("construction-materials","wavevector-star"),ref("construction-materials","wavevector-satellites"),"先按同一 ±q 和 Fourier 约定把余弦幅度转成复系数，再比较相位和强度；A²/4 不适用于重复计算的自共轭臂，标量强度也不是实验衍射强度。"],
 // SU(3) weights, CG copies and triple/four-factor recoupling.
 // Optional transfers; a link does not certify a complete derivation or material calculation.
 [ref("lie-group-lessons","generators-commutators"),ref("lie-group-lessons","su3-generators"),"先固定厄米生成元、矩阵指数和对易子中的 i，再用 T_a=λ_a/2 构造三能级 SU(3)；界面角度先由度转弧度，八个生成元不等于八个态振幅。"],
 [ref("lie-group-lessons","su3-generators"),ref("lie-group-lessons","su3-weights"),"先明确三分量态和 T3、T8 的对角矩阵，再画共同本征值与升算符连接的权差；叠加态的权平均可以不动，但相对相位仍会改变。"],
 [ref("lie-group-lessons","su3-weights"),ref("lie-group-lessons","su3-dynkin-representations"),"先分清权、根与权平均，再用最高权 (p,q) 标记不可约类型并保留坐标重数；GT 的整数 H1、H2 须换成 T3、T8，零权重数不同于外重数。"],
 [ref("lie-group-lessons","su3-dynkin-representations"),ref("lie-group-lessons","su3-cg-change-basis"),"先数清类型、维数、权与外重数，再把 (R,α,μ) 落实为 CG 矩阵的列；列是耦合态的乘积展开，乘积→耦合用 C†，不是概率表相乘。"],
 [ref("lie-group-lessons","su3-cg-change-basis"),ref("lie-group-lessons","su3-cg-fundamental"),"先固定列展开、复共轭和 GT 约定，再从交换对称与迹不变构造 3⊗3、3⊗3̄；反基本基底 (s̄,−d̄,ū) 的相位须连同生成元一起转换。"],
 [ref("lie-group-lessons","su3-cg-fundamental"),ref("lie-group-lessons","su3-cg-multiplicity"),"先在 3⊗3 用交换算符区分对称与反对称通道，再处理 8⊗8 的两份等价八重态；旋转副本基底要同步变换态与交换算符，不能混同内部零权态。"],
 [ref("lie-group-lessons","su3-cg-higher-representations"),ref("lie-group-lessons","su3-cg-exact-radicals"),"先用 Dynkin 加框分清 10⊗3 的 15′ 与 15，再在同权块用降算符和正交性构造根式；精确 CG 限 N≤81，数值限 N≤256，不从小数猜根式。"],
 [ref("lie-group-lessons","su3-cg-multiplicity"),ref("lie-group-lessons","su3-racah-coupling-paths"),"先掌握二元 CG 的副本标签，再分别保留两个顶点的外重数来构造三体路径；Racah 大小由最终表示重数决定，三重接口仅允许 p+q≤2 的外部因子。"],
 [ref("lie-group-lessons","su3-racah-coupling-paths"),ref("lie-group-lessons","su3-racah-exact-sixj"),"先从同一最终内部态的嵌入求 F=V_R†V_L，再手算三个 3 的精确重叠；维数缩约 S=F/√(dE dF) 满足加权正交，用来换态的仍是 F。"],
 [ref("lie-group-lessons","su3-racah-coupling-paths"),ref("lie-group-lessons","su3-ninej-paired-trees"),"先按二元顶点枚举三体路径，再扩展到四体的三个顶点副本，并把右树 ACBD 重排为 ABCD 后求重叠；这一步不自动附加费米交换负号。"],
 [ref("lie-group-lessons","su3-ninej-paired-trees"),ref("lie-group-lessons","su3-ninej-exact-normalization"),"先统一因子次序和所有副本标签，再手算四个 3 的 3×3 R；9j 缩约权重是两叶支维数的乘积，S 满足带权正交，不能代替 R 乘态。"],
 [ref("lie-group-lessons","su3-dynkin-representations"),ref("lie-group-lessons","su3-ninej-high-input-labels"),"先按 (p,q)、共轭和 Casimir 分清 15 与 15′，再分别记四个输入、最终根与各顶点副本；四体总 N≤4096，不等于允许任意四个高维因子。"],
 // Spin, magnetic/color structure and structural-response preparation.
 // These reviewed links do not implement the separately identified operation panels.
 [ref("pointgroup-lessons","representations"),ref("pointgroup-lessons","from-point-to-space"),"先在同一基底中检查表示乘法与特征标，再分清晶体点群、位点稳定子和保持指定波矢的小群；一般 k 不能沿用完整点群表。"],
 [ref("pointgroup-lessons","from-point-to-space"),ref("symmetry-course-lessons","space-06"),"先保留非 Γ 点的小群与平移相位，再同步变换基底、原点和倒坐标；BC/Bilbao 标签须对齐操作与字符，原输入 k 不能原样复制，普通结构转换也不处理磁结构。"],
 [ref("pointgroup-lessons","from-point-to-space"),ref("symmetry-course-lessons","double-01"),"先分清何时需要半整数自旋的双值表示，再用旋量振幅、概率和 Bloch 向量分别检验 2π 与 4π 回转；经典箭头无法显示整体负号。"],
 [ref("symmetry-course-lessons","double-01"),ref("symmetry-course-lessons","double-02"),"先算出自旋半周矩阵平方为 −I，再把这个 2π 负号保留为中心元 Ē；用 C₂ 提升的四元素乘法检验双群为何不是机械复制旧表。"],
 [ref("symmetry-course-lessons","double-02"),ref("symmetry-course-lessons","double-03"),"先用 Ē 的乘法关系理解中心元，再按 D(Ē)=±I 区分单值与双值扇区；轨道乘自旋后的重数和表示维数不能直接当作 SOC 能量简并。"],
 [ref("pointgroup-lessons","character-reduction"),ref("symmetry-course-lessons","double-03"),"先会对字符作共轭加权内积并检验重数与总维数，再在完整四元素 C₄（C₂ 双群）上逐元素约化 p⊗spin；三份一维表示不是三重受保护能级。"],
 [ref("symmetry-course-lessons","double-02"),ref("symmetry-course-lessons","double-05"),"先由一个 C₂ 的提升确定 g²=Ē，再把三个正交二重轴共同提升并比较 XY 与 YX；保留中心负号后才能看见 Q₈ 的非交换性。"],
 [ref("symmetry-course-lessons","double-02"),ref("symmetry-course-lessons","double-06"),"先保留两个半周自旋旋转留下的 Ē，再与螺旋平方的整胞平移相乘；中心负号与 Bloch 相位来源不同。当前演示只提升正旋转，反演与镜面须另定提升约定。"],
 [ref("symmetry-course-lessons","space-05"),ref("symmetry-course-lessons","double-06"),"先在螺旋轴保持的 k 子空间保留单值 Bloch 相位，再加入自旋中心负号，对照 Γ 与轴向区边界的双值本征值；k_z 用倒格分数，本征值关系本身不证明能量简并。"],
 [ref("pointgroup-lessons","representations"),ref("symmetry-course-lessons","magnetic-04"),"先掌握普通表示在同一基底下的乘法和相似变换，再显式加入 K，推导反幺正乘法与 S⁻¹US* 换基；反幺正矩阵部分的迹不能当普通特征标约化。"],
 [ref("symmetry-course-lessons","magnetic-04"),ref("symmetry-course-lessons","double-04"),"先用 iK 算出反幺正平方必须是 UU*，再对自旋 1/2 的 Θ 验证 −I 与正交伙伴；同能量和同一 k 配对还须分别检查 Hamiltonian 对称及动量返回。"],
 [ref("symmetry-course-lessons","magnetic-01"),ref("symmetry-course-lessons","magnetic-02"),"先逐位点同时匹配化学位置和时间奇轴向磁矩，再用实际保留的纯 Θ、反平移和酉平移晶格区分四类磁空间群；零净磁矩不能替代操作检查。"],
 [ref("symmetry-course-lessons","magnetic-02"),ref("symmetry-course-lessons","magnetic-03"),"先区分IV类的反平移与酉磁平移，再观察忘去平移后 ΘTτ 如何只剩 Θ；灰磁点群对均匀物性的约束不能恢复局域交错序或动量相位。"],
 [ref("symmetry-course-lessons","space-06"),ref("symmetry-course-lessons","magnetic-03"),"先用明确的 P、p 同时变换操作、原点和倒坐标，再阅读BNS/OG标识符；编号对应记录不等于已经给出结构变换，普通BC/Bilbao标签也不是磁共表示标签。"],
 [ref("symmetry-course-lessons","magnetic-02"),ref("symmetry-course-lessons","magnetic-04"),"先识别指标二的酉子群 H 与反幺正陪集 aH，再研究 a 如何联结H表示及其伙伴，并用 a² 和复共轭检验扩维；共表示不能由带撇字符行直接拼出。"],
 [ref("symmetry-course-lessons","double-04"),ref("symmetry-course-lessons","magnetic-05"),"先分开检查反幺正平方、Hamiltonian 对称与同一 k 返回，再将 Θ 换为 ΘTτ；一维沿 z 的磁倒格分数模型不能代替三维横向反例，平方为 −I 仍不能省略动量条件。"],
 [ref("symmetry-course-lessons","magnetic-02"),ref("symmetry-course-lessons","magnetic-05"),"先由保持磁序的酉平移确定磁晶胞，并确认 τ不是酉平移而2τ是，再在这个磁倒格坐标中计算 ΘTτ 的平方；化学晶胞与磁晶胞的k数值不能直接混用。"],
 [ref("symmetry-course-lessons","space-05"),ref("symmetry-course-lessons","magnetic-05"),"先把真实晶格平移保留为 exp(−2πik·L)，再为反平移平方重新选用酉磁晶格的2τ；Bloch相位与反幺正动量作用要分别检查，不能从平方相位单独推出配对。"],
 [ref("symmetry-course-lessons","color-01"),ref("symmetry-course-lessons","color-02"),"先用统一颜色置换求保色核与像，再把同一方法用于三维周期平移；三次循环后留下整胞平移，只有模保色平移核的商群才是三元素。"],
 [ref("symmetry-course-lessons","color-01"),ref("symmetry-course-lessons","color-03"),"先掌握颜色置换同态与保色核，再换用允许非平凡二色交换的母群求指标二的核；不能把 C₃ 生成元直接改成二色交换，线性换色也不能替代含复共轭的时间反演。"],
 [ref("symmetry-course-lessons","magnetic-01"),ref("symmetry-course-lessons","spin-01"),"先逐位点检查磁空间操作的轴向磁矩变换，再放松SOC锁定、把磁矩旋转U与位置旋转R分开记录；一个磁畴的组合稳定子不是Hamiltonian全部全局自旋旋转。"],
 [ref("symmetry-course-lessons","spin-01"),ref("symmetry-course-lessons","spin-02"),"先分别追踪位置的R作用与磁矩的U作用并逐站点匹配，再加入Seitz平移复合；去掉平移时保留自旋因子，完整整胞平移也不能因画面折回而删掉。"],
 [ref("symmetry-course-lessons","spin-01"),ref("symmetry-course-lessons","spin-03"),"先把位置搬运与自旋旋转分开检验，再固定所有站点求 Umi=mi；用磁矩张成空间的秩区分共线 SO(2) 与非共线幺正稳定子，当前 SO(3) 输出不包含 O(3) 的反幺正部分。"],
 [ref("symmetry-course-lessons","spin-01"),ref("symmetry-course-lessons","spin-04"),"先逐站点验证[C₂x∥C₂z]保持两站点磁序，再对同一个U和R分别检查不带与带时间反演的锁定条件；图案重合不能替代操作锁定或Hamiltonian对称检验。"],
 [ref("symmetry-course-lessons","magnetic-01"),ref("symmetry-course-lessons","spin-04"),"先在正交笛卡尔基底中逐位点变换时间奇轴向磁矩，再写成 U=(−1)^εdet(Rc)Rc 的锁定条件；同时匹配同种原子与目标磁矩，并保留时间反演分支及 Hamiltonian 检验。"],
 [ref("structure-dynamics","soft-modes"),ref("structure-dynamics","imaginary-modes"),"先把动力学矩阵本征值认作 ω²，并由质量加权本征矢还原位移，再判断负本征值；Phonopy 负显示值编码虚频，冻结有限 q 模式仍需质量、复相位与相容超胞。"],
 [ref("structure-dynamics","landau-stability"),ref("structure-dynamics","imaginary-modes"),"先区分驻点、曲率与全局最低自由能，再把虚频解释为指定参考态的局部负曲率线索；无量纲 Landau Q 不是已归一化的声子坐标，单个负模不给出最终相或相变温度。"],
 [ref("structure-dynamics","structure-factor"),ref("structure-dynamics","centering-basis"),"先在同一常规胞中按复振幅相加再求模平方，再分解格心和化学基底因子；改变恒定实元素权重，区分格心强制消光、同种基底零与当前模型的偶然抵消。"],
 [ref("structure-dynamics","structure-factor"),ref("structure-dynamics","screw-glide"),"先用正指数散射振幅追踪位置相位，再同时检查 Rᵀh=h 与半平移相位；2₁(z) 的 00l、法向 x 的 c 滑移的 0kl 条件不能扩大到所有 hkl，未被禁止也不保证振幅非零。"],
 [ref("coupled-materials","distortion-reference"),ref("coupled-materials","distortion-projection"),"先建立相容晶胞、同种原子一一对应和周期最短位移，并分开均匀应变与内位移，再用母相笛卡尔度量投影；模式为普通欧氏归一化，幅度用 Å，不是质量加权声子坐标。"],
 [ref("coupled-materials","distortion-projection"),ref("coupled-materials","landau-coupling"),"先声明几何模式的基底、归一化和重构残差，再另建双序参量竞争自由能；几何幅度用 Å，Landau Q 是独立无量纲量，低残差既不拟合能量系数也不证明模式是标准不可约基。"],
 [ref("structure-dynamics","landau-stability"),ref("coupled-materials","landau-coupling"),"先检查一变量自由能的有界性、全部驻点、曲率和能量，再推广到双变量 Hessian、轴支、混合支与连续简并；须保留各幂次系数的归一化，混合驻点或图中低点不等于全局稳定。"],
 [ref("coupled-materials","qha-free-energy"),ref("coupled-materials","qha-response"),"先在固定静水压力下对同一输入胞的 E+Fvib+pV 求有效内点极小，再对最小化后的 G、V 求 αV 与 Cp；能量用 eV/输入胞、体积用 Å³，固定体积 Cv 不能直接改名 Cp。"],
 [ref("coupled-materials","qha-response"),ref("coupled-materials","qha-audit"),"先理解响应依赖自由能拟合及一、二阶微分，再检查体积边界、残差、窗口、温度邻点与分支跳变；首末温度或无效极小缺少的 αV、Cp 不能填零，也不能跨相连续求导。"],
 [ref("structure-dynamics","imaginary-modes"),ref("coupled-materials","qha-audit"),"先辨认谐性负曲率、数值声学伪虚频与非谐边界，再核查各体积是否属于同一稳定相的准谐路径；拟合良好的总自由能表没有逐模式信息，不能反推无虚频或证明动力学稳定。"],
 [ref("structure-dynamics","landau-stability"),ref("pathways-materials","wall-gradient"),"先识别均匀双阱的两个等价极小，再加入梯度代价、固定两端和中心约束建立标量壁；须重写 β(φ²−v²)²/4 的系数归一化，约化壁能不能直接当作 BaTiO₃ 材料参数。"],
 [ref("structure-dynamics","polar-domains"),ref("pathways-materials","wall-gradient"),"先用稳定子区分等价方向与单畴操作，再选一对 180° 畴建立标量界面；48/8=6 只数取向畴，不给壁宽，也不能把这一对标量 ±v 壁当作完整三维六畴网络。"],
 [ref("pathways-materials","wall-gradient"),ref("pathways-materials","wall-energy"),"先由局域势与梯度竞争求 tanh 尺度和固定边界，再积分额外壁能；分开驻点残差、同区间 N 与 2N−1 网格误差，以及解除中心约束后的 Hessian，宽壁也不必能量更低。"],
 [ref("pathways-materials","wall-gradient"),ref("pathways-materials","wall-localized"),"先理解空间反号的序参量，再把概念转到独立、开放、无自旋 SSH 键二聚化界面；SSH 能量用 eV、宽度用键间距，不能照搬约化 φ⁴ 壁宽，近零能还须用子空间投影区分界面与端态。"],
 [ref("principles-materials","conservation-generators"),ref("coupled-materials","magnon-ferromagnet"),"先用完整 Hamiltonian 的生成元区分 SU(2) 与 XXZ/纵场保留的 U(1)，再解释均匀转动零能与开隙；守恒课用 H/ℏ，磁振子 J、h 用 meV 且 h=gμBB 非 Tesla，保留 U(1) 不自动保证该参考态有零模。"],
 [ref("coupled-materials","magnon-ferromagnet"),ref("coupled-materials","magnon-antiferromagnet"),"先固定 J>0、交换正负号、无量纲 S 与 XXZ 约定，再引入反向 A/B 子晶格及相反圆偏振；q=qa/π，但 FM 磁胞 a 与 AFM 磁胞 2a 的区间不同，非厄米动态矩阵不是普通厄米能带。"],
 [ref("coupled-materials","magnon-antiferromagnet"),ref("coupled-materials","magnon-stability"),"先识别两子晶格偏振与 ±h 分裂，再比较低 q、零模、负能支和竞争经典态；实频不保证能量稳定，越过 spin-flop 阈值后旧 Néel 背景的有符号谱也不是新倾斜基态的激发谱。"],
 // Reviewed Lie, spectroscopy/orbital and many-body/construction transfers.
 // Navigation does not copy inputs, infer a solver result or establish mastery.
 [ref("lie-group-lessons","su2-spinor"),ref("lie-group-lessons","rabi-qubit-control"),"先由 Pauli 矩阵求出绕任意轴的旋量旋转，再把恒定有效场写成旋转轴 n 与角度 Ωeff t，分开预测失谐下的振荡速度和最大翻转概率。"],
 [ref("lie-group-lessons","su3-dynkin-representations"),ref("lie-group-lessons","su3-flavor-color"),"先用最高权与共轭标签分清 3 和 3̄，再把 3⊗3̄ 的迹与无迹分解用于味或色指标，说明同一表示计数为什么具有不同物理解释。"],
 [ref("lie-group-lessons","su3-flavor-color"),ref("lie-group-lessons","su3-octet-selection"),"先由夸克—反夸克的无迹部分识别八重态，再研究 8⊗8 中两个等价副本和算符选择通道；表示允许条件不提供动力学振幅。"],
 [ref("lie-group-lessons","su3-octet-selection"),ref("lie-group-lessons","su3-cg-multiplicity"),"先在 8⊗8 的分解中数清两份八重态，再用逐态 CG 列和交换算符选择副本基底，区分允许通道数、内部同权重数和具体复振幅。"],
 [ref("lie-group-lessons","su3-cg-exact-radicals"),ref("lie-group-lessons","su3-cg-exact-complex-states"),"先用根式构造和往返抵消理解精确 CG，再保留态的实部、虚部和相对相位，核对 C†a、Cb 以及按原范数归一化的概率。"],
 [ref("lie-group-lessons","unitary-matrices"),ref("lie-group-lessons","su3-cg-exact-complex-states"),"先用共轭转置和内积说明总范数守恒，再检查复振幅换基中各通道概率可以改变；相同概率不代表相同的态坐标。"],
 [ref("lie-group-lessons","su3-racah-exact-sixj"),ref("lie-group-lessons","su3-racah-complex-observables"),"先由两套路径的精确重叠得到 F 并分清维数约化 6j 表 S，再用 F 传递复相位和两体算符，核对一致换基后的期望值。"],
 [ref("lie-group-lessons","su3-cg-exact-complex-states"),ref("lie-group-lessons","su3-racah-complex-observables"),"先在二元 CG 中完成带复相位的精确往返，再把同一内积与共轭换基规律用于固定最终表示的路径空间，并同步变换两体算符。"],
 [ref("lie-group-lessons","su3-ninej-exact-normalization"),ref("lie-group-lessons","su3-ninej-color-complex"),"先分清四体酉重叠 R 与带权 9j 表 S，再把完整复振幅和 A–C 两体算符放到同一套配对路径中，核对反向恢复和期望值。"],
 [ref("lie-group-lessons","su3-flavor-color"),ref("lie-group-lessons","su3-ninej-color-complex"),"先用 3⊗3̄ 的迹分解区分颜色单态与八重态，再比较四因子的介子式和双夸克式配对，保留根顶点副本并分清颜色坐标重组与完整多体动力学。"],
 [ref("lie-group-lessons","su3-ninej-paired-trees"),ref("lie-group-lessons","su3-ninej-four-octets-channels"),"先按三个二元顶点保留完整副本，再把四个八重态的 4096 维总空间分到指定最终类型，分清同型维数与 8、32、33 维路径空间。"],
 [ref("lie-group-lessons","su3-ninej-exact-normalization"),ref("lie-group-lessons","su3-ninej-four-octets-channels"),"先在三路径例子中分清酉矩阵 R 与带权 9j 表 S，再用四伴随表示的路径计数和交换迹检查更大的精确块；计数不决定所有系数。"],
 [ref("lie-group-lessons","su3-ninej-four-octets-channels"),ref("lie-group-lessons","su3-ninej-adjoint-invariants"),"先数清四个八重态到单态的八条路径及两份 8 的独立副本，再用双单态的 δ 收缩和约化态 I64/64 独立核对单格重叠与聚合概率。"],
 [ref("lie-group-lessons","su3-ninej-adjoint-invariants"),ref("lie-group-lessons","su3-ninej-adjoint-observables"),"把按中间类型聚合的概率带入明确声明的两体 Casimir 模型，区分零均值与非零涨落，再用一致的态和算符换基核对期望值。"],
 [ref("lie-group-lessons","su3-cg-exact-complex-states"),ref("lie-group-lessons","su3-ninej-adjoint-observables"),"先保留精确复振幅完成二元往返，再把同一酉换基规律用于四体路径坐标；单态八路径与最终八重态三十二路径使用不同长度的向量。"],
 [ref("lie-group-lessons","su3-ninej-high-input-labels"),ref("lie-group-lessons","su3-ninej-fifteen-input-paths"),"先用 Dynkin 标签分开 15、15′ 和共轭，再比较 15 输入的两棵树如何以不同中间表示与根副本给出相同五维路径空间；逆变换使用 R†。"],
 [ref("lie-group-lessons","su3-ninej-fifteen-input-paths"),ref("lie-group-lessons","su3-ninej-27-input-exact"),"先核对十五维输入的五条完整路径及副本选基，再将相同方法用于 27 输入到最终 42 的五路径块；路径数相同不允许沿用旧行列索引。"],
 [ref("lie-group-lessons","su3-ninej-exact-normalization"),ref("lie-group-lessons","su3-ninej-27-input-exact"),"先由 R 的酉性推出 S 的维数加权正交，再按高维例子的实际中间标签恢复 12√21 等缩放因子；S 仍不能直接乘态。"],
 [ref("material-observables","ir-raman"),ref("material-observables","materials-workflow"),"先用实际机械表示扣除声学平移并判断IR/Raman许可，再把Si、NaCl与GaAs保持为各自的化学占位和晶轴，保存同一材料声子与张量输入；原子数相同不代表表示相同。"],
 [ref("material-observables","piezoelectricity"),ref("material-observables","materials-workflow"),"先在GaAs的完整三阶压电求和中核对yz剪切因子二，并以Si/NaCl反演零作对照，再把这一张量检验同同材料的光学模式记录合并；系数与示意峰位须保留来源和单位。"],
 [ref("material-observables","neumann"),ref("electronic-materials","shg-tensor"),"把逐操作联立张量不变方程的方法用于χ(2ω;ω,ω)，先按同频输入仅取j↔k；静态介电或弹性本征对称不能变成动态SHG的Kleinman全置换。"],
 [ref("material-observables","piezoelectricity"),ref("electronic-materials","shg-tensor"),"沿用极性三阶张量的反演负号与Td六个xyz分量对照，但重新声明SHG的频率和系数：χ不是压电e，也不是d=χ/2；4mm的xxz与zxx仍独立。"],
 [ref("electronic-materials","shg-tensor"),ref("electronic-materials","shg-geometry"),"先固定完整点群允许的同一复χ及j/k约定，再主动旋转样品、收缩两个输入场和输出分析器；非零允许张量仍可能给所选几何零通道。"],
 [ref("material-observables","polarization"),ref("electronic-materials","shg-geometry"),"把Raman先收缩振幅再取模平方的做法迁到SHG，但重新定义三指标χ、两个同频输入、样品主动转角与第一字母为输入的PS通道；不能照搬原Raman两指标角谱。"],
 [ref("electronic-materials","shg-geometry"),ref("electronic-materials","shg-inference"),"先用GaAs(001)手算I_PP=1/8和正入射全暗理解几何，再比较χ与exp(iα)χ；强度相同或一个暗通道不唯一确定点群、反演或极性畴。"],
 [ref("symmetry-course-lessons","space-05"),ref("electronic-materials","unfold-folding"),"先理解晶格平移用Bloch相位标记态，再比较完美链原胞与N倍计算胞的动量折叠；空间群课k为倒格分数且指数含2π，本链k为弧度/a、图轴k/π，须先换约定。"],
 [ref("electronic-materials","unfold-folding"),ref("electronic-materials","unfold-projection"),"先把N条分支认作同一完美Hamiltonian的折叠标记，再保留胞内复相位构造N个原胞Bloch投影；本征能量或逐站点概率都不能替代波函数。"],
 [ref("electronic-materials","unfold-projection"),ref("electronic-materials","unfold-defects"),"先核对归一态跨动量权重和1及固定k跨轨道和M/N，再比较周期杂质、交替键和真正删轨道的空位；导入须保留相位与完整复本征基，缺失权重不能补归一。"],
 [ref("pointgroup-lessons","representations"),ref("quantum-materials","orbital-crystal-field"),"先分清同群在指定基函数空间的共同分块及表示维数，再选归一实d基比较Oh的t2g/eg与Td的e/t2；加入上下自旋给10个单电子基态，不给电子填充或多电子磁基态。"],
 [ref("quantum-materials","orbital-crystal-field"),ref("quantum-materials","orbital-soc"),"先在相同五轨道基上用正Δ和重心约束给出单电子能级，再扩到d⊗spin加入Ds/Dt及λL·S；能量均用eV，但低对称/SOC后父相轨道标签一般不是严格量子数。"],
 [ref("lie-group-lessons","su2-coupling-representations"),ref("quantum-materials","orbital-soc"),"将共同SU(2)角动量相加的维数检查用于l=2与s=1/2，在晶场全零时核对4⊕6及−3λ/2、λ；晶场非零时不再把所有态按自由离子j强行分类。"],
 [ref("principles-materials","conservation-protection"),ref("quantum-materials","orbital-soc"),"先用反幺正T=U_TK、U_TU_T*与H的关系判断有限系统Kramers保护，再扩到实d轨道×自旋十维；对整组投影并迹掉自旋，避免把任意简并本征矢形状当唯一轨道态。"],
 [ref("quantum-materials","orbital-crystal-field"),ref("quantum-materials","orbital-jahn-teller"),"先辨认轨道双重态与重心分裂，再另建[z²,x²−y²]的独立E⊗e电子—二维Q模型；它不是十维SOC矩阵自动截断，Q为无量纲约化量，不能直接当键长或质量加权位移。"],
 [ref("pathways-materials","hubbard-basis"),ref("response-materials","multiplet-fock"),"沿用固定费米模式排序及反对易符号构造占据基，从空间链站点改为同一离子的五d轨道；固定总N空间为C(10,N)，按N↑/N↓分块后仍需在同能空间解析S²。"],
 [ref("quantum-materials","orbital-crystal-field"),ref("response-materials","multiplet-fock"),"先把五轨道×二自旋认作十个单电子可选模式，再固定N建立反对称Slater占据空间；单电子10×10晶场谱不能通过乘电子数替代C(10,N)多电子谱。"],
 [ref("response-materials","multiplet-fock"),ref("response-materials","multiplet-hund"),"先固定N、费米符号和U′=U−2J联动，再完整加入自旋翻转与成对跃迁，以d²的45维和30/14/1能级重数核对；只保留密度或平行占据图不是同一Hamiltonian。"],
 [ref("lie-group-lessons","su2-coupling-representations"),ref("response-materials","multiplet-hund"),"把两自旋的单态/三重态分解带入两个相同电子的完整轨道×自旋反对称态；d²三重态须配反对称轨道对，30=3C(5,2)包含磁分量而不只是十种占据。"],
 [ref("response-materials","multiplet-hund"),ref("response-materials","multiplet-competition"),"先由完整交换谱分清J改变相对自旋能量、固定N的U只共同平移，再在同N/U/J下扫描Δ；试探占据给−2Δ晶场趋势，但成对跃迁与有限采样使试探交叉不能充作精确临界点。"],
 [ref("lie-group-lessons","su2-spinor"),ref("spectroscopy-materials","resonance-zeeman"),"从S=σ/2与方向期望建立二能级Zeeman矩阵，再旋转给定有效g主轴中的磁场；自旋生成元无量纲，H/h以GHz、B以T输入，频率差不额外乘2π。"],
 [ref("material-observables","neumann"),ref("spectroscopy-materials","resonance-zeeman"),"先把张量和样品方向分开记录，再在给定对角有效g与共同主轴上改变B及微波方向；这不是从静态介电χ自动得到g，也不将几何g_eff推广成含全部相互作用的共振公式。"],
 [ref("spectroscopy-materials","resonance-zeeman"),ref("spectroscopy-materials","resonance-interactions"),"先在纯Zeeman极限核对方向依赖的能级差，再于同一H/h约定加入D/E及电子—核超精细项；GHz参数不能当eV或Tesla，S=1/2二阶ZFS算符恒为零。"],
 [ref("lie-group-lessons","su2-coupling-representations"),ref("spectroscopy-materials","resonance-interactions"),"先用两个角动量共同旋转的耦合基，再核对S=I=1/2、B=0、各向同性A的F=0/1能量−3A/4和A/4；电子与核为可区分因子，不强加两个相同电子的Pauli交换。"],
 [ref("response-materials","multiplet-competition"),ref("spectroscopy-materials","resonance-interactions"),"先从无SOC Kanamori模型识别低能S及完整占据，再在独立有效自旋空间指定g、D、E和A；S只确定维数，参数须另有SOC/轨道投影或来源，不能将d⁸教学背景当NiO拟合共振。"],
 [ref("spectroscopy-materials","resonance-interactions"),ref("spectroscopy-materials","resonance-selection"),"先对完整有效Hamiltonian得到能量子空间，再以每态pi−pf和磁偶极矩阵元迹和构造净正频吸收；温度、偏振、HWHM及网格改变不同量，不能只按峰高或任意简并单态判断。"],
 [ref("pointgroup-lessons","selection-rules"),ref("spectroscopy-materials","resonance-selection"),"把矩阵元含全对称分量的条件用于磁偶极驱动，改用轴向自旋及M=Σe1,a gaSa；不能将IR的极性电偶极或Raman二次函数直接替换磁共振算符，允许仍不决定热权重和信号。"],
 [ref("response-materials","multiplet-fock"),ref("spectroscopy-materials","spectra-slater"),"先会构造固定N费米行列式，再分别建立吸收初态p⁶d⁸的45维与末态p⁵d⁹的60维；芯空穴扩展空间并加入p-d作用，不能在同一旧固定d电子数矩阵里直接画末态。"],
 [ref("response-materials","multiplet-hund"),ref("spectroscopy-materials","spectra-slater"),"先理解统一J Kanamori的自旋翻转与成对跃迁，再区分全d壳层Slater的F⁰/F²/F⁴角通道及芯壳p-d直接/交换；不把旧U或单一J数值自动改名成F⁰或F²/F⁴。"],
 [ref("quantum-materials","orbital-soc"),ref("spectroscopy-materials","spectra-slater"),"先在单电子实d基中理解λl·s和自由离子极限，再在多电子行列式中逐电子求Σl·s并加入2p SOC；一般晶场/SOC后只报⟨S²⟩和⟨L²⟩，不能未经投影替成总L·S或严格LS标签。"],
 [ref("spectroscopy-materials","spectra-slater"),ref("spectroscopy-materials","spectra-polarization"),"先明确p⁶dⁿ和p⁵dⁿ⁺¹两空间及其完整本征态，再用不翻转自旋的电偶极d†p构造各偏振复振幅并热平均；SOC混合态不等于偶极算符本身翻自旋。"],
 [ref("pointgroup-lessons","selection-rules"),ref("spectroscopy-materials","spectra-polarization"),"将Γf*⊗ΓO⊗Γi含全对称分量的许可条件落实到奇宇称2p→3d电偶极矩阵元，再保留复偏振和实际波函数强度；能量可达或表示允许都不保证该通道吸收非零。"],
 [ref("spectroscopy-materials","resonance-selection"),ref("spectroscopy-materials","spectra-polarization"),"迁移完整简并子空间求和及等权热平均的做法，但把电子磁偶极净吸收pi−pf换成芯跃迁电偶极初态权重pi，并将H/h的GHz换为eV；两种探针不能照抄同一算符或强度。"],
 [ref("spectroscopy-materials","spectra-polarization"),ref("spectroscopy-materials","spectra-audit"),"先相干叠加偏振振幅并对完整初末空间热平均，再用三正交偏振总强度0.4(10−n)及窗口积分核对；相对末态重心零点不能读绝对吸收边，eV-HWHM全轴Lorentz也不能照搬EPR正频归一。"],
 [ref("pathways-materials","bandrep-decomposition"),ref("pathways-materials","bandrep-cubic-sites"),"先会在固定k的同一Bloch纤维中约化小群表示，再比较1a、1b、3c轨道中心和极性p轨道，核对3c-p的九维空间。"],
 [ref("pathways-materials","bandrep-cubic-sites"),ref("material-research","band-restriction"),"把位点轨道与局域轨道表示的区别带入线上共同子群的限制，检验端点标签如何相接。"],
 [ref("pathways-materials","hubbard-basis"),ref("pathways-materials","hubbard-gaps"),"先固定Fock模式排序、边界与(N↑,N↓)扇区，再区分同扇区第一激发间隔和跨N的电荷隙。"],
 [ref("pathways-materials","hubbard-superexchange"),ref("pathways-materials","hubbard-gaps"),"把二聚体单重—三重分裂与增加或移去电子的能量代价并排比较，避免把所有间隔都称为同一种隙。"],
 [ref("pathways-materials","hubbard-basis"),ref("pathways-materials","hubbard-ionic"),"保持同一占据基和粒子数扇区，加入交错位能后观察站点密度与双占据。"],
 [ref("bridges-materials","density-pure-mixed"),ref("pathways-materials","hubbard-ionic"),"用纯态与混合的区别理解严格t=0简并基态等权平均，避免将其叫作纯单重态。"],
 [ref("pathways-materials","hubbard-gaps"),ref("bridges-materials","manybody-lehmann"),"相邻N扇区能量只决定可能的能量差；Lehmann展开还须用指定c/c†矩阵元筛选可见谱权重。"],
 [ref("bridges-materials","polaron-hamiltonian"),ref("bridges-materials","polaron-conditional-cloud"),"先建立电子与双局域振子的共同空间及Holstein耦合，再计算以电子位置为条件的位移和关联。"],
 [ref("bridges-materials","density-pure-mixed"),ref("bridges-materials","polaron-conditional-cloud"),"先做复合系统的部分迹，再用电子约化态纯度和条件位移识别整体纯态中的电子—振子纠缠。"],
 [ref("bridges-materials","polaron-conditional-cloud"),ref("bridges-materials","polaron-truncation"),"已经认识条件振动云和声子占据后，逐项比较增加截断时的能量、占据和关联，区分小残差与收敛。"],
 [ref("bridges-materials","density-pure-mixed"),ref("bridges-materials","density-lindblad"),"先分清布居、相干和纯度，再比较幅度阻尼与纯退相干对密度矩阵的不同作用。"],
 [ref("bridges-materials","density-lindblad"),ref("bridges-materials","density-assumptions"),"明确浴通道和T1/T2后，核验初态、迹、厄米性、半正定性及采样，分开数值合法与物理假设。"],
 [ref("bridges-materials","density-assumptions"),ref("principles-materials","conservation-open"),"从假设明确且数值合法的轨迹转向完整伴随生成元L†Q，区别一个初态的平坦曲线与对全部初态守恒。"],
 [ref("pointgroup-lessons","character-reduction"),ref("construction-materials","salc-build"),"先由字符内积得到重数并核对总维数，再从四站点实际置换矩阵构造A1、B1与E的SALC。"],
 [ref("pointgroup-lessons","projection"),ref("construction-materials","salc-build"),"先理解字符投影、零投影与归一化，再回放E投影的加权和，并用矩阵元投影生成两个伙伴。"],
 [ref("construction-materials","salc-build"),ref("construction-materials","salc-selection"),"固定正交SALC基和操作矩阵后，把算符变换、表示包含重数与实际跃迁块强度连起来。"],
 [ref("pointgroup-lessons","selection-rules"),ref("construction-materials","salc-selection"),"把初态—算符—末态的统一矩阵元条件落实到C4v偏振偶极，比较禁戒和允许但为零。"],
 [ref("construction-materials","salc-build"),ref("construction-materials","salc-multiplicity"),"由四轨道E伙伴进入两套等价副本，核对E投影秩从2变4，并检查副本混合与伙伴简并的区别。"],
 [ref("construction-materials","salc-selection"),ref("construction-materials","salc-multiplicity"),"从母群SALC算符块出发，用保留生成元闭包和B1势群平均判断何时允许A1—B1混合。"],
 [ref("pointgroup-lessons","representations"),ref("bridges-materials","workshop-identity"),"先声明作用空间及同一基底的矩阵恒等式，再把全部k的多项式系数列成约束，不只比较几个能量点。"],
 [ref("symmetry-course-lessons","magnetic-01"),ref("bridges-materials","workshop-identity"),"先区分极向量与时间奇轴向自旋，再在镜面下同时变换k和Pauli分量，理解Rashba完整组合。"],
 [ref("bridges-materials","workshop-identity"),ref("bridges-materials","workshop-spin"),"先会求完整系数约束，再合并时间反演使d(k)为奇、同宇称反演使其为偶，逐项推出d(k)=0。"],
 [ref("symmetry-course-lessons","double-04"),ref("bridges-materials","workshop-spin"),"先明确反幺正平方、Hamiltonian对称与同k返回，再以同宇称二态模型检验PΘ保护的逐k简并。"],
 [ref("bridges-materials","workshop-identity"),ref("bridges-materials","workshop-breaking"),"在完整多项式约束基础上，固定磁性预设A，再只启用时间反演生成B，追踪mσz与Γ劈裂。"],
 [ref("bridges-materials","workshop-spin"),ref("bridges-materials","workshop-breaking"),"从奇偶约束消除自旋项的推导转向受控反例：重新声明磁性预设，只改变T开关并解释局部开隙。"],
 [ref("lie-group-lessons","singlet-triplet-exchange"),ref("connections-materials","statistics-complete-exchange"),"先构造自旋单重/三重态，再把轨道一同交换，用完整电子波函数的交换奇偶判断允许性。"],
 [ref("connections-materials","statistics-complete-exchange"),ref("connections-materials","statistics-pauli-projector"),"确认交换全部电子自由度后，由P²=I推出(I−P)/2幂等，解释同轨道同自旋为何投影严格为零。"],
 [ref("connections-materials","statistics-pauli-projector"),ref("connections-materials","statistics-young-sectors"),"从S2对称/反对称正交投影推广到S3中心投影，再独立检查Young算符Y/3的幂等与非厄米性。"],
 [ref("pointgroup-lessons","character-reduction"),ref("connections-materials","statistics-young-sectors"),"分清群的不可约表示与特定模型重数，理解S3符号表示存在而本张量空间全反对称秩仍为零。"],
 [ref("principles-materials","order-isotropy"),ref("connections-materials","defects-manifold"),"区分模型群G、状态稳定子H和群轨道后，将G/H用于比较Ising、XY圆和三维单位矢量球。"],
 [ref("pathways-materials","wall-gradient"),ref("connections-materials","defects-manifold"),"从固定±v边界的标量壁回到真空空间的连通分支，再比较XY闭环绕数为何不同于畴壁过零。"],
 [ref("connections-materials","defects-manifold"),ref("connections-materials","defects-winding"),"先声明XY序参量限S1，再沿不穿核心的闭环累加主值相位差，与解析包围电荷交叉核对。"],
 [ref("connections-materials","defects-winding"),ref("connections-materials","defects-director"),"从exp(iθ)的整数绕数转到n≡−n的单值exp(2iθ)，分清场整数绕数与指向角半圈转动。"],
 [ref("connections-materials","statistics-complete-exchange"),ref("pathways-materials","hubbard-basis"),"由完整电子态反对称条件进入有序费米产生算符的固定粒子数Fock基，辨认跃迁符号来源。"],
 [ref("lie-group-lessons","rabi-qubit-control"),ref("bridges-materials","density-lindblad"),"先把封闭二能级Rabi演化看作SU2旋转，再在相同Hamiltonian约定下加入幅度阻尼和纯退相干。"]
];

export const lessonProgressionEdges=Object.freeze(edgeDefinitions.map(([from,to,reason])=>Object.freeze({from,to,reason})));
export const lessonProgressionInventory=Object.freeze(progressionLessons.map(item=>Object.freeze({...copyLesson(item),exerciseIds:Object.freeze([...(item.exerciseIds||[])]),key:key(item.catalog,item.lessonId)})));
export const lessonProgressionCatalogs=Object.freeze(progressionCatalogs.map(item=>Object.freeze({...item,modules:Object.freeze([...item.modules])})));

/** A fresh value is returned on every call; there is no learning-progress state. */
export function lessonProgression({catalog,lessonId}={}){
 const definition=catalogFor.get(catalog),catalogId=definition?.catalog;
 const identity=catalogId&&typeof lessonId==='string'?key(catalogId,lessonId):null;
 const current=identity?byKey.get(identity):null;
 const prerequisites=current?lessonProgressionEdges.filter(edge=>edge.to===identity).map(edge=>({...copyLesson(byKey.get(edge.from)),reason:edge.reason})):[];
 const next=current?lessonProgressionEdges.filter(edge=>edge.from===identity).map(edge=>({...copyLesson(byKey.get(edge.to)),reason:edge.reason})):[];
 return{status:current?(prerequisites.length||next.length?'reviewed':'index-only'):'unknown',
  current:current?copyLesson(current):null,prerequisites,next,
  index:definition?{title:definition.title,route:current?.indexRoute||definition.route}:{title:'全部课堂路线',route:'#classroom'},
  start:{title:'零基础起步',route:'#classroom/start'}};
}

/**
 * Resolve an initial, parsed classroom selection without confusing a catalogue's
 * first lesson with the first lesson of the selected module/stage. This is
 * routing metadata, not an inference about prerequisite order. Unknown or
 * insufficiently scoped destinations return current:null and a catalogue index.
 * Pass the complete selection when exercise/material/preset context is present.
 */
export function progressionForSelection(selection={}){
 const definition=catalogFor.get(selection.section||selection.catalog);
 const fallback=()=>({...lessonProgression({catalog:definition?.catalog}),resolution:'index'});
 if(!definition)return fallback();
 let candidates=progressionLessons.filter(item=>item.catalog===definition.catalog);
 const modular=definition.modules.length>0;
 if(modular){
  if(!definition.modules.includes(selection.module))return fallback();
  candidates=candidates.filter(item=>item.module===selection.module);
 }else if(selection.module)return fallback();
 let chosen=typeof selection.lesson==='string'&&selection.lesson?candidates.find(item=>item.lessonId===selection.lesson):null;
 if(selection.lesson&&!chosen)return fallback();
 let resolution=chosen?'explicit':modular?'module-default':'course-default';
 const exerciseMaySelect=modular||definition.section==='dynamics'||definition.section==='observables'&&selection.tab==='derive';
 if(selection.exercise&&exerciseMaySelect){
  const exerciseLesson=candidates.find(item=>item.exerciseIds.includes(selection.exercise));
  if(!exerciseLesson)return fallback();
  chosen=exerciseLesson;resolution='exercise';
 }
 if(definition.section==='lie'){
  const tracks=['all','continuous','representations','cg','racah','ninej','coupling'];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=selection.track||'all';
  const matches=item=>track==='all'||item.track===track||track==='continuous'&&item.lessonId==='representations'||track==='coupling'&&item.track!=='continuous';
  if(!chosen){chosen=candidates.find(matches);resolution='track-default';}
 }else if(definition.section==='academy'){
  const tracks=['all',...new Set(candidates.map(item=>item.track))];
  if(!chosen&&selection.track&&!tracks.includes(selection.track))return fallback();
  const track=chosen?.track||selection.track||'all';
  let visible=candidates.filter(item=>track==='all'||item.track===track);
  const level=['point','space'].includes(selection.level)?selection.level:'all';
  const matching=visible.filter(item=>level==='all'||!item.symmetryLevel||item.symmetryLevel==='point-and-space'||item.symmetryLevel===level);
  if(matching.length)visible=matching;
  if(!chosen||!visible.includes(chosen)){chosen=visible[0];resolution='track-default';}
 }else if(definition.section==='coupled-materials'&&selection.module==='distortion'&&!selection.lesson&&!selection.exercise){
  const preset=['batio3','srtio3'].includes(selection.preset)?selection.preset:['batio3','srtio3'].includes(selection.material)?selection.material:'batio3';
  if(preset==='srtio3'){chosen=candidates.find(item=>item.labPreset==='srtio3');resolution='material-default';}
 }
 chosen??=candidates[0];
 if(!chosen)return fallback();
 return{...lessonProgression(chosen),resolution};
}

function linkList(items,kind){
 const itemHTML=item=>`<li><a data-lesson-progression-link data-progression-kind="${kind}" href="${esc(item.route)}">${esc(item.title)}</a><p>${esc(item.reason)}</p></li>`;
 if(items.length<=3)return '<ul>'+items.map(itemHTML).join('')+'</ul>';
 return '<ul>'+items.slice(0,3).map(itemHTML).join('')+'</ul><details><summary>更多衔接</summary><ul>'+items.slice(3).map(itemHTML).join('')+'</ul></details>';
}

/** Native links support keyboard use, copied URLs and opening in a new tab. */
export function lessonProgressionHTML(selection={},{topicSearch=false}={}){
 const result=lessonProgression(selection);
 if(!result.current)return '';
 const lookup=topicSearch?'<button type="button" class="secondary small" data-lesson-topic-search aria-haspopup="dialog">在本主题查课</button>':'';
 return `<section class="lesson-progression" data-lesson-progression="${esc(key(result.current.catalog,result.current.lessonId))}" aria-label="先修与后续学习"><h3>把这一节接起来</h3><p class="lesson-progression-intro">按需要补基础或继续深入；这些建议不限制直接选课与使用工具。</p><div class="lesson-progression-columns">${result.prerequisites.length?`<section><h4>建议先会</h4>${linkList(result.prerequisites,'prerequisite')}</section>`:''}${result.next.length?`<section><h4>接下来可以学</h4>${linkList(result.next,'next')}</section>`:''}${!result.prerequisites.length&&!result.next.length?'<p>可在本主题目录中选择下一项学习内容。</p>':''}</div><p class="lesson-progression-index">${lookup}<a data-lesson-progression-link data-progression-kind="index" href="${esc(result.index.route)}">本主题目录</a><a data-lesson-progression-link data-progression-kind="start" href="${esc(result.start.route)}">从零基础起步</a></p></section>`;
}
