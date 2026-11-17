import {mathHTML} from './math-display.js?v=20261113-prose2';
import {GEOMETRY_ACTIONS_REFERENCE as REFERENCE} from './geometry-actions-reference.js?v=20261117-phonopy1';

// Bounded algebra for one declared SSH reference. This is not a new solver.
export const GEOMETRY_ACTIONS_BRIDGE_HOOKS=Object.freeze({'geometry-rays':Object.freeze(['ket-projector-distance'])});
const OWNERS=new WeakMap(),clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>Math.abs(value)<5e-14?'0':Number(value.toPrecision(7)).toString();
const zfmt=([a,b])=>Math.abs(b)<5e-12?fmt(a):Math.abs(a)<5e-12?fmt(b)+'i':fmt(a)+(b<0?' − ':' + ')+fmt(Math.abs(b))+'i';
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],conj=a=>[a[0],-a[1]],scale=(a,n)=>[a[0]*n,a[1]*n];
const norm=a=>a.reduce((s,z)=>s+z[0]**2+z[1]**2,0),inner=(a,b)=>a.reduce((s,z,i)=>add(s,mul(conj(z),b[i])),[0,0]);
const outer=a=>a.map(z=>a.map(w=>mul(z,conj(w))));
const matvec=(a,v)=>a.map(row=>row.reduce((s,z,i)=>add(s,mul(z,v[i])),[0,0]));
const subtract=(a,b)=>a.map((z,i)=>add(z,scale(b[i],-1)));
const formula=value=>`<div class="gab-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const table=(caption,heads,rows)=>`<div class="gab-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>(i?'<td>':'<th scope="row">')+x+(i?'</td>':'</th>')).join('')+'</tr>').join('')}</tbody></table></div>`;
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([v,text])=>`<option value="${v}"${String(v)===String(value)?' selected':''}>${text}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button type="button" id="${id}"${disabled?' disabled':''}>${label}</button>`;
function allowed(value,values,label){if(!values.includes(value))throw Error('Unsupported fixed SSH '+label+'.');return value;}
const parameters=({k=0,strength=2,delta=.1}={})=>({k:allowed(k,REFERENCE.bases,'base momentum'),strength:allowed(strength,REFERENCE.strengths,'gauge strength'),delta:allowed(delta,REFERENCE.deltas,'separation')});
const selection=(p,delta=0)=>REFERENCE.selections.find(row=>row.base===p.k&&row.strength===p.strength&&row.delta===delta);

/** The ket and neighbor are saved, independent production-API selections.
 * Derivatives below use the explicitly smooth representative (-1,exp(ik))/√2,
 * verified against those selected eigenvectors on this finite positive-k grid.
 */
export function geometryActionsReference(values={}){
 const p=parameters(values),base=selection(p),neighbor=selection(p,p.delta),u=clone(base.selection.eigenvector),v=clone(base.selection.transformedEigenvector);
 const alpha=base.selection.phase,slope=p.strength*(Math.cos(p.k)-.74*Math.sin(2*p.k)),phase=[Math.cos(alpha),Math.sin(alpha)];
 const du=[[0,0],scale([-Math.sin(p.k),Math.cos(p.k)],1/Math.sqrt(2))];
 const phaseDirection=u.map(z=>mul([0,slope],z));
 const derivative=du.map((z,i)=>mul(phase,add(z,phaseDirection[i]))),P=outer(v),along=matvec(P,derivative),projected=subtract(derivative,along);
 const pd=[[ [0,0],[.5*Math.sin(p.k),.5*Math.cos(p.k)] ],[ [.5*Math.sin(p.k),-.5*Math.cos(p.k)],[0,0] ]];
 const overlap=inner(v,neighbor.selection.transformedEigenvector),fidelity=overlap[0]**2+overlap[1]**2,distance=1-fidelity,approximation=.25*p.delta**2;
 const neighborP=neighbor.selection.projector,baseP=base.selection.projector;
 const finiteDifference=neighborP.map((row,i)=>row.map((z,j)=>scale(add(z,scale(baseP[i][j],-1)),1/p.delta)));
 let finiteMetric=0;for(let i=0;i<2;i++)for(let j=0;j<2;j++)finiteMetric+=mul(finiteDifference[i][j],finiteDifference[j][i])[0]/2;
 return{...p,base:clone(base),neighbor:clone(neighbor),u,v,bra:v.map(conj),P,alpha,slope,derivative,along,projected,projectorDerivative:pd,
  ordinaryNorm:norm(derivative),parallelNorm:norm(along),metric:norm(projected),connection:-inner(v,derivative)[1],
  overlap,fidelity,distance,approximation,absoluteError:Math.abs(distance-approximation),relativeError:Math.abs(distance-approximation)/distance,
  finiteDifference,finiteMetric};
}

/** Complete supported input. Teaching Δk is deliberately not a core field. */
export function geometryActionsLabRequest(values={}){
 const p=parameters(values);return{action:'quantum_geometry_lab',module:'geometry',input:clone(selection(p).input)};
}

const checks=[
 {prompt:'把整列 ket 乘上 eⁱᵅ 后，bra 应该怎样变化？',answer:'conjugate',rows:[['same','bra 也乘 eⁱᵅ'],['conjugate','bra 乘 e⁻ⁱᵅ，投影的四项保持不变'],['one','只给第一个分量加相位']],feedback:{
  same:'bra 是 ket 的共轭转置，必须同时复共轭相位；同向乘法会错误地留下 e²ⁱᵅ。',
  conjugate:'正确。每一项都是 vᵢvⱼ*，相位因子 eⁱᵅe⁻ⁱᵅ=1。',
  one:'只改一个轨道分量的相位会改变相对相位；在固定轨道基底中，它通常改变投影和物理态。'}},
 {prompt:'规范相位依赖 k 时，哪一个量在本例中始终等于 1/4？',answer:'projected',rows:[['raw','普通导数的模平方'],['projected','去掉沿态方向后的导数模平方'],['connection','Berry 联络 A']],feedback:{
  raw:'普通导数包含 iα′u 的沿态分量；其模平方为 1/2+α′+(α′)²，随规范改变。',
  projected:'正确。(1−P) 消去沿态方向；剩余向量只多一个总相位，模平方仍为 1/4。',
  connection:'本页使用 A=i⟨u|∂u⟩；联络为 −1/2−α′，它随规范改变。'}},
 {prompt:'把 Δk 从 0.02 放大到 2 后，能否仍把 1−F 当成 g(Δk)² 的精确等式？',answer:'limit',rows:[['exact','能，因为 g 一直是 1/4'],['limit','不能；这是小间隔近似，有限间隔应直接收缩两态'],['gauge','不能，因为保真度依赖总相位']],feedback:{
  exact:'度规恒定不意味着有限距离严格二次。本例精确结果为 sin²(Δk/2)，高阶项在大间隔时明显。',
  limit:'正确。比较误差列：1−F=sin²(Δk/2)，而 g(Δk)²=(Δk)²/4；两者在 Δk→0 时才一致。',
  gauge:'保真度取重叠的模平方，两个选点各自的总相位都会消掉。差异来自有限间隔的高阶项。'}}
];
const initial=()=>({open:false,proofOpen:false,referenceOpen:false,k:0,strength:2,delta:.1,step:0,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){const state=initial();if(!saved||typeof saved!=='object')return state;for(const name of ['open','proofOpen','referenceOpen'])state[name]=saved[name]===true;for(const[name,list]of [['k',REFERENCE.bases],['strength',REFERENCE.strengths],['delta',REFERENCE.deltas]])if(list.includes(saved[name]))state[name]=saved[name];state.step=Number.isInteger(saved.step)?Math.max(0,Math.min(4,saved.step)):0;state.note=typeof saved.note==='string'?saved.note.slice(0,2000):'';for(let i=0;i<3;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}return state;}
function actionHTML(state){
 const r=geometryActionsReference(state),rows=[['v₁',zfmt(r.v[0]),state.step>=1?zfmt(r.bra[0]):'—'],['v₂',zfmt(r.v[1]),state.step>=1?zfmt(r.bra[1]):'—']];
 let html=formula('u(k)=\\frac{1}{\\sqrt2}\\begin{pmatrix}-1\\\\e^{ik}\\end{pmatrix},\\qquad v=e^{i\\alpha(k)}u')+
  table('当前 API 选点的两分量；右列取复共轭',['分量','ket v','bra v† 的对应项'],rows);
 if(state.step===0)return html+'<p>先读两项 ket，再展开下一步：把列向量转成行向量并对每项取复共轭。</p>';
 html+=formula('\\langle v\\rvert=(v_1^*,v_2^*),\\qquad\\langle v|v\\rangle=1');
 if(state.step>=2)html+=table('四次乘法，行来自 ket，列来自 bra',['位置','乘法','结果'],[[ 'P₁₁','('+zfmt(r.v[0])+') × ('+zfmt(r.bra[0])+')',zfmt(r.P[0][0])],[ 'P₁₂','('+zfmt(r.v[0])+') × ('+zfmt(r.bra[1])+')',zfmt(r.P[0][1])],[ 'P₂₁','('+zfmt(r.v[1])+') × ('+zfmt(r.bra[0])+')',zfmt(r.P[1][0])],[ 'P₂₂','('+zfmt(r.v[1])+') × ('+zfmt(r.bra[1])+')',zfmt(r.P[1][1])]]);
 if(state.step>=3)html+=formula('P=|v\\rangle\\langle v|=\\frac12\\begin{pmatrix}1&-e^{-ik}\\\\-e^{ik}&1\\end{pmatrix}')+'<p>换规范强度再看四项：ket 与 bra 的数值改变，P 的四项不变。P²=P、Tr P=1；这是一条态射线的秩一投影。</p>';
 if(state.step>=4)html+=formula('P(i\\alpha\'v)=i\\alpha\'v,\\qquad(1-P)(i\\alpha\'v)=0')+'<p>最后一步把同一个投影用于导数：沿态的纯相位方向被完全消去。继续看下面的导数分账。</p>';
 return html;
}
function derivativesHTML(state){
 const r=geometryActionsReference(state);
 return formula('\\alpha(k)=s(\\sin k+0.37\\cos2k)')+
  formula('\\alpha\'(k)=s(\\cos k-0.74\\sin2k)='+fmt(r.slope))+
  '<p>这是原计算包的同一条 k 依赖规范；只在一个 k 上改一个常数相位，不能单独确定相位导数。</p>'+
  formula('\\partial_k v=e^{i\\alpha}(\\partial_k u+i\\alpha\'u)')+
  table('把当前导数分成沿态与垂直态两部分',['分量','∂ₖv','P∂ₖv','(1−P)∂ₖv'],[0,1].map(i=>['分量 '+(i+1),zfmt(r.derivative[i]),zfmt(r.along[i]),zfmt(r.projected[i])]))+
  table('模平方与联络：只有投影后的结果是本页度规',['量','当前值'],[['普通导数 ‖∂ₖv‖²',fmt(r.ordinaryNorm)],['沿态部分 ‖P∂ₖv‖²',fmt(r.parallelNorm)],['gₖₖ = ‖(1−P)∂ₖv‖²',fmt(r.metric)],['A = i⟨v|∂ₖv⟩',fmt(r.connection)]])+
  formula('g_{kk}=\\frac12\\operatorname{Tr}[(\\partial_kP)^2]=\\frac14')+
  '<p>这里的导数来自本页写明的光滑代表 u(k)，并与固定参考网格的 API 本征矢逐项核对。一般 eigensolver 在相邻点可能任意跳相，直接差分原始 ket 不能代替规范无关度规。</p>';
}
function distanceHTML(state){
 const r=geometryActionsReference(state);
 return table('两个保存的真实 API 选点；邻点使用自己的 α(k+Δk)',['选点','k / rad','α / rad','ket 第一项','ket 第二项'],[['基点',fmt(r.k),fmt(r.alpha),zfmt(r.v[0]),zfmt(r.v[1])],['邻点',fmt(r.neighbor.selection.kx),fmt(r.neighbor.selection.phase),...r.neighbor.selection.transformedEigenvector.map(zfmt)]])+
  formula('\\langle v(k)|v(k+\\Delta k)\\rangle='+zfmt(r.overlap))+
  formula('F=|\\langle v(k)|v(k+\\Delta k)\\rangle|^2='+fmt(r.fidelity))+
  table('有限间隔与微分近似分别记账',['比较量','数值'],[['精确有限值 1−F',fmt(r.distance)],['微分近似 g(Δk)²',fmt(r.approximation)],['绝对差',fmt(r.absoluteError)],['相对差 |近似−精确|/(1−F)',fmt(100*r.relativeError)+'%'],['有限差分 ½Tr[((P₂−P₁)/Δk)²]',fmt(r.finiteMetric)],['微分度规 gₖₖ',fmt(r.metric)]])+
  formula('1-F=\\sin^2(\\Delta k/2)=\\frac{(\\Delta k)^2}{4}+O((\\Delta k)^4)')+
  '<p>Δk→0 时，(1−F)/(Δk)² 和投影有限差分都趋向 1/4；有限 Δk 下它们是差分比较量。选择 Δk=2 看明显反例，再切到 0.02 看近似恢复。能隙始终为 2，因此这里没有闭隙造成的不可微问题。</p>';
}
function proofHTML(){return '<p>固定周期轨道基底，晶格常数取 1，所以 k 与 Δk 用 rad。H 的非对角元是 e⁻ⁱᵏ、eⁱᵏ，下带能量为 −1。两项归一化振幅为 (−1,eⁱᵏ)/√2。</p>'+formula('\\partial_k u=\\frac1{\\sqrt2}\\begin{pmatrix}0\\\\ie^{ik}\\end{pmatrix},\\quad\\langle u|\\partial_k u\\rangle=\\frac i2')+formula('\\|(1-P)\\partial_k v\\|^2=\\|\\partial_k v\\|^2-|\\langle v|\\partial_k v\\rangle|^2')+formula('=\\left[\\frac12+\\alpha\'+(\\alpha\')^2\\right]-\\left[\\frac12+\\alpha\'\\right]^2=\\frac14')+'<p>这里改变的是同一固定轨道基底内本征矢的总相位。换轨道嵌入、晶胞约定或相对轨道相位属于另一种比较，不能套用这里的四项不变结论。</p>';
}
function questionHTML(prefix,state,i){const q=checks[i];return `<section class="gab-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+i,'先作出预测',[['','请选择'],...q.rows],state.choices[i])}${button(prefix+'-check'+i,'核对并解释',!state.choices[i])}<p id="${prefix}-feedback${i}" class="gab-feedback" role="status"></p></section>`;}
function bodyHTML(prefix,state,canCopy){return '<p class="gab-scope">固定 SSH 参考：t₁=0、t₂=1，周期轨道基底，下带、能隙 2。这里的两分量是轨道振幅，不是两个自旋方向。局部操作使用保存的真实 Python API 选点；只展开这个有限例子的代数。</p>'+
 `<section class="gab-stage"><h3>1 · 从 ket 到 bra，再算四项投影</h3><div class="gab-controls">${select(prefix+'-k','基点 k / rad',[[0,'0'],[.6,'0.6']],state.k)}${select(prefix+'-strength','原模型的规范强度 s',[[0,'0'],[2,'2'],[4,'4']],state.strength)}</div>${button(prefix+'-step','展开下一步')}<div id="${prefix}-action">${actionHTML(state)}</div></section>`+
 `<section class="gab-stage"><h3>2 · 把导数中的纯相位方向投影掉</h3><div id="${prefix}-derivatives">${derivativesHTML(state)}</div><details data-gab-native="proof" class="gab-reference"${state.proofOpen?' open':''}><summary>展开光滑代表、规范约定与 1/4 的推导</summary>${proofHTML()}</details></section>`+
 `<section class="gab-stage"><h3>3 · 用两个真实选点核对小间隔保真度</h3><div class="gab-controls">${select(prefix+'-delta','教学比较间隔 Δk / rad',[[.02,'0.02'],[.1,'0.1'],[.5,'0.5'],[2,'2 · 有限间隔反例']],state.delta)}</div><div id="${prefix}-distance">${distanceHTML(state)}</div></section>`+
 `<section class="gab-stage"><h3>4 · 先预测，再解释</h3>${checks.map((_q,i)=>questionHTML(prefix,state,i)).join('')}</section>`+
 `<section class="gab-stage"><h3>5 · 回到完整 Python 实验核验</h3>${canCopy?button(prefix+'-copy','复制当前基点与规范到原实验'):'<a href="#compute/quantum-geometry-lab?preset=geometry-ssh-topological">打开原有量子几何实验 →</a><p>普通链接只打开原预设；请手动设置 t₁=0、t₂=1 和本卡基点后计算。</p>'}<p>复制完整受支持的 SSH 输入：t₁=0、t₂=1、当前 k 与 s、mesh=9、pathSamples=31；其余支持字段也一并填写。复制后请手动点击运行。Δk、预测和笔记不传入计算核心；邻点在本卡中单独保存，不会伪装成原实验的输入功能。</p><p id="${prefix}-copy-status" class="gab-feedback" role="status"></p><details class="gab-reference" data-gab-native="reference"${state.referenceOpen?' open':''}><summary>真实参考数据的来源与复现方式</summary><p>本卡保存 30 次 quantum_geometry_lab 的选点输出，包含基点、邻点、变相位本征矢、投影和 gₖₖ。数据由 scripts/check-geometry-actions-reference.py --write 生成，sourceHashes 记录 Python 源文件 SHA-256；独立检查还核对本征方程、四项投影和有限差分。</p><p data-math-ignore>dist/geometry-actions-reference.js</p></details></section>`+
 `<label class="gab-note" for="${prefix}-note">${'写一句自己的解释（仅保存在当前页面内存）'}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset','重置这张操作卡')}`;
}

export function geometryActionsBridgeHTML(lessonId){if(!GEOMETRY_ACTIONS_BRIDGE_HOOKS[lessonId])return '';return '<section class="gab-prerequisite" aria-label="可选的态投影与量子距离操作卡"><p>展开一个固定 SSH 例子，把两个复振幅、四项投影、规范导数和两点距离逐步接起来。</p><details class="gab-bridge" data-gab-bridge="ket-projector-distance"><summary>同一个态换相位，为何距离不变？</summary><div class="gab-body" data-gab-body="ket-projector-distance"></div></details></section>';}

export function bindGeometryActionsBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const supported=!!GEOMETRY_ACTIONS_BRIDGE_HOOKS[lessonId],store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':ket-projector-distance';
 const detail=supported?root?.querySelector?.('[data-gab-bridge="ket-projector-distance"]'):null,body=supported?root?.querySelector?.('[data-gab-body="ket-projector-distance"]'):null;
 const state=restored(store.get(key)),prefix='gab-'+lessonId,owner={},bindings=[];let alive=true,busy=false,ticket=0;
 if(detail)OWNERS.set(detail,owner);
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const active=()=>alive&&!!detail&&!!body&&OWNERS.get(detail)===owner&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-gab-bridge="ket-projector-distance"]')===detail&&root.querySelector('[data-gab-body="ket-projector-distance"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(active())store.set(key,clone(state));};
 const capture=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['proof','proofOpen'],['reference','referenceOpen']]){const native=body.querySelector('[data-gab-native="'+name+'"]');if(native)state[field]=readOpen(native);}for(const[name,list]of [['k',REFERENCE.bases],['strength',REFERENCE.strengths],['delta',REFERENCE.deltas]]){const node=$(name);if(node&&node.value!==''&&list.includes(Number(node.value)))state[name]=Number(node.value);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||checks[i].rows.some(([id])=>id===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}save();};
 const attach=(node,event,fn)=>{if(node){node[event]=fn;bindings.push([node,event,fn]);}};
 const bind=(name,event,action)=>{const node=$(name);attach(node,event,()=>{if(!active()||$(name)!==node||node.disabled)return;capture();action(node);save();});};
 const paintQuestion=i=>{const q=checks[i],choice=state.choices[i],checked=state.checked[i]&&choice,node=$('feedback'+i);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','gab-feedback'+(checked&&choice===q.answer?' gab-correct':''));}if($('check'+i))$('check'+i).disabled=!choice;};
 const paint=()=>{if(!active())return;for(const[name,render]of [['action',actionHTML],['derivatives',derivativesHTML],['distance',distanceHTML]])if($(name))$(name).innerHTML=render(state);if($('step'))$('step').textContent=state.step>=4?'从 ket 重新回放':'展开下一步';for(let i=0;i<3;i++)paintQuestion(i);};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 function draw(){
  if(!active())return;body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');
  for(const[name,field]of [['proof','proofOpen'],['reference','referenceOpen']]){const native=body.querySelector('[data-gab-native="'+name+'"]');if(native){native.open=state[field];attach(native,'ontoggle',()=>{if(active()&&body.querySelector('[data-gab-native="'+name+'"]')===native){state[field]=readOpen(native);save();}});}}
  for(const name of ['k','strength','delta'])bind(name,'onchange',()=>{clearCopy();paint();});
  bind('step','onclick',()=>{state.step=state.step>=4?0:state.step+1;paint();});
  for(let i=0;i<3;i++){bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});paintQuestion(i);}
  bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
  bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});clearCopy();draw();$('k')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy){copy.disabled=busy;attach(copy,'onclick',async()=>{
   if(!active()||$('copy')!==copy||busy||copy.disabled)return;capture();const request=geometryActionsLabRequest(state),id=++ticket;busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
   try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error('输入暂未复制，请重试。');if(active()&&$('copy')===copy&&ticket===id){state.copyOutcome='success';$('copy-status').textContent='完整输入已复制；请在原实验中手动运行。';save();}}
   catch(_error){if(active()&&$('copy')===copy&&ticket===id){state.copyOutcome='error';state.copyError='输入暂未复制，请重试。';$('copy-status').textContent=state.copyError;save();}}
   finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
  });}
  paint();save();
 }
 if(detail&&body){detail.open=state.open;if(state.open)detail.setAttribute('open','');attach(detail,'ontoggle',()=>{if(active()){state.open=readOpen(detail);save();}});draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;for(const[node,event,fn]of bindings)if(node[event]===fn)node[event]=null;if(detail&&OWNERS.get(detail)===owner)OWNERS.delete(detail);};
 cleanup.snapshot=()=>{capture();return supported?{'ket-projector-distance':clone(state)}:{};};return cleanup;
}
