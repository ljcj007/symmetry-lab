import {mathHTML} from './math-display.js?v=20261113-prose2';

// Finite teaching views of number-state algebra. Scientific experiments remain
// the existing Python tools; this module never starts a worker.
export const OSCILLATOR_SPECTRA_BRIDGE_HOOKS=Object.freeze({
 'scattering-temperature':Object.freeze(['ladder-weights']),
 'polaron-hamiltonian':Object.freeze(['vacuum-motion']),
 'polaron-truncation':Object.freeze(['finite-boundary'])
});
// Verified against the fixed default chain, not fitted material constants.
export const OSCILLATOR_SPECTRA_REFERENCE=Object.freeze({energyMeV:33.76000230359114,bareWeight:.014377525835849128,kBMeVK:.08617333262145});
export const OSCILLATOR_HALF_RATIO_TEMPERATURE=OSCILLATOR_SPECTRA_REFERENCE.energyMeV/(OSCILLATOR_SPECTRA_REFERENCE.kBMeVK*Math.LN2);
const CHAIN=Object.freeze({lattice:4,massA:23,massB:35.45,springIntra:2,springInter:2,basisFraction:.5,scatterA:1,scatterB:1,angle:0,selectedQ:1.8,temperature:300,sigma:.5,qMin:0,qMax:4,energyMin:-50,energyMax:50,energyCutoff:.25,qPoints:81,energyPoints:401,channel:'both'});
const {energyMeV:epsilon,bareWeight:W,kBMeVK:kB}=OSCILLATOR_SPECTRA_REFERENCE;
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(5):Number(value.toFixed(8)).toString();
const tex=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const formula=value=>`<div class="osb-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const inline=value=>`<span class="osb-inline">${mathHTML(value)}</span>`;
const table=(caption,heads,rows)=>`<div class="osb-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
const integer=(value,max=10)=>{if(!Number.isInteger(value)||value<0||value>max)throw Error('The finite number-state reference requires a stated nonnegative integer.');return value;};
const temperature=value=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1500)throw Error('The fixed-chain teaching temperature must be from 0 to 1500 K.');return value;};

/** The main source display is m=0..5; the cutoff card also uses m<=10.
 * A zero result is a zero vector, not a normalized target state.
 */
export function oscillatorLadderAction({m=0,create=true}={}){
 integer(m);if(typeof create!=='boolean')throw Error('The ladder direction must be a boolean.');
 const allowed=create||m>0,strength=allowed?(create?m+1:m):0;
 return{m,create,target:allowed?m+(create?1:-1):null,amplitude:Math.sqrt(strength),strength,
  deltaQuanta:allowed?(create?1:-1):null};
}

/** A rectangular restriction of infinite operators, not a closed truncation. */
export function oscillatorLadderMatrix({create=true}={}){
 if(typeof create!=='boolean')throw Error('The ladder direction must be a boolean.');
 const matrix=Array.from({length:7},()=>Array(6).fill(0));
 for(let m=0;m<6;m++){const action=oscillatorLadderAction({m,create});if(action.target!==null)matrix[action.target][m]=action.amplitude;}
 return{create,sourceStates:[0,1,2,3,4,5],targetStates:[0,1,2,3,4,5,6],matrix};
}

/** Stable infinite-distribution reference; m=0..5 are only visible rows.
 * Positive-temperature ratios beyond the floating-point range use a stated
 * numerical limit. The existing core independently zeros n when x>700;
 * its tiny cold approximation is reported, not changed by this module.
 */
export function oscillatorScatteringReference({temperature:T=300,m=0,create=true}={}){
 temperature(T);integer(m,5);const ladder=oscillatorLadderAction({m,create}),action={...ladder,transferEnergyMeV:ladder.deltaQuanta===null?null:ladder.deltaQuanta*epsilon};
 const exact=T===OSCILLATOR_HALF_RATIO_TEMPERATURE,ratio=T===0?null:exact?Math.LN2:epsilon/(kB*T),ratioOverflow=ratio===Infinity,x=ratioOverflow?null:ratio;
 const cold=T>0&&(ratioOverflow||x>745),r=T===0||cold?0:exact ? .5 : Math.exp(-x),oneMinus=T===0||cold?1:exact ? .5 : -Math.expm1(-x),occupation=exact?1:r/oneMinus;
 const probability=j=>T===0?(j===0?1:0):oneMinus*r**j;
 const rows=Array.from({length:6},(_,j)=>({m:j,probability:probability(j),downStrength:j,upStrength:j+1,
  weightedDown:j*probability(j),weightedUp:(j+1)*probability(j)}));
 const probabilityTail=r**6,downTail=probabilityTail*(6+occupation),upTail=probabilityTail*(7+occupation);
 const pairForward=probability(m)*(m+1),pairReverse=probability(m+1)*(m+1);
 return{temperature:T,epsilon,bareWeight:W,x,ratioOverflow,exactGeometricHalf:exact,numericalUnderflow:cold,
  coreColdApproximation:T>0&&(ratioOverflow||x>700),r,occupation,action,rows,
  selectedProbability:probability(m),selectedWeightedStrength:probability(m)*action.strength,
  tails:{probability:probabilityTail,annihilation:downTail,creation:upTail},
  visible:{probability:rows.reduce((s,row)=>s+row.probability,0),annihilation:rows.reduce((s,row)=>s+row.weightedDown,0),creation:rows.reduce((s,row)=>s+row.weightedUp,0)},
  total:{annihilation:occupation,creation:occupation+1},
  pair:{lower:m,upper:m+1,forwardInitialProbability:probability(m),reverseInitialProbability:probability(m+1),matrixElementSquared:m+1,
   forward:pairForward,reverse:pairReverse,rowRatio:pairForward>0?pairReverse/pairForward:null,analyticPositiveTemperatureRatio:T>0?r:null},
  peaks:{stokes:{energy:epsilon,weight:W*(occupation+1)},antiStokes:{energy:-epsilon,weight:W*occupation}},
  meanX:0,meanX2:2*occupation+1};
}

/** One exact number state, not a thermal or coupled polaron initial state. */
export function oscillatorVacuumReference({m=0}={}){
 integer(m,5);return{m,annihilation:oscillatorLadderAction({m,create:false}),creation:oscillatorLadderAction({m,create:true}),
  meanX:0,meanX2:2*m+1,varianceX:2*m+1,phononNumber:m};
}

/** Square finite operators; their top boundary differs from the display above. */
export function oscillatorFiniteBoundary({cutoff=6,m=cutoff}={}){
 if(![2,6,10].includes(cutoff))throw Error('The cutoff card supports 2, 6 or 10.');integer(m,cutoff);
 const size=cutoff+1,b=Array.from({length:size},()=>Array(size).fill(0));for(let j=1;j<size;j++)b[j-1][j]=Math.sqrt(j);
 const creation=b.map((row,i)=>row.map((_v,j)=>b[j][i])),bbdag=m<cutoff?m+1:0,bdagb=m;
 return{cutoff,m,dimension:size,annihilation:b,creation,commutatorDiagonal:Array.from({length:size},(_,j)=>j<cutoff?1:-cutoff),
  bbdag,bdagb,commutator:bbdag-bdagb,finiteCreationTarget:m<cutoff?m+1:null,infiniteCreationTarget:m+1,
  infiniteCreationAmplitude:Math.sqrt(m+1),topBoundary:m===cutoff};
}

/** Legal full fixed-chain input. No selected m, W, epsilon or band is posted. */
export function oscillatorSpectraLabRequest({temperature:T=300}={}){
 temperature(T);return{action:'dynamic_scattering_lab',module:'scattering',input:{...CHAIN,temperature:T}};
}

const checks=[
 {prompt:'对 m=2 的数态创建一个声子，振幅与矩阵元平方分别是多少？',answer:'sqrt',rows:[['sqrt','√3、3'],['three','3、3'],['unit','1、1'],['down','√2、2']],feedback:{
  sqrt:'b†|2⟩=√3|3⟩；跃迁强度因子是振幅的平方 3。',three:'3 是矩阵元平方，振幅是 √3，不能把两者混为一项。',unit:'把目标态归一化不能丢掉原先的模长；否则所有非零跃迁都会被误算成强度 1。',down:'√2、2 对应从 |2⟩ 湮灭一个声子；创建使用 m+1。'}},
 {prompt:'零温且裸权重非零时，哪一侧保留，声子的能量从哪里来？',answer:'positive',rows:[['positive','正能量 Stokes，能量由探针提供'],['none','两侧都没有，因为平均声子数为零'],['negative','负能量侧，晶格向探针供能'],['half','消耗零点项里的半个热声子']],feedback:{
  positive:'b†|0⟩=|1⟩，创建矩阵元非零。正 E 表示探针损失能量，晶格得到 ε；b|0⟩=0。',none:'没有热声子可以湮灭，不妨碍探针向晶格供能并创建一个声子。',negative:'负 E 是探针获得能量，需要初态中已有可湮灭的声子；真空没有这个过程。',half:'零点能不是半个已经存在的热声子。+1 来自 b b† 的矩阵元，不是抽取真空能量。'}},
 {prompt:'当 r=1/2，m≥6 的概率为 1/64，能否把它当成两侧缺失的强度？',answer:'weighted',rows:[['weighted','不能，下行尾为 7/64，上行尾为 8/64'],['same','能，两侧都补 1/64'],['normalize','删掉尾项，把六行重新归一化'],['clip','把最高可见态的创建设为零']],feedback:{
  weighted:'先用 m 或 m+1 乘每个概率再求和；概率尾和跃迁强度尾是三种不同的量。',same:'高数态的矩阵元更大，不能用未加权的概率总和代替加权强度。',normalize:'这会换成一个截断且重归一化的热模型，已经不是原来的无限谐振子。',clip:'m=5 只是显示窗口的顶端，b† 仍把它送到 √6|6⟩；这里没有物理占据上限。'}}
];
function kindFor(id){return Object.hasOwn(OSCILLATOR_SPECTRA_BRIDGE_HOOKS,id)?OSCILLATOR_SPECTRA_BRIDGE_HOOKS[id][0]:null;}
const initial=kind=>({open:false,matrixOpen:false,proofOpen:false,boundaryOpen:false,temperature:300,m:kind==='finite-boundary'?6:0,create:true,actionStep:0,cutoff:6,choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved,kind){
 const state=initial(kind);if(!saved||typeof saved!=='object')return state;
 for(const name of ['open','matrixOpen','proofOpen','boundaryOpen'])if(typeof saved[name]==='boolean')state[name]=saved[name];
 if(typeof saved.temperature==='number'&&Number.isFinite(saved.temperature)&&saved.temperature>=0&&saved.temperature<=1500)state.temperature=saved.temperature;
 if([2,6,10].includes(saved.cutoff))state.cutoff=saved.cutoff;
 if(Number.isInteger(saved.m)&&saved.m>=0&&saved.m<=(kind==='finite-boundary'?state.cutoff:5))state.m=saved.m;
 if(typeof saved.create==='boolean')state.create=saved.create;if(Number.isInteger(saved.actionStep)&&saved.actionStep>=0&&saved.actionStep<=3)state.actionStep=saved.actionStep;
 for(let i=0;i<3;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);return state;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button id="${id}" type="button" ${disabled?'disabled':''}>${label}</button>`;
const mOptions=max=>Array.from({length:max+1},(_,m)=>[m,'m = '+m]);
function actionHTML(state){
 if(!state.actionStep)return '<p>先预测目标数态、振幅和能量方向，再逐步展开。</p>';
 const a=oscillatorScatteringReference(state).action,items=[];
 if(state.actionStep>=1)items.push('<li>'+(a.target===null?'b|0⟩ 是零向量，没有可归一化的非零目标态。':'目标数态：'+inline('\\lvert '+a.target+'\\rangle')+'。')+'</li>');
 if(state.actionStep>=2)items.push('<li>'+formula((a.create?'b^\\dagger':'b')+'\\lvert '+a.m+'\\rangle='+(a.target===null?'0':'\\sqrt{'+a.strength+'}\\lvert '+a.target+'\\rangle'))+formula('|A|^2='+a.strength)+'<p>矩阵元平方是强度或跃迁率中的因子，可以大于 1；它本身不是归一事件概率。</p></li>');
 if(state.actionStep>=3)items.push('<li>'+(a.target===null?'<p>零矩阵元没有非弹性谱线，不能给它指派可见的负能量峰。</p>':formula('E=E_f^{\\rm system}-E_i^{\\rm system}='+(a.create?'+':'-')+'\\epsilon='+tex(a.transferEnergyMeV)+'\\,\\mathrm{meV}')+'<p>'+(a.create?'系统向上跃迁 ε，探针损失 ε：正能量 Stokes。':'系统向下跃迁 ε，探针获得 ε：负能量 anti-Stokes。')+'</p>')+'</li>');
 return '<ol>'+items.join('')+'</ol>';
}
function ladderMatrixHTML(state){
 const r=oscillatorLadderMatrix(state);
 return table('行是目标数态，列是初态；目标保留到 |6⟩',['目标 / 初态',...r.sourceStates.map(m=>inline('\\lvert '+m+'\\rangle'))],r.matrix.map((row,i)=>[inline('\\lvert '+i+'\\rangle'),...row.map((v,j)=>`<span class="${j===state.m?'osb-selected-column':''}">${v?inline('\\sqrt{'+(state.create?j+1:j)+'}'):'0'}</span>`)]))+
 '<p>这是无限算符的 7×6 显示窗口，不是封闭的六态截断。b†|5⟩=√6|6⟩ 仍然保留。</p>';
}
function ledgerHTML(state){
 const r=oscillatorScatteringReference(state);
 return formula('T='+tex(r.temperature)+'\\,\\mathrm K,\\qquad\\overline n='+tex(r.occupation))+
 (r.coreColdApproximation?'<p class="osb-scope">这个正温度极低。局部数态参照保留可表示的微小热项；原散射实验在 x>700 时把热占据置零，超出浮点范围时局部结果也取数值零。这些是数值近似，不是另一个严格零温态；复制不会改变原核心。</p>':'')+
 table('热初态先乘矩阵元平方，再把不同初态的强度相加',['m','pₘ','下行 pₘ m','上行 pₘ(m+1)'],r.rows.map(row=>[row.m===state.m?'<strong>'+row.m+'</strong>':row.m,fmt(row.probability),fmt(row.weightedDown),fmt(row.weightedUp)]))+
 formula('\\rho=\\sum_m p_m\\lvert m\\rangle\\langle m\\rvert,\\qquad I/W=\\sum_m p_m|A_m|^2')+
 '<p>热初态是统计混合，不能把各行改成带 √pₘ 的振幅相加。不同原子通向同一模式的相干振幅已包含在裸权重 W 中，那是另一层相干性。</p>'+
 formula('p_{'+state.m+'}|A|^2='+tex(r.selectedWeightedStrength))+'<p>当前选中初态的单行贡献如上；算符允许一个动作，并不意味着这个热初态一定有非零概率。</p>';
}
function tailsHTML(state){
 const r=oscillatorScatteringReference(state);
 return formula('r=e^{-\\epsilon/(k_BT)},\\qquad p_m=(1-r)r^m')+
 table('三种尾项分别计算，前六行不重新归一化',['量','m=0…5 的可见和','m≥6 的尾项','完整和'],[
  ['概率',fmt(r.visible.probability),fmt(r.tails.probability),'1'],
  ['湮灭强度 / W',fmt(r.visible.annihilation),fmt(r.tails.annihilation),fmt(r.total.annihilation)],
  ['创建强度 / W',fmt(r.visible.creation),fmt(r.tails.creation),fmt(r.total.creation)]])+
 formula('P(m\\ge6)=r^6,\\quad\\sum_{m\\ge6}mp_m=r^6(6+\\overline n),\\quad\\sum_{m\\ge6}(m+1)p_m=r^6(7+\\overline n)')+
 (r.exactGeometricHalf?'<p class="osb-exact">当前 r=1/2、n̄=1：概率尾 1/64，下行强度尾 7/64，上行强度尾 8/64；完整下行与上行强度分别是 1 和 2。</p>':'<p>概率很小的高数态也带更大的矩阵元因子。概率尾项不能直接代替强度尾项。</p>');
}
function pairHTML(state){
 const r=oscillatorScatteringReference(state),p=r.pair;
 return '<p>这里把当前数字 m 当作一对跃迁中的较低数态标号：正向创建从 m 出发，反向湮灭从 m+1 出发。它们不是使用同一个初态概率。</p>'+
 formula('\\lvert '+p.lower+'\\rangle\\;\\xrightleftharpoons[b]{b^\\dagger}\\;\\lvert '+p.upper+'\\rangle')+
 table('同一个微观正反对：矩阵元平方相同，初态概率不同',['方向','初态概率','矩阵元平方','归一强度'],[
  ['创建：m→m+1',fmt(p.forwardInitialProbability),p.matrixElementSquared,fmt(p.forward)],
  ['湮灭：m+1→m',fmt(p.reverseInitialProbability),p.matrixElementSquared,fmt(p.reverse)]])+
 (p.rowRatio===null?'<p class="osb-scope">这对可见行没有可用于相除的正向数值权重；不能从双零行读出温度。正温度下的解析概率关系仍可单独写出。</p>':formula('I_{\\rm reverse}/I_{\\rm forward}='+tex(p.rowRatio)))+
 formula('\\frac{p_{m+1}(m+1)}{p_m(m+1)}=r,\\qquad\\frac{I_-}{I_+}=\\frac{\\overline n}{\\overline n+1}=e^{-\\epsilon/(k_BT)}')+
 '<p>第一条比值要求初态概率非零；零温单独用 p₀=1 处理。+1 来自 b b† 的矩阵元，零点能不是半个现成的热声子。能量基准整体平移不会改变跃迁能量与这些矩阵元。</p>';
}
function peaksHTML(state){
 const r=oscillatorScatteringReference(state);
 return table('固定链的光学模：与既有实验的光学行比较',['过程','E / meV','归一单模 I/W','乘 W 后的相对积分强度'],[
  ['Stokes · 创建',fmt(epsilon),fmt(r.total.creation),fmt(r.peaks.stokes.weight)],
  ['anti-Stokes · 湮灭',fmt(-epsilon),fmt(r.total.annihilation),fmt(r.peaks.antiStokes.weight)]])+
 formula('W='+tex(W)+',\\quad I_+-I_-=W,\\quad (I_++I_-)/W=2\\overline n+1')+
 '<p>这是固定双原子链在完整 Q=1.8 Å⁻¹ 的光学参考，ε=33.7600023 meV。原实验计算两条分支；这里选光学行，不向核心添加“所选能带”或任意能量字段。</p>'+
 '<p>βA、βB 在此指原表单 scatterA、scatterB 的有符号标量散射振幅，不是算符 b、b†。W 已含原子相干和、质量与纵向投影；简并子空间的 W 也不再重复乘简并度。</p>';
}
function boundaryExamplesHTML(){
 return '<p>当纵向投影为零时，两侧都可变暗。若 W=0，I₋/I₊ 是 0/0，不能当作测温结果。</p><a href="#compute/dynamic-scattering-lab?preset=scattering-transverse">打开原有垂直投影预设 →</a>'+
 table('另一个已核验例子，固定 T=300 K、σ=8 meV',['比较对象','E=±10 meV 的比值'],[['展宽后的 S(−10)/S(+10)','0.33723847'],['exp(−10/kBT)','0.67921520']])+
 '<p>这个表独立于当前温度控件。详细平衡核对未展宽的单模权重；Gaussian 展宽、多模叠加和有限窗口使逐点曲线比值不能直接代入该式。原实验并未从 σ 求寿命。</p>';
}
function vacuumHTML(state){
 const r=oscillatorVacuumReference(state);
 return formula('X=b+b^\\dagger,\\qquad X\\lvert '+r.m+'\\rangle='+(r.m?'\\sqrt{'+r.m+'}\\lvert '+(r.m-1)+'\\rangle+':'')+'\\sqrt{'+(r.m+1)+'}\\lvert '+(r.m+1)+'\\rangle')+
 formula('\\langle X\\rangle=0,\\qquad\\langle X^2\\rangle=\\mathrm{Var}(X)='+r.meanX2)+
 '<p>两个目标数态正交，所以 X 的模平方相加。对角矩阵元为零不表示 X 没有涨落。</p>'+
 (r.m===0?'<p class="osb-exact">真空中 b|0⟩=0、b†|0⟩=|1⟩，因此 ⟨X⟩=0、⟨X²⟩=1。省略 Hamiltonian 的零点常数不会去掉这个涨落。</p>':'<p>当前是一个激发数态的代数比较，不是给原来的零温极化子实验设置了温度或激发初态。</p>');
}
function finiteHTML(state){
 const r=oscillatorFiniteBoundary(state);
 return table('有限平方矩阵对当前 |m⟩ 的作用',['量','值'],[['最大声子数 N',r.cutoff],['当前数态 m',r.m],['⟨bN bN†⟩',r.bbdag],['⟨bN† bN⟩',r.bdagb],['⟨[bN,bN†]⟩',r.commutator]])+
 formula('[b_N,b_N^\\dagger]=I-(N+1)\\lvert N\\rangle\\langle N\\rvert')+
 (r.topBoundary?'<p class="osb-scope">当前在数值最高层。有限矩阵把创建动作截掉，但无限振子仍能创建到 |N+1⟩。这不是玻色子遵守 Pauli 占据上限。</p>':'<p>当前不在最高层，对易子作用为 +1；边界差异集中在最高数态，不是所有列都改变。</p>')+
 formula('b^\\dagger\\lvert '+r.m+'\\rangle=\\sqrt{'+(r.m+1)+'}\\lvert '+(r.m+1)+'\\rangle\\quad(\\mathrm{infinite})')+
 '<p>负的顶部对易子不是负概率：表中两个模平方都非负，只是它们的差不同。扩大矩阵后还要检查原有顶部概率与相邻截断，不能只看求解残差。</p>';
}
function finiteMatrixHTML(state){
 const r=oscillatorFiniteBoundary(state);
 return table('有限创建矩阵：最高初态列被截掉',['目标 / 初态',...r.creation.map((_row,i)=>i)],r.creation.map((row,i)=>[i,...row.map(v=>v?inline('\\sqrt{'+Math.round(v*v)+'}'):'0')]))+
 formula('\\mathrm{diag}([b_N,b_N^\\dagger])=('+r.commutatorDiagonal.join(',')+')');
}
function checkHTML(prefix,state,index){
 const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice;
 return `<section class="osb-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,'你的预测',[['','先选择预测'],...q.rows],choice)}${button(prefix+'-check'+index,'核对这一步',!choice)}<p id="${prefix}-feedback${index}" class="osb-feedback${checked&&choice===q.answer?' osb-correct':''}" role="status">${checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function mainHTML(prefix,state,canOpenLab){
 return '<p class="osb-scope">固定默认双原子链的一个光学参考；局部操作只演示数态代数与统计加权，不指定材料实验数据。正 E 表示探针损失能量，系统获得能量。</p>'+
 `<section class="osb-stage"><h3>1 · 作用一次，保留振幅的模长</h3><div class="osb-controls">${select(prefix+'-m','初态声子数 m',mOptions(5),state.m)}${select(prefix+'-direction','本次算符',[['create','b† · 创建'],['annihilate','b · 湮灭']],state.create?'create':'annihilate')}</div>${button(prefix+'-step',state.actionStep>=3?'收起本次推导':'展开下一步')}${button(prefix+'-m2','试算 m=2 的创建')}<div id="${prefix}-action">${actionHTML(state)}</div><details data-osb-native="matrix" ${state.matrixOpen?'open':''}><summary>把同一动作读成矩形矩阵的一列</summary><div id="${prefix}-matrix">${ladderMatrixHTML(state)}</div></details></section>`+
 `<section class="osb-stage"><h3>2 · 热概率乘矩阵元平方</h3><label for="${prefix}-temperature">${'温度 T / K'}<input id="${prefix}-temperature" type="range" min="0" max="1500" step="any" value="${state.temperature}"><output id="${prefix}-temperature-value">${fmt(state.temperature)} K</output></label><div class="osb-temperature-buttons">${button(prefix+'-t0','0 K')}${button(prefix+'-t300','300 K')}${button(prefix+'-thalf','r=1/2')}${button(prefix+'-t1500','1500 K')}</div><div id="${prefix}-ledger">${ledgerHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>3 · 三种尾项，三本不同的账</h3><div id="${prefix}-tails">${tailsHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>4 · 把一对微观正反跃迁配起来</h3><div id="${prefix}-pair">${pairHTML(state)}</div></section>`+
 `<section class="osb-stage"><h3>5 · 回到原实验的光学模权重表</h3><div id="${prefix}-peaks">${peaksHTML(state)}</div><details data-osb-native="boundary" ${state.boundaryOpen?'open':''}><summary>两种不能直接由比值读温度的情况</summary>${boundaryExamplesHTML()}</details>${canOpenLab?button(prefix+'-copy','复制完整链与当前温度到原实验'):'<a href="#compute/dynamic-scattering-lab?preset=scattering-warm">打开原有 300 K 链模型预设 →</a><p>普通链接不传递当前温度。请在原实验中手动填写温度，再运行计算。</p>'}<p class="osb-copy-scope">复制的是完整默认链，原实验同时计算声学与光学两支；局部 m、算符方向和显示窗口不传入核心。复制后仍需手动运行。</p><p id="${prefix}-copy-status" class="osb-feedback" role="status">${state.copyOutcome==='success'?'完整链输入已复制；请在原实验中手动运行。':state.copyOutcome==='error'?esc(state.copyError):''}</p></section>`+
 `<section class="osb-stage"><h3>三个预测检查</h3>${checks.map((_q,i)=>checkHTML(prefix,state,i)).join('')}</section>`;
}
function polaronHTML(prefix,state,kind){
 if(kind==='vacuum-motion')return '<p class="osb-scope">这里只操作一个无量纲振子坐标 X；原 Holstein 模型仍是二站点、单电子、两个局域振子和零温。</p>'+
 `<div class="osb-controls">${select(prefix+'-m','比较数态 m（不是温度输入）',mOptions(5),state.m)}</div><div id="${prefix}-vacuum">${vacuumHTML(state)}</div>`+
 '<p>电子位点占据 nᵉ 与声子数 m 是两种标签：完整基底可写成 |i,m₀,m₁⟩。在 g=0、t=ℏω=1 eV、Δ=0 时，原实验的两个振子都在真空，电子约化纯度为 1。</p>'+
 formula('H_{ep}=g\\sum_i n_i^e X_i,\\qquad X_i=b_i+b_i^\\dagger')+
 '<p>g 的单位是 eV，X 无量纲，不能把 X 直接称为 Å。原模型省略两个振子的总零点常数 ℏω，这不改变 b、b† 或 X 的矩阵元。</p>'+
 '<p>耦合后的零温声子云不必是 Bose 热几何分布。现有原子极限预设的位移真空近似给出 Poisson 数分布，非零声子数不能直接解释为非零温度。</p>'+
 '<p class="osb-scope">原极化子工具不接受温度；热桥 θ=400 K 的能量约 0.03447 eV，也低于当前工具的 0.2 eV 输入下限。这里不传递温度、数态选择或那个能量。</p><a href="#compute/polaron-lab?preset=uncoupled">打开原有无耦合极化子预设 →</a><p>此链接载入原有预设，不把当前数态选择变成它的初态。</p>';
 return '<p class="osb-scope">这里故意使用有限平方矩阵，与散射卡的矩形显示窗口不同。比较数值最高层与内部数态，查看对易子的边界项。</p>'+
 `<div class="osb-controls">${select(prefix+'-cutoff','数值最大声子数 N',[[2,'N = 2'],[6,'N = 6'],[10,'N = 10']],state.cutoff)}${select(prefix+'-m','当前数态 m',mOptions(state.cutoff),state.m)}</div>${button(prefix+'-top','查看最高数态 m=N')}<div id="${prefix}-finite">${finiteHTML(state)}</div><details data-osb-native="matrix" ${state.matrixOpen?'open':''}><summary>展开有限创建矩阵与对易子对角线</summary><div id="${prefix}-finite-matrix">${finiteMatrixHTML(state)}</div></details>`+
 '<p>这里不修改原实验的截断参数。回到原课，继续使用已有的最高层概率与相邻截断检查；当前卡不是新的收敛证明。</p><a href="#classroom/structure-dynamics?module=polaron&tab=learn&lesson=polaron-truncation">回到原有截断收敛课程 →</a><a href="#compute/polaron-lab?preset=truncation-warning">打开原有不足截断预设 →</a>';
}
function bodyHTML(prefix,state,kind,canOpenLab){
 return (kind==='ladder-weights'?mainHTML(prefix,state,canOpenLab):polaronHTML(prefix,state,kind))+
 `<label class="osb-note-label" for="${prefix}-note">${'写一句自己的解释（仅保存在当前页面内存）'}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset','重置这张操作卡')}`;
}

export function oscillatorSpectraBridgeHTML(lessonId){
 const kind=kindFor(lessonId);if(!kind)return '';
 const title=kind==='ladder-weights'?'从一个数态动作算出两侧谱权重':kind==='vacuum-motion'?'平均位移为零，为何仍有真空涨落？':'有限矩阵顶部为何不再满足单位对易子？';
 return `<section class="osb-prerequisite" aria-label="可选的振子算符与谱权重操作卡"><p class="osb-optional">展开一个有限操作例，把数态、算符矩阵元和当前课程中的物理量接起来。</p><details class="osb-bridge" data-osb-bridge="${kind}"><summary>${title}</summary><div class="osb-body" data-osb-body="${kind}"></div></details></section>`;
}

export function bindOscillatorSpectraBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const kind=kindFor(lessonId),store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':'+kind;
 const detail=kind?root?.querySelector?.('[data-osb-bridge="'+kind+'"]'):null,body=kind?root?.querySelector?.('[data-osb-body="'+kind+'"]'):null;
 const state=restored(store.get(key),kind),prefix='osb-'+lessonId;let alive=true,busy=false,ticket=0;
 const $=name=>body?.querySelector('#'+prefix+'-'+name);
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-osb-bridge="'+kind+'"]')===detail&&root.querySelector('[data-osb-body="'+kind+'"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(detail&&body)store.set(key,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['matrix','matrixOpen'],['proof','proofOpen'],['boundary','boundaryOpen']]){const node=body.querySelector('[data-osb-native="'+name+'"]');if(node)state[field]=readOpen(node);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const node=$('q'+i);if(node&&(node.value===''||checks[i].rows.some(([id])=>id===node.value))&&state.choices[i]!==node.value){state.choices[i]=node.value;state.checked[i]=false;}}save();};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 const paint=()=>{if(!active())return;for(const[name,render]of (kind==='ladder-weights'?[['action',actionHTML],['matrix',ladderMatrixHTML],['ledger',ledgerHTML],['tails',tailsHTML],['pair',pairHTML],['peaks',peaksHTML]]:kind==='vacuum-motion'?[['vacuum',vacuumHTML]]:[['finite',finiteHTML],['finite-matrix',finiteMatrixHTML]]))if($(name))$(name).innerHTML=render(state);if($('temperature-value'))$('temperature-value').textContent=fmt(state.temperature)+' K';if($('step'))$('step').textContent=state.actionStep>=3?'收起本次推导':'展开下一步';};
 const paintQuestion=i=>{const q=checks[i],choice=state.choices[i],checked=state.checked[i]&&choice,node=$('feedback'+i);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','osb-feedback'+(checked&&choice===q.answer?' osb-correct':''));}if($('check'+i))$('check'+i).disabled=!choice;};
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,kind,kind==='ladder-weights'&&typeof onOpenLab==='function');save();
   for(const[name,field]of [['matrix','matrixOpen'],['proof','proofOpen'],['boundary','boundaryOpen']]){const node=body.querySelector('[data-osb-native="'+name+'"]');if(node)node.ontoggle=()=>{if(active()&&body.querySelector('[data-osb-native="'+name+'"]')===node){state[field]=readOpen(node);save();}};}
   const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!active()||$(name)!==node||node.disabled)return;captureNative();action(node);save();};};
   bind('m','onchange',node=>{const value=Number(node.value),max=kind==='finite-boundary'?state.cutoff:5;if(node.value!==''&&Number.isInteger(value)&&value>=0&&value<=max){state.m=value;state.actionStep=0;paint();}});
   bind('direction','onchange',node=>{if(['create','annihilate'].includes(node.value)){state.create=node.value==='create';state.actionStep=0;paint();}});
   bind('step','onclick',()=>{state.actionStep=state.actionStep>=3?0:state.actionStep+1;paint();});
   bind('m2','onclick',()=>{state.m=2;state.create=true;state.actionStep=0;$('m').value='2';$('direction').value='create';paint();});
   bind('temperature','oninput',node=>{const value=Number(node.value);if(node.value!==''&&Number.isFinite(value)&&value>=0&&value<=1500){state.temperature=value;clearCopy();paint();}});
   for(const[name,value]of [['t0',0],['t300',300],['thalf',OSCILLATOR_HALF_RATIO_TEMPERATURE],['t1500',1500]])bind(name,'onclick',()=>{state.temperature=value;$('temperature').value=String(value);clearCopy();paint();});
   bind('cutoff','onchange',node=>{const value=Number(node.value);if([2,6,10].includes(value)){state.cutoff=value;state.m=Math.min(state.m,value);draw();$('cutoff')?.focus?.({preventScroll:true});}});
   bind('top','onclick',()=>{state.m=state.cutoff;$('m').value=String(state.m);paint();});
   for(let i=0;i<3;i++){bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});}
   bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(kind),{open});clearCopy();draw();$('m')?.focus?.({preventScroll:true});});
   const copy=$('copy');if(copy){copy.disabled=busy;copy.onclick=async()=>{
    if(!active()||$('copy')!==copy||busy)return;captureNative();const request=oscillatorSpectraLabRequest(state),id=++ticket;busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error('完整链输入暂未复制，请重试。');if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent='完整链输入已复制；请在原实验中手动运行。';save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||'完整链输入暂未复制，请重试。').slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const tag of ['button','select','input','textarea'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-osb-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return kind?{[kind]:clone(state)}:{};};return cleanup;
}
