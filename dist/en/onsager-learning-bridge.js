import {mathHTML} from './math-display.js?v=20261113-prose2';

// Bounded, dimensionless teaching references. General response calculations
// stay in the existing Python tool; this module never starts a worker.
export const ONSAGER_BRIDGE_HOOKS=Object.freeze({
 'reciprocity-onsager':Object.freeze(['force-flux']),
 'reciprocity-spatial-response':Object.freeze(['dual-transform']),
 'reciprocity-dissipation':Object.freeze(['dissipation-directions'])
});
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=(x,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('A finite number in the stated teaching range is required.');return x;};
const choice=(x,values)=>{if(!values.includes(x))throw Error('Unknown bounded Onsager reference option.');return x;};
const add=(a,b)=>a.map((row,i)=>row.map((v,j)=>v+b[i][j]));
const scale=(a,s)=>a.map(row=>row.map(v=>s*v));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
const norm=a=>Math.hypot(...a.flat());
const diff=(a,b)=>add(a,scale(b,-1));
const diag=(a,b)=>[[a,0],[0,b]];
const fmt=x=>Math.abs(x)<1e-12&&x!==0?x.toExponential(3):Number(x.toFixed(6)).toString();
const tex=x=>fmt(x).replace(/e([+-]?\d+)$/,(_m,n)=>'\\times10^{'+Number(n)+'}');
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(tex).join('&')).join('\\\\')+'\\end{pmatrix}';
const vector=x=>matrix(x.map(v=>[v]));
const formula=content=>'<div class="osb-formula" tabindex="0">'+mathHTML(content,true)+'</div>';
const inline=content=>mathHTML(content);
const p=text=>'<p>'+esc(text)+'</p>';
const h=text=>'<h3>'+esc(text)+'</h3>';
const table=(caption,headers,rows)=>'<div class="osb-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const defaults=()=>({model:'hall',space:'c4',a:1,b:1.4,cross:.25,odd:.4,field:.6,magnetization:.3,violation:0,reverseM:'yes',forceX:1,forceY:0});

/** Same real two-channel model and state-variable parity convention as Python. */
export function onsagerResponseReference(input={}){
 const q={...defaults(),...input};
 choice(q.model,['hall','thermo','mixed']);choice(q.space,['c1','c4','mirror']);choice(q.reverseM,['yes','no']);
 for(const key of ['a','b'])finite(q[key],.05,4);
 for(const key of ['cross','odd','violation','forceX','forceY'])finite(q[key],-2,2);
 for(const key of ['field','magnetization'])finite(q[key],-3,3);
 const build=(B,M)=>{
  const t=B+M;
  let L=q.model==='hall'?[[q.a,q.odd*t],[-q.odd*t,q.b]]:q.model==='thermo'?[[q.a,q.cross+q.odd*t],[q.cross-q.odd*t,q.b]]:[[q.a,q.cross*t+q.odd],[q.cross*t-q.odd,q.b]];
  if(q.model==='hall'&&q.space==='c4')L[0][0]=L[1][1]=(q.a+q.b)/2;
  L[0][1]+=q.violation;return L;
 };
 const L=build(q.field,q.magnetization),LR=build(-q.field,q.reverseM==='yes'?-q.magnetization:q.magnetization),fullReverse=build(-q.field,-q.magnetization),E=diag(1,q.model==='mixed'?-1:1),S=scale(add(L,transpose(L)),.5),A=scale(diff(L,transpose(L)),.5),X=[q.forceX,q.forceY],J=mv(L,X);
 const mean=(S[0][0]+S[1][1])/2,gap=Math.hypot((S[0][0]-S[1][1])/2,S[0][1]);
 const transformed=mm(mm(E,transpose(LR)),E),canonical=mm(mm(E,transpose(fullReverse)),E),terms=J.map((v,i)=>v*X[i]);
 let spatial=null;
 if(q.model==='hall'){
  const R=q.space==='c4'?[[0,-1],[1,0]]:q.space==='mirror'?diag(1,-1):diag(1,1),sign=q.space==='mirror'?-1:1,rotated=mm(mm(R,L),transpose(R));
  spatial={R,transformedControls:[sign*q.field,sign*q.magnetization],covariance:norm(diff(build(sign*q.field,sign*q.magnetization),rotated)),sameState:norm(diff(L,rotated)),controlsRetained:q.space!=='mirror'||q.field===0&&q.magnetization===0};
 }
 return{input:q,L,LR,fullReverse,E,S,A,X,J,terms,entropy:dot(X,J),antisymmetricTerms:A.map((row,i)=>row.map((v,j)=>X[i]*v*X[j])),eigenvalues:[mean-gap,mean+gap],selectedResidual:norm(diff(L,transformed)),canonicalResidual:norm(diff(L,canonical)),compared:transformed,spatial};
}

/** Spatial indices and scalar thermodynamic channels are separate examples. */
export function onsagerTransformReference({kind='space',angleDegrees=30,scale:s=2}={}){
 choice(kind,['space','dual','force-only']);finite(angleDegrees,-180,180);finite(s,.5,3);
 const base=onsagerResponseReference(kind==='space'?{forceX:.7,forceY:-.4}:{model:'thermo',field:0,magnetization:0,forceX:1,forceY:-.4}),{L,X,J}=base;
 const rad=angleDegrees*Math.PI/180,c=Math.cos(rad),sn=Math.sin(rad);
 let map,XPrime,JPrime,LPrime,metric;
 if(kind==='space'){map=[[c,-sn],[sn,c]];XPrime=mv(map,X);JPrime=mv(map,J);LPrime=mm(mm(map,L),transpose(map));metric=diag(1,1);}
 else if(kind==='dual'){map=diag(s,1/s);XPrime=mv(diag(1/s,s),X);JPrime=mv(map,J);LPrime=mm(mm(map,L),map);metric=diag(1,1);}
 else{map=diag(1,s);XPrime=mv(map,X);JPrime=[...J];LPrime=mm(L,diag(1,1/s));metric=diag(1,1/s);}
 return{kind,angleDegrees,scale:s,L,X,J,map,XPrime,JPrime,LPrime,entropyMetric:metric,entropy:dot(J,X),correctEntropy:dot(JPrime,mv(metric,XPrime)),naiveEntropy:dot(JPrime,XPrime),naiveTransposeResidual:norm(diff(LPrime,transpose(LPrime))),responseResidual:Math.hypot(...mv(LPrime,XPrime).map((v,i)=>v-JPrime[i]))};
}

export function onsagerDissipationReference({model='active',angleDegrees=0,amplitude=1,forcePreset='custom'}={}){
 choice(model,['active','hall']);choice(forcePreset,['custom','axis','negative']);finite(angleDegrees,-180,180);finite(amplitude,.25,2);
 const radians=angleDegrees*Math.PI/180,X=forcePreset==='axis'?[1,0]:forcePreset==='negative'?[1,-1]:[amplitude*Math.cos(radians),amplitude*Math.sin(radians)];
 const result=onsagerResponseReference({...(model==='active'?{model:'thermo',cross:2,field:0,magnetization:0}:{}),forceX:X[0],forceY:X[1]});
 return{...result,model,angleDegrees:forcePreset==='axis'?0:forcePreset==='negative'?-45:angleDegrees,amplitude:Math.hypot(...X),forcePreset,symmetricEntropy:dot(X,mv(result.S,X)),antisymmetricEntropy:dot(X,mv(result.A,X))};
}

/** Zero field, one direction, linearized about uniform T0; no material units. */
export function onsagerKelvinReference(T0=2){
 finite(T0,.1,10);const L=onsagerResponseReference({model:'thermo',field:0,magnetization:0}).L;
 const S=L[0][1]/(T0*L[0][0]),Pi=L[1][0]/L[0][0],openForces=[S/T0,-1/(T0*T0)],openFlux=mv(L,openForces),isothermalForces=[1/T0,0],isothermalFlux=mv(L,isothermalForces);
 return{T0,mu0:0,L,S,Pi,TtimesS:T0*S,openForces,openFlux,isothermalForces,isothermalFlux};
}

const PRESETS=Object.freeze({
 'onsager-hall':{},'onsager-domain':{reverseM:'no'},'onsager-mirror':{space:'mirror'},'onsager-thermo':{model:'thermo',field:0,magnetization:0},'onsager-mixed':{model:'mixed'},'onsager-broken':{violation:.4},'onsager-active':{model:'thermo',cross:2,field:0,magnetization:0}
});
export function onsagerBridgeLabRequest({preset='onsager-hall',forceX,forceY}={}){
 if(!Object.hasOwn(PRESETS,preset))throw Error('Only an existing reciprocity preset can be copied.');
 const input={...defaults(),...PRESETS[preset]};
 if(forceX!==undefined)input.forceX=finite(forceX,-2,2);if(forceY!==undefined)input.forceY=finite(forceY,-2,2);
 return{module:'reciprocity',action:'reciprocity_lab',input,preset,source:'onsager-learning-bridge'};
}

const title=id=>({'force-flux':"The same matrix shape, different inputs and outputs",'dual-transform':"Changing coordinates, rescaling channels, and reversing magnetic domains",'dissipation-directions':"Does one positive value establish positivity in every direction?"}[id]);
const names=()=>[['onsager-hall',"Reverse every time-odd control"],['onsager-domain',"Reverse only the external magnetic field"],['onsager-mirror',"Mirror covariance and axial vectors"],['onsager-thermo',"Zero-field conjugate thermoelectric channels"],['onsager-mixed',"Abstract channels with opposite time-reversal parities"],['onsager-broken',"A deliberately nonreciprocal candidate"],['onsager-active',"A reciprocal but nonpassive candidate"]];
const select=(id,label,rows,value)=>'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+rows.map(([key,text])=>'<option value="'+key+'" '+(key===value?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
const range=(id,label,min,max,value)=>'<label for="'+id+'">'+esc(label)+'<input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="any" value="'+value+'"><output id="'+id+'-value">'+fmt(value)+'</output></label>';
const button=(id,text,disabled=false)=>'<button type="button" id="'+id+'" '+(disabled?'disabled':'')+'>'+esc(text)+'</button>';
const initial=id=>({open:false,native:{},note:'',choices:['','',''],checked:[false,false,false],revealed:0,copyOutcome:'',actionSpace:'hall',forceAngle:0,kind:'space',angle:30,scale:2,reversal:'both',model:'active',amplitude:1,forcePreset:'axis',preset:id==='dissipation-directions'?'onsager-active':'onsager-hall'});
function restore(id,raw){
 const s=initial(id);if(!raw||typeof raw!=='object'||Array.isArray(raw))return s;
 for(const k of ['open'])s[k]=raw[k]===true;
 s.note=typeof raw.note==='string'?raw.note.slice(0,2000):'';
 for(const k of ['actionSpace','kind','reversal','model','forcePreset','preset']){const allowed={actionSpace:['hall','static','thermo'],kind:['space','dual','force-only'],reversal:['both','field'],model:['active','hall'],forcePreset:['axis','negative','custom'],preset:Object.keys(PRESETS)}[k];if(allowed.includes(raw[k]))s[k]=raw[k];}
 for(const [k,min,max]of [['forceAngle',-180,180],['angle',-180,180],['scale',.5,3],['amplitude',.25,2]])if(typeof raw[k]==='number'&&Number.isFinite(raw[k])&&raw[k]>=min&&raw[k]<=max)s[k]=raw[k];
 s.revealed=Number.isInteger(raw.revealed)&&raw.revealed>=0&&raw.revealed<=3?raw.revealed:0;
 for(let i=0;i<3;i++){if(questions(id)[i].rows.some(([value])=>value===raw.choices?.[i]))s.choices[i]=raw.choices[i];s.checked[i]=raw.checked?.[i]===true&&!!s.choices[i]&&s.revealed>0;}
 for(const key of ['theory','kelvin','magnetic','matrix'])s.native[key]=raw.native?.[key]===true;
 return s;
}

function questions(id){
 if(id==='force-flux')return[
  {prompt:"With only a planar fourfold rotation and no assumed index symmetry, can an antisymmetric transverse term remain?",rows:[['allowed',"Yes: the spatial constraint permits an antisymmetric block"],['zero',"No: fourfold rotation sets every off-diagonal entry to zero"],['equal',"Yes, but the off-diagonal entries must be equal"]],answer:'allowed',feedback:{allowed:"Correct. The general planar matrix can be [[a,b],[-b,a]]. Adding the index symmetry of a static dielectric response then requires b=0.",zero:"Fourfold rotation alone permits an antisymmetric block. Importing the additional index symmetry of static dielectric response into Hall transport would remove an allowed term.",equal:"The general fourfold constraint gives Lxy=-Lyx. Requiring equality is an additional index-symmetry condition."}},
  {prompt:"Charge and energy state variables are time-even. How do the corresponding charge and energy currents transform?",rows:[['odd',"Both currents change sign"],['even',"Both currents remain unchanged"],['mixed',"Charge current changes sign; energy current does not"]],answer:'odd',feedback:{odd:"Correct. Time reversal preserves charge and energy densities but reverses their rates of change or associated conserved currents.",even:"A state variable and its flux are different objects. Its rate of change or associated conserved current acquires an extra minus sign under time reversal.",mixed:"The direction of energy transport also reverses. An even energy variable does not make its current even."}},
  {prompt:"Under the one-dimensional, zero-field convention stated below, how are the Seebeck and Peltier coefficients related?",rows:[['temperature','Π=T₀S'],['equal','Π=S'],['negative','Π=-T₀S']],answer:'temperature',feedback:{temperature:"Correct. Equal entropy-conjugate coefficients produce a factor T₀ when expressed using the electrochemical field and temperature gradient.",equal:"Here L12 and L21 are equal. The electrochemical field and temperature gradient carry different scaling factors in the measured relations, so T₀ must be retained.",negative:"This example explicitly defines Eec=S∇T under open-circuit conditions. Other voltage or gradient directions require comparing the definitions along with the signs."}}
 ];
 if(id==='dual-transform')return[
  {prompt:"If only the second force is rescaled while the fluxes are unchanged, does an asymmetric new matrix establish a physical failure of reciprocity?",rows:[['conjugacy',"No: first check whether the new force-flux pair is entropy-conjugate"],['violation',"Yes: every square response matrix must be symmetric"],['ignore',"Do not compare: inspect only the diagonal entries"]],answer:'conjugacy',feedback:{conjugacy:"Correct. A force-only change introduces a pairing metric into entropy production. Ordinary transposition is no longer the reciprocity test in the original convention.",violation:"The new coordinates can describe the same physical response. Transform the entropy-production pairing too before comparing reciprocity conditions.",ignore:"Diagonal entries alone neither test cross-channel reciprocity nor ensure nonnegative dissipation in every direction."}},
  {prompt:"For nonzero Bz and Mz, does a zero mirror-covariance residual between magnetic states establish mirror symmetry of the original domain?",rows:[['states',"No: the mirror also reverses both axial-vector controls"],['same',"Yes: every control is unchanged"],['rotation',"Yes: a mirror is just a planar rotation"]],answer:'states',feedback:{states:"Correct. Covariance connecting opposite magnetic states differs from invariance of one complete state.",same:"This in-plane mirror reverses Bz and Mz; nonzero controls do not retain their original values.",rotation:"A mirror has determinant -1. Axial-vector transformations include that determinant factor and cannot be treated as proper rotations."}},
  {prompt:"With nonzero magnetization in this example, can a nonzero residual from reversing B alone directly refute Onsager reciprocity?",rows:[['all',"No: the complete comparison also reverses M"],['yes',"Yes: reversing B is always sufficient"],['swap',"Simply exchange the diagonal entries"]],answer:'all',feedback:{all:"Correct. Reverse all time-odd controls together and exchange the driving and readout channels.",yes:"Keeping a nonzero M does not produce the time-reversed configuration. The tool also reports the residual for complete reversal.",swap:"A reciprocity comparison includes the complete response matrix, transposed channels, and variable parities; exchanging diagonal entries is insufficient."}}
 ];
 return[
  {prompt:"Do positive diagonal entries in a reciprocal matrix guarantee nonnegative entropy production for every driving direction?",rows:[['no',"No: also check the smallest eigenvalue of its symmetric part"],['yes',"Yes: positive diagonal entries are sufficient"],['trace',"A positive trace is sufficient"]],answer:'no',feedback:{no:"Correct. Sufficiently large symmetric cross terms still allow a direction with negative entropy production.",yes:"Here the diagonal entries are 1 and 1.4, yet X=(1,-1) produces a negative quadratic form.",trace:"A positive trace means the sum of eigenvalues is positive; one eigenvalue can still be negative."}},
  {prompt:"As the real conjugate force changes direction, what is the net entropy-production contribution of the antisymmetric Hall part?",rows:[['zero',"Always zero: the two terms cancel"],['negative',"Always negative"],['positive',"Always positive"]],answer:'zero',feedback:{zero:"Correct. The cross terms are equal and opposite. Changing the force direction cannot make a real antisymmetric quadratic form produce net dissipation.",negative:"One cross term may be negative, but its paired term must also be included.",positive:"The antisymmetric Hall term changes the current direction. For real conjugate forces, only the symmetric part determines total entropy production."}},
  {prompt:"Does positive entropy production at X=(1,0) rule out negative values in other directions?",rows:[['direction',"No: change direction or check the smallest eigenvalue"],['one',"Yes: one positive value is sufficient"],['reciprocal',"Reciprocity alone rules them out"]],answer:'direction',feedback:{direction:"Correct. Keeping the same matrix and changing to X=(1,-1) gives a counterexample.",one:"One applied force tests one quadratic-form value, not the entire driving space.",reciprocal:"Reciprocity and passivity are separate conditions. This example has zero reciprocity residual but a negative smallest dissipation eigenvalue."}}
 ];
}

function questionHTML(prefix,id,state,index){
 const q=questions(id)[index];return'<section class="osb-question"><h4>'+esc(q.prompt)+'</h4>'+select(prefix+'-q'+index,"Your prediction",[['',"Choose a prediction first"],...q.rows],state.choices[index])+'<p class="osb-choice-reading" id="'+prefix+'-reading'+index+'"></p>'+button(prefix+'-check'+index,"Check your reasoning",!state.choices[index]||!state.revealed)+'<p class="osb-feedback" role="status" id="'+prefix+'-feedback'+index+'"></p></section>';
}
function native(prefix,key,label,state,html){return'<details class="osb-native" data-osb-native="'+key+'" '+(state.native[key]?'open':'')+'><summary>'+esc(label)+'</summary>'+html+'</details>';}
function forceOutput(state){
 const rad=state.forceAngle*Math.PI/180,X=[Math.cos(rad),Math.sin(rad)],kind=state.actionSpace;
 const L=kind==='hall'?onsagerResponseReference().L:kind==='static'?[[1.2,0],[0,1.2]]:onsagerResponseReference({model:'thermo',field:0,magnetization:0}).L,J=mv(L,X),terms=J.map((v,i)=>v*X[i]);
 let html=h("Specify the action space before reading matrix rows and columns")+p(kind==='thermo'?"These indices label charge and energy scalar channels, not spatial x and y coordinates.":"These indices label spatial x and y components in one plane.")+table("Rows are outputs; columns are inputs",["Object","Rows / outputs","Columns / inputs","Additional condition"],[[kind==='static'?"Static dielectric planar block":kind==='thermo'?"Zero-field thermoelectric reference":"Planar Hall reference",kind==='static'?'Px, Py':kind==='thermo'?"Charge and energy fluxes":'Jx, Jy',kind==='static'?'Ex, Ey':kind==='thermo'?"Entropy-conjugate forces X₁ and X₂":"Conjugate driving forces Xx and Xy",kind==='static'?"Second derivatives of an equilibrium potential give index symmetry":kind==='thermo'?"Both state variables are time-even":"No assumed condition Lxy=Lyx"]])+formula((kind==='static'?'\\chi=':'L=')+matrix(L));
 if(state.revealed>=2){
  html+=h("Contract each row with the input")+formula((kind==='static'?'\\mathbf P=\\chi\\mathbf E=':'\\mathbf J=L\\mathbf X=')+matrix(L)+vector(X)+'='+vector(J))+p(kind==='static'?"This is a static polarization response. P·E is not the entropy-production rate of this transport model.":"The following quantities form a dimensionless entropy-conjugate reference, not material transport coefficients.");
  if(kind!=='static')html+=table("Add the entropy-production terms",["Channel","Flux","Conjugate force","Product"],J.map((v,i)=>[i+1,fmt(v),fmt(X[i]),fmt(terms[i])]))+formula('\\sigma=J_1X_1+J_2X_2='+tex(terms[0])+'+('+tex(terms[1])+')='+tex(dot(J,X)));
 }
 if(state.revealed>=3)html+=h("Separate spatial constraints from intrinsic constraints")+formula('R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix},\\quad L=RLR^{T}\\Rightarrow L=\\begin{pmatrix}a&b\\\\-b&a\\end{pmatrix}')+p("Adding the static dielectric condition χ=χᵀ gives the planar block χ=aI. General Hall transport cannot directly inherit that index symmetry.")+p("Consider a separate local relaxation reference: a denotes deviations from equilibrium, and entropy is quadratic nearby. The conjugate force is its derivative with respect to a state variable; the flux is the variable's rate of change. This gives the pairing a concrete origin without calling static polarization a transport flux.")+formula('s=s_0-\\tfrac12(a_1^2+a_2^2),\\quad X_i=\\frac{\\partial s}{\\partial a_i}=-a_i,\\quad J_i=\\dot a_i,\\quad\\dot s=\\sum_iX_iJ_i')+table("Time-reversal parities of states, conjugate forces, and fluxes",["Object","State variable","Entropy-conjugate force","Rate of change / conserved current"],[["Charge and energy","Both even","Both even","Both odd"],["Abstract even and odd variables",'ε₁=+1, ε₂=-1','ε₁=+1, ε₂=-1','-ε₁, -ε₂']])+p("The extra flux minus sign comes from reversing time. Onsager reciprocity additionally relies on microscopic reversibility; simply reversing an irreversible constitutive law does not prove it.");
 return html;
}
function transformOutput(state){
 const r=onsagerTransformReference({kind:state.kind,angleDegrees:state.angle,scale:state.scale});
 let html=h("First identify the two indices")+p(state.kind==='space'?"The spatial example fixes the default Hall matrix and X=(0.7,-0.4). The component map is explicitly v′=Qv; active sample rotation and passive coordinate changes must be named separately.":"This example fixes two even scalar channels at zero field, L=[[1,0.25],[0.25,1.4]], and X=(1,-0.4). The channels are not spatial x and y components.")+formula('L='+matrix(r.L)+',\\quad X='+vector(r.X)+',\\quad J='+vector(r.J));
 if(state.revealed>=2){
  html+=h("Compare forces and fluxes using their pairing rule")+p(state.kind==='space'?"An orthogonal component map acts on both flux and force, transforming each spatial matrix index once.":state.kind==='dual'?"When scalar channel scales change, fluxes transform by A and conjugate forces by its inverse transpose. This example only rescales two time-even channels.":"This counterexample changes only the forces, Y=CX, leaving J unchanged. Y and the original J are no longer conjugate under the ordinary Euclidean dot product.")+formula(state.kind==='space'?'J^\\prime=QJ,\\quad X^\\prime=QX,\\quad L^\\prime=QLQ^{T}':state.kind==='dual'?'J^\\prime=AJ,\\quad X^\\prime=A^{-T}X,\\quad L^\\prime=ALA^{T}':'Y=CX,\\quad J=KY,\\quad K=LC^{-1}')+formula((state.kind==='space'?'Q=':state.kind==='dual'?'A=':'C=')+matrix(r.map))+formula((state.kind==='force-only'?'K=':'L^\\prime=')+matrix(r.LPrime))+formula((state.kind==='force-only'?'Y=':'X^\\prime=')+vector(r.XPrime)+',\\quad J^\\prime='+vector(r.JPrime));
 }
 if(state.revealed>=3){
  html+=h("Use entropy production to check that the comparison describes the same response")+formula(state.kind==='force-only'?'\\sigma=J^{T}C^{-1}Y='+tex(r.correctEntropy):'\\sigma=J^{T}X=J^{\\prime T}X^\\prime='+tex(r.correctEntropy))+table("One response with two pairing calculations",["Check","Value"],[["Original entropy production",fmt(r.entropy)],["Calculated with the correct pairing",fmt(r.correctEntropy)],["Direct product of the newly displayed components",fmt(r.naiveEntropy)],["Distance of the displayed matrix from its ordinary transpose",fmt(r.naiveTransposeResidual)]])+p(state.kind==='force-only'?"An asymmetric K can still describe the original reciprocal response. Restore the correct pairing metric before testing reciprocity. At unit scale, the example returns to the original convention.":state.kind==='space'?"This fixed Hall block retains its form under proper planar rotations and can retain its antisymmetric transverse term. Ordinary asymmetry at one magnetic state is not a reciprocity violation.":"Paired rescaling preserves σ. Both channels here are even. Mixing channels of different time parities would also require transforming the parity operator instead of retaining its old diagonal signs.");
 }
 return html;
}
function magneticOutput(state){
 const r=onsagerResponseReference({reverseM:state.reversal==='both'?'yes':'no'}),mirror=onsagerResponseReference({space:'mirror'});
 return p("This separate section fixes the default Hall model at B=0.6, M=0.3, d=0.4. It does not inherit the scalar-channel scale above.")+formula('L(B,M)='+matrix(r.L)+',\\quad L_{\\rm comparison}='+matrix(r.LR))+formula('E L_{\\rm comparison}^{T}E='+matrix(r.compared))+table("Reversal conditions, transposition, and residuals",["Comparison","Result"],[["Reciprocity residual for the selected reversal",fmt(r.selectedResidual)],["Residual after reversing both B and M",fmt(r.canonicalResidual)],["Mirror covariance residual between magnetic states",fmt(mirror.spatial.covariance)],["Mirror invariance residual at the same magnetic state",fmt(mirror.spatial.sameState)]])+p("The in-plane mirror has determinant -1, so the perpendicular axial-vector components Bz and Mz both reverse. Connecting opposite magnetic states does not make the original nonzero magnetic state mirror-invariant.")+formula('L(-B,-M)=R_mL(B,M)R_m^{T},\\quad R_m=\\operatorname{diag}(1,-1)')+p("The mirror residuals use the original mirror preset a=1, b=1.4, separately from the averaged diagonal values of the fourfold preset above. Reversing B without M gives an incomplete comparison, not a failure of the full Onsager test.");
}
function dissipationCurve(r){
 const samples=Array.from({length:73},(_,i)=>{const angle=-Math.PI+2*Math.PI*i/72,X=[r.amplitude*Math.cos(angle),r.amplitude*Math.sin(angle)];return[-180+5*i,dot(X,mv(r.S,X))];}),lo=Math.min(0,...samples.map(x=>x[1])),hi=Math.max(0,...samples.map(x=>x[1])),span=hi-lo||1,xy=([x,y])=>[48+(x+180)*440/360,195-155*(y-lo)/span],point=xy([r.angleDegrees,r.entropy]),zero=xy([0,0])[1];
 return"<div class=\"osb-scroll\" tabindex=\"0\"><svg class=\"osb-curve\" viewBox=\"0 0 540 260\" role=\"img\" aria-label=\"Entropy production versus driving direction at fixed matrix and amplitude\"><path d=\"M48 30V195H488\" fill=\"none\" stroke=\"#7c9586\"/><path d=\"M48 "+zero+'H488" stroke="#9caea1" stroke-dasharray="4 4"/><polyline points="'+samples.map(v=>xy(v).join(',')).join(' ')+'" fill="none" stroke="#216946" stroke-width="3"/><circle cx="'+point[0]+'" cy="'+point[1]+'" r="6" fill="#a56520" stroke="white" stroke-width="2"/><text x="48" y="225">−180°</text><text x="442" y="225">180°</text><text x="55" y="24">σ</text><text x="534" y="42" text-anchor="end">'+fmt(hi)+'</text><text x="534" y="195" text-anchor="end">'+fmt(lo)+'</text><text x="210" y="251">'+esc("Driving direction θ")+'</text></svg></div>';
}
function dissipationOutput(state){
 const r=onsagerDissipationReference({model:state.model,angleDegrees:state.forceAngle,amplitude:state.amplitude,forcePreset:state.forcePreset});
 let html=h("Keep the matrix fixed and change only the driving direction")+p(state.model==='active'?"Keep the existing reciprocal but nonpassive candidate L=[[1,2],[2,1.4]]. The direction buttons select exactly (1,0) and (1,-1) without changing the model.":"Keep the default Hall model L=[[1.2,0.36],[-0.36,1.2]]. Its antisymmetric term changes the response-current direction.")+formula('L='+matrix(r.L)+',\\quad X='+vector(r.X)+',\\quad J='+vector(r.J))+dissipationCurve(r)+p("The curve scans every direction at the current force amplitude; the orange point marks the current choice. Continuous angles use floating-point trigonometry, so endpoints can retain machine-precision residuals.");
 if(state.revealed>=2)html+=h("Add every term instead of inspecting one diagonal entry")+table("Entropy production and all-direction diagnostics",["Check","Result"],[['J₁X₁',fmt(r.terms[0])],['J₂X₂',fmt(r.terms[1])],["Total entropy production",fmt(r.entropy)],["Smallest dissipation eigenvalue",fmt(r.eigenvalues[0])],["Reciprocity residual after reversing all time-odd controls",fmt(r.canonicalResidual)]])+formula('S=\\tfrac12(L+L^{T})='+matrix(r.S)+',\\quad\\sigma=X^{T}SX='+tex(r.symmetricEntropy))+p("A positive value in one direction does not ensure positivity elsewhere. Nonnegative production for every real conjugate force requires the smallest eigenvalue of S to be nonnegative.");
 if(state.revealed>=3)html+=h("Watch the two Hall cross terms cancel")+formula('A=\\tfrac12(L-L^{T})='+matrix(r.A))+table("The four terms of the antisymmetric quadratic form",["Term","Value"],[['X₁A₁₁X₁',fmt(r.antisymmetricTerms[0][0])],['X₁A₁₂X₂',fmt(r.antisymmetricTerms[0][1])],['X₂A₂₁X₁',fmt(r.antisymmetricTerms[1][0])],['X₂A₂₂X₂',fmt(r.antisymmetricTerms[1][1])]])+formula('X^{T}AX='+tex(r.antisymmetricEntropy))+p("The antisymmetric part contributes zero net entropy production for real conjugate forces. Select the Hall model with both force components nonzero to see equal and opposite nonzero cross terms.");
 return html;
}
function kelvinHTML(){
 const r=onsagerKelvinReference();return p("This section uses one spatial direction at zero field, linearized about uniform T₀. Every number remains a dimensionless algebraic reference; the matrix does not establish experimental units or material constants.")+p("To linear order about uniform T₀ and μ₀, heat current is jq=ju-μ₀jn. Here jn is particle current and je is charge current; they are distinct. This section chooses the reference energy zero so that μ₀=0. Energy and heat currents then have the same values in this convention, allowing reuse of the same numerical L.")+formula('j_q=j_u-\\mu_0j_n,\\quad\\mu_0=0')+p("Define the electrochemical driving field as Eec and use the temperature force conjugate to heat current. For general nonzero μ₀, both fluxes and forces must transform; renaming energy current as heat current while retaining the original matrix is insufficient.")+formula('\\binom{j_e}{j_q}=L\\binom{E_{\\rm ec}/T_0}{-\\nabla T/T_0^2},\\quad \\sigma=j_e E_{\\rm ec}/T_0-j_q\\nabla T/T_0^2')+p("Define Eec=S∇T at open circuit, je=0, and Π=jq/je under isothermal conditions, ∇T=0. Eliminate the appropriate variables in each case.")+formula('S=\\frac{L_{12}}{T_0L_{11}},\\quad\\Pi=\\frac{L_{21}}{L_{11}},\\quad L_{12}=L_{21}\\Rightarrow\\Pi=T_0S')+table("The same zero-field reference, T₀=2",["Quantity","Result"],[['L12 = L21',fmt(r.L[0][1])],['Seebeck S',fmt(r.S)],['Peltier Π',fmt(r.Pi)],['T₀ S',fmt(r.TtimesS)]])+p("Reversing voltage or temperature-gradient conventions requires checking the definitions of S and Π along with their signs.")+p("This explains why cross coefficients in measured relations need not be numerically equal. General finite-field, tensor, and contact measurements require the original tools and additional measurement conventions.");
}

function bodyHTML(prefix,id,state,canCopy){
 const controls=id==='force-flux'?select(prefix+'-actionSpace',"Specify inputs and outputs",[['hall',"Spatial Hall components"],['static',"Static dielectric planar block"],['thermo',"Zero-field charge-energy channels"]],state.actionSpace)+range(prefix+'-forceAngle',"Reference input direction θ / degrees",-180,180,state.forceAngle):id==='dual-transform'?select(prefix+'-kind',"Choose a transformation",[['space',"Orthogonal spatial component map"],['dual',"Paired scalar-channel rescaling"],['force-only',"Counterexample: change forces alone, retaining fluxes"]],state.kind)+range(prefix+'-angle',"Spatial mapping angle θ / degrees",-180,180,state.angle)+range(prefix+'-scale',"Scalar-channel scale s",.5,3,state.scale):select(prefix+'-model',"Fixed response matrix",[['active',"Reciprocal but nonpassive candidate"],['hall',"Passive Hall reference"]],state.model)+range(prefix+'-forceAngle',"Conjugate-force direction θ / degrees",-180,180,state.forceAngle)+range(prefix+'-amplitude',"Conjugate-force amplitude",.25,2,state.amplitude);
 return p("This fixed dimensionless two-channel example checks variable and pairing conventions. It neither replaces the existing Python tool nor changes course mastery records.")+'<div class="osb-controls">'+controls+'</div>'+(id==='dissipation-directions'?'<div class="osb-actions">'+button(prefix+'-axis',"Select X=(1,0)")+button(prefix+'-negative',"Select X=(1,-1)")+'</div>':'')+questionHTML(prefix,id,state,0)+'<div class="osb-actions">'+button(prefix+'-observe',"Reveal the first step",!state.choices[0])+button(prefix+'-next',"Continue to the next step",!state.revealed||state.revealed>=3)+'</div><div class="osb-output" id="'+prefix+'-output"></div>'+questionHTML(prefix,id,state,1)+questionHTML(prefix,id,state,2)+(id==='force-flux'?native(prefix,'kelvin',"Optional derivation: from conjugate coefficients to Π=T₀S",state,kelvinHTML()):id==='dual-transform'?native(prefix,'magnetic',"Check magnetic-state reversal and mirror covariance separately",state,'<div class="osb-controls">'+select(prefix+'-reversal',"Which time-odd controls are reversed?",[['both',"Reverse both B and M"],['field',"Reverse B only, keeping M unchanged"]],state.reversal)+'</div><div id="'+prefix+'-magnetic-output"></div>'):native(prefix,'matrix',"Why only the symmetric part must be positive semidefinite",state,formula('X^{T}AX=(X^{T}AX)^T=X^{T}A^{T}X=-X^{T}AX=0')+p("A real antisymmetric quadratic form vanishes. A real symmetric matrix is orthogonally diagonalizable, so a nonnegative quadratic form in every direction is equivalent to nonnegative eigenvalues. Reciprocity alone does not impose that condition.")))+
 '<label class="osb-notes" for="'+prefix+'-note">'+esc("Record the variables, conventions, and evidence in your own words (this page session only)")+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+native(prefix,'theory',"Check these three operations before comparing",state,table("Keep these three operations distinct",["Operation","What changes","What to check"],[["Spatial component map","Spatial components of the same physical flux and force","Transform every spatial index and the controls together"],["Channel rescaling","Numerical representation of conjugate quantities","Inverse-transpose pairing and entropy production"],["Time-reversed comparison","B, M, and every other time-odd control","Variable parities, matrix transposition, and reversed states"]])+p("This page uses a finite real near-steady linear-response reference. Complex frequency response, nonlinear transport, or nonlocal transport requires the corresponding reciprocity formulation."))+
 (canCopy?'<section class="osb-copy"><h4>'+esc("Copy an existing model preset")+'</h4>'+p(id==='dissipation-directions'?"Copy the original preset for the current model together with the current driving direction. Predictions, curves, and notes are not production inputs.":"Choose one of the seven existing presets below. Spatial coordinate changes, channel rescaling, and the thermoelectric-unit derivation are not copied as new production models.")+(id==='dissipation-directions'?'':'<div class="osb-controls">'+select(prefix+'-preset',"Existing tool preset",names(),state.preset)+'</div>')+'<p id="'+prefix+'-copy-description"></p>'+button(prefix+'-copy',id==='dissipation-directions'?"Copy the current fixed model and force direction to the experiment":"Copy the selected existing preset and wait for manual calculation")+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p class="osb-links"><a href="#classroom/observables?module=reciprocity&lesson='+({ 'force-flux':'reciprocity-onsager','dual-transform':'reciprocity-spatial-response','dissipation-directions':'reciprocity-dissipation'}[id])+'&tab=lab">'+esc("Open the existing reciprocity experiment; this link does not transfer the reference transformation")+'</a></p>')+button(prefix+'-reset',"Reset this optional experiment");
}

export function onsagerBridgeHTML(lessonId){
 if(!Object.hasOwn(ONSAGER_BRIDGE_HOOKS,lessonId))return '';
 const id=ONSAGER_BRIDGE_HOOKS[lessonId][0];
 return"<section class=\"osb-prerequisite\" aria-label=\"Optional force-flux and reciprocity experiment\"><p class=\"osb-intro\">"+esc("Connect inputs, outputs, and comparison conventions when moving from property tensors to reciprocity. If these operations are familiar, continue directly with the original lesson.")+'</p><details class="osb-panel" data-osb-panel="'+id+'"><summary>'+esc(title(id))+'</summary><div class="osb-body" data-osb-body="'+id+'"></div></details></section>';
}

export function bindOnsagerLearningBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const id=Object.hasOwn(ONSAGER_BRIDGE_HOOKS,lessonId)?ONSAGER_BRIDGE_HOOKS[lessonId][0]:null,store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':'+id;
 const detail=id?root?.querySelector?.('[data-osb-panel="'+id+'"]'):null,body=id?root?.querySelector?.('[data-osb-body="'+id+'"]'):null,state=restore(id,store.get(key)),prefix='osb-'+id;
 let alive=true,ticket=0,busy=false;
 const owns=()=>alive&&detail&&body&&root?.isConnected!==false&&root.querySelector('[data-osb-panel="'+id+'"]')===detail&&root.querySelector('[data-osb-body="'+id+'"]')===body;
 const current=()=>owns()&&isCurrent();
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const save=()=>{if(id&&detail&&body)store.set(key,clone(state));};
 const open=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 const invalidate=(keepSteps=false)=>{if(!keepSteps)state.revealed=0;state.checked=[false,false,false];state.copyOutcome='';ticket++;if($('copy-status'))$('copy-status').textContent='';};
 const fields=id==='force-flux'?['actionSpace','forceAngle']:id==='dual-transform'?['kind','angle','scale','reversal']:['model','forceAngle','amplitude'];
 function capture(){
  if(!owns())return;
  state.open=open(detail);for(const d of body.querySelectorAll('[data-osb-native]'))state.native[d.dataset.osbNative]=open(d);
  const note=$('note');if(note)state.note=String(note.value).slice(0,2000);
  let changed=false,onlyContinuous=true;
  for(const field of [...fields,'preset']){const node=$(field);if(!node)continue;const continuous=['forceAngle','angle','scale','amplitude'].includes(field),value=continuous?Number(node.value):node.value;const candidate=restore(id,{...state,[field]:value});if(candidate[field]!==state[field]){state[field]=candidate[field];changed=true;onlyContinuous=onlyContinuous&&continuous;if(field==='forceAngle'||field==='amplitude')state.forcePreset='custom';}}
  if(changed)invalidate(onlyContinuous);
  for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||questions(id)[i].rows.some(([v])=>v===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}
  save();
 }
 function request(){
  if(id==='dissipation-directions'){const r=onsagerDissipationReference({model:state.model,angleDegrees:state.forceAngle,amplitude:state.amplitude,forcePreset:state.forcePreset});return onsagerBridgeLabRequest({preset:state.model==='active'?'onsager-active':'onsager-hall',forceX:r.X[0],forceY:r.X[1]});}
  return onsagerBridgeLabRequest({preset:state.preset});
 }
 function update(){
  if(!current())return;
  $('output').innerHTML=state.revealed?(id==='force-flux'?forceOutput(state):id==='dual-transform'?transformOutput(state):dissipationOutput(state)):p("Predict before revealing the reference. Changing models requires revealing it again; continuous adjustments retain the revealed steps but clear checked feedback.");
  $('observe').disabled=!state.choices[0];$('next').disabled=!state.revealed||state.revealed>=3;
  for(let i=0;i<3;i++){const q=questions(id)[i],feedback=$('feedback'+i);$('check'+i).disabled=!state.choices[i]||!state.revealed;feedback.textContent=state.checked[i]?q.feedback[state.choices[i]]:'';feedback.setAttribute('class','osb-feedback'+(state.checked[i]?(state.choices[i]===q.answer?' osb-correct':' osb-retry'):''));$('reading'+i).textContent=q.rows.find(([value])=>value===state.choices[i])?.[1]||'';}
  for(const field of ['forceAngle','angle','scale','amplitude']){const output=$(field+'-value');if(output)output.textContent=fmt(state[field]);}
  if($('magnetic-output'))$('magnetic-output').innerHTML=magneticOutput(state);
  if($('copy-description')){const r=request();$('copy-description').textContent=id==='dissipation-directions'?"The copy contains the original preset for the current fixed matrix and the current X₁ and X₂, not the displayed curve or derivation steps.":"Only the complete input of the selected existing preset is copied. Reference directions, angles, scales, and magnetic-state comparisons above do not override it.";$('copy-description').setAttribute('data-osb-request-preset',r.preset);}
  if($('copy'))$('copy').disabled=busy;
  save();
 }
 function draw(){
  if(!current())return;body.innerHTML=bodyHTML(prefix,id,state,typeof onOpenLab==='function');
  for(const d of body.querySelectorAll('[data-osb-native]'))d.ontoggle=()=>{if(current()&&body.querySelector('[data-osb-native="'+d.dataset.osbNative+'"]')===d){state.native[d.dataset.osbNative]=open(d);save();}};
  const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};};
  for(const field of fields)bind(field,['forceAngle','angle','scale','amplitude'].includes(field)?'oninput':'onchange',()=>{});
  for(let i=0;i<3;i++){bind('q'+i,'onchange',()=>{});bind('check'+i,'onclick',()=>{state.checked[i]=true;});}
  bind('observe','onclick',()=>{state.revealed=1;state.checked=[false,false,false];});
  bind('next','onclick',()=>{state.revealed=Math.min(3,state.revealed+1);});
  bind('axis','onclick',()=>{invalidate(true);state.forcePreset='axis';state.forceAngle=0;state.amplitude=1;$('forceAngle').value='0';$('amplitude').value='1';});
  bind('negative','onclick',()=>{invalidate(true);state.forcePreset='negative';state.forceAngle=-45;state.amplitude=Math.SQRT2;$('forceAngle').value='-45';$('amplitude').value=String(Math.SQRT2);});
  bind('preset','onchange',()=>{});
  const note=$('note');note.oninput=()=>{if(current()&&$('note')===note){state.note=String(note.value).slice(0,2000);save();}};
  bind('reset','onclick',()=>{ticket++;const wasOpen=state.open;Object.assign(state,initial(id),{open:wasOpen});draw();$('q0')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy)copy.onclick=async()=>{
   if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=clone(request());busy=true;copy.disabled=true;state.copyOutcome='';$('copy-status').textContent='';
   try{const accepted=await onOpenLab(payload);if(current()&&job===ticket){if(accepted===false)throw Error('The existing experiment did not accept this reference.');state.copyOutcome='success';$('copy-status').textContent="Inputs copied. Check the parameters in the existing experiment and run it manually.";save();}}
   catch(error){if(current()&&job===ticket){state.copyOutcome='error';$('copy-status').textContent="The input copy did not complete. You can try again.";save();}}
   finally{busy=false;if(current())$('copy').disabled=false;}
  };
  update();
 }
 if(detail&&body){if(state.open){detail.open=true;detail.setAttribute?.('open','');}detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body)for(const tag of ['button','select','input','textarea','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.ontoggle=null;}};
 cleanup.snapshot=()=>{capture();return id?{[id]:clone(state)}:{};};return cleanup;
}
