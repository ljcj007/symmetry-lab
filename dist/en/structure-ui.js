import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createStructureHandoff,validateStructureHandoff,structureHandoffHTML,bindStructureHandoff} from './structure-handoff.js?v=20261114-evidence2';
import {createStructureDiffractionHandoff} from './structure-diffraction-handoff.js?v=20261120-structure-diffraction1';
import {siFoldingSourceWave} from './si-folding-route.js?v=20261120-si-fold-handoff1';
import {cifSettingCases,cifSettingPracticeEnabled,cifSettingPracticeHTML,cifInputSettingHTML} from './cif-setting-practice.js?v=20261120-cif-dotted2';
import {cifOrbitCases,cifOrbitPracticeEnabled,cifOrbitPracticeHTML} from './cif-orbit-practice.js?v=20261120-cif-orbit1';
// Structure files are read locally; the Python worker performs all conversion.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inlineMath=(tex,source=tex)=>`<span class="sl-math" data-math-source="${esc(source)}">${mathHTML(tex)}</span>`;
const formatDiagnosticFields=(template,fields)=>template.replace(/\{([1-5])\}/g,(_,index)=>fields[index-1]);
function structureDiagnosticText(message){
  if(message==='CIF symmetry rotations do not preserve the declared cell metric at this tolerance')return "The CIF symmetry rotations do not preserve the input cell metric at the current tolerance.";
  if(message==='Conflicting CIF International Tables space-group numbers in _space_group_IT_number and _symmetry_Int_Tables_number')return "CIF fields _space_group_IT_number and _symmetry_Int_Tables_number give different space-group numbers. Check the original structure.";
  const aliases=/^Repeated CIF data item: (_\S+) aliases (_\S+)$/.exec(message);
  if(aliases)return formatDiagnosticFields("CIF fields {1} and {2} refer to the same data item. Keep one spelling.",aliases.slice(1));
  const site=/^CIF atom-site row (\d+)(?: \((.{1,48})\))? (.*)$/su.exec(message);
  if(!site)return message;
  const [,row,label,detail]=site;
  const location=[row,label?` (${label})`:''];
  if(detail==='multiplicity must be an integer from 1 to 192'){
    return formatDiagnosticFields("The multiplicity in CIF atom-site row {1}{2} must be an integer from 1 to 192.",location);
  }
  const legacy=/^expands to multiplicity (\d+)\. Deprecated _atom_site_symmetry_multiplicity records (\d+), consistent with the site symmetry order\. The source value is retained\.$/.exec(detail);
  if(legacy)return formatDiagnosticFields("CIF atom-site row {1}{2} expands to multiplicity {3}. The value {4} in the legacy field _atom_site_symmetry_multiplicity agrees with the site-symmetry order. The source value is retained.",[...location,...legacy.slice(1)]);
  const mismatch=/^declares multiplicity (\d+), but symmetry expansion gives (\d+) distinct periodic sites at (\d+(?:\.\d+)?(?:[eE][+-]?\d+)?) Angstrom\. Check the symmetry setting, multiplicity field and site coordinates\.$/.exec(detail);
  return mismatch?formatDiagnosticFields("CIF atom-site row {1}{2} declares multiplicity {3}. Symmetry expansion gives {4} distinct periodic sites at a deduplication tolerance of {5} Å. Check the symmetry setting, multiplicity field, and site coordinates.",[...location,...mismatch.slice(1)]):message;
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
  url:new URL('./data/examples/phonopy-si-structure/POSCAR-0?v=20261119-si1',import.meta.url),
  byteCount:1109,
  sha256:'6e2316a7d3085fd9fe5fc837aa849d2ad1d104ea1b23919fc6b3c1514b72e7a7'
});

async function readOfficialSiExample(signal){
  if(!globalThis.crypto?.subtle)throw Error("Open the site over HTTPS or at a local address to verify the Si example's file hash.");
  const response=await fetch(siExample.url,{signal});
  if(!response.ok)throw Error("The official Si example could not load. Please try again.");
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==siExample.byteCount)throw Error("The official Si example's byte count or SHA-256 does not match.");
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==siExample.sha256)throw Error("The official Si example's byte count or SHA-256 does not match.");
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const encoded=new TextEncoder().encode(text);
  if(encoded.length!==bytes.length||!encoded.every((byte,index)=>byte===bytes[index]))throw Error("The official Si example could not be preserved byte for byte as UTF-8 text.");
  return text;
}

const state = {text:sample, format:'poscar', symprec:'0.00001', species:'', cifBlock:'', angle:'-1', k:['0','0','0'], result:null, error:'', busy:false, fileLoading:false, fileTicket:0, inputVersion:0, revision:0,source:{kind:'teaching-example',filename:'NaCl_example.POSCAR'},sourceBytes:null,doubleValued:false,handoff:null,handoffPending:false,handoffError:'',handoffTicket:0};
const number = value => {const pieces=String(value).trim().split('/');if(pieces.length>2||pieces.some(x=>!x.trim()))throw Error("Please enter a finite value or fraction.");const n=pieces.length===2?Number(pieces[0])/Number(pieces[1]):Number(pieces[0]);if(!Number.isFinite(n))throw Error("Please enter a finite value or fraction.");return n;};
const fmt = value => typeof value === 'number' ? (Math.abs(value)<1e-10?'0':Number(value.toPrecision(9)).toString()) : esc(value);
const matrix = rows => `<div class="table-wrap"><table><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const getStructureResult = () => state.result;

export function renderStructureView(options) {
  const {container,run,toast,download,openGroup,openDiffraction,structureQuery='',
    cifPracticeOpen=cifSettingPracticeEnabled(structureQuery),cifOrbitOpen=cifOrbitPracticeEnabled(structureQuery)}=options;
  const foldingWave=siFoldingSourceWave(structureQuery);
  const siInputCoordinates=foldingWave?.map(String)??['1/2','0','0'];
  const siInputNotation=foldingWave?`(${foldingWave.join(',')})`:String.raw`(\frac{1}{2},0,0)`;
  const $=selector=>container.querySelector(selector);
  const revision=++state.revision;
  const current=()=>revision===state.revision&&container.dataset.researchView==='structure';
  let disposeHandoff=()=>{},siLoad=null,siLoadError='';
  const invalid=()=>{state.inputVersion++;state.handoffTicket++;state.result=null;state.handoff=null;state.handoffPending=false;state.handoffError='';state.error='';drawResult();};
  container.innerHTML=`<div class="workspace-grid structure-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> Import crystal structure</div><span class="subtle">POSCAR / CIF</span></div><div class="panel-body">
    <div class="controls-row"><label class="secondary small" for="structure-file">↑ Open structure file</label><input type="file" class="sr-only" id="structure-file" accept=".cif,.vasp,.poscar,.txt,POSCAR,CONTCAR"><button type="button" class="secondary small" id="structure-file-cancel" hidden>Cancel file read</button><button class="text-button" id="structure-poscar-example">NaCl example</button><button class="text-button" id="structure-cif-example">CIF Example</button></div>
    <div class="structure-details"><button type="button" class="secondary" id="structure-si-example">Verify and load the official Si structure and exercise settings</button><p class="form-note">${esc("Set the wave vector in input-cell coordinates to")} ${inlineMath(siInputNotation)}${esc(", with symmetry tolerance")} ${inlineMath(String.raw`10^{-5}\,\mathrm{\AA}`)}.</p>${foldingWave?"<p class=\"form-note\" id=\"structure-si-fold-note\">The chosen phase row uses reciprocal fractional coordinates of the Si conventional cell. Verify and load the file, run the conversion, then use the BC primitive coordinates to compare the star arms and little-group order.</p>":''}<div id="structure-si-source" role="status" tabindex="-1" hidden></div></div>
    ${cifSettingPracticeHTML(cifPracticeOpen)}
    ${cifOrbitPracticeHTML(cifOrbitOpen)}
    <label class="field-label" for="structure-format">input format</label><select class="form-select" id="structure-format"><option value="poscar" ${state.format==='poscar'?'selected':''}>POSCAR / CONTCAR</option><option value="cif" ${state.format==='cif'?'selected':''}>CIF</option></select>
    <label class="field-label" for="structure-text">file content<span>can only be read in this browser</span></label><textarea id="structure-text" class="band-input structure-input" spellcheck="false" aria-label="POSCAR or CIF file content">${esc(state.text)}</textarea>
    <div class="structure-options"><div><label class="field-label" for="structure-symprec">Symmetry tolerance / Å</label><input id="structure-symprec" class="form-select" value="${esc(state.symprec)}" inputmode="decimal"></div><div><label class="field-label" for="structure-species">VASP 4 element order</label><input id="structure-species" class="form-select" value="${esc(state.species)}" placeholder="Such as Na Cl; fill in if there is no element row"></div></div>
    <details class="structure-details"><summary>More parsing options</summary><label class="field-label" for="structure-block">CIF Data block name</label><input class="form-select" id="structure-block" value="${esc(state.cifBlock)}" placeholder="Fill in when there are multiple crystal data blocks, excluding data_"><label class="field-label" for="structure-angle">Angle tolerance/degree</label><input class="form-select" id="structure-angle" value="${esc(state.angle)}"><p class="form-note">−1 means the angle tolerance is automatically determined by spglib.</p></details><label class="field-label">to be converted wavevector k<span>Reciprocity of input unit cell fractional coordinates</span></label><div class="coords">${state.k.map((v,i)=>`<div class="coord"><label for="structure-k-${i}">k<sub>${'xyz'[i]}</sub></label><input id="structure-k-${i}" aria-label="structure input k ${'xyz'[i]}" value="${esc(v)}"></div>`).join('')}</div>
    <button class="primary" id="structure-run" ${state.busy?'disabled':''}>${state.busy?"Converting…":"recognizes space group and converts to BC →"}</button><div id="structure-error" role="alert"></div>
    <p class="form-note">is suitable for three-dimensional periodic and full-occupancy structures. The identification results vary with the tolerance; CIF disorder, partial occupancy and magnetic moment information will be clearly prompted.<a href="docs/structure-bc.md" target="_blank">conversion convention and input range ↗</a></p>
  </div></section><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">02</span> BC Unit cell and coordinate transformation</div><span class="subtle">VERIFIED CONVERSION</span></div><div class="panel-body" id="structure-result"></div></section></div>`;
  const practicePanels=[
    {id:'structure-cif-practice',openKey:'cifPracticeOpen',cases:cifSettingCases,kz:'1/4',message:"The synthetic CIF is in the editor. Run the conversion manually."},
    {id:'structure-cif-orbit-practice',openKey:'cifOrbitOpen',cases:cifOrbitCases,kz:'0',message:"The quartz exercise CIF is in the editor. Run the conversion manually."}
  ].map(panel=>({...panel,element:$('#'+panel.id),status:$('#'+panel.id+'-status')}));
  const practiceButtons=practicePanels.flatMap(panel=>panel.cases.map(preset=>({
    panel,preset,button:$('#'+panel.id+'-'+preset.id)
  })));
  const redraw=()=>renderStructureView({...options,...Object.fromEntries(practicePanels.map(({openKey,element})=>[openKey,element.open]))});
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
    if(!r){target.innerHTML=`<div class="empty-state">${state.busy?"<span class=\"spinner\"></span>Identifying symmetries and verifying BC operations...":"After importing the structure, BC primitive cell , basis vector and origin transformation are displayed.<br>You can also start with the NaCl / CIF example."}</div>`;return;}
    // The result schema is shared by CPython and the browser worker.
    const cell=r.bc_primitive;
    const previousDiffractionButton=$('#structure-open-diffraction');
    const restoreDiffractionFocus=previousDiffractionButton&&globalThis.document?.activeElement===previousDiffractionButton;
    const canOpenDiffraction=typeof openDiffraction==='function';
    const diffraction=canOpenDiffraction?createStructureDiffractionHandoff(r,{
      format:state.format,filename:state.source.filename,sha256:state.handoff?.source.sha256
    }):null;
    target.innerHTML=`<div class="structure-summary"><span class="eyebrow">SPACE GROUP ${esc(r.group_number)}</span><h2>${crystalSpan(r.international,'hm')}</h2><p>${esc(r.bz_type||r.bravais)} · Hall ${esc(r.hall_number)}</p></div>
      ${state.format==='cif'?cifInputSettingHTML(r.input_metadata?.cif_symmetry_setting):''}
      <label class="sth-spin" for="structure-spin">${esc("Representation type for the workbench handoff")}<select id="structure-spin"><option value="false" ${!state.doubleValued?'selected':''}>${esc("Single-valued representation (default)")}</option><option value="true" ${state.doubleValued?'selected':''}>${esc("Double-valued representation (half-integer spin)")}</option></select></label><p class="form-note">${esc("Select the representation type explicitly; the structure file alone cannot determine SOC strength or magnetic order. Check the source and settings in the workbench, then start the calculation manually.")}</p>
      <div class="controls-row"><button class="primary small" id="structure-open-group" ${!state.handoff||state.handoffPending?'disabled':''}>${esc("Open the representation workbench with this source →")}</button><button class="text-button" id="structure-json">↓ Complete JSON</button></div>
      <div id="structure-handoff-card">${state.handoff?structureHandoffHTML(state.handoff):`<p class="sth-state ${state.handoffError?'sth-error':''}" role="status">${esc(state.handoffError||(state.handoffPending?"Computing the source fingerprint; geometry exports remain available.":"The source summary is not ready; geometry exports remain available."))}</p>`}</div>
      <div class="structure-downloads"><button class="secondary small" id="structure-poscar">↓ BC POSCAR</button><button class="secondary small" id="structure-cif">↓ BC CIF</button></div>
      ${canOpenDiffraction?`<div class="structure-details">
        <button class="secondary" type="button" id="structure-open-diffraction" aria-describedby="structure-diffraction-scope" ${diffraction?'':'disabled'}>${esc("Calculate diffraction from the input cell →")}</button>
        <p id="structure-diffraction-scope">${diffraction?"Keep the input lattice, atom order, and fractional coordinates. In the diffraction tool, choose (h,k,l) in this cell’s basis and then run the calculation.":"This transfer accepts a valid three-dimensional input cell with 1 to 128 atoms."}</p>
      </div>`:''}
      <p class="mini-heading">BC primitive cell basis vectors / Å · One basis vector per row</p>${matrix(cell.lattice)}<p class="form-note">${cell.positions.length} atoms · ${esc([...new Set(cell.species)].join(' / '))}</p>
      <p class="mini-heading">input → BC · ${inlineMath(String.raw`x_{\mathrm{BC}}=M x_{\mathrm{input}}+q`,'x_BC = M x_input + q')}</p>${matrix(r.transform.coordinate_matrix)}<p class="form-note">q = (${r.transform.origin_shift.map(fmt).join(', ')})</p>
      <div class="notice">${inlineMath(String.raw`k_{\mathrm{BC}}=(${r.k_bc.map(fmt).join(', ')})`,'k_BC = ('+r.k_bc.map(fmt).join(', ')+')')}<br><small>use M⁻ᵀ; the transformed wavevector can be sent to the workbench.</small></div>
      <div class="notice structure-verification">${r.verified?"✓ BC generator passed the verification with structural symmetry":"conversion check failed, please check complete JSON."}</div>
      ${(r.warnings||[]).map(w=>`<div class="notice warning">${esc(structureDiagnosticText(w))}</div>`).join('')}
      <details class="structure-details"><summary>View atom fractional coordinates</summary><div class="table-wrap"><table><thead><tr><th>element</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>${cell.positions.map((p,i)=>`<tr><td>${esc(cell.species[i])}</td>${p.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <details class="structure-details"><summary>More unit cell exports</summary><p class="form-note">is not idealized BC unit cell retains the actual lattice of the input; ITA conventional cell uses international table settings, unlike BC primitive cell .</p><div class="controls-row"><button class="secondary small" id="structure-unidealized">↓ Not idealized BC POSCAR</button><button class="secondary small" id="structure-standard">↓ ITA conventional cell POSCAR</button></div></details><details class="structure-details"><summary>Verification and idealization records</summary><pre class="structure-json">${esc(JSON.stringify(r.verification,null,2))}</pre></details>`;
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
  const hasSiSource=()=>state.format==='poscar'&&state.source.kind==='teaching-example'&&state.source.filename===siExample.filename;
  const hasSiProbe=()=>{
    try{return !state.species.trim()&&!state.cifBlock.trim()&&number(state.symprec)===1e-5&&number(state.angle)===-1&&state.k.every((value,index)=>number(value)===[.5,0,0][index]);}
    catch{return false;}
  };
  function drawSiStatus(){
    if(!current()||$('#structure-si-example')!==siButton)return;
    siButton.disabled=state.busy||state.fileLoading||!!siLoad;
    if(siLoad){siStatus.textContent="Reading and verifying the original official Si file…";siStatus.hidden=false;return;}
    if(siLoadError){siStatus.innerHTML=`<p class="notice error" role="alert">${esc(siLoadError)}</p>`;siStatus.hidden=false;return;}
    siStatus.hidden=!hasSiSource();
    siStatus.innerHTML=hasSiSource()?`<p class="notice">${esc("The original official Si file is verified. Check the wave vector and tolerance, then identify the space group.")}</p>${hasSiProbe()?`<p class="form-note">${state.result?.verified?esc("In the workbench, try entering the original three numbers. Compare the star-arm counts and little-group orders from both calculations."):esc("Make a prediction. In the BC primitive cell, will the same wave vector have the same three coordinates?")}</p>`:''}<p><a href="docs/si-structure-example.md">Original Si file, conversion, and wave vector comparison →</a></p>`:'';
  }
  function releaseSiLoad(request){
    request.observer?.disconnect();
    clearTimeout(request.timer);
    if(siLoad===request)siLoad=null;
  }
  function interruptSiLoad(){
    if(siLoad){const request=siLoad;releaseSiLoad(request);request.controller.abort();}
    siLoadError='';
    drawSiStatus();
  }
  siButton.onclick=async()=>{
    if(!current()||$('#structure-si-example')!==siButton||state.busy||state.fileLoading||siLoad)return;
    const request={controller:new AbortController(),observer:null,timer:null};
    siLoad=request;siLoadError='';
    const owns=()=>current()&&container.isConnected!==false&&$('#structure-si-example')===siButton&&siLoad===request;
    if(typeof MutationObserver==='function'){
      request.observer=new MutationObserver(()=>{if(!owns()){releaseSiLoad(request);request.controller.abort();}});
      request.observer.observe(container.ownerDocument?.documentElement||container,{childList:true,subtree:true});
    }
    request.timer=setTimeout(()=>request.controller.abort(),15000);
    drawSiStatus();
    try{
      const text=await readOfficialSiExample(request.controller.signal);
      if(!owns()||request.controller.signal.aborted)return;
      releaseSiLoad(request);
      state.fileTicket++;
      Object.assign(state,{text,format:'poscar',species:'',cifBlock:'',symprec:'0.00001',angle:'-1',k:siInputCoordinates.slice(),source:{kind:'teaching-example',filename:siExample.filename},sourceBytes:null,doubleValued:false});
      invalid();
      redraw();
      $('#structure-si-source')?.focus({preventScroll:true});
    }catch(error){
      if(owns())siLoadError=request.controller.signal.aborted?"The official Si example took too long to load. Please try again.":error.message;
    }finally{
      const active=owns();
      releaseSiLoad(request);
      if(active)drawSiStatus();
    }
  };
  const setDisabled=()=>{$('#structure-run').disabled=state.busy||state.fileLoading;container.querySelectorAll('input,textarea,select,#structure-poscar-example,#structure-cif-example').forEach(el=>el.disabled=state.busy||state.fileLoading);$('#structure-file').disabled=state.busy;$('#structure-poscar-example').disabled=state.busy;$('#structure-cif-example').disabled=state.busy;practiceButtons.forEach(({button})=>button.disabled=state.busy||state.fileLoading);$('#structure-file-cancel').hidden=!state.fileLoading;$('#structure-file-cancel').disabled=state.busy;drawSiStatus();};
  $('#structure-file-cancel').onclick=()=>{if(!current()||state.busy||!state.fileLoading)return;state.fileTicket++;state.fileLoading=false;invalid();$('#structure-file').value='';state.refresh?.();toast("File reading canceled; the current structure text was retained.");};
  $('#structure-text').oninput=e=>{state.fileTicket++;state.fileLoading=false;state.text=e.target.value;state.source={kind:'user-text',filename:''};state.sourceBytes=null;interruptSiLoad();invalid();};
  $('#structure-format').onchange=e=>{state.format=e.target.value;interruptSiLoad();invalid();};
  $('#structure-symprec').oninput=e=>{state.symprec=e.target.value;interruptSiLoad();invalid();};
  $('#structure-species').oninput=e=>{state.species=e.target.value;interruptSiLoad();invalid();};
  $('#structure-block').oninput=e=>{state.cifBlock=e.target.value;interruptSiLoad();invalid();};
  $('#structure-angle').oninput=e=>{state.angle=e.target.value;interruptSiLoad();invalid();};
  state.k.forEach((_,i)=>{$('#structure-k-'+i).oninput=e=>{state.k[i]=e.target.value;interruptSiLoad();invalid();};});
  const useExample=(text,format,filename=format==='cif'?'CsCl_example.cif':'NaCl_example.POSCAR')=>{if(!current())return;interruptSiLoad();state.fileTicket++;state.fileLoading=false;state.text=text;state.format=format;state.species='';state.cifBlock='';state.source={kind:'teaching-example',filename};state.sourceBytes=null;state.doubleValued=false;invalid();redraw();};
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
    const file=e.target.files[0];if(!file)return;interruptSiLoad();
    const fileTicket=++state.fileTicket;state.fileLoading=true;invalid();state.refresh?.();
    try{
      if(file.size>4_000_000)throw Error("Structure file cannot exceed 4 MB.");
      const bytes=typeof file.arrayBuffer==='function'?new Uint8Array(await file.arrayBuffer()):null;if(fileTicket!==state.fileTicket)return;
      const text=await file.text();if(fileTicket!==state.fileTicket)return;
      state.text=text;state.format=file.name.toLowerCase().endsWith('.cif')||/^\s*data_/im.test(text)?'cif':'poscar';state.species='';state.cifBlock='';state.source={kind:'user-file',filename:file.name};state.sourceBytes=bytes;state.doubleValued=false;invalid();
      if(current()){redraw();toast("has been read locally "+file.name);}
    }catch(error){if(fileTicket===state.fileTicket)state.error=error.message;}
    finally{if(fileTicket===state.fileTicket){state.fileLoading=false;if(current())$('#structure-file').value='';state.refresh?.();}}
  };
  $('#structure-run').onclick=async()=>{
    if(!current()||state.busy||state.fileLoading)return;
    interruptSiLoad();
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
    }catch(error){
      if(inputVersion===state.inputVersion){
        state.error=structureDiagnosticText(error.message);
      }
    }
    finally{state.busy=false;state.refresh?.();}
  };
  state.refresh=()=>{if(current()){setDisabled();$('#structure-run').textContent=state.fileLoading?"Reading file...":state.busy?"Converting…":"recognizes space group and converts to BC →";drawResult();}};
  state.refresh();
}
