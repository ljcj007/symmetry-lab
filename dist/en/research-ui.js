// Presentation only. All model, group and topology calculations run in Python.
import {GRAPHENE_REFERENCE, fetchGrapheneSources, verifyGrapheneSources} from './wannier-graphene-source.js?v=20261120-wannier1';
import {magneticTBExamples,isMagneticTBPreset} from './magnetictb-presets.js?v=20261122-tb-presets1';

import {affineComparisonHTML,handednessExample,handednessExerciseHTML,quartzHandednessExample,quartzHandednessHTML} from './crystkit-handedness-ui.js?v=20261120-quartz-hand1';
import {pMinusOneOriginResultHTML,pMinusOnePracticeFromRoute,pMinusOnePracticeHTML,pMinusOnePracticeInput} from './pminus1-practice.js?v=20261122-pminus1-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=value=>JSON.stringify(value,null,2);
const states={magnetictb:{text:'',result:null,model:null,busy:false,revision:0},crystkit:{text:pretty({action:'analyze',group_number:19,point:['1/7','2/7','3/7']}),result:null,busy:false,revision:0}};
const researchRenderers=new WeakMap();
const examples={magnetictb:magneticTBExamples,crystkit:[['space-group',"space group 19 · Precise operation"],['finite-orders',"GL(n,ℤ) · Finite order"],['simplify',"Rational number base·Translational lattice simplification"],['conjugacy',"matrix group conjugate"],['normalizer-orbit',"gives the translation system orbit of normalizer"]]};
const number=value=>typeof value==='number'?Number(value.toPrecision(7)).toString():String(value??'—');
const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const cards=items=>`<div class="stats">${items.map(([label,value])=>`<div class="stat"><div class="stat-label">${esc(label)}</div><strong>${esc(number(value))}</strong></div>`).join('')}</div>`;
function writeResearchInput(state,payload,{preserveModel=false,graphene=null,preset=null}={}){
 state.revision++;
 Object.assign(state,{text:payload===undefined?'':pretty(payload),result:null,error:null,graphene,preset});
 if(!preserveModel)state.model=null;
}
export function setResearchInput(view,payload){const state=states[view];if(!state)throw new Error("Unknown research tool");writeResearchInput(state,payload);}
export function getResearchResult(view){return states[view]?.result;}

function grapheneStatus(evidence){
 return evidence
  ?"Loaded the original lattice and band path. Run the Python calculation."
  :"Loading replaces the current JSON. Save a copy of your draft if you need it.";
}

function grapheneSourcePanel(s){
 const {hr,settings,repository}=GRAPHENE_REFERENCE;
 return `<details id="graphene-source" class="graphene-source" ${s.grapheneOpen?'open':''}>
  <summary>Verify and load the original graphene files</summary>
  <p>Reproduce the bands using two original files from the WannierTools example. The lattice vectors are in Å. The M–K–Γ–M path uses fractional coordinates in that lattice’s reciprocal basis.</p>
  <div class="graphene-actions">
   <button type="button" class="secondary" id="graphene-download-pair">Download and load both files from WannierTools</button>
   <button type="button" class="secondary" id="graphene-cancel" hidden>Cancel loading</button>
  </div>
  <p id="graphene-source-status" role="status">${grapheneStatus(s.graphene)}</p>
  <p id="graphene-source-error" class="notice error" role="alert" hidden></p>
  <details class="graphene-local">
   <summary>Choose both matching files from your device</summary>
   <p>Save the originals from the links below and select each file without editing it.</p>
   <div class="graphene-files">
    <label for="graphene-local-hr"><code>${hr.fileName}</code><input id="graphene-local-hr" type="file" accept=".dat,.txt"></label>
    <label for="graphene-local-settings"><code>${settings.fileName}</code><input id="graphene-local-settings" type="file" accept=".in-bands,.txt"></label>
   </div>
   <button type="button" class="secondary" id="graphene-verify-local" disabled>Verify and load the local files</button>
  </details>
  <ul class="graphene-source-links">
   <li><a href="${esc(hr.rawURL)}" target="_blank" rel="noopener"><code>${hr.fileName}</code></a></li>
   <li><a href="${esc(settings.rawURL)}" target="_blank" rel="noopener"><code>${settings.fileName}</code></a></li>
   <li><a href="${esc(repository+'/tree/'+GRAPHENE_REFERENCE.commit+'/examples/Graphene')}" target="_blank" rel="noopener">WannierTools folder at the pinned commit</a></li>
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
  status.textContent="Reading and verifying both files…";
  updateControls();
  const canApply=()=>active&&current()&&pending===request&&!request.signal.aborted&&s.revision===revision;
  try{
   const verified=await readPair(request.signal);
   if(canApply())onApply(verified);
  }catch{
   if(canApply()){
    error.textContent="Could not verify the file pair. Check the originals at the pinned commit or retry with local files.";
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
  <h3 id="graphene-k-heading">Two-band splitting at K on the original path</h3>
  <p><var>k</var> = (${esc(k.join(', '))}) <span>(fractional reciprocal coordinates)</span></p>
  <dl>
   <div><dt><var>E</var><sub>1</sub></dt><dd>${lower.toFixed(8)} eV</dd></div>
   <div><dt><var>E</var><sub>2</sub></dt><dd>${upper.toFixed(8)} eV</dd></div>
   <div><dt><var>E</var><sub>2</sub> − <var>E</var><sub>1</sub></dt><dd><strong>${split.toFixed(5)} meV</strong></dd></div>
  </dl>
  <p>Energies use the input file’s zero. The difference comes from the two bands at the K point marked on the path. When comparing it with the ideal model’s degeneracy prediction, check the coordinates, symmetries, and model.</p>
  <a href="#classroom/crystal?module=bands&amp;tab=learn&amp;lesson=band-crossing">Return to the lesson to interpret the K-point result</a>
 </section>`;
}

function bandPlot(bands,energyInEV=false){
 if(!bands?.energies?.length)return '';
 const energies=bands.energies,dist=bands.distance||energies.map((_,i)=>i),values=energies.flat().filter(Number.isFinite);
 if(!values.length)return '';
 let lo=Infinity,hi=-Infinity;for(const v of values){lo=Math.min(lo,v);hi=Math.max(hi,v);}const pad=Math.max((hi-lo)*.09,.1);lo-=pad;hi+=pad;
 const left=100,right=724,width=right-left,xmax=dist.at(-1)||1;
 const x=v=>left+v/xmax*width,y=v=>300-(v-lo)/(hi-lo)*260;
 const ticks=bands.ticks||[],axis=energyInEV?"Energy / eV":"Energy/input parameter unit";
 return `<div class="band-chart"><svg viewBox="0 0 760 350" role="img" aria-label="Tight binding energy band calculated along input wavevector path"><title>Python Calculated energy band, the energy unit is the same as the transition parameter</title><rect x="${left}" y="40" width="${width}" height="260" fill="#f7faf8"/>${Array.from({length:5},(_,i)=>{const v=lo+(hi-lo)*i/4;return `<path d="M${left} ${y(v)}H${right}" stroke="#dfe8e2"/><text x="${left-10}" y="${y(v)+5}" text-anchor="end">${esc(number(v))}</text>`}).join('')}${ticks.map(t=>`<path d="M${x(t.distance??dist[t.index])} 40V300" stroke="#cbdad1" stroke-dasharray="4 4"/><text x="${x(t.distance??dist[t.index])}" y="325" text-anchor="middle">${esc(t.label)}</text>`).join('')}${energies[0].map((_,j)=>`<polyline points="${energies.map((e,i)=>`${x(dist[i]).toFixed(2)},${y(e[j]).toFixed(2)}`).join(' ')}" fill="none" stroke="${['#23785f','#c78943','#5777a1','#a56887'][j%4]}" stroke-width="1.7"/>`).join('')}<path d="M${left} 40V300H${right}" fill="none" stroke="#7d9587"/><text x="${left}" y="24">${esc(axis)}</text></svg></div>`;
}
function results(view,s){
 if(!s.result)return `<div class="empty-state">${s.busy?"Python Calculating…":"Load the example or edit the input, then run Python."}</div>`;
 const r=s.result;
 if(view==='magnetictb')return `${cards(r.model?[["model track number",r.model.orbital_count],["independent real parameters",r.model.parameter_count??"import model"],["wavevector Number of samples",r.bands?.energies?.length??'—']]:r.chern!==undefined?[["Chern number",r.chern],["Minimum direct band gap",r.minimum_direct_gap],["grid",`${r.mesh} × ${r.mesh}`]]:r.berry_phase!==undefined?[["Berry phase / rad",r.berry_phase],["Minimum direct band gap",r.minimum_direct_gap],["Wilson phase number",r.phases?.length]]:[["wavevector Number of samples",r.bands?.energies?.length??r.spectrum?.length??'—'],["Number of film layers",r.layers??'—'],["Open direction",r.open_axis!==undefined?['a₁','a₂','a₃'][r.open_axis]:'—']])}${bandPlot(r.bands,Boolean(s.graphene))}${grapheneDiagnostic(r.bands,s.graphene)}${r.parameters?.length?`<details open><summary>Adjust hopping parameters</summary><p class="form-note">parameter basis results from symmetry constraints; view the actual transition matrix for each term on the basis in JSON.</p><div class="parameter-grid">${r.parameters.map(p=>`<label>${esc(p.name)} <small>shell ${esc(p.shell)}</small><input type="number" step="any" data-parameter="${esc(p.name)}" value="${esc(p.value)}"></label>`).join('')}</div><button class="secondary small" data-apply-parameters>Recalculate with new parameters</button></details>`:''}${r.spectrum?table(["Energy","surface spectrum weight"],r.spectrum.map(x=>[number(x.energy),number(x.spectral_weight)])):''}${r.phases?table(["Wilson Phase / rad","Wannier Center"],r.phases.map((x,i)=>[number(x),number(r.wannier_centers?.[i])])):''}${r.diagnostics?`<details open><summary>numerical verification</summary>${table(["check item","Result"],Object.entries(r.diagnostics).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):number(v)]))}</details>`:''}${r.convention?`<p class="notice">${esc(r.convention)}</p>`:''}<details><summary>Complete results and model matrix</summary><pre class="json-output">${esc(pretty(r))}</pre></details>`;
 return `${affineComparisonHTML(r,s.lastPayload,{cards,table})}${r.quotient?cards([["Order of the finite quotient by translations",r.quotient.order],["Point-group order",r.pointGroupOrder],["quotient group generator Number",r.quotient.minimumGeneratorCount]]):r.allowedElementOrders?cards([["matrix dimension",r.dimension],["allowed order types",r.allowedElementOrders.length],["The first type of order",r.newElementOrders.length]]):''}${r.identification?`<p class="notice">space group Identification:${r.identification.matches?.length?r.identification.matches.map(m=>`${esc(m.number)} · ${esc(m.symbol)}`).join('；'):"No verifiable match found in current search range"}<br>status:${esc(r.identification.status)}. Only matches verified by the complete set of operations are reported.</p>`:''}${r.quotient?table(["group properties","Result"],[["exchange group",r.quotient.abelian?"yes":"no"],["can solve the group",r.quotient.solvable?"yes":"no"],["Orders in the derived series",r.quotient.derivedSeriesOrders.join(' → ')],["Invariant metric verification",r.gramInvariantVerified?"passes":"failed"]]):''}${r.orbit?`<details open><summary>point orbit · ${r.orbit.multiplicity} equivalent points</summary><p class="form-note">${"Stabilizer order"} ${r.orbit.stabilizerOrder} · ${r.orbit.orbitStabilizerVerified?"Orbit–stabilizer relation verified.":"Orbit–stabilizer relation not verified."}</p>${table(["serial number",'x','y','z'],r.orbit.points.map((p,i)=>[i+1,...p]))}</details>`:''}${r.allowedElementOrders?table(["Category","Element order"],[["All dimensions are allowed",r.allowedElementOrders.join(', ')],["first appears in this dimension",r.newElementOrders.join(', ')||"None"]]):''}${r.status&&r.action!=='compare'?`<p class="notice">Verification status:${esc(r.status)}${r.identityVerified?" · Conjugate identity verified":''}${r.reason?' · '+esc(r.reason):''}</p>`:''}<details ${r.quotient?'':'open'}><summary>complete accurate results and matrix</summary><pre class="json-output">${esc(pretty(r))}</pre></details>`;
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
 container.innerHTML=`<div class="notice research-intro">${tb?"Build a tight-binding model from atomic positions, orbitals, and symmetry operations, or import a Wannier90 hr file. Choose an example and run it in your browser using Python. After loading a built-in example, copy the address to reopen the same inputs.":"Perform exact rational number operations on crystal groups. You can directly use the 230 space group on this site, or enter a custom generator ; space group recognition only reports verified matches."}</div>${tb?'':pMinusOnePracticeHTML(pMinusOnePractice)+handednessExerciseHTML(handednessOpen)+quartzHandednessHTML(quartzHandednessOpen)}<div class="research-grid"><section class="panel"><div class="panel-top"><div class="panel-title"><span class="step">01</span> ${tb?"model and calculation input":"crystal group and calculation input"}</div><span class="badge">Python</span></div><div class="panel-body"><label class="field-label" for="research-example">Quick Example</label><div class="controls-row"><select id="research-example" aria-label="Select calculation example">${examples[view].map(([key,label])=>`<option value="${key}" ${s.example===key?'selected':''}>${label}</option>`).join('')}</select><button id="load-research-example" class="secondary small">loading example</button></div>${!tb?`<div class="controls-row"><label for="cryst-number">space group No.</label><input id="cryst-number" type="number" min="1" max="230" value="${context.mode==='sg'?context.group.number:19}"><button class="secondary small" id="cryst-use-number">use this group</button></div>`:`<div class="controls-row"><button class="secondary small" id="tb-use-operations">Use workbench group operation</button><label class="secondary small file-label">Import hr file<input type="file" id="tb-hr-file" accept=".dat,.txt" hidden></label></div>${grapheneSourcePanel(s)}`}<label class="field-label" for="research-json">${tb?"Lattice, orbitals, symmetries, and k-paths":"Operations, coordinate changes and analysis"}<span>editable JSON</span></label><textarea class="band-input research-input" id="research-json" spellcheck="false" aria-label="Python Calculation input JSON">${esc(s.text)}</textarea><details class="input-help"><summary>Input conventions and available calculations</summary><p>${tb?"lattice is a real-space lattice vector; position, translation and k are all fractional coordinates . Orbitals are available in s, px/py/pz or full real d basis. The operations must form a complete finite group, and the rotation acts on the fractional coordinates column vector.":"Use rotation and translation in operations or generators. Write fractions as strings such as \"1/2\". The coordinate convention is x_old = basis × x_new + origin. Enter point in the new coordinates. For a group number, the old coordinates use the BC setting."}</p><p>${tb?"action optional model, bands, slab, finite, surface, topology. The parameter units are specified by you, and the energy plot uses the same units. The Fourier phase convention for a non-zero transition is exp(+2πi k·R).":"action optional analyze, finite_orders, conjugacy, blocks, simplify, normalizer_orbit or compare. Finite-order algorithms distinguish between the first occurrence of a dimension and all allowed orders of that dimension."}</p><a href="../python/${tb?'magnetictb_browser':'crystkit_browser'}.py" download>Download the tool Python source code ↓</a></details><button id="run-research" class="primary" ${s.busy?'disabled':''}>${s.busy?"<i class=\"spinner\"></i>Python Calculating…":"Run Python calculation →"}</button><div id="research-error" role="alert">${s.error?`<p class="notice error">${esc(s.error)}</p>`:''}</div></div></section><section class="panel"><div class="result-header"><div class="result-heading">${tb?"model and energy band":"precise group analysis"}<small>calculation results</small></div><div class="result-tools"><button id="research-export" class="text-button">↓ JSON</button>${tb?'<button id="tb-csv" class="text-button">↓ CSV</button><button id="tb-hr" class="text-button">↓ hr</button>':''}</div></div><div class="result-content">${pMinusOnePractice==='origin'?pMinusOneOriginResultHTML(s.result,s.lastPayload):''}${results(view,s)}</div></section></div>${tb?`<section class="panel research-followup"><div class="panel-top"><div class="panel-title"><span class="step">02</span> Continue calculation with current model</div></div><div class="panel-body"><div class="controls-row"><label>occupied band number <input id="tb-occupied" type="number" min="1" value="1"></label><label>grid <input id="tb-mesh" type="number" min="5" max="101" value="21"></label><label>layer number <input id="tb-layers" type="number" min="1" max="80" value="12"></label><label>Open direction <select id="tb-axis"><option value="0">a₁</option><option value="1">a₂</option><option value="2">a₃</option></select></label></div><div class="controls-row"><button data-post="slab" class="secondary small">thin film energy band</button><button data-post="chern" class="secondary small">Chern number · k₁k₂ surface</button><button data-post="wilson" class="secondary small">Wilson Ring · k₁</button><button data-post="surface" class="secondary small">surface spectrum · k = 0</button></div><p class="form-note">These buttons write the current model and parameters into the left input box; they can be run after adjustment. The Chern number requires a direct band gap in the occupied subspace and convergence should be checked using a denser mesh. Surface spectrum uses specified open direction with η = 0.02.</p></div></section>`:''}<p class="notice research-scope">${tb?"covers: symmetry constrained modeling, s/p/d and spin-orbitals, energy bands, hr, membranes, finite systems, surface Green functions, Berry/Wilson and Chern numbers. Exact symbolic Hamiltonians, cyclotomic field , and polynomial orbitals can be computed in \"Exact Algebra and High-Dimensional Groups\". The complete spin space group catalog, DFT fitting and the Z₂ algorithm are still not covered.":"covers: exact affine closure and coordinate transformations, finite quotient group generator , point orbit , matrix conjugate and three-dimensional reference database matching. CARAT 1–6 dimensional Q-type catalog, group expansion, specific complete normalizer and infinite group generation certificates have been accessed in \"Exact Algebra and High-Dimensional Groups\". General Z classifications still have scope restrictions."}<a href="#" data-view="advanced"> Open exact algebra and high-dimensional groups →</a></p>`;
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
  container.querySelector('.result-content').innerHTML="<div class=\"empty-state\">The input has been modified, please rerun the calculation.</div>";
 };
 $('#research-example').onchange=e=>{s.example=e.target.value;if(!tb)s.revision++;grapheneWidget?.cancel();};
 async function loadExample(key,{preset=null,reportPreset=false}={}){
  if(!current()||!examples[view].some(([id])=>id===key))return;
  grapheneWidget?.cancel();
  s.example=key;
  const revision=++s.revision;
  try{
   const response=await fetch(`examples/${view}-${key}.json`);
   if(!response.ok)throw new Error("sample reading failed");
   const payload=await response.json();
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error("sample reading failed");
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
  try{const payload=JSON.parse(s.text);if(!payload||Array.isArray(payload)||typeof payload!=='object')throw new Error("input must be a JSON object.");s.busy=true;s.error=null;s.result=null;draw();const result=await run(view,payload);if(s.revision!==submitted)return;s.result=result;s.lastPayload=payload;if(result.model)s.model=result.model;else if(payload.model)s.model=payload.model;}
  catch(e){if(s.revision===submitted)s.error=e.message;}
  finally{
   s.busy=false;
   const mounted=researchRenderers.get(container);
   if(mounted?.view===view)mounted.draw();
  }
 }
 $('#run-research').onclick=calculate;
 $('#research-export').onclick=()=>s.result?download(pretty(s.result),`${view}-result.json`):toast("Please run the calculation first.");
 container.querySelectorAll('[data-parameter]').forEach(input=>input.disabled=s.busy);
 if(tb){
  grapheneWidget=bindGrapheneSource({container,s,current,onApply:({payload})=>{
   s.grapheneOpen=true;
   setInput(payload,{graphene:{k:payload.path.find(point=>point.label==='K').k}});
   $('#run-research').focus?.();
  }});
  $('#tb-use-operations').onclick=()=>{try{const payload=JSON.parse(s.text||'{}');payload.operations=context.group.operations;setInput(payload);toast("The group operation has been copied, please confirm that the model lattice and site are using the same BC settings.");}catch(e){toast(e.message);}};
  $('#tb-hr-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;grapheneWidget.cancel();const revision=++s.revision;if(file.size>10*1024*1024){toast("hr files cannot exceed 10 MiB.");return;}const hrText=await file.text();if(s.revision!==revision||!current())return;setInput({action:'hr_import',hr_text:hrText,path:[{label:'Γ',k:[0,0,0]},{label:'X',k:[.5,0,0]}],points_per_segment:60});};
  $('#tb-hr').onclick=()=>s.result?.hr_text?download(s.result.hr_text,'symmetry-lab_hr.dat','text/plain'):toast("Please generate or import the model first.");
  $('#tb-csv').onclick=()=>{const b=s.result?.bands;if(!b){toast("currently has no data to carry.");return;}download(['kx,ky,kz,distance,'+b.energies[0].map((_,i)=>`band_${i+1}`).join(','),...b.energies.map((e,i)=>[...(b.kpoints[i]),b.distance[i],...e].join(','))].join('\n'),'tight-binding-bands.csv','text/csv');};
  $('[data-apply-parameters]')?.addEventListener('click',()=>{const inputs=[...container.querySelectorAll('[data-parameter]')];if(inputs.some(i=>!i.value.trim()||!i.validity.valid||!Number.isFinite(Number(i.value)))){toast("Each transition parameter must fill in a finite value.");return;}const payload=structuredClone(s.lastPayload);payload.parameters=Object.fromEntries(inputs.map(i=>[i.dataset.parameter,Number(i.value)]));writeResearchInput(s,payload);onPresetChange(null,false);calculate();});
  container.querySelectorAll('[data-post]').forEach(button=>button.onclick=()=>{
   if(!s.model){toast("Please generate or import a model first.");return;}
   const action=button.dataset.post,axis=Number($('#tb-axis').value),occupied=Number($('#tb-occupied').value);
   const payload={action:['chern','wilson'].includes(action)?'topology':action,model:s.model};
   if(action==='chern')Object.assign(payload,{method:'chern',occupied,mesh:Number($('#tb-mesh').value),axes:[0,1],fixed_k:[0,0,0]});
   if(action==='wilson')Object.assign(payload,{method:'wilson',occupied,path:[{label:'Γ',k:[0,0,0]},{label:'Γ + G₁',k:[1,0,0]}],points_per_segment:101});
   if(action==='slab'){const end=[0,0,0];end[(axis+1)%3]=.5;Object.assign(payload,{open_axis:axis,layers:Number($('#tb-layers').value),path:[{label:'Γ',k:[0,0,0]},{label:'X',k:end}],points_per_segment:60});}
   if(action==='surface')Object.assign(payload,{open_axis:axis,k:[0,0,0],energies:Array.from({length:81},(_,i)=>-4+i*.1),eta:.02});
   setInput(payload,{preserveModel:true});toast("has been written into the calculation input, click to run.");
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
