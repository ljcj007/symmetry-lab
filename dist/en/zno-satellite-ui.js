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
  if (!Object.hasOwn(modes, stateKey)) throw new RangeError("Unknown ZnO structure state.");
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
    throw new Error("The ZnO data do not match the pinned supercell setting.");
  }
  return data;
}

async function fetchData(signal) {
  const response = await fetch(dataset.url, {signal});
  if (!response.ok) throw new Error("The ZnO data could not be read.");
  const bytes = await response.arrayBuffer();
  signal.throwIfAborted();
  if (bytes.byteLength !== dataset.bytes) throw new Error("The ZnO data size differs from the pinned version.");
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  signal.throwIfAborted();
  const hex = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('');
  if (hex !== dataset.sha256) throw new Error("The ZnO example data could not be read. Load them again.");
  return validateData(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)));
}

function requestFor(data,stateKey) {
  const handoff = validateStructureDiffractionHandoff({
    custom: znOSatelliteGeometry(data,stateKey),
    source:{format:'cell',filename:dataset.filename,sha256:dataset.sha256,atomCount:64},
  });
  if (!handoff) throw new Error("The ZnO cell does not match the diffraction input format.");
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
   <h3 id="zsat-heading">Frozen phonons and diffraction satellites in ZnO</h3>
   <p>Predict first. Compare the parent cell and two frozen snapshots at full and half amplitude in the same 64-atom supercell.</p>
   <p>Use the default supercell index <var>H</var> = (1, 0, 1) with each atomic scattering factor <var>f</var><sub>j</sub> = 1. Intensities are relative values from this equal-weight kinematic model.</p>
   <div class="mr-choices">
    <div>${prediction('parent',"What is the parent-cell amplitude at this reflection?",[['',"Choose an answer"],['zero',"Cancels to zero"],['nonzero',"Has a nonzero amplitude"]],state.parentPrediction)}</div>
    <div>${prediction('half',"For small displacements, about what fraction of the full-amplitude intensity remains when the frozen displacement is halved?",[['',"Choose an answer"],['quarter',"One quarter"],['half',"One half"],['equal',"The same"]],state.halfPrediction)}</div>
   </div>
   <div class="obs-links">
    <button class="secondary" type="button" id="zsat-parent">Load parent cell</button>
    <button class="secondary" type="button" id="zsat-full">Load full-amplitude snapshot</button>
    <button class="secondary" type="button" id="zsat-half">Load half-amplitude snapshot</button>
    <button class="secondary" type="button" id="zsat-cancel" hidden>Cancel loading</button>
   </div>
   <p>Loading replaces the current cell, reflection indices, and scattering factors. Run each calculation manually, then compare its complex amplitude and intensity with your predictions.</p>
   <div class="obs-links">
    <a href="docs/structure-dynamics.md#zno-satellite">ZnO satellite calculation steps and data sources →</a>
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
    return verifiedByState.has(state) ? "The ZnO example data are loaded." : '';
  }
  async function load(key) {
    if (!current() || pending || typeof onLoad !== 'function') return;
    const request = new AbortController();
    pending=request;error.hidden=true;
    status.textContent = "Reading and verifying the frozen ZnO data…";
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
        error.textContent="The current diffraction form could not accept the preset. Reopen the calculation page and try again.";
        error.hidden=false;
      }
    } catch {
      if (owns()) {
        error.textContent="The frozen ZnO data could not be read or verified. Your current inputs and predictions are still in place.";
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
