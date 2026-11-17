import {mathHTML} from './math-display.js?v=20261113-prose2';
import {CHIRALITY_ACTIONS_REFERENCE} from './chirality-actions-reference.js?v=20261117-phonopy1';

export const CHIRALITY_ACTIONS_BRIDGE_HOOKS=Object.freeze({
 'chiral-mirror':Object.freeze(['mirror-trace']),
 'chiral-polarity':Object.freeze(['polar-constraints'])
});
export {CHIRALITY_ACTIONS_REFERENCE};
// Fixed coordinate arithmetic for four captured API examples. No general
// matching, nullspace solver, material classifier or worker is introduced.
const CASES=[['d3',"D₃: chiral and nonpolar"],['pyramid',"C₄ᵥ: achiral with an allowed polar axis"],['octahedron',"Oₕ: centrosymmetric and nonpolar"],['tetra',"C₁: four distinct site labels"]];
const GENERATORS={c3:"120° rotation about z",c2:"180° rotation about x",c4:"90° rotation about z",mirror:"Vertical mirror containing the z axis",inversion:"Inversion",cycle:"120° rotation about (1,1,1)",identity:"Identity"};
const I=[[1,0,0],[0,1,0],[0,0,1]],M=[[-1,0,0],[0,1,0],[0,0,1]],B=[[0,0,1],[0,1,0],[-1,0,0]];
const clone=x=>JSON.parse(JSON.stringify(x)),transpose=a=>a[0].map((_v,i)=>a.map(row=>row[i]));
const mv=(a,x)=>a.map(row=>row.reduce((sum,v,j)=>sum+v*x[j],0));
const multiply=(a,b)=>a.map(row=>b[0].map((_v,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=x=>Math.hypot(...x);
const det=a=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
const coordinates=mode=>{if(!['original','passive'].includes(mode))throw Error('Unsupported finite component convention.');return mode==='original'?I:B;};
const inBasis=(matrix,basis)=>multiply(multiply(basis,matrix),transpose(basis));
const referenceFor=id=>{if(!Object.hasOwn(CHIRALITY_ACTIONS_REFERENCE.cases,id))throw Error('Unsupported finite motif.');return CHIRALITY_ACTIONS_REFERENCE.cases[id];};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-10?'0':String(Number(x.toFixed(12)));
const vec=x=>'('+x.map(fmt).join(', ')+')';
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const column=x=>matrix(x.map(v=>[v]));
const formula=text=>'<div class="chab-formula" tabindex="0">'+mathHTML(text,true)+'</div>';
const p=text=>'<p>'+esc(text)+'</p>',h=text=>'<h4>'+esc(text)+'</h4>';
const pass=value=>value?"passes":"fails";
const table=(caption,heads,rows)=>'<div class="chab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(text=>'<th scope="col">'+esc(text)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((text,j)=>j?'<td>'+esc(text)+'</td>':'<th scope="row">'+esc(text)+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';

/** One stored optimal same-label bijection; symmetric motifs may have other
 * equally good minimizers. Each destination appears once in this chosen map.
 * 'forbidden' is deliberately improper and cannot establish achirality.
 */
export function chiralityActionReference({caseId='d3',components='original',mode='proper',structure=0}={}){
 const reference=referenceFor(caseId),basis=coordinates(components);
 if(!['proper','forbidden'].includes(mode)||!Number.isInteger(structure)||structure<0||structure>=reference.generators.length)throw Error('Unsupported finite alignment view.');
 const mirror=inBasis(M,basis),correctRotation=inBasis(reference.mirrorFit.rotation,basis),rotation=mode==='proper'?correctRotation:mirror;
 const translation=mv(basis,reference.fitTranslation),positions=reference.geometry.points.map(x=>mv(basis,x));
 const rows=positions.map((position,i)=>{
  const reflected=mv(mirror,position),transformed=mv(rotation,reflected).map((v,k)=>v+translation[k]),j=reference.geometry.permutation[i];
  // The wrong inverse-mirror rule uses the identity correspondence, while the
  // correct view preserves the actual chosen best-fit permutation from Python.
  const targetIndex=mode==='proper'?j:i,target=positions[targetIndex],residual=sub(transformed,target);
  return{i,label:reference.geometry.labels[i],position,reflected,transformed,j:targetIndex,targetLabel:reference.geometry.labels[targetIndex],target,residual,distance:norm(residual)};
 });
 const generator=reference.generators[structure],structuralMatrix=inBasis(generator.matrix,basis),structuralRows=positions.map((position,i)=>({i,j:generator.permutation[i],image:mv(structuralMatrix,position),target:positions[generator.permutation[i]]}));
 return{caseId,components,mode,mirror,rotation,correctRotation,translation,basis,rows,
  rms:Math.sqrt(rows.reduce((sum,row)=>sum+row.distance**2,0)/rows.length),maximum:Math.max(...rows.map(row=>row.distance)),determinant:det(rotation),
  allowedAlignment:mode==='proper',bijective:new Set(rows.map(row=>row.j)).size===rows.length,labelPreserved:rows.every(row=>row.label===row.targetLabel),
  actualProperRMS:reference.mirrorFit.rms,chiral:reference.chiral,polarDimension:reference.polarDimension,
  structure:{id:generator.id,matrix:structuralMatrix,determinant:generator.determinant,rows:structuralRows}};
}

/** Prefix projectors are finite real-API generator references, not a browser
 * SVD. Component changes transform P and all operation matrices together.
 */
export function chiralityPolarReference({caseId='pyramid',components='original',trial='z',amplitude=1}={}){
 const reference=referenceFor(caseId),basis=coordinates(components),vectors={z:[0,0,1],x:[1,0,0],sum:[1,1,1],zero:[0,0,0]};
 if(!Object.hasOwn(vectors,trial)||![0,1,2].includes(amplitude))throw Error('Unsupported finite polar-vector trial.');
 const vector=mv(basis,vectors[trial].map(v=>v*amplitude)),projector=inBasis(reference.polarProjector,basis);
 const generators=reference.generators.map((generator,i)=>{const matrix=inBasis(generator.matrix,basis),image=mv(matrix,vector),residual=sub(image,vector);return{id:generator.id,matrix,image,residual,norm:norm(residual),projector:inBasis(reference.prefixProjectors[i+1],basis)};});
 return{caseId,components,trial,amplitude,basis,vector,projector,projected:mv(projector,vector),generators,
  allowed:generators.every(g=>g.norm<1e-8),dimension:reference.polarDimension,chiral:reference.chiral,
  zeroAllowed:true,operationCount:reference.operations.length};
}
export function chiralityActionsLabRequest({caseId='d3'}={}){
 return{action:'chirality_polarity_lab',module:'chirality',input:clone(referenceFor(caseId).input)};
}

const QUESTIONS={
 'mirror-trace':[
  {prompt:"Reflecting the mirror image once more gives exact overlap. Does this prove that the original structure is achiral?",answer:'proper',options:[['proper',"No; alignment may use only rotations with determinant +1"],['zero',"Yes; zero alignment residual is sufficient"],['labels',"Yes; preserving the element labels is sufficient"]],feedback:{proper:"Correct. The inverse mirror has determinant −1. Admitting it as an alignment would return every structure to itself and remove the distinction being tested.",zero:"A zero residual must be reported together with the allowed operations. A second reflection restores the original structure but is not a proper rigid alignment.",labels:"Preserving labels is necessary, and the alignment must also preserve orientation. The inverse mirror remains a forbidden determinant −1 operation."}},
  {prompt:"Is the structure's own symmetry matrix R below necessarily the same as its optimal mirror-alignment matrix Q?",answer:'roles',options:[['roles',"Their source point sets differ and must be checked separately"],['same',"They must be identical because both are matrices"],['coordinate',"Changing coordinates can remove chirality"]],feedback:{roles:"Correct. R acts on and preserves the original structure; Q acts on its mirror and seeks the best correspondence with the original. Declare source and target point sets before comparing matrices.",same:"Equal matrix sizes do not imply equal tasks. A stabilizer of the original structure and the best alignment of its mirror require separate names.",coordinate:"A consistent coordinate change transforms points, mirrors and matrices together and preserves alignment distances and chirality. It does not change the physical structure."}}
 ],
 'polar-constraints':[
  {prompt:"The D₃ threefold rotation allows the z direction. Does this already establish a polar axis?",answer:'all',options:[['all',"The twofold rotation about x must also be imposed"],['one',"Yes; invariance under one operation is sufficient"],['chiral',"Yes; every chiral structure allows a polar axis"]],feedback:{all:"Correct. The threefold rotation first leaves Pz; the twofold rotation about x reverses it. Satisfying both leaves only the zero vector.",one:"The fixed subspace of one operation is not yet the fixed subspace of the whole group. Check the remaining generators.",chiral:"Chirality and polarity are independent questions. All D₃ operations preserve orientation, but their common fixed polar-vector space contains only zero."}},
  {prompt:"C₄ᵥ allows P=λez. Does this determine λ or establish ferroelectric switching?",answer:'zero',options:[['zero',"No; λ=0 also satisfies every symmetry constraint"],['magnitude',"Yes; the length of an allowed direction is the polarization magnitude"],['switch',"Yes; every polar axis must switch under an electric field"]],feedback:{zero:"Correct. Symmetry gives homogeneous constraints and allowed directions. The magnitude of λ, equilibrium state and reversible switching require additional physical information.",magnitude:"A projector describes a subspace, not a material response magnitude. The trial vector and λ here are dimensionless inputs for checking algebra.",switch:"A polar axis alone does not establish ferroelectricity. These constraints supply no free energy, reversal barrier or experimental switching evidence."}}
 ]
};
const kindFor=lessonId=>CHIRALITY_ACTIONS_BRIDGE_HOOKS[lessonId]?.[0];
const initial=kind=>({open:false,conventionsOpen:false,caseId:kind==='mirror-trace'?'d3':'pyramid',components:'original',mode:'proper',structure:0,atom:0,trial:'z',amplitude:1,step:0,choices:['',''],checked:[false,false],note:'',copyOutcome:''});
function restore(saved,kind){
 const state=initial(kind);if(!saved||typeof saved!=='object')return state;
 for(const field of ['open','conventionsOpen'])if(typeof saved[field]==='boolean')state[field]=saved[field];
 if(Object.hasOwn(CHIRALITY_ACTIONS_REFERENCE.cases,saved.caseId))state.caseId=saved.caseId;
 if(['original','passive'].includes(saved.components))state.components=saved.components;
 if(['proper','forbidden'].includes(saved.mode))state.mode=saved.mode;
 if(['z','x','sum','zero'].includes(saved.trial))state.trial=saved.trial;
 for(const field of ['atom','structure','step','amplitude'])if(Number.isInteger(saved[field])&&saved[field]>=0&&saved[field]<=(field==='step'?3:field==='amplitude'?2:field==='atom'?referenceFor(state.caseId).geometry.points.length-1:referenceFor(state.caseId).generators.length-1))state[field]=saved[field];
 QUESTIONS[kind].forEach((question,i)=>{if(question.options.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}});
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);return state;
}
const options=(rows,value)=>rows.map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
const select=(id,label,rows,value)=>'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+options(rows,value)+'</select></label>';
const button=(id,label)=>'<button type="button" id="'+id+'">'+esc(label)+'</button>';
function questionHTML(prefix,kind,i,state){const q=QUESTIONS[kind][i];return'<section class="chab-question">'+h(q.prompt)+select(prefix+'-q'+i,"Predict first, then check",[['',"Choose an answer"],...q.options],state.choices[i])+button(prefix+'-check'+i,"Check prediction")+'<p id="'+prefix+'-feedback'+i+'" class="chab-feedback" role="status"></p></section>';}
function bodyHTML(prefix,kind,state,canCopy){
 const mirror=kind==='mirror-trace';
 return p(mirror?"Start from one declared atom coordinate and distinguish the physical mirror, proper alignment and the original structure's own symmetry operation.":"Apply each generator to the same trial polar vector and find the subspace that satisfies all constraints together.")+
 '<div class="chab-controls">'+select(prefix+'-caseId',"Fixed finite motif",CASES,state.caseId)+select(prefix+'-components',"Component convention",[['original',"Original coordinate components"],['passive',"Fixed passive basis change applied to every object"]],state.components)+
 (mirror?select(prefix+'-mode',"Mirror-alignment rule",[['proper',"Allowed: optimal proper rotation"],['forbidden',"Wrong counterexample: reflect again (forbidden in alignment)"]],state.mode)+select(prefix+'-atom',"Source atom to follow component by component",[],state.atom)+select(prefix+'-structure',"Independent comparison: a generator of the original structure",[],state.structure):select(prefix+'-trial',"Trial direction defined in the original coordinates",[['z',"Original z direction"],['x',"Original x direction"],['sum',"Original (1,1,1) direction"],['zero',"Zero vector"]],state.trial)+select(prefix+'-amplitude',"Algebraic trial coefficient λ (dimensionless)",[[0,'0'],[1,'1'],[2,'2']],state.amplitude))+'</div>'+questionHTML(prefix,kind,0,state)+
 '<div class="chab-actions">'+button(prefix+'-next',"Reveal the next step")+button(prefix+'-previous',"Return to the previous step")+'</div><p id="'+prefix+'-progress" role="status"></p><div id="'+prefix+'-output" class="chab-output"></div>'+questionHTML(prefix,kind,1,state)+
 '<details id="'+prefix+'-conventions"><summary>'+esc("Check coordinates, lengths and allowed-operation conventions")+'</summary>'+p("The four motifs are centered finite point sets. Coordinates and residuals use model lengths. Active operations act on columns as r′=Rr; the reference row coordinates equivalently multiply the matrix transpose on the right. The alignment translation is t=0.")+formula('r_{\\rm new}=B r_{\\rm old},\\quad R_{\\rm new}=B R_{\\rm old} B^{T},\\quad B='+matrix(B))+p("Here B changes only the component description of the same physical object. Points, mirror matrices, alignment matrices, trial vectors and subspace projectors all transform together. The original z direction has x components in the new description; distance, chirality and allowed dimension stay unchanged.")+'</details>'+
 '<label class="chab-notes" for="'+prefix+'-note">'+esc("Record the source object, allowed operations and evidence (this page session only)")+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+p("These references cover the four current finite motifs. Quartz and polar crystals provide material context in the original course. The card does not treat these point sets as material unit cells or infer response magnitudes from geometric constraints.")+
 (canCopy?'<section class="chab-copy">'+h("Copy the complete motif input to the existing experiment")+p("Copy the current motif's six real structure and teaching parameters into an editable form and wait for a manual run. The local alignment rule, atom, component change and trial vector belong to this replay only. The existing experiment retains its independent polarization model.")+button(prefix+'-copy',"Copy input and wait for a manual run")+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p><a href="#classroom/observables?module=chirality&tab=lab">'+esc("Open the existing chirality and polarity experiment")+'</a></p>')+button(prefix+'-reset',"Reset this optional card");
}
function mirrorOutput(state){
 const r=chiralityActionReference(state),row=r.rows[state.atom];
 let html=h("Declare the source point set and its mirror first")+p("M transforms the original structure into its mirror; Q acts on the mirror to seek same-label correspondence with the original. The source and mirror point sets are centered in these four references, so their alignment translation is t=0.")+formula('r_{'+row.i+'}='+column(row.position)+',\\quad M='+matrix(r.mirror)+',\\quad \\det M=-1');
 if(state.step>=1)html+=h("Reflect first, then apply the selected alignment")+formula('Mr_{'+row.i+'}='+column(row.reflected)+',\\quad Q='+matrix(r.rotation))+formula('QMr_{'+row.i+'}+t='+column(row.transformed)+',\\quad t='+column(r.translation)+',\\quad\\det Q='+fmt(r.determinant))+p(r.allowedAlignment?"The current Q is the optimal proper alignment captured from the real API, with determinant +1.":"Do not use this Q to decide chirality: it is the inverse mirror and has determinant −1. Any structure returns to itself after two identical reflections.");
 if(state.step>=2)html+=h("Check the selected same-label bijection atom by atom")+table("Selected bijection: every destination occurs once; equally optimal alignments need not be unique",["i / label",'rᵢ','Mrᵢ','QMrᵢ+t',"j / label",'rⱼ',"Residual vector","Distance"],r.rows.map(a=>[a.i+' / '+a.label,vec(a.position),vec(a.reflected),vec(a.transformed),a.j+' / '+a.targetLabel,vec(a.target),vec(a.residual),fmt(a.distance)]))+formula('\\mathrm{RMS}=\\sqrt{\\frac{1}{N}\\sum_i\\lVert QMr_i+t-r_{p(i)}\\rVert^2}='+fmt(r.rms))+table("Report the numbers together with the permitted operation",["Check","Result"],[["Destinations are one to one",pass(r.bijective)],["Labels preserved",pass(r.labelPreserved)],["Maximum residual",fmt(r.maximum)],["Current rule permitted as an alignment",pass(r.allowedAlignment)],["Real optimal proper-alignment RMS",fmt(r.actualProperRMS)]])+p("Geometric chirality of the current motif: "+(r.chiral?"yes":"no")+". This conclusion uses the real proper test and does not change when the forbidden counterexample gives zero residual.");
 if(state.step>=3)html+=h("Distinguish the structure's own R from the mirror-alignment Q")+p("R below is a real generator acting on the original structure. Q above checks the best correspondence between the mirror and the original. Their source point sets and tasks differ.")+formula('Rr_i=r_{p(i)},\\quad R='+matrix(r.structure.matrix)+',\\quad\\det R='+r.structure.determinant)+table("Selected structural generator acting on the original points",['i','Rrᵢ','j','rⱼ'],r.structure.rows.map(a=>[a.i,vec(a.image),a.j,vec(a.target)]))+p("The real optimal proper residual is nonzero for D₃ and zero for the C₄ᵥ pyramid. C₄ᵥ has mirrors and also allows a polar axis; continue by imposing the constraints in the polarity card.");
 return html;
}
function polarOutput(state){
 const r=chiralityPolarReference(state),count=Math.min(state.step,r.generators.length);
 let html=h("Declare the same trial polar vector first")+p("The trial coefficient checks algebra only and has no material polarization unit. λ=0 is also valid. Changing the component convention changes the components of this same physical trial direction consistently.")+formula('P='+column(r.vector)+',\\quad (R-I)P=0');
 for(let i=0;i<count;i++){const g=r.generators[i];html+=h(GENERATORS[g.id])+formula('R='+matrix(g.matrix)+',\\quad RP='+column(g.image)+',\\quad RP-P='+column(g.residual))+formula('\\Pi_{'+(i+1)+'}='+matrix(g.projector))+p("This projector describes the common fixed subspace of all generators included so far. Adding constraints can retain or shrink the allowed subspace.");}
 if(state.step>=2)html+=h("Check the common fixed space of all generators")+formula('\\Pi='+matrix(r.projector)+',\\quad\\Pi P='+column(r.projected))+table("All constraints on the same trial vector",["Generator",'RP−P',"Residual norm"],r.generators.map(g=>[GENERATORS[g.id],vec(g.residual),fmt(g.norm)]))+p("All generator constraints: "+pass(r.allowed)+"; allowed polar-vector subspace dimension: "+r.dimension+'。')+p("The D₃ threefold rotation first leaves z, then the twofold rotation about x reverses it. The C₄ᵥ fourfold rotation and vertical mirror jointly preserve z.");
 if(state.step>=3)html+=h("Compare chirality, permission and magnitude separately")+table("Independent classifications of the four real finite motifs",["Motif","Geometric chirality","Allowed dimension"],CASES.map(([id,name])=>[name,referenceFor(id).chiral?"yes":"no",referenceFor(id).polarDimension]))+formula('\\Pi 0=0,\\quad (R-I)0=0')+p("The zero vector satisfies all these homogeneous equations. C₄ᵥ permits P=λez, but this does not select λ or provide evidence for spontaneous polarization, free energy or reversible ferroelectric switching.")+p("An SVD basis can change sign or order while describing the same subspace. After a passive basis change compare BΠBᵀ rather than comparing basis vectors literally.");
 return html;
}

export function chiralityActionsBridgeHTML(lessonId){
 const kind=kindFor(lessonId);if(!kind)return'';const prefix='chab-'+lessonId;
 return'<section class="chab-card"><p class="chab-optional">'+esc("Optional hands-on bridge · Chirality, polarity and coordinate conventions")+'</p><details id="'+prefix+'-details" class="chab-details"><summary>'+esc(kind==='mirror-trace'?"Follow mirror formation and proper alignment atom by atom":"Find allowed polar vectors one generator at a time")+'</summary><div id="'+prefix+'-body" class="chab-body"></div></details></section>';
}
const owners=new WeakMap();
export function bindChiralityActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const kind=kindFor(lessonId),prefix='chab-'+lessonId,detail=root?.querySelector('#'+prefix+'-details'),body=root?.querySelector('#'+prefix+'-body');
 if(!kind||!detail||!body){const noop=()=>{};noop.snapshot=()=>({});return noop;}
 const token={};owners.set(detail,token);let alive=true,ticket=0,busy=false,state=restore(stateStore.get(prefix),kind);
 const $=name=>body.querySelector('#'+prefix+'-'+name),owned=()=>owners.get(detail)===token&&root.querySelector('#'+prefix+'-details')===detail;
 const current=()=>alive&&owned()&&detail.isConnected!==false&&isCurrent();
 const open=node=>typeof node.open==='boolean'?node.open:node.getAttribute?.('open')!==null;
 const save=()=>{if(current())stateStore.set(prefix,clone(state));};
 function capture(){if(!current())return;state.open=open(detail);state.conventionsOpen=open($('conventions'));for(const name of ['caseId','components','mode','trial'])if($(name))state[name]=$(name).value;for(const name of ['atom','structure','amplitude'])if($(name))state[name]=Number($(name).value);QUESTIONS[kind].forEach((_q,i)=>{state.choices[i]=$('q'+i).value;});state.note=String($('note').value).slice(0,2000);save();}
 function update(){
  if(!current())return;
  if(kind==='mirror-trace'){
   const ref=referenceFor(state.caseId);state.atom=Math.min(state.atom,ref.geometry.points.length-1);state.structure=Math.min(state.structure,ref.generators.length-1);
   for(const[name,rows]of [['atom',ref.geometry.points.map((_v,i)=>[i,"Atom "+i])],['structure',ref.generators.map((g,i)=>[i,GENERATORS[g.id]])]]){const node=$(name),html=options(rows,state[name]);if(node.innerHTML!==html)node.innerHTML=html;node.value=String(state[name]);}
  }
  $('output').innerHTML=kind==='mirror-trace'?mirrorOutput(state):polarOutput(state);
  $('progress').textContent=["Preparation: predict the allowed operations and constraints","Step 1 / 3: follow one operation","Step 2 / 3: check all correspondences or constraints","Step 3 / 3: compare conditions and counterexamples"][state.step];
  $('next').disabled=state.step>=3||!state.choices[0];$('previous').disabled=state.step===0;
  QUESTIONS[kind].forEach((q,i)=>{$('check'+i).disabled=!state.choices[i];$('feedback'+i).textContent=state.checked[i]?q.feedback[state.choices[i]]:'';});
  if($('copy')){$('copy').disabled=busy;$('copy-status').textContent=state.copyOutcome==='success'?"Input copied. Review the parameters in the existing experiment and run it manually.":state.copyOutcome==='error'?"The input was not copied. You can try again.":'';}save();
 }
 body.innerHTML=bodyHTML(prefix,kind,state,typeof onOpenLab==='function');detail.open=state.open;$('conventions').open=state.conventionsOpen;
 const handlers=[];
 const bind=(name,event,action)=>{const node=$(name);if(!node)return;const fn=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};node[event]=fn;handlers.push([node,event,fn]);};
 detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};const detailToggle=detail.ontoggle;
 const conventions=$('conventions');conventions.ontoggle=()=>{if(current()&&$('conventions')===conventions){state.conventionsOpen=open(conventions);save();}};handlers.push([conventions,'ontoggle',conventions.ontoggle]);
 for(const name of ['caseId','components','mode','trial','atom','structure','amplitude'])bind(name,'onchange',()=>{ticket++;busy=false;state.copyOutcome='';});
 QUESTIONS[kind].forEach((_q,i)=>{bind('q'+i,'onchange',()=>{state.checked[i]=false;});bind('check'+i,'onclick',()=>{state.checked[i]=true;});});
 bind('next','onclick',()=>{state.step=Math.min(3,state.step+1);});bind('previous','onclick',()=>{state.step=Math.max(0,state.step-1);});bind('note','oninput',()=>{});
 bind('reset','onclick',()=>{ticket++;busy=false;state={...initial(kind),open:state.open};for(const name of ['caseId','components','mode','trial','atom','structure','amplitude'])if($(name))$(name).value=String(state[name]);QUESTIONS[kind].forEach((_q,i)=>{$('q'+i).value='';});$('note').value='';$('conventions').open=false;});
 const copy=$('copy');if(copy){const fn=async()=>{if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=chiralityActionsLabRequest(state);busy=true;state.copyOutcome='';update();try{const accepted=await onOpenLab(payload);if(current()&&job===ticket)state.copyOutcome=accepted===false?'error':'success';}catch{if(current()&&job===ticket)state.copyOutcome='error';}finally{if(job===ticket){busy=false;if(current())update();}}};copy.onclick=fn;handlers.push([copy,'onclick',fn]);}
 update();
 const cleanup=()=>{if(!alive)return;if(current())capture();alive=false;ticket++;if(owned()){if(detail.ontoggle===detailToggle)detail.ontoggle=null;for(const[node,event,fn]of handlers)if(node[event]===fn)node[event]=null;owners.delete(detail);}};
 cleanup.snapshot=()=>{capture();return{[kind]:clone(state)};};return cleanup;
}
