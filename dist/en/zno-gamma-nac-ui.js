import {mathHTML} from './math-display.js?v=20261116-prose3';

const sourceFiles = [
  ['qpoints', 'phonopy-zno-qpoints.yaml', 55277, '37b738912bec7bd696a90a16c674fa6e745fc0a2df355e380818760893c1e0b5'],
  ['structure', 'phonopy-zno-structure.yaml', 7641, '93f4adbeafa702a85c30da81f17895c13bf38e1d88fe55433966c9137138b40c'],
  ['born', 'phonopy-zno-BORN', 112, '902118e6b31c9046c0b22eadac279e079563d2386e675a88409443923ee5063e']
];
const sourceRevision = '0937453a793eb504f674b7d4fd98421d508008e6';
const presets = [
  ['axial', "Along c [0, 0, 1]", [0, 0, 1]],
  ['basal', "In the basal plane [1, 0, 0]", [1, 0, 0]],
  ['oblique', "Oblique [1, 0, 1]", [1, 0, 1]]
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
const label = key => symmetryLabels[key] ? math(symmetryLabels[key]) : key === 'acoustic' ? "Acoustic" : "Other";
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
  const feedback = guess === answer ? "The calculation agrees with your prediction." : "Use the calculated longitudinal dipole weights to check your prediction again.";
  const rows = baseline.modes.map((mode, index) => [mode.band + 1, fmt(mode.frequencyTHz),
    parentComponents(mode), fmt(corrected.modes[index].frequencyTHz), parentComponents(corrected.modes[index])]);
  return `<h4>Compare results for the same direction</h4>
    <p id="zgn-feedback" class="pd-current">${feedback} ${math('A_1')} · ${weights[0]}%　${math('E_1')} · ${weights[1]}%</p>
    <p>Each side is sorted by frequency. Use the projections to identify the parent-mode components of each corrected mode.</p>
    ${table("Twelve phonon modes before and after the correction", ["Order", "Uncorrected frequency (THz)", "Parent mode", "Corrected frequency (THz)", "Parent-mode weights after correction"], rows)}
    <details open><summary>How the correction changes the frequencies</summary>
      <ol>
        <li>Convert the direction to a Cartesian unit vector ${math(String.raw`\hat{\mathbf q}`)} = (${direction.cartesianUnit.map(fmt).join(', ')})
          <p>Multiply all three components by the same factor or reverse all three signs, then recalculate.</p></li>
        <li>The Born effective charges project the displacements onto the longitudinal dipole. The electronic dielectric tensor sets the screening denominator. The outer product of the longitudinal dipole vector gives the correction.
          <p>Screening denominator ${fmt(electrostatics.screening)} · Rank of the correction ${checks.correctionRank}</p>
          ${formula(String.raw`v_{\kappa\alpha}=\frac{\sum_\gamma\hat q_\gamma Z^*_{\kappa,\gamma\alpha}}{\sqrt{M_\kappa}},\quad
          \Delta D=\frac{4\pi C}{\Omega\,\hat{\mathbf q}^{\mathsf{T}}\varepsilon_\infty\hat{\mathbf q}}\,v v^{\mathsf{T}}`)}
          <p>C is the unit conversion factor in the source file and Ω is the primitive-cell volume.</p>
          <p>Subtract the mean Born tensor of the four atoms from each atom's tensor. Their sum becomes zero, so a rigid translation produces no dipole.</p></li>
        <li>Recompute the eigenvalues and eigenvectors of the corrected dynamical matrix. In the oblique case, look for branches with components from both polar parent subspaces.</li>
      </ol>
    </details>
    <section class="pd-section" aria-labelledby="zgn-raw-title">
      <h5 id="zgn-raw-title">Counterexample with the raw Born charges</h5>
      <p>Predict how the three near-zero acoustic frequencies will change. Keep the direction fixed and repeat the calculation with the raw Born effective charges.</p>
      <button id="zgn-counterexample" class="secondary" type="button">Recalculate with the raw Born charges</button>
      <div id="zgn-raw-result"></div>
    </section>`;
}

function rawResult(neutral, raw) {
  const rows = neutral.baseline.modes.slice(0, 3).map((mode, i) => [i + 1,
    fmt(mode.frequencyTHz), fmt(neutral.corrected.modes[i].frequencyTHz), fmt(raw.corrected.modes[i].frequencyTHz)]);
  const diagonal = result => result.electrostatics.appliedBornChargeSum.map((row, i) => fmt(row[i])).join(', ');
  const residuals = [neutral, raw].map(result => fmt(result.checks.correctionTranslationMaxResidual));
  return table("Three acoustic modes for the same direction", ["Order", "Uncorrected frequency (THz)", "Neutralized charges (THz)", "Raw Born charges (THz)"], rows) + `
    <p>Sum the effective-charge tensors over the four atoms. All off-diagonal elements are zero in these data.</p>
    <ul><li>Diagonal of the sum after neutralization (${diagonal(neutral)})</li><li>Diagonal of the raw charge sum (${diagonal(raw)})</li></ul>
    <p>Applying the correction matrix to the rigid translations gives maximum absolute residuals of ${residuals.join(' · ')}. With neutralization, the correction preserves rigid translations. The raw charge sum is nonzero and spuriously shifts one acoustic frequency away from zero. The uncorrected matrix already has small numerical residuals in the acoustic frequencies.</p>`;
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
    <h3 id="zgn-title">LO–TO splitting near Γ in ZnO</h3>
    <p>Compare two results from the same ZnO dynamical matrix. Approach Γ along the chosen direction and calculate the nonanalytic correction from the long-range electric field in that limit.</p>
    <form id="zgn-form" class="pd-section">
      <p>Choose a direction and predict which Γ-point parent modes couple to the longitudinal electric field. The calculation checks your prediction using the displayed shares of longitudinal dipole weight in the two polar subspaces.</p>
      <div class="pd-actions" role="group" aria-label="Cartesian direction presets">${presets.map(([id, text]) =>
        `<button id="zgn-${id}" class="secondary" type="button">${text}</button>`).join('')}</div>
      <label for="zgn-coordinates">Coordinates for the direction components</label>
      <select id="zgn-coordinates"><option value="cartesian">Cartesian coordinates</option><option value="primitive-reciprocal">Primitive reciprocal fractional coordinates</option></select>
      <div class="pd-answer-grid">${axes.map((axis, i) => `<div><label for="zgn-${axis}">${axis}</label>
        <input id="zgn-${axis}" type="number" inputmode="decimal" step="any" value="${presets[0][2][i]}" required></div>`).join('')}</div>
      <label for="zgn-prediction">Which parent modes will couple?</label>
      <select id="zgn-prediction" required>
        <option value="">Choose a prediction</option><option value="a1">A₁ only</option><option value="e1">E₁ only</option><option value="both">Both A₁ and E₁</option>
      </select>
      <div class="pd-actions"><button id="zgn-run" class="primary" type="submit">Verify the source files and calculate</button>
        <button id="zgn-cancel" class="secondary" type="button" hidden>Cancel this request</button></div>
      <p id="zgn-status" role="status"></p><p id="zgn-error" role="alert" hidden></p>
    </form>
    <div id="zgn-result"></div>
    <p>The frequencies come from a pinned Phonopy example. When you run the calculation, the page verifies the SHA-256 of three files and uses Python to compare frequencies from the same Γ-point matrix.</p>
    <p><a href="data/examples/phonopy-zno-source.json">View sources, generation settings and license →</a></p>
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
    status.textContent = verifiedSources ? "Calculating the Γ limit with Python…" : "Loading and verifying the ZnO source files…";
    refresh();
    try {
      const sources = verifiedSources ?? await readSources(job.controller.signal);
      if (!owns()) return;
      verifiedSources = sources;
      status.textContent = "Calculating the Γ limit with Python…";
      job.task = run('zno_gamma_nac', {...sources, ...input, correction});
      const calculated = await job.task;
      if (!owns()) return;
      validateResult(calculated, input, correction);
      if (correction === 'raw') {
        get('raw-result').innerHTML = rawResult(neutral, calculated);
        status.textContent = "The raw Born charge counterexample is ready.";
      } else {
        result.innerHTML = mainResult(calculated, guess);
        neutral = calculated;
        get('counterexample').onclick = () => {
          if (current() && !currentJob && neutral) return calculate(input, 'raw');
        };
        status.textContent = "The frequency comparison is ready.";
      }
    } catch {
      if (owns()) {
        error.textContent = verifiedSources ? "The calculation did not finish. Try again." : "The ZnO source files could not be loaded or verified. Try again.";
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
      error.textContent = "Enter three components with at least one nonzero value and choose a prediction.";
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
    status.textContent = "Request cancelled. Your direction and prediction are still in the form.";
    (rawWasRunning ? get('counterexample') : submit).focus?.();
  };
  refresh();
  return () => {active = false; stop();};
}
