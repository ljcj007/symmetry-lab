import {mathHTML} from './math-display.js?v=20261113-prose2';

export const seitzPairExercise='space-seitz-pair-folding';
const rotation=[[-1,0,0],[0,-1,0],[0,0,1]];
const identity=[[1,0,0],[0,1,0],[0,0,1]];
const fractionText={ '-1/2':'-\\frac{1}{2}', '0':'0', '1/2':'\\frac{1}{2}', '-1':'-1', '1':'1' };
const phaseText={I:'i','-I':'-i','1':'1'};
const products=['AB','BA'];
const halfTranslations={x:['1/2',0,0],z:[0,0,'1/2']};
const units={'-1/2':-1,'0':0,'1/2':1};
const halfSteps=['0','1/2'];
const math=tex=>`<span class="sl-math">${mathHTML(tex)}</span>`;
const vectorTeX=values=>'('+values.map(value=>fractionText[value]).join(',\\,')+')';
const vector=values=>math(vectorTeX(values));

export function seitzPairPracticeHTML(){
 return `<details class="sc-worked" id="sc-seitz-pair">
  <summary>Swap the order of the rotation and translation</summary>
  <p>Use fractional column vectors in a fixed reference cell. Start at the origin and compare translation followed by rotation with the reverse order. Fold each coordinate modulo one.</p>
  <p>The wavevector evaluates the formal plane-wave phase of the translation part. In a real crystal, the little group and degeneracies depend on its primitive lattice and full set of operations.</p>
  <p id="sc-seitz-pair-operations"></p>
  <form id="sc-seitz-pair-form">
   <div class="sc-presets">
    <label>Direction of the half-cell translation<select id="sc-seitz-pair-axis">
     <option value="x">x axis · worked example</option><option value="z">z axis · parallel to the rotation axis</option>
    </select></label>
    <label>Reciprocal component along x<select id="sc-seitz-pair-k">
     <option value="0">0</option><option value="1/2">1/2</option>
    </select></label>
    <label>Predict the two endpoints before folding<select id="sc-seitz-pair-prediction">
     <option value="">Choose an answer</option><option value="same">The endpoints coincide</option><option value="different">The endpoints differ</option>
    </select></label>
   </div>
   <div class="sc-actions">
    <button id="sc-seitz-pair-run" type="submit" class="primary">Compute both orders</button>
    <button id="sc-seitz-pair-cancel" type="button" class="secondary" hidden>Cancel comparison</button>
   </div>
  </form>
  <p id="sc-seitz-pair-status" class="sc-small" role="status"></p>
  <div id="sc-seitz-pair-result" aria-live="polite"></div>
  <div class="sc-actions"><button id="sc-seitz-pair-derive" type="button" class="secondary">Open the step-by-step derivation →</button></div>
 </details>`;
}

function operationHTML(axis){
 const translation=halfTranslations[axis].map(value=>fractionText[value]).join(',');
 return math('A=\\{C_{2z}\\mid(0,0,0)\\}')+' · '+math('B=\\{I\\mid('+translation+')\\}');
}

function pairRequests(axis,kx){
 const A={rotation,translation:[0,0,0]},B={rotation:identity,translation:halfTranslations[axis]};
 return [[A,B],[B,A]].map(operations=>({action:'seitz',operation:'multiply',operations,k:[kx,0,0]}));
}

function readProduct(result){
 const phase=result?.translation_phase?.expression;
 const translation=result?.translation;
 if(result?.action!=='seitz'||result.operation!=='multiply'||result.verified!==true||result.antiunitary!==false||
    JSON.stringify(result.rotation)!==JSON.stringify(rotation.map(row=>row.map(String)))||
    !Array.isArray(translation)||translation.length!==3||!translation.every(value=>Object.hasOwn(units,value))||
    !Object.hasOwn(phaseText,phase))throw Error("The result did not match the operation convention of this exercise.");
 const unwrapped=translation.map(value=>units[value]);
 const cells=unwrapped.map(value=>Math.floor(value/2));
 const folded=unwrapped.map((value,i)=>halfSteps[value-2*cells[i]]);
 return {translation,unwrapped,cells,folded,phase:phaseText[phase]};
}

function comparisonHTML(rows,prediction,axis){
 const [ab,ba]=rows;
 const difference=ba.unwrapped.map((value,i)=>(value-ab.unwrapped[i])/2);
 const same=difference.every(value=>value===0);
 const answer=same?'same':'different';
 const feedback=prediction?(prediction===answer?"Your prediction matches the result.":"Compare the two endpoints before folding again."):'';
 const reason=axis==='x'?"The twofold rotation reverses the half-cell translation along x. Swapping the order moves the endpoint by one reference cell before folding.":"The half-cell translation along z is parallel to the rotation axis. Both orders give the same coordinates before folding.";
 return `<div class="sq-scroll" tabindex="0" role="region" aria-label="Compare the two Seitz product orders">
  <table><caption class="sr-only">Compare the two Seitz product orders</caption><thead><tr>
   <th scope="col">Product</th><th scope="col">Endpoint before folding</th><th scope="col">Folded coordinates</th><th scope="col">Reference cell shift</th><th scope="col">Translation phase</th>
  </tr></thead><tbody>${rows.map((row,i)=>`<tr data-seitz-pair-product="${products[i]}">
   <th scope="row">${products[i]}</th>
   <td data-pair-translation="${row.translation.join(',')}">${vector(row.translation)}</td>
   <td data-pair-folded="${row.folded.join(',')}">${vector(row.folded)}</td>
   <td data-pair-cell="${row.cells.join(',')}">${vector(row.cells)}</td>
   <td data-pair-phase="${row.phase}">${math(row.phase)}</td>
  </tr>`).join('')}</tbody></table>
 </div><p>${feedback} ${reason}</p>
 <p>Both rows have a twofold rotation about z. Each phase in the table uses only the corresponding translation before folding.</p>
 <p data-pair-difference="${difference.join(',')}">${math('t_{BA}-t_{AB}='+vectorTeX(difference))}</p>`;
}

export function bindSeitzPairPractice(root,{run,isCurrent,onDerive}){
 const $=selector=>root.querySelector(selector);
 const form=$('#sc-seitz-pair-form'),axis=$('#sc-seitz-pair-axis'),momentum=$('#sc-seitz-pair-k');
 const prediction=$('#sc-seitz-pair-prediction'),submit=$('#sc-seitz-pair-run'),cancel=$('#sc-seitz-pair-cancel');
 const status=$('#sc-seitz-pair-status'),output=$('#sc-seitz-pair-result');
 let active=null,revision=0,disposed=false;
 const current=job=>!disposed&&isCurrent()&&job===revision;
 function reset(){
  revision++;active?.cancel?.();active=null;
  submit.disabled=false;cancel.hidden=true;status.textContent='';output.innerHTML='';
 }
 function changed(){
  if(disposed||!isCurrent())return;
  reset();
  $('#sc-seitz-pair-operations').innerHTML=operationHTML(axis.value);
 }
 for(const control of [axis,momentum,prediction])control.onchange=changed;
 cancel.onclick=()=>{if(!disposed&&isCurrent()){reset();status.textContent="Cancelled. Run the calculation again when ready.";}};
 $('#sc-seitz-pair-derive').onclick=()=>{if(!disposed&&isCurrent())return onDerive();};
 form.onsubmit=async event=>{
  event.preventDefault();
  if(disposed||!isCurrent()||submit.disabled)return;
  const selectedAxis=axis.value,guess=prediction.value,kx=momentum.value;
  if(!Object.hasOwn(halfTranslations,selectedAxis)||!halfSteps.includes(kx))return;
  reset();
  const job=revision,rows=[];
  submit.disabled=true;cancel.hidden=false;status.textContent="Computing both products exactly…";
  try{
   for(const input of pairRequests(selectedAxis,kx)){
    active=run('symbolic_interfaces',input);
    const result=await active;
    if(!current(job))return;
    rows.push(readProduct(result));
   }
   output.innerHTML=comparisonHTML(rows,guess,selectedAxis);
   status.textContent="Both products are ready.";
  }catch(error){
   if(current(job))status.textContent=error?.message||"The calculation did not finish. Try again.";
  }finally{
   if(current(job)){active=null;submit.disabled=false;cancel.hidden=true;}
  }
 };
 changed();
 return ()=>{disposed=true;revision++;active?.cancel?.();active=null;};
}
