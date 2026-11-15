import {mathHTML} from './math-display.js?v=20261113-prose2';
import {LAYER_ACTIONS_REFERENCE} from './layer-actions-reference.js?v=20261115-actions1';

// Finite coordinate arithmetic for two real 001 slab references. Enumeration,
// arbitrary structures and classification remain the existing Python tools.
export const LAYER_ACTIONS_BRIDGE_HOOKS=Object.freeze({'layer-periodicity':Object.freeze(['atom-layer-map'])});
export {LAYER_ACTIONS_REFERENCE};
const OPS=Object.freeze({
 mirror:{label:"Normal-reversing mirror: z → −z",matrix:[[1,0,0],[0,1,0],[0,0,-1]]},
 identity:{label:"Identity operation",matrix:[[1,0,0],[0,1,0],[0,0,1]]},
 quarter:{label:"90° rotation about the normal",matrix:[[0,-1,0],[1,0,0],[0,0,1]]},
 inversion:{label:"Inversion: r → −r",matrix:[[-1,0,0],[0,-1,0],[0,0,-1]]}
});
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const fmt=x=>Math.abs(x)<1e-10?'0':String(Number(x.toFixed(7)));
const vec=x=>'('+x.map(fmt).join(', ')+')';
const matrix=x=>'\\begin{pmatrix}'+x.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const column=x=>'\\begin{pmatrix}'+x.map(fmt).join('\\\\')+'\\end{pmatrix}';
const formula=x=>'<div class="lyab-formula" tabindex="0">'+mathHTML(x,true)+'</div>';
const table=(caption,heads,rows)=>'<div class="lyab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,j)=>j?'<td>'+esc(v)+'</td>':'<th scope="row">'+esc(v)+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const p=text=>'<p>'+esc(text)+'</p>';
const bool=value=>value?"passes":"fails";

/** Only the stated finite 001 reference is accepted. A full in-plane lattice
 * vector changes the representative, not the affine coset or permutation.
 * The normal coordinate is Cartesian in units a0 and is never reduced.
 */
export function layerActionReference({caseId='symmetric',operation='mirror',planeShift=0}={}){
 if(!Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,caseId)||!Object.hasOwn(OPS,operation)||![0,1].includes(planeShift))throw Error('The layer action card supports only its finite 001 reference.');
 const reference=LAYER_ACTIONS_REFERENCE.cases[caseId],symmetric=LAYER_ACTIONS_REFERENCE.cases.symmetric;
 const source=symmetric.operations.find(op=>same(op.matrix,OPS[operation].matrix));
 if(!source)throw Error('The stated operation is missing from the real API reference.');
 const translation=add(source.translation,[planeShift,0,0]);
 const rows=reference.positions.map((position,i)=>{
  const transformed=add(mv(source.matrix,position),translation);
  // Four explicitly supported sites; verify a unique geometric destination.
  const matches=reference.positions.map((target,j)=>{
   const delta=transformed.map((x,k)=>x-target[k]),wrap=[Math.round(delta[0]),Math.round(delta[1])];
   const residual=[delta[0]-wrap[0],delta[1]-wrap[1],delta[2]];
   return{j,target,wrap,normalDifference:delta[2],distance:Math.hypot(...residual)};
  }).filter(match=>match.distance<1e-8);
  if(matches.length!==1)throw Error('The bounded operation must have one geometric destination per site.');
  const match=matches[0];
  return{i,position:clone(position),transformed,...match,label:reference.labels[i],targetLabel:reference.labels[match.j],labelMatch:reference.labels[i]===reference.labels[match.j]};
 });
 const permutation=rows.map(row=>row.j),bijective=new Set(permutation).size===4;
 const retained=reference.operations.some(op=>same(op.matrix,source.matrix)&&same(op.translation,source.translation));
 return{caseId,operation,planeShift,matrix:clone(source.matrix),translation,baseTranslation:clone(source.translation),
  actualOperationIndex:symmetric.operations.indexOf(source),rows,permutation,bijective,
  geometryMatch:bijective&&rows.every(row=>row.distance<1e-8),labelMatch:bijective&&rows.every(row=>row.labelMatch),
  retained,operationCount:reference.operationCount,normalFlipCount:reference.normalFlipCount,
  lattice:clone(reference.lattice),normal:clone(reference.normal),lengthUnit:LAYER_ACTIONS_REFERENCE.lengthUnit};
}

/** Deliberately invalid normal translation: it is not an accepted operation.
 * Comparing to the same site exposes the spurious result of imposing a 4a0
 * normal period. No vacuum length is inferred from this finite slab.
 */
export function layerNormalBoundaryCounterexample(){
 const positions=LAYER_ACTIONS_REFERENCE.cases.symmetric.positions;
 return{translation:[0,0,4],incorrectNormalPeriod:4,correctAccepted:false,incorrectAccepted:true,
  rows:positions.map((position,i)=>({i,j:i,position:clone(position),transformed:add(position,[0,0,4]),
   planeWrap:[0,0],normalDifference:4,incorrectWrappedNormalDifference:0}))};
}
export function layerActionsLabRequest({caseId='symmetric'}={}){
 if(!Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,caseId))throw Error('Unsupported fixed slab case.');
 return{action:'layer_symmetry_lab',module:'layers',input:clone(LAYER_ACTIONS_REFERENCE.cases[caseId].input)};
}

const questions=[
 {prompt:"Does adding one whole in-plane lattice vector a₁ to the mirror's translation representative change the four-site permutation?",answer:'same',options:[['same',"No; only the integer in-plane translation changes"],['different',"Yes, because the coordinate values change"],['normal',"The normal must also be reduced modulo a period"]],feedback:{same:"Correct. a₁=(1,0,0)a₀ is an in-plane lattice vector. Rr+t+a₁ matches the same j; the integer in-plane translation increases by (1,0), while the normal difference stays unchanged.",different:"The slab is compared modulo its in-plane lattice translations. Adding a₁ changes the coordinates, but each atom still matches the same j.",normal:"The two in-plane periodic directions already absorb a₁. The normal has a finite boundary and must remain unwrapped."}},
 {prompt:"Does the z mirror survive when only the top layer receives the surface-C label?",answer:'labels',options:[['labels',"No: geometric matching exists, but the endpoint labels differ"],['geometry',"Yes: the four positions still match one to one"],['counts',"Yes: the total atom count is unchanged"]],feedback:{labels:"Correct. The permutation remains [3,2,1,0], but A and surface-C exchange endpoints. Geometric matching passes; label-preserving matching fails. The 8 normal-reversing operations are excluded.",geometry:"A position bijection is necessary, but the element or specified label must also be preserved. The mirror sends the bottom A site to the top surface-C site.",counts:"An unchanged atom count cannot replace a label-preserving atom-by-atom bijection. Here the label breaks the exchange of the two surfaces."}},
 {prompt:"After translating the entire slab by 4a₀ along the normal, may we declare it a symmetry by imposing a normal period of 4a₀?",answer:'finite',options:[['finite',"No; the unwrapped normal difference remains 4a₀"],['periodic',"Yes; reducing modulo 4a₀ gives zero distance"],['even',"Yes; this slab has an even number of layers"]],feedback:{finite:"Correct. The normal direction is finite. The value 4a₀ deliberately exposes the wrong rule; it is neither an intrinsic slab period nor a vacuum thickness.",periodic:"This would replace the finite slab with a three-dimensional repeating model and invent a translation symmetry. Correct matching retains the normal difference of 4a₀.",even:"Layer parity does not create a normal translation period. The four-layer slab still has top and bottom boundaries, so its normal coordinate cannot be wrapped."}}
];
const initial=()=>({open:false,normalOpen:false,caseId:'symmetric',operation:'mirror',planeShift:0,atom:0,step:0,normalMode:'correct',choices:['','',''],checked:[false,false,false],note:'',copyOutcome:''});
function restore(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const field of ['open','normalOpen'])if(typeof saved[field]==='boolean')state[field]=saved[field];
 if(Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,saved.caseId))state.caseId=saved.caseId;
 if(Object.hasOwn(OPS,saved.operation))state.operation=saved.operation;
 for(const field of ['planeShift','atom','step'])if(Number.isInteger(saved[field])&&saved[field]>=0&&saved[field]<=(field==='planeShift'?1:3))state[field]=saved[field];
 if(['correct','wrong'].includes(saved.normalMode))state.normalMode=saved.normalMode;
 questions.forEach((q,i)=>{if(q.options.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}});
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;return state;
}
function select(id,label,options,value){return'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+options.map(([v,text])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';}
const button=(id,text)=>'<button type="button" id="'+id+'">'+esc(text)+'</button>';
function questionHTML(prefix,i,state){const q=questions[i];return'<section class="lyab-question"><h4>'+esc(q.prompt)+'</h4>'+select(prefix+'-q'+i,"Choose a prediction before checking",[['',"Choose an answer"],...q.options],state.choices[i])+button(prefix+'-check'+i,"Check prediction")+'<p class="lyab-feedback" id="'+prefix+'-feedback'+i+'" role="status"></p></section>';}
function bodyHTML(prefix,state,canCopy){return p("First follow one atom to its destination, then check whether all four mappings preserve labels. This card fixes a four-layer (001) prototype cut from a simple cubic parent, with lengths measured in the parent lattice constant a₀.")+
 '<div class="lyab-controls">'+select(prefix+'-caseId',"Fixed slab",[['symmetric',"Symmetric four layers with identical labels"],['marker',"Mark only the top surface"]],state.caseId)+select(prefix+'-operation',"Select an operation from the real reference",Object.entries(OPS).map(([id,o])=>[id,o.label]),state.operation)+select(prefix+'-planeShift',"In-plane translation representative",[[0,"Original representative t"],[1,"t + a₁ (one whole lattice vector)"]],state.planeShift)+select(prefix+'-atom',"Source atom for the component calculation",[0,1,2,3].map(i=>[i,"Atom "+i]),state.atom)+'</div>'+questionHTML(prefix,0,state)+
 '<div class="lyab-actions">'+button(prefix+'-next',"Reveal the next step")+button(prefix+'-previous',"Return to the previous step")+'</div><p id="'+prefix+'-progress" role="status"></p><div class="lyab-output" id="'+prefix+'-output"></div>'+questionHTML(prefix,1,state)+
 '<details id="'+prefix+'-normal"><summary>'+esc("Boundary counterexample: incorrectly imposing normal periodicity")+'</summary>'+p("This section deliberately tries t=(0,0,4)a₀, which is not one of the real operations above. The value 4a₀ exposes the wrong rule; it is not a physical period inferred from slab thickness or vacuum.")+select(prefix+'-normalMode',"Matching rule to display",[['correct',"Correct: retain the normal difference"],['wrong',"Wrong comparison: wrap the normal modulo 4a₀"]],state.normalMode)+'<div id="'+prefix+'-normal-output"></div></details>'+questionHTML(prefix,2,state)+
 '<label class="lyab-notes" for="'+prefix+'-note">'+esc("In your own words, record what geometry, labels and boundaries each check (this page session only)")+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+p("Scope: finite operations inherited from the cubic parent for the fixed four-layer (001) prototype. The counts 16 and 8 are operation representatives modulo in-plane translations, rather than a general layer-group classification or three-dimensional space-group orders.")+
 (canCopy?'<section class="lyab-copy"><h4>'+esc("Copy the complete structure input to the existing experiment")+'</h4>'+p("Copy all supported parameters of the current identical-label or top-marker structure. The selected operation, representative translation, predictions and notes belong to this replay only. The existing experiment enumerates all operations again; review its parameters and run it manually.")+button(prefix+'-copy',"Copy input and wait for a manual run")+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p><a href="#classroom/crystal?module=layers&lesson=layer-periodicity&tab=lab">'+esc("Open the existing layer-symmetry experiment")+'</a></p>')+button(prefix+'-reset',"Reset this optional card");}
function output(state){
 const r=layerActionReference(state),row=r.rows[state.atom];
 let html='<h4>'+esc("State the lattice and coordinates first")+'</h4>'+p("All three-dimensional coordinates are Cartesian coordinates divided by a₀. The lattice matrix columns are a₁, a₂ and the unit normal. Only the first two columns are periodic directions; the third expresses normal length and does not define a period.")+formula('a_1/a_0=(1,0,0),\\quad a_2/a_0=(0,1,0),\\quad n=(0,0,1)')+formula('r_{'+row.i+'}/a_0='+column(row.position)+',\\quad R='+matrix(r.matrix)+',\\quad t/a_0='+column(r.translation));
 if(state.step>=1)html+='<h4>'+esc("Multiply the matrix row by row, then add the translation")+'</h4>'+formula('r^{\\prime}/a_0=R(r/a_0)+t/a_0='+column(row.transformed))+table("Three components of the selected atom",["Component","Multiply-and-add calculation","Result / a₀"],r.matrix.map((coeff,i)=>[['x′','y′','z′'][i],coeff.map((v,j)=>'('+fmt(v)+')×('+fmt(row.position[j])+')').join(' + ')+' + '+fmt(r.translation[i]),fmt(row.transformed[i])]))+p("Retain the full transformed coordinates first. Next, find the destination atom and the integer in-plane translation.");
 if(state.step>=2)html+='<h4>'+esc("Find the unique destination, then check geometry and labels separately")+'</h4>'+formula('r_i^{\\prime}-r_j=m_1a_1+m_2a_2+\\Delta z\\,n')+table("Complete mapping of the four atoms; indices start at 0",["i / source label",'rᵢ / a₀','(Rrᵢ+t) / a₀',"j / destination label",'rⱼ / a₀','(m₁,m₂)',"Unwrapped Δz / a₀","Same label"],r.rows.map(a=>[a.i+' / '+a.label,vec(a.position),vec(a.transformed),a.j+' / '+a.targetLabel,vec(a.target),vec(a.wrap),fmt(a.normalDifference),bool(a.labelMatch)]))+p("Destination-index permutation: ["+r.permutation.join(',')+"]. Each destination occurs exactly once. Geometric bijection "+bool(r.geometryMatch)+"; label-preserving bijection "+bool(r.labelMatch)+'。');
 if(state.step>=3)html+='<h4>'+esc("Connect local matching to the existing experiment")+'</h4>'+table("Real API results for the current fixed structure",["Check","Result"],[["Retained operation representatives",r.operationCount],["Representatives that reverse the normal",r.normalFlipCount],["Current candidate operation retained",bool(r.retained)],["Geometric matching",bool(r.geometryMatch)],["Label-preserving matching",bool(r.labelMatch)]])+p(state.caseId==='marker'?"The top-surface marker does not move any site. For the normal-reversing mirror or inversion, the geometric permutation survives, but A and surface-C cannot be exchanged. The real API therefore retains 8 operations and no normal-reversing operations.":"The symmetric, identical-label slab retains 16 operations, including 8 that reverse the normal. The z mirror gives [3,2,1,0]; adding a whole in-plane lattice vector to the representative does not change this permutation.")+p("The reference comes from the current public Python API; its matrices, permutations and counts are recorded with the asset. Open the existing experiment to check every retained operation.");
 return html;
}
function normalOutput(state){const c=layerNormalBoundaryCounterexample(),wrong=state.normalMode==='wrong';return formula('t/a_0=(0,0,4),\\quad\\Delta z/a_0=4')+table("Boundary-rule comparison for the same finite slab",['i → j',"Transformed coordinates / a₀","Integer in-plane translation","Unwrapped Δz / a₀","Normal difference under the selected rule / a₀"],c.rows.map(row=>[row.i+' → '+row.j,vec(row.transformed),vec(row.planeWrap),4,wrong?0:4]))+p(wrong?"The wrong rule artificially reduces the normal difference from 4a₀ to 0, inventing a translation symmetry by changing the boundary condition. Switch back to the correct rule for comparison.":"The correct rule rejects this translation: no destination atom can absorb the unwrapped normal difference. Neither in-plane periodicity nor the total atom count repairs that mismatch.");}

export function layerActionsBridgeHTML(lessonId){
 if(!Object.hasOwn(LAYER_ACTIONS_BRIDGE_HOOKS,lessonId))return'';
 const prefix='lyab-'+lessonId;
 return'<section class="lyab-card"><p class="lyab-optional">'+esc("Optional hands-on bridge · From one atom to a symmetry operation of the entire slab")+'</p><details class="lyab-details" id="'+prefix+'-details"><summary>'+esc("Atom-by-atom checks: mirrors, labels and finite boundaries")+'</summary><div class="lyab-body" id="'+prefix+'-body"></div></details></section>';
}
const owners=new WeakMap();
export function bindLayerActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const prefix='lyab-'+lessonId,key=prefix,detail=root?.querySelector('#'+prefix+'-details'),body=root?.querySelector('#'+prefix+'-body');
 if(!detail||!body||!Object.hasOwn(LAYER_ACTIONS_BRIDGE_HOOKS,lessonId)){const noop=()=>{};noop.snapshot=()=>({});return noop;}
 const token={};owners.set(detail,token);let alive=true,ticket=0,busy=false,state=restore(stateStore.get(key));
 const $=name=>body.querySelector('#'+prefix+'-'+name);
 const owned=()=>owners.get(detail)===token&&root.querySelector('#'+prefix+'-details')===detail;
 const current=()=>alive&&owned()&&detail.isConnected!==false&&isCurrent();
 const save=()=>{if(current())stateStore.set(key,clone(state));};
 const open=node=>typeof node.open==='boolean'?node.open:node.getAttribute?.('open')!==null;
 function capture(){if(!current())return;state.open=open(detail);state.normalOpen=open($('normal'));for(const field of ['caseId','operation','normalMode'])state[field]=$(field).value;for(const field of ['atom','planeShift'])state[field]=Number($(field).value);questions.forEach((_q,i)=>{state.choices[i]=$('q'+i).value;});state.note=String($('note').value).slice(0,2000);save();}
 function update(){
  if(!current())return;$('output').innerHTML=output(state);$('normal-output').innerHTML=normalOutput(state);
  $('progress').textContent=["Preparation: predict the effect of an in-plane translation","Step 1 / 3: calculate the full transformed coordinates","Step 2 / 3: check the four-site bijection","Step 3 / 3: connect to the real operation counts"][state.step];
  $('next').disabled=state.step>=3||!state.choices[0];$('previous').disabled=state.step===0;
  questions.forEach((q,i)=>{$('check'+i).disabled=!state.choices[i];const feedback=$('feedback'+i);feedback.textContent=state.checked[i]?q.feedback[state.choices[i]]:'';feedback.setAttribute('class','lyab-feedback'+(state.checked[i]?(state.choices[i]===q.answer?' lyab-correct':' lyab-retry'):''));});
  if($('copy')){$('copy').disabled=busy;$('copy-status').textContent=state.copyOutcome==='success'?"Input copied. Review the parameters in the existing experiment and run it manually.":state.copyOutcome==='error'?"The input was not copied. You can try again.":'';}save();
 }
 body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');detail.open=state.open;$('normal').open=state.normalOpen;
 const handlers=[];
 function bind(name,event,fn){const node=$(name);if(!node)return;const handler=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();fn(node);update();};node[event]=handler;handlers.push([node,event,handler]);}
 detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};const detailToggle=detail.ontoggle;
 const normal=$('normal');normal.ontoggle=()=>{if(current()&&$('normal')===normal){state.normalOpen=open(normal);save();}};handlers.push([normal,'ontoggle',normal.ontoggle]);
 for(const name of ['caseId','operation','planeShift','atom','normalMode'])bind(name,'onchange',()=>{ticket++;busy=false;state.copyOutcome='';});
 questions.forEach((_q,i)=>{bind('q'+i,'onchange',()=>{state.checked[i]=false;});bind('check'+i,'onclick',()=>{state.checked[i]=true;});});
 bind('next','onclick',()=>{state.step=Math.min(3,state.step+1);});bind('previous','onclick',()=>{state.step=Math.max(0,state.step-1);});
 bind('note','oninput',()=>{});
 bind('reset','onclick',()=>{ticket++;busy=false;const wasOpen=state.open;state={...initial(),open:wasOpen};for(const name of ['caseId','operation','planeShift','atom','normalMode'])$(name).value=String(state[name]);questions.forEach((_q,i)=>{$('q'+i).value='';});$('note').value='';$('normal').open=false;});
 const copy=$('copy');if(copy){const handler=async()=>{
  if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=layerActionsLabRequest(state);busy=true;state.copyOutcome='';update();
  try{const accepted=await onOpenLab(payload);if(current()&&job===ticket){state.copyOutcome=accepted===false?'error':'success';}}
  catch{if(current()&&job===ticket)state.copyOutcome='error';}
  finally{if(job===ticket){busy=false;if(current())update();}}
 };copy.onclick=handler;handlers.push([copy,'onclick',handler]);}
 update();
 const cleanup=()=>{if(!alive)return;if(current())capture();alive=false;ticket++;if(owned()){if(detail.ontoggle===detailToggle)detail.ontoggle=null;for(const[node,event,handler]of handlers)if(node[event]===handler)node[event]=null;owners.delete(detail);}};
 cleanup.snapshot=()=>{capture();return{'atom-layer-map':clone(state)};};return cleanup;
}
