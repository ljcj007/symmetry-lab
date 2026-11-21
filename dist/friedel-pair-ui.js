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
    return `<label class="field-label"><input type="checkbox" id="dyn-friedel-pair"${checked ? ' checked' : ''}><span>使用实数权重时也显示弗里德尔对</span></label>
    <details class="structure-details"><summary>输入复散射权重</summary>
      <p>元素权重可以是实数，或含实部和虚部的 JSON 对象。下例为用于比较相位的常数标量。</p>
      <pre><code>{&quot;Si&quot;: {&quot;re&quot;: 14, &quot;im&quot;: 1}, &quot;O&quot;: 8}</code></pre>
      <p>使用复数格式的权重时，结果自动显示成对反射。</p>
      <p>输入条件以这些标量为准。实际共振散射可依赖能量和偏振。</p>
    </details>`;
}

export function friedelPairHTML(pair, {format = finiteFormat} = {}) {
    if (!pair) return '';
    const rows = [pair.forward, pair.reverse];
    const intensityContrast = pair.normalizedContrast === null
        ? '两条反射都消光，无法定义相对强度差。'
        : `${esc(format(pair.normalizedContrast * 100))}%`;
    const heading = '一对弗里德尔反射';
    return `<section class="sc-worked" data-friedel-pair aria-labelledby="dyn-friedel-heading">
      <h3 id="dyn-friedel-heading">${heading}</h3>
      <div class="sq-scroll" tabindex="0" role="region" aria-label="${heading}">
        <table><caption class="sr-only">${heading}</caption>
        <thead><tr><th scope="col">反射指数</th><th scope="col">结构振幅的实部</th><th scope="col">结构振幅的虚部</th><th scope="col">反射的模型强度</th></tr></thead>
        <tbody>${rows.map(row => `<tr><th scope="row">${indexedReflection(row.hkl)}</th><td>${esc(format(row.real))}</td><td>${esc(format(row.imag))}</td><td>${esc(format(row.intensity))}</td></tr>`).join('')}</tbody></table>
      </div>
      <p>强度差 ${mathHTML(String.raw`I_+-I_-`)} = ${esc(format(pair.intensityDifference))}</p>
      <p>相对强度差 ${mathHTML(String.raw`(I_+-I_-)/(I_++I_-)`)} = ${intensityContrast}</p>
      <p>两条反射有相同的晶面间距。粉末谱在同一个角度收集两条反射的强度。</p>
      <p><a href="https://dictionary.iucr.org/Friedel%27s_law" target="_blank" rel="noreferrer">弗里德尔定律与它的条件 ↗</a></p>
    </section>`;
}
