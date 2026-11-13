import {mathHTML} from './math-display.js?v=20261113-prose2';

// A bounded four-mode teaching reference. The scientific Hubbard and Lehmann
// tools remain Python calculations; this bridge never starts a worker.
export const HUBBARD_BRIDGE_HOOKS=Object.freeze(Object.fromEntries(['hubbard-basis','manybody-lehmann'].map(id=>[id,Object.freeze(['fock-to-lehmann'])])));
export const HUBBARD_SOURCE_BASIS=Object.freeze([5,9,6,10]);
const modes=['0↑','1↑','0↓','1↓'];
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=(value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)throw Error('The four-mode teaching reference requires an integer in its stated range.');return value;};
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(4):Number(value.toFixed(6)).toString();
const texNumber=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const bits=state=>Array.from({length:4},(_,i)=>(state>>i)&1);
const count=values=>values.reduce((a,b)=>a+b,0);
const sector=state=>{const n=bits(state);return[count(n.slice(0,2)),count(n.slice(2))];};
const ket=state=>{const n=bits(state);return'|'+n[0]+n[1]+';'+n[2]+n[3]+'⟩';};
const ketTex=state=>{const n=bits(state);return'\\lvert '+n[0]+n[1]+';'+n[2]+n[3]+'\\rangle';};
const opTex=(mode,create)=>'c_{'+(mode%2)+','+(mode<2?'\\uparrow':'\\downarrow')+'}'+(create?'^{\\dagger}':'');
const formula=tex=>`<div class="hub-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>`<span class="hub-inline">${mathHTML(tex)}</span>`;
const table=(caption,headers,rows)=>`<div class="hub-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${headers.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
const complex=(re,im=0)=>[re,im],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],scale=(a,n)=>[a[0]*n,a[1]*n],norm2=a=>a[0]*a[0]+a[1]*a[1];
const complexTex=z=>{const[r,i]=z;return !i?texNumber(r):!r?texNumber(i)+'i':texNumber(r)+(i>=0?'+':'')+texNumber(i)+'i';};
const vectorTex=vector=>'\\begin{pmatrix}'+vector.map(complexTex).join('\\\\')+'\\end{pmatrix}';
const applyMatrix=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,i)=>add(sum,mul(value,vector[i])),complex(0)));

/** All 16 occupations x four modes x creation/removal are intentionally finite. */
export function hubbardFermionAction({state,mode,create=false}={}){
 integer(state,0,15);integer(mode,0,3);if(typeof create!=='boolean')throw Error('Creation must be explicitly true or false.');
 const occupations=bits(state),occupied=occupations[mode]===1,lowerModes=occupations.flatMap((n,i)=>i<mode&&n?[i]:[]),allowed=occupied!==create;
 return{state,mode,create,occupations,occupied,lowerModes,parity:lowerModes.length%2,
  sign:allowed?(lowerModes.length%2?-1:1):0,target:allowed?state^(1<<mode):null,
  sourceSector:sector(state),targetSector:allowed?sector(state^(1<<mode)):null};
}

function sectorBasis(up,down){
 const result=[];for(let u=0;u<4;u++)if((u&1)+((u>>1)&1)===up)for(let d=0;d<4;d++)if((d&1)+((d>>1)&1)===down)result.push(u+(d<<2));return result;
}

/** Source columns use (5,9,6,10), not integer-sorted occupation states. */
export function hubbardActionMatrix({mode=2,create=false}={}){
 integer(mode,0,3);if(typeof create!=='boolean')throw Error('Creation must be explicitly true or false.');
 const delta=create?1:-1,targetSector=[1+(mode<2?delta:0),1+(mode>=2?delta:0)],targetBasis=sectorBasis(...targetSector);
 const matrix=targetBasis.map(()=>HUBBARD_SOURCE_BASIS.map(()=>0));
 HUBBARD_SOURCE_BASIS.forEach((state,col)=>{const action=hubbardFermionAction({state,mode,create});if(action.target!==null)matrix[targetBasis.indexOf(action.target)][col]=action.sign;});
 return{sourceBasis:[...HUBBARD_SOURCE_BASIS],sourceSector:[1,1],targetBasis,targetSector,matrix,mode,create};
}

/** Fixed unique pure ground state; this is not an arbitrary Hubbard solver. */
export function hubbardSpectralReference({probe='local0',phi=0}={}){
 if(!['local0','phase'].includes(probe)||typeof phi!=='number'||!Number.isFinite(phi)||Math.abs(phi)>Math.PI)throw Error('Unsupported fixed-dimer probe or phase.');
 const phase=phi===0?complex(1):Math.abs(phi)===Math.PI?complex(-1):phi===Math.PI/2?complex(0,-1):phi===-Math.PI/2?complex(0,1):complex(Math.cos(phi),-Math.sin(phi));
 const coefficients=probe==='local0'?[complex(1),complex(0)]:[complex(1/Math.SQRT2),scale(phase,1/Math.SQRT2)];
 const initial=HUBBARD_SOURCE_BASIS.map(()=>complex(.5)),processes={};
 for(const create of [false,true]){
  const local=[0,1].map(mode=>hubbardActionMatrix({mode,create})),used=coefficients.map(z=>create?[z[0],-z[1]]:[...z]);
  const matrix=local[0].matrix.map((row,r)=>row.map((value,col)=>add(scale(used[0],value),scale(used[1],local[1].matrix[r][col]))));
  const acted=applyMatrix(matrix,initial),bonding=scale(add(acted[0],acted[1]),1/Math.SQRT2),antibonding=scale(add(acted[0],scale(acted[1],-1)),1/Math.SQRT2);
  const contributions=local.map((entry,i)=>{const vec=applyMatrix(entry.matrix.map(row=>row.map(x=>complex(x))),initial);return mul(used[i],scale(add(vec[0],vec[1]),1/Math.SQRT2));});
  const kind=create?'addition':'removal';
  processes[kind]={matrix,acted,coefficients:used,contributions,targetBasis:local[0].targetBasis,targetSector:local[0].targetSector,
   bonding:{amplitude:bonding,weight:norm2(bonding),finalEnergy:-1,coordinate:create?1:-1},
   antibonding:{amplitude:antibonding,weight:norm2(antibonding),finalEnergy:1,coordinate:create?3:-3},
   totalWeight:acted.reduce((sum,z)=>sum+norm2(z),0)};
 }
 return{probe,phi,coefficients,initial,sourceBasis:[...HUBBARD_SOURCE_BASIS],groundEnergy:-2,...processes,
  totalWeight:processes.removal.totalWeight+processes.addition.totalWeight,
  incoherentRandomLocal:{removalWeight:.5,additionWeight:.5},displayWeightTolerance:1e-13};
}

export function hubbardBridgeLabRequest(reference={}){
 const ref=hubbardSpectralReference(reference);
 return{action:'manybody_spectra_lab',input:{experiment:'single_particle',sites:2,nUp:1,nDown:1,boundary:'open',hopping:1,interactionU:0,alternatingPotential:0,
  probe:ref.probe==='phase'?'momentum':'local',site:0,q:ref.probe==='phase'?ref.phi/Math.PI:0,spin:'up',chemicalPotential:0,responseKind:'spin',eta:.08,points:601}};
}

const initial=()=>({open:false,matrixOpen:false,spectrumOpen:false,allStates:false,basis:'5',mode:'2',operation:'remove',actionStep:0,
 probe:'local0',phi:0,comparison:false,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const name of ['open','matrixOpen','spectrumOpen','allStates','comparison'])if(typeof saved[name]==='boolean')state[name]=saved[name];
 const allowed=state.allStates?Array.from({length:16},(_,i)=>String(i)):HUBBARD_SOURCE_BASIS.map(String);
 if(allowed.includes(saved.basis))state.basis=saved.basis;if(['0','1','2','3'].includes(saved.mode))state.mode=saved.mode;
 if(['remove','create'].includes(saved.operation))state.operation=saved.operation;if(['local0','phase'].includes(saved.probe))state.probe=saved.probe;
 if(typeof saved.phi==='number'&&Number.isFinite(saved.phi)&&Math.abs(saved.phi)<=Math.PI)state.phi=saved.phi;
 if(Number.isInteger(saved.actionStep)&&saved.actionStep>=0&&saved.actionStep<=3)state.actionStep=saved.actionStep;
 const options=[['positive','negative','zero'],['same','target','other'],['half','phase','none']];
 for(let i=0;i<3;i++)if(options[i].includes(saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(!state.choices[0])state.actionStep=0;if(state.actionStep<3)state.checked[0]=false;
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);
 return state;
}
const actionFor=state=>hubbardFermionAction({state:Number(state.basis),mode:Number(state.mode),create:state.operation==='create'});
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select>${value!==''?`<span class="hub-selected-reading" aria-hidden="true">${esc(rows.find(([key])=>String(key)===String(value))?.[1]||'')}</span>`:''}</label>`;
const button=(id,label,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${label}</button>`;
const checkbox=(id,label,checked)=>`<label class="hub-checkbox"><input id="${id}" type="checkbox" ${checked?'checked':''}>${label}</label>`;

function question(state,index){
 const a=actionFor(state),m=hubbardActionMatrix({mode:Number(state.mode),create:state.operation==='create'}),target='('+m.targetSector.join(',')+')',other='('+[...m.targetSector].reverse().join(',')+')';
 if(index===0){
  const key=a.sign===0?'zero':a.sign>0?'positive':'negative';
  const allowedExplanation=a.sign===0?(a.create?"The target mode is already occupied, so creating another fermion gives zero.":"The target mode is empty, so annihilation gives zero."):"The target occupation permits this operation; the number of occupied preceding modes determines its sign.";
  return{prompt:"Predict the sign of the current operation, then reveal its steps.",rows:[['',"Choose your prediction first"],['positive',"Nonzero, positive sign"],['negative',"Nonzero, negative sign"],['zero',"Zero result"]],answer:key,
   feedback:{positive:a.sign>0?"An even number of preceding modes is occupied, giving a positive reordering sign; the target mode also permits this operation.":a.sign<0?"An odd number of preceding modes is occupied. Permission to act on the target mode does not remove the minus sign.":allowedExplanation,
    negative:a.sign<0?"An odd number of preceding modes is occupied, giving a negative reordering sign. A negative amplitude still gives a nonnegative probability.":a.sign>0?"An even number of preceding modes is occupied, so reordering introduces no minus sign.":allowedExplanation,
    zero:a.sign===0?allowedExplanation:"This mode permits the operation, so the result is nonzero. Next, check whether the number of occupied preceding modes is even or odd."}};
 }
 if(index===1)return{prompt:"With the source sector fixed at (1,1), which spaces does the current operator connect?",rows:[['',"Choose your prediction first"],['same',"Four-dimensional (1,1) maps to itself"],['target',"Four-dimensional (1,1) maps to two-dimensional "+target],['other',"Four-dimensional (1,1) maps to two-dimensional "+other]],answer:'target',
  feedback:{same:"A single creation or annihilation operator changes particle number; it cannot merely rearrange states within the original four-dimensional sector.",target:"Columns label four source basis states and rows label two target basis states. The particle number of the specified spin changes by one, while the other is unchanged.",other:"This option changes the other spin population. Count again using the operator's spin label."}};
 return{prompt:"For the fixed free-dimer pure ground state and normalized coherent probe at φ=π, what are the removal and addition weights?",rows:[['',"Choose your prediction first"],['half','1/2、1/2'],['phase','0、1'],['none','0、0']],answer:'phase',
  feedback:{half:"Weights of 1/2 each describe the local probe or the average of randomly selected local measurements here. A coherent probe requires adding amplitudes with their phases first.",phase:"At φ=π the removal amplitude cancels and the addition amplitude survives. The two weights still sum to 1.",none:"Cancellation of removal does not require cancellation of addition. The creation operator uses conjugated coefficients and its own fermionic signs."}};
}
function checkHTML(prefix,state,index){
 const q=question(state,index),choice=state.choices[index],checked=state.checked[index]&&choice,correct=choice===q.answer;
 return `<section class="hub-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,"Your prediction",q.rows,choice)}${button(prefix+'-check'+index,"Check this step",!choice||index===0&&state.actionStep<3)}<p id="${prefix}-feedback${index}" class="hub-feedback${checked&&correct?' hub-correct':''}" role="status">${checked?(correct?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function actionHTML(state){
 const a=actionFor(state),steps=[];
 if(state.actionStep>=1)steps.push('<li>'+ (a.create?(a.occupied?"The target mode is occupied: another creation is forbidden by the Pauli principle.":"The target mode is empty: creation is permitted."):(a.occupied?"The target mode is occupied: annihilation is permitted.":"The target mode is empty: annihilation gives zero."))+'</li>');
 if(state.actionStep>=2)steps.push("<li>Occupied preceding modes:"+esc(a.lowerModes.map(i=>modes[i]).join(', ')||"None")+'。'+inline('(-1)^{'+a.lowerModes.length+'}='+(a.parity?'-1':'1'))+"<p>If the occupation condition forbids the operation, its reordering sign cannot turn zero into a nonzero result.</p></li>");
 if(state.actionStep>=3)steps.push('<li>'+formula(opTex(a.mode,a.create)+ketTex(a.state)+'='+(a.target===null?'0':(a.sign<0?'-':'')+ketTex(a.target)))+(a.target===null?"<p>The action gives the zero vector, with no nonzero target state to normalize.</p>":"<p>Source sector "+inline('('+a.sourceSector.join(',')+')')+", target sector "+inline('('+a.targetSector.join(',')+')')+'</p>')+'</li>');
 return steps.length?'<ol class="hub-action-steps">'+steps.join('')+'</ol>':"<p class=\"hub-await\">Choose a sign prediction, then reveal the occupation check, fermionic sign, and target state.</p>";
}
function occupationHTML(state){
 const a=actionFor(state);
 return `<div class="hub-occupations" role="group" aria-label="Current occupations in mode order">${a.occupations.map((n,i)=>`<div class="hub-occupation ${i===a.mode?'hub-target-mode':a.lowerModes.includes(i)?'hub-parity-mode':''}"><span>${modes[i]}</span><strong>${n}</strong></div>`).join('')}</div><p>The gold border marks the target mode. Green cells mark occupied preceding modes, which contribute to the sign count.</p>`;
}
function matrixHTML(state){
 const m=hubbardActionMatrix({mode:Number(state.mode),create:state.operation==='create'}),selected=Number(state.basis);
 return `<p>This table always uses the four-dimensional source sector (1,1). Its columns follow 5,9,6,10, rather than ascending integer order. Rows label the target basis states of the current operator.</p>${formula(opTex(m.mode,m.create)+':\\mathcal H_{(1,1)}\\longrightarrow\\mathcal H_{('+m.targetSector.join(',')+')}')}<div class="hub-table-wrap" tabindex="0"><table><caption>Rectangular operator: target states in rows, source states in columns</caption><thead><tr><th scope="col">Target / source</th>${m.sourceBasis.map(s=>`<th scope="col" ${s===selected?'class="hub-selected-column"':''}>${esc(ket(s))}</th>`).join('')}</tr></thead><tbody>${m.matrix.map((row,r)=>`<tr><th scope="row">${esc(ket(m.targetBasis[r]))}</th>${row.map((n,col)=>`<td ${m.sourceBasis[col]===selected?'class="hub-selected-column"':''}>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${HUBBARD_SOURCE_BASIS.includes(selected)?"The highlighted column is the selected source occupation state. Read down that column to find the nonzero target and its sign.":"The selected occupation state is outside this fixed source sector, so this table has no highlighted column for it."}</p>`;
}
function spectralHTML(state){
 const r=hubbardSpectralReference(state),processNames={removal:"Removal",addition:"Addition"},headers=["process","Bonding amplitude","Bonding weight","Bonding candidate coordinate / eV","Antibonding weight","Antibonding candidate coordinate / eV"];
 const atNumericalEndpoint=r.probe==='phase'&&Math.abs(Math.abs(r.phi)-Math.PI)<=32*Number.EPSILON*Math.PI;
 const rows=['removal','addition'].map(kind=>{const p=r[kind];return[processNames[kind],inline(complexTex(p.bonding.amplitude)),fmt(p.bonding.weight),p.bonding.coordinate,fmt(p.antibonding.weight),p.antibonding.coordinate];});
 return `<p>This spectral example fixes spin up independently of the earlier single-state action. The target basis and operators use the same declared mode order.</p>${formula('\\lvert G\\rangle=\\tfrac12\\begin{pmatrix}1\\\\1\\\\1\\\\1\\end{pmatrix},\\quad E_0=-2\\,\\mathrm{eV},\\quad\\lvert b\\rangle=\\tfrac1{\\sqrt2}\\begin{pmatrix}1\\\\1\\end{pmatrix},\\quad\\lvert a\\rangle=\\tfrac1{\\sqrt2}\\begin{pmatrix}1\\\\-1\\end{pmatrix}')}
 <p>Four positive coefficients in this Fock basis are consistent with a physical spin singlet. Site-ordered spin product kets must first be reordered into the declared creation-operator convention before transferring their phases.</p>
 ${formula(r.probe==='local0'?'c=c_{0\\uparrow}':'c_\\phi=\\tfrac1{\\sqrt2}(c_{0\\uparrow}+e^{-i\\phi}c_{1\\uparrow}),\\quad\\phi='+texNumber(r.phi))}
 ${table("Probe coefficients: addition uses the Hermitian adjoint of annihilation",["process","Site 0 coefficient","Site 1 coefficient"],['removal','addition'].map(kind=>[processNames[kind],inline(complexTex(r[kind].coefficients[0])),inline(complexTex(r[kind].coefficients[1]))]))}
 ${['removal','addition'].map(kind=>{const p=r[kind];return `<section class="hub-overlap"><h4>${processNames[kind]}: act first, then project</h4><p>Target occupation basis:${p.targetBasis.map(s=>esc(ket(s))).join(', ')}。</p>${formula((kind==='removal'?'c':'c^\\dagger')+'\\lvert G\\rangle='+vectorTex(p.acted))}${formula('A_b='+complexTex(p.contributions[0])+'+('+complexTex(p.contributions[1])+')='+complexTex(p.bonding.amplitude)+',\\quad w_b=|A_b|^2='+texNumber(p.bonding.weight))}<p>These terms are local-path amplitudes leading to the same bonding final state. Subtracting the two target coefficients gives the antibonding overlap, whose weight is ${inline(texNumber(p.antibonding.weight))}。</p></section>`;}).join('')}
 ${r.probe==='phase'?`<section class="hub-phase-closedform"><h4>Closed-form weights of the normalized coherent probe</h4>${formula('W_-=\\cos^2(\\phi/2),\\qquad W_+=\\sin^2(\\phi/2)')}<p>This is still the same fixed free dimer. Adding the path amplitudes with their phases and then taking the squared magnitude gives these two weights.</p></section>`:''}
 ${atNumericalEndpoint?"<p class=\"hub-boundary hub-endpoint-note\">Exactly φ=±π gives removal weight 0 and addition weight 1. A control may reach the endpoint only to machine precision, and floating-point trigonometric functions can leave tiny residuals. The table retains the raw values. These endpoint residuals are not additional visible spectral peaks or evidence of an incorrect prediction.</p>":''}
 ${table("Energy differences give candidate positions; nonzero overlaps give spectral weights",headers,rows)}
 <p>The bonding final-state energy is −1 eV and the antibonding energy is +1 eV. The antibonding candidate has a nonzero energy difference but zero overlap; the bonding candidate can also become dark through coherent cancellation. Zero-weight candidates are not visible spectral peaks.</p>
 ${formula('W_-+W_+='+texNumber(r.removal.totalWeight)+'+'+texNumber(r.addition.totalWeight)+'='+texNumber(r.totalWeight))}
 ${state.comparison?`<section class="hub-comparison"><h4>Coherent and random local measurements differ</h4><p>A coherent phase probe adds complex amplitudes to the same final state before squaring. If each measurement instead selects the local probe at site 0 or 1 with equal probability, average after squaring: removal and addition each have weight 1/2 here. This random measurement is not an alternative algorithm for the coherent probe.</p>${formula('W_-^{\\mathrm{random}}=\\tfrac12 W_-(c_0)+\\tfrac12 W_-(c_1)=\\tfrac12,\\quad W_+^{\\mathrm{random}}=\\tfrac12')}<p>Unresolved signals from orthogonal final states also sum after squaring. For a statistical mixture of initial states, average with the mixture probabilities as well. Only coherent paths to the same final state add as amplitudes first.</p></section>`:''}`;
}

function bodyHTML(prefix,state,canOpenLab){
 const sourceStates=state.allStates?Array.from({length:16},(_,i)=>i):[...HUBBARD_SOURCE_BASIS];
 const phaseLabel="Probe phase φ / rad",noteLabel="Write one sentence of explanation in your own words (this page session only)";
 const copyStatus=state.copyOutcome==='success'?"The reference input has been copied. Run the calculation manually in the experiment.":state.copyOutcome==='error'?(state.copyError||"The reference input could not be copied. Please retry."):'';
 return `<p>The mode order is fixed as 0↑,1↑,0↓,1↓. Occupation strings list spin-up modes before the semicolon and spin-down modes after it; this is not a high-bit-first binary display.</p><p>In the definition below, subscripts 0,1,2,3 are mode indices corresponding to these four entries in order.</p>${formula('\\lvert n_0n_1;n_2n_3\\rangle=(c_0^\\dagger)^{n_0}(c_1^\\dagger)^{n_1}(c_2^\\dagger)^{n_2}(c_3^\\dagger)^{n_3}\\lvert\\mathrm{vac}\\rangle')}
 <p>Creation operators are written in ascending mode order and act from right to left. A single operator's sign depends on the number of occupied modes preceding its target.</p>
 <section class="hub-stage"><h3>1 · Apply an operator to one occupation state</h3>${checkbox(prefix+'-all',"Explore all 16 occupation states",state.allStates)}<p>All 16 occupation states, four modes, and two operations give 128 combinations. The default view uses the four basis states in sector (1,1).</p><div class="hub-controls">${select(prefix+'-basis',"Source occupation state",sourceStates.map(s=>[String(s),ket(s)+' · '+String(s)]),state.basis)}${select(prefix+'-mode',"Target mode of the operator",modes.map((name,i)=>[String(i),name]),state.mode)}${select(prefix+'-operation',"Operation",[['remove',"Annihilation"],['create',"Creation"]],state.operation)}</div>${occupationHTML(state)}${formula(opTex(Number(state.mode),state.operation==='create')+ketTex(Number(state.basis)))}${checkHTML(prefix,state,0)}${button(prefix+'-step',state.actionStep<3?"Expand to next step":"Reveal again",!state.choices[0])}<div id="${prefix}-action">${actionHTML(state)}</div></section>
 <section class="hub-stage"><h3>2 · Write the action as a matrix between sectors</h3>${checkHTML(prefix,state,1)}<details data-hub-native="matrix" ${state.matrixOpen?'open':''}><summary>Show the rectangular operator and its row and column bases</summary>${matrixHTML(state)}</details></section>
 <section class="hub-stage"><h3>3 · From the resulting vector to spectral weight</h3><p>This section fixes L=2, t=1 eV, U=Δ=μ=0, open boundaries, and the unique pure ground state. It does not use general interacting inputs from the current calculator.</p><details data-hub-native="spectrum" ${state.spectrumOpen?'open':''}><summary>Show operator action and overlaps for the fixed free dimer</summary><div class="hub-controls">${select(prefix+'-probe',"Spectral probe",[['local0',"Local probe at site 0"],['phase',"Normalized coherent phase probe"]],state.probe)}<label for="${prefix+'-phi'}">${phaseLabel}<input id="${prefix+'-phi'}" type="range" min="${-Math.PI}" max="${Math.PI}" step="any" value="${state.phi}"><output id="${prefix}-phi-value">${fmt(state.phi)}</output></label></div><div class="hub-controls hub-phase-buttons">${button(prefix+'-phase0','φ=0')}${button(prefix+'-phasehalf','φ=π/2')}${button(prefix+'-phasepi','φ=π')}</div><p>The phase buttons select the coherent probe. The local probe is independent of φ. For the open dimer, q=φ/π specifies a probe phase, rather than a strict crystal-momentum quantum number.</p>${checkbox(prefix+'-comparison',"Compare the probability average of random local probes",state.comparison)}<div id="${prefix}-spectrum">${spectralHTML(state)}</div></details><p>The prediction below fixes φ=π; use the controls above to check it.</p>${checkHTML(prefix,state,2)}</section>
 <label class="hub-note-label" for="${prefix+'-note'}">${noteLabel}<textarea id="${prefix+'-note'}" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>
 <p class="hub-boundary">Single-state actions use the finite four-mode reference, and the spectral derivation uses the specified free-dimer pure state. The existing Python tools calculate general interacting models, degenerate initial states, and complete spectra. This bridge does not change course mastery records.</p>
 ${canOpenLab?button(prefix+'-copy',"Copy the current reference probe to the experiment for a manual calculation"):"<p>In the spectral-weight lesson, select a reference probe and copy it to the experiment. This link opens the lesson without transferring the current phase.</p><p><a href=\"#classroom/observables?module=manybody&lesson=manybody-lehmann&tab=learn\">Open the spectral-weight lesson and reference probe →</a></p>"}<p id="${prefix}-copy-status" role="status">${esc(copyStatus)}</p><p><a href="#classroom/observables?module=manybody&lesson=manybody-checks&tab=learn">Continue to degenerate averaging and sum rules →</a></p>${button(prefix+'-reset',"Reset this optional experiment")}`;
}

export function hubbardBridgeHTML(lessonId){
 if(!Object.hasOwn(HUBBARD_BRIDGE_HOOKS,lessonId))return '';
 return "<section class=\"hub-prerequisite\" aria-label=\"Optional occupation-to-spectral-weight bridge\"><p class=\"hub-optional\">New to connecting occupation-number states with spectral weights? Open this fixed example, or continue with the lesson if you already know operators and matrix elements.</p><details class=\"hub-bridge\" data-hub-bridge=\"fock-to-lehmann\"><summary>From one occupation-number action to a spectral line</summary><div class=\"hub-body\" data-hub-body=\"fock-to-lehmann\"></div></details></section>";
}

export function bindHubbardLearningBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const store=stateStore instanceof Map?stateStore:new Map(),storeKey=lessonId+':fock-to-lehmann';
 const supported=Object.hasOwn(HUBBARD_BRIDGE_HOOKS,lessonId),detail=supported?root?.querySelector?.('[data-hub-bridge="fock-to-lehmann"]'):null,body=supported?root?.querySelector?.('[data-hub-body="fock-to-lehmann"]'):null;
 const state=restored(store.get(storeKey)),prefix='hub-'+lessonId;let alive=true,ticket=0,busy=false;
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-hub-bridge="fock-to-lehmann"]')===detail&&root.querySelector('[data-hub-body="fock-to-lehmann"]')===body;
 const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 const save=()=>{if(detail&&body)store.set(storeKey,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[key,field]of [['matrix','matrixOpen'],['spectrum','spectrumOpen']]){const node=body.querySelector('[data-hub-native="'+key+'"]');if(node)state[field]=readOpen(node);}const note=body.querySelector('#'+prefix+'-note');if(note)state.note=String(note.value).slice(0,2000);save();};
 const $=suffix=>body?.querySelector('#'+prefix+'-'+suffix);
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute?.('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,lessonId==='manybody-lehmann'&&typeof onOpenLab==='function');save();
   for(const[key,field]of [['matrix','matrixOpen'],['spectrum','spectrumOpen']]){const node=body.querySelector('[data-hub-native="'+key+'"]');node.ontoggle=()=>{if(active()&&body.querySelector('[data-hub-native="'+key+'"]')===node){state[field]=readOpen(node);save();}};}
   const invalidate=()=>{ticket++;state.copyOutcome='';state.copyError='';const status=$('copy-status');if(status)status.textContent='';};
   const bind=(suffix,event,action,{redraw=true}={})=>{const control=$(suffix);if(!control)return;control[event]=()=>{if(!active()||$(suffix)!==control||control.disabled)return;captureNative();action(control);save();if(redraw){draw();$(suffix==='reset'?'basis':suffix)?.focus?.({preventScroll:true});}};};
   const resetQuestion=index=>{state.choices[index]='';state.checked[index]=false;if(index===0)state.actionStep=0;};
   bind('all','onchange',control=>{state.allStates=control.checked;if(!state.allStates&&!HUBBARD_SOURCE_BASIS.includes(Number(state.basis)))state.basis='5';resetQuestion(0);invalidate();});
   bind('basis','onchange',control=>{const allowed=state.allStates?Array.from({length:16},(_,i)=>String(i)):HUBBARD_SOURCE_BASIS.map(String);if(allowed.includes(control.value))state.basis=control.value;resetQuestion(0);invalidate();});
   for(const name of ['mode','operation'])bind(name,'onchange',control=>{if((name==='mode'?['0','1','2','3']:['remove','create']).includes(control.value))state[name]=control.value;resetQuestion(0);resetQuestion(1);invalidate();});
   for(let i=0;i<3;i++){
    bind('q'+i,'onchange',control=>{state.choices[i]=question(state,i).rows.some(([key])=>key===control.value)?control.value:'';state.checked[i]=false;});
    bind('check'+i,'onclick',()=>{state.checked[i]=true;});
   }
   bind('step','onclick',()=>{state.actionStep=state.actionStep>=3?0:state.actionStep+1;state.checked[0]=false;});
   bind('probe','onchange',control=>{if(['local0','phase'].includes(control.value))state.probe=control.value;invalidate();});
   bind('phi','oninput',control=>{const value=Number(control.value);if(!Number.isFinite(value)||Math.abs(value)>Math.PI)return;state.phi=value;invalidate();const output=$('phi-value'),result=$('spectrum');if(output)output.textContent=fmt(state.phi);if(result)result.innerHTML=spectralHTML(state);},{redraw:false});
   for(const[name,value]of [['phase0',0],['phasehalf',Math.PI/2],['phasepi',Math.PI]])bind(name,'onclick',()=>{state.phi=value;state.probe='phase';invalidate();});
   bind('comparison','onchange',control=>{state.comparison=control.checked;});
   bind('note','oninput',control=>{state.note=String(control.value).slice(0,2000);},{redraw:false});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});invalidate();});
   const copyButton=$('copy');if(copyButton){copyButton.disabled=busy;copyButton.onclick=async()=>{
    if(!active()||$('copy')!==copyButton||busy)return;captureNative();const id=++ticket,request=hubbardBridgeLabRequest(state);busy=true;copyButton.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{await onOpenLab(clone(request));if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent="The reference input has been copied. Run the calculation manually in the experiment.";save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||"The reference input could not be copied. Please retry.").slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active())$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const selector of ['button','select','input','textarea'])for(const node of body.querySelectorAll(selector)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-hub-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return supported?{'fock-to-lehmann':clone(state)}:{};};return cleanup;
}
