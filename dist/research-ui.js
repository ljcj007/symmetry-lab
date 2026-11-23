// Presentation only. All model, group and topology calculations run in Python.
import {GRAPHENE_REFERENCE, fetchGrapheneSources, verifyGrapheneSources} from './wannier-graphene-source.js?v=20261120-wannier1';
import {magneticTBExamples,isMagneticTBPreset} from './magnetictb-presets.js?v=20261122-tb-presets1';

import {affineComparisonHTML,handednessExample,handednessExerciseHTML,quartzHandednessExample,quartzHandednessHTML} from './crystkit-handedness-ui.js?v=20261120-quartz-hand1';
import {pMinusOneOriginResultHTML,pMinusOnePracticeFromRoute,pMinusOnePracticeHTML,pMinusOnePracticeInput} from './pminus1-practice.js?v=20261122-pminus1-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Read-only preview formatting; inputs, scientific records and exports retain all original fields.
const displayResultJSON=value=>JSON.stringify(value,(key,item)=>/sha[-_]?256|digest|hashBasis|(?:^|_)(?:fileHash|sourceHash|hash)(?:$|_)|^(?:fileHashes|sourceHashes|sourceHashAlgorithm|sourceHashNormalization|hashAlgorithm|hashNormalization|checksum)$/i.test(key)||(/fingerprint/i.test(key)&&typeof item==='string'&&/^[a-f0-9]{64}$/i.test(item))?undefined:item,2);
const pretty=value=>JSON.stringify(value,null,2);
const states={magnetictb:{text:'',result:null,model:null,busy:false,revision:0},crystkit:{text:pretty({action:'analyze',group_number:19,point:['1/7','2/7','3/7']}),result:null,busy:false,revision:0}};
const researchRenderers=new WeakMap();
const examples={magnetictb:magneticTBExamples,crystkit:[['space-group','空间群 19 · 精确运算'],['finite-orders','GL(n,ℤ) · 有限阶'],['simplify','有理数基底 · 平移格简化'],['conjugacy','矩阵群共轭'],['normalizer-orbit','给定正规化子的平移系统轨道']]};
const number=value=>typeof value==='number'?Number(value.toPrecision(7)).toString():String(value??'—');
const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const cards=items=>`<div class="stats">${items.map(([label,value])=>`<div class="stat"><div class="stat-label">${esc(label)}</div><strong>${esc(number(value))}</strong></div>`).join('')}</div>`;
function writeResearchInput(state,payload,{preserveModel=false,graphene=null,preset=null}={}){
 state.revision++;
 Object.assign(state,{text:payload===undefined?'':pretty(payload),result:null,error:null,graphene,preset});
 if(!preserveModel)state.model=null;
}
export function setResearchInput(view,payload){const state=states[view];if(!state)throw new Error('未知研究工具');writeResearchInput(state,payload);}
export function getResearchResult(view){return states[view]?.result;}

function grapheneStatus(evidence){
 return evidence
  ?'已载入原始晶格和能带路径，请运行 Python 计算。'
  :'载入会替换当前 JSON。请先保存需要保留的草稿。';
}

function grapheneSourcePanel(s){
 const {hr,settings,repository}=GRAPHENE_REFERENCE;
 return `<details id="graphene-source" class="graphene-source" ${s.grapheneOpen?'open':''}>
  <summary>核验并载入石墨烯原始文件</summary>
  <p>用 WannierTools 示例的两份原始文件重放能带。实空间晶格以 Å 为单位，M–K–Γ–M 路径使用该晶格的倒格分数坐标。</p>
  <div class="graphene-actions">
   <button type="button" class="secondary" id="graphene-download-pair">从 WannierTools 下载并载入两份文件</button>
   <button type="button" class="secondary" id="graphene-cancel" hidden>取消载入</button>
  </div>
  <p id="graphene-source-status" role="status">${grapheneStatus(s.graphene)}</p>
  <p id="graphene-source-error" class="notice error" role="alert" hidden></p>
  <details class="graphene-local">
   <summary>从本地选择同一版本的两份文件</summary>
   <p>可以从下面的链接保存原始文件，保留原文件内容，再分别选择两个文件。</p>
   <div class="graphene-files">
    <label for="graphene-local-hr"><code>${hr.fileName}</code><input id="graphene-local-hr" type="file" accept=".dat,.txt"></label>
    <label for="graphene-local-settings"><code>${settings.fileName}</code><input id="graphene-local-settings" type="file" accept=".in-bands,.txt"></label>
   </div>
   <button type="button" class="secondary" id="graphene-verify-local" disabled>核验并载入本地文件</button>
  </details>
  <ul class="graphene-source-links">
   <li><a href="${esc(hr.rawURL)}" target="_blank" rel="noopener"><code>${hr.fileName}</code></a></li>
   <li><a href="${esc(settings.rawURL)}" target="_blank" rel="noopener"><code>${settings.fileName}</code></a></li>
   <li><a href="${esc(repository+'/tree/'+GRAPHENE_REFERENCE.commit+'/examples/Graphene')}" target="_blank" rel="noopener">WannierTools 固定版本目录</a></li>
  </ul>
 </details>`;
}

function bindGrapheneSource({container,s,current,onApply}){
 const entry=container.querySelector('#graphene-source');
 const find=id=>entry.querySelector('#graphene-'+id);
 const downloadPair=find('download-pair'),cancelButton=find('cancel'),localButton=find('verify-local');
 const hrFile=find('local-hr'),settingsFile=find('local-settings'),status=find('source-status'),error=find('source-error');
 let pending=null,active=true;
 const filesReady=()=>Boolean(hrFile.files?.[0]&&settingsFile.files?.[0]);
 function updateControls(){
  downloadPair.disabled=s.busy||Boolean(pending);
  localButton.disabled=s.busy||Boolean(pending)||!filesReady();
  cancelButton.hidden=!pending;
 }
 function resetMessage(){
  status.textContent=grapheneStatus(s.graphene);
  error.hidden=true;
 }
 function cancel(){
  if(pending){pending.abort();pending=null;}
  resetMessage();
  updateControls();
 }
 async function load(readPair){
  if(!active||!current()||s.busy||pending)return;
  const request=new AbortController(),revision=++s.revision;
  pending=request;
  error.hidden=true;
  status.textContent='正在读取并核验两份文件…';
  updateControls();
  const canApply=()=>active&&current()&&pending===request&&!request.signal.aborted&&s.revision===revision;
  try{
   const verified=await readPair(request.signal);
   if(canApply())onApply(verified);
  }catch{
   if(canApply()){
    error.textContent='无法核验这对文件。请核对固定版本的原始文件，或使用本地文件入口重试。';
    error.hidden=false;
   }
  }finally{
   if(active&&current()&&pending===request){
    pending=null;
    status.textContent=grapheneStatus(s.graphene);
    updateControls();
   }
  }
 }
 entry.ontoggle=()=>{
  if(!active||!current())return;
  s.grapheneOpen=entry.open;
  if(!entry.open)cancel();
 };
 downloadPair.onclick=()=>load(signal=>fetchGrapheneSources({signal}));
 localButton.onclick=()=>load(async signal=>{
  const hr=hrFile.files?.[0],settings=settingsFile.files?.[0];
  if(hr?.size!==GRAPHENE_REFERENCE.hr.bytes||settings?.size!==GRAPHENE_REFERENCE.settings.bytes)throw new Error();
  const [hrBytes,settingsBytes]=await Promise.all([hr.arrayBuffer(),settings.arrayBuffer()]);
  return verifyGrapheneSources({hrBytes,settingsBytes,signal});
 });
 hrFile.onchange=settingsFile.onchange=()=>cancel();
 cancelButton.onclick=()=>{
  cancel();
  downloadPair.focus?.();
 };
 updateControls();
 return {
  cancel,
  dispose(){
   active=false;
   pending?.abort();
  }
 };
}

function grapheneDiagnostic(bands,evidence){
 if(!evidence||!Array.isArray(bands?.ticks))return '';
 const ticks=bands.ticks.filter(tick=>tick.label==='K');
 if(ticks.length!==1||!Number.isInteger(ticks[0].index))return '';
 const index=ticks[0].index,k=bands.kpoints?.[index],energies=bands.energies?.[index];
 if(k?.length!==3||!k.every((value,i)=>Number.isFinite(value)&&Math.abs(value-evidence.k[i])<1e-12))return '';
 if(energies?.length!==2||!energies.every(Number.isFinite)||energies[1]<energies[0])return '';
 const [lower,upper]=energies,split=(upper-lower)*1000;
 return `<section id="graphene-k-diagnostic" class="graphene-diagnostic" aria-labelledby="graphene-k-heading">
  <h3 id="graphene-k-heading">原始路径上的 K 点两带劈裂</h3>
  <p><var>k</var> = (${esc(k.join(', '))}) <span>（倒格分数坐标）</span></p>
  <dl>
   <div><dt><var>E</var><sub>1</sub></dt><dd>${lower.toFixed(8)} eV</dd></div>
   <div><dt><var>E</var><sub>2</sub></dt><dd>${upper.toFixed(8)} eV</dd></div>
   <div><dt><var>E</var><sub>2</sub> − <var>E</var><sub>1</sub></dt><dd><strong>${split.toFixed(5)} meV</strong></dd></div>
  </dl>
  <p>能量沿用输入文件的零点。这个差值由路径标出的 K 点两条能带得到。比较理想模型的简并预测时，还要核对坐标、对称性与模型本身。</p>
  <a href="#classroom/crystal?module=bands&amp;tab=learn&amp;lesson=band-crossing">回到课堂解释 K 点结果</a>
 </section>`;
}

function bandPlot(bands,energyInEV=false){
 if(!bands?.energies?.length)return '';
 const energies=bands.energies,dist=bands.distance||energies.map((_,i)=>i),values=energies.flat().filter(Number.isFinite);
 if(!values.length)return '';
 let lo=Infinity,hi=-Infinity;for(const v of values){lo=Math.min(lo,v);hi=Math.max(hi,v);}const pad=Math.max((hi-lo)*.09,.1);lo-=pad;hi+=pad;
 const left=100,right=724,width=right-left,xmax=dist.at(-1)||1;
 const x=v=>left+v/xmax*width,y=v=>300-(v-lo)/(hi-lo)*260;
 const ticks=bands.ticks||[],axis=energyInEV?'能量 / eV':'能量 / 输入参数单位';
 return `<div class="band-chart"><svg viewBox="0 0 760 350" role="img" aria-label="沿输入波矢路径计算的紧束缚能带"><title>Python 计算的能带，能量单位与跃迁参数相同</title><rect x="${left}" y="40" width="${width}" height="260" fill="#f7faf8"/>${Array.from({length:5},(_,i)=>{const v=lo+(hi-lo)*i/4;return `<path d="M${left} ${y(v)}H${right}" stroke="#dfe8e2"/><text x="${left-10}" y="${y(v)+5}" text-anchor="end">${esc(number(v))}</text>`}).join('')}${ticks.map(t=>`<path d="M${x(t.distance??dist[t.index])} 40V300" stroke="#cbdad1" stroke-dasharray="4 4"/><text x="${x(t.distance??dist[t.index])}" y="325" text-anchor="middle">${esc(t.label)}</text>`).join('')}${energies[0].map((_,j)=>`<polyline points="${energies.map((e,i)=>`${x(dist[i]).toFixed(2)},${y(e[j]).toFixed(2)}`).join(' ')}" fill="none" stroke="${['#23785f','#c78943','#5777a1','#a56887'][j%4]}" stroke-width="1.7"/>`).join('')}<path d="M${left} 40V300H${right}" fill="none" stroke="#7d9587"/><text x="${left}" y="24">${esc(axis)}</text></svg></div>`;
}
function results(view,s){
 if(!s.result)return `<div class="empty-state">${s.busy?'Python 正在计算…':'载入示例或编辑输入，然后运行 Python。'}</div>`;
 const r=s.result;
 if(view==='magnetictb')return `${cards(r.model?[['模型轨道数',r.model.orbital_count],['独立实参数',r.model.parameter_count??'导入模型'],['波矢采样数',r.bands?.energies?.length??'—']]:r.chern!==undefined?[['Chern 数',r.chern],['最小直接带隙',r.minimum_direct_gap],['网格',`${r.mesh} × ${r.mesh}`]]:r.berry_phase!==undefined?[['Berry 相位 / rad',r.berry_phase],['最小直接带隙',r.minimum_direct_gap],['Wilson 相位数',r.phases?.length]]:[['波矢采样数',r.bands?.energies?.length??r.spectrum?.length??'—'],['薄膜层数',r.layers??'—'],['开放方向',r.open_axis!==undefined?['a₁','a₂','a₃'][r.open_axis]:'—']])}${bandPlot(r.bands,Boolean(s.graphene))}${grapheneDiagnostic(r.bands,s.graphene)}${r.parameters?.length?`<details open><summary>调整跃迁参数</summary><p class="form-note">参数基底由对称性约束产生；按 JSON 中的 basis 查看每项的实际跃迁矩阵。</p><div class="parameter-grid">${r.parameters.map(p=>`<label>${esc(p.name)} <small>壳层 ${esc(p.shell)}</small><input type="number" step="any" data-parameter="${esc(p.name)}" value="${esc(p.value)}"></label>`).join('')}</div><button class="secondary small" data-apply-parameters>用新参数重新计算</button></details>`:''}${r.spectrum?table(['能量','表面谱权重'],r.spectrum.map(x=>[number(x.energy),number(x.spectral_weight)])):''}${r.phases?table(['Wilson 相位 / rad','Wannier 中心'],r.phases.map((x,i)=>[number(x),number(r.wannier_centers?.[i])])):''}${r.diagnostics?`<details open><summary>数值验证</summary>${table(['检查项','结果'],Object.entries(r.diagnostics).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):number(v)]))}</details>`:''}${r.convention?`<p class="notice">${esc(r.convention)}</p>`:''}<details><summary>完整结果与模型矩阵</summary><pre class="json-output">${esc(displayResultJSON(r))}</pre></details>`;
 return `${affineComparisonHTML(r,s.lastPayload,{cards,table})}${r.quotient?cards([['有限平移商群阶',r.quotient.order],['点群阶',r.pointGroupOrder],['商群生成元数',r.quotient.minimumGeneratorCount]]):r.allowedElementOrders?cards([['矩阵维数',r.dimension],['允许的阶数种类',r.allowedElementOrders.length],['首次出现的阶数种类',r.newElementOrders.length]]):''}${r.identification?`<p class="notice">空间群识别：${r.identification.matches?.length?r.identification.matches.map(m=>`${esc(m.number)} · ${esc(m.symbol)}`).join('；'):'当前搜索范围内未找到可验证匹配'}<br>状态：${esc(r.identification.status)}。只报告经完整操作集核验的匹配。</p>`:''}${r.quotient?table(['群性质','结果'],[['交换群',r.quotient.abelian?'是':'否'],['可解群',r.quotient.solvable?'是':'否'],['导出列群阶',r.quotient.derivedSeriesOrders.join(' → ')],['不变度量验证',r.gramInvariantVerified?'通过':'未通过']]):''}${r.orbit?`<details open><summary>点轨道 · ${r.orbit.multiplicity} 个等价点</summary><p class="form-note">${'稳定子阶'} ${r.orbit.stabilizerOrder} · ${r.orbit.orbitStabilizerVerified?'轨道–稳定子关系已验证。':'轨道–稳定子关系未验证。'}</p>${table(['序号','x','y','z'],r.orbit.points.map((p,i)=>[i+1,...p]))}</details>`:''}${r.allowedElementOrders?table(['类别','元素阶'],[['该维数全部允许',r.allowedElementOrders.join(', ')],['首次在该维数出现',r.newElementOrders.join(', ')||'无']]):''}${r.status&&r.action!=='compare'?`<p class="notice">验证状态：${esc(r.status)}${r.identityVerified?' · 共轭恒等式已验证':''}${r.reason?' · '+esc(r.reason):''}</p>`:''}<details ${r.quotient?'':'open'}><summary>完整精确结果与矩阵</summary><pre class="json-output">${esc(displayResultJSON(r))}</pre></details>`;
}

export function renderResearchView(view,options){
 const {container,run,toast,download,context,isCurrent=()=>true,onPresetChange=()=>{}}=options,s=states[view],tb=view==='magnetictb';
 const pMinusOnePractice=tb?null:pMinusOnePracticeFromRoute(context.crystkitRoute);
 const requestedPreset=tb&&isMagneticTBPreset(context.magneticTBPreset)?context.magneticTBPreset:null;
 let grapheneWidget,startedDefault=false,handednessOpen=context.handednessExercise||s.handednessOpen;
 let quartzHandednessOpen=context.quartzHandednessExercise||s.quartzHandednessOpen;
 const owner={view,draw,dispose};
 researchRenderers.get(container)?.dispose();
 researchRenderers.set(container,owner);
 if(tb&&requestedPreset!==s.preset&&(requestedPreset||s.preset)){
  writeResearchInput(s,undefined);
 }
 if(requestedPreset)s.example=requestedPreset;
 const current=()=>researchRenderers.get(container)===owner&&isCurrent();
 function dispose(){
  grapheneWidget?.dispose();
  if(researchRenderers.get(container)===owner)researchRenderers.delete(container);
 }
 function draw(){
 if(!current())return;
 grapheneWidget?.dispose();
 container.dataset.researchView=view;
 container.innerHTML=`<div class="notice research-intro">${tb?'从原子位置、轨道和对称操作生成紧束缚模型；也可导入 Wannier90 hr 文件。选择示例后运行，所有数值计算均由浏览器中的 Python 完成。载入内置示例后，复制网址即可再次打开相同输入。':'对晶体群进行精确有理数运算。可直接选用本站 230 个空间群，或输入自定义生成元；空间群识别只报告已验证的匹配。'}</div>${tb?'':pMinusOnePracticeHTML(pMinusOnePractice)+handednessExerciseHTML(handednessOpen)+quartzHandednessHTML(quartzHandednessOpen)}<div class="research-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> ${tb?'模型与计算输入':'晶体群与计算输入'}</div><span class="badge">Python</span></div><div class="panel-body"><label class="field-label" for="research-example">快速示例</label><div class="controls-row"><select id="research-example" aria-label="选择计算示例">${examples[view].map(([key,label])=>`<option value="${key}" ${s.example===key?'selected':''}>${label}</option>`).join('')}</select><button id="load-research-example" class="secondary small">载入示例</button></div>${!tb?`<div class="controls-row"><label for="cryst-number">空间群编号</label><input id="cryst-number" type="number" min="1" max="230" value="${context.mode==='sg'?context.group.number:19}"><button class="secondary small" id="cryst-use-number">使用该群</button></div>`:`<div class="controls-row"><button class="secondary small" id="tb-use-operations">使用工作台群操作</button><label class="secondary small file-label">导入 hr 文件<input type="file" id="tb-hr-file" accept=".dat,.txt" hidden></label></div>${grapheneSourcePanel(s)}`}<label class="field-label" for="research-json">${tb?'晶格、轨道、对称性和 k 路径':'操作、坐标变换与分析方式'}<span>可编辑 JSON</span></label><textarea class="band-input research-input" id="research-json" spellcheck="false" aria-label="Python 计算输入 JSON">${esc(s.text)}</textarea><details class="input-help"><summary>输入约定与可用计算</summary><p>${tb?'lattice 的每一行为一个实空间晶格矢量；position、translation 和 k 均为分数坐标。轨道可用 s、px/py/pz 或完整实 d 基底。operations 必须构成完整有限群，旋转在分数坐标列向量上作用。':'operations 或 generators 使用 rotation 和 translation；分数写为字符串，例如 "1/2"。basis 与 origin 满足 x_old = basis × x_new + origin，point 使用新坐标。给定群编号时，旧坐标使用 BC 设置。'}</p><p>${tb?'action 可选 model、bands、slab、finite、surface、topology。参数单位由你指定，能量图使用同一单位。非零跃迁的 Fourier 相位约定为 exp(+2πi k·R)。':'action 可选 analyze、finite_orders、conjugacy、blocks、simplify、normalizer_orbit 或 compare。有限阶算法区分本维数首次出现的阶与该维数全部允许的阶。'}</p><a href="python/${tb?'magnetictb_browser':'crystkit_browser'}.py" download>下载该工具 Python 源码 ↓</a></details><button id="run-research" class="primary" ${s.busy?'disabled':''}>${s.busy?'<i class="spinner"></i>Python 正在计算…':'运行 Python 计算 →'}</button><div id="research-error" role="alert">${s.error?`<p class="notice error">${esc(s.error)}</p>`:''}</div></div></section><section class="panel"><div class="result-header"><div class="result-heading">${tb?'模型与能带':'精确群分析'}<small>计算结果</small></div><div class="result-tools"><button id="research-export" class="text-button">↓ JSON</button>${tb?'<button id="tb-csv" class="text-button">↓ CSV</button><button id="tb-hr" class="text-button">↓ hr</button>':''}</div></div><div class="result-content">${pMinusOnePractice==='origin'?pMinusOneOriginResultHTML(s.result,s.lastPayload):''}${results(view,s)}</div></section></div>${tb?`<section class="panel research-followup"><div class="panel-top"><div class="panel-title"><span class="step">02</span> 用当前模型继续计算</div></div><div class="panel-body"><div class="controls-row"><label>占据带数 <input id="tb-occupied" type="number" min="1" value="1"></label><label>网格 <input id="tb-mesh" type="number" min="5" max="101" value="21"></label><label>层数 <input id="tb-layers" type="number" min="1" max="80" value="12"></label><label>开放方向 <select id="tb-axis"><option value="0">a₁</option><option value="1">a₂</option><option value="2">a₃</option></select></label></div><div class="controls-row"><button data-post="slab" class="secondary small">薄膜能带</button><button data-post="chern" class="secondary small">Chern 数 · k₁k₂ 面</button><button data-post="wilson" class="secondary small">Wilson 环 · k₁</button><button data-post="surface" class="secondary small">表面谱 · k = 0</button></div><p class="form-note">这些按钮把当前模型和参数写入左侧输入框；可调整后运行。Chern 数要求占据子空间有直接带隙，并应使用更密网格核对收敛。表面谱使用指定开放方向与 η = 0.02。</p></div></section>`:''}<p class="notice research-scope">${tb?'覆盖：对称性约束建模、s/p/d 与自旋轨道、能带、hr、薄膜、有限系统、表面 Green 函数、Berry/Wilson 和 Chern 数。精确符号 Hamiltonian、分圆域和多项式轨道可在“精确代数与高维群”中计算。完整自旋空间群目录、DFT 拟合和 Z₂ 算法仍未覆盖。':'覆盖：精确仿射闭合与坐标变换、有限商群生成元、点轨道、矩阵共轭和三维参考数据库匹配。CARAT 1–6 维 Q 类目录、群扩张、特定完整正规化子与无限群生成证书已接入“精确代数与高维群”。一般 Z 类分类仍有范围限制。'}<a href="#" data-view="advanced"> 打开精确代数与高维群 →</a></p>`;
 const $=q=>container.querySelector(q);
 const setInput=(value,{preserveModel,graphene,preset=null,reportPreset=true}={})=>{
  writeResearchInput(s,value,{preserveModel,graphene,preset});
  if(tb&&reportPreset)onPresetChange(preset,Boolean(preset));
  draw();
 };
 $('#research-json').oninput=e=>{
  if(!current())return;
  s.revision++;s.text=e.target.value;s.model=null;s.result=null;s.error=null;s.graphene=null;s.preset=null;
  if(tb)onPresetChange(null,false);
  grapheneWidget?.cancel();
  $('#run-research').disabled=!s.text.trim();
  container.querySelector('.result-content').innerHTML='<div class="empty-state">输入已修改，请重新运行计算。</div>';
 };
 $('#research-example').onchange=e=>{s.example=e.target.value;if(!tb)s.revision++;grapheneWidget?.cancel();};
 async function loadExample(key,{preset=null,reportPreset=false}={}){
  if(!current()||!examples[view].some(([id])=>id===key))return;
  grapheneWidget?.cancel();
  s.example=key;
  const revision=++s.revision;
  try{
   const response=await fetch(`examples/${view}-${key}.json`);
   if(!response.ok)throw new Error('示例读取失败');
   const payload=await response.json();
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('示例读取失败');
   if(current()&&s.revision===revision){s.example=key;setInput(payload,{preset,reportPreset});}
  }catch(e){if(current()&&s.revision===revision)toast(e.message);}
 }
 $('#load-research-example').onclick=()=>{
  if(s.busy)return;
  const key=$('#research-example').value;
  return loadExample(key,{preset:tb?key:null,reportPreset:tb});
 };
 async function calculate(){
  if(!current()||s.busy)return;
  grapheneWidget?.cancel();
  const submitted=s.revision;
  try{const payload=JSON.parse(s.text);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error('输入须为 JSON 对象。');s.busy=true;s.error=null;s.result=null;draw();const result=await run(view,payload);if(s.revision!==submitted)return;s.result=result;s.lastPayload=payload;if(result.model)s.model=result.model;else if(payload.model)s.model=payload.model;}
  catch(e){if(s.revision===submitted)s.error=e.message;}
  finally{
   s.busy=false;
   const mounted=researchRenderers.get(container);
   if(mounted?.view===view)mounted.draw();
  }
 }
 $('#run-research').onclick=calculate;
 $('#research-export').onclick=()=>s.result?download(pretty(s.result),`${view}-result.json`):toast('请先运行计算。');
 container.querySelectorAll('[data-parameter]').forEach(input=>input.disabled=s.busy);
 if(tb){
  grapheneWidget=bindGrapheneSource({container,s,current,onApply:({payload})=>{
   s.grapheneOpen=true;
   setInput(payload,{graphene:{k:payload.path.find(point=>point.label==='K').k}});
   $('#run-research').focus?.();
  }});
  $('#tb-use-operations').onclick=()=>{try{const payload=JSON.parse(s.text||'{}');payload.operations=context.group.operations;setInput(payload);toast('已复制群操作，请确认模型晶格与站点使用相同 BC 设置。');}catch(e){toast(e.message);}};
  $('#tb-hr-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;grapheneWidget.cancel();const revision=++s.revision;if(file.size>10*1024*1024){toast('hr 文件不能超过 10 MiB。');return;}const hrText=await file.text();if(s.revision!==revision||!current())return;setInput({action:'hr_import',hr_text:hrText,path:[{label:'Γ',k:[0,0,0]},{label:'X',k:[.5,0,0]}],points_per_segment:60});};
  $('#tb-hr').onclick=()=>s.result?.hr_text?download(s.result.hr_text,'symmetry-lab_hr.dat','text/plain'):toast('请先生成或导入模型。');
  $('#tb-csv').onclick=()=>{const b=s.result?.bands;if(!b){toast('当前没有能带数据。');return;}download(['kx,ky,kz,distance,'+b.energies[0].map((_,i)=>`band_${i+1}`).join(','),...b.energies.map((e,i)=>[...(b.kpoints[i]),b.distance[i],...e].join(','))].join('\n'),'tight-binding-bands.csv','text/csv');};
  $('[data-apply-parameters]')?.addEventListener('click',()=>{const inputs=[...container.querySelectorAll('[data-parameter]')];if(inputs.some(i=>!i.value.trim()||!i.validity.valid||!Number.isFinite(Number(i.value)))){toast('每个跃迁参数都必须填写有限数值。');return;}const payload=structuredClone(s.lastPayload);payload.parameters=Object.fromEntries(inputs.map(i=>[i.dataset.parameter,Number(i.value)]));writeResearchInput(s,payload);onPresetChange(null,false);calculate();});
  container.querySelectorAll('[data-post]').forEach(button=>button.onclick=()=>{
   if(!s.model){toast('请先生成或导入一个模型。');return;}
   const action=button.dataset.post,axis=Number($('#tb-axis').value),occupied=Number($('#tb-occupied').value);
   const payload={action:['chern','wilson'].includes(action)?'topology':action,model:s.model};
   if(action==='chern')Object.assign(payload,{method:'chern',occupied,mesh:Number($('#tb-mesh').value),axes:[0,1],fixed_k:[0,0,0]});
   if(action==='wilson')Object.assign(payload,{method:'wilson',occupied,path:[{label:'Γ',k:[0,0,0]},{label:'Γ + G₁',k:[1,0,0]}],points_per_segment:101});
   if(action==='slab'){const end=[0,0,0];end[(axis+1)%3]=.5;Object.assign(payload,{open_axis:axis,layers:Number($('#tb-layers').value),path:[{label:'Γ',k:[0,0,0]},{label:'X',k:end}],points_per_segment:60});}
   if(action==='surface')Object.assign(payload,{open_axis:axis,k:[0,0,0],energies:Array.from({length:81},(_,i)=>-4+i*.1),eta:.02});
   setInput(payload,{preserveModel:true});toast('已写入计算输入，点击运行即可。');
  });
 }else{
  function bindHandedness(id,example,rememberOpen){
   const exercise=$('#'+id);
   const owns=()=>current()&&exercise===$('#'+id);
   exercise.ontoggle=()=>{if(owns())rememberOpen(exercise.open);};
   exercise.querySelectorAll('[data-crystkit-hand]').forEach(button=>{
    button.disabled=s.busy;
    button.onclick=()=>{
     if(!owns()||s.busy)return;
     const input=example(button.dataset.crystkitHand);
     if(!input)return;
     rememberOpen(exercise.open);
     setInput(input);
     $('#run-research').focus?.();
    };
   });
  }
  bindHandedness('crystkit-handedness',handednessExample,open=>{handednessOpen=s.handednessOpen=open;});
  bindHandedness('crystkit-quartz-handedness',quartzHandednessExample,open=>{quartzHandednessOpen=s.quartzHandednessOpen=open;});
  const practice=$('#crystkit-pminus1');
  for(const button of practice?.querySelectorAll('[data-pminus1-input]')||[]){
   button.disabled=s.busy;
   button.onclick=()=>{
    if(!current()||practice!==$('#crystkit-pminus1')||s.busy)return;
    const payload=pMinusOnePracticeInput(pMinusOnePractice,button.dataset.pminus1Input);
    if(!payload)return;
    setInput(payload);
    $('#run-research').focus?.();
   };
  }
  $('#cryst-use-number').onclick=()=>setInput({action:'analyze',group_number:Number($('#cryst-number').value),point:['1/7','2/7','3/7']});
 }
 if(s.busy)container.querySelectorAll('textarea,select,input,#load-research-example,#cryst-use-number,#tb-use-operations,[data-post]').forEach(el=>el.disabled=true);
 if(!s.text)$('#run-research').disabled=true;
 if(!s.text&&!startedDefault&&!context.quartzHandednessExercise){
  startedDefault=true;
  const key=tb?(requestedPreset||magneticTBExamples[0][0]):$('#research-example').value;
  loadExample(key,{preset:requestedPreset});
 }
 }
 draw();
 return dispose;
}
