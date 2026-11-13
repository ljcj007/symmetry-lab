import {mathHTML} from './math-display.js?v=20261113-prose2';

// Optional, bounded two-spin references. No worker, network, storage or mastery writes.
export const QUANTUM_STATE_BRIDGE_HOOKS=Object.freeze({
 'density-pure-mixed':Object.freeze(['partial-trace','schmidt-pure']),
 'density-exchange':Object.freeze(['schmidt-pure']),
 'spt-schmidt':Object.freeze(['partial-trace','schmidt-pure','triplet-virtual']),
 'spt-aklt-parent':Object.freeze(['triplet-virtual']),
 'su2-coupling-representations':Object.freeze(['triplet-virtual'])
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const z=(re=0,im=0)=>[re,im];
const add=(a,b)=>z(a[0]+b[0],a[1]+b[1]);
const mul=(a,b)=>z(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]);
const conj=a=>z(a[0],-a[1]);
const abs2=a=>a[0]*a[0]+a[1]*a[1];
const scale=(a,t)=>a.map(row=>row.map(x=>mul(x,z(t))));
const adjoint=a=>a[0].map((_,j)=>a.map(row=>conj(row[j])));
const transpose=a=>a[0].map((_,j)=>a.map(row=>[...row[j]]));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>add(s,mul(x,b[k][j])),z())));
const kron=(a,b)=>a.flatMap(row=>b.map(br=>row.flatMap(x=>br.map(y=>mul(x,y)))));
const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>z(Number(i===j))));
const residual=(a,b)=>Math.max(...a.flatMap((row,i)=>row.map((x,j)=>Math.hypot(x[0]-b[i][j][0],x[1]-b[i][j][1]))));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function matrixCopy(value,n,m=n){
 if(!Array.isArray(value)||value.length!==n||value.some(row=>!Array.isArray(row)||row.length!==m||row.some(x=>!Array.isArray(x)||x.length!==2||!x.every(finite))))throw Error('A finite complex matrix with the stated shape is required.');
 return value.map(row=>row.map(x=>[...x]));
}
const entropy=(probabilities,base)=>-probabilities.reduce((s,p)=>s+(p>0?p*Math.log(p)/Math.log(base):0),0);

export function partialTraceReference(rho,subsystem='A',row=0,column=0){
 const a=matrixCopy(rho,4);
 if(!['A','B'].includes(subsystem)||![row,column].every(x=>Number.isInteger(x)&&x>=0&&x<2))throw Error('Choose subsystem A or B and a 2 by 2 matrix cell.');
 const indices=(i,j,b)=>subsystem==='A'?[2*i+b,2*j+b]:[2*b+i,2*b+j];
 const reduced=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>[0,1].reduce((s,b)=>{const [r,c]=indices(i,j,b);return add(s,a[r][c]);},z())));
 const terms=[0,1].map(b=>{const [r,c]=indices(row,column,b);return {row:r,column:c,ignoredIndex:b,value:[...a[r][c]]};});
 return {subsystem,row,column,matrix:reduced,terms,sum:[...reduced[row][column]]};
}

export function coefficientStateReference(value){
 const C=matrixCopy(value,2),ket=C.flat(),norm=ket.reduce((s,x)=>s+abs2(x),0);
 if(Math.abs(norm-1)>1e-10)throw Error('The coefficient matrix must describe a normalized pure state.');
 const rho=ket.map(x=>ket.map(y=>mul(x,conj(y))));
 const rhoA=mm(C,adjoint(C));
 // With C[i,j] multiplying |i>_A |j>_B, rho_B = C^T C*, not C^dagger C.
 const rhoB=mm(transpose(C),C.map(row=>row.map(conj)));
 const gap=Math.hypot(rhoA[0][0][0]-rhoA[1][1][0],2*Math.sqrt(abs2(rhoA[0][1])));
 const p=Math.max(0,Math.min(1,(1+gap)/2)),probabilities=[p,Math.max(0,1-p)];
 const determinant=rhoA[0][0][0]*rhoA[1][1][0]-abs2(rhoA[0][1]);
 const xx=2*add(mul(conj(ket[0]),ket[3]),mul(conj(ket[1]),ket[2]))[0];
 return {C,ket,rho,rhoA,rhoB,schmidtProbabilities:probabilities,singularValues:probabilities.map(Math.sqrt),
  entropyBits:entropy(probabilities,2),entropyNats:entropy(probabilities,Math.E),globalEntropyBits:0,
  globalPurity:1,negativity:Math.sqrt(Math.max(0,determinant)),correlationXX:xx,pure:true};
}

export function pureTwoSpinReference({theta=Math.PI/4,phi=Math.PI}={}){
 if(!finite(theta)||theta<0||theta>Math.PI/2||!finite(phi)||Math.abs(phi)>2*Math.PI)throw Error('Choose finite two-spin angles within the teaching range.');
 const c=theta===Math.PI/2?0:Math.cos(theta),s=theta===0?0:Math.sin(theta);
 const co=Math.abs(Math.cos(phi))<1e-15?0:Math.cos(phi),si=Math.abs(Math.sin(phi))<1e-15?0:Math.sin(phi);
 return coefficientStateReference([[z(),z(c)],[z(s*co,s*si),z()]]);
}

export function twoSpinStateReference(kind='singlet'){
 if(kind==='singlet')return pureTwoSpinReference();
 if(!['classical','mixed'].includes(kind))throw Error('Unknown two-spin teaching state.');
 const probabilities=kind==='classical'?[0,.5,.5,0]:[.25,.25,.25,.25];
 const rho=probabilities.map((p,i)=>probabilities.map((_,j)=>z(i===j?p:0)));
 return {rho,rhoA:partialTraceReference(rho,'A').matrix,rhoB:partialTraceReference(rho,'B').matrix,
  globalPurity:probabilities.reduce((s,p)=>s+p*p,0),globalEntropyBits:entropy(probabilities,2),
  entropyBits:1,entropyNats:Math.LN2,negativity:0,correlationXX:0,pure:false,
  C:null,schmidtProbabilities:null,singularValues:null};
}

export function tripletProjectionReference(){
 const a=1/Math.sqrt(2),W=[[z(1),z(),z(),z()],[z(),z(a),z(a),z()],[z(),z(),z(),z(1)]];
 const ux=[[z(),z(0,-1)],[z(0,-1),z()]],uz=[[z(0,-1),z()],[z(),z(0,1)]];
 const rx=mm(mm(W,kron(ux,ux)),adjoint(W)),rz=mm(mm(W,kron(uz,uz)),adjoint(W));
 const virtualXZ=mm(ux,uz),virtualZX=mm(uz,ux),physicalXZ=mm(rx,rz),physicalZX=mm(rz,rx);
 const singlet=[[z()],[z(a)],[z(-a)],[z()]],swap=[[z(1),z(),z(),z()],[z(),z(),z(1),z()],[z(),z(1),z(),z()],[z(),z(),z(),z(1)]];
 const projector=mm(adjoint(W),W),symmetric=identity(4).map((row,i)=>row.map((v,j)=>z((v[0]+swap[i][j][0])/2)));
 return {W,projector,ux,uz,rx,rz,virtualXZ,virtualZX,physicalXZ,physicalZX,
  virtualCommutator:mm(mm(mm(ux,uz),adjoint(ux)),adjoint(uz)),
  physicalCommutator:mm(mm(mm(rx,rz),adjoint(rx)),adjoint(rz)),
  checks:{physicalIdentity:residual(mm(W,adjoint(W)),identity(3)),symmetricProjector:residual(projector,symmetric),
   singletRejected:residual(mm(W,singlet),[[z()],[z()],[z()]]),virtualAnticommutation:residual(virtualXZ,scale(virtualZX,-1)),
   physicalCommutation:residual(physicalXZ,physicalZX),spinorSquare:residual(mm(ux,ux),scale(identity(2),-1)),
   integerSquare:residual(mm(rx,rx),identity(3))},
  periodicReferences:[{sites:3,cut:[1,2],probabilities:[1/3,1/3,1/3],rank:3,bondVirtualDimension:2},
   {sites:4,cut:[2,2],probabilities:[3/7,4/21,4/21,4/21],rank:4,bondVirtualDimension:2}]};
}

const fmt=x=>x===0?'0':Math.abs(x)<1e-6?x.toExponential(3):Number(x.toFixed(6)).toString();
const texNumber=x=>fmt(x).replace(/e([+-]?\d+)$/,(_m,p)=>'\\times10^{'+Number(p)+'}');
const complexTex=x=>x[1]===0?texNumber(x[0]):x[0]===0?texNumber(x[1])+'i':texNumber(x[0])+(x[1]<0?'-':'+')+texNumber(Math.abs(x[1]))+'i';
const formula=tex=>`<div class="qsb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>mathHTML(tex);
const matrixTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(complexTex).join('&')).join('\\\\')+'\\end{pmatrix}';
const table=(caption,headers,rows)=>`<div class="qsb-scroll" tabindex="0"><table><caption>${caption}</caption><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const names={'partial-trace':'亲手忽略一个自旋：局部相同，整体相同吗？','schmidt-pure':'从四个振幅到 Schmidt 概率','triplet-virtual':'从三重态投影到 AKLT 虚拟自旋'};
const stateNames={singlet:'单重 Bell 纯态',classical:'反平行经典等权混合',mixed:'完全混合态 I₄/4'};
const choices={
 'partial-trace':[['zero','0'],['half','1/2'],['one','1']],
 'partial-meaning':[['insufficient','局部信息不足，还要看整体态'],['always','局部熵为 1 bit 就必定纠缠'],['never','局部态为 I/2 就一定没有纠缠']],
 'schmidt-pure':[['squared','系数矩阵奇异值的平方'],['unsquared','奇异值本身'],['energy','Hamiltonian 的能量本征值']],
 'schmidt-unit':[['convert','除以 ln(2) 得到 bit，量子态不变'],['equal','nat 和 bit 的数值总相同'],['state','换对数底会改变量子态']],
 'triplet-virtual':[['phase','两种次序的矩阵相差整体负号'],['same','两种次序的矩阵相同'],['probability','整体负号必使单次测量概率不同']],
 'triplet-finite':[['cut','不能，还要说明切口、边界和所选纯态'],['two','必定只有两个概率'],['class','任何小链谱都直接确定一般 SPT 类']]
};
const defaults=id=>id==='partial-trace'?{open:false,notesOpen:false,kind:'singlet',subsystem:'A',cell:'00',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false}:id==='schmidt-pure'?{open:false,notesOpen:false,theta:'45',phi:'180',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false}:{open:false,notesOpen:false,representation:'virtual',order:'xz',finite:'three',choice:'',secondChoice:'',observed:false,checked:false,secondChecked:false};
const enumValues={kind:['singlet','classical','mixed'],subsystem:['A','B'],cell:['00','01','10','11'],representation:['virtual','physical'],order:['xz','zx'],finite:['three','four']};
const secondKey=id=>id==='partial-trace'?'partial-meaning':id==='schmidt-pure'?'schmidt-unit':'triplet-finite';
function restored(id,saved){
 const s=defaults(id);if(!saved||typeof saved!=='object')return s;
 for(const key of Object.keys(s)){
  if(typeof s[key]==='boolean'&&typeof saved[key]==='boolean')s[key]=saved[key];
  else if(enumValues[key]?.includes(saved[key]))s[key]=saved[key];
 }
 for(const [key,list]of [['choice',choices[id]],['secondChoice',choices[secondKey(id)]]])if(list.some(([v])=>v===saved[key]))s[key]=saved[key];
 for(const [key,lo,hi]of [['theta',0,90],['phi',-180,180]])if(Object.hasOwn(s,key)&&typeof saved[key]==='string'&&saved[key].trim()!==''&&finite(Number(saved[key]))&&Number(saved[key])>=lo&&Number(saved[key])<=hi)s[key]=saved[key];
 if(!s.choice)s.observed=false;if(!s.observed){s.checked=false;s.secondChecked=false;}if(!s.secondChoice)s.secondChecked=false;
 return s;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
const answerSelect=(prefix,key,label,value)=>select(prefix+'-'+key,label,[['','先选择预测'],...choices[key==='choice'?prefix.includes('partial-trace')?'partial-trace':prefix.includes('schmidt-pure')?'schmidt-pure':'triplet-virtual':prefix.includes('partial-trace')?'partial-meaning':prefix.includes('schmidt-pure')?'schmidt-unit':'triplet-finite']],value).replace('</label>',`<span class="qsb-choice-reading" id="${prefix}-${key}-reading" aria-hidden="true"></span></label>`);
const range=(id,label,value,min,max,step)=>`<label for="${id}">${label}<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"><output id="${id}-value"></output></label>`;
const button=(id,text)=>`<button type="button" id="${id}">${text}</button>`;
function panelHTML(id,s){
 const p='qsb-'+id;
 const common=`<div class="qsb-actions">${button(p+'-observe','展示计算步骤')}${button(p+'-check','检查第一步')}${button(p+'-check-second','检查第二步')}${button(p+'-reset','重置此小实验')}</div><p class="qsb-feedback" id="${p}-feedback" role="status" tabindex="-1"></p><p class="qsb-feedback" id="${p}-second-feedback" role="status" tabindex="-1"></p>`;
 if(id==='partial-trace')return `<p>乘积基顺序固定为 ↑↑、↑↓、↓↑、↓↓，第一个指标是 A。选择约化矩阵的一个格子，追踪整体矩阵中需要相加的两项。</p><div class="qsb-controls">${select(p+'-kind','选择整体态',Object.entries(stateNames),s.kind)}${select(p+'-subsystem','保留哪个自旋？',[['A','保留 A，忽略 B'],['B','保留 B，忽略 A']],s.subsystem)}</div><fieldset class="qsb-cell-picker"><legend>手选约化矩阵单元（行、列从 0 开始）</legend>${['00','01','10','11'].map(cell=>`<button type="button" id="${p}-cell-${cell}" data-qsb-cell="${cell}" aria-pressed="false">${cell[0]}, ${cell[1]}</button>`).join('')}</fieldset><div id="${p}-source"></div><div class="qsb-controls">${answerSelect(p,'choice','第一步：选中格子的数值是多少？',s.choice)}${answerSelect(p,'secondChoice','第二步：只知道局部态为 I/2，能否判断整体纠缠？',s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>部分迹不是挑选测量结果</summary><p>部分迹把被忽略一方的行、列指标设为相同，再对该指标的所有取值求和；它不等于挑选某个 B 测量结果。单重态中若已知 B 测得 ↑，A 的条件态是 ↓；未选择结果的约化态仍是 I/2。</p></details>`;
 if(id==='schmidt-pure')return `<p>只对一个归一化整体纯态，把振幅按 A 行、B 列排成系数矩阵 C。先辨认概率来自哪里，再查看矩阵和熵。</p>${formula(String.raw`|\psi\rangle=\cos\theta|\uparrow\downarrow\rangle+e^{i\phi}\sin\theta|\downarrow\uparrow\rangle`)}<div class="qsb-controls">${range(p+'-theta','角度 θ / °',s.theta,0,90,5)}${range(p+'-phi','相对相位 φ / °',s.phi,-180,180,15)}</div><div class="qsb-actions">${button(p+'-singlet','单重态')}${button(p+'-triplet','三重态 T₀')}${button(p+'-product','直积态')}</div><div class="qsb-controls">${answerSelect(p,'choice','第一步：Schmidt 概率来自哪里？',s.choice)}${answerSelect(p,'secondChoice','第二步：把 nat 换成 bit，会发生什么？',s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>混合态为什么不能直接沿用这个 C？</summary><p>C 是一个纯态 ket 的振幅表。经典混合与 I₄/4 需要整体密度矩阵 ρ；不能把 ρ 的奇异值当成一个纯态的 Schmidt 系数。两个 Schmidt 概率相同时，伙伴基不唯一，应比较概率、密度矩阵或子空间。</p></details>`;
 return `<p>两个虚拟自旋 1/2 的对称三重子空间可表示一个物理自旋 1。这里把 CG 投影、π 旋转次序与有限链切口分开核对。</p><div class="qsb-controls">${select(p+'-representation','比较哪个空间？',[['virtual','单个虚拟自旋 1/2'],['physical','投影后的物理自旋 1']],s.representation)}${select(p+'-order','显示的乘法次序（右边先作用）',[['xz','uₓu_z / RₓR_z'],['zx','u_zuₓ / R_zRₓ']],s.order)}${select(p+'-finite','周期 AKLT 参考切口',[['three','N=3，切口 1|2'],['four','N=4，切口 2|2']],s.finite)}</div><div class="qsb-controls">${answerSelect(p,'choice','第一步：交换两次 π 旋转的乘法次序，矩阵怎样变化？',s.choice)}${answerSelect(p,'secondChoice','第二步：单键虚拟维数为 2，Schmidt 秩就必定为 2 吗？',s.secondChoice)}</div>${common}<div id="${p}-output" class="qsb-output"></div><details class="qsb-notes" data-qsb-notes="${id}" ${s.notesOpen?'open':''}><summary>查看三重投影及相位约定</summary>${formula(String.raw`W=\begin{pmatrix}1&0&0&0\\0&1/\sqrt2&1/\sqrt2&0\\0&0&0&1\end{pmatrix}`)}${formula(String.raw`WW^\dagger=I_3,\quad W^\dagger W=P_{\rm sym},\quad W|S\rangle=0`)}<p>W 是 3×4 的子空间映射，不是 4 维到 3 维的幺正换基。这里 uₓ=−iσₓ、u_z=−iσ_z；主 SPT 实验的 Uₓ=σₓ、U_z=σ_z 与它们相差各自的标量相位，射影交换子保持 −I。</p><p>整体负号本身不改变单态测量概率；这里比较表示矩阵的相位关系，不把它画成两个不同的 Bloch 方向。</p></details>`;
}

function sourceMatrixHTML(r,trace){
 const highlighted=new Set(trace.terms.map(t=>t.row+'-'+t.column)),basis=['↑↑','↑↓','↓↑','↓↓'];
 return `<div class="qsb-scroll" tabindex="0"><table><caption>整体密度矩阵 ρ：每项中被忽略的行、列指标相同</caption><thead><tr><th scope="col">行 / 列</th>${basis.map(b=>`<th scope="col">${b}</th>`).join('')}</tr></thead><tbody>${r.rho.map((row,i)=>`<tr><th scope="row">${basis[i]}</th>${row.map((x,j)=>`<td class="${highlighted.has(i+'-'+j)?'qsb-term':''}" data-qsb-source="${i}-${j}">${inline(complexTex(x))}${highlighted.has(i+'-'+j)?'<span class="qsb-mark">相加项</span>':''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function partialOutput(s){
 const r=twoSpinStateReference(s.kind),t=partialTraceReference(r.rho,s.subsystem,Number(s.cell[0]),Number(s.cell[1]));
 const sum=t.terms.map(x=>complexTex(x.value)).join('+');
 const indexed=t.terms.map(x=>'\\rho_{'+Math.floor(x.row/2)+(x.row%2)+','+Math.floor(x.column/2)+(x.column%2)+'}').join('+');
 return formula(`(\\rho_${s.subsystem})_{${s.cell[0]}${s.cell[1]}}=${indexed}`)+formula(`(\\rho_${s.subsystem})_{${s.cell[0]}${s.cell[1]}}=${sum}=${complexTex(t.sum)}`)+formula(`\\rho_${s.subsystem}=${matrixTex(t.matrix)}`)+table('局部相同，整体信息仍然不同',['整体态','整体纯度','整体熵 / bit','局部熵 / bit','负性'],Object.entries(stateNames).map(([key,name])=>{const a=twoSpinStateReference(key);return [name,fmt(a.globalPurity),fmt(a.globalEntropyBits),fmt(a.entropyBits),fmt(a.negativity)];}))+`<p>三个整体态都有 ρA=ρB=I/2，局部熵都是 1 bit = ln(2) nat；整体纯度和负性把这些例子区分开。混合态的局部熵不能单独量化其纠缠。</p>`;
}
function schmidtOutput(s){
 const r=pureTwoSpinReference({theta:Number(s.theta)*Math.PI/180,phi:Number(s.phi)*Math.PI/180});
 return formula(`C=${matrixTex(r.C)}`)+formula(`\\rho_A=CC^\\dagger=${matrixTex(r.rhoA)}`)+formula(`\\rho_B=C^T C^*=${matrixTex(r.rhoB)}`)+table('奇异值与概率必须区分',['分量','奇异值','Schmidt 概率'],r.schmidtProbabilities.map((p,i)=>[String(i+1),fmt(r.singularValues[i]),fmt(p)]))+table('同一纯态的两种熵单位',['整体纯度','局部熵 / nat','局部熵 / bit','负性','共同测量 ⟨σₓ⊗σₓ⟩'],[[fmt(r.globalPurity),fmt(r.entropyNats),fmt(r.entropyBits),fmt(r.negativity),fmt(r.correlationXX)]])+formula(String.raw`S_{\rm bit}=S_{\rm nat}/\ln2,\quad 0\ln0=0`)+`<p>两分量都非零时，改变相对相位 φ 一般会改变整体态，却不改变这个态族的约化矩阵或 Schmidt 概率。这不是把相对相位当作整体相位；共同测量可以分辨单重态与 T₀。</p><p>这里 ρB=CᵀC*；一般复系数下不能误写成 C†C。dagger 同时包含转置和复共轭。</p>`;
}
function tripletOutput(s){
 const r=tripletProjectionReference(),virtual=s.representation==='virtual',matrix=virtual?(s.order==='xz'?r.virtualXZ:r.virtualZX):(s.order==='xz'?r.physicalXZ:r.physicalZX);
 const ref=r.periodicReferences[s.finite==='three'?0:1],labels=ref.sites===3?['1/3','1/3','1/3']:['3/7','4/21','4/21','4/21'];
 return formula((virtual?(s.order==='xz'?'u_xu_z':'u_zu_x'):(s.order==='xz'?'R_xR_z':'R_zR_x'))+'='+matrixTex(matrix))+formula(String.raw`R_a=W(u_a\otimes u_a)W^\dagger`)+formula(virtual?String.raw`u_xu_z=-u_zu_x,\quad u_x^2=-I_2`:String.raw`R_xR_z=R_zR_x,\quad R_x^2=I_3`)+table('周期 AKLT 固定点的有限切口参考',['位点数','切口','非零 Schmidt 概率','Schmidt 秩','单键虚拟维数'],[[String(ref.sites),ref.cut.join('|'),labels.join(', '),String(ref.rank),'2']])+`<p>周期划分可能穿过不止一条虚拟键，物理子系统维数也限制 Schmidt 秩。这里是列出的固定点参考，没有启动主实验重新计算；不能由小链谱自动分类一般 SPT 相。</p>`;
}
const correct=id=>id==='partial-trace'?'half':id==='schmidt-pure'?'squared':'phase';
function answerFor(id,s){return id==='partial-trace'?(s.cell[0]===s.cell[1]?'half':'zero'):id==='triplet-virtual'?(s.representation==='virtual'?'phase':'same'):correct(id);}
function feedback(id,s,second=false){
 const value=second?s.secondChoice:s.choice,expected=second?(id==='partial-trace'?'insufficient':id==='schmidt-pure'?'convert':'cut'):answerFor(id,s),ok=value===expected;
 if(second){
  if(id==='partial-trace')return {ok,text:ok?'正确：相同局部态既可以来自纠缠纯态，也可以来自可分混合态。':'还要看整体态：三个例子的局部熵相同，负性却不同。'};
  if(id==='schmidt-pure')return {ok,text:ok?'正确：换底只改变熵的报告数值，S_bit=S_nat/ln(2)。':'量子态和概率不变；1 bit 对应 ln(2) nat，并非总有相同数值。'};
  return {ok,text:ok?'正确：周期参考给出秩 3 或 4；它们都不等于单键虚拟维数 2。':'不能把单键虚拟维数直接当作任意有限切口的 Schmidt 秩。'};
 }
 if(id==='partial-trace')return {ok,text:ok?'正确：每项先匹配被忽略一方的行、列指标，再把两种取值的贡献相加。':'请沿高亮两项相加，不要只读取整体矩阵的一个格子。'};
 if(id==='schmidt-pure')return {ok,text:ok?'正确：奇异值平方给出概率，它们也等于约化密度矩阵的本征值。':'先区分振幅、奇异值和概率；能量本征值不是 Schmidt 概率。'};
 return {ok,text:ok?(s.representation==='virtual'?'正确：单虚拟自旋的两个乘积相差负号，整体负号不改变单态测量概率。':'正确：三重子空间中的物理整数自旋 π 旋转对易。'):'请比较所选空间的矩阵关系；虚拟旋量和物理三重子空间的关系不同。'};
}

export function quantumStateBridgeHTML(lessonId){
 const ids=Object.hasOwn(QUANTUM_STATE_BRIDGE_HOOKS,lessonId)?QUANTUM_STATE_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="qsb-prerequisites" aria-label="可选的部分迹与量子态前置小实验"><p class="qsb-intro">需要把振幅、约化态和虚拟自旋接起来？展开一个本地小实验；熟悉这些操作可以直接继续。这里不会启动 Python 或改写课堂进度。</p>${ids.map(id=>`<details class="qsb-panel" data-qsb-panel="${id}"><summary>${names[id]}</summary><div class="qsb-body" data-qsb-body="${id}"></div></details>`).join('')}<p class="qsb-links"><a href="#compute/density-matrix-lab?preset=singlet">打开已有单重态实验</a> · <a href="#compute/lie/su2_coupling?preset=half-pair">打开已有 SU(2) 耦合实验</a> · <a href="#classroom/spin?module=spt&lesson=spt-schmidt&tab=learn">回到 Schmidt 与 SPT 课堂</a></p></section>`:'';
}

export function bindQuantumStateBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map()}){
 const ids=Object.hasOwn(QUANTUM_STATE_BRIDGE_HOOKS,lessonId)?QUANTUM_STATE_BRIDGE_HOOKS[lessonId]:[],store=stateStore instanceof Map?stateStore:new Map(),records=[];let alive=true;
 const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 for(const id of ids){
  const detail=root?.querySelector?.('[data-qsb-panel="'+id+'"]'),body=root?.querySelector?.('[data-qsb-body="'+id+'"]');if(!detail||!body)continue;
  const s=restored(id,store.get(lessonId+':'+id)),prefix='qsb-'+id,$=suffix=>body.querySelector('#'+prefix+'-'+suffix);
  const owns=()=>alive&&root?.isConnected!==false&&root.querySelector('[data-qsb-panel="'+id+'"]')===detail&&root.querySelector('[data-qsb-body="'+id+'"]')===body;
  const current=()=>owns()&&isCurrent(),save=()=>store.set(lessonId+':'+id,clone(s));
  if(s.open){detail.open=true;detail.setAttribute('open','');}
  body.innerHTML=panelHTML(id,s);const notes=body.querySelector('[data-qsb-notes="'+id+'"]');
  if(s.notesOpen){notes.open=true;notes.setAttribute('open','');}
  const capture=()=>{
   if(!owns())return;const before=clone(s);s.open=readOpen(detail);s.notesOpen=readOpen(notes);
   for(const key of Object.keys(enumValues)){const el=$(key);if(el&&enumValues[key].includes(el.value))s[key]=el.value;}
   for(const key of ['theta','phi','choice','secondChoice']){const el=$(key);if(el)s[key]=el.value;}
   Object.assign(s,restored(id,s));
   if([...Object.keys(enumValues),'theta','phi'].some(key=>Object.hasOwn(s,key)&&s[key]!==before[key])||s.choice!==before.choice){s.observed=false;s.checked=false;s.secondChecked=false;}
   if(s.secondChoice!==before.secondChoice)s.secondChecked=false;
   save();
  };
  const setFeedback=(suffix,checked,second=false)=>{
   const node=$(suffix);node.textContent='';node.setAttribute('class','qsb-feedback');
   if(checked){const f=feedback(id,s,second);node.textContent=f.text;node.setAttribute('class','qsb-feedback'+(f.ok?' qsb-correct':' qsb-retry'));}
  };
  const update=()=>{
   if(!current())return;
   if(id==='partial-trace'){
    const r=twoSpinStateReference(s.kind),t=partialTraceReference(r.rho,s.subsystem,Number(s.cell[0]),Number(s.cell[1]));$('source').innerHTML=sourceMatrixHTML(r,t);
    for(const b of body.querySelectorAll('[data-qsb-cell]'))b.setAttribute('aria-pressed',String(b.dataset.qsbCell===s.cell));
   }else if(id==='schmidt-pure'){$('theta-value').textContent=s.theta+'°';$('phi-value').textContent=s.phi+'°';}
   $('observe').disabled=!s.choice;$('check').disabled=!s.observed||!s.choice;$('check-second').disabled=!s.observed||!s.secondChoice;
   for(const key of ['choice','secondChoice']){$(key+'-reading').textContent=(key==='choice'?choices[id]:choices[secondKey(id)]).find(([v])=>v===s[key])?.[1]||'';}
   $('output').innerHTML=s.observed?(id==='partial-trace'?partialOutput(s):id==='schmidt-pure'?schmidtOutput(s):tripletOutput(s)):'<p class="qsb-await">先选预测，再展示计算。答案未提交时会保留为草稿。</p>';
   setFeedback('feedback',s.checked);setFeedback('second-feedback',s.secondChecked,true);save();
  };
  const invalidate=()=>{s.observed=false;s.checked=false;s.secondChecked=false;};
  const bind=(suffix,event,action)=>{
   const el=$(suffix);if(!el)return;
   el[event]=()=>{if(!current()||$(suffix)!==el||el.disabled)return;capture();const focus=action(el);update();if(typeof focus==='string')$(focus)?.focus?.({preventScroll:true});};
  };
  detail.ontoggle=()=>{if(current()){s.open=readOpen(detail);save();}};
  notes.ontoggle=()=>{if(current()){s.notesOpen=readOpen(notes);save();}};
  for(const key of Object.keys(enumValues))if($(key))bind(key,'onchange',el=>{if(enumValues[key].includes(el.value)){s[key]=el.value;invalidate();}});
  for(const key of ['theta','phi'])if($(key))bind(key,'oninput',el=>{const value=Number(el.value),hi=key==='theta'?90:180,lo=key==='theta'?0:-180;if(finite(value)&&value>=lo&&value<=hi){s[key]=el.value;invalidate();}});
  for(const key of ['choice','secondChoice'])bind(key,'onchange',el=>{const options=key==='choice'?choices[id]:choices[secondKey(id)];s[key]=options.some(([v])=>v===el.value)?el.value:'';if(key==='choice'){s.checked=false;s.observed=false;s.secondChecked=false;}else s.secondChecked=false;});
  bind('observe','onclick',()=>{s.observed=true;s.checked=false;s.secondChecked=false;return 'check';});
  bind('check','onclick',()=>{s.checked=true;return 'feedback';});
  bind('check-second','onclick',()=>{s.secondChecked=true;return 'second-feedback';});
  bind('reset','onclick',()=>{const open=readOpen(detail);Object.assign(s,defaults(id),{open});for(const key of Object.keys(s)){if($(key))$(key).value=String(s[key]);}notes.open=false;notes.removeAttribute?.('open');return 'choice';});
  for(const cell of ['00','01','10','11'])bind('cell-'+cell,'onclick',()=>{s.cell=cell;invalidate();});
  for(const [preset,theta,phi]of [['singlet','45','180'],['triplet','45','0'],['product','0','0']])bind(preset,'onclick',()=>{s.theta=theta;s.phi=phi;$('theta').value=theta;$('phi').value=phi;invalidate();});
  update();records.push({id,s,detail,body,capture});
 }
 const cleanup=()=>{if(!alive)return;for(const r of records)r.capture();alive=false;for(const {detail,body}of records){detail.ontoggle=null;for(const node of body.querySelectorAll('select'))node.onchange=null;for(const node of body.querySelectorAll('input')){node.oninput=null;node.onchange=null;}for(const node of body.querySelectorAll('button'))node.onclick=null;for(const node of body.querySelectorAll('details'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{if(alive)for(const r of records)r.capture();return Object.fromEntries(records.map(r=>[r.id,clone(r.s)]));};
 return cleanup;
}
