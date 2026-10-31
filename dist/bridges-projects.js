import {num} from './response-views.js?v=20261031-connections1';

const dimer={sites:2,nUp:1,nDown:1,boundary:'open',hopping:1,interactionU:4,alternatingPotential:0};
const cloud={hopping:1,phononEnergy:1,siteBias:0,cutoff:6,scanMaxCoupling:1.6,scanPoints:7};
const pair={experiment:'pair',drive:0,detuning:0,exchange:1,gradient:0,gamma1:0,thermalScale:1};
const workshop={pointGroup:'c4v',rotation:1,mirror:1,timeReversal:1,rashba:1,dresselhaus:.5,mass:.4,fieldX:.3,curvature:1};
const spectrum={...dimer,site:0,q:1,spin:'up',chemicalPotential:2,responseKind:'spin',points:601};

export const bridgesAssignments=[
 {id:'levels-to-manybody-spectra',module:'manybody',title:'从 Hubbard 能级到可见跃迁',question:'同一个二聚体的本征能级，为什么不能直接作为添加电子或自旋散射的谱峰？',rubric:[
  '三个阶段固定二站点、半填充、t=1eV、U=4eV、Δ=0及唯一无向键；不改变模型后再比较谱。',
  '分别写出改变粒子数的产生/湮灭算符与保持粒子数的自旋算符，说明末态属于哪个扇区。',
  '记录峰位置、真实矩阵元、未展宽权重与求和规则，解释被选择定则禁止的能量差为何没有谱峰。',
  '给出化学势、q、旋转或自旋归一化和展宽约定；有限团簇离散峰与人为η不等于材料寿命或热力学相变。'],steps:[
   {id:'ground',title:'先确定固定粒子数二聚体',action:'hubbard_lab',route:'#compute/hubbard-cluster-lab?preset=dimer-half',requires:{...dimer,scanMaxU:12,scanPoints:25},prompt:'记录基态能量、总自旋、双占据和单重态–三重态分裂。用E_S=(U−√(U²+16t²))/2核验t=1eV、U=4eV的结果。说明固定(N↑,N↓)谱只含同一粒子数扇区，不能直接给出添加电子的峰。'},
   {id:'addition',title:'添加或移除一个电子',action:'manybody_spectra_lab',route:'#compute/manybody-spectra-lab?preset=interacting-dimer',requires:{...spectrum,experiment:'single_particle',probe:'local',eta:.08},prompt:'保持上一阶段Hamiltonian，分别查看添加与移除电子的非零跃迁。指出N+1、N−1末态和μ=2eV如何进入横轴，核对站点0的↑自旋占据与空位谱权重求和。点击峰查看矩阵元，解释为何不是每个多体能级都可见。'},
   {id:'response',title:'改用保持粒子数的自旋探针',action:'manybody_spectra_lab',route:'#compute/manybody-spectra-lab?preset=spin-dimer',requires:{...spectrum,experiment:'response',probe:'momentum',eta:.05},prompt:'将探针改为同一二聚体的动态自旋响应，保持跃迁、排斥、填充和边界。记录q=1对应的相位及自旋算符归一化，指出可见非弹性峰与第一阶段自旋能量差的关系，再与单粒子谱区分。这里η改为0.05eV，比较对象是未展宽峰位置与权重，不把两种探针的峰高直接相除。'}]},
 {id:'vibration-cloud-reduced-state',module:'polaron',title:'振动云、部分迹与混合态的区别',question:'电子局域密度不变，为什么振动云和电子纯度会改变？低纯度又何时不能直接解释为纠缠？',rubric:[
  '前两阶段只把g从0变成0.8eV，固定电子跃迁、声子量子能量、位点差和截断；检查两个结果的截断诊断。',
  '把电子密度、⟨n_i X_j⟩、条件位移和电子约化纯度分别解释；X无量纲，未转换为Å。',
  '非简并Holstein基态是整体纯态，其电子约化混合来源于电子—声子纠缠；第三阶段故意换成双自旋经典混态作反例。',
  '两个模型的Hilbert空间、单位与参数独立；第三阶段不拟合或重建Holstein波函数，也不以局部熵给一般混态定量纠缠。'],steps:[
   {id:'free',title:'电子与振子可分离的基准',action:'polaron_lab',route:'#compute/polaron-lab?preset=uncoupled',requires:{...cloud,coupling:0},prompt:'记录总声子数、电子约化纯度和两个电子占据。解释Δ=0、t>0时基态为电子成键态乘两个振子真空，并检查省略总零点能后的基态能量−1eV。X的零点涨落没有因为平均声子数为零而消失。'},
   {id:'cloud',title:'只打开局域电子—声子耦合',action:'polaron_lab',route:'#compute/polaron-lab?preset=symmetric-cloud',requires:{...cloud,coupling:.8},prompt:'只将g改成0.8eV，核对电子密度仍为(1/2,1/2)，同时记录条件振动云、声子数分布和电子约化纯度。通过非简并整体纯态及部分迹解释混合性。记录相邻截断变化；不能用本征残差替代声子截断收敛。'},
   {id:'classical',title:'用双自旋经典混态检验“局部熵等于纠缠”',action:'density_matrix_lab',route:'#compute/density-matrix-lab?preset=classical',requires:{...pair,initialState:'classical',gammaPhi:0,duration:12,points:161},prompt:'切换到独立的双自旋模型：↑↓与↓↑的经典等权混合。记录整体纯度1/2、单自旋约化熵1bit和负性0，说明相同的局部混合程度不保证纠缠。本例只提供逻辑反例，不将双自旋参数映射成电子—声子参数。'}]},
 {id:'spin-coupling-decoherence',module:'density',title:'从 CG 分解到交换动力学与退相干',question:'反平行直积态如何通过单重态、三重态的相对相位产生纠缠？加入局域退相干后应使用什么指标？',rubric:[
  '保持两自旋1/2、初态↑↓，先用CG振幅分解为单重态与M=0三重态，再由交换能级差推导相对相位。',
  'CG页的κ给出选定能量单位；动力学页的J为H/ℏ系数，单位rad/ns。只对应κ=ℏJ，不把数值1eV认作1rad/ns。',
  '后两阶段只改变γφ，固定初态、J、场、时间范围与采样；比较整体纯度、局部熵和部分转置负性。',
  '混态局部熵不是一般纠缠量；局域Markov通道为给定现象学模型，没有由旧磁共振线宽自动求出噪声率。'],steps:[
   {id:'cg',title:'把反平行直积态写到耦合基',action:'teaching_labs',route:'#compute/lie/su2_coupling?preset=half-pair',requires:{lab:'lie',experiment:'su2_coupling',twoJ1:1,twoJ2:1,twoM1:1,twoM2:-1,coupling:1},prompt:'选择1/2⊗1/2预设，确认输入使用两倍量子数twoJ1=twoJ2=1、twoM1=1、twoM2=−1。读出S=0、S=1分量的振幅、概率及交换能量，推导两者能差κ，并保留Condon–Shortley相位约定。'},
   {id:'exchange',title:'以相对相位解释纯交换演化',action:'density_matrix_lab',route:'#compute/density-matrix-lab?preset=exchange',requires:{...pair,initialState:'antiparallel',gammaPhi:0,duration:2*Math.PI,points:161},prompt:'取J=1rad/ns、无场无耗散，从↑↓出发。用轨迹滑块定位t=π/2ns，核对整体纯度1、单自旋熵1bit与负性1/2；在t=πns应恢复另一反平行直积态。把两种周期与CG分量的相对相位联系起来。'},
   {id:'noise',title:'仅添加两个自旋的局域纯退相干',action:'density_matrix_lab',route:'#compute/density-matrix-lab?preset=exchange-dephasing',requires:{...pair,initialState:'antiparallel',gammaPhi:.15,duration:2*Math.PI,points:161},prompt:'仅将γφ改为0.15ns⁻¹，比较与无耗散曲线同一时刻的纯度、局部熵和负性。解释为何局部熵增大不等于纠缠增大，检查整个轨迹的迹、厄米性和半正定性；T₂公式不能直接代替耦合双自旋的完整动力学。'}]},
 {id:'symmetry-to-bands',module:'workshop',title:'从允许项走向局部模型与周期能带',question:'为什么时间反演允许一般动量处的 Rashba 分裂，而再加反演却会在这个双重态模型中消除它？',rubric:[
  '工坊使用同宇称真实自旋双重态，镜面按轴向量变换自旋；不能未经说明改成轨道赝自旋。',
  '前两阶段只增加反演约束，比较完整多项式系数和残差，不只对照Γ点两条曲线。',
  '周期Rashba模型在Γ附近用sin k≈k与1−cos k≈k²/2联系工坊，但能量单位、α与适用动量范围须分别声明。',
  'Γ点附近的二阶模型不能推断X点或全布里渊区拓扑；周期模型的X简并需用其自身的时间反演与周期性说明。'],steps:[
   {id:'allowed',title:'先投影到 C₄ᵥ 与时间反演允许的空间',action:'symmetry_workshop',route:'#compute/symmetry-workshop?preset=workshop-rashba',requires:{...workshop,inversion:0},prompt:'记录允许空间维数及每项投影前后系数。解释α(k_yσ_x−k_xσ_y)为何保留、常量σ_z项为何消失，并检查所有多项式系数的约束残差。Γ点无分裂不意味着一般k也必须无分裂。'},
   {id:'inversion',title:'只增加反演，比较同一个输入模型',action:'symmetry_workshop',route:'#compute/symmetry-workshop?preset=workshop-inversion',requires:{...workshop,inversion:1},prompt:'保持原始系数与其他生成元，只启用反演。将自旋部分同时满足的奇、偶动量条件写出，解释为何投影后Pauli部分为零。注意加入反演扩大了对称约束，不再把实际群简单称为原来的C₄ᵥ。'},
   {id:'lattice',title:'回到保留时间反演的周期 Rashba 模型',action:'band_connectivity',route:'#classroom/crystal?module=bands&tab=lab&lesson=band-spin',requires:{model:'rashba',soc:.6,zeeman:0,hopping:1,samples:121},prompt:'打开SOC课堂对应实验，使用α=0.6、Bz=0、t=1、121点的周期模型。用sin k≈k解释Γ附近线性自旋项，区分它与工坊α=1的数值尺度；说明Γ和X为何简并、一般路径点为何可劈裂。不能把局部二阶展开延伸到X或据此直接宣称拓扑。'}]}
];

export function bridgesEvidence(record){
 const r=record.result;
 switch(record.action){
  case'hubbard_lab':return `固定(N↑,N↓)=(${r.sector.nUp},${r.sector.nDown})；E_0=${num(r.ground.energy)} eV；⟨S²⟩=${num(r.ground.totalSpinSquared)}；Δ_{ST}=${num(r.gaps.dimerSingletTriplet?.gap)} eV；此谱固定粒子数，不是添加/移除谱`;
  case'polaron_lab':return `g=${num(r.parameters.coupling)} eV；电子密度=(${r.ground.density.map(num).join(', ')})；声子数=${num(r.ground.phononOccupation.reduce((a,b)=>a+b,0))}；电子纯度=${num(r.ground.electronicPurity)}；相邻截断δE=${num(r.convergence.energyChangeEV)} eV；声子截断${r.convergence.converged?'通过当前阈值':'尚未收敛'}；X无量纲`;
  case'density_matrix_lab':{const s=r.stateSnapshots,last=s.at(-1);return `自旋数=${r.scope.spins}；初态整体纯度=${num(s[0].purity)}；末态纯度=${num(last.purity)}；末态A熵=${num(last.entropyA)} bit；${r.scope.spins===2?`轨迹最大负性=${num(Math.max(...s.map(x=>x.negativity)))}；末态负性=${num(last.negativity)}；`:''}γφ=${num(r.rates.gammaPhi)} ns⁻¹；局部熵与混态纠缠须区分`;}
  case'teaching_labs':if(r.experiment!=='su2_coupling')return null;return `自旋直积维数=${r.dimension}；${r.selected.expansion.map(e=>`S=${num(e.J)}：概率=${num(e.probability)}，交换能量=${num(e.energy)}`).join('；')}；κ使用指定能量单位，动力学需换算κ=ℏJ`;
  case'symmetry_workshop':return `允许维数=${r.workshop.nullspace[0]?.length||0}；生成元数=${r.workshop.generators.length}；多项式残差=${num(r.checks.polynomialResidual)}；Γ分裂=${num(r.summary.find(x=>x.label==='投影后 Γ 点分裂')?.value)} eV；同宇称自旋双重态的局部二阶模型`;
  case'band_connectivity':return `${r.model}；一般路径与端点须区分；Γ/X分裂=${r.crossings.map(x=>`${x.label}:${num(x.gap)}`).join(', ')}；时间反演=${r.validation.timeReversalPresent?'保留':'破缺'}；镜面=${r.validation.mirrorSymmetryPresent?'保留':'破缺'}；路径点数=${r.summary.sampleCount}；能量为模型单位`;
  case'manybody_spectra_lab':return r.summary.map(x=>`${x.label}=${typeof x.value==='number'?num(x.value):x.value}${x.unit?' '+x.unit:''}`).join('；')+'；按真实跃迁矩阵元解释谱权重，不能用任意能级差代替可见谱峰';
  default:return null;
 }
}
