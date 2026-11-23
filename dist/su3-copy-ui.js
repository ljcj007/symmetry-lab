import {mathHTML} from './math-display.js?v=20261116-prose3';

// Python owns all CG construction and symbolic algebra. This view only pairs
// returned labels, selects returned entries, and displays their exact values.
const LESSONS=['su3-cg-change-basis','su3-cg-multiplicity'];
const ANGLES=['0','45','90'],PHASES=['1','i','-1','-i'],owners=new WeakMap();
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const text=x=>typeof x==='string'&&x.length>0&&x.length<200000;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const complex=x=>record(x)&&typeof x.re==='number'&&Number.isFinite(x.re)&&typeof x.im==='number'&&Number.isFinite(x.im);
const scalar=x=>record(x)&&text(x.exact)&&text(x.latex)&&complex(x.numeric)&&(!/^-?\d+$/.test(x.exact)||(Number(x.exact)===x.numeric.re&&x.numeric.im===0));
const zero=x=>scalar(x)&&x.exact==='0'&&x.numeric.re===0&&x.numeric.im===0;
const positive=x=>scalar(x)&&x.numeric.im===0&&x.numeric.re>0;
function matrix(m,rows,cols){
 return record(m)&&same(m.shape,[rows,cols])&&text(m.latex)&&Array.isArray(m.exact)&&m.exact.length===rows&&Array.isArray(m.numeric)&&m.numeric.length===rows&&m.exact.every((row,i)=>Array.isArray(row)&&row.length===cols&&Array.isArray(m.numeric[i])&&m.numeric[i].length===cols&&row.every((s,j)=>text(s)&&complex(m.numeric[i][j])&&(!/^-?\d+$/.test(s)||(Number(s)===m.numeric[i][j].re&&m.numeric[i][j].im===0))));
}
export function su3CopyRequest(raw={}){
 const angle=raw.angle??'45',phase=raw.phase??'1';
 if(typeof angle!=='string'||!ANGLES.includes(angle)||typeof phase!=='string'||!PHASES.includes(phase))throw Error('请选择列明的 0°、45°、90° 和四种复相位；草稿会保留。');
 return{lab:'su3_copy',angle:Number(angle),phase};
}
const identity=p=>record(p)&&same(Object.keys(p).sort(),['angle','lab','phase'])&&p.lab==='su3_copy'&&ANGLES.includes(String(p.angle))&&Number.isInteger(p.angle)&&PHASES.includes(p.phase)?JSON.stringify({lab:p.lab,angle:p.angle,phase:p.phase}):'';
function embeddingColumn(column,pair,kind,canonical,embedding,position){
 const parity=kind==='s'?1:-1;
 if(!record(column)||!Number.isInteger(column.canonicalColumn)||column.swapParity!==parity||!Number.isInteger(column.copy)||!Number.isInteger(column.blockIndex)||!matrix(column.vector,64,1)||!matrix(column.amplitudeMatrix,8,8)||!Array.isArray(column.terms))return false;
 const meta=canonical.coupledBasis[column.canonicalColumn];
 if(!record(meta)||meta.p!==1||meta.q!==1||meta.localIndex!==pair.mu||meta.copy!==column.copy||meta.blockIndex!==column.blockIndex||meta.swapParity!==parity||!same(meta.pattern,pair.pattern)||!same(meta.weight,pair.weight))return false;
 const nonzero=[];
 for(let i=0;i<64;i++){
  const a=column.vector.exact[i][0],n=column.vector.numeric[i][0],left=Math.floor(i/8),right=i%8;
  if(a!==canonical.exactCGMatrix[i][column.canonicalColumn]||a!==embedding.exact[i][position]||a!==column.amplitudeMatrix.exact[left][right]||!same(n,column.amplitudeMatrix.numeric[left][right])||!same(n,embedding.numeric[i][position]))return false;
  if(a!=='0')nonzero.push(i);
 }
 if(!same(column.terms.map(t=>t?.productIndex),nonzero))return false;
 return column.terms.every(t=>record(t)&&Number.isInteger(t.leftIndex)&&Number.isInteger(t.rightIndex)&&t.leftIndex>=0&&t.leftIndex<8&&t.rightIndex>=0&&t.rightIndex<8&&t.productIndex===t.leftIndex*8+t.rightIndex&&text(t.label)&&scalar(t.coefficient)&&t.coefficient.exact===column.vector.exact[t.productIndex][0]&&same(t.coefficient.numeric,column.vector.numeric[t.productIndex][0])&&canonical.productBasis[t.productIndex]?.leftIndex===t.leftIndex&&canonical.productBasis[t.productIndex]?.rightIndex===t.rightIndex&&column.terms.some(other=>other.leftIndex===t.rightIndex&&other.rightIndex===t.leftIndex));
}
function sparse(m,rows,cols){return record(m)&&same(m.shape,[rows,cols])&&Array.isArray(m.entries)&&m.entries.every(t=>record(t)&&Number.isInteger(t.row)&&Number.isInteger(t.column)&&t.row>=0&&t.row<rows&&t.column>=0&&t.column<cols&&scalar(t.value));}
function checkedModel(r){
 if(!record(r)||r.schema!=='symmetry-lab-su3-copy-1'||r.lab!=='su3_copy'||!identity(r.request)||!record(r.canonical)||r.canonical.serialization!=='python-json-utf8-sorted-v1'||typeof r.canonical.serialized!=='string'||!r.canonical.serialized.length||typeof r.canonical.sha256!=='string'||!/[0-9a-f]{64}/.test(r.canonical.sha256)||!record(r.canonical.request)||!record(r.canonical.reply))return{status:'invalid'};
 const c=r.canonical.reply;
 if(c.arithmetic!=='exact'||c.dimension!==64||!Array.isArray(c.exactCGMatrix)||c.exactCGMatrix.length!==64||!c.exactCGMatrix.every(row=>Array.isArray(row)&&row.length===64&&row.every(text))||c.coupledBasis?.length!==64||c.productBasis?.length!==64||!matrix(r.canonicalEmbedding,64,16))return{status:'invalid'};
 if(!same(r.dimensions,{product:64,inner:8,outer:2,isotypic:16,zeroWeightPerCopy:2,zeroWeightBothCopies:4}))return{status:'invalid'};
 if(!Array.isArray(r.pairs)||r.pairs.length!==8||!r.pairs.every((p,i)=>record(p)&&p.mu===i&&Array.isArray(p.pattern)&&p.pattern.length===3&&p.pattern.every(Number.isInteger)&&Array.isArray(p.weight)&&p.weight.length===2&&p.weight.every(Number.isInteger)&&Number.isInteger(p.twoI)&&scalar(p.I)&&embeddingColumn(p.s,p,'s',c,r.canonicalEmbedding,i)&&embeddingColumn(p.a,p,'a',c,r.canonicalEmbedding,8+i)))return{status:'invalid'};
 if(new Set(r.pairs.map(p=>p.pattern.join(','))).size!==8||new Set(r.pairs.flatMap(p=>[p.s.canonicalColumn,p.a.canonicalColumn])).size!==16||r.pairs.filter(p=>same(p.weight,[0,0])).length!==2)return{status:'invalid'};
 const t=r.rotation,f=r.fixed,bad=r.counterexample;
 if(!record(t)||t.angle!==r.request.angle||t.phase!==r.request.phase||!text(t.order)||!matrix(t.R,2,2)||!matrix(t.U,16,16)||!matrix(t.embedding,64,16)||!matrix(t.exchangeCanonical,16,16)||!matrix(t.exchange,16,16)||!matrix(t.exchangePair,2,2))return{status:'invalid'};
 if(!record(f)||!text(f.description)||!matrix(f.b,16,8)||!matrix(f.bPrime,16,8)||!matrix(f.productStates,64,8)||!matrix(f.reconstructed,64,8)||f.states?.length!==8||!f.states.every((s,i)=>record(s)&&s.mu===i&&matrix(s.coordinates,2,1)&&scalar(s.normBefore)&&scalar(s.normAfter)&&scalar(s.swapExpectation)&&s.newCopyProbabilities?.length===2&&s.newCopyProbabilities.every(scalar)&&scalar(s.physicalSwapProbabilities?.plus)&&scalar(s.physicalSwapProbabilities?.minus)))return{status:'invalid'};
 for(let i=0;i<64;i++)for(let mu=0;mu<8;mu++)if(f.productStates.exact[i][mu]!==r.pairs[mu].s.vector.exact[i][0]||f.productStates.exact[i][mu]!==f.reconstructed.exact[i][mu]||!same(f.productStates.numeric[i][mu],f.reconstructed.numeric[i][mu]))return{status:'invalid'};
 if(!record(r.projector)||r.projector.dimension!==64||r.projector.rank!==16||!sparse(r.projector.canonical,64,64)||!sparse(r.projector.transformed,64,64)||!same(r.projector.canonical,r.projector.transformed))return{status:'invalid'};
 if(!Array.isArray(r.checks)||r.checks.length<8||!r.checks.every(k=>record(k)&&text(k.id)&&k.passed===true&&zero(k.residual)))return{status:'invalid'};
 if(r.generators?.length!==8||new Set(r.generators.map(g=>g?.id)).size!==8||!r.generators.every(g=>text(g.id)&&matrix(g.standard,16,16)&&zero(g.canonicalResidual)&&zero(g.rotatedResidual)&&zero(g.standardUnchangedResidual)))return{status:'invalid'};
 if(!record(bad)||!r.pairs[bad.mu]||!same(bad.pattern,r.pairs[bad.mu].pattern)||bad.canonicalColumn!==r.pairs[bad.mu].s.canonicalColumn||!matrix(bad.Q,16,16)||!matrix(bad.embedding,64,16)||!zero(bad.orthogonalityResidual)||!zero(bad.projectorResidual)||!sparse(bad.oldE12Residual,64,16)||!positive(bad.oldE12MaxAbs)||bad.generators?.length!==8||!bad.generators.every(g=>text(g.id)&&matrix(g.transformed,16,16)&&scalar(g.oldResidual)&&zero(g.repairedResidual))||!Array.isArray(bad.notes)||!bad.notes.every(text))return{status:'invalid'};
 if(r.steps?.length!==5||!r.steps.every((s,i)=>record(s)&&s.stage===i+1&&text(s.title)&&text(s.text))||!Array.isArray(r.notes)||!r.notes.every(text)||!Array.isArray(r.sources)||!r.sources.every(s=>record(s)&&text(s.title)&&typeof s.url==='string'&&/^https:\/\//.test(s.url)))return{status:'invalid'};
 return{status:'available',result:r};
}
export function su3CopyModel(result){try{return checkedModel(result);}catch{return{status:'invalid'};}}
const math=(pack,inline=false)=>'<'+(inline?'span':'div')+' class="s3c-math'+(inline?' s3c-inline':'')+'"'+(inline?'':' tabindex="0"')+'>'+mathHTML(pack.latex,!inline)+'</'+(inline?'span':'div')+'>';
// Replace only one complete, returned expression inside explanatory prose.
// No expression is parsed or evaluated, and all surrounding text is escaped.
function proseWithPack(source,exactText,pack){
 const value=String(source),at=typeof exactText==='string'&&exactText.length?value.indexOf(exactText):-1;
 return at<0?esc(value):esc(value.slice(0,at))+math(pack,true)+esc(value.slice(at+exactText.length));
}
function stageProse(r,stage,mu){
 const source=r.steps[stage-1].text;
 if(stage===4){const coordinates=r.fixed.states[mu].coordinates,tuple='('+coordinates.exact.map(row=>row[0]).join(', ')+')';return proseWithPack(source,tuple,coordinates);}
 if(stage===5)return proseWithPack(source,r.counterexample.oldE12MaxAbs.exact,r.counterexample.oldE12MaxAbs);
 return esc(source);
}
const formula=tex=>'<div class="s3c-math" tabindex="0">'+mathHTML(tex,true)+'</div>';
const table=(caption,heads,rows,extra='')=>'<div class="s3c-scroll" tabindex="0" role="region" aria-label="'+esc(caption)+'"><table'+(extra?' class="'+esc(extra)+'"':'')+'><caption>'+esc(caption)+'</caption><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((cell,i)=>'<'+(i?'td':'th scope="row"')+'>'+cell+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</tbody></table></div>';
const select=(name,label,options,value)=>'<label for="s3c-'+name+'">'+esc(label)+'</label><select id="s3c-'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select>';
const pattern=p=>'['+p[0]+', '+p[1]+'; '+p[2]+']';
const returnedLabel=p=>'μ='+p.mu+' · GT '+pattern(p.pattern)+' · h=('+p.weight.join(', ')+')';
function termButton(t,kind,selection){const selected=selection?.kind===kind&&selection?.productIndex===t.productIndex;return'<button type="button" class="s3c-term-button'+(selected?' s3c-selected':'')+'" data-s3c-term="'+kind+'-'+t.productIndex+'" aria-pressed="'+selected+'">('+t.leftIndex+', '+t.rightIndex+')</button>';}
function amplitudeTable(column,kind,selection){
 const terms=new Map(column.terms.map(t=>[t.productIndex,t])),selected=column.terms.find(t=>selection?.kind===kind&&t.productIndex===selection?.productIndex);
 const rows=Array.from({length:8},(_,i)=>[esc(i),...Array.from({length:8},(_,j)=>{
  const t=terms.get(i*8+j);if(!t)return'<span class="s3c-exact" data-math-ignore>'+esc(column.amplitudeMatrix.exact[i][j])+'</span>';
  const chosen=selected?.productIndex===t.productIndex,partner=selected&&selected.leftIndex===j&&selected.rightIndex===i;
  return'<button type="button" class="'+(chosen?'s3c-selected':partner?'s3c-partner':'')+'" data-s3c-term="'+kind+'-'+t.productIndex+'" aria-label="'+esc('选择乘积项 ('+i+', '+j+')')+'">'+math(t.coefficient,true)+'</button>';
 })]);
 return table(kind==='s'?'8s：左指标为行、右指标为列':'8a：左指标为行、右指标为列',['i / j',...Array.from({length:8},(_,i)=>String(i))],rows,'s3c-matrix');
}
function derivedColumnsHTML(r,mu,details){
 const content=details.derived?table('当前 μ 的两条新副本列：精确非零项',['乘积 GT 基矢','新副本 α′=1','新副本 α′=2'],r.rotation.embedding.exact.map((row,i)=>[esc(r.canonical.reply.productBasis[i].label),'<code class="s3c-exact" data-math-ignore>'+esc(row[mu])+'</code>','<code class="s3c-exact" data-math-ignore>'+esc(row[r.dimensions.inner+mu])+'</code>']).filter((row,i)=>r.rotation.embedding.exact[i][mu]!=='0'||r.rotation.embedding.exact[i][r.dimensions.inner+mu]!=='0')):'<p>展开后比较本次返回的两条新嵌入列；这些列以 α′ 标记。</p>';
 return'<details data-s3c-native="derived"'+(details.derived?' open':'')+'><summary>比较当前 μ 的两条新副本列</summary>'+content+'</details>';
}
function stageHTML(r,stage,mu,selection,details){
 const p=r.pairs[mu],s=r.steps[stage-1],start='<section class="s3c-stage"><h4>'+esc(s.title)+'</h4><p data-s3c-narrative="stage-'+stage+'">'+stageProse(r,stage,mu)+'</p>';
 if(stage===1)return start+table('同一个 μ 的两份八重态嵌入',['类型 (p,q)','副本 α','内部 μ / GT','权','I','原 CG 全局列'],['s','a'].map(k=>[esc('(1,1)'),esc(p[k].copy+' · 8'+k),esc('μ='+p.mu+' · '+pattern(p.pattern)),esc('('+p.weight.join(', ')+')'),math(p.I,true),esc(p[k].canonicalColumn)]))+'<p>完整标签保留表示类型、外重数副本 α 和内部态 μ。一个八重态内的两个零权态仍是两个不同的 μ；两份八重态共保留四条零权列。</p>'+table('维度分别数什么',['计数对象','维度'],[['整个乘积空间',64],['一个八重态的内部空间',8],['八重态的副本空间',2],['两份八重态的等型分量',16]].map(row=>row.map(esc)))+'</section>';
 if(stage===2){
  const chosen=['s','a'].includes(selection?.kind)?selection.kind:'s',term=p[chosen].terms.find(t=>t.productIndex===selection?.productIndex)||p[chosen].terms[0],partner=p[chosen].terms.find(t=>t.leftIndex===term.rightIndex&&t.rightIndex===term.leftIndex);
  return start+formula(String.raw`C_{s,\mu},C_{a,\mu}\in\mathbb C^{64},\qquad A_{ij}=C_{8i+j},\qquad P_{12}:A\mapsto A^{\mathsf T}`)+'<p>点击任一非零项，检查已返回的 (i,j) 与 (j,i)；选择只浏览本次结果，不启动 Python。</p><div class="s3c-pair">'+['s','a'].map(k=>'<div class="s3c-card"><h5>'+esc(k==='s'?'8s：交换对称':'8a：交换反对称')+'</h5>'+table('真实 64 维列的全部非零项',['乘积指标 (i,j)','乘积 GT 基矢','精确系数'],p[k].terms.map(t=>[termButton(t,k,selection),esc(t.label),math(t.coefficient,true)]))+'<details data-s3c-native="amplitude-'+k+'"'+(details['amplitude-'+k]?' open':'')+'><summary>展开 8×8 乘积振幅矩阵</summary>'+amplitudeTable(p[k],k,selection)+'</details><details data-s3c-native="vector-'+k+'"'+(details['vector-'+k]?' open':'')+'><summary>展开完整 64 维列</summary>'+(details['vector-'+k]?math(p[k].vector):'<p>展开后显示本次返回的完整列。</p>')+'</details></div>').join('')+'</div><div class="s3c-match" role="status"><p>'+esc('当前配对：8'+chosen+' · ('+term.leftIndex+', '+term.rightIndex+') ↔ ('+partner.leftIndex+', '+partner.rightIndex+')')+'</p>'+math(term.coefficient,true)+' ↔ '+math(partner.coefficient,true)+'<p>比较同号或异号，核对转置宇称；内积与范数由 Python 精确核验。</p></div></section>';
 }
 if(stage===3)return start+formula(String.raw`R=R_\theta\operatorname{diag}(1,\zeta),\quad U=R\otimes I_8,\quad C_8^{\prime}=C_8U`)+'<p>同一个 R 一致作用于全部八个内部态。新副本标签是 α′，混合后的列不再沿用 8s、8a 的确定交换宇称。</p>'+math(r.rotation.R)+table('全部内部态使用同一副本变换',['内部 μ / GT','8s 原列','8a 原列'],r.pairs.map(pair=>[esc(returnedLabel(pair)),esc(pair.s.canonicalColumn),esc(pair.a.canonicalColumn)]))+table('八个生成元的一致性',['生成元','原嵌入交织残差','新嵌入交织残差','标准生成元变化残差'],r.generators.map(g=>[esc(g.id),math(g.canonicalResidual,true),math(g.rotatedResidual,true),math(g.standardUnchangedResidual,true)]))+derivedColumnsHTML(r,mu,details)+'<details data-s3c-native="unitary"'+(details.unitary?' open':'')+'><summary>展开返回的 16×16 变换 U</summary>'+(details.unitary?math(r.rotation.U):'<p>展开后显示副本空间与内部空间的直积顺序。</p>')+'</details></section>';
 if(stage===4){const f=r.fixed.states[mu];return start+formula(String.raw`b^{\prime}=U^\dagger b,\quad P^{\prime}=U^\dagger P U,\quad C_8^{\prime}b^{\prime}=C_8b`)+'<p>固定的物理态始终是原来的 |8s,μ⟩。这里改变基底与坐标，不是时间演化或发生跃迁。</p><div class="s3c-pair"><div class="s3c-card"><h5>固定态在新副本基底中的两个坐标</h5>'+math(f.coordinates)+'<h5>新的交换矩阵（固定 μ）</h5>'+math(r.rotation.exchangePair)+'</div><div class="s3c-card">'+table('两类概率必须分开解释',['量','精确值'],[['新副本坐标概率 α′=1',f.newCopyProbabilities[0]],['新副本坐标概率 α′=2',f.newCopyProbabilities[1]],['物理交换 +1 概率',f.physicalSwapProbabilities.plus],['物理交换 −1 概率',f.physicalSwapProbabilities.minus],['交换期望',f.swapExpectation],['换基前范数平方',f.normBefore],['换基后范数平方',f.normAfter]].map(([label,v])=>[esc(label),math(v,true)]))+'</div></div><p>新坐标的第二个分量不等于交换 −1 的测量概率；测量概率须连同变换后的交换算符一起解释。乘积空间的物理态、等型投影与交换期望保持不变。</p><details data-s3c-native="fixed"'+(details.fixed?' open':'')+'><summary>核对当前 μ 的乘积态重建</summary>'+table('已返回的两组乘积振幅逐项相同',['乘积行','原物理振幅','重建振幅'],r.fixed.productStates.exact.map((row,i)=>[esc(i),'<span class="s3c-exact" data-math-ignore>'+esc(row[mu])+'</span>','<span class="s3c-exact" data-math-ignore>'+esc(r.fixed.reconstructed.exact[i][mu])+'</span>']).filter((row,i)=>r.fixed.productStates.exact[i][mu]!=='0'))+'</details></section>';}
 const bad=r.counterexample;
 return start+'<p>'+esc('仅改号的内部态：μ='+bad.mu+' · GT '+pattern(bad.pattern)+' · 原 8s 列 '+bad.canonicalColumn)+'</p>'+table('幺正不等于沿用旧标准生成元',['副本换基核验项目','精确残差'],[['列正交性',bad.orthogonalityResidual],['等型投影',bad.projectorResidual],['沿用旧 E₁₂ 的最大交织残差',bad.oldE12MaxAbs]].map(([label,v])=>[esc(label),math(v,true)]))+formula(String.raw`D^{\prime}=Q^\dagger DQ`)+table('同时变换目标生成元后恢复交织',['生成元','保留旧 D 的残差','使用新 D′ 的残差'],bad.generators.map(g=>[esc(g.id),math(g.oldResidual,true),math(g.repairedResidual,true)]))+'<p>改号后的基底仍合法。错误在于改了基底，却继续声称未变的标准 GT 生成元与相位约定仍然适用。</p>'+bad.notes.map((n,i)=>'<p data-s3c-narrative="counterexample-'+i+'">'+proseWithPack(n,bad.oldE12MaxAbs.exact,bad.oldE12MaxAbs)+'</p>').join('')+'</section>';
}
export function su3CopyResultHTML(result,{stage=1,mu=3,term=null,details={}}={}){
 if(su3CopyModel(result).status!=='available')return'<p class="notice error" role="alert">返回的副本换基数据不完整；请保留草稿后重试。</p>';
 const index=Number.isInteger(mu)&&result.pairs[mu]?mu:result.pairs[0].mu,count=Number.isInteger(stage)?Math.max(1,Math.min(5,stage)):1;
 return Array.from({length:count},(_,i)=>stageHTML(result,i+1,index,term,details)).join('');
}
const opened=node=>typeof node.open==='boolean'?node.open:node.getAttribute('open')!==null;
const questions=[['labels','只用权 (0,0)，能唯一选出一条八重态 CG 列吗？','能，同权就是同态','不能，还须 α 与完整 μ 标签'],['probability','新坐标第二项的概率就是交换 −1 的概率吗？','是，第二项就是反对称态','否，交换算符也必须一起变换'],['sign','只改一列的符号后，旧标准生成元一定仍然适用吗？','是，列正交就足够','否，还要检查交织并一致变换生成元']];
const feedback={labels:{right:'同权不等于同态。先固定表示类型，再保留外重数 α 和完整内部 μ；两个零权态不能合并。',wrong:'权只给出 Cartan 本征值。在这两份八重态中，零权共有四条列，仍须区分 α 和 μ。'},probability:{right:'坐标概率依赖副本基底；交换概率由物理态与交换算符共同决定。固定的原 8s 态仍有确定的 +1 交换宇称。',wrong:'混合后的新副本列不再是确定的 s/a 本征列。先写 P′，再解释测量概率。'},sign:{right:'单列改号保留正交性，但需要 D′=Q†DQ 才能继续正确交织；这不是非法基底。',wrong:'正交性只检验内积。还须检验群作用与目标生成元是否使用同一个基底。'}};
export function bindSu3CopyLesson({root,lessonId='su3-cg-change-basis',stateStore,isCurrent=()=>true,run,cancelRun,download}={}){
 const body=root?.querySelector('[data-su3-copy-body]');if(!body||!LESSONS.includes(lessonId))return()=>{};
 const store=stateStore?.get&&stateStore?.set?stateStore:new Map(),key='copy-panel:'+lessonId,saved=store.get(key),state=record(saved)?clone(saved):{};
 state.raw={angle:'45',phase:'1',...(record(state.raw)?state.raw:{})};state.stage=Number.isInteger(state.stage)&&state.stage>=1&&state.stage<=5?state.stage:1;state.mu=Number.isInteger(state.mu)&&state.mu>=0&&state.mu<8?state.mu:3;state.note=typeof state.note==='string'?state.note:'';
 for(const name of ['predictions','checked','details'])if(!record(state[name]))state[name]={};
 if(state.result&&(su3CopyModel(state.result).status!=='available'||identity(state.input)!==identity(state.result.request))){state.result=null;state.input=null;}
 const owner={};owners.set(body,owner);let alive=true,ticket=0,busy=false,pending=null;
 const $=name=>body.querySelector('#s3c-'+name),active=()=>alive&&isCurrent()&&body.isConnected!==false&&owners.get(body)===owner;
 const save=()=>{if(active())store.set(key,clone(state));};
 function capture(){if(!active())return;for(const d of body.querySelectorAll('[data-s3c-native]'))state.details[d.dataset.s3cNative]=opened(d);if($('note'))state.note=$('note').value;save();}
 function cancelOwned(fallback){const task=pending;pending=null;if(task&&typeof task.cancel==='function')return task.cancel();if(task&&fallback&&active()&&typeof cancelRun==='function'){cancelRun();return true;}return false;}
 const bind=(name,event,handler)=>{const node=$(name);if(node)node[event]=e=>{if(!active()||$(name)!==node||node.disabled)return;capture();const value=handler(node,e);save();return value;};};
 function retire(){ticket++;if(busy)cancelOwned(true);busy=false;state.result=null;state.input=null;state.stage=1;state.term=null;state.error='';save();}
 function draw(){
  if(!active())return;capture();
  body.innerHTML='<div class="s3c-workshop"><h4>同一个内部态的两份嵌入：副本换基工坊</h4><p>固定 8⊗8，先配对真实 CG 列，再同时变换副本基底、态坐标与交换算符。选择角度、相位或已有 μ 都不会自动计算。</p><form id="s3c-form"><fieldset id="s3c-fieldset"'+(busy?' disabled':'')+'><legend>有限精确预设；所有符号计算由浏览器 Python 返回</legend><div class="s3c-controls"><div>'+select('angle','副本旋转角 θ',ANGLES.map(a=>[a,a+'°']),state.raw.angle)+'</div><div>'+select('phase','第二列相位 ζ',PHASES.map(p=>[p,p]),state.raw.phase)+'</div></div><p>约定顺序是 R = Rθ diag(1,ζ)。改动预设会收起旧结果；请手动运行。首次构造精确 64 维 CG 矩阵可能需要稍候。</p><button class="primary" type="submit" id="s3c-run">'+(busy?'Python 计算中…':'手动计算副本换基 →')+'</button></fieldset><button class="secondary" type="button" id="s3c-cancel"'+(busy?'':' hidden')+'>取消本工坊计算</button></form><p class="notice error" id="s3c-error" role="alert"'+(state.error?'':' hidden')+'>'+esc(state.error)+'</p><section class="s3c-predictions"><h4>先预测，再用精确结果解释</h4>'+questions.map(([name,label,wrong,right])=>'<div>'+select('predict-'+name,label,[['','尚未选择'],['wrong',wrong],['right',right]],state.predictions[name]||'')+'<button class="secondary" type="button" id="s3c-check-'+name+'">核对判断</button><p id="s3c-feedback-'+name+'" role="status">'+esc(state.checked[name]?(state.predictions[name]?feedback[name][state.predictions[name]==='right'?'right':'wrong']:'请先选择一个判断。'):'')+'</p></div>').join('')+'</section><div id="s3c-result"></div><label for="s3c-note">我的标签配对、预测与换基解释（仅页面内存）</label><textarea id="s3c-note" rows="3">'+esc(state.note)+'</textarea><p class="s3c-muted">本工坊不修改原 CG 规范、输入或导出；这里的预测与笔记不写入课程成绩。</p><p><a href="docs/su3-copy.md">方法、基序与副本换基约定 ↗</a></p></div>';
  const form=$('form');form.onsubmit=e=>{e.preventDefault();if(active()&&$('form')===form&&!busy)return calculate();};
  for(const name of ['angle','phase'])bind(name,'onchange',node=>{state.raw[name]=node.value;retire();draw();});
  bind('note','oninput',node=>{state.note=node.value;});
  for(const [name] of questions){bind('predict-'+name,'onchange',node=>{state.predictions[name]=node.value;state.checked[name]=false;$('feedback-'+name).textContent='';});bind('check-'+name,'onclick',()=>{state.checked[name]=true;$('feedback-'+name).textContent=state.predictions[name]?feedback[name][state.predictions[name]==='right'?'right':'wrong']:'请先选择一个判断。';});}
  bind('cancel','onclick',()=>{if(!busy)return;ticket++;cancelOwned(true);busy=false;state.error='本工坊计算已取消；草稿已保留，可重新运行。';draw();});drawResult();save();
 }
 async function calculate(){
  if(!active()||busy)return;let input;try{input=su3CopyRequest(state.raw);}catch(error){state.error=String(error.message);state.result=null;state.input=null;draw();return;}
  const job=++ticket;busy=true;state.error='';state.result=null;state.input=null;state.stage=1;state.term=null;draw();
  try{if(typeof run!=='function')throw Error('Python 计算接口暂不可用，请重新打开课程。');const task=run('teaching_labs',input);pending=task;const result=await task;if(!active()||job!==ticket)return;if(su3CopyModel(result).status!=='available'||identity(result.request)!==identity(input))throw Error('返回的完整标签、精确矩阵或输入身份不一致；请保留草稿后重试。');state.result=result;state.input=clone(input);}
  catch(error){if(active()&&job===ticket)state.error=String(error?.message||'本次计算未完成，请重试。');}
  finally{if(active()&&job===ticket){pending=null;busy=false;draw();}}
 }
 function drawResult(){
  const target=$('result');if(!active()||!target)return;
  if(!state.result){target.innerHTML=busy?'<p role="status">正在构造两份八重态的全部内部态与精确换基结果；不会只计算当前显示的一对。</p>':'<p>尚未计算；打开工坊、填写预设和预测都不会启动 Python。</p>';return;}
  const r=state.result;if(!r.pairs[state.mu])state.mu=r.pairs[0].mu;
  target.innerHTML=select('mu','选择本次已返回的完整内部 μ',r.pairs.map(p=>[p.mu,returnedLabel(p)]),state.mu)+'<p>选择 μ 只浏览已返回的全部八对数据，不改变输入，也不重新计算。</p><div class="s3c-stage-controls"><button class="secondary" type="button" id="s3c-next"'+(state.stage>=5?' disabled':'')+'>展开下一步</button><button class="secondary" type="button" id="s3c-first">回到第一步</button><span id="s3c-stage-status" role="status">副本换基步骤 '+state.stage+' / 5 步</span></div>'+su3CopyResultHTML(r,state)+'<details data-s3c-native="checks"'+(state.details.checks?' open':'')+'><summary>核验、约定与来源</summary><ul class="s3c-checks">'+r.checks.map(c=>'<li>'+esc(c.id)+'：'+math(c.residual,true)+' <span class="s3c-pass">本项核验通过</span></li>').join('')+'</ul><p>'+esc(r.rotation.order)+'</p>'+r.notes.map(n=>'<p>'+esc(n)+'</p>').join('')+'<ul>'+r.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ul></details>'+(typeof download==='function'?'<button class="secondary" type="button" id="s3c-export">独立导出原 CG 回包与本工坊精确结果</button>':'');
  bind('next','onclick',()=>{state.stage=Math.min(5,state.stage+1);drawResult();});bind('first','onclick',()=>{state.stage=1;drawResult();});
  bind('mu','onchange',node=>{const i=Number(node.value);if(Number.isInteger(i)&&r.pairs[i]){state.mu=i;state.term=null;drawResult();}});
  for(const node of target.querySelectorAll('[data-s3c-term]'))node.onclick=()=>{if(!active()||$('result')!==target||state.result!==r||node.isConnected===false||!Array.from(target.querySelectorAll('[data-s3c-term]')).includes(node))return;capture();const [kind,index]=node.dataset.s3cTerm.split('-'),productIndex=Number(index);if(!['s','a'].includes(kind)||!r.pairs[state.mu][kind].terms.some(t=>t.productIndex===productIndex))return;state.term={kind,productIndex};drawResult();save();};
  for(const d of target.querySelectorAll('[data-s3c-native]')){d.open=!!state.details[d.dataset.s3cNative];d.ontoggle=()=>{if(!active()||$('result')!==target||state.result!==r||!Array.from(target.querySelectorAll('[data-s3c-native]')).includes(d))return;const name=d.dataset.s3cNative,was=!!state.details[name],now=opened(d);capture();state.details[name]=now;save();if(was!==now&&['unitary','derived','vector-s','vector-a'].includes(name))drawResult();};}
  bind('export','onclick',()=>{if(state.result===r&&state.input)download(JSON.stringify({kind:'su3-copy-teaching',input:state.input,result:r},null,2),'su3-copy-'+state.input.angle+'-'+state.input.phase.replace('-','minus')+'.json','application/json');});
 }
 draw();const cleanup=()=>{if(!alive)return;const own=owners.get(body)===owner;capture();if(busy)cancelOwned(active());busy=false;ticket++;alive=false;if(own){for(const tag of ['select','textarea','button','form','details'])for(const node of body.querySelectorAll(tag))for(const event of ['onclick','onchange','oninput','onsubmit','ontoggle'])node[event]=null;owners.delete(body);}};cleanup.snapshot=()=>{capture();return clone(state);};return cleanup;
}
