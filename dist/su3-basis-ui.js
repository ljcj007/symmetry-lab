import {mathHTML} from './math-display.js?v=20261113-prose2';

// Python constructs the canonical GT basis and every matrix column. This module
// validates the returned ledger, selects existing rows, and projects weights.
const IDS=Object.freeze(['E12','E21','E23','E32','E13','E31','H1','H2']);
const LADDERS=IDS.slice(0,6),SHIFTS=[[2,-1],[-2,1],[-1,2],[1,-2],[1,1],[-1,-1],[0,0],[0,0]];
const LESSONS=['su3-dynkin-representations','su3-cg-change-basis'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x)),record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<24000;
const integer=x=>Number.isInteger(x)&&Math.abs(x)<1000;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),near=(a,b)=>typeof a==='number'&&Number.isFinite(a)&&Math.abs(a-b)<1e-11*(1+Math.abs(b));
const owners=new WeakMap();
export const SU3_BASIS_PRESETS=Object.freeze([
 {id:'3',title:'3 · 基本表示',p:1,q:0},{id:'3bar',title:'3̄ · 共轭基本表示',p:0,q:1},
 {id:'8',title:'8 · 两个零权态',p:1,q:1},{id:'6',title:'6 · 对称二阶',p:2,q:0},
 {id:'10',title:'10 · 三阶表示',p:3,q:0},{id:'15',title:'15 · (2,1)',p:2,q:1},{id:'27',title:'27 · (2,2)',p:2,q:2}
]);
export function su3BasisRequest(raw={}){
 const values=['p','q'].map(k=>{const s=raw[k]??(k==='p'?'1':'0');if(typeof s!=='string'||!/^\d+$/.test(s.trim()))throw Error('p、q 须完整填写为非负整数，且 p + q ≤ 4；草稿会保留。');return Number(s.trim());});
 if(values.some(x=>!Number.isSafeInteger(x))||values[0]+values[1]>4)throw Error('p、q 须完整填写为非负整数，且 p + q ≤ 4；草稿会保留。');
 return{lab:'su3_basis',p:values[0],q:values[1]};
}
const identity=p=>record(p)?JSON.stringify({lab:p.lab,p:p.p,q:p.q}):'';
// Symbolic expressions and LaTeX come from one SymPy object in Python. We do
// not parse those strings. Repeated column/vector/term and coordinate packs
// must agree exactly; integer-only mirrors can also be checked directly.
const mirrored=(exact,numeric)=>text(exact)&&typeof numeric==='number'&&Number.isFinite(numeric)&&(!/^-?\d+$/.test(exact)||near(numeric,Number(exact)));
const scalar=p=>record(p)&&text(p.latex)&&mirrored(p.exact,p.numeric);
const vector=(p,d)=>record(p)&&p.dimension===d&&text(p.latex)&&Array.isArray(p.exact)&&p.exact.length===d&&Array.isArray(p.numeric)&&p.numeric.length===d&&p.exact.every((x,i)=>mirrored(x,p.numeric[i]));
const matrix=(p,d)=>record(p)&&same(p.shape,[d,d])&&text(p.latex)&&Array.isArray(p.exact)&&p.exact.length===d&&Array.isArray(p.numeric)&&p.numeric.length===d&&p.exact.every((r,i)=>Array.isArray(r)&&r.length===d&&Array.isArray(p.numeric[i])&&p.numeric[i].length===d&&r.every((x,j)=>mirrored(x,p.numeric[i][j])));
function stateRow(s,i,p,q){
 if(!record(s)||s.index!==i||!text(s.label)||!Array.isArray(s.pattern)||s.pattern.length!==3||!s.pattern.every(integer)||!Array.isArray(s.weight)||s.weight.length!==2||!s.weight.every(integer)||!['twoI','twoI3','threeY'].every(k=>integer(s[k])))return false;
 const [a,b,c]=s.pattern,[h1,h2]=s.weight,n=s.content?.n;
 if(!(p+q>=a&&a>=q&&q>=b&&b>=0&&a>=c&&c>=b)||s.twoI!==a-b||s.twoI3!==h1||s.threeY!==h1+2*h2)return false;
 if(!Array.isArray(s.interlacing)||s.interlacing.length!==6||!s.interlacing.every((r,j)=>record(r)&&r.leftLabel===['p+q','a','q','b','a','c'][j]&&r.rightLabel===['a','q','b','0','c','b'][j]&&integer(r.left)&&integer(r.right)&&r.passed===true&&r.left>=r.right))return false;
 if(!same(s.interlacing.map(r=>[r.left,r.right]),[[p+q,a],[a,q],[q,b],[b,0],[a,c],[c,b]]))return false;
 if(!record(s.content)||!same(n,[c,a+b-c,p+2*q-a-b])||s.content.total!==p+2*q||s.content.terms?.length!==3||!s.content.terms.every((t,j)=>record(t)&&text(t.id)&&text(t.label)&&text(t.expressionLatex)&&scalar(t.value)&&near(t.value.numeric,n[j])))return false;
 if(!record(s.cartan)||!['H1','H2','T3','T8'].every(k=>scalar(s.cartan[k]))||!near(s.cartan.H1.numeric,h1)||!near(s.cartan.H2.numeric,h2)||h1!==n[0]-n[1]||h2!==n[1]-n[2]||!near(s.cartan.T3.numeric,h1/2)||!near(s.cartan.T8.numeric,(h1+2*h2)/(2*Math.sqrt(3))))return false;
 return record(s.isospin)&&['I','I3','Y'].every(k=>scalar(s.isospin[k]))&&near(s.isospin.I.numeric,s.twoI/2)&&near(s.isospin.I3.numeric,h1/2)&&near(s.isospin.Y.numeric,s.threeY/3);
}
function rows(states,d,p,q){
 if(!Array.isArray(states)||states.length!==d||!states.every((s,i)=>stateRow(s,i,p,q))||new Set(states.map(s=>s.pattern.join(','))).size!==d)return false;
 const keys=states.map(s=>[s.weight[0]+s.weight[1],s.weight[0],...s.pattern]);
 return keys.every((k,i)=>!i||k.every((v,j)=>v===keys[i-1][j])||k.some((v,j)=>k.slice(0,j).every((x,l)=>x===keys[i-1][l])&&v<keys[i-1][j]));
}
function action(a,index,d,states,shift,m){
 if(!record(a)||a.sourceIndex!==index||!vector(a.vector,d)||!scalar(a.normSquared)||typeof a.zero!=='boolean'||!same(a.weightShift,shift)||!Array.isArray(a.terms)||a.terms.length>d)return false;
 const nonzero=a.vector.numeric.map((x,i)=>Math.abs(x)>1e-12?i:-1).filter(i=>i>=0);
 if(a.zero!==(nonzero.length===0)||!same(a.terms.map(t=>t?.targetIndex),nonzero)||!near(a.normSquared.numeric,a.vector.numeric.reduce((s,x)=>s+x*x,0)))return false;
 if(m&&!a.vector.exact.every((x,i)=>x===m.exact[i][index]&&a.vector.numeric[i]===m.numeric[i][index]))return false;
 return a.terms.every(t=>record(t)&&scalar(t.coefficient)&&t.coefficient.exact===a.vector.exact[t.targetIndex]&&t.coefficient.numeric===a.vector.numeric[t.targetIndex]&&same(states[t.targetIndex].weight.map((v,j)=>v-states[index].weight[j]),shift));
}
function checkedModel(r){
 if(!record(r)||r.schema!=='symmetry-lab-su3-basis-1'||r.lab!=='su3_basis'||r.exact!==true||!record(r.input)||!record(r.normalizedInput))return{status:'invalid'};
 const p=r.normalizedInput;if(p.lab!=='su3_basis'||!Number.isInteger(p.p)||!Number.isInteger(p.q)||p.p<0||p.q<0||p.p+p.q>4||identity(r.input)!==identity(p)||Object.keys(p).sort().join(',')!=='lab,p,q'||Object.keys(r.input).sort().join(',')!=='lab,p,q')return{status:'invalid'};
 const rep=r.representation,d=rep?.dimension,b=r.basis;if(!record(rep)||rep.p!==p.p||rep.q!==p.q||!text(rep.label)||!Number.isInteger(d)||d!==(p.p+1)*(p.q+1)*(p.p+p.q+2)/2||d<1||d>27||!record(b)||b.dimension!==d||!same(b.order,Array.from({length:d},(_,i)=>i))||!same(b.topRow,[p.p+p.q,p.q,0])||!rows(b.states,d,p.p,p.q))return{status:'invalid'};
 if(!record(r.conventions)||!['basis','order','phase','columns','coordinates','normalization','interpretation','scope'].every(k=>text(r.conventions[k]))||!Object.values(r.conventions).every(text))return{status:'invalid'};
 if(!Array.isArray(r.operators)||r.operators.length!==8||!r.operators.every((o,i)=>record(o)&&o.id===IDS[i]&&text(o.label)&&o.kind===(i<6?'ladder':'cartan')&&same(o.weightShift,SHIFTS[i])&&matrix(o.matrix,d)&&o.columns?.length===d&&o.columns.every((a,j)=>action(a,j,d,b.states,SHIFTS[i],o.matrix))))return{status:'invalid'};
 for(let k=6;k<8;k++)if(!r.operators[k].matrix.numeric.every((row,i)=>row.every((v,j)=>near(v,i===j?b.states[i].weight[k-6]:0))))return{status:'invalid'};
 if(!Array.isArray(r.weightGroups)||!r.weightGroups.length||r.weightGroups.length>d)return{status:'invalid'};
 const members=[];let last=-1;
 for(const [i,g]of r.weightGroups.entries()){
  if(!record(g)||g.index!==i||!Array.isArray(g.members)||!g.members.length||!g.members.every(j=>Number.isInteger(j)&&j>=0&&j<d)||g.members[0]<=last||!scalar(g.T3)||!scalar(g.T8))return{status:'invalid'};last=g.members[0];
  if(!g.members.every((j,k)=>!k||j>g.members[k-1])||!g.members.every(j=>same(g.weight,b.states[j].weight)&&same(g.T3,b.states[j].cartan.T3)&&same(g.T8,b.states[j].cartan.T8)))return{status:'invalid'};members.push(...g.members);
 }
 if(new Set(members).size!==d||members.length!==d||new Set(r.weightGroups.map(g=>JSON.stringify(g.weight))).size!==r.weightGroups.length)return{status:'invalid'};
 const f=r.fixedOctet;if(!record(f)||f.p!==1||f.q!==1||f.dimension!==8||!rows(f.basis,8,1,1)||!same(f.indices,[3,4])||f.sameWeight!==true||f.differentStates!==true||!text(f.description)||!text(f.scope)||!Array.isArray(f.rows)||f.rows.length!==2)return{status:'invalid'};
 for(const [i,row]of f.rows.entries())if(!record(row)||row.stateIndex!==f.indices[i]||!record(row.actions)||!['E12','E23'].every(id=>action(row.actions[id],row.stateIndex,8,f.basis,SHIFTS[IDS.indexOf(id)])))return{status:'invalid'};
 if(!same(f.basis[3].pattern,[2,0,1])||!same(f.basis[4].pattern,[1,1,1])||!same(f.basis[3].weight,[0,0])||!same(f.basis[4].weight,[0,0])||f.rows[0].actions.E12.vector.exact[1]!=='sqrt(2)'||!f.rows[1].actions.E12.zero||f.rows[0].actions.E23.vector.exact[2]!=='sqrt(2)/2'||f.rows[1].actions.E23.vector.exact[2]!=='sqrt(6)/2')return{status:'invalid'};
 if(!Array.isArray(r.steps)||r.steps.length!==5||!r.steps.every((s,i)=>record(s)&&s.id===['interlacing','content','cartan','column','zero-weight'][i]&&['title','explanation','formula'].every(k=>text(s[k])))||!Array.isArray(r.checks)||r.checks.length!==8||!r.checks.every((c,i)=>record(c)&&c.id===['dimension','interlacing','content','cartan','transpose','commutators','root-shifts','casimir'][i]&&text(c.label)&&c.passed===true)||!Array.isArray(r.notes)||!r.notes.every(text)||!Array.isArray(r.sources)||!r.sources.length||!r.sources.every(s=>record(s)&&text(s.title)&&text(s.url)&&/^https:\/\//.test(s.url)))return{status:'invalid'};
 return{status:'available',result:r};
}
export function su3BasisModel(r){try{return checkedModel(r);}catch{return{status:'invalid'};}}
const math=(p,inline=false)=>'<'+(inline?'span':'div')+' class="s3b-math'+(inline?' s3b-inline':'')+'"'+(inline?'':' tabindex="0"')+'>'+mathHTML(p.latex,!inline)+'</'+(inline?'span':'div')+'>';
const formula=s=>'<div class="s3b-math" tabindex="0">'+mathHTML(s,true)+'</div>';
const table=(caption,heads,lines)=>'<div class="s3b-scroll" tabindex="0" role="region" aria-label="'+esc(caption)+'"><table><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+lines.map(row=>'<tr>'+row.map((s,i)=>'<'+(i?'td':'th scope="row"')+'>'+s+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</tbody></table></div>';
const select=(name,label,options,value)=>'<label for="s3b-'+name+'">'+esc(label)+'</label><select id="s3b-'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>';
function gtHTML(s,top){return '<div class="s3b-gt" role="img" aria-label="'+esc('GT 三行：'+top.join(', ')+'；'+s.pattern.slice(0,2).join(', ')+'；'+s.pattern[2])+'"><div>'+top.map(x=>'<span>'+x+'</span>').join('')+'</div><div>'+s.pattern.slice(0,2).map(x=>'<span>'+x+'</span>').join('')+'</div><div><span>'+s.pattern[2]+'</span></div></div>';}
function actionHTML(a,states,title){return '<section><h5>'+esc(title)+'</h5>'+math(a.vector)+'<p>'+esc(a.zero?'返回的是零向量：这个升降算符消去了所选态，不是产生一个零权态。':'下面逐项列出该列的非零输出，系数保留精确根式。')+'</p>'+table('非零目标项',['目标 GT 态','精确系数'],a.terms.map(t=>[esc('#'+t.targetIndex+' · '+states[t.targetIndex].label),math(t.coefficient,true)]))+'<p>原始输出范数平方：'+math(a.normSquared,true)+'。升降算符不是幺正演化，此数值不是跃迁概率。</p></section>';}
export function su3BasisResultHTML(result,{stage=1,stateIndex=0,generator='E12'}={}){
 if(su3BasisModel(result).status!=='available')return'<p class="notice error" role="alert">返回结果不完整，请保留输入后重新计算。</p>';
 const r=result,level=Math.max(1,Math.min(5,Number(stage)||1)),s=r.basis.states[stateIndex]||r.basis.states[0],o=r.operators.find(x=>x.id===generator&&x.kind==='ladder')||r.operators[0],a=o.columns[s.index],g=r.weightGroups.find(g=>g.members.includes(s.index));
 let out='<section class="s3b-stage"><h4>① 从 GT 三行辨认一个态</h4><p>顶行固定表示；中行与底行标出该表示内部的正交基态。编号沿用 Python 返回顺序。</p>'+gtHTML(s,r.basis.topRow)+table('逐项检查交错不等式',['左值','关系','右值'],s.interlacing.map(t=>[esc(t.leftLabel+' = '+t.left),'≥',esc(t.rightLabel+' = '+t.right)]))+'</section>';
 if(level>=2)out+='<section class="s3b-stage"><h4>② 用相邻行的差读出 content</h4><p>content 是 GT 记账量；未指定具体物理模型时，不把它当作真实粒子占据数。</p>'+table('三个 content 与固定总和',['记账项','行差公式','精确结果'],s.content.terms.map(t=>[esc(t.label),formula(t.expressionLatex),math(t.value,true)]))+'<p>总和 n₁ + n₂ + n₃ = '+esc(s.content.total)+' = p + 2q。</p></section>';
 if(level>=3)out+='<section class="s3b-stage"><h4>③ 两个差给出整数 Cartan 权</h4>'+formula('H_1=n_1-n_2,\\qquad H_2=n_2-n_3')+table('整数权与内部 SU(2) 标签',['量','精确结果'],[['H₁',math(s.cartan.H1,true)],['H₂',math(s.cartan.H2,true)],['I',math(s.isospin.I,true)],['I₃',math(s.isospin.I3,true)],['Y',math(s.isospin.Y,true)]] )+'<p>权只记录两个对易 Cartan 算符的本征值；完整态还保留 GT 标签。</p></section>';
 if(level>=4)out+='<section class="s3b-stage"><h4>④ 把这个态放回精确权坐标</h4>'+formula('T_3=H_1/2,\\qquad T_8=(H_1+2H_2)/(2\\sqrt{3})')+'<p>T₃ = '+math(s.cartan.T3,true)+'，T₈ = '+math(s.cartan.T8,true)+'。</p><div id="s3b-drawing" class="s3b-drawing"></div><p>同权态共享一个点，圆点旁的数字是该权的态数；图中没有人为错开的假坐标。横纵轴是 Cartan 本征值，不是位置、动量或能级。</p>'+table('当前权点的全部 GT 成员',['返回编号与标签','I','I₃','Y'],g.members.map(i=>{const t=r.basis.states[i];return[esc('#'+i+' · '+t.label),math(t.isospin.I,true),math(t.isospin.I3,true),math(t.isospin.Y,true)];}))+'</section>';
 if(level>=5)out+='<section class="s3b-stage"><h4>⑤ 读一个生成元的完整矩阵列</h4><p>'+esc(o.label)+'；源态 #'+s.index+' · '+esc(s.label)+'。完整矩阵以目标为行、源态为列，下面显示该源态对应的一列。</p>'+actionHTML(a,r.basis.states,o.id+' 作用于当前态')+'<details data-s3b-native="matrix"><summary>查看完整矩阵与当前列</summary><p>当前源列：'+s.index+'。滚动只限本矩阵区域。</p>'+table('生成元矩阵；目标为行，源态为列',['目标／源',...r.basis.order.map(i=>'#'+i)],o.matrix.exact.map((row,i)=>[esc('#'+i+' · '+r.basis.states[i].label),...row.map((v,j)=>{const term=o.columns[j].terms.find(t=>t.targetIndex===i);return '<span'+(j===s.index?' class="s3b-selected-column"':'')+'>'+(term?math(term.coefficient,true):'<code>'+esc(v)+'</code>')+'</span>';})]))+'</details><h4>固定八重态反例：同权不等于同态</h4><p>'+esc(r.fixedOctet.description)+'</p><p>'+esc(r.fixedOctet.scope)+'</p><p>此处始终比较一个 8 表示里的两个零权 GT 态，不随上方 p、q 或预设改变，也不是 8⊗8 中的 8s、8a 两份外重数表示。</p><div class="s3b-pair">'+r.fixedOctet.rows.map(row=>{const t=r.fixedOctet.basis[row.stateIndex];return'<section><h5>'+esc(t.label)+'</h5>'+gtHTML(t,[2,1,0])+'<p>T₃ = '+math(t.cartan.T3,true)+'，T₈ = '+math(t.cartan.T8,true)+'；I = '+math(t.isospin.I,true)+'。</p>'+['E12','E23'].map(id=>actionHTML(row.actions[id],r.fixedOctet.basis,id)).join('')+'</section>';}).join('')+'</div><p>遗漏的标签是内部 GT／SU(2) 标签。保留相位与基序约定后，才可以比较这些矩阵列。</p></section>';
 return out;
}
export function su3BasisDrawingHTML(result,{stateIndex=0,width=320}={}){
 if(su3BasisModel(result).status!=='available')return'';
 const w=Math.max(160,Math.min(680,Number(width)||320)),h=320,points=result.weightGroups,max=Math.max(1,...points.flatMap(g=>[Math.abs(g.T3.numeric),Math.abs(g.T8.numeric)])),scale=Math.min((w-70)/(2*max),(h-80)/(2*max)),cx=w/2,cy=h/2;
 return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="SU(3) Cartan 权图；同权态位于同一点"><line x1="18" y1="'+cy+'" x2="'+(w-18)+'" y2="'+cy+'" class="s3b-axis"/><line x1="'+cx+'" y1="24" x2="'+cx+'" y2="'+(h-24)+'" class="s3b-axis"/>'+points.map(g=>{const x=cx+scale*g.T3.numeric,y=cy-scale*g.T8.numeric;return'<g class="s3b-weight'+(g.members.includes(stateIndex)?' s3b-weight-selected':'')+'"><circle cx="'+x+'" cy="'+y+'" r="'+(g.members.includes(stateIndex)?8:6)+'"/><text x="'+(x+10)+'" y="'+(y-9)+'">'+g.members.length+'</text><title>'+esc('权 '+g.weight.join(', ')+'；GT 成员 '+g.members.join(', '))+'</title></g>';}).join('')+'<g class="s3b-axis-labels" aria-label="横轴 T₃，纵轴 T₈"><text x="12" y="312">T₃ →</text><text x="'+(w-12)+'" y="312" text-anchor="end">T₈ ↑</text></g></svg>';
}
const opened=d=>typeof d.open==='boolean'?d.open:d.getAttribute('open')!==null;
const predictionMessages={weight:{right:'同一权坐标可以有多个正交 GT 态；比较固定八重态的 I 与生成元列就能区分。',wrong:'权坐标只给出 Cartan 本征值。固定八重态有两个零权态，GT／I 标签仍然不同。'},zero:{right:'E₁₂ 消去一个态时输出是零向量；零权态本身仍是非零的归一化基矢。',wrong:'要区分向量的零与权坐标的零：零输出没有态的方向，零权态仍是一个基矢。'},norm:{right:'升降算符不是幺正算符，原始输出范数平方不必为 1，也不是测量概率。',wrong:'这里没有做幺正时间演化或归一化测量。先检查算符与输出范数，不能直接读成概率。'}};
export function bindSu3BasisLesson({root,lessonId='su3-dynkin-representations',stateStore,isCurrent=()=>true,run,cancelRun,download}={}){
 const body=root?.querySelector('[data-su3-basis-body]');if(!body||!LESSONS.includes(lessonId))return()=>{};
 const store=stateStore?.get&&stateStore?.set?stateStore:new Map(),key='panel:'+lessonId,saved=store.get(key),state=record(saved)?clone(saved):{};
 state.raw={p:'1',q:'0',preset:'3',...(record(state.raw)?state.raw:{})};state.stage=Number.isInteger(state.stage)&&state.stage>=1&&state.stage<=5?state.stage:1;state.stateIndex=Number.isInteger(state.stateIndex)?state.stateIndex:0;state.generator=LADDERS.includes(state.generator)?state.generator:'E12';state.note=typeof state.note==='string'?state.note:'';for(const k of ['predictions','checked','details'])if(!record(state[k]))state[k]={};
 if(state.result&&(su3BasisModel(state.result).status!=='available'||identity(state.input)!==identity(state.result.normalizedInput))){state.result=null;state.input=null;}
 const owner={};owners.set(body,owner);let alive=true,ticket=0,busy=false,pending=null,resize;
 const $=name=>body.querySelector('#s3b-'+name),active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const save=()=>{if(active())store.set(key,clone(state));};
 function capture(){if(!active())return;for(const d of body.querySelectorAll('[data-s3b-native]'))state.details[d.dataset.s3bNative]=opened(d);if($('note'))state.note=$('note').value;save();}
 function stopDrawing(){resize?.disconnect();resize=null;}
 function cancelOwned(fallback){const task=pending;pending=null;if(task&&typeof task.cancel==='function')return task.cancel();if(task&&fallback&&active()&&typeof cancelRun==='function'){cancelRun();return true;}return false;}
 const bind=(name,event,handler)=>{const node=$(name);if(node)node[event]=e=>{if(!active()||$(name)!==node||node.disabled)return;capture();const result=handler(node,e);save();return result;};};
 function retire(){ticket++;if(busy)cancelOwned(true);busy=false;state.result=null;state.input=null;state.stage=1;state.stateIndex=0;state.error='';stopDrawing();if($('fieldset'))$('fieldset').disabled=false;if($('run'))$('run').textContent='手动计算完整 GT 基 →';if($('cancel'))$('cancel').hidden=true;if($('error')){$('error').hidden=true;$('error').textContent='';}save();}
 function draw(){
  if(!active())return;capture();stopDrawing();
  body.innerHTML='<div class="s3b-workshop"><h4>从一个 GT 态到两个权数，再读一列</h4><p>先用 3 表示追踪一个态，再比较固定 8 表示里的两个零权态。打开工坊、填预设和选择已有态都不自动计算。</p><form id="s3b-form"><fieldset id="s3b-fieldset"'+(busy?' disabled':'')+'><legend>选择表示；所有计算由浏览器 Python 返回</legend><div class="s3b-controls"><div>'+select('preset','填入表示预设',[['','自定义 / 当前草稿'],...SU3_BASIS_PRESETS.map(p=>[p.id,p.title])],state.raw.preset)+'</div>'+['p','q'].map(k=>'<div><label for="s3b-'+k+'">Dynkin '+k+'</label><input id="s3b-'+k+'" type="text" inputmode="numeric" value="'+esc(state.raw[k])+'"></div>').join('')+'</div><p>支持全部 15 对非负整数标签 p + q ≤ 4，最大维数 27。改动标签会收起旧结果；手动运行后才建立新结果。</p><button class="primary" type="submit" id="s3b-run">'+(busy?'Python 计算中…':'手动计算完整 GT 基 →')+'</button></fieldset><button class="secondary" type="button" id="s3b-cancel"'+(busy?'':' hidden')+'>取消本页计算</button></form><p class="notice error" id="s3b-error" role="alert"'+(state.error?'':' hidden')+'>'+esc(state.error)+'</p><section class="s3b-predictions"><h4>先预测，再核对</h4>'+[['weight','固定八重态的两个零权 GT 态是否相同？','相同，坐标相同就足够','不同，还需内部 GT 标签'],['zero','E₁₂ 作用后为零，是否产生了一个零权态？','是，零输出就是零权态','否，零向量与零权态不同'],['norm','原始升降输出的范数平方是否就是概率？','是，应始终在 0 到 1 之间','否，升降不是幺正演化']].map(([name,label,wrong,right])=>'<div>'+select('predict-'+name,label,[['','尚未选择'],['wrong',wrong],['right',right]],state.predictions[name]||'')+'<button class="secondary" type="button" id="s3b-check-'+name+'">核对判断</button><p id="s3b-feedback-'+name+'" role="status">'+esc(state.checked[name]?(state.predictions[name]?predictionMessages[name][state.predictions[name]==='right'?'right':'wrong']:'请先选择一个判断。'):'')+'</p></div>').join('')+'</section><div id="s3b-result"></div><label for="s3b-note">我的 GT 推导与反例（仅页面内存）</label><textarea id="s3b-note" rows="3">'+esc(state.note)+'</textarea><p><a href="docs/su3-basis.md">方法、基序与相位约定 ↗</a></p></div>';
  const form=$('form');form.onsubmit=e=>{e.preventDefault();if(active()&&$('form')===form&&!busy)return calculate();};
  for(const k of ['p','q'])bind(k,'oninput',node=>{state.raw[k]=node.value;state.raw.preset='';$('preset').value='';retire();drawResult();});
  bind('preset','onchange',node=>{const p=SU3_BASIS_PRESETS.find(p=>p.id===node.value);if(p){state.raw={preset:p.id,p:String(p.p),q:String(p.q)};retire();draw();}else state.raw.preset='';});
  bind('note','oninput',node=>{state.note=node.value;});
  for(const name of ['weight','zero','norm']){bind('predict-'+name,'onchange',node=>{state.predictions[name]=node.value;state.checked[name]=false;$('feedback-'+name).textContent='';});bind('check-'+name,'onclick',()=>{state.checked[name]=true;$('feedback-'+name).textContent=state.predictions[name]?predictionMessages[name][state.predictions[name]==='right'?'right':'wrong']:'请先选择一个判断。';});}
  bind('cancel','onclick',()=>{if(!busy)return;ticket++;cancelOwned(true);busy=false;state.error='本页计算已取消；草稿已保留，可重新运行。';draw();});drawResult();save();
 }
 async function calculate(){
  if(!active()||busy)return;let input;try{input=su3BasisRequest(state.raw);}catch(e){state.error=String(e.message);state.result=null;state.input=null;draw();return;}
  const job=++ticket;busy=true;state.error='';state.result=null;state.input=null;state.stage=1;state.stateIndex=0;draw();
  try{if(typeof run!=='function')throw Error('Python 计算接口暂不可用，请重新打开课程。');const task=run('teaching_labs',input);pending=task;const result=await task;if(!active()||ticket!==job)return;if(su3BasisModel(result).status!=='available'||identity(result.normalizedInput)!==identity(input))throw Error('返回的 GT 基、矩阵列或输入身份不完整；请保留草稿后重试。');state.result=result;state.input=clone(input);}
  catch(error){if(active()&&ticket===job)state.error=String(error?.message||'本次计算未完成，请重试。');}
  finally{if(active()&&ticket===job){pending=null;busy=false;draw();}}
 }
 function drawResult(){
  const target=$('result');if(!active()||!target)return;stopDrawing();if(!state.result){target.innerHTML=busy?'<p role="status">正在构造精确 GT 基与完整列；首次运行需载入 Python 和符号计算环境。</p>':'<p>尚未计算；请手动运行。预设与草稿不会启动 Python。</p>';return;}
  const r=state.result;if(!r.basis.states[state.stateIndex])state.stateIndex=0;
  target.innerHTML='<div class="s3b-view-controls"><div>'+select('state','选择已返回的 GT 态',r.basis.states.map(s=>[s.index,'#'+s.index+' · '+s.label]),state.stateIndex)+'</div><div>'+select('generator','选择已返回的升降算符',LADDERS.map(id=>[id,id+(['E12','E23'].includes(id)?' · 建议先比较':'')]),state.generator)+'</div></div><p>这些选择只查看本次已返回的数据；不会改变输入或重新计算。</p><div class="s3b-stage-controls"><button class="secondary" type="button" id="s3b-next"'+(state.stage>=5?' disabled':'')+'>展开下一步</button><button class="secondary" type="button" id="s3b-first">回到第一步</button><span id="s3b-stage-status" role="status">第 '+state.stage+' / 5 步</span></div>'+su3BasisResultHTML(r,state)+'<details data-s3b-native="checks"'+(state.details.checks?' open':'')+'><summary>核验、基序、相位约定与来源</summary><ul>'+r.checks.map(c=>'<li>'+esc(c.label)+'：通过</li>').join('')+'</ul>'+Object.values(r.conventions).map(s=>'<p>'+esc(s)+'</p>').join('')+'<ul>'+r.notes.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><ul>'+r.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ul></details>'+(typeof download==='function'?'<button class="secondary" type="button" id="s3b-export">导出本页输入与精确 GT 结果</button>':'');
  bind('next','onclick',()=>{state.stage=Math.min(5,state.stage+1);drawResult();});bind('first','onclick',()=>{state.stage=1;drawResult();});
  bind('state','onchange',node=>{const i=Number(node.value);if(Number.isInteger(i)&&r.basis.states[i]){state.stateIndex=i;drawResult();}});bind('generator','onchange',node=>{if(LADDERS.includes(node.value)){state.generator=node.value;drawResult();}});
  for(const d of target.querySelectorAll('[data-s3b-native]')){d.open=!!state.details[d.dataset.s3bNative];d.ontoggle=()=>{if(!active()||$('result')!==target||state.result!==r||!Array.from(target.querySelectorAll('[data-s3b-native]')).includes(d))return;state.details[d.dataset.s3bNative]=opened(d);save();};}
  bind('export','onclick',()=>{if(state.result===r&&state.input)download(JSON.stringify({kind:'su3-basis-teaching',input:state.input,result:r},null,2),'su3-gt-basis-'+state.input.p+'-'+state.input.q+'.json','application/json');});
  const node=$('drawing');if(node){const render=()=>{if(active()&&state.result===r&&$('drawing')===node)node.innerHTML=su3BasisDrawingHTML(r,{stateIndex:state.stateIndex,width:node.clientWidth||320});};render();if(typeof ResizeObserver==='function'){resize=new ResizeObserver(render);resize.observe(node);}}
 }
 draw();const cleanup=()=>{if(!alive)return;const own=owners.get(body)===owner;capture();if(busy)cancelOwned(active());busy=false;ticket++;alive=false;stopDrawing();if(own){for(const tag of ['input','select','textarea','button','form','details'])for(const node of body.querySelectorAll(tag))for(const event of ['onclick','onchange','oninput','onsubmit','ontoggle'])node[event]=null;owners.delete(body);}};cleanup.snapshot=()=>{capture();return clone(state);};return cleanup;
}
