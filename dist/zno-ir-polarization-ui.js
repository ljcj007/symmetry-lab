const fixture = Object.freeze({
  name: 'zno-ir-polarization.json',
  schema: 'symmetry-lab.zno-ir-polarization.v1',
  bytes: 6283,
  sha256: '7faf5a93b7590f44d81e6fd7acd9ff4e7fe4f6e7a65d1e04e8177bf52a49666b',
  url: new URL('./data/examples/zno-ir-polarization.json?v=20261120-zno-ir1', import.meta.url),
});
const sourceCommit = '0937453a793eb504f674b7d4fd98421d508008e6';
const bornSource = 'https://github.com/phonopy/phonopy/blob/'+sourceCommit+'/example/ZnO/BORN';
const clusterIds = ['a1', 'e1', 'e2-low', 'e2-high'];
const e2InPlaneTensors = [
  [[1, 0], [0, -1]],
  [[0, 1], [1, 0]]
];
const verifiedByState = new WeakMap();
const radians = value => value * Math.PI / 180;
const shown = value => Number(value.toPrecision(6));
const degreesIn = (value, maximum) => Number.isFinite(value) && value >= 0 && value <= maximum;
const predictions = ['z', 'x', 'equal'];
const ramanPredictions = ['ir', 'raman', 'both', 'neither'];

function validateData(data) {
  const settings = data?.settings;
  if (data?.schema !== fixture.schema || data.source?.commit !== sourceCommit ||
      data.source?.nonAnalyticCorrection !== false || settings?.frequencyUnit !== 'THz' ||
      settings?.projectionUnit !== 'e^2/u' || settings?.qIndex !== 0 ||
      !Array.isArray(settings.q) || settings.q.length !== 3 || settings.q.some(value => value !== 0) ||
      !Number.isFinite(data.checks?.tolerance) ||
      !Array.isArray(data.groups) || data.groups.length !== clusterIds.length) {
    throw new Error('ZnO 数据缺少预期的 Γ 点模式或单位。');
  }
  for (const [index, cluster] of data.groups.entries()) {
    const count = index === 0 ? 1 : 2;
    if (cluster.id !== clusterIds[index] || !Number.isFinite(cluster.frequency) ||
        cluster.classification?.dimension !== count || !Array.isArray(cluster.modeDipoles) ||
        cluster.modeDipoles.length !== 3 || cluster.modeDipoles.some(row =>
          !Array.isArray(row) || row.length !== count || !row.every(Number.isFinite))) {
      throw new Error('ZnO 模式偶极矩阵的维数与所选模式簇不一致。');
    }
  }
  return data;
}

async function fetchData(signal) {
  const response = await fetch(fixture.url, {signal});
  if (!response.ok) throw new Error('ZnO 数据读取失败。');
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  if (bytes.byteLength !== fixture.bytes) throw new Error('ZnO 数据的字节数与固定版本不一致。');
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  signal.throwIfAborted();
  const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  if (hex !== fixture.sha256) throw new Error('ZnO 示例数据暂时无法读取，请重新载入。');
  return validateData(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)));
}

/** θ is measured from +z toward +x. φ changes the E1 basis, never ε. */
export function projectZnOIRPolarization(data, thetaDegrees, phiDegrees) {
  if (!degreesIn(thetaDegrees, 90) || !degreesIn(phiDegrees, 180)) {
    throw new RangeError('偏振角须在 0° 至 90°，基底角须在 0° 至 180°。');
  }
  const theta = radians(thetaDegrees), phi = radians(phiDegrees);
  const polarization = thetaDegrees === 0 ? [0, 0, 1] :
    thetaDegrees === 90 ? [1, 0, 0] : [Math.sin(theta), 0, Math.cos(theta)];
  const c = Math.cos(phi), s = Math.sin(phi);
  const clusters = {};
  for (const {id,modeDipoles} of data.groups) {
    let amplitudes = modeDipoles[0].map((_, index) =>
      polarization.reduce((sum, value, axis) => sum + value * modeDipoles[axis][index], 0));
    if (id === 'e1') {
      const [first, second] = amplitudes;
      amplitudes = [c * first + s * second, -s * first + c * second];
    }
    const components = amplitudes.map(value => value ** 2);
    clusters[id] = {components,total:components.reduce((sum, value) => sum + value, 0)};
  }
  return {polarization,clusters};
}

/** Normalized equal-coefficient E2 basis in the basal plane. */
export function projectZnOE2Raman(thetaDegrees) {
  if (!degreesIn(thetaDegrees, 90)) {
    throw new RangeError('拉曼偏振角须在 0° 至 90°。');
  }
  const theta = radians(thetaDegrees);
  const input = [Math.cos(theta), Math.sin(theta)];
  const crossedAnalyzer = [-input[1], input[0]];
  const weights = analyzer => e2InPlaneTensors.map(tensor => {
    const amplitude = tensor.reduce((sum, row, axis) => sum + analyzer[axis] *
      row.reduce((projection, value, direction) => projection + value * input[direction], 0), 0);
    const intensity = amplitude ** 2;
    return intensity < 1e-14 ? 0 : intensity;
  });
  const parallel = weights(input), crossed = weights(crossedAnalyzer);
  const sum = values => values.reduce((total,value) => total + value, 0);
  return {parallel,crossed,total:{parallel:sum(parallel),crossed:sum(crossed)}};
}

function ramanExerciseHTML(state) {
  const selected = ramanPredictions.includes(state.ramanPrediction) ? state.ramanPrediction : '';
  const angle = degreesIn(state.ramanAngle, 90) ? state.ramanAngle : 0;
  const choices = [['','请选择'],['ir','仅允许 IR'],['raman','仅允许普通一阶 Raman'],
    ['both','两种都允许'],['neither','两种都禁止']];
  const row = (id, label) => `<tr><th scope="row">${label}</th>
    <td><output id="zir-raman-parallel-${id}"></output></td>
    <td><output id="zir-raman-crossed-${id}"></output></td></tr>`;
  return `<section class="mr-scope" aria-labelledby="zir-raman-heading">
    <h4 id="zir-raman-heading">从 E₂ 的零红外投影读出 Raman 选择定则</h4>
    <p>上表的 E₂ 低频簇和高频簇在固定的 ZnO 数据中都给出零模式偶极投影。</p>
    <label for="zir-raman-predict">根据 6mm 点群的选择定则，这两个 Γ 点 E₂ 簇允许哪种光谱耦合？</label>
    <select id="zir-raman-predict">${choices.map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('')}</select>
    <button type="button" id="zir-raman-check" class="secondary" aria-controls="zir-raman-result" aria-expanded="false">核对 E₂ 的判断</button>
    <p id="zir-raman-status" role="status"></p>
    <div id="zir-raman-result" hidden>
      <p>在 C₆ᵥ 的 E₂ 行，极向量重数为 0，对称二阶张量重数为 1。普通一阶 Raman 允许，对应 x²−y² 与 xy。</p>
      <p><a href="#classroom/foundations?tab=atlas&amp;group=25">打开 6mm 特征标表，核对 E₂ 的两列 →</a></p>
      <h5>归一化 Raman 几何</h5>
      <p>沿 z 背散射，入射和分析偏振都在 xy 平面内。采用共同系数为 1 的 E₂ 对称适配基，两个平面张量分别是 diag(1, −1) 和 [[0, 1], [1, 0]]。</p>
      <p>对给定频率簇分别求两个伙伴的权重，再作非相干求和。简并子空间的数值本征矢可以换基。上表的 Born 投影来自声子数据，此处的 Raman 权重来自归一化模型。数据包的响应数据限于 Born 有效电荷。极化率导数和实测 Raman 强度须另外取得。</p>
      <label for="zir-raman-angle"><span>入射偏振与 x 轴的夹角</span>
        <input id="zir-raman-angle" type="range" min="0" max="90" step="1" value="${angle}">
        <output id="zir-raman-angle-value" for="zir-raman-angle"></output>
      </label>
      <div class="obs-links">
        <button type="button" class="secondary" data-zir-raman-angle="0">0°</button>
        <button type="button" class="secondary" data-zir-raman-angle="45">45°</button>
      </div>
      <p>依次比较 0° 和 45°。哪一个伙伴在平行分析器中变亮？再检查整簇的合计。</p>
      <div class="table-wrap" tabindex="0" aria-label="归一化 Raman 偏振权重">
        <table><thead><tr><th scope="col">E₂ 对称适配基</th><th scope="col">平行分析</th><th scope="col">交叉分析</th></tr></thead>
        <tbody>${row('diagonal','x²−y²')}${row('offdiagonal','xy')}${row('total','两伙伴合计')}</tbody></table>
      </div>
      <p><a href="https://journals.aps.org/prb/abstract/10.1103/PhysRevB.85.165208" target="_blank" rel="noreferrer">实验阅读 · ZnO 的偏振 Raman 背散射 ↗</a></p>
    </div>
  </section>`;
}

function bindRamanExercise(root, state, isCurrent) {
  const get = id => root.querySelector('#zir-raman-'+id);
  const prediction = get('predict'), check = get('check'), result = get('result'), status = get('status'), angle = get('angle');
  const active = () => isCurrent() && get('predict') === prediction;
  const selected = () => ramanPredictions.includes(state.ramanPrediction);
  const update = () => {
    if (!active()) return;
    const value = Number(angle.value);
    if (!degreesIn(value, 90)) return;
    state.ramanAngle = value;
    const {parallel,crossed,total} = projectZnOE2Raman(value);
    get('angle-value').textContent = value+'°';
    angle.setAttribute('aria-valuetext',value+'°');
    for (const [channel,weights] of Object.entries({parallel,crossed})) {
      get(channel+'-diagonal').textContent = String(shown(weights[0]));
      get(channel+'-offdiagonal').textContent = String(shown(weights[1]));
      get(channel+'-total').textContent = String(shown(total[channel]));
    }
  };
  const reveal = () => {
    result.hidden = false;
    check.setAttribute('aria-expanded','true');
    status.textContent = state.ramanPrediction === 'raman' ?
      '预测正确。用下方的偏振几何核对两个伙伴。' : '请用特征标表的极向量列和二次函数列修正判断。';
    update();
  };
  prediction.onchange = () => {
    if (!active()) return;
    state.ramanPrediction = ramanPredictions.includes(prediction.value) ? prediction.value : '';
    state.ramanChecked = false;
    result.hidden = true;
    check.setAttribute('aria-expanded','false');
    status.textContent = '';
  };
  check.onclick = () => {
    if (!active()) return;
    if (!selected()) {
      status.textContent = '请先选择一个答案。';
      return;
    }
    state.ramanChecked = true;
    reveal();
  };
  angle.oninput = update;
  for (const button of root.querySelectorAll('[data-zir-raman-angle]')){
    button.onclick = () => {
      if (!active()) return;
      angle.value = button.dataset.zirRamanAngle;
      update();
    };
  }
  if (state.ramanChecked && selected()) reveal();
}

function predictionMenu(id, label, selected) {
  const choices = [['','请选择'],['z','沿 z'],['x','沿 x'],['equal','两方向相同']];
  return `<label for="zir-predict-${id}">${label}</label>
  <select id="zir-predict-${id}">${choices.map(([value,text]) =>
    `<option value="${value}" ${selected === value ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
}

function labHtml(data, theta, phi) {
  const [a1,e1,e2Low,e2High] = data.groups;
  const rows = [
    ['a1','A₁',a1.frequency],
    ['e1-1','E₁ 基底分量 1',e1.frequency],
    ['e1-2','E₁ 基底分量 2',e1.frequency],
    ['e1-total','E₁ 整簇总和',e1.frequency],
    ['e2-low','E₂ 低频簇',e2Low.frequency],
    ['e2-high','E₂ 高频簇',e2High.frequency],
  ];
  return `<div class="mr-slider-row">
    <label for="zir-polarization"><span>偏振与 z 轴的夹角 θ</span>
      <input type="range" id="zir-polarization" min="0" max="90" step="1" value="${theta}" aria-describedby="zir-polarization-help">
      <output id="zir-theta" for="zir-polarization"></output>
    </label>
    <label for="zir-basis"><span>E₁ 简并子空间的基底转角 φ</span>
      <input type="range" id="zir-basis" min="0" max="180" step="1" value="${phi}" aria-describedby="zir-basis-help">
      <output id="zir-phi" for="zir-basis"></output>
    </label>
  </div>
  <p id="zir-polarization-help">偏振位于 xz 平面，0° 沿 z，90° 沿 x。</p>
  <p id="zir-basis-help">基底转角只混合 E₁ 的两个模式。固定偏振时，两项可以重新分配，整簇总和保持不变。</p>
  <p><var>S</var> = |<var>ε</var> · <var>d</var>|<sup>2</sup>. <var>ε</var> 表示单位偏振，<var>d</var> 表示模式偶极。整簇投影是各项之和。</p>
  <div class="table-wrap" tabindex="0" aria-label="模式偶极偏振投影">
  <table><thead><tr><th scope="col">模式或模式簇</th><th scope="col">计算频率（THz）</th><th scope="col">投影 S (e<sup>2</sup>/u)</th></tr></thead>
  <tbody>${rows.map(([id,text,frequency])=>`<tr><th scope="row">${text}</th><td>${shown(frequency)}</td>
    <td><output data-zir-value="${id}"></output> <meter data-zir-meter="${id}" min="0" max="0.75" value="0" aria-hidden="true"></meter></td></tr>`).join('')}
  </tbody></table></div>
  <p>试着移动两个滑杆，核对 E₂ 两个簇的投影。</p>`;
}

/** Mount after the parent disclosure is opened. The returned cleanup aborts
 * reads and retires handlers. The optional state object survives a same-view
 * redraw, while verified fixture identity remains private to this module. */
export function bindZnOIRPolarization({root,isCurrent=()=>true,state={}}){
  let active = true, pending = null, data = verifiedByState.get(state);
  const current = () => active && root.isConnected !== false && isCurrent();
  const get = selector => root.querySelector(selector);
  const initialA1 = predictions.includes(state.a1) ? state.a1 : '';
  const initialE1 = predictions.includes(state.e1) ? state.e1 : '';
  root.innerHTML = `<section class="mr-scope" aria-labelledby="zir-heading">
    <h3 id="zir-heading">ZnO Γ 点模式的红外偏振</h3>
    <p>先预测。比较沿 z 与沿 x 的偏振，哪个方向的模式偶极投影更大？</p>
    <div class="mr-choices">
      <div>${predictionMenu('a1','A₁ 模式',initialA1)}</div>
      <div>${predictionMenu('e1','E₁ 整簇',initialE1)}</div>
    </div>
    <p>构造模式偶极时，先将 Γ 点本征矢按原子质量平方根的倒数加权，再作用 Born 有效电荷。这里比较四组计算得到的光学模式，所用声子计算关闭了非解析修正。</p>
    <div class="obs-links">
      <a href="docs/phonopy-import.md#zno-derived-example">ZnO 本征矢与力数据来源 →</a>
      <a href="${bornSource}" target="_blank" rel="noreferrer">固定版本的 Born 有效电荷 ↗</a>
    </div>
    <button type="button" id="zir-load" class="secondary">核验并载入 ZnO Γ 点数据</button>
    <button type="button" id="zir-cancel" class="secondary" hidden>取消载入</button>
    <p id="zir-status" role="status"></p><p id="zir-error" role="alert" hidden></p>
    <p id="zir-prediction" role="status"></p>
    <div id="zir-lab"></div>
  </section>`;
  const load = get('#zir-load'), cancel = get('#zir-cancel'), status = get('#zir-status');
  const error = get('#zir-error'), feedback = get('#zir-prediction'), lab = get('#zir-lab');

  function updatePrediction() {
    if (!data) return;
    const selected = clusterIds.slice(0,2).filter(id => predictions.includes(state[id]));
    if (!selected.length) {
      feedback.textContent = '将偏振分别调到 0° 和 90°，对照 A₁ 模式和 E₁ 整簇的投影。';
      return;
    }
    const atZ = projectZnOIRPolarization(data, 0, 0).clusters;
    const atX = projectZnOIRPolarization(data, 90, 0).clusters;
    const matches = selected.filter(id => {
      const diff = atZ[id].total - atX[id].total;
      const expected = Math.abs(diff) < data.checks.tolerance ? 'equal' : diff > 0 ? 'z' : 'x';
      return state[id] === expected;
    }).length;
    feedback.textContent = `你的预测有 ${matches} / ${selected.length} 项与两种偏振的计算结果一致。`;
  }
  for (const id of clusterIds.slice(0,2)) {
    const select = get('#zir-predict-'+id);
    select.onchange = () => {
      if (!current()) return;
      state[id] = predictions.includes(select.value) ? select.value : '';
      updatePrediction();
    };
  }
  function showLab(focus=false) {
    const theta = degreesIn(state.theta,90) ? state.theta : 45;
    const phi = degreesIn(state.phi,180) ? state.phi : 0;
    status.textContent = 'ZnO 示例数据已载入。';
    lab.innerHTML = labHtml(data,theta,phi)+ramanExerciseHTML(state);
    load.hidden = true;
    const angle = get('#zir-polarization'), basis = get('#zir-basis');
    const rows = [...lab.querySelectorAll('[data-zir-value]')].map(output => ({
      id:output.dataset.zirValue, output, meter:lab.querySelector(`[data-zir-meter="${output.dataset.zirValue}"]`),
    }));
    function update() {
      if (!current()) return;
      state.theta = Number(angle.value);
      state.phi = Number(basis.value);
      const result = projectZnOIRPolarization(data,state.theta,state.phi).clusters;
      const values = {
        a1:result.a1.total, 'e1-1':result.e1.components[0], 'e1-2':result.e1.components[1],
        'e1-total':result.e1.total, 'e2-low':result['e2-low'].total, 'e2-high':result['e2-high'].total,
      };
      for (const {id,output,meter} of rows) {
        output.textContent = String(shown(values[id]));
        meter.value = values[id];
      }
      get('#zir-theta').textContent = state.theta+'°';
      get('#zir-phi').textContent = state.phi+'°';
      angle.setAttribute('aria-valuetext',state.theta+'°');
      basis.setAttribute('aria-valuetext',state.phi+'°');
    }
    angle.oninput = basis.oninput = update;
    update();
    updatePrediction();
    bindRamanExercise(lab,state,current);
    if (focus) angle.focus?.();
  }

  function cancelRead() {
    if (!pending) return;
    pending.abort();pending=null;
    status.textContent='';
    load.disabled=false;cancel.hidden=true;
  }
  cancel.onclick = () => {
    if (!current()) return;
    cancelRead();
    load.focus?.();
  };
  load.onclick = async () => {
    if (!current() || pending || data) return;
    const request = new AbortController();
    pending = request;load.disabled=true;cancel.hidden=false;error.hidden=true;
    status.textContent = '正在读取并核验 ZnO Γ 点数据…';
    const owns = () => current() && pending === request && !request.signal.aborted;
    try {
      const loaded = await fetchData(request.signal);
      if (!owns()) return;
      data = loaded;
      verifiedByState.set(state,data);
      showLab(true);
    } catch {
      if (owns()) {
        status.textContent = '';
        error.textContent = 'ZnO 数据暂时无法读取或核验。你的预测已保留，可以重试。';
        error.hidden = false;
      }
    } finally {
      if (current() && pending === request) {
        pending = null;load.disabled=false;cancel.hidden=true;
      }
    }
  };
  if (data) showLab();
  return () => {active=false;pending?.abort();pending=null;};
}
