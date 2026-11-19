import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createStructureHandoff,validateStructureHandoff,structureHandoffHTML,bindStructureHandoff} from './structure-handoff.js?v=20261114-evidence2';
import {createStructureDiffractionHandoff} from './structure-diffraction-handoff.js?v=20261120-structure-diffraction1';
import {siFoldingSourceWave} from './si-folding-route.js?v=20261120-si-fold-handoff1';
import {cifSettingCases,cifSettingPracticeEnabled,cifSettingPracticeHTML,cifInputSettingHTML,cifExplicitHallCheckHTML} from './cif-setting-practice.js?v=20261120-cif-explicit-hall1';
import {cifOrbitCases,cifOrbitPracticeEnabled,cifOrbitPracticeHTML} from './cif-orbit-practice.js?v=20261120-cif-orbit1';
import {quartzStructureCases,quartzStructurePracticeEnabled,quartzStructurePracticeHTML} from './quartz-structure-practice.js?v=20261120-quartz-hand1';
// Structure files are read locally; the Python worker performs all conversion.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inlineMath=(tex,source=tex)=>`<span class="sl-math" data-math-source="${esc(source)}">${mathHTML(tex)}</span>`;
const formatDiagnosticFields=(template,fields)=>template.replace(/\{([1-5])\}/g,(_,index)=>fields[index-1]);
function structureDiagnosticText(message){
  if(message==="The Hall catalogue and the explicit CIF operations differ in the input basis and origin. The explicit operations were used.")return "Hall 目录操作与显式 CIF 操作在输入基底和原点中不同。转换采用显式操作。";
  if(message==='The input CIF contains displacement data. Geometry exports omit these data; use the original CIF to recover the full records.')return '输入 CIF 包含原子位移参数。几何导出省略这些数据，完整记录请查阅原 CIF。';
  if(message==='CIF symmetry rotations do not preserve the declared cell metric at this tolerance')return 'CIF 声明的对称操作在当前容差下与输入晶胞度量不相容。';
  if(message==='Conflicting CIF International Tables space-group numbers in _space_group_IT_number and _symmetry_Int_Tables_number')return 'CIF 中的 _space_group_IT_number 和 _symmetry_Int_Tables_number 给出了不同的空间群编号。请核对原始结构。';
  const aliases=/^Repeated CIF data item: (_\S+) aliases (_\S+)$/.exec(message);
  if(aliases)return formatDiagnosticFields('CIF 字段 {1} 和 {2} 指向同一个数据项。请保留一种写法。',aliases.slice(1));
  const site=/^CIF atom-site row (\d+)(?: \((.{1,48})\))? (.*)$/su.exec(message);
  if(!site)return message;
  const [,row,label,detail]=site;
  const location=[row,label?` (${label})`:''];
  if(detail==='multiplicity must be an integer from 1 to 192'){
    return formatDiagnosticFields('CIF 原子位点第 {1} 行{2}的重数必须是 1 至 192 的整数。',location);
  }
  const legacy=/^expands to multiplicity (\d+)\. Deprecated _atom_site_symmetry_multiplicity records (\d+), consistent with the site symmetry order\. The source value is retained\.$/.exec(detail);
  if(legacy)return formatDiagnosticFields('CIF 原子位点第 {1} 行{2}展开后的重数为 {3}。旧字段 _atom_site_symmetry_multiplicity 中的值 {4} 与位点稳定子阶一致，已保留源值。',[...location,...legacy.slice(1)]);
  const mismatch=/^declares multiplicity (\d+), but symmetry expansion gives (\d+) distinct periodic sites at (\d+(?:\.\d+)?(?:[eE][+-]?\d+)?) Angstrom\. Check the symmetry setting, multiplicity field and site coordinates\.$/.exec(detail);
  return mismatch?formatDiagnosticFields('CIF 原子位点第 {1} 行{2}声明重数为 {3}。对称展开使用 {5} Å 的去重容差，得到 {4} 个不同的周期位点。请核对对称设置、重数字段和位点坐标。',[...location,...mismatch.slice(1)]):message;
}
const sample = `NaCl conventional cell
1.0
5.64 0 0
0 5.64 0
0 0 5.64
Na Cl
4 4
Direct
0 0 0
0 .5 .5
.5 0 .5
.5 .5 0
.5 0 0
0 .5 0
0 0 .5
.5 .5 .5
`;
const cifSample = `data_CsCl
_cell_length_a 4.12
_cell_length_b 4.12
_cell_length_c 4.12
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 90
_space_group_IT_number 221
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Cs1 Cs 0 0 0
Cl1 Cl .5 .5 .5
`;
const siExample=Object.freeze({
  filename:'POSCAR-0',
  format:'poscar',
  url:new URL('./data/examples/phonopy-si-structure/POSCAR-0?v=20261119-si1',import.meta.url),
  byteCount:1109,
  sha256:'6e2316a7d3085fd9fe5fc837aa849d2ad1d104ea1b23919fc6b3c1514b72e7a7'
});

const sourceMessages=Object.freeze({
  si:{insecure:'需要 HTTPS 或本机地址核对 Si 示例的文件指纹。',unavailable:'官方 Si 示例暂未载入，请重试。',mismatch:'官方 Si 示例的字节数或 SHA-256 不匹配。',encoding:'官方 Si 示例无法按原样保留为 UTF-8 文本。',timeout:'官方 Si 示例读取超时，请重试。'},
  quartz:{insecure:'需要 HTTPS 或本机地址核对石英练习文件的指纹。',unavailable:'石英练习文件暂未载入，请重试。',mismatch:'石英练习文件的字节数或 SHA-256 不匹配。',encoding:'石英练习文件无法按原样保留为 UTF-8 文本。',timeout:'石英练习文件读取超时，请重试。'}
});

async function readStructureExample(example,signal,messages){
  if(!globalThis.crypto?.subtle)throw Error(messages.insecure);
  const response=await fetch(example.url,{signal});
  if(!response.ok)throw Error(messages.unavailable);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==example.byteCount)throw Error(messages.mismatch);
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==example.sha256)throw Error(messages.mismatch);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const encoded=new TextEncoder().encode(text);
  if(encoded.length!==bytes.length||!encoded.every((byte,index)=>byte===bytes[index]))throw Error(messages.encoding);
  return text;
}

const state = {text:sample, format:'poscar', symprec:'0.00001', species:'', cifBlock:'', angle:'-1', k:['0','0','0'], result:null, error:'', busy:false, fileLoading:false, fileTicket:0, inputVersion:0, revision:0,source:{kind:'teaching-example',filename:'NaCl_example.POSCAR'},sourceBytes:null,doubleValued:false,handoff:null,handoffPending:false,handoffError:'',handoffTicket:0};
const number = value => {const pieces=String(value).trim().split('/');if(pieces.length>2||pieces.some(x=>!x.trim()))throw Error('请输入有限数值或分数。');const n=pieces.length===2?Number(pieces[0])/Number(pieces[1]):Number(pieces[0]);if(!Number.isFinite(n))throw Error('请输入有限数值或分数。');return n;};
const fmt = value => typeof value === 'number' ? (Math.abs(value)<1e-10?'0':Number(value.toPrecision(9)).toString()) : esc(value);
const matrix = rows => `<div class="table-wrap"><table><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const getStructureResult = () => state.result;

export function renderStructureView(options) {
  const {container,run,toast,download,openGroup,openDiffraction,structureQuery='',
    cifPracticeOpen=cifSettingPracticeEnabled(structureQuery),cifOrbitOpen=cifOrbitPracticeEnabled(structureQuery),
    quartzPracticeOpen=quartzStructurePracticeEnabled(structureQuery)}=options;
  const foldingWave=siFoldingSourceWave(structureQuery);
  const siInputCoordinates=foldingWave?.map(String)??['1/2','0','0'];
  const siInputNotation=foldingWave?`(${foldingWave.join(',')})`:String.raw`(\frac{1}{2},0,0)`;
  const $=selector=>container.querySelector(selector);
  const revision=++state.revision;
  const current=()=>revision===state.revision&&container.dataset.researchView==='structure';
  let disposeHandoff=()=>{},sourceLoad=null,sourceLoadError=null;
  const invalid=()=>{state.inputVersion++;state.handoffTicket++;state.result=null;state.handoff=null;state.handoffPending=false;state.handoffError='';state.error='';drawResult();};
  container.innerHTML=`<div class="workspace-grid structure-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> 导入晶体结构</div><span class="subtle">POSCAR / CIF</span></div><div class="panel-body">
    <div class="controls-row"><label class="secondary small" for="structure-file">↑ 打开结构文件</label><input type="file" class="sr-only" id="structure-file" accept=".cif,.vasp,.poscar,.txt,POSCAR,CONTCAR"><button type="button" class="secondary small" id="structure-file-cancel" hidden>取消文件读取</button><button class="text-button" id="structure-poscar-example">NaCl 示例</button><button class="text-button" id="structure-cif-example">CIF 示例</button></div>
    <div class="structure-details"><button type="button" class="secondary" id="structure-si-example">核对并载入官方 Si 结构与练习设置</button><p class="form-note">${esc('将输入晶胞的波矢设为')} ${inlineMath(siInputNotation)}${esc('，对称性容差设为')} ${inlineMath(String.raw`10^{-5}\,\mathrm{\AA}`)}.</p>${foldingWave?'<p class="form-note" id="structure-si-fold-note">来自相位行的波矢采用 Si 常规胞的倒易分数坐标。载入并手动转换后，再用 BC 原胞坐标比较星臂数和小群阶。</p>':''}<div id="structure-si-source" role="status" tabindex="-1" hidden></div></div>
    ${cifSettingPracticeHTML(cifPracticeOpen)}
    ${cifOrbitPracticeHTML(cifOrbitOpen)}
    ${quartzStructurePracticeHTML(quartzPracticeOpen)}
    <label class="field-label" for="structure-format">输入格式</label><select class="form-select" id="structure-format"><option value="poscar" ${state.format==='poscar'?'selected':''}>POSCAR / CONTCAR</option><option value="cif" ${state.format==='cif'?'selected':''}>CIF</option></select>
    <label class="field-label" for="structure-text">文件内容<span>仅在此浏览器读取</span></label><textarea id="structure-text" class="band-input structure-input" spellcheck="false" aria-label="POSCAR 或 CIF 文件内容">${esc(state.text)}</textarea>
    <div class="structure-options"><div><label class="field-label" for="structure-symprec">对称性容差 / Å</label><input id="structure-symprec" class="form-select" value="${esc(state.symprec)}" inputmode="decimal"></div><div><label class="field-label" for="structure-species">VASP 4 元素顺序</label><input id="structure-species" class="form-select" value="${esc(state.species)}" placeholder="如 Na Cl；无元素行时填写"></div></div>
    <details class="structure-details"><summary>更多解析选项</summary><label class="field-label" for="structure-block">CIF 数据块名称</label><input class="form-select" id="structure-block" value="${esc(state.cifBlock)}" placeholder="多个晶体数据块时填写，不含 data_"><label class="field-label" for="structure-angle">角度容差 / 度</label><input class="form-select" id="structure-angle" value="${esc(state.angle)}"><p class="form-note">−1 表示由 spglib 自动确定角度容差。</p></details><label class="field-label">待转换的波矢 k<span>输入晶胞的倒易分数坐标</span></label><div class="coords">${state.k.map((v,i)=>`<div class="coord"><label for="structure-k-${i}">k<sub>${'xyz'[i]}</sub></label><input id="structure-k-${i}" aria-label="结构输入 k ${'xyz'[i]}" value="${esc(v)}"></div>`).join('')}</div>
    <button class="primary" id="structure-run" ${state.busy?'disabled':''}>${state.busy?'正在转换…':'识别空间群并转换到 BC →'}</button><div id="structure-error" role="alert"></div>
    <p class="form-note">适用于三维周期、满占位结构。识别结果随容差变化；CIF 无序、部分占位和磁矩信息会明确提示。<a href="docs/structure-bc.md" target="_blank">转换约定与输入范围 ↗</a></p>
  </div></section><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">02</span> BC 晶胞与坐标变换</div><span class="subtle">VERIFIED CONVERSION</span></div><div class="panel-body" id="structure-result"></div></section></div>`;
  const practicePanels=[
    {id:'structure-cif-practice',openKey:'cifPracticeOpen',cases:cifSettingCases,kz:'1/4',message:'合成练习 CIF 已在编辑框中。请手动转换。'},
    {id:'structure-cif-orbit-practice',openKey:'cifOrbitOpen',cases:cifOrbitCases,kz:'0',message:'石英练习 CIF 已在编辑框中。请手动转换。'}
  ].map(panel=>({...panel,element:$('#'+panel.id),status:$('#'+panel.id+'-status')}));
  const practiceButtons=practicePanels.flatMap(panel=>panel.cases.map(preset=>({
    panel,preset,button:$('#'+panel.id+'-'+preset.id)
  })));
  const quartzPanel=$('#structure-quartz-hand');
  const redraw=()=>renderStructureView({...options,quartzPracticeOpen:quartzPanel.open,...Object.fromEntries(practicePanels.map(({openKey,element})=>[openKey,element.open]))});
  function drawResult() {
    if(!current())return;
    for(const {cases,status,message} of practicePanels){
      const loaded=state.format==='cif'&&state.source.kind==='teaching-example'&&cases.some(example=>example.filename===state.source.filename);
      status.hidden=!loaded;
      status.textContent=loaded?message:'';
    }
    disposeHandoff();disposeHandoff=()=>{};
    $('#structure-error').innerHTML=state.error?`<div class="notice error">${esc(state.error)}</div>`:'';
    const target=$('#structure-result'),r=state.result;
    if(!r){target.innerHTML=`<div class="empty-state">${state.busy?'<span class="spinner"></span>正在识别对称性并核对 BC 操作…':'导入结构后，显示 BC 原胞、基矢和原点变换。<br>也可以先使用 NaCl / CIF 示例。'}</div>`;return;}
    // The result schema is shared by CPython and the browser worker.
    const cell=r.bc_primitive;
    const hallCheckOpen=$('#structure-cif-explicit-hall-check')?.open===true;
    const previousDiffractionButton=$('#structure-open-diffraction');
    const restoreDiffractionFocus=previousDiffractionButton&&globalThis.document?.activeElement===previousDiffractionButton;
    const canOpenDiffraction=typeof openDiffraction==='function';
    const diffraction=canOpenDiffraction?createStructureDiffractionHandoff(r,{
      format:state.format,filename:state.source.filename,sha256:state.handoff?.source.sha256
    }):null;
    target.innerHTML=`<div class="structure-summary"><span class="eyebrow">SPACE GROUP ${esc(r.group_number)}</span><h2>${crystalSpan(r.international,'hm')}</h2><p>${esc(r.bz_type||r.bravais)} · Hall ${esc(r.hall_number)}</p></div>
      ${state.format==='cif'?cifInputSettingHTML(r.input_metadata?.cif_symmetry_setting)+cifExplicitHallCheckHTML(r.input_metadata?.cif_explicit_hall_check,hallCheckOpen):''}
      <label class="sth-spin" for="structure-spin">${esc('交接到工作台的表示类型')}<select id="structure-spin"><option value="false" ${!state.doubleValued?'selected':''}>${esc('单值表示（默认）')}</option><option value="true" ${state.doubleValued?'selected':''}>${esc('双值表示（半整数自旋）')}</option></select></label><p class="form-note">${esc('这是明确的表示类型选择；结构文件本身不能决定 SOC 强弱或磁序。打开工作台后先核对来源和选择，再手动计算。')}</p>
      <div class="controls-row"><button class="primary small" id="structure-open-group" ${!state.handoff||state.handoffPending?'disabled':''}>${esc('携带来源打开表示工作台 →')}</button><button class="text-button" id="structure-json">↓ 完整 JSON</button></div>
      <div id="structure-handoff-card">${state.handoff?structureHandoffHTML(state.handoff):`<p class="sth-state ${state.handoffError?'sth-error':''}" role="status">${esc(state.handoffError||(state.handoffPending?'正在计算来源指纹；几何导出可继续使用。':'来源摘要尚未就绪；可先保留几何导出。'))}</p>`}</div>
      <div class="structure-downloads"><button class="secondary small" id="structure-poscar">↓ BC POSCAR</button><button class="secondary small" id="structure-cif">↓ BC CIF</button></div>
      ${canOpenDiffraction?`<div class="structure-details">
        <button class="secondary" type="button" id="structure-open-diffraction" aria-describedby="structure-diffraction-scope" ${diffraction?'':'disabled'}>${esc('用输入晶胞计算衍射 →')}</button>
        <p id="structure-diffraction-scope">${diffraction?'沿用输入晶胞的晶格、原子顺序和分数坐标。打开衍射计算后，按输入晶胞选取 (h,k,l)，再手动运行。':'这一入口支持含 1 至 128 个原子的有效三维输入晶胞。'}</p>
      </div>`:''}
      <p class="mini-heading">BC 原胞基矢 / Å · 每行一个基矢</p>${matrix(cell.lattice)}<p class="form-note">${cell.positions.length} 个原子 · ${esc([...new Set(cell.species)].join(' / '))}</p>
      <p class="mini-heading">输入 → BC · ${inlineMath(String.raw`x_{\mathrm{BC}}=M x_{\mathrm{input}}+q`,'x_BC = M x_input + q')}</p>${matrix(r.transform.coordinate_matrix)}<p class="form-note">q = (${r.transform.origin_shift.map(fmt).join(', ')})</p>
      <div class="notice">${inlineMath(String.raw`k_{\mathrm{BC}}=(${r.k_bc.map(fmt).join(', ')})`,'k_BC = ('+r.k_bc.map(fmt).join(', ')+')')}<br><small>倒易坐标使用 M⁻ᵀ；变换后的波矢可送入工作台。</small></div>
      <div class="notice structure-verification">${r.verified?'✓ BC 生成元与结构对称性核对通过':'转换检查未通过，请检查完整 JSON。'}</div>
      ${(r.warnings||[]).map(w=>`<div class="notice warning">${esc(structureDiagnosticText(w))}</div>`).join('')}
      <details class="structure-details"><summary>查看原子分数坐标</summary><div class="table-wrap"><table><thead><tr><th>元素</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>${cell.positions.map((p,i)=>`<tr><td>${esc(cell.species[i])}</td>${p.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <details class="structure-details"><summary>更多晶胞导出</summary><p class="form-note">未理想化 BC 晶胞保留输入的实际晶格；ITA 常规胞使用国际表设置，与 BC 原胞不同。</p><div class="controls-row"><button class="secondary small" id="structure-unidealized">↓ 未理想化 BC POSCAR</button><button class="secondary small" id="structure-standard">↓ ITA 常规胞 POSCAR</button></div></details><details class="structure-details"><summary>验证与理想化记录</summary><pre class="structure-json">${esc(JSON.stringify(r.verification,null,2))}</pre></details>`;
    const spin=$('#structure-spin');spin.onchange=()=>{if(!current()||$('#structure-spin')!==spin||state.result!==r)return;state.doubleValued=spin.value==='true';if(state.handoff)state.handoff=validateStructureHandoff({...state.handoff,doubleValued:state.doubleValued});drawResult();};
    const openButton=$('#structure-open-group');openButton.onclick=()=>{if(!current()||$('#structure-open-group')!==openButton||openButton.disabled||state.result!==r||!state.handoff)return;const handoff=validateStructureHandoff({...state.handoff,doubleValued:state.doubleValued});return openGroup(r.group_number,[...r.k_bc],r.bz_type,handoff);};
    const diffractionButton=$('#structure-open-diffraction');
    if(diffractionButton){
      diffractionButton.onclick=()=>{
        if(!current()||$('#structure-open-diffraction')!==diffractionButton||state.result!==r||!diffraction)return;
        return openDiffraction(diffraction);
      };
      if(restoreDiffractionFocus&&!diffractionButton.disabled)diffractionButton.focus?.({preventScroll:true});
    }
    if(state.handoff)disposeHandoff=bindStructureHandoff({root:$('#structure-handoff-card'),value:state.handoff,isCurrent:()=>current()&&state.result===r,download});
    $('#structure-json').onclick=()=>{if(!current()||state.result!==r)return;download(JSON.stringify(r,null,2),'bc-structure.json');};
    $('#structure-poscar').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.bc_poscar,'POSCAR_BC','text/plain;charset=utf-8');};
    $('#structure-cif').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.bc_cif,'structure_BC.cif','chemical/x-cif');};
    $('#structure-unidealized').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.unidealized_poscar,'POSCAR_BC_unidealized','text/plain;charset=utf-8');};
    $('#structure-standard').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.standard_poscar,'POSCAR_ITA_conventional','text/plain;charset=utf-8');};
  }
  const siButton=$('#structure-si-example');
  const siStatus=$('#structure-si-source');
  const quartzStatus=$('#structure-quartz-status');
  const sourceButtons=[
    {group:'si',example:siExample,button:siButton,status:siStatus,k:siInputCoordinates},
    ...quartzStructureCases.map(example=>({group:'quartz',example,button:$('#structure-quartz-'+example.id),status:quartzStatus,k:['0','0','0']}))
  ];
  const hasSiSource=()=>state.format==='poscar'&&state.source.kind==='teaching-example'&&state.source.filename===siExample.filename;
  const hasSiProbe=()=>{
    try{return !state.species.trim()&&!state.cifBlock.trim()&&number(state.symprec)===1e-5&&number(state.angle)===-1&&state.k.every((value,index)=>number(value)===[.5,0,0][index]);}
    catch{return false;}
  };
  function drawSiStatus(){
    if(sourceLoad?.group==='si'){siStatus.textContent='正在读取并核对官方 Si 原文件…';siStatus.hidden=false;return;}
    if(sourceLoadError?.group==='si'){siStatus.innerHTML=`<p class="notice error" role="alert">${esc(sourceLoadError.message)}</p>`;siStatus.hidden=false;return;}
    siStatus.hidden=!hasSiSource();
    siStatus.innerHTML=hasSiSource()?`<p class="notice">${esc('已核对官方 Si 原文件。确认波矢和容差后，手动识别空间群。')}</p>${hasSiProbe()?`<p class="form-note">${state.result?.verified?esc('在工作台试着填回原来的三个数字，再比较两次计算的星臂数和小群阶。'):esc('先预测。换到 BC 原胞后，描述同一个波矢还要用原来的三个数字吗？')}</p>`:''}<p><a href="docs/si-structure-example.md">Si 原文件、转换和波矢对照说明 →</a></p>`:'';
  }
  function drawQuartzStatus(){
    if(sourceLoad?.group==='quartz'){quartzStatus.textContent='正在读取并核对石英练习文件…';quartzStatus.hidden=false;return;}
    if(sourceLoadError?.group==='quartz'){quartzStatus.innerHTML=`<span class="notice error" role="alert">${esc(sourceLoadError.message)}</span>`;quartzStatus.hidden=false;return;}
    const loaded=state.source.kind==='teaching-example'&&quartzStructureCases.some(example=>example.filename===state.source.filename&&example.format===state.format);
    quartzStatus.hidden=!loaded;
    quartzStatus.textContent=loaded?'已核对并载入石英练习文件。请手动转换。':'';
  }
  function drawSourceStatus(){
    if(!current())return;
    sourceButtons.forEach(({button})=>button.disabled=state.busy||state.fileLoading||!!sourceLoad);
    drawSiStatus();
    drawQuartzStatus();
  }
  function releaseSourceLoad(request){
    request.observer?.disconnect();
    clearTimeout(request.timer);
    if(sourceLoad===request)sourceLoad=null;
  }
  function interruptSourceLoad(){
    if(sourceLoad){const request=sourceLoad;releaseSourceLoad(request);request.controller.abort();}
    sourceLoadError=null;
    drawSourceStatus();
  }
  async function loadSource({group,example,button,status,k}){
    if(!current()||$('#'+button.id)!==button||state.busy||state.fileLoading||sourceLoad)return;
    const request={group,controller:new AbortController(),observer:null,timer:null};
    const messages=sourceMessages[group];
    sourceLoad=request;sourceLoadError=null;
    const owns=()=>current()&&container.isConnected!==false&&$('#'+button.id)===button&&sourceLoad===request;
    if(typeof MutationObserver==='function'){
      request.observer=new MutationObserver(()=>{if(!owns()){releaseSourceLoad(request);request.controller.abort();}});
      request.observer.observe(container.ownerDocument?.documentElement||container,{childList:true,subtree:true});
    }
    request.timer=setTimeout(()=>request.controller.abort(),15000);
    drawSourceStatus();
    try{
      const text=await readStructureExample(example,request.controller.signal,messages);
      if(!owns()||request.controller.signal.aborted)return;
      releaseSourceLoad(request);
      state.fileTicket++;
      Object.assign(state,{text,format:example.format,species:'',cifBlock:'',symprec:'0.00001',angle:'-1',k:k.slice(),source:{kind:'teaching-example',filename:example.filename},sourceBytes:null,doubleValued:false});
      invalid();
      redraw();
      $('#'+status.id)?.focus({preventScroll:true});
    }catch(error){
      if(owns())sourceLoadError={group,message:request.controller.signal.aborted?messages.timeout:error.message};
    }finally{
      const active=owns();
      releaseSourceLoad(request);
      if(active)drawSourceStatus();
    }
  }
  sourceButtons.forEach(binding=>{binding.button.onclick=()=>loadSource(binding);});
  const setDisabled=()=>{$('#structure-run').disabled=state.busy||state.fileLoading;container.querySelectorAll('input,textarea,select,#structure-poscar-example,#structure-cif-example').forEach(el=>el.disabled=state.busy||state.fileLoading);$('#structure-file').disabled=state.busy;$('#structure-poscar-example').disabled=state.busy;$('#structure-cif-example').disabled=state.busy;practiceButtons.forEach(({button})=>button.disabled=state.busy||state.fileLoading);$('#structure-file-cancel').hidden=!state.fileLoading;$('#structure-file-cancel').disabled=state.busy;drawSourceStatus();};
  $('#structure-file-cancel').onclick=()=>{if(!current()||state.busy||!state.fileLoading)return;state.fileTicket++;state.fileLoading=false;invalid();$('#structure-file').value='';state.refresh?.();toast('已取消文件读取；当前结构文本保留。');};
  $('#structure-text').oninput=e=>{state.fileTicket++;state.fileLoading=false;state.text=e.target.value;state.source={kind:'user-text',filename:''};state.sourceBytes=null;interruptSourceLoad();invalid();};
  $('#structure-format').onchange=e=>{state.format=e.target.value;interruptSourceLoad();invalid();};
  $('#structure-symprec').oninput=e=>{state.symprec=e.target.value;interruptSourceLoad();invalid();};
  $('#structure-species').oninput=e=>{state.species=e.target.value;interruptSourceLoad();invalid();};
  $('#structure-block').oninput=e=>{state.cifBlock=e.target.value;interruptSourceLoad();invalid();};
  $('#structure-angle').oninput=e=>{state.angle=e.target.value;interruptSourceLoad();invalid();};
  state.k.forEach((_,i)=>{$('#structure-k-'+i).oninput=e=>{state.k[i]=e.target.value;interruptSourceLoad();invalid();};});
  const useExample=(text,format,filename=format==='cif'?'CsCl_example.cif':'NaCl_example.POSCAR')=>{if(!current())return;interruptSourceLoad();state.fileTicket++;state.fileLoading=false;state.text=text;state.format=format;state.species='';state.cifBlock='';state.source={kind:'teaching-example',filename};state.sourceBytes=null;state.doubleValued=false;invalid();redraw();};
  $('#structure-poscar-example').onclick=()=>useExample(sample,'poscar');
  $('#structure-cif-example').onclick=()=>useExample(cifSample,'cif');
  for(const {button,panel,preset} of practiceButtons){
    button.onclick=()=>{
      if(!current()||$('#'+button.id)!==button||state.busy||state.fileLoading)return;
      Object.assign(state,{symprec:'0.00001',angle:'-1',k:['0','0',panel.kz]});
      useExample(preset.text,'cif',preset.filename);
      $('#'+panel.id+'-status')?.focus?.({preventScroll:true});
    };
  }
  $('#structure-file').onchange=async e=>{
    if(!current())return;
    const file=e.target.files[0];if(!file)return;interruptSourceLoad();
    const fileTicket=++state.fileTicket;state.fileLoading=true;invalid();state.refresh?.();
    try{
      if(file.size>4_000_000)throw Error('结构文件不能超过 4 MB。');
      const bytes=typeof file.arrayBuffer==='function'?new Uint8Array(await file.arrayBuffer()):null;if(fileTicket!==state.fileTicket)return;
      const text=await file.text();if(fileTicket!==state.fileTicket)return;
      state.text=text;state.format=file.name.toLowerCase().endsWith('.cif')||/^\s*data_/im.test(text)?'cif':'poscar';state.species='';state.cifBlock='';state.source={kind:'user-file',filename:file.name};state.sourceBytes=bytes;state.doubleValued=false;invalid();
      if(current()){redraw();toast('已在本地读取 '+file.name);}
    }catch(error){if(fileTicket===state.fileTicket)state.error=error.message;}
    finally{if(fileTicket===state.fileTicket){state.fileLoading=false;if(current())$('#structure-file').value='';state.refresh?.();}}
  };
  $('#structure-run').onclick=async()=>{
    if(!current()||state.busy||state.fileLoading)return;
    interruptSourceLoad();
    const inputVersion=state.inputVersion;
    try{
      const payload={format:state.format,text:state.text,symprec:number(state.symprec),angle_tolerance:number(state.angle),k:state.k.map(number)};
      if(state.cifBlock.trim())payload.cif_block=state.cifBlock.trim();
      if(state.species.trim())payload.species=state.species.trim().split(/[\s,]+/);
      const source={...state.source,...(state.sourceBytes?{bytes:new Uint8Array(state.sourceBytes)}:{})};
      state.handoffTicket++;const hashTicket=state.handoffTicket;state.handoff=null;state.handoffError='';state.handoffPending=false;
      state.error='';state.result=null;state.busy=true;setDisabled();drawResult();$('#structure-run').textContent='正在转换…';
      const result=await run('structure_bc',payload);if(inputVersion!==state.inputVersion)return;state.result=result;state.handoffPending=true;if(current())toast('BC 晶胞转换完成');state.refresh?.();
      const owns=()=>inputVersion===state.inputVersion&&hashTicket===state.handoffTicket&&state.result===result;
      try{const handoff=await createStructureHandoff({result,input:payload,source,doubleValued:state.doubleValued,isCurrent:owns});if(owns()){state.handoff=validateStructureHandoff({...handoff,doubleValued:state.doubleValued});state.handoffPending=false;}}
      catch(error){if(owns()){state.handoff=null;state.handoffPending=false;state.handoffError=error.message||'来源摘要未完成；几何导出仍可使用。';}}
    }catch(error){
      if(inputVersion===state.inputVersion){
        state.error=structureDiagnosticText(error.message);
      }
    }
    finally{state.busy=false;state.refresh?.();}
  };
  state.refresh=()=>{if(current()){setDisabled();$('#structure-run').textContent=state.fileLoading?'正在读取文件…':state.busy?'正在转换…':'识别空间群并转换到 BC →';drawResult();}};
  state.refresh();
}
