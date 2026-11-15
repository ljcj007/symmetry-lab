import {mathHTML} from './math-display.js?v=20261113-prose2';
import {SYMMETRY_OPERATOR_REFERENCE} from './symmetry-operator-reference.js?v=20261115-derivations1';

export const SYMMETRY_OPERATOR_BRIDGE_HOOKS=Object.freeze({
 'exchange-bond-constraints':Object.freeze(['bond-operation']),
 'conservation-generators':Object.freeze(['commutator-ledger'])
});
// Only these eight captured requests are supported. The actual Python cores
// remain responsible for arbitrary supported laboratory inputs and projection.
const clone=x=>JSON.parse(JSON.stringify(x)),records=clone(SYMMETRY_OPERATOR_REFERENCE.records),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const choose=(v,values)=>{if(!values.includes(v))throw Error('Unknown finite operator reference.');return v;};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-12?'0':Number(x.toFixed(8)).toString();
const tr=a=>a[0].map((_,j)=>a.map(row=>row[j])),mv=(a,v)=>a.map(row=>row.reduce((s,x,i)=>s+x*v[i],0)),mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,x,k)=>s+x*b[k][j],0)));
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}',vector=v=>matrix(v.map(x=>[x]));
const ctex=([re,im])=>Math.abs(im)<1e-12?fmt(re):Math.abs(re)<1e-12?fmt(im)+'i':fmt(re)+(im<0?'':'+')+fmt(im)+'i';
const cmatrix=a=>'\\begin{pmatrix}'+a.re.map((row,i)=>row.map((x,j)=>ctex([x,a.im[i][j]])).join('&')).join('\\\\')+'\\end{pmatrix}';
const formula=s=>'<div class="sob-formula" tabindex="0">'+mathHTML(s,true)+'</div>',inline=s=>mathHTML(s),p=s=>'<p>'+esc(s)+'</p>',h=s=>'<h4>'+esc(s)+'</h4>';
const table=(caption,headers,rows)=>'<div class="sob-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const operationNames={mirrorXY:'包含键的 xy 镜面',inversion:'键中心反演',mirrorYZ:'垂直键的 yz 镜面'};
const exchangeOptions=[['mirror','先只保留 xy 镜面'],['inversion','只保留反演；关闭镜面'],['combined','反演与 xy 镜面共同约束'],['perpendicular','反例：垂直键的 yz 镜面']];
const conservationOptions=[['su2','各向同性：观察 Sx'],['xxz-sx','XXZ：观察 Sx 破缺'],['xxz-sz','同一个 XXZ：观察 Sz 保留'],['xyz','反例：XYZ 与主动 π 旋转']];
const componentOptions=[['xy','Jxy'],['xz','Jxz'],['yz','Jyz']];

export function bondOperatorReference({case:kind='mirror',operation,component='xz'}={}){
 choose(kind,exchangeOptions.map(([id])=>id));choose(component,componentOptions.map(([id])=>id));
 const record=clone(records[kind]),r=record.result,op=r.constraints.find(row=>row.id===(operation??r.constraints[0].id));if(!op)throw Error('Operation does not belong to this fixed reference.');
 const a=op.axialMatrix,raw=r.inputTensor,action=mm(mm(tr(a),op.swapsSites?tr(raw):raw),a),i='xyz'.indexOf(component[0]),j='xyz'.indexOf(component[1]),factor=a[i][i]*a[j][j],source=op.swapsSites?[j,i]:[i,j];
 return{record,operation:op,positions:[[-.5,0,0],[.5,0,0]],images:[[-.5,0,0],[.5,0,0]].map(v=>mv(op.polarMatrix,v)),action,component:{name:component,i,j,factor,source,sourceName:'xyz'[source[0]]+'xyz'[source[1]],raw:raw[i][j],sourceValue:raw[source[0]][source[1]],transformed:action[i][j],projected:r.tensor[i][j]},allowedDimension:9-r.rank};
}
const spinProducts={
 jx:[[0,0,0,.25],[0,0,.25,0],[0,.25,0,0],[.25,0,0,0]],
 jy:[[0,0,0,-.25],[0,0,.25,0],[0,.25,0,0],[-.25,0,0,0]],
 jz:[[.25,0,0,0],[0,-.25,0,0],[0,0,-.25,0],[0,0,0,.25]]
};
export function generatorOperatorReference({case:kind='su2',row='0',col='1',mode='commutator'}={}){
 choose(kind,conservationOptions.map(([id])=>id));choose(mode,['commutator','adjoint']);
 const i=Number(row),j=Number(col);if(!Number.isInteger(i)||!Number.isInteger(j)||i<0||j<0||i>3||j>3)throw Error('Matrix cell must be in the declared four-state basis.');
 const record=clone(records[kind]),r=record.result,proof=r.selectedProof,q=proof.operator.re;
 const parts=proof.contributions.filter(x=>own(spinProducts,x.term)).map(part=>{
  const term=spinProducts[part.term].map(row=>row.map(v=>v*part.coefficient)),left=mm(term,q),right=mm(q,term),entry=mode==='commutator'?[left[i][j]-right[i][j],0]:[0,left[i][j]-right[i][j]];
  return{...part,matrix:part[mode],left:mode==='commutator'?[left[i][j],0]:[0,left[i][j]],right:mode==='commutator'?[right[i][j],0]:[0,right[i][j]],entry};
 });
 const h0=r.hamiltonian.re,pi=[[-1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,-1]],hp=mm(h0,pi),ph=mm(pi,h0),piResidual=Math.hypot(...hp.flatMap((row,i)=>row.map((v,j)=>v-ph[i][j])));
 return{record,row:i,col:j,mode,parts,matrix:proof[mode],sumOfNorms:parts.reduce((s,x)=>s+x.norm,0),normOfSum:proof.hamiltonianNorm,pi,piResidual,selectedEntry:[proof[mode].re[i][j],proof[mode].im[i][j]]};
}
export function symmetryOperatorLabRequest(lessonId,state={}){
 const keys=lessonId==='exchange-bond-constraints'?exchangeOptions:lessonId==='conservation-generators'?conservationOptions:null;if(!keys)throw Error('Unknown operator lesson.');
 const kind=state.case??keys[0][0];choose(kind,keys.map(([id])=>id));const r=records[kind];return{action:r.action,module:r.module,input:clone(r.input)};
}
const questions={
 'exchange-bond-constraints':[
  {prompt:'先预测：只保留包含 x 向键的 xy 镜面，输入 D=(0.3,0.4,0.6) 后哪些分量能保留？',answer:'normal',options:[['normal','只有 Dz；它垂直镜面'],['plane','Dx、Dy；它们位于镜面内'],['none','所有交换都消失']],feedback:{normal:'正确。轴向矩阵 A=diag(−1,−1,1)，端点不交换，允许 D=(0,0,0.6)。',plane:'自旋是轴向量，使用 det(R)R；不能直接沿用位置镜面矩阵。这里保留的是法向 Dz。',none:'镜面只约束允许分量；对称交换和 Dz 仍然可以存在。'}},
  {prompt:'反演单独开启且关闭所有镜面后，为什么出现 J=Jᵀ？',answer:'swap',options:[['swap','A=I，但反演交换了两个端点'],['polar','因为轴向自旋按 −I 反向'],['zero','因为所有对称交换也必须为零']],feedback:{swap:'正确。反演保留轴向自旋分量，但端点交换后必须恢复 i 在左的次序，得到 J=Jᵀ。',polar:'反演的 R=−I，而轴向自旋矩阵 A=det(R)R=I。转置来自端点交换。',zero:'反演单独留下六维实对称矩阵空间；禁止 DMI 不等于禁止所有交换。'}},
  {prompt:'换成垂直于键的 yz 镜面，能沿用“只保留镜面法向 D”的结论吗？',answer:'different',options:[['different','不能；端点交换，此例保留 Dy、Dz'],['same','能；只保留法向 Dx'],['noexchange','能；两个端点仍各自不动']],feedback:{different:'正确。yz 镜面交换端点，条件含 Jᵀ；本例得到 D=(0,0.4,0.6)。',same:'这个镜面垂直于键并交换端点，需改变不变性条件；包含键的镜面结论不能直接照搬。',noexchange:'沿 x 的两个端点位于 ±1/2，yz 镜面将它们互换。'}}
 ],
 'conservation-generators':[
  {prompt:'先预测：各向同性交换的 y、z 两项对 Sx 的对易子范数均非零，完整对易子会怎样？',answer:'cancel',options:[['cancel','两矩阵可以相消，完整对易子为零'],['sum','把两个非零范数相加就是完整残差'],['trajectory','只要当前曲线平坦就不用检查矩阵']],feedback:{cancel:'正确。相同矩阵元为 −1/4 与 +1/4；先把矩阵相加，再取范数。',sum:'范数会丢掉符号。两个范数之和为 √2，但矩阵和的范数是零。',trajectory:'一条特殊初态的曲线不能代替对所有初态成立的算符恒等式。'}},
  {prompt:'XXZ 取 Jx=Jy=1、Jz=1.7，无场且无耗散，哪个生成元仍然守恒？',answer:'sz',options:[['sz','Sz；Sx 与 Sy 一般不守恒'],['sx','Sx；因为所有交换系数仍非零'],['all','三个分量都守恒，因为 S² 守恒']],feedback:{sz:'正确。x、y 交换项在 Sz 对易子中相消；把同一输入的 observable 从 sx 切到 sz 可检验。',sx:'Sx 的 y、z 两项权重不再相同，抵消失败；其残差为 0.7/√2。',all:'S² 守恒不保证三个旋转生成元守恒；要分别检查 Sx、Sy、Sz。'}},
  {prompt:'XYZ 中 [H,U_z(π)]=0 且 S² 守恒，能据此断言 Sz 连续旋转对称吗？',answer:'no',options:[['no','不能；仍须检查 [H,Sz]'],['pi','能；一个 π 旋转等于所有旋转'],['s2','能；S² 守恒已经证明 SU(2)']],feedback:{no:'正确。此例 π 旋转对易，但 Sz 对易子范数为 0.6/√2；离散对称和连续生成元是不同条件。',pi:'一个有限角度的对易关系不保证任意角度都成立。',s2:'本 XYZ 二聚体的 S² 残差为零，但三个总自旋分量均不守恒，因此不能据此宣布 SU(2)。'}}
 ]
};
const defaults=id=>({open:false,case:id==='exchange-bond-constraints'?'mirror':'su2',operation:'mirrorXY',component:'xz',row:'0',col:'1',mode:'commutator',revealed:0,choices:['','',''],checked:[false,false,false],note:'',native:{},copyOutcome:''});
function restore(value,id){const s=defaults(id),v=value&&typeof value==='object'?value:{};for(const [key,allowed]of Object.entries({case:(id==='exchange-bond-constraints'?exchangeOptions:conservationOptions).map(([x])=>x),component:['xy','xz','yz'],row:['0','1','2','3'],col:['0','1','2','3'],mode:['commutator','adjoint'],copyOutcome:['','success','error']}))if(allowed.includes(v[key]))s[key]=v[key];if(id==='exchange-bond-constraints'){const ops=records[s.case].result.constraints;s.operation=ops.some(x=>x.id===v.operation)?v.operation:ops[0].id;}s.open=v.open===true;s.revealed=Number.isInteger(v.revealed)&&v.revealed>=0&&v.revealed<=3?v.revealed:0;s.choices=questions[id].map((q,i)=>q.options.some(([x])=>x===v.choices?.[i])?v.choices[i]:'');s.checked=s.choices.map((x,i)=>!!x&&v.checked?.[i]===true);s.note=typeof v.note==='string'?v.note.slice(0,2000):'';s.native={comparison:v.native?.comparison===true};return s;}
const optionHTML=(rows,value)=>rows.map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
const select=(prefix,key,label,rows,value)=>'<label for="'+prefix+'-'+key+'">'+esc(label)+'<select id="'+prefix+'-'+key+'">'+optionHTML(rows,value)+'</select></label>';
const native=(label,content,s)=>'<details data-sob-native="comparison"'+(s.native.comparison?' open':'')+'><summary>'+esc(label)+'</summary>'+content+'</details>';
const titles={'exchange-bond-constraints':'亲手追踪镜面、自旋与端点转置','conservation-generators':'先加矩阵，再判断生成元守恒'};
function bondOutput(s){
 const x=bondOperatorReference(s),r=x.record.result,op=x.operation,c=x.component;
 let out=h('步骤一：分别变换位置与轴向自旋')+p('有向键沿 x：i=(−1/2,0,0)，j=(1/2,0,0)。输入三个 D 分量都非零，交换能量单位为 meV；量子自旋 S=σ/2。')+formula('R='+matrix(op.polarMatrix)+',\\quad A=\\det(R)R='+matrix(op.axialMatrix))+table('实际操作对两个端点的作用',['原端点','Rr','目标端点'],x.positions.map((v,i)=>[inline(vector(v)),inline(vector(x.images[i])),esc(op.swapsSites?(i?'i':'j'):(i?'j':'i'))]))+p(op.swapsSites?'该操作交换端点。恢复 i 在左、j 在右的能量书写次序，必须转置 J。':'该操作分别保持两个端点；自旋分量变换后，端点次序不变。');
 if(s.revealed>=2)out+=h('步骤二：只追踪一个双线性项')+formula(op.swapsSites?'S_j^TA^TJAS_i=S_i^TA^TJ^TAS_j':'S_i^TA^TJAS_j')+formula('J_{'+c.name+'}='+c.factor+'J_{'+c.sourceName+'}')+table('所选矩阵元；原始输入与共同约束后的结果分开',['原始输入','操作后的来源','该操作作用值','共同投影结果'],[[fmt(c.raw),fmt(c.factor)+' × '+fmt(c.sourceValue),fmt(c.transformed),fmt(c.projected)]] )+formula('T_g(J_{\\mathrm{input}})='+matrix(x.action))+p('这一步把原始输入带过一个操作；它未必满足对称性。约束要求 J=Tg(J)，原实验再投影到所有已选生成元的共同解空间。');
 if(s.revealed>=3){out+=h('步骤三：核对共同允许空间与反例')+formula('J_{\\mathrm{allowed}}='+matrix(r.tensor)+',\\quad D='+vector(r.D)+',\\quad \\dim\\mathcal J='+x.allowedDimension)+table('实际 API 的生成元残差',['生成元','投影前残差','投影后残差'],r.constraints.map(q=>[esc(operationNames[q.id]),fmt(q.inputResidual),fmt(q.outputResidual)]));out+=native('比较四种固定条件的实际结果',table('同一非零 D 输入下的独立对照',['条件','允许维数','允许 D'],exchangeOptions.map(([key,label])=>[esc(label),String(9-records[key].result.rank),inline(vector(records[key].result.D))])),s)+p('反演单独允许六维实对称 J，不要求所有交换为零。反演与 xy 镜面共同开启时只剩四维；不要把共同约束当作反演的单独结果。')+p('反例：垂直键的 yz 镜面交换端点，保留 D=(0,0.4,0.6)。镜面的取向与是否交换端点都必须写清，不能一概照搬“只留法向 D”。');}
 return out;
}
function generatorOutput(s){
 const x=generatorOperatorReference(s),r=x.record.result,proof=r.selectedProof,q=r.selected==='sx'?'S_x':'S_z',factor=s.mode==='adjoint'?'i':'',cell='_{'+s.row+','+s.col+'}',cellText=' ['+s.row+','+s.col+']';
 let out=h('步骤一：声明基序，计算一个矩阵元')+p('有序基底为 ↑↑、↑↓、↓↑、↓↓，矩阵行列编号为 0、1、2、3。S=σ/2 无量纲，H/ℏ 的系数单位为 rad/ns；所有固定参考的 γ₁=γφ=0，均为闭系统。')+formula('Q='+q+'='+cmatrix(proof.operator))+table('先做乘法，再做相减；此处 Hα 均指 Hα/ℏ',['交换项',factor+'HαQ'+cellText,factor+'QHα'+cellText,factor+'[Hα,Q]'+cellText],x.parts.map(part=>['<span data-math-ignore>'+part.term+'</span>',inline(ctex(part.left)),inline(ctex(part.right)),inline(ctex(part.entry))]));
 if(s.revealed>=2)out+=h('步骤二：把每个矩阵元带着符号相加')+table('实际 API 的加权矩阵；系数已经乘入',['交换项',s.mode==='adjoint'?'i[Hα/ℏ,Q]':'[Hα/ℏ,Q]'],x.parts.map(part=>['<span data-math-ignore>'+part.term+'</span>',inline(cmatrix(part.matrix))]))+formula(factor+'[H/\\hbar,'+q+']='+cmatrix(x.matrix))+formula(factor+'[H/\\hbar,'+q+']'+cell+'='+ctex(x.selectedEntry))+p('默认各向同性 Sx 参考的 (0,1) 元素：y 项为 −1/4，z 项为 +1/4。切换到伴随项 i[H/ℏ,Q] 后，相应元素是 −i/4 与 +i/4；矩阵和仍为零。');
 if(s.revealed>=3){out+=h('步骤三：矩阵求和之后才取范数')+formula('\\sum_\\alpha\\|[H_\\alpha/\\hbar,Q]\\|_F='+fmt(x.sumOfNorms)+',\\quad \\|[H/\\hbar,Q]\\|_F='+fmt(x.normOfSum))+table('同一 Hamiltonian 的全部旋转生成元检查',['Q','对易子 Frobenius 范数'],['sx','sy','sz','s2'].map(key=>['<span data-math-ignore>'+key+'</span>',fmt(r.allHamiltonianNorms[key])]))+p('各向同性参考中，两项范数之和为 √2，矩阵和的范数却为零。XXZ 的同一组参数先选 sx 再选 sz，可区分破缺方向与保留方向。');
  out+=native('主动 π 旋转的固定反例与被动换基对照',formula('U_z(\\pi)=\\operatorname{diag}(-1,1,1,-1)='+matrix(x.pi))+formula('\\|[H/\\hbar,U_z(\\pi)]\\|_F='+fmt(x.piResidual))+p('这个主动 π 旋转矩阵按上述基序独立构造，再与实际 API 的 Hamiltonian 相乘检验。它不是原实验的 basisAngle 控件；basisAngle 做的是同时变换状态与算符的被动换基。')+p('在 XYZ 固定参考中，主动 π 旋转仍对易，但 Sz 残差为 0.6/√2，S² 残差为零。离散旋转和 S² 守恒都不能单独推出 Sz 连续旋转对称或完整 SU(2)。'),s)+p('判据针对所有初态的算符恒等式。一条平坦曲线不构成这个证明；加入耗散后还必须重新检查完整 L†Q。');}
 return out;
}
function bodyHTML(prefix,id,s,copy){
 const controls=id==='exchange-bond-constraints'?select(prefix,'case','固定物理条件',exchangeOptions,s.case)+select(prefix,'operation','追踪一个真实生成元',records[s.case].result.constraints.map(x=>[x.id,operationNames[x.id]]),s.operation)+select(prefix,'component','追踪交换矩阵元',componentOptions,s.component):select(prefix,'case','固定 Hamiltonian 与观测量',conservationOptions,s.case)+select(prefix,'mode','查看对易子或伴随项',[['commutator','[H/ℏ,Q]'],['adjoint','i[H/ℏ,Q]']],s.mode)+select(prefix,'row','矩阵行编号',[0,1,2,3].map(x=>[String(x),String(x)]),s.row)+select(prefix,'col','矩阵列编号',[0,1,2,3].map(x=>[String(x),String(x)]),s.col);
 const button=(key,text)=>'<button id="'+prefix+'-'+key+'" type="button">'+esc(text)+'</button>';
 return p('先预测，再逐步回放一个真实有限参考。改变条件会重新收起步骤，笔记和未提交答案继续保留。')+'<div class="sob-controls">'+controls+'</div>'+questions[id].map((q,i)=>'<section class="sob-question">'+select(prefix,'q'+i,q.prompt,[['','请选择预测'],...q.options],s.choices[i])+button('check'+i,'核对这一题')+'<p id="'+prefix+'-feedback'+i+'" class="sob-feedback" aria-live="polite"></p></section>').join('')+'<div class="sob-buttons">'+button('observe','展开步骤一')+button('next','展开下一步')+'</div><div id="'+prefix+'-output" class="sob-output"></div><label for="'+prefix+'-note">'+esc('我的逐项推导与问题')+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(s.note)+'</textarea></label>'+p('展开状态、预测和笔记只保存在当前页面内存，不写入学习成绩。')+'<div class="sob-buttons">'+(copy?button('copy','复制当前完整参考到原实验'):'')+button('reset','重置这张操作卡')+'</div>'+p('复制只填入当前固定参考的完整真实输入；请在原实验检查参数并手动运行。')+'<p id="'+prefix+'-copy-status" aria-live="polite"></p><p class="sob-source">'+esc('数据来自 exchange_symmetry_lab / conservation_lab 的实际 API；这里只回放有限操作，不建立一般分类器。')+'</p>';
}
export function symmetryOperatorBridgeHTML(lessonId){if(!own(SYMMETRY_OPERATOR_BRIDGE_HOOKS,lessonId))return'';return'<details class="sob-card" id="sob-'+lessonId+'"><summary>'+esc(titles[lessonId])+'</summary><div id="sob-'+lessonId+'-body"></div></details>';}
const owners=new WeakMap(),open=d=>typeof d.open==='boolean'?d.open:d.getAttribute('open')!==null;
export function bindSymmetryOperatorBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 if(!root||!own(SYMMETRY_OPERATOR_BRIDGE_HOOKS,lessonId)){const no=()=>{};no.snapshot=()=>({});return no;}
 const token={},prefix='sob-'+lessonId,key='sob:'+lessonId,s=restore(stateStore.get(key),lessonId);owners.set(root,token);let alive=true,ticket=0,busy=false;
 const detail=root.querySelector('#'+prefix),body=root.querySelector('#'+prefix+'-body'),$=k=>body?.querySelector('#'+prefix+'-'+k),owned=()=>alive&&owners.get(root)===token&&root.isConnected!==false&&root.querySelector('#'+prefix)===detail&&root.querySelector('#'+prefix+'-body')===body,current=()=>owned()&&isCurrent(),save=()=>{if(owned())stateStore.set(key,clone(s));};
 function capture(){if(!owned()||!body)return;s.open=open(detail);for(const key of ['case','operation','component','mode','row','col'])if($(key))s[key]=$(key).value;for(let i=0;i<3;i++)if($('q'+i)){if(s.choices[i]!==$('q'+i).value)s.checked[i]=false;s.choices[i]=$('q'+i).value;}if($('note'))s.note=String($('note').value).slice(0,2000);for(const d of body.querySelectorAll('[data-sob-native]'))s.native[d.dataset.sobNative]=open(d);save();}
 function update(){if(!current())return;capture();const signature=JSON.stringify([s.case,s.operation,s.component,s.mode,s.row,s.col,s.revealed]);if($('output').dataset.sobSignature!==signature){$('output').innerHTML=s.revealed?(lessonId==='exchange-bond-constraints'?bondOutput(s):generatorOutput(s)):p('先选择预测，再逐步展开操作。');$('output').dataset.sobSignature=signature;}
  for(const d of $('output').querySelectorAll('[data-sob-native]')){if(s.native[d.dataset.sobNative])d.open=true;d.ontoggle=()=>{if(current()&&$('output').querySelector('[data-sob-native="'+d.dataset.sobNative+'"]')===d){s.native[d.dataset.sobNative]=open(d);save();}};}
  $('observe').disabled=!s.choices[0];$('next').disabled=!s.revealed||s.revealed>=3;for(let i=0;i<3;i++){const q=questions[lessonId][i],feedback=$('feedback'+i);$('check'+i).disabled=!s.choices[i]||!s.revealed;feedback.textContent=s.checked[i]?(q.feedback[s.choices[i]]||''):'';feedback.setAttribute('class','sob-feedback'+(s.checked[i]?(s.choices[i]===q.answer?' sob-correct':' sob-retry'):''));}if($('copy'))$('copy').disabled=busy;$('copy-status').textContent=s.copyOutcome==='success'?'输入已复制；请检查参数并手动运行。':s.copyOutcome==='error'?'本次复制未完成，可以重新尝试。':'';save();
 }
 function draw(){if(!current()||!body)return;body.innerHTML=bodyHTML(prefix,lessonId,s,typeof onOpenLab==='function');const bind=(key,event,action)=>{const node=$(key);if(node)node[event]=()=>{if(!current()||$(key)!==node||node.disabled)return;capture();action(node);update();};};
  for(const field of ['case','operation','component','mode','row','col'])bind(field,'onchange',()=>{ticket++;busy=false;s.checked=[false,false,false];s.copyOutcome='';if(field==='case'){s.revealed=0;if(lessonId==='exchange-bond-constraints'){const ops=records[s.case].result.constraints;s.operation=ops[0].id;$('operation').innerHTML=optionHTML(ops.map(x=>[x.id,operationNames[x.id]]),s.operation);$('operation').value=s.operation;}else{s.row='0';s.col=records[s.case].result.selected==='sz'?'3':'1';$('row').value=s.row;$('col').value=s.col;}}});
  for(let i=0;i<3;i++){bind('q'+i,'onchange',()=>{s.checked[i]=false;});bind('check'+i,'onclick',()=>{s.checked[i]=true;});}bind('observe','onclick',()=>{s.revealed=1;s.checked=[false,false,false];});bind('next','onclick',()=>{s.revealed=Math.min(3,s.revealed+1);});
  const note=$('note');note.oninput=()=>{if(current()&&$('note')===note){s.note=String(note.value).slice(0,2000);save();}};bind('reset','onclick',()=>{ticket++;busy=false;const wasOpen=s.open;Object.assign(s,defaults(lessonId),{open:wasOpen});draw();$('q0')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy)copy.onclick=async()=>{if(!current()||$('copy')!==copy||copy.disabled||busy)return;capture();const request=symmetryOperatorLabRequest(lessonId,s),job=++ticket;busy=true;s.copyOutcome='';copy.disabled=true;$('copy-status').textContent='';save();try{const accepted=await onOpenLab(clone(request));if(current()&&job===ticket){if(accepted===false)throw Error('Reference was not accepted.');s.copyOutcome='success';update();}}catch(error){if(current()&&job===ticket){s.copyOutcome='error';update();}}finally{if(job===ticket){busy=false;if(current()&&$('copy')===copy)copy.disabled=false;}}};update();
 }
 if(detail&&body){if(s.open){detail.open=true;detail.setAttribute?.('open','');}detail.ontoggle=()=>{if(current()){s.open=open(detail);save();}};draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;if(owners.get(root)!==token)return;if(detail)detail.ontoggle=null;if(body)for(const tag of ['button','select','textarea','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.ontoggle=null;}};cleanup.snapshot=()=>{capture();return{[SYMMETRY_OPERATOR_BRIDGE_HOOKS[lessonId][0]]:clone(s)};};return cleanup;
}
