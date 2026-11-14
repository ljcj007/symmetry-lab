import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createStructureHandoff,validateStructureHandoff,structureHandoffHTML,bindStructureHandoff} from './structure-handoff.js?v=20261114-evidence2';
// Structure files are read locally; the Python worker performs all conversion.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inlineMath=(tex,source=tex)=>`<span class="sl-math" data-math-source="${esc(source)}">${mathHTML(tex)}</span>`;
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
const state = {text:sample, format:'poscar', symprec:'0.00001', species:'', cifBlock:'', angle:'-1', k:['0','0','0'], result:null, error:'', busy:false, fileLoading:false, fileTicket:0, inputVersion:0, revision:0,source:{kind:'teaching-example',filename:'NaCl_example.POSCAR'},sourceBytes:null,doubleValued:false,handoff:null,handoffPending:false,handoffError:'',handoffTicket:0};
const number = value => {const pieces=String(value).trim().split('/');if(pieces.length>2||pieces.some(x=>!x.trim()))throw Error("Please enter a finite value or fraction.");const n=pieces.length===2?Number(pieces[0])/Number(pieces[1]):Number(pieces[0]);if(!Number.isFinite(n))throw Error("Please enter a finite value or fraction.");return n;};
const fmt = value => typeof value === 'number' ? (Math.abs(value)<1e-10?'0':Number(value.toPrecision(9)).toString()) : esc(value);
const matrix = rows => `<div class="table-wrap"><table><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const getStructureResult = () => state.result;

export function renderStructureView({container,run,toast,download,openGroup}) {
  const $=selector=>container.querySelector(selector);
  const revision=++state.revision;
  const current=()=>revision===state.revision&&container.dataset.researchView==='structure';
  let disposeHandoff=()=>{};
  const invalid=()=>{state.inputVersion++;state.handoffTicket++;state.result=null;state.handoff=null;state.handoffPending=false;state.handoffError='';state.error='';drawResult();};
  container.innerHTML=`<div class="workspace-grid structure-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> Import crystal structure</div><span class="subtle">POSCAR / CIF</span></div><div class="panel-body">
    <div class="controls-row"><label class="secondary small" for="structure-file">↑ Open structure file</label><input type="file" class="sr-only" id="structure-file" accept=".cif,.vasp,.poscar,.txt,POSCAR,CONTCAR"><button type="button" class="secondary small" id="structure-file-cancel" hidden>Cancel file read</button><button class="text-button" id="structure-poscar-example">NaCl example</button><button class="text-button" id="structure-cif-example">CIF Example</button></div>
    <label class="field-label" for="structure-format">input format</label><select class="form-select" id="structure-format"><option value="poscar" ${state.format==='poscar'?'selected':''}>POSCAR / CONTCAR</option><option value="cif" ${state.format==='cif'?'selected':''}>CIF</option></select>
    <label class="field-label" for="structure-text">file content<span>can only be read in this browser</span></label><textarea id="structure-text" class="band-input structure-input" spellcheck="false" aria-label="POSCAR or CIF file content">${esc(state.text)}</textarea>
    <div class="structure-options"><div><label class="field-label" for="structure-symprec">Symmetry tolerance / Å</label><input id="structure-symprec" class="form-select" value="${esc(state.symprec)}" inputmode="decimal"></div><div><label class="field-label" for="structure-species">VASP 4 element order</label><input id="structure-species" class="form-select" value="${esc(state.species)}" placeholder="Such as Na Cl; fill in if there is no element row"></div></div>
    <details class="structure-details"><summary>More parsing options</summary><label class="field-label" for="structure-block">CIF Data block name</label><input class="form-select" id="structure-block" value="${esc(state.cifBlock)}" placeholder="Fill in when there are multiple crystal data blocks, excluding data_"><label class="field-label" for="structure-angle">Angle tolerance/degree</label><input class="form-select" id="structure-angle" value="${esc(state.angle)}"><p class="form-note">−1 means the angle tolerance is automatically determined by spglib.</p></details><label class="field-label">to be converted wavevector k<span>Reciprocity of input unit cell fractional coordinates</span></label><div class="coords">${state.k.map((v,i)=>`<div class="coord"><label for="structure-k-${i}">k<sub>${'xyz'[i]}</sub></label><input id="structure-k-${i}" aria-label="structure input k ${'xyz'[i]}" value="${esc(v)}"></div>`).join('')}</div>
    <button class="primary" id="structure-run" ${state.busy?'disabled':''}>${state.busy?"Converting…":"recognizes space group and converts to BC →"}</button><div id="structure-error" role="alert"></div>
    <p class="form-note">is suitable for three-dimensional periodic and full-occupancy structures. The identification results vary with the tolerance; CIF disorder, partial occupancy and magnetic moment information will be clearly prompted.<a href="docs/structure-bc.md" target="_blank">conversion convention and input range ↗</a></p>
  </div></section><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">02</span> BC Unit cell and coordinate transformation</div><span class="subtle">VERIFIED CONVERSION</span></div><div class="panel-body" id="structure-result"></div></section></div>`;
  function drawResult() {
    if(!current())return;
    disposeHandoff();disposeHandoff=()=>{};
    $('#structure-error').innerHTML=state.error?`<div class="notice error">${esc(state.error)}</div>`:'';
    const target=$('#structure-result'),r=state.result;
    if(!r){target.innerHTML=`<div class="empty-state">${state.busy?"<span class=\"spinner\"></span>Identifying symmetries and verifying BC operations...":"After importing the structure, BC primitive cell , basis vector and origin transformation are displayed.<br>You can also start with the NaCl / CIF example."}</div>`;return;}
    // The result schema is shared by CPython and the browser worker.
    const cell=r.bc_primitive;
    target.innerHTML=`<div class="structure-summary"><span class="eyebrow">SPACE GROUP ${esc(r.group_number)}</span><h2>${crystalSpan(r.international,'hm')}</h2><p>${esc(r.bz_type||r.bravais)} · Hall ${esc(r.hall_number)}</p></div>
      <label class="sth-spin" for="structure-spin">${esc("Representation type for the workbench handoff")}<select id="structure-spin"><option value="false" ${!state.doubleValued?'selected':''}>${esc("Single-valued representation (default)")}</option><option value="true" ${state.doubleValued?'selected':''}>${esc("Double-valued representation (half-integer spin)")}</option></select></label><p class="form-note">${esc("Select the representation type explicitly; the structure file alone cannot determine SOC strength or magnetic order. Check the source and settings in the workbench, then start the calculation manually.")}</p>
      <div class="controls-row"><button class="primary small" id="structure-open-group" ${!state.handoff||state.handoffPending?'disabled':''}>${esc("Open the representation workbench with this source →")}</button><button class="text-button" id="structure-json">↓ Complete JSON</button></div>
      <div id="structure-handoff-card">${state.handoff?structureHandoffHTML(state.handoff):`<p class="sth-state ${state.handoffError?'sth-error':''}" role="status">${esc(state.handoffError||(state.handoffPending?"Computing the source fingerprint; geometry exports remain available.":"The source summary is not ready; geometry exports remain available."))}</p>`}</div>
      <div class="structure-downloads"><button class="secondary small" id="structure-poscar">↓ BC POSCAR</button><button class="secondary small" id="structure-cif">↓ BC CIF</button></div>
      <p class="mini-heading">BC primitive cell basis vectors / Å · One basis vector per row</p>${matrix(cell.lattice)}<p class="form-note">${cell.positions.length} atoms · ${esc([...new Set(cell.species)].join(' / '))}</p>
      <p class="mini-heading">input → BC · ${inlineMath(String.raw`x_{\mathrm{BC}}=M x_{\mathrm{input}}+q`,'x_BC = M x_input + q')}</p>${matrix(r.transform.coordinate_matrix)}<p class="form-note">q = (${r.transform.origin_shift.map(fmt).join(', ')})</p>
      <div class="notice">${inlineMath(String.raw`k_{\mathrm{BC}}=(${r.k_bc.map(fmt).join(', ')})`,'k_BC = ('+r.k_bc.map(fmt).join(', ')+')')}<br><small>use M⁻ᵀ; the transformed wavevector can be sent to the workbench.</small></div>
      <div class="notice structure-verification">${r.verified?"✓ BC generator passed the verification with structural symmetry":"conversion check failed, please check complete JSON."}</div>
      ${(r.warnings||[]).map(w=>`<div class="notice warning">${esc(w)}</div>`).join('')}
      <details class="structure-details"><summary>View atom fractional coordinates</summary><div class="table-wrap"><table><thead><tr><th>element</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>${cell.positions.map((p,i)=>`<tr><td>${esc(cell.species[i])}</td>${p.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <details class="structure-details"><summary>More unit cell exports</summary><p class="form-note">is not idealized BC unit cell retains the actual lattice of the input; ITA conventional cell uses international table settings, unlike BC primitive cell .</p><div class="controls-row"><button class="secondary small" id="structure-unidealized">↓ Not idealized BC POSCAR</button><button class="secondary small" id="structure-standard">↓ ITA conventional cell POSCAR</button></div></details><details class="structure-details"><summary>Verification and idealization records</summary><pre class="structure-json">${esc(JSON.stringify(r.verification,null,2))}</pre></details>`;
    const spin=$('#structure-spin');spin.onchange=()=>{if(!current()||$('#structure-spin')!==spin||state.result!==r)return;state.doubleValued=spin.value==='true';if(state.handoff)state.handoff=validateStructureHandoff({...state.handoff,doubleValued:state.doubleValued});drawResult();};
    const openButton=$('#structure-open-group');openButton.onclick=()=>{if(!current()||$('#structure-open-group')!==openButton||openButton.disabled||state.result!==r||!state.handoff)return;const handoff=validateStructureHandoff({...state.handoff,doubleValued:state.doubleValued});return openGroup(r.group_number,[...r.k_bc],r.bz_type,handoff);};
    if(state.handoff)disposeHandoff=bindStructureHandoff({root:$('#structure-handoff-card'),value:state.handoff,isCurrent:()=>current()&&state.result===r,download});
    $('#structure-json').onclick=()=>{if(!current()||state.result!==r)return;download(JSON.stringify(r,null,2),'bc-structure.json');};
    $('#structure-poscar').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.bc_poscar,'POSCAR_BC','text/plain;charset=utf-8');};
    $('#structure-cif').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.bc_cif,'structure_BC.cif','chemical/x-cif');};
    $('#structure-unidealized').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.unidealized_poscar,'POSCAR_BC_unidealized','text/plain;charset=utf-8');};
    $('#structure-standard').onclick=()=>{if(!current()||state.result!==r)return;download(r.exports.standard_poscar,'POSCAR_ITA_conventional','text/plain;charset=utf-8');};
  }
  const setDisabled=()=>{$('#structure-run').disabled=state.busy||state.fileLoading;container.querySelectorAll('input,textarea,select,#structure-poscar-example,#structure-cif-example').forEach(el=>el.disabled=state.busy||state.fileLoading);$('#structure-file').disabled=state.busy;$('#structure-poscar-example').disabled=state.busy;$('#structure-cif-example').disabled=state.busy;$('#structure-file-cancel').hidden=!state.fileLoading;$('#structure-file-cancel').disabled=state.busy;};
  $('#structure-file-cancel').onclick=()=>{if(!current()||state.busy||!state.fileLoading)return;state.fileTicket++;state.fileLoading=false;invalid();$('#structure-file').value='';state.refresh?.();toast("File reading canceled; the current structure text was retained.");};
  $('#structure-text').oninput=e=>{state.fileTicket++;state.fileLoading=false;state.text=e.target.value;state.source={kind:'user-text',filename:''};state.sourceBytes=null;invalid();};
  $('#structure-format').onchange=e=>{state.format=e.target.value;invalid();};
  $('#structure-symprec').oninput=e=>{state.symprec=e.target.value;invalid();};
  $('#structure-species').oninput=e=>{state.species=e.target.value;invalid();};
  $('#structure-block').oninput=e=>{state.cifBlock=e.target.value;invalid();};
  $('#structure-angle').oninput=e=>{state.angle=e.target.value;invalid();};
  state.k.forEach((_,i)=>{$('#structure-k-'+i).oninput=e=>{state.k[i]=e.target.value;invalid();};});
  const useExample=(text,format)=>{if(!current())return;state.fileTicket++;state.fileLoading=false;state.text=text;state.format=format;state.species='';state.cifBlock='';state.source={kind:'teaching-example',filename:format==='cif'?'CsCl_example.cif':'NaCl_example.POSCAR'};state.sourceBytes=null;state.doubleValued=false;invalid();renderStructureView({container,run,toast,download,openGroup});};
  $('#structure-poscar-example').onclick=()=>useExample(sample,'poscar');
  $('#structure-cif-example').onclick=()=>useExample(cifSample,'cif');
  $('#structure-file').onchange=async e=>{
    if(!current())return;
    const file=e.target.files[0];if(!file)return;
    const fileTicket=++state.fileTicket;state.fileLoading=true;invalid();state.refresh?.();
    try{
      if(file.size>4_000_000)throw Error("Structure file cannot exceed 4 MB.");
      const bytes=typeof file.arrayBuffer==='function'?new Uint8Array(await file.arrayBuffer()):null;if(fileTicket!==state.fileTicket)return;
      const text=await file.text();if(fileTicket!==state.fileTicket)return;
      state.text=text;state.format=file.name.toLowerCase().endsWith('.cif')||/^\s*data_/im.test(text)?'cif':'poscar';state.species='';state.cifBlock='';state.source={kind:'user-file',filename:file.name};state.sourceBytes=bytes;state.doubleValued=false;invalid();
      if(current()){renderStructureView({container,run,toast,download,openGroup});toast("has been read locally "+file.name);}
    }catch(error){if(fileTicket===state.fileTicket)state.error=error.message;}
    finally{if(fileTicket===state.fileTicket){state.fileLoading=false;if(current())$('#structure-file').value='';state.refresh?.();}}
  };
  $('#structure-run').onclick=async()=>{
    if(!current()||state.busy||state.fileLoading)return;
    const inputVersion=state.inputVersion;
    try{
      const payload={format:state.format,text:state.text,symprec:number(state.symprec),angle_tolerance:number(state.angle),k:state.k.map(number)};
      if(state.cifBlock.trim())payload.cif_block=state.cifBlock.trim();
      if(state.species.trim())payload.species=state.species.trim().split(/[\s,]+/);
      const source={...state.source,...(state.sourceBytes?{bytes:new Uint8Array(state.sourceBytes)}:{})};
      state.handoffTicket++;const hashTicket=state.handoffTicket;state.handoff=null;state.handoffError='';state.handoffPending=false;
      state.error='';state.result=null;state.busy=true;setDisabled();drawResult();$('#structure-run').textContent="Converting…";
      const result=await run('structure_bc',payload);if(inputVersion!==state.inputVersion)return;state.result=result;state.handoffPending=true;if(current())toast("BC unit cell conversion completed");state.refresh?.();
      const owns=()=>inputVersion===state.inputVersion&&hashTicket===state.handoffTicket&&state.result===result;
      try{const handoff=await createStructureHandoff({result,input:payload,source,doubleValued:state.doubleValued,isCurrent:owns});if(owns()){state.handoff=validateStructureHandoff({...handoff,doubleValued:state.doubleValued});state.handoffPending=false;}}
      catch(error){if(owns()){state.handoff=null;state.handoffPending=false;state.handoffError=error.message||"The source summary was not completed; geometry exports remain available.";}}
    }catch(error){if(inputVersion===state.inputVersion)state.error=error.message;}
    finally{state.busy=false;state.refresh?.();}
  };
  state.refresh=()=>{if(current()){setDisabled();$('#structure-run').textContent=state.fileLoading?"Reading file...":state.busy?"Converting…":"recognizes space group and converts to BC →";drawResult();}};
  state.refresh();
}
