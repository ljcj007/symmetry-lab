// Display and input validation only. Python constructs every CG matrix and
// performs the change of basis, including complex state amplitudes.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>{const n=Number(value);return !Number.isFinite(n)?'—':n===0?'0':Math.abs(n)<1e-5?n.toExponential(4):Number(n.toFixed(6)).toString();};
const parts=value=>typeof value==='number'?{re:value,im:0}:{re:Number(value?.re)||0,im:Number(value?.im)||0};
const complex=value=>{const {re,im}=parts(value);return im===0?fmt(re):re===0?`${fmt(im)}i`:`${fmt(re)} ${im<0?'−':'+'} ${fmt(Math.abs(im))}i`;};
const options=(items,value)=>items.map(([id,label])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
const reps=[['0,0','1 · (0, 0)'],['1,0','3 · (1, 0)'],['0,1','3̄ · (0, 1)'],['2,0','6 · (2, 0)'],['0,2','6̄ · (0, 2)'],['1,1','8 · (1, 1)']];
const repSize=(p,q)=>(p+1)*(q+1)*(p+q+2)/2;
const size=input=>repSize(input.p1,input.q1)*repSize(input.p2,input.q2);
export const cgName='SU(3) · CG 系数与换基';
export const cgDefault={p1:1,q1:0,p2:1,q2:0,direction:'product_to_coupled',state:{index:1}};
export const cgPresets={
  'cg-three-three':{experiment:'su3_cg',input:{...cgDefault}},
  'cg-three-bar':{experiment:'su3_cg',input:{p1:1,q1:0,p2:0,q2:1,direction:'product_to_coupled',state:{index:2}}},
  'cg-eight-eight':{experiment:'su3_cg',input:{p1:1,q1:1,p2:1,q2:1,direction:'product_to_coupled',state:{index:7}}},
  'cg-complex':{experiment:'su3_cg',input:{...cgDefault,state:{amplitudes:Array.from({length:9},(_,index)=>({re:index===1?Math.SQRT1_2:0,im:index===3?Math.SQRT1_2:0}))}}},
};
export const cgInputIds=['#lg-cg-rep1','#lg-cg-rep2','#lg-cg-direction','#lg-cg-mode','#lg-cg-index','#lg-cg-vector'];
export function cgControls(input){
  const custom=Array.isArray(input.state?.amplitudes),dimension=size(input);
  return `${[1,2].map(i=>`<label>第 ${i} 个 SU(3) 表示<select id="lg-cg-rep${i}">${options(reps,`${input['p'+i]},${input['q'+i]}`)}</select></label>`).join('')}<label>换基方向<select id="lg-cg-direction">${options([['product_to_coupled','乘积基 → 耦合基（C†）'],['coupled_to_product','耦合基 → 乘积基（C）']],input.direction)}</select></label><label>输入态方式<select id="lg-cg-mode">${options([['basis','一个基底态'],['vector','自定义复振幅向量']],custom?'vector':'basis')}</select></label><label>输入基底索引（从 0 开始）<input id="lg-cg-index" type="number" min="0" max="${dimension-1}" step="1" value="${custom?0:esc(input.state?.index??0)}"><span class="lg-muted" id="lg-cg-size-hint">本次空间 ${dimension} 维；计算后可按完整标签选择基底态。</span></label><label class="lg-cg-vector-label">复振幅向量（JSON）<textarea id="lg-cg-vector" rows="4" spellcheck="false" placeholder='[1, 0, {"re":0,"im":1}, …]'>${custom?esc(JSON.stringify(input.state.amplitudes)):''}</textarea><span class="lg-muted" id="lg-cg-vector-hint">选择自定义向量时填写 ${dimension} 项；每项为实数或 {"re":实部,"im":虚部}。保留输入的范数，范数平方范围 10⁻²⁴ 到 10¹²；测量概率按范数平方归一化。</span></label><div class="lg-presets"><button type="button" data-lg-physics-preset="cg-three-three">CG · 3 ⊗ 3</button><button type="button" data-lg-physics-preset="cg-three-bar">CG · 3 ⊗ 3̄</button><button type="button" data-lg-physics-preset="cg-eight-eight">CG · 8 ⊗ 8</button><button type="button" data-lg-physics-preset="cg-complex">复相位叠加</button></div><p class="lg-hint">输入表示满足 p + q ≤ 2，总维数不超过 64。系数采用实验明确给出的基底与相位约定；重复表示还需指定副本。先计算，再用右侧的完整基底标签探索换基。</p>`;
}
function readReps($){
  const input={};for(const i of [1,2]){const value=$('#lg-cg-rep'+i)?.value;if(!reps.some(([id])=>id===value))throw Error('请选择列表中的 SU(3) 表示（p + q ≤ 2）。');[input['p'+i],input['q'+i]]=value.split(',').map(Number);}return input;
}
export function readCGPayload($,read){
  const input=readReps($),direction=$('#lg-cg-direction')?.value,mode=$('#lg-cg-mode')?.value,dimension=size(input);
  if(!['product_to_coupled','coupled_to_product'].includes(direction))throw Error('请选择有效的换基方向。');
  if(!['basis','vector'].includes(mode))throw Error('请选择一个基底态或自定义复振幅向量。');
  let state;
  if(mode==='basis')state={index:read('#lg-cg-index',0,dimension-1,true)};
  else{
    let amplitudes;try{amplitudes=JSON.parse($('#lg-cg-vector')?.value||'');}catch{throw Error('复振幅向量需要是有效的 JSON 数组。');}
    if(!Array.isArray(amplitudes)||amplitudes.length!==dimension)throw Error(`复振幅向量必须包含 ${dimension} 项，与本次空间维数一致。`);
    const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e6*(1+1e-12);
    if(amplitudes.some(value=>typeof value==='number'?!finite(value):!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!['re','im'].includes(key))||!finite(Object.hasOwn(value,'re')?value.re:0)||!finite(Object.hasOwn(value,'im')?value.im:0)))throw Error('每项须为有限实数，或仅包含 re、im 的复数对象；绝对值不超过 10⁶。');
    const squaredNorm=amplitudes.reduce((sum,value)=>{const z=parts(value);return sum+z.re*z.re+z.im*z.im;},0);if(squaredNorm<1e-24*(1-1e-12)||squaredNorm>1e12*(1+1e-12))throw Error('输入态的范数平方须在 10⁻²⁴ 到 10¹² 之间（边界采用 10⁻¹² 相对容差）。');
    state={amplitudes:amplitudes.map(parts)};
  }
  return {...input,direction,state};
}
// Refresh labels and index bounds without discarding the other form fields.
export function bindCGControls(root,current){
  const $=selector=>root.querySelector(selector),refresh=()=>{if(!current())return;try{const dimension=size(readReps($)),index=$('#lg-cg-index');index.max=String(dimension-1);if(Number(index.value)>=dimension)index.value='0';const mode=$('#lg-cg-mode').value;index.disabled=mode==='vector';$('#lg-cg-vector').disabled=mode!=='vector';$('#lg-cg-size-hint').textContent=`本次空间 ${dimension} 维；计算后可按完整标签选择基底态。`;$('#lg-cg-vector-hint').textContent=`选择自定义向量时填写 ${dimension} 项；每项为实数或 {"re":实部,"im":虚部}。保留输入的范数，范数平方范围 10⁻²⁴ 到 10¹²；测量概率按范数平方归一化。`;}catch{/* Submission explains invalid injected values. */}};
  for(const id of ['#lg-cg-rep1','#lg-cg-rep2','#lg-cg-mode'])if($(id))$(id).onchange=refresh;
  refresh();
}

const basisLabel=(item,index)=>item?.label||`基底 ${index}`;
const table=(labels,values,caption,probabilities=null)=>`<div class="lg-table-scroll"><table class="lg-data-table lg-cg-amplitudes"><caption>${esc(caption)}</caption><thead><tr><th>索引 · 基底标签</th><th>复振幅</th><th>${probabilities?'归一化概率':'|振幅|²'}</th></tr></thead><tbody>${values.map((value,index)=>({value,index,z:parts(value)})).filter(({z,index})=>probabilities?probabilities[index]>1e-20:Math.hypot(z.re,z.im)>1e-10).map(({value,index,z})=>`<tr><td>${index} · ${esc(basisLabel(labels[index],index))}</td><td>${esc(complex(value))}</td><td>${fmt(probabilities?probabilities[index]:z.re*z.re+z.im*z.im)}</td></tr>`).join('')}</tbody></table></div>`;
function matrixHeatmap(result){
  const n=result.dimension,cell=360/n,step=n<=12?1:n<=36?4:8;
  return `<svg class="lg-visual lg-cg-heatmap" viewBox="0 0 470 450" role="img" aria-label="CG 换基矩阵热图：行是乘积基，列是耦合基"><title>完整 CG 矩阵；蓝色为正实部、橙色为负实部，色深表示绝对值。悬停查看系数。</title><text x="246" y="22" text-anchor="middle" class="lg-svg-label">列：耦合基索引</text>${Array.from({length:n},(_,i)=>i).filter(i=>i%step===0||i===n-1).map(i=>`<text x="${66+(i+.5)*cell}" y="46" text-anchor="middle" class="lg-cg-axis">${i}</text><text x="56" y="${58+(i+.65)*cell}" text-anchor="end" class="lg-cg-axis">${i}</text>`).join('')}${result.cgMatrix.flatMap((row,i)=>row.map((value,j)=>{const z=parts(value),m=Math.min(1,Math.hypot(z.re,z.im));return `<rect x="${66+j*cell}" y="${58+i*cell}" width="${cell}" height="${cell}" fill="${m<1e-10?'#f4f6ef':Math.abs(z.im)>1e-10?'#82629c':z.re<0?'#b7863c':'#4383a2'}" fill-opacity="${m<1e-10?1:.2+.8*m}"><title>C[${i}, ${j}] = ${esc(complex(value))}; ${esc(basisLabel(result.productBasis[i],i))} ← ${esc(basisLabel(result.coupledBasis[j],j))}</title></rect>`;})).join('')}<rect x="66" y="58" width="360" height="360" fill="none" stroke="#cad8bf"/><text x="246" y="443" text-anchor="middle" class="lg-svg-label">行：乘积基索引；C = ⟨乘积基|耦合基⟩</text></svg>`;
}
function slice(result,direction,index){
  const column=direction==='column',values=column?result.cgMatrix.map(row=>row[index]):result.cgMatrix[index],labels=column?result.productBasis:result.coupledBasis;
  return `<p class="lg-hint">${column?'选定耦合态在乘积基中的展开：C 的一列。':'选定乘积态到各耦合态的系数：C 的一行取共轭。'}振幅保留符号与相位；低于 10⁻¹⁰ 的项在表中省略。</p>${table(labels,column?values:values.map(value=>{const z=parts(value);return {re:z.re,im:-z.im};}),column?basisLabel(result.coupledBasis[index],index):basisLabel(result.productBasis[index],index))}`;
}
function completeMatrix(result){
  return `<div class="lg-table-scroll lg-cg-full-matrix"><table class="lg-data-table"><caption>行：乘积基；列：耦合基。标签与数值同时保留在 JSON 导出中。</caption><thead><tr><th>i / j</th>${result.coupledBasis.map((item,j)=>`<th title="${esc(basisLabel(item,j))}">${j}</th>`).join('')}</tr></thead><tbody>${result.cgMatrix.map((row,i)=>`<tr><th title="${esc(basisLabel(result.productBasis[i],i))}">${i}</th>${row.map(value=>`<td>${esc(complex(value))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function blockTable(result){
  return `<details class="lg-generator"><summary>不可约分量、副本与列索引</summary><div class="lg-table-scroll"><table class="lg-data-table lg-cg-blocks"><thead><tr><th>表示 (p, q)</th><th>副本</th><th>矩阵列</th><th>交换宇称</th></tr></thead><tbody>${(result.blocks||[]).map(block=>`<tr><td>${esc(block.label)} (${block.p}, ${block.q})</td><td>${esc(block.copy)}</td><td>${block.start}–${block.end-1}</td><td><span class="lg-cg-parity">${block.swapParity===1?'＋ 对称':block.swapParity===-1?'− 反对称':'不适用'}</span></td></tr>`).join('')}</tbody></table></div><p class="lg-hint">相同因子的直积可按交换宇称区分分量；8 ⊗ 8 的两个八维副本分别取对称与反对称嵌入。每个副本内部的重权仍由基底标签区分。单独改变基向量的相位会改变 CG 振幅的符号。</p></details>`;
}
export function cgOutput(result){
  const outputBasis=result.direction==='coupled_to_product'?result.productBasis:result.coupledBasis;
  return `<pre class="lg-formula">${esc(result.decompositionText||`${result.factors.map(factor=>factor.label).join(' ⊗ ')} = ${result.blocks.map(block=>block.label).join(' ⊕ ')}`)}\n|耦合基⟩ = |乘积基⟩ C\na耦合 = C† a乘积；a乘积 = C a耦合</pre><p>本次 ${result.dimension} × ${result.dimension} 矩阵由 Python 构造。先观察输入态的展开，再按行或列查看其他 CG 系数。</p><p class="lg-cg-norm">输入范数平方 ${fmt(result.inputNorm)} → 输出范数平方 ${fmt(result.outputNorm)}。Python 保留输入振幅的整体尺度；下表概率按范数平方归一化。</p>${table(outputBasis,result.outputAmplitudes,'本次换基后的非零振幅',result.outputProbabilities)}<button type="button" class="secondary" id="lg-cg-reverse-state">将输出向量作为输入，反向换基</button><details class="lg-generator"><summary>核对本次输入态</summary>${table(result.direction==='coupled_to_product'?result.coupledBasis:result.productBasis,result.inputAmplitudes,'输入振幅与基底',result.inputProbabilities)}</details>${blockTable(result)}<div class="lg-cg-matrix-section"><h4>逐个查看 CG 系数</h4><label class="lg-filter">选择耦合基（查看矩阵列）<select id="lg-cg-column">${options(result.coupledBasis.map((item,i)=>[i,`${i} · ${basisLabel(item,i)}`]),0)}</select></label><button type="button" class="secondary" id="lg-cg-use-column">以此耦合态为初态，换到乘积基</button><div id="lg-cg-column-panel">${slice(result,'column',0)}</div><label class="lg-filter">选择乘积基（查看矩阵行）<select id="lg-cg-row">${options(result.productBasis.map((item,i)=>[i,`${i} · ${basisLabel(item,i)}`]),0)}</select></label><button type="button" class="secondary" id="lg-cg-use-row">以此乘积态为初态，换到耦合基</button><div id="lg-cg-row-panel">${slice(result,'row',0)}</div><details class="lg-generator" id="lg-cg-map-details"><summary>展开完整矩阵热图</summary><div id="lg-cg-map-panel"></div></details><details class="lg-generator" id="lg-cg-matrix-details"><summary>展开完整系数表（${result.dimension} × ${result.dimension}）</summary><div id="lg-cg-matrix-panel"></div></details></div><div class="lg-checks">${Object.entries(result.checks||{}).map(([name,value])=>`<div><span>${esc(({unitarity:'幺正残差',intertwining:'生成元交织残差',roundtrip:'往返换基残差',stateNorm:'范数残差',weightConservation:'权守恒残差',exchange:'交换对称残差'})[name]||name)}</span><code>${Number.isFinite(Number(value))?Number(value).toExponential(2):esc(value)}</code></div>`).join('')}</div><details class="lg-generator"><summary>本次计算的基底与相位约定</summary>${(Array.isArray(result.convention)?result.convention:[result.convention||'']).map(note=>`<p>${esc(note)}</p>`).join('')}<ol>${(result.derivation||[]).map(step=>`<li>${esc(step)}</li>`).join('')}</ol></details>`;
}
export function bindCGOutput(root,result,current,runWithInput){
  const $=selector=>root.querySelector(selector),valid=selector=>{const value=Number($(selector)?.value);return Number.isInteger(value)&&value>=0&&value<result.dimension?value:null;};
  const reverse=$('#lg-cg-reverse-state');if(reverse)reverse.onclick=()=>{if(!current()||typeof runWithInput!=='function')return;return runWithInput({direction:result.direction==='product_to_coupled'?'coupled_to_product':'product_to_coupled',state:{amplitudes:result.outputAmplitudes.map(value=>({...parts(value)}))}});};
  for(const [kind,id] of [['column','#lg-cg-column'],['row','#lg-cg-row']]){
    const control=$(id);if(control)control.onchange=()=>{if(!current())return;const index=valid(id);if(index!==null)$(id+'-panel').innerHTML=slice(result,kind,index);};
    const button=$('#lg-cg-use-'+kind);if(button)button.onclick=()=>{if(!current())return;const index=valid(id);if(index!==null&&typeof runWithInput==='function')return runWithInput({direction:kind==='column'?'coupled_to_product':'product_to_coupled',state:{index}});};
  }
  for(const [id,panel,render] of [['#lg-cg-map-details','#lg-cg-map-panel',matrixHeatmap],['#lg-cg-matrix-details','#lg-cg-matrix-panel',completeMatrix]]){
    const details=$(id);let rendered=false;if(details)details.ontoggle=()=>{if(!current()||!details.open||rendered)return;$(panel).innerHTML=render(result);rendered=true;};
  }
}
