import {validateStructureDiffractionHandoff} from './structure-diffraction-handoff.js?v=20261120-structure-diffraction1';

const dataset = Object.freeze({
  filename: 'zno-mode-quadrature.json',
  bytes: 34241,
  sha256: 'e2186db63054497d22d25f2203739d9cf195733978505afe45bd7294ccbfcacc',
  url: new URL('./data/examples/zno-mode-quadrature.json?v=20261120-zno-satellite1', import.meta.url),
});
const modes = Object.freeze({parent: 0, full: 1, half: .5});
const verifiedByState = new WeakMap();
const stateKeys = Object.keys(modes);

function wrapUnit(value) {
  return value - Math.floor(value);
}

function interpolate(parent, distorted) {
  return parent.map((coordinate, i) => {
    const displacement = distorted[i] - coordinate;
    return wrapUnit(coordinate + .5 * (displacement - Math.round(displacement)));
  });
}

/** The half-amplitude snapshot uses the shortest per-axis fractional
 * displacement in the shared periodic box. Parent and full remain exact. */
export function znOSatelliteGeometry(data, stateKey) {
  if (!Object.hasOwn(modes, stateKey)) throw new RangeError('未知的 ZnO 结构状态。');
  const {parent,distorted} = data;
  return {
    cell: parent.lattice.map(row => [...row]),
    atoms: parent.atoms.map(({symbol,coordinates}, index) => {
      const frozen = distorted.atoms[index].coordinates;
      const fractional = stateKey === 'parent' ? [...coordinates] :
        stateKey === 'full' ? [...frozen] : interpolate(coordinates, frozen);
      return {species:symbol,fractional};
    }),
  };
}

function validateData(data) {
  const {parent,distorted} = data;
  if (data.schema !== 'symmetry-lab.zno-mode-quadrature.v1' ||
      data.source?.commit !== '0937453a793eb504f674b7d4fd98421d508008e6' ||
      data.source?.nonAnalyticCorrection !== false ||
      parent?.lengthUnit !== 'angstrom' || distorted?.lengthUnit !== 'angstrom' ||
      parent.atoms?.length !== 64 || distorted.atoms?.length !== 64 ||
      JSON.stringify(parent.lattice) !== JSON.stringify(distorted.lattice) ||
      !parent.atoms.every((atom, i) => ['Zn','O'].includes(atom.symbol) && atom.symbol === distorted.atoms[i]?.symbol)) {
    throw new Error('ZnO 数据与固定超胞设置不一致。');
  }
  return data;
}

async function fetchData(signal) {
  const response = await fetch(dataset.url, {signal});
  if (!response.ok) throw new Error('ZnO 数据读取失败。');
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  if (bytes.byteLength !== dataset.bytes) throw new Error('ZnO 数据的字节数与固定版本不一致。');
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  signal.throwIfAborted();
  const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  if (hex !== dataset.sha256) throw new Error('ZnO 数据的 SHA-256 与固定版本不一致。');
  return validateData(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)));
}

function requestFor(data,stateKey) {
  const handoff = validateStructureDiffractionHandoff({
    custom: znOSatelliteGeometry(data,stateKey),
    source:{format:'cell',filename:dataset.filename,sha256:dataset.sha256,atomCount:64},
  });
  if (!handoff) throw new Error('ZnO 晶胞不符合衍射输入格式。');
  return {
    handoff,stateKey,hkl:[1,0,1],scatteringFactors:{Zn:1,O:1},
    sourceEvidence:{
      kind:'zno-satellite', datasetSHA256:dataset.sha256,stateKey,
      fractionOfFrozenDisplacement:modes[stateKey],source:structuredClone(data.source),settings:structuredClone(data.settings),
    },
  };
}

function prediction(id,label,choices,answer) {
  return `<label for="zsat-predict-${id}">${label}</label>
  <select id="zsat-predict-${id}">${choices.map(([value,text]) =>
    `<option value="${value}" ${answer === value ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
}

export function bindZnOSatellite({root,isCurrent=()=>true,state={},onLoad}) {
  let active=true, pending=null;
  const current = () => active && root.isConnected !== false && isCurrent();
  const get = id => root.querySelector('#zsat-'+id);
  root.innerHTML = `<section class="mr-scope" aria-labelledby="zsat-heading">
   <h3 id="zsat-heading">ZnO 冻结声子与衍射卫星反射</h3>
   <p>先预测。保持同一 64 原子超胞，比较母相、全幅冻结和半幅冻结。</p>
   <p>默认用超胞指标 <var>H</var> = (1, 0, 1)，各原子的散射因子 <var>f</var><sub>j</sub> = 1。强度是这个等权运动学模型的相对值。</p>
   <div class="mr-choices">
    <div>${prediction('parent','母相在这个反射上的振幅如何？',[['','请选择'],['zero','相消为零'],['nonzero','保留非零振幅']],state.parentPrediction)}</div>
    <div>${prediction('half','在小位移下，冻结位移减半后，反射强度约为全幅的多少？',[['','请选择'],['quarter','四分之一'],['half','二分之一'],['equal','相同']],state.halfPrediction)}</div>
   </div>
   <div class="obs-links">
    <button class="secondary" type="button" id="zsat-parent">载入母相</button>
    <button class="secondary" type="button" id="zsat-full">载入全幅冻结</button>
    <button class="secondary" type="button" id="zsat-half">载入半幅冻结</button>
    <button class="secondary" type="button" id="zsat-cancel" hidden>取消载入</button>
   </div>
   <p>载入会替换当前晶胞、反射指标和散射因子。每次请手动运行，再用三次计算的复振幅和强度核对预测。</p>
   <div class="obs-links">
    <a href="docs/structure-dynamics.md#zno-satellite">ZnO 卫星反射的计算步骤与数据来源 →</a>
   </div>
   <p id="zsat-status" role="status"></p><p id="zsat-error" role="alert" hidden></p>
  </section>`;

  const status=get('status'), error=get('error'), cancel=get('cancel');
  const parentPrediction=get('predict-parent'), halfPrediction=get('predict-half');
  parentPrediction.onchange = () => {if(current())state.parentPrediction=parentPrediction.value;};
  halfPrediction.onchange = () => {if(current())state.halfPrediction=halfPrediction.value;};
  const buttons = stateKeys.map(key => [key,get(key)]);
  function refresh() {
    for (const [,button] of buttons) button.disabled = Boolean(pending) || typeof onLoad !== 'function';
    cancel.hidden = !pending;
  }
  function loadedMessage() {
    return verifiedByState.has(state) ? 'ZnO 数据包已通过 SHA-256 核验。' : '';
  }
  async function load(key) {
    if (!current() || pending || typeof onLoad !== 'function') return;
    const request = new AbortController();
    pending=request;error.hidden=true;
    status.textContent = '正在读取并核验 ZnO 冻结数据…';
    refresh();
    const owns = () => current() && pending === request && !request.signal.aborted;
    try {
      const data = verifiedByState.get(state) ?? await fetchData(request.signal);
      if (!owns()) return;
      const input = requestFor(data,key);
      verifiedByState.set(state,data);
      let accepted;
      try {accepted=onLoad(input);}
      catch {accepted=false;}
      if (accepted === false && owns()) {
        error.textContent='当前衍射表单无法接收预设。请重新打开计算页再试。';
        error.hidden=false;
      }
    } catch {
      if (owns()) {
        error.textContent='ZnO 冻结数据暂时无法读取或核验。当前输入和预测已保留。';
        error.hidden=false;
      }
    } finally {
      if (current() && pending === request) {
        pending=null;status.textContent=loadedMessage();refresh();
      }
    }
  }
  for (const [key,button] of buttons) button.onclick=()=>load(key);
  cancel.onclick = () => {
    if (!current() || !pending) return;
    pending.abort();pending=null;
    status.textContent=loadedMessage();
    refresh();
    get('parent').focus?.();
  };
  status.textContent=loadedMessage();
  refresh();
  return () => {active=false;pending?.abort();pending=null;};
}
