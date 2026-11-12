import {mathHTML} from './math-display.js?v=20261113-prose2';

// Small exact examples at the first use of matrix vocabulary. No scientific
// calculation service or course-progress store is used by these optional tasks.
export const MATRIX_BRIDGE_HOOKS=Object.freeze({
 'operations-notation':Object.freeze(['transpose-inverse','determinant-orientation']),
 projection:Object.freeze(['c4-vector-function']),
 'from-point-to-space':Object.freeze(['reciprocal-shear-phase'])
});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gcd(a,b){a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a;}
function q(value){
 if(value&&typeof value==='object'&&typeof value.n==='bigint'&&typeof value.d==='bigint')return value;
 if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Exact examples require an integer or a rational string.');
 const text=String(value);if(!/^[+-]?\d+(?:\/[+-]?\d+)?$/.test(text))throw Error('Invalid exact rational.');
 let[n,d]=text.split('/').map(BigInt);d??=1n;if(d===0n)throw Error('Zero denominator.');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return{n:n/g,d:d/g};
}
const add=(a,b)=>{a=q(a);b=q(b);return q((a.n*b.d+b.n*a.d)+'/'+(a.d*b.d));};
const mul=(a,b)=>{a=q(a);b=q(b);return q((a.n*b.n)+'/'+(a.d*b.d));};
const neg=a=>{a=q(a);return{n:-a.n,d:a.d};};
const sub=(a,b)=>add(a,neg(b));
const div=(a,b)=>{a=q(a);b=q(b);if(!b.n)throw Error('Singular matrix.');return q((a.n*b.d)+'/'+(a.d*b.n));};
const str=a=>{a=q(a);return a.d===1n?String(a.n):a.n+'/'+a.d;};
const num=a=>{a=q(a);return Number(a.n)/Number(a.d);};
const equal=(a,b)=>str(a)===str(b);
const vector=v=>{if(!Array.isArray(v)||v.length!==2)throw Error('A two-component vector is required.');return v.map(q);};
const matrix=a=>{if(!Array.isArray(a)||a.length!==2||a.some(r=>!Array.isArray(r)||r.length!==2))throw Error('A 2 by 2 matrix is required.');return a.map(vector);};
const transpose=a=>[[a[0][0],a[1][0]],[a[0][1],a[1][1]]];
const determinant=a=>sub(mul(a[0][0],a[1][1]),mul(a[0][1],a[1][0]));
const inverse=a=>{const d=determinant(a);return[[div(a[1][1],d),div(neg(a[0][1]),d)],[div(neg(a[1][0]),d),div(a[0][0],d)]];};
const dot=(u,v)=>add(mul(u[0],v[0]),mul(u[1],v[1]));
const apply=(a,v)=>a.map(r=>dot(r,v));
const product=(a,b)=>a.map(r=>transpose(b).map(c=>dot(r,c)));
const rowApply=(v,a)=>transpose(a).map(c=>dot(v,c));
const pullback=(v,a)=>rowApply(v,inverse(a));
const strings=a=>a.map(r=>Array.isArray(r)?strings(r):str(r));
const R=matrix([['3/5','-4/5'],['4/5','3/5']]),S=matrix([[1,1],[0,1]]),M=matrix([[-1,0],[0,1]]),C4=matrix([[0,-1],[1,0]]),I=matrix([[1,0],[0,1]]);
const minus=a=>a.map(row=>row.map(neg));
const sameVector=(a,b)=>a.every((v,n)=>equal(v,b[n]));
const sameMatrix=(a,b)=>a.every((row,n)=>sameVector(row,b[n]));

export const exactBridgeMath=Object.freeze({
 transpose:a=>strings(transpose(matrix(a))),inverse:a=>strings(inverse(matrix(a))),
 product:(a,b)=>strings(product(matrix(a),matrix(b))),apply:(a,v)=>strings(apply(matrix(a),vector(v))),
 determinant:a=>str(determinant(matrix(a))),dot:(a,b)=>str(dot(vector(a),vector(b))),
 pullback:(c,a)=>strings(pullback(vector(c),matrix(a))),
 phaseTurns:(k,t)=>str(dot(vector(k),vector(t)))
});
const scalarTex=a=>{a=q(a);const sign=a.n<0n?'-':'';return a.d===1n?str(a):sign+'\\frac{'+String(a.n<0n?-a.n:a.n)+'}{'+a.d+'}';};
const matTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(scalarTex).join('&')).join('\\\\')+'\\end{pmatrix}';
const vecTex=v=>matTex(v.map(x=>[x]));
const f=tex=>`<span class="mb-inline-math">${mathHTML(tex)}</span>`;
const formula=tex=>`<div class="mb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
function functionTex(c){return[c[0],c[1]].map((a,n)=>{a=q(a);if(!a.n)return'';return(equal(a,1)?'':equal(a,-1)?'-':scalarTex(a))+(n?'y':'x');}).filter(Boolean).join('+').replace(/\+-/g,'-')||'0';}
function phaseTex(turns){
 turns=q(turns);const n=((turns.n%turns.d)+turns.d)%turns.d,v=str(q(n+'/'+turns.d));
 return {'0':'1','1/4':'-i','1/2':'-1','3/4':'i'}[v]??'\\exp(-2\\pi i\\cdot'+scalarTex(turns)+')';
}
const xy=v=>'('+v.map(str).join(', ')+')';
const sources={x:vector([1,0]),general:vector([1,2])};
const defs={
 'transpose-inverse':{
  title:'转置与逆：谁能撤销这个动作？',
  intro:'转置交换矩阵的行和列；逆矩阵撤销动作。在正交笛卡尔基底中，保持长度和内积的矩阵满足转置乘原矩阵等于单位矩阵，所以这时转置恰好等于逆。 计算 CR 的每一列时，先把 R 的这一列当作输入箭头，再用 C 作用于它；不是把两个矩阵逐项相乘。',
  question:'先选择：哪个矩阵能撤销 R 对每个箭头的作用？',
  choices:[['transpose','Rᵀ'],['negative','逐项取负得到 −R'],['repeat','再做一次 R']],answer:'transpose',
  feedback:{transpose:'核对一致：这个 R 的两列长度为1且互相垂直，RᵀR=I。',negative:'取负会把旋转后的箭头整体反向。撤销必须让乘积等于 I；这个例子中 (−R)R≠I。',repeat:'同方向再转一次通常不是撤销。这里 R²≠I，不能只看操作次数。'},
  variantQuestion:'改成剪切 S 后，哪个矩阵能撤销它？',
  variantChoices:[['transpose','Sᵀ'],['inverse','S⁻¹'],['negative','−S']],
  limit:'二维笛卡尔矩阵例。3/5–4/5矩阵是一般正交旋转教学例，不据此假设有限阶，也不将它作为周期晶体允许的旋转操作。剪切用来检验一般代数，不把它当作刚性旋转。90°旋转恰有 −R=R⁻¹，因此这里选用3/5、4/5的旋转来区分取负与求逆。'
 },
 'determinant-orientation':{
  title:'行列式：带方向面积怎样改变？',
  intro:'把单位正方形的两个边箭头变成矩阵的两列。它们张成的平行四边形，其带方向面积就是行列式。绝对值给面积倍数，符号给平面取向。',
  question:'先旋转 R，再关于 y 轴镜像 M。最终带方向面积是多少？',
  choices:[['negative','−1：面积不变，平面取向反转'],['positive','+1：有旋转就保持取向'],['zero','0：镜像把图形压成线']],answer:'negative',
  feedback:{negative:'核对一致：复合操作为 MR，det(MR)=det(M)det(R)=−1。',positive:'旋转保持取向，随后镜像仍会反转取向。应按先后作用的整个复合矩阵判断。',zero:'镜像可逆，仍把平面一一映到平面。投影到直线才会丢失一个方向并得到零面积。'},
  variantQuestion:'改成下面的新操作，怎样描述它的结果？',
  variantChoices:[['stretch','取向保持，面积2倍，可逆'],['project','面积为0，不可逆'],['rotation','面积保持，正交旋转']],
  limit:'这里讨论二维带方向面积。它不能代替三维镜面、反演或晶体手性的完整判定；正行列式本身也不等于刚性旋转。'
 },
 'c4-vector-function':{
  title:'箭头转过去，函数为什么逆代入？',
  intro:'固定坐标轴，主动把原位置转到新位置。新函数图样在新位置应保留旧函数值，因此它读取的是逆向找到的旧位置。',
  question:'将 f(x,y)=x 的图样主动逆时针旋转90°，新函数是什么？',
  choices:[['y','y'],['minus-y','−y'],['minus-x','−x'],['x','x']],answer:'y',
  feedback:{y:'核对一致：逆代入 R⁻¹r=(y,−x)，读取第一分量得到 y。', 'minus-y':'−y 是把 Rr 直接代进旧函数的结果。它把函数图样转向了相反方向，不能保留同一被搬动点的值。','minus-x':'−x 是连续两次90°旋转后的结果。当前只主动旋转了一次。',x:'f=x 的等值线方向会随图样旋转改变，不能默认函数保持不变。'},
  variantQuestion:'加入不对易的镜像后，当前规则的连续作用与乘积操作是否相同？',
  variantChoices:[['same','相同，保持群的乘法次序'],['different','不同，这个规则反转了次序']],
  limit:'二维线性函数与箭头模型；C₄的幂彼此可交换，单用它们会隐藏次序问题，所以变式加入镜像。这不是任意三维轨道表示的自动构造器。'
 },
 'reciprocal-shear-phase':{
  title:'换基不换物理波矢：平移相位怎样保持？',
  intro:'实空间晶格矩阵的列是基矢。同一晶格换成 A′=AP 后，实空间分数坐标和倒空间分数坐标按对偶规则改变；物理向量不变，不代表它的分数坐标不变。',
  question:'剪切换基后，哪组 k′ 与 t′=(−1,2) 保留同一物理波矢和相位？',
  choices:[['transpose','k′=Pᵀk=(1/4,3/8)'],['unchanged','k′仍为(1/4,1/8)'],['forward','k′=Pk=(3/8,1/8)']],answer:'transpose',
  feedback:{transpose:'核对一致：两种坐标的点积都是1/2，所给主动平移的 Bloch 因子同为−1。',unchanged:'同一物理波矢在不同倒格基底中通常有不同分数坐标。保持旧 k 却配新 t′，会错误得到点积0和相位+1。',forward:'实空间和倒空间坐标需要对偶变换。照搬 P 会得到点积−1/8，与原来的1/2不模整数等价。'},
  variantQuestion:'现在改变物理 k，新的平移相位是什么？',
  variantChoices:[['minus-i','−i'],['negative','−1'],['identity','1'],['plus-i','i']],
  limit:'二维整数幺模的同晶格换基，P 不是新增的空间对称操作。这里不包含一般 BC 标准化、非整数换基或超胞。平移相位也不等于孤立态的可测强度。'
 }
};
const select=(id,label,choices,value)=>`<label for="${id}">${label}<select id="${id}">${choices.map(([key,text])=>`<option value="${esc(key)}" ${value===key?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,text,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${text}</button>`;
const row=(label,tex)=>`<div class="mb-result-row"><strong>${label}</strong>${formula(tex)}</div>`;
function arrows(vectors,{polygon=null,title='坐标箭头与操作结果'}={}){
 const all=vectors.flatMap(v=>v.points||[v.vector]),extent=Math.max(2,...all.flatMap(v=>v.map(x=>Math.abs(num(x))))),scale=112/extent;
 const screen=v=>[260+num(v[0])*scale,156-num(v[1])*scale];
 const shaft=(v,index)=>{const[x,y]=screen(v.vector),a=Math.atan2(y-156,x-260),w=9;return `<line x1="260" y1="156" x2="${x}" y2="${y}" stroke="${v.color}" stroke-width="${5-index}" ${index===0?'stroke-dasharray="7 4"':''}/><path d="M${x},${y} L${x-w*Math.cos(a-.45)},${y-w*Math.sin(a-.45)} L${x-w*Math.cos(a+.45)},${y-w*Math.sin(a+.45)} Z" fill="${v.color}"/>`;};
 const poly=polygon?`<polygon points="${polygon.map(v=>screen(v).join(',')).join(' ')}" fill="#dcebe3" stroke="#285d46" stroke-width="2"/>`:'';
 return `<figure class="mb-diagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 290" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><line x1="18" y1="156" x2="502" y2="156" stroke="#b3c3bc"/><line x1="260" y1="14" x2="260" y2="275" stroke="#b3c3bc"/><text x="488" y="148">x</text><text x="270" y="28">y</text>${poly}${vectors.map(shaft).join('')}</svg><figcaption>${vectors.map(v=>`<span><i style="background:${v.color}"></i>${esc(v.label)} ${esc(xy(v.vector))}</span>`).join('')}<small>图形按比例缩放；精确数值见下方。</small></figcaption></figure>`;
}
function scenario(id,state,variant=false){
 if(id==='transpose-inverse'){
  const a=variant?S:R,choice=variant?state.variantChoice:state.choice,candidate=choice==='transpose'?transpose(a):choice==='negative'?minus(a):choice==='repeat'?a:inverse(a),v=sources[state.probe],after=apply(a,v),total=product(candidate,a),back=apply(candidate,after);
  return{a,candidate,v,after,total,back,correct:variant?choice==='inverse':choice==='transpose',tex:'',output:arrows([{label:'原箭头',vector:v,color:'#61788a'},{label:'第一次操作后',vector:after,color:'#b27727'},{label:'再作用候选矩阵后',vector:back,color:'#245e46'}])+row(variant?'剪切矩阵与候选撤销':'旋转矩阵与候选撤销',(variant?'S':'R')+'='+matTex(a)+',\\quad C='+matTex(candidate))+row('按先后作用核对乘积','C'+(variant?'S':'R')+'='+matTex(total))+row('箭头是否复原','v='+vecTex(v)+',\\quad Cv_{\\mathrm{after}}='+vecTex(back)),variantText:'剪切的转置不撤销剪切；求逆仍可撤销。普通转置改变行列位置，只有正交条件才能把它识别为逆。'};
 }
 if(id==='determinant-orientation'){
  const a=variant?(state.variantMode==='project'?matrix([[1,0],[0,0]]):matrix([[2,0],[0,1]])):(state.stage===1?R:product(M,R)),u=apply(a,vector([1,0])),v=apply(a,vector([0,1])),area=determinant(a),polygon=[vector([0,0]),u,u.map((x,n)=>add(x,v[n])),v];
  return{a,area,correct:variant?state.variantChoice===(state.variantMode==='project'?'project':'stretch'):state.choice==='negative',output:arrows([{label:'第一列',vector:u,color:'#b27727'},{label:'第二列',vector:v,color:'#245e46'}],{polygon,title:'两列箭头张成的有向平行四边形'})+row('当前矩阵与带方向面积','A='+matTex(a)+',\\quad\\det A='+scalarTex(area))+row('检验是否正交','A^TA='+matTex(product(transpose(a),a))),variantText:state.variantMode==='project'?'投影面积为0，一个方向丢失，所以没有逆。它与面积为1的镜像不同。':'拉伸的行列式为2：面积2倍且取向保持，但 AᵀA≠I，所以不是保持长度的旋转。'};
 }
 if(id==='c4-vector-function'){
  const source=vector(state.probe==='x'?[1,2]:[2,1]),image=apply(C4,source),c=vector([1,0]),coeff={y:vector([0,1]),'minus-y':vector([0,-1]),'minus-x':vector([-1,0]),x:c}[state.choice]||c;
  if(variant){const forward=state.variantMode==='forward',rule=forward?rowApply:pullback,left=rule(rule(c,M),C4),right=rule(c,product(C4,M));return{left,right,correct:state.variantChoice===(forward?'different':'same'),output:row('先镜像、后旋转的连续作用',(forward?'\\widetilde T':'T')+'(R)'+(forward?'\\widetilde T':'T')+'(M)x='+functionTex(left))+row('直接使用乘积操作 RM',(forward?'\\widetilde T':'T')+'(RM)x='+functionTex(right)),variantText:forward?'前向代入在这个不对易例子中不保持乘法：连续作用得到 y，乘积操作却得到−y。它反转了次序。':'正确逆代入两边都得到−y。原因是 (RM)⁻¹=M⁻¹R⁻¹，恰好与逐次读取旧位置的顺序一致。'};}
  return{source,image,coeff,correct:state.choice==='y',output:arrows([{label:'原位置',vector:source,color:'#61788a'},{label:'主动90°后的新位置',vector:image,color:'#245e46'}])+row('箭头前向作用与函数参数的逆代入','R='+matTex(C4)+',\\quad Rr=\\binom{-y}{x},\\quad R^{-1}r=\\binom{y}{-x}')+row('把你的候选函数放到新位置','f(r_0)='+scalarTex(source[0])+',\\quad f_{\\mathrm{candidate}}='+functionTex(coeff)+',\\quad f_{\\mathrm{candidate}}(Rr_0)='+scalarTex(dot(coeff,image)))+formula('T(R)f(r)=f(R^{-1}r)')};
 }
 const t=vector([1,2]),k=variant?vector(state.variantMode==='gamma'?[0,0]:['1/4',0]):vector(['1/4','1/8']),tp=apply(inverse(S),t),kp=variant?apply(transpose(S),k):(state.choice==='unchanged'?k:apply(state.choice==='forward'?S:transpose(S),k)),old=dot(k,t),changed=dot(kp,tp),physical=apply(transpose(inverse(S)),kp);
 return{t,k,tp,kp,old,changed,physical,correct:variant?state.variantChoice===(state.variantMode==='gamma'?'identity':'minus-i'):state.choice==='transpose',output:row('同一晶格的两套实空间基底','A=I,\\quad P='+matTex(S)+',\\quad A^{\\prime}=AP='+matTex(S))+row('实空间坐标同步改变','t='+vecTex(t)+',\\quad t^{\\prime}=P^{-1}t='+vecTex(tp))+row('倒空间坐标与物理向量','k='+vecTex(k)+',\\quad k^{\\prime}='+vecTex(kp)+',\\quad \\frac{B^{\\prime}}{2\\pi}k^{\\prime}='+vecTex(physical))+row('直接比较点积','k\\cdot t='+scalarTex(old)+',\\quad k^{\\prime}\\cdot t^{\\prime}='+scalarTex(changed))+row('主动平移的相位','e^{-2\\pi i k\\cdot t}='+phaseTex(old)+',\\quad e^{-2\\pi i k^{\\prime}\\cdot t^{\\prime}}='+phaseTex(changed)),variantText:state.variantMode==='gamma'?'Γ点的相位恒为1，单看它不能识别错误的换基公式。请回到非零波矢例子核对两个物理向量。':'更改物理 k 后相位变成−i；换基前后仍一致。改变描述与改变物理输入是两件事。'};
}

// Public reference records are computed from the displayed matrices rather than
// a second hardcoded answer table; all scalars are returned as rational strings.
export function matrixBridgeReference(id,{choice,probe='x',variant=false,variantChoice,variantMode,stage=2}={}){
 if(!Object.hasOwn(defs,id))throw Error('Unknown matrix bridge');
 const state={choice:choice||defs[id].answer,probe,variantChoice:variantChoice||({ 'transpose-inverse':'inverse','determinant-orientation':'stretch','c4-vector-function':'same','reciprocal-shear-phase':'minus-i'}[id]),variantMode:variantMode||({'determinant-orientation':'stretch','c4-vector-function':'inverse','reciprocal-shear-phase':'changed'}[id]),stage};
 const result=scenario(id,state,variant),plain={correct:result.correct};
 for(const [key,value] of Object.entries(result))if(Array.isArray(value))plain[key]=strings(value);else if(value&&typeof value==='object'&&'n'in value)plain[key]=str(value);
 return plain;
}
function bodyHTML(id,state){
 const def=defs[id],prefix='mb-'+id,mainReady=state.observed&&(id!=='determinant-orientation'||state.stage===2),main=state.observed?scenario(id,state):null,variant=state.variantObserved?scenario(id,state,true):null;
 const probe=id==='transpose-inverse'?select(prefix+'-probe','跟踪哪支箭头？',[['x','(1,0)'],['general','(1,2)']],state.probe):id==='c4-vector-function'?select(prefix+'-probe','跟踪哪一个原位置？',[['x','(1,2)'],['general','(2,1)']],state.probe):'';
 const variants=id==='determinant-orientation'?select(prefix+'-mode','变式操作',[['stretch','拉伸 diag(2,1)'],['project','投影 diag(1,0)']],state.variantMode):id==='c4-vector-function'?select(prefix+'-mode','比较哪一种函数规则？',[['inverse','正确逆代入 f(R⁻¹r)'],['forward','错误前向代入 f(Rr)，用于对照']],state.variantMode):id==='reciprocal-shear-phase'?select(prefix+'-mode','改用哪个物理波矢？',[['changed','k=(1/4,0)'],['gamma','Γ点 k=(0,0)']],state.variantMode):'';
 return `<p>${def.intro}</p><p class="mb-convention">主动作用于列向量；AB 表示先 B 后 A。先作预测，再显示操作。</p>${id==='transpose-inverse'?formula('R='+matTex(R)):id==='determinant-orientation'?formula('A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix},\\quad\\det A=ad-bc')+formula('R='+matTex(R)+',\\quad M='+matTex(M)):id==='reciprocal-shear-phase'?formula('A^{\\prime}=AP,\\quad t^{\\prime}=P^{-1}t,\\quad k^{\\prime}=P^Tk'):''}<div class="mb-controls">${probe}${select(prefix+'-choice',def.question,[['','先选择你的预测'],...def.choices],state.choice)}${button(prefix+'-run',id==='determinant-orientation'?(state.stage===0?'显示第1步：旋转 R':state.stage===1?'显示第2步：镜像 M':'两步操作已显示'):'显示这次操作',!state.choice||(id==='determinant-orientation'&&state.stage===2))}${button(prefix+'-check','核对预测',!mainReady)}</div><div class="mb-observation" aria-live="polite">${main?main.output:'<p class="mb-await">选择预测后显示操作，精确矩阵和坐标会在这里出现。</p>'}</div><p id="${prefix}-feedback" class="mb-feedback ${state.checked&&main?.correct?'mb-success':''}" role="status">${state.checked?esc(def.feedback[state.choice]):''}</p><details class="mb-variant" ${state.variantOpen?'open':''}><summary>改变一个条件，再检验一次</summary><div class="mb-controls">${variants}${select(prefix+'-variant-choice',def.variantQuestion,[['','先选择变式预测'],...def.variantChoices],state.variantChoice)}${button(prefix+'-variant-run','显示变式对照',!state.variantChoice)}${button(prefix+'-variant-check','核对变式',!state.variantObserved)}</div>${id==='transpose-inverse'?formula('S='+matTex(S)):''}<div class="mb-observation">${variant?variant.output:''}</div><p id="${prefix}-variant-feedback" class="mb-feedback ${state.variantChecked&&variant?.correct?'mb-success':''}" role="status">${state.variantChecked?(variant.correct?'变式核对一致。':'这个变式还需重新核对。')+' '+esc(variant.variantText):''}</p></details><p class="mb-boundary">${esc(def.limit)}</p><p class="mb-record-note">这里记录本次核对；不计入课程掌握进度，也不限制后续入口。</p>${button(prefix+'-reset','重新开始这个小实验')}`;
}
export function matrixBridgeHTML(lessonId){
 const ids=Object.hasOwn(MATRIX_BRIDGE_HOOKS,lessonId)?MATRIX_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="mb-course-bridges" aria-label="可选的矩阵概念桥接"><p class="mb-optional">矩阵术语不熟？可以展开下面的小实验，完成后继续原课；已有基础可直接略过。</p>${ids.map(id=>`<details class="mb-bridge" data-mb-bridge="${id}"><summary>${defs[id].title}</summary><div class="mb-body" data-mb-body="${id}"></div></details>`).join('')}</section>`:'';
}
export function bindMatrixBridge({root,lessonId,isCurrent=()=>true}={}){
 if(!root?.querySelectorAll)return()=>{};let alive=true;const ids=Object.hasOwn(MATRIX_BRIDGE_HOOKS,lessonId)?MATRIX_BRIDGE_HOOKS[lessonId]:[];
 for(const id of ids){
  const panel=root.querySelector(`[data-mb-bridge="${id}"]`),body=panel?.querySelector(`[data-mb-body="${id}"]`);if(!body)continue;
  let state={choice:'',probe:'x',observed:false,checked:false,stage:0,variantChoice:'',variantMode:({'determinant-orientation':'stretch','c4-vector-function':'inverse','reciprocal-shear-phase':'changed'}[id])||'',variantObserved:false,variantChecked:false,variantOpen:false};
  const active=()=>alive&&isCurrent()&&root.isConnected!==false&&root.querySelector(`[data-mb-bridge="${id}"]`)===panel;
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(id,state);const $=suffix=>body.querySelector('#mb-'+id+'-'+suffix);
   const variantDetails=body.querySelector('.mb-variant');
   const readOpen=detail=>typeof detail?.open==='boolean'?detail.open:detail?.getAttribute('open')!==null;
   variantDetails.ontoggle=()=>{if(active()&&body.querySelector('.mb-variant')===variantDetails)state.variantOpen=readOpen(variantDetails);};
   function bind(suffix,event,action){const control=$(suffix);if(control)control[event]=()=>{if(!active()||$(suffix)!==control||control.disabled)return;state.variantOpen=readOpen(body.querySelector('.mb-variant'));action(control);draw();const next=suffix==='reset'?$('choice'):suffix==='run'&&$('run')?.disabled?$('check'):$(suffix);next?.focus?.({preventScroll:true});};}
   bind('choice','onchange',c=>{state.choice=c.value;state.observed=false;state.checked=false;state.stage=0;});
   bind('probe','onchange',c=>{state.probe=c.value;state.observed=false;state.checked=false;state.stage=0;state.variantObserved=false;state.variantChecked=false;});
   bind('run','onclick',()=>{state.observed=true;state.stage=Math.min(2,state.stage+1);state.checked=false;});
   bind('check','onclick',()=>{state.checked=true;});
   bind('mode','onchange',c=>{state.variantMode=c.value;state.variantChoice='';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-choice','onchange',c=>{state.variantChoice=c.value;state.variantObserved=false;state.variantChecked=false;});
   bind('variant-run','onclick',()=>{state.variantObserved=true;state.variantChecked=false;});
   bind('variant-check','onclick',()=>{state.variantChecked=true;});
   bind('reset','onclick',()=>{state={...state,choice:'',observed:false,checked:false,stage:0,variantChoice:'',variantObserved:false,variantChecked:false,variantOpen:false};});
  }
  draw();
 }
 return()=>{alive=false;};
}
