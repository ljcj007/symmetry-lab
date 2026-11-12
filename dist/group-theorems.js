import {mathHTML} from './math-display.js?v=20261113-prose2';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-9?'0':Number(x.toFixed(4)).toString();
const math=t=>`<span class="sl-math" data-math-source="${esc(t)}">${mathHTML(t)}</span>`;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),T=a=>a[0].map((_,j)=>a.map(r=>r[j])),mm=(a,b)=>a.map(r=>T(b).map(c=>dot(r,c))),eye=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0)),scale=(a,s)=>a.map(r=>r.map(x=>x*s)),sum=(items,n)=>items.reduce((a,b)=>a.map((r,i)=>r.map((x,j)=>x+b[i][j])),eye(n).map(r=>r.map(()=>0))),err=(a,b)=>Math.max(...a.flatMap((r,i)=>r.map((x,j)=>Math.abs(x-b[i][j])))),trace=a=>a.reduce((s,r,i)=>s+r[i],0),comm=(a,b)=>err(mm(a,b),mm(b,a));
const names=['e','(12)','(23)','(13)','(123)','(132)'],perms=[[0,1,2],[1,0,2],[0,2,1],[2,1,0],[1,2,0],[2,0,1]],classes=[[0],[1,2,3],[4,5]],sizes=[1,3,2],chars={A1:[1,1,1],A2:[1,-1,1],E:[2,0,-1]},dims={A1:1,A2:1,E:2};
const mult=perms.map(a=>perms.map(b=>perms.findIndex(c=>c.every((v,j)=>v===a[b[j]])))),inverse=mult.map(row=>row.indexOf(0));
const matrices=perms.map(p=>Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>p[j]===i?1:0))),u=[2,-1,-1].map(x=>x/Math.sqrt(6)),v=[0,1,-1].map(x=>x/Math.sqrt(2)),basis=u.map((x,i)=>[x,v[i]]),em=matrices.map(d=>mm(mm(T(basis),d),basis)),PA=Array.from({length:3},()=>[1/3,1/3,1/3]),PE=PA.map((r,i)=>r.map((x,j)=>(i===j?1:0)-x));
const rep=name=>name==='permutation'?matrices:name==='E'?em:name==='A1'?names.map(()=>[[1]]):names.map((_,i)=>[[[0,4,5].includes(i)?1:-1]]);
const inv2=a=>{const d=a[0][0]*a[1][1]-a[0][1]*a[1][0];return [[a[1][1]/d,-a[0][1]/d],[-a[1][0]/d,a[0][0]/d]];};
export const theoremThemes=[{id:'rearrangement',title:'重排定理'},{id:'conjugacy',title:'共轭与共轭类'},{id:'normal',title:'正规子群与商群'},{id:'irreducible',title:'可约与不可约表示'},{id:'schur',title:'Schur 引理'},{id:'unitarity',title:'有限群表示的幺正化'},{id:'orthogonality',title:'大正交定理'},{id:'reduction',title:'特征标约化与维数'},{id:'degeneracy',title:'对称性与能级简并'}];
const defaults={rearrangement:{h:1,side:'left'},conjugacy:{g:1,h:4},normal:{subgroup:'A3',h:2},irreducible:{representation:'permutation',g:4},schur:{representation:'permutation',a:.4,b:1.1},unitarity:{scale:1.8,shear:.6,g:4,metric:'average'},orthogonality:{alpha:'E',beta:'E',i:0,j:0,k:0,l:0},reduction:{preset:'permutation',chiE:3,chiT:1,chiC:0},degeneracy:{a:-.5,b:.5,epsilon:0}};
let latest=null;
export const getGroupTheoremsResult=()=>latest;

export function theoremPreview(experiment,params={}){
 const p={...defaults[experiment],...params};
 if(experiment==='rearrangement'){const images=names.map((_,g)=>p.side==='left'?mult[p.h][g]:mult[g][p.h]);return {h:p.h,side:p.side,images,multiplicationTable:mult,inverse:inverse[p.h]};}
 if(experiment==='conjugacy'){const conjugate=mult[mult[p.h][p.g]][inverse[p.h]];return {g:p.g,h:p.h,inverse:inverse[p.h],conjugate,classIndex:classes.findIndex(c=>c.includes(p.g)),selectedMatrix:matrices[p.g],conjugateMatrix:matrices[conjugate]};}
 if(experiment==='normal'){
  const subgroup=p.subgroup==='A3'?[0,4,5]:[0,1],conj=g=>subgroup.map(x=>mult[mult[g][x]][inverse[g]]).sort((a,b)=>a-b),normal=names.every((_,g)=>JSON.stringify(conj(g))===JSON.stringify(subgroup)),leftCosets=[],rightCosets=[];
  names.forEach((_,g)=>{for(const [store,c] of [[leftCosets,subgroup.map(x=>mult[g][x]).sort((a,b)=>a-b)],[rightCosets,subgroup.map(x=>mult[x][g]).sort((a,b)=>a-b)]])if(!store.some(q=>JSON.stringify(q)===JSON.stringify(c)))store.push(c);});
  return {subgroupName:p.subgroup,subgroup,h:p.h,conjugated:conj(p.h),normal,leftCosets,rightCosets,quotientTable:normal?leftCosets.map(a=>leftCosets.map(b=>leftCosets.findIndex(c=>c.includes(mult[a[0]][b[0]])))):null};
 }
 if(experiment==='irreducible'){const ds=rep(p.representation),cs=classes.map(c=>trace(ds[c[0]])),characterNorm=dot(sizes,cs.map(x=>x*x))/6;return {representation:p.representation,g:p.g,selectedMatrix:ds[p.g],representationCharacters:cs,characterNorm,irreducible:Math.abs(characterNorm-1)<1e-9};}
 if(experiment==='schur'){const ds=rep(p.representation),intertwiner=p.representation==='E'?scale(eye(2),p.a):sum([scale(PA,p.a),scale(PE,p.b)],3);return {intertwiner,scalar:p.representation==='E'||Math.abs(p.a-p.b)<1e-12,commutatorResidual:Math.max(...ds.map(d=>comm(intertwiner,d)))};}
 if(experiment==='unitarity'){
  const S=[[p.scale,p.shear],[0,1]],ds=em.map(d=>mm(mm(inv2(S),d),S)),metric=mm(T(S),S),averagedMetric=scale(sum(ds.map(d=>mm(T(d),d)),2),1/6),chosenMetric=p.metric==='average'?averagedMetric:metric,a=Math.sqrt(chosenMetric[0][0]),b=chosenMetric[0][1]/a,c=Math.sqrt(chosenMetric[1][1]-b*b),factor=[[a,b],[0,c]],us=ds.map(d=>mm(mm(factor,d),inv2(factor)));
  return {S,nonunitary:ds[p.g],metric,averagedMetric,chosenMetric,factor,unitary:us[p.g],ordinaryResidual:Math.max(...ds.map(d=>err(mm(T(d),d),eye(2)))),metricResidual:Math.max(...ds.map(d=>err(mm(mm(T(d),chosenMetric),d),chosenMetric))),unitaryResidual:Math.max(...us.map(d=>err(mm(T(d),d),eye(2))))};
 }
 if(experiment==='orthogonality'){
  const da=rep(p.alpha),db=rep(p.beta),terms=da.map((d,g)=>d[p.i][p.j]*db[g][p.k][p.l]),expected=p.alpha===p.beta&&p.i===p.k&&p.j===p.l?6/dims[p.alpha]:0;return {terms,total:terms.reduce((a,b)=>a+b,0),expected,characterInner:dot(sizes,chars[p.alpha].map((x,i)=>x*chars[p.beta][i]))/6};
 }
 if(experiment==='reduction'){
  const inputCharacters=p.preset==='custom'?[p.chiE,p.chiT,p.chiC]:({permutation:[3,1,0],regular:[6,0,0],E:[2,0,-1]})[p.preset],weightedTerms=Object.fromEntries(Object.entries(chars).map(([name,row])=>[name,row.map((x,i)=>x*inputCharacters[i]*sizes[i])])),multiplicities=Object.fromEntries(Object.entries(weightedTerms).map(([name,terms])=>[name,terms.reduce((a,b)=>a+b,0)/6]));
  return {inputCharacters,weightedTerms,multiplicities,validCharacter:Object.values(multiplicities).every(x=>x>=-1e-10&&Math.abs(x-Math.round(x))<1e-9),reconstructedDimension:Object.entries(multiplicities).reduce((sum,[name,m])=>sum+dims[name]*m,0),dimensionSquaredSum:6,classCount:3};
 }
 if(experiment==='degeneracy'){
  const hamiltonian=sum([scale(PA,p.a),scale(PE,p.b),u.map(x=>u.map(y=>p.epsilon*x*y))],3),commutatorResidual=Math.max(...matrices.map(d=>comm(hamiltonian,d)));return {hamiltonian,levels:[{basis:'A1',energy:p.a,irrep:'A1'},{basis:'u',energy:p.b+p.epsilon,irrep:'E'},{basis:'v',energy:p.b,irrep:'E'}],commutatorResidual,fullSymmetry:commutatorResidual<1e-9,protectedE:Math.abs(p.epsilon)<1e-12,accidentalThreefold:Math.abs(p.a-p.b)<1e-12&&Math.abs(p.epsilon)<1e-12};
 }
 throw new Error('未知群论主题');
}

const table=(heads,rows)=>`<div class="gt-scroll"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const matrix=a=>`<div class="gt-matrix" style="--gt-cols:${a[0].length}">${a.flatMap(r=>r.map(x=>`<span>${fmt(x)}</span>`)).join('')}</div>`;
const text=(x,y,value,color='#183c52',size=17)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${esc(value)}</text>`;
const line=(x,y,a,b,color='#7c96a6',w=2)=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${w}"/>`;
const svg=(label,body)=>`<svg viewBox="0 0 660 330" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>`;
const exercise=(q,steps)=>`<section class="gt-exercise"><h3>先预测，再逐步核对</h3><p>${q}</p><details><summary>展开推导与条件</summary><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol></details></section>`;
const select=(id,label,value,options)=>`<label><span>${label}</span><select data-param="${id}" aria-label="${esc(label)}">${options.map(([v,t])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const range=(id,label,v,min,max,step)=>`<label><span>${label} <output data-output="${id}">${v}</output></span><input type="range" aria-label="${esc(label)}" data-param="${id}" value="${v}" min="${min}" max="${max}" step="${step}"></label>`;
const elementOptions=names.map((name,i)=>[i,name]),repOptions=[['permutation','三个顶点的置换表示'],['E','二维复不可约表示 E'],['A1','一维 A₁'],['A2','一维 A₂']];
const setLabel=indices=>'{'+indices.map(i=>names[i]).join(', ')+'}';
function controls(t,p){
 if(t==='rearrangement')return select('h','固定乘子 h',p.h,elementOptions)+select('side','乘法方向',p.side,[['left','左乘：h g'],['right','右乘：g h']]);
 if(t==='conjugacy')return select('g','被共轭的元素 g',p.g,elementOptions)+select('h','改变描述的元素 h',p.h,elementOptions);
 if(t==='normal')return select('subgroup','待检查子群',p.subgroup,[['A3','A₃ = {e,(123),(132)}'],['H12','H = {e,(12)}']])+select('h','选择共轭元素 h',p.h,elementOptions);
 if(t==='irreducible')return select('representation','表示空间',p.representation,repOptions)+select('g','查看一个操作的矩阵',p.g,elementOptions);
 if(t==='schur')return select('representation','表示空间',p.representation,repOptions.slice(0,2))+range('a','A₁ 块 / E 单块的标量 a',p.a,-2,2,.05)+range('b','可约表示中 E 块的标量 b',p.b,-2,2,.05);
 if(t==='unitarity')return range('scale','相似变换的伸缩 s',p.scale,.4,3,.05)+range('shear','相似变换的剪切 c',p.shear,-1.5,1.5,.05)+select('g','查看群操作',p.g,elementOptions)+select('metric','正定内积来源',p.metric,[['average','对全群平均 D†D'],['similarity','已知 S†S']]);
 if(t==='orthogonality')return select('alpha','表示 α',p.alpha,repOptions.slice(1))+select('beta','表示 β',p.beta,repOptions.slice(1))+['i','j','k','l'].map(key=>select(key,`矩阵下标 ${key}（从 1 起）`,p[key],Array.from({length:dims[['i','j'].includes(key)?p.alpha:p.beta]},(_,n)=>[n,String(n+1)]))).join('');
 if(t==='reduction')return select('preset','待约化的特征标',p.preset,[['permutation','三顶点置换：χ=(3,1,0)'],['regular','正则表示：χ=(6,0,0)'],['E','二维 E：χ=(2,0,−1)'],['custom','自己提出一个特征标猜测']])+(p.preset==='custom'?range('chiE','恒等类 χ(e)',p.chiE,0,12,1)+range('chiT','对换类的 χ',p.chiT,-6,6,1)+range('chiC','三循环类的 χ',p.chiC,-6,6,1):'');
 return range('a','A₁ 子空间能量 a',p.a,-2,2,.05)+range('b','E 子空间能量 b',p.b,-2,2,.05)+range('epsilon','E 搭档破缺项 ε',p.epsilon,-1,1,.025);
}

function scene(t,p){
 const r=theoremPreview(t,p);let body='',html='',task;
 if(t==='rearrangement'){
  names.forEach((name,i)=>{const x=65+i*104,y=65+r.images[i]*0;body+=`<rect x="${x-40}" y="65" width="80" height="43" rx="6" fill="#edf4f8" stroke="#93aebd"/>`+text(x,92,name)+line(x,112,65+r.images[i]*104,235,'#4e8ba6',2)+text(65+i*104,267,names[i]);});
  html=`<h3>固定乘子给出群元素的一一重排</h3><p>${math(p.side==='left'?String.raw`g\mapsto hg`:String.raw`g\mapsto gh`)}，固定 h=${esc(names[p.h])}。输出顺序为 ${esc(r.images.map(i=>names[i]).join(', '))}；6 个元素各出现一次。</p><p>这是群乘法作用在群元素集合上的双射，不要求群交换。逆映射使用 ${math(String.raw`h^{-1}`)}=${esc(names[r.inverse])}。</p>`;
  task=exercise('交换乘法方向会改变重排吗？会改变双射性质吗？',['在非交换群中，左乘与右乘的具体顺序可以不同。','若 hg₁=hg₂，左乘h的逆得到g₁=g₂；右乘情形同理。','有限群上的单射也是满射，因此结果只改变排列，不丢失或重复元素。']);
 }
 if(t==='conjugacy'){
  classes.forEach((members,j)=>{const x=20+j*215;body+=`<rect x="${x}" y="60" width="200" height="225" rx="12" fill="#f2f7fa" stroke="#a2b8c5"/>`+text(x+100,90,['恒等类','对换类','三循环类'][j]);members.forEach((g,i)=>{body+=text(x+100,135+i*52,names[g],g===r.conjugate?'#ad6130':g===p.g?'#237a9c':'#35556a',20);});});
  html=`<h3>${math(String.raw`hgh^{-1}`)}=${esc(names[r.conjugate])}，仍在同一共轭类</h3><p>当前 g=${esc(names[p.g])}，h=${esc(names[p.h])}。共轭相当于用群内变换重新标记描述；共轭操作的表示矩阵相似，因而迹相同。</p><p>本页所有实验使用元素次序 e、三个对换、两个三循环；共轭类大小为 1、3、2。它与前面 D₃ 课堂按 E、2C₃、3C₂ 的列序不同。</p>`;
  task=exercise('是否每两个同阶元素都一定共轭？本页能支持多大的结论？',['共轭保持元素阶，因为(hgh⁻¹)ⁿ=hgⁿh⁻¹。','在S₃中，三个对换确实构成一个共轭类，两个三循环构成另一类。','阶相同是一般群中共轭的必要条件，并非充分条件；不能把这个小模型的分类直接推广到所有群。']);
 }
 if(t==='normal'){
  r.leftCosets.forEach((c,i)=>{const x=30+i*210;body+=`<rect x="${x}" y="75" width="190" height="110" rx="12" fill="#eef5f8" stroke="#8babbc"/>`+text(x+95,108,`左陪集 ${i+1}`)+text(x+95,148,setLabel(c),undefined,13);});body+=text(330,239,'h H h⁻¹ = '+setLabel(r.conjugated),undefined,18)+text(330,285,r.normal?'对全体 h 都等于 H：正规':'存在 h 使共轭集合改变：非正规',r.normal?'#26786d':'#a85e34');
  html=`<h3>${r.normal?'正规子群：可以构造商群':'非正规子群：仍有陪集，但不能直接作为商群'}</h3><p>H=${esc(setLabel(r.subgroup))}。当前 h=${esc(names[p.h])} 的共轭集合如图；正规性还必须对全部 h 检查，而非只通过一次选择。</p>${table(['左陪集','右陪集'],r.leftCosets.map((c,i)=>[esc(setLabel(c)),esc(setLabel(r.rightCosets[i]))]))}${r.normal?`<p>商群在两个陪集上按代表元乘法定义，结果与代表元选择无关。</p>${table(['乘法','H','另一陪集'],r.quotientTable.map((row,i)=>[i?'另一陪集':'H',...row.map(x=>x?'另一陪集':'H')]))}`:'<p>非正规时代表元乘法不能给出良定义的陪集群运算；左陪集的存在本身不保证商群存在。</p>'}`;
  task=exercise('H={e,(12)} 在 h=e 时通过共轭检验，为什么仍不是正规子群？',['h=e 的检验对任何子群都成立。','改选h=(23)，共轭会把(12)变成另一个对换，集合不再是原来的H。','正规子群要求对全群元素保持不变；A₃满足此条件，并给出二阶商群。']);
 }
 if(t==='irreducible'){
  const blocks=p.representation==='permutation'?[['A₁',1],['E',2]]:[[p.representation,dims[p.representation]]];blocks.forEach(([name,d],i)=>{const x=blocks.length===1?205:65+i*310;body+=`<rect x="${x}" y="85" width="245" height="155" rx="14" fill="${d===2?'#e5f1f6':'#f7ecd9'}" stroke="#91aeba"/>`+text(x+122,145,name,undefined,32)+text(x+122,195,`共同不变子空间：维数 ${d}`);});
  html=`<h3>特征标自内积（范数平方）为 ${fmt(r.characterNorm)}</h3><p>${math(String.raw`\langle\chi,\chi\rangle=\frac1{|G|}\sum_g|\chi(g)|^2=\sum_\alpha m_\alpha^2`)}。当前三类特征标为 (${r.representationCharacters.map(fmt).join(', ')})，${r.irreducible?'得到1，表示在复数域不可约。':'得到2，对应A₁与E各出现一次。'}</p><p>所选操作 ${esc(names[p.g])} 的矩阵：</p>${matrix(r.selectedMatrix)}<p>不可约要求对全体群操作都没有非平凡共同不变子空间。一个矩阵可对角化不等于整个表示可分解；不同操作的本征方向通常并不一致。</p>`;
  task=exercise('E 中某个反射型矩阵有两个本征向量，为什么 E 仍可不可约？',['单个操作的本征向量只对这个操作不变。','另一个群操作可以把这两个方向混合，因此它们不构成全群共同不变的一维空间。','用整个群的字符自内积检验，E得到1，三顶点置换表示得到2。']);
 }
 if(t==='schur'){
  const blocks=p.representation==='E'?[['E',p.a,2]]:[['A₁',p.a,1],['E',p.b,2]];blocks.forEach(([label,x,d],i)=>{const left=blocks.length===1?205:55+i*315;body+=`<rect x="${left}" y="90" width="260" height="145" rx="12" fill="#ecf4f8" stroke="#91abba"/>`+text(left+130,135,label,undefined,27)+text(left+130,185,`${fmt(x)} × I${d}`);});
  html=`<h3>与所有表示矩阵对易的残差：${fmt(r.commutatorResidual)}</h3><p>Schur 引理在有限维复不可约空间内把自交织算符限制为标量 ${math(String.raw`M=cI`)}。当前 M ${r.scalar?'是整个表示空间上的标量。':'不是整个三维空间上的标量，却分别在A₁与E块上为标量，因为当前表示可约。'}</p>${matrix(r.intertwiner)}<p>不等价不可约表示之间的交织为零；等价拷贝之间可以有非零交织。若同一不可约表示出现多次，对易算符还可在重数空间中混合副本，不能把整个等型分量都视为一个标量块。</p>`;
  task=exercise('a≠b 时 M=aP₍A₁₎+bP₍E₎ 对易，却不正比单位矩阵，这是否反驳 Schur 引理？',['该反例所在的三维表示是A₁⊕E，而不是一个不可约表示。','Schur引理分别作用在不等价的A₁和E子空间，允许两个不同标量。','换到单个E表示时，对易算符必须为cI₂；多个等价E副本则还需考虑重数空间。']);
 }
 if(t==='unitarity'){
  const sinv=inv2(r.S),points=Array.from({length:65},(_,i)=>[Math.cos(2*Math.PI*i/64),Math.sin(2*Math.PI*i/64)]),skewed=points.map(v=>sinv.map(row=>dot(row,v))),extent=Math.max(1,...skewed.map(v=>Math.hypot(...v))),path=(ps,cx)=>ps.map((v,i)=>`${i?'L':'M'}${cx+100*v[0]/extent},${170-100*v[1]/extent}`).join(' ');body+=`<path d="${path(points,170)}" fill="none" stroke="#287d9e" stroke-width="3"/><path d="${path(skewed,490)}" fill="none" stroke="#b56b38" stroke-width="3"/>`+text(170,35,'标准正交坐标')+text(490,35,'相似变换后的坐标')+text(330,305,'同一表示可改变内积，恢复幺正形式');
  html=`<h3>群平均给出正定内积，不把一般相似变换误认为幺正变换</h3><p>${math(String.raw`D'(g)=S^{-1}D(g)S`)}。普通欧氏内积下的全群幺正残差为 ${fmt(r.ordinaryResidual)}。选用 ${math(String.raw`M=S^\dagger S`)} 或 ${math(String.raw`M_{\rm avg}=\frac1{|G|}\sum_g D'(g)^\dagger D'(g)`)} 后，${math(String.raw`D'(g)^\dagger MD'(g)=M`)}，残差为 ${fmt(r.metricResidual)}。</p><p>正定 M 分解为 ${math(String.raw`C^\dagger C=M`)}，换基 ${math(String.raw`U(g)=CD'(g)C^{-1}`)} 的全群幺正残差为 ${fmt(r.unitaryResidual)}。</p>${table(['当前操作','非正交基矩阵','新幺正矩阵'],[[esc(names[p.g]),matrix(r.nonunitary),matrix(r.unitary)]])}<p>定理适用于有限群的有限维复表示。此例使用实矩阵作为复矩阵的特例；“等价于幺正表示”不意味着任何坐标下的原矩阵已经幺正。</p>`;
  task=exercise('群平均为什么正定且不随群操作改变？',['每个D(g)可逆，对非零v有v†Mv=(1/|G|)Σg||D(g)v||²>0。','在D(h)†MD(h)中，乘法把求和的群元素重排，求和结果不变。','正定度量存在可逆平方根或Cholesky因子，用它换基即可把度量幺正性写为普通幺正性。']);
 }
 if(t==='orthogonality'){
  const y0=160;body+=line(40,y0,630,y0,'#a9bdc8',1);r.terms.forEach((value,i)=>{const x=65+i*105,h=100*Math.abs(value);body+=`<rect x="${x-16}" y="${value>=0?y0-h:y0}" width="32" height="${Math.max(1,h)}" fill="${value>=0?'#297c9d':'#b56a3b'}"/>`+text(x,285,names[i],undefined,14)+text(x,35,fmt(value));});body+=text(330,320,`求和 ${fmt(r.total)}；定理预期 ${fmt(r.expected)}`);
  html=`<h3>标准幺正不可约矩阵的矩阵元正交</h3><p>${math(String.raw`\sum_g D^\alpha_{ij}(g)^*D^\beta_{kl}(g)=\frac{|G|}{d_\alpha}\delta_{\alpha\beta}\delta_{ik}\delta_{jl}`)}。</p><p>当前选择 (${esc(p.alpha)},${p.i+1},${p.j+1}) 与 (${esc(p.beta)},${p.k+1},${p.l+1})；六个群元素的贡献如图。字符内积 ${math(String.raw`\frac1{|G|}\sum_g\chi_\alpha(g)^*\chi_\beta(g)`)} 为 ${fmt(r.characterInner)}。</p><p>这里使用声明的标准正交E基。任意非幺正相似变换后的矩阵元不能直接套用同一公式；特征标则在相似变换下不变。</p>`;
  task=exercise('保持 α=β=E，改成不同的矩阵元下标，求和何时应为零？',['只有i=k且j=l时两个Kronecker条件同时为1。','当两个下标都相等时，结果为|S₃|/dE=6/2=3；任一条件不满足则为0。','换成不等价α、β时也为0；不要把矩阵元的总和与已除以群阶的字符内积混淆。']);
 }
 if(t==='reduction'){
  ['A1','A2','E'].forEach((name,i)=>{const x=40+i*215,m=r.multiplicities[name];body+=`<rect x="${x}" y="90" width="190" height="145" rx="12" fill="${r.validCharacter?'#edf6f7':'#fff1e6'}" stroke="#a8bec8"/>`+text(x+95,136,name,undefined,25)+text(x+95,183,`重数 ${fmt(m)}`);});body+=text(330,285,`维数重建：${fmt(r.reconstructedDimension)}；χ(e)=${fmt(r.inputCharacters[0])}`);
  html=`<h3>${r.validCharacter?'约化得到非负整数重数':'此特征标猜测未通过非负整数重数检验'}</h3><p>${math(String.raw`m_\alpha=\frac16\sum_c n_c\chi_\alpha(c)^*\chi(c)`)}，本页列序为恒等、对换、三循环，权重为1、3、2。</p>${table(['不可约表示','加权三项','重数'],Object.entries(r.multiplicities).map(([name,m])=>[name,r.weightedTerms[name].map(fmt).join(' + '),fmt(m)]))}<p>维数重建本身不够：还需每个重数是非负整数。当前 ${math(String.raw`\sum_\alpha m_\alpha d_\alpha`)}=${fmt(r.reconstructedDimension)}。</p><p>完整不可约表中，${math(String.raw`1^2+1^2+2^2=6`)}；不可约表示数3等于共轭类数3。正则表示中每个不可约表示的重数等于其维数。</p>`;
  task=exercise('把 χ=(3,1,0) 的第二项当成三个独立类重复使用，再额外乘3，会发生什么？',['第二项代表同一共轭类中每个对换的特征标，类大小3只计入一次。','正确公式用类权重1、3、2，得到A₁重数1、A₂重数0、E重数1。','若逐元素求和，则应列6项并取消类权重；两种方式等价，不能混用。']);
 }
 if(t==='degeneracy'){
  const lo=Math.min(...r.levels.map(x=>x.energy))-.3,hi=Math.max(...r.levels.map(x=>x.energy))+.3,Y=e=>275-(e-lo)/(hi-lo)*220;r.levels.forEach((o,i)=>{const x=75+i*210;body+=line(x,Y(o.energy),x+135,Y(o.energy),i?'#277c9e':'#b36a38',5)+text(x+67,Y(o.energy)-16,o.basis)+text(x+67,Y(o.energy)+28,fmt(o.energy));});
  html=`<h3>${r.fullSymmetry?'H 保持完整 S₃ 对称':'ε 项破坏完整 S₃ 对称'}</h3><p>${math(String.raw`H=aP_{A_1}+bP_E+\epsilon uu^T`)}，全群对易残差为 ${fmt(r.commutatorResidual)}。${r.protectedE?'E中的两个搭档有相同能量，构成对称性保护的二重态。':'u与v能量分别为b+ε与b；当前E搭档一般已劈裂。'}${r.accidentalThreefold?'当前a=b，A₁与E又恰好重合，出现额外的意外三重简并。':''}</p><p>不可约表示的维数对应相应能级多重态的对称保护维数，不是任意可约表示的总维数都等于一个能级的简并度。多个等价副本可在重数空间混合，Hamiltonian通常作用为 ${math(String.raw`I_d\otimes K_m`)}；不同重数本征值各保留d重，而不必形成d×m重。</p>`;
  task=exercise('把 a 调到 b，再令 ε≠0，能否把所有重合都归因于三维不可约表示？',['三维置换表示可约为A₁⊕E，本模型并不存在三维不可约表示。','ε=0时E内二重由S₃保护；a=b使A₁与E意外重合，得到三重。','ε≠0时全群对易关系被破坏，E搭档可劈裂；残留能量重合还需分别判断，不能只数当前矩阵维数。']);
 }
 return {plot:svg('S₃群论定理交互示意',body),html,exercise:task,data:r};
}
export function theoremScene(experiment,params={}){return scene(experiment,{...defaults[experiment],...params});}

export async function renderGroupTheoremsView({container,selection={},run,onNavigate=()=>{}}){
 let theme=theoremThemes.some(t=>t.id===selection.experiment)?selection.experiment:'rearrangement',state={...defaults[theme]},revision=0,busy=false,status='',pythonResult=null;
 container.innerHTML='<article class="gt-course"></article>';const root=container.firstElementChild,current=()=>container.isConnected!==false&&container.firstElementChild===root,payload=()=>({experiment:theme,...state});
 function update(){const out=scene(theme,state);root.querySelector('.gt-preview').innerHTML=out.plot+out.html;root.querySelector('.gt-questions').innerHTML=out.exercise;root.querySelectorAll('[data-output]').forEach(el=>el.textContent=state[el.dataset.output]);latest={tool:'group_theorems_preview',input:payload(),result:{...out.data,computation:'deterministic JavaScript finite-group preview'}};}
 function draw(){root.innerHTML=`<header class="gt-hero"><span>群论定理工坊</span><h2>用同一个 ${math(String.raw`S_3`)} 模型贯通九个定理与应用</h2><p>从六个置换出发，追踪共轭、表示和物理简并。例子中的实矩阵视为复数域上的矩阵。</p></header><nav class="gt-tabs" aria-label="群论定理与应用">${theoremThemes.map(t=>`<button type="button" data-theme="${t.id}" aria-pressed="${t.id===theme}">${t.title}</button>`).join('')}</nav><div class="gt-workspace"><aside class="gt-controls"><h3>选择与计算</h3>${controls(theme,state)}<button type="button" class="primary" data-action="python" ${busy||!run?'disabled':''}>${busy?'正在用 Python 核对…':'用浏览器内 Python 核对'}</button><p class="gt-status" role="status">${esc(status||'先预测，再查看运算与定理给出的结果。')}</p></aside><section class="gt-preview" aria-live="polite"></section></div><div class="gt-questions"></div><details class="gt-python"><summary>Python 数据与条件核对</summary><pre>${pythonResult?esc(JSON.stringify(pythonResult,null,2)):'点击核对按钮后显示当前输入的结果。'}</pre></details><footer><a href="#classroom/foundations?module=demos">基础概念演示</a> · <a href="#classroom/foundations?module=mini">对称性进阶微实验</a> · <a href="docs/group-theorems.md">教学模型与约定</a></footer>`;update();}
 function changed(e){const key=e.target.dataset.param;if(!key)return;revision++;state[key]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;if(theme==='orthogonality'){for(const q of ['i','j'])state[q]=Math.min(state[q],dims[state.alpha]-1);for(const q of ['k','l'])state[q]=Math.min(state[q],dims[state.beta]-1);}pythonResult=null;status='输入已改变，可重新核对当前结论。';if(e.target.tagName==='SELECT')draw();else{update();root.querySelector('.gt-status').textContent=status;}}
 root.addEventListener('input',e=>{if(e.target.tagName!=='SELECT')changed(e);});root.addEventListener('change',changed);
 root.addEventListener('click',async e=>{const tab=e.target.closest('[data-theme]');if(tab){revision++;theme=tab.dataset.theme;state={...defaults[theme]};status='';pythonResult=null;onNavigate({experiment:theme});draw();return;}if(e.target.closest('[data-action]')?.dataset.action==='python'&&run&&!busy){const requestedRevision=revision,input=payload();busy=true;status='正在检查当前有限群模型…';draw();try{const result=await run('group_theorems',input);if(!current()||requestedRevision!==revision)return;pythonResult=result;status=result?.validCharacter===false?'Python 已核对：此字符猜测不满足非负整数重数条件。':result?.checks?.passed===false?'Python 检查未通过，请查看输入与数据。':'Python 核对完成。';draw();latest={tool:'group_theorems',input,result};}catch(error){if(current()&&requestedRevision===revision){status='Python 核对未完成：'+error.message;draw();}}finally{busy=false;if(current()){const b=root.querySelector('[data-action="python"]');b.disabled=false;b.textContent='用浏览器内 Python 核对';}}}});
 draw();
}
