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
const DEFAULTS={water:{mode:'symmetric',phase:30,amplitude:.2,channel:'ir-z'},characters:{operation:'C4',basis:'xyz'},projection:{operation:1,seedSite:0,irrep:'E',row:0},splitting:{delta:1,ds:.12,dt:.03},jt:{qtheta:.65,qepsilon:.25,g:1,k:1,occupancy:1},macro:{n:4,translation:.35}};
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

export function charactersPreview(s){
 const matrices={C4:[[0,-1,0],[1,0,0],[0,0,1]],C2:[[-1,0,0],[0,-1,0],[0,0,1]],mirror:[[1,0,0],[0,-1,0],[0,0,1]],identity:[[1,0,0],[0,1,0],[0,0,1]]};
 const full=matrices[s.operation]||matrices.C4,xy=full.slice(0,2).map(r=>r.slice(0,2)),m=s.basis==='xy'?xy:full;
 return {matrix:m,trace:m.reduce((a,r,i)=>a+r[i],0),fullTrace:full.reduce((a,r,i)=>a+r[i],0),xyTrace:xy.reduce((a,r,i)=>a+r[i],0),fullMatrix:full,xyMatrix:xy};
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
export function projectionPreview(s){
 const permutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]],names=['E','C₃⁺','C₃⁻','C₂(1)','C₂(2)','C₂(3)'];
 const q=[2/Math.sqrt(6),-1/Math.sqrt(6),-1/Math.sqrt(6)],v=[0,1/Math.sqrt(2),-1/Math.sqrt(2)],a=[1,1,1].map(x=>x/Math.sqrt(3));
 const permutation=permutations[s.operation],P=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>permutation[j]===i?1:0));
 const seed=[0,0,0];seed[s.seedSite]=1;
 let projected=s.irrep==='A1'?a.map(x=>x*a[s.seedSite]):s.irrep==='A2'?[0,0,0]:s.row===1?v.map(x=>x*q[s.seedSite]):seed.map((x,i)=>x-1/3);
 const norm=Math.hypot(...projected),normalized=norm>1e-9?projected.map(x=>x/norm):[0,0,0];
 return {matrix:P,eMatrix:[q,v].map(b=>[q,v].map(c=>dot(b,mv(P,c)))),character:P.reduce((a,r,i)=>a+r[i],0),permutation,name:names[s.operation],projected,normalized,norm,basis:[a,q,v]};
}
export function splittingPreview(s){
 const d=Number(s.delta),ds=Number(s.ds),dt=Number(s.dt);
 const levels=[{name:'d(z²)',irrep:'A₁',cubic:.6*d,energy:.6*d-2*ds-6*dt},{name:'d(x²−y²)',irrep:'B₁',cubic:.6*d,energy:.6*d+2*ds-dt},{name:'d(xy)',irrep:'B₂',cubic:-.4*d,energy:-.4*d+2*ds-dt},{name:'d(xz), d(yz)',irrep:'E',cubic:-.4*d,energy:-.4*d-ds+4*dt}];
 return {levels,barycenter:(levels[0].energy+levels[1].energy+levels[2].energy+2*levels[3].energy)/5};
}
export function jtPreview(s){const Q=Math.hypot(s.qtheta,s.qepsilon),elastic=.5*s.k*Q*Q,linearActive=[1,3].includes(Number(s.occupancy)),imbalance=linearActive?1:0;return {Q,lower:elastic-s.g*Q,upper:elastic+s.g*Q,potential:elastic-imbalance*s.g*Q,minRadius:imbalance*s.g/s.k,stabilization:imbalance*s.g*s.g/(2*s.k),linearActive};}
const range=(id,label,value,min,max,step)=>`<label><span>${label} <output data-output="${id}">${value}</output></span><input data-param="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,value,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${t}</option>`).join('')}</select></label>`;
const exercise=(question,steps)=>`<section class="fd-exercise"><h3>Predict first, then derive step by step</h3><p>${question}</p><details><summary>Show the worked answer</summary><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol></details></section>`;

function controls(theme,s){
 if(theme==='water')return select('mode',"Vibrational mode",s.mode,[['symmetric',"Symmetric stretch · A₁"],['bend',"Bend · A₁"],['antisymmetric',"Antisymmetric stretch · B₁"]])+range('phase',"Vibrational phase (°)",s.phase,0,360,1)+range('amplitude',"Schematic amplitude",s.amplitude,0,.5,.025)+select('channel',"Detection polarization",s.channel,[['ir-z',"Infrared · z"],['ir-x',"Infrared · x"],['raman-xx',"Raman · xx"],['raman-xz',"Raman · xz"]])+`<button type="button" data-action="animate">Play / pause the vibration</button>`;
 if(theme==='characters')return select('operation',"Geometric operation",s.operation,[['C4',"C₄(z) · positive quarter-turn"],['C2',"C₂(z) · half-turn"],['mirror',"σ(xz) · mirror"],['identity',"E · identity"]])+select('basis',"Representation space",s.basis,[['xyz',"Full three-dimensional vector (x,y,z)"],['xy',"Two-dimensional subspace (x,y)"]]);
 if(theme==='projection')return select('operation',"Operation to inspect",s.operation,[[0,'E'],[1,'C₃⁺'],[2,'C₃⁻'],[3,"C₂(1) · rotation about a vertex axis"],[4,"C₂(2) · rotation about a vertex axis"],[5,"C₂(3) · rotation about a vertex axis"]])+select('seedSite',"Projection seed",s.seedSite,[[0,'φ₁ = (1,0,0)'],[1,'φ₂ = (0,1,0)'],[2,'φ₃ = (0,0,1)']])+select('irrep',"Target irreducible representation",s.irrep,[['A1',"A₁ character projector"],['A2',"A₂ character projector"],['E',"E subspace / row projector"]])+select('row',"Partner in the E basis",s.row,[[0,"Project into the E subspace with Pᴱ"],[1,"Construct partner v from u using P₂₁"]]);
 if(theme==='splitting')return range('delta',"Octahedral crystal field Δ (teaching units)",s.delta,0,2,.02)+range('ds',"Tetragonal parameter Dₛ",s.ds,-.35,.35,.01)+range('dt',"Tetragonal parameter Dₜ",s.dt,-.15,.15,.01);
 if(theme==='jt')return range('qtheta',"Distortion coordinate Qθ",s.qtheta,-2,2,.02)+range('qepsilon',"Distortion coordinate Qε",s.qepsilon,-2,2,.02)+range('g',"Linear coupling g",s.g,0,2,.05)+range('k',"Elastic constant k",s.k,.5,2,.05)+select('occupancy',"Simplified two-orbital electron filling",s.occupancy,[[1,"1 electron: lower branch occupied"],[2,"2 electrons: one in each orbital (Hund schematic)"],[3,"3 electrons: one hole"],[4,"4 electrons: filled shell"]]);
 return select('n',"Rotation order to test",s.n,[[1,"1-fold axis"],[2,"2-fold axis"],[3,"3-fold axis"],[4,"4-fold axis"],[5,"5-fold axis"],[6,"6-fold axis"]])+range('translation',"Accompanying translation tₓ (lattice units)",s.translation,0,1,.05);
}

export function waterPreview(s){
 const theta=104.5*Math.PI/360,a=Math.sin(theta),b=Math.cos(theta),base=[[0,0],[a,b],[-a,b]],mass=[16,1,1],center=[0,b/9];
 const raw=s.mode==='symmetric'?[[0,0],[a,b],[-a,b]]:s.mode==='bend'?[[0,0],[b,-a],[-b,-a]]:[[0,0],[a,b],[a,-b]];
 const mean=[0,1].map(j=>raw.reduce((sum,u,i)=>sum+mass[i]*u[j],0)/18),centered=base.map(p=>p.map((x,j)=>x-center[j]));
 let u=raw.map(p=>p.map((x,j)=>x-mean[j]));
 const inertia=centered.reduce((sum,r,i)=>sum+mass[i]*(r[0]**2+r[1]**2),0),ly=centered.reduce((sum,r,i)=>sum+mass[i]*(r[1]*u[i][0]-r[0]*u[i][1]),0),omega=ly/inertia;
 u=u.map((v,i)=>[v[0]-omega*centered[i][1],v[1]+omega*centered[i][0]]);const norm=Math.max(...u.map(v=>Math.hypot(...v)));u=u.map(v=>v.map(x=>x/norm));
 const t=Math.sin(s.phase*Math.PI/180)*s.amplitude;return {positions:base.map((p,i)=>p.map((x,j)=>x+u[i][j]*t)),displacements:u};
}
function waterScene(s){
 const preview=waterPreview(s),pts=preview.positions,xy=p=>[320+p[0]*150,240-p[1]*150];
 let body=line(320,300,320,30,'#a5b1ba')+line(100,240,550,240,'#a5b1ba')+text(340,35,'z / C₂')+text(565,245,'x');
 for(let i=1;i<3;i++){const o=xy(pts[0]),h=xy(pts[i]);body+=line(...o,...h,'#37657b',8);}
 pts.forEach((p,i)=>{const [x,y]=xy(p);body+=`<circle cx="${x}" cy="${y}" r="${i?22:28}" fill="${i?'#eef6f8':'#cfe5ef'}" stroke="#244f68" stroke-width="2"/>`+text(x,y+6,i?'H'+i:'O');});
 const irrep=s.mode==='antisymmetric'?'B₁':'A₁',allowed=s.mode==='antisymmetric'?['ir-x','raman-xz'].includes(s.channel):['ir-z','raman-xx'].includes(s.channel);
 return {plot:svg("Schematic water vibration in the xz plane",body),data:{mode:s.mode,phase:s.phase,positions:pts,irrep,allowed},html:`<h3>H₂O：${irrep} mode · ${allowed?"Symmetry allows this polarization":"Symmetry forbids this polarization"}</h3><p>The molecule lies in xz with its principal axis along z. The two A₁ modes match z and diagonal polarizability components; B₁ matches x and xz.</p>${table(["Operation",'E','C₂(z)','σ(xz)','σ(yz)'],[["Fixed atoms",3,1,3,1],["Vector trace",3,-1,1,1],["Characters of Γ₃N",9,-1,3,1]])}<p>${math('\\Gamma_{3N}=3A_1+A_2+3B_1+2B_2')}; subtracting translations and rotations gives ${math('\\Gamma_{\\mathrm{vib}}=2A_1+B_1')}。</p><p class="fd-scope">The displacements illustrate mode symmetry, without computing real frequencies, peak positions, or relative intensities. An allowed mode need not produce a strong peak in every experimental geometry.</p>`,exercise:exercise("When infrared polarization changes from z to x, which modes become forbidden? Why does another water table give 2A₁+B₂?",["A₁ contains z and B₁ contains x; infrared coupling must match the same vector component as the mode.","In the present xz convention, the two A₁ modes are allowed for z polarization and B₁ for x polarization.","Placing water in yz exchanges x and y and hence the B₁/B₂ labels. The physical modes are unchanged."])};
}
function charactersScene(s){const r=charactersPreview(s),p=mv(r.fullMatrix,[.7,.4,.6]);let body=line(90,250,270,250,'#abb8c2')+line(180,310,180,50,'#abb8c2');body+=line(180,250,285,190,'#2673aa',4)+line(180,250,180+p[0]*150,250-p[1]*150,'#b1583d',4)+text(285,175,'r','#2673aa')+text(180+p[0]*150,230-p[1]*150,'Rr','#b1583d');return {plot:svg("Geometric action and the selected matrix space",body+text(460,130,"Three-dimensional vector space")+text(460,175,'(x,y) ⊕ z')+text(460,240,"χ = sum of matrix diagonal entries")),data:r,html:`<h3>Character in the selected space, χ = ${r.trace}</h3>${matrix(r.matrix)}<p>Full three-dimensional trace:${r.fullTrace}; xy-subspace trace:${r.xyTrace}. Restricting the three-dimensional action to the invariant xy subspace gives a different representation.</p><p>For C₄ᵥ, ${math('D_{\\mathrm{vector}}=D_E\\oplus D_{A_1}')}. For C₄, the xy block has trace 0 and z contributes 1, giving a character of 1 for the full vector representation.</p><p>For the same representation and operation, a change of basis gives  ${math("D'(g)=S^{-1}D(g)S")}. The matrix entries can change while the character stays unchanged.</p>`,exercise:exercise("The trace of a two-dimensional rotation is 0. Does that mean there is no transformation?",["Read the xy block of C₄: [[0,−1],[1,0]].","It takes the x basis vector to y and y to −x. Its square is −I, so it is clearly not a zero matrix.","The full three-dimensional representation also contains the unchanged z component, giving χ(C₄)=0+1=1."])};}
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
  <p>Current representation space ${math(plane?'(x,y)':'(x,y,z)')}. Compare a positive quarter-turn about z with reflection in the xz plane.</p>
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
function projectionScene(s){const r=projectionPreview(s),pts=[[320,48],[110,265],[530,265]],weights=r.normalized;let body=line(...pts[0],...pts[1])+line(...pts[1],...pts[2])+line(...pts[2],...pts[0]);pts.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="${24+Math.abs(weights[i])*15}" fill="${weights[i]<0?'#f3dace':'#cfe7f4'}" stroke="#315b73" stroke-width="2"/>`+text(x,y+6,'φ'+(i+1))+text(x,y+57,fmt(weights[i]),weights[i]<0?'#a44623':'#245f91');});return {plot:svg("Projection coefficients for three scalar vertex functions of D3",body),data:r,html:`<h3>Three scalar vertex functions:${math('\\Gamma_{\\mathrm{sites}}=A_1\\oplus E')}</h3><p>Each vertex carries one s-like scalar φ, rather than x/y displacements at every vertex, which would give six dimensions. Here we use the proper-rotation D₃ subgroup of an equilateral triangle.</p>${table(["Conjugacy class",'E','2C₃','3C₂'],[["Trace of the vertex permutation",3,0,1],['A₁',1,1,1],['A₂',1,1,-1],['E',2,-1,0]])}<p>${math('P^{(\\alpha)}=\\frac{d_\\alpha}{6}\\sum_g\\chi_\\alpha(g)^*T(g)')}. Current normalized projection: [${r.normalized.map(fmt).join(', ')}]${r.norm<1e-9?"(zero projection; normalization is undefined)":''}。</p><div class="fd-matrix-pair"><div><strong>T(${r.name}): vertex basis</strong>${matrix(r.matrix)}</div><div><strong>Dᴱ(${r.name}): u/v basis</strong>${matrix(r.eMatrix)}</div></div><p>${math('u=(2,-1,-1)/\\sqrt6')}，${math('v=(0,1,-1)/\\sqrt2')}. The E character projector selects the full two-dimensional subspace; the row projector ${math('P^E_{21}')} constructs partner v from a component along u.</p>`,exercise:exercise("Why does applying the E character projector to one seed not yet produce a complete E basis?",["E is two-dimensional and needs two linearly independent, orthogonal basis functions.","Normalizing Pᴱφ₁ gives u=(2,−1,−1)/√6, which supplies one direction.","Project another seed and orthogonalize it, or use row projector P₂₁ to obtain v=(0,1,−1)/√2.","Computing QᵀT(g)Q in these two basis functions gives matrices acting within the same two-dimensional space."])};}
function splittingScene(s){const r=splittingPreview(s),energies=[0,.6*s.delta,-.4*s.delta,...r.levels.map(x=>x.energy)],low=Math.min(...energies)-.25,high=Math.max(...energies)+.25,energyY=e=>275-(e-low)*190/(high-low);let body='';const xs=[90,300,535];body+=line(xs[0]-45,energyY(0),xs[0]+45,energyY(0),'#46647d',4)+text(xs[0],40,'SO(3)：l = 2')+text(xs[0],75,"5 dimensions");const stages=[{e:.6*s.delta,name:"E: twofold",x:xs[1]},{e:-.4*s.delta,name:"T₂: threefold",x:xs[1]}];for(const a of stages){body+=line(a.x-45,energyY(a.e),a.x+45,energyY(a.e),'#246b99',4)+text(a.x,energyY(a.e)-12,a.name);body+=line(xs[0]+45,energyY(0),a.x-50,energyY(a.e),'#c2ccd4',1);}body+=text(xs[1],40,"O: proper octahedral rotation group")+text(xs[2],40,"D₄: proper tetragonal rotation group");const groups=new Map();r.levels.forEach(a=>{const key=a.energy.toFixed(8);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);});for(const levels of groups.values()){const y=energyY(levels[0].energy);body+=line(xs[2]-43,y,xs[2]+43,y,'#267e70',4)+text(xs[2],y-10,levels.map(a=>a.irrep).join(' + '),undefined,16);for(const a of levels)body+=line(xs[1]+47,energyY(a.cubic),xs[2]-46,y,'#c2ccd4',1);}return {plot:svg("Splitting of five d-orbital levels from SO3 through O to D4",body),data:r,html:`<h3>Lower the symmetry while preserving the five-dimensional space and energy barycenter</h3><p>${math('D^{(l=2)}\\downarrow O=E\\oplus T_2')}；${math('E\\downarrow D_4=A_1\\oplus B_1')}，${math('T_2\\downarrow D_4=B_2\\oplus E')}。</p>${table(["Orbital","D₄ label","Energy"],r.levels.map(a=>[a.name,a.irrep,fmt(a.energy)]))}<p>Degeneracy-weighted barycenter = ${fmt(r.barycenter)}. Changing Dₛ and Dₜ shifts relative sublevel energies; the total dimension remains 1+1+1+2=5.</p><p class="fd-scope">This single-electron d-orbital crystal-field model omits spin and SOC. O and D₄ contain proper rotations, so labels have no g. If inversion is added to discuss Oₕ/D₄ₕ, the even d orbitals in this example can carry g labels.</p>`,exercise:exercise("Why does T₂ reduce to B₂+E under D₄, rather than yielding five unrelated energy levels?",["The l=2 space starts with five orbital states. Lowering symmetry reorganizes those same states.","The E and T₂ representations of O have dimensions 2 and 3. Under D₄, E→A₁+B₁ and T₂→B₂+E.","The remaining E doublet is protected by D₄ symmetry. Splitting it arbitrarily into two energies would break the symmetry retained by the model."])};}
function jtScene(s){const r=jtPreview(s),emin=Math.min(-s.g*s.g/(2*s.k),r.lower)-.3,emax=Math.max(2*s.k+2*s.g,r.upper)+.3,ey=e=>285-(e-emin)*240/(emax-emin);let body=line(60,290,600,290,'#aab7c2')+line(325,320,325,35,'#aab7c2')+text(600,322,'Qθ')+text(350,35,"Energy");const curve=sign=>Array.from({length:101},(_,i)=>{const q=-2+4*i/100,e=.5*s.k*q*q+sign*s.g*Math.abs(q);return `${i?'L':'M'}${325+q*115},${ey(e)}`;}).join(' ');body+=`<path d="${curve(-1)}" fill="none" stroke="#216f99" stroke-width="4"/><path d="${curve(1)}" fill="none" stroke="#aa5841" stroke-width="3"/>`;const markX=325+s.qtheta*115;body+=`<circle cx="${markX}" cy="${ey(r.lower)}" r="7" fill="#216f99"/>`+text(140,55,"Lower / upper branches: Qε=0 section",undefined,17);return {plot:svg("Adiabatic energy-surface section of the linear E times e Jahn Teller model",body),data:r,html:`<h3>Symmetry permits the coupling; orbital filling determines the linear driving force</h3><p>${math('H_{\\mathrm{el}}=g(Q_\\theta\\tau_z+Q_\\epsilon\\tau_x)')}，${math('V_\\pm=\\tfrac12kQ^2\\pm gQ')}，${math('Q=\\sqrt{Q_\\theta^2+Q_\\epsilon^2}')}。</p><p>Current Q = ${fmt(r.Q)}; lower branch V₋ = ${fmt(r.lower)}, upper branch V₊ = ${fmt(r.upper)}; minimum radius for the present filling, Q₀=${fmt(r.minRadius)}, stabilization energy EJT=${fmt(r.stabilization)}, occupied-state potential=${fmt(r.potential)}. For one electron or one hole, Q₀=g/k and EJT=g²/(2k).</p><p>${r.linearActive?"The current one-electron / one-hole filling has an uncancelled linear energy lowering.":"For this simplified filling, the two linear contributions cancel. A single lower-branch curve does not establish a lowering of the total energy."} A single e<sub>g</sub> hole in d⁹ is a common example; high-spin d⁵ does not have the same e<sub>g</sub> orbital-degenerate filling.</p><p class="fd-scope">The graph shows the Qε=0 section. The dot uses the energy at the current two-dimensional Q, so it may lie off the section curve when Qε≠0. This linear E⊗e model does not identify every degeneracy, or Kramers degeneracy, as a Jahn–Teller driving force.</p>`,exercise:exercise("When g becomes 0, is there still a minimum at a finite distortion radius?",["Electronic coupling vanishes and both branches become kQ²/2.","Q₀=g/k and the stabilization energy g²/(2k) both become 0. The minimum returns to the high-symmetry configuration.","For a real material, examine orbital filling, vibronic coupling, SOC, and the lattice environment. A degenerate-level diagram alone is insufficient."])};}
function macroScene(s){const allowed=[1,2,3,4,6].includes(Number(s.n)),angle=2*Math.PI/s.n,trace=2*Math.cos(angle),t=Number(s.translation);let body='';for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const triangular=[3,6].includes(Number(s.n)),x=180+(i+(triangular?j*.5:0))*42,y=175+j*(triangular?36.4:42);body+=`<circle cx="${x}" cy="${y}" r="4" fill="#9bb0bf"/>`;}body+=line(180,175,260,175,'#2478a4',4)+line(180,175,180+80*Math.cos(angle),175-80*Math.sin(angle),'#a35038',4)+text(180,315,"Rotation acts on the translation lattice")+text(465,95,'{R | t} → R')+text(465,145,"Space group / translation subgroup")+text(465,190,"= macroscopic point group")+text(465,255,"Not the site-symmetry group of an arbitrary point");return {plot:svg("Removing translations from a space group gives its macroscopic point group",body),data:{n:Number(s.n),allowed,planeTrace:trace,translation:t},html:`<h3>${s.n} -fold axis:${allowed?"compatible with the crystallographic restriction for a three-dimensional periodic lattice":"not an allowed crystallographic rotation order for a three-dimensional periodic lattice"}</h3><p>In a basis of the periodic translation lattice, rotations must be represented by integer matrices. The trace in the plane perpendicular to the rotation axis is ${math('2\\cos(2\\pi/n)')} = ${fmt(trace)}；${allowed?"It satisfies the corresponding integer condition.":"For n=5 this value is not an integer, so the rotation cannot preserve a three-dimensional periodic translation lattice."}</p><p>The same rotation R with accompanying translation tₓ=${fmt(t)}gives different Seitz operations; removing translations maps them to the same R. The macroscopic point group is ${math('G/T')} , where T is the normal subgroup of all lattice translations.</p><p>This explains why a point group constrains homogeneous macroscopic property tensors, while fractional translations in screws and glides still affect diffraction extinctions and Bloch phases. The macroscopic point group also differs from an arbitrary atom's site-symmetry group.</p>`,exercise:exercise("Does removing translations for macroscopic properties make translations irrelevant to every experiment?",["A homogeneous macroscopic tensor does not resolve lattice translations of identical local environments, so its symmetry constraints can use G/T.","Diffraction amplitudes contain position-dependent phases; screw axes and glide planes can produce extinctions.","Bloch states also carry translation phases. The macroscopic point group, site-symmetry group, and full space group therefore serve different purposes."])};}
function scene(theme,s){return ({water:waterScene,characters:charactersScene,projection:projectionScene,splitting:splittingScene,jt:jtScene,macro:macroScene})[theme](s);}

export async function renderFoundationsDemosView({container,selection={},run,cancelRun,download=()=>{},onNavigate=()=>{},loadWaterActions=defaultWaterActionsLoader}){
 previousFoundationsCleanup();
 let theme=THEMES.some(([id])=>id===selection.experiment)?selection.experiment:'water';
 const preset=theme==='characters'?characterPresets.get(selection.preset):undefined;
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
   comparisonBasis=s.basis;
   comparison.innerHTML=characterComparisonHTML(comparisonBasis);
   bindCharacterComparison(comparison,()=>current()&&root.querySelector('#fd-character-comparison')===comparison);
  }
 }
 function draw(){
  if(!current())return;
  clearWater();
  comparisonBasis=undefined;
  root.innerHTML=`<header class="fd-hero"><span class="fd-eyebrow">Foundational demonstrations · from operations to physical consequences</span><h2>Make abstract symmetry an interactive lesson</h2><p>Choose a topic, vary parameters, and predict before checking. Each demonstration states its basis, coordinates, and model conventions.</p></header>
  <nav class="fd-tabs" aria-label="Teaching demonstration topics">${THEMES.map(([id,title])=>`<button type="button" data-theme="${id}" aria-pressed="${theme===id}">${title}</button>`).join('')}</nav>
  ${waterEntry()}
  <div class="fd-workspace"><aside class="fd-controls"><h3>Adjust and predict</h3>${controls(theme,s)}<button class="primary" type="button" data-action="python" ${busy||!run?'disabled':''}>${busy?"Python is checking…":"Check with browser Python"}</button><p class="fd-status" role="status">${esc(pythonStatus||"The figure responds immediately to parameters; the Python button provides an independent calculation check.")}</p></aside><section class="fd-preview" aria-live="polite"></section></div>
  ${theme==='characters'?'<div id="fd-character-comparison"></div>'+characterWaterBridgeHTML():''}
  <div class="fd-questions"></div><details class="fd-python"><summary>Inspect the Python check data</summary><pre>${pythonResult?esc(JSON.stringify(pythonResult,null,2)):"Not checked yet. Use the Python button above."}</pre></details><footer class="fd-footer"><a href="#classroom/foundations?lesson=selection-rules">Existing water selection-rule lesson</a> · <a href="#classroom/foundations?module=salc">Symmetry-adapted basis calculator</a> · <a href="#classroom/spin?module=orbitals">Crystal fields and orbitals</a> · <a href="docs/foundations-demos.md">Teaching models, conventions, and sources</a></footer>`;
  update();
  bindCharacterWaterBridge(root,current);
  mountWater();
 }
 function syncLegacyPython(){
  if(!current())return;
  const button=root.querySelector('[data-action="python"]');if(button){button.disabled=busy||!run;button.textContent=busy?"Python is checking…":"Check with browser Python";}
  const status=root.querySelector('.fd-status');if(status)status.textContent=pythonStatus||"The figure responds immediately to parameters; the Python button provides an independent calculation check.";
  const raw=root.querySelector('.fd-python')?.querySelector('pre');if(raw)raw.textContent=pythonResult?JSON.stringify(pythonResult,null,2):"Not checked yet. Use the Python button above.";
 }
 root.addEventListener('input',e=>{if(!current())return;const id=e.target.dataset.param;if(!id||e.target.tagName==='SELECT')return;s[id]=Number(e.target.value);revision++;pythonStatus="Parameters changed. The next Python check will use the current input.";pythonResult=null;update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('change',e=>{if(!current())return;const id=e.target.dataset.param;if(!id)return;s[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;revision++;pythonResult=null;pythonStatus="Parameters changed. Run Python again to check them.";update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('click',async e=>{
  if(!current())return;
  const tab=e.target.closest('[data-theme]');if(tab){stopAnimation();stopLegacy();theme=tab.dataset.theme;revision++;s={...DEFAULTS[theme]};pythonStatus='';pythonResult=null;onNavigate({experiment:theme,preset:undefined});draw();return;}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='animate'){if(timer)stopAnimation();else timer=setInterval(()=>{if(!current()){stopAnimation();return;}s.phase=(s.phase+5)%360;const input=root.querySelector('[data-param="phase"]');if(input)input.value=s.phase;update();},65);}
  if(action==='python'&&run&&!busy){
   stopAnimation();const stamp=revision,owned={pending:true,promise:null,live:true};legacyRequest=owned;busy=true;pythonStatus="Starting browser Python and checking the current model…";syncLegacyPython();
   try{
    const input=payload();owned.promise=run('foundations_demos',input);const result=await owned.promise;owned.pending=false;
    if(!current()||!owned.live||legacyRequest!==owned||stamp!==revision)return;
    pythonResult=result;pythonStatus=result?.checks?.passed===false?"Python reported a failed check. Inspect the data and input.":"Python check complete. Compare the matrices, characters, and decomposition.";syncLegacyPython();latest={tool:'foundations_demos',input,result};
   }catch(error){owned.pending=false;if(current()&&owned.live&&legacyRequest===owned&&stamp===revision){pythonStatus="Python check did not complete:"+error.message;syncLegacyPython();}}
   finally{owned.pending=false;if(legacyRequest===owned){legacyRequest=null;busy=false;syncLegacyPython();}}
  }
 });
 draw();return disposeView;
}
