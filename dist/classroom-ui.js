import {createResourceLoader} from './resource-loader.js?v=20261031-entry2';
const courseDefinitions={
'frontiers':{load:()=>import('./frontiers-ui.js?v=20261031-entry2'),render:'renderFrontiersView',result:'getFrontiersResult'}
,'connections':{load:()=>import('./connections-ui.js?v=20261031-entry2'),render:'renderConnectionsView',result:'getConnectionsResult'}
,'construction':{load:()=>import('./construction-ui.js?v=20261031-entry2'),render:'renderConstructionView',result:'getConstructionResult'}
,'principles':{load:()=>import('./principles-ui.js?v=20261031-entry2'),render:'renderPrinciplesView',result:'getPrinciplesResult'}
,'bridges':{load:()=>import('./bridges-ui.js?v=20261031-entry2'),render:'renderBridgesView',result:'getBridgesResult'}
,'pathways':{load:()=>import('./pathways-ui.js?v=20261031-entry2'),render:'renderPathwaysView',result:'getPathwaysResult'}
,'spectroscopy':{load:()=>import('./spectroscopy-ui.js?v=20261031-entry2'),render:'renderSpectroscopyView',result:'getSpectroscopyResult'}
,'response-materials':{load:()=>import('./response-materials-ui.js?v=20261031-entry2'),render:'renderResponseMaterialsView',result:'getResponseMaterialsResult'}
,'pointgroups':{load:()=>import('./pointgroup-ui.js?v=20261031-entry2'),render:'renderPointgroupView',result:'getPointgroupResult'}
,'academy':{load:()=>import('./symmetry-course-ui.js?v=20261031-entry2'),render:'renderSymmetryCourseView',result:'getSymmetryCourseResult'}
,'lie':{load:()=>import('./lie-group-ui.js?v=20261031-entry2'),render:'renderLieGroupView',result:'getLieGroupResult'}
,'observables':{load:()=>import('./observables-ui.js?v=20261031-entry2'),render:'renderObservablesView',result:'getObservablesResult'}
,'dynamics':{load:()=>import('./structure-dynamics-ui.js?v=20261031-entry2'),render:'renderStructureDynamicsView',result:'getStructureDynamicsResult'}
,'material-research':{load:()=>import('./material-research-ui.js?v=20261031-entry2'),render:'renderMaterialResearchView',result:'getMaterialResearchResult'}
,'coupled-materials':{load:()=>import('./coupled-materials-ui.js?v=20261031-entry2'),render:'renderCoupledMaterialsView',result:'getCoupledMaterialsResult'}
,'electronic-materials':{load:()=>import('./electronic-materials-ui.js?v=20261031-entry2'),render:'renderElectronicMaterialsView',result:'getElectronicMaterialsResult'}
,'quantum-materials':{load:()=>import('./quantum-materials-ui.js?v=20261031-entry2'),render:'renderQuantumMaterialsView',result:'getQuantumMaterialsResult'}
,'flagship':{load:()=>import('./shg-flagship.js?v=20261031-entry2'),render:'renderSHGFlagship',result:'getSHGFlagshipResult'}
};
const courseModules=createResourceLoader(key=>courseDefinitions[key].load());
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Physical course modules retain their IDs, URLs and independent progress keys.
export const classroomSections=[{id:'flagship',slug:'shg-flagship',title:'SHG 旗舰实验'},{id:'frontiers',slug:'frontiers',title:'层群、手性与多体拓扑'},{id:'connections',slug:'connections',title:'同粒子、缺陷与互易响应'},{id:'construction',slug:'construction',title:'表示构造、超胞与能带连接'},{id:'principles',slug:'principles',title:'对称性、破缺与守恒'},{id:'bridges',slug:'bridges',title:'多体谱、极化子与量子态'},{id:'pathways',slug:'pathways',title:'位点、散射、畴壁与关联'},{id:'spectroscopy',slug:'spectroscopy',title:'磁共振、超导结与多重态光谱'},{id:'response-materials',slug:'response',title:'横向响应、器件与多电子态'},{id:'quantum-materials',slug:'quantum',title:'轨道、量子几何与电子输运'},{id:'electronic-materials',slug:'electronic',title:'电子配对、非线性光学与能带展开'},{id:'coupled-materials',slug:'mechanisms',title:'畸变、磁激发与热膨胀'},{id:'material-research',slug:'research',title:'材料分析专题'},{id:'pointgroups',slug:'pointgroups',title:'基础与点群'},{id:'academy',slug:'crystal',title:'晶体对称与内部自由度'},{id:'lie',slug:'lie',title:'连续群与表示'},{id:'observables',slug:'observables',title:'材料物性与光谱'},{id:'dynamics',slug:'structure-dynamics',title:'结构、相变与实验'}];
export const classroomPathways=[
  {id:'foundations',section:'pointgroups',title:'基础与表示',summary:'从对称操作、群与特征标开始，建立读懂表示的语言。',level:'入门',prerequisite:'向量与矩阵基础',links:[['三层对称性诊断','module=audit'],['置换群与同粒子统计','module=statistics'],['对称适应基与统一选择定则','module=salc'],['32 点群与特征标',''],['对称操作演示','tab=lab'],['概念练习','tab=quiz']]},
  {id:'crystal',section:'academy',track:'space',title:'晶体对称',summary:'把点群推广到三维周期结构，理解平移、螺旋轴和滑移面。',level:'基础 → 进阶',prerequisite:'点群与表示',links:[['层群、表面与界面对称性','module=layers'],['螺旋、滑移与动量简并','module=nonsymmorphic'],['对称性推导工坊','module=workshop'],['从 Wyckoff 位点到能带表示','module=bandrep'],['器件量子输运','module=device'],['量子几何与拓扑诊断','module=geometry'],['超胞与能带展开','module=unfold'],['能带相容关系与连接','module=bands'],['空间群与 Bloch 相位','track=space'],['Seitz 操作实验','tab=lab&experiment=seitz'],['典型材料与三维结构','tab=materials']]},
  {id:'observables',section:'observables',title:'材料物性与光谱',summary:'从原胞振动、选择定则到物性张量，用材料案例检验对称性的预测。',level:'基础 → 应用',prerequisite:'点群、特征标与矩阵',links:[['Si、GaAs 与 BaTiO₃ · SHG 旗舰实验','module=shg-story'],['手性、极性与伪对称实验','module=chirality'],['互易关系与响应约束','module=reciprocity'],['多体谱函数与响应','module=manybody'],['非弹性散射与动态结构因子','module=scattering'],['多重态光谱与偏振选择定则','module=spectra'],['反常霍尔与横向热电','module=hall'],['跨模块项目作业','module=hall&tab=project'],['电子输运与热电','module=transport'],['非线性光学与 SHG','module=shg'],['准谐近似与热膨胀','module=qha'],['声子热力学','module=thermo'],['晶体振动与光谱','lesson=mechanical-modes'],['物性张量与响应','lesson=neumann'],['交互实验','tab=lab'],['分步练习','tab=derive'],['材料案例','tab=cases']]},
  {id:'structure-dynamics',section:'dynamics',title:'结构、相变与实验',summary:'连接序参量、极性畴、衍射消光和 Phonopy 真实数据导入。',level:'基础 → 应用',prerequisite:'空间群、振动与矩阵',links:[['序参量流形与拓扑缺陷','module=defects'],['有限波矢有序与超胞','module=wavevector'],['序参量与对称性破缺','module=order'],['电子—声子耦合与极化子','module=polaron'],['畴壁与局域态','module=domainwall'],['结构畸变分解与模式耦合','module=distortion'],['声子模式识别与冻结模','module=modes'],['相变与畴','lesson=landau-stability'],['衍射相位与消光','lesson=structure-factor'],['声子数据与软模','lesson=phonopy-files'],['交互实验','tab=lab'],['分步练习','tab=derive'],['材料路线','tab=cases']]},
  {id:'spin',section:'academy',track:'double',title:'自旋与扩展对称',summary:'区分旋量双覆盖、时间反演、颜色置换与独立自旋转动。',level:'进阶',prerequisite:'点群、空间群与线性代数',links:[['射影表示与多体 SPT','module=spt'],['键对称性、磁交换与 DMI','module=exchange'],['密度矩阵、纠缠与退相干','module=density'],['Hubbard 小团簇','module=hubbard'],['磁共振与有效自旋','module=resonance'],['超导结与 Andreev 反射','module=andreev'],['多电子晶场与多重态','module=multiplet'],['晶场、轨道与 Jahn–Teller','module=orbitals'],['超导配对与 BdG','module=pairing'],['磁交换与自旋波','module=magnons'],['双群与旋量','track=double'],['磁群与共表示','track=magnetic'],['色群与标签置换','track=color'],['自旋点群与空间群','track=spin']]},
  {id:'continuous',section:'lie',track:'continuous',title:'连续群与物理',summary:'认识 SU(2)、SU(3) 的生成元、权图以及量子态的连续变换。',level:'基础 → 进阶',prerequisite:'复数、矩阵与量子态',links:[['连续对称性与守恒量','module=conservation'],['生成元与物理应用','track=continuous'],['SU(2) 与 Bloch 球','tab=lab&experiment=su2'],['SU(3) 与权图','tab=lab&experiment=su3']]},
  {id:'coupling',section:'lie',track:'coupling',title:'张量积与重耦合',summary:'从表示分解走到 CG 换基、Racah（6j）与四体 9j 系数。',level:'进阶 → 专题',prerequisite:'表示、张量积与 SU(2)/SU(3)',links:[['表示与直积分解','track=representations'],['CG 系数与换基','track=cg'],['Racah（6j）','track=racah'],['四体重耦合（9j）','track=ninej']]}
];
const queryFields=['module','tab','lesson','experiment','preset','track','material','exercise','group','level','project'];
const specialistModules={
 'shg-story':{section:'flagship',pathway:'observables',route:'shg-flagship'},
 layers:{section:'frontiers',pathway:'crystal',route:'layer-symmetry-lab'},
 chirality:{section:'frontiers',pathway:'observables',route:'chirality-polarity-lab'},
 spt:{section:'frontiers',pathway:'spin',route:'manybody-spt-lab'},
 audit:{section:'connections',pathway:'foundations',route:'symmetry-audit'},
 statistics:{section:'connections',pathway:'foundations',route:'statistics-lab'},
 defects:{section:'connections',pathway:'structure-dynamics',route:'topological-defects-lab'},
 reciprocity:{section:'connections',pathway:'observables',route:'reciprocity-lab'},
  salc:{section:'construction',pathway:'foundations',route:'salc-lab'},
  wavevector:{section:'construction',pathway:'structure-dynamics',route:'wavevector-lab'},
  nonsymmorphic:{section:'construction',pathway:'crystal',route:'nonsymmorphic-lab'},
  order:{section:'principles',pathway:'structure-dynamics',route:'order-parameter-lab'},
  exchange:{section:'principles',pathway:'spin',route:'exchange-symmetry-lab'},
  conservation:{section:'principles',pathway:'continuous',route:'conservation-lab'},
  manybody:{section:'bridges',pathway:'observables',route:'manybody-spectra-lab'},
  polaron:{section:'bridges',pathway:'structure-dynamics',route:'polaron-lab'},
  density:{section:'bridges',pathway:'spin',route:'density-matrix-lab'},
  workshop:{section:'bridges',pathway:'crystal',route:'symmetry-workshop'},
  bandrep:{section:'pathways',pathway:'crystal',route:'band-representation-lab'},
  scattering:{section:'pathways',pathway:'observables',route:'dynamic-scattering-lab'},
  domainwall:{section:'pathways',pathway:'structure-dynamics',route:'domain-wall-lab'},
  hubbard:{section:'pathways',pathway:'spin',route:'hubbard-cluster-lab'},
  resonance:{section:'spectroscopy',pathway:'spin',route:'spin-resonance-lab'},
  andreev:{section:'spectroscopy',pathway:'spin',route:'andreev-lab'},
  spectra:{section:'spectroscopy',pathway:'observables',route:'atomic-spectra-lab'},
  hall:{section:'response-materials',pathway:'observables',route:'hall-response-lab'},
  device:{section:'response-materials',pathway:'crystal',route:'device-transport-lab'},
  multiplet:{section:'response-materials',pathway:'spin',route:'local-multiplet-lab'},
  orbitals:{section:'quantum-materials',pathway:'spin',route:'crystal-field-lab'},
  geometry:{section:'quantum-materials',pathway:'crystal',route:'quantum-geometry-lab'},
  transport:{section:'quantum-materials',pathway:'observables',route:'electron-transport-lab'},
  pairing:{section:'electronic-materials',pathway:'spin',route:'pairing-lab'},
  shg:{section:'electronic-materials',pathway:'observables',route:'shg-lab'},
  unfold:{section:'electronic-materials',pathway:'crystal',route:'unfold-lab'},
  modes:{section:'material-research',pathway:'structure-dynamics',route:'phonon-modes'},
  bands:{section:'material-research',pathway:'crystal',route:'band-connectivity'},
  thermo:{section:'material-research',pathway:'observables',route:'phonon-thermo'},
  distortion:{section:'coupled-materials',pathway:'structure-dynamics',route:'distortion-modes'},
  magnons:{section:'coupled-materials',pathway:'spin',route:'magnon-lab'},
  qha:{section:'coupled-materials',pathway:'observables',route:'qha-lab'}
};
const specialist=id=>Object.hasOwn(specialistModules,id)?specialistModules[id]:null;
const specialistTools=Object.fromEntries(Object.entries(specialistModules).map(([module,item])=>['compute/'+item.route,{module,...item}]));
const defaultsFor=id=>{const p=classroomPathways.find(p=>p.id===id);return p?{section:p.section,pathway:p.id,...(p.track?{track:p.track}:{})}:null;};
export const isClassroomView=view=>classroomSections.some(section=>section.id===view);
export function parseClassroomRoute(route){
  if(typeof route!=='string')return null;
  const [path,query='']=route.replace(/^#/,'').split('?'),params=new URLSearchParams(query);
  let result;
  const tool=Object.hasOwn(specialistTools,path)?specialistTools[path]:null;
  if(tool)result={section:tool.section,module:tool.module,pathway:tool.pathway,tab:'lab',calculationOnly:true};
  else if(['compute/phase','compute/diffraction','compute/phonopy'].includes(path))result={section:'dynamics',pathway:'structure-dynamics',tab:'lab',experiment:path.slice(8),calculationOnly:true};
  else if(['compute/phonons','compute/tensors'].includes(path))result={section:'observables',pathway:'observables',tab:'lab',experiment:path.slice(8),calculationOnly:true};
  else if(path.startsWith('compute/lie/')){const experiment=path.slice('compute/lie/'.length);if(!/^[a-z][a-z0-9_]*$/.test(experiment))return null;result={section:'lie',pathway:'coupling',tab:'lab',experiment,calculationOnly:true};}
  else if(path==='classroom')result={section:'overview',pathway:'overview'};
  else {
    const slug=path.startsWith('classroom/')?path.slice(10):path;
    const legacy={'shg-flagship':'observables',frontiers:'crystal',connections:'foundations',construction:'foundations',principles:'structure-dynamics',pointgroups:'foundations',academy:'crystal',lie:'continuous',research:'structure-dynamics',mechanisms:'structure-dynamics',electronic:'spin',quantum:'spin',response:'observables',spectroscopy:'spin',pathways:'crystal',bridges:'observables'};
    result=defaultsFor(legacy[slug]||slug);if(!result)return null;
    if(slug==='shg-flagship')result.module='shg-story';
    if(slug==='research')result.module='modes';
    if(slug==='mechanisms')result.module='distortion';
    if(slug==='electronic')result.module='pairing';
    if(slug==='quantum')result.module='orbitals';
    if(slug==='response')result.module='hall';
    if(slug==='spectroscopy')result.module='resonance';
    if(slug==='frontiers')result.module='layers';
    if(slug==='connections')result.module='statistics';
    if(slug==='construction')result.module='salc';
    if(slug==='principles')result.module='order';
    if(slug==='bridges')result.module='manybody';
    if(slug==='pathways')result.module='bandrep';
  }
  for(const field of queryFields){const value=params.get(field);if(value!==null&&value.length<=160)result[field]=value;}
  if(result.calculationOnly&&!tool)delete result.module;
  if(specialist(result.module)){result.section=specialist(result.module).section;result.pathway=specialist(result.module).pathway;}
  if(result.calculationOnly)result.tab='lab';
  if(tool)result={...result,section:tool.section,module:tool.module,pathway:tool.pathway,tab:'lab',calculationOnly:true};
  else if(['compute/phase','compute/diffraction','compute/phonopy','compute/phonons','compute/tensors'].includes(path))result.experiment=path.slice(8);
  return result;
}
export function buildClassroomHash(selection={}){
  const module=specialist(selection.module),specialSection=['flagship','frontiers','connections','construction','principles','bridges','pathways','material-research','coupled-materials','electronic-materials','quantum-materials','response-materials','spectroscopy'].includes(selection.section);
  const pathway=selection.pathway||module?.pathway||({pointgroups:'foundations',academy:'crystal',lie:'continuous'}[selection.section])||'overview';
  const path=selection.calculationOnly?(specialSection?'compute/'+(module?.route||(selection.section==='coupled-materials'?'distortion-modes':'phonon-modes')):selection.section==='dynamics'?'compute/'+(['phase','diffraction','phonopy'].includes(selection.experiment)?selection.experiment:'phase'):selection.section==='observables'?'compute/'+(selection.experiment==='tensors'?'tensors':'phonons'):'compute/lie/'+encodeURIComponent(selection.experiment||'su3_cg')):pathway==='overview'?'classroom':'classroom/'+pathway;
  const params=new URLSearchParams();
  for(const key of queryFields)if(selection[key]!==undefined&&selection[key]!==null&&selection[key]!==''&&!(selection.calculationOnly&&(key==='tab'||key==='experiment')))params.set(key,String(selection[key]));
  return '#'+path+(params.size?'?'+params.toString():'');
}
export function resolveClassroomRoute(route,last='pointgroups'){
  if(route==='classroom')return isClassroomView(last)?last:'pointgroups';
  return parseClassroomRoute(route)?.section||null;
}
export const classroomHash=section=>'#classroom/'+(classroomSections.find(item=>item.id===section)||classroomSections.find(item=>item.id==='pointgroups')).slug;
const renderers=Object.fromEntries(Object.keys(courseDefinitions).map(section=>[section,async options=>{
 const host=options.container;host.innerHTML='<div class="loading-card" role="status">正在读取本节课程…</div>';const marker=host.firstElementChild;
 const current=()=>host.isConnected!==false&&host.firstElementChild===marker;
 try{const module=await courseModules.get(section);if(current())return module[courseDefinitions[section].render](options);}
 catch(error){if(current()){host.innerHTML='<div class="notice error">课程暂未载入。'+esc(error.message)+' <button class="secondary" data-course-retry>重试本节课程</button></div>';host.querySelector('[data-course-retry]').onclick=()=>renderers[section](options);}}
}]));
export function getClassroomResult(section){const course=courseModules.peek(section)?.[courseDefinitions[section]?.result]?.();return course?{kind:'group-theory-classroom',section,course}:null;}

export function renderClassroomView({container,section='pointgroups',route,onSection=()=>{},onNavigate,onLocation=()=>{},run,cancelRun,toast,download,openGroup,courseRenderers=renderers}){
  let selection=typeof route==='string'?parseClassroomRoute(route):route;
  selection=selection||parseClassroomRoute(classroomHash(section));
  section=selection.section;
  const overview=section==='overview',pathway=classroomPathways.find(p=>p.id===selection.pathway),embedded=selection.calculationOnly||selection.embeddedOnly||selection.atlasOnly;
  const pathLink=(id,query='')=>'#classroom/'+id+(query?'?'+query:'');
  const directory=`<nav class="classroom-directory" aria-label="学习路线与主题"><a href="#classroom" data-course-route="#classroom" class="classroom-all ${overview?'active':''}">学习总览</a>${classroomPathways.map((item,index)=>`<section><a href="${pathLink(item.id)}" data-course-route="${pathLink(item.id)}" class="classroom-path ${selection.pathway===item.id?'active':''}" ${selection.pathway===item.id?'aria-current="page"':''}><small>0${index+1}</small><strong>${item.title}</strong></a>${selection.pathway===item.id?`<div class="classroom-topics">${item.links.map(([title,query])=>`<a href="${esc(pathLink(item.id,query))}" data-course-route="${esc(pathLink(item.id,query))}">${esc(title)}</a>`).join('')}</div>`:''}</section>`).join('')}</nav>`;
  const cards=classroomPathways.map((item,index)=>`<a class="classroom-path-card" href="${pathLink(item.id)}" data-course-route="${pathLink(item.id)}"><span class="classroom-card-number">0${index+1}<small>${item.level}</small></span><h2>${item.title}</h2><p>${item.summary}</p><div>建议基础：${item.prerequisite}</div><strong>进入路线 →</strong></a>`).join('');
  container.innerHTML=`<div class="classroom-page ${embedded?'classroom-embedded':'classroom-shell'}">${embedded?'':directory}<div class="classroom-main">${overview?`<header class="classroom-overview"><span>按知识路径学习</span><h2>从第一种对称操作，走到多体重耦合。</h2><p>先选择路线，再在同一单元中阅读、操作和练习。点群与空间群是空间层级，双值表示、磁性与内部自由度在各自主题中说明。</p></header><aside class="classroom-next"><h3>从一个完整实验开始</h3><a href="#classroom/observables?module=shg-story">为什么 Si、GaAs 与 BaTiO₃ 的 SHG 不同？预测 → 计算 → 解释 → 反例</a></aside><div class="classroom-path-grid">${cards}</div><aside class="classroom-next"><h3>已经有具体计算问题？</h3><p>计算中心提供完整参数；课程中的实验使用相同计算核心，并附教学预设。</p><a href="#compute">打开计算中心 →</a></aside>`:`${embedded?'':`<div class="classroom-course-heading"><span>${esc(pathway?.level||'课程')} · 建议基础：${esc(pathway?.prerequisite||'线性代数')}</span><a href="#classroom" data-course-route="#classroom">全部路线</a></div>`}<section id="classroom-course" aria-label="${esc(pathway?.title||'计算工具')}"></section>`}</div></div>`;
  const root=container.firstElementChild,current=()=>root.parentNode===container&&container.isConnected!==false;
  const move=(hash,options)=>{if(!current())return;if(onNavigate)onNavigate(hash,options);else {const next=parseClassroomRoute(hash);if(next&&next.section!=='overview')onSection(next.section);}};
  root.querySelectorAll('[data-course-route]').forEach(link=>link.onclick=event=>{event?.preventDefault();move(link.dataset.courseRoute);});
  onLocation(overview?'学习中心':selection.calculationOnly?'计算中心 / 张量积与重耦合':'学习中心 / '+(pathway?.title||'课程'));
  if(overview)return;
  const update=patch=>{if(!current())return;selection={...selection,...patch};if(specialist(patch.module)){selection.section=specialist(patch.module).section;selection.pathway=specialist(patch.module).pathway;}if(patch.tab&&patch.tab!=='derive')delete selection.exercise;if(patch.tab&&patch.tab!=='materials'&&!['frontiers','connections','construction','principles','bridges','pathways','observables','dynamics','material-research','coupled-materials','electronic-materials','quantum-materials','response-materials','spectroscopy'].includes(section))delete selection.material;move(buildClassroomHash(selection),{render:false});};
  return courseRenderers[section]({container:root.querySelector('#classroom-course'),run,cancelRun,toast,download,selection,onNavigate:update,onLocation,
    openGroup:spec=>openGroup?.(typeof spec==='number'?{mode:'sg',id:spec,k:[0,0,0],doubleValued:false}:spec)});
}
