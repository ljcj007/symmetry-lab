import {mathHTML} from './math-display.js?v=20261113-prose2';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-9?'0':Number(x.toFixed(4)).toString();
const math=t=>`<span class="sl-math" data-math-source="${esc(t)}">${mathHTML(t)}</span>`;
const groupMath=g=>math(({Td:String.raw`T_d`,Oh:String.raw`O_h`,Ih:String.raw`I_h`})[g]||g);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.sqrt(dot(a,a));
const mv=(a,v)=>a.map(r=>dot(r,v));
const line=(a,b,c,d,color='#4d6577',w=2)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${color}" stroke-width="${w}"/>`;
const text=(x,y,t,color='#16354c',size=17)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${t}</text>`;
const svg=(title,body)=>`<svg viewBox="0 0 640 340" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const table=(heads,rows)=>`<div class="smd-scroll"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const exercise=(q,steps)=>`<section class="smd-exercise"><h3>Prediction and stepwise derivation</h3><p>${q}</p><details><summary>Show derivation and counterexample</summary><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol></details></section>`;
const range=(id,label,v,min,max,step)=>`<label><span>${label} <output data-output="${id}">${v}</output></span><input type="range" aria-label="${esc(label)}" data-param="${id}" value="${v}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,v,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([x,t])=>`<option value="${x}" ${String(x)===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`;
export const miniDemoThemes=[{id:'polyhedra',title:"Five Platonic solids and point groups"},{id:'vibrations',title:"Molecular vibrations and degeneracy"},{id:'bands',title:"Bands and Kramers degeneracy"},{id:'manybody',title:"Two spins and exchange symmetry"},{id:'time-reversal',title:"Time reversal: antiunitary action"},{id:'double-soc',title:"Double groups, spin rotations, and SOC"}];
const defaults={polyhedra:{polyhedron:'tetra',order:3,fraction:1},vibrations:{k0:1,k:.5,delta:0,mix:0,phase:45,mode:'E'},bands:{t:1,alpha:.4,B:0,kpi:.35},manybody:{J:1,state:'singlet'},'time-reversal':{theta:65,phi:35,B:0,operation:'T'},'double-soc':{angle:360,coupling:.6}};
const rashbaTrimPreset='rashba-trim-check';
const lessonFractions=[0,.2,.5];
const rashbaFields=[0,.3];
let latest=null;
export const getSymmetryMiniDemosResult=()=>latest;

function vertices(name){
 const ph=(1+Math.sqrt(5))/2;if(name==='tetra')return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];
 if(name==='cube')return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z])));
 if(name==='octa')return [0,1,2].flatMap(j=>[-1,1].map(s=>[0,1,2].map(k=>k===j?s:0)));
 const ico=[];for(const a of [-1,1])for(const b of [-1,1])ico.push([0,a,b*ph],[a,b*ph,0],[b*ph,0,a]);
 if(name==='icosa')return ico;
 const dual=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)for(let k=j+1;k<12;k++)if([[i,j],[i,k],[j,k]].every(([a,b])=>Math.abs(dot(ico[a].map((x,l)=>x-ico[b][l]),ico[a].map((x,l)=>x-ico[b][l]))-4)<1e-8)){const c=[0,1,2].map(l=>(ico[i][l]+ico[j][l]+ico[k][l])/3),sc=Math.sqrt(3)/norm(c);dual.push(c.map(x=>x*sc));}return dual;
}
function geometry(s){
 const ph=(1+Math.sqrt(5))/2,n=Number(s.order),axis=({2:[1,0,0],3:[1,1,1],4:[0,0,1],5:[0,1,ph]})[n],u=axis.map(x=>x/norm(axis)),angle=2*Math.PI*s.fraction/n,c=Math.cos(angle),si=Math.sin(angle),[x,y,z]=u,skew=[[0,-z,y],[z,0,-x],[-y,x,0]];
 const rotation=u.map((a,i)=>u.map((b,j)=>c*(i===j?1:0)+(1-c)*a*b+si*skew[i][j]));
 const vs=vertices(s.polyhedron),transformed=vs.map(v=>mv(rotation,v)),pairs=vs.flatMap((v,i)=>vs.slice(i+1).map((w,k)=>[i,i+k+1,norm(v.map((x,j)=>x-w[j]))])),min=Math.min(...pairs.map(p=>p[2])),edges=pairs.filter(p=>Math.abs(p[2]-min)<1e-8).map(p=>p.slice(0,2));
 const distances=transformed.map(v=>Math.min(...vs.map(w=>norm(v.map((x,j)=>x-w[j]))))),groups={tetra:['T','Td',12,24],cube:['O','Oh',24,48],octa:['O','Oh',24,48],dodeca:['I','Ih',60,120],icosa:['I','Ih',60,120]},g=groups[s.polyhedron];
 return {vertices:vs,transformed,edges,axis:u,rotation,maxMismatch:Math.max(...distances),coincident:distances.every(x=>x<1e-8),properGroup:g[0],fullGroup:g[1],properOrder:g[2],fullOrder:g[3],crystallographic:!['dodeca','icosa'].includes(s.polyhedron)};
}
export function miniDemoPreview(experiment,params={}){
 const s={...defaults[experiment],...params};
 if(experiment==='polyhedra')return geometry(s);
 if(experiment==='vibrations'){
  const a=[1,1,1].map(x=>x/Math.sqrt(3)),u=[2,-1,-1].map(x=>x/Math.sqrt(6)),v=[0,1,-1].map(x=>x/Math.sqrt(2)),angle=s.mix*Math.PI/180,modeVector=s.mode==='A1'?a:u.map((x,i)=>Math.cos(angle)*x+Math.sin(angle)*v[i]),stiffness=u.map((x,i)=>u.map((y,j)=>s.k0*(i===j?1:0)+s.k*(i===j?2:-1)+s.delta*x*y)),rayleigh=dot(modeVector,mv(stiffness,modeVector)),eigenResidual=norm(mv(stiffness,modeVector).map((x,i)=>x-rayleigh*modeVector[i])),eigenvalues=[s.k0,s.k0+3*s.k+s.delta,s.k0+3*s.k];
  return {stiffness,basis:{A1:a,u,v},modeVector,displacement:modeVector.map(x=>x*Math.sin(s.phase*Math.PI/180)),eigenvalues,frequencies:eigenvalues.map(x=>x>=0?Math.sqrt(x):null),eigenResidual,isEigenvector:eigenResidual<1e-9,degenerateE:Math.abs(s.delta)<1e-12,stable:Math.min(...eigenvalues)>0};
 }
 if(experiment==='bands'){
  const k=s.kpi*Math.PI;
  const val=q=>{const e=-2*s.t*Math.cos(q),r=Math.hypot(2*s.alpha*Math.sin(q),s.B);return [e-r,e+r];};
  const e=-2*s.t*Math.cos(k),spinY=2*s.alpha*Math.sin(k),radius=Math.hypot(spinY,s.B),energies=val(k);
  return {k,energies,hamiltonian:{real:[[e+s.B,0],[0,e-s.B]],imag:[[0,-spinY],[spinY,0]]},
   spinUpper:radius>1e-12?[0,spinY/radius,s.B/radius]:null,
   curves:Array.from({length:129},(_,i)=>{const k=-Math.PI+2*Math.PI*i/128;return {k,energies:val(k)};}),
   trimGaps:{0:2*Math.abs(s.B),pi:2*Math.abs(s.B)},trResidual:2*Math.abs(s.B),
   sameKDegenerate:Math.abs(energies[1]-energies[0])<1e-9};
 }
 if(experiment==='manybody'){
  const states={singlet:[0,1/Math.sqrt(2),-1/Math.sqrt(2),0],triplet0:[0,1/Math.sqrt(2),1/Math.sqrt(2),0],'triplet+':[1,0,0,0],'triplet-':[0,0,0,1]},wavefunction=states[s.state],swapped=[wavefunction[0],wavefunction[2],wavefunction[1],wavefunction[3]],exchangeEigenvalue=dot(wavefunction,swapped);return {wavefunction,swapped,exchangeEigenvalue,energy:s.state==='singlet'?-.75*s.J:.25*s.J,levels:[{label:'S=0 singlet',energy:-.75*s.J,degeneracy:1},{label:'S=1 triplet',energy:.25*s.J,degeneracy:3}]};
 }
 if(experiment==='time-reversal'){
  const t=s.theta*Math.PI/180,p=s.phi*Math.PI/180,a=Math.cos(t/2),b=Math.sin(t/2),spinor=[[a,0],[Math.cos(p)*b,Math.sin(p)*b]],Tspinor=[[spinor[1][0],-spinor[1][1]],[-a,0]],T2spinor=spinor.map(z=>z.map(x=>-x)),Kspinor=spinor.map(z=>[z[0],-z[1]]),bloch=[Math.sin(t)*Math.cos(p),Math.sin(t)*Math.sin(p),Math.cos(t)];return {spinor,Tspinor,T2spinor,Kspinor,K2spinor:spinor,bloch,Tbloch:bloch.map(x=>-x),Kbloch:[bloch[0],-bloch[1],bloch[2]],fieldTrResidual:2*Math.abs(s.B)};
 }
 if(experiment==='double-soc'){const angle=s.angle*Math.PI/180,c=Math.cos(angle/2)/Math.sqrt(2),si=Math.sin(angle/2)/Math.sqrt(2);return {spinor:[[c,-si],[c,si]],bloch:[Math.cos(angle),Math.sin(angle),0],levels:[{j:.5,energy:-s.coupling,degeneracy:2},{j:1.5,energy:s.coupling/2,degeneracy:4}],weightedEnergySum:0};}
 throw new Error("Unknown mini-experiment");
}

function controls(t,s){
 if(t==='polyhedra')return select('polyhedron',"Ideal regular polyhedron",s.polyhedron,[['tetra',"Tetrahedron · T / T_d"],['cube',"Hexahedron (cube) · O / O_h"],['octa',"Octahedron · O / O_h"],['dodeca',"Dodecahedron · I / I_h"],['icosa',"Icosahedron · I / I_h"]])+select('order',"Test a rotation about the declared axis",s.order,[[2,"C₂ · x axis"],[3,"C₃ · (1,1,1) axis"],[4,"C₄ · z axis"],[5,"C₅ · (0,1,φ) axis"]])+range('fraction',"Fraction of the rotation completed",s.fraction,0,1,.01);
 if(t==='vibrations')return range('k0',"Common restoring stiffness k₀",s.k0,.2,3,.05)+range('k',"Equivalent coupling around the ring, k",s.k,0,1,.025)+range('delta',"Symmetry breaking δ",s.delta,-1,1,.025)+select('mode',"Mode space to display",s.mode,[['A1',"A₁ in-phase coordinate"],['E',"Combination within the E space"]])+range('mix',"E-partner mixing angle (°)",s.mix,0,360,1)+range('phase',"Schematic vibration phase (°)",s.phase,0,360,1)+"<button type=\"button\" data-action=\"animate\">Play / pause the mode</button>";
 if(t==='bands')return range('t',"Hopping t",s.t,0,2,.05)+range('alpha',"Rashba coupling α",s.alpha,0,1,.025)+range('B',"Zeeman parameter B",s.B,-1,1,.025)+range('kpi',"Current wave vector k / π",s.kpi,-1,1,.01);
 if(t==='manybody')return range('J',"Exchange parameter J",s.J,-2,2,.05)+select('state',"Two-spin state",s.state,[['singlet',"Singlet (↑↓−↓↑)/√2"],['triplet0',"Triplet m=0"],['triplet+',"Triplet ↑↑"],['triplet-',"Triplet ↓↓"]]);
 if(t==='time-reversal')return range('theta',"Bloch polar angle θ (°)",s.theta,0,180,1)+range('phi',"Relative phase φ (°)",s.phi,0,360,1)+select('operation',"Action to compare",s.operation,[['T','T = iσᵧK'],['T2','T²'],['K',"K (complex conjugation)"],['K2','K²']])+range('B',"External-field parameter B",s.B,-1,1,.05);
 return range('angle',"Spin rotation about z (°)",s.angle,0,720,2)+range('coupling',"SOC constant λ",s.coupling,-1,1,.025);
}
function project3(v,scale=82){const yaw=.61,tilt=.42;return [320+scale*(v[0]*Math.cos(yaw)-v[1]*Math.sin(yaw)),172-scale*(v[2]*Math.cos(tilt)+(v[0]*Math.sin(yaw)+v[1]*Math.cos(yaw))*Math.sin(tilt))];}
const complex=z=>`${fmt(z[0])}${z[1]>=0?'+':''}${fmt(z[1])}i`;

function scene(t,s){
 const r=miniDemoPreview(t,s);
 if(t==='polyhedra'){
  const scale=105/Math.max(...r.vertices.map(norm)),original=r.vertices.map(v=>project3(v,scale)),changed=r.transformed.map(v=>project3(v,scale));let body='';
  for(const [i,j] of r.edges)body+=line(...original[i],...original[j],'#b6c5d0',2)+line(...changed[i],...changed[j],r.coincident?'#267e77':'#b66a36',2.5);
  changed.forEach((p,i)=>{body+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${r.coincident?'#267e77':'#b66a36'}"/>`;if(r.vertices.length<10)body+=text(p[0]+12,p[1]-7,String(i+1),undefined,14);});
  body+=text(320,32,r.coincident?"The vertex sets coincide":"The vertex sets do not coincide")+text(320,318,"Gray: original shape. Green / orange: shape after the current rotation.",undefined,15);
  return {plot:svg("Coincidence check for rotated vertex sets of Platonic solids",body),html:`<h3>Proper rotation group ${groupMath(r.properGroup)}（${r.properOrder} operations); full point group ${groupMath(r.fullGroup)}（${r.fullOrder} operations)</h3><p>${r.vertices.length} vertices and ${r.edges.length} edges. The largest current vertex-set mismatch is ${fmt(r.maxMismatch)}; the rotation axis is (${r.axis.map(fmt).join(', ')})。</p><p>${r.crystallographic?"The point group of this polyhedron is an ordinary crystallographic point-group type.":`${groupMath('I')} / ${groupMath('Ih')} Contains fivefold axes and describes these solids or corresponding molecules; it is not an ordinary crystallographic point group of a three-dimensional periodic lattice.`}</p><p>Set the completed fraction to 1 to test the selected Cₙ operation. The dodecahedron and icosahedron are dual and have the same rotation group; the full point group additionally includes improper operations such as inversion or reflections.</p>`,exercise:exercise("Does the same fivefold axis also leave the cube's vertex set invariant? How do symmetry of shape and crystallographic allowance differ?",["Choose C₅ for the icosahedron, set the rotation fraction to 1, and check the set of 12 vertices.","Switch to the cube. The same operation no longer leaves the vertex set invariant; the cube has C₄ and C₃ axes.","Three-dimensional periodic lattices permit rotation orders 1,2,3,4,6. Regular polyhedra and nonperiodic molecules are not restricted to that catalogue."]),data:r};
 }
 if(t==='vibrations'){
  const base=[[160,230],[320,90],[480,230]];let body=line(...base[0],...base[1])+line(...base[1],...base[2])+line(...base[2],...base[0]);
  base.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="18" fill="#e5eef4" stroke="#557488"/>`+line(x,y,x,y-70*r.displacement[i],'#247da0',5)+text(x,y+46,`q${i+1}: ${fmt(r.displacement[i])}`,undefined,15);});
  const f=r.frequencies.map(x=>x===null?"Imaginary frequency (unstable)":fmt(x));body+=text(320,30,r.degenerateE?"E doublet: mixing does not change the eigenfrequency":"δ selects a direction and splits the E partners");
  return {plot:svg("Symmetry-adapted modes of three equivalent scalar oscillators",body),html:`<h3>Use the same E subspace to distinguish a basis change from actual symmetry breaking</h3><p>${math(String.raw`K=k_0I+kL_{K_3}+\delta uu^T`)}; for unit masses, ${math(String.raw`\omega_{A_1}^2=k_0`)}，${math(String.raw`\omega_u^2=k_0+3k+\delta`)}，${math(String.raw`\omega_v^2=k_0+3k`)}。</p>${table(["Mode",'A₁','u ∈ E','v ∈ E'],[["Frequency",...f]])}<p>The eigenvalue-equation residual for the current combination is ${fmt(r.eigenResidual)}：${r.isEigenvector?"It is a single-frequency normal coordinate.":"For δ≠0, this arbitrary mixture is not one normal mode; resolve it into two partners with different frequencies."}</p><p>Amplitude bars denote scalar coordinates without specifying displacement directions in a real molecule. This three-node spring model illustrates degeneracy; it does not solve arbitrary molecular spectra.</p>`,exercise:exercise("Why does changing the mixing angle at δ=0 not lift the degeneracy?",["u and v have the same eigenvalue k₀+3k. Any orthogonal mixture is still an eigenvector with that eigenvalue.","With δ≠0, the squared frequencies of u and v become k₀+3k+δ and k₀+3k. This is an actual splitting in the model.","A negative squared frequency means the harmonic reference structure is unstable. Taking its square root does not give a stable vibrational frequency."]),data:r};
 }
 if(t==='bands'){
  const es=r.curves.flatMap(x=>x.energies),lo=Math.min(...es)-.2,hi=Math.max(...es)+.2,X=k=>70+(k+Math.PI)/(2*Math.PI)*500,Y=e=>285-(e-lo)/(hi-lo)*230;let body=line(70,285,590,285)+line(70,285,70,45);
  for(let band=0;band<2;band++)body+=`<path d="${r.curves.map((q,i)=>`${i?'L':'M'}${X(q.k)},${Y(q.energies[band])}`).join(' ')}" fill="none" stroke="${band?'#b96639':'#287b9d'}" stroke-width="3"/>`;
  body+=line(X(r.k),45,X(r.k),285,'#b7bfc5',1);r.energies.forEach((e,i)=>body+=`<circle cx="${X(r.k)}" cy="${Y(e)}" r="6" fill="${i?'#b96639':'#287b9d'}"/>`);body+=text(70,315,'−π')+text(320,315,'0')+text(570,315,'π')+text(320,28,"Two Rashba branches: degeneracy at the same k needs a separate check");
  return {plot:svg("Bands and TRIM degeneracy of a one-dimensional Rashba model",body),html:`<h3>${Math.abs(s.B)<1e-12?"B=0: time reversal preserved":"B≠0: field breaks time reversal"}</h3><p>${math(String.raw`H(k)=-2t\cos k\,I+2\alpha\sin k\,\sigma_y+B\sigma_z`)}，${math(String.raw`E_\pm=-2t\cos k\pm\sqrt{(2\alpha\sin k)^2+B^2}`)}。</p><p>Branch gaps at k=0 and π are both 2|B|=${fmt(2*Math.abs(s.B))}. Current k/π=${fmt(s.kpi)}, with energies (${r.energies.map(fmt).join(', ')})；${r.sameKDegenerate?"Degenerate at the current k.":"Spin-split at the current k."}</p><p>At zero field, Kramers partners occur at k and −k. Degeneracy at the same k is enforced only at a TRIM, where these momenta are equivalent modulo a reciprocal vector. This model can have E(k)=E(−k) even for B≠0, so an even energy dispersion alone does not establish time-reversal symmetry.</p>`,exercise:exercise("For B=0 and α≠0, why can the bands split at k=π/2 but not at k=0?",["The spin term is 2α sin(k)σᵧ. It is nonzero at k=π/2, so the two energies at the same k can differ.","At k=0,π, −k and k are equivalent modulo a reciprocal vector. At zero field, T²=−1 for half-integer spin enforces Kramers degeneracy.","Bσz changes sign under time reversal. With B≠0, the TRIM gap is 2|B|. This demonstration does not automatically identify a nontrivial topology."]),data:r};
 }
 if(t==='manybody'){
  let body=text(180,34,"Initial-state coefficients")+text(470,34,"After the P₁₂ exchange");const labels=['↑↑','↑↓','↓↑','↓↓'];labels.forEach((l,i)=>{const y=85+i*63;body+=text(66,y,l)+text(180,y,fmt(r.wavefunction[i]))+line(270,y-5,365,y-5,'#95a8b5',1)+text(470,y,fmt(r.swapped[i]));});
  return {plot:svg("Comparison of two-spin coefficients under exchange",body),html:`<h3>Exchange eigenvalue ${fmt(r.exchangeEigenvalue)}; current energy ${fmt(r.energy)}</h3><p>${math(String.raw`H=J\,\mathbf S_1\cdot\mathbf S_2`)}，${math(String.raw`P_{12}=2\mathbf S_1\cdot\mathbf S_2+\tfrac12I`)}, using ${math(String.raw`\hbar=1`)}。</p>${table(["Total spin","Energy","Degeneracy","Spin exchange"],[["Singlet S=0",fmt(-.75*s.J),1,'−1'],["Triplet S=1",fmt(.25*s.J),3,'+1']])}<p>For J&gt;0 the singlet lies lower; for J&lt;0 the triplet lies lower. The electron's full wave function also includes the spatial part and must be antisymmetric. A positive spin-exchange eigenvalue does not forbid the triplet. Only a finite two-spin model is solved here.</p>`,exercise:exercise("Does exchange symmetry change when J changes from positive to negative?",["The exchange eigenvalue follows from the symmetric or antisymmetric state combination: −1 for the singlet and +1 for the triplet.","Changing J reorders the energies of H: −3J/4 and J/4 exchange their order.","With the state definitions held fixed, exchange symmetry does not change with energy ordering."]),data:r};
 }
 if(t==='time-reversal'){
  const transformed=({T:r.Tbloch,T2:r.bloch,K:r.Kbloch,K2:r.bloch})[s.operation],spinor=({T:r.Tspinor,T2:r.T2spinor,K:r.Kspinor,K2:r.K2spinor})[s.operation];let body=`<circle cx="320" cy="170" r="112" fill="#f4f8fa" stroke="#aebec9"/>`+line(190,170,450,170,'#b5c2cc',1)+line(320,40,320,300,'#b5c2cc',1);
  for(const [v,col] of [[r.bloch,'#267a9e'],[transformed,'#b7673d']]){const p=project3(v,105);body+=line(320,172,...p,col,4)+`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${col}"/>`;}body+=text(320,30,"Blue: initial Bloch vector. Orange: after the selected action.",undefined,15)+text(320,320,"The Bloch vector alone cannot distinguish an overall sign",undefined,15);
  return {plot:svg("Comparing antiunitary time reversal with complex conjugation",body),html:`<h3>${esc(s.operation)}: first complex-conjugate, then apply the defined operation</h3><p>${math(String.raw`T=i\sigma_yK`)}，${math(String.raw`T(a,b)^T=(b^*,-a^*)^T`)}；${math(String.raw`T^2=-I`)}, whereas ${math(String.raw`K^2=+I`)}。</p>${table(["Coefficients","Initial state","After the action"],[['a',complex(r.spinor[0]),complex(spinor[0])],['b',complex(r.spinor[1]),complex(spinor[1])]])}<p>T reverses the Bloch vector; T² restores that vector but reverses the overall spinor sign. K provides a spinless comparison in the current real basis. The time-reversal difference of the field term Bσz is 2|B|=${fmt(r.fieldTrResidual)}，${Math.abs(s.B)<1e-12?"At zero field, this term preserves time reversal.":"The nonzero field breaks the present time-reversal symmetry."}</p>`,exercise:exercise("If the Bloch vector is restored after T², why can the spinor still differ?",["The Bloch vector is bilinear in ψ. The states ψ and −ψ give the same vector.","T is antiunitary, so its second application also complex-conjugates. Direct calculation gives T²ψ=−ψ, while K²ψ=ψ.","An isolated state's global phase is not directly observable. Comparing rotation phases requires a coherent reference; a restored arrow does not establish equality of the full spinors."]),data:r};
 }
 let body=`<circle cx="170" cy="165" r="88" fill="#f4f8fa" stroke="#aebec9"/>`+line(170,165,170+88*r.bloch[0],165-88*r.bloch[1],'#267a9e',4)+text(170,286,`${fmt(s.angle)}° spin rotation`);const energies=r.levels.map(x=>x.energy),span=Math.max(.5,...energies.map(Math.abs)),Y=e=>170-e/span*95;body+=line(365,Y(energies[0]),570,Y(energies[0]),'#287b9d',4)+line(365,Y(energies[1]),570,Y(energies[1]),'#b96639',4)+text(470,Y(energies[0])-12,"j=1/2 · doublet",undefined,15)+text(470,Y(energies[1])+28,"j=3/2 · quartet",undefined,15)+text(470,35,"SOC for l=1 and s=1/2");
 return {plot:svg("Spin double covering and atomic spin-orbit energy levels",body),html:`<h3>2π reverses the spinor sign; 4π restores the spinor</h3><p>${math(String.raw`U_z(\theta)=\exp(-i\theta\sigma_z/2)`)}，${math(String.raw`U_z(2\pi)=-I`)}，${math(String.raw`U_z(4\pi)=I`)}. The current spinor is (${r.spinor.map(complex).join(', ')})。</p><p>Also take ${math(String.raw`H_{\rm SOC}=\lambda\mathbf L\cdot\mathbf S`)}，l=1、s=1/2，${math(String.raw`E_j=\tfrac\lambda2[j(j+1)-l(l+1)-s(s+1)]`)}. The j=1/2 doublet therefore has energy −λ, and the j=3/2 quartet has energy λ/2.</p><p>This zero-field atomic model preserves time reversal. Each half-integer j forms at least Kramers pairs; the j=3/2 quartet also relies on full rotational symmetry. A crystal field can split it into two pairs, but cannot split a single Kramers pair while time reversal is preserved.</p>`,exercise:exercise("Does reversing λ change the degeneracies? Does an arrow returning after 2π imply that the spinor has returned too?",["The SOC energies are −λ and λ/2. Reversing λ reorders these levels while their dimensions remain 2 and 4.","The Bloch vector is bilinear in the spinor and returns after 2π, but the spinor acquires an overall minus sign.","After 4π the spinor also returns. A physical comparison of overall phase requires a coherent reference."]),data:r};
}

export function miniDemoScene(experiment,params={}){return scene(experiment,{...defaults[experiment],...params});}

function rashbaLessonInput(fraction,B,direction=1){
 return {experiment:'bands',t:defaults.bands.t,alpha:defaults.bands.alpha,B,kpi:direction*2*fraction};
}

function rashbaPairEvidence(positive,negative){
 // iσ_y H* (iσ_y)† exchanges the diagonal entries and negates
 // the exchanged off-diagonal entries after complex conjugation.
 const {real,imag}=positive.hamiltonian;
 const target=negative.hamiltonian;
 const residual=Math.max(...real.flatMap((row,i)=>row.map((_,j)=>{
  const sign=i===j?1:-1;
  const re=sign*real[1-i][1-j]-target.real[i][j];
  const im=-sign*imag[1-i][1-j]-target.imag[i][j];
  return Math.hypot(re,im);
 })));
 const spectrum=Math.max(...positive.energies.map((energy,i)=>Math.abs(energy-negative.energies[i])));
 return {spectrum,gap:positive.energies[1]-positive.energies[0],residual,
  spin:[positive.spinUpper?.[2]??null,negative.spinUpper?.[2]??null]};
}

function rashbaLessonRows(fraction){
 return rashbaFields.map(B=>{
  const positive=miniDemoPreview('bands',rashbaLessonInput(fraction,B));
  const negative=miniDemoPreview('bands',rashbaLessonInput(fraction,B,-1));
  return {B,...rashbaPairEvidence(positive,negative)};
 });
}

function rashbaTrimHTML(){
 const {t,alpha}=defaults.bands;
 return `<section id="smd-rashba-trim" class="smd-exercise" aria-labelledby="smd-rashba-title">
  <h3 id="smd-rashba-title">When the dispersion is even, how can we test time reversal?</h3>
  <p>Keep the three reciprocal fractional coordinates from the Kramers lesson. In this one-dimensional Rashba model, set ${math(String.raw`a=1,\ t=${t},\ \alpha=${alpha}`)}, so ${math('k/\\pi=2\\kappa')}. Compare zero and finite fields at the same values of the other model parameters.</p>
  <div class="controls-row">
   <label for="smd-rashba-k">Reciprocal fractional coordinate κ</label>
   <select class="form-select" id="smd-rashba-k">${lessonFractions.map(k=>`<option value="${k}">${k}</option>`).join('')}</select>
   <label for="smd-rashba-guess">How can you tell whether the model has time-reversal symmetry?</label>
   <select class="form-select" id="smd-rashba-guess" aria-describedby="smd-rashba-feedback">
    <option value="">Choose an answer</option>
    <option value="even-proves">Matching energies at opposite wavevectors establish time-reversal symmetry</option>
    <option value="split-breaks">Different energies at the same wavevector establish broken time reversal</option>
    <option value="matrix-test">Compare the time-reversed matrix with the matrix at the opposite wavevector</option>
   </select>
   <button id="smd-rashba-check" type="button" class="secondary" aria-controls="smd-rashba-result">Check the matrices and energies</button>
  </div>
  <p id="smd-rashba-feedback" role="status"></p>
  <div id="smd-rashba-result" hidden>
   <div id="smd-rashba-evidence"></div>
   <button id="smd-rashba-python" type="button" class="secondary">Verify this comparison with Python</button>
   <p id="smd-rashba-python-status" role="status"></p>
  </div>
  <a href="#classroom/spin?tab=learn&amp;lesson=double-04&amp;track=double">Review the three conditions for Kramers pairing →</a>
 </section>`;
}

function rashbaEvidenceHTML(fraction,rows){
 const trim=fraction===0||fraction===.5;
 const heads=["Field B","Energy difference at opposite wavevectors","Gap at the same wavevector","Largest matrix entry residual","Upper branch spin z at opposite wavevectors"];
 return `<p>${math('k/\\pi='+2*fraction)}。${trim?"The two wavevectors differ by a reciprocal-lattice vector and share a momentum subspace.":"The opposite wavevectors belong to distinct momentum subspaces. At zero field they are paired with each other."}</p>
  <div class="smd-scroll" tabindex="0" role="region" aria-label="Time-reversal comparison results"><table><thead><tr>${heads.map(head=>`<th scope="col">${head}</th>`).join('')}</tr></thead>
   <tbody>${rows.map(row=>`<tr data-rashba-field="${row.B}"><th scope="row">${row.B.toFixed(2)}</th>
    <td data-rashba-spectrum>${fmt(row.spectrum)}</td><td data-rashba-gap>${fmt(row.gap)}</td>
    <td data-rashba-residual>${fmt(row.residual)}</td>
    <td>${row.spin.some(x=>x===null)?'—':row.spin.map(fmt).join(', ')}</td></tr>`).join('')}</tbody>
  </table></div>
  <p>At both fields, the two sorted energies agree at opposite wavevectors. Comparing matrix entries gives ${math('\\Theta H(k)\\Theta^{-1}-H(-k)=-2B\\sigma_z')}。</p>
  <p>At a degeneracy, the choice of eigenvectors is arbitrary within the degenerate space, so the table omits the upper branch spin component.</p>`;
}

function bindRashbaTrim(root,state,{run,isCurrent}){
 const k=root.querySelector('#smd-rashba-k'),guess=root.querySelector('#smd-rashba-guess');
 const check=root.querySelector('#smd-rashba-check'),feedback=root.querySelector('#smd-rashba-feedback');
 const result=root.querySelector('#smd-rashba-result'),evidence=root.querySelector('#smd-rashba-evidence');
 const python=root.querySelector('#smd-rashba-python'),status=root.querySelector('#smd-rashba-python-status');
 let retired=false,revision=0,request=null;
 const here=()=>!retired&&isCurrent()&&root.querySelector('#smd-rashba-k')===k;
 function clearRequest(){
  revision++;request?.cancel?.();request=null;
  if(state.verification==='running')state.verification='';
 }
 function showPython(){
  python.hidden=!run;
  python.disabled=state.verification==='running';
  status.textContent=({
   running:"Checking both wavevector signs and both fields…",
   passed:"Python agrees. The spectrum remains even at both fields, and the time-reversal matrix condition holds at zero field only.",
   mismatch:"The Python calculation differs from the preview. Check the comparison again.",
   failed:"The Python check did not finish. You can try again."
  })[state.verification]||'';
 }
 function show(){
  result.hidden=state.checked!=='matrix-test';
  feedback.textContent=({
   'matrix-test':"Correct. Matching energies establish a relation between spectra. To test time reversal, compare how the Hamiltonian transforms.",
   'even-proves':"Matching energies compare only the eigenvalues. Compare the two matrices entry by entry.",
   'split-breaks':"Check whether the opposite wavevectors share a momentum subspace before interpreting the gap at a single wavevector.",
   empty:"Choose a test first."
  })[state.checked]||'';
  if(!result.hidden)evidence.innerHTML=rashbaEvidenceHTML(state.fraction,rashbaLessonRows(state.fraction));
  showPython();
 }
 k.value=String(state.fraction);guess.value=state.guess;
 function change(){
  if(!here())return;
  clearRequest();
  state.fraction=Number(k.value);state.guess=guess.value;state.checked='';state.verification='';
  show();
 }
 k.onchange=guess.onchange=change;
 check.onclick=()=>{if(here()){state.checked=guess.value||'empty';show();}};
 python.onclick=async()=>{
  if(!here()||!run||result.hidden||state.verification==='running')return;
  const stamp=++revision,fraction=state.fraction;
  const expected=rashbaLessonRows(fraction);
  state.verification='running';showPython();
  try{
   const reports=[];
   for(const B of rashbaFields){
    const pair=[];
    for(const direction of [1,-1]){
     const input=rashbaLessonInput(fraction,B,direction);
     request=run('symmetry_mini_demos',input);
     const data=await request;
     if(!here()||stamp!==revision)return;
     request=null;
     if(data?.experiment!=='bands'||data.B!==B||!Number.isFinite(data.kpi)||
      Math.abs(data.kpi-input.kpi)>1e-12||data.checks?.passed!==true)throw new Error('Unexpected Rashba result');
     pair.push(data);
    }
    reports.push(rashbaPairEvidence(pair[0],pair[1]));
   }
   const close=(a,b)=>a===null||b===null?a===b:Math.abs(a-b)<1e-9;
   const matches=reports.every((row,i)=>['spectrum','gap','residual'].every(key=>close(row[key],expected[i][key]))&&
    row.spin.every((component,j)=>close(component,expected[i].spin[j])));
   state.verification=matches?'passed':'mismatch';
  }catch{
   if(!here()||stamp!==revision)return;
   request=null;state.verification='failed';
  }
  showPython();
 };
 show();
 return ()=>{retired=true;clearRequest();};
}

export async function renderSymmetryMiniDemosView({container,selection={},run,onNavigate=()=>{}}){
 let theme=miniDemoThemes.some(x=>x.id===selection.experiment)?selection.experiment:'polyhedra',state={...defaults[theme]},pythonResult=null,status='',busy=false,timer=null,revision=0;
 let routePreset=selection.preset,disposed=false,disposeRashba=()=>{};
 const rashbaState={fraction:.2,guess:'',checked:'',verification:''};
 const rashbaOpen=()=>theme==='bands'&&routePreset===rashbaTrimPreset;
 container.innerHTML='<article class="smd-course"></article>';const root=container.firstElementChild,current=()=>!disposed&&container.isConnected!==false&&container.firstElementChild===root,payload=()=>({experiment:theme,...state});
 function update(){const out=scene(theme,state);root.querySelector('.smd-preview').innerHTML=out.plot+out.html;root.querySelector('.smd-questions').innerHTML=out.exercise;root.querySelectorAll('[data-output]').forEach(el=>el.textContent=state[el.dataset.output]);latest={tool:'symmetry_mini_demos_preview',input:payload(),result:{...out.data,computation:'deterministic JavaScript teaching preview'}};}
 function draw(){
  disposeRashba();disposeRashba=()=>{};
  root.innerHTML=`<header class="smd-hero"><span>Advanced concept mini-experiments</span><h2>From Platonic solids to spin and bands</h2><p>Vary parameters, check the symmetry operation, then use a counterexample to test the conditions of a conclusion.</p></header><nav class="smd-tabs" aria-label="Advanced concept topics">${miniDemoThemes.map(x=>`<button type="button" data-theme="${x.id}" aria-pressed="${theme===x.id}">${x.title}</button>`).join('')}</nav>
  ${rashbaOpen()?rashbaTrimHTML():''}
  <div class="smd-workspace"><aside class="smd-controls"><h3>Parameters and predictions</h3>${controls(theme,state)}<button type="button" class="primary" data-action="python" ${busy||!run?'disabled':''}>${busy?"Checking with Python…":"Check with browser Python"}</button><p class="smd-status" role="status">${esc(status||"SVG figures and values update immediately as parameters change.")}</p></aside><section class="smd-preview" aria-live="polite"></section></div><div class="smd-questions"></div><details class="smd-python"><summary>Python check data</summary><pre>${pythonResult?esc(JSON.stringify(pythonResult,null,2)):"Results appear after you click the check button."}</pre></details><footer><a href="#classroom/foundations?module=demos">Water, characters, and projection demonstrations</a> · <a href="#classroom/spin?module=orbitals">Crystal fields and orbitals</a> · <a href="docs/foundations-demos.md">Teaching conventions and sources</a></footer>`;
  update();
  if(rashbaOpen())disposeRashba=bindRashbaTrim(root,rashbaState,{run,isCurrent:current});
 }
 function changed(e){const id=e.target.dataset.param;if(!id||!current())return;revision++;state[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;pythonResult=null;status="Parameters changed. Check again using the current input.";update();root.querySelector('.smd-status').textContent=status;}
 root.addEventListener('input',e=>{if(e.target.tagName!=='SELECT')changed(e);});root.addEventListener('change',changed);
 root.addEventListener('click',async e=>{
  if(!current())return;
  const tab=e.target.closest('[data-theme]');
  if(tab){
   if(timer){clearInterval(timer);timer=null;}
   revision++;theme=tab.dataset.theme;state={...defaults[theme]};status='';pythonResult=null;
   const patch=routePreset===undefined?{experiment:theme}:{experiment:theme,preset:undefined};
   routePreset=undefined;onNavigate(patch);draw();return;
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='animate'){if(timer){clearInterval(timer);timer=null;}else timer=setInterval(()=>{if(!current()){clearInterval(timer);timer=null;return;}revision++;state.phase=(state.phase+6)%360;const el=root.querySelector('[data-param="phase"]');if(el)el.value=state.phase;update();},70);}
  if(action==='python'&&run&&!busy){
   if(timer){clearInterval(timer);timer=null;}
   const requestedRevision=revision;busy=true;status="Checking the current finite model…";draw();
   try{const input=payload(),result=await run('symmetry_mini_demos',input);if(!current()||requestedRevision!==revision)return;pythonResult=result;status=result?.checks?.passed===false?"Model checks failed. Inspect the input and returned data.":"Python check complete.";draw();latest={tool:'symmetry_mini_demos',input,result};}
   catch(error){if(current()&&requestedRevision===revision){status="Python check did not complete:"+error.message;draw();}}
   finally{busy=false;if(current()){const b=root.querySelector('[data-action="python"]');b.disabled=false;b.textContent="Check with browser Python";}}
  }
 });
 draw();
 return ()=>{disposed=true;if(timer)clearInterval(timer);disposeRashba();};
}
