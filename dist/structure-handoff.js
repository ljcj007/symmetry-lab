import {mathHTML} from './math-display.js?v=20261113-prose2';
import {validateStructureHandoff} from './structure-provenance.js?v=20261114-evidence1';
export {createStructureHandoff,validateStructureHandoff,structureHandoffForCalculation} from './structure-provenance.js?v=20261114-evidence1';
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x.toPrecision(10)).toString();
const p=x=>'<p>'+esc(x)+'</p>';
const formula=x=>'<div class="sth-formula" tabindex="0">'+mathHTML(x,true)+'</div>';
const table=(caption,rows)=>'<div class="sth-scroll" tabindex="0"><table><caption>'+esc(caption)+'</caption><tbody>'+rows.map(([name,value])=>'<tr><th scope="row">'+esc(name)+'</th><td data-math-ignore>'+esc(value)+'</td></tr>').join('')+'</tbody></table></div>';
const matrixNumber=x=>{const text=Number(x.toPrecision(12)).toString(),parts=text.split('e');return parts.length===2?parts[0]+'\\times10^{'+Number(parts[1])+'}':text;};
const matrix=m=>'\\begin{pmatrix}'+m.map(row=>row.map(matrixNumber).join('&')).join('\\\\')+'\\end{pmatrix}';

export function structureHandoffStatus(value,{analysis=null,groupNumber=null}={}){
 const v=validateStructureHandoff(value);if(!analysis)return{structure:'verified',numerical:'pending',bc:'pending',bilbao:'pending',associated:false,bcCount:0,bilbaoCount:0,irrepCount:0};
 const group=groupNumber??analysis.standardLabels?.group_number;
 const associated=group===v.structure.groupNumber&&analysis.magnetic===false&&analysis.doubleValued===v.doubleValued&&Array.isArray(analysis.k)&&analysis.k.length===3&&analysis.k.every((x,i)=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x-v.coordinates.bcK[i])<1e-8);
 if(!associated)return{structure:'verified',numerical:'mismatch',bc:'unassociated',bilbao:'unassociated',associated:false,bcCount:0,bilbaoCount:0,irrepCount:0};
 const mappings=Array.isArray(analysis.standardLabels?.mappings)?analysis.standardLabels.mappings:[],n=Array.isArray(analysis.irreps)?analysis.irreps.length:0;
 const bcCount=mappings.filter(m=>m.bc_label).length,bilbaoCount=mappings.filter(m=>m.bilbao_label).length;
 const verified=n>0&&analysis.validation?.passed===true&&analysis.validation?.orbitStabilizer===true&&typeof analysis.validation?.cocycleError==='number'&&Number.isFinite(analysis.validation.cocycleError)&&analysis.validation.cocycleError>=0&&analysis.validation.cocycleError<2e-5;
 return{structure:'verified',numerical:verified?'verified':'unverified',bc:!verified?'unverified':analysis.standardLabels?.bc_complete===true&&bcCount===n?'complete':'partial-or-unavailable',bilbao:!verified?'unverified':analysis.standardLabels?.bilbao_complete===true&&bilbaoCount===n?'complete':'partial-or-unavailable',associated:true,bcCount,bilbaoCount,irrepCount:n};
}

export function structureHandoffHTML(value,{analysis=null,groupNumber=null}={}){
 const v=validateStructureHandoff(value),s=structureHandoffStatus(v,{analysis,groupNumber}),kind={'teaching-example':'教学理想结构','user-file':'用户提供的结构文件','user-text':'用户编辑或粘贴的结构文本'}[v.source.kind];
 const numerical=s.numerical==='pending'?'尚未关联表示计算':s.numerical==='verified'?'当前数值表示验证通过':s.numerical==='mismatch'?'当前群、波矢或表示类型与来源不一致':'当前表示结果尚未通过完整数值验证';
 const label=(status,count)=>status==='pending'?'等待当前表示结果':status==='unassociated'?'未关联，不引用其他结果的标签':status==='unverified'?'数值验证未通过，暂不确认标签':(status==='complete'?'该结果的标准标签完整':'部分或未命名，保留有效数值结果')+' · '+count+' / '+s.irrepCount;
 return'<section class="sth-panel" data-structure-handoff aria-label="结构到表示的来源与约定"><h3>'+esc('这次表示从哪一份结构而来？')+'</h3><p class="sth-state" data-math-ignore>'+esc(v.source.filename||kind)+' · SG '+v.structure.groupNumber+' · '+esc(numerical)+'</p><details class="sth-details"><summary>'+esc('查看文件指纹与四项验证')+'</summary>'+table('来源与独立验证状态',[[ '来源类型',kind],['原文件名',v.source.filename||'未提供文件名'],[v.source.hashBasis==='file-bytes'?'原文件字节 SHA-256':'解析文本 UTF-8 SHA-256',v.source.sha256],['来源字节数',String(v.source.byteCount)],['解析文本 SHA-256',v.source.textSHA256],['解析文本 UTF-8 字节数',String(v.source.textByteCount)],['结构转换','BC 生成元、原子协变与坐标变换已核对'],['数值表示',numerical],['BC 命名覆盖',label(s.bc,s.bcCount)],['Bilbao 命名覆盖',label(s.bilbao,s.bilbaoCount)]])+'</details>'+p('转换验证、数值表示验证和两套标准命名是四项不同结果。没有标准名字并不使通过验证的数值表示失效。')+p(v.doubleValued?'本次明确选择双值表示；这个选择不是从结构文件推断出的 SOC 强度或磁序。':'本次明确选择单值表示；结构文件本身不确定是否需要半整数自旋表示，也不识别 SOC 强度或磁序。')+'<details class="sth-details"><summary>'+esc('展开容差、原点与完整精度坐标')+'</summary>'+table('转换请求与晶体设置',[['空间群',String(v.structure.groupNumber)+' · '+v.structure.international],['Hall 编号',String(v.structure.hallNumber)],['BZ 类型',v.structure.bzType||v.structure.bravais],['输入 / BC 原子数',v.structure.inputAtomCount+' / '+v.structure.bcAtomCount],['对称性容差 / Å',String(v.settings.symprec)],['角度容差 / 度',String(v.settings.angleTolerance)],['输入 k（原晶胞倒易分数坐标）',v.coordinates.inputK.map(String).join(', ')],['BC k（未折回倒格矢区间）',v.coordinates.bcK.map(String).join(', ')],['原子协变最大误差 / Å',String(v.verification.covarianceErrorAngstrom)],['理想化最大原子位移 / Å',String(v.verification.idealizationDisplacementAngstrom)],['spglib 版本',v.verification.spglibVersion]])+formula('x_{\\mathrm{BC}}=M x_{\\mathrm{input}}+q,\\qquad k_{\\mathrm{BC}}=M^{-T}k_{\\mathrm{input}}')+formula('M='+matrix(v.coordinates.M)+',\\quad q='+matrix(v.coordinates.q.map(x=>[x])))+p('公式显示可能压缩小数；下方 JSON 保留原数值精度。原胞、原点和 Seitz 平移的约定会影响表示矩阵的规范，不能只按标签后缀或维数对应。')+p(v.verification.scope)+v.verification.warnings.map(p).join('')+'<pre class="sth-json">'+esc(JSON.stringify({coordinates:v.coordinates,association:v.association},null,2))+'</pre></details>'+p('摘要只保留文件指纹与转换设置，不含原始结构文本或完整输入；它用于关联计算，不证明文件来自测量，也不替代重新运行核验。')+'<button type="button" class="secondary" data-structure-handoff-download>'+esc('下载这份结构来源摘要 JSON')+'</button></section>';
}

export function bindStructureHandoff({root,value,analysis=null,groupNumber=null,isCurrent=()=>true,download}={}){
 const snapshot=validateStructureHandoff(value),panel=root?.querySelector?.('[data-structure-handoff]'),button=panel?.querySelector('[data-structure-handoff-download]');let alive=true;
 const current=()=>alive&&panel&&root?.isConnected!==false&&root.querySelector('[data-structure-handoff]')===panel&&isCurrent();
 if(button){button.disabled=typeof download!=='function';button.onclick=()=>{if(!current()||panel.querySelector('[data-structure-handoff-download]')!==button||button.disabled)return;const status=structureHandoffStatus(snapshot,{analysis,groupNumber});download(JSON.stringify({structureHandoff:clone(snapshot),status},null,2),'structure-representation-source.json','application/json');};}
 const cleanup=()=>{alive=false;if(button)button.onclick=null;};cleanup.snapshot=()=>clone(snapshot);return cleanup;
}
