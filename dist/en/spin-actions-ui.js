import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createSpinColorViewer} from './spincolor-viewer.js?v=20261110-en1';

// This panel displays actual spin_actions Python replies. JavaScript does not
// construct rotations, apply antiunitary operators, or classify stabilizers.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const owners=new WeakMap();
export const SPIN_ACTION_LESSONS=Object.freeze({'color-03':'color_theta','spin-03':'spin_stabilizer','spin-04':'soc_locking'});
const kinds=new Set(Object.values(SPIN_ACTION_LESSONS));
const label={color_theta:"Color exchange and time reversal: different operators behind a similar diagram",spin_stabilizer:"Fixing every moment: from rank to the spin-only stabilizer",soc_locking:"Site matching and SOC locking: test the two rules separately"};
const states=[['plus',"Equal real superposition"],['circular',"Equal superposition with relative phase i"],['up',"Spin-up basis vector"],['generic',"General complex-amplitude reference"],['custom',"Custom two-component complex state"]];
const moments=[['triangular',"Three coplanar moments at 120 degrees"],['collinear',"Collinear moments"],['zero',"All moments zero"],['noncoplanar',"Moments spanning three dimensions"],['custom',"Custom ordered moments"]];
const operations=[['identity',"Identity"],['rotation_z',"Proper rotation about z"],['plane_xy',"Improper operation fixing the xy plane"],['plane_xz',"Improper operation fixing the xz plane"],['time_reversal',"Reverse every moment"],['custom',"Custom orthogonal matrix"]];
const models=[['c2_point',"Point model: spatial C2z and independent spin C2x"],['af_space',"Three-dimensional periodic collinear antiferromagnet"],['triangular_point',"Point model: triangular 120-degree spins"],['helix3_space',"Three-dimensional periodic three-layer spin helix"],['custom',"Custom ordered structure and operation"]];
const defaults=experiment=>({experiment,statePreset:'plus',state:'[[1,0],[0,1]]',scalar:'[0,1]',operatorPhase:'[1,0]',momentPreset:'triangular',moments:'[[1,0,0],[0,1,0]]',positions:'',operationPreset:'plane_xy',angle:'90',operation:'[[1,0,0],[0,1,0],[0,0,-1]]',modelPreset:'c2_point',sites:'[{"id":"A","species":"X","position":[1,0,0],"moment":[0,0,1]},{"id":"B","species":"X","position":[-1,0,0],"moment":[0,0,-1]}]',periodic:false,rotation:'[[-1,0,0],[0,-1,0],[0,0,1]]',translation:'[0,0,0]',spinMatrix:'[[1,0,0],[0,-1,0],[0,0,-1]]'});
const select=(id,text,rows,value)=>`<label for="${id}">${esc(text)}<select id="${id}">${rows.map(([key,title])=>`<option value="${esc(key)}"${String(key)===String(value)?' selected':''}>${esc(title)}</option>`).join('')}</select></label>`;
const area=(id,text,value,rows=2)=>`<label for="${id}">${esc(text)}<textarea id="${id}" rows="${rows}" spellcheck="false">${esc(value)}</textarea></label>`;
const formula=text=>`<div class="sax-formula" tabindex="0">${mathHTML(text,true)}</div>`;
const scalarTex=x=>String(x).replace(/sqrt\(([^()]*)\)/g,'\\sqrt{$1}').replace(/\*\*/g,'^').replace(/\^\(([^()]*)\)/g,'^{$1}').replace(/\*/g,'\\,').replace(/\bI\b/g,'i');
function matrix(pack,text=''){
 if(!pack?.exact?.length||pack.shape?.[1]===0)return "<p>This basis has no columns.</p>";
 const tex='\\begin{bmatrix}'+pack.exact.map(row=>row.map(scalarTex).join('&')).join('\\\\')+'\\end{bmatrix}';
 return `<div class="sax-matrix" tabindex="0"${text?` aria-label="${esc(text)}"`:''}>${mathHTML(tex,true)}</div>`;
}
const vector=(pack,text='')=>matrix({exact:(pack?.exact||[]).map(x=>[x]),shape:[pack?.dimension||0,1]},text);
const scalar=x=>esc(x?.exact??x??'—');
const fact=(title,value)=>`<div><span>${esc(title)}</span><strong>${esc(value)}</strong></div>`;
const pass=x=>x?"yes":"no";
const table=(caption,heads,rows)=>`<div class="sax-scroll" tabindex="0"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
const shownVector=pack=>pack?`<span class="sax-exact-inline">${mathHTML('\\left('+pack.exact.map(scalarTex).join(', ')+'\\right)',false)}</span>`:'—';
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
const numeric=value=>typeof value==='number'&&Number.isFinite(value);
function validPack(pack,vectorPack=false){
 if(!pack||!Array.isArray(pack.exact))return false;
 const rows=vectorPack?pack.dimension:pack.shape?.[0],cols=vectorPack?1:pack.shape?.[1];
 if(!Number.isInteger(rows)||rows<1||rows>12||!Number.isInteger(cols)||cols<0||cols>12||pack.exact.length!==rows)return false;
 const exact=vectorPack?pack.exact.flatMap(x=>[x]):pack.exact.flat();
 if(!vectorPack&&pack.exact.some(row=>!Array.isArray(row)||row.length!==cols))return false;
 return exact.every(x=>typeof x==='string'&&x.length<1500)&&['re','im'].every(part=>{
  const values=pack.numeric?.[part];return vectorPack?Array.isArray(values)&&values.length===rows&&values.every(numeric):Array.isArray(values)&&values.length===rows&&values.every(row=>Array.isArray(row)&&row.length===cols&&row.every(numeric));
 });
}
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length<=20000;
const bool=x=>typeof x==='boolean';
const matrixPack=(p,n,m=n)=>validPack(p)&&p.shape[0]===n&&p.shape[1]===m;
const vectorPack=(p,n)=>validPack(p,true)&&p.dimension===n;
const scalarPack=p=>record(p)&&text(p.exact)&&numeric(p.re)&&numeric(p.im);
const quantumPack=q=>record(q)&&bool(q.antiunitary)&&['unitary-spin-rotation','antiunitary-rotation-time-reversal'].includes(q.kind)&&matrixPack(q.properRotation,3)&&matrixPack(q.unitaryPart,2)&&matrixPack(q.square,2)&&matrixPack(q.classicalSquare,3)&&text(q.convention)&&text(q.scope);
function validViewer(v,frames,sites){
 if(!record(v)||v.lab!=='spin_group'||!['point','space'].includes(v.dimension)||!text(v.title)||!Array.isArray(v.referenceSites)||v.referenceSites.length!==sites||!Array.isArray(v.frames)||v.frames.length!==frames)return false;
 const position=x=>Array.isArray(x)&&x.length===3&&x.every(numeric),site=x=>record(x)&&text(x.id)&&position(x.position)&&position(x.spin);
 if(!v.referenceSites.every(site)||!v.frames.every(f=>record(f)&&Number.isInteger(f.step)&&Array.isArray(f.sites)&&f.sites.length===sites&&f.sites.every(site)))return false;
 if(v.cellVertices!==undefined&&(!Array.isArray(v.cellVertices)||!v.cellVertices.every(position)))return false;
 if(v.latticeAxes!==undefined&&(!Array.isArray(v.latticeAxes)||!v.latticeAxes.every(a=>position(a)||record(a)&&text(a.label)&&position(a.start)&&position(a.end))))return false;
 return true;
}
function validSiteMatches(rows,sites){
 return Array.isArray(rows)&&rows.length===sites&&rows.every(x=>record(x)&&text(x.sourceId)&&bool(x.positionMatches)&&bool(x.momentMatches)&&['positionBefore','positionAfter','initial','transformed'].every(k=>vectorPack(x[k],3))&&(x.positionMatches?text(x.targetId)&&vectorPack(x.target,3)&&vectorPack(x.difference,3):x.targetId===null&&x.target===null&&x.difference===null&&!x.momentMatches));
}
export function spinActionsModel(result){
 if(!record(result)||result.schema!=='symmetry-lab-spin-actions-1'||result.lab!=='spin_actions'||!kinds.has(result.experiment)||result.exact!==true||!record(result.input)||result.input.lab!=='spin_actions'||result.input.experiment!==result.experiment||!Array.isArray(result.steps)||!result.steps.length||!result.steps.every(x=>record(x)&&text(x.id)&&text(x.title)&&text(x.explanation)&&(x.formula===undefined||text(x.formula)))||!Array.isArray(result.checks)||!result.checks.length||!result.checks.every(x=>record(x)&&text(x.id)&&text(x.label)&&bool(x.passed)&&(x.detail===undefined||text(x.detail)))||!Array.isArray(result.notes)||!result.notes.every(text))return {status:'invalid'};
 if(result.experiment==='color_theta'){
  const matrices=['swap','swapSquare','thetaUnitary','thetaSquare','phasedThetaUnitary','phasedThetaSquare','phasedThetaOrdinarySquare','hamiltonian','thetaHamiltonian'],states=['initial','conjugated','swap','theta','swapTwice','thetaTwice','scaledInitial','swapScaled','scalarTimesSwap','thetaScaled','conjugateScalarTimesTheta','scalarTimesTheta','phasedTheta','thetaConjugated','phasedThetaTwice'],c=result.comparison,h=result.hamiltonian;
  if(!record(result.matrices)||!record(result.states)||!matrices.every(k=>matrixPack(result.matrices[k],2))||!states.every(k=>vectorPack(result.states[k],2))||!scalarPack(result.scalar)||!scalarPack(result.operatorPhase)||!record(c)||!['sameComponents','sameRay','thetaOrthogonalToInitial'].every(k=>bool(c[k]))||!['overlap','overlapAbsSquared','initialThetaOverlap','swapThetaRayDistanceSquared'].every(k=>scalarPack(c[k]))||!record(h)||!bool(h.commutesWithSwap)||!bool(h.timeReversalSymmetric)||!Array.isArray(h.eigenvalues)||h.eigenvalues.length!==2||!h.eigenvalues.every(text))return {status:'invalid'};
 }else if(result.experiment==='spin_stabilizer'){
  const r=result.spinOnly,n=r?.momentMatrix?.shape?.[1];if(!record(r)||!Number.isInteger(n)||n<1||n>12||!Number.isInteger(r.rank)||r.rank<0||r.rank>3||!matrixPack(r.momentMatrix,3,n)||!matrixPack(r.rref,3,n)||!matrixPack(r.spanBasis,3,r.rank)||!matrixPack(r.complementBasis,3,3-r.rank)||!matrixPack(r.operation,3)||!matrixPack(r.projector,3)||![-1,1].includes(r.determinant)||!record(r.classification)||!text(r.classification.full)||!text(r.classification.proper)||r.classification.complementDimension!==3-r.rank||!Array.isArray(r.pivots)||r.pivots.length!==r.rank||!r.pivots.every(x=>Number.isInteger(x)&&x>=0&&x<n)||!Array.isArray(r.sitewise)||r.sitewise.length!==n||!r.sitewise.every(x=>record(x)&&text(x.id)&&['initial','transformed','difference'].every(k=>vectorPack(x[k],3))&&bool(x.fixed))||!bool(r.preservesAll)||!quantumPack(r.quantum)||!validViewer(result.viewer,2,n))return {status:'invalid'};
 }else {const r=result.locking,n=result.viewer?.referenceSites?.length;if(!record(r)||!Number.isInteger(n)||n<1||n>12||!matrixPack(r.rotation,3)||!vectorPack(r.translation,3)||!matrixPack(r.inputSpin,3)||![-1,1].includes(r.determinant)||!bool(r.structurePreserved)||r.hamiltonianSymmetry!=='not-evaluated'||!record(r.original)||!matrixPack(r.original.matrix,3)||!bool(r.original.preservesPattern)||!validSiteMatches(r.original.sitewise,n)||!quantumPack(r.original.quantum)||!Array.isArray(r.candidates)||r.candidates.length!==2||!r.candidates.every((c,i)=>record(c)&&c.timeReversal===(i===1)&&matrixPack(c.matrix,3)&&bool(c.matchesInputSpin)&&bool(c.preservesPattern)&&validSiteMatches(c.sitewise,n)&&c.sitewise.every(x=>vectorPack(x.polarRotated,3)&&vectorPack(x.axialRotated,3))&&quantumPack(c.quantum))||!validViewer(result.viewer,4,n))return {status:'invalid'};}
 return {status:'available',result};
}
function parseJSON(text,name){try{return JSON.parse(text);}catch{throw Error(name+" must be valid JSON.");}}
function choice(value,rows,name){if(!rows.some(([key])=>key===value))throw Error(name+" must be one of the listed choices.");return value;}
/** Assemble only the documented input fields; Python owns exact validation. */
export function spinActionsRequest(experiment,raw={}){
 if(!kinds.has(experiment))throw Error("Unknown spin-operation experiment.");
 const p={...defaults(experiment),...raw},input={lab:'spin_actions',experiment};
 if(experiment==='color_theta'){
  input.statePreset=choice(p.statePreset,states,"State");
  if(input.statePreset==='custom')input.state=parseJSON(p.state,"Complex state");
  input.scalar=parseJSON(p.scalar,"Complex scalar");input.operatorPhase=parseJSON(p.operatorPhase,"Operator phase");
 }else if(experiment==='spin_stabilizer'){
  input.momentPreset=choice(p.momentPreset,moments,"Moment configuration");
  if(input.momentPreset==='custom'){input.moments=parseJSON(p.moments,"Ordered moments");if(String(p.positions).trim())input.positions=parseJSON(p.positions,"Ordered positions");}
  input.operationPreset=choice(p.operationPreset,operations,"Spin operation");
  if(input.operationPreset==='rotation_z'){const angle=Number(p.angle);if(String(p.angle).trim()===''||![0,30,45,60,90,120,180].includes(angle))throw Error("Choose one of the listed exact angles.");input.angle=angle;}
  if(input.operationPreset==='custom')input.operation=parseJSON(p.operation,"Spin matrix");
 }else{
  input.modelPreset=choice(p.modelPreset,models,"SOC model");
  if(input.modelPreset==='custom'){input.sites=parseJSON(p.sites,"Ordered sites");input.periodic=p.periodic===true;input.rotation=parseJSON(p.rotation,"Spatial matrix");input.translation=parseJSON(p.translation,"Translation");input.spinMatrix=parseJSON(p.spinMatrix,"Independent spin matrix");}
 }
 return input;
}
export function spinActionsLegacyRequest(experiment,preset){
 if(experiment==='color_theta')return {lab:'color_group',preset:'c3_point',steps:3,variant:'combined'};
 const allowed=['c2_point','af_space','triangular_point','helix3_space'];
 if(!['spin_stabilizer','soc_locking'].includes(experiment)||!allowed.includes(preset))throw Error("This local input cannot be copied directly into an existing pattern model.");
 return {lab:'spin_group',preset,steps:preset==='triangular_point'||preset==='helix3_space'?3:4,variant:'combined'};
}

const questions={
 color_theta:{prompt:"After multiplying the initial state by i, which rule applies to time reversal?",choices:[['',"Not selected"],['conjugate','Θ(iψ)=−iΘψ'],['linear','Θ(iψ)=iΘψ'],['color',"It is determined by the number of colors alone"]],answer:'conjugate',feedback:"Color-label exchange acts linearly on coefficients. Theta first conjugates them, so an external scalar is conjugated too. An overall operator phase does not change Theta squared."},
 spin_stabilizer:{prompt:"For two nonparallel coplanar moments fixed individually, are the O(3) and SO(3) stabilizers the same?",choices:[['',"Not selected"],['different',"Different: O(3) also includes reversal of the normal direction"],['same',"The same: both allow arbitrary rotation about the normal"],['permute',"It is enough to exchange the two moments"]],answer:'different',feedback:"Fixing each moment requires the identity on their span. Its orthogonal complement is one-dimensional: O(3) permits either sign there, while SO(3) retains only +1."},
 soc_locking:{prompt:"If an independent spin operation passes site-by-site pattern matching, must it satisfy SOC locking?",choices:[['',"Not selected"],['separate',"Compare the locking matrices for epsilon = 0 and epsilon = 1 separately"],['yes',"Yes: matching the pattern is sufficient"],['ignore',"Check only the spatial matrix, without the moments"]],answer:'separate',feedback:"Pattern matching and locking are separate tests. For the same spatial R, a conventional magnetic operation requires U=(-1)^epsilon det(R)R. Even after matching matrices, check the ordered structure. This geometric test does not replace a Hamiltonian commutator test with SOC."}
};
function controls(experiment,p){
 if(experiment==='color_theta')return select('sax-state-preset',"Choose a complex-state reference",states,p.statePreset)+`<div${p.statePreset==='custom'?'':' hidden'}>`+area('sax-state',"Complex state [[Re a,Im a],[Re b,Im b]]",p.state)+`</div>`+area('sax-scalar',"External complex scalar [Re lambda,Im lambda]",p.scalar,1)+area('sax-phase',"Time-reversal operator phase [Re eta,Im eta]",p.operatorPhase,1)+"<p>Python normalizes the complex state and the nonzero operator phase. Scalars accept finite real numbers, decimals, or simple rational strings; expressions are not executed.</p>";
 if(experiment==='spin_stabilizer')return select('sax-moment-preset',"Ordered moment configuration",moments,p.momentPreset)+`<div${p.momentPreset==='custom'?'':' hidden'}>`+area('sax-moments',"Ordered moments [[x,y,z],...]",p.moments)+area('sax-positions',"Optional positions in the same order; blank uses equally spaced sites",p.positions)+`</div>`+select('sax-operation-preset',"Test one spin-only operation",operations,p.operationPreset)+`<div${p.operationPreset==='rotation_z'?'':' hidden'}>`+select('sax-angle',"Rotation angle about z / degrees",[0,30,45,60,90,120,180].map(x=>[String(x),String(x)]),p.angle)+`</div><div${p.operationPreset==='custom'?'':' hidden'}>`+area('sax-operation',"Exactly orthogonal 3-by-3 spin matrix",p.operation,3)+`</div>`+"<p>Keep the site order fixed and test U m_i = m_i for each moment. Positions aid visualization; a site permutation cannot replace individual fixation.</p>";
 return select('sax-model-preset',"Spatial and spin pattern",models,p.modelPreset)+`<div${p.modelPreset==='custom'?'':' hidden'}>`+area('sax-sites',"Ordered-site JSON: id, species, position, moment",p.sites,4)+`<label class="sax-check"><input id="sax-periodic" type="checkbox"${p.periodic?' checked':''}><span>Match periodically in all three directions</span></label>`+area('sax-rotation',"Spatial orthogonal matrix R (3 by 3)",p.rotation,3)+area('sax-translation',"Spatial translation t (3 components)",p.translation,1)+area('sax-spin-matrix',"Independent orthogonal spin matrix U (3 by 3)",p.spinMatrix,3)+`</div>`+"<p>First test site matching for the supplied [U||R|t]. Then test locking candidates without and with time reversal separately, in the same Cartesian frame.</p>";
}
function quantumHTML(q){return q?`<section><h5>Distinguish the classical moment action from the spin-factor lift</h5><p>${esc(q.convention)} ${esc(q.scope)}</p><p>Here V is a 3-by-3 proper rotation and D(V) its 2-by-2 lift. The matrix part of the complete spin factor is denoted separately by B.</p><p>Proper rotation V:</p>${matrix(q.properRotation)}<p>The spin-factor lift is antiunitary: ${pass(q.antiunitary)}。</p>${formula(q.antiunitary?'A_s=B K,\\qquad A_s^2=B B^*':'A_s=B,\\qquad A_s^2=B^2')}<p>2-by-2 matrix part B of the spin factor:</p>${matrix(q.unitaryPart)}<p>Square of the spin factor; spatial orbital and Bloch actions are excluded:</p>${matrix(q.square)}<p>Classical matrix square:</p>${matrix(q.classicalSquare)}<p>The square of a classical moment-arrow transformation alone does not establish the spinor Kramers condition.</p></section>`:'';}
function colorResult(r,stage){
 const m=r.matrices,s=r.states,c=r.comparison;let html="<h4>1. Declare the two different action spaces</h4><p>On the left, coefficients belong to two distinguishable labels. On the right, the basis is a spin-1/2 basis. A similar two-color diagram does not determine the Hilbert-space operator.</p><div class=\"sax-pair\"><section><h5>Linear color exchange P</h5>"+matrix(m.swap)+"</section><section><h5>Matrix part of time reversal, Theta = -i sigma_y K</h5>"+matrix(m.thetaUnitary)+"</section></div><p>Normalized initial state psi:</p>"+vector(s.initial);
 if(stage>=2)html+="<h4>2. Conjugate first, then multiply by the matrix</h4><p>Kψ：</p>"+vector(s.conjugated)+'<div class="sax-pair"><section><h5>Pψ</h5>'+vector(s.swap)+'</section><section><h5>Θψ</h5>'+vector(s.theta)+'</section></div>'+table("Compare P psi with Theta psi, and check Kramers orthogonality separately",["Check","Exact Python result"],[["P psi and Theta psi have identical components",pass(c.sameComponents)],["P psi and Theta psi belong to the same ray",pass(c.sameRay)],['⟨Pψ|Θψ⟩',scalar(c.overlap)],['⟨ψ|Θψ⟩',scalar(c.initialThetaOverlap)],["Theta psi is orthogonal to psi",pass(c.thetaOrthogonalToInitial)]])+"<p>Identical components, the same ray, and the same moment arrow are different statements.</p>";
 if(stage>=3)html+="<h4>3. Move a complex scalar through the operator</h4><p>For this calculation, lambda = "+scalar(r.scalar)+". Each vector below comes from this Python calculation.</p>"+table("Linear and antilinear actions",["Action","Returned exact components"],[['P(λψ)',shownVector(s.swapScaled)],['λPψ',shownVector(s.scalarTimesSwap)],['Θ(λψ)',shownVector(s.thetaScaled)],['λ*Θψ',shownVector(s.conjugateScalarTimesTheta)],['λΘψ',shownVector(s.scalarTimesTheta)]])+formula('P(\\lambda\\psi)=\\lambda P\\psi,\\qquad \\Theta(\\lambda\\psi)=\\lambda^*\\Theta\\psi');
 if(stage>=4)html+="<h4>4. Compare squares and the conditions for degeneracy</h4>"+formula('P^2=I,\\qquad \\Theta^2=(-i\\sigma_y)(-i\\sigma_y)^*=-I')+"<div class=\"sax-pair\"><section><h5>Matrix of P squared</h5>"+matrix(m.swapSquare)+"</section><section><h5>Matrix of Theta squared</h5>"+matrix(m.thetaSquare)+"</section></div><p>Before applying Theta again, conjugate the first result:</p>"+vector(s.thetaConjugated)+'<div class="sax-pair"><section><h5>P²ψ</h5>'+vector(s.swapTwice)+'</section><section><h5>Θ²ψ</h5>'+vector(s.thetaTwice)+"</section></div><p>After multiplying Theta by the normalized phase eta = "+scalar(r.operatorPhase)+" , denote its matrix part by B:</p>"+matrix(m.phasedThetaUnitary)+"<div class=\"sax-pair\"><section><h5>Ordinary matrix square B squared; a comparison that omits conjugation</h5>"+matrix(m.phasedThetaOrdinarySquare)+"</section><section><h5>Actual antiunitary square B B conjugate</h5>"+matrix(m.phasedThetaSquare)+"</section></div><p>Set eta to i: the ordinary matrix square gives +I, whereas the antiunitary square remains -I. The second action must conjugate the first phase.</p><p>State after applying the phased operator twice:</p>"+vector(s.phasedThetaTwice)+"<p>Comparison Hamiltonian H:</p>"+matrix(m.hamiltonian)+'<p>ΘHΘ⁻¹：</p>'+matrix(m.thetaHamiltonian)+`<div class="sax-facts">${fact("H commutes with color exchange P",pass(r.hamiltonian?.commutesWithSwap))}${fact("H has the stated time-reversal symmetry",pass(r.hamiltonian?.timeReversalSymmetric))}${fact("Eigenvalues of H",(r.hamiltonian?.eigenvalues||[]).join(', '))}</div><p>This H preserves color exchange but lacks Theta symmetry and has no enforced doublet. Kramers' argument requires an antiunitary symmetry of the Hamiltonian. For pairing at the same crystal momentum, also check that this k is preserved. The present finite two-level model has no crystal momentum.</p>`;
 return html;
}
function stabilizerResult(r,stage){
 const s=r.spinOnly;let html="<h4>1. Identify the ordered moments to be fixed individually</h4><p>Place the moments in the columns of M. Their span W determines the directions that must be fixed; the number of arrows does not.</p>"+matrix(s.momentMatrix)+`<div class="sax-facts">${fact('rank M',s.rank)}${fact("Dimension of the orthogonal complement",s.classification.complementDimension)}</div>`;
 if(stage>=2)html+="<h4>2. Read the stabilizer from RREF and subspaces</h4><p>Returned RREF:</p>"+matrix(s.rref)+"<p>Pivot columns, counting from 1: "+esc((s.pivots||[]).map(x=>x+1).join(', ')||'—')+"。</p><p>Basis of W:</p>"+matrix(s.spanBasis)+"<p>Basis of the orthogonal complement of W:</p>"+matrix(s.complementBasis)+"<p>Projector onto W:</p>"+matrix(s.projector)+`<p>Full classical O(3) stabilizer: <strong>${esc(s.classification.full)}</strong>。</p><p>Proper SO(3) part: <strong>${esc(s.classification.proper)}</strong>。</p><p>Testing one selected operation gives a finite example. The stabilizer classification follows from dimension and identity action on W, rather than enumeration of a few displayed frames.</p>`;
 if(stage>=3)html+="<h4>3. Calculate U m_i - m_i for every moment</h4><p>This operation U has determinant "+esc(s.determinant)+'：</p>'+matrix(s.operation)+table("Fix each moment without permuting sites",["site","Initial moment","after transformation","Residual vector","Fixed?"],s.sitewise.map(x=>[esc(x.id),shownVector(x.initial),shownVector(x.transformed),shownVector(x.difference),pass(x.fixed)]))+`<p>All moments fixed: <strong>${pass(s.preservesAll)}</strong>。</p>`;
 if(stage>=4)html+="<h4>4. How does an improper action lift to quantum spin?</h4>"+quantumHTML(s.quantum)+"<p>A classical operation with det U = -1 is not a purely unitary SU(2) rotation. It can arise from a proper rotation combined with time reversal. Explain the classical O(3) stabilizer and quantum lift separately.</p>";
 return html;
}
const siteTable=rows=>table("Compare moments after matching species and periodic positions",["Source to target","Position matches","Initial moment","after transformation","Target moment","Residual vector","Moment matches"],rows.map(x=>[esc(x.sourceId)+' → '+esc(x.targetId??"None"),pass(x.positionMatches),shownVector(x.initial),shownVector(x.transformed),shownVector(x.target),shownVector(x.difference),pass(x.momentMatches)]));
function lockingResult(r,stage,candidate){
 const l=r.locking;let html="<h4>1. Record the spatial and spin operations independently</h4><div class=\"sax-pair\"><section><h5>Spatial matrix R</h5>"+matrix(l.rotation)+"</section><section><h5>Independent spin matrix U</h5>"+matrix(l.inputSpin)+"</section></div><p>Spatial translation t:</p>"+vector(l.translation)+`<p>det R=${esc(l.determinant)}; spatial action preserves the chemical structure: ${pass(l.structurePreserved)}。</p>`;
 if(stage>=2)html+="<h4>2. Test the independent combined operation first</h4>"+siteTable(l.original.sitewise)+`<p>The supplied [U||R|t] preserves the whole pattern: <strong>${pass(l.original.preservesPattern)}</strong>。</p>`;
 if(stage>=3)html+="<h4>3. Construct both locking candidates for the same R</h4>"+formula('U_\\varepsilon=(-1)^\\varepsilon\\det(R)R,\\qquad \\varepsilon=0,1')+table("Matrix locking and pattern matching are separate tests",["Candidate","Equals the input U?","Preserves the pattern?"],l.candidates.map(x=>[x.timeReversal?"epsilon = 1: with time reversal":"epsilon = 0: unitary magnetic operation",pass(x.matchesInputSpin),pass(x.preservesPattern)]))+"<p>Locking matrix of the selected candidate:</p>"+matrix(l.candidates[candidate].matrix)+table("Follow the polar-vector rotation, axial factor, and time-reversal sign",["site",'R m','det(R) R m',"Final moment"],l.candidates[candidate].sitewise.map(x=>[esc(x.sourceId),shownVector(x.polarRotated),shownVector(x.axialRotated),shownVector(x.transformed)]))+siteTable(l.candidates[candidate].sitewise);
 if(stage>=4)html+="<h4>4. Distinguish pattern constraints from Hamiltonian symmetry</h4><p>First examine the lift of the supplied independent spin action:</p>"+quantumHTML(l.original.quantum)+"<p>Then examine the lift of the selected locking candidate:</p>"+quantumHTML(l.candidates[candidate].quantum)+"<p>This page evaluates the geometric action on an ordered structure and its moments. It does not evaluate a specific Hamiltonian commutator with SOC. A material calculation also needs its phase, domain, energy scales, and interactions.</p><p>Hamiltonian test status: <code data-math-ignore>"+esc(l.hamiltonianSymmetry??r.hamiltonianSymmetry??'not-evaluated')+'</code>。</p>';
 return html;
}
export function spinActionsResultHTML(result,{stage=1,candidate=0}={}){
 if(spinActionsModel(result).status!=='available')return "<p role=\"alert\">This result lacks the complete spin-operation data. Calculate again.</p>";
 return result.experiment==='color_theta'?colorResult(result,stage):result.experiment==='spin_stabilizer'?stabilizerResult(result,stage):lockingResult(result,stage,candidate);
}

/** Called only after the lesson's native disclosure explicitly loads this module. */
export function bindSpinActionsLesson({root,lessonId,isCurrent=()=>true,stateStore=new Map(),run,cancelRun,onCopy,download}={}){
 const experiment=SPIN_ACTION_LESSONS[lessonId],body=root?.querySelector('[data-sax-body]');
 if(!experiment||!body)return ()=>{};
 const store=stateStore instanceof Map?stateStore:new Map(),key='panel:'+lessonId,prior=store.get(key)||{},state={raw:defaults(experiment),result:null,input:null,stage:1,candidate:0,frame:1,prediction:'',checked:false,note:'',details:{},camera:{},legacyPreset:experiment==='spin_stabilizer'?'triangular_point':'c2_point',...clone(prior)};
 state.raw={...defaults(experiment),...state.raw};const owner={};owners.set(body,owner);let alive=true,ticket=0,busy=false,error='',copyStatus='',viewer=null;
 if(!Number.isInteger(state.stage)||state.stage<1||state.stage>4)state.stage=1;if(![0,1].includes(state.candidate))state.candidate=0;
 if(state.result&&spinActionsModel(state.result).status!=='available')state.result=null;
 const $=id=>body.querySelector('#sax-'+id),active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const save=()=>{if(active())store.set(key,clone(state));};
 function capture(){if(!active())return;for(const field of body.querySelectorAll('[data-sax-native]'))state.details[field.dataset.saxNative]=readOpen(field);if($('note'))state.note=$('note').value;if($('prediction'))state.prediction=$('prediction').value;if(viewer)state.camera=viewer.getView();save();}
 function retire(){ticket++;if(busy&&active())cancelRun?.();busy=false;state.result=null;state.input=null;state.stage=1;state.frame=1;state.checked=false;error='';copyStatus='';if($('feedback'))$('feedback').textContent='';viewer?.destroy();viewer=null;save();}
 const bind=(id,event,fn)=>{const node=$(id);if(node)node[event]=e=>{if(!active()||$(id)!==node||node.disabled)return;capture();fn(node,e);save();};};
 function draw(){
  if(!active())return;capture();viewer?.destroy();viewer=null;
  const q=questions[experiment],raw=state.raw;
  body.innerHTML=`<h4>${esc(label[experiment])}</h4><p>Predict, then calculate manually. The panel displays this Python calculation's exact matrices, vectors, and site-by-site decisions. Changing input retires the previous result.</p><form id="sax-form"><fieldset${busy?' disabled':''}><legend>Operation and state inputs</legend><div class="sax-controls">${controls(experiment,raw)}</div><button type="submit" class="primary" id="sax-run">${busy?"Python Calculating…":"Calculate this operation →"}</button></fieldset><button type="button" class="secondary" id="sax-cancel"${busy?'':' hidden'}><span>Cancel this panel's calculation</span></button></form>${error?`<p class="notice error" role="alert">${esc(error)}</p>`:''}<section class="sax-prediction">${select('sax-prediction',q.prompt,q.choices,state.prediction)}<button type="button" class="secondary" id="sax-check">Check this prediction</button><p id="sax-feedback" role="status">${state.checked?(state.prediction?(state.prediction===q.answer?"The reasoning agrees.":"Compare the action spaces and operators again.")+' '+q.feedback:"Choose a prediction first."):''}</p></section><div id="sax-result"></div>${area('sax-note',"My explanation and counterexample; retained only in this page's memory",state.note,3)}<section class="sax-legacy"><h4>Compare with an existing geometric-pattern experiment</h4><p>${experiment==='color_theta'?"The comparison below opens a spatial-color action on a three-color pattern. It is a separate geometric model; two-state quantum coefficients and Theta are not treated as a three-color permutation.":"Copying transfers only the complete geometric inputs supported by the existing model. It does not transfer custom moments, a stabilizer matrix, or a Hamiltonian. Pattern animations do not enumerate a continuous stabilizer."}</p>${experiment==='color_theta'?'':select('sax-legacy-preset',"Choose an existing pattern comparison",models.filter(([id])=>id!=='custom'),state.legacyPreset)}<button type="button" class="secondary" id="sax-copy">${experiment==='color_theta'?"Copy the complete three-color geometric input":"Copy the complete pattern-comparison input"}</button><p id="sax-copy-status" role="status">${esc(copyStatus)}</p></section>`;
  body.innerHTML+="<p class=\"sax-method\"><a href=\"docs/spin-actions.md\">Methods, input limits, and references ↗</a></p>";
  const form=$('form');form.onsubmit=e=>{e.preventDefault();if(active()&&$('form')===form&&!busy)return calculate();};
  const fields={statePreset:'state-preset',state:'state',scalar:'scalar',operatorPhase:'phase',momentPreset:'moment-preset',moments:'moments',positions:'positions',operationPreset:'operation-preset',angle:'angle',operation:'operation',modelPreset:'model-preset',sites:'sites',rotation:'rotation',translation:'translation',spinMatrix:'spin-matrix'};
  for(const [name,id]of Object.entries(fields))if($(id)){const event=['statePreset','momentPreset','operationPreset','angle','modelPreset'].includes(name)?'onchange':'oninput';bind(id,event,node=>{state.raw[name]=node.value;retire();if(event==='onchange')draw();else drawResult();});}
  bind('periodic','onchange',node=>{state.raw.periodic=node.checked;retire();drawResult();});
  bind('note','oninput',node=>{state.note=node.value;});bind('prediction','onchange',node=>{state.prediction=node.value;state.checked=false;$('feedback').textContent='';});
  bind('check','onclick',()=>{state.checked=true;const q=questions[experiment];$('feedback').textContent=state.prediction?(state.prediction===q.answer?"The reasoning agrees.":"Compare the action spaces and operators again.")+' '+q.feedback:"Choose a prediction first.";});
  bind('cancel','onclick',()=>{if(!busy)return;ticket++;cancelRun?.();busy=false;error="This calculation was canceled. Edit the inputs and try again.";draw();});
  bind('legacy-preset','onchange',node=>{state.legacyPreset=node.value;copyStatus='';$('copy-status').textContent='';});
  bind('copy','onclick',async node=>{if(typeof onCopy!=='function'){copyStatus="Pattern copying is unavailable at this entry. Use the course's original experiment button.";$('copy-status').textContent=copyStatus;return;}const job=++ticket;const request=spinActionsLegacyRequest(experiment,state.legacyPreset);if(busy){cancelRun?.();busy=false;}node.disabled=true;try{const accepted=await onCopy(clone(request));if(active()&&job===ticket){copyStatus=accepted===false?"The input has not been copied. Try again.":"The complete input was copied. Run the existing experiment manually.";$('copy-status').textContent=copyStatus;}}catch{if(active()&&job===ticket){copyStatus="The input has not been copied. Try again.";$('copy-status').textContent=copyStatus;}}finally{if(active()&&$('copy')===node)node.disabled=false;}});
  drawResult();save();
 }
 async function calculate(){
  if(!active()||busy)return;let input;
  try{input=spinActionsRequest(experiment,state.raw);}catch(e){error=e.message;state.result=null;draw();return;}
  const job=++ticket;busy=true;error='';state.result=null;state.input=null;state.stage=1;state.frame=1;draw();
  try{if(typeof run!=='function')throw Error("The Python interface is unavailable. Reopen the lesson.");const result=await run('teaching_labs',input);if(!active()||ticket!==job)return;if(spinActionsModel(result).status!=='available'||result.experiment!==experiment)throw Error("The returned result does not match this operation experiment.");state.result=result;state.input=clone(input);}
  catch(e){if(active()&&ticket===job)error=String(e?.message||"The calculation did not finish. Try again.");}
  finally{if(active()&&ticket===job){busy=false;draw();}}
 }
 function drawResult(){
  const target=$('result');if(!active()||!target)return;viewer?.destroy();viewer=null;
  if(!state.result){target.innerHTML=busy?"<p role=\"status\">Calculating the exact action. First use loads the browser's Python environment.</p>":"<p>No calculation yet. Record a prediction and run manually. Recalculate after changing inputs.</p>";return;}
  const result=state.result;
  target.innerHTML=`<div class="sax-result-controls"><button type="button" class="secondary" id="sax-next"${state.stage>=4?' disabled':''}>Reveal the next step</button><button type="button" class="secondary" id="sax-first">Return to step 1</button><span id="sax-stage-status" role="status">No. ${state.stage} / 4</span></div>${experiment==='soc_locking'?select('sax-candidate',"Follow one SOC-locking candidate",[['0',"epsilon = 0: unitary magnetic operation"],['1',"epsilon = 1: with time reversal"]],state.candidate):''}<div id="sax-ledger">${spinActionsResultHTML(result,state)}</div>${result.viewer?`<details data-sax-native="viewer"${state.details.viewer?' open':''}><summary>View Python-calculated moments and frame comparisons in 3D</summary><div id="sax-viewer"></div>${select('sax-frame',"Choose a returned frame",result.viewer.frames.map((f,i)=>[String(i),i===0?"Initial pattern":experiment==='soc_locking'?(i===1?"Supplied independent operation":i===2?"epsilon = 0 locking candidate":"epsilon = 1 locking candidate"):"Apply the selected spin-only operation"]),String(state.frame))}<p>The camera changes only the view. Arrows and positions come from Python; arrows do not determine the full quantum phase.</p></details>`:''}<details data-sax-native="checks"${state.details.checks?' open':''}><summary>View this calculation's exact checks and derivation</summary><ul>${result.checks.map(c=>`<li><strong>${c.passed?"passes":"failed"} · ${esc(c.label)}</strong>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>${result.steps.map(s=>`<section><h5>${esc(s.title)}</h5><p>${esc(s.explanation)}</p>${s.formula?formula(s.formula):''}</section>`).join('')}<ul>${(result.notes||[]).map(n=>'<li>'+esc(n)+'</li>').join('')}</ul></details>`;
  if(typeof download==='function')target.innerHTML+="<button type=\"button\" class=\"secondary\" id=\"sax-export\">Export this panel's input and exact result</button>";
  bind('next','onclick',()=>{if(state.stage<4){state.stage++;drawResult();}});bind('first','onclick',()=>{state.stage=1;drawResult();});
  bind('candidate','onchange',node=>{state.candidate=Number(node.value);drawResult();});bind('frame','onchange',node=>{state.frame=Number(node.value);viewer?.setFrame(state.frame);});
  for(const detail of target.querySelectorAll('[data-sax-native]'))detail.ontoggle=()=>{if(!active()||!Array.from(target.querySelectorAll('[data-sax-native]')).includes(detail))return;state.details[detail.dataset.saxNative]=readOpen(detail);if(detail.dataset.saxNative==='viewer')renderViewer();save();};
  bind('export','onclick',()=>{if(state.result===result&&state.input)download(JSON.stringify({kind:'spin-actions-teaching',input:state.input,result},null,2),'spin-actions-'+experiment+'.json');});
  renderViewer();
 }
 function renderViewer(){
  if(!active()||!state.result?.viewer||!$('viewer')||!state.details.viewer)return;
  viewer?.destroy();viewer=createSpinColorViewer({container:$('viewer'),data:state.result.viewer,frameIndex:state.frame,initialView:state.camera,isCurrent:()=>active()&&!!state.result&&!!$('viewer')});
 }
 draw();
 const cleanup=()=>{if(!alive)return;capture();if(busy&&active())cancelRun?.();busy=false;ticket++;alive=false;viewer?.destroy();viewer=null;for(const tag of ['input','select','textarea','button','form','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.onsubmit=null;node.ontoggle=null;}if(owners.get(body)===owner)owners.delete(body);};
 cleanup.snapshot=()=>{capture();return clone(state);};return cleanup;
}
