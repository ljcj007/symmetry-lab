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
const verifiedByState = new WeakMap();
const radians = value => value * Math.PI / 180;
const shown = value => Number(value.toPrecision(6));
const degreesIn = (value, maximum) => Number.isFinite(value) && value >= 0 && value <= maximum;
const predictions = ['z', 'x', 'equal'];

function validateData(data) {
  const settings = data?.settings;
  if (data?.schema !== fixture.schema || data.source?.commit !== sourceCommit ||
      data.source?.nonAnalyticCorrection !== false || settings?.frequencyUnit !== 'THz' ||
      settings?.projectionUnit !== 'e^2/u' || settings?.qIndex !== 0 ||
      !Array.isArray(settings.q) || settings.q.length !== 3 || settings.q.some(value => value !== 0) ||
      !Number.isFinite(data.checks?.tolerance) ||
      !Array.isArray(data.groups) || data.groups.length !== clusterIds.length) {
    throw new Error("The ZnO data omit the expected Γ-point modes or units.");
  }
  for (const [index, cluster] of data.groups.entries()) {
    const count = index === 0 ? 1 : 2;
    if (cluster.id !== clusterIds[index] || !Number.isFinite(cluster.frequency) ||
        cluster.classification?.dimension !== count || !Array.isArray(cluster.modeDipoles) ||
        cluster.modeDipoles.length !== 3 || cluster.modeDipoles.some(row =>
          !Array.isArray(row) || row.length !== count || !row.every(Number.isFinite))) {
      throw new Error("The dimensions of the ZnO mode-dipole matrix do not match the selected cluster.");
    }
  }
  return data;
}

async function fetchData(signal) {
  const response = await fetch(fixture.url, {signal});
  if (!response.ok) throw new Error("The ZnO data could not be read.");
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  if (bytes.byteLength !== fixture.bytes) throw new Error("The ZnO data size differs from the pinned version.");
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  signal.throwIfAborted();
  const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  if (hex !== fixture.sha256) throw new Error("The ZnO data SHA-256 differs from the pinned version.");
  return validateData(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)));
}

/** θ is measured from +z toward +x. φ changes the E1 basis, never ε. */
export function projectZnOIRPolarization(data, thetaDegrees, phiDegrees) {
  if (!degreesIn(thetaDegrees, 90) || !degreesIn(phiDegrees, 180)) {
    throw new RangeError("Use a polarization angle from 0° to 90° and a basis angle from 0° to 180°.");
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

function predictionMenu(id, label, selected) {
  const choices = [['',"Choose an answer"],['z',"Along z"],['x',"Along x"],['equal',"Equal for both"]];
  return `<label for="zir-predict-${id}">${label}</label>
  <select id="zir-predict-${id}">${choices.map(([value,text]) =>
    `<option value="${value}" ${selected === value ? 'selected' : ''}>${text}</option>`).join('')}</select>`;
}

function labHtml(data, theta, phi) {
  const [a1,e1,e2Low,e2High] = data.groups;
  const rows = [
    ['a1','A₁',a1.frequency],
    ['e1-1',"E₁ basis component 1",e1.frequency],
    ['e1-2',"E₁ basis component 2",e1.frequency],
    ['e1-total',"E₁ cluster total",e1.frequency],
    ['e2-low',"Lower-frequency E₂ cluster",e2Low.frequency],
    ['e2-high',"Higher-frequency E₂ cluster",e2High.frequency],
  ];
  return `<div class="mr-slider-row">
    <label for="zir-polarization"><span>Polarization angle θ from the z axis</span>
      <input type="range" id="zir-polarization" min="0" max="90" step="1" value="${theta}" aria-describedby="zir-polarization-help">
      <output id="zir-theta" for="zir-polarization"></output>
    </label>
    <label for="zir-basis"><span>Basis rotation φ within the degenerate E₁ subspace</span>
      <input type="range" id="zir-basis" min="0" max="180" step="1" value="${phi}" aria-describedby="zir-basis-help">
      <output id="zir-phi" for="zir-basis"></output>
    </label>
  </div>
  <p id="zir-polarization-help">Polarization lies in the xz plane, from 0° along z to 90° along x.</p>
  <p id="zir-basis-help">The basis angle mixes the two E₁ modes. At fixed polarization, the two contributions can redistribute while their sum stays fixed.</p>
  <p><var>S</var> = |<var>ε</var> · <var>d</var>|<sup>2</sup>. <var>ε</var> is the polarization unit vector, and<var>d</var> is the mode dipole. The cluster projection is the sum over its modes.</p>
  <div class="table-wrap" tabindex="0" aria-label="Polarization projections of the mode dipoles">
  <table><thead><tr><th scope="col">Mode or cluster</th><th scope="col">Computed frequency (THz)</th><th scope="col">Projection S (e<sup>2</sup>/u)</th></tr></thead>
  <tbody>${rows.map(([id,text,frequency])=>`<tr><th scope="row">${text}</th><td>${shown(frequency)}</td>
    <td><output data-zir-value="${id}"></output> <meter data-zir-meter="${id}" min="0" max="0.75" value="0" aria-hidden="true"></meter></td></tr>`).join('')}
  </tbody></table></div>
  <p>Move both sliders and check the projections of the two E₂ clusters.</p>`;
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
    <h3 id="zir-heading">Infrared polarization of Γ-point ZnO modes</h3>
    <p>Predict first. Which polarization gives a larger mode-dipole projection, z or x?</p>
    <div class="mr-choices">
      <div>${predictionMenu('a1',"A₁ mode",initialA1)}</div>
      <div>${predictionMenu('e1',"E₁ cluster",initialE1)}</div>
    </div>
    <p>To construct each mode dipole, weight the Γ-point eigenvector by the inverse square root of each atomic mass and apply the Born effective charges. The comparison shows four selected groups of computed optical modes with the non-analytic correction switched off in the phonon calculation.</p>
    <div class="obs-links">
      <a href="docs/phonopy-import.md#zno-derived-example">Sources for ZnO eigenvectors and force data →</a>
      <a href="${bornSource}" target="_blank" rel="noreferrer">Born effective charges at the pinned revision ↗</a>
    </div>
    <button type="button" id="zir-load" class="secondary">Verify and load the ZnO Γ-point data</button>
    <button type="button" id="zir-cancel" class="secondary" hidden>Cancel loading</button>
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
      feedback.textContent = "Set the polarization to 0° and then 90° and compare the projections for A₁ and the E₁ cluster.";
      return;
    }
    const atZ = projectZnOIRPolarization(data, 0, 0).clusters;
    const atX = projectZnOIRPolarization(data, 90, 0).clusters;
    const matches = selected.filter(id => {
      const diff = atZ[id].total - atX[id].total;
      const expected = Math.abs(diff) < data.checks.tolerance ? 'equal' : diff > 0 ? 'z' : 'x';
      return state[id] === expected;
    }).length;
    feedback.textContent = `Your predictions match for ${matches} / ${selected.length} of the comparisons between the two polarizations.`;
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
    status.textContent = "The ZnO data package matches the pinned SHA-256.";
    lab.innerHTML = labHtml(data,theta,phi);
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
    status.textContent = "Reading and verifying the ZnO Γ-point data…";
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
        error.textContent = "The ZnO data could not be read or verified. Your predictions are still in place. Try again.";
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
