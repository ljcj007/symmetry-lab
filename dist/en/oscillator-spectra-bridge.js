import {mathHTML} from './math-display.js?v=20261113-prose2';

// Finite teaching views of number-state algebra. Scientific experiments remain
// the existing Python tools; this module never starts a worker.
export const OSCILLATOR_SPECTRA_BRIDGE_HOOKS=Object.freeze({
 'scattering-temperature':Object.freeze(['ladder-weights']),
 'polaron-hamiltonian':Object.freeze(['vacuum-motion']),
 'polaron-truncation':Object.freeze(['finite-boundary'])
});
// Verified against the fixed default chain, not fitted material constants.
export const OSCILLATOR_SPECTRA_REFERENCE=Object.freeze({energyMeV:33.76000230359114,bareWeight:.014377525835849128,kBMeVK:.08617333262145});
export const OSCILLATOR_HALF_RATIO_TEMPERATURE=OSCILLATOR_SPECTRA_REFERENCE.energyMeV/(OSCILLATOR_SPECTRA_REFERENCE.kBMeVK*Math.LN2);
const CHAIN=Object.freeze({lattice:4,massA:23,massB:35.45,springIntra:2,springInter:2,basisFraction:.5,scatterA:1,scatterB:1,angle:0,selectedQ:1.8,temperature:300,sigma:.5,qMin:0,qMax:4,energyMin:-50,energyMax:50,energyCutoff:.25,qPoints:81,energyPoints:401,channel:'both'});
const {energyMeV:epsilon,bareWeight:W,kBMeVK:kB}=OSCILLATOR_SPECTRA_REFERENCE;
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(5):Number(value.toFixed(8)).toString();
const tex=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const formula=value=>`<div class="osb-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const inline=value=>`<span class="osb-inline">${mathHTML(value)}</span>`;
const table=(caption,heads,rows)=>`<div class="osb-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
const integer=(value,max=10)=>{if(!Number.isInteger(value)||value<0||value>max)throw Error('The finite number-state reference requires a stated nonnegative integer.');return value;};
const temperature=value=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1500)throw Error('The fixed-chain teaching temperature must be from 0 to 1500 K.');return value;};

/** The main source display is m=0..5; the cutoff card also uses m<=10.
 * A zero result is a zero vector, not a normalized target state.
 */
export function oscillatorLadderAction({m=0,create=true}={}){
 integer(m);if(typeof create!=='boolean')throw Error('The ladder direction must be a boolean.');
 const allowed=create||m>0,strength=allowed?(create?m+1:m):0;
 return{m,create,target:allowed?m+(create?1:-1):null,amplitude:Math.sqrt(strength),strength,
  deltaQuanta:allowed?(create?1:-1):null};
}

/** A rectangular restriction of infinite operators, not a closed truncation. */
export function oscillatorLadderMatrix({create=true}={}){
 if(typeof create!=='boolean')throw Error('The ladder direction must be a boolean.');
 const matrix=Array.from({length:7},()=>Array(6).fill(0));
 for(let m=0;m<6;m++){const action=oscillatorLadderAction({m,create});if(action.target!==null)matrix[action.target][m]=action.amplitude;}
 return{create,sourceStates:[0,1,2,3,4,5],targetStates:[0,1,2,3,4,5,6],matrix};
}

/** Stable infinite-distribution reference; m=0..5 are only visible rows.
 * Positive-temperature ratios beyond the floating-point range use a stated
 * numerical limit. The existing core independently zeros n when x>700;
 * its tiny cold approximation is reported, not changed by this module.
 */
export function oscillatorScatteringReference({temperature:T=300,m=0,create=true}={}){
 temperature(T);integer(m,5);const ladder=oscillatorLadderAction({m,create}),action={...ladder,transferEnergyMeV:ladder.deltaQuanta===null?null:ladder.deltaQuanta*epsilon};
 const exact=T===OSCILLATOR_HALF_RATIO_TEMPERATURE,ratio=T===0?null:exact?Math.LN2:epsilon/(kB*T),ratioOverflow=ratio===Infinity,x=ratioOverflow?null:ratio;
 const cold=T>0&&(ratioOverflow||x>745),r=T===0||cold?0:exact ? .5 : Math.exp(-x),oneMinus=T===0||cold?1:exact ? .5 : -Math.expm1(-x),occupation=exact?1:r/oneMinus;
 const probability=j=>T===0?(j===0?1:0):oneMinus*r**j;
 const rows=Array.from({length:6},(_,j)=>({m:j,probability:probability(j),downStrength:j,upStrength:j+1,
  weightedDown:j*probability(j),weightedUp:(j+1)*probability(j)}));
 const probabilityTail=r**6,downTail=probabilityTail*(6+occupation),upTail=probabilityTail*(7+occupation);
 const pairForward=probability(m)*(m+1),pairReverse=probability(m+1)*(m+1);
 return{temperature:T,epsilon,bareWeight:W,x,ratioOverflow,exactGeometricHalf:exact,numericalUnderflow:cold,
  coreColdApproximation:T>0&&(ratioOverflow||x>700),r,occupation,action,rows,
  selectedProbability:probability(m),selectedWeightedStrength:probability(m)*action.strength,
  tails:{probability:probabilityTail,annihilation:downTail,creation:upTail},
  visible:{probability:rows.reduce((s,row)=>s+row.probability,0),annihilation:rows.reduce((s,row)=>s+row.weightedDown,0),creation:rows.reduce((s,row)=>s+row.weightedUp,0)},
  total:{annihilation:occupation,creation:occupation+1},
  pair:{lower:m,upper:m+1,forwardInitialProbability:probability(m),reverseInitialProbability:probability(m+1),matrixElementSquared:m+1,
   forward:pairForward,reverse:pairReverse,rowRatio:pairForward>0?pairReverse/pairForward:null,analyticPositiveTemperatureRatio:T>0?r:null},
  peaks:{stokes:{energy:epsilon,weight:W*(occupation+1)},antiStokes:{energy:-epsilon,weight:W*occupation}},
  meanX:0,meanX2:2*occupation+1};
}

/** One exact number state, not a thermal or coupled polaron initial state. */
export function oscillatorVacuumReference({m=0}={}){
 integer(m,5);return{m,annihilation:oscillatorLadderAction({m,create:false}),creation:oscillatorLadderAction({m,create:true}),
  meanX:0,meanX2:2*m+1,varianceX:2*m+1,phononNumber:m};
}

/** Square finite operators; their top boundary differs from the display above. */
export function oscillatorFiniteBoundary({cutoff=6,m=cutoff}={}){
 if(![2,6,10].includes(cutoff))throw Error('The cutoff card supports 2, 6 or 10.');integer(m,cutoff);
 const size=cutoff+1,b=Array.from({length:size},()=>Array(size).fill(0));for(let j=1;j<size;j++)b[j-1][j]=Math.sqrt(j);
 const creation=b.map((row,i)=>row.map((_v,j)=>b[j][i])),bbdag=m<cutoff?m+1:0,bdagb=m;
 return{cutoff,m,dimension:size,annihilation:b,creation,commutatorDiagonal:Array.from({length:size},(_,j)=>j<cutoff?1:-cutoff),
  bbdag,bdagb,commutator:bbdag-bdagb,finiteCreationTarget:m<cutoff?m+1:null,infiniteCreationTarget:m+1,
  infiniteCreationAmplitude:Math.sqrt(m+1),topBoundary:m===cutoff};
}

/** Legal full fixed-chain input. No selected m, W, epsilon or band is posted. */
export function oscillatorSpectraLabRequest({temperature:T=300}={}){
 temperature(T);return{action:'dynamic_scattering_lab',module:'scattering',input:{...CHAIN,temperature:T}};
}

const checks=[
 {prompt:"Starting from the m=2 number state, what are the amplitude and squared matrix element for creating one phonon?",answer:'sqrt',rows:[['sqrt','√3、3'],['three','3、3'],['unit','1、1'],['down','√2、2']],feedback:{
  sqrt:"b†|2⟩=√3|3⟩. The transition-strength factor is the squared amplitude, 3.",three:"3 is the squared matrix element; the amplitude is √3. These are different quantities.",unit:"Normalizing the target state does not let us discard the original norm. Doing so would incorrectly assign strength 1 to every nonzero transition.",down:"√2 and 2 describe annihilation from |2⟩. Creation uses m+1."}},
 {prompt:"At zero temperature with nonzero bare weight, which side remains, and where does the phonon energy come from?",answer:'positive',rows:[['positive',"Positive-energy Stokes; the probe supplies energy"],['none',"Neither side, because the mean phonon number is zero"],['negative',"The negative-energy side; the lattice supplies energy"],['half',"Consume half a thermal phonon from the zero-point term"]],feedback:{
  positive:"b†|0⟩=|1⟩, so the creation matrix element is nonzero. Positive E means that the probe loses energy and the lattice gains ε; b|0⟩=0.",none:"Having no thermal phonons to annihilate does not prevent the probe from supplying energy to create a phonon.",negative:"Negative E means that the probe gains energy, which requires a phonon in the initial state to annihilate. The vacuum cannot provide this process.",half:"Zero-point energy is not half an existing thermal phonon. The +1 comes from the matrix element of b b†, not from extracting vacuum energy."}},
 {prompt:"At r=1/2, the probability of m≥6 is 1/64. Can this be used as the missing strength on both sides?",answer:'weighted',rows:[['weighted',"No; the downward tail is 7/64 and the upward tail is 8/64"],['same',"Yes; add 1/64 to both sides"],['normalize',"Remove the tail and renormalize the six rows"],['clip',"Set creation from the highest visible state to zero"]],feedback:{
  weighted:"Multiply each probability by m or m+1 before summing. The probability tail and the two transition-strength tails are three different quantities.",same:"Higher number states have larger matrix elements. Their unweighted total probability cannot replace their weighted strength.",normalize:"This replaces the original infinite oscillator with a truncated, renormalized thermal model.",clip:"m=5 is only the top of the display window. b† still maps it to √6|6⟩; this display imposes no physical occupation limit."}}
];
function kindFor(id){return Object.hasOwn(OSCILLATOR_SPECTRA_BRIDGE_HOOKS,id)?OSCILLATOR_SPECTRA_BRIDGE_HOOKS[id][0]:null;}
const initial=kind=>({open:false,matrixOpen:false,proofOpen:false,boundaryOpen:false,temperature:300,m:kind==='finite-boundary'?6:0,create:true,actionStep:0,cutoff:6,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved,kind){
 const state=initial(kind);if(!saved||typeof saved!=='object')return state;
 for(const name of ['open','matrixOpen','proofOpen','boundaryOpen'])if(typeof saved[name]==='boolean')state[name]=saved[name];
 if(typeof saved.temperature==='number'&&Number.isFinite(saved.temperature)&&saved.temperature>=0&&saved.temperature<=1500)state.temperature=saved.temperature;
 if([2,6,10].includes(saved.cutoff))state.cutoff=saved.cutoff;
 if(Number.isInteger(saved.m)&&saved.m>=0&&saved.m<=(kind==='finite-boundary'?state.cutoff:5))state.m=saved.m;
 if(typeof saved.create==='boolean')state.create=saved.create;if(Number.isInteger(saved.actionStep)&&saved.actionStep>=0&&saved.actionStep<=3)state.actionStep=saved.actionStep;
 for(let i=0;i<3;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);return state;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button id="${id}" type="button" ${disabled?'disabled':''}>${label}</button>`;
const mOptions=max=>Array.from({length:max+1},(_,m)=>[m,'m = '+m]);
function actionHTML(state){
 if(!state.actionStep)return "<p>Predict the target number state, amplitude and energy direction, then reveal the steps.</p>";
 const a=oscillatorScatteringReference(state).action,items=[];
 if(state.actionStep>=1)items.push('<li>'+(a.target===null?"b|0⟩ is the zero vector; there is no nonzero target state to normalize.":"Target number state:"+inline('\\lvert '+a.target+'\\rangle')+'。')+'</li>');
 if(state.actionStep>=2)items.push('<li>'+formula((a.create?'b^\\dagger':'b')+'\\lvert '+a.m+'\\rangle='+(a.target===null?'0':'\\sqrt{'+a.strength+'}\\lvert '+a.target+'\\rangle'))+formula('|A|^2='+a.strength)+"<p>A squared matrix element is a factor in a strength or transition rate and may exceed 1. It is not, by itself, a normalized event probability.</p></li>");
 if(state.actionStep>=3)items.push('<li>'+(a.target===null?"<p>A zero matrix element produces no inelastic line; it cannot be assigned a visible negative-energy peak.</p>":formula('E=E_f^{\\rm system}-E_i^{\\rm system}='+(a.create?'+':'-')+'\\epsilon='+tex(a.transferEnergyMeV)+'\\,\\mathrm{meV}')+'<p>'+(a.create?"The system gains ε and the probe loses ε: positive-energy Stokes.":"The system loses ε and the probe gains ε: negative-energy anti-Stokes.")+'</p>')+'</li>');
 return '<ol>'+items.join('')+'</ol>';
}
function ladderMatrixHTML(state){
 const r=oscillatorLadderMatrix(state);
 return table("Rows are target states and columns are initial states; targets include |6⟩",["Target / initial state",...r.sourceStates.map(m=>inline('\\lvert '+m+'\\rangle'))],r.matrix.map((row,i)=>[inline('\\lvert '+i+'\\rangle'),...row.map((v,j)=>`<span class="${j===state.m?'osb-selected-column':''}">${v?inline('\\sqrt{'+(state.create?j+1:j)+'}'):'0'}</span>`)]))+
 "<p>This 7×6 window displays part of an infinite operator; it is not a closed six-state truncation. It retains b†|5⟩=√6|6⟩.</p>";
}
function ledgerHTML(state){
 const r=oscillatorScatteringReference(state);
 return formula('T='+tex(r.temperature)+'\\,\\mathrm K,\\qquad\\overline n='+tex(r.occupation))+
 (r.coreColdApproximation?"<p class=\"osb-scope\">This positive temperature is extremely low. The local number-state reference retains representable tiny thermal terms, whereas the existing scattering experiment sets thermal occupation to zero for x>700. The local reference also returns numerical zero beyond the floating-point range. These are numerical approximations, not another exact zero-temperature state. Copying inputs does not change the existing core.</p>":'')+
 table("Weight squared matrix elements by initial-state probabilities, then add strengths",['m','pₘ',"Downward pₘ m","Upward pₘ(m+1)"],r.rows.map(row=>[row.m===state.m?'<strong>'+row.m+'</strong>':row.m,fmt(row.probability),fmt(row.weightedDown),fmt(row.weightedUp)]))+
 formula('\\rho=\\sum_m p_m\\lvert m\\rangle\\langle m\\rvert,\\qquad I/W=\\sum_m p_m|A_m|^2')+
 "<p>Thermal initial states form a statistical mixture; do not add row amplitudes with coefficients √pₘ. Coherent atomic paths leading to the same mode are already included in the bare weight W. That coherence occurs at a different level.</p>"+
 formula('p_{'+state.m+'}|A|^2='+tex(r.selectedWeightedStrength))+"<p>The selected initial state's row contribution is shown above. An allowed operator action does not guarantee nonzero probability for that thermal initial state.</p>";
}
function tailsHTML(state){
 const r=oscillatorScatteringReference(state);
 return formula('r=e^{-\\epsilon/(k_BT)},\\qquad p_m=(1-r)r^m')+
 table("Calculate three separate tails without renormalizing the first six rows",["Quantity","Visible sum over m=0…5","Tail for m≥6","Full sum"],[
  ["Probability",fmt(r.visible.probability),fmt(r.tails.probability),'1'],
  ["Annihilation strength / W",fmt(r.visible.annihilation),fmt(r.tails.annihilation),fmt(r.total.annihilation)],
  ["Creation strength / W",fmt(r.visible.creation),fmt(r.tails.creation),fmt(r.total.creation)]])+
 formula('P(m\\ge6)=r^6,\\quad\\sum_{m\\ge6}mp_m=r^6(6+\\overline n),\\quad\\sum_{m\\ge6}(m+1)p_m=r^6(7+\\overline n)')+
 (r.exactGeometricHalf?"<p class=\"osb-exact\">Here r=1/2 and n̄=1: the probability tail is 1/64, the downward-strength tail is 7/64, and the upward-strength tail is 8/64. The full downward and upward strengths are 1 and 2.</p>":"<p>Higher number states with small probabilities also carry larger matrix-element factors. A probability tail cannot directly replace a strength tail.</p>");
}
function pairHTML(state){
 const r=oscillatorScatteringReference(state),p=r.pair;
 return "<p>Here the selected m labels the lower state of a transition pair: forward creation starts from m, and reverse annihilation starts from m+1. They use different initial-state probabilities.</p>"+
 formula('\\lvert '+p.lower+'\\rangle\\;\\xrightleftharpoons[b]{b^\\dagger}\\;\\lvert '+p.upper+'\\rangle')+
 table("A microscopic reverse pair: equal squared matrix elements, different initial probabilities",["Direction","Initial-state probability","Squared matrix element","Strength divided by the common bare weight"],[
  ["Creation: m→m+1",fmt(p.forwardInitialProbability),p.matrixElementSquared,fmt(p.forward)],
  ["Annihilation: m+1→m",fmt(p.reverseInitialProbability),p.matrixElementSquared,fmt(p.reverse)]])+
 (p.rowRatio===null?"<p class=\"osb-scope\">This pair of displayed rows has no nonzero numerical forward weight to divide by. Two zero rows cannot determine a temperature. The analytic probability relation at positive temperature can still be stated separately.</p>":formula('I_{\\rm reverse}/I_{\\rm forward}='+tex(p.rowRatio)))+
 formula('\\frac{p_{m+1}(m+1)}{p_m(m+1)}=r,\\qquad\\frac{I_-}{I_+}=\\frac{\\overline n}{\\overline n+1}=e^{-\\epsilon/(k_BT)}')+
 "<p>The first ratio requires nonzero initial-state probability; zero temperature is handled separately with p₀=1. The +1 comes from the matrix element of b b†; zero-point energy is not half a pre-existing thermal phonon. A common energy shift changes neither transition energies nor these matrix elements.</p>";
}
function peaksHTML(state){
 const r=oscillatorScatteringReference(state);
 return table("Optical mode of the fixed chain: compare the optical row in the existing experiment",["Process",'E / meV',"Single-mode strength I/W","Relative integrated strength after multiplying by W"],[
  ["Stokes · creation",fmt(epsilon),fmt(r.total.creation),fmt(r.peaks.stokes.weight)],
  ["anti-Stokes · annihilation",fmt(-epsilon),fmt(r.total.annihilation),fmt(r.peaks.antiStokes.weight)]])+
 formula('W='+tex(W)+',\\quad I_+-I_-=W,\\quad (I_++I_-)/W=2\\overline n+1')+
 "<p>This is the optical reference of a fixed diatomic chain at full Q=1.8 Å⁻¹, with ε=33.7600023 meV. The existing experiment calculates both branches. Selecting the optical row here does not add a selected-band or arbitrary-energy input to the core.</p>"+
 "<p>βA and βB denote the signed scalar scattering amplitudes in the existing scatterA and scatterB fields, not the operators b and b†. W includes the coherent atomic sum, masses and longitudinal projection. A degenerate subspace's W must not be multiplied by its degeneracy again.</p>";
}
function boundaryExamplesHTML(){
 return "<p>Both sides can become dark when the longitudinal projection vanishes. If W=0, I₋/I₊ is 0/0 and cannot determine a temperature.</p><a href=\"#compute/dynamic-scattering-lab?preset=scattering-transverse\">Open the existing perpendicular-projection preset →</a>"+
 table("A separate verified example at fixed T=300 K and σ=8 meV",["Comparison","Ratio at E=±10 meV"],[["Broadened S(−10)/S(+10)",'0.33723847'],['exp(−10/kBT)','0.67921520']])+
 "<p>This table is independent of the current temperature control. Detailed balance is checked using unbroadened single-mode weights. Gaussian broadening, multiple modes and finite windows prevent direct use of pointwise curve ratios in that expression. The existing experiment does not derive lifetimes from σ.</p>";
}
function vacuumHTML(state){
 const r=oscillatorVacuumReference(state);
 return formula('X=b+b^\\dagger,\\qquad X\\lvert '+r.m+'\\rangle='+(r.m?'\\sqrt{'+r.m+'}\\lvert '+(r.m-1)+'\\rangle+':'')+'\\sqrt{'+(r.m+1)+'}\\lvert '+(r.m+1)+'\\rangle')+
 formula('\\langle X\\rangle=0,\\qquad\\langle X^2\\rangle=\\mathrm{Var}(X)='+r.meanX2)+
 "<p>The target number states are orthogonal, so their contributions to the squared norm of X add. A zero diagonal matrix element does not imply zero fluctuations of X.</p>"+
 (r.m===0?"<p class=\"osb-exact\">In the vacuum, b|0⟩=0 and b†|0⟩=|1⟩, giving ⟨X⟩=0 and ⟨X²⟩=1. Omitting the Hamiltonian's zero-point constant does not remove this fluctuation.</p>":"<p>This is an algebraic comparison with an excited number state; it does not set a temperature or excited initial state in the existing zero-temperature polaron experiment.</p>");
}
function finiteHTML(state){
 const r=oscillatorFiniteBoundary(state);
 return table("Finite square operators acting on the selected |m⟩",["Quantity","Value"],[["Maximum phonon number N",r.cutoff],["Selected number state m",r.m],['⟨bN bN†⟩',r.bbdag],['⟨bN† bN⟩',r.bdagb],['⟨[bN,bN†]⟩',r.commutator]])+
 formula('[b_N,b_N^\\dagger]=I-(N+1)\\lvert N\\rangle\\langle N\\rvert')+
 (r.topBoundary?"<p class=\"osb-scope\">The selected state is at the numerical boundary. The finite matrix truncates creation, while the infinite oscillator can still reach |N+1⟩. This is not a Pauli occupation limit for bosons.</p>":"<p>Away from the top state, the commutator acts as +1. The boundary difference is concentrated in the highest number state, rather than changing every column.</p>")+
 formula('b^\\dagger\\lvert '+r.m+'\\rangle=\\sqrt{'+(r.m+1)+'}\\lvert '+(r.m+1)+'\\rangle\\quad(\\mathrm{infinite})')+
 "<p>The negative top-state commutator is not a negative probability: both squared norms in the table are nonnegative, but their difference changes. After increasing the matrix size, still check the existing top-state probabilities and adjacent cutoffs, rather than only the solver residual.</p>";
}
function finiteMatrixHTML(state){
 const r=oscillatorFiniteBoundary(state);
 return table("Finite creation matrix: the highest initial-state column is truncated",["Target / initial state",...r.creation.map((_row,i)=>i)],r.creation.map((row,i)=>[i,...row.map(v=>v?inline('\\sqrt{'+Math.round(v*v)+'}'):'0')]))+
 formula('\\mathrm{diag}([b_N,b_N^\\dagger])=('+r.commutatorDiagonal.join(',')+')');
}
function checkHTML(prefix,state,index){
 const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice;
 return `<section class="osb-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,"Your prediction",[['',"Choose a prediction first"],...q.rows],choice)}${button(prefix+'-check'+index,"Check this step",!choice)}<p id="${prefix}-feedback${index}" class="osb-feedback${checked&&choice===q.answer?' osb-correct':''}" role="status">${checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function mainHTML(prefix,state,canOpenLab){
 return "<p class=\"osb-scope\">An optical reference from the fixed default diatomic chain illustrates number-state algebra and statistical weighting locally. It is not assigned to measured material data. Positive E means that the probe loses energy and the system gains energy.</p>"+
 `<section class="osb-stage"><h3>1 · Apply one operator and retain the amplitude's norm</h3><div class="osb-controls">${select(prefix+'-m',"Initial phonon number m",mOptions(5),state.m)}${select(prefix+'-direction',"Selected operator",[['create',"b† · creation"],['annihilate',"b · annihilation"]],state.create?'create':'annihilate')}</div>${button(prefix+'-step',state.actionStep>=3?"Hide this derivation":"Reveal the next step")}${button(prefix+'-m2',"Try creation from m=2")}<div id="${prefix}-action">${actionHTML(state)}</div><details data-osb-native="matrix" ${state.matrixOpen?'open':''}><summary>Read the same action as a column of a rectangular matrix</summary><div id="${prefix}-matrix">${ladderMatrixHTML(state)}</div></details></section>`+
 `<section class="osb-stage"><h3>2 · Multiply thermal probabilities by squared matrix elements</h3><label for="${prefix}-temperature">${"Temperature T / K"}<input id="${prefix}-temperature" type="range" min="0" max="1500" step="any" value="${state.temperature}"><output id="${prefix}-temperature-value">${fmt(state.temperature)} K</output></label><div class="osb-temperature-buttons">${button(prefix+'-t0','0 K')}${button(prefix+'-t300','300 K')}${button(prefix+'-thalf','r=1/2')}${button(prefix+'-t1500','1500 K')}</div><div id="${prefix}-ledger">${ledgerHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>3 · Account for three different tails</h3><div id="${prefix}-tails">${tailsHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>4 · Pair microscopic forward and reverse transitions</h3><div id="${prefix}-pair">${pairHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>5 · Return to the optical-mode weight table in the existing experiment</h3><div id="${prefix}-peaks">${peaksHTML(state)}</div><details data-osb-native="boundary" ${state.boundaryOpen?'open':''}><summary>Two cases where the ratio does not directly determine temperature</summary>${boundaryExamplesHTML()}</details>${canOpenLab?button(prefix+'-copy',"Copy the complete chain and current temperature to the existing experiment"):"<a href=\"#compute/dynamic-scattering-lab?preset=scattering-warm\">Open the existing 300 K chain-model preset →</a><p>A plain link does not transfer the current temperature. Enter it manually in the existing experiment, then run the calculation.</p>"}<p class="osb-copy-scope">Copying uses the complete default chain; the existing experiment calculates both acoustic and optical branches. The local m, operator direction and display window are not sent to the core. You still run it manually after copying.</p><p id="${prefix}-copy-status" class="osb-feedback" role="status">${state.copyOutcome==='success'?"Complete chain inputs copied. Run the existing experiment manually.":state.copyOutcome==='error'?esc(state.copyError):''}</p></section>`+
 `<section class="osb-stage"><h3>Three prediction checks</h3>${checks.map((_q,i)=>checkHTML(prefix,state,i)).join('')}</section>`;
}
function polaronHTML(prefix,state,kind){
 if(kind==='vacuum-motion')return "<p class=\"osb-scope\">This card operates on one dimensionless oscillator coordinate X. The existing Holstein model remains a zero-temperature, one-electron dimer with two local oscillators.</p>"+
 `<div class="osb-controls">${select(prefix+'-m',"Number state m for comparison (not a temperature input)",mOptions(5),state.m)}</div><div id="${prefix}-vacuum">${vacuumHTML(state)}</div>`+
 "<p>Electronic site occupation nᵉ and phonon number m are different labels: the full basis can be written |i,m₀,m₁⟩. At g=0, t=ℏω=1 eV and Δ=0, both oscillators in the existing experiment are in the vacuum, and the reduced electronic purity is 1.</p>"+
 formula('H_{ep}=g\\sum_i n_i^e X_i,\\qquad X_i=b_i+b_i^\\dagger')+
 "<p>g is measured in eV and X is dimensionless; X cannot directly be labeled in Å. The existing model omits the two oscillators' total zero-point constant ℏω, without changing the matrix elements of b, b† or X.</p>"+
 "<p>A coupled zero-temperature phonon cloud need not follow a thermal Bose geometric distribution. The displaced vacuum in the existing atomic-limit preset approximately gives a Poisson number distribution. Nonzero phonon occupation does not directly imply nonzero temperature.</p>"+
 "<p class=\"osb-scope\">The existing polaron tool does not accept temperature. The thermal bridge's θ=400 K corresponds to about 0.03447 eV, below the tool's current 0.2 eV input minimum. This card transfers neither temperature, number-state selection nor that energy.</p><a href=\"#compute/polaron-lab?preset=uncoupled\">Open the existing uncoupled-polaron preset →</a><p>This link loads the existing preset; it does not use the selected number state as that experiment's initial state.</p>";
 return "<p class=\"osb-scope\">This card deliberately uses finite square matrices, unlike the rectangular display window in the scattering card. Compare the top numerical state with interior states to inspect the commutator's boundary term.</p>"+
 `<div class="osb-controls">${select(prefix+'-cutoff',"Numerical maximum phonon number N",[[2,'N = 2'],[6,'N = 6'],[10,'N = 10']],state.cutoff)}${select(prefix+'-m',"Selected number state m",mOptions(state.cutoff),state.m)}</div>${button(prefix+'-top',"Inspect the top number state m=N")}<div id="${prefix}-finite">${finiteHTML(state)}</div><details data-osb-native="matrix" ${state.matrixOpen?'open':''}><summary>Show the finite creation matrix and commutator diagonal</summary><div id="${prefix}-finite-matrix">${finiteMatrixHTML(state)}</div></details>`+
 "<p>This card does not change the existing experiment's cutoff. Return to the lesson and use its top-state probabilities and adjacent-cutoff checks; this card is not a new convergence proof.</p><a href=\"#classroom/structure-dynamics?module=polaron&tab=learn&lesson=polaron-truncation\">Return to the existing cutoff-convergence lesson →</a><a href=\"#compute/polaron-lab?preset=truncation-warning\">Open the existing insufficient-cutoff preset →</a>";
}
function bodyHTML(prefix,state,kind,canOpenLab){
 return (kind==='ladder-weights'?mainHTML(prefix,state,canOpenLab):polaronHTML(prefix,state,kind))+
 `<label class="osb-note-label" for="${prefix}-note">${"Write one sentence in your own words (kept only in this page's memory)"}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset',"Reset this activity card")}`;
}

export function oscillatorSpectraBridgeHTML(lessonId){
 const kind=kindFor(lessonId);if(!kind)return '';
 const title=kind==='ladder-weights'?"Build both spectral weights from one number-state action":kind==='vacuum-motion'?"Why do vacuum fluctuations remain when mean displacement is zero?":"Why does the top of a finite matrix no longer give the identity commutator?";
 return `<section class="osb-prerequisite" aria-label="Optional oscillator-operator and spectral-weight activity"><p class="osb-optional">Expand a bounded example to connect number states and operator matrix elements with the physical quantities in this lesson.</p><details class="osb-bridge" data-osb-bridge="${kind}"><summary>${title}</summary><div class="osb-body" data-osb-body="${kind}"></div></details></section>`;
}

export function bindOscillatorSpectraBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const kind=kindFor(lessonId),store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':'+kind;
 const detail=kind?root?.querySelector?.('[data-osb-bridge="'+kind+'"]'):null,body=kind?root?.querySelector?.('[data-osb-body="'+kind+'"]'):null;
 const state=restored(store.get(key),kind),prefix='osb-'+lessonId;let alive=true,busy=false,ticket=0;
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-osb-bridge="'+kind+'"]')===detail&&root.querySelector('[data-osb-body="'+kind+'"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(detail&&body)store.set(key,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['matrix','matrixOpen'],['proof','proofOpen'],['boundary','boundaryOpen']]){const node=body.querySelector('[data-osb-native="'+name+'"]');if(node)state[field]=readOpen(node);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||checks[i].rows.some(([id])=>id===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}save();};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 const paint=()=>{if(!active())return;for(const[name,render]of (kind==='ladder-weights'?[['action',actionHTML],['matrix',ladderMatrixHTML],['ledger',ledgerHTML],['tails',tailsHTML],['pair',pairHTML],['peaks',peaksHTML]]:kind==='vacuum-motion'?[['vacuum',vacuumHTML]]:[['finite',finiteHTML],['finite-matrix',finiteMatrixHTML]]))if($(name))$(name).innerHTML=render(state);if($('temperature-value'))$('temperature-value').textContent=fmt(state.temperature)+' K';if($('step'))$('step').textContent=state.actionStep>=3?"Hide this derivation":"Reveal the next step";};
 const paintQuestion=i=>{const q=checks[i],choice=state.choices[i],checked=state.checked[i]&&choice,node=$('feedback'+i);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','osb-feedback'+(checked&&choice===q.answer?' osb-correct':''));}if($('check'+i))$('check'+i).disabled=!choice;};
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,kind,kind==='ladder-weights'&&typeof onOpenLab==='function');save();
   for(const[name,field]of [['matrix','matrixOpen'],['proof','proofOpen'],['boundary','boundaryOpen']]){const node=body.querySelector('[data-osb-native="'+name+'"]');if(node)node.ontoggle=()=>{if(active()&&body.querySelector('[data-osb-native="'+name+'"]')===node){state[field]=readOpen(node);save();}};}
   const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!active()||$(name)!==node||node.disabled)return;captureNative();action(node);save();};};
   bind('m','onchange',node=>{const value=Number(node.value),max=kind==='finite-boundary'?state.cutoff:5;if(node.value!==''&&Number.isInteger(value)&&value>=0&&value<=max){state.m=value;state.actionStep=0;paint();}});
   bind('direction','onchange',node=>{if(['create','annihilate'].includes(node.value)){state.create=node.value==='create';state.actionStep=0;paint();}});
   bind('step','onclick',()=>{state.actionStep=state.actionStep>=3?0:state.actionStep+1;paint();});
   bind('m2','onclick',()=>{state.m=2;state.create=true;state.actionStep=0;$('m').value='2';$('direction').value='create';paint();});
   bind('temperature','oninput',node=>{const value=Number(node.value);if(node.value!==''&&Number.isFinite(value)&&value>=0&&value<=1500){state.temperature=value;clearCopy();paint();}});
   for(const[name,value]of [['t0',0],['t300',300],['thalf',OSCILLATOR_HALF_RATIO_TEMPERATURE],['t1500',1500]])bind(name,'onclick',()=>{state.temperature=value;$('temperature').value=String(value);clearCopy();paint();});
   bind('cutoff','onchange',node=>{const value=Number(node.value);if([2,6,10].includes(value)){state.cutoff=value;state.m=Math.min(state.m,value);draw();$('cutoff')?.focus?.({preventScroll:true});}});
   bind('top','onclick',()=>{state.m=state.cutoff;$('m').value=String(state.m);paint();});
   for(let i=0;i<3;i++){bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});}
   bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(kind),{open});clearCopy();draw();$('m')?.focus?.({preventScroll:true});});
   const copy=$('copy');if(copy){copy.disabled=busy;copy.onclick=async()=>{
    if(!active()||$('copy')!==copy||busy)return;captureNative();const request=oscillatorSpectraLabRequest(state),id=++ticket;busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error("Complete chain inputs were not copied. Please try again.");if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent="Complete chain inputs copied. Run the existing experiment manually.";save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||"Complete chain inputs were not copied. Please try again.").slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const tag of ['button','select','input','textarea'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-osb-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return kind?{[kind]:clone(state)}:{};};return cleanup;
}
