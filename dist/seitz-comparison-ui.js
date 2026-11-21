import {crystalSpan} from './crystal-notation.js?v=20261110-en1';
import {mathHTML} from './math-display.js?v=20261113-prose2';

const models = [
  {id: 'rotation4', symbol: 'P 4'},
  {id: 'screw41', symbol: 'P 4₁'},
  {id: 'screw43', symbol: 'P 4₃'}
];
const point = [0.2, 0.3, 0.1];
const symbol = model => crystalSpan(model.symbol, 'hm');
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function resultTable(label, headers, rows) {
  return `<div class="sq-scroll" tabindex="0" role="region" aria-label="${escape(label)}">
    <table><caption class="sr-only">${escape(label)}</caption><thead><tr>${headers.map(header =>
      `<th scope="col">${escape(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(({id, heading, values}) =>
      `<tr data-seitz-row="${escape(id)}"><th scope="row">${heading}</th>${values.map(value =>
        `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function seitzComparisonHTML() {
  return `<section class="sc-worked" id="sc-seitz-comparison" aria-labelledby="sc-seitz-comparison-title">
    <h3 id="sc-seitz-comparison-title">四重旋转与螺旋对照</h3>
    <p>${models.map(symbol).join(' · ')}</p>
    <p>从同一个分数坐标出发，每次绕 z 轴转 +90°。连续作用四次后，哪些操作会把点送到另一个晶胞？先预测，再用这三个空间群的代表操作核对。</p>
    <p>${math('r=(' + point.join(',') + ')')}</p>
    <form id="sc-seitz-comparison-form">
      <label>沿轴的波矢（倒易分数坐标） ${math('k_z')}
        <input id="sc-seitz-comparison-k" type="number" step="any" value="0.25" required></label>
      <div class="sc-actions">
        <button id="sc-seitz-comparison-run" type="submit" class="primary">计算三种四重操作</button>
        <button id="sc-seitz-comparison-cancel" type="button" class="secondary" hidden>取消对照</button>
      </div>
    </form>
    <p id="sc-seitz-comparison-status" class="sc-small" role="status"></p>
    <div id="sc-seitz-comparison-result"></div>
  </section>`;
}

export function bindSeitzComparison(host, {run, isCurrent, formatNumber, formatComplex}) {
  const form = host.querySelector('#sc-seitz-comparison-form');
  const input = host.querySelector('#sc-seitz-comparison-k');
  const submit = host.querySelector('#sc-seitz-comparison-run');
  const cancel = host.querySelector('#sc-seitz-comparison-cancel');
  const status = host.querySelector('#sc-seitz-comparison-status');
  const output = host.querySelector('#sc-seitz-comparison-result');
  let active = null;
  let revision = 0;
  let disposed = false;
  const current = ticket => !disposed && ticket === revision && isCurrent();

  function clearCalculation(message) {
    revision++;
    active?.cancel?.();
    active = null;
    submit.disabled = false;
    cancel.hidden = true;
    output.innerHTML = '';
    status.textContent = message;
  }

  function showResults(results) {
    output.innerHTML = resultTable('四次操作的计算对照',
      ['空间群', '每次沿轴平移', '四次后沿轴平移', '四次后的 Bloch 相位'],
      results.map(({model, result}) => ({id: model.id, heading: symbol(model), values: [
        result.frames[1].translationExact[2], result.frames[4].translationExact[2],
        formatComplex(result.frames[4].blochPhase)
      ]}))) + `<p>四次操作的旋转部分都回到恒等。三个终点折回后与起点重合，整格平移仍会带来相位。</p>
      <p>四次操作的轴向总平移 ${math('L_z')} 对应的相位是 ${math('e^{-2\\pi i k_z L_z}')}。把波矢改为 0 再试一次，看看平移和相位分别怎样变化。</p>
      <p>选择一个模型，逐步比较折回前后的坐标。</p>
      <div class="sc-actions" role="group" aria-label="选择逐步轨迹">${models.map(model =>
        `<button type="button" class="secondary" aria-pressed="false" aria-controls="sc-seitz-comparison-trace"
          data-seitz-detail="${model.id}">${symbol(model)}</button>`).join('')}</div>
      <div id="sc-seitz-comparison-trace" aria-live="polite"></div>`;
    const buttons = [...output.querySelectorAll('[data-seitz-detail]')];
    const trace = output.querySelector('#sc-seitz-comparison-trace');

    function selectModel(selected) {
      for (const button of buttons) {
        const pressed = button.dataset.seitzDetail === selected.model.id;
        button.setAttribute('aria-pressed', pressed);
        button.setAttribute('class', pressed ? 'primary' : 'secondary');
      }
      trace.innerHTML = `<p>${symbol(selected.model)}</p>` + resultTable('沿轴位置的逐步记录',
        ['操作次数', '未折回的轴向坐标', '折回后的轴向坐标'],
        selected.result.frames.map(frame => ({id: frame.step, heading: frame.step, values: [
          formatNumber(frame.unwrapped[2]), formatNumber(frame.wrapped[2])
        ]})));
    }

    for (const [index, button] of buttons.entries()) button.onclick = () => selectModel(results[index]);
    selectModel(results[0]);
  }

  form.oninput = () => clearCalculation('波矢已更改，可以重新计算。');
  cancel.onclick = () => clearCalculation('对照已取消。');
  form.onsubmit = async event => {
    event.preventDefault();
    const kz = Number(input.value);
    if (submit.disabled || !input.value.trim() || !Number.isFinite(kz) || !isCurrent()) return;
    const ticket = ++revision;
    const results = [];
    submit.disabled = true;
    cancel.hidden = false;
    output.innerHTML = '';
    status.textContent = '正在计算三个模型…';
    try {
      for (const model of models) {
        active = run('teaching_labs', {lab: 'seitz', preset: model.id, point: [...point], k: [0, 0, kz], steps: 4});
        const result = await active;
        if (!current(ticket)) return;
        if (result?.preset !== model.id || result.closure?.rotationOrder !== 4 || result.frames?.[4]?.step !== 4) {
          throw new Error('Invalid Seitz comparison result');
        }
        results.push({model, result});
      }
      showResults(results);
      status.textContent = '对照已完成。';
    } catch {
      if (current(ticket)) clearCalculation('对照计算未完成，请重试。');
    } finally {
      if (current(ticket)) {
        active = null;
        submit.disabled = false;
        cancel.hidden = true;
      }
    }
  };

  return () => {
    disposed = true;
    clearCalculation('');
    form.oninput = form.onsubmit = cancel.onclick = null;
  };
}
