import {mathHTML} from './math-display.js?v=20261113-prose2';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const fmt=value=>value===0?'0':String(Number(value.toPrecision(7)));
const owners=new WeakMap();
const C2=[[-1,0,0],[0,-1,0],[0,0,1]],C4=[[0,-1,0],[1,0,0],[0,0,1]],C3=[[0,0,1],[1,0,0],[0,1,0]],I=[[1,0,0],[0,1,0],[0,0,1]],INV=[[-1,0,0],[0,-1,0],[0,0,-1]];
const complete=(tensor,generators)=>({preset:'custom',tensor,orientation_deg:0,field:[1,0,0],strain:[1,0,0,0,0,1],parameters:{},plane:'xy',samples:12,generators:generators.map(([rotation,time_reversal])=>({rotation,time_reversal})),replay:true});
const cases=[
 {id:'c2-dielectric',label:'C₂：先消去 xz、yz',lesson:'neumann',count:4,input:complete('dielectric',[[C2,false]])},
 {id:'c4-dielectric',label:'C₄：再联系 xx 与 yy',lesson:'neumann',count:2,input:complete('dielectric',[[C4,false]])},
 {id:'cubic-dielectric',label:'O：立方正旋转群',lesson:'neumann',count:1,input:complete('dielectric',[[C4,false],[C3,false]])},
 {id:'tilted-c2-dielectric',label:'斜轴 C₂：检验 G 自伴而非普通转置对称',lesson:'neumann',count:4,input:complete('dielectric',[[[['-7/9','4/9','4/9'],['4/9','-1/9','8/9'],['4/9','8/9','-1/9']],false]])},
 {id:'inversion-magnetoelectric',label:'i：纯空间反演',lesson:'magnetoelectricity',count:0,input:complete('magnetoelectric',[[INV,false]])},
 {id:'time-magnetoelectric',label:'1′：纯时间反演',lesson:'magnetoelectricity',count:0,input:complete('magnetoelectric',[[I,true]])},
 {id:'antiinversion-magnetoelectric',label:'i′：反演与时间反演组合',lesson:'magnetoelectricity',count:9,input:complete('magnetoelectric',[[INV,true]])},
];
export const tensorReplayTeachingInputs=()=>clone(cases);
export function tensorReplayTeachingRequest(id){const item=cases.find(x=>x.id===id);if(!item)throw Error('未知的张量回放示例。');return clone(item.input);}
const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
const option=(id,label,rows,value)=>`<label for="${id}">${esc(label)}<select id="${id}">${rows.map(([key,title])=>`<option value="${esc(key)}"${String(key)===String(value)?' selected':''}>${esc(title)}</option>`).join('')}</select></label>`;
const equation=tex=>`<div class="tr-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
function scalarTex(value){return String(value).replace(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))[eE]([+-]?\d+)$/,'$1\\times10^{$2}').replace(/sqrt\(([^()]*)\)/g,'\\sqrt{$1}').replace(/\*\*/g,'^').replace(/\*/g,'\\,');}
function matrixHTML(matrix,{numeric=false,label=''}={}){
 if(!Array.isArray(matrix)||!matrix.length)return '<p>空矩阵。</p>';
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
 if(typeof text!=='string'||text.length>1200)throw Error('种子输入过长。');
 let raw=text.trim();if(raw.startsWith('[')&&raw.endsWith(']'))raw=raw.slice(1,-1);
 const parts=raw.split(/[,，;；\s]+/).filter(Boolean),number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
 if(parts.length!==dimension)throw Error('种子分量数必须等于当前坐标维数。');
 return parts.map(part=>{const fields=part.split('/');if(fields.length>2||!fields.every(x=>number.test(x)))throw Error('种子只接受小数、科学记数或简单分数。');const numerator=Number(fields[0]),denominator=fields.length===2?Number(fields[1]):1,value=numerator/denominator;if(!finite(value)||!finite(numerator)||!finite(denominator)||denominator===0||Math.abs(value)>1e8)throw Error('种子须为有限数值，分母不能为零，绝对值不超过 10⁸。');return value;});
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
 return `<section class="tensor-replay-lesson" data-tr-lesson="${esc(lessonId)}"><h3>把允许形式追到每一个约束</h3><p>先预测独立分量，再把完整模型送入原实验，逐列查看表示、线性方程和群平均。</p><details data-tr-lesson-details><summary>打开张量推导入口</summary><div data-tr-lesson-body></div></details></section>`;
}

export function bindTensorReplayLesson({root,lessonId,isCurrent=()=>true,onCopy,stateStore=new Map()}){
 const card=root?.querySelector?.('[data-tr-lesson]'),body=card?.querySelector('[data-tr-lesson-body]'),detail=card?.querySelector('[data-tr-lesson-details]');
 if(!body||card.dataset.trLesson!==lessonId)return ()=>{};
 const store=stateStore instanceof Map?stateStore:new Map(),key='lesson:'+lessonId,choices=cases.filter(x=>x.lesson===lessonId),state={open:false,caseId:choices[0].id,prediction:'',note:'',...(store.get(key)||{})},owner={};let alive=true;
 owners.set(body,owner);const active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const capture=()=>{if(!active())return;state.open=readOpen(detail);state.caseId=body.querySelector('#tr-lesson-case')?.value||state.caseId;state.prediction=body.querySelector('#tr-lesson-prediction')?.value??state.prediction;state.note=body.querySelector('#tr-lesson-note')?.value??state.note;store.set(key,clone(state));};
 if(!choices.some(x=>x.id===state.caseId))state.caseId=choices[0].id;
 detail.open=state.open;
 body.innerHTML=`<p>${lessonId==='neumann'?'对称介电张量先有六个内禀分量；依次比较 C₂、C₄ 与立方正旋转群 O。':'静态一般磁电张量从九个分量出发，不预设转置对称；分别比较 i、1′ 与 i′。'}</p>${option('tr-lesson-case','选择完整对照模型',choices.map(x=>[x.id,x.label]),state.caseId)}<label for="tr-lesson-prediction">先预测：允许空间有几维？<input id="tr-lesson-prediction" inputmode="numeric" value="${esc(state.prediction)}"></label><label for="tr-lesson-note">写下约束来自哪里<textarea id="tr-lesson-note" rows="2">${esc(state.note)}</textarea></label><button type="button" class="primary" id="tr-lesson-copy">复制完整输入到张量实验</button><p id="tr-lesson-status" role="status">复制会替换本实验输入，等待手动计算。允许形式不提供真实材料常数。</p>`;
 detail.ontoggle=capture;
 for(const id of ['tr-lesson-case','tr-lesson-prediction','tr-lesson-note']){const node=body.querySelector('#'+id);node[id==='tr-lesson-case'?'onchange':'oninput']=capture;}
 const copy=body.querySelector('#tr-lesson-copy');copy.onclick=()=>{if(!active()||body.querySelector('#tr-lesson-copy')!==copy)return false;capture();return onCopy?.(tensorReplayTeachingRequest(state.caseId));};
 return ()=>{if(!alive)return;capture();alive=false;if(owners.get(body)===owner)owners.delete(body);detail.ontoggle=null;copy.onclick=null;for(const id of ['tr-lesson-case','tr-lesson-prediction','tr-lesson-note']){const node=body.querySelector('#'+id);if(node){node.onchange=null;node.oninput=null;}}};
}

export function tensorReplayResultHTML(result){
 const model=tensorReplayModel(result);
 if(model.status==='absent')return '<aside class="tensor-replay-result tr-note"><h3>想看每个约束怎样产生？</h3><p>勾选“回放约束与群平均”后手动重新计算。旧结果继续显示原有允许形式。</p></aside>';
 if(model.status==='unavailable')return `<aside class="tensor-replay-result tr-note"><h3>本次回放范围</h3><p>${esc(model.reason)}</p><p>本次原有张量求解仍按其结果解释；未提供的有限群平均不作补造。</p></aside>`;
 if(model.status!=='available')return '<aside class="tensor-replay-result tr-note"><p>回放数据格式暂不支持。原有允许形式仍可查看；请核对版本后重新计算。</p></aside>';
 return '<section class="tensor-replay-result" data-tr-result><h3>同一次计算：从生成元到允许子空间</h3><p>精确矩阵来自本次计算；可调种子使用数值近似投影。请用精确矩阵核验恒等式。</p><p>当前回放只检验所给生成元定义的教学模型；材料导航是背景，不作真实材料对称性或常数认证。</p><div data-tr-result-body></div></section>';
}

export function bindTensorReplayResult({root,result,isCurrent=()=>true,stateStore=new Map(),stateKey='result'}){
 const model=tensorReplayModel(result),body=root?.querySelector?.('[data-tr-result-body]');if(!body||model.status!=='available')return ()=>{};
 const r=model.replay,n=model.dimension,store=stateStore instanceof Map?stateStore:new Map(),owner={},state={stage:1,operation:'generator:0',column:0,row:0,meanCountRaw:String(r.finiteGroup.order),seed:Array.from({length:n},(_,i)=>i+1).join(', '),prediction:'',checked:false,note:'',metricOpen:false,checksOpen:false,...(store.get(stateKey)||{})};let alive=true;
 owners.set(body,owner);const active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const $=suffix=>body.querySelector('#tr-'+suffix),bindings=[];
 const allOperations=[...r.generators.map((op,i)=>({key:'generator:'+i,label:'输入生成元 '+(i+1),op})),...r.finiteGroup.operations.map((op,i)=>({key:'group:'+i,label:'有限群操作 '+(i+1),op}))];
 if(!allOperations.some(x=>x.key===state.operation))state.operation=allOperations[0].key;
 state.column=Math.max(0,Math.min(n-1,Number(state.column)||0));state.row=Math.max(0,Math.min(r.constraints.shape[0]-1,Number(state.row)||0));if(typeof state.meanCountRaw!=='string')state.meanCountRaw=String(r.finiteGroup.order);state.stage=Math.max(1,Math.min(4,Number(state.stage)||1));
 const save=()=>store.set(stateKey,clone(state));
 const capture=()=>{if(!active())return;for(const [id,key]of [['operation','operation'],['column','column'],['row','row'],['average','meanCountRaw'],['seed','seed'],['prediction','prediction'],['note','note']]){const node=$(id);if(node)state[key]=['column','row'].includes(key)?Number(node.value):String(node.value);}if($('metric'))state.metricOpen=readOpen($('metric'));if($('checks'))state.checksOpen=readOpen($('checks'));save();};
 const attach=(suffix,event,callback)=>{const node=$(suffix);if(!node)return;const fn=()=>{if(!active()||$(suffix)!==node||node.disabled)return;capture();callback(node);save();};node[event]=fn;bindings.push([node,event,fn]);};
 body.innerHTML=`<p class="tr-scope">笛卡尔物性作用在完整张量上；下列坐标基已施加内禀指标对称性。静态介电与一般磁电不能共用同一个起始分量数。</p><div class="tr-controls">${option('tr-operation','选择操作',allOperations.map(x=>[x.key,x.label]),state.operation)}${option('tr-column','追踪一列：输入坐标基',r.coordinates.order.map((x,i)=>[i,x]),state.column)}${option('tr-row','选择原始约束行',Array.from({length:r.constraints.shape[0]},(_,i)=>[i,String(i+1)]),state.row)}</div><div class="tr-step-controls"><button type="button" class="secondary" id="tr-step">展开下一步</button><button type="button" class="secondary" id="tr-first">从第一步回看</button><span id="tr-stage-status" role="status"></span></div><div id="tr-ledger"></div><section id="tr-average-section" hidden><h4>④ 群平均与可调种子</h4><label for="tr-average">纳入前几个有限群操作？<input id="tr-average" type="number" min="1" max="${r.finiteGroup.order}" step="1" value="${esc(state.meanCountRaw)}"></label><div class="tr-step-controls"><button type="button" class="secondary" id="tr-average-first">从单位元开始平均</button><button type="button" class="secondary" id="tr-average-next">纳入下一个操作</button></div><p>只有纳入全部操作才是完整 Reynolds 算符。中途的平均一般不保证投影；前缀偶然形成子群时可能例外。</p><div id="tr-average-output"></div><label for="tr-seed">种子坐标（按上方顺序；可输入 1/2 等简单分数）<textarea id="tr-seed" rows="2">${esc(state.seed)}</textarea></label><div class="tr-step-controls"><button type="button" class="secondary" id="tr-seed-zero">设为零种子</button><button type="button" class="secondary" id="tr-seed-rational">设为有理种子</button></div>${option('tr-prediction','先预测：完整群平均后是否为零？',[['','尚未选择'],['zero','为零'],['nonzero','非零']],state.prediction)}<button type="button" class="secondary" id="tr-check">核对当前预测</button><div id="tr-seed-output" role="status"></div><p>种子的小数与分数在此作数值投影（≈），不是新的精确符号求解。零种子总能给零响应；有允许参数也不要求真实材料取非零值。</p></section><label for="tr-note">我的推导笔记<textarea id="tr-note" rows="2">${esc(state.note)}</textarea></label>`;
 function paint(){
  if(!active())return;const op=allOperations.find(x=>x.key===state.operation)?.op||r.generators[0],j=state.column,row=r.constraints.matrix[state.row],basis=r.coordinates.basis[j];
  let html=`<h4>① 有序内禀基与度量</h4><p>坐标顺序：${esc(r.coordinates.order.join(', '))}；维数 ${n}。当前列对应 ${esc(r.coordinates.order[j])} 的张量基：</p>${matrixHTML(basis.matrix)}<details id="tr-metric"${state.metricOpen?' open':''}><summary>查看内禀坐标的 Gram 度量</summary>${matrixHTML(r.coordinates.metric)}${equation('\\langle x,y\\rangle=x^T G y,\\qquad P^T G=GP')}<p>${n===6?'对称张量的非对角基在两个位置各有一个分量，其长度平方为 2。':'一般磁电的九个有序分量独立，当前笛卡尔基的 G=I；不人为合并 xy 与 yx。'}这里的正交投影按 G 定义，不应无条件要求坐标矩阵 Pᵀ=P。</p></details>`;
  if(state.stage>=2)html+=`<h4>② 逐列构造真实操作作用</h4><p>当前操作的时间反演标记：${op.timeReversal?'是':'否'}；行列式 ${esc(op.determinant)}；本物性的总奇偶因子 ${esc(op.parity)}。</p>${equation('T^{\\prime}=s_g R T R^T')}${equation(n===6?'s_g=1':'s_g=\\tau\\det R,\\qquad \\tau=(-1)^{t_g}')}<p>空间旋转矩阵：</p>${matrixHTML(op.rotation)}<p>完整坐标作用 D(g)：</p>${matrixHTML(op.action)}<p>选定列 D(g)e_j：</p>${vectorHTML(op.action.map(line=>line[j]))}<p>每列由完整张量变换后再按同一内禀基展开；一般磁电不添加 αᵢⱼ=αⱼᵢ 条件。</p>`;
  if(state.stage>=3){const retainedRows=r.constraints.rref.filter(line=>line.some(x=>String(x)!=='0')),nullColumns=r.constraints.nullspace;html+=`<h4>③ 把不变性变成方程</h4>${equation('(D(g)-I)x=0,\\qquad A x=0')}<p>输入生成元的约束按原顺序堆叠。所选行属于第 ${Math.floor(state.row/n)+1} 个输入生成元，其 D(g)−I 为：</p>${matrixHTML(r.generators[Math.floor(state.row/n)].constraint)}<p>选择的第 ${state.row+1} 行：</p>${matrixHTML([row])}${equation('\\sum_j A_{rj}x_j=0')}<p>RREF 的非零行（不是另行求解的一张表）：</p>${retainedRows.length?matrixHTML(retainedRows):'<p>没有非零约束行。</p>'}<p>秩 ${r.constraints.rank}；零空间维数 ${r.constraints.nullity}。主元列（从 1 计数）：${esc(r.constraints.pivots.map(x=>x+1).join(', ')||'无')}。</p><p>零空间基按列排列：</p>${nullColumns.length?matrixHTML(transpose(nullColumns)):'<p>允许子空间只有零张量。</p>'}<p>消元直接求公共零空间；下面的有限群平均独立构造同一个不变子空间。</p>`;}
  $('ledger').innerHTML=html;const metric=$('metric');if(metric){metric.open=state.metricOpen;metric.ontoggle=()=>{if(active()&&$('metric')===metric){state.metricOpen=readOpen(metric);save();}};}
  $('stage-status').textContent='第 '+state.stage+' / 4 步';$('step').disabled=state.stage>=4;$('average-section').hidden=state.stage<4;
  if(state.stage>=4)paintAverage();
 }
 function paintAverage(){
  if(!active())return;const rawText=$('average').value,raw=Number(rawText),order=r.finiteGroup.order;state.meanCountRaw=rawText;if(!String(rawText).trim()||!Number.isInteger(raw)||raw<1||raw>order){$('average-next').disabled=true;$('average-output').innerHTML='<p role="alert">操作个数须为范围内的整数。</p>';paintSeed();return;}
  const average=Array.from({length:n},()=>Array(n).fill(0));for(const op of r.finiteGroup.operations.slice(0,raw))for(let a=0;a<n;a++)for(let b=0;b<n;b++)average[a][b]+=op.actionNumeric[a][b]/raw;
  const error=maxAbs(subtract(multiply(average,average),average)),projector=r.projectorNumeric,metric=r.coordinates.metricNumeric,transposeError=maxAbs(subtract(transpose(projector),projector)),metricError=maxAbs(subtract(multiply(transpose(projector),metric),multiply(metric,projector)));$('average-next').disabled=raw>=order;
  $('average-output').innerHTML=`<p>已纳入 ${raw} / ${order} 个操作${raw===order?'：完整有限群平均。':'：部分平均。'}</p>${equation(raw===order?'P=|G|^{-1}\\sum_{g\\in G}D(g)':'Q_k=k^{-1}\\sum_{a=1}^{k}D(g_a)')}<p>选定坐标列的${raw===order?'精确群平均':'数值部分平均'}：</p>${vectorHTML((raw===order?r.projector:average).map(row=>row[state.column]),{numeric:raw!==order})}<p data-math-ignore>max |Q²−Q| ≈ ${fmt(error)}</p><p data-math-ignore>max |Pᵀ−P| ≈ ${fmt(transposeError)}；max |PᵀG−GP| ≈ ${fmt(metricError)}</p><details id="tr-checks"${state.checksOpen?' open':''}><summary>查看完整精确 Reynolds 矩阵与核对项</summary>${matrixHTML(r.projector)}<ul>${Object.entries(r.checks||{}).map(([key,value])=>`<li data-math-ignore>${esc(key)}：${esc(typeof value==='object'?JSON.stringify(value):String(value))}</li>`).join('')}</ul></details>`;
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
   $('seed-output').innerHTML=`<div data-tr-seed-status="${status}"><p>完整投影 P x（数值 ≈）：</p>${vectorHTML(projected,{numeric:true})}<p data-math-ignore>max |A P x| ≈ ${fmt(maxAbs(residual))}；丢弃部分的 G 范数 ≈ ${fmt(length)}</p><p data-math-ignore>归一化投影大小 ≈ ${fmt(normalizedSize)}；归一化舍入界 ≈ ${fmt(zeroBound)}；原坐标误差尺度 ≈ ${fmt(zeroBound*scale)}</p><p>${status==='zero-seed'?'零种子：投影严格为零。':zero?'当前投影在数值误差界内与零相容；这不是精确零的证明。':'当前数值精度可分辨非零投影。'}${state.checked?(state.prediction?(correct?' 预测与当前数值判断相容。':' 请比较种子、允许空间与所选对称操作，再修改解释。'):' 请先选择预测。'):''}</p></div>`;
  }catch(error){$('seed-output').innerHTML=`<p role="alert">${esc(error.message)}</p>`;}
 }
 for(const suffix of ['operation','column','row'])attach(suffix,'onchange',()=>paint());
 attach('step','onclick',()=>{state.stage=Math.min(4,state.stage+1);paint();});attach('first','onclick',()=>{state.stage=1;paint();});
 attach('average-first','onclick',()=>{state.meanCountRaw='1';$('average').value='1';state.checked=false;paintAverage();});attach('average-next','onclick',()=>{const count=Number($('average').value);if(!String($('average').value).trim()||!Number.isInteger(count)||count<1||count>=r.finiteGroup.order)return;state.meanCountRaw=String(count+1);$('average').value=state.meanCountRaw;state.checked=false;paintAverage();});attach('average','oninput',()=>{state.checked=false;paintAverage();});attach('seed','oninput',()=>{state.checked=false;paintSeed();});attach('prediction','onchange',()=>{state.checked=false;paintSeed();});attach('check','onclick',()=>{state.checked=true;paintSeed();});attach('note','oninput',()=>{});
 attach('seed-zero','onclick',()=>{state.seed=Array(n).fill('0').join(', ');$('seed').value=state.seed;state.checked=false;paintSeed();});attach('seed-rational','onclick',()=>{state.seed=Array.from({length:n},(_,i)=>(i+1)+'/2').join(', ');$('seed').value=state.seed;state.checked=false;paintSeed();});
 paint();save();
 const cleanup=()=>{if(!alive)return;capture();alive=false;for(const[node,event,fn]of bindings)if(node[event]===fn)node[event]=null;if(owners.get(body)===owner)owners.delete(body);};cleanup.snapshot=()=>{capture();return clone(state);};return cleanup;
}
