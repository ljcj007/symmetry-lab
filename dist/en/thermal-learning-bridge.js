import {mathHTML} from './math-display.js?v=20261113-prose2';

// A bounded local teaching reference, not a replacement for phonon_thermo.
export const THERMAL_BRIDGE_HOOKS=Object.freeze({'thermal-oscillator':Object.freeze(['oscillator-probabilities'])});
export const THERMAL_CONSTANTS=Object.freeze({theta:400,h:6.62607015e-34,kB:1.380649e-23,NA:6.02214076e23,eV:1.602176634e-19,c:299792458});
export const THERMAL_EXACT_TEMPERATURE=THERMAL_CONSTANTS.theta/Math.LN2;
const {theta,h,kB,NA,eV,c}=THERMAL_CONSTANTS,epsilon=kB*theta,R=kB*NA;
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(5):Number(value.toFixed(8)).toString();
const tex=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const formula=value=>`<div class="thb-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const inline=value=>`<span class="thb-inline">${mathHTML(value)}</span>`;
const table=(caption,heads,rows)=>`<div class="thb-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
function validTemperature(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000)throw Error('The teaching temperature must be a finite number from 0 to 1000 K.');return value;}
function validReference(value){if(!['absolute','shifted'].includes(value))throw Error('The teaching energy reference must be absolute or shifted.');return value;}
function validCount(value,values){if(!values.includes(value))throw Error('The teaching mode count must use a stated integer option.');return value;}

/** One fixed positive-frequency oscillator. F/U in J; S/Cv in J/K.
 * reference='shifted' subtracts epsilon/2 from every level, not from physics.
 * Visible m=0..5 probabilities are never renormalized; tail is P(m>=6).
 */
export function thermalOscillatorReference({temperature=400,reference='absolute'}={}){
 validTemperature(temperature);validReference(reference);
 const exact=temperature===THERMAL_EXACT_TEMPERATURE,ratio=temperature===0?null:exact?Math.LN2:theta/temperature;
 const ratioOverflow=ratio===Infinity,x=ratioOverflow?null:ratio;
 const underflow=temperature>0&&(ratioOverflow||x>745),q=temperature===0||underflow?0:exact ? .5 : Math.exp(-x),oneMinus=temperature===0||underflow?1:exact ? .5 : -Math.expm1(-x);
 const occupation=exact?1:q/oneMinus,zpe=epsilon/2,energyBase=reference==='absolute'?zpe:0;
 const logOneMinus=temperature===0||underflow?0:x<.7?Math.log(oneMinus):Math.log1p(-q);
 const entropy=temperature===0||underflow?0:kB*(x*occupation-logOneMinus);
 const heatCapacity=temperature===0||underflow?0:kB*(x/oneMinus)**2*q;
 const internalEnergy=energyBase+epsilon*occupation;
 const freeEnergy=temperature===0||underflow?energyBase:energyBase+kB*temperature*logOneMinus;
 const levels=Array.from({length:6},(_,m)=>({m,energyJ:epsilon*m+energyBase,energyMeV:(epsilon*m+energyBase)/eV*1000,
  probability:temperature===0?(m===0?1:0):oneMinus*q**m,occupationContribution:temperature===0?0:m*oneMinus*q**m}));
 return{temperature,reference,theta,x,epsilonJ:epsilon,epsilonMeV:epsilon/eV*1000,physicalZeroPointEnergyJ:zpe,
  exactGeometricHalf:exact,numericalUnderflow:underflow,ratioOverflow,occupation,levels,tailProbability:q**6,
  visibleProbability:levels.reduce((sum,row)=>sum+row.probability,0),
  freeEnergy,internalEnergy,entropy,heatCapacity,heatCapacityOverKB:heatCapacity/kB,
  energyVariance:epsilon**2*occupation*(occupation+1),
  frequency:{THz:epsilon/h/1e12,'cm^-1':epsilon/(h*c*100),meV:epsilon/eV*1000}};
}

/** Additive ledgers: selected d modes are distinct from a complete 3n model. */
export function thermalBridgeReference({temperature=400,reference='absolute',degeneracy=3,natom=2}={}){
 validCount(degeneracy,[1,3]);validCount(natom,[1,2]);
 const single=thermalOscillatorReference({temperature,reference}),modes=3*natom;
 return{single,degeneracy,natom,local:{modes:degeneracy,occupation:degeneracy*single.occupation,
   energyMeV:degeneracy*single.internalEnergy/eV*1000,heatCapacityOverKB:degeneracy*single.heatCapacityOverKB},
  complete:{modes,occupation:modes*single.occupation,energyCellEV:modes*single.internalEnergy/eV,freeEnergyMolar:modes*single.freeEnergy*NA/1000,
   energyMolar:modes*single.internalEnergy*NA/1000,entropyMolar:modes*single.entropy*NA,
   heatCapacityMolar:modes*single.heatCapacity*NA,heatCapacityPerMoleAtoms:modes*single.heatCapacity*NA/natom,
   highTemperatureLimit:modes*R,physicalZeroPointEnergyMolar:modes*epsilon/2*NA/1000}};
}

/** A separate fixed 400 K slope example; molar U is kJ/mol model cells. */
export function thermalSlopeReference({natom=2,reference='absolute'}={}){
 validCount(natom,[1,2]);validReference(reference);
 const rows=[399,400,401].map(temperature=>{const result=thermalBridgeReference({temperature,natom,reference});return{temperature,energyMolar:result.complete.energyMolar,heatCapacityMolar:result.complete.heatCapacityMolar};});
 return{rows,deltaTemperature:2,centralSlope:(rows[2].energyMolar-rows[0].energyMolar)*1000/2,
  analyticHeatCapacity:rows[1].heatCapacityMolar,unit:'J/(mol model cells K)'};
}

/** Copy the real temperature to the existing complete model. Never run it. */
export function thermalBridgeLabRequest({temperature=400,natom=2}={}){
 validTemperature(temperature);validCount(natom,[1,2]);
 return{action:'phonon_thermo',module:'thermo',input:{source:'einstein',natom,theta_e:theta,t_min:temperature,t_max:temperature,t_step:20}};
}

const checks=[
 {prompt:"For a positive-frequency oscillator at T=0, the mean phonon number is zero. Which quantities can remain nonzero?",answer:'energy',rows:[['energy',"The zero-point contributions to U and F"],['heat',"Cv, because the zero-point energy is nonzero"],['half',"The mean phonon number is 1/2"]],feedback:{
  energy:"The m=0 state still has energy ε/2. With no change in thermal occupation, S=Cv=0.",
  heat:"Cv is the slope of energy with temperature. At fixed frequency, zero-point energy does not change with temperature, so nonzero U does not imply nonzero Cv.",
  half:"The 1/2 is the zero-point term in the energy, not the mean occupation of the number operator. The ground state still has zero mean phonon number."}},
 {prompt:"Three independent degenerate modes have the same frequency and mean occupation n̄ per mode. Which statement is correct?",answer:'add',rows:[['add',"Total heat capacity triples; n̄ per mode is unchanged"],['frequency',"Triple the frequency and calculate one mode"],['one',"There is one frequency, so count only one mode"]],feedback:{
  add:"Partition functions of independent oscillators multiply, while F, U, S and Cv add. The frequency and the probability distribution of each mode are unchanged.",
  frequency:"Tripling the frequency changes the level spacing and Bose distribution. It is not equivalent to introducing three independent coordinates.",
  one:"One frequency can correspond to three independent coordinates. Degeneracy contributes to the mode count; counting only distinct frequency values misses these modes."}},
 {prompt:"At fixed volume and frequency, how does Cv change if ε/2 is subtracted from every energy level?",answer:'same',rows:[['same',"It is unchanged"],['half',"It becomes half as large"],['zero',"It becomes zero"]],feedback:{
  same:"All levels shift together, leaving normalized probabilities and temperature slopes unchanged. U and F shift by a constant; S and Cv are unchanged.",
  half:"The zero-point term is not a thermal excitation contributing half the heat capacity. It is a temperature-independent energy constant.",
  zero:"After subtracting a constant, thermal occupation still changes with temperature, so heat capacity can remain nonzero."}}
];
const initial=()=>({open:false,derivationOpen:false,slopeOpen:false,temperature:400,reference:'absolute',degeneracy:3,natom:2,unit:'THz',choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const key of ['open','derivationOpen','slopeOpen'])if(typeof saved[key]==='boolean')state[key]=saved[key];
 if(typeof saved.temperature==='number'&&Number.isFinite(saved.temperature)&&saved.temperature>=0&&saved.temperature<=1000)state.temperature=saved.temperature;
 if(['absolute','shifted'].includes(saved.reference))state.reference=saved.reference;
 if([1,3].includes(saved.degeneracy))state.degeneracy=saved.degeneracy;if([1,2].includes(saved.natom))state.natom=saved.natom;
 if(['THz','cm^-1','meV'].includes(saved.unit))state.unit=saved.unit;
 for(let i=0;i<checks.length;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);return state;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button id="${id}" type="button" ${disabled?'disabled':''}>${label}</button>`;
function countHTML(state){
 return formula('3n='+3*state.natom+',\\qquad 3\\;\\mathrm{acoustic}+'+(3*state.natom-3)+'\\;\\mathrm{optical}')+
 "<p>This classifies displacements at Γ. Bulk heat capacity still requires summing all branches throughout the Brillouin zone. Acoustic branches generally have positive frequencies away from Γ; subtracting translations for classification does not remove entire acoustic branches.</p>"+
 formula('d='+state.degeneracy+',\\qquad m=0,1,2,\\ldots')+
 "<p>d counts independent oscillators, while m counts phonons in one oscillator. Degenerate modes share a frequency but have distinct coordinates, each of which can be excited repeatedly.</p>";
}
function probabilityHTML(state){
 const r=thermalOscillatorReference(state),frequency=state.unit==='THz'?'\\nu='+tex(r.frequency.THz)+'\\,\\mathrm{THz}':state.unit==='cm^-1'?'\\widetilde\\nu='+tex(r.frequency['cm^-1'])+'\\,\\mathrm{cm}^{-1}':'\\epsilon='+tex(r.epsilonMeV)+'\\,\\mathrm{meV}';
 const rows=r.levels.map(row=>[row.m,fmt(row.energyMeV),`<span class="thb-prob-number">${fmt(row.probability)}</span><span class="thb-prob-track" aria-hidden="true"><span style="width:${row.probability*100}%"></span></span>`,fmt(row.occupationContribution)]);
 return formula(frequency)+formula('\\epsilon=h\\nu=\\hbar\\omega=k_B\\theta,\\qquad\\omega=2\\pi\\nu')+
 "<p>THz denotes ordinary frequency ν, cm⁻¹ denotes wavenumber, and meV denotes the same energy quantum. Do not multiply hν by another factor of 2π.</p>"+
 formula((state.reference==='absolute'?'E_m^{\\rm abs}=\\epsilon(m+\\tfrac12)':'E_m^{\\rm shift}=\\epsilon m')+',\\qquad T='+tex(r.temperature)+'\\,\\mathrm K')+
 (r.temperature===0?"<p class=\"thb-scope\">At zero temperature, the ground-state probability is p₀=1 and the mean occupation is zero. Including the zero-point term gives U=F=ε/2; S=Cv=0.</p>":formula('x=\\frac\\theta T'+(r.ratioOverflow?'':('='+tex(r.x)))+',\\quad p_m=(1-e^{-x})e^{-mx},\\quad\\overline n='+tex(r.occupation)))+
 (r.numericalUnderflow?"<p class=\"thb-scope\">This positive temperature is so low that thermal excitations fall below the local floating-point range. A displayed zero is a low-temperature numerical approximation, not another exact zero-temperature state.</p>":'')+
 table("Only the first six levels are shown; their probabilities are not renormalized",['m',"Energy / meV",'pₘ','m pₘ'],rows)+
 formula('\\sum_{m=0}^{5}p_m='+tex(r.visibleProbability)+',\\qquad P(m\\ge6)='+tex(r.tailProbability))+
 "<p>The tail is the total probability for all m≥6; it is not redistributed among the first six rows. Mean occupation uses the analytic sum of the full geometric distribution, rather than treating the six visible rows as a truncated physical model.</p>"+
 (r.exactGeometricHalf?"<p class=\"thb-exact\">This is the analytic reference T=θ/ln2: n̄=1. With pₘ=2⁻⁽ᵐ⁺¹⁾, the first six rows sum to 63/64 and the tail probability is 1/64.</p>":'');
}
function energyHTML(state){
 const r=thermalOscillatorReference(state);
 return formula('U='+tex(r.internalEnergy/eV*1000)+'\\,\\mathrm{meV},\\qquad C_V/k_B='+tex(r.heatCapacityOverKB))+
 formula('U_{\\rm abs}=\\epsilon(\\tfrac12+\\overline n),\\qquad C_V=\\epsilon\\frac{\\partial\\overline n}{\\partial T}=k_Bx^2\\overline n(\\overline n+1)')+
 "<p>At fixed volume with temperature-independent frequency, the temperature derivative of the zero-point term is zero. Heat capacity comes from the temperature dependence of mean occupation.</p>"+
 (state.reference==='absolute'?"<p class=\"thb-reference\">Zero-point energy is currently included. Switch the energy reference and check whether the probabilities or slopes change.</p>":"<p class=\"thb-reference\">For this comparison only, ε/2 is subtracted from every level: U and F shift by the same constant, while probabilities, S and Cv are unchanged. The existing experiment still includes zero-point energy.</p>")+
 table("Single-mode values with the current energy reference",["Quantity","Value"],[['F / meV',fmt(r.freeEnergy/eV*1000)],['U / meV',fmt(r.internalEnergy/eV*1000)],['S / kB',fmt(r.entropy/kB)],['Cv / kB',fmt(r.heatCapacityOverKB)]]);
}
function slopeHTML(state){
 const r=thermalSlopeReference(state);
 return "<p>This finite-difference example always compares 399, 400 and 401 K, using the selected complete-model atom count and energy reference. It is independent of the current temperature in the occupation display.</p>"+
 table("Internal energy of the complete Einstein model near 400 K",['T / K',"U / kJ per mole of model primitive cells"],r.rows.map(row=>[row.temperature,fmt(row.energyMolar)]))+
 formula('\\frac{U(401)-U(399)}{401-399}\\times1000='+tex(r.centralSlope)+'\\;\\mathrm{J/(mol\\,K)}')+
 formula('C_V(400\\,\\mathrm K)='+tex(r.analyticHeatCapacity)+'\\;\\mathrm{J/(mol\\,K)}')+
 "<p>Multiply by 1000 to convert kJ to J. One mole here means one mole of model primitive cells. A finite temperature interval gives an approximate slope; its small difference from the analytic derivative is finite-difference error.</p>";
}
function unitsHTML(state){
 const r=thermalBridgeReference(state);
 return table("Account for selected modes and the complete model separately",["Level of counting","Mode count","Mean phonon number",'U','Cv'],[
  ["One mode",1,fmt(r.single.occupation),fmt(r.single.internalEnergy/eV*1000)+' meV',fmt(r.single.heatCapacityOverKB)+' kB'],
  ["d independent modes of equal frequency",r.local.modes,fmt(r.local.occupation),fmt(r.local.energyMeV)+' meV',fmt(r.local.heatCapacityOverKB)+' kB'],
  ["Complete model primitive cell",r.complete.modes,fmt(r.complete.occupation),fmt(r.complete.energyCellEV)+' eV',fmt(r.complete.heatCapacityMolar/NA/kB)+' kB'],
  ["Per mole of model primitive cells",inline(r.complete.modes+'N_A'),fmt(r.complete.occupation*NA),fmt(r.complete.energyMolar)+' kJ/mol',fmt(r.complete.heatCapacityMolar)+' J/(mol K)'],
  ["Per mole of atoms",inline('3N_A'),fmt(3*r.single.occupation*NA),fmt(r.complete.energyMolar/r.natom)+' kJ/mol',fmt(r.complete.heatCapacityPerMoleAtoms)+' J/(mol K)']])+
 formula('C_V^{(d)}=dC_{V,1},\\quad C_V^{\\rm cell}=3nC_{V,1},\\quad C_V^{\\rm mol\\,cell}=N_A C_V^{\\rm cell}')+
 "<p>Mode count and mean phonon number are listed separately: a mode may have no thermal phonons or a mean occupation greater than one. A complete primitive cell has 3n modes, while a mole of primitive cells has 3nNₐ modes. Divide molar-cell energy and heat capacity by n to obtain values per mole of atoms.</p>"+
 formula('C_V^{\\rm mol\\,cell}(T\\to\\infty)=3nR='+tex(r.complete.highTemperatureLimit)+'\\;\\mathrm{J/(mol\\,K)}')+
 "<p>The selected d modes are not a complete cell; do not represent them as a cell by entering a fractional atom count. The positive, equal-frequency Einstein oscillators are also not an acoustic dispersion at Γ in an actual crystal.</p>"+
 "<p class=\"thb-copy-model\">Copying to the existing experiment below uses a complete Einstein teaching model with "+r.complete.modes+" modes and atom count n="+state.natom+"; it does not copy the selected d modes or the comparison with zero-point energy subtracted.</p>";
}
function checkHTML(prefix,state,index){
 const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice;
 return `<section class="thb-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,"Your prediction",[['',"Choose a prediction first"],...q.rows],choice)}${button(prefix+'-check'+index,"Check this step",!choice)}<p id="${prefix}-feedback${index}" class="thb-feedback${checked&&choice===q.answer?' thb-correct':''}" role="status">${checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function bodyHTML(prefix,state,canOpenLab){
 return "<p class=\"thb-scope\">A positive-frequency quantum harmonic oscillator with fixed θ=400 K provides a local teaching reference for the existing thermodynamics lesson. These are not parameters assigned to a real material. The activities below run locally; you start the existing Python experiment manually.</p>"+
 `<section class="thb-stage"><h3>1 · Count modes, then count phonons within one mode</h3><div class="thb-controls">${select(prefix+'-natom',"Atoms n in the complete model primitive cell",[[1,"1 atom: 3 model modes"],[2,"2 atoms: 6 model modes"]],state.natom)}${select(prefix+'-degeneracy',"Equal-frequency modes d observed separately",[[1,"1 selected mode"],[3,"3 independent modes of equal frequency"]],state.degeneracy)}</div><div id="${prefix}-count">${countHTML(state)}</div><a href="#classroom/observables?tab=learn&lesson=acoustic-optical">Review acoustic and optical mode classification at Γ →</a></section>`+
 `<section class="thb-stage"><h3>2 · How do level probabilities give the Bose mean occupation?</h3><div class="thb-controls">${select(prefix+'-unit',"Display unit for the same energy quantum",[['THz','THz'],['cm^-1','cm⁻¹'],['meV','meV']],state.unit)}<label for="${prefix}-temperature">${"Temperature T / K"}<input id="${prefix}-temperature" type="range" min="0" max="1000" step="any" value="${state.temperature}"><output id="${prefix}-temperature-value">${fmt(state.temperature)} K</output></label></div><div class="thb-temperature-buttons">${button(prefix+'-t0','0 K')}${button(prefix+'-t100','100 K')}${button(prefix+'-t400','400 K')}${button(prefix+'-texact','θ/ln2')}${button(prefix+'-t1000','1000 K')}</div><div id="${prefix}-probabilities">${probabilityHTML(state)}</div><details data-thb-native="derivation" ${state.derivationOpen?'open':''}><summary>Show the normalization and mean-occupation derivation</summary><p>m labels a number state of one mode. Summing the geometric series over all m=0,1,2,… gives the partition function and then the normalized probabilities.</p><p>Z below uses levels that include the zero-point term. A common energy shift multiplies Z by a common factor, leaving normalized probabilities unchanged.</p>${formula('Z_{\\rm abs}=\\sum_{m=0}^{\\infty}e^{-x(m+1/2)}=\\frac{e^{-x/2}}{1-e^{-x}},\\quad p_m=\\frac{e^{-x(m+1/2)}}{Z_{\\rm abs}}')}${formula('\\overline n=(1-q)\\sum_{m=0}^{\\infty}mq^m=\\frac q{1-q},\\qquad q=e^{-x}') }<p>Partition functions of independent modes multiply, so free energies and their thermodynamic derivatives add. Degeneracy does not alter this geometric distribution for each mode.</p></details></section>`+
 `<section class="thb-stage"><h3>3 · Read Cv from the temperature slope of mean energy</h3><div class="thb-controls">${select(prefix+'-reference',"Compare local energy references",[['absolute',"Include ε/2 per mode"],['shifted',"Subtract ε/2 from every level"]],state.reference)}</div><div id="${prefix}-energy">${energyHTML(state)}</div>${formula('\\frac{dx}{dT}=-\\frac xT,\\quad\\frac{d\\overline n}{dx}=-\\overline n(\\overline n+1),\\quad C_V=k_Bx^2\\overline n(\\overline n+1)')}<details data-thb-native="slope" ${state.slopeOpen?'open':''}><summary>Check the slope and units at 400 K using three energy rows</summary><div id="${prefix}-slope">${slopeHTML(state)}</div></details></section>`+
 `<section class="thb-stage"><h3>4 · Go from one mode to per-cell and molar quantities</h3><div id="${prefix}-units">${unitsHTML(state)}</div>${canOpenLab?button(prefix+'-copy',"Copy the complete model to the existing experiment"):"<a href=\"#compute/phonon-thermo\">Open the existing phonon thermodynamics experiment →</a><p>A plain link does not transfer this temperature. In the experiment, choose the Einstein model, θE=400 K and the required integer atom count, enter the temperature, and run it manually.</p>"}<p id="${prefix}-copy-status" class="thb-feedback" role="status">${state.copyOutcome==='success'?"Reference inputs copied. Run the calculation manually in the experiment.":state.copyOutcome==='error'?esc(state.copyError):''}</p></section>`+
 `<section class="thb-stage"><h3>Three prediction checks</h3>${checks.map((_q,index)=>checkHTML(prefix,state,index)).join('')}</section>`+
 `<label class="thb-note-label" for="${prefix}-note">${"Write one sentence in your own words (kept only in this page's memory)"}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset',"Reset this local example")}`;
}

export function thermalBridgeHTML(lessonId){
 if(!Object.hasOwn(THERMAL_BRIDGE_HOOKS,lessonId))return '';
 return "<section class=\"thb-prerequisite\" aria-label=\"Optional phonon-occupation and heat-capacity bridge\"><p class=\"thb-optional\">To connect mode counting, Bose occupation and heat capacity, expand this bounded example and follow the probabilities, energies and temperature slopes.</p><details class=\"thb-bridge\" data-thb-bridge=\"oscillator-probabilities\"><summary>Build heat capacity from one oscillator's probabilities</summary><div class=\"thb-body\" data-thb-body=\"oscillator-probabilities\"></div></details></section>";
}

export function bindThermalLearningBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const supported=Object.hasOwn(THERMAL_BRIDGE_HOOKS,lessonId),store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':oscillator-probabilities';
 const detail=supported?root?.querySelector?.('[data-thb-bridge="oscillator-probabilities"]'):null,body=supported?root?.querySelector?.('[data-thb-body="oscillator-probabilities"]'):null;
 const state=restored(store.get(key)),prefix='thb-'+lessonId;let alive=true,ticket=0,busy=false;
 const $=suffix=>body?.querySelector('#'+prefix+'-'+suffix);
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-thb-bridge="oscillator-probabilities"]')===detail&&root.querySelector('[data-thb-body="oscillator-probabilities"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(detail&&body)store.set(key,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['derivation','derivationOpen'],['slope','slopeOpen']]){const node=body.querySelector('[data-thb-native="'+name+'"]');if(node)state[field]=readOpen(node);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const control=$('q'+i);if(control&&checks[i].rows.some(([id])=>id===control.value)&&state.choices[i]!==control.value){state.choices[i]=control.value;state.checked[i]=false;}}save();};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 const paint=()=>{if(!active())return;for(const[name,render]of [['count',countHTML],['probabilities',probabilityHTML],['energy',energyHTML],['slope',slopeHTML],['units',unitsHTML]])if($(name))$(name).innerHTML=render(state);if($('temperature-value'))$('temperature-value').textContent=fmt(state.temperature)+' K';};
 const paintQuestion=index=>{const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice,node=$('feedback'+index);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','thb-feedback'+(checked&&choice===q.answer?' thb-correct':''));}if($('check'+index))$('check'+index).disabled=!choice;};
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');save();
   for(const[name,field]of [['derivation','derivationOpen'],['slope','slopeOpen']]){const node=body.querySelector('[data-thb-native="'+name+'"]');node.ontoggle=()=>{if(active()&&body.querySelector('[data-thb-native="'+name+'"]')===node){state[field]=readOpen(node);save();}};}
   const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!active()||$(name)!==node||node.disabled)return;captureNative();action(node);save();};};
   for(const name of ['natom','degeneracy'])bind(name,'onchange',node=>{const value=Number(node.value);if((name==='natom'?[1,2]:[1,3]).includes(value)){state[name]=value;clearCopy();paint();}});
   bind('unit','onchange',node=>{if(['THz','cm^-1','meV'].includes(node.value)){state.unit=node.value;paint();}});
   bind('reference','onchange',node=>{if(['absolute','shifted'].includes(node.value)){state.reference=node.value;paint();}});
   bind('temperature','oninput',node=>{const value=Number(node.value);if(node.value!==''&&Number.isFinite(value)&&value>=0&&value<=1000){state.temperature=value;clearCopy();paint();}});
   for(const[name,value]of [['t0',0],['t100',100],['t400',400],['texact',THERMAL_EXACT_TEMPERATURE],['t1000',1000]])bind(name,'onclick',()=>{state.temperature=value;$('temperature').value=String(value);clearCopy();paint();});
   for(let i=0;i<3;i++){
    bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});
    bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});
   }
   bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});clearCopy();draw();$('natom')?.focus?.({preventScroll:true});});
   const copy=$('copy');if(copy){copy.disabled=busy;copy.onclick=async()=>{
    if(!active()||$('copy')!==copy||busy)return;captureNative();const id=++ticket,request=thermalBridgeLabRequest(state);busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error("Reference inputs were not copied. Please try again.");if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent="Reference inputs copied. Run the calculation manually in the experiment.";save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||"Reference inputs were not copied. Please try again.").slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const tag of ['button','select','input','textarea'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-thb-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return supported?{'oscillator-probabilities':clone(state)}:{};};return cleanup;
}
