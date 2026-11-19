import {crystalSpan} from './crystal-notation.js?v=20261111-demos1';

const sameHandBasis = [[1,0,0],[0,1,0],[0,0,1]];
const reversedHandBasis = [[-1,0,0],[0,-1,0],[0,0,-1]];

export function handednessExample(example) {
 if(!['positive','both','control'].includes(example))return null;
 const control=example==='control';
 return {
  action:'compare',
  left:{group_number:control?207:212},
  right:{group_number:control?207:213},
  bases:structuredClone([sameHandBasis,reversedHandBasis]),
  positive_only:example!=='both'
 };
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
