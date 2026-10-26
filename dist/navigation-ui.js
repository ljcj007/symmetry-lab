// Shared entry points. A tool keeps one implementation even when a lesson links to it.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const toolGroups=[
 {id:'structure',title:'结构与晶胞',summary:'从真实结构出发，确定群与坐标约定。',tools:[
  ['structure','结构标准化 · BC 晶胞','导入 POSCAR / CIF，识别空间群，转换原胞、原点和波矢。','POSCAR CIF spglib 原胞'],
 ]},
 {id:'representation',title:'表示与共表示',summary:'从对称操作得到量子态的分类。',tools:[
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
 return entries.filter(item=>terms.every(term=>(item.title+' '+item.summary+' '+(item.keywords||'')).toLocaleLowerCase().includes(term))).slice(0,limit);
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
 if(!catalogPromise)catalogPromise=Promise.all(['pointgroup-lessons','symmetry-course-lessons','lie-group-lessons','symmetry-materials'].map(async name=>{const r=await fetch(`data/${name}.json?v=20261026-redesign1`);if(!r.ok)throw Error('课程索引暂未载入');return r.json();})).then(([pg,sg,lie,materials])=>[
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
  ['atlas/materials','晶体与磁性材料','NaCl、Si、GaAs、Fe、NiO、MnF₂：结构、磁矩与三维操作。'],
  ['classroom/spin','双群、色群与自旋群专题','按点群与三维空间群学习；明确教学实例的适用范围。']
 ].map(([r,t,s])=>`<article>${link(r,`<h2>${t}</h2><p>${s}</p><span class="nav-card-go">浏览 →</span>`,'nav-atlas-card')}</article>`).join('')}</div>`;
 else {
  const recent=readSaved('symmetry-lab.recent.v1').map(route=>knownTool(route)||{route,title:route.startsWith('classroom')?'继续上次课程':route.startsWith('atlas')?'继续浏览图谱':route,summary:'恢复上次访问的位置',kind:'最近'});
  body.innerHTML=`<section class="nav-home-hero"><span class="nav-card-kicker">SYMMETRY LAB</span><h2>理解对称性，<br>再把它用于计算。</h2><p>从一节课程、一份晶体结构，或一个表示出发。</p><div class="nav-home-actions">${link('classroom','开始学习 →','primary')}${link('compute','开始计算 →','secondary')}${link('atlas','浏览群与材料','text-button')}</div></section><section class="nav-path-section"><h2>三条常用路径</h2><div class="nav-card-grid">${[
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
