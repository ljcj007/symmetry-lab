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
const defaults={polyhedra:{polyhedron:'tetra',order:3,fraction:1},vibrations:{k0:1,k:.5,delta:0,mix:0,phase:45,mode:'E',detector:'local'},bands:{t:1,alpha:.4,B:0,kpi:.35},manybody:{J:1,state:'singlet'},'time-reversal':{theta:65,phi:35,B:0,operation:'T'},'double-soc':{angle:360,coupling:.6}};
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
  const frequencies=eigenvalues.map(x=>x>=0?Math.sqrt(x):null),time=s.phase*Math.PI/180,coefficients=s.mode==='A1'?[1,0,0]:[0,Math.cos(angle),Math.sin(angle)],basis=[a,u,v],displacement=a.map((_,i)=>basis.reduce((sum,b,j)=>sum+(frequencies[j]===null?0:coefficients[j]*b[i]*Math.sin(frequencies[j]*time)),0)),detector=({common:a,contrast:u,local:[0,1,0]})[s.detector]||[0,1,0],intensities=basis.map(b=>dot(detector,b)**2),spectrum=[];
  frequencies.forEach((frequency,i)=>{if(frequency===null)return;const prior=spectrum.find(p=>Math.abs(p.frequency-frequency)<1e-9);if(prior){prior.intensity+=intensities[i];prior.modes.push(['A1','u','v'][i]);}else spectrum.push({frequency,intensity:intensities[i],modes:[['A1','u','v'][i]]});});
  return {stiffness,basis:{A1:a,u,v},modeVector,displacement,eigenvalues,frequencies,eigenResidual,isEigenvector:eigenResidual<1e-9,degenerateE:Math.abs(s.delta)<1e-12,stable:Math.min(...eigenvalues)>0,time,coefficients,detector,intensities,spectrum};
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
 if(t==='vibrations')return range('k0',"Common restoring stiffness k₀",s.k0,.2,3,.05)+range('k',"Equivalent coupling around the ring, k",s.k,0,1,.025)+range('delta',"Symmetry breaking δ",s.delta,-1,1,.025)+select('mode',"Initial mode combination",s.mode,[['A1',"A₁ in-phase coordinate"],['E',"Combination within the E space"]])+range('mix',"E-partner mixing angle (°)",s.mix,0,360,1)+range('phase',"Model time × 180/π",s.phase,0,360,1)+select('detector',"Linear detection channel d·q",s.detector,[['local',"Local channel: q₂"],['common',"In-phase channel: (q₁+q₂+q₃)/√3"],['contrast',"Contrast channel: (2q₁−q₂−q₃)/√6"]])+"<button type=\"button\" data-action=\"animate\">Play / pause motion</button>";
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
  const base=[[70,200],[160,100],[250,200]],basis=[r.basis.A1,r.basis.u,r.basis.v],labels=['A₁','u','v'];let body=text(160,28,"Three equivalent scalar coordinates",undefined,16);
  body+=line(...base[0],...base[1])+line(...base[1],...base[2])+line(...base[2],...base[0]);
  base.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="16" fill="#e5eef4" stroke="#557488"/>`+line(x,y,x,y-55*r.displacement[i],'#247da0',4)+text(x,y+42,`q${i+1}=${fmt(r.displacement[i])}`,undefined,13);});
  const maxFrequency=Math.max(1,...r.frequencies.filter(x=>x!==null))+.3,X=f=>360+220*f/maxFrequency;
  body+=text(470,28,"Ideal stick spectrum for the linear detector",undefined,16)+line(350,267,602,267,'#738c9d')+text(490,315,"ω / √(stiffness unit / mass unit)",undefined,12)+text(365,293,'0',undefined,13);
  r.spectrum.forEach((p,i)=>{const x=X(p.frequency),h=150*p.intensity;body+=line(x,267,x,267-h,['#357d9a','#b76e39','#75559a'][i%3],5)+text(x,250-h,fmt(p.intensity),undefined,13)+text(x,287,fmt(p.frequency),undefined,12);});
  body+=text(160,315,`t=${fmt(r.time)}; blue segments in the left panel show scalar coordinates only`,undefined,12);
  const f=r.frequencies.map(x=>x===null?"ω²<0: harmonic instability":fmt(x)),matrix=r.stiffness.map(row=>row.map(fmt).join('  ')).join('\n');
  return {plot:svg("Actual time evolution of three scalar oscillators and a schematic direction-dependent detection spectrum",body),html:`<h3>Find orthogonal eigenmodes, then distinguish basis changes, splitting and spectral intensity</h3>
  <section class="smd-step"><h4>1 · Define the model and its three eigenvectors</h4><p>Each of the three nodes has one equal-mass <strong>scalar</strong>  qᵢ. The vertical lines show coordinate values, not displacement directions in a real molecule. The model mass is m=1, and ${math(String.raw`K=k_0I+kL_{K_3}+\delta uu^T`)}, where L has diagonal entries 2 and off-diagonal entries −1.</p><pre class="smd-matrix" aria-label="Stiffness matrix">${matrix}</pre>${table(["Basis vector","Three components",'ω²','ω'],basis.map((b,i)=>[labels[i],b.map(fmt).join(', '),fmt(r.eigenvalues[i]),f[i]]))}<p>a=(1,1,1)/√3, u=(2,−1,−1)/√6 and v=(0,1,−1)/√2 are unit vectors with pairwise zero inner products. Direct multiplication by K gives Ka=k₀a, Ku=(k₀+3k+δ)u and Kv=(k₀+3k)v.</p></section>
  <section class="smd-step"><h4>2 · Change the basis within a degeneracy; use two frequencies after splitting</h4><p>At δ=0, u and v have the same frequency, and any  ${math(String.raw`w=\cos\beta\,u+\sin\beta\,v`)}  remains a normal mode. Its orthogonal partner is −sinβ u+cosβ v. Changing β only selects another direction within the same E plane; it does not lift the degeneracy.</p><p>At δ≠0, u and v have different eigenfrequencies.${r.isEigenvector?"The current choice is a single-frequency normal coordinate.":"The current mixture is not a single-frequency normal mode. Its components evolve separately at ωu and ωv, so the direction of motion changes with time."} ${!r.stable?"At least one direction has ω²≤0: the reference structure is not a stable harmonic minimum. Sinusoidal animation is paused along directions with negative squared frequency, and these directions are not shown as real-frequency spectral peaks.":''}</p><p>${math(String.raw`q(t)=c_a a\sin(\omega_a t)+c_u u\sin(\omega_u t)+c_v v\sin(\omega_v t)`)}. The current (ca,cu,cv)=(${r.coefficients.map(fmt).join(', ')} ). The time slider changes the motion; the mixing angle changes the prepared mode combination.</p></section>
  <section class="smd-step"><h4>3 · Detection direction can change peak intensities while frequencies stay fixed</h4><p>Assume an external linear observable S=d·q with a normalized detection vector d=(${r.detector.map(fmt).join(', ')}). The ideal mode weight is  ${math(String.raw`I_j=|d^T e_j|^2`)}; this is an explicitly defined schematic coupling. The vector d is not presented as an actual dipole-moment or polarizability derivative.</p>${table(["Mode",'A₁','u','v'],[["Channel weight",...r.intensities.map(fmt)]])}<p>Peaks at the same frequency are merged and their weights added. Thus, at δ=0, changing the orthonormal basis of E does not change the total weight at that frequency. The local q₂ channel detects both E partners, while the in-phase channel couples only to A₁. Changing the detection channel leaves K and the frequencies unchanged.</p><p>The stick spectrum assumes the same independent preparation of each mode and neglects linewidth, temperature and damping. Actual material IR / Raman intensities also require dipole-moment / polarizability derivatives. This page invents no frequencies or units for a real material.</p></section>`,exercise:exercise("At δ=0 and a mixing angle of 45°, why is there still only one E frequency in the spectrum? How should the animation change when δ changes?",["Degeneracy means that u and v have equal squared frequencies, so any orthogonal mixture remains single-frequency.","At δ≠0, u and v have different frequencies. A general mixture must evolve at both frequencies separately; imposing one common sinusoidal phase on both is incorrect.","The local q₂ channel can detect two separate E peaks. In the in-phase channel both have zero weight, but the modes still exist."]),data:r};
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

function bindRashbaTrim(root,state,{isCurrent}){
 const k=root.querySelector('#smd-rashba-k'),guess=root.querySelector('#smd-rashba-guess'),feedback=root.querySelector('#smd-rashba-feedback'),result=root.querySelector('#smd-rashba-result'),evidence=root.querySelector('#smd-rashba-evidence');
 let retired=false;
 const here=()=>!retired&&isCurrent()&&root.querySelector('#smd-rashba-k')===k;
 function show(){result.hidden=state.checked!=='matrix-test';feedback.textContent=({'matrix-test':"Correct. Matching energies establish a relation between spectra. To test time reversal, compare how the Hamiltonian transforms.",'even-proves':"Matching energies compare only the eigenvalues. Compare the two matrices entry by entry.",'split-breaks':"Check whether the opposite wavevectors share a momentum subspace before interpreting the gap at a single wavevector.",empty:"Choose a test first."})[state.checked]||'';if(!result.hidden)evidence.innerHTML=rashbaEvidenceHTML(state.fraction,rashbaLessonRows(state.fraction));}
 k.value=String(state.fraction);guess.value=state.guess;
 k.onchange=guess.onchange=()=>{if(here()){state.fraction=Number(k.value);state.guess=guess.value;state.checked='';show();}};
 root.querySelector('#smd-rashba-check').onclick=()=>{if(here()){state.checked=guess.value||'empty';show();}};
 show();return ()=>{retired=true;};
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
  <div class="smd-workspace"><aside class="smd-controls"><h3>Parameters and predictions</h3>${controls(theme,state)}<p class="smd-status" role="status">${esc(status||"SVG figures and values update immediately as parameters change.")}</p></aside><section class="smd-preview" aria-live="polite"></section></div><div class="smd-questions"></div><footer><a href="#classroom/foundations?module=demos">Water, characters, and projection demonstrations</a> · <a href="#classroom/spin?module=orbitals">Crystal fields and orbitals</a> · <a href="docs/foundations-demos.md">Teaching conventions and sources</a></footer>`;
  update();
  if(rashbaOpen())disposeRashba=bindRashbaTrim(root,rashbaState,{run,isCurrent:current});
 }
 function changed(e){const id=e.target.dataset.param;if(!id||!current())return;revision++;state[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;pythonResult=null;status="Parameters changed; the plot and derivation have updated together.";update();root.querySelector('.smd-status').textContent=status;}
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
 });
 draw();
 return ()=>{disposed=true;if(timer)clearInterval(timer);disposeRashba();};
}
