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
 [connections('reciprocity-spatial-response'),connections('reciprocity-dissipation'),'在空间与互易条件明确后，检查对称耗散部分与反对称横向响应。']
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
export function lessonProgressionHTML(selection={}){
 const result=lessonProgression(selection);
 if(!result.current)return '';
 return `<section class="lesson-progression" data-lesson-progression="${esc(key(result.current.catalog,result.current.lessonId))}" aria-label="先修与后续学习"><h3>把这一节接起来</h3><p class="lesson-progression-intro">按需要补基础或继续深入；这些建议不限制直接选课与使用工具。</p><div class="lesson-progression-columns">${result.prerequisites.length?`<section><h4>建议先会</h4>${linkList(result.prerequisites,'prerequisite')}</section>`:''}${result.next.length?`<section><h4>接下来可以学</h4>${linkList(result.next,'next')}</section>`:''}${!result.prerequisites.length&&!result.next.length?'<p>可在本主题目录中选择下一项学习内容。</p>':''}</div><p class="lesson-progression-index"><a data-lesson-progression-link data-progression-kind="index" href="${esc(result.index.route)}">本主题目录</a><a data-lesson-progression-link data-progression-kind="start" href="${esc(result.start.route)}">从零基础起步</a></p></section>`;
}
