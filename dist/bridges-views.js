import {esc,num,table,notes,sources,controlsHTML,readControls} from './pathways-views.js?v=20261031-frontiers1';
import {quantumCurveSVG,heatmapSVG} from './quantum-plots.js?v=20261031-frontiers1';
import {svgMathText} from './math-svg.js?v=20261031-frontiers1';
export {esc,num,table,notes,sources,controlsHTML,readControls};
const val=x=>typeof x==='number'?num(x):x===null||x===undefined?'—':typeof x==='object'?JSON.stringify(x):String(x);
const transitionLabel=x=>({addition:'添加电子',removal:'移除电子',response:'连通响应'}[x]||x);
const safeId=s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'-');
const complex=(re,im)=>num(re)+(im<0?'':' + ')+num(im)+'i';

export function blochSVG(v,yaw=35){
 const a=yaw*Math.PI/180,xy=([x,y,z])=>[230+120*(Math.cos(a)*x-Math.sin(a)*y),170-120*z+40*(Math.sin(a)*x+Math.cos(a)*y)];
 const end=xy(v);
 return `<svg viewBox="0 0 460 350" role="img" aria-label="当前约化自旋的 Bloch 向量"><circle cx="230" cy="170" r="120" fill="#f2f7f3" stroke="#92aa9c"/><ellipse cx="230" cy="170" rx="120" ry="40" fill="none" stroke="#b5c8bc" stroke-dasharray="5 5"/>${[[[1.2,0,0],'x'],[[0,1.2,0],'y'],[[0,0,1.2],'z']].map(([p,t])=>{const q=xy(p);return `<line x1="230" y1="170" x2="${q[0]}" y2="${q[1]}" stroke="#8da699"/><text x="${q[0]+5}" y="${q[1]}">${t}</text>`;}).join('')}<line x1="230" y1="170" x2="${end[0]}" y2="${end[1]}" stroke="#237863" stroke-width="5"/><circle cx="${end[0]}" cy="${end[1]}" r="7" fill="#a56b31"/><text x="230" y="329" text-anchor="middle">(${v.map(num).join(', ')})</text></svg>`;
}

export function transitionSticks(rows,selected=0){
 if(!rows.length)return '<p>所选探针没有非零跃迁。</p>';
 const min=Math.min(...rows.map(t=>t.energy)),max=Math.max(...rows.map(t=>t.energy)),span=max-min||1,top=Math.max(...rows.map(t=>t.weight),1e-12);
 return `<svg viewBox="0 0 720 300" role="img" aria-label="可点击的离散跃迁谱；竖线高度是权重而非展宽峰高"><path d="M70 30V240H660" fill="none" stroke="#9cb5a6"/>${rows.map((t,i)=>{const x=90+550*(t.energy-min)/span,y=240-180*t.weight/top;return `<g><line x1="${x}" x2="${x}" y1="240" y2="${y}" stroke="${i===selected?'#b37530':'#287b64'}" stroke-width="${i===selected?6:3}"/><circle data-br-transition="${i}" tabindex="0" role="button" aria-label="跃迁 ${i+1}：能量 ${num(t.energy)} eV，权重 ${num(t.weight)}" cx="${x}" cy="${y}" r="9" fill="${i===selected?'#b37530':'#287b64'}"><title>跃迁${i+1}；E=${num(t.energy)}；w=${num(t.weight)}</title></circle></g>`;}).join('')}<text x="80" y="270">${num(min)}</text><text x="650" y="270" text-anchor="end">${num(max)}</text><text x="360" y="293" text-anchor="middle">E（eV）；零宽度离散权重</text></svg>`;
}

function formulaCards(r){return `<section class="br-formulas"><h3>公式与当前结果联动</h3><p>点击公式可查词并高亮对应图形；按钮可直接定位图形。数值来自当前这次计算。</p>${(r.formulaLinks||[]).map(f=>`<article class="br-formula-card" data-formula-context="${safeId(f.id)}" data-plot-target="${safeId(f.plot)}"><h4>${esc(f.label)}</h4><div class="obs-formula">${esc(f.formula)}</div><p>${esc(f.meaning)}</p><div class="br-current-values">${table(['当前计算量','数值'],(f.values||[]).map(v=>[v.label,val(v.value)]))}</div><button type="button" class="secondary" data-br-focus="${safeId(f.plot)}">定位对应图形</button></article>`).join('')}</section>`;}
export function resultHTML(module,r){
 let special='';
 if(module==='manybody')special='<section class="br-visual"><h3>点击谱峰，追踪跃迁</h3><div id="br-sticks"></div><label>选择跃迁<select id="br-transition"></select></label><div id="br-transition-info"></div></section>';
 if(module==='density')special='<section class="br-visual"><h3>时间、Bloch 向量与密度矩阵联动</h3><label>轨迹时刻<input id="br-time" type="range" min="0" max="'+(r.stateSnapshots.length-1)+'" value="0" step="1"></label><label>观察方向<input id="br-yaw" type="range" min="0" max="360" value="35"></label><label>矩阵分量<select id="br-component"><option value="re">实部</option><option value="im">虚部</option></select></label><div id="br-state-info"></div><div class="br-state-grid"><div id="br-bloch"></div><div id="br-matrix"></div></div></section>';
 if(module==='polaron')special='<section class="br-visual"><h3>电子与振动云</h3><label>显示振动位移<select id="br-cloud-kind"><option value="unconditional">无条件平均位移</option><option value="site0">电子位于站点0的条件位移</option><option value="site1">电子位于站点1的条件位移</option></select></label><div id="br-cloud"></div><p>圆大小表示电子占据，位移线端点表示无量纲振动坐标。条件位移按测得电子位置筛选，不表示已经发生静态自发局域化。</p></section>';
 if(module==='workshop')special=`<section class="br-visual"><h3>按步骤查看生成元约束</h3><p>启用操作：${esc(r.workshop.generators.join('；')||'无生成元约束')}</p><label>选择系数关系<select id="br-constraint">${r.workshop.constraints.map((_,i)=>`<option value="${i}">约束 ${i+1}</option>`).join('')}</select></label><div id="br-constraint-info"></div><p>矩阵恒等式 → 单项式系数关系 → 允许空间 → 投影后的能带。展示的线性关系可能相互依赖；独立约束数由矩阵秩给出。</p></section>`;
 return table(['当前结果','数值'],r.summary.map(s=>[s.label,val(s.value)+(s.unit?' '+s.unit:'')]))+special+formulaCards(r)+r.plots.map((p,i)=>`<section class="br-plot" data-br-plot="${safeId(p.id||String(i))}" tabindex="-1"><h3>${esc(p.title)}</h3>${quantumCurveSVG(p.series,{xLabel:p.xLabel,yLabel:p.yLabel})}</section>`).join('')+r.tables.map(t=>`<details><summary>${esc(t.title)}</summary>${table(t.columns,t.rows.map(row=>row.map(val)))}</details>`).join('')+`<details><summary>数值校验与约定</summary>${table(['检查项','结果'],Object.entries(r.checks||{}).map(([k,v])=>[k,val(v)]))}</details>`+notes(r.warnings||[]);
}

export function bindResult(module,r,root){
 const $=s=>root.querySelector(s);
 const focusPlot=(id,scroll=true)=>{root.querySelectorAll('[data-br-plot]').forEach(el=>el.setAttribute('data-highlighted',String(el.dataset.brPlot===id)));const target=$('[data-br-plot="'+id+'"]');if(scroll){target?.scrollIntoView?.({behavior:'smooth',block:'center'});target?.focus?.({preventScroll:true});}};
 root.querySelectorAll('[data-br-focus]').forEach(b=>b.onclick=()=>focusPlot(b.dataset.brFocus));
 root.querySelectorAll('[data-formula-context]').forEach(card=>card.onclick=e=>{if(e.target?.closest?.('[data-fd-trigger]'))focusPlot(card.dataset.plotTarget,false);});
 if(module==='manybody'){
  const rows=r.transitions||[],select=$('#br-transition');select.innerHTML=rows.map((t,i)=>`<option value="${i}">${i+1} · ${esc(transitionLabel(t.kind))} · ${num(t.energy)} eV · w=${num(t.weight)}</option>`).join('');
  const draw=()=>{const i=Number(select.value)||0,t=rows[i];$('#br-sticks').innerHTML=transitionSticks(rows,i);if(!t){$('#br-transition-info').textContent='无非零跃迁';return;}$('#br-transition-info').innerHTML=table(['跃迁信息','当前值'],[['过程',transitionLabel(t.kind)],['初态能量 / eV',num(t.initialEnergy)],['末态能量 / eV',num(t.finalEnergy)],['初态电子数',t.initialParticles],['末态电子数',t.finalParticles],['初态 / 末态简并度',t.initialDegeneracy+' / '+t.finalDegeneracy],['离散谱权重',num(t.weight)],['初态站点密度',t.initialObservables.density.map(num).join(', ')],['条件末态站点密度',t.finalObservables.density.map(num).join(', ')]])+`<p>${esc(t.finalObservablesConvention)}</p>`;root.querySelectorAll('[data-br-transition]').forEach(b=>{const choose=()=>{select.value=b.dataset.brTransition;draw();};b.onclick=choose;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};});};select.onchange=draw;draw();
 }
 if(module==='density'){
  const draw=()=>{const s=r.stateSnapshots[Number($('#br-time').value)],component=$('#br-component').value;$('#br-state-info').innerHTML=table(['当前时刻','数值'],[['时间 / ns',num(s.time)],['整体纯度',num(s.purity)],['自旋A约化熵（bit）',num(s.entropyA)],['双自旋负性',val(s.negativity)]]);$('#br-bloch').innerHTML=blochSVG(s.blochA,Number($('#br-yaw').value));const n=s.rho.re.length;$('#br-matrix').innerHTML=heatmapSVG(Array.from({length:n},(_,i)=>i),Array.from({length:n},(_,i)=>i),s.rho[component],{title:'ρ 的'+(component==='re'?'实部':'虚部'),signed:true,xLabel:'列基矢索引',yLabel:'行基矢索引'})+`<p>基底：${esc(r.basis.join('，'))}。Bloch 球显示自旋A的约化态。</p>`;};$('#br-time').oninput=draw;$('#br-yaw').oninput=draw;$('#br-component').onchange=draw;draw();
 }
 if(module==='polaron'){
  const g=r.ground,draw=()=>{const kind=$('#br-cloud-kind').value,displacement=kind==='unconditional'?g.displacement:g.conditionalDisplacement[Number(kind.at(-1))];const scale=Math.max(1,...displacement.filter(x=>typeof x==='number').map(Math.abs));$('#br-cloud').innerHTML=`<svg viewBox="0 0 600 260" role="img" aria-label="电子占据与条件振动位移示意">${[0,1].map(i=>{const x=160+280*i,dx=displacement[i],end=x+(dx===null?0:65*dx/scale);return `<line x1="${x-80}" x2="${x+80}" y1="130" y2="130" stroke="#c3d1c8"/><line x1="${x}" x2="${end}" y1="130" y2="130" stroke="#aa7b39" stroke-width="5"/><circle cx="${end}" cy="130" r="${12+25*Math.sqrt(Math.max(0,g.density[i]))}" fill="#2c7f69"/><text x="${x}" y="45" text-anchor="middle">站点 ${i}：n=${num(g.density[i])}</text><text x="${x}" y="210" text-anchor="middle">X=${val(dx)}；N=${num(g.phononOccupation[i])}</text>`;}).join('')}</svg><p>位移显示比例按当前最大绝对值归一；具体数值以上方标注为准。</p>`;};$('#br-cloud-kind').onchange=draw;draw();
 }
 if(module==='workshop'){
  const draw=()=>{const row=r.workshop.constraints[Number($('#br-constraint').value)];$('#br-constraint-info').innerHTML=row?`<div class="obs-formula">${esc(row.map(x=>num(x.factor)+' '+x.coefficient).join(' + ')+' = 0')}</div>`:'<p>没有启用生成元，24个实系数均可自由取值。</p>';};$('#br-constraint').onchange=draw;draw();
 }
}
