import {mathHTML} from './math-display.js?v=20261113-prose2';
import {buildWorkbenchRoute} from './workbench-route.js?v=20261112-flow2';

const cases = [
  {id: 'axis', label: 'A', k: [0, 0, .5]},
  {id: 'off-axis', label: 'B', k: [.25, 0, .5]},
  {id: 'boundary', label: 'C', k: [.5, 0, .5]}
];
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const sameVector = (actual, expected) => Array.isArray(actual) && actual.length === 3 &&
  actual.every((value, i) => value === expected[i]);

export function seitzLittleGroupHTML() {
  return `<section class="sc-worked" id="sc-seitz-little-group" aria-labelledby="sc-seitz-little-group-title">
    <h3 id="sc-seitz-little-group-title">波矢变了，螺旋还在小群里吗？</h3>
    <p>固定第 4 号空间群的 BC 原胞设定，比较同一个绕 z 轴的二重螺旋。A、B、C 的轴向分量相同，只改变横向分量。</p>
    <p>${cases.map(({label, k}) => `${label} · ${math('(' + k.join(',') + ')')}`).join('　')}</p>
    <form id="sc-seitz-little-group-form">
      <label for="sc-seitz-little-group-prediction">预测在哪些波矢下，螺旋操作属于小群</label>
      <select id="sc-seitz-little-group-prediction" required>
        <option value="">选择你的预测</option>
        <option value="all">A、B、C 都属于</option>
        <option value="axis-only">只有 A 属于</option>
        <option value="axis-boundary">A 和 C 属于</option>
      </select>
      <div class="sc-actions">
        <button id="sc-seitz-little-group-run" type="submit" class="primary">计算并核对预测</button>
        <button id="sc-seitz-little-group-cancel" type="button" class="secondary" hidden>取消核对</button>
      </div>
    </form>
    <p id="sc-seitz-little-group-status" role="status"></p>
    <div id="sc-seitz-little-group-result"></div>
  </section>`;
}

function checkCase(result, k) {
  const first = result?.frames?.[1], second = result?.frames?.[2];
  const transformedK = [-k[0], -k[1], k[2]];
  const difference = transformedK.map((value, i) => value - k[i]);
  const inLittleGroup = difference.every(Number.isInteger);
  const phase = second?.blochPhase;
  if(result?.lab !== 'seitz' || result.preset !== 'screw21' || !sameVector(result.k, k) ||
      first?.step !== 1 || !sameVector(first.transformedK, transformedK) || first.isLittleGroup !== inLittleGroup ||
      second?.step !== 2 || !sameVector(second.transformedK, k) || !sameVector(second.translation, [0, 0, 1]) ||
      !Number.isFinite(phase?.re) || !Number.isFinite(phase?.im) || Math.abs(phase.re + 1) > 1e-9 || Math.abs(phase.im) > 1e-9) {
    throw new Error('Invalid twofold screw comparison result');
  }
  return {transformedK: first.transformedK, difference, inLittleGroup: first.isLittleGroup, phase};
}

export function bindSeitzLittleGroup(host, {run, isCurrent, formatNumber, formatComplex}) {
  const form = host.querySelector('#sc-seitz-little-group-form');
  const prediction = host.querySelector('#sc-seitz-little-group-prediction');
  const submit = host.querySelector('#sc-seitz-little-group-run');
  const cancel = host.querySelector('#sc-seitz-little-group-cancel');
  const status = host.querySelector('#sc-seitz-little-group-status');
  const output = host.querySelector('#sc-seitz-little-group-result');
  let active = null, revision = 0, disposed = false;
  const current = ticket => !disposed && ticket === revision && isCurrent();
  const vector = values => `(${values.map(formatNumber).join(', ')})`;

  function reset(message) {
    revision++;
    active?.cancel?.();
    active = null;
    submit.disabled = false;
    cancel.hidden = true;
    output.innerHTML = '';
    status.textContent = message;
  }

  function showResults(results, guess) {
    const answers = {
      'axis-boundary': '预测正确。C 的原始坐标改变了，折回后仍是同一个波矢。',
      'axis-only': '核对 C 的波矢差。横向分量相差一个完整的倒格矢，所以 C 也满足小群条件。',
      all: '核对 B 的波矢差。半个倒格矢不能折回同一个波矢。'
    };
    const description = '三个波矢的两步螺旋核对';
    const headers = ['起点 k', '一步后的 k′', '差 k′−k', '螺旋属于小群？', '平方的平移相位', '单值工作台'];
    output.innerHTML = `<p>${answers[guess]}</p>
      <div class="sq-scroll" tabindex="0" role="region" aria-label="${description}">
        <table><caption class="sr-only">${description}</caption><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join('')}</tr></thead>
        <tbody>${results.map(({id, label, k, transformedK, difference, inLittleGroup, phase}) => {
          const verdict = inLittleGroup ? '在小群内' : '在小群外';
          const route = buildWorkbenchRoute({mode: 'sg', id: 4, k, doubleValued: false});
          return `<tr data-seitz-little-group-case="${id}"><th scope="row">${label} · ${vector(k)}</th>
            <td>${vector(transformedK)}</td><td>${vector(difference)}</td><td>${verdict}</td><td>${escapeHTML(formatComplex(phase))}</td>
            <td><a href="#${escapeHTML(route)}" aria-label="${'打开单值工作台，波矢'} ${vector(k)}">${'打开工作台'} →</a></td></tr>`;
        }).join('')}</tbody></table>
      </div>
      <p>${math(String.raw`k'=R^{-\mathsf{T}}k=(-k_x,-k_y,k_z)`)} · ${math(String.raw`k'-k\in\mathbb{Z}^3`)}</p>
      <p>在这里的原胞倒格基底中，波矢差的三个分量都必须是整数。A 的差为零，C 的差为一个倒格矢，因此螺旋都保持相应的波矢空间。</p>
      <p>螺旋连做两次给出沿 z 的整格平移。三个例子的平方相位都为 −1，因为它们的轴向分量相同。</p>
      <p>A、C 的单值小表示可在同一波矢空间里给螺旋分配本征值 ±i。B 的第一步连接不同的星臂。平方的平移相位仍成立，但单独在 B 的波矢空间里无法给螺旋分配本征值。打开对应工作台后可手动计算并对照小群操作表。</p>`;
  }

  prediction.onchange = () => reset('预测已更改，可以重新核对。');
  cancel.onclick = () => {
    reset('核对已取消。');
    submit.focus();
  };
  form.onsubmit = async event => {
    event.preventDefault();
    const guess = prediction.value;
    if(submit.disabled || !['all', 'axis-only', 'axis-boundary'].includes(guess) || !current(revision)) return;
    const ticket = ++revision;
    const results = [];
    submit.disabled = true;
    cancel.hidden = false;
    output.innerHTML = '';
    status.textContent = '正在核对三个波矢…';
    try {
      for (const example of cases) {
        active = run('teaching_labs', {lab: 'seitz', preset: 'screw21', point: [.2, .3, .1], k: [...example.k], steps: 2});
        const result = await active;
        if(!current(ticket)) return;
        results.push({...example, ...checkCase(result, example.k)});
      }
      showResults(results, guess);
      status.textContent = '核对完成，结果在下表。';
    } catch {
      if(current(ticket)) reset('小群核对未完成，请重试。');
    } finally {
      if(current(ticket)) {
        active = null;
        submit.disabled = false;
        cancel.hidden = true;
      }
    }
  };

  return () => {
    disposed = true;
    reset('');
    prediction.onchange = cancel.onclick = form.onsubmit = null;
  };
}
