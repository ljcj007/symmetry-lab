// Presentation only: all classification and algebra are computed by Python.
import {mountCoverage} from './coverage-ui.js?v=20261024-ninej2';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = x => JSON.stringify(x, null, 2);
const specs = {
 carat: {name:'CARAT 有理类', intro:'检索 1–6 维全部 8,329 个有理类，查看精确矩阵代表、类数与分类证据。Q 类、Z 类和仿射类分别对应不同的等价关系。',
  examples:[['catalog','六维 Q 类目录',{action:'catalog',dimension:6,limit:20}],['classify','二维四重旋转分类',{action:'classify',dimension:2,generators:[[[0,-1],[1,0]]]}]],
  help:'dimension 为 1–6；action 可用 catalog、representative、classify、invariant_lattices。输入 generators 是整数可逆矩阵列表。目录按维数下载，分类结果中的证书说明已验证的等价关系。', module:'carat_browser'},
 carat_integral: {name:'整数类与仿射类', intro:'在同一有理类内构造整数点群代表，再计算仿射扩张。每一步保留完整性状态，代表数量与官方类数分别显示。',
  examples:[['involution','六维对合 · Z 类与仿射类',{action:'affine_classes',dimension:6,generators:[[[1,0,0,0,0,0],[0,1,0,0,0,0],[0,0,1,0,0,0],[0,0,0,-1,0,0],[0,0,0,0,-1,0],[0,0,0,0,0,-1]]]}]],
  help:'action 使用 z_classes、affine_classes 或 z_equivalent。按 dimension 与 CARAT name 选择有理类，或直接输入 generators。classification_method 可用 auto、conductor 或 neighbors。导子区间法用有限格遍历证明候选覆盖；max_lattices / max_candidates 控制资源。完整性依赖证书，候选格已穷尽与 Z 类已区分会分别标示。', module:'carat_integral'},
 integral_normalizer: {name:'整数正规化子', intro:'求保持输入有限整数点群的整系数基变换。结果可以是有限群，也可以由有限个矩阵生成的无限群。',
  examples:[['rotation','四重旋转的完整整数正规化子',{rotations:[[[0,-1],[1,0]]]}]],
  help:'输入 rotations 或 point_generators；三维也可用 group_number。返回精确生成矩阵、完整性证明和资源状态。一般情形尚未证明完整时，会明确显示部分结果。', module:'integral_normalizer'},
 arithmetic_centralizer: {name:'算术中心化子', intro:'求与所有点群操作交换的整数矩阵，计算整数序、中心分解和单位群。单位群完整性与整数序计算分别给出证明。',
  examples:[['order','三重旋转 · 交换子整数序',{action:'order',rotations:[[[0,-1],[1,-1]]]}],['units','三重旋转 · 完整单位群',{action:'centralizer',rotations:[[[0,-1],[1,-1]]]}]],
  help:'action 使用 order、centralizer 或 normalizer。rotations / point_generators 为整数矩阵生成元；group_number 可选择三维空间群。中心化子逐个固定群元素，正规化子允许在群中置换元素。',module:'arithmetic_centralizer'},
 symbolic: {name:'符号 Hamiltonian', intro:'以有理数、代数数和符号参数直接求解。支持精确跃迁约束、Bloch Hamiltonian、k·p 展开、分圆域与多项式轨道。',
  examples:[['algebra','矩阵特征多项式',{action:'algebra',operation:'charpoly',matrix:[['m','x-I*y'],['x+I*y','-m']]}],['cyclotomic','五次单位根恒等式',{action:'cyclotomic',order:5,expression:'1+z+z**2+z**3+z**4'}]],
  help:'精确分数或根式请写为字符串，例如 "1/3"、"sqrt(3)/2"。仅接受数学表达式；不执行 Python 代码。action 包含 model、bloch、algebra、cyclotomic、orbitals、kp。各示例给出完整输入结构。', module:'symbolic_core'},
 symbolic_interfaces: {name:'符号表示与接口', intro:'对给定的精确矩阵执行分圆域编译、共核、交织、投影和表示验证。反幺正操作明确按 U·K 处理。',
  examples:[['kernel','两组约束的精确共核',{action:'common_kernel',matrices:[[[1,1,0]],[[0,1,1]]]}]],
  help:'从示例选择接口并修改输入。表达式沿用安全数学解析器；原函数名称与输入范围见接口覆盖表。', module:'symbolic_interfaces'},
 symbolic_spacegroups: {name:'符号空间群', intro:'从空间群或磁空间群数据生成符号小群、k 星及精确表示。计算使用有理平移和符号相位，并验证表示乘法。',
  examples:[['screw','P2₁ 螺旋轴 · 符号 k 线',{action:'analyze',group_number:4,k:[0,0,'q'],double_valued:false}]],
  help:'group_number 指定普通空间群；magnetic_group 使用 BNS 编号，例如 "1.3"。k 使用 BC 原胞倒易分数坐标，符号参数写为字符串。double_valued 选择双值表示。标签为本次计算的局部编号。',module:'symbolic_spacegroups'},
 crystkit_ext: {name:'群扩张与生成元', intro:'计算固定整数点群的完整向量系统、正规化子作用、仿射扩张轨道，以及无限空间群生成元证书。',
  examples:[['glide','二维反射与滑移反射',{action:'extension_orbits',rotations:[[[1,0],[0,-1]]]}],['screw','四重螺旋扩张',{action:'extensions',rotations:[[[0,-1,0],[1,0,0],[0,0,1]]]}],['normalizer','四重旋转的整数正规化子',{action:'integral_normalizer',rotations:[[[0,-1],[1,0]]]}],['generators','P2₁2₁2₁ 无限群最小生成元',{action:'spacegroup_generators',group_number:19}]],
  help:'rotations / point_generators 接受 1–6 维整数矩阵；三维也可使用 group_number。扩张先固定整数点群，再对所有原点平移取商。完整性取决于算术正规化子的证明分支；若仅得到子群，结果会明确说明。affine_properties / torsionfree 可精确判定无挠性、中心和平凡中心。', module:'crystkit_extensions'}
};
const states = Object.fromEntries(Object.entries(specs).map(([tool,s]) => [tool,{text:pretty(s.examples[0][2]),example:s.examples[0][0],revision:0,result:null,error:null,busy:false}]));
let selected = 'carat_integral';
export function getAdvancedResult(){return states[selected].result;}
const table = (headers,rows) => `<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(typeof x==='object'?JSON.stringify(x):x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const cards = rows => `<div class="stats exact-stats">${rows.map(([label,value])=>`<div class="stat"><div class="stat-label">${esc(label)}</div><strong>${esc(value)}</strong></div>`).join('')}</div>`;
const matrix = value => Array.isArray(value) ? table(value[0]?.map((_,i)=>i+1)||[], value) : `<pre class="exact-expression">${esc(value)}</pre>`;

// SymPy's MathML is display data. Rebuild a small, inert MathML tree; never
// insert generated markup directly into HTML or allow URL/style attributes.
export function safeMathML(source, doc=document){
 if(typeof source!=='string'||source.length>500000)return null;
 const entities={ImaginaryI:'ⅈ',ExponentialE:'ⅇ',InvisibleTimes:'⁢',ApplyFunction:'⁡',pi:'π',DifferentialD:'ⅆ'};
 source=source.replace(/&(ImaginaryI|ExponentialE|InvisibleTimes|ApplyFunction|pi|DifferentialD);/g,(_,name)=>entities[name]);
 const parsed = new DOMParser().parseFromString(source, 'application/xml');
 if(parsed.querySelector('parsererror'))return null;
 const tags=new Set(['math','mrow','mi','mn','mo','mfrac','msup','msub','msubsup','msqrt','mroot','mtable','mtr','mtd','mfenced','mtext','mover','munder','munderover','mspace','menclose']);
 const attrs=new Set(['display','mathvariant','stretchy','fence','separator','open','close','separators','columnalign','rowalign','columnspacing','rowspacing','notation']);
 const copy=node=>{if(node.nodeType===3)return doc.createTextNode(node.textContent);if(node.nodeType!==1||!tags.has(node.localName))throw new Error('Unsupported MathML');const out=doc.createElementNS('http://www.w3.org/1998/Math/MathML',node.localName);for(const a of node.attributes)if(attrs.has(a.name))out.setAttribute(a.name,a.value);for(const child of node.childNodes)out.append(copy(child));return out;};
 try{const root=copy(parsed.documentElement);if(root.localName==='math')return root;const wrapper=doc.createElementNS('http://www.w3.org/1998/Math/MathML','math');wrapper.setAttribute('display','block');wrapper.append(root);return wrapper;}catch{return null;}
}
function resultView(tool,s){
 const r=s.result;
 if(!r)return `<div class="empty-state exact-empty">${s.loading?'正在加载示例，请稍候…':s.busy?'<i class="spinner"></i>正在进行精确计算…':'选择示例并运行，查看精确结果与验证证书。'}</div>`;
 const metrics=[];
 for(const [key,label] of [['dimension','维数'],['order','群阶'],['group_order','群阶'],['z_class_count','已证明 Z 类数'],['z_class_lower_bound','Z 类数下界'],['affine_class_count','已证明仿射类数'],['lattice_count','不变子格数'],['pointGroupOrder','点群阶'],['parameter_count','独立参数'],['extensionCount','原点等价扩张'],['orbitCount','仿射类'],['normalizerOrder','正规化子阶'],['generatorCount',tool==='arithmetic_centralizer'&&r.action!=='normalizer'?'单位群生成元':'正规化子生成元'],['orderRank','整数序秩'],['centerDimension','有理中心维数'],['centerRank','中心平移格秩'],['centralizerOrder','中心化子阶'],['latticeOrbitSize','格轨道大小'],['lowerBound','生成元下界'],['upperBound','生成元上界'],['total_matches','匹配 Q 类'],['q_classes','该维 Q 类总数'],['rank','一般秩'],['nullity','零空间维数'],['degree','次数'],['corep_dimension','共表示维数'],['indicator','Herring 指标'],['wigner_type','Wigner 类型']])if(r[key]!=null&&!(key==='z_class_lower_bound'&&r.z_complete))metrics.push([label,r[key]]);
 if(r.little_group?.order!=null)metrics.push(['小群阶',r.little_group.order]);
 if(r.star)metrics.push(['k 星臂数',r.star.length]);
 if(r.irreps)metrics.push(['不可约表示数',r.irreps.length]);
 if(r.corepresentations?.length)metrics.push(['共表示数',r.corepresentations.length]);
 if(tool==='arithmetic_centralizer'&&r.generators&&r.generatorCount==null)metrics.push(['生成元数',r.generators.length]);
 if(typeof r.finite==='boolean')metrics.push([tool==='arithmetic_centralizer'&&r.action!=='normalizer'?'单位群类型':'正规化子类型',r.finite?'有限群':'无限群']);
 let out=metrics.length?cards(metrics.slice(0,6)):'';
 if(r.z_complete===false||(r.affine_complete===false&&r.action!=='z_classes')||r.normalizerComplete===false||r.complete===false||(r.unitGroupComplete===false&&r.action!=='order'))out+='<p class="notice">当前结果尚未证明全部穷尽。请结合下面的适用范围与搜索记录使用；已找到的代表不等于全部分类。</p>';
 const summary=[['status','结果状态'],['q_status','Q 类识别'],['z_status','Z 类识别'],['q_class','Q 类代表'],['z_complete','该有理类的 Z 类已穷尽'],['affine_complete','该有理类的仿射类已穷尽'],['complete_through_requested_index','指定指数内穷尽'],['scope','适用范围'],['certificate','验证证据'],['reason','说明'],['complete','当前步骤穷尽'],['classificationCompleteForIntegralPointGroup','该整数点群分类穷尽'],['normalizerComplete','正规化子完整'],['unitGroupComplete','单位群完整'],['torsionFree','无挠空间群'],['orientable','可定向'],['trivialCenter','平凡中心'],['candidate_cover_complete','候选整数格已穷尽'],['orderComplete','整数序完整'],['minimumCertified','最小生成元已证明']];
 const evidence=summary.filter(([k])=>r[k]!=null&&!(k==='unitGroupComplete'&&r.action==='order')&&!(k==='affine_complete'&&r.action==='z_classes')).map(([k,label])=>[label,typeof r[k]==='boolean'?(r[k]?'是':'否'):k==='q_class'&&r[k]?.name?r[k].name:k==='certificate'&&r[k]?.method?({'diederichsen_reiner_prime_order':'素数阶整表示结构定理；模 p 秩区分 Z 类','catalogue_cardinality_exhaustion':'精确不等价证书与独立官方类数相符','certified_distinct_subset':'已证明互不等价的代表子集','finite_maximal_order_conductor_exhaustion':'有限导子区间已穷尽，并验证整数等价关系'}[r[k].method]||r[k].method):r[k]]);if(evidence.length)out+=table(['结果说明','内容'],evidence);
 if(r.conditions?.length)out+=`<p class="notice">参数适用条件：${r.conditions.map(c=>esc(c.kind==='generic_little_group_stratum'?`操作 ${c.operation} 的差向量 (${c.difference.join(', ')}) 不可同时为整数`:c.condition||c)).join('；')}。例外参数可能改变小群或矩阵秩，请代入后重新计算。</p>`;

 if(r.label_note)out+=`<p class="notice">${esc(r.label_note)}</p>`;
 if(r.irreps?.length)out+=`<h3>幺正小群不可约表示</h3>${table(['局部编号','维数','幺正特征标'],r.irreps.map(e=>[e.id,e.dimension,e.characters]))}`;
 if(r.corepresentations?.length)out+=`<h3>磁共表示</h3>${table(['局部编号','维数','Wigner 类型','Herring 指标'],r.corepresentations.map(e=>[e.id,e.dimension,e.wigner_type,e.indicator]))}`;
 if(r.full_representations?.length)out+=`<h3>全 k 星诱导表示</h3>${table(['局部编号','来源小表示','维数','Wigner 类型'],r.full_representations.map(e=>[e.id,e.little_id,e.dimension,e.wigner_type??(e.antiunitary?.some(Boolean)?'全星反幺正诱导':'普通表示')]))}`;
 if(r.star?.length)out+=`<details><summary>符号 k 星 · ${r.star.length} 个星臂</summary>${table(['星臂','倒易分数坐标'],r.star.map((arm,i)=>[i,arm]))}</details>`;
 if(r.unitNormPolynomial)out+=`<h3>单位判定</h3><pre class="exact-expression">${esc(r.unitNormPolynomial)} = ±1</pre>`;
 const fundamental=r.fundamentalUnitRadical||r.centralizer?.fundamentalUnitRadical;
 if(fundamental)out+=`<h3>实二次序基本单位</h3><p class="exact-expression">ε = (${esc(fundamental.rationalNumerator)} + ${esc(fundamental.radicalNumerator)}√${esc(fundamental.discriminant)}) / ${esc(fundamental.denominator)}</p><p>完整单位群由 −1 与 ε 生成；其整数矩阵和 Pell 有限搜索证书见完整结果。</p>`;
 if(r.orderBasis)out+=`<details><summary>整数序基 · ${r.orderBasis.length} 个</summary><pre class="json-output">${esc(pretty(r.orderBasis))}</pre></details>`;
 if(r.centerDecomposition)out+=`<details><summary>有理中心分解</summary><pre class="json-output">${esc(pretty(r.centerDecomposition))}</pre></details>`;
 if(r.generators)out+=`<details ${r.generators.length<=4?'open':''}><summary>精确生成元 · ${r.generators.length} 个</summary><pre class="json-output">${esc(pretty(r.generators))}</pre></details>`;
 if(Array.isArray(r.z_classes)&&r.z_classes.length){out+=`<h3>整数点群代表</h3>${table(['Z 类序号','块重数','上同调因子','仿射类数'],r.z_classes.map(e=>[e.index,e.block_multiplicities||'见完整结果',e.cohomology_invariants||[],e.affine_class_count??'未计算']))}<label class="field-label" for="integral-class">继续计算某个 Z 类</label><div class="controls-row"><select id="integral-class">${r.z_classes.map((e,i)=>`<option value="${i}">Z 类 ${esc(e.index)}</option>`).join('')}</select><button class="secondary small" id="integral-to-normalizer">整数正规化子 →</button><button class="secondary small" id="integral-to-extensions">固定点群扩张 →</button></div>`;}
 if(r.cohomologyInvariants)out+=`<p class="notice">H¹(P, ℚᵈ/ℤᵈ) ≅ ${r.cohomologyInvariants.length?r.cohomologyInvariants.map(n=>'ℤ/'+esc(n)+'ℤ').join(' × '):'0'}。这里已对全部原点平移取商。</p>`;
 const rows=r.entries||r.results;
 if(Array.isArray(rows)&&rows.length&&rows[0]?.name){out+=`<h3>有理类目录</h3>${table(['CARAT 名称','阶','Z 类','仿射类'],rows.map(e=>[e.name,e.order,e.z_classes,e.affine_classes]))}<div class="pagination"><span>共 ${r.total_matches} 个匹配 · 显示 ${(r.offset||0)+1}–${(r.offset||0)+rows.length} 条</span><div><button class="secondary small" id="carat-prev" ${!(r.offset>0)?'disabled':''}>上一页</button><button class="secondary small" id="carat-next" ${(r.offset||0)+rows.length>=r.total_matches?'disabled':''}>下一页</button></div></div><label class="field-label" for="carat-name">查看代表元</label><div class="controls-row"><select id="carat-name">${rows.map(e=>`<option>${esc(e.name)}</option>`).join('')}</select><button class="secondary small" id="carat-representative">载入代表元</button></div>`;}
 if(r.numerical_model)out+=`<button class="secondary small" id="exact-to-bands">将数值代入送至能带工具 →</button><p class="form-note">由 numeric_substitutions 指定参数；保留相同的周期轨道规范。</p>`;
 if(r.hamiltonian){out+=`<h3>精确 Hamiltonian</h3><div data-formula="hamiltonian" class="exact-formula">${matrix(r.hamiltonian.matrix||r.hamiltonian)}</div>`;}
 if(r.expression!=null||r.result!=null){out+=`<h3>符号结果</h3><div data-formula="result" class="exact-formula"><pre class="exact-expression">${esc(typeof (r.result??r.expression)==='object'?pretty(r.result??r.expression):(r.result??r.expression))}</pre></div>`;}
 if(r.matrix&&!r.hamiltonian)out+=`<h3>结果矩阵</h3><div data-formula="result" class="exact-formula">${matrix(r.matrix)}</div>`;
 if(r.representatives)out+=`<details><summary>扩张代表 · ${r.representatives.length} 个</summary>${table(['序号','上同调坐标','生成元平移'],r.representatives.map(e=>[e.index,e.coordinates,e.generatorTranslations]))}</details>`;
 if(r.orbits)out+=`<h3>仿射类与手性</h3>${table(['代表','扩张索引','对映体配对'],r.orbits.map(e=>[e.representative,e.extensionIndices,e.enantiomorphicPair?'是':'否']))}`;
 if(r.diagnostics)out+=`<details><summary>精确验证明细</summary>${table(['精确验证','结果'],Object.entries(r.diagnostics).map(([k,v])=>[k,v]))}</details>`;
 out+=`<details class="exact-full"><summary>完整结果、精确矩阵与证书</summary><pre class="json-output">${esc(pretty(r))}</pre></details>`;
 return out;
}

export function renderAdvancedView(options){
 const {container,run,toast,download}=options,tool=selected,s=states[tool],spec=specs[tool];
 let input={};try{input=JSON.parse(s.text)||{};}catch{}
 const here=()=>container.dataset.researchView==='advanced'&&selected===tool;
 const draw=()=>{if(here())renderAdvancedView(options);};
 container.innerHTML=`<div class="advanced-tabs" role="group" aria-label="选择精确计算工具">${Object.entries(specs).map(([key,item])=>`<button data-exact-tool="${key}" class="${key===tool?'active':''}">${esc(item.name)}</button>`).join('')}</div><p class="notice research-intro">${esc(spec.intro)}${['symbolic_interfaces','symbolic_spacegroups'].includes(tool)?' <a href="data/symbolic-api-coverage.json" target="_blank" rel="noreferrer">逐项接口覆盖表 ↗</a>':''}${tool==='carat_integral'?' <a href="docs/integral-classification.md" target="_blank" rel="noreferrer">算法与证明范围 ↗</a>':''}${tool==='integral_normalizer'?' <a href="docs/integral-normalizer.md" target="_blank" rel="noreferrer">算法与证明范围 ↗</a>':''}${tool==='arithmetic_centralizer'?' <a href="docs/arithmetic-centralizer.md" target="_blank" rel="noreferrer">整数序与单位群说明 ↗</a>':''}</p><div class="research-grid advanced-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> 精确计算输入</div><span class="badge">Python · SymPy</span></div><div class="panel-body"><label class="field-label" for="exact-example">可运行示例</label><div class="controls-row"><select id="exact-example" ${s.loading?'disabled':''}>${spec.examples.map(([key,label])=>`<option value="${key}" ${s.example===key?'selected':''}>${esc(label)}</option>`).join('')}</select><button id="exact-load" class="secondary small" ${s.loading?'disabled':''}>${s.loading?'加载中…':'载入示例'}</button></div>${tool==='carat'?`<div class="controls-row exact-catalog-controls"><label for="carat-dimension">目录维数</label><select id="carat-dimension">${[1,2,3,4,5,6].map(d=>`<option ${d===(input.dimension??6)?'selected':''}>${d}</option>`).join('')}</select><input id="carat-query" aria-label="搜索 CARAT 名称或符号" placeholder="名称 / 符号（可留空）" value="${esc(input.query||'')}"><button id="exact-catalog" class="secondary small">载入查询</button></div>`:''}<label class="field-label" for="exact-input">参数与操作 <span>JSON · 根式 / 分数写为字符串</span></label><textarea id="exact-input" class="band-input research-input" spellcheck="false" ${s.loading?'disabled':''}>${esc(s.text)}</textarea><details class="input-help"><summary>输入与计算约定</summary><p>${esc(spec.help)}</p><a href="python/${spec.module}.py" download>下载 Python 源码 ↓</a></details><button id="exact-run" class="primary" ${s.busy||s.loading?'disabled':''}>${s.loading?'正在加载示例…':s.busy?'<i class="spinner"></i>Python 正在计算…':'运行精确计算 →'}</button>${s.error?`<p class="notice error" role="alert">${esc(s.error)}</p>`:''}</div></section><section class="panel"><div class="result-header"><div class="result-heading">${esc(spec.name)}<small>精确结果与证据</small></div><div class="result-tools"><button id="exact-json" class="text-button">↓ JSON</button>${['symbolic','symbolic_interfaces','symbolic_spacegroups'].includes(tool)?'<button id="exact-tex" class="text-button">↓ LaTeX</button>':''}</div></div><div id="exact-results" class="result-content">${resultView(tool,s)}</div></section></div><section id="exact-coverage" class="coverage-panel"></section><p class="notice research-scope">Q 类目录完整覆盖 1–6 维。Z 类算法对已验证的极大序模型给出有限导子区间穷尽证明；仿射类还须完成正规化子作用。资源截断和未支持的算术类型会明确标注。自动符号表示使用局部编号；逐项覆盖表列出与上游接口的对应及剩余限制。<a href="#" data-view="docs">查看方法与覆盖范围 →</a></p>`;
 const $=selector=>container.querySelector(selector);
 mountCoverage($('#exact-coverage'));
 const setInput=p=>{s.revision++;s.loading=false;s.text=pretty(p);s.result=null;s.error=null;draw();};
 container.querySelectorAll('[data-exact-tool]').forEach(b=>b.onclick=()=>{selected=b.dataset.exactTool;renderAdvancedView(options);});
 $('#exact-input').oninput=e=>{s.revision++;s.text=e.target.value;s.result=null;s.error=null;$('#exact-results').innerHTML='<div class="empty-state">输入已修改，请重新运行。</div>';};
 $('#exact-example').onchange=e=>{s.example=e.target.value;};
 $('#exact-load').onclick=async()=>{const example=spec.examples.find(e=>e[0]===s.example),revision=++s.revision;s.loading=true;s.result=null;s.error=null;draw();try{let p=example[2];if(typeof p==='string'){const response=await fetch(`examples/${p}?v=20261024-ninej2`);if(!response.ok)throw new Error('示例加载失败');p=await response.json();}if(s.revision===revision)setInput(p);}catch(e){if(s.revision===revision){s.loading=false;s.error=e.message;draw();toast(e.message);}}};
 $('#exact-catalog')?.addEventListener('click',()=>setInput({action:'catalog',dimension:Number($('#carat-dimension').value),query:$('#carat-query').value,limit:20}));
 for(const [id,sign] of [['carat-prev',-1],['carat-next',1]])$('#'+id)?.addEventListener('click',()=>{const payload=JSON.parse(s.text);setInput({...payload,offset:Math.max(0,(payload.offset||0)+sign*(payload.limit||20))});container.querySelector('#exact-run').click();});
 $('#carat-representative')?.addEventListener('click',()=>setInput({action:'representative',dimension:JSON.parse(s.text).dimension||3,name:$('#carat-name').value}));
 $('#exact-run').onclick=async()=>{if(s.loading||s.busy)return;const revision=s.revision;try{const payload=JSON.parse(s.text);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error('输入须为 JSON 对象');s.busy=true;s.error=null;s.result=null;draw();const result=await run(tool,payload);if(s.revision===revision)s.result=result;}catch(e){if(s.revision===revision)s.error=e.message;}finally{s.busy=false;draw();}};
 $('#exact-to-bands')?.addEventListener('click',()=>options.sendToBands?.({...s.result.numerical_model,path:[{label:'−X',k:[-.5,0,0]},{label:'Γ',k:[0,0,0]},{label:'X',k:[.5,0,0]}],points_per_segment:40}));
 const continueIntegral=target=>{const entry=s.result.z_classes[Number($('#integral-class').value)],next=states[target];next.revision++;next.loading=false;next.result=null;next.error=null;next.text=pretty({action:target==='crystkit_ext'?'extensions':'integral_normalizer',rotations:entry.generators});selected=target;renderAdvancedView(options);};
 $('#integral-to-normalizer')?.addEventListener('click',()=>continueIntegral('integral_normalizer'));
 $('#integral-to-extensions')?.addEventListener('click',()=>continueIntegral('crystkit_ext'));
 $('#exact-json').onclick=()=>s.result?download(pretty(s.result),`${tool}-exact-result.json`):toast('请先运行精确计算。');
 $('#exact-tex')?.addEventListener('click',()=>{const latex=s.result?.hamiltonian?.latex||s.result?.latex;if(latex)download(latex,'symbolic-result.tex','text/plain');else toast('当前结果没有 LaTeX 表达式。');});
 for(const [selector,source] of [['hamiltonian',s.result?.hamiltonian?.mathml],['result',s.result?.mathml]]){const target=$(`[data-formula="${selector}"]`);if(target&&source){const math=safeMathML(source);if(math)target.replaceChildren(math);}}
}

// Additional source examples are loaded only when explicitly selected.
export function addAdvancedExamples(tool,examples){specs[tool].examples.push(...examples);}

addAdvancedExamples('symbolic', [['chain','精确时间反演链 · 跃迁约束','symbolic-chain.json'],['ssh','SSH 符号 Bloch 谱','symbolic-ssh.json'],['kp','C₄ + T 自旋 k·p 展开','symbolic-kp.json'],['cyclotomic-matrix','分圆域精确零空间','symbolic-cyclotomic.json'],['algebra-nullspace','符号秩与例外参数','symbolic-algebra.json'],['f-orbitals','七个 f 轨道的旋转','symbolic-f-orbitals.json']]);

addAdvancedExamples('carat', [['affine-orbits','二维 p4m / p4g 扩张轨道',{action:'affine_orbits',dimension:2,name:'max.2'}],['six-dimensional','六维精确 Q 类识别',{action:'classify',dimension:6,name:'min.171'}],['invariant-lattices','六维不变子格 · 指数 ≤ 2',{action:'invariant_lattices',dimension:6,name:'min.171',max_index:2}]]);

addAdvancedExamples('crystkit_ext', [['six-dimensional','六维上同调 · 81 个扩张','crystkit-ext-six-dimensional.json'],['infinite-normalizer','无限整数正规化子','crystkit-ext-infinite-normalizer.json']]);

addAdvancedExamples('symbolic', [['graphene','石墨烯精确符号模型 · 根式晶格','symbolic-graphene.json']]);

addAdvancedExamples('carat_integral', [['noncyclic-affine','六维非循环群 · 完整 Z / 仿射类','integral-affine-noncyclic-6d.json'],['noncyclic','六维非循环群 · 4 个 Z 类','integral-noncyclic-6d.json'],['cyclic3','六维三阶群 · 全部整数类','integral-cyclic3-6d.json'],['isometry','整数等价与等距证书','integral-isometry.json']]);

addAdvancedExamples('integral_normalizer', [['cyclotomic5','五阶分圆表示 · 无限正规化子','normalizer-cyclotomic5.json'],['dihedral7','六维二面体群 · 算术正规化子','normalizer-dihedral7.json'],['glued6','六维非直和格 · 完整正规化子','normalizer-glued6.json'],['tensor6','六维重复不可约块 · 无限正规化子','normalizer-tensor6.json'],['affine6','六维仿射扩张轨道','normalizer-affine6.json']]);
addAdvancedExamples('symbolic_interfaces', [['cyclotomic','根式与单位根的共同分圆域','interfaces-cyclotomic.json'],['cyclotomic-kernel','分圆域多矩阵共核','interfaces-cyclotomic-kernel.json'],['intertwiner','反幺正实线性交织','interfaces-intertwiner.json'],['projector','不可约投影与矩阵单位','interfaces-projector.json'],['wigner','Kramers 共表示 · 精确构造','interfaces-wigner-kramers.json'],['symmetrize','时间反演约束下的矩阵对称化','interfaces-symmetrize.json'],['screw-cocycle','螺旋轴符号 k 线 · 因子系统','interfaces-screw-cocycle.json'],['translate-star','全 k 星表示的平移相位','interfaces-translate-star.json'],['seitz','螺旋操作乘方与符号平移','interfaces-seitz.json'],['gauge','Bloch 规范变换 · 精确相位','interfaces-gauge.json']]);

addAdvancedExamples('crystkit_ext', [['torsion','P2₁2₁2₁ · 无挠性与平凡中心',{action:'torsionfree',group_number:19}],['screw-torsion','四重半螺旋 · 有限阶元素证书',{action:'affine_properties',operations:[{rotation:[[0,-1,0],[1,0,0],[0,0,1]],translation:[0,0,'1/2']}]}]]);

addAdvancedExamples('symbolic_spacegroups', [['spinful','双值螺旋轴 · 精确自旋表示','symbolic-sg-spinful.json'],['magnetic','反铁磁半平移 · Kramers 共表示','symbolic-sg-magnetic.json'],['tetrahedral','四面体群 · 精确不可约表示','symbolic-sg-tetrahedral.json'],['fullstar','磁空间群 · 全 k 星诱导','symbolic-sg-fullstar.json'],['central','边界射影表示 · 中心扩张','symbolic-sg-central.json'],['compat','原接口名称 · 符号小表示','symbolic-sg-compat.json']]);

addAdvancedExamples('carat_integral', [['conductor3','三维导子区间 · 完整 Z / 仿射类','integral-conductor-3d.json'],['conductor4','四维重复不可约块 · 有限导子证明','integral-conductor-tensor-4d.json'],['conductor6','六维循环表示 · 完整导子遍历','integral-conductor-cyclic-6d.json']]);

addAdvancedExamples('arithmetic_centralizer', [['general-order','非交换整数序 · 乘法与中心分解','centralizer-order.json'],['glued','非直和整数格 · 完整中心化子','centralizer-glued.json'],['hurwitz','Hurwitz 四元数序 · 24 个单位','centralizer-hurwitz.json'],['mixed','四元数与固定轴 · 混合中心化子','centralizer-quaternion-mixed.json'],['a5','六维 A₅ · 实二次序基本单位','centralizer-a5.json'],['a5-normalizer','六维 A₅ · 完整算术正规化子','centralizer-a5-normalizer.json']]);
