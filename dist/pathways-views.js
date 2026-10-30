import {quantumCurveSVG,heatmapSVG} from './quantum-plots.js?v=20261030-symmetry1';
import {esc,num,table,notes,sources} from './response-views.js?v=20261030-symmetry1';
export {esc,num,table,notes,sources};
const display=x=>typeof x==='number'?num(x):typeof x==='object'?JSON.stringify(x):String(x??'—');
export function controlsHTML(module,values){return module.fields.map(f=>`<label ${f.experiment&&f.experiment!==values.experiment?'hidden':''}>${esc(f.label)}${f.type==='select'?`<select id="pw-${f.key}">${f.options.map(([v,t])=>`<option value="${esc(v)}" ${String(values[f.key])===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select>`:`<input id="pw-${f.key}" type="number" value="${esc(values[f.key])}" min="${f.min}" max="${f.max}" step="${f.step??'any'}" required>`}</label>`).join('')+`<p class="obs-small">调整参数后点击计算。图形、数值和校验使用同一份 Python 结果。</p>`;}
export function readControls(module,root){const result={};for(const f of module.fields){const raw=root.querySelector('#pw-'+f.key)?.value;if(raw===undefined||raw==='')throw Error(f.label+'不能留空');if(f.type==='select'){const match=f.options.find(([v])=>String(v)===raw);if(!match)throw Error('无效选项：'+f.label);result[f.key]=match[0];}else{const v=Number(raw);if(!Number.isFinite(v)||v<f.min||v>f.max)throw Error(f.label+'超出允许范围');result[f.key]=v;}}return result;}
export function siteOrbitSVG(positions,yaw=35,pitch=25){
 const a=yaw*Math.PI/180,b=pitch*Math.PI/180,project=([x,y,z])=>{x-=.5;y-=.5;z-=.5;const u=x*Math.cos(a)-y*Math.sin(a),v=x*Math.sin(a)+y*Math.cos(a);return[280+220*u,175-220*(z*Math.cos(b)+v*Math.sin(b))];};
 const corners=Array.from({length:8},(_,i)=>[i&1,(i>>1)&1,(i>>2)&1]);
 const edges=corners.flatMap((p,i)=>[1,2,4].filter(d=>(i&d)===0).map(d=>[p,corners[i+d]]));
 return `<svg viewBox="0 0 560 355" role="img" aria-label="位点轨道在原胞中的三维示意">${edges.map(([p,q])=>{const u=project(p),v=project(q);return `<line x1="${u[0]}" y1="${u[1]}" x2="${v[0]}" y2="${v[1]}" stroke="#9bb0a3" stroke-width="2"/>`;}).join('')}${positions.map((p,i)=>{const q=project(p);return `<circle cx="${q[0]}" cy="${q[1]}" r="10" fill="${i?'#ae8040':'#26755f'}"><title>位点${i+1}：${p.map(num).join(', ')}</title></circle><text x="${q[0]+13}" y="${q[1]-8}">${i+1}</text>`;}).join('')}<text x="280" y="340" text-anchor="middle">原胞分数坐标示意 · 晶格度量为教学值</text></svg>`;
}
export function resultHTML(module,r){
 const summary=table(['当前结果','数值'],r.summary.map(s=>[s.label,display(s.value)+(s.unit?' '+s.unit:'')]));
 const orbit=module==='bandrep'?`<section class="pw-visual"><h3>由一个位点生成整个原胞轨道</h3><label>方位角<input id="pw-yaw" type="range" min="0" max="360" value="35"></label><div id="pw-orbit"></div></section>`:'';
 const heat=r.heatmap?`<h3>${esc(r.heatmap.title)}</h3><label>强度显示<select id="pw-heat-scale"><option value="log">log(1+强度)</option><option value="linear">原始线性强度</option></select></label><div id="pw-heatmap"></div><p class="obs-small">颜色变换只影响显示，JSON保留原始线性强度。悬停格点可查看数值。</p>`:'';
 return summary+orbit+heat+r.plots.map(p=>`<section><h3>${esc(p.title)}</h3>${quantumCurveSVG(p.series,{xLabel:p.xLabel,yLabel:p.yLabel})}</section>`).join('')+r.tables.map(t=>`<details><summary>${esc(t.title)}</summary>${table(t.columns,t.rows.map(row=>row.map(display)))}</details>`).join('')+`<details><summary>数值校验与约定</summary>${table(['检查项','结果'],Object.entries(r.checks||{}).map(([k,v])=>[k,display(v)]))}</details>`+notes(r.warnings||[]);
}
export function bindResult(module,r,root){
 if(module==='bandrep'){const input=root.querySelector('#pw-yaw'),target=root.querySelector('#pw-orbit');const draw=()=>target.innerHTML=siteOrbitSVG(r.site.positions,Number(input.value));input.oninput=draw;draw();}
 if(r.heatmap){const h=r.heatmap,select=root.querySelector('#pw-heat-scale');const draw=()=>{const log=select.value==='log';root.querySelector('#pw-heatmap').innerHTML=heatmapSVG(h.x,h.y,log?h.z.map(row=>row.map(v=>v===null?null:Math.log1p(Math.max(0,v)))):h.z,{title:log?'log(1+相对强度)':h.title,xLabel:h.xLabel,yLabel:h.yLabel});};select.onchange=draw;draw();}
}
