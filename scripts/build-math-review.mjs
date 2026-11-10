// Local browser fixture. It renders the real display layer in batches without
// shipping a diagnostic route, adding dependencies or modifying source data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),cases=[],seen=new Set();
const marker=/[_^₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ᵀ†′\u0304\u0305∑Σ∫χΓΩ]/u;
const excluded=/^(?:id|module|action|route|preset|section|lesson|exercise|sourceId|path|url|schema|release|filename|function|api|implementation|input|default|value|sourceHashes|sha256|symbols|formulaAliases|contexts)$/i;
for(const name of fs.readdirSync(path.join(root,'dist/data')).filter(x=>x.endsWith('.json')&&!/provenance|search-index/.test(x))){
 const data=JSON.parse(fs.readFileSync(path.join(root,'dist/data',name),'utf8'));
 if(!['lessons','exercises','materials','modules','entries','cases'].some(k=>Array.isArray(data[k])))continue;
 const walk=(value,pointer='',field='')=>{
  if(excluded.test(field))return;
  if(typeof value==='string'){
   const block=/formula$/i.test(field);if(!block&&!marker.test(value)||/https?:\/\/|\.py\b|\.json\b/.test(value))return;
   const key=block+'|'+value;if(seen.has(key))return;seen.add(key);
   cases.push({catalog:name,pointer,source:value,block});
  }else if(Array.isArray(value))value.forEach((x,i)=>walk(x,pointer+'/'+i,field));
  else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>walk(v,pointer+'/'+k,k));
 };
 walk(data);
}
const revision=Date.now().toString();
const out=path.join(root,'.openai');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'math-review-cases.json'),JSON.stringify(cases));
fs.writeFileSync(path.join(out,'math-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全站公式排版复核</title><link rel="icon" href="../dist/icon.svg"><link rel="stylesheet" href="../dist/vendor/katex/katex.min.css"><link rel="stylesheet" href="../dist/math-display.css?review=${revision}"><style>body{font:18px/1.9 'Segoe UI','Microsoft Yahei',sans-serif;margin:20px;color:#263e33}button{font:inherit;padding:10px}h1{font-size:26px}.audit-frame{width:320px;max-width:100%;box-sizing:border-box;border:1px solid #ccd9d0;padding:14px;min-width:0}p{margin:14px 0}.obs-formula{background:#eff5ef}.audit-label{display:flex;flex-direction:column;gap:6px}.audit-label input{font:inherit;width:100%;box-sizing:border-box}.audit-choice{display:flex;align-items:baseline;gap:8px}.audit-choice input{flex:none}#report{white-space:pre-wrap;overflow-wrap:anywhere}#cases{display:flex;gap:22px;flex-wrap:wrap}#cases>section{min-width:0}#batch:empty{display:none}summary{cursor:pointer}</style><h1>全站公式与符号排版复核</h1><p>读取现有课程、练习与词典，使用网站相同的公式排版器；每批实际插入页面并测量后再进入下一批。</p><button id="run">运行全部排版检查</button><p id="status" role="status">待检查</p><pre id="report"></pre><div id="cases"><section><h2>窄屏长公式</h2><div class="audit-frame"><p class="obs-formula">λ₁=[[0,1,0],[1,0,0],[0,0,0]]\nλ₂=[[0,−i,0],[i,0,0],[0,0,0]]</p><p class="obs-formula">χ_{ij}=Σ_{ab}R_{ia}R_{jb}χ_{ab}</p><p>BaTiO₃、MnF₂、Ni²⁺；eV/Å² 与 Å³/胞。</p><p>cos(−ky)−cos kx=−(cos kx−cos ky)，符合 B₁g 基函数。</p><p>R̄⁻¹、C̄₂z、P6₃/mmc 与 10̄。</p></div></section><section><h2>标签与选择题</h2><div class="audit-frame"><label class="audit-label">选择 k_x 与 χ_{ij} 的约定<input aria-label="测试输入"></label><label class="audit-choice"><input type="radio" name="answer">对 C4v 取 χ_{xx}=χ_{yy}，并保留 χ_{zz}。</label></div></section></div><h2>当前批次</h2><div id="batch" class="audit-frame"></div><script type="module">
import {typesetMath,mathSourceText,layoutMathOverflow} from '../dist/math-display.js?review=${revision}';
const status=document.querySelector('#status'),report=document.querySelector('#report'),batch=document.querySelector('#batch');
typesetMath(document.querySelector('#cases'));document.fonts.ready.then(()=>layoutMathOverflow(document.querySelector('#cases')));
document.querySelector('#run').onclick=async event=>{
 event.target.disabled=true;const rows=await fetch('./math-review-cases.json').then(r=>r.json()),failures=[],overflow=[],sourceLoss=[],counts={};let rendered=0;
 for(let start=0;start<rows.length;start+=30){
  const slice=rows.slice(start,start+30);batch.replaceChildren();
  for(const row of slice){const el=document.createElement('p');if(row.block)el.className='obs-formula';el.textContent=row.source;batch.append(el);}
  typesetMath(batch);await document.fonts.ready;layoutMathOverflow(batch);await new Promise(requestAnimationFrame);
  [...batch.children].forEach((el,i)=>{
   const row=slice[i];counts[row.catalog]=(counts[row.catalog]||0)+1;
   for(const bad of el.querySelectorAll('.sl-math-fallback,.katex-error,[data-crystal-error]'))failures.push({catalog:row.catalog,pointer:row.pointer,source:row.source,error:bad.dataset.mathError||bad.textContent});
   if(mathSourceText(el)!==row.source)sourceLoss.push({catalog:row.catalog,pointer:row.pointer,source:row.source,display:mathSourceText(el)});
   if(!row.block&&el.scrollWidth>el.clientWidth+2)overflow.push({catalog:row.catalog,pointer:row.pointer,source:row.source,width:el.clientWidth,scroll:el.scrollWidth});
  });
  rendered+=slice.length;status.textContent='已实际排版 '+rendered+' / '+rows.length+' 条…';
 }
 batch.replaceChildren();const result={completed:true,cases:rendered,catalogs:Object.keys(counts).length,failures,sourceLoss,inlineOverflow:overflow,counts,labelItems:document.querySelector('.audit-label').children.length,choiceItems:document.querySelector('.audit-choice').children.length};
 report.textContent=JSON.stringify(result,null,2);status.textContent='检查完成：'+rendered+' 条，'+Object.keys(counts).length+' 份目录；错误 '+failures.length+'；来源丢失 '+sourceLoss.length+'；行内溢出 '+overflow.length+'。';event.target.disabled=false;
};
</script></html>`);
console.log('Browser review:',cases.length,'unique text/formula cases; http://127.0.0.1:9152/.openai/math-review.html');
