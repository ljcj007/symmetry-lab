import {mathHTML} from './math-display.js?v=20261113-prose2';
import {GEOMETRY_ACTIONS_REFERENCE as REFERENCE} from './geometry-actions-reference.js?v=20261117-phonopy1';

// Bounded algebra for one declared SSH reference. This is not a new solver.
export const GEOMETRY_ACTIONS_BRIDGE_HOOKS=Object.freeze({'geometry-rays':Object.freeze(['ket-projector-distance'])});
const OWNERS=new WeakMap(),clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>Math.abs(value)<5e-14?'0':Number(value.toPrecision(7)).toString();
const zfmt=([a,b])=>Math.abs(b)<5e-12?fmt(a):Math.abs(a)<5e-12?fmt(b)+'i':fmt(a)+(b<0?' − ':' + ')+fmt(Math.abs(b))+'i';
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],scale=(a,n)=>[a[0]*n,a[1]*n];
const norm=a=>a.reduce((s,z)=>s+z[0]**2+z[1]**2,0),inner=(a,b)=>a.reduce((s,z,i)=>add(s,mul(conj(z),b[i])),[0,0]);
const outer=a=>a.map(z=>a.map(w=>mul(z,conj(w))));
const matvec=(a,v)=>a.map(row=>row.reduce((s,z,i)=>add(s,mul(z,v[i])),[0,0]));
const subtract=(a,b)=>a.map((z,i)=>add(z,scale(b[i],-1)));
const formula=value=>`<div class="gab-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const table=(caption,heads,rows)=>`<div class="gab-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>(i?'<td>':'<th scope="row">')+x+(i?'</td>':'</th>')).join('')+'</tr>').join('')}</tbody></table></div>`;
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([v,text])=>`<option value="${v}"${String(v)===String(value)?' selected':''}>${text}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button type="button" id="${id}"${disabled?' disabled':''}>${label}</button>`;
function allowed(value,values,label){if(!values.includes(value))throw Error('Unsupported fixed SSH '+label+'.');return value;}
const parameters=({k=0,strength=2,delta=.1}={})=>({k:allowed(k,REFERENCE.bases,'base momentum'),strength:allowed(strength,REFERENCE.strengths,'gauge strength'),delta:allowed(delta,REFERENCE.deltas,'separation')});
const selection=(p,delta=0)=>REFERENCE.selections.find(row=>row.base===p.k&&row.strength===p.strength&&row.delta===delta);

/** The ket and neighbor are saved, independent production-API selections.
 * Derivatives below use the explicitly smooth representative (-1,exp(ik))/√2,
 * verified against those selected eigenvectors on this finite positive-k grid.
 */
export function geometryActionsReference(values={}){
 const p=parameters(values),base=selection(p),neighbor=selection(p,p.delta),u=clone(base.selection.eigenvector),v=clone(base.selection.transformedEigenvector);
 const alpha=base.selection.phase,slope=p.strength*(Math.cos(p.k)-.74*Math.sin(2*p.k)),phase=[Math.cos(alpha),Math.sin(alpha)];
 const du=[[0,0],scale([-Math.sin(p.k),Math.cos(p.k)],1/Math.sqrt(2))];
 const phaseDirection=u.map(z=>mul([0,slope],z));
 const derivative=du.map((z,i)=>mul(phase,add(z,phaseDirection[i]))),P=outer(v),along=matvec(P,derivative),projected=subtract(derivative,along);
 const pd=[[ [0,0],[.5*Math.sin(p.k),.5*Math.cos(p.k)] ],[ [.5*Math.sin(p.k),-.5*Math.cos(p.k)],[0,0] ]];
 const overlap=inner(v,neighbor.selection.transformedEigenvector),fidelity=overlap[0]**2+overlap[1]**2,distance=1-fidelity,approximation=.25*p.delta**2;
 const neighborP=neighbor.selection.projector,baseP=base.selection.projector;
 const finiteDifference=neighborP.map((row,i)=>row.map((z,j)=>scale(add(z,scale(baseP[i][j],-1)),1/p.delta)));
 let finiteMetric=0;for(let i=0;i<2;i++)for(let j=0;j<2;j++)finiteMetric+=mul(finiteDifference[i][j],finiteDifference[j][i])[0]/2;
 return{...p,base:clone(base),neighbor:clone(neighbor),u,v,bra:v.map(conj),P,alpha,slope,derivative,along,projected,projectorDerivative:pd,
  ordinaryNorm:norm(derivative),parallelNorm:norm(along),metric:norm(projected),connection:-inner(v,derivative)[1],
  overlap,fidelity,distance,approximation,absoluteError:Math.abs(distance-approximation),relativeError:Math.abs(distance-approximation)/distance,
  finiteDifference,finiteMetric};
}

/** Complete supported input. Teaching Δk is deliberately not a core field. */
export function geometryActionsLabRequest(values={}){
 const p=parameters(values);return{action:'quantum_geometry_lab',module:'geometry',input:clone(selection(p).input)};
}

const checks=[
 {prompt:"After multiplying the entire ket by eⁱᵅ, how should the bra change?",answer:'conjugate',rows:[['same',"Multiply the bra by eⁱᵅ too"],['conjugate',"Multiply the bra by e⁻ⁱᵅ; all four projector entries stay unchanged"],['one',"Apply the phase only to the first component"]],feedback:{
  same:"The bra is the conjugate transpose of the ket, so its phase must also be conjugated. Multiplying both in the same direction would incorrectly leave e²ⁱᵅ.",
  conjugate:"Correct. Each entry is vᵢvⱼ*, and the phase factors give eⁱᵅe⁻ⁱᵅ=1.",
  one:"Changing the phase of just one orbital component changes the relative phase. In a fixed orbital basis this generally changes the projector and the physical state."}},
 {prompt:"For a k-dependent gauge phase, which quantity remains 1/4 in this example?",answer:'projected',rows:[['raw',"Squared norm of the ordinary derivative"],['projected',"Squared derivative norm after removing the component parallel to the state"],['connection',"Berry connection A"]],feedback:{
  raw:"The ordinary derivative contains the parallel component iα′u. Its squared norm is 1/2+α′+(α′)² and changes with the gauge.",
  projected:"Correct. (1−P) removes the parallel direction. The remaining vector acquires only an overall phase, leaving its squared norm at 1/4.",
  connection:"This page uses A=i⟨u|∂u⟩. The connection is −1/2−α′ and changes with the gauge."}},
 {prompt:"After increasing Δk from 0.02 to 2, can 1−F still be identified exactly with g(Δk)²?",answer:'limit',rows:[['exact',"Yes, because g remains 1/4"],['limit',"No; this is a small-separation approximation. Contract the two states directly at finite separation"],['gauge',"No, because fidelity depends on the overall phase"]],feedback:{
  exact:"A constant metric does not make finite distance exactly quadratic. Here the exact result is sin²(Δk/2), with appreciable higher-order terms at large separation.",
  limit:"Correct. Compare the error rows: 1−F=sin²(Δk/2), whereas g(Δk)²=(Δk)²/4. They agree in the Δk→0 limit.",
  gauge:"Fidelity is the squared modulus of the overlap, so each selected state's overall phase cancels. The difference comes from higher-order finite-separation terms."}}
];
const initial=()=>({open:false,proofOpen:false,referenceOpen:false,k:0,strength:2,delta:.1,step:0,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){const state=initial();if(!saved||typeof saved!=='object')return state;for(const name of ['open','proofOpen','referenceOpen'])state[name]=saved[name]===true;for(const[name,list]of [['k',REFERENCE.bases],['strength',REFERENCE.strengths],['delta',REFERENCE.deltas]])if(list.includes(saved[name]))state[name]=saved[name];state.step=Number.isInteger(saved.step)?Math.max(0,Math.min(4,saved.step)):0;state.note=typeof saved.note==='string'?saved.note.slice(0,2000):'';for(let i=0;i<3;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}return state;}
function actionHTML(state){
 const r=geometryActionsReference(state),rows=[['v₁',zfmt(r.v[0]),state.step>=1?zfmt(r.bra[0]):'—'],['v₂',zfmt(r.v[1]),state.step>=1?zfmt(r.bra[1]):'—']];
 let html=formula('u(k)=\\frac{1}{\\sqrt2}\\begin{pmatrix}-1\\\\e^{ik}\\end{pmatrix},\\qquad v=e^{i\\alpha(k)}u')+
  table("Two components at the current API selection; the right column is complex-conjugated",["Component",'ket v',"Corresponding entry of bra v†"],rows);
 if(state.step===0)return html+"<p>Read the two ket entries, then reveal the next step: turn the column into a row and conjugate each entry.</p>";
 html+=formula('\\langle v\\rvert=(v_1^*,v_2^*),\\qquad\\langle v|v\\rangle=1');
 if(state.step>=2)html+=table("Four products: rows from the ket, columns from the bra",["Position","Product","Result"],[[ 'P₁₁','('+zfmt(r.v[0])+') × ('+zfmt(r.bra[0])+')',zfmt(r.P[0][0])],[ 'P₁₂','('+zfmt(r.v[0])+') × ('+zfmt(r.bra[1])+')',zfmt(r.P[0][1])],[ 'P₂₁','('+zfmt(r.v[1])+') × ('+zfmt(r.bra[0])+')',zfmt(r.P[1][0])],[ 'P₂₂','('+zfmt(r.v[1])+') × ('+zfmt(r.bra[1])+')',zfmt(r.P[1][1])]]);
 if(state.step>=3)html+=formula('P=|v\\rangle\\langle v|=\\frac12\\begin{pmatrix}1&-e^{-ik}\\\\-e^{ik}&1\\end{pmatrix}')+"<p>Change the gauge strength and inspect the four entries: the ket and bra change, but P does not. P²=P and Tr P=1; this is the rank-one projector onto a state ray.</p>";
 if(state.step>=4)html+=formula('P(i\\alpha\'v)=i\\alpha\'v,\\qquad(1-P)(i\\alpha\'v)=0')+"<p>The final step applies the same projector to a derivative, completely removing the pure-phase direction parallel to the state. Continue with the derivative ledger below.</p>";
 return html;
}
function derivativesHTML(state){
 const r=geometryActionsReference(state);
 return formula('\\alpha(k)=s(\\sin k+0.37\\cos2k)')+
  formula('\\alpha\'(k)=s(\\cos k-0.74\\sin2k)='+fmt(r.slope))+
  "<p>This is the same k-dependent gauge used by the original calculation package. Changing a constant phase at one k alone does not specify its derivative.</p>"+
  formula('\\partial_k v=e^{i\\alpha}(\\partial_k u+i\\alpha\'u)')+
  table("Split the derivative into parallel and orthogonal components",["Component",'∂ₖv','P∂ₖv','(1−P)∂ₖv'],[0,1].map(i=>["Component "+(i+1),zfmt(r.derivative[i]),zfmt(r.along[i]),zfmt(r.projected[i])]))+
  table("Squared norms and connection: the projected norm is the metric",["Quantity","Current value"],[["Ordinary derivative ‖∂ₖv‖²",fmt(r.ordinaryNorm)],["Parallel part ‖P∂ₖv‖²",fmt(r.parallelNorm)],['gₖₖ = ‖(1−P)∂ₖv‖²',fmt(r.metric)],['A = i⟨v|∂ₖv⟩',fmt(r.connection)]])+
  formula('g_{kk}=\\frac12\\operatorname{Tr}[(\\partial_kP)^2]=\\frac14')+
  "<p>These derivatives use the explicitly stated smooth representative u(k), checked entry by entry against the API eigenvectors on this reference grid. A general eigensolver can jump in phase between neighbors; directly differencing raw kets does not give a gauge-invariant metric.</p>";
}
function distanceHTML(state){
 const r=geometryActionsReference(state);
 return table("Two saved production API selections; the neighbor uses its own α(k+Δk)",["Selection",'k / rad','α / rad',"First ket entry","Second ket entry"],[["Base point",fmt(r.k),fmt(r.alpha),zfmt(r.v[0]),zfmt(r.v[1])],["Neighbor",fmt(r.neighbor.selection.kx),fmt(r.neighbor.selection.phase),...r.neighbor.selection.transformedEigenvector.map(zfmt)]])+
  formula('\\langle v(k)|v(k+\\Delta k)\\rangle='+zfmt(r.overlap))+
  formula('F=|\\langle v(k)|v(k+\\Delta k)\\rangle|^2='+fmt(r.fidelity))+
  table("Keep finite separation and the differential approximation distinct",["Comparison quantity","Value"],[["Exact finite value 1−F",fmt(r.distance)],["Differential approximation g(Δk)²",fmt(r.approximation)],["Absolute difference",fmt(r.absoluteError)],["Relative difference |approximate−exact|/(1−F)",fmt(100*r.relativeError)+'%'],["Finite difference ½Tr[((P₂−P₁)/Δk)²]",fmt(r.finiteMetric)],["Differential metric gₖₖ",fmt(r.metric)]])+
  formula('1-F=\\sin^2(\\Delta k/2)=\\frac{(\\Delta k)^2}{4}+O((\\Delta k)^4)')+
  "<p>As Δk→0, both (1−F)/(Δk)² and the projector finite difference approach 1/4. At finite Δk they remain finite-difference comparisons. Choose Δk=2 for a clear counterexample, then 0.02 to recover the approximation. The gap stays 2, so no gap-closing singularity occurs here.</p>";
}
function proofHTML(){return "<p>The periodic orbital basis is fixed and the lattice constant is 1, so k and Δk are in radians. The off-diagonal entries of H are e⁻ⁱᵏ and eⁱᵏ; the lower-band energy is −1. The normalized amplitudes are (−1,eⁱᵏ)/√2.</p>"+formula('\\partial_k u=\\frac1{\\sqrt2}\\begin{pmatrix}0\\\\ie^{ik}\\end{pmatrix},\\quad\\langle u|\\partial_k u\\rangle=\\frac i2')+formula('\\|(1-P)\\partial_k v\\|^2=\\|\\partial_k v\\|^2-|\\langle v|\\partial_k v\\rangle|^2')+formula('=\\left[\\frac12+\\alpha\'+(\\alpha\')^2\\right]-\\left[\\frac12+\\alpha\'\\right]^2=\\frac14')+"<p>The change here is an overall eigenvector phase within the same fixed orbital basis. Changing orbital embedding, the unit-cell convention, or relative orbital phases is a different comparison; the four-entry invariance result does not automatically apply.</p>";
}
function questionHTML(prefix,state,i){const q=checks[i];return `<section class="gab-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+i,"Make a prediction first",[['',"Choose an answer"],...q.rows],state.choices[i])}${button(prefix+'-check'+i,"Check and explain",!state.choices[i])}<p id="${prefix}-feedback${i}" class="gab-feedback" role="status"></p></section>`;}
function bodyHTML(prefix,state,canCopy){return "<p class=\"gab-scope\">Fixed SSH reference: t₁=0, t₂=1, a periodic orbital basis, the lower band, and gap 2. The two components are orbital amplitudes, not two spin directions. This card uses saved production Python API selections and works through this bounded example's algebra.</p>"+
 `<section class="gab-stage"><h3>1 · From ket to bra to four projector entries</h3><div class="gab-controls">${select(prefix+'-k',"Base momentum k / rad",[[0,'0'],[.6,'0.6']],state.k)}${select(prefix+'-strength',"Original model gauge strength s",[[0,'0'],[2,'2'],[4,'4']],state.strength)}</div>${button(prefix+'-step',"Reveal the next step")}<div id="${prefix}-action">${actionHTML(state)}</div></section>`+
 `<section class="gab-stage"><h3>2 · Project the pure-phase direction out of the derivative</h3><div id="${prefix}-derivatives">${derivativesHTML(state)}</div><details data-gab-native="proof" class="gab-reference"${state.proofOpen?' open':''}><summary>Show the smooth representative, gauge convention, and derivation of 1/4</summary>${proofHTML()}</details></section>`+
 `<section class="gab-stage"><h3>3 · Check small-separation fidelity with two real selections</h3><div class="gab-controls">${select(prefix+'-delta',"Teaching comparison separation Δk / rad",[[.02,'0.02'],[.1,'0.1'],[.5,'0.5'],[2,"2 · Finite-separation counterexample"]],state.delta)}</div><div id="${prefix}-distance">${distanceHTML(state)}</div></section>`+
 `<section class="gab-stage"><h3>4 · Predict, then explain</h3>${checks.map((_q,i)=>questionHTML(prefix,state,i)).join('')}</section>`+
 `<section class="gab-stage"><h3>5 · Verify in the full Python experiment</h3>${canCopy?button(prefix+'-copy',"Copy the current base point and gauge to the original experiment"):"<a href=\"#compute/quantum-geometry-lab?preset=geometry-ssh-topological\">Open the existing quantum geometry experiment →</a><p>This link opens the existing preset. Manually set t₁=0, t₂=1, and this card's base point before calculating.</p>"}<p>Copy the complete supported SSH input: t₁=0, t₂=1, current k and s, mesh=9, and pathSamples=31, together with the remaining supported fields. Run the experiment manually after copying. Δk, predictions, and notes are not core inputs. The neighbor is saved separately in this card rather than added as a fictitious experiment input.</p><p id="${prefix}-copy-status" class="gab-feedback" role="status"></p><details class="gab-reference" data-gab-native="reference"${state.referenceOpen?' open':''}><summary>Reference data provenance and reproduction</summary><p>This card saves 30 quantum_geometry_lab selections, including base and neighbor points, phase-transformed eigenvectors, projectors, and gₖₖ. Generate them with scripts/check-geometry-actions-reference.py --write. sourceHashes records the Python source SHA-256 values; independent checks also verify the eigenvalue equation, four projector entries, and finite differences.</p><p data-math-ignore>dist/geometry-actions-reference.js</p></details></section>`+
 `<label class="gab-note" for="${prefix}-note">${"Write your own explanation (kept only in this page's memory)"}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset',"Reset this action card")}`;
}

export function geometryActionsBridgeHTML(lessonId){if(!GEOMETRY_ACTIONS_BRIDGE_HOOKS[lessonId])return '';return "<section class=\"gab-prerequisite\" aria-label=\"Optional state projector and quantum distance card\"><p>Open a fixed SSH example to connect two complex amplitudes, four projector entries, gauge derivatives, and two-point distance step by step.</p><details class=\"gab-bridge\" data-gab-bridge=\"ket-projector-distance\"><summary>Why does a phase change leave the state distance unchanged?</summary><div class=\"gab-body\" data-gab-body=\"ket-projector-distance\"></div></details></section>";}

export function bindGeometryActionsBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const supported=!!GEOMETRY_ACTIONS_BRIDGE_HOOKS[lessonId],store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':ket-projector-distance';
 const detail=supported?root?.querySelector?.('[data-gab-bridge="ket-projector-distance"]'):null,body=supported?root?.querySelector?.('[data-gab-body="ket-projector-distance"]'):null;
 const state=restored(store.get(key)),prefix='gab-'+lessonId,owner={},bindings=[];let alive=true,busy=false,ticket=0;
 if(detail)OWNERS.set(detail,owner);
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const active=()=>alive&&!!detail&&!!body&&OWNERS.get(detail)===owner&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-gab-bridge="ket-projector-distance"]')===detail&&root.querySelector('[data-gab-body="ket-projector-distance"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(active())store.set(key,clone(state));};
 const capture=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['proof','proofOpen'],['reference','referenceOpen']]){const native=body.querySelector('[data-gab-native="'+name+'"]');if(native)state[field]=readOpen(native);}for(const[name,list]of [['k',REFERENCE.bases],['strength',REFERENCE.strengths],['delta',REFERENCE.deltas]]){const node=$(name);if(node&&node.value!==''&&list.includes(Number(node.value)))state[name]=Number(node.value);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||checks[i].rows.some(([id])=>id===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}save();};
 const attach=(node,event,fn)=>{if(node){node[event]=fn;bindings.push([node,event,fn]);}};
 const bind=(name,event,action)=>{const node=$(name);attach(node,event,()=>{if(!active()||$(name)!==node||node.disabled)return;capture();action(node);save();});};
 const paintQuestion=i=>{const q=checks[i],choice=state.choices[i],checked=state.checked[i]&&choice,node=$('feedback'+i);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','gab-feedback'+(checked&&choice===q.answer?' gab-correct':''));}if($('check'+i))$('check'+i).disabled=!choice;};
 const paint=()=>{if(!active())return;for(const[name,render]of [['action',actionHTML],['derivatives',derivativesHTML],['distance',distanceHTML]])if($(name))$(name).innerHTML=render(state);if($('step'))$('step').textContent=state.step>=4?"Replay from the ket":"Reveal the next step";for(let i=0;i<3;i++)paintQuestion(i);};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 function draw(){
  if(!active())return;body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');
  for(const[name,field]of [['proof','proofOpen'],['reference','referenceOpen']]){const native=body.querySelector('[data-gab-native="'+name+'"]');if(native){native.open=state[field];attach(native,'ontoggle',()=>{if(active()&&body.querySelector('[data-gab-native="'+name+'"]')===native){state[field]=readOpen(native);save();}});}}
  for(const name of ['k','strength','delta'])bind(name,'onchange',()=>{clearCopy();paint();});
  bind('step','onclick',()=>{state.step=state.step>=4?0:state.step+1;paint();});
  for(let i=0;i<3;i++){bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});paintQuestion(i);}
  bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
  bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});clearCopy();draw();$('k')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy){copy.disabled=busy;attach(copy,'onclick',async()=>{
   if(!active()||$('copy')!==copy||busy||copy.disabled)return;capture();const request=geometryActionsLabRequest(state),id=++ticket;busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
   try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error("The input could not be copied. Please try again.");if(active()&&$('copy')===copy&&ticket===id){state.copyOutcome='success';$('copy-status').textContent="The complete input was copied. Run it manually in the original experiment.";save();}}
   catch(_error){if(active()&&$('copy')===copy&&ticket===id){state.copyOutcome='error';state.copyError="The input could not be copied. Please try again.";$('copy-status').textContent=state.copyError;save();}}
   finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
  });}
  paint();save();
 }
 if(detail&&body){detail.open=state.open;if(state.open)detail.setAttribute('open','');attach(detail,'ontoggle',()=>{if(active()){state.open=readOpen(detail);save();}});draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;for(const[node,event,fn]of bindings)if(node[event]===fn)node[event]=null;if(detail&&OWNERS.get(detail)===owner)OWNERS.delete(detail);};
 cleanup.snapshot=()=>{capture();return supported?{'ket-projector-distance':clone(state)}:{};};return cleanup;
}
