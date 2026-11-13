import {mathHTML} from './math-display.js?v=20261113-prose2';

// Optional, bounded two-spin references. No worker, network, storage or mastery writes.
export const QUANTUM_STATE_BRIDGE_HOOKS=Object.freeze({
 'density-pure-mixed':Object.freeze(['partial-trace','schmidt-pure']),
 'density-exchange':Object.freeze(['schmidt-pure']),
 'spt-schmidt':Object.freeze(['partial-trace','schmidt-pure','triplet-virtual']),
 'spt-aklt-parent':Object.freeze(['triplet-virtual']),
 'su2-coupling-representations':Object.freeze(['triplet-virtual'])
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const z=(re=0,im=0)=>[re,im];
const add=(a,b)=>z(a[0]+b[0],a[1]+b[1]);
const mul=(a,b)=>z(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]);
const conj=a=>z(a[0],-a[1]);
const abs2=a=>a[0]*a[0]+a[1]*a[1];
const scale=(a,t)=>a.map(row=>row.map(x=>mul(x,z(t))));
const adjoint=a=>a[0].map((_,j)=>a.map(row=>conj(row[j])));
const transpose=a=>a[0].map((_,j)=>a.map(row=>[...row[j]]));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>add(s,mul(x,b[k][j])),z())));
const kron=(a,b)=>a.flatMap(row=>b.map(br=>row.flatMap(x=>br.map(y=>mul(x,y)))));
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>z(Number(i===j))));
const residual=(a,b)=>Math.max(...a.flatMap((row,i)=>row.map((x,j)=>Math.hypot(x[0]-b[i][j][0],x[1]-b[i][j][1]))));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function matrixCopy(value,n,m=n){
 if(!Array.isArray(value)||value.length!==n||value.some(row=>!Array.isArray(row)||row.length!==m||row.some(x=>!Array.isArray(x)||x.length!==2||!x.every(finite))))throw Error('A finite complex matrix with the stated shape is required.');
 return value.map(row=>row.map(x=>[...x]));
}
const entropy=(probabilities,base)=>-probabilities.reduce((s,p)=>s+(p>0?p*Math.log(p)/Math.log(base):0),0);

export function partialTraceReference(rho,subsystem='A',row=0,column=0){
 const a=matrixCopy(rho,4);
 if(!['A','B'].includes(subsystem)||![row,column].every(x=>Number.isInteger(x)&&x>=0&&x<2))throw Error('Choose subsystem A or B and a 2 by 2 matrix cell.');
 const indices=(i,j,b)=>subsystem==='A'?[2*i+b,2*j+b]:[2*b+i,2*b+j];
 const reduced=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>[0,1].reduce((s,b)=>{const [r,c]=indices(i,j,b);return add(s,a[r][c]);},z())));
 const terms=[0,1].map(b=>{const [r,c]=indices(row,column,b);return {row:r,column:c,ignoredIndex:b,value:[...a[r][c]]};});
 return {subsystem,row,column,matrix:reduced,terms,sum:[...reduced[row][column]]};
}

export function coefficientStateReference(value){
 const C=matrixCopy(value,2),ket=C.flat(),norm=ket.reduce((s,x)=>s+abs2(x),0);
 if(Math.abs(norm-1)>1e-10)throw Error('The coefficient matrix must describe a normalized pure state.');
 const rho=ket.map(x=>ket.map(y=>mul(x,conj(y))));
 const rhoA=mm(C,adjoint(C));
 // With C[i,j] multiplying |i>_A |j>_B, rho_B = C^T C*, not C^dagger C.
 const rhoB=mm(transpose(C),C.map(row=>row.map(conj)));
 const gap=Math.hypot(rhoA[0][0][0]-rhoA[1][1][0],2*Math.sqrt(abs2(rhoA[0][1])));
 const p=Math.max(0,Math.min(1,(1+gap)/2)),probabilities=[p,Math.max(0,1-p)];
 const determinant=rhoA[0][0][0]*rhoA[1][1][0]-abs2(rhoA[0][1]);
 const xx=2*add(mul(conj(ket[0]),ket[3]),mul(conj(ket[1]),ket[2]))[0];
 return {C,ket,rho,rhoA,rhoB,schmidtProbabilities:probabilities,singularValues:probabilities.map(Math.sqrt),
  entropyBits:entropy(probabilities,2),entropyNats:entropy(probabilities,Math.E),globalEntropyBits:0,
  globalPurity:1,negativity:Math.sqrt(Math.max(0,determinant)),correlationXX:xx,pure:true};
}

export function pureTwoSpinReference({theta=Math.PI/4,phi=Math.PI}={}){
 if(!finite(theta)||theta<0||theta>Math.PI/2||!finite(phi)||Math.abs(phi)>2*Math.PI)throw Error('Choose finite two-spin angles within the teaching range.');
 const c=theta===Math.PI/2?0:Math.cos(theta),s=theta===0?0:Math.sin(theta);
 const co=Math.abs(Math.cos(phi))<1e-15?0:Math.cos(phi),si=Math.abs(Math.sin(phi))<1e-15?0:Math.sin(phi);
 return coefficientStateReference([[z(),z(c)],[z(s*co,s*si),z()]]);
}

export function twoSpinStateReference(kind='singlet'){
 if(kind==='singlet')return pureTwoSpinReference();
 if(!['classical','mixed'].includes(kind))throw Error('Unknown two-spin teaching state.');
 const probabilities=kind==='classical'?[0,.5,.5,0]:[.25,.25,.25,.25];
 const rho=probabilities.map((p,i)=>probabilities.map((_,j)=>z(i===j?p:0)));
 return {rho,rhoA:partialTraceReference(rho,'A').matrix,rhoB:partialTraceReference(rho,'B').matrix,
  globalPurity:probabilities.reduce((s,p)=>s+p*p,0),globalEntropyBits:entropy(probabilities,2),
  entropyBits:1,entropyNats:Math.LN2,negativity:0,correlationXX:0,pure:false,
  C:null,schmidtProbabilities:null,singularValues:null};
}

export function tripletProjectionReference(){
 const a=1/Math.sqrt(2),W=[[z(1),z(),z(),z()],[z(),z(a),z(a),z()],[z(),z(),z(),z(1)]];
 const ux=[[z(),z(0,-1)],[z(0,-1),z()]],uz=[[z(0,-1),z()],[z(),z(0,1)]];
 const rx=mm(mm(W,kron(ux,ux)),adjoint(W)),rz=mm(mm(W,kron(uz,uz)),adjoint(W));
 const virtualXZ=mm(ux,uz),virtualZX=mm(uz,ux),physicalXZ=mm(rx,rz),physicalZX=mm(rz,rx);
 const singlet=[[z()],[z(a)],[z(-a)],[z()]],swap=[[z(1),z(),z(),z()],[z(),z(),z(1),z()],[z(),z(1),z(),z()],[z(),z(),z(),z(1)]];
 const projector=mm(adjoint(W),W),symmetric=identity(4).map((row,i)=>row.map((v,j)=>z((v[0]+swap[i][j][0])/2)));
 return {W,projector,ux,uz,rx,rz,virtualXZ,virtualZX,physicalXZ,physicalZX,
  virtualCommutator:mm(mm(mm(ux,uz),adjoint(ux)),adjoint(uz)),
  physicalCommutator:mm(mm(mm(rx,rz),adjoint(rx)),adjoint(rz)),
  checks:{physicalIdentity:residual(mm(W,adjoint(W)),identity(3)),symmetricProjector:residual(projector,symmetric),
   singletRejected:residual(mm(W,singlet),[[z()],[z()],[z()]]),virtualAnticommutation:residual(virtualXZ,scale(virtualZX,-1)),
   physicalCommutation:residual(physicalXZ,physicalZX),spinorSquare:residual(mm(ux,ux),scale(identity(2),-1)),
   integerSquare:residual(mm(rx,rx),identity(3))},
  periodicReferences:[{sites:3,cut:[1,2],probabilities:[1/3,1/3,1/3],rank:3,bondVirtualDimension:2},
   {sites:4,cut:[2,2],probabilities:[3/7,4/21,4/21,4/21],rank:4,bondVirtualDimension:2}]};
}

const fmt=x=>x===0?'0':Math.abs(x)<1e-6?x.toExponential(3):Number(x.toFixed(6)).toString();
const texNumber=x=>fmt(x).replace(/e([+-]?\d+)$/,(_m,p)=>'\\times10^{'+Number(p)+'}');
const complexTex=x=>x[1]===0?texNumber(x[0]):x[0]===0?texNumber(x[1])+'i':texNumber(x[0])+(x[1]<0?'-':'+')+texNumber(Math.abs(x[1]))+'i';
const formula=tex=>`<div class="qsb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>mathHTML(tex);
const matrixTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(complexTex).join('&')).join('\\\\')+'\\end{pmatrix}';
const table=(caption,headers,rows)=>`<div class="qsb-scroll" tabindex="0"><table><caption>${caption}</caption><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const names={'partial-trace':"Taking a partial trace: do equal local states imply equal global states?",'schmidt-pure':"From four amplitudes to Schmidt probabilities",'triplet-virtual':"From triplet projection to AKLT virtual spins"};
const stateNames={singlet:"Pure Bell singlet",classical:"Equal classical mixture of antiparallel spins",mixed:"Maximally mixed state I₄/4"};
const choices={
 'partial-trace':[['zero','0'],['half','1/2'],['one','1']],
 'partial-meaning':[['insufficient',"Local information is insufficient; the global state is also needed"],['always',"Local entropy of 1 bit always implies entanglement"],['never',"A local state I/2 always rules out entanglement"]],
 'schmidt-pure':[['squared',"Square of singular values of coefficient matrix"],['unsquared',"The singular values themselves"],['energy',"The energy eigenvalues of the Hamiltonian"]],
 'schmidt-unit':[['convert',"Divide by ln(2) to obtain bits; the quantum state is unchanged"],['equal',"Values in nats and bits are always numerically equal"],['state',"Changing the logarithm base changes the quantum state"]],
 'triplet-virtual':[['phase',"The matrices for the two orders differ by an overall minus sign"],['same',"The matrices for the two orders are equal"],['probability',"An overall minus sign must change single-state measurement probabilities"]],
 'triplet-finite':[['cut',"No; the cut, boundary conditions, and selected pure state must also be specified"],['two',"There must be exactly two probabilities"],['class',"Any short-chain spectrum directly determines a general SPT class"]]
};
const defaults=id=>id==='partial-trace'?{open:false,notesOpen:false,kind:'singlet',subsystem:'A',cell:'00',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false}:id==='schmidt-pure'?{open:false,notesOpen:false,theta:'45',phi:'180',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false}:{open:false,notesOpen:false,representation:'virtual',order:'xz',finite:'three',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false};
const enumValues={kind:['singlet','classical','mixed'],subsystem:['A','B'],cell:['00','01','10','11'],representation:['virtual','physical'],order:['xz','zx'],finite:['three','four']};
const secondKey=id=>id==='partial-trace'?'partial-meaning':id==='schmidt-pure'?'schmidt-unit':'triplet-finite';
function restored(id,saved){
 const s=defaults(id);if(!saved||typeof saved!=='object')return s;
 for(const key of Object.keys(s)){
  if(typeof s[key]==='boolean'&&typeof saved[key]==='boolean')s[key]=saved[key];
  else if(enumValues[key]?.includes(saved[key]))s[key]=saved[key];
 }
 for(const [key,list]of [['choice',choices[id]],['secondChoice',choices[secondKey(id)]]])if(list.some(([v])=>v===saved[key]))s[key]=saved[key];
 for(const [key,lo,hi]of [['theta',0,90],['phi',-180,180]])if(Object.hasOwn(s,key)&&typeof saved[key]==='string'&&saved[key].trim()!==''&&finite(Number(saved[key]))&&Number(saved[key])>=lo&&Number(saved[key])<=hi)s[key]=saved[key];
 if(!s.choice)s.observed=false;if(!s.observed){s.checked=false;s.secondChecked=false;}if(!s.secondChoice)s.secondChecked=false;
 return s;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
const answerSelect=(prefix,key,label,value)=>select(prefix+'-'+key,label,[['',"Choose a prediction first"],...choices[key==='choice'?prefix.includes('partial-trace')?'partial-trace':prefix.includes('schmidt-pure')?'schmidt-pure':'triplet-virtual':prefix.includes('partial-trace')?'partial-meaning':prefix.includes('schmidt-pure')?'schmidt-unit':'triplet-finite']],value).replace('</label>',`<span class="qsb-choice-reading" id="${prefix}-${key}-reading" aria-hidden="true"></span></label>`);
const range=(id,label,value,min,max,step)=>`<label for="${id}">${label}<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${id}-value"></output></label>`;
const button=(id,text)=>`<button type="button" id="${id}">${text}</button>`;
function panelHTML(id,s){
 const p='qsb-'+id;
 const common=`<div class="qsb-actions">${button(p+'-observe',"Show the calculation steps")}${button(p+'-check',"Check step 1")}${button(p+'-check-second',"Check step 2")}${button(p+'-reset',"Reset this experiment")}</div><p class="qsb-feedback" id="${p}-feedback" role="status" tabindex="-1"></p><p class="qsb-feedback" id="${p}-second-feedback" role="status" tabindex="-1"></p>`;
 if(id==='partial-trace')return `<p>The product basis is ordered ↑↑, ↑↓, ↓↑, ↓↓, with A as the first index. Select an entry of the reduced matrix and trace the two contributions that must be added in the global matrix.</p><div class="qsb-controls">${select(p+'-kind',"Choose the global state",Object.entries(stateNames),s.kind)}${select(p+'-subsystem',"Which spin is retained?",[['A',"Retain A and trace out B"],['B',"Retain B and trace out A"]],s.subsystem)}</div><fieldset class="qsb-cell-picker"><legend>Select a reduced-matrix entry by hand (row and column indices start at 0)</legend>${['00','01','10','11'].map(cell=>`<button type="button" id="${p}-cell-${cell}" data-qsb-cell="${cell}" aria-pressed="false">${cell[0]}, ${cell[1]}</button>`).join('')}</fieldset><div id="${p}-source"></div><div class="qsb-controls">${answerSelect(p,'choice',"Step 1: what is the value of the selected entry?",s.choice)}${answerSelect(p,'secondChoice',"Step 2: does knowing only the local state I/2 determine global entanglement?",s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>A partial trace does not select a measurement outcome</summary><p>A partial trace equates the row and column indices of the traced-out subsystem, then sums over every value of that index. It does not select a particular measurement outcome for B. In the singlet, conditioning on an ↑ outcome for B gives a ↓ state for A. Without selecting an outcome, the reduced state is still I/2.</p></details>`;
 if(id==='schmidt-pure')return `<p>For one normalized global pure state, arrange the amplitudes into a coefficient matrix C with A indexing rows and B indexing columns. First identify how probabilities are obtained, then inspect the matrices and entropy.</p>${formula(String.raw`|\psi\rangle=\cos\theta|\uparrow\downarrow\rangle+e^{i\phi}\sin\theta|\downarrow\uparrow\rangle`)}<div class="qsb-controls">${range(p+'-theta',"Angle θ / °",s.theta,0,90,5)}${range(p+'-phi',"Relative phase φ / °",s.phi,-180,180,15)}</div><div class="qsb-actions">${button(p+'-singlet',"singlet state")}${button(p+'-triplet',"Triplet T₀")}${button(p+'-product',"Product state")}</div><div class="qsb-controls">${answerSelect(p,'choice',"Step 1: where do Schmidt probabilities come from?",s.choice)}${answerSelect(p,'secondChoice',"Step 2: what happens when nats are converted to bits?",s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>Why can this C construction not be applied directly to a mixed state?</summary><p>C contains the amplitudes of a pure-state ket. A classical mixture or I₄/4 requires the global density matrix ρ; its singular values are not the Schmidt coefficients of a pure state. When two Schmidt probabilities are equal, the partner bases are not unique. Compare probabilities, density matrices, or subspaces instead.</p></details>`;
 return `<p>The symmetric triplet subspace of two virtual spin-1/2 degrees of freedom can represent one physical spin 1. Here CG projection, the order of π rotations, and finite-chain cuts are checked separately.</p><div class="qsb-controls">${select(p+'-representation',"Which space is compared?",[['virtual',"One virtual spin 1/2"],['physical',"The projected physical spin 1"]],s.representation)}${select(p+'-order',"Displayed product order (the right factor acts first)",[['xz','uₓu_z / RₓR_z'],['zx','u_zuₓ / R_zRₓ']],s.order)}${select(p+'-finite',"Reference cut for a periodic AKLT chain",[['three',"N=3, cut 1|2"],['four',"N=4, cut 2|2"]],s.finite)}</div><div class="qsb-controls">${answerSelect(p,'choice',"Step 1: how do the matrices change when the two π rotations exchange order?",s.choice)}${answerSelect(p,'secondChoice',"Step 2: does virtual dimension 2 on one bond require Schmidt rank 2?",s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>Inspect the triplet projection and phase convention</summary>${formula(String.raw`W=\begin{pmatrix}1&0&0&0\\0&1/\sqrt2&1/\sqrt2&0\\0&0&0&1\end{pmatrix}`)}${formula(String.raw`WW^\dagger=I_3,\quad W^\dagger W=P_{\rm sym},\quad W|S\rangle=0`)}<p>W is a 3×4 subspace map, not a unitary change of basis from four dimensions to three. Here uₓ=−iσₓ and u_z=−iσ_z. The main SPT experiment uses Uₓ=σₓ and U_z=σ_z, which differ by separate scalar phases; the projective commutator remains −I.</p><p>An overall minus sign alone does not change single-state measurement probabilities. This comparison concerns phases of representation matrices; it is not displayed as two different Bloch directions.</p></details>`;
}

function sourceMatrixHTML(r,trace){
 const highlighted=new Set(trace.terms.map(t=>t.row+'-'+t.column)),basis=['↑↑','↑↓','↓↑','↓↓'];
 return `<div class="qsb-scroll" tabindex="0"><table><caption>Global density matrix ρ: each contribution has matching traced-out row and column indices</caption><thead><tr><th scope="col">Row / column</th>${basis.map(b=>`<th scope="col">${b}</th>`).join('')}</tr></thead><tbody>${r.rho.map((row,i)=>`<tr><th scope="row">${basis[i]}</th>${row.map((x,j)=>`<td class="${highlighted.has(i+'-'+j)?'qsb-term':''}" data-qsb-source="${i}-${j}">${inline(complexTex(x))}${highlighted.has(i+'-'+j)?"<span class=\"qsb-mark\">Contribution to the sum</span>":''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function partialOutput(s){
 const r=twoSpinStateReference(s.kind),t=partialTraceReference(r.rho,s.subsystem,Number(s.cell[0]),Number(s.cell[1]));
 const sum=t.terms.map(x=>complexTex(x.value)).join('+');
 const indexed=t.terms.map(x=>'\\rho_{'+Math.floor(x.row/2)+(x.row%2)+','+Math.floor(x.column/2)+(x.column%2)+'}').join('+');
 return formula(`(\\rho_${s.subsystem})_{${s.cell[0]}${s.cell[1]}}=${indexed}`)+formula(`(\\rho_${s.subsystem})_{${s.cell[0]}${s.cell[1]}}=${sum}=${complexTex(t.sum)}`)+formula(`\\rho_${s.subsystem}=${matrixTex(t.matrix)}`)+table("Equal local states can have different global information",["Global state","overall purity","Global entropy / bit","Local entropy / bit","Negativity"],Object.entries(stateNames).map(([key,name])=>{const a=twoSpinStateReference(key);return [name,fmt(a.globalPurity),fmt(a.globalEntropyBits),fmt(a.entropyBits),fmt(a.negativity)];}))+`<p>All three global states have ρA=ρB=I/2 and local entropy 1 bit = ln(2) nat. Global purity and negativity distinguish these examples. Local entropy alone does not quantify the entanglement of a mixed state.</p>`;
}
function schmidtOutput(s){
 const r=pureTwoSpinReference({theta:Number(s.theta)*Math.PI/180,phi:Number(s.phi)*Math.PI/180});
 return formula(`C=${matrixTex(r.C)}`)+formula(`\\rho_A=CC^\\dagger=${matrixTex(r.rhoA)}`)+formula(`\\rho_B=C^T C^*=${matrixTex(r.rhoB)}`)+table("Distinguish singular values from probabilities",["component","Singular value","Schmidt probability"],r.schmidtProbabilities.map((p,i)=>[String(i+1),fmt(r.singularValues[i]),fmt(p)]))+table("Two entropy units for the same pure state",["overall purity","Local entropy / nat","Local entropy / bit","Negativity","Joint measurement ⟨σₓ⊗σₓ⟩"],[[fmt(r.globalPurity),fmt(r.entropyNats),fmt(r.entropyBits),fmt(r.negativity),fmt(r.correlationXX)]])+formula(String.raw`S_{\rm bit}=S_{\rm nat}/\ln2,\quad 0\ln0=0`)+`<p>When both components are nonzero, changing the relative phase φ generally changes the global state while preserving the reduced matrices and Schmidt probabilities of this family. A relative phase is not being treated as an overall phase: joint measurements distinguish the singlet from T₀.</p><p>Here ρB=CᵀC*. For general complex coefficients it must not be replaced by C†C. The dagger includes both transpose and complex conjugation.</p>`;
}
function tripletOutput(s){
 const r=tripletProjectionReference(),virtual=s.representation==='virtual',matrix=virtual?(s.order==='xz'?r.virtualXZ:r.virtualZX):(s.order==='xz'?r.physicalXZ:r.physicalZX);
 const ref=r.periodicReferences[s.finite==='three'?0:1],labels=ref.sites===3?['1/3','1/3','1/3']:['3/7','4/21','4/21','4/21'];
 return formula((virtual?(s.order==='xz'?'u_xu_z':'u_zu_x'):(s.order==='xz'?'R_xR_z':'R_zR_x'))+'='+matrixTex(matrix))+formula(String.raw`R_a=W(u_a\otimes u_a)W^\dagger`)+formula(virtual?String.raw`u_xu_z=-u_zu_x,\quad u_x^2=-I_2`:String.raw`R_xR_z=R_zR_x,\quad R_x^2=I_3`)+table("Finite-cut references at the periodic AKLT fixed point",["Number of sites","Cut","Nonzero Schmidt probabilities","Schmidt rank","Virtual dimension of one bond"],[[String(ref.sites),ref.cut.join('|'),labels.join(', '),String(ref.rank),'2']])+`<p>A periodic bipartition can cross more than one virtual bond, and the physical subsystem dimension also bounds the Schmidt rank. These are the listed fixed-point references; the main experiment has not been run again. A short-chain spectrum does not automatically classify a general SPT phase.</p>`;
}
const correct=id=>id==='partial-trace'?'half':id==='schmidt-pure'?'squared':'phase';
function answerFor(id,s){return id==='partial-trace'?(s.cell[0]===s.cell[1]?'half':'zero'):id==='triplet-virtual'?(s.representation==='virtual'?'phase':'same'):correct(id);}
function feedback(id,s,second=false){
 const value=second?s.secondChoice:s.choice,expected=second?(id==='partial-trace'?'insufficient':id==='schmidt-pure'?'convert':'cut'):answerFor(id,s),ok=value===expected;
 if(second){
  if(id==='partial-trace')return {ok,text:ok?"Correct: the same local state can arise from an entangled pure state or a separable mixed state.":"The global state is also needed: the three examples have equal local entropy but different negativities."};
  if(id==='schmidt-pure')return {ok,text:ok?"Correct: changing the base changes only the reported entropy value, with S_bit=S_nat/ln(2).":"The quantum state and probabilities are unchanged; 1 bit corresponds to ln(2) nat, so their numerical values are not always equal."};
  return {ok,text:ok?"Correct: the periodic references have rank 3 or 4, neither of which equals the single-bond virtual dimension 2.":"The virtual dimension of one bond cannot simply be identified with the Schmidt rank of every finite cut."};
 }
 if(id==='partial-trace')return {ok,text:ok?"Correct: match the traced-out row and column indices within each contribution, then add the contributions from their two possible values.":"Add the two highlighted entries rather than reading only one global-matrix entry."};
 if(id==='schmidt-pure')return {ok,text:ok?"Correct: the squared singular values are the probabilities, which also equal the eigenvalues of the reduced density matrix.":"Distinguish amplitudes, singular values, and probabilities; energy eigenvalues are not Schmidt probabilities."};
 return {ok,text:ok?(s.representation==='virtual'?"Correct: the two products for one virtual spin differ by a minus sign, which does not change single-state measurement probabilities.":"Correct: physical integer-spin π rotations commute in the triplet subspace."):"Compare the matrix relation in the selected space; the virtual spinor and physical triplet subspace obey different relations."};
}

export function quantumStateBridgeHTML(lessonId){
 const ids=Object.hasOwn(QUANTUM_STATE_BRIDGE_HOOKS,lessonId)?QUANTUM_STATE_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="qsb-prerequisites" aria-label="Optional prerequisite experiments on partial traces and quantum states"><p class="qsb-intro">To connect amplitudes, reduced states, and virtual spins, open one local experiment. If these operations are familiar, continue directly. This panel does not start Python or change classroom progress.</p>${ids.map(id=>`<details class="qsb-panel" data-qsb-panel="${id}"><summary>${names[id]}</summary><div class="qsb-body" data-qsb-body="${id}"></div></details>`).join('')}<p class="qsb-links"><a href="#compute/density-matrix-lab?preset=singlet">Open the existing singlet experiment</a> · <a href="#compute/lie/su2_coupling?preset=half-pair">Open the existing SU(2) coupling experiment</a> · <a href="#classroom/spin?module=spt&lesson=spt-schmidt&tab=learn">Return to the Schmidt and SPT classroom</a></p></section>`:'';
}

export function bindQuantumStateBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map()}){
 const ids=Object.hasOwn(QUANTUM_STATE_BRIDGE_HOOKS,lessonId)?QUANTUM_STATE_BRIDGE_HOOKS[lessonId]:[],store=stateStore instanceof Map?stateStore:new Map(),records=[];let alive=true;
 const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 for(const id of ids){
  const detail=root?.querySelector?.('[data-qsb-panel="'+id+'"]'),body=root?.querySelector?.('[data-qsb-body="'+id+'"]');if(!detail||!body)continue;
  const s=restored(id,store.get(lessonId+':'+id)),prefix='qsb-'+id,$=suffix=>body.querySelector('#'+prefix+'-'+suffix);
  const owns=()=>alive&&root?.isConnected!==false&&root.querySelector('[data-qsb-panel="'+id+'"]')===detail&&root.querySelector('[data-qsb-body="'+id+'"]')===body;
  const current=()=>owns()&&isCurrent(),save=()=>store.set(lessonId+':'+id,clone(s));
  if(s.open){detail.open=true;detail.setAttribute('open','');}
  body.innerHTML=panelHTML(id,s);const notes=body.querySelector('[data-qsb-notes="'+id+'"]');
  if(s.notesOpen){notes.open=true;notes.setAttribute('open','');}
  const capture=()=>{
   if(!owns())return;const before=clone(s);s.open=readOpen(detail);s.notesOpen=readOpen(notes);
   for(const key of Object.keys(enumValues)){const el=$(key);if(el&&enumValues[key].includes(el.value))s[key]=el.value;}
   for(const key of ['theta','phi','choice','secondChoice']){const el=$(key);if(el)s[key]=el.value;}
   Object.assign(s,restored(id,s));
   if([...Object.keys(enumValues),'theta','phi'].some(key=>Object.hasOwn(s,key)&&s[key]!==before[key])||s.choice!==before.choice){s.observed=false;s.checked=false;s.secondChecked=false;}
   if(s.secondChoice!==before.secondChoice)s.secondChecked=false;
   save();
  };
  const setFeedback=(suffix,checked,second=false)=>{
   const node=$(suffix);node.textContent='';node.setAttribute('class','qsb-feedback');
   if(checked){const f=feedback(id,s,second);node.textContent=f.text;node.setAttribute('class','qsb-feedback'+(f.ok?' qsb-correct':' qsb-retry'));}
  };
  const update=()=>{
   if(!current())return;
   if(id==='partial-trace'){
    const r=twoSpinStateReference(s.kind),t=partialTraceReference(r.rho,s.subsystem,Number(s.cell[0]),Number(s.cell[1]));$('source').innerHTML=sourceMatrixHTML(r,t);
    for(const b of body.querySelectorAll('[data-qsb-cell]'))b.setAttribute('aria-pressed',String(b.dataset.qsbCell===s.cell));
   }else if(id==='schmidt-pure'){$('theta-value').textContent=s.theta+'°';$('phi-value').textContent=s.phi+'°';}
   $('observe').disabled=!s.choice;$('check').disabled=!s.observed||!s.choice;$('check-second').disabled=!s.observed||!s.secondChoice;
   for(const key of ['choice','secondChoice']){$(key+'-reading').textContent=(key==='choice'?choices[id]:choices[secondKey(id)]).find(([v])=>v===s[key])?.[1]||'';}
   $('output').innerHTML=s.observed?(id==='partial-trace'?partialOutput(s):id==='schmidt-pure'?schmidtOutput(s):tripletOutput(s)):"<p class=\"qsb-await\">Choose a prediction before showing the calculation. Unsubmitted answers are retained as drafts.</p>";
   setFeedback('feedback',s.checked);setFeedback('second-feedback',s.secondChecked,true);save();
  };
  const invalidate=()=>{s.observed=false;s.checked=false;s.secondChecked=false;};
  const bind=(suffix,event,action)=>{
   const el=$(suffix);if(!el)return;
   el[event]=()=>{if(!current()||$(suffix)!==el||el.disabled)return;capture();const focus=action(el);update();if(typeof focus==='string')$(focus)?.focus?.({preventScroll:true});};
  };
  detail.ontoggle=()=>{if(current()){s.open=readOpen(detail);save();}};
  notes.ontoggle=()=>{if(current()){s.notesOpen=readOpen(notes);save();}};
  for(const key of Object.keys(enumValues))if($(key))bind(key,'onchange',el=>{if(enumValues[key].includes(el.value)){s[key]=el.value;invalidate();}});
  for(const key of ['theta','phi'])if($(key))bind(key,'oninput',el=>{const value=Number(el.value),hi=key==='theta'?90:180,lo=key==='theta'?0:-180;if(finite(value)&&value>=lo&&value<=hi){s[key]=el.value;invalidate();}});
  for(const key of ['choice','secondChoice'])bind(key,'onchange',el=>{const options=key==='choice'?choices[id]:choices[secondKey(id)];s[key]=options.some(([v])=>v===el.value)?el.value:'';if(key==='choice'){s.checked=false;s.observed=false;s.secondChecked=false;}else s.secondChecked=false;});
  bind('observe','onclick',()=>{s.observed=true;s.checked=false;s.secondChecked=false;return 'check';});
  bind('check','onclick',()=>{s.checked=true;return 'feedback';});
  bind('check-second','onclick',()=>{s.secondChecked=true;return 'second-feedback';});
  bind('reset','onclick',()=>{const open=readOpen(detail);Object.assign(s,defaults(id),{open});for(const key of Object.keys(s)){if($(key))$(key).value=String(s[key]);}notes.open=false;notes.removeAttribute?.('open');return 'choice';});
  for(const cell of ['00','01','10','11'])bind('cell-'+cell,'onclick',()=>{s.cell=cell;invalidate();});
  for(const [preset,theta,phi]of [['singlet','45','180'],['triplet','45','0'],['product','0','0']])bind(preset,'onclick',()=>{s.theta=theta;s.phi=phi;$('theta').value=theta;$('phi').value=phi;invalidate();});
  update();records.push({id,s,detail,body,capture});
 }
 const cleanup=()=>{if(!alive)return;for(const r of records)r.capture();alive=false;for(const {detail,body}of records){detail.ontoggle=null;for(const node of body.querySelectorAll('select'))node.onchange=null;for(const node of body.querySelectorAll('input')){node.oninput=null;node.onchange=null;}for(const node of body.querySelectorAll('button'))node.onclick=null;for(const node of body.querySelectorAll('details'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{if(alive)for(const r of records)r.capture();return Object.fromEntries(records.map(r=>[r.id,clone(r.s)]));};
 return cleanup;
}
