import {mathHTML} from './math-display.js?v=20261113-prose2';

// Small exact examples at the first use of matrix vocabulary. No scientific
// calculation service or course-progress store is used by these optional tasks.
export const MATRIX_BRIDGE_HOOKS=Object.freeze({
 'operations-notation':Object.freeze(['transpose-inverse','determinant-orientation']),
 projection:Object.freeze(['c4-vector-function']),
 'from-point-to-space':Object.freeze(['reciprocal-shear-phase'])
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gcd(a,b){a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a;}
function q(value){
 if(value&&typeof value==='object'&&typeof value.n==='bigint'&&typeof value.d==='bigint')return value;
 if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Exact examples require an integer or a rational string.');
 const text=String(value);if(!/^[+-]?\d+(?:\/[+-]?\d+)?$/.test(text))throw Error('Invalid exact rational.');
 let[n,d]=text.split('/').map(BigInt);d??=1n;if(d===0n)throw Error('Zero denominator.');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return{n:n/g,d:d/g};
}
const add=(a,b)=>{a=q(a);b=q(b);return q((a.n*b.d+b.n*a.d)+'/'+(a.d*b.d));};
const mul=(a,b)=>{a=q(a);b=q(b);return q((a.n*b.n)+'/'+(a.d*b.d));};
const neg=a=>{a=q(a);return{n:-a.n,d:a.d};};
const sub=(a,b)=>add(a,neg(b));
const div=(a,b)=>{a=q(a);b=q(b);if(!b.n)throw Error('Singular matrix.');return q((a.n*b.d)+'/'+(a.d*b.n));};
const str=a=>{a=q(a);return a.d===1n?String(a.n):a.n+'/'+a.d;};
const num=a=>{a=q(a);return Number(a.n)/Number(a.d);};
const equal=(a,b)=>str(a)===str(b);
const vector=v=>{if(!Array.isArray(v)||v.length!==2)throw Error('A two-component vector is required.');return v.map(q);};
const matrix=a=>{if(!Array.isArray(a)||a.length!==2||a.some(r=>!Array.isArray(r)||r.length!==2))throw Error('A 2 by 2 matrix is required.');return a.map(vector);};
const transpose=a=>[[a[0][0],a[1][0]],[a[0][1],a[1][1]]];
const determinant=a=>sub(mul(a[0][0],a[1][1]),mul(a[0][1],a[1][0]));
const inverse=a=>{const d=determinant(a);return[[div(a[1][1],d),div(neg(a[0][1]),d)],[div(neg(a[1][0]),d),div(a[0][0],d)]];};
const dot=(u,v)=>add(mul(u[0],v[0]),mul(u[1],v[1]));
const apply=(a,v)=>a.map(r=>dot(r,v));
const product=(a,b)=>a.map(r=>transpose(b).map(c=>dot(r,c)));
const rowApply=(v,a)=>transpose(a).map(c=>dot(v,c));
const pullback=(v,a)=>rowApply(v,inverse(a));
const strings=a=>a.map(r=>Array.isArray(r)?strings(r):str(r));
const R=matrix([['3/5','-4/5'],['4/5','3/5']]),S=matrix([[1,1],[0,1]]),M=matrix([[-1,0],[0,1]]),C4=matrix([[0,-1],[1,0]]),I=matrix([[1,0],[0,1]]);
const minus=a=>a.map(row=>row.map(neg));
const sameVector=(a,b)=>a.every((v,n)=>equal(v,b[n]));
const sameMatrix=(a,b)=>a.every((row,n)=>sameVector(row,b[n]));

export const exactBridgeMath=Object.freeze({
 transpose:a=>strings(transpose(matrix(a))),inverse:a=>strings(inverse(matrix(a))),
 product:(a,b)=>strings(product(matrix(a),matrix(b))),apply:(a,v)=>strings(apply(matrix(a),vector(v))),
 determinant:a=>str(determinant(matrix(a))),dot:(a,b)=>str(dot(vector(a),vector(b))),
 pullback:(c,a)=>strings(pullback(vector(c),matrix(a))),
 phaseTurns:(k,t)=>str(dot(vector(k),vector(t)))
});
const scalarTex=a=>{a=q(a);const sign=a.n<0n?'-':'';return a.d===1n?str(a):sign+'\\frac{'+String(a.n<0n?-a.n:a.n)+'}{'+a.d+'}';};
const matTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(scalarTex).join('&')).join('\\\\')+'\\end{pmatrix}';
const vecTex=v=>matTex(v.map(x=>[x]));
const f=tex=>`<span class="mb-inline-math">${mathHTML(tex)}</span>`;
const formula=tex=>`<div class="mb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
function functionTex(c){return[c[0],c[1]].map((a,n)=>{a=q(a);if(!a.n)return'';return(equal(a,1)?'':equal(a,-1)?'-':scalarTex(a))+(n?'y':'x');}).filter(Boolean).join('+').replace(/\+-/g,'-')||'0';}
function phaseTex(turns){
 turns=q(turns);const n=((turns.n%turns.d)+turns.d)%turns.d,v=str(q(n+'/'+turns.d));
 return {'0':'1','1/4':'-i','1/2':'-1','3/4':'i'}[v]??'\\exp(-2\\pi i\\cdot'+scalarTex(turns)+')';
}
const xy=v=>'('+v.map(str).join(', ')+')';
const sources={x:vector([1,0]),general:vector([1,2])};
const defs={
 'transpose-inverse':{
  title:"Transpose and inverse: which one undoes this action?",
  intro:"Transposition exchanges matrix rows and columns; inversion undoes the action. In an orthonormal Cartesian basis, a matrix that preserves lengths and inner products has its transpose times itself equal to the identity, so its transpose is then its inverse. To calculate each column of CR, treat that column of R as an input arrow and apply C to it; do not multiply the two matrices entry by entry.",
  question:"Predict first: which matrix undoes the action of R on every arrow?",
  choices:[['transpose','Rᵀ'],['negative',"Negate every entry to obtain −R"],['repeat',"Apply R again"]],answer:'transpose',
  feedback:{transpose:"The check agrees: the two columns of this R have length 1 and are perpendicular, so RᵀR=I.",negative:"Negation reverses every rotated arrow. Undoing the action requires the product to equal I; in this example, (−R)R≠I.",repeat:"Repeating a rotation in the same direction does not usually undo it. Here R²≠I; counting operations alone is insufficient."},
  variantQuestion:"After changing to the shear S, which matrix undoes it?",
  variantChoices:[['transpose','Sᵀ'],['inverse','S⁻¹'],['negative','−S']],
  limit:"A two-dimensional Cartesian matrix example. The 3/5–4/5 matrix illustrates a general orthogonal rotation; no finite order or compatibility with a periodic crystal is assumed. The shear tests general algebra and is not a rigid rotation. For a 90° rotation, −R=R⁻¹ happens to hold, so the 3/5,4/5 rotation distinguishes negation from inversion."
 },
 'determinant-orientation':{
  title:"Determinant: how does signed area change?",
  intro:"The transformed edge arrows of the unit square are the two columns of the matrix. The signed area of the parallelogram they span is its determinant. The magnitude gives the area factor, and the sign gives the orientation of the plane.",
  question:"First rotate by R, then reflect across the y axis with M. What is the final signed area?",
  choices:[['negative',"−1: area is unchanged and orientation is reversed"],['positive',"+1: the presence of a rotation guarantees that orientation is preserved"],['zero',"0: reflection collapses the shape to a line"]],answer:'negative',
  feedback:{negative:"The check agrees: the composite operation is MR, and det(MR)=det(M)det(R)=−1.",positive:"The rotation preserves orientation, but the subsequent reflection reverses it. Judge the full composite matrix in its order of action.",zero:"A reflection is invertible and still maps the plane one-to-one onto the plane. Projection onto a line loses a direction and gives zero area."},
  variantQuestion:"After changing to the new operation below, how should its result be described?",
  variantChoices:[['stretch',"Orientation preserved, area multiplied by 2, invertible"],['project',"Area 0, not invertible"],['rotation',"Area preserved, an orthogonal rotation"]],
  limit:"This example concerns signed area in two dimensions. It does not replace a full analysis of three-dimensional mirrors, inversion, or crystal chirality; a positive determinant alone does not imply a rigid rotation."
 },
 'c4-vector-function':{
  title:"The arrow rotates forward; why does the function use inverse substitution?",
  intro:"Keep the coordinate axes fixed and actively rotate each old position to a new one. The new function pattern must retain the old function value at the new position, so it reads the old position found by applying the inverse.",
  question:"Actively rotate the pattern f(x,y)=x counterclockwise by 90°. What is the new function?",
  choices:[['y','y'],['minus-y','−y'],['minus-x','−x'],['x','x']],answer:'y',
  feedback:{y:"The check agrees: inverse substitution gives R⁻¹r=(y,−x); reading its first component gives y.", 'minus-y':"−y results from substituting Rr directly into the old function. It rotates the function pattern in the opposite direction and does not retain the value at the same transported point.",'minus-x':"−x results from two successive 90° rotations. The current action contains just one active rotation.",x:"The contours of f=x change direction as the pattern rotates; the function cannot simply be assumed unchanged."},
  variantQuestion:"After adding a noncommuting reflection, do successive actions under the current rule agree with the product operation?",
  variantChoices:[['same',"Yes: the group multiplication order is preserved"],['different',"No: this rule reverses the order"]],
  limit:"A two-dimensional model of linear functions and arrows. Powers of C₄ commute with one another, so they alone hide the ordering issue; the variation therefore adds a reflection. This is not an automatic constructor of arbitrary three-dimensional orbital representations."
 },
 'reciprocal-shear-phase':{
  title:"Change the basis, keep the physical wavevector: how is the translation phase preserved?",
  intro:"The columns of the real-space lattice matrix are basis vectors. Replacing the basis of the same lattice by A′=AP changes real-space and reciprocal-space fractional coordinates by dual transformation rules. An unchanged physical vector need not have unchanged fractional coordinates.",
  question:"After the shear change of basis, which k′ paired with t′=(−1,2) preserves the same physical wavevector and phase?",
  choices:[['transpose','k′=Pᵀk=(1/4,3/8)'],['unchanged',"k′ remains (1/4,1/8)"],['forward','k′=Pk=(3/8,1/8)']],answer:'transpose',
  feedback:{transpose:"The check agrees: the dot product is 1/2 in both coordinate systems, so the Bloch factor for the specified active translation is −1 in both.",unchanged:"The same physical wavevector usually has different fractional coordinates in different reciprocal bases. Keeping the old k but using the new t′ incorrectly gives a dot product of 0 and a phase of +1.",forward:"Real-space and reciprocal-space coordinates require dual transformations. Using P for the reciprocal coordinates gives a dot product of −1/8, which is not equivalent to the original 1/2 modulo an integer."},
  variantQuestion:"Now change the physical k. What is the new translation phase?",
  variantChoices:[['minus-i','−i'],['negative','−1'],['identity','1'],['plus-i','i']],
  limit:"A two-dimensional integer unimodular change of basis for the same lattice; P is not an added spatial symmetry operation. This example does not cover general BC standardization, noninteger basis changes, or supercells. A translation phase is also not the measurable intensity of an isolated state."
 }
};
const select=(id,label,choices,value)=>`<label for="${id}">${label}<select id="${id}">${choices.map(([key,text])=>`<option value="${esc(key)}" ${value===key?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,text,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${text}</button>`;
const row=(label,tex)=>`<div class="mb-result-row"><strong>${label}</strong>${formula(tex)}</div>`;
function arrows(vectors,{polygon=null,title="Coordinate arrows and operation results"}={}){
 const all=vectors.flatMap(v=>v.points||[v.vector]),extent=Math.max(2,...all.flatMap(v=>v.map(x=>Math.abs(num(x))))),scale=112/extent;
 const screen=v=>[260+num(v[0])*scale,156-num(v[1])*scale];
 const shaft=(v,index)=>{const[x,y]=screen(v.vector),a=Math.atan2(y-156,x-260),w=9;return `<line x1="260" y1="156" x2="${x}" y2="${y}" stroke="${v.color}" stroke-width="${5-index}" ${index===0?'stroke-dasharray="7 4"':''}/><path d="M${x},${y} L${x-w*Math.cos(a-.45)},${y-w*Math.sin(a-.45)} L${x-w*Math.cos(a+.45)},${y-w*Math.sin(a+.45)} Z" fill="${v.color}"/>`;};
 const poly=polygon?`<polygon points="${polygon.map(v=>screen(v).join(',')).join(' ')}" fill="#dcebe3" stroke="#285d46" stroke-width="2"/>`:'';
 return `<figure class="mb-diagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><line x1="18" y1="156" x2="502" y2="156" stroke="#b3c3bc"/><line x1="260" y1="14" x2="260" y2="275" stroke="#b3c3bc"/><text x="488" y="148">x</text><text x="270" y="28">y</text>${poly}${vectors.map(shaft).join('')}</svg><figcaption>${vectors.map(v=>`<span><i style="background:${v.color}"></i>${esc(v.label)} ${esc(xy(v.vector))}</span>`).join('')}<small>The drawing is scaled; exact values are shown below.</small></figcaption></figure>`;
}
function scenario(id,state,variant=false){
 if(id==='transpose-inverse'){
  const a=variant?S:R,choice=variant?state.variantChoice:state.choice,candidate=choice==='transpose'?transpose(a):choice==='negative'?minus(a):choice==='repeat'?a:inverse(a),v=sources[state.probe],after=apply(a,v),total=product(candidate,a),back=apply(candidate,after);
  return{a,candidate,v,after,total,back,correct:variant?choice==='inverse':choice==='transpose',tex:'',output:arrows([{label:"Original arrow",vector:v,color:'#61788a'},{label:"After the first operation",vector:after,color:'#b27727'},{label:"After applying the candidate matrix",vector:back,color:'#245e46'}])+row(variant?"Shear matrix and candidate inverse action":"Rotation matrix and candidate inverse action",(variant?'S':'R')+'='+matTex(a)+',\\quad C='+matTex(candidate))+row("Check the product in its order of action",'C'+(variant?'S':'R')+'='+matTex(total))+row("Is the arrow restored?",'v='+vecTex(v)+',\\quad Cv_{\\mathrm{after}}='+vecTex(back)),variantText:"The transpose of a shear does not undo the shear; its inverse does. Transposition exchanges rows and columns, and only the orthogonality condition identifies it with inversion."};
 }
 if(id==='determinant-orientation'){
  const a=variant?(state.variantMode==='project'?matrix([[1,0],[0,0]]):matrix([[2,0],[0,1]])):(state.stage===1?R:product(M,R)),u=apply(a,vector([1,0])),v=apply(a,vector([0,1])),area=determinant(a),polygon=[vector([0,0]),u,u.map((x,n)=>add(x,v[n])),v];
  return{a,area,correct:variant?state.variantChoice===(state.variantMode==='project'?'project':'stretch'):state.choice==='negative',output:arrows([{label:"First column",vector:u,color:'#b27727'},{label:"Second column",vector:v,color:'#245e46'}],{polygon,title:"Oriented parallelogram spanned by the two column arrows"})+row("Current matrix and signed area",'A='+matTex(a)+',\\quad\\det A='+scalarTex(area))+row("Check orthogonality",'A^TA='+matTex(product(transpose(a),a))),variantText:state.variantMode==='project'?"The projection has area 0 and loses a direction, so it has no inverse. This differs from a reflection, whose area is 1.":"The stretch has determinant 2: it multiplies area by 2 and preserves orientation, but AᵀA≠I, so it is not a length-preserving rotation."};
 }
 if(id==='c4-vector-function'){
  const source=vector(state.probe==='x'?[1,2]:[2,1]),image=apply(C4,source),c=vector([1,0]),coeff={y:vector([0,1]),'minus-y':vector([0,-1]),'minus-x':vector([-1,0]),x:c}[state.choice]||c;
  if(variant){const forward=state.variantMode==='forward',rule=forward?rowApply:pullback,left=rule(rule(c,M),C4),right=rule(c,product(C4,M));return{left,right,correct:state.variantChoice===(forward?'different':'same'),output:row("Successive actions: reflect first, then rotate",(forward?'\\widetilde T':'T')+'(R)'+(forward?'\\widetilde T':'T')+'(M)x='+functionTex(left))+row("Apply the product operation RM directly",(forward?'\\widetilde T':'T')+'(RM)x='+functionTex(right)),variantText:forward?"Forward substitution does not preserve multiplication in this noncommuting example: successive actions give y, whereas the product operation gives −y. It reverses the order.":"Correct inverse substitution gives −y on both sides. Since (RM)⁻¹=M⁻¹R⁻¹, the order matches the successive lookups of old positions."};}
  return{source,image,coeff,correct:state.choice==='y',output:arrows([{label:"Original position",vector:source,color:'#61788a'},{label:"New position after the active 90° rotation",vector:image,color:'#245e46'}])+row("Forward action on arrows and inverse substitution in function arguments",'R='+matTex(C4)+',\\quad Rr=\\binom{-y}{x},\\quad R^{-1}r=\\binom{y}{-x}')+row("Evaluate your candidate function at the new position",'f(r_0)='+scalarTex(source[0])+',\\quad f_{\\mathrm{candidate}}='+functionTex(coeff)+',\\quad f_{\\mathrm{candidate}}(Rr_0)='+scalarTex(dot(coeff,image)))+formula('T(R)f(r)=f(R^{-1}r)')};
 }
 const t=vector([1,2]),k=variant?vector(state.variantMode==='gamma'?[0,0]:['1/4',0]):vector(['1/4','1/8']),tp=apply(inverse(S),t),kp=variant?apply(transpose(S),k):(state.choice==='unchanged'?k:apply(state.choice==='forward'?S:transpose(S),k)),old=dot(k,t),changed=dot(kp,tp),physical=apply(transpose(inverse(S)),kp);
 return{t,k,tp,kp,old,changed,physical,correct:variant?state.variantChoice===(state.variantMode==='gamma'?'identity':'minus-i'):state.choice==='transpose',output:row("Two real-space bases for the same lattice",'A=I,\\quad P='+matTex(S)+',\\quad A^{\\prime}=AP='+matTex(S))+row("Real-space coordinates change together",'t='+vecTex(t)+',\\quad t^{\\prime}=P^{-1}t='+vecTex(tp))+row("Reciprocal-space coordinates and physical vectors",'k='+vecTex(k)+',\\quad k^{\\prime}='+vecTex(kp)+',\\quad \\frac{B^{\\prime}}{2\\pi}k^{\\prime}='+vecTex(physical))+row("Compare the dot products directly",'k\\cdot t='+scalarTex(old)+',\\quad k^{\\prime}\\cdot t^{\\prime}='+scalarTex(changed))+row("Phase of the active translation",'e^{-2\\pi i k\\cdot t}='+phaseTex(old)+',\\quad e^{-2\\pi i k^{\\prime}\\cdot t^{\\prime}}='+phaseTex(changed)),variantText:state.variantMode==='gamma'?"The phase at Γ is always 1, so that point alone cannot detect an incorrect basis-change formula. Return to the nonzero-wavevector example and check both physical vectors.":"Changing the physical k changes the phase to −i; it still agrees before and after the basis change. Changing the description and changing the physical input are different operations."};
}

// Public reference records are computed from the displayed matrices rather than
// a second hardcoded answer table; all scalars are returned as rational strings.
export function matrixBridgeReference(id,{choice,probe='x',variant=false,variantChoice,variantMode,stage=2}={}){
 if(!Object.hasOwn(defs,id))throw Error('Unknown matrix bridge');
 const state={choice:choice||defs[id].answer,probe,variantChoice:variantChoice||({ 'transpose-inverse':'inverse','determinant-orientation':'stretch','c4-vector-function':'same','reciprocal-shear-phase':'minus-i'}[id]),variantMode:variantMode||({'determinant-orientation':'stretch','c4-vector-function':'inverse','reciprocal-shear-phase':'changed'}[id]),stage};
 const result=scenario(id,state,variant),plain={correct:result.correct};
 for(const [key,value] of Object.entries(result))if(Array.isArray(value))plain[key]=strings(value);else if(value&&typeof value==='object'&&'n'in value)plain[key]=str(value);
 return plain;
}
function bodyHTML(id,state){
 const def=defs[id],prefix='mb-'+id,mainReady=state.observed&&(id!=='determinant-orientation'||state.stage===2),main=state.observed?scenario(id,state):null,variant=state.variantObserved?scenario(id,state,true):null;
 const probe=id==='transpose-inverse'?select(prefix+'-probe',"Which arrow should be tracked?",[['x','(1,0)'],['general','(1,2)']],state.probe):id==='c4-vector-function'?select(prefix+'-probe',"Which original position should be tracked?",[['x','(1,2)'],['general','(2,1)']],state.probe):'';
 const variants=id==='determinant-orientation'?select(prefix+'-mode',"Operation for the variation",[['stretch',"Stretch diag(2,1)"],['project',"Projection diag(1,0)"]],state.variantMode):id==='c4-vector-function'?select(prefix+'-mode',"Which function rule should be compared?",[['inverse',"Correct inverse substitution f(R⁻¹r)"],['forward',"Incorrect forward substitution f(Rr), for comparison"]],state.variantMode):id==='reciprocal-shear-phase'?select(prefix+'-mode',"Which physical wavevector should be used instead?",[['changed','k=(1/4,0)'],['gamma',"Γ point k=(0,0)"]],state.variantMode):'';
 return `<p>${def.intro}</p><p class="mb-convention">Active action on column vectors; AB applies B before A. Predict first, then reveal the operation.</p>${id==='transpose-inverse'?formula('R='+matTex(R)):id==='determinant-orientation'?formula('A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix},\\quad\\det A=ad-bc')+formula('R='+matTex(R)+',\\quad M='+matTex(M)):id==='reciprocal-shear-phase'?formula('A^{\\prime}=AP,\\quad t^{\\prime}=P^{-1}t,\\quad k^{\\prime}=P^Tk'):''}<div class="mb-controls">${probe}${select(prefix+'-choice',def.question,[['',"Choose your prediction first"],...def.choices],state.choice)}${button(prefix+'-run',id==='determinant-orientation'?(state.stage===0?"Show step 1: rotation R":state.stage===1?"Show step 2: reflection M":"Both operations are shown"):"Show this operation",!state.choice||(id==='determinant-orientation'&&state.stage===2))}${button(prefix+'-check',"Check prediction",!mainReady)}</div><div class="mb-observation" aria-live="polite">${main?main.output:"<p class=\"mb-await\">Choose a prediction, then reveal the operation. Exact matrices and coordinates will appear here.</p>"}</div><p id="${prefix}-feedback" class="mb-feedback ${state.checked&&main?.correct?'mb-success':''}" role="status">${state.checked?esc(def.feedback[state.choice]):''}</p><details class="mb-variant" ${state.variantOpen?'open':''}><summary>Change one condition and test again</summary><div class="mb-controls">${variants}${select(prefix+'-variant-choice',def.variantQuestion,[['',"Predict the variation first"],...def.variantChoices],state.variantChoice)}${button(prefix+'-variant-run',"Show the variation comparison",!state.variantChoice)}${button(prefix+'-variant-check',"Check variation",!state.variantObserved)}</div>${id==='transpose-inverse'?formula('S='+matTex(S)):''}<div class="mb-observation">${variant?variant.output:''}</div><p id="${prefix}-variant-feedback" class="mb-feedback ${state.variantChecked&&variant?.correct?'mb-success':''}" role="status">${state.variantChecked?(variant.correct?"The check agrees for this variation.":"This variation needs another check.")+' '+esc(variant.variantText):''}</p></details><p class="mb-boundary">${esc(def.limit)}</p><p class="mb-record-note">This records the current check; it does not count toward course mastery or restrict later entry points.</p>${button(prefix+'-reset',"Restart this small experiment")}`;
}
export function matrixBridgeHTML(lessonId){
 const ids=Object.hasOwn(MATRIX_BRIDGE_HOOKS,lessonId)?MATRIX_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="mb-course-bridges" aria-label="Optional matrix concept bridges"><p class="mb-optional">Unfamiliar matrix terminology? Expand a small experiment below, then return to the original lesson; learners with the background can skip it.</p>${ids.map(id=>`<details class="mb-bridge" data-mb-bridge="${id}"><summary>${defs[id].title}</summary><div class="mb-body" data-mb-body="${id}"></div></details>`).join('')}</section>`:'';
}
export function bindMatrixBridge({root,lessonId,isCurrent=()=>true}={}){
 if(!root?.querySelectorAll)return()=>{};let alive=true;const ids=Object.hasOwn(MATRIX_BRIDGE_HOOKS,lessonId)?MATRIX_BRIDGE_HOOKS[lessonId]:[];
 for(const id of ids){
  const panel=root.querySelector(`[data-mb-bridge="${id}"]`),body=panel?.querySelector(`[data-mb-body="${id}"]`);if(!body)continue;
  let state={choice:'',probe:'x',observed:false,checked:false,stage:0,variantChoice:'',variantMode:({'determinant-orientation':'stretch','c4-vector-function':'inverse','reciprocal-shear-phase':'changed'}[id])||'',variantObserved:false,variantChecked:false,variantOpen:false};
  const active=()=>alive&&isCurrent()&&root.isConnected!==false&&root.querySelector(`[data-mb-bridge="${id}"]`)===panel;
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(id,state);const $=suffix=>body.querySelector('#mb-'+id+'-'+suffix);
   const variantDetails=body.querySelector('.mb-variant');
   const readOpen=detail=>typeof detail?.open==='boolean'?detail.open:detail?.getAttribute('open')!==null;
   variantDetails.ontoggle=()=>{if(active()&&body.querySelector('.mb-variant')===variantDetails)state.variantOpen=readOpen(variantDetails);};
   function bind(suffix,event,action){const control=$(suffix);if(control)control[event]=()=>{if(!active()||$(suffix)!==control||control.disabled)return;state.variantOpen=readOpen(body.querySelector('.mb-variant'));action(control);draw();const next=suffix==='reset'?$('choice'):suffix==='run'&&$('run')?.disabled?$('check'):$(suffix);next?.focus?.({preventScroll:true});};}
   bind('choice','onchange',c=>{state.choice=c.value;state.observed=false;state.checked=false;state.stage=0;});
   bind('probe','onchange',c=>{state.probe=c.value;state.observed=false;state.checked=false;state.stage=0;state.variantObserved=false;state.variantChecked=false;});
   bind('run','onclick',()=>{state.observed=true;state.stage=Math.min(2,state.stage+1);state.checked=false;});
   bind('check','onclick',()=>{state.checked=true;});
   bind('mode','onchange',c=>{state.variantMode=c.value;state.variantChoice='';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-choice','onchange',c=>{state.variantChoice=c.value;state.variantObserved=false;state.variantChecked=false;});
   bind('variant-run','onclick',()=>{state.variantObserved=true;state.variantChecked=false;});
   bind('variant-check','onclick',()=>{state.variantChecked=true;});
   bind('reset','onclick',()=>{state={...state,choice:'',observed:false,checked:false,stage:0,variantChoice:'',variantObserved:false,variantChecked:false,variantOpen:false};});
  }
  draw();
 }
 return()=>{alive=false;};
}
