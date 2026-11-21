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
    <h3 id="sc-seitz-comparison-title">Compare fourfold rotations and screws</h3>
    <p>${models.map(symbol).join(' · ')}</p>
    <p>Start at the same fractional coordinates and rotate +90° about z at every step. Which operations move the point to a different cell after four applications? Make a prediction, then check it with the representative operation of each space group.</p>
    <p>${math('r=(' + point.join(',') + ')')}</p>
    <form id="sc-seitz-comparison-form">
      <label>Axial wavevector (reciprocal fractional units) ${math('k_z')}
        <input id="sc-seitz-comparison-k" type="number" step="any" value="0.25" required></label>
      <div class="sc-actions">
        <button id="sc-seitz-comparison-run" type="submit" class="primary">Calculate all three operations</button>
        <button id="sc-seitz-comparison-cancel" type="button" class="secondary" hidden>Cancel comparison</button>
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
    output.innerHTML = resultTable("Comparison after four applications",
      ["space group", "Axial shift per step", "Total axial shift", "Bloch phase after four applications"],
      results.map(({model, result}) => ({id: model.id, heading: symbol(model), values: [
        result.frames[1].translationExact[2], result.frames[4].translationExact[2],
        formatComplex(result.frames[4].blochPhase)
      ]}))) + `<p>All three rotations return to the identity after four applications. Their wrapped endpoints coincide with the starting point. Translation by whole cells still determines the phase.</p>
      <p>The total axial translation ${math('L_z')} gives the phase ${math('e^{-2\\pi i k_z L_z}')}. Try a wavevector of 0 and see how the translations and phases change.</p>
      <p>Select a model to compare unwrapped and wrapped coordinates at each step.</p>
      <div class="sc-actions" role="group" aria-label="Select a step-by-step trajectory">${models.map(model =>
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
      trace.innerHTML = `<p>${symbol(selected.model)}</p>` + resultTable("Axial position at each step",
        ["Applications", "Unwrapped axial coordinate", "Wrapped axial coordinate"],
        selected.result.frames.map(frame => ({id: frame.step, heading: frame.step, values: [
          formatNumber(frame.unwrapped[2]), formatNumber(frame.wrapped[2])
        ]})));
    }

    for (const [index, button] of buttons.entries()) button.onclick = () => selectModel(results[index]);
    selectModel(results[0]);
  }

  form.oninput = () => clearCalculation("Wavevector updated. Run the comparison again to see the result.");
  cancel.onclick = () => clearCalculation("Comparison cancelled.");
  form.onsubmit = async event => {
    event.preventDefault();
    const kz = Number(input.value);
    if (submit.disabled || !input.value.trim() || !Number.isFinite(kz) || !isCurrent()) return;
    const ticket = ++revision;
    const results = [];
    submit.disabled = true;
    cancel.hidden = false;
    output.innerHTML = '';
    status.textContent = "Calculating all three models…";
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
      status.textContent = "Comparison complete.";
    } catch {
      if (current(ticket)) clearCalculation("The comparison did not finish. Run it again to retry.");
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
