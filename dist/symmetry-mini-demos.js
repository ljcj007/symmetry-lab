import {mathHTML} from './math-display.js?v=20261110-en1';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-9?'0':Number(x.toFixed(4)).toString();
const math=t=>`<span class="sl-math" data-math-source="${esc(t)}">${mathHTML(t)}</span>`;
const groupMath=g=>math(({Td:String.raw`T_d`,Oh:String.raw`O_h`,Ih:String.raw`I_h`})[g]||g);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.sqrt(dot(a,a));
const mv=(a,v)=>a.map(r=>dot(r,v));
const line=(a,b,c,d,color='#4d6577',w=2)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${color}" stroke-width="${w}"/>`;
const text=(x,y,t,color='#16354c',size=17)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle">${t}</text>`;
const svg=(title,body)=>`<svg viewBox="0 0 640 340" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const table=(heads,rows)=>`<div class="smd-scroll"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const exercise=(q,steps)=>`<section class="smd-exercise"><h3>预测与分步推导</h3><p>${q}</p><details><summary>查看推导与反例</summary><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol></details></section>`;
const range=(id,label,v,min,max,step)=>`<label><span>${label} <output data-output="${id}">${v}</output></span><input type="range" aria-label="${esc(label)}" data-param="${id}" value="${v}" min="${min}" max="${max}" step="${step}"></label>`;
const select=(id,label,v,choices)=>`<label><span>${label}</span><select aria-label="${esc(label)}" data-param="${id}">${choices.map(([x,t])=>`<option value="${x}" ${String(x)===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`;
export const miniDemoThemes=[{id:'polyhedra',title:'五种正多面体与点群'},{id:'vibrations',title:'分子振动与简并'},{id:'bands',title:'能带与 Kramers 简并'},{id:'manybody',title:'两自旋与交换对称性'},{id:'time-reversal',title:'时间反演：反幺正作用'},{id:'double-soc',title:'双群、自旋旋转与 SOC'}];
const defaults={polyhedra:{polyhedron:'tetra',order:3,fraction:1},vibrations:{k0:1,k:.5,delta:0,mix:0,phase:45,mode:'E'},bands:{t:1,alpha:.4,B:0,kpi:.35},manybody:{J:1,state:'singlet'},'time-reversal':{theta:65,phi:35,B:0,operation:'T'},'double-soc':{angle:360,coupling:.6}};
let latest=null;
export const getSymmetryMiniDemosResult=()=>latest;

function vertices(name){
 const ph=(1+Math.sqrt(5))/2;if(name==='tetra')return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];
 if(name==='cube')return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z])));
 if(name==='octa')return [0,1,2].flatMap(j=>[-1,1].map(s=>[0,1,2].map(k=>k===j?s:0)));
 const ico=[];for(const a of [-1,1])for(const b of [-1,1])ico.push([0,a,b*ph],[a,b*ph,0],[b*ph,0,a]);
 if(name==='icosa')return ico;
 const dual=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)for(let k=j+1;k<12;k++)if([[i,j],[i,k],[j,k]].every(([a,b])=>Math.abs(dot(ico[a].map((x,l)=>x-ico[b][l]),ico[a].map((x,l)=>x-ico[b][l]))-4)<1e-8)){const c=[0,1,2].map(l=>(ico[i][l]+ico[j][l]+ico[k][l])/3),sc=Math.sqrt(3)/norm(c);dual.push(c.map(x=>x*sc));}return dual;
}
function geometry(s){
 const ph=(1+Math.sqrt(5))/2,n=Number(s.order),axis=({2:[1,0,0],3:[1,1,1],4:[0,0,1],5:[0,1,ph]})[n],u=axis.map(x=>x/norm(axis)),angle=2*Math.PI*s.fraction/n,c=Math.cos(angle),si=Math.sin(angle),[x,y,z]=u,skew=[[0,-z,y],[z,0,-x],[-y,x,0]];
 const rotation=u.map((a,i)=>u.map((b,j)=>c*(i===j?1:0)+(1-c)*a*b+si*skew[i][j]));
 const vs=vertices(s.polyhedron),transformed=vs.map(v=>mv(rotation,v)),pairs=vs.flatMap((v,i)=>vs.slice(i+1).map((w,k)=>[i,i+k+1,norm(v.map((x,j)=>x-w[j]))])),min=Math.min(...pairs.map(p=>p[2])),edges=pairs.filter(p=>Math.abs(p[2]-min)<1e-8).map(p=>p.slice(0,2));
 const distances=transformed.map(v=>Math.min(...vs.map(w=>norm(v.map((x,j)=>x-w[j]))))),groups={tetra:['T','Td',12,24],cube:['O','Oh',24,48],octa:['O','Oh',24,48],dodeca:['I','Ih',60,120],icosa:['I','Ih',60,120]},g=groups[s.polyhedron];
 return {vertices:vs,transformed,edges,axis:u,rotation,maxMismatch:Math.max(...distances),coincident:distances.every(x=>x<1e-8),properGroup:g[0],fullGroup:g[1],properOrder:g[2],fullOrder:g[3],crystallographic:!['dodeca','icosa'].includes(s.polyhedron)};
}
export function miniDemoPreview(experiment,params={}){
 const s={...defaults[experiment],...params};
 if(experiment==='polyhedra')return geometry(s);
 if(experiment==='vibrations'){
  const a=[1,1,1].map(x=>x/Math.sqrt(3)),u=[2,-1,-1].map(x=>x/Math.sqrt(6)),v=[0,1,-1].map(x=>x/Math.sqrt(2)),angle=s.mix*Math.PI/180,modeVector=s.mode==='A1'?a:u.map((x,i)=>Math.cos(angle)*x+Math.sin(angle)*v[i]),stiffness=u.map((x,i)=>u.map((y,j)=>s.k0*(i===j?1:0)+s.k*(i===j?2:-1)+s.delta*x*y)),rayleigh=dot(modeVector,mv(stiffness,modeVector)),eigenResidual=norm(mv(stiffness,modeVector).map((x,i)=>x-rayleigh*modeVector[i])),eigenvalues=[s.k0,s.k0+3*s.k+s.delta,s.k0+3*s.k];
  return {stiffness,basis:{A1:a,u,v},modeVector,displacement:modeVector.map(x=>x*Math.sin(s.phase*Math.PI/180)),eigenvalues,frequencies:eigenvalues.map(x=>x>=0?Math.sqrt(x):null),eigenResidual,isEigenvector:eigenResidual<1e-9,degenerateE:Math.abs(s.delta)<1e-12,stable:Math.min(...eigenvalues)>0};
 }
 if(experiment==='bands'){
  const k=s.kpi*Math.PI,val=q=>{const e=-2*s.t*Math.cos(q),r=Math.hypot(2*s.alpha*Math.sin(q),s.B);return [e-r,e+r];};return {k,energies:val(k),curves:Array.from({length:129},(_,i)=>{const k=-Math.PI+2*Math.PI*i/128;return {k,energies:val(k)};}),trimGaps:{0:2*Math.abs(s.B),pi:2*Math.abs(s.B)},trResidual:2*Math.abs(s.B),sameKDegenerate:Math.abs(val(k)[1]-val(k)[0])<1e-9};
 }
 if(experiment==='manybody'){
  const states={singlet:[0,1/Math.sqrt(2),-1/Math.sqrt(2),0],triplet0:[0,1/Math.sqrt(2),1/Math.sqrt(2),0],'triplet+':[1,0,0,0],'triplet-':[0,0,0,1]},wavefunction=states[s.state],swapped=[wavefunction[0],wavefunction[2],wavefunction[1],wavefunction[3]],exchangeEigenvalue=dot(wavefunction,swapped);return {wavefunction,swapped,exchangeEigenvalue,energy:s.state==='singlet'?-.75*s.J:.25*s.J,levels:[{label:'S=0 singlet',energy:-.75*s.J,degeneracy:1},{label:'S=1 triplet',energy:.25*s.J,degeneracy:3}]};
 }
 if(experiment==='time-reversal'){
  const t=s.theta*Math.PI/180,p=s.phi*Math.PI/180,a=Math.cos(t/2),b=Math.sin(t/2),spinor=[[a,0],[Math.cos(p)*b,Math.sin(p)*b]],Tspinor=[[spinor[1][0],-spinor[1][1]],[-a,0]],T2spinor=spinor.map(z=>z.map(x=>-x)),Kspinor=spinor.map(z=>[z[0],-z[1]]),bloch=[Math.sin(t)*Math.cos(p),Math.sin(t)*Math.sin(p),Math.cos(t)];return {spinor,Tspinor,T2spinor,Kspinor,K2spinor:spinor,bloch,Tbloch:bloch.map(x=>-x),Kbloch:[bloch[0],-bloch[1],bloch[2]],fieldTrResidual:2*Math.abs(s.B)};
 }
 if(experiment==='double-soc'){const angle=s.angle*Math.PI/180,c=Math.cos(angle/2)/Math.sqrt(2),si=Math.sin(angle/2)/Math.sqrt(2);return {spinor:[[c,-si],[c,si]],bloch:[Math.cos(angle),Math.sin(angle),0],levels:[{j:.5,energy:-s.coupling,degeneracy:2},{j:1.5,energy:s.coupling/2,degeneracy:4}],weightedEnergySum:0};}
 throw new Error('未知微实验');
}

function controls(t,s){
 if(t==='polyhedra')return select('polyhedron','理想正多面体',s.polyhedron,[['tetra','正四面体 · T / T_d'],['cube','正六面体（立方体）· O / O_h'],['octa','正八面体 · O / O_h'],['dodeca','正十二面体 · I / I_h'],['icosa','正二十面体 · I / I_h']])+select('order','绕已声明的轴尝试旋转',s.order,[[2,'C₂ · x 轴'],[3,'C₃ · (1,1,1) 轴'],[4,'C₄ · z 轴'],[5,'C₅ · (0,1,φ) 轴']])+range('fraction','旋转完成比例',s.fraction,0,1,.01);
 if(t==='vibrations')return range('k0','共同回复刚度 k₀',s.k0,.2,3,.05)+range('k','环上等价耦合 k',s.k,0,1,.025)+range('delta','对称破缺 δ',s.delta,-1,1,.025)+select('mode','展示的模式空间',s.mode,[['A1','A₁ 同相坐标'],['E','E 空间内的组合']])+range('mix','E 搭档混合角（°）',s.mix,0,360,1)+range('phase','示意振动相位（°）',s.phase,0,360,1)+'<button type="button" data-action="animate">播放 / 暂停模式</button>';
 if(t==='bands')return range('t','跃迁 t',s.t,0,2,.05)+range('alpha','Rashba 耦合 α',s.alpha,0,1,.025)+range('B','Zeeman 参数 B',s.B,-1,1,.025)+range('kpi','当前波矢 k / π',s.kpi,-1,1,.01);
 if(t==='manybody')return range('J','交换参数 J',s.J,-2,2,.05)+select('state','两自旋态',s.state,[['singlet','单态 (↑↓−↓↑)/√2'],['triplet0','三重态 m=0'],['triplet+','三重态 ↑↑'],['triplet-','三重态 ↓↓']]);
 if(t==='time-reversal')return range('theta','Bloch 极角 θ（°）',s.theta,0,180,1)+range('phi','相对相位 φ（°）',s.phi,0,360,1)+select('operation','比较作用',s.operation,[['T','T = iσᵧK'],['T2','T²'],['K','K（复共轭）'],['K2','K²']])+range('B','外磁场参数 B',s.B,-1,1,.05);
 return range('angle','绕 z 的自旋旋转（°）',s.angle,0,720,2)+range('coupling','SOC 常数 λ',s.coupling,-1,1,.025);
}
function project3(v,scale=82){const yaw=.61,tilt=.42;return [320+scale*(v[0]*Math.cos(yaw)-v[1]*Math.sin(yaw)),172-scale*(v[2]*Math.cos(tilt)+(v[0]*Math.sin(yaw)+v[1]*Math.cos(yaw))*Math.sin(tilt))];}
const complex=z=>`${fmt(z[0])}${z[1]>=0?'+':''}${fmt(z[1])}i`;

function scene(t,s){
 const r=miniDemoPreview(t,s);
 if(t==='polyhedra'){
  const scale=105/Math.max(...r.vertices.map(norm)),original=r.vertices.map(v=>project3(v,scale)),changed=r.transformed.map(v=>project3(v,scale));let body='';
  for(const [i,j] of r.edges)body+=line(...original[i],...original[j],'#b6c5d0',2)+line(...changed[i],...changed[j],r.coincident?'#267e77':'#b66a36',2.5);
  changed.forEach((p,i)=>{body+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${r.coincident?'#267e77':'#b66a36'}"/>`;if(r.vertices.length<10)body+=text(p[0]+12,p[1]-7,String(i+1),undefined,14);});
  body+=text(320,32,r.coincident?'顶点集合重合':'顶点集合不重合')+text(320,318,'灰：原始形状　绿 / 橙：当前旋转后的形状',undefined,15);
  return {plot:svg('正多面体顶点集合的旋转重合检查',body),html:`<h3>纯旋转群 ${groupMath(r.properGroup)}（${r.properOrder} 阶）；完整点群 ${groupMath(r.fullGroup)}（${r.fullOrder} 阶）</h3><p>${r.vertices.length} 个顶点、${r.edges.length} 条边。当前顶点集合最大失配为 ${fmt(r.maxMismatch)}；旋转轴为 (${r.axis.map(fmt).join(', ')})。</p><p>${r.crystallographic?'当前多面体的点群属于普通晶体学点群类型。':`${groupMath('I')} / ${groupMath('Ih')} 含五重轴，可描述正多面体或相应分子；不能作为三维周期晶格的普通晶体学点群。`}</p><p>把完成比例调到 1 才是在检查所选 Cₙ 操作。正十二面体与正二十面体互为对偶，拥有相同旋转群；完整点群还包含反演或镜面等不正操作。</p>`,exercise:exercise('同一条五重轴是否也让立方体顶点重合？怎样区分“形状很对称”和“晶体学允许”？',['先在正二十面体上选择 C₅，并将旋转比例设为1，核对12个顶点集合。','切换到立方体，同一操作不再使顶点集合重合；立方体具有 C₄ 和 C₃ 轴。','三维周期晶格的旋转阶数限制为1、2、3、4、6；正多面体或非周期分子的点群不受同一目录限制。']),data:r};
 }
 if(t==='vibrations'){
  const base=[[160,230],[320,90],[480,230]];let body=line(...base[0],...base[1])+line(...base[1],...base[2])+line(...base[2],...base[0]);
  base.forEach(([x,y],i)=>{body+=`<circle cx="${x}" cy="${y}" r="18" fill="#e5eef4" stroke="#557488"/>`+line(x,y,x,y-70*r.displacement[i],'#247da0',5)+text(x,y+46,`q${i+1}: ${fmt(r.displacement[i])}`,undefined,15);});
  const f=r.frequencies.map(x=>x===null?'虚频（不稳定）':fmt(x));body+=text(320,30,r.degenerateE?'E 双简并：混合角不改变本征频率':'δ 选定方向并劈裂 E 搭档');
  return {plot:svg('三个等价标量振子的对称适应模式',body),html:`<h3>用同一个 E 子空间区分换基与真实破缺</h3><p>${math(String.raw`K=k_0I+kL_{K_3}+\delta uu^T`)}，单位质量下 ${math(String.raw`\omega_{A_1}^2=k_0`)}，${math(String.raw`\omega_u^2=k_0+3k+\delta`)}，${math(String.raw`\omega_v^2=k_0+3k`)}。</p>${table(['模式','A₁','u ∈ E','v ∈ E'],[['频率',...f]])}<p>当前组合的本征方程残差为 ${fmt(r.eigenResidual)}：${r.isEigenvector?'它是一个单频正常坐标。':'δ≠0 时该任意混合不是单一正常模，应分解为不同频率的两个搭档。'}</p><p>图中振幅条表示标量坐标，不指定真实分子的位移方向。该三节点弹簧模型用于讲解简并，不是任意分子的光谱求解器。</p>`,exercise:exercise('δ=0 时改变混合角，为何不能称为简并被解除？',['u 与 v 都有相同的本征值 k₀+3k，其任意正交混合仍是该本征值的本征向量。','令 δ≠0 后，u 与 v 的平方频率分别改变为 k₀+3k+δ 与 k₀+3k；这才是模型中的真实劈裂。','若某个平方频率降到负值，谐性参考结构失稳；不能把负数直接开方当成稳定振动频率。']),data:r};
 }
 if(t==='bands'){
  const es=r.curves.flatMap(x=>x.energies),lo=Math.min(...es)-.2,hi=Math.max(...es)+.2,X=k=>70+(k+Math.PI)/(2*Math.PI)*500,Y=e=>285-(e-lo)/(hi-lo)*230;let body=line(70,285,590,285)+line(70,285,70,45);
  for(let band=0;band<2;band++)body+=`<path d="${r.curves.map((q,i)=>`${i?'L':'M'}${X(q.k)},${Y(q.energies[band])}`).join(' ')}" fill="none" stroke="${band?'#b96639':'#287b9d'}" stroke-width="3"/>`;
  body+=line(X(r.k),45,X(r.k),285,'#b7bfc5',1);r.energies.forEach((e,i)=>body+=`<circle cx="${X(r.k)}" cy="${Y(e)}" r="6" fill="${i?'#b96639':'#287b9d'}"/>`);body+=text(70,315,'−π')+text(320,315,'0')+text(570,315,'π')+text(320,28,'Rashba 两条分支：同一 k 的简并须单独判断');
  return {plot:svg('一维Rashba模型能带和TRIM简并',body),html:`<h3>${Math.abs(s.B)<1e-12?'B=0：时间反演保持':'B≠0：外场破坏时间反演'}</h3><p>${math(String.raw`H(k)=-2t\cos k\,I+2\alpha\sin k\,\sigma_y+B\sigma_z`)}，${math(String.raw`E_\pm=-2t\cos k\pm\sqrt{(2\alpha\sin k)^2+B^2}`)}。</p><p>k=0 和 π 的分支间隙均为 2|B|=${fmt(2*Math.abs(s.B))}。当前 k/π=${fmt(s.kpi)}，能量为 (${r.energies.map(fmt).join(', ')})；${r.sameKDegenerate?'当前同一 k 处简并。':'当前同一 k 处已自旋劈裂。'}</p><p>零场时 Kramers 伙伴位于 k 与 −k；只有在两者模倒易格矢等价的 TRIM 才强制同 k 简并。本模型即使 B≠0 也可有 E(k)=E(−k)，所以仅看能量曲线的偶对称不足以证明时间反演。</p>`,exercise:exercise('B=0 且 α≠0 时，为什么 k=π/2 可以劈裂而 k=0 不可以？',['自旋项为2α sin(k)σᵧ；k=π/2 时它非零，同一 k 的两条能量可不同。','k=0、π 满足 −k 与 k 模倒易格矢等价；零场下半整数自旋的 T²=−1 强制 Kramers 简并。','Bσz 在时间反演下变号；B≠0 时 TRIM 的间隙为2|B|。此演示不据此自动判定拓扑非平凡。']),data:r};
 }
 if(t==='manybody'){
  let body=text(180,34,'原态系数')+text(470,34,'P₁₂ 交换之后');const labels=['↑↑','↑↓','↓↑','↓↓'];labels.forEach((l,i)=>{const y=85+i*63;body+=text(66,y,l)+text(180,y,fmt(r.wavefunction[i]))+line(270,y-5,365,y-5,'#95a8b5',1)+text(470,y,fmt(r.swapped[i]));});
  return {plot:svg('两自旋态在交换算符下的系数比较',body),html:`<h3>交换本征值 ${fmt(r.exchangeEigenvalue)}；当前能量 ${fmt(r.energy)}</h3><p>${math(String.raw`H=J\,\mathbf S_1\cdot\mathbf S_2`)}，${math(String.raw`P_{12}=2\mathbf S_1\cdot\mathbf S_2+\tfrac12I`)}，取 ${math(String.raw`\hbar=1`)}。</p>${table(['总自旋','能量','简并度','自旋交换'],[['单态 S=0',fmt(-.75*s.J),1,'−1'],['三重态 S=1',fmt(.25*s.J),3,'+1']])}<p>J&gt;0 时单态较低；J&lt;0 时三重态较低。电子的总波函数还需结合空间部分满足反对称性，不能由自旋交换的正号断言三重态不允许。此处只求解两个自旋的有限模型。</p>`,exercise:exercise('把 J 从正变负，交换对称性会不会改变？',['交换本征值来自态的对称或反对称组合，单态为−1，三重态为+1。','改变 J 只改变 H 的能量排序：−3J/4 与 J/4 会交换高低。','保持态定义不变时，其交换对称性不随能量排序改变。']),data:r};
 }
 if(t==='time-reversal'){
  const transformed=({T:r.Tbloch,T2:r.bloch,K:r.Kbloch,K2:r.bloch})[s.operation],spinor=({T:r.Tspinor,T2:r.T2spinor,K:r.Kspinor,K2:r.K2spinor})[s.operation];let body=`<circle cx="320" cy="170" r="112" fill="#f4f8fa" stroke="#aebec9"/>`+line(190,170,450,170,'#b5c2cc',1)+line(320,40,320,300,'#b5c2cc',1);
  for(const [v,col] of [[r.bloch,'#267a9e'],[transformed,'#b7673d']]){const p=project3(v,105);body+=line(320,172,...p,col,4)+`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${col}"/>`;}body+=text(320,30,'蓝：初态 Bloch 向量　橙：所选作用之后',undefined,15)+text(320,320,'Bloch 向量无法单独区分整体正负号',undefined,15);
  return {plot:svg('反幺正时间反演与复共轭的比较',body),html:`<h3>${esc(s.operation)}：先复共轭，再按定义作用</h3><p>${math(String.raw`T=i\sigma_yK`)}，${math(String.raw`T(a,b)^T=(b^*,-a^*)^T`)}；${math(String.raw`T^2=-I`)}，而 ${math(String.raw`K^2=+I`)}。</p>${table(['系数','初态','作用后'],[['a',complex(r.spinor[0]),complex(spinor[0])],['b',complex(r.spinor[1]),complex(spinor[1])]])}<p>T 将 Bloch 向量反向；T² 恢复 Bloch 向量却使旋量整体变号。K 是当前实基底中的无自旋比较。场项 Bσz 的时间反演差为 2|B|=${fmt(r.fieldTrResidual)}，${Math.abs(s.B)<1e-12?'零场下该项不破坏时间反演。':'非零外场破坏当前时间反演对称。'}</p>`,exercise:exercise('T² 作用后的 Bloch 向量已恢复，为何旋量仍可不同？',['Bloch 向量由 ψ 的双线性组合构成，ψ 与−ψ 给出相同向量。','T 反幺正，第二次作用还会复共轭，直接计算得到 T²ψ=−ψ；K²ψ=ψ。','孤立态的整体相位不可直接观测；要讨论旋转相位需指定与参考态的相干比较，不能从箭头复原推出旋量已完全相同。']),data:r};
 }
 let body=`<circle cx="170" cy="165" r="88" fill="#f4f8fa" stroke="#aebec9"/>`+line(170,165,170+88*r.bloch[0],165-88*r.bloch[1],'#267a9e',4)+text(170,286,`${fmt(s.angle)}° 自旋旋转`);const energies=r.levels.map(x=>x.energy),span=Math.max(.5,...energies.map(Math.abs)),Y=e=>170-e/span*95;body+=line(365,Y(energies[0]),570,Y(energies[0]),'#287b9d',4)+line(365,Y(energies[1]),570,Y(energies[1]),'#b96639',4)+text(470,Y(energies[0])-12,'j=1/2 · 二重',undefined,15)+text(470,Y(energies[1])+28,'j=3/2 · 四重',undefined,15)+text(470,35,'l=1 与 s=1/2 的 SOC');
 return {plot:svg('自旋双覆盖与原子自旋轨道耦合能级',body),html:`<h3>2π 旋量变号；4π 返回原旋量</h3><p>${math(String.raw`U_z(\theta)=\exp(-i\theta\sigma_z/2)`)}，${math(String.raw`U_z(2\pi)=-I`)}，${math(String.raw`U_z(4\pi)=I`)}。当前旋量为 (${r.spinor.map(complex).join(', ')})。</p><p>另取 ${math(String.raw`H_{\rm SOC}=\lambda\mathbf L\cdot\mathbf S`)}，l=1、s=1/2，${math(String.raw`E_j=\tfrac\lambda2[j(j+1)-l(l+1)-s(s+1)]`)}。因此 j=1/2 的能量为−λ，二重；j=3/2 的能量为λ/2，四重。</p><p>该零场原子模型保持时间反演，每个半整数 j 至少成 Kramers 对；j=3/2 的四重还依赖完整旋转对称。加入晶场可分成两对，但保持时间反演时不能拆开单个 Kramers 对。</p>`,exercise:exercise('λ 改变符号会影响简并度吗？2π 回来的箭头能否代表旋量也已回来？',['SOC 能量由−λ与λ/2给出；λ变号只交换这两组能级的排序，维数仍为2与4。','Bloch 向量是旋量的双线性量，2π转动后恢复，但旋量多一个整体负号。','4π后旋量也恢复；整体相位的物理比较必须指定相干参考。']),data:r};
}

export function miniDemoScene(experiment,params={}){return scene(experiment,{...defaults[experiment],...params});}

export async function renderSymmetryMiniDemosView({container,selection={},run,onNavigate=()=>{}}){
 let theme=miniDemoThemes.some(x=>x.id===selection.experiment)?selection.experiment:'polyhedra',state={...defaults[theme]},pythonResult=null,status='',busy=false,timer=null,revision=0;
 container.innerHTML='<article class="smd-course"></article>';const root=container.firstElementChild,current=()=>container.isConnected!==false&&container.firstElementChild===root,payload=()=>({experiment:theme,...state});
 function update(){const out=scene(theme,state);root.querySelector('.smd-preview').innerHTML=out.plot+out.html;root.querySelector('.smd-questions').innerHTML=out.exercise;root.querySelectorAll('[data-output]').forEach(el=>el.textContent=state[el.dataset.output]);latest={tool:'symmetry_mini_demos_preview',input:payload(),result:{...out.data,computation:'deterministic JavaScript teaching preview'}};}
 function draw(){root.innerHTML=`<header class="smd-hero"><span>进阶概念微实验</span><h2>从正多面体到自旋与能带</h2><p>改变参数、核对对称操作，再用一个反例检查结论的条件。</p></header><nav class="smd-tabs" aria-label="进阶概念主题">${miniDemoThemes.map(x=>`<button type="button" data-theme="${x.id}" aria-pressed="${theme===x.id}">${x.title}</button>`).join('')}</nav><div class="smd-workspace"><aside class="smd-controls"><h3>参数与判断</h3>${controls(theme,state)}<button type="button" class="primary" data-action="python" ${busy||!run?'disabled':''}>${busy?'正在用 Python 核对…':'用浏览器内 Python 核对'}</button><p class="smd-status" role="status">${esc(status||'SVG 图和数值随参数即时更新。')}</p></aside><section class="smd-preview" aria-live="polite"></section></div><div class="smd-questions"></div><details class="smd-python"><summary>Python 核对数据</summary><pre>${pythonResult?esc(JSON.stringify(pythonResult,null,2)):'点击核对按钮后显示结果。'}</pre></details><footer><a href="#classroom/foundations?module=demos">水分子、特征标与投影演示</a> · <a href="#classroom/spin?module=orbitals">晶场与轨道专题</a> · <a href="docs/foundations-demos.md">教学约定与来源</a></footer>`;update();}
 function changed(e){const id=e.target.dataset.param;if(!id)return;revision++;state[id]=Number.isFinite(Number(e.target.value))?Number(e.target.value):e.target.value;pythonResult=null;status='参数已改变，可用当前输入重新核对。';update();root.querySelector('.smd-status').textContent=status;}
 root.addEventListener('input',e=>{if(e.target.tagName!=='SELECT')changed(e);});root.addEventListener('change',changed);
 root.addEventListener('click',async e=>{const tab=e.target.closest('[data-theme]');if(tab){if(timer){clearInterval(timer);timer=null;}revision++;theme=tab.dataset.theme;state={...defaults[theme]};status='';pythonResult=null;onNavigate({experiment:theme});draw();return;}const action=e.target.closest('[data-action]')?.dataset.action;if(action==='animate'){if(timer){clearInterval(timer);timer=null;}else timer=setInterval(()=>{if(!current()){clearInterval(timer);return;}revision++;state.phase=(state.phase+6)%360;const el=root.querySelector('[data-param="phase"]');if(el)el.value=state.phase;update();},70);}if(action==='python'&&run&&!busy){if(timer){clearInterval(timer);timer=null;}const requestedRevision=revision;busy=true;status='正在核对当前有限模型…';draw();try{const input=payload(),result=await run('symmetry_mini_demos',input);if(!current()||requestedRevision!==revision)return;pythonResult=result;status=result?.checks?.passed===false?'模型检查未通过，请检查输入和返回数据。':'Python 核对完成。';draw();latest={tool:'symmetry_mini_demos',input,result};}catch(error){if(current()&&requestedRevision===revision){status='Python 核对未完成：'+error.message;draw();}}finally{busy=false;if(current()){const b=root.querySelector('[data-action="python"]');b.disabled=false;b.textContent='用浏览器内 Python 核对';}}}});
 draw();
}
