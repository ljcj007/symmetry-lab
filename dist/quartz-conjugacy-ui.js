import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261122-nextpaths1';

const source = quartzStructureCases.find(example => example.id === 'original');
const candidates = [
  [2, 'y,x,2/3-z'],
  [4, '-x,-x+y,1/3-z'],
  [6, 'x-y,-y,-z']
];
const classNames = {
  identity: '恒等',
  transposition: '交换两点',
  'three-cycle': '循环置换三点'
};
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const fraction = /^-?\d+(?:\/[1-9]\d*)?$/u;
const vectorOf = (value, check) => Array.isArray(value) && value.length === 3 && value.every(check);
const fracVector = value => vectorOf(value, item => typeof item === 'string' && fraction.test(item));
const texFraction = value => {
  const [numerator, denominator] = String(value).split('/');
  return denominator ? `${numerator.startsWith('-') ? '-' : ''}\\tfrac{${numerator.replace(/^-/, '')}}{${denominator}}` : numerator;
};
const vector = values => `(${values.map(texFraction).join(',')})`;

export function quartzConjugacyHTML() {
  return `<section class="sc-worked" data-quartz-conjugacy aria-labelledby="qc-title">
    <h3 id="qc-title">α 石英里，哪条 CIF 操作保持第二个 Si 位点？</h3>
    <p>298 K 的实验 CIF 只列出一个独立的 Si 位点。用第 3 行将它映射到第二个周期 Si 位点。</p>
    <p>${math(String.raw`p_1=(0.46970,0,0)`)} → <code>-y,x-y,2/3+z</code> → ${math(String.raw`p_2=(0,0.46970,\tfrac23)`)}</p>
    <p>在三条候选操作中选一条。若作用前后的三个分数坐标相差整数，便是同一个周期位点。</p>
    <form data-qc-form>
      <label for="qc-prediction">哪一行使第二个 Si 位点回到等价位置？</label>
      <select id="qc-prediction" required><option value="">选择你的预测</option>${candidates.map(([row, xyz]) => `<option value="${row}">${row} · ${esc(xyz)}</option>`).join('')}</select>
      <div class="sc-actions"><button type="submit" class="primary" data-qc-run>读取原始 CIF 并计算核对</button><button type="button" class="secondary" data-qc-cancel hidden>取消核对</button></div>
    </form>
    <p data-qc-status role="status"></p><div data-qc-result></div>
    <p>计算把 CIF 报告的坐标当作精确分数使用。298 K 是实验温度，精确分数仅用于重放这些已报告的数值。</p>
    <p><a href="https://qiserver.ugr.es/cod/9005017.html" target="_blank" rel="noreferrer">实验 CIF 与文献出处 · COD 9005017 ↗</a></p>
  </section>`;
}

function checkedModel(result) {
  const {source: received, operations, silicon, oxygen, conjugation: step, classes} = result ?? {};
  const rowLabel = row => Number.isInteger(row) && row >= 1 && row <= 6;
  const stabilizerItem = item => rowLabel(item?.row) && vectorOf(item?.latticeCorrection, Number.isInteger);
  const hasOrbit = (orbit, count) => orbit?.multiplicity === count && Array.isArray(orbit.sites) && orbit.sites.length === count &&
    orbit.sites.every((site, index) => site?.id === index + 1 && fracVector(site.position) &&
      Array.isArray(site.stabilizer) && site.stabilizer.length && site.stabilizer.every(stabilizerItem));
  if(result?.schemaVersion !== 1 || result.spaceGroup !== 154 || received?.filename !== source.filename ||
    received.sha256 !== source.sha256 || received.byteCount !== source.byteCount || !hasOrbit(silicon, 3) || !hasOrbit(oxygen, 6) ||
    !rowLabel(step?.baseRow) || !rowLabel(step.byRow) || !candidates.some(([row]) => row === step.representativeRow) || step.targetSiteId !== 2 ||
    !fracVector(step.listedRepresentativeImage) || !fracVector(step.correctedImage) || !vectorOf(step.latticeCorrection, Number.isInteger) ||
    !Array.isArray(operations) || operations.length !== 6 ||
    !candidates.every(([row, xyz]) => operations.some(operation => operation?.row === row && operation.xyz === xyz)) ||
    !Array.isArray(classes) || classes.length !== 3 || !classes.every((row, index) => row?.id === Object.keys(classNames)[index] &&
      Array.isArray(row.rows) && row.rows.length && row.rows.every(rowLabel) && Number.isInteger(row.character) && row.character >= 0 && row.character <= 3)) {
    throw new Error('Unexpected quartz conjugacy result');
  }
  return result;
}

function resultHTML(result, guess) {
  const {silicon, oxygen, classes, conjugation: step} = result;
  const {baseRow, byRow, representativeRow, latticeCorrection, listedRepresentativeImage, correctedImage} = step;
  const verdict = guess === representativeRow ? '预测正确。' : '对照计算结果再核对所选操作。';
  const stabilizer = site => math(`\\bar H_{p_${site.id}}=\\{${site.stabilizer.map(({row}) => `\\bar g_{${row}}`).join(',')}\\}`);
  const oxygenCharacter = ({rows}) => oxygen.sites.filter(site => site.stabilizer.some(({row}) => row === rows[0])).length;
  const traceTitle = '平移商群各共轭类的固定点计数';
  return `<p class="sc-example-result">${verdict} ${'保持第二个 Si 周期位点的非恒等操作对应 CIF 行号'} ${representativeRow}</p>
    <h4>先在平移商群里比较稳定子</h4>
    <p>${stabilizer(silicon.sites[0])}　${stabilizer(silicon.sites[1])}</p>
    <p>${'横线表示忽略整格平移后的操作。第'} ${byRow} ${'行将第一个 Si 位点送到第二个。把第一个位点的稳定操作共轭过去。'} ${math(`h=g_{${byRow}},\\quad g=g_{${baseRow}}`)}</p>
    <p>${math(`\\bar g_{${byRow}}\\bar g_{${baseRow}}\\bar g_{${byRow}}^{-1}=\\bar g_{${representativeRow}}`)}</p>
    <details><summary>展开核对实际坐标和整格平移</summary>
      <p>${'把原始 CIF 行直接作用在第二个 Si 位点上，得到相邻晶胞里的像。'} ${math(`g_{${representativeRow}}p_2=${vector(listedRepresentativeImage)}`)}</p>
      <p>${'补上这个整格平移，才回到原来的实际坐标。'} ${math(`T_{${vector(latticeCorrection)}}g_{${representativeRow}}p_2=p_2`)} · ${math(`p_2=${vector(correctedImage)}`)}</p>
      <p>${math(`hgh^{-1}=T_{${vector(latticeCorrection)}}g_{${representativeRow}}`)}</p>
    </details>
    <h4>用固定的周期位点数读出置换特征标</h4>
    <p>在位点置换矩阵里，每个固定点贡献一个对角元 1。O 的六个位点都只有恒等商类固定，因而给出另一组特征标。</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${traceTitle}"><table>
      <caption class="sr-only">${traceTitle}</caption><thead><tr><th scope="col">Si 上的置换类型</th><th scope="col">CIF 行号</th><th scope="col">Si 固定点数</th><th scope="col">O 固定点数</th></tr></thead>
      <tbody>${classes.map(row => `<tr><th scope="row">${classNames[row.id]}</th><td>${row.rows.join(', ')}</td><td>${row.character}</td><td>${oxygenCharacter(row)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p><a href="#classroom/foundations?module=theorems&amp;experiment=conjugacy">在 S₃ 中练习共轭 →</a> · <a href="#classroom/foundations?module=demos&amp;experiment=projection&amp;preset=triangle-permutation">用三角形检验相同的 Si 特征标 →</a></p>`;
}

export function bindQuartzConjugacy(host, {run, isCurrent = () => true, fetchSource = (...args) => fetch(...args)}) {
  const find = selector => host.querySelector(selector);
  const form = find('[data-qc-form]');
  const prediction = find('#qc-prediction');
  const submit = find('[data-qc-run]');
  const cancel = find('[data-qc-cancel]');
  const status = find('[data-qc-status]');
  const output = find('[data-qc-result]');
  let active = null;
  let disposed = false;
  const current = request => !disposed && active === request && isCurrent();

  function clear(message) {
    const previous = active;
    active = null;
    previous?.controller.abort();
    previous?.task?.cancel?.();
    submit.disabled = false;
    cancel.hidden = true;
    status.textContent = message;
    output.innerHTML = '';
  }

  prediction.onchange = () => {
    if(!disposed && isCurrent()) clear('预测已更改，可以重新核对。');
  };
  cancel.onclick = () => {
    if(!disposed && isCurrent()) {
      clear('核对已取消。');
      submit.focus();
    }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if(disposed || active || !isCurrent()) return;
    const guess = Number(prediction.value);
    if(!candidates.some(([row]) => row === guess)) {
      status.textContent = '请先选择一条 CIF 操作。';
      prediction.focus();
      return;
    }
    const request = {controller:new AbortController(), task:null};
    active = request;
    submit.disabled = true;
    cancel.hidden = false;
    output.innerHTML = '';
    status.textContent = '正在读取 298 K 原始 CIF…';
    try {
      const response = await fetchSource(source.url, {signal:request.controller.signal});
      if(!response.ok) throw new Error('CIF fetch failed');
      const bytes = await response.arrayBuffer();
      if(!current(request)) return;
      if(bytes.byteLength !== source.byteCount) throw new Error('CIF byte count changed');
      const content = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
      status.textContent = '正在计算精确的位点置换与稳定子…';
      request.task = run('quartz_conjugacy', {content});
      const result = await request.task;
      if(!current(request)) return;
      output.innerHTML = resultHTML(checkedModel(result), guess);
      status.textContent = '已完成预测核对。';
    } catch {
      if(current(request)) status.textContent = '石英核对暂未完成。请重新读取并计算。';
    } finally {
      if(current(request)) {
        active = null;
        submit.disabled = false;
        cancel.hidden = true;
      }
    }
  };
  return () => {
    disposed = true;
    clear('');
  };
}
