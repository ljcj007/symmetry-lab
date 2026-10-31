import {num} from './response-views.js?v=20261031-entry1';
// Tensor energy is meV, while the dynamical generator is H/hbar in rad/ns.
export const HBAR_MEV_NS=0.0006582119569;
const order={pointGroup:'c4v',etaX:1,etaY:0,etaZ:0,a2:-1,b4:1,c4:3,d6:.1,e6:0,f6:0,fieldX:0,basisAngle:30};
const bond={isotropic:1,anisotropyX:0,anisotropyY:0,symmetricXY:0,symmetricXZ:0,symmetricYZ:0,dx:.3,dy:.4,dz:.6,inversion:0,mirrorXY:0,mirrorXZ:1,mirrorYZ:0,rotationOrder:0,conventionAngle:0,swapSites:0};
const dynamicBond={...bond,isotropic:HBAR_MEV_NS,dx:0,dy:0,dz:.6*HBAR_MEV_NS,mirrorXY:1,mirrorXZ:0};
const pair={experiment:'pair',initialState:'plus_x',observable:'sx',jx:1,jy:1,jz:1,fieldX:0,fieldZ:0,gradientZ:0,gamma1:0,gammaPhi:0,duration:8,points:161,basisAngle:45};
const single={...pair,experiment:'single',observable:'sz',jx:0,jy:0,jz:0,fieldZ:.6,duration:12};

export const principlesAssignments=[
 {id:'order-to-bond-constraints',module:'order',title:'从序参量剩余群到一条键的交换约束',question:'二维极性序参量沿 x 时保留的镜面，在什么额外几何假设下能约束一条磁键？换坐标或交换端点会改变物理能谱吗？',rubric:[
  '序参量使用 C₄ᵥ 的二维极性表示，(1,0) 为指定方向；区分该方向稳定子与自由能极小值，不能把抽象序参量直接当作原子坐标或已确定空间群。',
  '第二阶段另行声明键沿 x、环境保留 xz 镜面而不添加其他约束。这是选定的键模型假设，不能由点群序参量自动生成完整结构或全部交换路径。',
  '按轴向量 A=det(R)R 和端点是否交换推导约束，解释该镜面允许 D_y、禁止 D_x 和 D_z；允许不代表必然非零。',
  '最后只改变被动坐标约定和端点编号：记录 D 分量、转置和能谱不变量。坐标换基不是物理对称性破缺，也不是施加磁场。'],steps:[
   {id:'direction',title:'确定二维极性序参量的剩余操作',action:'order_parameter_lab',route:'#compute/order-parameter-lab?preset=order-axis',requires:order,prompt:'取 C₄ᵥ 极性表示和 η=(1,0)，逐项比较 gη 与 η，记录保留的恒等与 xz 镜面以及整个畴轨道。区分指定方向、自由能驻点和稳定极小值。这里 η 没有给出真实原子位移模式，不据此自动指定某个晶体空间群。'},
   {id:'bond',title:'为沿 x 的键另行指定剩余镜面',action:'exchange_symmetry_lab',route:'#compute/exchange-symmetry-lab?preset=exchange-order-axis',requires:bond,prompt:'在额外假设“沿 x 的键环境保留 xz 镜面”下，投影给定 J，记录 D=(0,0.4,0)meV 及完整对称部分。该镜面不交换端点；先写出极向量 R，再写轴向量 A，逐项核对约束。说明第一阶段未提供足以重建键环境的原子结构，本阶段是明确声明的教学模型。'},
   {id:'convention',title:'用同一条键区分约定与物理破缺',action:'exchange_symmetry_lab',route:'#compute/exchange-symmetry-lab?preset=exchange-order-convention',requires:{...bond,conventionAngle:37,swapSites:1},prompt:'保持所有输入交换系数与生成元，只将坐标被动旋转37°并交换 i、j 编号。用 J′=QᵀJᵀQ 和 D′=−QᵀD 预测新分量，再检查完整量子能谱、经典最小能量不变。记录坐标矩阵和编号约定，不把分量改变称为物理对称性破缺。'}]},
 {id:'bond-to-conserved-spin',module:'exchange',title:'从消除 DMI 到全局自旋旋转与守恒',question:'加键中心反演后 DMI 为什么消失？何时剩余交换才具有 SU(2)，怎样把能量单位的交换张量接到守恒量动力学？',rubric:[
  '前两阶段只切换键中心反演，保持所有其他参数。反演交换端点而保持轴向量，要求 J=Jᵀ，因此禁止 D；并不自动禁止对称各向异性。',
  '本项目特意把对称各向异性输入设为零；反演后得到各向同性交换，因此具有全局 SU(2)。不能把这个结论推广到任意有反演的磁键。',
  '显式使用 ℏ=0.0006582119569meV·ns，将 J_energy/ℏ=1rad/ns 对接动力学的 jx=jy=jz=1。未反演阶段 D_z/ℏ=0.6rad/ns，第三阶段不含该已被投影消除的项。',
  '以三个总自旋生成元的算符对易子验证守恒，不能只凭一条恒定期望值轨迹。双自旋时间反演平方为+1，三重简并来源于自旋旋转表示而不是 Kramers 定理。'],steps:[
   {id:'dmi',title:'保留一个允许的 DMI 分量',action:'exchange_symmetry_lab',route:'#compute/exchange-symmetry-lab?preset=exchange-dynamics-dmi',requires:dynamicBond,prompt:'选择包含键的 xy 镜面，记录 J=ℏ I+K(D)、D_z=0.6ℏ，能量单位为 meV、ℏ=0.0006582119569meV·ns。推导镜面允许 D_z 的原因，查看双自旋能谱。交换常数的这一小数值专为单位对接而选，不代表任何真实材料拟合。'},
   {id:'inversion',title:'只加反演并核对对称部分',action:'exchange_symmetry_lab',route:'#compute/exchange-symmetry-lab?preset=exchange-dynamics-inversion',requires:{...dynamicBond,inversion:1},prompt:'只加入键中心反演，核对 D 归零而 J=ℏ I 保留，能谱为单重态−3ℏ/4与三重态ℏ/4。明确本例对称无迹部分本来就是零；反演本身仅强制 J 对称，不能从反演推出一般材料必为 Heisenberg 交换。'},
   {id:'generators',title:'在同一能量尺度上检查守恒生成元',action:'conservation_lab',route:'#compute/conservation-lab?preset=conservation-su2',requires:pair,prompt:'用 H/ℏ=S₁·S₂、jx=jy=jz=1rad/ns 对接上一步，逐个比较三种总自旋与 Hamiltonian 的对易子，核对能谱等于上一步 meV 能谱除以 ℏ。初态为 +x⊗+x 且无耗散，轨迹只是算符守恒的示例。解释三重态简并来自 SU(2)，双自旋的时间反演平方为+1，不能误用单自旋 Kramers 保护。'}]},
 {id:'generator-to-dephasing',module:'conservation',title:'守恒生成元与退相干：同一个单自旋的两种诊断',question:'绕 z 进动且发生 z 纯退相干时，为什么 S_z 仍然守恒，而横向相干与纯度会衰减？怎样在两个计算中心复现同一模型？',rubric:[
  '三个阶段都是单自旋1/2，初态+x，h=H/ℏ=0.6S_z，时间0至12ns、161点；不把单自旋模型当成前面双自旋的部分迹动力学。',
  '前两阶段仅将 γφ 从0改为0.25ns⁻¹，使用 L=√(γφ/2)σ_z；对照 [h,Q]、耗散伴随作用和总 L†Q。',
  'S_z 的 L†作用为零，所以守恒；S_x、S_y 既进动又退相干。初态的⟨S_z⟩=0本身不足以证明守恒，需要算符恒等式。',
  '第三阶段严格映射 fieldZ→detuning、fieldX→drive，两个计算器的 H/ℏ、噪声率、初态与时间点一致；比较密度矩阵、Bloch向量和纯度。该单自旋模型不定义双自旋纠缠负性。'],steps:[
   {id:'unitary',title:'先区分守恒量与进动中的横向分量',action:'conservation_lab',route:'#compute/conservation-lab?preset=conservation-density-unitary',requires:single,prompt:'取单自旋+x初态和 h=0.6S_z，检查 [h,S_z]=0、[h,S_x]≠0。记录 S_z 的算符守恒证明与横向进动轨迹；全程纯度应为1。注意一条期望值恰好恒为零的轨迹，不能替代对所有初态成立的算符判据。'},
   {id:'bath',title:'仅打开 z 纯退相干',action:'conservation_lab',route:'#compute/conservation-lab?preset=conservation-density-bath',requires:{...single,gammaPhi:.25},prompt:'只将 γφ 改成0.25ns⁻¹，写出 L=√(γφ/2)σ_z 并计算 L†S_z。说明 S_z 仍守恒而横向相干按 exp(−γφt) 衰减，横向还叠加0.6rad/ns进动。用纯度 [1+exp(−2γφt)]/2 核对轨迹，区分 Hamiltonian 对称性和整个开放系统生成元。'},
   {id:'density',title:'在密度矩阵课堂复现完全相同的轨迹',action:'density_matrix_lab',route:'#compute/density-matrix-lab?preset=dephasing-plusx',requires:{experiment:'single',initialState:'plus_x',drive:0,detuning:.6,exchange:0,gradient:0,gamma1:0,gammaPhi:.25,thermalScale:1,duration:12,points:161},prompt:'打开已有密度矩阵预设，将 fieldZ=0.6 对应 detuning=0.6，fieldX=0 对应 drive=0，并保持初态、两个噪声率和时间点。逐点比较上一阶段的密度矩阵与纯度，使用 Bloch 向量等于2⟨S⟩的约定检查横向衰减。thermalScale=1不参与这个指定纯态初态；本例没有第二个自旋，不将单自旋混合性称为双自旋纠缠。'}]}
];
export function principlesEvidence(record){if(!['order_parameter_lab','exchange_symmetry_lab','conservation_lab'].includes(record.action))return null;return record.result.summary.map(s=>`${s.label}=${typeof s.value==='number'?num(s.value):s.value}${s.unit?' '+s.unit:''}`).join('；');}
