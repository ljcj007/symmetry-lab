import {mathHTML} from './math-display.js?v=20261113-prose2';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-9?'0':Number(x.toFixed(4)).toString();
const math=tex=>`<span class="sl-math" data-math-source="${esc(tex)}">${mathHTML(tex)}</span>`;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const mv=(a,v)=>a.map(r=>dot(r,v));
const matrix=a=>`<div class="fd-matrix" style="--fd-cols:${a[0].length}" aria-label="表示矩阵">${a.flatMap(r=>r.map(x=>`<span>${fmt(x)}</span>`)).join('')}</div>`;
const table=(headers,rows)=>`<div class="fd-scroll"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const svg=(title,body,view='0 0 640 340')=>`<svg viewBox="${view}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const line=(x,y,a,b,color='#455a70',width=2)=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${width}"/>`;
const text=(x,y,value,color='#17354c',size=18)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${value}</text>`;
const THEMES=[['water','水分子 · 红外与拉曼'],['characters','矩阵、特征标与基函数'],['projection','D₃ 三角形 · 投影算符'],['splitting','SO(3) → O → D₄ 能级'],['jt','Jahn–Teller 效应'],['macro','晶体宏观对称性']];
const DEFAULTS={water:{mode:'symmetric',phase:30,amplitude:.2,channel:'ir-z',operation:'C2'},characters:{operation:'C4',basis:'xyz',basisAngle:0},projection:{operation:1,seedSite:0,irrep:'E',row:0},splitting:{delta:1,ds:.12,dt:.03,operation:'C4'},jt:{qtheta:.65,qepsilon:.25,g:1,k:1,occupancy:1},macro:{n:4,translation:.35}};
const charactersRoute='#classroom/foundations?module=demos&experiment=characters';
const waterMirrorCharacterRoute=charactersRoute+'&preset=water-mirror-xyz';
const characterPresets=new Map([
 ['quarter-turn-xy',{operation:'C4',basis:'xy'}],
 ['quarter-turn-xyz',{operation:'C4',basis:'xyz'}],
 ['water-mirror-xyz',{operation:'mirror',basis:'xyz'}]
]);
const waterRoute='#classroom/foundations?module=demos&experiment=water';
const waterSiteCount=3;
let latest=null;
const waterActionsStates=new Map();
const defaultWaterActionsLoader=()=>import('./water-actions-ui.js?v=20261116-water1');
let previousFoundationsCleanup=()=>{};
export const getFoundationsDemosResult=()=>latest;
export const foundationsDemoThemes=THEMES.map(([id,title])=>({id,title}));

const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
const mm=(a,b)=>a.map(r=>transpose(b).map(c=>dot(r,c)));
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)));
const trace=a=>a.reduce((sum,r,i)=>sum+r[i],0);
const normalize=v=>{const n=Math.hypot(...v);return n>1e-12?v.map(x=>x/n):v.map(()=>0);};
const vec=v=>`(${v.map(fmt).join(', ')})`;
const step=(n,title,body)=>`<section class="fd-step"><h4><span>${n}</span>${title}</h4>${body}</section>`;
const rotations={C4:[[0,-1,0],[1,0,0],[0,0,1]],C2:[[-1,0,0],[0,-1,0],[0,0,1]],C2x:[[1,0,0],[0,-1,0],[0,0,-1]],C3:[[0,0,1],[1,0,0],[0,1,0]],mirror:[[1,0,0],[0,-1,0],[0,0,1]],identity:identity(3)};
// Frobenius-orthonormal symmetric tensors encode the five real l=2 functions.
const dTensors=[[[ -1,0,0],[0,-1,0],[0,0,2]].map(r=>r.map(x=>x/Math.sqrt(6))),[[1,0,0],[0,-1,0],[0,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,1,0],[1,0,0],[0,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,0,1],[0,0,0],[1,0,0]].map(r=>r.map(x=>x/Math.sqrt(2))),[[0,0,0],[0,0,1],[0,1,0]].map(r=>r.map(x=>x/Math.sqrt(2)))];
const dNames=['(2z²−x²−y²)/√6','(x²−y²)/√2','√2xy','√2xz','√2yz'];
export function orbitalMatrix(operation='C4'){
 const R=rotations[operation]||rotations.C4,images=dTensors.map(Q=>mm(mm(R,Q),transpose(R)));
 return dTensors.map(Q=>images.map(image=>dot(Q.flat(),image.flat())));
}
export function charactersPreview(s){
 const full=rotations[s.operation]||rotations.C4,xy=full.slice(0,2).map(r=>r.slice(0,2));
 let original=s.basis==='xy'?xy:s.basis==='d5'?orbitalMatrix(s.operation):full;
 const n=original.length,angle=Number(s.basisAngle||0)*Math.PI/180,S=identity(n);
 S[0][0]=S[1][1]=Math.cos(angle);S[0][1]=-Math.sin(angle);S[1][0]=Math.sin(angle);
 const m=mm(mm(transpose(S),original),S),labels=s.basis==='d5'?dNames:s.basis==='xy'?['x','y']:['x','y','z'];
 return {matrix:m,originalMatrix:original,basisChange:S,trace:trace(m),fullTrace:trace(full),xyTrace:trace(xy),fullMatrix:full,xyMatrix:xy,labels,dimension:n};
}
export function characterComparisonPreview(basis){
 return ['C4','mirror'].map(operation=>{
  const first=charactersPreview({operation,basis});
  const squared=first.matrix.map(row=>row.map((_,column)=>row.reduce(
   (entry,value,index)=>entry+value*first.matrix[index][column],0
  )));
  const squaredTrace=squared.reduce((sum,row,index)=>sum+row[index],0);
  return {operation,matrix:first.matrix,trace:first.trace,squared,squaredTrace};
 });
}
const trianglePermutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]];
const triangleOperationNames=['E','C₃⁺','C₃⁻','C₂(1)','C₂(2)','C₂(3)'];
const triangleMatrices=trianglePermutations.map(perm=>perm.map((_,i)=>perm.map(destination=>Number(destination===i))));
const triangleCharacters={A1:[1,1,1,1,1,1],A2:[1,1,1,-1,-1,-1],E:[2,-1,-1,0,0,0]};
const triangleProjectors=Object.fromEntries(Object.entries(triangleCharacters).map(([irrep,characters])=>{
 const dimension=characters[0];
 const projector=triangleMatrices[0].map((row,i)=>row.map((_,j)=>
  dimension*triangleMatrices.reduce((total,matrix,g)=>total+characters[g]*matrix[i][j],0)/triangleMatrices.length
 ));
 return [irrep,projector];
}));

export function projectionPreview(s){
 const q=[2/Math.sqrt(6),-1/Math.sqrt(6),-1/Math.sqrt(6)],v=[0,1/Math.sqrt(2),-1/Math.sqrt(2)],a=[1,1,1].map(x=>x/Math.sqrt(3));
 const permutation=[...trianglePermutations[s.operation]],P=triangleMatrices[s.operation].map(row=>[...row]);
 const seed=[0,0,0];seed[s.seedSite]=1;
 const irrep=s.irrep==='A1'||s.irrep==='A2'?s.irrep:'E';
 const rowProjector=v.map(x=>q.map(y=>x*y));
 const projector=irrep==='E'&&Number(s.row)===1?rowProjector:triangleProjectors[irrep];
 const projected=mv(projector,seed);
 const norm=Math.hypot(...projected),normalized=norm>1e-9?projected.map(x=>x/norm):[0,0,0];
 const weightedImages=triangleMatrices.map((T,i)=>{const weight=irrep==='E'&&Number(s.row)===1?2*dot(v,mv(T,q))/6:triangleCharacters[irrep][0]*triangleCharacters[irrep][i]/6;return {name:triangleOperationNames[i],image:mv(T,seed),weight,weighted:mv(T,seed).map(x=>x*weight)};});
 return {matrix:P,eMatrix:[q,v].map(b=>[q,v].map(c=>dot(b,mv(P,c)))),character:P.reduce((a,r,i)=>a+r[i],0),permutation,name:triangleOperationNames[s.operation],seed,projector,characterProjector:triangleProjectors[irrep],weightedImages,projected,normalized,norm,basis:[a,q,v],transformed:mv(P,normalized)};
}
export function splittingPreview(s){
 const d=Number(s.delta),ds=Number(s.ds),dt=Number(s.dt);
 const levels=[{name:'d(z²)',irrep:'A₁',cubic:.6*d,energy:.6*d-2*ds-6*dt},{name:'d(x²−y²)',irrep:'B₁',cubic:.6*d,energy:.6*d+2*ds-dt},{name:'d(xy)',irrep:'B₂',cubic:-.4*d,energy:-.4*d+2*ds-dt},{name:'d(xz), d(yz)',irrep:'E',cubic:-.4*d,energy:-.4*d-ds+4*dt}];
 return {levels,barycenter:(levels[0].energy+levels[1].energy+levels[2].energy+2*levels[3].energy)/5};
}
export function jtPreview(s){
 const Q=Math.hypot(s.qtheta,s.qepsilon),elastic=.5*s.k*Q*Q,occupancy=({1:[1,0],2:[1,1],3:[2,1],4:[2,2]})[Number(s.occupancy)],imbalance=occupancy[0]-occupancy[1],minRadius=imbalance*s.g/s.k,extent=Math.max(2.1,minRadius+.4,Math.abs(s.qtheta)+.2,Math.abs(s.qepsilon)+.2);
 const values=(qt,qe)=>{const q=Math.hypot(qt,qe),e=.5*s.k*q*q;return {qtheta:qt,lower:e-s.g*q,upper:e+s.g*q,occupied:e-imbalance*s.g*q};};
 const slice=Array.from({length:151},(_,i)=>values(-extent+2*extent*i/150,s.qepsilon));
 const sliceMinimumTheta=Math.sqrt(Math.max(0,minRadius**2-s.qepsilon**2));
 return {Q,lower:elastic-s.g*Q,upper:elastic+s.g*Q,potential:elastic-imbalance*s.g*Q,minRadius,stabilization:imbalance*s.g*s.g/(2*s.k),linearActive:imbalance>0,occupancy,imbalance,extent,slice,slicePoint:values(s.qtheta,s.qepsilon),sliceMinima:sliceMinimumTheta>1e-10?[-sliceMinimumTheta,sliceMinimumTheta]:[0],electronicMatrix:[[s.g*s.qtheta,s.g*s.qepsilon],[s.g*s.qepsilon,-s.g*s.qtheta]]};
}
const range=(id,label,value,min,max,step)=>`<label><span>${label} <output data-output="${id}">${value}</output></span><input data-param="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,value,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${t}</option>`).join('')}</select></label>`;
const exercise=(question,steps)=>`<section class="fd-exercise"><h3>先判断，再逐步推导</h3><p>${question}</p><details><summary>展开分步答案</summary><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol></details></section>`;

function controls(theme,s){
 if(theme==='water')return select('mode','对称适应振动坐标',s.mode,[['symmetric','对称伸缩型 · A₁'],['bend','弯曲型 · A₁'],['antisymmetric','反对称伸缩型 · B₁']])+select('operation','跟踪九个位移的操作',s.operation,[['identity','E'],['C2','C₂(z)'],['mirror','σ(xz) · 分子平面'],['mirror-yz','σ(yz)']])+range('phase','示意振动相位（°）',s.phase,0,360,1)+range('amplitude','示意振幅',s.amplitude,0,.5,.025)+select('channel','检测偏振',s.channel,[['ir-z','红外 · z'],['ir-x','红外 · x'],['ir-y','红外 · y'],['raman-xx','拉曼 · xx'],['raman-xz','拉曼 · xz'],['raman-yz','拉曼 · yz']])+`<button type="button" data-action="animate">播放 / 暂停振动</button>`;
 if(theme==='characters')return select('operation','同一个几何操作',s.operation,[['C4','C₄(z) · 正四分之一圈'],['C2','C₂(z) · 半圈'],['mirror','σ(xz) · 镜面'],['identity','E · 恒等']])+select('basis','选取的表示空间',s.basis,[['xyz','完整三维矢量 (x,y,z)'],['xy','二维子空间 (x,y)'],['d5','五个实 d 基函数 · l=2']])+range('basisAngle','前两个基函数的换基角（°）',s.basisAngle||0,0,90,1);
 if(theme==='projection')return select('operation','观察操作',s.operation,[[0,'E'],[1,'C₃⁺'],[2,'C₃⁻'],[3,'C₂(1) · 沿顶点轴翻转'],[4,'C₂(2) · 沿顶点轴翻转'],[5,'C₂(3) · 沿顶点轴翻转']])+select('seedSite','投影种子',s.seedSite,[[0,'φ₁ = (1,0,0)'],[1,'φ₂ = (0,1,0)'],[2,'φ₃ = (0,0,1)']])+select('irrep','目标不可约表示',s.irrep,[['A1','A₁ 特征标投影'],['A2','A₂ 特征标投影'],['E','E 子空间 / 行投影']])+select('row','E 基底的搭档',s.row,[[0,'先用 Pᴱ 投到 E 子空间'],[1,'用 P₂₁ 从 u 构造 v 搭档']]);
 if(theme==='splitting')return select('operation','在五维基底中检查操作',s.operation,[['C4','C₄(z) · D₄ 中保留'],['C2x','C₂(x) · D₄ 中保留'],['C3','C₃(111) · O 中有，D₄ 中去掉']])+range('delta','八面体晶场 Δ（教学单位）',s.delta,0,2,.02)+range('ds','四方参数 Dₛ',s.ds,-.35,.35,.01)+range('dt','四方参数 Dₜ',s.dt,-.15,.15,.01);
 if(theme==='jt')return range('qtheta','畸变坐标 Qθ',s.qtheta,-2,2,.01)+range('qepsilon','畸变坐标 Qε',s.qepsilon,-2,2,.01)+range('g','线性耦合 g',s.g,0,2,.05)+range('k','弹性常数 k',s.k,.5,2,.05)+select('occupancy','简化二轨道电子占据',s.occupancy,[[1,'1 电子：下支占据'],[2,'2 电子：各轨道一个（Hund 示意）'],[3,'3 电子：一个空穴'],[4,'4 电子：满壳层']]);
 return select('n','尝试的旋转阶数',s.n,[[1,'1 重轴'],[2,'2 重轴'],[3,'3 重轴'],[4,'4 重轴'],[5,'5 重轴'],[6,'6 重轴']])+range('translation','伴随平移（单位：晶格长度）',s.translation,0,1,.05);
}

export function waterPreview(s){
 const theta=104.5*Math.PI/360,a=Math.sin(theta),b=Math.cos(theta),base=[[0,0],[a,b],[-a,b]],mass=[16,1,1],center=[0,b/9];
 const centered=base.map(p=>p.map((x,j)=>x-center[j])),inner=(u,v)=>u.reduce((sum,row,i)=>sum+mass[i]*dot(row,v[i]),0);
 const removeRigid=raw=>{const mean=[0,1].map(j=>raw.reduce((sum,u,i)=>sum+mass[i]*u[j],0)/18);let u=raw.map(p=>p.map((x,j)=>x-mean[j]));const inertia=centered.reduce((sum,r,i)=>sum+mass[i]*dot(r,r),0),ly=centered.reduce((sum,r,i)=>sum+mass[i]*(r[1]*u[i][0]-r[0]*u[i][1]),0),omega=ly/inertia;return u.map((v,i)=>[v[0]-omega*centered[i][1],v[1]+omega*centered[i][0]]);};
 const symmetric=removeRigid([[0,0],[a,b],[-a,b]]),rawBend=removeRigid([[0,0],[b,-a],[-b,-a]]),coefficient=inner(rawBend,symmetric)/inner(symmetric,symmetric),bend=rawBend.map((r,i)=>r.map((x,j)=>x-coefficient*symmetric[i][j])),antisymmetric=removeRigid([[0,0],[a,b],[a,-b]]);
 const patterns={symmetric,bend,antisymmetric},massNormalized=Object.fromEntries(Object.entries(patterns).map(([key,v])=>{const n=Math.sqrt(inner(v,v));return [key,v.map(r=>r.map(x=>x/n))];}));
 let u=patterns[s.mode]||symmetric;const norm=Math.max(...u.map(v=>Math.hypot(...v)));u=u.map(v=>v.map(x=>x/norm));
 const t=Math.sin(s.phase*Math.PI/180)*s.amplitude;return {positions:base.map((p,i)=>p.map((x,j)=>x+u[i][j]*t)),equilibrium:base,displacements:u,massNormalized};
}
function characterComparisonTable(label,headers,rows){
 return `<div class="fd-scroll" role="region" tabindex="0" aria-label="${esc(label)}">
  <table><caption class="sr-only">${esc(label)}</caption><thead><tr><th scope="col">操作</th>${headers.map(header=>
   `<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows.map(({operation,name,values})=>
   `<tr data-character-operation="${operation}"><th scope="row">${name}</th>${values.map(value=>
    `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function characterComparisonHTML(basis){
 const plane=basis==='xy';
 const rows=characterComparisonPreview(basis).map(row=>({
  ...row,name:math(row.operation==='C4'?'C_4(z)':'\\sigma(xz)'),
  spectrum:math((row.operation==='C4'?'+i,\\,-i':'+1,\\,-1')+(plane?'':',\\,+1'))
 }));
 const number=value=>String(value).replace('-','−');
 return `<section class="fd-exercise" aria-labelledby="fd-character-square-title">
  <h3 id="fd-character-square-title">一次特征标相同，两次呢？</h3>
  <p>本对照表示空间 ${math(plane?'(x,y)':'(x,y,z)')}。比较绕 z 轴转正四分之一圈和 xz 镜面反射。</p>
  ${characterComparisonTable('一次作用的矩阵和特征标',[math('D(g)'),math('\\chi(g)')],rows.map(row=>
   ({...row,values:[matrix(row.matrix),number(row.trace)]})))}
  <div class="controls-row">
   <label for="fd-character-square-guess">对同一个操作连续做两次，哪一个特征标更大？</label>
   <select class="form-select" id="fd-character-square-guess" aria-describedby="fd-character-square-feedback">
    <option value="">请选择</option><option value="equal">两者仍相同</option>
    <option value="rotation">四重旋转</option><option value="mirror">镜面反射</option>
   </select>
   <button id="fd-character-square-check" type="button" class="secondary" aria-controls="fd-character-square-result">核对两次作用</button>
  </div>
  <p id="fd-character-square-feedback" role="status"></p>
  <div id="fd-character-square-result" hidden>
   <ol>
    <li>先把一次作用的矩阵自乘。两次旋转使 x、y 都变号。两次镜面反射让 x、y 都复原。</li>
    <li>${plane?'在平面上，平方矩阵分别为负单位矩阵和单位矩阵。':'两种操作都固定 z，因此三维特征标各比平面的大 1。'} 再将平方矩阵的对角元相加。</li>
    <li>也可以先求本征值。旋转在复数空间中的两个平面本征值为 ${math('\\pm i')}，反射的平面本征值为 ${math('\\pm 1')}。一次作用时两对本征值各自相消，两次时先平方再求和。</li>
   </ol>
   ${characterComparisonTable('两次作用的矩阵和特征标',
    [math('D(g)^2'),math('\\chi(g^2)'),'一次作用的本征值'],
    rows.map(row=>({...row,values:[matrix(row.squared),number(row.squaredTrace),row.spectrum]})))}
  </div>
 </section>`;
}
function bindCharacterComparison(host,isCurrent){
 const guess=host.querySelector('#fd-character-square-guess');
 const feedback=host.querySelector('#fd-character-square-feedback');
 const result=host.querySelector('#fd-character-square-result');
 const here=()=>isCurrent()&&host.querySelector('#fd-character-square-guess')===guess;
 guess.onchange=()=>{
  if(!here())return;
  feedback.textContent='';
  result.hidden=true;
 };
 host.querySelector('#fd-character-square-check').onclick=()=>{
  if(!here())return;
  result.hidden=guess.value!=='mirror';
  if(!result.hidden)feedback.textContent='正确。平方后，镜面反射的两个平面方向都不变。';
  else if(guess.value)feedback.textContent='试着跟踪 x 和 y 各两次，再将第二次作用后的矩阵对角元相加。';
  else feedback.textContent='请先选择两次作用后的特征标关系。';
 };
}
function characterWaterBridgeHTML(){
 const mirror=charactersPreview({operation:'mirror',basis:'xyz'});
 return `<details id="fd-character-water-bridge" class="fd-exercise">
  <summary>从一支箭头到水分子的九维位移</summary>
  <p>本题固定水分子在 xz 平面、二重轴沿 z。对三个原子施加镜面操作 ${math('\\sigma(xz)')} 来比较位移表示。</p>
  <p>镜面保持氧原子和两个氢原子的位置。对任意一个原子，镜面使位移的 y 分量变号，保留 x、z 分量。</p>
  ${matrix(mirror.matrix)}
  <p>单个三维极矢量的特征标为 ${math('+'+mirror.trace)}，它是镜面矩阵的迹。</p>
  <div class="controls-row">
   <label for="fd-character-water-guess">三个原子的九维位移表示在这个镜面操作下的特征标是多少？</label>
   <select class="form-select" id="fd-character-water-guess" aria-describedby="fd-character-water-feedback">
    <option value="">请选择</option><option value="1">+1</option><option value="3">+3</option><option value="9">+9</option>
   </select>
   <button id="fd-character-water-check" type="button" class="secondary" aria-controls="fd-character-water-result">核对水分子位移的特征标</button>
  </div>
  <p id="fd-character-water-feedback" role="status"></p>
  <div id="fd-character-water-result" hidden>
   <p>三个原子各有一个相同的三维位移块。每块的对角元为 +1、−1、+1，三块相加得到 +3。</p>
   <p>展开位移工坊，查看四个操作怎样逐个变换九个位移基矢。</p>
   <p><a href="${waterRoute}">进入水分子演示与位移工坊 →</a></p>
  </div>
 </details>`;
}
function triangleProjectionBridgeHTML(){
 const vectorTeX=vector=>{
  const numerators=vector.map(value=>Math.round(3*value));
  return numerators.every(x=>x===0)?'\\mathbf{0}':String.raw`\tfrac13\left(${numerators.join(',')}\right)`;
 };
 const symbols={A1:'A_1',A2:'A_2',E:'E'};
 const rows=Object.entries(triangleProjectors).map(([irrep,projector])=>{
  const columns=projector.map((_,i)=>math(vectorTeX(projector.map(row=>row[i]))));
  const rank=Math.round(projector.reduce((sum,row,i)=>sum+row[i],0));
  return [math(symbols[irrep]),...columns,rank];
 });
 const symmetric=vectorTeX(mv(triangleProjectors.E,[1,1,1]));
 const firstVertex=vectorTeX(mv(triangleProjectors.E,[1,0,0]));
 return `<section class="fd-exercise" aria-labelledby="fd-triangle-projection-title">
  <h3 id="fd-triangle-projection-title">从约化重数检查三列投影</h3>
  <p>沿用三个顶点的标量基。先对第一个顶点的基函数应用 ${math('P^{(A_2)}')}，得到零向量。</p>
  <div class="controls-row">
   <label for="fd-triangle-projection-guess">对第二和第三个顶点再做同一投影，会看到什么？</label>
   <select class="form-select" id="fd-triangle-projection-guess" aria-describedby="fd-triangle-projection-feedback">
    <option value="">请选择</option>
    <option value="all-zero">其余两列也都是零</option>
    <option value="nonzero">其余两列至少有一列非零</option>
    <option value="one-enough">只测一列就足以判定整个投影的秩</option>
   </select>
   <button id="fd-triangle-projection-check" type="button" class="secondary" aria-controls="fd-triangle-projection-result">核对三个顶点</button>
  </div>
  <p id="fd-triangle-projection-feedback" role="status"></p>
  <div id="fd-triangle-projection-result" hidden>
   <p>三个基向量的像组成投影矩阵的三列。只有三列全为零，投影矩阵才为零。</p>
   ${table(['目标表示',...['1','2','3'].map(i=>math('P\\phi_'+i)),'投影矩阵的秩'],rows)}
   <p>这些投影满足 ${math('P^2=P')}，所以秩等于迹。比较同一个模型中的对称组合和单个顶点。</p>
   <p>${math('P^{(E)}(\\phi_1+\\phi_2+\\phi_3)='+symmetric)}，${math('P^{(E)}\\phi_1='+firstVertex)}。</p>
   <p>下方逐步推导直接展示当前投影矩阵、六个加权像及其求和。</p>
  </div>
  <a href="#classroom/foundations?module=theorems&amp;experiment=reduction">回看三顶点的特征标约化 →</a>
 </section>`;
}

function bindTriangleProjectionBridge(root,isCurrent){
 const guess=root.querySelector('#fd-triangle-projection-guess');
 if(!guess)return;
 const feedback=root.querySelector('#fd-triangle-projection-feedback');
 const result=root.querySelector('#fd-triangle-projection-result');
 const here=()=>isCurrent()&&root.querySelector('#fd-triangle-projection-guess')===guess;
 guess.onchange=()=>{if(here()){feedback.textContent='';result.hidden=true;}};
 root.querySelector('#fd-triangle-projection-check').onclick=()=>{
  if(!here())return;
  result.hidden=guess.value!=='all-zero';
  if(!result.hidden)feedback.textContent='正确。A₂ 在三个顶点上的像都为零，秩为零。';
  else if(guess.value==='one-enough')feedback.textContent='一列只记录一个基向量的像。还需要检查其余两列。';
  else if(guess.value==='nonzero')feedback.textContent='回想三顶点约化时 A₂ 的重数，再检查另外两个顶点。';
  else feedback.textContent='请先预测其余两个顶点的投影。';
 };
}

function bindCharacterWaterBridge(root,isCurrent){
 const guess=root.querySelector('#fd-character-water-guess');
 if(!guess)return;
 const feedback=root.querySelector('#fd-character-water-feedback'),result=root.querySelector('#fd-character-water-result');
 const here=()=>isCurrent()&&root.querySelector('#fd-character-water-guess')===guess;
 guess.onchange=()=>{if(here()){feedback.textContent='';result.hidden=true;}};
 root.querySelector('#fd-character-water-check').onclick=()=>{
  if(!here())return;
  const vectorTrace=charactersPreview({operation:'mirror',basis:'xyz'}).trace;
  result.hidden=guess.value!==String(waterSiteCount*vectorTrace);
  if(!result.hidden)feedback.textContent='正确。三个固定原子的位移块都对特征标作出贡献。';
  else if(guess.value==='1')feedback.textContent='这是单个原子的位移块贡献。还有几个原子的位置保持不变？';
  else if(guess.value==='9')feedback.textContent='9 是位移空间的维数。先检查镜面如何改变每个原子位移的 y 分量。';
  else feedback.textContent='请先选择九维位移表示的特征标。';
 };
}
export function waterRepresentation(operation='C2'){
 const ops={identity:{R:identity(3),p:[0,1,2],name:'E'},C2:{R:rotations.C2,p:[0,2,1],name:'C₂(z)'},mirror:{R:rotations.mirror,p:[0,1,2],name:'σ(xz)'},'mirror-yz':{R:[[-1,0,0],[0,1,0],[0,0,1]],p:[0,2,1],name:'σ(yz)'}};
 const {R,p,name}=ops[operation]||ops.C2,D=Array.from({length:9},()=>Array(9).fill(0));
 for(let atom=0;atom<3;atom++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)D[3*p[atom]+i][3*atom+j]=R[i][j];
 return {R,permutation:p,name,matrix:D,trace:trace(D),fixed:p.filter((x,i)=>x===i).length,labels:['Ox','Oy','Oz','H1x','H1y','H1z','H2x','H2y','H2z']};
}
function waterLesson(s){
 const w=waterPreview(s),rep=waterRepresentation(s.operation),irrep=s.mode==='antisymmetric'?'B₁':'A₁',allowed=s.mode==='antisymmetric'?['ir-x','raman-xz'].includes(s.channel):['ir-z','raman-xx'].includes(s.channel),xy=p=>[320+145*p[0],245-145*p[1]];
 let body=line(320,292,320,32,'#9cabb5')+line(105,245,550,245,'#9cabb5')+text(347,35,'z / C₂')+text(565,250,'x');
 for(let i=1;i<3;i++)body+=line(...xy(w.positions[0]),...xy(w.positions[i]),'#3f667e',7);
 w.positions.forEach((p,i)=>{const [x,y]=xy(p),u=w.displacements[i];body+=`<circle cx="${x}" cy="${y}" r="${i?22:28}" fill="${i?'#edf5f7':'#cce4ee'}" stroke="#375d72"/>`+text(x,y+6,i?'H'+i:'O')+line(x,y,x+u[0]*42,y-u[1]*42,'#b36231',3);});
 body+=text(320,322,'橙箭头：位移方向；分子平面 xz，y 垂直屏幕',undefined,15);
 const rows=[['A₁',1,1,1,1,'z；xx, yy, zz'],['A₂',1,1,-1,-1,'Rz；xy'],['B₁',1,-1,1,-1,'x, Ry；xz'],['B₂',1,-1,-1,1,'y, Rx；yz']];
 return {plot:svg('水的对称适应内部位移与检测偏振',body),data:{...w,representation:rep,irrep,allowed},html:`<h3>从矩阵出发，得到水的三种振动对称性</h3><p class="fd-result">${irrep} 坐标 × ${esc(s.channel)}：<strong>${allowed?'对称性允许':'对称性禁止'}</strong>。改变偏振只改变检测条件，不改变分子的振动表示。</p>
 ${step(1,'先声明九维空间',`<p>上一单元的一个箭头有 x、y、z 三个分量。水有三个原子，所以位移向量是 <strong>(Ox, Oy, Oz, H1x, H1y, H1z, H2x, H2y, H2z)</strong>。O 位于原点，H1 在 +x 一侧；C₂ 轴沿 z，分子在 xz 平面。</p><p>对每个位移基矢做两件事：先将原子送到 p(i)，再用同一个 3×3 极矢量矩阵旋转或反射箭头。矩阵第 j 列记录第 j 个基矢的像。</p>`)}
 ${step(2,`当前 ${rep.name}：原子置换 × 箭头矩阵`,`<p>原子对应 O→O，H1→H${rep.permutation[1]}，H2→H${rep.permutation[2]}；固定原子 ${rep.fixed} 个。交换的原子把非零块移出对角，不贡献迹。</p><div class="fd-matrix-pair"><div><strong>单原子的 R，迹 ${trace(rep.R)}</strong>${matrix(rep.R)}</div><div><strong>九维 D₃N，迹 ${rep.trace}</strong><div class="fd-scroll">${matrix(rep.matrix)}</div></div></div><p>${math('\\chi_{3N}(g)=N_{\\rm fixed}(g)\\,\\mathrm{tr}R(g)')}。例如 C₂ 只固定 O，其块 diag(−1,−1,+1) 的迹为 −1；两个 H 虽被交换，九个位移仍全部被变换。</p>`)}
 ${step(3,'对四个操作求迹，再约化',table(['表示 / 操作','E','C₂(z)','σ(xz)','σ(yz)'],[['固定原子数',3,1,3,1],['极矢量的迹',3,-1,1,1],['Γ₃N 的特征标',9,-1,3,1]])+table(['C₂ᵥ 不可约表示','E','C₂','σ(xz)','σ(yz)','基函数'],rows)+`<p>${math('n_\\alpha=\\tfrac14\\sum_g\\chi_\\alpha(g)^*\\chi_{3N}(g)')}。例如 ${math('n_{A_1}=(9-1+3+1)/4=3')}；同样得到 A₂:1、B₁:3、B₂:2，所以 ${math('\\Gamma_{3N}=3A_1+A_2+3B_1+2B_2')}，维数 3+1+3+2=9。</p>`)}
 ${step(4,'去掉整体平移与整体转动',`<p>平移像极矢量 (x,y,z)：${math('\\Gamma_T=A_1+B_1+B_2')}。转动像轴矢量，矩阵为 det(R)R，因此镜面对转动的迹与极矢量相反：${math('\\Gamma_R=A_2+B_1+B_2')}。</p>`+table(['特征标相减','E','C₂','σ(xz)','σ(yz)'],[['Γ₃N',9,-1,3,1],['减 ΓT',3,-1,1,1],['减 ΓR',3,-1,-1,-1],['Γvib',3,1,3,1]])+`<p class="fd-result">${math('\\Gamma_{\\rm vib}=\\Gamma_{3N}-\\Gamma_T-\\Gamma_R=2A_1+B_1')}。非线性三原子分子共有 3N−6=3 个振动自由度。若改把水放在 yz 平面，x/y 对调，同一反对称伸缩记为 B₂，即 2A₁+B₂。</p>`)}
 ${step(5,'从模式对称性走到 IR / Raman',`<p>从全对称振动基态出发，IR 跃迁要求偶极矩对该坐标的导数可非零：A₁ 对应 z，B₁ 对应 x。Raman 要看极化率张量的二次基函数：A₁ 对应 xx、yy、zz；B₁ 对应 xz。当前通道只判断这一项能否出现。</p><p>动画的三个内部坐标已去除质量加权平移和转动，并相互质量正交。两个 A₁ 坐标仍可被真实力常数矩阵混合，因此图中“伸缩型/弯曲型”是对称适应示意。这里没有计算水的频率、峰位或强度；允许也不保证峰很强。</p>`)}
 `,exercise:exercise('为什么同属 A₁ 的两条坐标不一定就是精确正常模？',['对称性只保证 A₁ 子空间与其他不可约表示不混合。','A₁ 在振动表示中出现两次，力常数在这个二维重数空间里仍可有非零交叉项。','必须给出质量与力常数并对角化动力学矩阵，才能确定两条精确正常模及频率。'])};
}
function charactersLesson(s){
 const r=charactersPreview(s),v=Array(r.dimension).fill(0);v[0]=1;const image=mv(r.matrix,v),p=mv(r.fullMatrix,[.7,.4,.6]);
 let body=line(85,245,295,245,'#aebdc7')+line(180,300,180,55,'#aebdc7')+line(180,245,285,185,'#257797',4)+line(180,245,180+p[0]*150,245-p[1]*150,'#ad5736',4)+text(285,169,'r','#257797')+text(180+p[0]*150,227-p[1]*150,'Rr','#ad5736')+text(465,108,`当前空间 ${r.dimension} 维`)+text(465,165,`χ(g) = ${fmt(r.trace)}`)+text(465,225,'列 = 基函数的像',undefined,17);
 const labels=r.labels.map((x,i)=>`${i+1}: ${x}`).join('；');
 return {plot:svg('同一几何操作在不同表示空间中的矩阵与特征标',body),data:r,html:`<h3>几何操作固定后，先选空间，再写矩阵</h3>
 ${step(1,'基底是什么，矩阵就作用在什么空间',`<p>当前基底顺序：<strong>${labels}</strong>。矢量空间与 d 轨道空间维数不同，不能把二者的特征标直接当成同一个表示的结果。</p><p>采用主动操作，矩阵列是基矢的像；对函数使用 ${math('T(R)f(\\mathbf r)=f(R^{-1}\\mathbf r)')}，使基函数系数与主动旋转约定一致。对 d 基，公共径向因子省略，五个无迹二次式构成完整 l=2 空间。</p>`)}
 ${step(2,'逐列读出当前操作',`<div class="fd-matrix-pair"><div><strong>原基底中的 D(g)</strong>${matrix(r.originalMatrix)}</div><div><strong>换基后的 D′(g)</strong>${matrix(r.matrix)}</div></div><p>第一列表示新基底第一个向量 e₁ 的像：${vec(image)}。矩阵乘输入系数向量，得到输出系数向量。χ=0 只表示对角贡献相消，不表示箭头不动。</p><p>例如 C₄ 将 x→y、y→−x、z→z；在 d 基中，z² 型不变，x²−y² 与 xy 变号，xz→yz、yz→−xz。五维迹因此为 1−1−1+0+0=−1。</p>`)}
 ${step(3,'同一表示换基：元素改变，迹不变',`<p>左侧换基角将前两个基函数正交混合；换基矩阵 S 为：</p>${matrix(r.basisChange)}<p>${math("D'(g)=S^{-1}D(g)S")}；这里 S 正交，所以 S⁻¹=Sᵀ。当前迹 ${fmt(r.trace)} 等于原矩阵迹 ${fmt(trace(r.originalMatrix))}。将换基角改为 31°，观察矩阵出现非整数元素，但迹保持不变。</p>`)}
 ${step(4,'换空间与换基是两个计算',`<p>同一个 C₄ 操作在 xy 空间的迹为 0，在 xyz 空间为 1，在五个实 d 基中为 −1。前两者满足 xyz=xy⊕z，迹相加；d 基是另一种表示，不能在 xyz 中靠换基得到。</p><p>在 C₄ᵥ 群中，矢量表示分解为 E(x,y)⊕A₁(z)。特征标描述整个表示的变换；想确定不可约组成，还需对所有共轭类求迹并做内积。单个操作的迹不能确定整个表示。</p><p><a href="${waterRoute}">下一步：把一个原子的 3×3 矩阵装进水的 9×9 位移表示 →</a></p>`)}
 `,exercise:exercise('两个不同矩阵的迹相同，能否据此判定操作相同？',['C₄ 的 xy 矩阵 [[0,−1],[1,0]] 与 σ(xz) 的 xy 矩阵 diag(1,−1) 都有迹0。','前者平方为−I，后者平方为 I；同样的一次特征标不能区分它们。','需要比较矩阵或其他操作的特征标。下方对照可直接计算两次作用。'])};
}
function projectionLesson(s){
 const r=projectionPreview(s),pts=[[320,60],[130,230],[510,230]],irrep=s.irrep||'E',isRow=irrep==='E'&&Number(s.row)===1;
 let body=line(...pts[0],...pts[1])+line(...pts[1],...pts[2])+line(...pts[2],...pts[0]);
 pts.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="${24+Math.abs(r.normalized[i])*12}" fill="${r.normalized[i]<0?'#f4d6c8':'#cce4ee'}" stroke="#446b80"/>`+text(x,y+5,'φ'+(i+1))+text(x,y+48,fmt(r.normalized[i]),undefined,17);if(i===Number(s.seedSite))body+=`<circle cx="${x}" cy="${y}" r="45" fill="none" stroke="#b77722" stroke-dasharray="6 4"/>`;});body+=text(320,325,'虚线圈：种子；数值 / 颜色：投影后的归一化系数',undefined,15);
 return {plot:svg('D3三顶点种子及其投影系数',body),data:r,html:`<h3>把六个变换后的种子相加，真正构造出基函数</h3>
 ${step(1,'明确三维标量模型',`<p>每个顶点放一个 s 型标量 φ₁、φ₂、φ₃，种子为 ${vec(r.seed)}。这里是正旋转群 D₃：三个 C₂ 轴在三角形平面内穿过顶点与对边中点；它们会把三维三角形翻转，但不是镜面反射。每点只有一个标量，不是六维平面位移。</p>`+table(['共轭类','E','2C₃','3C₂'],[['顶点表示',3,0,1],['A₁',1,1,1],['A₂',1,1,-1],['E',2,-1,0]])+`<p>约化内积给出 ${math('n_{A_1}=(3+3)/6=1')}、${math('n_{A_2}=(3-3)/6=0')}、${math('n_E=(2\\cdot3)/6=1')}，因此 Γsites=A₁⊕E。</p>`)}
 ${step(2,'让每个操作产生一个像，再乘权重',`<p>${isRow?math('P^E_{21}=\\tfrac26\\sum_g D^E_{21}(g)^*T(g)'):math('P^{(\\alpha)}=\\tfrac{d_\\alpha}{6}\\sum_g\\chi_\\alpha(g)^*T(g)')}。表中权重已经包含 dα/6。当前观察的 ${r.name} 行用粗体标出；改变“观察操作”同时改变下方表示矩阵。</p>`+table(['操作 g','T(g) seed','权重','加权后的像'],r.weightedImages.map((term,i)=>[Number(s.operation)===i?`<strong>${term.name} ← 当前</strong>`:term.name,vec(term.image),fmt(term.weight),vec(term.weighted)])))}
 ${step(3,'六个加权像求和，就是矩阵乘种子',`<div class="fd-matrix-pair"><div><strong>${isRow?'行算符 P₂₁ = v uᵀ':'特征标投影矩阵 P'+irrep}</strong>${matrix(r.projector)}</div><div><strong>作用结果</strong><p>${vec(r.projected)}</p><p>长度 ${fmt(r.norm)}</p><p>归一化：${vec(r.normalized)}</p></div></div><p>${r.norm<1e-10?'当前结果为零，不能归一化。A₂ 在此三顶点表示中根本没有出现；改变种子仍得到零。':'每个矩阵列都能由投影一个顶点基矢得到。更换种子后，数值确实随列改变。'} ${isRow?'P₂₁ 是伙伴构造算符，不是幂等的子空间投影；它把 u 映到 v，把 v 映到0。':'特征标投影满足 P²=P；PA₁ 的秩为1，PE 的秩为2。'}</p>`)}
 ${step(4,'从一个非零向量补齐完整基底',`<p>A₁ 的归一化基为 a=(1,1,1)/√3。对 φ₁ 做 E 投影得到 (2,−1,−1)/3，归一化为 u=(2,−1,−1)/√6。再投影 φ₂，减掉沿 u 的分量并归一化，得到 v=(0,1,−1)/√2。a、u、v 两两正交。</p><p>这才是 A₁⊕E 的完整三维基。只投影一次 φ₁，得到的是 E 平面内的一条向量。左侧行算符选项直接展示 P₂₁ 从 u 分量构造 v 的效果；它与投到整个 E 平面的 PE 有不同作用。</p><div class="fd-matrix-pair"><div><strong>T(${r.name})：顶点基</strong>${matrix(r.matrix)}</div><div><strong>Dᴱ(${r.name})：u,v 基</strong>${matrix(r.eMatrix)}</div></div><p>换到 u,v 基后，矩阵元素为 ${math('D^E_{ij}(g)=\\langle e_i,T(g)e_j\\rangle')}，当前迹 ${fmt(trace(r.eMatrix))}；投影向量经所选操作后为 ${vec(r.transformed)}。</p>`)}
 `,exercise:exercise('选择 A₂ 时投影为零，是程序没算出来吗？',['先由 Γsites 的特征标约化得到 nA₂=0。','PA₂ 的三列全部为零，说明整个三维标量空间都没有 A₂ 分量。','换成平面矢量位移等不同表示空间，约化结果可能改变；零结果依赖于所声明的空间。'])};
}
function splittingLesson(s){
 const r=splittingPreview(s),energies=[0,.6*s.delta,-.4*s.delta,...r.levels.map(x=>x.energy)],lo=Math.min(...energies)-.25,hi=Math.max(...energies)+.25,Y=e=>278-(e-lo)*190/(hi-lo),xs=[85,300,535];
 let body=text(xs[0],28,'SO(3)')+text(xs[0],54,'l=2：5维')+text(xs[1],28,'O')+text(xs[1],54,'E ⊕ T₂')+text(xs[2],28,'D₄')+text(xs[2],54,'1+1+1+2');
 body+=line(42,Y(0),128,Y(0),'#4b6d83',4);for(const a of [{e:.6*s.delta,label:'E (2)'},{e:-.4*s.delta,label:'T₂ (3)'}])body+=line(255,Y(a.e),345,Y(a.e),'#277b9d',4)+text(300,Y(a.e)-12,a.label,undefined,15)+line(130,Y(0),252,Y(a.e),'#b9c8d0',1);
 // Labels use separate rows and leader lines; accidental crossings never hide a label.
 r.levels.forEach((a,i)=>{const y=Y(a.energy),labelY=105+i*58;body+=line(492,y,548,y,'#257b6e',4)+line(348,Y(a.cubic),490,y,'#bdcbd3',1)+line(549,y,565,labelY,'#88a6b5',1)+text(600,labelY+5,a.irrep,undefined,16);});
 body+=text(320,326,'能量：教学单位；连接线只追踪同一轨道子空间',undefined,15);
 const D=orbitalMatrix(s.operation),sizes=[1,2,1,2,2],d4Rows={A1:[1,1,1,1,1],A2:[1,1,1,-1,-1],B1:[1,-1,1,1,-1],B2:[1,-1,1,-1,1],E:[2,0,-2,0,0]},restrictionE=[2,0,2,2,0],restrictionT=[3,-1,-1,-1,1],inner=(a,b)=>a.reduce((sum,x,i)=>sum+sizes[i]*x*b[i],0)/8;
 return {plot:svg('五个d轨道从连续旋转到八面体和四方旋转群的分裂',body),data:{...r,matrix:D,restrictionE,restrictionT},html:`<h3>降对称只重新分组五个态；能量需要额外模型</h3>
 ${step(1,'自由离子的 l=2 是一个五维不可约表示',`<p>省略公共径向函数，按顺序选取五个实基：</p><p class="fd-basis">${dNames.join('，')}</p><p>它们来自 ${math('Y_{2m},\\ m=-2,-1,0,1,2')} 的实组合。在完整 SO(3) 旋转对称且忽略自旋时，旋转不变 Hamiltonian 在这个不可约空间内为常数，所以五重简并。只说“有五个 d 轨道”还没有给出晶场能量。</p>`)}
 ${step(2,'限制到 O，用特征标算出 2+3',`<p>角动量表示的旋转特征标为 ${math('\\chi_l(\\theta)=1+2\\sum_{m=1}^{l}\\cos(m\\theta)')}。代入 l=2，按 O 的类求值：</p>`+table(['O 的类','E','8C₃(111)','3C₂(x,y,z)','6C₄','6C₂(边轴)'],[['χl=2',5,-1,1,-1,1],['E',2,-1,2,0,0],['T₂',3,0,-1,-1,1]])+`<p>${math('n_E=[5\\cdot2+8(-1)(-1)+3(1)(2)]/24=1')}；${math('n_{T_2}=[5\\cdot3+3(1)(-1)+6(-1)(-1)+6(1)(1)]/24=1')}。因此 ${math('D^{(2)}\\downarrow O=E\\oplus T_2')}。E 空间由前两个二次式张成；T₂ 由 xy、xz、yz 张成。</p>`)}
 ${step(3,'只保留 D₄ 操作，再约化每个父空间',table(['D₄ 的类','E','2C₄(z)','C₂(z)','2C₂(x,y)','2C₂(对角轴)'],[['E of O ↓',...restrictionE],['T₂ of O ↓',...restrictionT],...Object.entries(d4Rows).map(([name,row])=>[name,...row])])+`<p>同样做类大小加权内积，分母改为 |D₄|=8。对父 E，(nA₁,nA₂,nB₁,nB₂,nE)=(${Object.values(d4Rows).map(row=>inner(restrictionE,row)).join(', ')})；对父 T₂ 得到 (${Object.values(d4Rows).map(row=>inner(restrictionT,row)).join(', ')})。</p><p class="fd-result">E↓D₄=A₁⊕B₁；T₂↓D₄=B₂⊕E。对应 z² 型→A₁，x²−y²→B₁，xy→B₂，(xz,yz)→E。</p><p>当前操作 ${esc(s.operation)} 在上述五维基中的矩阵：</p>${matrix(D)}<p>${s.operation==='C3'?'C₃(111) 混合立方 E 的两个基函数，四方群 D₄ 不包含这个操作。失去它后这两个态才可有不同能量。':'D₄ 中仍有操作相互连接 xz 与 yz，因此保留的 E 双重态不能任意拆开。'}</p>`)}
 ${step(4,'加入晶场参数，检查能量与重心',table(['轨道','D₄ 标签','能量公式','当前能量'],r.levels.map((a,i)=>[a.name,a.irrep,['3Δ/5−2Dₛ−6Dₜ','3Δ/5+2Dₛ−Dₜ','−2Δ/5+2Dₛ−Dₜ','−2Δ/5−Dₛ+4Dₜ'][i],fmt(a.energy)]))+`<p>取 Δ=10Dq，八面体场 E 比 T₂ 高 Δ。加四方扰动后仍有 1+1+1+2=5 个态；加权能量和 ${math('E_{A_1}+E_{B_1}+E_{B_2}+2E_E=0')}，当前重心 ${fmt(r.barycenter)}。零点是五态平均能量，不是绝对结合能。</p><p>滑块改变的是一个单电子参数模型，群论只规定允许的分块和保护的简并。不同不可约表示偶然等能时，调节参数一般可以分开；同一个 E 内的两态在 D₄ 保持时始终等能。</p>`)}
 ${step(5,'O 与 Oₕ、D₄ 与 D₄ₕ 的标签区别',`<p>图中两级都是正旋转群 O、D₄，表示名不带 g/u。若体系另外保持反演，改用 Oₕ→D₄ₕ，d 轨道为偶宇称，同一支路写成 E<sub>g</sub>→A<sub>1g</sub>+B<sub>1g</sub>、T<sub>2g</sub>→B<sub>2g</sub>+E<sub>g</sub>。反演本身不会给这五个偶宇称态再加一重简并。</p>`)}
 `,exercise:exercise('把 Δ 设为0且 Dₛ=Dₜ=0，图上五态重合能证明体系一定有 SO(3) 吗？',['能量相同是谱的信息；在更低对称下也可出现参数调谐的偶然等能。','只有 Hamiltonian 与所有连续旋转对易，才有 SO(3) 对称性。','反过来，保持完整 SO(3) 的 l=2 不可约空间必须五重等能。'])};
}
function jtLesson(s){
 const r=jtPreview(s),extent=r.extent,qp=(x,y)=>[165+105*x/extent,170-105*y/extent],slice=r.slice,es=slice.flatMap(p=>[p.lower,p.upper,p.occupied]),lo=Math.min(...es,-r.stabilization)-.2,hi=Math.max(...es)+.2,X=q=>360+(q+extent)*250/(2*extent),Y=e=>278-(e-lo)*225/(hi-lo);
 let body=line(40,170,287,170,'#9db0bc')+line(165,290,165,44,'#9db0bc')+text(280,195,'Qθ',undefined,14)+text(189,45,'Qε',undefined,14)+text(165,24,'二维畸变平面',undefined,17);
 for(const radius of [extent/3,extent*2/3,extent])body+=`<circle cx="165" cy="170" r="${105*radius/extent}" fill="none" stroke="#d4e0e7"/>`;
 if(r.minRadius>0)body+=`<circle cx="165" cy="170" r="${105*r.minRadius/extent}" fill="none" stroke="#7755a2" stroke-width="3"/>`;
 const [mx,my]=qp(s.qtheta,s.qepsilon);body+=line(45,my,285,my,'#c27931',2)+`<circle cx="${mx}" cy="${my}" r="6" fill="#c27931"/>`+text(165,320,r.minRadius>0?'紫圈：占据总势能的最低谷':'最低点：原点',undefined,14);
 const curve=(key,color,w)=>`<path d="${slice.map((p,i)=>`${i?'L':'M'}${X(p.qtheta)},${Y(p[key])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
 body+=line(355,Y(0),615,Y(0),'#b5c3cd')+line(X(0),285,X(0),45,'#b5c3cd')+curve('lower','#277b9d',2)+curve('upper','#b56543',2)+curve('occupied','#7755a2',4);
 for(const [key,color] of [['lower','#277b9d'],['upper','#b56543'],['occupied','#7755a2']])body+=`<circle data-jt-point="${key}" cx="${X(s.qtheta)}" cy="${Y(r.slicePoint[key])}" r="5" fill="${color}"/>`;
 body+=text(488,24,`实际截面 Qε=${fmt(s.qepsilon)}`,undefined,17)+text(486,317,'蓝 V−；橙 V+；紫 占据总势能',undefined,13)+text(610,300,'Qθ',undefined,13);
 return {plot:svg('E乘e模型的二维最低谷和当前Qepsilon固定截面',body),data:r,html:`<h3>先求电子劈裂，再由实际填充得到总势能</h3><p class="fd-result">当前 (${fmt(s.qtheta)}, ${fmt(s.qepsilon)})，Q=${fmt(r.Q)}。右图固定当前 Qε，所有圆点都属于这条真实截面；左图橙线标出截面位置。</p>
 ${step(1,'两个电子轨道与两个畸变坐标',`<p>在一个轨道 E 双重态内，用 τz、τx 表示两个实矩阵；忽略自旋、核动能和高阶耦合：</p><p>${math('H_{\\rm el}=g(Q_\\theta\\tau_z+Q_\\epsilon\\tau_x)')}。</p>${matrix(r.electronicMatrix)}<p>迹为0、行列式为 −g²(Qθ²+Qε²)，故电子能量为 ε±=±gQ。再加一次晶格弹性能 kQ²/2，单电子绝热势面为 V±=kQ²/2±gQ。蓝/橙两条线是它们在当前 Qε 下的截面。</p>`)}
 ${step(2,'填充两条电子支，弹性能只算一次',table(['所选电子数','下支 n−','上支 n+','线性项','模型条件'],[[1,1,0,'−gQ','轨道双重态中单电子'],[2,1,1,'0','明确假设两个轨道各一个；未求解Hund竞争'],[3,2,1,'−gQ','单空穴；如八面体 d⁹ 的 e_g³'],[4,2,2,'0','两轨道满壳层']])+`<p>当前填充 (n−,n+)=(${r.occupancy.join(', ')})，占据总势能 ${math('V_{\\rm occ}=\\tfrac12kQ^2+(n_+-n_-)gQ')} = ${fmt(r.potential)}。紫线才是当前填充的总势能。<strong>不能把多个 V−/V+ 相加，否则会重复计算弹性能。</strong></p>`)}
 ${step(3,'求最低点，并区分二维与截面',`<p>令 b=n−−n+=${r.imbalance}。径向微分 kQ−bg=0 给出 Q₀=bg/k=${fmt(r.minRadius)}，能量降低 EJT=b²g²/(2k)=${fmt(r.stabilization)}。${r.linearActive?'纯线性模型在二维中有一整圈等能最低谷，方向尚未选定。':'当前两支的线性项抵消，最低点在原点；不能由单电子下支单独判断。'}</p><p>当前固定 Qε 的截面极小值位于 Qθ=${r.sliceMinima.map(fmt).join(' 或 ')}；若 |Qε|&gt;Q₀，该截面够不到最低圈，截面最小值移到 Qθ=0。这与二维最低谷不矛盾。</p>`)}
 ${step(4,'什么时候这个模型能说明 Jahn–Teller 畸变',`<p>这里示范轨道简并电子态与对称性允许振动的线性耦合。电子占据必须产生未抵消的能量降低；仅有一个 Kramers 自旋双重态、一个振动简并或一张简并能级图，都不足以推出这种轨道驱动。</p><p>d⁹ 的 e_g 单空穴可对应 b=1。高自旋 d⁵ 在常见八面体场下的基态是轨道单重态，不能只因“五个d轨道”就套用本双轨道模型。两个电子各占一个轨道的选项是假设填充，未比较配对能、Hund交换、SOC。高阶耦合可使圆谷翘曲成离散极小值；核量子运动还会带来动态效应。</p><p>所有坐标与能量为教学单位，不是某一材料的实测能面。</p>`)}
 `,exercise:exercise('令 Qε=0，再改为0.6。为什么图上的曲线也必须改变？',['V± 依赖半径 √(Qθ²+Qε²)，所以更换固定 Qε 就换了一条二维能面的截面。','圆点与曲线使用同一个固定 Qε 和同一个横坐标 Qθ，因此始终相符。','当 g=0，电子劈裂与有限半径最低谷一起消失，两个单电子势面都变成二维谐性抛物面。'])};
}
function macroLesson(s){
 const n=Number(s.n),allowed=[1,2,3,4,6].includes(n),angle=2*Math.PI/n,c=Math.cos(angle),si=Math.sin(angle),t=Number(s.translation),rot=[[c,-si,0],[si,c,0],[0,0,1]],point=[.6,.3,0],rp=mv(rot,point),seitz=[rp[0]+t,rp[1],0],P=v=>[165+80*v[0],175-80*v[1]];
 let body='';for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)body+=`<circle cx="${165+i*45}" cy="${175-j*45}" r="3" fill="#c2d0d9"/>`;
 body+=line(165,175,...P(point),'#277b9d',3)+line(165,175,...P(rp),'#2d8a6c',3)+line(...P(rp),...P(seitz),'#c17a2c',4);
 for(const [p,color] of [[point,'#277b9d'],[rp,'#2d8a6c'],[seitz,'#c17a2c']])body+=`<circle cx="${P(p)[0]}" cy="${P(p)[1]}" r="6" fill="${color}"/>`;
 body+=text(165,30,'蓝 r → 绿 Rr → 橙 Rr+t',undefined,15)+text(465,90,'π({R | t}) = R')+text(465,150,'ker π = T')+text(465,215,'G/T ≅ P')+text(320,320,'坐标变换示意；方格仅作坐标背景，非所有 Cₙ 都保持此方格',undefined,13);
 return {plot:svg('Seitz坐标变换与去除平移后的线性部分',body),data:{n,allowed,planeTrace:2*c,translation:t,rotation:rot,point,rotated:rp,seitz},html:`<h3>宏观点群保留全部线性部分，不会自动补上反演</h3>
 ${step(1,'空间群操作同时作用于方向与位置',`<p>一个操作 ${math('\\{R|\\mathbf t\\}')} 把 r 变成 Rr+t。当前 R 是 ${n} 重旋转，t=(${fmt(t)},0,0)，Rr=${vec(rp)}，Rr+t=${vec(seitz)}。改变平移滑块，橙点移动，绿色的旋转像保持不变。</p><p>滑块展示 Seitz 映射的代数分工，不声称每个连续 t 都属于同一个具体空间群。晶格、基元与闭合条件会限制实际允许的分数平移。</p>`)}
 ${step(2,'用同态去掉平移，得到商群',`<p>${math('\\{R_2|t_2\\}\\{R_1|t_1\\}=\\{R_2R_1|R_2t_1+t_2\\}')}。映射 π:{R|t}→R 保持乘法，其核恰好是全部纯晶格平移 T，所以 ${math('P\\simeq G/T')}。螺旋轴去掉平移留下旋转，滑移面去掉平移留下镜面。</p><p>宏观均匀物性张量不随一个晶格平移改变，因而受到这个点群的约束。位点对称群则只收集固定某个选定位置的操作，通常是另一组操作；有限样品外形还可能降低对称性。</p>`)}
 ${step(3,'点群、Laue 群与反演不是同一个结论',table(['对象','例子','是否必有反演'],[['空间群 P4₁ 的点群','4（C₄）','没有'],['这个点群对应的 Laue 群','4/m（C₄ₕ）','有'],['中心对称晶体的点群','如 m−3m（Oₕ）','有']])+`<p>在 Friedel 定律适用、异常散射可忽略的衍射强度处理中，反射 h 与−h 的强度相同，可产生含反演的 Laue 对称。这是衍射信息的约束，不证明真实晶体一定有反演。晶体宏观点群直接来自 G/T，不能用 Laue 群替换。</p>`)}
 ${step(4,'用整数矩阵检查晶体学旋转限制',`<p>在三维平移格的原胞基中，保持格子的正旋转用整数矩阵表示，因此迹是整数。绕轴旋转的本征值为 1,e±iθ，故 ${math('\\mathrm{tr}R=1+2\\cos(2\\pi/n)')}。去掉轴向的1后，2cos(2π/n)=${fmt(2*c)}。</p><p class="fd-result">${n} 重旋转${allowed?'满足这个必要条件，属于三维周期晶格可能出现的阶数':'不满足整数迹条件，不能作为三维周期晶格的旋转对称'}。允许阶数为 1、2、3、4、6；满足阶数条件仍须检查具体晶格是否被保持。</p><p>分子、孤立正多面体和准晶属于不同的周期性条件，不能拿本限制否定它们的五重对称。完整空间群的分数平移仍影响衍射消光与 Bloch 相位。</p>`)}
 `,exercise:exercise('从一个衍射图的 4/m Laue 对称，能直接断言晶体有反演吗？',['Friedel 条件下，不含反演的点群4与含反演的4/m可属于同一Laue类。','必须结合异常散射、结构和其他物性证据区分。','宏观点群的定义是空间群线性部分所构成的群；去掉平移不会凭空添加−I。'])};
}
function scene(theme,s){return ({water:waterLesson,characters:charactersLesson,projection:projectionLesson,splitting:splittingLesson,jt:jtLesson,macro:macroLesson})[theme](s);}
export function foundationsDemoScene(theme,params={}){return scene(theme,{...DEFAULTS[theme],...params});}

export async function renderFoundationsDemosView({container,selection={},run,cancelRun,download=()=>{},onNavigate=()=>{},loadWaterActions=defaultWaterActionsLoader}){
 previousFoundationsCleanup();
 let theme=THEMES.some(([id])=>id===selection.experiment)?selection.experiment:'water';
 let routePreset=selection.preset;
 const preset=theme==='characters'?characterPresets.get(routePreset):undefined;
 let s={...DEFAULTS[theme],...preset},timer=null,pythonStatus='',pythonResult=null,busy=false,revision=0,comparisonBasis;
 container.innerHTML='<article class="fd-course"></article>';const root=container.firstElementChild;
 let disposed=false,waterTicket=0,disposeWater=()=>{},waterDetail=null,waterOpening=null,waterBound=false,legacyRequest=null,detachObserver;
 const current=()=>!disposed&&container.isConnected!==false&&root.isConnected!==false&&container.firstElementChild===root;
 const opened=detail=>!!detail&&(typeof detail.open==='boolean'?detail.open:detail.getAttribute('open')!==null);
 function stopAnimation(){if(timer){clearInterval(timer);timer=null;}}
 function clearWater(){
  if(waterDetail)waterActionsStates.set('host:water-actions',{open:opened(waterDetail)});
  waterTicket++;waterOpening=null;waterBound=false;disposeWater();disposeWater=()=>{};waterDetail=null;
 }
 function stopLegacy(){
  const owned=legacyRequest;legacyRequest=null;if(!owned)return;owned.live=false;
  // Automatic teardown cannot prove ownership of a global fallback. The
  // shared application supplies request.cancel; an unscoped legacy promise
  // is invalidated here and its eventual reply is ignored.
  if(owned.pending&&typeof owned.promise?.cancel==='function')owned.promise.cancel();
  busy=false;
 }
 function disposeView(){if(disposed)return;disposed=true;revision++;stopAnimation();clearWater();stopLegacy();detachObserver?.disconnect();}
 previousFoundationsCleanup=disposeView;
 if(typeof MutationObserver==='function'){
  detachObserver=new MutationObserver(()=>{if(!current())disposeView();});
  detachObserver.observe(container.ownerDocument?.documentElement||container,{childList:true,subtree:true});
 }
 function waterEntry(){
  if(theme!=='water')return '';
  const characterLink=`<a href="${waterMirrorCharacterRoute}">矩阵与特征标演示</a>`;
  return `<p id="fd-water-character-prerequisite" class="fd-scope">先在${characterLink}中观察镜面 ${math('\\sigma(xz)')} 对完整三维矢量的作用，再回到这里考察水分子三个原子的位移。</p>
  <details class="wax-entry" data-water-actions-entry${waterActionsStates.get('host:water-actions')?.open?' open':''}><summary>水的特征标 −1 是怎样算出的？</summary><p>逐列跟踪三个原子的九个位移，区分交换原子与转动箭头，再约化并扣除刚性运动。</p><div data-water-actions-body></div></details>
  <p class="fd-scope"><a href="#classroom/observables?material=gaas&amp;lesson=acoustic-optical">把整体转动放进周期晶体，结果会怎样？ →</a></p>`;
 }
 function mountWater(){
  const detail=root.querySelector('[data-water-actions-entry]'),body=detail?.querySelector('[data-water-actions-body]');if(!detail||!body)return;
  waterDetail=detail;
  const here=()=>current()&&theme==='water'&&root.querySelector('[data-water-actions-entry]')===detail;
  function loadOpen(){
   if(!here()||!opened(detail)||waterBound)return;
   if(waterOpening)return waterOpening;
   const ticket=++waterTicket;body.innerHTML='<p role="status">正在载入水位移工坊…</p>';
   const loading=Promise.resolve().then(async()=>{
    try{
     const module=await loadWaterActions();if(!here()||!opened(detail)||ticket!==waterTicket)return;
     if(typeof module?.bindWaterActionsLesson!=='function')throw Error('水位移工坊暂不可用，请重试。');
     const cleanup=module.bindWaterActionsLesson({root:body,isCurrent:()=>here()&&opened(detail),stateStore:waterActionsStates,run,cancelRun,download});
     if(!here()||!opened(detail)||ticket!==waterTicket){if(typeof cleanup==='function')cleanup();return;}
     disposeWater=typeof cleanup==='function'?cleanup:()=>{};waterBound=true;
    }catch(error){
     if(!here()||!opened(detail)||ticket!==waterTicket)return;
     body.innerHTML=`<p class="notice error" role="alert">${esc(error?.message||'水位移工坊暂不可用，请重试。')}</p><button type="button" class="secondary" data-water-actions-retry>重试水位移工坊</button>`;
     const retry=body.querySelector('[data-water-actions-retry]');retry.onclick=()=>{if(here()&&opened(detail)&&body.querySelector('[data-water-actions-retry]')===retry)return loadOpen();};
    }finally{if(waterOpening===loading)waterOpening=null;}
   });
   waterOpening=loading;return loading;
  }
  detail.ontoggle=()=>{
   if(!here())return;waterActionsStates.set('host:water-actions',{open:opened(detail)});
   if(opened(detail))return loadOpen();
   clearWater();waterDetail=detail;body.innerHTML='';
  };
  if(opened(detail))loadOpen();
 }
 const payload=()=>({experiment:theme,theme:theme==='projection'?'d3':theme,...s});
 function update(){
  const out=scene(theme,s);
  root.querySelector('.fd-preview').innerHTML=out.plot+out.html;
  root.querySelector('.fd-questions').innerHTML=out.exercise;
  latest={tool:'foundations_demos_preview',input:payload(),result:{...out.data,computation:'JavaScript interactive teaching preview'}};
  root.querySelectorAll('[data-output]').forEach(el=>el.textContent=s[el.dataset.output]);
  const comparison=root.querySelector('#fd-character-comparison');
  if(comparison&&comparisonBasis!==s.basis){
   comparisonBasis=s.basis==='d5'?'xyz':s.basis;
   comparison.innerHTML=characterComparisonHTML(comparisonBasis);
   bindCharacterComparison(comparison,()=>current()&&root.querySelector('#fd-character-comparison')===comparison);
  }
 }
 function draw(){
  if(!current())return;
  clearWater();
  comparisonBasis=undefined;
  root.innerHTML=`<header class="fd-hero"><span class="fd-eyebrow">基础概念演示 · 从操作到物理结果</span><h2>把抽象对称性变成可以操作的课堂</h2><p>选择主题，改变参数，先预测再核对。每个演示都保留基底、坐标与模型约定。</p></header>
  <nav class="fd-tabs" aria-label="当前主题组">${THEMES.filter(([id])=>['water','characters','projection'].includes(theme)?['water','characters','projection'].includes(id):['splitting','jt','macro'].includes(id)).map(([id,title])=>`<button type="button" data-theme="${id}" aria-pressed="${theme===id}">${title}</button>`).join('')}</nav>
  ${waterEntry()}
  ${theme==='projection'&&routePreset==='triangle-permutation'?triangleProjectionBridgeHTML():''}
  <div class="fd-workspace"><aside class="fd-controls"><h3>调节与预测</h3>${controls(theme,s)}<p class="fd-status" role="status">改变参数，逐步读出矩阵、推导与结果。</p></aside><section class="fd-preview" aria-live="polite"></section></div>
  ${theme==='characters'?'<div id="fd-character-comparison"></div>'+characterWaterBridgeHTML():''}
  <div class="fd-questions"></div><footer class="fd-footer"><a href="#classroom/foundations?lesson=selection-rules">原有水分子选择定则讲义</a> · <a href="#classroom/foundations?module=salc">对称适应基计算</a> · <a href="#classroom/spin?module=orbitals">晶场与轨道专题</a> · <a href="docs/foundations-demos.md">教学模型、约定与来源</a></footer>`;
  update();
  bindTriangleProjectionBridge(root,current);
  bindCharacterWaterBridge(root,current);
  mountWater();
 }
 root.addEventListener('input',e=>{if(!current())return;const id=e.target.dataset.param;if(!id||e.target.tagName==='SELECT')return;s[id]=Number(e.target.value);revision++;pythonStatus='参数已改变，图与推导已同步更新。';pythonResult=null;update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('change',e=>{if(!current())return;const id=e.target.dataset.param;if(!id)return;s[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;revision++;pythonResult=null;pythonStatus='参数已改变，图与推导已同步更新。';update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('click',async e=>{
  if(!current())return;
  const tab=e.target.closest('[data-theme]');
  if(tab){
   stopAnimation();stopLegacy();
   theme=tab.dataset.theme;revision++;s={...DEFAULTS[theme]};pythonStatus='';pythonResult=null;
   const patch=routePreset===undefined?{experiment:theme}:{experiment:theme,preset:undefined};
   routePreset=undefined;
   onNavigate(patch);
   draw();
   return;
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='animate'){if(timer)stopAnimation();else timer=setInterval(()=>{if(!current()){stopAnimation();return;}s.phase=(s.phase+5)%360;const input=root.querySelector('[data-param="phase"]');if(input)input.value=s.phase;update();},65);}
 });
 draw();return disposeView;
}
