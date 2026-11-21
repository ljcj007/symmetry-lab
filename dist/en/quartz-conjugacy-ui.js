import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261120-quartz-hand1';

const source = quartzStructureCases.find(example => example.id === 'original');
const candidates = [
  [2, 'y,x,2/3-z'],
  [4, '-x,-x+y,1/3-z'],
  [6, 'x-y,-y,-z']
];
const classNames = {
  identity: "Identity",
  transposition: "Swap two sites",
  'three-cycle': "Cycle three sites"
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
    <h3 id="qc-title">Which CIF operation fixes the second Si site in α-quartz?</h3>
    <p>The experimental CIF at 298 K lists one independent Si site. Apply row 3 to obtain the second periodic Si site.</p>
    <p>${math(String.raw`p_1=(0.46970,0,0)`)} → <code>-y,x-y,2/3+z</code> → ${math(String.raw`p_2=(0,0.46970,\tfrac23)`)}</p>
    <p>Choose one of the three operations. The result represents the same periodic site when all three fractional coordinates change by integers.</p>
    <form data-qc-form>
      <label for="qc-prediction">Which row sends the second Si site to an equivalent position?</label>
      <select id="qc-prediction" required><option value="">Make a prediction</option>${candidates.map(([row, xyz]) => `<option value="${row}">${row} · ${esc(xyz)}</option>`).join('')}</select>
      <div class="sc-actions"><button type="submit" class="primary" data-qc-run>Read the original CIF and check</button><button type="button" class="secondary" data-qc-cancel hidden>Cancel check</button></div>
    </form>
    <p data-qc-status role="status"></p><div data-qc-result></div>
    <p>The CIF describes the structure measured at 298 K. The calculation treats its reported coordinates as exact fractions to replay the operations on those values.</p>
    <p><a href="https://qiserver.ugr.es/cod/9005017.html" target="_blank" rel="noreferrer">Experimental CIF and reference · COD 9005017 ↗</a></p>
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
  const verdict = guess === representativeRow ? "Your prediction was correct." : "Compare your choice with the computed result.";
  const stabilizer = site => math(`\\bar H_{p_${site.id}}=\\{${site.stabilizer.map(({row}) => `\\bar g_{${row}}`).join(',')}\\}`);
  const oxygenCharacter = ({rows}) => oxygen.sites.filter(site => site.stabilizer.some(({row}) => row === rows[0])).length;
  const traceTitle = "Fixed-site counts by conjugacy class modulo translations";
  return `<p class="sc-example-result">${verdict} ${"The nonidentity operation fixing the second periodic Si site is CIF row"} ${representativeRow}</p>
    <h4>Compare stabilizers modulo translations</h4>
    <p>${stabilizer(silicon.sites[0])}　${stabilizer(silicon.sites[1])}</p>
    <p>${"A bar denotes an operation modulo full lattice translations. Row"} ${byRow} ${"sends the first Si site to the second. Conjugate the operation that fixes the first site."} ${math(`h=g_{${byRow}},\\quad g=g_{${baseRow}}`)}</p>
    <p>${math(`\\bar g_{${byRow}}\\bar g_{${baseRow}}\\bar g_{${byRow}}^{-1}=\\bar g_{${representativeRow}}`)}</p>
    <details><summary>Check the actual coordinates and the lattice translation</summary>
      <p>${"Applying the listed CIF row to the second Si site sends it to a neighboring cell."} ${math(`g_{${representativeRow}}p_2=${vector(listedRepresentativeImage)}`)}</p>
      <p>${"Apply this lattice translation to recover the original coordinates."} ${math(`T_{${vector(latticeCorrection)}}g_{${representativeRow}}p_2=p_2`)} · ${math(`p_2=${vector(correctedImage)}`)}</p>
      <p>${math(`hgh^{-1}=T_{${vector(latticeCorrection)}}g_{${representativeRow}}`)}</p>
    </details>
    <h4>Read permutation characters from fixed-site counts</h4>
    <p>Each fixed site contributes a 1 on the diagonal of its permutation matrix. All six O sites have only the identity coset in their stabilizers, so their characters differ from those for Si.</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${traceTitle}"><table>
      <caption class="sr-only">${traceTitle}</caption><thead><tr><th scope="col">Permutation of Si sites</th><th scope="col">CIF rows</th><th scope="col">Fixed Si sites</th><th scope="col">Fixed O sites</th></tr></thead>
      <tbody>${classes.map(row => `<tr><th scope="row">${classNames[row.id]}</th><td>${row.rows.join(', ')}</td><td>${row.character}</td><td>${oxygenCharacter(row)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p><a href="#classroom/foundations?module=theorems&amp;experiment=conjugacy">Practice conjugation in S₃ →</a> · <a href="#classroom/foundations?module=demos&amp;experiment=projection&amp;preset=triangle-permutation">Verify the same Si characters on a triangle →</a></p>`;
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
    if(!disposed && isCurrent()) clear("Prediction changed. Run the check again.");
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
    const guess = Number(prediction.value);
    if(!candidates.some(([row]) => row === guess)) {
      status.textContent = "Choose a CIF operation first.";
      prediction.focus();
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
      status.textContent = "Computing exact site permutations and stabilizers…";
      request.task = run('quartz_conjugacy', {content});
      const result = await request.task;
      if(!current(request)) return;
      output.innerHTML = resultHTML(checkedModel(result), guess);
      status.textContent = "Prediction checked.";
    } catch {
      if(current(request)) status.textContent = "Could not complete the quartz check. Try reading the CIF and checking again.";
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
