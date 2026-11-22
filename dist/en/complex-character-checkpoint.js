import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';

const choices = ['Γ2','Γ4'];
const esc = text => String(text).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);
const math = tex => `<span class="sl-math" data-math-source="${esc(tex)}">${mathHTML(tex)}</span>`;
const scale = ([re,im], factor) => [re*factor,im*factor];
const add = ([a,b],[c,d]) => [a+c,b+d];
const product = ([a,b],[c,d]) => [a*c-b*d,a*d+b*c];
const conjugate = ([re,im]) => [re,-im];
const equal = ([a,b],[c,d]) => a===c && b===d;
const number = ([re,im]) => im===0?String(re):
  (re===0?'':String(re))+(im<0?'-':re===0?'':'+')+(Math.abs(im)===1?'':String(Math.abs(im)))+'i';
const column = vector => `\\begin{pmatrix}${vector.map(number).join('\\\\')}\\end{pmatrix}`;
const label = value => crystalSpan(value,'irrep');

function readGroup(atlas) {
  const group = atlas?.groups.find(group => group.id===9 && group.hm==='4' && group.order===4);
  if (!group || group.classes.length!==4 || group.classes.some(entry => entry.size!==1 || entry.operationIndices.length!==1)) {
    throw new Error('unexpected C4 classes');
  }
  const operations = group.classes.map(entry => {
    const operation = group.operations[entry.operationIndices[0]];
    const matrix = operation.matrix;
    if (entry.label!==operation.label || matrix.length!==3 ||
        !matrix.every(row => row.length===3 && row.every(Number.isInteger)) || matrix[2][0]!==0 || matrix[2][1]!==0) {
      throw new Error('operation does not preserve the xy basis');
    }
    return {label:operation.label,matrix:matrix.slice(0,2).map(row=>row.slice(0,2))};
  });
  const positiveIndex = operations.findIndex(operation=>operation.label==='C4z+');
  const positive = operations[positiveIndex];
  if (!positive || positive.matrix[0][0]!==0 || positive.matrix[0][1]!==-1 ||
      positive.matrix[1][0]!==1 || positive.matrix[1][1]!==0) throw new Error('unexpected positive rotation');
  const rows = choices.map(name => {
    const entry = group.irreps.find(row=>row.label===name && row.dimension===1);
    if (!entry || entry.characters.length!==operations.length || entry.characters.some(
      ({re,im})=>!Number.isInteger(re)||!Number.isInteger(im)||re*re+im*im!==1)) throw new Error('unexpected C4 characters');
    return {name,characters:entry.characters.map(({re,im})=>[re,im])};
  });
  return {groupId:group.id,operations,positiveIndex,rows};
}

function decompose(model, sign) {
  const vector = [[1,0],[0,-sign]];
  const acted = model.operations.map(operation=>operation.matrix.map(([a,b])=>add(scale(vector[0],a),scale(vector[1],b))));
  const characters = acted.map(([first,second])=>{
    if (!equal(second,product(first,vector[1]))) throw new Error('the vector does not span an invariant line');
    return first;
  });
  const matching = model.rows.filter(row=>characters.every((value,i)=>equal(value,row.characters[i])));
  if (matching.length!==1) throw new Error('the calculated line did not match one C4 row');
  const products = model.rows.flatMap(row=>[true,false].map(star=>characters.map((value,i)=>{
    const reference = star?conjugate(row.characters[i]):row.characters[i];
    return product(reference,value);
  })));
  const sums = products.map(terms=>terms.reduce(add,[0,0]));
  return {vector,acted,characters,reference:matching[0].name,products,sums};
}

function resultsHTML(model, reduction, guess) {
  const {positiveIndex,operations,rows} = model;
  const {vector,acted,characters,reference,products,sums} = reduction;
  const variant = (row,star) => label(row.name)+' '+(star?"with conjugation":"without conjugation");
  const cells = values => values.map(value=>`<td>${math(number(value))}</td>`).join('');
  const caption="Products for the four operations and resulting multiplicities";
  const table = `<div class="pg-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="pg-character-table">
    <caption>${esc(caption)}</caption><thead><tr><th scope="col">Operation</th><th scope="col">Input character</th>
    ${rows.map(row=>[true,false].map(star=>`<th scope="col">${variant(row,star)}</th>`).join('')).join('')}</tr></thead>
    <tbody>${operations.map((operation,i)=>`<tr data-cch-operation="${esc(operation.label)}"><th scope="row">${crystalSpan(operation.label,'operation')}</th>
      ${cells([characters[i],...products.map(terms=>terms[i])])}</tr>`).join('')}</tbody>
    <tfoot><tr data-cch-total><th scope="row" colspan="2">Sum</th>${cells(sums)}</tr>
      <tr data-cch-weight><th scope="row" colspan="2">Divide by group order 4</th>${cells(sums.map(sum=>scale(sum,1/4)))}</tr></tfoot></table></div>`;
  const feedback = guess===reference?"The matrix action agrees with your prediction.":"Check the positive quarter-turn column again.";
  const wrongRow = rows.find(row=>row.name===guess);
  return `<p class="pg-example-result" id="cch-feedback" role="status">${feedback} ${label(reference)}</p>
    <ol><li><strong>Apply the rotation and read off the eigenvalue.</strong> ${math(String.raw`Rv=`+column(acted[positiveIndex])+'='+number(characters[positiveIndex])+column(vector))}
      <p>This invariant complex line carries a one-dimensional representation. Each operation acts on the line by a scalar, which is its character.</p>
      ${guess===reference?'':`<p>The row you chose gives the following character for the positive quarter-turn ${math(number(wrongRow.characters[positiveIndex]))}. The eigenvalue above gives a different character.</p>`}</li>
    <li><strong>Multiply the entries column by column and divide the sum by the group order.</strong> ${math(String.raw`m_\alpha=\tfrac14\sum_{g\in C_4}\chi_\alpha(g)^*\,\chi(g)`)}
      <p>Each of the four classes contains one operation. To form the conjugated products, reverse the sign of the imaginary part of each reference character before multiplying it by the input character. When both rows match, each product is the squared magnitude of the character.</p>
      ${table}</li>
    <li><strong>Repeat with the other complex line.</strong> Both calculations give nonnegative integers and total dimension one. Omitting conjugation assigns the multiplicity to the other row of this conjugate pair. Switch to the conjugate vector and predict which row will have multiplicity 1.</li></ol>
    <p><a href="#classroom/foundations?tab=atlas&amp;group=${model.groupId}" data-cch-atlas>Open the character table of point group 4 →</a></p>`;
}

export function complexCharacterCheckpointHTML(lessonId) {
  if (lessonId!=='character-reduction') return '';
  return `<details class="pg-worked" data-complex-character-entry><summary>Why conjugate the reference character?</summary><div data-complex-character-body></div></details>`;
}

export function bindComplexCharacterCheckpoint({root,atlas,isCurrent=()=>true}) {
  const current = () => root.isConnected!==false && isCurrent();
  let model;
  try { model=readGroup(atlas); }
  catch {
    root.innerHTML="<p role=\"alert\">The matrices and character table for point group 4 could not be verified. Reload this lesson to try again.</p>";
    return;
  }
  const positive = model.operations[model.positiveIndex];
  root.innerHTML = `<p>The previous example uses real characters. Here we let point group 4 act on planar vectors with complex coordinates. We use active operations on Cartesian column vectors. The positive quarter-turn sends the x unit vector to the y unit vector.</p>
    <p>${crystalSpan(positive.label,'operation')} ${math('R=\\begin{pmatrix}'+positive.matrix.map(row=>row.join('&')).join('\\\\')+'\\end{pmatrix}')}</p>
    <form id="cch-form">
      <div class="controls-row">
        <label for="cch-vector">Choose a complex vector</label><select id="cch-vector" class="form-select"><option value="1">(1, −i)</option><option value="-1">(1, +i)</option></select>
        <label for="cch-prediction">Predict the matching row</label><select id="cch-prediction" class="form-select" required>
          <option value="">Choose an answer</option><option value="Γ2">Γ₂</option><option value="Γ4">Γ₄</option></select>
        <button type="submit" class="secondary" id="cch-check">Check with the matrix and atlas</button>
      </div>
    </form>
    <div id="cch-result" tabindex="-1"></div>`;
  const form=root.querySelector('#cch-form'),vector=root.querySelector('#cch-vector');
  const prediction=root.querySelector('#cch-prediction'),result=root.querySelector('#cch-result');
  vector.onchange=()=>{if(current()){ prediction.value='';result.innerHTML=''; }};
  prediction.onchange=()=>{if(current())result.innerHTML='';};
  form.onsubmit=event=>{
    event.preventDefault();if(!current())return;
    const sign=Number(vector.value);
    if(!choices.includes(prediction.value)||![1,-1].includes(sign)) {
      result.innerHTML="<p role=\"status\">Choose a row to check first.</p>";
      return;
    }
    try { result.innerHTML=resultsHTML(model,decompose(model,sign),prediction.value); }
    catch { result.innerHTML="<p role=\"alert\">The matrices and character table for point group 4 could not be verified. Reload this lesson to try again.</p>"; }
    result.focus?.();
  };
}
