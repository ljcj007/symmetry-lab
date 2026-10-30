// Shared entry points. A tool keeps one implementation even when a lesson links to it.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const toolGroups=[
 {id:'observables',title:'声子光谱与物性',summary:'从原胞位移和对称操作，计算光谱选择定则与允许响应。',tools:[
  ['compute/manybody-spectra-lab','多体谱函数 · 添加、移除与响应','有限Hubbard团簇的真实跃迁矩阵元、谱权重和规则与峰态联动。','Lehmann 多体 谱函数 自旋 响应'],
  ['compute/dynamic-scattering-lab','非弹性散射 · 动态结构因子','双原子链、偏振投影、热占据、Stokes/anti-Stokes 与 S(Q,E) 热图。','非弹性 散射 DSF 动态结构因子 phonon'],
  ['compute/spin-resonance-lab','磁共振 · 有效自旋与 EPR','各向异性 g、零场分裂、超精细作用、磁场方向与磁偶极跃迁谱。','EPR ESR resonance 磁共振 有效自旋 超精细'],
  ['compute/atomic-spectra-lab','多重态光谱 · 偏振 XAS','完整 Slater、SOC 与 d⁸/d⁹ 原子近似的 2p→3d 偏振吸收。','XAS XMCD XLD 多重态 偏振 选择定则 Slater'],
  ['compute/phonons','Γ 点声子 · IR / Raman 光谱','Si、GaAs、NaCl 的机械表示、声学 / 光学分解、三维位移与偏振选择定则。','声子 振动 红外 拉曼 Raman phonon 光谱'],
  ['compute/phonon-modes','声子模式 · 分类与冻结结构','Γ 点简并子空间、相容超胞、POSCAR / CIF 冻结模导出。','Phonopy irrep 冻结模 对称 声子'],
  ['compute/phonon-thermo','声子热力学 · F / S / Cv','Einstein / Debye、加权网格与总 DOS、Phonopy 热性质导入。','热容 自由能 熵 热力学 Debye Einstein'],
  ['compute/qha-lab','准谐近似 · 热膨胀与 Cp','多体积静态能与振动自由能、平衡体积、体模量和导数收敛。','QHA 准谐 热膨胀 定压热容 Phonopy 自由能'],
  ['compute/phonopy','Phonopy · 声子数据导入','读取 band / qpoints YAML、复本征矢、分段色散与 DOS。','Phonopy phonon band yaml DOS 软模 虚频'],
  ['compute/hall-response-lab','反常霍尔与横向热电 · 内禀响应','QWZ 两带、有限温度占据、σxy、αxy 与网格收敛。','Hall Nernst Berry 反常 霍尔 横向 热电'],
  ['compute/electron-transport-lab','电子输运与热电 · 常数弛豫时间','完整布里渊区加权网格、载流子、σ/τ、Seebeck 与 κₑ/τ。','transport 电子 输运 热电 Seebeck Boltzmann'],
  ['compute/shg-lab','非线性光学 · 旋转各向异性 SHG','Td / 4mm / Oh 的倍频张量、晶面取向、偏振通道与相对光强。','SHG 倍频 非线性 光学 GaAs BaTiO3 偏振'],
  ['compute/tensors','物性张量 · 精确对称约束','介电、弹性、压电与磁电张量；点群预设、自定义生成元与旋转响应。','介电 弹性 压电 磁电 Neumann tensor'],
 ]},
 {id:'structure',title:'结构、相变与衍射',summary:'从真实结构出发，确定群与坐标约定。',tools:[
  ['compute/order-parameter-lab','序参量 · 不变量与对称性破缺','从群操作生成多项式不变量，追踪序参量方向、稳定子群与畴。','Landau 序参量 子群 破缺 不变量'],
  ['compute/domain-wall-lab','畴壁与局域态 · 连续场和 SSH 界面','梯度自由能、壁宽、壁能、网格诊断和界面局域谱。','domain wall 畴壁 界面 局域态 SSH'],
  ['compute/phase','结构相变 · 自由能与畴','Landau 驻点、稳定性、理想 BaTiO₃ 极性畸变及六个畴。','相变 Landau 序参量 畴 铁电'],
  ['compute/distortion-modes','结构畸变 · 模式分解与耦合','同胞结构对、原子对应、模式投影与重构，两序参量自由能。','畸变 分解 结构匹配 极性 八面体 模式耦合 BaTiO3 SrTiO3'],
  ['compute/diffraction','衍射 · 结构因子与消光','原子相位、格心与基底消光、螺旋轴条件和粉末棒谱。','XRD 衍射 消光 structure factor'],
  ['structure','结构标准化 · BC 晶胞','导入 POSCAR / CIF，识别空间群，转换原胞、原点和波矢。','POSCAR CIF spglib 原胞'],
 ]},
 {id:'representation',title:'表示与共表示',summary:'从对称操作得到量子态的分类。',tools:[
  ['compute/band-representation-lab','Wyckoff 位点 → 能带表示','精选三维空间群的位点轨道、Bloch 作用和小群分解。','Wyckoff 位点 诱导 band representation EBR'],
  ['workbench','不可约表示与磁共表示','空间群、磁空间群与磁点群；单值、双值、小群和全 k 星。','SOC 不可约 特征标 Bilbao BC'],
  ['compute/advanced/symbolic_spacegroups','符号空间群表示','沿符号 k 线构造精确小表示、共表示与诱导表示。','符号 k星'],
  ['compute/advanced/symbolic_interfaces','表示矩阵与投影','共核、交织算符、投影和半线性表示验证。','交织 投影 共核'],
 ]},
 {id:'coupling',title:'张量积与重耦合',summary:'分解复合体系，在不同耦合基底间换基。',tools:[
  ['products','晶体群 · 全 k 星直积分解','选定两个波矢与表示，求输出波矢和不可约分量。','空间群 磁群 tensor'],
  ['compute/lie/su2_coupling','SU(2) · 角动量耦合','两自旋耦合、CG 系数与交换能级。','SU2 自旋'],
  ['compute/lie/su3_tensor','SU(3) · 表示与直积','Dynkin 标签、表示维数、权和直积分解。','SU3 表示'],
  ['compute/lie/su3_cg','SU(3) · CG 系数与换基','数值与精确根式系数、复振幅和双向基底变换。','Clebsch Gordan'],
  ['compute/lie/su3_racah','SU(3) · Racah / 6j','三重张量积的重耦合矩阵与外重数。','Racah 三重 6j'],
  ['compute/lie/su3_ninej','SU(3) · 9j 与四重重耦合','高维输入、精确系数、通道概率与逆向换基。','四重 8 10 15 27'],
 ]},
 {id:'models',title:'Hamiltonian 与能带',summary:'构造模型并将对称性用于能带分析。',tools:[
  ['compute/exchange-symmetry-lab','键对称性 · 磁交换与 DMI','轴向量、端点交换约束、交换张量分解与自旋倾斜。','Moriya DMI 反对称交换'],
  ['compute/conservation-lab','连续对称性 · 守恒与简并诊断','逐项对易子、耗散守恒条件、时间反演和一致换基。','Noether 诺特 生成元 守恒 Kramers'],
  ['compute/polaron-lab','电子—声子耦合 · Holstein 极化子','二站点量子声子、电子—晶格关联与截断收敛。','Holstein 极化子 电子声子 耦合'],
  ['compute/density-matrix-lab','密度矩阵 · 纠缠与退相干','一到两个自旋的部分迹、Bloch轨迹、纯度、负性与Lindblad演化。','density Lindblad 纠缠 退相干 Rabi'],
  ['compute/symmetry-workshop','对称性推导工坊 · 允许项到能带','开关生成元，追踪二阶自旋模型的系数约束与能带。','Rashba 时间反演 镜面 推导 k.p'],
  ['compute/hubbard-cluster-lab','Hubbard 小团簇 · 关联与交换','2–4格点精确对角化、双占据、自旋关联与有限团簇能隙。','Hubbard 关联 强关联 超交换 ED'],
  ['compute/andreev-lab','超导结 · Andreev 反射','正常金属—超导接触的电子/空穴反射、电导与通量检查。','Andreev NS BdG 超导 反射 接触'],
  ['compute/device-transport-lab','器件量子输运 · 双电极与透射','均匀 / SSH 链、接触、势垒、Landauer 电导与局域谱。','Landauer device 器件 电极 透射 散射'],
  ['compute/local-multiplet-lab','多电子晶场 · Hund 与多重态','固定 N 五轨道 Kanamori、自旋分类、轨道占据与高低自旋竞争。','Hund Kanamori multiplet 多电子 多重态 晶场'],
  ['compute/crystal-field-lab','晶场与轨道 · SOC 与 Jahn–Teller','d 轨道与配位、立方和四方分裂、自旋轨道耦合与 E⊗e 模型。','orbital crystal field 晶场 轨道 SOC Jahn Teller NiO'],
  ['compute/quantum-geometry-lab','量子几何 · 度规与拓扑诊断','SSH / QWZ 模型、Berry 曲率、量子度规、闭隙和网格收敛。','quantum metric 量子 度规 Berry Chern Zak 拓扑'],
  ['compute/pairing-lab','超导配对 · 能隙与 BdG','方格单态 s / d 波、复配对，以及 Kitaev 链的体谱与端态。','superconductivity BdG 超导 配对 能隙 节点 Kitaev'],
  ['compute/unfold-lab','超胞与缺陷 · 能带展开','一维紧束缚超胞、杂质势、二聚化与原胞投影谱权重。','unfolding band 超胞 缺陷 展开 谱权重'],
  ['compute/band-connectivity','能带相容关系与连接','Γ–X 表示分支、镜面保护交叉、破缺开隙与 SOC 模型。','compatibility C4v Rashba SOC 能带连接'],
  ['compute/magnon-lab','磁振子 · 交换与自旋波','XXZ 铁磁 / 反铁磁链、模式进动、偏振、外场与稳定性。','magnon spin wave 磁振子 自旋波 交换 各向异性 Goldstone'],
  ['magnetictb','紧束缚模型与拓扑','对称性约束建模、能带、薄膜、表面谱、Wilson 环与 Chern 数。','MagneticTB Berry hr'],
  ['compute/advanced/symbolic','符号 Hamiltonian 与 k·p','精确跃迁约束、Bloch 矩阵、参数表达式和多项式轨道。','SymPy Hamiltonian'],
  ['bands','能带特征标匹配','导入 trace / JSON，将能带特征标分解到当前群的表示。','DFT trace'],
 ]},
 {id:'algebra',title:'群分类与精确代数',summary:'使用矩阵生成元、整数格和仿射扩张研究群。',tools:[
  ['crystkit','仿射操作与晶体群工具','群闭合、点轨道、坐标变换、生成元及三维参考匹配。','CrystKit'],
  ['compute/advanced/carat','高维有理类 · CARAT','检索 1–6 维 Q 类代表，查看矩阵与分类依据。','Q类 高维 CARAT'],
  ['compute/advanced/carat_integral','整数类与仿射类','在有理类内研究 Z 类、仿射类与完整性证书。','Z类 仿射'],
  ['compute/advanced/integral_normalizer','整数正规化子','求保持给定整数点群的整系数基变换。','正规化子'],
  ['compute/advanced/arithmetic_centralizer','算术中心化子','计算交换子整数序、中心分解与单位群。','中心化子'],
  ['compute/advanced/crystkit_ext','群扩张与生成元','向量系统、扩张轨道、无限空间群生成元与无挠性。','上同调 扩张'],
 ]}
];
export const toolsIndex=toolGroups.flatMap(group=>group.tools.map(([route,title,summary,keywords])=>({route,title,summary,keywords,kind:'计算',category:group.id})));
export const knownTool=route=>toolsIndex.find(t=>t.route===String(route||'').replace(/^#/,''));
export function searchEntries(entries,query,limit=30){
 const terms=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 if(!terms.length)return [];
 const score=item=>terms.reduce((n,term)=>n+(item.title.toLocaleLowerCase().includes(term)?4:0)+(String(item.keywords||'').toLocaleLowerCase().includes(term)?2:0),0);
 return entries.filter(item=>terms.every(term=>(item.title+' '+item.summary+' '+(item.keywords||'')).toLocaleLowerCase().includes(term))).sort((a,b)=>score(b)-score(a)).slice(0,limit);
}
const readSaved=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string'&&/^[a-z0-9_/?=&.%+-]+$/i.test(v)).slice(0,20):[];}catch{return [];}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Session-only navigation remains usable. */}};
export const favoriteRoutes=()=>readSaved('symmetry-lab.favorites.v1').filter(knownTool);
export function rememberRoute(route){if(['home','compute','atlas','classroom','docs'].includes(route))return;save('symmetry-lab.recent.v1',[route,...readSaved('symmetry-lab.recent.v1').filter(x=>x!==route)].slice(0,6));}
export function toggleFavorite(route){if(!knownTool(route))return favoriteRoutes();const old=favoriteRoutes();const next=old.includes(route)?old.filter(x=>x!==route):[...old,route];save('symmetry-lab.favorites.v1',next);return next;}
const link=(route,label,cls='')=>`<a class="${cls}" href="#${esc(route)}" data-route="${esc(route)}">${label}</a>`;
function toolCard(item,favorites){return `<article class="nav-tool-card">${link(item.route,`<span class="nav-card-kicker">${item.kind}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><span class="nav-card-go">打开工具 →</span>`)}<button type="button" class="nav-favorite" data-favorite="${esc(item.route)}" aria-pressed="${favorites.includes(item.route)}" aria-label="${favorites.includes(item.route)?'取消收藏':'收藏'}${esc(item.title)}">${favorites.includes(item.route)?'★':'☆'}</button></article>`;}
let catalogPromise;
async function learningEntries(){
 if(!catalogPromise)catalogPromise=Promise.all(['pointgroup-lessons','symmetry-course-lessons','lie-group-lessons','symmetry-materials','material-observables','structure-dynamics','material-research','coupled-materials','electronic-materials','quantum-materials','response-materials','spectroscopy-materials','pathways-materials','bridges-materials','principles-materials'].map(async name=>{const r=await fetch(`data/${name}.json?v=20261030-symmetry1`);if(!r.ok)throw Error('课程索引暂未载入');return r.json();})).then(([pg,sg,lie,materials,observables,dynamics,research,coupled,electronic,quantum,response,spectroscopy,pathways,bridges,principles])=>[
  {route:'docs/dictionary',title:'公式与符号词典',summary:'按主题解释变量、单位、坐标约定与公式适用条件。',keywords:'公式 符号 单位 dictionary',kind:'词典'},
  ...principles.lessons.map(l=>({route:'classroom/'+principles.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 对称 破缺 DMI 守恒 不变量',kind:'课程'})),
  ...principles.cases.map(c=>({route:'atlas/principles?material='+encodeURIComponent(c.id)+'&module='+c.module,title:c.title,summary:c.summary,keywords:c.id+' 序参量 交换 守恒',kind:'材料'})),
  ...bridges.lessons.map(l=>({route:'classroom/'+bridges.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 多体 谱函数 极化子 密度矩阵 对称性',kind:'课程'})),
  ...bridges.cases.map(c=>({route:'atlas/bridges?material='+encodeURIComponent(c.id)+'&module='+c.module,title:c.title,summary:c.summary,keywords:c.id+' 多体 极化子 退相干',kind:'材料'})),
  ...pathways.lessons.map(l=>({route:'classroom/'+pathways.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 位点 散射 畴壁 Hubbard',kind:'课程'})),
  ...pathways.cases.map(c=>({route:'atlas/pathways?material='+encodeURIComponent(c.id)+'&module='+c.module,title:c.title,summary:c.summary,keywords:c.id+' 位点 散射 畴壁 Hubbard',kind:'材料'})),
  ...spectroscopy.lessons.map(l=>({route:'classroom/'+spectroscopy.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 磁共振 超导 反射 多重态 偏振 XAS',kind:'课程'})),
  ...spectroscopy.cases.map(c=>({route:'atlas/spectroscopy?material='+encodeURIComponent(c.id)+'&module='+c.module,title:c.title,summary:c.summary,keywords:c.id+' EPR Andreev XAS',kind:'材料'})),
  ...response.lessons.map(l=>({route:"classroom/"+response.modules.find(m=>m.id===l.module).pathway+"?module="+l.module+"&lesson="+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+" 霍尔 横向 热电 器件 多电子 Hund",kind:"课程"})),
  ...response.cases.map(c=>({route:"atlas/response?material="+encodeURIComponent(c.id)+"&module="+c.module,title:c.title,summary:c.summary,keywords:c.id+" 响应 透射 多电子",kind:"材料"})),
  {route:"atlas/projects",title:"跨模块项目作业",summary:"从研究问题到计算证据与解释，保存可复现的项目报告。",keywords:"项目 作业 报告 证据 研究",kind:"项目"},
  ...quantum.lessons.map(l=>({route:"classroom/"+quantum.modules.find(m=>m.id===l.module).pathway+"?module="+l.module+"&lesson="+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+" 晶场 轨道 量子几何 度规 输运 热电",kind:"课程"})),
  ...quantum.cases.map(c=>({route:"atlas/quantum?material="+encodeURIComponent(c.id)+"&module="+c.module,title:c.title,summary:c.summary,keywords:c.id+" 晶场 拓扑 热电",kind:"材料"})),
  ...electronic.lessons.map(l=>({route:"classroom/"+electronic.modules.find(m=>m.id===l.module).pathway+"?module="+l.module+"&lesson="+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+" 超导 BdG SHG 能带展开",kind:"课程"})),
  ...electronic.cases.map(c=>({route:"atlas/electronic?material="+encodeURIComponent(c.id)+"&module="+c.module,title:c.title,summary:c.summary,keywords:c.id+" 配对 非线性 光学 超胞",kind:"材料"})),
  ...coupled.lessons.map(l=>({route:'classroom/'+coupled.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 畸变 磁振子 自旋波 QHA 热膨胀',kind:'课程'})),
  ...coupled.cases.map(c=>({route:'atlas/mechanisms?material='+encodeURIComponent(c.id),title:c.title+' · 材料机制',summary:c.summary,keywords:c.id+' 畸变 模式耦合 磁交换 热膨胀',kind:'材料'})),
  ...research.lessons.map(l=>({route:'classroom/'+research.modules.find(m=>m.id===l.module).pathway+'?module='+l.module+'&lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:l.module+' 材料 声子 能带 热力学',kind:'课程'})),
  ...research.cases.map(c=>({route:'atlas/research?material='+encodeURIComponent(c.id),title:c.title+' · 材料分析',summary:c.summary,keywords:c.id+' 模式 冻结 能带 热力学',kind:'材料'})),
  ...dynamics.lessons.map(l=>({route:'classroom/structure-dynamics?lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:'相变 衍射 Phonopy '+l.id,kind:'课程'})),
  ...dynamics.cases.map(c=>({route:'atlas/dynamics?material='+encodeURIComponent(c.id),title:c.formula+' · 材料研究路线',summary:c.summary,keywords:c.id+' 相变 衍射 声子',kind:'材料'})),
  ...observables.lessons.map(l=>({route:'classroom/observables?lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:'物性 声子 光谱 张量 '+l.id,kind:'课程'})),
  ...pg.lessons.map(l=>({route:'classroom/foundations?lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:'点群 基础 '+l.id,kind:'课程'})),
  ...sg.lessons.map(l=>({route:'classroom/'+(['double','magnetic','color','spin'].includes(l.track)?'spin':'crystal')+'?lesson='+encodeURIComponent(l.id)+'&track='+encodeURIComponent(l.track),title:l.title,summary:l.summary,keywords:l.track+' '+l.id,kind:'课程'})),
  ...lie.lessons.map(l=>({route:'classroom/'+(/cg|racah|ninej|tensor|coupling/.test(l.lab||'')?'coupling':'continuous')+'?lesson='+encodeURIComponent(l.id),title:l.title,summary:l.summary,keywords:'SU2 SU3 李群 '+l.id,kind:'课程'})),
  ...materials.materials.map(m=>({route:'atlas/materials?material='+encodeURIComponent(m.id),title:m.formula+' · '+m.name,summary:m.summary,keywords:m.category+' '+m.id,kind:'材料'}))
 ]).catch(error=>{catalogPromise=null;throw error;});return catalogPromise;
}
export async function renderNavigationHub({container,view='home',databases}){
 const favorites=favoriteRoutes();
 container.innerHTML=`<div class="nav-hub"><section class="nav-search-panel"><label for="site-search">${view==='compute'?'查找计算工具':view==='atlas'?'搜索群、材料与课程':'从一个问题开始'}</label><div class="nav-search-row"><input id="site-search" type="search" placeholder="试试：SU3、9j、螺旋、NaCl、225、POSCAR" autocomplete="off"><span id="site-search-status">正在准备检索索引…</span></div><div id="site-search-results" aria-live="polite"></div></section><div id="hub-body"></div></div>`;
 const root=container.firstElementChild,current=()=>root.parentNode===container&&container.isConnected!==false;
 const body=root.querySelector('#hub-body');
 if(view==='compute')body.innerHTML=`<p class="nav-introduction">按计算任务选择工具。课堂中的 CG、6j、9j 与这里使用同一套计算器；收藏后可从总览直接打开。</p><nav class="nav-category-links" aria-label="计算任务分类">${toolGroups.map(g=>`<button type="button" data-category="${g.id}">${g.title}</button>`).join('')}</nav>${toolGroups.map(g=>`<section class="nav-tool-section" id="tools-${g.id}"><header><h2>${g.title}</h2><p>${g.summary}</p></header><div class="nav-card-grid">${toolsIndex.filter(t=>t.category===g.id).map(t=>toolCard(t,favorites)).join('')}</div></section>`).join('')}`;
 else if(view==='atlas')body.innerHTML=`<p class="nav-introduction">从群的操作和材料结构查起，再进入对应课程或计算。每个入口复用现有目录和三维模型。</p><div class="nav-card-grid nav-atlas-grid">${[
  ['atlas/pointgroups','32 晶体学点群','旋转、镜面、反演与特征标，连接基础课程。'],
  ['atlas/sg','230 空间群','编号、国际符号、操作与晶格；打开表示计算。'],
  ['atlas/msg','1,651 磁空间群','BNS / OG 编号、四类磁群与共表示入口。'],
  ['atlas/mpg','122 磁点群','磁点群目录、时间反演与共表示。'],
  ['atlas/materials','晶体与磁性材料','NaCl、Si、GaAs、Fe、NiO、MnF₂：结构、磁矩与三维操作；连接声子、光谱及物性张量。'],
  ['atlas/research','材料分析工作流','声子分类 → 冻结结构；能带相容关系；热力学与可恢复研究记录。'],
  ['atlas/principles','对称性、破缺与守恒','从序参量、键交换张量到生成元，追踪约束来源与物理后果。'],
  ['atlas/bridges','多体谱、极化子与量子态','从多体跃迁、电子晶格关联走到纠缠和退相干，配对称性推导工坊。'],
  ['atlas/compare','参数对照与预测验证','固定A再计算B，比较同一工具的输入、可比曲线和数值差异。'],
  ['atlas/pathways','位点、散射、畴壁与关联','从实空间位点走到能带表示、实验散射与空间及电子关联。'],
  ['docs/dictionary','公式与符号词典','查看变量含义、单位、坐标与适用条件，联动推导与实验。'],
  ['atlas/spectroscopy','磁共振、超导结与偏振光谱','从有效自旋和电子空穴散射走到原子多重态的光谱信号。'],['atlas/response','横向响应、器件与多电子态','连接 Berry 几何、电极散射与局域多电子相互作用。'],
  ['atlas/projects','跨模块项目作业','收录计算证据、撰写推导解释、导出完整项目和研究报告。'],
  ['atlas/quantum','轨道、量子几何与电子输运','从局域 d 轨道走到 Bloch 波函数几何与热电响应。'],
  ['atlas/electronic','电子配对、倍频与缺陷能带','从配对能隙、GaAs / BaTiO₃ 非线性光学，走到超胞谱权重。'],
  ['atlas/mechanisms','畸变、磁激发与有限温度','结构模式耦合 → 磁交换与自旋波 → 多体积自由能与热膨胀。'],
  ['atlas/notebook','我的材料研究记录','在本机保存计算输入、结果、约定和解释，导出项目后可恢复和重算。'],
  ['atlas/dynamics','结构、相变与实验案例','BaTiO₃ 极性畴；Si、NaCl、GaAs 衍射；自己的 Phonopy 数据。'],
  ['classroom/spin','双群、色群与自旋群专题','按点群与三维空间群学习；明确教学实例的适用范围。']
 ].map(([r,t,s])=>`<article>${link(r,`<h2>${t}</h2><p>${s}</p><span class="nav-card-go">浏览 →</span>`,'nav-atlas-card')}</article>`).join('')}</div>`;
 else {
  const recent=readSaved('symmetry-lab.recent.v1').map(route=>knownTool(route)||{route,title:route.startsWith('classroom')?'继续上次课程':route.startsWith('atlas')?'继续浏览图谱':route,summary:'恢复上次访问的位置',kind:'最近'});
  body.innerHTML=`<section class="nav-home-hero"><span class="nav-card-kicker">SYMMETRY LAB</span><h2>理解对称性，<br>再把它用于计算。</h2><p>从一节课程、一份晶体结构，或一个表示出发。</p><div class="nav-home-actions">${link('classroom','开始学习 →','primary')}${link('compute','开始计算 →','secondary')}${link('atlas','浏览群与材料','text-button')}</div></section><section class="nav-path-section"><h2>常用学习与计算路径</h2><div class="nav-card-grid">${[
  ['atlas/research','完成一份材料分析','模式识别 → 冻结模 / 能带连接 / 热力学 → 研究记录'],
  ['atlas/principles','对称性、破缺与守恒','从序参量、键交换张量到生成元，追踪约束来源与物理后果。'],
  ['atlas/bridges','多体谱、极化子与量子态','从多体跃迁、电子晶格关联走到纠缠和退相干，配对称性推导工坊。'],
  ['atlas/compare','参数对照与预测验证','固定A再计算B，比较同一工具的输入、可比曲线和数值差异。'],
  ['atlas/pathways','位点、散射、畴壁与关联','从实空间位点走到能带表示、实验散射与空间及电子关联。'],
  ['docs/dictionary','公式与符号词典','查看变量含义、单位、坐标与适用条件，联动推导与实验。'],
  ['atlas/spectroscopy','磁共振、超导结与偏振光谱','从有效自旋和电子空穴散射走到原子多重态的光谱信号。'],['atlas/response','横向响应、器件与多电子态','连接 Berry 几何、电极散射与局域多电子相互作用。'],
  ['atlas/projects','跨模块项目作业','收录计算证据、撰写推导解释、导出完整项目和研究报告。'],
  ['atlas/quantum','轨道、量子几何与电子输运','从局域 d 轨道走到 Bloch 波函数几何与热电响应。'],
  ['atlas/electronic','电子配对、倍频与缺陷能带','从配对能隙、GaAs / BaTiO₃ 非线性光学，走到超胞谱权重。'],
  ['atlas/mechanisms','连接材料结构与激发','畸变模式 → 磁振子 → 准谐热膨胀与 Cp'],
  ['classroom/structure-dynamics','从结构走到实验','相变与畴 → 衍射消光 → Phonopy 数据'],
  ['classroom/observables','从材料理解物性','Si / GaAs / NaCl → 声子光谱 → 物性张量'],
  ['classroom/foundations','从零学群论','对称操作 → 表示与特征标 → 晶体与自旋'],
  ['structure','分析晶体结构','导入结构 → 标准晶胞 → 群表示 → 能带匹配'],
  ['compute/lie/su3_cg','计算表示耦合','直积分解 → CG 换基 → 6j / 9j 重耦合']
 ].map(([r,t,s])=>`<article>${link(r,`<h3>${t}</h3><p>${s}</p><span class="nav-card-go">进入 →</span>`,'nav-atlas-card')}</article>`).join('')}</div></section><section class="nav-tool-section"><h2>我的常用工具</h2>${favorites.length?`<div class="nav-card-grid">${favorites.map(r=>toolCard(knownTool(r),favorites)).join('')}</div>`:`<p class="nav-empty">在计算中心点击 ☆ 收藏工具。${link('compute','浏览全部计算工具 →')}</p>`}</section>${recent.length?`<section class="nav-tool-section"><h2>最近访问</h2><div class="nav-recent">${recent.map(t=>link(t.route,esc(t.title))).join('')}</div></section>`:''}`;
 }
 root.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>root.querySelector('#tools-'+button.dataset.category)?.scrollIntoView({behavior:'smooth',block:'start'}));
 root.querySelectorAll('[data-favorite]').forEach(button=>button.onclick=()=>{const selected=toggleFavorite(button.dataset.favorite).includes(button.dataset.favorite);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',(selected?'取消收藏':'收藏')+knownTool(button.dataset.favorite).title);button.textContent=selected?'★':'☆';});
 let entries=[...toolsIndex];
 if(databases)for(const [mode,list] of [['sg',databases.sg?.groups],['msg',databases.msg?.groups],['mpg',databases.mpg?.points]])for(const g of list||[])entries.push({route:'atlas/'+mode+'?q='+encodeURIComponent(String(mode==='sg'?g.number:g.id)),title:(mode==='sg'?'空间群 ':mode==='msg'?'磁空间群 ':'磁点群 ')+(mode==='sg'?g.number:g.id)+' · '+(g.bcSymbol||g.symbol),summary:g.ogId?'OG '+g.ogId:g.pointGroup||g.lattice||'',keywords:[g.symbol,g.bcSymbol,g.ogId].filter(Boolean).join(' '),kind:'群目录'});
 const input=root.querySelector('#site-search'),results=root.querySelector('#site-search-results'),status=root.querySelector('#site-search-status');
 const update=()=>{const query=input.value.trim();if(!query){results.innerHTML='';return;}const found=searchEntries(entries,query);results.innerHTML=found.length?`<ul class="nav-search-list">${found.map(t=>`<li>${link(t.route,`<span>${esc(t.kind)}</span><strong>${esc(t.title)}</strong><small>${esc(t.summary)}</small>`)}</li>`).join('')}</ul>`:'<p class="nav-empty">没有找到匹配内容，请尝试群编号、材料名称或计算名称。</p>';};
 input.oninput=update;
 try{entries.push(...await learningEntries());if(current()){status.textContent='工具 · 课程 · 群目录 · 材料';update();}}catch{if(current())status.textContent='工具与群目录可检索；课程索引暂不可用';}
}
