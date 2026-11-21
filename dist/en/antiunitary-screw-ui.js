import {mathHTML} from './math-display.js?v=20261113-prose2';
import {buildWorkbenchRoute} from './workbench-route.js?v=20261112-flow2';

const cuts = [
  {id:'center', axialQuarters:0},
  {id:'intermediate', axialQuarters:1},
  {id:'boundary', axialQuarters:2}
];
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);

// Quarter units keep the reciprocal-lattice differences integral throughout the check.
function quarterTex(value) {
  if (value % 4 === 0) return String(value / 4);
  const denominator = value % 2 === 0 ? 2 : 4;
  const numerator = Math.abs(value) / (4 / denominator);
  return (value < 0 ? '-' : '') + `\\tfrac{${numerator}}{${denominator}}`;
}

function vectorTex(values) {
  return '(' + values.map(quarterTex).join(',') + ')';
}

function checkCut({id, axialQuarters}) {
  const k = [1, 0, axialQuarters];
  const screw = [-k[0], -k[1], k[2]];
  const timeReversal = k.map(value => -value);
  const compound = screw.map(value => -value);
  const difference = compound.map((value, i) => value - k[i]);
  const fixesK = difference.every(value => value % 4 === 0);
  // At an invariant cut, exp(-2πi k_z) reduces to (-1)^(2 k_z).
  const square = fixesK ? (-1) ** (axialQuarters / 2) : null;
  return {id, k, screw, timeReversal, compound, difference, fixesK, square};
}

export function antiunitaryScrewHTML() {
  return `<section class="sc-worked" id="sc-antiunitary-screw" aria-labelledby="sc-antiunitary-screw-title">
    <h3 id="sc-antiunitary-screw-title">Why do a screw and time reversal enforce pairing at the zone boundary?</h3>
    <p>Use the gray magnetic space group BNS 4.8, the BC primitive reciprocal fractional coordinates and the double-valued convention for electron spin. Keep the transverse coordinates fixed and vary the axial component.</p>
    <p>${math(String.raw`k=(\tfrac14,0,k_z)\qquad k_z\in\{0,\tfrac14,\tfrac12\}`)}</p>
    <form id="sc-antiunitary-screw-form">
      <p><label for="sc-antiunitary-screw-membership">At which slices do you predict that the combined operation maps the wavevector back to itself after folding?</label><br>
        <select id="sc-antiunitary-screw-membership" required>
          <option value="">Choose the invariant slices</option>
          <option value="center-boundary">Center and boundary slices (0 and 1/2)</option>
          <option value="center">Center slice only (0)</option>
          <option value="boundary">Boundary slice only (1/2)</option>
          <option value="all">All three slices (0, 1/4 and 1/2)</option>
          <option value="none">None of the slices</option>
        </select></p>
      <p><label for="sc-antiunitary-screw-pairing">At which slices do you predict that the combined operation enforces equal-energy pairs?</label><br>
        <select id="sc-antiunitary-screw-pairing" required>
          <option value="">Choose the slices with enforced pairing</option>
          <option value="center-boundary">Center and boundary slices (0 and 1/2)</option>
          <option value="center">Center slice only (0)</option>
          <option value="boundary">Boundary slice only (1/2)</option>
          <option value="none">None of the slices</option>
        </select></p>
      <div class="sc-actions"><button class="primary" id="sc-antiunitary-screw-run" type="submit">Calculate and check both predictions</button></div>
    </form>
    <p id="sc-antiunitary-screw-status" role="status"></p>
    <div id="sc-antiunitary-screw-result"></div>
  </section>`;
}

function comparisonHTML(results, membershipCorrect, pairingCorrect) {
  const tableLabel = "Three off-axis wavevectors in BNS 4.8";
  return `<p>${membershipCorrect ? "Wavevector prediction correct. Both the center and boundary wavevectors fold back to themselves." : "Check the axial wavevector difference under the combined operation. Both the center and boundary wavevectors fold back to themselves."}</p>
    <p>${pairingCorrect ? "Pairing prediction correct. Only at the boundary does the operation preserve the wavevector and square to −1." : "Compare the two invariant slices. The antiunitary operation squares to −1 only at the boundary."}</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${tableLabel}">
      <table><caption class="sr-only">${tableLabel}</caption><thead><tr>
        <th scope="col">${math('k_z')}</th><th scope="col">${math('gk')}</th><th scope="col">${math(String.raw`\Theta k`)}</th>
        <th scope="col">${math('Ak')}</th><th scope="col">${math('Ak-k')}</th>
        <th scope="col">Combined operation preserves wavevector?</th><th scope="col">Square within the original wavevector space</th>
        <th scope="col">Enforced pairing?</th><th scope="col">Double-valued check</th>
      </tr></thead><tbody>${results.map(({id,k,screw,timeReversal,compound,difference,fixesK,square}) => {
        const route = buildWorkbenchRoute({mode:'msg', id:'4.8', k:k.map(value => value / 4), doubleValued:true});
        const openingLabel = "Open the BNS 4.8 double-valued workbench at axial component";
        return `<tr data-antiunitary-screw-cut="${id}">
          <th scope="row">${math(quarterTex(k[2]))}</th>
          ${[screw,timeReversal,compound,difference].map(values => `<td>${math(vectorTex(values))}</td>`).join('')}
          <td>${fixesK ? "Folds back to itself" : "Maps to another star arm"}</td><td>${square === null ? '—' : math(square === 1 ? '+1' : '-1')}</td>
          <td>${square === -1 ? "Enforced pairing" : "No pairing enforced by this operation"}</td>
          <td><a href="#${escapeHTML(route)}" aria-label="${openingLabel} ${k[2] / 4}">${"Open double-valued workbench"} →</a></td></tr>`;
      }).join('')}</tbody></table>
    </div>
    <ol>
      <li><strong>Check the wavevector first.</strong> The screw and pure time reversal each change the transverse component from 1/4 to −1/4, a shift of half a reciprocal lattice period. Their combination cancels the transverse change and reverses only the axial component.<br>
        ${math(String.raw`g=\{C_{2z}\mid(0,0,\tfrac12)\},\quad A=\Theta g,\quad Ak=(k_x,k_y,-k_z)`)}<br>
        ${math(String.raw`Ak-k=(0,0,-2k_z)\in\mathbb{Z}^3\ \Longleftrightarrow\ 2k_z\in\mathbb{Z}`)}</li>
      <li><strong>Square the antiunitary operation.</strong> Use the spin lift of the screw. Applying it twice gives a full lattice translation along the axis and a 2π spin rotation. Time reversal commutes with the lifted screw, and the spin factors of −1 in their squares cancel.<br>
        ${math(String.raw`g^2=-T_z,\quad \Theta^2=-I,\quad A^2=T_z,\quad D_k(T_z)=\mathrm{e}^{-2\pi\mathrm{i}k_z}`)}</li>
      <li><strong>Derive the pairing.</strong> If the Hamiltonian has this symmetry and the combined operation squares to −1 within the same wavevector space, it takes an energy eigenstate to an orthogonal partner with the same energy. At the center the square is +1, which allows a one-dimensional corepresentation. At the intermediate slice the operation connects distinct wavevectors.<br>
        ${math(String.raw`\langle A\psi,\psi\rangle=\langle A\psi,A^2\psi\rangle=-\langle A\psi,\psi\rangle=0`)}</li>
    </ol>
    <p>Pairing on the boundary plane holds at any transverse coordinates. Open the workbench and run each calculation to compare the little-group operations and magnetic corepresentations. The center sample gives a one-dimensional type-a corepresentation. The boundary sample gives a two-dimensional type-b corepresentation. The intermediate sample has only the identity in its little group.</p>
    <p><a href="https://journals.aps.org/prb/abstract/10.1103/2f4l-tz7p" target="_blank" rel="noreferrer">Antiunitary screws and nodal planes (Section II)</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7034989/#sec3" target="_blank" rel="noreferrer">The same wavevector mechanism in an acoustic-crystal experiment</a></p>`;
}

export function bindAntiunitaryScrew(host) {
  const form = host.querySelector('#sc-antiunitary-screw-form');
  const membership = host.querySelector('#sc-antiunitary-screw-membership');
  const pairing = host.querySelector('#sc-antiunitary-screw-pairing');
  const status = host.querySelector('#sc-antiunitary-screw-status');
  const output = host.querySelector('#sc-antiunitary-screw-result');

  form.onchange = () => {
    if (!output.innerHTML) return;
    output.innerHTML = '';
    status.textContent = "Prediction changed. Check the predictions again.";
  };
  form.onsubmit = event => {
    event.preventDefault();
    if (!membership.value || !pairing.value) return;
    const results = cuts.map(checkCut);
    const fixed = results.filter(cut => cut.fixesK).map(cut => cut.id).join('-');
    const paired = results.find(cut => cut.square === -1).id;
    output.innerHTML = comparisonHTML(results, membership.value === fixed, pairing.value === paired);
    status.textContent = "The three slices have been checked. The results and step-by-step derivation appear below.";
  };
  return () => {
    form.onchange = form.onsubmit = null;
  };
}
