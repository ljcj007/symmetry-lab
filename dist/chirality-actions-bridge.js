import {mathHTML} from './math-display.js?v=20261113-prose2';
import {CHIRALITY_ACTIONS_REFERENCE} from './chirality-actions-reference.js?v=20261115-derivations1';

export const CHIRALITY_ACTIONS_BRIDGE_HOOKS=Object.freeze({
 'chiral-mirror':Object.freeze(['mirror-trace']),
 'chiral-polarity':Object.freeze(['polar-constraints'])
});
export {CHIRALITY_ACTIONS_REFERENCE};
// Fixed coordinate arithmetic for four captured API examples. No general
// matching, nullspace solver, material classifier or worker is introduced.
const CASES=[['d3','D₃：手性、非极性'],['pyramid','C₄ᵥ：非手性、允许极轴'],['octahedron','Oₕ：有反演、非极性'],['tetra','C₁：四个不同标签']];
const GENERATORS={c3:'绕 z 的 120° 旋转',c2:'绕 x 的 180° 旋转',c4:'绕 z 的 90° 旋转',mirror:'含 z 轴的竖直镜面',inversion:'反演',cycle:'绕 (1,1,1) 的 120° 旋转',identity:'恒等操作'};
const I=[[1,0,0],[0,1,0],[0,0,1]],M=[[-1,0,0],[0,1,0],[0,0,1]],B=[[0,0,1],[0,1,0],[-1,0,0]];
const clone=x=>JSON.parse(JSON.stringify(x)),transpose=a=>a[0].map((_v,i)=>a.map(row=>row[i]));
const mv=(a,x)=>a.map(row=>row.reduce((sum,v,j)=>sum+v*x[j],0));
const multiply=(a,b)=>a.map(row=>b[0].map((_v,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),norm=x=>Math.hypot(...x);
const det=a=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
const coordinates=mode=>{if(!['original','passive'].includes(mode))throw Error('Unsupported finite component convention.');return mode==='original'?I:B;};
const inBasis=(matrix,basis)=>multiply(multiply(basis,matrix),transpose(basis));
const referenceFor=id=>{if(!Object.hasOwn(CHIRALITY_ACTIONS_REFERENCE.cases,id))throw Error('Unsupported finite motif.');return CHIRALITY_ACTIONS_REFERENCE.cases[id];};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.abs(x)<1e-10?'0':String(Number(x.toFixed(12)));
const vec=x=>'('+x.map(fmt).join(', ')+')';
const matrix=a=>'\\begin{pmatrix}'+a.map(row=>row.map(fmt).join('&')).join('\\\\')+'\\end{pmatrix}';
const column=x=>matrix(x.map(v=>[v]));
const formula=text=>'<div class="chab-formula" tabindex="0">'+mathHTML(text,true)+'</div>';
const p=text=>'<p>'+esc(text)+'</p>',h=text=>'<h4>'+esc(text)+'</h4>';
const pass=value=>value?'通过':'不通过';
const table=(caption,heads,rows)=>'<div class="chab-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(text=>'<th scope="col">'+esc(text)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((text,j)=>j?'<td>'+esc(text)+'</td>':'<th scope="row">'+esc(text)+'</th>').join('')+'</tr>').join('')+'</tbody></table></div>';

/** One stored optimal same-label bijection; symmetric motifs may have other
 * equally good minimizers. Each destination appears once in this chosen map.
 * 'forbidden' is deliberately improper and cannot establish achirality.
 */
export function chiralityActionReference({caseId='d3',components='original',mode='proper',structure=0}={}){
 const reference=referenceFor(caseId),basis=coordinates(components);
 if(!['proper','forbidden'].includes(mode)||!Number.isInteger(structure)||structure<0||structure>=reference.generators.length)throw Error('Unsupported finite alignment view.');
 const mirror=inBasis(M,basis),correctRotation=inBasis(reference.mirrorFit.rotation,basis),rotation=mode==='proper'?correctRotation:mirror;
 const translation=mv(basis,reference.fitTranslation),positions=reference.geometry.points.map(x=>mv(basis,x));
 const rows=positions.map((position,i)=>{
  const reflected=mv(mirror,position),transformed=mv(rotation,reflected).map((v,k)=>v+translation[k]),j=reference.geometry.permutation[i];
  // The wrong inverse-mirror rule uses the identity correspondence, while the
  // correct view preserves the actual chosen best-fit permutation from Python.
  const targetIndex=mode==='proper'?j:i,target=positions[targetIndex],residual=sub(transformed,target);
  return{i,label:reference.geometry.labels[i],position,reflected,transformed,j:targetIndex,targetLabel:reference.geometry.labels[targetIndex],target,residual,distance:norm(residual)};
 });
 const generator=reference.generators[structure],structuralMatrix=inBasis(generator.matrix,basis),structuralRows=positions.map((position,i)=>({i,j:generator.permutation[i],image:mv(structuralMatrix,position),target:positions[generator.permutation[i]]}));
 return{caseId,components,mode,mirror,rotation,correctRotation,translation,basis,rows,
  rms:Math.sqrt(rows.reduce((sum,row)=>sum+row.distance**2,0)/rows.length),maximum:Math.max(...rows.map(row=>row.distance)),determinant:det(rotation),
  allowedAlignment:mode==='proper',bijective:new Set(rows.map(row=>row.j)).size===rows.length,labelPreserved:rows.every(row=>row.label===row.targetLabel),
  actualProperRMS:reference.mirrorFit.rms,chiral:reference.chiral,polarDimension:reference.polarDimension,
  structure:{id:generator.id,matrix:structuralMatrix,determinant:generator.determinant,rows:structuralRows}};
}

/** Prefix projectors are finite real-API generator references, not a browser
 * SVD. Component changes transform P and all operation matrices together.
 */
export function chiralityPolarReference({caseId='pyramid',components='original',trial='z',amplitude=1}={}){
 const reference=referenceFor(caseId),basis=coordinates(components),vectors={z:[0,0,1],x:[1,0,0],sum:[1,1,1],zero:[0,0,0]};
 if(!Object.hasOwn(vectors,trial)||![0,1,2].includes(amplitude))throw Error('Unsupported finite polar-vector trial.');
 const vector=mv(basis,vectors[trial].map(v=>v*amplitude)),projector=inBasis(reference.polarProjector,basis);
 const generators=reference.generators.map((generator,i)=>{const matrix=inBasis(generator.matrix,basis),image=mv(matrix,vector),residual=sub(image,vector);return{id:generator.id,matrix,image,residual,norm:norm(residual),projector:inBasis(reference.prefixProjectors[i+1],basis)};});
 return{caseId,components,trial,amplitude,basis,vector,projector,projected:mv(projector,vector),generators,
  allowed:generators.every(g=>g.norm<1e-8),dimension:reference.polarDimension,chiral:reference.chiral,
  zeroAllowed:true,operationCount:reference.operations.length};
}
export function chiralityActionsLabRequest({caseId='d3'}={}){
 return{action:'chirality_polarity_lab',module:'chirality',input:clone(referenceFor(caseId).input)};
}

const QUESTIONS={
 'mirror-trace':[
  {prompt:'把镜像再反射一次就能完全重合。这能证明原结构非手性吗？',answer:'proper',options:[['proper','不能；配准只能使用行列式 +1 的旋转'],['zero','能；只要配准残差为零'],['labels','能；只要元素标签保持']],feedback:{proper:'正确。逆镜像的行列式为 −1。若把它也放进配准，任何结构都可回到自身，手性检验就失去区分能力。',zero:'零残差必须连同允许的操作一起报告。再次反射虽能回到原构型，却不属于保向刚体配准。',labels:'保持标签是必要条件，还必须要求配准旋转保向。逆镜像仍是行列式 −1 的禁止操作。'}},
  {prompt:'下方结构自身的对称矩阵 R，是否就是镜像最佳配准矩阵 Q？',answer:'roles',options:[['roles','两者作用的源点集不同，应分别检查'],['same','必须相同，因为都是矩阵'],['coordinate','改一下坐标就能把手性消掉']],feedback:{roles:'正确。R 作用于原构型并保持它；Q 作用于镜像，寻找与原构型的最佳对应。先写清源点集与目标，才能比较矩阵。',same:'矩阵大小相同不代表任务相同。原结构的稳定操作与镜像的最优配准须分别命名。',coordinate:'一致地更换坐标会同时变换点、镜像和矩阵，保留配准距离与手性；它不改变物理构型。'}}
 ],
 'polar-constraints':[
  {prompt:'D₃ 的三重旋转允许 z 方向，是否已经证明该结构有极轴？',answer:'all',options:[['all','还要联立绕 x 的二重旋转约束'],['one','是；一个操作保持就足够'],['chiral','是；手性必然允许极轴']],feedback:{all:'正确。三重旋转先留下 Pz；绕 x 的二重旋转再把 Pz 变号。两者同时满足时只剩零向量。',one:'一个操作的固定子空间还不是整个群的固定子空间。继续检查剩下的生成元。',chiral:'手性与极性是两项独立判断。D₃ 所有操作保向，但共同保持的极向量只有零向量。'}},
  {prompt:'C₄ᵥ 允许 P=λez，能否据此确定 λ 或证明铁电切换？',answer:'zero',options:[['zero','不能；λ=0 也满足全部对称约束'],['magnitude','能；允许方向的长度就是极化强度'],['switch','能；有极轴就一定能被电场翻转']],feedback:{zero:'正确。对称性给出齐次约束与允许方向，λ 的大小、平衡状态及可逆切换需要额外物理信息。',magnitude:'投影矩阵给出子空间，不给出材料响应幅值。这里的试探向量和 λ 只是核对代数的无量纲输入。',switch:'有极轴不等于已证明铁电性。对称约束未提供自由能、翻转势垒或实验切换证据。'}}
 ]
};
const kindFor=lessonId=>CHIRALITY_ACTIONS_BRIDGE_HOOKS[lessonId]?.[0];
const initial=kind=>({open:false,conventionsOpen:false,caseId:kind==='mirror-trace'?'d3':'pyramid',components:'original',mode:'proper',structure:0,atom:0,trial:'z',amplitude:1,step:0,choices:['',''],checked:[false,false],note:'',copyOutcome:''});
function restore(saved,kind){
 const state=initial(kind);if(!saved||typeof saved!=='object')return state;
 for(const field of ['open','conventionsOpen'])if(typeof saved[field]==='boolean')state[field]=saved[field];
 if(Object.hasOwn(CHIRALITY_ACTIONS_REFERENCE.cases,saved.caseId))state.caseId=saved.caseId;
 if(['original','passive'].includes(saved.components))state.components=saved.components;
 if(['proper','forbidden'].includes(saved.mode))state.mode=saved.mode;
 if(['z','x','sum','zero'].includes(saved.trial))state.trial=saved.trial;
 for(const field of ['atom','structure','step','amplitude'])if(Number.isInteger(saved[field])&&saved[field]>=0&&saved[field]<=(field==='step'?3:field==='amplitude'?2:field==='atom'?referenceFor(state.caseId).geometry.points.length-1:referenceFor(state.caseId).generators.length-1))state[field]=saved[field];
 QUESTIONS[kind].forEach((question,i)=>{if(question.options.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}});
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);return state;
}
const options=(rows,value)=>rows.map(([id,label])=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>').join('');
const select=(id,label,rows,value)=>'<label for="'+id+'">'+esc(label)+'<select id="'+id+'">'+options(rows,value)+'</select></label>';
const button=(id,label)=>'<button type="button" id="'+id+'">'+esc(label)+'</button>';
function questionHTML(prefix,kind,i,state){const q=QUESTIONS[kind][i];return'<section class="chab-question">'+h(q.prompt)+select(prefix+'-q'+i,'先预测，再核对',[['','请选择'],...q.options],state.choices[i])+button(prefix+'-check'+i,'核对预测')+'<p id="'+prefix+'-feedback'+i+'" class="chab-feedback" role="status"></p></section>';}
function bodyHTML(prefix,kind,state,canCopy){
 const mirror=kind==='mirror-trace';
 return p(mirror?'从一个已声明的原子坐标出发，区分物理镜像、保向配准和原结构自身的对称操作。':'把同一个试探极向量送过每个生成元，亲手找出所有约束共同允许的子空间。')+
 '<div class="chab-controls">'+select(prefix+'-caseId','固定有限原型',CASES,state.caseId)+select(prefix+'-components','坐标分量约定',[['original','原坐标分量'],['passive','固定被动换基，所有对象一起变换']],state.components)+
 (mirror?select(prefix+'-mode','镜像配准规则',[['proper','允许：最佳保向旋转'],['forbidden','错误反例：再做镜像（配准中禁止）']],state.mode)+select(prefix+'-atom','逐项跟踪的源原子',[],state.atom)+select(prefix+'-structure','独立比较：原结构的生成元',[],state.structure):select(prefix+'-trial','原坐标中定义的试探方向',[['z','原 z 方向'],['x','原 x 方向'],['sum','原 (1,1,1) 方向'],['zero','零向量']],state.trial)+select(prefix+'-amplitude','代数试探系数 λ（无量纲）',[[0,'0'],[1,'1'],[2,'2']],state.amplitude))+'</div>'+questionHTML(prefix,kind,0,state)+
 '<div class="chab-actions">'+button(prefix+'-next','展开下一步')+button(prefix+'-previous','回到上一步')+'</div><p id="'+prefix+'-progress" role="status"></p><div id="'+prefix+'-output" class="chab-output"></div>'+questionHTML(prefix,kind,1,state)+
 '<details id="'+prefix+'-conventions"><summary>'+esc('核对坐标、长度与允许操作的约定')+'</summary>'+p('四个原型都是已居中的有限点集；坐标和残差使用模型长度。列向量按主动操作 r′=Rr 变换；参考中的行坐标等价地右乘 R 的转置。配准平移 t=0。')+formula('r_{\\rm new}=B r_{\\rm old},\\quad R_{\\rm new}=B R_{\\rm old} B^{T},\\quad B='+matrix(B))+p('这里的 B 只更换同一物理对象的分量描述。点、镜像矩阵、配准矩阵、试探向量及子空间投影矩阵都一起变换。原 z 方向在新分量中成为 x 方向，距离、手性与允许维数不变。')+'</details>'+
 '<label class="chab-notes" for="'+prefix+'-note">'+esc('记录源对象、允许操作与判断依据（仅本页会话）')+'<textarea id="'+prefix+'-note" rows="3" maxlength="2000">'+esc(state.note)+'</textarea></label>'+p('这些参考仅覆盖当前四个有限原型。石英与极性晶体在原课堂中提供材料背景；本卡片不把点集当作材料原胞，也不由几何约束输出响应幅值。')+
 (canCopy?'<section class="chab-copy">'+h('复制完整原型输入到原实验')+p('复制当前原型的六个真实结构与教学参数，重新打开可编辑表单，等待手动运行。局部配准规则、原子、坐标换基和试探向量只用于此处回放。原实验保留已有的独立偏振模型。')+button(prefix+'-copy','复制输入，等待手动运行')+'<p id="'+prefix+'-copy-status" role="status"></p></section>':'<p><a href="#classroom/observables?module=chirality&tab=lab">'+esc('打开原手性与极性实验')+'</a></p>')+button(prefix+'-reset','重置这张可选卡片');
}
function mirrorOutput(state){
 const r=chiralityActionReference(state),row=r.rows[state.atom];
 let html=h('先声明源点集与镜像')+p('M 把原构型变成镜像；Q 作用于镜像，寻找与原构型的同标签对应。这四个参考的源点集与镜像均已中心化，因此配准平移 t=0。')+formula('r_{'+row.i+'}='+column(row.position)+',\\quad M='+matrix(r.mirror)+',\\quad \\det M=-1');
 if(state.step>=1)html+=h('先反射，再应用所选配准')+formula('Mr_{'+row.i+'}='+column(row.reflected)+',\\quad Q='+matrix(r.rotation))+formula('QMr_{'+row.i+'}+t='+column(row.transformed)+',\\quad t='+column(r.translation)+',\\quad\\det Q='+fmt(r.determinant))+p(r.allowedAlignment?'当前 Q 是来自真实 API 的最佳保向配准，行列式为 +1。':'禁止用这个 Q 判断手性：它就是逆镜像，行列式为 −1。任何结构经两次相同反射都会回到原状。');
 if(state.step>=2)html+=h('逐原子核对选定的同标签双射')+table('本次选定双射：每个目标出现一次；等价最优配准可以不唯一',['i / 标签','rᵢ','Mrᵢ','QMrᵢ+t','j / 标签','rⱼ','差向量','距离'],r.rows.map(a=>[a.i+' / '+a.label,vec(a.position),vec(a.reflected),vec(a.transformed),a.j+' / '+a.targetLabel,vec(a.target),vec(a.residual),fmt(a.distance)]))+formula('\\mathrm{RMS}=\\sqrt{\\frac{1}{N}\\sum_i\\lVert QMr_i+t-r_{p(i)}\\rVert^2}='+fmt(r.rms))+table('把数值与允许的操作一起报告',['检验','结果'],[['目标一一对应',pass(r.bijective)],['标签保持',pass(r.labelPreserved)],['最大残差',fmt(r.maximum)],['当前规则允许作为配准',pass(r.allowedAlignment)],['真实最佳保向配准 RMS',fmt(r.actualProperRMS)]])+p('当前原型的几何手性：'+(r.chiral?'是':'否')+'。这个结论使用真实保向检验，不随禁止反例的零残差改写。');
 if(state.step>=3)html+=h('分清结构自身的 R 与镜像配准的 Q')+p('下面的 R 是原结构的真实生成元，作用于原构型；上方 Q 检查镜像与原结构的最佳对应。两者的源点集和任务不同。')+formula('Rr_i=r_{p(i)},\\quad R='+matrix(r.structure.matrix)+',\\quad\\det R='+r.structure.determinant)+table('所选结构生成元作用于原点集',['i','Rrᵢ','j','rⱼ'],r.structure.rows.map(a=>[a.i,vec(a.image),a.j,vec(a.target)]))+p('D₃ 的真实最佳保向残差非零；C₄ᵥ 锥体的残差为零。C₄ᵥ 含镜面同时允许极轴，可在另一张极性卡片中继续联立约束。');
 return html;
}
function polarOutput(state){
 const r=chiralityPolarReference(state),count=Math.min(state.step,r.generators.length);
 let html=h('先声明同一个试探极向量')+p('试探系数只用来检验代数约束，没有材料极化单位。λ=0 也是合法输入。改变分量约定时，这个同一物理试探方向会一起换分量。')+formula('P='+column(r.vector)+',\\quad (R-I)P=0');
 for(let i=0;i<count;i++){const g=r.generators[i];html+=h(GENERATORS[g.id])+formula('R='+matrix(g.matrix)+',\\quad RP='+column(g.image)+',\\quad RP-P='+column(g.residual))+formula('\\Pi_{'+(i+1)+'}='+matrix(g.projector))+p('这个投影矩阵对应到当前生成元为止的共同固定子空间。继续联立后，允许子空间只能保持或缩小。');}
 if(state.step>=2)html+=h('检查全部生成元的共同固定空间')+formula('\\Pi='+matrix(r.projector)+',\\quad\\Pi P='+column(r.projected))+table('同一个试探向量的全部约束',['生成元','RP−P','残差范数'],r.generators.map(g=>[GENERATORS[g.id],vec(g.residual),fmt(g.norm)]))+p('全部生成元约束：'+pass(r.allowed)+'；允许极向量子空间维数：'+r.dimension+'。')+p('D₃ 的三重旋转先留下 z 方向，绕 x 的二重旋转再把它反号；C₄ᵥ 的四重旋转与竖直镜面共同保留 z 方向。');
 if(state.step>=3)html+=h('分开比较手性、许可与幅值')+table('四个真实有限原型的独立判断',['原型','几何手性','允许维数'],CASES.map(([id,name])=>[name,referenceFor(id).chiral?'是':'否',referenceFor(id).polarDimension]))+formula('\\Pi 0=0,\\quad (R-I)0=0')+p('零向量满足所有这些齐次方程。C₄ᵥ 允许 P=λez，但这不选定 λ，也不提供自发极化、自由能或可逆铁电切换的证据。')+p('SVD 给出的基向量可能换号或换序；投影矩阵表示的是同一个子空间。被动换基后比较 BΠBᵀ，而不是逐字比较基向量。');
 return html;
}

export function chiralityActionsBridgeHTML(lessonId){
 const kind=kindFor(lessonId);if(!kind)return'';const prefix='chab-'+lessonId;
 return'<section class="chab-card"><p class="chab-optional">'+esc('可选动手桥梁 · 手性、极性与坐标约定')+'</p><details id="'+prefix+'-details" class="chab-details"><summary>'+esc(kind==='mirror-trace'?'逐原子追踪镜像与保向配准':'逐个生成元求允许极向量')+'</summary><div id="'+prefix+'-body" class="chab-body"></div></details></section>';
}
const owners=new WeakMap();
export function bindChiralityActionsBridge({root,lessonId,isCurrent=()=>true,stateStore=new Map(),onOpenLab}={}){
 const kind=kindFor(lessonId),prefix='chab-'+lessonId,detail=root?.querySelector('#'+prefix+'-details'),body=root?.querySelector('#'+prefix+'-body');
 if(!kind||!detail||!body){const noop=()=>{};noop.snapshot=()=>({});return noop;}
 const token={};owners.set(detail,token);let alive=true,ticket=0,busy=false,state=restore(stateStore.get(prefix),kind);
 const $=name=>body.querySelector('#'+prefix+'-'+name),owned=()=>owners.get(detail)===token&&root.querySelector('#'+prefix+'-details')===detail;
 const current=()=>alive&&owned()&&detail.isConnected!==false&&isCurrent();
 const open=node=>typeof node.open==='boolean'?node.open:node.getAttribute?.('open')!==null;
 const save=()=>{if(current())stateStore.set(prefix,clone(state));};
 function capture(){if(!current())return;state.open=open(detail);state.conventionsOpen=open($('conventions'));for(const name of ['caseId','components','mode','trial'])if($(name))state[name]=$(name).value;for(const name of ['atom','structure','amplitude'])if($(name))state[name]=Number($(name).value);QUESTIONS[kind].forEach((_q,i)=>{state.choices[i]=$('q'+i).value;});state.note=String($('note').value).slice(0,2000);save();}
 function update(){
  if(!current())return;
  if(kind==='mirror-trace'){
   const ref=referenceFor(state.caseId);state.atom=Math.min(state.atom,ref.geometry.points.length-1);state.structure=Math.min(state.structure,ref.generators.length-1);
   for(const[name,rows]of [['atom',ref.geometry.points.map((_v,i)=>[i,'原子 '+i])],['structure',ref.generators.map((g,i)=>[i,GENERATORS[g.id]])]]){const node=$(name),html=options(rows,state[name]);if(node.innerHTML!==html)node.innerHTML=html;node.value=String(state[name]);}
  }
  $('output').innerHTML=kind==='mirror-trace'?mirrorOutput(state):polarOutput(state);
  $('progress').textContent=['准备：先预测允许的操作与约束','第 1 步 / 3：跟踪一个操作','第 2 步 / 3：核对全部对应或约束','第 3 步 / 3：比较条件与反例'][state.step];
  $('next').disabled=state.step>=3||!state.choices[0];$('previous').disabled=state.step===0;
  QUESTIONS[kind].forEach((q,i)=>{$('check'+i).disabled=!state.choices[i];$('feedback'+i).textContent=state.checked[i]?q.feedback[state.choices[i]]:'';});
  if($('copy')){$('copy').disabled=busy;$('copy-status').textContent=state.copyOutcome==='success'?'输入已复制；请在原实验中检查参数并手动运行。':state.copyOutcome==='error'?'本次复制未完成，可重新尝试。':'';}save();
 }
 body.innerHTML=bodyHTML(prefix,kind,state,typeof onOpenLab==='function');detail.open=state.open;$('conventions').open=state.conventionsOpen;
 const handlers=[];
 const bind=(name,event,action)=>{const node=$(name);if(!node)return;const fn=()=>{if(!current()||$(name)!==node||node.disabled)return;capture();action(node);update();};node[event]=fn;handlers.push([node,event,fn]);};
 detail.ontoggle=()=>{if(current()){state.open=open(detail);save();}};const detailToggle=detail.ontoggle;
 const conventions=$('conventions');conventions.ontoggle=()=>{if(current()&&$('conventions')===conventions){state.conventionsOpen=open(conventions);save();}};handlers.push([conventions,'ontoggle',conventions.ontoggle]);
 for(const name of ['caseId','components','mode','trial','atom','structure','amplitude'])bind(name,'onchange',()=>{ticket++;busy=false;state.copyOutcome='';});
 QUESTIONS[kind].forEach((_q,i)=>{bind('q'+i,'onchange',()=>{state.checked[i]=false;});bind('check'+i,'onclick',()=>{state.checked[i]=true;});});
 bind('next','onclick',()=>{state.step=Math.min(3,state.step+1);});bind('previous','onclick',()=>{state.step=Math.max(0,state.step-1);});bind('note','oninput',()=>{});
 bind('reset','onclick',()=>{ticket++;busy=false;state={...initial(kind),open:state.open};for(const name of ['caseId','components','mode','trial','atom','structure','amplitude'])if($(name))$(name).value=String(state[name]);QUESTIONS[kind].forEach((_q,i)=>{$('q'+i).value='';});$('note').value='';$('conventions').open=false;});
 const copy=$('copy');if(copy){const fn=async()=>{if(!current()||$('copy')!==copy||busy)return;capture();const job=++ticket,payload=chiralityActionsLabRequest(state);busy=true;state.copyOutcome='';update();try{const accepted=await onOpenLab(payload);if(current()&&job===ticket)state.copyOutcome=accepted===false?'error':'success';}catch{if(current()&&job===ticket)state.copyOutcome='error';}finally{if(job===ticket){busy=false;if(current())update();}}};copy.onclick=fn;handlers.push([copy,'onclick',fn]);}
 update();
 const cleanup=()=>{if(!alive)return;if(current())capture();alive=false;ticket++;if(owned()){if(detail.ontoggle===detailToggle)detail.ontoggle=null;for(const[node,event,fn]of handlers)if(node[event]===fn)node[event]=null;owners.delete(detail);}};
 cleanup.snapshot=()=>{capture();return{[kind]:clone(state)};};return cleanup;
}
