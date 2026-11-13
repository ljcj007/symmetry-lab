import {mathHTML} from './math-display.js?v=20261113-prose2';

// A bounded four-mode teaching reference. The scientific Hubbard and Lehmann
// tools remain Python calculations; this bridge never starts a worker.
export const HUBBARD_BRIDGE_HOOKS=Object.freeze(Object.fromEntries(['hubbard-basis','manybody-lehmann'].map(id=>[id,Object.freeze(['fock-to-lehmann'])])));
export const HUBBARD_SOURCE_BASIS=Object.freeze([5,9,6,10]);
const modes=['0↑','1↑','0↓','1↓'];
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const integer=(value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)throw Error('The four-mode teaching reference requires an integer in its stated range.');return value;};
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(4):Number(value.toFixed(6)).toString();
const texNumber=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const bits=state=>Array.from({length:4},(_,i)=>(state>>i)&1);
const count=values=>values.reduce((a,b)=>a+b,0);
const sector=state=>{const n=bits(state);return[count(n.slice(0,2)),count(n.slice(2))];};
const ket=state=>{const n=bits(state);return'|'+n[0]+n[1]+';'+n[2]+n[3]+'⟩';};
const ketTex=state=>{const n=bits(state);return'\\lvert '+n[0]+n[1]+';'+n[2]+n[3]+'\\rangle';};
const opTex=(mode,create)=>'c_{'+(mode%2)+','+(mode<2?'\\uparrow':'\\downarrow')+'}'+(create?'^{\\dagger}':'');
const formula=tex=>`<div class="hub-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>`<span class="hub-inline">${mathHTML(tex)}</span>`;
const table=(caption,headers,rows)=>`<div class="hub-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${headers.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
const complex=(re,im=0)=>[re,im],add=(a,b)=>[a[0]+b[0],a[1]+b[1]],mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]],scale=(a,n)=>[a[0]*n,a[1]*n],norm2=a=>a[0]*a[0]+a[1]*a[1];
const complexTex=z=>{const[r,i]=z;return !i?texNumber(r):!r?texNumber(i)+'i':texNumber(r)+(i>=0?'+':'')+texNumber(i)+'i';};
const vectorTex=vector=>'\\begin{pmatrix}'+vector.map(complexTex).join('\\\\')+'\\end{pmatrix}';
const applyMatrix=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,i)=>add(sum,mul(value,vector[i])),complex(0)));

/** All 16 occupations x four modes x creation/removal are intentionally finite. */
export function hubbardFermionAction({state,mode,create=false}={}){
 integer(state,0,15);integer(mode,0,3);if(typeof create!=='boolean')throw Error('Creation must be explicitly true or false.');
 const occupations=bits(state),occupied=occupations[mode]===1,lowerModes=occupations.flatMap((n,i)=>i<mode&&n?[i]:[]),allowed=occupied!==create;
 return{state,mode,create,occupations,occupied,lowerModes,parity:lowerModes.length%2,
  sign:allowed?(lowerModes.length%2?-1:1):0,target:allowed?state^(1<<mode):null,
  sourceSector:sector(state),targetSector:allowed?sector(state^(1<<mode)):null};
}

function sectorBasis(up,down){
 const result=[];for(let u=0;u<4;u++)if((u&1)+((u>>1)&1)===up)for(let d=0;d<4;d++)if((d&1)+((d>>1)&1)===down)result.push(u+(d<<2));return result;
}

/** Source columns use (5,9,6,10), not integer-sorted occupation states. */
export function hubbardActionMatrix({mode=2,create=false}={}){
 integer(mode,0,3);if(typeof create!=='boolean')throw Error('Creation must be explicitly true or false.');
 const delta=create?1:-1,targetSector=[1+(mode<2?delta:0),1+(mode>=2?delta:0)],targetBasis=sectorBasis(...targetSector);
 const matrix=targetBasis.map(()=>HUBBARD_SOURCE_BASIS.map(()=>0));
 HUBBARD_SOURCE_BASIS.forEach((state,col)=>{const action=hubbardFermionAction({state,mode,create});if(action.target!==null)matrix[targetBasis.indexOf(action.target)][col]=action.sign;});
 return{sourceBasis:[...HUBBARD_SOURCE_BASIS],sourceSector:[1,1],targetBasis,targetSector,matrix,mode,create};
}

/** Fixed unique pure ground state; this is not an arbitrary Hubbard solver. */
export function hubbardSpectralReference({probe='local0',phi=0}={}){
 if(!['local0','phase'].includes(probe)||typeof phi!=='number'||!Number.isFinite(phi)||Math.abs(phi)>Math.PI)throw Error('Unsupported fixed-dimer probe or phase.');
 const phase=phi===0?complex(1):Math.abs(phi)===Math.PI?complex(-1):phi===Math.PI/2?complex(0,-1):phi===-Math.PI/2?complex(0,1):complex(Math.cos(phi),-Math.sin(phi));
 const coefficients=probe==='local0'?[complex(1),complex(0)]:[complex(1/Math.SQRT2),scale(phase,1/Math.SQRT2)];
 const initial=HUBBARD_SOURCE_BASIS.map(()=>complex(.5)),processes={};
 for(const create of [false,true]){
  const local=[0,1].map(mode=>hubbardActionMatrix({mode,create})),used=coefficients.map(z=>create?[z[0],-z[1]]:[...z]);
  const matrix=local[0].matrix.map((row,r)=>row.map((value,col)=>add(scale(used[0],value),scale(used[1],local[1].matrix[r][col]))));
  const acted=applyMatrix(matrix,initial),bonding=scale(add(acted[0],acted[1]),1/Math.SQRT2),antibonding=scale(add(acted[0],scale(acted[1],-1)),1/Math.SQRT2);
  const contributions=local.map((entry,i)=>{const vec=applyMatrix(entry.matrix.map(row=>row.map(x=>complex(x))),initial);return mul(used[i],scale(add(vec[0],vec[1]),1/Math.SQRT2));});
  const kind=create?'addition':'removal';
  processes[kind]={matrix,acted,coefficients:used,contributions,targetBasis:local[0].targetBasis,targetSector:local[0].targetSector,
   bonding:{amplitude:bonding,weight:norm2(bonding),finalEnergy:-1,coordinate:create?1:-1},
   antibonding:{amplitude:antibonding,weight:norm2(antibonding),finalEnergy:1,coordinate:create?3:-3},
   totalWeight:acted.reduce((sum,z)=>sum+norm2(z),0)};
 }
 return{probe,phi,coefficients,initial,sourceBasis:[...HUBBARD_SOURCE_BASIS],groundEnergy:-2,...processes,
  totalWeight:processes.removal.totalWeight+processes.addition.totalWeight,
  incoherentRandomLocal:{removalWeight:.5,additionWeight:.5},displayWeightTolerance:1e-13};
}

export function hubbardBridgeLabRequest(reference={}){
 const ref=hubbardSpectralReference(reference);
 return{action:'manybody_spectra_lab',input:{experiment:'single_particle',sites:2,nUp:1,nDown:1,boundary:'open',hopping:1,interactionU:0,alternatingPotential:0,
  probe:ref.probe==='phase'?'momentum':'local',site:0,q:ref.probe==='phase'?ref.phi/Math.PI:0,spin:'up',chemicalPotential:0,responseKind:'spin',eta:.08,points:601}};
}

const initial=()=>({open:false,matrixOpen:false,spectrumOpen:false,allStates:false,basis:'5',mode:'2',operation:'remove',actionStep:0,
 probe:'local0',phi:0,comparison:false,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const name of ['open','matrixOpen','spectrumOpen','allStates','comparison'])if(typeof saved[name]==='boolean')state[name]=saved[name];
 const allowed=state.allStates?Array.from({length:16},(_,i)=>String(i)):HUBBARD_SOURCE_BASIS.map(String);
 if(allowed.includes(saved.basis))state.basis=saved.basis;if(['0','1','2','3'].includes(saved.mode))state.mode=saved.mode;
 if(['remove','create'].includes(saved.operation))state.operation=saved.operation;if(['local0','phase'].includes(saved.probe))state.probe=saved.probe;
 if(typeof saved.phi==='number'&&Number.isFinite(saved.phi)&&Math.abs(saved.phi)<=Math.PI)state.phi=saved.phi;
 if(Number.isInteger(saved.actionStep)&&saved.actionStep>=0&&saved.actionStep<=3)state.actionStep=saved.actionStep;
 const options=[['positive','negative','zero'],['same','target','other'],['half','phase','none']];
 for(let i=0;i<3;i++)if(options[i].includes(saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(!state.choices[0])state.actionStep=0;if(state.actionStep<3)state.checked[0]=false;
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);
 return state;
}
const actionFor=state=>hubbardFermionAction({state:Number(state.basis),mode:Number(state.mode),create:state.operation==='create'});
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select>${value!==''?`<span class="hub-selected-reading" aria-hidden="true">${esc(rows.find(([key])=>String(key)===String(value))?.[1]||'')}</span>`:''}</label>`;
const button=(id,label,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${label}</button>`;
const checkbox=(id,label,checked)=>`<label class="hub-checkbox"><input id="${id}" type="checkbox" ${checked?'checked':''}>${label}</label>`;

function question(state,index){
 const a=actionFor(state),m=hubbardActionMatrix({mode:Number(state.mode),create:state.operation==='create'}),target='('+m.targetSector.join(',')+')',other='('+[...m.targetSector].reverse().join(',')+')';
 if(index===0){
  const key=a.sign===0?'zero':a.sign>0?'positive':'negative';
  const allowedExplanation=a.sign===0?(a.create?'目标模式已经占据，重复创建给零。':'目标模式为空，湮灭给零。'):'目标模式允许该动作；前置占据数决定符号。';
  return{prompt:'先预测当前动作的结果符号，再逐步展开。',rows:[['','先选择预测'],['positive','非零，正号'],['negative','非零，负号'],['zero','结果为零']],answer:key,
   feedback:{positive:a.sign>0?'前置占据数为偶数，重排符号为正；目标模式也允许这个动作。':a.sign<0?'这里前置占据数为奇数；不能因为目标模式允许操作就漏掉负号。':allowedExplanation,
    negative:a.sign<0?'前置占据数为奇数，重排符号为负。负振幅仍给非负概率。':a.sign>0?'这里前置占据数为偶数；重排不带负号。':allowedExplanation,
    zero:a.sign===0?allowedExplanation:'这个模式允许该动作，因此结果不为零；接着检查前置占据数的奇偶。'}};
 }
 if(index===1)return{prompt:'固定源扇区为 (1,1)，当前算符把哪个空间映到哪个空间？',rows:[['','先选择预测'],['same','四维 (1,1) 映到自身'],['target','四维 (1,1) 映到二维 '+target],['other','四维 (1,1) 映到二维 '+other]],answer:'target',
  feedback:{same:'单个创建或湮灭算符改变粒子数，不能只在原四维扇区内部重排。',target:'列是四个源基矢，行是两个目标基矢；对应自旋的粒子数改变一，其余保持。',other:'这个选项改变了另一种自旋的粒子数；请按算符的自旋标记重新计数。'}};
 return{prompt:'固定自由二聚体纯基态，把归一相干探针设为 φ=π，移除、添加权重应是多少？',rows:[['','先选择预测'],['half','1/2、1/2'],['phase','0、1'],['none','0、0']],answer:'phase',
  feedback:{half:'各为 1/2 是本例的局域探针或随机局域测量平均。相干探针要先把带相位的振幅相加。',phase:'φ=π 时移除振幅相消，添加振幅保留；两类权重之和仍为 1。',none:'移除相消不要求添加也相消；创建算符使用共轭系数和自己的费米符号。'}};
}
function checkHTML(prefix,state,index){
 const q=question(state,index),choice=state.choices[index],checked=state.checked[index]&&choice,correct=choice===q.answer;
 return `<section class="hub-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,'你的预测',q.rows,choice)}${button(prefix+'-check'+index,'核对这一步',!choice||index===0&&state.actionStep<3)}<p id="${prefix}-feedback${index}" class="hub-feedback${checked&&correct?' hub-correct':''}" role="status">${checked?(correct?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function actionHTML(state){
 const a=actionFor(state),steps=[];
 if(state.actionStep>=1)steps.push('<li>'+ (a.create?(a.occupied?'目标模式已占据：重复创建被 Pauli 原理禁止。':'目标模式为空：允许尝试创建。'):(a.occupied?'目标模式已占据：允许尝试湮灭。':'目标模式为空：湮灭得到零。'))+'</li>');
 if(state.actionStep>=2)steps.push('<li>前置已占据模式：'+esc(a.lowerModes.map(i=>modes[i]).join(', ')||'无')+'。'+inline('(-1)^{'+a.lowerModes.length+'}='+(a.parity?'-1':'1'))+'<p>若动作已被占据条件禁止，重排符号不会把零变成非零。</p></li>');
 if(state.actionStep>=3)steps.push('<li>'+formula(opTex(a.mode,a.create)+ketTex(a.state)+'='+(a.target===null?'0':(a.sign<0?'-':'')+ketTex(a.target)))+(a.target===null?'<p>动作得到零向量，没有可归一化的非零目标态。</p>':'<p>源扇区 '+inline('('+a.sourceSector.join(',')+')')+'，目标扇区 '+inline('('+a.targetSector.join(',')+')')+'</p>')+'</li>');
 return steps.length?'<ol class="hub-action-steps">'+steps.join('')+'</ol>':'<p class="hub-await">先选符号预测，再展开占据检查、费米符号和目标态。</p>';
}
function occupationHTML(state){
 const a=actionFor(state);
 return `<div class="hub-occupations" role="group" aria-label="按模式排序的当前占据">${a.occupations.map((n,i)=>`<div class="hub-occupation ${i===a.mode?'hub-target-mode':a.lowerModes.includes(i)?'hub-parity-mode':''}"><span>${modes[i]}</span><strong>${n}</strong></div>`).join('')}</div><p>金色框是目标模式；绿色格是其前面已占据的模式，参与符号计数。</p>`;
}
function matrixHTML(state){
 const m=hubbardActionMatrix({mode:Number(state.mode),create:state.operation==='create'}),selected=Number(state.basis);
 return `<p>本表始终使用四维源扇区 (1,1)，列顺序是 5、9、6、10；不是整数排序。行是当前算符的目标基矢。</p>${formula(opTex(m.mode,m.create)+':\\mathcal H_{(1,1)}\\longrightarrow\\mathcal H_{('+m.targetSector.join(',')+')}')}<div class="hub-table-wrap" tabindex="0"><table><caption>矩形算符：目标态为行，源态为列</caption><thead><tr><th scope="col">目标 / 源</th>${m.sourceBasis.map(s=>`<th scope="col" ${s===selected?'class="hub-selected-column"':''}>${esc(ket(s))}</th>`).join('')}</tr></thead><tbody>${m.matrix.map((row,r)=>`<tr><th scope="row">${esc(ket(m.targetBasis[r]))}</th>${row.map((n,col)=>`<td ${m.sourceBasis[col]===selected?'class="hub-selected-column"':''}>${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${HUBBARD_SOURCE_BASIS.includes(selected)?'高亮列是前面选中的源占据态；沿该列读取非零目标与符号。':'前面选中的占据态不在此固定源扇区中；本表没有为它高亮一列。'}</p>`;
}
function spectralHTML(state){
 const r=hubbardSpectralReference(state),processNames={removal:'移除',addition:'添加'},headers=['过程','成键振幅','成键权重','成键候选坐标 / eV','反键权重','反键候选坐标 / eV'];
 const atNumericalEndpoint=r.probe==='phase'&&Math.abs(Math.abs(r.phi)-Math.PI)<=32*Number.EPSILON*Math.PI;
 const rows=['removal','addition'].map(kind=>{const p=r[kind];return[processNames[kind],inline(complexTex(p.bonding.amplitude)),fmt(p.bonding.weight),p.bonding.coordinate,fmt(p.antibonding.weight),p.antibonding.coordinate];});
 return `<p>这里固定上自旋，不继承前面单基矢动作的自旋选择。目标基底与算符按同一个模式顺序定义。</p>${formula('\\lvert G\\rangle=\\tfrac12\\begin{pmatrix}1\\\\1\\\\1\\\\1\\end{pmatrix},\\quad E_0=-2\\,\\mathrm{eV},\\quad\\lvert b\\rangle=\\tfrac1{\\sqrt2}\\begin{pmatrix}1\\\\1\\end{pmatrix},\\quad\\lvert a\\rangle=\\tfrac1{\\sqrt2}\\begin{pmatrix}1\\\\-1\\end{pmatrix}')}
 <p>本 Fock 基中四个正系数与物理自旋单重态相容。按站点书写的自旋张量积 ket 必须先按创建算符顺序重排，不能直接搬来其相位。</p>
 ${formula(r.probe==='local0'?'c=c_{0\\uparrow}':'c_\\phi=\\tfrac1{\\sqrt2}(c_{0\\uparrow}+e^{-i\\phi}c_{1\\uparrow}),\\quad\\phi='+texNumber(r.phi))}
 ${table('探针系数：添加使用湮灭算符的厄米共轭',['过程','站点 0 系数','站点 1 系数'],['removal','addition'].map(kind=>[processNames[kind],inline(complexTex(r[kind].coefficients[0])),inline(complexTex(r[kind].coefficients[1]))]))}
 ${['removal','addition'].map(kind=>{const p=r[kind];return `<section class="hub-overlap"><h4>${processNames[kind]}：先作用，再投影</h4><p>目标占据基底：${p.targetBasis.map(s=>esc(ket(s))).join(', ')}。</p>${formula((kind==='removal'?'c':'c^\\dagger')+'\\lvert G\\rangle='+vectorTex(p.acted))}${formula('A_b='+complexTex(p.contributions[0])+'+('+complexTex(p.contributions[1])+')='+complexTex(p.bonding.amplitude)+',\\quad w_b=|A_b|^2='+texNumber(p.bonding.weight))}<p>两项是通向同一个成键末态的局域路径振幅。反键重叠由两个目标系数相减得到，其权重为 ${inline(texNumber(p.antibonding.weight))}。</p></section>`;}).join('')}
 ${r.probe==='phase'?`<section class="hub-phase-closedform"><h4>归一相干探针的闭式权重</h4>${formula('W_-=\\cos^2(\\phi/2),\\qquad W_+=\\sin^2(\\phi/2)')}<p>这里仍是同一个固定自由二聚体。先加带相位的路径振幅，再取绝对值平方，就得到这两个权重。</p></section>`:''}
 ${atNumericalEndpoint?'<p class="hub-boundary hub-endpoint-note">精确的 φ=±π 对应移除权重 0、添加权重 1。控件可能只把相位设到机器精度内的端点，浮点三角函数也可能留下极小残差。表中保留原始数值；这些端点残差不代表额外可见谱峰，不必把它们理解成预测错误。</p>':''}
 ${table('能量差给出候选位置，非零重叠才给出谱权重',headers,rows)}
 <p>成键末态能量为 −1 eV，反键末态能量为 +1 eV。反键候选虽有非零能量差，重叠仍为零；成键候选也可能因相干抵消而变暗。这里没有把零权重候选画成可见谱峰。</p>
 ${formula('W_-+W_+='+texNumber(r.removal.totalWeight)+'+'+texNumber(r.addition.totalWeight)+'='+texNumber(r.totalWeight))}
 ${state.comparison?`<section class="hub-comparison"><h4>相干测量与随机局域测量不同</h4><p>相干相位探针对同一末态先加复振幅再平方。若每次独立地以一半概率选择站点 0 或 1 的局域探针，则在平方后平均：本例移除与添加权重始终各为 1/2，不能把这个随机测量当成相干探针的另一种算法。</p>${formula('W_-^{\\mathrm{random}}=\\tfrac12 W_-(c_0)+\\tfrac12 W_-(c_1)=\\tfrac12,\\quad W_+^{\\mathrm{random}}=\\tfrac12')}<p>对正交末态的未分辨信号也在平方后求和；初态若为统计混合，还要按混合概率平均。只有同一末态内的相干路径先加振幅。</p></section>`:''}`;
}

function bodyHTML(prefix,state,canOpenLab){
 const sourceStates=state.allStates?Array.from({length:16},(_,i)=>i):[...HUBBARD_SOURCE_BASIS];
 const phaseLabel='探针相位 φ / rad',noteLabel='用自己的话记下一句解释（仅本次页面会话）';
 const copyStatus=state.copyOutcome==='success'?'参考输入已复制；请在实验中手动运行计算。':state.copyOutcome==='error'?(state.copyError||'参考输入暂未复制，请重试。'):'';
 return `<p>模式顺序固定为 0↑、1↑、0↓、1↓。占据串把上自旋写在分号前、下自旋写在分号后；这不是高位在前的二进制显示。</p><p>下式中下标 0、1、2、3 是模式编号，依次对应这四项。</p>${formula('\\lvert n_0n_1;n_2n_3\\rangle=(c_0^\\dagger)^{n_0}(c_1^\\dagger)^{n_1}(c_2^\\dagger)^{n_2}(c_3^\\dagger)^{n_3}\\lvert\\mathrm{vac}\\rangle')}
 <p>上式创建算符按模式升序写出，作用时从右向左；单个算符的符号来自目标模式之前已占据模式的个数。</p>
 <section class="hub-stage"><h3>1 · 对一个占据态施加算符</h3>${checkbox(prefix+'-all','查看全部 16 个占据态',state.allStates)}<p>全部 16 个占据态、4 个模式和2种动作共128种组合；默认只看 (1,1) 扇区的四个基矢。</p><div class="hub-controls">${select(prefix+'-basis','源占据态',sourceStates.map(s=>[String(s),ket(s)+' · '+String(s)]),state.basis)}${select(prefix+'-mode','算符的目标模式',modes.map((name,i)=>[String(i),name]),state.mode)}${select(prefix+'-operation','动作',[['remove','湮灭'],['create','创建']],state.operation)}</div>${occupationHTML(state)}${formula(opTex(Number(state.mode),state.operation==='create')+ketTex(Number(state.basis)))}${checkHTML(prefix,state,0)}${button(prefix+'-step',state.actionStep<3?'展开下一步':'重新展开',!state.choices[0])}<div id="${prefix}-action">${actionHTML(state)}</div></section>
 <section class="hub-stage"><h3>2 · 把动作写成跨扇区矩阵</h3>${checkHTML(prefix,state,1)}<details data-hub-native="matrix" ${state.matrixOpen?'open':''}><summary>展开矩形算符与行列基底</summary>${matrixHTML(state)}</details></section>
 <section class="hub-stage"><h3>3 · 从作用向量到谱权重</h3><p>这一段单独固定 L=2、t=1 eV、U=Δ=μ=0、开边界及唯一纯基态。它不自动使用当前计算器中的一般相互作用输入。</p><details data-hub-native="spectrum" ${state.spectrumOpen?'open':''}><summary>展开固定自由二聚体的作用与重叠</summary><div class="hub-controls">${select(prefix+'-probe','谱学探针',[['local0','站点 0 局域探针'],['phase','归一相干相位探针']],state.probe)}<label for="${prefix+'-phi'}">${phaseLabel}<input id="${prefix+'-phi'}" type="range" min="${-Math.PI}" max="${Math.PI}" step="any" value="${state.phi}"><output id="${prefix}-phi-value">${fmt(state.phi)}</output></label></div><div class="hub-controls hub-phase-buttons">${button(prefix+'-phase0','φ=0')}${button(prefix+'-phasehalf','φ=π/2')}${button(prefix+'-phasepi','φ=π')}</div><p>相位按钮选择相干探针。局域探针不随 φ 改变；开放二聚体的 q=φ/π 是探针相位，不是严格晶体动量量子数。</p>${checkbox(prefix+'-comparison','比较随机局域探针的概率平均',state.comparison)}<div id="${prefix}-spectrum">${spectralHTML(state)}</div></details><p>下面的预测固定 φ=π，可用上方控件核验。</p>${checkHTML(prefix,state,2)}</section>
 <label class="hub-note-label" for="${prefix+'-note'}">${noteLabel}<textarea id="${prefix+'-note'}" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>
 <p class="hub-boundary">单基矢动作是有限四模式参考；谱线推导固定为上面的自由二聚体纯态。一般相互作用模型、简并初态及完整谱仍由原有 Python 工具计算。这里不改写课程掌握状态。</p>
 ${canOpenLab?button(prefix+'-copy','把当前参考探针复制到实验，等待手动计算'):'<p>进入谱权重课后，可在那里选择参考探针并复制到实验。这个链接只打开课堂，不传递当前相位。</p><p><a href="#classroom/observables?module=manybody&lesson=manybody-lehmann&tab=learn">进入谱权重课与参考探针 →</a></p>'}<p id="${prefix}-copy-status" role="status">${esc(copyStatus)}</p><p><a href="#classroom/observables?module=manybody&lesson=manybody-checks&tab=learn">继续理解简并平均与和规则 →</a></p>${button(prefix+'-reset','重置这个可选小实验')}`;
}

export function hubbardBridgeHTML(lessonId){
 if(!Object.hasOwn(HUBBARD_BRIDGE_HOOKS,lessonId))return '';
 return '<section class="hub-prerequisite" aria-label="可选的占据数与谱权重操作桥"><p class="hub-optional">第一次从占据数基走到谱权重？展开这个固定小例；熟悉算符与矩阵元可以直接继续原课。</p><details class="hub-bridge" data-hub-bridge="fock-to-lehmann"><summary>从一个占据数动作到一条谱线</summary><div class="hub-body" data-hub-body="fock-to-lehmann"></div></details></section>';
}

export function bindHubbardLearningBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const store=stateStore instanceof Map?stateStore:new Map(),storeKey=lessonId+':fock-to-lehmann';
 const supported=Object.hasOwn(HUBBARD_BRIDGE_HOOKS,lessonId),detail=supported?root?.querySelector?.('[data-hub-bridge="fock-to-lehmann"]'):null,body=supported?root?.querySelector?.('[data-hub-body="fock-to-lehmann"]'):null;
 const state=restored(store.get(storeKey)),prefix='hub-'+lessonId;let alive=true,ticket=0,busy=false;
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-hub-bridge="fock-to-lehmann"]')===detail&&root.querySelector('[data-hub-body="fock-to-lehmann"]')===body;
 const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
 const save=()=>{if(detail&&body)store.set(storeKey,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[key,field]of [['matrix','matrixOpen'],['spectrum','spectrumOpen']]){const node=body.querySelector('[data-hub-native="'+key+'"]');if(node)state[field]=readOpen(node);}const note=body.querySelector('#'+prefix+'-note');if(note)state.note=String(note.value).slice(0,2000);save();};
 const $=suffix=>body?.querySelector('#'+prefix+'-'+suffix);
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute?.('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,lessonId==='manybody-lehmann'&&typeof onOpenLab==='function');save();
   for(const[key,field]of [['matrix','matrixOpen'],['spectrum','spectrumOpen']]){const node=body.querySelector('[data-hub-native="'+key+'"]');node.ontoggle=()=>{if(active()&&body.querySelector('[data-hub-native="'+key+'"]')===node){state[field]=readOpen(node);save();}};}
   const invalidate=()=>{ticket++;state.copyOutcome='';state.copyError='';const status=$('copy-status');if(status)status.textContent='';};
   const bind=(suffix,event,action,{redraw=true}={})=>{const control=$(suffix);if(!control)return;control[event]=()=>{if(!active()||$(suffix)!==control||control.disabled)return;captureNative();action(control);save();if(redraw){draw();$(suffix==='reset'?'basis':suffix)?.focus?.({preventScroll:true});}};};
   const resetQuestion=index=>{state.choices[index]='';state.checked[index]=false;if(index===0)state.actionStep=0;};
   bind('all','onchange',control=>{state.allStates=control.checked;if(!state.allStates&&!HUBBARD_SOURCE_BASIS.includes(Number(state.basis)))state.basis='5';resetQuestion(0);invalidate();});
   bind('basis','onchange',control=>{const allowed=state.allStates?Array.from({length:16},(_,i)=>String(i)):HUBBARD_SOURCE_BASIS.map(String);if(allowed.includes(control.value))state.basis=control.value;resetQuestion(0);invalidate();});
   for(const name of ['mode','operation'])bind(name,'onchange',control=>{if((name==='mode'?['0','1','2','3']:['remove','create']).includes(control.value))state[name]=control.value;resetQuestion(0);resetQuestion(1);invalidate();});
   for(let i=0;i<3;i++){
    bind('q'+i,'onchange',control=>{state.choices[i]=question(state,i).rows.some(([key])=>key===control.value)?control.value:'';state.checked[i]=false;});
    bind('check'+i,'onclick',()=>{state.checked[i]=true;});
   }
   bind('step','onclick',()=>{state.actionStep=state.actionStep>=3?0:state.actionStep+1;state.checked[0]=false;});
   bind('probe','onchange',control=>{if(['local0','phase'].includes(control.value))state.probe=control.value;invalidate();});
   bind('phi','oninput',control=>{const value=Number(control.value);if(!Number.isFinite(value)||Math.abs(value)>Math.PI)return;state.phi=value;invalidate();const output=$('phi-value'),result=$('spectrum');if(output)output.textContent=fmt(state.phi);if(result)result.innerHTML=spectralHTML(state);},{redraw:false});
   for(const[name,value]of [['phase0',0],['phasehalf',Math.PI/2],['phasepi',Math.PI]])bind(name,'onclick',()=>{state.phi=value;state.probe='phase';invalidate();});
   bind('comparison','onchange',control=>{state.comparison=control.checked;});
   bind('note','oninput',control=>{state.note=String(control.value).slice(0,2000);},{redraw:false});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});invalidate();});
   const copyButton=$('copy');if(copyButton){copyButton.disabled=busy;copyButton.onclick=async()=>{
    if(!active()||$('copy')!==copyButton||busy)return;captureNative();const id=++ticket,request=hubbardBridgeLabRequest(state);busy=true;copyButton.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{await onOpenLab(clone(request));if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent='参考输入已复制；请在实验中手动运行计算。';save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||'参考输入暂未复制，请重试。').slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active())$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const selector of ['button','select','input','textarea'])for(const node of body.querySelectorAll(selector)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-hub-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return supported?{'fock-to-lehmann':clone(state)}:{};};return cleanup;
}
