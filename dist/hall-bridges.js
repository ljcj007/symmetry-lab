import {mathHTML} from './math-display.js?v=20261113-prose2';

// Operational prerequisites, not a replacement for the full Brillouin-zone
// calculation. No worker, network, persistent store, or mastery record is used.
export const HALL_BRIDGE_HOOKS=Object.freeze(Object.fromEntries(['hall-occupation','hall-entropy','hall-diagnostics'].map(id=>[id,Object.freeze(['phase-rays','fermi-weights'])])));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>JSON.parse(JSON.stringify(value));
const formula=tex=>`<div class="hb-formula" tabindex="0">${mathHTML(tex,true)}</div>`;
const inline=tex=>`<span class="hb-inline">${mathHTML(tex)}</span>`;
const finite=(value,label)=>{if(typeof value!=='number'||!Number.isFinite(value))throw Error(label+' must be finite.');return value;};
const fmt=value=>{if(Math.abs(value)<1e-13&&value===0)return '0';if(value!==0&&(Math.abs(value)<.00001||Math.abs(value)>=1e5))return value.toExponential(4);return Number(value.toFixed(6)).toString();};
const texNumber=value=>fmt(value).replace(/e([+-]?\d+)$/,(_m,power)=>'\\times10^{'+Number(power)+'}');
const c=(re,im=0)=>[re,im];
const add=(a,b)=>c(a[0]+b[0],a[1]+b[1]);
const mul=(a,b)=>c(a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]);
const conj=a=>c(a[0],-a[1]);
const magnitude=a=>Math.hypot(...a);
const cis=phi=>c(Math.cos(phi),Math.sin(phi));
const overlap=(a,b)=>a.reduce((sum,x,i)=>add(sum,mul(conj(x),b[i])),c(0));
const cmul=(a,z)=>a.map(x=>mul(x,z));
const normalize=a=>{const norm=Math.sqrt(overlap(a,a)[0]);if(!(norm>1e-14))throw Error('A nonzero state is required.');return a.map(x=>x.map(v=>v/norm));};
const projector=a=>a.map(x=>a.map(y=>mul(x,conj(y))));
const difference=(a,b)=>Math.max(...a.flatMap((row,i)=>row.map((z,j)=>magnitude(c(z[0]-b[i][j][0],z[1]-b[i][j][1])))));
const complexTex=z=>{const re=Math.abs(z[0])<1e-12?0:z[0],im=Math.abs(z[1])<1e-12?0:z[1];return re===0&&im===0?'0':im===0?texNumber(re):re===0?(im===1?'i':im===-1?'-i':texNumber(im)+'i'):texNumber(re)+(im>=0?'+':'-')+(Math.abs(im)===1?'':texNumber(Math.abs(im)))+'i';};
const matrixTex=a=>'\\begin{pmatrix}'+a.map(row=>row.map(complexTex).join('&')).join('\\\\')+'\\end{pmatrix}';

export function closedOverlapLoop(states){
 if(!Array.isArray(states)||states.length<3||states.some(u=>!Array.isArray(u)||u.length!==2||u.some(z=>!Array.isArray(z)||z.length!==2||z.some(v=>typeof v!=='number'||!Number.isFinite(v)))))throw Error('A finite two-component state loop is required.');
 const normalized=states.map(normalize),overlaps=normalized.map((u,i)=>overlap(u,normalized[(i+1)%normalized.length]));
 if(overlaps.some(z=>magnitude(z)<1e-12))throw Error('A neighboring overlap vanishes; this discrete loop phase is undefined.');
 const links=overlaps.map(z=>z.map(x=>x/magnitude(z))),product=links.reduce(mul,c(1)),rawProduct=overlaps.reduce(mul,c(1));
 return {overlaps,links,product,rawProduct,phase:-Math.atan2(product[1],product[0])};
}

export function qwzLowerState(kx,ky,mass){
 [kx,ky,mass].forEach((v,i)=>finite(v,['kx','ky','mass'][i]));
 const d=[Math.sin(kx),Math.sin(ky),mass+Math.cos(kx)+Math.cos(ky)],radius=Math.hypot(...d);
 if(radius<1e-12)throw Error('The selected QWZ point is degenerate.');
 const state=radius+d[2]>1e-8*radius?normalize([c(-d[0],d[1]),c(d[2]+radius)]):normalize([c(d[2]-radius),c(d[0],d[1])]);
 return {d,energy:-radius,state,projector:projector(state),curvature:(Math.cos(kx)+Math.cos(ky)+mass*Math.cos(kx)*Math.cos(ky))/(2*radius**3)};
}

export function hallPhaseReference({step=Math.PI/6,mass=-1,gauge=[0,Math.PI/2,-Math.PI/2,Math.PI],reverse=false,globalPhase=Math.PI/2}={}){
 finite(step,'step');finite(globalPhase,'globalPhase');
 if(!(step>0&&step<=Math.PI/2)||![-1,3].includes(mass)||!Array.isArray(gauge)||gauge.length!==4||gauge.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Unsupported teaching loop.');
 const points=[[0,0],[step,0],[step,step],[0,step]],sampled=points.map(([x,y])=>qwzLowerState(x,y,mass));
 const ordered=reverse?[0,3,2,1]:[0,1,2,3],base=closedOverlapLoop(ordered.map(i=>sampled[i].state)),changed=closedOverlapLoop(ordered.map(i=>cmul(sampled[i].state,cis(gauge[i]))));
 const u=normalize([c(1),c(0,1)]),changedState=cmul(u,cis(globalPhase)),relativeState=[u[0],mul(u[1],c(-1))];
 return {points:ordered.map(i=>points[i]),cornerOrder:ordered.map(i=>i+1),mass,step,reverse,base,changed,signedArea:(reverse?-1:1)*step*step,estimate:changed.phase/((reverse?-1:1)*step*step),originCurvature:sampled[0].curvature,fullZoneChernReference:mass===-1?1:0,
   projectorResidual:Math.max(...sampled.map((x,i)=>difference(x.projector,projector(cmul(x.state,cis(gauge[i])))))),
   ray:{state:u,changedState,relativeState,projector:projector(u),changedProjector:projector(changedState),relativeProjector:projector(relativeState),probabilities:u.map(z=>magnitude(z)**2),squaredOverlap:magnitude(overlap(u,changedState))**2,relativeSquaredOverlap:magnitude(overlap(u,relativeState))**2}};
}

export const HALL_BRIDGE_KB_EV=8.617333262145e-5;
export function fermiReference(energy,chemicalPotential,temperature){
 [energy,chemicalPotential,temperature].forEach((v,i)=>finite(v,['energy','chemical potential','temperature'][i]));
 if(temperature<0)throw Error('Temperature cannot be negative.');
 if(temperature===0){const f=energy<chemicalPotential?1:energy>chemicalPotential?0:.5;return {f,vacancy:1-f,binaryEntropy:f===.5?Math.LN2:0,transportEntropy:0,threshold:energy===chemicalPotential};}
 const x=(energy-chemicalPotential)/(HALL_BRIDGE_KB_EV*temperature),a=Math.abs(x),z=Math.exp(-a),small=z/(1+z),entropy=Math.log1p(z)+(Number.isFinite(a)?a*z/(1+z):0);
 return {f:x>=0?small:1-small,vacancy:x>=0?1-small:small,binaryEntropy:entropy,transportEntropy:entropy,threshold:energy===chemicalPotential};
}
export function hallOccupationReference({chemicalPotential=0,temperature=0}={}){
 const lower=fermiReference(-1,chemicalPotential,temperature),upper=fermiReference(1,chemicalPotential,temperature);
 // In the filled tail use vacancy differences; subtracting two rounded ones
 // would otherwise falsely turn a finite-temperature tail into exact zero.
 const difference=chemicalPotential>=1?upper.vacancy-lower.vacancy:lower.f-upper.f;
 return {chemicalPotential,temperature,lower,upper,occupiedWeight:.5*difference,entropyWeight:.5*(lower.transportEntropy-upper.transportEntropy),binaryEntropyWeight:.5*(lower.binaryEntropy-upper.binaryEntropy),
   energies:[-1,1],curvatures:[.5,-.5],zeroTemperature:temperature===0,fullZoneLowerChernReference:1};
}

const stepOptions=[['large','π/3'],['medium','π/6'],['small','π/12']];
const steps={large:Math.PI/3,medium:Math.PI/6,small:Math.PI/12};
const gauges={same:[0,0,0,0],local:[0,Math.PI/2,-Math.PI/2,Math.PI]};
const names={
 'phase-rays':'从态的写法到 Berry 小环：相位改变了什么？',
 'fermi-weights':'先看占据，再看加权：哪些态在贡献？'
};
const initial=id=>id==='phase-rays'?{open:false,choice:'',gauge:'local',step:'medium',observed:false,checked:false,variantOpen:false,variantMode:'reverse',variantChoice:'',variantObserved:false,variantChecked:false}:{open:false,choice:'',mu:'0',temperature:'0',kernel:'occupation',observed:false,checked:false,variantOpen:false,variantMode:'full',variantChoice:'',variantObserved:false,variantChecked:false};
const lists={gauge:['same','local'],step:Object.keys(steps),mu:['-4','-1','0','1','4'],temperature:['0','300','5000'],kernel:['occupation','entropy']};
const answerOptions=id=>id==='phase-rays'?[['invariant','投影算子与闭环相位必须保持，单边重叠相位可以变'],['all','包括每条边的重叠相位在内，所有写法都必须不变'],['changed','只要振幅变了，物理态和闭环相位就必须改变']]:[['positive','正'],['zero','零'],['negative','负']];
const variantOptions=(id,mode)=>id==='phase-rays'?(mode==='reverse'?[['reverse','闭环相位翻号，有向面积也翻号，曲率估计保持'],['same','闭环相位和方向都不变'],['chern','只把路径逆序就改变能带的 Chern 数']]:mode==='relative'?[['changed','投影算子改变；相同分量概率不足以证明同一态'],['same','概率相同，所以一定是整体相位变化'],['gauge','任何分量相位都可以各自改写而不改变物理态']]:[['local','原点局部曲率仍非零，但全区 Chern 参考值为零'],['flat','Chern 为零就要求每一点曲率为零'],['one','一个非零小环已证明 Chern 等于一']]):mode==='symmetric'?[['entropy','熵加权抵消，而占据加权仍可非零'],['both','两种加权都必须为零'],['nernst','已经得到完整的开路 Nernst 电压']]:[['cancel','两带在该点抵消；改变占据没有改写同一能带的 Chern 数'],['chern','化学势变化自动把同一条带的 Chern 数改成零'],['nernst','这个点的数值就是完整的开路 Nernst 电压']];
function restored(id,saved){
 const state=initial(id);if(!saved||typeof saved!=='object')return state;
 for(const key of Object.keys(state))if(typeof state[key]==='boolean'&&typeof saved[key]==='boolean')state[key]=saved[key];
 for(const key of ['gauge','step','mu','temperature','kernel'])if(Object.hasOwn(state,key)&&lists[key].includes(saved[key]))state[key]=saved[key];
 const modes=id==='phase-rays'?['reverse','relative','trivial']:['full','empty','symmetric'];if(modes.includes(saved.variantMode))state.variantMode=saved.variantMode;
 if(answerOptions(id).some(([key])=>key===saved.choice))state.choice=saved.choice;
 if(variantOptions(id,state.variantMode).some(([key])=>key===saved.variantChoice))state.variantChoice=saved.variantChoice;
 if(!state.choice){state.observed=false;state.checked=false;}if(!state.observed)state.checked=false;
 if(!state.variantChoice){state.variantObserved=false;state.variantChecked=false;}if(!state.variantObserved)state.variantChecked=false;
 return state;
}
const select=(id,label,options,value)=>`<label for="${id}">${label}<select id="${id}">${options.map(([key,text])=>`<option value="${key}" ${value===key?'selected':''}>${text}</option>`).join('')}</select>${id.endsWith('-choice')&&value?`<span class="hb-choice-reading" aria-hidden="true">${options.find(([key])=>key===value)?.[1]||''}</span>`:''}</label>`;
const button=(id,text,disabled=false)=>`<button type="button" id="${id}" ${disabled?'disabled':''}>${text}</button>`;
const row=(label,tex)=>`<div class="hb-result-row"><strong>${label}</strong>${formula(tex)}</div>`;
const phaseState=state=>hallPhaseReference({step:steps[state.step],gauge:gauges[state.gauge]});
function loopDiagram(ref,tag){
 const positions=[[48,214],[300,214],[300,55],[48,55]],order=ref.reverse?[0,3,2,1]:[0,1,2,3];
 return `<figure class="hb-diagram"><svg viewBox="0 0 360 275" role="img" aria-label="四个动量角点按有向路径相连；这是布里渊区内一个小方格"><defs><marker id="hb-loop-arrow-${tag}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#426d57"/></marker></defs>${order.map((i,n)=>{const a=positions[i],b=positions[order[(n+1)%4]],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);return `<line x1="${a[0]+12*dx/length}" y1="${a[1]+12*dy/length}" x2="${b[0]-16*dx/length}" y2="${b[1]-16*dy/length}" stroke="#426d57" stroke-width="3" marker-end="url(#hb-loop-arrow-${tag})"/>`;}).join('')}${positions.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="6" fill="#a56e2d"/><text x="${x+10}" y="${y-12}">${i+1}</text>`).join('')}<text x="165" y="254">kₓ</text><text x="13" y="130">kᵧ</text><text x="130" y="142">h × h</text></svg><figcaption>箭头给出小环方向；角点标签随路径读取。这里没有对整个布里渊区求和。</figcaption></figure>`;
}
function phaseObservation(state,variant=false){
 const args={step:steps[state.step],gauge:gauges[state.gauge],...(variant&&state.variantMode==='reverse'?{reverse:true}:{}),...(variant&&state.variantMode==='trivial'?{mass:3}:{})},ref=hallPhaseReference(args);
 return `${loopDiagram(ref,variant?'variant':'main')}${variant?'':row('同一态的两种写法与投影算子','u=\\frac{1}{\\sqrt2}\\begin{pmatrix}1\\\\i\\end{pmatrix},\\quad iu=\\frac{1}{\\sqrt2}\\begin{pmatrix}i\\\\-1\\end{pmatrix},\\quad P=uu^\\dagger='+matrixTex(ref.ray.projector))+`<p>两个分量是同一组基底上的复振幅；分量模平方给出在这组基底上测量的概率。整体乘以 i 后，投影算子不变，态间重叠的模平方为 ${inline('1')}。若只把第二个分量反号，相对相位改变，概率仍各为 ${inline('1/2')}，但与原态重叠的模平方变为 ${inline('0')}；相同概率不代表同一量子态。</p>`}
 <div class="hb-table-wrap" tabindex="0"><table><caption>四条相邻重叠的相位（弧度）</caption><thead><tr><th>边</th><th>原写法</th><th>改变逐点相位后</th></tr></thead><tbody>${ref.base.overlaps.map((z,i)=>`<tr><td>${ref.cornerOrder[i]} → ${ref.cornerOrder[(i+1)%4]}</td><td>${fmt(Math.atan2(z[1],z[0]))}</td><td>${fmt(Math.atan2(ref.changed.overlaps[i][1],ref.changed.overlaps[i][0]))}</td></tr>`).join('')}</tbody></table></div>
 ${row('闭合后相位因子逐点抵消','W=\\prod_{j=1}^{4}\\frac{\\langle u_j|u_{j+1}\\rangle}{|\\langle u_j|u_{j+1}\\rangle|}='+complexTex(ref.changed.product)+',\\quad u_5=u_1')}
 ${row('采用本课的正 i 联络约定','\\gamma=-\\operatorname{Arg}W='+texNumber(ref.changed.phase)+',\\quad\\frac{\\gamma}{\\Delta k_x\\Delta k_y}='+texNumber(ref.estimate))}
 ${row('与原点解析曲率比较','\\Omega_-(0,0)='+texNumber(ref.originCurvature)+',\\quad m='+ref.mass)}
 <p>上述比值是有限步长的离散估计；缩小 h 后才趋向原点局部曲率。这里的角点由固定周期轨道基底中的 QWZ 下带态给出，没有使用完整布里渊区网格。${variant&&state.variantMode==='trivial'?'当前 m=3 的全区下带 Chern 参考值为 0；局部非零曲率与这个整体结论相容。':''}</p>`;
}
function occupationDiagram(ref){
 const bars=[ref.lower.f,ref.upper.f],h=140;
 return `<figure class="hb-diagram"><svg viewBox="0 0 390 230" role="img" aria-label="两条带在所选动量处的费米占据柱图"><line x1="45" y1="180" x2="345" y2="180" stroke="#789184"/><line x1="45" y1="35" x2="45" y2="180" stroke="#789184"/><text x="14" y="44">1</text><text x="14" y="184">0</text>${bars.map((f,i)=>`<rect x="${95+i*150}" y="${180-h*f}" width="60" height="${h*f}" fill="${i?'#a56e2d':'#426d57'}"/><text x="${125+i*150}" y="211" text-anchor="middle">${i?'E₊=1':'E₋=−1'} eV</text>`).join('')}</svg><figcaption>柱高是占据概率 f，不是电导或光谱强度。极小的有限温度尾部请看表中的科学计数值。</figcaption></figure>`;
}
function occupationObservation(ref){
 return `${occupationDiagram(ref)}<div class="hb-table-wrap" tabindex="0"><table><caption>同一个动量点的能量、曲率和权重</caption><thead><tr><th>带</th><th>E / eV</th><th>Ω</th><th>f</th><th>s(f)</th></tr></thead><tbody>${[ref.lower,ref.upper].map((item,i)=>`<tr><td>${i?'上带':'下带'}</td><td>${i?1:-1}</td><td>${i?'−1/2':'+1/2'}</td><td>${fmt(item.f)}</td><td>${fmt(item.binaryEntropy)}</td></tr>`).join('')}</tbody></table></div>
 ${formula('s_n^{\\mathrm{tr}}=\\begin{cases}s(f_n),&T>0\\\\0,&T=0\\end{cases}')}
 ${row('占据加权与输运熵加权分开计算','W_f=\\sum_{n=\\pm}\\Omega_nf_n='+texNumber(ref.occupiedWeight)+',\\quad W_s^{\\mathrm{tr}}=\\sum_{n=\\pm}\\Omega_ns_n^{\\mathrm{tr}}='+texNumber(ref.entropyWeight))}
 <p>这里显示一个点的权重，尚未乘积分面积或电荷常数。霍尔公式中乘 ${inline('-e^2/\\hbar')}；横向热电公式中乘 ${inline('ek_B/\\hbar')}，其中 e 为正值，电子电荷为 −e。当前二维模型没有再乘自旋简并，也没有除以虚构的真空厚度。</p>
 ${ref.zeroTemperature?'<p class="hb-note">零温用阶跃占据；恰好 E=μ 时按本课的半占据约定记为 1/2。数学熵函数在 f=1/2 时为 ln 2，但零温输运实现把熵核取为 0；这个单点约定不能推成有限热流或残余热力学熵。</p>':'<p class="hb-note">有限温度的占据尾部不等于严格满带或空带。表中接近 1 的占据可能因显示精度写成 1，权重计算仍使用稳定的空穴差，保留极小的非零尾部。</p>'}`;
}
function occupationExplain(ref,kernel){
 if(kernel==='occupation')return ref.zeroTemperature&&ref.occupiedWeight===0?'在这个点，两条带都满或都空，两个相反曲率的占据贡献抵消。改变化学势改变占据；同一条带的 Chern 数没有因此改写。':'下带占据多于上带，所以这个点的占据加权曲率为正。带负电子电荷约定的霍尔公式还有负号；一个点的符号不能直接代替完整布里渊区积分。';
 if(ref.zeroTemperature)return '当前核对使用本页的零温输运实现约定，熵核取为零。不要把一个阈值点的半占据约定当成非零横向热电响应。';
 if(ref.chemicalPotential===0)return '能量为正负成对时，μ=0 给出 f₊=1−f₋，而 s(f)=s(1−f)。两条带的熵加权逐点抵消；占据加权仍可非零。';
 return ref.chemicalPotential>0?'化学势靠近上带时，上带的熵权重更大；它携带负曲率，因此该点熵加权为负。这不是完整的开路 Nernst 信号。':'化学势靠近下带时，下带的熵权重更大；它携带正曲率，因此该点熵加权为正。这不是完整的开路 Nernst 信号。';
}
const signChoice=value=>value>0?'positive':value<0?'negative':'zero';
function mainResult(id,state){
 if(id==='phase-rays')return {correct:state.choice==='invariant',html:phaseObservation(state),explanation:state.choice==='all'?'单边重叠乘上相邻两点的相位差，它的相位不必保持。闭合乘积才使所有首尾相位抵消。':state.choice==='changed'?'整体相位在 uu† 中抵消。波函数的坐标改变，不足以说明投影算子或物理态改变。':'各点整体相位在投影算子和闭合重叠乘积中抵消；单边重叠与联络本身可以随写法变化。'};
 const ref=hallOccupationReference({chemicalPotential:Number(state.mu),temperature:Number(state.temperature)}),weight=state.kernel==='occupation'?ref.occupiedWeight:ref.entropyWeight;
 return {correct:state.choice===signChoice(weight),html:occupationObservation(ref),explanation:occupationExplain(ref,state.kernel)};
}
function variantResult(id,state){
 if(id==='phase-rays'&&state.variantMode==='relative'){const ray=phaseState(state).ray;return {correct:state.variantChoice==='changed',html:row('只改变第二个分量的相对相位','u=\\frac1{\\sqrt2}\\begin{pmatrix}1\\\\i\\end{pmatrix},\\quad v=\\frac1{\\sqrt2}\\begin{pmatrix}1\\\\-i\\end{pmatrix}')+row('两个投影算子直接比较','P_u='+matrixTex(ray.projector)+',\\quad P_v='+matrixTex(ray.relativeProjector))+row('同样的分量概率，不同的态','|\\langle u|v\\rangle|^2=0'),explanation:'这次不是给整个态乘同一个相位。相对相位使投影算子的非对角元改变；换到另一组测量基底可以区分这两个态。'};}
 if(id==='phase-rays')return {correct:state.variantChoice===(state.variantMode==='reverse'?'reverse':'local'),html:phaseObservation(state,true),explanation:state.variantMode==='reverse'?'把同一小环逆序，闭合重叠乘积变为复共轭，几何相位翻号。有向面积也翻号，所以同一坐标取向下的局部曲率估计保持。':'m=3 的原点曲率为 1/50，并不为零；全区 Chern 参考值却为 0。一个局部小环或峰值不能决定全区积分。'};
 const ref=hallOccupationReference(state.variantMode==='symmetric'?{chemicalPotential:0,temperature:5000}:{chemicalPotential:state.variantMode==='full'?4:-4,temperature:0});
 return {correct:state.variantChoice===(state.variantMode==='symmetric'?'entropy':'cancel'),html:occupationObservation(ref),explanation:state.variantMode==='symmetric'?'有限温度、μ=0 的对称两带有相同二元熵，熵加权抵消；下带占据仍较大，占据加权没有被要求为零。':'对本例 m=−1、能量尺度 1 eV，所有带能量位于 −3 到 3 eV。零温 μ=4 eV 使完整两带都满，μ=−4 eV 使其都空；全区也逐点抵消。同一能带的几何没有改变。'};
}
function bodyHTML(id,state){
 const prefix='hb-'+id,main=state.observed?mainResult(id,state):null,variant=state.variantObserved?variantResult(id,state):null;
 const intro=id==='phase-rays'?`<p>先把量子态看成两个基底方向上的复振幅。 ${inline('u')} 与 ${inline('e^{i\\alpha}u')} 表示同一射线；投影算子 ${inline('P=uu^\\dagger')} 不依赖整体相位。不要把改变某个分量的相对相位也当成整体换写法。</p><p>再在动量平面的小方格四角读出下带态。相邻重叠比较两个角点的态，闭合后才消掉逐点任选的相位。Berry 相位记录绕环连续比较态的结果，不是任意波函数相位的直接相加。联络 A 描述无穷小的相邻态比较，会随逐点写法变化；曲率描述足够小的闭环相位随有向面积增长的速率。</p>${formula('H=\\sin k_x\\,\\sigma_x+\\sin k_y\\,\\sigma_y+(-1+\\cos k_x+\\cos k_y)\\sigma_z')}${formula('A=i\\langle u|\\nabla_k u\\rangle,\\quad A^{\\prime}=A-\\nabla_k\\alpha,\\quad\\gamma=-\\operatorname{Arg}W')}`:`<p>费米占据 f 是一个态被电子占据的概率。能量 E 与化学势 μ 用 eV，温度 T 用 K；μ 与 T 是独立输入。先计算 f，再决定响应公式要用哪种权重。</p>${formula('f(E,\\mu,T)=\\frac{1}{1+e^{(E-\\mu)/(k_BT)}},\\quad T>0')}${formula('s(f)=-f\\ln f-(1-f)\\ln(1-f),\\quad s(0)=s(1)=0')}${formula('k_B=8.617333262145\\times10^{-5}\\;\\mathrm{eV/K}')}
 <p>本例固定 QWZ 参数 m=−1、能量尺度 1 eV，以及 ${inline('k=(0,0)')}。该点下带、上带能量是 −1、+1 eV，曲率是 +1/2、−1/2。改变 μ 或 T 不会自动改变这些能带几何。</p>`;
 const controls=id==='phase-rays'?`${select(prefix+'-gauge','四角点的相位写法',[['same','四点都不另加相位'],['local','四点分别加 0、π/2、−π/2、π']],state.gauge)}${select(prefix+'-step','小方格边长 h',stepOptions,state.step)}`:`${select(prefix+'-mu','化学势 μ / eV',lists.mu.map(x=>[x,x]),state.mu)}${select(prefix+'-temperature','温度 T / K',lists.temperature.map(x=>[x,x]),state.temperature)}${select(prefix+'-kernel','这次预测哪种点权重？',[['occupation','占据加权 Ωf'],['entropy','输运熵加权 Ωs']],state.kernel)}`;
 const question=id==='phase-rays'?'允许各点的整体相位独立改变时，哪些量必须保持？':'所选条件下，这个点的加权和是正、零还是负？';
 const variantModes=id==='phase-rays'?[['reverse','把同一小环反向走一遍'],['relative','只改变一个分量的相对相位'],['trivial','改用 m=3，比较局部曲率与全区参考']]:[['full','零温，μ=4 eV：两带全满'],['empty','零温，μ=−4 eV：两带全空'],['symmetric','μ=0、T=5000 K：比较两种权重']];
 return `${intro}<div class="hb-controls">${controls}${select(prefix+'-choice',question,[['','先选择预测'],...answerOptions(id)],state.choice)}${button(prefix+'-run','显示这次核对',!state.choice)}${button(prefix+'-check','检查预测',!state.observed)}</div><div class="hb-output" aria-live="polite">${main?main.html:'<p class="hb-await">先作预测，再显示数值、图形和计算步骤。</p>'}</div><p id="${prefix}-feedback" role="status" class="hb-feedback ${state.checked&&main?.correct?'hb-correct':''}">${state.checked?(main.correct?'核对一致。 ':'这次预测需要调整。 ')+main.explanation:''}</p>
 <details class="hb-variant" ${state.variantOpen?'open':''}><summary>改变一个条件，再解释一次</summary><div class="hb-controls">${select(prefix+'-variant-mode','改变哪个条件？',variantModes,state.variantMode)}${select(prefix+'-variant-choice','先预测这次比较说明什么',[['','先选择变式预测'],...variantOptions(id,state.variantMode)],state.variantChoice)}${button(prefix+'-variant-run','显示改变后的对照',!state.variantChoice)}${button(prefix+'-variant-check','检查变式解释',!state.variantObserved)}</div><div class="hb-output">${variant?variant.html:''}</div><p id="${prefix}-variant-feedback" role="status" class="hb-feedback ${state.variantChecked&&variant?.correct?'hb-correct':''}">${state.variantChecked?(variant.correct?'变式核对一致。 ':'请再区分局部、整体和模型条件。 ')+variant.explanation:''}</p></details>
 <p class="hb-boundary">${id==='phase-rays'?'这个小环只展示固定两带模型中的离散几何相位。步长误差、相位分支和全区求和仍须在完整计算中检查；局部曲率不等于全区 Chern 数。':'一个点的权重不是完整片电导或横向热电系数。完整结果需要全区求和和收敛检查；αxy 不是开路 Nernst 电压，纵向输运窗口 −∂f/∂E 也不能替换这里的占据或熵核。'}</p>
 <p class="hb-record-note">这些核对保留在当前课堂会话，不计入原题掌握进度；已有基础可收起后继续讲解。</p>${button(prefix+'-reset','重新开始这个小实验')}`;
}

export function hallBridgeHTML(lessonId){
 const ids=Object.hasOwn(HALL_BRIDGE_HOOKS,lessonId)?HALL_BRIDGE_HOOKS[lessonId]:[];
 return ids.length?`<section class="hb-prerequisites" aria-label="可选的霍尔前置小实验"><p class="hb-optional">第一次遇到 Berry 曲率或费米占据？先展开小实验，再回到下面的响应公式；熟悉这些概念可以直接继续。</p>${ids.map(id=>`<details class="hb-bridge" data-hb-bridge="${id}"><summary>${names[id]}</summary><div class="hb-body" data-hb-body="${id}"></div></details>`).join('')}<p class="hb-sources">参考： <a href="https://wannier90.readthedocs.io/en/latest/user_guide/postw90/berry/" target="_blank" rel="noopener">Berry 联络与霍尔约定</a> · <a href="https://arxiv.org/abs/cond-mat/0503172" target="_blank" rel="noopener">离散闭合重叠与规范不变性</a> · <a href="https://arxiv.org/abs/cond-mat/0604561" target="_blank" rel="noopener">横向热电与磁化电流</a></p></section>`:'';
}

export function bindHallBridges({root,lessonId,isCurrent,stateStore=new Map()}){
 const ids=Object.hasOwn(HALL_BRIDGE_HOOKS,lessonId)?HALL_BRIDGE_HOOKS[lessonId]:[],states=new Map(),records=[];
 const store=stateStore instanceof Map?stateStore:new Map();let alive=true;
 const active=()=>alive&&root?.isConnected!==false&&(typeof isCurrent!=='function'||isCurrent());
 const save=(id,state)=>store.set(lessonId+':'+id,clone(state));
 for(const id of ids){
  const detail=root?.querySelector?.('[data-hb-bridge="'+id+'"]'),body=root?.querySelector?.('[data-hb-body="'+id+'"]');if(!detail||!body)continue;
  const state=restored(id,store.get(lessonId+':'+id));states.set(id,state);
  const readOpen=node=>typeof node?.open==='boolean'?node.open:node?.getAttribute?.('open')!==null;
  if(state.open){detail.open=true;detail.setAttribute?.('open','');}
  const current=()=>active()&&root.querySelector('[data-hb-body="'+id+'"]')===body&&root.querySelector('[data-hb-bridge="'+id+'"]')===detail;
  detail.ontoggle=()=>{if(!current())return;state.open=readOpen(detail);save(id,state);};
  function draw(){
   if(!current())return;body.innerHTML=bodyHTML(id,state);save(id,state);
   const prefix='hb-'+id,$=suffix=>body.querySelector('#'+prefix+'-'+suffix),variant=body.querySelector('.hb-variant');
   variant.ontoggle=()=>{if(current()&&body.querySelector('.hb-variant')===variant){state.variantOpen=readOpen(variant);save(id,state);}};
   function bind(suffix,event,action){const control=$(suffix);if(!control)return;control[event]=()=>{if(!current()||$(suffix)!==control||control.disabled)return;state.variantOpen=readOpen(body.querySelector('.hb-variant'));action(control);draw();const target=suffix==='reset'?$('choice'):$(suffix);target?.focus?.({preventScroll:true});};}
   bind('choice','onchange',control=>{state.choice=answerOptions(id).some(([value])=>value===control.value)?control.value:'';state.observed=false;state.checked=false;});
   for(const key of id==='phase-rays'?['gauge','step']:['mu','temperature','kernel'])bind(key,'onchange',control=>{if(!lists[key].includes(control.value))return;state[key]=control.value;state.observed=false;state.checked=false;state.variantObserved=false;state.variantChecked=false;});
   bind('run','onclick',()=>{state.observed=true;state.checked=false;});
   bind('check','onclick',()=>{state.checked=true;});
   bind('variant-mode','onchange',control=>{if(!(id==='phase-rays'?['reverse','relative','trivial']:['full','empty','symmetric']).includes(control.value))return;state.variantMode=control.value;state.variantChoice='';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-choice','onchange',control=>{state.variantChoice=variantOptions(id,state.variantMode).some(([value])=>value===control.value)?control.value:'';state.variantObserved=false;state.variantChecked=false;});
   bind('variant-run','onclick',()=>{state.variantObserved=true;state.variantChecked=false;});
   bind('variant-check','onclick',()=>{state.variantChecked=true;});
   bind('reset','onclick',()=>{const wasOpen=state.open;Object.assign(state,initial(id),{open:wasOpen});});
  }
  draw();records.push({detail,body,state,current,readOpen,save:()=>save(id,state)});
 }
 const captureNativeOpen=()=>{for(const record of records)if(record.current()){record.state.open=record.readOpen(record.detail);const variant=record.body.querySelector('.hb-variant');if(variant)record.state.variantOpen=record.readOpen(variant);record.save();}};
 const cleanup=()=>{if(!alive)return;captureNativeOpen();alive=false;for(const {detail,body}of records){detail.ontoggle=null;for(const node of body.querySelectorAll('select'))node.onchange=null;for(const node of body.querySelectorAll('button'))node.onclick=null;const variant=body.querySelector('.hb-variant');if(variant)variant.ontoggle=null;}};
 cleanup.snapshot=()=>{if(alive)captureNativeOpen();return Object.fromEntries([...states].map(([id,state])=>[id,clone(state)]));};
 return cleanup;
}
