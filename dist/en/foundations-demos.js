import {mathHTML} from './math-display.js?v=20261113-prose2';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-9?'0':Number(x.toFixed(4)).toString();
const math=tex=>`<span class="sl-math" data-math-source="${esc(tex)}">${mathHTML(tex)}</span>`;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const mv=(a,v)=>a.map(r=>dot(r,v));
const matrix=a=>`<div class="fd-matrix" style="--fd-cols:${a[0].length}" aria-label="Representation matrix">${a.flatMap(r=>r.map(x=>`<span>${fmt(x)}</span>`)).join('')}</div>`;
const table=(headers,rows)=>`<div class="fd-scroll"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const svg=(title,body,view='0 0 640 340')=>`<svg viewBox="${view}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const line=(x,y,a,b,color='#455a70',width=2)=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${width}"/>`;
const text=(x,y,value,color='#17354c',size=18)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${value}</text>`;
const THEMES=[['water',"Water · infrared and Raman"],['characters',"Matrices, characters, and basis functions"],['projection',"D₃ triangle · projection operators"],['splitting',"SO(3) → O → D₄ energy levels"],['jt',"Jahn–Teller Effect"],['macro',"Macroscopic Crystal Symmetry"]];
const DEFAULTS={water:{mode:'symmetric',phase:30,amplitude:.2,channel:'ir-z',operation:'C2'},characters:{operation:'C4',basis:'xyz',basisAngle:0},projection:{operation:1,seedSite:0,irrep:'E',row:0},splitting:{delta:1,ds:.12,dt:.03,operation:'C4'},jt:{qtheta:.65,qepsilon:.25,g:1,k:1,occupancy:1},macro:{n:4,translation:.35}};
const charactersRoute='#classroom/foundations?module=demos&experiment=characters';
const waterMirrorCharacterRoute=charactersRoute+'&preset=water-mirror-xyz';
const characterPresets=new Map([
 ['quarter-turn-xy',{operation:'C4',basis:'xy'}],
 ['quarter-turn-xyz',{operation:'C4',basis:'xyz'}],
 ['water-mirror-xyz',{operation:'mirror',basis:'xyz'}]
]);
const waterRoute='#classroom/foundations?module=demos&experiment=water';
const waterSiteCount=3;
let latest=null;
const waterActionsStates=new Map();
const defaultWaterActionsLoader=()=>import('./water-actions-ui.js?v=20261116-water1');
let previousFoundationsCleanup=()=>{};
export const getFoundationsDemosResult=()=>latest;
export const foundationsDemoThemes=THEMES.map(([id,title])=>({id,title}));

const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
const mm=(a,b)=>a.map(r=>transpose(b).map(c=>dot(r,c)));
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)));
const trace=a=>a.reduce((sum,r,i)=>sum+r[i],0);
const normalize=v=>{const n=Math.hypot(...v);return n>1e-12?v.map(x=>x/n):v.map(()=>0);};
const vec=v=>`(${v.map(fmt).join(', ')})`;
const step=(n,title,body)=>`<section class="fd-step"><h4><span>${n}</span>${title}</h4>${body}</section>`;
const rotations={C4:[[0,-1,0],[1,0,0],[0,0,1]],C2:[[-1,0,0],[0,-1,0],[0,0,1]],C2x:[[1,0,0],[0,-1,0],[0,0,-1]],C3:[[0,0,1],[1,0,0],[0,1,0]],mirror:[[1,0,0],[0,-1,0],[0,0,1]],identity:identity(3)};
// Frobenius-orthonormal symmetric tensors encode the five real l=2 functions.
const dTensors=[[[ -1,0,0],[0,-1,0],[0,0,2]].map(r=>r.map(x=>x/Math.sqrt(6))),[[1,0,0],[0,-1,0],[0,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,1,0],[1,0,0],[0,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,0,1],[0,0,0],[1,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,0,0],[0,0,1],[0,1,0]].map(r=>r.map(x=>x/Math.sqrt(2)))];
const dNames=['(2z²−x²−y²)/√6','(x²−y²)/√2','√2xy','√2xz','√2yz'];
export function orbitalMatrix(operation='C4'){
 const R=rotations[operation]||rotations.C4,images=dTensors.map(Q=>mm(mm(R,Q),transpose(R)));
 return dTensors.map(Q=>images.map(image=>dot(Q.flat(),image.flat())));
}
export function charactersPreview(s){
 const full=rotations[s.operation]||rotations.C4,xy=full.slice(0,2).map(r=>r.slice(0,2));
 let original=s.basis==='xy'?xy:s.basis==='d5'?orbitalMatrix(s.operation):full;
 const n=original.length,angle=Number(s.basisAngle||0)*Math.PI/180,S=identity(n);
 S[0][0]=S[1][1]=Math.cos(angle);S[0][1]=-Math.sin(angle);S[1][0]=Math.sin(angle);
 const m=mm(mm(transpose(S),original),S),labels=s.basis==='d5'?dNames:s.basis==='xy'?['x','y']:['x','y','z'];
 return {matrix:m,originalMatrix:original,basisChange:S,trace:trace(m),fullTrace:trace(full),xyTrace:trace(xy),fullMatrix:full,xyMatrix:xy,labels,dimension:n};
}
export function characterComparisonPreview(basis){
 return ['C4','mirror'].map(operation=>{
  const first=charactersPreview({operation,basis});
  const squared=first.matrix.map(row=>row.map((_,column)=>row.reduce(
   (entry,value,index)=>entry+value*first.matrix[index][column],0
  )));
  const squaredTrace=squared.reduce((sum,row,index)=>sum+row[index],0);
  return {operation,matrix:first.matrix,trace:first.trace,squared,squaredTrace};
 });
}
const trianglePermutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]];
const triangleOperationNames=['E','C₃⁺','C₃⁻','C₂(1)','C₂(2)','C₂(3)'];
const triangleMatrices=trianglePermutations.map(perm=>perm.map((_,i)=>perm.map(destination=>Number(destination===i))));
const triangleCharacters={A1:[1,1,1,1,1,1],A2:[1,1,1,-1,-1,-1],E:[2,-1,-1,0,0,0]};
const triangleProjectors=Object.fromEntries(Object.entries(triangleCharacters).map(([irrep,characters])=>{
 const dimension=characters[0];
 const projector=triangleMatrices[0].map((row,i)=>row.map((_,j)=>
  dimension*triangleMatrices.reduce((total,matrix,g)=>total+characters[g]*matrix[i][j],0)/triangleMatrices.length
 ));
 return [irrep,projector];
}));

export function projectionPreview(s){
 const q=[2/Math.sqrt(6),-1/Math.sqrt(6),-1/Math.sqrt(6)],v=[0,1/Math.sqrt(2),-1/Math.sqrt(2)],a=[1,1,1].map(x=>x/Math.sqrt(3));
 const permutation=[...trianglePermutations[s.operation]],P=triangleMatrices[s.operation].map(row=>[...row]);
 const seed=[0,0,0];seed[s.seedSite]=1;
 const irrep=s.irrep==='A1'||s.irrep==='A2'?s.irrep:'E';
 const rowProjector=v.map(x=>q.map(y=>x*y));
 const projector=irrep==='E'&&Number(s.row)===1?rowProjector:triangleProjectors[irrep];
 const projected=mv(projector,seed);
 const norm=Math.hypot(...projected),normalized=norm>1e-9?projected.map(x=>x/norm):[0,0,0];
 const weightedImages=triangleMatrices.map((T,i)=>{const weight=irrep==='E'&&Number(s.row)===1?2*dot(v,mv(T,q))/6:triangleCharacters[irrep][0]*triangleCharacters[irrep][i]/6;return {name:triangleOperationNames[i],image:mv(T,seed),weight,weighted:mv(T,seed).map(x=>x*weight)};});
 return {matrix:P,eMatrix:[q,v].map(b=>[q,v].map(c=>dot(b,mv(P,c)))),character:P.reduce((a,r,i)=>a+r[i],0),permutation,name:triangleOperationNames[s.operation],seed,projector,characterProjector:triangleProjectors[irrep],weightedImages,projected,normalized,norm,basis:[a,q,v],transformed:mv(P,normalized)};
}
export function splittingPreview(s){
 const d=Number(s.delta),ds=Number(s.ds),dt=Number(s.dt);
 const levels=[{name:'d(z²)',irrep:'A₁',cubic:.6*d,energy:.6*d-2*ds-6*dt},{name:'d(x²−y²)',irrep:'B₁',cubic:.6*d,energy:.6*d+2*ds-dt},{name:'d(xy)',irrep:'B₂',cubic:-.4*d,energy:-.4*d+2*ds-dt},{name:'d(xz), d(yz)',irrep:'E',cubic:-.4*d,energy:-.4*d-ds+4*dt}];
 return {levels,barycenter:(levels[0].energy+levels[1].energy+levels[2].energy+2*levels[3].energy)/5};
}
export function jtPreview(s){
 const Q=Math.hypot(s.qtheta,s.qepsilon),elastic=.5*s.k*Q*Q,occupancy=({1:[1,0],2:[1,1],3:[2,1],4:[2,2]})[Number(s.occupancy)],imbalance=occupancy[0]-occupancy[1],minRadius=imbalance*s.g/s.k,extent=Math.max(2.1,minRadius+.4,Math.abs(s.qtheta)+.2,Math.abs(s.qepsilon)+.2);
 const values=(qt,qe)=>{const q=Math.hypot(qt,qe),e=.5*s.k*q*q;return {qtheta:qt,lower:e-s.g*q,upper:e+s.g*q,occupied:e-imbalance*s.g*q};};
 const slice=Array.from({length:151},(_,i)=>values(-extent+2*extent*i/150,s.qepsilon));
 const sliceMinimumTheta=Math.sqrt(Math.max(0,minRadius**2-s.qepsilon**2));
 return {Q,lower:elastic-s.g*Q,upper:elastic+s.g*Q,potential:elastic-imbalance*s.g*Q,minRadius,stabilization:imbalance*s.g*s.g/(2*s.k),linearActive:imbalance>0,occupancy,imbalance,extent,slice,slicePoint:values(s.qtheta,s.qepsilon),sliceMinima:sliceMinimumTheta>1e-10?[-sliceMinimumTheta,sliceMinimumTheta]:[0],electronicMatrix:[[s.g*s.qtheta,s.g*s.qepsilon],[s.g*s.qepsilon,-s.g*s.qtheta]]};
}
const range=(id,label,value,min,max,step)=>`<label><span>${label} <output data-output="${id}">${value}</output></span><input data-param="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,value,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${t}</option>`).join('')}</select></label>`;
const exercise=(question,steps)=>`<section class="fd-exercise"><h3>Predict first, then derive step by step</h3><p>${question}</p><details><summary>Show the worked answer</summary><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol></details></section>`;

function controls(theme,s){
 if(theme==='water')return select('mode',"Symmetry-adapted vibrational coordinates",s.mode,[['symmetric',"Symmetric-stretch type · A₁"],['bend',"Bending type · A₁"],['antisymmetric',"Antisymmetric-stretch type · B₁"]])+select('operation',"Operation acting on the nine displacements",s.operation,[['identity','E'],['C2','C₂(z)'],['mirror',"σ(xz) · molecular plane"],['mirror-yz','σ(yz)']])+range('phase',"Schematic vibration phase (°)",s.phase,0,360,1)+range('amplitude',"Schematic amplitude",s.amplitude,0,.5,.025)+select('channel',"Detection polarization",s.channel,[['ir-z',"Infrared · z"],['ir-x',"Infrared · x"],['ir-y',"Infrared · y"],['raman-xx',"Raman · xx"],['raman-xz',"Raman · xz"],['raman-yz',"Raman · yz"]])+`<button type="button" data-action="animate">Play / pause the vibration</button>`;
 if(theme==='characters')return select('operation',"Geometric operation",s.operation,[['C4',"C₄(z) · positive quarter-turn"],['C2',"C₂(z) · half-turn"],['mirror',"σ(xz) · mirror"],['identity',"E · identity"]])+select('basis',"Representation space",s.basis,[['xyz',"Full three-dimensional vector (x,y,z)"],['xy',"Two-dimensional subspace (x,y)"],['d5',"Five real d basis functions · l=2"]])+range('basisAngle',"Basis-change angle for the first two functions (°)",s.basisAngle||0,0,90,1);
 if(theme==='projection')return select('operation',"Operation to inspect",s.operation,[[0,'E'],[1,'C₃⁺'],[2,'C₃⁻'],[3,"C₂(1) · rotation about a vertex axis"],[4,"C₂(2) · rotation about a vertex axis"],[5,"C₂(3) · rotation about a vertex axis"]])+select('seedSite',"Projection seed",s.seedSite,[[0,'φ₁ = (1,0,0)'],[1,'φ₂ = (0,1,0)'],[2,'φ₃ = (0,0,1)']])+select('irrep',"Target irreducible representation",s.irrep,[['A1',"A₁ character projector"],['A2',"A₂ character projector"],['E',"E subspace / row projector"]])+select('row',"Partner in the E basis",s.row,[[0,"Project into the E subspace with Pᴱ"],[1,"Construct partner v from u using P₂₁"]]);
 if(theme==='splitting')return select('operation',"Inspect an operation in the five-dimensional basis",s.operation,[['C4',"C₄(z) · retained in D₄"],['C2x',"C₂(x) · retained in D₄"],['C3',"C₃(111) · present in O, absent from D₄"]])+range('delta',"Octahedral crystal field Δ (teaching units)",s.delta,0,2,.02)+range('ds',"Tetragonal parameter Dₛ",s.ds,-.35,.35,.01)+range('dt',"Tetragonal parameter Dₜ",s.dt,-.15,.15,.01);
 if(theme==='jt')return range('qtheta',"Distortion coordinate Qθ",s.qtheta,-2,2,.01)+range('qepsilon',"Distortion coordinate Qε",s.qepsilon,-2,2,.01)+range('g',"Linear coupling g",s.g,0,2,.05)+range('k',"Elastic constant k",s.k,.5,2,.05)+select('occupancy',"Simplified two-orbital electron filling",s.occupancy,[[1,"1 electron: lower branch occupied"],[2,"2 electrons: one in each orbital (Hund schematic)"],[3,"3 electrons: one hole"],[4,"4 electrons: filled shell"]]);
 return select('n',"Rotation order to test",s.n,[[1,"1-fold axis"],[2,"2-fold axis"],[3,"3-fold axis"],[4,"4-fold axis"],[5,"5-fold axis"],[6,"6-fold axis"]])+range('translation',"Translation (in lattice-length units)",s.translation,0,1,.05);
}

export function waterPreview(s){
 const theta=104.5*Math.PI/360,a=Math.sin(theta),b=Math.cos(theta),base=[[0,0],[a,b],[-a,b]],mass=[16,1,1],center=[0,b/9];
 const centered=base.map(p=>p.map((x,j)=>x-center[j])),inner=(u,v)=>u.reduce((sum,row,i)=>sum+mass[i]*dot(row,v[i]),0);
 const removeRigid=raw=>{const mean=[0,1].map(j=>raw.reduce((sum,u,i)=>sum+mass[i]*u[j],0)/18);let u=raw.map(p=>p.map((x,j)=>x-mean[j]));const inertia=centered.reduce((sum,r,i)=>sum+mass[i]*dot(r,r),0),ly=centered.reduce((sum,r,i)=>sum+mass[i]*(r[1]*u[i][0]-r[0]*u[i][1]),0),omega=ly/inertia;return u.map((v,i)=>[v[0]-omega*centered[i][1],v[1]+omega*centered[i][0]]);};
 const symmetric=removeRigid([[0,0],[a,b],[-a,b]]),rawBend=removeRigid([[0,0],[b,-a],[-b,-a]]),coefficient=inner(rawBend,symmetric)/inner(symmetric,symmetric),bend=rawBend.map((r,i)=>r.map((x,j)=>x-coefficient*symmetric[i][j])),antisymmetric=removeRigid([[0,0],[a,b],[a,-b]]);
 const patterns={symmetric,bend,antisymmetric},massNormalized=Object.fromEntries(Object.entries(patterns).map(([key,v])=>{const n=Math.sqrt(inner(v,v));return [key,v.map(r=>r.map(x=>x/n))];}));
 let u=patterns[s.mode]||symmetric;const norm=Math.max(...u.map(v=>Math.hypot(...v)));u=u.map(v=>v.map(x=>x/norm));
 const t=Math.sin(s.phase*Math.PI/180)*s.amplitude;return {positions:base.map((p,i)=>p.map((x,j)=>x+u[i][j]*t)),equilibrium:base,displacements:u,massNormalized};
}
function characterComparisonTable(label,headers,rows){
 return `<div class="fd-scroll" role="region" tabindex="0" aria-label="${esc(label)}">
  <table><caption class="sr-only">${esc(label)}</caption><thead><tr><th scope="col">Operation</th>${headers.map(header=>
   `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows.map(({operation,name,values})=>
   `<tr data-character-operation="${operation}"><th scope="row">${name}</th>${values.map(value=>
    `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function characterComparisonHTML(basis){
 const plane=basis==='xy';
 const rows=characterComparisonPreview(basis).map(row=>({
  ...row,name:math(row.operation==='C4'?'C_4(z)':'\\sigma(xz)'),
  spectrum:math((row.operation==='C4'?'+i,\\,-i':'+1,\\,-1')+(plane?'':',\\,+1'))
 }));
 const number=value=>String(value).replace('-','−');
 return `<section class="fd-exercise" aria-labelledby="fd-character-square-title">
  <h3 id="fd-character-square-title">The characters agree after one application. What happens after two?</h3>
  <p>Representation space for this comparison ${math(plane?'(x,y)':'(x,y,z)')}. Compare a positive quarter-turn about z with reflection in the xz plane.</p>
  ${characterComparisonTable("Matrices and characters after one application",[math('D(g)'),math('\\chi(g)')],rows.map(row=>
   ({...row,values:[matrix(row.matrix),number(row.trace)]})))}
  <div class="controls-row">
   <label for="fd-character-square-guess">Apply each operation twice in succession. Which has the larger character?</label>
   <select class="form-select" id="fd-character-square-guess" aria-describedby="fd-character-square-feedback">
    <option value="">Choose an answer</option><option value="equal">The two characters still agree</option>
    <option value="rotation">Fourfold rotation</option><option value="mirror">Mirror reflection</option>
   </select>
   <button id="fd-character-square-check" type="button" class="secondary" aria-controls="fd-character-square-result">Check the result of two applications</button>
  </div>
  <p id="fd-character-square-feedback" role="status"></p>
  <div id="fd-character-square-result" hidden>
   <ol>
    <li>First square each matrix. Two rotations reverse both x and y. Two reflections restore both coordinates.</li>
    <li>${plane?"In the plane, the squares are the negative identity and the identity, respectively.":"Both operations fix z, so each three-dimensional character is one larger than its planar counterpart."} Add the diagonal entries of the squared matrices.</li>
    <li>You can also start with eigenvalues. The quarter-turn has two planar eigenvalues over the complex numbers, ${math('\\pm i')}, and the planar eigenvalues of the reflection are  ${math('\\pm 1')}. Each pair cancels when summed for a single application. For two applications, square the eigenvalues before summing.</li>
   </ol>
   ${characterComparisonTable("Matrices and characters after two applications",
    [math('D(g)^2'),math('\\chi(g^2)'),"Eigenvalues of the original matrix"],
    rows.map(row=>({...row,values:[matrix(row.squared),number(row.squaredTrace),row.spectrum]})))}
  </div>
 </section>`;
}
function bindCharacterComparison(host,isCurrent){
 const guess=host.querySelector('#fd-character-square-guess');
 const feedback=host.querySelector('#fd-character-square-feedback');
 const result=host.querySelector('#fd-character-square-result');
 const here=()=>isCurrent()&&host.querySelector('#fd-character-square-guess')===guess;
 guess.onchange=()=>{
  if(!here())return;
  feedback.textContent='';
  result.hidden=true;
 };
 host.querySelector('#fd-character-square-check').onclick=()=>{
  if(!here())return;
  result.hidden=guess.value!=='mirror';
  if(!result.hidden)feedback.textContent="Correct. Applying the reflection twice leaves both planar directions unchanged.";
  else if(guess.value)feedback.textContent="Follow x and y through two applications. Then add the diagonal entries of the resulting matrix.";
  else feedback.textContent="Choose how the characters compare after two applications.";
 };
}
function characterWaterBridgeHTML(){
 const mirror=charactersPreview({operation:'mirror',basis:'xyz'});
 return `<details id="fd-character-water-bridge" class="fd-exercise">
  <summary>From one arrow to the nine displacements of water</summary>
  <p>Place water in the xz plane with its twofold axis along z. Apply the reflection  ${math('\\sigma(xz)')}  to all three atoms to study their displacement representation.</p>
  <p>The reflection leaves the oxygen and both hydrogen positions fixed. For each atom, it reverses the y displacement and keeps the x and z displacements unchanged.</p>
  ${matrix(mirror.matrix)}
  <p>The character for one three-dimensional polar vector is  ${math('+'+mirror.trace)}, the trace of the reflection matrix.</p>
  <div class="controls-row">
   <label for="fd-character-water-guess">What is the character for this reflection in the nine-dimensional displacement representation of the three atoms?</label>
   <select class="form-select" id="fd-character-water-guess" aria-describedby="fd-character-water-feedback">
    <option value="">Choose an answer</option><option value="1">+1</option><option value="3">+3</option><option value="9">+9</option>
   </select>
   <button id="fd-character-water-check" type="button" class="secondary" aria-controls="fd-character-water-result">Check the water displacement character</button>
  </div>
  <p id="fd-character-water-feedback" role="status"></p>
  <div id="fd-character-water-result" hidden>
   <p>Each of the three atoms has an identical displacement block with diagonal entries +1, −1, +1. Adding the three block traces gives +3.</p>
   <p>Expand the displacement workshop to see how all four operations transform the nine basis vectors.</p>
   <p><a href="${waterRoute}">Open the water demo and displacement workshop →</a></p>
  </div>
 </details>`;
}
function triangleProjectionBridgeHTML(){
 const vectorTeX=vector=>{
  const numerators=vector.map(value=>Math.round(3*value));
  return numerators.every(x=>x===0)?'\\mathbf{0}':String.raw`\tfrac13\left(${numerators.join(',')}\right)`;
 };
 const symbols={A1:'A_1',A2:'A_2',E:'E'};
 const rows=Object.entries(triangleProjectors).map(([irrep,projector])=>{
  const columns=projector.map((_,i)=>math(vectorTeX(projector.map(row=>row[i]))));
  const rank=Math.round(projector.reduce((sum,row,i)=>sum+row[i],0));
  return [math(symbols[irrep]),...columns,rank];
 });
 const symmetric=vectorTeX(mv(triangleProjectors.E,[1,1,1]));
 const firstVertex=vectorTeX(mv(triangleProjectors.E,[1,0,0]));
 return `<section class="fd-exercise" aria-labelledby="fd-triangle-projection-title">
  <h3 id="fd-triangle-projection-title">Check three projection columns after reduction</h3>
  <p>Keep the scalar basis on the three vertices. Start by applying ${math('P^{(A_2)}')} to the first vertex basis function, giving the zero vector.</p>
  <div class="controls-row">
   <label for="fd-triangle-projection-guess">Apply the same projector to vertices 2 and 3. What do you expect?</label>
   <select class="form-select" id="fd-triangle-projection-guess" aria-describedby="fd-triangle-projection-feedback">
    <option value="">Choose an answer</option>
    <option value="all-zero">Both other columns are zero</option>
    <option value="nonzero">At least one of the other columns is nonzero</option>
    <option value="one-enough">One column is enough to determine the rank</option>
   </select>
   <button id="fd-triangle-projection-check" type="button" class="secondary" aria-controls="fd-triangle-projection-result">Check all three vertices</button>
  </div>
  <p id="fd-triangle-projection-feedback" role="status"></p>
  <div id="fd-triangle-projection-result" hidden>
   <p>The images of the three basis vectors are the columns of the projector matrix. All three columns must vanish for the projector to vanish.</p>
   ${table(["Target representation",...['1','2','3'].map(i=>math('P\\phi_'+i)),"Projector rank"],rows)}
   <p>These projectors satisfy ${math('P^2=P')}, so rank equals trace. Compare the symmetric combination and a single vertex in the same model.</p>
   <p>${math('P^{(E)}(\\phi_1+\\phi_2+\\phi_3)='+symmetric)}，${math('P^{(E)}\\phi_1='+firstVertex)}。</p>
   <p>The derivation below shows the current projection matrix, all six weighted images, and their sum.</p>
  </div>
  <a href="#classroom/foundations?module=theorems&amp;experiment=reduction">Review the three-vertex character reduction →</a>
 </section>`;
}

function bindTriangleProjectionBridge(root,isCurrent){
 const guess=root.querySelector('#fd-triangle-projection-guess');
 if(!guess)return;
 const feedback=root.querySelector('#fd-triangle-projection-feedback');
 const result=root.querySelector('#fd-triangle-projection-result');
 const here=()=>isCurrent()&&root.querySelector('#fd-triangle-projection-guess')===guess;
 guess.onchange=()=>{if(here()){feedback.textContent='';result.hidden=true;}};
 root.querySelector('#fd-triangle-projection-check').onclick=()=>{
  if(!here())return;
  result.hidden=guess.value!=='all-zero';
  if(!result.hidden)feedback.textContent="Correct. The A₂ projector sends all three vertex vectors to zero, so its rank is zero.";
  else if(guess.value==='one-enough')feedback.textContent="One column gives the image of one basis vector. Check the other two columns.";
  else if(guess.value==='nonzero')feedback.textContent="Recall the A₂ multiplicity from the three-vertex reduction, then check the other two vertices.";
  else feedback.textContent="Predict the projection of the other two vertices first.";
 };
}

function bindCharacterWaterBridge(root,isCurrent){
 const guess=root.querySelector('#fd-character-water-guess');
 if(!guess)return;
 const feedback=root.querySelector('#fd-character-water-feedback'),result=root.querySelector('#fd-character-water-result');
 const here=()=>isCurrent()&&root.querySelector('#fd-character-water-guess')===guess;
 guess.onchange=()=>{if(here()){feedback.textContent='';result.hidden=true;}};
 root.querySelector('#fd-character-water-check').onclick=()=>{
  if(!here())return;
  const vectorTrace=charactersPreview({operation:'mirror',basis:'xyz'}).trace;
  result.hidden=guess.value!==String(waterSiteCount*vectorTrace);
  if(!result.hidden)feedback.textContent="Correct. The displacement block of each fixed atom contributes to the character.";
  else if(guess.value==='1')feedback.textContent="That is the contribution from one atom. How many atom positions does the reflection keep fixed?";
  else if(guess.value==='9')feedback.textContent="9 is the dimension of the displacement space. Check what the mirror does to the y component of each atom’s displacement.";
  else feedback.textContent="Choose a character for the nine-dimensional displacement representation.";
 };
}
export function waterRepresentation(operation='C2'){
 const ops={identity:{R:identity(3),p:[0,1,2],name:'E'},C2:{R:rotations.C2,p:[0,2,1],name:'C₂(z)'},mirror:{R:rotations.mirror,p:[0,1,2],name:'σ(xz)'},'mirror-yz':{R:[[-1,0,0],[0,1,0],[0,0,1]],p:[0,2,1],name:'σ(yz)'}};
 const {R,p,name}=ops[operation]||ops.C2,D=Array.from({length:9},()=>Array(9).fill(0));
 for(let atom=0;atom<3;atom++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)D[3*p[atom]+i][3*atom+j]=R[i][j];
 return {R,permutation:p,name,matrix:D,trace:trace(D),fixed:p.filter((x,i)=>x===i).length,labels:['Ox','Oy','Oz','H1x','H1y','H1z','H2x','H2y','H2z']};
}
function waterLesson(s){
 const w=waterPreview(s),rep=waterRepresentation(s.operation),irrep=s.mode==='antisymmetric'?'B₁':'A₁',allowed=s.mode==='antisymmetric'?['ir-x','raman-xz'].includes(s.channel):['ir-z','raman-xx'].includes(s.channel),xy=p=>[320+145*p[0],245-145*p[1]];
 let body=line(320,292,320,32,'#9cabb5')+line(105,245,550,245,'#9cabb5')+text(347,35,'z / C₂')+text(565,250,'x');
 for(let i=1;i<3;i++)body+=line(...xy(w.positions[0]),...xy(w.positions[i]),'#3f667e',7);
 w.positions.forEach((p,i)=>{const [x,y]=xy(p),u=w.displacements[i];body+=`<circle cx="${x}" cy="${y}" r="${i?22:28}" fill="${i?'#edf5f7':'#cce4ee'}" stroke="#375d72"/>`+text(x,y+6,i?'H'+i:'O')+line(x,y,x+u[0]*42,y-u[1]*42,'#b36231',3);});
 body+=text(320,322,"Orange arrows: displacements; molecular plane xz, y out of the screen",undefined,15);
 const rows=[['A₁',1,1,1,1,'z；xx, yy, zz'],['A₂',1,1,-1,-1,'Rz；xy'],['B₁',1,-1,1,-1,'x, Ry；xz'],['B₂',1,-1,-1,1,'y, Rx；yz']];
 return {plot:svg("Symmetry-adapted internal displacements of water and detection polarization",body),data:{...w,representation:rep,irrep,allowed},html:`<h3>Derive the three vibrational symmetries of water from matrices</h3><p class="fd-result">${irrep}  coordinate ×  ${esc(s.channel)}：<strong>${allowed?"Allowed by symmetry":"Forbidden by symmetry"}</strong>. Changing polarization changes detection conditions, not the molecular vibration representation.</p>
 ${step(1,"Declare the nine-dimensional space",`<p>One arrow in the previous unit had three components, x, y, z. Water has three atoms, so its displacement vector is <strong>(Ox, Oy, Oz, H1x, H1y, H1z, H2x, H2y, H2z)</strong>. O is at the origin and H1 is on the +x side; the C₂ axis is z and the molecule lies in xz.</p><p>For each displacement basis vector, first send its atom to p(i), then rotate or reflect its arrow using the same 3×3 polar-vector matrix. Column j records the image of basis vector j.</p>`)}
 ${step(2,`Current ${rep.name}: atom permutation × arrow matrix`,`<p>Atom mapping: O→O, H1→H${rep.permutation[1]}，H2→H${rep.permutation[2]}; number of fixed atoms:  ${rep.fixed} . Exchanged atoms move nonzero blocks off the diagonal and contribute no trace.</p><div class="fd-matrix-pair"><div><strong>Single-atom R, trace  ${trace(rep.R)}</strong>${matrix(rep.R)}</div><div><strong>Nine-dimensional D₃N, trace  ${rep.trace}</strong><div class="fd-scroll">${matrix(rep.matrix)}</div></div></div><p>${math('\\chi_{3N}(g)=N_{\\rm fixed}(g)\\,\\mathrm{tr}R(g)')}. For example, C₂ fixes only O. Its block diag(−1,−1,+1) has trace −1. Both H atoms are exchanged, but all nine displacement components are still transformed.</p>`)}
 ${step(3,"Take the trace for all four operations, then reduce",table(["Representation / operation",'E','C₂(z)','σ(xz)','σ(yz)'],[["Fixed atoms",3,1,3,1],["Polar-vector trace",3,-1,1,1],["Characters of Γ₃N",9,-1,3,1]])+table(["C₂ᵥ irreducible representation",'E','C₂','σ(xz)','σ(yz)',"Basis functions"],rows)+`<p>${math('n_\\alpha=\\tfrac14\\sum_g\\chi_\\alpha(g)^*\\chi_{3N}(g)')}. For example,  ${math('n_{A_1}=(9-1+3+1)/4=3')}; similarly, A₂:1, B₁:3, B₂:2, giving  ${math('\\Gamma_{3N}=3A_1+A_2+3B_1+2B_2')}, with dimension 3+1+3+2=9.</p>`)}
 ${step(4,"Remove rigid translations and rotations",`<p>Translations transform as the polar vector (x,y,z): ${math('\\Gamma_T=A_1+B_1+B_2')}. Rotations transform as an axial vector, with matrix det(R)R. Their trace under reflection therefore has the opposite sign to the polar-vector trace: ${math('\\Gamma_R=A_2+B_1+B_2')}。</p>`+table(["Subtract the characters",'E','C₂','σ(xz)','σ(yz)'],[['Γ₃N',9,-1,3,1],["Subtract ΓT",3,-1,1,1],["Subtract ΓR",3,-1,-1,-1],['Γvib',3,1,3,1]])+`<p class="fd-result">${math('\\Gamma_{\\rm vib}=\\Gamma_{3N}-\\Gamma_T-\\Gamma_R=2A_1+B_1')}. A nonlinear triatomic molecule has 3N−6=3 vibrational degrees of freedom. If water is instead placed in yz, exchanging x/y relabels the same antisymmetric stretch as B₂, giving 2A₁+B₂.</p>`)}
 ${step(5,"Connect mode symmetry to IR / Raman",`<p>Starting from the totally symmetric vibrational ground state, an IR transition requires a potentially nonzero dipole derivative with respect to the coordinate: A₁ matches z and B₁ matches x. Raman probes quadratic functions of the polarizability tensor: A₁ matches xx, yy, zz; B₁ matches xz. The selected channel tests whether that component is symmetry allowed.</p><p>Rigid translations and rotations have been removed from the three animated internal coordinates, which are mutually orthogonal under the mass metric. A real force-constant matrix can still mix the two A₁ coordinates. The stretch-type and bend-type motions are therefore symmetry-adapted illustrations. No water frequency, peak position, or intensity is computed here; an allowed peak need not be strong.</p>`)}
 `,exercise:exercise("Why need two A₁ coordinates not be exact normal modes?",["Symmetry prevents the A₁ subspace from mixing with other irreducible representations.","A₁ occurs twice in the vibration representation. Force constants may still have nonzero cross terms in this two-dimensional multiplicity space.","Masses and force constants are needed to diagonalize the dynamical matrix and determine the two exact normal modes and frequencies."])};
}
function charactersLesson(s){
 const r=charactersPreview(s),v=Array(r.dimension).fill(0);v[0]=1;const image=mv(r.matrix,v),p=mv(r.fullMatrix,[.7,.4,.6]);
 let body=line(85,245,295,245,'#aebdc7')+line(180,300,180,55,'#aebdc7')+line(180,245,285,185,'#257797',4)+line(180,245,180+p[0]*150,245-p[1]*150,'#ad5736',4)+text(285,169,'r','#257797')+text(180+p[0]*150,227-p[1]*150,'Rr','#ad5736')+text(465,108,`Current space:  ${r.dimension} dimension`)+text(465,165,`χ(g) = ${fmt(r.trace)}`)+text(465,225,"Columns = images of basis functions",undefined,17);
 const labels=r.labels.map((x,i)=>`${i+1}: ${x}`).join('；');
 return {plot:svg("Matrices and characters of one geometric operation in different representation spaces",body),data:r,html:`<h3>Fix the geometric operation, choose the space, then write the matrix</h3>
 ${step(1,"The declared basis determines the matrix space",`<p>Current basis order: <strong>${labels}</strong>. The vector space and d-orbital space have different dimensions. Their characters cannot be treated as results for the same representation.</p><p>Operations are active; matrix columns are the images of basis vectors. On functions we use  ${math('T(R)f(\\mathbf r)=f(R^{-1}\\mathbf r)')}, keeping function coefficients consistent with the active-rotation convention. For d functions, the common radial factor is omitted; five traceless quadratic functions span the full l=2 space.</p>`)}
 ${step(2,"Read the current operation column by column",`<div class="fd-matrix-pair"><div><strong>D(g) in the original basis</strong>${matrix(r.originalMatrix)}</div><div><strong>D′(g) after the basis change</strong>${matrix(r.matrix)}</div></div><p>The first column gives the image of the first vector e₁ in the new basis: ${vec(image)}. Multiplying the matrix by input coefficients gives the output coefficients. χ=0 means only that diagonal contributions cancel; it does not mean the arrow stays fixed.</p><p>For example, C₄ sends x→y, y→−x, z→z. In the d basis, the z²-type function stays fixed, x²−y² and xy change sign, and xz→yz, yz→−xz. The five-dimensional trace is therefore 1−1−1+0+0=−1.</p>`)}
 ${step(3,"Change the basis within one representation: entries change, trace does not",`<p>The basis-angle control orthogonally mixes the first two basis functions. The basis-change matrix S is:</p>${matrix(r.basisChange)}<p>${math("D'(g)=S^{-1}D(g)S")}; S is orthogonal, so S⁻¹=Sᵀ. The current trace  ${fmt(r.trace)}  equals the original trace  ${fmt(trace(r.originalMatrix))}. Set the basis angle to 31°: matrix entries become nonintegral, while the trace stays unchanged.</p>`)}
 ${step(4,"Changing the space and changing the basis are different calculations",`<p>The same C₄ operation has trace 0 in xy, 1 in xyz, and −1 in the five real d functions. For the first two spaces, xyz=xy⊕z and traces add. The d basis defines a different representation; no basis change within xyz can produce it.</p><p>In C₄ᵥ, the vector representation is E(x,y)⊕A₁(z). Characters describe the transformation of the whole representation. To identify its irreducible components, take traces for every conjugacy class and compute their inner products. One operation’s trace cannot determine the full representation.</p><p><a href="${waterRoute}">Next: place a single-atom 3×3 matrix into the 9×9 displacement representation of water →</a></p>`)}
 `,exercise:exercise("Can equal traces establish that two operations are identical?",["The xy matrix [[0,−1],[1,0]] for C₄ and the xy matrix diag(1,−1) for σ(xz) both have trace 0.","The first squares to −I, the second to I. Their single-step characters do not distinguish them.","Compare matrices or characters of other operations. The comparison below computes two consecutive applications."])};
}
function projectionLesson(s){
 const r=projectionPreview(s),pts=[[320,60],[130,230],[510,230]],irrep=s.irrep||'E',isRow=irrep==='E'&&Number(s.row)===1;
 let body=line(...pts[0],...pts[1])+line(...pts[1],...pts[2])+line(...pts[2],...pts[0]);
 pts.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="${24+Math.abs(r.normalized[i])*12}" fill="${r.normalized[i]<0?'#f4d6c8':'#cce4ee'}" stroke="#446b80"/>`+text(x,y+5,'φ'+(i+1))+text(x,y+48,fmt(r.normalized[i]),undefined,17);if(i===Number(s.seedSite))body+=`<circle cx="${x}" cy="${y}" r="45" fill="none" stroke="#b77722" stroke-dasharray="6 4"/>`;});body+=text(320,325,"Dashed circle: seed; numbers / colors: normalized projected coefficients",undefined,15);
 return {plot:svg("Three D3 vertex seeds and their projected coefficients",body),data:r,html:`<h3>Build basis functions by summing six transformed seeds</h3>
 ${step(1,"Specify the three-dimensional scalar model",`<p>Place one s-like scalar φ₁, φ₂, φ₃ at each vertex. The seed is  ${vec(r.seed)}. This is the proper-rotation group D₃. Each in-plane C₂ axis passes through a vertex and the opposite edge midpoint; these operations turn the three-dimensional triangle over, but are not mirror reflections. One scalar per site gives three dimensions, not six planar displacement components.</p>`+table(["Conjugacy class",'E','2C₃','3C₂'],[["Vertex representation",3,0,1],['A₁',1,1,1],['A₂',1,1,-1],['E',2,-1,0]])+`<p>Reduction inner products give  ${math('n_{A_1}=(3+3)/6=1')}、${math('n_{A_2}=(3-3)/6=0')}、${math('n_E=(2\\cdot3)/6=1')}, hence Γsites=A₁⊕E.</p>`)}
 ${step(2,"Transform the seed under each operation, then apply its weight",`<p>${isRow?math('P^E_{21}=\\tfrac26\\sum_g D^E_{21}(g)^*T(g)'):math('P^{(\\alpha)}=\\tfrac{d_\\alpha}{6}\\sum_g\\chi_\\alpha(g)^*T(g)')}. The table weights already include dα/6. The selected  ${r.name}  row is bold. Changing the observed operation also changes the representation matrices below.</p>`+table(["Operation g",'T(g) seed',"Weight","Weighted image"],r.weightedImages.map((term,i)=>[Number(s.operation)===i?`<strong>${term.name} ← selected</strong>`:term.name,vec(term.image),fmt(term.weight),vec(term.weighted)])))}
 ${step(3,"Sum the six weighted images: the operator matrix times the seed",`<div class="fd-matrix-pair"><div><strong>${isRow?"Row operator P₂₁ = v uᵀ":"Character projector P"+irrep}</strong>${matrix(r.projector)}</div><div><strong>Operator output</strong><p>${vec(r.projected)}</p><p>Norm  ${fmt(r.norm)}</p><p>Normalized: ${vec(r.normalized)}</p></div></div><p>${r.norm<1e-10?"The result is zero and cannot be normalized. A₂ is absent from this three-vertex representation; every other seed also gives zero.":"Each matrix column is the projection of a vertex basis vector. Changing the seed selects a different column and changes the numerical result."} ${isRow?"P₂₁ constructs a partner function; it is not an idempotent subspace projector. It sends u to v and v to 0.":"Character projectors satisfy P²=P; PA₁ has rank 1 and PE has rank 2."}</p>`)}
 ${step(4,"Complete the basis starting from one nonzero vector",`<p>The normalized A₁ basis is a=(1,1,1)/√3. Projecting φ₁ onto E gives (2,−1,−1)/3, which normalizes to u=(2,−1,−1)/√6. Project φ₂, remove its component along u, and normalize to obtain v=(0,1,−1)/√2. The vectors a,u,v are mutually orthogonal.</p><p>Together these form a complete three-dimensional A₁⊕E basis. A single projection of φ₁ gives only one direction in the E plane. The row-operator option shows how P₂₁ constructs v from the u component; its action differs from PE, which projects onto the entire E plane.</p><div class="fd-matrix-pair"><div><strong>T(${r.name}): vertex basis</strong>${matrix(r.matrix)}</div><div><strong>Dᴱ(${r.name}): u,v basis</strong>${matrix(r.eMatrix)}</div></div><p>In the u,v basis, the matrix elements are  ${math('D^E_{ij}(g)=\\langle e_i,T(g)e_j\\rangle')}, with current trace  ${fmt(trace(r.eMatrix))}; the projected vector after the selected operation is  ${vec(r.transformed)}。</p>`)}
 `,exercise:exercise("If A₂ gives zero, has the program failed to calculate it?",["First reduce the characters of Γsites to obtain nA₂=0.","All three columns of PA₂ vanish. There is no A₂ component anywhere in this three-dimensional scalar space.","A different representation space, such as planar vector displacements, can have a different decomposition. The zero result depends on the declared space."])};
}
function splittingLesson(s){
 const r=splittingPreview(s),energies=[0,.6*s.delta,-.4*s.delta,...r.levels.map(x=>x.energy)],lo=Math.min(...energies)-.25,hi=Math.max(...energies)+.25,Y=e=>278-(e-lo)*190/(hi-lo),xs=[85,300,535];
 let body=text(xs[0],28,'SO(3)')+text(xs[0],54,"l=2: 5 dimensions")+text(xs[1],28,'O')+text(xs[1],54,'E ⊕ T₂')+text(xs[2],28,'D₄')+text(xs[2],54,'1+1+1+2');
 body+=line(42,Y(0),128,Y(0),'#4b6d83',4);for(const a of [{e:.6*s.delta,label:'E (2)'},{e:-.4*s.delta,label:'T₂ (3)'}])body+=line(255,Y(a.e),345,Y(a.e),'#277b9d',4)+text(300,Y(a.e)-12,a.label,undefined,15)+line(130,Y(0),252,Y(a.e),'#b9c8d0',1);
 // Labels use separate rows and leader lines; accidental crossings never hide a label.
 r.levels.forEach((a,i)=>{const y=Y(a.energy),labelY=105+i*58;body+=line(492,y,548,y,'#257b6e',4)+line(348,Y(a.cubic),490,y,'#bdcbd3',1)+line(549,y,565,labelY,'#88a6b5',1)+text(600,labelY+5,a.irrep,undefined,16);});
 body+=text(320,326,"Energy in teaching units; connectors track the same orbital subspace",undefined,15);
 const D=orbitalMatrix(s.operation),sizes=[1,2,1,2,2],d4Rows={A1:[1,1,1,1,1],A2:[1,1,1,-1,-1],B1:[1,-1,1,1,-1],B2:[1,-1,1,-1,1],E:[2,0,-2,0,0]},restrictionE=[2,0,2,2,0],restrictionT=[3,-1,-1,-1,1],inner=(a,b)=>a.reduce((sum,x,i)=>sum+sizes[i]*x*b[i],0)/8;
 return {plot:svg("Splitting of five d orbitals from continuous rotations to octahedral and tetragonal rotation groups",body),data:{...r,matrix:D,restrictionE,restrictionT},html:`<h3>Lower symmetry regroups five states; energies require an additional model</h3>
 ${step(1,"The free-ion l=2 representation is five dimensional and irreducible",`<p>Omit the common radial function and choose these five real basis functions in order:</p><p class="fd-basis">${dNames.join('，')}</p><p>They are real combinations of  ${math('Y_{2m},\\ m=-2,-1,0,1,2')} . With full SO(3) rotation symmetry and no spin, a rotation-invariant Hamiltonian is constant on this irreducible space, giving fivefold degeneracy. Merely counting five d orbitals does not specify crystal-field energies.</p>`)}
 ${step(2,"Restrict to O and use characters to derive 2+3",`<p>The rotation character of an angular-momentum representation is  ${math('\\chi_l(\\theta)=1+2\\sum_{m=1}^{l}\\cos(m\\theta)')}. Substitute l=2 and evaluate on the classes of O:</p>`+table(["Classes of O",'E','8C₃(111)','3C₂(x,y,z)','6C₄',"6C₂(edge axes)"],[['χl=2',5,-1,1,-1,1],['E',2,-1,2,0,0],['T₂',3,0,-1,-1,1]])+`<p>${math('n_E=[5\\cdot2+8(-1)(-1)+3(1)(2)]/24=1')}；${math('n_{T_2}=[5\\cdot3+3(1)(-1)+6(-1)(-1)+6(1)(1)]/24=1')}. Therefore  ${math('D^{(2)}\\downarrow O=E\\oplus T_2')}. The first two quadratic functions span E; xy,xz,yz span T₂.</p>`)}
 ${step(3,"Retain only D₄ operations, then reduce each parent space",table(["Classes of D₄",'E','2C₄(z)','C₂(z)','2C₂(x,y)',"2C₂(diagonal axes)"],[['E of O ↓',...restrictionE],['T₂ of O ↓',...restrictionT],...Object.entries(d4Rows).map(([name,row])=>[name,...row])])+`<p>Use the same class-size-weighted inner product, now dividing by |D₄|=8. For the parent E, (nA₁,nA₂,nB₁,nB₂,nE)=(${Object.values(d4Rows).map(row=>inner(restrictionE,row)).join(', ')}); for parent T₂, the result is (${Object.values(d4Rows).map(row=>inner(restrictionT,row)).join(', ')})。</p><p class="fd-result">E↓D₄=A₁⊕B₁; T₂↓D₄=B₂⊕E. The assignments are z² type→A₁, x²−y²→B₁, xy→B₂, (xz,yz)→E.</p><p>Current operation ${esc(s.operation)}  in the five-dimensional basis above:</p>${matrix(D)}<p>${s.operation==='C3'?"C₃(111) mixes the two cubic E functions, and is absent from tetragonal D₄. Once this constraint is removed, the two states may acquire different energies.":"D₄ still contains operations connecting xz and yz, so the remaining E doublet cannot be split arbitrarily."}</p>`)}
 ${step(4,"Add crystal-field parameters and check energies and their center",table(["Orbital","D₄ label","Energy expression","Current energy"],r.levels.map((a,i)=>[a.name,a.irrep,['3Δ/5−2Dₛ−6Dₜ','3Δ/5+2Dₛ−Dₜ','−2Δ/5+2Dₛ−Dₜ','−2Δ/5−Dₛ+4Dₜ'][i],fmt(a.energy)]))+`<p>Set Δ=10Dq; in the octahedral field, E is above T₂ by Δ. A tetragonal perturbation still leaves 1+1+1+2=5 states. The weighted energy sum is  ${math('E_{A_1}+E_{B_1}+E_{B_2}+2E_E=0')}, and the current energy center is  ${fmt(r.barycenter)}. Zero denotes the five-state average, not an absolute binding energy.</p><p>The sliders tune a single-electron parameter model. Group theory specifies allowed blocks and protected degeneracies. Accidental equal energies of different irreducible representations can generally be separated by parameter changes; the two states within one E remain degenerate while D₄ is preserved.</p>`)}
 ${step(5,"Distinguish O from Oₕ and D₄ from D₄ₕ in representation labels",`<p>Both stages in the figure are proper-rotation groups O and D₄, so labels have no g/u suffix. If inversion is also preserved, use Oₕ→D₄ₕ. The d orbitals have even parity, and the same branches become E<sub>g</sub>→A<sub>1g</sub>+B<sub>1g</sub>、T<sub>2g</sub>→B<sub>2g</sub>+E<sub>g</sub>. Inversion itself does not add another degeneracy to these five even-parity states.</p>`)}
 `,exercise:exercise("If Δ=Dₛ=Dₜ=0 and all five states coincide, does that prove SO(3) symmetry?",["Equal energies describe a spectrum. Parameter tuning can also create accidental coincidences at lower symmetry.","SO(3) symmetry requires the Hamiltonian to commute with every continuous rotation.","Conversely, an l=2 irreducible space with full SO(3) symmetry must have five equal energies."])};
}
function jtLesson(s){
 const r=jtPreview(s),extent=r.extent,qp=(x,y)=>[165+105*x/extent,170-105*y/extent],slice=r.slice,es=slice.flatMap(p=>[p.lower,p.upper,p.occupied]),lo=Math.min(...es,-r.stabilization)-.2,hi=Math.max(...es)+.2,X=q=>360+(q+extent)*250/(2*extent),Y=e=>278-(e-lo)*225/(hi-lo);
 let body=line(40,170,287,170,'#9db0bc')+line(165,290,165,44,'#9db0bc')+text(280,195,'Qθ',undefined,14)+text(189,45,'Qε',undefined,14)+text(165,24,"Two-dimensional distortion plane",undefined,17);
 for(const radius of [extent/3,extent*2/3,extent])body+=`<circle cx="165" cy="170" r="${105*radius/extent}" fill="none" stroke="#d4e0e7"/>`;
 if(r.minRadius>0)body+=`<circle cx="165" cy="170" r="${105*r.minRadius/extent}" fill="none" stroke="#7755a2" stroke-width="3"/>`;
 const [mx,my]=qp(s.qtheta,s.qepsilon);body+=line(45,my,285,my,'#c27931',2)+`<circle cx="${mx}" cy="${my}" r="6" fill="#c27931"/>`+text(165,320,r.minRadius>0?"Purple circle: minima of the occupied-state total potential":"Minimum: origin",undefined,14);
 const curve=(key,color,w)=>`<path d="${slice.map((p,i)=>`${i?'L':'M'}${X(p.qtheta)},${Y(p[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
 body+=line(355,Y(0),615,Y(0),'#b5c3cd')+line(X(0),285,X(0),45,'#b5c3cd')+curve('lower','#277b9d',2)+curve('upper','#b56543',2)+curve('occupied','#7755a2',4);
 for(const [key,color] of [['lower','#277b9d'],['upper','#b56543'],['occupied','#7755a2']])body+=`<circle data-jt-point="${key}" cx="${X(s.qtheta)}" cy="${Y(r.slicePoint[key])}" r="5" fill="${color}"/>`;
 body+=text(488,24,`Actual slice Qε=${fmt(s.qepsilon)}`,undefined,17)+text(486,317,"Blue V−; orange V+; purple occupied total",undefined,13)+text(610,300,'Qθ',undefined,13);
 return {plot:svg("Two-dimensional minimum trough and current fixed-Qepsilon slice of the E⊗e model",body),data:r,html:`<h3>Find the electronic splitting, then use the actual filling to obtain the total potential energy</h3><p class="fd-result">Current (${fmt(s.qtheta)}, ${fmt(s.qepsilon)})，Q=${fmt(r.Q)}. The right plot fixes the current Qε, and every dot lies on this actual cross-section. The orange line on the left marks its position.</p>
 ${step(1,"Two electronic orbitals and two distortion coordinates",`<p>Within an orbital E doublet, τz and τx denote two real matrices. Spin, nuclear kinetic energy, and higher-order coupling are omitted:</p><p>${math('H_{\\rm el}=g(Q_\\theta\\tau_z+Q_\\epsilon\\tau_x)')}。</p>${matrix(r.electronicMatrix)}<p>The trace is 0 and the determinant is −g²(Qθ²+Qε²), giving electronic energies ε±=±gQ. Adding the lattice elastic energy kQ²/2 once gives the single-electron adiabatic surfaces V±=kQ²/2±gQ. The blue and orange curves are their slices at the current Qε.</p>`)}
 ${step(2,"Fill both electronic branches; count the elastic energy once",table(["Selected electron count","Lower-branch n−","Upper-branch n+","Linear term","Model assumption"],[[1,1,0,'−gQ',"One electron in an orbital doublet"],[2,1,1,'0',"Assume one electron in each orbital; competition with Hund coupling is not solved"],[3,2,1,'−gQ',"One hole; for example, e_g³ in octahedral d⁹"],[4,2,2,'0',"Both orbitals fully occupied"]])+`<p>Current filling (n−,n+)=(${r.occupancy.join(', ')}), total potential energy for this occupation ${math('V_{\\rm occ}=\\tfrac12kQ^2+(n_+-n_-)gQ')} = ${fmt(r.potential)}. The purple curve is the total potential energy for the current filling.<strong>Adding several V−/V+ surfaces would count the elastic energy more than once.</strong></p>`)}
 ${step(3,"Find the minimum and distinguish the full surface from a cross-section",`<p>Let b=n−−n+=${r.imbalance}. The radial condition kQ−bg=0 gives Q₀=bg/k=${fmt(r.minRadius)}, with an energy lowering EJT=b²g²/(2k)=${fmt(r.stabilization)}。${r.linearActive?"The purely linear model has a continuous ring of equal-energy minima in two dimensions; no direction has been selected.":"The linear terms of the two branches cancel for this filling, leaving the minimum at the origin. The lower one-electron branch alone cannot determine it."}</p><p>For the current fixed-Qε cross-section, the minimum occurs at Qθ=${r.sliceMinima.map(fmt).join(" or ")}; if |Qε|&gt;Q₀, this cross-section does not reach the ring of minima, and its minimum moves to Qθ=0. This is consistent with the two-dimensional trough.</p>`)}
 ${step(4,"When can this model explain a Jahn–Teller distortion?",`<p>This example shows linear coupling between an orbitally degenerate electronic state and symmetry-allowed vibrations. The electronic occupation must yield an energy lowering that does not cancel. A Kramers spin doublet, a vibrational degeneracy or a diagram of degenerate levels alone does not establish this orbital mechanism.</p><p>A single e_g hole in d⁹ can correspond to b=1. High-spin d⁵ in a conventional octahedral field has an orbital-singlet ground state; having five d orbitals does not justify applying this two-orbital model. The option with one electron in each orbital assumes that filling without comparing pairing energy, Hund exchange or SOC. Higher-order coupling can warp the circular trough into discrete minima, while quantum nuclear motion can produce dynamic effects.</p><p>All coordinates and energies use teaching units; this is not a measured potential-energy surface for a specific material.</p>`)}
 `,exercise:exercise("Set Qε=0, then change it to 0.6. Why must the plotted curves change too?",["V± depends on the radius √(Qθ²+Qε²), so changing the fixed Qε selects a different cross-section of the two-dimensional energy surface.","The dots and curves use the same fixed Qε and the same horizontal coordinate Qθ, so they always agree.","At g=0, both the electronic splitting and the finite-radius trough disappear. The two one-electron potential surfaces become two-dimensional harmonic paraboloids."])};
}
function macroLesson(s){
 const n=Number(s.n),allowed=[1,2,3,4,6].includes(n),angle=2*Math.PI/n,c=Math.cos(angle),si=Math.sin(angle),t=Number(s.translation),rot=[[c,-si,0],[si,c,0],[0,0,1]],point=[.6,.3,0],rp=mv(rot,point),seitz=[rp[0]+t,rp[1],0],P=v=>[165+80*v[0],175-80*v[1]];
 let body='';for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)body+=`<circle cx="${165+i*45}" cy="${175-j*45}" r="3" fill="#c2d0d9"/>`;
 body+=line(165,175,...P(point),'#277b9d',3)+line(165,175,...P(rp),'#2d8a6c',3)+line(...P(rp),...P(seitz),'#c17a2c',4);
 for(const [p,color] of [[point,'#277b9d'],[rp,'#2d8a6c'],[seitz,'#c17a2c']])body+=`<circle cx="${P(p)[0]}" cy="${P(p)[1]}" r="6" fill="${color}"/>`;
 body+=text(165,30,"Blue r → green Rr → orange Rr+t",undefined,15)+text(465,90,'π({R | t}) = R')+text(465,150,'ker π = T')+text(465,215,'G/T ≅ P')+text(320,320,"Coordinate transformation; the square grid is only a reference, and not every Cₙ preserves it",undefined,13);
 return {plot:svg("Seitz coordinate transformations and the linear part after removing translations",body),data:{n,allowed,planeTrace:2*c,translation:t,rotation:rot,point,rotated:rp,seitz},html:`<h3>The macroscopic point group retains every linear part; inversion is not added automatically</h3>
 ${step(1,"Space-group operations act on both directions and positions",`<p>An operation ${math('\\{R|\\mathbf t\\}')} maps r to Rr+t. Here R is a  ${n} fold rotation, t=(${fmt(t)},0,0)，Rr=${vec(rp)}，Rr+t=${vec(seitz)}. Moving the translation sliders shifts the orange point while the green rotated image stays fixed.</p><p>The sliders illustrate the two algebraic parts of a Seitz map. They do not imply that every continuous t belongs to one particular space group. The lattice, basis and closure conditions restrict the fractional translations that are actually allowed.</p>`)}
 ${step(2,"Remove translations through a homomorphism to obtain the quotient group",`<p>${math('\\{R_2|t_2\\}\\{R_1|t_1\\}=\\{R_2R_1|R_2t_1+t_2\\}')}. The map π:{R|t}→R preserves multiplication. Its kernel consists exactly of all pure lattice translations T, so  ${math('P\\simeq G/T')}. Removing the translation from a screw operation leaves a rotation; removing it from a glide operation leaves a reflection.</p><p>A homogeneous macroscopic property tensor is unchanged by a lattice translation and is therefore constrained by this point group. A site-symmetry group instead consists of operations fixing a chosen position and generally contains a different set of operations. The shape of a finite sample may further reduce its symmetry.</p>`)}
 ${step(3,"The point group, Laue group and presence of inversion are distinct conclusions",table(["Object","Example","Must inversion be present?"],[["Point group of space group P4₁",'4（C₄）',"No"],["Corresponding Laue group",'4/m（C₄ₕ）',"Yes"],["Point group of a centrosymmetric crystal","For example, m−3m (Oₕ)","Yes"]])+`<p>When Friedel’s law applies and anomalous scattering is negligible, diffraction intensities at reflections h and −h are equal, giving Laue symmetry that includes inversion. This constrains the diffraction information; it does not prove that the actual crystal has inversion symmetry. The crystal’s macroscopic point group follows directly from G/T and cannot be replaced by the Laue group.</p>`)}
 ${step(4,"Use integer matrices to check the crystallographic restriction",`<p>In a primitive basis of a three-dimensional translation lattice, a proper rotation preserving the lattice is represented by an integer matrix and thus has an integer trace. Its eigenvalues are 1,e±iθ, so  ${math('\\mathrm{tr}R=1+2\\cos(2\\pi/n)')}. Removing the axial contribution of 1 gives 2cos(2π/n)=${fmt(2*c)}。</p><p class="fd-result">${n} -fold rotation${allowed?"Satisfies this necessary condition: an order possible in a three-dimensional periodic lattice":"Fails the integer-trace condition: cannot be a rotational symmetry of a three-dimensional periodic lattice"}. The allowed orders are 1, 2, 3, 4 and 6. An allowed order still requires checking that the particular lattice is preserved.</p><p>Molecules, isolated regular polyhedra and quasicrystals obey different periodicity conditions; this restriction does not rule out their fivefold symmetry. Fractional translations in the full space group still affect systematic absences and Bloch phases.</p>`)}
 `,exercise:exercise("Can 4/m Laue symmetry in a diffraction pattern alone establish inversion symmetry in the crystal?",["Under Friedel’s law, point group 4, which lacks inversion, and point group 4/m, which includes it, can belong to the same Laue class.","Distinguishing them requires evidence from anomalous scattering, structure or other physical properties.","The macroscopic point group is the group formed by the linear parts of the space-group operations. Removing translations does not add −I."])};
}
function scene(theme,s){return ({water:waterLesson,characters:charactersLesson,projection:projectionLesson,splitting:splittingLesson,jt:jtLesson,macro:macroLesson})[theme](s);}
export function foundationsDemoScene(theme,params={}){return scene(theme,{...DEFAULTS[theme],...params});}

export async function renderFoundationsDemosView({container,selection={},run,cancelRun,download=()=>{},onNavigate=()=>{},loadWaterActions=defaultWaterActionsLoader}){
 previousFoundationsCleanup();
 let theme=THEMES.some(([id])=>id===selection.experiment)?selection.experiment:'water';
 let routePreset=selection.preset;
 const preset=theme==='characters'?characterPresets.get(routePreset):undefined;
 let s={...DEFAULTS[theme],...preset},timer=null,pythonStatus='',pythonResult=null,busy=false,revision=0,comparisonBasis;
 container.innerHTML='<article class="fd-course"></article>';const root=container.firstElementChild;
 let disposed=false,waterTicket=0,disposeWater=()=>{},waterDetail=null,waterOpening=null,waterBound=false,legacyRequest=null,detachObserver;
 const current=()=>!disposed&&container.isConnected!==false&&root.isConnected!==false&&container.firstElementChild===root;
 const opened=detail=>!!detail&&(typeof detail.open==='boolean'?detail.open:detail.getAttribute('open')!==null);
 function stopAnimation(){if(timer){clearInterval(timer);timer=null;}}
 function clearWater(){
  if(waterDetail)waterActionsStates.set('host:water-actions',{open:opened(waterDetail)});
  waterTicket++;waterOpening=null;waterBound=false;disposeWater();disposeWater=()=>{};waterDetail=null;
 }
 function stopLegacy(){
  const owned=legacyRequest;legacyRequest=null;if(!owned)return;owned.live=false;
  // Automatic teardown cannot prove ownership of a global fallback. The
  // shared application supplies request.cancel; an unscoped legacy promise
  // is invalidated here and its eventual reply is ignored.
  if(owned.pending&&typeof owned.promise?.cancel==='function')owned.promise.cancel();
  busy=false;
 }
 function disposeView(){if(disposed)return;disposed=true;revision++;stopAnimation();clearWater();stopLegacy();detachObserver?.disconnect();}
 previousFoundationsCleanup=disposeView;
 if(typeof MutationObserver==='function'){
  detachObserver=new MutationObserver(()=>{if(!current())disposeView();});
  detachObserver.observe(container.ownerDocument?.documentElement||container,{childList:true,subtree:true});
 }
 function waterEntry(){
  if(theme!=='water')return '';
  const characterLink=`<a href="${waterMirrorCharacterRoute}">matrices and characters demo</a>`;
  return `<p id="fd-water-character-prerequisite" class="fd-scope">In the ${characterLink} see how the mirror  ${math('\\sigma(xz)')}  acts on a full three-dimensional vector. Then return here to examine the displacements of the three water atoms.</p>
  <details class="wax-entry" data-water-actions-entry${waterActionsStates.get('host:water-actions')?.open?' open':''}><summary>How does water acquire a character of −1?</summary><p>Follow the nine displacement columns of three atoms, distinguish atom exchange from arrow rotation, then reduce the representation and remove rigid motions.</p><div data-water-actions-body></div></details>
  <p class="fd-scope"><a href="#classroom/observables?material=gaas&amp;lesson=acoustic-optical">What happens if we try a rigid rotation in a periodic crystal? →</a></p>`;
 }
 function mountWater(){
  const detail=root.querySelector('[data-water-actions-entry]'),body=detail?.querySelector('[data-water-actions-body]');if(!detail||!body)return;
  waterDetail=detail;
  const here=()=>current()&&theme==='water'&&root.querySelector('[data-water-actions-entry]')===detail;
  function loadOpen(){
   if(!here()||!opened(detail)||waterBound)return;
   if(waterOpening)return waterOpening;
   const ticket=++waterTicket;body.innerHTML="<p role=\"status\">Loading the water displacement workshop…</p>";
   const loading=Promise.resolve().then(async()=>{
    try{
     const module=await loadWaterActions();if(!here()||!opened(detail)||ticket!==waterTicket)return;
     if(typeof module?.bindWaterActionsLesson!=='function')throw Error("The water displacement workshop is temporarily unavailable. Please retry.");
     const cleanup=module.bindWaterActionsLesson({root:body,isCurrent:()=>here()&&opened(detail),stateStore:waterActionsStates,run,cancelRun,download});
     if(!here()||!opened(detail)||ticket!==waterTicket){if(typeof cleanup==='function')cleanup();return;}
     disposeWater=typeof cleanup==='function'?cleanup:()=>{};waterBound=true;
    }catch(error){
     if(!here()||!opened(detail)||ticket!==waterTicket)return;
     body.innerHTML=`<p class="notice error" role="alert">${esc(error?.message||"The water displacement workshop is temporarily unavailable. Please retry.")}</p><button type="button" class="secondary" data-water-actions-retry>Retry the water displacement workshop</button>`;
     const retry=body.querySelector('[data-water-actions-retry]');retry.onclick=()=>{if(here()&&opened(detail)&&body.querySelector('[data-water-actions-retry]')===retry)return loadOpen();};
    }finally{if(waterOpening===loading)waterOpening=null;}
   });
   waterOpening=loading;return loading;
  }
  detail.ontoggle=()=>{
   if(!here())return;waterActionsStates.set('host:water-actions',{open:opened(detail)});
   if(opened(detail))return loadOpen();
   clearWater();waterDetail=detail;body.innerHTML='';
  };
  if(opened(detail))loadOpen();
 }
 const payload=()=>({experiment:theme,theme:theme==='projection'?'d3':theme,...s});
 function update(){
  const out=scene(theme,s);
  root.querySelector('.fd-preview').innerHTML=out.plot+out.html;
  root.querySelector('.fd-questions').innerHTML=out.exercise;
  latest={tool:'foundations_demos_preview',input:payload(),result:{...out.data,computation:'JavaScript interactive teaching preview'}};
  root.querySelectorAll('[data-output]').forEach(el=>el.textContent=s[el.dataset.output]);
  const comparison=root.querySelector('#fd-character-comparison');
  if(comparison&&comparisonBasis!==s.basis){
   comparisonBasis=s.basis==='d5'?'xyz':s.basis;
   comparison.innerHTML=characterComparisonHTML(comparisonBasis);
   bindCharacterComparison(comparison,()=>current()&&root.querySelector('#fd-character-comparison')===comparison);
  }
 }
 function draw(){
  if(!current())return;
  clearWater();
  comparisonBasis=undefined;
  root.innerHTML=`<header class="fd-hero"><span class="fd-eyebrow">Foundational demonstrations · from operations to physical consequences</span><h2>Make abstract symmetry an interactive lesson</h2><p>Choose a topic, vary parameters, and predict before checking. Each demonstration states its basis, coordinates, and model conventions.</p></header>
  <nav class="fd-tabs" aria-label="Current topic group">${THEMES.filter(([id])=>['water','characters','projection'].includes(theme)?['water','characters','projection'].includes(id):['splitting','jt','macro'].includes(id)).map(([id,title])=>`<button type="button" data-theme="${id}" aria-pressed="${theme===id}">${title}</button>`).join('')}</nav>
  ${waterEntry()}
  ${theme==='projection'&&routePreset==='triangle-permutation'?triangleProjectionBridgeHTML():''}
  <div class="fd-workspace"><aside class="fd-controls"><h3>Adjust and predict</h3>${controls(theme,s)}<p class="fd-status" role="status">Change the parameters and follow the matrices, derivation and results step by step.</p></aside><section class="fd-preview" aria-live="polite"></section></div>
  ${theme==='characters'?'<div id="fd-character-comparison"></div>'+characterWaterBridgeHTML():''}
  <div class="fd-questions"></div><footer class="fd-footer"><a href="#classroom/foundations?lesson=selection-rules">Existing water selection-rule lesson</a> · <a href="#classroom/foundations?module=salc">Symmetry-adapted basis calculator</a> · <a href="#classroom/spin?module=orbitals">Crystal fields and orbitals</a> · <a href="docs/foundations-demos.md">Teaching models, conventions, and sources</a></footer>`;
  update();
  bindTriangleProjectionBridge(root,current);
  bindCharacterWaterBridge(root,current);
  mountWater();
 }
 root.addEventListener('input',e=>{if(!current())return;const id=e.target.dataset.param;if(!id||e.target.tagName==='SELECT')return;s[id]=Number(e.target.value);revision++;pythonStatus="Parameters changed; the plot and derivation have updated together.";pythonResult=null;update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('change',e=>{if(!current())return;const id=e.target.dataset.param;if(!id)return;s[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;revision++;pythonResult=null;pythonStatus="Parameters changed; the plot and derivation have updated together.";update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('click',async e=>{
  if(!current())return;
  const tab=e.target.closest('[data-theme]');
  if(tab){
   stopAnimation();stopLegacy();
   theme=tab.dataset.theme;revision++;s={...DEFAULTS[theme]};pythonStatus='';pythonResult=null;
   const patch=routePreset===undefined?{experiment:theme}:{experiment:theme,preset:undefined};
   routePreset=undefined;
   onNavigate(patch);
   draw();
   return;
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='animate'){if(timer)stopAnimation();else timer=setInterval(()=>{if(!current()){stopAnimation();return;}s.phase=(s.phase+5)%360;const input=root.querySelector('[data-param="phase"]');if(input)input.value=s.phase;update();},65);}
 });
 draw();return disposeView;
}
