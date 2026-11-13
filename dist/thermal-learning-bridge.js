import {mathHTML} from './math-display.js?v=20261113-prose2';

// A bounded local teaching reference, not a replacement for phonon_thermo.
export const THERMAL_BRIDGE_HOOKS=Object.freeze({'thermal-oscillator':Object.freeze(['oscillator-probabilities'])});
export const THERMAL_CONSTANTS=Object.freeze({theta:400,h:6.62607015e-34,kB:1.380649e-23,NA:6.02214076e23,eV:1.602176634e-19,c:299792458});
export const THERMAL_EXACT_TEMPERATURE=THERMAL_CONSTANTS.theta/Math.LN2;
const {theta,h,kB,NA,eV,c}=THERMAL_CONSTANTS,epsilon=kB*theta,R=kB*NA;
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=value=>value===0?'0':Math.abs(value)<1e-5||Math.abs(value)>=1e5?value.toExponential(5):Number(value.toFixed(8)).toString();
const tex=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const formula=value=>`<div class="thb-formula" tabindex="0">${mathHTML(value,true)}</div>`;
const inline=value=>`<span class="thb-inline">${mathHTML(value)}</span>`;
const table=(caption,heads,rows)=>`<div class="thb-table-wrap" tabindex="0"><table><caption>${caption}</caption><thead><tr>${heads.map(x=>'<th scope="col">'+x+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map((x,i)=>i?'<td>'+x+'</td>':'<th scope="row">'+x+'</th>').join('')+'</tr>').join('')}</tbody></table></div>`;
function validTemperature(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000)throw Error('The teaching temperature must be a finite number from 0 to 1000 K.');return value;}
function validReference(value){if(!['absolute','shifted'].includes(value))throw Error('The teaching energy reference must be absolute or shifted.');return value;}
function validCount(value,values){if(!values.includes(value))throw Error('The teaching mode count must use a stated integer option.');return value;}

/** One fixed positive-frequency oscillator. F/U in J; S/Cv in J/K.
 * reference='shifted' subtracts epsilon/2 from every level, not from physics.
 * Visible m=0..5 probabilities are never renormalized; tail is P(m>=6).
 */
export function thermalOscillatorReference({temperature=400,reference='absolute'}={}){
 validTemperature(temperature);validReference(reference);
 const exact=temperature===THERMAL_EXACT_TEMPERATURE,ratio=temperature===0?null:exact?Math.LN2:theta/temperature;
 const ratioOverflow=ratio===Infinity,x=ratioOverflow?null:ratio;
 const underflow=temperature>0&&(ratioOverflow||x>745),q=temperature===0||underflow?0:exact ? .5 : Math.exp(-x),oneMinus=temperature===0||underflow?1:exact ? .5 : -Math.expm1(-x);
 const occupation=exact?1:q/oneMinus,zpe=epsilon/2,energyBase=reference==='absolute'?zpe:0;
 const logOneMinus=temperature===0||underflow?0:x<.7?Math.log(oneMinus):Math.log1p(-q);
 const entropy=temperature===0||underflow?0:kB*(x*occupation-logOneMinus);
 const heatCapacity=temperature===0||underflow?0:kB*(x/oneMinus)**2*q;
 const internalEnergy=energyBase+epsilon*occupation;
 const freeEnergy=temperature===0||underflow?energyBase:energyBase+kB*temperature*logOneMinus;
 const levels=Array.from({length:6},(_,m)=>({m,energyJ:epsilon*m+energyBase,energyMeV:(epsilon*m+energyBase)/eV*1000,
  probability:temperature===0?(m===0?1:0):oneMinus*q**m,occupationContribution:temperature===0?0:m*oneMinus*q**m}));
 return{temperature,reference,theta,x,epsilonJ:epsilon,epsilonMeV:epsilon/eV*1000,physicalZeroPointEnergyJ:zpe,
  exactGeometricHalf:exact,numericalUnderflow:underflow,ratioOverflow,occupation,levels,tailProbability:q**6,
  visibleProbability:levels.reduce((sum,row)=>sum+row.probability,0),
  freeEnergy,internalEnergy,entropy,heatCapacity,heatCapacityOverKB:heatCapacity/kB,
  energyVariance:epsilon**2*occupation*(occupation+1),
  frequency:{THz:epsilon/h/1e12,'cm^-1':epsilon/(h*c*100),meV:epsilon/eV*1000}};
}

/** Additive ledgers: selected d modes are distinct from a complete 3n model. */
export function thermalBridgeReference({temperature=400,reference='absolute',degeneracy=3,natom=2}={}){
 validCount(degeneracy,[1,3]);validCount(natom,[1,2]);
 const single=thermalOscillatorReference({temperature,reference}),modes=3*natom;
 return{single,degeneracy,natom,local:{modes:degeneracy,occupation:degeneracy*single.occupation,
   energyMeV:degeneracy*single.internalEnergy/eV*1000,heatCapacityOverKB:degeneracy*single.heatCapacityOverKB},
  complete:{modes,occupation:modes*single.occupation,energyCellEV:modes*single.internalEnergy/eV,freeEnergyMolar:modes*single.freeEnergy*NA/1000,
   energyMolar:modes*single.internalEnergy*NA/1000,entropyMolar:modes*single.entropy*NA,
   heatCapacityMolar:modes*single.heatCapacity*NA,heatCapacityPerMoleAtoms:modes*single.heatCapacity*NA/natom,
   highTemperatureLimit:modes*R,physicalZeroPointEnergyMolar:modes*epsilon/2*NA/1000}};
}

/** A separate fixed 400 K slope example; molar U is kJ/mol model cells. */
export function thermalSlopeReference({natom=2,reference='absolute'}={}){
 validCount(natom,[1,2]);validReference(reference);
 const rows=[399,400,401].map(temperature=>{const result=thermalBridgeReference({temperature,natom,reference});return{temperature,energyMolar:result.complete.energyMolar,heatCapacityMolar:result.complete.heatCapacityMolar};});
 return{rows,deltaTemperature:2,centralSlope:(rows[2].energyMolar-rows[0].energyMolar)*1000/2,
  analyticHeatCapacity:rows[1].heatCapacityMolar,unit:'J/(mol model cells K)'};
}

/** Copy the real temperature to the existing complete model. Never run it. */
export function thermalBridgeLabRequest({temperature=400,natom=2}={}){
 validTemperature(temperature);validCount(natom,[1,2]);
 return{action:'phonon_thermo',module:'thermo',input:{source:'einstein',natom,theta_e:theta,t_min:temperature,t_max:temperature,t_step:20}};
}

const checks=[
 {prompt:'正频率振子在 T=0 时，平均声子数为零，哪些量仍可非零？',answer:'energy',rows:[['energy','U 和 F 的零点基准'],['heat','Cv，因为零点能非零'],['half','平均声子数为 1/2']],feedback:{
  energy:'m=0 仍有能量 ε/2；没有热占据变化，所以 S=Cv=0。',
  heat:'Cv 是能量对温度的斜率。固定频率的零点能不随温度改变，不能由 U 非零推断 Cv 非零。',
  half:'1/2 是能量中的零点项，不是数算符的平均占据。基态的平均声子数仍为零。'}},
 {prompt:'三个同频的独立简并模式，各自平均占据为 n̄，哪项正确？',answer:'add',rows:[['add','总热容乘三，每个模式的 n̄ 不变'],['frequency','频率乘三后算一个模式'],['one','只有一个频率，只算一个模式']],feedback:{
  add:'独立振子的配分函数相乘，F、U、S、Cv 相加；频率和每个模式的概率分布不变。',
  frequency:'把频率乘三会改变能级间隔与 Bose 分布，不等于增加三个独立坐标。',
  one:'相同频率可以对应三个独立坐标。简并度计入模式数，不能只数不同的频率值。'}},
 {prompt:'固定体积和频率，从每个能级减去 ε/2 后，Cv 怎样变化？',answer:'same',rows:[['same','保持不变'],['half','变为原来的一半'],['zero','变为零']],feedback:{
  same:'所有能级同时平移，归一概率和温度斜率不变。U 与 F 改变一个常数，S 与 Cv 不变。',
  half:'零点项不是贡献一半热容的热激发。它是与温度无关的能量常数。',
  zero:'减去常数后，热占据仍随温度变化，因此热容仍可非零。'}}
];
const initial=()=>({open:false,derivationOpen:false,slopeOpen:false,temperature:400,reference:'absolute',degeneracy:3,natom:2,unit:'THz',choices:['','',''],checked:[false,false,false],note:'',copyOutcome:'',copyError:''});
function restored(saved){
 const state=initial();if(!saved||typeof saved!=='object')return state;
 for(const key of ['open','derivationOpen','slopeOpen'])if(typeof saved[key]==='boolean')state[key]=saved[key];
 if(typeof saved.temperature==='number'&&Number.isFinite(saved.temperature)&&saved.temperature>=0&&saved.temperature<=1000)state.temperature=saved.temperature;
 if(['absolute','shifted'].includes(saved.reference))state.reference=saved.reference;
 if([1,3].includes(saved.degeneracy))state.degeneracy=saved.degeneracy;if([1,2].includes(saved.natom))state.natom=saved.natom;
 if(['THz','cm^-1','meV'].includes(saved.unit))state.unit=saved.unit;
 for(let i=0;i<checks.length;i++)if(checks[i].rows.some(([id])=>id===saved.choices?.[i])){state.choices[i]=saved.choices[i];state.checked[i]=saved.checked?.[i]===true;}
 if(typeof saved.note==='string')state.note=saved.note.slice(0,2000);
 if(['success','error'].includes(saved.copyOutcome))state.copyOutcome=saved.copyOutcome;
 if(typeof saved.copyError==='string')state.copyError=saved.copyError.slice(0,500);return state;
}
const select=(id,label,rows,value)=>`<label for="${id}">${label}<select id="${id}">${rows.map(([key,text])=>`<option value="${esc(key)}" ${String(value)===String(key)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
const button=(id,label,disabled=false)=>`<button id="${id}" type="button" ${disabled?'disabled':''}>${label}</button>`;
function countHTML(state){
 return formula('3n='+3*state.natom+',\\qquad 3\\;\\mathrm{acoustic}+'+(3*state.natom-3)+'\\;\\mathrm{optical}')+
 '<p>这是 Γ 点的位移分类；体热容仍须累加整个布里渊区的全部分支。声学分支离开 Γ 后一般有正频率，不能因为分类时扣除平移就整支删除。</p>'+
 formula('d='+state.degeneracy+',\\qquad m=0,1,2,\\ldots')+
 '<p>d 数独立振子的个数，m 数一个振子里的声子个数。简并模式同频，仍有多个独立坐标；每个坐标都可被反复激发。</p>';
}
function probabilityHTML(state){
 const r=thermalOscillatorReference(state),frequency=state.unit==='THz'?'\\nu='+tex(r.frequency.THz)+'\\,\\mathrm{THz}':state.unit==='cm^-1'?'\\widetilde\\nu='+tex(r.frequency['cm^-1'])+'\\,\\mathrm{cm}^{-1}':'\\epsilon='+tex(r.epsilonMeV)+'\\,\\mathrm{meV}';
 const rows=r.levels.map(row=>[row.m,fmt(row.energyMeV),`<span class="thb-prob-number">${fmt(row.probability)}</span><span class="thb-prob-track" aria-hidden="true"><span style="width:${row.probability*100}%"></span></span>`,fmt(row.occupationContribution)]);
 return formula(frequency)+formula('\\epsilon=h\\nu=\\hbar\\omega=k_B\\theta,\\qquad\\omega=2\\pi\\nu')+
 '<p>THz 表示普通频率 ν，cm⁻¹ 表示波数，meV 表示同一个能量量子。已经使用 hν 时，不再乘一个 2π。</p>'+
 formula((state.reference==='absolute'?'E_m^{\\rm abs}=\\epsilon(m+\\tfrac12)':'E_m^{\\rm shift}=\\epsilon m')+',\\qquad T='+tex(r.temperature)+'\\,\\mathrm K')+
 (r.temperature===0?'<p class="thb-scope">零温取基态概率 p₀=1，平均占据为零。含零点项时 U=F=ε/2；S=Cv=0。</p>':formula('x=\\frac\\theta T'+(r.ratioOverflow?'':('='+tex(r.x)))+',\\quad p_m=(1-e^{-x})e^{-mx},\\quad\\overline n='+tex(r.occupation)))+
 (r.numericalUnderflow?'<p class="thb-scope">这个正温度极低，热激发已小于本地浮点计算范围；数值显示为零是低温近似，不是另一个严格零温态。</p>':'')+
 table('只画前六个能级，概率没有重新归一化',['m','能量 / meV','pₘ','m pₘ'],rows)+
 formula('\\sum_{m=0}^{5}p_m='+tex(r.visibleProbability)+',\\qquad P(m\\ge6)='+tex(r.tailProbability))+
 '<p>尾项是所有 m≥6 的概率总和；没有把它挤回前六行。平均占据使用完整几何分布的解析和，不把可见六行当作截断的物理模型。</p>'+
 (r.exactGeometricHalf?'<p class="thb-exact">当前为解析参考 T=θ/ln2：n̄=1。pₘ=2⁻⁽ᵐ⁺¹⁾，前六行合计 63/64，尾概率为 1/64。</p>':'');
}
function energyHTML(state){
 const r=thermalOscillatorReference(state);
 return formula('U='+tex(r.internalEnergy/eV*1000)+'\\,\\mathrm{meV},\\qquad C_V/k_B='+tex(r.heatCapacityOverKB))+
 formula('U_{\\rm abs}=\\epsilon(\\tfrac12+\\overline n),\\qquad C_V=\\epsilon\\frac{\\partial\\overline n}{\\partial T}=k_Bx^2\\overline n(\\overline n+1)')+
 '<p>固定体积且频率不随温度改变时，零点项对温度的导数为零。热容来自平均占据随温度的变化。</p>'+
 (state.reference==='absolute'?'<p class="thb-reference">当前保留零点能。可切换能量基准，检查概率与斜率是否改变。</p>':'<p class="thb-reference">当前只为比较把每个能级减去 ε/2：U 和 F 同减一个常数，概率、S、Cv 不变。既有实验仍保留零点能。</p>')+
 table('单模的当前能量基准',['量','数值'],[['F / meV',fmt(r.freeEnergy/eV*1000)],['U / meV',fmt(r.internalEnergy/eV*1000)],['S / kB',fmt(r.entropy/kB)],['Cv / kB',fmt(r.heatCapacityOverKB)]]);
}
function slopeHTML(state){
 const r=thermalSlopeReference(state);
 return '<p>这个差分小例固定比较 399、400、401 K，使用上面选择的完整模型原子数与能量基准；它独立于占据图当前选择的温度。</p>'+
 table('完整 Einstein 模型在 400 K 附近的内能',['T / K','U / kJ·mol⁻¹模型原胞'],r.rows.map(row=>[row.temperature,fmt(row.energyMolar)]))+
 formula('\\frac{U(401)-U(399)}{401-399}\\times1000='+tex(r.centralSlope)+'\\;\\mathrm{J/(mol\\,K)}')+
 formula('C_V(400\\,\\mathrm K)='+tex(r.analyticHeatCapacity)+'\\;\\mathrm{J/(mol\\,K)}')+
 '<p>乘 1000 把 kJ 变成 J；这里的一摩尔指一摩尔模型原胞。有限温差给出斜率近似，与解析导数的小差别是差分误差。</p>';
}
function unitsHTML(state){
 const r=thermalBridgeReference(state);
 return table('把局部模式与完整模型分开记账',['层次','模式数','平均声子数','U','Cv'],[
  ['一个模式',1,fmt(r.single.occupation),fmt(r.single.internalEnergy/eV*1000)+' meV',fmt(r.single.heatCapacityOverKB)+' kB'],
  ['d 个同频独立模式',r.local.modes,fmt(r.local.occupation),fmt(r.local.energyMeV)+' meV',fmt(r.local.heatCapacityOverKB)+' kB'],
  ['完整模型原胞',r.complete.modes,fmt(r.complete.occupation),fmt(r.complete.energyCellEV)+' eV',fmt(r.complete.heatCapacityMolar/NA/kB)+' kB'],
  ['每摩尔模型原胞',inline(r.complete.modes+'N_A'),fmt(r.complete.occupation*NA),fmt(r.complete.energyMolar)+' kJ/mol',fmt(r.complete.heatCapacityMolar)+' J/(mol K)'],
  ['每摩尔原子',inline('3N_A'),fmt(3*r.single.occupation*NA),fmt(r.complete.energyMolar/r.natom)+' kJ/mol',fmt(r.complete.heatCapacityPerMoleAtoms)+' J/(mol K)']])+
 formula('C_V^{(d)}=dC_{V,1},\\quad C_V^{\\rm cell}=3nC_{V,1},\\quad C_V^{\\rm mol\\,cell}=N_A C_V^{\\rm cell}')+
 '<p>模式数与平均声子数分列：同一个模式可没有热声子，也可平均占据多个声子。完整原胞包含 3n 个模式；一摩尔原胞包含 3nNₐ 个模式。每摩尔原子的能量与热容再除以 n。</p>'+
 formula('C_V^{\\rm mol\\,cell}(T\\to\\infty)=3nR='+tex(r.complete.highTemperatureLimit)+'\\;\\mathrm{J/(mol\\,K)}')+
 '<p>选出的 d 个局部模式不是完整晶胞，不通过填写分数原子数把它伪装成一个胞。Einstein 模型的正频同频振子也不是实际晶体的 Γ 声学色散。</p>'+
 '<p class="thb-copy-model">下面若复制到既有实验，使用的是 '+r.complete.modes+' 个模式的完整 Einstein 教学模型，原子数 n='+state.natom+'；不复制 d 个局部模式或减去零点能的比较基准。</p>';
}
function checkHTML(prefix,state,index){
 const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice;
 return `<section class="thb-question"><h4>${q.prompt}</h4>${select(prefix+'-q'+index,'你的预测',[['','先选择预测'],...q.rows],choice)}${button(prefix+'-check'+index,'核对这一步',!choice)}<p id="${prefix}-feedback${index}" class="thb-feedback${checked&&choice===q.answer?' thb-correct':''}" role="status">${checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:''}</p></section>`;
}
function bodyHTML(prefix,state,canOpenLab){
 return '<p class="thb-scope">固定 θ=400 K 的正频量子谐振子；这是原有热力学课的一组局部教学参照，不指定真实材料参数。下列操作在本地完成，既有 Python 实验由你手动运行。</p>'+
 `<section class="thb-stage"><h3>1 · 先数模式，再数一个模式里的声子</h3><div class="thb-controls">${select(prefix+'-natom','完整模型原胞的原子数 n',[[1,'1 个原子：3 个模型模式'],[2,'2 个原子：6 个模型模式']],state.natom)}${select(prefix+'-degeneracy','单独观察的同频模式数 d',[[1,'1 个局部模式'],[3,'3 个同频独立模式']],state.degeneracy)}</div><div id="${prefix}-count">${countHTML(state)}</div><a href="#classroom/observables?tab=learn&lesson=acoustic-optical">回看 Γ 点声学与光学模式分类 →</a></section>`+
 `<section class="thb-stage"><h3>2 · 能级概率怎样给出 Bose 平均占据？</h3><div class="thb-controls">${select(prefix+'-unit','同一个能量量子的显示单位',[['THz','THz'],['cm^-1','cm⁻¹'],['meV','meV']],state.unit)}<label for="${prefix}-temperature">${'温度 T / K'}<input id="${prefix}-temperature" type="range" min="0" max="1000" step="any" value="${state.temperature}"><output id="${prefix}-temperature-value">${fmt(state.temperature)} K</output></label></div><div class="thb-temperature-buttons">${button(prefix+'-t0','0 K')}${button(prefix+'-t100','100 K')}${button(prefix+'-t400','400 K')}${button(prefix+'-texact','θ/ln2')}${button(prefix+'-t1000','1000 K')}</div><div id="${prefix}-probabilities">${probabilityHTML(state)}</div><details data-thb-native="derivation" ${state.derivationOpen?'open':''}><summary>展开归一化与平均占据的推导</summary><p>m 标记一个模式的数态。对所有 m=0、1、2……求和，几何级数先给出配分函数，再给出归一概率。</p><p>下面以保留零点项的能级写 Z；整体平移使 Z 乘同一个因子，归一概率不变。</p>${formula('Z_{\\rm abs}=\\sum_{m=0}^{\\infty}e^{-x(m+1/2)}=\\frac{e^{-x/2}}{1-e^{-x}},\\quad p_m=\\frac{e^{-x(m+1/2)}}{Z_{\\rm abs}}')}${formula('\\overline n=(1-q)\\sum_{m=0}^{\\infty}mq^m=\\frac q{1-q},\\qquad q=e^{-x}') }<p>独立模式的配分函数相乘，自由能及其热力学导数相加。简并不改变每个模式的这条几何分布。</p></details></section>`+
 `<section class="thb-stage"><h3>3 · 从平均能量的温度斜率读出 Cv</h3><div class="thb-controls">${select(prefix+'-reference','局部能量基准比较',[['absolute','保留每个模式的 ε/2'],['shifted','每个能级都减去 ε/2']],state.reference)}</div><div id="${prefix}-energy">${energyHTML(state)}</div>${formula('\\frac{dx}{dT}=-\\frac xT,\\quad\\frac{d\\overline n}{dx}=-\\overline n(\\overline n+1),\\quad C_V=k_Bx^2\\overline n(\\overline n+1)')}<details data-thb-native="slope" ${state.slopeOpen?'open':''}><summary>用三行能量核对 400 K 的斜率和单位</summary><div id="${prefix}-slope">${slopeHTML(state)}</div></details></section>`+
 `<section class="thb-stage"><h3>4 · 从一个模式走到每原胞与每摩尔</h3><div id="${prefix}-units">${unitsHTML(state)}</div>${canOpenLab?button(prefix+'-copy','复制完整模型到现有实验'):'<a href="#compute/phonon-thermo">打开现有声子热力学实验 →</a><p>普通链接不传递这里的温度。请在实验中选择 Einstein 模型、θE=400 K 和所需的整数原子数，填写温度后手动运行。</p>'}<p id="${prefix}-copy-status" class="thb-feedback" role="status">${state.copyOutcome==='success'?'参考输入已复制；请在实验中手动运行计算。':state.copyOutcome==='error'?esc(state.copyError):''}</p></section>`+
 `<section class="thb-stage"><h3>三个预测检查</h3>${checks.map((_q,index)=>checkHTML(prefix,state,index)).join('')}</section>`+
 `<label class="thb-note-label" for="${prefix}-note">${'用自己的话写一句解释（只保留在本次页面内存中）'}<textarea id="${prefix}-note" rows="3" maxlength="2000">${esc(state.note)}</textarea></label>${button(prefix+'-reset','重置这个局部示例')}`;
}

export function thermalBridgeHTML(lessonId){
 if(!Object.hasOwn(THERMAL_BRIDGE_HOOKS,lessonId))return '';
 return '<section class="thb-prerequisite" aria-label="可选的声子占据与热容操作桥"><p class="thb-optional">想把模式计数、Bose 占据和热容接起来？展开这个有限小例，逐步看概率、能量和温度斜率。</p><details class="thb-bridge" data-thb-bridge="oscillator-probabilities"><summary>把一个振子的概率加成热容</summary><div class="thb-body" data-thb-body="oscillator-probabilities"></div></details></section>';
}

export function bindThermalLearningBridge({root,lessonId,isCurrent,stateStore=new Map(),onOpenLab}={}){
 const supported=Object.hasOwn(THERMAL_BRIDGE_HOOKS,lessonId),store=stateStore instanceof Map?stateStore:new Map(),key=lessonId+':oscillator-probabilities';
 const detail=supported?root?.querySelector?.('[data-thb-bridge="oscillator-probabilities"]'):null,body=supported?root?.querySelector?.('[data-thb-body="oscillator-probabilities"]'):null;
 const state=restored(store.get(key)),prefix='thb-'+lessonId;let alive=true,ticket=0,busy=false;
 const $=suffix=>body?.querySelector('#'+prefix+'-'+suffix);
 const active=()=>alive&&!!detail&&!!body&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent())&&root.querySelector('[data-thb-bridge="oscillator-probabilities"]')===detail&&root.querySelector('[data-thb-body="oscillator-probabilities"]')===body;
 const readOpen=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
 const save=()=>{if(detail&&body)store.set(key,clone(state));};
 const captureNative=()=>{if(!active())return;state.open=readOpen(detail);for(const[name,field]of [['derivation','derivationOpen'],['slope','slopeOpen']]){const node=body.querySelector('[data-thb-native="'+name+'"]');if(node)state[field]=readOpen(node);}if($('note'))state.note=String($('note').value).slice(0,2000);for(let i=0;i<3;i++){const control=$('q'+i);if(control&&checks[i].rows.some(([id])=>id===control.value)&&state.choices[i]!==control.value){state.choices[i]=control.value;state.checked[i]=false;}}save();};
 const clearCopy=()=>{ticket++;state.copyOutcome='';state.copyError='';if($('copy-status'))$('copy-status').textContent='';};
 const paint=()=>{if(!active())return;for(const[name,render]of [['count',countHTML],['probabilities',probabilityHTML],['energy',energyHTML],['slope',slopeHTML],['units',unitsHTML]])if($(name))$(name).innerHTML=render(state);if($('temperature-value'))$('temperature-value').textContent=fmt(state.temperature)+' K';};
 const paintQuestion=index=>{const q=checks[index],choice=state.choices[index],checked=state.checked[index]&&choice,node=$('feedback'+index);if(node){node.textContent=checked?(choice===q.answer?'✓ ':'')+q.feedback[choice]:'';node.setAttribute('class','thb-feedback'+(checked&&choice===q.answer?' thb-correct':''));}if($('check'+index))$('check'+index).disabled=!choice;};
 if(detail&&body){
  if(state.open){detail.open=true;detail.setAttribute('open','');}
  detail.ontoggle=()=>{if(active()){state.open=readOpen(detail);save();}};
  function draw(){
   if(!active())return;body.innerHTML=bodyHTML(prefix,state,typeof onOpenLab==='function');save();
   for(const[name,field]of [['derivation','derivationOpen'],['slope','slopeOpen']]){const node=body.querySelector('[data-thb-native="'+name+'"]');node.ontoggle=()=>{if(active()&&body.querySelector('[data-thb-native="'+name+'"]')===node){state[field]=readOpen(node);save();}};}
   const bind=(name,event,action)=>{const node=$(name);if(node)node[event]=()=>{if(!active()||$(name)!==node||node.disabled)return;captureNative();action(node);save();};};
   for(const name of ['natom','degeneracy'])bind(name,'onchange',node=>{const value=Number(node.value);if((name==='natom'?[1,2]:[1,3]).includes(value)){state[name]=value;clearCopy();paint();}});
   bind('unit','onchange',node=>{if(['THz','cm^-1','meV'].includes(node.value)){state.unit=node.value;paint();}});
   bind('reference','onchange',node=>{if(['absolute','shifted'].includes(node.value)){state.reference=node.value;paint();}});
   bind('temperature','oninput',node=>{const value=Number(node.value);if(node.value!==''&&Number.isFinite(value)&&value>=0&&value<=1000){state.temperature=value;clearCopy();paint();}});
   for(const[name,value]of [['t0',0],['t100',100],['t400',400],['texact',THERMAL_EXACT_TEMPERATURE],['t1000',1000]])bind(name,'onclick',()=>{state.temperature=value;$('temperature').value=String(value);clearCopy();paint();});
   for(let i=0;i<3;i++){
    bind('q'+i,'onchange',node=>{state.choices[i]=checks[i].rows.some(([id])=>id===node.value)?node.value:'';state.checked[i]=false;paintQuestion(i);});
    bind('check'+i,'onclick',()=>{state.checked[i]=true;paintQuestion(i);});
   }
   bind('note','oninput',node=>{state.note=String(node.value).slice(0,2000);});
   bind('reset','onclick',()=>{const open=state.open;Object.assign(state,initial(),{open});clearCopy();draw();$('natom')?.focus?.({preventScroll:true});});
   const copy=$('copy');if(copy){copy.disabled=busy;copy.onclick=async()=>{
    if(!active()||$('copy')!==copy||busy)return;captureNative();const id=++ticket,request=thermalBridgeLabRequest(state);busy=true;copy.disabled=true;state.copyOutcome='';state.copyError='';save();
    try{const accepted=await onOpenLab(clone(request));if(accepted===false)throw Error('参考输入暂未复制，请重试。');if(active()&&ticket===id){state.copyOutcome='success';$('copy-status').textContent='参考输入已复制；请在实验中手动运行计算。';save();}}
    catch(error){if(active()&&ticket===id){state.copyOutcome='error';state.copyError=String(error?.message||'参考输入暂未复制，请重试。').slice(0,500);$('copy-status').textContent=state.copyError;save();}}
    finally{busy=false;if(active()&&$('copy'))$('copy').disabled=false;}
   };}
  }
  draw();
 }
 const cleanup=()=>{if(!alive)return;captureNative();alive=false;ticket++;if(detail)detail.ontoggle=null;if(body){for(const tag of ['button','select','input','textarea'])for(const node of body.querySelectorAll(tag)){node.onclick=null;node.onchange=null;node.oninput=null;}for(const node of body.querySelectorAll('[data-thb-native]'))node.ontoggle=null;}};
 cleanup.snapshot=()=>{captureNative();return supported?{'oscillator-probabilities':clone(state)}:{};};return cleanup;
}
