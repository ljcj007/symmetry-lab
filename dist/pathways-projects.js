import {num} from './response-views.js?v=20261029-pathways1b';

const screw={group:4,site:'auto',orbitals:'s'};
const scattering={lattice:4,massA:23,massB:35.45,springIntra:2,springInter:2,basisFraction:.5,scatterA:1,scatterB:1,angle:0,selectedQ:1.8,sigma:.5,energyCutoff:.25,channel:'both'};
const wall={experiment:'ssh',sites:60,hopping:.8,dimerization:.25,sshWidth:2,probeEnergy:0,eta:.03,interface:'wall'};
const dimer={sites:2,nUp:1,nDown:1,boundary:'open',hopping:1,alternatingPotential:0};

export const pathwaysAssignments=[
 {id:'site-bloch-little-group',module:'bandrep',title:'从实空间位点到螺旋轴小群',question:'为什么相同的两个 s 轨道，在 Γ 与边界具有不同的螺旋本征值？',rubric:[
  '固定本站 SG4 的 BC z 轴设置、原胞和周期 Bloch 规范；不能直接套用 unique-b 晶胞的坐标名称。',
  '从位点置换及整格余量推导 U(S)²=exp(−2πikz)I，并以完整特征标匹配小群表示。',
  '区分位点诱导的两维纤维与抽象小群不可约表示；D 编号只在本次计算内有效，本项目没有证明 EBR 或拓扑能带。'],steps:[
   {id:'gamma',title:'在 Γ 点从两个位点构造表示',action:'band_rep_lab',route:'#compute/band-representation-lab?preset=screw-gamma',requires:{...screw,kPoint:'G'},prompt:'记录生成的两个位点、稳定子阶、纤维维数与螺旋矩阵。逐次作用2₁操作，解释为何Γ点U(S)²=I、本征值为±1；kPoint=G时表单kz参数不参与实际k坐标。'},
   {id:'boundary',title:'把同一轨道移到 kz=1/2',action:'band_rep_lab',route:'#compute/band-representation-lab?preset=screw-boundary',requires:{...screw,kPoint:'Z'},prompt:'保持位点与s轨道，计算整格平移字符exp(−2πi·1/2)=−1，推出λ=±i。记录两份一维表示的重数与维数和；注意这些是对称本征值，不是电子能量。'},
   {id:'little',title:'用工作台核对相同小群的因子系统',action:'analyze',route:'#workbench?sg=4&kx=0&ky=0&kz=0.5',requires:{group_number:4,'k.0':0,'k.1':0,'k.2':.5,doubleValued:false},prompt:'确认普通SG4、k=(0,0,1/2)、单值表示。读取C2z代表元的平方平移、因子ω(S,S)=−1与两个一维字符±i。按操作和字符核对上一阶段分解，不按D1/D2名称或任意本征矢矩阵逐项认同。'}]},
 {id:'bose-scattering',module:'scattering',title:'从谐振子热占据到双侧声子散射',question:'热容和非弹性散射都依赖 Bose 统计，为什么它们仍然不是同一个可观测量？',rubric:[
  '写出n=1/(exp(ε/kBT)−1)，并区分热力学模式求和与带有相干矩阵元的单Q散射。',
  '第二、三阶段固定链、Q、散射振幅、σ和低能截断，只改变温度；用未展宽单模权重检查详细平衡。',
  'Einstein/Debye是三维3n模式教学归一化；双原子链只有两条纵向分支，不能将前者热容与后者峰面积定量等同。',
  '报告被截断的零频模式、有限网格和Debye–Waller省略；本项目没有导入真实材料Phonopy谱。'],steps:[
   {id:'thermal',title:'先确认谐振子统计与模式计数',action:'phonon_thermo',route:'#compute/phonon-thermo',requires:{source:'compare',natom:2,theta_e:400,theta_d:500,t_min:0,t_max:1000,t_step:20},prompt:'使用Einstein与Debye比较，n=2、θE=400K、θD=500K，温区0–1000K、步长20K（本页默认值；若不同请手动恢复）。记录T=0的零点能及300K的Cv，推导单模U=ε(n+1/2)。说明3nR高温极限的计量基准，而不是把这套模型当作下一阶段双原子链的DOS。'},
   {id:'cold',title:'零温：创建与湮灭声子',action:'dynamic_scattering_lab',route:'#compute/dynamic-scattering-lab?preset=scattering-cold',requires:{...scattering,temperature:0},prompt:'记录选定Q的两支能量、裸权重、创建和湮灭权重。代入n=0解释为什么Stokes仍存在、anti-Stokes为零；Gaussian尾部跨过零能量不等于出现热声子。'},
   {id:'warm',title:'只升温到300K并推导详细平衡',action:'dynamic_scattering_lab',route:'#compute/dynamic-scattering-lab?preset=scattering-warm',requires:{...scattering,temperature:300},prompt:'核对两支能量和裸权重与零温一致。逐模用meV单位计算exp[−ε/(0.08617333262145×300)]，与anti-Stokes/Stokes积分权重比比较。解释为何这一比值的检验对象不是展宽后任意能量点的曲线。'}]},
 {id:'bulk-interface-localization',module:'domainwall',title:'从 SSH 体相到界面局域态',question:'体相 Zak 相位怎样约束一个界面，又有哪些现象必须由有限链的空间分布来确认？',rubric:[
  '固定胞内/胞间键与终止方式；给出 t=0.8eV、δ=0.25 到渐近键0.6/1.0eV的换算。',
  '有限链可以同时出现端态和界面态，必须把能量与中心/端点投影、LDOS一起阅读；近零能本身不证明界面局域。',
  '只改变中心在位势，比较手征对称残差与能量分布；η是给定谱展宽，不是求出的寿命。',
  '这里的电子SSH界面独立于标量Landau畴壁；没有从铁电畴壁宽度自动推导电子跃迁或真实材料输运。'],steps:[
   {id:'bulk',title:'固定体相单位胞与 Zak 约定',action:'quantum_geometry_lab',route:'#compute/quantum-geometry-lab?preset=geometry-ssh-topological',requires:{model:'ssh',t1:.6,t2:1},prompt:'记录下带Zak相位和直接能隙，画出胞内t_1=0.6eV、胞间t_2=1eV的键。求解t(1−δ)=0.6、t(1+δ)=1，得到t=0.8eV、δ=0.25；只将渐近键与下一阶段对应，不把周期两带能量逐点认作有限链能级。'},
   {id:'wall',title:'在固定终止的链中连接两种二聚化',action:'domain_wall_lab',route:'#compute/domain-wall-lab?preset=wall-project-ssh',requires:{...wall,onsite:0},prompt:'查看界面左右的键序、全部本征能量与近零能子空间投影。核对远离中心的弱/强键趋于0.6/1.0eV，并分别记录中心和链端权重。解释手征对称、有限长度杂化与子空间整体投影为何都重要。'},
   {id:'potential',title:'只加中心势，观察对称性条件失效',action:'domain_wall_lab',route:'#compute/domain-wall-lab?preset=wall-project-potential',requires:{...wall,onsite:.4},prompt:'其余参数保持不变，仅在中心两个格点加0.4eV在位势。比较手征反对易残差、近零能子空间和E=0的LDOS；解释局域态可移动、杂化或离开所选能窗，而体相Zak值不能单独确定每个有限器件的谱峰。'}]},
 {id:'hund-superexchange',module:'hubbard',title:'区分局域 Hund 自旋与站点间超交换',question:'两个电子的局域高自旋，为什么不能直接推断两站点模型的基态也平行排列？',rubric:[
  '先明确五轨道单离子与两站点单轨道的不同Hilbert空间；两页同为4eV的U是分别给定参数，不代表完成了投影或径向积分映射。',
  '对固定半填充二聚体比较U=4与12eV，保持t=1eV、Δ=0、边界和粒子数一致。',
  '用精确Δ_{ST}=(√(U²+16t²)−U)/2核对，再评估4t²/U近似误差；不能把固定S_z扇区下一能级自动叫作普适自旋隙。',
  '局域Hund交换与站点间虚跃迁的机制不同；两站点结果和电荷增减隙不证明无限晶体的磁序或Mott相变。'],steps:[
   {id:'hund',title:'观察五轨道原子中的 Hund 机制',action:'local_multiplet_lab',route:'#compute/local-multiplet-lab?preset=multiplet-d2-hund',requires:{electrons:2,coordination:'octahedral',splitting:0,coulombU:4,hundJ:.6},prompt:'记录N=2、零晶场、五轨道Kanamori模型的基态S和⟨S²⟩，解释局域Hund交换为何有利于不同轨道上的平行自旋。明确下一阶段是另一个两站点单轨道Hamiltonian，并未将该离子投影成两站点。'},
   {id:'dimer',title:'计算有限 U 的两站点单重态',action:'hubbard_lab',route:'#compute/hubbard-cluster-lab?preset=dimer-half',requires:{...dimer,interactionU:4},prompt:'固定N↑=N↓=1、t=1eV、U=4eV、Δ=0。记录双占据、⟨S_1·S_2⟩、总⟨S²⟩及跨S子空间的单重态–三重态分裂。手算(√32−4)/2，与4t²/U=1eV比较，说明U/t=4时强耦合式仍有明显误差。'},
   {id:'strong',title:'提高 U 检查超交换尺度',action:'hubbard_lab',route:'#compute/hubbard-cluster-lab?preset=dimer-project-strong',requires:{...dimer,interactionU:12},prompt:'只把U改成12eV。用精确式计算(√160−12)/2并与1/3eV比较；记录双占据降低、自旋关联变化和电荷增减隙。解释为什么电荷代价可以增大而单重态–三重态分裂减小，同时不把有限团簇结果当作热力学相变。'}]}
];

const complexValue=z=>typeof z==='number'?num(z):`${num(z?.re)}${Number(z?.im)<0?'':'+'}${num(z?.im)}i`;
export function pathwaysEvidence(record){
 const r=record.result;
 switch(record.action){
  case'band_rep_lab':return `SG${r.spaceGroup.number}；k=(${r.k.map(num).join(', ')})；位点数=${r.site.positions.length}；纤维维数=${r.orbitDimension}；分解=${r.decomposition.terms.map(t=>`${t.multiplicity}×${t.dimension}维`).join(' + ')}${r.screw?.selectedEigenvalues?`；螺旋本征值=${r.screw.selectedEigenvalues.map(complexValue).join(', ')}`:''}；表示校验=${r.checks.passed?'通过':'需核验'}；未计算能带能量`;
  case'analyze':{const i=r.littleGroup.unitaryOperations.findIndex(op=>op.name==='C2z');return `SG${record.input.group_number??'—'}；k=(${record.input.k.map(num).join(', ')})；${record.input.doubleValued?'双值':'单值'}小群阶=${r.littleGroup.order}；不可约维数=${r.irreps.map(x=>x.dimension).join(', ')}${i>=0?`；C2z字符=${r.irreps.map(x=>complexValue(x.characters[i])).join(', ')}`:''}；数值表示校验=${r.validation.passed?'通过':'需核验'}；局部D编号不能跨计算直接匹配`;}
  case'phonon_thermo':return `来源=${r.source}；${r.basisLabel}，n=${r.summary.natom}；3nR=${num(r.summary.dulongPetitLimit)} J/(mol K)；${r.series.map(s=>{const at=s.rows.find(x=>x.temperature===300);return `${s.id}：ZPE=${num(s.zeroPointEnergy)} kJ/mol${at?`，Cv(300K)=${num(at.heatCapacity)} J/(mol K)`:''}`;}).join('；')}；热容与单Q散射强度不同`;
  case'dynamic_scattering_lab':{const s=r.data.selection;return `Q=${num(s.Q)} Å⁻¹；q=${num(s.reducedRLU)}×2π/a；T=${num(r.parameters.temperature)} K；${s.groups.map(g=>`${g.label} ε=${num(g.energy)} meV，I+=${num(g.stokesWeight)}，I−=${num(g.antiStokesWeight)}${g.excluded?'（低能排除）':''}`).join('；')}；详细平衡残差=${num(r.checks.detailedBalanceResidual)}；采样=${r.checks.gridResolved?'已满足当前步长判据':'需加密'}；相对一声子权重`;}
  case'domain_wall_lab':if(r.model==='landau')return `约化畴壁宽度=${num(r.wall.width)}；离散壁能=${num(r.wall.tension)}；连续壁能=${num(r.wall.continuumTension)}；平衡残差=${num(r.checks.stationaryResidual)}；没有自动映射电子SSH参数`;return `SSH有限链=${r.parameters.sites}格点；近零能子空间维数=${r.chain.subspaceCount}；中心权重=${num(r.summary.find(x=>x.label==='子空间中心区域总权重')?.value)}；端点权重=${num(r.summary.find(x=>x.label==='子空间两端六格点总权重')?.value)}；手征残差=${num(r.checks.chiralResidual)}；本征残差=${num(r.checks.eigenResidual)}；需区分端态与界面态`;
  case'hubbard_lab':return `固定(N↑,N↓)=(${r.sector.nUp},${r.sector.nDown})；维数=${r.sector.dimension}；平均双占据=${num(r.ground.averageDoubleOccupancy)}；⟨S²⟩=${num(r.ground.totalSpinSquared)}；近邻⟨S_i·S_j⟩=${num(r.ground.nearestSpinCorrelation)}；Δ_{ST}=${num(r.gaps.dimerSingletTriplet?.gap)} eV；电荷增减隙=${num(r.gaps.chargeGap)} eV；有限团簇，非Mott相变证明`;
  case'quantum_geometry_lab':return `${r.topology.kind}=${num(r.topology.value)}；间隙=${num(r.topology.analyticDirectGap)} eV；周期体相与有限链谱须分别计算`;
  case'local_multiplet_lab':return `N=${r.parameters.electrons}；S=${r.ground.spins.join(', ')}；⟨S²⟩=${num(r.ground.S2)}；五轨道局域模型，不等于两站点单轨道空间`;
  default:return null;
 }
}
