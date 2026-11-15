import {mathHTML} from './math-display.js?v=20261113-prose2';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const fmt=value=>value===0?'0':String(Number(value.toPrecision(7)));
const owners=new WeakMap();
const C2=[[-1,0,0],[0,-1,0],[0,0,1]],C4=[[0,-1,0],[1,0,0],[0,0,1]],C3=[[0,0,1],[1,0,0],[0,1,0]],I=[[1,0,0],[0,1,0],[0,0,1]],INV=[[-1,0,0],[0,-1,0],[0,0,-1]];
const complete=(tensor,generators)=>({preset:'custom',tensor,orientation_deg:0,field:[1,0,0],strain:[1,0,0,0,0,1],parameters:{},plane:'xy',samples:12,generators:generators.map(([rotation,time_reversal])=>({rotation,time_reversal})),replay:true});
const cases=[
 {id:'c2-dielectric',label:"C₂: first remove xz and yz",lesson:'neumann',count:4,input:complete('dielectric',[[C2,false]])},
 {id:'c4-dielectric',label:"C₄: then relate xx and yy",lesson:'neumann',count:2,input:complete('dielectric',[[C4,false]])},
 {id:'cubic-dielectric',label:"O: proper cubic rotations",lesson:'neumann',count:1,input:complete('dielectric',[[C4,false],[C3,false]])},
 {id:'tilted-c2-dielectric',label:"Tilted C₂: test G-self-adjointness and ordinary transpose symmetry",lesson:'neumann',count:4,input:complete('dielectric',[[[['-7/9','4/9','4/9'],['4/9','-1/9','8/9'],['4/9','8/9','-1/9']],false]])},
 {id:'inversion-magnetoelectric',label:"i: spatial inversion",lesson:'magnetoelectricity',count:0,input:complete('magnetoelectric',[[INV,false]])},
 {id:'time-magnetoelectric',label:"1′: time reversal",lesson:'magnetoelectricity',count:0,input:complete('magnetoelectric',[[I,true]])},
 {id:'antiinversion-magnetoelectric',label:"i′: inversion combined with time reversal",lesson:'magnetoelectricity',count:9,input:complete('magnetoelectric',[[INV,true]])},
];
export const tensorReplayTeachingInputs=()=>clone(cases);
export function tensorReplayTeachingRequest(id){const item=cases.find(x=>x.id===id);if(!item)throw Error("Unknown tensor replay example.");return clone(item.input);}
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
const option=(id,label,rows,value)=>`<label for="${id}">${esc(label)}<select id="${id}">${rows.map(([key,title])=>`<option value="${esc(key)}"${String(key)===String(value)?' selected':''}>${esc(title)}</option>`).join('')}</select></label>`;
const equation=tex=>`<div class="tr-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
function scalarTex(value){return String(value).replace(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))[eE]([+-]?\d+)$/,'$1\\times10^{$2}').replace(/sqrt\(([^()]*)\)/g,'\\sqrt{$1}').replace(/\*\*/g,'^').replace(/\*/g,'\\,');}
function matrixHTML(matrix,{numeric=false,label=''}={}){
 if(!Array.isArray(matrix)||!matrix.length)return "<p>Empty matrix.</p>";
 const tex='\\begin{bmatrix}'+matrix.map(row=>row.map(x=>numeric?scalarTex(fmt(x)):scalarTex(x)).join('&')).join('\\\\')+'\\end{bmatrix}';
 try{return `<div class="tr-matrix" tabindex="0"${label?` aria-label="${esc(label)}"`:''}>${mathHTML(tex,true)}</div>`;}
 catch{return `<pre class="tr-matrix" data-math-ignore>${esc(matrix.map(row=>row.join('  ')).join('\n'))}</pre>`;}
}
const vectorHTML=(vector,settings)=>matrixHTML(vector.map(x=>[x]),settings);
const numericMatrix=(matrix,n,m=n)=>Array.isArray(matrix)&&matrix.length===n&&matrix.every(row=>Array.isArray(row)&&row.length===m&&row.every(finite));
const exactMatrix=(matrix,n,m=n)=>Array.isArray(matrix)&&matrix.length===n&&matrix.every(row=>Array.isArray(row)&&row.length===m&&row.every(x=>typeof x==='string'&&x.length<=150));
const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,value,k)=>sum+value*b[k][j],0)));
const matvec=(a,b)=>a.map(row=>row.reduce((sum,value,i)=>sum+value*b[i],0));
const maxAbs=values=>Math.max(0,...values.flat().map(Math.abs));
const subtract=(a,b)=>a.map((row,i)=>row.map((x,j)=>x-b[i][j]));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));

/** Parse only finite decimal/scientific numbers or one simple rational slash. */
export function parseTensorSeed(text,dimension){
 if(typeof text!=='string'||text.length>1200)throw Error("The seed input is too long.");
 let raw=text.trim();if(raw.startsWith('[')&&raw.endsWith(']'))raw=raw.slice(1,-1);
 const parts=raw.split(/[,，;；\s]+/).filter(Boolean),number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
 if(parts.length!==dimension)throw Error("The number of seed components must equal the current coordinate dimension.");
 return parts.map(part=>{const fields=part.split('/');if(fields.length>2||!fields.every(x=>number.test(x)))throw Error("Seed components must be decimals, scientific notation, or simple fractions.");const numerator=Number(fields[0]),denominator=fields.length===2?Number(fields[1]):1,value=numerator/denominator;if(!finite(value)||!finite(numerator)||!finite(denominator)||denominator===0||Math.abs(value)>1e8)throw Error("Seed components must be finite, have nonzero denominators, and have absolute values no greater than 10⁸.");return value;});
}

export function tensorReplayModel(result){
 const replay=result?.replay;if(!replay)return {status:'absent'};
 if(replay.schema!=='symmetry-lab-tensor-replay-1')return {status:'invalid'};
 if(replay.available!==true)return {status:'unavailable',reason:replay.reason||''};
 const n=replay.coordinates?.dimension,m=replay.constraints?.shape?.[0];
 if(![6,9].includes(n)||replay.coordinates.order?.length!==n||!numericMatrix(replay.coordinates.metricNumeric,n)||!exactMatrix(replay.coordinates.metric,n)||!numericMatrix(replay.projectorNumeric,n)||!exactMatrix(replay.projector,n)||!Array.isArray(replay.generators)||!replay.generators.length||!Number.isInteger(m)||m<1||!numericMatrix(replay.constraints.matrixNumeric,m,n)||!exactMatrix(replay.constraints.matrix,m,n)||!exactMatrix(replay.constraints.rref,m,n)||!Array.isArray(replay.constraints.pivots)||!Array.isArray(replay.constraints.nullspace)||replay.coordinates.basis?.length!==n)return {status:'invalid'};
 const group=replay.finiteGroup;if(!group?.certified||!Number.isInteger(group.order)||group.order<1||group.order>96||group.operations?.length!==group.order)return {status:'invalid'};
 for(const op of [...replay.generators,...group.operations])if(!numericMatrix(op.actionNumeric,n)||!exactMatrix(op.action,n)||!exactMatrix(op.rotation,3))return {status:'invalid'};
 for(const op of replay.generators)if(!exactMatrix(op.constraint,n))return {status:'invalid'};
 for(const basis of replay.coordinates.basis)if(!exactMatrix(basis.matrix,3))return {status:'invalid'};
 if(replay.constraints.nullspace.some(column=>!Array.isArray(column)||column.length!==n||!column.every(x=>typeof x==='string')))return {status:'invalid'};
 return {status:'available',replay,dimension:n};
}

export function tensorReplayLessonHTML(lessonId){
 if(!['neumann','magnetoelectricity'].includes(lessonId))return '';
 return `<section class="tensor-replay-lesson" data-tr-lesson="${esc(lessonId)}"><h3>Follow each constraint behind the allowed form</h3><p>Predict the independent components, then copy a complete model to the existing experiment. Follow its representation columns, linear equations, and group average.</p><details data-tr-lesson-details><summary>Open the tensor derivation</summary><div data-tr-lesson-body></div></details></section>`;
}

export function bindTensorReplayLesson({root,lessonId,isCurrent=()=>true,onCopy,stateStore=new Map()}){
 const card=root?.querySelector?.('[data-tr-lesson]'),body=card?.querySelector('[data-tr-lesson-body]'),detail=card?.querySelector('[data-tr-lesson-details]');
 if(!body||card.dataset.trLesson!==lessonId)return ()=>{};
 const store=stateStore instanceof Map?stateStore:new Map(),key='lesson:'+lessonId,choices=cases.filter(x=>x.lesson===lessonId),state={open:false,caseId:choices[0].id,prediction:'',note:'',...(store.get(key)||{})},owner={};let alive=true;
 owners.set(body,owner);const active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const capture=()=>{if(!active())return;state.open=readOpen(detail);state.caseId=body.querySelector('#tr-lesson-case')?.value||state.caseId;state.prediction=body.querySelector('#tr-lesson-prediction')?.value??state.prediction;state.note=body.querySelector('#tr-lesson-note')?.value??state.note;store.set(key,clone(state));};
 if(!choices.some(x=>x.id===state.caseId))state.caseId=choices[0].id;
 detail.open=state.open;
 body.innerHTML=`<p>${lessonId==='neumann'?"A symmetric dielectric tensor starts with six intrinsic components. Compare C₂, C₄, and the proper cubic rotation group O.":"A general static magnetoelectric tensor starts with nine components, without assuming transpose symmetry. Compare i, 1′, and i′."}</p>${option('tr-lesson-case',"Choose a complete comparison model",choices.map(x=>[x.id,x.label]),state.caseId)}<label for="tr-lesson-prediction">Predict the dimension of the allowed space:<input id="tr-lesson-prediction" inputmode="numeric" value="${esc(state.prediction)}"></label><label for="tr-lesson-note">Explain where the constraints come from<textarea id="tr-lesson-note" rows="2">${esc(state.note)}</textarea></label><button type="button" class="primary" id="tr-lesson-copy">Copy the complete input to the tensor experiment</button><p id="tr-lesson-status" role="status">Copying replaces this experiment's input and waits for a manual run. An allowed form does not provide material constants.</p>`;
 detail.ontoggle=capture;
 for(const id of ['tr-lesson-case','tr-lesson-prediction','tr-lesson-note']){const node=body.querySelector('#'+id);node[id==='tr-lesson-case'?'onchange':'oninput']=capture;}
 const copy=body.querySelector('#tr-lesson-copy');copy.onclick=()=>{if(!active()||body.querySelector('#tr-lesson-copy')!==copy)return false;capture();return onCopy?.(tensorReplayTeachingRequest(state.caseId));};
 return ()=>{if(!alive)return;capture();alive=false;if(owners.get(body)===owner)owners.delete(body);detail.ontoggle=null;copy.onclick=null;for(const id of ['tr-lesson-case','tr-lesson-prediction','tr-lesson-note']){const node=body.querySelector('#'+id);if(node){node.onchange=null;node.oninput=null;}}};
}

export function tensorReplayResultHTML(result){
 const model=tensorReplayModel(result);
 if(model.status==='absent')return "<aside class=\"tensor-replay-result tr-note\"><h3>Follow how each constraint is constructed</h3><p>Select “Replay constraints and group averaging”, then run again manually. Older results retain their original allowed form.</p></aside>";
 if(model.status==='unavailable')return `<aside class="tensor-replay-result tr-note"><h3>Scope of this replay</h3><p>${esc(model.reason)}</p><p>Interpret the original tensor solution as reported. A finite-group average is shown only when supplied by this calculation.</p></aside>`;
 if(model.status!=='available')return "<aside class=\"tensor-replay-result tr-note\"><p>This replay format is not supported. The original allowed form remains available; check the version and run again.</p></aside>";
 return "<section class=\"tensor-replay-result\" data-tr-result><h3>From generators to the allowed subspace in this calculation</h3><p>Exact matrices come from this calculation. Editable seeds are projected numerically; use the exact matrices to check the identities.</p><p>This replay checks the teaching model defined by the supplied generators. The material navigator provides context; it does not certify a material's symmetry or constants.</p><div data-tr-result-body></div></section>";
}

export function bindTensorReplayResult({root,result,isCurrent=()=>true,stateStore=new Map(),stateKey='result'}){
 const model=tensorReplayModel(result),body=root?.querySelector?.('[data-tr-result-body]');if(!body||model.status!=='available')return ()=>{};
 const r=model.replay,n=model.dimension,store=stateStore instanceof Map?stateStore:new Map(),owner={},state={stage:1,operation:'generator:0',column:0,row:0,meanCountRaw:String(r.finiteGroup.order),seed:Array.from({length:n},(_,i)=>i+1).join(', '),prediction:'',checked:false,note:'',metricOpen:false,checksOpen:false,...(store.get(stateKey)||{})};let alive=true;
 owners.set(body,owner);const active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const $=suffix=>body.querySelector('#tr-'+suffix),bindings=[];
 const allOperations=[...r.generators.map((op,i)=>({key:'generator:'+i,label:"Input generator "+(i+1),op})),...r.finiteGroup.operations.map((op,i)=>({key:'group:'+i,label:"Finite-group operation "+(i+1),op}))];
 if(!allOperations.some(x=>x.key===state.operation))state.operation=allOperations[0].key;
 state.column=Math.max(0,Math.min(n-1,Number(state.column)||0));state.row=Math.max(0,Math.min(r.constraints.shape[0]-1,Number(state.row)||0));if(typeof state.meanCountRaw!=='string')state.meanCountRaw=String(r.finiteGroup.order);state.stage=Math.max(1,Math.min(4,Number(state.stage)||1));
 const save=()=>store.set(stateKey,clone(state));
 const capture=()=>{if(!active())return;for(const [id,key]of [['operation','operation'],['column','column'],['row','row'],['average','meanCountRaw'],['seed','seed'],['prediction','prediction'],['note','note']]){const node=$(id);if(node)state[key]=['column','row'].includes(key)?Number(node.value):String(node.value);}if($('metric'))state.metricOpen=readOpen($('metric'));if($('checks'))state.checksOpen=readOpen($('checks'));save();};
 const attach=(suffix,event,callback)=>{const node=$(suffix);if(!node)return;const fn=()=>{if(!active()||$(suffix)!==node||node.disabled)return;capture();callback(node);save();};node[event]=fn;bindings.push([node,event,fn]);};
 body.innerHTML=`<p class="tr-scope">Apply Cartesian symmetry to the full tensor. The coordinate basis below already incorporates intrinsic index symmetries. Static dielectric and general magnetoelectric tensors have different starting dimensions.</p><div class="tr-controls">${option('tr-operation',"Choose an operation",allOperations.map(x=>[x.key,x.label]),state.operation)}${option('tr-column',"Follow a column: input coordinate basis",r.coordinates.order.map((x,i)=>[i,x]),state.column)}${option('tr-row',"Choose an original constraint row",Array.from({length:r.constraints.shape[0]},(_,i)=>[i,String(i+1)]),state.row)}</div><div class="tr-step-controls"><button type="button" class="secondary" id="tr-step">Reveal the next step</button><button type="button" class="secondary" id="tr-first">Return to step 1</button><span id="tr-stage-status" role="status"></span></div><div id="tr-ledger"></div><section id="tr-average-section" hidden><h4>④ Group average and adjustable seed</h4><label for="tr-average">How many initial finite-group operations should be included?<input id="tr-average" type="number" min="1" max="${r.finiteGroup.order}" step="1" value="${esc(state.meanCountRaw)}"></label><div class="tr-step-controls"><button type="button" class="secondary" id="tr-average-first">Start averaging from the identity</button><button type="button" class="secondary" id="tr-average-next">Include the next operation</button></div><p>The complete Reynolds operator includes every operation. A partial average need not be a projector, although an initial sequence that happens to form a subgroup can be an exception.</p><div id="tr-average-output"></div><label for="tr-seed">Seed coordinates in the order above; simple fractions such as 1/2 are accepted<textarea id="tr-seed" rows="2">${esc(state.seed)}</textarea></label><div class="tr-step-controls"><button type="button" class="secondary" id="tr-seed-zero">Use a zero seed</button><button type="button" class="secondary" id="tr-seed-rational">Use a rational seed</button></div>${option('tr-prediction',"Predict whether the complete group average gives zero",[['',"Not selected"],['zero',"is zero"],['nonzero',"Nonzero"]],state.prediction)}<button type="button" class="secondary" id="tr-check">Check the current prediction</button><div id="tr-seed-output" role="status"></div><p>Decimals and fractions are projected numerically here (≈); this is not a new exact symbolic solve. A zero seed always gives zero. An allowed parameter does not require a nonzero value in a material.</p></section><label for="tr-note">My derivation notes<textarea id="tr-note" rows="2">${esc(state.note)}</textarea></label>`;
 function paint(){
  if(!active())return;const op=allOperations.find(x=>x.key===state.operation)?.op||r.generators[0],j=state.column,row=r.constraints.matrix[state.row],basis=r.coordinates.basis[j];
  let html=`<h4>① Ordered intrinsic basis and metric</h4><p>Coordinate order:${esc(r.coordinates.order.join(', '))}; dimension ${n}. The current column corresponds to ${esc(r.coordinates.order[j])} in the tensor basis:</p>${matrixHTML(basis.matrix)}<details id="tr-metric"${state.metricOpen?' open':''}><summary>View the Gram metric of the intrinsic coordinates</summary>${matrixHTML(r.coordinates.metric)}${equation('\\langle x,y\\rangle=x^T G y,\\qquad P^T G=GP')}<p>${n===6?"An off-diagonal basis tensor has a component in each of two positions, so its squared length is 2.":"The nine ordered components of the general magnetoelectric tensor are independent. In this Cartesian basis G=I; xy and yx are not merged."}Orthogonality uses G here; the coordinate projector need not satisfy Pᵀ=P.</p></details>`;
  if(state.stage>=2)html+=`<h4>② Construct the operation one column at a time</h4><p>Time-reversal flag for this operation:${op.timeReversal?"yes":"no"}; determinant ${esc(op.determinant)}; total parity factor for this property ${esc(op.parity)}。</p>${equation('T^{\\prime}=s_g R T R^T')}${equation(n===6?'s_g=1':'s_g=\\tau\\det R,\\qquad \\tau=(-1)^{t_g}')}<p>Spatial operation matrix:</p>${matrixHTML(op.rotation)}<p>Full coordinate action D(g):</p>${matrixHTML(op.action)}<p>Selected column D(g)e_j:</p>${vectorHTML(op.action.map(line=>line[j]))}<p>Transform each full basis tensor, then expand it in the same intrinsic basis. No αᵢⱼ=αⱼᵢ condition is imposed on the general magnetoelectric tensor.</p>`;
  if(state.stage>=3){const retainedRows=r.constraints.rref.filter(line=>line.some(x=>String(x)!=='0')),nullColumns=r.constraints.nullspace;html+=`<h4>③ Turn invariance into equations</h4>${equation('(D(g)-I)x=0,\\qquad A x=0')}<p>Constraints from the input generators are stacked in their original order. This row belongs to input generator ${Math.floor(state.row/n)+1} ; its D(g)−I is:</p>${matrixHTML(r.generators[Math.floor(state.row/n)].constraint)}<p>Selected row ${state.row+1} :</p>${matrixHTML([row])}${equation('\\sum_j A_{rj}x_j=0')}<p>Nonzero rows of the returned RREF:</p>${retainedRows.length?matrixHTML(retainedRows):"<p>There are no nonzero constraint rows.</p>"}<p>Rank ${r.constraints.rank}; nullspace dimension ${r.constraints.nullity}. Pivot columns (counting from 1):${esc(r.constraints.pivots.map(x=>x+1).join(', ')||"None")}。</p><p>Nullspace basis vectors as columns:</p>${nullColumns.length?matrixHTML(transpose(nullColumns)):"<p>The allowed subspace contains only the zero tensor.</p>"}<p>Elimination finds the common nullspace directly. The finite-group average below independently constructs the same invariant subspace.</p>`;}
  $('ledger').innerHTML=html;const metric=$('metric');if(metric){metric.open=state.metricOpen;metric.ontoggle=()=>{if(active()&&$('metric')===metric){state.metricOpen=readOpen(metric);save();}};}
  $('stage-status').textContent="No. "+state.stage+" / 4";$('step').disabled=state.stage>=4;$('average-section').hidden=state.stage<4;
  if(state.stage>=4)paintAverage();
 }
 function paintAverage(){
  if(!active())return;const rawText=$('average').value,raw=Number(rawText),order=r.finiteGroup.order;state.meanCountRaw=rawText;if(!String(rawText).trim()||!Number.isInteger(raw)||raw<1||raw>order){$('average-next').disabled=true;$('average-output').innerHTML="<p role=\"alert\">The operation count must be an integer within the displayed range.</p>";paintSeed();return;}
  const average=Array.from({length:n},()=>Array(n).fill(0));for(const op of r.finiteGroup.operations.slice(0,raw))for(let a=0;a<n;a++)for(let b=0;b<n;b++)average[a][b]+=op.actionNumeric[a][b]/raw;
  const error=maxAbs(subtract(multiply(average,average),average)),projector=r.projectorNumeric,metric=r.coordinates.metricNumeric,transposeError=maxAbs(subtract(transpose(projector),projector)),metricError=maxAbs(subtract(multiply(transpose(projector),metric),multiply(metric,projector)));$('average-next').disabled=raw>=order;
  $('average-output').innerHTML=`<p>Included ${raw} / ${order} operations${raw===order?": complete finite-group average.":": partial average."}</p>${equation(raw===order?'P=|G|^{-1}\\sum_{g\\in G}D(g)':'Q_k=k^{-1}\\sum_{a=1}^{k}D(g_a)')}<p>Selected coordinate column of the${raw===order?"exact group average":"numeric partial average"}：</p>${vectorHTML((raw===order?r.projector:average).map(row=>row[state.column]),{numeric:raw!==order})}<p data-math-ignore>max |Q²−Q| ≈ ${fmt(error)}</p><p data-math-ignore>max |Pᵀ−P| ≈ ${fmt(transposeError)}；max |PᵀG−GP| ≈ ${fmt(metricError)}</p><details id="tr-checks"${state.checksOpen?' open':''}><summary>View the complete exact Reynolds matrix and checks</summary>${matrixHTML(r.projector)}<ul>${Object.entries(r.checks||{}).map(([key,value])=>`<li data-math-ignore>${esc(key)}：${esc(typeof value==='object'?JSON.stringify(value):String(value))}</li>`).join('')}</ul></details>`;
  const checks=$('checks');if(checks){checks.open=state.checksOpen;checks.ontoggle=()=>{if(active()&&$('checks')===checks){state.checksOpen=readOpen(checks);save();}};}
  paintSeed();
 }
 function paintSeed(){
  if(!active())return;
  try{
   const seed=parseTensorSeed($('seed').value,n),projector=r.projectorNumeric,scale=maxAbs(seed),normalized=scale===0?Array(n).fill(0):seed.map(x=>x/scale),normalizedProjection=matvec(projector,normalized),projected=normalizedProjection.map(x=>x*scale),residual=matvec(r.constraints.matrixNumeric,projected),metric=r.coordinates.metricNumeric;
   // Compare in normalized coordinates: the bound scales homogeneously with
   // the original seed and does not erase small, representable nonzero inputs.
   // gamma_n bounds the dot-product roundoff; the extra epsilon allows for
   // the exact-to-numeric matrix conversion. This is a numerical diagnostic,
   // not a symbolic proof that a nonzero seed lies in the exact kernel.
   const epsilon=Number.EPSILON,gamma=n*epsilon/(1-n*epsilon),projectorNorm=Math.max(...projector.map(row=>row.reduce((sum,x)=>sum+Math.abs(x),0))),zeroBound=(gamma+epsilon)*projectorNorm,normalizedSize=maxAbs(normalizedProjection),status=scale===0?'zero-seed':normalizedSize<=zeroBound?'compatible-zero':'resolved-nonzero',zero=status!=='resolved-nonzero',correct=state.prediction===(zero?'zero':'nonzero'),difference=normalized.map((x,i)=>x-normalizedProjection[i]),weightedDifference=matvec(metric,difference),length=scale*Math.sqrt(Math.max(0,difference.reduce((sum,x,i)=>sum+x*weightedDifference[i],0)));
   $('seed-output').innerHTML=`<div data-tr-seed-status="${status}"><p>Complete projection P x (numeric ≈):</p>${vectorHTML(projected,{numeric:true})}<p data-math-ignore>max |A P x| ≈ ${fmt(maxAbs(residual))}; G-norm of the removed part ≈ ${fmt(length)}</p><p data-math-ignore>Normalized projection magnitude ≈ ${fmt(normalizedSize)}; normalized roundoff bound ≈ ${fmt(zeroBound)}; error scale in the original coordinates ≈ ${fmt(zeroBound*scale)}</p><p>${status==='zero-seed'?"Zero seed: the projection is exactly zero.":zero?"The current projection is consistent with zero within the numerical error bound; this does not prove an exact zero.":"The current numerical precision resolves a nonzero projection."}${state.checked?(state.prediction?(correct?" The prediction is consistent with the current numerical assessment.":" Compare the seed, allowed space, and selected symmetry operations, then revise your explanation."):" Choose a prediction first."):''}</p></div>`;
  }catch(error){$('seed-output').innerHTML=`<p role="alert">${esc(error.message)}</p>`;}
 }
 for(const suffix of ['operation','column','row'])attach(suffix,'onchange',()=>paint());
 attach('step','onclick',()=>{state.stage=Math.min(4,state.stage+1);paint();});attach('first','onclick',()=>{state.stage=1;paint();});
 attach('average-first','onclick',()=>{state.meanCountRaw='1';$('average').value='1';state.checked=false;paintAverage();});attach('average-next','onclick',()=>{const count=Number($('average').value);if(!String($('average').value).trim()||!Number.isInteger(count)||count<1||count>=r.finiteGroup.order)return;state.meanCountRaw=String(count+1);$('average').value=state.meanCountRaw;state.checked=false;paintAverage();});attach('average','oninput',()=>{state.checked=false;paintAverage();});attach('seed','oninput',()=>{state.checked=false;paintSeed();});attach('prediction','onchange',()=>{state.checked=false;paintSeed();});attach('check','onclick',()=>{state.checked=true;paintSeed();});attach('note','oninput',()=>{});
 attach('seed-zero','onclick',()=>{state.seed=Array(n).fill('0').join(', ');$('seed').value=state.seed;state.checked=false;paintSeed();});attach('seed-rational','onclick',()=>{state.seed=Array.from({length:n},(_,i)=>(i+1)+'/2').join(', ');$('seed').value=state.seed;state.checked=false;paintSeed();});
 paint();save();
 const cleanup=()=>{if(!alive)return;capture();alive=false;for(const[node,event,fn]of bindings)if(node[event]===fn)node[event]=null;if(owners.get(body)===owner)owners.delete(body);};cleanup.snapshot=()=>{capture();return clone(state);};return cleanup;
}
