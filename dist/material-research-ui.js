import {phonopyDerivationLearningLinkHTML} from './phonopy-derivation-host.js?v=20261117-derive1';
import {learningBridgeHTML,bindLearningBridge} from './learning-bridge-host.js?v=20261117-derive1';
import {projectInputFor,projectInputStatusHTML} from './project-input.js?v=20261117-phonopy1';
import {courseFlowRoute,courseFlowActions,bindCourseFlowActions,renderCourseFlowSteps,createCourseFlowDrafts} from './course-flow.js?v=20261113-flow1';
import {crystalSpan} from './crystal-notation.js?v=20261111-demos1';
import {svgMathText} from './math-svg.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {captureCalculation,RELEASE} from './material-notebook.js?v=20261117-derive1';
import {bindOptionalPanel} from './optional-panel.js?v=20261120-gamma-trace1';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(x)?Number(x.toPrecision(6)):'—';
const options=(rows,v)=>rows.map(([id,label])=>`<option value="${esc(id)}" ${String(id)===String(v)?'selected':''}>${esc(label)}</option>`).join('');
const table=(heads,rows,renderCell=esc)=>`<div class="obs-table"><table><thead><tr>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((value,column)=>`<td>${renderCell(value,column)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const notes=rows=>rows?.length?`<aside class="mr-scope"><ul>${rows.map(x=>`<li>${esc(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul></aside>`:'';
const sources=rows=>`<div class="obs-sources">${(rows||[]).map(s=>typeof s==='string'?{title:s,url:s}:s).filter(s=>/^https:\/\//.test(s.url||'')).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer"${s.id?.startsWith('graphene-wannier-')?' data-math-ignore':''}>${esc(s.title||s.url)} ↗</a>`).join('')}</div>`;
const palette=['#247b65','#b17a31','#617caf','#a75f85'];

function modeLabelHTML(classification){
 const {decomposition=[],label,status}=classification;
 if(decomposition.length)return decomposition.map(({irrep,multiplicity})=>
  (multiplicity>1?esc(multiplicity)+' × ':'')+crystalSpan(irrep,'irrep')
 ).join(' ⊕ ');
 if(label)return crystalSpan(label,'irrep');
 const statusText={
  'characters-only':'已给出特征标',
  'not-invariant':'子空间不封闭',
  inconsistent:'分类条件不满足',
  unavailable:'未分类',
 };
 return esc(statusText[status]||'未分类');
}

function gammaTranslationHTML(diagnostic){
 if(!diagnostic)return '';
 const heading='<h4>Γ 点刚性平移诊断</h4>';
 if(diagnostic.status==='unavailable')return `<aside class="mr-scope" data-mr-translation="unavailable">${heading}<p>需要完整的 3N 本征矢和相互正交的频率子空间。</p></aside>`;
 const findings={
  resolved:'在权重容差内，三个刚性平移方向均落在零频窗口内。',
  outside:'零频窗口外仍有刚性平移权重。检查本征矢约定及零频窗口容差。',
  straddling:'含有平移权重的频率簇跨越零频窗口边界。请调整分组或窗口容差后再判读。',
 };
 return `<aside class="mr-scope" data-mr-translation="${esc(diagnostic.status)}">${heading}
  <p><strong>零频窗口</strong> |ν| ≤ ${esc(num(diagnostic.frequencyTolerance))} ${esc(diagnostic.frequencyUnit)}</p>
  <p><strong>窗口内的平移权重</strong> ${esc(num(100*diagnostic.nearZeroWeightFraction))}%</p>
  <p>${esc(findings[diagnostic.status])}</p>
  <p>表中的平移权重按三个质量加权的刚性平移方向归一化。此处只核对输入本征矢与频率。</p>
 </aside>`;
}

function modeGroupsHTML(result){
 // Keep the same integer-equivalence tolerance as phonon_modes._groups.
 const gamma=result.selection.q.every(component=>Math.abs(component-Math.round(component))<1e-8);
 const groups=result.modeGroups||[],translation=result.translationDiagnostic;
 const weights=new Map((translation?.groups||[]).map(group=>[group.bands[0],group.weightFraction]));
 const heads=['模式索引','频率 / '+(result.frequencyUnit==='unknown'?'未知（文件未声明）':result.frequencyUnit),'子空间维数'];
 if(gamma)heads.push('不可约分解','封闭残差');
 if(weights.size)heads.push('刚性平移权重');
 const rows=groups.map(group=>{
  const row=[group.bands.join(', '),group.frequencies.map(num).join(', '),group.dimension];
  if(gamma)row.push(group.classification,num(group.classification.invarianceError));
  if(weights.size)row.push(num(100*weights.get(group.bands[0]))+'%');
  return row;
 });
 return `<h3>${gamma?'频率子空间与 Γ 点表示':'有限波矢的频率子空间'}</h3>
  ${gamma?'':'<p>当前为非 Γ 点。这里显示频率分组与冻结结构。</p>'}
  ${gammaTranslationHTML(translation)}
  ${table(heads,rows,(value,column)=>column===3?modeLabelHTML(value):esc(value))}
  <div class="mr-choices">${groups.map(group=>`<button class="secondary" type="button" data-mr-mode="${group.bands[0]}">选择 ${group.bands.join('/')}${gamma?' · '+modeLabelHTML(group.classification):''}</button>`).join('')}</div>
  ${gamma?groups.map(group=>`<details><summary>模式 ${group.bands.join(', ')}：字符与分类依据</summary><p>${esc(group.classification.reason)}</p>${table(['类 / 操作','个数','Re χ','Im χ'],modeCharacterRows(group.classification))}</details>`).join(''):''}`;
}

const thermalBasis=r=>{const label=r.basisLabel||(r.basis==='per-input-cell'?'每输入计算胞':'每模型原胞'),cell=label.replace(/^每/,'');return {label,cell,energy:'kJ/mol'+cell,entropy:'J/(mol'+cell+' K)'};};
export const CU_THERMAL_EXAMPLE=Object.freeze({id:'official-phonopy-cu-thermal-index05',filename:'phonopy-cu-thermal-index05.yaml',sha256:'1c9e6edeeded194fc7eebe9c4f4bd6e88728b48ea4f530a033240f8394267bf1',byteCount:41975,commit:'18cad919af8fe8aad349e04f101887fa19b051a0',path:'test/cui/phonopy_qha/Cu-QHA/thermal_properties.yaml-05.xz',url:'https://github.com/phonopy/phonopy/blob/18cad919af8fe8aad349e04f101887fa19b051a0/test/cui/phonopy_qha/Cu-QHA/thermal_properties.yaml-05.xz',archiveFile:'phonopy-cu-thermal-index05.yaml.xz',archiveSha256:'36c87fc5560cc7815cd9d97105830c00cffa4a3a2fb486235d7976bc493ebb1f',archiveByteCount:4900,natom:4,rowCount:251,license:'BSD-3-Clause',representation:'losslessly-decompressed-upstream-utf8'});
const CU_EXAMPLE_CACHE='20261114-evidence1';
const MATERIAL_RESEARCH_CACHE='20261120-al-gamma1';
const znoIRPanelHTML=open=>`<details class="mr-scope" data-mr-zno-ir-entry ${open?'open':''}><summary>ZnO Γ 点红外偏振预测</summary><div data-mr-zno-ir-body></div></details>`;
const alGammaScenes=[
 ['gamma-reciprocal','载入 q = (1, 1, 1)'],
 ['gamma-origin','载入 q = (0, 0, 0)'],
 ['boundary','载入边界 q = (1/2, 1/2, 1/2)'],
];
const alGammaPanelHTML=open=>`<details class="mr-scope" id="mr-al-gamma" ${open?'open':''}>
 <summary>用官方 Al 数据核对 Γ 等价性</summary>
 <p>先预测。两种原胞倒易坐标 q = (1, 1, 1) 和 q = (0, 0, 0) 会给出相同的 Γ 点表示吗？边界波矢 q = (1/2, 1/2, 1/2) 能用一个原胞冻结吗？</p>
 <div class="obs-links">${alGammaScenes.map(([id,label])=>`<button type="button" class="secondary" data-mr-al-scene="${id}">${label}</button>`).join('')}</div>
 <p>选择后核对并载入两份原文件。按下运行按钮后比较表示、原始频率与长度单位。边界波矢预填 [2, 2, 2]，可以改成 [1, 1, 1] 检验周期性。</p>
 <div class="obs-links"><a href="docs/phonopy-import.md#official-al-gamma">Al 原文件与分步核对 →</a><a href="#atlas/research?material=al-phonopy-gamma">铝声子材料案例 →</a></div>
 </details>`;
const alGammaLessonHTML=()=>`<aside class="mr-scope"><h3>用官方 Al 数据核对 Γ 等价性</h3><p>用同一组 Phonopy 计算数据比较两种 Γ 点坐标写法，再检验边界波矢能否用一个原胞冻结。</p><p><a href="#compute/phonon-modes?preset=al-gamma">打开 Al 声子模式练习 →</a></p></aside>`;
function alGammaSourceHTML(identity){
 const {band,companion}=identity;
 return `<aside class="mr-scope"><h3>官方 Al 配套文件已核对</h3><p>两份文件均匹配固定版本的 SHA-256。THz 是此算例明确采用的频率单位，原文件中的长度单位为 au。</p><ul>${[band,companion].map(file=>`<li><a href="${esc(file.url)}" target="_blank" rel="noreferrer" data-math-ignore>${esc(file.filename)} ↗</a></li>`).join('')}</ul><p><a href="data/examples/phonopy-al-abacus-source.json" target="_blank">固定版本、单位与许可证 ↗</a></p></aside>`;
}
export async function verifyCuThermalExample(content){
 if(typeof content!=='string')return null;const bytes=new TextEncoder().encode(content);
 if(bytes.length!==CU_THERMAL_EXAMPLE.byteCount||!globalThis.crypto?.subtle)return null;
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
 return hash===CU_THERMAL_EXAMPLE.sha256?{...CU_THERMAL_EXAMPLE,verificationBasis:'parsed-utf8-content'}:null;
}
function cuThermalSourceHTML(){return `<aside class="mr-scope"><h3>官方 Cu 热性质计算示例</h3><p>这是 Phonopy 官方 Cu-QHA 测试中的固定体积计算输出，未在本站重算，也不是实验数据。原文件含 4 个原子的输入计算胞和 251 个温度点（0–2500 K）；不能把其摩尔量当作一摩尔原子或一原子原胞。</p><p>F、U 的单位为 kJ/mol 输入计算胞，S、Cv 为 J/(mol 输入计算胞 K)。本站按 U=F+TS/1000 求内能；与原文件 energy 列的差不超过 1.68×10⁻⁷ kJ/mol，来自原文有限小数位。原始列完整保留在下载文件中。</p><p>单份热性质曲线不提供本征矢、不同质量原子的相对运动或静态 E(V)，不能单独得到完整 QHA、热膨胀、Cp 或热导率，也不证明网格收敛。</p><div class="obs-links"><a href="${CU_THERMAL_EXAMPLE.url}" target="_blank" rel="noreferrer">固定版本原压缩文件 ↗</a><a href="data/examples/phonopy-cu-thermal-index05.yaml" download>↓ 原文逐字节解压 YAML</a><a href="data/examples/phonopy-cu-thermal-index05.yaml.xz" download>↓ 原始 XZ 归档</a><a href="data/examples/phonopy-cu-LICENSE.txt" target="_blank">完整 BSD 三条款许可 ↗</a><a href="docs/cu-thermal-example.md" target="_blank">来源、单位与分步核对 ↗</a></div><details><summary>Cu 文件身份与计量基准</summary><p>${esc(CU_THERMAL_EXAMPLE.commit)} · ${esc(CU_THERMAL_EXAMPLE.path)}</p><pre>SHA-256: ${CU_THERMAL_EXAMPLE.sha256}\nUTF-8 bytes: ${CU_THERMAL_EXAMPLE.byteCount}\nXZ SHA-256: ${CU_THERMAL_EXAMPLE.archiveSha256}</pre><a href="data/examples/phonopy-cu-thermal-source.json" target="_blank">完整来源记录 ↗</a></details></aside>`;}
const modeCharacterRows=classification=>(classification.characters?.length?classification.characters.map((c,i)=>[c.class||c.operation||i+1,c.size??1,num(c.real),num(c.imag)]):(classification.operationCharacters||[]).map((c,i)=>['操作 '+(i+1),1,num(Array.isArray(c)?c[0]:c.re??c.real),num(Array.isArray(c)?c[1]:c.im??c.imag)]));
function modeSourceIdentityHTML(identity){
 const reference=identity?.reference;if(reference?.id!=='phonopy-zno-derived-qpoints')return '';
 const companion=reference.companion||{};
 return `<aside class="mr-scope"><h3>ZnO 派生计算来源</h3><p>本征矢由 Phonopy 对官方 ZnO 力数据离线后处理生成，本例关闭 NAC；它不是原仓库已有的 qpoints 输出，也不是本站新执行的第一性原理计算。</p><p>${companion.matchesPinnedSource?'伴随原胞与固定版本原文逐字节一致。':'伴随原胞未与固定原文逐字节匹配；请核对所用原胞、原子顺序和质量。'}</p><details><summary>主文件与伴随原胞的身份</summary><pre data-math-ignore>${esc('qpoints SHA-256: '+identity.sha256+'\nqpoints UTF-8 bytes: '+identity.byteCount+'\ncompanion SHA-256: '+(companion.actualSha256||'—')+'\nexpected companion SHA-256: '+(companion.expectedSha256||'—')+'\nPhonopy: '+(reference.generator?.phonopy||'—'))}</pre></details><div class="obs-links"><a href="data/examples/phonopy-zno-source.json" target="_blank">ZnO 输入与生成记录 ↗</a><a href="docs/phonopy-import.md#zno-derived-example" target="_blank">ZnO 数据与练习 ↗</a>${companion.matchesPinnedSource?'<a href="#compute/phonon-modes?preset=zno-ir">比较 ZnO Γ 点的红外偏振 →</a><a href="#compute/distortion-modes">继续：ZnO 固定声子支的正交相位对照 →</a>':''}</div></aside>`;
}
const grapheneProgress={ideal:false,interpretation:false};
const formula=tex=>`<span class="sl-math">${mathHTML(tex)}</span>`;
function grapheneActivityHTML(){
 const {ideal,interpretation}=grapheneProgress;
 return `<details id="mr-graphene-activity" class="learning-remediation" ${ideal?'open':''}>
  <summary>石墨烯在 K 点一定简并吗？</summary>
  <fieldset id="mr-graphene-ideal-question" ${ideal?'disabled':''}>
   <legend>1. 预测理想模型的 K 点</legend>
   <p>取等价的 A、B 子晶格，仅保留相同的最近邻跃迁，并忽略自旋轨道耦合。K 点三个跃迁的相位是 ${formula('1,\\,\\omega,\\,\\omega^2')}，其中 ${formula('\\omega=\\exp(2\\pi i/3)')}。两条能带在这里怎样排列？</p>
   <label><input type="radio" name="mr-graphene-ideal" value="equal" ${ideal?'checked':''}><span>两条能带简并</span></label>
   <label><input type="radio" name="mr-graphene-ideal" value="split"><span>相等的跃迁幅度会让两个能量分开</span></label>
   <label><input type="radio" name="mr-graphene-ideal" value="unknown"><span>需要先知道跃迁的数值</span></label>
   <button id="mr-graphene-check-ideal" type="button" class="secondary">检查预测</button>
   <p id="mr-graphene-ideal-status" class="learning-feedback" role="status">${ideal?'预测正确。':''}</p>
  </fieldset>
  <div id="mr-graphene-compare" ${ideal?'':'hidden'}>
   <p>三个相位相加为 ${formula('1+\\omega+\\omega^2=0')}，所以非对角跃迁在 K 点抵消。两个子晶格的在位能相等，此处两个本征值相同。</p>
   <h4 id="mr-graphene-import-heading" tabindex="-1">2. 核验文件并计算能量</h4>
   <p>打开 MagneticTB，展开「核验并载入石墨烯原始文件」，载入两份固定版本文件，再点击「运行 Python 计算」。沿原文件的 M–K–Γ–M 路径找到 K，记录两个原始能量。</p>
   <p>先用 eV 作差，再乘以 1000 换算为 meV。</p>
   <div class="obs-links"><a href="#magnetictb">打开 MagneticTB 并核验石墨烯文件 →</a></div>
   <fieldset id="mr-graphene-interpretation-question" ${interpretation?'disabled':''}>
    <legend>3. 比较 K 点的数值证据</legend>
    <label><input type="radio" name="mr-graphene-interpretation" value="zero"><span>劈裂为零，因为通过了厄米性检查</span></label>
    <label><input type="radio" name="mr-graphene-interpretation" value="point" ${interpretation?'checked':''}><span>有 meV 量级的直接劈裂，结论适用于这份输入的这个 K 点</span></label>
    <label><input type="radio" name="mr-graphene-interpretation" value="global"><span>有 eV 量级的劈裂，可以据此得到整个布里渊区的最小带隙</span></label>
    <button id="mr-graphene-check-interpretation" type="button" class="secondary">核对结果与结论</button>
    <p id="mr-graphene-interpretation-status" class="learning-feedback" role="status">${interpretation?'结果与结论正确。':''}</p>
   </fieldset>
   <div id="mr-graphene-explanation" tabindex="-1" ${interpretation?'':'hidden'}>
    <p>固定文件在路径标出的 K 点给出 −1.2621987299 eV 和 −1.2592532701 eV。改用精确分数坐标 ${formula('(1/3,1/3,0)')} 后，仍有约 2.946 meV 的劈裂。把两个能量同时减去费米能，差值保持不变。</p>
    <p>厄米性保证本征值为实数。判断简并需要检查使两态保持同能的对称条件，寻找全区最小带隙需要检查整个布里渊区。</p>
    <div class="obs-links"><a href="docs/wannier-graphene-example.md">文件来源、坐标约定与复现 →</a><a href="#atlas/research?material=graphene-wannier">石墨烯材料案例 →</a></div>
   </div>
  </div>
 </details>`;
}
function bindGrapheneActivity(root,isCurrent){
 const activity=root.querySelector('#mr-graphene-activity');
 if(!activity)return;
 const find=id=>activity.querySelector('#mr-graphene-'+id);
 function bindAnswer(stage,correct,{hint,success,reveal,focus}){
  find('check-'+stage).onclick=()=>{
   if(!isCurrent()||root.querySelector('#mr-graphene-activity')!==activity||grapheneProgress[stage])return;
   if(stage==='interpretation'&&!grapheneProgress.ideal)return;
   const selection=[...activity.querySelectorAll(`[name="mr-graphene-${stage}"]`)].find(input=>input.checked);
   const feedback=find(stage+'-status');
   if(!selection){feedback.textContent='请先选择一个答案。';return;}
   if(selection.value!==correct){feedback.textContent=hint;return;}
   grapheneProgress[stage]=true;
   feedback.textContent=success;
   find(stage+'-question').disabled=true;
   find(reveal).hidden=false;
   find(focus).focus?.();
  };
 }
 bindAnswer('ideal','equal',{
  hint:'把三个等长的相位矢量首尾相接，再想一想它们的和。',
  success:'预测正确。',reveal:'compare',focus:'import-heading'
 });
 bindAnswer('interpretation','point',{
  hint:'请比较两个能量的差值和单位。厄米性不要求两条带等能。',
  success:'结果与结论正确。',reveal:'explanation',focus:'explanation'
 });
}
let catalogPromise,lastResult=null,handoff=null;
const catalog=()=>catalogPromise??=fetch('data/material-research.json?v='+MATERIAL_RESEARCH_CACHE).then(r=>{if(!r.ok)throw Error('材料分析课程未能载入');return r.json();}).catch(e=>{catalogPromise=null;throw e;});
export const getMaterialResearchResult=()=>lastResult;
export function setMaterialResearchInput(module,input){handoff={module,input:structuredClone(input)};}
export const researchCourseRoute=(module,query='')=>'#classroom/'+({modes:'structure-dynamics',bands:'crystal',thermo:'observables'}[module]||'structure-dynamics')+'?module='+module+(query?'&'+query:'');
export function multiCurveSVG(series,{xLabel='x',yLabel='y',cursor=null,includeZero=true}={}){
 const clean=(Array.isArray(series)?series:[]).map(s=>({...s,points:(Array.isArray(s?.points)?s.points:[]).filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite))})).filter(s=>s.points.length);if(!clean.length)return '<p>当前数据没有这个物理量。</p>';
 const ps=clean.flatMap(s=>s.points);let xmin=Math.min(...ps.map(p=>p[0])),xmax=Math.max(...ps.map(p=>p[0])),ymin=Math.min(...ps.map(p=>p[1])),ymax=Math.max(...ps.map(p=>p[1]));
 if(includeZero){ymin=Math.min(0,ymin);ymax=Math.max(0,ymax);}else{const pad=(ymax-ymin)*.08||Math.max(Math.abs(ymin)*.02,1);ymin-=pad;ymax+=pad;if(xmin===xmax){const xpad=Math.max(Math.abs(xmin)*.02,1);xmin-=xpad;xmax+=xpad;}}
 const dx=xmax-xmin||1,dy=ymax-ymin||1;
 const xy=p=>[80+570*(p[0]-xmin)/dx,255-210*(p[1]-ymin)/dy];
 return `<svg class="obs-curve" viewBox="0 0 720 340" role="img" aria-label="${esc(yLabel)} 随 ${esc(xLabel)} 变化"><title>${svgMathText(yLabel)}</title><path d="M80 35V255H660" fill="none" stroke="#9eb3a5"/>${[0,.5,1].map(t=>`<line x1="80" x2="660" y1="${255-t*210}" y2="${255-t*210}" stroke="#dce6df"/><text x="70" y="${261-t*210}" text-anchor="end">${num(ymin+t*dy)}</text>`).join('')}${clean.map((s,i)=>s.points.length===1?`<circle cx="${xy(s.points[0])[0]}" cy="${xy(s.points[0])[1]}" r="4" fill="${palette[i%4]}"/>`:`<polyline points="${s.points.map(p=>xy(p).join(',')).join(' ')}" fill="none" stroke="${palette[i%4]}" stroke-width="3"/>`).join('')}${Number.isFinite(cursor)?`<path d="M${xy([cursor,0])[0]} 35V255" stroke="#aa7252" stroke-dasharray="4 4"/>`:''}<text x="80" y="282">${num(xmin)}</text><text x="650" y="282" text-anchor="end">${num(xmax)}</text><text x="90" y="23">${svgMathText(yLabel)}</text><text x="360" y="317" text-anchor="middle">${svgMathText(xLabel)}</text></svg><div class="mr-legend">${clean.map((s,i)=>`<span><i style="background:${palette[i%4]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
export function connectionSVG(result){
 const groups=[0,1,2].map(col=>result.nodes.filter(n=>n.column===col)),positions=new Map();groups.forEach((g,col)=>g.forEach((n,i)=>positions.set(n.id,[100+250*col,95+(i-(g.length-1)/2)*85+50])));
 return `<svg class="obs-curve" viewBox="0 0 720 310" role="img" aria-label="端点表示到线表示的相容连接图"><title>由限制表示重数生成的连接；不是能量坐标</title>${result.edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return '';return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${result.active?'#40856f':'#a5ada6'}" stroke-width="3" ${result.active?'':'stroke-dasharray="5 4"'}/>`;}).join('')}${result.nodes.map(n=>{const p=positions.get(n.id);return `<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="#247b65"/><text x="${p[0]}" y="${p[1]-18}" text-anchor="middle">${esc(n.label)}</text>`;}).join('')}<text x="360" y="278" text-anchor="middle">${result.active?'对称性保持：分支相容':'对称性破缺：虚线仅作母相参考'}</text></svg>`;
}
export function frozenStructureSVG(frozen,yaw=-35){
 const atoms=frozen?.atoms||[],cell=frozen?.lattice;if(!atoms.length||!cell)return '';
 const cart=p=>[0,1,2].map(j=>p.reduce((s,v,i)=>s+v*cell[i][j],0)),vertices=Array.from({length:8},(_,i)=>cart([i&1?1:0,i&2?1:0,i&4?1:0])),edges=[];for(let i=0;i<8;i++)for(const k of [1,2,4])if(i<(i^k))edges.push([i,i^k]);
 const a=yaw*Math.PI/180,raw=p=>[Math.cos(a)*p[0]-Math.sin(a)*p[1],.4*(Math.sin(a)*p[0]+Math.cos(a)*p[1])-p[2]],bounds=[...vertices,...atoms.flatMap(x=>[x.equilibrium,x.position])].map(raw),xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)],scale=Math.min(550/(hi[0]-lo[0]||1),285/(hi[1]-lo[1]||1)),project=p=>raw(p).map((v,i)=>(i?190:340)+(v-(hi[i]+lo[i])/2)*scale),species=[...new Set(atoms.map(x=>x.symbol))];
 return `<svg class="mr-view" viewBox="0 0 680 390" role="img" aria-label="冻结模式结构，空心标记为原位"><title>冻结结构；空心圆为平衡位置，线段表示真实位移</title>${edges.map(([i,j])=>{const p=project(vertices[i]),q=project(vertices[j]);return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#bacdbe"/>`;}).join('')}${atoms.map(atom=>{const p=project(atom.equilibrium),q=project(atom.position);return `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="none" stroke="#839c8c" stroke-dasharray="3 3"/><line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#ad7f34" stroke-width="3"/><circle cx="${q[0]}" cy="${q[1]}" r="8" fill="${palette[species.indexOf(atom.symbol)%4]}"/>${atoms.length<=40?`<text x="${q[0]+10}" y="${q[1]-9}">${esc(atom.symbol)}</text>`:''}`;}).join('')}</svg>`;
}
const defaults={modes:{preset:'silicon',selected_q:0,selected_band:3,amplitude:.1,phase:0,supercell:[1,1,1],frequency_tolerance:1e-5,translation_frequency_tolerance:1e-5,symprec:1e-5,length_unit:'auto',frequency_unit:'unknown',content:'',structure_content:'',filename:'phonons.yaml'},bands:{model:'c4v',samples:121,beta:1,gamma:.6,eta:0,mixing:0,soc:.6,zeeman:0,hopping:1},thermo:{source:'compare',natom:2,theta_e:400,theta_d:500,t_min:0,t_max:1000,t_step:20,frequency_unit:'THz',zero_policy:'error',dos_normalization:'3n',dos_complete:false,content:'',filename:'mesh.yaml'}};
export async function renderMaterialResearchView({container,selection={},run,cancelRun,download,onNavigate=()=>{},onLocation=()=>{}}){
 container.innerHTML='<div class="obs-page mr-page"><p role="status">正在准备材料分析课程…</p></div>';const root=container.firstElementChild,$=s=>root.querySelector(s),current=()=>root.parentNode===container&&container.isConnected!==false;lastResult=null;
 let data;try{data=await catalog();}catch(e){if(current())root.innerHTML=`<p role="alert">${esc(e.message)}</p>`;return;}if(!current())return;
 const flowSteps=new Map(),flowDrafts=createCourseFlowDrafts();
 const thermalBridgeStates=new Map();let disposeThermalBridge=()=>{};
 const irState={};let disposeIR=()=>{},irOpen=selection.preset==='zno-ir';
 let alOpen=selection.preset==='al-gamma',verifiedAl=null;
 let module=data.modules.find(m=>m.id===selection.module)||data.modules[0],lesson=data.lessons.find(l=>l.id===selection.lesson&&l.module===module.id)||data.lessons.find(l=>l.module===module.id),exercise=data.exercises.find(e=>e.id===selection.exercise&&data.lessons.some(l=>l.id===e.lesson&&l.module===module.id))||data.exercises.find(e=>e.lesson===lesson.id),tab=selection.calculationOnly?'lab':selection.atlasOnly?'cases':['learn','lab','derive','cases'].includes(selection.tab)?selection.tab:'learn';
 if(selection.exercise)lesson=data.lessons.find(l=>l.id===exercise.lesson)||lesson;
 const forms=structuredClone(defaults);if(['silicon','gaas','nacl'].includes(selection.material))forms.modes.preset=selection.material;
 if(handoff?.module===module.id){Object.assign(forms[module.id],handoff.input);if(module.id==='modes'&&(handoff.input.content||handoff.input.data))forms.modes.preset='custom';handoff=null;tab='lab';}
 const projectLoad=projectInputFor(selection,module.action,forms[module.id]);if(projectLoad.status==='loaded'){forms[module.id]=projectLoad.input;tab='lab';}
 let result=null,busy=false,ticket=0,fileTicket=0,pendingRead=null,activeJob=null,verifiedCuContent=null,inputNotice='',cursor=0,quantity='heatCapacity',progress={};try{const p=JSON.parse(localStorage.getItem('symmetry-lab.material-research.progress.v1')||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))progress=p;}catch{}
 const isCuInput=()=>module.id==='thermo'&&forms.thermo.source==='thermal'&&verifiedCuContent!==null&&forms.thermo.content===verifiedCuContent;
 const alSourceFor=input=>module.id==='modes'&&input.preset==='custom'&&verifiedAl&&
  input.content===verifiedAl.content&&input.structure_content===verifiedAl.structure_content&&
  !Object.hasOwn(input,'data')&&!Object.hasOwn(input,'structure_data')?verifiedAl.sourceEvidence:null;
 // Imported files do not inherit the material of a prior synthetic model.
 // The teaching-background selection remains separate from file identity.
 const materialContext=()=>{
  if(module.id==='modes'){
   if(alSourceFor(forms.modes))return 'al-phonopy-gamma';
   if(forms.modes.preset==='custom')return result?.sourceIdentity?.reference?.id==='phonopy-zno-derived-qpoints'&&result.sourceIdentity.reference.companion?.matchesPinnedSource?'zno':undefined;
   return ['silicon','gaas','nacl'].includes(forms.modes.preset)?forms.modes.preset:undefined;
  }
  return module.id==='thermo'&&['mesh','dos','thermal'].includes(forms.thermo.source)?(isCuInput()?'cu':undefined):selection.material;
 };
 const sync=()=>onNavigate({module:module.id,tab,lesson:lesson.id,exercise:exercise.id,material:materialContext()});
 const fileContext=()=>module.id+':'+(module.id==='modes'?forms.modes.preset:module.id==='thermo'?forms.thermo.source:'');
 // Unit confirmations and the paired primitive cell belong to one exact main
 // source. Ordinary parameter/tab changes must not reset them; changed text or
 // a successful different-file read must not silently reuse them.
 function replaceModeSource(content,filename){
  const f=forms.modes,changed=f.content!==content||Object.hasOwn(f,'data');
  if(changed){
   f.frequency_unit='unknown';f.length_unit='auto';f.structure_content='';
   for(const key of ['structure_data','structure_filename','companionIdentity','calculationProvenance'])delete f[key];
   for(const[id,value]of [['mr-frequency-unit','unknown'],['mr-length','auto'],['mr-structure-text',''],['mr-structure-file',''],['mr-file','']])if($('#'+id))$('#'+id).value=value;
  }
  delete f.data;f.content=content;
  if(filename!==undefined)f.filename=filename;else if(changed)f.filename='pasted-phonons.yaml';
  return changed;
 }
 function replaceModeCompanion(content){
  const f=forms.modes,changed=f.structure_content!==content||Object.hasOwn(f,'structure_data');
  if(changed){f.length_unit='auto';if($('#mr-length'))$('#mr-length').value='auto';for(const key of ['structure_filename','companionIdentity','calculationProvenance'])delete f[key];}
  f.structure_content=content;delete f.structure_data;return changed;
 }
 // A textarea normalizes CRLF to LF even before the user edits it. Preserve
 // raw source text when that is the only difference; explicit input handlers
 // below first replace the stored source, so a real edit remains a new source.
 const sourceText=(id,stored)=>{const node=$('#'+id);if(!node)return stored;const value=node.value;return String(stored??'').replace(/\r\n?/g,'\n')===value?stored:value;};
 const readIsCurrent=(request=pendingRead)=>!!request&&pendingRead===request&&current()&&request.id===fileTicket&&tab==='lab'&&fileContext()===request.context&&$('#mr-form')===request.form;
 const jobIsCurrent=job=>!!job&&activeJob===job&&current()&&job.id===ticket&&tab==='lab'&&module.id===job.module&&$('#mr-form')===job.form;
 function syncLabControls(){
  if(!current()||!$('#mr-form'))return;const loading=readIsCurrent(),submit=$('#mr-run');
  if(submit){submit.disabled=busy||loading;submit.textContent=busy?'Python 计算中…':loading?'文件载入中…':'运行 Python 并更新演示 →';}
  for(const [id,sample] of [['mr-demo','synthetic'],['mr-cu-example','cu']]){const button=$('#'+id);if(button)button.disabled=busy||(loading&&pendingRead.kind==='sample'&&pendingRead.sample===sample);}
  for(const button of root.querySelectorAll('[data-mr-al-scene]'))button.disabled=busy||(loading&&pendingRead.sample==='al'&&pendingRead.scene===button.dataset.mrAlScene);
  const cancel=$('#mr-cancel');if(cancel){cancel.hidden=!(busy||loading);cancel.textContent=loading?'取消文件载入':'取消计算';}
  const status=$('#mr-input-status');if(status){status.hidden=!(loading||inputNotice);status.textContent=loading?'文件载入中，请稍候；完成后仍需手动运行。':inputNotice;}
  const provenance=$('#mr-input-provenance');if(module.id==='modes'&&provenance){const identity=alSourceFor(forms.modes);provenance.innerHTML=identity?alGammaSourceHTML(identity):'';}
  if($('#mr-result'))$('#mr-result').setAttribute('aria-busy',String(busy||loading));
 }
 function invalidate(){
  const prior=pendingRead;pendingRead=null;prior?.controller?.abort();ticket++;fileTicket++;inputNotice='';
  if(activeJob){activeJob=null;busy=false;cancelRun?.();}
  result=null;lastResult=null;if(current()&&$('#mr-result'))$('#mr-result').innerHTML='<p role="status">参数已改变。运行计算后更新结果和导出文件。</p>';syncLabControls();
 }
 function beginInputRead(kind,extra={}){
  if(!current()||tab!=='lab'||!$('#mr-form'))return null;
  invalidate();pendingRead={...extra,kind,id:fileTicket,context:fileContext(),form:$('#mr-form'),controller:kind==='sample'&&typeof AbortController==='function'?new AbortController():null};syncLabControls();return pendingRead;
 }
 function inputReadFailed(request,error,retry){
  if(!readIsCurrent(request))return;invalidate();$('#mr-result').innerHTML=`<p role="alert">${esc(error.message)} ${esc('载入失败；可重试或更换文件。')}</p><button id="mr-retry-input" type="button" class="secondary">重试载入</button>`;
  const button=$('#mr-retry-input');button.onclick=()=>{if(current()&&$('#mr-retry-input')===button&&!busy&&!readIsCurrent())return retry();};
 }
 const input=(label,id,value,extra='')=>`<label>${label}<input id="${id}" type="number" ${/\bstep\s*=/.test(extra)?'':'step="any"'} value="${esc(value)}" ${extra}></label>`;
 const navlinks=()=>`<div class="obs-links"><a data-course-flow-learn href="${esc(courseFlowRoute(researchCourseRoute(module.id),{module:module.id,lesson:lesson.id,exercise:exercise.id,material:materialContext(),preset:forms[module.id].preset}))}">回到本课讲解 →</a><a href="#atlas/research${materialContext()?'?material='+encodeURIComponent(materialContext()):''}">材料分析路线 →</a><a href="#atlas/notebook">材料研究记录 →</a></div>`;
 function draw(){if(!current())return;const previousIR=$('[data-mr-zno-ir-entry]');if(previousIR)irOpen=previousIR.open;const previousAl=$('#mr-al-gamma');if(previousAl)alOpen=previousAl.open;disposeIR();disposeIR=()=>{};disposeThermalBridge();onLocation((selection.calculationOnly?'计算中心 / ':selection.atlasOnly?'群与材料图谱 / ':'学习中心 / ')+module.title);root.innerHTML=`<header class="obs-header"><span class="obs-eyebrow">SYMMETRY → MODES → MATERIAL RESPONSE</span><h2>${selection.atlasOnly?'把计算串成一份材料研究':module.title}</h2><p>${selection.atlasOnly?'从一个问题进入课程、计算和可恢复的研究记录。':esc(module.summary)}</p></header>${projectInputStatusHTML(projectLoad)}${selection.calculationOnly||selection.atlasOnly?'':`<nav class="obs-tabs" aria-label="材料分析课堂">${[['learn','课程讲解'],['lab','交互实验'],['derive','分步练习'],['cases','材料路线']].map(([id,title])=>`<button type="button" data-mr-tab="${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${title}</button>`).join('')}</nav>`}<div id="mr-content"></div>`;root.querySelectorAll('[data-mr-tab]').forEach(b=>b.onclick=()=>{if(!current()||![...root.querySelectorAll('[data-mr-tab]')].includes(b))return;rememberLabDraft();invalidate();tab=b.dataset.mrTab;draw();sync();});if(tab==='learn')learn();else if(tab==='derive')derive();else if(tab==='cases')cases();else {lab();flowDrafts.restore($('#mr-form'),module.id);syncLabControls();}bindCourseFlowActions({root,prefix:'mr',isCurrent:current,onLearn:openLessonLearn,onLab:openLessonLab,labButtonId:'mr-to-lab'});}
 function learn(){
  $('#mr-content').innerHTML=`<label class="obs-chapter">选择主题<select id="mr-lesson">${options(data.lessons.filter(l=>l.module===module.id).map(l=>[l.id,l.title]),lesson.id)}</select></label>
  <article class="obs-lesson"><h2>${esc(lesson.title)}</h2><p class="obs-lead">${esc(lesson.summary)}</p>
  ${module.id==='modes'?phonopyDerivationLearningLinkHTML():''}${lesson.id==='thermal-data'?cuThermalSourceHTML()+'<button id="mr-cu-lesson" type="button" class="primary">载入官方 Cu 热性质计算示例 →</button>':''}
  ${lesson.id==='mode-subspaces'?alGammaLessonHTML():''}
  ${learningBridgeHTML('thermal',lesson.id)}
  ${lesson.sections.map(s=>`<section><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.formula?`<div class="obs-formula">${esc(s.formula)}</div>`:''}</section>`).join('')}
  ${lesson.id==='band-crossing'?grapheneActivityHTML():''}
  <div class="obs-links"><button id="mr-to-lab" class="primary">打开对应实验 →</button><button id="mr-to-derive" class="secondary">分步推导 →</button></div>
  ${navlinks()}${sources(data.sources.filter(s=>lesson.references.includes(s.id)))}</article>`;
  disposeThermalBridge=bindLearningBridge({root,family:'thermal',lessonId:lesson.id,isCurrent:current,stateStore:thermalBridgeStates,onOpenLab:openThermalBridgeLab});
  bindGrapheneActivity(root,current);
  if($('#mr-cu-lesson')){const button=$('#mr-cu-lesson');button.onclick=()=>{if(current()&&$('#mr-cu-lesson')===button)return openCuThermalExample();};}
  $('#mr-lesson').onchange=e=>{lesson=data.lessons.find(l=>l.id===e.target.value);exercise=data.exercises.find(e=>e.lesson===lesson.id);draw();sync();};
  $('#mr-to-derive').onclick=()=>{exercise=data.exercises.find(e=>e.lesson===lesson.id);tab='derive';draw();sync();};
 }
 function cases(){
  const all=[...data.cases].sort((a,b)=>(b.id===selection.material)-(a.id===selection.material));
  $('#mr-content').innerHTML=`<div class="obs-case-grid">${all.map(c=>`<article><span class="obs-eyebrow">${esc(c.formula)}</span><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p><p class="mr-scope">${esc(c.assumption)}</p><div class="obs-links">${c.modules.map(id=>{const m=data.modules.find(m=>m.id===id);return `<a href="${researchCourseRoute(id,'material='+encodeURIComponent(c.id))}">${esc(m.title)} · 学习 →</a><a href="#compute/${m.route}?material=${esc(c.id)}">对应计算 →</a>`;}).join('')}${c.links.map(([t,url])=>`<a href="${esc(url)}">${esc(t)} →</a>`).join('')}<a href="#atlas/notebook">保存材料研究记录 →</a></div>${c.sources?.length?sources(data.sources.filter(source=>c.sources.includes(source.id))):''}</article>`).join('')}</div>`;
 }
 async function openCuThermalExample(){
  if(!current()||module.id!=='thermo')return false;flowDrafts.discard(module.id);invalidate();forms.thermo={...structuredClone(defaults.thermo),source:'thermal'};tab='lab';draw();sync();await loadExample('cu');return true;
 }
 function rememberLabDraft(){if(tab==='lab'){let draftError='';try{read();}catch(error){draftError=error?.message||'请检查当前输入';}flowDrafts.remember($('#mr-form'),module.id,draftError);}}
 function openLessonLearn(){if(!current())return;rememberLabDraft();invalidate();tab='learn';draw();sync();}
 function openThermalBridgeLab(request){if(!current()||module.id!=='thermo'||request?.module!=='thermo'||request?.action!=='phonon_thermo')return false;flowDrafts.discard(module.id);forms.thermo={...structuredClone(defaults.thermo),...structuredClone(request.input)};invalidate();tab='lab';draw();sync();return true;}
 function openLessonLab(){if(!current())return;if(!lesson.lab||typeof lesson.lab!=='object')throw Error('本课实验参数暂不可用，请返回课程目录检查。');flowDrafts.discard(module.id);Object.assign(forms[module.id],structuredClone(lesson.lab||{}));tab='lab';invalidate();draw();sync();}
 function derive(){const exercises=data.exercises.filter(e=>data.lessons.some(l=>l.id===e.lesson&&l.module===module.id));$('#mr-content').innerHTML=`<label class="obs-chapter">选择练习<select id="mr-exercise">${options(exercises.map(e=>[e.id,(progress[e.id]?'✓ ':'')+e.title]),exercise.id)}</select></label><article class="obs-lesson"><h2>${esc(exercise.title)}</h2><p>${esc(exercise.prompt)}</p><div id="mr-steps"></div><p id="mr-progress" role="status"></p>${courseFlowActions('mr')}${navlinks()}</article>`;const exerciseSelect=$('#mr-exercise');exerciseSelect.onchange=e=>{if(!current()||$('#mr-exercise')!==exerciseSelect)return;exercise=data.exercises.find(x=>x.id===e.target.value);lesson=data.lessons.find(x=>x.id===exercise.lesson);draw();sync();};

 const stepRoot=$('#mr-steps'),exerciseId=exercise.id;
 renderCourseFlowSteps({container:stepRoot,exercise,prefix:'mr',answerAttribute:'data-mr-answer',choicesClass:'mr-choices',completedSteps:flowSteps.get(exerciseId)||0,isCurrent:()=>current()&&$('#mr-steps')===stepRoot&&exercise.id===exerciseId,onStep:count=>flowSteps.set(exerciseId,count),onComplete:()=>{progress[exerciseId]=true;try{localStorage.setItem('symmetry-lab.material-research.progress.v1',JSON.stringify(progress));}catch{}$('#mr-progress').textContent='✓ 推导完成。回到实验改变参数，检验这个结论。';}});
 }

 function controls(){const f=forms[module.id];if(module.id==='modes')return `<label>模式来源<select id="mr-preset">${options([['silicon','Si · 合成 Γ 模式'],['gaas','GaAs · 合成 Γ 模式'],['nacl','NaCl · 合成 Γ 模式'],['custom','导入自己的 Phonopy 文件']],f.preset)}</select></label>${f.preset==='custom'?`<label>band / qpoints YAML 或 JSON<input id="mr-file" type="file" accept=".yaml,.yml,.json"></label><label>原始文件内容<textarea id="mr-file-text" rows="6">${esc(f.content)}</textarea></label><label>确认频率单位<select id="mr-frequency-unit">${options([['unknown','未确认（保留原始数值）'],['THz','THz'],['cm^-1','cm⁻¹'],['meV','meV']],f.frequency_unit)}</select></label><p class="obs-small">未选择确认值时沿用文件声明；文件未声明则显示未知。这里只标记单位，不换算原始频率。</p><label>补充相同原胞（可选）<input id="mr-structure-file" type="file" accept=".yaml,.yml,.json"><textarea id="mr-structure-text" rows="3">${esc(f.structure_content)}</textarea></label>`:''}${input('q 点索引（从 0 开始）','mr-qi',f.selected_q,'min="0" step="1"')}${input('模式索引（从 0 开始）','mr-bi',f.selected_band,'min="0" step="1"')}<label>冻结幅度 A（输入晶格单位）<input id="mr-amplitude" type="range" min="0" max="0.5" step="0.005" value="${f.amplitude}"><output>${num(f.amplitude)}</output></label>${input('快照相位 φ（弧度）','mr-phase',f.phase)}<label>周期超胞 [n1,n2,n3]<input id="mr-supercell" value="${esc(JSON.stringify(f.supercell))}"></label><label>输入长度单位<select id="mr-length">${options([['auto','沿用文件元数据（缺失则不导出）'],['angstrom','Å（angstrom）'],['bohr','bohr'],['nm','nm'],['pm','pm'],['unknown','未知：不导出物理结构']],f.length_unit)}</select></label><details><summary>分类与几何容差</summary>${input('简并频率分组容差（与输入频率同单位）','mr-ftol',f.frequency_tolerance,'min="0"')}${input('刚性平移的零频窗口容差（与输入频率同单位）','mr-trans-ftol',f.translation_frequency_tolerance,'min="0" max="10000"')}${input('spglib 几何容差','mr-symprec',f.symprec,'min="0"')}</details><p class="obs-small">标签表覆盖 Oh / Td / C1 / Ci；其他群保留字符。有限 q 只冻结模式，不套用 Γ 标签。导出不会自动做结构弛豫。</p>`;
 if(module.id==='bands')return `<label>周期教学模型<select id="mr-model">${options([['c4v','C₄ᵥ · pₓ / pᵧ 轨道'],['rashba','Rashba · 自旋双值表示']],f.model)}</select></label>${f.model==='c4v'?`${input('带序系数 β','mr-beta',f.beta)}${input('二维轨道混合 γ','mr-gamma',f.gamma)}<label>交叉位置参数 η<input id="mr-eta" type="range" min="-1.5" max="1.5" step="0.05" value="${f.eta}"><output>${f.eta}</output></label><label>镜面破缺混合 δ<input id="mr-mixing" type="range" min="0" max="0.8" step="0.02" value="${f.mixing}"><output>${f.mixing}</output></label>`:`<label>SOC 强度 α<input id="mr-soc" type="range" min="0" max="2" step="0.05" value="${f.soc}"><output>${f.soc}</output></label><label>Zeeman 参数 B_z<input id="mr-zeeman" type="range" min="0" max="1" step="0.02" value="${f.zeeman}"><output>${f.zeeman}</output></label>`}${input('公共色散系数 t','mr-hopping',f.hopping)}${input('路径采样点数','mr-samples',f.samples,'min="21" max="501" step="1"')}<p class="obs-small">Γ–X 路径为 k=(πt,0)。参数为模型单位；路径上的交叉或间隙不能单独诊断二维全局拓扑。</p>`;
 return `<label>热力学数据来源<select id="mr-source">${options([['compare','Einstein 与 Debye 比较'],['einstein','Einstein 模型'],['debye','Debye 模型'],['mesh','带权重的 mesh.yaml'],['dos','完整总 DOS'],['thermal','thermal_properties.yaml']],f.source)}</select></label>${['compare','einstein','debye','dos'].includes(f.source)?input(f.source==='dos'?'输入计算胞的原子数 n':'模型原胞的原子数 n','mr-natom',f.natom,'min="1" max="128" step="1"'):''}${['compare','einstein'].includes(f.source)?input('Einstein 特征温度 θ_E（K）','mr-theta-e',f.theta_e,'min="0.001"'):''}${['compare','debye'].includes(f.source)?input('Debye 特征温度 θ_D（K）','mr-theta-d',f.theta_d,'min="0.001"'):''}${f.source!=='thermal'?`${input('起始温度（K）','mr-tmin',f.t_min,'min="0"')}${input('终止温度（K）','mr-tmax',f.t_max,'min="0"')}${input('温度步长（K）','mr-tstep',f.t_step,'min="0.001"')}`:''}${['mesh','dos','thermal'].includes(f.source)?`<label>选择输入文件<input id="mr-file" type="file" accept=".yaml,.yml,.json,.dat,.txt"></label>${f.source!=='dos'?'<button id="mr-demo" type="button" class="secondary">载入原创合成示例</button>':''}${f.source==='thermal'?'<button id="mr-cu-example" type="button" class="secondary">载入官方 Cu 热性质计算示例</button><p>Cu 示例使用原文件的四原子输入计算胞；载入后仍需手动运行。当前文件与示例只在本次页面内存中处理。</p>':''}<label>${f.source==='dos'?'两列：频率、总 DOS':'文件内容'}<textarea id="mr-file-text" rows="8">${esc(f.content)}</textarea></label>`:''}${['mesh','dos'].includes(f.source)?`<label>确认频率单位<select id="mr-frequency-unit">${options([['THz','THz'],['cm^-1','cm⁻¹'],['meV','meV']],f.frequency_unit)}</select></label>${f.source==='mesh'?`<label>精确零频处理<select id="mr-zero">${options([['error','停止并报告零频'],['exclude','明确排除零频并报告损失权重']],f.zero_policy)}</select></label>`:''}`:''}${f.source==='dos'?`<label><input id="mr-dos-complete" type="checkbox" ${f.dos_complete?'checked':''}> 我确认这是完整总 DOS，积分为每输入计算胞 3n 个模式</label><p>横轴单位必须与所选频率单位一致，纵轴为每单位频率的模式密度；投影 DOS 不能替代总 DOS。</p>`:''}<p class="obs-small">${['mesh','dos','thermal'].includes(f.source)?'输入数据按每输入计算胞计量，是否最小原胞需核验。能量：kJ/mol输入计算胞；S 与 Cv：J/(mol输入计算胞 K)。':'教学模型按每模型原胞计量。能量：kJ/mol模型原胞；S 与 Cv：J/(mol模型原胞 K)。'}路径 band.yaml 不能用于体积分，虚频不会被静默丢弃。热膨胀、Cp 与热导不在此模块内。</p>`;
 }
 function read(){const f=forms[module.id],val=(id,old)=>$('#'+id)?$('#'+id).value:old,n=(id,old)=>Number(val(id,old));if(module.id==='modes'){const nextContent=sourceText('mr-file-text',f.content);if(nextContent!==f.content)replaceModeSource(nextContent);const nextCompanion=sourceText('mr-structure-text',f.structure_content);if(nextCompanion!==f.structure_content)replaceModeCompanion(nextCompanion);Object.assign(f,{preset:val('mr-preset',f.preset),selected_q:n('mr-qi',f.selected_q),selected_band:n('mr-bi',f.selected_band),amplitude:n('mr-amplitude',f.amplitude),phase:n('mr-phase',f.phase),supercell:JSON.parse(val('mr-supercell',JSON.stringify(f.supercell))),length_unit:val('mr-length',f.length_unit),frequency_unit:val('mr-frequency-unit',f.frequency_unit),frequency_tolerance:n('mr-ftol',f.frequency_tolerance),translation_frequency_tolerance:n('mr-trans-ftol',f.translation_frequency_tolerance),symprec:n('mr-symprec',f.symprec),content:sourceText('mr-file-text',f.content),structure_content:sourceText('mr-structure-text',f.structure_content)});}else if(module.id==='bands'){f.model=val('mr-model',f.model);for(const key of ['beta','gamma','eta','mixing','soc','zeeman','hopping','samples'])f[key]=n('mr-'+key,f[key]);}else{Object.assign(f,{source:val('mr-source',f.source),natom:n('mr-natom',f.natom),theta_e:n('mr-theta-e',f.theta_e),theta_d:n('mr-theta-d',f.theta_d),t_min:n('mr-tmin',f.t_min),t_max:n('mr-tmax',f.t_max),t_step:n('mr-tstep',f.t_step),content:sourceText('mr-file-text',f.content),frequency_unit:val('mr-frequency-unit',f.frequency_unit),zero_policy:val('mr-zero',f.zero_policy)});if($('#mr-dos-complete'))f.dos_complete=$('#mr-dos-complete').checked;}}
 function payload(){read();const f=structuredClone(forms[module.id]);if(module.id==='modes'){if(f.length_unit==='auto')delete f.length_unit;if(f.preset!=='custom'){delete f.content;delete f.data;delete f.structure_content;delete f.structure_data;delete f.filename;delete f.frequency_unit;}else{if(f.content?.trim())delete f.data;if(f.structure_content?.trim())delete f.structure_data;}}if(module.id==='thermo'){if(!['compare','einstein','debye','dos'].includes(f.source))delete f.natom;if(f.source==='dos'){if(f.content?.trim()){f.dos_content=f.content;delete f.data;}delete f.content;}if(['einstein','debye','compare'].includes(f.source)){delete f.content;delete f.data;delete f.filename;delete f.dos_content;}else if(f.content?.trim())delete f.data;}return f;}
 function lab(){
  $('#mr-content').innerHTML=`${module.id==='modes'?alGammaPanelHTML(alOpen)+znoIRPanelHTML(irOpen):''}<div class="obs-lab-layout"><form class="obs-controls" id="mr-form"><fieldset><legend>实验参数</legend>${controls()}<button id="mr-run" type="submit" class="primary">运行 Python 并更新演示 →</button><button id="mr-cancel" type="button" class="secondary" hidden>取消计算</button><p id="mr-input-status" role="status" hidden></p></fieldset><div id="mr-input-provenance">${isCuInput()?cuThermalSourceHTML():''}</div></form><section id="mr-result" class="mr-result"><h3>输入 → 计算 → 核对 → 保存</h3><p>在浏览器内运行 Python，并将假设和原始输入一起保存在材料研究记录中。</p></section></div>${navlinks()}`;
  if(module.id==='modes'&&forms.modes.preset==='custom'){for(const[id,key]of [['mr-file-text','content'],['mr-structure-text','structure_content']])if($('#'+id))$('#'+id).value=forms.modes[key]??'';}const form=$('#mr-form');form.onsubmit=e=>{e.preventDefault();if(current()&&$('#mr-form')===form)return calculate();};
  const irEntry=$('[data-mr-zno-ir-entry]'),irBody=irEntry?.querySelector('[data-mr-zno-ir-body]');
  disposeIR=bindOptionalPanel({detail:irEntry,body:irBody,isCurrent:()=>current()&&$('[data-mr-zno-ir-entry]')===irEntry,
   load:()=>import('./zno-ir-polarization-ui.js?v=20261120-zno-ir1'),
   mount:(component,isCurrent)=>component.bindZnOIRPolarization({root:irBody,isCurrent,state:irState})});
  const alEntry=$('#mr-al-gamma');
  if(alEntry){
   alEntry.ontoggle=()=>{
    if(!current()||$('#mr-al-gamma')!==alEntry)return;
    alOpen=alEntry.open;
    if(!alOpen&&readIsCurrent()&&pendingRead.sample==='al'){
     invalidate();inputNotice='文件载入已取消，可以选择其他输入。';syncLabControls();
    }
   };
   for(const button of alEntry.querySelectorAll('[data-mr-al-scene]'))button.onclick=()=>{
    if(current()&&$('#mr-al-gamma')===alEntry&&alEntry.open&&!button.disabled)return loadAlGammaScene(button.dataset.mrAlScene);
   };
  }
  $('#mr-cancel').onclick=()=>{if(!current()||$('#mr-form')!==form)return;const loading=readIsCurrent();invalidate();inputNotice=loading?'文件载入已取消，可以选择其他输入。':'计算已取消，可以修改参数后手动运行。';syncLabControls();};
  form.oninput=e=>{if(!current()||$('#mr-form')!==form||e.target.type==='file')return;let replacedModeSource=false;if(e.target.id==='mr-file-text'){if(module.id==='modes')replacedModeSource=replaceModeSource(e.target.value);else{delete forms[module.id].data;forms[module.id].content=e.target.value;}verifiedCuContent=null;}if(e.target.id==='mr-structure-text'){if(module.id==='modes')replaceModeCompanion(e.target.value);else delete forms[module.id].structure_data;}if(e.target.type==='range'&&e.target.nextElementSibling)e.target.nextElementSibling.textContent=e.target.value;invalidate();if(e.target.id==='mr-file-text'&&module.id!=='modes'&&$('#mr-input-provenance'))$('#mr-input-provenance').innerHTML='';if(replacedModeSource){inputNotice='主文件已改变：频率和长度确认已重置，旧伴随结构已清除；请核对新来源后手动运行。';syncLabControls();}};
  for(const id of ['mr-preset','mr-model','mr-source'])if($('#'+id)){const control=$('#'+id);control.onchange=()=>{if(!current()||$('#'+id)!==control)return;try{read();if(id==='mr-preset'&&forms.modes.preset==='custom')forms.modes.length_unit='auto';invalidate();draw();sync();}catch(e){$('#mr-result').textContent=e.message;}};}
  for(const [id,kind]of [['mr-file','content'],['mr-structure-file','structure_content']])if($('#'+id)){const control=$('#'+id);control.onchange=e=>{if(current()&&$('#'+id)===control)return loadLocalFile(e.target.files?.[0],kind);};}
  for(const [id,sample]of [['mr-demo','synthetic'],['mr-cu-example','cu']])if($('#'+id)){const button=$('#'+id);button.onclick=()=>{if(current()&&$('#'+id)===button)return loadExample(sample);};}
  syncLabControls();
 }
 async function loadAlGammaScene(scene){
  if(module.id!=='modes'||busy||!$('#mr-al-gamma')?.open||!alGammaScenes.some(([id])=>id===scene))return;
  const request=beginInputRead('sample',{sample:'al',scene});if(!request)return;
  try{
   const {readAlGammaSource}=await import('./al-gamma-source.js?v=20261120-al-gamma1');
   if(!readIsCurrent(request)||!$('#mr-al-gamma')?.open)return;
   const verified=await readAlGammaSource({signal:request.controller?.signal});
   if(!readIsCurrent(request)||!$('#mr-al-gamma')?.open)return;
   const draft=verified.createInput(scene);if(!draft)return;
   forms.modes={...structuredClone(defaults.modes),...draft};
   verifiedAl={content:draft.content,structure_content:draft.structure_content,sourceEvidence:verified.sourceEvidence};
   flowDrafts.discard('modes');invalidate();
   inputNotice='两份 Al 原文件已核对并载入。检查波矢索引、超胞和单位，再手动运行。';
   draw();sync();$('#mr-run')?.focus?.();
  }catch(error){inputReadFailed(request,error,()=>loadAlGammaScene(scene));}
 }
 async function loadLocalFile(file,kind){
  if(!file)return;const request=beginInputRead('file',{filename:file.name});if(!request)return;
  try{if(file.size>8*1024*1024)throw Error('单个文件最多 8 MiB');const content=await file.text();if(!readIsCurrent(request))return;
   const identity=module.id==='thermo'&&forms.thermo.source==='thermal'&&kind==='content'?await verifyCuThermalExample(content):null;if(!readIsCurrent(request))return;
   read();let replacedModeSource=false;if(module.id==='modes'&&kind==='content')replacedModeSource=replaceModeSource(content,file.name);else if(module.id==='modes'&&kind==='structure_content')replaceModeCompanion(content);else{forms[module.id][kind]=content;delete forms[module.id][kind==='structure_content'?'structure_data':'data'];if(kind==='content')forms[module.id].filename=file.name;}
   if(module.id==='thermo'&&kind==='content')verifiedCuContent=identity?content:null;flowDrafts.discard(module.id);invalidate();inputNotice=replacedModeSource?'新主文件已载入：请重新确认单位并配对同一原胞的伴随结构，然后手动运行。':'文件已载入，请检查来源与单位后手动运行。';draw();sync();
  }catch(error){inputReadFailed(request,error,()=>loadLocalFile(file,kind));}
 }
 async function loadExample(sample){
  if(!current()||module.id!=='thermo'||tab!=='lab'||busy||sample==='cu'&&forms.thermo.source!=='thermal')return;
  if(readIsCurrent()&&pendingRead.kind==='sample'&&pendingRead.sample===sample)return;
  const selected=forms.thermo.source,request=beginInputRead('sample',{sample});if(!request)return;
  const filename=sample==='cu'?CU_THERMAL_EXAMPLE.filename:selected==='thermal'?'thermal-properties-demo.yaml':'thermo-mesh-demo.yaml';
  try{const response=await fetch('data/examples/'+filename+'?v='+(sample==='cu'?CU_EXAMPLE_CACHE:RELEASE),request.controller?{signal:request.controller.signal}:{});if(!readIsCurrent(request))return;if(!response.ok)throw Error('示例暂未加载');const content=await response.text();if(!readIsCurrent(request))return;
   const identity=sample==='cu'?await verifyCuThermalExample(content):null;if(!readIsCurrent(request))return;if(sample==='cu'&&!identity)throw Error('官方 Cu 示例文件校验未通过，请重试。');
   read();Object.assign(forms.thermo,{content,filename});delete forms.thermo.data;verifiedCuContent=identity?content:null;flowDrafts.discard(module.id);invalidate();inputNotice=sample==='cu'?'官方 Cu 示例已载入并核对文件身份；请手动运行。':'合成示例已载入，请手动运行。';draw();sync();
  }catch(error){inputReadFailed(request,error,()=>loadExample(sample));}
 }
 async function calculate(){
  if(!current()||busy||readIsCurrent()||tab!=='lab'||!$('#mr-form'))return;
  let inputValue;result=null;lastResult=null;try{inputValue=payload();}catch(error){$('#mr-result').innerHTML=`<p role="alert">${esc(error.message)}</p>`;return;}
  const job={id:++ticket,form:$('#mr-form'),module:module.id,action:module.action};activeJob=job;busy=true;syncLabControls();$('#mr-result').innerHTML='<p role="status">Python 正在计算；首次运行需要下载计算环境…</p>';
  try{const cuIdentity=job.module==='thermo'&&inputValue.source==='thermal'?await verifyCuThermalExample(inputValue.content):null;if(!jobIsCurrent(job))return;const value=await run(job.action,inputValue);if(!jobIsCurrent(job))return;
   const identity=cuIdentity||alSourceFor(inputValue);
   result=identity?{...value,inputSourceIdentity:identity}:value;if(cuIdentity)verifiedCuContent=inputValue.content;lastResult={tool:job.action,module:job.module,input:inputValue,result,release:RELEASE};if(job.module==='modes'){lastResult.material=materialContext()||'';if(selection.material)lastResult.teachingBackground={material:selection.material,role:'teaching-background'};}cursor=0;output();sync();
  }catch(error){if(jobIsCurrent(job)){$('#mr-result').innerHTML=`<p role="alert">${esc(error.message)}</p>`;result=null;lastResult=null;}}
  finally{if(activeJob===job){activeJob=null;busy=false;syncLabControls();}}
 }

 function output(){if(!result||!$('#mr-result'))return;$('#mr-result').innerHTML=(module.id==='modes'?modesOutput():module.id==='bands'?bandsOutput():thermoOutput())+(result.inputSourceIdentity?.id===CU_THERMAL_EXAMPLE.id?cuThermalSourceHTML():'')+`<div class="obs-links"><button id="mr-download" type="button" class="secondary">↓ 输入与完整结果 JSON</button><a id="mr-record" href="#atlas/notebook">保存到材料研究记录 →</a><a href="docs/material-research.md" target="_blank">方法与数据约定 ↗</a></div><details><summary>完整计算数据</summary><pre>${esc(JSON.stringify(result,null,2))}</pre></details>${sources(result.sources)}`;$('#mr-download').onclick=()=>download(JSON.stringify(lastResult,null,2),module.route+'.json');$('#mr-record').onclick=()=>captureCalculation(module.action,lastResult.input,result,{route:'compute/'+module.route,title:module.title,material:materialContext()||''});if(module.id==='modes')bindModes();else if(module.id==='bands')bindBands();else bindThermo();}
 function modesOutput(){const r=result,s=r.symmetry||{},f=r.frozen||{};return `<h2>${esc(r.source)} · ${esc(s.pointGroup||'未识别')}</h2>${r.synthetic?'<p class="mr-scope">原创合成教学模式；频率不代表真实材料的第一性原理结果。</p>':''}${forms.modes.preset==='custom'&&selection.material?'<p>'+esc('课堂背景标签')+'：'+esc(({silicon:'Si',gaas:'GaAs',nacl:'NaCl',zno:'ZnO'})[selection.material]||selection.material)+'；'+esc('导入文件身份见来源记录。')+'</p>':''}${modeSourceIdentityHTML(r.sourceIdentity)}<div class="mr-metrics"><div>空间群 / 点群<strong>${esc(s.symbol||'—')} / ${esc(s.pointGroup||'—')}</strong></div><div>几何操作数<strong>${s.operationCount??'—'}</strong></div><div>当前 q / 模式<strong>${r.selection.qIndex} / ${r.selection.bandIndex}</strong></div></div>${notes(r.warnings)}${modeGroupsHTML(r)}${f.available?`<h3>冻结模结构 · ${f.atoms.length} 原子</h3><div id="mr-frozen-view">${frozenStructureSVG(f)}</div><label>观察方位<input id="mr-yaw" type="range" min="-180" max="180" value="-35"></label><p>空心圆为原位置，实心圆为冻结后位置；最大实际位移 ${num(f.maxDisplacement)} ${esc(f.lengthUnit)}。快照相位与幅度由左侧输入决定。</p><div class="obs-links"><button id="mr-poscar" class="secondary" ${r.exports?.poscar?'':'disabled'}>↓ 冻结结构 POSCAR</button><button id="mr-cif" class="secondary" ${r.exports?.cif?'':'disabled'}>↓ 冻结结构 CIF（P1）</button></div><p class="obs-small">${esc(f.reason)} ${esc(r.exports?.reason||'')} POSCAR 的元素分组映射保留在完整结果中。</p>`:`<p class="mr-scope">${esc(f.reason||'当前数据不能生成冻结结构。')}</p>`}`;}
 function bindModes(){if($('#mr-yaw'))$('#mr-yaw').oninput=e=>{$('#mr-frozen-view').innerHTML=frozenStructureSVG(result.frozen,+e.target.value);};for(const [id,key,name] of [['mr-poscar','poscar','POSCAR-frozen'],['mr-cif','cif','frozen-mode.cif']])if($('#'+id))$('#'+id).onclick=()=>download(result.exports[key],name,'text/plain');root.querySelectorAll('[data-mr-mode]').forEach(b=>b.onclick=async()=>{if(busy)return;forms.modes.selected_band=+b.dataset.mrMode;invalidate();draw();await calculate();});}
 function bandsOutput(){const r=result;return `<h2>${esc(r.title)}</h2>${notes(r.warnings)}<div class="mr-metrics"><div>镜面约束<strong>${r.summary.mirrorActive?'保持':'已破缺'}</strong></div><div>时间反演<strong>${r.summary.timeReversal?'保持':'已破缺'}</strong></div><div>${esc(r.summary.gapLabel)}<strong>${num(r.summary.perturbationGap)}</strong></div></div><h3>沿 Γ–X 的模型能带</h3><div id="mr-band-plot"></div><label>移动路径位置 kx/π<input id="mr-k-cursor" type="range" min="0" max="${r.path.coordinates.length-1}" step="1" value="0"></label><div id="mr-band-point"></div><h3>表示连接（纵向位置不代表能量）</h3>${connectionSVG(r.connections)}<p>${esc(r.connections.note)}</p>${['compatibility','endpointCompatibility'].map(key=>{const c=r[key];if(!c)return '';return `<h3>${esc(c.parentGroup)} → ${esc(c.lineGroup)}</h3><p>${esc(c.formula)}</p>${table(['端点表示','维数',...c.lineIrreps.map(x=>typeof x==='string'?x:x.label),'分支维数之和'],c.rows.map(row=>[row.parent,row.dimension,...row.multiplicities,row.dimensionSum]))}`;}).join('')}<details><summary>Hamiltonian 与验证残差</summary><pre>${esc(JSON.stringify({hamiltonian:r.hamiltonian,validation:r.validation},null,2))}</pre></details>${table(['位置','间隙','说明'],r.crossings.map(c=>[c.label+' · '+num(c.t),num(c.gap),c.explanation]))}`;}
 function bindBands(){const paint=()=>{const r=result,i=cursor;$('#mr-band-plot').innerHTML=multiCurveSVG(r.bands.map(b=>({label:b.label,points:b.energies.map((e,j)=>[r.path.coordinates[j],e])})),{xLabel:'kx / π（Γ → X）',yLabel:'能量 / 模型单位',cursor:r.path.coordinates[i]});$('#mr-band-point').innerHTML=table(['能带','能量','镜面标签','镜面算符期望'],r.bands.map(b=>[b.label,num(b.energies[i]),b.mirrorLabels?.[i]||'—',(r.summary.spinful?'i × ':'')+num(b.mirror?.[i])]))+'<p class="obs-small">曲线按能量排序；相容连接图按表示分支连接。在简并点，单个数值本征矢的镜面期望可依赖选基。</p>';};$('#mr-k-cursor').oninput=e=>{cursor=+e.target.value;paint();};paint();}
 function thermoOutput(){const r=result,b=thermalBasis(r);return `<h2>振动热力学 · ${esc(({compare:"Einstein 与 Debye 比较",einstein:"Einstein 模型",debye:"Debye 模型",mesh:"加权声子网格",dos:"完整总 DOS",thermal:"Phonopy 热性质文件"})[r.source]||r.source)}</h2>${notes(r.warnings)}<div class="mr-metrics"><div>${esc(b.label)}原子数 n<strong>${num(r.summary?.natom)}</strong></div><div>完整模式计数极限 3nR<strong>${num(r.summary?.dulongPetitLimit)} ${esc(b.entropy)}</strong></div><div>能量 / 熵与热容单位<strong>${esc(b.energy)} · ${esc(b.entropy)}</strong></div></div><label>显示物理量<select id="mr-quantity">${options([['heatCapacity','定容热容 Cv'],['entropy','熵 S'],['freeEnergy','振动自由能 F'],['internalEnergy','振动内能 U']],quantity)}</select></label><div id="mr-thermal-plot"></div><label>选择表中温度<input id="mr-temperature" type="range" min="0" max="${Math.max(0,(r.series[0]?.rows.length||1)-1)}" step="1" value="0"></label><div id="mr-temperature-values"></div><h3>各曲线的零点能</h3>${table(['模型 / 数据','ZPE（'+b.energy+'）'],r.series.map(s=>[s.label,num(s.zeroPointEnergy)]))}${notes(r.assumptions)}<details><summary>输出单位和计量基准</summary><pre>${esc(JSON.stringify({basis:r.basis,basisLabel:r.basisLabel,units:r.units,summary:r.summary},null,2))}</pre></details>`;}
 function bindThermo(){const paint=()=>{const r=result,b=thermalBasis(r),energy=['freeEnergy','internalEnergy'].includes(quantity),label={heatCapacity:'Cv',entropy:'S',freeEnergy:'F',internalEnergy:'U'}[quantity],temp=r.series[0]?.rows[cursor]?.temperature;$('#mr-thermal-plot').innerHTML=multiCurveSVG(r.series.map(s=>({label:s.label,points:s.rows.map(row=>[row.temperature,row[quantity]])})),{xLabel:'温度 T / K',yLabel:label+' / '+(energy?b.energy:b.entropy),cursor:temp});$('#mr-temperature-values').innerHTML=`<h3>T = ${num(temp)} K · ${esc(b.label)}</h3>`+table(['模型 / 数据','F / '+b.energy,'U / '+b.energy,'S / '+b.entropy,'Cv / '+b.entropy],r.series.map(s=>{const row=s.rows.find(x=>x.temperature===temp)||{};return [s.label,num(row.freeEnergy),num(row.internalEnergy),num(row.entropy),num(row.heatCapacity)];}));};$('#mr-quantity').onchange=e=>{quantity=e.target.value;paint();};$('#mr-temperature').oninput=e=>{cursor=+e.target.value;paint();};paint();}

 if(selection.lesson&&tab==='lab'&&!selection.calculationOnly)Object.assign(forms[module.id],structuredClone(lesson.lab||{}));draw();
 return ()=>{disposeIR();disposeThermalBridge();if(pendingRead?.sample==='al'){const request=pendingRead;pendingRead=null;request.controller?.abort();}};
}
