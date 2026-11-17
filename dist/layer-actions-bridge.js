import {mathHTML} from './math-display.js?v=20261113-prose2';
import {LAYER_ACTIONS_REFERENCE} from './layer-actions-reference.js?v=20261117-derive1';

// Finite coordinate arithmetic for two real 001 slab references. Enumeration,
// arbitrary structures and classification remain the existing Python tools.
export const LAYER_ACTIONS_BRIDGE_HOOKS=Object.freeze({'layer-periodicity':Object.freeze(['atom-layer-map'])});
export {LAYER_ACTIONS_REFERENCE};
const OPS=Object.freeze({
 mirror:{label:'法向镜面：z → −z',matrix:[[1,0,0],[0,1,0],[0,0,-1]]},
 identity:{label:'恒等操作',matrix:[[1,0,0],[0,1,0],[0,0,1]]},
 quarter:{label:'绕法向旋转 90°',matrix:[[0,-1,0],[1,0,0],[0,0,1]]},
 inversion:{label:'反演：r → −r',matrix:[[-1,0,0],[0,-1,0],[0,0,-1]]}
});
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const mv=(a,x)=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const fmt=x=>Math.abs(x)<1e-10?'0':String(Number(x.toFixed(7)));
const vec=x=>'('+x.map(fmt).join(', ')+')';
const matrix=x=>'\\begin{pmatrix}'+x.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const column=x=>'\\begin{pmatrix}'+x.map(fmt).join('\\\\')+'\\end{pmatrix}';
const formula=x=>'<div class="lyab-formula" tabindex="0">'+mathHTML(x,true)+'</div>';
const table=(caption,heads,rows)=>'<div class="lyab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,j)=>j?'<td>'+esc(v)+'</td>':'<th scope="row">'+esc(v)+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';
const p=text=>'<p>'+esc(text)+'</p>';
const bool=value=>value?'通过':'不通过';

/** Only the stated finite 001 reference is accepted. A full in-plane lattice
 * vector changes the representative, not the affine coset or permutation.
 * The normal coordinate is Cartesian in units a0 and is never reduced.
 */
export function layerActionReference({caseId='symmetric',operation='mirror',planeShift=0}={}){
 if(!Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,caseId)||!Object.hasOwn(OPS,operation)||![0,1].includes(planeShift))throw Error('The layer action card supports only its finite 001 reference.');
 const reference=LAYER_ACTIONS_REFERENCE.cases[caseId],symmetric=LAYER_ACTIONS_REFERENCE.cases.symmetric;
 const source=symmetric.operations.find(op=>same(op.matrix,OPS[operation].matrix));
 if(!source)throw Error('The stated operation is missing from the real API reference.');
 const translation=add(source.translation,[planeShift,0,0]);
 const rows=reference.positions.map((position,i)=>{
  const transformed=add(mv(source.matrix,position),translation);
  // Four explicitly supported sites; verify a unique geometric destination.
  const matches=reference.positions.map((target,j)=>{
   const delta=transformed.map((x,k)=>x-target[k]),wrap=[Math.round(delta[0]),Math.round(delta[1])];
   const residual=[delta[0]-wrap[0],delta[1]-wrap[1],delta[2]];
   return{j,target,wrap,normalDifference:delta[2],distance:Math.hypot(...residual)};
  }).filter(match=>match.distance<1e-8);
  if(matches.length!==1)throw Error('The bounded operation must have one geometric destination per site.');
  const match=matches[0];
  return{i,position:clone(position),transformed,...match,label:reference.labels[i],targetLabel:reference.labels[match.j],labelMatch:reference.labels[i]===reference.labels[match.j]};
 });
 const permutation=rows.map(row=>row.j),bijective=new Set(permutation).size===4;
 const retained=reference.operations.some(op=>same(op.matrix,source.matrix)&&same(op.translation,source.translation));
 return{caseId,operation,planeShift,matrix:clone(source.matrix),translation,baseTranslation:clone(source.translation),
  actualOperationIndex:symmetric.operations.indexOf(source),rows,permutation,bijective,
  geometryMatch:bijective&&rows.every(row=>row.distance<1e-8),labelMatch:bijective&&rows.every(row=>row.labelMatch),
  retained,operationCount:reference.operationCount,normalFlipCount:reference.normalFlipCount,
  lattice:clone(reference.lattice),normal:clone(reference.normal),lengthUnit:LAYER_ACTIONS_REFERENCE.lengthUnit};
}

/** Deliberately invalid normal translation: it is not an accepted operation.
 * Comparing to the same site exposes the spurious result of imposing a 4a0
 * normal period. No vacuum length is inferred from this finite slab.
 */
export function layerNormalBoundaryCounterexample(){
 const positions=LAYER_ACTIONS_REFERENCE.cases.symmetric.positions;
 return{translation:[0,0,4],incorrectNormalPeriod:4,correctAccepted:false,incorrectAccepted:true,
  rows:positions.map((position,i)=>({i,j:i,position:clone(position),transformed:add(position,[0,0,4]),
   planeWrap:[0,0],normalDifference:4,incorrectWrappedNormalDifference:0}))};
}
export function layerActionsLabRequest({caseId='symmetric'}={}){
 if(!Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,caseId))throw Error('Unsupported fixed slab case.');
 return{action:'layer_symmetry_lab',module:'layers',input:clone(LAYER_ACTIONS_REFERENCE.cases[caseId].input)};
}

const questions=[
 {prompt:'给法向镜面的平移代表再加一整格 a₁，会改变这四个原子的对应置换吗？',answer:'same',options:[['same','不变；只改变面内整数平移'],['different','改变，因为坐标数值变了'],['normal','必须同时把法向也取模']],feedback:{same:'正确。a₁=(1,0,0)a₀ 是面内晶格矢量。Rr+t+a₁ 对应相同的 j，面内整数平移增加 (1,0)，法向差不变。',different:'比较的对象是模面内晶格平移的薄层。坐标多了一个 a₁，但每个原子仍对应同一个 j。',normal:'两个面内周期方向已足够吸收 a₁；法向属于有限边界，不能为此取模。'}},
 {prompt:'只给最上层加上 surface-C 标签后，z 镜面还保留吗？',answer:'labels',options:[['labels','不保留：几何对应存在，但端点标签不符'],['geometry','保留：四个位置仍能一一对应'],['counts','保留：总原子数没有改变']],feedback:{labels:'正确。置换仍是 [3,2,1,0]，但 A 与 surface-C 在两端互换。几何匹配通过，同标签匹配失败；8 个翻法向操作被排除。',geometry:'位置双射是必要条件，还必须保持元素或指定标签。镜面把底部 A 送到顶部 surface-C。',counts:'原子总数相同不能代替逐原子的同标签双射。这里正是标签破坏了两侧交换。'}},
 {prompt:'把整个薄膜沿法向平移 4a₀，能否用“法向周期 4a₀”把它判成原薄膜的操作？',answer:'finite',options:[['finite','不能；未取模法向差仍是 4a₀'],['periodic','能；对 4a₀ 取模后距离为零'],['even','能；因为这次有四层且层数为偶数']],feedback:{finite:'正确。这里的法向是有限方向；4a₀ 是专门构造错误规则的数值，不是薄膜固有周期或真空厚度。',periodic:'这会把有限薄膜换成三维重复模型，制造不存在的平移对称。正确匹配保留法向差 4a₀。',even:'层数奇偶不产生法向平移周期。四层各自仍有上下边界，不能沿法向取模。'}}
];
const initial=()=>({open:false,normalOpen:false,caseId:'symmetric',operation:'mirror',planeShift:0,atom:0,step:0,normalMode:'correct',choices:['','',''],checked:[false,false,false],note:'',copyOutcome:''});
function restore(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const field of ['open','normalOpen'])if(typeof saved[field]==='boolean')state[field]=saved[field];
 if(Object.hasOwn(LAYER_ACTIONS_REFERENCE.cases,saved.caseId))state.caseId=saved.caseId;
 if(Object.hasOwn(OPS,saved.operation))state.operation=saved.operation;
 for(const field of ['planeShift','atom','step'])if(Number.isInteger(saved[field])&&saved[field]>=0&&saved[field]<=(field==='planeShift'?1:3))state[field]=saved[field];
 if(['correct','wrong'].includes(saved.normalMode))state.normalMode=saved.normalMode;
 questions.forEach((q,i)=>{if(q.options.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}});
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;return state;
}
function select(id,label,options,value){return'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+options.map(([v,text])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';}
const button=(id,text)=>'<button type="button" id="'+id+'">'+esc(text)+'</button>';
function questionHTML(prefix,i,state){const q=questions[i];return'<section class="lyab-question"><h4>'+esc(q.prompt)+'</h4>'+select(prefix+'-q'+i,'先选择预测，再核对',[['','请选择'],...q.options],state.choices[i])+button(prefix+'-check'+i,'核对预测')+'<p class="lyab-feedback" id="'+prefix+'-feedback'+i+'" role="status"></p></section>';}
function bodyHTML(prefix,state,canCopy){return p('先把一个原子亲手送到目标位置，再检查四个对应是否保持标签。这里固定简单立方母体的 (001) 四层原型，长度单位为母体晶格常数 a₀。')+
 '<div class="lyab-controls">'+select(prefix+'-caseId','固定薄层',[['symmetric','同标签的对称四层'],['marker','只给上表面加标记']],state.caseId)+select(prefix+'-operation','从真实参考中选择操作',Object.entries(OPS).map(([id,o])=>[id,o.label]),state.operation)+select(prefix+'-planeShift','面内平移代表',[[0,'原代表 t'],[1,'t + a₁（一整格）']],state.planeShift)+select(prefix+'-atom','逐项计算的源原子',[0,1,2,3].map(i=>[i,'原子 '+i]),state.atom)+'</div>'+questionHTML(prefix,0,state)+
 '<div class="lyab-actions">'+button(prefix+'-next','展开下一步')+button(prefix+'-previous','回到上一步')+'</div><p id="'+prefix+'-progress" role="status"></p><div class="lyab-output" id="'+prefix+'-output"></div>'+questionHTML(prefix,1,state)+
 '<details id="'+prefix+'-normal"><summary>'+esc('边界反例：如果错误地让法向周期化')+'</summary>'+p('本段故意尝试 t=(0,0,4)a₀，不属于上方真实操作。4a₀ 仅用于暴露错误规则，不是从层厚或真空推出的物理周期。')+select(prefix+'-normalMode','显示哪种判据',[['correct','正确：保留法向差'],['wrong','错误对照：强制法向对 4a₀ 取模']],state.normalMode)+'<div id="'+prefix+'-normal-output"></div></details>'+questionHTML(prefix,2,state)+
 '<label class="lyab-notes" for="'+prefix+'-note">'+esc('用自己的话记录：几何、标签和边界分别检查了什么（仅本页会话）')+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+p('范围：只展示固定 (001) 四层原型从立方母体继承的有限操作。此处的 16、8 是模面内平移的操作代表数，不是一般层群分类结果，也不是三维空间群群阶。')+
 (canCopy?'<section class="lyab-copy"><h4>'+esc('把完整结构输入复制到原实验')+'</h4>'+p('复制当前同标签或上表面标记结构的全部受支持参数。所选操作、代表平移、预测和笔记只用于此处回放；原实验会重新枚举全部操作。复制后请检查参数并手动运行。')+button(prefix+'-copy','复制输入，等待手动运行')+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p><a href="#classroom/crystal?module=layers&lesson=layer-periodicity&tab=lab">'+esc('打开原层对称实验')+'</a></p>')+button(prefix+'-reset','重置这张可选卡片');}
function output(state){
 const r=layerActionReference(state),row=r.rows[state.atom];
 let html='<h4>'+esc('先约定晶格与坐标')+'</h4>'+p('所有三维坐标均为笛卡尔坐标除以 a₀；晶格矩阵的列是 a₁、a₂、法向单位矢量。只有前两列是周期方向，第三列用于表达法向长度，不能当作周期。')+formula('a_1/a_0=(1,0,0),\\quad a_2/a_0=(0,1,0),\\quad n=(0,0,1)')+formula('r_{'+row.i+'}/a_0='+column(row.position)+',\\quad R='+matrix(r.matrix)+',\\quad t/a_0='+column(r.translation));
 if(state.step>=1)html+='<h4>'+esc('逐行乘矩阵，再加平移')+'</h4>'+formula('r^{\\prime}/a_0=R(r/a_0)+t/a_0='+column(row.transformed))+table('选中原子的三个分量',['分量','乘加计算','结果 / a₀'],r.matrix.map((coeff,i)=>[['x′','y′','z′'][i],coeff.map((v,j)=>'('+fmt(v)+')×('+fmt(row.position[j])+')').join(' + ')+' + '+fmt(r.translation[i]),fmt(row.transformed[i])]))+p('先保留变换后的完整坐标。下一步再找目标原子与面内整数平移。');
 if(state.step>=2)html+='<h4>'+esc('找到唯一目标，再分别核对几何与标签')+'</h4>'+formula('r_i^{\\prime}-r_j=m_1a_1+m_2a_2+\\Delta z\\,n')+table('四个原子的完整对应；索引从 0 开始',['i / 源标签','rᵢ / a₀','(Rrᵢ+t) / a₀','j / 目标标签','rⱼ / a₀','(m₁,m₂)','未取模 Δz / a₀','同标签'],r.rows.map(a=>[a.i+' / '+a.label,vec(a.position),vec(a.transformed),a.j+' / '+a.targetLabel,vec(a.target),vec(a.wrap),fmt(a.normalDifference),bool(a.labelMatch)]))+p('目标索引置换：['+r.permutation.join(',')+']。每个目标恰好出现一次；几何双射'+bool(r.geometryMatch)+'，同标签双射'+bool(r.labelMatch)+'。');
 if(state.step>=3)html+='<h4>'+esc('把局部匹配连回原实验')+'</h4>'+table('当前固定结构的真实 API 结果',['检验','结果'],[['保留操作代表数',r.operationCount],['其中翻转法向的代表数',r.normalFlipCount],['当前候选操作保留',bool(r.retained)],['几何匹配',bool(r.geometryMatch)],['同标签匹配',bool(r.labelMatch)]])+p(state.caseId==='marker'?'上表面标记不移动位置。对于翻转法向的镜面或反演，几何置换仍成立，但 A 与 surface-C 不可互换。真实 API 因此只保留 8 个操作，且无翻法向操作。':'同标签对称四层保留 16 个操作，其中 8 个翻转法向。z 镜面给出 [3,2,1,0]；一整格面内代表平移不改变这一置换。')+p('参考来自当前公开 Python API；矩阵、置换和计数随资产一同记录。展开原实验可核对全部保留操作。');
 return html;
}
function normalOutput(state){const c=layerNormalBoundaryCounterexample(),wrong=state.normalMode==='wrong';return formula('t/a_0=(0,0,4),\\quad\\Delta z/a_0=4')+table('同一有限薄膜的边界判据对照',['i → j','变换后坐标 / a₀','面内整数平移','未取模 Δz / a₀','当前规则给出的法向差 / a₀'],c.rows.map(row=>[row.i+' → '+row.j,vec(row.transformed),vec(row.planeWrap),4,wrong?0:4]))+p(wrong?'错误规则把法向差 4a₀ 人为压成 0，伪造出平移对称；这已经改变了边界条件。请切回正确规则对照。':'正确规则拒绝该平移：没有任何目标原子能吸收未取模的法向差。面内周期和原子总数均不能补救这一点。');}

export function layerActionsBridgeHTML(lessonId){
 if(!Object.hasOwn(LAYER_ACTIONS_BRIDGE_HOOKS,lessonId))return'';
 const prefix='lyab-'+lessonId;
 return'<section class="lyab-card"><p class="lyab-optional">'+esc('可选动手桥梁 · 从一个原子到整个薄层的对称操作')+'</p><details class="lyab-details" id="'+prefix+'-details"><summary>'+esc('逐原子检查：镜面、标签与有限边界')+'</summary><div class="lyab-body" id="'+prefix+'-body"></div></details></section>';
}
const owners=new WeakMap();
export function bindLayerActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const prefix='lyab-'+lessonId,key=prefix,detail=root?.querySelector('#'+prefix+'-details'),body=root?.querySelector('#'+prefix+'-body');
 if(!detail||!body||!Object.hasOwn(LAYER_ACTIONS_BRIDGE_HOOKS,lessonId)){const noop=()=>{};noop.snapshot=()=>({});return noop;}
 const token={};owners.set(detail,token);let alive=true,ticket=0,busy=false,state=restore(stateStore.get(key));
 const $=name=>body.querySelector('#'+prefix+'-'+name);
 const owned=()=>owners.get(detail)===token&&root.querySelector('#'+prefix+'-details')===detail;
 const current=()=>alive&&owned()&&detail.isConnected!==false&&isCurrent();
 const save=()=>{if(current())stateStore.set(key,clone(state));};
 const open=node=>typeof node.open==='boolean'?node.open:node.getAttribute?.('open')!==null;
 function capture(){if(!current())return;state.open=open(detail);state.normalOpen=open($('normal'));for(const field of ['caseId','operation','normalMode'])state[field]=$(field).value;for(const field of ['atom','planeShift'])state[field]=Number($(field).value);questions.forEach((_q,i)=>{state.choices[i]=$('q'+i).value;});state.note=String($('note').value).slice(0,2000);save();}
 function update(){
  if(!current())return;$('output').innerHTML=output(state);$('normal-output').innerHTML=normalOutput(state);
  $('progress').textContent=['准备：先预测面内平移的作用','第 1 步 / 3：算出完整变换坐标','第 2 步 / 3：检查四个原子的双射','第 3 步 / 3：连接真实操作计数'][state.step];
  $('next').disabled=state.step>=3||!state.choices[0];$('previous').disabled=state.step===0;
  questions.forEach((q,i)=>{$('check'+i).disabled=!state.choices[i];const feedback=$('feedback'+i);feedback.textContent=state.checked[i]?q.feedback[state.choices[i]]:'';feedback.setAttribute('class','lyab-feedback'+(state.checked[i]?(state.choices[i]===q.answer?' lyab-correct':' lyab-retry'):''));});
  if($('copy')){$('copy').disabled=busy;$('copy-status').textContent=state.copyOutcome==='success'?'输入已复制；请在原实验中检查参数并手动运行。':state.copyOutcome==='error'?'本次复制未完成，可重新尝试。':'';}save();
 }
 body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');detail.open=state.open;$('normal').open=state.normalOpen;
 const handlers=[];
 function bind(name,event,fn){const node=$(name);if(!node)return;const handler=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();fn(node);update();};node[event]=handler;handlers.push([node,event,handler]);}
 detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};const detailToggle=detail.ontoggle;
 const normal=$('normal');normal.ontoggle=()=>{if(current()&&$('normal')===normal){state.normalOpen=open(normal);save();}};handlers.push([normal,'ontoggle',normal.ontoggle]);
 for(const name of ['caseId','operation','planeShift','atom','normalMode'])bind(name,'onchange',()=>{ticket++;busy=false;state.copyOutcome='';});
 questions.forEach((_q,i)=>{bind('q'+i,'onchange',()=>{state.checked[i]=false;});bind('check'+i,'onclick',()=>{state.checked[i]=true;});});
 bind('next','onclick',()=>{state.step=Math.min(3,state.step+1);});bind('previous','onclick',()=>{state.step=Math.max(0,state.step-1);});
 bind('note','oninput',()=>{});
 bind('reset','onclick',()=>{ticket++;busy=false;const wasOpen=state.open;state={...initial(),open:wasOpen};for(const name of ['caseId','operation','planeShift','atom','normalMode'])$(name).value=String(state[name]);questions.forEach((_q,i)=>{$('q'+i).value='';});$('note').value='';$('normal').open=false;});
 const copy=$('copy');if(copy){const handler=async()=>{
  if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=layerActionsLabRequest(state);busy=true;state.copyOutcome='';update();
  try{const accepted=await onOpenLab(payload);if(current()&&job===ticket){state.copyOutcome=accepted===false?'error':'success';}}
  catch{if(current()&&job===ticket)state.copyOutcome='error';}
  finally{if(job===ticket){busy=false;if(current())update();}}
 };copy.onclick=handler;handlers.push([copy,'onclick',handler]);}
 update();
 const cleanup=()=>{if(!alive)return;if(current())capture();alive=false;ticket++;if(owned()){if(detail.ontoggle===detailToggle)detail.ontoggle=null;for(const[node,event,handler]of handlers)if(node[event]===handler)node[event]=null;owners.delete(detail);}};
 cleanup.snapshot=()=>{capture();return{'atom-layer-map':clone(state)};};return cleanup;
}
