import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';

const workedColumns=[['E','E'],['C4z+','2C_4'],['C2z','C_2'],['mx','2\\sigma_v'],['mda','2\\sigma_d']];
const escape=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const math=tex=>`<span class="sl-math" data-math-source="${escape(tex)}">${mathHTML(tex)}</span>`;
const tuple=values=>math('('+values.join(',\\,')+')');

function quadraticCharacter(matrix){
  // The atlas uses orthonormal Cartesian columns. The action on a function
  // is the pullback by R^T. Its first two components use columns 0 and 1 of R.
  const value=matrix[0][0]**2-matrix[0][1]**2;
  if(Math.abs(value)!==1||!matrix.every((row,i)=>matrix.every((other,j)=>
    row[0]*other[0]-row[1]*other[1]===(i===j&&i<2?(i===0?value:-value):0)))){
    throw new Error('This operation does not preserve the quadratic line.');
  }
  return value;
}

function readCrosswalk(atlas){
  const group=atlas.groups.find(item=>item.id===13&&item.hm==='4mm');
  if(!group||group.classes.length!==workedColumns.length)throw new Error('The 4mm point group table is required.');
  const columns=group.classes.map(entry=>{
    const position=workedColumns.findIndex(([key])=>key===entry.label);
    if(position<0||entry.size<1||entry.operationIndices.length!==entry.size)throw new Error('The 4mm classes could not be matched.');
    const matrices=entry.operationIndices.map(i=>group.operations[i].matrix);
    const first=matrices[0];
    const trace=first[0][0]+first[1][1]+first[2][2];
    const quadratic=quadraticCharacter(first);
    if(!matrices.every(matrix=>matrix[0][0]+matrix[1][1]+matrix[2][2]===trace&&quadraticCharacter(matrix)===quadratic)){
      throw new Error('The characters vary within an atlas class.');
    }
    return {operation:entry.label,position,worked:workedColumns[position][1],size:entry.size,trace,quadratic};
  });
  if(new Set(columns.map(column=>column.position)).size!==columns.length)throw new Error('The class mapping must be one-to-one.');
  const matches=group.irreps.filter(irrep=>irrep.dimension===1&&irrep.characters.length===columns.length&&
    columns.every((column,i)=>irrep.characters[i].re===column.quadratic&&irrep.characters[i].im===0));
  if(matches.length!==1)throw new Error('The quadratic line has no unique matching character row.');
  return {columns,quadraticIrrep:matches[0],groupId:group.id};
}

export function c4vCrosswalkEntryHTML(lessonId){
  if(!['representations','character-reduction'].includes(lessonId))return '';
  return `<details class="pg-worked" data-c4v-crosswalk-entry><summary>把四方点群的手算顺序对齐到图谱</summary><div data-c4v-crosswalk-body></div></details>`;
}

export function bindC4vCrosswalk({root,atlas,isCurrent=()=>true}){
  let model;
  try{model=readCrosswalk(atlas);}
  catch{
    root.innerHTML='<p role="alert">暂时无法核对 4mm 的操作和特征标。请重新打开本课。</p>';
    return;
  }
  const {columns,quadraticIrrep,groupId}=model;
  const lessonOrder=[...columns].sort((a,b)=>a.position-b.position);
  const caption='手算例题与实际图谱的逐列对照';
  root.innerHTML=`<p>打开点群 4mm 的图谱时，先按操作对齐列。本表按图谱顺序排列，用每类的笛卡尔操作矩阵计算极矢量特征标。</p>
    <p>手算的极矢量特征标 ${tuple(lessonOrder.map(column=>column.trace))} · 图谱列序下的极矢量特征标 ${tuple(columns.map(column=>column.trace))}</p>
    <div class="pg-table-wrap" tabindex="0" role="region" aria-label="${escape(caption)}"><table class="pg-character-table" data-c4v-columns>
      <caption>${escape(caption)}</caption><thead><tr><th scope="col">实际图谱列</th><th scope="col">手算例题列</th><th scope="col">类大小</th><th scope="col">矩阵的迹</th></tr></thead>
      <tbody>${columns.map(column=>`<tr data-c4v-column="${escape(column.operation)}"><th scope="row">${crystalSpan(column.operation,'operation')}</th>
        <td>${math(column.worked)}</td><td>${column.size}</td><td>${column.trace}</td></tr>`).join('')}</tbody></table></div>
    <p><a href="#classroom/foundations?tab=atlas&amp;group=${groupId}" data-c4v-atlas>打开 4mm 的实际特征标表 →</a></p>
    <p>换成一维函数基 ${math('f=x^2-y^2')}。仍按图谱列序，预测哪组镜面会给出特征标 −1。</p>
    <form id="c4v-mirror-check"><div class="controls-row">
      <label for="c4v-mirror-prediction">哪组镜面使函数变号？</label>
      <select id="c4v-mirror-prediction" class="form-select" required><option value="">请选择</option>
        <option value="axis">轴向镜面</option><option value="diagonal">对角镜面</option><option value="both">两组镜面</option></select>
      <button type="submit" class="secondary">用图谱矩阵核对</button></div></form>
    <div id="c4v-transfer-result" tabindex="-1"></div>`;
  const form=root.querySelector('#c4v-mirror-check'),prediction=root.querySelector('#c4v-mirror-prediction');
  const result=root.querySelector('#c4v-transfer-result');
  const current=()=>isCurrent()&&root.isConnected!==false;
  prediction.onchange=()=>{if(current())result.innerHTML='';};
  form.onsubmit=event=>{
    event.preventDefault();if(!current())return;
    if(!['axis','diagonal','both'].includes(prediction.value)){
      result.innerHTML='<p role="status">请先选择一项预测。</p>';
      return;
    }
    const axis=columns.find(column=>column.operation==='mx').quadratic;
    const diagonal=columns.find(column=>column.operation==='mda').quadratic;
    const answer=axis===diagonal?'both':axis===-1?'axis':'diagonal';
    const feedback=prediction.value===answer?'与矩阵计算一致。':'再比较轴向镜面和对角镜面怎样改变 x 和 y。';
    result.innerHTML=`<p class="pg-example-result" role="status">${feedback}</p>
      <p>轴向镜面改变一个坐标的符号，两个平方保持原值。对角镜面的作用互换两个平方，使它们的差变号。</p>
      <p>沿图谱列序计算得到 ${tuple(columns.map(column=>column.quadratic))} · ${crystalSpan(quadraticIrrep.mulliken,'irrep')} · ${crystalSpan(quadraticIrrep.bcLabel,'irrep')}</p>`;
    result.focus?.();
  };
}
