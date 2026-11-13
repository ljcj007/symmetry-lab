import {mathHTML} from './math-display.js?v=20261113-prose2';

// Bounded, dimensionless teaching references. General response calculations
// stay in the existing Python tool; this module never starts a worker.
export const ONSAGER_BRIDGE_HOOKS=Object.freeze({
 'reciprocity-onsager':Object.freeze(['force-flux']),
 'reciprocity-spatial-response':Object.freeze(['dual-transform']),
 'reciprocity-dissipation':Object.freeze(['dissipation-directions'])
});
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=(x,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('A finite number in the stated teaching range is required.');return x;};
const choice=(x,values)=>{if(!values.includes(x))throw Error('Unknown bounded Onsager reference option.');return x;};
const add=(a,b)=>a.map((row,i)=>row.map((v,j)=>v+b[i][j]));
const scale=(a,s)=>a.map(row=>row.map(v=>s*v));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
const norm=a=>Math.hypot(...a.flat());
const diff=(a,b)=>add(a,scale(b,-1));
const diag=(a,b)=>[[a,0],[0,b]];
const fmt=x=>Math.abs(x)<1e-12&&x!==0?x.toExponential(3):Number(x.toFixed(6)).toString();
const tex=x=>fmt(x).replace(/e([+-]?\d+)$/,(_m,n)=>'\\times10^{'+Number(n)+'}');
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(tex).join('&')).join('\\\\')+'\\end{pmatrix}';
const vector=x=>matrix(x.map(v=>[v]));
const formula=content=>'<div class="osb-formula" tabindex="0">'+mathHTML(content,true)+'</div>';
const inline=content=>mathHTML(content);
const p=text=>'<p>'+esc(text)+'</p>';
const h=text=>'<h3>'+esc(text)+'</h3>';
const table=(caption,headers,rows)=>'<div class="osb-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const defaults=()=>({model:'hall',space:'c4',a:1,b:1.4,cross:.25,odd:.4,field:.6,magnetization:.3,violation:0,reverseM:'yes',forceX:1,forceY:0});

/** Same real two-channel model and state-variable parity convention as Python. */
export function onsagerResponseReference(input={}){
 const q={...defaults(),...input};
 choice(q.model,['hall','thermo','mixed']);choice(q.space,['c1','c4','mirror']);choice(q.reverseM,['yes','no']);
 for(const key of ['a','b'])finite(q[key],.05,4);
 for(const key of ['cross','odd','violation','forceX','forceY'])finite(q[key],-2,2);
 for(const key of ['field','magnetization'])finite(q[key],-3,3);
 const build=(B,M)=>{
  const t=B+M;
  let L=q.model==='hall'?[[q.a,q.odd*t],[-q.odd*t,q.b]]:q.model==='thermo'?[[q.a,q.cross+q.odd*t],[q.cross-q.odd*t,q.b]]:[[q.a,q.cross*t+q.odd],[q.cross*t-q.odd,q.b]];
  if(q.model==='hall'&&q.space==='c4')L[0][0]=L[1][1]=(q.a+q.b)/2;
  L[0][1]+=q.violation;return L;
 };
 const L=build(q.field,q.magnetization),LR=build(-q.field,q.reverseM==='yes'?-q.magnetization:q.magnetization),fullReverse=build(-q.field,-q.magnetization),E=diag(1,q.model==='mixed'?-1:1),S=scale(add(L,transpose(L)),.5),A=scale(diff(L,transpose(L)),.5),X=[q.forceX,q.forceY],J=mv(L,X);
 const mean=(S[0][0]+S[1][1])/2,gap=Math.hypot((S[0][0]-S[1][1])/2,S[0][1]);
 const transformed=mm(mm(E,transpose(LR)),E),canonical=mm(mm(E,transpose(fullReverse)),E),terms=J.map((v,i)=>v*X[i]);
 let spatial=null;
 if(q.model==='hall'){
  const R=q.space==='c4'?[[0,-1],[1,0]]:q.space==='mirror'?diag(1,-1):diag(1,1),sign=q.space==='mirror'?-1:1,rotated=mm(mm(R,L),transpose(R));
  spatial={R,transformedControls:[sign*q.field,sign*q.magnetization],covariance:norm(diff(build(sign*q.field,sign*q.magnetization),rotated)),sameState:norm(diff(L,rotated)),controlsRetained:q.space!=='mirror'||q.field===0&&q.magnetization===0};
 }
 return{input:q,L,LR,fullReverse,E,S,A,X,J,terms,entropy:dot(X,J),antisymmetricTerms:A.map((row,i)=>row.map((v,j)=>X[i]*v*X[j])),eigenvalues:[mean-gap,mean+gap],selectedResidual:norm(diff(L,transformed)),canonicalResidual:norm(diff(L,canonical)),compared:transformed,spatial};
}

/** Spatial indices and scalar thermodynamic channels are separate examples. */
export function onsagerTransformReference({kind='space',angleDegrees=30,scale:s=2}={}){
 choice(kind,['space','dual','force-only']);finite(angleDegrees,-180,180);finite(s,.5,3);
 const base=onsagerResponseReference(kind==='space'?{forceX:.7,forceY:-.4}:{model:'thermo',field:0,magnetization:0,forceX:1,forceY:-.4}),{L,X,J}=base;
 const rad=angleDegrees*Math.PI/180,c=Math.cos(rad),sn=Math.sin(rad);
 let map,XPrime,JPrime,LPrime,metric;
 if(kind==='space'){map=[[c,-sn],[sn,c]];XPrime=mv(map,X);JPrime=mv(map,J);LPrime=mm(mm(map,L),transpose(map));metric=diag(1,1);}
 else if(kind==='dual'){map=diag(s,1/s);XPrime=mv(diag(1/s,s),X);JPrime=mv(map,J);LPrime=mm(mm(map,L),map);metric=diag(1,1);}
 else{map=diag(1,s);XPrime=mv(map,X);JPrime=[...J];LPrime=mm(L,diag(1,1/s));metric=diag(1,1/s);}
 return{kind,angleDegrees,scale:s,L,X,J,map,XPrime,JPrime,LPrime,entropyMetric:metric,entropy:dot(J,X),correctEntropy:dot(JPrime,mv(metric,XPrime)),naiveEntropy:dot(JPrime,XPrime),naiveTransposeResidual:norm(diff(LPrime,transpose(LPrime))),responseResidual:Math.hypot(...mv(LPrime,XPrime).map((v,i)=>v-JPrime[i]))};
}

export function onsagerDissipationReference({model='active',angleDegrees=0,amplitude=1,forcePreset='custom'}={}){
 choice(model,['active','hall']);choice(forcePreset,['custom','axis','negative']);finite(angleDegrees,-180,180);finite(amplitude,.25,2);
 const radians=angleDegrees*Math.PI/180,X=forcePreset==='axis'?[1,0]:forcePreset==='negative'?[1,-1]:[amplitude*Math.cos(radians),amplitude*Math.sin(radians)];
 const result=onsagerResponseReference({...(model==='active'?{model:'thermo',cross:2,field:0,magnetization:0}:{}),forceX:X[0],forceY:X[1]});
 return{...result,model,angleDegrees:forcePreset==='axis'?0:forcePreset==='negative'?-45:angleDegrees,amplitude:Math.hypot(...X),forcePreset,symmetricEntropy:dot(X,mv(result.S,X)),antisymmetricEntropy:dot(X,mv(result.A,X))};
}

/** Zero field, one direction, linearized about uniform T0; no material units. */
export function onsagerKelvinReference(T0=2){
 finite(T0,.1,10);const L=onsagerResponseReference({model:'thermo',field:0,magnetization:0}).L;
 const S=L[0][1]/(T0*L[0][0]),Pi=L[1][0]/L[0][0],openForces=[S/T0,-1/(T0*T0)],openFlux=mv(L,openForces),isothermalForces=[1/T0,0],isothermalFlux=mv(L,isothermalForces);
 return{T0,mu0:0,L,S,Pi,TtimesS:T0*S,openForces,openFlux,isothermalForces,isothermalFlux};
}

const PRESETS=Object.freeze({
 'onsager-hall':{},'onsager-domain':{reverseM:'no'},'onsager-mirror':{space:'mirror'},'onsager-thermo':{model:'thermo',field:0,magnetization:0},'onsager-mixed':{model:'mixed'},'onsager-broken':{violation:.4},'onsager-active':{model:'thermo',cross:2,field:0,magnetization:0}
});
export function onsagerBridgeLabRequest({preset='onsager-hall',forceX,forceY}={}){
 if(!Object.hasOwn(PRESETS,preset))throw Error('Only an existing reciprocity preset can be copied.');
 const input={...defaults(),...PRESETS[preset]};
 if(forceX!==undefined)input.forceX=finite(forceX,-2,2);if(forceY!==undefined)input.forceY=finite(forceY,-2,2);
 return{module:'reciprocity',action:'reciprocity_lab',input,preset,source:'onsager-learning-bridge'};
}

const title=id=>({'force-flux':'同一方阵，不同输入和输出','dual-transform':'换坐标、换尺度、反转磁畴','dissipation-directions':'一个正值能证明所有方向吗'}[id]);
const names=()=>[['onsager-hall','反转全部奇参量'],['onsager-domain','只反转外磁场'],['onsager-mirror','镜面与轴矢量协变'],['onsager-thermo','零场电热共轭通道'],['onsager-mixed','抽象一偶一奇通道'],['onsager-broken','故意违反互易的候选'],['onsager-active','互易但非被动的候选']];
const select=(id,label,rows,value)=>'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+rows.map(([key,text])=>'<option value="'+key+'" '+(key===value?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
const range=(id,label,min,max,value)=>'<label for="'+id+'">'+esc(label)+'<input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="any" value="'+value+'"><output id="'+id+'-value">'+fmt(value)+'</output></label>';
const button=(id,text,disabled=false)=>'<button type="button" id="'+id+'" '+(disabled?'disabled':'')+'>'+esc(text)+'</button>';
const initial=id=>({open:false,native:{},note:'',choices:['','',''],checked:[false,false,false],revealed:0,copyOutcome:'',actionSpace:'hall',forceAngle:0,kind:'space',angle:30,scale:2,reversal:'both',model:'active',amplitude:1,forcePreset:'axis',preset:id==='dissipation-directions'?'onsager-active':'onsager-hall'});
function restore(id,raw){
 const s=initial(id);if(!raw||typeof raw!=='object'||Array.isArray(raw))return s;
 for(const k of ['open'])s[k]=raw[k]===true;
 s.note=typeof raw.note==='string'?raw.note.slice(0,2000):'';
 for(const k of ['actionSpace','kind','reversal','model','forcePreset','preset']){const allowed={actionSpace:['hall','static','thermo'],kind:['space','dual','force-only'],reversal:['both','field'],model:['active','hall'],forcePreset:['axis','negative','custom'],preset:Object.keys(PRESETS)}[k];if(allowed.includes(raw[k]))s[k]=raw[k];}
 for(const [k,min,max]of [['forceAngle',-180,180],['angle',-180,180],['scale',.5,3],['amplitude',.25,2]])if(typeof raw[k]==='number'&&Number.isFinite(raw[k])&&raw[k]>=min&&raw[k]<=max)s[k]=raw[k];
 s.revealed=Number.isInteger(raw.revealed)&&raw.revealed>=0&&raw.revealed<=3?raw.revealed:0;
 for(let i=0;i<3;i++){if(questions(id)[i].rows.some(([value])=>value===raw.choices?.[i]))s.choices[i]=raw.choices[i];s.checked[i]=raw.checked?.[i]===true&&!!s.choices[i]&&s.revealed>0;}
 for(const key of ['theory','kelvin','magnetic','matrix'])s.native[key]=raw.native?.[key]===true;
 return s;
}

function questions(id){
 if(id==='force-flux')return[
  {prompt:'只施加平面四重旋转，不预设指标对称，横向反对称项能保留吗？',rows:[['allowed','能，空间约束允许反对称块'],['zero','不能，四重旋转使全部非对角元为零'],['equal','能，但两个非对角元必须相等']],answer:'allowed',feedback:{allowed:'正确。一般平面矩阵可为 [[a,b],[-b,a]]；再加静态介电的指标对称性才要求 b=0。',zero:'四重旋转本身允许反对称块。把静态介电的额外指标对称性搬到 Hall 输运会漏掉允许项。',equal:'一般四重旋转约束给 Lxy=-Lyx。要求二者相等属于额外的指标对称条件。'}},
  {prompt:'电荷与能量状态变量均为时间偶，对应电流与能流应怎样变换？',rows:[['odd','两个流均变号'],['even','两个流均不变'],['mixed','电流变号，能流不变']],answer:'odd',feedback:{odd:'正确。时间反演不改变电荷和能量密度，但改变其变化率或守恒流的方向。',even:'状态变量与流不是同一对象。时间反演使变化率或守恒流多一个负号。',mixed:'热能的输运方向也在时间反演下改变；不能因能量为偶而把能流也标成偶。'}},
  {prompt:'在下方声明的一维零场约定中，Seebeck 与 Peltier 系数满足什么关系？',rows:[['temperature','Π=T₀S'],['equal','Π=S'],['negative','Π=-T₀S']],answer:'temperature',feedback:{temperature:'正确。熵共轭系数的相等经电化学场和温度梯度的定义产生 T₀ 因子。',equal:'相等的是这里的 L12 与 L21。实验式中电化学场和温度梯度的缩放不同，不能漏掉 T₀。',negative:'本例明确定义开路时 Eec=S∇T；采用其他电压或梯度方向约定时，须连同定义一起比较符号。'}}
 ];
 if(id==='dual-transform')return[
  {prompt:'只把第二个力乘一个尺度、保持流不变，新的方阵不对称就说明物理互易失效吗？',rows:[['conjugacy','不能，须先检查新的力流是否熵共轭'],['violation','说明失效，任何响应方阵都必须对称'],['ignore','不用比较，只看对角元']],answer:'conjugacy',feedback:{conjugacy:'正确。仅改力后，熵产生带有配对度量；普通矩阵转置不再是原约定的互易检验。',violation:'新坐标仍可描述同一物理响应。必须把熵产生的配对规则也变换，才有可比的互易条件。',ignore:'对角元既不能检验交叉互易，也不能保证所有方向非负耗散。'}},
  {prompt:'非零 Bz、Mz 时，镜面跨磁态协变残差为零，是否证明原磁畴保持该镜面？',rows:[['states','不能，镜面还翻转两个轴矢量参量'],['same','能，所有参量都保持'],['rotation','能，镜面就是平面内旋转']],answer:'states',feedback:{states:'正确。应区分连接相反磁态的协变，与同一完整状态在操作后不变。',same:'这里的面内镜面使 Bz 与 Mz 变号；非零参量不保持原值。',rotation:'镜面行列式为 -1；轴矢量变换多出行列式因子，不能当作正旋转。'}},
  {prompt:'本例磁化非零时，只反 B 不反 M 的残差非零，可以直接否定 Onsager 吗？',rows:[['all','不能，完整比较还要反转 M'],['yes','可以，反转 B 总是足够'],['swap','只交换两个对角元即可']],answer:'all',feedback:{all:'正确。全部时间反演奇控制量必须一并反转，再交换激励与读出通道。',yes:'当 M 保持非零时，这不是与原磁态时间反演对应的配置；工具同时给出完整反转残差。',swap:'互易比较包括完整响应矩阵、通道转置和变量奇偶，不能只交换两个对角元。'}}
 ];
 return[
  {prompt:'一个互易方阵的两个对角元都为正，是否保证全部激励方向的熵产生非负？',rows:[['no','不保证，还要检查对称部分的最小本征值'],['yes','保证，正对角元就足够'],['trace','只要矩阵迹为正就保证']],answer:'no',feedback:{no:'正确。对称交叉项足够大时，仍存在熵产生为负的方向。',yes:'本例两个对角元为 1 和 1.4，但 X=(1,-1) 给出负二次型。',trace:'正迹是本征值之和为正，不排除其中一个本征值为负。'}},
  {prompt:'改变实共轭力方向时，Hall 反对称部分对熵产生的净贡献是什么？',rows:[['zero','恒为零，两项相消'],['negative','恒为负'],['positive','恒为正']],answer:'zero',feedback:{zero:'正确。两个交叉项等大反号；改变力方向不会让实反对称二次型产生净耗散。',negative:'单个交叉项可为负，但必须把与它配对的另一项相加。',positive:'Hall 反对称项改变流的方向；实共轭力的总熵产生只由对称部分决定。'}},
  {prompt:'在 X=(1,0) 下测到正熵产生，是否已经排除了其他方向的负值？',rows:[['direction','没有，须改变方向或检验最小本征值'],['one','已经排除，一次正值足够'],['reciprocal','只要互易成立就排除']],answer:'direction',feedback:{direction:'正确。保持同一个矩阵，改为 X=(1,-1) 就能给出反例。',one:'一次激励只检验一个二次型值，不代表整个激励空间。',reciprocal:'互易与被动性是两个不同条件。本例互易残差为零，但最小耗散本征值为负。'}}
 ];
}

function questionHTML(prefix,id,state,index){
 const q=questions(id)[index];return'<section class="osb-question"><h4>'+esc(q.prompt)+'</h4>'+select(prefix+'-q'+index,'你的预测',[['','先选择预测'],...q.rows],state.choices[index])+'<p class="osb-choice-reading" id="'+prefix+'-reading'+index+'"></p>'+button(prefix+'-check'+index,'核对判断',!state.choices[index]||!state.revealed)+'<p class="osb-feedback" role="status" id="'+prefix+'-feedback'+index+'"></p></section>';
}
function native(prefix,key,label,state,html){return'<details class="osb-native" data-osb-native="'+key+'" '+(state.native[key]?'open':'')+'><summary>'+esc(label)+'</summary>'+html+'</details>';}
function forceOutput(state){
 const rad=state.forceAngle*Math.PI/180,X=[Math.cos(rad),Math.sin(rad)],kind=state.actionSpace;
 const L=kind==='hall'?onsagerResponseReference().L:kind==='static'?[[1.2,0],[0,1.2]]:onsagerResponseReference({model:'thermo',field:0,magnetization:0}).L,J=mv(L,X),terms=J.map((v,i)=>v*X[i]);
 let html=h('先指定作用空间，再读矩阵的行和列')+p(kind==='thermo'?'此处两个指标是电荷、能量两种标量通道，不是 x、y 空间坐标。':'此处两个指标是同一平面内的 x、y 空间坐标。')+table('行是输出，列是输入',['对象','行 / 输出','列 / 输入','额外条件'],[[kind==='static'?'静态介电平面块':kind==='thermo'?'零场电热参考':'二维 Hall 参考',kind==='static'?'Px, Py':kind==='thermo'?'电荷流、能量流':'Jx, Jy',kind==='static'?'Ex, Ey':kind==='thermo'?'熵共轭力 X₁、X₂':'共轭驱动力 Xx、Xy',kind==='static'?'平衡势二阶导数给指标对称':kind==='thermo'?'两个状态变量均时间偶':'未预设施加 Lxy=Lyx']])+formula((kind==='static'?'\\chi=':'L=')+matrix(L));
 if(state.revealed>=2){
  html+=h('沿每一行做收缩')+formula((kind==='static'?'\\mathbf P=\\chi\\mathbf E=':'\\mathbf J=L\\mathbf X=')+matrix(L)+vector(X)+'='+vector(J))+p(kind==='static'?'这里只计算静态极化响应，P·E 不是此输运模型的熵产生率。':'以下量均为本页的无量纲熵共轭参考，不是材料输运系数。');
  if(kind!=='static')html+=table('熵产生逐项相加',['通道','流','共轭力','乘积'],J.map((v,i)=>[i+1,fmt(v),fmt(X[i]),fmt(terms[i])]))+formula('\\sigma=J_1X_1+J_2X_2='+tex(terms[0])+'+('+tex(terms[1])+')='+tex(dot(J,X)));
 }
 if(state.revealed>=3)html+=h('把空间限制与内禀限制分开')+formula('R=\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix},\\quad L=RLR^{T}\\Rightarrow L=\\begin{pmatrix}a&b\\\\-b&a\\end{pmatrix}')+p('再要求静态介电的 χ=χᵀ，才得到平面块 χ=aI。一般 Hall 输运不能直接继承这条指标对称性。')+p('单独考察一个局部松弛参考：a 是偏离平衡的状态变量，熵在平衡附近取二次型。熵共轭力是对状态变量的导数，流是其变化率；这给配对一个具体来源，不把静态极化叫作输运流。')+formula('s=s_0-\\tfrac12(a_1^2+a_2^2),\\quad X_i=\\frac{\\partial s}{\\partial a_i}=-a_i,\\quad J_i=\\dot a_i,\\quad\\dot s=\\sum_iX_iJ_i')+table('状态、熵共轭力与流的时间反演奇偶',['对象','状态变量','熵共轭力','变化率 / 守恒流'],[['电荷与能量','均为偶','均为偶','均为奇'],['抽象一偶一奇','ε₁=+1, ε₂=-1','ε₁=+1, ε₂=-1','-ε₁, -ε₂']])+p('流多出的负号来自时间方向反转。Onsager 互易还依赖微观可逆性，不能通过把固定的不可逆本构式简单倒放来证明。');
 return html;
}
function transformOutput(state){
 const r=onsagerTransformReference({kind:state.kind,angleDegrees:state.angle,scale:state.scale});
 let html=h('先说明这两个指标是什么')+p(state.kind==='space'?'空间分量例子固定默认 Hall 矩阵，X=(0.7,-0.4)。明确采用 v′=Qv 的分量映射；主动转样品与被动换坐标须另行声明。':'本例固定零场、两偶标量通道的 L=[[1,0.25],[0.25,1.4]] 与 X=(1,-0.4)。两个通道不能当成 x、y 空间分量。')+formula('L='+matrix(r.L)+',\\quad X='+vector(r.X)+',\\quad J='+vector(r.J));
 if(state.revealed>=2){
  html+=h('流和力必须按配对规则一起比较')+p(state.kind==='space'?'正交分量映射同时作用于流与力，矩阵每个空间指标各变换一次。':state.kind==='dual'?'重新选择标量通道尺度时，流按 A 变换，熵共轭力按逆转置变换。本例只缩放两个时间偶通道。':'此反例仅改力 Y=CX，流 J 保持原值。Y 与原 J 已不是普通欧氏点积下的熵共轭对。')+formula(state.kind==='space'?'J^\\prime=QJ,\\quad X^\\prime=QX,\\quad L^\\prime=QLQ^{T}':state.kind==='dual'?'J^\\prime=AJ,\\quad X^\\prime=A^{-T}X,\\quad L^\\prime=ALA^{T}':'Y=CX,\\quad J=KY,\\quad K=LC^{-1}')+formula((state.kind==='space'?'Q=':state.kind==='dual'?'A=':'C=')+matrix(r.map))+formula((state.kind==='force-only'?'K=':'L^\\prime=')+matrix(r.LPrime))+formula((state.kind==='force-only'?'Y=':'X^\\prime=')+vector(r.XPrime)+',\\quad J^\\prime='+vector(r.JPrime));
 }
 if(state.revealed>=3){
  html+=h('用熵产生检查比较是否仍是同一件事')+formula(state.kind==='force-only'?'\\sigma=J^{T}C^{-1}Y='+tex(r.correctEntropy):'\\sigma=J^{T}X=J^{\\prime T}X^\\prime='+tex(r.correctEntropy))+table('同一响应与两种配对计算',['检验','数值'],[['原熵产生',fmt(r.entropy)],['按正确配对计算',fmt(r.correctEntropy)],['直接相乘新显示分量',fmt(r.naiveEntropy)],['新显示矩阵与普通转置的距离',fmt(r.naiveTransposeResidual)]])+p(state.kind==='force-only'?'新的 K 可以不对称而仍描述原来同一个互易响应。先恢复正确的配对度量，再谈互易；若尺度为 1，反例退化回原约定。':state.kind==='space'?'该固定 Hall 平面块在正旋转下保持形式，横向反对称项仍可存在。不能把同一磁态的普通不对称当作互易违例。':'配对重标度保持 σ。这里两通道均为偶；若混合不同时间奇偶通道，奇偶算符也必须随基底变换，不能照搬原对角符号。');
 }
 return html;
}
function magneticOutput(state){
 const r=onsagerResponseReference({reverseM:state.reversal==='both'?'yes':'no'}),mirror=onsagerResponseReference({space:'mirror'});
 return p('本段单独固定默认 Hall 模型的 B=0.6、M=0.3、d=0.4。它不继承上方标量通道尺度。')+formula('L(B,M)='+matrix(r.L)+',\\quad L_{\\rm comparison}='+matrix(r.LR))+formula('E L_{\\rm comparison}^{T}E='+matrix(r.compared))+table('反转条件、转置与残差',['比较','结果'],[['所选反转的互易残差',fmt(r.selectedResidual)],['B 与 M 全反转的残差',fmt(r.canonicalResidual)],['镜面跨磁态协变残差',fmt(mirror.spatial.covariance)],['镜面同一磁态不变残差',fmt(mirror.spatial.sameState)]])+p('面内镜面的行列式为 -1，垂直平面的 Bz、Mz 是轴矢量分量，所以都变号。镜面连接相反磁态，不等于原来非零磁态保持该镜面。')+formula('L(-B,-M)=R_mL(B,M)R_m^{T},\\quad R_m=\\operatorname{diag}(1,-1)')+p('镜面两项残差使用原镜面预设 a=1、b=1.4；与上方四重旋转预设的平均对角值分开。只反 B 不反 M 的差异来自比较条件不完整，并非完整 Onsager 检验失败。');
}
function dissipationCurve(r){
 const samples=Array.from({length:73},(_,i)=>{const angle=-Math.PI+2*Math.PI*i/72,X=[r.amplitude*Math.cos(angle),r.amplitude*Math.sin(angle)];return[-180+5*i,dot(X,mv(r.S,X))];}),lo=Math.min(0,...samples.map(x=>x[1])),hi=Math.max(0,...samples.map(x=>x[1])),span=hi-lo||1,xy=([x,y])=>[48+(x+180)*440/360,195-155*(y-lo)/span],point=xy([r.angleDegrees,r.entropy]),zero=xy([0,0])[1];
 return'<div class="osb-scroll" tabindex="0"><svg class="osb-curve" viewBox="0 0 540 260" role="img" aria-label="固定矩阵和幅度下，熵产生随激励方向变化"><path d="M48 30V195H488" fill="none" stroke="#7c9586"/><path d="M48 '+zero+'H488" stroke="#9caea1" stroke-dasharray="4 4"/><polyline points="'+samples.map(v=>xy(v).join(',')).join(' ')+'" fill="none" stroke="#216946" stroke-width="3"/><circle cx="'+point[0]+'" cy="'+point[1]+'" r="6" fill="#a56520" stroke="white" stroke-width="2"/><text x="48" y="225">−180°</text><text x="442" y="225">180°</text><text x="55" y="24">σ</text><text x="534" y="42" text-anchor="end">'+fmt(hi)+'</text><text x="534" y="195" text-anchor="end">'+fmt(lo)+'</text><text x="210" y="251">'+esc('激励方向 θ')+'</text></svg></div>';
}
function dissipationOutput(state){
 const r=onsagerDissipationReference({model:state.model,angleDegrees:state.forceAngle,amplitude:state.amplitude,forcePreset:state.forcePreset});
 let html=h('固定矩阵，只改变激励方向')+p(state.model==='active'?'保持原有互易但非被动候选 L=[[1,2],[2,1.4]]。正、负方向按钮使用精确的 (1,0) 和 (1,-1)，不是另换一个模型。':'保持默认 Hall 模型 L=[[1.2,0.36],[-0.36,1.2]]。这里的反对称项只改变响应流方向。')+formula('L='+matrix(r.L)+',\\quad X='+vector(r.X)+',\\quad J='+vector(r.J))+dissipationCurve(r)+p('曲线使用当前力的幅度扫描全部方向；橙色点是当前选择。连续角度用浮点三角函数，端点可能留下机器精度残差。');
 if(state.revealed>=2)html+=h('逐项累加，不只看某个对角元')+table('熵产生与全方向诊断',['检验','结果'],[['J₁X₁',fmt(r.terms[0])],['J₂X₂',fmt(r.terms[1])],['熵产生之和',fmt(r.entropy)],['最小耗散本征值',fmt(r.eigenvalues[0])],['全部奇参量反转的互易残差',fmt(r.canonicalResidual)]])+formula('S=\\tfrac12(L+L^{T})='+matrix(r.S)+',\\quad\\sigma=X^{T}SX='+tex(r.symmetricEntropy))+p('某个激励方向的正值，不保证其他方向也非负。要对全部实共轭力非负，须要求 S 的最小本征值非负。');
 if(state.revealed>=3)html+=h('让 Hall 两个交叉项相消')+formula('A=\\tfrac12(L-L^{T})='+matrix(r.A))+table('反对称二次型的四项',['项','数值'],[['X₁A₁₁X₁',fmt(r.antisymmetricTerms[0][0])],['X₁A₁₂X₂',fmt(r.antisymmetricTerms[0][1])],['X₂A₂₁X₁',fmt(r.antisymmetricTerms[1][0])],['X₂A₂₂X₂',fmt(r.antisymmetricTerms[1][1])]])+formula('X^{T}AX='+tex(r.antisymmetricEntropy))+p('反对称部分对实共轭力的净熵产生为零。选中 Hall 模型且两个力分量均非零时，可以直接看到两个非零交叉项等大反号。');
 return html;
}
function kelvinHTML(){
 const r=onsagerKelvinReference();return p('本段是零场、单一空间方向、在均匀 T₀ 附近的线性化约定。所有数值仍是无量纲代数参考，不从本站矩阵推断实测单位或材料常数。')+p('围绕均匀温度 T₀ 和化学势 μ₀ 保留线性阶，热流 jq=ju-μ₀jn；jn 是粒子流，je 是电荷流，二者不能混写。本段选择参考能量零点使 μ₀=0，所以在此约定下能流与热流数值相同，才复用同一个数值 L。')+formula('j_q=j_u-\\mu_0j_n,\\quad\\mu_0=0')+p('将电化学驱动场定义为 Eec，并使用与热流熵共轭的温度力。一般非零 μ₀ 时须同时变换流和力，不能只把“能流”改名为“热流”而保持原矩阵。')+formula('\\binom{j_e}{j_q}=L\\binom{E_{\\rm ec}/T_0}{-\\nabla T/T_0^2},\\quad \\sigma=j_e E_{\\rm ec}/T_0-j_q\\nabla T/T_0^2')+p('定义开路 je=0 时 Eec=S∇T；等温 ∇T=0 时 Π=jq/je。先分别消去对应条件下的变量。')+formula('S=\\frac{L_{12}}{T_0L_{11}},\\quad\\Pi=\\frac{L_{21}}{L_{11}},\\quad L_{12}=L_{21}\\Rightarrow\\Pi=T_0S')+table('同一零场参考，T₀=2',['量','结果'],[['L12 = L21',fmt(r.L[0][1])],['Seebeck S',fmt(r.S)],['Peltier Π',fmt(r.Pi)],['T₀ S',fmt(r.TtimesS)]])+p('换用相反电压或温度梯度方向时，须连同 S 与 Π 的定义一起核对符号；不能仅对照孤立的正负号。')+p('这说明为何实验式中的交叉系数不总是直接数值相等。一般有限场、张量热电和接触测量需要原工具及额外测量约定。');
}

function bodyHTML(prefix,id,state,canCopy){
 const controls=id==='force-flux'?select(prefix+'-actionSpace','指定输入与输出',[['hall','Hall 空间分量'],['static','静态介电平面块'],['thermo','零场电荷—能量通道']],state.actionSpace)+range(prefix+'-forceAngle','参考输入方向 θ / 度',-180,180,state.forceAngle):id==='dual-transform'?select(prefix+'-kind','选择一种变换',[['space','空间正交分量映射'],['dual','配对的标量通道重标度'],['force-only','反例：只改力、保持流']],state.kind)+range(prefix+'-angle','空间映射角 θ / 度',-180,180,state.angle)+range(prefix+'-scale','标量通道尺度 s',.5,3,state.scale):select(prefix+'-model','固定响应矩阵',[['active','互易但非被动候选'],['hall','被动 Hall 参考']],state.model)+range(prefix+'-forceAngle','共轭力方向 θ / 度',-180,180,state.forceAngle)+range(prefix+'-amplitude','共轭力幅度',.25,2,state.amplitude);
 return p('这里使用固定、无量纲的两通道小例。它帮助核对变量和配对约定，不替代原有 Python 工具，也不改写课程掌握状态。')+'<div class="osb-controls">'+controls+'</div>'+(id==='dissipation-directions'?'<div class="osb-actions">'+button(prefix+'-axis','选择 X=(1,0)')+button(prefix+'-negative','选择 X=(1,-1)')+'</div>':'')+questionHTML(prefix,id,state,0)+'<div class="osb-actions">'+button(prefix+'-observe','展开第一步',!state.choices[0])+button(prefix+'-next','继续下一步',!state.revealed||state.revealed>=3)+'</div><div class="osb-output" id="'+prefix+'-output"></div>'+questionHTML(prefix,id,state,1)+questionHTML(prefix,id,state,2)+(id==='force-flux'?native(prefix,'kelvin','可选推导：从熵共轭系数到 Π=T₀S',state,kelvinHTML()):id==='dual-transform'?native(prefix,'magnetic','分开检查磁态反转与镜面协变',state,'<div class="osb-controls">'+select(prefix+'-reversal','反转哪些奇参量',[['both','同时反转 B 与 M'],['field','只反转 B，M 不变']],state.reversal)+'</div><div id="'+prefix+'-magnetic-output"></div>'):native(prefix,'matrix','为什么只需要对称部分半正定',state,formula('X^{T}AX=(X^{T}AX)^T=X^{T}A^{T}X=-X^{T}AX=0')+p('实反对称二次型恒为零；实对称矩阵可正交对角化，所以全部方向二次型非负等价于全部本征值非负。互易关系本身不保证这个条件。')))+
 '<label class="osb-notes" for="'+prefix+'-note">'+esc('用自己的话记下变量、约定与证据（仅本页会话）')+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+native(prefix,'theory','比较前先核对这三种操作',state,table('三种操作不能混用',['操作','改变什么','应检验什么'],[['空间分量映射','同一物理流和力的空间坐标','每个空间指标及控制量一起变换'],['通道尺度变换','熵共轭量的数值表示','逆转置配对与熵产生'],['时间反演比较','B、M及其他时间奇控制量','变量奇偶、矩阵转置与反向状态']])+p('本页只处理实、近稳态、线性响应的有限参考。复杂频率响应、非线性或非局域输运需要相应的互易形式。'))+
 (canCopy?'<section class="osb-copy"><h4>'+esc('复制已存在的模型预设')+'</h4>'+p(id==='dissipation-directions'?'复制当前模型的原预设，并带上当前激励方向。未计算的预测、曲线和笔记不作为生产输入。':'下面单独选择原工具的七个预设。空间换坐标、通道重标度和热电单位推导不作为新的生产模型复制。')+(id==='dissipation-directions'?'':'<div class="osb-controls">'+select(prefix+'-preset','原工具预设',names(),state.preset)+'</div>')+'<p id="'+prefix+'-copy-description"></p>'+button(prefix+'-copy',id==='dissipation-directions'?'把当前固定模型与力方向复制到实验':'复制所选原预设，等待手动计算')+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p class="osb-links"><a href="#classroom/observables?module=reciprocity&lesson='+({ 'force-flux':'reciprocity-onsager','dual-transform':'reciprocity-spatial-response','dissipation-directions':'reciprocity-dissipation'}[id])+'&tab=lab">'+esc('打开原互易实验；链接不传递此处参考变换')+'</a></p>')+button(prefix+'-reset','重置这个可选实验');
}

export function onsagerBridgeHTML(lessonId){
 if(!Object.hasOwn(ONSAGER_BRIDGE_HOOKS,lessonId))return '';
 const id=ONSAGER_BRIDGE_HOOKS[lessonId][0];
 return'<section class="osb-prerequisite" aria-label="可选的力流与互易操作演示"><p class="osb-intro">'+esc('从物性张量进入互易关系时，先把输入、输出和比较约定连起来。熟悉这些操作可以直接继续原课。')+'</p><details class="osb-panel" data-osb-panel="'+id+'"><summary>'+esc(title(id))+'</summary><div class="osb-body" data-osb-body="'+id+'"></div></details></section>';
}

export function bindOnsagerLearningBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const id=Object.hasOwn(ONSAGER_BRIDGE_HOOKS,lessonId)?ONSAGER_BRIDGE_HOOKS[lessonId][0]:null,store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':'+id;
 const detail=id?root?.querySelector?.('[data-osb-panel="'+id+'"]'):null,body=id?root?.querySelector?.('[data-osb-body="'+id+'"]'):null,state=restore(id,store.get(key)),prefix='osb-'+id;
 let alive=true,ticket=0,busy=false;
 const owns=()=>alive&&detail&&body&&root?.isConnected!==false&&root.querySelector('[data-osb-panel="'+id+'"]')===detail&&root.querySelector('[data-osb-body="'+id+'"]')===body;
 const current=()=>owns()&&isCurrent();
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const save=()=>{if(id&&detail&&body)store.set(key,clone(state));};
 const open=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 const invalidate=(keepSteps=false)=>{if(!keepSteps)state.revealed=0;state.checked=[false,false,false];state.copyOutcome='';ticket++;if($('copy-status'))$('copy-status').textContent='';};
 const fields=id==='force-flux'?['actionSpace','forceAngle']:id==='dual-transform'?['kind','angle','scale','reversal']:['model','forceAngle','amplitude'];
 function capture(){
  if(!owns())return;
  state.open=open(detail);for(const d of body.querySelectorAll('[data-osb-native]'))state.native[d.dataset.osbNative]=open(d);
  const note=$('note');if(note)state.note=String(note.value).slice(0,2000);
  let changed=false,onlyContinuous=true;
  for(const field of [...fields,'preset']){const node=$(field);if(!node)continue;const continuous=['forceAngle','angle','scale','amplitude'].includes(field),value=continuous?Number(node.value):node.value;const candidate=restore(id,{...state,[field]:value});if(candidate[field]!==state[field]){state[field]=candidate[field];changed=true;onlyContinuous=onlyContinuous&&continuous;if(field==='forceAngle'||field==='amplitude')state.forcePreset='custom';}}
  if(changed)invalidate(onlyContinuous);
  for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||questions(id)[i].rows.some(([v])=>v===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}
  save();
 }
 function request(){
  if(id==='dissipation-directions'){const r=onsagerDissipationReference({model:state.model,angleDegrees:state.forceAngle,amplitude:state.amplitude,forcePreset:state.forcePreset});return onsagerBridgeLabRequest({preset:state.model==='active'?'onsager-active':'onsager-hall',forceX:r.X[0],forceY:r.X[1]});}
  return onsagerBridgeLabRequest({preset:state.preset});
 }
 function update(){
  if(!current())return;
  $('output').innerHTML=state.revealed?(id==='force-flux'?forceOutput(state):id==='dual-transform'?transformOutput(state):dissipationOutput(state)):p('先作预测，再展开当前参考。切换模型后重新展开；连续调节保留已展开步骤，但判断反馈需要重新核对。');
  $('observe').disabled=!state.choices[0];$('next').disabled=!state.revealed||state.revealed>=3;
  for(let i=0;i<3;i++){const q=questions(id)[i],feedback=$('feedback'+i);$('check'+i).disabled=!state.choices[i]||!state.revealed;feedback.textContent=state.checked[i]?q.feedback[state.choices[i]]:'';feedback.setAttribute('class','osb-feedback'+(state.checked[i]?(state.choices[i]===q.answer?' osb-correct':' osb-retry'):''));$('reading'+i).textContent=q.rows.find(([value])=>value===state.choices[i])?.[1]||'';}
  for(const field of ['forceAngle','angle','scale','amplitude']){const output=$(field+'-value');if(output)output.textContent=fmt(state[field]);}
  if($('magnetic-output'))$('magnetic-output').innerHTML=magneticOutput(state);
  if($('copy-description')){const r=request();$('copy-description').textContent=id==='dissipation-directions'?'复制的是当前固定矩阵对应的原预设，并带上当前 X₁、X₂；不会复制显示曲线或推导步骤。':'只复制下拉框选定原预设的完整输入；上方参考方向、角度、尺度和磁态比较不覆盖这个预设。';$('copy-description').setAttribute('data-osb-request-preset',r.preset);}
  if($('copy'))$('copy').disabled=busy;
  save();
 }
 function draw(){
  if(!current())return;body.innerHTML=bodyHTML(prefix,id,state,typeof onOpenLab==='function');
  for(const d of body.querySelectorAll('[data-osb-native]'))d.ontoggle=()=>{if(current()&&body.querySelector('[data-osb-native="'+d.dataset.osbNative+'"]')===d){state.native[d.dataset.osbNative]=open(d);save();}};
  const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};};
  for(const field of fields)bind(field,['forceAngle','angle','scale','amplitude'].includes(field)?'oninput':'onchange',()=>{});
  for(let i=0;i<3;i++){bind('q'+i,'onchange',()=>{});bind('check'+i,'onclick',()=>{state.checked[i]=true;});}
  bind('observe','onclick',()=>{state.revealed=1;state.checked=[false,false,false];});
  bind('next','onclick',()=>{state.revealed=Math.min(3,state.revealed+1);});
  bind('axis','onclick',()=>{invalidate(true);state.forcePreset='axis';state.forceAngle=0;state.amplitude=1;$('forceAngle').value='0';$('amplitude').value='1';});
  bind('negative','onclick',()=>{invalidate(true);state.forcePreset='negative';state.forceAngle=-45;state.amplitude=Math.SQRT2;$('forceAngle').value='-45';$('amplitude').value=String(Math.SQRT2);});
  bind('preset','onchange',()=>{});
  const note=$('note');note.oninput=()=>{if(current()&&$('note')===note){state.note=String(note.value).slice(0,2000);save();}};
  bind('reset','onclick',()=>{ticket++;const wasOpen=state.open;Object.assign(state,initial(id),{open:wasOpen});draw();$('q0')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy)copy.onclick=async()=>{
   if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=clone(request());busy=true;copy.disabled=true;state.copyOutcome='';$('copy-status').textContent='';
   try{const accepted=await onOpenLab(payload);if(current()&&job===ticket){if(accepted===false)throw Error('The existing experiment did not accept this reference.');state.copyOutcome='success';$('copy-status').textContent='输入已复制；请在原实验中检查参数并手动运行。';save();}}
   catch(error){if(current()&&job===ticket){state.copyOutcome='error';$('copy-status').textContent='本次复制未完成，可重新尝试。';save();}}
   finally{busy=false;if(current())$('copy').disabled=false;}
  };
  update();
 }
 if(detail&&body){if(state.open){detail.open=true;detail.setAttribute?.('open','');}detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body)for(const tag of ['button','select','input','textarea','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.ontoggle=null;}};
 cleanup.snapshot=()=>{capture();return id?{[id]:clone(state)}:{};};return cleanup;
}
