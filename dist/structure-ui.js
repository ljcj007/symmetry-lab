import {crystalSpan} from './crystal-notation.js?v=20261030-symmetry1';
// Structure files are read locally; the Python worker performs all conversion.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
const state = {text:sample, format:'poscar', symprec:'0.00001', species:'', cifBlock:'', angle:'-1', k:['0','0','0'], result:null, error:'', busy:false, fileLoading:false, fileTicket:0, inputVersion:0, revision:0};
const number = value => {const pieces=String(value).trim().split('/');if(pieces.length>2||pieces.some(x=>!x.trim()))throw Error('请输入有限数值或分数。');const n=pieces.length===2?Number(pieces[0])/Number(pieces[1]):Number(pieces[0]);if(!Number.isFinite(n))throw Error('请输入有限数值或分数。');return n;};
const fmt = value => typeof value === 'number' ? (Math.abs(value)<1e-10?'0':Number(value.toPrecision(9)).toString()) : esc(value);
const matrix = rows => `<div class="table-wrap"><table><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const getStructureResult = () => state.result;

export function renderStructureView({container,run,toast,download,openGroup}) {
  const $=selector=>container.querySelector(selector);
  const revision=++state.revision;
  const current=()=>revision===state.revision&&container.dataset.researchView==='structure';
  const invalid=()=>{state.inputVersion++;state.result=null;state.error='';drawResult();};
  container.innerHTML=`<div class="workspace-grid structure-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> 导入晶体结构</div><span class="subtle">POSCAR / CIF</span></div><div class="panel-body">
    <div class="controls-row"><label class="secondary small" for="structure-file">↑ 打开结构文件</label><input type="file" class="sr-only" id="structure-file" accept=".cif,.vasp,.poscar,.txt,POSCAR,CONTCAR"><button class="text-button" id="structure-poscar-example">NaCl 示例</button><button class="text-button" id="structure-cif-example">CIF 示例</button></div>
    <label class="field-label" for="structure-format">输入格式</label><select class="form-select" id="structure-format"><option value="poscar" ${state.format==='poscar'?'selected':''}>POSCAR / CONTCAR</option><option value="cif" ${state.format==='cif'?'selected':''}>CIF</option></select>
    <label class="field-label" for="structure-text">文件内容<span>仅在此浏览器读取</span></label><textarea id="structure-text" class="band-input structure-input" spellcheck="false" aria-label="POSCAR 或 CIF 文件内容">${esc(state.text)}</textarea>
    <div class="structure-options"><div><label class="field-label" for="structure-symprec">对称性容差 / Å</label><input id="structure-symprec" class="form-select" value="${esc(state.symprec)}" inputmode="decimal"></div><div><label class="field-label" for="structure-species">VASP 4 元素顺序</label><input id="structure-species" class="form-select" value="${esc(state.species)}" placeholder="如 Na Cl；无元素行时填写"></div></div>
    <details class="structure-details"><summary>更多解析选项</summary><label class="field-label" for="structure-block">CIF 数据块名称</label><input class="form-select" id="structure-block" value="${esc(state.cifBlock)}" placeholder="多个晶体数据块时填写，不含 data_"><label class="field-label" for="structure-angle">角度容差 / 度</label><input class="form-select" id="structure-angle" value="${esc(state.angle)}"><p class="form-note">−1 表示由 spglib 自动确定角度容差。</p></details><label class="field-label">待转换的波矢 k<span>输入晶胞的倒易分数坐标</span></label><div class="coords">${state.k.map((v,i)=>`<div class="coord"><label for="structure-k-${i}">k<sub>${'xyz'[i]}</sub></label><input id="structure-k-${i}" aria-label="结构输入 k ${'xyz'[i]}" value="${esc(v)}"></div>`).join('')}</div>
    <button class="primary" id="structure-run" ${state.busy?'disabled':''}>${state.busy?'正在转换…':'识别空间群并转换到 BC →'}</button><div id="structure-error" role="alert"></div>
    <p class="form-note">适用于三维周期、满占位结构。识别结果随容差变化；CIF 无序、部分占位和磁矩信息会明确提示。<a href="docs/structure-bc.md" target="_blank">转换约定与输入范围 ↗</a></p>
  </div></section><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">02</span> BC 晶胞与坐标变换</div><span class="subtle">VERIFIED CONVERSION</span></div><div class="panel-body" id="structure-result"></div></section></div>`;
  function drawResult() {
    if(!current())return;
    $('#structure-error').innerHTML=state.error?`<div class="notice error">${esc(state.error)}</div>`:'';
    const target=$('#structure-result'),r=state.result;
    if(!r){target.innerHTML=`<div class="empty-state">${state.busy?'<span class="spinner"></span>正在识别对称性并核对 BC 操作…':'导入结构后，显示 BC 原胞、基矢和原点变换。<br>也可以先使用 NaCl / CIF 示例。'}</div>`;return;}
    // The result schema is shared by CPython and the browser worker.
    const cell=r.bc_primitive;
    target.innerHTML=`<div class="structure-summary"><span class="eyebrow">SPACE GROUP ${esc(r.group_number)}</span><h2>${crystalSpan(r.international,'hm')}</h2><p>${esc(r.bz_type||r.bravais)} · Hall ${esc(r.hall_number)}</p></div>
      <div class="controls-row"><button class="primary small" id="structure-open-group">在工作台计算表示 →</button><button class="text-button" id="structure-json">↓ 完整 JSON</button></div>
      <div class="structure-downloads"><button class="secondary small" id="structure-poscar">↓ BC POSCAR</button><button class="secondary small" id="structure-cif">↓ BC CIF</button></div>
      <p class="mini-heading">BC 原胞基矢 / Å · 每行一个基矢</p>${matrix(cell.lattice)}<p class="form-note">${cell.positions.length} 个原子 · ${esc([...new Set(cell.species)].join(' / '))}</p>
      <p class="mini-heading">输入 → BC · x<sub>BC</sub> = M x<sub>input</sub> + q</p>${matrix(r.transform.coordinate_matrix)}<p class="form-note">q = (${r.transform.origin_shift.map(fmt).join(', ')})</p>
      <div class="notice">k<sub>BC</sub> = (${r.k_bc.map(fmt).join(', ')})<br><small>倒易坐标使用 M⁻ᵀ；变换后的波矢可送入工作台。</small></div>
      <div class="notice structure-verification">${r.verified?'✓ BC 生成元与结构对称性核对通过':'转换检查未通过，请检查完整 JSON。'}</div>
      ${(r.warnings||[]).map(w=>`<div class="notice warning">${esc(w)}</div>`).join('')}
      <details class="structure-details"><summary>查看原子分数坐标</summary><div class="table-wrap"><table><thead><tr><th>元素</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>${cell.positions.map((p,i)=>`<tr><td>${esc(cell.species[i])}</td>${p.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <details class="structure-details"><summary>更多晶胞导出</summary><p class="form-note">未理想化 BC 晶胞保留输入的实际晶格；ITA 常规胞使用国际表设置，与 BC 原胞不同。</p><div class="controls-row"><button class="secondary small" id="structure-unidealized">↓ 未理想化 BC POSCAR</button><button class="secondary small" id="structure-standard">↓ ITA 常规胞 POSCAR</button></div></details><details class="structure-details"><summary>验证与理想化记录</summary><pre class="structure-json">${esc(JSON.stringify(r.verification,null,2))}</pre></details>`;
    $('#structure-open-group').onclick=()=>openGroup(r.group_number,r.k_bc,r.bz_type);
    $('#structure-json').onclick=()=>download(JSON.stringify(r,null,2),'bc-structure.json');
    $('#structure-poscar').onclick=()=>download(r.exports.bc_poscar,'POSCAR_BC','text/plain;charset=utf-8');
    $('#structure-cif').onclick=()=>download(r.exports.bc_cif,'structure_BC.cif','chemical/x-cif');
    $('#structure-unidealized').onclick=()=>download(r.exports.unidealized_poscar,'POSCAR_BC_unidealized','text/plain;charset=utf-8');
    $('#structure-standard').onclick=()=>download(r.exports.standard_poscar,'POSCAR_ITA_conventional','text/plain;charset=utf-8');
  }
  const setDisabled=()=>{$('#structure-run').disabled=state.busy||state.fileLoading;container.querySelectorAll('input,textarea,select,#structure-poscar-example,#structure-cif-example').forEach(el=>el.disabled=state.busy||state.fileLoading);};
  $('#structure-text').oninput=e=>{state.text=e.target.value;invalid();};
  $('#structure-format').onchange=e=>{state.format=e.target.value;invalid();};
  $('#structure-symprec').oninput=e=>{state.symprec=e.target.value;invalid();};
  $('#structure-species').oninput=e=>{state.species=e.target.value;invalid();};
  $('#structure-block').oninput=e=>{state.cifBlock=e.target.value;invalid();};
  $('#structure-angle').oninput=e=>{state.angle=e.target.value;invalid();};
  state.k.forEach((_,i)=>{$('#structure-k-'+i).oninput=e=>{state.k[i]=e.target.value;invalid();};});
  const useExample=(text,format)=>{state.text=text;state.format=format;state.species='';state.cifBlock='';invalid();renderStructureView({container,run,toast,download,openGroup});};
  $('#structure-poscar-example').onclick=()=>useExample(sample,'poscar');
  $('#structure-cif-example').onclick=()=>useExample(cifSample,'cif');
  $('#structure-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    const fileTicket=++state.fileTicket;state.fileLoading=true;invalid();state.refresh?.();
    try{
      if(file.size>4_000_000)throw Error('结构文件不能超过 4 MB。');
      const text=await file.text();if(fileTicket!==state.fileTicket)return;
      state.text=text;state.format=file.name.toLowerCase().endsWith('.cif')||/^\s*data_/im.test(text)?'cif':'poscar';state.species='';state.cifBlock='';invalid();
      if(current()){renderStructureView({container,run,toast,download,openGroup});toast('已在本地读取 '+file.name);}
    }catch(error){if(fileTicket===state.fileTicket)state.error=error.message;}
    finally{if(fileTicket===state.fileTicket){state.fileLoading=false;state.refresh?.();}}
  };
  $('#structure-run').onclick=async()=>{
    if(state.busy||state.fileLoading)return;
    const inputVersion=state.inputVersion;
    try{
      const payload={format:state.format,text:state.text,symprec:number(state.symprec),angle_tolerance:number(state.angle),k:state.k.map(number)};
      if(state.cifBlock.trim())payload.cif_block=state.cifBlock.trim();
      if(state.species.trim())payload.species=state.species.trim().split(/[\s,]+/);
      state.error='';state.result=null;state.busy=true;setDisabled();drawResult();$('#structure-run').textContent='正在转换…';
      const result=await run('structure_bc',payload);if(inputVersion!==state.inputVersion)return;state.result=result;if(current())toast('BC 晶胞转换完成');
    }catch(error){state.error=error.message;}
    finally{state.busy=false;state.refresh?.();}
  };
  state.refresh=()=>{if(current()){setDisabled();$('#structure-run').textContent=state.fileLoading?'正在读取文件…':state.busy?'正在转换…':'识别空间群并转换到 BC →';drawResult();}};
  state.refresh();
}
