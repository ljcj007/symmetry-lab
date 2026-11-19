import {crystalSpan} from './crystal-notation.js?v=20261111-demos1';

const sameHandBasis = [[1,0,0],[0,1,0],[0,0,1]];
const reversedHandBasis = [[-1,0,0],[0,-1,0],[0,0,-1]];

function compareRequest(left,right,positive_only){
 return {
  action:'compare',
  left:{group_number:left},
  right:{group_number:right},
  bases:structuredClone([sameHandBasis,reversedHandBasis]),
  positive_only
 };
}

export function handednessExample(example){
 if(!['positive','both','control'].includes(example))return null;
 const control=example==='control';
 return compareRequest(control?207:212,control?207:213,example!=='both');
}

export function handednessExerciseHTML(open) {
 return `<details id="crystkit-handedness" class="notice research-intro" ${open?'open':''}>
  <summary>实验：换基会改变空间群的手性吗？</summary>
  <p>空间群 212（${crystalSpan('P4_332','hm')}）和 213（${crystalSpan('P4_132','hm')}）具有相同的旋转点群 432。预测只允许保持取向时，能否用所列基底和原点平移使完整操作集重合。</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-crystkit-hand="positive">212 → 213 · 保持取向</button>
   <button type="button" class="secondary small" data-crystkit-hand="both">212 → 213 · 允许反转取向</button>
   <button type="button" class="secondary small" data-crystkit-hand="control">207 → 207 · 对照</button>
  </div>
  <p>载入会替换当前 JSON。每次载入后手动运行，比较验证状态和基底行列式。搜索只覆盖列出的基底，并对相容原点平移使用精确有理数。</p>
  <p><a href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror">回到手性课堂 →</a> · <a href="docs/frontiers.md#crystkit-handedness">推导步骤与来源 →</a></p>
 </details>`;
}

const quartzCases=[
 ['quartz-positive',152,true,'原始 → 主动镜像 · 保持取向'],
 ['quartz-both',152,false,'原始 → 主动镜像 · 允许反转取向'],
 ['quartz-passive',154,true,'被动换基标准化 · 154 → 154']
];

export function quartzHandednessExample(example){
 const scenario=quartzCases.find(([id])=>id===example);
 return scenario?compareRequest(154,scenario[1],scenario[2]):null;
}

export function quartzHandednessHTML(open){
 return `<details id="crystkit-quartz-handedness" class="notice research-intro" ${open?'open':''}>
  <summary>石英的主动镜像与被动换基</summary>
  <p>对照原始 α-石英、主动镜像和被动换基的标准化结果。此处按空间群编号从固定目录取完整操作集。</p>
  <p>原始与被动换基标准化 · 154 (${crystalSpan('P3_221','hm')})<br>主动镜像 · 152 (${crystalSpan('P3_121','hm')})</p>
  <div class="controls-row">${quartzCases.map(([id,,,label])=>`<button type="button" class="secondary small" data-crystkit-hand="${id}">${label}</button>`).join('')}</div>
  <p>先预测哪些候选基底能匹配完整操作集。只枚举 I 和 −I，对相容的原点平移作精确检验。载入会替换当前 JSON，随后请手动运行。</p>
  <p><a href="#structure?quartz-hand=practice">回到真实石英结构练习 →</a> · <a href="#classroom/observables?module=chirality&amp;lesson=chiral-mirror">回到手性课堂 →</a></p>
 </details>`;
}

export function affineComparisonHTML(result, payload, {cards,table}) {
 if(result.action!=='compare')return '';
 const verified=result.status==='verified'&&result.identityVerified===true;
 const differentOrders=result.status==='different_quotient_orders';
 const status=verified?'已核验完整操作集':differentOrders?'平移商群阶不同':'所搜索的基底中未找到匹配';
 const orientation=verified?(result.orientationPreserved?'保持取向':'反转取向'):'—';
 const scope=payload?.positive_only?'只允许保持取向':'允许反转取向';
 return `<section aria-labelledby="crystkit-comparison-title">
  <h3 id="crystkit-comparison-title">仿射比较</h3>
  ${cards([['核验结论',status],['搜索取向',scope],['匹配取向',orientation]])}
  ${verified?table(['匹配证据','精确值'],[['基底行列式',result.determinant],['原点平移',result.origin.join(', ')]]) : ''}
  ${!verified&&!differentOrders?'<p>结果仅限本次搜索的基底及其相容原点平移。</p>':''}
 </section>`;
}
