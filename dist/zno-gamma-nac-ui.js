import {mathHTML} from './math-display.js?v=20261116-prose3';

const sourceFiles = [
  ['qpoints', 'phonopy-zno-qpoints.yaml', 55277, '37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5'],
  ['structure', 'phonopy-zno-structure.yaml', 7641, '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c'],
  ['born', 'phonopy-zno-BORN', 112, '902118e6b31c9046c0b22eadac279e079563d2386e675a88409443923ee5063e']
];
const sourceRevision = '0937453a793eb504f674b7d4fd98421d508008e6';
const presets = [
  ['axial', '沿 c 轴 [0, 0, 1]', [0, 0, 1]],
  ['basal', '沿基面 [1, 0, 0]', [1, 0, 0]],
  ['oblique', '斜向 [1, 0, 1]', [1, 0, 1]]
];
const axes = ['x', 'y', 'z'];
const symmetryLabels = {A1: 'A_1', E1: 'E_1', E2: 'E_2', B1: 'B_1'};
const parentKeys = ['A1', 'E1', 'E2', 'B1', 'acoustic', 'other'];
const escape = text => String(text).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const fmt = value => String(Number(value.toPrecision(7)));
const math = tex => `<span class="pd-math" data-math-ignore>${mathHTML(tex)}</span>`;
const formula = tex => `<div class="pd-formula" tabindex="0" data-math-ignore>${mathHTML(tex, true)}</div>`;
const label = key => symmetryLabels[key] ? math(symmetryLabels[key]) : key === 'acoustic' ? '声学' : '其他';
const percent = fraction => (100 * fraction).toFixed(2);
const num = Number.isFinite;

async function readSources(signal) {
  const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
  const files = await Promise.all(sourceFiles.map(async ([key, name, size, sha256]) => {
    const url = new URL('./data/examples/' + name + '?v=20261122-zno-gamma-nac1', import.meta.url);
    const response = await fetch(url, {signal});
    if (!response.ok) throw new Error('source response');
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    if (bytes.byteLength !== size) throw new Error('source size');
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
    signal.throwIfAborted();
    const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
    if (hex !== sha256) throw new Error('source hash');
    return [key, decoder.decode(bytes)];
  }));
  return Object.fromEntries(files);
}

function table(caption, headers, rows) {
  return `<div class="pd-scroll" role="region" tabindex="0" aria-label="${escape(caption)}"><table>
    <caption>${escape(caption)}</caption><thead><tr>${headers.map(heading =>
      `<th scope="col">${escape(heading)}</th>`).join('')}</tr></thead><tbody>${rows.map(([index, ...cells]) =>
      `<tr><th scope="row">${index}</th>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function parentComponents(mode) {
  const terms = parentKeys.map(key => [key, mode.overlaps[key]]).filter(([, weight]) => Number(percent(weight)) > 0);
  return terms.map(([key, weight]) => `${label(key)} ${percent(weight)}%`).join(' · ');
}

function xyPolarWeights(baseline) {
  const weights = ['A1', 'E1'].map(key => baseline.modes.reduce((sum, mode) =>
    sum + mode.longitudinalDipoleSquared * mode.overlaps[key], 0));
  const total = weights[0] + weights[1];
  return weights.map(weight => percent(weight / total));
}

function mainResult(result, guess) {
  const {baseline, corrected, direction, electrostatics, checks} = result;
  const weights = xyPolarWeights(baseline);
  const answer = Number(weights[0]) === 0 ? 'e1' : Number(weights[1]) === 0 ? 'a1' : 'both';
  const feedback = guess === answer ? '计算与预测一致。' : '用计算出的纵向偶极权重重新判断。';
  const rows = baseline.modes.map((mode, index) => [mode.band + 1, fmt(mode.frequencyTHz),
    parentComponents(mode), fmt(corrected.modes[index].frequencyTHz), parentComponents(corrected.modes[index])]);
  return `<h4>同一个方向下的计算对照</h4>
    <p id="zgn-feedback" class="pd-current">${feedback} ${math('A_1')} · ${weights[0]}%　${math('E_1')} · ${weights[1]}%</p>
    <p>两侧各按频率排序。用投影辨认修正后的母模成分。</p>
    ${table('修正前后的 12 支声子模态', ['排序序号', '未修正频率（THz）', '未修正母模', '已修正频率（THz）', '修正后母模投影'], rows)}
    <details open><summary>分三步理解频率变化</summary>
      <ol>
        <li>把方向换成笛卡尔单位向量 ${math(String.raw`\hat{\mathbf q}`)} = (${direction.cartesianUnit.map(fmt).join(', ')})
          <p>把同一方向的分量整体放大或反号，再试一次。</p></li>
        <li>Born 有效电荷把位移投影到纵向偶极。电子介电张量给出屏蔽分母，用纵向偶极向量的外积构成修正。
          <p>屏蔽分母 ${fmt(electrostatics.screening)} · 修正矩阵的秩 ${checks.correctionRank}</p>
          ${formula(String.raw`v_{\kappa\alpha}=\frac{\sum_\gamma\hat q_\gamma Z^*_{\kappa,\gamma\alpha}}{\sqrt{M_\kappa}},\quad
          \Delta D=\frac{4\pi C}{\Omega\,\hat{\mathbf q}^{\mathsf{T}}\varepsilon_\infty\hat{\mathbf q}}\,v v^{\mathsf{T}}`)}
          <p>C 是原文件的单位换算因子，Ω 是原胞体积。</p>
          <p>从每个原子的 Born 张量减去四个原子的平均张量，使张量和为零。这样整胞平移就不产生偶极。</p></li>
        <li>对修正后的动力学矩阵重新求本征值和本征矢。在斜向结果里找同时含两类极性母模成分的分支。</li>
      </ol>
    </details>
    <section class="pd-section" aria-labelledby="zgn-raw-title">
      <h5 id="zgn-raw-title">反例：直接使用原始 Born 电荷</h5>
      <p>预测三支近零频率的声学模会怎样变化。保持同一方向，取消对各原子 Born 有效电荷的中性化处理，然后再算一次。</p>
      <button id="zgn-counterexample" class="secondary" type="button">用原始 Born 电荷复算</button>
      <div id="zgn-raw-result"></div>
    </section>`;
}

function rawResult(neutral, raw) {
  const rows = neutral.baseline.modes.slice(0, 3).map((mode, i) => [i + 1,
    fmt(mode.frequencyTHz), fmt(neutral.corrected.modes[i].frequencyTHz), fmt(raw.corrected.modes[i].frequencyTHz)]);
  const diagonal = result => result.electrostatics.appliedBornChargeSum.map((row, i) => fmt(row[i])).join(', ');
  const residuals = [neutral, raw].map(result => fmt(result.checks.correctionTranslationMaxResidual));
  return table('同一方向的三支声学模', ['排序序号', '未修正频率（THz）', '中性化后（THz）', '原始 Born 电荷（THz）'], rows) + `
    <p>四个原子的有效电荷张量求和。在这份数据中，非对角元为零。</p>
    <ul><li>中性化后对角元 (${diagonal(neutral)})</li><li>原始电荷对角元 (${diagonal(raw)})</li></ul>
    <p>整胞平移代入修正矩阵后，最大绝对残差分别为 ${residuals.join(' · ')}。中性化的修正保留整胞平移。原始电荷将一支声学模推离零频附近，误差来自电荷和偏离零。未修正矩阵自身也有近零声学频率的数值残差。</p>`;
}

function validateResult(result, input, correction) {
  if (result?.schema !== 'symmetry-lab-zno-gamma-nac-1' || result.action !== 'zno_gamma_nac' ||
      result.correction !== correction || result.source?.revision !== sourceRevision || result.source.archiveNAC !== false ||
      result.direction?.coordinates !== input.directionCoordinates || !Array.isArray(result.direction.input) ||
      result.direction.input.length !== 3 || !input.direction.every((v, i) => v === result.direction.input[i]) ||
      !Array.isArray(result.direction.cartesianUnit) || result.direction.cartesianUnit.length !== 3 || !result.direction.cartesianUnit.every(num) ||
      ![result.baseline?.modes, result.corrected?.modes].every(modes => Array.isArray(modes) && modes.length === 12 &&
        modes.every((mode, index) => mode.band === index && num(mode.frequencyTHz) && num(mode.longitudinalDipoleSquared) &&
          parentKeys.every(key => num(mode.overlaps?.[key])))) ||
      !num(result.electrostatics?.screening) || !num(result.checks?.correctionTranslationMaxResidual) ||
      result.checks.correctionRank !== 1 || !Array.isArray(result.electrostatics.appliedBornChargeSum) ||
      result.electrostatics.appliedBornChargeSum.length !== 3 ||
      !result.electrostatics.appliedBornChargeSum.every(row => Array.isArray(row) && row.length === 3 && row.every(num))) {
    throw new Error('correction result');
  }
}

export function bindZnOGammaNAC({root,run,isCurrent=()=>true}) {
  let active = true;
  let currentJob = null;
  let verifiedSources;
  let neutral;
  const current = () => active && root.isConnected !== false && isCurrent();
  const get = id => root.querySelector('#zgn-' + id);
  root.innerHTML = `<section class="pd-lesson" aria-labelledby="zgn-title">
    <h3 id="zgn-title">ZnO 的 Γ 点 LO–TO 劈裂</h3>
    <p>用同一份 ZnO 动力学矩阵比较两种结果。这里沿给定方向无限接近 Γ，只计算长程电场在该极限的非解析修正。</p>
    <form id="zgn-form" class="pd-section">
      <p>选择方向，预测哪些 Γ 点母模与纵向电场耦合。反馈会显示两类极性母模的纵向偶极权重占比，并按显示精度核对预测。</p>
      <div class="pd-actions" role="group" aria-label="笛卡尔方向预设">${presets.map(([id, text]) =>
        `<button id="zgn-${id}" class="secondary" type="button">${text}</button>`).join('')}</div>
      <label for="zgn-coordinates">方向分量的坐标</label>
      <select id="zgn-coordinates"><option value="cartesian">笛卡尔坐标</option><option value="primitive-reciprocal">原胞倒易分数坐标</option></select>
      <div class="pd-answer-grid">${axes.map((axis, i) => `<div><label for="zgn-${axis}">${axis}</label>
        <input id="zgn-${axis}" type="number" inputmode="decimal" step="any" value="${presets[0][2][i]}" required></div>`).join('')}</div>
      <label for="zgn-prediction">预计哪些母模耦合？</label>
      <select id="zgn-prediction" required>
        <option value="">请选择预测</option><option value="a1">仅 A₁</option><option value="e1">仅 E₁</option><option value="both">A₁ 和 E₁ 都耦合</option>
      </select>
      <div class="pd-actions"><button id="zgn-run" class="primary" type="submit">核验原文件并计算</button>
        <button id="zgn-cancel" class="secondary" type="button" hidden>取消本次请求</button></div>
      <p id="zgn-status" role="status"></p><p id="zgn-error" role="alert" hidden></p>
    </form>
    <div id="zgn-result"></div>
    <p>频率来自固定的 Phonopy 算例。点击计算后，页面核对三份文件的 SHA-256，并用 Python 对同一 Γ 点矩阵做频率对照。</p>
    <p><a href="data/examples/phonopy-zno-source.json">查看来源、生成设置与许可 →</a></p>
  </section>`;
  const form = get('form'), coordinates = get('coordinates'), prediction = get('prediction');
  const components = axes.map(get), submit = get('run'), cancel = get('cancel');
  const result = get('result'), status = get('status'), error = get('error');

  function refresh() {
    const rawButton = get('counterexample');
    submit.disabled = Boolean(currentJob) || typeof run !== 'function';
    if (rawButton) rawButton.disabled = Boolean(currentJob);
    cancel.hidden = !currentJob;
  }

  function stop() {
    const job = currentJob;
    currentJob = null;
    job?.controller.abort();
    job?.task?.cancel?.();
  }

  function edit() {
    if (!current()) return;
    stop();
    neutral = undefined;
    result.innerHTML = '';
    status.textContent = '';
    error.hidden = true;
    refresh();
  }

  async function calculate(input, correction, guess) {
    const job = {controller: new AbortController()};
    currentJob = job;
    const owns = () => current() && currentJob === job;
    error.hidden = true;
    status.textContent = verifiedSources ? '正在用 Python 计算 Γ 点极限…' : '正在读取并核验 ZnO 原文件…';
    refresh();
    try {
      const sources = verifiedSources ?? await readSources(job.controller.signal);
      if (!owns()) return;
      verifiedSources = sources;
      status.textContent = '正在用 Python 计算 Γ 点极限…';
      job.task = run('zno_gamma_nac', {...sources, ...input, correction});
      const calculated = await job.task;
      if (!owns()) return;
      validateResult(calculated, input, correction);
      if (correction === 'raw') {
        get('raw-result').innerHTML = rawResult(neutral, calculated);
        status.textContent = '原始 Born 电荷的反例已计算。';
      } else {
        result.innerHTML = mainResult(calculated, guess);
        neutral = calculated;
        get('counterexample').onclick = () => {
          if (current() && !currentJob && neutral) return calculate(input, 'raw');
        };
        status.textContent = '修正前后的频率对照已计算。';
      }
    } catch {
      if (owns()) {
        error.textContent = verifiedSources ? '本次计算未完成，请重试。' : 'ZnO 原文件暂时无法读取或核验，请重试。';
        error.hidden = false;
        status.textContent = '';
      }
    } finally {
      job.controller.abort();
      if (owns()) {
        currentJob = null;
        refresh();
      }
    }
  }

  form.onsubmit = event => {
    event.preventDefault();
    if (!current() || submit.disabled) return;
    edit();
    const direction = components.map(field => field.value.trim() ? Number(field.value) : NaN);
    const directionCoordinates = coordinates.value;
    if (!direction.every(num) || !direction.some(value => value !== 0) ||
        !['cartesian', 'primitive-reciprocal'].includes(directionCoordinates) ||
        !['a1', 'e1', 'both'].includes(prediction.value)) {
      error.textContent = '请填写三个分量，其中至少一个非零，并选择预测。';
      error.hidden = false;
      return;
    }
    return calculate({direction, directionCoordinates}, 'neutralized', prediction.value);
  };
  form.oninput = edit;
  for (const [id, , values] of presets) get(id).onclick = () => {
    if (!current()) return;
    coordinates.value = 'cartesian';
    components.forEach((component, i) => {component.value = String(values[i]);});
    edit();
  };
  cancel.onclick = () => {
    if (!current() || !currentJob) return;
    const rawWasRunning = Boolean(get('counterexample'));
    stop();
    refresh();
    status.textContent = '请求已取消，方向和预测仍保留。';
    (rawWasRunning ? get('counterexample') : submit).focus?.();
  };
  refresh();
  return () => {active = false; stop();};
}
