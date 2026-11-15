import {mathHTML} from './math-display.js?v=20261113-prose2';
import {createSpinColorViewer} from './spincolor-viewer.js?v=20261110-en1';

// This panel displays actual spin_actions Python replies. JavaScript does not
// construct rotations, apply antiunitary operators, or classify stabilizers.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const owners=new WeakMap();
export const SPIN_ACTION_LESSONS=Object.freeze({'color-03':'color_theta','spin-03':'spin_stabilizer','spin-04':'soc_locking'});
const kinds=new Set(Object.values(SPIN_ACTION_LESSONS));
const label={color_theta:'颜色交换与时间反演：从同一张图走到不同算符',spin_stabilizer:'逐个固定磁矩：从秩走到纯自旋稳定子',soc_locking:'逐点匹配与 SOC 锁定：分别检验两条规则'};
const states=[['plus','等权实叠加'],['circular','带相对 i 的等权叠加'],['up','上自旋基矢'],['generic','一般复振幅参照'],['custom','自定义两个复分量']];
const moments=[['triangular','三个共面 120° 磁矩'],['collinear','共线磁矩'],['zero','全零磁矩'],['noncoplanar','张成三维的磁矩'],['custom','自定义有序磁矩']];
const operations=[['identity','恒等'],['rotation_z','绕 z 正旋转'],['plane_xy','固定 xy 平面的不正操作'],['plane_xz','固定 xz 平面的不正操作'],['time_reversal','全部磁矩取反'],['custom','自定义正交矩阵']];
const models=[['c2_point','点群：空间 C₂z 与独立自旋 C₂x'],['af_space','三维周期：共线反铁磁'],['triangular_point','点群：三角形 120° 自旋'],['helix3_space','三维周期：三层螺旋自旋'],['custom','自定义有序结构与操作']];
const defaults=experiment=>({experiment,statePreset:'plus',state:'[[1,0],[0,1]]',scalar:'[0,1]',operatorPhase:'[1,0]',momentPreset:'triangular',moments:'[[1,0,0],[0,1,0]]',positions:'',operationPreset:'plane_xy',angle:'90',operation:'[[1,0,0],[0,1,0],[0,0,-1]]',modelPreset:'c2_point',sites:'[{"id":"A","species":"X","position":[1,0,0],"moment":[0,0,1]},{"id":"B","species":"X","position":[-1,0,0],"moment":[0,0,-1]}]',periodic:false,rotation:'[[-1,0,0],[0,-1,0],[0,0,1]]',translation:'[0,0,0]',spinMatrix:'[[1,0,0],[0,-1,0],[0,0,-1]]'});
const select=(id,text,rows,value)=>`<label for="${id}">${esc(text)}<select id="${id}">${rows.map(([key,title])=>`<option value="${esc(key)}"${String(key)===String(value)?' selected':''}>${esc(title)}</option>`).join('')}</select></label>`;
const area=(id,text,value,rows=2)=>`<label for="${id}">${esc(text)}<textarea id="${id}" rows="${rows}" spellcheck="false">${esc(value)}</textarea></label>`;
const formula=text=>`<div class="sax-formula" tabindex="0">${mathHTML(text,true)}</div>`;
const scalarTex=x=>String(x).replace(/sqrt\(([^()]*)\)/g,'\\sqrt{$1}').replace(/\*\*/g,'^').replace(/\^\(([^()]*)\)/g,'^{$1}').replace(/\*/g,'\\,').replace(/\bI\b/g,'i');
function matrix(pack,text=''){
 if(!pack?.exact?.length||pack.shape?.[1]===0)return '<p>该基没有列。</p>';
 const tex='\\begin{bmatrix}'+pack.exact.map(row=>row.map(scalarTex).join('&')).join('\\\\')+'\\end{bmatrix}';
 return `<div class="sax-matrix" tabindex="0"${text?` aria-label="${esc(text)}"`:''}>${mathHTML(tex,true)}</div>`;
}
const vector=(pack,text='')=>matrix({exact:(pack?.exact||[]).map(x=>[x]),shape:[pack?.dimension||0,1]},text);
const scalar=x=>esc(x?.exact??x??'—');
const fact=(title,value)=>`<div><span>${esc(title)}</span><strong>${esc(value)}</strong></div>`;
const pass=x=>x?'是':'否';
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
function parseJSON(text,name){try{return JSON.parse(text);}catch{throw Error(name+'须为有效 JSON。');}}
function choice(value,rows,name){if(!rows.some(([key])=>key===value))throw Error(name+'须选择一个列出的选项。');return value;}
/** Assemble only the documented input fields; Python owns exact validation. */
export function spinActionsRequest(experiment,raw={}){
 if(!kinds.has(experiment))throw Error('未知的自旋操作实验。');
 const p={...defaults(experiment),...raw},input={lab:'spin_actions',experiment};
 if(experiment==='color_theta'){
  input.statePreset=choice(p.statePreset,states,'态');
  if(input.statePreset==='custom')input.state=parseJSON(p.state,'复态');
  input.scalar=parseJSON(p.scalar,'复标量');input.operatorPhase=parseJSON(p.operatorPhase,'算符相位');
 }else if(experiment==='spin_stabilizer'){
  input.momentPreset=choice(p.momentPreset,moments,'磁矩构型');
  if(input.momentPreset==='custom'){input.moments=parseJSON(p.moments,'有序磁矩');if(String(p.positions).trim())input.positions=parseJSON(p.positions,'有序位置');}
  input.operationPreset=choice(p.operationPreset,operations,'自旋操作');
  if(input.operationPreset==='rotation_z'){const angle=Number(p.angle);if(String(p.angle).trim()===''||![0,30,45,60,90,120,180].includes(angle))throw Error('转角须选择列出的精确角度。');input.angle=angle;}
  if(input.operationPreset==='custom')input.operation=parseJSON(p.operation,'自旋矩阵');
 }else{
  input.modelPreset=choice(p.modelPreset,models,'SOC 模型');
  if(input.modelPreset==='custom'){input.sites=parseJSON(p.sites,'有序站点');input.periodic=p.periodic===true;input.rotation=parseJSON(p.rotation,'空间矩阵');input.translation=parseJSON(p.translation,'平移');input.spinMatrix=parseJSON(p.spinMatrix,'独立自旋矩阵');}
 }
 return input;
}
export function spinActionsLegacyRequest(experiment,preset){
 if(experiment==='color_theta')return {lab:'color_group',preset:'c3_point',steps:3,variant:'combined'};
 const allowed=['c2_point','af_space','triangular_point','helix3_space'];
 if(!['spin_stabilizer','soc_locking'].includes(experiment)||!allowed.includes(preset))throw Error('这个局部输入不能直接复制为既有图案模型。');
 return {lab:'spin_group',preset,steps:preset==='triangular_point'||preset==='helix3_space'?3:4,variant:'combined'};
}

const questions={
 color_theta:{prompt:'把初态乘以 i 后，哪一条规则适用于时间反演？',choices:[['','尚未选择'],['conjugate','Θ(iψ)=−iΘψ'],['linear','Θ(iψ)=iΘψ'],['color','仅由颜色数决定']],answer:'conjugate',feedback:'颜色标签交换线性作用于系数；Θ 先复共轭，因此外部标量也被共轭。整体算符相位不改变 Θ²。'},
 spin_stabilizer:{prompt:'两个不平行的共面磁矩被逐个固定时，O(3) 与 SO(3) 的稳定子是否相同？',choices:[['','尚未选择'],['different','不同：O(3) 还含翻转法向的操作'],['same','相同：都可以绕法向任意旋转'],['permute','只需把两个磁矩互换']],answer:'different',feedback:'逐个固定要求在磁矩张成的平面上等于恒等。正交补是一维，O(3) 可在此取 ±1；SO(3) 仅保留 +1。'},
 soc_locking:{prompt:'独立自旋操作通过逐点图案匹配，就一定满足 SOC 锁定吗？',choices:[['','尚未选择'],['separate','还须分别比较 ε=0 与 ε=1 的锁定矩阵'],['yes','一定满足，图案相同已经足够'],['ignore','只检查空间矩阵，不必检查磁矩']],answer:'separate',feedback:'图案匹配与锁定是两个不同检验。对同一空间 R，普通磁操作要求 U=(−1)^ε det(R)R；矩阵相等后仍须检查当前有序结构。该几何检验不代替 Hamiltonian 的 SOC 对易检验。'}
};
function controls(experiment,p){
 if(experiment==='color_theta')return select('sax-state-preset','选择复态参照',states,p.statePreset)+`<div${p.statePreset==='custom'?'':' hidden'}>`+area('sax-state','复态 [[Re a,Im a],[Re b,Im b]]',p.state)+`</div>`+area('sax-scalar','外部复标量 [Re λ,Im λ]',p.scalar,1)+area('sax-phase','时间反演算符的相位 [Re η,Im η]',p.operatorPhase,1)+'<p>复态与非零算符相位由 Python 规范化。标量只允许有限实数、十进制或简单有理数字符串；不执行表达式。</p>';
 if(experiment==='spin_stabilizer')return select('sax-moment-preset','有序磁矩构型',moments,p.momentPreset)+`<div${p.momentPreset==='custom'?'':' hidden'}>`+area('sax-moments','有序磁矩 [[x,y,z],…]',p.moments)+area('sax-positions','可选的同序位置（空白使用等距位置）',p.positions)+`</div>`+select('sax-operation-preset','检验一个纯自旋操作',operations,p.operationPreset)+`<div${p.operationPreset==='rotation_z'?'':' hidden'}>`+select('sax-angle','绕 z 转角 / °',[0,30,45,60,90,120,180].map(x=>[String(x),String(x)]),p.angle)+`</div><div${p.operationPreset==='custom'?'':' hidden'}>`+area('sax-operation','精确正交的自旋矩阵 3×3',p.operation,3)+`</div>`+'<p>这里固定站点顺序，逐个检验 Umᵢ=mᵢ。位置只帮助观察，不允许用站点置换代替逐个固定。</p>';
 return select('sax-model-preset','空间与自旋图案',models,p.modelPreset)+`<div${p.modelPreset==='custom'?'':' hidden'}>`+area('sax-sites','有序站点 JSON（id、species、position、moment）',p.sites,4)+`<label class="sax-check"><input id="sax-periodic" type="checkbox"${p.periodic?' checked':''}><span>沿三个方向周期匹配</span></label>`+area('sax-rotation','空间正交矩阵 R（3×3）',p.rotation,3)+area('sax-translation','空间平移 t（3 分量）',p.translation,1)+area('sax-spin-matrix','独立自旋正交矩阵 U（3×3）',p.spinMatrix,3)+`</div>`+'<p>先检验给定 [U∥R|t] 的逐点匹配，再分别检验不带与带时间反演的锁定候选。采用同一笛卡尔坐标系。</p>';
}
function quantumHTML(q){return q?`<section><h5>经典磁矩操作与自旋因子提升分别记录</h5><p>${esc(q.convention)} ${esc(q.scope)}</p><p>这里 V 是 3×3 正旋转，D(V) 是它的 2×2 提升；完整自旋因子的矩阵部分另外记为 B。</p><p>正旋转 V：</p>${matrix(q.properRotation)}<p>自旋因子提升含反幺正部分：${pass(q.antiunitary)}。</p>${formula(q.antiunitary?'A_s=B K,\\qquad A_s^2=B B^*':'A_s=B,\\qquad A_s^2=B^2')}<p>自旋因子的 2×2 矩阵部分 B：</p>${matrix(q.unitaryPart)}<p>自旋因子的平方（不含空间轨道与 Bloch 作用）：</p>${matrix(q.square)}<p>经典矩阵的平方：</p>${matrix(q.classicalSquare)}<p>不能仅凭经典磁矩箭头的平方，判断旋量的 Kramers 条件。</p></section>`:'';}
function colorResult(r,stage){
 const m=r.matrices,s=r.states,c=r.comparison;let html='<h4>① 先声明两个不同的作用空间</h4><p>左侧颜色是两个可区分标签的抽象系数；右侧使用自旋 1/2 基底。相同的两种颜色图示不规定 Hilbert 空间算符。</p><div class="sax-pair"><section><h5>线性色交换 P</h5>'+matrix(m.swap)+'</section><section><h5>时间反演 Θ=−iσᵧK 的矩阵部分</h5>'+matrix(m.thetaUnitary)+'</section></div><p>规范化后的初态 ψ：</p>'+vector(s.initial);
 if(stage>=2)html+='<h4>② 先共轭，再乘矩阵</h4><p>Kψ：</p>'+vector(s.conjugated)+'<div class="sax-pair"><section><h5>Pψ</h5>'+vector(s.swap)+'</section><section><h5>Θψ</h5>'+vector(s.theta)+'</section></div>'+table('比较 Pψ 与 Θψ，并单独检验 Kramers 正交',['检验','Python 精确结果'],[['Pψ 与 Θψ 分量完全相同',pass(c.sameComponents)],['Pψ 与 Θψ 属于同一射线',pass(c.sameRay)],['⟨Pψ|Θψ⟩',scalar(c.overlap)],['⟨ψ|Θψ⟩',scalar(c.initialThetaOverlap)],['Θψ 与 ψ 正交',pass(c.thetaOrthogonalToInitial)]])+'<p>相同分量、相同射线和相同磁矩箭头是不同命题。</p>';
 if(stage>=3)html+='<h4>③ 把一个复标量带过算符</h4><p>本次 λ='+scalar(r.scalar)+'。下列每个向量均由本次 Python 计算返回。</p>'+table('线性与反线性对照',['作用','返回的精确分量'],[['P(λψ)',shownVector(s.swapScaled)],['λPψ',shownVector(s.scalarTimesSwap)],['Θ(λψ)',shownVector(s.thetaScaled)],['λ*Θψ',shownVector(s.conjugateScalarTimesTheta)],['λΘψ',shownVector(s.scalarTimesTheta)]])+formula('P(\\lambda\\psi)=\\lambda P\\psi,\\qquad \\Theta(\\lambda\\psi)=\\lambda^*\\Theta\\psi');
 if(stage>=4)html+='<h4>④ 比较平方与简并需要的条件</h4>'+formula('P^2=I,\\qquad \\Theta^2=(-i\\sigma_y)(-i\\sigma_y)^*=-I')+'<div class="sax-pair"><section><h5>P² 的矩阵</h5>'+matrix(m.swapSquare)+'</section><section><h5>Θ² 的矩阵</h5>'+matrix(m.thetaSquare)+'</section></div><p>第二次施加 Θ 前，还须共轭第一次的结果：</p>'+vector(s.thetaConjugated)+'<div class="sax-pair"><section><h5>P²ψ</h5>'+vector(s.swapTwice)+'</section><section><h5>Θ²ψ</h5>'+vector(s.thetaTwice)+'</section></div><p>给 Θ 乘上规范化相位 η='+scalar(r.operatorPhase)+' 后，其矩阵部分记为 B：</p>'+matrix(m.phasedThetaUnitary)+'<div class="sax-pair"><section><h5>普通矩阵平方 B²（忽略共轭的对照）</h5>'+matrix(m.phasedThetaOrdinarySquare)+'</section><section><h5>真实反幺正平方 BB*</h5>'+matrix(m.phasedThetaSquare)+'</section></div><p>把 η 改为 i：普通矩阵平方给出 +I，真实反幺正平方仍为 −I。第二次作用必须共轭第一个相位。</p><p>带相位算符再次作用后的态：</p>'+vector(s.phasedThetaTwice)+'<p>对照 Hamiltonian H：</p>'+matrix(m.hamiltonian)+'<p>ΘHΘ⁻¹：</p>'+matrix(m.thetaHamiltonian)+`<div class="sax-facts">${fact('H 与色交换 P 对易',pass(r.hamiltonian?.commutesWithSwap))}${fact('H 具有这里的 Θ 对称性',pass(r.hamiltonian?.timeReversalSymmetric))}${fact('H 的本征值',(r.hamiltonian?.eigenvalues||[]).join(', '))}</div><p>这个 H 可保留色交换却没有 Θ 对称性，也没有强制二重简并。Kramers 推论要求 Hamiltonian 具有反幺正对称性；若讨论晶体中同一 k 处的配对，还须检验该 k 是否保持。本有限二能级模型没有晶体动量。</p>`;
 return html;
}
function stabilizerResult(r,stage){
 const s=r.spinOnly;let html='<h4>① 看清被逐个固定的有序磁矩</h4><p>将磁矩作为列排成 M；其张成空间 W 决定必须固定的方向，而不是箭头的个数。</p>'+matrix(s.momentMatrix)+`<div class="sax-facts">${fact('rank M',s.rank)}${fact('正交补维数',s.classification.complementDimension)}</div>`;
 if(stage>=2)html+='<h4>② 从 RREF 和子空间读稳定子</h4><p>返回的 RREF：</p>'+matrix(s.rref)+'<p>主元列（从 1 计数）：'+esc((s.pivots||[]).map(x=>x+1).join(', ')||'—')+'。</p><p>W 的基：</p>'+matrix(s.spanBasis)+'<p>W 的正交补基：</p>'+matrix(s.complementBasis)+'<p>投到 W 的投影矩阵：</p>'+matrix(s.projector)+`<p>完整经典 O(3) 稳定子：<strong>${esc(s.classification.full)}</strong>。</p><p>保向 SO(3) 部分：<strong>${esc(s.classification.proper)}</strong>。</p><p>检验一个选定操作只是有限实例；稳定子分类来自维数及其在 W 上必须等于恒等的条件，不是穷举几帧图案。</p>`;
 if(stage>=3)html+='<h4>③ 逐个计算 Umᵢ−mᵢ</h4><p>本次 U，det U='+esc(s.determinant)+'：</p>'+matrix(s.operation)+table('逐个固定，不作站点置换',['站点','初始磁矩','变换后','差向量','固定？'],s.sitewise.map(x=>[esc(x.id),shownVector(x.initial),shownVector(x.transformed),shownVector(x.difference),pass(x.fixed)]))+`<p>全部磁矩均固定：<strong>${pass(s.preservesAll)}</strong>。</p>`;
 if(stage>=4)html+='<h4>④ 不正操作怎样作用于量子自旋？</h4>'+quantumHTML(s.quantum)+'<p>det U=−1 的经典操作不是 SU(2) 的纯幺正旋转；它可由正旋转与时间反演组合产生。经典 O(3) 稳定子与量子提升须分别解释。</p>';
 return html;
}
const siteTable=rows=>table('相同元素与周期位置匹配后，再比较磁矩',['源→目标','位置匹配','初始磁矩','变换后','目标磁矩','差向量','磁矩匹配'],rows.map(x=>[esc(x.sourceId)+' → '+esc(x.targetId??'无'),pass(x.positionMatches),shownVector(x.initial),shownVector(x.transformed),shownVector(x.target),shownVector(x.difference),pass(x.momentMatches)]));
function lockingResult(r,stage,candidate){
 const l=r.locking;let html='<h4>① 独立记录空间与自旋操作</h4><div class="sax-pair"><section><h5>空间矩阵 R</h5>'+matrix(l.rotation)+'</section><section><h5>独立自旋矩阵 U</h5>'+matrix(l.inputSpin)+'</section></div><p>空间平移 t：</p>'+vector(l.translation)+`<p>det R=${esc(l.determinant)}；空间操作保持化学结构：${pass(l.structurePreserved)}。</p>`;
 if(stage>=2)html+='<h4>② 先检验独立联合操作</h4>'+siteTable(l.original.sitewise)+`<p>给定 [U∥R|t] 保持整个图案：<strong>${pass(l.original.preservesPattern)}</strong>。</p>`;
 if(stage>=3)html+='<h4>③ 对同一个 R 分别构造两个锁定候选</h4>'+formula('U_\\varepsilon=(-1)^\\varepsilon\\det(R)R,\\qquad \\varepsilon=0,1')+table('锁定矩阵与图案匹配是两个检验',['候选','等于输入 U？','保持图案？'],l.candidates.map(x=>[x.timeReversal?'ε=1：附加时间反演':'ε=0：普通幺正磁操作',pass(x.matchesInputSpin),pass(x.preservesPattern)]))+'<p>当前选定候选的锁定矩阵：</p>'+matrix(l.candidates[candidate].matrix)+table('追踪极向量旋转、轴向因子与时间反演符号',['站点','R m','det(R) R m','最终磁矩'],l.candidates[candidate].sitewise.map(x=>[esc(x.sourceId),shownVector(x.polarRotated),shownVector(x.axialRotated),shownVector(x.transformed)]))+siteTable(l.candidates[candidate].sitewise);
 if(stage>=4)html+='<h4>④ 区分图案约束与 Hamiltonian 对称性</h4><p>先看给定独立自旋操作的提升：</p>'+quantumHTML(l.original.quantum)+'<p>再看当前锁定候选的提升：</p>'+quantumHTML(l.candidates[candidate].quantum)+'<p>本页计算有序结构和磁矩的几何作用；没有评估具体 Hamiltonian 的 SOC 对易关系。真实材料还需指定相、磁畴、能标和相互作用。</p><p>当前 Hamiltonian 检验状态：<code data-math-ignore>'+esc(l.hamiltonianSymmetry??r.hamiltonianSymmetry??'not-evaluated')+'</code>。</p>';
 return html;
}
export function spinActionsResultHTML(result,{stage=1,candidate=0}={}){
 if(spinActionsModel(result).status!=='available')return '<p role="alert">本次结果没有完整的自旋操作数据，请重新计算。</p>';
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
  body.innerHTML=`<h4>${esc(label[experiment])}</h4><p>先预测，再手动计算。下方只显示本次 Python 返回的精确矩阵、向量和逐点判断；改变输入会撤下旧结果。</p><form id="sax-form"><fieldset${busy?' disabled':''}><legend>操作与状态输入</legend><div class="sax-controls">${controls(experiment,raw)}</div><button type="submit" class="primary" id="sax-run">${busy?'Python 计算中…':'计算本页操作 →'}</button></fieldset><button type="button" class="secondary" id="sax-cancel"${busy?'':' hidden'}><span>取消本页计算</span></button></form>${error?`<p class="notice error" role="alert">${esc(error)}</p>`:''}<section class="sax-prediction">${select('sax-prediction',q.prompt,q.choices,state.prediction)}<button type="button" class="secondary" id="sax-check">核对这个预测</button><p id="sax-feedback" role="status">${state.checked?(state.prediction?(state.prediction===q.answer?'判断相符。':'请重新比较作用空间和算符。')+' '+q.feedback:'请先选择一个预测。'):''}</p></section><div id="sax-result"></div>${area('sax-note','我的解释与反例（只保留在当前页面内存）',state.note,3)}<section class="sax-legacy"><h4>与既有几何图案实验对照</h4><p>${experiment==='color_theta'?'以下打开三色图案的空间—颜色联合操作，它是另一个几何模型；不会把二色量子系数或 Θ 当作三色置换。':'以下只复制既有模型支持的完整几何输入，不传递自定义磁矩、稳定子矩阵或 Hamiltonian。图案动画不穷举连续稳定子。'}</p>${experiment==='color_theta'?'':select('sax-legacy-preset','选择既有图案对照',models.filter(([id])=>id!=='custom'),state.legacyPreset)}<button type="button" class="secondary" id="sax-copy">${experiment==='color_theta'?'复制完整三色几何对照输入':'复制完整图案对照输入'}</button><p id="sax-copy-status" role="status">${esc(copyStatus)}</p></section>`;
  body.innerHTML+='<p class="sax-method"><a href="docs/spin-actions.md">方法、输入范围与参考来源 ↗</a></p>';
  const form=$('form');form.onsubmit=e=>{e.preventDefault();if(active()&&$('form')===form&&!busy)return calculate();};
  const fields={statePreset:'state-preset',state:'state',scalar:'scalar',operatorPhase:'phase',momentPreset:'moment-preset',moments:'moments',positions:'positions',operationPreset:'operation-preset',angle:'angle',operation:'operation',modelPreset:'model-preset',sites:'sites',rotation:'rotation',translation:'translation',spinMatrix:'spin-matrix'};
  for(const [name,id]of Object.entries(fields))if($(id)){const event=['statePreset','momentPreset','operationPreset','angle','modelPreset'].includes(name)?'onchange':'oninput';bind(id,event,node=>{state.raw[name]=node.value;retire();if(event==='onchange')draw();else drawResult();});}
  bind('periodic','onchange',node=>{state.raw.periodic=node.checked;retire();drawResult();});
  bind('note','oninput',node=>{state.note=node.value;});bind('prediction','onchange',node=>{state.prediction=node.value;state.checked=false;$('feedback').textContent='';});
  bind('check','onclick',()=>{state.checked=true;const q=questions[experiment];$('feedback').textContent=state.prediction?(state.prediction===q.answer?'判断相符。':'请重新比较作用空间和算符。')+' '+q.feedback:'请先选择一个预测。';});
  bind('cancel','onclick',()=>{if(!busy)return;ticket++;cancelRun?.();busy=false;error='本页计算已取消，可修改输入后重试。';draw();});
  bind('legacy-preset','onchange',node=>{state.legacyPreset=node.value;copyStatus='';$('copy-status').textContent='';});
  bind('copy','onclick',async node=>{if(typeof onCopy!=='function'){copyStatus='当前入口未提供图案复制，请使用原课程实验按钮。';$('copy-status').textContent=copyStatus;return;}const job=++ticket;const request=spinActionsLegacyRequest(experiment,state.legacyPreset);if(busy){cancelRun?.();busy=false;}node.disabled=true;try{const accepted=await onCopy(clone(request));if(active()&&job===ticket){copyStatus=accepted===false?'本次输入尚未复制，请重试。':'完整输入已复制；请在既有实验中手动运行。';$('copy-status').textContent=copyStatus;}}catch{if(active()&&job===ticket){copyStatus='本次输入尚未复制，请重试。';$('copy-status').textContent=copyStatus;}}finally{if(active()&&$('copy')===node)node.disabled=false;}});
  drawResult();save();
 }
 async function calculate(){
  if(!active()||busy)return;let input;
  try{input=spinActionsRequest(experiment,state.raw);}catch(e){error=e.message;state.result=null;draw();return;}
  const job=++ticket;busy=true;error='';state.result=null;state.input=null;state.stage=1;state.frame=1;draw();
  try{if(typeof run!=='function')throw Error('Python 计算接口暂不可用，请重新打开课程。');const result=await run('teaching_labs',input);if(!active()||ticket!==job)return;if(spinActionsModel(result).status!=='available'||result.experiment!==experiment)throw Error('返回结果与本页操作实验不对应。');state.result=result;state.input=clone(input);}
  catch(e){if(active()&&ticket===job)error=String(e?.message||'本次计算未完成，请重试。');}
  finally{if(active()&&ticket===job){busy=false;draw();}}
 }
 function drawResult(){
  const target=$('result');if(!active()||!target)return;viewer?.destroy();viewer=null;
  if(!state.result){target.innerHTML=busy?'<p role="status">正在计算精确操作；首次使用需载入浏览器 Python 环境。</p>':'<p>尚未计算。可先写预测，再手动运行；切换输入后需要重新计算。</p>';return;}
  const result=state.result;
  target.innerHTML=`<div class="sax-result-controls"><button type="button" class="secondary" id="sax-next"${state.stage>=4?' disabled':''}>展开下一步</button><button type="button" class="secondary" id="sax-first">回到第一步</button><span id="sax-stage-status" role="status">第 ${state.stage} / 4 步</span></div>${experiment==='soc_locking'?select('sax-candidate','追踪一个 SOC 锁定候选',[['0','ε=0：普通幺正磁操作'],['1','ε=1：附加时间反演']],state.candidate):''}<div id="sax-ledger">${spinActionsResultHTML(result,state)}</div>${result.viewer?`<details data-sax-native="viewer"${state.details.viewer?' open':''}><summary>查看 Python 计算的三维磁矩与逐帧对照</summary><div id="sax-viewer"></div>${select('sax-frame','选择实际返回的一帧',result.viewer.frames.map((f,i)=>[String(i),i===0?'初始图案':experiment==='soc_locking'?(i===1?'给定独立操作':i===2?'ε=0 锁定候选':'ε=1 锁定候选'):'施加所选纯自旋操作']),String(state.frame))}<p>相机只改变视角；箭头和位置均来自 Python。不能从箭头判断完整量子相位。</p></details>`:''}<details data-sax-native="checks"${state.details.checks?' open':''}><summary>查看本次精确核验与推导</summary><ul>${result.checks.map(c=>`<li><strong>${c.passed?'通过':'未通过'} · ${esc(c.label)}</strong>${c.detail?' · '+esc(c.detail):''}</li>`).join('')}</ul>${result.steps.map(s=>`<section><h5>${esc(s.title)}</h5><p>${esc(s.explanation)}</p>${s.formula?formula(s.formula):''}</section>`).join('')}<ul>${(result.notes||[]).map(n=>'<li>'+esc(n)+'</li>').join('')}</ul></details>`;
  if(typeof download==='function')target.innerHTML+='<button type="button" class="secondary" id="sax-export">导出本页输入与精确结果</button>';
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
