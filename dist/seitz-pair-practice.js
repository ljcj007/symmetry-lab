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
  <summary>动手交换旋转和平移的次序</summary>
  <p>用固定参考晶胞的列向量分数坐标。从原点出发，比较先平移再旋转与先旋转再平移。折回时，每一维按单位间隔取模。</p>
  <p>波矢用于代入平移部分的形式平面波相位。真实晶体的小群和简并还取决于实际原始晶格及完整操作。</p>
  <p id="sc-seitz-pair-operations"></p>
  <form id="sc-seitz-pair-form">
   <div class="sc-presets">
    <label>半格平移的方向<select id="sc-seitz-pair-axis">
     <option value="x">沿 x 轴 · 本课例题</option><option value="z">沿 z 轴 · 平行于旋转轴</option>
    </select></label>
    <label>沿 x 的倒易分量<select id="sc-seitz-pair-k">
     <option value="0">0</option><option value="1/2">1/2</option>
    </select></label>
    <label>预测未折回的两个终点<select id="sc-seitz-pair-prediction">
     <option value="">请选择</option><option value="same">两个终点相同</option><option value="different">两个终点不同</option>
    </select></label>
   </div>
   <div class="sc-actions">
    <button id="sc-seitz-pair-run" type="submit" class="primary">计算两个次序</button>
    <button id="sc-seitz-pair-cancel" type="button" class="secondary" hidden>取消对照</button>
   </div>
  </form>
  <p id="sc-seitz-pair-status" class="sc-small" role="status"></p>
  <div id="sc-seitz-pair-result" aria-live="polite"></div>
  <div class="sc-actions"><button id="sc-seitz-pair-derive" type="button" class="secondary">打开本例分步推导 →</button></div>
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
    !Object.hasOwn(phaseText,phase))throw Error('计算结果不符合本例的操作约定。');
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
 const feedback=prediction?(prediction===answer?'预测与结果一致。':'再比较折回之前的两个终点。'):'';
 const reason=axis==='x'?'沿 x 的半格平移在二重旋转下反号。交换次序使未折回的终点相差一个晶胞。':'沿 z 的半格平移平行于旋转轴。交换次序后，未折回的坐标也相同。';
 return `<div class="sq-scroll" tabindex="0" role="region" aria-label="Seitz 两种次序对照">
  <table><caption class="sr-only">Seitz 两种次序对照</caption><thead><tr>
   <th scope="col">乘积</th><th scope="col">从原点出发的未折回终点</th><th scope="col">折回后的坐标</th><th scope="col">参考晶胞位移</th><th scope="col">平移相位</th>
  </tr></thead><tbody>${rows.map((row,i)=>`<tr data-seitz-pair-product="${products[i]}">
   <th scope="row">${products[i]}</th>
   <td data-pair-translation="${row.translation.join(',')}">${vector(row.translation)}</td>
   <td data-pair-folded="${row.folded.join(',')}">${vector(row.folded)}</td>
   <td data-pair-cell="${row.cells.join(',')}">${vector(row.cells)}</td>
   <td data-pair-phase="${row.phase}">${math(row.phase)}</td>
  </tr>`).join('')}</tbody></table>
 </div><p>${feedback} ${reason}</p>
 <p>两行的旋转部分都是绕 z 轴的二重旋转。表中的相位只取各行未折回的平移部分。</p>
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
 cancel.onclick=()=>{if(!disposed&&isCurrent()){reset();status.textContent='已取消。可以手动重新计算。';}};
 $('#sc-seitz-pair-derive').onclick=()=>{if(!disposed&&isCurrent())return onDerive();};
 form.onsubmit=async event=>{
  event.preventDefault();
  if(disposed||!isCurrent()||submit.disabled)return;
  const selectedAxis=axis.value,guess=prediction.value,kx=momentum.value;
  if(!Object.hasOwn(halfTranslations,selectedAxis)||!halfSteps.includes(kx))return;
  reset();
  const job=revision,rows=[];
  submit.disabled=true;cancel.hidden=false;status.textContent='正在精确计算两个次序…';
  try{
   for(const input of pairRequests(selectedAxis,kx)){
    active=run('symbolic_interfaces',input);
    const result=await active;
    if(!current(job))return;
    rows.push(readProduct(result));
   }
   output.innerHTML=comparisonHTML(rows,guess,selectedAxis);
   status.textContent='已计算两个次序。';
  }catch(error){
   if(current(job))status.textContent=error?.message||'暂未完成，请手动重试。';
  }finally{
   if(current(job)){active=null;submit.disabled=false;cancel.hidden=true;}
  }
 };
 changed();
 return ()=>{disposed=true;revision++;active?.cancel?.();active=null;};
}
