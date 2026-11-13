import {mathHTML} from './math-display.js?v=20261113-prose2';

// Operational prerequisites, not a replacement for the full Brillouin-zone
// calculation. No worker, network, persistent store, or mastery record is used.
export const HALL_BRIDGE_HOOKS=Object.freeze(Object.fromEntries(['hall-occupation','hall-entropy','hall-diagnostics'].map(id=>[id,Object.freeze(['phase-rays','fermi-weights'])])));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const formula=tex=>`<div class="hb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>`<span class="hb-inline">${mathHTML(tex)}</span>`;
const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error(label+' must be finite.');return value;};
const fmt=value=>{if(Math.abs(value)<1e-13&&value===0)return '0';if(value!==0&&(Math.abs(value)<.00001||Math.abs(value)>=1e5))return value.toExponential(4);return Number(value.toFixed(6)).toString();};
const texNumber=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const c=(re,im=0)=>[re,im];
const add=(a,b)=>c(a[0]+b[0],a[1]+b[1]);
const mul=(a,b)=>c(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]);
const conj=a=>c(a[0],-a[1]);
const magnitude=a=>Math.hypot(...a);
const cis=phi=>c(Math.cos(phi),Math.sin(phi));
const overlap=(a,b)=>a.reduce((sum,x,i)=>add(sum,mul(conj(x),b[i])),c(0));
const cmul=(a,z)=>a.map(x=>mul(x,z));
const normalize=a=>{const norm=Math.sqrt(overlap(a,a)[0]);if(!(norm>1e-14))throw Error('A nonzero state is required.');return a.map(x=>x.map(v=>v/norm));};
const projector=a=>a.map(x=>a.map(y=>mul(x,conj(y))));
const difference=(a,b)=>Math.max(...a.flatMap((row,i)=>row.map((z,j)=>magnitude(c(z[0]-b[i][j][0],z[1]-b[i][j][1])))));
const complexTex=z=>{const re=Math.abs(z[0])<1e-12?0:z[0],im=Math.abs(z[1])<1e-12?0:z[1];return re===0&&im===0?'0':im===0?texNumber(re):re===0?(im===1?'i':im===-1?'-i':texNumber(im)+'i'):texNumber(re)+(im>=0?'+':'-')+(Math.abs(im)===1?'':texNumber(Math.abs(im)))+'i';};
const matrixTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(complexTex).join('&')).join('\\\\')+'\\end{pmatrix}';

export function closedOverlapLoop(states){
 if(!Array.isArray(states)||states.length<3||states.some(u=>!Array.isArray(u)||u.length!==2||u.some(z=>!Array.isArray(z)||z.length!==2||z.some(v=>typeof v!=='number'||!Number.isFinite(v)))))throw Error('A finite two-component state loop is required.');
 const normalized=states.map(normalize),overlaps=normalized.map((u,i)=>overlap(u,normalized[(i+1)%normalized.length]));
 if(overlaps.some(z=>magnitude(z)<1e-12))throw Error('A neighboring overlap vanishes; this discrete loop phase is undefined.');
 const links=overlaps.map(z=>z.map(x=>x/magnitude(z))),product=links.reduce(mul,c(1)),rawProduct=overlaps.reduce(mul,c(1));
 return {overlaps,links,product,rawProduct,phase:-Math.atan2(product[1],product[0])};
}

export function qwzLowerState(kx,ky,mass){
 [kx,ky,mass].forEach((v,i)=>finite(v,['kx','ky','mass'][i]));
 const d=[Math.sin(kx),Math.sin(ky),mass+Math.cos(kx)+Math.cos(ky)],radius=Math.hypot(...d);
 if(radius<1e-12)throw Error('The selected QWZ point is degenerate.');
 const state=radius+d[2]>1e-8*radius?normalize([c(-d[0],d[1]),c(d[2]+radius)]):normalize([c(d[2]-radius),c(d[0],d[1])]);
 return {d,energy:-radius,state,projector:projector(state),curvature:(Math.cos(kx)+Math.cos(ky)+mass*Math.cos(kx)*Math.cos(ky))/(2*radius**3)};
}

export function hallPhaseReference({step=Math.PI/6,mass=-1,gauge=[0,Math.PI/2,-Math.PI/2,Math.PI],reverse=false,globalPhase=Math.PI/2}={}){
 finite(step,'step');finite(globalPhase,'globalPhase');
 if(!(step>0&&step<=Math.PI/2)||![-1,3].includes(mass)||!Array.isArray(gauge)||gauge.length!==4||gauge.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Unsupported teaching loop.');
 const points=[[0,0],[step,0],[step,step],[0,step]],sampled=points.map(([x,y])=>qwzLowerState(x,y,mass));
 const ordered=reverse?[0,3,2,1]:[0,1,2,3],base=closedOverlapLoop(ordered.map(i=>sampled[i].state)),changed=closedOverlapLoop(ordered.map(i=>cmul(sampled[i].state,cis(gauge[i]))));
 const u=normalize([c(1),c(0,1)]),changedState=cmul(u,cis(globalPhase)),relativeState=[u[0],mul(u[1],c(-1))];
 return {points:ordered.map(i=>points[i]),cornerOrder:ordered.map(i=>i+1),mass,step,reverse,base,changed,signedArea:(reverse?-1:1)*step*step,estimate:changed.phase/((reverse?-1:1)*step*step),originCurvature:sampled[0].curvature,fullZoneChernReference:mass===-1?1:0,
   projectorResidual:Math.max(...sampled.map((x,i)=>difference(x.projector,projector(cmul(x.state,cis(gauge[i])))))),
   ray:{state:u,changedState,relativeState,projector:projector(u),changedProjector:projector(changedState),relativeProjector:projector(relativeState),probabilities:u.map(z=>magnitude(z)**2),squaredOverlap:magnitude(overlap(u,changedState))**2,relativeSquaredOverlap:magnitude(overlap(u,relativeState))**2}};
}

export const HALL_BRIDGE_KB_EV=8.617333262145e-5;
export function fermiReference(energy,chemicalPotential,temperature){
 [energy,chemicalPotential,temperature].forEach((v,i)=>finite(v,['energy','chemical potential','temperature'][i]));
 if(temperature<0)throw Error('Temperature cannot be negative.');
 if(temperature===0){const f=energy<chemicalPotential?1:energy>chemicalPotential?0:.5;return {f,vacancy:1-f,binaryEntropy:f===.5?Math.LN2:0,transportEntropy:0,threshold:energy===chemicalPotential};}
 const x=(energy-chemicalPotential)/(HALL_BRIDGE_KB_EV*temperature),a=Math.abs(x),z=Math.exp(-a),small=z/(1+z),entropy=Math.log1p(z)+(Number.isFinite(a)?a*z/(1+z):0);
 return {f:x>=0?small:1-small,vacancy:x>=0?1-small:small,binaryEntropy:entropy,transportEntropy:entropy,threshold:energy===chemicalPotential};
}
export function hallOccupationReference({chemicalPotential=0,temperature=0}={}){
 const lower=fermiReference(-1,chemicalPotential,temperature),upper=fermiReference(1,chemicalPotential,temperature);
 // In the filled tail use vacancy differences; subtracting two rounded ones
 // would otherwise falsely turn a finite-temperature tail into exact zero.
 const difference=chemicalPotential>=1?upper.vacancy-lower.vacancy:lower.f-upper.f;
 return {chemicalPotential,temperature,lower,upper,occupiedWeight:.5*difference,entropyWeight:.5*(lower.transportEntropy-upper.transportEntropy),binaryEntropyWeight:.5*(lower.binaryEntropy-upper.binaryEntropy),
   energies:[-1,1],curvatures:[.5,-.5],zeroTemperature:temperature===0,fullZoneLowerChernReference:1};
}

const stepOptions=[['large','π/3'],['medium','π/6'],['small','π/12']];
const steps={large:Math.PI/3,medium:Math.PI/6,small:Math.PI/12};
const gauges={same:[0,0,0,0],local:[0,Math.PI/2,-Math.PI/2,Math.PI]};
const names={
 'phase-rays':"From state conventions to a small Berry loop: what does a phase change?",
 'fermi-weights':"Occupation before weighting: which states contribute?"
};
const initial=id=>id==='phase-rays'?{open:false,choice:'',gauge:'local',step:'medium',observed:false,checked:false,variantOpen:false,variantMode:'reverse',variantChoice:'',variantObserved:false,variantChecked:false}:{open:false,choice:'',mu:'0',temperature:'0',kernel:'occupation',observed:false,checked:false,variantOpen:false,variantMode:'full',variantChoice:'',variantObserved:false,variantChecked:false};
const lists={gauge:['same','local'],step:Object.keys(steps),mu:['-4','-1','0','1','4'],temperature:['0','300','5000'],kernel:['occupation','entropy']};
const answerOptions=id=>id==='phase-rays'?[['invariant',"The projector and closed-loop phase must remain unchanged; individual overlap phases may change"],['all',"Every quantity, including each individual overlap phase, must remain unchanged"],['changed',"Any change in amplitudes must change both the physical state and the closed-loop phase"]]:[['positive',"Positive"],['zero',"zero"],['negative',"negative"]];
const variantOptions=(id,mode)=>id==='phase-rays'?(mode==='reverse'?[['reverse',"The loop phase and oriented area both reverse sign; the curvature estimate stays the same"],['same',"The loop phase and direction both remain unchanged"],['chern',"Reversing the path alone changes the band's Chern number"]]:mode==='relative'?[['changed',"The projector changes; equal component probabilities do not establish the same state"],['same',"Equal probabilities mean that the change must be an overall phase"],['gauge',"Each component phase can be changed independently without changing the physical state"]]:[['local',"The local curvature at the origin is nonzero, while the full-zone Chern reference is zero"],['flat',"Zero Chern number requires zero curvature at every point"],['one',"One nonzero small loop proves that the Chern number is one"]]):mode==='symmetric'?[['entropy',"The entropy-weighted terms cancel, while the occupation-weighted sum can remain nonzero"],['both',"Both weighted sums must vanish"],['nernst',"The complete open-circuit Nernst voltage has already been obtained"]]:[['cancel',"The two bands cancel at this point; changing occupation has not changed the same band's Chern number"],['chern',"Changing the chemical potential automatically makes the same band's Chern number zero"],['nernst',"The value at this point is the complete open-circuit Nernst voltage"]];
function restored(id,saved){
 const state=initial(id);if(!saved||typeof saved!=='object')return state;
 for(const key of Object.keys(state))if(typeof state[key]==='boolean'&&typeof saved[key]==='boolean')state[key]=saved[key];
 for(const key of ['gauge','step','mu','temperature','kernel'])if(Object.hasOwn(state,key)&&lists[key].includes(saved[key]))state[key]=saved[key];
 const modes=id==='phase-rays'?['reverse','relative','trivial']:['full','empty','symmetric'];if(modes.includes(saved.variantMode))state.variantMode=saved.variantMode;
 if(answerOptions(id).some(([key])=>key===saved.choice))state.choice=saved.choice;
 if(variantOptions(id,state.variantMode).some(([key])=>key===saved.variantChoice))state.variantChoice=saved.variantChoice;
 if(!state.choice){state.observed=false;state.checked=false;}if(!state.observed)state.checked=false;
 if(!state.variantChoice){state.variantObserved=false;state.variantChecked=false;}if(!state.variantObserved)state.variantChecked=false;
 return state;
}
const select=(id,label,options,value)=>`<label for="${id}">${label}<select id="${id}">${options.map(([key,text])=>`<option value="${key}" ${value===key?'selected':''}>${text}</option>`).join('')}</select>${id.endsWith('-choice')&&value?`<span class="hb-choice-reading" aria-hidden="true">${options.find(([key])=>key===value)?.[1]||''}</span>`:''}</label>`;
const button=(id,text,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${text}</button>`;
const row=(label,tex)=>`<div class="hb-result-row"><strong>${label}</strong>${formula(tex)}</div>`;
const phaseState=state=>hallPhaseReference({step:steps[state.step],gauge:gauges[state.gauge]});
function loopDiagram(ref,tag){
 const positions=[[48,214],[300,214],[300,55],[48,55]],order=ref.reverse?[0,3,2,1]:[0,1,2,3];
 return `<figure class="hb-diagram"><svg viewBox="0 0 360 275" role="img" aria-label="Four momentum corners form an oriented path around one small square in the Brillouin zone"><defs><marker id="hb-loop-arrow-${tag}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#426d57"/></marker></defs>${order.map((i,n)=>{const a=positions[i],b=positions[order[(n+1)%4]],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);return `<line x1="${a[0]+12*dx/length}" y1="${a[1]+12*dy/length}" x2="${b[0]-16*dx/length}" y2="${b[1]-16*dy/length}" stroke="#426d57" stroke-width="3" marker-end="url(#hb-loop-arrow-${tag})"/>`;}).join('')}${positions.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="6" fill="#a56e2d"/><text x="${x+10}" y="${y-12}">${i+1}</text>`).join('')}<text x="165" y="254">kₓ</text><text x="13" y="130">kᵧ</text><text x="130" y="142">h × h</text></svg><figcaption>The arrows indicate the loop direction; read the corner labels along that path. No sum over the whole Brillouin zone is performed here.</figcaption></figure>`;
}
function phaseObservation(state,variant=false){
 const args={step:steps[state.step],gauge:gauges[state.gauge],...(variant&&state.variantMode==='reverse'?{reverse:true}:{}),...(variant&&state.variantMode==='trivial'?{mass:3}:{})},ref=hallPhaseReference(args);
 return `${loopDiagram(ref,variant?'variant':'main')}${variant?'':row("Two conventions for the same state and its projector",'u=\\frac{1}{\\sqrt2}\\begin{pmatrix}1\\\\i\\end{pmatrix},\\quad iu=\\frac{1}{\\sqrt2}\\begin{pmatrix}i\\\\-1\\end{pmatrix},\\quad P=uu^\\dagger='+matrixTex(ref.ray.projector))+`<p>The two components are complex amplitudes in the same basis; their squared magnitudes give measurement probabilities in that basis. Multiplying the whole state by i preserves the projector, and the squared overlap between the states is ${inline('1')}. Reversing only the second component changes the relative phase. Each probability remains ${inline('1/2')}, but the squared overlap with the original state becomes ${inline('0')}; equal probabilities do not imply the same quantum state.</p>`}
 <div class="hb-table-wrap" tabindex="0"><table><caption>Phases of the four neighboring overlaps (radians)</caption><thead><tr><th>Edge</th><th>Original convention</th><th>After changing the phases at individual points</th></tr></thead><tbody>${ref.base.overlaps.map((z,i)=>`<tr><td>${ref.cornerOrder[i]} → ${ref.cornerOrder[(i+1)%4]}</td><td>${fmt(Math.atan2(z[1],z[0]))}</td><td>${fmt(Math.atan2(ref.changed.overlaps[i][1],ref.changed.overlaps[i][0]))}</td></tr>`).join('')}</tbody></table></div>
 ${row("Closing the loop cancels the phase factors at every point",'W=\\prod_{j=1}^{4}\\frac{\\langle u_j|u_{j+1}\\rangle}{|\\langle u_j|u_{j+1}\\rangle|}='+complexTex(ref.changed.product)+',\\quad u_5=u_1')}
 ${row("Using this lesson's positive-i connection convention",'\\gamma=-\\operatorname{Arg}W='+texNumber(ref.changed.phase)+',\\quad\\frac{\\gamma}{\\Delta k_x\\Delta k_y}='+texNumber(ref.estimate))}
 ${row("Compare with the analytic curvature at the origin",'\\Omega_-(0,0)='+texNumber(ref.originCurvature)+',\\quad m='+ref.mass)}
 <p>This ratio is a discrete estimate at finite step size; it approaches the local curvature at the origin as h decreases. The corners use QWZ lower-band states in a fixed periodic orbital basis, without a full Brillouin-zone grid.${variant&&state.variantMode==='trivial'?"For m=3, the full-zone lower-band Chern reference is 0. Nonzero local curvature is consistent with this global result.":''}</p>`;
}
function occupationDiagram(ref){
 const bars=[ref.lower.f,ref.upper.f],h=140;
 return `<figure class="hb-diagram"><svg viewBox="0 0 390 230" role="img" aria-label="Fermi occupations of the two bands at the selected momentum"><line x1="45" y1="180" x2="345" y2="180" stroke="#789184"/><line x1="45" y1="35" x2="45" y2="180" stroke="#789184"/><text x="14" y="44">1</text><text x="14" y="184">0</text>${bars.map((f,i)=>`<rect x="${95+i*150}" y="${180-h*f}" width="60" height="${h*f}" fill="${i?'#a56e2d':'#426d57'}"/><text x="${125+i*150}" y="211" text-anchor="middle">${i?'E₊=1':'E₋=−1'} eV</text>`).join('')}</svg><figcaption>The bar height is occupation probability f, not conductance or spectral intensity. Read the scientific-notation values in the table for very small finite-temperature tails.</figcaption></figure>`;
}
function occupationObservation(ref){
 return `${occupationDiagram(ref)}<div class="hb-table-wrap" tabindex="0"><table><caption>Energies, curvatures, and weights at the same momentum point</caption><thead><tr><th>Band</th><th>E / eV</th><th>Ω</th><th>f</th><th>s(f)</th></tr></thead><tbody>${[ref.lower,ref.upper].map((item,i)=>`<tr><td>${i?"upper band":"lower band"}</td><td>${i?1:-1}</td><td>${i?'−1/2':'+1/2'}</td><td>${fmt(item.f)}</td><td>${fmt(item.binaryEntropy)}</td></tr>`).join('')}</tbody></table></div>
 ${formula('s_n^{\\mathrm{tr}}=\\begin{cases}s(f_n),&T>0\\\\0,&T=0\\end{cases}')}
 ${row("Calculate occupation and transport-entropy weighting separately",'W_f=\\sum_{n=\\pm}\\Omega_nf_n='+texNumber(ref.occupiedWeight)+',\\quad W_s^{\\mathrm{tr}}=\\sum_{n=\\pm}\\Omega_ns_n^{\\mathrm{tr}}='+texNumber(ref.entropyWeight))}
 <p>These are weights at one point, before multiplying by the integration area or charge constants. The Hall formula multiplies them by ${inline('-e^2/\\hbar')}; the transverse thermoelectric formula multiplies them by ${inline('ek_B/\\hbar')}, with positive e and electron charge −e. This two-dimensional model adds no spin-degeneracy factor and does not divide by a fictitious vacuum thickness.</p>
 ${ref.zeroTemperature?"<p class=\"hb-note\">At zero temperature, occupation is a step; exactly at E=μ, this lesson uses the half-occupation convention 1/2. The mathematical entropy function is ln 2 at f=1/2, but the zero-temperature transport implementation sets its entropy kernel to 0. This single-point convention does not imply a finite heat current or residual thermodynamic entropy.</p>":"<p class=\"hb-note\">Finite-temperature tails are not exactly full or empty bands. An occupation close to 1 may be displayed as 1, while stable vacancy differences retain the very small nonzero weighting tail.</p>"}`;
}
function occupationExplain(ref,kernel){
 if(kernel==='occupation')return ref.zeroTemperature&&ref.occupiedWeight===0?"At this point, both bands are full or both are empty, so their opposite-curvature occupation contributions cancel. Changing the chemical potential changes occupation, not the Chern number of the same band.":"The lower band is more occupied than the upper band, making the occupation-weighted curvature positive at this point. The Hall formula with the stated electron-charge convention also has a minus sign. One point's sign cannot replace the full Brillouin-zone integral.";
 if(ref.zeroTemperature)return "This check uses the page's zero-temperature transport convention, in which the entropy kernel is set to zero. Half occupation at one threshold point does not imply a nonzero transverse thermoelectric response.";
 if(ref.chemicalPotential===0)return "For paired positive and negative energies, μ=0 gives f₊=1−f₋ and s(f)=s(1−f). The two entropy-weighted terms cancel point by point; the occupation-weighted sum can remain nonzero.";
 return ref.chemicalPotential>0?"When the chemical potential is closer to the upper band, that band has the larger entropy weight. Its negative curvature makes the entropy-weighted sum negative at this point. This is not the complete open-circuit Nernst signal.":"When the chemical potential is closer to the lower band, that band has the larger entropy weight. Its positive curvature makes the entropy-weighted sum positive at this point. This is not the complete open-circuit Nernst signal.";
}
const signChoice=value=>value>0?'positive':value<0?'negative':'zero';
function mainResult(id,state){
 if(id==='phase-rays')return {correct:state.choice==='invariant',html:phaseObservation(state),explanation:state.choice==='all'?"A neighboring overlap acquires the phase difference between its endpoints, so its phase need not remain unchanged. The closed product cancels all endpoint phases.":state.choice==='changed'?"The overall phase cancels in uu†. A change in the wavefunction coordinates alone does not establish a change in the projector or physical state.":"The overall phase at each point cancels in its projector and in the closed overlap product. Individual overlaps and the connection itself can depend on the convention."};
 const ref=hallOccupationReference({chemicalPotential:Number(state.mu),temperature:Number(state.temperature)}),weight=state.kernel==='occupation'?ref.occupiedWeight:ref.entropyWeight;
 return {correct:state.choice===signChoice(weight),html:occupationObservation(ref),explanation:occupationExplain(ref,state.kernel)};
}
function variantResult(id,state){
 if(id==='phase-rays'&&state.variantMode==='relative'){const ray=phaseState(state).ray;return {correct:state.variantChoice==='changed',html:row("Change only the second component's relative phase",'u=\\frac1{\\sqrt2}\\begin{pmatrix}1\\\\i\\end{pmatrix},\\quad v=\\frac1{\\sqrt2}\\begin{pmatrix}1\\\\-i\\end{pmatrix}')+row("Compare the two projectors directly",'P_u='+matrixTex(ray.projector)+',\\quad P_v='+matrixTex(ray.relativeProjector))+row("Equal component probabilities, different states",'|\\langle u|v\\rangle|^2=0'),explanation:"This operation does not multiply the whole state by one phase. The relative phase changes the off-diagonal projector entries; a different measurement basis can distinguish the two states."};}
 if(id==='phase-rays')return {correct:state.variantChoice===(state.variantMode==='reverse'?'reverse':'local'),html:phaseObservation(state,true),explanation:state.variantMode==='reverse'?"Reversing the same loop complex-conjugates the closed overlap product and reverses the geometric phase. The oriented area also reverses, preserving the local curvature estimate in the same coordinate orientation.":"For m=3, the curvature at the origin is 1/50, not zero, while the full-zone Chern reference is 0. One local loop or peak cannot determine the full-zone integral."};
 const ref=hallOccupationReference(state.variantMode==='symmetric'?{chemicalPotential:0,temperature:5000}:{chemicalPotential:state.variantMode==='full'?4:-4,temperature:0});
 return {correct:state.variantChoice===(state.variantMode==='symmetric'?'entropy':'cancel'),html:occupationObservation(ref),explanation:state.variantMode==='symmetric'?"At finite temperature and μ=0, the symmetric bands have equal binary entropies, so their entropy weights cancel. The lower band is still more occupied; the occupation-weighted sum is not required to vanish.":"For m=−1 and energy scale 1 eV, all band energies lie between −3 and 3 eV. At zero temperature, μ=4 eV fills both complete bands and μ=−4 eV empties them; cancellation also holds point by point across the full zone. The geometry of the same bands has not changed."};
}
function bodyHTML(id,state){
 const prefix='hb-'+id,main=state.observed?mainResult(id,state):null,variant=state.variantObserved?variantResult(id,state):null;
 const intro=id==='phase-rays'?`<p>Start with a quantum state expressed as complex amplitudes along two basis directions. ${inline('u')} and ${inline('e^{i\\alpha}u')} represent the same ray; the projector ${inline('P=uu^\\dagger')} does not depend on the overall phase. Changing one component's relative phase is a different operation.</p><p>Next, read the lower-band states at four corners of a small momentum-space square. Neighboring overlaps compare states, and closing the loop cancels the independently chosen endpoint phases. The Berry phase records this sequence of comparisons, not a direct sum of arbitrary wavefunction phases. The connection A describes infinitesimal neighboring-state comparisons and depends on local phase conventions; curvature describes the growth of a sufficiently small loop phase with oriented area.</p>${formula('H=\\sin k_x\\,\\sigma_x+\\sin k_y\\,\\sigma_y+(-1+\\cos k_x+\\cos k_y)\\sigma_z')}${formula('A=i\\langle u|\\nabla_k u\\rangle,\\quad A^{\\prime}=A-\\nabla_k\\alpha,\\quad\\gamma=-\\operatorname{Arg}W')}`:`<p>The Fermi occupation f is the probability that an electronic state is occupied. Energy E and chemical potential μ use eV, while temperature T uses K; μ and T are independent inputs. Calculate f before choosing the response kernel.</p>${formula('f(E,\\mu,T)=\\frac{1}{1+e^{(E-\\mu)/(k_BT)}},\\quad T>0')}${formula('s(f)=-f\\ln f-(1-f)\\ln(1-f),\\quad s(0)=s(1)=0')}${formula('k_B=8.617333262145\\times10^{-5}\\;\\mathrm{eV/K}')}
 <p>This example fixes QWZ parameter m=−1, energy scale 1 eV, and ${inline('k=(0,0)')}. At this point, lower and upper energies are −1 and +1 eV, with curvatures +1/2 and −1/2. Changing μ or T does not automatically change this band geometry.</p>`;
 const controls=id==='phase-rays'?`${select(prefix+'-gauge',"Phase convention at the four corners",[['same',"Add no phase at any corner"],['local',"Add 0, π/2, −π/2, and π at the respective corners"]],state.gauge)}${select(prefix+'-step',"Small-square side length h",stepOptions,state.step)}`:`${select(prefix+'-mu',"Chemical potential μ / eV",lists.mu.map(x=>[x,x]),state.mu)}${select(prefix+'-temperature',"Temperature T / K",lists.temperature.map(x=>[x,x]),state.temperature)}${select(prefix+'-kernel',"Which point weight will you predict?",[['occupation',"Occupation weighting Ωf"],['entropy',"Transport-entropy weighting Ωs"]],state.kernel)}`;
 const question=id==='phase-rays'?"Which quantities must remain unchanged under independent overall phases at the corners?":"Under these conditions, is the weighted sum at this point positive, zero, or negative?";
 const variantModes=id==='phase-rays'?[['reverse',"Traverse the same loop in reverse"],['relative',"Change only one component's relative phase"],['trivial',"Use m=3 and compare local curvature with the full-zone reference"]]:[['full',"Zero temperature, μ=4 eV: both bands full"],['empty',"Zero temperature, μ=−4 eV: both bands empty"],['symmetric',"μ=0, T=5000 K: compare the two kernels"]];
 return `${intro}<div class="hb-controls">${controls}${select(prefix+'-choice',question,[['',"Choose a prediction first"],...answerOptions(id)],state.choice)}${button(prefix+'-run',"Show this comparison",!state.choice)}${button(prefix+'-check',"Check the prediction",!state.observed)}</div><div class="hb-output" aria-live="polite">${main?main.html:"<p class=\"hb-await\">Make a prediction, then reveal the values, diagram, and calculation steps.</p>"}</div><p id="${prefix}-feedback" role="status" class="hb-feedback ${state.checked&&main?.correct?'hb-correct':''}">${state.checked?(main.correct?"Your answer matches. ":"Revise this prediction. ")+main.explanation:''}</p>
 <details class="hb-variant" ${state.variantOpen?'open':''}><summary>Change one condition and explain again</summary><div class="hb-controls">${select(prefix+'-variant-mode',"Which condition will you change?",variantModes,state.variantMode)}${select(prefix+'-variant-choice',"Predict what this comparison establishes",[['',"Predict the variation first"],...variantOptions(id,state.variantMode)],state.variantChoice)}${button(prefix+'-variant-run',"Show the changed-condition comparison",!state.variantChoice)}${button(prefix+'-variant-check',"Check the variation explanation",!state.variantObserved)}</div><div class="hb-output">${variant?variant.html:''}</div><p id="${prefix}-variant-feedback" role="status" class="hb-feedback ${state.variantChecked&&variant?.correct?'hb-correct':''}">${state.variantChecked?(variant.correct?"The check agrees for this variation. ":"Distinguish the local result, the global result, and the model conditions. ")+variant.explanation:''}</p></details>
 <p class="hb-boundary">${id==='phase-rays'?"This small loop illustrates a discrete geometric phase in a fixed two-band model. A complete calculation must check step-size error, phase branches, and the full-zone sum; local curvature is not the full-zone Chern number.":"One point weight is not a complete sheet conductance or transverse thermoelectric coefficient. Full results require a Brillouin-zone sum and convergence checks. αxy is not an open-circuit Nernst voltage, and the longitudinal transport window −∂f/∂E cannot replace these occupation or entropy kernels."}</p>
 <p class="hb-record-note">These checks remain in the current classroom session and do not count toward mastery of the original question. Experienced learners can collapse them and continue.</p>${button(prefix+'-reset',"Restart this small experiment")}`;
}

export function hallBridgeHTML(lessonId){
 const ids=Object.hasOwn(HALL_BRIDGE_HOOKS,lessonId)?HALL_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="hb-prerequisites" aria-label="Optional Hall prerequisite experiments"><p class="hb-optional">New to Berry curvature or Fermi occupation? Expand a small experiment before returning to the response formulas below. If these concepts are familiar, continue directly.</p>${ids.map(id=>`<details class="hb-bridge" data-hb-bridge="${id}"><summary>${names[id]}</summary><div class="hb-body" data-hb-body="${id}"></div></details>`).join('')}<p class="hb-sources">References: <a href="https://wannier90.readthedocs.io/en/latest/user_guide/postw90/berry/" target="_blank" rel="noopener">Berry connection and Hall conventions</a> · <a href="https://arxiv.org/abs/cond-mat/0503172" target="_blank" rel="noopener">Discrete closed overlaps and gauge invariance</a> · <a href="https://arxiv.org/abs/cond-mat/0604561" target="_blank" rel="noopener">Transverse thermoelectric response and magnetization currents</a></p></section>`:'';
}

export function bindHallBridges({root,lessonId,isCurrent,stateStore=new Map()}){
 const ids=Object.hasOwn(HALL_BRIDGE_HOOKS,lessonId)?HALL_BRIDGE_HOOKS[lessonId]:[],states=new Map(),records=[];
 const store=stateStore instanceof Map?stateStore:new Map();let alive=true;
 const active=()=>alive&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent());
 const save=(id,state)=>store.set(lessonId+':'+id,clone(state));
 for(const id of ids){
  const detail=root?.querySelector?.('[data-hb-bridge="'+id+'"]'),body=root?.querySelector?.('[data-hb-body="'+id+'"]');if(!detail||!body)continue;
  const state=restored(id,store.get(lessonId+':'+id));states.set(id,state);
  const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
  if(state.open){detail.open=true;detail.setAttribute?.('open','');}
  const current=()=>active()&&root.querySelector('[data-hb-body="'+id+'"]')===body&&root.querySelector('[data-hb-bridge="'+id+'"]')===detail;
  detail.ontoggle=()=>{if(!current())return;state.open=readOpen(detail);save(id,state);};
  function draw(){
   if(!current())return;body.innerHTML=bodyHTML(id,state);save(id,state);
   const prefix='hb-'+id,$=suffix=>body.querySelector('#'+prefix+'-'+suffix),variant=body.querySelector('.hb-variant');
   variant.ontoggle=()=>{if(current()&&body.querySelector('.hb-variant')===variant){state.variantOpen=readOpen(variant);save(id,state);}};
   function bind(suffix,event,action){const control=$(suffix);if(!control)return;control[event]=()=>{if(!current()||$(suffix)!==control||control.disabled)return;state.variantOpen=readOpen(body.querySelector('.hb-variant'));action(control);draw();const target=suffix==='reset'?$('choice'):$(suffix);target?.focus?.({preventScroll:true});};}
   bind('choice','onchange',control=>{state.choice=answerOptions(id).some(([value])=>value===control.value)?control.value:'';state.observed=false;state.checked=false;});
   for(const key of id==='phase-rays'?['gauge','step']:['mu','temperature','kernel'])bind(key,'onchange',control=>{if(!lists[key].includes(control.value))return;state[key]=control.value;state.observed=false;state.checked=false;state.variantObserved=false;state.variantChecked=false;});
   bind('run','onclick',()=>{state.observed=true;state.checked=false;});
   bind('check','onclick',()=>{state.checked=true;});
   bind('variant-mode','onchange',control=>{if(!(id==='phase-rays'?['reverse','relative','trivial']:['full','empty','symmetric']).includes(control.value))return;state.variantMode=control.value;state.variantChoice='';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-choice','onchange',control=>{state.variantChoice=variantOptions(id,state.variantMode).some(([value])=>value===control.value)?control.value:'';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-run','onclick',()=>{state.variantObserved=true;state.variantChecked=false;});
   bind('variant-check','onclick',()=>{state.variantChecked=true;});
   bind('reset','onclick',()=>{const wasOpen=state.open;Object.assign(state,initial(id),{open:wasOpen});});
  }
  draw();records.push({detail,body,state,current,readOpen,save:()=>save(id,state)});
 }
 const captureNativeOpen=()=>{for(const record of records)if(record.current()){record.state.open=record.readOpen(record.detail);const variant=record.body.querySelector('.hb-variant');if(variant)record.state.variantOpen=record.readOpen(variant);record.save();}};
 const cleanup=()=>{if(!alive)return;captureNativeOpen();alive=false;for(const {detail,body}of records){detail.ontoggle=null;for(const node of body.querySelectorAll('select'))node.onchange=null;for(const node of body.querySelectorAll('button'))node.onclick=null;const variant=body.querySelector('.hb-variant');if(variant)variant.ontoggle=null;}};
 cleanup.snapshot=()=>{if(alive)captureNativeOpen();return Object.fromEntries([...states].map(([id,state])=>[id,clone(state)]));};
 return cleanup;
}
