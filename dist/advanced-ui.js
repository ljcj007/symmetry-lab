// Presentation only: all classification and algebra are computed by Python.
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = x => JSON.stringify(x, null, 2);
const specs = {
 carat: {name:'CARAT 高维分类', intro:'检索 1–6 维全部 8,329 个有理类，查看精确矩阵代表、类数与分类证据。Q 类、Z 类和仿射类分别对应不同的等价关系。',
  examples:[['catalog','六维 Q 类目录',{action:'catalog',dimension:6,limit:20}],['classify','二维四重旋转分类',{action:'classify',dimension:2,generators:[[[0,-1],[1,0]]]}]],
  help:'dimension 为 1–6；action 可用 catalog、representative、classify、invariant_lattices。输入 generators 是整数可逆矩阵列表。目录按维数下载，分类结果中的证书说明已验证的等价关系。', module:'carat_browser'},
 symbolic: {name:'精确符号计算', intro:'以有理数、代数数和符号参数直接求解。支持精确跃迁约束、Bloch Hamiltonian、k·p 展开、分圆域与多项式轨道。',
  examples:[['algebra','矩阵特征多项式',{action:'algebra',operation:'charpoly',matrix:[['m','x-I*y'],['x+I*y','-m']]}],['cyclotomic','五次单位根恒等式',{action:'cyclotomic',order:5,expression:'1+z+z**2+z**3+z**4'}]],
  help:'精确分数或根式请写为字符串，例如 "1/3"、"sqrt(3)/2"。仅接受数学表达式；不执行 Python 代码。action 包含 model、bloch、algebra、cyclotomic、orbitals、kp。各示例给出完整输入结构。', module:'symbolic_core'},
 crystkit_ext: {name:'群扩张与正规化子', intro:'计算固定整数点群的完整向量系统、正规化子作用、仿射扩张轨道，以及无限空间群生成元证书。',
  examples:[['glide','二维反射与滑移反射',{action:'extension_orbits',rotations:[[[1,0],[0,-1]]]}],['screw','四重螺旋扩张',{action:'extensions',rotations:[[[0,-1,0],[1,0,0],[0,0,1]]]}],['normalizer','四重旋转的整数正规化子',{action:'integral_normalizer',rotations:[[[0,-1],[1,0]]]}],['generators','P2₁2₁2₁ 无限群最小生成元',{action:'spacegroup_generators',group_number:19}]],
  help:'rotations / point_generators 接受 1–6 维整数矩阵；三维也可使用 group_number。扩张先固定整数点群，再对所有原点平移取商。一般正规化子结果可能只覆盖一个有限子群，输出会明确说明。', module:'crystkit_extensions'}
};
const states = Object.fromEntries(Object.entries(specs).map(([tool,s]) => [tool,{text:pretty(s.examples[0][2]),example:s.examples[0][0],revision:0,result:null,error:null,busy:false}]));
let selected = 'carat';
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
 if(!r)return `<div class="empty-state exact-empty">${s.busy?'<i class="spinner"></i>正在进行精确计算…':'选择示例并运行，查看精确结果与验证证书。'}</div>`;
 const metrics=[];
 for(const [key,label] of [['dimension','维数'],['order','群阶'],['group_order','群阶'],['lattice_count','不变子格数'],['pointGroupOrder','点群阶'],['parameter_count','独立参数'],['extensionCount','原点等价扩张'],['orbitCount','仿射类'],['normalizerOrder','正规化子阶'],['lowerBound','生成元下界'],['upperBound','生成元上界'],['total_matches','匹配 Q 类'],['q_classes','该维 Q 类总数'],['rank','一般秩'],['nullity','零空间维数'],['degree','次数']])if(r[key]!=null)metrics.push([label,r[key]]);
 let out=metrics.length?cards(metrics.slice(0,6)):'';
 const summary=[['status','结果状态'],['q_status','Q 类识别'],['z_status','Z 类识别'],['q_class','Q 类代表'],['complete_through_requested_index','指定指数内穷尽'],['scope','适用范围'],['certificate','验证证据'],['reason','说明'],['complete','当前步骤穷尽'],['classificationCompleteForIntegralPointGroup','该整数点群分类穷尽'],['normalizerComplete','正规化子完整'],['minimumCertified','最小生成元已证明']];
 const evidence=summary.filter(([k])=>r[k]!=null).map(([k,label])=>[label,typeof r[k]==='boolean'?(r[k]?'是':'否'):r[k]]);if(evidence.length)out+=table(['结果说明','内容'],evidence);
 if(r.conditions?.length)out+=`<p class="notice">参数适用条件：${r.conditions.map(c=>esc(c.condition||c)).join('；')}。例外参数可能改变秩，请代入后重新计算。</p>`;

 if(r.generators)out+=`<details open><summary>精确生成元</summary><pre class="json-output">${esc(pretty(r.generators))}</pre></details>`;
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
 container.innerHTML=`<div class="advanced-tabs" role="group" aria-label="选择精确计算工具">${Object.entries(specs).map(([key,item])=>`<button data-exact-tool="${key}" class="${key===tool?'active':''}">${esc(item.name)}</button>`).join('')}</div><p class="notice research-intro">${esc(spec.intro)}</p><div class="research-grid advanced-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> 精确计算输入</div><span class="badge">Python · SymPy</span></div><div class="panel-body"><label class="field-label" for="exact-example">可运行示例</label><div class="controls-row"><select id="exact-example">${spec.examples.map(([key,label])=>`<option value="${key}" ${s.example===key?'selected':''}>${esc(label)}</option>`).join('')}</select><button id="exact-load" class="secondary small">载入示例</button></div>${tool==='carat'?`<div class="controls-row exact-catalog-controls"><label for="carat-dimension">目录维数</label><select id="carat-dimension">${[1,2,3,4,5,6].map(d=>`<option ${d===(input.dimension??6)?'selected':''}>${d}</option>`).join('')}</select><input id="carat-query" aria-label="搜索 CARAT 名称或符号" placeholder="名称 / 符号（可留空）" value="${esc(input.query||'')}"><button id="exact-catalog" class="secondary small">载入查询</button></div>`:''}<label class="field-label" for="exact-input">参数与操作 <span>JSON · 根式 / 分数写为字符串</span></label><textarea id="exact-input" class="band-input research-input" spellcheck="false">${esc(s.text)}</textarea><details class="input-help"><summary>输入与计算约定</summary><p>${esc(spec.help)}</p><a href="python/${spec.module}.py" download>下载 Python 源码 ↓</a></details><button id="exact-run" class="primary" ${s.busy?'disabled':''}>${s.busy?'<i class="spinner"></i>Python 正在计算…':'运行精确计算 →'}</button>${s.error?`<p class="notice error" role="alert">${esc(s.error)}</p>`:''}</div></section><section class="panel"><div class="result-header"><div class="result-heading">${esc(spec.name)}<small>精确结果与证据</small></div><div class="result-tools"><button id="exact-json" class="text-button">↓ JSON</button>${tool==='symbolic'?'<button id="exact-tex" class="text-button">↓ LaTeX</button>':''}</div></div><div id="exact-results" class="result-content">${resultView(tool,s)}</div></section></div><p class="notice research-scope">Q 类目录完整覆盖 1–6 维；一般 Z 类枚举仍受搜索范围约束。扩张分类固定整数点群，只有完整正规化子才保证仿射分类完整。符号模块提供已验证的精确算法，不等同于四个上游项目全部接口。<a href="#" data-view="docs">查看方法与覆盖范围 →</a></p>`;
 const $=selector=>container.querySelector(selector);
 const setInput=p=>{s.revision++;s.text=pretty(p);s.result=null;s.error=null;draw();};
 container.querySelectorAll('[data-exact-tool]').forEach(b=>b.onclick=()=>{selected=b.dataset.exactTool;renderAdvancedView(options);});
 $('#exact-input').oninput=e=>{s.revision++;s.text=e.target.value;s.result=null;s.error=null;$('#exact-results').innerHTML='<div class="empty-state">输入已修改，请重新运行。</div>';};
 $('#exact-example').onchange=e=>{s.example=e.target.value;};
 $('#exact-load').onclick=async()=>{const example=spec.examples.find(e=>e[0]===s.example),revision=++s.revision;try{let p=example[2];if(typeof p==='string'){const response=await fetch(`examples/${p}?v=20261016-exact`);if(!response.ok)throw new Error('示例加载失败');p=await response.json();}if(s.revision===revision)setInput(p);}catch(e){if(s.revision===revision)toast(e.message);}};
 $('#exact-catalog')?.addEventListener('click',()=>setInput({action:'catalog',dimension:Number($('#carat-dimension').value),query:$('#carat-query').value,limit:20}));
 for(const [id,sign] of [['carat-prev',-1],['carat-next',1]])$('#'+id)?.addEventListener('click',()=>{const payload=JSON.parse(s.text);setInput({...payload,offset:Math.max(0,(payload.offset||0)+sign*(payload.limit||20))});container.querySelector('#exact-run').click();});
 $('#carat-representative')?.addEventListener('click',()=>setInput({action:'representative',dimension:JSON.parse(s.text).dimension||3,name:$('#carat-name').value}));
 $('#exact-run').onclick=async()=>{const revision=s.revision;try{const payload=JSON.parse(s.text);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error('输入须为 JSON 对象');s.busy=true;s.error=null;s.result=null;draw();const result=await run(tool,payload);if(s.revision===revision)s.result=result;}catch(e){if(s.revision===revision)s.error=e.message;}finally{s.busy=false;draw();}};
 $('#exact-to-bands')?.addEventListener('click',()=>options.sendToBands?.({...s.result.numerical_model,path:[{label:'−X',k:[-.5,0,0]},{label:'Γ',k:[0,0,0]},{label:'X',k:[.5,0,0]}],points_per_segment:40}));
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
