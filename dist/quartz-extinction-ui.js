import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261122-nextpaths1';

const source = quartzStructureCases.find(example => example.id === 'original');
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const axialOptions = [
  ['all', '001、002、003 都通过'],
  ['even', '只有 002 通过'],
  ['thirds', '只有 003 通过'],
];
const phaseOptions = [
  ['intensity', '强度不同'],
  ['conjugate', '强度相同，虚部反号'],
  ['extinct', '两边都消光'],
];
const controls = [
  ['original', '原始 CIF', [1, 0, 1]],
  ['friedel', '原始 CIF 的反向倒易矢量', [-1, 0, -1]],
  ['mirror', '固定晶轴，主动反演', [1, 0, 1]],
  ['rebasedSameLabel', '被动换基，沿用指数', [1, 0, 1]],
  ['rebasedSameVector', '被动换基，保持实际倒易矢量', [-1, 0, -1]],
];

function predictions(id, label, options) {
  return `<div><label for="${id}">${label}</label>
    <select id="${id}"><option value="">请选择</option>
      ${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}
    </select></div>`;
}

export function quartzExtinctionHTML() {
  return `<section class="sc-worked" data-quartz-extinction aria-labelledby="qe-title">
    <h3 id="qe-title">石英的轴向消光能分辨两种手性吗？</h3>
    <p>从 298 K 的原始 CIF 展开一个完整晶胞，用固定的实权重 ${math('f_{\\mathrm{Si}}=14,\\ f_{\\mathrm{O}}=8')} 计算衍射。先比较三条轴向反射，再比较原始结构与主动反演结构的离轴反射 101。</p>
    <form data-qe-form>
      ${predictions('qe-axial','沿螺旋轴，哪一条反射通过两种结构共有的螺旋条件？',axialOptions)}
      ${predictions('qe-phase','保持晶轴不动并反演原子后，101 的强度和虚部如何变化？',phaseOptions)}
      <div class="sc-actions"><button type="submit" class="primary" data-qe-run>读取原始 CIF 并计算核对</button>
        <button type="button" class="secondary" data-qe-cancel hidden>取消核对</button></div>
    </form>
    <p data-qe-status role="status"></p><div data-qe-result></div>
    <p>这里以原子序数作示意权重，计算运动学强度。<a href="https://qiserver.ugr.es/cod/9005017.html" target="_blank" rel="noreferrer">原始结构与文献 · COD 9005017 ↗</a></p>
  </section>`;
}

function checkedModel(result) {
  const {source: received, axial, control} = result ?? {};
  const reflection = (row, hkl) => row?.hkl?.length === 3 && hkl.every((value, i) => row.hkl[i] === value)
    && ['real','imag','intensity','dSpacing'].every(field => Number.isFinite(row[field]))
    && row.intensity >= 0 && row.dSpacing > 0;
  if(result?.schemaVersion !== 1 || result.atomCount !== 9 || received?.filename !== source.filename ||
    received.sha256 !== source.sha256 || received.byteCount !== source.byteCount ||
    result.weights?.Si !== 14 || result.weights?.O !== 8 ||
    !Array.isArray(axial) || axial.length !== 3 ||
    !axial.every((row, i) => reflection(row?.original, [0,0,i + 1]) && reflection(row.mirror, [0,0,i + 1])) ||
    !controls.every(([id, , hkl]) => reflection(control?.[id], hkl))) {
    throw new Error('Unexpected quartz diffraction result');
  }
  return result;
}

function resultTable(title, headers, rows) {
  return `<div class="sq-scroll" tabindex="0" role="region" aria-label="${title}"><table>
    <caption class="sr-only">${title}</caption>
    <thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

function resultHTML({axial, control}, axialGuess, phaseGuess) {
  const fixed = value => Math.abs(value) < .0005 ? '0' : value.toFixed(3);
  const hkl = values => math(`(${values.map(value => value < 0 ? '\\bar{' + -value + '}' : value).join('')})`);
  const axialTitle = '两种手性结构的轴向反射';
  const controlTitle = '离轴反射与换基对照';
  const intensity = math('I=|F|^2');
  return `<h4>沿轴比较 001、002 与 003</h4>
    <p class="sc-example-result">${axialGuess === 'thirds' ? '轴向预测正确。' : '沿轴的预测可以用前两行的零强度修正。'}</p>
    ${resultTable(axialTitle, ['反射','原始结构强度','反演结构强度'], axial.map(({original,mirror}) =>
      `<tr><th scope="row">${hkl(original.hkl)}</th><td>${fixed(original.intensity)}</td><td>${fixed(mirror.intensity)}</td></tr>`
    ))}
    <p>对轴向反射 ${math('00\\ell')}，绕轴旋转保留倒易矢量。原始结构的 ${math('3_2')} 和反演后的 ${math('3_1')} 给出的三项相位次序不同，求和都要求 ${math('\\ell=3n')}。003 在本模型中也确实有非零强度。</p>
    <p>对同一原子沿轴的三个周期等价位置，相对相位的和为 ${math('1+\\mathrm{e}^{2\\pi i\\ell p/3}+\\mathrm{e}^{4\\pi i\\ell p/3}\\quad(p=1,2)')}。</p>
    <h4>离轴检查相位和强度</h4>
    <p class="sc-example-result">${phaseGuess === 'conjugate' ? '离轴预测正确。' : '离轴的预测可以用原始结构与固定晶轴反演两行修正。'}</p>
    ${resultTable(controlTitle, ['结构或对照','反射',math('\\Re F'),math('\\Im F'),intensity], controls.map(([id,label]) => {
      const row = control[id];
      return `<tr><th scope="row">${label}</th><td>${hkl(row.hkl)}</td><td>${fixed(row.real)}</td><td>${fixed(row.imag)}</td><td>${fixed(row.intensity)}</td></tr>`;
    }))}
    <p>固定晶轴反演坐标时，原来的 101 振幅变为其复共轭。对实散射权重，${math('F(-\\mathbf h)=F(\\mathbf h)^*')}，所以模平方相同。离轴的 101 强度非零，也说明轴向条件的适用范围。</p>
    <details><summary>展开核对被动换基的指数</summary>
      <p>将晶格矩阵和分数坐标同时取负，实际原子位置保持不变。指数也取负才能保持实际倒易矢量。对照最后两行，沿用同一组指数会比较相反的实际倒易矢量。</p>
    </details>
    <p>测定绝对手性需要对手性敏感的实验。<a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">弗里德尔定律 ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.100.145502" target="_blank" rel="noreferrer">石英的共振圆偏振衍射实验 ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.108.019901" target="_blank" rel="noreferrer">实验论文勘误 ↗</a></p>
    <p><a href="#structure?quartz-hand=practice">在结构工作台核对三个石英结构 →</a> · <a href="#compute/diffraction">到衍射计算核对逐原子相位 →</a></p>`;
}

export function bindQuartzExtinction(host, {run, isCurrent = () => true, fetchSource = (...args) => fetch(...args)}) {
  const find = selector => host.querySelector(selector);
  const form = find('[data-qe-form]');
  const axial = find('#qe-axial');
  const phase = find('#qe-phase');
  const submit = find('[data-qe-run]');
  const cancel = find('[data-qe-cancel]');
  const status = find('[data-qe-status]');
  const output = find('[data-qe-result]');
  let active = null, disposed = false;
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

  axial.onchange = phase.onchange = () => {
    if(!disposed && isCurrent()) clear('预测已更改，可以再次核对。');
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
    const axialGuess = axial.value, phaseGuess = phase.value;
    const unanswered = [[axial,axialOptions],[phase,phaseOptions]]
      .find(([select, options]) => !options.some(([value]) => value === select.value));
    if(unanswered) {
      status.textContent = '请先完成两项衍射预测。';
      unanswered[0].focus();
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
      status.textContent = '正在计算石英的轴向和离轴反射…';
      request.task = run('quartz_extinction', {content});
      const result = await request.task;
      if(!current(request)) return;
      output.innerHTML = resultHTML(checkedModel(result), axialGuess, phaseGuess);
      status.textContent = '已完成衍射预测核对。';
    } catch {
      if(current(request)) status.textContent = '石英衍射核对暂未完成。可以重新读取并计算。';
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
