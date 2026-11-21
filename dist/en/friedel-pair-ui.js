import {mathHTML} from './math-display.js?v=20261113-prose2';

const physicalIndex = value => value < 0 ? `\\overline{${-value}}` : String(value);
const indexedReflection = hkl => mathHTML(`(${hkl.map(physicalIndex).join('\\,')})`);
const finiteFormat = value => Number(value.toPrecision(7)).toString().replace('-', '−');
const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function friedelWeightText(weight, format = finiteFormat) {
    if (typeof weight === 'number') return format(weight);
    const sign = weight.im < 0 ? '−' : '+';
    return `${format(weight.re)} ${sign} i ${format(Math.abs(weight.im))}`;
}

export function friedelControlsHTML(checked = false) {
    return `<label class="field-label"><input type="checkbox" id="dyn-friedel-pair"${checked ? ' checked' : ''}><span>Also show the Friedel pair for real-valued weights</span></label>
    <details class="structure-details"><summary>Enter complex scattering weights</summary>
      <p>An elemental weight can be a real number or a JSON object with real and imaginary parts. This example uses constant scalars to compare phases.</p>
      <pre><code>{&quot;Si&quot;: {&quot;re&quot;: 14, &quot;im&quot;: 1}, &quot;O&quot;: 8}</code></pre>
      <p>With complex-format weights, the results show the pair automatically.</p>
      <p>The calculation uses these scalar inputs. Actual resonant scattering can depend on energy and polarization.</p>
    </details>`;
}

export function friedelPairHTML(pair, {format = finiteFormat} = {}) {
    if (!pair) return '';
    const rows = [pair.forward, pair.reverse];
    const intensityContrast = pair.normalizedContrast === null
        ? "Both reflections are extinct, so the relative intensity difference is undefined."
        : `${esc(format(pair.normalizedContrast * 100))}%`;
    const heading = "A Friedel pair";
    return `<section class="sc-worked" data-friedel-pair aria-labelledby="dyn-friedel-heading">
      <h3 id="dyn-friedel-heading">${heading}</h3>
      <div class="sq-scroll" tabindex="0" role="region" aria-label="${heading}">
        <table><caption class="sr-only">${heading}</caption>
        <thead><tr><th scope="col">Reflection index</th><th scope="col">Real part of the structure amplitude</th><th scope="col">Imaginary part of the structure amplitude</th><th scope="col">Model intensity of the reflection</th></tr></thead>
        <tbody>${rows.map(row => `<tr><th scope="row">${indexedReflection(row.hkl)}</th><td>${esc(format(row.real))}</td><td>${esc(format(row.imag))}</td><td>${esc(format(row.intensity))}</td></tr>`).join('')}</tbody></table>
      </div>
      <p>Intensity difference ${mathHTML(String.raw`I_+-I_-`)} = ${esc(format(pair.intensityDifference))}</p>
      <p>Relative intensity difference ${mathHTML(String.raw`(I_+-I_-)/(I_++I_-)`)} = ${intensityContrast}</p>
      <p>The two reflections have the same plane spacing. Their intensities contribute at the same angle in the powder pattern.</p>
      <p><a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">Friedel's law and its conditions ↗</a></p>
    </section>`;
}
