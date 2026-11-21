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
    <h3 id="sc-seitz-little-group-title">Does the screw stay in the little group as the wavevector changes?</h3>
    <p>Use the BC primitive-cell setting for space group No. 4 and the same twofold screw about z. A, B and C have the same axial component and different transverse components.</p>
    <p>${cases.map(({label, k}) => `${label} · ${math('(' + k.join(',') + ')')}`).join('　')}</p>
    <form id="sc-seitz-little-group-form">
      <label for="sc-seitz-little-group-prediction">At which wavevectors do you predict that the screw belongs to the little group?</label>
      <select id="sc-seitz-little-group-prediction" required>
        <option value="">Choose a prediction</option>
        <option value="all">A, B and C</option>
        <option value="axis-only">A only</option>
        <option value="axis-boundary">A and C</option>
      </select>
      <div class="sc-actions">
        <button id="sc-seitz-little-group-run" type="submit" class="primary">Calculate and check prediction</button>
        <button id="sc-seitz-little-group-cancel" type="button" class="secondary" hidden>Cancel check</button>
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
      'axis-boundary': "Correct. C changes its raw coordinates and folds back to the same wavevector.",
      'axis-only': "Check the wavevector difference for C. It equals one reciprocal lattice vector, so C also satisfies the little-group condition.",
      all: "Check the wavevector difference for B. A shift by half a reciprocal lattice vector gives a distinct wavevector after folding."
    };
    const description = "Two applications of the screw at three wavevectors";
    const headers = ["Starting k", "k′ after one step", "Difference k′−k", "Screw in little group?", "Translation phase of the square", "Single-valued workbench"];
    output.innerHTML = `<p>${answers[guess]}</p>
      <div class="sq-scroll" tabindex="0" role="region" aria-label="${description}">
        <table><caption class="sr-only">${description}</caption><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join('')}</tr></thead>
        <tbody>${results.map(({id, label, k, transformedK, difference, inLittleGroup, phase}) => {
          const verdict = inLittleGroup ? "In little group" : "Outside little group";
          const route = buildWorkbenchRoute({mode: 'sg', id: 4, k, doubleValued: false});
          return `<tr data-seitz-little-group-case="${id}"><th scope="row">${label} · ${vector(k)}</th>
            <td>${vector(transformedK)}</td><td>${vector(difference)}</td><td>${verdict}</td><td>${escapeHTML(formatComplex(phase))}</td>
            <td><a href="#${escapeHTML(route)}" aria-label="${"Open the single-valued workbench at wavevector"} ${vector(k)}">${"Open workbench"} →</a></td></tr>`;
        }).join('')}</tbody></table>
      </div>
      <p>${math(String.raw`k'=R^{-\mathsf{T}}k=(-k_x,-k_y,k_z)`)} · ${math(String.raw`k'-k\in\mathbb{Z}^3`)}</p>
      <p>In this primitive reciprocal basis, the wavevector difference must have three integer components. The difference is zero for A and a reciprocal lattice vector for C, so the screw preserves both wavevector spaces.</p>
      <p>Applying the screw twice gives a full lattice translation along z. The square has phase −1 in all three cases because their axial components are equal.</p>
      <p>The single-valued small representations at A and C give screw eigenvalues ±i within their respective wavevector spaces. At B, the first step connects different star arms. The square still gives the translation phase, while a screw eigenvalue requires a wavevector space preserved by the screw itself. Open the relevant workbench and run the calculation to compare its little-group operations.</p>`;
  }

  prediction.onchange = () => reset("Prediction changed. You can check it again.");
  cancel.onclick = () => {
    reset("Check canceled.");
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
    status.textContent = "Checking the three wavevectors…";
    try {
      for (const example of cases) {
        active = run('teaching_labs', {lab: 'seitz', preset: 'screw21', point: [.2, .3, .1], k: [...example.k], steps: 2});
        const result = await active;
        if(!current(ticket)) return;
        results.push({...example, ...checkCase(result, example.k)});
      }
      showResults(results, guess);
      status.textContent = "Check complete. The results are in the table below.";
    } catch {
      if(current(ticket)) reset("The little-group check did not finish. Try again.");
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
