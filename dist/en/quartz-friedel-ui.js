import {mathHTML} from './math-display.js?v=20261113-prose2';
import {quartzStructureCases} from './quartz-structure-practice.js?v=20261122-nextpaths1';

const source = quartzStructureCases.find(example => example.id === 'original');
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const predictions = [
  {id:'contrast', question:"With these weights, which off-axis Friedel pair in the original quartz structure has unequal intensities?",
    options:[['110',"Only 110 and its opposite reflection"],['101',"Only 101 and its opposite reflection"],['both',"Both pairs have unequal intensities"]]},
  {id:'mirror', question:"How do the two 110 intensities change when you invert the atoms and keep the crystal axes fixed?",
    options:[['same',"Each direction keeps its original intensity"],['swap',"The two intensities swap"],['zero',"Both directions are extinct"]]},
];
const comparisons = [
  ['real110', "Original structure, real weights", [1,1,0]],
  ['illustrative110', "Original structure, complex weights", [1,1,0]],
  ['mirrored110', "Active inversion, fixed crystal axes", [1,1,0]],
  ['illustrative101', "Off-axis equal-intensity control", [1,0,1]],
  ['illustrative001', "Axial extinction control", [0,0,1]],
  ['illustrative003', "Allowed axial control", [0,0,3]],
];

export function quartzFriedelHTML({open=false}={}) {
  return `<details class="sc-worked" data-quartz-friedel${open?' open':''}>
    <summary>Extension · Complex weights and Friedel pairs</summary>
    <p>Compare a reflection with the reflection obtained by reversing all three indices in the same cell. With real weights, the two intensities agree. Now use the illustrative complex weights ${math('f_{\\mathrm{Si}}=14+i,\\quad f_{\\mathrm{O}}=8')}, keeping the 298 K quartz coordinates from the previous exercise.</p>
    <form data-qf-form>
      ${predictions.map(({id,question,options})=>`<div>
        <label for="qf-${id}">${question}</label>
        <select id="qf-${id}"><option value="">Choose an answer</option>
          ${options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}
        </select></div>`).join('')}
      <div class="sc-actions">
        <button type="submit" class="primary" data-qf-run>Read the original CIF and compare both intensities</button>
        <button type="button" class="secondary" data-qf-cancel hidden>Cancel check</button>
      </div>
    </form>
    <p data-qf-status role="status"></p><div data-qf-result></div>
    <p>This exercise uses constant scalar weights to compare kinematic intensities. The published resonant quartz experiment probed the coupling of circular polarization to the screw axis through a response that depends on energy and polarization.<a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">Friedel's law ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.100.145502" target="_blank" rel="noreferrer">Resonant quartz diffraction experiment ↗</a> · <a href="https://doi.org/10.1103/PhysRevLett.108.019901" target="_blank" rel="noreferrer">Erratum to the experimental paper ↗</a></p>
  </details>`;
}

function checkedComparisons(result) {
  const received = result?.source, weights = result?.weights;
  const rowMatches = (row, hkl) => row?.hkl?.length === 3
    && hkl.every((value,index)=>row.hkl[index]===value)
    && Number.isFinite(row.intensity) && row.intensity >= 0;
  const pairMatches = (pair,hkl) => rowMatches(pair?.forward,hkl) && rowMatches(pair?.reverse,hkl.map(value=>-value))
    && Number.isFinite(pair.intensityDifference) && Number.isFinite(pair.intensitySum)
    && (pair.intensitySum > 0 ? Number.isFinite(pair.normalizedContrast) && Math.abs(pair.normalizedContrast) <= 1
      : pair.intensitySum===0 && pair.normalizedContrast===null);
  if(result?.schemaVersion!==1 || result?.model!=='kinematic-constant-scalar' || result.atomCount!==9 ||
    received?.filename!==source.filename || received.sha256!==source.sha256 || received.byteCount!==source.byteCount ||
    weights?.real?.Si!==14 || weights?.real?.O!==8 || weights?.illustrative?.Si?.re!==14 ||
    weights?.illustrative?.Si?.im!==1 || weights?.illustrative?.O!==8 ||
    !comparisons.every(([id,,hkl])=>pairMatches(result.comparisons?.[id],hkl))) {
    throw new Error('Unexpected quartz Friedel comparison');
  }
  return result.comparisons;
}

function resultHTML(values, contrast, mirror) {
  const format = (value, digits=3) => Math.abs(value) < .5 * 10**-digits ? '0' : value.toFixed(digits);
  const tableTitle = "Intensity comparison for quartz Friedel pairs";
  return `<p class="sc-example-result">${contrast==='110' ? "Your prediction about the intensity difference was correct." : "Compare the 110 and 101 rows. With these weights, only the 110 pair has unequal intensities."}</p>
    <p class="sc-example-result">${mirror==='swap' ? "Your inversion prediction was correct." : "Compare the two 110 rows with complex weights. Inverting the atoms at fixed crystal axes swaps the two intensities."}</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${tableTitle}">
      <table><caption class="sr-only">${tableTitle}</caption>
        <thead><tr><th scope="col">Structure or control</th><th scope="col">Entered reflection</th>
          <th scope="col">${math('I_{\\mathbf h}')}</th><th scope="col">${math('I_{-\\mathbf h}')}</th>
          <th scope="col">Intensity difference</th><th scope="col">Normalized difference</th></tr></thead>
        <tbody>${comparisons.map(([id,label,hkl])=>{
          const pair = values[id];
          const relative = pair.normalizedContrast===null ? '—' : format(100*pair.normalizedContrast,2)+'%';
          return `<tr data-qf-case="${id}"><th scope="row">${label}</th><td>${math('('+hkl.join('')+')')}</td>
            <td>${format(pair.forward.intensity)}</td><td>${format(pair.reverse.intensity)}</td>
            <td>${format(pair.intensityDifference)}</td><td>${relative}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>
    <p>The normalized difference is ${math('(I_{\\mathbf h}-I_{-\\mathbf h})/(I_{\\mathbf h}+I_{-\\mathbf h})')}. Both directions of 001 are extinct, so the denominator is zero. Both directions of 003 are allowed and have equal intensities. At fixed cell and wavelength, opposing reflections share a diffraction angle, so their intensities add in the powder peak.</p>
    <details><summary>Check the phase origin of the intensity difference</summary>
      <p>Use the geometric phase sum ${math('S_a(\\mathbf h)')} for element ${math('a')} to collect its position-dependent terms. Reversing the reflection conjugates the phase sum while preserving the scattering weight. Expand the squared moduli to obtain</p>
      <p>${math('I_{\\mathbf h}-I_{-\\mathbf h}=-4\\,\\Im(f_{\\mathrm{Si}}f_{\\mathrm{O}}^{*})\\,\\Im(S_{\\mathrm{Si}}S_{\\mathrm{O}}^{*})')}。</p>
      <p>The intensity difference depends on both the relative scattering phase and the relative geometric phase of the two elements. For 101 the two geometric phase sums are collinear in the complex plane, so the intensities remain equal even with complex weights.</p>
    </details>`;
}

export function bindQuartzFriedel(host, {run, isCurrent=()=>true, fetchSource=(...args)=>fetch(...args)}) {
  const find = selector=>host.querySelector(selector);
  const form=find('[data-qf-form]'), submit=find('[data-qf-run]'), cancel=find('[data-qf-cancel]');
  const status=find('[data-qf-status]'), output=find('[data-qf-result]');
  const choices = predictions.map(({id,options})=>({select:find('#qf-'+id),options}));
  let active=null, disposed=false;
  const owned = request=>!disposed && active===request && isCurrent();
  const current = request=>owned(request) && host.open;

  function clear(message) {
    const previous = active;
    active=null;
    previous?.controller.abort();
    previous?.task?.cancel?.();
    submit.disabled=false;
    cancel.hidden=true;
    status.textContent=message;
    output.innerHTML='';
  }

  for(const {select} of choices) select.onchange=()=>{
    if(!disposed && isCurrent()) clear("Prediction changed. You can run the check again.");
  };
  host.ontoggle=()=>{
    if(!host.open && active && !disposed && isCurrent()) clear('');
  };
  cancel.onclick=()=>{
    if(!disposed && isCurrent()) {
      clear("Check canceled.");
      submit.focus();
    }
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    if(disposed || active || !host.open || !isCurrent()) return;
    const unanswered=choices.find(({select,options})=>!options.some(([value])=>value===select.value));
    if(unanswered) {
      status.textContent="Make both Friedel-pair predictions first.";
      unanswered.select.focus();
      return;
    }
    const [contrast,mirror]=choices.map(({select})=>select.value);
    const request={controller:new AbortController(),task:null};
    active=request;
    output.innerHTML='';
    submit.disabled=true;
    cancel.hidden=false;
    status.textContent="Reading the original 298 K CIF…";
    try {
      const response=await fetchSource(source.url,{signal:request.controller.signal});
      if(!response.ok) throw new Error('CIF fetch failed');
      const bytes=await response.arrayBuffer();
      if(!current(request)) return;
      if(bytes.byteLength!==source.byteCount) throw new Error('CIF byte count changed');
      const content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      status.textContent="Computing the Friedel pairs and the inversion control…";
      request.task=run('quartz_friedel',{content});
      const result=await request.task;
      if(!current(request)) return;
      output.innerHTML=resultHTML(checkedComparisons(result),contrast,mirror);
      status.textContent="Friedel-pair predictions checked.";
    } catch {
      if(current(request)) status.textContent="Could not complete the Friedel-pair check. Read the CIF and try again.";
    } finally {
      if(owned(request)) {
        if(!host.open) status.textContent='';
        active=null;
        submit.disabled=false;
        cancel.hidden=true;
      }
    }
  };
  return ()=>{
    disposed=true;
    host.ontoggle=null;
    clear('');
  };
}
