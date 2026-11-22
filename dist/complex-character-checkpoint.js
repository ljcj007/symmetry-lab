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
  const variant = (row,star) => label(row.name)+' '+(star?'带共轭':'省略共轭');
  const cells = values => values.map(value=>`<td>${math(number(value))}</td>`).join('');
  const caption='四个操作的乘积与重数';
  const table = `<div class="pg-table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table class="pg-character-table">
    <caption>${esc(caption)}</caption><thead><tr><th scope="col">操作</th><th scope="col">待约化特征标</th>
    ${rows.map(row=>[true,false].map(star=>`<th scope="col">${variant(row,star)}</th>`).join('')).join('')}</tr></thead>
    <tbody>${operations.map((operation,i)=>`<tr data-cch-operation="${esc(operation.label)}"><th scope="row">${crystalSpan(operation.label,'operation')}</th>
      ${cells([characters[i],...products.map(terms=>terms[i])])}</tr>`).join('')}</tbody>
    <tfoot><tr data-cch-total><th scope="row" colspan="2">求和</th>${cells(sums)}</tr>
      <tr data-cch-weight><th scope="row" colspan="2">除以群阶 4</th>${cells(sums.map(sum=>scale(sum,1/4)))}</tr></tfoot></table></div>`;
  const feedback = guess===reference?'矩阵作用与预测一致。':'用正四分之一转这一列重新核对。';
  const wrongRow = rows.find(row=>row.name===guess);
  return `<p class="pg-example-result" id="cch-feedback" role="status">${feedback} ${label(reference)}</p>
    <ol><li><strong>先作用，再读本征值。</strong> ${math(String.raw`Rv=`+column(acted[positiveIndex])+'='+number(characters[positiveIndex])+column(vector))}
      <p>整条复直线属于一个一维表示。每个操作在这条线上的本征值就是该操作的特征标。</p>
      ${guess===reference?'':`<p>所选图谱行在正四分之一转这一列的值是 ${math(number(wrongRow.characters[positiveIndex]))}。这与上面的本征值不同。</p>`}</li>
    <li><strong>逐列相乘，再除以群阶。</strong> ${math(String.raw`m_\alpha=\tfrac14\sum_{g\in C_4}\chi_\alpha(g)^*\,\chi(g)`)}
      <p>四个类各有一个操作。带共轭的列先把图谱行的虚部变号，再乘待约化的特征标。若两行相同，每一项就是该特征标的模平方。</p>
      ${table}</li>
    <li><strong>用另一条复直线再做一次。</strong> 两种算法都给出非负整数，维数也都为一。在这对共轭行中，省略共轭会把权重归给另一行。换成共轭向量，预测哪一行会得到重数 1。</li></ol>
    <p><a href="#classroom/foundations?tab=atlas&amp;group=${model.groupId}" data-cch-atlas>打开点群 4 的实际特征标表 →</a></p>`;
}

export function complexCharacterCheckpointHTML(lessonId) {
  if (lessonId!=='character-reduction') return '';
  return `<details class="pg-worked" data-complex-character-entry><summary>为什么约化要取复共轭？</summary><div data-complex-character-body></div></details>`;
}

export function bindComplexCharacterCheckpoint({root,atlas,isCurrent=()=>true}) {
  const current = () => root.isConnected!==false && isCurrent();
  let model;
  try { model=readGroup(atlas); }
  catch {
    root.innerHTML='<p role="alert">无法核对点群 4 的矩阵和特征标表。请重新载入这一课。</p>';
    return;
  }
  const positive = model.operations[model.positiveIndex];
  root.innerHTML = `<p>前面的例题使用实数特征标。现在在复数域里考察点群 4 的平面箭头。取主动操作和笛卡尔列坐标，正四分之一转把 x 单位矢量送到 y 单位矢量。</p>
    <p>${crystalSpan(positive.label,'operation')} ${math('R=\\begin{pmatrix}'+positive.matrix.map(row=>row.join('&')).join('\\\\')+'\\end{pmatrix}')}</p>
    <form id="cch-form">
      <div class="controls-row">
        <label for="cch-vector">选择复向量</label><select id="cch-vector" class="form-select"><option value="1">(1, −i)</option><option value="-1">(1, +i)</option></select>
        <label for="cch-prediction">预测对应哪一行</label><select id="cch-prediction" class="form-select" required>
          <option value="">请选择</option><option value="Γ2">Γ₂</option><option value="Γ4">Γ₄</option></select>
        <button type="submit" class="secondary" id="cch-check">用矩阵与图谱核对</button>
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
      result.innerHTML='<p role="status">请先选择要核对的图谱行。</p>';
      return;
    }
    try { result.innerHTML=resultsHTML(model,decompose(model,sign),prediction.value); }
    catch { result.innerHTML='<p role="alert">无法核对点群 4 的矩阵和特征标表。请重新载入这一课。</p>'; }
    result.focus?.();
  };
}
