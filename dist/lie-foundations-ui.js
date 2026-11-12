import {svgMathText} from './math-svg.js?v=20261111-demos1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>Number.isFinite(Number(value))?String(Number(Number(value).toFixed(6))):'—';
const complex=value=>typeof value==='number'?fmt(value):`${fmt(value?.re)}${Number(value?.im)<0?' − ':' + '}${fmt(Math.abs(Number(value?.im)||0))}i`;
const vector=value=>'('+value.map(complex).join(', ')+')';
const options=(items,value)=>items.map(([id,label])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
const matrix=(values,label)=>`<div class="lg-matrix-scroll"><div class="lg-matrix" style="--columns:${values[0].length}" role="math" aria-label="${esc(label)}">${values.flatMap(row=>row.map(value=>`<span>${esc(complex(value))}</span>`)).join('')}</div></div>`;
export const foundationNames={u1:'U(1) · 连续与离散',representations:'同群不同表示 · 旋量与向量',interferometer:'SU(2) · 双路径相位干涉'};
export const foundationDefaults={u1:{order:4,degrees:45,translation:.001},representations:{axis:'z',degrees:360},interferometer:{axis:'z',degrees:360,state:'up',branches:'single',phaseDegrees:0}};
export const foundationInputIds=['#lg-circle-order','#lg-translation','#lg-branches','#lg-phase'];
export const foundationPresets={
 'u1-circle-quarter':{experiment:'u1',input:{order:4,degrees:45,translation:.001}},
 'unitary-z-quarter':{experiment:'su2',input:{axis:'z',degrees:90,state:'up'}},
 'generators-xy':{experiment:'commutator',input:{group:'su2',a:1,b:2}},
 'spinor-y-quarter':{experiment:'su2',input:{axis:'y',degrees:90,state:'up'}},
 'su2-phase-single':{experiment:'interferometer',input:{axis:'z',degrees:360,state:'up',branches:'single',phaseDegrees:0}},
 'su2-center-actions':{experiment:'representations',input:{axis:'z',degrees:360}},
 'su3-t1-half':{experiment:'su3',input:{generator:1,degrees:180,state:1}},
 'su3-weight-phase':{experiment:'su3',input:{generator:3,degrees:90,state:'plus12'}}
};
export const lieGroupLabel=group=>({u1:'U(1)',su2:'SU(2)',su3:'SU(3)'})[group]||'连续群基础';
export function foundationControls(experiment,input,angle){
 if(experiment==='u1')return `${angle}<div class="lg-presets"><button type="button" data-lg-preset="45">45°</button><button type="button" data-lg-preset="90">90°</button></div><label>有限循环子群<select id="lg-circle-order">${options([[4,'C₄ · 四个元素'],[8,'C₈ · 八个元素']],input.order)}</select></label><label>平移量（以晶格步长 a=1 为单位）<input id="lg-translation" type="number" min="-8" max="8" step="any" value="${esc(input.translation)}"></label><p class="lg-hint">比较同一角度是否属于 Cₙ；再比较整数平移与任意实数平移。有限窗口不代表完整群。</p>`;
 const axes=`<label>旋转轴<select id="lg-axis">${options([['x','x 轴'],['y','y 轴'],['z','z 轴']],input.axis)}</select></label>${angle}<div class="lg-presets"><button type="button" data-lg-preset="90">90°</button><button type="button" data-lg-preset="360">360°</button><button type="button" data-lg-preset="720">720°</button></div>`;
 if(experiment==='representations')return `${axes}<p class="lg-hint">同一 U 作用在二分量旋量与三维 Pauli 向量空间；改变参数并比较两种矩阵和特征标。</p>`;
 return `${axes}<label>初态<select id="lg-state">${options([['up','|↑⟩'],['plus','(1,1)ᵀ/√2'],['plus_i','(1,i)ᵀ/√2']],input.state)}</select></label><label>旋转施加位置<select id="lg-branches">${options([['single','只旋转第二条路径'],['both','两条路径作相同旋转']],input.branches)}</select></label><label>第二条路径的附加相位（度）<input id="lg-phase" type="number" min="-1440" max="1440" step="any" value="${esc(input.phaseDegrees)}"></label><p class="lg-hint">在均匀分束与合束之间施加变换。比较第二支 360°、第二支 720°，以及双支 360°。</p>`;
}
export function readFoundationPayload(experiment,$,number){
 const degrees=number('#lg-angle',-1440,1440),angle=degrees*Math.PI/180;
 if(experiment==='u1'){const order=number('#lg-circle-order',1,24,true),translation=number('#lg-translation',-8,8);return {input:{order,degrees,translation},payload:{lab:'lie',experiment,order,angle,translation}};}
 const axis=$('#lg-axis').value;if(!['x','y','z'].includes(axis))throw Error('请选择有效的轴与初态。');
 if(experiment==='representations')return {input:{axis,degrees},payload:{lab:'lie',experiment,axis,angle}};
 const state=$('#lg-state').value,branches=$('#lg-branches').value,phaseDegrees=number('#lg-phase',-1440,1440);
 if(!['up','plus','plus_i'].includes(state)||!['single','both'].includes(branches))throw Error('请选择有效的轴与初态。');
 return {input:{axis,degrees,state,branches,phaseDegrees},payload:{lab:'lie',experiment,axis,angle,state,branches,phase:phaseDegrees*Math.PI/180}};
}
const checkLabels={unitModulus:'单位模残差',subgroupClosure:'循环子群闭合残差',spinorUnitarity:'旋量幺正残差',vectorOrthogonality:'向量正交残差',vectorDeterminant:'向量行列式残差',probability:'端口概率和残差',portFormula:'端口公式残差',unitarity:'幺正残差'};
const checks=result=>`<div class="lg-checks">${Object.entries(result.residuals||{}).map(([key,value])=>`<div><span>${esc(checkLabels[key]||key)}</span><code>${Number.isFinite(value)?value.toExponential(2):'—'}</code></div>`).join('')}</div>`;
export function foundationOutput(result){
 if(result.experiment==='u1'){
  const point=([x,y])=>[210+110*x,145-110*y],selected=point(result.selectedPoint);
  return `<svg class="lg-visual" viewBox="0 0 420 300" role="img" aria-label="有限循环子群与连续单位圆"><circle cx="210" cy="145" r="110" fill="none" stroke="#aac4b7" stroke-width="2"/>${result.circlePoints.map((value,index)=>{const p=point(value);return `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#276951"><title>${index}</title></circle>`;}).join('')}<line x1="210" y1="145" x2="${selected[0]}" y2="${selected[1]}" stroke="#b67d32" stroke-width="3"/><circle cx="${selected[0]}" cy="${selected[1]}" r="8" fill="#b67d32"/><text x="210" y="286" text-anchor="middle" class="lg-svg-label">${svgMathText('C_'+result.order+' ⊂ U(1)')}</text></svg><div class="lg-state-facts"><p><span>选定 z(φ)</span><code>${esc(complex(result.element))}</code></p><p><span>属于有限子群 Cₙ？</span><strong>${result.inFiniteSubgroup?'是':'否'}</strong></p><p><span>平移属于整数平移群？</span><strong>${result.inIntegerTranslations?'是':'否'}</strong></p></div><pre class="lg-formula">整数平移：… −2, −1, 0, 1, 2 …\n当前实数平移：${fmt(result.translation)}\nU(1) 的局部实维数：1；所用复数表示维数：1；有限子群阶：${result.subgroupOrder}</pre>${checks(result)}`;
 }
 if(result.experiment==='representations')return `<div class="lg-matrix-pair"><section><h4>旋量表示 · 2 维</h4>${matrix(result.spinorMatrix,'SU(2) 二维旋量表示')}<p>χ = ${esc(complex(result.spinorCharacter))}</p></section><section><h4>向量表示 · 3 维</h4>${matrix(result.vectorMatrix,'SU(2) 三维向量表示')}<p>χ = ${fmt(result.vectorCharacter)}</p></section></div><div class="lg-state-facts"><p><span>向量表示是否为 I₃？</span><strong>${result.sameVectorAsIdentity?'是':'否'}</strong></p><p><span>旋量表示是否为 −I₂？</span><strong>${result.spinorIsNegativeIdentity?'是':'否'}</strong></p><p><span>z 向量的像</span><code>${esc(vector(result.vectorImageOfZ))}</code></p></div><p>同一个 SU(2) 群元素；群的实维数是 3，两个表示空间维数分别是 2 和 3。</p>${checks(result)}`;
 return `<svg class="lg-visual" viewBox="0 0 420 220" role="img" aria-label="两条路径合束后的端口概率"><path d="M25 110 L90 50 H260 L330 110 L395 50 M90 170 H260 L330 110 L395 170 M25 110 L90 170" fill="none" stroke="#8da99a" stroke-width="3"/><text x="150" y="40" class="lg-svg-label">${result.branches==='both'?'U':'I'}</text><text x="150" y="195" class="lg-svg-label">U</text><text x="340" y="40" class="lg-svg-label">+</text><text x="340" y="198" class="lg-svg-label">−</text></svg><div class="lg-probabilities">${result.portProbabilities.map((value,index)=>`<div><span>${index===0?'+ 端口':'− 端口'}</span><progress max="1" value="${value}" aria-label="${index===0?'加端口概率':'减端口概率'}"></progress><code>${fmt(value)}</code></div>`).join('')}</div><pre class="lg-formula">P± = [1 ± Re(e^(iφ)⟨Aψ|Bψ⟩)] / 2</pre><div class="lg-state-facts"><p><span>路径⊗自旋四维态 · 基底 (a↑,a↓,b↑,b↓)</span><code>${esc(vector(result.pathState))}</code></p><p><span>+ 端口自旋振幅</span><code>${esc(vector(result.portStates[0]))}</code></p><p><span>− 端口自旋振幅</span><code>${esc(vector(result.portStates[1]))}</code></p><p><span>含相位的路径重叠</span><code>${esc(complex(result.pathCoherence))}</code></p></div><p class="lg-hint">A、B 分别是第一、第二路径的操作，单支模式为 A=I、B=U。每个端口自旋振幅的范数平方给出端口概率。零概率端口没有可定义的条件自旋态。</p>${checks(result)}`;
}
