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
const DEFAULTS={water:{mode:'symmetric',phase:30,amplitude:.2,channel:'ir-z'},characters:{operation:'C4',basis:'xyz'},projection:{operation:1,seedSite:0,irrep:'E',row:0},splitting:{delta:1,ds:.12,dt:.03},jt:{qtheta:.65,qepsilon:.25,g:1,k:1,occupancy:1},macro:{n:4,translation:.35}};
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

export function charactersPreview(s){
 const matrices={C4:[[0,-1,0],[1,0,0],[0,0,1]],C2:[[-1,0,0],[0,-1,0],[0,0,1]],mirror:[[1,0,0],[0,-1,0],[0,0,1]],identity:[[1,0,0],[0,1,0],[0,0,1]]};
 const full=matrices[s.operation]||matrices.C4,xy=full.slice(0,2).map(r=>r.slice(0,2)),m=s.basis==='xy'?xy:full;
 return {matrix:m,trace:m.reduce((a,r,i)=>a+r[i],0),fullTrace:full.reduce((a,r,i)=>a+r[i],0),xyTrace:xy.reduce((a,r,i)=>a+r[i],0),fullMatrix:full,xyMatrix:xy};
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
export function projectionPreview(s){
 const permutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]],names=['E','C₃⁺','C₃⁻','C₂(1)','C₂(2)','C₂(3)'];
 const q=[2/Math.sqrt(6),-1/Math.sqrt(6),-1/Math.sqrt(6)],v=[0,1/Math.sqrt(2),-1/Math.sqrt(2)],a=[1,1,1].map(x=>x/Math.sqrt(3));
 const permutation=permutations[s.operation],P=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>permutation[j]===i?1:0));
 const seed=[0,0,0];seed[s.seedSite]=1;
 let projected=s.irrep==='A1'?a.map(x=>x*a[s.seedSite]):s.irrep==='A2'?[0,0,0]:s.row===1?v.map(x=>x*q[s.seedSite]):seed.map((x,i)=>x-1/3);
 const norm=Math.hypot(...projected),normalized=norm>1e-9?projected.map(x=>x/norm):[0,0,0];
 return {matrix:P,eMatrix:[q,v].map(b=>[q,v].map(c=>dot(b,mv(P,c)))),character:P.reduce((a,r,i)=>a+r[i],0),permutation,name:names[s.operation],projected,normalized,norm,basis:[a,q,v]};
}
export function splittingPreview(s){
 const d=Number(s.delta),ds=Number(s.ds),dt=Number(s.dt);
 const levels=[{name:'d(z²)',irrep:'A₁',cubic:.6*d,energy:.6*d-2*ds-6*dt},{name:'d(x²−y²)',irrep:'B₁',cubic:.6*d,energy:.6*d+2*ds-dt},{name:'d(xy)',irrep:'B₂',cubic:-.4*d,energy:-.4*d+2*ds-dt},{name:'d(xz), d(yz)',irrep:'E',cubic:-.4*d,energy:-.4*d-ds+4*dt}];
 return {levels,barycenter:(levels[0].energy+levels[1].energy+levels[2].energy+2*levels[3].energy)/5};
}
export function jtPreview(s){const Q=Math.hypot(s.qtheta,s.qepsilon),elastic=.5*s.k*Q*Q,linearActive=[1,3].includes(Number(s.occupancy)),imbalance=linearActive?1:0;return {Q,lower:elastic-s.g*Q,upper:elastic+s.g*Q,potential:elastic-imbalance*s.g*Q,minRadius:imbalance*s.g/s.k,stabilization:imbalance*s.g*s.g/(2*s.k),linearActive};}
const range=(id,label,value,min,max,step)=>`<label><span>${label} <output data-output="${id}">${value}</output></span><input data-param="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,value,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${t}</option>`).join('')}</select></label>`;
const exercise=(question,steps)=>`<section class="fd-exercise"><h3>先判断，再逐步推导</h3><p>${question}</p><details><summary>展开分步答案</summary><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol></details></section>`;

function controls(theme,s){
 if(theme==='water')return select('mode','振动模式',s.mode,[['symmetric','对称伸缩 · A₁'],['bend','弯曲 · A₁'],['antisymmetric','反对称伸缩 · B₁']])+range('phase','振动相位（°）',s.phase,0,360,1)+range('amplitude','示意振幅',s.amplitude,0,.5,.025)+select('channel','检测偏振',s.channel,[['ir-z','红外 · z'],['ir-x','红外 · x'],['raman-xx','拉曼 · xx'],['raman-xz','拉曼 · xz']])+`<button type="button" data-action="animate">播放 / 暂停振动</button>`;
 if(theme==='characters')return select('operation','同一个几何操作',s.operation,[['C4','C₄(z) · 正四分之一圈'],['C2','C₂(z) · 半圈'],['mirror','σ(xz) · 镜面'],['identity','E · 恒等']])+select('basis','选取的表示空间',s.basis,[['xyz','完整三维矢量 (x,y,z)'],['xy','二维子空间 (x,y)']]);
 if(theme==='projection')return select('operation','观察操作',s.operation,[[0,'E'],[1,'C₃⁺'],[2,'C₃⁻'],[3,'C₂(1) · 沿顶点轴翻转'],[4,'C₂(2) · 沿顶点轴翻转'],[5,'C₂(3) · 沿顶点轴翻转']])+select('seedSite','投影种子',s.seedSite,[[0,'φ₁ = (1,0,0)'],[1,'φ₂ = (0,1,0)'],[2,'φ₃ = (0,0,1)']])+select('irrep','目标不可约表示',s.irrep,[['A1','A₁ 特征标投影'],['A2','A₂ 特征标投影'],['E','E 子空间 / 行投影']])+select('row','E 基底的搭档',s.row,[[0,'先用 Pᴱ 投到 E 子空间'],[1,'用 P₂₁ 从 u 构造 v 搭档']]);
 if(theme==='splitting')return range('delta','八面体晶场 Δ（教学单位）',s.delta,0,2,.02)+range('ds','四方参数 Dₛ',s.ds,-.35,.35,.01)+range('dt','四方参数 Dₜ',s.dt,-.15,.15,.01);
 if(theme==='jt')return range('qtheta','畸变坐标 Qθ',s.qtheta,-2,2,.02)+range('qepsilon','畸变坐标 Qε',s.qepsilon,-2,2,.02)+range('g','线性耦合 g',s.g,0,2,.05)+range('k','弹性常数 k',s.k,.5,2,.05)+select('occupancy','简化二轨道电子占据',s.occupancy,[[1,'1 电子：下支占据'],[2,'2 电子：各轨道一个（Hund 示意）'],[3,'3 电子：一个空穴'],[4,'4 电子：满壳层']]);
 return select('n','尝试的旋转阶数',s.n,[[1,'1 重轴'],[2,'2 重轴'],[3,'3 重轴'],[4,'4 重轴'],[5,'5 重轴'],[6,'6 重轴']])+range('translation','伴随平移 tₓ（晶格单位）',s.translation,0,1,.05);
}

export function waterPreview(s){
 const theta=104.5*Math.PI/360,a=Math.sin(theta),b=Math.cos(theta),base=[[0,0],[a,b],[-a,b]],mass=[16,1,1],center=[0,b/9];
 const raw=s.mode==='symmetric'?[[0,0],[a,b],[-a,b]]:s.mode==='bend'?[[0,0],[b,-a],[-b,-a]]:[[0,0],[a,b],[a,-b]];
 const mean=[0,1].map(j=>raw.reduce((sum,u,i)=>sum+mass[i]*u[j],0)/18),centered=base.map(p=>p.map((x,j)=>x-center[j]));
 let u=raw.map(p=>p.map((x,j)=>x-mean[j]));
 const inertia=centered.reduce((sum,r,i)=>sum+mass[i]*(r[0]**2+r[1]**2),0),ly=centered.reduce((sum,r,i)=>sum+mass[i]*(r[1]*u[i][0]-r[0]*u[i][1]),0),omega=ly/inertia;
 u=u.map((v,i)=>[v[0]-omega*centered[i][1],v[1]+omega*centered[i][0]]);const norm=Math.max(...u.map(v=>Math.hypot(...v)));u=u.map(v=>v.map(x=>x/norm));
 const t=Math.sin(s.phase*Math.PI/180)*s.amplitude;return {positions:base.map((p,i)=>p.map((x,j)=>x+u[i][j]*t)),displacements:u};
}
function waterScene(s){
 const preview=waterPreview(s),pts=preview.positions,xy=p=>[320+p[0]*150,240-p[1]*150];
 let body=line(320,300,320,30,'#a5b1ba')+line(100,240,550,240,'#a5b1ba')+text(340,35,'z / C₂')+text(565,245,'x');
 for(let i=1;i<3;i++){const o=xy(pts[0]),h=xy(pts[i]);body+=line(...o,...h,'#37657b',8);}
 pts.forEach((p,i)=>{const [x,y]=xy(p);body+=`<circle cx="${x}" cy="${y}" r="${i?22:28}" fill="${i?'#eef6f8':'#cfe5ef'}" stroke="#244f68" stroke-width="2"/>`+text(x,y+6,i?'H'+i:'O');});
 const irrep=s.mode==='antisymmetric'?'B₁':'A₁',allowed=s.mode==='antisymmetric'?['ir-x','raman-xz'].includes(s.channel):['ir-z','raman-xx'].includes(s.channel);
 return {plot:svg('水分子在 xz 平面的示意振动',body),data:{mode:s.mode,phase:s.phase,positions:pts,irrep,allowed},html:`<h3>H₂O：${irrep} 模式 · ${allowed?'该偏振对称性允许':'该偏振被对称性禁止'}</h3><p>分子位于 xz 平面，主轴沿 z。两条 A₁ 模式与 z、对角极化率分量相容；B₁ 模式与 x、xz 相容。</p>${table(['操作','E','C₂(z)','σ(xz)','σ(yz)'],[['固定原子数',3,1,3,1],['矢量的迹',3,-1,1,1],['Γ₃N 的特征标',9,-1,3,1]])}<p>${math('\\Gamma_{3N}=3A_1+A_2+3B_1+2B_2')}，扣除平移与转动得到 ${math('\\Gamma_{\\mathrm{vib}}=2A_1+B_1')}。</p><p class="fd-scope">位移为模式对称性的示意动画，不计算真实频率、峰位或相对强度。“允许”不保证任意实验几何都出现强峰。</p>`,exercise:exercise('把红外偏振从 z 改成 x，哪些模式由允许变为禁止？为什么水在另一份表里写成 2A₁+B₂？',['A₁ 含有 z，B₁ 含有 x；当前模式的红外耦合必须与相同的矢量分量相容。','在当前 xz 平面约定中，两条 A₁ 对 z 偏振允许，B₁ 对 x 偏振允许。','若把分子放在 yz 平面，交换 x/y 会交换 B₁/B₂ 标签，物理模式并没有改变。'])};
}
function charactersScene(s){const r=charactersPreview(s),p=mv(r.fullMatrix,[.7,.4,.6]);let body=line(90,250,270,250,'#abb8c2')+line(180,310,180,50,'#abb8c2');body+=line(180,250,285,190,'#2673aa',4)+line(180,250,180+p[0]*150,250-p[1]*150,'#b1583d',4)+text(285,175,'r','#2673aa')+text(180+p[0]*150,230-p[1]*150,'Rr','#b1583d');return {plot:svg('几何作用与选取的矩阵空间',body+text(460,130,'三维矢量空间')+text(460,175,'(x,y) ⊕ z')+text(460,240,'χ = 矩阵对角元之和')),data:r,html:`<h3>选定空间的特征标 χ = ${r.trace}</h3>${matrix(r.matrix)}<p>完整三维的迹：${r.fullTrace}；xy 子空间的迹：${r.xyTrace}。把三维作用限制到保持不变的 xy 子空间，得到的是另一个表示。</p><p>在 C₄ᵥ 中，${math('D_{\\mathrm{vector}}=D_E\\oplus D_{A_1}')}。对 C₄ 而言，xy 块的迹为 0，z 的贡献为 1，所以完整矢量字符为 1。</p><p>对同一表示和同一操作，更换基底得到 ${math("D'(g)=S^{-1}D(g)S")}。矩阵元素可以改变，特征标保持不变。</p>`,exercise:exercise('二维旋转矩阵的迹是 0，它是否表示“没有变换”？',['读出 C₄ 的 xy 块：[[0,−1],[1,0]]。','它把 x 基向量变成 y，把 y 变成 −x；平方为 −I，明显不是零矩阵。','完整三维表示还包含不动的 z，因而 χ(C₄)=0+1=1。'])};}
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
  <p>当前表示空间 ${math(plane?'(x,y)':'(x,y,z)')}。比较绕 z 轴转正四分之一圈和 xz 镜面反射。</p>
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
function projectionScene(s){const r=projectionPreview(s),pts=[[320,48],[110,265],[530,265]],weights=r.normalized;let body=line(...pts[0],...pts[1])+line(...pts[1],...pts[2])+line(...pts[2],...pts[0]);pts.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="${24+Math.abs(weights[i])*15}" fill="${weights[i]<0?'#f3dace':'#cfe7f4'}" stroke="#315b73" stroke-width="2"/>`+text(x,y+6,'φ'+(i+1))+text(x,y+57,fmt(weights[i]),weights[i]<0?'#a44623':'#245f91');});return {plot:svg('D3 三个顶点标量基的投影系数',body),data:r,html:`<h3>三顶点标量基：${math('\\Gamma_{\\mathrm{sites}}=A_1\\oplus E')}</h3><p>每个顶点只放一个 s 型标量 φ，不是每个顶点各有 x/y 位移的六维问题。这里取等边三角形的正旋转 D₃ 子群。</p>${table(['共轭类','E','2C₃','3C₂'],[['顶点置换的迹',3,0,1],['A₁',1,1,1],['A₂',1,1,-1],['E',2,-1,0]])}<p>${math('P^{(\\alpha)}=\\frac{d_\\alpha}{6}\\sum_g\\chi_\\alpha(g)^*T(g)')}。当前归一化投影：[${r.normalized.map(fmt).join(', ')}]${r.norm<1e-9?'（投影为零，无法归一化）':''}。</p><div class="fd-matrix-pair"><div><strong>T(${r.name})：顶点基</strong>${matrix(r.matrix)}</div><div><strong>Dᴱ(${r.name})：u/v 基</strong>${matrix(r.eMatrix)}</div></div><p>${math('u=(2,-1,-1)/\\sqrt6')}，${math('v=(0,1,-1)/\\sqrt2')}。E 特征标投影给整个二维子空间；行投影 ${math('P^E_{21}')} 可从 u 的分量构造搭档 v。</p>`,exercise:exercise('为什么对一个种子使用 E 特征标投影后，还不能说已经得到完整 E 基底？',['E 的维数是 2，需要两个线性无关、正交的基函数。','Pᴱφ₁ 归一化后得到 u=(2,−1,−1)/√6，只是一个方向。','可投影第二个种子并正交化，也可用行投影 P₂₁ 得到 v=(0,1,−1)/√2。','用这两个基计算 QᵀT(g)Q，得到相同二维空间中的表示矩阵。'])};}
function splittingScene(s){const r=splittingPreview(s),energies=[0,.6*s.delta,-.4*s.delta,...r.levels.map(x=>x.energy)],low=Math.min(...energies)-.25,high=Math.max(...energies)+.25,energyY=e=>275-(e-low)*190/(high-low);let body='';const xs=[90,300,535];body+=line(xs[0]-45,energyY(0),xs[0]+45,energyY(0),'#46647d',4)+text(xs[0],40,'SO(3)：l = 2')+text(xs[0],75,'5 维');const stages=[{e:.6*s.delta,name:'E：2 重',x:xs[1]},{e:-.4*s.delta,name:'T₂：3 重',x:xs[1]}];for(const a of stages){body+=line(a.x-45,energyY(a.e),a.x+45,energyY(a.e),'#246b99',4)+text(a.x,energyY(a.e)-12,a.name);body+=line(xs[0]+45,energyY(0),a.x-50,energyY(a.e),'#c2ccd4',1);}body+=text(xs[1],40,'O：正八面体旋转群')+text(xs[2],40,'D₄：正四方旋转群');const groups=new Map();r.levels.forEach(a=>{const key=a.energy.toFixed(8);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);});for(const levels of groups.values()){const y=energyY(levels[0].energy);body+=line(xs[2]-43,y,xs[2]+43,y,'#267e70',4)+text(xs[2],y-10,levels.map(a=>a.irrep).join(' + '),undefined,16);for(const a of levels)body+=line(xs[1]+47,energyY(a.cubic),xs[2]-46,y,'#c2ccd4',1);}return {plot:svg('SO3 到 O 到 D4 的五个d轨道能级分裂',body),data:r,html:`<h3>保持五维空间与能级矩心，逐步降低对称性</h3><p>${math('D^{(l=2)}\\downarrow O=E\\oplus T_2')}；${math('E\\downarrow D_4=A_1\\oplus B_1')}，${math('T_2\\downarrow D_4=B_2\\oplus E')}。</p>${table(['轨道','D₄ 标签','能量'],r.levels.map(a=>[a.name,a.irrep,fmt(a.energy)]))}<p>按简并度加权的矩心 = ${fmt(r.barycenter)}。调节 Dₛ、Dₜ 只改变子能级相对位置，维数始终 1+1+1+2=5。</p><p class="fd-scope">采用单电子 d 轨道晶场参数模型，忽略自旋与 SOC；O、D₄ 都是正旋转群，标签不带 g。若另加反演讨论 Oₕ/D₄ₕ，本例 d 偶宇称态才可补 g 标签。</p>`,exercise:exercise('为什么 T₂ 在 D₄ 下可以分成 B₂+E，却不能分成五条互不相关的能级？',['从 l=2 开始只有五个轨道态，降对称只重新组织这些态。','O 的 E 和 T₂ 分别有2维和3维；在 D₄ 下，E→A₁+B₁，T₂→B₂+E。','保留下来的 E 仍受 D₄ 对称性保护而二重简并；任意把它拆成两个不同能量会破坏模型所保留的对称性。'])};}
function jtScene(s){const r=jtPreview(s),emin=Math.min(-s.g*s.g/(2*s.k),r.lower)-.3,emax=Math.max(2*s.k+2*s.g,r.upper)+.3,ey=e=>285-(e-emin)*240/(emax-emin);let body=line(60,290,600,290,'#aab7c2')+line(325,320,325,35,'#aab7c2')+text(600,322,'Qθ')+text(350,35,'能量');const curve=sign=>Array.from({length:101},(_,i)=>{const q=-2+4*i/100,e=.5*s.k*q*q+sign*s.g*Math.abs(q);return `${i?'L':'M'}${325+q*115},${ey(e)}`;}).join(' ');body+=`<path d="${curve(-1)}" fill="none" stroke="#216f99" stroke-width="4"/><path d="${curve(1)}" fill="none" stroke="#aa5841" stroke-width="3"/>`;const markX=325+s.qtheta*115;body+=`<circle cx="${markX}" cy="${ey(r.lower)}" r="7" fill="#216f99"/>`+text(140,55,'下支 / 上支：Qε=0 截面',undefined,17);return {plot:svg('线性E乘e Jahn Teller绝热能面截面',body),data:r,html:`<h3>对称性允许耦合，电子占据决定线性驱动力</h3><p>${math('H_{\\mathrm{el}}=g(Q_\\theta\\tau_z+Q_\\epsilon\\tau_x)')}，${math('V_\\pm=\\tfrac12kQ^2\\pm gQ')}，${math('Q=\\sqrt{Q_\\theta^2+Q_\\epsilon^2}')}。</p><p>当前 Q = ${fmt(r.Q)}；下支 V₋ = ${fmt(r.lower)}，上支 V₊ = ${fmt(r.upper)}；按当前占据的最低点半径 Q₀=${fmt(r.minRadius)}，稳定化能 EJT=${fmt(r.stabilization)}，占据总势能=${fmt(r.potential)}。单电子或单空穴时 Q₀=g/k、EJT=g²/(2k)。</p><p>${r.linearActive?'当前1电子/1空穴占据有未抵消的线性降低。':'当前简化占据中两支的线性项抵消，不能由一条下支曲线直接断言总能量降低。'} d⁹ 的 e<sub>g</sub> 单空穴是常见联系；高自旋 d⁵ 不是同一种 e<sub>g</sub> 轨道简并占据。</p><p class="fd-scope">图显示 Qε=0 的能面截面；圆点取当前二维 Q 的能量，故 Qε≠0 时可偏离截面曲线。此为线性 E⊗e 模型，不把任意简并或 Kramers 简并都视为 Jahn–Teller 驱动力。</p>`,exercise:exercise('g 变为 0 时，是否还存在有限畸变半径的最低谷？',['电子耦合消失，两支都变成 kQ²/2。','Q₀=g/k 变为0，稳定化能 g²/(2k) 也变为0，最低点回到高对称位置。','判断真实材料还要检查轨道占据、振电耦合、SOC和晶格环境；一张简并能级图不足以单独下结论。'])};}
function macroScene(s){const allowed=[1,2,3,4,6].includes(Number(s.n)),angle=2*Math.PI/s.n,trace=2*Math.cos(angle),t=Number(s.translation);let body='';for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const triangular=[3,6].includes(Number(s.n)),x=180+(i+(triangular?j*.5:0))*42,y=175+j*(triangular?36.4:42);body+=`<circle cx="${x}" cy="${y}" r="4" fill="#9bb0bf"/>`;}body+=line(180,175,260,175,'#2478a4',4)+line(180,175,180+80*Math.cos(angle),175-80*Math.sin(angle),'#a35038',4)+text(180,315,'旋转作用在平移格上')+text(465,95,'{R | t} → R')+text(465,145,'空间群 / 平移子群')+text(465,190,'= 宏观点群')+text(465,255,'不是任一点的位点对称群');return {plot:svg('从空间群去除平移得到宏观点群',body),data:{n:Number(s.n),allowed,planeTrace:trace,translation:t},html:`<h3>${s.n} 重轴：${allowed?'与三维周期晶格的晶体学限制相容':'不属于三维周期晶格允许的晶体学旋转阶数'}</h3><p>在周期平移格的基底中，旋转必须由整数矩阵表示。旋转轴垂直平面的迹 ${math('2\\cos(2\\pi/n)')} = ${fmt(trace)}；${allowed?'它满足相应整数条件。':'n=5 时该数不是整数，不能保持三维周期平移格。'}</p><p>同一个旋转 R 配上不同平移 tₓ=${fmt(t)}，属于不同 Seitz 操作；去掉平移后都映射到相同 R。宏观点群用 ${math('G/T')} 表示，T 是全部晶格平移组成的正规子群。</p><p>这解释了为什么宏观均匀物性张量由点群约束，而螺旋/滑移的分数平移仍会影响衍射消光和 Bloch 相位。宏观点群也不等于任意原子的位点对称群。</p>`,exercise:exercise('宏观物性中去掉了平移，是否意味着平移对所有实验都无关？',['宏观均匀张量不分辨同种局域结构的晶格平移，对称约束可用 G/T。','衍射振幅包含位置相位；螺旋轴、滑移面能引出消光。','Bloch 态也含平移相位。因此宏观点群、位点对称群、完整空间群各有不同用途。'])};}
function scene(theme,s){return ({water:waterScene,characters:charactersScene,projection:projectionScene,splitting:splittingScene,jt:jtScene,macro:macroScene})[theme](s);}

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
   comparisonBasis=s.basis;
   comparison.innerHTML=characterComparisonHTML(comparisonBasis);
   bindCharacterComparison(comparison,()=>current()&&root.querySelector('#fd-character-comparison')===comparison);
  }
 }
 function draw(){
  if(!current())return;
  clearWater();
  comparisonBasis=undefined;
  root.innerHTML=`<header class="fd-hero"><span class="fd-eyebrow">基础概念演示 · 从操作到物理结果</span><h2>把抽象对称性变成可以操作的课堂</h2><p>选择主题，改变参数，先预测再核对。每个演示都保留基底、坐标与模型约定。</p></header>
  <nav class="fd-tabs" aria-label="教学演示主题">${THEMES.map(([id,title])=>`<button type="button" data-theme="${id}" aria-pressed="${theme===id}">${title}</button>`).join('')}</nav>
  ${waterEntry()}
  <div class="fd-workspace"><aside class="fd-controls"><h3>调节与预测</h3>${controls(theme,s)}<button class="primary" type="button" data-action="python" ${busy||!run?'disabled':''}>${busy?'Python 正在核对…':'用浏览器内 Python 核对'}</button><p class="fd-status" role="status">${esc(pythonStatus||'图像随参数即时变化；Python 按钮用于独立核对计算。')}</p></aside><section class="fd-preview" aria-live="polite"></section></div>
  ${theme==='characters'?'<div id="fd-character-comparison"></div>'+characterWaterBridgeHTML():''}
  <div class="fd-questions"></div><details class="fd-python"><summary>查看 Python 核对数据</summary><pre>${pythonResult?esc(JSON.stringify(pythonResult,null,2)):'尚未核对。请点击上方 Python 按钮。'}</pre></details><footer class="fd-footer"><a href="#classroom/foundations?lesson=selection-rules">原有水分子选择定则讲义</a> · <a href="#classroom/foundations?module=salc">对称适应基计算</a> · <a href="#classroom/spin?module=orbitals">晶场与轨道专题</a> · <a href="docs/foundations-demos.md">教学模型、约定与来源</a></footer>`;
  update();
  bindCharacterWaterBridge(root,current);
  mountWater();
 }
 function syncLegacyPython(){
  if(!current())return;
  const button=root.querySelector('[data-action="python"]');if(button){button.disabled=busy||!run;button.textContent=busy?'Python 正在核对…':'用浏览器内 Python 核对';}
  const status=root.querySelector('.fd-status');if(status)status.textContent=pythonStatus||'图像随参数即时变化；Python 按钮用于独立核对计算。';
  const raw=root.querySelector('.fd-python')?.querySelector('pre');if(raw)raw.textContent=pythonResult?JSON.stringify(pythonResult,null,2):'尚未核对。请点击上方 Python 按钮。';
 }
 root.addEventListener('input',e=>{if(!current())return;const id=e.target.dataset.param;if(!id||e.target.tagName==='SELECT')return;s[id]=Number(e.target.value);revision++;pythonStatus='参数已改变；下次 Python 核对将使用当前输入。';pythonResult=null;update();root.querySelector('.fd-status').textContent=pythonStatus;});
 root.addEventListener('change',e=>{if(!current())return;const id=e.target.dataset.param;if(!id)return;s[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;revision++;pythonResult=null;pythonStatus='参数已改变；可重新用 Python 核对。';update();root.querySelector('.fd-status').textContent=pythonStatus;});
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
  if(action==='python'&&run&&!busy){
   stopAnimation();const stamp=revision,owned={pending:true,promise:null,live:true};legacyRequest=owned;busy=true;pythonStatus='正在启动浏览器内 Python 并核对当前模型…';syncLegacyPython();
   try{
    const input=payload();owned.promise=run('foundations_demos',input);const result=await owned.promise;owned.pending=false;
    if(!current()||!owned.live||legacyRequest!==owned||stamp!==revision)return;
    pythonResult=result;pythonStatus=result?.checks?.passed===false?'Python 返回检查未通过，请查看数据与输入。':'Python 核对完成：请比较矩阵、特征标与分解。';syncLegacyPython();latest={tool:'foundations_demos',input,result};
   }catch(error){owned.pending=false;if(current()&&owned.live&&legacyRequest===owned&&stamp===revision){pythonStatus='Python 核对未完成：'+error.message;syncLegacyPython();}}
   finally{owned.pending=false;if(legacyRequest===owned){legacyRequest=null;busy=false;syncLegacyPython();}}
  }
 });
 draw();return disposeView;
}
