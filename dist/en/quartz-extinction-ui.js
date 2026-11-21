import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261122-nextpaths1';

const source = quartzStructureCases.find(example => example.id === 'original');
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const axialOptions = [
  ['all', "All three reflections pass"],
  ['even', "Only 002 passes"],
  ['thirds', "Only 003 passes"],
];
const phaseOptions = [
  ['intensity', "The intensities differ"],
  ['conjugate', "Equal intensities, opposite imaginary parts"],
  ['extinct', "Both reflections are extinct"],
];
const controls = [
  ['original', "Original CIF", [1, 0, 1]],
  ['friedel', "Original CIF, opposite reciprocal vector", [-1, 0, -1]],
  ['mirror', "Active inversion, fixed crystal axes", [1, 0, 1]],
  ['rebasedSameLabel', "Passive basis change, same indices", [1, 0, 1]],
  ['rebasedSameVector', "Passive basis change, same physical reciprocal vector", [-1, 0, -1]],
];

function predictions(id, label, options) {
  return `<div><label for="${id}">${label}</label>
    <select id="${id}"><option value="">Choose an answer</option>
      ${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}
    </select></div>`;
}

export function quartzExtinctionHTML() {
  return `<section class="sc-worked" data-quartz-extinction aria-labelledby="qe-title">
    <h3 id="qe-title">Can axial absences distinguish the two α-quartz enantiomorphs?</h3>
    <p>Expand one complete unit cell from the original 298 K CIF and use fixed real weights ${math('f_{\\mathrm{Si}}=14,\\ f_{\\mathrm{O}}=8')} to calculate diffraction. Compare three axial reflections, then compare the off-axis reflection 101 of the original and actively inverted structures.</p>
    <form data-qe-form>
      ${predictions('qe-axial',"Which axial reflection passes the screw-axis condition shared by both structures?",axialOptions)}
      ${predictions('qe-phase',"How do the intensity and imaginary part at 101 change when you invert the atomic positions and keep the crystal axes fixed?",phaseOptions)}
      <div class="sc-actions"><button type="submit" class="primary" data-qe-run>Read the original CIF and check</button>
        <button type="button" class="secondary" data-qe-cancel hidden>Cancel check</button></div>
    </form>
    <p data-qe-status role="status"></p><div data-qe-result></div>
    <p>This kinematic model uses atomic numbers as illustrative scattering weights.<a href="https://qiserver.ugr.es/cod/9005017.html" target="_blank" rel="noreferrer">Original structure and publication · COD 9005017 ↗</a></p>
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
  const axialTitle = "Axial reflections of the two enantiomorphs";
  const controlTitle = "Off-axis reflections and basis-change controls";
  const intensity = math('I=|F|^2');
  return `<h4>Compare axial reflections 001, 002 and 003</h4>
    <p class="sc-example-result">${axialGuess === 'thirds' ? "Your axial prediction was correct." : "Compare your axial prediction with the zero intensities in the first two rows."}</p>
    ${resultTable(axialTitle, ["Reflection","Original intensity","Inverted intensity"], axial.map(({original,mirror}) =>
      `<tr><th scope="row">${hkl(original.hkl)}</th><td>${fixed(original.intensity)}</td><td>${fixed(mirror.intensity)}</td></tr>`
    ))}
    <p>For axial reflections ${math('00\\ell')}, rotations about the axis leave the reciprocal vector fixed. The ${math('3_2')} screw in the original structure and the ${math('3_1')} screw in the inverted structure give the three phase factors in different orders. Both sums vanish unless ${math('\\ell=3n')}. Reflection 003 has nonzero intensity in this model.</p>
    <p>For the three periodic images of the same atom along the axis, the relative phases sum to ${math('1+\\mathrm{e}^{2\\pi i\\ell p/3}+\\mathrm{e}^{4\\pi i\\ell p/3}\\quad(p=1,2)')}。</p>
    <h4>Check phase and intensity off the axis</h4>
    <p class="sc-example-result">${phaseGuess === 'conjugate' ? "Your off-axis prediction was correct." : "Compare the original and active-inversion rows to check your off-axis prediction."}</p>
    ${resultTable(controlTitle, ["Structure or control","Reflection",math('\\Re F'),math('\\Im F'),intensity], controls.map(([id,label]) => {
      const row = control[id];
      return `<tr><th scope="row">${label}</th><td>${hkl(row.hkl)}</td><td>${fixed(row.real)}</td><td>${fixed(row.imag)}</td><td>${fixed(row.intensity)}</td></tr>`;
    }))}
    <p>Inverting the positions while keeping the crystal axes fixed conjugates the original 101 amplitude. With real scattering weights,${math('F(-\\mathbf h)=F(\\mathbf h)^*')}, so the squared magnitudes agree. The nonzero 101 intensity also shows the scope of the axial condition.</p>
    <details><summary>Check the indices after a passive basis change</summary>
      <p>Negate the lattice matrix and fractional coordinates together to keep the atoms fixed in physical space. Negate the indices as well to keep the same physical reciprocal vector. The last two rows show that retaining the indices selects the opposite physical reciprocal vector.</p>
    </details>
    <p>Determining absolute handedness requires a measurement sensitive to chirality.<a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">Friedel's law ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.100.145502" target="_blank" rel="noreferrer">Resonant diffraction experiment on quartz with circular polarization ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.108.019901" target="_blank" rel="noreferrer">Erratum to the experimental paper ↗</a></p>
    <p><a href="#structure?quartz-hand=practice">Check the three quartz structures in the structure workbench →</a> · <a href="#compute/diffraction">Open the diffraction tool to inspect individual atomic phases →</a></p>`;
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
    if(!disposed && isCurrent()) clear("Prediction changed. You can run the check again.");
  };
  cancel.onclick = () => {
    if(!disposed && isCurrent()) {
      clear("Check canceled.");
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
      status.textContent = "Make both diffraction predictions first.";
      unanswered[0].focus();
      return;
    }

    const request = {controller:new AbortController(), task:null};
    active = request;
    submit.disabled = true;
    cancel.hidden = false;
    output.innerHTML = '';
    status.textContent = "Reading the original 298 K CIF…";
    try {
      const response = await fetchSource(source.url, {signal:request.controller.signal});
      if(!response.ok) throw new Error('CIF fetch failed');
      const bytes = await response.arrayBuffer();
      if(!current(request)) return;
      if(bytes.byteLength !== source.byteCount) throw new Error('CIF byte count changed');
      const content = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
      status.textContent = "Computing axial and off-axis reflections for quartz…";
      request.task = run('quartz_extinction', {content});
      const result = await request.task;
      if(!current(request)) return;
      output.innerHTML = resultHTML(checkedModel(result), axialGuess, phaseGuess);
      status.textContent = "Diffraction predictions checked.";
    } catch {
      if(current(request)) status.textContent = "Could not complete the quartz diffraction check. Read the CIF and try again.";
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
