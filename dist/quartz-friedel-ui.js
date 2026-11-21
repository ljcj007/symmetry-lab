import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261122-nextpaths1';

const source = quartzStructureCases.find(example => example.id === 'original');
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const predictions = [
  {id:'contrast', question:'给定这组权重，原始石英的哪一对离轴反射呈现强度差？',
    options:[['110','只有 110 及其反向反射'],['101','只有 101 及其反向反射'],['both','两组都有强度差']]},
  {id:'mirror', question:'保持晶轴不动并反演原子后，110 这组正反强度怎样变化？',
    options:[['same','各方向的强度保持原值'],['swap','两个方向的强度互换'],['zero','两个方向都消光']]},
];
const comparisons = [
  ['real110', '原始结构，实权重', [1,1,0]],
  ['illustrative110', '原始结构，复权重', [1,1,0]],
  ['mirrored110', '固定晶轴，主动反演', [1,1,0]],
  ['illustrative101', '离轴等强对照', [1,0,1]],
  ['illustrative001', '轴向消光对照', [0,0,1]],
  ['illustrative003', '轴向允许对照', [0,0,3]],
];

export function quartzFriedelHTML({open=false}={}) {
  return `<details class="sc-worked" data-quartz-friedel${open?' open':''}>
    <summary>进阶练习 · 复权重与弗里德尔对</summary>
    <p>比较同一晶胞中的正向反射与三个指数同时反号的反射。实权重时两者等强。现在用示意的复数权重 ${math('f_{\\mathrm{Si}}=14+i,\\quad f_{\\mathrm{O}}=8')}，保留上一题的 298 K 石英坐标。</p>
    <form data-qf-form>
      ${predictions.map(({id,question,options})=>`<div>
        <label for="qf-${id}">${question}</label>
        <select id="qf-${id}"><option value="">请选择</option>
          ${options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}
        </select></div>`).join('')}
      <div class="sc-actions">
        <button type="submit" class="primary" data-qf-run>读取原始 CIF 并比较正反强度</button>
        <button type="button" class="secondary" data-qf-cancel hidden>取消核对</button>
      </div>
    </form>
    <p data-qf-status role="status"></p><div data-qf-result></div>
    <p>本题使用恒定标量权重，比较运动学强度。已发表的石英共振实验研究了圆偏振与螺旋轴的耦合，涉及能量与偏振相关的响应。<a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">弗里德尔定律 ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.100.145502" target="_blank" rel="noreferrer">石英共振衍射实验 ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.108.019901" target="_blank" rel="noreferrer">实验论文勘误 ↗</a></p>
  </details>`;
}

function checkedComparisons(result) {
  const received = result?.source, weights = result?.weights;
  const rowMatches = (row, hkl) => row?.hkl?.length === 3
    && hkl.every((value,index)=>row.hkl[index]===value)
    && Number.isFinite(row.intensity) && row.intensity >= 0;
  const pairMatches = (pair,hkl) => rowMatches(pair?.forward,hkl) && rowMatches(pair?.reverse,hkl.map(value=>-value))
    && Number.isFinite(pair.intensityDifference) && Number.isFinite(pair.intensitySum)
    && (pair.intensitySum > 0 ? Number.isFinite(pair.normalizedContrast) && Math.abs(pair.normalizedContrast) <= 1
      : pair.intensitySum===0 && pair.normalizedContrast===null);
  if(result?.schemaVersion!==1 || result?.model!=='kinematic-constant-scalar' || result.atomCount!==9 ||
    received?.filename!==source.filename || received.sha256!==source.sha256 || received.byteCount!==source.byteCount ||
    weights?.real?.Si!==14 || weights?.real?.O!==8 || weights?.illustrative?.Si?.re!==14 ||
    weights?.illustrative?.Si?.im!==1 || weights?.illustrative?.O!==8 ||
    !comparisons.every(([id,,hkl])=>pairMatches(result.comparisons?.[id],hkl))) {
    throw new Error('Unexpected quartz Friedel comparison');
  }
  return result.comparisons;
}

function resultHTML(values, contrast, mirror) {
  const format = (value, digits=3) => Math.abs(value) < .5 * 10**-digits ? '0' : value.toFixed(digits);
  const tableTitle = '石英弗里德尔对的强度对照';
  return `<p class="sc-example-result">${contrast==='110' ? '强度差预测正确。' : '对照 110 和 101 两行，在这一组权重下只有 110 呈现强度差。'}</p>
    <p class="sc-example-result">${mirror==='swap' ? '反演预测正确。' : '对照两行 110 复权重结果，固定晶轴反演会互换两个方向的强度。'}</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${tableTitle}">
      <table><caption class="sr-only">${tableTitle}</caption>
        <thead><tr><th scope="col">结构或对照</th><th scope="col">给定反射</th>
          <th scope="col">${math('I_{\\mathbf h}')}</th><th scope="col">${math('I_{-\\mathbf h}')}</th>
          <th scope="col">强度差</th><th scope="col">归一化差</th></tr></thead>
        <tbody>${comparisons.map(([id,label,hkl])=>{
          const pair = values[id];
          const relative = pair.normalizedContrast===null ? '—' : format(100*pair.normalizedContrast,2)+'%';
          return `<tr data-qf-case="${id}"><th scope="row">${label}</th><td>${math('('+hkl.join('')+')')}</td>
            <td>${format(pair.forward.intensity)}</td><td>${format(pair.reverse.intensity)}</td>
            <td>${format(pair.intensityDifference)}</td><td>${relative}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>
    <p>归一化差为 ${math('(I_{\\mathbf h}-I_{-\\mathbf h})/(I_{\\mathbf h}+I_{-\\mathbf h})')}。001 的两个方向都消光，分母为零。003 允许且等强。在同一晶胞和波长下，这些正反反射共用衍射角，合并到粉末棒峰时要相加强度。</p>
    <details><summary>展开强度差的相位来源</summary>
      <p>用几何相位和 ${math('S_a(\\mathbf h)')} 记录某种元素 ${math('a')} 的坐标贡献。反向时这一相位和取共轭，散射权重仍取同一个值。展开模平方得到</p>
      <p>${math('I_{\\mathbf h}-I_{-\\mathbf h}=-4\\,\\Im(f_{\\mathrm{Si}}f_{\\mathrm{O}}^{*})\\,\\Im(S_{\\mathrm{Si}}S_{\\mathrm{O}}^{*})')}。</p>
      <p>两种元素的相对散射相位和相对几何相位共同决定强度差。本例 101 的两个几何相位和共线，所以改用复权重后依然等强。</p>
    </details>`;
}

export function bindQuartzFriedel(host, {run, isCurrent=()=>true, fetchSource=(...args)=>fetch(...args)}) {
  const find = selector=>host.querySelector(selector);
  const form=find('[data-qf-form]'), submit=find('[data-qf-run]'), cancel=find('[data-qf-cancel]');
  const status=find('[data-qf-status]'), output=find('[data-qf-result]');
  const choices = predictions.map(({id,options})=>({select:find('#qf-'+id),options}));
  let active=null, disposed=false;
  const owned = request=>!disposed && active===request && isCurrent();
  const current = request=>owned(request) && host.open;

  function clear(message) {
    const previous = active;
    active=null;
    previous?.controller.abort();
    previous?.task?.cancel?.();
    submit.disabled=false;
    cancel.hidden=true;
    status.textContent=message;
    output.innerHTML='';
  }

  for(const {select} of choices) select.onchange=()=>{
    if(!disposed && isCurrent()) clear('预测已更改，可以再次核对。');
  };
  host.ontoggle=()=>{
    if(!host.open && active && !disposed && isCurrent()) clear('');
  };
  cancel.onclick=()=>{
    if(!disposed && isCurrent()) {
      clear('核对已取消。');
      submit.focus();
    }
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    if(disposed || active || !host.open || !isCurrent()) return;
    const unanswered=choices.find(({select,options})=>!options.some(([value])=>value===select.value));
    if(unanswered) {
      status.textContent='请先完成两项弗里德尔对预测。';
      unanswered.select.focus();
      return;
    }
    const [contrast,mirror]=choices.map(({select})=>select.value);
    const request={controller:new AbortController(),task:null};
    active=request;
    output.innerHTML='';
    submit.disabled=true;
    cancel.hidden=false;
    status.textContent='正在读取 298 K 原始 CIF…';
    try {
      const response=await fetchSource(source.url,{signal:request.controller.signal});
      if(!response.ok) throw new Error('CIF fetch failed');
      const bytes=await response.arrayBuffer();
      if(!current(request)) return;
      if(bytes.byteLength!==source.byteCount) throw new Error('CIF byte count changed');
      const content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      status.textContent='正在比较弗里德尔对与反演对照…';
      request.task=run('quartz_friedel',{content});
      const result=await request.task;
      if(!current(request)) return;
      output.innerHTML=resultHTML(checkedComparisons(result),contrast,mirror);
      status.textContent='已完成弗里德尔对核对。';
    } catch {
      if(current(request)) status.textContent='弗里德尔对计算暂未完成。可以重新读取并计算。';
    } finally {
      if(owned(request)) {
        if(!host.open) status.textContent='';
        active=null;
        submit.disabled=false;
        cancel.hidden=true;
      }
    }
  };
  return ()=>{
    disposed=true;
    host.ontoggle=null;
    clear('');
  };
}
