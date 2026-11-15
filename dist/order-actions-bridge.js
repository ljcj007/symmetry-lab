import {mathHTML} from './math-display.js?v=20261113-prose2';
import {ORDER_ACTIONS_REFERENCE} from './order-actions-reference.js?v=20261115-actions1';

// Finite teaching actions over captured production matrices, not a solver.
export const ORDER_ACTIONS_BRIDGE_HOOKS=Object.freeze({
 'order-isotropy':Object.freeze(['orbit-actions']),
 'order-invariants':Object.freeze(['reynolds-actions']),
 'order-field-convention':Object.freeze(['field-coordinate-actions'])
});
const clone=x=>JSON.parse(JSON.stringify(x));
const records=clone(ORDER_ACTIONS_REFERENCE.records);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const choice=(x,values)=>{if(!values.includes(x))throw Error('Unknown bounded order action reference.');return x;};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-12?'0':Number(x.toFixed(8)).toString();
const tr=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const vector=x=>matrix(x.map(v=>[v]));
const formula=s=>'<div class="oab-formula" tabindex="0">'+mathHTML(s,true)+'</div>';
const inline=s=>mathHTML(s);
const p=s=>'<p>'+esc(s)+'</p>';
const h=s=>'<h4>'+esc(s)+'</h4>';
const table=(caption,headers,rows)=>'<div class="oab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const opById=(r,id)=>{const op=r.order.operations.find(x=>String(x.id)===String(id));if(!op)throw Error('Unknown production operation identifier.');return op;};
const operationLabel=op=>'<span data-math-ignore>g'+op.id+'</span>';

/** All operations and image buckets come from the actual Oh request. */
export function orderIsotropyReference(kind='axis',operation='0'){
 choice(kind,['axis','zero']);const r=clone(records[kind]),op=opById(r,operation),buckets=[];
 for(const row of r.order.operations){let bucket=buckets.find(b=>b.vector.every((x,i)=>Math.abs(x-row.image[i])<1e-12));if(!bucket){bucket={vector:row.image.slice(),operations:[]};buckets.push(bucket);}bucket.operations.push(row.id);}
 return{record:r,operation:op,buckets,products:op.matrix.map(row=>row.map((x,i)=>x*r.order.vector[i]))};
}
const seeds={x2:{powers:[2,0],basis:'a2',tex:'x^2',normalization:2},xy:{powers:[1,1],basis:null,tex:'xy',normalization:0},x4:{powers:[4,0],basis:'b4',tex:'x^4',normalization:2}};
const etaChoices={axis:[1,0],diagonal:[1,1],zero:[0,0]};
/** The three declared seeds are averaged over the genuine eight C4v matrices. */
export function orderReynoldsReference({seed='x2',eta='axis',coefficient='2'}={}){
 choice(seed,Object.keys(seeds));choice(eta,Object.keys(etaChoices));choice(String(coefficient),['-2','2']);
 const definition=seeds[seed],v=etaChoices[eta].slice(),terms=records.reynolds.order.operations.map(op=>{
  const powers=[0,0];let sign=1;
  definition.powers.forEach((power,i)=>{const j=op.matrix[i].findIndex(x=>x!==0);powers[j]+=power;sign*=op.matrix[i][j]**power;});
  const image=mv(op.matrix,v);return{id:op.id,matrix:clone(op.matrix),powers,sign,image,value:image[0]**definition.powers[0]*image[1]**definition.powers[1]};
 });
 const sum=terms.reduce((s,t)=>s+t.value,0),average=sum/terms.length,basis=definition.basis?clone(records.reynolds.order.invariants.find(x=>x.id===definition.basis)):null;
 const primitive=basis?basis.terms.reduce((s,t)=>s+t.coefficient*v.reduce((a,x,i)=>a*x**t.powers[i],1),0):0,c=Number(coefficient),primitiveCoefficient=definition.normalization?c/definition.normalization:0;
 return{seed,eta,coefficient:c,vector:v,definition:clone(definition),terms,sum,average,basis,primitive,primitiveCoefficient,energy:c*average,primitiveEnergy:primitiveCoefficient*primitive};
}
/** Energies are for the six parent-orbit vectors at fixed radius. */
export function orderFieldReference(field='on'){
 choice(field,['off','on']);const r=clone(records[field==='on'?'field':'fieldZero']),fieldVector=[r.parameters.fieldX,0,0];
 return{record:r,field:fieldVector,rows:r.order.domains.map(d=>{const fieldEnergy=-dot(fieldVector,d.vector);return{vector:d.vector,F0:d.energy-fieldEnergy,fieldEnergy,F:d.energy};})};
}
export function orderConventionReference(operation='1'){
 const r=clone(records.convention),op=opById(r,operation),Q=r.order.convention.rotation,Qt=tr(Q),eta=r.order.vector,field=[r.parameters.fieldX,0,0],etaPrime=mv(Qt,eta),fieldPrime=mv(Qt,field),matrixPrime=mm(mm(Qt,op.matrix),Q),left=mv(matrixPrime,etaPrime),right=mv(Qt,mv(op.matrix,eta));
 const near=(a,b)=>a.every((x,i)=>Math.abs(x-b[i])<1e-12),count=(operations,v,h)=>{
  const fixed=operations.filter(g=>near(mv(g,v),v)),fieldFixed=operations.filter(g=>near(mv(g,h),h)),intersection=fieldFixed.filter(g=>near(mv(g,v),v)),orbit=[];
  for(const g of fieldFixed){const image=mv(g,v);if(!orbit.some(x=>near(x,image)))orbit.push(image);}
  return{group:operations.length,state:fixed.length,field:fieldFixed.length,intersection:intersection.length,fieldOrbit:orbit.length};
 };
 const originalMatrices=r.order.operations.map(g=>g.matrix),newMatrices=originalMatrices.map(g=>mm(mm(Qt,g),Q)),counts=count(originalMatrices,eta,field),transformedCounts=count(newMatrices,etaPrime,fieldPrime);
 const naiveEnergy=r.order.invariants.reduce((sum,b)=>sum+b.coefficient*b.terms.reduce((s,t)=>s+t.coefficient*etaPrime.reduce((v,x,i)=>v*x**t.powers[i],1),0),0)-dot(fieldPrime,etaPrime);
 return{record:r,operation:op,Q,eta,field,etaPrime,fieldPrime,matrixPrime,left,right,counts,transformedCounts,naiveEnergy,fieldEnergy:-dot(field,eta),fieldEnergyPrime:-dot(fieldPrime,etaPrime)};
}
/** Complete supported inputs only; copying never starts Python. */
export function orderActionsLabRequest(lessonId,state={}){
 if(!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId))throw Error('Unknown order action lesson.');
 let input;
 if(lessonId==='order-isotropy'){choice(state.case??'axis',['axis','zero']);input=clone(records[state.case??'axis'].input);}
 else if(lessonId==='order-invariants'){
  const r=orderReynoldsReference(state);if(!r.basis)return null;
  input={...clone(records.reynolds.input),etaX:r.vector[0],etaY:r.vector[1],etaZ:0,a2:0,b4:0,c4:0,d6:0,e6:0,f6:0,fieldX:0};input[r.basis.id]=r.primitiveCoefficient;
 }else{choice(state.stage??'field',['field','coordinates']);choice(state.field??'on',['off','on']);input=clone(records[state.stage==='coordinates'?'convention':state.field==='off'?'fieldZero':'field'].input);}
 return{action:'order_parameter_lab',module:'order',input};
}
const questionData={
 'order-isotropy':[
  {prompt:'先预测：给定立方极性轴向态，48 个操作产生多少个不同向量？',answer:'six',options:[['six','六个；每个等像桶含八个操作'],['fortyeight','四十八个；每个操作产生一个新态'],['eight','八个；稳定子阶就是畴数']],feedback:{six:'正确。等像操作合并后得到六个向量，48/8=6。',fortyeight:'不同操作可以作用到同一个向量。先合并等像桶，再计算轨道大小。',eight:'八是保持当前向量不变的操作数；轨道大小是 48/8。'}},
  {prompt:'反例验证：把序参量改成零向量，可以据此断言什么？',answer:'full',options:[['full','所有四十八个操作都保持零向量'],['six','仍然保留六个不同畴'],['minimum','零向量必然是自由能极小值']],feedback:{full:'正确。线性操作都把零映到零，稳定子是整个母群；这没有判定能量极小值。',six:'零向量的所有像相同，因此只有一个轨道向量。',minimum:'稳定子检查只测试操作是否保持给定向量；能量极小化需要另外求解。'}}
 ],
 'order-invariants':[
  {prompt:'先预测：C4v 对 x² 的 Reynolds 平均是什么？',answer:'half',options:[['half','(x²+y²)/2'],['sum','x²+y²'],['x','x²']],feedback:{half:'正确。八项中四项为 x²、四项为 y²，除以群阶八得到一半。',sum:'这是原始整系数基底 I；归一化的群平均还带有 1/2。',x:'四重旋转把 x² 与 y² 交换，单独的 x² 不是这个群的不变量。'}},
  {prompt:'若把不变量基底从 R 改成 I=2R，原系数 c 应怎样改变？',answer:'inverse',options:[['inverse','改成 c/2，保持同一个自由能'],['same','仍然用 c，能量不变'],['double','改成 2c']],feedback:{inverse:'正确。cR=(c/2)I。基底与系数互逆缩放，数值能量才相同。',same:'若 I=2R 而系数不变，该项能量也加倍。群对称性不会自动修正这个系数。',double:'基底已放大两倍，系数再放大会使能量变成四倍；应当互逆缩放。'}}
 ],
 'order-field-convention':[
  {prompt:'先预测：h=0.3 x̂ 时，固定半径的 +x 与 −x 域哪一个能量低？',answer:'plus',options:[['plus','+x 域；外场项为 −0.3'],['minus','−x 域；外场项为 −0.3'],['equal','能量相等；它们属于同一个母群轨道']],feedback:{plus:'正确。+x 的外场项是 −0.3，总能 −0.2；−x 的外场项是 +0.3，总能 0.4。',minus:'外场项是 −h·η。反向域点积为负，因此其外场能为正。',equal:'母群使零场能相同，但固定外场保留的群更小，−h·η 会区分母群轨道中的方向。'}},
  {prompt:'被动换基 37° 后，怎样计算同一个物理态的自由能？',answer:'joint',options:[['joint','同步变换 η、h、操作矩阵，并用 F′(η′)=F(Qη′)'],['bare','直接把新坐标代回原来的各向异性多项式'],['etaonly','只旋转 η，保持场与操作矩阵不变']],feedback:{joint:'正确。坐标、场和表示矩阵一起换基；能量与操作作用都保持协变。',bare:'各向异性多项式的坐标表达也要变换。原多项式原样代入新分量，通常描述另一个物理态。',etaonly:'只改变 η 而保持场和晶轴不动，是改变物理方向，不是同一状态的坐标重写。'}}
 ]
};
const initial=()=>({open:false,case:'axis',operation:'1',seed:'x2',eta:'axis',coefficient:'2',stage:'field',field:'on',revealed:0,choices:['',''],checked:[false,false],note:'',native:{},copyOutcome:''});
const stateFrom=(value,id)=>{
 const s=initial(),q=value&&typeof value==='object'?value:{};
 for(const [key,values]of Object.entries({case:['axis','zero'],operation:records.axis.order.operations.map(g=>String(g.id)),seed:['x2','xy','x4'],eta:['axis','diagonal','zero'],coefficient:['-2','2'],stage:['field','coordinates'],field:['off','on'],copyOutcome:['','success','error']}))if(values.includes(q[key]))s[key]=q[key];
 s.open=q.open===true;s.revealed=Number.isInteger(q.revealed)&&q.revealed>=0&&q.revealed<=3?q.revealed:0;s.note=typeof q.note==='string'?q.note.slice(0,2000):'';
 s.native={operations:q.native?.operations===true};s.choices=questionData[id].map((question,i)=>question.options.some(([v])=>v===q.choices?.[i])?q.choices[i]:'');s.checked=s.choices.map((v,i)=>!!v&&q.checked?.[i]===true);return s;
};
const titles={'order-isotropy':'把母群操作变成轨道与稳定子','order-invariants':'亲手平均多项式并追踪归一化','order-field-convention':'区分外场选域与坐标换基'};
const optionHTML=(options,value)=>options.map(([key,label])=>'<option value="'+esc(key)+'"'+(String(value)===String(key)?' selected':'')+'>'+esc(label)+'</option>').join('');
const select=(prefix,key,label,options,value)=>'<label for="'+prefix+'-'+key+'">'+esc(label)+'<select id="'+prefix+'-'+key+'">'+optionHTML(options,value)+'</select></label>';
const native=(prefix,key,label,content,s)=>'<details data-oab-native="'+key+'"'+(s.native[key]?' open':'')+'><summary>'+esc(label)+'</summary>'+content+'</details>';
const opsOptions=r=>r.order.operations.map(op=>[String(op.id),'g'+op.id]);
const seedTeX=r=>r.powers.map((n,i)=>n?(i?'y':'x')+(n===1?'':'^{'+n+'}'):'').join('')||'1';
function isotropyOutput(s){
 const r=orderIsotropyReference(s.case,s.operation),a=r.record.order,op=r.operation;
 let out=h('步骤一：逐行作用，而不是只看群名')+formula('D(g_{'+op.id+'})\\eta='+matrix(op.matrix)+vector(a.vector)+'='+vector(op.image));
 out+=table('选中操作的逐行点积',['矩阵行','三个乘积','行和'],r.products.map((row,i)=>[String(i+1),row.map(fmt).join(' + '),fmt(op.image[i])]))+p(op.retained?'这个操作保持当前序参量，属于稳定子。':'这个操作改变当前序参量，不属于当前稳定子。');
 if(s.revealed>=2){out+=h('步骤二：把相同的像放进同一个桶')+table('实际 48 个操作的等像桶',['序参量像','操作数','操作编号'],r.buckets.map(b=>[inline(vector(b.vector)),String(b.operations.length),'<span data-math-ignore>'+b.operations.map(x=>'g'+x).join(', ')+'</span>']));
  out+=native('', 'operations','展开全部四十八个实际矩阵与像',table('实际生产操作表',['操作','矩阵','像','保持当前态'],a.operations.map(g=>[operationLabel(g),inline(matrix(g.matrix)),inline(vector(g.image)),g.retained?'是':'否'])),s);
 }
 if(s.revealed>=3)out+=h('步骤三：连接轨道—稳定子定理')+formula('|G|=48,\\quad |H_\\eta|='+a.stabilizerOrder+',\\quad |G\\eta|=\\frac{48}{'+a.stabilizerOrder+'}='+r.buckets.length)+p('这里指定的是极性序参量；反演矩阵 −I 把非零 η 变成 −η。轴矢量的反演规则不同。')+p('反例：零向量的所有像重合，稳定子阶为 48。给定一个方向只定义状态的对称性，并不证明该方向是自由能极小值。');
 return out;
}
function reynoldsOutput(s){
 const r=orderReynoldsReference(s),tex=seeds[s.seed].tex;
 let out=h('步骤一：每个操作都作用到同一个种子')+formula('f(x,y)='+tex+',\\quad \\eta='+vector(r.vector))+table('八项直接平均；操作来自原 C4v 计算',['操作','矩阵','f(D(g)η) 的多项式','当前数值'],r.terms.map(t=>[operationLabel(t),inline(matrix(t.matrix)),inline((t.sign<0?'-':'')+seedTeX(t)),fmt(t.value)]));
 if(s.revealed>=2){const symbolic=s.seed==='xy'?'0':s.seed==='x2'?'\\frac{x^2+y^2}{2}':'\\frac{x^4+y^4}{2}';out+=h('步骤二：保留群平均的 1/|G|')+formula('\\mathcal R[f]=\\frac1{8}\\sum_{g\\in C_{4v}} f(D(g)\\eta)='+symbolic)+formula('\\mathcal R[f](\\eta)=\\frac{'+fmt(r.sum)+'}{8}='+fmt(r.average))+p('这八项是原核心群操作的直接平均。只展示所选种子，不据此建立另一套不变量分类器。');}
 if(s.revealed>=3){out+=h('步骤三：与原实验的整系数基底对齐');
  if(r.basis)out+=formula('I=2\\mathcal R[f],\\quad c_{\\mathcal R}='+fmt(r.coefficient)+',\\quad c_I=\\frac{c_{\\mathcal R}}2='+fmt(r.primitiveCoefficient))+formula('c_{\\mathcal R}\\mathcal R[f]='+fmt(r.energy)+'=c_I I')+p('原实验把群平均中的公因子约去，使用整系数基底。下面复制的是与此能量相同的单项教学模型；它不承担平衡态或全局稳定性的判断。');
  else out+=formula('\\mathcal R[xy]=0')+p('反例：镜面把 xy 变为 −xy，平均后相消。零多项式不能作为独立基底项，也没有可复制的非零系数。');
  out+=p('反例检查：把基底加倍却不把系数减半，会使这一项能量加倍。对称性约束允许的形式，但不决定材料系数的数值。');
 }
 return out;
}
function fieldOutput(s){
 if(s.stage==='coordinates'){
  const r=orderConventionReference(s.operation),c=r.record.order.convention;
  let out=h('步骤一：明确换基比较的物理状态')+p('这里切换到独立的原实验约定预设：η=(0.6,0.8,0.4)，h=(0.2,0,0)，旋转角 37°。这不是上一步六个轴向域的重新极小化。')+formula('Q='+matrix(r.Q)+',\\quad \\eta^\\prime=Q^T\\eta='+vector(r.etaPrime)+',\\quad h^\\prime=Q^Th='+vector(r.fieldPrime));
  if(s.revealed>=2)out+=h('步骤二：同步变换选中的操作矩阵')+formula('D^\\prime(g_{'+r.operation.id+'})=Q^TD(g_{'+r.operation.id+'})Q='+matrix(r.matrixPrime))+formula('D^\\prime(g)\\eta^\\prime='+vector(r.left)+'=Q^TD(g)\\eta')+p('换基重写操作矩阵，但某些操作的矩阵可保持不变；操作对同一个物理向量的作用保持一致。原实验的48个操作全部满足这个关系。');
  if(s.revealed>=3)out+=h('步骤三：自由能也必须按坐标规则重写')+formula('F^\\prime(\\eta^\\prime)=F(Q\\eta^\\prime)='+fmt(c.energy)+'=F(\\eta)')+formula('-h^T\\eta='+fmt(r.fieldEnergy)+'=-(h^\\prime)^T\\eta^\\prime')+table('同一状态换基前后的群阶与轨道计数',['计数','原坐标','新坐标'],[['G',r.counts.group,r.transformedCounts.group],['H(η)',r.counts.state,r.transformedCounts.state],['G(h)',r.counts.field,r.transformedCounts.field],['H(η) ∩ G(h)',r.counts.intersection,r.transformedCounts.intersection],['G(h)η',r.counts.fieldOrbit,r.transformedCounts.fieldOrbit]].map(row=>row.map(String)))+p('全部操作的协变残差与能量残差均小于 2×10⁻¹²；这是有限浮点参考的检查精度。')+p('反例：场已经正确换基，但仍把新分量代入旧的各向异性零场多项式，会得到下面的不同能量。')+formula('F_{0,\\mathrm{old}}(\\eta^\\prime)-(h^\\prime)^T\\eta^\\prime='+fmt(r.naiveEnergy)+'\\ne '+fmt(c.energy))+p('正确的新函数是 F(Qη′)。被动换基保持物理状态，转动序参量而不转动晶轴与场则会改变状态。');
  return out;
 }
 const r=orderFieldReference(s.field),a=r.record.order;
 let out=h('步骤一：固定半径，先列母群轨道')+formula('\\|\\eta\\|=1,\\quad h='+vector(r.field)+',\\quad F=F_0-h^T\\eta')+p('仍使用立方母群的六个轴向向量。零场多项式给每个向量同样的 F₀=0.1；只改变外场项。');
 if(s.revealed>=2)out+=h('步骤二：逐域记账，不重新优化幅度')+table('六个固定轨道向量的无量纲能量账本',['固定域向量','F₀','−h·η','F'],r.rows.map(row=>[inline(vector(row.vector)),fmt(row.F0),fmt(row.fieldEnergy),fmt(row.F)]));
 if(s.revealed>=3)out+=h('步骤三：区分母群、场保持群与当前态稳定子')+formula('|G|='+a.groupOrder+',\\quad |H_\\eta|='+a.stabilizerOrder+',\\quad |G_h|='+a.fieldGroupOrder+',\\quad |H_\\eta\\cap G_h|='+a.physicalStabilizerOrder)+formula('|G_h\\eta|='+a.fieldOrbitSize)+p('外场使母群等价方向的能量分开。表中最低的是这些固定向量中的最低能量；平衡序参量的幅度和方向仍需自由能极小化。')+p('反例：h=0 时六行能量重新相等；这不意味着在有限场下 −x 也与 +x 等能。切换“37° 联合换基”可检验坐标变化与真实外场变化的区别。');
 return out;
}
function bodyHTML(prefix,id,s,canCopy){
 let controls='';
 if(id==='order-isotropy')controls=select(prefix,'case','参考序参量',[['axis','立方极性轴向 η=(0,0,1)'],['zero','反例：零向量 η=(0,0,0)']],s.case)+select(prefix,'operation','选择实际群操作',opsOptions(records.axis),s.operation);
 if(id==='order-invariants')controls=select(prefix,'seed','多项式种子',[['x2','x²'],['xy','xy：相消反例'],['x4','x⁴']],s.seed)+select(prefix,'eta','代入的固定向量',[['axis','(1,0)'],['diagonal','(1,1)'],['zero','(0,0)']],s.eta)+select(prefix,'coefficient','平均基底的系数',[['2','c = 2'],['-2','c = −2']],s.coefficient);
 if(id==='order-field-convention')controls=select(prefix,'stage','比较的物理任务',[['field','六个固定域的外场账本'],['coordinates','独立参考：37° 联合换基']],s.stage)+select(prefix,'field','轴向域账本的场',[['on','h=(0.3,0,0)'],['off','反例：h=(0,0,0)']],s.field)+select(prefix,'operation','换基时追踪的实际操作',opsOptions(records.convention),s.operation);
 return p('先作预测，再逐步展开。所有矩阵与固定参考均对应原实验的真实输入；本卡不自动启动计算。')+'<div class="oab-controls">'+controls+'</div>'+questionData[id].map((q,i)=>'<section class="oab-question"><label for="'+prefix+'-q'+i+'">'+esc(q.prompt)+'<select id="'+prefix+'-q'+i+'">'+optionHTML([['','请选择预测'],...q.options],s.choices[i])+'</select></label><button id="'+prefix+'-check'+i+'" type="button">核对这一题</button><p id="'+prefix+'-feedback'+i+'" class="oab-feedback" aria-live="polite"></p></section>').join('')+'<div class="oab-buttons"><button id="'+prefix+'-observe" type="button">'+esc('展开步骤一')+'</button><button id="'+prefix+'-next" type="button">'+esc('展开下一步')+'</button></div><div id="'+prefix+'-output" class="oab-output"></div><label for="'+prefix+'-note">'+esc('我的推导与未解决的问题')+'<textarea id="'+prefix+'-note" maxlength="2000" rows="3">'+esc(s.note)+'</textarea></label>'+p('本卡的预测、笔记与展开状态只保留在当前页面的内存中。')+'<div class="oab-buttons">'+(canCopy?'<button id="'+prefix+'-copy" type="button">'+esc('复制当前参考到原实验')+'</button>':'')+'<button id="'+prefix+'-reset" type="button">'+esc('重置这张操作卡')+'</button></div><p id="'+prefix+'-copy-description"></p><p id="'+prefix+'-copy-status" aria-live="polite"></p><p class="oab-source">'+esc('参考来源：order_parameter_lab 的 Oh / C4v 原始矩阵、轨道、不变量与约定预设；只读有限参考，不自动运行或写入学习成绩。')+'</p>';
}
export function orderActionsBridgeHTML(lessonId){
 if(!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId))return'';
 const prefix='oab-'+lessonId;
 return'<details class="oab-card" id="'+prefix+'"><summary>'+esc(titles[lessonId])+'</summary><div id="'+prefix+'-body"></div></details>';
}
const owners=new WeakMap();
const isOpen=detail=>typeof detail.open==='boolean'?detail.open:detail.getAttribute('open')!==null;
export function bindOrderActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 if(!root||!own(ORDER_ACTIONS_BRIDGE_HOOKS,lessonId)){const no=()=>{};no.snapshot=()=>({});return no;}
 const key='oab:'+lessonId,prefix='oab-'+lessonId,token={},s=stateFrom(stateStore.get(key),lessonId);owners.set(root,token);
 let alive=true,ticket=0,busy=false;const detail=root.querySelector('#'+prefix),body=root.querySelector('#'+prefix+'-body'),$=name=>body?.querySelector('#'+prefix+'-'+name);
 const owned=()=>alive&&owners.get(root)===token&&root.isConnected!==false&&root.querySelector('#'+prefix)===detail&&root.querySelector('#'+prefix+'-body')===body;
 const current=()=>owned()&&isCurrent();
 const save=()=>{if(owned())stateStore.set(key,clone(s));};
 function capture(){if(!owned()||!body)return;if(detail)s.open=isOpen(detail);for(const field of ['case','operation','seed','eta','coefficient','stage','field'])if($(field))s[field]=$(field).value;for(let i=0;i<2;i++)if($('q'+i)){if(s.choices[i]!==$('q'+i).value)s.checked[i]=false;s.choices[i]=$('q'+i).value;}if($('note'))s.note=String($('note').value).slice(0,2000);for(const d of body.querySelectorAll('[data-oab-native]'))s.native[d.dataset.oabNative]=isOpen(d);save();}
 function update(){
  if(!current())return;capture();
  const signature=JSON.stringify([s.case,s.operation,s.seed,s.eta,s.coefficient,s.stage,s.field,s.revealed]);
  if($('output').dataset.oabSignature!==signature){$('output').innerHTML=s.revealed?(lessonId==='order-isotropy'?isotropyOutput(s):lessonId==='order-invariants'?reynoldsOutput(s):fieldOutput(s)):p('先选择预测，再展开操作与账本。切换物理参考后重新展开，笔记与未提交预测仍保留。');$('output').dataset.oabSignature=signature;}
  for(const d of $('output').querySelectorAll('[data-oab-native]')){if(s.native[d.dataset.oabNative])d.open=true;d.ontoggle=()=>{if(current()&&$('output').querySelector('[data-oab-native="'+d.dataset.oabNative+'"]')===d){s.native[d.dataset.oabNative]=isOpen(d);save();}};}
  $('observe').disabled=!s.choices[0];$('next').disabled=!s.revealed||s.revealed>=3;
  for(let i=0;i<2;i++){const q=questionData[lessonId][i],f=$('feedback'+i);$('check'+i).disabled=!s.choices[i]||!s.revealed;f.textContent=s.checked[i]?(q.feedback[s.choices[i]]||''):'';f.setAttribute('class','oab-feedback'+(s.checked[i]?(s.choices[i]===q.answer?' oab-correct':' oab-retry'):''));}
  const request=orderActionsLabRequest(lessonId,s);if($('copy'))$('copy').disabled=busy||!request;
  $('copy-description').textContent=!request?'当前种子的群平均为零，没有独立非零项可复制。':lessonId==='order-invariants'?'复制完整的单项教学模型，并把整系数基底的系数设为 c/2。请到原实验检查输入并手动运行。':lessonId==='order-field-convention'&&s.stage==='coordinates'?'复制原实验的完整约定预设：η=(0.6,0.8,0.4)，h=(0.2,0,0)，37°。请在原实验手动运行。':'复制上方当前固定参考的完整输入。请在原实验检查参数并手动运行。';
  $('copy-status').textContent=s.copyOutcome==='success'?'输入已复制；请在原实验检查参数并手动运行。':s.copyOutcome==='error'?'本次复制未完成，可以重新尝试。':'';
  if($('field'))$('field').disabled=s.stage==='coordinates';if($('operation')&&lessonId==='order-field-convention')$('operation').disabled=s.stage!=='coordinates';save();
 }
 function draw(){
  if(!current()||!body)return;body.innerHTML=bodyHTML(prefix,lessonId,s,typeof onOpenLab==='function');
  const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};};
  for(const field of ['case','operation','seed','eta','coefficient','stage','field'])bind(field,'onchange',()=>{ticket++;busy=false;s.checked=[false,false];s.copyOutcome='';if(field!=='operation')s.revealed=0;});
  for(let i=0;i<2;i++){bind('q'+i,'onchange',()=>{s.checked[i]=false;});bind('check'+i,'onclick',()=>{s.checked[i]=true;});}
  bind('observe','onclick',()=>{s.revealed=1;s.checked=[false,false];});bind('next','onclick',()=>{s.revealed=Math.min(3,s.revealed+1);});
  const note=$('note');note.oninput=()=>{if(current()&&$('note')===note){s.note=String(note.value).slice(0,2000);save();}};
  bind('reset','onclick',()=>{ticket++;busy=false;const open=s.open;Object.assign(s,initial(),{open});draw();$('q0')?.focus?.({preventScroll:true});});
  const copy=$('copy');if(copy)copy.onclick=async()=>{
   if(!current()||$('copy')!==copy||busy||copy.disabled)return;capture();const request=orderActionsLabRequest(lessonId,s);if(!request)return;const job=++ticket;busy=true;s.copyOutcome='';copy.disabled=true;$('copy-status').textContent='';save();
   try{const accepted=await onOpenLab(clone(request));if(current()&&job===ticket){if(accepted===false)throw Error('Input was not accepted.');s.copyOutcome='success';update();}}
   catch(error){if(current()&&job===ticket){s.copyOutcome='error';update();}}
   finally{if(job===ticket){busy=false;if(current()&&$('copy')===copy)copy.disabled=!orderActionsLabRequest(lessonId,s);}}
  };
  update();
 }
 if(detail&&body){if(s.open){detail.open=true;detail.setAttribute?.('open','');}detail.ontoggle=()=>{if(current()){s.open=isOpen(detail);save();}};draw();}
 const cleanup=()=>{if(!alive)return;capture();alive=false;ticket++;if(owners.get(root)!==token)return;if(detail)detail.ontoggle=null;if(body)for(const tag of ['button','select','input','textarea','details'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;node.ontoggle=null;}};
 cleanup.snapshot=()=>{capture();return{[ORDER_ACTIONS_BRIDGE_HOOKS[lessonId][0]]:clone(s)};};return cleanup;
}
